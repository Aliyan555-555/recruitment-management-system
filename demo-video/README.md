# Demo video generator

Records a scripted walkthrough (Admin, Interviewer, Candidate) of the app against the LOCAL e2e database
(`rms-e2e-pg` on port 55432), adds an English neural voice-over, and assembles one MP4.
Nothing touches the real database, and all email is caught locally (`mail-sink.mjs`).

Re-record:
1. Terminal A: `node demo-video/mail-sink.mjs`
2. Terminal B: `powershell -ExecutionPolicy Bypass -File demo-video/start-e2e.ps1` (needs a fresh `npm run build`)
3. Start Edge headless: `msedge --headless=new --remote-debugging-port=9222 --user-data-dir=%TEMP%\rms-demo-edge`
4. `cd demo-video; sh reset-db.sh; rm -rf state out; PREGEN=1 node run.mjs --dry` (rehearse + cache voice clips)
5. `sh reset-db.sh; rm -rf state out; node run.mjs` then `node build-video.mjs`

Output: `out/RMS-Demo.mp4`, transcript `out/narration.md`. The story lives in `story.mjs`.
`db/baseline.dump` is a snapshot of the seeded e2e database (create it with pg_dump before the first run).
