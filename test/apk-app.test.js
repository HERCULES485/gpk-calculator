// Чистая логика повторяемых списков интерфейса АПК (apk/app.js): превращение
// черновика строк в значение для расчёта, длина периода и ошибка строки.
//
// Остальное в apk/app.js — рендер в DOM, и проверяется оно в браузере
// (scripts/smoke-apk.mjs), как и у ГПК: `node --test` модули в браузере не
// исполняет. Сюда вынесено ровно то, что считается без DOM.
//
// Импорт apk/app.js в node безопасен: инициализация в файле обёрнута проверкой
// наличия document, и при импорте из теста ничего не рисуется.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  periodDaysBetween,
  periodRowError,
  periodsFromDraft,
  isoDatesToRu,
  formatExclusionSummary,
} from '../apk/app.js';
import { computeEnforcementPresentationApk } from '../apk/chain.js';
import { buildICS, icsTermsFromView, exportableCards } from '../apk/ics.js';

test('АПК периоды: длина считается как end − start, без +1', () => {
  // Та же конвенция, что в core/engine/exclusion.js: день окончания уже снова
  // считается днём течения срока. Цифра показывается пользователю в строке
  // ввода, поэтому расходиться с расчётом она не должна.
  assert.equal(periodDaysBetween('2023-03-01', '2023-05-10'), 70);
  assert.equal(periodDaysBetween('2023-06-01', '2023-08-15'), 75);
  // Период нулевой длины возможен и даёт ноль, а не единицу.
  assert.equal(periodDaysBetween('2023-03-01', '2023-03-01'), 0);
  // Без обеих границ длины нет — в строке ввода просто ничего не показывается.
  assert.equal(periodDaysBetween(null, '2023-05-10'), null);
  assert.equal(periodDaysBetween('2023-03-01', null), null);
});

test('АПК периоды: ошибка строки — только когда конец раньше начала', () => {
  assert.equal(periodRowError('10.05.2023', '01.03.2023').length > 0, true);
  assert.match(periodRowError('10.05.2023', '01.03.2023'), /раньше начала/);
  assert.equal(periodRowError('01.03.2023', '10.05.2023'), '');
  // Равные даты ошибкой не считаются: нулевой период допустим.
  assert.equal(periodRowError('01.03.2023', '01.03.2023'), '');
  // Недобранная дата — не ошибка строки: пользователь ещё печатает.
  assert.equal(periodRowError('01.03.2023', '10.05'), '');
  assert.equal(periodRowError('', ''), '');
});

test('АПК периоды: в расчёт идут только строки с двумя разобранными датами', () => {
  const rows = periodsFromDraft([
    { startRaw: '01.03.2023', endRaw: '10.05.2023' }, // целая
    { startRaw: '01.06.2023', endRaw: '' }, // недобранная — на экране, но не в расчёте
    { startRaw: '', endRaw: '' }, // только что добавленная пустая строка
  ]);
  assert.deepEqual(rows, [{ start: '2023-03-01', end: '2023-05-10' }]);
});

test('АПК периоды: строка с концом раньше начала в расчёт не попадает', () => {
  // Инлайн-ошибка показывается в самой строке; расчёт при этом не должен
  // получить заведомо некорректный период и отсеивать его уже у себя.
  const rows = periodsFromDraft([
    { startRaw: '10.05.2023', endRaw: '01.03.2023' },
    { startRaw: '01.03.2023', endRaw: '10.05.2023' },
  ]);
  assert.deepEqual(rows, [{ start: '2023-03-01', end: '2023-05-10' }]);
});

test('АПК периоды: основание сохраняется только у списка ч. 5', () => {
  const draft = [
    { type: 'claimant_obstruction_apk', startRaw: '01.06.2023', endRaw: '15.08.2023' },
  ];
  // Список ч. 5 — с основанием: оно проверяется расчётом по каталогу.
  assert.deepEqual(periodsFromDraft(draft, { typed: true }), [
    { type: 'claimant_obstruction_apk', start: '2023-06-01', end: '2023-08-15' },
  ]);
  // Список ч. 2 — без основания вовсе: тип там проставляет сам расчёт
  // (fixedType в chain.js), и посылать своё значение нельзя.
  assert.deepEqual(periodsFromDraft(draft), [{ start: '2023-06-01', end: '2023-08-15' }]);
});

test('АПК периоды: пустой черновик даёт пустой список, а не undefined', () => {
  // Вызывающий код по длине решает, класть ли поле в state.inputs, поэтому
  // форма возврата должна быть массивом всегда.
  assert.deepEqual(periodsFromDraft([]), []);
  assert.deepEqual(periodsFromDraft([{ startRaw: '', endRaw: '' }], { typed: true }), []);
});

// --- Форматирование дат (задача UI.4.1) ---------------------------------------
//
// core/engine/exclusion.js и apk/views.js отдают даты в ISO и трогать их
// нельзя — страница везде говорит ДД.ММ.ГГГГ, поэтому приведение к русскому
// формату сделано на уровне apk/app.js и проверяется на настоящих объектах,
// которые вернул расчёт, а не на выдуманных строках.

test('АПК ошибка расчёта: сообщение ядра о пересечении периодов приведено к ДД.ММ.ГГГГ', () => {
  let message = null;
  try {
    computeEnforcementPresentationApk({
      case_type: 'entry_into_force',
      entry_into_force_date: '2022-06-18',
      suspension_periods: [{ start: '2023-03-01', end: '2023-05-10' }],
      execution_ended_periods: [
        { type: 'withdrawal_by_claimant_apk', start: '2023-05-09', end: '2023-08-15' },
      ],
    });
  } catch (error) {
    message = error.message;
  }
  assert.ok(message, 'пересекающиеся периоды должны были бросить ошибку');
  // Само сообщение ядра — в ISO (проверяем, что тест бьёт по настоящему тексту,
  // а не по собственной догадке о его форме).
  assert.match(message, /\d{4}-\d{2}-\d{2}/);

  const formatted = isoDatesToRu(message);
  assert.match(formatted, /01\.03\.2023/);
  assert.match(formatted, /10\.05\.2023/);
  assert.match(formatted, /09\.05\.2023/);
  assert.match(formatted, /15\.08\.2023/);
  assert.doesNotMatch(formatted, /\d{4}-\d{2}-\d{2}/, 'после форматирования не должно остаться ISO-дат');
});

test('АПК история исключения периодов: итоговая строка на реальной карточке — в ДД.ММ.ГГГГ', () => {
  const term = computeEnforcementPresentationApk({
    case_type: 'entry_into_force',
    entry_into_force_date: '2022-06-18',
    suspension_periods: [{ start: '2023-03-01', end: '2023-05-10' }], // 70 дней
  });
  // term несёт ровно те поля, которые apk/views.js кладёт на карточку
  // (excluded_days/pre_exclusion_deadline/deadline) — используем term как есть,
  // без отдельной сборки карточки, чтобы проверить формат на настоящих данных.
  assert.equal(term.excluded_days, 70);
  assert.equal(term.pre_exclusion_deadline, '2025-06-18');
  assert.equal(term.deadline, '2025-08-27');

  const summary = formatExclusionSummary(term);
  assert.match(summary, /70/);
  assert.match(summary, /18\.06\.2025/);
  assert.match(summary, /27\.08\.2025/);
  assert.doesNotMatch(summary, /\d{4}-\d{2}-\d{2}/, 'итоговая строка не должна содержать ISO-дат');
});

test('АПК история исключения периодов: без периодов формула не выводится (null, а не пустая строка)', () => {
  const term = computeEnforcementPresentationApk({
    case_type: 'entry_into_force',
    entry_into_force_date: '2022-06-18',
  });
  assert.equal(formatExclusionSummary(term), null);
});

// --- apk/ics.js (задача UI.4.1) -----------------------------------------------
//
// Тот же сценарий, что проверялся вручную при разборе отчёта UI.4: двухмесячный
// срок, два TRIGGER до дедлайна. Проверяет, что обёртки над ядром вынесены в
// отдельный файл и работают так же, как раньше работали внутри apk/app.js.

test('АПК .ics: двухмесячный срок (ст. 276) даёт PRODID, UID со своим доменом и два TRIGGER', () => {
  // Карточка узла-срока в форме, которую даёт apk/views.js/monthTermCard;
  // cassation_general_apk экспортируем в реестре (12 из 14 узлов, кроме двух
  // узлов-событий) — тот же сценарий, что проверялся вручную при разборе UI.4.
  const card = {
    id: 'cassation_general_apk',
    kind: 'term',
    title: 'Кассационная жалоба (общая, АПК)',
    deadline: '2025-06-16',
    norm: 'ч. 1 ст. 276 АПК РФ',
    duration: { value: 2, unit: 'month' },
  };
  const view = { cards: [card] };

  const exportable = exportableCards(view);
  assert.equal(exportable.length, 1);
  assert.equal(exportable[0].meta.ics, true);

  const terms = icsTermsFromView(view);
  assert.equal(terms.length, 1);
  assert.equal(terms[0].duration.value, 2);

  const ics = buildICS(terms, { referenceDate: '2025-03-11', now: '2025-03-11' });
  // Строки iCalendar сворачиваются на границе ~75 символов (RFC 5545) —
  // "разворачиваем" перед проверкой содержимого, иначе длинные значения вроде
  // PRODID ломаются посреди слова переносом строки с пробелом.
  const unfolded = ics.replace(/\r\n /g, '');
  assert.match(unfolded, /PRODID:-\/\/gpk-calculator\/\/Процессуальные сроки АПК\/\/RU/);
  assert.match(unfolded, /UID:\d{8}-0-[0-9a-f]+@apk-calculator/);
  const triggers = ics.match(/TRIGGER;VALUE=DATE-TIME:/g) || [];
  assert.equal(triggers.length, 2);
});
