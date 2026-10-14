process.on("unhandledRejection", (e) => { if (e?.name !== "TargetClosedError") console.log("unhandled:", e) })
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import { launch, segment } from "./lib.mjs"
import { segments } from "./story.mjs"

/** Runs a .sql file against the local e2e database (used for the "time passes" steps). */
const sqlFile = (f) => {
  const r = spawnSync("docker", ["exec", "-i", "rms-e2e-pg", "psql", "-U", "e2e", "-d", "rms_e2e"], { input: fs.readFileSync(new URL(f, import.meta.url)), encoding: "utf8" })
  if (r.status !== 0) throw new Error("sql failed: " + r.stderr)
}

const args = process.argv.slice(2)
const dry = args.includes("--dry")
const only = (args.find((a) => a.startsWith("--only=")) || "").slice(7)
const browser = await launch()
for (const s of segments) {
  if (only && !s.name.startsWith(only)) continue
  console.log(`\n▶ ${s.name}${dry ? " (dry)" : ""}`)
  const t = Date.now()
  try {
    if (s.before) sqlFile(s.before)
    await segment(browser, { name: s.name, tag: s.tag, storage: s.storage, save: s.save, dry }, s.run)
    console.log(`✔ ${s.name} in ${((Date.now() - t) / 1000).toFixed(1)}s`)
  } catch (e) {
    console.log(`✘ ${s.name}: ${e.message.split("\n")[0]}`)
    process.exitCode = 1
    break
  }
}
await browser.close()
