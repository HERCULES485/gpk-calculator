// Тесты узлов модуля КАС: ст. 298 ч. 1 — общий месячный срок подачи
// апелляционных жалобы, представления (задача КАС-1).

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeAppealGeneralKas, APPEAL_GENERAL_KAS } from '../kas/chain.js';

test('appeal_general_kas считается от decision_final_form_date_kas (обычная дата, без переноса)', () => {
  const term = computeAppealGeneralKas({ decision_final_form_date_kas: '2025-03-11' });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11'); // 11.04.2025 — пятница, рабочий день
  assert.equal(term.shifted, false);
});

test('appeal_general_kas: нет соответствующего числа (ч. 1 ст. 93 КАС РФ) — 31 января -> последний день февраля', () => {
  const term = computeAppealGeneralKas({ decision_final_form_date_kas: '2025-01-31' });
  // В феврале 2025 (невисокосный) нет 31-го числа — срок истекает в последний
  // день месяца.
  assert.equal(term.raw_deadline, '2025-02-28');
  assert.equal(term.deadline, '2025-02-28');
  assert.equal(term.shifted, false);
});

test('appeal_general_kas: перенос с выходного (ч. 2 ст. 93 КАС РФ)', () => {
  const term = computeAppealGeneralKas({ decision_final_form_date_kas: '2025-03-05' });
  // 05.03.2025 + 1 месяц = 05.04.2025 (суббота) -> перенос на 07.04.2025 (понедельник).
  assert.equal(term.raw_deadline, '2025-04-05');
  assert.equal(term.deadline, '2025-04-07');
  assert.equal(term.shifted, true);
});

test('appeal_general_kas: перенос через новогодние каникулы (ч. 2 ст. 93 КАС РФ)', () => {
  const term = computeAppealGeneralKas({ decision_final_form_date_kas: '2025-12-08' });
  // 08.12.2025 + 1 месяц = 08.01.2026 (нерабочий праздничный день); 09.01.2026 —
  // выходной по производственному календарю, 10–11.01.2026 — суббота и
  // воскресенье -> перенос на 12.01.2026 (понедельник).
  assert.equal(term.raw_deadline, '2026-01-08');
  assert.equal(term.deadline, '2026-01-12');
  assert.equal(term.shifted, true);
});

test('appeal_general_kas: без decision_final_form_date_kas — ошибка', () => {
  assert.throws(() => computeAppealGeneralKas({}), /decision_final_form_date_kas/);
});

test('appeal_general_kas: норма и объём задачи КАС-1 — без restoration_norm и без ics', () => {
  const term = computeAppealGeneralKas({ decision_final_form_date_kas: '2025-03-11' });
  assert.equal(term.id, 'appeal_general_kas');
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
  assert.equal(term.norm.primary, 'ч. 1 ст. 298 КАС РФ');
  assert.deepEqual(term.norm.calculation, ['ч. 3 ст. 92', 'ч. 1, 2 ст. 93 КАС РФ']);
  assert.equal(term.norm.clarification, 'п. 6 Постановления Пленума ВС РФ от 11.06.2020 № 5');
  assert.equal(APPEAL_GENERAL_KAS.restoration_norm, undefined);
  assert.equal(APPEAL_GENERAL_KAS.ics, undefined);
});
