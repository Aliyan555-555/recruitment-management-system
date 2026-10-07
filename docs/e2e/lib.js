const puppeteer = require('puppeteer-core');
const path = require('path');
const BASE = 'http://localhost:3100';
const SHOTS = path.join(__dirname, 'shots');
async function launch() {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', userDataDir: path.join(__dirname, '.profile-' + (process.env.PROFILE || 'default')), defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  page.setDefaultTimeout(120000);
  return { browser, page };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function shot(page, name, full = false) { await sleep(900); await page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: full }); console.log('shot', name, page.url()); }
async function login(page, email, password, loginPath='/login', tag='login-page') {
  await page.goto(BASE + loginPath, { waitUntil: 'networkidle2' });
  await shot(page, tag);
  await sleep(2500);
  const em = await page.$('input[type=email], input[name=email], input#email');
  await em.click({ clickCount: 3 }); await em.type(email, { delay: 20 });
  const pw = await page.$('input[type=password]'); await pw.click(); await pw.type(password, { delay: 20 });
  await shot(page, tag + '-filled');
  await page.click('button[type=submit]');
  await page.waitForFunction(() => !location.pathname.includes('login'), { timeout: 60000 }).catch(()=>console.log('still on login'));
  await sleep(4000);
}
const issues = [];
function watch(page, label) {
  page.on('console', m => { if (m.type() === 'error') issues.push(`[console] ${page.url()} :: ${m.text().slice(0,200)}`); });
  page.on('response', r => { if (r.status() >= 400 && !r.url().includes('_next/static')) issues.push(`[http ${r.status()}] ${r.request().method()} ${r.url().replace(BASE,'')}`); });
  page.on('pageerror', e => issues.push(`[pageerror] ${page.url()} :: ${String(e).slice(0,200)}`));
}
async function visit(page, url, name, full = false) {
  const t = Date.now();
  await page.goto(BASE + url, { waitUntil: 'domcontentloaded' });
  await page.waitForNetworkIdle({ idleTime: 800, timeout: 90000 }).catch(()=>{});
  await page.waitForFunction(() => !document.querySelector('.animate-spin, [class*=animate-spin]') && document.body.innerText.trim().length > 40, { timeout: 90000 }).catch(()=>{});
  if (await page.evaluate(() => /ChunkLoadError|Application error|This page could not be found/.test(document.body.innerText))) { console.log('  retry reload', url); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForNetworkIdle({ idleTime: 1500, timeout: 90000 }).catch(()=>{}); await sleep(2000); }
  const ms = Date.now() - t;
  await shot(page, name, full);
  console.log(`  load ${url} ${ms}ms`);
  return ms;
}
async function text(page) { return page.evaluate(() => document.body.innerText); }
async function clickText(page, txt, sel='button, a') {
  const els = await page.$$(sel);
  for (const e of els) { const t = await e.evaluate(n => n.textContent.trim()); if (t.toLowerCase().includes(txt.toLowerCase())) { await e.evaluate(n => n.scrollIntoView({block:'center'})); await e.click(); return t; } }
  throw new Error('no element with text: ' + txt);
}
module.exports = { text, clickText, watch, visit, issues, launch, sleep, shot, login, BASE };
// find input/textarea/select by its label text (substring) and type a value
async function byLabel(page, label, value, { select = false, nth = 0 } = {}) {
  const h = await page.evaluateHandle((label, nth) => {
    const ls = [...document.querySelectorAll('label')].filter(l => l.textContent.trim().toLowerCase().startsWith(label.toLowerCase()));
    const l = ls[nth]; if (!l) return null;
    let c = l.parentElement;
    for (let i = 0; i < 3 && c; i++, c = c.parentElement) { const el = c.querySelector('input:not([type=checkbox]), textarea, select'); if (el) return el; }
    return null;
  }, label, nth);
  const el = h.asElement(); if (!el) throw new Error('label not found: ' + label);
  await el.evaluate(e => e.scrollIntoView({ block: 'center' }));
  if (select) await el.select(value);
  else { await el.click({ clickCount: 3 }); await page.keyboard.press('Backspace'); await el.type(value, { delay: 5 }); }
  return el;
}
module.exports.byLabel = byLabel;
