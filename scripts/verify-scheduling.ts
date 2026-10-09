/**
 * End-to-end check of the interview scheduling services against a REAL database.
 *
 *   VERIFY_DB_OK=1 DATABASE_URL=... DIRECT_URL=... npx tsx scripts/verify-scheduling.ts
 *
 * It creates its own data (all names are tagged with a random run id), asserts the behaviour that unit tests
 * cannot cover (atomic capacity under concurrency, rebooking after cancel, panels, scorecards, advancing a
 * round) and deletes everything it created. Apply the migration first (`npx prisma migrate deploy`).
 *
 * NEVER point this at a production database: it refuses to run unless VERIFY_DB_OK=1 is set.
 */
import assert from "node:assert/strict"

(process.env as Record<string, string | undefined>).NODE_ENV = process.env.NODE_ENV || "development"

async function main() {
  if (process.env.VERIFY_DB_OK !== "1") {
    console.error("Refusing to run: set VERIFY_DB_OK=1 to confirm DATABASE_URL points to a disposable database.")
    process.exit(2)
  }
  const host = (process.env.DATABASE_URL || "").replace(/^.*@/, "").replace(/\/.*$/, "")
  console.log(`Using database host: ${host}`)

  const { prisma } = await import("../lib/prisma")
  const { publishSlots } = await import("../lib/scheduling/slot-service")
  const { bookSlot, cancelBooking, rescheduleBooking, BookingError } = await import("../lib/scheduling/booking-service")
  const { getCandidateSlotsView } = await import("../lib/scheduling/candidate-view")
  const { submitEvaluation, saveDraft, getInterviewDetail } = await import("../lib/evaluations/service")
  const { advanceFromRound, RoundAdvanceError } = await import("../lib/services/round-advance")
  const { ensurePipelineForApplication, admitToRound } = await import("../lib/services/pipeline-gate")
  const { DEFAULT_SKILL_MAX } = await import("../lib/evaluations/scoring")
  const { zonedDateKey, addDaysToDateKey } = await import("../lib/timezone")
  const { getOrgTimeZone } = await import("../lib/scheduling/org-settings")

  const tag = `vfy${Date.now().toString(36)}`
  const now = BigInt(Math.floor(Date.now() / 1000))
  const created = { users: [] as bigint[], jobId: null as bigint | null }
  const results: Array<[string, boolean, string?]> = []
  const check = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn()
      results.push([name, true])
      console.log(`  PASS  ${name}`)
    } catch (error) {
      results.push([name, false, (error as Error).message])
      console.log(`  FAIL  ${name}\n        ${(error as Error).message}`)
    }
  }

  const mkUser = async (kind: string, i: number, role: "ADMIN" | "INTERVIEWER" | "CANDIDATE") => {
    const u = await prisma.user.create({
      data: {
        role,
        username: `${tag}_${kind}${i}`,
        password: "x",
        firstname: `${kind}${i}`,
        lastname: tag,
        email: `${tag}_${kind}${i}@example.test`,
        createdAt: now,
        updatedAt: now,
      },
    })
    created.users.push(u.id)
    return u
  }

  try {
    const tz = await getOrgTimeZone()
    const admin = await mkUser("admin", 0, "ADMIN")
    const interviewers = await Promise.all([1, 2, 3].map((i) => mkUser("iv", i, "INTERVIEWER")))
    const candidates = await Promise.all(Array.from({ length: 14 }, (_, i) => mkUser("cand", i, "CANDIDATE")))

    const job = await prisma.job.create({
      data: {
        jobCode: `${tag}-JOB`,
        title: `Verification ${tag}`,
        company: "Verify Co",
        postFrom: new Date(),
        postTo: new Date(Date.now() + 30 * 86400000),
        employmentType: "Permanent",
        createdBy: admin.id,
        createdAt: now,
        updatedAt: now,
      },
    })
    created.jobId = job.id
    const workflow = await prisma.jobWorkflow.create({ data: { jobId: job.id, createdAt: now, updatedAt: now } })
    const screening = await prisma.workflowStep.create({
      data: {
        workflowId: workflow.id, stepName: "Screening Interview", stepType: "SCREENING_INTERVIEW", stepOrder: 1,
        isRequired: true, isSkippable: false, interviewMode: "REMOTE", durationMins: 30, panelSize: 1, bufferMins: 0,
        capacityPerSlot: 1, stepMetadata: { meetingLink: "https://meet.example.test/room" }, createdAt: now, updatedAt: now,
      },
    })
    const focus = await prisma.workflowStep.create({
      data: {
        workflowId: workflow.id, stepName: "Focus Group", stepType: "FOCUS_GROUP", stepOrder: 2,
        isRequired: false, isSkippable: true, interviewMode: "ONSITE", durationMins: 60, panelSize: 2, bufferMins: 10,
        capacityPerSlot: 3, stepMetadata: { location: "HQ room 1" }, createdAt: now, updatedAt: now,
      },
    })
    await prisma.workflowStep.create({
      data: { workflowId: workflow.id, stepName: "Offer", stepType: "OFFER", stepOrder: 3, isRequired: true, isSkippable: false, createdAt: now, updatedAt: now },
    })
    for (const step of [screening, focus]) {
      await prisma.stepInterviewer.createMany({ data: interviewers.map((i) => ({ stepId: step.id, interviewerId: i.id, createdAt: now })) })
    }
    // every day 09:00-12:00 so the checks work whatever day they run
    await prisma.interviewerAvailability.createMany({
      data: interviewers.flatMap((i) => [0, 1, 2, 3, 4, 5, 6].map((d) => ({ interviewerId: i.id, dayOfWeek: d, startMinute: 540, endMinute: 720, createdAt: now }))),
    })

    const today = zonedDateKey(new Date(), tz)
    const from = addDaysToDateKey(today, 2)
    const to = addDaysToDateKey(today, 3)

    // applications + pipelines for everyone, admitted into the screening round
    const pipelineOf = new Map<string, bigint>()
    for (const c of candidates) {
      const app = await prisma.jobsApplied.create({ data: { jobId: job.id, userId: c.id, status: "SUBMITTED", appliedAt: now } })
      await prisma.$transaction(async (tx) => {
        const p = await ensurePipelineForApplication(tx, { applicationId: app.id, jobId: job.id, userId: c.id })
        pipelineOf.set(c.id.toString(), p!.id)
      })
    }
    await prisma.$transaction((tx) => admitToRound(tx, { jobId: job.id, userIds: candidates.map((c) => c.id), workflowStepId: screening.id }))

    console.log("\nSlot generation")
    let firstSlotId = BigInt(0)
    await check("publishing creates 1:1 slots from availability", async () => {
      const { created: n } = await publishSlots(screening.id, from, to, admin.id)
      assert.ok(n >= 3 * 6 * 2 - 3, `expected plenty of slots, got ${n}`) // 3 interviewers x 6 slots x 2 days
      const slots = await prisma.interviewSlot.findMany({ where: { stepId: screening.id }, include: { interviewers: true }, orderBy: { startsAt: "asc" } })
      assert.ok(slots.every((s) => s.interviewers.length === 1 && s.capacity === 1 && s.mode === "REMOTE" && s.meetingLink))
      firstSlotId = slots[0].id
    })
    await check("publishing the same range again is idempotent (no duplicates)", async () => {
      const before = await prisma.interviewSlot.count({ where: { stepId: screening.id } })
      await assert.rejects(() => publishSlots(screening.id, from, to, admin.id), /No free time|free time/i)
      assert.equal(await prisma.interviewSlot.count({ where: { stepId: screening.id } }), before)
    })
    await check("concurrent publishes never create overlapping slots for an interviewer", async () => {
      const extraFrom = addDaysToDateKey(today, 4)
      await Promise.allSettled([publishSlots(screening.id, extraFrom, extraFrom, admin.id), publishSlots(screening.id, extraFrom, extraFrom, admin.id)])
      const rows = await prisma.slotInterviewer.findMany({ where: { slot: { stepId: screening.id } }, include: { slot: true } })
      const byIv = new Map<string, Array<{ s: Date; e: Date }>>()
      for (const r of rows) byIv.set(r.interviewerId.toString(), [...(byIv.get(r.interviewerId.toString()) ?? []), { s: r.slot.startsAt, e: r.slot.endsAt }])
      for (const list of byIv.values()) {
        list.sort((a, b) => a.s.getTime() - b.s.getTime())
        for (let i = 1; i < list.length; i++) assert.ok(list[i].s >= list[i - 1].e, "overlapping slots for one interviewer")
      }
    })

    console.log("\nBooking")
    const [c0, c1, c2, c3, c4, c5, c6, c7, c8, c9] = candidates
    const pip = (c: { id: bigint }) => pipelineOf.get(c.id.toString())!

    await check("10 candidates race for one seat: exactly one wins", async () => {
      const racers = candidates.slice(0, 10)
      const settled = await Promise.allSettled(racers.map((c) => bookSlot({ candidateId: c.id, pipelineId: pip(c), slotId: firstSlotId })))
      assert.equal(settled.filter((r) => r.status === "fulfilled").length, 1)
      const slot = await prisma.interviewSlot.findUniqueOrThrow({ where: { id: firstSlotId } })
      assert.equal(slot.bookedCount, 1)
      for (const r of settled) if (r.status === "rejected") assert.ok(r.reason instanceof BookingError, String(r.reason))
    })

    const winner = (await prisma.slotBooking.findFirstOrThrow({ where: { slotId: firstSlotId, status: "RESERVED" } }))
    await check("a candidate cannot hold two bookings in one round", async () => {
      const other = await prisma.interviewSlot.findFirstOrThrow({ where: { stepId: screening.id, id: { not: firstSlotId }, bookedCount: 0 } })
      await assert.rejects(() => bookSlot({ candidateId: winner.candidateId, pipelineId: pip({ id: winner.candidateId }), slotId: other.id }), /already have an interview/i)
    })
    await check("a candidate cannot book through someone else's pipeline", async () => {
      const other = await prisma.interviewSlot.findFirstOrThrow({ where: { stepId: screening.id, bookedCount: 0 } })
      await assert.rejects(() => bookSlot({ candidateId: c11().id, pipelineId: pip(c10()), slotId: other.id }), /does not belong to you/i)
    })
    function c10() { return candidates[10] }
    function c11() { return candidates[11] }

    await check("cancelling frees the seat and the same slot can be booked again", async () => {
      await cancelBooking({ bookingId: winner.id, actorId: admin.id, reason: "verify" })
      const slot = await prisma.interviewSlot.findUniqueOrThrow({ where: { id: firstSlotId } })
      assert.equal(slot.bookedCount, 0)
      await bookSlot({ candidateId: winner.candidateId, pipelineId: pip({ id: winner.candidateId }), slotId: firstSlotId }) // same candidate, same slot
      assert.equal((await prisma.interviewSlot.findUniqueOrThrow({ where: { id: firstSlotId } })).bookedCount, 1)
    })

    await check("admin reschedule moves the seat atomically", async () => {
      const booking = await prisma.slotBooking.findFirstOrThrow({ where: { slotId: firstSlotId, status: "RESERVED" } })
      const target = await prisma.interviewSlot.findFirstOrThrow({ where: { stepId: screening.id, id: { not: firstSlotId }, bookedCount: 0 }, orderBy: { startsAt: "desc" } })
      await rescheduleBooking({ bookingId: booking.id, newSlotId: target.id, actorId: admin.id })
      assert.equal((await prisma.interviewSlot.findUniqueOrThrow({ where: { id: firstSlotId } })).bookedCount, 0)
      assert.equal((await prisma.interviewSlot.findUniqueOrThrow({ where: { id: target.id } })).bookedCount, 1)
      const after = await prisma.slotBooking.findUniqueOrThrow({ where: { id: booking.id } })
      assert.equal(after.icsSequence, 1)
    })

    await check("candidate view shows BOOKED with the meeting link, others see open slots without links", async () => {
      const bookedView = await getCandidateSlotsView(winner.candidateId, pip({ id: winner.candidateId }))
      assert.equal(bookedView?.state, "BOOKED")
      assert.ok(bookedView?.booking?.meetingLink)
      const openView = await getCandidateSlotsView(c5.id, pip(c5))
      assert.equal(openView?.state, "AWAITING_BOOKING")
      assert.equal(JSON.stringify(openView).includes("meet.example.test"), false)
      assert.equal(await getCandidateSlotsView(c5.id, pip(c6)), null)
    })

    console.log("\nFocus group (panel + group size)")
    // move 4 candidates to the focus group round
    const groupCandidates = [c6, c7, c8, c9]
    await check("panel slots seat 2 interviewers and 3 candidates", async () => {
      for (const c of groupCandidates) {
        await prisma.$transaction((tx) => advanceFromRound(tx, { jobId: job.id, workflowStepId: screening.id, candidateIds: [c.id], actorId: admin.id, mode: "COMPLETE", now }))
      }
      await prisma.$transaction((tx) => admitToRound(tx, { jobId: job.id, userIds: groupCandidates.map((c) => c.id), workflowStepId: focus.id }))
      const { created: n } = await publishSlots(focus.id, from, to, admin.id)
      assert.ok(n > 0)
      const slot = await prisma.interviewSlot.findFirstOrThrow({ where: { stepId: focus.id }, include: { interviewers: true }, orderBy: { startsAt: "asc" } })
      assert.equal(slot.interviewers.length, 2)
      assert.equal(slot.capacity, 3)
      const settled = await Promise.allSettled(groupCandidates.map((c) => bookSlot({ candidateId: c.id, pipelineId: pip(c), slotId: slot.id })))
      assert.equal(settled.filter((r) => r.status === "fulfilled").length, 3, "3 of 4 get a seat")
      assert.equal((await prisma.interviewSlot.findUniqueOrThrow({ where: { id: slot.id } })).bookedCount, 3)
    })

    console.log("\nScorecards and decisions")
    await check("only panel members can open an interview; submitting is blocked before the start", async () => {
      const booking = await prisma.slotBooking.findFirstOrThrow({ where: { slot: { stepId: focus.id }, status: "RESERVED" }, include: { slot: { include: { interviewers: true } } } })
      const outsider = interviewers.find((i) => !booking.slot.interviewers.some((p) => p.interviewerId === i.id))
      const member = booking.slot.interviewers[0].interviewerId
      if (outsider) await assert.rejects(() => getInterviewDetail(outsider.id, booking.id), /not found/i)
      await assert.rejects(() => saveDraft(member, booking.id, { x: 1 }), /opens shortly before/i)
    })
    await check("all panel members submitting completes the step exactly once (concurrent)", async () => {
      const booking = await prisma.slotBooking.findFirstOrThrow({ where: { slot: { stepId: focus.id }, status: "RESERVED" }, include: { slot: { include: { interviewers: true } } } })
      // pretend the interview happened an hour ago
      await prisma.interviewSlot.update({ where: { id: booking.slotId }, data: { startsAt: new Date(Date.now() - 2 * 3600e3), endsAt: new Date(Date.now() - 3600e3) } })
      const form = (rec: string) => ({
        focusGroup: { panel: { behaviors: [{ rating: 3 }, { rating: 4 }, { rating: 2 }] } },
        recommendedToHire: rec,
        comments: "ok",
      })
      const behaviors = (await import("../lib/constants/focus-group-behaviors")).INTERNAL_BEHAVIORS
      const full = (rec: string) => ({ ...form(rec), focusGroup: { panel: { behaviors: behaviors.map((b) => ({ name: b.name, rating: 3 })) } } })
      const [a, b] = booking.slot.interviewers.map((p) => p.interviewerId)
      const settled = await Promise.allSettled([submitEvaluation(a, booking.id, full("HIRE")), submitEvaluation(b, booking.id, full("NO_HIRE"))])
      assert.ok(settled.every((r) => r.status === "fulfilled"), JSON.stringify(settled.map((r) => (r as any).reason?.message)))
      const step = await prisma.candidatePipelineStep.findUniqueOrThrow({ where: { id: booking.pipelineStepId! } })
      assert.equal(step.status, "COMPLETED")
      await assert.rejects(() => submitEvaluation(a, booking.id, full("HIRE")), /already submitted/i)
      assert.equal(await prisma.stageEvaluation.count({ where: { pipelineStepId: booking.pipelineStepId! } }), 2)
    })
    await check("a required round cannot be skipped, an optional one can", async () => {
      await assert.rejects(
        () => prisma.$transaction((tx) => advanceFromRound(tx, { jobId: job.id, workflowStepId: screening.id, candidateIds: [c5.id], actorId: admin.id, mode: "SKIP", now })),
        (e: unknown) => e instanceof RoundAdvanceError
      )
      // c9 sits in the focus group without a seat: skipping is allowed because the round is optional
      const waiting = await prisma.slotBooking.findMany({ where: { slot: { stepId: focus.id }, status: "RESERVED" }, select: { candidateId: true } })
      const unbooked = groupCandidates.find((c) => !waiting.some((w) => w.candidateId === c.id))
      if (unbooked) {
        const r = await prisma.$transaction((tx) => advanceFromRound(tx, { jobId: job.id, workflowStepId: focus.id, candidateIds: [unbooked.id], actorId: admin.id, mode: "SKIP", now }))
        assert.equal(r.advanced, 1)
        const st = await prisma.candidatePipelineStep.findFirstOrThrow({ where: { workflowStepId: focus.id, pipeline: { candidateId: unbooked.id } } })
        assert.equal(st.status, "SKIPPED")
      }
    })
    await check("a stale selection cannot rewind or double advance a candidate", async () => {
      const r = await prisma.$transaction((tx) => advanceFromRound(tx, { jobId: job.id, workflowStepId: screening.id, candidateIds: [c6.id], actorId: admin.id, mode: "COMPLETE", now }))
      assert.equal(r.advanced, 0)
    })
  } finally {
    // cleanup everything created by this run
    const { prisma } = await import("../lib/prisma")
    if (created.jobId) await prisma.job.delete({ where: { id: created.jobId } }).catch((e) => console.error("cleanup job:", e.message))
    await prisma.auditLog.deleteMany({ where: { userId: { in: created.users } } }).catch(() => undefined)
    await prisma.notification.deleteMany({ where: { userId: { in: created.users } } }).catch(() => undefined)
    await prisma.user.deleteMany({ where: { id: { in: created.users } } }).catch((e) => console.error("cleanup users:", e.message))
    await prisma.$disconnect()
  }

  const failed = results.filter(([, ok]) => !ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  if (failed.length) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
