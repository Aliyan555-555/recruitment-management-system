const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page); page.on('dialog', d => d.accept());
  await visit(page, '/applications/5', 'c-16-app-loi', true); await sleep(2500);
  const t = await text(page); console.log(t.slice(t.indexOf('Interview Process')-50, t.indexOf('Interview Process')+1500));
  console.log(await page.evaluate(()=>[...document.querySelectorAll('button')].map(a=>a.textContent.trim()).filter(Boolean).join(' | ')));
  await browser.close();
})();
