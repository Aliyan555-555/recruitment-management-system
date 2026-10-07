const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/admin/jobs/5/rounds/10/candidates/12/loi', 'tmp'); await sleep(2000);
  await shot(page, 'a-36-loi-filled', true);
  await clickText(page, 'Save Draft'); await sleep(3000); await shot(page, 'a-37-loi-saved');
  console.log((await text(page)).match(/[^\n]*(saved|success|error|fail)[^\n]*/gi));
  await clickText(page, 'Generate PDF'); await sleep(15000); await shot(page, 'a-38-loi-generated');
  console.log(page.url()); console.log((await text(page)).match(/[^\n]*(generated|success|error|fail|sent|candidate)[^\n]*/gi));
  console.log([...new Set(issues)].join('\n'));
  await browser.close();
})();
