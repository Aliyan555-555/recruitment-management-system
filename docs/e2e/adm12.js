const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/admin/jobs/5/rounds/9/shortlisted', 'a-20-round-inround', true);
  await sleep(2000);
  console.log((await text(page)).slice(300, 2200));
  console.log(await page.evaluate(()=>[...document.querySelectorAll('button,a')].map(a=>a.textContent.trim()+(a.getAttribute('href')?'->'+a.getAttribute('href'):'')).filter(Boolean).slice(12).join(' | ')));
  await visit(page, '/admin/jobs/5/rounds/9/slots', 'a-21-slots', true); await sleep(2000);
  console.log((await text(page)).slice(300, 2200));
  console.log(await page.evaluate(()=>[...document.querySelectorAll('button,a,input,select')].map(a=>(a.tagName+':'+(a.textContent.trim()||a.placeholder||a.type))).filter(Boolean).slice(12).join(' | ')));
  await browser.close();
})();
