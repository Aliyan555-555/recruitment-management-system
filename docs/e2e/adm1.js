const { launch, login, visit, watch, issues, shot, sleep, text } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await login(page, 'admin@example.com', 'Admin123!', '/admin/login', 'a-login');
  await visit(page, '/admin/jobs/create', 'a-create-empty', true);
  console.log(await page.evaluate(() => [...document.querySelectorAll('input,textarea,select,button[role=combobox]')].filter(e=>e.offsetParent).map(e => { const l = e.closest('div')?.parentElement?.querySelector('label')?.textContent?.trim() || e.closest('div')?.querySelector('label')?.textContent?.trim(); return `${e.tagName}/${e.type||e.getAttribute('role')} ph="${e.placeholder||''}" label="${l}" val="${(e.value||'').slice(0,20)}"`; }).join('\n')));
  await browser.close();
})();
