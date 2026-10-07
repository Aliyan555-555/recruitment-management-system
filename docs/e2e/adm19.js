const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/admin/jobs/5/rounds/9/results', 'tmp'); await sleep(2000);
  const cbs = await page.$$('input[type=checkbox]'); await cbs[cbs.length - 1].click(); await sleep(500);
  await shot(page, 'a-31-results-selected');
  await clickText(page, 'Move to Next Round'); await sleep(2000);
  await shot(page, 'a-32-move-confirm');
  const t = await text(page); console.log(t.match(/[^\n]*(confirm|move|success|error)[^\n]*/gi));
  const btns = await page.evaluate(()=>[...document.querySelectorAll('button')].map(b=>b.textContent.trim()));
  console.log(btns);
  const c = btns.find(b => /^(Confirm|Move|Yes|Continue)/i.test(b) && !/Move to Next Round/.test(b)); if (c) { await clickText(page, c, 'button'); await sleep(6000); }
  await visit(page, '/admin/jobs/5/rounds/10/applied', 'a-33-offer-round-needs-review', true); await sleep(2000);
  console.log((await text(page)).slice(300, 1500));
  console.log(await page.evaluate(()=>[...document.querySelectorAll('button,a')].map(a=>a.textContent.trim()+(a.getAttribute('href')?'->'+a.getAttribute('href'):'')).filter(Boolean).slice(12).join(' | ')));
  await browser.close();
})();
