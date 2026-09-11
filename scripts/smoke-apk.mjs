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
  await page.check(`#situation input[value="${id}"]`);
  await settle();
}

await page.goto(`http://localhost:${port}/apk.html`, { waitUntil: 'networkidle' });

// --- Инициализация ------------------------------------------------------------

check((await page.locator('.fatal').count()) === 0, '.fatal показан — страница не инициализировалась');
check((await page.locator('#decision-full-text').count()) === 1, 'нет основного поля даты решения');
check(
  (await page.locator('#situation input[type=radio]').count()) === 3,
  'переключатель ситуаций отрисован не на три ветви',
);

// --- 1. Полный цикл: дата решения → карточка апелляционной жалобы --------------

await page.fill('#decision-full-text', '11.03.2025');
await settle();
const appealCard = page.locator('#results .card').filter({ hasText: 'Апелляционная жалоба' });
check((await appealCard.count()) === 1, 'карточка апелляционной жалобы не появилась');
if (await appealCard.count()) {
  const deadline = (await appealCard.locator('.deadline').first().innerText()).trim();
  check(deadline === '11.04.2025', `ждали дедлайн 11.04.2025, получили «${deadline}»`);
}

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

await browser.close();
server.close();

if (problems.length) {
  console.error('SMOKE APK FAIL:\n' + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.log('smoke apk: ok');
