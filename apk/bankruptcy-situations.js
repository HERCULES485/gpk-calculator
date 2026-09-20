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
// нет вовсе — одиннадцать простых узлов (включая три узла kind: 'event' —
// ст. 223.6 п. 1 и ст. 223.2 п. 6, п. 8 — и один kind: 'window', ст. 158
// п. 2) имеют одиннадцать независимых якорей и не делят между собой ни
// одного поля. При строгом критерии «общий якорь» ветвей было бы тринадцать
// по одному-двум узлам, и переключатель перестал бы что-либо объяснять.
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
    // Ветвь про СУДЕБНУЮ процедуру, как и следующая: предыдущие три
    // (out_of_court_*) — про внесудебное банкротство через МФЦ, здесь и в
    // settlement_agreement_review заявления представляются в арбитражный суд.
    // Один primary_field, тот же образец, что у всех одноузловых ветвей.
    primary_field: 'settlement_agreement_conclusion_date_apk',
    fields: [],
    nodes: ['settlement_agreement_approval_application_apk'],
  },
  {
    id: 'settlement_agreement_review',
    label: 'Суд уже утвердил мировое соглашение — но открылись новые обстоятельства',
    // Отдельная от settlement_agreement ветвь, не второй узел в ней: разные
    // стадии одного и того же дела о мировом соглашении, взаимоисключающие
    // ситуации пользователя. Там суд ЕЩЁ НЕ утвердил соглашение (якорь — дата
    // заключения), здесь суд УЖЕ утвердил, и обнаружились обстоятельства,
    // дающие право на пересмотр (якорь — дата, когда о них стало известно, —
    // событие, не связанное по времени со сроком подачи заявления на
    // утверждение). Один primary_field, тот же образец.
    primary_field: 'settlement_agreement_review_circumstances_discovered_date_apk',
    fields: [],
    nodes: ['settlement_agreement_review_apk'],
  },
  {
    id: 'appraiser_involvement_request',
    label: 'Внешнее управление или конкурсное производство — не согласен с результатами инвентаризации',
    // Первая ветвь процедуры внешнего управления в этом домене (см.
    // комментарий к узлу в apk/bankruptcy.js). Единственное поле ветви —
    // дата включения сведений о результатах инвентаризации в ЕФРСБ, тот же
    // образец, что у остальных одноузловых ветвей. Условие права (порог 2%
    // от суммы требований в реестре) в форму не выведено — это не дата и не
    // дискриминатор состояния, а числовое условие применимости, отражённое
    // текстом на карточке (см. logic узла).
    primary_field: 'inventory_results_included_date_apk',
    fields: [],
    nodes: ['appraiser_involvement_request_apk'],
  },
  {
    id: 'claims_ruling_reasoned_request',
    label: 'Определение об установлении требований вынесено резолютивной частью — нужна мотивированная часть',
    // Единственное поле ветви — дата размещения резолютивной части, тот же
    // образец, что у остальных одноузловых ветвей. Отдельная ветвь от
    // claims_ruling_reasoned_appeal ниже (архитектурное решение согласовано
    // отдельно): разные якоря, разные сроки, разные институты — просьба
    // изготовить полный текст, не связанная с обжалованием, и досылка
    // мотивировки к уже поданной жалобе — не один и тот же сценарий.
    primary_field: 'claims_ruling_resolutive_part_date_apk',
    fields: [],
    nodes: ['claims_ruling_reasoned_request_apk'],
  },
  {
    id: 'claims_ruling_reasoned_appeal',
    label: 'Жалоба на резолютивную часть уже подана — суд изготовил мотивированное определение',
    // Якорь — дата изготовления мотивированного определения (не дата подачи
    // жалобы на резолютивную часть: сам факт подачи жалобы — предпосылка
    // этой ветки, узлом не проверяется и отдельным полем не вводится).
    primary_field: 'claims_ruling_reasoned_date_apk',
    fields: [],
    nodes: ['claims_ruling_reasoned_appeal_apk'],
  },
  {
    id: 'enterprise_sale_payment',
    label: 'Выиграл торги как покупатель — нужно оплатить',
    // Единственное поле ветви — дата подписания договора купли-продажи
    // предприятия, тот же образец, что у остальных одноузловых ветвей.
    primary_field: 'enterprise_sale_agreement_signed_date_apk',
    fields: [],
    nodes: ['enterprise_sale_payment_apk'],
  },
  {
    id: 'settlement_agreement_rejection_appeal',
    label: 'Суд отказал в утверждении мирового соглашения — обжалование',
    // Отдельная от settlement_agreement/settlement_agreement_review ветвь:
    // здесь суд УЖЕ рассмотрел заявление и ОТКАЗАЛ (ст. 160 ч. 3), а не ещё
    // не рассмотрел (settlement_agreement) и не УЖЕ утвердил (review) —
    // три взаимоисключающие стадии одного института. Единственное поле
    // ветви — дата изготовления определения об отказе в полном объёме, тот
    // же образец, что у остальных одноузловых ветвей.
    primary_field: 'settlement_agreement_rejection_ruling_date_apk',
    fields: [],
    nodes: ['settlement_agreement_rejection_appeal_apk'],
  },
  {
    id: 'external_management_introduction_extension_appeal',
    label: 'Обжалование определения о введении или продлении внешнего управления',
    // Единственное поле ветви — дата изготовления определения в полном
    // объёме, тот же образец, что у settlement_agreement_rejection_appeal.
    primary_field: 'external_management_introduction_extension_ruling_date_apk',
    fields: [],
    nodes: ['external_management_introduction_extension_appeal_apk'],
  },
  {
    id: 'external_management_reduction_appeal',
    label: 'Обжалование определения о сокращении срока внешнего управления',
    // Отдельная от предыдущей ветвь: разные определения (введение/продление
    // против сокращения срока), разные факты дела, взаимоисключающие
    // ситуации пользователя — тот же принцип, что у группы «шесть узлов
    // сокращённой апелляции» (PR #50).
    primary_field: 'external_management_reduction_ruling_date_apk',
    fields: [],
    nodes: ['external_management_reduction_appeal_apk'],
  },
  {
    id: 'external_management_plan_invalidation_appeal',
    label: 'Обжалование определения о признании недействительным плана внешнего управления',
    primary_field: 'external_management_plan_invalidation_ruling_date_apk',
    fields: [],
    nodes: ['external_management_plan_invalidation_appeal_apk'],
  },
  {
    id: 'external_management_term_expiry_refusal_appeal',
    label: 'Обжалование отказа в удовлетворении ходатайства при истечении сроков внешнего управления',
    primary_field: 'external_management_term_expiry_refusal_ruling_date_apk',
    fields: [],
    nodes: ['external_management_term_expiry_refusal_appeal_apk'],
  },
  {
    id: 'external_management_plan',
    label: 'Внешний управляющий: разработка плана и созыв собрания кредиторов',
    // ДВА узла в одной ветви, не два узла в двух ветвях: оба используют
    // ОДИН И ТОТ ЖЕ якорь (дата утверждения внешнего управляющего) — тот же
    // прецедент группировки, что у subsidiary_in_case выше (базовый узел и
    // его restoration делят одни и те же поля ветви). Разная длительность
    // (месяц на разработку плана, два месяца на созыв и рассмотрение) — это
    // два независимых обязательства из одного факта, а не одна обязанность
    // под двумя именами.
    primary_field: 'external_management_manager_approved_date_apk',
    fields: [],
    nodes: ['external_management_plan_development_apk', 'external_management_plan_meeting_apk'],
  },
  {
    id: 'external_management_plan_submission',
    label: 'Внешний управляющий: представление плана в арбитражный суд',
    // Якорь — дата проведения собрания кредиторов, утвердившего план (не
    // дата утверждения внешнего управляющего из предыдущей ветви) —
    // отдельный факт, наступающий позже.
    primary_field: 'external_management_plan_meeting_date_apk',
    fields: [],
    nodes: ['external_management_plan_submission_apk'],
  },
  {
    id: 'external_management_report_submission',
    label: 'Внешний управляющий: направление отчёта и протокола собрания в арбитражный суд',
    // Якорь — дата проведения собрания кредиторов, рассмотревшего ОТЧЁТ —
    // другое собрание, чем в ветви external_management_plan_submission (там
    // рассматривается ПЛАН в начале процедуры, здесь — отчёт ближе к её
    // завершению), отдельное поле.
    primary_field: 'external_management_report_meeting_date_apk',
    fields: [],
    nodes: ['external_management_report_submission_apk'],
  },
  {
    id: 'external_management_report_on_full_satisfaction',
    label: 'Внешний управляющий: отчёт при полном удовлетворении требований кредиторов',
    primary_field: 'external_management_full_satisfaction_date_apk',
    fields: [],
    nodes: ['external_management_report_on_full_satisfaction_apk'],
  },
  {
    id: 'external_management_handover',
    label: 'Внешний управляющий: передача дел конкурсному управляющему',
    primary_field: 'receiver_approved_date_apk',
    fields: [],
    nodes: ['external_management_handover_apk'],
  },
  {
    id: 'external_management_third_party_satisfaction',
    label: 'Внешний управляющий: требования погашены третьим лицом, учредителями или собственником имущества',
    // ДВА узла в одной ветви, не два узла в двух ветвях — тот же прецедент,
    // что у external_management_plan выше: оба узла считаются от ОДНОЙ и
    // той же даты (окончание исполнения обязательств третьим лицом/
    // учредителями/собственником имущества по ст. 113), это два независимых
    // обязательства (уведомить кредиторов; направить отчёт в суд), а не
    // одна обязанность под двумя именами.
    primary_field: 'external_management_third_party_satisfaction_date_apk',
    fields: [],
    nodes: ['external_management_creditor_notification_apk', 'external_management_report_special_completion_apk'],
  },
  {
    id: 'bankruptcy_property_sale_proposal',
    label: 'Конкурсное производство: предложения о порядке продажи имущества должника',
    // Единственное поле ветви — дата окончания инвентаризации ИЛИ оценки
    // (два альтернативных события, одно поле — см. комментарий к узлу в
    // apk/bankruptcy.js), тот же образец, что у остальных одноузловых
    // ветвей.
    primary_field: 'property_inventory_or_valuation_completion_date_apk',
    fields: [],
    nodes: ['bankruptcy_property_sale_proposal_apk'],
  },
  {
    id: 'appraisal_report_registry_inclusion',
    label: 'Включение сведений об отчёте об оценке имущества должника в ЕФРСБ',
    // Отдельная от appraiser_involvement_request ветвь: тот же пункт 5.1
    // ст. 110, но другой якорь (дата поступления копии отчёта, а не дата
    // включения сведений об инвентаризации) — см. комментарий к узлу в
    // apk/bankruptcy.js.
    //
    // Лейбл БЕЗ ролевого префикса ("Внешний управляющий: ..."), в отличие
    // от соседних веток этой группы: обязанность здесь (ст. 130 ФЗ
    // № 127-ФЗ) сформулирована на "арбитражного управляющего" — родовой
    // термин без привязки к конкретной процедуре, префикс с конкретной
    // ролью был бы неточным. Прецедента процедурно-нейтрального лейбла в
    // стиле "Роль: описание" в файле нет — использован общий для
    // большинства веток файла стиль без префикса, решение архитектора.
    primary_field: 'appraisal_report_copy_received_date_apk',
    fields: [],
    nodes: ['appraisal_report_registry_inclusion_apk'],
  },
  {
    id: 'enterprise_sale_procedure_approval_appeal',
    label: 'Обжалование определения об утверждении порядка продажи предприятия должника',
    primary_field: 'enterprise_sale_procedure_approval_ruling_date_apk',
    fields: [],
    nodes: ['enterprise_sale_procedure_approval_appeal_apk'],
  },
  {
    id: 'property_sale_procedure_approval_appeal',
    label: 'Обжалование определения об утверждении порядка продажи имущества должника',
    // Отдельная от enterprise_sale_procedure_approval_appeal ветвь: разные
    // институты (продажа предприятия целиком по ст. 110 vs продажа
    // имущества россыпью по ст. 139) при зеркальной по тексту норме — см.
    // комментарий к узлам в apk/bankruptcy.js.
    primary_field: 'property_sale_procedure_approval_ruling_date_apk',
    fields: [],
    nodes: ['property_sale_procedure_approval_appeal_apk'],
  },
  {
    id: 'bankruptcy_completion_request_ruling_appeal',
    label:
      'Обжалование определения по результатам рассмотрения заявлений ' +
      'конкурсного управляющего о завершении конкурсного производства',
    primary_field: 'bankruptcy_completion_request_ruling_date_apk',
    fields: [],
    nodes: ['bankruptcy_completion_request_ruling_appeal_apk'],
  },
];

export const DEFAULT_SITUATION_BANKRUPTCY = 'debtor_response';
