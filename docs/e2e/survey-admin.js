const { launch, login, visit, watch, issues } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await login(page, 'admin@example.com', 'Admin123!', '/admin/login', 's-login');
  const pages = [['/admin/dashboard','s-dashboard'],['/admin/jobs','s-jobs'],['/admin/jobs/1','s-job1'],['/admin/jobs/create','s-create'],['/admin/jobs/1/edit','s-edit'],
   ['/admin/jobs/1/quick-test','s-quicktest'],['/admin/jobs/1/ai-shortlist','s-aishort'],['/admin/jobs/1/shortlist','s-shortlist'],
   ['/admin/jobs/1/rounds/1/applied','s-applied'],['/admin/jobs/1/rounds/1/slots','s-slots'],['/admin/jobs/1/rounds/1/shortlisted','s-shortlisted'],['/admin/jobs/1/rounds/1/results','s-results'],['/admin/jobs/1/rounds/2/offers','s-offers'],
   ['/admin/candidates','s-cands'],['/admin/candidates/2','s-cand2'],['/admin/assessments','s-assess'],['/admin/users','s-users'],['/admin/workflows','s-workflows'],['/admin/settings','s-settings']];
  for (const [u,n] of pages) await visit(page, u, n);
  console.log('ISSUES\n' + [...new Set(issues)].join('\n'));
  await browser.close();
})();
