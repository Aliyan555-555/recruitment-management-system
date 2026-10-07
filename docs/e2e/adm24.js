const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  page.on('dialog', d => d.accept());
  await visit(page, '/admin/jobs/5/rounds/10/candidates/12/loi', 'tmp'); await sleep(3000);
  await shot(page, 'a-36-loi-reset');
  console.log('words', (await text(page)).match(/Word Count: \d+/)?.[0]);
  await clickText(page, 'Save Draft'); await sleep(4000);
  await clickText(page, 'Generate PDF'); await sleep(20000);
  await shot(page, 'a-38-loi-generated');
  console.log(page.url()); console.log((await text(page)).match(/[^\n]*(generated|success|error|fail|sent|download)[^\n]*/gi));
  console.log(await page.evaluate(()=>[...document.querySelectorAll('button,a')].map(a=>a.textContent.trim()+(a.getAttribute('href')?'->'+a.getAttribute('href'):'')).filter(Boolean).slice(-8).join(' | ')));
  console.log([...new Set(issues)].join('\n'));
  await browser.close();
})();
