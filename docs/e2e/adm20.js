const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/admin/jobs/5/rounds/10/applied', 'a-33-offer-round-needs-review', true); await sleep(2500);
  console.log((await text(page)).slice(300, 1600));
  console.log(await page.evaluate(()=>[...document.querySelectorAll('button,a')].map(a=>a.textContent.trim()+(a.getAttribute('href')?'->'+a.getAttribute('href'):'')).filter(Boolean).slice(12).join(' | ')));
  await browser.close();
})();
