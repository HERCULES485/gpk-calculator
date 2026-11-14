// Тесты узлов модуля КАС: ст. 298 ч. 1 — общий месячный срок подачи
// апелляционных жалобы, представления (задача КАС-1).

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeAppealGeneralKas,
  APPEAL_GENERAL_KAS,
  computePrivateComplaintGeneralKas,
  PRIVATE_COMPLAINT_GENERAL_KAS,
  computePrivateComplaintAdminSupervisionKas,
  PRIVATE_COMPLAINT_ADMIN_SUPERVISION_KAS,
} from '../kas/chain.js';

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

// --- Задача КАС-2: ст. 314 ч. 1 — общий срок подачи частной жалобы,
// представления прокурора на определение суда первой инстанции (15 рабочих
// дней) ------------------------------------------------------------------------

test('private_complaint_general_kas считается от ruling_final_form_date_kas (обычная дата)', () => {
  const term = computePrivateComplaintGeneralKas({ ruling_final_form_date_kas: '2025-03-11' });
  assert.equal(term.anchor, '2025-03-11');
  // 11.03.2025 — вторник; отсчёт начинается со среды 12.03.2025, нерабочих
  // праздничных дней внутри периода нет, 15-й рабочий день — вторник 01.04.2025.
  assert.equal(term.first_working_day, '2025-03-12');
  assert.equal(term.raw_deadline, '2025-04-01');
  assert.equal(term.deadline, '2025-04-01');
  assert.equal(term.shifted, false);
});

test('private_complaint_general_kas: пятница — отсчёт с понедельника; майские нерабочие дни в счёт не входят', () => {
  const term = computePrivateComplaintGeneralKas({ ruling_final_form_date_kas: '2025-04-18' });
  // 18.04.2025 — пятница; 19–20.04 выходные, отсчёт начинается с понедельника
  // 21.04.2025. Нерабочие 01–04.05 и 08–11.05.2025 в счёт не входят:
  // 21–25.04 (5), 28–30.04 (8), 05–07.05 (11), 12–15.05 (15).
  assert.equal(term.first_working_day, '2025-04-21');
  assert.equal(term.deadline, '2025-05-15');
  assert.equal(term.shifted, false);
});

test('private_complaint_general_kas: июньские праздничные дни внутри периода', () => {
  const term = computePrivateComplaintGeneralKas({ ruling_final_form_date_kas: '2025-06-10' });
  // Отсчёт со среды 11.06.2025; 12–15.06.2025 нерабочие. 11.06 (1), 16–20.06 (6),
  // 23–27.06 (11), 30.06 (12), 01.07 (13), 02.07 (14), 03.07 (15).
  assert.equal(term.first_working_day, '2025-06-11');
  assert.equal(term.deadline, '2025-07-03');
});

test('private_complaint_general_kas: перенос через новогодние каникулы', () => {
  const term = computePrivateComplaintGeneralKas({ ruling_final_form_date_kas: '2025-12-26' });
  // 26.12.2025 — пятница; отсчёт с понедельника 29.12.2025. Рабочие 29.12 и
  // 30.12 (2); 31.12.2025–11.01.2026 нерабочие; далее 12–16.01 (7), 19–23.01 (12),
  // 26–28.01 (15).
  assert.equal(term.first_working_day, '2025-12-29');
  assert.equal(term.deadline, '2026-01-28');
  assert.equal(term.shifted, false);
});

test('private_complaint_general_kas: без ruling_final_form_date_kas — ошибка', () => {
  assert.throws(() => computePrivateComplaintGeneralKas({}), /ruling_final_form_date_kas/);
});

test('private_complaint_general_kas: норма и объём задачи КАС-2 — 15 рабочих дней, без weekend_shift, restoration_norm и ics', () => {
  const term = computePrivateComplaintGeneralKas({ ruling_final_form_date_kas: '2025-03-11' });
  assert.equal(term.id, 'private_complaint_general_kas');
  assert.deepEqual(term.duration, { value: 15, unit: 'working_day' });
  assert.equal(term.norm.primary, 'ч. 1 ст. 314 КАС РФ');
  assert.deepEqual(term.norm.calculation, ['ч. 2, 3 ст. 92 КАС РФ']);
  assert.equal(
    term.norm.clarification,
    'п. 6, 45 Постановления Пленума ВС РФ от 11.06.2020 № 5; ' +
      'п. 63 Постановления Пленума ВС РФ от 27.09.2016 № 36',
  );
  assert.equal(PRIVATE_COMPLAINT_GENERAL_KAS.weekend_shift, undefined);
  assert.equal(PRIVATE_COMPLAINT_GENERAL_KAS.restoration_norm, undefined);
  assert.equal(PRIVATE_COMPLAINT_GENERAL_KAS.ics, undefined);
});

// --- Задача КАС-3: ч. 4 ст. 314 — срок подачи частной жалобы, представления
// прокурора на определение суда по административному делу об административном
// надзоре (10 рабочих дней) -----------------------------------------------------

test('private_complaint_admin_supervision_kas считается от ruling_final_form_date_kas (обычная дата)', () => {
  const term = computePrivateComplaintAdminSupervisionKas({
    ruling_final_form_date_kas: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  // 11.03.2025 — вторник; отсчёт начинается со среды 12.03.2025, нерабочих
  // праздничных дней внутри периода нет: 12–14.03 (3), 17–21.03 (8), 24.03 (9),
  // 25.03 (10) — вторник 25.03.2025.
  assert.equal(term.first_working_day, '2025-03-12');
  assert.equal(term.raw_deadline, '2025-03-25');
  assert.equal(term.deadline, '2025-03-25');
  assert.equal(term.shifted, false);
});

test('private_complaint_admin_supervision_kas: майские нерабочие дни в счёт не входят', () => {
  const term = computePrivateComplaintAdminSupervisionKas({
    ruling_final_form_date_kas: '2025-04-29',
  });
  // Отсчёт со среды 30.04.2025 (1); 01–04.05 нерабочие; 05–07.05 (4); 08–11.05
  // нерабочие; 12–16.05 (9); 19.05 (10) — понедельник 19.05.2025.
  assert.equal(term.first_working_day, '2025-04-30');
  assert.equal(term.deadline, '2025-05-19');
  assert.equal(term.shifted, false);
});

test('private_complaint_admin_supervision_kas: июньские праздничные дни внутри периода', () => {
  const term = computePrivateComplaintAdminSupervisionKas({
    ruling_final_form_date_kas: '2025-06-10',
  });
  // Отсчёт со среды 11.06.2025 (1); 12–15.06.2025 нерабочие; 16–20.06 (6);
  // 23–26.06 (10) — четверг 26.06.2025.
  assert.equal(term.first_working_day, '2025-06-11');
  assert.equal(term.deadline, '2025-06-26');
});

test('private_complaint_admin_supervision_kas: определение накануне новогодних каникул — отсчёт с 12.01', () => {
  const term = computePrivateComplaintAdminSupervisionKas({
    ruling_final_form_date_kas: '2025-12-30',
  });
  // 30.12.2025 — вторник; день, следующий за ним (31.12.2025), нерабочий, как и
  // период до 11.01.2026 включительно, поэтому первый рабочий день — понедельник
  // 12.01.2026. 12–16.01 (5), 19–23.01 (10) — пятница 23.01.2026.
  assert.equal(term.first_working_day, '2026-01-12');
  assert.equal(term.deadline, '2026-01-23');
  assert.equal(term.shifted, false);
});

test('private_complaint_admin_supervision_kas: без ruling_final_form_date_kas — ошибка', () => {
  assert.throws(
    () => computePrivateComplaintAdminSupervisionKas({}),
    /ruling_final_form_date_kas/,
  );
});

test('private_complaint_admin_supervision_kas: норма и объём задачи КАС-3 — 10 рабочих дней, без weekend_shift, restoration_norm и ics', () => {
  const inputs = { ruling_final_form_date_kas: '2025-03-11' };
  const term = computePrivateComplaintAdminSupervisionKas(inputs);
  assert.equal(term.id, 'private_complaint_admin_supervision_kas');
  assert.deepEqual(term.duration, { value: 10, unit: 'working_day' });
  assert.equal(term.norm.primary, 'ч. 4 ст. 314 КАС РФ');
  assert.deepEqual(term.norm.calculation, ['ч. 2, 3 ст. 92 КАС РФ']);
  assert.equal(
    term.norm.clarification,
    'п. 6, 16 Постановления Пленума ВС РФ от 11.06.2020 № 5; ' +
      'п. 63 Постановления Пленума ВС РФ от 27.09.2016 № 36',
  );
  assert.equal(PRIVATE_COMPLAINT_ADMIN_SUPERVISION_KAS.weekend_shift, undefined);
  assert.equal(PRIVATE_COMPLAINT_ADMIN_SUPERVISION_KAS.restoration_norm, undefined);
  assert.equal(PRIVATE_COMPLAINT_ADMIN_SUPERVISION_KAS.ics, undefined);
  // Тот же день составления определения: срок по ч. 4 ст. 314 истекает раньше
  // общего срока по ч. 1 ст. 314 (10 рабочих дней против 15).
  assert.equal(computePrivateComplaintGeneralKas(inputs).deadline, '2025-04-01');
  assert.equal(term.deadline, '2025-03-25');
});
