// Тесты домена банкротства (apk/bankruptcy.js) — задачи БАНКРОТСТВО.1
// (ст. 47 п. 1, working_day), БАНКРОТСТВО.2.1 (ст. 71 п. 1, calendar_day),
// БАНКРОТСТВО.3 (ст. 71 п. 8, обычный месячный узел), БАНКРОТСТВО.4
// (ст. 142 п. 1, обычный месячный узел) и БАНКРОТСТВО.5 (ст. 213.8 п. 2,
// обычный месячный узел, первый для процедуры банкротства гражданина).
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
} from '../apk/bankruptcy.js';
import { isWorkingDay } from '../core/calendar/calendar.js';

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
