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
  computeAppealAdminSupervisionKas,
  APPEAL_ADMIN_SUPERVISION_KAS,
  computeAppealMunicipalDissolutionKas,
  APPEAL_MUNICIPAL_DISSOLUTION_KAS,
  computeClaimFilingGeneralKas,
  CLAIM_FILING_GENERAL_KAS,
  computeClaimFilingBailiffKas,
  CLAIM_FILING_BAILIFF_KAS,
  computeCassationGeneralKas,
  CASSATION_GENERAL_KAS,
  computeCassationRestorationCapKas,
  computeSupervisionGeneralKas,
  SUPERVISION_GENERAL_KAS,
  computeSupervisionRestorationCapKas,
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

// --- Задача КАС-4: ч. 5 ст. 298 — срок подачи апелляционных жалобы,
// представления на решение суда по административному делу об административном
// надзоре (10 рабочих дней) ------------------------------------------------------

test('appeal_admin_supervision_kas считается от decision_final_form_date_kas (обычная дата)', () => {
  const term = computeAppealAdminSupervisionKas({ decision_final_form_date_kas: '2025-09-02' });
  assert.equal(term.anchor, '2025-09-02');
  // 02.09.2025 — вторник; отсчёт начинается со среды 03.09.2025, нерабочих
  // праздничных дней внутри периода нет: 03–05.09 (3), 08–12.09 (8), 15.09 (9),
  // 16.09 (10) — вторник 16.09.2025.
  assert.equal(term.first_working_day, '2025-09-03');
  assert.equal(term.raw_deadline, '2025-09-16');
  assert.equal(term.deadline, '2025-09-16');
  assert.equal(term.shifted, false);
});

test('appeal_admin_supervision_kas: рабочая суббота по переносу — первый день отсчёта', () => {
  const term = computeAppealAdminSupervisionKas({ decision_final_form_date_kas: '2025-10-31' });
  // 31.10.2025 — пятница; суббота 01.11.2025 рабочая по переносу с 03.11.2025,
  // поэтому отсчёт начинается с неё (1). 03.11 перенесён на выходной, 04.11 —
  // праздник; далее 05–07.11 (4), 10–14.11 (9), 17.11 (10) — понедельник 17.11.2025.
  assert.equal(term.first_working_day, '2025-11-01');
  assert.equal(term.deadline, '2025-11-17');
  assert.equal(term.shifted, false);
});

test('appeal_admin_supervision_kas: июньский праздничный день внутри периода', () => {
  const term = computeAppealAdminSupervisionKas({ decision_final_form_date_kas: '2026-06-09' });
  // 09.06.2026 — вторник; отсчёт со среды 10.06.2026: 10–11.06 (2); 12.06 —
  // праздник, 13–14.06 выходные; 15–19.06 (7), 22–24.06 (10) — среда 24.06.2026.
  assert.equal(term.first_working_day, '2026-06-10');
  assert.equal(term.deadline, '2026-06-24');
});

test('appeal_admin_supervision_kas: решение перед новогодними каникулами — счёт продолжается с 12.01', () => {
  const term = computeAppealAdminSupervisionKas({ decision_final_form_date_kas: '2025-12-24' });
  // 24.12.2025 — среда; отсчёт с четверга 25.12.2025: 25–26.12 (2), 29–30.12 (4);
  // 31.12.2025 перенесён на выходной, 01–11.01.2026 нерабочие; 12–16.01 (9),
  // 19.01 (10) — понедельник 19.01.2026.
  assert.equal(term.first_working_day, '2025-12-25');
  assert.equal(term.deadline, '2026-01-19');
  assert.equal(term.shifted, false);
});

test('appeal_admin_supervision_kas: без decision_final_form_date_kas — ошибка', () => {
  assert.throws(
    () => computeAppealAdminSupervisionKas({}),
    /decision_final_form_date_kas/,
  );
});

test('appeal_admin_supervision_kas: норма и объём задачи КАС-4 — 10 рабочих дней, без weekend_shift, restoration_norm и ics', () => {
  const inputs = { decision_final_form_date_kas: '2025-09-02' };
  const term = computeAppealAdminSupervisionKas(inputs);
  assert.equal(term.id, 'appeal_admin_supervision_kas');
  assert.deepEqual(term.duration, { value: 10, unit: 'working_day' });
  assert.equal(term.norm.primary, 'ч. 5 ст. 298 КАС РФ');
  assert.deepEqual(term.norm.calculation, ['ч. 2, 3 ст. 92 КАС РФ']);
  assert.equal(
    term.norm.clarification,
    'п. 6, 16 Постановления Пленума ВС РФ от 11.06.2020 № 5',
  );
  assert.equal(APPEAL_ADMIN_SUPERVISION_KAS.weekend_shift, undefined);
  assert.equal(APPEAL_ADMIN_SUPERVISION_KAS.restoration_norm, undefined);
  assert.equal(APPEAL_ADMIN_SUPERVISION_KAS.ics, undefined);
  // Тот же день принятия решения: срок по ч. 5 ст. 298 истекает раньше общего
  // месячного срока по ч. 1 ст. 298 (10 рабочих дней против месяца).
  assert.equal(computeAppealGeneralKas(inputs).deadline, '2025-10-02');
  assert.equal(term.deadline, '2025-09-16');
});

// --- Задача КАС-5: ч. 2 ст. 298 — срок подачи апелляционных жалобы,
// представления на решение суда по делу о роспуске представительного органа,
// об отрешении или удалении в отставку главы муниципального образования
// (10 рабочих дней) ----------------------------------------------------------------

test('appeal_municipal_dissolution_kas считается от decision_final_form_date_kas (обычная дата)', () => {
  const term = computeAppealMunicipalDissolutionKas({ decision_final_form_date_kas: '2025-03-18' });
  assert.equal(term.anchor, '2025-03-18');
  // 18.03.2025 — вторник; отсчёт начинается со среды 19.03.2025, нерабочих
  // праздничных дней внутри периода нет: 19–21.03 (3), 24–28.03 (8), 31.03 (9),
  // 01.04 (10) — вторник 01.04.2025.
  assert.equal(term.first_working_day, '2025-03-19');
  assert.equal(term.raw_deadline, '2025-04-01');
  assert.equal(term.deadline, '2025-04-01');
  assert.equal(term.shifted, false);
});

test('appeal_municipal_dissolution_kas: пятница — отсчёт с понедельника; майские нерабочие дни в счёт не входят', () => {
  const term = computeAppealMunicipalDissolutionKas({ decision_final_form_date_kas: '2025-04-25' });
  // 25.04.2025 — пятница; 26–27.04 выходные, отсчёт с понедельника 28.04.2025:
  // 28–30.04 (3); 01–04.05 нерабочие; 05–07.05 (6); 08–11.05 нерабочие;
  // 12–15.05 (10) — четверг 15.05.2025.
  assert.equal(term.first_working_day, '2025-04-28');
  assert.equal(term.deadline, '2025-05-15');
  assert.equal(term.shifted, false);
});

test('appeal_municipal_dissolution_kas: июньские праздничные дни внутри периода', () => {
  const term = computeAppealMunicipalDissolutionKas({ decision_final_form_date_kas: '2025-06-06' });
  // 06.06.2025 — пятница; отсчёт с понедельника 09.06.2025: 09–11.06 (3);
  // 12.06 — праздник, 13.06 перенесён на выходной, 14–15.06 выходные;
  // 16–20.06 (8), 23–24.06 (10) — вторник 24.06.2025.
  assert.equal(term.first_working_day, '2025-06-09');
  assert.equal(term.deadline, '2025-06-24');
});

test('appeal_municipal_dissolution_kas: праздничный день 4 ноября внутри периода', () => {
  const term = computeAppealMunicipalDissolutionKas({ decision_final_form_date_kas: '2026-10-30' });
  // 30.10.2026 — пятница; отсчёт с понедельника 02.11.2026: 02–03.11 (2);
  // 04.11 — праздник; 05–06.11 (4), 09–13.11 (9), 16.11 (10) — понедельник 16.11.2026.
  assert.equal(term.first_working_day, '2026-11-02');
  assert.equal(term.deadline, '2026-11-16');
  assert.equal(term.shifted, false);
});

test('appeal_municipal_dissolution_kas: без decision_final_form_date_kas — ошибка', () => {
  assert.throws(
    () => computeAppealMunicipalDissolutionKas({}),
    /decision_final_form_date_kas/,
  );
});

test('appeal_municipal_dissolution_kas: норма и объём задачи КАС-5 — 10 рабочих дней, без weekend_shift, restoration_norm и ics', () => {
  const inputs = { decision_final_form_date_kas: '2025-03-18' };
  const term = computeAppealMunicipalDissolutionKas(inputs);
  assert.equal(term.id, 'appeal_municipal_dissolution_kas');
  assert.deepEqual(term.duration, { value: 10, unit: 'working_day' });
  assert.equal(term.norm.primary, 'ч. 2 ст. 298 КАС РФ');
  assert.deepEqual(term.norm.calculation, ['ч. 2, 3 ст. 92 КАС РФ']);
  assert.equal(
    term.norm.clarification,
    'п. 6, 16 Постановления Пленума ВС РФ от 11.06.2020 № 5',
  );
  assert.equal(APPEAL_MUNICIPAL_DISSOLUTION_KAS.weekend_shift, undefined);
  assert.equal(APPEAL_MUNICIPAL_DISSOLUTION_KAS.restoration_norm, undefined);
  assert.equal(APPEAL_MUNICIPAL_DISSOLUTION_KAS.ics, undefined);
  // Тот же день составления решения: срок по ч. 2 ст. 298 истекает раньше общего
  // месячного срока по ч. 1 ст. 298 (10 рабочих дней против месяца).
  assert.equal(computeAppealGeneralKas(inputs).deadline, '2025-04-18');
  assert.equal(term.deadline, '2025-04-01');
});

// --- Задача КАС-6: ч. 1 ст. 219 — общий срок обращения с административным
// исковым заявлением в суд (три месяца со дня, когда лицу стало известно о
// нарушении его прав) ----------------------------------------------------------

test('claim_filing_general_kas считается от violation_awareness_date_kas (обычная дата, без переноса)', () => {
  const term = computeClaimFilingGeneralKas({ violation_awareness_date_kas: '2025-03-11' });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-06-11');
  assert.equal(term.deadline, '2025-06-11'); // 11.06.2025 — среда, рабочий день
  assert.equal(term.shifted, false);
});

test('claim_filing_general_kas: нет соответствующего числа (ч. 1 ст. 93 КАС РФ) — 30 ноября -> последний день февраля', () => {
  const term = computeClaimFilingGeneralKas({ violation_awareness_date_kas: '2024-11-30' });
  // 30.11.2024 + 3 месяца: в феврале 2025 (невисокосный) нет 30-го числа — срок
  // истекает в последний день месяца, 28.02.2025 (пятница, рабочий день).
  assert.equal(term.raw_deadline, '2025-02-28');
  assert.equal(term.deadline, '2025-02-28');
  assert.equal(term.shifted, false);
});

test('claim_filing_general_kas: нет соответствующего числа и последний день нерабочий — перенос (ч. 1, 2 ст. 93 КАС РФ)', () => {
  const term = computeClaimFilingGeneralKas({ violation_awareness_date_kas: '2025-11-30' });
  // 30.11.2025 + 3 месяца: в феврале 2026 нет 30-го числа -> 28.02.2026 (суббота)
  // -> перенос на 02.03.2026 (понедельник).
  assert.equal(term.raw_deadline, '2026-02-28');
  assert.equal(term.deadline, '2026-03-02');
  assert.equal(term.shifted, true);
});

test('claim_filing_general_kas: перенос с выходного (ч. 2 ст. 93 КАС РФ); якорь — нерабочий день', () => {
  const term = computeClaimFilingGeneralKas({ violation_awareness_date_kas: '2025-05-31' });
  // 31.05.2025 (суббота) + 3 месяца = 31.08.2025 (воскресенье) -> перенос на
  // 01.09.2025 (понедельник). Якорь может быть нерабочим днём: срок идёт со
  // следующего дня.
  assert.equal(term.raw_deadline, '2025-08-31');
  assert.equal(term.deadline, '2025-09-01');
  assert.equal(term.shifted, true);
});

test('claim_filing_general_kas: перенос через праздничный день и перенесённый выходной (ч. 2 ст. 93 КАС РФ)', () => {
  const term = computeClaimFilingGeneralKas({ violation_awareness_date_kas: '2025-03-12' });
  // 12.03.2025 + 3 месяца = 12.06.2025 (День России, нерабочий); 13.06.2025 —
  // выходной по производственному календарю, 14–15.06 — суббота и воскресенье
  // -> перенос на 16.06.2025 (понедельник).
  assert.equal(term.raw_deadline, '2025-06-12');
  assert.equal(term.deadline, '2025-06-16');
  assert.equal(term.shifted, true);
});

test('claim_filing_general_kas: без violation_awareness_date_kas — ошибка', () => {
  assert.throws(() => computeClaimFilingGeneralKas({}), /violation_awareness_date_kas/);
});

test('claim_filing_general_kas: норма и объём задачи КАС-6 — три месяца, weekend_shift, без restoration_norm и ics', () => {
  const term = computeClaimFilingGeneralKas({ violation_awareness_date_kas: '2025-03-11' });
  assert.equal(term.id, 'claim_filing_general_kas');
  assert.deepEqual(term.duration, { value: 3, unit: 'month' });
  assert.equal(term.norm.primary, 'ч. 1 ст. 219 КАС РФ');
  assert.deepEqual(term.norm.calculation, ['ч. 3 ст. 92', 'ч. 1, 2 ст. 93 КАС РФ']);
  assert.equal(term.norm.clarification, 'п. 16 Постановления Пленума ВС РФ от 28.06.2022 № 21');
  assert.equal(CLAIM_FILING_GENERAL_KAS.weekend_shift, true);
  assert.equal(CLAIM_FILING_GENERAL_KAS.restoration_norm, undefined);
  assert.equal(CLAIM_FILING_GENERAL_KAS.ics, undefined);
});

// --- Задача КАС-7: ч. 3 ст. 219 — срок обращения с административным исковым
// заявлением о признании незаконными решений ФССП, решений, действий
// (бездействия) судебного пристава-исполнителя (10 рабочих дней со дня, когда
// лицу стало известно о нарушении его прав) ------------------------------------

test('claim_filing_bailiff_kas считается от violation_awareness_date_kas (обычная дата)', () => {
  const term = computeClaimFilingBailiffKas({ violation_awareness_date_kas: '2025-09-02' });
  assert.equal(term.anchor, '2025-09-02');
  // 02.09.2025 — вторник; отсчёт начинается со среды 03.09.2025, нерабочих
  // праздничных дней внутри периода нет: 03–05.09 (3), 08–12.09 (8), 15.09 (9),
  // 16.09 (10) — вторник 16.09.2025.
  assert.equal(term.first_working_day, '2025-09-03');
  assert.equal(term.raw_deadline, '2025-09-16');
  assert.equal(term.deadline, '2025-09-16');
  assert.equal(term.shifted, false);
});

test('claim_filing_bailiff_kas: стало известно в субботу — отсчёт с понедельника', () => {
  const term = computeClaimFilingBailiffKas({ violation_awareness_date_kas: '2025-09-06' });
  // 06.09.2025 — суббота; 07.09 — воскресенье, отсчёт начинается с понедельника
  // 08.09.2025: 08–12.09 (5), 15–19.09 (10) — пятница 19.09.2025.
  assert.equal(term.first_working_day, '2025-09-08');
  assert.equal(term.deadline, '2025-09-19');
  assert.equal(term.shifted, false);
});

test('claim_filing_bailiff_kas: майские нерабочие дни в счёт не входят', () => {
  const term = computeClaimFilingBailiffKas({ violation_awareness_date_kas: '2025-04-29' });
  // 29.04.2025 — вторник; отсчёт со среды 30.04.2025 (1); 01–04.05 нерабочие;
  // 05–07.05 (4); 08–11.05 нерабочие; 12–16.05 (9); 19.05 (10) — понедельник
  // 19.05.2025.
  assert.equal(term.first_working_day, '2025-04-30');
  assert.equal(term.deadline, '2025-05-19');
});

test('claim_filing_bailiff_kas: новогодние дни и перенесённый выходной 31.12.2025 внутри периода', () => {
  const term = computeClaimFilingBailiffKas({ violation_awareness_date_kas: '2025-12-24' });
  // 24.12.2025 — среда; отсчёт с 25.12.2025: 25–26.12 (2), 29–30.12 (4);
  // 31.12.2025 — выходной (перенос), 01–11.01.2026 нерабочие; 12–16.01 (9),
  // 19.01 (10) — понедельник 19.01.2026.
  assert.equal(term.first_working_day, '2025-12-25');
  assert.equal(term.deadline, '2026-01-19');
  assert.equal(term.shifted, false);
});

test('claim_filing_bailiff_kas: без violation_awareness_date_kas — ошибка', () => {
  assert.throws(() => computeClaimFilingBailiffKas({}), /violation_awareness_date_kas/);
});

test('claim_filing_bailiff_kas: норма и объём задачи КАС-7 — 10 рабочих дней, без weekend_shift, restoration_norm и ics', () => {
  const inputs = { violation_awareness_date_kas: '2025-09-02' };
  const term = computeClaimFilingBailiffKas(inputs);
  assert.equal(term.id, 'claim_filing_bailiff_kas');
  assert.deepEqual(term.duration, { value: 10, unit: 'working_day' });
  assert.equal(term.norm.primary, 'ч. 3 ст. 219 КАС РФ');
  assert.deepEqual(term.norm.calculation, ['ч. 2, 3 ст. 92 КАС РФ']);
  assert.equal(term.norm.clarification, 'п. 16 Постановления Пленума ВС РФ от 28.06.2022 № 21');
  assert.equal(CLAIM_FILING_BAILIFF_KAS.weekend_shift, undefined);
  assert.equal(CLAIM_FILING_BAILIFF_KAS.restoration_norm, undefined);
  assert.equal(CLAIM_FILING_BAILIFF_KAS.ics, undefined);
  // Тот же день, когда стало известно: срок по ч. 3 ст. 219 истекает раньше
  // общего трёхмесячного срока по ч. 1 ст. 219 (10 рабочих дней против 3 месяцев).
  assert.equal(computeClaimFilingGeneralKas(inputs).deadline, '2025-12-02');
  assert.equal(term.deadline, '2025-09-16');
});

// --- Задача КАС-8: ч. 2 ст. 318 — срок подачи кассационных жалобы, представления
// (шесть месяцев со дня принятия определения суда апелляционной инстанции) ----------

test('cassation_general_kas считается от appellate_ruling_date_kas (обычная дата, без переноса)', () => {
  const term = computeCassationGeneralKas({ appellate_ruling_date_kas: '2025-03-11' });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-09-11');
  assert.equal(term.deadline, '2025-09-11'); // 11.09.2025 — четверг, рабочий день
  assert.equal(term.shifted, false);
});

test('cassation_general_kas: в последнем месяце нет соответствующего числа — последний день месяца (високосный февраль)', () => {
  const term = computeCassationGeneralKas({ appellate_ruling_date_kas: '2023-08-31' });
  // 31.08.2023 + 6 месяцев: в феврале 2024 года нет 31-го числа, срок истекает в
  // последний день месяца — 29.02.2024 (четверг, рабочий день), переноса нет.
  assert.equal(term.raw_deadline, '2024-02-29');
  assert.equal(term.deadline, '2024-02-29');
  assert.equal(term.shifted, false);
});

test('cassation_general_kas: последний день — праздник 12 июня, перенос на понедельник', () => {
  const term = computeCassationGeneralKas({ appellate_ruling_date_kas: '2025-12-12' });
  // 12.12.2025 + 6 месяцев = 12.06.2026 (пятница, День России — нерабочий);
  // 13–14.06 — суббота и воскресенье -> перенос на 15.06.2026 (понедельник).
  assert.equal(term.raw_deadline, '2026-06-12');
  assert.equal(term.deadline, '2026-06-15');
  assert.equal(term.shifted, true);
});

test('cassation_general_kas: последний день — воскресенье, перенос на понедельник', () => {
  const term = computeCassationGeneralKas({ appellate_ruling_date_kas: '2025-07-18' });
  // 18.07.2025 + 6 месяцев = 18.01.2026 — воскресенье -> перенос на 19.01.2026
  // (понедельник, рабочий день).
  assert.equal(term.raw_deadline, '2026-01-18');
  assert.equal(term.deadline, '2026-01-19');
  assert.equal(term.shifted, true);
});

test('cassation_general_kas: без appellate_ruling_date_kas — ошибка', () => {
  assert.throws(() => computeCassationGeneralKas({}), /appellate_ruling_date_kas/);
});

test('cassation_general_kas: норма и объём задачи КАС-8 — шесть месяцев, weekend_shift, без restoration_norm и ics', () => {
  const term = computeCassationGeneralKas({ appellate_ruling_date_kas: '2025-03-11' });
  assert.equal(term.id, 'cassation_general_kas');
  assert.deepEqual(term.duration, { value: 6, unit: 'month' });
  assert.equal(term.norm.primary, 'ч. 2 ст. 318 КАС РФ');
  assert.deepEqual(term.norm.calculation, ['ч. 3 ст. 92', 'ч. 1, 2 ст. 93 КАС РФ']);
  assert.equal(
    term.norm.clarification,
    'п. 8, 9 Постановления Пленума ВС РФ от 09.07.2020 № 17; ч. 5 ст. 311, ст. 317 КАС РФ',
  );
  assert.equal(CASSATION_GENERAL_KAS.weekend_shift, true);
  assert.equal(CASSATION_GENERAL_KAS.restoration_norm, undefined);
  assert.equal(CASSATION_GENERAL_KAS.ics, undefined);
});

// --- Задача КАС-10: п. 9 Постановления Пленума ВС РФ от 09.07.2020 № 17 — периоды,
// исключаемые из шестимесячного срока кассационного обжалования -------------------

test('cassation_general_kas: срок составления мотивированного определения продлевает срок на 7 дней', () => {
  const term = computeCassationGeneralKas({
    appellate_ruling_date_kas: '2025-03-11',
    appellate_ruling_final_form_date_kas: '2025-03-18',
  });
  assert.equal(term.pre_exclusion_deadline, '2025-09-11');
  assert.equal(term.raw_deadline, '2025-09-18');
  assert.equal(term.deadline, '2025-09-18'); // четверг, рабочий день
  assert.equal(term.shifted, false);
  assert.equal(term.excluded_days, 7);
  assert.deepEqual(term.excluded_periods, [
    { type: 'appellate_ruling_drafting', start: '2025-03-11', end: '2025-03-18', days: 7 },
  ]);
  assert.equal(term.exclusion_norm, 'п. 9 Постановления Пленума ВС РФ от 09.07.2020 № 17');
  assert.match(term.exclusion_logic, /время составления мотивированного апелляционного определения/);
  assert.doesNotMatch(term.exclusion_logic, /время рассмотрения кассационных/);
});

test('cassation_general_kas: время рассмотрения кассационной жалобы продлевает срок на 43 дня', () => {
  const term = computeCassationGeneralKas({
    appellate_ruling_date_kas: '2025-03-11',
    cassation_consideration_periods_kas: [{ start: '2025-05-20', end: '2025-07-02' }],
  });
  assert.equal(term.pre_exclusion_deadline, '2025-09-11');
  assert.equal(term.raw_deadline, '2025-10-24');
  assert.equal(term.deadline, '2025-10-24'); // пятница, рабочий день
  assert.equal(term.shifted, false);
  assert.equal(term.excluded_days, 43);
  assert.deepEqual(term.excluded_periods, [
    { type: 'cassation_consideration', start: '2025-05-20', end: '2025-07-02', days: 43 },
  ]);
  assert.match(term.exclusion_logic, /время рассмотрения кассационных жалобы, представления/);
  assert.doesNotMatch(term.exclusion_logic, /время составления/);
});

test('cassation_general_kas: составление определения и два кассационных периода складываются, итог переносится', () => {
  const term = computeCassationGeneralKas({
    appellate_ruling_date_kas: '2025-03-11',
    appellate_ruling_final_form_date_kas: '2025-03-14',
    cassation_consideration_periods_kas: [
      { start: '2025-07-01', end: '2025-07-21' },
      { start: '2025-04-01', end: '2025-05-06' },
    ],
  });
  // 3 + 35 + 20 = 58 дней; 11.09.2025 + 58 = 08.11.2025 — суббота, перенос на 10.11.2025.
  assert.equal(term.pre_exclusion_deadline, '2025-09-11');
  assert.equal(term.raw_deadline, '2025-11-08');
  assert.equal(term.deadline, '2025-11-10');
  assert.equal(term.shifted, true);
  assert.equal(term.excluded_days, 58);
  assert.deepEqual(
    term.excluded_periods.map((e) => [e.type, e.start, e.end, e.days]),
    [
      ['appellate_ruling_drafting', '2025-03-11', '2025-03-14', 3],
      ['cassation_consideration', '2025-04-01', '2025-05-06', 35],
      ['cassation_consideration', '2025-07-01', '2025-07-21', 20],
    ],
  );
  assert.match(term.exclusion_logic, /время составления мотивированного апелляционного определения/);
  assert.match(term.exclusion_logic, /время рассмотрения кассационных жалобы, представления/);
});

test('cassation_general_kas: срок продлевается от последнего дня до переноса, а не от перенесённого', () => {
  const base = computeCassationGeneralKas({ appellate_ruling_date_kas: '2025-07-18' });
  assert.equal(base.raw_deadline, '2026-01-18'); // воскресенье
  assert.equal(base.deadline, '2026-01-19'); // перенос на понедельник
  const term = computeCassationGeneralKas({
    appellate_ruling_date_kas: '2025-07-18',
    appellate_ruling_final_form_date_kas: '2025-07-23',
  });
  // 18.01.2026 + 5 дней = 23.01.2026 (пятница). От перенесённого 19.01.2026 вышло бы
  // 24.01.2026 -> 26.01.2026, то есть на три дня позже верного.
  assert.equal(term.pre_exclusion_deadline, '2026-01-19');
  assert.equal(term.raw_deadline, '2026-01-23');
  assert.equal(term.deadline, '2026-01-23');
  assert.equal(term.shifted, false);
});

test('cassation_general_kas: без исключаемых дней результат тот же, что без полей периодов', () => {
  const base = computeCassationGeneralKas({ appellate_ruling_date_kas: '2025-03-11' });
  const sameDay = computeCassationGeneralKas({
    appellate_ruling_date_kas: '2025-03-11',
    appellate_ruling_final_form_date_kas: '2025-03-11',
  });
  const emptyList = computeCassationGeneralKas({
    appellate_ruling_date_kas: '2025-03-11',
    cassation_consideration_periods_kas: [],
  });
  const zeroPeriod = computeCassationGeneralKas({
    appellate_ruling_date_kas: '2025-03-11',
    cassation_consideration_periods_kas: [{ start: '2025-05-20', end: '2025-05-20' }],
  });
  for (const term of [sameDay, emptyList, zeroPeriod]) {
    assert.deepEqual(term, base);
  }
  assert.equal(base.excluded_days, undefined);
  assert.equal(base.excluded_periods, undefined);
});

test('cassation_general_kas: период рассмотрения может начаться в последний день срока', () => {
  const term = computeCassationGeneralKas({
    appellate_ruling_date_kas: '2025-03-11',
    cassation_consideration_periods_kas: [{ start: '2025-09-11', end: '2025-09-20' }],
  });
  // Последний день срока — 11.09.2025; 11.09.2025 + 9 дней = 20.09.2025 (суббота),
  // перенос на понедельник 22.09.2025.
  assert.equal(term.raw_deadline, '2025-09-20');
  assert.equal(term.deadline, '2025-09-22');
  assert.equal(term.shifted, true);
  assert.equal(term.excluded_days, 9);
});

test('cassation_general_kas: период рассмотрения не может начаться после последнего дня срока', () => {
  assert.throws(
    () =>
      computeCassationGeneralKas({
        appellate_ruling_date_kas: '2025-03-11',
        cassation_consideration_periods_kas: [{ start: '2025-09-12', end: '2025-09-20' }],
      }),
    /начинается после окончания шестимесячного срока \(2025-09-11\)/,
  );
});

test('cassation_general_kas: продление предыдущим периодом сдвигает допустимое начало следующего', () => {
  const term = computeCassationGeneralKas({
    appellate_ruling_date_kas: '2025-03-11',
    appellate_ruling_final_form_date_kas: '2025-03-18',
    cassation_consideration_periods_kas: [{ start: '2025-09-15', end: '2025-09-25' }],
  });
  // После 7 дней составления последний день срока — 18.09.2025, поэтому период с
  // 15.09.2025 (позже исходных 11.09.2025) допустим. 7 + 10 = 17 дней;
  // 11.09.2025 + 17 = 28.09.2025 — воскресенье, перенос на 29.09.2025.
  assert.equal(term.raw_deadline, '2025-09-28');
  assert.equal(term.deadline, '2025-09-29');
  assert.equal(term.shifted, true);
  assert.equal(term.excluded_days, 17);
});

test('cassation_general_kas: периоды встык (end одного = start другого) допустимы', () => {
  const term = computeCassationGeneralKas({
    appellate_ruling_date_kas: '2025-03-11',
    cassation_consideration_periods_kas: [
      { start: '2025-04-01', end: '2025-05-06' },
      { start: '2025-05-06', end: '2025-06-03' },
    ],
  });
  // 35 + 28 = 63 дня; 11.09.2025 + 63 = 13.11.2025 (четверг, рабочий день).
  assert.equal(term.excluded_days, 63);
  assert.equal(term.raw_deadline, '2025-11-13');
  assert.equal(term.deadline, '2025-11-13');
  assert.equal(term.shifted, false);
});

test('cassation_general_kas: пересекающиеся периоды — ошибка', () => {
  assert.throws(
    () =>
      computeCassationGeneralKas({
        appellate_ruling_date_kas: '2025-03-11',
        cassation_consideration_periods_kas: [
          { start: '2025-04-01', end: '2025-05-06' },
          { start: '2025-05-01', end: '2025-06-01' },
        ],
      }),
    /пересекаются/,
  );
});

test('cassation_general_kas: составление определения отложено ровно на десять дней — допустимо', () => {
  const term = computeCassationGeneralKas({
    appellate_ruling_date_kas: '2025-03-11',
    appellate_ruling_final_form_date_kas: '2025-03-21',
  });
  // 11.09.2025 + 10 дней = 21.09.2025 (воскресенье), перенос на 22.09.2025.
  assert.equal(term.excluded_days, 10);
  assert.equal(term.raw_deadline, '2025-09-21');
  assert.equal(term.deadline, '2025-09-22');
  assert.equal(term.shifted, true);
});

test('cassation_general_kas: составление определения отложено больше чем на десять дней — ошибка', () => {
  assert.throws(
    () =>
      computeCassationGeneralKas({
        appellate_ruling_date_kas: '2025-03-11',
        appellate_ruling_final_form_date_kas: '2025-03-22',
      }),
    /не более чем на десять дней.*не позже 2025-03-21/,
  );
});

test('cassation_general_kas: дата составления определения раньше даты принятия или некорректна — ошибка', () => {
  assert.throws(
    () =>
      computeCassationGeneralKas({
        appellate_ruling_date_kas: '2025-03-11',
        appellate_ruling_final_form_date_kas: '2025-03-10',
      }),
    /раньше даты его принятия/,
  );
  assert.throws(
    () =>
      computeCassationGeneralKas({
        appellate_ruling_date_kas: '2025-03-11',
        appellate_ruling_final_form_date_kas: 'не дата',
      }),
    /Некорректная дата составления мотивированного апелляционного определения/,
  );
});

test('cassation_general_kas: неполный или перевёрнутый период рассмотрения — ошибка', () => {
  const inputs = (period) => ({
    appellate_ruling_date_kas: '2025-03-11',
    cassation_consideration_periods_kas: [period],
  });
  assert.throws(
    () => computeCassationGeneralKas(inputs({ start: '2025-05-20' })),
    /не указана дата изготовления определения в полном объёме/,
  );
  assert.throws(
    () => computeCassationGeneralKas(inputs({ end: '2025-07-02' })),
    /не указана дата поступления жалобы, представления в суд/,
  );
  assert.throws(
    () => computeCassationGeneralKas(inputs({ start: '2025-05-10', end: '2025-05-01' })),
    /раньше даты поступления жалобы, представления/,
  );
});

test('cassation_general_kas: период рассмотрения раньше принятия апелляционного определения — ошибка', () => {
  assert.throws(
    () =>
      computeCassationGeneralKas({
        appellate_ruling_date_kas: '2025-03-11',
        cassation_consideration_periods_kas: [{ start: '2025-03-01', end: '2025-03-20' }],
      }),
    /начинается раньше даты принятия апелляционного определения 2025-03-11/,
  );
});

test('cassation_general_kas: cassation_consideration_periods_kas не массив — ошибка', () => {
  assert.throws(
    () =>
      computeCassationGeneralKas({
        appellate_ruling_date_kas: '2025-03-11',
        cassation_consideration_periods_kas: { start: '2025-05-20', end: '2025-07-02' },
      }),
    /должен быть массивом периодов/,
  );
});

// --- Восстановление срока кассации: двенадцатимесячный потолок (ч. 3 ст. 318 КАС РФ) ---

test('cassation_restoration_cap_kas: обстоятельство внутри двенадцати месяцев — within_cap true', () => {
  const result = computeCassationRestorationCapKas({
    appellate_ruling_date_kas: '2025-03-11',
    cassation_restoration_circumstance_date_kas: '2025-12-01',
  });
  assert.equal(result.entry_into_force, '2025-03-11');
  assert.equal(result.circumstance_date, '2025-12-01');
  assert.equal(result.within_cap, true);
  assert.equal(result.cap_deadline, '2026-03-11');
  assert.equal(result.norm, 'ч. 3 ст. 318 КАС РФ');
});

test('cassation_restoration_cap_kas: обстоятельство в последний день периода — укладывается (включительно)', () => {
  const result = computeCassationRestorationCapKas({
    appellate_ruling_date_kas: '2025-03-11',
    cassation_restoration_circumstance_date_kas: '2026-03-11',
  });
  assert.equal(result.within_cap, true); // 11.03.2026 — среда
  assert.equal(result.cap_deadline, '2026-03-11');
});

test('cassation_restoration_cap_kas: обстоятельство на следующий день после периода — не укладывается', () => {
  const result = computeCassationRestorationCapKas({
    appellate_ruling_date_kas: '2025-03-11',
    cassation_restoration_circumstance_date_kas: '2026-03-12',
  });
  assert.equal(result.within_cap, false);
  assert.equal(result.cap_deadline, '2026-03-11');
});

test('cassation_restoration_cap_kas: последний день периода — суббота, на рабочий день не переносится', () => {
  const base = { appellate_ruling_date_kas: '2025-03-14' };
  const onSaturday = computeCassationRestorationCapKas({
    ...base,
    cassation_restoration_circumstance_date_kas: '2026-03-14',
  });
  assert.equal(onSaturday.cap_deadline, '2026-03-14'); // суббота, перенос на понедельник не применяется
  assert.equal(onSaturday.within_cap, true);
  const onSunday = computeCassationRestorationCapKas({
    ...base,
    cassation_restoration_circumstance_date_kas: '2026-03-15',
  });
  assert.equal(onSunday.within_cap, false);
  const onMonday = computeCassationRestorationCapKas({
    ...base,
    cassation_restoration_circumstance_date_kas: '2026-03-16',
  });
  assert.equal(onMonday.within_cap, false);
});

test('cassation_restoration_cap_kas: нет соответствующего числа — последний день месяца (ч. 1 ст. 93 КАС РФ)', () => {
  const base = { appellate_ruling_date_kas: '2024-02-29' };
  const onLastDay = computeCassationRestorationCapKas({
    ...base,
    cassation_restoration_circumstance_date_kas: '2025-02-28',
  });
  assert.equal(onLastDay.cap_deadline, '2025-02-28');
  assert.equal(onLastDay.within_cap, true);
  const nextDay = computeCassationRestorationCapKas({
    ...base,
    cassation_restoration_circumstance_date_kas: '2025-03-01',
  });
  assert.equal(nextDay.within_cap, false);
});

test('cassation_restoration_cap_kas: дата составления мотивированного определения на потолок не влияет', () => {
  const result = computeCassationRestorationCapKas({
    appellate_ruling_date_kas: '2025-03-11',
    appellate_ruling_final_form_date_kas: '2025-03-18',
    cassation_restoration_circumstance_date_kas: '2026-03-11',
  });
  assert.equal(result.entry_into_force, '2025-03-11');
  assert.equal(result.cap_deadline, '2026-03-11');
  assert.equal(result.within_cap, true);
});

test('cassation_restoration_cap_kas: обстоятельство раньше вступления в силу верхнюю границу не нарушает', () => {
  // Нижняя граница нормой не задана (решение архитектора): такая дата не отвергается.
  const result = computeCassationRestorationCapKas({
    appellate_ruling_date_kas: '2025-03-11',
    cassation_restoration_circumstance_date_kas: '2025-01-01',
  });
  assert.equal(result.within_cap, true);
  assert.equal(result.cap_deadline, '2026-03-11');
});

test('cassation_restoration_cap_kas: нет даты принятия апелляционного определения — ошибка', () => {
  for (const value of [undefined, null, '']) {
    assert.throws(
      () =>
        computeCassationRestorationCapKas({
          appellate_ruling_date_kas: value,
          cassation_restoration_circumstance_date_kas: '2025-12-01',
        }),
      /Обязательна дата принятия определения суда апелляционной инстанции \(appellate_ruling_date_kas\)/,
    );
  }
  assert.throws(
    () => computeCassationRestorationCapKas(undefined),
    /Обязательна дата принятия определения суда апелляционной инстанции/,
  );
});

test('cassation_restoration_cap_kas: некорректная дата принятия апелляционного определения — ошибка', () => {
  assert.throws(
    () =>
      computeCassationRestorationCapKas({
        appellate_ruling_date_kas: 'не дата',
        cassation_restoration_circumstance_date_kas: '2025-12-01',
      }),
    /Некорректная дата принятия определения суда апелляционной инстанции \(appellate_ruling_date_kas\)/,
  );
});

test('cassation_restoration_cap_kas: нет даты обстоятельства — ошибка', () => {
  for (const value of [undefined, null, '']) {
    assert.throws(
      () =>
        computeCassationRestorationCapKas({
          appellate_ruling_date_kas: '2025-03-11',
          cassation_restoration_circumstance_date_kas: value,
        }),
      /Обязательна дата обстоятельства, послужившего причиной пропуска срока \(cassation_restoration_circumstance_date_kas\)/,
    );
  }
});

test('cassation_restoration_cap_kas: некорректная дата обстоятельства — ошибка', () => {
  assert.throws(
    () =>
      computeCassationRestorationCapKas({
        appellate_ruling_date_kas: '2025-03-11',
        cassation_restoration_circumstance_date_kas: 'не дата',
      }),
    /Некорректная дата обстоятельства, послужившего причиной пропуска срока \(cassation_restoration_circumstance_date_kas\)/,
  );
});

test('cassation_restoration_cap_kas: состав результата и оговорка о втором основании ч. 3 ст. 318', () => {
  const result = computeCassationRestorationCapKas({
    appellate_ruling_date_kas: '2025-03-11',
    cassation_restoration_circumstance_date_kas: '2025-12-01',
  });
  assert.deepEqual(Object.keys(result).sort(), [
    'cap_deadline',
    'circumstance_date',
    'entry_into_force',
    'logic',
    'norm',
    'within_cap',
  ]);
  assert.match(result.logic, /ч\. 3 ст\. 318 КАС РФ/);
  assert.match(result.logic, /ч\. 5 ст\. 311 КАС РФ/);
  assert.match(result.logic, /лица, не участвовавшего в деле/);
  assert.match(result.logic, /не вычисляется/);
});

// --- Задача КАС-12: ч. 2 ст. 333 — срок подачи надзорных жалобы, представления
// (три месяца со дня принятия (вынесения) обжалуемого определения) --------------------

test('supervision_general_kas считается от supervised_ruling_date_kas (обычная дата, без переноса)', () => {
  const term = computeSupervisionGeneralKas({ supervised_ruling_date_kas: '2025-03-11' });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-06-11');
  assert.equal(term.deadline, '2025-06-11'); // 11.06.2025 — среда, рабочий день
  assert.equal(term.shifted, false);
});

test('supervision_general_kas: в последнем месяце нет соответствующего числа — последний день месяца (високосный февраль)', () => {
  const term = computeSupervisionGeneralKas({ supervised_ruling_date_kas: '2023-11-30' });
  // 30.11.2023 + 3 месяца: в феврале 2024 года нет 30-го числа, срок истекает в
  // последний день месяца — 29.02.2024 (четверг, рабочий день), переноса нет.
  assert.equal(term.raw_deadline, '2024-02-29');
  assert.equal(term.deadline, '2024-02-29');
  assert.equal(term.shifted, false);
});

test('supervision_general_kas: нет соответствующего числа и последний день — суббота, перенос на понедельник', () => {
  const term = computeSupervisionGeneralKas({ supervised_ruling_date_kas: '2025-11-30' });
  // 30.11.2025 + 3 месяца: в феврале 2026 года нет 30-го числа, срок истекает 28.02.2026
  // (суббота); 01.03 — воскресенье -> перенос на 02.03.2026 (понедельник).
  assert.equal(term.raw_deadline, '2026-02-28');
  assert.equal(term.deadline, '2026-03-02');
  assert.equal(term.shifted, true);
});

test('supervision_general_kas: последний день — праздник 12 июня, перенос на понедельник', () => {
  const term = computeSupervisionGeneralKas({ supervised_ruling_date_kas: '2026-03-12' });
  // 12.03.2026 + 3 месяца = 12.06.2026 (пятница, День России — нерабочий);
  // 13–14.06 — суббота и воскресенье -> перенос на 15.06.2026 (понедельник).
  assert.equal(term.raw_deadline, '2026-06-12');
  assert.equal(term.deadline, '2026-06-15');
  assert.equal(term.shifted, true);
});

test('supervision_general_kas: последний день — воскресенье, перенос на понедельник', () => {
  const term = computeSupervisionGeneralKas({ supervised_ruling_date_kas: '2025-09-14' });
  // 14.09.2025 + 3 месяца = 14.12.2025 — воскресенье -> перенос на 15.12.2025
  // (понедельник, рабочий день).
  assert.equal(term.raw_deadline, '2025-12-14');
  assert.equal(term.deadline, '2025-12-15');
  assert.equal(term.shifted, true);
});

test('supervision_general_kas: без supervised_ruling_date_kas — ошибка', () => {
  assert.throws(() => computeSupervisionGeneralKas({}), /supervised_ruling_date_kas/);
});

test('supervision_general_kas: норма и объём задачи КАС-12 — три месяца, weekend_shift, без restoration_norm и ics', () => {
  const term = computeSupervisionGeneralKas({ supervised_ruling_date_kas: '2025-03-11' });
  assert.equal(term.id, 'supervision_general_kas');
  assert.deepEqual(term.duration, { value: 3, unit: 'month' });
  assert.equal(term.norm.primary, 'ч. 2 ст. 333 КАС РФ');
  assert.deepEqual(term.norm.calculation, ['ч. 3 ст. 92', 'ч. 1, 2 ст. 93 КАС РФ']);
  assert.equal(
    term.norm.clarification,
    'п. 4, 6 ч. 2 ст. 332; ч. 5 ст. 311, ст. 317, 331 КАС РФ',
  );
  assert.equal(SUPERVISION_GENERAL_KAS.weekend_shift, true);
  assert.equal(SUPERVISION_GENERAL_KAS.restoration_norm, undefined);
  assert.equal(SUPERVISION_GENERAL_KAS.ics, undefined);
});

// --- Восстановление срока надзора: двенадцатимесячный потолок (ч. 3 ст. 333 КАС РФ) ---

test('supervision_restoration_cap_kas: обстоятельство внутри двенадцати месяцев — within_cap true', () => {
  const result = computeSupervisionRestorationCapKas({
    supervised_ruling_date_kas: '2025-03-11',
    supervision_restoration_circumstance_date_kas: '2025-12-01',
  });
  assert.equal(result.entry_into_force, '2025-03-11');
  assert.equal(result.circumstance_date, '2025-12-01');
  assert.equal(result.within_cap, true);
  assert.equal(result.cap_deadline, '2026-03-11');
  assert.equal(result.norm, 'ч. 3 ст. 333 КАС РФ');
});

test('supervision_restoration_cap_kas: обстоятельство в последний день периода — укладывается (включительно)', () => {
  const result = computeSupervisionRestorationCapKas({
    supervised_ruling_date_kas: '2025-03-11',
    supervision_restoration_circumstance_date_kas: '2026-03-11',
  });
  assert.equal(result.within_cap, true); // 11.03.2026 — среда
  assert.equal(result.cap_deadline, '2026-03-11');
});

test('supervision_restoration_cap_kas: обстоятельство на следующий день после периода — не укладывается', () => {
  const result = computeSupervisionRestorationCapKas({
    supervised_ruling_date_kas: '2025-03-11',
    supervision_restoration_circumstance_date_kas: '2026-03-12',
  });
  assert.equal(result.within_cap, false);
  assert.equal(result.cap_deadline, '2026-03-11');
});

test('supervision_restoration_cap_kas: последний день периода — суббота, на рабочий день не переносится', () => {
  const base = { supervised_ruling_date_kas: '2025-03-14' };
  const onSaturday = computeSupervisionRestorationCapKas({
    ...base,
    supervision_restoration_circumstance_date_kas: '2026-03-14',
  });
  assert.equal(onSaturday.cap_deadline, '2026-03-14'); // суббота, перенос на понедельник не применяется
  assert.equal(onSaturday.within_cap, true);
  const onSunday = computeSupervisionRestorationCapKas({
    ...base,
    supervision_restoration_circumstance_date_kas: '2026-03-15',
  });
  assert.equal(onSunday.within_cap, false);
  const onMonday = computeSupervisionRestorationCapKas({
    ...base,
    supervision_restoration_circumstance_date_kas: '2026-03-16',
  });
  assert.equal(onMonday.within_cap, false);
});

test('supervision_restoration_cap_kas: нет соответствующего числа — последний день месяца (ч. 1 ст. 93 КАС РФ)', () => {
  const base = { supervised_ruling_date_kas: '2024-02-29' };
  const onLastDay = computeSupervisionRestorationCapKas({
    ...base,
    supervision_restoration_circumstance_date_kas: '2025-02-28',
  });
  assert.equal(onLastDay.cap_deadline, '2025-02-28');
  assert.equal(onLastDay.within_cap, true);
  const nextDay = computeSupervisionRestorationCapKas({
    ...base,
    supervision_restoration_circumstance_date_kas: '2025-03-01',
  });
  assert.equal(nextDay.within_cap, false);
});

test('supervision_restoration_cap_kas: обстоятельство раньше вступления в силу верхнюю границу не нарушает', () => {
  // Нижняя граница нормой не задана (решение архитектора): такая дата не отвергается.
  const result = computeSupervisionRestorationCapKas({
    supervised_ruling_date_kas: '2025-03-11',
    supervision_restoration_circumstance_date_kas: '2025-01-01',
  });
  assert.equal(result.within_cap, true);
  assert.equal(result.cap_deadline, '2026-03-11');
});

test('supervision_restoration_cap_kas: нет даты определения, обжалуемого в порядке надзора — ошибка', () => {
  for (const value of [undefined, null, '']) {
    assert.throws(
      () =>
        computeSupervisionRestorationCapKas({
          supervised_ruling_date_kas: value,
          supervision_restoration_circumstance_date_kas: '2025-12-01',
        }),
      /Обязательна дата принятия \(вынесения\) определения, обжалуемого в порядке надзора \(supervised_ruling_date_kas\)/,
    );
  }
  assert.throws(
    () => computeSupervisionRestorationCapKas(undefined),
    /Обязательна дата принятия \(вынесения\) определения, обжалуемого в порядке надзора/,
  );
});

test('supervision_restoration_cap_kas: некорректная дата определения, обжалуемого в порядке надзора — ошибка', () => {
  assert.throws(
    () =>
      computeSupervisionRestorationCapKas({
        supervised_ruling_date_kas: 'не дата',
        supervision_restoration_circumstance_date_kas: '2025-12-01',
      }),
    /Некорректная дата принятия \(вынесения\) определения, обжалуемого в порядке надзора \(supervised_ruling_date_kas\)/,
  );
});

test('supervision_restoration_cap_kas: нет даты обстоятельства — ошибка', () => {
  for (const value of [undefined, null, '']) {
    assert.throws(
      () =>
        computeSupervisionRestorationCapKas({
          supervised_ruling_date_kas: '2025-03-11',
          supervision_restoration_circumstance_date_kas: value,
        }),
      /Обязательна дата обстоятельства, послужившего причиной пропуска срока \(supervision_restoration_circumstance_date_kas\)/,
    );
  }
});

test('supervision_restoration_cap_kas: некорректная дата обстоятельства — ошибка', () => {
  assert.throws(
    () =>
      computeSupervisionRestorationCapKas({
        supervised_ruling_date_kas: '2025-03-11',
        supervision_restoration_circumstance_date_kas: 'не дата',
      }),
    /Некорректная дата обстоятельства, послужившего причиной пропуска срока \(supervision_restoration_circumstance_date_kas\)/,
  );
});

test('supervision_restoration_cap_kas: состав результата и оговорка о втором основании ч. 3 ст. 333', () => {
  const result = computeSupervisionRestorationCapKas({
    supervised_ruling_date_kas: '2025-03-11',
    supervision_restoration_circumstance_date_kas: '2025-12-01',
  });
  assert.deepEqual(Object.keys(result).sort(), [
    'cap_deadline',
    'circumstance_date',
    'entry_into_force',
    'logic',
    'norm',
    'within_cap',
  ]);
  assert.match(result.logic, /ч\. 3 ст\. 333 КАС РФ/);
  assert.match(result.logic, /ст\. 331 КАС РФ/);
  assert.match(result.logic, /лица, не участвовавшего в административном деле/);
  assert.match(result.logic, /не вычисляется/);
});
