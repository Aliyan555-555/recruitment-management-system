const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/candidate/quick-test/5', 'c-07-quicktest-intro');
  await clickText(page, 'Start quick test'); await sleep(15000);
  await shot(page, 'c-08-quicktest-q1');
  console.log((await text(page)).slice(0, 900));
  const optsOf = async () => page.$$('button[type=button]');
  for (let q = 0; q < 10; q++) {
    const buttons = [];
    for (const b of await page.$$('button[type=button]')) { if (await b.evaluate(e => e.className.includes('border') && !!e.querySelector('span') && e.closest('main, div') && /^[A-D]?/.test(e.textContent) && e.getBoundingClientRect().width > 300)) buttons.push(b); }
    if (!buttons.length) { console.log('no options found at q', q); break; }
    const pick = buttons[q % buttons.length];
    await pick.evaluate(e => e.scrollIntoView({ block: 'center' })); await pick.click(); await sleep(700);
    if (q === 0) await shot(page, 'c-09-quicktest-answered');
    if (q === 5) await shot(page, 'c-10-quicktest-mid');
    if (q < 9) { await clickText(page, 'Next', 'button'); await sleep(600); }
  }
  await shot(page, 'c-11-quicktest-last');
  await clickText(page, 'Submit', 'button'); await sleep(2500);
  await shot(page, 'c-12-quicktest-confirm');
  console.log((await text(page)).slice(0, 500));
  const t = await text(page); if (/Submit anyway/.test(t)) { await clickText(page, 'Submit anyway', 'button'); }
  await sleep(10000);
  await shot(page, 'c-13-quicktest-done', true);
  console.log(page.url()); console.log((await text(page)).slice(0, 1200));
  console.log([...new Set(issues)].join('\n'));
  await browser.close();
})();
