const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/admin/jobs/5/shortlist', 'tmp');
  const cbs = await page.$$('input[type=checkbox]'); await cbs[cbs.length - 1].click(); await sleep(500);
  await clickText(page, 'Shortlist Selected'); await sleep(3000);
  await shot(page, 'a-17-shortlist-done');
  console.log((await text(page)).match(/(shortlisted|success|moved|error|fail)[^\n]*/gi));
  await clickText(page, 'Next Round'); await sleep(5000);
  await shot(page, 'a-18-next-round', true);
  console.log(page.url()); console.log((await text(page)).slice(0, 1800));
  console.log(await page.evaluate(()=>[...document.querySelectorAll('button,a')].map(a=>a.textContent.trim()).filter(Boolean).join(' | ')));
  await browser.close();
})();
