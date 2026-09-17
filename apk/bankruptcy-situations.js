// Ситуации домена банкротства (ФЗ № 127-ФЗ) — разбиение узлов и полей ввода по
// ветвям для переключателя на странице банкротства.
//
// Отдельный массив, а НЕ добавление ветвей в SITUATIONS_APK: домен банкротства
// получает собственную страницу (решение БАНКРОТСТВО-UI.0), и его узлы не
// делят с узлами apk/chain.js ни одного якоря, ни одного поля ввода. Механика
// (situationById, allSituationNodes, checkSituationCoverage) — общая, лежит в
// core/view/situations.js и принимает этот массив параметром; здесь только
// данные домена банкротства.
//
// Разбиение — тематическое, по разделам процедуры банкротства, а не строго по
// общему якорю. Это осознанное отступление от критерия ветвей apk/situations.js
// (где ветвь = связный по якорям фрагмент графа): в домене банкротства графа
// нет вовсе — десять простых узлов (включая три узла kind: 'event' —
// ст. 223.6 п. 1 и ст. 223.2 п. 6, п. 8 — и один kind: 'window', ст. 158
// п. 2) имеют десять независимых якорей и не делят между собой ни одного
// поля. При строгом критерии «общий якорь» ветвей было бы двенадцать по
// одному-двум узлам, и переключатель перестал бы что-либо объяснять.
// Прецедент тематического основания в проекте есть: nonnormative_act_challenge
// и administrative_liability_challenge разведены в apk/situations.js по
// предметному признаку («параграф 2 главы 25, не параграф 1») при одинаковой
// форме узлов.
//
// Две ветви субсидиарной ответственности не сливаются в одну: у п. 5 и п. 6
// ст. 61.14 разные якоря, разный состав потолков и разные условия
// применимости — выбор между ними пользователь делает про свой случай, а не
// про способ ввода данных.
//
// В `fields` — одиночные поля ввода ветви. Восстановительные узлы субсидиарки
// своих полей не имеют вовсе: они целиком считаются от базового узла и стоят
// в той же ветви, деля с ним один и тот же список полей (тот же принцип, что
// у пяти restoration-узлов АПК в apk/situations.js).

export const SITUATIONS_BANKRUPTCY = [
  {
    id: 'debtor_response',
    label: 'Отзыв должника на заявление о банкротстве',
    // Единственное поле ветви — дата получения должником определения о
    // принятии заявления (не дата вынесения определения — см. apk/bankruptcy.js).
    primary_field: 'creditor_petition_acceptance_ruling_received_date_apk',
    fields: [],
    nodes: ['debtor_response_bankruptcy_apk'],
  },
  {
    id: 'creditor_claims',
    label: 'Требования кредиторов: юридическое лицо',
    // Без primary_field: три узла ветви не связаны ни одним общим полем, и
    // выделять один из трёх якорей как «основной» было бы произволом — ни один
    // не управляет показом остальных. Все три поля равноправно лежат в блоке
    // исходных данных (как у ветвей rulings и enforcement в apk/situations.js).
    //
    // Даты публикации двух РАЗНЫХ сведений (о введении наблюдения и о признании
    // должника банкротом) — отдельные поля: это разные публикации на разных
    // стадиях процедуры, а не одно событие под двумя именами.
    fields: [
      'observation_introduction_notice_published_date_apk',
      'bankruptcy_declaration_notice_published_date_apk',
      'creditor_claim_unjustified_circumstances_known_date_apk',
    ],
    nodes: [
      'creditor_claims_submission_apk',
      'creditors_register_closure_apk',
      'creditor_claim_exclusion_apk',
    ],
  },
  {
    id: 'citizen_bankruptcy',
    label: 'Банкротство гражданина',
    // Тоже без primary_field: два узла с независимыми якорями. Ветвь выделена
    // по субъекту процедуры (гражданин, а не юридическое лицо) — по этому же
    // признаку обе нормы стоят в отдельной главе X ФЗ № 127-ФЗ.
    fields: [
      'citizen_bankruptcy_petition_justified_notice_published_date_apk',
      'bankruptcy_completion_review_circumstances_discovered_date_apk',
    ],
    nodes: ['citizen_bankruptcy_creditor_claims_apk', 'bankruptcy_completion_review_apk'],
  },
  {
    id: 'subsidiary_in_case',
    label: 'Субсидиарная ответственность в деле о банкротстве',
    // Без primary_field: срок ограничен тремя потолками одновременно, и ни одна
    // из трёх дат не главнее двух других — выделение любой из них наверх
    // подсказывало бы, что именно она определяет дедлайн, а это неверно.
    //
    // Три альтернативные даты объективного потолка перечислены все: какая из
    // них нужна, решает дискриминатор objective_cap_event, и скрытием лишних
    // занимается слой страницы, а не этот список (тот же приём, что у
    // case_type в ветви enforcement модуля АПК).
    fields: [
      'subsidiary_liability_grounds_known_date_apk',
      'objective_cap_event',
      'bankruptcy_declared_date_apk',
      'bankruptcy_case_terminated_date_apk',
      'bankruptcy_petition_returned_date_apk',
      'subsidiary_liability_conduct_date_apk',
    ],
    nodes: ['subsidiary_liability_in_case_apk', 'subsidiary_liability_in_case_apk_restoration'],
  },
  {
    id: 'subsidiary_post_conclusion',
    label: 'Субсидиарная ответственность после завершения конкурсного производства',
    // Дата действий (бездействия) — то же поле, что и в ветви
    // subsidiary_in_case: десятилетний предел в обоих пунктах ст. 61.14
    // отсчитывается от одного и того же юридического факта. Разделение
    // ситуаций на этом не сказывается — введённые данные живут в общем
    // состоянии формы и при переключении ветви не теряются.
    fields: [
      'bankruptcy_proceeding_conclusion_date_apk',
      'subsidiary_liability_conduct_date_apk',
    ],
    nodes: [
      'subsidiary_liability_post_conclusion_apk',
      'subsidiary_liability_post_conclusion_apk_restoration',
    ],
  },
  {
    id: 'out_of_court_bankruptcy',
    label: 'Внесудебное банкротство гражданина (через МФЦ)',
    // Единственное поле ветви — дата включения сведений о возбуждении
    // процедуры в ЕФРСБ (по образцу ветви debtor_response выше: один
    // primary_field, пустой fields).
    //
    // «Через МФЦ» в ярлыке — намеренно: внесудебная процедура ст. 223.2—
    // 223.7 ФЗ № 127-ФЗ ведётся многофункциональным центром, а не судом, в
    // отличие от всех остальных пяти ветвей этого домена (там во всех —
    // арбитражный суд). Без этого уточнения ветвь легко перепутать с
    // судебным банкротством по одному лишь общему названию закона.
    primary_field: 'out_of_court_bankruptcy_initiation_notice_included_date_apk',
    fields: [],
    nodes: ['out_of_court_bankruptcy_completion_apk'],
  },
  {
    id: 'out_of_court_bankruptcy_returned',
    label: 'Заявление о внесудебном банкротстве вернули',
    // Отдельная от out_of_court_bankruptcy ветвь, а не второй узел в ней:
    // ситуации взаимоисключающие. Там заявление МФЦ принял и сведения о
    // возбуждении процедуры включены в ЕФРСБ — там есть primary_field этой
    // ветви. Здесь заявление вернули — процедура вообще не возбуждена, и
    // такой даты у пользователя нет и быть не может. Один primary_field, по
    // тому же образцу, что у debtor_response и out_of_court_bankruptcy.
    primary_field: 'out_of_court_bankruptcy_return_date_apk',
    fields: [],
    nodes: ['out_of_court_bankruptcy_reapplication_apk'],
  },
  {
    id: 'out_of_court_bankruptcy_prior_completed',
    label: 'Ранее уже проходил(а) через банкротство — когда можно подать снова',
    // Третья и последняя ветвь про право на повторную подачу — снова
    // отдельная, не узел в out_of_court_bankruptcy_returned: там заявление
    // МФЦ вернул (процедура не была возбуждена вовсе), здесь — предыдущая
    // процедура (внесудебная или судебная) была возбуждена и уже завершилась
    // тем или иным образом. Разные факты, разные поля, взаимоисключающие
    // ситуации пользователя. Один primary_field, тот же образец.
    primary_field: 'out_of_court_bankruptcy_prior_procedure_end_date_apk',
    fields: [],
    nodes: ['out_of_court_bankruptcy_reapplication_after_prior_apk'],
  },
  {
    id: 'settlement_agreement',
    label: 'Заключили мировое соглашение — когда подавать на утверждение',
    // Единственная ветвь домена про СУДЕБНУЮ процедуру из трёх последних:
    // предыдущие три (out_of_court_*) — про внесудебное банкротство через МФЦ,
    // здесь заявление представляется в арбитражный суд. Один primary_field,
    // тот же образец, что у всех одноузловых ветвей.
    primary_field: 'settlement_agreement_conclusion_date_apk',
    fields: [],
    nodes: ['settlement_agreement_approval_application_apk'],
  },
];

export const DEFAULT_SITUATION_BANKRUPTCY = 'debtor_response';
