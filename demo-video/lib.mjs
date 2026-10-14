import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { synth } from "./tts.mjs"

export const BASE = "http://rms.localhost:3001"
export const W = 1600
export const H = 900
const ROOT = fileURLToPath(new URL("./", import.meta.url))
const OUT = path.join(ROOT, "out")
const STATE = path.join(ROOT, "state")
fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(STATE, { recursive: true })

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Runs inside every page: a visible mouse cursor, click ripples and a caption bar. */
const OVERLAY = () => {
  const boot = () => {
    if (document.getElementById("__cur")) return
    const st = document.createElement("style")
    st.textContent = `
      #__cur{position:fixed;left:0;top:0;width:28px;height:28px;z-index:2147483647;pointer-events:none;transition:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))}
      .__rip{position:fixed;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;border:3px solid #2563eb;z-index:2147483646;pointer-events:none;animation:__rip .6s ease-out forwards}
      @keyframes __rip{to{transform:scale(4.5);opacity:0}}
      #__cap{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);max-width:70%;z-index:2147483645;pointer-events:none;
        background:rgba(15,23,42,.88);color:#fff;font:500 21px/1.35 Inter,system-ui,Segoe UI,sans-serif;padding:12px 22px;border-radius:12px;text-align:center;
        box-shadow:0 6px 24px rgba(0,0,0,.35);display:none}
      #__tag{position:fixed;bottom:26px;right:24px;z-index:2147483645;pointer-events:none;background:#2563eb;color:#fff;font:600 14px Inter,system-ui,sans-serif;padding:6px 14px;border-radius:999px;display:none}`
    document.head.appendChild(st)
    const cur = document.createElement("div")
    cur.id = "__cur"
    cur.innerHTML = `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M3 2l7.5 19 2.6-7.9L21 10.5z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>`
    document.body.appendChild(cur)
    const cap = document.createElement("div")
    cap.id = "__cap"
    document.body.appendChild(cap)
    const tag = document.createElement("div")
    tag.id = "__tag"
    document.body.appendChild(tag)
    const pos = (x, y) => {
      cur.style.transform = `translate(${x - 4}px,${y - 2}px)`
      try { sessionStorage.setItem("__pos", JSON.stringify([x, y])) } catch {}
    }
    try { const p = JSON.parse(sessionStorage.getItem("__pos") || "null"); if (p) pos(p[0], p[1]); else pos(-50, -50) } catch { pos(-50, -50) }
    addEventListener("mousemove", (e) => pos(e.clientX, e.clientY), true)
    addEventListener("mousedown", (e) => {
      const r = document.createElement("div"); r.className = "__rip"; r.style.left = e.clientX + "px"; r.style.top = e.clientY + "px"
      document.body.appendChild(r); setTimeout(() => r.remove(), 700)
    }, true)
    const show = () => {
      try {
        const c = sessionStorage.getItem("__cap"); cap.textContent = c || ""; cap.style.display = c ? "block" : "none"
        const t = sessionStorage.getItem("__tag"); tag.textContent = t || ""; tag.style.display = t ? "block" : "none"
      } catch {}
    }
    show()
    window.__show = show
  }
  if (document.body) boot()
  else addEventListener("DOMContentLoaded", boot)
}

export async function launch() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222")
  return browser
}

/**
 * Runs one recorded segment.
 *  opts: { name, role, tag, storage (state file to load), save (state file to write), dry }
 *  fn(api) where api = { page, say, click, type, goto, wait, card, ... }
 * Returns { video, events } (events = narration clips placed on the segment's timeline).
 */
export async function segment(browser, opts, fn) {
  const { name, tag = "", storage, save, dry } = opts
  const ctxOpts = { viewport: { width: W, height: H }, deviceScaleFactor: 1 }
  if (storage && fs.existsSync(path.join(STATE, storage))) ctxOpts.storageState = path.join(STATE, storage)
  if (!dry) ctxOpts.recordVideo = { dir: path.join(OUT, "raw"), size: { width: W, height: H } }
  const ctx = await browser.newContext(ctxOpts)
  await ctx.addInitScript(OVERLAY)
  const page = await ctx.newPage()
  page.setDefaultTimeout(30000)
  page.on("dialog", (d) => d.accept().catch(() => {}))
  const t0 = Date.now()
  const events = []
  let mouse = { x: 800, y: 450 }

  const setCaption = async (text) => {
    await page.evaluate((t) => { try { sessionStorage.setItem("__cap", t || ""); window.__show && window.__show() } catch {} }, text).catch(() => {})
  }
  const setTag = async (t) => {
    await page.evaluate((x) => { try { sessionStorage.setItem("__tag", x || ""); window.__show && window.__show() } catch {} }, t).catch(() => {})
  }

  const api = {
    page,
    tag: async () => {},
    wait: (ms) => sleep(dry ? Math.min(ms, 150) : ms),
    /** Narrate `text` while `action` runs; the step lasts at least as long as the audio. */
    async say(text, action) {
      let seconds = 0
      if (!dry || process.env.PREGEN) {
        const s = await synth(text)
        if (!dry) {
          seconds = s.seconds
          events.push({ file: s.file, at: (Date.now() - t0) / 1000, text })
        }
      }
      await setCaption(text)
      const start = Date.now()
      if (action) await action()
      await setCaption(text)
      const left = seconds * 1000 + 450 - (Date.now() - start)
      if (left > 0) await sleep(left)
    },
    async goto(p, settle = 1200) {
      await page.goto(BASE + p, { waitUntil: "domcontentloaded", timeout: 90000 })
      await sleep(settle)
      await setCaption(await page.evaluate(() => sessionStorage.getItem("__cap")).catch(() => ""))
    },
    async move(x, y) {
      await page.mouse.move(x, y, { steps: dry ? 2 : 28 })
      mouse = { x, y }
    },
    /** Move the visible cursor to an element and click it. */
    async click(target, { force = false } = {}) {
      const loc = typeof target === "string" ? page.locator(target).first() : target.first()
      await loc.waitFor({ state: "visible" })
      await loc.scrollIntoViewIfNeeded()
      const b = await loc.boundingBox()
      await api.move(b.x + b.width / 2, b.y + b.height / 2)
      await sleep(dry ? 0 : 350)
      await loc.click({ force })
      await sleep(dry ? 0 : 500)
    },
    async hover(target) {
      const loc = typeof target === "string" ? page.locator(target).first() : target.first()
      await loc.waitFor({ state: "visible" })
      await loc.scrollIntoViewIfNeeded()
      const b = await loc.boundingBox()
      await api.move(b.x + b.width / 2, b.y + b.height / 2)
      await sleep(dry ? 0 : 400)
    },
    async type(target, text, { clear = true } = {}) {
      const loc = typeof target === "string" ? page.locator(target).first() : target.first()
      await api.click(loc)
      if (clear) await page.keyboard.press("Control+A")
      await page.keyboard.type(text, { delay: dry ? 0 : 55 })
      await sleep(dry ? 0 : 250)
    },
    async scroll(dy, ms = 900) {
      const steps = dry ? 1 : 12
      for (let i = 0; i < steps; i++) {
        await page.mouse.wheel(0, dy / steps)
        await sleep(dry ? 0 : ms / steps)
      }
    },
    /** Full-screen title card (rendered in the page so it is part of the recording). */
    async card(title, subtitle, voice) {
      await page.goto("about:blank")
      await page.setContent(`<html><body style="margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#0f172a,#1e3a8a 60%,#2563eb);color:#fff;font-family:Inter,system-ui,Segoe UI,sans-serif;text-align:center">
        <div style="font-size:22px;letter-spacing:.35em;text-transform:uppercase;opacity:.75;margin-bottom:22px">Recruitment Management System</div>
        <div style="font-size:68px;font-weight:700;max-width:1200px;line-height:1.1">${title}</div>
        <div style="font-size:28px;opacity:.85;margin-top:26px;max-width:1100px;line-height:1.35">${subtitle || ""}</div></body></html>`)
      await page.evaluate(() => { try { sessionStorage.removeItem("__cap") } catch {} })
      await api.say(voice || `${title}. ${subtitle || ""}`, async () => {})
    },
    /** Visible sign-in using the real login form. */
    async login(loginPath, email, password) {
      await api.goto(loginPath, 2500)
      await api.type("input[type=email]", email)
      await api.type("input[type=password]", password)
      await api.click("button[type=submit]")
      await page.waitForURL((u) => !/login/.test(u.pathname), { timeout: 60000 })
      await sleep(dry ? 200 : 2500)
    },
    ctx,
    events,
  }

  let error
  try {
    await fn(api)
  } catch (e) {
    error = e
    try { await page.screenshot({ path: path.join(OUT, `FAIL-${name}.png`) }) } catch {}
  }
  if (process.env.SHOT && !error) await page.screenshot({ path: process.env.SHOT })
  if (save) await ctx.storageState({ path: path.join(STATE, save) })
  const videoPath = !dry ? await page.video()?.path() : null
  await ctx.close()
  let video = null
  if (videoPath) {
    video = path.join(OUT, `${name}.webm`)
    fs.copyFileSync(videoPath, video)
  }
  if (error) throw error
  if (!dry) fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({ name, video, events }, null, 1))
  return { video, events }
}
