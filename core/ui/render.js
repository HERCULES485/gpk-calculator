// Слой DOM-рендеринга: карточки сроков, события, поля дат, кнопки экспорта,
// механика появления блоков и восстановления фокуса.
//
// Предметно-независимо: здесь нет ни одной проверки по идентификатору узла —
// вид блока выбирается по признакам модели (`informational: true` — срок суда,
// `kind: 'event'` — событие), а всё, чей текст завязан на конкретный кодекс
// (история перерывов, предупреждения об исчерпании и о границе редакций,
// спорный срок, ссылка в календарь), приходит извне отдельными рендерерами.
// Предметные словари подписей и имя файла .ics сюда тоже не импортируются —
// вызывающий передаёт их параметрами. Вынесено из web/app.js.
//
// Регрессии этого слоя `node --test` не видит: единственная автоматическая
// защита — scripts/smoke.mjs (Playwright), падающий на любой ошибке в консоли.

import { DEADLINE_CAPTION, DEADLINE_CAPTION_COURT } from '../export/links.js';
import { applyDateEdit, dateFieldError, isoToRu, ruToISO } from './date-field.js';

// --- Утилиты DOM ------------------------------------------------------------

export function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function pluralDays(n) {
  const t = n % 10, h = n % 100;
  if (t === 1 && h !== 11) return 'день';
  if (t >= 2 && t <= 4 && !(h >= 12 && h <= 14)) return 'дня';
  return 'дней';
}

// --- Поля дат ---------------------------------------------------------------

// Автоформатирование ввода: цифры → ДД.ММ.ГГГГ.
//
// Расчёт обновляется по каждому вводу (событие input), а не по уходу с поля:
// карточки появляются сразу, как только дата набрана полностью. Неполный и
// некорректный ввод трактуется как отсутствие значения — отрисовка от него не
// ломается.
//
// Слушаем только input. change здесь вреден: он срабатывает на уходе с поля, а
// перерисовка пересобирает карточки — поле, в которое пользователь только что
// кликнул, уничтожалось бы вместе с фокусом. Вставку мышью и автозаполнение
// input покрывает сам.
export function attachDateMask(input, onCommit) {
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

// Общая фиксация ввода даты: в состояние попадает только полная существующая
// дата, всё остальное — как отсутствие значения.
//
// Хранилища и перерисовка приходят параметрами (`rawDates` — сырые тексты полей,
// `inputs` — входные данные модели, `onChange` — перерисовка): само по себе
// ядро состоянием приложения не владеет.
export function commitDateInput(id, input, errorEl, { raw, iso }, { rawDates, inputs, onChange }) {
  if (raw === '') rawDates.delete(id);
  else rawDates.set(id, raw);
  const error = dateFieldError(raw);
  errorEl.textContent = error;
  input.classList.toggle('invalid', error !== '');
  if (iso == null) delete inputs[id];
  else inputs[id] = iso;
  onChange();
}

// --- Рендер карточек --------------------------------------------------------

export function renderDetails(details) {
  // Нативный <details>/<summary>: свёрнут по умолчанию, раскрывается по клику.
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
      const code = el('code', null, c);
      dd.appendChild(code);
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

// Карточка срока. `parts` — необязательные рендереры блоков, чей текст зависит
// от предметной области: каждый вызывается только тогда, когда у карточки есть
// соответствующий признак модели, и может вернуть null (тогда блок не рисуется).
//   interruptions(card)        — история перерывов срока (card.interruptions)
//   exhaustionWarning(w)       — card.exhaustion_warning
//   boundaryWarning(bw)        — card.boundary_warning
//   alternative(card)          — card.alternative
//   detailComponents(details)  — разбор details до блока «Подробнее»
//   calendarLink(card)         — ссылка «в календарь», если узел экспортируемый
export function renderTermCard(card, opts = {}, parts = {}) {
  // Три уровня различаются по признакам модели, а не по спискам узлов:
  // informational: true — срок суда, kind: 'event' — событие (см. renderEvent).
  if (card.informational) return renderInfoTermCard(card);

  const c = el('div', 'card');
  c.appendChild(el('div', 'kicker', 'Срок'));
  const h = el('h2', null, card.title);
  if (opts.conditionBadge) {
    const b = el('span', 'badge assume', 'при отсутствии обжалования');
    h.appendChild(b);
  }
  if (card.unit === 'working_day') {
    h.appendChild(el('span', 'badge wd', 'рабочие дни'));
  }
  if (card.informational) {
    h.appendChild(el('span', 'badge info', 'справочно'));
  }
  c.appendChild(h);

  // Что означает дата: без подписи «13.08.2026» читается неоднозначно — как
  // дата вступления в силу или как начало течения срока.
  if (card.status !== 'not_applicable') {
    c.appendChild(el('div', 'deadline-caption', DEADLINE_CAPTION));
  }

  if (card.status === 'missed') {
    c.appendChild(el('div', 'deadline missed', isoToRu(card.deadline)));
    c.appendChild(el('div', 'norm', card.norm));
    const days = card.overdue.days;
    c.appendChild(
      el('div', 'miss', `Срок пропущен на ${days} ${pluralDays(days)}. Восстановление — ${card.overdue.norm}.`),
    );
  } else if (card.status === 'expired') {
    // Дедлайн прошёл, а даты подачи нет: факт пропуска не установлен, известно
    // только, что срок истёк. Формулировка поэтому мягче, чем у 'missed'.
    c.appendChild(el('div', 'deadline expired', isoToRu(card.deadline)));
    c.appendChild(el('div', 'norm', card.norm));
    const days = card.expired.days; // строгое сравнение — всегда не меньше 1
    c.appendChild(
      el(
        'div',
        'expired-note',
        `Срок истёк ${days} ${pluralDays(days)} назад. Дата подачи не введена — ` +
          'пропуск не подтверждён.',
      ),
    );
  } else if (card.status === 'not_applicable') {
    // Срока не возникает вовсе — вместо даты прочерк и причина, как у события
    // вступления в силу в том же состоянии.
    c.appendChild(el('div', 'deadline', '—'));
    if (card.message) c.appendChild(el('div', 'warn', card.message));
    c.appendChild(el('div', 'norm', card.norm));
  } else {
    c.appendChild(el('div', 'deadline', isoToRu(card.deadline)));
    c.appendChild(el('div', 'norm', card.norm));
  }

  // Для сроков в рабочих днях показываем первый день течения — иначе непонятно,
  // почему дата уехала так далеко (например, за январские каникулы).
  if (card.first_working_day) {
    c.appendChild(
      el('div', 'hint', `Отсчёт рабочих дней с ${isoToRu(card.first_working_day)}`),
    );
  }
  if (card.note) c.appendChild(el('div', 'note', card.note));

  if (opts.conditionNote) {
    c.appendChild(el('div', 'note', opts.conditionNote));
  }

  // История введённых событий-перерывов: текст оснований предметный.
  if (card.interruptions && parts.interruptions) c.appendChild(parts.interruptions(card));

  if (card.warnings) {
    for (const w of card.warnings) {
      const details = [el('div', null, w.text)];
      // Структурные даты предупреждения форматируем здесь: views отдаёт ISO.
      if (w.allowed_deadline && w.actual_date) {
        details.push(
          el(
            'div',
            null,
            `${w.dates_label ?? 'Срок отложения истекал'} ` +
              `${isoToRu(w.allowed_deadline)}, решение изготовлено ` +
              `${isoToRu(w.actual_date)}.`,
          ),
        );
      }
      // Величина расхождения — в тех же единицах, в каких задан порог.
      if (w.overdue_working_days) {
        const n = w.overdue_working_days;
        details.push(
          el('div', null, `Расхождение — ${n} рабочих ${pluralDays(n)} сверх срока.`),
        );
      }
      c.appendChild(collapsedWarning('Суд нарушил срок изготовления решения', details));
    }
  }

  if (card.calendar_warning) {
    c.appendChild(
      collapsedWarning('Календарь на этот год ещё не окончательный', [
        el('div', null, card.calendar_warning.text),
      ]),
    );
  }

  if (card.exhaustion_warning && parts.exhaustionWarning) {
    c.appendChild(parts.exhaustionWarning(card.exhaustion_warning));
  }

  if (card.boundary_warning && parts.boundaryWarning) {
    c.appendChild(parts.boundaryWarning(card.boundary_warning));
  }

  if (card.alternative && parts.alternative) c.appendChild(parts.alternative(card));

  // Разбор details до блока «Подробнее»: у отдельных оснований итоговая дата
  // складывается из нескольких компонентов, и без них на карточке остался бы
  // только финальный ответ без объяснения, откуда он взялся.
  if (card.details && parts.detailComponents) {
    const components = parts.detailComponents(card.details);
    if (components) c.appendChild(components);
  }

  if (card.details) c.appendChild(renderDetails(card.details));
  if (parts.calendarLink) {
    const link = parts.calendarLink(card);
    if (link) c.appendChild(link);
  }
  return c;
}

// Предупреждение в одну строку; полный текст раскрывается по клику.
//
// Раньше жёлтый блок занимал больше места, чем сама дата, и вытеснял её из
// первого экрана. Свёрнутый вид оставляет суть, развёрнутый — все подробности.
// Нативный <details>: раскрытие по клику работает без нашего кода (раздел 9).
export function collapsedWarning(summaryText, detailNodes, cls = 'warn') {
  const box = el('details', `${cls} collapsible`);
  const head = el('summary', null, summaryText);
  box.appendChild(head);
  const body = el('div', 'warn-body');
  for (const node of detailNodes) if (node) body.appendChild(node);
  box.appendChild(body);
  return box;
}

// Уровень 2 — срок суда (informational: true). Тот же состав данных, но без
// крупной даты и рамки: его не надо успевать соблюсти, он справочный.
export function renderInfoTermCard(card) {
  const c = el('div', 'card info-card');
  const head = el('div', 'info-head');
  const title = el('span', 'info-title', card.title);
  head.appendChild(title);
  head.appendChild(el('span', 'badge info', 'справочно'));
  c.appendChild(head);

  const line = el('div', 'info-line');
  line.appendChild(el('span', 'deadline-caption inline', `${DEADLINE_CAPTION_COURT}:`));
  line.appendChild(
    el(
      'span',
      card.status === 'expired' ? 'info-date expired' : 'info-date',
      card.deadline ? isoToRu(card.deadline) : '—',
    ),
  );
  line.appendChild(el('span', 'norm', card.norm));
  c.appendChild(line);

  if (card.status === 'expired' && card.expired) {
    const n = card.expired.days;
    c.appendChild(el('div', 'hint', `Срок истёк ${n} ${pluralDays(n)} назад.`));
  }
  if (card.first_working_day) {
    c.appendChild(el('div', 'hint', `Отсчёт рабочих дней с ${isoToRu(card.first_working_day)}`));
  }
  if (card.note) c.appendChild(el('div', 'hint', card.note));
  if (card.calendar_warning) {
    c.appendChild(
      collapsedWarning('Календарь на этот год ещё не окончательный', [
        el('div', null, card.calendar_warning.text),
      ]),
    );
  }
  if (card.details) c.appendChild(renderDetails(card.details));
  return c;
}

// Подлежащее к сообщению-состоянию события. Сообщения вида «Вступит в силу …»
// приходят без подлежащего — подставляем его, чтобы строка читалась сама по
// себе. Сообщения с собственным подлежащим («…заочное решение отменено») не
// трогаем.
function withSubject(subject, message) {
  return message.startsWith('Вступит ') ? message.replace(/^Вступит /, `${subject} вступит `) : message;
}

// Уровень 3 — событие. Строкой текста, без карточки: вступление в силу не
// дедлайн, успевать к нему нечего. Поля-уточнения, привязанные к событию,
// остаются под строкой — иначе ветвь стала бы недоступной для ввода.
export function renderEvent(card, opts = {}) {
  const box = el('div', 'event-line');

  // Подлежащее в строке обязательно: событие рендерится без карточки, и в отрыве
  // от заголовка (выделение, копирование) «Вступит в силу …» непонятно — что
  // именно. Ставим явно «Решение суда …»/«Заочное решение …» во всех состояниях.
  const subject = card.subject || 'Решение суда';
  let text;
  if (card.status === 'resolved') text = `${subject} вступило в силу ${isoToRu(card.date)}`;
  else if (card.not_earlier_than) text = `${subject} вступит в силу не ранее ${isoToRu(card.not_earlier_than)}`;
  else if (card.message) text = withSubject(subject, card.message);
  else text = 'Дата вступления в силу пока не определена';

  const head = el('div', 'event-head');
  head.appendChild(el('span', card.status === 'resolved' ? 'event-text done' : 'event-text', text));
  head.appendChild(el('span', 'norm', card.norm));
  box.appendChild(head);

  // Дата события читается иначе, чем дедлайн: это не «успеть до», а момент,
  // с которого постановление действует.
  if (card.status === 'resolved') {
    box.appendChild(
      el('div', 'hint', 'С этой даты постановление считается вступившим в законную силу.'),
    );
  }

  if (card.note) box.appendChild(el('div', 'hint', card.note));
  if (card.calendar_warning) {
    box.appendChild(
      collapsedWarning('Календарь на этот год ещё не окончательный', [
        el('div', null, card.calendar_warning.text),
      ]),
    );
  }
  if (card.details) box.appendChild(renderDetails(card.details));
  if (opts.assumptionNote) box.appendChild(el('div', 'note', opts.assumptionNote));
  return box;
}

// --- Экспорт: кнопки, буфер обмена, печать, файл .ics ------------------------

export function updateExportButtons({ icsTerms, summary }) {
  // .ics — только когда есть сроки для календаря; копирование и печать — когда
  // есть хоть что-то видимое (сроки суда и события тоже переносятся текстом).
  const ics = document.getElementById('download-ics');
  if (ics) ics.disabled = icsTerms.length === 0;
  for (const id of ['copy-terms', 'print-terms']) {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = summary.length === 0;
  }
}

// Текстовый список в буфер обмена. clipboard.writeText есть не везде (и требует
// защищённого соединения), поэтому при отказе — запасной путь через выделение
// временного поля.
export async function copyTerms(text) {
  let ok = true;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    ok = copyViaSelection(text);
  }
  showCopyStatus(ok ? 'Скопировано' : 'Не удалось скопировать');
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

// Печатная версия — тот же список строк, что и копирование: заголовок и по
// строке на срок/событие. CSS печати прячет интерфейс и сами карточки, оставляя
// только этот блок, — иначе печать повторяла бы неоднозначность карточек.
export function printTerms(summary) {
  if (summary.length === 0) return;
  window.print();
}

// Тип с charset — для скачивания файлом; для File в «Поделиться» параметр
// убираем: часть реализаций canShare не распознаёт тип с параметрами.
const ICS_TYPE_DOWNLOAD = 'text/calendar;charset=utf-8';
const ICS_TYPE_FILE = 'text/calendar';

// Отдать готовый текст .ics пользователю. Имя файла предметное — приходит
// параметром.
export async function downloadICS(ics, filename) {
  // iOS Safari не выполняет атрибут download у blob:-ссылки: она открывает
  // содержимое предпросмотром, и добавить события в календарь оттуда нельзя —
  // тип файла при этом ни при чём. Системный лист «Поделиться» такую
  // возможность даёт: Календарь в нём есть.
  const file = new File([ics], filename, { type: ICS_TYPE_FILE });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (err) {
      // Пользователь закрыл лист — это не сбой, скачивать вдогонку не нужно.
      if (err && err.name === 'AbortError') return;
      // Остальное (лист недоступен, отказ платформы) — уходим на скачивание.
    }
  }

  const blob = new Blob([ics], { type: ICS_TYPE_DOWNLOAD });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Освобождать ссылку в том же кадре нельзя: Safari успевает прервать
  // начатое скачивание. Пара сотен байт подождут.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// --- Фокус ------------------------------------------------------------------

// Расчёт идёт по каждому вводу, а перерисовка пересобирает поля заново — без
// восстановления фокуса каретка выпадала бы из поля на каждом нажатии.
// Поля адресуются по устойчивым id (`in-<input>`), поэтому хватает id и позиции
// каретки.
export function captureFocus() {
  const active = document.activeElement;
  if (!active || active.tagName !== 'INPUT' || !active.id) return null;
  return { id: active.id, start: active.selectionStart, end: active.selectionEnd };
}

export function restoreFocus(snapshot) {
  if (!snapshot) return;
  const next = document.getElementById(snapshot.id);
  if (!next || next === document.activeElement) return;
  next.focus();
  if (snapshot.start != null) next.setSelectionRange(snapshot.start, snapshot.end);
}

// --- Плавное появление блоков (reveal) --------------------------------------

// Перерисовка пересобирает DOM целиком, поэтому «новизну» блока храним между
// перерисовками по устойчивому ключу: разворачиваем по высоте только тот блок,
// ключа которого не было в прошлой отрисовке. Уже показанные пересобираются без
// анимации, поэтому фокус и каретка во вводе не сбиваются — анимируется соседний
// блок, а не тот, куда печатают. Блок, чей ключ исчез, при повторном появлении
// развернётся снова.
//
// Порядок вызова: beginReveal() в начале отрисовки, reveal() на каждый блок,
// commitReveal() в конце.
const revealedKeys = new Set();
let revealSeen = new Set();

export function beginReveal() {
  revealSeen = new Set();
}

export function reveal(key, node) {
  revealSeen.add(key);
  const wrap = el('div', 'reveal');
  if (!revealedKeys.has(key)) wrap.classList.add('reveal-in');
  const inner = el('div', 'reveal-inner');
  inner.appendChild(node);
  wrap.appendChild(inner);
  return wrap;
}

// Какие блоки показаны сейчас — то и «уже развёрнуто» для следующей отрисовки.
export function commitReveal() {
  revealedKeys.clear();
  for (const k of revealSeen) revealedKeys.add(k);
}
