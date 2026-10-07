const { launch, visit, watch, issues, shot, sleep, text, byLabel, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/admin/dashboard', 'a-01-dashboard');
  await visit(page, '/admin/settings', 'a-02-settings-empty');
  await byLabel(page, 'Organization Name', 'Nexus Talent Labs');
  await byLabel(page, 'Description', 'Nexus Talent Labs is a product engineering company building hiring technology.');
  await byLabel(page, 'Contact Email', 'careers@nexustalent.example');
  await byLabel(page, 'Website', 'https://nexustalent.example');
  await shot(page, 'a-03-settings-filled');
  await clickText(page, 'Save Changes'); await sleep(2500);
  await shot(page, 'a-04-settings-saved');
  console.log((await text(page)).match(/(success|saved|updated|error|failed)[^\n]*/gi));
  console.log([...new Set(issues)].join('\n'));
  await browser.close();
})();
