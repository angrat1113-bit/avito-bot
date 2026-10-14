const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Открываем Авито...');
  await page.goto('https://www.avito.ru');

  console.log('\n=============================================\n1. Войди в свой аккаунт Авито в открывшемся окне браузера.\n2. Как только вошел - вернись сюда и нажми ENTER.\n=============================================\n');

  process.stdin.once('data', async () => {
    await context.storageState({ path: 'avito_state.json' });
    console.log('Успешно! Вход сохранен.');
    await browser.close();
    process.exit();
  });
})();