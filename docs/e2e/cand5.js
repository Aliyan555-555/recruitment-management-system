const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/candidate/profile', 'c-04-profile', true);
  await visit(page, '/jobs', 'c-05-jobs');
  await visit(page, '/jobs/5', 'c-06-job-detail', true);
  console.log((await text(page)).slice(0, 1800));
  console.log(await page.evaluate(()=>[...document.querySelectorAll('button,a')].map(a=>a.textContent.trim()).filter(Boolean).join(' | ')));
  await browser.close();
})();
