const { chromium } = require('playwright');
const path = require('path');
const readline = require('readline');

(async () => {
    console.log('Запускаем чистый профиль Chrome для бота...');
    const userDataDir = path.resolve('insta_bot_profile');
    
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        channel: 'chrome',
        args: ['--disable-blink-features=AutomationControlled'],
        ignoreDefaultArgs: ['--enable-automation']
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    console.log('\n===============================================================');
    console.log('👉 Браузер открыт! Твои шаги:');
    console.log('1. Скачай в нмм FoxyProxy из магазина Chrome.');
    console.log('2. Настрой свой прокси (95.134.227.116:10000, лог/пар) и ВКЛЮЧИ ЕГА.');
    console.log('3. Зайди на instagram.com и залогинься.');
    console.log('4. Как только увидишь ленту — напиши ok в этой консоли и нажми ENTER.');
    console.log('===============================================================\n');

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.on('line', async (line) => {
        if (line.trim().toLowerCase() === 'ok') {
            console.log('✅ Сохраняем сессию и профиль...');
            await context.close();
            console.log('Готово! Теперь бот будет всегда работать через этот профиль с FoxyProxy.');
            process.exit(0);
        } else {
            console.log('⚠ Напиши ok и нажми ENTER, когда залогинишься в Инсте.');
        }
    });
})();