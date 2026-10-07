const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/admin/jobs/5/rounds/9/candidates/12/assessment', 'a-25-assess-landing');
  await page.evaluate(() => { const vals = [8,7,8,6,9,8,7,9,8,7,8,7]; [...document.querySelectorAll('input[type=range]')].forEach((e,i) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e, String(vals[i%vals.length])); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); }); });
  await sleep(800); await shot(page, 'a-26-assess-scored', true);
  await clickText(page, 'Continue to Review'); await sleep(4000);
  await shot(page, 'a-27-assess-review', true);
  console.log(page.url()); console.log((await text(page)).slice(300, 2500));
  console.log(await page.evaluate(()=>[...document.querySelectorAll('button,a,input,select,textarea')].map(a=>a.tagName+':'+(a.textContent.trim()||a.placeholder||a.type)+(a.getAttribute('href')?'->'+a.getAttribute('href'):'')).slice(12).join(' | ')));
  await browser.close();
})();
