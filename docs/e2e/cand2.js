const { launch, login, visit, watch, issues, shot, sleep, text } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await login(page, 'qa.tester.e2e@example.com', 'Candidate123!', '/login', 'c-login');
  await sleep(3000);
  console.log('after login', page.url());
  await visit(page, '/candidate/profile/edit', 'c-profile-edit');
  console.log(await text(page));
  console.log(await page.evaluate(()=>[...document.querySelectorAll('a,button')].map(a=>a.textContent.trim()+' -> '+(a.getAttribute('href')||'')).join('\n')));
  await browser.close();
})();
