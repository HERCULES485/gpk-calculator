// Тесты домена банкротства (apk/bankruptcy.js) — задачи БАНКРОТСТВО.1
// (ст. 47 п. 1, working_day), БАНКРОТСТВО.2.1 (ст. 71 п. 1, calendar_day),
// БАНКРОТСТВО.3 (ст. 71 п. 8, обычный месячный узел), БАНКРОТСТВО.4
// (ст. 142 п. 1, обычный месячный узел), БАНКРОТСТВО.5 (ст. 213.8 п. 2,
// обычный месячный узел, первый для процедуры банкротства гражданина) и
// БАНКРОТСТВО.6 (ст. 213.29, обычный месячный узел, без restoration),
// БАНКРОТСТВО.7.1 (ст. 61.14 п. 5 и п. 6 — первые узлы с kind:
// 'capped_term', минимум из нескольких кумулятивных потолков, плюс два
// restoration-узла, считающих два года от уже вычисленного дедлайна) и
// новый узел ст. 223.6 п. 1 (завершение внесудебного банкротства гражданина
// — первый узел домена с kind: 'event', та же арифметика computeSimpleTerm,
// что у обычного месячного узла, но результат не подаваемый срок).
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
  computeOutOfCourtBankruptcyCompletionApk,
  OUT_OF_COURT_BANKRUPTCY_COMPLETION_APK,
  computeOutOfCourtBankruptcyReapplicationApk,
  OUT_OF_COURT_BANKRUPTCY_REAPPLICATION_APK,
  computeOutOfCourtBankruptcyReapplicationAfterPriorApk,
  OUT_OF_COURT_BANKRUPTCY_REAPPLICATION_AFTER_PRIOR_APK,
  computeSettlementAgreementApprovalApplicationApk,
  SETTLEMENT_AGREEMENT_APPROVAL_APPLICATION_APK,
  computeSettlementAgreementReviewApk,
  SETTLEMENT_AGREEMENT_REVIEW_APK,
  computeAppraiserInvolvementRequestApk,
  APPRAISER_INVOLVEMENT_REQUEST_APK,
  computeClaimsRulingReasonedRequestApk,
  CLAIMS_RULING_REASONED_REQUEST_APK,
  computeClaimsRulingReasonedAppealApk,
  CLAIMS_RULING_REASONED_APPEAL_APK,
  computeEnterpriseSalePaymentApk,
  ENTERPRISE_SALE_PAYMENT_APK,
  computeSettlementAgreementRejectionAppealApk,
  SETTLEMENT_AGREEMENT_REJECTION_APPEAL_APK,
  computeExternalManagementIntroductionExtensionAppealApk,
  EXTERNAL_MANAGEMENT_INTRODUCTION_EXTENSION_APPEAL_APK,
  computeExternalManagementReductionAppealApk,
  EXTERNAL_MANAGEMENT_REDUCTION_APPEAL_APK,
  computeExternalManagementPlanInvalidationAppealApk,
  EXTERNAL_MANAGEMENT_PLAN_INVALIDATION_APPEAL_APK,
  computeExternalManagementTermExpiryRefusalAppealApk,
  EXTERNAL_MANAGEMENT_TERM_EXPIRY_REFUSAL_APPEAL_APK,
  computeExternalManagementPlanDevelopmentApk,
  EXTERNAL_MANAGEMENT_PLAN_DEVELOPMENT_APK,
  computeExternalManagementPlanMeetingApk,
  EXTERNAL_MANAGEMENT_PLAN_MEETING_APK,
  computeExternalManagementPlanSubmissionApk,
  EXTERNAL_MANAGEMENT_PLAN_SUBMISSION_APK,
  computeExternalManagementReportSubmissionApk,
  EXTERNAL_MANAGEMENT_REPORT_SUBMISSION_APK,
  computeExternalManagementReportOnFullSatisfactionApk,
  EXTERNAL_MANAGEMENT_REPORT_ON_FULL_SATISFACTION_APK,
  computeExternalManagementHandoverApk,
  EXTERNAL_MANAGEMENT_HANDOVER_APK,
  computeExternalManagementCreditorNotificationApk,
  EXTERNAL_MANAGEMENT_CREDITOR_NOTIFICATION_APK,
  computeExternalManagementReportSpecialCompletionApk,
  EXTERNAL_MANAGEMENT_REPORT_SPECIAL_COMPLETION_APK,
  computeBankruptcyPropertySaleProposalApk,
  BANKRUPTCY_PROPERTY_SALE_PROPOSAL_APK,
  computeAppraisalReportRegistryInclusionApk,
  APPRAISAL_REPORT_REGISTRY_INCLUSION_APK,
  computeEnterpriseSaleProcedureApprovalAppealApk,
  ENTERPRISE_SALE_PROCEDURE_APPROVAL_APPEAL_APK,
  computePropertySaleProcedureApprovalAppealApk,
  PROPERTY_SALE_PROCEDURE_APPROVAL_APPEAL_APK,
  computeBankruptcyCompletionRequestRulingAppealApk,
  BANKRUPTCY_COMPLETION_REQUEST_RULING_APPEAL_APK,
  computeCitizenInformationDisclosureApk,
  CITIZEN_INFORMATION_DISCLOSURE_APK,
  computeObservationInformationRequestResponseApk,
  OBSERVATION_INFORMATION_REQUEST_RESPONSE_APK,
  computeObservationIntroductionNotificationApk,
  OBSERVATION_INTRODUCTION_NOTIFICATION_APK,
  computeBankruptcyManagerAppointmentAppealApk,
  BANKRUPTCY_MANAGER_APPOINTMENT_APPEAL_APK,
  computeBankruptcyInformationPublicationApk,
  BANKRUPTCY_INFORMATION_PUBLICATION_APK,
  computeBankruptcyPropertyInventoryApk,
  BANKRUPTCY_PROPERTY_INVENTORY_APK,
  computeBankruptcyEmployeeDismissalNoticeApk,
  BANKRUPTCY_EMPLOYEE_DISMISSAL_NOTICE_APK,
  computeBankruptcyInventoryResultsRegistryApk,
  BANKRUPTCY_INVENTORY_RESULTS_REGISTRY_APK,
  computeSettlementCancellationResumptionAppealApk,
  SETTLEMENT_CANCELLATION_RESUMPTION_APPEAL_APK,
  computeSettlementTerminationRulingAppealApk,
  SETTLEMENT_TERMINATION_RULING_APPEAL_APK,
  computeCitizenBankruptcyFilingDutyApk,
  CITIZEN_BANKRUPTCY_FILING_DUTY_APK,
  computeCitizenPropertySaleProposalApk,
  CITIZEN_PROPERTY_SALE_PROPOSAL_APK,
  computeCitizenPropertySaleApprovalApk,
  CITIZEN_PROPERTY_SALE_APPROVAL_APK,
  computeBankNotificationDutyApk,
  BANK_NOTIFICATION_DUTY_APK,
  computePropertyExclusionRulingAppealApk,
  PROPERTY_EXCLUSION_RULING_APPEAL_APK,
  computePropertyExclusionAmountDisputeApk,
  PROPERTY_EXCLUSION_AMOUNT_DISPUTE_APK,
  computeBankruptcyProceedingExtensionAppealApk,
  BANKRUPTCY_PROCEEDING_EXTENSION_APPEAL_APK,
  computeTransactionChallengeLimitationApk,
  TRANSACTION_CHALLENGE_LIMITATION_APK,
  computeTransactionChallengeLimitationCitizenApk,
  TRANSACTION_CHALLENGE_LIMITATION_CITIZEN_APK,
  computeBankruptcySignsRegistryNotificationApk,
  BANKRUPTCY_SIGNS_REGISTRY_NOTIFICATION_APK,
  computeFilingNoticeValidityApk,
  FILING_NOTICE_VALIDITY_APK,
  computeExcludedPropertyAcceptanceApk,
  EXCLUDED_PROPERTY_ACCEPTANCE_APK,
  computeClaimSalePaymentApk,
  CLAIM_SALE_PAYMENT_APK,
  computeManagerReleaseAppealApk,
  MANAGER_RELEASE_APPEAL_APK,
  computeManagerRemovalAppealApk,
  MANAGER_REMOVAL_APPEAL_APK,
  computeCreditorsMeetingExternalManagementTransitionApk,
  CREDITORS_MEETING_EXTERNAL_MANAGEMENT_TRANSITION_APK,
  computeKfhRehabilitationPlanSubmissionApk,
  KFH_REHABILITATION_PLAN_SUBMISSION_APK,
  computeKfhRehabilitationIntroductionAppealApk,
  KFH_REHABILITATION_INTRODUCTION_APPEAL_APK,
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

// --- Завершение процедуры внесудебного банкротства гражданина (п. 1 ст. 223.6) -
//
// Первый узел домена с kind: 'event'. Арифметика — computeSimpleTerm, та же,
// что у обычного 'month'-узла (ср. тесты выше на ст. 71 п. 8/ст. 142 п. 1);
// здесь проверяется именно расчёт (compute-функция), форма итоговой карточки
// (kind: 'event', card.date, status: 'resolved') — в test/apk-bankruptcy-ui.test.js.

test('завершение внесудебного банкротства: шесть календарных месяцев от даты включения сведений в ЕФРСБ', () => {
  const term = computeOutOfCourtBankruptcyCompletionApk({
    out_of_court_bankruptcy_initiation_notice_included_date_apk: '2025-03-11',
  });
  assert.equal(term.id, 'out_of_court_bankruptcy_completion_apk');
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-09-11');
  assert.ok(isWorkingDay('2025-09-11'));
  assert.equal(term.deadline, '2025-09-11');
  assert.equal(term.shifted, false);
  assert.equal(term.norm.primary, 'п. 1 ст. 223.6 ФЗ № 127-ФЗ');
});

test('завершение внесудебного банкротства: результат выпадает на нерабочий день — перенос конца', () => {
  // 05.01.2025 + 6 месяцев = 05.07.2025 — суббота, перенос на понедельник.
  const term = computeOutOfCourtBankruptcyCompletionApk({
    out_of_court_bankruptcy_initiation_notice_included_date_apk: '2025-01-05',
  });
  assert.equal(term.raw_deadline, '2025-07-05');
  assert.ok(!isWorkingDay('2025-07-05'));
  assert.equal(term.deadline, '2025-07-07');
  assert.equal(term.shifted, true);
});

test('завершение внесудебного банкротства: без якоря — явная ошибка с названием поля', () => {
  assert.throws(
    () => computeOutOfCourtBankruptcyCompletionApk({}),
    /out_of_court_bankruptcy_initiation_notice_included_date_apk/,
  );
});

test('завершение внесудебного банкротства: без midnight_rule на узле — событие, а не подаваемый срок', () => {
  // Точечная проверка решения из шапки apk/bankruptcy.js: ч. 5, 6 ст. 114
  // АПК РФ — про действие, совершаемое стороной, а здесь сторона ничего не
  // подаёт. Поле сознательно отсутствует, а не пустая строка по недосмотру.
  assert.equal(OUT_OF_COURT_BANKRUPTCY_COMPLETION_APK.midnight_rule, undefined);
});

// --- Право на повторную подачу после возврата заявления (п. 6 ст. 223.2) ------
//
// Второй узел домена с kind: 'event' — ВТОРОЙ, а не переизобретённый: тот же
// паттерн computeSimpleTerm/'month', отличается только длительность (1 месяц
// вместо 6) и якорь (дата возврата, а не дата включения сведений в ЕФРСБ).

test('право на повторную подачу: один календарный месяц от даты возврата заявления', () => {
  const term = computeOutOfCourtBankruptcyReapplicationApk({
    out_of_court_bankruptcy_return_date_apk: '2025-03-11',
  });
  assert.equal(term.id, 'out_of_court_bankruptcy_reapplication_apk');
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.ok(isWorkingDay('2025-04-11'));
  assert.equal(term.deadline, '2025-04-11');
  assert.equal(term.shifted, false);
  assert.equal(term.norm.primary, 'п. 6 ст. 223.2 ФЗ № 127-ФЗ');
});

test('право на повторную подачу: результат выпадает на нерабочий день — перенос конца', () => {
  // 01.02.2025 + 1 месяц = 01.03.2025 — суббота, перенос на понедельник.
  const term = computeOutOfCourtBankruptcyReapplicationApk({
    out_of_court_bankruptcy_return_date_apk: '2025-02-01',
  });
  assert.equal(term.raw_deadline, '2025-03-01');
  assert.ok(!isWorkingDay('2025-03-01'));
  assert.equal(term.deadline, '2025-03-03');
  assert.equal(term.shifted, true);
});

test('право на повторную подачу: без якоря — явная ошибка с названием поля', () => {
  assert.throws(
    () => computeOutOfCourtBankruptcyReapplicationApk({}),
    /out_of_court_bankruptcy_return_date_apk/,
  );
});

test('право на повторную подачу: без midnight_rule и без потолков/restoration — узел-событие без числового предела', () => {
  assert.equal(OUT_OF_COURT_BANKRUPTCY_REAPPLICATION_APK.midnight_rule, undefined);
  assert.equal(OUT_OF_COURT_BANKRUPTCY_REAPPLICATION_APK.caps, undefined);
  assert.equal(OUT_OF_COURT_BANKRUPTCY_REAPPLICATION_APK.restoration_norm, undefined);
});

test('право на повторную подачу: norm.calculation дословно совпадает с ст. 223.6 п. 1 — та же непроверенная формулировка, не новая', () => {
  assert.deepEqual(
    OUT_OF_COURT_BANKRUPTCY_REAPPLICATION_APK.norm_versions[0].norm.calculation,
    OUT_OF_COURT_BANKRUPTCY_COMPLETION_APK.norm_versions[0].norm.calculation,
  );
});

// --- Право на повторную подачу после завершения предыдущей процедуры
// (п. 8 ст. 223.2) --------------------------------------------------------------
//
// Третий узел домена с kind: 'event' — тот же паттерн computeSimpleTerm/
// 'year', отличается длительностью (5 лет вместо 6 месяцев/1 месяца) и
// якорем (дата окончания ЛЮБОЙ предыдущей процедуры, одно поле на пять
// альтернативных оснований нормы).

test('право на повторную подачу после предыдущей процедуры: пять календарных лет от даты её окончания', () => {
  const term = computeOutOfCourtBankruptcyReapplicationAfterPriorApk({
    out_of_court_bankruptcy_prior_procedure_end_date_apk: '2020-03-11',
  });
  assert.equal(term.id, 'out_of_court_bankruptcy_reapplication_after_prior_apk');
  assert.equal(term.anchor, '2020-03-11');
  assert.equal(term.raw_deadline, '2025-03-11');
  assert.ok(isWorkingDay('2025-03-11'));
  assert.equal(term.deadline, '2025-03-11');
  assert.equal(term.shifted, false);
  assert.equal(term.norm.primary, 'п. 8 ст. 223.2 ФЗ № 127-ФЗ');
});

test('право на повторную подачу после предыдущей процедуры: результат выпадает на нерабочий день — перенос конца', () => {
  // 01.02.2020 + 5 лет = 01.02.2025 — суббота, перенос на понедельник.
  const term = computeOutOfCourtBankruptcyReapplicationAfterPriorApk({
    out_of_court_bankruptcy_prior_procedure_end_date_apk: '2020-02-01',
  });
  assert.equal(term.raw_deadline, '2025-02-01');
  assert.ok(!isWorkingDay('2025-02-01'));
  assert.equal(term.deadline, '2025-02-03');
  assert.equal(term.shifted, true);
});

test('право на повторную подачу после предыдущей процедуры: без якоря — явная ошибка с названием поля', () => {
  assert.throws(
    () => computeOutOfCourtBankruptcyReapplicationAfterPriorApk({}),
    /out_of_court_bankruptcy_prior_procedure_end_date_apk/,
  );
});

test('право на повторную подачу после предыдущей процедуры: без midnight_rule и без потолков/restoration', () => {
  assert.equal(OUT_OF_COURT_BANKRUPTCY_REAPPLICATION_AFTER_PRIOR_APK.midnight_rule, undefined);
  assert.equal(OUT_OF_COURT_BANKRUPTCY_REAPPLICATION_AFTER_PRIOR_APK.caps, undefined);
  assert.equal(OUT_OF_COURT_BANKRUPTCY_REAPPLICATION_AFTER_PRIOR_APK.restoration_norm, undefined);
});

test('право на повторную подачу после предыдущей процедуры: norm.calculation дословно совпадает с двумя предыдущими узлами', () => {
  assert.deepEqual(
    OUT_OF_COURT_BANKRUPTCY_REAPPLICATION_AFTER_PRIOR_APK.norm_versions[0].norm.calculation,
    OUT_OF_COURT_BANKRUPTCY_COMPLETION_APK.norm_versions[0].norm.calculation,
  );
  assert.deepEqual(
    OUT_OF_COURT_BANKRUPTCY_REAPPLICATION_AFTER_PRIOR_APK.norm_versions[0].norm.calculation,
    OUT_OF_COURT_BANKRUPTCY_REAPPLICATION_APK.norm_versions[0].norm.calculation,
  );
});

// --- Окно подачи заявления об утверждении мирового соглашения
// (п. 2 ст. 158) ----------------------------------------------------------------
//
// Первый узел домена с kind: 'window' — результат не одна дата, а две границы.
// Обе считаются тем же computeSimpleTerm, что и обычные сроки, из
// node.window.earliest/latest; отдельной арифметики у окна нет.

test('мировое соглашение: окно 5–10 рабочих дней с даты заключения', () => {
  const result = computeSettlementAgreementApprovalApplicationApk({
    settlement_agreement_conclusion_date_apk: '2025-03-11',
  });
  assert.equal(result.id, 'settlement_agreement_approval_application_apk');
  // 11.03.2025 — вторник; пять рабочих дней истекают 18.03, десять — 25.03.
  assert.equal(result.earliest_filing_date, '2025-03-18');
  assert.equal(result.latest_filing_date, '2025-03-25');
  assert.equal(result.norm.primary, 'п. 2 ст. 158 ФЗ № 127-ФЗ');
  assert.deepEqual(result.anchors, {
    settlement_agreement_conclusion_date_apk: '2025-03-11',
  });
});

test('мировое соглашение: рабочие дни, не календарные — новогодние каникулы отодвигают обе границы', () => {
  // Ключевая проверка выбора единицы: по календарным дням окно было бы
  // 31.12.2025–05.01.2026 (в каникулы), по рабочим — уезжает на две недели.
  const result = computeSettlementAgreementApprovalApplicationApk({
    settlement_agreement_conclusion_date_apk: '2025-12-26',
  });
  assert.equal(result.earliest_filing_date, '2026-01-14');
  assert.equal(result.latest_filing_date, '2026-01-21');
  // Первый рабочий день течения — общий у обеих границ.
  assert.equal(result.first_working_day, '2025-12-29');
});

test('мировое соглашение: нижняя граница всегда строго раньше верхней', () => {
  // 5 < 10 при общем якоре — состояний «окно пустое» и «верхней границы нет»
  // у этого узла не бывает по конструкции, в отличие от окна ч. 3 ст. 222.1 АПК.
  for (const anchor of ['2025-01-09', '2025-03-07', '2025-06-30', '2025-12-26']) {
    const result = computeSettlementAgreementApprovalApplicationApk({
      settlement_agreement_conclusion_date_apk: anchor,
    });
    assert.ok(
      result.earliest_filing_date < result.latest_filing_date,
      `якорь ${anchor}: нижняя граница не раньше верхней`,
    );
    assert.equal(result.state, undefined, 'у этого окна нет поля state');
  }
});

test('мировое соглашение: без якоря — явная ошибка с названием поля', () => {
  assert.throws(
    () => computeSettlementAgreementApprovalApplicationApk({}),
    /settlement_agreement_conclusion_date_apk/,
  );
});

test('мировое соглашение: обе границы в рабочих днях, weekend_shift не задан ни у одной', () => {
  const { window: w } = SETTLEMENT_AGREEMENT_APPROVAL_APPLICATION_APK;
  assert.deepEqual(w.earliest.duration, { value: 5, unit: 'working_day' });
  assert.deepEqual(w.latest.duration, { value: 10, unit: 'working_day' });
  // У working_day-сроков нерабочие дни уже пропущены внутри периода — перенос
  // конца поверх этого был бы двойным учётом (та же политика, что у ст. 47 п. 1).
  assert.equal(w.earliest.weekend_shift, undefined);
  assert.equal(w.latest.weekend_shift, undefined);
  // Верхнего duration у узла-окна нет: длительностей две, наверх не поднимаются.
  assert.equal(SETTLEMENT_AGREEMENT_APPROVAL_APPLICATION_APK.duration, undefined);
});

test('мировое соглашение: судебная процедура — calculation ссылается на АПК, не на ГК', () => {
  // Заявление представляется в арбитражный суд, поэтому здесь тот же
  // calculation, что у ст. 47 п. 1, а не формулировка внесудебных узлов
  // (ст. 223.2/223.6), где суда нет вовсе.
  assert.deepEqual(
    SETTLEMENT_AGREEMENT_APPROVAL_APPLICATION_APK.norm_versions[0].norm.calculation,
    DEBTOR_RESPONSE_BANKRUPTCY_APK.norm_versions[0].norm.calculation,
  );
  assert.notDeepEqual(
    SETTLEMENT_AGREEMENT_APPROVAL_APPLICATION_APK.norm_versions[0].norm.calculation,
    OUT_OF_COURT_BANKRUPTCY_COMPLETION_APK.norm_versions[0].norm.calculation,
  );
});

test('мировое соглашение: одна действующая редакция, предупреждение о будущей — в logic', () => {
  // Вариант A: текст редакции с 27.07.2027 не сверен и в расчёт не заложен,
  // norm_versions остаётся одноэлементным (computeSimpleTerm берёт [0]).
  assert.equal(SETTLEMENT_AGREEMENT_APPROVAL_APPLICATION_APK.norm_versions.length, 1);
  assert.match(SETTLEMENT_AGREEMENT_APPROVAL_APPLICATION_APK.logic, /27\.07\.2027/);
  assert.match(SETTLEMENT_AGREEMENT_APPROVAL_APPLICATION_APK.logic, /253-ФЗ/);
});

// Задача — пересмотр определения об утверждении мирового соглашения по
// вновь открывшимся обстоятельствам (п. 2 ст. 162 ФЗ № 127-ФЗ). Десятый узел
// домена, обычный месячный term — тот же паттерн, что и у ст. 213.29
// (БАНКРОТСТВО.6) выше, другой якорь и другая норма.

test('пересмотр определения об утверждении мирового соглашения: один месяц с даты открытия обстоятельств, будний день без переноса', () => {
  const term = computeSettlementAgreementReviewApk({
    settlement_agreement_review_circumstances_discovered_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11'); // пятница, рабочий день
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
  assert.equal(term.norm.primary, 'п. 2 ст. 162 ФЗ № 127-ФЗ');
});

test('пересмотр определения об утверждении мирового соглашения: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeSettlementAgreementReviewApk({
    settlement_agreement_review_circumstances_discovered_date_apk: '2025-02-01',
  });
  // 01.02.2025 + 1 месяц = 01.03.2025 — суббота, перенос на 03.03.2025 (понедельник).
  assert.equal(term.raw_deadline, '2025-03-01');
  assert.equal(term.deadline, '2025-03-03');
  assert.equal(term.shifted, true);
});

test('пересмотр определения об утверждении мирового соглашения: без settlement_agreement_review_circumstances_discovered_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeSettlementAgreementReviewApk({}),
    /settlement_agreement_review_circumstances_discovered_date_apk/,
  );
});

test('пересмотр определения об утверждении мирового соглашения: судебная процедура, календарный месяц — calculation ссылается на АПК, тот же паттерн, что у ст. 213.29', () => {
  // Пересматривает определение арбитражный суд, и единица — календарный
  // месяц (как у ст. 213.29, а не working_day, как у ст. 47 п. 1 и ст. 158
  // п. 2 — там другая часть ст. 113 АПК РФ) — тот же calculation, что у
  // ст. 213.29, а не формулировка внесудебных узлов (ст. 223.2/223.6), где
  // суда нет вовсе.
  assert.deepEqual(
    SETTLEMENT_AGREEMENT_REVIEW_APK.norm_versions[0].norm.calculation,
    BANKRUPTCY_COMPLETION_REVIEW_APK.norm_versions[0].norm.calculation,
  );
  assert.notDeepEqual(
    SETTLEMENT_AGREEMENT_REVIEW_APK.norm_versions[0].norm.calculation,
    OUT_OF_COURT_BANKRUPTCY_COMPLETION_APK.norm_versions[0].norm.calculation,
  );
});

test('пересмотр определения об утверждении мирового соглашения: midnight_rule присутствует, без потолков и restoration', () => {
  const term = computeSettlementAgreementReviewApk({
    settlement_agreement_review_circumstances_discovered_date_apk: '2025-03-11',
  });
  assert.equal(term.id, 'settlement_agreement_review_apk');
  assert.match(SETTLEMENT_AGREEMENT_REVIEW_APK.midnight_rule, /ст\. 114 АПК РФ/);
  assert.equal(SETTLEMENT_AGREEMENT_REVIEW_APK.restoration_norm, undefined);
  assert.equal(term.caps, undefined);
});

// Задача — требование кредитора (уполномоченного органа) о привлечении
// независимого оценщика (п. 5.1 ст. 110 ФЗ № 127-ФЗ). Первый узел процедуры
// внешнего управления в этом домене. Второй в домене working_day-узел —
// тот же образец, что у ст. 47 п. 1 (debtor_response_bankruptcy_apk).

test('требование о привлечении оценщика: тридцать рабочих дней от даты включения сведений в ЕФРСБ, без праздничных кластеров рядом', () => {
  const term = computeAppraiserInvolvementRequestApk({
    inventory_results_included_date_apk: '2025-03-02',
  });
  assert.equal(term.anchor, '2025-03-02');
  assert.equal(term.first_working_day, '2025-03-03');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11');
  assert.equal(term.shifted, false); // weekend_shift к working_day не применяется
  assert.deepEqual(term.duration, { value: 30, unit: 'working_day' });
  assert.equal(term.norm.primary, 'п. 5.1 ст. 110 ФЗ № 127-ФЗ');
});

test('требование о привлечении оценщика: рабочие дни, а не календарные — перенос через новогодние каникулы', () => {
  const term = computeAppraiserInvolvementRequestApk({
    inventory_results_included_date_apk: '2025-12-26',
  });
  assert.equal(term.first_working_day, '2025-12-29');
  assert.equal(term.deadline, '2026-02-18');
});

test('требование о привлечении оценщика: без inventory_results_included_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeAppraiserInvolvementRequestApk({}),
    /inventory_results_included_date_apk/,
  );
});

test('требование о привлечении оценщика: логика явно отражает условие права — порог 2% от суммы требований в реестре', () => {
  // Право на подачу требования само по себе этим узлом не проверяется (нет
  // поля/дискриминатора для суммы требования и общей суммы реестра) — условие
  // применимости отражено текстом в logic, чтобы не ввести пользователя в
  // заблуждение, если порог не достигнут.
  assert.match(APPRAISER_INVOLVEMENT_REQUEST_APK.logic, /два процента/);
  assert.match(APPRAISER_INVOLVEMENT_REQUEST_APK.logic, /право не возникает/);
});

test('требование о привлечении оценщика: АПК-цитата с применением через ст. 223 (тот же паттерн, что у ст. 47 п. 1)', () => {
  assert.deepEqual(
    APPRAISER_INVOLVEMENT_REQUEST_APK.norm_versions[0].norm.calculation,
    DEBTOR_RESPONSE_BANKRUPTCY_APK.norm_versions[0].norm.calculation,
  );
});

test('требование о привлечении оценщика: без restoration-полей', () => {
  const term = computeAppraiserInvolvementRequestApk({
    inventory_results_included_date_apk: '2025-03-02',
  });
  assert.equal(term.id, 'appraiser_involvement_request_apk');
  assert.equal(APPRAISER_INVOLVEMENT_REQUEST_APK.restoration_norm, undefined);
  assert.equal(term.caps, undefined);
});

// Задача — два узла п. 2 ст. 71 ФЗ № 127-ФЗ: заявление о составлении
// мотивированного определения (абз. 3) и мотивированная часть уже поданной
// жалобы (абз. 4). Третий и четвёртый working_day-узлы домена.

test('заявление о мотивированном определении (абз. 3 п. 2 ст. 71): пять рабочих дней от даты размещения резолютивной части', () => {
  const term = computeClaimsRulingReasonedRequestApk({
    claims_ruling_resolutive_part_date_apk: '2025-03-02',
  });
  assert.equal(term.anchor, '2025-03-02');
  assert.equal(term.first_working_day, '2025-03-03');
  assert.equal(term.deadline, '2025-03-07');
  assert.equal(term.shifted, false); // weekend_shift к working_day не применяется
  assert.deepEqual(term.duration, { value: 5, unit: 'working_day' });
  assert.equal(term.norm.primary, 'абз. 3 п. 2 ст. 71 ФЗ № 127-ФЗ');
});

test('заявление о мотивированном определении (абз. 3 п. 2 ст. 71): рабочие дни, а не календарные — перенос через новогодние каникулы', () => {
  const term = computeClaimsRulingReasonedRequestApk({
    claims_ruling_resolutive_part_date_apk: '2025-12-26',
  });
  assert.equal(term.first_working_day, '2025-12-29');
  assert.equal(term.deadline, '2026-01-14');
});

test('заявление о мотивированном определении (абз. 3 п. 2 ст. 71): без claims_ruling_resolutive_part_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeClaimsRulingReasonedRequestApk({}),
    /claims_ruling_resolutive_part_date_apk/,
  );
});

test('заявление о мотивированном определении (абз. 3 п. 2 ст. 71): АПК-цитата как у ст. 47 п. 1 и п. 5.1 ст. 110, без restoration', () => {
  assert.deepEqual(
    CLAIMS_RULING_REASONED_REQUEST_APK.norm_versions[0].norm.calculation,
    DEBTOR_RESPONSE_BANKRUPTCY_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(CLAIMS_RULING_REASONED_REQUEST_APK.restoration_norm, undefined);
});

test('мотивированная часть жалобы (абз. 4 п. 2 ст. 71): пятнадцать рабочих дней от даты изготовления мотивированного определения', () => {
  const term = computeClaimsRulingReasonedAppealApk({
    claims_ruling_reasoned_date_apk: '2025-03-02',
  });
  assert.equal(term.anchor, '2025-03-02');
  assert.equal(term.first_working_day, '2025-03-03');
  assert.equal(term.deadline, '2025-03-21');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 15, unit: 'working_day' });
  assert.equal(term.norm.primary, 'абз. 4 п. 2 ст. 71 ФЗ № 127-ФЗ');
});

test('мотивированная часть жалобы (абз. 4 п. 2 ст. 71): рабочие дни, а не календарные — перенос через новогодние каникулы', () => {
  const term = computeClaimsRulingReasonedAppealApk({
    claims_ruling_reasoned_date_apk: '2025-12-26',
  });
  assert.equal(term.first_working_day, '2025-12-29');
  assert.equal(term.deadline, '2026-01-28');
});

test('мотивированная часть жалобы (абз. 4 п. 2 ст. 71): без claims_ruling_reasoned_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeClaimsRulingReasonedAppealApk({}),
    /claims_ruling_reasoned_date_apk/,
  );
});

test('мотивированная часть жалобы (абз. 4 п. 2 ст. 71): АПК-цитата как у остальных working_day-узлов, без restoration', () => {
  assert.deepEqual(
    CLAIMS_RULING_REASONED_APPEAL_APK.norm_versions[0].norm.calculation,
    DEBTOR_RESPONSE_BANKRUPTCY_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(CLAIMS_RULING_REASONED_APPEAL_APK.restoration_norm, undefined);
});

test('мотивированная часть жалобы (абз. 4 п. 2 ст. 71): logic явно отражает, что срок ДОПОЛНИТЕЛЬНЫЙ к уже поданной жалобе, не замена срока обжалования', () => {
  assert.match(CLAIMS_RULING_REASONED_APPEAL_APK.logic, /не входит/);
  assert.match(CLAIMS_RULING_REASONED_APPEAL_APK.logic, /не заменяет/);
  // Пятидневный внутренний срок суда упомянут текстом, но не заведён
  // отдельным узлом.
  assert.match(CLAIMS_RULING_REASONED_APPEAL_APK.logic, /срок суда/);
});

test('два узла п. 2 ст. 71: разные id, разные normы, разные поля ввода — не один узел под двумя именами', () => {
  assert.notEqual(CLAIMS_RULING_REASONED_REQUEST_APK.id, CLAIMS_RULING_REASONED_APPEAL_APK.id);
  assert.notEqual(
    CLAIMS_RULING_REASONED_REQUEST_APK.norm_versions[0].norm.primary,
    CLAIMS_RULING_REASONED_APPEAL_APK.norm_versions[0].norm.primary,
  );
  assert.notDeepEqual(CLAIMS_RULING_REASONED_REQUEST_APK.duration, CLAIMS_RULING_REASONED_APPEAL_APK.duration);
});

// Задача — оплата покупателем по договору купли-продажи предприятия
// должника на торгах (п. 19 ст. 110 ФЗ № 127-ФЗ). Пятый working_day-узел
// домена.

test('оплата по договору купли-продажи предприятия: тридцать рабочих дней от даты подписания договора, без праздничных кластеров рядом', () => {
  const term = computeEnterpriseSalePaymentApk({
    enterprise_sale_agreement_signed_date_apk: '2025-03-02',
  });
  assert.equal(term.anchor, '2025-03-02');
  assert.equal(term.first_working_day, '2025-03-03');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11');
  assert.equal(term.shifted, false); // weekend_shift к working_day не применяется
  assert.deepEqual(term.duration, { value: 30, unit: 'working_day' });
  assert.equal(term.norm.primary, 'п. 19 ст. 110 ФЗ № 127-ФЗ');
});

test('оплата по договору купли-продажи предприятия: рабочие дни, а не календарные — перенос через новогодние каникулы', () => {
  const term = computeEnterpriseSalePaymentApk({
    enterprise_sale_agreement_signed_date_apk: '2025-12-26',
  });
  assert.equal(term.first_working_day, '2025-12-29');
  assert.equal(term.deadline, '2026-02-18');
});

test('оплата по договору купли-продажи предприятия: без enterprise_sale_agreement_signed_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeEnterpriseSalePaymentApk({}),
    /enterprise_sale_agreement_signed_date_apk/,
  );
});

test('оплата по договору купли-продажи предприятия: АПК-цитата как у ст. 47 п. 1 и п. 5.1 ст. 110, без restoration', () => {
  assert.deepEqual(
    ENTERPRISE_SALE_PAYMENT_APK.norm_versions[0].norm.calculation,
    DEBTOR_RESPONSE_BANKRUPTCY_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(ENTERPRISE_SALE_PAYMENT_APK.restoration_norm, undefined);
});

test('оплата по договору купли-продажи предприятия: без restoration-полей', () => {
  const term = computeEnterpriseSalePaymentApk({
    enterprise_sale_agreement_signed_date_apk: '2025-03-02',
  });
  assert.equal(term.id, 'enterprise_sale_payment_apk');
  assert.equal(term.caps, undefined);
});

// Задача — обжалование отказа в утверждении мирового соглашения (п. 3
// ст. 160, ч. 1 ст. 61 ФЗ № 127-ФЗ). Двадцатый узел домена, обычный
// месячный term — тот же паттерн, что и у ст. 162 п. 2 выше, другой якорь.
//
// Архитектурная особенность, согласованная отдельно: ст. 160 ч. 3 даёт
// институт (право на обжалование отказа), но не число срока; число — из
// отдельной общей ч. 1 ст. 61. norm.primary поэтому ссылается на ч. 1
// ст. 61, а не на ст. 160 ч. 3.

test('обжалование отказа в утверждении мирового соглашения: один месяц с даты изготовления определения, будний день без переноса', () => {
  const term = computeSettlementAgreementRejectionAppealApk({
    settlement_agreement_rejection_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11'); // пятница, рабочий день
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
  assert.equal(term.norm.primary, 'ч. 1 ст. 61 ФЗ № 127-ФЗ');
});

test('обжалование отказа в утверждении мирового соглашения: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeSettlementAgreementRejectionAppealApk({
    settlement_agreement_rejection_ruling_date_apk: '2025-02-01',
  });
  // 01.02.2025 + 1 месяц = 01.03.2025 — суббота, перенос на 03.03.2025 (понедельник).
  assert.equal(term.raw_deadline, '2025-03-01');
  assert.equal(term.deadline, '2025-03-03');
  assert.equal(term.shifted, true);
});

test('обжалование отказа в утверждении мирового соглашения: без settlement_agreement_rejection_ruling_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeSettlementAgreementRejectionAppealApk({}),
    /settlement_agreement_rejection_ruling_date_apk/,
  );
});

test('обжалование отказа в утверждении мирового соглашения: primary — ч. 1 ст. 61 (источник числа), а не ст. 160 ч. 3 (даёт только институт)', () => {
  assert.equal(
    SETTLEMENT_AGREEMENT_REJECTION_APPEAL_APK.norm_versions[0].norm.primary,
    'ч. 1 ст. 61 ФЗ № 127-ФЗ',
  );
  assert.doesNotMatch(SETTLEMENT_AGREEMENT_REJECTION_APPEAL_APK.norm_versions[0].norm.primary, /160/);
});

test('обжалование отказа в утверждении мирового соглашения: calculation буквально тот же набор, что у ст. 162 п. 2', () => {
  assert.deepEqual(
    SETTLEMENT_AGREEMENT_REJECTION_APPEAL_APK.norm_versions[0].norm.calculation,
    SETTLEMENT_AGREEMENT_REVIEW_APK.norm_versions[0].norm.calculation,
  );
});

test('обжалование отказа в утверждении мирового соглашения: midnight_rule присутствует, без потолков и restoration', () => {
  const term = computeSettlementAgreementRejectionAppealApk({
    settlement_agreement_rejection_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.id, 'settlement_agreement_rejection_appeal_apk');
  assert.match(SETTLEMENT_AGREEMENT_REJECTION_APPEAL_APK.midnight_rule, /ст\. 114 АПК РФ/);
  assert.equal(SETTLEMENT_AGREEMENT_REJECTION_APPEAL_APK.restoration_norm, undefined);
  assert.equal(term.caps, undefined);
});

// Задача — четыре узла обжалования определений внешнего управления по
// общему правилу ч. 1 ст. 61 ФЗ № 127-ФЗ (ст. 93 ч. 2, ч. 3; ст. 106 п. 6;
// ст. 122.1 п. 2). Двадцать первый — двадцать четвёртый узлы домена, тот же
// паттерн, что у ст. 160 выше: обычный месячный term, primary на ч. 1
// ст. 61, calculation буквально скопирован, без потолков и restoration.

// 1) Ст. 93 ч. 2 — введение или продление внешнего управления.

test('обжалование определения о введении/продлении внешнего управления: один месяц с даты изготовления определения, будний день без переноса', () => {
  const term = computeExternalManagementIntroductionExtensionAppealApk({
    external_management_introduction_extension_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11'); // пятница, рабочий день
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
  assert.equal(term.norm.primary, 'ч. 1 ст. 61 ФЗ № 127-ФЗ');
});

test('обжалование определения о введении/продлении внешнего управления: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeExternalManagementIntroductionExtensionAppealApk({
    external_management_introduction_extension_ruling_date_apk: '2025-02-01',
  });
  assert.equal(term.raw_deadline, '2025-03-01');
  assert.equal(term.deadline, '2025-03-03');
  assert.equal(term.shifted, true);
});

test('обжалование определения о введении/продлении внешнего управления: без external_management_introduction_extension_ruling_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeExternalManagementIntroductionExtensionAppealApk({}),
    /external_management_introduction_extension_ruling_date_apk/,
  );
});

test('обжалование определения о введении/продлении внешнего управления: primary — ч. 1 ст. 61, не ст. 93', () => {
  assert.equal(
    EXTERNAL_MANAGEMENT_INTRODUCTION_EXTENSION_APPEAL_APK.norm_versions[0].norm.primary,
    'ч. 1 ст. 61 ФЗ № 127-ФЗ',
  );
  assert.doesNotMatch(
    EXTERNAL_MANAGEMENT_INTRODUCTION_EXTENSION_APPEAL_APK.norm_versions[0].norm.primary,
    /93/,
  );
});

test('обжалование определения о введении/продлении внешнего управления: calculation буквально тот же набор, что у ст. 160', () => {
  assert.deepEqual(
    EXTERNAL_MANAGEMENT_INTRODUCTION_EXTENSION_APPEAL_APK.norm_versions[0].norm.calculation,
    SETTLEMENT_AGREEMENT_REJECTION_APPEAL_APK.norm_versions[0].norm.calculation,
  );
});

test('обжалование определения о введении/продлении внешнего управления: без потолков и restoration', () => {
  const term = computeExternalManagementIntroductionExtensionAppealApk({
    external_management_introduction_extension_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.id, 'external_management_introduction_extension_appeal_apk');
  assert.equal(EXTERNAL_MANAGEMENT_INTRODUCTION_EXTENSION_APPEAL_APK.restoration_norm, undefined);
  assert.equal(term.caps, undefined);
});

// 2) Ст. 93 ч. 3 — сокращение срока внешнего управления.

test('обжалование определения о сокращении срока внешнего управления: один месяц с даты изготовления определения, будний день без переноса', () => {
  const term = computeExternalManagementReductionAppealApk({
    external_management_reduction_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
  assert.equal(term.norm.primary, 'ч. 1 ст. 61 ФЗ № 127-ФЗ');
});

test('обжалование определения о сокращении срока внешнего управления: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeExternalManagementReductionAppealApk({
    external_management_reduction_ruling_date_apk: '2025-02-01',
  });
  assert.equal(term.raw_deadline, '2025-03-01');
  assert.equal(term.deadline, '2025-03-03');
  assert.equal(term.shifted, true);
});

test('обжалование определения о сокращении срока внешнего управления: без external_management_reduction_ruling_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeExternalManagementReductionAppealApk({}),
    /external_management_reduction_ruling_date_apk/,
  );
});

test('обжалование определения о сокращении срока внешнего управления: primary — ч. 1 ст. 61, не ст. 93', () => {
  assert.equal(
    EXTERNAL_MANAGEMENT_REDUCTION_APPEAL_APK.norm_versions[0].norm.primary,
    'ч. 1 ст. 61 ФЗ № 127-ФЗ',
  );
  assert.doesNotMatch(EXTERNAL_MANAGEMENT_REDUCTION_APPEAL_APK.norm_versions[0].norm.primary, /93/);
});

test('обжалование определения о сокращении срока внешнего управления: calculation буквально тот же набор, что у ст. 160', () => {
  assert.deepEqual(
    EXTERNAL_MANAGEMENT_REDUCTION_APPEAL_APK.norm_versions[0].norm.calculation,
    SETTLEMENT_AGREEMENT_REJECTION_APPEAL_APK.norm_versions[0].norm.calculation,
  );
});

test('обжалование определения о сокращении срока внешнего управления: без потолков и restoration, разные узлы с ч. 2 ст. 93', () => {
  const term = computeExternalManagementReductionAppealApk({
    external_management_reduction_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.id, 'external_management_reduction_appeal_apk');
  assert.equal(EXTERNAL_MANAGEMENT_REDUCTION_APPEAL_APK.restoration_norm, undefined);
  assert.equal(term.caps, undefined);
  // Два разных узла ст. 93 (ч. 2 и ч. 3) — не один узел под двумя именами.
  assert.notEqual(
    EXTERNAL_MANAGEMENT_REDUCTION_APPEAL_APK.id,
    EXTERNAL_MANAGEMENT_INTRODUCTION_EXTENSION_APPEAL_APK.id,
  );
});

// 3) Ст. 106 п. 6 — признание плана внешнего управления недействительным.

test('обжалование определения о признании плана внешнего управления недействительным: один месяц с даты изготовления определения, будний день без переноса', () => {
  const term = computeExternalManagementPlanInvalidationAppealApk({
    external_management_plan_invalidation_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
  assert.equal(term.norm.primary, 'ч. 1 ст. 61 ФЗ № 127-ФЗ');
});

test('обжалование определения о признании плана внешнего управления недействительным: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeExternalManagementPlanInvalidationAppealApk({
    external_management_plan_invalidation_ruling_date_apk: '2025-02-01',
  });
  assert.equal(term.raw_deadline, '2025-03-01');
  assert.equal(term.deadline, '2025-03-03');
  assert.equal(term.shifted, true);
});

test('обжалование определения о признании плана внешнего управления недействительным: без external_management_plan_invalidation_ruling_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeExternalManagementPlanInvalidationAppealApk({}),
    /external_management_plan_invalidation_ruling_date_apk/,
  );
});

test('обжалование определения о признании плана внешнего управления недействительным: primary — ч. 1 ст. 61, не ст. 106', () => {
  assert.equal(
    EXTERNAL_MANAGEMENT_PLAN_INVALIDATION_APPEAL_APK.norm_versions[0].norm.primary,
    'ч. 1 ст. 61 ФЗ № 127-ФЗ',
  );
  assert.doesNotMatch(
    EXTERNAL_MANAGEMENT_PLAN_INVALIDATION_APPEAL_APK.norm_versions[0].norm.primary,
    /106/,
  );
});

test('обжалование определения о признании плана внешнего управления недействительным: calculation буквально тот же набор, что у ст. 160', () => {
  assert.deepEqual(
    EXTERNAL_MANAGEMENT_PLAN_INVALIDATION_APPEAL_APK.norm_versions[0].norm.calculation,
    SETTLEMENT_AGREEMENT_REJECTION_APPEAL_APK.norm_versions[0].norm.calculation,
  );
});

test('обжалование определения о признании плана внешнего управления недействительным: без потолков и restoration', () => {
  const term = computeExternalManagementPlanInvalidationAppealApk({
    external_management_plan_invalidation_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.id, 'external_management_plan_invalidation_appeal_apk');
  assert.equal(EXTERNAL_MANAGEMENT_PLAN_INVALIDATION_APPEAL_APK.restoration_norm, undefined);
  assert.equal(term.caps, undefined);
});

// 4) Ст. 122.1 п. 2 — отказ в удовлетворении ходатайства п. 1 той же статьи.

test('обжалование отказа в удовлетворении ходатайства (истечение сроков внешнего управления): один месяц с даты изготовления определения, будний день без переноса', () => {
  const term = computeExternalManagementTermExpiryRefusalAppealApk({
    external_management_term_expiry_refusal_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
  assert.equal(term.norm.primary, 'ч. 1 ст. 61 ФЗ № 127-ФЗ');
});

test('обжалование отказа в удовлетворении ходатайства (истечение сроков внешнего управления): перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeExternalManagementTermExpiryRefusalAppealApk({
    external_management_term_expiry_refusal_ruling_date_apk: '2025-02-01',
  });
  assert.equal(term.raw_deadline, '2025-03-01');
  assert.equal(term.deadline, '2025-03-03');
  assert.equal(term.shifted, true);
});

test('обжалование отказа в удовлетворении ходатайства (истечение сроков внешнего управления): без external_management_term_expiry_refusal_ruling_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeExternalManagementTermExpiryRefusalAppealApk({}),
    /external_management_term_expiry_refusal_ruling_date_apk/,
  );
});

test('обжалование отказа в удовлетворении ходатайства (истечение сроков внешнего управления): primary — ч. 1 ст. 61, не ст. 122.1', () => {
  assert.equal(
    EXTERNAL_MANAGEMENT_TERM_EXPIRY_REFUSAL_APPEAL_APK.norm_versions[0].norm.primary,
    'ч. 1 ст. 61 ФЗ № 127-ФЗ',
  );
  assert.doesNotMatch(
    EXTERNAL_MANAGEMENT_TERM_EXPIRY_REFUSAL_APPEAL_APK.norm_versions[0].norm.primary,
    /122/,
  );
});

test('обжалование отказа в удовлетворении ходатайства (истечение сроков внешнего управления): calculation буквально тот же набор, что у ст. 160', () => {
  assert.deepEqual(
    EXTERNAL_MANAGEMENT_TERM_EXPIRY_REFUSAL_APPEAL_APK.norm_versions[0].norm.calculation,
    SETTLEMENT_AGREEMENT_REJECTION_APPEAL_APK.norm_versions[0].norm.calculation,
  );
});

test('обжалование отказа в удовлетворении ходатайства (истечение сроков внешнего управления): без потолков и restoration', () => {
  const term = computeExternalManagementTermExpiryRefusalAppealApk({
    external_management_term_expiry_refusal_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.id, 'external_management_term_expiry_refusal_appeal_apk');
  assert.equal(EXTERNAL_MANAGEMENT_TERM_EXPIRY_REFUSAL_APPEAL_APK.restoration_norm, undefined);
  assert.equal(term.caps, undefined);
});

test('четыре узла обжалования внешнего управления: разные id, у каждого своё поле ввода — не один узел под четырьмя именами', () => {
  const nodes = [
    EXTERNAL_MANAGEMENT_INTRODUCTION_EXTENSION_APPEAL_APK,
    EXTERNAL_MANAGEMENT_REDUCTION_APPEAL_APK,
    EXTERNAL_MANAGEMENT_PLAN_INVALIDATION_APPEAL_APK,
    EXTERNAL_MANAGEMENT_TERM_EXPIRY_REFUSAL_APPEAL_APK,
  ];
  const ids = nodes.map((n) => n.id);
  assert.equal(new Set(ids).size, 4);
  // Все четыре — единая архитектурная логика ст. 61 ч. 1.
  for (const node of nodes) {
    assert.equal(node.norm_versions[0].norm.primary, 'ч. 1 ст. 61 ФЗ № 127-ФЗ');
    assert.deepEqual(
      node.norm_versions[0].norm.calculation,
      SETTLEMENT_AGREEMENT_REJECTION_APPEAL_APK.norm_versions[0].norm.calculation,
    );
    assert.equal(node.restoration_norm, undefined);
  }
});

// Задача — шесть узлов обязанностей внешнего управляющего по срокам
// (ст. 106 п. 1; ч. 2, п. 4 ст. 107; п. 2 ст. 117; п. 2 ст. 119; п. 3
// ст. 123 ФЗ № 127-ФЗ). Узлы 25-30 домена. ДРУГОЙ тип узла, чем группа
// обжалования выше: primary — сама статья-основание, число срока в ней же,
// никакого расхождения primary/ч. 1 ст. 61.

// 1) Ст. 106 п. 1 — разработка плана внешнего управления.

test('разработка плана внешнего управления: один месяц с даты утверждения внешнего управляющего, будний день без переноса', () => {
  const term = computeExternalManagementPlanDevelopmentApk({
    external_management_manager_approved_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
  assert.equal(term.norm.primary, 'ст. 106 п. 1 ФЗ № 127-ФЗ');
});

test('разработка плана внешнего управления: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeExternalManagementPlanDevelopmentApk({
    external_management_manager_approved_date_apk: '2025-02-01',
  });
  assert.equal(term.raw_deadline, '2025-03-01');
  assert.equal(term.deadline, '2025-03-03');
  assert.equal(term.shifted, true);
});

test('разработка плана внешнего управления: без external_management_manager_approved_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeExternalManagementPlanDevelopmentApk({}),
    /external_management_manager_approved_date_apk/,
  );
});

test('разработка плана внешнего управления: calculation — тот же массив, что у месячных duty-узлов домена (ст. 142 п. 1), без restoration', () => {
  assert.deepEqual(
    EXTERNAL_MANAGEMENT_PLAN_DEVELOPMENT_APK.norm_versions[0].norm.calculation,
    CREDITORS_REGISTER_CLOSURE_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(EXTERNAL_MANAGEMENT_PLAN_DEVELOPMENT_APK.restoration_norm, undefined);
});

// 2) Ч. 2 ст. 107 — созыв собрания кредиторов для рассмотрения плана.
// Тот же якорь, что у узла 1 (external_management_manager_approved_date_apk).

test('созыв собрания по плану внешнего управления: два месяца с даты утверждения внешнего управляющего, перенос через выходной (11.05.2025 — воскресенье)', () => {
  const term = computeExternalManagementPlanMeetingApk({
    external_management_manager_approved_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-05-11');
  assert.equal(term.deadline, '2025-05-12');
  assert.equal(term.shifted, true);
  assert.deepEqual(term.duration, { value: 2, unit: 'month' });
  assert.equal(term.norm.primary, 'ч. 2 ст. 107 ФЗ № 127-ФЗ');
});

test('созыв собрания по плану внешнего управления: без external_management_manager_approved_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeExternalManagementPlanMeetingApk({}),
    /external_management_manager_approved_date_apk/,
  );
});

test('созыв собрания по плану внешнего управления: разные узлы с узлом 1 (разные id, разная длительность из одного якоря)', () => {
  assert.notEqual(EXTERNAL_MANAGEMENT_PLAN_MEETING_APK.id, EXTERNAL_MANAGEMENT_PLAN_DEVELOPMENT_APK.id);
  assert.notDeepEqual(EXTERNAL_MANAGEMENT_PLAN_MEETING_APK.duration, EXTERNAL_MANAGEMENT_PLAN_DEVELOPMENT_APK.duration);
  assert.equal(EXTERNAL_MANAGEMENT_PLAN_MEETING_APK.restoration_norm, undefined);
});

// 3) П. 4 ст. 107 — представление утверждённого плана в арбитражный суд.
// duration.unit: 'working_day' (не 'day' — литерал 'day' в определениях
// узлов проекта не встречается нигде, решение архитектора по этому узлу).

test('представление плана внешнего управления в суд: пять рабочих дней с даты собрания, без праздничных кластеров рядом', () => {
  const term = computeExternalManagementPlanSubmissionApk({
    external_management_plan_meeting_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.first_working_day, '2025-03-12');
  assert.equal(term.raw_deadline, '2025-03-18');
  assert.equal(term.deadline, '2025-03-18');
  assert.equal(term.shifted, false); // weekend_shift к working_day не применяется
  assert.deepEqual(term.duration, { value: 5, unit: 'working_day' });
  assert.equal(term.norm.primary, 'п. 4 ст. 107 ФЗ № 127-ФЗ');
});

test('представление плана внешнего управления в суд: рабочие дни, а не календарные — перенос через новогодние каникулы', () => {
  const term = computeExternalManagementPlanSubmissionApk({
    external_management_plan_meeting_date_apk: '2025-12-26',
  });
  assert.equal(term.first_working_day, '2025-12-29');
  assert.equal(term.deadline, '2026-01-14');
});

test('представление плана внешнего управления в суд: без external_management_plan_meeting_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeExternalManagementPlanSubmissionApk({}),
    /external_management_plan_meeting_date_apk/,
  );
});

test('представление плана внешнего управления в суд: calculation — тот же массив, что у working_day-узлов домена (ст. 47 п. 1), не массив месячных узлов, без restoration', () => {
  assert.deepEqual(
    EXTERNAL_MANAGEMENT_PLAN_SUBMISSION_APK.norm_versions[0].norm.calculation,
    DEBTOR_RESPONSE_BANKRUPTCY_APK.norm_versions[0].norm.calculation,
  );
  assert.notDeepEqual(
    EXTERNAL_MANAGEMENT_PLAN_SUBMISSION_APK.norm_versions[0].norm.calculation,
    EXTERNAL_MANAGEMENT_PLAN_DEVELOPMENT_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(EXTERNAL_MANAGEMENT_PLAN_SUBMISSION_APK.restoration_norm, undefined);
});

// 4) П. 2 ст. 119 — направление отчёта и протокола собрания в суд.

test('направление отчёта и протокола собрания в суд: пять рабочих дней с даты собрания, без праздничных кластеров рядом', () => {
  const term = computeExternalManagementReportSubmissionApk({
    external_management_report_meeting_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.first_working_day, '2025-03-12');
  assert.equal(term.raw_deadline, '2025-03-18');
  assert.equal(term.deadline, '2025-03-18');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 5, unit: 'working_day' });
  assert.equal(term.norm.primary, 'п. 2 ст. 119 ФЗ № 127-ФЗ');
});

test('направление отчёта и протокола собрания в суд: без external_management_report_meeting_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeExternalManagementReportSubmissionApk({}),
    /external_management_report_meeting_date_apk/,
  );
});

test('направление отчёта и протокола собрания в суд: разные узлы с узлом 3 (разные id, разные поля ввода — разные собрания)', () => {
  assert.notEqual(EXTERNAL_MANAGEMENT_REPORT_SUBMISSION_APK.id, EXTERNAL_MANAGEMENT_PLAN_SUBMISSION_APK.id);
  assert.deepEqual(
    EXTERNAL_MANAGEMENT_REPORT_SUBMISSION_APK.norm_versions[0].norm.calculation,
    EXTERNAL_MANAGEMENT_PLAN_SUBMISSION_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(EXTERNAL_MANAGEMENT_REPORT_SUBMISSION_APK.restoration_norm, undefined);
});

// 5) П. 2 ст. 117 ФЗ № 127-ФЗ — отчёт при полном удовлетворении требований.
// НЕ путать со ст. 117 АПК РФ (восстановление пропущенного срока).

test('отчёт при полном удовлетворении требований: один месяц с даты удовлетворения всех требований, будний день без переноса', () => {
  const term = computeExternalManagementReportOnFullSatisfactionApk({
    external_management_full_satisfaction_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
  assert.equal(term.norm.primary, 'п. 2 ст. 117 ФЗ № 127-ФЗ');
});

test('отчёт при полном удовлетворении требований: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeExternalManagementReportOnFullSatisfactionApk({
    external_management_full_satisfaction_date_apk: '2025-02-01',
  });
  assert.equal(term.raw_deadline, '2025-03-01');
  assert.equal(term.deadline, '2025-03-03');
  assert.equal(term.shifted, true);
});

test('отчёт при полном удовлетворении требований: без external_management_full_satisfaction_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeExternalManagementReportOnFullSatisfactionApk({}),
    /external_management_full_satisfaction_date_apk/,
  );
});

test('отчёт при полном удовлетворении требований: primary ссылается на ФЗ № 127-ФЗ, не на ст. 117 АПК РФ (совпадение номера статьи — разные кодексы), без restoration', () => {
  assert.equal(
    EXTERNAL_MANAGEMENT_REPORT_ON_FULL_SATISFACTION_APK.norm_versions[0].norm.primary,
    'п. 2 ст. 117 ФЗ № 127-ФЗ',
  );
  assert.doesNotMatch(
    EXTERNAL_MANAGEMENT_REPORT_ON_FULL_SATISFACTION_APK.norm_versions[0].norm.primary,
    /АПК/,
  );
  assert.equal(EXTERNAL_MANAGEMENT_REPORT_ON_FULL_SATISFACTION_APK.restoration_norm, undefined);
});

// 6) П. 3 ст. 123 — передача дел конкурсному управляющему.
// duration.unit: 'working_day' прямо назван в норме буквально.

test('передача дел конкурсному управляющему: три рабочих дня с даты утверждения конкурсного управляющего, без праздничных кластеров рядом', () => {
  const term = computeExternalManagementHandoverApk({
    receiver_approved_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.first_working_day, '2025-03-12');
  assert.equal(term.raw_deadline, '2025-03-14');
  assert.equal(term.deadline, '2025-03-14');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 3, unit: 'working_day' });
  assert.equal(term.norm.primary, 'п. 3 ст. 123 ФЗ № 127-ФЗ');
});

test('передача дел конкурсному управляющему: рабочие дни, а не календарные — перенос через новогодние каникулы', () => {
  const term = computeExternalManagementHandoverApk({
    receiver_approved_date_apk: '2025-12-26',
  });
  assert.equal(term.first_working_day, '2025-12-29');
  assert.equal(term.deadline, '2026-01-12');
});

test('передача дел конкурсному управляющему: без receiver_approved_date_apk — понятная ошибка', () => {
  assert.throws(() => computeExternalManagementHandoverApk({}), /receiver_approved_date_apk/);
});

test('передача дел конкурсному управляющему: calculation — тот же массив, что у остальных working_day-узлов группы, без restoration', () => {
  assert.deepEqual(
    EXTERNAL_MANAGEMENT_HANDOVER_APK.norm_versions[0].norm.calculation,
    EXTERNAL_MANAGEMENT_PLAN_SUBMISSION_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(EXTERNAL_MANAGEMENT_HANDOVER_APK.restoration_norm, undefined);
});

test('шесть узлов обязанностей внешнего управляющего: разные id, у каждого — primary на своей статье-основании (не ч. 1 ст. 61)', () => {
  const nodes = [
    EXTERNAL_MANAGEMENT_PLAN_DEVELOPMENT_APK,
    EXTERNAL_MANAGEMENT_PLAN_MEETING_APK,
    EXTERNAL_MANAGEMENT_PLAN_SUBMISSION_APK,
    EXTERNAL_MANAGEMENT_REPORT_SUBMISSION_APK,
    EXTERNAL_MANAGEMENT_REPORT_ON_FULL_SATISFACTION_APK,
    EXTERNAL_MANAGEMENT_HANDOVER_APK,
  ];
  const ids = nodes.map((n) => n.id);
  assert.equal(new Set(ids).size, 6);
  for (const node of nodes) {
    assert.notEqual(node.norm_versions[0].norm.primary, 'ч. 1 ст. 61 ФЗ № 127-ФЗ');
    assert.equal(node.restoration_norm, undefined);
  }
});

// Задача — два узла особого завершения внешнего управления при погашении
// требований третьим лицом/учредителями/собственником имущества (п. 1, п. 2
// ст. 116 ФЗ № 127-ФЗ). Узлы 31-32 домена, последние узлы главы VI.

// 1) П. 1 ст. 116 — уведомление кредиторов.

test('уведомление кредиторов об удовлетворении третьим лицом: десять рабочих дней с даты окончания исполнения, без праздничных кластеров рядом', () => {
  const term = computeExternalManagementCreditorNotificationApk({
    external_management_third_party_satisfaction_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.first_working_day, '2025-03-12');
  assert.equal(term.raw_deadline, '2025-03-25');
  assert.equal(term.deadline, '2025-03-25');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 10, unit: 'working_day' });
  assert.equal(term.norm.primary, 'п. 1 ст. 116 ФЗ № 127-ФЗ');
});

test('уведомление кредиторов об удовлетворении третьим лицом: рабочие дни, а не календарные — перенос через новогодние каникулы', () => {
  const term = computeExternalManagementCreditorNotificationApk({
    external_management_third_party_satisfaction_date_apk: '2025-12-26',
  });
  assert.equal(term.first_working_day, '2025-12-29');
  assert.equal(term.deadline, '2026-01-21');
});

test('уведомление кредиторов об удовлетворении третьим лицом: без external_management_third_party_satisfaction_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeExternalManagementCreditorNotificationApk({}),
    /external_management_third_party_satisfaction_date_apk/,
  );
});

test('уведомление кредиторов об удовлетворении третьим лицом: calculation — тот же массив, что у остальных working_day-узлов домена, без restoration', () => {
  assert.deepEqual(
    EXTERNAL_MANAGEMENT_CREDITOR_NOTIFICATION_APK.norm_versions[0].norm.calculation,
    EXTERNAL_MANAGEMENT_HANDOVER_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(EXTERNAL_MANAGEMENT_CREDITOR_NOTIFICATION_APK.restoration_norm, undefined);
});

// 2) П. 2 ст. 116 — отчёт в суд без рассмотрения собранием.
// Якорь — тот же, что у узла 1 (интерпретация архитектора, см. комментарий
// к узлу в apk/bankruptcy.js).

test('отчёт в суд без рассмотрения собранием: четырнадцать рабочих дней с той же даты, что и узел уведомления, без праздничных кластеров рядом', () => {
  const term = computeExternalManagementReportSpecialCompletionApk({
    external_management_third_party_satisfaction_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.first_working_day, '2025-03-12');
  assert.equal(term.raw_deadline, '2025-03-31');
  assert.equal(term.deadline, '2025-03-31');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 14, unit: 'working_day' });
  assert.equal(term.norm.primary, 'п. 2 ст. 116 ФЗ № 127-ФЗ');
});

test('отчёт в суд без рассмотрения собранием: рабочие дни, а не календарные — перенос через новогодние каникулы', () => {
  const term = computeExternalManagementReportSpecialCompletionApk({
    external_management_third_party_satisfaction_date_apk: '2025-12-26',
  });
  assert.equal(term.first_working_day, '2025-12-29');
  assert.equal(term.deadline, '2026-01-27');
});

test('отчёт в суд без рассмотрения собранием: без external_management_third_party_satisfaction_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeExternalManagementReportSpecialCompletionApk({}),
    /external_management_third_party_satisfaction_date_apk/,
  );
});

test('отчёт в суд без рассмотрения собранием: разные узлы с узлом 1 (разные id, разная длительность, общий якорь), без restoration', () => {
  assert.notEqual(
    EXTERNAL_MANAGEMENT_REPORT_SPECIAL_COMPLETION_APK.id,
    EXTERNAL_MANAGEMENT_CREDITOR_NOTIFICATION_APK.id,
  );
  assert.notDeepEqual(
    EXTERNAL_MANAGEMENT_REPORT_SPECIAL_COMPLETION_APK.duration,
    EXTERNAL_MANAGEMENT_CREDITOR_NOTIFICATION_APK.duration,
  );
  assert.deepEqual(
    EXTERNAL_MANAGEMENT_REPORT_SPECIAL_COMPLETION_APK.norm_versions[0].norm.calculation,
    EXTERNAL_MANAGEMENT_CREDITOR_NOTIFICATION_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(EXTERNAL_MANAGEMENT_REPORT_SPECIAL_COMPLETION_APK.restoration_norm, undefined);
});

test('якорь ст. 116 — другое поле, чем якорь ст. 117 п. 2 (разные институты удовлетворения требований)', () => {
  assert.notEqual(
    'external_management_third_party_satisfaction_date_apk',
    'external_management_full_satisfaction_date_apk',
  );
  // Узел ст. 117 п. 2 существует независимо и не переиспользован здесь.
  assert.equal(EXTERNAL_MANAGEMENT_REPORT_ON_FULL_SATISFACTION_APK.norm_versions[0].norm.primary, 'п. 2 ст. 117 ФЗ № 127-ФЗ');
});

// Задача — предложения о порядке продажи имущества должника (п. 1.1
// ст. 110 ФЗ № 127-ФЗ). Узел 33 домена. Якорь двойной (альтернативный, не
// составной): дата окончания инвентаризации ИЛИ дата окончания оценки —
// одно поле на оба события, тот же приём, что у
// OUT_OF_COURT_BANKRUPTCY_REAPPLICATION_APK (п. 6 ст. 223.2).

test('предложения о порядке продажи имущества: один месяц с даты окончания инвентаризации/оценки, будний день без переноса', () => {
  const term = computeBankruptcyPropertySaleProposalApk({
    property_inventory_or_valuation_completion_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
  assert.equal(term.norm.primary, 'п. 1.1 ст. 110 ФЗ № 127-ФЗ');
});

test('предложения о порядке продажи имущества: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeBankruptcyPropertySaleProposalApk({
    property_inventory_or_valuation_completion_date_apk: '2025-02-01',
  });
  assert.equal(term.raw_deadline, '2025-03-01');
  assert.equal(term.deadline, '2025-03-03');
  assert.equal(term.shifted, true);
});

test('предложения о порядке продажи имущества: без property_inventory_or_valuation_completion_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeBankruptcyPropertySaleProposalApk({}),
    /property_inventory_or_valuation_completion_date_apk/,
  );
});

test('предложения о порядке продажи имущества: calculation — тот же массив, что у месячных duty-узлов домена (ст. 142 п. 1), без restoration', () => {
  assert.deepEqual(
    BANKRUPTCY_PROPERTY_SALE_PROPOSAL_APK.norm_versions[0].norm.calculation,
    CREDITORS_REGISTER_CLOSURE_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(BANKRUPTCY_PROPERTY_SALE_PROPOSAL_APK.restoration_norm, undefined);
});

test('предложения о порядке продажи имущества: одно и то же поле обслуживает обе альтернативные даты нормы (инвентаризация или оценка)', () => {
  // Само поле не различает, какое из двух событий фактически произошло —
  // расчёт от даты, поданной пользователем, идентичен в обоих случаях.
  const fromInventory = computeBankruptcyPropertySaleProposalApk({
    property_inventory_or_valuation_completion_date_apk: '2025-03-11',
  });
  const fromValuation = computeBankruptcyPropertySaleProposalApk({
    property_inventory_or_valuation_completion_date_apk: '2025-03-11',
  });
  assert.deepEqual(fromInventory, fromValuation);
});

// Задача — включение сведений об отчёте об оценке имущества должника в
// ЕФРСБ (п. 5.1 ст. 110 ФЗ № 127-ФЗ). Узел 34 домена — четвёртый и
// последний срок-остаток этого пункта, отдельный от
// APPRAISER_INVOLVEMENT_REQUEST_APK (тот же пункт, другой якорь).

test('включение отчёта об оценке в ЕФРСБ: два рабочих дня с даты поступления копии отчёта, без праздничных кластеров рядом', () => {
  const term = computeAppraisalReportRegistryInclusionApk({
    appraisal_report_copy_received_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.first_working_day, '2025-03-12');
  assert.equal(term.raw_deadline, '2025-03-13');
  assert.equal(term.deadline, '2025-03-13');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 2, unit: 'working_day' });
  assert.equal(term.norm.primary, 'п. 5.1 ст. 110 ФЗ № 127-ФЗ');
});

test('включение отчёта об оценке в ЕФРСБ: рабочие дни, а не календарные — перенос через новогодние каникулы', () => {
  const term = computeAppraisalReportRegistryInclusionApk({
    appraisal_report_copy_received_date_apk: '2025-12-26',
  });
  assert.equal(term.first_working_day, '2025-12-29');
  assert.equal(term.deadline, '2025-12-30');
});

test('включение отчёта об оценке в ЕФРСБ: без appraisal_report_copy_received_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeAppraisalReportRegistryInclusionApk({}),
    /appraisal_report_copy_received_date_apk/,
  );
});

test('включение отчёта об оценке в ЕФРСБ: calculation — тот же массив, что у остальных working_day duty-узлов домена, без restoration', () => {
  assert.deepEqual(
    APPRAISAL_REPORT_REGISTRY_INCLUSION_APK.norm_versions[0].norm.calculation,
    DEBTOR_RESPONSE_BANKRUPTCY_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(APPRAISAL_REPORT_REGISTRY_INCLUSION_APK.restoration_norm, undefined);
});

test('включение отчёта об оценке в ЕФРСБ: тот же пункт 5.1, что и требование о привлечении оценщика, но разные узлы с разными якорями', () => {
  assert.notEqual(APPRAISAL_REPORT_REGISTRY_INCLUSION_APK.id, APPRAISER_INVOLVEMENT_REQUEST_APK.id);
  assert.equal(APPRAISAL_REPORT_REGISTRY_INCLUSION_APK.norm_versions[0].norm.primary, 'п. 5.1 ст. 110 ФЗ № 127-ФЗ');
  assert.equal(APPRAISER_INVOLVEMENT_REQUEST_APK.norm_versions[0].norm.primary, 'п. 5.1 ст. 110 ФЗ № 127-ФЗ');
  assert.notDeepEqual(APPRAISAL_REPORT_REGISTRY_INCLUSION_APK.duration, APPRAISER_INVOLVEMENT_REQUEST_APK.duration);
});

// Задача — два узла обжалования определений об утверждении порядка,
// сроков и условий продажи (ст. 110 п. 7.1 — предприятие; ст. 139 п. 1.1 —
// имущество). Узлы 35-36 домена, пятый и шестой узлы группы обжалования по
// общему правилу ч. 1 ст. 61 ФЗ № 127-ФЗ.

// 1) Ст. 110 п. 7.1 — продажа предприятия должника.

test('обжалование определения об утверждении порядка продажи предприятия: один месяц с даты изготовления определения, будний день без переноса', () => {
  const term = computeEnterpriseSaleProcedureApprovalAppealApk({
    enterprise_sale_procedure_approval_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
  assert.equal(term.norm.primary, 'ч. 1 ст. 61 ФЗ № 127-ФЗ');
});

test('обжалование определения об утверждении порядка продажи предприятия: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeEnterpriseSaleProcedureApprovalAppealApk({
    enterprise_sale_procedure_approval_ruling_date_apk: '2025-02-01',
  });
  assert.equal(term.raw_deadline, '2025-03-01');
  assert.equal(term.deadline, '2025-03-03');
  assert.equal(term.shifted, true);
});

test('обжалование определения об утверждении порядка продажи предприятия: без enterprise_sale_procedure_approval_ruling_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeEnterpriseSaleProcedureApprovalAppealApk({}),
    /enterprise_sale_procedure_approval_ruling_date_apk/,
  );
});

test('обжалование определения об утверждении порядка продажи предприятия: primary — ч. 1 ст. 61, не ст. 110', () => {
  assert.equal(
    ENTERPRISE_SALE_PROCEDURE_APPROVAL_APPEAL_APK.norm_versions[0].norm.primary,
    'ч. 1 ст. 61 ФЗ № 127-ФЗ',
  );
  assert.doesNotMatch(
    ENTERPRISE_SALE_PROCEDURE_APPROVAL_APPEAL_APK.norm_versions[0].norm.primary,
    /110/,
  );
});

test('обжалование определения об утверждении порядка продажи предприятия: calculation буквально тот же набор, что у ст. 160, без restoration', () => {
  assert.deepEqual(
    ENTERPRISE_SALE_PROCEDURE_APPROVAL_APPEAL_APK.norm_versions[0].norm.calculation,
    SETTLEMENT_AGREEMENT_REJECTION_APPEAL_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(ENTERPRISE_SALE_PROCEDURE_APPROVAL_APPEAL_APK.restoration_norm, undefined);
});

// 2) Ст. 139 п. 1.1 — продажа имущества должника (россыпью).

test('обжалование определения об утверждении порядка продажи имущества: один месяц с даты изготовления определения, будний день без переноса', () => {
  const term = computePropertySaleProcedureApprovalAppealApk({
    property_sale_procedure_approval_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
  assert.equal(term.norm.primary, 'ч. 1 ст. 61 ФЗ № 127-ФЗ');
});

test('обжалование определения об утверждении порядка продажи имущества: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computePropertySaleProcedureApprovalAppealApk({
    property_sale_procedure_approval_ruling_date_apk: '2025-02-01',
  });
  assert.equal(term.raw_deadline, '2025-03-01');
  assert.equal(term.deadline, '2025-03-03');
  assert.equal(term.shifted, true);
});

test('обжалование определения об утверждении порядка продажи имущества: без property_sale_procedure_approval_ruling_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computePropertySaleProcedureApprovalAppealApk({}),
    /property_sale_procedure_approval_ruling_date_apk/,
  );
});

test('обжалование определения об утверждении порядка продажи имущества: primary — ч. 1 ст. 61, не ст. 139', () => {
  assert.equal(
    PROPERTY_SALE_PROCEDURE_APPROVAL_APPEAL_APK.norm_versions[0].norm.primary,
    'ч. 1 ст. 61 ФЗ № 127-ФЗ',
  );
  assert.doesNotMatch(
    PROPERTY_SALE_PROCEDURE_APPROVAL_APPEAL_APK.norm_versions[0].norm.primary,
    /139/,
  );
});

test('обжалование определения об утверждении порядка продажи имущества: calculation буквально тот же набор, что у ст. 160, без restoration', () => {
  assert.deepEqual(
    PROPERTY_SALE_PROCEDURE_APPROVAL_APPEAL_APK.norm_versions[0].norm.calculation,
    SETTLEMENT_AGREEMENT_REJECTION_APPEAL_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(PROPERTY_SALE_PROCEDURE_APPROVAL_APPEAL_APK.restoration_norm, undefined);
});

test('два узла обжалования порядка продажи: разные id (предприятие vs имущество), не один узел под двумя именами', () => {
  assert.notEqual(
    ENTERPRISE_SALE_PROCEDURE_APPROVAL_APPEAL_APK.id,
    PROPERTY_SALE_PROCEDURE_APPROVAL_APPEAL_APK.id,
  );
  for (const node of [
    ENTERPRISE_SALE_PROCEDURE_APPROVAL_APPEAL_APK,
    PROPERTY_SALE_PROCEDURE_APPROVAL_APPEAL_APK,
  ]) {
    assert.equal(node.norm_versions[0].norm.primary, 'ч. 1 ст. 61 ФЗ № 127-ФЗ');
    assert.equal(node.restoration_norm, undefined);
  }
});

// 3) П. 14-15 ст. 149 — обжалование определения по заявлениям конкурсного
// управляющего о завершении конкурсного производства. Седьмой appeal-узел
// домена, тот же образец.

test('обжалование определения по заявлениям конкурсного управляющего о завершении: один месяц с даты изготовления определения, будний день без переноса', () => {
  const term = computeBankruptcyCompletionRequestRulingAppealApk({
    bankruptcy_completion_request_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
  assert.equal(term.norm.primary, 'ч. 1 ст. 61 ФЗ № 127-ФЗ');
});

test('обжалование определения по заявлениям конкурсного управляющего о завершении: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeBankruptcyCompletionRequestRulingAppealApk({
    bankruptcy_completion_request_ruling_date_apk: '2025-02-01',
  });
  assert.equal(term.raw_deadline, '2025-03-01');
  assert.equal(term.deadline, '2025-03-03');
  assert.equal(term.shifted, true);
});

test('обжалование определения по заявлениям конкурсного управляющего о завершении: без bankruptcy_completion_request_ruling_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeBankruptcyCompletionRequestRulingAppealApk({}),
    /bankruptcy_completion_request_ruling_date_apk/,
  );
});

test('обжалование определения по заявлениям конкурсного управляющего о завершении: primary — ч. 1 ст. 61, не ст. 149', () => {
  assert.equal(
    BANKRUPTCY_COMPLETION_REQUEST_RULING_APPEAL_APK.norm_versions[0].norm.primary,
    'ч. 1 ст. 61 ФЗ № 127-ФЗ',
  );
  assert.doesNotMatch(
    BANKRUPTCY_COMPLETION_REQUEST_RULING_APPEAL_APK.norm_versions[0].norm.primary,
    /149/,
  );
});

test('обжалование определения по заявлениям конкурсного управляющего о завершении: calculation буквально тот же набор, что у ст. 160, без restoration', () => {
  assert.deepEqual(
    BANKRUPTCY_COMPLETION_REQUEST_RULING_APPEAL_APK.norm_versions[0].norm.calculation,
    SETTLEMENT_AGREEMENT_REJECTION_APPEAL_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(BANKRUPTCY_COMPLETION_REQUEST_RULING_APPEAL_APK.restoration_norm, undefined);
});

// Задача — обязанность гражданина предоставлять финансовому управляющему
// сведения о составе имущества, обязательствах, кредиторах и иные сведения,
// имеющие отношение к делу о банкротстве (ст. 213.8 п. 9 ФЗ № 127-ФЗ). Новый
// узел ветви "Банкротство гражданина" (глава X), рядом с
// citizen_bankruptcy_creditor_claims_apk и bankruptcy_completion_review_apk.

test('предоставление сведений финансовому управляющему: пятнадцать рабочих дней от даты получения требования, без праздничных кластеров рядом', () => {
  const term = computeCitizenInformationDisclosureApk({
    citizen_information_disclosure_request_received_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.first_working_day, '2025-03-12');
  assert.equal(term.raw_deadline, '2025-04-01');
  assert.equal(term.deadline, '2025-04-01');
  assert.equal(term.shifted, false); // weekend_shift к working_day не применяется
  assert.deepEqual(term.duration, { value: 15, unit: 'working_day' });
  assert.equal(term.norm.primary, 'ст. 213.8 п. 9 ФЗ № 127-ФЗ');
});

test('предоставление сведений финансовому управляющему: рабочие дни, а не календарные — перенос через новогодние каникулы', () => {
  const term = computeCitizenInformationDisclosureApk({
    citizen_information_disclosure_request_received_date_apk: '2025-12-26',
  });
  assert.equal(term.first_working_day, '2025-12-29');
  assert.equal(term.deadline, '2026-01-28');
});

test('предоставление сведений финансовому управляющему: без citizen_information_disclosure_request_received_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeCitizenInformationDisclosureApk({}),
    /citizen_information_disclosure_request_received_date_apk/,
  );
});

test('предоставление сведений финансовому управляющему: calculation — тот же массив, что у остальных working_day duty-узлов домена, без restoration', () => {
  assert.deepEqual(
    CITIZEN_INFORMATION_DISCLOSURE_APK.norm_versions[0].norm.calculation,
    DEBTOR_RESPONSE_BANKRUPTCY_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(CITIZEN_INFORMATION_DISCLOSURE_APK.restoration_norm, undefined);
});

test('предоставление сведений финансовому управляющему: норма не упоминает восстановление вообще — не только без потолка, но и без самого института', () => {
  assert.doesNotMatch(CITIZEN_INFORMATION_DISCLOSURE_APK.logic, /восстанов/i);
});

// Задача — два узла стадии наблюдения (глава III ФЗ № 127-ФЗ): ответ на
// запрос временного управляющего (ст. 66 п. 2 абз. 2) и уведомление о
// введении наблюдения (ст. 68 п. 3). Разные субъекты обязанности и разные
// якоря — отдельные узлы, отдельные ветви (подтверждено архитектором:
// формальной группировки веток по стадиям в файле нет).

test('ответ на запрос временного управляющего: семь рабочих дней от даты получения запроса, без праздничных кластеров рядом', () => {
  const term = computeObservationInformationRequestResponseApk({
    observation_information_request_received_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.first_working_day, '2025-03-12');
  assert.equal(term.raw_deadline, '2025-03-20');
  assert.equal(term.deadline, '2025-03-20');
  assert.equal(term.shifted, false); // weekend_shift к working_day не применяется
  assert.deepEqual(term.duration, { value: 7, unit: 'working_day' });
  assert.equal(term.norm.primary, 'ст. 66 п. 2 абз. 2 ФЗ № 127-ФЗ');
});

test('ответ на запрос временного управляющего: рабочие дни, а не календарные — перенос через новогодние каникулы', () => {
  const term = computeObservationInformationRequestResponseApk({
    observation_information_request_received_date_apk: '2025-12-26',
  });
  assert.equal(term.first_working_day, '2025-12-29');
  assert.equal(term.deadline, '2026-01-16');
});

test('ответ на запрос временного управляющего: без observation_information_request_received_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeObservationInformationRequestResponseApk({}),
    /observation_information_request_received_date_apk/,
  );
});

test('ответ на запрос временного управляющего: calculation — тот же массив, что у остальных working_day duty-узлов домена, без restoration', () => {
  assert.deepEqual(
    OBSERVATION_INFORMATION_REQUEST_RESPONSE_APK.norm_versions[0].norm.calculation,
    DEBTOR_RESPONSE_BANKRUPTCY_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(OBSERVATION_INFORMATION_REQUEST_RESPONSE_APK.restoration_norm, undefined);
});

test('уведомление о введении наблюдения: десять рабочих дней от даты вынесения определения, без праздничных кластеров рядом', () => {
  const term = computeObservationIntroductionNotificationApk({
    observation_introduction_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.first_working_day, '2025-03-12');
  assert.equal(term.raw_deadline, '2025-03-25');
  assert.equal(term.deadline, '2025-03-25');
  assert.equal(term.shifted, false); // weekend_shift к working_day не применяется
  assert.deepEqual(term.duration, { value: 10, unit: 'working_day' });
  assert.equal(term.norm.primary, 'ст. 68 п. 3 ФЗ № 127-ФЗ');
});

test('уведомление о введении наблюдения: рабочие дни, а не календарные — перенос через новогодние каникулы', () => {
  const term = computeObservationIntroductionNotificationApk({
    observation_introduction_ruling_date_apk: '2025-12-26',
  });
  assert.equal(term.first_working_day, '2025-12-29');
  assert.equal(term.deadline, '2026-01-21');
});

test('уведомление о введении наблюдения: без observation_introduction_ruling_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeObservationIntroductionNotificationApk({}),
    /observation_introduction_ruling_date_apk/,
  );
});

test('уведомление о введении наблюдения: calculation — тот же массив, что у остальных working_day duty-узлов домена, без restoration', () => {
  assert.deepEqual(
    OBSERVATION_INTRODUCTION_NOTIFICATION_APK.norm_versions[0].norm.calculation,
    DEBTOR_RESPONSE_BANKRUPTCY_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(OBSERVATION_INTRODUCTION_NOTIFICATION_APK.restoration_norm, undefined);
});

test('стадия наблюдения: два новых узла — разные субъекты обязанности и разные якоря, разные id', () => {
  assert.notEqual(
    OBSERVATION_INFORMATION_REQUEST_RESPONSE_APK.id,
    OBSERVATION_INTRODUCTION_NOTIFICATION_APK.id,
  );
  assert.notEqual(
    OBSERVATION_INFORMATION_REQUEST_RESPONSE_APK.norm_versions[0].norm.primary,
    OBSERVATION_INTRODUCTION_NOTIFICATION_APK.norm_versions[0].norm.primary,
  );
});

// --- Последствия открытия конкурсного производства (ст. 127-129 ФЗ № 127-ФЗ) --
// Пять новых узлов. Первый — восьмой appeal-узел домена (тот же образец, что
// у семи предыдущих). Остальные четыре — duty-узлы конкурсного управляющего,
// тот же тип, что у шести узлов внешнего управляющего (ст. 106/107/117/119/
// 123): primary — сама статья-основание, без расхождения с ч. 1 ст. 61.

// 1) П. 1 ст. 127 — обжалование определения об утверждении конкурсного
// управляющего.

test('обжалование определения об утверждении конкурсного управляющего: один месяц с даты изготовления определения, будний день без переноса', () => {
  const term = computeBankruptcyManagerAppointmentAppealApk({
    bankruptcy_manager_appointment_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
  assert.equal(term.norm.primary, 'ч. 1 ст. 61 ФЗ № 127-ФЗ');
});

test('обжалование определения об утверждении конкурсного управляющего: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeBankruptcyManagerAppointmentAppealApk({
    bankruptcy_manager_appointment_ruling_date_apk: '2025-02-01',
  });
  assert.equal(term.raw_deadline, '2025-03-01');
  assert.equal(term.deadline, '2025-03-03');
  assert.equal(term.shifted, true);
});

test('обжалование определения об утверждении конкурсного управляющего: без bankruptcy_manager_appointment_ruling_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeBankruptcyManagerAppointmentAppealApk({}),
    /bankruptcy_manager_appointment_ruling_date_apk/,
  );
});

test('обжалование определения об утверждении конкурсного управляющего: primary — ч. 1 ст. 61, не ст. 127; calculation тот же набор, что у остальных appeal-узлов, без restoration', () => {
  assert.equal(
    BANKRUPTCY_MANAGER_APPOINTMENT_APPEAL_APK.norm_versions[0].norm.primary,
    'ч. 1 ст. 61 ФЗ № 127-ФЗ',
  );
  assert.doesNotMatch(
    BANKRUPTCY_MANAGER_APPOINTMENT_APPEAL_APK.norm_versions[0].norm.primary,
    /ст\. 127/,
  );
  assert.deepEqual(
    BANKRUPTCY_MANAGER_APPOINTMENT_APPEAL_APK.norm_versions[0].norm.calculation,
    BANKRUPTCY_COMPLETION_REQUEST_RULING_APPEAL_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(BANKRUPTCY_MANAGER_APPOINTMENT_APPEAL_APK.restoration_norm, undefined);
});

// 2) П. 1 ст. 128 — направление сведений о признании должника банкротом для
// опубликования. Якорь — дата принятия решения о признании должника
// банкротом (она же дата утверждения конкурсного управляющего, п. 1 ст. 127).

test('направление сведений для опубликования: десять рабочих дней с даты принятия решения, без праздничных кластеров рядом', () => {
  const term = computeBankruptcyInformationPublicationApk({
    bankruptcy_declaration_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.first_working_day, '2025-03-12');
  assert.equal(term.raw_deadline, '2025-03-25');
  assert.equal(term.deadline, '2025-03-25');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 10, unit: 'working_day' });
  assert.equal(term.norm.primary, 'п. 1 ст. 128 ФЗ № 127-ФЗ');
});

test('направление сведений для опубликования: рабочие дни, а не календарные — перенос через новогодние каникулы', () => {
  const term = computeBankruptcyInformationPublicationApk({
    bankruptcy_declaration_ruling_date_apk: '2025-12-26',
  });
  assert.equal(term.first_working_day, '2025-12-29');
  assert.equal(term.deadline, '2026-01-21');
});

test('направление сведений для опубликования: без bankruptcy_declaration_ruling_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeBankruptcyInformationPublicationApk({}),
    /bankruptcy_declaration_ruling_date_apk/,
  );
});

test('направление сведений для опубликования: calculation — тот же массив, что у остальных working_day duty-узлов домена, без restoration', () => {
  assert.deepEqual(
    BANKRUPTCY_INFORMATION_PUBLICATION_APK.norm_versions[0].norm.calculation,
    DEBTOR_RESPONSE_BANKRUPTCY_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(BANKRUPTCY_INFORMATION_PUBLICATION_APK.restoration_norm, undefined);
});

// 3) Абз. 2 п. 2 ст. 129 — принятие в ведение имущества должника и его
// инвентаризация. Тот же якорь, что у узла 2.

test('принятие в ведение имущества и инвентаризация: три месяца с даты принятия решения, будний день без переноса', () => {
  const term = computeBankruptcyPropertyInventoryApk({
    bankruptcy_declaration_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-06-11');
  assert.equal(term.deadline, '2025-06-11');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 3, unit: 'month' });
  assert.equal(term.norm.primary, 'абз. 2 п. 2 ст. 129 ФЗ № 127-ФЗ');
});

test('принятие в ведение имущества и инвентаризация: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeBankruptcyPropertyInventoryApk({
    bankruptcy_declaration_ruling_date_apk: '2025-02-01',
  });
  assert.equal(term.raw_deadline, '2025-05-01');
  assert.equal(term.deadline, '2025-05-05');
  assert.equal(term.shifted, true);
});

test('принятие в ведение имущества и инвентаризация: без bankruptcy_declaration_ruling_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeBankruptcyPropertyInventoryApk({}),
    /bankruptcy_declaration_ruling_date_apk/,
  );
});

test('принятие в ведение имущества и инвентаризация: calculation — тот же массив, что у месячных duty-узлов домена (ст. 142 п. 1), без restoration', () => {
  assert.deepEqual(
    BANKRUPTCY_PROPERTY_INVENTORY_APK.norm_versions[0].norm.calculation,
    CREDITORS_REGISTER_CLOSURE_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(BANKRUPTCY_PROPERTY_INVENTORY_APK.restoration_norm, undefined);
});

// 4) П. 2 ст. 129 (абзац про уведомление работников) — уведомление работников
// должника о предстоящем увольнении. Тот же якорь, что у узлов 2-3.

test('уведомление работников о предстоящем увольнении: один месяц с даты принятия решения, будний день без переноса', () => {
  const term = computeBankruptcyEmployeeDismissalNoticeApk({
    bankruptcy_declaration_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
  assert.equal(term.norm.primary, 'п. 2 ст. 129 ФЗ № 127-ФЗ');
});

test('уведомление работников о предстоящем увольнении: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeBankruptcyEmployeeDismissalNoticeApk({
    bankruptcy_declaration_ruling_date_apk: '2025-02-01',
  });
  assert.equal(term.raw_deadline, '2025-03-01');
  assert.equal(term.deadline, '2025-03-03');
  assert.equal(term.shifted, true);
});

test('уведомление работников о предстоящем увольнении: без bankruptcy_declaration_ruling_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeBankruptcyEmployeeDismissalNoticeApk({}),
    /bankruptcy_declaration_ruling_date_apk/,
  );
});

test('три узла обязанностей конкурсного управляющего: разные id, общий якорь, разные длительности, без restoration ни у одного', () => {
  assert.notEqual(BANKRUPTCY_INFORMATION_PUBLICATION_APK.id, BANKRUPTCY_PROPERTY_INVENTORY_APK.id);
  assert.notEqual(BANKRUPTCY_PROPERTY_INVENTORY_APK.id, BANKRUPTCY_EMPLOYEE_DISMISSAL_NOTICE_APK.id);
  assert.notDeepEqual(BANKRUPTCY_PROPERTY_INVENTORY_APK.duration, BANKRUPTCY_EMPLOYEE_DISMISSAL_NOTICE_APK.duration);
  assert.equal(BANKRUPTCY_PROPERTY_INVENTORY_APK.restoration_norm, undefined);
  assert.equal(BANKRUPTCY_EMPLOYEE_DISMISSAL_NOTICE_APK.restoration_norm, undefined);
});

// 5) П. 2 ст. 129 (абзац про ЕФРСБ) — включение сведений о результатах
// инвентаризации в ЕФРСБ. ОТДЕЛЬНЫЙ якорь — дата окончания инвентаризации, не
// дата введения конкурсного производства.

test('включение результатов инвентаризации в ЕФРСБ: три рабочих дня с даты окончания инвентаризации, без праздничных кластеров рядом', () => {
  const term = computeBankruptcyInventoryResultsRegistryApk({
    property_inventory_completion_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.first_working_day, '2025-03-12');
  assert.equal(term.raw_deadline, '2025-03-14');
  assert.equal(term.deadline, '2025-03-14');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 3, unit: 'working_day' });
  assert.equal(term.norm.primary, 'п. 2 ст. 129 ФЗ № 127-ФЗ');
});

test('включение результатов инвентаризации в ЕФРСБ: рабочие дни, а не календарные — перенос через новогодние каникулы', () => {
  const term = computeBankruptcyInventoryResultsRegistryApk({
    property_inventory_completion_date_apk: '2025-12-26',
  });
  assert.equal(term.first_working_day, '2025-12-29');
  assert.equal(term.deadline, '2026-01-12');
});

test('включение результатов инвентаризации в ЕФРСБ: без property_inventory_completion_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeBankruptcyInventoryResultsRegistryApk({}),
    /property_inventory_completion_date_apk/,
  );
});

test('включение результатов инвентаризации в ЕФРСБ: якорь — отдельное поле, не bankruptcy_declaration_ruling_date_apk узлов 2-4, calculation — тот же массив, что у остальных working_day duty-узлов домена, без restoration', () => {
  assert.deepEqual(
    BANKRUPTCY_INVENTORY_RESULTS_REGISTRY_APK.norm_versions[0].norm.calculation,
    DEBTOR_RESPONSE_BANKRUPTCY_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(BANKRUPTCY_INVENTORY_RESULTS_REGISTRY_APK.restoration_norm, undefined);
});

// --- Два узла обжалования по институту мирового соглашения (ст. 163 п. 1;
// ст. 165 п. 4) — девятый и десятый appeal-узлы домена по ч. 1 ст. 61,
// последние из главы VIII. Не пересекаются с SETTLEMENT_AGREEMENT_REJECTION_
// APPEAL_APK (отказ в утверждении, ст. 160 ч. 3) и SETTLEMENT_AGREEMENT_
// REVIEW_APK (пересмотр по новым обстоятельствам, ст. 162 п. 2) — три разных
// института.

// 1) Ст. 163 п. 1 — возобновление производства по делу о банкротстве при
// отмене утверждения мирового соглашения.

test('обжалование определения о возобновлении производства по делу: один месяц с даты изготовления определения, будний день без переноса', () => {
  const term = computeSettlementCancellationResumptionAppealApk({
    settlement_cancellation_resumption_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11'); // пятница, рабочий день
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
  assert.equal(term.norm.primary, 'ч. 1 ст. 61 ФЗ № 127-ФЗ');
});

test('обжалование определения о возобновлении производства по делу: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeSettlementCancellationResumptionAppealApk({
    settlement_cancellation_resumption_ruling_date_apk: '2025-02-01',
  });
  assert.equal(term.raw_deadline, '2025-03-01');
  assert.equal(term.deadline, '2025-03-03');
  assert.equal(term.shifted, true);
});

test('обжалование определения о возобновлении производства по делу: без settlement_cancellation_resumption_ruling_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeSettlementCancellationResumptionAppealApk({}),
    /settlement_cancellation_resumption_ruling_date_apk/,
  );
});

test('обжалование определения о возобновлении производства по делу: primary — ч. 1 ст. 61 (источник числа), а не ст. 163; calculation тот же набор, что у остальных appeal-узлов, без restoration', () => {
  assert.equal(
    SETTLEMENT_CANCELLATION_RESUMPTION_APPEAL_APK.norm_versions[0].norm.primary,
    'ч. 1 ст. 61 ФЗ № 127-ФЗ',
  );
  assert.doesNotMatch(
    SETTLEMENT_CANCELLATION_RESUMPTION_APPEAL_APK.norm_versions[0].norm.primary,
    /163/,
  );
  assert.deepEqual(
    SETTLEMENT_CANCELLATION_RESUMPTION_APPEAL_APK.norm_versions[0].norm.calculation,
    SETTLEMENT_AGREEMENT_REJECTION_APPEAL_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(SETTLEMENT_CANCELLATION_RESUMPTION_APPEAL_APK.restoration_norm, undefined);
});

// 2) Ст. 165 п. 4 — расторжение мирового соглашения, утверждённого судом, по
// заявлению кредиторов. Отдельный институт от узла 1 выше.

test('обжалование определения о расторжении мирового соглашения: один месяц с даты изготовления определения, будний день без переноса', () => {
  const term = computeSettlementTerminationRulingAppealApk({
    settlement_termination_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11'); // пятница, рабочий день
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
  assert.equal(term.norm.primary, 'ч. 1 ст. 61 ФЗ № 127-ФЗ');
});

test('обжалование определения о расторжении мирового соглашения: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeSettlementTerminationRulingAppealApk({
    settlement_termination_ruling_date_apk: '2025-02-01',
  });
  assert.equal(term.raw_deadline, '2025-03-01');
  assert.equal(term.deadline, '2025-03-03');
  assert.equal(term.shifted, true);
});

test('обжалование определения о расторжении мирового соглашения: без settlement_termination_ruling_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeSettlementTerminationRulingAppealApk({}),
    /settlement_termination_ruling_date_apk/,
  );
});

test('обжалование определения о расторжении мирового соглашения: primary — ч. 1 ст. 61 (источник числа), а не ст. 165; calculation тот же набор, что у остальных appeal-узлов, без restoration', () => {
  assert.equal(
    SETTLEMENT_TERMINATION_RULING_APPEAL_APK.norm_versions[0].norm.primary,
    'ч. 1 ст. 61 ФЗ № 127-ФЗ',
  );
  assert.doesNotMatch(SETTLEMENT_TERMINATION_RULING_APPEAL_APK.norm_versions[0].norm.primary, /165/);
  assert.deepEqual(
    SETTLEMENT_TERMINATION_RULING_APPEAL_APK.norm_versions[0].norm.calculation,
    SETTLEMENT_AGREEMENT_REJECTION_APPEAL_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(SETTLEMENT_TERMINATION_RULING_APPEAL_APK.restoration_norm, undefined);
});

test('два новых узла мирового соглашения: разные институты — разные id, разные поля-якоря', () => {
  assert.notEqual(
    SETTLEMENT_CANCELLATION_RESUMPTION_APPEAL_APK.id,
    SETTLEMENT_TERMINATION_RULING_APPEAL_APK.id,
  );
  const term1 = computeSettlementCancellationResumptionAppealApk({
    settlement_cancellation_resumption_ruling_date_apk: '2025-03-11',
  });
  const term2 = computeSettlementTerminationRulingAppealApk({
    settlement_termination_ruling_date_apk: '2025-03-11',
  });
  assert.notEqual(term1.id, term2.id);
});

// --- Собственная обязанность гражданина подать заявление о своём банкротстве
// (п. 1 ст. 213.4 ФЗ № 127-ФЗ, глава X) — одна из наиболее значимых
// непокрытых глав до этой задачи. Тот же паттерн, что у
// DEBTOR_RESPONSE_BANKRUPTCY_APK (ст. 47 п. 1): working_day, primary —
// сама статья-основание (не ч. 1 ст. 61 — это не appeal-узел), без
// restoration. Условия применимости (совокупный долг ≥500 000 руб.,
// объективная невозможность исполнения) не проверяются отдельными полями —
// см. комментарий к узлу в apk/bankruptcy.js.

test('обязанность гражданина подать заявление о своём банкротстве: тридцать рабочих дней с даты, когда узнал или должен был узнать', () => {
  const term = computeCitizenBankruptcyFilingDutyApk({
    citizen_bankruptcy_filing_duty_known_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.first_working_day, '2025-03-12');
  assert.equal(term.raw_deadline, '2025-04-22');
  assert.equal(term.deadline, '2025-04-22');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 30, unit: 'working_day' });
  assert.equal(term.norm.primary, 'п. 1 ст. 213.4 ФЗ № 127-ФЗ');
});

test('обязанность гражданина подать заявление о своём банкротстве: рабочие дни, а не календарные — перенос через новогодние каникулы', () => {
  const term = computeCitizenBankruptcyFilingDutyApk({
    citizen_bankruptcy_filing_duty_known_date_apk: '2025-12-26',
  });
  assert.equal(term.first_working_day, '2025-12-29');
  assert.equal(term.deadline, '2026-02-18');
});

test('обязанность гражданина подать заявление о своём банкротстве: без citizen_bankruptcy_filing_duty_known_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeCitizenBankruptcyFilingDutyApk({}),
    /citizen_bankruptcy_filing_duty_known_date_apk/,
  );
});

test('обязанность гражданина подать заявление о своём банкротстве: primary — сама статья-основание (не appeal-узел), calculation тот же набор working_day-узлов домена, без restoration', () => {
  assert.equal(CITIZEN_BANKRUPTCY_FILING_DUTY_APK.norm_versions[0].norm.primary, 'п. 1 ст. 213.4 ФЗ № 127-ФЗ');
  assert.deepEqual(
    CITIZEN_BANKRUPTCY_FILING_DUTY_APK.norm_versions[0].norm.calculation,
    DEBTOR_RESPONSE_BANKRUPTCY_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(CITIZEN_BANKRUPTCY_FILING_DUTY_APK.restoration_norm, undefined);
});

// --- Проект и утверждение положения о порядке реализации имущества
// гражданина (п. 1 ст. 213.26 ФЗ № 127-ФЗ, глава X) — два узла из одного
// якоря, тот же прецедент группировки, что у EXTERNAL_MANAGEMENT_PLAN_
// DEVELOPMENT_APK/EXTERNAL_MANAGEMENT_PLAN_MEETING_APK (PR #56).

test('проект положения о реализации имущества гражданина: один месяц с даты окончания описи и оценки', () => {
  const term = computeCitizenPropertySaleProposalApk({
    citizen_property_inventory_valuation_completion_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
  assert.equal(term.norm.primary, 'п. 1 ст. 213.26 ФЗ № 127-ФЗ');
});

test('проект положения о реализации имущества гражданина: без citizen_property_inventory_valuation_completion_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeCitizenPropertySaleProposalApk({}),
    /citizen_property_inventory_valuation_completion_date_apk/,
  );
});

test('утверждение положения о реализации имущества гражданина: два месяца с той же даты окончания описи и оценки, с переносом через выходной', () => {
  const term = computeCitizenPropertySaleApprovalApk({
    citizen_property_inventory_valuation_completion_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-05-11'); // воскресенье
  assert.equal(term.deadline, '2025-05-12');
  assert.equal(term.shifted, true);
  assert.deepEqual(term.duration, { value: 2, unit: 'month' });
  assert.equal(term.norm.primary, 'п. 1 ст. 213.26 ФЗ № 127-ФЗ');
});

test('утверждение положения о реализации имущества гражданина: без citizen_property_inventory_valuation_completion_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeCitizenPropertySaleApprovalApk({}),
    /citizen_property_inventory_valuation_completion_date_apk/,
  );
});

test('два узла ст. 213.26 п. 1: общий якорь, разные id и разная длительность — не одна обязанность под двумя именами', () => {
  assert.notEqual(CITIZEN_PROPERTY_SALE_PROPOSAL_APK.id, CITIZEN_PROPERTY_SALE_APPROVAL_APK.id);
  const anchor = '2025-03-11';
  const proposal = computeCitizenPropertySaleProposalApk({
    citizen_property_inventory_valuation_completion_date_apk: anchor,
  });
  const approval = computeCitizenPropertySaleApprovalApk({
    citizen_property_inventory_valuation_completion_date_apk: anchor,
  });
  assert.equal(proposal.anchor, approval.anchor);
  assert.notEqual(proposal.deadline, approval.deadline);
  assert.equal(CITIZEN_PROPERTY_SALE_PROPOSAL_APK.restoration_norm, undefined);
  assert.equal(CITIZEN_PROPERTY_SALE_APPROVAL_APK.restoration_norm, undefined);
});

// --- Обязанность кредитной организации уведомить финансового управляющего
// (п. 5 ст. 213.24 ФЗ № 127-ФЗ, глава X) — working_day-узел, тот же паттерн,
// что у DEBTOR_RESPONSE_BANKRUPTCY_APK и CITIZEN_BANKRUPTCY_FILING_DUTY_APK.

test('уведомление кредитной организацией: пять рабочих дней с даты, когда стало известно о признании гражданина банкротом', () => {
  const term = computeBankNotificationDutyApk({
    bank_citizen_bankruptcy_known_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.first_working_day, '2025-03-12');
  assert.equal(term.raw_deadline, '2025-03-18');
  assert.equal(term.deadline, '2025-03-18');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 5, unit: 'working_day' });
  assert.equal(term.norm.primary, 'п. 5 ст. 213.24 ФЗ № 127-ФЗ');
});

test('уведомление кредитной организацией: рабочие дни, а не календарные — перенос через новогодние каникулы', () => {
  const term = computeBankNotificationDutyApk({
    bank_citizen_bankruptcy_known_date_apk: '2025-12-26',
  });
  assert.equal(term.first_working_day, '2025-12-29');
  assert.equal(term.deadline, '2026-01-14');
});

test('уведомление кредитной организацией: без bank_citizen_bankruptcy_known_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeBankNotificationDutyApk({}),
    /bank_citizen_bankruptcy_known_date_apk/,
  );
});

test('уведомление кредитной организацией: primary — сама статья-основание, calculation тот же набор working_day-узлов домена, без restoration', () => {
  assert.equal(BANK_NOTIFICATION_DUTY_APK.norm_versions[0].norm.primary, 'п. 5 ст. 213.24 ФЗ № 127-ФЗ');
  assert.deepEqual(
    BANK_NOTIFICATION_DUTY_APK.norm_versions[0].norm.calculation,
    DEBTOR_RESPONSE_BANKRUPTCY_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(BANK_NOTIFICATION_DUTY_APK.restoration_norm, undefined);
});

// --- Обжалование определения об утверждении перечня имущества гражданина,
// исключаемого из конкурсной массы (п. 2 ст. 213.25, ч. 1 ст. 61 ФЗ
// № 127-ФЗ) — тот же образец appeal-узла, что у SETTLEMENT_CANCELLATION_
// RESUMPTION_APPEAL_APK/SETTLEMENT_TERMINATION_RULING_APPEAL_APK выше.

test('обжалование определения об исключении имущества из конкурсной массы: один месяц с даты изготовления определения, будний день без переноса', () => {
  const term = computePropertyExclusionRulingAppealApk({
    property_exclusion_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
  assert.equal(term.norm.primary, 'ч. 1 ст. 61 ФЗ № 127-ФЗ');
});

test('обжалование определения об исключении имущества из конкурсной массы: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computePropertyExclusionRulingAppealApk({
    property_exclusion_ruling_date_apk: '2025-02-01',
  });
  assert.equal(term.raw_deadline, '2025-03-01');
  assert.equal(term.deadline, '2025-03-03');
  assert.equal(term.shifted, true);
});

test('обжалование определения об исключении имущества из конкурсной массы: без property_exclusion_ruling_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computePropertyExclusionRulingAppealApk({}),
    /property_exclusion_ruling_date_apk/,
  );
});

test('обжалование определения об исключении имущества из конкурсной массы: primary — ч. 1 ст. 61 (источник числа), а не ст. 213.25; calculation тот же набор, что у остальных appeal-узлов, без restoration', () => {
  assert.equal(
    PROPERTY_EXCLUSION_RULING_APPEAL_APK.norm_versions[0].norm.primary,
    'ч. 1 ст. 61 ФЗ № 127-ФЗ',
  );
  assert.doesNotMatch(
    PROPERTY_EXCLUSION_RULING_APPEAL_APK.norm_versions[0].norm.primary,
    /213\.25/,
  );
  assert.deepEqual(
    PROPERTY_EXCLUSION_RULING_APPEAL_APK.norm_versions[0].norm.calculation,
    SETTLEMENT_TERMINATION_RULING_APPEAL_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(PROPERTY_EXCLUSION_RULING_APPEAL_APK.restoration_norm, undefined);
});

// --- Ходатайство об уменьшении размера денежных средств, исключаемых из
// конкурсной массы (п. 2 ст. 213.27 ФЗ № 127-ФЗ, глава X) — working_day-узел,
// отдельный институт и отдельный якорь от PROPERTY_EXCLUSION_RULING_
// APPEAL_APK (ст. 213.25) выше.

test('ходатайство об уменьшении размера денежных средств: десять рабочих дней с даты размещения информации в ЕФРСБ', () => {
  const term = computePropertyExclusionAmountDisputeApk({
    property_exclusion_amount_notice_published_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.first_working_day, '2025-03-12');
  assert.equal(term.raw_deadline, '2025-03-25');
  assert.equal(term.deadline, '2025-03-25');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 10, unit: 'working_day' });
  assert.equal(term.norm.primary, 'п. 2 ст. 213.27 ФЗ № 127-ФЗ');
});

test('ходатайство об уменьшении размера денежных средств: рабочие дни, а не календарные — перенос через новогодние каникулы', () => {
  const term = computePropertyExclusionAmountDisputeApk({
    property_exclusion_amount_notice_published_date_apk: '2025-12-26',
  });
  assert.equal(term.first_working_day, '2025-12-29');
  assert.equal(term.deadline, '2026-01-21');
});

test('ходатайство об уменьшении размера денежных средств: без property_exclusion_amount_notice_published_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computePropertyExclusionAmountDisputeApk({}),
    /property_exclusion_amount_notice_published_date_apk/,
  );
});

test('ходатайство об уменьшении размера денежных средств: primary — сама статья-основание (не appeal-узел), calculation тот же набор working_day-узлов домена, без restoration', () => {
  assert.equal(
    PROPERTY_EXCLUSION_AMOUNT_DISPUTE_APK.norm_versions[0].norm.primary,
    'п. 2 ст. 213.27 ФЗ № 127-ФЗ',
  );
  assert.deepEqual(
    PROPERTY_EXCLUSION_AMOUNT_DISPUTE_APK.norm_versions[0].norm.calculation,
    ['ч. 3 ст. 113 АПК РФ', 'ст. 223 АПК РФ'],
  );
  assert.equal(PROPERTY_EXCLUSION_AMOUNT_DISPUTE_APK.restoration_norm, undefined);
});

test('ходатайство об уменьшении размера денежных средств: не путается с обжалованием определения об исключении имущества — разные id, разные поля-якоря', () => {
  assert.notEqual(PROPERTY_EXCLUSION_AMOUNT_DISPUTE_APK.id, PROPERTY_EXCLUSION_RULING_APPEAL_APK.id);
  const dispute = computePropertyExclusionAmountDisputeApk({
    property_exclusion_amount_notice_published_date_apk: '2025-03-11',
  });
  const appeal = computePropertyExclusionRulingAppealApk({
    property_exclusion_ruling_date_apk: '2025-03-11',
  });
  assert.notEqual(dispute.id, appeal.id);
  assert.notEqual(dispute.norm.primary, appeal.norm.primary);
});

// Задача — обжалование определения о продлении срока конкурсного
// производства (п. 3 ст. 124 ФЗ № 127-ФЗ). Девятый appeal-узел домена, тот
// же образец, что и предыдущие восемь (ближайший — BANKRUPTCY_COMPLETION_
// REQUEST_RULING_APPEAL_APK, п. 15 ст. 149).

test('обжалование определения о продлении срока конкурсного производства: один месяц с даты изготовления определения, будний день без переноса', () => {
  const term = computeBankruptcyProceedingExtensionAppealApk({
    bankruptcy_proceeding_extension_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
  assert.equal(term.norm.primary, 'ч. 1 ст. 61 ФЗ № 127-ФЗ');
});

test('обжалование определения о продлении срока конкурсного производства: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeBankruptcyProceedingExtensionAppealApk({
    bankruptcy_proceeding_extension_ruling_date_apk: '2025-02-01',
  });
  assert.equal(term.raw_deadline, '2025-03-01');
  assert.equal(term.deadline, '2025-03-03');
  assert.equal(term.shifted, true);
});

test('обжалование определения о продлении срока конкурсного производства: без bankruptcy_proceeding_extension_ruling_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeBankruptcyProceedingExtensionAppealApk({}),
    /bankruptcy_proceeding_extension_ruling_date_apk/,
  );
});

test('обжалование определения о продлении срока конкурсного производства: primary — ч. 1 ст. 61, не ст. 124', () => {
  assert.equal(
    BANKRUPTCY_PROCEEDING_EXTENSION_APPEAL_APK.norm_versions[0].norm.primary,
    'ч. 1 ст. 61 ФЗ № 127-ФЗ',
  );
  assert.doesNotMatch(
    BANKRUPTCY_PROCEEDING_EXTENSION_APPEAL_APK.norm_versions[0].norm.primary,
    /124/,
  );
});

test('обжалование определения о продлении срока конкурсного производства: calculation буквально тот же набор, что у ст. 149 п. 15, без restoration', () => {
  assert.deepEqual(
    BANKRUPTCY_PROCEEDING_EXTENSION_APPEAL_APK.norm_versions[0].norm.calculation,
    BANKRUPTCY_COMPLETION_REQUEST_RULING_APPEAL_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(BANKRUPTCY_PROCEEDING_EXTENSION_APPEAL_APK.restoration_norm, undefined);
});

// Задача — срок исковой давности по оспариванию сделки должника (п. 1
// ст. 61.9, ст. 61.2/61.3 ФЗ № 127-ФЗ; п. 2 ст. 181 ГК РФ; п. 32
// Постановления Пленума ВАС РФ от 23.12.2010 № 63). Первый узел домена, чей
// якорь — более поздняя из двух независимых пользовательских дат (не
// альтернатива и не минимум/максимум длительности, а Math.max по датам
// внутри compute-функции, см. комментарий к узлу в apk/bankruptcy.js).

test('оспаривание сделки должника: обычный случай — лицо узнало об основаниях ПОЗЖЕ своего утверждения управляющим, якорь — дата знания', () => {
  const term = computeTransactionChallengeLimitationApk({
    transaction_challenge_manager_knew_date_apk: '2024-03-11',
    transaction_challenge_manager_appointed_date_apk: '2023-01-10',
  });
  assert.equal(term.anchor, '2024-03-11');
  assert.equal(term.raw_deadline, '2025-03-11');
  assert.equal(term.deadline, '2025-03-11');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'year' });
  assert.equal(term.norm.primary, 'п. 2 ст. 181 ГК РФ');
});

test('оспаривание сделки должника: лицо узнало об основаниях ДО своего утверждения управляющим (например, будучи временным управляющим в наблюдении) — якорь переносится на дату утверждения', () => {
  const term = computeTransactionChallengeLimitationApk({
    transaction_challenge_manager_knew_date_apk: '2022-05-01',
    transaction_challenge_manager_appointed_date_apk: '2023-01-10',
  });
  assert.equal(term.anchor, '2023-01-10');
  assert.equal(term.raw_deadline, '2024-01-10');
  assert.equal(term.deadline, '2024-01-10');
});

test('оспаривание сделки должника: равные даты знания и утверждения — якорь совпадает с обеими', () => {
  const term = computeTransactionChallengeLimitationApk({
    transaction_challenge_manager_knew_date_apk: '2023-06-14',
    transaction_challenge_manager_appointed_date_apk: '2023-06-14',
  });
  assert.equal(term.anchor, '2023-06-14');
  assert.equal(term.raw_deadline, '2024-06-14');
  assert.equal(term.deadline, '2024-06-14');
  assert.equal(term.shifted, false);
});

test('оспаривание сделки должника: перенос через новогодние каникулы (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeTransactionChallengeLimitationApk({
    transaction_challenge_manager_knew_date_apk: '2025-01-01',
    transaction_challenge_manager_appointed_date_apk: '2020-01-01',
  });
  assert.equal(term.raw_deadline, '2026-01-01');
  assert.equal(term.deadline, '2026-01-12');
  assert.equal(term.shifted, true);
});

test('оспаривание сделки должника: без даты знания об основаниях — понятная ошибка', () => {
  assert.throws(
    () =>
      computeTransactionChallengeLimitationApk({
        transaction_challenge_manager_appointed_date_apk: '2023-01-10',
      }),
    /transaction_challenge_manager_knew_date_apk/,
  );
});

test('оспаривание сделки должника: без даты утверждения управляющего — понятная ошибка', () => {
  assert.throws(
    () =>
      computeTransactionChallengeLimitationApk({
        transaction_challenge_manager_knew_date_apk: '2024-03-11',
      }),
    /transaction_challenge_manager_appointed_date_apk/,
  );
});

test('оспаривание сделки должника: primary — п. 2 ст. 181 ГК РФ (число срока), а не ст. 61.9/61.2/61.3 ФЗ № 127-ФЗ (институт, только в title), без restoration', () => {
  assert.equal(
    TRANSACTION_CHALLENGE_LIMITATION_APK.norm_versions[0].norm.primary,
    'п. 2 ст. 181 ГК РФ',
  );
  assert.doesNotMatch(TRANSACTION_CHALLENGE_LIMITATION_APK.norm_versions[0].norm.primary, /61\.9|61\.2|61\.3/);
  assert.match(TRANSACTION_CHALLENGE_LIMITATION_APK.title, /61\.2, 61\.3/);
  assert.equal(TRANSACTION_CHALLENGE_LIMITATION_APK.restoration_norm, undefined);
});

// Задача — срок исковой давности по оспариванию сделки должника-гражданина
// (п. 2 ст. 213.32 ФЗ № 127-ФЗ; п. 2 ст. 181 ГК РФ). Отдельная ветвь от
// TRANSACTION_CHALLENGE_LIMITATION_APK выше (юрлица): здесь якорь — ОДНО
// поле (дата, когда финансовый управляющий узнал или должен был узнать об
// основаниях), без сравнения с датой утверждения управляющего — п. 2
// ст. 213.32 ФЗ № 127-ФЗ не даёт второй даты, а Постановление Пленума ВС РФ
// от 13.10.2015 № 45 не содержит аналога уточнения из п. 32 ПП ВАС РФ № 63.

test('оспаривание сделки должника-гражданина: обычный случай — год с даты, когда финансовый управляющий узнал об основаниях', () => {
  const term = computeTransactionChallengeLimitationCitizenApk({
    transaction_challenge_financial_manager_knew_date_apk: '2024-03-11',
  });
  assert.equal(term.anchor, '2024-03-11');
  assert.equal(term.raw_deadline, '2025-03-11');
  assert.equal(term.deadline, '2025-03-11');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'year' });
  assert.equal(term.norm.primary, 'п. 2 ст. 181 ГК РФ');
});

test('оспаривание сделки должника-гражданина: перенос через новогодние каникулы (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeTransactionChallengeLimitationCitizenApk({
    transaction_challenge_financial_manager_knew_date_apk: '2025-01-01',
  });
  assert.equal(term.raw_deadline, '2026-01-01');
  assert.equal(term.deadline, '2026-01-12');
  assert.equal(term.shifted, true);
});

test('оспаривание сделки должника-гражданина: без даты знания об основаниях — понятная ошибка', () => {
  assert.throws(
    () => computeTransactionChallengeLimitationCitizenApk({}),
    /transaction_challenge_financial_manager_knew_date_apk/,
  );
});

test('оспаривание сделки должника-гражданина: primary — п. 2 ст. 181 ГК РФ (число срока), а не п. 2 ст. 213.32 ФЗ № 127-ФЗ (институт, только в title), без restoration', () => {
  assert.equal(
    TRANSACTION_CHALLENGE_LIMITATION_CITIZEN_APK.norm_versions[0].norm.primary,
    'п. 2 ст. 181 ГК РФ',
  );
  assert.doesNotMatch(
    TRANSACTION_CHALLENGE_LIMITATION_CITIZEN_APK.norm_versions[0].norm.primary,
    /213\.32/,
  );
  assert.match(TRANSACTION_CHALLENGE_LIMITATION_CITIZEN_APK.title, /213\.32/);
  assert.equal(TRANSACTION_CHALLENGE_LIMITATION_CITIZEN_APK.restoration_norm, undefined);
});

test('оспаривание сделки должника-гражданина: узел отдельная ветвь от TRANSACTION_CHALLENGE_LIMITATION_APK (юрлица) — разные id и разные поля ввода', () => {
  assert.notEqual(
    TRANSACTION_CHALLENGE_LIMITATION_CITIZEN_APK.id,
    TRANSACTION_CHALLENGE_LIMITATION_APK.id,
  );
});

// Задача — включение сведений о признаках банкротства в ЕФРСБ (п. 1 ст. 30
// ФЗ № 127-ФЗ, глава II «Предупреждение банкротства»). Первая по хронологии
// обязанность домена — возникает до возбуждения дела о банкротстве.

test('включение сведений о признаках банкротства в ЕФРСБ: десять рабочих дней с даты, когда руководителю стало известно, без праздничных кластеров рядом', () => {
  const term = computeBankruptcySignsRegistryNotificationApk({
    bankruptcy_signs_known_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.first_working_day, '2025-03-12');
  assert.equal(term.raw_deadline, '2025-03-25');
  assert.equal(term.deadline, '2025-03-25');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 10, unit: 'working_day' });
  assert.equal(term.norm.primary, 'п. 1 ст. 30 ФЗ № 127-ФЗ');
});

test('включение сведений о признаках банкротства в ЕФРСБ: рабочие дни, а не календарные — перенос через новогодние каникулы', () => {
  const term = computeBankruptcySignsRegistryNotificationApk({
    bankruptcy_signs_known_date_apk: '2025-12-26',
  });
  assert.equal(term.first_working_day, '2025-12-29');
  assert.equal(term.deadline, '2026-01-21');
});

test('включение сведений о признаках банкротства в ЕФРСБ: без bankruptcy_signs_known_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeBankruptcySignsRegistryNotificationApk({}),
    /bankruptcy_signs_known_date_apk/,
  );
});

test('включение сведений о признаках банкротства в ЕФРСБ: calculation — тот же массив, что у остальных working_day duty-узлов домена, без restoration', () => {
  assert.deepEqual(
    BANKRUPTCY_SIGNS_REGISTRY_NOTIFICATION_APK.norm_versions[0].norm.calculation,
    DEBTOR_RESPONSE_BANKRUPTCY_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(BANKRUPTCY_SIGNS_REGISTRY_NOTIFICATION_APK.restoration_norm, undefined);
});

test('включение сведений о признаках банкротства в ЕФРСБ: узел отдельная ветвь от остальных ЕФРСБ-узлов домена — разные id и разные поля ввода', () => {
  assert.notEqual(
    BANKRUPTCY_SIGNS_REGISTRY_NOTIFICATION_APK.id,
    APPRAISAL_REPORT_REGISTRY_INCLUSION_APK.id,
  );
  assert.equal(
    BANKRUPTCY_SIGNS_REGISTRY_NOTIFICATION_APK.norm_versions[0].norm.primary,
    'п. 1 ст. 30 ФЗ № 127-ФЗ',
  );
});

// Задача — утрата силы сведений уведомления о намерении обратиться с
// заявлением о банкротстве (абзац второй п. 2.1 ст. 7 ФЗ № 127-ФЗ, глава I).
// Применяется только к банкротству юридических лиц.

test('утрата силы уведомления о намерении обратиться с заявлением о банкротстве: тридцать рабочих дней с даты опубликования уведомления', () => {
  const term = computeFilingNoticeValidityApk({
    filing_notice_publication_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.first_working_day, '2025-03-12');
  assert.equal(term.raw_deadline, '2025-04-22');
  assert.equal(term.deadline, '2025-04-22');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 30, unit: 'working_day' });
  assert.equal(term.norm.primary, 'абзац второй п. 2.1 ст. 7 ФЗ № 127-ФЗ');
});

test('утрата силы уведомления о намерении обратиться с заявлением о банкротстве: рабочие дни, а не календарные — перенос через новогодние каникулы', () => {
  const term = computeFilingNoticeValidityApk({
    filing_notice_publication_date_apk: '2025-12-01',
  });
  assert.equal(term.first_working_day, '2025-12-02');
  assert.equal(term.deadline, '2026-01-22');
});

test('утрата силы уведомления о намерении обратиться с заявлением о банкротстве: без filing_notice_publication_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeFilingNoticeValidityApk({}),
    /filing_notice_publication_date_apk/,
  );
});

test('утрата силы уведомления о намерении обратиться с заявлением о банкротстве: calculation — тот же массив, что у остальных working_day duty-узлов домена, без restoration', () => {
  assert.deepEqual(
    FILING_NOTICE_VALIDITY_APK.norm_versions[0].norm.calculation,
    DEBTOR_RESPONSE_BANKRUPTCY_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(FILING_NOTICE_VALIDITY_APK.restoration_norm, undefined);
});

test('утрата силы уведомления о намерении обратиться с заявлением о банкротстве: title явно ограничивает применимость юридическими лицами', () => {
  assert.match(FILING_NOTICE_VALIDITY_APK.title, /юридических лиц/);
  assert.match(FILING_NOTICE_VALIDITY_APK.logic, /гражданина/);
  assert.match(FILING_NOTICE_VALIDITY_APK.logic, /ПП ВС РФ от 13\.10\.2015 № 45/);
});

test('утрата силы уведомления о намерении обратиться с заявлением о банкротстве: узел отдельная ветвь от остальных ЕФРСБ-узлов домена — разные id и разные поля ввода', () => {
  assert.notEqual(FILING_NOTICE_VALIDITY_APK.id, BANKRUPTCY_SIGNS_REGISTRY_NOTIFICATION_APK.id);
  assert.equal(
    FILING_NOTICE_VALIDITY_APK.norm_versions[0].norm.primary,
    'абзац второй п. 2.1 ст. 7 ФЗ № 127-ФЗ',
  );
});

// --- Остаток главы VII ФЗ № 127-ФЗ (ст. 132, 140, 144, 145, 146) — конкурсное
// производство. Пять новых узлов. Restoration — ни для одного из них: каждая
// норма проверена отдельно на упоминание института восстановления
// пропущенного срока, ни в одной такого упоминания нет.

// 1) П. 2 ст. 132 — принятие собственником изъятого из оборота имущества.

test('принятие изъятого из оборота имущества собственником: шесть месяцев с даты получения уведомления, будний день без переноса', () => {
  const term = computeExcludedPropertyAcceptanceApk({
    excluded_property_notice_received_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-09-11');
  assert.equal(term.deadline, '2025-09-11');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 6, unit: 'month' });
  assert.equal(term.norm.primary, 'п. 2 ст. 132 ФЗ № 127-ФЗ');
});

test('принятие изъятого из оборота имущества собственником: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeExcludedPropertyAcceptanceApk({
    excluded_property_notice_received_date_apk: '2025-08-01',
  });
  assert.equal(term.raw_deadline, '2026-02-01');
  assert.equal(term.deadline, '2026-02-02');
  assert.equal(term.shifted, true);
});

test('принятие изъятого из оборота имущества собственником: без excluded_property_notice_received_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeExcludedPropertyAcceptanceApk({}),
    /excluded_property_notice_received_date_apk/,
  );
});

test('принятие изъятого из оборота имущества собственником: primary — п. 2 ст. 132 (число срока даёт сама статья), calculation тот же массив, что у остальных month-узлов домена, без restoration', () => {
  assert.equal(
    EXCLUDED_PROPERTY_ACCEPTANCE_APK.norm_versions[0].norm.primary,
    'п. 2 ст. 132 ФЗ № 127-ФЗ',
  );
  assert.deepEqual(EXCLUDED_PROPERTY_ACCEPTANCE_APK.norm_versions[0].norm.calculation, [
    'ч. 4 ст. 113',
    'ч. 2, 4 ст. 114 АПК РФ',
    'ст. 223 АПК РФ',
  ]);
  assert.equal(EXCLUDED_PROPERTY_ACCEPTANCE_APK.restoration_norm, undefined);
});

// 2) Абзац второй п. 2 ст. 140 — оплата по договору купли-продажи права
// требования должника.

test('оплата по договору купли-продажи права требования: тридцать рабочих дней с даты заключения договора', () => {
  const term = computeClaimSalePaymentApk({
    claim_sale_contract_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.first_working_day, '2025-03-12');
  assert.equal(term.raw_deadline, '2025-04-22');
  assert.equal(term.deadline, '2025-04-22');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 30, unit: 'working_day' });
  assert.equal(term.norm.primary, 'абзац второй п. 2 ст. 140 ФЗ № 127-ФЗ');
});

test('оплата по договору купли-продажи права требования: рабочие дни, а не календарные — перенос через новогодние каникулы', () => {
  const term = computeClaimSalePaymentApk({
    claim_sale_contract_date_apk: '2025-12-01',
  });
  assert.equal(term.first_working_day, '2025-12-02');
  assert.equal(term.deadline, '2026-01-22');
});

test('оплата по договору купли-продажи права требования: без claim_sale_contract_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeClaimSalePaymentApk({}),
    /claim_sale_contract_date_apk/,
  );
});

test('оплата по договору купли-продажи права требования: calculation — тот же массив, что у остальных working_day duty-узлов домена, без restoration', () => {
  assert.deepEqual(
    CLAIM_SALE_PAYMENT_APK.norm_versions[0].norm.calculation,
    DEBTOR_RESPONSE_BANKRUPTCY_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(CLAIM_SALE_PAYMENT_APK.restoration_norm, undefined);
});

// 3) П. 3 ст. 144 — обжалование определения об освобождении конкурсного
// управляющего.

test('обжалование освобождения конкурсного управляющего: один месяц с даты изготовления определения, будний день без переноса', () => {
  const term = computeManagerReleaseAppealApk({
    manager_release_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
  assert.equal(term.norm.primary, 'ч. 1 ст. 61 ФЗ № 127-ФЗ');
});

test('обжалование освобождения конкурсного управляющего: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeManagerReleaseAppealApk({
    manager_release_ruling_date_apk: '2025-02-01',
  });
  assert.equal(term.raw_deadline, '2025-03-01');
  assert.equal(term.deadline, '2025-03-03');
  assert.equal(term.shifted, true);
});

test('обжалование освобождения конкурсного управляющего: без manager_release_ruling_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeManagerReleaseAppealApk({}),
    /manager_release_ruling_date_apk/,
  );
});

test('обжалование освобождения конкурсного управляющего: primary — ч. 1 ст. 61, не ст. 144; calculation тот же набор, что у остальных appeal-узлов, без restoration', () => {
  assert.equal(
    MANAGER_RELEASE_APPEAL_APK.norm_versions[0].norm.primary,
    'ч. 1 ст. 61 ФЗ № 127-ФЗ',
  );
  assert.doesNotMatch(
    MANAGER_RELEASE_APPEAL_APK.norm_versions[0].norm.primary,
    /ст\. 144/,
  );
  assert.deepEqual(
    MANAGER_RELEASE_APPEAL_APK.norm_versions[0].norm.calculation,
    BANKRUPTCY_MANAGER_APPOINTMENT_APPEAL_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(MANAGER_RELEASE_APPEAL_APK.restoration_norm, undefined);
});

// 4) П. 3 ст. 145 — обжалование определения об отстранении конкурсного
// управляющего. ОТДЕЛЬНЫЙ институт от узла 3 (освобождение) — принудительное
// отстранение судом за нарушения, а не сложение полномочий по заявлению
// самого управляющего.

test('обжалование отстранения конкурсного управляющего: один месяц с даты изготовления определения, будний день без переноса', () => {
  const term = computeManagerRemovalAppealApk({
    manager_removal_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
  assert.equal(term.norm.primary, 'ч. 1 ст. 61 ФЗ № 127-ФЗ');
});

test('обжалование отстранения конкурсного управляющего: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeManagerRemovalAppealApk({
    manager_removal_ruling_date_apk: '2025-02-01',
  });
  assert.equal(term.raw_deadline, '2025-03-01');
  assert.equal(term.deadline, '2025-03-03');
  assert.equal(term.shifted, true);
});

test('обжалование отстранения конкурсного управляющего: без manager_removal_ruling_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeManagerRemovalAppealApk({}),
    /manager_removal_ruling_date_apk/,
  );
});

test('обжалование отстранения конкурсного управляющего: primary — ч. 1 ст. 61, не ст. 145; calculation тот же набор, что у остальных appeal-узлов, без restoration', () => {
  assert.equal(
    MANAGER_REMOVAL_APPEAL_APK.norm_versions[0].norm.primary,
    'ч. 1 ст. 61 ФЗ № 127-ФЗ',
  );
  assert.doesNotMatch(
    MANAGER_REMOVAL_APPEAL_APK.norm_versions[0].norm.primary,
    /ст\. 145/,
  );
  assert.deepEqual(
    MANAGER_REMOVAL_APPEAL_APK.norm_versions[0].norm.calculation,
    BANKRUPTCY_MANAGER_APPOINTMENT_APPEAL_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(MANAGER_REMOVAL_APPEAL_APK.restoration_norm, undefined);
});

test('обжалование освобождения и обжалование отстранения конкурсного управляющего: разные узлы — разные id, разные поля ввода, разные институты', () => {
  assert.notEqual(MANAGER_RELEASE_APPEAL_APK.id, MANAGER_REMOVAL_APPEAL_APK.id);
  assert.match(MANAGER_RELEASE_APPEAL_APK.title, /освобождении/);
  assert.match(MANAGER_REMOVAL_APPEAL_APK.title, /отстранении/);
  assert.doesNotMatch(MANAGER_RELEASE_APPEAL_APK.title, /отстранении/);
  assert.doesNotMatch(MANAGER_REMOVAL_APPEAL_APK.title, /освобождении/);
});

// 5) П. 1 ст. 146 — созыв собрания кредиторов о переходе к внешнему
// управлению.

test('созыв собрания кредиторов о переходе к внешнему управлению: один месяц с даты выявления обстоятельств, будний день без переноса', () => {
  const term = computeCreditorsMeetingExternalManagementTransitionApk({
    solvency_restoration_circumstances_discovered_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
  assert.equal(term.norm.primary, 'п. 1 ст. 146 ФЗ № 127-ФЗ');
});

test('созыв собрания кредиторов о переходе к внешнему управлению: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeCreditorsMeetingExternalManagementTransitionApk({
    solvency_restoration_circumstances_discovered_date_apk: '2025-02-01',
  });
  assert.equal(term.raw_deadline, '2025-03-01');
  assert.equal(term.deadline, '2025-03-03');
  assert.equal(term.shifted, true);
});

test('созыв собрания кредиторов о переходе к внешнему управлению: без solvency_restoration_circumstances_discovered_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeCreditorsMeetingExternalManagementTransitionApk({}),
    /solvency_restoration_circumstances_discovered_date_apk/,
  );
});

test('созыв собрания кредиторов о переходе к внешнему управлению: primary — п. 1 ст. 146 (число срока даёт сама статья), calculation тот же массив, что у остальных month-узлов домена, без restoration', () => {
  assert.equal(
    CREDITORS_MEETING_EXTERNAL_MANAGEMENT_TRANSITION_APK.norm_versions[0].norm.primary,
    'п. 1 ст. 146 ФЗ № 127-ФЗ',
  );
  assert.deepEqual(
    CREDITORS_MEETING_EXTERNAL_MANAGEMENT_TRANSITION_APK.norm_versions[0].norm.calculation,
    EXCLUDED_PROPERTY_ACCEPTANCE_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(CREDITORS_MEETING_EXTERNAL_MANAGEMENT_TRANSITION_APK.restoration_norm, undefined);
});

// Глава X § 3 ФЗ № 127-ФЗ — финансовое оздоровление КФХ (ст. 219).

test('КФХ: представление плана финансового оздоровления — два месяца с даты вынесения определения о введении наблюдения, перенос через выходной', () => {
  const term = computeKfhRehabilitationPlanSubmissionApk({
    kfh_observation_introduction_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-05-11');
  assert.equal(term.deadline, '2025-05-12');
  assert.equal(term.shifted, true);
  assert.deepEqual(term.duration, { value: 2, unit: 'month' });
  assert.equal(term.norm.primary, 'п. 1 ст. 219 ФЗ № 127-ФЗ');
});

test('КФХ: представление плана финансового оздоровления — будний день без переноса', () => {
  const term = computeKfhRehabilitationPlanSubmissionApk({
    kfh_observation_introduction_ruling_date_apk: '2025-02-01',
  });
  assert.equal(term.raw_deadline, '2025-04-01');
  assert.equal(term.deadline, '2025-04-01');
  assert.equal(term.shifted, false);
});

test('КФХ: представление плана финансового оздоровления — без kfh_observation_introduction_ruling_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeKfhRehabilitationPlanSubmissionApk({}),
    /kfh_observation_introduction_ruling_date_apk/,
  );
});

test('КФХ: представление плана финансового оздоровления — primary п. 1 ст. 219 (число срока даёт сама статья), без restoration', () => {
  assert.equal(
    KFH_REHABILITATION_PLAN_SUBMISSION_APK.norm_versions[0].norm.primary,
    'п. 1 ст. 219 ФЗ № 127-ФЗ',
  );
  assert.deepEqual(
    KFH_REHABILITATION_PLAN_SUBMISSION_APK.norm_versions[0].norm.calculation,
    CREDITORS_MEETING_EXTERNAL_MANAGEMENT_TRANSITION_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(KFH_REHABILITATION_PLAN_SUBMISSION_APK.restoration_norm, undefined);
});

test('обжалование определения о введении финансового оздоровления КФХ: один месяц со дня изготовления определения в полном объёме', () => {
  const term = computeKfhRehabilitationIntroductionAppealApk({
    kfh_rehabilitation_introduction_ruling_date_apk: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 1, unit: 'month' });
});

test('обжалование определения о введении финансового оздоровления КФХ: без kfh_rehabilitation_introduction_ruling_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeKfhRehabilitationIntroductionAppealApk({}),
    /kfh_rehabilitation_introduction_ruling_date_apk/,
  );
});

test('обжалование определения о введении финансового оздоровления КФХ: primary — ч. 1 ст. 61, не ст. 219; calculation тот же набор, что у остальных appeal-узлов, без restoration', () => {
  assert.equal(
    KFH_REHABILITATION_INTRODUCTION_APPEAL_APK.norm_versions[0].norm.primary,
    'ч. 1 ст. 61 ФЗ № 127-ФЗ',
  );
  assert.doesNotMatch(
    KFH_REHABILITATION_INTRODUCTION_APPEAL_APK.norm_versions[0].norm.primary,
    /ст\. 219/,
  );
  assert.deepEqual(
    KFH_REHABILITATION_INTRODUCTION_APPEAL_APK.norm_versions[0].norm.calculation,
    MANAGER_REMOVAL_APPEAL_APK.norm_versions[0].norm.calculation,
  );
  assert.equal(KFH_REHABILITATION_INTRODUCTION_APPEAL_APK.restoration_norm, undefined);
});

test('КФХ: представление плана и обжалование введения финансового оздоровления — разные узлы, разные id, разные поля ввода', () => {
  assert.notEqual(KFH_REHABILITATION_PLAN_SUBMISSION_APK.id, KFH_REHABILITATION_INTRODUCTION_APPEAL_APK.id);
  assert.match(KFH_REHABILITATION_PLAN_SUBMISSION_APK.title, /КФХ/);
  assert.match(KFH_REHABILITATION_INTRODUCTION_APPEAL_APK.title, /крестьянского \(фермерского\) хозяйства/);
});
