const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/admin/jobs', 'a-09-jobs-list');
  await visit(page, '/admin/jobs/5', 'a-10-job-detail', true);
  await visit(page, '/admin/jobs/5/quick-test', 'a-11-quicktest-results', true);
  console.log((await text(page)).slice(0, 1200));
  await visit(page, '/admin/jobs/5/shortlist', 'a-12-shortlist-manual', true);
  console.log((await text(page)).slice(0, 1500));
  console.log(await page.evaluate(()=>[...document.querySelectorAll('button,a')].map(a=>a.textContent.trim()).filter(Boolean).join(' | ')));
  console.log([...new Set(issues)].join('\n'));
  await browser.close();
})();
