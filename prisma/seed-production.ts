import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Minimal production seed: only the data the system needs to run.
 * No demo jobs, no candidates. Safe to re-run (everything is upsert / find-or-create).
 *
 * Optional env: ADMIN_PASSWORD (default Admin123! - change it after first login), ADMIN_EMAIL (default admin@meteoric.com), ADMIN_USERNAME (default admin),
 *               ORG_NAME (default Meteoric)
 */
const prisma = new PrismaClient();

const GLOBAL_SKILL_CONFIG = "__GLOBAL__";

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin123!";
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@meteoric.com")
    .trim()
    .toLowerCase();
  const adminUsername = (process.env.ADMIN_USERNAME ?? "admin").trim();
  const orgName = (process.env.ORG_NAME ?? "Meteoric").trim();
  const now = BigInt(Math.floor(Date.now() / 1000));

  // 1. Global skill assessment config (required by the assessment flow)
  const globalConfig = {
    questionCount: 10,
    minPassPoints: 60,
    maxPoints: 100,
    levelThresholds: {
      beginner: 0,
      intermediate: 40,
      professional: 70,
      expert: 90,
    },
    maxAttempts: 3,
    cooldownHours: 24,
    attemptTimeoutMinutes: 60,
    isActive: true,
  };
  await prisma.skillAssessmentConfig.upsert({
    where: { skillName: GLOBAL_SKILL_CONFIG },
    update: { ...globalConfig, updatedAt: now },
    create: {
      skillName: GLOBAL_SKILL_CONFIG,
      ...globalConfig,
      createdAt: now,
      updatedAt: now,
    },
  });
  console.log("Global skill assessment config ready.");

  // 2. Education levels (used by profiles and job requirements)
  for (const { name, rank } of [
    { name: "No formal education", rank: 0 },
    { name: "Matric / Secondary (SSC)", rank: 10 },
    { name: "Intermediate / College (HSSC)", rank: 20 },
    { name: "High School Diploma", rank: 25 },
    { name: "Associate Degree", rank: 30 },
    { name: "Bachelor's Degree", rank: 40 },
    { name: "Master's Degree", rank: 50 },
    { name: "Doctorate / PhD", rank: 60 },
  ]) {
    const existing = await prisma.userEducationLevel.findFirst({
      where: { name },
    });
    if (!existing) await prisma.userEducationLevel.create({ data: { name, rank } });
    else if (existing.rank !== rank)
      await prisma.userEducationLevel.update({ where: { id: existing.id }, data: { rank } });
  }
  console.log("Education levels ready.");

  // 3. Organization settings (singleton row)
  const org = await prisma.organizationSettings.findFirst();
  if (org) {
    await prisma.organizationSettings.update({
      where: { id: org.id },
      data: { name: orgName, updatedAt: now },
    });
  } else {
    await prisma.organizationSettings.create({
      data: { name: orgName, updatedAt: now },
    });
  }
  console.log(`Organization "${orgName}" ready.`);

  // 4. Admin user
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (admin) {
    console.log(`Admin already exists (${admin.email}); left unchanged.`);
  } else {
    await prisma.user.create({
      data: {
        role: "ADMIN",
        userStatus: "ACTIVE",
        username: adminUsername,
        email: adminEmail,
        password: await bcrypt.hash(adminPassword, 10),
        firstname: "System",
        lastname: "Administrator",
        createdAt: now,
        updatedAt: now,
      },
    });
    console.log(`Admin created: ${adminEmail}`);
    if (!process.env.ADMIN_PASSWORD) {
      console.warn("Using the default admin password. Change it after first login.");
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
