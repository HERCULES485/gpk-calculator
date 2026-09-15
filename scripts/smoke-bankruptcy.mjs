// Браузерная smoke-проверка страницы банкротства (bankruptcy.html) — тот же
// подход, что у scripts/smoke.mjs (ГПК) и scripts/smoke-apk.mjs (АПК): грузит
// страницу в реальном браузере и падает при любой ошибке в консоли,
// необработанном исключении или показе .fatal.
//
// Отдельный файл, а не ветка в smoke-apk.mjs: страницы независимы (своя
// разметка, свой app.js, свой домен — отдельный закон), и падение одной не
// должно прятать состояние другой.
//
// Здесь же проверяется то, чего `node --test` не видит: он не исполняет модули в
// браузере, а весь ввод, переключение ветвей, условная видимость полей и —
// главное — ПЕРВЫЙ живой рендер карточки capped_term живут только в
// apk/bankruptcy-app.js.
//
// Запуск: node scripts/smoke-bankruptcy.mjs  (нужен пакет playwright и chromium).
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
    const file = join(ROOT, rel === '/' ? 'bankruptcy.html' : rel);
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

const cardByTitle = (text) => page.locator('#results .card').filter({ hasText: text });
const deadlineOf = async (card) => (await card.locator('.deadline').first().innerText()).trim();

await page.goto(`http://localhost:${port}/bankruptcy.html`, { waitUntil: 'networkidle' });

// --- Инициализация ------------------------------------------------------------

check(
  (await page.locator('.fatal').count()) === 0,
  '.fatal показан — страница не инициализировалась',
);
check(
  (await page.locator('#situation input[type=radio]').count()) === 5,
  'переключатель ситуаций отрисован не на пять ветвей',
);

// --- Ветвь 1: отзыв должника (working_day-узел, ст. 47 п. 1) -------------------
//
// Единственный в домене срок в рабочих днях. Карточка приходит с kind:'term' и
// рендерится обычным рендерером — отдельной ветки под неё нет; проверяем, что
// при этом не потерян first_working_day (без него непонятно, почему дата такая
// далёкая после новогодних каникул).

check(
  (await page.locator('#in-creditor_petition_acceptance_ruling_received_date_apk').count()) === 1,
  'ветвь "debtor_response": основное поле не найдено в DOM',
);
await page.fill('#in-creditor_petition_acceptance_ruling_received_date_apk', '26.12.2025');
await settle();
// Ввод в generic-поле сохраняется после перерисовки (render() пересобирает поля).
check(
  (await page.inputValue('#in-creditor_petition_acceptance_ruling_received_date_apk')) ===
    '26.12.2025',
  'введённое значение в поле даты не сохранилось после перерисовки',
);
const responseCard = cardByTitle('Отзыв должника');
check((await responseCard.count()) === 1, 'карточка отзыва должника не появилась');
check(
  (await deadlineOf(responseCard)) === '21.01.2026',
  `ждали дедлайн 21.01.2026, получили «${await deadlineOf(responseCard)}»`,
);
const responseText = await responseCard.innerText();
check(
  responseText.includes('Отсчёт рабочих дней с 29.12.2025'),
  `первый рабочий день не показан на карточке: «${responseText}»`,
);

// --- Ветвь 2: требования кредиторов юридического лица (три узла) ---------------

await chooseSituation('creditor_claims');
check(
  (await cardByTitle('Отзыв должника').count()) === 0,
  'после переключения ветви карточка чужого узла осталась на экране',
);
await page.fill('#in-observation_introduction_notice_published_date_apk', '11.03.2026');
await page.fill('#in-bankruptcy_declaration_notice_published_date_apk', '01.04.2026');
await page.fill('#in-creditor_claim_unjustified_circumstances_known_date_apk', '20.05.2026');
await settle();
check(
  (await page.locator('#results .card').count()) === 3,
  'в ветви требований кредиторов ожидались три карточки',
);
const claimsCard = cardByTitle('первом собрании');
check(
  (await deadlineOf(claimsCard)) === '10.04.2026',
  `срок предъявления требований посчитан неверно: ${await deadlineOf(claimsCard)}`,
);

// --- Ветвь 3: банкротство гражданина (два узла) --------------------------------

await chooseSituation('citizen_bankruptcy');
await page.fill('#in-citizen_bankruptcy_petition_justified_notice_published_date_apk', '11.03.2026');
await page.fill('#in-bankruptcy_completion_review_circumstances_discovered_date_apk', '20.05.2026');
await settle();
check(
  (await page.locator('#results .card').count()) === 2,
  'в ветви банкротства гражданина ожидались две карточки',
);
const citizenCard = cardByTitle('банкротстве гражданина');
check(
  (await deadlineOf(citizenCard)) === '12.05.2026',
  `срок требований кредиторов гражданина посчитан неверно: ${await deadlineOf(citizenCard)}`,
);

// --- Ветвь 4: субсидиарная ответственность в деле о банкротстве ----------------
//
// Здесь всё новое разом: choice-поле с условной видимостью трёх зависимых дат,
// карточка capped_term и восстановительный узел в одной ветви с базовым.

await chooseSituation('subsidiary_in_case');

// Восстановительный узел делит поля с базовым: пока оба неполны, поля нарисованы
// ОДИН раз, а вторая карточка ссылается на них текстом.
check(
  (await page.locator('#in-subsidiary_liability_grounds_known_date_apk').count()) === 1,
  'поле даты знания об основаниях отрисовано не один раз',
);
const invites = page.locator('.invite');
check((await invites.count()) === 2, 'в ветви ожидались две карточки «что ещё уточнить»');
check(
  (await invites.allInnerTexts()).some((t) => t.includes('уже есть в этой форме')),
  'восстановительный узел не сослался на уже показанные поля базового узла',
);

// Условная видимость: три альтернативные даты объективного потолка
// взаимоисключающие, показывается ровно та, что соответствует выбранному
// событию, — остальных не должно быть в DOM вовсе, иначе в них можно вписать
// значение, которое никогда не попадёт в расчёт.
const OBJECTIVE_DATE_IDS = [
  'in-bankruptcy_declared_date_apk',
  'in-bankruptcy_case_terminated_date_apk',
  'in-bankruptcy_petition_returned_date_apk',
];
async function visibleObjectiveDateIds() {
  const present = [];
  for (const id of OBJECTIVE_DATE_IDS) {
    if ((await page.locator(`#${id}`).count()) === 1) present.push(id);
  }
  return present;
}

check(
  (await visibleObjectiveDateIds()).length === 0,
  'без выбранного события должно быть не показано ни одной из трёх дат потолка',
);
for (const [value, expected] of [
  ['bankruptcy_declared', 'in-bankruptcy_declared_date_apk'],
  ['case_terminated', 'in-bankruptcy_case_terminated_date_apk'],
  ['petition_returned', 'in-bankruptcy_petition_returned_date_apk'],
]) {
  await page.selectOption('#in-objective_cap_event', value);
  await settle();
  const visible = await visibleObjectiveDateIds();
  check(
    JSON.stringify(visible) === JSON.stringify([expected]),
    `при objective_cap_event=${value} должно быть видно только ${expected}, видно: ${JSON.stringify(visible)}`,
  );
}

// --- capped_term: явный победитель ---------------------------------------------

await page.selectOption('#in-objective_cap_event', 'bankruptcy_declared');
await settle();
await page.fill('#in-subsidiary_liability_grounds_known_date_apk', '10.03.2022');
await page.fill('#in-bankruptcy_declared_date_apk', '01.06.2023');
await page.fill('#in-subsidiary_liability_conduct_date_apk', '01.01.2020');
await settle();

// Заголовок базового узла целиком: подстрока покороче поймала бы и карточку
// восстановления — у неё в заголовке те же слова.
const cappedCard = cardByTitle('к субсидиарной ответственности (в деле о банкротстве)');
check((await cappedCard.count()) === 1, 'карточка capped_term не появилась');
check(
  (await deadlineOf(cappedCard)) === '10.03.2025',
  `дедлайн capped_term посчитан неверно: ${await deadlineOf(cappedCard)}`,
);

// Блок потолков ВСЕГДА развёрнут: он не внутри <details>, иначе карточка
// неотличима от обычного срока.
const caps = cappedCard.locator('.caps');
check((await caps.count()) === 1, 'блок потолков на карточке capped_term не показан');
check(
  (await cappedCard.locator('details .caps').count()) === 0,
  'блок потолков спрятан внутрь «Подробнее» — он должен быть развёрнут всегда',
);
const capRows = cappedCard.locator('.cap');
check((await capRows.count()) === 3, 'показаны не все три потолка п. 5 ст. 61.14');
const capsText = await caps.innerText();
for (const expected of ['10.03.2025', '01.06.2026', '01.01.2030']) {
  check(capsText.includes(expected), `в разборе потолков нет даты ${expected}: «${capsText}»`);
}
// Связавший потолок отмечен, и ровно один — победитель здесь явный.
check(
  (await cappedCard.locator('.cap.binding').count()) === 1,
  'при явном победителе должен быть отмечен ровно один потолок',
);
const bindingText = await cappedCard.locator('.cap.binding').innerText();
check(
  bindingText.includes('10.03.2025'),
  `отмечен не тот потолок, который ограничил срок: «${bindingText}»`,
);
check(
  (await cappedCard.locator('.cap.binding .cap-mark').count()) === 1,
  'у связавшего потолка нет текстовой пометки — выделение только цветом',
);
// Переноса не было — строки «перенесён на» нет ни у одного потолка.
check(
  (await cappedCard.locator('.cap-shift').count()) === 0,
  'строка переноса показана там, где переноса не было',
);

// Восстановительный узел считается от дедлайна базового и рисуется обычной
// карточкой срока (без блока потолков).
const restorationCard = cardByTitle('Восстановление срока подачи заявления');
check((await restorationCard.count()) === 1, 'карточка восстановления не появилась');
check(
  (await deadlineOf(restorationCard)) === '10.03.2027',
  `восстановление посчитано не от дедлайна базового узла: ${await deadlineOf(restorationCard)}`,
);
check(
  (await restorationCard.locator('.caps').count()) === 0,
  'на карточке восстановления показан блок потолков — это обычный срок',
);

// --- capped_term: перенос последнего дня на рабочий ----------------------------
//
// Сырая дата связавшего потолка 05.04.2025 — суббота. В строке потолка остаётся
// сырая дата, а перенос назван отдельной строкой, иначе на экране необъяснимое
// расхождение с дедлайном карточки.
await page.fill('#in-subsidiary_liability_grounds_known_date_apk', '05.04.2022');
await page.fill('#in-bankruptcy_declared_date_apk', '01.01.2023');
await page.fill('#in-subsidiary_liability_conduct_date_apk', '01.01.2018');
await settle();
check(
  (await deadlineOf(cappedCard)) === '07.04.2025',
  `перенесённый дедлайн посчитан неверно: ${await deadlineOf(cappedCard)}`,
);
const shiftRows = cappedCard.locator('.cap-shift');
check((await shiftRows.count()) === 1, 'строка «перенесён на» показана не ровно у одного потолка');
if (await shiftRows.count()) {
  const shiftText = await shiftRows.innerText();
  check(shiftText.includes('07.04.2025'), `строка переноса не называет дату: «${shiftText}»`);
  check(
    (await cappedCard.locator('.cap.binding .cap-shift').count()) === 1,
    'строка переноса стоит не у связавшего потолка',
  );
  const bindingRow = await cappedCard.locator('.cap.binding').innerText();
  check(
    bindingRow.includes('05.04.2025'),
    `в строке связавшего потолка должна остаться СЫРАЯ дата: «${bindingRow}»`,
  );
}

// --- capped_term: ничья по потолкам --------------------------------------------
//
// Отдельным сценарием от явного победителя: при совпадении дат отмечены ОБА
// потолка, а не один выбранный произвольно.
await page.fill('#in-subsidiary_liability_grounds_known_date_apk', '15.09.2022');
await page.fill('#in-bankruptcy_declared_date_apk', '15.09.2022');
await page.fill('#in-subsidiary_liability_conduct_date_apk', '01.01.2018');
await settle();
check(
  (await deadlineOf(cappedCard)) === '15.09.2025',
  `дедлайн при ничьей посчитан неверно: ${await deadlineOf(cappedCard)}`,
);
check(
  (await cappedCard.locator('.cap.binding').count()) === 2,
  'при ничьей должны быть отмечены оба совпавших потолка',
);
check(
  (await cappedCard.locator('.cap.binding .cap-mark').count()) === 2,
  'при ничьей текстовая пометка стоит не у обоих совпавших потолков',
);
const tieRows = await cappedCard.locator('.cap.binding').allInnerTexts();
check(
  tieRows.every((t) => t.includes('15.09.2025')),
  `отмечены не те потолки, что совпали по дате: ${JSON.stringify(tieRows)}`,
);

// --- Ветвь 5: субсидиарная ответственность после завершения производства -------

await chooseSituation('subsidiary_post_conclusion');
// Дата действий (бездействия) — общее поле двух ветвей: при переключении
// введённое значение не теряется.
check(
  (await page.inputValue('#in-subsidiary_liability_conduct_date_apk')) === '01.01.2018',
  'общее поле двух ветвей потеряло значение при переключении ситуации',
);
await page.fill('#in-bankruptcy_proceeding_conclusion_date_apk', '10.01.2024');
await page.fill('#in-subsidiary_liability_conduct_date_apk', '20.05.2016');
await settle();
const postCard = cardByTitle(
  'к субсидиарной ответственности (после завершения конкурсного производства)',
);
check((await postCard.count()) === 1, 'карточка capped_term п. 6 не появилась');
check(
  (await deadlineOf(postCard)) === '20.05.2026',
  `дедлайн п. 6 посчитан неверно: ${await deadlineOf(postCard)}`,
);
check((await postCard.locator('.cap').count()) === 2, 'показаны не оба потолка п. 6 ст. 61.14');
check(
  (await postCard.locator('.cap.binding').count()) === 1,
  'в п. 6 должен быть отмечен ровно один потолок',
);
check(
  (await postCard.locator('.cap.binding').innerText()).includes('20.05.2026'),
  'в п. 6 отмечен не десятилетний предел, ограничивший срок',
);

// --- Негативные проверки: чего на странице быть не должно ----------------------
//
// Не «не тестировали», а явное отсутствие в DOM. Оба решения — архитектурные
// (см. шапки apk/bankruptcy-app.js и apk/bankruptcy-views.js), и молчаливое
// появление любого из этих элементов было бы регрессией, а не улучшением.

// 1. Экспорт в календарь: ни кнопки .ics, ни ссылки в Google Календарь, ни
//    кнопок сводки, тянущих за собой представление capped_term в тексте.
for (const [selector, what] of [
  ['#download-ics', 'кнопка «Скачать .ics»'],
  ['#copy-terms', 'кнопка «Скопировать сроки»'],
  ['#print-terms', 'кнопка «Распечатать»'],
  ['.to-calendar', 'ссылка «Добавить в Google Календарь»'],
  ['.to-calendar-block', 'блок ссылки на календарь'],
  ['a[href*="calendar.google.com"]', 'ссылка на calendar.google.com'],
  ['.toolbar', 'панель кнопок экспорта'],
]) {
  check((await page.locator(selector).count()) === 0, `на странице есть ${what} (${selector})`);
}
const bodyText = await page.locator('body').innerText();
for (const phrase of ['.ics', 'Google', 'Скопировать сроки', 'Распечатать']) {
  check(!bodyText.includes(phrase), `на странице есть текст экспорта «${phrase}»`);
}

// 2. Виджет периодов, не засчитываемых в срок (ч. 2, 5 ст. 321 АПК) — специфика
//    исполнительного листа АПК, ни один узел банкротства её не требует.
for (const [selector, what] of [
  ['.period-section', 'секция периодов'],
  ['.period-row', 'строка периода'],
  ['.period-dates', 'пара дат периода'],
  ['.interruptions', 'блок перерывов срока'],
  ['.interruption-row', 'строка перерыва'],
  ['.interruption-history', 'история периодов/перерывов'],
  ['.row-add', 'кнопка «Добавить …»'],
]) {
  check((await page.locator(selector).count()) === 0, `на странице есть ${what} (${selector})`);
}
for (const phrase of [
  'Добавить приостановление',
  'Добавить период',
  'Добавить перерыв',
  'не засчитываемые в срок',
  'Приостановление исполнения',
]) {
  check(!bodyText.includes(phrase), `на странице есть виджет периодов: текст «${phrase}»`);
}

await browser.close();
server.close();

if (problems.length) {
  console.error('SMOKE BANKRUPTCY FAIL:\n' + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.log('smoke bankruptcy: ok');
