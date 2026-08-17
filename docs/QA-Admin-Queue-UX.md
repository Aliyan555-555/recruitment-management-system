# QA Guide: Admin Candidate Queue UX

**Audience:** QA testers  
**Feature:** Admin shortlisting and round candidate lists  
**Goal:** Stop admins from thinking candidates “disappeared” when a list is empty

This document explains the change in simple language, then gives test steps.

---

## 1. What was going wrong (today)

Imagine a job has **300 applicants**.

Admin opens Shortlisting (or Screening Applied). The page shows **everyone mixed together**: people still waiting for a decision, and people already shortlisted.

Admin then filters to **only people not yet shortlisted**.

If everyone has already been reviewed, the table shows:

> No candidates found

Admin thinks: **“Where did my 300 candidates go?”**

If they remove the filter, they see a mixed list again and cannot focus on the remaining work.

This same confusion happens on:

- Job shortlist page
- Every round Applied page (Screening, Focus Group, Final Interview, Offer)

---

## 2. What we are changing (in simple words)

We are **not** changing how hiring works in the database.

We are changing **how the admin screen shows work**.

### Old way

- Default list = mixed (pending + already decided)
- Filter hides people
- Empty table = “No candidates found”
- Numbers on the page change when you filter (can become 0 even if 300 people exist)

### New way

Admin always sees three things:

1. **Who still needs a decision** (default screen)
2. **Where the others went** (tabs with numbers)
3. **What to do next** (buttons, not a blank page)

Think of it like email folders:

| Tab | Meaning |
|-----|---------|
| Needs Review | Inbox — work still to do |
| Shortlisted / In round | Already selected |
| Rejected | Already rejected |

If Inbox is empty, the page should say:

> All candidates have been reviewed.  
> 55 shortlisted · 245 rejected · 0 remaining  
> [View Shortlisted] [View Rejected]

It should **not** say “No candidates found.”

---

## 3. What is in scope vs out of scope

### In scope (QA should test this)

- Job shortlist page
- Round Applied page
- Round Shortlisted page
- Round Results / Offers empty messages
- Jobs list count numbers and labels
- Job detail page links to rounds and Manual Shortlist

### Out of scope (do not treat as a bug)

- Job shortlist and Screening still both exist. That is leftover product design, not this ticket.
- Database status names (`SHORTLISTED`, `REMOVED`, `PENDING`) stay the same. Only **labels on screen** change.
- Candidate apply flow, scoring, LOI, and offer letters are not being rebuilt.

---

## 4. New words on the screen

| Old text | New text |
|----------|----------|
| All Candidates | All applications (optional tab, not default) |
| Applied Only | Needs review |
| Round — Applied Candidates | Round name — Needs review |
| Round — Shortlisted | Round name — In round |
| Badge `REMOVED` | Rejected |
| Jobs table `55 / 245` | `55 in round · 245 to review` (or similar clear wording) |

---

## 5. Pages and expected behavior

### 5.1 Job Shortlist

**Path:** Admin → Jobs → a job → Manual Shortlist  
(`/admin/jobs/{id}/shortlist`)

**Expected**

- Page opens on **Needs Review**, not All.
- Tabs show counts even when a tab is 0. Example: `Needs Review (0) | Shortlisted (55) | Rejected (245)`
- Top numbers (total / shortlisted / rejected) **do not become 0** just because Needs Review is empty.
- If Needs Review is empty because work is finished, show a **completion message** with the split and buttons to open Shortlisted or Rejected.
- If the job truly has 0 applications, show **“No one has applied yet.”**
- If search finds nothing, show **“No matches for …”** with Clear search. Do not use the completion message for a search miss.
- After shortlisting the last remaining person, stay on Needs Review and show the completion message. A success toast is also OK.
- Rejected people are visible on the Rejected tab (today they are easy to miss).

**Fail if**

- Default view is still mixed All Candidates.
- Empty Needs Review says only “No candidates found.”
- Total Applied becomes 0 when the filter/tab is empty.

---

### 5.2 Round Applied (Screening and every other round)

**Path:** Jobs table round column, or job → round → Applied  
(`/admin/jobs/{id}/rounds/{roundId}/applied`)

**Expected**

- Default list is **only people waiting for a decision** (Pending / Needs Review).
- Rejected people are on a **Rejected tab**, not mixed into the work list.
- Duplicate cards “Pending” and “Pending Review” are gone (they showed the same number).
- There is a round menu with counts, for example:

  `Needs Review (12) | Shortlisted (40) | Results`

- If Needs Review is 0 but people were shortlisted, the empty state must say they were reviewed and offer **View Shortlisted**.
- Only Pending rows can be selected for Shortlist / Reject.

**Fail if**

- Opening Screening with 0 pending shows “No candidates found / try adjusting filters” while 300 people sit on Shortlisted.
- Pending and Rejected are mixed in the default list.

---

### 5.3 Round Shortlisted

**Path:** same round → Shortlisted

**Expected**

- Same round menu as Applied, with counts.
- If nobody is shortlisted yet: **“No one shortlisted into this round yet”** plus a link back to Needs Review.
- Page must not be a blank table with no message.

---

### 5.4 Round Results and Offers

**Expected**

- If filters hide everyone, message should say the filter hid them, with **Clear filters**.
- If nobody is assessed yet: **“No assessments in this round yet”** plus a link to Shortlisted.
- Offers empty state should still make sense (no one in round yet vs filters hiding people).

---

### 5.5 Jobs list

**Path:** `/admin/jobs`

**Expected**

- Count cells have a legend or clear labels (green = in round / shortlisted, gray = still to review).
- After Screening shortlist, **later rounds must not show 0 / 0** just because the application status is already SHORTLISTED.
- Round “to review” count should match people still **Pending** on that round’s Applied page.

**Fail if**

- Admin shortlists in Screening, then Focus Group / next round column looks empty, but Applied page still has Pending people.

---

### 5.6 Job detail

**Path:** `/admin/jobs/{id}`

**Expected**

- Workflow steps are clickable and open that round’s Needs Review.
- **Manual Shortlist** is available, not only AI Shortlist.

---

### 5.7 Pipeline header (job map)

On shortlist and round pages, admin should see a simple path, for example:

`Applications (300) → Screening (55) → Offer (12)`

- Current step is highlighted.
- Clicking a step opens that step’s Needs Review.
- These numbers must not come from the filtered table. They should stay correct even if the current tab is empty.

---

## 6. Test scenarios (happy path)

Use one NORMAL job with a workflow (at least Screening + Offer).

### Scenario A — First shortlist of 300 applicants

1. Create a job. Have several candidates apply (5 is enough if 300 is not practical).
2. Open Manual Shortlist.
3. Confirm default tab is **Needs Review** and count matches applicants still waiting.
4. Shortlist some, reject some, leave some pending.
5. Confirm tab counts update, and the table only shows the active tab.
6. Shortlist/reject the last pending person.
7. Confirm Needs Review shows the **completion** message, not “No candidates found.”
8. Click View Shortlisted / View Rejected and confirm the right people are there.
9. Confirm top totals still show the full picture (not 0).

### Scenario B — Screening round

1. Open Screening Applied.
2. Confirm only Pending people are in the default list.
3. Shortlist some into the round.
4. Confirm they leave Needs Review and the Shortlisted count goes up.
5. Finish all Pending.
6. Confirm completion message + link to Shortlisted.
7. Open Shortlisted and confirm those people are there.
8. Open Rejected tab and confirm rejected people are only there.

### Scenario C — Next round after move forward

1. Complete assessments and move candidates to the next round.
2. Open the next round Applied.
3. Confirm those people appear as Needs Review (Pending).
4. On Jobs list, confirm the next-round “to review” count is not 0 / 0.

### Scenario D — Search vs finished queue

1. On Needs Review with people still pending, search a name that does not exist.
2. Message should be search-related, with Clear search.
3. Finish the queue, then open Needs Review with no search.
4. Message should be completion-related, not search-related.

### Scenario E — Job with zero applicants

1. Open shortlist on a new job with no applications.
2. Message should be “no one has applied,” not “all reviewed.”

---

## 7. Edge cases QA must try

| Case | Expected |
|------|----------|
| Needs Review count is 0, Shortlisted is not 0 | Completion empty state, counts still visible on tabs |
| Needs Review is 0, and job has 0 applications | True empty: no applicants yet |
| Search on a non-empty tab finds 0 | Search empty state + Clear search |
| Select all on Needs Review | Selects only people who can still be actioned |
| Rejected tab | Read-only for round reject archive; no shortlist checkbox for already rejected |
| Refresh the page | Still opens on Needs Review (default), counts still correct |
| Switch Manual Shortlist ↔ AI Shortlist | Pipeline header still makes sense; Manual/AI tabs still work |
| Offer round | Same queue pattern; Offers page empty copy is clear |
| Jobs list after round 1 shortlist | Later round counts still match Applied page |
| Job detail step click | Lands on that round’s Needs Review |

---

## 8. What “pass” looks like for this feature

QA can pass the feature if all of these are true:

1. Admin’s **first screen is remaining work**, not a mixed list.
2. When remaining work is 0, the page **explains where people went**.
3. Tab/page numbers **stay visible and correct** even when the table is empty.
4. Jobs list round numbers **match the round pages**.
5. Empty search and empty queue **use different messages**.

If any of those fail, the original confusion is still present.

---

## 9. Suggested severity

| Bug | Severity |
|-----|----------|
| Empty Needs Review says “No candidates found” while people exist in other tabs | High — this is the original production confusion |
| Default list still mixes pending + decided | High |
| Counts drop to 0 when the active tab is empty | High |
| Jobs list next-round counts become 0 / 0 incorrectly | High |
| Shortlisted page still has a blank table with no message | Medium |
| Duplicate Pending / Pending Review cards still shown | Medium |
| Job detail missing Manual Shortlist or round links | Medium |
| Wording still says `REMOVED` instead of Rejected | Low |

---

## 10. Notes for QA sign-off

Please attach screenshots of:

1. Job shortlist — Needs Review with people remaining
2. Job shortlist — Needs Review at 0 after all reviewed (completion state)
3. Screening Applied — same two states
4. Jobs list — round counts with the new labels
5. Search miss empty state (to prove it is different from completion)

Build / environment: fill in before test run.

Tester:  
Date:  
Result: Pass / Fail  
Bugs logged:
