const { launch, shot, sleep, BASE, watch, issues } = require('./lib');
const STOP = +process.env.STOP || 5;
const EMAIL = 'qa.tester.e2e@example.com';
const PH = { 'e.g., ikram ullah':'Zara','e.g., khan':'Qureshi','e.g., shujat ullah khan':'Imran Qureshi','you@example.com':EMAIL,'e.g., ikram.khan92':'zara_qa_e2e',
  '#####-#######-#':'35202-1234567-1','70000':'54000','e.g., computer science':'Computer Science','e.g., senior software engineer':'Software Engineer','e.g., abc technologies':'Acme Technologies','e.g. react, python':'REACT',
  'house #, street, area, city':'House 12, Street 4, Gulberg, Lahore' };
async function fillText(page) {
  return page.evaluate((PH) => {
    const out = []; let phoneN = 0;
    document.querySelectorAll('input:not([type=checkbox]):not([type=password]):not([type=hidden]), textarea').forEach(el => {
      if (el.value || el.disabled || el.offsetParent === null) return;
      const ph = (el.placeholder||'').toLowerCase(); let v = PH[ph] || null;
      if (ph.startsWith('03xx')) v = phoneN++ === 0 ? '0300-1234567' : '0311-7654321';
      const lab0=(el.closest('div')?.querySelector('label')?.textContent||'').toLowerCase().replace(/\s*\*$/,'').trim();
      const LAB={'title of degree':'BS Computer Science','name of institution':'FAST NUCES','grade / cgpa':'3.5','job title':'Software Engineer','company':'Acme Technologies','company name':'Acme Technologies','organization':'Acme Technologies','position':'Software Engineer','skill':'REACT','skill name':'REACT','description':'Built web apps with React and Node.js','responsibilities':'Built web apps with React and Node.js','expected salary':'150000','current salary':'100000'};
      if (!v && LAB[lab0]) v = LAB[lab0];
      if (el.type === 'date') { const lab=(el.closest('div')?.querySelector('label')?.textContent||'').toLowerCase(); v = lab.includes('birth') ? '1996-05-14' : lab.trim()==='to' ? '2022-06-30' : '2019-07-01'; }
      if (v) { const proto = el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(el, v); el.dispatchEvent(new Event('input',{bubbles:true})); out.push(ph||el.type); }
    });
    return out;
  }, PH);
}
async function pickSelects(page) {
  const boxes = await page.$$('button[role=combobox]');
  for (const b of boxes) {
    const txt = await b.evaluate(e => e.textContent.trim() + '|' + (e.getAttribute('data-placeholder')!==null));
    if (!txt.endsWith('true')) continue; // already has value
    await b.evaluate(e => e.scrollIntoView({block:'center'})); await b.click(); await sleep(400);
    const opt = await page.$('[role=option]'); if (opt) { await opt.click(); } else await page.keyboard.press('Escape');
    await sleep(300);
  }
}
(async () => {
  const { browser, page } = await launch(); watch(page);
  await page.goto(BASE + '/register', { waitUntil: 'domcontentloaded' });
  await page.waitForNetworkIdle({ idleTime: 1500, timeout: 90000 }).catch(()=>{});
  await sleep(2500);
  for (let step = 1; step <= STOP; step++) {
    await shot(page, `reg-step${step}-empty`, true);
    console.log('filled:', await fillText(page));
    await pickSelects(page);
    console.log('filled2:', await fillText(page));
    if (step === 5) {
      const pws = await page.$$('input[type=password]'); for (const p of pws) await p.type('Candidate123!', { delay: 10 });
      for (const c of await page.$$('input[type=checkbox]')) await c.click().catch(()=>{});
    }
    await shot(page, `reg-step${step}-filled`, true);
    const btns = await page.$$('button'); let next = null;
    for (const b of btns) { const t = await b.evaluate(e=>e.textContent.trim()); if (/^(Next|Continue|Submit|Create Account|Register|Complete)/i.test(t)) next = b; }
    console.log('click', next && await next.evaluate(e=>e.textContent.trim()));
    if (!next) break;
    await next.click(); await sleep(step===5?8000:2000);
    const err = await page.evaluate(() => [...document.querySelectorAll('.text-destructive, [role=alert]')].map(e=>e.textContent.trim()).filter(Boolean).join(' | '));
    if (err) console.log('ERR step', step, err);
  }
  await shot(page, 'reg-final', true);
  console.log('URL', page.url());
  console.log([...new Set(issues)].filter(i=>!i.includes('Extra attributes')).join('\n'));
  await browser.close();
})();
