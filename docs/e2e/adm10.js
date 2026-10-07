const { launch, visit, watch, issues, shot, sleep, text, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/admin/jobs/5/rounds/9/applied', 'a-18-next-round');
  await clickText(page, 'Shortlist', 'tbody button'); await sleep(9000);
  await shot(page, 'a-19-round-shortlisted');
  console.log((await text(page)).match(/[^\n]*(Shortlisted|In Round|success|error)[^\n]*/gi));
  await clickText(page, 'Continue to In Round'); await sleep(5000);
  await shot(page, 'a-20-round-inround', true);
  console.log(page.url()); console.log((await text(page)).slice(400, 1800));
  console.log(await page.evaluate(()=>[...document.querySelectorAll('button,a')].map(a=>a.textContent.trim()+(a.getAttribute('href')?'->'+a.getAttribute('href'):'')).filter(Boolean).join(' | ')));
  console.log([...new Set(issues)].join('\n'));
  await browser.close();
})();
