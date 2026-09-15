// Интерфейс домена банкротства (ФЗ № 127-ФЗ) — единственная точка рендера в DOM
// для bankruptcy.html. Поверх buildViewBankruptcy (apk/bankruptcy-views.js), без
// собственной логики расчёта: приложение читает поля, зовёт buildViewBankruptcy
// и рисует результат.
//
// Отдельный файл, а не ветка в apk/app.js: домен банкротства — отдельный закон
// со своей страницей (решение БАНКРОТСТВО-UI.0), он не делит с процессуальной
// цепочкой АПК ни одного узла, ни одного поля ввода. Общими остаются только
// механики, вынесенные в ядро (маска даты, выбор ситуации по id), — они
// импортируются как есть.
//
// Что здесь есть и чего нет по сравнению с apk/app.js:
//   * карточка kind:'capped_term' — ПЕРВЫЙ живой рендер этого вида: один
//     дедлайн, полученный как минимум из нескольких кумулятивных потолков,
//     каждый из которых показан явно (ст. 61.14 ФЗ № 127-ФЗ);
//   * НЕТ виджета периодов, не засчитываемых в срок (ч. 2, 5 ст. 321 АПК) —
//     это специфика исполнительного листа АПК, ни один узел банкротства такой
//     механики не требует;
//   * сводка сроков (копирование и печать) — та же, что в apk/app.js; строка
//     capped_term-узла в ней такая же, как у обычного срока: одна итоговая
//     дата и норма, без разбора потолков (решение по итогам ревью UI.2);
//   * НЕТ экспорта в календарь (.ics и ссылки в Google Календарь): реестр
//     сроков apk/term-registry.js сканирует только apk/chain.js, а два узла
//     субсидиарной ответственности не проходят его предикат isTermNode — у них
//     нет top-level duration. Подробнее — в шапке apk/bankruptcy-views.js;
//   * НЕТ булевых дискриминаторов, карточек-событий, окон и «норма не
//     применяется» — таких узлов в домене нет.

import { buildViewBankruptcy } from './bankruptcy-views.js';
import { SITUATIONS_BANKRUPTCY, DEFAULT_SITUATION_BANKRUPTCY } from './bankruptcy-situations.js';
import { INPUT_LABELS_BANKRUPTCY } from './bankruptcy-labels.js';

// --- Из ядра, без изменений ---------------------------------------------------
import { situationById } from '../core/view/situations.js';
import { applyDateEdit, dateFieldError, isoToRu, ruToISO } from '../core/ui/date-field.js';
// Подпись даты на карточке и сборка сводки — то же, что на страницах ГПК и АПК.
// Ничего из механики КАЛЕНДАРНОГО экспорта (buildICS, googleCalendarUrl) сюда не
// импортируется и импортироваться не должно — см. шапку файла.
import {
  DEADLINE_CAPTION,
  termsAsText,
  caseSummaryItems,
  caseSummaryHeader,
} from '../core/export/links.js';

// --- Поля ввода: вид виджета по полю ------------------------------------------
//
// Единственное поле-не-дата во всём домене — дискриминатор объективного потолка
// п. 5 ст. 61.14. Таблица оставлена в том же виде, что в apk/app.js: рендер
// ситуации остаётся общим циклом, а вид виджета задаётся полем.

const OBJECTIVE_CAP_EVENT_OPTIONS = [
  { value: 'bankruptcy_declared', label: 'Признание должника банкротом' },
  { value: 'case_terminated', label: 'Прекращение производства по делу о банкротстве' },
  {
    value: 'petition_returned',
    label: 'Возврат уполномоченному органу заявления о признании должника банкротом',
  },
];

// Какая из трёх альтернативных дат объективного потолка реально нужна при
// каждом значении дискриминатора — дублирует OBJECTIVE_CAP_DATE_FIELD_BANKRUPTCY
// из apk/bankruptcy-views.js (и OBJECTIVE_CAP_DATE_FIELD_APK из
// apk/bankruptcy.js — та не экспортирована, оба файла в этой задаче не трогаем).
// Здесь это чисто вопрос видимости поля, а не расчёта: какая дата нужна,
// по-прежнему решает сама модель, эта таблица лишь скрывает два поля из трёх,
// которые для выбранного события заведомо не читаются. Тот же приём, что у
// ENFORCEMENT_DATE_BY_CASE_TYPE_APK в apk/app.js.
const OBJECTIVE_CAP_DATE_BY_EVENT_BANKRUPTCY = {
  bankruptcy_declared: 'bankruptcy_declared_date_apk',
  case_terminated: 'bankruptcy_case_terminated_date_apk',
  petition_returned: 'bankruptcy_petition_returned_date_apk',
};
const OBJECTIVE_CAP_DATE_FIELDS_BANKRUPTCY = Object.values(OBJECTIVE_CAP_DATE_BY_EVENT_BANKRUPTCY);

const FIELD_KIND_BANKRUPTCY = {
  objective_cap_event: { kind: 'choice', options: OBJECTIVE_CAP_EVENT_OPTIONS },
};

// --- Состояние ----------------------------------------------------------------

const state = { inputs: {}, situation: DEFAULT_SITUATION_BANKRUPTCY };

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
  const label = INPUT_LABELS_BANKRUPTCY[id] ?? '';
  if (/^Дата /.test(label)) {
    return label.replace(/^Дата /, 'дату ').replace(/\s*\([^)]*\)$/, '');
  }
  return label.charAt(0).toLowerCase() + label.slice(1);
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
// проход, иначе на странице окажутся два элемента с одинаковым id. В этом домене
// так устроены восстановительные узлы субсидиарки — они стоят в одной ветви с
// базовым узлом и делят с ним весь список полей.
const renderedFields = new Set();

function fieldAlreadyRendered(id) {
  if (renderedFields.has(id)) return true;
  renderedFields.add(id);
  return false;
}

// --- Поля ввода ---------------------------------------------------------------

function renderDateField(id, labelOverride) {
  const wrap = el('div', 'field');
  const lab = el('label', null, labelOverride ?? INPUT_LABELS_BANKRUPTCY[id]);
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
  const lab = el('label', null, labelOverride ?? INPUT_LABELS_BANKRUPTCY[id]);
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

function renderField(id, labelOverride) {
  const spec = FIELD_KIND_BANKRUPTCY[id];
  if (spec?.kind === 'choice') return renderChoiceField(id, spec.options, labelOverride);
  return renderDateField(id, labelOverride);
}

// Поле для узла: либо само поле, либо ссылка на то место, где оно уже показано.
// Формулировка без «выше»/«ниже» — как в apk/app.js: блок уточняющих дат стоит
// то до карточек, то после них, в зависимости от того, есть ли у ветви основное
// поле, и утверждать направление было бы неверно в одном из двух случаев.
function fieldOrPointer(id, labelOverride) {
  if (fieldAlreadyRendered(id)) {
    return el(
      'p',
      'hint',
      `Поле «${labelOverride ?? INPUT_LABELS_BANKRUPTCY[id]}» уже есть в этой форме.`,
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

function calendarWarning(card) {
  return collapsedWarning('Календарь на этот год ещё не окончательный', [
    el('div', null, card.calendar_warning.text),
  ]);
}

// Пометка истёкшего срока. Пропуск ('missed') в этом домене невозможен: ни у
// одного узла нет поля «дата фактической подачи» (ACTION_FACT_INPUT_BANKRUPTCY
// пуст), поэтому факт совершения действия подтвердить нечем.
function expiredNote(card) {
  const days = card.expired.days;
  return el(
    'div',
    'expired-note',
    `Срок истёк ${days} ${pluralDays(days)} назад. Дата подачи не введена — ` +
      'пропуск не подтверждён.',
  );
}

function renderTermCard(card) {
  const c = el('div', 'card');
  c.appendChild(el('div', 'kicker', 'Срок'));
  c.appendChild(el('h2', null, card.title));
  c.appendChild(el('div', 'deadline-caption', DEADLINE_CAPTION));

  if (card.status === 'expired') {
    c.appendChild(el('div', 'deadline expired', isoToRu(card.deadline)));
    c.appendChild(el('div', 'norm', card.norm));
    c.appendChild(expiredNote(card));
  } else {
    c.appendChild(el('div', 'deadline', isoToRu(card.deadline)));
    c.appendChild(el('div', 'norm', card.norm));
  }

  // Для сроков в рабочих днях — первый день течения, тем же способом, что у
  // working_day-узлов ГПК (web/app.js): иначе непонятно, почему дата уехала так
  // далеко, например за январские каникулы. В этом домене такой узел один —
  // ст. 47 п. 1 ФЗ № 127-ФЗ.
  if (card.first_working_day) {
    c.appendChild(el('div', 'hint', `Отсчёт рабочих дней с ${isoToRu(card.first_working_day)}`));
  }

  if (card.calendar_warning) c.appendChild(calendarWarning(card));
  if (card.details) c.appendChild(renderDetails(card.details));
  return c;
}

// Карточка срока, ограниченного несколькими кумулятивными потолками
// (ст. 61.14 ФЗ № 127-ФЗ). Шапка, подпись и дата — как у обычного срока: дедлайн
// здесь один, настоящий и готовый. Добавлен ровно один блок — разбор потолков, и
// он ВСЕГДА развёрнут, не за «Подробнее»: без него карточка неотличима от
// обычного срока, и непонятно, почему при сдвиге одной из введённых дат дедлайн
// не двигается (типовой случай — ограничивает десятилетний предел).
//
// card.caps приходит готовым к показу (упорядоченный массив строк с подписью,
// отметкой связывания и, у связавшей строки, датой переноса) — здесь ничего не
// пересчитывается, только рисуется.
function renderCappedTerm(card) {
  const c = el('div', 'card');
  c.appendChild(el('div', 'kicker', 'Срок'));
  c.appendChild(el('h2', null, card.title));
  c.appendChild(el('div', 'deadline-caption', DEADLINE_CAPTION));

  if (card.status === 'expired') {
    c.appendChild(el('div', 'deadline expired', isoToRu(card.deadline)));
    c.appendChild(el('div', 'norm', card.norm));
    c.appendChild(expiredNote(card));
  } else {
    c.appendChild(el('div', 'deadline', isoToRu(card.deadline)));
    c.appendChild(el('div', 'norm', card.norm));
  }

  c.appendChild(renderCaps(card));

  if (card.calendar_warning) c.appendChild(calendarWarning(card));
  if (card.details) c.appendChild(renderDetails(card.details));
  return c;
}

function renderCaps(card) {
  const box = el('div', 'caps');
  box.appendChild(el('div', 'caps-title', 'Пределы срока'));
  const list = el('ul', 'cap-list');
  for (const cap of card.caps) {
    // Связавших строк может быть несколько — при совпадении потолков по дате
    // отмечены все, а не одна выбранная произвольно.
    const item = el('li', cap.binding ? 'cap binding' : 'cap');
    const head = el('div');
    head.appendChild(el('span', 'cap-date', isoToRu(cap.date)));
    head.appendChild(el('span', 'cap-caption', cap.caption));
    if (cap.binding) head.appendChild(el('span', 'cap-mark', 'ограничивает срок'));
    item.appendChild(head);
    // Перенос — только у связавшей строки и только когда он реально был: иначе
    // на экране необъяснимое расхождение между подсвеченным потолком и дедлайном
    // карточки.
    if (cap.shifted_to) {
      item.appendChild(
        el(
          'div',
          'cap-shift',
          `Последний день выпал на нерабочий — перенесён на ${isoToRu(cap.shifted_to)}`,
        ),
      );
    }
    list.appendChild(item);
  }
  box.appendChild(list);
  box.appendChild(
    el(
      'div',
      'hint',
      'Пределы действуют одновременно — срок истекает по самому раннему из них.',
    ),
  );
  return box;
}

// Расчёт отказал на введённых данных — например, на неизвестном значении
// дискриминатора, пришедшем не из формы. Текст берём из модели как есть: он уже
// объясняет причину и что поправить.
function renderErrorCard(card) {
  const c = el('div', 'card calc-error');
  c.appendChild(el('div', 'kicker', 'Расчёт невозможен'));
  c.appendChild(el('h2', null, card.title));
  c.appendChild(el('div', 'calc-error-text', card.message));
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

// --- Сводка сроков: копирование и печать --------------------------------------
//
// Механика перенесена из apk/app.js как есть (общий источник — core/export/
// links.js, чтобы текст копирования и печати не расходились). Отличается только
// состав видов карточек, попадающих в сводку: событий, окон и «норма не
// применяется» в этом домене нет.

let currentSummary = [];

/**
 * Карточки → записи сводки. Строка capped_term-узла ТАКАЯ ЖЕ, как у обычного
 * срока: одна итоговая дата (уже перенесённая, если перенос был) и норма.
 *
 * Потолки (card.caps) в сводку и печать не идут сознательно. Разбор пределов
 * нужен рядом с вводом — там видно, какую из введённых дат двигать; в списке
 * дат он превратил бы одну запись в несколько строк дат-кандидатов, из которых
 * все, кроме связавшей, сроком не являются и последним днём подачи не были.
 *
 * Условие по kind, а не по id узла: любой следующий capped_term попадёт в
 * сводку сам, без правки этого места.
 */
function summaryEntries(cards) {
  const entries = [];
  for (const card of cards) {
    if (card.kind !== 'term' && card.kind !== 'capped_term') continue;
    if (!card.deadline) continue;
    entries.push({
      title: card.title,
      deadline: card.deadline,
      norm: card.norm,
      // Все сроки этого домена — сроки заявителя: подпись «последний день
      // подачи». Сроков суда (kind: 'court') и событий среди узлов нет.
      kind: 'applicant',
    });
  }
  return entries;
}

function updateSummaryButtons() {
  for (const id of ['copy-terms', 'print-terms']) {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = currentSummary.length === 0;
  }
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
    situation: situationById(state.situation, SITUATIONS_BANKRUPTCY).label,
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
  box.appendChild(
    el('div', 'print-item-title', item.caption ? `${item.title} · ${item.caption}` : item.title),
  );
  // item.date, а НЕ isoToRu(item.deadline): caseSummaryItems отдаёт уже
  // отформатированную дату в поле date, поля deadline у её результата нет.
  // В apk/app.js здесь isoToRu(item.deadline) — то есть isoToRu(undefined),
  // и на печати apk.html дата выходит пустой. Тот файл в этой задаче не
  // трогаем; здесь повторён рабочий вариант из web/app.js (ГПК).
  box.appendChild(el('div', 'print-date', item.date));
  if (item.norm) box.appendChild(el('div', 'print-norm', item.norm));
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
  for (const s of SITUATIONS_BANKRUPTCY) {
    const label = el('label', s.id === current.id ? 'situation active' : 'situation');
    const input = el('input');
    input.type = 'radio';
    input.name = 'situation';
    input.value = s.id;
    input.checked = s.id === current.id;
    input.addEventListener('change', () => {
      if (!input.checked) return;
      // Введённые данные живут в state.inputs и rawDates — переключение их не
      // трогает: скрытая ветвь при возврате показывает те же значения. Для этого
      // домена это существенно: дата действий (бездействия) — общее поле двух
      // ветвей субсидиарки.
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

// Основное поле ветви — только у debtor_response; у остальных четырёх ветвей
// primary_field нет, и секция остаётся скрытой.
function renderPrimaryField(situation) {
  const box = document.querySelector('section.primary');
  const id = situation.primary_field;
  box.hidden = !id;
  box.textContent = '';
  if (!id) return;
  renderedFields.add(id);

  const field = renderField(id);
  field.querySelector('label')?.appendChild(el('span', 'req', ' *'));
  box.appendChild(field);
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
    // Три альтернативные даты объективного потолка (п. 5 ст. 61.14) —
    // взаимоисключающие: расчёту нужна ровно одна, та, что соответствует
    // выбранному событию. Пока событие не выбрано, не показываем ни одной из
    // трёх — три одинаковых на вид поля дат без подписи «зачем» только
    // запутали бы, кто их должен заполнять. Тот же порядок, что у case_type в
    // ветви исполнительного листа АПК.
    if (
      OBJECTIVE_CAP_DATE_FIELDS_BANKRUPTCY.includes(id) &&
      id !== OBJECTIVE_CAP_DATE_BY_EVENT_BANKRUPTCY[state.inputs.objective_cap_event]
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
  const situation = situationById(state.situation, SITUATIONS_BANKRUPTCY);

  // Расчёт от выбора ситуации не зависит: buildViewBankruptcy считает все узлы,
  // переключатель решает, что показать.
  const view = buildViewBankruptcy(state.inputs, { today });
  const visible = new Set(situation.nodes);
  const visibleCards = view.cards.filter((c) => visible.has(c.id));

  // В сводку идут только узлы выбранной ветви — то же правило, что и на экране.
  currentSummary = summaryEntries(visibleCards);
  updateSummaryButtons();
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
      if (card.kind === 'capped_term') root.appendChild(renderCappedTerm(card));
      else if (card.kind === 'error') root.appendChild(renderErrorCard(card));
      // Остальное — обычный срок: и карточка, построенная monthTermCard, и
      // карточка working_day-узла (workingDayCard сама проставляет kind:'term',
      // отдельной ветки ей не нужно).
      else root.appendChild(renderTermCard(card));
      continue;
    }
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
// Запускается только в браузере: проверка оставлена той же, что в apk/app.js,
// чтобы модуль можно было импортировать вне DOM, не выполняя рендер.

function init() {
  document.getElementById('copy-terms')?.addEventListener('click', copyTerms);
  document.getElementById('print-terms')?.addEventListener('click', printTerms);
  render();
}

if (typeof document !== 'undefined') init();
