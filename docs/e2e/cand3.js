const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/candidate/assessments/35', 'c-assess-start');
  console.log(await text(page));
  await clickText(page, 'Start');
  await sleep(15000);
  await shot(page, 'c-assess-q1');
  console.log(page.url()); console.log((await text(page)).slice(0, 1500));
  console.log([...new Set(issues)].join('\n'));
  await browser.close();
})();
