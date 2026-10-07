const { launch, sleep, BASE } = require('./lib');
(async () => {
  const { browser, page } = await launch();
  await page.goto(BASE + '/jobs', { waitUntil: 'domcontentloaded' }); await sleep(3000);
  const r = await page.evaluate(async () => { const x = await fetch('/_next/static/chunks/app/candidate/layout.js'); const t = await x.text(); return x.status + ' ' + t.slice(0, 1500); });
  console.log(r);
  await browser.close();
})();
