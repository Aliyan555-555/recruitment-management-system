const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/admin/jobs/5/shortlist', 'a-12-shortlist-manual');
  const cb = (await page.$$('tbody input[type=checkbox], input[type=checkbox]'))[1] || (await page.$('input[type=checkbox]'));
  await cb.click(); await sleep(800);
  await shot(page, 'a-16-shortlist-selected');
  console.log(await page.evaluate(()=>[...document.querySelectorAll('button')].map(a=>a.textContent.trim()).filter(Boolean).join(' | ')));
  await browser.close();
})();
