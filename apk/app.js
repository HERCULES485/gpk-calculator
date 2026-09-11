// Интерфейс модуля АПК — единственная точка рендера в DOM для apk.html.
// Поверх buildView (apk/views.js), без собственной логики расчёта: приложение
// читает поля, зовёт buildView и рисует результат.
//
// Не копия web/app.js: ситуации, поля и виды карточек у АПК другие. Общими
// остаются механики, вынесенные в ядро (маска даты, ссылки и сводка, выбор
// ситуации по id) — они импортируются как есть; и два повторяемых списка,
// перенесённых по образцу ГПК-шного списка перерывов.
//
// Чего у ГПК нет и что появилось здесь:
//   * виджет периодов, не засчитываемых в срок (ч. 2, 5 ст. 321 АПК РФ) — две
//     даты в строке вместо одной даты события;
//   * карточка kind:'error' — расчёт отказал на введённых данных (пересечение
//     периодов, неподдерживаемый исход апелляции);
//   * карточка kind:'not_applicable' — норма к выбранной категории заявителя
//     не применяется;
//   * явные булевы дискриминаторы (жалоба подана да/нет) — модель АПК требует
//     их значением, а не выводит из наличия даты, как ГПК.

import { buildView, RESTORATION_SUBJECT_CATEGORIES_APK } from './views.js';
import { SITUATIONS_APK, DEFAULT_SITUATION_APK } from './situations.js';
import { INPUT_LABELS_APK } from './labels.js';
import { ENFORCEMENT_INTERRUPTION_TYPES_APK, ENFORCEMENT_EXCLUSION_TYPES_APK } from './chain.js';
import { reminderOffsets } from './term-registry.js';
import { buildICS, icsTermsFromView, exportableCards } from './ics.js';

// --- Из ядра, без изменений ---------------------------------------------------
import { situationById } from '../core/view/situations.js';
import { applyDateEdit, dateFieldError, isoToRu, ruToISO } from '../core/ui/date-field.js';
import {
  googleCalendarUrl,
  termsAsText,
  caseSummaryItems,
  caseSummaryHeader,
  reminderRulePhrase,
  calendarEventTitle,
  DEADLINE_CAPTION,
} from '../core/export/links.js';

const ICS_FILENAME = 'apk-sroki.ics';
const ICS_TYPE_FILE = 'text/calendar';
const ICS_TYPE_DOWNLOAD = 'text/calendar;charset=utf-8';

// --- Поля ввода: вид виджета по полю ------------------------------------------
//
// У ГПК все поля ситуации — даты, а немногочисленные выпадающие списки
// прописаны отдельными ветками по id ситуации. Здесь дискриминаторов больше
// (три enum и два булевых), поэтому вид виджета задан таблицей, а рендер
// ситуации остаётся общим циклом.

const APPEAL_OUTCOME_OPTIONS = [
  { value: 'affirmed', label: 'Оставлено без изменения' },
  // Отмена/изменение решения моделью не поддерживается: расчёт откажет и
  // объяснит почему (карточка kind:'error'). Вариант в списке нужен — иначе
  // пользователь с таким делом молча получил бы чужой результат.
  { value: 'reversed_or_changed', label: 'Отменено или изменено' },
];

const CASE_TYPE_OPTIONS = [
  { value: 'entry_into_force', label: 'Со дня вступления акта в законную силу' },
  { value: 'immediate_execution', label: 'Со дня принятия акта к немедленному исполнению' },
  { value: 'deferred_installment_end', label: 'Со дня окончания отсрочки или рассрочки' },
];

// Какая из трёх альтернативных дат ветви «Исполнительный лист» реально нужна
// при каждом case_type — дублирует ENFORCEMENT_DATE_BY_CASE_TYPE из
// apk/views.js (та не экспортирована, а views.js в этой задаче не трогаем).
// Здесь это чисто вопрос видимости поля, а не расчёта: сама модель по-прежнему
// сама решает, что ей нужно, эта таблица лишь скрывает два поля из трёх,
// которые для выбранной ветки заведомо не читаются.
const ENFORCEMENT_DATE_BY_CASE_TYPE_APK = {
  entry_into_force: 'entry_into_force_date',
  immediate_execution: 'immediate_execution_decision_date',
  deferred_installment_end: 'deferred_installment_end_date',
};
const ENFORCEMENT_DATE_FIELDS_APK = Object.values(ENFORCEMENT_DATE_BY_CASE_TYPE_APK);

const FIELD_KIND_APK = {
  appeal_filed: { kind: 'boolean' },
  cassation_filed: { kind: 'boolean' },
  appeal_outcome: { kind: 'choice', options: APPEAL_OUTCOME_OPTIONS },
  case_type: { kind: 'choice', options: CASE_TYPE_OPTIONS },
  subject_category: {
    kind: 'choice',
    options: RESTORATION_SUBJECT_CATEGORIES_APK.map((c) => ({ value: c.id, label: c.label })),
  },
};

function fieldKind(id) {
  return FIELD_KIND_APK[id]?.kind ?? 'date';
}

// --- Состояние ----------------------------------------------------------------

const state = { inputs: {}, situation: DEFAULT_SITUATION_APK };

function pad(n) {
  return String(n).padStart(2, '0');
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const today = todayISO();

function pluralDays(n) {
  const t = n % 10;
  const h = n % 100;
  if (t === 1 && h !== 11) return 'день';
  if (t >= 2 && t <= 4 && !(h >= 12 && h <= 14)) return 'дня';
  return 'дней';
}

// Название поля для фразы «Укажите …»: подписи дат начинаются с «Дата», дальше
// уже родительный падеж — остаётся отбросить уточнение в скобках.
function askFor(id) {
  const label = INPUT_LABELS_APK[id] ?? '';
  if (/^Дата /.test(label)) {
    return label.replace(/^Дата /, 'дату ').replace(/\s*\([^)]*\)$/, '');
  }
  return label.charAt(0).toLowerCase() + label.slice(1);
}

// --- Чистые помощники повторяемых списков -------------------------------------
//
// Вынесены отдельно от рендера и экспортируются: это единственная в файле
// логика, которую можно проверить без браузера (см. test/apk-app.test.js).

/**
 * Длина периода в календарных днях: end − start, БЕЗ +1 — та же конвенция, что
 * в core/engine/exclusion.js. Показывается прямо в строке ввода, чтобы правило
 * подсчёта было видно пользователю, а не только описано словами в норме.
 * @returns {number|null} null, если хотя бы одна граница не разобрана.
 */
export function periodDaysBetween(startISO, endISO) {
  if (startISO == null || endISO == null) return null;
  const [ys, ms, ds] = startISO.split('-').map(Number);
  const [ye, me, de] = endISO.split('-').map(Number);
  return Math.round((Date.UTC(ye, me - 1, de) - Date.UTC(ys, ms - 1, ds)) / 86_400_000);
}

/**
 * Ошибка строки периода целиком (в отличие от ошибки отдельного поля даты):
 * конец раньше начала. Проверяется здесь, до расчёта, — иначе строка молча не
 * попадала бы в срок, а причина обнаруживалась только в истории на карточке.
 * @returns {string} пустая строка, если ошибки нет.
 */
export function periodRowError(startRaw, endRaw) {
  const start = ruToISO(startRaw);
  const end = ruToISO(endRaw);
  if (start == null || end == null) return '';
  if (end < start) return 'Окончание раньше начала — период в расчёт не пойдёт.';
  return '';
}

/**
 * Черновик строк → значение для state.inputs. В расчёт идут только строки, где
 * обе даты разобраны и конец не раньше начала; остальные остаются на экране,
 * но модель о них не знает.
 * @param {Array<{type?:string, startRaw:string, endRaw:string}>} draft
 * @param {{typed?: boolean}} [options] — typed: сохранять основание (ч. 5).
 * @returns {Array<object>} готовые периоды (может быть пустым).
 */
export function periodsFromDraft(draft, options = {}) {
  const rows = [];
  for (const row of draft) {
    const start = ruToISO(row.startRaw);
    const end = ruToISO(row.endRaw);
    if (start == null || end == null || end < start) continue;
    rows.push(options.typed ? { type: row.type, start, end } : { start, end });
  }
  return rows;
}

// --- Даты: формат ДД.ММ.ГГГГ ↔ ISO --------------------------------------------

function attachDateMask(input, onCommit) {
  input.addEventListener('input', (event) => {
    const before = input.value;
    const next = applyDateEdit(before, input.selectionStart ?? before.length, event.inputType ?? '');
    if (next.value !== before) {
      input.value = next.value;
      input.setSelectionRange(next.caret, next.caret);
    }
    onCommit(input, { raw: next.value, iso: ruToISO(next.value) });
  });
}

// Сырой текст полей дат: render() пересобирает поля заново, а недобранная дата
// в state.inputs не попадает — без отдельного хранения перерисовка стирала бы
// набранное на полпути.
const rawDates = new Map();

function dateFieldValue(id) {
  const raw = rawDates.get(id);
  if (raw != null) return raw;
  return state.inputs[id] ? isoToRu(state.inputs[id]) : '';
}

function commitDateInput(id, input, errorEl, { raw, iso }) {
  if (raw === '') rawDates.delete(id);
  else rawDates.set(id, raw);
  const error = dateFieldError(raw);
  errorEl.textContent = error;
  input.classList.toggle('invalid', error !== '');
  if (iso == null) delete state.inputs[id];
  else state.inputs[id] = iso;
  render();
}

// --- Утилиты DOM --------------------------------------------------------------

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function captureFocus() {
  const active = document.activeElement;
  if (!active || active.tagName !== 'INPUT' || !active.id) return null;
  return { id: active.id, start: active.selectionStart, end: active.selectionEnd };
}

function restoreFocus(snapshot) {
  if (!snapshot) return;
  const next = document.getElementById(snapshot.id);
  if (!next || next === document.activeElement) return;
  next.focus();
  if (snapshot.start != null) next.setSelectionRange(snapshot.start, snapshot.end);
}

// Один и тот же input может понадобиться нескольким узлам: рисуем один раз за
// проход, иначе на странице окажутся два элемента с одинаковым id.
const renderedFields = new Set();

function fieldAlreadyRendered(id) {
  if (renderedFields.has(id)) return true;
  renderedFields.add(id);
  return false;
}

// --- Поля ввода ---------------------------------------------------------------

function renderDateField(id, labelOverride) {
  const wrap = el('div', 'field');
  const lab = el('label', null, labelOverride ?? INPUT_LABELS_APK[id]);
  lab.setAttribute('for', `in-${id}`);
  wrap.appendChild(lab);
  const input = el('input');
  input.type = 'text';
  input.id = `in-${id}`;
  input.setAttribute('inputmode', 'numeric');
  input.placeholder = 'ДД.ММ.ГГГГ';
  input.autocomplete = 'off';
  input.value = dateFieldValue(id);
  wrap.appendChild(input);
  const err = el('p', 'field-error');
  // Поле пересоздаётся при каждой перерисовке — состояние ошибки восстанавливаем
  // из сырого текста, а не держим в самом элементе.
  err.textContent = dateFieldError(input.value);
  if (err.textContent) input.classList.add('invalid');
  wrap.appendChild(err);
  attachDateMask(input, (node, parsed) => commitDateInput(id, node, err, parsed));
  return wrap;
}

// Выпадающий список с пустым первым вариантом: «не выбрано» — это отдельное
// состояние, а не значение по умолчанию. Узел, которому поле нужно, до выбора
// остаётся в «что ещё уточнить», а не считается по молча подставленной ветке.
function renderChoiceField(id, options, labelOverride) {
  const wrap = el('div', 'field');
  const lab = el('label', null, labelOverride ?? INPUT_LABELS_APK[id]);
  lab.setAttribute('for', `in-${id}`);
  wrap.appendChild(lab);
  const select = el('select');
  select.id = `in-${id}`;
  const empty = el('option', null, '— не выбрано —');
  empty.value = '';
  select.appendChild(empty);
  for (const opt of options) {
    const node = el('option', null, opt.label);
    node.value = opt.value;
    select.appendChild(node);
  }
  select.value = state.inputs[id] == null ? '' : String(state.inputs[id]);
  select.addEventListener('change', () => {
    if (select.value === '') delete state.inputs[id];
    else state.inputs[id] = select.value;
    render();
  });
  wrap.appendChild(select);
  return wrap;
}

// Булев дискриминатор (жалоба подана — да/нет). Не чекбокс: модель АПК требует
// явного true/false и отличает их от «ещё не указано», а чекбокс третьего
// состояния не имеет и молча означал бы «нет».
function renderBooleanField(id, labelOverride) {
  const wrap = el('div', 'field');
  const lab = el('label', null, labelOverride ?? INPUT_LABELS_APK[id]);
  lab.setAttribute('for', `in-${id}`);
  wrap.appendChild(lab);
  const select = el('select');
  select.id = `in-${id}`;
  for (const opt of [
    { value: '', label: '— не выбрано —' },
    { value: 'yes', label: 'Да' },
    { value: 'no', label: 'Нет' },
  ]) {
    const node = el('option', null, opt.label);
    node.value = opt.value;
    select.appendChild(node);
  }
  select.value = state.inputs[id] == null ? '' : state.inputs[id] ? 'yes' : 'no';
  select.addEventListener('change', () => {
    if (select.value === '') delete state.inputs[id];
    else state.inputs[id] = select.value === 'yes';
    render();
  });
  wrap.appendChild(select);
  return wrap;
}

function renderField(id, labelOverride) {
  const spec = FIELD_KIND_APK[id];
  if (spec?.kind === 'choice') return renderChoiceField(id, spec.options, labelOverride);
  if (spec?.kind === 'boolean') return renderBooleanField(id, labelOverride);
  return renderDateField(id, labelOverride);
}

// Поле для узла: либо само поле, либо ссылка на то место, где оно уже показано.
//
// Формулировка без «выше»/«ниже» намеренно: у ветви decision_chain блок
// уточняющих дат физически идёт ПОСЛЕ карточек результатов (renderSituationFields
// кладёт его в #other-terms), а у rulings/enforcement — ДО них (#situation-inputs);
// одно и то же сообщение обслуживает оба случая, и направление зависело бы от
// того, к какой ситуации относится поле — устойчивее не утверждать его вовсе.
function fieldOrPointer(id, labelOverride) {
  if (fieldAlreadyRendered(id)) {
    return el(
      'p',
      'hint',
      `Поле «${labelOverride ?? INPUT_LABELS_APK[id]}» уже есть в этой форме.`,
    );
  }
  return renderField(id, labelOverride);
}

// --- Карточки -----------------------------------------------------------------

function renderDetails(details) {
  const wrap = el('details', 'more');
  wrap.appendChild(el('summary', null, 'Подробнее'));
  const dl = el('dl');
  if (details.logic) {
    dl.appendChild(el('dt', null, 'Логика исчисления'));
    dl.appendChild(el('dd', null, details.logic));
  }
  if (details.calculation && details.calculation.length) {
    dl.appendChild(el('dt', null, 'Нормы расчёта'));
    const dd = el('dd');
    details.calculation.forEach((c, i) => {
      if (i) dd.appendChild(document.createTextNode(', '));
      dd.appendChild(el('code', null, c));
    });
    dl.appendChild(dd);
  }
  // Нормы перерыва и исключения периода — отдельными строками: обе механики
  // действуют на один и тот же срок, и по одной норме не понять, какая из них
  // сдвинула дату.
  if (details.interruption_norm) {
    dl.appendChild(el('dt', null, 'Перерыв срока'));
    dl.appendChild(el('dd', null, `${details.interruption_norm}. ${details.interruption_logic}`));
  }
  if (details.exclusion_norm) {
    dl.appendChild(el('dt', null, 'Периоды, не засчитываемые в срок'));
    dl.appendChild(el('dd', null, `${details.exclusion_norm}. ${details.exclusion_logic}`));
  }
  if (details.midnight_rule) {
    dl.appendChild(el('dt', null, 'Отсечка 24:00 / почта'));
    dl.appendChild(el('dd', null, details.midnight_rule));
  }
  wrap.appendChild(dl);
  return wrap;
}

function collapsedWarning(summaryText, detailNodes, cls = 'warn') {
  const box = el('details', `${cls} collapsible`);
  box.appendChild(el('summary', null, summaryText));
  const body = el('div', 'warn-body');
  for (const node of detailNodes) if (node) body.appendChild(node);
  box.appendChild(body);
  return box;
}

function renderTermCard(card) {
  const c = el('div', 'card');
  c.appendChild(el('div', 'kicker', 'Срок'));
  c.appendChild(el('h2', null, card.title));
  c.appendChild(el('div', 'deadline-caption', DEADLINE_CAPTION));

  if (card.status === 'expired') {
    c.appendChild(el('div', 'deadline expired', isoToRu(card.deadline)));
    c.appendChild(el('div', 'norm', card.norm));
    const days = card.expired.days;
    c.appendChild(
      el(
        'div',
        'expired-note',
        `Срок истёк ${days} ${pluralDays(days)} назад. Дата подачи не введена — ` +
          'пропуск не подтверждён.',
      ),
    );
  } else {
    c.appendChild(el('div', 'deadline', isoToRu(card.deadline)));
    c.appendChild(el('div', 'norm', card.norm));
  }

  if (card.interruptions) c.appendChild(renderInterruptionHistory(card));
  if (card.excluded_periods) c.appendChild(renderExclusionHistory(card));

  if (card.calendar_warning) {
    c.appendChild(
      collapsedWarning('Календарь на этот год ещё не окончательный', [
        el('div', null, card.calendar_warning.text),
      ]),
    );
  }

  if (card.details) c.appendChild(renderDetails(card.details));
  if (exportableIds.has(card.id)) c.appendChild(googleCalendarLink(card));
  return c;
}

// Строка-событие: не срок, а момент вступления акта в силу.
function renderEvent(card) {
  const box = el('div', 'event-line');
  const head = el('div', 'event-head');
  head.appendChild(
    el('span', 'event-text done', `Акт вступил в законную силу ${isoToRu(card.date)}`),
  );
  head.appendChild(el('span', 'norm', card.norm));
  box.appendChild(head);
  box.appendChild(
    el('div', 'hint', 'С этой даты акт считается вступившим в законную силу.'),
  );
  // От чего посчитана дата: от дедлайна соседнего срока или от введённой даты
  // акта вышестоящей инстанции. Без этого непонятно, откуда она взялась.
  box.appendChild(el('div', 'hint', `Основание расчёта: ${basedOnText(card.based_on)}`));
  if (card.calendar_warning) {
    box.appendChild(
      collapsedWarning('Календарь на этот год ещё не окончательный', [
        el('div', null, card.calendar_warning.text),
      ]),
    );
  }
  if (card.details) box.appendChild(renderDetails(card.details));
  return box;
}

const BASED_ON_TEXT_APK = {
  appeal_general_apk: 'истечение срока на апелляционную жалобу',
  cassation_general_apk: 'истечение срока на кассационную жалобу в суд округа',
  appellate_ruling_date: 'дата постановления апелляционной инстанции',
  district_cassation_ruling_date: 'дата постановления арбитражного суда округа',
};

function basedOnText(basedOn) {
  return BASED_ON_TEXT_APK[basedOn] ?? basedOn;
}

// Текст ошибки идёт напрямую из core/engine/exclusion.js (ядро трогать нельзя)
// и содержит даты в ISO — единственный способ показать их в принятом на
// странице формате ДД.ММ.ГГГГ без изменения самого сообщения.
const ISO_DATE_RE = /\d{4}-\d{2}-\d{2}/g;

export function isoDatesToRu(text) {
  return text.replace(ISO_DATE_RE, (iso) => isoToRu(iso));
}

// Расчёт отказал на введённых данных: пересечение исключаемых периодов либо
// неподдерживаемый исход апелляции. Текст берём из модели как есть — он уже
// объясняет причину и что поправить, но даты в нём приводим к формату страницы.
function renderErrorCard(card) {
  const c = el('div', 'card calc-error');
  c.appendChild(el('div', 'kicker', 'Расчёт невозможен'));
  c.appendChild(el('h2', null, card.title));
  c.appendChild(el('div', 'calc-error-text', isoDatesToRu(card.message)));
  return c;
}

// Норма к выбранной категории заявителя не применяется: показываем причину, а
// не прячем карточку — иначе исчезновение срока с экрана выглядит как сбой.
function renderNotApplicableCard(card) {
  const c = el('div', 'card not-applicable');
  c.appendChild(el('div', 'kicker', 'Срок не исчисляется'));
  c.appendChild(el('h2', null, card.title));
  c.appendChild(el('div', 'deadline', '—'));
  c.appendChild(el('div', 'na-reason', card.reason));
  return c;
}

function renderIncompleteNode(node) {
  const box = el('div', 'invite');
  box.appendChild(el('h2', null, node.title));
  box.appendChild(el('p', 'reason', node.reason));
  for (const m of node.missing_inputs) box.appendChild(fieldOrPointer(m.id));
  if (!node.missing_inputs.length) {
    box.appendChild(el('p', 'hint', 'Данных для расчёта пока недостаточно.'));
  }
  return box;
}

// --- История перерывов и исключённых периодов ---------------------------------

function renderInterruptionHistory(card) {
  const box = el('div', 'interruption-history');
  box.appendChild(el('div', 'interruption-history-title', 'Перерывы срока'));
  const list = el('ul', 'interruption-list');
  for (const event of card.interruptions) {
    const item = el('li', event.ignored ? 'interruption ignored' : 'interruption');
    item.appendChild(el('span', 'interruption-date', event.date ? isoToRu(event.date) : '—'));
    item.appendChild(el('span', 'interruption-label', event.label));
    if (event.ignored_text) item.appendChild(el('div', 'hint', event.ignored_text));
    list.appendChild(item);
  }
  box.appendChild(list);
  box.appendChild(
    el(
      'div',
      'hint',
      card.restarted_from
        ? `Срок течёт заново с ${isoToRu(card.restarted_from)}; время до перерыва в него не ` +
          `засчитывается. Исходная точка отсчёта — ${isoToRu(card.base_anchor)}.`
        : `Ни одно событие в расчёт не принято — срок считается от исходной точки отсчёта ` +
          `(${isoToRu(card.base_anchor)}).`,
    ),
  );
  return box;
}

/**
 * Итоговая строка исключения периодов — пересобрана из отдельных полей карточки
 * (excluded_days/pre_exclusion_deadline/deadline) с русским текстом и датами в
 * ДД.ММ.ГГГГ, а не взята из card.exclusion_summary как готовый текст: там даты
 * в ISO (apk/views.js менять нельзя), а числа те же самые — пересборка не
 * зависит от того, не изменится ли формулировка в views.js.
 * @returns {string|null} null, если периоды не исключались (полей нет).
 */
export function formatExclusionSummary(card) {
  if (card.excluded_days == null) return null;
  return (
    `Исключено ${card.excluded_days} ${pluralDays(card.excluded_days)}: дедлайн отодвинут ` +
    `с ${isoToRu(card.pre_exclusion_deadline)} на ${isoToRu(card.deadline)}.`
  );
}

function renderExclusionHistory(card) {
  const box = el('div', 'interruption-history');
  box.appendChild(el('div', 'interruption-history-title', 'Периоды, не засчитываемые в срок'));
  const list = el('ul', 'interruption-list');
  for (const period of card.excluded_periods) {
    const item = el('li', period.ignored ? 'interruption ignored' : 'interruption');
    const range =
      period.start && period.end ? `${isoToRu(period.start)} — ${isoToRu(period.end)}` : '—';
    item.appendChild(el('span', 'interruption-date', range));
    item.appendChild(el('span', 'interruption-label', period.label));
    if (period.days != null) {
      item.appendChild(el('span', 'period-days', ` ${period.days} ${pluralDays(period.days)}`));
    }
    if (period.ignored_text) item.appendChild(el('div', 'hint', period.ignored_text));
    list.appendChild(item);
  }
  box.appendChild(list);
  const summary = formatExclusionSummary(card);
  if (summary) box.appendChild(el('div', 'hint', summary));
  return box;
}

// --- Повторяемый список перерывов (ч. 3, 4 ст. 321 АПК РФ) --------------------
//
// Перенос образца ГПК: черновик живёт отдельно от state.inputs, чтобы строка с
// недобранной датой оставалась на экране, но в расчёт не шла. Предупреждения о
// границах применения (у ГПК — про ч. 3.1 ФЗ № 229-ФЗ) здесь нет: у АПК своя
// норма, её текст уже в подробностях карточки.

const interruptionDraft = [];
const DEFAULT_INTERRUPTION_TYPE_APK = ENFORCEMENT_INTERRUPTION_TYPES_APK[0].id;

function syncInterruptions() {
  const ready = interruptionDraft
    .map((row) => ({ type: row.type, date: ruToISO(row.raw) }))
    .filter((row) => row.date != null);
  if (ready.length) state.inputs.enforcement_interruptions = ready;
  else delete state.inputs.enforcement_interruptions;
}

function renderInterruptionRow(row, index) {
  const wrap = el('div', 'field interruption-row');
  const typeId = `in-interruption-${index}-type`;
  const dateId = `in-interruption-${index}-date`;

  const typeLabel = el('label', null, 'Основание перерыва');
  typeLabel.setAttribute('for', typeId);
  wrap.appendChild(typeLabel);
  const select = el('select');
  select.id = typeId;
  for (const type of ENFORCEMENT_INTERRUPTION_TYPES_APK) {
    const option = el('option', null, type.title);
    option.value = type.id;
    if (type.id === row.type) option.selected = true;
    select.appendChild(option);
  }
  select.addEventListener('change', () => {
    row.type = select.value;
    syncInterruptions();
    render();
  });
  wrap.appendChild(select);

  const dateLabel = el('label', 'interruption-date-label', 'Дата события');
  dateLabel.setAttribute('for', dateId);
  wrap.appendChild(dateLabel);
  const input = el('input');
  input.type = 'text';
  input.id = dateId;
  input.setAttribute('inputmode', 'numeric');
  input.placeholder = 'ДД.ММ.ГГГГ';
  input.autocomplete = 'off';
  input.value = row.raw;
  wrap.appendChild(input);
  const err = el('p', 'field-error');
  err.textContent = dateFieldError(row.raw);
  if (err.textContent) input.classList.add('invalid');
  wrap.appendChild(err);
  attachDateMask(input, (_input, parsed) => {
    row.raw = parsed.raw;
    syncInterruptions();
    render();
  });

  const remove = el('button', 'row-remove', 'Удалить');
  remove.type = 'button';
  remove.addEventListener('click', () => {
    interruptionDraft.splice(index, 1);
    syncInterruptions();
    render();
  });
  wrap.appendChild(remove);
  return wrap;
}

function renderInterruptions() {
  const box = el('div', 'note interruptions');
  box.appendChild(
    el('div', null, 'Срок прерывался? Добавьте события — срок пойдёт заново от последнего по дате.'),
  );
  interruptionDraft.forEach((row, index) => box.appendChild(renderInterruptionRow(row, index)));
  const add = el('button', 'row-add', 'Добавить перерыв');
  add.type = 'button';
  add.addEventListener('click', () => {
    interruptionDraft.push({ type: DEFAULT_INTERRUPTION_TYPE_APK, raw: '' });
    const index = interruptionDraft.length - 1;
    syncInterruptions();
    render();
    document.getElementById(`in-interruption-${index}-date`)?.focus();
  });
  box.appendChild(add);
  return box;
}

// --- Повторяемые списки периодов (ч. 2, 5 ст. 321 АПК РФ) ---------------------
//
// Образца в ГПК нет: в строке две даты вместо одной, и списка два — у ч. 2
// основания нет вовсе (расчёт проставляет тип сам), у ч. 5 оно обязательно и
// выбирается из каталога. Длина периода показывается в самой строке: правило
// «конец минус начало, без +1» иначе осталось бы невидимым до карточки.

const suspensionDraft = []; // [{ startRaw, endRaw }]
const exclusionDraft = []; // [{ type, startRaw, endRaw }]
const DEFAULT_EXCLUSION_TYPE_APK = ENFORCEMENT_EXCLUSION_TYPES_APK[0].id;

function syncSuspension() {
  const ready = periodsFromDraft(suspensionDraft);
  if (ready.length) state.inputs.suspension_periods = ready;
  else delete state.inputs.suspension_periods;
}

function syncExclusion() {
  const ready = periodsFromDraft(exclusionDraft, { typed: true });
  if (ready.length) state.inputs.execution_ended_periods = ready;
  else delete state.inputs.execution_ended_periods;
}

// Одно поле даты внутри строки периода: свой id (нужен для возврата фокуса
// после перерисовки) и своя ошибка формата.
function renderPeriodDate(row, key, domId, labelText, onCommit) {
  const box = el('div', 'period-date');
  const label = el('label', null, labelText);
  label.setAttribute('for', domId);
  box.appendChild(label);
  const input = el('input');
  input.type = 'text';
  input.id = domId;
  input.setAttribute('inputmode', 'numeric');
  input.placeholder = 'ДД.ММ.ГГГГ';
  input.autocomplete = 'off';
  input.value = row[key];
  box.appendChild(input);
  const err = el('p', 'field-error');
  err.textContent = dateFieldError(row[key]);
  if (err.textContent) input.classList.add('invalid');
  box.appendChild(err);
  attachDateMask(input, (_input, parsed) => {
    row[key] = parsed.raw;
    onCommit();
    render();
  });
  return box;
}

function renderPeriodRow(row, index, config) {
  const wrap = el('div', 'field period-row');

  if (config.typed) {
    const typeId = `in-${config.prefix}-${index}-type`;
    const typeLabel = el('label', null, 'Основание окончания исполнения');
    typeLabel.setAttribute('for', typeId);
    wrap.appendChild(typeLabel);
    const select = el('select');
    select.id = typeId;
    for (const type of ENFORCEMENT_EXCLUSION_TYPES_APK) {
      const option = el('option', null, type.title);
      option.value = type.id;
      if (type.id === row.type) option.selected = true;
      select.appendChild(option);
    }
    select.addEventListener('change', () => {
      row.type = select.value;
      config.sync();
      render();
    });
    wrap.appendChild(select);
  }

  const dates = el('div', 'period-dates');
  dates.appendChild(
    renderPeriodDate(row, 'startRaw', `in-${config.prefix}-${index}-start`, 'Начало', config.sync),
  );
  dates.appendChild(
    renderPeriodDate(row, 'endRaw', `in-${config.prefix}-${index}-end`, 'Окончание', config.sync),
  );
  // Длина периода — рядом с датами, как только обе разобраны.
  const days = periodDaysBetween(ruToISO(row.startRaw), ruToISO(row.endRaw));
  if (days != null && days >= 0) {
    dates.appendChild(el('span', 'period-days', `${days} ${pluralDays(days)}`));
  }
  wrap.appendChild(dates);

  // Ошибка всей строки: конец раньше начала — видна сразу, не дожидаясь
  // пометки «не принято» в истории на карточке.
  const rowError = periodRowError(row.startRaw, row.endRaw);
  if (rowError) wrap.appendChild(el('p', 'period-row-error', rowError));

  const remove = el('button', 'row-remove', 'Удалить');
  remove.type = 'button';
  remove.addEventListener('click', () => {
    config.draft.splice(index, 1);
    config.sync();
    render();
  });
  wrap.appendChild(remove);
  return wrap;
}

function renderPeriodSection(config) {
  const box = el('div', 'period-section');
  box.appendChild(el('div', 'period-section-title', config.title));
  if (config.hint) box.appendChild(el('p', 'hint', config.hint));
  config.draft.forEach((row, index) => box.appendChild(renderPeriodRow(row, index, config)));
  const add = el('button', 'row-add', config.addLabel);
  add.type = 'button';
  add.addEventListener('click', () => {
    config.draft.push(
      config.typed
        ? { type: DEFAULT_EXCLUSION_TYPE_APK, startRaw: '', endRaw: '' }
        : { startRaw: '', endRaw: '' },
    );
    const index = config.draft.length - 1;
    config.sync();
    render();
    document.getElementById(`in-${config.prefix}-${index}-start`)?.focus();
  });
  box.appendChild(add);
  return box;
}

function renderPeriods() {
  const box = el('div', 'note interruptions');
  box.appendChild(
    el(
      'div',
      null,
      'Исполнение приостанавливалось или оканчивалось по вине взыскателя? ' +
        'Добавьте периоды — они не засчитываются в срок и отодвинут дату.',
    ),
  );
  box.appendChild(
    renderPeriodSection({
      prefix: 'suspension',
      draft: suspensionDraft,
      sync: syncSuspension,
      typed: false,
      title: 'Приостановление исполнения (ч. 2 ст. 321 АПК РФ)',
      hint: 'Основание приостановления на расчёт не влияет — нужны только даты.',
      addLabel: 'Добавить приостановление',
    }),
  );
  box.appendChild(
    renderPeriodSection({
      prefix: 'exclusion',
      draft: exclusionDraft,
      sync: syncExclusion,
      typed: true,
      title: 'Окончание исполнения по вине взыскателя (ч. 5 ст. 321 АПК РФ)',
      hint:
        'Только два основания из ч. 5: отзыв листа взыскателем и его действия, ' +
        'препятствующие исполнению. Окончание по другим основаниям в срок засчитывается.',
      addLabel: 'Добавить период',
    }),
  );
  return box;
}

// --- Экспорт ------------------------------------------------------------------

let currentIcsTerms = [];
let currentSummary = [];
const exportableIds = new Set();
const exportDurations = new Map();

function summaryEntries(cards) {
  const entries = [];
  for (const card of cards) {
    if (card.kind === 'term' && card.deadline) {
      entries.push({
        title: card.title,
        deadline: card.deadline,
        norm: card.norm,
        kind: 'applicant',
      });
    } else if (card.kind === 'event' && card.date) {
      entries.push({ title: card.title, deadline: card.date, norm: card.norm, kind: 'event' });
    }
  }
  return entries;
}

function updateExportButtons() {
  const ics = document.getElementById('download-ics');
  if (ics) ics.disabled = currentIcsTerms.length === 0;
  for (const id of ['copy-terms', 'print-terms']) {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = currentSummary.length === 0;
  }
}

function googleCalendarLink(card) {
  const wrap = el('div', 'to-calendar-block');
  const a = el('a', 'to-calendar', 'Добавить в Google Календарь');
  a.href = googleCalendarUrl({
    title: calendarEventTitle(card.title),
    deadline: card.deadline,
    norm: card.norm,
  });
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  wrap.appendChild(a);
  const rule = reminderRulePhrase(exportDurations.get(card.id), reminderOffsets);
  wrap.appendChild(
    el(
      'div',
      'hint to-calendar-note',
      rule
        ? `Ссылка не задаёт напоминания — Google подставит своё по умолчанию. ` +
          `Наши напоминания для этого срока (${rule}) добавьте в событии вручную.`
        : 'Ссылка не задаёт напоминания — Google подставит своё по умолчанию.',
    ),
  );
  return wrap;
}

async function downloadICS() {
  if (currentIcsTerms.length === 0) return;
  const ics = buildICS(currentIcsTerms, { referenceDate: today, now: new Date() });
  const file = new File([ics], ICS_FILENAME, { type: ICS_TYPE_FILE });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
    }
  }
  const blob = new Blob([ics], { type: ICS_TYPE_DOWNLOAD });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = ICS_FILENAME;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

let copyStatusTimer = null;

function showCopyStatus(message) {
  const box = document.getElementById('copy-status');
  if (!box) return;
  box.textContent = message;
  clearTimeout(copyStatusTimer);
  copyStatusTimer = setTimeout(() => {
    box.textContent = '';
  }, 3000);
}

function copyViaSelection(text) {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}

async function copyTerms() {
  if (currentSummary.length === 0) return;
  const text = termsAsText(currentSummary, {
    today,
    situation: situationById(state.situation, SITUATIONS_APK).label,
  });
  let ok = true;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    ok = copyViaSelection(text);
  }
  showCopyStatus(ok ? 'Скопировано' : 'Не удалось скопировать');
}

function printTerms() {
  if (currentSummary.length === 0) return;
  window.print();
}

function printItem(item) {
  const box = el('div', 'print-item');
  box.appendChild(el('div', 'print-item-title', item.caption ? `${item.title} · ${item.caption}` : item.title));
  box.appendChild(el('div', 'print-date', isoToRu(item.deadline)));
  box.appendChild(el('div', 'print-norm', item.norm));
  return box;
}

function renderPrintList(situation) {
  const head = document.getElementById('print-header');
  if (head) {
    head.textContent = '';
    head.appendChild(
      el('div', 'print-title', caseSummaryHeader({ today, situation: situation.label })),
    );
  }
  const list = document.getElementById('print-list');
  if (!list) return;
  list.textContent = '';
  for (const item of caseSummaryItems(currentSummary)) list.appendChild(printItem(item));
}

// --- Форма --------------------------------------------------------------------

function renderSituationSwitch(current) {
  const root = document.getElementById('situation');
  if (root.dataset.rendered === 'yes') {
    for (const input of root.querySelectorAll('input[type=radio]')) {
      input.checked = input.value === current.id;
      input.closest('label').classList.toggle('active', input.value === current.id);
    }
    return;
  }
  root.textContent = '';
  const fs = el('fieldset', 'situations');
  fs.appendChild(el('legend', null, 'Какая у вас ситуация'));
  const row = el('div', 'situation-row');
  for (const s of SITUATIONS_APK) {
    const label = el('label', s.id === current.id ? 'situation active' : 'situation');
    const input = el('input');
    input.type = 'radio';
    input.name = 'situation';
    input.value = s.id;
    input.checked = s.id === current.id;
    input.addEventListener('change', () => {
      if (!input.checked) return;
      // Введённые данные живут в state.inputs и rawDates — переключение их не
      // трогает: скрытая ветвь при возврате показывает те же значения.
      state.situation = input.value;
      render();
    });
    label.appendChild(input);
    label.appendChild(el('span', null, s.label));
    row.appendChild(label);
  }
  fs.appendChild(row);
  root.appendChild(fs);
  root.dataset.rendered = 'yes';
}

function renderPrimaryField(situation) {
  const box = document.querySelector('section.primary');
  box.hidden = !situation.primary_field;
  if (situation.primary_field) renderedFields.add(situation.primary_field);
}

// Поля ситуации: у ветви с основным полем — блок уточнений под карточками (и
// только после заполнения основного), у остальных — блок исходных данных над
// карточками, иначе пользователь попадает на пустой экран.
function renderSituationFields(situation, primaryFilled) {
  const top = document.getElementById('situation-inputs');
  const bottom = document.getElementById('other-terms');
  const root = situation.primary_field ? bottom : top;
  const other = situation.primary_field ? top : bottom;

  other.textContent = '';
  other.hidden = true;
  root.textContent = '';
  const hasOwnValue = situation.fields.some((id) => state.inputs[id] != null);
  if (!situation.fields.length || (situation.primary_field && !primaryFilled && !hasOwnValue)) {
    root.hidden = true;
    return;
  }
  root.hidden = false;
  root.appendChild(
    el('h2', null, situation.primary_field ? 'Дополнительные данные' : 'Исходные данные'),
  );
  const box = el('div', 'fields');
  for (const id of situation.fields) {
    // Три альтернативные даты якоря трёхлетнего срока (ч. 1 ст. 321) —
    // взаимоисключающие: расчёту нужна ровно одна, та, что соответствует
    // выбранному case_type. Пока case_type не выбран, не показываем ни одну
    // из трёх — три одинаковых на вид поля дат без подписи «зачем» только
    // запутали бы, кто её должен заполнять; сначала пусть решит, какая ветка
    // его случая, это единственный content-осмысленный порядок.
    if (
      ENFORCEMENT_DATE_FIELDS_APK.includes(id) &&
      id !== ENFORCEMENT_DATE_BY_CASE_TYPE_APK[state.inputs.case_type]
    ) {
      continue;
    }
    if (fieldAlreadyRendered(id)) continue;
    box.appendChild(renderField(id));
  }
  root.appendChild(box);
}

// --- Рендер -------------------------------------------------------------------

function render() {
  const focus = captureFocus();
  renderedFields.clear();
  const situation = situationById(state.situation, SITUATIONS_APK);
  const visible = new Set(situation.nodes);

  // Расчёт от выбора ситуации не зависит: buildView считает все узлы,
  // переключатель решает, что показать и что выгрузить.
  const view = buildView(state.inputs, { today });
  const visibleCards = view.cards.filter((c) => visible.has(c.id));

  currentIcsTerms = icsTermsFromView({ cards: visibleCards });
  currentSummary = summaryEntries(visibleCards);
  exportableIds.clear();
  exportDurations.clear();
  for (const { card, meta } of exportableCards({ cards: visibleCards })) {
    exportableIds.add(card.id);
    exportDurations.set(card.id, card.duration || meta.duration);
  }
  updateExportButtons();
  renderPrintList(situation);

  renderSituationSwitch(situation);
  renderPrimaryField(situation);
  renderSituationFields(situation, Boolean(state.inputs[situation.primary_field]));

  const root = document.getElementById('results');
  root.textContent = '';

  const cardById = (id) => view.cards.find((c) => c.id === id);
  const incById = (id) => view.incomplete.find((n) => n.id === id);

  for (const id of situation.nodes) {
    const card = cardById(id);
    if (card) {
      if (card.kind === 'event') root.appendChild(renderEvent(card));
      else if (card.kind === 'error') {
        const errorEl = renderErrorCard(card);
        // Списки остаются на экране и при отказе расчёта: пересечение периодов
        // правится только в них, а карточка срока в этом состоянии не строится —
        // без списков исправить введённое было бы негде.
        if (id === 'enforcement_presentation_apk') {
          errorEl.appendChild(renderInterruptions());
          errorEl.appendChild(renderPeriods());
        }
        root.appendChild(errorEl);
      } else if (card.kind === 'not_applicable') root.appendChild(renderNotApplicableCard(card));
      else {
        const termEl = renderTermCard(card);
        // Повторяемые списки — у единственного узла, к которому применимы обе
        // механики ст. 321. Перерыв определяется признаком самого срока,
        // периоды — узлом: второго такого узла нет, и заводить ради него флаг
        // в chain.js незачем.
        if (card.interruptible) termEl.appendChild(renderInterruptions());
        if (id === 'enforcement_presentation_apk') termEl.appendChild(renderPeriods());
        root.appendChild(termEl);
      }
      continue;
    }
    // Карточка не построена: у узла ст. 321 списки периодов всё равно нужны —
    // иначе, ошибившись в периоде, пользователь не найдёт, где его исправить.
    const inc = incById(id);
    if (inc) root.appendChild(renderIncompleteNode(inc));
  }

  if (!root.childElementCount) {
    const first = situation.primary_field ?? situation.fields[0];
    root.appendChild(el('p', 'empty', `Укажите ${askFor(first)} — появятся сроки.`));
  }

  restoreFocus(focus);
}

// --- Инициализация ------------------------------------------------------------
//
// Запускается только в браузере: без этой проверки модуль нельзя было бы
// импортировать в тестах ради чистых помощников (periodsFromDraft и соседние),
// которые считают строки списков без всякого DOM.

function init() {
  const primary = document.getElementById('decision-full-text');
  const primaryError = document.getElementById('decision-full-text-error');
  attachDateMask(primary, (input, parsed) =>
    commitDateInput('decision_full_text_date', input, primaryError, parsed),
  );

  document.getElementById('download-ics')?.addEventListener('click', downloadICS);
  document.getElementById('copy-terms')?.addEventListener('click', copyTerms);
  document.getElementById('print-terms')?.addEventListener('click', printTerms);

  render();
}

if (typeof document !== 'undefined') init();
