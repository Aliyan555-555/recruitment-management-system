const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/admin/jobs/5/rounds/9/slots', 'a-21-slots');
  await clickText(page, 'Create Slots'); await sleep(1500);
  await shot(page, 'a-22-slots-dialog');
  console.log(await page.evaluate(()=>[...document.querySelectorAll('[role=dialog] input,[role=dialog] select,[role=dialog] button,[role=dialog] label')].map(a=>a.tagName+':'+(a.textContent.trim()||a.placeholder||a.type)+':'+(a.value||'')).join('\n')));
  await browser.close();
})();
