// Тесты узлов модуля АПК: ст. 259 ч. 1 — общий месячный срок (задача 1b),
// ст. 259 ч. 2 — предельный срок ходатайства о восстановлении (задача 1c),
// ст. 180 ч. 1 — вступление решения в законную силу (задача 2a),
// ст. 276 ч. 1 — общий срок кассационной жалобы (задача 3a),
// ст. 276 ч. 2 — предельный срок ходатайства о восстановлении (задача 3b),
// ст. 291.2 ч. 1 — вступление в силу после кассации, якорь (задача 4a),
// ст. 291.2 ч. 1 — общий срок кассации в СК ВС РФ (задача 4b),
// ст. 291.2 ч. 2 — предельный срок ходатайства о восстановлении (задача 4c),
// ст. 188 ч. 3 — частная жалоба на определение первой инстанции (задача 5a),
// ст. 188 ч. 4 — частная жалоба на определение апелляционной инстанции (задача 5b),
// ст. 188 ч. 6 — частная жалоба на определение кассационной инстанции (задача 5b),
// ст. 188 ч. 5 — жалоба на постановление апелляции по жалобе на определение (задача 5c),
// ст. 321 ч. 1, 3, 4 — предъявление исполнительного листа, базовый срок и перерыв (задача 6b),
// ст. 321 ч. 2, 5 — исключение периода из срока предъявления (задача 6c),
// ст. 321 ч. 1 п. 2) — срок предъявления после восстановления (задача 6d),
// ст. 308.1 ч. 4, 5 — надзорное обжалование, срок и восстановление (задача НАДЗОР.1).

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computePrivateComplaintFirstInstanceApk,
  PRIVATE_COMPLAINT_FIRST_INSTANCE_APK,
  computeAppealGeneralApk,
  APPEAL_GENERAL_APK,
  computeAppealGeneralApkRestoration,
  APPEAL_GENERAL_APK_RESTORATION,
  computeEntryIntoForceApk,
  computeCassationGeneralApk,
  CASSATION_GENERAL_APK,
  computeCassationGeneralApkRestoration,
  CASSATION_GENERAL_APK_RESTORATION,
  computeEntryIntoForceAfterCassationApk,
  computeCassationVsApk,
  CASSATION_VS_APK,
  computeCassationVsApkRestoration,
  CASSATION_VS_APK_RESTORATION,
  computePrivateComplaintAppellateApk,
  PRIVATE_COMPLAINT_APPELLATE_APK,
  computePrivateComplaintCassationApk,
  PRIVATE_COMPLAINT_CASSATION_APK,
  computePrivateComplaintAppellatePostanovlenieApk,
  PRIVATE_COMPLAINT_APPELLATE_POSTANOVLENIE_APK,
  computeEnforcementPresentationApk,
  ENFORCEMENT_PRESENTATION_APK,
  ENFORCEMENT_EXCLUSION_TYPES_APK,
  computeEnforcementPresentationAfterRestorationApk,
  ENFORCEMENT_PRESENTATION_AFTER_RESTORATION_APK,
  computeNadzorGeneralApk,
  NADZOR_GENERAL_APK,
  computeNadzorGeneralApkRestoration,
  NADZOR_GENERAL_APK_RESTORATION,
} from '../apk/chain.js';

test('appeal_general_apk считается от decision_full_text_date (обычная дата, без переноса)', () => {
  const term = computeAppealGeneralApk({ decision_full_text_date: '2025-03-11' });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11'); // 11.04.2025 — пятница, рабочий день
  assert.equal(term.shifted, false);
});

test('appeal_general_apk: правило "нет такого числа" (ч. 2 ст. 114 АПК РФ) — 31 января -> последний день февраля', () => {
  const term = computeAppealGeneralApk({ decision_full_text_date: '2025-01-31' });
  // В феврале 2025 (невисокосный) нет 31-го числа — срок истекает в последний
  // день месяца.
  assert.equal(term.raw_deadline, '2025-02-28');
  assert.equal(term.deadline, '2025-02-28');
  assert.equal(term.shifted, false);
});

test('appeal_general_apk: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeAppealGeneralApk({ decision_full_text_date: '2025-03-05' });
  // 05.03.2025 + 1 месяц = 05.04.2025 (суббота) -> перенос на 07.04.2025 (понедельник).
  assert.equal(term.raw_deadline, '2025-04-05');
  assert.equal(term.deadline, '2025-04-07');
  assert.equal(term.shifted, true);
});

test('appeal_general_apk: без decision_full_text_date — ошибка', () => {
  assert.throws(() => computeAppealGeneralApk({}), /decision_full_text_date/);
});

test('appeal_general_apk: объём задачи 1b — без restoration_norm и без ics', () => {
  assert.equal(APPEAL_GENERAL_APK.restoration_norm, undefined);
  assert.equal(APPEAL_GENERAL_APK.ics, undefined);
});

// --- Восстановление срока (ч. 2 ст. 259 АПК РФ) ------------------------------

test('восстановление АПК: участвовавшее лицо, надлежаще извещённое — 6 месяцев со дня принятия решения', () => {
  const term = computeAppealGeneralApkRestoration({
    subject_category: 'participating_duly_notified',
    decision_full_text_date: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-09-11');
  assert.equal(term.deadline, '2025-09-11'); // 11.09.2025 — четверг, рабочий день
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 6, unit: 'month' });
  assert.equal(term.norm.primary, 'ч. 2 ст. 259 АПК РФ');
});

test('восстановление АПК: лицо по ст. 42 — 6 месяцев со дня, когда узнало о нарушении прав', () => {
  const term = computeAppealGeneralApkRestoration({
    subject_category: 'article_42_person',
    learned_of_violation_date: '2025-06-10',
  });
  assert.equal(term.anchor, '2025-06-10');
  assert.equal(term.raw_deadline, '2025-12-10');
  assert.equal(term.deadline, '2025-12-10'); // 10.12.2025 — среда, рабочий день
  assert.equal(term.shifted, false);
});

test('восстановление АПК: ненадлежаще извещённое лицо считается от learned_of_violation_date, а НЕ от decision_full_text_date', () => {
  // Обе даты заполнены и различны — если категорию перепутать с
  // participating_duly_notified, узел взял бы 2025-03-11 и дал 2025-09-11.
  const term = computeAppealGeneralApkRestoration({
    subject_category: 'participating_improperly_notified',
    decision_full_text_date: '2025-03-11',
    learned_of_violation_date: '2024-11-12',
  });
  assert.equal(term.anchor, '2024-11-12');
  assert.equal(term.deadline, '2025-05-12');
  assert.notEqual(term.anchor, '2025-03-11');
  assert.notEqual(term.deadline, '2025-09-11');
});

test('восстановление АПК: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeAppealGeneralApkRestoration({
    subject_category: 'participating_duly_notified',
    decision_full_text_date: '2025-01-05',
  });
  // 05.01.2025 + 6 месяцев = 05.07.2025 (суббота) -> перенос на 07.07.2025 (понедельник).
  assert.equal(term.raw_deadline, '2025-07-05');
  assert.equal(term.deadline, '2025-07-07');
  assert.equal(term.shifted, true);
});

test('восстановление АПК: правило "нет такого числа" (ч. 2 ст. 114 АПК РФ) — 31 октября -> 30 апреля', () => {
  const term = computeAppealGeneralApkRestoration({
    subject_category: 'participating_duly_notified',
    decision_full_text_date: '2025-10-31',
  });
  // В апреле нет 31-го числа — срок истекает в последний день месяца.
  assert.equal(term.raw_deadline, '2026-04-30');
  assert.equal(term.deadline, '2026-04-30'); // 30.04.2026 — четверг, рабочий день
  assert.equal(term.shifted, false);
});

test('восстановление АПК: subject_category отсутствует или неизвестна — ошибка со списком допустимых значений', () => {
  const expected =
    /participating_duly_notified.*article_42_person.*participating_improperly_notified/;
  assert.throws(() => computeAppealGeneralApkRestoration({}), expected);
  assert.throws(
    () =>
      computeAppealGeneralApkRestoration({
        subject_category: 'unknown_category',
        decision_full_text_date: '2025-03-11',
      }),
    expected,
  );
});

test('восстановление АПК: participating_duly_notified без decision_full_text_date — ошибка', () => {
  assert.throws(
    () => computeAppealGeneralApkRestoration({ subject_category: 'participating_duly_notified' }),
    /decision_full_text_date/,
  );
});

test('восстановление АПК: категории со ст. 42 без learned_of_violation_date — ошибка', () => {
  for (const category of ['article_42_person', 'participating_improperly_notified']) {
    assert.throws(
      () =>
        computeAppealGeneralApkRestoration({
          subject_category: category,
          // Дата решения заполнена, но этим категориям она не подходит.
          decision_full_text_date: '2025-03-11',
        }),
      /learned_of_violation_date/,
      `категория ${category}: должна требовать learned_of_violation_date`,
    );
  }
});

test('восстановление АПК: результат несёт subject_category, совпадающий с переданной', () => {
  const byCategory = {
    participating_duly_notified: { decision_full_text_date: '2025-03-11' },
    article_42_person: { learned_of_violation_date: '2025-06-10' },
    participating_improperly_notified: { learned_of_violation_date: '2024-11-12' },
  };
  for (const [category, dates] of Object.entries(byCategory)) {
    const term = computeAppealGeneralApkRestoration({ subject_category: category, ...dates });
    assert.equal(term.subject_category, category);
    assert.equal(term.id, 'appeal_general_apk_restoration');
  }
});

test('восстановление АПК: объём задачи 1c — без restoration_norm и без ics', () => {
  assert.equal(APPEAL_GENERAL_APK_RESTORATION.restoration_norm, undefined);
  assert.equal(APPEAL_GENERAL_APK_RESTORATION.ics, undefined);
});

// --- Вступление в законную силу (ч. 1 ст. 180 АПК РФ) ------------------------

test('вступление в силу АПК: жалоба не подана — день, следующий за дедлайном апелляции', () => {
  const entry = computeEntryIntoForceApk({
    appeal_filed: false,
    decision_full_text_date: '2025-03-10',
  });
  // Дедлайн апелляции — 10.04.2025 (четверг, переноса нет), вступление — 11.04 (пятница).
  assert.equal(entry.date, '2025-04-11');
  assert.equal(entry.id, 'entry_into_force_apk');
  assert.equal(entry.based_on, 'appeal_general_apk');
});

test('вступление в силу АПК: дедлайн апелляции в пятницу — вступление в СУББОТУ, без переноса на понедельник', () => {
  // Ключевой тест: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ) относится
  // к последнему дню срока и уже применён внутри appeal_general_apk. К самой
  // дате вступления в силу он не применяется второй раз — она может прийтись
  // на выходной.
  const appeal = computeAppealGeneralApk({ decision_full_text_date: '2025-03-11' });
  assert.equal(appeal.deadline, '2025-04-11'); // пятница
  assert.equal(appeal.shifted, false);

  const entry = computeEntryIntoForceApk({
    appeal_filed: false,
    decision_full_text_date: '2025-03-11',
  });
  assert.equal(entry.date, '2025-04-12'); // суббота — переноса нет
  assert.equal(new Date(`${entry.date}T00:00:00Z`).getUTCDay(), 6, 'должна быть суббота');
  assert.notEqual(entry.date, '2025-04-14'); // не понедельник
});

test('вступление в силу АПК: считается от ПЕРЕНЕСЁННОГО дедлайна апелляции, а не от сырой даты', () => {
  // 05.03.2025 + 1 месяц = 05.04.2025 (суббота) -> дедлайн переносится на
  // 07.04.2025 (понедельник). Вступление считается от перенесённого дня.
  const appeal = computeAppealGeneralApk({ decision_full_text_date: '2025-03-05' });
  assert.equal(appeal.raw_deadline, '2025-04-05');
  assert.equal(appeal.deadline, '2025-04-07');
  assert.equal(appeal.shifted, true);

  const entry = computeEntryIntoForceApk({
    appeal_filed: false,
    decision_full_text_date: '2025-03-05',
  });
  assert.equal(entry.date, '2025-04-08'); // вторник = перенесённый дедлайн + 1
  assert.notEqual(entry.date, '2025-04-06'); // не сырой дедлайн + 1
});

test('вступление в силу АПК: жалоба подана и решение оставлено без изменения — дата постановления апелляции как есть', () => {
  const entry = computeEntryIntoForceApk({
    appeal_filed: true,
    appeal_outcome: 'affirmed',
    appellate_ruling_date: '2025-08-20',
    // Дата решения первой инстанции для этой ветки не используется.
    decision_full_text_date: '2025-03-11',
  });
  assert.equal(entry.date, '2025-08-20');
  assert.equal(entry.based_on, 'appellate_ruling_date');
  assert.notEqual(entry.date, '2025-04-12'); // не результат ветки «жалоба не подана»
});

test('вступление в силу АПК: appeal_filed не передан — ошибка', () => {
  assert.throws(
    () => computeEntryIntoForceApk({ decision_full_text_date: '2025-03-11' }),
    /appeal_filed/,
  );
});

test('вступление в силу АПК: appeal_filed=false без decision_full_text_date — ошибка', () => {
  assert.throws(
    () => computeEntryIntoForceApk({ appeal_filed: false }),
    /decision_full_text_date/,
  );
});

test('вступление в силу АПК: жалоба подана без подтверждения исхода — ошибка о неподдерживаемом случае', () => {
  const expected = /отменено\/изменено.*не поддерживается|appeal_outcome/;
  // Исход не указан вовсе.
  assert.throws(
    () => computeEntryIntoForceApk({ appeal_filed: true, appellate_ruling_date: '2025-08-20' }),
    expected,
  );
  // Исход указан, но не 'affirmed' — угадывать нельзя.
  for (const outcome of ['reversed', 'modified', 'unknown']) {
    assert.throws(
      () =>
        computeEntryIntoForceApk({
          appeal_filed: true,
          appeal_outcome: outcome,
          appellate_ruling_date: '2025-08-20',
        }),
      expected,
      `исход ${outcome}: должен приводить к ошибке, а не к догадке`,
    );
  }
});

test('вступление в силу АПК: appeal_filed=true, исход affirmed, но без appellate_ruling_date — ошибка', () => {
  assert.throws(
    () => computeEntryIntoForceApk({ appeal_filed: true, appeal_outcome: 'affirmed' }),
    /appellate_ruling_date/,
  );
});

// --- Кассационная жалоба, общий срок (ч. 1 ст. 276 АПК РФ) -------------------

test('кассация АПК: жалоба на решение первой инстанции не подавалась — 2 месяца от вступления в силу', () => {
  // Решение 10.03.2025 -> апелляция (месяц) деадлайн 10.04.2025 (четверг, без
  // переноса) -> вступление в силу 11.04.2025 -> кассация (2 месяца) 11.06.2025.
  const decision = '2025-03-10';
  const appeal = computeAppealGeneralApk({ decision_full_text_date: decision });
  assert.equal(appeal.deadline, '2025-04-10');
  const entry = computeEntryIntoForceApk({ appeal_filed: false, decision_full_text_date: decision });
  assert.equal(entry.date, '2025-04-11');

  const cassation = computeCassationGeneralApk({
    appeal_filed: false,
    decision_full_text_date: decision,
  });
  assert.equal(cassation.anchor, '2025-04-11');
  assert.equal(cassation.raw_deadline, '2025-06-11');
  assert.equal(cassation.deadline, '2025-06-11');
  assert.equal(cassation.shifted, false);
  assert.equal(cassation.norm.primary, 'ч. 1 ст. 276 АПК РФ');
});

test('кассация АПК: жалоба подана и решение оставлено без изменения — 2 месяца от даты постановления апелляции', () => {
  const cassation = computeCassationGeneralApk({
    appeal_filed: true,
    appeal_outcome: 'affirmed',
    appellate_ruling_date: '2025-08-20',
  });
  assert.equal(cassation.anchor, '2025-08-20');
  assert.equal(cassation.raw_deadline, '2025-10-20');
  assert.equal(cassation.deadline, '2025-10-20');
  assert.equal(cassation.shifted, false);
});

test('кассация АПК: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const cassation = computeCassationGeneralApk({
    appeal_filed: true,
    appeal_outcome: 'affirmed',
    appellate_ruling_date: '2025-01-08',
  });
  // 08.01.2025 + 2 месяца = 08.03.2025 (суббота) -> перенос на 10.03.2025 (понедельник).
  assert.equal(cassation.raw_deadline, '2025-03-08');
  assert.equal(cassation.deadline, '2025-03-10');
  assert.equal(cassation.shifted, true);
});

test('кассация АПК: правило "нет такого числа" (ч. 2 ст. 114 АПК РФ) — 31 декабря -> 28 февраля', () => {
  const cassation = computeCassationGeneralApk({
    appeal_filed: true,
    appeal_outcome: 'affirmed',
    appellate_ruling_date: '2024-12-31',
  });
  // В феврале 2025 (невисокосный) нет 31-го числа — срок истекает в последний
  // день месяца.
  assert.equal(cassation.raw_deadline, '2025-02-28');
  assert.equal(cassation.deadline, '2025-02-28');
  assert.equal(cassation.shifted, false);
});

test('кассация АПК: ошибка валидации entry_into_force_apk всплывает наружу, а не проглатывается', () => {
  // appeal_filed отсутствует — это ошибка computeEntryIntoForceApk, а не
  // собственная валидация кассации; проверяем, что делегирование работает.
  assert.throws(
    () => computeCassationGeneralApk({ decision_full_text_date: '2025-03-11' }),
    /appeal_filed/,
  );
  assert.throws(
    () => computeCassationGeneralApk({ appeal_filed: false }),
    /decision_full_text_date/,
  );
  assert.throws(
    () =>
      computeCassationGeneralApk({
        appeal_filed: true,
        appeal_outcome: 'reversed',
        appellate_ruling_date: '2025-08-20',
      }),
    /отменено\/изменено.*не поддерживается|appeal_outcome/,
  );
});

test('кассация АПК: объём задачи 3a — без restoration_norm и без ics', () => {
  assert.equal(CASSATION_GENERAL_APK.restoration_norm, undefined);
  assert.equal(CASSATION_GENERAL_APK.ics, undefined);
});

// --- Восстановление срока кассации (ч. 2 ст. 276 АПК РФ) ---------------------

test('восстановление кассации АПК: участвовавшее лицо, надлежаще извещённое — 6 месяцев со дня ВСТУПЛЕНИЯ В СИЛУ', () => {
  // Якорь — день вступления в силу (через entry_into_force_apk), а не день
  // принятия решения (decision_full_text_date), как в ст. 259.
  const decision = '2025-02-10';
  const entry = computeEntryIntoForceApk({ appeal_filed: false, decision_full_text_date: decision });
  assert.equal(entry.date, '2025-03-11');

  const term = computeCassationGeneralApkRestoration({
    subject_category: 'participating_duly_notified',
    appeal_filed: false,
    decision_full_text_date: decision,
  });
  assert.equal(term.anchor, entry.date);
  assert.equal(term.anchor, '2025-03-11');
  assert.notEqual(term.anchor, decision); // не decision_full_text_date напрямую
  assert.equal(term.raw_deadline, '2025-09-11');
  assert.equal(term.deadline, '2025-09-11');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 6, unit: 'month' });
  assert.equal(term.norm.primary, 'ч. 2 ст. 276 АПК РФ');
});

test('восстановление кассации АПК: лицо по ст. 42 — 6 месяцев со дня, когда узнало о нарушении прав', () => {
  const term = computeCassationGeneralApkRestoration({
    subject_category: 'article_42_person',
    learned_of_violation_date: '2025-06-10',
  });
  assert.equal(term.anchor, '2025-06-10');
  assert.equal(term.raw_deadline, '2025-12-10');
  assert.equal(term.deadline, '2025-12-10');
  assert.equal(term.shifted, false);
});

test('восстановление кассации АПК: ненадлежаще извещённое лицо считается от СВОЕЙ learned_of_violation_date, а не от даты вступления в силу', () => {
  const term = computeCassationGeneralApkRestoration({
    subject_category: 'participating_improperly_notified',
    learned_of_violation_date: '2024-11-12',
  });
  assert.equal(term.anchor, '2024-11-12');
  assert.equal(term.deadline, '2025-05-12');
  assert.notEqual(term.anchor, '2025-03-11'); // не якорь из теста participating_duly_notified
});

test('восстановление кассации АПК: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeCassationGeneralApkRestoration({
    subject_category: 'article_42_person',
    learned_of_violation_date: '2025-01-05',
  });
  // 05.01.2025 + 6 месяцев = 05.07.2025 (суббота) -> перенос на 07.07.2025 (понедельник).
  assert.equal(term.raw_deadline, '2025-07-05');
  assert.equal(term.deadline, '2025-07-07');
  assert.equal(term.shifted, true);
});

test('восстановление кассации АПК: правило "нет такого числа" (ч. 2 ст. 114 АПК РФ) — 31 октября -> 30 апреля', () => {
  const term = computeCassationGeneralApkRestoration({
    subject_category: 'article_42_person',
    learned_of_violation_date: '2025-10-31',
  });
  assert.equal(term.raw_deadline, '2026-04-30');
  assert.equal(term.deadline, '2026-04-30');
  assert.equal(term.shifted, false);
});

test('восстановление кассации АПК: subject_category отсутствует или неизвестна — ошибка со списком допустимых значений', () => {
  const expected =
    /participating_duly_notified.*article_42_person.*participating_improperly_notified/;
  assert.throws(() => computeCassationGeneralApkRestoration({}), expected);
  assert.throws(
    () =>
      computeCassationGeneralApkRestoration({
        subject_category: 'unknown_category',
        learned_of_violation_date: '2025-06-10',
      }),
    expected,
  );
});

test('восстановление кассации АПК: participating_duly_notified без данных для entry_into_force_apk — ошибка всплывает наружу', () => {
  // subject_category валиден, но appeal_filed отсутствует — это ошибка
  // computeEntryIntoForceApk, а не собственная валидация узла восстановления;
  // проверяем, что делегирование работает (по аналогии с задачей 3a).
  assert.throws(
    () => computeCassationGeneralApkRestoration({ subject_category: 'participating_duly_notified' }),
    /appeal_filed/,
  );
  assert.throws(
    () =>
      computeCassationGeneralApkRestoration({
        subject_category: 'participating_duly_notified',
        appeal_filed: false,
      }),
    /decision_full_text_date/,
  );
});

test('восстановление кассации АПК: категории со ст. 42 без learned_of_violation_date — ошибка', () => {
  for (const category of ['article_42_person', 'participating_improperly_notified']) {
    assert.throws(
      () => computeCassationGeneralApkRestoration({ subject_category: category }),
      /learned_of_violation_date/,
      `категория ${category}: должна требовать learned_of_violation_date`,
    );
  }
});

test('восстановление кассации АПК: результат несёт subject_category, совпадающий с переданной', () => {
  const byCategory = {
    participating_duly_notified: { appeal_filed: false, decision_full_text_date: '2025-02-10' },
    article_42_person: { learned_of_violation_date: '2025-06-10' },
    participating_improperly_notified: { learned_of_violation_date: '2024-11-12' },
  };
  for (const [category, dates] of Object.entries(byCategory)) {
    const term = computeCassationGeneralApkRestoration({ subject_category: category, ...dates });
    assert.equal(term.subject_category, category);
    assert.equal(term.id, 'cassation_general_apk_restoration');
  }
});

test('восстановление кассации АПК: объём задачи 3b — без restoration_norm и без ics', () => {
  assert.equal(CASSATION_GENERAL_APK_RESTORATION.restoration_norm, undefined);
  assert.equal(CASSATION_GENERAL_APK_RESTORATION.ics, undefined);
});

// --- Вступление в силу после кассации (ч. 1 ст. 291.2 АПК РФ, якорь) --------

test('вступление в силу после кассации АПК: окружная кассация не подавалась — день, следующий за дедлайном cassation_general_apk', () => {
  const decision = '2025-06-10';
  const cassation = computeCassationGeneralApk({ appeal_filed: false, decision_full_text_date: decision });
  assert.equal(cassation.deadline, '2025-09-11'); // четверг, без переноса

  const entry = computeEntryIntoForceAfterCassationApk({
    cassation_filed: false,
    appeal_filed: false,
    decision_full_text_date: decision,
  });
  assert.equal(entry.date, '2025-09-12'); // пятница
  assert.equal(entry.id, 'entry_into_force_after_cassation_apk');
  assert.equal(entry.based_on, 'cassation_general_apk');
});

test('вступление в силу после кассации АПК: дедлайн кассации сам в пятницу — вступление в СУББОТУ, без переноса на понедельник', () => {
  const decision = '2025-01-10';
  const cassation = computeCassationGeneralApk({ appeal_filed: false, decision_full_text_date: decision });
  assert.equal(cassation.deadline, '2025-04-11'); // пятница
  assert.equal(cassation.shifted, false);

  const entry = computeEntryIntoForceAfterCassationApk({
    cassation_filed: false,
    appeal_filed: false,
    decision_full_text_date: decision,
  });
  assert.equal(entry.date, '2025-04-12'); // суббота — переноса нет
  assert.equal(new Date(`${entry.date}T00:00:00Z`).getUTCDay(), 6, 'должна быть суббота');
  assert.notEqual(entry.date, '2025-04-14'); // не понедельник
});

test('вступление в силу после кассации АПК: считается от ПЕРЕНЕСЁННОГО дедлайна кассации, а не от raw_deadline', () => {
  const decision = '2025-02-10';
  const cassation = computeCassationGeneralApk({ appeal_filed: false, decision_full_text_date: decision });
  assert.equal(cassation.raw_deadline, '2025-05-11'); // воскресенье
  assert.equal(cassation.deadline, '2025-05-12'); // перенесено на понедельник
  assert.equal(cassation.shifted, true);

  const entry = computeEntryIntoForceAfterCassationApk({
    cassation_filed: false,
    appeal_filed: false,
    decision_full_text_date: decision,
  });
  assert.equal(entry.date, '2025-05-13'); // вторник = перенесённый дедлайн + 1
  assert.notEqual(entry.date, '2025-05-12'); // не raw_deadline + 1
});

test('вступление в силу после кассации АПК: окружная кассация подавалась — дата постановления как есть', () => {
  const entry = computeEntryIntoForceAfterCassationApk({
    cassation_filed: true,
    district_cassation_ruling_date: '2025-11-05',
    // Данные для ветки А для этой ветки не используются.
    appeal_filed: false,
    decision_full_text_date: '2025-06-10',
  });
  assert.equal(entry.date, '2025-11-05');
  assert.equal(entry.based_on, 'district_cassation_ruling_date');
  assert.notEqual(entry.date, '2025-09-12'); // не результат ветки «кассация не подавалась»
});

test('вступление в силу после кассации АПК: cassation_filed не передан — ошибка', () => {
  assert.throws(
    () => computeEntryIntoForceAfterCassationApk({ appeal_filed: false, decision_full_text_date: '2025-06-10' }),
    /cassation_filed/,
  );
});

test('вступление в силу после кассации АПК: cassation_filed=false, но не хватает данных для cassation_general_apk — ошибка всплывает от нижестоящего узла', () => {
  // appeal_filed отсутствует — это ошибка entry_into_force_apk (через
  // cassation_general_apk), а не собственная валидация этого узла;
  // проверяем, что делегирование по цепочке работает, а не проглатывается.
  assert.throws(
    () => computeEntryIntoForceAfterCassationApk({ cassation_filed: false }),
    /appeal_filed/,
  );
  assert.throws(
    () => computeEntryIntoForceAfterCassationApk({ cassation_filed: false, appeal_filed: false }),
    /decision_full_text_date/,
  );
});

test('вступление в силу после кассации АПК: cassation_filed=true без district_cassation_ruling_date — ошибка', () => {
  assert.throws(
    () => computeEntryIntoForceAfterCassationApk({ cassation_filed: true }),
    /district_cassation_ruling_date/,
  );
});

// --- Кассационная жалоба в Судебную коллегию ВС РФ, общий срок (ч. 1 ст. 291.2 АПК РФ) ---

test('кассация в СК ВС РФ АПК: окружная кассация не подавалась — 2 месяца от вступления в силу после кассации', () => {
  // Решение 10.06.2025 -> дедлайн кассации 11.09.2025 (четверг, без переноса)
  // -> вступление в силу после кассации 12.09.2025 -> кассация в СК ВС РФ
  // (2 месяца) 12.11.2025.
  const decision = '2025-06-10';
  const cassation = computeCassationGeneralApk({ appeal_filed: false, decision_full_text_date: decision });
  assert.equal(cassation.deadline, '2025-09-11');
  const entry = computeEntryIntoForceAfterCassationApk({
    cassation_filed: false,
    appeal_filed: false,
    decision_full_text_date: decision,
  });
  assert.equal(entry.date, '2025-09-12');

  const cassationVs = computeCassationVsApk({
    cassation_filed: false,
    appeal_filed: false,
    decision_full_text_date: decision,
  });
  assert.equal(cassationVs.anchor, '2025-09-12');
  assert.equal(cassationVs.raw_deadline, '2025-11-12');
  assert.equal(cassationVs.deadline, '2025-11-12');
  assert.equal(cassationVs.shifted, false);
  assert.equal(cassationVs.norm.primary, 'ч. 1 ст. 291.2 АПК РФ');
});

test('кассация в СК ВС РФ АПК: окружная кассация подавалась — 2 месяца от даты постановления окружной кассации', () => {
  const cassationVs = computeCassationVsApk({
    cassation_filed: true,
    district_cassation_ruling_date: '2025-08-20',
  });
  assert.equal(cassationVs.anchor, '2025-08-20');
  assert.equal(cassationVs.raw_deadline, '2025-10-20');
  assert.equal(cassationVs.deadline, '2025-10-20');
  assert.equal(cassationVs.shifted, false);
});

test('кассация в СК ВС РФ АПК: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const cassationVs = computeCassationVsApk({
    cassation_filed: true,
    district_cassation_ruling_date: '2025-01-08',
  });
  // 08.01.2025 + 2 месяца = 08.03.2025 (суббота) -> перенос на 10.03.2025 (понедельник).
  assert.equal(cassationVs.raw_deadline, '2025-03-08');
  assert.equal(cassationVs.deadline, '2025-03-10');
  assert.equal(cassationVs.shifted, true);
});

test('кассация в СК ВС РФ АПК: правило "нет такого числа" (ч. 2 ст. 114 АПК РФ) — 31 декабря -> 28 февраля', () => {
  const cassationVs = computeCassationVsApk({
    cassation_filed: true,
    district_cassation_ruling_date: '2024-12-31',
  });
  assert.equal(cassationVs.raw_deadline, '2025-02-28');
  assert.equal(cassationVs.deadline, '2025-02-28');
  assert.equal(cassationVs.shifted, false);
});

test('кассация в СК ВС РФ АПК: ошибка валидации нижестоящих узлов всплывает наружу (минимум два уровня цепочки)', () => {
  // Уровень 1: cassation_filed отсутствует — ошибка computeEntryIntoForceAfterCassationApk.
  assert.throws(
    () => computeCassationVsApk({ appeal_filed: false, decision_full_text_date: '2025-06-10' }),
    /cassation_filed/,
  );
  // Уровень 2: cassation_filed=false, но appeal_filed отсутствует — ошибка
  // computeEntryIntoForceApk, всплывающая сквозь cassation_general_apk и
  // entry_into_force_after_cassation_apk.
  assert.throws(
    () => computeCassationVsApk({ cassation_filed: false }),
    /appeal_filed/,
  );
  // Уровень 3: appeal_filed=false, но decision_full_text_date отсутствует —
  // ошибка computeAppealGeneralApk, всплывающая сквозь все промежуточные узлы.
  assert.throws(
    () => computeCassationVsApk({ cassation_filed: false, appeal_filed: false }),
    /decision_full_text_date/,
  );
});

test('кассация в СК ВС РФ АПК: объём задачи 4b — без restoration_norm и без ics', () => {
  assert.equal(CASSATION_VS_APK.restoration_norm, undefined);
  assert.equal(CASSATION_VS_APK.ics, undefined);
});

// --- Восстановление срока кассации в Судебную коллегию ВС РФ (ч. 2 ст. 291.2 АПК РФ) ---

test('восстановление кассации в СК ВС РФ АПК: участвовавшее лицо — 6 месяцев со дня вступления в силу после кассации', () => {
  const decision = '2025-06-10';
  const cassation = computeCassationGeneralApk({ appeal_filed: false, decision_full_text_date: decision });
  assert.equal(cassation.deadline, '2025-09-11');
  const entry = computeEntryIntoForceAfterCassationApk({
    cassation_filed: false,
    appeal_filed: false,
    decision_full_text_date: decision,
  });
  assert.equal(entry.date, '2025-09-12');

  const term = computeCassationVsApkRestoration({
    subject_category: 'participating_duly_notified',
    cassation_filed: false,
    appeal_filed: false,
    decision_full_text_date: decision,
  });
  assert.equal(term.anchor, entry.date);
  assert.equal(term.anchor, '2025-09-12');
  assert.equal(term.raw_deadline, '2026-03-12');
  assert.equal(term.deadline, '2026-03-12');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 6, unit: 'month' });
  assert.equal(term.norm.primary, 'ч. 2 ст. 291.2 АПК РФ');
});

test('восстановление кассации в СК ВС РФ АПК: лицо по ст. 42 — 6 месяцев со дня, когда узнало о нарушении прав', () => {
  const term = computeCassationVsApkRestoration({
    subject_category: 'article_42_person',
    learned_of_violation_date: '2025-06-10',
  });
  assert.equal(term.anchor, '2025-06-10');
  assert.equal(term.raw_deadline, '2025-12-10');
  assert.equal(term.deadline, '2025-12-10');
  assert.equal(term.shifted, false);
});

test('восстановление кассации в СК ВС РФ АПК: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeCassationVsApkRestoration({
    subject_category: 'article_42_person',
    learned_of_violation_date: '2025-01-05',
  });
  // 05.01.2025 + 6 месяцев = 05.07.2025 (суббота) -> перенос на 07.07.2025 (понедельник).
  assert.equal(term.raw_deadline, '2025-07-05');
  assert.equal(term.deadline, '2025-07-07');
  assert.equal(term.shifted, true);
});

test('восстановление кассации в СК ВС РФ АПК: правило "нет такого числа" (ч. 2 ст. 114 АПК РФ) — 31 октября -> 30 апреля', () => {
  const term = computeCassationVsApkRestoration({
    subject_category: 'article_42_person',
    learned_of_violation_date: '2025-10-31',
  });
  assert.equal(term.raw_deadline, '2026-04-30');
  assert.equal(term.deadline, '2026-04-30');
  assert.equal(term.shifted, false);
});

test('восстановление кассации в СК ВС РФ АПК: subject_category отсутствует или неизвестна — ошибка со списком ИЗ ДВУХ допустимых значений', () => {
  const expected = /participating_duly_notified.*article_42_person/;
  assert.throws(
    () =>
      computeCassationVsApkRestoration({
        subject_category: 'participating_improperly_notified',
        learned_of_violation_date: '2025-06-10',
      }),
    expected,
  );

  // subject_category отсутствует — тот же список, и явно без третьей категории:
  // текста "participating_improperly_notified" в сообщении быть не должно.
  try {
    computeCassationVsApkRestoration({});
    assert.fail('ожидалась ошибка');
  } catch (err) {
    assert.match(err.message, expected);
    assert.ok(!err.message.includes('participating_improperly_notified'));
  }
});

test('восстановление кассации в СК ВС РФ АПК: participating_duly_notified без данных для entry_into_force_after_cassation_apk — ошибка всплывает наружу (минимум два уровня цепочки)', () => {
  // Уровень 1: cassation_filed отсутствует — ошибка computeEntryIntoForceAfterCassationApk.
  assert.throws(
    () => computeCassationVsApkRestoration({ subject_category: 'participating_duly_notified' }),
    /cassation_filed/,
  );
  // Уровень 2: cassation_filed=false, но appeal_filed отсутствует — ошибка
  // computeEntryIntoForceApk, всплывающая сквозь cassation_general_apk и
  // entry_into_force_after_cassation_apk.
  assert.throws(
    () =>
      computeCassationVsApkRestoration({
        subject_category: 'participating_duly_notified',
        cassation_filed: false,
      }),
    /appeal_filed/,
  );
});

test('восстановление кассации в СК ВС РФ АПК: article_42_person без learned_of_violation_date — ошибка', () => {
  assert.throws(
    () => computeCassationVsApkRestoration({ subject_category: 'article_42_person' }),
    /learned_of_violation_date/,
  );
});

test('восстановление кассации в СК ВС РФ АПК: результат несёт subject_category, совпадающий с переданной', () => {
  const byCategory = {
    participating_duly_notified: { cassation_filed: false, appeal_filed: false, decision_full_text_date: '2025-06-10' },
    article_42_person: { learned_of_violation_date: '2025-06-10' },
  };
  for (const [category, dates] of Object.entries(byCategory)) {
    const term = computeCassationVsApkRestoration({ subject_category: category, ...dates });
    assert.equal(term.subject_category, category);
    assert.equal(term.id, 'cassation_vs_apk_restoration');
  }
});

test('восстановление кассации в СК ВС РФ АПК: объём задачи 4c — без restoration_norm и без ics', () => {
  assert.equal(CASSATION_VS_APK_RESTORATION.restoration_norm, undefined);
  assert.equal(CASSATION_VS_APK_RESTORATION.ics, undefined);
});

// --- Частная жалоба на определение суда первой инстанции (ч. 3 ст. 188 АПК РФ) ---

test('private_complaint_first_instance_apk считается от ruling_issued_date (обычная дата, без переноса)', () => {
  const term = computePrivateComplaintFirstInstanceApk({ ruling_issued_date: '2025-03-11' });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11'); // 11.04.2025 — пятница, рабочий день
  assert.equal(term.shifted, false);
  assert.equal(term.norm.primary, 'ч. 3 ст. 188 АПК РФ');
});

test('private_complaint_first_instance_apk: правило "нет такого числа" (ч. 2 ст. 114 АПК РФ) — 31 января -> последний день февраля', () => {
  const term = computePrivateComplaintFirstInstanceApk({ ruling_issued_date: '2025-01-31' });
  // В феврале 2025 (невисокосный) нет 31-го числа — срок истекает в последний
  // день месяца.
  assert.equal(term.raw_deadline, '2025-02-28');
  assert.equal(term.deadline, '2025-02-28');
  assert.equal(term.shifted, false);
});

test('private_complaint_first_instance_apk: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computePrivateComplaintFirstInstanceApk({ ruling_issued_date: '2025-03-05' });
  // 05.03.2025 + 1 месяц = 05.04.2025 (суббота) -> перенос на 07.04.2025 (понедельник).
  assert.equal(term.raw_deadline, '2025-04-05');
  assert.equal(term.deadline, '2025-04-07');
  assert.equal(term.shifted, true);
});

test('private_complaint_first_instance_apk: без ruling_issued_date — ошибка, упоминающая именно это поле', () => {
  assert.throws(() => computePrivateComplaintFirstInstanceApk({}), /ruling_issued_date/);
  // Явно убеждаемся, что сообщение не про decision_full_text_date — поля разные.
  try {
    computePrivateComplaintFirstInstanceApk({});
    assert.fail('ожидалась ошибка');
  } catch (err) {
    assert.ok(!err.message.includes('decision_full_text_date'));
  }
});

test('private_complaint_first_instance_apk: объём задачи 5a — без restoration_norm и без ics', () => {
  assert.equal(PRIVATE_COMPLAINT_FIRST_INSTANCE_APK.restoration_norm, undefined);
  assert.equal(PRIVATE_COMPLAINT_FIRST_INSTANCE_APK.ics, undefined);
});

// --- Частная жалоба на определение суда апелляционной инстанции (ч. 4 ст. 188 АПК РФ) ---
// Даты те же, что в задаче 5a (ч. 3 ст. 188) — арифметика идентична: та же
// длительность (месяц) и тот же тип якоря (день вынесения определения буквально).

test('private_complaint_appellate_apk считается от ruling_issued_date (обычная дата, без переноса)', () => {
  const term = computePrivateComplaintAppellateApk({ ruling_issued_date: '2025-03-11' });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11'); // 11.04.2025 — пятница, рабочий день
  assert.equal(term.shifted, false);
  assert.equal(term.norm.primary, 'ч. 4 ст. 188 АПК РФ');
});

test('private_complaint_appellate_apk: правило "нет такого числа" (ч. 2 ст. 114 АПК РФ) — 31 января -> последний день февраля', () => {
  const term = computePrivateComplaintAppellateApk({ ruling_issued_date: '2025-01-31' });
  assert.equal(term.raw_deadline, '2025-02-28');
  assert.equal(term.deadline, '2025-02-28');
  assert.equal(term.shifted, false);
});

test('private_complaint_appellate_apk: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computePrivateComplaintAppellateApk({ ruling_issued_date: '2025-03-05' });
  // 05.03.2025 + 1 месяц = 05.04.2025 (суббота) -> перенос на 07.04.2025 (понедельник).
  assert.equal(term.raw_deadline, '2025-04-05');
  assert.equal(term.deadline, '2025-04-07');
  assert.equal(term.shifted, true);
});

test('private_complaint_appellate_apk: без ruling_issued_date — ошибка', () => {
  assert.throws(() => computePrivateComplaintAppellateApk({}), /ruling_issued_date/);
});

test('private_complaint_appellate_apk: объём задачи 5b — без restoration_norm и без ics', () => {
  assert.equal(PRIVATE_COMPLAINT_APPELLATE_APK.restoration_norm, undefined);
  assert.equal(PRIVATE_COMPLAINT_APPELLATE_APK.ics, undefined);
});

// --- Частная жалоба на определение суда кассационной инстанции (ч. 6 ст. 188 АПК РФ) ---
// Даты те же, что в задаче 5a (ч. 3 ст. 188) — арифметика идентична: та же
// длительность (месяц) и тот же тип якоря (день вынесения определения буквально).

test('private_complaint_cassation_apk считается от ruling_issued_date (обычная дата, без переноса)', () => {
  const term = computePrivateComplaintCassationApk({ ruling_issued_date: '2025-03-11' });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11'); // 11.04.2025 — пятница, рабочий день
  assert.equal(term.shifted, false);
  assert.equal(term.norm.primary, 'ч. 6 ст. 188 АПК РФ');
});

test('private_complaint_cassation_apk: правило "нет такого числа" (ч. 2 ст. 114 АПК РФ) — 31 января -> последний день февраля', () => {
  const term = computePrivateComplaintCassationApk({ ruling_issued_date: '2025-01-31' });
  assert.equal(term.raw_deadline, '2025-02-28');
  assert.equal(term.deadline, '2025-02-28');
  assert.equal(term.shifted, false);
});

test('private_complaint_cassation_apk: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computePrivateComplaintCassationApk({ ruling_issued_date: '2025-03-05' });
  // 05.03.2025 + 1 месяц = 05.04.2025 (суббота) -> перенос на 07.04.2025 (понедельник).
  assert.equal(term.raw_deadline, '2025-04-05');
  assert.equal(term.deadline, '2025-04-07');
  assert.equal(term.shifted, true);
});

test('private_complaint_cassation_apk: без ruling_issued_date — ошибка', () => {
  assert.throws(() => computePrivateComplaintCassationApk({}), /ruling_issued_date/);
});

test('private_complaint_cassation_apk: объём задачи 5b — без restoration_norm и без ics', () => {
  assert.equal(PRIVATE_COMPLAINT_CASSATION_APK.restoration_norm, undefined);
  assert.equal(PRIVATE_COMPLAINT_CASSATION_APK.ics, undefined);
});

// --- Жалоба на постановление апелляции по жалобе на определение (ч. 5 ст. 188 АПК РФ) ---
// Даты те же, что в задаче 5a (ч. 3 ст. 188) — арифметика идентична: та же
// длительность (месяц) и тот же тип якоря (дата события буквально, без
// переноса на более позднюю дату изготовления).

test('private_complaint_appellate_postanovlenie_apk считается от appellate_postanovlenie_date (обычная дата, без переноса)', () => {
  const term = computePrivateComplaintAppellatePostanovlenieApk({
    appellate_postanovlenie_date: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-04-11');
  assert.equal(term.deadline, '2025-04-11'); // 11.04.2025 — пятница, рабочий день
  assert.equal(term.shifted, false);
  assert.equal(term.norm.primary, 'ч. 5 ст. 188 АПК РФ');
});

test('private_complaint_appellate_postanovlenie_apk: правило "нет такого числа" (ч. 2 ст. 114 АПК РФ) — 31 января -> последний день февраля', () => {
  const term = computePrivateComplaintAppellatePostanovlenieApk({
    appellate_postanovlenie_date: '2025-01-31',
  });
  assert.equal(term.raw_deadline, '2025-02-28');
  assert.equal(term.deadline, '2025-02-28');
  assert.equal(term.shifted, false);
});

test('private_complaint_appellate_postanovlenie_apk: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computePrivateComplaintAppellatePostanovlenieApk({
    appellate_postanovlenie_date: '2025-03-05',
  });
  // 05.03.2025 + 1 месяц = 05.04.2025 (суббота) -> перенос на 07.04.2025 (понедельник).
  assert.equal(term.raw_deadline, '2025-04-05');
  assert.equal(term.deadline, '2025-04-07');
  assert.equal(term.shifted, true);
});

test('private_complaint_appellate_postanovlenie_apk: без appellate_postanovlenie_date — ошибка, упоминающая именно это поле', () => {
  assert.throws(
    () => computePrivateComplaintAppellatePostanovlenieApk({}),
    /appellate_postanovlenie_date/,
  );
  // Явно убеждаемся, что сообщение не про ruling_issued_date и не про
  // appellate_ruling_date — это разные по смыслу факты, поля не перепутаны.
  try {
    computePrivateComplaintAppellatePostanovlenieApk({});
    assert.fail('ожидалась ошибка');
  } catch (err) {
    assert.ok(!err.message.includes('ruling_issued_date'));
    assert.ok(!err.message.includes('appellate_ruling_date'));
  }
});

test('private_complaint_appellate_postanovlenie_apk: объём задачи 5c — без restoration_norm и без ics', () => {
  assert.equal(PRIVATE_COMPLAINT_APPELLATE_POSTANOVLENIE_APK.restoration_norm, undefined);
  assert.equal(PRIVATE_COMPLAINT_APPELLATE_POSTANOVLENIE_APK.ics, undefined);
});

// --- Предъявление исполнительного листа к исполнению, базовый срок и перерыв (ч. 1, 3, 4 ст. 321 АПК РФ) ---
// Базовые даты подобраны так, чтобы 3-летний срок не требовал переноса через
// нерабочий день — перенос проверяется отдельным кейсом, чтобы не смешивать
// выбор якоря с арифметикой переноса.

test('исполнительный лист АПК: case_type=entry_into_force — 3 года со дня вступления в силу', () => {
  const term = computeEnforcementPresentationApk({
    case_type: 'entry_into_force',
    entry_into_force_date: '2022-06-18',
  });
  assert.equal(term.anchor, '2022-06-18');
  assert.equal(term.raw_deadline, '2025-06-18');
  assert.equal(term.deadline, '2025-06-18');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 3, unit: 'year' });
  assert.equal(term.interruptible, true);
  assert.equal(term.norm.primary, 'ч. 1 ст. 321 АПК РФ');
  // Без событий перерыва история не заводится (см. withInterruptions в ядре).
  assert.equal(term.interruptions, undefined);
  assert.equal(term.base_anchor, undefined);
});

test('исполнительный лист АПК: case_type=immediate_execution — 3 года от даты акта, без двойного сдвига', () => {
  const term = computeEnforcementPresentationApk({
    case_type: 'immediate_execution',
    immediate_execution_decision_date: '2022-11-20',
  });
  // «Со следующего дня после дня принятия» — это общее правило ч. 4 ст. 113,
  // уже заложенное в offset_start: 1, а не дополнительный сдвиг сверх него:
  // якорь равен самой дате акта, а не дате+1.
  assert.equal(term.anchor, '2022-11-20');
  assert.equal(term.raw_deadline, '2025-11-20');
  assert.equal(term.deadline, '2025-11-20');
  assert.equal(term.shifted, false);
  assert.equal(term.offset_start, 1);
});

test('исполнительный лист АПК: case_type=deferred_installment_end — 3 года со дня окончания отсрочки', () => {
  const term = computeEnforcementPresentationApk({
    case_type: 'deferred_installment_end',
    deferred_installment_end_date: '2023-05-06',
  });
  assert.equal(term.anchor, '2023-05-06');
  assert.equal(term.raw_deadline, '2026-05-06');
  assert.equal(term.deadline, '2026-05-06');
  assert.equal(term.shifted, false);
});

test('исполнительный лист АПК: три ветки case_type берут каждая свою дату, не путая поля', () => {
  // Все три поля заполнены одновременно и различны — выбор якоря определяется
  // только case_type.
  const dates = {
    entry_into_force_date: '2022-06-18',
    immediate_execution_decision_date: '2022-11-20',
    deferred_installment_end_date: '2023-05-06',
  };
  assert.equal(
    computeEnforcementPresentationApk({ case_type: 'entry_into_force', ...dates }).anchor,
    '2022-06-18',
  );
  assert.equal(
    computeEnforcementPresentationApk({ case_type: 'immediate_execution', ...dates }).anchor,
    '2022-11-20',
  );
  assert.equal(
    computeEnforcementPresentationApk({ case_type: 'deferred_installment_end', ...dates }).anchor,
    '2023-05-06',
  );
});

test('исполнительный лист АПК: перерыв предъявлением к исполнению (ч. 3 ст. 321) — новый срок от даты события', () => {
  const term = computeEnforcementPresentationApk({
    case_type: 'entry_into_force',
    entry_into_force_date: '2022-06-18',
    enforcement_interruptions: [{ type: 'presentment', date: '2023-09-14' }],
  });
  assert.equal(term.anchor, '2023-09-14'); // якорь сдвинут на событие
  assert.equal(term.raw_deadline, '2026-09-14');
  assert.equal(term.deadline, '2026-09-14');
  assert.equal(term.shifted, false);
  // Базовый якорь сохранён для истории на карточке.
  assert.equal(term.base_anchor, '2022-06-18');
  assert.equal(term.interruptions.length, 1);
  assert.equal(term.interruptions[0].ignored, undefined);
  assert.equal(term.interruption_norm, 'ч. 3, 4 ст. 321 АПК РФ');
});

test('исполнительный лист АПК: перерыв частичным исполнением (ч. 3 ст. 321)', () => {
  const term = computeEnforcementPresentationApk({
    case_type: 'entry_into_force',
    entry_into_force_date: '2022-06-18',
    enforcement_interruptions: [{ type: 'partial_execution', date: '2024-02-20' }],
  });
  assert.equal(term.anchor, '2024-02-20');
  assert.equal(term.raw_deadline, '2027-02-20');
  assert.equal(term.deadline, '2027-02-20');
  assert.equal(term.base_anchor, '2022-06-18');
  assert.equal(term.interruptions[0].ignored, undefined);
});

test('исполнительный лист АПК: возврат листа (ч. 4 ст. 321) — валидное основание, новый срок со дня ВОЗВРАЩЕНИЯ', () => {
  const term = computeEnforcementPresentationApk({
    case_type: 'entry_into_force',
    entry_into_force_date: '2022-06-18',
    enforcement_interruptions: [{ type: 'returned_no_assets', date: '2024-07-15' }],
  });
  // Основание принято, а не отклонено как неизвестное.
  assert.equal(term.interruptions.length, 1);
  assert.equal(term.interruptions[0].ignored, undefined);
  assert.equal(term.interruptions[0].type, 'returned_no_assets');
  // Новый срок считается от даты возвращения листа (ч. 4 ст. 321 АПК РФ),
  // а не от даты направления постановления, как в ч. 3 ст. 22 ФЗ № 229-ФЗ.
  assert.equal(term.anchor, '2024-07-15');
  assert.equal(term.deadline, '2027-07-15');
  assert.match(term.logic, /со дня возвращения/);
  assert.match(term.logic, /а не со дня направления постановления/);
});

test('исполнительный лист АПК: несколько событий — учитывается последнее по хронологии, сроки не складываются', () => {
  const term = computeEnforcementPresentationApk({
    case_type: 'entry_into_force',
    entry_into_force_date: '2022-06-18',
    // Во вводе намеренно не по порядку: последнее по дате идёт первым.
    enforcement_interruptions: [
      { type: 'presentment', date: '2024-07-15' },
      { type: 'partial_execution', date: '2023-09-14' },
      { type: 'returned_no_assets', date: '2024-02-20' },
    ],
  });
  // Якорь — самое позднее событие, а не первое во вводе и не самое раннее.
  assert.equal(term.anchor, '2024-07-15');
  assert.equal(term.deadline, '2027-07-15');
  // Перезапуск, а не накопление: ровно три года от последнего события,
  // а не 3 × 3 года и не сумма интервалов.
  assert.notEqual(term.deadline, '2033-07-15');
  // История отсортирована по дате по возрастанию.
  assert.deepEqual(
    term.interruptions.map((e) => e.date),
    ['2023-09-14', '2024-02-20', '2024-07-15'],
  );
});

test('исполнительный лист АПК: событие раньше базового якоря игнорируется и видно в истории', () => {
  const term = computeEnforcementPresentationApk({
    case_type: 'entry_into_force',
    entry_into_force_date: '2022-06-18',
    enforcement_interruptions: [{ type: 'presentment', date: '2021-01-15' }],
  });
  // Дедлайн не сдвинут — прерывать ещё не начавшийся срок нечем.
  assert.equal(term.anchor, '2022-06-18');
  assert.equal(term.deadline, '2025-06-18');
  // Но событие не выброшено молча.
  assert.equal(term.interruptions.length, 1);
  assert.equal(term.interruptions[0].ignored, true);
  assert.equal(term.interruptions[0].ignored_reason, 'before_anchor');
});

test('исполнительный лист АПК: перенос через нерабочий день для 3-летнего срока (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeEnforcementPresentationApk({
    case_type: 'entry_into_force',
    entry_into_force_date: '2023-01-11',
  });
  // 11.01.2023 + 3 года = 11.01.2026 (воскресенье) -> перенос на 12.01.2026.
  assert.equal(term.raw_deadline, '2026-01-11');
  assert.equal(term.deadline, '2026-01-12');
  assert.equal(term.shifted, true);
});

test('исполнительный лист АПК: case_type отсутствует или неизвестен — ошибка со списком допустимых значений', () => {
  const expected = /entry_into_force.*immediate_execution.*deferred_installment_end/;
  assert.throws(
    () => computeEnforcementPresentationApk({ entry_into_force_date: '2022-06-18' }),
    expected,
  );
  assert.throws(
    () =>
      computeEnforcementPresentationApk({
        case_type: 'unknown_case',
        entry_into_force_date: '2022-06-18',
      }),
    expected,
  );
});

test('исполнительный лист АПК: для каждой ветки — своя ошибка о недостающем поле', () => {
  assert.throws(
    () => computeEnforcementPresentationApk({ case_type: 'entry_into_force' }),
    /entry_into_force_date/,
  );
  assert.throws(
    () => computeEnforcementPresentationApk({ case_type: 'immediate_execution' }),
    /immediate_execution_decision_date/,
  );
  assert.throws(
    () => computeEnforcementPresentationApk({ case_type: 'deferred_installment_end' }),
    /deferred_installment_end_date/,
  );
  // Дата соседней ветки не подходит: ошибка называет именно нужное поле.
  assert.throws(
    () =>
      computeEnforcementPresentationApk({
        case_type: 'immediate_execution',
        entry_into_force_date: '2022-06-18',
      }),
    /immediate_execution_decision_date/,
  );
});

test('исполнительный лист АПК: объём задачи 6b — без restoration_norm и без ics', () => {
  assert.equal(ENFORCEMENT_PRESENTATION_APK.restoration_norm, undefined);
  assert.equal(ENFORCEMENT_PRESENTATION_APK.ics, undefined);
});

// Задача 6c — исключение периода из срока предъявления (ч. 2, 5 ст. 321 АПК РФ).
// Базовый случай для всех сценариев ниже: вступление в силу 18.06.2022 →
// дедлайн 18.06.2025 (проверено тестами задачи 6b).
const ENFORCEMENT_BASE_APK = {
  case_type: 'entry_into_force',
  entry_into_force_date: '2022-06-18',
};

test('исполнительный лист АПК: приостановление исполнения (ч. 2 ст. 321) — дедлайн отодвинут на длину периода', () => {
  const term = computeEnforcementPresentationApk({
    ...ENFORCEMENT_BASE_APK,
    // 01.03.2023 → 10.05.2023 = 70 календарных дней (end − start, без +1).
    suspension_periods: [{ start: '2023-03-01', end: '2023-05-10' }],
  });
  assert.equal(term.pre_exclusion_deadline, '2025-06-18');
  assert.equal(term.excluded_days, 70);
  assert.equal(term.deadline, '2025-08-27');
  // Срок не перезапущен: якорь остался прежним, сдвинут только дедлайн.
  assert.equal(term.anchor, '2022-06-18');
  assert.equal(term.excluded_periods.length, 1);
  assert.equal(term.excluded_periods[0].type, 'suspension_apk');
  assert.equal(term.excluded_periods[0].days, 70);
  // Сработала только ч. 2 — ч. 5 в обосновании не цитируется.
  assert.equal(term.exclusion_norm, 'ч. 2 ст. 321 АПК РФ');
  assert.match(term.exclusion_logic, /приостанавливалось/);
  assert.doesNotMatch(term.exclusion_logic, /ч\. 5 ст\. 321/);
});

test('исполнительный лист АПК: отзыв листа взыскателем (ч. 5 ст. 321) — период вычитается из срока', () => {
  const term = computeEnforcementPresentationApk({
    ...ENFORCEMENT_BASE_APK,
    // 01.06.2023 → 15.08.2023 = 75 дней.
    execution_ended_periods: [
      { type: 'withdrawal_by_claimant_apk', start: '2023-06-01', end: '2023-08-15' },
    ],
  });
  assert.equal(term.excluded_days, 75);
  assert.equal(term.deadline, '2025-09-01');
  assert.equal(term.excluded_periods[0].type, 'withdrawal_by_claimant_apk');
  // Сработала только ч. 5 — ч. 2 в обосновании не цитируется.
  assert.equal(term.exclusion_norm, 'ч. 5 ст. 321 АПК РФ');
  assert.doesNotMatch(term.exclusion_logic, /ч\. 2 ст\. 321/);
});

test('исполнительный лист АПК: действия взыскателя, препятствующие исполнению (ч. 5 ст. 321) — то же основание вычета, другой тип', () => {
  const term = computeEnforcementPresentationApk({
    ...ENFORCEMENT_BASE_APK,
    execution_ended_periods: [
      { type: 'claimant_obstruction_apk', start: '2023-06-01', end: '2023-08-15' },
    ],
  });
  // Арифметика та же, что у отзыва листа: различается только тип в истории.
  assert.equal(term.excluded_days, 75);
  assert.equal(term.deadline, '2025-09-01');
  assert.equal(term.excluded_periods[0].type, 'claimant_obstruction_apk');
  assert.equal(term.exclusion_norm, 'ч. 5 ст. 321 АПК РФ');
});

test('исполнительный лист АПК: период по ч. 2 и период по ч. 5 суммируются, а не заменяют друг друга', () => {
  const term = computeEnforcementPresentationApk({
    ...ENFORCEMENT_BASE_APK,
    suspension_periods: [{ start: '2023-03-01', end: '2023-05-10' }], // 70 дней
    execution_ended_periods: [
      { type: 'withdrawal_by_claimant_apk', start: '2023-06-01', end: '2023-08-15' }, // 75 дней
    ],
  });
  // 70 + 75 = 145 — сумма, а не длина последнего периода (обратное правило по
  // сравнению с перерывом, где из нескольких событий берётся только последнее).
  assert.equal(term.excluded_days, 145);
  assert.equal(term.deadline, '2025-11-10');
  assert.notEqual(term.deadline, '2025-09-01');
  assert.equal(term.excluded_periods.length, 2);
  // Сработали обе части — цитируются обе.
  assert.equal(term.exclusion_norm, 'ч. 2, 5 ст. 321 АПК РФ');
  assert.match(term.exclusion_logic, /приостанавливалось/);
  assert.match(term.exclusion_logic, /отзывом листа взыскателем/);
});

test('исполнительный лист АПК: два приостановления в разное время — тоже суммируются', () => {
  const term = computeEnforcementPresentationApk({
    ...ENFORCEMENT_BASE_APK,
    // Во вводе намеренно не по порядку: более поздний период идёт первым.
    suspension_periods: [
      { start: '2024-01-10', end: '2024-02-09' }, // 30 дней
      { start: '2023-03-01', end: '2023-05-10' }, // 70 дней
    ],
  });
  assert.equal(term.excluded_days, 100);
  assert.equal(term.deadline, '2025-09-26');
  // История отсортирована по дате начала по возрастанию.
  assert.deepEqual(
    term.excluded_periods.map((p) => p.start),
    ['2023-03-01', '2024-01-10'],
  );
});

test('исполнительный лист АПК: основание окончания исполнения вне ч. 5 не вычитается из срока', () => {
  const notInPartFive = {
    type: 'actual_execution', // фактическое исполнение — ч. 5 такого основания не называет
    start: '2024-01-10',
    end: '2024-02-09',
  };
  const alone = computeEnforcementPresentationApk({
    ...ENFORCEMENT_BASE_APK,
    execution_ended_periods: [notInPartFive],
  });
  // Дедлайн как без периодов вовсе, полей исключения в результате не появилось.
  assert.equal(alone.deadline, '2025-06-18');
  assert.equal(alone.excluded_days, undefined);
  assert.equal(alone.pre_exclusion_deadline, undefined);

  // Рядом с принятым периодом видно, что запись не выброшена молча.
  const withValid = computeEnforcementPresentationApk({
    ...ENFORCEMENT_BASE_APK,
    suspension_periods: [{ start: '2023-03-01', end: '2023-05-10' }],
    execution_ended_periods: [notInPartFive],
  });
  assert.equal(withValid.excluded_days, 70); // прибавлен только валидный период
  const ignored = withValid.excluded_periods.find((p) => p.ignored);
  assert.equal(ignored.ignored_reason, 'unknown_type');
  assert.equal(ignored.type, 'actual_execution');
  assert.equal(ignored.days, null);
});

test('исполнительный лист АПК: период без даты начала или конца игнорируется и виден в истории', () => {
  const noEnd = computeEnforcementPresentationApk({
    ...ENFORCEMENT_BASE_APK,
    suspension_periods: [
      { start: '2023-03-01' },
      { start: '2024-01-10', end: '2024-02-09' }, // 30 дней
    ],
  });
  assert.equal(noEnd.excluded_days, 30);
  assert.equal(noEnd.deadline, '2025-07-18');
  assert.equal(noEnd.excluded_periods.find((p) => p.ignored).ignored_reason, 'no_end_date');

  const noStart = computeEnforcementPresentationApk({
    ...ENFORCEMENT_BASE_APK,
    suspension_periods: [{ end: '2023-05-10' }, { start: '2024-01-10', end: '2024-02-09' }],
  });
  assert.equal(noStart.excluded_days, 30);
  assert.equal(noStart.excluded_periods.find((p) => p.ignored).ignored_reason, 'no_start_date');
});

test('исполнительный лист АПК: период с концом раньше начала игнорируется', () => {
  const term = computeEnforcementPresentationApk({
    ...ENFORCEMENT_BASE_APK,
    suspension_periods: [
      { start: '2023-05-10', end: '2023-03-01' },
      { start: '2024-01-10', end: '2024-02-09' }, // 30 дней
    ],
  });
  assert.equal(term.excluded_days, 30);
  assert.equal(term.deadline, '2025-07-18');
  const ignored = term.excluded_periods.find((p) => p.ignored);
  assert.equal(ignored.ignored_reason, 'end_before_start');
  assert.equal(ignored.days, null);
});

test('исполнительный лист АПК: период, выходящий за пределы посчитанного дедлайна, учитывается целиком', () => {
  const term = computeEnforcementPresentationApk({
    ...ENFORCEMENT_BASE_APK,
    // Период начинается до дедлайна 18.06.2025 и кончается после него.
    suspension_periods: [{ start: '2025-05-01', end: '2025-08-01' }],
  });
  // Вычитается вся длина периода (92 дня), без урезания по дате дедлайна.
  assert.equal(term.excluded_days, 92);
  assert.equal(term.deadline, '2025-09-18');
});

test('исполнительный лист АПК: пересечение исключаемых периодов останавливает расчёт', () => {
  const overlapping = /пересекаются/;
  // Пересечение между ч. 2 и ч. 5 — проверяется по объединённому списку.
  assert.throws(
    () =>
      computeEnforcementPresentationApk({
        ...ENFORCEMENT_BASE_APK,
        suspension_periods: [{ start: '2023-03-01', end: '2023-05-10' }],
        execution_ended_periods: [
          { type: 'withdrawal_by_claimant_apk', start: '2023-05-09', end: '2023-08-15' },
        ],
      }),
    overlapping,
  );
  // Пересечение внутри одного списка — так же.
  assert.throws(
    () =>
      computeEnforcementPresentationApk({
        ...ENFORCEMENT_BASE_APK,
        suspension_periods: [
          { start: '2023-03-01', end: '2023-05-10' },
          { start: '2023-04-01', end: '2023-04-20' },
        ],
      }),
    overlapping,
  );
  // Стык встык пересечением не считается: день окончания периода уже снова
  // считается днём течения срока, поэтому он же может быть днём начала
  // следующего периода — 70 + 97 дней складываются без двойного счёта.
  const touching = computeEnforcementPresentationApk({
    ...ENFORCEMENT_BASE_APK,
    suspension_periods: [{ start: '2023-03-01', end: '2023-05-10' }],
    execution_ended_periods: [
      { type: 'withdrawal_by_claimant_apk', start: '2023-05-10', end: '2023-08-15' },
    ],
  });
  assert.equal(touching.excluded_days, 167);
});

test('исполнительный лист АПК: перерыв (ч. 3, 4) применяется первым, исключение периода — поверх нового дедлайна', () => {
  const term = computeEnforcementPresentationApk({
    ...ENFORCEMENT_BASE_APK,
    enforcement_interruptions: [{ type: 'presentment', date: '2024-07-15' }],
    suspension_periods: [{ start: '2023-03-01', end: '2023-05-10' }], // 70 дней
  });
  // Сначала перерыв: якорь — дата события, дедлайн 15.07.2027.
  assert.equal(term.base_anchor, '2022-06-18');
  assert.equal(term.anchor, '2024-07-15');
  assert.equal(term.pre_exclusion_deadline, '2027-07-15');
  // Затем 70 дней прибавляются к дедлайну, посчитанному уже с учётом перерыва,
  // а не к базовому дедлайну 18.06.2025 (тогда было бы 27.08.2025).
  assert.equal(term.deadline, '2027-09-23');
  assert.notEqual(term.deadline, '2025-08-27');
  // Обе истории сохраняются рядом: события перерыва и исключённые периоды.
  assert.equal(term.interruptions.length, 1);
  assert.equal(term.excluded_periods.length, 1);
});

test('исполнительный лист АПК: перенос через нерабочий день выполняется повторно, уже после добавления периода', () => {
  const term = computeEnforcementPresentationApk({
    ...ENFORCEMENT_BASE_APK,
    // 18.06.2025 (среда, рабочий) + 3 дня = 21.06.2025 — суббота.
    suspension_periods: [{ start: '2023-03-01', end: '2023-03-04' }],
  });
  assert.equal(term.pre_exclusion_deadline, '2025-06-18');
  assert.equal(term.raw_deadline, '2025-06-21');
  assert.equal(term.deadline, '2025-06-23'); // понедельник
  assert.equal(term.shifted, true);
});

test('исполнительный лист АПК: без исключаемых периодов результат прежний, новых полей нет', () => {
  const term = computeEnforcementPresentationApk({
    ...ENFORCEMENT_BASE_APK,
    suspension_periods: [],
    execution_ended_periods: [],
  });
  assert.equal(term.deadline, '2025-06-18');
  assert.equal(term.excluded_periods, undefined);
  assert.equal(term.excluded_days, undefined);
  assert.equal(term.pre_exclusion_deadline, undefined);
  assert.equal(term.exclusion_norm, undefined);
  assert.equal(term.exclusion_logic, undefined);
});

test('исполнительный лист АПК: null/undefined вместо списков периодов трактуются как пустой список', () => {
  const term = computeEnforcementPresentationApk({
    ...ENFORCEMENT_BASE_APK,
    suspension_periods: null,
    execution_ended_periods: undefined,
  });
  assert.equal(term.deadline, '2025-06-18');
  assert.equal(term.excluded_days, undefined);
});

test('исполнительный лист АПК: каталог оснований ч. 5 — ровно два основания, оба со ссылкой на ч. 5', () => {
  assert.deepEqual(
    ENFORCEMENT_EXCLUSION_TYPES_APK.map((t) => t.id),
    ['withdrawal_by_claimant_apk', 'claimant_obstruction_apk'],
  );
  for (const type of ENFORCEMENT_EXCLUSION_TYPES_APK) {
    assert.equal(type.norm, 'ч. 5 ст. 321 АПК РФ');
  }
});

// Задача 6d — срок предъявления исполнительного листа после восстановления
// пропущенного срока (п. 2 ч. 1 ст. 321 АПК РФ).

test('исполнительный лист после восстановления АПК: три месяца со дня определения, будний день без переноса', () => {
  const term = computeEnforcementPresentationAfterRestorationApk({
    restoration_ruling_date: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-06-11');
  assert.equal(term.deadline, '2025-06-11'); // среда, рабочий день
  assert.equal(term.shifted, false);
});

test('исполнительный лист после восстановления АПК: перенос через нерабочий день', () => {
  const term = computeEnforcementPresentationAfterRestorationApk({
    restoration_ruling_date: '2026-06-05',
  });
  // 05.06.2026 + 3 месяца = 05.09.2026 — суббота, перенос на 07.09.2026
  // (понедельник); проверено по производственному календарю (isNonWorkingDay),
  // а не только по дню недели.
  assert.equal(term.raw_deadline, '2026-09-05');
  assert.equal(term.deadline, '2026-09-07');
  assert.equal(term.shifted, true);
});

test('исполнительный лист после восстановления АПК: отсутствие restoration_ruling_date — понятная ошибка', () => {
  assert.throws(
    () => computeEnforcementPresentationAfterRestorationApk({}),
    /restoration_ruling_date/,
  );
});

test('исполнительный лист после восстановления АПК: объём задачи 6d — без restoration_norm и без перерыва/исключения', () => {
  assert.equal(ENFORCEMENT_PRESENTATION_AFTER_RESTORATION_APK.restoration_norm, undefined);
  assert.equal(ENFORCEMENT_PRESENTATION_AFTER_RESTORATION_APK.interruptible, false);
  const term = computeEnforcementPresentationAfterRestorationApk({
    restoration_ruling_date: '2025-03-11',
  });
  assert.equal(term.interruptions, undefined);
  assert.equal(term.excluded_periods, undefined);
  assert.equal(term.excluded_days, undefined);
  assert.equal(term.base_anchor, undefined);
  assert.equal(term.pre_exclusion_deadline, undefined);
});

// Задача НАДЗОР.1 — надзорное обжалование (ч. 4, 5 ст. 308.1 АПК РФ).

test('надзор АПК: три месяца со дня вступления в силу последнего оспариваемого акта, будний день без переноса', () => {
  const term = computeNadzorGeneralApk({
    last_contested_act_entry_into_force_date: '2025-03-11',
  });
  assert.equal(term.anchor, '2025-03-11');
  assert.equal(term.raw_deadline, '2025-06-11');
  assert.equal(term.deadline, '2025-06-11'); // среда, рабочий день
  assert.equal(term.shifted, false);
  assert.equal(term.norm.primary, 'ч. 4 ст. 308.1 АПК РФ');
});

test('надзор АПК: перенос через нерабочий день (ч. 4 ст. 114 АПК РФ)', () => {
  const term = computeNadzorGeneralApk({
    last_contested_act_entry_into_force_date: '2025-01-05',
  });
  // 05.01.2025 + 3 месяца = 05.04.2025 — суббота, перенос на 07.04.2025 (понедельник).
  assert.equal(term.raw_deadline, '2025-04-05');
  assert.equal(term.deadline, '2025-04-07');
  assert.equal(term.shifted, true);
});

test('надзор АПК: отсутствие last_contested_act_entry_into_force_date — понятная ошибка', () => {
  assert.throws(
    () => computeNadzorGeneralApk({}),
    /last_contested_act_entry_into_force_date/,
  );
});

test('восстановление надзора АПК: участвовавшее лицо — 6 месяцев со дня вступления в силу оспариваемого акта', () => {
  const term = computeNadzorGeneralApkRestoration({
    subject_category: 'participating_duly_notified',
    last_contested_act_entry_into_force_date: '2025-06-10',
  });
  assert.equal(term.anchor, '2025-06-10');
  assert.equal(term.raw_deadline, '2025-12-10');
  assert.equal(term.deadline, '2025-12-10');
  assert.equal(term.shifted, false);
  assert.deepEqual(term.duration, { value: 6, unit: 'month' });
  assert.equal(term.norm.primary, 'ч. 5 ст. 308.1 АПК РФ');
  assert.equal(term.subject_category, 'participating_duly_notified');
});

test('восстановление надзора АПК: обе категории берут каждая свою дату, не путая поля', () => {
  // Оба поля переданы одновременно — participating_duly_notified должна
  // считать от last_contested_act_entry_into_force_date, article_42_person —
  // от learned_of_violation_date, а не от чужого поля и не от первого попавшегося.
  const inputs = {
    last_contested_act_entry_into_force_date: '2025-06-10',
    learned_of_violation_date: '2025-01-05',
  };

  const duly = computeNadzorGeneralApkRestoration({
    subject_category: 'participating_duly_notified',
    ...inputs,
  });
  assert.equal(duly.anchor, '2025-06-10');
  assert.equal(duly.deadline, '2025-12-10');

  const article42 = computeNadzorGeneralApkRestoration({
    subject_category: 'article_42_person',
    ...inputs,
  });
  // 05.01.2025 + 6 месяцев = 05.07.2025 — суббота, перенос на 07.07.2025.
  assert.equal(article42.anchor, '2025-01-05');
  assert.equal(article42.raw_deadline, '2025-07-05');
  assert.equal(article42.deadline, '2025-07-07');

  assert.notEqual(duly.deadline, article42.deadline);
});

test('восстановление надзора АПК: лицо по ст. 42 без learned_of_violation_date — ошибка', () => {
  assert.throws(
    () => computeNadzorGeneralApkRestoration({ subject_category: 'article_42_person' }),
    /learned_of_violation_date/,
  );
});

test('восстановление надзора АПК: participating_duly_notified без last_contested_act_entry_into_force_date — ошибка', () => {
  assert.throws(
    () =>
      computeNadzorGeneralApkRestoration({ subject_category: 'participating_duly_notified' }),
    /last_contested_act_entry_into_force_date/,
  );
});

test('восстановление надзора АПК: subject_category отсутствует или неизвестна — ошибка со списком ИЗ ДВУХ допустимых значений', () => {
  const expected = /participating_duly_notified.*article_42_person/;
  assert.throws(
    () =>
      computeNadzorGeneralApkRestoration({
        subject_category: 'participating_improperly_notified',
        learned_of_violation_date: '2025-06-10',
      }),
    expected,
  );

  try {
    computeNadzorGeneralApkRestoration({});
    assert.fail('ожидалась ошибка');
  } catch (err) {
    assert.match(err.message, expected);
    // Третьей категории здесь нет вовсе — в отличие от ст. 259/276.
    assert.ok(!err.message.includes('participating_improperly_notified'));
  }
});

test('восстановление надзора АПК: объём задачи — только две категории, третьей нет', () => {
  // Фиксирует границу: третья категория (ненадлежащее извещение) не должна
  // появиться в этом узле по инерции с паттерном ст. 259/276 (три категории).
  const term = computeNadzorGeneralApkRestoration({
    subject_category: 'participating_duly_notified',
    last_contested_act_entry_into_force_date: '2025-06-10',
  });
  assert.equal(term.id, 'nadzor_general_apk_restoration');
  assert.equal(NADZOR_GENERAL_APK.restoration_norm, undefined);
  assert.equal(NADZOR_GENERAL_APK_RESTORATION.restoration_norm, undefined);
});
