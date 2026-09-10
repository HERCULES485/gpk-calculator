// Механика исключения периода из срока: период не засчитывается в срок, но
// сам срок не перезапускается. Принципиально иная арифметика, чем у
// interruption.js: там якорь сдвигается на дату события и всё прошедшее время
// сгорает, здесь время до и после периода складывается, а сам период выпадает
// из счёта — итоговый дедлайн отодвигается ровно на суммарную длину периодов.
//
// Предметно-независимо: не знает ни оснований исключения (допустимые типы
// передаются параметром), ни текста нормы и логики, которыми помечается
// результат (тоже параметр) — у разных процессуальных законов перечень
// оснований и формулировки различаются, поэтому конкретика сюда не зашивается.

import { addDays } from './engine.js';
import { toISO } from './term.js';
import { shiftIfNonWorking, toISODate } from '../calendar/calendar.js';

const DAY_MS = 86_400_000;

function toUTC(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

// Длина периода в календарных днях: end − start, БЕЗ +1.
//
// ЭТО АРХИТЕКТУРНОЕ ДОПУЩЕНИЕ, а не прямая формула из текста нормы: ни ч. 2,
// ни ч. 5 ст. 321 АПК формулу подсчёта явно не дают. Обоснование: и ст. 116
// АПК («со дня возобновления... течение... продолжается»), и ст. 42 ч. 2 /
// ст. 22 ч. 4 ФЗ № 229-ФЗ («возобновляется со дня возобновления») говорят,
// что день окончания/возобновления уже снова считается текущим днём срока, а
// не последним исключённым — симметрично дню начала по уже принятой в этой
// кодовой базе конвенции «срок начинает течь на следующий день после
// события» (ч. 4 ст. 113 АПК).
function periodDays(startISO, endISO) {
  return Math.round((toUTC(endISO) - toUTC(startISO)) / DAY_MS);
}

// Сортировка периодов по дате начала по возрастанию; записи без даты начала —
// в конец. Порядок ввода не гарантирован (периоды вспоминают вразнобой).
function compareByStart(a, b) {
  if (a.start == null) return b.start == null ? 0 : 1;
  if (b.start == null) return -1;
  if (a.start < b.start) return -1;
  return a.start > b.start ? 1 : 0;
}

/**
 * Исключаемые периоды в расчётной форме, отсортированные по дате начала.
 *
 * Период помечается ignored, если учесть его нельзя: не указана граница
 * периода, конец раньше начала либо (там, где основание проверяется)
 * неизвестный тип. Такие записи не выбрасываются молча: они остаются в
 * истории с причиной, чтобы было видно, что именно не принято в расчёт.
 *
 * @param {Array<{type?:string, start:string, end:string}>|null|undefined} periods
 * @param {{validTypeIds?:Set<string>, fixedType?:string}} opts —
 *   validTypeIds: основание берётся из записи и проверяется по этому набору;
 *   fixedType: основание одно на весь список и на входе не ожидается вовсе
 *   (проставляется здесь), проверять нечего.
 * @returns {Array<{type:string|null, start:string|null, end:string|null,
 *   days:number|null, ignored?:boolean, ignored_reason?:string}>}
 */
export function exclusionEvents(periods, opts = {}) {
  if (!Array.isArray(periods) || periods.length === 0) return [];
  const { validTypeIds = null, fixedType = null } = opts;
  return periods
    .map((raw) => {
      const type = fixedType ?? raw?.type ?? null;
      const start = toISO(raw?.start);
      const end = toISO(raw?.end);
      const ignore = (reason) => ({
        type,
        start,
        end,
        days: null,
        ignored: true,
        ignored_reason: reason,
      });
      if (start == null) return ignore('no_start_date');
      if (end == null) return ignore('no_end_date');
      if (end < start) return ignore('end_before_start');
      if (validTypeIds != null && !validTypeIds.has(type)) return ignore('unknown_type');
      return { type, start, end, days: periodDays(start, end) };
    })
    .sort(compareByStart);
}

// Пересечение принятых периодов: границы полуоткрыты — [start, end), потому
// что день окончания периода уже снова считается днём течения срока (см.
// periodDays). Поэтому стык встык (end одного = start другого) пересечением
// НЕ считается, а любое реальное наложение — считается.
//
// При пересечении расчёт останавливается: какой из двух периодов «правильный»
// — вопрос к данным, а не к арифметике; молча выбросить один из них значило бы
// изменить юридический результат без ведома вызывающего кода. Тихое
// суммирование тоже недопустимо — одни и те же дни были бы вычтены дважды.
function assertNoOverlap(accepted) {
  const sorted = [...accepted].sort(compareByStart);
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (cur.start < prev.end) {
      throw new Error(
        `Исключаемые периоды пересекаются: ${prev.start}–${prev.end} и ${cur.start}–${cur.end}. ` +
          'Дни были бы вычтены дважды; уточните границы периодов.',
      );
    }
  }
}

/**
 * Суммарная длина всех принятых периодов в днях. Периоды из разных списков
 * (разных частей статьи) СКЛАДЫВАЮТСЯ, а не выбирается один — это обратное
 * правило по сравнению с механикой перерыва, где из нескольких событий
 * учитывается только последнее. Непересечение проверяется по объединённому
 * списку: списки питают одну и ту же сумму дней, и наложение между ними так же
 * даёт двойной счёт, как и внутри одного списка.
 *
 * @param {Array<Array<object>>} eventLists — списки из exclusionEvents.
 * @returns {number}
 * @throws {Error} при пересечении принятых периодов.
 */
export function totalExcludedDays(eventLists) {
  const accepted = eventLists.flat().filter((e) => !e.ignored);
  assertNoOverlap(accepted);
  return accepted.reduce((sum, e) => sum + e.days, 0);
}

/**
 * Исключение периодов поверх УЖЕ посчитанного срока: дедлайн отодвигается на
 * суммарную длину периодов, после чего последний день заново проверяется на
 * перенос через нерабочий (после прибавления дней он мог попасть на выходной
 * или праздник).
 *
 * ЭТО АРХИТЕКТУРНОЕ ДОПУЩЕНИЕ: порядок «сначала перерыв, потом исключение
 * периода поверх готового дедлайна» — решение по аналогии с общими принципами
 * гл. 10 АПК; статья не описывает явно взаимодействие механики перерыва и
 * механики исключения периода, когда обе применимы к одному сроку.
 *
 * Исключённых дней нет — результат не трогается и новых полей в нём не
 * появляется (как у перерыва, где полей нет при отсутствии событий).
 *
 * @param {object|null} result — результат computeSimpleTerm/computeInterruptibleTerm.
 * @param {Array<Array<object>>} eventLists
 * @param {{norm:string, logic:string}} config — норма и логика, которыми
 *   помечается результат; предметный модуль решает, что туда положить
 *   (в частности, какие части статьи реально сработали).
 * @returns {object|null}
 */
export function withExclusions(result, eventLists, config) {
  if (result == null) return result;
  const days = totalExcludedDays(eventLists);
  if (days === 0) return result;
  const raw = toISODate(addDays(result.deadline, days));
  const deadline = shiftIfNonWorking(raw);
  return {
    ...result,
    // Дедлайн до исключения периодов — как base_anchor у перерыва: без него
    // история периодов не читается, непонятно, от чего отсчитан сдвиг.
    pre_exclusion_deadline: result.deadline,
    raw_deadline: raw,
    deadline,
    shifted: deadline !== raw,
    excluded_periods: eventLists.flat().sort(compareByStart),
    excluded_days: days,
    exclusion_norm: config.norm,
    exclusion_logic: config.logic,
  };
}
