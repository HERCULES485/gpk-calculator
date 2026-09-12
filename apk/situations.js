// Ситуации АПК — разбиение узлов и полей ввода по ветвям для переключателя в UI.
//
// Как и у ГПК (src/situations.js), это чисто представление: расчёт от выбранной
// ситуации не зависит, переключатель решает только, что рисовать. Механика
// (situationById, allSituationNodes, checkSituationCoverage) — общая, лежит в
// core/view/situations.js и принимает этот массив параметром; здесь только
// данные АПК.
//
// Разбиение — по фактическому графу узлов, а не по номерам статей. Узлы ветви
// decision_chain связаны транзитивно через якоря (апелляция → вступление в силу
// → кассация округа → вступление в силу после кассации → кассация в ВС РФ), и
// восстановления сроков висят на тех же якорях: у категории субъекта
// participating_duly_notified точка отсчёта берётся из узла-события этой же
// цепочки, поэтому в отрыве от неё восстановление не считается. Узлы ст. 188 и
// ст. 321 с этой цепочкой не делят ни одного поля — это самостоятельные треки,
// как судебный приказ и периодические платежи у ГПК.
//
// В `fields` — одиночные поля ввода ветви (даты, булевы дискриминаторы, enum-ы).
// Повторяемых списков узла предъявления исполнительного листа
// (enforcement_interruptions, suspension_periods, execution_ended_periods) здесь
// намеренно нет: по образцу ГПК они привязаны не к ситуации, а к карточке —
// перерывы по признаку `interruptible` самого срока, периоды исключения — к
// единственному узлу, к которому применима ч. 2, 5 ст. 321 АПК РФ.

export const SITUATIONS_APK = [
  {
    id: 'decision_chain',
    label: 'Решение арбитражного суда: обжалование',
    // Основное поле ветви — как reasoned_decision_date у общей ветви ГПК: от его
    // заполненности зависит показ остальных дат цепочки.
    primary_field: 'decision_full_text_date',
    fields: [
      'appeal_filed',
      'appeal_outcome',
      'appellate_ruling_date',
      'cassation_filed',
      'district_cassation_ruling_date',
      'subject_category',
      'learned_of_violation_date',
    ],
    nodes: [
      'appeal_general_apk',
      'appeal_general_apk_restoration',
      'entry_into_force_apk',
      'cassation_general_apk',
      'cassation_general_apk_restoration',
      'entry_into_force_after_cassation_apk',
      'cassation_vs_apk',
      'cassation_vs_apk_restoration',
    ],
  },
  {
    id: 'rulings',
    label: 'Обжалование определений (ст. 188 АПК РФ)',
    // Три частные жалобы (ч. 3, 4, 6) на уровне модели принимают вход с одним и
    // тем же именем ruling_issued_date, но это три РАЗНЫХ определения — первой
    // инстанции, апелляции и кассации. В интерфейсе они разведены на три
    // отдельных поля, которые слой представления подставляет в единственный вход
    // узла при вызове; сам apk/chain.js этим не затрагивается.
    fields: [
      'first_instance_ruling_date',
      'appellate_ruling_issued_date',
      'cassation_ruling_issued_date',
      'appellate_postanovlenie_date',
    ],
    nodes: [
      'private_complaint_first_instance_apk',
      'private_complaint_appellate_apk',
      'private_complaint_cassation_apk',
      'private_complaint_appellate_postanovlenie_apk',
    ],
  },
  {
    id: 'enforcement',
    label: 'Исполнительный лист',
    fields: [
      'case_type',
      'entry_into_force_date',
      'immediate_execution_decision_date',
      'deferred_installment_end_date',
      'restoration_ruling_date',
    ],
    nodes: ['enforcement_presentation_apk', 'enforcement_presentation_after_restoration_apk'],
  },
  {
    id: 'nadzor',
    label: 'Надзорное производство (Президиум ВС РФ)',
    // Основное поле ветви — дата вступления в силу последнего оспариваемого
    // акта: вводится напрямую, не через граф узлов (см. apk/chain.js,
    // NADZOR_GENERAL_APK), как и у узла предъявления исполнительного листа.
    primary_field: 'last_contested_act_entry_into_force_date',
    fields: ['subject_category', 'learned_of_violation_date'],
    nodes: ['nadzor_general_apk', 'nadzor_general_apk_restoration'],
  },
  {
    id: 'new_circumstances',
    label: 'Пересмотр по новым или вновь открывшимся обстоятельствам',
    // Единственное поле ветви — дата появления/открытия обстоятельств: без
    // дискриминатора оснований пересмотра (ст. 311 не моделируется, см.
    // apk/chain.js). Уточняющих полей нет — restoration-узел здесь не несёт
    // категории субъекта, в отличие от 259/276/291.2/308.1.
    primary_field: 'circumstances_discovered_date',
    fields: [],
    nodes: ['new_circumstances_review_apk', 'new_circumstances_review_apk_restoration'],
  },
  {
    id: 'court_costs',
    label: 'Судебные расходы',
    // Единственное поле ветви — дата вступления в силу последнего акта,
    // которым закончилось рассмотрение дела по существу. Восстановление
    // (ч. 2 ст. 112) без числового потолка — как у ст. 322, отдельного узла и
    // уточняющих полей для него нет (см. apk/chain.js).
    primary_field: 'last_judgment_on_merits_entry_into_force_date',
    fields: [],
    nodes: ['court_costs_application_apk'],
  },
  {
    id: 'reasonable_term_compensation',
    label: 'Компенсация за нарушение права на судопроизводство в разумный срок',
    // Единственное поле ветви — дата вступления в силу последнего судебного
    // акта по делу (шире, чем «по существу» у ст. 112 — см. apk/chain.js).
    // Восстановление (ст. 222.6) без числового потолка — отдельного узла и
    // уточняющих полей для него нет.
    primary_field: 'last_judgment_entry_into_force_date',
    fields: [],
    nodes: ['reasonable_term_compensation_apk'],
  },
  {
    id: 'execution_compensation',
    label: 'Компенсация за нарушение права на исполнение судебного акта в разумный срок',
    // Без primary_field: все три поля ветви равноправно лежат в блоке исходных
    // данных, как у ветвей rulings и enforcement. Нижняя граница окна считается
    // от execution_deadline_date и есть всегда; верхняя появляется только когда
    // дискриминатор enforcement_proceeding_ended выставлен в true, и тогда же
    // становится обязательной дата окончания производства (см. deps в views.js).
    fields: [
      'execution_deadline_date',
      'enforcement_proceeding_ended',
      'enforcement_proceeding_ended_date',
    ],
    nodes: ['reasonable_term_execution_compensation_apk'],
  },
  {
    id: 'simplified_proceedings',
    label: 'Упрощённое производство: апелляция',
    // Единственное поле ветви — дата принятия решения (либо изготовления
    // мотивированного решения в полном объёме, если оно составлялось): норма
    // даёт оба случая через дизъюнкцию, но это одно и то же входное поле —
    // какая дата применима, решает пользователь при заполнении формы (см.
    // apk/chain.js). Восстановления ч. 4 ст. 229 не предусматривает —
    // отдельного узла и уточняющих полей для него нет.
    primary_field: 'simplified_proceedings_decision_date',
    fields: [],
    nodes: ['simplified_proceedings_appeal_apk'],
  },
  {
    id: 'court_order',
    label: 'Судебный приказ: возражения должника',
    // Первая ветвь приказного производства в модуле АПК — не часть уже
    // существующей ветви (нет ни одного узла, с которым эта тема делила бы
    // якорь или поле). Единственное поле — дата получения должником копии
    // приказа (не дата вынесения — см. apk/chain.js). Восстановления ч. 5
    // ст. 229.5 не предусматривает — отдельного узла и уточняющих полей для
    // него нет.
    primary_field: 'court_order_copy_received_date_apk',
    fields: [],
    nodes: ['court_order_objection_apk'],
  },
  {
    id: 'nonnormative_act_challenge',
    label: 'Оспаривание ненормативного акта, решения, действия госоргана',
    // Единственное поле ветви — дата, когда заявителю стало известно о
    // нарушении его прав ненормативным актом/решением/действием (не о
    // нарушении судебным актом — то другое понятие, см. apk/chain.js).
    // Восстановление (ч. 4 ст. 198) без числового потолка — отдельного узла
    // и уточняющих полей для него нет.
    primary_field: 'nonnormative_act_violation_known_date',
    fields: [],
    nodes: ['nonnormative_act_challenge_apk'],
  },
  {
    id: 'administrative_liability_challenge',
    label: 'Оспаривание решения об административной ответственности',
    // Соседняя, но отдельная категория дел от nonnormative_act_challenge
    // (параграф 2 главы 25 АПК, не параграф 1) — свой узел, своя ветвь.
    // Единственное поле — дата получения копии решения (не дата его принятия
    // административным органом — см. apk/chain.js). Восстановление (ч. 2
    // ст. 208) без числового потолка — отдельного узла и уточняющих полей
    // для него нет.
    primary_field: 'administrative_decision_copy_received_date_apk',
    fields: [],
    nodes: ['administrative_liability_challenge_apk'],
  },
];

export const DEFAULT_SITUATION_APK = 'decision_chain';
