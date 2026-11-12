// Дело в адресе страницы apk.html: #case=<base64url(JSON)>.
//
// Чистые функции без DOM и без знания о конкретных полях АПК: что допустимо
// (ветви, поля и их виды, основания перерывов и периодов), передаёт сюда
// apk/app.js аргументом schema. Здесь — только формат и строгая проверка
// при чтении: ссылка приходит извне, и ничто из неё не должно уронить
// страницу или попасть в состояние в непредусмотренном виде.
//
// Формат JSON (версия 1):
//   { "v": 1, "s": "<id ветви>", "i": { "<id поля>": <значение> },
//     "int": [{ type, raw }], "sus": [{ startRaw, endRaw }],
//     "exc": [{ type, startRaw, endRaw }] }
// Пустые "i"/"int"/"sus"/"exc" не пишутся; пустое состояние (ветвь по
// умолчанию, ни одного значения, ни одной строки) — пустая строка, без
// фрагмента вовсе.
//
// schema:
//   situations:        string[] — id всех ветвей;
//   defaultSituation:  string   — ветвь по умолчанию;
//   fields:            { [id]: { kind: 'date' } | { kind: 'boolean' }
//                              | { kind: 'choice', values: string[] } };
//   interruptionTypes: string[] — допустимые основания перерыва;
//   exclusionTypes:    string[] — допустимые основания периода ч. 5.
//
// Состояние дела (вход encodeCase, выход decodeCase):
//   { situation, inputs, interruptions, suspensions, exclusions }

export const CASE_LINK_VERSION = 1;
export const CASE_FRAGMENT_PREFIX = 'case=';
export const MAX_DRAFT_ROWS = 50;
const MAX_RAW_LENGTH = 10;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// Строки черновиков: ключи строки и у каких из них значение — основание из
// списка схемы (остальные — сырой текст даты).
const DRAFTS = [
  { key: 'int', stateKey: 'interruptions', fields: ['type', 'raw'], typeList: 'interruptionTypes' },
  { key: 'sus', stateKey: 'suspensions', fields: ['startRaw', 'endRaw'], typeList: null },
  { key: 'exc', stateKey: 'exclusions', fields: ['type', 'startRaw', 'endRaw'], typeList: 'exclusionTypes' },
];

/** Пустое состояние дела: ветвь по умолчанию, ни значений, ни строк. */
export function emptyCase(schema) {
  return {
    situation: schema.defaultSituation,
    inputs: {},
    interruptions: [],
    suspensions: [],
    exclusions: [],
  };
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function knownField(schema, id) {
  return typeof id === 'string' && !FORBIDDEN_KEYS.has(id) && hasOwn(schema.fields, id);
}

// Существующая календарная дата YYYY-MM-DD — та же проверка, что у ruToISO
// (core/ui/date-field.js) для ввода с клавиатуры: из ссылки не принимается
// дата, которую нельзя было бы ввести в поле.
function isIsoDate(value) {
  if (typeof value !== 'string') return false;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function validFieldValue(spec, value) {
  if (spec.kind === 'date') return isIsoDate(value);
  if (spec.kind === 'boolean') return value === true || value === false;
  if (spec.kind === 'choice') return typeof value === 'string' && spec.values.includes(value);
  return false;
}

function validRaw(value) {
  return typeof value === 'string' && value.length <= MAX_RAW_LENGTH;
}

// Строка черновика из ссылки → новая строка только с известными ключами, или
// null, если строка недопустима.
function decodeRow(row, draft, schema) {
  if (!isPlainObject(row)) return null;
  const out = {};
  for (const name of draft.fields) {
    const value = row[name];
    if (name === 'type') {
      if (typeof value !== 'string' || !schema[draft.typeList].includes(value)) return null;
    } else if (!validRaw(value)) {
      return null;
    }
    out[name] = value;
  }
  return out;
}

// --- base64url ↔ текст (UTF-8) ------------------------------------------------

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded) {
  if (!/^[A-Za-z0-9_-]+$/.test(encoded) || encoded.length % 4 === 1) return null;
  const padded =
    encoded.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (encoded.length % 4)) % 4);
  let binary;
  try {
    binary = atob(padded);
  } catch {
    return null;
  }
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

// --- Кодирование ----------------------------------------------------------------

/**
 * Состояние дела → фрагмент адреса без '#': 'case=<base64url>', либо '' для
 * пустого состояния. В "i" попадают только поля из schema.fields — значения,
 * которые приложение само выводит из черновиков (готовые списки перерывов и
 * периодов в inputs), не пишутся: они восстанавливаются из "int"/"sus"/"exc".
 */
export function encodeCase(caseState, schema) {
  const data = { v: CASE_LINK_VERSION, s: caseState.situation };
  const inputs = {};
  let filled = 0;
  for (const [id, value] of Object.entries(caseState.inputs ?? {})) {
    if (value == null || !knownField(schema, id)) continue;
    inputs[id] = value;
    filled += 1;
  }
  if (filled) data.i = inputs;
  let rows = 0;
  for (const draft of DRAFTS) {
    const list = caseState[draft.stateKey] ?? [];
    if (!list.length) continue;
    data[draft.key] = list.map((row) => {
      const out = {};
      for (const name of draft.fields) out[name] = row[name];
      return out;
    });
    rows += list.length;
  }
  if (caseState.situation === schema.defaultSituation && filled === 0 && rows === 0) return '';
  return CASE_FRAGMENT_PREFIX + toBase64Url(JSON.stringify(data));
}

// --- Чтение -------------------------------------------------------------------

/**
 * Фрагмент адреса (с '#' или без) → состояние дела, либо null, если фрагмент
 * не принимается целиком: не 'case=…', не base64url, не JSON, v ≠ 1,
 * неизвестная ветвь. Пустой фрагмент — пустое состояние.
 *
 * Внутри принятого фрагмента недопустимые поля и строки черновиков молча
 * пропускаются; строк в каждом списке читается не больше MAX_DRAFT_ROWS.
 */
export function decodeCase(fragment, schema) {
  const hash = String(fragment ?? '').replace(/^#/, '');
  if (hash === '') return emptyCase(schema);
  if (!hash.startsWith(CASE_FRAGMENT_PREFIX)) return null;
  const text = fromBase64Url(hash.slice(CASE_FRAGMENT_PREFIX.length));
  if (text == null) return null;
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isPlainObject(data) || data.v !== CASE_LINK_VERSION) return null;
  if (typeof data.s !== 'string' || FORBIDDEN_KEYS.has(data.s) || !schema.situations.includes(data.s)) {
    return null;
  }

  const result = emptyCase(schema);
  result.situation = data.s;

  if (isPlainObject(data.i)) {
    for (const id of Object.keys(data.i)) {
      if (!knownField(schema, id)) continue;
      const value = data.i[id];
      if (validFieldValue(schema.fields[id], value)) result.inputs[id] = value;
    }
  }

  for (const draft of DRAFTS) {
    const list = data[draft.key];
    if (!Array.isArray(list)) continue;
    for (const row of list.slice(0, MAX_DRAFT_ROWS)) {
      const decoded = decodeRow(row, draft, schema);
      if (decoded) result[draft.stateKey].push(decoded);
    }
  }
  return result;
}
