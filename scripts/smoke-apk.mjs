// Браузерная smoke-проверка страницы АПК (apk.html) — тот же подход, что и у
// scripts/smoke.mjs для ГПК: грузит страницу в реальном браузере и падает при
// любой ошибке в консоли, необработанном исключении или показе .fatal.
//
// Отдельный файл, а не ветка в smoke.mjs: страницы независимы (своя разметка,
// свой app.js), и падение одной не должно прятать состояние другой.
//
// Здесь же проверяются сценарии интерфейса, которых `node --test` не видит: он
// не исполняет модули в браузере, а весь повторяемый ввод (списки перерывов и
// периодов, маска даты, перерисовка) живёт только в apk/app.js.
//
// Запуск: node scripts/smoke-apk.mjs  (нужен пакет playwright и chromium).
// Путь к браузеру можно задать через PW_CHROMIUM_PATH.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

const server = createServer(async (req, res) => {
  const rel = normalize(decodeURIComponent(req.url.split('?')[0]));
  // Браузер сам запрашивает /favicon.ico — отдаём пустышку, чтобы 404 фавикона
  // не выглядел как ошибка загрузки ресурса.
  if (rel === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }
  try {
    const file = join(ROOT, rel === '/' ? 'apk.html' : rel);
    if (!file.startsWith(ROOT)) throw new Error('path escape');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});
await new Promise((resolve) => server.listen(0, resolve));
const port = server.address().port;

const problems = [];
const launchOpts = process.env.PW_CHROMIUM_PATH
  ? { executablePath: process.env.PW_CHROMIUM_PATH }
  : {};
const browser = await chromium.launch(launchOpts);
const page = await browser.newPage();
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`console error: ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

const settle = () => page.waitForTimeout(200);
const check = (ok, message) => {
  if (!ok) problems.push(message);
};

async function chooseSituation(id) {
  // Категория «обжалование отдельных процессуальных определений» свёрнута по
  // умолчанию (<details> без open) — радиокнопки внутри невидимы для
  // Playwright, пока секцию не раскрыть (тот же фикс, что у
  // scripts/smoke-bankruptcy.mjs, PR #65).
  const input = page.locator(`#situation input[value="${id}"]`);
  const details = input.locator('xpath=ancestor::details[1]');
  if (await details.count()) await details.evaluate((node) => { node.open = true; });
  await input.check();
  await settle();
}

await page.goto(`http://localhost:${port}/apk.html`, { waitUntil: 'networkidle' });

// --- Инициализация ------------------------------------------------------------

check((await page.locator('.fatal').count()) === 0, '.fatal показан — страница не инициализировалась');
check(
  (await page.locator('#in-decision_full_text_date').count()) === 1,
  'нет основного поля даты решения',
);
check(
  (await page.locator('#situation input[type=radio]').count()) === 35,
  'переключатель ситуаций отрисован не на тридцать пять ветвей',
);

// --- 1. Полный цикл: дата решения → карточка апелляционной жалобы --------------

await page.fill('#in-decision_full_text_date', '11.03.2025');
await settle();
const appealCard = page.locator('#results .card').filter({ hasText: 'Апелляционная жалоба' });
check((await appealCard.count()) === 1, 'карточка апелляционной жалобы не появилась');
if (await appealCard.count()) {
  const deadline = (await appealCard.locator('.deadline').first().innerText()).trim();
  check(deadline === '11.04.2025', `ждали дедлайн 11.04.2025, получили «${deadline}»`);
}

// --- Печатный список: дата не пустая (регрессия) --------------------------------
//
// printItem() брал isoToRu(item.deadline) — у результата caseSummaryItems() нет
// поля deadline (дата приходит в поле date, уже отформатированная), поэтому
// печаталось isoToRu(undefined) === '', и распечатка сроков выходила без дат.
// web/app.js (ГПК) и apk/bankruptcy-app.js этой ошибки не содержат — сверено при
// починке. Кнопка активируется тем же currentSummary, что заполняет печатный
// список, поэтому проверка запускается сразу на карточке из сценария 1.
check((await page.locator('#print-terms').count()) === 1, 'нет кнопки «Распечатать»');
check(
  (await page.locator('#print-terms').isDisabled()) === false,
  'кнопка «Распечатать» заблокирована при посчитанном сроке',
);
const printDates = await page.locator('#print-list .print-date').allInnerTexts();
check(printDates.length >= 1, 'печатный список пуст при посчитанном сроке');
check(
  printDates.every((d) => /^\d{2}\.\d{2}\.\d{4}$/.test(d.trim())),
  `в печатном списке дата пустая или не в формате ДД.ММ.ГГГГ: ${JSON.stringify(printDates)}`,
);
check(
  printDates.some((d) => d.trim() === '11.04.2025'),
  `дедлайн апелляционной жалобы не попал в печатный список: ${JSON.stringify(printDates)}`,
);

// --- Формулировка ссылки на уже показанное поле (задача UI.5, п. 2) -----------
//
// subject_category — общее поле трёх узлов восстановления одной ветви; оно
// уже отрисовано блоком «Дополнительные данные» (renderSituationFields), и все
// три incomplete-карточки восстановления должны ссылаться на него текстом, а
// не рисовать поле трижды. Формулировка не должна утверждать направление
// («выше»/«ниже») — сам блок физически стоит и до, и после карточек результатов
// в зависимости от ситуации.
const restorationInvites = page.locator('.invite').filter({ hasText: 'восстановлен' });
check((await restorationInvites.count()) >= 1, 'карточки восстановления не найдены среди неполных узлов');
const inviteTexts = await restorationInvites.allInnerTexts();
for (const text of inviteTexts) {
  check(!text.includes('выше'), `формулировка ссылки на поле всё ещё утверждает направление: «${text}»`);
}
check(
  inviteTexts.some((t) => t.includes('уже есть в этой форме')),
  'ссылка на уже показанное поле subject_category не найдена ни на одной карточке восстановления',
);

// --- 6. Карточка «норма не применяется» ---------------------------------------
//
// Категория заявителя, которой ч. 2 ст. 291.2 не знает: два узла восстановления
// считаются, третий показывает причину вместо даты.
await page.selectOption('#in-subject_category', 'participating_improperly_notified');
await settle();
await page.fill('#in-learned_of_violation_date', '20.05.2025');
await settle();
const notApplicable = page.locator('#results .card.not-applicable');
check((await notApplicable.count()) === 1, 'карточка «срок не исчисляется» не показана');
if (await notApplicable.count()) {
  const reason = await notApplicable.locator('.na-reason').innerText();
  check(reason.includes('291.2'), `причина неприменимости не объясняет норму: «${reason}»`);
}

// --- 7. Переключение ситуации: видны только узлы выбранной ветви ---------------

await chooseSituation('rulings');
check(
  (await page.locator('#results .card').filter({ hasText: 'Апелляционная жалоба' }).count()) === 0,
  'после переключения ветви карточка чужого узла осталась на экране',
);
await page.fill('#in-first_instance_ruling_date', '01.04.2025');
await settle();
const rulingCard = page
  .locator('#results .card')
  .filter({ hasText: 'определение суда первой инстанции' });
check((await rulingCard.count()) === 1, 'карточка частной жалобы на определение не появилась');

// --- Ветвь исполнительного листа: видимость альтернативных дат (задача UI.5, п. 1) ---
//
// Три даты якоря (ч. 1 ст. 321) взаимоисключающие: расчёту нужна ровно одна,
// та, что соответствует case_type. Остальные две не просто визуально скрыты —
// их не должно быть в DOM вовсе, иначе в них можно вписать значение, которое
// никогда не попадёт в расчёт, и это будет выглядеть как забытое поле.

await chooseSituation('enforcement');
const ENFORCEMENT_DATE_IDS = [
  'in-entry_into_force_date',
  'in-immediate_execution_decision_date',
  'in-deferred_installment_end_date',
];
async function visibleEnforcementDateIds() {
  const present = [];
  for (const id of ENFORCEMENT_DATE_IDS) {
    if ((await page.locator(`#${id}`).count()) === 1) present.push(id);
  }
  return present;
}

check(
  (await visibleEnforcementDateIds()).length === 0,
  'без выбранного case_type должно быть не показано ни одной из трёх дат',
);

await page.selectOption('#in-case_type', 'entry_into_force');
await settle();
check(
  JSON.stringify(await visibleEnforcementDateIds()) === JSON.stringify(['in-entry_into_force_date']),
  `при case_type=entry_into_force должно быть видно только entry_into_force_date, видно: ${JSON.stringify(await visibleEnforcementDateIds())}`,
);

await page.selectOption('#in-case_type', 'immediate_execution');
await settle();
check(
  JSON.stringify(await visibleEnforcementDateIds()) ===
    JSON.stringify(['in-immediate_execution_decision_date']),
  `при case_type=immediate_execution должно быть видно только immediate_execution_decision_date, видно: ${JSON.stringify(await visibleEnforcementDateIds())}`,
);

await page.selectOption('#in-case_type', 'deferred_installment_end');
await settle();
check(
  JSON.stringify(await visibleEnforcementDateIds()) ===
    JSON.stringify(['in-deferred_installment_end_date']),
  `при case_type=deferred_installment_end должно быть видно только deferred_installment_end_date, видно: ${JSON.stringify(await visibleEnforcementDateIds())}`,
);

// --- Ветвь исполнительного листа: базовый расчёт -------------------------------

await page.selectOption('#in-case_type', 'entry_into_force');
await settle();
await page.fill('#in-entry_into_force_date', '18.06.2022');
await settle();
const ilCard = page
  .locator('#results .card')
  .filter({ hasText: 'Предъявление исполнительного листа к исполнению (АПК)' });
check((await ilCard.count()) === 1, 'карточка предъявления исполнительного листа не найдена');
const ilDeadline = async () => (await ilCard.locator('.deadline').first().innerText()).trim();
check((await ilDeadline()) === '18.06.2025', `базовый срок предъявления посчитан неверно: ${await ilDeadline()}`);

// --- 2. Виджет приостановления (ч. 2 ст. 321) ---------------------------------

await page.getByRole('button', { name: 'Добавить приостановление' }).click();
await settle();
check((await page.locator('#in-suspension-0-start').count()) === 1, 'строка приостановления не добавилась');
// Одной даты мало: пока вторая не введена, период в расчёт не идёт.
await page.fill('#in-suspension-0-start', '01.03.2023');
await settle();
check(
  (await ilDeadline()) === '18.06.2025',
  'период учтён при одной заполненной дате — должен идти в расчёт только целиком',
);
await page.fill('#in-suspension-0-end', '10.05.2023');
await settle();
check(
  (await ilDeadline()) === '27.08.2025',
  `после приостановления (70 дн.) ждали 27.08.2025, получили ${await ilDeadline()}`,
);
check(
  (await page.locator('.period-days').first().innerText()).includes('70'),
  'длина периода не показана в строке ввода',
);
check(
  (await ilCard.locator('.interruption-history').count()) >= 1,
  'история исключённых периодов на карточке не показана',
);

// --- 3. Виджет ч. 5: основание + даты ------------------------------------------

await page.getByRole('button', { name: 'Добавить период' }).click();
await settle();
await page.selectOption('#in-exclusion-0-type', 'claimant_obstruction_apk');
await page.fill('#in-exclusion-0-start', '01.06.2023');
await page.fill('#in-exclusion-0-end', '15.08.2023');
await settle();
// 70 + 75 = 145 дней от 18.06.2025.
check(
  (await ilDeadline()) === '10.11.2025',
  `после двух периодов (145 дн.) ждали 10.11.2025, получили ${await ilDeadline()}`,
);
const history = await ilCard.locator('.interruption-history').last().innerText();
check(
  history.includes('Действия взыскателя, препятствующие исполнению'),
  'выбранное основание ч. 5 не отражено в истории периодов',
);
check(history.includes('Исключено 145'), `итоговая строка исключения не показана: «${history}»`);

// --- 4. Конец раньше начала: инлайн-ошибка, в расчёт не идёт --------------------

await page.fill('#in-exclusion-0-start', '15.09.2023');
await settle();
check((await page.locator('.period-row-error').count()) === 1, 'ошибка «конец раньше начала» не показана');
check(
  (await ilDeadline()) === '27.08.2025',
  `строка с ошибкой попала в расчёт: ${await ilDeadline()}`,
);

// --- 5. Пересечение периодов: карточка-ошибка ----------------------------------

await page.fill('#in-exclusion-0-start', '09.05.2023'); // залезает в приостановление
await settle();
const errorCard = page.locator('#results .card.calc-error');
check((await errorCard.count()) === 1, 'карточка ошибки расчёта не показана');
if (await errorCard.count()) {
  const text = await errorCard.locator('.calc-error-text').innerText();
  check(text.includes('пересекаются'), `текст ошибки не объясняет причину: «${text}»`);
  // Списки должны остаться на экране — иначе исправить пересечение негде.
  check(
    (await errorCard.locator('#in-exclusion-0-start').count()) === 1,
    'при отказе расчёта списки периодов исчезли — исправить ввод невозможно',
  );
}
// Соседние карточки ветви продолжают рендериться.
check(
  (await page.locator('#results .card, #results .invite').count()) >= 2,
  'после ошибки на одном узле пропали остальные карточки ветви',
);

// --- 8. section.primary рисует РЕАЛЬНОЕ поле текущей ветви (регрессия БАГ.1) ---
//
// До этой правки section.primary была статической разметкой, жёстко привязанной
// к decision_full_text_date: у ветвей с ДРУГИМ primary_field (nadzor,
// court_costs, reasonable_term_compensation) поле-якорь нигде не появлялось —
// пользователь не мог его ввести, хотя incomplete-карточка утверждала обратное
// («уже есть в этой форме»). Ловит именно этот класс бага: для каждой ветви со
// своим primary_field в DOM должен быть input с ИМЕННО ЕЁ id, а не всегда
// #in-decision_full_text_date.
const PRIMARY_FIELD_BRANCHES = [
  ['decision_chain', 'decision_full_text_date'],
  ['nadzor', 'last_contested_act_entry_into_force_date'],
  ['court_costs', 'last_judgment_on_merits_entry_into_force_date'],
  ['reasonable_term_compensation', 'last_judgment_entry_into_force_date'],
  ['simplified_proceedings', 'simplified_proceedings_decision_date'],
  ['court_order', 'court_order_copy_received_date_apk'],
  ['nonnormative_act_challenge', 'nonnormative_act_violation_known_date'],
  ['administrative_liability_challenge', 'administrative_decision_copy_received_date_apk'],
  ['admin_liability_appeal', 'first_instance_decision_date_apk'],
  ['settlement_approval_cassation', 'settlement_approval_ruling_date_apk'],
  ['arbitral_enforcement_writ_cassation', 'arbitral_enforcement_writ_ruling_date_apk'],
  ['foreign_judgment_enforcement_cassation', 'foreign_judgment_enforcement_ruling_date_apk'],
  ['foreign_judgment_recognition_cassation', 'foreign_judgment_recognition_ruling_date_apk'],
  ['case_transfer_jurisdiction_appeal', 'case_transfer_jurisdiction_ruling_date_apk'],
  ['coplaintiff_codefendant_refusal_appeal', 'coplaintiff_codefendant_refusal_ruling_date_apk'],
  ['third_party_claim_refusal_appeal', 'third_party_claim_refusal_ruling_date_apk'],
  ['third_party_no_claim_refusal_appeal', 'third_party_no_claim_refusal_ruling_date_apk'],
  ['case_consolidation_severance_refusal_appeal', 'case_consolidation_severance_refusal_ruling_date_apk'],
  ['special_ruling_appeal', 'special_ruling_issued_date_apk'],
];
for (const [situationId, fieldId] of PRIMARY_FIELD_BRANCHES) {
  await chooseSituation(situationId);
  check(
    (await page.locator(`#in-${fieldId}`).count()) === 1,
    `ветвь "${situationId}": основное поле #in-${fieldId} не найдено в DOM`,
  );
  await page.fill(`#in-${fieldId}`, '11.03.2025');
  await settle();
  check(
    (await page.locator(`#in-${fieldId}`).inputValue()) === '11.03.2025',
    `ветвь "${situationId}": введённое значение в #in-${fieldId} не сохранилось`,
  );
}

// --- 9. Ветви без живого прогона: полный расчёт, а не только присутствие поля -
//
// PRIMARY_FIELD_BRANCHES выше проверяет только наличие/сохранение поля — этого
// достаточно для регрессии БАГ.1, но не показывает, что карточка РЕЗУЛЬТАТА
// вообще появляется на экране и дата в ней не NaN/undefined/Invalid Date.
// Ниже — 12 ветвей с одним term-узлом каждая (общий срок обжалования ч. 3
// ст. 188 АПК РФ или иная своя норма без восстановления), которые до этой
// правки не выбирались в браузере вообще ни одним smoke-тестом.
const isValidDeadlineText = (t) => /^\d{2}\.\d{2}\.\d{4}$/.test(t.trim());

const SINGLE_NODE_BRANCHES = [
  ['injunction_refusal_appeal', 'injunction_refusal_ruling_date_apk'],
  ['counter_security_ruling_appeal', 'counter_security_ruling_date_apk'],
  ['injunction_cancellation_ruling_appeal', 'injunction_cancellation_ruling_date_apk'],
  ['claim_refusal_appeal', 'claim_refusal_ruling_date_apk'],
  ['deadline_restoration_refusal_appeal', 'deadline_restoration_refusal_ruling_date_apk'],
  ['deadline_extension_refusal_appeal', 'deadline_extension_refusal_ruling_date_apk'],
  ['decision_clarification_ruling_appeal', 'decision_clarification_ruling_date_apk'],
  ['enforcement_restoration_ruling_appeal', 'enforcement_restoration_ruling_date_apk'],
  ['evidence_unavailability_notice', 'evidence_request_copy_received_date_apk'],
  ['enforcement_writ_duplicate_request', 'enforcement_writ_loss_known_date_apk'],
  ['court_fine_appeal', 'court_fine_ruling_copy_received_date_apk'],
  ['additional_decision_refusal_appeal', 'additional_decision_refusal_ruling_date_apk'],
];
for (const [situationId, fieldId] of SINGLE_NODE_BRANCHES) {
  await chooseSituation(situationId);
  check(
    (await page.locator(`#in-${fieldId}`).count()) === 1,
    `ветвь "${situationId}": основное поле #in-${fieldId} не найдено в DOM`,
  );
  await page.fill(`#in-${fieldId}`, '11.03.2025');
  await settle();
  const cards = page.locator('#results .card');
  check((await cards.count()) === 1, `ветвь "${situationId}": карточка результата не появилась`);
  const deadline = (await cards.locator('.deadline').first().innerText()).trim();
  check(
    isValidDeadlineText(deadline),
    `ветвь "${situationId}": дата в карточке невалидна: «${deadline}»`,
  );
}

// --- 10. Ветвь "new_circumstances": два узла на одном якоре (общий срок + ---
// предельный срок восстановления по ч. 2 ст. 312 АПК РФ) -----------------------
await chooseSituation('new_circumstances');
check(
  (await page.locator('#in-circumstances_discovered_date').count()) === 1,
  'ветвь "new_circumstances": основное поле не найдено в DOM',
);
await page.fill('#in-circumstances_discovered_date', '11.03.2025');
await settle();
check(
  (await page.locator('#results .card').count()) === 2,
  'в ветви пересмотра по новым обстоятельствам ожидались две карточки (общий срок и восстановление)',
);
const reviewDeadline = (
  await page.locator('#results .card').filter({ hasText: 'Пересмотр по новым' }).locator('.deadline').innerText()
).trim();
check(reviewDeadline === '11.06.2025', `срок подачи заявления о пересмотре посчитан неверно: ${reviewDeadline}`);
const reviewRestorationDeadline = (
  await page
    .locator('#results .card')
    .filter({ hasText: 'Восстановление срока пересмотра' })
    .locator('.deadline')
    .innerText()
).trim();
check(
  reviewRestorationDeadline === '11.09.2025',
  `предельный срок восстановления пересмотра посчитан неверно: ${reviewRestorationDeadline}`,
);

// --- 11. Ветвь "execution_compensation": ЕДИНСТВЕННЫЙ kind:'window' узел -------
// в АПК-домене (ч. 3 ст. 222.1 АПК РФ) — до этой правки ни разу не выбирался в
// браузере. Проверяются все три состояния окна: 'open' (верхняя граница ещё не
// наступила — на карточке плейсхолдер «—» и пояснение), 'closed' (обе границы
// определены) и 'empty' (окно схлопнулось, подать нельзя ни в один день).
await chooseSituation('execution_compensation');
check(
  (await page.locator('#in-execution_deadline_date').count()) === 1,
  'ветвь "execution_compensation": основное поле execution_deadline_date не найдено в DOM',
);
check(
  (await page.locator('#in-enforcement_proceeding_ended').count()) === 1,
  'ветвь "execution_compensation": дискриминатор enforcement_proceeding_ended не найден в DOM',
);
await page.fill('#in-execution_deadline_date', '11.03.2025');
await settle();

const windowCardApk = page
  .locator('#results .card')
  .filter({ hasText: 'исполнение судебного акта в разумный срок' });

// Состояние 'open': производство не окончено — верхняя граница не определена.
await page.selectOption('#in-enforcement_proceeding_ended', 'no');
await settle();
check((await windowCardApk.count()) === 1, 'execution_compensation[open]: карточка-окно не появилась');
const openCaptions = await windowCardApk.locator('.deadline-caption').allInnerTexts();
const openDates = await windowCardApk.locator('.deadline').allInnerTexts();
check(
  JSON.stringify(openCaptions.map((t) => t.trim().toLowerCase())) ===
    JSON.stringify(['не ранее', 'не позднее']),
  `execution_compensation[open]: подписи границ неверны: ${JSON.stringify(openCaptions)}`,
);
check(
  isValidDeadlineText(openDates[0]),
  `execution_compensation[open]: нижняя граница невалидна: ${JSON.stringify(openDates)}`,
);
check(
  openDates[1]?.trim() === '—',
  `execution_compensation[open]: верхняя граница должна быть плейсхолдером «—», пока производство не окончено: ${JSON.stringify(openDates)}`,
);
check(
  (await windowCardApk.locator('.na-reason').count()) === 1,
  'execution_compensation[open]: пояснение состояния (na-reason) не показано',
);

// Состояние 'closed': производство окончено ПОЗЖЕ истечения срока исполнения —
// обе границы окна определены и раскрыты на карточке.
await page.selectOption('#in-enforcement_proceeding_ended', 'yes');
await settle();
check(
  (await page.locator('#in-enforcement_proceeding_ended_date').count()) === 1,
  'execution_compensation: поле enforcement_proceeding_ended_date не появилось при enforcement_proceeding_ended=yes',
);
await page.fill('#in-enforcement_proceeding_ended_date', '01.10.2025');
await settle();
check((await windowCardApk.count()) === 1, 'execution_compensation[closed]: карточка-окно не появилась');
const closedDates = await windowCardApk.locator('.deadline').allInnerTexts();
check(
  closedDates.length === 2 && closedDates.every(isValidDeadlineText),
  `execution_compensation[closed]: обе границы должны быть определены и валидны: ${JSON.stringify(closedDates)}`,
);
check(
  closedDates[0].trim() === '11.09.2025' && closedDates[1].trim() === '01.04.2026',
  `execution_compensation[closed]: границы окна посчитаны неверно: ${JSON.stringify(closedDates)}`,
);
check(
  (await windowCardApk.locator('.na-reason').count()) === 0,
  'execution_compensation[closed]: пояснение состояния показано там, где обе границы определены штатно',
);

// Состояние 'empty': производство окончено РАНЬШЕ истечения срока исполнения —
// верхняя граница получается раньше нижней, окно схлопывается.
await page.fill('#in-enforcement_proceeding_ended_date', '01.02.2025');
await settle();
check((await windowCardApk.count()) === 1, 'execution_compensation[empty]: карточка-окно не появилась');
check(
  (await windowCardApk.evaluate((el) => el.classList.contains('not-applicable'))) === true,
  'execution_compensation[empty]: карточка должна получать класс not-applicable',
);
const emptyDates = await windowCardApk.locator('.deadline').allInnerTexts();
check(
  emptyDates.length === 2 && emptyDates.every(isValidDeadlineText),
  `execution_compensation[empty]: обе даты границ должны остаться валидными (хоть окно и схлопнулось): ${JSON.stringify(emptyDates)}`,
);
const emptyNote = await windowCardApk.locator('.na-reason').innerText();
check(
  emptyNote.includes('Окно закрыто'),
  `execution_compensation[empty]: пояснение о закрытом окне не показано: «${emptyNote}»`,
);

await browser.close();
server.close();

if (problems.length) {
  console.error('SMOKE APK FAIL:\n' + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.log('smoke apk: ok');
