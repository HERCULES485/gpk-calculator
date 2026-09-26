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
  inviteTexts.some((t) => t.includes('Перейти к полю «Категория заявителя»')),
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


// --- Поиск по ситуациям (фильтр переключателя) --------------------------------
//
// filterSituations() только прячет label и категории атрибутом hidden: радио-
// кнопки и их checked не трогает. Страница перезагружается, чтобы начать с
// исходного состояния — выше chooseSituation() уже раскрывал свёрнутые <details>.
// «Видимые на экране» считаются через :visible (реальная отрисовка), а не по
// атрибуту: display у label.situation иначе перебивает [hidden].

await page.goto(`http://localhost:${port}/apk.html`, { waitUntil: 'networkidle' });

const searchState = () =>
  page.evaluate(() => {
    const root = document.getElementById('situation');
    const labels = [...root.querySelectorAll('label.situation')];
    const groups = [...root.querySelectorAll(':scope > fieldset.situations, :scope > details.situations-group')];
    return {
      total: labels.length,
      shown: labels.filter((l) => !l.hidden).map((l) => l.querySelector('input').value),
      hiddenGroups: groups.filter((g) => g.hidden).length,
      detailsOpen: [...root.querySelectorAll('details.situations-group')].map((d) => d.open),
      count: document.getElementById('situation-search-count').textContent,
      emptyHidden: document.getElementById('situation-search-empty').hidden,
      checked: root.querySelector('input[type=radio]:checked')?.value ?? null,
      firstGroupMarginTop: getComputedStyle(groups[0]).marginTop,
    };
  });
const renderedLabels = () => page.locator('#situation label.situation:visible').count();
const search = async (text) => {
  await page.fill('#situation-search-input', text);
  await settle();
};

check(
  (await page.locator('#situation > :first-child').getAttribute('id')) === 'situation-search-input',
  'поле поиска не первый потомок #situation',
);
const searchInitial = await searchState();
const renderedInitial = await renderedLabels();
check(searchInitial.total === 35, `поиск: ждали 35 label.situation, получили ${searchInitial.total}`);
check(
  searchInitial.shown.length === 35 && searchInitial.hiddenGroups === 0,
  'поиск: до ввода часть ветвей или категорий уже скрыта',
);
check(
  searchInitial.detailsOpen.every((open) => !open),
  'поиск: свёрнутая категория раскрыта до ввода',
);
check(searchInitial.count === '' && searchInitial.emptyHidden, 'поиск: счётчик или «ничего не найдено» видны до ввода');
check(
  searchInitial.firstGroupMarginTop === '0px',
  `поиск: у первой категории отступ сверху ${searchInitial.firstGroupMarginTop}, ждали 0px`,
);

// 1. Однозначное совпадение: видна только одна ветвь, пустые категории скрыты.
await search('судебные расходы');
let st = await searchState();
check(
  st.shown.length === 1 && st.shown[0] === 'court_costs',
  `поиск «судебные расходы»: ждали одну ветвь court_costs, видны ${JSON.stringify(st.shown)}`,
);
check((await renderedLabels()) === 1, `поиск «судебные расходы»: на экране видно ${await renderedLabels()} label, ждали 1`);
check(st.count === 'Показано 1 из 35', `поиск «судебные расходы»: счётчик «${st.count}»`);
check(st.emptyHidden, 'поиск: «ничего не найдено» показано при совпадении');
const groupsWithMatch = await page.locator('#situation > fieldset.situations:not([hidden]), #situation > details.situations-group:not([hidden])').count();
check(
  groupsWithMatch === 1 && st.hiddenGroups > 0,
  `поиск «судебные расходы»: видимых категорий ${groupsWithMatch}, ждали одну`,
);

// 2. Нет совпадений: скрыты все label, видно «Ничего не найдено.».
await search('zzzqqq');
st = await searchState();
check(st.shown.length === 0 && (await renderedLabels()) === 0, 'поиск без совпадений: label остались видны');
check(!st.emptyHidden && (await page.locator('#situation-search-empty').isVisible()), 'поиск без совпадений: «Ничего не найдено.» не показано');
check(st.count === 'Показано 0 из 35', `поиск без совпадений: счётчик «${st.count}»`);

// 3. Совпадение внутри изначально свёрнутой категории раскрывает её <details>.
await search('судебный штраф');
st = await searchState();
check(
  st.shown.length === 1 && st.shown[0] === 'court_fine_appeal',
  `поиск «судебный штраф»: ждали одну ветвь court_fine_appeal, видны ${JSON.stringify(st.shown)}`,
);
check(st.detailsOpen.every((open) => open), 'поиск в свёрнутой категории: <details> не раскрылся');
check(
  (await page.locator('#situation input[value="court_fine_appeal"]').isVisible()) && (await renderedLabels()) === 1,
  'поиск в свёрнутой категории: найденная ветвь не видна на экране или видны лишние',
);

// 4. Регистронезависимость: тот же запрос в другом регистре — тот же результат.
await search('СУДЕБНЫЕ РАСХОДЫ');
st = await searchState();
check(
  st.shown.length === 1 && st.shown[0] === 'court_costs' && st.count === 'Показано 1 из 35',
  `поиск «СУДЕБНЫЕ РАСХОДЫ»: регистр влияет на результат — ${JSON.stringify(st.shown)}`,
);

// 5. Очистка поля — всё как до ввода, включая снова свёрнутые <details>.
await search('');
st = await searchState();
check(
  JSON.stringify(st) === JSON.stringify(searchInitial),
  `поиск: после очистки состояние не исходное: ${JSON.stringify(st)}`,
);
check((await renderedLabels()) === renderedInitial, 'поиск: после очистки на экране другое число label');

// 6. Выбранная ветвь, скрытая фильтром, не теряет checked и возвращается.
await chooseSituation('court_costs');
const pickLabel = page.locator('#situation input[value="court_costs"]').locator('xpath=ancestor::label[1]');
await search('судебный штраф');
check(await pickLabel.isHidden(), 'поиск: выбранная ветвь не скрыта фильтром, сценарий не проверяет то, что должен');
check(
  (await page.locator('#situation input[value="court_costs"]').isChecked()) &&
    (await searchState()).checked === 'court_costs',
  'поиск: скрытая фильтром выбранная ветвь потеряла checked',
);
await search('');
check(
  (await pickLabel.isVisible()) && (await page.locator('#situation input[value="court_costs"]').isChecked()),
  'поиск: после очистки выбранная ветвь не видна или не отмечена',
);
check(
  (await pickLabel.evaluate((l) => l.classList.contains('active'))),
  'поиск: после очистки у выбранной ветви пропал класс active',
);


// --- Поиск по ситуациям: отступ первой ВИДИМОЙ категории ------------------------
//
// При активном фильтре первые по DOM категории бывают скрыты, и CSS-правило для
// первой категории в DOM до первой видимой не дотягивается. filterSituations()
// отмечает первую видимую категорию верхнего уровня классом
// situations-first-visible: у неё margin-top 0px, у остальных видимых — прежние
// 16px. После очистки поля — разметка и вычисленные отступы как до ввода.

await page.goto(`http://localhost:${port}/apk.html`, { waitUntil: 'networkidle' });

const categoryLayout = () =>
  page.evaluate(() => {
    const root = document.getElementById('situation');
    return [...root.querySelectorAll(':scope > fieldset.situations, :scope > details.situations-group')].map(
      (g) => ({
        hidden: g.hidden,
        marginTop: getComputedStyle(g).marginTop,
        firstVisible: g.classList.contains('situations-first-visible'),
      }),
    );
  });
const situationHtml = () => page.locator('#situation').evaluate((n) => n.outerHTML);

const layoutInitial = await categoryLayout();
const htmlInitial = await situationHtml();
check(
  layoutInitial.every((g) => !g.hidden && !g.firstVisible) &&
    layoutInitial.map((g) => g.marginTop).join() ===
      ['0px', ...Array(layoutInitial.length - 1).fill('16px')].join(),
  `первая видимая категория: исходные отступы не 0px/16px…: ${JSON.stringify(layoutInitial)}`,
);

for (const query of ['штраф', 'апелляци']) {
  await page.fill('#situation-search-input', query);
  await settle();
  const layout = await categoryLayout();
  const visible = layout.filter((g) => !g.hidden);
  check(
    layout[0].hidden && visible.length > 0 && visible.length < layout.length,
    `первая видимая категория «${query}»: сценарий не скрывает первую категорию или скрывает все: ${JSON.stringify(layout)}`,
  );
  check(
    visible.length > 0 && visible[0].marginTop === '0px',
    `первая видимая категория «${query}»: margin-top ${visible[0]?.marginTop}, ждали 0px`,
  );
  check(
    visible.slice(1).every((g) => g.marginTop === '16px'),
    `первая видимая категория «${query}»: у остальных видимых категорий отступ не 16px: ${JSON.stringify(visible)}`,
  );
  check(
    layout.filter((g) => g.firstVisible).length === 1 && visible[0].firstVisible,
    `первая видимая категория «${query}»: класс situations-first-visible не ровно на первой видимой: ${JSON.stringify(layout)}`,
  );
}

await page.fill('#situation-search-input', '');
await settle();
check(
  JSON.stringify(await categoryLayout()) === JSON.stringify(layoutInitial),
  `первая видимая категория: после очистки отступы не исходные: ${JSON.stringify(await categoryLayout())}`,
);
check((await situationHtml()) === htmlInitial, 'первая видимая категория: после очистки outerHTML #situation не совпадает с исходным');

// --- Срочность дедлайна: цвет .deadline и строка «Осталось N дней» ------------
//
// days_left считается в apk/views.js (markExpired) от текущей даты, tier —
// в apk/app.js (urgencyTier): до 3 дней включительно — urgent, до 14 — soon,
// дальше — без выделения. Текущая дата страницы берётся из new Date(), поэтому
// каждая точка — отдельная страница с зафиксированными часами браузера. Цвет
// проверяется вычисленным стилем, а не только классом: иначе не поймать
// потерянное или перебитое CSS-правило. Цвета — значения переменных apk.html:
// --miss-ink #a3241f, --warn-ink #8a5a00, --muted #5b6472.
//
// Ветка — апелляционная жалоба (по умолчанию): решение 11.03.2025 → дедлайн
// 11.04.2025.

const URGENCY_COLORS = {
  miss: 'rgb(163, 36, 31)',
  warn: 'rgb(138, 90, 0)',
  muted: 'rgb(91, 100, 114)',
};

async function urgencyCard(today) {
  const p = await browser.newPage();
  p.on('console', (m) => {
    if (m.type() === 'error') problems.push(`срочность ${today}: console error: ${m.text()}`);
  });
  p.on('pageerror', (e) => problems.push(`срочность ${today}: pageerror: ${e.message}`));
  await p.clock.setFixedTime(new Date(`${today}T12:00:00`));
  await p.goto(`http://localhost:${port}/apk.html`, { waitUntil: 'networkidle' });
  await p.fill('#in-decision_full_text_date', '11.03.2025');
  await p.waitForTimeout(200);
  const card = p.locator('#results .card').filter({ hasText: 'Апелляционная жалоба' }).first();
  const info = await card.evaluate((c) => {
    const deadline = c.querySelector('.deadline');
    const daysLeft = c.querySelector('.days-left');
    return {
      deadlineClass: deadline.className,
      deadlineText: deadline.textContent,
      deadlineColor: getComputedStyle(deadline).color,
      cardColor: getComputedStyle(c).color,
      daysLeftCount: c.querySelectorAll('.days-left').length,
      daysLeftClass: daysLeft?.className ?? null,
      daysLeftText: daysLeft?.textContent ?? null,
      daysLeftColor: daysLeft ? getComputedStyle(daysLeft).color : null,
      daysLeftWeight: daysLeft ? getComputedStyle(daysLeft).fontWeight : null,
      prevIsNorm: daysLeft?.previousElementSibling?.classList.contains('norm') ?? null,
    };
  });
  await p.close();
  return info;
}

for (const [today, text, tier] of [
  ['2025-04-11', 'Осталось 0 дней', 'urgent'],
  ['2025-04-08', 'Осталось 3 дня', 'urgent'],
  ['2025-04-07', 'Осталось 4 дня', 'soon'],
  ['2025-03-28', 'Осталось 14 дней', 'soon'],
  ['2025-03-27', 'Осталось 15 дней', null],
]) {
  const info = await urgencyCard(today);
  const label = `срочность ${today} (${tier ?? 'calm'})`;
  check(info.deadlineText === '11.04.2025', `${label}: дедлайн «${info.deadlineText}»`);
  check(
    info.deadlineClass === (tier ? `deadline ${tier}` : 'deadline'),
    `${label}: класс .deadline «${info.deadlineClass}»`,
  );
  check(info.daysLeftCount === 1, `${label}: строк .days-left ${info.daysLeftCount}, ждали одну`);
  check(info.daysLeftText === text, `${label}: текст «${info.daysLeftText}», ждали «${text}»`);
  check(
    info.daysLeftClass === (tier ? `days-left ${tier}` : 'days-left'),
    `${label}: класс .days-left «${info.daysLeftClass}»`,
  );
  check(info.prevIsNorm === true, `${label}: .days-left стоит не сразу после .norm`);
  const expectedDeadline =
    tier === 'urgent' ? URGENCY_COLORS.miss : tier === 'soon' ? URGENCY_COLORS.warn : info.cardColor;
  const expectedDaysLeft =
    tier === 'urgent' ? URGENCY_COLORS.miss : tier === 'soon' ? URGENCY_COLORS.warn : URGENCY_COLORS.muted;
  check(
    info.deadlineColor === expectedDeadline,
    `${label}: цвет .deadline ${info.deadlineColor}, ждали ${expectedDeadline}`,
  );
  check(
    info.daysLeftColor === expectedDaysLeft,
    `${label}: цвет .days-left ${info.daysLeftColor}, ждали ${expectedDaysLeft}`,
  );
  check(
    info.daysLeftWeight === (tier ? '600' : '400'),
    `${label}: жирность .days-left ${info.daysLeftWeight}`,
  );
}

// Истёкший срок: строки «Осталось…» нет, дата приглушена, как и раньше.
{
  const info = await urgencyCard('2025-04-12');
  check(info.deadlineClass === 'deadline expired', `срочность: истёкший срок, класс «${info.deadlineClass}»`);
  check(info.daysLeftCount === 0, 'срочность: у истёкшего срока показана строка .days-left');
  check(
    info.deadlineColor === URGENCY_COLORS.muted,
    `срочность: цвет истёкшего .deadline ${info.deadlineColor}, ждали ${URGENCY_COLORS.muted}`,
  );
}

// --- Подсветка недостающего поля и кнопка «Перейти к полю» ---------------------
//
// fieldOrPointer в apk/app.js: когда поле уже нарисовано в форме, карточка
// «что ещё уточнить» показывает кнопку-ссылку, а само поле получает класс
// needed. Проверяется живым рендером: точный текст кнопки, вычисленные стили
// подсветки (box-shadow и цвет подписи — --accent #1f5fbf), фокус и прокрутка
// после клика и то, что подсветка не залипает после заполнения поля.
//
// Ветка — цепочка обжалования решения (по умолчанию): после даты решения
// «Категория заявителя» нарисована блоком «Дополнительные данные» в
// #other-terms, и на неё ссылаются три карточки восстановления (апелляция,
// кассация, кассация в СК ВС РФ). После выбора категории они либо считаются,
// либо просят уже другое поле (дату, когда узнали о нарушении).

const NEEDED_ACCENT = 'rgb(31, 95, 191)';

async function neededFieldScenario({ label, fieldId, owners, setup, fillValue }) {
  const tag = `подсветка поля «${label}»`;
  const p = await browser.newPage();
  p.on('console', (m) => {
    if (m.type() === 'error') problems.push(`${tag}: console error: ${m.text()}`);
  });
  p.on('pageerror', (e) => problems.push(`${tag}: pageerror: ${e.message}`));
  await p.goto(`http://localhost:${port}/apk.html`, { waitUntil: 'networkidle' });
  await setup(p);
  await p.waitForTimeout(200);

  const buttonText = `Перейти к полю «${label}»`;
  const before = await p.evaluate(
    ({ fieldId, buttonText }) => {
      const invites = [...document.querySelectorAll('#results .invite')];
      const target = document.getElementById(`in-${fieldId}`)?.closest('.field');
      const cs = target ? getComputedStyle(target) : null;
      const labelEl = target?.querySelector(':scope > label');
      return {
        owners: invites
          .filter((i) => [...i.querySelectorAll('button.link-button')].some((b) => b.textContent === buttonText))
          .map((i) => i.querySelector('h2').textContent),
        fieldCount: document.querySelectorAll(`#in-${fieldId}`).length,
        targetInInvite: Boolean(target?.closest('.invite')),
        targetClass: target?.className ?? null,
        boxShadow: cs?.boxShadow ?? null,
        paddingLeft: cs?.paddingLeft ?? null,
        labelColor: labelEl ? getComputedStyle(labelEl).color : null,
        buttonType: document.querySelector('#results .invite button.link-button')?.type ?? null,
      };
    },
    { fieldId, buttonText },
  );
  check(before.fieldCount === 1, `${tag}: поле #in-${fieldId} в DOM ${before.fieldCount} раз, ждали один`);
  check(before.targetInInvite === false, `${tag}: целевое поле лежит внутри карточки, а не в блоке полей`);
  for (const owner of owners) {
    check(
      before.owners.some((t) => t.includes(owner)),
      `${tag}: у карточки «${owner}» нет кнопки ровно «${buttonText}»: ${JSON.stringify(before.owners)}`,
    );
  }
  check(before.owners.length >= 2, `${tag}: кнопку показали ${before.owners.length} карточек, ждали минимум две`);
  check(before.buttonType === 'button', `${tag}: у кнопки type «${before.buttonType}»`);
  check(before.targetClass === 'field needed', `${tag}: класс целевого поля «${before.targetClass}»`);
  check(
    before.boxShadow === `${NEEDED_ACCENT} -3px 0px 0px 0px`,
    `${tag}: вычисленный box-shadow «${before.boxShadow}»`,
  );
  check(before.paddingLeft === '10px', `${tag}: padding-left «${before.paddingLeft}»`);
  check(before.labelColor === NEEDED_ACCENT, `${tag}: цвет подписи ${before.labelColor}, ждали ${NEEDED_ACCENT}`);

  // Клик по кнопке первой карточки-владельца: сначала уводим поле за экран.
  const button = p
    .locator('#results .invite')
    .filter({ hasText: owners[0] })
    .first()
    .locator('button.link-button', { hasText: buttonText });
  const rectOf = (id) =>
    p.evaluate((id) => {
      const r = document.getElementById(`in-${id}`).closest('.field').getBoundingClientRect();
      const atEnd =
        window.scrollY === 0 ||
        window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 1;
      return { top: r.top, bottom: r.bottom, viewport: window.innerHeight, scrollY: window.scrollY, atEnd };
    }, id);
  const inViewport = (r) => r.top >= 0 && r.bottom <= r.viewport;
  // Перед кликом поле видно лишь кромкой у края экрана: у верхнего, если
  // страницу есть куда прокрутить (именно там focus() без preventScroll
  // обрывает плавную прокрутку и оставляет подпись срезанной), иначе у нижнего.
  await p.evaluate((id) => {
    const r = document.getElementById(`in-${id}`).closest('.field').getBoundingClientRect();
    const room = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
    window.scrollBy(0, r.bottom - 8 <= room ? r.bottom - 8 : r.top - window.innerHeight + 8);
  }, fieldId);
  const rectBefore = await rectOf(fieldId);
  check(!inViewport(rectBefore), `${tag}: поле уже в viewport до клика — прокрутка не проверяется: ${JSON.stringify(rectBefore)}`);
  await button.click();
  await p.waitForTimeout(1000);
  const active = await p.evaluate(() => document.activeElement?.id ?? null);
  check(active === `in-${fieldId}`, `${tag}: после клика фокус на «${active}», ждали in-${fieldId}`);
  const rectAfter = await rectOf(fieldId);
  check(inViewport(rectAfter), `${tag}: после клика поле не прокручено в viewport: ${JSON.stringify(rectAfter)}`);
  check(
    rectAfter.atEnd || Math.abs((rectAfter.top + rectAfter.bottom) / 2 - rectAfter.viewport / 2) <= 20,
    `${tag}: после клика поле не по центру экрана (block: 'center'): ${JSON.stringify(rectAfter)}`,
  );

  // Заполняем поле: при перерисовке подсветка снимается, кнопки на него пропадают.
  const input = p.locator(`#in-${fieldId}`);
  if ((await input.evaluate((x) => x.tagName)) === 'SELECT') await input.selectOption(fillValue);
  else await input.fill(fillValue);
  await p.waitForTimeout(200);
  const after = await p.evaluate(
    ({ fieldId, buttonText, owners }) => {
      const target = document.getElementById(`in-${fieldId}`)?.closest('.field');
      const labelEl = target?.querySelector(':scope > label');
      return {
        targetClass: target?.className ?? null,
        boxShadow: target ? getComputedStyle(target).boxShadow : null,
        labelColor: labelEl ? getComputedStyle(labelEl).color : null,
        buttons: [...document.querySelectorAll('button.link-button')].filter((b) => b.textContent === buttonText).length,
        owners: owners.map((o) => {
          const card = [...document.querySelectorAll('#results .card')].find((c) => c.textContent.includes(o));
          const invite = [...document.querySelectorAll('#results .invite')].find((c) =>
            c.querySelector('h2').textContent.includes(o),
          );
          return { o, card: Boolean(card), invite: invite ? invite.textContent : null };
        }),
      };
    },
    { fieldId, buttonText, owners },
  );
  check(after.targetClass === 'field', `${tag}: после заполнения класс поля «${after.targetClass}»`);
  check(after.boxShadow === 'none', `${tag}: после заполнения box-shadow «${after.boxShadow}»`);
  check(after.labelColor !== NEEDED_ACCENT, `${tag}: после заполнения подпись осталась цвета --accent`);
  check(after.buttons === 0, `${tag}: после заполнения осталось ${after.buttons} кнопок на это поле`);
  for (const { o, card, invite } of after.owners) {
    check(
      card || (invite !== null && !invite.includes(label)),
      `${tag}: карточка «${o}» после заполнения не посчиталась и всё ещё ссылается на поле`,
    );
  }
  await p.close();
}

await neededFieldScenario({
  label: 'Категория заявителя',
  fieldId: 'subject_category',
  owners: [
    'Восстановление срока подачи апелляционной жалобы',
    'Восстановление срока подачи кассационной жалобы (предельный срок',
    'Восстановление срока подачи кассационной жалобы в Судебную коллегию',
  ],
  async setup(p) {
    await p.fill('#in-decision_full_text_date', '11.03.2025');
  },
  fillValue: 'participating_improperly_notified',
});

await browser.close();
server.close();

if (problems.length) {
  console.error('SMOKE APK FAIL:\n' + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.log('smoke apk: ok');
