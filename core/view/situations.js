// Механика ситуаций — предметно-независимая часть src/situations.js.
//
// Ничего не знает про ГПК, АПК или конкретные узлы: принимает массив ситуаций
// (той же формы, что и SITUATIONS у предметного модуля — { id, label, fields,
// nodes, primary_field? }) параметром и работает только с ним. Сами данные
// (какие ситуации существуют и какие узлы/поля к ним относятся) — предметные
// и остаются в модуле кодекса (см. docs/core-extraction-audit.md, шаг 9).

/** Ситуация по id; неизвестный id (включая undefined) откатывается к первой. */
export function situationById(id, situations) {
  return situations.find((s) => s.id === id) ?? situations[0];
}

/** Все узлы всех ситуаций — в порядке ситуаций и порядке внутри каждой. */
export function allSituationNodes(situations) {
  return situations.flatMap((s) => s.nodes);
}

/** Все поля ввода, привязанные к ситуациям (без статического поля общей ветви). */
export function allSituationFields(situations) {
  return situations.flatMap((s) => s.fields);
}

/**
 * Инвариант разбиения: каждый узел из nodeIds закреплён ровно за одной
 * ситуацией.
 *
 * nodeIds — список id узлов, которые реально существуют (например, узлы,
 * выдаваемые buildView предметного модуля); situations — массив ситуаций той
 * же формы, что и SITUATIONS. Бросает ошибку на первом узле, закреплённом
 * более чем за одной ситуацией сразу, либо (если дублей нет) на первом узле
 * из nodeIds, не закреплённом ни за одной. Ничего не знает о происхождении
 * ни узлов, ни ситуаций — годится для любого предметного модуля со своим
 * набором SITUATIONS.
 */
export function checkSituationCoverage(nodeIds, situations) {
  const owner = new Map();
  for (const situation of situations) {
    for (const nodeId of situation.nodes) {
      if (owner.has(nodeId)) {
        throw new Error(
          `узел "${nodeId}" закреплён за двумя ситуациями сразу: "${owner.get(nodeId)}" и "${situation.id}"`,
        );
      }
      owner.set(nodeId, situation.id);
    }
  }
  for (const nodeId of nodeIds) {
    if (!owner.has(nodeId)) {
      throw new Error(`узел "${nodeId}" не закреплён ни за одной ситуацией`);
    }
  }
}
