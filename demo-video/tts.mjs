import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts"
import fs from "node:fs"
import crypto from "node:crypto"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"
import ffmpegPath from "ffmpeg-static"

export const VOICE = "en-US-AriaNeural"
const DIR = fileURLToPath(new URL("./audio/", import.meta.url))

/** Synthesises `text` (cached by content) and returns { file, seconds }. */
export async function synth(text) {
  const key = crypto.createHash("md5").update(VOICE + text).digest("hex").slice(0, 12)
  const file = path.join(DIR, `${key}.mp3`)
  if (!fs.existsSync(file)) {
    fs.mkdirSync(DIR, { recursive: true })
    let lastErr
    for (let attempt = 1; attempt <= 8; attempt++) {
      try {
        const tts = new MsEdgeTTS()
        await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3)
        const out = await tts.toFile(DIR, text)
        fs.renameSync(typeof out === "string" ? out : out.audioFilePath, file)
        lastErr = null
        break
      } catch (e) {
        lastErr = e
        await new Promise((r) => setTimeout(r, 1500 * attempt))
      }
    }
    if (lastErr) throw lastErr
  }
  return { file, seconds: duration(file) }
}

export function duration(file) {
  const r = spawnSync(ffmpegPath, ["-i", file], { encoding: "utf8" })
  const m = /Duration: (\d+):(\d+):(\d+\.\d+)/.exec(r.stderr || "")
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0
}
