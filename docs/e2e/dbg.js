const { launch, sleep, BASE, shot, text } = require('./lib');
(async () => {
  const { browser, page } = await launch();
  const t0 = Date.now();
  page.on('request', r => { if (r.url().includes('/api/')) console.log(((Date.now()-t0)/1000).toFixed(1), '->', r.method(), r.url().replace(BASE,'')); });
  page.on('response', r => { if (r.url().includes('/api/')) console.log(((Date.now()-t0)/1000).toFixed(1), '<-', r.status(), r.url().replace(BASE,'')); });
  page.on('requestfailed', r => console.log('FAILED', r.url().replace(BASE,''), r.failure()?.errorText));
  await page.goto(BASE + '/' + process.env.U, { waitUntil: 'domcontentloaded' });
  await sleep(+process.env.W || 40000);
  console.log((await text(page)).slice(0, 600));
  await browser.close();
})();
