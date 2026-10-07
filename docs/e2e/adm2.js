const { launch, login, visit, watch, issues, shot, sleep, text } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/admin/jobs/create', 'tmp');
  console.log(await page.evaluate(() => [...document.querySelectorAll('select')].map((s,i) => i + ': ' + [...s.options].map(o=>o.value+'|'+o.text).join(' ; ').slice(0,300)).join('\n')));
  console.log(await page.evaluate(() => document.querySelector('input[type=text][disabled], input[readonly]')?.value));
  await visit(page, '/admin/settings', 'a-settings');
  console.log((await text(page)).slice(0, 1500));
  await browser.close();
})();
