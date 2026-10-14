const { chromium } = require('playwright');
const fs = require('fs');

const delay = ms => new Promise(r => setTimeout(r, ms));
const getRandom = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ================= НАСТРОЙКИ БОТА =================
const CONFIG = {
    keywords: ['Строительство дома', 'электрика', 'отопление', 'вентиляция', 'кондиционер', 'сантехника'], 
    maxProfilesPerKeyword: 10, 
    maxMessages: 15, 
    maxDaysInactive: 90, 
    
    messageText: "Добрый вечер 👋\n\nНаткнулся на ваш аккаунт — вижу, что вы регулярно показываете объекты и работу, но потенциал у контента явно выше\n\nЯ делаю Reels для специалистов в сфере HVAC через ИИ — без съёмок, операторов и долгого монтажа\n\nВ вашей нише уже разгоняли ролики с 5–6к до 50к–6 млн просмотров\n \nМогу за пару минут показать примеры. Интересно?"
};
// ==================================================

function loadHistory() { return fs.existsSync('processed_insta.json') ? JSON.parse(fs.readFileSync('processed_insta.json', 'utf-8')) : []; }
function saveHistory(history) { fs.writeFileSync('processed_insta.json', JSON.stringify(history, null, 2)); }

(async () => {
    let browser;
    try {
        console.log('🔌 Подключаемся к открытому браузеру Chrome...');
        browser = await chromium.connectOverCDP('http://localhost:9222');
    } catch(e) {
        console.log('❌ Ошибка: Сначала открой Chrome через команду start chrome --remote-debugging-port=9222 ...');
        process.exit(1);
    }

    const history = loadHistory();
    let sentCount = 0;
    let allTargets = new Set();

    const context = browser.contexts()[0];
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    console.log('🚀 Бот запущен и готов к работе!');

    // ================= ЭТАП 1: СБОР С ЖЕСТКИМ ФИЛЬТРОМ МУСОРА =================
    for (const keyword of CONFIG.keywords) {
        console.log(`\n🔍 Ищем профили по запросу: "${keyword}"...`);
        try {
            const searchUrl = `https://www.instagram.com/explore/search/?q=${encodeURIComponent(keyword)}`;
            await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
            await delay(getRandom(5000, 7000));

            // Скроллим выдачу вниз, чтобы подгрузить пользователей
            for(let s = 0; s < 3; s++) {
                await page.evaluate((y) => window.scrollBy({ top: y, behavior: 'smooth' }), 800);
                await delay(getRandom(2000, 3000));
            }

            // Жесткая фильтрация: берем только короткие одиночные пути и отсекаем весь служебный хлам
            const usernames = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('main a[href], div[role="main"] a[href], a[tabindex]'));
                return links
                    .map(a => a.getAttribute('href'))
                    .filter(href => href && href.startsWith('/') && !href.includes('/') && href.length > 1) 
                    .map(href => href.replace(/\//g, ''))
                    .filter(u => {
                        const trash = [
                            'accounts', 'emails', 'direct', 'stories', 'login', 'signup', 
                            'explore', 'search', 'reels', 'p', 'about', 'support', 'blog', 
                            'press', 'api', 'jobs', 'privacy', 'terms', 'legalprivacy', 
                            'legalterms', 'accountsmeta', 'directinbox', 'vlad.example', 'popular', 'weblite'
                        ];
                        return u.length > 0 && !trash.some(t => u.toLowerCase().includes(t));
                    });
            });

            const uniqueUsers = [...new Set(usernames)].slice(0, CONFIG.maxProfilesPerKeyword);
            console.log(`✅ Найдено чистых профилей для "${keyword}": ${uniqueUsers.length} ->`, uniqueUsers);
            uniqueUsers.forEach(u => allTargets.add(u));

        } catch(e) {
            console.log(`❌ Ошибка поиска "${keyword}": ${e.message}`);
        }
    }

    const targetsArray = Array.from(allTargets);
    console.log(`\n=========================================`);
    console.log(`🎯 Всего уникальных аккаунтов в очереди: ${targetsArray.length}`);
    console.log(`=========================================\n`);

    // ================= ЭТАП 2: ПРОВЕРКА И РАССЫЛКА =================
    for (const user of targetsArray) {
        if (sentCount >= CONFIG.maxMessages) { 
            console.log('\n🛑 Лимит сообщений достигнут!'); 
            break; 
        }
        if (history.includes(user)) { continue; }

        console.log(`\n🕵️ Переходим к профилю @${user}...`);
        
        try {
            await page.goto(`https://www.instagram.com/${user}/`, { waitUntil: 'domcontentloaded' });
            await delay(getRandom(4000, 6000));

            await page.evaluate((y) => window.scrollBy({ top: y, behavior: 'smooth' }), getRandom(300, 500));
            await delay(getRandom(1500, 2500));
            await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
            await delay(getRandom(1500, 2500));

            let isAlive = false;
            const hasStory = await page.evaluate(() => {
                const header = document.querySelector('header');
                return header ? !!header.querySelector('canvas') : false;
            });

            if (hasStory) {
                console.log(`🟢 Профиль ЖИВ: есть свежие сторис!`);
                isAlive = true;
            } else {
                const postHrefs = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('a[href^="/p/"]')).slice(0, 4).map(a => a.href);
                });
                
                if (postHrefs.length > 0) {
                    for (let i = 0; i < postHrefs.length; i++) {
                        await page.goto(postHrefs[i], { waitUntil: 'domcontentloaded' });
                        await delay(getRandom(2000, 3000));

                        const datetime = await page.evaluate(() => {
                            const t = document.querySelector('time[datetime]');
                            return t ? t.getAttribute('datetime') : null;
                        });
                        
                        if (datetime) {
                            const daysAgo = (new Date() - new Date(datetime)) / (1000 * 60 * 60 * 24);
                            if (daysAgo <= CONFIG.maxDaysInactive) {
                                console.log(`🟢 Нашли пост (${Math.round(daysAgo)} дней назад). Профиль ЖИВ!`);
                                isAlive = true;
                                break; 
                            }
                        }
                    }
                    await page.goto(`https://www.instagram.com/${user}/`, { waitUntil: 'domcontentloaded' });
                    await delay(getRandom(2000, 4000));
                }
            }

            if (!isAlive) {
                console.log(`⏭️ Аккаунт @${user} мертв. Пропускаем.`);
                history.push(user);
                saveHistory(history);
                continue;
            }

            const msgBtn = await page.$('div[role="button"]:has-text("Сообщение"), button:has-text("Сообщение"), div[role="button"]:has-text("Message"), button:has-text("Message"), a[role="link"]:has-text("Сообщение"), a[href^="/direct/t/"]');
            
            if (!msgBtn) { 
                console.log(`⚠️ Личка закрыта у @${user}.`); 
                history.push(user); 
                saveHistory(history); 
                continue; 
            }

            await msgBtn.hover();
            await delay(getRandom(500, 1000));
            await msgBtn.click();
            await delay(getRandom(5000, 7000));

            const alreadySent = await page.evaluate(() => { 
                const text = document.body.innerText.toLowerCase(); 
                return text.includes('наткнулся на ваш аккаунт') || text.includes('делаю reels') || text.includes('в вашей нише'); 
            });

            if (alreadySent) { 
                console.log(`✅ Уже общались с @${user}. Пропускаем.`); 
                history.push(user); 
                saveHistory(history); 
                continue; 
            }

            const inputSelector = 'div[contenteditable="true"], textarea';
            await page.waitForSelector(inputSelector, { timeout: 10000 });
            await page.focus(inputSelector);

            console.log(`✍️ Медленно печатаем текст сообщения...`);
            const lines = CONFIG.messageText.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (lines[i]) {
                    for (const char of lines[i]) {
                        await page.type(inputSelector, char, { delay: getRandom(40, 150) });
                        if (Math.random() < 0.05) await delay(getRandom(200, 600));
                    }
                }
                if (i < lines.length - 1) { 
                    await page.keyboard.down('Shift'); 
                    await page.keyboard.press('Enter'); 
                    await page.keyboard.up('Shift'); 
                    await delay(getRandom(800, 1500)); 
                }
            }

            await delay(getRandom(1500, 3000));
            await page.keyboard.press('Enter');
            sentCount++;
            
            console.log(`---> 🎉 УСПЕХ! Отправлено сообщение №${sentCount} для @${user}`);
            history.push(user);
            saveHistory(history);

            const waitTime = getRandom(120000, 180000); 
            console.log(`⏳ Пауза безопасности: ждем ${Math.round(waitTime/1000)} сек...`);
            await delay(waitTime);

        } catch(e) { 
            console.log(`❌ Ошибка с профилем @${user}: ${e.message}`); 
        }
    }

    console.log('\n✅ Работа скрипта полностью завершена!');
})();