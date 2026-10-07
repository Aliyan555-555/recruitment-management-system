const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/jobs/5', 'c-06-job-detail');
  await clickText(page, 'Take Quick Test'); await sleep(8000);
  await shot(page, 'c-07-quicktest-intro', true);
  console.log(page.url()); console.log((await text(page)).slice(0, 1500));
  console.log(await page.evaluate(()=>[...document.querySelectorAll('button')].map(a=>a.textContent.trim()).filter(Boolean).join(' | ')));
  console.log([...new Set(issues)].join('\n'));
  await browser.close();
})();
