// Тест узла ст. 259 АПК РФ, ч. 1 (задача 1b аудита apk/259). Только общий
// месячный срок — восстановление (ч. 2 ст. 259) вне объёма этой задачи.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeAppealGeneralApk, APPEAL_GENERAL_APK } from '../apk/chain.js';

test('appeal_general_apk считается от decision_full_text_date (обычная дата, без переноса)', () => {
  const term = computeAppealGeneralApk({ decision_full_text_date: '2025-03-11' });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11'); // 11.04.2025 — пятница, рабочий день
  assert.equal(term.shifted, false);
});

test('appeal_general_apk: правило "нет такого числа" (ч. 2 ст. 114 АПК РФ) — 31 января -> последний день февраля', () => {
  const term = computeAppealGeneralApk({ decision_full_text_date: '2025-01-31' });
  // В феврале 2025 (невисокосный) нет 31-го числа — срок истекает в последний
  // день месяца.
  assert.equal(term.raw_deadline, '2025-02-28');
  assert.equal(term.deadline, '2025-02-28');
  assert.equal(term.shifted, false);
});

test('appeal_general_apk: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeAppealGeneralApk({ decision_full_text_date: '2025-03-05' });
  // 05.03.2025 + 1 месяц = 05.04.2025 (суббота) -> перенос на 07.04.2025 (понедельник).
  assert.equal(term.raw_deadline, '2025-04-05');
  assert.equal(term.deadline, '2025-04-07');
  assert.equal(term.shifted, true);
});

test('appeal_general_apk: без decision_full_text_date — ошибка', () => {
  assert.throws(() => computeAppealGeneralApk({}), /decision_full_text_date/);
});

test('appeal_general_apk: объём задачи 1b — без restoration_norm и без ics', () => {
  assert.equal(APPEAL_GENERAL_APK.restoration_norm, undefined);
  assert.equal(APPEAL_GENERAL_APK.ics, undefined);
});
