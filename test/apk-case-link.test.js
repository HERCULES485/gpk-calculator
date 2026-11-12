// Дело в адресе страницы apk.html (#case=<base64url(JSON)>): чистые
// encodeCase/decodeCase из apk/case-link.js. Схема — та же, что собирает
// apk/app.js: ветви, поля с видами, основания перерывов и периодов; здесь она
// собрана из тех же источников, чтобы проверка шла по реальным спискам.

import test from 'node:test';
import assert from 'node:assert/strict';

import { encodeCase, decodeCase, emptyCase, MAX_DRAFT_ROWS } from '../apk/case-link.js';
import { SITUATIONS_APK, DEFAULT_SITUATION_APK } from '../apk/situations.js';
import { ENFORCEMENT_INTERRUPTION_TYPES_APK, ENFORCEMENT_EXCLUSION_TYPES_APK } from '../apk/chain.js';

const SCHEMA = {
  situations: SITUATIONS_APK.map((s) => s.id),
  defaultSituation: DEFAULT_SITUATION_APK,
  fields: {
    decision_full_text_date: { kind: 'date' },
    last_contested_act_entry_into_force_date: { kind: 'date' },
    entry_into_force_date: { kind: 'date' },
    appeal_filed: { kind: 'boolean' },
    case_type: {
      kind: 'choice',
      values: ['entry_into_force', 'immediate_execution', 'deferred_installment_end'],
    },
    subject_category: {
      kind: 'choice',
      values: ['participating_duly_notified', 'article_42_person', 'participating_improperly_notified'],
    },
  },
  interruptionTypes: ENFORCEMENT_INTERRUPTION_TYPES_APK.map((t) => t.id),
  exclusionTypes: ENFORCEMENT_EXCLUSION_TYPES_APK.map((t) => t.id),
};

// base64url от произвольного текста — для собранных вручную фрагментов.
function b64url(text) {
  return Buffer.from(text, 'utf8').toString('base64url');
}

function fragmentOf(data) {
  return `#case=${b64url(JSON.stringify(data))}`;
}

function caseWith(overrides) {
  return { ...emptyCase(SCHEMA), ...overrides };
}

const FULL_CASE = {
  situation: 'enforcement',
  inputs: {
    case_type: 'entry_into_force',
    entry_into_force_date: '2024-03-15',
    appeal_filed: false,
  },
  interruptions: [
    { type: ENFORCEMENT_INTERRUPTION_TYPES_APK[0].id, raw: '01.06.2024' },
    { type: ENFORCEMENT_INTERRUPTION_TYPES_APK[1].id, raw: '12.0' },
  ],
  suspensions: [{ startRaw: '01.07.2024', endRaw: '' }],
  exclusions: [
    { type: ENFORCEMENT_EXCLUSION_TYPES_APK[1].id, startRaw: '01.08.2024', endRaw: '10.08.2024' },
  ],
};

test('ссылка на дело: encode → decode возвращает исходное состояние', () => {
  const encoded = encodeCase(FULL_CASE, SCHEMA);
  assert.match(encoded, /^case=[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeCase(`#${encoded}`, SCHEMA), FULL_CASE);
  // Без ведущего '#' — то же.
  assert.deepEqual(decodeCase(encoded, SCHEMA), FULL_CASE);
});

test('ссылка на дело: формат JSON — v, s, i и только непустые черновики', () => {
  const encoded = encodeCase(
    caseWith({ situation: 'nadzor', inputs: { last_contested_act_entry_into_force_date: '2025-01-10' } }),
    SCHEMA,
  );
  const json = JSON.parse(Buffer.from(encoded.slice('case='.length), 'base64url').toString('utf8'));
  assert.deepEqual(json, {
    v: 1,
    s: 'nadzor',
    i: { last_contested_act_entry_into_force_date: '2025-01-10' },
  });
});

test('ссылка на дело: готовые списки из inputs и неизвестные поля в "i" не пишутся', () => {
  const encoded = encodeCase(
    caseWith({
      situation: 'enforcement',
      inputs: {
        entry_into_force_date: '2024-03-15',
        enforcement_interruptions: [{ type: 'presentment', date: '2024-06-01' }],
        suspension_periods: [{ start: '2024-07-01', end: '2024-07-10' }],
      },
    }),
    SCHEMA,
  );
  const json = JSON.parse(Buffer.from(encoded.slice('case='.length), 'base64url').toString('utf8'));
  assert.deepEqual(json.i, { entry_into_force_date: '2024-03-15' });
});

test('ссылка на дело: пустое состояние кодируется в пустую строку', () => {
  assert.equal(encodeCase(emptyCase(SCHEMA), SCHEMA), '');
  // Пустой фрагмент читается как пустое состояние.
  assert.deepEqual(decodeCase('', SCHEMA), emptyCase(SCHEMA));
  assert.deepEqual(decodeCase('#', SCHEMA), emptyCase(SCHEMA));
  // Ветвь не по умолчанию — уже не пустое состояние.
  assert.notEqual(encodeCase(caseWith({ situation: 'nadzor' }), SCHEMA), '');
  // Одна пустая строка черновика — тоже.
  assert.notEqual(encodeCase(caseWith({ suspensions: [{ startRaw: '', endRaw: '' }] }), SCHEMA), '');
});

test('ссылка на дело: битый base64 — фрагмент отклоняется целиком', () => {
  assert.equal(decodeCase('#case=%%%', SCHEMA), null);
  assert.equal(decodeCase('#case=abc$def', SCHEMA), null);
  assert.equal(decodeCase('#case=a', SCHEMA), null); // длина ≡ 1 (mod 4)
  assert.equal(decodeCase('#case=', SCHEMA), null);
  // Не 'case=' вовсе.
  assert.equal(decodeCase('#something', SCHEMA), null);
  // Байты — не UTF-8.
  assert.equal(decodeCase(`#case=${Buffer.from([0xff, 0xfe, 0xfd]).toString('base64url')}`, SCHEMA), null);
});

test('ссылка на дело: не JSON — фрагмент отклоняется целиком', () => {
  assert.equal(decodeCase(`#case=${b64url('не json {')}`, SCHEMA), null);
  assert.equal(decodeCase(`#case=${b64url('[1,2,3]')}`, SCHEMA), null);
  assert.equal(decodeCase(`#case=${b64url('null')}`, SCHEMA), null);
});

test('ссылка на дело: v ≠ 1 — фрагмент отклоняется целиком', () => {
  assert.equal(decodeCase(fragmentOf({ v: 2, s: 'nadzor' }), SCHEMA), null);
  assert.equal(decodeCase(fragmentOf({ v: '1', s: 'nadzor' }), SCHEMA), null);
  assert.equal(decodeCase(fragmentOf({ s: 'nadzor' }), SCHEMA), null);
});

test('ссылка на дело: неизвестная ветвь — фрагмент отклоняется целиком', () => {
  assert.equal(decodeCase(fragmentOf({ v: 1, s: 'нет_такой' }), SCHEMA), null);
  assert.equal(decodeCase(fragmentOf({ v: 1 }), SCHEMA), null);
  assert.equal(decodeCase(fragmentOf({ v: 1, s: 42 }), SCHEMA), null);
  assert.equal(decodeCase(fragmentOf({ v: 1, s: '__proto__' }), SCHEMA), null);
});

test('ссылка на дело: неизвестное поле молча пропускается, остальное принимается', () => {
  const decoded = decodeCase(
    fragmentOf({ v: 1, s: 'nadzor', i: { unknown_field: '2025-01-10', appeal_filed: true } }),
    SCHEMA,
  );
  assert.deepEqual(decoded, caseWith({ situation: 'nadzor', inputs: { appeal_filed: true } }));
});

test('ссылка на дело: несуществующая дата 2025-02-31 пропускается', () => {
  const decoded = decodeCase(
    fragmentOf({
      v: 1,
      s: 'decision_chain',
      i: { decision_full_text_date: '2025-02-31', entry_into_force_date: '2024-02-29' },
    }),
    SCHEMA,
  );
  assert.deepEqual(decoded.inputs, { entry_into_force_date: '2024-02-29' });
  // Не ISO и не строка — тоже.
  for (const bad of ['31.01.2025', '2025-1-5', 20250101, null, '2025-01-01T00:00']) {
    const d = decodeCase(fragmentOf({ v: 1, s: 'decision_chain', i: { decision_full_text_date: bad } }), SCHEMA);
    assert.deepEqual(d.inputs, {}, `дата ${JSON.stringify(bad)} принята`);
  }
});

test('ссылка на дело: недопустимое значение выбора и булева поля пропускается', () => {
  const decoded = decodeCase(
    fragmentOf({
      v: 1,
      s: 'enforcement',
      i: { case_type: 'no_such_option', subject_category: 'article_42_person', appeal_filed: 'yes' },
    }),
    SCHEMA,
  );
  assert.deepEqual(decoded.inputs, { subject_category: 'article_42_person' });
});

test('ссылка на дело: ключи __proto__/constructor/prototype не принимаются', () => {
  // JSON.parse создаёт собственное свойство "__proto__" — так атака и выглядит.
  const text = '{"v":1,"s":"nadzor","i":{"__proto__":{"polluted":true},"constructor":"x","prototype":"y"}}';
  const decoded = decodeCase(`#case=${b64url(text)}`, SCHEMA);
  assert.deepEqual(decoded, caseWith({ situation: 'nadzor' }));
  assert.equal(Object.getPrototypeOf(decoded.inputs), Object.prototype);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.keys(decoded.inputs).length, 0);
  // И в строках черновиков лишние ключи не переносятся.
  const rows = decodeCase(
    `#case=${b64url('{"v":1,"s":"enforcement","sus":[{"startRaw":"","endRaw":"","__proto__":{"p":1}}]}')}`,
    SCHEMA,
  );
  assert.deepEqual(rows.suspensions, [{ startRaw: '', endRaw: '' }]);
  assert.equal(Object.getPrototypeOf(rows.suspensions[0]), Object.prototype);
});

test('ссылка на дело: недопустимые строки черновиков пропускаются', () => {
  const interruptionType = ENFORCEMENT_INTERRUPTION_TYPES_APK[0].id;
  const exclusionType = ENFORCEMENT_EXCLUSION_TYPES_APK[0].id;
  const decoded = decodeCase(
    fragmentOf({
      v: 1,
      s: 'enforcement',
      int: [
        { type: interruptionType, raw: '01.06.2024' },
        { type: 'no_such_type', raw: '01.06.2024' },
        { type: interruptionType, raw: '01.06.2024000' }, // длиннее 10
        { type: interruptionType }, // нет даты
        'строка',
        null,
      ],
      sus: [{ startRaw: 1, endRaw: '' }, { startRaw: '', endRaw: '' }],
      // Основание перерыва — не из списка периодов ч. 5.
      exc: [{ type: interruptionType, startRaw: '', endRaw: '' }, { type: exclusionType, startRaw: '', endRaw: '' }],
    }),
    SCHEMA,
  );
  assert.deepEqual(decoded.interruptions, [{ type: interruptionType, raw: '01.06.2024' }]);
  assert.deepEqual(decoded.suspensions, [{ startRaw: '', endRaw: '' }]);
  assert.deepEqual(decoded.exclusions, [{ type: exclusionType, startRaw: '', endRaw: '' }]);
  // Не массив — список пуст, фрагмент принят.
  const notArray = decodeCase(fragmentOf({ v: 1, s: 'enforcement', int: { 0: {} } }), SCHEMA);
  assert.deepEqual(notArray, caseWith({ situation: 'enforcement' }));
});

test('ссылка на дело: строки сверх 50 в каждом списке не читаются', () => {
  assert.equal(MAX_DRAFT_ROWS, 50);
  const row = { startRaw: '01.01.2024', endRaw: '02.01.2024' };
  const type = ENFORCEMENT_INTERRUPTION_TYPES_APK[0].id;
  const decoded = decodeCase(
    fragmentOf({
      v: 1,
      s: 'enforcement',
      int: Array.from({ length: 60 }, () => ({ type, raw: '01.01.2024' })),
      sus: Array.from({ length: 51 }, () => row),
      exc: Array.from({ length: 50 }, () => ({ type: ENFORCEMENT_EXCLUSION_TYPES_APK[0].id, ...row })),
    }),
    SCHEMA,
  );
  assert.equal(decoded.interruptions.length, 50);
  assert.equal(decoded.suspensions.length, 50);
  assert.equal(decoded.exclusions.length, 50);
});
