// The demo story. Each segment is one continuous recorded take for one role.
import fs from "node:fs"
import { fileURLToPath } from "node:url"

export const ADMIN = { email: "admin@example.com", password: "Admin123!" }
export const INTERVIEWER = { first: "Sarah", last: "Mitchell", email: "sarah.mitchell@example.com", password: "Interviewer123!" }
export const CAND_PASSWORD = "Candidate123!"
export const JOB = "7" // Frontend Engineer (React & Design Systems)
export const ROUND = "16" // Screening Interview
export const OFFER_ROUND = "17"

const BASE_URL = "http://rms.localhost:3001"
const MAILS = fileURLToPath(new URL("./mails.json", import.meta.url))
export const lastMailLink = (to, pattern) => {
  const list = JSON.parse(fs.readFileSync(MAILS, "utf8")).filter((m) => (m.to || "").includes(to))
  for (const m of list.reverse()) for (const l of m.links || []) if (pattern.test(l)) return l
  return null
}

/** Centre of the visible element whose own text is exactly `label`. */
async function centerOf(page, label) {
  let r = null
  for (let i = 0; i < 40 && !r; i++) {
    if (i) await new Promise((x) => setTimeout(x, 150))
    r = await page.evaluate((t) => {
    const els = [...document.querySelectorAll("div,p,span,td,th")].filter((e) => e.children.length === 0 && e.textContent.trim().toLowerCase() === t.toLowerCase())
    for (const e of els) { const b = e.getBoundingClientRect(); if (b.width > 0 && b.height > 0) return { x: b.x + b.width / 2, y: b.y + b.height / 2 } }
    return null
    }, label)
  }
  if (!r) throw new Error("not visible: " + label)
  return r
}
/** Selects a [PLACEHOLDER] inside the Word-style editor, moves the cursor there and types the real value. */
async function fillPlaceholder(a, token, value) {
  const at = await a.page.evaluate((tok) => {
    const root = document.querySelector(".ProseMirror")
    if (!root) return null
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let n
    while ((n = walker.nextNode())) {
      const i = n.data.indexOf(tok)
      if (i < 0) continue
      n.parentElement.scrollIntoView({ block: "center" })
      root.focus()
      const r = document.createRange()
      r.setStart(n, i)
      r.setEnd(n, i + tok.length)
      const sel = getSelection()
      sel.removeAllRanges()
      sel.addRange(r)
      const b = r.getBoundingClientRect()
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
    }
    return null
  }, token)
  if (!at) throw new Error("placeholder not found: " + token)
  await a.move(at.x, at.y)
  await a.wait(250)
  await a.page.keyboard.type(value, { delay: 22 })
  await a.wait(150)
}

const colX = async (page, day) => (await centerOf(page, day)).x
const hourY = async (page, label) => (await centerOf(page, label)).y

export const segments = [
  {
    name: "01-admin-intro",
    role: "admin",
    tag: "ADMIN",
    save: "admin.json",
    async run(a) {
      await a.card("Hiring, from first application to signed offer", "A walkthrough of the Admin, Interviewer and Candidate experience",
        "Welcome. This demo follows one hire from start to finish, and shows the Admin, the Interviewer and the Candidate experience.")
      await a.card("Part 1 · The Admin", "Sign in, set up the team, review applicants", "Let's begin as the admin, the person who runs the hiring process.")
      await a.say("The admin signs in with an email and password on the admin portal.", () => a.login("/admin/login", ADMIN.email, ADMIN.password))
      await a.tag("ADMIN")
      await a.say("This is the dashboard. At the top, a To do today list shows everything that needs attention, most urgent first.", async () => {
        await a.hover("text=To do today")
        await a.wait(1500)
      })
      await a.say("Below it you can see totals for jobs, active candidates, interviews and the hiring rate, plus recent activity.", async () => {
        await a.scroll(500, 1500)
      })
      await a.say("The menu on the left gives access to jobs, candidates, skill assessments, the calendar, interviewers, the team and settings.", async () => {
        await a.scroll(-500, 800)
        await a.hover("a[href='/admin/jobs']")
        await a.hover("a[href='/admin/candidates']")
        await a.hover("a[href='/admin/assessments']")
        await a.hover("a[href='/admin/calendar']")
      })
      await a.say("Before interviews can happen, we need interviewers. Let's open the Interviewers page.", async () => {
        await a.click("a[href='/admin/interviewers']")
        await a.wait(1500)
      })
      await a.say("Adding an interviewer takes a few seconds. Click Add interviewer.", async () => {
        await a.click("button:has-text('Add interviewer')")
      })
      await a.say("Enter their name, email, and department. They will set their own password, so the admin never handles a password.", async () => {
        await a.type(a.page.getByLabel("First name"), INTERVIEWER.first)
        await a.type(a.page.getByLabel("Last name"), INTERVIEWER.last)
        await a.type(a.page.getByLabel("Email"), INTERVIEWER.email)
        await a.type(a.page.getByLabel("Department"), "Engineering")
      })
      await a.say("Click Add and send invite. An email goes to the interviewer with a secure link to choose a password.", async () => {
        await a.click("button:has-text(\"Add and send invite\")")
        await a.page.getByText(INTERVIEWER.first + " " + INTERVIEWER.last).first().waitFor()
        await a.wait(1500)
      })
      await a.say("Sarah now appears in the interviewers list. Next, we will switch to Sarah’s point of view, to see how she accepts the invitation and sets her availability.", async () => {
        await a.wait(1200)
      })
    },
  },
  {
    name: "02-interviewer-onboarding",
    role: "interviewer",
    tag: "INTERVIEWER",
    save: "interviewer.json",
    async run(a) {
      await a.card("Part 2 · The Interviewer", "Accept the invitation, set a password, share availability", "Now we switch roles. This is Sarah, the interviewer who was just invited.")
      const link = lastMailLink(INTERVIEWER.email, /reset-password/)
      if (!link) throw new Error("no invite link captured")
      await a.say("Sarah opens the email invitation and clicks the secure link. It brings her to a page where she chooses her own password.", async () => {
        await a.goto(link.replace(BASE_URL, ""), 2000)
      })
      await a.say("She types a new password and confirms it.", async () => {
        await a.type("input[placeholder=\"Min 8 characters\"]", INTERVIEWER.password)
        await a.type("input[placeholder=\"Confirm new password\"]", INTERVIEWER.password)
      })
      await a.say("Then she clicks Reset Password.", async () => {
        await a.click("button[type=submit]")
        await a.wait(2500)
      })
      await a.tag("INTERVIEWER")
      await a.say("Now she signs in on the interviewer login page, with her email and the new password.", () =>
        a.login("/interviewer/login", INTERVIEWER.email, INTERVIEWER.password))
      await a.say("This is the interviewer dashboard. It shows interviews happening today, upcoming interviews, and scorecards still waiting to be filled in.", async () => {
        await a.hover("text=Scorecards pending")
        await a.hover("text=Upcoming")
      })
      await a.say("There is nothing booked yet, and the page explains why. Sarah needs to share her availability so the admin can open interview slots.", async () => {
        await a.hover("text=Update availability")
      })
      await a.say("She opens the Availability page.", async () => {
        await a.click("a[href=\"/interviewer/availability\"]")
        await a.wait(1800)
      })
      await a.say("Availability is a simple calendar. She switches to the weekly default, which repeats every week.", async () => {
        await a.click("button:has-text(\"Weekly default\")")
        await a.wait(800)
      })
      await a.say("To add hours, she just drags on a day. She is free from ten in the morning until one in the afternoon, Monday to Friday.", async () => {
        for (const day of ["MON", "TUE", "WED", "THU", "FRI"]) {
          const x = await colX(a.page, day)
          const y1 = await hourY(a.page, "10 AM")
          const y2 = await hourY(a.page, "1 PM")
          await a.move(x, y1 + 2)
          await a.page.mouse.down()
          await a.move(x, y2 + 2)
          await a.page.mouse.up()
          await a.wait(500)
        }
      })
      await a.say("The blocks show on the calendar. She clicks Save availability.", async () => {
        await a.click("button:has-text(\"Save availability\")")
        await a.wait(1800)
      })
      await a.say("Availability saved. The admin can now turn these hours into bookable interview slots. Back to the admin.", async () => {
        await a.wait(1500)
      })
    },
  },
  {
    name: "03-admin-applicants-and-round",
    role: "admin",
    storage: "admin.json",
    save: "admin.json",
    async run(a) {
      await a.card("Part 3 · Back to the Admin", "Review applicants, shortlist, set up the interview round", "Back with the admin. Sarah is ready, so now we can review applicants and set up the interview round.")
      await a.goto("/admin/dashboard", 1500)
      await a.say("Everything starts from a job. Open the Jobs page to see every opening, with the number of people waiting for review in each round.", async () => {
        await a.click("a[href=\"/admin/jobs\"]")
        await a.wait(2000)
        await a.hover("a[href=\"/admin/jobs/7/applicants\"]")
      })
      await a.say("We will use the Frontend Engineer job. Click it to open the job details.", async () => {
        await a.click("a[href=\"/admin/jobs/7\"]")
        await a.wait(2000)
      })
      await a.say("Each job has its own hiring workflow. This one has two steps: a screening interview, and then an offer. Every candidate moves through these steps in order.", async () => {
        await a.hover("a[href=\"/admin/jobs/7/rounds/16\"]")
        await a.hover("a[href=\"/admin/jobs/7/rounds/17\"]")
      })
      await a.say("To start, we review the applicants. Click Review Applicants.", async () => {
        await a.click("a[href=\"/admin/jobs/7/applicants\"]")
        await a.wait(3500)
      })
      await a.say("Here are all four applicants. On the left is the list, and on the right is the selected candidate’s profile, with a check against the hiring criteria.", async () => {
        await a.hover("text=Hiring criteria")
        await a.wait(1200)
      })
      await a.say("The admin can run AI screening to rank candidates, or review them manually. For each person there are three choices: reject, maybe, or shortlist.", async () => {
        await a.hover("text=AI screening")
        await a.hover(a.page.getByRole("button", { name: /^Reject/ }))
        await a.hover(a.page.getByRole("button", { name: /^Maybe/ }))
      })
      const shortlist = () => a.page.locator("button").filter({ hasText: /^\s*Shortlist\s*S?\s*$/ })
      await a.say("Alex has six years of experience and strong React skills. Click Shortlist.", async () => {
        await a.click(a.page.getByText("Alex Mercer").first())
        await a.wait(900)
        await a.click(shortlist())
        await a.wait(1500)
      })
      await a.say("Elena is also a strong match, so she is shortlisted too.", async () => {
        await a.click(a.page.getByText("Elena Rostova").first())
        await a.wait(900)
        await a.click(shortlist())
        await a.wait(1500)
      })
      await a.say("Jessica is promising but more junior. Maybe keeps her on file without moving her forward yet.", async () => {
        await a.click(a.page.getByText("Jessica Taylor").first())
        await a.wait(900)
        await a.click(a.page.locator("button").filter({ hasText: /^\s*Maybe\s*M?\s*$/ }))
        await a.wait(1500)
      })
      await a.say("Shortlisted candidates are admitted to the screening interview round automatically, and they are emailed to book a time.", async () => {
        await a.click(a.page.locator("[role=tab], button").filter({ hasText: /^Shortlisted/ }))
        await a.wait(1800)
      })
      await a.say("Now let's open the screening interview round.", async () => {
        await a.click("a[href=\"/admin/jobs/7/rounds/16\"]")
        await a.wait(3000)
      })
      await a.say("This is the round’s candidate list. Alex and Elena are here, waiting to book an interview. A banner reminds us that an interviewer must be chosen first.", async () => {
        await a.hover(a.page.getByText("Select the interviewers for this round"))
        await a.wait(800)
      })
      await a.say("Click Select interviewers.", async () => {
        await a.click(a.page.getByText("Select interviewers").first())
        await a.wait(2500)
      })
      await a.say("The Schedule tab lists everyone who can interview. Tick Sarah, and click Save interviewers.", async () => {
        await a.click(a.page.getByText("Sarah Mitchell").first())
        await a.click(a.page.getByRole("button", { name: "Save interviewers" }))
        await a.wait(2000)
      })
      await a.say("A setup checklist tracks what is left. Sarah is assigned, and has shared her availability. The round still needs its mode, remote or onsite.", async () => {
        await a.hover(a.page.getByText("Every interviewer has shared their availability"))
        await a.wait(1000)
      })
      await a.say("Click Edit round settings.", async () => {
        await a.click(a.page.getByText("Edit round settings").first())
        await a.wait(3000)
      })
      await a.say("In the hiring rounds section, choose Remote, and paste the meeting link candidates will use.", async () => {
        await a.click(a.page.getByRole("button", { name: "Remote" }).first())
        await a.type("#link-0", "https://meet.google.com/abc-defg-hij")
      })
      await a.say("An instruction for the candidate can be added too. It is shown when they book.", async () => {
        await a.type("#ci-0", "Please join five minutes early with a working camera and microphone.")
      })
      await a.say("Click Update Job to save.", async () => {
        const saved = a.page.waitForResponse((r) => /\/api\/admin\/jobs\/7$/.test(r.url()) && r.request().method() !== "GET")
        await a.click(a.page.getByRole("button", { name: "Update Job" }))
        const res = await saved
        if (!res.ok()) throw new Error("job update failed: " + res.status() + " " + (await res.text()).slice(0, 300))
        await a.wait(3000)
      })
      await a.goto("/admin/jobs/7/rounds/16/schedule", 3500)
      await a.say("Back on the Schedule tab, the last item is to open interview slots.", async () => {
        await a.hover(a.page.getByText("No open interview slots yet"))
      })
      await a.say("Slots are built from Sarah’s availability. Click Open slots to see them on the calendar.", async () => {
        await a.click(a.page.getByRole("button", { name: "Open slots" }).first())
        await a.wait(2500)
      })
      await a.say("Green dashed slots are available to publish. Publish All makes every one of them bookable by candidates, in one click.", async () => {
        const published = a.page.waitForResponse((r) => /\/api\/admin\/steps\/16\/slots/.test(r.url()) && r.request().method() === "POST").catch(() => null)
        await a.click(a.page.getByRole("button", { name: /Publish All/ }))
        await published
        await a.wait(3000)
      })
      await a.say("The slots turn blue, which means they are open for booking. Candidates can now pick their own time. Let's see how that looks for a candidate.", async () => {
        await a.wait(2000)
      })
    },
  },
  {
    name: "04-candidate-booking",
    role: "candidate",
    save: "cand-alex.json",
    async run(a) {
      await a.card("Part 4 · The Candidate", "Sign in, see your status, book an interview", "Now we switch to the candidate. This is Alex, one of the shortlisted applicants.")
      await a.say("Alex signs in on the candidate login page.", () => a.login("/login", "alex.mercer@example.com", CAND_PASSWORD))
      await a.say("The candidate home page greets Alex and shows what needs attention. Right at the top, a banner says it is time to book the screening interview.", async () => {
        await a.hover(a.page.getByText("Book your Screening Interview"))
        await a.wait(800)
      })
      await a.say("Below are a few numbers about Alex’s applications, and recent job openings that match the profile.", async () => {
        await a.scroll(450, 1500)
        await a.wait(600)
        await a.scroll(-450, 800)
      })
      await a.say("Candidates can browse all open jobs from here, and keep their profile up to date. But right now, Alex has an interview to book. Click Book now.", async () => {
        await a.click(a.page.getByRole("link", { name: "Book now" }))
        await a.wait(3500)
      })
      await a.say("This is the application page. It shows where Alex is in the process: step one of two, the screening interview, which is a thirty minute remote conversation.", async () => {
        await a.hover(a.page.getByText("Overall Progress"))
        await a.hover(a.page.getByText("Mode: REMOTE"))
        await a.wait(800)
      })
      await a.say("The instructions the admin wrote are shown here as well.", async () => {
        await a.hover(a.page.getByText("Please join five minutes early"))
      })
      await a.say("Further down, Alex sees the open times. Candidates only see times when an interviewer is actually free. Alex picks Thursday.", async () => {
        await a.click(a.page.locator("button").filter({ hasText: /^Thu/ }))
        await a.wait(600)
      })
      await a.say("And a time that suits, eleven o’clock.", async () => {
        await a.click(a.page.getByRole("button", { name: "11:00", exact: true }))
      })
      await a.say("Then Continue. A final dialog repeats the date and time, and warns that only the recruitment team can change it afterwards.", async () => {
        await a.click(a.page.getByRole("button", { name: "Continue" }))
        await a.wait(1500)
      })
      await a.say("Alex clicks Confirm booking.", async () => {
        const booked = a.page.waitForResponse((r) => /\/api\/.*(book|slot)/i.test(r.url()) && r.request().method() === "POST")
        await a.click(a.page.getByRole("button", { name: "Confirm booking" }))
        const res = await booked
        if (!res.ok()) throw new Error("booking failed: " + res.status() + " " + (await res.text()).slice(0, 300))
        await a.wait(3000)
      })
      await a.say("The interview is booked. Alex sees the date, the time and the meeting link on the application page, and a confirmation email is sent, with a calendar invite.", async () => {
        await a.page.getByText("Meeting Link").first().scrollIntoViewIfNeeded().catch(() => {})
        await a.wait(2000)
      })
    },
  },
  {
    name: "05-interviewer-scorecard",
    role: "interviewer",
    storage: "interviewer.json",
    save: "interviewer.json",
    before: "time-skip.sql",
    async run(a) {
      await a.card("Interview day", "The interview takes place on the video call", "The day of the interview arrives. Sarah and Alex meet on the video call. Afterwards, Sarah records her feedback in the portal.")
      await a.goto("/interviewer/dashboard", 2500)
      await a.say("Back on the interviewer dashboard, the numbers have changed. A scorecard is now waiting.", async () => {
        await a.hover(a.page.getByText("Scorecards pending"))
        await a.wait(1200)
      })
      await a.say("Sarah opens My interviews, which lists every interview booked with her. There are tabs for upcoming, needs feedback, and completed.", async () => {
        await a.click("a[href=\"/interviewer/interviews\"]")
        await a.wait(2500)
        await a.hover(a.page.getByText("Needs feedback").first())
      })
      await a.say("The interview has finished, so it moved to Needs feedback. Alex’s interview is marked Scorecard pending. She clicks it.", async () => {
        await a.click(a.page.getByText("Needs feedback", { exact: true }).first())
        await a.wait(1200)
        await a.click(a.page.getByText("Alex Mercer").first())
        await a.wait(3000)
      })
      await a.say("The interview page shows when and where, with a join link, and a summary of the candidate’s education, last employer, role and notice period. So Sarah is prepared.", async () => {
        await a.hover(a.page.getByText("Join meeting"))
        await a.hover(a.page.getByText("Last employer"))
      })
      await a.say("Below is the scorecard. Every interviewer scores the same criteria, so candidates are compared fairly. Each criterion is scored with a slider, from zero to ten.", async () => {
        await a.hover(a.page.getByText("Scorecard", { exact: true }).first())
        await a.wait(600)
      })
      const SCORES = [
        ["Appearance & outward personality", 8],
        ["Educational background", 9],
        ["Intellectual disposition & general awareness", 8],
        ["Leadership potential", 7],
        ["Adherence to principles and values", 9],
        ["IT skills", 9],
        ["Communication and inter-personal skills", 9],
        ["Commitment, enthusiasm and attention to quality", 8],
        ["Assertiveness, self-confidence & self-discipline", 7],
        ["Versatility, innovativeness & creative thinking", 8],
      ]
      const setRange = async (label, value) => {
        const loc = a.page.getByLabel(label, { exact: true })
        const max = Number(await loc.getAttribute("max"))
        await loc.scrollIntoViewIfNeeded()
        const box = await loc.boundingBox()
        await a.move(box.x + 8 + ((box.width - 16) * value) / max, box.y + box.height / 2)
        await a.page.mouse.click(box.x + 8 + ((box.width - 16) * value) / max, box.y + box.height / 2)
        // make sure the value is exact
        for (let i = 0; i < 12 && Number(await loc.inputValue()) !== value; i++) {
          await loc.press(Number(await loc.inputValue()) < value ? "ArrowRight" : "ArrowLeft")
        }
        await a.wait(250)
      }
      await a.say("Sarah scores Alex on each criterion: appearance, education, general awareness, leadership, values, IT skills, communication, and more. Alex is strong across the board.", async () => {
        for (const [label, v] of SCORES) await setRange(label, v)
      })
      await a.say("Two criteria carry more weight, and are scored out of twenty five: professional knowledge, and relevance of previous experience.", async () => {
        await setRange("Professional knowledge", 22)
        await setRange("Relevance of previous experience", 21)
      })
      await a.say("At the bottom, the live total updates as she scores. She recommends hiring Alex, and writes a short comment.", async () => {
        await a.click(a.page.getByRole("button", { name: "Recommend", exact: true }))
        await a.type(a.page.getByPlaceholder("Overall comments"), "Excellent React and design-system knowledge. Clear communicator. Recommend moving to offer.")
      })
      await a.say("The total is shown at the bottom, one hundred and twenty five out of one hundred and fifty, which is eighty three percent. She could save a draft, but the interview is done, so she clicks Submit scorecard.", async () => {
        await a.hover(a.page.getByText(/Score: \d+\/\d+/))
        await a.wait(800)
        await a.click(a.page.getByRole("button", { name: "Submit scorecard" }))
        await a.wait(800)
      })
      await a.say("A final check warns that a submitted scorecard cannot be edited. She confirms.", async () => {
        const sent = a.page.waitForResponse((r) => /interviewer\/.*(scorecard|evaluation|feedback|interviews)/i.test(r.url()) && r.request().method() !== "GET")
        await a.click(a.page.getByRole("dialog").getByRole("button", { name: "Submit", exact: true }))
        const res = await sent
        if (!res.ok()) throw new Error("scorecard failed: " + res.status() + " " + (await res.text()).slice(0, 300))
        await a.wait(2500)
      })
      await a.say("Submitted. The admin can now see the scorecard and decide what happens next. Back to the admin.", async () => {
        await a.wait(1500)
      })
    },
  },
  {
    name: "06-admin-decision",
    role: "admin",
    storage: "admin.json",
    save: "admin.json",
    async run(a) {
      await a.card("Part 5 · The decision", "Scorecards in, pass the candidate, send the offer", "Back with the admin. The interview is done, so it is time to decide.")
      await a.goto("/admin/jobs/7/rounds/16/candidates", 3500)
      await a.say("The round list has updated by itself. Chips along the top count candidates by stage: needs booking, scheduled, feedback pending, ready for decision, and done.", async () => {
        await a.hover(a.page.getByText("Needs booking").first())
        await a.hover(a.page.getByText("Ready for decision").first())
      })
      await a.say("Elena has not booked yet. For anyone who is stuck, the admin can book a slot on their behalf, or send a reminder.", async () => {
        await a.hover(a.page.getByRole("button", { name: "Book" }).first())
        await a.wait(600)
      })
      await a.say("Alex is ready for a decision. His one scorecard is in: eighty three percent, and recommended. Click his name to see the details.", async () => {
        await a.click(a.page.getByText("Alex Mercer").first())
        await a.wait(1800)
      })
      await a.say("The side panel shows Sarah’s score, her recommendation and her comment, and the interview history. If the admin was in the interview too, they could add their own scorecard here.", async () => {
        await a.hover(a.page.getByText("Excellent React and design-system knowledge"))
        await a.wait(1500)
        await a.page.keyboard.press("Escape")
        await a.wait(800)
      })
      await a.say("The decision is one click. Pass moves Alex to the next round, and reject closes the application. Click Pass.", async () => {
        await a.click(a.page.getByRole("button", { name: "Pass", exact: true }).first())
        await a.wait(800)
      })
      await a.say("A confirmation explains what happens: Alex will be admitted to the next round, and emailed. Click Move on.", async () => {
        const moved = a.page.waitForResponse((r) => /\/rounds\/16\/candidates/.test(r.url()) && r.request().method() === "POST")
        await a.click(a.page.getByRole("button", { name: "Move on" }))
        const res = await moved
        if (!res.ok()) throw new Error("pass failed: " + res.status() + " " + (await res.text()).slice(0, 300))
        await a.wait(2500)
      })
      await a.say("Alex has moved to the final round, the offer. Let's open it.", async () => {
        await a.click("a[href=\"/admin/jobs/7/rounds/17\"]")
        await a.wait(3500)
      })
      await a.say("The offer round has two documents. First a Letter of Intent, and once the candidate accepts it, the formal offer letter. The four steps are listed at the top.", async () => {
        await a.hover(a.page.getByText("Generate and send the Letter of Intent"))
        await a.hover(a.page.getByText("Candidate accepts the offer and is hired"))
      })
      await a.say("Alex’s row shows exactly what to do next, and the right button: Generate LOI. The filters above help when many candidates are here: needs action, waiting on the candidate, hired, and declined.", async () => {
        await a.hover(a.page.getByText("Needs action").first())
        await a.click(a.page.getByRole("link", { name: "Generate LOI" }))
        await a.wait(4500)
      })
      await a.say("The letter opens in an editor that works like a word processor. It is already filled in with Alex’s name, the job title and the company.", async () => {
        await a.hover(a.page.getByText("Document Editor"))
        await a.wait(800)
      })
      await a.say("Square brackets mark the details only the admin knows. Let's fill them in: first the reference number and Alex’s address.", async () => {
        await fillPlaceholder(a, "[REFERENCE NUMBER]", "LOI/2026/0042")
        await fillPlaceholder(a, "[Candidate Address]", "House 12, Street 4, Gulberg III, Lahore")
      })
      await a.say("Then the start date, the work location, and the pay.", async () => {
        await fillPlaceholder(a, "[START DATE]", "1 December 2026")
        await fillPlaceholder(a, "[WORK LOCATION]", "Lahore head office")
        await fillPlaceholder(a, "[SALARY AMOUNT]", "PKR 450,000 per month")
        await fillPlaceholder(a, "[BASIC SALARY]", "PKR 300,000")
        await fillPlaceholder(a, "[ALLOWANCES]", "PKR 150,000")
        await fillPlaceholder(a, "[TOTAL SALARY]", "PKR 450,000")
      })
      await a.say("And the probation period, the notice period, and who signs the letter.", async () => {
        await fillPlaceholder(a, "[PROBATION PERIOD]", "three months")
        await fillPlaceholder(a, "[NOTICE PERIOD]", "thirty days")
        await fillPlaceholder(a, "[SIGNATORY NAME]", "Ayesha Khan")
        await fillPlaceholder(a, "[SIGNATORY TITLE]", "Head of Talent Acquisition")
      })
      await a.say("Click Save Draft to keep the letter.", async () => {
        const saved = a.page.waitForResponse((r) => /\/loi$/.test(r.url()) && r.request().method() === "POST")
        await a.click(a.page.getByRole("button", { name: "Save Draft" }))
        const res = await saved
        if (!res.ok()) throw new Error("LOI save failed: " + res.status())
        await a.wait(1500)
      })
      await a.say("Generate PDF produces the official document, which is also what the candidate will download.", async () => {
        const pdf = a.page.waitForResponse((r) => /loi\/generate-pdf/.test(r.url()))
        await a.click(a.page.getByRole("button", { name: "Generate PDF" }))
        await pdf
        await a.wait(2500)
      })
      await a.say("Back on the offers page, the LOI now shows as Draft, and the next step says it is not sent yet. Click Send LOI.", async () => {
        await a.click(a.page.getByRole("button", { name: "Back" }))
        await a.wait(3500)
        await a.click(a.page.getByRole("button", { name: "Send LOI" }))
        await a.wait(800)
      })
      await a.say("Sending emails the candidate, who can then accept or decline from their own page. Click Send.", async () => {
        const sent = a.page.waitForResponse((r) => /\/loi$/.test(r.url()) && r.request().method() === "PATCH")
        await a.click(a.page.getByRole("dialog").getByRole("button", { name: "Send", exact: true }))
        const res = await sent
        if (!res.ok()) throw new Error("LOI send failed: " + res.status())
        await a.wait(3000)
      })
      await a.say("The status is now Sent, and the page says we are waiting for Alex. Over to the candidate.", async () => {
        await a.hover(a.page.getByText("Waiting for candidate to respond to LOI"))
        await a.wait(1500)
      })
    },
  },
  {
    name: "07-candidate-loi",
    role: "candidate",
    storage: "cand-alex.json",
    save: "cand-alex.json",
    async run(a) {
      await a.card("Part 6 · The offer", "Letter of Intent, offer letter, and the final answer", "Back with Alex. A Letter of Intent has arrived.")
      await a.goto("/", 2500)
      await a.say("Alex gets an email, and a notification in the portal, as soon as a letter is sent.", async () => {
        await a.click(a.page.getByRole("button", { name: /Notifications/ }))
        await a.wait(1800)
        await a.page.keyboard.press("Escape")
      })
      await a.say("He opens his application, and the process now shows the offer stage.", async () => {
        await a.click(a.page.getByRole("link", { name: "Applications" }).first())
        await a.wait(2500)
        await a.goto("/applications/44", 3000)
      })
      await a.say("Under the offer step, there is the Letter of Intent. It can be viewed as a PDF, exactly as the admin generated it, with Alex’s name, the role, the start date, and the pay.", async () => {
        await a.hover(a.page.getByText("Letter of Intent / Job Offer"))
        await a.hover(a.page.getByText("View PDF").first())
      })
      await a.say("Alex is happy with the terms, so he clicks Accept. He is asked to confirm, since this is a commitment.", async () => {
        const accepted = a.page.waitForResponse((r) => /api\/candidate\/loi\/.*\/status/.test(r.url()) && r.request().method() === "POST")
        await a.click(a.page.getByRole("button", { name: /Accept Offer/ }))
        const res = await accepted
        if (!res.ok()) throw new Error("LOI accept failed: " + res.status() + " " + (await res.text()).slice(0, 300))
        await a.wait(2500)
      })
      await a.say("The letter now shows Accepted. Alex could also have declined it, and the admin would see that too.", async () => {
        await a.hover(a.page.getByText("ACCEPTED").first())
        await a.wait(1200)
      })
    },
  },
  {
    name: "08-admin-offer-letter",
    role: "admin",
    storage: "admin.json",
    save: "admin.json",
    async run(a) {
      await a.card("Back to the admin", "Offer letter", "The admin sees that Alex accepted, and prepares the formal offer letter.")
      await a.goto("/admin/jobs/7/rounds/17/offers", 3500)
      await a.say("On the offers page, the LOI shows Accepted, and the next step has changed: generate the offer letter. This button was locked until the LOI was accepted, so no one can send an offer by mistake.", async () => {
        await a.hover(a.page.getByText("LOI accepted, generate the offer letter"))
        await a.wait(800)
      })
      await a.say("Click Generate Offer.", async () => {
        await a.click(a.page.getByRole("link", { name: "Generate Offer" }))
        await a.wait(4500)
      })
      await a.say("The offer letter uses the same editor. It is filled in with Alex’s details, and the admin completes the remaining details: reference, address, start date, department, and the reporting manager.", async () => {
        await fillPlaceholder(a, "[REFERENCE NUMBER]", "OFR/2026/0042")
        await fillPlaceholder(a, "[Candidate Address]", "House 12, Street 4, Gulberg III, Lahore")
        await fillPlaceholder(a, "[START DATE]", "1 December 2026")
        await fillPlaceholder(a, "[DEPARTMENT]", "Engineering")
        await fillPlaceholder(a, "[REPORTING MANAGER]", "Daniyal Ahmed")
      })
      await a.say("Then the pay, work location, the probation and notice periods, a deadline to accept, and who signs.", async () => {
        await fillPlaceholder(a, "[SALARY AMOUNT]", "PKR 450,000 per month")
        await fillPlaceholder(a, "[WORK LOCATION]", "Lahore head office")
        await fillPlaceholder(a, "[PROBATION PERIOD]", "three months")
        await fillPlaceholder(a, "[NOTICE PERIOD]", "thirty days")
        await fillPlaceholder(a, "[ACCEPTANCE DEADLINE]", "30 October 2026")
        await fillPlaceholder(a, "[SIGNATORY NAME]", "Ayesha Khan")
        await fillPlaceholder(a, "[SIGNATORY TITLE]", "Head of Talent Acquisition")
      })
      await a.say("Save the draft, and generate the PDF.", async () => {
        const saved = a.page.waitForResponse((r) => /\/offer$/.test(r.url()) && r.request().method() === "POST")
        await a.click(a.page.getByRole("button", { name: "Save Draft" }))
        const res = await saved
        if (!res.ok()) throw new Error("offer save failed: " + res.status() + " " + (await res.text()).slice(0, 300))
        await a.wait(1500)
        const pdf = a.page.waitForResponse((r) => /offer\/generate-pdf/.test(r.url()))
        await a.click(a.page.getByRole("button", { name: "Generate PDF" }))
        await pdf
        await a.wait(2500)
      })
      await a.say("Back on the offers page, click Send Offer, and confirm.", async () => {
        await a.click(a.page.getByRole("button", { name: "Back" }))
        await a.wait(3500)
        await a.click(a.page.getByRole("button", { name: "Send Offer" }))
        await a.wait(800)
        const sent = a.page.waitForResponse((r) => /\/offer$/.test(r.url()) && r.request().method() === "PATCH")
        await a.click(a.page.getByRole("dialog").getByRole("button", { name: "Send", exact: true }))
        const res = await sent
        if (!res.ok()) throw new Error("offer send failed: " + res.status() + " " + (await res.text()).slice(0, 300))
        await a.wait(3000)
      })
      await a.say("The offer is sent, and now it is up to Alex.", async () => {
        await a.hover(a.page.getByText("Waiting for candidate to respond to offer"))
        await a.wait(1200)
      })
    },
  },
  {
    name: "09-candidate-hired",
    role: "candidate",
    storage: "cand-alex.json",
    save: "cand-alex.json",
    async run(a) {
      await a.card("The final answer", "Accept the offer", "Alex now has the formal offer letter.")
      await a.goto("/applications/44", 3500)
      await a.say("On the application page, a new section shows the official offer letter, ready to read.", async () => {
        await a.hover(a.page.getByText("Official Offer Letter"))
        await a.hover(a.page.getByText("View PDF").last())
      })
      await a.say("This is the last step. Alex clicks Accept Final Offer, and confirms.", async () => {
        const accepted = a.page.waitForResponse((r) => /api\/candidate\/offer\/.*\/status/.test(r.url()) && r.request().method() === "POST")
        await a.click(a.page.getByRole("button", { name: /Accept Final Offer/ }))
        const res = await accepted
        if (!res.ok()) throw new Error("offer accept failed: " + res.status() + " " + (await res.text()).slice(0, 300))
        await a.wait(3000)
      })
      await a.say("The offer is accepted. Every step of the application is now complete, and Alex is hired.", async () => {
        await a.page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }))
        await a.wait(2500)
      })
    },
  },
  {
    name: "10-admin-wrapup",
    role: "admin",
    storage: "admin.json",
    save: "admin.json",
    async run(a) {
      await a.card("Wrapping up", "The admin sees the result, and the rest of the toolkit", "Last, back with the admin.")
      await a.goto("/admin/jobs/7/rounds/17/offers", 3500)
      await a.say("On the offers page, Alex is marked Hired, and the Hired filter counts him. The whole journey, from application to signed offer, is tracked in one place.", async () => {
        await a.click(a.page.getByText("Hired", { exact: false }).first())
        await a.wait(1500)
      })
      await a.say("The dashboard reflects it too. The hiring rate and the recent activity are updated.", async () => {
        await a.click("a[href=\"/admin/dashboard\"]")
        await a.wait(3500)
        await a.hover(a.page.getByText("Hiring Rate"))
      })
      await a.say("The Candidates page lists everyone in the system, and can be filtered by job.", async () => {
        await a.click("a[href=\"/admin/candidates\"]")
        await a.wait(3500)
      })
      await a.say("Skill assessments let the admin create AI generated tests, and see how candidates score.", async () => {
        await a.click("a[href=\"/admin/assessments\"]")
        await a.wait(3500)
      })
      await a.say("The calendar shows every interview across all jobs and interviewers.", async () => {
        await a.click("a[href=\"/admin/calendar\"]")
        await a.wait(3500)
      })
      await a.say("Team and Settings manage admin users and the organisation’s time zone and branding.", async () => {
        await a.click("a[href=\"/admin/users\"]")
        await a.wait(2500)
        await a.click("a[href=\"/admin/settings\"]")
        await a.wait(2500)
      })
      await a.card("That is the full journey", "Admin · Interviewer · Candidate", "That is the full journey, from posting a job to a signed offer. Every role sees only what they need, and nothing falls through the cracks. Thank you for watching.")
    },
  },
]
