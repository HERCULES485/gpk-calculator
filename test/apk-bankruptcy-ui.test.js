// Тесты слоя представления домена банкротства (БАНКРОТСТВО-UI.1):
// apk/bankruptcy-situations.js, apk/bankruptcy-labels.js,
// apk/bankruptcy-views.js.
//
// Отдельный файл от test/apk-bankruptcy.test.js: там проверяется РАСЧЁТ узлов
// (даты, потолки, ошибки на нехватке входа), здесь — сборка карточек для
// интерфейса: покрытие ситуаций, прогрессивное раскрытие, форма карточки
// kind: 'capped_term'. Входные данные для расчётных сценариев переиспользованы
// из тестов расчёта дословно, чтобы ожидаемые даты не разъехались между двумя
// файлами.
//
// Отдельный файл и от test/apk-ui.test.js: там инвариант «каждый узел
// apk/chain.js закреплён ровно за одной ситуацией SITUATIONS_APK», и узлы
// банкротства в него не входят — у них своя страница и свой массив ситуаций.

import test from 'node:test';
import assert from 'node:assert/strict';

import { checkSituationCoverage, allSituationNodes } from '../core/view/situations.js';
import {
  SITUATIONS_BANKRUPTCY,
  DEFAULT_SITUATION_BANKRUPTCY,
} from '../apk/bankruptcy-situations.js';
import { INPUT_LABELS_BANKRUPTCY } from '../apk/bankruptcy-labels.js';
import { buildViewBankruptcy } from '../apk/bankruptcy-views.js';
import * as bankruptcyModule from '../apk/bankruptcy.js';
// Реестр сроков АПК — нужен ровно одному тесту в конце файла: подтвердить, что
// узлы банкротства в него по-прежнему не входят. Слой представления банкротства
// от реестра не зависит и не импортирует его.
import { TERM_REGISTRY_APK } from '../apk/term-registry.js';

// Исчерпывающий скан модуля узлов — тот же приём, что в test/apk-ui.test.js:
// новый узел попадает сюда вместе со своим определением, и «забыли закрепить за
// ситуацией» не может пройти молча.
const BANKRUPTCY_NODE_IDS = Object.values(bankruptcyModule)
  .filter(
    (v) =>
      v != null &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      !(v instanceof Set) &&
      typeof v.id === 'string',
  )
  .map((v) => v.id);

// Полный набор входных данных на все десять узлов сразу. Даты — из тестов
// расчёта (test/apk-bankruptcy.test.js), кроме тех, что там задавались в
// отдельных сценариях: здесь важно, что расчёт проходит, а не какие именно
// получаются числа (их проверяют тесты расчёта).
const FULL_INPUTS = {
  creditor_petition_acceptance_ruling_received_date_apk: '2025-03-02',
  observation_introduction_notice_published_date_apk: '2025-03-03',
  bankruptcy_declaration_notice_published_date_apk: '2025-04-02',
  creditor_claim_unjustified_circumstances_known_date_apk: '2025-03-11',
  citizen_bankruptcy_petition_justified_notice_published_date_apk: '2025-04-02',
  bankruptcy_completion_review_circumstances_discovered_date_apk: '2025-03-11',
  subsidiary_liability_grounds_known_date_apk: '2022-03-10',
  objective_cap_event: 'bankruptcy_declared',
  bankruptcy_declared_date_apk: '2023-06-01',
  subsidiary_liability_conduct_date_apk: '2020-01-01',
  bankruptcy_proceeding_conclusion_date_apk: '2022-03-10',
};

const cardById = (view, id) => view.cards.find((c) => c.id === id);
const incompleteById = (view, id) => view.incomplete.find((n) => n.id === id);

// --- 1. Покрытие ситуаций ------------------------------------------------------

test('банкротство UI: каждый из десяти узлов закреплён ровно за одной ситуацией', () => {
  assert.equal(BANKRUPTCY_NODE_IDS.length, 10);
  assert.doesNotThrow(() => checkSituationCoverage(BANKRUPTCY_NODE_IDS, SITUATIONS_BANKRUPTCY));
  // Обратная сторона того же инварианта: в ситуациях нет узлов-призраков,
  // которых в apk/bankruptcy.js уже (или ещё) нет.
  assert.deepEqual(
    [...allSituationNodes(SITUATIONS_BANKRUPTCY)].sort(),
    [...BANKRUPTCY_NODE_IDS].sort(),
  );
});

test('банкротство UI: пять ветвей ожидаемого состава, ситуация по умолчанию существует', () => {
  assert.deepEqual(
    SITUATIONS_BANKRUPTCY.map((s) => s.id),
    [
      'debtor_response',
      'creditor_claims',
      'citizen_bankruptcy',
      'subsidiary_in_case',
      'subsidiary_post_conclusion',
    ],
  );
  assert.ok(SITUATIONS_BANKRUPTCY.some((s) => s.id === DEFAULT_SITUATION_BANKRUPTCY));
});

test('банкротство UI: у каждого поля всех ветвей есть подпись в словаре', () => {
  for (const situation of SITUATIONS_BANKRUPTCY) {
    const ids = [...situation.fields];
    if (situation.primary_field) ids.push(situation.primary_field);
    for (const id of ids) {
      assert.ok(
        INPUT_LABELS_BANKRUPTCY[id],
        `поле "${id}" ветви "${situation.id}" без подписи в INPUT_LABELS_BANKRUPTCY`,
      );
    }
  }
});

// --- 2. Полный набор данных ----------------------------------------------------

test('банкротство UI: полный набор данных — десять карточек, incomplete пуст', () => {
  const view = buildViewBankruptcy(FULL_INPUTS);
  assert.equal(view.cards.length, 10);
  assert.deepEqual(view.incomplete, []);
  assert.deepEqual(view.stubs, []);
  assert.deepEqual([...view.cards.map((c) => c.id)].sort(), [...BANKRUPTCY_NODE_IDS].sort());
  // Ни одна карточка не в состоянии отказа расчёта.
  assert.deepEqual(
    view.cards.filter((c) => c.kind === 'error'),
    [],
  );
});

test('банкротство UI: пустой ввод — ни одной карточки, все десять узлов в incomplete', () => {
  const view = buildViewBankruptcy({});
  assert.deepEqual(view.cards, []);
  assert.equal(view.incomplete.length, 10);
  for (const node of view.incomplete) {
    assert.equal(node.status, 'not_computed');
    assert.ok(node.missing_inputs.length > 0);
    // Подпись недостающего поля подставлена, а не осталась undefined.
    for (const field of node.missing_inputs) assert.ok(field.label);
  }
});

test('банкротство UI: срок, исчисляемый рабочими днями, показывает первый рабочий день', () => {
  // Единственный working_day-узел домена: без first_working_day непонятно,
  // почему дата такая далёкая после каникул. monthTermCard это поле теряет.
  const view = buildViewBankruptcy({
    creditor_petition_acceptance_ruling_received_date_apk: '2025-12-26',
  });
  const card = cardById(view, 'debtor_response_bankruptcy_apk');
  assert.equal(card.kind, 'term');
  assert.equal(card.unit, 'working_day');
  assert.ok(card.first_working_day, 'first_working_day должен быть на карточке');
  assert.ok(card.first_working_day > '2025-12-26');
});

// --- 3. Карточка capped_term ---------------------------------------------------

test('capped_term (п. 5): карточка несёт все три потолка, binding — на ближайшем', () => {
  // Сценарий из БАНКРОТСТВО.7.1: ограничивает субъективный потолок.
  const view = buildViewBankruptcy({
    subsidiary_liability_grounds_known_date_apk: '2022-03-10',
    objective_cap_event: 'bankruptcy_declared',
    bankruptcy_declared_date_apk: '2023-06-01',
    subsidiary_liability_conduct_date_apk: '2020-01-01',
  });
  const card = cardById(view, 'subsidiary_liability_in_case_apk');

  assert.equal(card.kind, 'capped_term');
  assert.equal(card.status, 'computed');
  assert.equal(card.deadline, '2025-03-10');
  assert.equal(card.norm, 'п. 5 ст. 61.14 ФЗ № 127-ФЗ');

  // Потолки — упорядоченный массив строк для показа, все три присутствуют.
  assert.deepEqual(
    card.caps.map((c) => c.id),
    ['subjective', 'objective', 'absolute'],
  );
  assert.deepEqual(
    card.caps.map((c) => c.date),
    ['2025-03-10', '2026-06-01', '2030-01-01'],
  );
  // Отметка связывания — ровно у одного потолка, и binding это подтверждает.
  assert.deepEqual(
    card.caps.filter((c) => c.binding).map((c) => c.id),
    ['subjective'],
  );
  assert.deepEqual(card.binding, ['subjective']);
  // У каждой строки — человеческая подпись, а не идентификатор потолка.
  for (const cap of card.caps) {
    assert.ok(cap.caption);
    assert.notEqual(cap.caption, cap.id);
  }
  // Блок потолков развёрнут: он не внутри details.
  assert.equal(card.details.collapsed, true);
  assert.equal(card.details.caps, undefined);
});

test('capped_term (п. 5): подпись объективного потолка зависит от выбранного события', () => {
  const declared = cardById(
    buildViewBankruptcy({
      subsidiary_liability_grounds_known_date_apk: '2023-11-01',
      objective_cap_event: 'bankruptcy_declared',
      bankruptcy_declared_date_apk: '2022-09-15',
      subsidiary_liability_conduct_date_apk: '2018-01-01',
    }),
    'subsidiary_liability_in_case_apk',
  );
  const returned = cardById(
    buildViewBankruptcy({
      subsidiary_liability_grounds_known_date_apk: '2023-11-01',
      objective_cap_event: 'petition_returned',
      bankruptcy_petition_returned_date_apk: '2022-09-15',
      subsidiary_liability_conduct_date_apk: '2018-01-01',
    }),
    'subsidiary_liability_in_case_apk',
  );
  const capOf = (card) => card.caps.find((c) => c.id === 'objective').caption;
  assert.match(capOf(declared), /признания должника банкротом/);
  assert.match(capOf(returned), /возврата уполномоченному органу/);
  assert.notEqual(capOf(declared), capOf(returned));
});

test('capped_term (п. 5): ничья — отмечены ОБА совпавших потолка, не один произвольный', () => {
  // Сценарий ничьей из БАНКРОТСТВО.7.1.
  const view = buildViewBankruptcy({
    subsidiary_liability_grounds_known_date_apk: '2022-09-15',
    objective_cap_event: 'bankruptcy_declared',
    bankruptcy_declared_date_apk: '2022-09-15',
    subsidiary_liability_conduct_date_apk: '2018-01-01',
  });
  const card = cardById(view, 'subsidiary_liability_in_case_apk');
  assert.deepEqual(
    card.caps.filter((c) => c.binding).map((c) => c.id),
    ['subjective', 'objective'],
  );
  assert.deepEqual(card.binding, ['subjective', 'objective']);
  assert.equal(card.deadline, '2025-09-15');
});

test('capped_term (п. 6): два потолка, binding на десятилетнем пределе', () => {
  const view = buildViewBankruptcy({
    bankruptcy_proceeding_conclusion_date_apk: '2024-01-10',
    subsidiary_liability_conduct_date_apk: '2016-05-20',
  });
  const card = cardById(view, 'subsidiary_liability_post_conclusion_apk');
  assert.equal(card.kind, 'capped_term');
  assert.equal(card.norm, 'п. 6 ст. 61.14 ФЗ № 127-ФЗ');
  assert.deepEqual(
    card.caps.map((c) => c.id),
    ['post_conclusion', 'absolute'],
  );
  assert.deepEqual(card.binding, ['absolute']);
  assert.equal(card.deadline, '2026-05-20');
});

// --- 4. Перенос последнего дня на рабочий --------------------------------------

test('capped_term: при переносе у связавшего потолка раскрыта строка "перенесён на"', () => {
  // Сценарий переноса из БАНКРОТСТВО.7.1: сырая дата потолка 05.04.2025 —
  // суббота, дедлайн переносится на понедельник 07.04.2025.
  const view = buildViewBankruptcy({
    subsidiary_liability_grounds_known_date_apk: '2022-04-05',
    objective_cap_event: 'bankruptcy_declared',
    bankruptcy_declared_date_apk: '2023-01-01',
    subsidiary_liability_conduct_date_apk: '2018-01-01',
  });
  const card = cardById(view, 'subsidiary_liability_in_case_apk');
  const binding = card.caps.find((c) => c.binding);

  assert.equal(binding.id, 'subjective');
  assert.equal(binding.date, '2025-04-05'); // в строке — СЫРАЯ дата потолка
  assert.equal(binding.shifted_to, '2025-04-07'); // а перенос назван отдельно
  assert.equal(card.deadline, '2025-04-07');

  // У несвязавших потолков переноса нет: они последним днём срока не стали.
  for (const cap of card.caps.filter((c) => !c.binding)) {
    assert.equal(cap.shifted_to, undefined);
  }
});

test('capped_term: без переноса строки "перенесён на" нет ни у одного потолка', () => {
  const view = buildViewBankruptcy({
    subsidiary_liability_grounds_known_date_apk: '2022-03-10',
    objective_cap_event: 'bankruptcy_declared',
    bankruptcy_declared_date_apk: '2023-06-01',
    subsidiary_liability_conduct_date_apk: '2020-01-01',
  });
  const card = cardById(view, 'subsidiary_liability_in_case_apk');
  assert.equal(card.deadline, '2025-03-10'); // понедельник, переноса нет
  for (const cap of card.caps) assert.equal(cap.shifted_to, undefined);
});

test('capped_term (п. 6): перенос тоже раскрывается на связавшем потолке', () => {
  const view = buildViewBankruptcy({
    bankruptcy_proceeding_conclusion_date_apk: '2022-04-05',
    subsidiary_liability_conduct_date_apk: '2018-01-01',
  });
  const card = cardById(view, 'subsidiary_liability_post_conclusion_apk');
  const binding = card.caps.find((c) => c.binding);
  assert.equal(binding.id, 'post_conclusion');
  assert.equal(binding.date, '2025-04-05');
  assert.equal(binding.shifted_to, '2025-04-07');
});

// --- 5. Восстановительные узлы делят поля с базовым ----------------------------

test('восстановление (п. 5): список недостающих полей ДОСЛОВНО тот же, что у базового узла', () => {
  const view = buildViewBankruptcy({});
  const base = incompleteById(view, 'subsidiary_liability_in_case_apk');
  const restoration = incompleteById(view, 'subsidiary_liability_in_case_apk_restoration');
  assert.ok(base && restoration);
  assert.deepEqual(restoration.missing_inputs, base.missing_inputs);
});

test('восстановление (п. 5): дискриминатор меняет список полей одинаково у обоих узлов', () => {
  // Пока objective_cap_event не выбран, какую из трёх дат спрашивать —
  // неизвестно; после выбора в списке появляется ровно она.
  const before = buildViewBankruptcy({});
  const after = buildViewBankruptcy({ objective_cap_event: 'case_terminated' });

  const ids = (view, id) => incompleteById(view, id).missing_inputs.map((f) => f.id);

  assert.deepEqual(
    ids(before, 'subsidiary_liability_in_case_apk_restoration'),
    ids(before, 'subsidiary_liability_in_case_apk'),
  );
  assert.deepEqual(
    ids(after, 'subsidiary_liability_in_case_apk_restoration'),
    ids(after, 'subsidiary_liability_in_case_apk'),
  );
  assert.ok(!ids(before, 'subsidiary_liability_in_case_apk').includes('bankruptcy_case_terminated_date_apk'));
  assert.ok(ids(after, 'subsidiary_liability_in_case_apk').includes('bankruptcy_case_terminated_date_apk'));
});

test('восстановление (п. 6): список недостающих полей ДОСЛОВНО тот же, что у базового узла', () => {
  const view = buildViewBankruptcy({});
  const base = incompleteById(view, 'subsidiary_liability_post_conclusion_apk');
  const restoration = incompleteById(view, 'subsidiary_liability_post_conclusion_apk_restoration');
  assert.deepEqual(restoration.missing_inputs, base.missing_inputs);
});

test('восстановление: считается от дедлайна базового узла, карточка — обычный срок', () => {
  const view = buildViewBankruptcy({
    bankruptcy_proceeding_conclusion_date_apk: '2022-03-10',
    subsidiary_liability_conduct_date_apk: '2018-01-01',
  });
  const base = cardById(view, 'subsidiary_liability_post_conclusion_apk');
  const restoration = cardById(view, 'subsidiary_liability_post_conclusion_apk_restoration');
  assert.equal(base.deadline, '2025-03-10');
  // Два года от итогового дедлайна базового узла.
  assert.equal(restoration.deadline, '2027-03-10');
  // Восстановительный узел — обычная term-карточка, без потолков.
  assert.equal(restoration.kind, 'term');
  assert.equal(restoration.caps, undefined);
  assert.equal(restoration.binding, undefined);
});

// --- 6. Экспорт в календарь не подключён --------------------------------------

test('банкротство UI: ни одна карточка не несёт признаков экспорта в календарь', () => {
  // Экспорт отложен отдельной задачей (развилка 5 дизайна БАНКРОТСТВО-UI.0).
  // Негативный тест: признак экспортируемости не должен появиться на карточке
  // по недосмотру — ни как поле ics, ни как метаданные реестра сроков.
  const view = buildViewBankruptcy(FULL_INPUTS);
  assert.equal(view.cards.length, 10);
  for (const card of view.cards) {
    assert.equal(card.ics, undefined, `у карточки "${card.id}" появилось поле ics`);
    assert.equal(card.ics_meta, undefined);
    assert.equal(card.exportable, undefined);
  }
});

test('банкротство UI: узлы домена по-прежнему не зарегистрированы в реестре сроков АПК', () => {
  // Прямое подтверждение того же факта с другой стороны: реестр
  // apk/term-registry.js сканирует только apk/chain.js, и ни один узел
  // банкротства в него не попал. Тест закрепляет это как осознанное состояние —
  // если реестр однажды расширят, тест об этом скажет, а не промолчит.
  for (const id of BANKRUPTCY_NODE_IDS) {
    assert.equal(TERM_REGISTRY_APK[id], undefined, `узел "${id}" неожиданно попал в реестр АПК`);
  }
});
