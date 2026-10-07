const { launch, visit, watch, issues, shot, sleep, text, byLabel, clickText } = require('./lib');
(async () => {
  const { browser, page } = await launch(); watch(page);
  await visit(page, '/admin/jobs/create', 'a-05-create-empty');
  console.log('org field:', await page.evaluate(() => document.querySelector('input[disabled], input[readonly]')?.value));
  await byLabel(page, 'Job Title', 'React Frontend Developer (QA Demo)');
  await byLabel(page, 'Job Summary', 'Build and maintain accessible React interfaces for our hiring platform.');
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  const dates = await page.$$('input[type=date]');
  for (const [el, v] of [[dates[0], d(0)], [dates[1], d(30)]]) { await el.evaluate((e, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(e, v); e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, v); }
  await byLabel(page, 'Required Experience', '2-4 years');
  await byLabel(page, 'Salary Range', '250000-350000');
  const selects = await page.$$('select');
  await selects[2].select('Engineering'); await selects[3].select("Bachelor's Degree");
  // description (rich text)
  const ed = await page.$('.tiptap, .ProseMirror, [contenteditable=true]');
  await ed.click(); await page.keyboard.type('We are looking for a React developer to join our product team. You will build UI components, work with REST APIs, and write tests.');
  // skills
  const sk = await page.$('input[placeholder*="JAVASCRIPT"]'); await sk.click(); await sk.type('REACT'); await clickText(page, 'Add', 'button'); await sleep(300);
  await sk.type('JAVASCRIPT'); await clickText(page, 'Add', 'button'); await sleep(300);
  await byLabel(page, 'Success Criteria', 'Ships production-quality UI and communicates clearly.');
  await byLabel(page, 'Benefits', 'Health insurance, remote-friendly, learning budget.');
  // location
  const sel2 = await page.$$('select'); await sel2[5].select('Lahore'); await clickText(page, 'Add Location'); await sleep(400);
  // quick test toggle
  const tog = await page.$('button[role=switch]'); if (tog) { await tog.evaluate(e => e.scrollIntoView({ block: 'center' })); await tog.click(); await sleep(500); }
  await shot(page, 'a-06-create-quicktest-on');
  // workflow: step 1 screening
  const s3 = await page.$$('select'); const typeSel = s3[s3.length - 2]; console.log('typeSel opts', await typeSel.evaluate(e => [...e.options].map(o => o.value)));
  await typeSel.select('SCREENING_INTERVIEW'); await sleep(300);
  const dur = await page.$('input[placeholder="e.g., 60"]'); await dur.type('45');
  const mode = (await page.$$('select')).at(-1); await mode.select('Remote'); await sleep(400); await (await page.$('input[placeholder^="https://meet"]')).type('https://meet.google.com/qa-demo-room');
  await clickText(page, 'Add Step'); await sleep(500);
  const s4 = await page.$$('select'); await s4[s4.length - 2].select('OFFER').catch(e => console.log('offer sel fail', e.message));
  await shot(page, 'a-07-create-filled', true);
  console.log((await text(page)).match(/[^\n]*(required|invalid|valid)[^\n]*/gi));
  await clickText(page, 'Create Job'); await sleep(6000);
  await shot(page, 'a-08-create-submitted');
  console.log('URL', page.url()); console.log((await text(page)).slice(0, 600));
  console.log([...new Set(issues)].join('\n'));
  await browser.close();
})();
