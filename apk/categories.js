// Группировка переключателя ветвей apk.html по категориям — UI-специфика
// этой страницы, поэтому вынесена из apk/situations.js (то — предметные
// данные ветвей, без разметки и без того, как их показывать) в отдельный
// файл, по тому же образцу, что и apk/bankruptcy-categories.js (PR #65).
// core/view/situations.js не трогается: общий слой не должен ничего знать
// про группировку одного конкретного домена.
//
// Список категорий и порядок id внутри каждой — архитектурное решение,
// не пересчитывается и не пересортировывается по ходу: рендер
// (apk/app.js) просто проходит этот список по порядку.

export const SITUATION_CATEGORIES_APK = [
  {
    // Новая категория, первая в списке — решение архитектора (по задаче про
    // досудебную претензию: абз. 1 ч. 5 ст. 4 АПК РФ).
    title: 'До обращения в суд',
    collapsed: true,
    ids: ['pretrial_claim'],
  },
  {
    title: 'Решение и его обжалование',
    collapsed: true,
    // evidence_unavailability_notice и enforcement_writ_duplicate_request —
    // размещены в этой, самой широкой по темам категории за неимением более
    // точного существующего варианта (ни одна из остальных категорий не
    // подходит по смыслу — не обжалование определения, не приказное/
    // упрощённое производство, не оспаривание акта госоргана, не
    // компенсация, не надзор/пересмотр). Решение показать на проверку
    // архитектору вместе с diff перед PR, не вводя новую категорию по
    // собственной инициативе (CLAUDE.md: категоризация — в существующую
    // категорию).
    ids: [
      'decision_chain',
      'rulings',
      'enforcement',
      'court_costs',
      'evidence_unavailability_notice',
      'enforcement_writ_duplicate_request',
      'protocol_remarks',
      'indexation',
      'enforcement_resumption',
    ],
  },
  {
    title: 'Приказное и упрощённое производство',
    collapsed: true,
    ids: ['court_order', 'simplified_proceedings'],
  },
  {
    // Новая категория — решение архитектора (по задаче про корпоративные
    // споры: ч. 1 ст. 225.9 и ч. 4 ст. 225.7 АПК РФ).
    title: 'Корпоративные споры',
    collapsed: true,
    ids: ['corporate_ruling_appeal', 'meeting_convening_appeal'],
  },
  {
    // Новая категория — решение архитектора (по задаче про третейские суды:
    // ч. 4, 5 ст. 230, ч. 5 ст. 234, ч. 2 ст. 235 АПК РФ). Ветвь
    // arbitral_enforcement_writ_cassation (ч. 5 ст. 240) перенесена сюда из
    // категории «Обжалование отдельных процессуальных определений…» — тоже
    // решение архитектора.
    title: 'Третейские суды',
    collapsed: true,
    ids: [
      'arbitral_competence_challenge',
      'arbitral_award_challenge_party',
      'arbitral_award_challenge_nonparty',
      'arbitral_award_challenge_ruling_cassation',
      'arbitral_enforcement_writ_cassation',
    ],
  },
  {
    // Новая категория — решение архитектора (по задаче про предъявление
    // иностранных решений к исполнению и кассацию по запрету иностранного
    // разбирательства: ч. 2 ст. 246, ч. 9 ст. 248.2 АПК РФ). Ветви
    // foreign_judgment_enforcement_cassation и
    // foreign_judgment_recognition_cassation перенесены сюда из категории
    // «Обжалование отдельных процессуальных определений…» — тоже решение
    // архитектора.
    title: 'Иностранные решения и разбирательства',
    collapsed: true,
    ids: [
      'foreign_judgment_enforcement_term',
      'foreign_judgment_enforcement_cassation',
      'foreign_judgment_recognition_cassation',
      'antisuit_injunction_cassation',
    ],
  },
  {
    title: 'Оспаривание актов и привлечения к ответственности',
    collapsed: true,
    ids: [
      'nonnormative_act_challenge',
      'administrative_liability_challenge',
      'admin_liability_appeal',
    ],
  },
  {
    title: 'Компенсации за нарушение сроков',
    collapsed: true,
    ids: ['reasonable_term_compensation', 'execution_compensation'],
  },
  {
    title: 'Надзор и пересмотр по новым обстоятельствам',
    collapsed: true,
    ids: ['nadzor', 'new_circumstances'],
  },
  {
    // collapsed: true — как и у всех категорий: аккордеон, раскрыта только
    // категория с текущей ветвью (renderSituationSwitch в apk/app.js).
    title:
      'Обжалование отдельных процессуальных определений ' +
      '(частные случаи — актуально не всем)',
    collapsed: true,
    ids: [
      'settlement_approval_cassation',
      'case_transfer_jurisdiction_appeal',
      'coplaintiff_codefendant_refusal_appeal',
      'third_party_claim_refusal_appeal',
      'third_party_no_claim_refusal_appeal',
      'case_consolidation_severance_refusal_appeal',
      'special_ruling_appeal',
      'injunction_refusal_appeal',
      'counter_security_ruling_appeal',
      'injunction_cancellation_ruling_appeal',
      'claim_refusal_appeal',
      'deadline_restoration_refusal_appeal',
      'deadline_extension_refusal_appeal',
      'decision_clarification_ruling_appeal',
      'enforcement_restoration_ruling_appeal',
      'court_fine_appeal',
      'additional_decision_refusal_appeal',
    ],
  },
];
