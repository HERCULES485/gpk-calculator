// Данные UI-слоя модуля АПК (задача UI.2): разбиение узлов по ситуациям,
// словарь подписей полей и реестр сроков для экспорта в календарь.
//
// Проверки построены на списках, вычисленных из самого apk/chain.js, а не на
// перечислении вручную: иначе следующий добавленный узел или новое поле ввода
// молча окажутся вне ситуации, без подписи или без экспорта.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { SITUATIONS_APK, DEFAULT_SITUATION_APK } from '../apk/situations.js';
import { INPUT_LABELS_APK } from '../apk/labels.js';
import { TERM_REGISTRY_APK, ICS_PRODID, ICS_UID_DOMAIN } from '../apk/term-registry.js';
import {
  situationById,
  allSituationNodes,
  allSituationFields,
  checkSituationCoverage,
} from '../core/view/situations.js';
import * as chainModule from '../apk/chain.js';

// Узлы-определения из экспортов chain.js: объект со строковым id. Каталоги
// оснований (массивы) и Set-ы идентификаторов узлами не являются.
const CHAIN_NODE_IDS = Object.values(chainModule)
  .filter(
    (v) =>
      v != null &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      !(v instanceof Set) &&
      typeof v.id === 'string',
  )
  .map((v) => v.id);

// Узлы-события (вступление акта в силу) — без duration и без дедлайна.
const EVENT_NODE_IDS = Object.values(chainModule)
  .filter(
    (v) =>
      v != null &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      !(v instanceof Set) &&
      typeof v.id === 'string' &&
      !v.duration,
  )
  .map((v) => v.id);

test('АПК ситуации: каждый узел chain.js закреплён ровно за одной ситуацией', () => {
  assert.doesNotThrow(() => checkSituationCoverage(CHAIN_NODE_IDS, SITUATIONS_APK));
  // Обратная сторона того же инварианта: в ситуациях нет узлов-призраков,
  // которых в chain.js уже (или ещё) нет.
  const inSituations = allSituationNodes(SITUATIONS_APK);
  assert.deepEqual([...inSituations].sort(), [...CHAIN_NODE_IDS].sort());
});

test('АПК ситуации: три ветви ожидаемого состава, ситуация по умолчанию существует', () => {
  assert.deepEqual(
    SITUATIONS_APK.map((s) => s.id),
    ['decision_chain', 'rulings', 'enforcement'],
  );
  assert.deepEqual(
    SITUATIONS_APK.map((s) => s.nodes.length),
    [8, 4, 2],
  );
  assert.equal(situationById(DEFAULT_SITUATION_APK, SITUATIONS_APK).id, 'decision_chain');
  // primary_field — только у ветви цепочки обжалования, как у общей ветви ГПК.
  assert.deepEqual(
    SITUATIONS_APK.filter((s) => s.primary_field).map((s) => s.id),
    ['decision_chain'],
  );
});

test('АПК подписи: каждое поле ситуаций имеет подпись, лишних подписей нет', () => {
  const situationFields = new Set([
    ...allSituationFields(SITUATIONS_APK),
    ...SITUATIONS_APK.filter((s) => s.primary_field).map((s) => s.primary_field),
  ]);
  for (const id of situationFields) {
    assert.ok(INPUT_LABELS_APK[id], `нет подписи для поля ситуации "${id}"`);
  }
  // Поля повторяемых списков к ситуациям не привязаны (они у карточки), но
  // подпись им нужна — в списке «что ещё уточнить» и в заголовке блока.
  const listFields = ['enforcement_interruptions', 'suspension_periods', 'execution_ended_periods'];
  for (const id of listFields) assert.ok(INPUT_LABELS_APK[id], `нет подписи для списка "${id}"`);

  const expected = new Set([...situationFields, ...listFields]);
  for (const id of Object.keys(INPUT_LABELS_APK)) {
    assert.ok(expected.has(id), `подпись "${id}" не относится ни к одной ситуации и не список`);
  }
});

test('АПК подписи: словарь покрывает все входы, которые читает chain.js', () => {
  // Множество имён входов — грепом по самому chain.js, а не по списку из
  // задачи: список мог устареть, исходник — нет.
  const source = readFileSync(new URL('../apk/chain.js', import.meta.url), 'utf8');
  const chainInputs = new Set(
    [...source.matchAll(/inputs\??\.([a-z_][a-z0-9_]*)/g)].map((m) => m[1]),
  );

  // Единственное расхождение имён между моделью и интерфейсом: три частные
  // жалобы ст. 188 принимают один и тот же вход ruling_issued_date, но это три
  // разных определения, и в UI они разведены на три поля. Подстановку делает
  // слой представления; самого ruling_issued_date пользователь не видит.
  const UI_FIELDS_FOR_RULING_DATE = [
    'first_instance_ruling_date',
    'appellate_ruling_issued_date',
    'cassation_ruling_issued_date',
  ];
  assert.ok(chainInputs.has('ruling_issued_date'));
  assert.equal(INPUT_LABELS_APK.ruling_issued_date, undefined);
  for (const id of UI_FIELDS_FOR_RULING_DATE) {
    assert.ok(INPUT_LABELS_APK[id], `нет подписи для UI-поля "${id}"`);
  }
  // Подписи трёх полей различаются: иначе на экране три одинаковые строки и
  // непонятно, определение какой инстанции куда вводить.
  const texts = UI_FIELDS_FOR_RULING_DATE.map((id) => INPUT_LABELS_APK[id]);
  assert.equal(new Set(texts).size, 3);

  for (const id of chainInputs) {
    if (id === 'ruling_issued_date') continue;
    assert.ok(INPUT_LABELS_APK[id], `вход chain.js "${id}" остался без подписи в labels.js`);
  }
});

test('АПК реестр сроков: 12 узлов из 14 — без двух узлов-событий', () => {
  assert.equal(CHAIN_NODE_IDS.length, 14);
  assert.deepEqual(
    [...EVENT_NODE_IDS].sort(),
    ['entry_into_force_after_cassation_apk', 'entry_into_force_apk'],
  );
  assert.equal(Object.keys(TERM_REGISTRY_APK).length, 12);
  for (const id of EVENT_NODE_IDS) {
    assert.equal(TERM_REGISTRY_APK[id], undefined, `узел-событие "${id}" попал в реестр`);
  }
  // Ядро отбирает карточки к экспорту по meta.ics === true — признак должен
  // быть на каждой записи реестра, иначе экспорт молча вернёт пустой список.
  for (const [id, meta] of Object.entries(TERM_REGISTRY_APK)) {
    assert.equal(meta.ics, true, `у записи реестра "${id}" нет признака ics`);
    assert.ok(meta.duration, `у записи реестра "${id}" нет duration`);
    assert.equal(meta.id, id);
  }
});

test('АПК реестр сроков: идентификаторы продукта заданы и отличаются от ГПК-шных', () => {
  assert.equal(typeof ICS_PRODID, 'string');
  assert.match(ICS_PRODID, /^-\/\/.+\/\/.+\/\/RU$/);
  assert.match(ICS_PRODID, /АПК/);
  assert.equal(typeof ICS_UID_DOMAIN, 'string');
  assert.ok(ICS_UID_DOMAIN.length > 0);
  assert.notEqual(ICS_UID_DOMAIN, 'gpk-calculator');
});
