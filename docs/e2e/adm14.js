const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/admin/jobs/5/rounds/9/slots', 'a-21-slots');
  await clickText(page, 'Create Slots'); await sleep(1200);
  const x = new Date(); x.setDate(x.getDate() + 3); const d = x.toISOString().slice(0, 10);
  const di = await page.$('input[type=date]');
  await di.evaluate((e, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(e, v); e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, d);
  await shot(page, 'a-23-slots-dialog-filled');
  await clickText(page, 'Generate Slots'); await sleep(5000);
  await shot(page, 'a-24-slots-created', true);
  console.log((await text(page)).slice(300, 1500));
  console.log([...new Set(issues)].join('\n'));
  await browser.close();
})();
