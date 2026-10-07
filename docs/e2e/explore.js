const { launch, shot, login, BASE, sleep } = require('./lib');
(async () => {
  const { browser, page } = await launch();
  await login(page, 'admin@example.com', 'Admin123!', '/admin/login', 'x-admin-login');
  console.log('URL', page.url());
  await shot(page, 'x-admin-dashboard');
  console.log(await page.evaluate(() => [...new Set([...document.querySelectorAll('a')].map(a => a.textContent.trim() + ' -> ' + a.getAttribute('href')))].join('\n')));
  await browser.close();
})();
