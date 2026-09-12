// Данные UI-слоя модуля АПК (задача UI.2): разбиение узлов по ситуациям,
// словарь подписей полей и реестр сроков для экспорта в календарь.
//
// Проверки построены на списках, вычисленных из самого apk/chain.js, а не на
// перечислении вручную: иначе следующий добавленный узел или новое поле ввода
// молча окажутся вне ситуации, без подписи или без экспорта.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { SITUATIONS_APK, DEFAULT_SITUATION_APK } from '../apk/situations.js';
import { INPUT_LABELS_APK } from '../apk/labels.js';
import { TERM_REGISTRY_APK, ICS_PRODID, ICS_UID_DOMAIN } from '../apk/term-registry.js';
import { buildView, RESTORATION_SUBJECT_CATEGORIES_APK } from '../apk/views.js';
import {
  RESTORATION_SUBJECT_CATEGORIES,
  CASSATION_RESTORATION_SUBJECT_CATEGORIES,
  CASSATION_VS_RESTORATION_SUBJECT_CATEGORIES,
} from '../apk/chain.js';
import {
  situationById,
  allSituationNodes,
  allSituationFields,
  checkSituationCoverage,
} from '../core/view/situations.js';
import * as chainModule from '../apk/chain.js';

// Узлы-определения из экспортов chain.js: объект со строковым id. Каталоги
// оснований (массивы) и Set-ы идентификаторов узлами не являются.
const CHAIN_NODE_IDS = Object.values(chainModule)
  .filter(
    (v) =>
      v != null &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      !(v instanceof Set) &&
      typeof v.id === 'string',
  )
  .map((v) => v.id);

// Узлы без top-level duration — то есть те, которые предикат isTermNode не
// заводит в реестр сроков. Категорий здесь две, и они не совпадают: узлы-события
// (вступление акта в силу — не срок, а момент) и единственный узел-окно
// (ч. 3 ст. 222.1 — две длительности во вложенном window, наверх не поднятые
// намеренно, см. apk/chain.js). Поимённый состав закреплён тестом ниже.
const NON_REGISTRY_NODE_IDS = Object.values(chainModule)
  .filter(
    (v) =>
      v != null &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      !(v instanceof Set) &&
      typeof v.id === 'string' &&
      !v.duration,
  )
  .map((v) => v.id);

test('АПК ситуации: каждый узел chain.js закреплён ровно за одной ситуацией', () => {
  assert.doesNotThrow(() => checkSituationCoverage(CHAIN_NODE_IDS, SITUATIONS_APK));
  // Обратная сторона того же инварианта: в ситуациях нет узлов-призраков,
  // которых в chain.js уже (или ещё) нет.
  const inSituations = allSituationNodes(SITUATIONS_APK);
  assert.deepEqual([...inSituations].sort(), [...CHAIN_NODE_IDS].sort());
});

test('АПК ситуации: тринадцать ветвей ожидаемого состава, ситуация по умолчанию существует', () => {
  assert.deepEqual(
    SITUATIONS_APK.map((s) => s.id),
    [
      'decision_chain',
      'rulings',
      'enforcement',
      'nadzor',
      'new_circumstances',
      'court_costs',
      'reasonable_term_compensation',
      'execution_compensation',
      'simplified_proceedings',
      'court_order',
      'nonnormative_act_challenge',
      'administrative_liability_challenge',
      'admin_liability_appeal',
    ],
  );
  assert.deepEqual(
    SITUATIONS_APK.map((s) => s.nodes.length),
    [8, 4, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 2],
  );
  assert.equal(situationById(DEFAULT_SITUATION_APK, SITUATIONS_APK).id, 'decision_chain');
  // primary_field — у ветви цепочки обжалования (как у общей ветви ГПК), у
  // надзора, у пересмотра по новым обстоятельствам, у судебных расходов, у
  // компенсации за нарушение права на судопроизводство в разумный срок, у
  // упрощённого производства, у судебного приказа, у оспаривания
  // ненормативного акта, у оспаривания решения об административной
  // ответственности и у сокращённого срока апелляции по таким делам: там
  // якорь тоже вводится напрямую, а не через уточняющие поля. У ветви
  // execution_compensation primary_field НЕТ: её якорь равноправен с
  // дискриминатором окончания производства и датой окончания, все три поля
  // лежат в блоке исходных данных — как у ветвей rulings и enforcement.
  assert.deepEqual(
    SITUATIONS_APK.filter((s) => s.primary_field).map((s) => s.id),
    [
      'decision_chain',
      'nadzor',
      'new_circumstances',
      'court_costs',
      'reasonable_term_compensation',
      'simplified_proceedings',
      'court_order',
      'nonnormative_act_challenge',
      'administrative_liability_challenge',
      'admin_liability_appeal',
    ],
  );
});

test('АПК подписи: каждое поле ситуаций имеет подпись, лишних подписей нет', () => {
  const situationFields = new Set([
    ...allSituationFields(SITUATIONS_APK),
    ...SITUATIONS_APK.filter((s) => s.primary_field).map((s) => s.primary_field),
  ]);
  for (const id of situationFields) {
    assert.ok(INPUT_LABELS_APK[id], `нет подписи для поля ситуации "${id}"`);
  }
  // Поля повторяемых списков к ситуациям не привязаны (они у карточки), но
  // подпись им нужна — в списке «что ещё уточнить» и в заголовке блока.
  const listFields = ['enforcement_interruptions', 'suspension_periods', 'execution_ended_periods'];
  for (const id of listFields) assert.ok(INPUT_LABELS_APK[id], `нет подписи для списка "${id}"`);

  const expected = new Set([...situationFields, ...listFields]);
  for (const id of Object.keys(INPUT_LABELS_APK)) {
    assert.ok(expected.has(id), `подпись "${id}" не относится ни к одной ситуации и не список`);
  }
});

test('АПК подписи: словарь покрывает все входы, которые читает chain.js', () => {
  // Множество имён входов — грепом по самому chain.js, а не по списку из
  // задачи: список мог устареть, исходник — нет.
  const source = readFileSync(new URL('../apk/chain.js', import.meta.url), 'utf8');
  const chainInputs = new Set(
    [...source.matchAll(/inputs\??\.([a-z_][a-z0-9_]*)/g)].map((m) => m[1]),
  );

  // Единственное расхождение имён между моделью и интерфейсом: три частные
  // жалобы ст. 188 принимают один и тот же вход ruling_issued_date, но это три
  // разных определения, и в UI они разведены на три поля. Подстановку делает
  // слой представления; самого ruling_issued_date пользователь не видит.
  const UI_FIELDS_FOR_RULING_DATE = [
    'first_instance_ruling_date',
    'appellate_ruling_issued_date',
    'cassation_ruling_issued_date',
  ];
  assert.ok(chainInputs.has('ruling_issued_date'));
  assert.equal(INPUT_LABELS_APK.ruling_issued_date, undefined);
  for (const id of UI_FIELDS_FOR_RULING_DATE) {
    assert.ok(INPUT_LABELS_APK[id], `нет подписи для UI-поля "${id}"`);
  }
  // Подписи трёх полей различаются: иначе на экране три одинаковые строки и
  // непонятно, определение какой инстанции куда вводить.
  const texts = UI_FIELDS_FOR_RULING_DATE.map((id) => INPUT_LABELS_APK[id]);
  assert.equal(new Set(texts).size, 3);

  for (const id of chainInputs) {
    if (id === 'ruling_issued_date') continue;
    assert.ok(INPUT_LABELS_APK[id], `вход chain.js "${id}" остался без подписи в labels.js`);
  }
});

test('АПК реестр сроков: 24 узла из 27 — без двух узлов-событий и узла-окна', () => {
  assert.equal(CHAIN_NODE_IDS.length, 27);
  // Счётчики узлов и реестра растут НЕ синхронно: узел-окно ч. 3 ст. 222.1
  // добавился в chain.js, но в реестр сроков не попал — у него нет top-level
  // duration, и это намеренно (экспорт окна в .ics вне объёма задачи). Узел
  // ст. 229 ч. 4 (working_day) top-level duration ИМЕЕТ и в реестр попадает —
  // счётчики снова растут синхронно на этом узле.
  assert.deepEqual(
    [...NON_REGISTRY_NODE_IDS].sort(),
    [
      'entry_into_force_after_cassation_apk',
      'entry_into_force_apk',
      'reasonable_term_execution_compensation_apk',
    ],
  );
  assert.equal(Object.keys(TERM_REGISTRY_APK).length, 24);
  for (const id of NON_REGISTRY_NODE_IDS) {
    assert.equal(TERM_REGISTRY_APK[id], undefined, `узел без duration "${id}" попал в реестр`);
  }
  // Ядро отбирает карточки к экспорту по meta.ics === true — признак должен
  // быть на каждой записи реестра, иначе экспорт молча вернёт пустой список.
  for (const [id, meta] of Object.entries(TERM_REGISTRY_APK)) {
    assert.equal(meta.ics, true, `у записи реестра "${id}" нет признака ics`);
    assert.ok(meta.duration, `у записи реестра "${id}" нет duration`);
    assert.equal(meta.id, id);
  }
});

test('АПК реестр сроков: идентификаторы продукта заданы и отличаются от ГПК-шных', () => {
  assert.equal(typeof ICS_PRODID, 'string');
  assert.match(ICS_PRODID, /^-\/\/.+\/\/.+\/\/RU$/);
  assert.match(ICS_PRODID, /АПК/);
  assert.equal(typeof ICS_UID_DOMAIN, 'string');
  assert.ok(ICS_UID_DOMAIN.length > 0);
  assert.notEqual(ICS_UID_DOMAIN, 'gpk-calculator');
});

// --- buildView (задача UI.3) --------------------------------------------------

// Данные, поднимающие все 27 узлов разом. Ветви дискриминаторов выбраны так,
// чтобы цепочка считалась целиком: жалоба не подана → вступление в силу от
// срока апелляции, окружная кассация не подавалась → якорь кассации в ВС РФ от
// срока окружной кассации.
const ALL_NODES_INPUTS_APK = {
  decision_full_text_date: '2025-03-11',
  appeal_filed: false,
  cassation_filed: false,
  subject_category: 'article_42_person',
  learned_of_violation_date: '2025-05-20',
  first_instance_ruling_date: '2025-04-01',
  appellate_ruling_issued_date: '2025-05-05',
  cassation_ruling_issued_date: '2025-06-10',
  appellate_postanovlenie_date: '2025-07-15',
  case_type: 'entry_into_force',
  entry_into_force_date: '2022-06-18',
  restoration_ruling_date: '2025-03-11',
  last_contested_act_entry_into_force_date: '2025-02-10',
  circumstances_discovered_date: '2025-01-20',
  last_judgment_on_merits_entry_into_force_date: '2025-02-15',
  last_judgment_entry_into_force_date: '2025-01-15',
  execution_deadline_date: '2024-02-20',
  enforcement_proceeding_ended: true,
  enforcement_proceeding_ended_date: '2025-01-10',
  simplified_proceedings_decision_date: '2025-03-11',
  court_order_copy_received_date_apk: '2025-03-02',
  nonnormative_act_violation_known_date: '2025-03-11',
  administrative_decision_copy_received_date_apk: '2025-03-02',
  first_instance_decision_date_apk: '2025-03-02',
};

const TODAY_APK = '2025-01-01'; // раньше всех дедлайнов — ничего не истекло

test('АПК buildView: на полном наборе данных считаются все 27 узлов, incomplete пуст', () => {
  const view = buildView(ALL_NODES_INPUTS_APK, { today: TODAY_APK });
  assert.equal(view.cards.length, 27);
  assert.equal(view.incomplete.length, 0);
  assert.deepEqual(view.stubs, []);
  // Форма возврата совпадает с ГПК-шной: cards/incomplete/stubs.
  assert.deepEqual(Object.keys(view).sort(), ['cards', 'incomplete', 'stubs']);
  // Каждый узел chain.js представлен ровно одной карточкой.
  assert.deepEqual(
    view.cards.map((c) => c.id).sort(),
    [...CHAIN_NODE_IDS].sort(),
  );
  // Ни одной карточки-ошибки на валидных данных.
  assert.equal(
    view.cards.filter((c) => c.kind === 'error').length,
    0,
  );
  // Три частные жалобы ст. 188 считаются от РАЗНЫХ дат, а не от одной:
  // развилка с общим именем входа ruling_issued_date решена на слое
  // представления, а не потерей различий.
  const complaints = ['first_instance', 'appellate', 'cassation'].map(
    (part) => view.cards.find((c) => c.id === `private_complaint_${part}_apk`).deadline,
  );
  assert.equal(new Set(complaints).size, 3);
});

test('АПК buildView: пересечение периодов даёт карточку-ошибку, остальные узлы считаются', () => {
  const view = buildView(
    {
      ...ALL_NODES_INPUTS_APK,
      suspension_periods: [{ start: '2023-03-01', end: '2023-05-10' }],
      execution_ended_periods: [
        { type: 'withdrawal_by_claimant_apk', start: '2023-05-09', end: '2023-08-15' },
      ],
    },
    { today: TODAY_APK },
  );
  // Расчёт не падает целиком: 16 карточек на месте, ошибочная — ровно одна.
  assert.equal(view.cards.length, 27);
  const errors = view.cards.filter((c) => c.kind === 'error');
  assert.equal(errors.length, 1);
  assert.equal(errors[0].id, 'enforcement_presentation_apk');
  assert.ok(errors[0].message.length > 0);
  // Сообщение ядра прокинуто как есть, а не заменено общей формулировкой.
  assert.match(errors[0].message, /пересекаются/);
  assert.equal(errors[0].deadline, undefined);
  // Соседний узел ст. 321 (после восстановления) на это не реагирует.
  const neighbour = view.cards.find(
    (c) => c.id === 'enforcement_presentation_after_restoration_apk',
  );
  assert.equal(neighbour.kind, 'term');
  assert.ok(neighbour.deadline);
});

test('АПК buildView: категория субъекта, неприменимая к узлу, даёт карточку not_applicable', () => {
  const view = buildView(
    {
      ...ALL_NODES_INPUTS_APK,
      // Валидна для ст. 259 ч. 2 и ст. 276 ч. 2, но не для ст. 291.2 ч. 2.
      subject_category: 'participating_improperly_notified',
    },
    { today: TODAY_APK },
  );
  const vs = view.cards.find((c) => c.id === 'cassation_vs_apk_restoration');
  assert.equal(vs.kind, 'not_applicable');
  assert.ok(vs.reason.length > 0);
  // Причина объясняет, а не просто сообщает «неприменимо».
  assert.match(vs.reason, /291\.2/);
  assert.equal(vs.deadline, undefined);
  // Два других узла восстановления той же категорией считаются нормально.
  for (const id of ['appeal_general_apk_restoration', 'cassation_general_apk_restoration']) {
    const card = view.cards.find((c) => c.id === id);
    assert.equal(card.kind, 'term');
    assert.ok(card.deadline);
  }
});

test('АПК категории субъекта: каталог подписей покрывает ровно наборы модели', () => {
  // Идентификаторы категорий живут в chain.js и оттуда же импортируются
  // слоем представления; здесь проверяется, что у каждой категории модели есть
  // подпись для интерфейса и что лишних подписей нет.
  const inModel = new Set([
    ...RESTORATION_SUBJECT_CATEGORIES,
    ...CASSATION_RESTORATION_SUBJECT_CATEGORIES,
    ...CASSATION_VS_RESTORATION_SUBJECT_CATEGORIES,
  ]);
  const inCatalog = RESTORATION_SUBJECT_CATEGORIES_APK.map((c) => c.id);
  assert.deepEqual([...inCatalog].sort(), [...inModel].sort());
  for (const category of RESTORATION_SUBJECT_CATEGORIES_APK) {
    assert.ok(category.label.length > 0, `у категории "${category.id}" нет подписи`);
  }
  // Узкий набор ст. 291.2 — подмножество общего, а не независимый список.
  for (const id of CASSATION_VS_RESTORATION_SUBJECT_CATEGORIES) {
    assert.ok(RESTORATION_SUBJECT_CATEGORIES.has(id));
  }
  assert.ok(
    CASSATION_VS_RESTORATION_SUBJECT_CATEGORIES.size < RESTORATION_SUBJECT_CATEGORIES.size,
  );
});

test('АПК buildView: любая категория модели даёт срок либо честное "неприменимо"', () => {
  const RESTORATION_NODES = [
    'appeal_general_apk_restoration',
    'cassation_general_apk_restoration',
    'cassation_vs_apk_restoration',
  ];
  for (const category of RESTORATION_SUBJECT_CATEGORIES_APK.map((c) => c.id)) {
    const view = buildView(
      { ...ALL_NODES_INPUTS_APK, subject_category: category },
      { today: TODAY_APK },
    );
    for (const id of RESTORATION_NODES) {
      const card = view.cards.find((c) => c.id === id);
      // Узел либо посчитан, либо честно помечен неприменимым — но никогда не
      // падает в карточку-ошибку: значит throw из chain.js на неизвестной
      // категории до сборки карточки не доходит.
      assert.ok(
        card.kind === 'term' || card.kind === 'not_applicable',
        `узел "${id}" при категории "${category}" дал kind="${card.kind}"`,
      );
      if (card.kind === 'term') assert.ok(card.deadline);
    }
  }
});

test('АПК buildView: узлы-события дают карточку kind="event" с датой и основанием', () => {
  const view = buildView(ALL_NODES_INPUTS_APK, { today: TODAY_APK });
  for (const id of ['entry_into_force_apk', 'entry_into_force_after_cassation_apk']) {
    const card = view.cards.find((c) => c.id === id);
    assert.equal(card.kind, 'event');
    assert.match(card.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(card.based_on, `у события "${id}" нет based_on`);
    // Это не срок: ни дедлайна, ни длительности у события нет.
    assert.equal(card.deadline, undefined);
    assert.equal(card.duration, undefined);
  }
  // Норма читается из константы узла. У узлов-событий она лежит плоско
  // (norm.primary), без norm_versions, в отличие от узлов-сроков — значение
  // закреплено точным текстом, а не просто «непустая строка»: пустая или
  // undefined норма на карточке выглядит как отсутствие ссылки на закон.
  assert.equal(
    view.cards.find((c) => c.id === 'entry_into_force_apk').norm,
    'ч. 1 ст. 180 АПК РФ',
  );
  const afterCassation = view.cards.find(
    (c) => c.id === 'entry_into_force_after_cassation_apk',
  );
  assert.equal(afterCassation.norm, 'ч. 1 ст. 291.2 АПК РФ');
  assert.deepEqual(afterCassation.details.calculation, ['ч. 5 ст. 289 АПК РФ']);
  // Ветвь «акт вышестоящей инстанции введён датой» даёт другое основание.
  const filed = buildView(
    {
      ...ALL_NODES_INPUTS_APK,
      appeal_filed: true,
      appeal_outcome: 'affirmed',
      appellate_ruling_date: '2025-06-02',
    },
    { today: TODAY_APK },
  );
  const entry = filed.cards.find((c) => c.id === 'entry_into_force_apk');
  assert.equal(entry.date, '2025-06-02');
  assert.equal(entry.based_on, 'appellate_ruling_date');
});

test('АПК buildView: без данных все 27 узлов уходит в incomplete, расчёт не вызывается', () => {
  const view = buildView({}, { today: TODAY_APK });
  assert.equal(view.incomplete.length, 27);
  // Ни одной карточки вообще: если бы compute-функции вызывались на пустых
  // данных, они бросили бы, и мы увидели бы карточки kind="error".
  assert.equal(view.cards.length, 0);
  for (const node of view.incomplete) {
    assert.equal(node.status, 'not_computed');
    assert.ok(node.reason.length > 0);
    assert.ok(node.missing_inputs.length > 0);
    // У каждого недостающего поля есть человекочитаемая подпись.
    for (const field of node.missing_inputs) {
      assert.ok(field.label, `у поля "${field.id}" нет подписи в labels.js`);
    }
  }
  // buildView без аргументов тоже не падает.
  assert.doesNotThrow(() => buildView());
});

test('АПК buildView: на узле ст. 321 одновременно видны история перерывов и история периодов', () => {
  const view = buildView(
    {
      ...ALL_NODES_INPUTS_APK,
      enforcement_interruptions: [{ type: 'presentment', date: '2024-07-15' }],
      suspension_periods: [{ start: '2023-03-01', end: '2023-05-10' }], // 70 дней
      execution_ended_periods: [
        // Основание вне ч. 5 — период отклоняется, но остаётся виден в истории.
        { type: 'actual_execution', start: '2024-09-01', end: '2024-10-01' },
      ],
    },
    { today: TODAY_APK },
  );
  const card = view.cards.find((c) => c.id === 'enforcement_presentation_apk');

  // Перерыв: якорь сдвинут на событие, исходный сохранён, событие подписано.
  assert.equal(card.interruptible, true);
  assert.equal(card.base_anchor, '2022-06-18');
  assert.equal(card.restarted_from, '2024-07-15');
  assert.equal(card.interruptions.length, 1);
  assert.ok(card.interruptions[0].label.length > 0);
  assert.notEqual(card.interruptions[0].label, 'Основание не распознано');

  // Исключение периодов: принятый период вычтен, отклонённый виден с причиной.
  assert.equal(card.excluded_days, 70);
  assert.equal(card.pre_exclusion_deadline, '2027-07-15');
  assert.equal(card.deadline, '2027-09-23');
  assert.equal(card.excluded_periods.length, 2);
  const accepted = card.excluded_periods.find((p) => !p.ignored);
  assert.equal(accepted.days, 70);
  assert.match(accepted.label, /Приостановление/);
  const rejected = card.excluded_periods.find((p) => p.ignored);
  assert.equal(rejected.ignored_reason, 'unknown_type');
  assert.match(rejected.ignored_text, /не подпадает под ч\. 5/);

  // Итоговая строка называет обе даты и число дней.
  assert.match(card.exclusion_summary, /70/);
  assert.match(card.exclusion_summary, /2027-07-15/);
  assert.match(card.exclusion_summary, /2027-09-23/);

  // Нормы обеих механик — в подробностях карточки, рядом и не затирая друг друга.
  assert.match(card.details.interruption_norm, /ч\. 3, 4 ст\. 321/);
  assert.match(card.details.exclusion_norm, /ч\. 2 ст\. 321/);
});
