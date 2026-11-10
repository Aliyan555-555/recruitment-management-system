const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function checkAdmin() {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" }
  });
  console.log("Found admins in DB:", admins.map(a => ({ id: a.id.toString(), email: a.email, username: a.username, userStatus: a.userStatus })));
  
  if (admins.length > 0) {
    const admin = admins[0];
    const match = await bcrypt.compare("Admin123!", admin.password);
    console.log(`Password 'Admin123!' matches admin ${admin.email}:`, match);
  }
}

checkAdmin().finally(() => prisma.$disconnect());

