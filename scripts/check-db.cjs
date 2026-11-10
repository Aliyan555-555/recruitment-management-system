const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, username: true, role: true, userStatus: true },
    take: 10
  });
  console.log("Users in DB:", users);

  const jobs = await prisma.job.findMany({
    select: { id: true, title: true, jobType: true },
    take: 10
  });
  console.log("Jobs in DB:", jobs);

  await prisma.$disconnect();
}

check().catch(console.error);

