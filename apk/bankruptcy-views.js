// Сборка карточек домена банкротства (ФЗ № 127-ФЗ) для отображения — аналог
// apk/views.js для собственной страницы банкротства. Берёт входные данные,
// считает узлы и возвращает готовую структуру данных для UI: карточки
// рассчитанных узлов, список неполных узлов («что ещё уточнить») и статические
// заглушки. Никакой вёрстки — только данные.
//
// Устройство повторяет apk/views.js: compute-функции apk/bankruptcy.js бросают
// исключение на нехватке входа, поэтому полнота данных выясняется ДО вызова, по
// декларативному списку зависимостей узла (NODE_REQUIREMENTS_BANKRUPTCY), и
// даёт incomplete-запись с подписью поля из apk/bankruptcy-labels.js.
//
// ЭКСПОРТ В КАЛЕНДАРЬ (.ics) ЗДЕСЬ НЕ ПОДКЛЮЧЁН СОЗНАТЕЛЬНО. Реестр сроков
// apk/term-registry.js сканирует только apk/chain.js, и простого «добавить
// второй скан» не получится: предикат isTermNode требует top-level duration,
// которого у двух узлов субсидиарной ответственности нет по конструкции (у них
// несколько потолков со своими длительностями, наверх не поднятыми), — они
// молча выпали бы из экспорта. Плюс таблица reminderOffsets не покрывает ни
// одной длительности этого домена (10 рабочих дней, 30 календарных дней,
// 2 года). Пересмотр реестра вынесен отдельной задачей — см. развилку 5
// дизайна БАНКРОТСТВО-UI.0. Ни поля признака экспортируемости, ни ссылок на
// apk/ics.js в этом файле нет и появляться не должно до того решения.

import {
  computeDebtorResponseBankruptcyApk,
  computeCreditorClaimsSubmissionApk,
  computeCreditorClaimExclusionApk,
  computeCreditorsRegisterClosureApk,
  computeCitizenBankruptcyCreditorClaimsApk,
  computeBankruptcyCompletionReviewApk,
  computeCitizenInformationDisclosureApk,
  computeSubsidiaryLiabilityInCaseApk,
  computeSubsidiaryLiabilityInCaseApkRestoration,
  computeSubsidiaryLiabilityPostConclusionApk,
  computeSubsidiaryLiabilityPostConclusionApkRestoration,
  computeOutOfCourtBankruptcyCompletionApk,
  computeOutOfCourtBankruptcyReapplicationApk,
  computeOutOfCourtBankruptcyReapplicationAfterPriorApk,
  computeSettlementAgreementApprovalApplicationApk,
  computeSettlementAgreementReviewApk,
  computeAppraiserInvolvementRequestApk,
  computeClaimsRulingReasonedRequestApk,
  computeClaimsRulingReasonedAppealApk,
  computeEnterpriseSalePaymentApk,
  computeSettlementAgreementRejectionAppealApk,
  computeExternalManagementIntroductionExtensionAppealApk,
  computeExternalManagementReductionAppealApk,
  computeExternalManagementPlanInvalidationAppealApk,
  computeExternalManagementTermExpiryRefusalAppealApk,
  computeExternalManagementPlanDevelopmentApk,
  computeExternalManagementPlanMeetingApk,
  computeExternalManagementPlanSubmissionApk,
  computeExternalManagementReportSubmissionApk,
  computeExternalManagementReportOnFullSatisfactionApk,
  computeExternalManagementHandoverApk,
  computeExternalManagementCreditorNotificationApk,
  computeExternalManagementReportSpecialCompletionApk,
  computeBankruptcyPropertySaleProposalApk,
  computeAppraisalReportRegistryInclusionApk,
  computeEnterpriseSaleProcedureApprovalAppealApk,
  computePropertySaleProcedureApprovalAppealApk,
  computeBankruptcyCompletionRequestRulingAppealApk,
  computeObservationInformationRequestResponseApk,
  computeObservationIntroductionNotificationApk,
  computeBankruptcyManagerAppointmentAppealApk,
  computeBankruptcyInformationPublicationApk,
  computeBankruptcyPropertyInventoryApk,
  computeBankruptcyEmployeeDismissalNoticeApk,
  computeBankruptcyInventoryResultsRegistryApk,
  computeSettlementCancellationResumptionAppealApk,
  computeSettlementTerminationRulingAppealApk,
  computeCitizenBankruptcyFilingDutyApk,
  computeCitizenPropertySaleProposalApk,
  computeCitizenPropertySaleApprovalApk,
  computeBankNotificationDutyApk,
  computePropertyExclusionRulingAppealApk,
  computePropertyExclusionAmountDisputeApk,
  computeBankruptcyProceedingExtensionAppealApk,
  DEBTOR_RESPONSE_BANKRUPTCY_APK,
  CREDITOR_CLAIMS_SUBMISSION_APK,
  CREDITOR_CLAIM_EXCLUSION_APK,
  CREDITORS_REGISTER_CLOSURE_APK,
  CITIZEN_BANKRUPTCY_CREDITOR_CLAIMS_APK,
  BANKRUPTCY_COMPLETION_REVIEW_APK,
  CITIZEN_INFORMATION_DISCLOSURE_APK,
  SUBSIDIARY_LIABILITY_IN_CASE_APK,
  SUBSIDIARY_LIABILITY_IN_CASE_APK_RESTORATION,
  SUBSIDIARY_LIABILITY_POST_CONCLUSION_APK,
  SUBSIDIARY_LIABILITY_POST_CONCLUSION_APK_RESTORATION,
  OUT_OF_COURT_BANKRUPTCY_COMPLETION_APK,
  OUT_OF_COURT_BANKRUPTCY_REAPPLICATION_APK,
  OUT_OF_COURT_BANKRUPTCY_REAPPLICATION_AFTER_PRIOR_APK,
  SETTLEMENT_AGREEMENT_APPROVAL_APPLICATION_APK,
  SETTLEMENT_AGREEMENT_REVIEW_APK,
  APPRAISER_INVOLVEMENT_REQUEST_APK,
  CLAIMS_RULING_REASONED_REQUEST_APK,
  CLAIMS_RULING_REASONED_APPEAL_APK,
  ENTERPRISE_SALE_PAYMENT_APK,
  SETTLEMENT_AGREEMENT_REJECTION_APPEAL_APK,
  EXTERNAL_MANAGEMENT_INTRODUCTION_EXTENSION_APPEAL_APK,
  EXTERNAL_MANAGEMENT_REDUCTION_APPEAL_APK,
  EXTERNAL_MANAGEMENT_PLAN_INVALIDATION_APPEAL_APK,
  EXTERNAL_MANAGEMENT_TERM_EXPIRY_REFUSAL_APPEAL_APK,
  EXTERNAL_MANAGEMENT_PLAN_DEVELOPMENT_APK,
  EXTERNAL_MANAGEMENT_PLAN_MEETING_APK,
  EXTERNAL_MANAGEMENT_PLAN_SUBMISSION_APK,
  EXTERNAL_MANAGEMENT_REPORT_SUBMISSION_APK,
  EXTERNAL_MANAGEMENT_REPORT_ON_FULL_SATISFACTION_APK,
  EXTERNAL_MANAGEMENT_HANDOVER_APK,
  EXTERNAL_MANAGEMENT_CREDITOR_NOTIFICATION_APK,
  EXTERNAL_MANAGEMENT_REPORT_SPECIAL_COMPLETION_APK,
  BANKRUPTCY_PROPERTY_SALE_PROPOSAL_APK,
  APPRAISAL_REPORT_REGISTRY_INCLUSION_APK,
  ENTERPRISE_SALE_PROCEDURE_APPROVAL_APPEAL_APK,
  PROPERTY_SALE_PROCEDURE_APPROVAL_APPEAL_APK,
  BANKRUPTCY_COMPLETION_REQUEST_RULING_APPEAL_APK,
  OBSERVATION_INFORMATION_REQUEST_RESPONSE_APK,
  OBSERVATION_INTRODUCTION_NOTIFICATION_APK,
  BANKRUPTCY_MANAGER_APPOINTMENT_APPEAL_APK,
  BANKRUPTCY_INFORMATION_PUBLICATION_APK,
  BANKRUPTCY_PROPERTY_INVENTORY_APK,
  BANKRUPTCY_EMPLOYEE_DISMISSAL_NOTICE_APK,
  BANKRUPTCY_INVENTORY_RESULTS_REGISTRY_APK,
  SETTLEMENT_CANCELLATION_RESUMPTION_APPEAL_APK,
  SETTLEMENT_TERMINATION_RULING_APPEAL_APK,
  CITIZEN_BANKRUPTCY_FILING_DUTY_APK,
  CITIZEN_PROPERTY_SALE_PROPOSAL_APK,
  CITIZEN_PROPERTY_SALE_APPROVAL_APK,
  BANK_NOTIFICATION_DUTY_APK,
  PROPERTY_EXCLUSION_RULING_APPEAL_APK,
  PROPERTY_EXCLUSION_AMOUNT_DISPUTE_APK,
  BANKRUPTCY_PROCEEDING_EXTENSION_APPEAL_APK,
} from './bankruptcy.js';

import {
  monthTermCard,
  workingDayCard,
  attachCalendarWarning,
  incompleteNode,
  missingInputs as genericMissingInputs,
  markExpired as genericMarkExpired,
} from '../core/view/cards.js';
import { toISO } from '../core/engine/term.js';
import { INPUT_LABELS_BANKRUPTCY } from './bankruptcy-labels.js';

// --- Вспомогательные ---------------------------------------------------------

function missingInputs(ids, inputs) {
  return genericMissingInputs(ids, inputs, INPUT_LABELS_BANKRUPTCY);
}

// --- Карточка срока с кумулятивными потолками (kind: 'capped_term') ----------
//
// ПЕРВЫЙ рендер этого вида карточки в проекте. Ближе к обычной term-карточке,
// чем к карточке-окну: у capped_term дедлайн один, настоящий и готовый —
// потолки не альтернативные даты, а объяснение, ПОЧЕМУ дедлайн именно такой.
// Поэтому шапка, подпись и сама дата берутся у monthTermCard один в один, а
// добавляется ровно один блок — разбор потолков.
//
// Блок потолков живёт НЕ в details: пользователь, увидевший одну дату без
// разбора, не отличит эту карточку от обычной и не поймёт, почему при сдвиге
// одной из введённых дат дедлайн не сдвинулся (типовой случай: двигают дату
// знания об основаниях, а ограничивает десятилетний предел). Разбор — часть
// ответа, а не уточнение к нему.

// Подписи потолков — человеческий текст, объясняющий результат, а не цитата
// нормы. Поэтому они здесь, в слое представления, а не в apk/bankruptcy.js:
// тот же принцип, по которому WINDOW_STATE_NOTE_APK и WINDOW_ANCHOR_CAPTION_APK
// лежат в apk/views.js, а не в apk/chain.js.
const CAP_CAPTION_BANKRUPTCY = {
  subjective: 'три года со дня, когда стало известно об основаниях',
  absolute: 'десять лет со дня действий (бездействия)',
  post_conclusion: 'три года со дня завершения конкурсного производства',
};

// Объективный потолок п. 5 — единственный, чья подпись зависит от введённых
// данных: у него три альтернативных события, и назвать их одним общим словом
// значило бы скрыть, от какой даты реально посчитан потолок.
const OBJECTIVE_CAP_CAPTION_BANKRUPTCY = {
  bankruptcy_declared: 'три года со дня признания должника банкротом',
  case_terminated: 'три года со дня прекращения производства по делу о банкротстве',
  petition_returned:
    'три года со дня возврата уполномоченному органу заявления о признании должника банкротом',
};

function capCaption(capId, result) {
  if (capId === 'objective') {
    return (
      OBJECTIVE_CAP_CAPTION_BANKRUPTCY[result.anchors.objective_cap_event] ??
      'три года со дня события, выбранного пользователем'
    );
  }
  return CAP_CAPTION_BANKRUPTCY[capId] ?? capId;
}

/**
 * Карточка срока, ограниченного несколькими кумулятивными потолками
 * (ст. 61.14 ФЗ № 127-ФЗ). Отдельная функция, а не надстройка над
 * monthTermCard: разбор потолков нужен всегда и в развёрнутом виде, а
 * monthTermCard кладёт всё пояснительное в свёрнутый details.
 *
 * `caps` на карточке — УПОРЯДОЧЕННЫЙ МАССИВ строк для показа, а не объект
 * {потолок: дата} из результата расчёта: слою вывода нужны подпись, отметка
 * связывания и порядок, а выводить их заново из двух полей результата он не
 * должен. Порядок строк — порядок потолков в результате (он же порядок в самой
 * норме: субъективный, объективный, абсолютный). `binding` копируется как есть,
 * массивом id: потолки могут совпасть по дате, и выбирать из равных один
 * произвольно значило бы соврать о причине ограничения.
 *
 * @param {object} node — константа узла (нужен только title).
 * @param {object} result — результат compute-функции (kind: 'capped_term').
 */
export function cappedTermCard(node, result) {
  const bindingIds = new Set(result.binding);

  const caps = Object.entries(result.caps).map(([capId, rawDate]) => {
    const row = {
      id: capId,
      caption: capCaption(capId, result),
      // Дата потолка — СЫРАЯ, до переноса: отдельный потолок сам по себе не
      // является последним днём процессуального срока (ч. 4 ст. 114 АПК РФ
      // говорит о последнем дне срока), им становится только минимум из них.
      date: rawDate,
      binding: bindingIds.has(capId),
    };
    // Перенос показываем только у связавшей строки и только когда он реально
    // был. Иначе на экране необъяснимое расхождение: подсвечен потолок
    // 05.04.2025, а дедлайн карточки — 07.04.2025. У несвязавших потолков
    // переноса нет вовсе — они последним днём срока не стали и никуда не
    // переносятся.
    if (row.binding && rawDate !== result.deadline) row.shifted_to = result.deadline;
    return row;
  });

  const card = {
    id: result.id,
    kind: 'capped_term',
    title: node.title,
    status: 'computed',
    deadline: result.deadline,
    norm: result.norm.primary,
    caps,
    binding: [...result.binding],
    details: {
      collapsed: true,
      logic: result.logic,
      calculation: result.norm.calculation,
      midnight_rule: result.midnight_rule,
    },
  };
  // Предупреждение календаря — по итоговому дедлайну, а не по каждому потолку:
  // потолки, не ставшие дедлайном, не переносятся и в календарь не попадают.
  attachCalendarWarning(card);
  return card;
}

// --- Карточка узла-события (kind: 'event') ------------------------------------
//
// Общий билдер на ТРИ узла этого вида: завершение процедуры внесудебного
// банкротства (п. 1 ст. 223.6, OUT_OF_COURT_BANKRUPTCY_COMPLETION_APK),
// право на повторную подачу после возврата заявления (п. 6 ст. 223.2,
// OUT_OF_COURT_BANKRUPTCY_REAPPLICATION_APK) и право на повторную подачу
// после завершения предыдущей процедуры (п. 8 ст. 223.2,
// OUT_OF_COURT_BANKRUPTCY_REAPPLICATION_AFTER_PRIOR_APK). Все три — не
// срок, который кто-либо подаёт, а момент смены статуса, наступающий сам.
// Третий узел подключился без единой правки в этом билдере — подтверждение,
// что обобщение из задачи п. 6 работает не только на два случая.
//
// По образцу eventCard из apk/views.js (там — вступление акта АПК в законную
// силу): та же тройка полей результата — kind: 'event', status: 'resolved'
// (не 'computed', как у term), дата в поле card.date (не card.deadline,
// который у события по смыслу нет — оно не имеет «последнего дня подачи»).
//
// Текст строки и пояснение — ДАННЫЕ узла (node.event_text_template с
// плейсхолдером {date}, node.event_hint), а не константа этого билдера или
// renderEvent: у каждого узла смысл события свой («завершена» / «право
// открыто» / «право открыто после другой процедуры»), а форма карточки —
// одна. Билдер только переносит эти два поля в card как есть, не
// формулирует их сам.
//
// Отличие от apk/views.js — не форма карточки, а откуда берётся дата. Там
// entry.date считается вне computeSimpleTerm: либо вводится явно (дата акта
// вышестоящей инстанции), либо выводится из дедлайна соседнего узла плюс
// день, и entry.based_on объясняет, какой из двух путей сработал. Здесь у
// обоих узлов якорь один и явный, поэтому дата считается обычным
// computeSimpleTerm — той же арифметикой, что и у term-узлов этого домена, —
// а card.based_on им не нужен и не заполняется: выбирать не из чего.
function eventCard(node, term) {
  const card = {
    id: node.id,
    kind: 'event',
    title: node.title,
    status: 'resolved',
    norm: term.norm.primary,
    date: term.deadline,
    // Текст строки и пояснение — из узла как есть, без изменений: смысл
    // события у каждого узла свой (завершение процедуры vs открытие права
    // на повторную подачу), билдер этот текст не формулирует, только
    // переносит.
    eventTextTemplate: node.event_text_template,
    hint: node.event_hint,
    details: {
      collapsed: true,
      logic: term.logic,
      calculation: term.norm.calculation,
      midnight_rule: term.midnight_rule,
    },
  };
  attachCalendarWarning(card, card.date);
  return card;
}

// --- Карточка узла-окна (kind: 'window') --------------------------------------
//
// ПЕРВЫЙ узел домена банкротства этого вида — окно подачи заявления об
// утверждении мирового соглашения (п. 2 ст. 158 ФЗ № 127-ФЗ). Результат не
// один дедлайн, а две границы: раньше нижней подавать нельзя, позже верхней —
// поздно.
//
// По образцу windowCard из apk/views.js (ч. 3 ст. 222.1 АПК): те же имена
// полей — earliest_filing_date/latest_filing_date (не from/to: подписи границ
// «не ранее»/«не позднее», и нижняя граница сроком на подачу не является), тот
// же anchors — объект «поле → дата», из которого страница строит строки «от
// чего посчитана граница».
//
// НЕ перенесены state/note и ветка 'open': у образца границы считаются от
// РАЗНЫХ якорей, из-за чего верхней границы может ещё не быть, а окно может
// оказаться пустым. Здесь якорь один и общий, 5 < 10 всегда — обе границы
// определены с момента ввода якоря, и ни одно из этих состояний возникнуть не
// может. Ветка, которая никогда не выполнится, в карточку не переносится.
//
// first_working_day — из результата как есть: у working_day-окна он общий для
// обеих границ (один якорь, один offset_start), и без него непонятно, почему
// окно уехало вперёд, если сразу за датой заключения идут праздничные дни. Тот
// же приём, что у term-карточки working_day-узла ст. 47 п. 1.
function windowCard(node, result) {
  const card = {
    id: node.id,
    kind: 'window',
    title: node.title,
    status: 'computed',
    norm: result.norm.primary,
    earliest_filing_date: result.earliest_filing_date,
    latest_filing_date: result.latest_filing_date,
    first_working_day: result.first_working_day,
    anchors: result.anchors,
    details: {
      collapsed: true,
      logic: result.logic,
      calculation: result.norm.calculation,
      midnight_rule: result.midnight_rule,
    },
  };
  // Предупреждение календаря — по верхней границе: именно она последний день
  // срока, и именно она переносится, если выпала на нерабочий день.
  attachCalendarWarning(card, card.latest_filing_date);
  return card;
}

// Строители карточек по внутреннему виду узла. Сигнатура карты — (node, term),
// как в CARD_BUILDERS_APK; workingDayCard из ядра принимает только term, и
// узел ей не нужен (весь заголовок и норма уже в результате расчёта) — поэтому
// она обёрнута, а не положена в карту напрямую.
//
// Ключ 'working_day' — выбор строителя, а не вид готовой карточки: сама
// workingDayCard проставляет kind: 'term', и для markExpired, сводок и
// страницы такая карточка неотличима от обычного срока. Ключ 'event',
// наоборот, совпадает с итоговым card.kind — как и у 'capped_term'.
const CARD_BUILDERS_BANKRUPTCY = {
  capped_term: cappedTermCard,
  working_day: (_node, term) => workingDayCard(term),
  event: eventCard,
  window: windowCard,
};

// --- Зависимости узлов --------------------------------------------------------

// Значение дискриминатора objective_cap_event → имя поля с датой. Дублирует
// OBJECTIVE_CAP_DATE_FIELD_APK из apk/bankruptcy.js: та константа не
// экспортирована, а apk/bankruptcy.js в этой задаче не трогаем. Ровно тот же
// случай, что уже есть в модуле АПК — ENFORCEMENT_DATE_BY_CASE_TYPE продублирована
// между apk/views.js и apk/app.js по той же причине. Здесь это вопрос только
// полноты входа: какая дата реально нужна расчёту, по-прежнему решает сама
// модель, эта таблица лишь заранее говорит, чего не хватает.
const OBJECTIVE_CAP_DATE_FIELD_BANKRUPTCY = {
  bankruptcy_declared: 'bankruptcy_declared_date_apk',
  case_terminated: 'bankruptcy_case_terminated_date_apk',
  petition_returned: 'bankruptcy_petition_returned_date_apk',
};

// Зависимости узла п. 5 ст. 61.14: две даты нужны всегда, третья выбирается
// дискриминатором. Пока дискриминатор не введён — он сам и есть недостающее
// поле, какую из трёх дат спрашивать, ещё неизвестно. Та же конструкция, что у
// enforcement_presentation_apk в apk/views.js.
function subsidiaryInCaseDeps(inputs) {
  const dateField = OBJECTIVE_CAP_DATE_FIELD_BANKRUPTCY[inputs.objective_cap_event];
  return [
    'subsidiary_liability_grounds_known_date_apk',
    'objective_cap_event',
    ...(dateField ? [dateField] : []),
    'subsidiary_liability_conduct_date_apk',
  ];
}

function subsidiaryPostConclusionDeps() {
  return ['bankruptcy_proceeding_conclusion_date_apk', 'subsidiary_liability_conduct_date_apk'];
}

// --- Реестр узлов --------------------------------------------------------------
//
// Восстановительные узлы субсидиарки объявлены с ТЕМИ ЖЕ deps, что и их базовые
// узлы, без обёртки вроде restorationDeps() из apk/views.js: там обёртка
// добавляла subject_category и альтернативный якорь «дата, когда узнал о
// нарушении», а у ст. 61.14 восстановительный потолок один для всех — ни
// категории заявителя, ни уточняющих полей у него нет. Прецедент такого
// простого deps в проекте есть: new_circumstances_review_apk_restoration
// (apk/views.js) объявлен ровно так же и по той же причине.
//
// Следствие, которое так и задумано: пока базовый узел неполон, его
// восстановительный узел попадает в «что ещё уточнить» с ДОСЛОВНО тем же
// списком недостающих полей. Пользователь видит обе записи рядом в одной ветви,
// и заполняет поля один раз на оба узла.
const NODE_REQUIREMENTS_BANKRUPTCY = {
  // Единственный в домене срок, исчисляемый рабочими днями, — и единственная
  // карточка kind: 'working_day'. Её строит workingDayCard, а не monthTermCard:
  // у таких сроков расчёт отдаёт first_working_day (день, с которого пошёл
  // отсчёт), и без него непонятно, почему дата такая далёкая после каникул.
  // Так же устроены все working_day-узлы ГПК в src/views.js.
  debtor_response_bankruptcy_apk: {
    node: DEBTOR_RESPONSE_BANKRUPTCY_APK,
    kind: 'working_day',
    deps: () => ['creditor_petition_acceptance_ruling_received_date_apk'],
    compute: (i) => computeDebtorResponseBankruptcyApk(i),
  },
  creditor_claims_submission_apk: {
    node: CREDITOR_CLAIMS_SUBMISSION_APK,
    deps: () => ['observation_introduction_notice_published_date_apk'],
    compute: (i) => computeCreditorClaimsSubmissionApk(i),
  },
  creditors_register_closure_apk: {
    node: CREDITORS_REGISTER_CLOSURE_APK,
    deps: () => ['bankruptcy_declaration_notice_published_date_apk'],
    compute: (i) => computeCreditorsRegisterClosureApk(i),
  },
  creditor_claim_exclusion_apk: {
    node: CREDITOR_CLAIM_EXCLUSION_APK,
    deps: () => ['creditor_claim_unjustified_circumstances_known_date_apk'],
    compute: (i) => computeCreditorClaimExclusionApk(i),
  },
  citizen_bankruptcy_creditor_claims_apk: {
    node: CITIZEN_BANKRUPTCY_CREDITOR_CLAIMS_APK,
    deps: () => ['citizen_bankruptcy_petition_justified_notice_published_date_apk'],
    compute: (i) => computeCitizenBankruptcyCreditorClaimsApk(i),
  },
  bankruptcy_completion_review_apk: {
    node: BANKRUPTCY_COMPLETION_REVIEW_APK,
    deps: () => ['bankruptcy_completion_review_circumstances_discovered_date_apk'],
    compute: (i) => computeBankruptcyCompletionReviewApk(i),
  },
  // Ещё один working_day-узел домена — тот же паттерн регистрации, что у
  // appraiser_involvement_request_apk выше (kind: 'working_day', строит
  // workingDayCard).
  citizen_information_disclosure_apk: {
    node: CITIZEN_INFORMATION_DISCLOSURE_APK,
    kind: 'working_day',
    deps: () => ['citizen_information_disclosure_request_received_date_apk'],
    compute: (i) => computeCitizenInformationDisclosureApk(i),
  },
  subsidiary_liability_in_case_apk: {
    node: SUBSIDIARY_LIABILITY_IN_CASE_APK,
    kind: 'capped_term',
    deps: subsidiaryInCaseDeps,
    compute: (i) => computeSubsidiaryLiabilityInCaseApk(i),
  },
  subsidiary_liability_in_case_apk_restoration: {
    node: SUBSIDIARY_LIABILITY_IN_CASE_APK_RESTORATION,
    deps: subsidiaryInCaseDeps,
    compute: (i) => computeSubsidiaryLiabilityInCaseApkRestoration(i),
  },
  subsidiary_liability_post_conclusion_apk: {
    node: SUBSIDIARY_LIABILITY_POST_CONCLUSION_APK,
    kind: 'capped_term',
    deps: subsidiaryPostConclusionDeps,
    compute: (i) => computeSubsidiaryLiabilityPostConclusionApk(i),
  },
  subsidiary_liability_post_conclusion_apk_restoration: {
    node: SUBSIDIARY_LIABILITY_POST_CONCLUSION_APK_RESTORATION,
    deps: subsidiaryPostConclusionDeps,
    compute: (i) => computeSubsidiaryLiabilityPostConclusionApkRestoration(i),
  },
  out_of_court_bankruptcy_completion_apk: {
    node: OUT_OF_COURT_BANKRUPTCY_COMPLETION_APK,
    kind: 'event',
    deps: () => ['out_of_court_bankruptcy_initiation_notice_included_date_apk'],
    compute: (i) => computeOutOfCourtBankruptcyCompletionApk(i),
  },
  out_of_court_bankruptcy_reapplication_apk: {
    node: OUT_OF_COURT_BANKRUPTCY_REAPPLICATION_APK,
    kind: 'event',
    deps: () => ['out_of_court_bankruptcy_return_date_apk'],
    compute: (i) => computeOutOfCourtBankruptcyReapplicationApk(i),
  },
  out_of_court_bankruptcy_reapplication_after_prior_apk: {
    node: OUT_OF_COURT_BANKRUPTCY_REAPPLICATION_AFTER_PRIOR_APK,
    kind: 'event',
    deps: () => ['out_of_court_bankruptcy_prior_procedure_end_date_apk'],
    compute: (i) => computeOutOfCourtBankruptcyReapplicationAfterPriorApk(i),
  },
  settlement_agreement_approval_application_apk: {
    node: SETTLEMENT_AGREEMENT_APPROVAL_APPLICATION_APK,
    kind: 'window',
    deps: () => ['settlement_agreement_conclusion_date_apk'],
    compute: (i) => computeSettlementAgreementApprovalApplicationApk(i),
  },
  // Обычный term-узел (kind не указан — по умолчанию 'term', карточка строится
  // через monthTermCard уже существующим общим путём buildViewBankruptcy).
  // Регистрация здесь обязательна для любого узла независимо от вида карточки
  // — это не новый билдер и не правка диспетчера/renderTermCard.
  settlement_agreement_review_apk: {
    node: SETTLEMENT_AGREEMENT_REVIEW_APK,
    deps: () => ['settlement_agreement_review_circumstances_discovered_date_apk'],
    compute: (i) => computeSettlementAgreementReviewApk(i),
  },
  // Второй в домене срок, исчисляемый рабочими днями — тот же паттерн
  // регистрации, что у debtor_response_bankruptcy_apk выше (kind:
  // 'working_day', строит workingDayCard). Задача просила не трогать этот
  // файл ("обычный term, kind: 'term' полностью обобщён") — это неточно для
  // working_day-узла: без kind: 'working_day' карточка не покажет
  // first_working_day и будет строиться через monthTermCard, как обычный
  // срок, а не через workingDayCard. Регистрация обязательна для любого
  // узла независимо от вида карточки — не новый билдер и не правка
  // диспетчера, оба (kind: 'working_day' и workingDayCard) уже существуют.
  appraiser_involvement_request_apk: {
    node: APPRAISER_INVOLVEMENT_REQUEST_APK,
    kind: 'working_day',
    deps: () => ['inventory_results_included_date_apk'],
    compute: (i) => computeAppraiserInvolvementRequestApk(i),
  },
  // Третий и четвёртый working_day-узлы домена — тот же паттерн, что у
  // appraiser_involvement_request_apk выше.
  claims_ruling_reasoned_request_apk: {
    node: CLAIMS_RULING_REASONED_REQUEST_APK,
    kind: 'working_day',
    deps: () => ['claims_ruling_resolutive_part_date_apk'],
    compute: (i) => computeClaimsRulingReasonedRequestApk(i),
  },
  claims_ruling_reasoned_appeal_apk: {
    node: CLAIMS_RULING_REASONED_APPEAL_APK,
    kind: 'working_day',
    deps: () => ['claims_ruling_reasoned_date_apk'],
    compute: (i) => computeClaimsRulingReasonedAppealApk(i),
  },
  // Пятый working_day-узел домена — тот же паттерн регистрации.
  enterprise_sale_payment_apk: {
    node: ENTERPRISE_SALE_PAYMENT_APK,
    kind: 'working_day',
    deps: () => ['enterprise_sale_agreement_signed_date_apk'],
    compute: (i) => computeEnterpriseSalePaymentApk(i),
  },
  // Обычный месячный узел — тот же паттерн регистрации, что у
  // settlement_agreement_review_apk выше (без kind: карточка строится через
  // monthTermCard уже существующим общим путём buildViewBankruptcy).
  settlement_agreement_rejection_appeal_apk: {
    node: SETTLEMENT_AGREEMENT_REJECTION_APPEAL_APK,
    deps: () => ['settlement_agreement_rejection_ruling_date_apk'],
    compute: (i) => computeSettlementAgreementRejectionAppealApk(i),
  },
  // Три следующих узла — тот же паттерн регистрации, что у
  // settlement_agreement_rejection_appeal_apk выше (без kind: обычная
  // месячная term-карточка через monthTermCard).
  external_management_introduction_extension_appeal_apk: {
    node: EXTERNAL_MANAGEMENT_INTRODUCTION_EXTENSION_APPEAL_APK,
    deps: () => ['external_management_introduction_extension_ruling_date_apk'],
    compute: (i) => computeExternalManagementIntroductionExtensionAppealApk(i),
  },
  external_management_reduction_appeal_apk: {
    node: EXTERNAL_MANAGEMENT_REDUCTION_APPEAL_APK,
    deps: () => ['external_management_reduction_ruling_date_apk'],
    compute: (i) => computeExternalManagementReductionAppealApk(i),
  },
  external_management_plan_invalidation_appeal_apk: {
    node: EXTERNAL_MANAGEMENT_PLAN_INVALIDATION_APPEAL_APK,
    deps: () => ['external_management_plan_invalidation_ruling_date_apk'],
    compute: (i) => computeExternalManagementPlanInvalidationAppealApk(i),
  },
  external_management_term_expiry_refusal_appeal_apk: {
    node: EXTERNAL_MANAGEMENT_TERM_EXPIRY_REFUSAL_APPEAL_APK,
    deps: () => ['external_management_term_expiry_refusal_ruling_date_apk'],
    compute: (i) => computeExternalManagementTermExpiryRefusalAppealApk(i),
  },
  // Шесть узлов обязанностей внешнего управляющего по срокам — обычные
  // месячные (без kind) и working_day (kind: 'working_day') узлы, тот же
  // паттерн регистрации, что и у всех предыдущих узлов домена.
  external_management_plan_development_apk: {
    node: EXTERNAL_MANAGEMENT_PLAN_DEVELOPMENT_APK,
    deps: () => ['external_management_manager_approved_date_apk'],
    compute: (i) => computeExternalManagementPlanDevelopmentApk(i),
  },
  external_management_plan_meeting_apk: {
    node: EXTERNAL_MANAGEMENT_PLAN_MEETING_APK,
    deps: () => ['external_management_manager_approved_date_apk'],
    compute: (i) => computeExternalManagementPlanMeetingApk(i),
  },
  external_management_plan_submission_apk: {
    node: EXTERNAL_MANAGEMENT_PLAN_SUBMISSION_APK,
    kind: 'working_day',
    deps: () => ['external_management_plan_meeting_date_apk'],
    compute: (i) => computeExternalManagementPlanSubmissionApk(i),
  },
  external_management_report_submission_apk: {
    node: EXTERNAL_MANAGEMENT_REPORT_SUBMISSION_APK,
    kind: 'working_day',
    deps: () => ['external_management_report_meeting_date_apk'],
    compute: (i) => computeExternalManagementReportSubmissionApk(i),
  },
  external_management_report_on_full_satisfaction_apk: {
    node: EXTERNAL_MANAGEMENT_REPORT_ON_FULL_SATISFACTION_APK,
    deps: () => ['external_management_full_satisfaction_date_apk'],
    compute: (i) => computeExternalManagementReportOnFullSatisfactionApk(i),
  },
  external_management_handover_apk: {
    node: EXTERNAL_MANAGEMENT_HANDOVER_APK,
    kind: 'working_day',
    deps: () => ['receiver_approved_date_apk'],
    compute: (i) => computeExternalManagementHandoverApk(i),
  },
  // Последние два узла главы VI — тот же паттерн регистрации working_day,
  // что и у остальных duty-узлов домена, из одного и того же поля ввода.
  external_management_creditor_notification_apk: {
    node: EXTERNAL_MANAGEMENT_CREDITOR_NOTIFICATION_APK,
    kind: 'working_day',
    deps: () => ['external_management_third_party_satisfaction_date_apk'],
    compute: (i) => computeExternalManagementCreditorNotificationApk(i),
  },
  external_management_report_special_completion_apk: {
    node: EXTERNAL_MANAGEMENT_REPORT_SPECIAL_COMPLETION_APK,
    kind: 'working_day',
    deps: () => ['external_management_third_party_satisfaction_date_apk'],
    compute: (i) => computeExternalManagementReportSpecialCompletionApk(i),
  },
  // Обычный месячный узел — без kind, карточка строится через monthTermCard
  // уже существующим общим путём buildViewBankruptcy.
  bankruptcy_property_sale_proposal_apk: {
    node: BANKRUPTCY_PROPERTY_SALE_PROPOSAL_APK,
    deps: () => ['property_inventory_or_valuation_completion_date_apk'],
    compute: (i) => computeBankruptcyPropertySaleProposalApk(i),
  },
  appraisal_report_registry_inclusion_apk: {
    node: APPRAISAL_REPORT_REGISTRY_INCLUSION_APK,
    kind: 'working_day',
    deps: () => ['appraisal_report_copy_received_date_apk'],
    compute: (i) => computeAppraisalReportRegistryInclusionApk(i),
  },
  enterprise_sale_procedure_approval_appeal_apk: {
    node: ENTERPRISE_SALE_PROCEDURE_APPROVAL_APPEAL_APK,
    deps: () => ['enterprise_sale_procedure_approval_ruling_date_apk'],
    compute: (i) => computeEnterpriseSaleProcedureApprovalAppealApk(i),
  },
  property_sale_procedure_approval_appeal_apk: {
    node: PROPERTY_SALE_PROCEDURE_APPROVAL_APPEAL_APK,
    deps: () => ['property_sale_procedure_approval_ruling_date_apk'],
    compute: (i) => computePropertySaleProcedureApprovalAppealApk(i),
  },
  bankruptcy_completion_request_ruling_appeal_apk: {
    node: BANKRUPTCY_COMPLETION_REQUEST_RULING_APPEAL_APK,
    deps: () => ['bankruptcy_completion_request_ruling_date_apk'],
    compute: (i) => computeBankruptcyCompletionRequestRulingAppealApk(i),
  },
  // Стадия наблюдения (глава III) — два новых working_day-узла, тот же
  // паттерн регистрации, что у остальных working_day duty-узлов домена.
  observation_information_request_response_apk: {
    node: OBSERVATION_INFORMATION_REQUEST_RESPONSE_APK,
    kind: 'working_day',
    deps: () => ['observation_information_request_received_date_apk'],
    compute: (i) => computeObservationInformationRequestResponseApk(i),
  },
  observation_introduction_notification_apk: {
    node: OBSERVATION_INTRODUCTION_NOTIFICATION_APK,
    kind: 'working_day',
    deps: () => ['observation_introduction_ruling_date_apk'],
    compute: (i) => computeObservationIntroductionNotificationApk(i),
  },
  // Пять узлов последствий открытия конкурсного производства (ст. 127-129) —
  // тот же паттерн регистрации, что и у всех предыдущих узлов домена: обычный
  // месячный узел без kind (monthTermCard) или working_day.
  bankruptcy_manager_appointment_appeal_apk: {
    node: BANKRUPTCY_MANAGER_APPOINTMENT_APPEAL_APK,
    deps: () => ['bankruptcy_manager_appointment_ruling_date_apk'],
    compute: (i) => computeBankruptcyManagerAppointmentAppealApk(i),
  },
  bankruptcy_information_publication_apk: {
    node: BANKRUPTCY_INFORMATION_PUBLICATION_APK,
    kind: 'working_day',
    deps: () => ['bankruptcy_declaration_ruling_date_apk'],
    compute: (i) => computeBankruptcyInformationPublicationApk(i),
  },
  bankruptcy_property_inventory_apk: {
    node: BANKRUPTCY_PROPERTY_INVENTORY_APK,
    deps: () => ['bankruptcy_declaration_ruling_date_apk'],
    compute: (i) => computeBankruptcyPropertyInventoryApk(i),
  },
  bankruptcy_employee_dismissal_notice_apk: {
    node: BANKRUPTCY_EMPLOYEE_DISMISSAL_NOTICE_APK,
    deps: () => ['bankruptcy_declaration_ruling_date_apk'],
    compute: (i) => computeBankruptcyEmployeeDismissalNoticeApk(i),
  },
  bankruptcy_inventory_results_registry_apk: {
    node: BANKRUPTCY_INVENTORY_RESULTS_REGISTRY_APK,
    kind: 'working_day',
    deps: () => ['property_inventory_completion_date_apk'],
    compute: (i) => computeBankruptcyInventoryResultsRegistryApk(i),
  },
  // Два узла обжалования по институту мирового соглашения (ст. 163 п. 1;
  // ст. 165 п. 4) — тот же паттерн регистрации, что и у всех предыдущих
  // appeal-узлов домена: обычная месячная term-карточка без kind
  // (monthTermCard).
  settlement_cancellation_resumption_appeal_apk: {
    node: SETTLEMENT_CANCELLATION_RESUMPTION_APPEAL_APK,
    deps: () => ['settlement_cancellation_resumption_ruling_date_apk'],
    compute: (i) => computeSettlementCancellationResumptionAppealApk(i),
  },
  settlement_termination_ruling_appeal_apk: {
    node: SETTLEMENT_TERMINATION_RULING_APPEAL_APK,
    deps: () => ['settlement_termination_ruling_date_apk'],
    compute: (i) => computeSettlementTerminationRulingAppealApk(i),
  },
  // Собственная обязанность гражданина подать заявление о своём банкротстве
  // (п. 1 ст. 213.4) — тот же паттерн регистрации, что и у остальных
  // working_day-узлов домена.
  citizen_bankruptcy_filing_duty_apk: {
    node: CITIZEN_BANKRUPTCY_FILING_DUTY_APK,
    kind: 'working_day',
    deps: () => ['citizen_bankruptcy_filing_duty_known_date_apk'],
    compute: (i) => computeCitizenBankruptcyFilingDutyApk(i),
  },
  // Проект и утверждение положения о порядке реализации имущества гражданина
  // (п. 1 ст. 213.26) — два узла из одного якоря, тот же приём регистрации,
  // что у external_management_plan_development_apk/
  // external_management_plan_meeting_apk выше.
  citizen_property_sale_proposal_apk: {
    node: CITIZEN_PROPERTY_SALE_PROPOSAL_APK,
    deps: () => ['citizen_property_inventory_valuation_completion_date_apk'],
    compute: (i) => computeCitizenPropertySaleProposalApk(i),
  },
  citizen_property_sale_approval_apk: {
    node: CITIZEN_PROPERTY_SALE_APPROVAL_APK,
    deps: () => ['citizen_property_inventory_valuation_completion_date_apk'],
    compute: (i) => computeCitizenPropertySaleApprovalApk(i),
  },
  // Обязанность кредитной организации уведомить финансового управляющего
  // (п. 5 ст. 213.24) — working_day-узел, тот же паттерн регистрации, что и у
  // остальных working_day-узлов домена.
  bank_notification_duty_apk: {
    node: BANK_NOTIFICATION_DUTY_APK,
    kind: 'working_day',
    deps: () => ['bank_citizen_bankruptcy_known_date_apk'],
    compute: (i) => computeBankNotificationDutyApk(i),
  },
  // Обжалование определения об утверждении перечня имущества, исключаемого из
  // конкурсной массы (п. 2 ст. 213.25, ч. 1 ст. 61) — тот же паттерн
  // регистрации, что и у остальных appeal-узлов домена.
  property_exclusion_ruling_appeal_apk: {
    node: PROPERTY_EXCLUSION_RULING_APPEAL_APK,
    deps: () => ['property_exclusion_ruling_date_apk'],
    compute: (i) => computePropertyExclusionRulingAppealApk(i),
  },
  // Ходатайство об уменьшении размера денежных средств, исключаемых из
  // конкурсной массы (п. 2 ст. 213.27) — working_day-узел, тот же паттерн
  // регистрации, что и у остальных working_day-узлов домена. Отдельная
  // ветвь от property_exclusion_ruling_appeal_apk выше — другой якорь.
  property_exclusion_amount_dispute_apk: {
    node: PROPERTY_EXCLUSION_AMOUNT_DISPUTE_APK,
    kind: 'working_day',
    deps: () => ['property_exclusion_amount_notice_published_date_apk'],
    compute: (i) => computePropertyExclusionAmountDisputeApk(i),
  },
  // Обжалование определения о продлении срока конкурсного производства
  // (п. 3 ст. 124, ч. 1 ст. 61) — обычный месячный узел, тот же паттерн
  // регистрации, что и у остальных appeal-узлов домена (без kind).
  bankruptcy_proceeding_extension_appeal_apk: {
    node: BANKRUPTCY_PROCEEDING_EXTENSION_APPEAL_APK,
    deps: () => ['bankruptcy_proceeding_extension_ruling_date_apk'],
    compute: (i) => computeBankruptcyProceedingExtensionAppealApk(i),
  },
};

// --- Истёкшие сроки -----------------------------------------------------------
//
// Обе карты пустые — как и в модуле АПК: ни у одного узла домена банкротства
// нет поля «дата фактической подачи», подтверждающего совершение действия.
// Поэтому срок может быть помечен только как 'expired' (прошёл по календарю),
// но никогда как 'missed' (факт пропуска установлен), и норма восстановления на
// карточке для этого не требуется.
const ACTION_FACT_INPUT_BANKRUPTCY = {};
const MISSED_FROM_FILING_BANKRUPTCY = new Set();

function markExpired(cards, inputs, today) {
  return genericMarkExpired(cards, inputs, today, {
    factInputMap: ACTION_FACT_INPUT_BANKRUPTCY,
    missedFromFilingIds: MISSED_FROM_FILING_BANKRUPTCY,
  });
}

// --- Публичная сборка ---------------------------------------------------------

/**
 * Собирает структуру для отображения из входных данных домена банкротства.
 * @param {object} inputs — поля ввода (см. apk/bankruptcy-labels.js).
 * @param {{today?: Date|string}} [options] — текущая дата (передаётся явно).
 * @returns {{cards: object[], incomplete: object[], stubs: object[]}}
 */
export function buildViewBankruptcy(inputs, options = {}) {
  const data = inputs ?? {};
  const today = options.today != null ? toISO(options.today) : null;
  const cards = [];
  const incomplete = [];

  for (const [id, spec] of Object.entries(NODE_REQUIREMENTS_BANKRUPTCY)) {
    const kind = spec.kind ?? 'term';
    const deps = spec.deps(data);
    const missing = missingInputs(deps, data);
    if (missing.length > 0) {
      incomplete.push(
        incompleteNode(
          id,
          // В incomplete-записи вид карточки — тот, каким она станет,
          // когда данных хватит; 'working_day' там неотличим от обычного
          // срока и приводится к 'term', как это уже сделано в apk/views.js
          // для kind: 'window' (он там в incomplete тоже попадает как есть).
          kind === 'working_day' ? 'term' : kind,
          spec.node.title,
          'Не хватает данных для расчёта — заполните недостающие поля.',
          missing,
        ),
      );
      continue;
    }

    // Данных достаточно, но расчёт всё равно может отказать — например, на
    // неизвестном значении дискриминатора objective_cap_event, пришедшем не из
    // формы. Сообщение модели уже человекочитаемо, показываем его.
    let term;
    try {
      term = spec.compute(data);
    } catch (error) {
      cards.push({ id, kind: 'error', title: spec.node.title, message: error.message });
      continue;
    }

    const buildCard = CARD_BUILDERS_BANKRUPTCY[kind];
    cards.push(buildCard ? buildCard(spec.node, term) : monthTermCard(term));
  }

  // Заглушек (статических карточек неподдерживаемых ветвей) в домене
  // банкротства нет: все пять ветвей раскрыты узлами. Поле сохраняется в
  // структуре, чтобы форма возврата совпадала с ГПК- и АПК-модулями.
  return { cards: markExpired(cards, data, today), incomplete, stubs: [] };
}
