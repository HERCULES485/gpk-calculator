// Экспорт сроков АПК в .ics — предметная обвязка над генератором ядра.
//
// Сама механика iCalendar (сборка, экранирование, свёртка строк, VALARM) живёт
// в core/export/ics.js и о АПК ничего не знает. Здесь — только предметное:
// идентификаторы продукта, таблица напоминаний и реестр узлов (все три из
// apk/term-registry.js) подставляются в общие функции ядра.
//
// Обёртки сохраняют сигнатуры ядра (buildICS(terms, options),
// icsTermsFromView(view), exportableCards(view)), поэтому вызывающий код —
// apk/app.js и тесты — от параметризации ядра не зависит. Тот же принцип, что
// у src/ics.js для ГПК: логика экспорта — отдельная ответственность, ей нужен
// отдельный файл, а не место в app.js.

import {
  buildICS as coreBuildICS,
  icsTermsFromView as coreIcsTermsFromView,
  exportableCards as coreExportableCards,
} from '../core/export/ics.js';
import { TERM_REGISTRY_APK, ICS_PRODID, ICS_UID_DOMAIN, reminderOffsets } from './term-registry.js';

/**
 * Строит содержимое .ics по срокам АПК: та же сигнатура, что и у ядра,
 * предметные параметры подставляются здесь.
 * @param {Array<object>} terms
 * @param {{referenceDate?: string, now?: Date|string}} [options]
 * @returns {string}
 */
export function buildICS(terms, options = {}) {
  return coreBuildICS(terms, {
    ...options,
    prodId: ICS_PRODID,
    uidDomain: ICS_UID_DOMAIN,
    offsets: reminderOffsets,
  });
}

/**
 * Экспортируемые сроки из структуры отображения — по реестру узлов АПК.
 * @param {{cards: object[]}} view — результат buildView.
 * @returns {Array<object>}
 */
export function icsTermsFromView(view) {
  return coreIcsTermsFromView(view, TERM_REGISTRY_APK);
}

/**
 * Карточки, которые имеет смысл переносить в календарь — по реестру узлов АПК.
 * @param {{cards: object[]}} view
 * @returns {Array<{card: object, meta: object}>}
 */
export function exportableCards(view) {
  return coreExportableCards(view, TERM_REGISTRY_APK);
}
