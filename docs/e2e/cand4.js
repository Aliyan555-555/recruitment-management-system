const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/candidate/assessments/35?assessmentId=35', 'c-assess-q1');
  const opts = await page.evaluate(() => [...document.querySelectorAll('[role=radio], label, input[type=radio]')].slice(0,6).map(e=>e.tagName+':'+(e.getAttribute('role')||e.type||'')+':'+e.textContent.trim().slice(0,30)));
  console.log(opts);
  for (let q = 1; q <= 10; q++) {
    const qt = await page.evaluate(() => document.body.innerText.match(/Question \d+ of \d+/)?.[0]);
    let labelEl = null;
    for (const b of await page.$$('button[type=button]')) { if (await b.evaluate(e => !!e.querySelector('span') && e.className.includes('border') && !/Previous|Next|Submit|Toggle/.test(e.textContent))) { labelEl = b; break; } }
    await labelEl.evaluate(e => e.scrollIntoView({block:'center'})); await labelEl.click(); await sleep(400);
    if ([1,5,10].includes(q)) await shot(page, 'c-assess-q' + q + '-answered');
    const btns = await page.$$('button'); let nxt = null;
    for (const b of btns) { const t = await b.evaluate(e=>e.textContent.trim()); if (/^(Next|Submit|Finish)/i.test(t)) nxt = b; }
    console.log(qt, 'click', nxt && await nxt.evaluate(e=>e.textContent.trim()));
    await nxt.click(); await sleep(q === 10 ? 12000 : 700);
  }
  await shot(page, 'c-assess-result'); console.log(page.url()); console.log((await text(page)).slice(0, 1500));
  console.log([...new Set(issues)].join('\n'));
  await browser.close();
})();
