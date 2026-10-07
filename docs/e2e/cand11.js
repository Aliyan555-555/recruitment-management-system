const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page); page.on('dialog', d => d.accept());
  await visit(page, '/applications/5', 'tmp'); await sleep(1500);
  await clickText(page, 'Accept Offer', 'button'); await sleep(2000);
  await shot(page, 'c-17-accept-confirm');
  const b = await page.evaluate(()=>[...document.querySelectorAll('button')].map(a=>a.textContent.trim()).filter(Boolean));
  console.log(b);
  const c = b.find(x => /^(Confirm|Yes|Accept)/i.test(x) && x !== 'Accept Offer'); if (c) await clickText(page, c, 'button');
  await sleep(5000); await shot(page, 'c-18-accepted', true);
  const t = await text(page); console.log(t.slice(t.indexOf('Letter of Intent')-50, t.indexOf('Letter of Intent')+500));
  console.log([...new Set(issues)].join('\n'));
  await browser.close();
})();
