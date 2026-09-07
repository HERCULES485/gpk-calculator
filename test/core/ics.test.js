// Сборка реестра сроков (core/export/ics.js) — на синтетических фикстурах,
// без единого реального узла ГПК. Полнота реального реестра проверяется на
// стороне предметного модуля (test/ics.test.js поверх src/term-registry.js,
// где и живёт исчерпывающий `import * as chainModule`).

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTermRegistry, buildICS } from '../../core/export/ics.js';

// Неймспейс модуля определений: часть экспортов — сроки, часть — нет.
const TERM_A = { id: 'term_a', duration: { value: 1, unit: 'month' }, ics: true };
const TERM_B = { id: 'term_b', duration: { value: 5, unit: 'working_day' }, ics: false };
const NOT_A_TERM = { id: 'no_duration', ics: true }; // нет duration
const NO_ICS_FIELD = { id: 'no_ics', duration: { value: 3, unit: 'month' } }; // нет ics

const MODULE_NS = {
  TERM_A,
  TERM_B,
  NOT_A_TERM,
  NO_ICS_FIELD,
  SOME_LABELS: { office: 'подпись, не срок' },
  helper: () => 'функция-экспорт',
  COUNT: 42,
};

test('в реестр попадают только определения срока (id + duration + ics)', () => {
  assert.deepEqual(buildTermRegistry(MODULE_NS), [TERM_A, TERM_B]);
});

test('ics: false не исключает срок из реестра — исключает только из выгрузки', () => {
  // Реестр держит все сроки: признак ics читается уже при отборе карточек
  // (exportableCards), а не при сборке. Иначе справочный срок потерял бы
  // метаданные, которые нужны карточке и без экспорта.
  const registry = buildTermRegistry(MODULE_NS);
  assert.ok(registry.includes(TERM_B), 'срок с ics: false должен быть в реестре');
  assert.equal(registry.filter((t) => t.ics === true).length, 1);
});

test('запись без duration или без поля ics в реестр не попадает', () => {
  const registry = buildTermRegistry(MODULE_NS);
  assert.ok(!registry.includes(NOT_A_TERM), 'без duration это не срок');
  assert.ok(!registry.includes(NO_ICS_FIELD), 'без поля ics это не срок');
});

test('новый экспорт модуля попадает в реестр сам, без правки списка', () => {
  // То самое защитное свойство, ради которого реестр собирается перебором
  // экспортов, а не перечислением: добавили срок — он уже в реестре.
  const TERM_C = { id: 'term_c', duration: { value: 3, unit: 'year' }, ics: true };
  const grown = buildTermRegistry({ ...MODULE_NS, TERM_C });
  assert.ok(grown.includes(TERM_C), 'новый срок должен попасть в реестр молча-автоматически');
  assert.equal(grown.length, buildTermRegistry(MODULE_NS).length + 1);
});

test('порядок записей — порядок экспортов модуля', () => {
  const ordered = buildTermRegistry({ TERM_B, TERM_A });
  assert.deepEqual(
    ordered.map((t) => t.id),
    ['term_b', 'term_a'],
  );
});

test('свой предикат отбора заменяет умолчание', () => {
  const onlyExported = buildTermRegistry(MODULE_NS, { filter: (v) => v && v.ics === true });
  // NOT_A_TERM подходит под этот предикат: у него ics: true, а duration не нужен.
  assert.deepEqual(
    onlyExported.map((v) => v.id),
    ['term_a', 'no_duration'],
  );
});

test('пустой неймспейс даёт пустой реестр, а не падение', () => {
  assert.deepEqual(buildTermRegistry({}), []);
  assert.deepEqual(buildTermRegistry(undefined), []);
});

// --- Предметные параметры сборки файла --------------------------------------

const SYNTHETIC_TERM = {
  title: 'Срок из фикстуры',
  deadline: '2030-06-17',
  norm: 'пункт из фикстуры',
  ics: true,
  duration: { value: 1, unit: 'month' },
};
const OFFSETS = () => [{ unit: 'day', value: 3 }];
const OPTS = { prodId: '-//пример//RU', uidDomain: 'example.test', offsets: OFFSETS };

test('без prodId, uidDomain или таблицы напоминаний ядро падает, а не подставляет своё', () => {
  // Тот же принцип, что у restoration_norm в core/view/cards.js: молча
  // подставленный чужой идентификатор или пустой список напоминаний виден
  // только в чужом календаре, когда файл уже у пользователя.
  assert.throws(() => buildICS([SYNTHETIC_TERM], { ...OPTS, prodId: undefined }), /prodId/);
  assert.throws(() => buildICS([SYNTHETIC_TERM], { ...OPTS, uidDomain: undefined }), /uidDomain/);
  assert.throws(() => buildICS([SYNTHETIC_TERM], { ...OPTS, offsets: undefined }), /offsets/);
});

test('переданные идентификаторы попадают в файл, напоминания — по переданной таблице', () => {
  const ics = buildICS([SYNTHETIC_TERM], { ...OPTS, now: '2030-01-01T00:00:00Z' });
  assert.match(ics, /PRODID:-\/\/пример\/\/RU/);
  assert.match(ics, /UID:20300617-0-[a-z0-9]+@example\.test/);
  // Смещение 3 дня от 17.06.2030 — 14.06.2030 (пятница, сдвигать не нужно).
  assert.match(ics, /TRIGGER;VALUE=DATE-TIME:20300614T090000Z/);
  assert.equal((ics.match(/BEGIN:VALARM/g) || []).length, 1);
});

test('длительность без правил в таблице оставляет срок без напоминаний, но с событием', () => {
  // Известное допущение, сохранённое при переносе: пустой список смещений —
  // это событие в календаре без будильников, а не отсутствие события.
  const ics = buildICS([SYNTHETIC_TERM], { ...OPTS, offsets: () => [] });
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 1);
  assert.equal((ics.match(/BEGIN:VALARM/g) || []).length, 0);
});
