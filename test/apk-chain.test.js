// Тесты узлов модуля АПК: ст. 259 ч. 1 — общий месячный срок (задача 1b),
// ст. 259 ч. 2 — предельный срок ходатайства о восстановлении (задача 1c),
// ст. 180 ч. 1 — вступление решения в законную силу (задача 2a).

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeAppealGeneralApk,
  APPEAL_GENERAL_APK,
  computeAppealGeneralApkRestoration,
  APPEAL_GENERAL_APK_RESTORATION,
  computeEntryIntoForceApk,
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
