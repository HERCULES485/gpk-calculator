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
  computeSubsidiaryLiabilityInCaseApk,
  computeSubsidiaryLiabilityInCaseApkRestoration,
  computeSubsidiaryLiabilityPostConclusionApk,
  computeSubsidiaryLiabilityPostConclusionApkRestoration,
  DEBTOR_RESPONSE_BANKRUPTCY_APK,
  CREDITOR_CLAIMS_SUBMISSION_APK,
  CREDITOR_CLAIM_EXCLUSION_APK,
  CREDITORS_REGISTER_CLOSURE_APK,
  CITIZEN_BANKRUPTCY_CREDITOR_CLAIMS_APK,
  BANKRUPTCY_COMPLETION_REVIEW_APK,
  SUBSIDIARY_LIABILITY_IN_CASE_APK,
  SUBSIDIARY_LIABILITY_IN_CASE_APK_RESTORATION,
  SUBSIDIARY_LIABILITY_POST_CONCLUSION_APK,
  SUBSIDIARY_LIABILITY_POST_CONCLUSION_APK_RESTORATION,
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

// Строители карточек по внутреннему виду узла. Сигнатура карты — (node, term),
// как в CARD_BUILDERS_APK; workingDayCard из ядра принимает только term, и
// узел ей не нужен (весь заголовок и норма уже в результате расчёта) — поэтому
// она обёрнута, а не положена в карту напрямую.
//
// Ключ 'working_day' — выбор строителя, а не вид готовой карточки: сама
// workingDayCard проставляет kind: 'term', и для markExpired, сводок и
// страницы такая карточка неотличима от обычного срока.
const CARD_BUILDERS_BANKRUPTCY = {
  capped_term: cappedTermCard,
  working_day: (_node, term) => workingDayCard(term),
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
