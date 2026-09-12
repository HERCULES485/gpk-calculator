// Сборка карточек модуля АПК для отображения — аналог src/views.js для домена
// АПК. Берёт входные данные, считает узлы и возвращает готовую структуру данных
// для UI: карточки рассчитанных узлов, список неполных узлов («что ещё
// уточнить») и статические заглушки. Никакой вёрстки — только данные.
//
// Прогрессивное раскрытие, как у ГПК: полностью показываются только узлы, для
// которых достаточно введённых данных; остальные попадают в `incomplete` с
// причиной и названиями недостающих полей.
//
// СТРУКТУРНОЕ ОТЛИЧИЕ ОТ ГПК, из-за которого появилась NODE_REQUIREMENTS:
// compute-функции apk/chain.js бросают исключение на нехватке входа, а не
// возвращают null (у ГПК полноту входа проверяет сам views.js до вызова).
// Поэтому здесь нехватка данных выясняется ДО вызова, по декларативному списку
// зависимостей узла, и даёт incomplete-запись с подписью поля из labels.js.
// Перехват исключения для этого не используется: нехватка данных (ожидаемое
// состояние формы) и ошибка на структурно полных данных (пересечение периодов,
// неподдерживаемый исход апелляции) — разные случаи с разным видом карточки.

import {
  computeAppealGeneralApk,
  computeAppealGeneralApkRestoration,
  computeEntryIntoForceApk,
  computeCassationGeneralApk,
  computeCassationGeneralApkRestoration,
  computeEntryIntoForceAfterCassationApk,
  computeCassationVsApk,
  computeCassationVsApkRestoration,
  computePrivateComplaintFirstInstanceApk,
  computePrivateComplaintAppellateApk,
  computePrivateComplaintCassationApk,
  computePrivateComplaintAppellatePostanovlenieApk,
  computeEnforcementPresentationApk,
  computeEnforcementPresentationAfterRestorationApk,
  computeNadzorGeneralApk,
  computeNadzorGeneralApkRestoration,
  computeNewCircumstancesReviewApk,
  computeNewCircumstancesReviewApkRestoration,
  computeCourtCostsApplicationApk,
  computeReasonableTermCompensationApk,
  computeReasonableTermExecutionCompensationApk,
  APPEAL_GENERAL_APK,
  APPEAL_GENERAL_APK_RESTORATION,
  ENTRY_INTO_FORCE_APK,
  CASSATION_GENERAL_APK,
  CASSATION_GENERAL_APK_RESTORATION,
  ENTRY_INTO_FORCE_AFTER_CASSATION_APK,
  CASSATION_VS_APK,
  CASSATION_VS_APK_RESTORATION,
  PRIVATE_COMPLAINT_FIRST_INSTANCE_APK,
  PRIVATE_COMPLAINT_APPELLATE_APK,
  PRIVATE_COMPLAINT_CASSATION_APK,
  PRIVATE_COMPLAINT_APPELLATE_POSTANOVLENIE_APK,
  ENFORCEMENT_PRESENTATION_APK,
  ENFORCEMENT_PRESENTATION_AFTER_RESTORATION_APK,
  NADZOR_GENERAL_APK,
  NADZOR_GENERAL_APK_RESTORATION,
  NEW_CIRCUMSTANCES_REVIEW_APK,
  NEW_CIRCUMSTANCES_REVIEW_APK_RESTORATION,
  COURT_COSTS_APPLICATION_APK,
  REASONABLE_TERM_COMPENSATION_APK,
  REASONABLE_TERM_EXECUTION_COMPENSATION_APK,
  ENFORCEMENT_INTERRUPTION_TYPES_APK,
  ENFORCEMENT_EXCLUSION_TYPES_APK,
  SUSPENSION_TYPE_APK,
  RESTORATION_SUBJECT_CATEGORIES,
  CASSATION_RESTORATION_SUBJECT_CATEGORIES,
  CASSATION_VS_RESTORATION_SUBJECT_CATEGORIES,
  NADZOR_GENERAL_RESTORATION_SUBJECT_CATEGORIES,
} from './chain.js';

import {
  monthTermCard,
  attachCalendarWarning,
  incompleteNode,
  missingInputs as genericMissingInputs,
  markExpired as genericMarkExpired,
} from '../core/view/cards.js';
import { toISO } from '../core/engine/term.js';
import { INPUT_LABELS_APK } from './labels.js';

// --- Словари представления ---------------------------------------------------

// Подписи оснований перерыва и вычитаемых периодов берутся из каталогов самого
// chain.js (у записей есть title) — отдельного словаря подписей, как
// INTERRUPTION_TYPE_LABELS у ГПК, заводить не нужно.
const INTERRUPTION_TITLE_BY_ID_APK = Object.fromEntries(
  ENFORCEMENT_INTERRUPTION_TYPES_APK.map((t) => [t.id, t.title]),
);

// Период приостановления (ч. 2 ст. 321) в каталог оснований не входит: у него
// основание на арифметику не влияет и на входе не ожидается вовсе, тип
// проставляется расчётом. Подпись для истории нужна всё равно — она здесь, а
// сам идентификатор берётся из chain.js, чтобы строка не разъехалась с тем,
// чем расчёт реально помечает такие периоды.
const SUSPENSION_LABEL_APK = 'Приостановление исполнения (ч. 2 ст. 321 АПК РФ)';

const EXCLUSION_TITLE_BY_ID_APK = {
  [SUSPENSION_TYPE_APK]: SUSPENSION_LABEL_APK,
  ...Object.fromEntries(ENFORCEMENT_EXCLUSION_TYPES_APK.map((t) => [t.id, t.title])),
};

// Почему событие перерыва не принято в расчёт. Ключи — ignored_reason из
// core/engine/interruption.js; тексты свои, со ссылками на нормы АПК.
export const INTERRUPTION_IGNORED_TEXT_APK = {
  no_date: 'Дата не указана — событие в расчёт не принято.',
  unknown_type: 'Основание не распознано — событие в расчёт не принято.',
  before_anchor:
    'Событие раньше начала течения срока — в расчёт не принято: прерывать ещё ' +
    'не начавшийся срок нечем.',
};

// Почему период не вычтен из срока. Ключи — ignored_reason из
// core/engine/exclusion.js.
export const EXCLUSION_IGNORED_TEXT_APK = {
  no_start_date: 'Не указана дата начала периода — период в расчёт не принят.',
  no_end_date: 'Не указана дата окончания периода — период в расчёт не принят.',
  end_before_start: 'Окончание раньше начала — период в расчёт не принят.',
  unknown_type:
    'Основание окончания исполнения не подпадает под ч. 5 ст. 321 — период не вычитается.',
};

// --- Категории субъекта для узлов восстановления ------------------------------
//
// Каталог категорий с подписями для выпадающего списка. Идентификаторы здесь не
// дублируются: допустимые наборы приходят из chain.js (см. импорт выше), а
// здесь — только то, чего в модели нет и быть не должно, то есть подписи для
// интерфейса. Тест сверяет, что каталог покрывает объединение наборов модели.
export const RESTORATION_SUBJECT_CATEGORIES_APK = [
  {
    id: 'participating_duly_notified',
    label: 'Лицо, участвующее в деле, извещённое надлежащим образом',
  },
  {
    id: 'article_42_person',
    label: 'Лицо, не участвовавшее в деле, о правах которого принят акт (ст. 42 АПК РФ)',
  },
  {
    id: 'participating_improperly_notified',
    label: 'Лицо, участвующее в деле, извещённое ненадлежащим образом',
  },
];

// Какие категории применимы к какому узлу восстановления — наборы модели, как
// есть. У кассации в Судебную коллегию ВС РФ и у надзора их две, а не три:
// третья в ст. 259 и 276 появляется из отдельного разъяснения Пленума, а для
// ст. 291.2 и ст. 308.1 такого разъяснения нет (см. комментарии к
// CASSATION_VS_APK_RESTORATION и NADZOR_GENERAL_APK_RESTORATION в chain.js).
const RESTORATION_CATEGORY_SCOPE_APK = {
  appeal_general_apk_restoration: RESTORATION_SUBJECT_CATEGORIES,
  cassation_general_apk_restoration: CASSATION_RESTORATION_SUBJECT_CATEGORIES,
  cassation_vs_apk_restoration: CASSATION_VS_RESTORATION_SUBJECT_CATEGORIES,
  nadzor_general_apk_restoration: NADZOR_GENERAL_RESTORATION_SUBJECT_CATEGORIES,
};

// Текст для карточки «неприменимо»: почему именно эта категория не даёт срока
// на этом узле. Не общее «неприменимо» — пользователь должен понять причину.
function notApplicableReason(nodeId, category) {
  const label =
    RESTORATION_SUBJECT_CATEGORIES_APK.find((c) => c.id === category)?.label ?? category;
  if (nodeId === 'cassation_vs_apk_restoration') {
    return (
      `Для кассационной жалобы в Судебную коллегию ВС РФ эта категория заявителя ` +
      `не предусмотрена: ч. 2 ст. 291.2 АПК РФ называет только лицо, участвующее в ` +
      `деле, и лицо по ст. 42 АПК РФ. Выбрана категория «${label}».`
    );
  }
  return `Для этого срока категория «${label}» не предусмотрена.`;
}

// --- Вспомогательные ---------------------------------------------------------

function missingInputs(ids, inputs) {
  return genericMissingInputs(ids, inputs, INPUT_LABELS_APK);
}

// Карточка узла-события (вступление акта в законную силу): не срок, а момент
// смены статуса акта — ни дедлайна, ни длительности у него нет. Строится по
// образцу eventCard из src/views.js, но своим кодом: тот завязан на поля
// ГПК-шного результата (resolved/not_earlier_than/message), которых здесь нет.
function eventCard(node, entry) {
  const card = {
    id: node.id,
    kind: 'event',
    title: node.title,
    status: 'resolved',
    norm: node.norm.primary,
    date: entry.date,
    // От чего посчитана дата: от дедлайна соседнего узла или от введённой даты
    // акта вышестоящей инстанции. Без этого строка события не читается.
    based_on: entry.based_on,
    details: { collapsed: true, calculation: node.norm.calculation },
  };
  attachCalendarWarning(card, card.date);
  return card;
}

// Карточка узла-окна (ч. 3 ст. 222.1): не единственный дедлайн, а диапазон из
// двух границ от разных якорей. Отдельная функция, а не надстройка над
// monthTermCard: markExpired, exportableCards и summaryEntries ключуются на
// card.deadline, которого у окна по конструкции нет, и подстановка туда одной
// из границ объявила бы вторую несуществующей.
//
// Тексты состояний живут здесь, а не в chain.js: это объяснение результата
// пользователю, а не содержание нормы.
const WINDOW_STATE_NOTE_APK = {
  open:
    'Производство по исполнению не окончено: верхняя граница ещё не ' +
    'определена, наступит через шесть месяцев со дня окончания производства.',
  empty:
    'Окно закрыто: исполнение завершилось до истечения установленного законом ' +
    'срока на исполнение, нарушения права на исполнение в разумный срок нет.',
};

function windowCard(node, result) {
  const card = {
    id: node.id,
    kind: 'window',
    title: node.title,
    status: 'computed',
    state: result.state,
    norm: result.norm.primary,
    // Подписи границ — «не ранее»/«не позднее», а не «дедлайн»: нижняя граница
    // сроком на подачу не является.
    earliest_filing_date: result.earliest_filing_date,
    anchors: result.anchors,
    details: {
      collapsed: true,
      logic: result.logic,
      calculation: result.norm.calculation,
      midnight_rule: result.midnight_rule,
    },
  };
  // Верхняя граница отсутствует как ключ, если производство не окончено, —
  // карточка повторяет форму результата, а не подставляет null.
  if (result.state !== 'open') card.latest_filing_date = result.latest_filing_date;
  const note = WINDOW_STATE_NOTE_APK[result.state];
  if (note) card.note = note;
  // Предупреждение календаря — только по верхней границе: нижняя не переносится
  // через нерабочий день, и точность производственного календаря для неё роли
  // не играет.
  if (card.latest_filing_date) attachCalendarWarning(card, card.latest_filing_date);
  return card;
}

// Узлы с нестандартной формой результата строят карточку своей функцией; для
// остальных (обычный срок) карточку строит monthTermCard из ядра.
const CARD_BUILDERS_APK = { event: eventCard, window: windowCard };

// История перерывов срока (ч. 3, 4 ст. 321 АПК РФ) на карточке: события с
// подписями оснований, дата, от которой срок пошёл заново, норма и логика.
// Расчёт уже сдвинут в chain.js — здесь только показываем, от чего он пошёл.
function attachInterruptions(card, term) {
  if (term.interruptible) card.interruptible = true;
  if (!term.interruptions || term.interruptions.length === 0) return;
  card.base_anchor = term.base_anchor;
  card.interruptions = term.interruptions.map((event) => {
    const row = {
      ...event,
      label: INTERRUPTION_TITLE_BY_ID_APK[event.type] ?? 'Основание не распознано',
    };
    if (event.ignored) row.ignored_text = INTERRUPTION_IGNORED_TEXT_APK[event.ignored_reason];
    return row;
  });
  const applied = term.interruptions.filter((event) => !event.ignored);
  card.restarted_from = applied.length ? applied[applied.length - 1].date : null;
  card.details.interruption_norm = term.interruption_norm;
  card.details.interruption_logic = term.interruption_logic;
}

// История периодов, не засчитываемых в срок (ч. 2, 5 ст. 321 АПК РФ).
//
// Полей исключения в результате нет вовсе, если ни один период не принят
// (см. withExclusions: при нулевой сумме дней результат не трогается), поэтому
// проверка идёт по excluded_periods, а не по длине введённого списка.
function attachExclusions(card, term) {
  if (!term.excluded_periods || term.excluded_periods.length === 0) return;
  card.excluded_periods = term.excluded_periods.map((period) => {
    const row = {
      ...period,
      label: EXCLUSION_TITLE_BY_ID_APK[period.type] ?? 'Основание не распознано',
    };
    if (period.ignored) row.ignored_text = EXCLUSION_IGNORED_TEXT_APK[period.ignored_reason];
    return row;
  });
  card.excluded_days = term.excluded_days;
  card.pre_exclusion_deadline = term.pre_exclusion_deadline;
  card.exclusion_summary =
    `Исключено ${term.excluded_days} дн.: дедлайн отодвинут с ` +
    `${term.pre_exclusion_deadline} на ${term.deadline}.`;
  card.details.exclusion_norm = term.exclusion_norm;
  card.details.exclusion_logic = term.exclusion_logic;
}

// --- Таблица требований узлов -------------------------------------------------
//
// deps — какие поля нужны, чтобы вызвать compute: массив либо функция от
// inputs (у узлов, где набор зависит от уже введённого дискриминатора).
// compute — вызов узла; card — сборка карточки из его результата.

// Какая дата нужна трёхлетнему сроку предъявления при каждом case_type.
const ENFORCEMENT_DATE_BY_CASE_TYPE = {
  entry_into_force: 'entry_into_force_date',
  immediate_execution: 'immediate_execution_decision_date',
  deferred_installment_end: 'deferred_installment_end_date',
};

// Зависимости узла-события ст. 180: набор полей определяется дискриминатором
// appeal_filed. Пока он не введён — нужен только он сам.
function entryIntoForceDeps(inputs) {
  if (inputs.appeal_filed === false) return ['appeal_filed', 'decision_full_text_date'];
  if (inputs.appeal_filed === true) {
    return ['appeal_filed', 'appeal_outcome', 'appellate_ruling_date'];
  }
  return ['appeal_filed'];
}

// То же для ст. 291.2: при неподанной окружной кассации якорь считается от
// срока кассации, а он — от вступления в силу, поэтому зависимости складываются.
function entryAfterCassationDeps(inputs) {
  if (inputs.cassation_filed === false) {
    return ['cassation_filed', ...entryIntoForceDeps(inputs)];
  }
  if (inputs.cassation_filed === true) return ['cassation_filed', 'district_cassation_ruling_date'];
  return ['cassation_filed'];
}

// Зависимости узла-окна ст. 222.1 ч. 3: дата истечения срока на исполнение
// нужна всегда, дата окончания производства — только когда дискриминатор
// enforcement_proceeding_ended выставлен в true. Та же конструкция, что у
// entryIntoForceDeps: набор полей определяется явным булевым дискриминатором.
function executionCompensationDeps(inputs) {
  const base = ['execution_deadline_date', 'enforcement_proceeding_ended'];
  if (inputs.enforcement_proceeding_ended === true) {
    return [...base, 'enforcement_proceeding_ended_date'];
  }
  return base;
}

// Зависимости узла восстановления: у категории «участвующее лицо, извещённое
// надлежаще» якорь берётся из цепочки, у остальных — введённая дата.
function restorationDeps(chainDeps) {
  return (inputs) => {
    if (inputs.subject_category == null) return ['subject_category'];
    if (inputs.subject_category === 'participating_duly_notified') {
      return ['subject_category', ...chainDeps(inputs)];
    }
    return ['subject_category', 'learned_of_violation_date'];
  };
}

const NODE_REQUIREMENTS = {
  appeal_general_apk: {
    node: APPEAL_GENERAL_APK,
    deps: () => ['decision_full_text_date'],
    compute: (i) => computeAppealGeneralApk(i),
  },
  appeal_general_apk_restoration: {
    node: APPEAL_GENERAL_APK_RESTORATION,
    deps: restorationDeps(() => ['decision_full_text_date']),
    compute: (i) => computeAppealGeneralApkRestoration(i),
  },
  entry_into_force_apk: {
    node: ENTRY_INTO_FORCE_APK,
    kind: 'event',
    deps: entryIntoForceDeps,
    compute: (i) => computeEntryIntoForceApk(i),
  },
  cassation_general_apk: {
    node: CASSATION_GENERAL_APK,
    deps: entryIntoForceDeps,
    compute: (i) => computeCassationGeneralApk(i),
  },
  cassation_general_apk_restoration: {
    node: CASSATION_GENERAL_APK_RESTORATION,
    deps: restorationDeps(entryIntoForceDeps),
    compute: (i) => computeCassationGeneralApkRestoration(i),
  },
  entry_into_force_after_cassation_apk: {
    node: ENTRY_INTO_FORCE_AFTER_CASSATION_APK,
    kind: 'event',
    deps: entryAfterCassationDeps,
    compute: (i) => computeEntryIntoForceAfterCassationApk(i),
  },
  cassation_vs_apk: {
    node: CASSATION_VS_APK,
    deps: entryAfterCassationDeps,
    compute: (i) => computeCassationVsApk(i),
  },
  cassation_vs_apk_restoration: {
    node: CASSATION_VS_APK_RESTORATION,
    deps: restorationDeps(entryAfterCassationDeps),
    compute: (i) => computeCassationVsApkRestoration(i),
  },
  // Три частные жалобы ст. 188 принимают на уровне модели один и тот же вход
  // ruling_issued_date, но это определения разных инстанций. В интерфейсе они
  // разведены на три поля, здесь — подставляются в единственный вход узла.
  private_complaint_first_instance_apk: {
    node: PRIVATE_COMPLAINT_FIRST_INSTANCE_APK,
    deps: () => ['first_instance_ruling_date'],
    compute: (i) =>
      computePrivateComplaintFirstInstanceApk({ ruling_issued_date: i.first_instance_ruling_date }),
  },
  private_complaint_appellate_apk: {
    node: PRIVATE_COMPLAINT_APPELLATE_APK,
    deps: () => ['appellate_ruling_issued_date'],
    compute: (i) =>
      computePrivateComplaintAppellateApk({ ruling_issued_date: i.appellate_ruling_issued_date }),
  },
  private_complaint_cassation_apk: {
    node: PRIVATE_COMPLAINT_CASSATION_APK,
    deps: () => ['cassation_ruling_issued_date'],
    compute: (i) =>
      computePrivateComplaintCassationApk({ ruling_issued_date: i.cassation_ruling_issued_date }),
  },
  private_complaint_appellate_postanovlenie_apk: {
    node: PRIVATE_COMPLAINT_APPELLATE_POSTANOVLENIE_APK,
    deps: () => ['appellate_postanovlenie_date'],
    compute: (i) => computePrivateComplaintAppellatePostanovlenieApk(i),
  },
  enforcement_presentation_apk: {
    node: ENFORCEMENT_PRESENTATION_APK,
    deps: (i) => {
      const dateField = ENFORCEMENT_DATE_BY_CASE_TYPE[i.case_type];
      return dateField ? ['case_type', dateField] : ['case_type'];
    },
    compute: (i) => computeEnforcementPresentationApk(i),
    decorate: (card, term) => {
      attachInterruptions(card, term);
      attachExclusions(card, term);
    },
  },
  enforcement_presentation_after_restoration_apk: {
    node: ENFORCEMENT_PRESENTATION_AFTER_RESTORATION_APK,
    deps: () => ['restoration_ruling_date'],
    compute: (i) => computeEnforcementPresentationAfterRestorationApk(i),
  },
  nadzor_general_apk: {
    node: NADZOR_GENERAL_APK,
    deps: () => ['last_contested_act_entry_into_force_date'],
    compute: (i) => computeNadzorGeneralApk(i),
  },
  nadzor_general_apk_restoration: {
    node: NADZOR_GENERAL_APK_RESTORATION,
    // Тот же хелпер, что у трёх уже реализованных restoration-узлов: якорь
    // категории participating_duly_notified — прямое поле ввода (как у самого
    // nadzor_general_apk, не через граф), а не результат другого узла.
    deps: restorationDeps(() => ['last_contested_act_entry_into_force_date']),
    compute: (i) => computeNadzorGeneralApkRestoration(i),
  },
  new_circumstances_review_apk: {
    node: NEW_CIRCUMSTANCES_REVIEW_APK,
    deps: () => ['circumstances_discovered_date'],
    compute: (i) => computeNewCircumstancesReviewApk(i),
  },
  // Простой deps без restorationDeps(): узел не ветвится по subject_category
  // (его здесь нет) — единственный вход и у общего срока, и у восстановления
  // один и тот же circumstances_discovered_date.
  new_circumstances_review_apk_restoration: {
    node: NEW_CIRCUMSTANCES_REVIEW_APK_RESTORATION,
    deps: () => ['circumstances_discovered_date'],
    compute: (i) => computeNewCircumstancesReviewApkRestoration(i),
  },
  // Без restoration-узла: ч. 2 ст. 112 предусматривает восстановление без
  // числового потолка (как у ст. 322) — считать в нём нечего.
  court_costs_application_apk: {
    node: COURT_COSTS_APPLICATION_APK,
    deps: () => ['last_judgment_on_merits_entry_into_force_date'],
    compute: (i) => computeCourtCostsApplicationApk(i),
  },
  // Без restoration-узла: ст. 222.1 не входит в перечень ст. 117 ч. 2 АПК с
  // предельными сроками (как у ст. 322 и ст. 112) — считать в нём нечего.
  reasonable_term_compensation_apk: {
    node: REASONABLE_TERM_COMPENSATION_APK,
    deps: () => ['last_judgment_entry_into_force_date'],
    compute: (i) => computeReasonableTermCompensationApk(i),
  },
  // Единственный узел с kind: 'window' — результат не срок, а окно из двух
  // границ (см. windowCard выше и комментарий к узлу в chain.js).
  reasonable_term_execution_compensation_apk: {
    node: REASONABLE_TERM_EXECUTION_COMPENSATION_APK,
    kind: 'window',
    deps: executionCompensationDeps,
    compute: (i) => computeReasonableTermExecutionCompensationApk(i),
  },
};

// --- Пометка истёкших ---------------------------------------------------------
//
// В модуле АПК нет ни одного поля «дата фактической подачи», поэтому карта
// фактов пуста: срок может быть помечен только как истёкший по текущей дате
// ('expired'), но не как пропущенный по факту поздней подачи ('missed').
// Ни один узел АПК не несёт restoration_norm, и это согласовано: markExpired
// требует её только при пометке 'missed', которая здесь недостижима.
const ACTION_FACT_INPUT_APK = {};
const MISSED_FROM_FILING_APK = new Set();

function markExpired(cards, inputs, today) {
  return genericMarkExpired(cards, inputs, today, {
    factInputMap: ACTION_FACT_INPUT_APK,
    missedFromFilingIds: MISSED_FROM_FILING_APK,
  });
}

// --- Публичная сборка ---------------------------------------------------------

/**
 * Собирает структуру для отображения из входных данных модуля АПК.
 * @param {object} inputs — поля ввода (см. apk/labels.js).
 * @param {{today?: Date|string}} [options] — текущая дата (передаётся явно).
 * @returns {{cards: object[], incomplete: object[], stubs: object[]}}
 */
export function buildView(inputs, options = {}) {
  const data = inputs ?? {};
  const today = options.today != null ? toISO(options.today) : null;
  const cards = [];
  const incomplete = [];

  for (const [id, spec] of Object.entries(NODE_REQUIREMENTS)) {
    const kind = spec.kind ?? 'term';
    const deps = spec.deps(data);
    const missing = missingInputs(deps, data);
    if (missing.length > 0) {
      incomplete.push(
        incompleteNode(
          id,
          kind,
          spec.node.title,
          'Не хватает данных для расчёта — заполните недостающие поля.',
          missing,
        ),
      );
      continue;
    }

    // Категория субъекта введена, но к этому узлу восстановления неприменима:
    // выясняется до вызова, а не по исключению из compute-функции.
    const scope = RESTORATION_CATEGORY_SCOPE_APK[id];
    if (scope && !scope.has(data.subject_category)) {
      cards.push({
        id,
        kind: 'not_applicable',
        title: spec.node.title,
        reason: notApplicableReason(id, data.subject_category),
      });
      continue;
    }

    // Данных достаточно и они структурно допустимы, но расчёт всё равно может
    // отказать: пересечение исключаемых периодов (ч. 2, 5 ст. 321) и
    // неподдерживаемый исход апелляции — состояния, о которых знает только
    // модель. Сообщение из chain.js/ядра уже человекочитаемо, показываем его.
    let term;
    try {
      term = spec.compute(data);
    } catch (error) {
      cards.push({ id, kind: 'error', title: spec.node.title, message: error.message });
      continue;
    }

    const buildCard = CARD_BUILDERS_APK[kind];
    const card = buildCard ? buildCard(spec.node, term) : monthTermCard(term);
    if (spec.decorate) spec.decorate(card, term);
    cards.push(card);
  }

  // Заглушки (статические карточки неподдерживаемых ветвей) — в модуле АПК их
  // нет: все ветви раскрыты узлами. Поле сохраняется в структуре, чтобы форма
  // возврата совпадала с ГПК-шной и было куда положить следующий такой случай.
  return { cards: markExpired(cards, data, today), incomplete, stubs: [] };
}
