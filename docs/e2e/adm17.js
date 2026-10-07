const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/admin/jobs/5/rounds/9/candidates/12/assessment', 'tmp');
  await page.evaluate(() => { const vals = [8,7,8,6,9,8,7,9,8,7,8,7]; [...document.querySelectorAll('input[type=range]')].forEach((e,i) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e, String(vals[i%vals.length])); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); }); });
  await clickText(page, 'Continue to Review'); await sleep(2500);
  const ta = await page.$('textarea'); if (ta) { await ta.type('Strong React fundamentals and clear communication. Recommend moving to offer.'); }
  const sels = await page.$$('select'); await sels[0].select(await sels[0].evaluate(e => [...e.options].find(o => /Recommended/.test(o.text) && !/Not/.test(o.text)).value)); await sels[1].select(await sels[1].evaluate(e => [...e.options].find(o => /High/.test(o.text)).value));
  await shot(page, 'a-28-assess-recommendation', true);
  await clickText(page, 'Submit Assessment'); await sleep(6000);
  await shot(page, 'a-29-assess-submitted');
  console.log(page.url()); console.log((await text(page)).slice(300, 1500));
  console.log([...new Set(issues)].join('\n'));
  await browser.close();
})();
