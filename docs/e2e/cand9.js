const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/jobs/5', 'c-14-job-applied');
  await clickText(page, 'View Application'); await sleep(6000);
  await shot(page, 'c-15-application-status', true);
  console.log(page.url()); console.log((await text(page)).slice(0, 1500));
  await browser.close();
})();
