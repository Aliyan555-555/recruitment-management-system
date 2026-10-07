const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/admin/jobs/5/ai-shortlist', 'a-13-ai-shortlist-empty');
  await clickText(page, 'Run First AI Shortlisting'); await sleep(3000);
  await shot(page, 'a-14-ai-shortlist-running');
  console.log((await text(page)).slice(0, 600));
  await page.waitForFunction(() => !/Running|Analyzing|Shortlisting\.\.\./i.test(document.body.innerText), { timeout: 120000 }).catch(()=>console.log('still running'));
  await sleep(4000);
  await shot(page, 'a-15-ai-shortlist-results', true);
  console.log((await text(page)).slice(0, 3500));
  console.log(await page.evaluate(()=>[...document.querySelectorAll('button,a')].map(a=>a.textContent.trim()).filter(Boolean).join(' | ')));
  console.log([...new Set(issues)].join('\n'));
  await browser.close();
})();
