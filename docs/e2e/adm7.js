const { launch, visit, watch, issues, shot, sleep, text } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/admin/jobs/5/ai-shortlist', 'a-15-ai-shortlist-results', true);
  const t = await text(page); console.log(t.slice(t.indexOf('Evaluation Run'), t.indexOf('Evaluation Run')+1200));
  await browser.close();
})();
