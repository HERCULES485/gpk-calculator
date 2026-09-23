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
    title: 'Решение и его обжалование',
    ids: ['decision_chain', 'rulings', 'enforcement', 'court_costs'],
  },
  {
    title: 'Приказное и упрощённое производство',
    ids: ['court_order', 'simplified_proceedings'],
  },
  {
    title: 'Оспаривание актов и привлечения к ответственности',
    ids: [
      'nonnormative_act_challenge',
      'administrative_liability_challenge',
      'admin_liability_appeal',
    ],
  },
  {
    title: 'Компенсации за нарушение сроков',
    ids: ['reasonable_term_compensation', 'execution_compensation'],
  },
  {
    title: 'Надзор и пересмотр по новым обстоятельствам',
    ids: ['nadzor', 'new_circumstances'],
  },
  {
    // Свёрнута по умолчанию — но не потому, что сам институт редкий (как у
    // bankruptcy-категории «внешнее управление»): здесь десять узкоситуативных
    // развилок, по одной ветке на конкретное частное обжалование, каждая из
    // которых нужна небольшой доле пользователей. Формулировка отражает именно
    // это — не «редкие процедуры».
    title:
      'Обжалование отдельных процессуальных определений ' +
      '(частные случаи — актуально не всем)',
    collapsed: true,
    ids: [
      'settlement_approval_cassation',
      'arbitral_enforcement_writ_cassation',
      'foreign_judgment_enforcement_cassation',
      'foreign_judgment_recognition_cassation',
      'case_transfer_jurisdiction_appeal',
      'coplaintiff_codefendant_refusal_appeal',
      'third_party_claim_refusal_appeal',
      'third_party_no_claim_refusal_appeal',
      'case_consolidation_severance_refusal_appeal',
      'special_ruling_appeal',
    ],
  },
];
