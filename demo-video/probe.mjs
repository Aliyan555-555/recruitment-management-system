import { chromium } from "playwright"
// node probe.mjs <role> <email> <pw> <name> <path> [clickText]
const [role, email, pw, name, path, clickText] = process.argv.slice(2)
const BASE = "http://rms.localhost:3001"
const b = await chromium.connectOverCDP("http://127.0.0.1:9222")
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
const login = role === "admin" ? "/admin/login" : role === "interviewer" ? "/interviewer/login" : "/login"
await page.goto(BASE + login, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2500)
await page.fill("input[type=email]", email); await page.fill("input[type=password]", pw)
await page.locator("button[type=submit]").first().click()
await page.waitForURL((u) => !/login/.test(u.pathname), { timeout: 90000 }).catch(() => {})
await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 120000 }); await page.waitForTimeout(4000)
if (clickText) { await page.getByText(clickText, { exact: false }).first().click(); await page.waitForTimeout(2500) }
console.log(page.url())
console.log((await page.innerText("body")).replace(/\n{2,}/g, "\n").slice(0, 2500))
await page.screenshot({ path: `shots/${name}.png` })
await ctx.close(); await b.close()
