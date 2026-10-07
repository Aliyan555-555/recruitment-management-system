const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/admin/jobs/5/rounds/10/applied', 'tmp'); await sleep(1500);
  await clickText(page, 'Shortlist', 'tbody button'); await sleep(10000);
  await visit(page, '/admin/jobs/5/rounds/10/offers', 'a-34-offers', true); await sleep(2500);
  console.log((await text(page)).slice(300, 1800));
  console.log(await page.evaluate(()=>[...document.querySelectorAll('button,a')].map(a=>a.textContent.trim()+(a.getAttribute('href')?'->'+a.getAttribute('href'):'')).filter(Boolean).slice(12).join(' | ')));
  await browser.close();
})();
