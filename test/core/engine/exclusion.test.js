// Юнит-тесты параметра extendFromRaw механики исключения периода
// (core/engine/exclusion.js, withExclusions) в изоляции: срок синтетический,
// без единого импорта из src/, apk/ или kas/. Поведение без параметра при этом
// закреплено: от него зависит АПК-узел предъявления исполнительного листа.

import test from 'node:test';
import assert from 'node:assert/strict';

import { exclusionEvents, withExclusions } from '../../../core/engine/exclusion.js';
import { computeSimpleTerm } from '../../../core/engine/term.js';

const CONFIG = { norm: 'норма-заглушка', logic: 'логика-заглушка' };

// Шесть месяцев с одной редакцией нормы (форма term из core).
const TERM = {
  id: 'synthetic_six_months',
  title: 'Синтетический шестимесячный срок',
  duration: { value: 6, unit: 'month' },
  anchor: { offset_start: 1 },
  weekend_shift: true,
  logic: 'Шесть месяцев со следующего дня.',
  norm_versions: [{ norm: { primary: 'норма-заглушка' } }],
};

// Последний день срока приходится на воскресенье: 18.07.2025 + 6 месяцев =
// 18.01.2026 (воскресенье), перенос на понедельник 19.01.2026.
const ANCHOR_SHIFTED = '2025-07-18';

// Последний день срока — рабочий (четверг): 11.03.2025 + 6 месяцев = 11.09.2025.
const ANCHOR_PLAIN = '2025-03-11';

// Один период: n календарных дней (end − start = n, как в periodDays).
function periods(n) {
  const end = new Date(Date.UTC(2025, 7, 1 + n)).toISOString().slice(0, 10);
  return [exclusionEvents([{ start: '2025-08-01', end }], { fixedType: 'synthetic' })];
}

test('withExclusions без extendFromRaw отодвигает дедлайн от уже перенесённого дня (прежнее поведение)', () => {
  const term = computeSimpleTerm(TERM, ANCHOR_SHIFTED);
  assert.equal(term.raw_deadline, '2026-01-18');
  assert.equal(term.deadline, '2026-01-19');
  for (const config of [CONFIG, { ...CONFIG, extendFromRaw: false }]) {
    const result = withExclusions(term, periods(10), config);
    assert.equal(result.pre_exclusion_deadline, '2026-01-19');
    assert.equal(result.raw_deadline, '2026-01-29'); // 19.01.2026 + 10 дней
    assert.equal(result.deadline, '2026-01-29'); // четверг, рабочий день
    assert.equal(result.shifted, false);
    assert.equal(result.excluded_days, 10);
  }
});

test('withExclusions с extendFromRaw отодвигает дедлайн от последнего дня срока до переноса', () => {
  const term = computeSimpleTerm(TERM, ANCHOR_SHIFTED);
  const result = withExclusions(term, periods(10), { ...CONFIG, extendFromRaw: true });
  assert.equal(result.pre_exclusion_deadline, '2026-01-19'); // дедлайн до исключения — с переносом
  assert.equal(result.raw_deadline, '2026-01-28'); // 18.01.2026 + 10 дней
  assert.equal(result.deadline, '2026-01-28'); // среда, рабочий день
  assert.equal(result.shifted, false);
  assert.equal(result.excluded_days, 10);
  assert.equal(result.exclusion_norm, 'норма-заглушка');
  assert.equal(result.exclusion_logic, 'логика-заглушка');
});

test('withExclusions с extendFromRaw: итоговый последний день на нерабочем дне переносится', () => {
  const term = computeSimpleTerm(TERM, ANCHOR_SHIFTED);
  const result = withExclusions(term, periods(6), { ...CONFIG, extendFromRaw: true });
  assert.equal(result.raw_deadline, '2026-01-24'); // 18.01.2026 + 6 дней — суббота
  assert.equal(result.deadline, '2026-01-26'); // понедельник
  assert.equal(result.shifted, true);
});

test('withExclusions с extendFromRaw: срок без переноса считается так же, как без параметра', () => {
  const term = computeSimpleTerm(TERM, ANCHOR_PLAIN);
  assert.equal(term.raw_deadline, term.deadline);
  const plain = withExclusions(term, periods(10), CONFIG);
  const fromRaw = withExclusions(term, periods(10), { ...CONFIG, extendFromRaw: true });
  assert.deepEqual(fromRaw, plain);
  assert.equal(fromRaw.raw_deadline, '2025-09-21'); // воскресенье
  assert.equal(fromRaw.deadline, '2025-09-22'); // понедельник
  assert.equal(fromRaw.shifted, true);
});

test('withExclusions с extendFromRaw: исключённых дней нет — результат не трогается', () => {
  const term = computeSimpleTerm(TERM, ANCHOR_SHIFTED);
  assert.equal(withExclusions(term, periods(0), { ...CONFIG, extendFromRaw: true }), term);
  assert.equal(withExclusions(term, [], { ...CONFIG, extendFromRaw: true }), term);
});

test('withExclusions с extendFromRaw: без raw_deadline в результате — ошибка', () => {
  assert.throws(
    () => withExclusions({ deadline: '2026-01-19' }, periods(10), { ...CONFIG, extendFromRaw: true }),
    /raw_deadline/,
  );
});
