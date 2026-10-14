import { chromium } from "playwright"
const [url, name] = process.argv.slice(2)
const b = await chromium.connectOverCDP("http://127.0.0.1:9222")
const ctx = await b.newContext({ viewport: { width: 1600, height: 900 }, storageState: process.env.STATE })
const page = await ctx.newPage()
await page.goto(url, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3500)
console.log(page.url()); console.log((await page.innerText("body")).replace(/\n{2,}/g, "\n").slice(0, 900))
console.log(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll("input,button")].map(e => `${e.tagName}:${e.type}:${e.name||e.id||e.placeholder||e.innerText}`))))
await page.screenshot({ path: `shots/${name}.png` }); await ctx.close(); await b.close()
