// Тесты домена банкротства (apk/bankruptcy.js) — задача БАНКРОТСТВО.1.
//
// Отдельный файл от test/apk-chain.test.js: домен банкротства — отдельный
// правовой институт (ФЗ № 127-ФЗ), не часть процессуальной цепочки АПК, см.
// комментарий в шапке apk/bankruptcy.js.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeDebtorResponseBankruptcyApk,
  DEBTOR_RESPONSE_BANKRUPTCY_APK,
} from '../apk/bankruptcy.js';

// Задача БАНКРОТСТВО.1 — отзыв должника на заявление о банкротстве
// (ст. 47 п. 1 ФЗ № 127-ФЗ). Первый узел домена банкротства.

test('отзыв должника на заявление о банкротстве: десять рабочих дней от даты получения определения, без праздничных кластеров рядом', () => {
  const term = computeDebtorResponseBankruptcyApk({
    creditor_petition_acceptance_ruling_received_date_apk: '2025-03-02',
  });
  assert.equal(term.anchor, '2025-03-02');
  assert.equal(term.first_working_day, '2025-03-03');
  assert.equal(term.raw_deadline, '2025-03-14');
  assert.equal(term.deadline, '2025-03-14');
  assert.equal(term.shifted, false); // weekend_shift к working_day не применяется
  assert.deepEqual(term.duration, { value: 10, unit: 'working_day' });
  assert.equal(term.norm.primary, 'ст. 47 п. 1 ФЗ № 127-ФЗ');
});

test('отзыв должника на заявление о банкротстве: рабочие дни, а не календарные — перенос через новогодние каникулы', () => {
  // Определение получено 26.12.2025 (пятница). Течение — с 29.12
  // (понедельник); 31.12.2025 и 01–09.01.2026 нерабочие, поэтому десятый
  // рабочий день — 21.01.2026, а не 05.01.2026, как было бы при подсчёте
  // 10 календарных дней.
  const term = computeDebtorResponseBankruptcyApk({
    creditor_petition_acceptance_ruling_received_date_apk: '2025-12-26',
  });
  assert.equal(term.first_working_day, '2025-12-29');
  assert.equal(term.deadline, '2026-01-21');
  assert.notEqual(term.deadline, '2026-01-05'); // наивные "+10 календарных дней"
});

test('отзыв должника на заявление о банкротстве: без creditor_petition_acceptance_ruling_received_date_apk — понятная ошибка', () => {
  assert.throws(
    () => computeDebtorResponseBankruptcyApk({}),
    /creditor_petition_acceptance_ruling_received_date_apk/,
  );
});

test('отзыв должника на заявление о банкротстве: объём задачи — без restoration-полей', () => {
  // Фиксирует границу: в этом фрагменте ст. 47 п. 1 ФЗ № 127-ФЗ последствия
  // пропуска срока вообще не упоминаются — не тот случай "восстановление без
  // потолка" (ст. 322/112/222.1/229/198/208 АПК), а полное отсутствие
  // института восстановления применительно к этому сроку (тот же случай, что
  // и у ч. 4 ст. 206 / ч. 5 ст. 211 АПК).
  const term = computeDebtorResponseBankruptcyApk({
    creditor_petition_acceptance_ruling_received_date_apk: '2025-03-02',
  });
  assert.equal(term.id, 'debtor_response_bankruptcy_apk');
  assert.equal(DEBTOR_RESPONSE_BANKRUPTCY_APK.restoration_norm, undefined);
  assert.equal(typeof computeDebtorResponseBankruptcyApkRestoration, 'undefined');
});
