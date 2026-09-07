// Механика ситуаций (core/view/situations.js) — на синтетических фикстурах,
// без обращения к реальным узлам ГПК. Сами данные (какие ситуации есть у
// конкретного предметного модуля) проверяются его собственными тестами
// (test/situations.test.js — на реальных узлах ГПК через buildView).

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  situationById,
  allSituationNodes,
  allSituationFields,
  checkSituationCoverage,
} from '../../core/view/situations.js';

const SITUATIONS = [
  { id: 'alpha', label: 'Alpha', fields: ['alpha_date'], nodes: ['node_a', 'node_b'] },
  { id: 'beta', label: 'Beta', fields: ['beta_date'], nodes: ['node_c'] },
  { id: 'gamma', label: 'Gamma', fields: ['gamma_date_1', 'gamma_date_2'], nodes: ['node_d'] },
];

test('situationById: находит по id', () => {
  assert.equal(situationById('beta', SITUATIONS).label, 'Beta');
});

test('situationById: неизвестный id откатывается к первой ситуации', () => {
  assert.equal(situationById('нет такой', SITUATIONS).id, 'alpha');
});

test('situationById: undefined тоже откатывается к первой ситуации', () => {
  assert.equal(situationById(undefined, SITUATIONS).id, 'alpha');
});

test('allSituationNodes: все узлы в порядке ситуаций и порядке внутри каждой', () => {
  assert.deepEqual(allSituationNodes(SITUATIONS), ['node_a', 'node_b', 'node_c', 'node_d']);
});

test('allSituationFields: все поля в том же порядке', () => {
  assert.deepEqual(allSituationFields(SITUATIONS), [
    'alpha_date',
    'beta_date',
    'gamma_date_1',
    'gamma_date_2',
  ]);
});

test('checkSituationCoverage: все узлы учтены — не бросает', () => {
  assert.doesNotThrow(() =>
    checkSituationCoverage(['node_a', 'node_b', 'node_c', 'node_d'], SITUATIONS),
  );
});

test('checkSituationCoverage: один узел пропущен (ни в одной ситуации) — бросает на нём', () => {
  assert.throws(
    () => checkSituationCoverage(['node_a', 'node_b', 'node_c', 'node_orphan'], SITUATIONS),
    /node_orphan/,
  );
});

test('checkSituationCoverage: один узел задвоен между ситуациями — бросает на нём', () => {
  const withDuplicate = [
    { id: 'alpha', label: 'Alpha', fields: [], nodes: ['node_a', 'node_shared'] },
    { id: 'beta', label: 'Beta', fields: [], nodes: ['node_shared'] },
  ];
  assert.throws(
    () => checkSituationCoverage(['node_a', 'node_shared'], withDuplicate),
    /node_shared/,
  );
});

test('checkSituationCoverage: пустой список узлов — не бросает даже при непустых ситуациях', () => {
  assert.doesNotThrow(() => checkSituationCoverage([], SITUATIONS));
});
