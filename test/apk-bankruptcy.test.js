// Тесты домена банкротства (apk/bankruptcy.js) — задачи БАНКРОТСТВО.1
// (ст. 47 п. 1, working_day), БАНКРОТСТВО.2.1 (ст. 71 п. 1, calendar_day),
// БАНКРОТСТВО.3 (ст. 71 п. 8, обычный месячный узел), БАНКРОТСТВО.4
// (ст. 142 п. 1, обычный месячный узел), БАНКРОТСТВО.5 (ст. 213.8 п. 2,
// обычный месячный узел, первый для процедуры банкротства гражданина) и
// БАНКРОТСТВО.6 (ст. 213.29, обычный месячный узел, без restoration),
// БАНКРОТСТВО.7.1 (ст. 61.14 п. 5 и п. 6 — первые узлы с kind:
// 'capped_term', минимум из нескольких кумулятивных потолков, плюс два
// restoration-узла, считающих два года от уже вычисленного дедлайна).
//
// Отдельный файл от test/apk-chain.test.js: домен банкротства — отдельный
// правовой институт (ФЗ № 127-ФЗ), не часть процессуальной цепочки АПК, см.
// комментарий в шапке apk/bankruptcy.js.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeDebtorResponseBankruptcyApk,
  DEBTOR_RESPONSE_BANKRUPTCY_APK,
  computeCreditorClaimsSubmissionApk,
  CREDITOR_CLAIMS_SUBMISSION_APK,
  computeCreditorClaimExclusionApk,
  CREDITOR_CLAIM_EXCLUSION_APK,
  computeCreditorsRegisterClosureApk,
  CREDITORS_REGISTER_CLOSURE_APK,
  computeCitizenBankruptcyCreditorClaimsApk,
  CITIZEN_BANKRUPTCY_CREDITOR_CLAIMS_APK,
  computeBankruptcyCompletionReviewApk,
  BANKRUPTCY_COMPLETION_REVIEW_APK,
  computeSubsidiaryLiabilityInCaseApk,
  computeSubsidiaryLiabilityInCaseApkRestoration,
  computeSubsidiaryLiabilityPostConclusionApk,
  computeSubsidiaryLiabilityPostConclusionApkRestoration,
} from '../apk/bankruptcy.js';
import { isWorkingDay } from '../core/calendar/calendar.js';
// Нужен ровно для одной проверки: карточка kind: 'capped_term' должна
// помечаться истёкшей наравне с обычным term (см. последний тест файла).
import { markExpired } from '../core/view/cards.js';

// Задача БАНКРОТСТВО.1 — отзыв должника на заявление о банкротстве
// (ст. 47 п. 1 ФЗ № 127-ФЗ). Первый узел домена банкротства.

test('отзыв должника на заявление о банкротстве: десять рабочих дней от даты получения определения, без праздничных кластеров рядом', () => {
  const term = computeDebtorResponseBankruptcyApk({
    creditor_petition_acceptance_ruling_received_date_apk: '2025-03-02',
  });
  assert.equal(term.anchor, '2025-03-02');
  assert.equal(term.first_working_day, '2025-03-03');
  assert.equal(term.raw_deadline, '2025-03-14');
  assert.equal(term.deadline, '2025-03-14');
  assert.equal(term.shifted, false); // weekend_shift к working_day не применяется
  assert.deepEqual(term.duration, { value: 10, unit: 'working_day' });
  assert.equal(term.norm.primary, 'ст. 47 п. 1 ФЗ № 127-ФЗ');
});

test('отзыв должника на заявление о банкротстве: рабочие дни, а не календарные — перенос через новогодние каникулы', () => {
  // Определение получено 26.12.2025 (пятница). Течение — с 29.12
  // (понедельник); 31.12.2025 и 01–09.01.2026 нерабочие, поэтому десятый
  // рабочий день — 21.01.2026, а не 05.01.2026, как было бы при подсчёте
  // 10 календарных дней.
  const term = computeDebtorResponseBankruptcyApk({
    creditor_petition_acceptance_ruling_received_date_apk: '2025-12-26',
  });
  assert.equal(term.first_working_day, '2025-12-29');
  assert.equal(term.deadline, '2026-01-21');
  assert.notEqual(term.deadline, '2026-01-05'); // наивные "+10 календарных дней"
});

test('отзыв должника на заявление о банкротстве: без creditor_petition_acceptance_ruling_received_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeDebtorResponseBankruptcyApk({}),
    /creditor_petition_acceptance_ruling_received_date_apk/,
  );
});

test('отзыв должника на заявление о банкротстве: объём задачи — без restoration-полей', () => {
  // Фиксирует границу: в этом фрагменте ст. 47 п. 1 ФЗ № 127-ФЗ последствия
  // пропуска срока вообще не упоминаются — не тот случай "восстановление без
  // потолка" (ст. 322/112/222.1/229/198/208 АПК), а полное отсутствие
  // института восстановления применительно к этому сроку (тот же случай, что
  // и у ч. 4 ст. 206 / ч. 5 ст. 211 АПК).
  const term = computeDebtorResponseBankruptcyApk({
    creditor_petition_acceptance_ruling_received_date_apk: '2025-03-02',
  });
  assert.equal(term.id, 'debtor_response_bankruptcy_apk');
  assert.equal(DEBTOR_RESPONSE_BANKRUPTCY_APK.restoration_norm, undefined);
  assert.equal(typeof computeDebtorResponseBankruptcyApkRestoration, 'undefined');
});

// Задача БАНКРОТСТВО.2.1 — предъявление требований кредиторов для участия в
// первом собрании (ст. 71 п. 1 ФЗ № 127-ФЗ). Первый узел проекта с
// duration.unit: 'calendar_day'.

test('требования кредиторов: тридцать календарных дней с даты опубликования сообщения, итоговый день рабочий', () => {
  const term = computeCreditorClaimsSubmissionApk({
    observation_introduction_notice_published_date_apk: '2025-03-03',
  });
  assert.equal(term.anchor, '2025-03-03');
  assert.equal(term.raw_deadline, '2025-04-02');
  assert.equal(term.deadline, '2025-04-02'); // среда, рабочий день
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 30, unit: 'calendar_day' });
  assert.equal(term.norm.primary, 'ст. 71 п. 1 ФЗ № 127-ФЗ');
});

test('требования кредиторов: итоговая дата на нерабочий день переносится (ч. 4 ст. 114 АПК РФ)', () => {
  // 01.04.2025 + 30 календарных дней = 01.05.2025 (Праздник Весны и Труда,
  // нерабочий) → ближайший рабочий 05.05.2025 (понедельник).
  const term = computeCreditorClaimsSubmissionApk({
    observation_introduction_notice_published_date_apk: '2025-04-01',
  });
  assert.equal(term.raw_deadline, '2025-05-01');
  assert.ok(!isWorkingDay('2025-05-01'));
  assert.equal(term.deadline, '2025-05-05');
  assert.equal(term.shifted, true);
});

test('требования кредиторов: нерабочие дни ВНУТРИ периода не растягивают срок — дедлайн ровно якорь + 30', () => {
  // Главная проверка того, что узел не перепутан с working_day-веткой.
  // Период 03.03–02.04.2025 захватывает ЧЕТЫРЕ полных уикенда (8 нерабочих
  // дней: 08–09, 15–16, 22–23, 29–30 марта). У working_day-срока они
  // пропускались бы и отодвинули дедлайн почти на две недели; у календарного
  // они входят в счёт, и итог — ровно 30 дней от якоря.
  const anchor = '2025-03-03';
  const nonWorkingInside = [
    '2025-03-08',
    '2025-03-09',
    '2025-03-15',
    '2025-03-16',
    '2025-03-22',
    '2025-03-23',
    '2025-03-29',
    '2025-03-30',
  ];
  for (const day of nonWorkingInside) {
    assert.ok(!isWorkingDay(day), `${day} должен быть нерабочим днём внутри периода`);
  }

  const term = computeCreditorClaimsSubmissionApk({
    observation_introduction_notice_published_date_apk: anchor,
  });
  // Ровно якорь + 30 календарных дней, несмотря на восемь нерабочих внутри.
  assert.equal(term.deadline, '2025-04-02');
  const plusThirty = new Date(Date.parse(anchor + 'T00:00:00Z') + 30 * 86_400_000);
  assert.equal(term.deadline, plusThirty.toISOString().slice(0, 10));
  // Собственного сдвига дня начала календарный срок не делает — в отличие от
  // working_day-узлов, у которых в результате есть first_working_day.
  assert.equal(term.first_working_day, undefined);
});

test('требования кредиторов: без observation_introduction_notice_published_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeCreditorClaimsSubmissionApk({}),
    /observation_introduction_notice_published_date_apk/,
  );
});

test('требования кредиторов: объём задачи — без restoration-полей', () => {
  // Фиксирует границу: п. 1 ст. 71 восстановление применительно к этому сроку
  // не упоминает. П. 8 той же статьи (требования, заявленные позже) — отдельная
  // норма с собственными последствиями, в объём задачи не входит.
  const term = computeCreditorClaimsSubmissionApk({
    observation_introduction_notice_published_date_apk: '2025-03-03',
  });
  assert.equal(term.id, 'creditor_claims_submission_apk');
  assert.equal(CREDITOR_CLAIMS_SUBMISSION_APK.restoration_norm, undefined);
  assert.equal(typeof computeCreditorClaimsSubmissionApkRestoration, 'undefined');
});

// Задача БАНКРОТСТВО.3 — исключение требования кредитора из реестра при новых
// обстоятельствах (ст. 71 п. 8 ФЗ № 127-ФЗ). Обычный месячный узел, без
// restoration и без новой единицы измерения.

test('исключение требования из реестра: три месяца с момента, когда стало известно об обстоятельствах, будний день без переноса', () => {
  const term = computeCreditorClaimExclusionApk({
    creditor_claim_unjustified_circumstances_known_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-06-11');
  assert.equal(term.deadline, '2025-06-11'); // среда, рабочий день
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 3, unit: 'month' });
  assert.equal(term.norm.primary, 'ст. 71 п. 8 ФЗ № 127-ФЗ');
});

test('исключение требования из реестра: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeCreditorClaimExclusionApk({
    creditor_claim_unjustified_circumstances_known_date_apk: '2025-01-05',
  });
  // 05.01.2025 + 3 месяца = 05.04.2025 — суббота, перенос на 07.04.2025 (понедельник).
  assert.equal(term.raw_deadline, '2025-04-05');
  assert.equal(term.deadline, '2025-04-07');
  assert.equal(term.shifted, true);
});

test('исключение требования из реестра: без creditor_claim_unjustified_circumstances_known_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeCreditorClaimExclusionApk({}),
    /creditor_claim_unjustified_circumstances_known_date_apk/,
  );
});

test('исключение требования из реестра: объём задачи — без restoration-полей', () => {
  // Фиксирует границу: ст. 71 п. 8 предусматривает восстановление без
  // числового потолка — тот же случай, что уже был со ст. 322, 112,
  // 222.1 ч. 2, 229 ч. 4, 198 ч. 4 и 208 ч. 2 АПК.
  const term = computeCreditorClaimExclusionApk({
    creditor_claim_unjustified_circumstances_known_date_apk: '2025-03-11',
  });
  assert.equal(term.id, 'creditor_claim_exclusion_apk');
  assert.equal(CREDITOR_CLAIM_EXCLUSION_APK.restoration_norm, undefined);
  assert.equal(typeof computeCreditorClaimExclusionApkRestoration, 'undefined');
});

// Задача БАНКРОТСТВО.4 — закрытие реестра требований кредиторов в
// конкурсном производстве (ст. 142 п. 1 ФЗ № 127-ФЗ). Обычный месячный узел,
// без restoration.

test('закрытие реестра требований кредиторов: два месяца с даты опубликования сведений, будний день без переноса', () => {
  const term = computeCreditorsRegisterClosureApk({
    bankruptcy_declaration_notice_published_date_apk: '2025-04-02',
  });
  assert.equal(term.anchor, '2025-04-02');
  assert.equal(term.raw_deadline, '2025-06-02');
  assert.equal(term.deadline, '2025-06-02'); // понедельник, рабочий день
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 2, unit: 'month' });
  assert.equal(term.norm.primary, 'ст. 142 п. 1 ФЗ № 127-ФЗ');
});

test('закрытие реестра требований кредиторов: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeCreditorsRegisterClosureApk({
    bankruptcy_declaration_notice_published_date_apk: '2025-02-05',
  });
  // 05.02.2025 + 2 месяца = 05.04.2025 — суббота, перенос на 07.04.2025 (понедельник).
  assert.equal(term.raw_deadline, '2025-04-05');
  assert.equal(term.deadline, '2025-04-07');
  assert.equal(term.shifted, true);
});

test('закрытие реестра требований кредиторов: без bankruptcy_declaration_notice_published_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeCreditorsRegisterClosureApk({}),
    /bankruptcy_declaration_notice_published_date_apk/,
  );
});

test('закрытие реестра требований кредиторов: объём задачи — без restoration-полей', () => {
  // Фиксирует границу: ст. 142 п. 1 предусматривает восстановление без
  // числового потолка — тот же случай, что уже был со ст. 322, 112,
  // 222.1 ч. 2, 229 ч. 4, 198 ч. 4, 208 ч. 2 АПК и 71 п. 8 ФЗ № 127-ФЗ.
  const term = computeCreditorsRegisterClosureApk({
    bankruptcy_declaration_notice_published_date_apk: '2025-04-02',
  });
  assert.equal(term.id, 'creditors_register_closure_apk');
  assert.equal(CREDITORS_REGISTER_CLOSURE_APK.restoration_norm, undefined);
  assert.equal(typeof computeCreditorsRegisterClosureApkRestoration, 'undefined');
});

// Задача БАНКРОТСТВО.5 — предъявление требований кредиторов при банкротстве
// гражданина (ст. 213.8 п. 2 ФЗ № 127-ФЗ). Первый узел для процедуры
// банкротства гражданина, структурно — обычный месячный узел без
// restoration, аналог CREDITOR_CLAIMS_SUBMISSION_APK (ст. 71 п. 1).

test('требования кредиторов при банкротстве гражданина: два месяца с даты опубликования сообщения, будний день без переноса', () => {
  const term = computeCitizenBankruptcyCreditorClaimsApk({
    citizen_bankruptcy_petition_justified_notice_published_date_apk: '2025-04-02',
  });
  assert.equal(term.anchor, '2025-04-02');
  assert.equal(term.raw_deadline, '2025-06-02');
  assert.equal(term.deadline, '2025-06-02'); // понедельник, рабочий день
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 2, unit: 'month' });
  assert.equal(term.norm.primary, 'ст. 213.8 п. 2 ФЗ № 127-ФЗ');
});

test('требования кредиторов при банкротстве гражданина: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeCitizenBankruptcyCreditorClaimsApk({
    citizen_bankruptcy_petition_justified_notice_published_date_apk: '2025-02-05',
  });
  // 05.02.2025 + 2 месяца = 05.04.2025 — суббота, перенос на 07.04.2025 (понедельник).
  assert.equal(term.raw_deadline, '2025-04-05');
  assert.equal(term.deadline, '2025-04-07');
  assert.equal(term.shifted, true);
});

test('требования кредиторов при банкротстве гражданина: без citizen_bankruptcy_petition_justified_notice_published_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeCitizenBankruptcyCreditorClaimsApk({}),
    /citizen_bankruptcy_petition_justified_notice_published_date_apk/,
  );
});

test('требования кредиторов при банкротстве гражданина: объём задачи — без restoration-полей', () => {
  // Фиксирует границу: ст. 213.8 п. 2 предусматривает восстановление без
  // числового потолка — тот же случай, что уже был со ст. 322, 112,
  // 222.1 ч. 2, 229 ч. 4, 198 ч. 4, 208 ч. 2 АПК, 71 п. 8 и 142 п. 1
  // ФЗ № 127-ФЗ.
  const term = computeCitizenBankruptcyCreditorClaimsApk({
    citizen_bankruptcy_petition_justified_notice_published_date_apk: '2025-04-02',
  });
  assert.equal(term.id, 'citizen_bankruptcy_creditor_claims_apk');
  assert.equal(CITIZEN_BANKRUPTCY_CREDITOR_CLAIMS_APK.restoration_norm, undefined);
  assert.equal(typeof computeCitizenBankruptcyCreditorClaimsApkRestoration, 'undefined');
});

// Задача БАНКРОТСТВО.6 — пересмотр определения о завершении реструктуризации
// долгов/реализации имущества гражданина по вновь открывшимся
// обстоятельствам (ст. 213.29 ФЗ № 127-ФЗ). Обычный месячный узел; в этом
// фрагменте нормы восстановление не упоминается вовсе (не путать с уже
// встречавшимся паттерном "восстановление без потолка" у других узлов
// домена — здесь института восстановления для этого срока просто нет).

test('пересмотр определения о завершении процедуры: один месяц с даты открытия обстоятельств, будний день без переноса', () => {
  const term = computeBankruptcyCompletionReviewApk({
    bankruptcy_completion_review_circumstances_discovered_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11'); // пятница, рабочий день
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
  assert.equal(term.norm.primary, 'ст. 213.29 ФЗ № 127-ФЗ');
});

test('пересмотр определения о завершении процедуры: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeBankruptcyCompletionReviewApk({
    bankruptcy_completion_review_circumstances_discovered_date_apk: '2025-02-01',
  });
  // 01.02.2025 + 1 месяц = 01.03.2025 — суббота, перенос на 03.03.2025 (понедельник).
  assert.equal(term.raw_deadline, '2025-03-01');
  assert.equal(term.deadline, '2025-03-03');
  assert.equal(term.shifted, true);
});

test('пересмотр определения о завершении процедуры: без bankruptcy_completion_review_circumstances_discovered_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeBankruptcyCompletionReviewApk({}),
    /bankruptcy_completion_review_circumstances_discovered_date_apk/,
  );
});

test('пересмотр определения о завершении процедуры: объём задачи — без restoration-полей', () => {
  // Фиксирует границу: этот фрагмент ст. 213.29 восстановление не упоминает
  // вовсе — тот же случай, что и у ст. 47 п. 1 (а не "восстановление без
  // потолка", как у остальных узлов домена банкротства).
  const term = computeBankruptcyCompletionReviewApk({
    bankruptcy_completion_review_circumstances_discovered_date_apk: '2025-03-11',
  });
  assert.equal(term.id, 'bankruptcy_completion_review_apk');
  assert.equal(BANKRUPTCY_COMPLETION_REVIEW_APK.restoration_norm, undefined);
  assert.equal(typeof computeBankruptcyCompletionReviewApkRestoration, 'undefined');
});

// Задача БАНКРОТСТВО.7.1 — субсидиарная ответственность (ст. 61.14 ФЗ
// № 127-ФЗ). Первые узлы с kind: 'capped_term' — дедлайн есть минимум из
// нескольких кумулятивных потолков, и результат показывает все потолки плюс
// те из них, что реально ограничили срок (binding).

// --- П. 5: заявление в рамках дела о банкротстве ------------------------------

test('субсидиарная ответственность (п. 5): ограничивает субъективный трёхлетний потолок', () => {
  const term = computeSubsidiaryLiabilityInCaseApk({
    subsidiary_liability_grounds_known_date_apk: '2022-03-10',
    objective_cap_event: 'bankruptcy_declared',
    bankruptcy_declared_date_apk: '2023-06-01',
    subsidiary_liability_conduct_date_apk: '2020-01-01',
  });
  assert.equal(term.id, 'subsidiary_liability_in_case_apk');
  assert.equal(term.kind, 'capped_term');
  assert.equal(term.norm.primary, 'п. 5 ст. 61.14 ФЗ № 127-ФЗ');
  // Считаются все три потолка, а не только связавший.
  assert.deepEqual(term.caps, {
    subjective: '2025-03-10', // 10.03.2022 + 3 года — ближайший
    objective: '2026-06-01', // 01.06.2023 + 3 года
    absolute: '2030-01-01', // 01.01.2020 + 10 лет
  });
  assert.deepEqual(term.binding, ['subjective']);
  assert.equal(term.deadline, '2025-03-10'); // понедельник, переноса нет
});

test('субсидиарная ответственность (п. 5): ограничивает десятилетний предел — binding это показывает', () => {
  // Давние действия: десятилетний предел истекает раньше обоих трёхлетних.
  const term = computeSubsidiaryLiabilityInCaseApk({
    subsidiary_liability_grounds_known_date_apk: '2024-01-10',
    objective_cap_event: 'case_terminated',
    bankruptcy_case_terminated_date_apk: '2024-06-01',
    subsidiary_liability_conduct_date_apk: '2016-05-20',
  });
  assert.deepEqual(term.caps, {
    subjective: '2027-01-10',
    objective: '2027-06-01',
    absolute: '2026-05-20', // 20.05.2016 + 10 лет — ближайший
  });
  assert.deepEqual(term.binding, ['absolute']);
  assert.equal(term.deadline, '2026-05-20');
});

test('субсидиарная ответственность (п. 5): ограничивает объективный потолок от возврата заявления', () => {
  const term = computeSubsidiaryLiabilityInCaseApk({
    subsidiary_liability_grounds_known_date_apk: '2023-11-01',
    objective_cap_event: 'petition_returned',
    bankruptcy_petition_returned_date_apk: '2022-09-15',
    subsidiary_liability_conduct_date_apk: '2018-01-01',
  });
  assert.deepEqual(term.binding, ['objective']);
  assert.equal(term.deadline, '2025-09-15');
  assert.equal(term.anchors.objective_cap_event, 'petition_returned');
  assert.equal(term.anchors.objective_cap_date, '2022-09-15');
});

test('субсидиарная ответственность (п. 5): ничья — два потолка дают одну дату, binding содержит оба', () => {
  const term = computeSubsidiaryLiabilityInCaseApk({
    subsidiary_liability_grounds_known_date_apk: '2022-09-15',
    objective_cap_event: 'bankruptcy_declared',
    bankruptcy_declared_date_apk: '2022-09-15',
    subsidiary_liability_conduct_date_apk: '2018-01-01',
  });
  assert.equal(term.caps.subjective, term.caps.objective);
  assert.deepEqual(term.binding, ['subjective', 'objective']);
  assert.equal(term.deadline, '2025-09-15');
});

test('субсидиарная ответственность (п. 5): перенос применяется к итоговому дедлайну (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeSubsidiaryLiabilityInCaseApk({
    subsidiary_liability_grounds_known_date_apk: '2022-04-05',
    objective_cap_event: 'bankruptcy_declared',
    bankruptcy_declared_date_apk: '2023-01-01',
    subsidiary_liability_conduct_date_apk: '2018-01-01',
  });
  // В caps — СЫРАЯ дата потолка: отдельный потолок сам по себе не является
  // последним днём срока, им становится только минимум.
  assert.equal(term.caps.subjective, '2025-04-05'); // суббота
  assert.ok(!isWorkingDay('2025-04-05'));
  assert.equal(term.deadline, '2025-04-07'); // перенос на понедельник
});

test('субсидиарная ответственность (п. 5): сравнение идёт по СЫРЫМ датам — ложной ничьи при переносе не возникает', () => {
  // Краевой случай, ради которого потолки сравниваются до переноса: субъективный
  // потолок даёт 05.04.2025 (суббота), объективный — 06.04.2025 (воскресенье),
  // и оба переносятся на 07.04.2025. Сравнение по перенесённым датам объявило
  // бы ничью, хотя юридически срок ограничил именно субъективный потолок — он
  // истекает раньше. Итоговый дедлайн при этом одинаков в обоих порядках
  // (перенос монотонен), расходится только binding.
  const term = computeSubsidiaryLiabilityInCaseApk({
    subsidiary_liability_grounds_known_date_apk: '2022-04-05',
    objective_cap_event: 'bankruptcy_declared',
    bankruptcy_declared_date_apk: '2022-04-06',
    subsidiary_liability_conduct_date_apk: '2018-01-01',
  });
  assert.equal(term.caps.subjective, '2025-04-05');
  assert.equal(term.caps.objective, '2025-04-06');
  assert.notEqual(term.caps.subjective, term.caps.objective); // сырые даты различаются
  assert.deepEqual(term.binding, ['subjective']); // ничьи нет
  assert.equal(term.deadline, '2025-04-07'); // но переносятся оба в один день
});

test('субсидиарная ответственность (п. 5): отсутствующий или неизвестный objective_cap_event — понятная ошибка', () => {
  const base = {
    subsidiary_liability_grounds_known_date_apk: '2022-03-10',
    subsidiary_liability_conduct_date_apk: '2020-01-01',
  };
  assert.throws(() => computeSubsidiaryLiabilityInCaseApk(base), /objective_cap_event/);
  assert.throws(
    () => computeSubsidiaryLiabilityInCaseApk({ ...base, objective_cap_event: 'something_else' }),
    /objective_cap_event/,
  );
  // Дискриминатор выбран, но соответствующей ему даты нет.
  assert.throws(
    () =>
      computeSubsidiaryLiabilityInCaseApk({ ...base, objective_cap_event: 'bankruptcy_declared' }),
    /bankruptcy_declared_date_apk/,
  );
});

test('субсидиарная ответственность (п. 5): отсутствие любого обязательного поля — понятная ошибка', () => {
  const full = {
    subsidiary_liability_grounds_known_date_apk: '2022-03-10',
    objective_cap_event: 'bankruptcy_declared',
    bankruptcy_declared_date_apk: '2023-06-01',
    subsidiary_liability_conduct_date_apk: '2020-01-01',
  };
  const without = (field) => {
    const copy = { ...full };
    delete copy[field];
    return copy;
  };
  assert.throws(
    () => computeSubsidiaryLiabilityInCaseApk(without('subsidiary_liability_grounds_known_date_apk')),
    /subsidiary_liability_grounds_known_date_apk/,
  );
  assert.throws(
    () => computeSubsidiaryLiabilityInCaseApk(without('subsidiary_liability_conduct_date_apk')),
    /subsidiary_liability_conduct_date_apk/,
  );
});

// --- П. 6: заявление после завершения конкурсного производства ----------------

test('субсидиарная ответственность (п. 6): ограничивает трёхлетний потолок от завершения конкурсного производства', () => {
  const term = computeSubsidiaryLiabilityPostConclusionApk({
    bankruptcy_proceeding_conclusion_date_apk: '2022-03-10',
    subsidiary_liability_conduct_date_apk: '2018-01-01',
  });
  assert.equal(term.id, 'subsidiary_liability_post_conclusion_apk');
  assert.equal(term.kind, 'capped_term');
  assert.equal(term.norm.primary, 'п. 6 ст. 61.14 ФЗ № 127-ФЗ');
  assert.deepEqual(term.caps, {
    post_conclusion: '2025-03-10',
    absolute: '2028-01-01',
  });
  assert.deepEqual(term.binding, ['post_conclusion']);
  assert.equal(term.deadline, '2025-03-10');
});

test('субсидиарная ответственность (п. 6): ограничивает десятилетний предел — binding это показывает', () => {
  const term = computeSubsidiaryLiabilityPostConclusionApk({
    bankruptcy_proceeding_conclusion_date_apk: '2024-01-10',
    subsidiary_liability_conduct_date_apk: '2016-05-20',
  });
  assert.deepEqual(term.binding, ['absolute']);
  assert.equal(term.deadline, '2026-05-20');
});

test('субсидиарная ответственность (п. 6): ничья — оба потолка дают одну дату', () => {
  const term = computeSubsidiaryLiabilityPostConclusionApk({
    bankruptcy_proceeding_conclusion_date_apk: '2022-09-15', // + 3 года
    subsidiary_liability_conduct_date_apk: '2015-09-15', // + 10 лет — та же дата
  });
  assert.equal(term.caps.post_conclusion, term.caps.absolute);
  assert.deepEqual(term.binding, ['post_conclusion', 'absolute']);
  assert.equal(term.deadline, '2025-09-15');
});

test('субсидиарная ответственность (п. 6): перенос применяется к итоговому дедлайну', () => {
  const term = computeSubsidiaryLiabilityPostConclusionApk({
    bankruptcy_proceeding_conclusion_date_apk: '2022-04-05',
    subsidiary_liability_conduct_date_apk: '2018-01-01',
  });
  assert.equal(term.caps.post_conclusion, '2025-04-05'); // суббота, сырая
  assert.equal(term.deadline, '2025-04-07');
});

test('субсидиарная ответственность (п. 6): отсутствие любого обязательного поля — понятная ошибка', () => {
  assert.throws(
    () =>
      computeSubsidiaryLiabilityPostConclusionApk({
        subsidiary_liability_conduct_date_apk: '2018-01-01',
      }),
    /bankruptcy_proceeding_conclusion_date_apk/,
  );
  assert.throws(
    () =>
      computeSubsidiaryLiabilityPostConclusionApk({
        bankruptcy_proceeding_conclusion_date_apk: '2022-03-10',
      }),
    /subsidiary_liability_conduct_date_apk/,
  );
});

// --- Restoration: два года от УЖЕ ВЫЧИСЛЕННОГО дедлайна базового узла ---------

test('восстановление срока (п. 5): два года от итогового дедлайна основного срока', () => {
  const inputs = {
    subsidiary_liability_grounds_known_date_apk: '2022-03-10',
    objective_cap_event: 'bankruptcy_declared',
    bankruptcy_declared_date_apk: '2023-06-01',
    subsidiary_liability_conduct_date_apk: '2020-01-01',
  };
  const base = computeSubsidiaryLiabilityInCaseApk(inputs);
  const term = computeSubsidiaryLiabilityInCaseApkRestoration(inputs);
  assert.equal(term.id, 'subsidiary_liability_in_case_apk_restoration');
  // Якорь — именно дедлайн базового узла, а не какая-либо из исходных дат.
  assert.equal(term.anchor, base.deadline);
  assert.equal(term.anchor, '2025-03-10');
  assert.equal(term.deadline, '2027-03-10');
  assert.deepEqual(term.duration, { value: 2, unit: 'year' });
});

test('восстановление срока (п. 5): якорь — ПЕРЕНЕСЁННЫЙ дедлайн базового узла, без повторного переноса', () => {
  // База: сырой минимум 05.04.2025 (суббота) → перенесённый дедлайн 07.04.2025.
  // Восстановление отсчитывается от 07.04.2025, а не от 05.04.2025.
  const inputs = {
    subsidiary_liability_grounds_known_date_apk: '2022-04-05',
    objective_cap_event: 'bankruptcy_declared',
    bankruptcy_declared_date_apk: '2023-01-01',
    subsidiary_liability_conduct_date_apk: '2018-01-01',
  };
  const base = computeSubsidiaryLiabilityInCaseApk(inputs);
  assert.equal(base.caps.subjective, '2025-04-05');
  assert.equal(base.deadline, '2025-04-07');

  const term = computeSubsidiaryLiabilityInCaseApkRestoration(inputs);
  assert.equal(term.anchor, '2025-04-07'); // перенесённый, не сырой
  assert.equal(term.deadline, '2027-04-07');
});

test('восстановление срока (п. 5): без полей базового узла — та же ошибка, что у базового расчёта', () => {
  // Подтверждает, что restoration считает базовый срок, а не работает от
  // независимого поля: валидация приходит из базовой compute-функции.
  assert.throws(
    () => computeSubsidiaryLiabilityInCaseApkRestoration({}),
    /subsidiary_liability_grounds_known_date_apk/,
  );
  assert.throws(
    () =>
      computeSubsidiaryLiabilityInCaseApkRestoration({
        subsidiary_liability_grounds_known_date_apk: '2022-03-10',
        subsidiary_liability_conduct_date_apk: '2020-01-01',
      }),
    /objective_cap_event/,
  );
});

test('восстановление срока (п. 6): два года от итогового дедлайна, с переносом', () => {
  const inputs = {
    bankruptcy_proceeding_conclusion_date_apk: '2023-03-04',
    subsidiary_liability_conduct_date_apk: '2018-01-01',
  };
  const base = computeSubsidiaryLiabilityPostConclusionApk(inputs);
  const term = computeSubsidiaryLiabilityPostConclusionApkRestoration(inputs);
  assert.equal(term.id, 'subsidiary_liability_post_conclusion_apk_restoration');
  assert.equal(term.anchor, base.deadline);
  assert.equal(term.anchor, '2026-03-04');
  // 04.03.2026 + 2 года = 04.03.2028 — суббота, перенос на понедельник.
  assert.equal(term.raw_deadline, '2028-03-04');
  assert.ok(!isWorkingDay('2028-03-04'));
  assert.equal(term.deadline, '2028-03-06');
  assert.equal(term.shifted, true);
});

test('восстановление срока (п. 6): без полей базового узла — та же ошибка, что у базового расчёта', () => {
  assert.throws(
    () => computeSubsidiaryLiabilityPostConclusionApkRestoration({}),
    /bankruptcy_proceeding_conclusion_date_apk/,
  );
  assert.throws(
    () =>
      computeSubsidiaryLiabilityPostConclusionApkRestoration({
        bankruptcy_proceeding_conclusion_date_apk: '2022-03-10',
      }),
    /subsidiary_liability_conduct_date_apk/,
  );
});

// --- markExpired: расширение на kind: 'capped_term' (core/view/cards.js) ------

test("markExpired: карточка kind 'capped_term' помечается истёкшей наравне с обычным term", () => {
  // До этой задачи markExpired фильтровала буквально по kind === 'term', и
  // карточка узла-потолка молча проходила бы мимо пометки. Расширение —
  // единственная правка core/view/cards.js в этой задаче.
  const config = { factInputMap: {}, missedFromFilingIds: new Set() };
  const cards = [
    { id: 'capped', kind: 'capped_term', status: 'computed', deadline: '2025-03-10' },
    { id: 'plain', kind: 'term', status: 'computed', deadline: '2025-03-10' },
    { id: 'window', kind: 'window', status: 'computed', deadline: '2025-03-10' },
  ];
  markExpired(cards, {}, '2025-06-01', config);

  const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
  assert.equal(byId.capped.status, 'expired');
  assert.equal(byId.capped.expired.days, 83);
  // Обычный term ведёт себя как прежде — расширение его не изменило.
  assert.equal(byId.plain.status, 'expired');
  assert.equal(byId.plain.expired.days, 83);
  // Прочие kind по-прежнему не помечаются: расширение точечное, не общее.
  assert.equal(byId.window.status, 'computed');
  assert.equal(byId.window.expired, undefined);
});

test("markExpired: 'capped_term' с дедлайном в будущем не помечается", () => {
  const config = { factInputMap: {}, missedFromFilingIds: new Set() };
  const cards = [{ id: 'capped', kind: 'capped_term', status: 'computed', deadline: '2030-01-15' }];
  markExpired(cards, {}, '2025-06-01', config);
  assert.equal(cards[0].status, 'computed');
});
