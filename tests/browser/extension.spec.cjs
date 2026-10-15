const { test, expect, chromium } = require('@playwright/test');
const path = require('node:path');
const extension = path.resolve('chatgpt-work-confirm');
let context, page;
test.beforeAll(async () => {
  context = await chromium.launchPersistentContext('', {
    channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
  });
  await context.route('https://chatgpt.com/**', route => route.fulfill({
    contentType: 'text/html; charset=utf-8', body: `<!doctype html><meta charset="utf-8"><form>
    <div data-composer-input-variant="work-home"><div contenteditable="true"
    data-composer-markdown aria-label="Work モードで作成">テスト</div></div>
    <button type="submit" aria-label="送信"><span>送信</span></button></form>
    <script>window.sent=0;
    document.querySelector('form').addEventListener('submit',e=>{e.preventDefault();window.sent++});
    document.querySelector('[contenteditable]').addEventListener('keydown',e=>{
      if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();document.querySelector('button').click()}
    });</script>`
  }));
  page = await context.newPage();
});
test.afterAll(async () => { await context?.close(); });
for (const gesture of ['button', 'Enter']) {
  for (const allow of [false, true]) {
    test(`${gesture} ${allow ? 'OK' : 'cancel'}: exactly one confirmation`, async () => {
      await page.goto('https://chatgpt.com/');
      let dialogs = 0;
      const handler = async dialog => { dialogs++; await (allow ? dialog.accept() : dialog.dismiss()); };
      page.on('dialog', handler);
      try {
        if (gesture === 'button') await page.locator('button span').click();
        else await page.locator('[contenteditable]').press('Enter');
        expect(dialogs).toBe(1);
        expect(await page.evaluate(() => window.sent)).toBe(allow ? 1 : 0);
        await expect(page.locator('[contenteditable]')).toHaveText('テスト');
      } finally { page.off('dialog', handler); }
    });
  }
}
test('Chat, Shift+Enter, mode change, reload', async () => {
  await page.goto('https://chatgpt.com/');
  page.on('dialog', async dialog => { await dialog.dismiss(); throw Error('Unexpected dialog'); });
  await page.locator('[contenteditable]').press('Shift+Enter');
  await page.evaluate(() => {
    document.querySelector('[data-composer-input-variant]').setAttribute('data-composer-input-variant','default');
    document.querySelector('[data-composer-markdown]').setAttribute('aria-label','ChatGPT に聞く');
  });
  await page.locator('button').click();
  expect(await page.evaluate(() => window.sent)).toBe(1);
  page.removeAllListeners('dialog');
  await page.reload();
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('button').click();
  expect(await page.evaluate(() => window.sent)).toBe(0);
});
