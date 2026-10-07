const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/admin/jobs/5/rounds/10/candidates/12/loi', 'a-35-loi', true); await sleep(2500);
  console.log((await text(page)).slice(300, 2200));
  console.log(await page.evaluate(()=>[...document.querySelectorAll('button,a,input,select,textarea')].map(a=>a.tagName+':'+(a.textContent.trim()||a.placeholder||a.type)+(a.getAttribute('href')?'->'+a.getAttribute('href'):'')).slice(12).join(' | ')));
  await browser.close();
})();
