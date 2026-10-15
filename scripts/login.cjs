const { chromium } = require('@playwright/test');
const path = require('node:path');
(async () => {
  const extension = path.resolve('chatgpt-work-confirm');
  const context = await chromium.launchPersistentContext(path.resolve('.profile'), {
    channel: 'chromium', headless: false,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
  });
  await context.pages()[0].goto('https://chatgpt.com/');
  console.log('ログインしてください。実メッセージの自動送信は行いません。ブラウザを閉じると終了します。');
  await new Promise(resolve => context.on('close', resolve));
})().catch(error => { console.error(error); process.exitCode = 1; });
