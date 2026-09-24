// Группировка переключателя ветвей bankruptcy.html по категориям —
// UI-специфика чисто этой страницы, поэтому вынесена из apk/bankruptcy-situations.js
// (тот файл — предметные данные ветвей домена банкротства, без разметки и без
// того, как их показывать) в отдельный файл, а не в core/view/situations.js
// (общий слой не должен ничего знать про группировку одного конкретного
// домена).
//
// Список категорий и порядок id внутри каждой — архитектурное решение
// (БАНКРОТСТВО-UI задача о группировке), не пересчитывается и не
// пересортировывается по ходу: рендер (apk/bankruptcy-app.js) просто проходит
// этот список по порядку.

export const BANKRUPTCY_SITUATION_CATEGORIES = [
  {
    title: 'Наблюдение',
    ids: [
      'debtor_response',
      'claims_ruling_reasoned_request',
      'claims_ruling_reasoned_appeal',
      'observation_information_request_response',
      'observation_introduction_notification',
    ],
  },
  {
    title: 'Конкурсное производство',
    ids: [
      'enterprise_sale_payment',
      'bankruptcy_property_sale_proposal',
      'enterprise_sale_procedure_approval_appeal',
      'property_sale_procedure_approval_appeal',
      'bankruptcy_completion_request_ruling_appeal',
      'bankruptcy_manager_appointment_appeal',
      'bankruptcy_declaration',
      'bankruptcy_inventory_results_registry',
      'settlement_agreement_rejection_appeal',
      'bankruptcy_proceeding_extension_appeal',
    ],
  },
  {
    title: 'Финансовое оздоровление и внешнее управление (редкие процедуры)',
    // Единственная свёрнутая по умолчанию категория: <details> без атрибута
    // open — остальные шесть остаются обычными <fieldset>, раскрытыми, как и
    // весь переключатель был раньше.
    collapsed: true,
    ids: [
      'external_management_introduction_extension_appeal',
      'external_management_reduction_appeal',
      'external_management_plan_invalidation_appeal',
      'external_management_term_expiry_refusal_appeal',
      'external_management_plan',
      'external_management_plan_submission',
      'external_management_report_submission',
      'external_management_report_on_full_satisfaction',
      'external_management_handover',
      'external_management_third_party_satisfaction',
    ],
  },
  {
    title: 'Мировое соглашение',
    ids: [
      'settlement_agreement',
      'settlement_agreement_review',
      'settlement_cancellation_resumption_appeal',
      'settlement_termination_ruling_appeal',
    ],
  },
  {
    title: 'Субсидиарная ответственность',
    ids: ['subsidiary_in_case', 'subsidiary_post_conclusion'],
  },
  {
    title: 'Банкротство гражданина',
    ids: [
      'citizen_bankruptcy',
      'citizen_bankruptcy_filing_duty',
      'citizen_property_sale',
      'bank_notification_duty',
      'property_exclusion_ruling_appeal',
      'property_exclusion_amount_dispute',
      'out_of_court_bankruptcy',
      'out_of_court_bankruptcy_returned',
      'out_of_court_bankruptcy_prior_completed',
    ],
  },
  {
    title: 'Общее — применимо на нескольких стадиях',
    ids: ['creditor_claims', 'appraiser_involvement_request', 'appraisal_report_registry_inclusion'],
  },
];
