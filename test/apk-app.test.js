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

import { periodDaysBetween, periodRowError, periodsFromDraft } from '../apk/app.js';

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
