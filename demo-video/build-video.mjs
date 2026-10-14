// Assembles out/*.webm + narration clips into one MP4 (1080p, AAC voice-over) and writes a transcript.
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import ffmpeg from "ffmpeg-static"
import { segments } from "./story.mjs"
import { duration } from "./tts.mjs"

const ROOT = fileURLToPath(new URL("./", import.meta.url))
const OUT = path.join(ROOT, "out")
const AV_OFFSET = Number(process.env.AV_OFFSET ?? 0) // seconds; positive delays the voice

const run = (args) => {
  const r = spawnSync(ffmpeg, args, { encoding: "utf8", maxBuffer: 1 << 28 })
  if (r.status !== 0) throw new Error("ffmpeg failed:\n" + r.stderr.slice(-2500))
}

const parts = []
const transcript = ["# Recruitment Management System: demo narration", ""]
for (const s of segments) {
  const meta = path.join(OUT, `${s.name}.json`)
  if (!fs.existsSync(meta)) { console.log("skip (not recorded):", s.name); continue }
  const { video, events } = JSON.parse(fs.readFileSync(meta, "utf8"))
  const mp4 = path.join(OUT, `${s.name}.mp4`)
  const inputs = ["-i", video]
  const filters = []
  events.forEach((e, i) => {
    inputs.push("-i", e.file)
    const ms = Math.max(0, Math.round((e.at + AV_OFFSET) * 1000))
    filters.push(`[${i + 1}:a]adelay=${ms}|${ms}[a${i}]`)
  })
  const labels = events.map((_, i) => `[a${i}]`).join("")
  const graph = filters.join(";") + `;${labels}amix=inputs=${events.length}:normalize=0:dropout_transition=0,apad[am]`
  const vdur = duration(video)
  run(["-y", ...inputs, "-filter_complex", graph, "-map", "0:v", "-map", "[am]", "-t", String(vdur || 600),
    "-vf", "scale=1920:1080:flags=lanczos,fps=30", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-ac", "2", mp4])
  parts.push(mp4)
  console.log(`✔ ${s.name}  ${vdur.toFixed(1)}s`)
  transcript.push(`## ${s.name}`, "", ...events.map((e) => `- ${e.text}`), "")
}
const list = path.join(OUT, "concat.txt")
fs.writeFileSync(list, parts.map((p) => `file '${p.split(path.sep).join("/")}'`).join("\n"))
const final = path.join(OUT, "RMS-Demo.mp4")
run(["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", final])
fs.writeFileSync(path.join(OUT, "narration.md"), transcript.join("\n"))
console.log(`\nDone: ${final}  (${(duration(final) / 60).toFixed(1)} min)`)
