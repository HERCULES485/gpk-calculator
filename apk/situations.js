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
    label: 'Упрощённое производство: апелляция и вступление в силу',
    // Единственное поле ветви — дата принятия решения (либо изготовления
    // мотивированного решения в полном объёме, если оно составлялось): норма
    // даёт оба случая через дизъюнкцию, но это одно и то же входное поле —
    // какая дата применима, решает пользователь при заполнении формы (см.
    // apk/chain.js). Восстановления ч. 4 ст. 229 не предусматривает —
    // отдельного узла и уточняющих полей для него нет.
    //
    // Второй узел ветви — вступление решения в законную силу (ч. 3 ст. 229):
    // тот же якорь, никакого отдельного поля не добавляет — оба узла считаются
    // от одной и той же даты решения.
    primary_field: 'simplified_proceedings_decision_date',
    fields: [],
    nodes: ['simplified_proceedings_appeal_apk', 'simplified_proceedings_entry_into_force_apk'],
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
  {
    id: 'admin_liability_appeal',
    label: 'Административная ответственность: сокращённый срок апелляции',
    // Оба узла делят один и тот же якорь — дату принятия решения судом первой
    // инстанции — и больше ни с чем не пересекаются, поэтому показаны в одной
    // ветви (тот же паттерн, что у nadzor: общее primary_field, несколько
    // узлов). Не сливается с administrative_liability_challenge выше: там
    // другой якорь (дата получения копии решения, не дата его принятия) и
    // другая норма (срок на само заявление, а не на апелляцию). Восстановление
    // ни ч. 4 ст. 206, ни ч. 5 ст. 211 не упоминают — отдельного узла и
    // уточняющих полей для него нет.
    primary_field: 'first_instance_decision_date_apk',
    fields: [],
    nodes: ['admin_liability_imposition_appeal_apk', 'admin_liability_challenge_appeal_apk'],
  },
  {
    id: 'settlement_approval_cassation',
    label: 'Утверждено мировое соглашение — хочу обжаловать',
    // Единственное поле ветви — дата вынесения определения об утверждении
    // мирового соглашения, тот же образец, что у court_order и остальных
    // одноузловых ветвей. Не путать с bankruptcy-доменом: это определение
    // арбитражного суда по обычному делу (ч. 11 ст. 141 АПК РФ), а не
    // банкротное мировое соглашение (apk/bankruptcy*.js, ст. 158, 162 ФЗ
    // № 127-ФЗ) — разные институты, разные узлы, разные поля.
    primary_field: 'settlement_approval_ruling_date_apk',
    fields: [],
    nodes: ['settlement_approval_cassation_apk'],
  },
  {
    id: 'arbitral_enforcement_writ_cassation',
    label: 'Выдан исполнительный лист на решение третейского суда — хочу обжаловать',
    // Тот же образец, что у settlement_approval_cassation: один primary_field,
    // прямая кассация в обход апелляции (ч. 5 ст. 240 АПК РФ). Отдельная
    // ветвь и от settlement_approval_cassation, и от двух ветвей об
    // иностранных решениях ниже: разные категории дел, разные нормы, разные
    // поля — узлы не делят якорь.
    primary_field: 'arbitral_enforcement_writ_ruling_date_apk',
    fields: [],
    nodes: ['arbitral_enforcement_writ_cassation_apk'],
  },
  {
    id: 'foreign_judgment_enforcement_cassation',
    label: 'Признано и приведено в исполнение иностранное решение — хочу обжаловать',
    // Ч. 3 ст. 245 АПК РФ — решение ТРЕБУЕТ принудительного исполнения.
    // Отдельная ветвь от foreign_judgment_recognition_cassation ниже: там
    // решение исполнения не требует — разный предмет дела, разная норма,
    // разное поле.
    primary_field: 'foreign_judgment_enforcement_ruling_date_apk',
    fields: [],
    nodes: ['foreign_judgment_enforcement_cassation_apk'],
  },
  {
    id: 'foreign_judgment_recognition_cassation',
    label: 'Признано иностранное решение, не требующее принудительного исполнения — хочу обжаловать',
    // Ч. 14 ст. 245.1 АПК РФ — решение НЕ требует принудительного исполнения.
    // Не слита с foreign_judgment_enforcement_cassation выше по той же
    // причине, по которой не слиты settlement_agreement и
    // settlement_agreement_review в банкротном домене: разные стадии/предметы
    // одного института, взаимоисключающие для пользователя ситуации.
    primary_field: 'foreign_judgment_recognition_ruling_date_apk',
    fields: [],
    nodes: ['foreign_judgment_recognition_cassation_apk'],
  },
  {
    id: 'case_transfer_jurisdiction_appeal',
    label: 'Суд решил вопрос о передаче дела по подсудности — хочу обжаловать',
    // Ч. 5 ст. 39 АПК РФ. Один primary_field, тот же образец, что у
    // остальных одноузловых ветвей этого домена. Обычная апелляция с
    // сокращённым сроком — не путать с ветвями прямой кассации выше.
    primary_field: 'case_transfer_jurisdiction_ruling_date_apk',
    fields: [],
    nodes: ['case_transfer_jurisdiction_appeal_apk'],
  },
  {
    id: 'coplaintiff_codefendant_refusal_appeal',
    label: 'Суд отказал во вступлении соистца или привлечении соответчика — хочу обжаловать',
    // Ч. 7 ст. 46 АПК РФ.
    primary_field: 'coplaintiff_codefendant_refusal_ruling_date_apk',
    fields: [],
    nodes: ['coplaintiff_codefendant_refusal_appeal_apk'],
  },
  {
    id: 'third_party_claim_refusal_appeal',
    label: 'Суд отказал во вступлении третьего лица с самостоятельными требованиями — хочу обжаловать',
    // Ч. 4 ст. 50 АПК РФ. Отдельная от third_party_no_claim_refusal_appeal
    // ниже ветвь: разный процессуальный статус третьего лица.
    primary_field: 'third_party_claim_refusal_ruling_date_apk',
    fields: [],
    nodes: ['third_party_claim_refusal_appeal_apk'],
  },
  {
    id: 'third_party_no_claim_refusal_appeal',
    label: 'Суд отказал во вступлении третьего лица без самостоятельных требований — хочу обжаловать',
    // Ч. 3.1 ст. 51 АПК РФ.
    primary_field: 'third_party_no_claim_refusal_ruling_date_apk',
    fields: [],
    nodes: ['third_party_no_claim_refusal_appeal_apk'],
  },
  {
    id: 'case_consolidation_severance_refusal_appeal',
    label: 'Суд отказал в объединении дел или выделении требований — хочу обжаловать',
    // Ч. 7 ст. 130 АПК РФ.
    primary_field: 'case_consolidation_severance_refusal_ruling_date_apk',
    fields: [],
    nodes: ['case_consolidation_severance_refusal_appeal_apk'],
  },
  {
    id: 'special_ruling_appeal',
    label: 'Суд вынес частное определение — хочу обжаловать',
    // Ст. 188.1 АПК РФ. Единственная ветвь из шести без отклонённого
    // ходатайства: суд выносит частное определение по собственной
    // инициативе, поэтому якорь — просто дата вынесения.
    primary_field: 'special_ruling_issued_date_apk',
    fields: [],
    nodes: ['special_ruling_appeal_apk'],
  },
  {
    id: 'injunction_refusal_appeal',
    label: 'Суд отказал в обеспечении иска — хочу обжаловать',
    // Ч. 7 ст. 93 АПК РФ. Числа в самой норме нет — общий месячный срок по
    // ч. 3 ст. 188 АПК РФ (та же формула, что у private_complaint_first_instance_apk).
    primary_field: 'injunction_refusal_ruling_date_apk',
    fields: [],
    nodes: ['injunction_refusal_appeal_apk'],
  },
  {
    id: 'counter_security_ruling_appeal',
    label: 'Суд вынес определение о встречном обеспечении — хочу обжаловать',
    // Абзац четвёртый ч. 3 ст. 94 АПК РФ. Числа в самой норме нет — общий
    // месячный срок по ч. 3 ст. 188 АПК РФ (та же формула, что у
    // injunction_refusal_appeal_apk).
    primary_field: 'counter_security_ruling_date_apk',
    fields: [],
    nodes: ['counter_security_ruling_appeal_apk'],
  },
  {
    id: 'injunction_cancellation_ruling_appeal',
    label: 'Суд отменил обеспечение иска или отказал в отмене — хочу обжаловать',
    // Ч. 5 ст. 97 АПК РФ. Числа в самой норме нет — общий месячный срок по
    // ч. 3 ст. 188 АПК РФ (та же формула, что у injunction_refusal_appeal_apk).
    // Один узел на оба исхода (отмена/отказ в отмене) — тот же срок для обоих.
    primary_field: 'injunction_cancellation_ruling_date_apk',
    fields: [],
    nodes: ['injunction_cancellation_ruling_appeal_apk'],
  },
  {
    id: 'claim_refusal_appeal',
    label: 'Суд отказал в принятии искового заявления — хочу обжаловать',
    // П. 5 ст. 127.1 АПК РФ. Числа в самой норме нет — общий месячный срок по
    // ч. 3 ст. 188 АПК РФ (та же формула, что у injunction_refusal_appeal_apk).
    primary_field: 'claim_refusal_ruling_date_apk',
    fields: [],
    nodes: ['claim_refusal_appeal_apk'],
  },
  {
    id: 'deadline_restoration_refusal_appeal',
    label: 'Суд отказал в восстановлении пропущенного срока — хочу обжаловать',
    // П. 6 ст. 117 АПК РФ. Числа в самой норме нет — общий месячный срок по
    // ч. 3 ст. 188 АПК РФ (та же формула, что у injunction_refusal_appeal_apk).
    primary_field: 'deadline_restoration_refusal_ruling_date_apk',
    fields: [],
    nodes: ['deadline_restoration_refusal_appeal_apk'],
  },
  {
    id: 'deadline_extension_refusal_appeal',
    label: 'Суд отказал в продлении назначенного им срока — хочу обжаловать',
    // Ч. 2 ст. 118 АПК РФ. Числа в самой норме нет — общий месячный срок по
    // ч. 3 ст. 188 АПК РФ (та же формула, что у injunction_refusal_appeal_apk).
    primary_field: 'deadline_extension_refusal_ruling_date_apk',
    fields: [],
    nodes: ['deadline_extension_refusal_appeal_apk'],
  },
  {
    id: 'decision_clarification_ruling_appeal',
    label:
      'Суд вынес определение по вопросу разъяснения решения или исправления ' +
      'описки/опечатки/арифметической ошибки — хочу обжаловать',
    // Ч. 4 ст. 179 АПК РФ (последнее предложение). Числа в самой норме нет —
    // общий месячный срок по ч. 3 ст. 188 АПК РФ (та же формула, что у
    // injunction_refusal_appeal_apk).
    primary_field: 'decision_clarification_ruling_date_apk',
    fields: [],
    nodes: ['decision_clarification_ruling_appeal_apk'],
  },
  {
    id: 'enforcement_restoration_ruling_appeal',
    label:
      'Суд вынес определение по вопросу о восстановлении срока предъявления ' +
      'исполнительного листа — хочу обжаловать',
    // Ч. 3 ст. 322 АПК РФ. Числа в самой норме нет — общий месячный срок по
    // ч. 3 ст. 188 АПК РФ (та же формула, что у injunction_refusal_appeal_apk).
    // Не дубль enforcement_presentation_apk/enforcement_presentation_after_restoration_apk
    // (те про сам срок предъявления, этот — про обжалование определения о
    // восстановлении).
    primary_field: 'enforcement_restoration_ruling_date_apk',
    fields: [],
    nodes: ['enforcement_restoration_ruling_appeal_apk'],
  },
  {
    id: 'evidence_unavailability_notice',
    label: 'Не могу представить истребуемое судом доказательство',
    // Ч. 8 ст. 66 АПК РФ. Единственное поле — дата получения копии определения
    // об истребовании доказательства (не дата его вынесения — см.
    // apk/chain.js). Восстановления/продления этого срока норма не
    // предусматривает вообще — отдельного узла и уточняющих полей для него
    // нет.
    primary_field: 'evidence_request_copy_received_date_apk',
    fields: [],
    nodes: ['evidence_unavailability_notice_apk'],
  },
  {
    id: 'enforcement_writ_duplicate_request',
    label:
      'Исполнительный лист утрачен приставом или иным исполняющим лицом — ' +
      'нужен дубликат',
    // Ч. 2 ст. 323 АПК РФ, исключительная ветка (утрата листа судебным
    // приставом-исполнителем или иным осуществляющим исполнение лицом,
    // обнаруженная взыскателем после истечения срока предъявления листа к
    // исполнению) — см. подробный разбор обеих веток ч. 2 в apk/chain.js.
    // Восстановление без числового потолка не найдено (тот же случай, что и
    // у ст. 322) — отдельного узла и уточняющих полей для него нет.
    primary_field: 'enforcement_writ_loss_known_date_apk',
    fields: [],
    nodes: ['enforcement_writ_duplicate_request_apk'],
  },
  {
    id: 'court_fine_appeal',
    label: 'Суд наложил судебный штраф — хочу обжаловать',
    // Ч. 6 ст. 120 АПК РФ (в задаче ошибочно указана как ст. 119 п. 6 — при
    // сверке с первоисточником текст подтвердился, но действует в ч. 6
    // ст. 120, см. apk/chain.js). Якорь — дата ПОЛУЧЕНИЯ копии определения,
    // не дата его вынесения. Восстановления/продления этого срока норма не
    // предусматривает вообще — отдельного узла и уточняющих полей для него
    // нет.
    primary_field: 'court_fine_ruling_copy_received_date_apk',
    fields: [],
    nodes: ['court_fine_appeal_apk'],
  },
  {
    id: 'additional_decision_refusal_appeal',
    label:
      'Суд отказал в принятии дополнительного решения — хочу обжаловать ' +
      'определение',
    // Ч. 5 ст. 178 АПК РФ. Числа в самой норме нет — общий месячный срок по
    // ч. 3 ст. 188 АПК РФ (та же формула, что у injunction_refusal_appeal_apk
    // и других companion-узлов). Само дополнительное решение (в отличие от
    // определения об отказе в его принятии) обжалуется по общему правилу
    // (appeal_general_apk, ст. 259) — отдельной ветки для него здесь нет, см.
    // apk/chain.js.
    primary_field: 'additional_decision_refusal_ruling_date_apk',
    fields: [],
    nodes: ['additional_decision_refusal_appeal_apk'],
  },
];

export const DEFAULT_SITUATION_APK = 'decision_chain';
