const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page); page.on('dialog', d => d.accept());
  await visit(page, '/admin/jobs/5/rounds/10/candidates/12/loi', 'tmp'); await sleep(3000);
  await clickText(page, 'Mark as Sent'); await sleep(5000);
  await shot(page, 'a-39-loi-sent');
  await visit(page, '/admin/jobs/5/rounds/10/offers', 'a-40-offers-after-loi', true); await sleep(2500);
  console.log((await text(page)).slice(400, 1200));
  console.log(await page.evaluate(()=>[...document.querySelectorAll('button,a')].map(a=>a.textContent.trim()+(a.getAttribute('href')?'->'+a.getAttribute('href'):'')).filter(Boolean).slice(12).join(' | ')));
  await browser.close();
})();
