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

// Полный набор входных данных на все тридцать три узла сразу. Даты — из
// тестов расчёта (test/apk-bankruptcy.test.js), кроме тех, что там задавались
// в отдельных сценариях: здесь важно, что расчёт проходит, а не какие именно
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
  out_of_court_bankruptcy_initiation_notice_included_date_apk: '2025-03-11',
  out_of_court_bankruptcy_return_date_apk: '2025-03-11',
  out_of_court_bankruptcy_prior_procedure_end_date_apk: '2020-03-11',
  settlement_agreement_conclusion_date_apk: '2025-03-11',
  settlement_agreement_review_circumstances_discovered_date_apk: '2025-03-11',
  inventory_results_included_date_apk: '2025-03-11',
  claims_ruling_resolutive_part_date_apk: '2025-03-11',
  claims_ruling_reasoned_date_apk: '2025-03-11',
  enterprise_sale_agreement_signed_date_apk: '2025-03-11',
  settlement_agreement_rejection_ruling_date_apk: '2025-03-11',
  external_management_introduction_extension_ruling_date_apk: '2025-03-11',
  external_management_reduction_ruling_date_apk: '2025-03-11',
  external_management_plan_invalidation_ruling_date_apk: '2025-03-11',
  external_management_term_expiry_refusal_ruling_date_apk: '2025-03-11',
  external_management_manager_approved_date_apk: '2025-03-11',
  external_management_plan_meeting_date_apk: '2025-03-11',
  external_management_report_meeting_date_apk: '2025-03-11',
  external_management_full_satisfaction_date_apk: '2025-03-11',
  receiver_approved_date_apk: '2025-03-11',
  external_management_third_party_satisfaction_date_apk: '2025-03-11',
  property_inventory_or_valuation_completion_date_apk: '2025-03-11',
};

const cardById = (view, id) => view.cards.find((c) => c.id === id);
const incompleteById = (view, id) => view.incomplete.find((n) => n.id === id);

// --- 1. Покрытие ситуаций ------------------------------------------------------

test('банкротство UI: каждый из тридцати трёх узлов закреплён ровно за одной ситуацией', () => {
  assert.equal(BANKRUPTCY_NODE_IDS.length, 33);
  assert.doesNotThrow(() => checkSituationCoverage(BANKRUPTCY_NODE_IDS, SITUATIONS_BANKRUPTCY));
  // Обратная сторона того же инварианта: в ситуациях нет узлов-призраков,
  // которых в apk/bankruptcy.js уже (или ещё) нет.
  assert.deepEqual(
    [...allSituationNodes(SITUATIONS_BANKRUPTCY)].sort(),
    [...BANKRUPTCY_NODE_IDS].sort(),
  );
});

test('банкротство UI: двадцать шесть ветвей ожидаемого состава, ситуация по умолчанию существует', () => {
  assert.deepEqual(
    SITUATIONS_BANKRUPTCY.map((s) => s.id),
    [
      'debtor_response',
      'creditor_claims',
      'citizen_bankruptcy',
      'subsidiary_in_case',
      'subsidiary_post_conclusion',
      'out_of_court_bankruptcy',
      'out_of_court_bankruptcy_returned',
      'out_of_court_bankruptcy_prior_completed',
      'settlement_agreement',
      'settlement_agreement_review',
      'appraiser_involvement_request',
      'claims_ruling_reasoned_request',
      'claims_ruling_reasoned_appeal',
      'enterprise_sale_payment',
      'settlement_agreement_rejection_appeal',
      'external_management_introduction_extension_appeal',
      'external_management_reduction_appeal',
      'external_management_plan_invalidation_appeal',
      'external_management_term_expiry_refusal_appeal',
      'external_management_plan',
      'external_management_plan_submission',
      'external_management_report_submission',
      'external_management_report_on_full_satisfaction',
      'external_management_handover',
      'external_management_third_party_satisfaction',
      'bankruptcy_property_sale_proposal',
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

test('банкротство UI: полный набор данных — тридцать три карточки, incomplete пуст', () => {
  const view = buildViewBankruptcy(FULL_INPUTS);
  assert.equal(view.cards.length, 33);
  assert.deepEqual(view.incomplete, []);
  assert.deepEqual(view.stubs, []);
  assert.deepEqual([...view.cards.map((c) => c.id)].sort(), [...BANKRUPTCY_NODE_IDS].sort());
  // Ни одна карточка не в состоянии отказа расчёта.
  assert.deepEqual(
    view.cards.filter((c) => c.kind === 'error'),
    [],
  );
});

test('банкротство UI: пустой ввод — ни одной карточки, все тридцать три узла в incomplete', () => {
  const view = buildViewBankruptcy({});
  assert.deepEqual(view.cards, []);
  assert.equal(view.incomplete.length, 33);
  for (const node of view.incomplete) {
    assert.equal(node.status, 'not_computed');
    assert.ok(node.missing_inputs.length > 0);
    // Подпись недостающего поля подставлена, а не осталась undefined.
    for (const field of node.missing_inputs) assert.ok(field.label);
  }
});

test('банкротство UI: срок, исчисляемый рабочими днями, показывает первый рабочий день', () => {
  // Без first_working_day непонятно, почему дата такая далёкая после
  // каникул. monthTermCard это поле теряет.
  const view = buildViewBankruptcy({
    creditor_petition_acceptance_ruling_received_date_apk: '2025-12-26',
  });
  const card = cardById(view, 'debtor_response_bankruptcy_apk');
  assert.equal(card.kind, 'term');
  assert.equal(card.unit, 'working_day');
  assert.ok(card.first_working_day, 'first_working_day должен быть на карточке');
  assert.ok(card.first_working_day > '2025-12-26');
});

test('банкротство UI: второй working_day-узел домена (требование о привлечении оценщика) — тоже показывает первый рабочий день', () => {
  const view = buildViewBankruptcy({
    inventory_results_included_date_apk: '2025-12-26',
  });
  const card = cardById(view, 'appraiser_involvement_request_apk');
  assert.equal(card.kind, 'term');
  assert.equal(card.unit, 'working_day');
  assert.ok(card.first_working_day, 'first_working_day должен быть на карточке');
  assert.equal(card.norm, 'п. 5.1 ст. 110 ФЗ № 127-ФЗ');
});

test('банкротство UI: требование о привлечении оценщика — без данных узел в incomplete с подписью поля', () => {
  const view = buildViewBankruptcy({});
  const node = incompleteById(view, 'appraiser_involvement_request_apk');
  assert.ok(node);
  assert.deepEqual(
    node.missing_inputs.map((f) => f.id),
    ['inventory_results_included_date_apk'],
  );
  assert.ok(node.missing_inputs[0].label);
});

test('банкротство UI: третий и четвёртый working_day-узлы домена (п. 2 ст. 71) — тоже показывают первый рабочий день', () => {
  const view = buildViewBankruptcy({
    claims_ruling_resolutive_part_date_apk: '2025-12-26',
    claims_ruling_reasoned_date_apk: '2025-12-26',
  });
  const request = cardById(view, 'claims_ruling_reasoned_request_apk');
  assert.equal(request.kind, 'term');
  assert.equal(request.unit, 'working_day');
  assert.ok(request.first_working_day, 'first_working_day должен быть на карточке заявления');
  assert.equal(request.norm, 'абз. 3 п. 2 ст. 71 ФЗ № 127-ФЗ');

  const appeal = cardById(view, 'claims_ruling_reasoned_appeal_apk');
  assert.equal(appeal.kind, 'term');
  assert.equal(appeal.unit, 'working_day');
  assert.ok(appeal.first_working_day, 'first_working_day должен быть на карточке мотивированной части жалобы');
  assert.equal(appeal.norm, 'абз. 4 п. 2 ст. 71 ФЗ № 127-ФЗ');
  // Разные длительности — не один и тот же узел под двумя именами.
  assert.notEqual(request.deadline, appeal.deadline);
});

test('банкротство UI: п. 2 ст. 71 — без данных оба узла в incomplete со своими полями', () => {
  const view = buildViewBankruptcy({});
  const request = incompleteById(view, 'claims_ruling_reasoned_request_apk');
  const appeal = incompleteById(view, 'claims_ruling_reasoned_appeal_apk');
  assert.ok(request);
  assert.ok(appeal);
  assert.deepEqual(
    request.missing_inputs.map((f) => f.id),
    ['claims_ruling_resolutive_part_date_apk'],
  );
  assert.deepEqual(
    appeal.missing_inputs.map((f) => f.id),
    ['claims_ruling_reasoned_date_apk'],
  );
  assert.ok(request.missing_inputs[0].label);
  assert.ok(appeal.missing_inputs[0].label);
});

test('банкротство UI: пятый working_day-узел домена (оплата по договору купли-продажи предприятия) — тоже показывает первый рабочий день', () => {
  const view = buildViewBankruptcy({
    enterprise_sale_agreement_signed_date_apk: '2025-12-26',
  });
  const card = cardById(view, 'enterprise_sale_payment_apk');
  assert.equal(card.kind, 'term');
  assert.equal(card.unit, 'working_day');
  assert.ok(card.first_working_day, 'first_working_day должен быть на карточке');
  assert.equal(card.norm, 'п. 19 ст. 110 ФЗ № 127-ФЗ');
});

test('банкротство UI: оплата по договору купли-продажи предприятия — без данных узел в incomplete с подписью поля', () => {
  const view = buildViewBankruptcy({});
  const node = incompleteById(view, 'enterprise_sale_payment_apk');
  assert.ok(node);
  assert.deepEqual(
    node.missing_inputs.map((f) => f.id),
    ['enterprise_sale_agreement_signed_date_apk'],
  );
  assert.ok(node.missing_inputs[0].label);
});

test('банкротство UI: обжалование отказа в утверждении мирового соглашения — обычная term-карточка, norm.primary на ч. 1 ст. 61', () => {
  const view = buildViewBankruptcy({
    settlement_agreement_rejection_ruling_date_apk: '2025-03-11',
  });
  const card = cardById(view, 'settlement_agreement_rejection_appeal_apk');
  assert.equal(card.kind, 'term');
  assert.equal(card.norm, 'ч. 1 ст. 61 ФЗ № 127-ФЗ');
});

test('банкротство UI: обжалование отказа в утверждении мирового соглашения — без данных узел в incomplete с подписью поля', () => {
  const view = buildViewBankruptcy({});
  const node = incompleteById(view, 'settlement_agreement_rejection_appeal_apk');
  assert.ok(node);
  assert.deepEqual(
    node.missing_inputs.map((f) => f.id),
    ['settlement_agreement_rejection_ruling_date_apk'],
  );
  assert.ok(node.missing_inputs[0].label);
});

test('банкротство UI: четыре узла обжалования внешнего управления — обычные term-карточки, у каждого norm.primary на ч. 1 ст. 61', () => {
  const view = buildViewBankruptcy({
    external_management_introduction_extension_ruling_date_apk: '2025-03-11',
    external_management_reduction_ruling_date_apk: '2025-03-11',
    external_management_plan_invalidation_ruling_date_apk: '2025-03-11',
    external_management_term_expiry_refusal_ruling_date_apk: '2025-03-11',
  });
  for (const id of [
    'external_management_introduction_extension_appeal_apk',
    'external_management_reduction_appeal_apk',
    'external_management_plan_invalidation_appeal_apk',
    'external_management_term_expiry_refusal_appeal_apk',
  ]) {
    const card = cardById(view, id);
    assert.ok(card, `карточка "${id}" не появилась`);
    assert.equal(card.kind, 'term');
    assert.equal(card.norm, 'ч. 1 ст. 61 ФЗ № 127-ФЗ');
  }
});

test('банкротство UI: четыре узла обжалования внешнего управления — без данных каждый узел в incomplete со своим полем', () => {
  const view = buildViewBankruptcy({});
  for (const [id, field] of [
    ['external_management_introduction_extension_appeal_apk', 'external_management_introduction_extension_ruling_date_apk'],
    ['external_management_reduction_appeal_apk', 'external_management_reduction_ruling_date_apk'],
    ['external_management_plan_invalidation_appeal_apk', 'external_management_plan_invalidation_ruling_date_apk'],
    ['external_management_term_expiry_refusal_appeal_apk', 'external_management_term_expiry_refusal_ruling_date_apk'],
  ]) {
    const node = incompleteById(view, id);
    assert.ok(node, `узел "${id}" не в incomplete`);
    assert.deepEqual(node.missing_inputs.map((f) => f.id), [field]);
    assert.ok(node.missing_inputs[0].label);
  }
});

test('банкротство UI: шесть узлов обязанностей внешнего управляющего — обычные term-карточки, у каждого norm на своей статье-основании', () => {
  const view = buildViewBankruptcy({
    external_management_manager_approved_date_apk: '2025-03-11',
    external_management_plan_meeting_date_apk: '2025-03-11',
    external_management_report_meeting_date_apk: '2025-03-11',
    external_management_full_satisfaction_date_apk: '2025-03-11',
    receiver_approved_date_apk: '2025-03-11',
  });
  for (const [id, norm] of [
    ['external_management_plan_development_apk', 'ст. 106 п. 1 ФЗ № 127-ФЗ'],
    ['external_management_plan_meeting_apk', 'ч. 2 ст. 107 ФЗ № 127-ФЗ'],
    ['external_management_plan_submission_apk', 'п. 4 ст. 107 ФЗ № 127-ФЗ'],
    ['external_management_report_submission_apk', 'п. 2 ст. 119 ФЗ № 127-ФЗ'],
    ['external_management_report_on_full_satisfaction_apk', 'п. 2 ст. 117 ФЗ № 127-ФЗ'],
    ['external_management_handover_apk', 'п. 3 ст. 123 ФЗ № 127-ФЗ'],
  ]) {
    const card = cardById(view, id);
    assert.ok(card, `карточка "${id}" не появилась`);
    assert.equal(card.kind, 'term');
    assert.equal(card.norm, norm);
  }
  // Три working_day-узла из шести показывают первый рабочий день.
  for (const id of [
    'external_management_plan_submission_apk',
    'external_management_report_submission_apk',
    'external_management_handover_apk',
  ]) {
    const card = cardById(view, id);
    assert.equal(card.unit, 'working_day');
    assert.ok(card.first_working_day, `у карточки "${id}" нет first_working_day`);
  }
});

test('банкротство UI: шесть узлов обязанностей внешнего управляющего — без данных каждый узел в incomplete со своим полем', () => {
  const view = buildViewBankruptcy({});
  for (const [id, field] of [
    ['external_management_plan_development_apk', 'external_management_manager_approved_date_apk'],
    ['external_management_plan_meeting_apk', 'external_management_manager_approved_date_apk'],
    ['external_management_plan_submission_apk', 'external_management_plan_meeting_date_apk'],
    ['external_management_report_submission_apk', 'external_management_report_meeting_date_apk'],
    ['external_management_report_on_full_satisfaction_apk', 'external_management_full_satisfaction_date_apk'],
    ['external_management_handover_apk', 'receiver_approved_date_apk'],
  ]) {
    const node = incompleteById(view, id);
    assert.ok(node, `узел "${id}" не в incomplete`);
    assert.deepEqual(node.missing_inputs.map((f) => f.id), [field]);
    assert.ok(node.missing_inputs[0].label);
  }
});

test('банкротство UI: узлы 1 и 2 (план внешнего управления) — один и тот же вход даёт обе карточки сразу', () => {
  const view = buildViewBankruptcy({
    external_management_manager_approved_date_apk: '2025-03-11',
  });
  const dev = cardById(view, 'external_management_plan_development_apk');
  const meeting = cardById(view, 'external_management_plan_meeting_apk');
  assert.ok(dev);
  assert.ok(meeting);
  assert.notEqual(dev.deadline, meeting.deadline);
});

test('банкротство UI: два узла особого завершения (ст. 116) — обычные term-карточки из одного якоря, у каждого своя норма', () => {
  const view = buildViewBankruptcy({
    external_management_third_party_satisfaction_date_apk: '2025-03-11',
  });
  const notification = cardById(view, 'external_management_creditor_notification_apk');
  const report = cardById(view, 'external_management_report_special_completion_apk');
  assert.ok(notification);
  assert.ok(report);
  assert.equal(notification.kind, 'term');
  assert.equal(notification.unit, 'working_day');
  assert.ok(notification.first_working_day);
  assert.equal(notification.norm, 'п. 1 ст. 116 ФЗ № 127-ФЗ');
  assert.equal(report.kind, 'term');
  assert.equal(report.unit, 'working_day');
  assert.ok(report.first_working_day);
  assert.equal(report.norm, 'п. 2 ст. 116 ФЗ № 127-ФЗ');
  assert.notEqual(notification.deadline, report.deadline);
});

test('банкротство UI: два узла особого завершения (ст. 116) — без данных оба узла в incomplete с одним и тем же полем', () => {
  const view = buildViewBankruptcy({});
  const notification = incompleteById(view, 'external_management_creditor_notification_apk');
  const report = incompleteById(view, 'external_management_report_special_completion_apk');
  assert.ok(notification);
  assert.ok(report);
  assert.deepEqual(
    notification.missing_inputs.map((f) => f.id),
    ['external_management_third_party_satisfaction_date_apk'],
  );
  assert.deepEqual(
    report.missing_inputs.map((f) => f.id),
    ['external_management_third_party_satisfaction_date_apk'],
  );
  assert.ok(notification.missing_inputs[0].label);
});

test('банкротство UI: предложения о порядке продажи имущества — обычная term-карточка, norm.primary на п. 1.1 ст. 110', () => {
  const view = buildViewBankruptcy({
    property_inventory_or_valuation_completion_date_apk: '2025-03-11',
  });
  const card = cardById(view, 'bankruptcy_property_sale_proposal_apk');
  assert.ok(card);
  assert.equal(card.kind, 'term');
  assert.equal(card.norm, 'п. 1.1 ст. 110 ФЗ № 127-ФЗ');
});

test('банкротство UI: предложения о порядке продажи имущества — без данных узел в incomplete с подписью поля', () => {
  const view = buildViewBankruptcy({});
  const node = incompleteById(view, 'bankruptcy_property_sale_proposal_apk');
  assert.ok(node);
  assert.deepEqual(
    node.missing_inputs.map((f) => f.id),
    ['property_inventory_or_valuation_completion_date_apk'],
  );
  assert.ok(node.missing_inputs[0].label);
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

// --- 4a. Карточка события (kind: 'event') --------------------------------------
//
// Первый узел домена этого вида (ст. 223.6 п. 1 — завершение внесудебного
// банкротства). Расчёт (+6 месяцев, перенос конца) уже проверен в
// test/apk-bankruptcy.test.js — здесь проверяется именно ФОРМА карточки:
// dата в поле card.date, а не card.deadline (у события нет «последнего дня
// подачи»), статус 'resolved', а не 'computed', и отсутствие полей потолков.

test("карточка события: kind 'event', дата в поле date (не deadline), статус 'resolved'", () => {
  const view = buildViewBankruptcy({
    out_of_court_bankruptcy_initiation_notice_included_date_apk: '2025-03-11',
  });
  const card = cardById(view, 'out_of_court_bankruptcy_completion_apk');
  assert.equal(card.kind, 'event');
  assert.equal(card.status, 'resolved');
  assert.equal(card.date, '2025-09-11');
  assert.equal(card.deadline, undefined);
  assert.equal(card.norm, 'п. 1 ст. 223.6 ФЗ № 127-ФЗ');
  assert.equal(card.title, 'Завершение процедуры внесудебного банкротства гражданина');
  // Не capped_term: полей потолков на карточке-событии нет и быть не должно.
  assert.equal(card.caps, undefined);
  assert.equal(card.binding, undefined);
  // Подробности перенесены с самого term-результата, как у остальных узлов.
  assert.equal(card.details.collapsed, true);
  assert.ok(card.details.logic);
});

test('карточка события: текст строки и hint — ТОЧНО тот же, что был зашит в renderEvent до обобщения', () => {
  // Регрессия на обобщение renderEvent/eventCard под card.eventTextTemplate/
  // card.hint (ст. 223.2 п. 6): до этой задачи текст «Процедура завершена
  // {date}» и hint ниже были константой самого renderEvent, теперь — данные
  // узла OUT_OF_COURT_BANKRUPTCY_COMPLETION_APK. Проверяется буква в букву,
  // а не только наличие полей — иначе перенос текста в узел мог бы незаметно
  // изменить формулировку, которую пользователь уже видел на экране.
  const view = buildViewBankruptcy({
    out_of_court_bankruptcy_initiation_notice_included_date_apk: '2025-03-11',
  });
  const card = cardById(view, 'out_of_court_bankruptcy_completion_apk');
  assert.equal(card.eventTextTemplate, 'Процедура завершена {date}');
  assert.equal(
    card.hint,
    'С этой даты гражданин считается освобождённым от дальнейшего исполнения ' +
      'требований кредиторов, указанных им в заявлении.',
  );
});

test('карточка события: перенос на рабочий день отражён в card.date', () => {
  // 05.01.2025 + 6 месяцев = 05.07.2025 — суббота, перенос на понедельник
  // (тот же сценарий, что в тесте расчёта).
  const view = buildViewBankruptcy({
    out_of_court_bankruptcy_initiation_notice_included_date_apk: '2025-01-05',
  });
  const card = cardById(view, 'out_of_court_bankruptcy_completion_apk');
  assert.equal(card.date, '2025-07-07');
});

test('карточка события: без якоря — узел в incomplete с подписью поля', () => {
  const view = buildViewBankruptcy({});
  const node = incompleteById(view, 'out_of_court_bankruptcy_completion_apk');
  assert.ok(node);
  assert.equal(node.kind, 'event');
  assert.deepEqual(
    node.missing_inputs.map((f) => f.id),
    ['out_of_court_bankruptcy_initiation_notice_included_date_apk'],
  );
  assert.ok(node.missing_inputs[0].label);
});

// --- 4b. Второй узел-событие: право на повторную подачу (п. 6 ст. 223.2) -------
//
// Тот же билдер eventCard, что и у ст. 223.6 п. 1 (проверено фактчеком до
// реализации) — здесь проверяется, что ВТОРОЙ узел получает СВОИ текст и
// hint, а не унаследованные от первого по ошибке.

test("карточка права на повторную подачу: kind 'event', свои дата/норма/текст, не спутаны с узлом ст. 223.6", () => {
  const view = buildViewBankruptcy({
    out_of_court_bankruptcy_return_date_apk: '2025-03-11',
  });
  const card = cardById(view, 'out_of_court_bankruptcy_reapplication_apk');
  assert.equal(card.kind, 'event');
  assert.equal(card.status, 'resolved');
  assert.equal(card.date, '2025-04-11');
  assert.equal(card.deadline, undefined);
  assert.equal(card.norm, 'п. 6 ст. 223.2 ФЗ № 127-ФЗ');
  assert.equal(card.title, 'Право на повторную подачу заявления о внесудебном банкротстве');
  assert.equal(card.eventTextTemplate, 'Право на повторную подачу — с {date}');
  assert.equal(
    card.hint,
    'С этой даты гражданин вправе повторно обратиться в МФЦ с заявлением о ' +
      'признании его банкротом во внесудебном порядке.',
  );
  // Не спутан с текстом соседнего узла-события.
  assert.notEqual(card.eventTextTemplate, 'Процедура завершена {date}');
});

test('карточка права на повторную подачу: перенос на рабочий день отражён в card.date', () => {
  // 01.02.2025 + 1 месяц = 01.03.2025 — суббота, перенос на понедельник.
  const view = buildViewBankruptcy({
    out_of_court_bankruptcy_return_date_apk: '2025-02-01',
  });
  const card = cardById(view, 'out_of_court_bankruptcy_reapplication_apk');
  assert.equal(card.date, '2025-03-03');
});

test('карточка права на повторную подачу: без якоря — узел в incomplete с подписью поля', () => {
  const view = buildViewBankruptcy({});
  const node = incompleteById(view, 'out_of_court_bankruptcy_reapplication_apk');
  assert.ok(node);
  assert.equal(node.kind, 'event');
  assert.deepEqual(
    node.missing_inputs.map((f) => f.id),
    ['out_of_court_bankruptcy_return_date_apk'],
  );
  assert.ok(node.missing_inputs[0].label);
});

// --- 4c. Третий узел-событие: право после завершения предыдущей процедуры
// (п. 8 ст. 223.2) ---------------------------------------------------------------
//
// Тот же общий билдер, что и у двух предыдущих узлов-событий — подключился
// без единой правки в apk/bankruptcy-views.js/apk/bankruptcy-app.js. Здесь
// проверяется, что ТРЕТИЙ узел получает свои текст/hint, не спутанные ни с
// одним из двух других.

test("карточка права на повторную подачу после предыдущей процедуры: kind 'event', свои дата/норма/текст", () => {
  const view = buildViewBankruptcy({
    out_of_court_bankruptcy_prior_procedure_end_date_apk: '2020-03-11',
  });
  const card = cardById(view, 'out_of_court_bankruptcy_reapplication_after_prior_apk');
  assert.equal(card.kind, 'event');
  assert.equal(card.status, 'resolved');
  assert.equal(card.date, '2025-03-11');
  assert.equal(card.deadline, undefined);
  assert.equal(card.norm, 'п. 8 ст. 223.2 ФЗ № 127-ФЗ');
  assert.equal(
    card.title,
    'Право на повторную подачу заявления о внесудебном банкротстве после ' +
      'завершения предыдущей процедуры банкротства',
  );
  assert.equal(card.eventTextTemplate, 'Право на подачу нового заявления — с {date}');
  assert.equal(
    card.hint,
    'С этой даты гражданин вправе повторно подать заявление о признании его ' +
      'банкротом во внесудебном порядке.',
  );
  // Не спутан с текстом двух других узлов-событий этого домена.
  assert.notEqual(card.eventTextTemplate, 'Процедура завершена {date}');
  assert.notEqual(card.eventTextTemplate, 'Право на повторную подачу — с {date}');
});

test('карточка права после предыдущей процедуры: перенос на рабочий день отражён в card.date', () => {
  // 01.02.2020 + 5 лет = 01.02.2025 — суббота, перенос на понедельник.
  const view = buildViewBankruptcy({
    out_of_court_bankruptcy_prior_procedure_end_date_apk: '2020-02-01',
  });
  const card = cardById(view, 'out_of_court_bankruptcy_reapplication_after_prior_apk');
  assert.equal(card.date, '2025-02-03');
});

test('карточка права после предыдущей процедуры: без якоря — узел в incomplete с подписью поля', () => {
  const view = buildViewBankruptcy({});
  const node = incompleteById(view, 'out_of_court_bankruptcy_reapplication_after_prior_apk');
  assert.ok(node);
  assert.equal(node.kind, 'event');
  assert.deepEqual(
    node.missing_inputs.map((f) => f.id),
    ['out_of_court_bankruptcy_prior_procedure_end_date_apk'],
  );
  assert.ok(node.missing_inputs[0].label);
});

// --- 4d. Карточка окна (kind: 'window') ----------------------------------------
//
// Первый узел домена этого вида (п. 2 ст. 158 — заявление об утверждении
// мирового соглашения). Расчёт границ проверен в test/apk-bankruptcy.test.js —
// здесь проверяется ФОРМА карточки: две границы в earliest_filing_date/
// latest_filing_date (не deadline, не from/to) и отсутствие state/note, которые
// у образца из apk/views.js есть, а этому узлу не нужны.

test("карточка окна: kind 'window', обе границы в своих полях, без deadline", () => {
  const view = buildViewBankruptcy({
    settlement_agreement_conclusion_date_apk: '2025-03-11',
  });
  const card = cardById(view, 'settlement_agreement_approval_application_apk');
  assert.equal(card.kind, 'window');
  assert.equal(card.status, 'computed');
  assert.equal(card.earliest_filing_date, '2025-03-18');
  assert.equal(card.latest_filing_date, '2025-03-25');
  assert.equal(card.deadline, undefined);
  assert.equal(card.norm, 'п. 2 ст. 158 ФЗ № 127-ФЗ');
  assert.equal(card.title, 'Заявление об утверждении мирового соглашения');
  // Не term и не capped_term: ни дедлайна, ни потолков на карточке-окне нет.
  assert.equal(card.caps, undefined);
  assert.equal(card.binding, undefined);
  // Состояний окна у этого узла не бывает — поля сознательно отсутствуют.
  assert.equal(card.state, undefined);
  assert.equal(card.note, undefined);
  // Якорь — для строки «от чего посчитана граница» на странице.
  assert.deepEqual(card.anchors, {
    settlement_agreement_conclusion_date_apk: '2025-03-11',
  });
  assert.equal(card.details.collapsed, true);
  assert.ok(card.details.logic);
});

test('карточка окна: первый рабочий день течения общий для обеих границ', () => {
  const view = buildViewBankruptcy({
    settlement_agreement_conclusion_date_apk: '2025-12-26',
  });
  const card = cardById(view, 'settlement_agreement_approval_application_apk');
  assert.equal(card.first_working_day, '2025-12-29');
  assert.equal(card.earliest_filing_date, '2026-01-14');
  assert.equal(card.latest_filing_date, '2026-01-21');
});

test('карточка окна: без якоря — узел в incomplete с подписью поля', () => {
  const view = buildViewBankruptcy({});
  const node = incompleteById(view, 'settlement_agreement_approval_application_apk');
  assert.ok(node);
  assert.equal(node.kind, 'window');
  assert.deepEqual(
    node.missing_inputs.map((f) => f.id),
    ['settlement_agreement_conclusion_date_apk'],
  );
  assert.ok(node.missing_inputs[0].label);
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
  assert.equal(view.cards.length, 33);
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
