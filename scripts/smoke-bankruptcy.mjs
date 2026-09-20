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
// Разрешение на буфер обмена нужно, чтобы прочитать результат клика по
// «Скопировать сроки» и убедиться, что capped_term попал в сводку одной строкой.
const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();
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
  (await page.locator('#situation input[type=radio]').count()) === 30,
  'переключатель ситуаций отрисован не на тридцать ветвей',
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

// --- Сводка сроков: capped_term идёт в неё ОДНОЙ строкой -----------------------
//
// Проверяется на ветви с capped_term-узлом (сейчас выбрана она, п. 6 ст. 61.14):
// в сводку должна попасть итоговая дата и норма — ровно то же, что у обычного
// срока, — а разбор потолков остаться только на карточке. Ловит оба провала
// сразу: молчаливый пропуск capped_term (записи не будет вовсе) и протекание
// потолков в текст.

check((await page.locator('#copy-terms').count()) === 1, 'нет кнопки «Скопировать сроки»');
check((await page.locator('#print-terms').count()) === 1, 'нет кнопки «Распечатать»');
check(
  (await page.locator('#copy-terms').isDisabled()) === false,
  'кнопка «Скопировать сроки» заблокирована при посчитанных сроках',
);

await page.click('#copy-terms');
await settle();
check(
  (await page.locator('#copy-status').innerText()).includes('Скопировано'),
  'клик по «Скопировать сроки» не подтвердился статусом',
);
const copied = await page.evaluate(() => navigator.clipboard.readText());

// Строка базового узла — ровно одна, с итоговой (перенесённой, если был перенос)
// датой и нормой.
const cappedLines = copied
  .split('\n')
  .filter((line) => line.includes('к субсидиарной ответственности (после завершения'));
check(
  cappedLines.length === 1,
  `capped_term-узел должен давать ровно одну строку сводки, получили ${cappedLines.length}: ${JSON.stringify(cappedLines)}`,
);
if (cappedLines.length === 1) {
  const line = cappedLines[0];
  check(line.includes('20.05.2026'), `в строке сводки нет итоговой даты: «${line}»`);
  check(
    line.includes('п. 6 ст. 61.14 ФЗ № 127-ФЗ'),
    `в строке сводки нет нормы: «${line}»`,
  );
}
// Потолки в сводку не протекли: ни даты несвязавшего потолка, ни слов разбора.
check(
  !copied.includes('10.01.2027'),
  'в сводку попала дата несвязавшего потолка — она сроком не является',
);
for (const phrase of ['потолок', 'Потолок', 'Пределы срока', 'ограничивает срок']) {
  check(!copied.includes(phrase), `в сводку протёк разбор потолков: «${phrase}»`);
}

// Печать строится из той же сводки — и дата в ней не должна быть пустой
// (в apk/app.js на этом месте isoToRu(item.deadline), то есть пустая строка).
const printDates = await page.locator('#print-list .print-date').allInnerTexts();
check(printDates.length === 2, `в печатном списке ожидались две записи, получили ${printDates.length}`);
check(
  printDates.every((d) => /^\d{2}\.\d{2}\.\d{4}$/.test(d.trim())),
  `в печатном списке дата пустая или не в формате ДД.ММ.ГГГГ: ${JSON.stringify(printDates)}`,
);
check(
  printDates.some((d) => d.trim() === '20.05.2026'),
  'итоговая дата capped_term не попала в печатный список',
);

// --- Ветвь 6: внесудебное банкротство гражданина (kind: 'event') --------------
//
// ПЕРВЫЙ живой рендер kind: 'event' на этой странице (узел ст. 223.6 п. 1,
// завершение процедуры внесудебного банкротства). Проверяется: карточка есть,
// рендерится без ошибок, БЕЗ подписи «последний день подачи» и без классов
// term-карточки (.deadline-caption/.deadline) — у события их быть не должно,
// оно не подаётся, а наступает само. Сырой outerHTML карточки распечатан в
// консоль — тем же способом, что для сценария с ничьёй у capped_term, — для
// показа на проверку архитектору.

await chooseSituation('out_of_court_bankruptcy');
check(
  (await page.locator('#in-out_of_court_bankruptcy_initiation_notice_included_date_apk').count()) ===
    1,
  'ветвь "out_of_court_bankruptcy": основное поле не найдено в DOM',
);
await page.fill('#in-out_of_court_bankruptcy_initiation_notice_included_date_apk', '11.03.2025');
await settle();

const eventLine = page.locator('.event-line').filter({ hasText: 'Процедура завершена' });
check(
  (await eventLine.count()) === 1,
  'карточка-событие завершения внесудебного банкротства не появилась',
);
if (await eventLine.count()) {
  const text = await eventLine.innerText();
  check(text.includes('11.09.2025'), `дата события посчитана неверно: «${text}»`);
  check(
    text.includes('п. 1 ст. 223.6 ФЗ № 127-ФЗ'),
    `норма не показана на карточке-событии: «${text}»`,
  );
  check(
    !/последний день подачи/i.test(text),
    `карточка-событие несёт подпись срока заявителя, хотя событие не подаётся: «${text}»`,
  );
  // Точный текст строки и hint — регрессия на обобщение renderEvent под
  // card.eventTextTemplate/card.hint (задача ст. 223.2 п. 6): раньше эти две
  // фразы были константой самого renderEvent, теперь — данные узла. Проверка
  // буква в букву, а не includes(), чтобы перенос в узел не смог незаметно
  // подменить уже показанную пользователю формулировку.
  check(
    (await eventLine.locator('.event-text').innerText()) === 'Процедура завершена 11.09.2025',
    `текст строки события изменился при обобщении renderEvent: «${await eventLine.locator('.event-text').innerText()}»`,
  );
  check(
    (await eventLine.locator('.hint').innerText()) ===
      'С этой даты гражданин считается освобождённым от дальнейшего исполнения ' +
        'требований кредиторов, указанных им в заявлении.',
    `hint под карточкой-событием изменился при обобщении renderEvent: «${await eventLine.locator('.hint').innerText()}»`,
  );
  check(
    (await eventLine.locator('.deadline-caption').count()) === 0,
    'у карточки-события есть .deadline-caption — это класс term-карточки',
  );
  check(
    (await eventLine.locator('.deadline').count()) === 0,
    'у карточки-события есть .deadline — это класс term-карточки',
  );

  // Сырой outerHTML — на проверку архитектору.
  console.log('EVENT CARD outerHTML:', await eventLine.first().evaluate((el) => el.outerHTML));
}

// Сводка: событие тоже попадает в копирование (card.date, не card.deadline —
// см. summaryEntries в apk/bankruptcy-app.js).
await page.click('#copy-terms');
await settle();
const copiedEvent = await page.evaluate(() => navigator.clipboard.readText());
check(copiedEvent.includes('11.09.2025'), `дата события не попала в сводку копирования: «${copiedEvent}»`);
check(
  copiedEvent.includes('Завершение процедуры внесудебного банкротства гражданина'),
  'название узла-события не попало в сводку копирования',
);

// --- Ветвь 7: заявление о внесудебном банкротстве вернули (второй kind: 'event') -
//
// ВТОРОЙ узел домена с kind: 'event' — проверяется тот же общий рендерер
// (renderEvent/eventCard), что и у ст. 223.6 п. 1, но со СВОИМ текстом и
// hint, а не унаследованными от первого узла по ошибке (регрессия на
// обобщение renderEvent под card.eventTextTemplate/card.hint). Сырой
// outerHTML распечатан в консоль — для показа на проверку архитектору.

await chooseSituation('out_of_court_bankruptcy_returned');
check(
  (await page.locator('#in-out_of_court_bankruptcy_return_date_apk').count()) === 1,
  'ветвь "out_of_court_bankruptcy_returned": основное поле не найдено в DOM',
);
await page.fill('#in-out_of_court_bankruptcy_return_date_apk', '11.03.2025');
await settle();

const reapplicationLine = page
  .locator('.event-line')
  .filter({ hasText: 'Право на повторную подачу' });
check(
  (await reapplicationLine.count()) === 1,
  'карточка-событие права на повторную подачу не появилась',
);
if (await reapplicationLine.count()) {
  const text = await reapplicationLine.innerText();
  check(text.includes('11.04.2025'), `дата права на повторную подачу посчитана неверно: «${text}»`);
  check(
    text.includes('п. 6 ст. 223.2 ФЗ № 127-ФЗ'),
    `норма не показана на карточке-событии: «${text}»`,
  );
  check(!/последний день подачи/i.test(text), `карточка-событие несёт подпись срока заявителя: «${text}»`);
  check(
    (await reapplicationLine.locator('.event-text').innerText()) ===
      'Право на повторную подачу — с 11.04.2025',
    `текст строки события не соответствует ожидаемому: «${await reapplicationLine.locator('.event-text').innerText()}»`,
  );
  const reapplicationHint = await reapplicationLine.locator('.hint').innerText();
  check(
    reapplicationHint ===
      'С этой даты гражданин вправе повторно обратиться в МФЦ с заявлением о ' +
        'признании его банкротом во внесудебном порядке.',
    `hint карточки права на повторную подачу неверен: «${reapplicationHint}»`,
  );
  // Не спутан с текстом соседнего узла-события (ст. 223.6 п. 1).
  check(!text.includes('Процедура завершена'), `текст соседнего узла протёк в эту карточку: «${text}»`);
  check(
    !text.includes('освобождённым от дальнейшего исполнения'),
    `hint соседнего узла протёк в эту карточку: «${text}»`,
  );

  // Сырой outerHTML — на проверку архитектору.
  console.log(
    'REAPPLICATION EVENT CARD outerHTML:',
    await reapplicationLine.first().evaluate((el) => el.outerHTML),
  );
}

// --- Ветвь 8: ранее уже проходил(а) через банкротство (третий kind: 'event') -----
//
// ТРЕТИЙ узел домена с kind: 'event' — тот же общий рендерер, подключился без
// единой правки в apk/bankruptcy-app.js. Проверяется, что текст и hint — свои,
// не спутанные ни с одним из двух других узлов-событий.

await chooseSituation('out_of_court_bankruptcy_prior_completed');
check(
  (await page.locator('#in-out_of_court_bankruptcy_prior_procedure_end_date_apk').count()) === 1,
  'ветвь "out_of_court_bankruptcy_prior_completed": основное поле не найдено в DOM',
);
await page.fill('#in-out_of_court_bankruptcy_prior_procedure_end_date_apk', '11.03.2020');
await settle();

const priorLine = page.locator('.event-line').filter({ hasText: 'Право на подачу нового заявления' });
check(
  (await priorLine.count()) === 1,
  'карточка-событие права на подачу после предыдущей процедуры не появилась',
);
if (await priorLine.count()) {
  const text = await priorLine.innerText();
  check(text.includes('11.03.2025'), `дата права на подачу нового заявления посчитана неверно: «${text}»`);
  check(
    text.includes('п. 8 ст. 223.2 ФЗ № 127-ФЗ'),
    `норма не показана на карточке-событии: «${text}»`,
  );
  check(!/последний день подачи/i.test(text), `карточка-событие несёт подпись срока заявителя: «${text}»`);
  check(
    (await priorLine.locator('.event-text').innerText()) === 'Право на подачу нового заявления — с 11.03.2025',
    `текст строки события не соответствует ожидаемому: «${await priorLine.locator('.event-text').innerText()}»`,
  );
  const priorHint = await priorLine.locator('.hint').innerText();
  check(
    priorHint ===
      'С этой даты гражданин вправе повторно подать заявление о признании его ' +
        'банкротом во внесудебном порядке.',
    `hint карточки права после предыдущей процедуры неверен: «${priorHint}»`,
  );
  // Не спутан с текстом двух других узлов-событий этого домена.
  check(!text.includes('Процедура завершена'), `текст узла ст. 223.6 п. 1 протёк в эту карточку: «${text}»`);
  check(
    !text.includes('Право на повторную подачу — с'),
    `текст узла п. 6 ст. 223.2 протёк в эту карточку: «${text}»`,
  );
  check(
    !text.includes('обратиться в МФЦ'),
    `hint узла п. 6 ст. 223.2 протёк в эту карточку: «${text}»`,
  );

  // Сырой outerHTML — на проверку архитектору.
  console.log('PRIOR-PROCEDURE EVENT CARD outerHTML:', await priorLine.first().evaluate((el) => el.outerHTML));
}

// --- Ветвь 9: мировое соглашение (ПЕРВЫЙ живой рендер kind: 'window') ----------
//
// Результат не одна дата, а две границы. Проверяется: обе показаны с подписями
// «Не ранее»/«Не позднее», нижняя строго раньше верхней, подписи «последний
// день подачи» (это term-карточка) на окне нет, а состояний окна ('open'/
// 'empty') у этого узла не бывает — строки card.note быть не должно. Сырой
// outerHTML распечатан в консоль на проверку архитектору.

await chooseSituation('settlement_agreement');
check(
  (await page.locator('#in-settlement_agreement_conclusion_date_apk').count()) === 1,
  'ветвь "settlement_agreement": основное поле не найдено в DOM',
);
// Якорь в канун новогодних каникул: по календарным дням окно попало бы внутрь
// праздников, по рабочим — уезжает на две недели вперёд.
await page.fill('#in-settlement_agreement_conclusion_date_apk', '26.12.2025');
await settle();

const windowCardLocator = cardByTitle('Заявление об утверждении мирового соглашения');
check((await windowCardLocator.count()) === 1, 'карточка-окно мирового соглашения не появилась');
if (await windowCardLocator.count()) {
  const text = await windowCardLocator.innerText();
  const captions = await windowCardLocator.locator('.deadline-caption').allInnerTexts();
  const dates = await windowCardLocator.locator('.deadline').allInnerTexts();

  // Регистр не сравниваем: у .deadline-caption в CSS стоит text-transform:
  // uppercase, и innerText отдаёт уже отрисованный текст («НЕ РАНЕЕ»), тогда
  // как в разметке он записан как «Не ранее».
  check(
    JSON.stringify(captions.map((t) => t.trim().toLowerCase())) ===
      JSON.stringify(['не ранее', 'не позднее']),
    `подписи границ окна неверны: ${JSON.stringify(captions)}`,
  );
  check(
    JSON.stringify(dates.map((t) => t.trim())) === JSON.stringify(['14.01.2026', '21.01.2026']),
    `границы окна посчитаны неверно: ${JSON.stringify(dates)}`,
  );
  check(
    text.includes('п. 2 ст. 158 ФЗ № 127-ФЗ'),
    `норма не показана на карточке-окне: «${text}»`,
  );
  check(
    text.includes('Отсчёт рабочих дней с 29.12.2025'),
    `первый рабочий день не показан на карточке-окне: «${text}»`,
  );
  check(
    text.includes('мировое соглашение заключено: 26.12.2025'),
    `строка якоря не показана на карточке-окне: «${text}»`,
  );
  // Окно — не срок заявителя с одной датой: подписи term-карточки быть не должно.
  check(
    !/последний день подачи/i.test(text),
    `на карточке-окне подпись term-карточки: «${text}»`,
  );
  // У этого узла состояний окна не бывает — пояснения .na-reason нет.
  check(
    (await windowCardLocator.locator('.na-reason').count()) === 0,
    'на карточке-окне есть .na-reason — у этого узла состояний окна не бывает',
  );
  check(
    (await windowCardLocator.locator('.cap').count()) === 0,
    'на карточке-окне есть строки потолков capped_term',
  );

  // Сырой outerHTML — на проверку архитектору.
  console.log(
    'WINDOW CARD outerHTML:',
    await windowCardLocator.first().evaluate((el) => el.outerHTML),
  );
}

// Сводка: окно раскладывается на ДВЕ строки — «подача не ранее» и «не позднее»
// (см. summaryEntries в apk/bankruptcy-app.js).
await page.click('#copy-terms');
await settle();
const copiedWindow = await page.evaluate(() => navigator.clipboard.readText());
const windowLines = copiedWindow
  .split('\n')
  .filter((line) => line.includes('Заявление об утверждении мирового соглашения'));
check(
  windowLines.length === 2,
  `окно должно давать ровно две строки сводки, получили ${windowLines.length}: ${JSON.stringify(windowLines)}`,
);
check(
  windowLines.some((l) => l.includes('не ранее') && l.includes('14.01.2026')),
  `в сводке нет строки нижней границы: ${JSON.stringify(windowLines)}`,
);
check(
  windowLines.some((l) => l.includes('не позднее') && l.includes('21.01.2026')),
  `в сводке нет строки верхней границы: ${JSON.stringify(windowLines)}`,
);

// --- Ветвь 10: пересмотр определения об утверждении мирового соглашения --------
//
// Перенос по образцу: обычный месячный term-узел (та же механика, что и у
// ветви 3, ст. 213.29), без потолков, восстановления и другого kind.

await chooseSituation('settlement_agreement_review');
check(
  (await page.locator('#in-settlement_agreement_review_circumstances_discovered_date_apk').count()) === 1,
  'ветвь "settlement_agreement_review": основное поле не найдено в DOM',
);
await page.fill('#in-settlement_agreement_review_circumstances_discovered_date_apk', '11.03.2025');
await settle();
check(
  (await page.locator('#results .card').count()) === 1,
  'в ветви пересмотра мирового соглашения ожидалась одна карточка',
);
const reviewCard = cardByTitle('Пересмотр определения об утверждении мирового соглашения');
check((await reviewCard.count()) === 1, 'карточка пересмотра определения не появилась');
check(
  (await deadlineOf(reviewCard)) === '11.04.2025',
  `срок пересмотра определения посчитан неверно: ${await deadlineOf(reviewCard)}`,
);
check(
  (await reviewCard.innerText()).includes('п. 2 ст. 162 ФЗ № 127-ФЗ'),
  'норма п. 2 ст. 162 ФЗ № 127-ФЗ не показана на карточке пересмотра',
);

// --- Ветвь 11: требование о привлечении независимого оценщика ------------------
//
// Второй в домене working_day-узел (первый — ст. 47 п. 1, ветвь 1 выше):
// тридцать рабочих дней, проверяем, что first_working_day не теряется и на
// этой карточке — тот же приём, что у ветви 1.

await chooseSituation('appraiser_involvement_request');
check(
  (await page.locator('#in-inventory_results_included_date_apk').count()) === 1,
  'ветвь "appraiser_involvement_request": основное поле не найдено в DOM',
);
await page.fill('#in-inventory_results_included_date_apk', '26.12.2025');
await settle();
check(
  (await page.locator('#results .card').count()) === 1,
  'в ветви требования о привлечении оценщика ожидалась одна карточка',
);
const appraiserCard = cardByTitle('Требование о привлечении независимого оценщика');
check((await appraiserCard.count()) === 1, 'карточка требования о привлечении оценщика не появилась');
check(
  (await deadlineOf(appraiserCard)) === '18.02.2026',
  `ждали дедлайн 18.02.2026, получили «${await deadlineOf(appraiserCard)}»`,
);
const appraiserText = await appraiserCard.innerText();
check(
  appraiserText.includes('Отсчёт рабочих дней с 29.12.2025'),
  `первый рабочий день не показан на карточке: «${appraiserText}»`,
);
check(
  appraiserText.includes('п. 5.1 ст. 110 ФЗ № 127-ФЗ'),
  'норма п. 5.1 ст. 110 ФЗ № 127-ФЗ не показана на карточке',
);
// «Два процента» — в логике исчисления внутри свёрнутого <details>, туда
// innerText не заглядывает (контент не отрисован, пока блок не раскрыт) —
// проверяем через outerHTML, как у остальных карточек в этом файле.
const appraiserHtml = await appraiserCard.evaluate((el) => el.outerHTML);
check(
  appraiserHtml.includes('два процента'),
  `условие права (2% от суммы требований) не показано на карточке: «${appraiserHtml}»`,
);

// --- Ветвь 12: заявление о составлении мотивированного определения (абз. 3 п. 2 ст. 71) ---
//
// Третий в домене working_day-узел.

await chooseSituation('claims_ruling_reasoned_request');
check(
  (await page.locator('#in-claims_ruling_resolutive_part_date_apk').count()) === 1,
  'ветвь "claims_ruling_reasoned_request": основное поле не найдено в DOM',
);
await page.fill('#in-claims_ruling_resolutive_part_date_apk', '26.12.2025');
await settle();
check(
  (await page.locator('#results .card').count()) === 1,
  'в ветви заявления о мотивированном определении ожидалась одна карточка',
);
const reasonedRequestCard = cardByTitle('Заявление о составлении мотивированного определения');
check(
  (await reasonedRequestCard.count()) === 1,
  'карточка заявления о мотивированном определении не появилась',
);
check(
  (await deadlineOf(reasonedRequestCard)) === '14.01.2026',
  `ждали дедлайн 14.01.2026, получили «${await deadlineOf(reasonedRequestCard)}»`,
);
check(
  (await reasonedRequestCard.innerText()).includes('абз. 3 п. 2 ст. 71 ФЗ № 127-ФЗ'),
  'норма абз. 3 п. 2 ст. 71 ФЗ № 127-ФЗ не показана на карточке',
);

// --- Ветвь 13: мотивированная часть жалобы (абз. 4 п. 2 ст. 71) ----------------
//
// Четвёртый в домене working_day-узел. Проверяем, что текст на карточке явно
// называет срок дополнительным к уже поданной жалобе, а не заменой срока
// обжалования (текст внутри свёрнутого <details> — проверка через outerHTML).

await chooseSituation('claims_ruling_reasoned_appeal');
check(
  (await page.locator('#in-claims_ruling_reasoned_date_apk').count()) === 1,
  'ветвь "claims_ruling_reasoned_appeal": основное поле не найдено в DOM',
);
await page.fill('#in-claims_ruling_reasoned_date_apk', '26.12.2025');
await settle();
check(
  (await page.locator('#results .card').count()) === 1,
  'в ветви мотивированной части жалобы ожидалась одна карточка',
);
const reasonedAppealCard = cardByTitle('Мотивированная часть жалобы на определение об установлении требований кредиторов');
check(
  (await reasonedAppealCard.count()) === 1,
  'карточка мотивированной части жалобы не появилась',
);
check(
  (await deadlineOf(reasonedAppealCard)) === '28.01.2026',
  `ждали дедлайн 28.01.2026, получили «${await deadlineOf(reasonedAppealCard)}»`,
);
const reasonedAppealHtml = await reasonedAppealCard.evaluate((el) => el.outerHTML);
check(
  reasonedAppealHtml.includes('абз. 4 п. 2 ст. 71 ФЗ № 127-ФЗ'),
  'норма абз. 4 п. 2 ст. 71 ФЗ № 127-ФЗ не показана на карточке',
);
check(
  reasonedAppealHtml.includes('не входит') && reasonedAppealHtml.includes('не заменяет'),
  `на карточке не отражено, что срок дополнительный, а не замена срока обжалования: «${reasonedAppealHtml}»`,
);

// --- Ветвь 14: оплата по договору купли-продажи предприятия (п. 19 ст. 110) ----
//
// Пятый в домене working_day-узел.

await chooseSituation('enterprise_sale_payment');
check(
  (await page.locator('#in-enterprise_sale_agreement_signed_date_apk').count()) === 1,
  'ветвь "enterprise_sale_payment": основное поле не найдено в DOM',
);
await page.fill('#in-enterprise_sale_agreement_signed_date_apk', '26.12.2025');
await settle();
check(
  (await page.locator('#results .card').count()) === 1,
  'в ветви оплаты по договору купли-продажи предприятия ожидалась одна карточка',
);
const enterprisePaymentCard = cardByTitle('Оплата по договору купли-продажи предприятия должника на торгах');
check(
  (await enterprisePaymentCard.count()) === 1,
  'карточка оплаты по договору купли-продажи предприятия не появилась',
);
check(
  (await deadlineOf(enterprisePaymentCard)) === '18.02.2026',
  `ждали дедлайн 18.02.2026, получили «${await deadlineOf(enterprisePaymentCard)}»`,
);
const enterprisePaymentText = await enterprisePaymentCard.innerText();
check(
  enterprisePaymentText.includes('Отсчёт рабочих дней с 29.12.2025'),
  `первый рабочий день не показан на карточке: «${enterprisePaymentText}»`,
);
check(
  enterprisePaymentText.includes('п. 19 ст. 110 ФЗ № 127-ФЗ'),
  'норма п. 19 ст. 110 ФЗ № 127-ФЗ не показана на карточке',
);

// --- Ветвь 15: обжалование отказа в утверждении мирового соглашения -----------
//
// Перенос по образцу: обычный месячный term-узел (та же механика, что и у
// ветви 10, ст. 162 п. 2). Норма отсылает к отдельной общей статье за
// числом срока — norm.primary на карточке должен быть ч. 1 ст. 61, а не
// ст. 160 ч. 3.

await chooseSituation('settlement_agreement_rejection_appeal');
check(
  (await page.locator('#in-settlement_agreement_rejection_ruling_date_apk').count()) === 1,
  'ветвь "settlement_agreement_rejection_appeal": основное поле не найдено в DOM',
);
await page.fill('#in-settlement_agreement_rejection_ruling_date_apk', '11.03.2025');
await settle();
check(
  (await page.locator('#results .card').count()) === 1,
  'в ветви обжалования отказа в утверждении мирового соглашения ожидалась одна карточка',
);
const rejectionAppealCard = cardByTitle('Обжалование отказа в утверждении мирового соглашения');
check((await rejectionAppealCard.count()) === 1, 'карточка обжалования отказа не появилась');
check(
  (await deadlineOf(rejectionAppealCard)) === '11.04.2025',
  `срок обжалования отказа посчитан неверно: ${await deadlineOf(rejectionAppealCard)}`,
);
check(
  (await rejectionAppealCard.innerText()).includes('ч. 1 ст. 61 ФЗ № 127-ФЗ'),
  'норма ч. 1 ст. 61 ФЗ № 127-ФЗ не показана на карточке обжалования отказа',
);

// --- Ветви 16-19: четыре узла обжалования определений внешнего управления -----
//
// Перенос по образцу: тот же паттерн, что у ветви 15 (ст. 160) — обычные
// месячные term-узлы, norm.primary на каждой карточке должен быть ч. 1
// ст. 61, а не статья-основание (93/106/122.1).

await chooseSituation('external_management_introduction_extension_appeal');
check(
  (await page.locator('#in-external_management_introduction_extension_ruling_date_apk').count()) === 1,
  'ветвь "external_management_introduction_extension_appeal": основное поле не найдено в DOM',
);
await page.fill('#in-external_management_introduction_extension_ruling_date_apk', '11.03.2025');
await settle();
check(
  (await page.locator('#results .card').count()) === 1,
  'в ветви обжалования определения о введении/продлении внешнего управления ожидалась одна карточка',
);
const introExtCard = cardByTitle('Обжалование определения о введении или продлении внешнего управления');
check((await introExtCard.count()) === 1, 'карточка обжалования определения о введении/продлении не появилась');
check(
  (await deadlineOf(introExtCard)) === '11.04.2025',
  `срок обжалования посчитан неверно: ${await deadlineOf(introExtCard)}`,
);
check(
  (await introExtCard.innerText()).includes('ч. 1 ст. 61 ФЗ № 127-ФЗ'),
  'норма ч. 1 ст. 61 ФЗ № 127-ФЗ не показана на карточке введения/продления',
);

await chooseSituation('external_management_reduction_appeal');
check(
  (await page.locator('#in-external_management_reduction_ruling_date_apk').count()) === 1,
  'ветвь "external_management_reduction_appeal": основное поле не найдено в DOM',
);
await page.fill('#in-external_management_reduction_ruling_date_apk', '11.03.2025');
await settle();
check(
  (await page.locator('#results .card').count()) === 1,
  'в ветви обжалования определения о сокращении срока внешнего управления ожидалась одна карточка',
);
const reductionCard = cardByTitle('Обжалование определения о сокращении срока внешнего управления');
check((await reductionCard.count()) === 1, 'карточка обжалования определения о сокращении не появилась');
check(
  (await deadlineOf(reductionCard)) === '11.04.2025',
  `срок обжалования посчитан неверно: ${await deadlineOf(reductionCard)}`,
);
check(
  (await reductionCard.innerText()).includes('ч. 1 ст. 61 ФЗ № 127-ФЗ'),
  'норма ч. 1 ст. 61 ФЗ № 127-ФЗ не показана на карточке сокращения срока',
);

await chooseSituation('external_management_plan_invalidation_appeal');
check(
  (await page.locator('#in-external_management_plan_invalidation_ruling_date_apk').count()) === 1,
  'ветвь "external_management_plan_invalidation_appeal": основное поле не найдено в DOM',
);
await page.fill('#in-external_management_plan_invalidation_ruling_date_apk', '11.03.2025');
await settle();
check(
  (await page.locator('#results .card').count()) === 1,
  'в ветви обжалования определения о признании плана недействительным ожидалась одна карточка',
);
const planInvalidationCard = cardByTitle(
  'Обжалование определения о признании недействительным плана внешнего управления',
);
check(
  (await planInvalidationCard.count()) === 1,
  'карточка обжалования определения о признании плана недействительным не появилась',
);
check(
  (await deadlineOf(planInvalidationCard)) === '11.04.2025',
  `срок обжалования посчитан неверно: ${await deadlineOf(planInvalidationCard)}`,
);
check(
  (await planInvalidationCard.innerText()).includes('ч. 1 ст. 61 ФЗ № 127-ФЗ'),
  'норма ч. 1 ст. 61 ФЗ № 127-ФЗ не показана на карточке признания плана недействительным',
);

await chooseSituation('external_management_term_expiry_refusal_appeal');
check(
  (await page.locator('#in-external_management_term_expiry_refusal_ruling_date_apk').count()) === 1,
  'ветвь "external_management_term_expiry_refusal_appeal": основное поле не найдено в DOM',
);
await page.fill('#in-external_management_term_expiry_refusal_ruling_date_apk', '11.03.2025');
await settle();
check(
  (await page.locator('#results .card').count()) === 1,
  'в ветви обжалования отказа в удовлетворении ходатайства ожидалась одна карточка',
);
const termExpiryRefusalCard = cardByTitle(
  'Обжалование отказа в удовлетворении ходатайства об отказе в признании должника банкротом при истечении сроков внешнего управления',
);
check(
  (await termExpiryRefusalCard.count()) === 1,
  'карточка обжалования отказа в удовлетворении ходатайства не появилась',
);
check(
  (await deadlineOf(termExpiryRefusalCard)) === '11.04.2025',
  `срок обжалования посчитан неверно: ${await deadlineOf(termExpiryRefusalCard)}`,
);
check(
  (await termExpiryRefusalCard.innerText()).includes('ч. 1 ст. 61 ФЗ № 127-ФЗ'),
  'норма ч. 1 ст. 61 ФЗ № 127-ФЗ не показана на карточке отказа в удовлетворении ходатайства',
);

// --- Ветвь 20: план внешнего управления (два узла из одного якоря) ------------
//
// Разработка плана (месяц) и созыв собрания по плану (два месяца) — два
// независимых обязательства внешнего управляющего из одной и той же даты
// утверждения. Тот же приём, что у ветви subsidiary_in_case (базовый узел +
// restoration делят одно поле).

await chooseSituation('external_management_plan');
check(
  (await page.locator('#in-external_management_manager_approved_date_apk').count()) === 1,
  'ветвь "external_management_plan": основное поле не найдено в DOM',
);
await page.fill('#in-external_management_manager_approved_date_apk', '11.03.2025');
await settle();
check(
  (await page.locator('#results .card').count()) === 2,
  'в ветви плана внешнего управления ожидались две карточки',
);
const planDevCard = cardByTitle('Разработка плана внешнего управления');
check((await planDevCard.count()) === 1, 'карточка разработки плана не появилась');
check(
  (await deadlineOf(planDevCard)) === '11.04.2025',
  `срок разработки плана посчитан неверно: ${await deadlineOf(planDevCard)}`,
);
check(
  (await planDevCard.innerText()).includes('ст. 106 п. 1 ФЗ № 127-ФЗ'),
  'норма ст. 106 п. 1 ФЗ № 127-ФЗ не показана на карточке разработки плана',
);
const planMeetingCard = cardByTitle('Созыв собрания кредиторов для рассмотрения плана внешнего управления');
check((await planMeetingCard.count()) === 1, 'карточка созыва собрания не появилась');
check(
  (await deadlineOf(planMeetingCard)) === '12.05.2025',
  `срок созыва собрания посчитан неверно: ${await deadlineOf(planMeetingCard)}`,
);
check(
  (await planMeetingCard.innerText()).includes('ч. 2 ст. 107 ФЗ № 127-ФЗ'),
  'норма ч. 2 ст. 107 ФЗ № 127-ФЗ не показана на карточке созыва собрания',
);

// --- Ветвь 21: представление плана внешнего управления в суд (5 раб. дней) ----

await chooseSituation('external_management_plan_submission');
check(
  (await page.locator('#in-external_management_plan_meeting_date_apk').count()) === 1,
  'ветвь "external_management_plan_submission": основное поле не найдено в DOM',
);
await page.fill('#in-external_management_plan_meeting_date_apk', '26.12.2025');
await settle();
check(
  (await page.locator('#results .card').count()) === 1,
  'в ветви представления плана в суд ожидалась одна карточка',
);
const planSubmissionCard = cardByTitle('Представление плана внешнего управления в арбитражный суд');
check((await planSubmissionCard.count()) === 1, 'карточка представления плана не появилась');
check(
  (await deadlineOf(planSubmissionCard)) === '14.01.2026',
  `срок представления плана посчитан неверно: ${await deadlineOf(planSubmissionCard)}`,
);
const planSubmissionText = await planSubmissionCard.innerText();
check(
  planSubmissionText.includes('Отсчёт рабочих дней с 29.12.2025'),
  `первый рабочий день не показан на карточке: «${planSubmissionText}»`,
);
check(
  planSubmissionText.includes('п. 4 ст. 107 ФЗ № 127-ФЗ'),
  'норма п. 4 ст. 107 ФЗ № 127-ФЗ не показана на карточке представления плана',
);

// --- Ветвь 22: направление отчёта и протокола собрания в суд (5 раб. дней) ----

await chooseSituation('external_management_report_submission');
check(
  (await page.locator('#in-external_management_report_meeting_date_apk').count()) === 1,
  'ветвь "external_management_report_submission": основное поле не найдено в DOM',
);
await page.fill('#in-external_management_report_meeting_date_apk', '11.03.2025');
await settle();
check(
  (await page.locator('#results .card').count()) === 1,
  'в ветви направления отчёта в суд ожидалась одна карточка',
);
const reportSubmissionCard = cardByTitle(
  'Направление в арбитражный суд отчёта внешнего управляющего и протокола собрания кредиторов',
);
check((await reportSubmissionCard.count()) === 1, 'карточка направления отчёта не появилась');
check(
  (await deadlineOf(reportSubmissionCard)) === '18.03.2025',
  `срок направления отчёта посчитан неверно: ${await deadlineOf(reportSubmissionCard)}`,
);
check(
  (await reportSubmissionCard.innerText()).includes('п. 2 ст. 119 ФЗ № 127-ФЗ'),
  'норма п. 2 ст. 119 ФЗ № 127-ФЗ не показана на карточке направления отчёта',
);

// --- Ветвь 23: отчёт при полном удовлетворении требований кредиторов ----------

await chooseSituation('external_management_report_on_full_satisfaction');
check(
  (await page.locator('#in-external_management_full_satisfaction_date_apk').count()) === 1,
  'ветвь "external_management_report_on_full_satisfaction": основное поле не найдено в DOM',
);
await page.fill('#in-external_management_full_satisfaction_date_apk', '11.03.2025');
await settle();
check(
  (await page.locator('#results .card').count()) === 1,
  'в ветви отчёта при полном удовлетворении требований ожидалась одна карточка',
);
const fullSatisfactionCard = cardByTitle(
  'Уведомление кредиторов и представление отчёта при полном удовлетворении требований в ходе внешнего управления',
);
check((await fullSatisfactionCard.count()) === 1, 'карточка отчёта при полном удовлетворении не появилась');
check(
  (await deadlineOf(fullSatisfactionCard)) === '11.04.2025',
  `срок отчёта посчитан неверно: ${await deadlineOf(fullSatisfactionCard)}`,
);
check(
  (await fullSatisfactionCard.innerText()).includes('п. 2 ст. 117 ФЗ № 127-ФЗ'),
  'норма п. 2 ст. 117 ФЗ № 127-ФЗ не показана на карточке отчёта',
);

// --- Ветвь 24: передача дел конкурсному управляющему (3 раб. дня) -------------

await chooseSituation('external_management_handover');
check(
  (await page.locator('#in-receiver_approved_date_apk').count()) === 1,
  'ветвь "external_management_handover": основное поле не найдено в DOM',
);
await page.fill('#in-receiver_approved_date_apk', '26.12.2025');
await settle();
check(
  (await page.locator('#results .card').count()) === 1,
  'в ветви передачи дел конкурсному управляющему ожидалась одна карточка',
);
const handoverCard = cardByTitle('Передача дел внешним управляющим конкурсному управляющему');
check((await handoverCard.count()) === 1, 'карточка передачи дел не появилась');
check(
  (await deadlineOf(handoverCard)) === '12.01.2026',
  `срок передачи дел посчитан неверно: ${await deadlineOf(handoverCard)}`,
);
const handoverText = await handoverCard.innerText();
check(
  handoverText.includes('Отсчёт рабочих дней с 29.12.2025'),
  `первый рабочий день не показан на карточке: «${handoverText}»`,
);
check(
  handoverText.includes('п. 3 ст. 123 ФЗ № 127-ФЗ'),
  'норма п. 3 ст. 123 ФЗ № 127-ФЗ не показана на карточке передачи дел',
);

// --- Ветвь 25: особое завершение внешнего управления при погашении требований
// третьим лицом/учредителями/собственником имущества (ст. 116, два узла) ------
//
// Последняя ветвь главы VI: два узла из одного и того же якоря — тот же
// приём, что у ветви external_management_plan.

await chooseSituation('external_management_third_party_satisfaction');
check(
  (await page.locator('#in-external_management_third_party_satisfaction_date_apk').count()) === 1,
  'ветвь "external_management_third_party_satisfaction": основное поле не найдено в DOM',
);
await page.fill('#in-external_management_third_party_satisfaction_date_apk', '26.12.2025');
await settle();
check(
  (await page.locator('#results .card').count()) === 2,
  'в ветви особого завершения внешнего управления ожидались две карточки',
);
const notificationCard = cardByTitle(
  'Уведомление кредиторов об удовлетворении требований третьим лицом, учредителями или собственником имущества должника',
);
check((await notificationCard.count()) === 1, 'карточка уведомления кредиторов не появилась');
check(
  (await deadlineOf(notificationCard)) === '21.01.2026',
  `срок уведомления кредиторов посчитан неверно: ${await deadlineOf(notificationCard)}`,
);
const notificationText = await notificationCard.innerText();
check(
  notificationText.includes('Отсчёт рабочих дней с 29.12.2025'),
  `первый рабочий день не показан на карточке уведомления: «${notificationText}»`,
);
check(
  notificationText.includes('п. 1 ст. 116 ФЗ № 127-ФЗ'),
  'норма п. 1 ст. 116 ФЗ № 127-ФЗ не показана на карточке уведомления кредиторов',
);
const specialReportCard = cardByTitle('Направление отчёта внешнего управляющего в суд без рассмотрения собранием кредиторов');
check((await specialReportCard.count()) === 1, 'карточка отчёта без рассмотрения собранием не появилась');
check(
  (await deadlineOf(specialReportCard)) === '27.01.2026',
  `срок отчёта посчитан неверно: ${await deadlineOf(specialReportCard)}`,
);
check(
  (await specialReportCard.innerText()).includes('п. 2 ст. 116 ФЗ № 127-ФЗ'),
  'норма п. 2 ст. 116 ФЗ № 127-ФЗ не показана на карточке отчёта без рассмотрения собранием',
);

// --- Ветвь 26: предложения о порядке продажи имущества должника (п. 1.1 ст. 110) ---
//
// Обычный месячный term-узел с альтернативным (не составным) якорем — одно
// поле обслуживает и «дата окончания инвентаризации», и «дата окончания
// оценки».

await chooseSituation('bankruptcy_property_sale_proposal');
check(
  (await page.locator('#in-property_inventory_or_valuation_completion_date_apk').count()) === 1,
  'ветвь "bankruptcy_property_sale_proposal": основное поле не найдено в DOM',
);
await page.fill('#in-property_inventory_or_valuation_completion_date_apk', '11.03.2025');
await settle();
check(
  (await page.locator('#results .card').count()) === 1,
  'в ветви предложений о порядке продажи имущества ожидалась одна карточка',
);
const saleProposalCard = cardByTitle('Представление предложений о порядке продажи имущества должника');
check((await saleProposalCard.count()) === 1, 'карточка предложений о порядке продажи не появилась');
check(
  (await deadlineOf(saleProposalCard)) === '11.04.2025',
  `срок представления предложений посчитан неверно: ${await deadlineOf(saleProposalCard)}`,
);
check(
  (await saleProposalCard.innerText()).includes('п. 1.1 ст. 110 ФЗ № 127-ФЗ'),
  'норма п. 1.1 ст. 110 ФЗ № 127-ФЗ не показана на карточке предложений о порядке продажи',
);

// --- Ветвь 27: включение отчёта об оценке в ЕФРСБ (п. 5.1 ст. 110, 2 раб. дня) ---
//
// Тот же пункт 5.1, что и у ветви appraiser_involvement_request, но
// отдельный узел с отдельным якорем.

await chooseSituation('appraisal_report_registry_inclusion');
check(
  (await page.locator('#in-appraisal_report_copy_received_date_apk').count()) === 1,
  'ветвь "appraisal_report_registry_inclusion": основное поле не найдено в DOM',
);
await page.fill('#in-appraisal_report_copy_received_date_apk', '26.12.2025');
await settle();
check(
  (await page.locator('#results .card').count()) === 1,
  'в ветви включения отчёта об оценке в ЕФРСБ ожидалась одна карточка',
);
const registryInclusionCard = cardByTitle('Включение сведений об отчёте об оценке имущества должника в ЕФРСБ');
check((await registryInclusionCard.count()) === 1, 'карточка включения отчёта об оценке в ЕФРСБ не появилась');
check(
  (await deadlineOf(registryInclusionCard)) === '30.12.2025',
  `срок включения отчёта в ЕФРСБ посчитан неверно: ${await deadlineOf(registryInclusionCard)}`,
);
const registryInclusionText = await registryInclusionCard.innerText();
check(
  registryInclusionText.includes('Отсчёт рабочих дней с 29.12.2025'),
  `первый рабочий день не показан на карточке: «${registryInclusionText}»`,
);
check(
  registryInclusionText.includes('п. 5.1 ст. 110 ФЗ № 127-ФЗ'),
  'норма п. 5.1 ст. 110 ФЗ № 127-ФЗ не показана на карточке включения отчёта в ЕФРСБ',
);

// --- Ветвь 28: обжалование определения об утверждении порядка продажи предприятия (ст. 110 п. 7.1) ---

await chooseSituation('enterprise_sale_procedure_approval_appeal');
check(
  (await page.locator('#in-enterprise_sale_procedure_approval_ruling_date_apk').count()) === 1,
  'ветвь "enterprise_sale_procedure_approval_appeal": основное поле не найдено в DOM',
);
await page.fill('#in-enterprise_sale_procedure_approval_ruling_date_apk', '11.03.2025');
await settle();
check(
  (await page.locator('#results .card').count()) === 1,
  'в ветви обжалования порядка продажи предприятия ожидалась одна карточка',
);
const enterpriseProcedureCard = cardByTitle(
  'Обжалование определения об утверждении порядка, сроков и условий продажи предприятия должника',
);
check((await enterpriseProcedureCard.count()) === 1, 'карточка обжалования порядка продажи предприятия не появилась');
check(
  (await deadlineOf(enterpriseProcedureCard)) === '11.04.2025',
  `срок обжалования посчитан неверно: ${await deadlineOf(enterpriseProcedureCard)}`,
);
check(
  (await enterpriseProcedureCard.innerText()).includes('ч. 1 ст. 61 ФЗ № 127-ФЗ'),
  'норма ч. 1 ст. 61 ФЗ № 127-ФЗ не показана на карточке обжалования порядка продажи предприятия',
);

// --- Ветвь 29: обжалование определения об утверждении порядка продажи имущества (ст. 139 п. 1.1) ---

await chooseSituation('property_sale_procedure_approval_appeal');
check(
  (await page.locator('#in-property_sale_procedure_approval_ruling_date_apk').count()) === 1,
  'ветвь "property_sale_procedure_approval_appeal": основное поле не найдено в DOM',
);
await page.fill('#in-property_sale_procedure_approval_ruling_date_apk', '11.03.2025');
await settle();
check(
  (await page.locator('#results .card').count()) === 1,
  'в ветви обжалования порядка продажи имущества ожидалась одна карточка',
);
const propertyProcedureCard = cardByTitle(
  'Обжалование определения об утверждении порядка, сроков и условий продажи имущества должника',
);
check((await propertyProcedureCard.count()) === 1, 'карточка обжалования порядка продажи имущества не появилась');
check(
  (await deadlineOf(propertyProcedureCard)) === '11.04.2025',
  `срок обжалования посчитан неверно: ${await deadlineOf(propertyProcedureCard)}`,
);
check(
  (await propertyProcedureCard.innerText()).includes('ч. 1 ст. 61 ФЗ № 127-ФЗ'),
  'норма ч. 1 ст. 61 ФЗ № 127-ФЗ не показана на карточке обжалования порядка продажи имущества',
);

// --- Ветвь 30: обжалование определения по заявлениям конкурсного управляющего о завершении конкурсного производства (п. 14-15 ст. 149) ---

await chooseSituation('bankruptcy_completion_request_ruling_appeal');
check(
  (await page.locator('#in-bankruptcy_completion_request_ruling_date_apk').count()) === 1,
  'ветвь "bankruptcy_completion_request_ruling_appeal": основное поле не найдено в DOM',
);
await page.fill('#in-bankruptcy_completion_request_ruling_date_apk', '11.03.2025');
await settle();
check(
  (await page.locator('#results .card').count()) === 1,
  'в ветви обжалования определения по заявлениям конкурсного управляющего ожидалась одна карточка',
);
const completionRequestRulingCard = cardByTitle(
  'Обжалование определения по результатам рассмотрения заявлений конкурсного управляющего о завершении конкурсного производства',
);
check(
  (await completionRequestRulingCard.count()) === 1,
  'карточка обжалования определения по заявлениям конкурсного управляющего не появилась',
);
check(
  (await deadlineOf(completionRequestRulingCard)) === '11.04.2025',
  `срок обжалования посчитан неверно: ${await deadlineOf(completionRequestRulingCard)}`,
);
check(
  (await completionRequestRulingCard.innerText()).includes('ч. 1 ст. 61 ФЗ № 127-ФЗ'),
  'норма ч. 1 ст. 61 ФЗ № 127-ФЗ не показана на карточке обжалования определения по заявлениям конкурсного управляющего',
);

// --- Негативные проверки: чего на странице быть не должно ----------------------
//
// Не «не тестировали», а явное отсутствие в DOM. Оба решения — архитектурные
// (см. шапки apk/bankruptcy-app.js и apk/bankruptcy-views.js), и молчаливое
// появление любого из этих элементов было бы регрессией, а не улучшением.

// 1. Экспорт в КАЛЕНДАРЬ: ни кнопки .ics, ни ссылки в Google Календарь.
//    Сводка (копирование и печать) — это не календарный экспорт, она есть и
//    проверяется отдельно ниже.
for (const [selector, what] of [
  ['#download-ics', 'кнопка «Скачать .ics»'],
  ['.to-calendar', 'ссылка «Добавить в Google Календарь»'],
  ['.to-calendar-block', 'блок ссылки на календарь'],
  ['a[href*="calendar.google.com"]', 'ссылка на calendar.google.com'],
  ['.toolbar-secondary', 'строка со ссылкой на файл .ics'],
]) {
  check((await page.locator(selector).count()) === 0, `на странице есть ${what} (${selector})`);
}
const bodyText = await page.locator('body').innerText();
for (const phrase of ['.ics', 'Google', 'Календарь событий']) {
  check(!bodyText.includes(phrase), `на странице есть текст календарного экспорта «${phrase}»`);
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
