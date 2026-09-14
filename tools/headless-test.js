import { chromium } from 'playwright';

(async () => {
  const url = process.argv[2] || 'http://localhost:5174';
  console.log('Visiting', url);

  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  const errors = [];

  page.on('console', (msg) => {
    const text = msg.text();
    console.log('[PAGE CONSOLE]', msg.type(), text);
    if (msg.type() === 'error') errors.push(text);
  });

  page.on('pageerror', (err) => {
    console.error('[PAGE ERROR]', err.message);
    errors.push(err.message);
  });

  page.on('requestfailed', (request) => {
    console.warn('[REQUEST FAILED]', request.url(), request.failure()?.errorText);
  });

  try {
    const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('[HTTP STATUS]', res && res.status());

    // Wait a bit for dynamic scripts to run
    await page.waitForTimeout(2000);

    // Capture DOM snapshot size
    const html = await page.content();
    console.log('[DOM SIZE]', html.length);

    await page.screenshot({ path: '/tmp/smart-soleh-headless.png', fullPage: true });

    if (errors.length) {
      console.error('[ERRORS FOUND]', errors.length);
      errors.forEach((e) => console.error(e));
      await browser.close();
      process.exit(1);
    }

    console.log('[NO ERRORS]');
    await browser.close();
    process.exit(0);
  } catch (e) {
    console.error('[SCRIPT ERROR]', e);
    await browser.close();
    process.exit(2);
  }
})();
