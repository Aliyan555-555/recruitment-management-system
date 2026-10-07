const { launch, login, visit, watch, issues, shot, sleep } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await login(page, 'qa.tester.e2e@example.com', 'Candidate123!', '/login', 'c-login');
  console.log('after login', page.url());
  await shot(page, 'c-after-login');
  await visit(page, '/jobs', 'c-jobs');
  await visit(page, '/jobs/1', 'c-job1');
  await visit(page, '/candidate/profile', 'c-profile');
  await visit(page, '/candidate/profile/edit', 'c-profile-edit');
  console.log(await page.evaluate(()=>document.body.innerText.slice(0,800)));
  console.log([...new Set(issues)].filter(i=>!i.includes('Extra attributes')).join('\n'));
  await browser.close();
})();
