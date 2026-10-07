const { launch, visit, watch, issues, shot, sleep, text } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await page.goto('http://localhost:3100/candidate/quick-test/5', { waitUntil: 'domcontentloaded' }); await sleep(8000);
  console.log(page.url()); console.log((await text(page)).slice(0, 1000));
  await shot(page, 'c-13-quicktest-done');
  console.log(await page.evaluate(()=>[...document.querySelectorAll('button,a')].map(a=>a.textContent.trim()+'->'+(a.getAttribute('href')||'')).filter(Boolean).join(' | ')));
  await browser.close();
})();
