const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();

  try {
    const hash = bcrypt.hashSync('123456', 10);

    const result = await prisma.student.updateMany({
      where: {
        OR: [{ passwordHash: null }, { passwordHash: '' }],
      },
      data: {
        passwordHash: hash,
        mustChangePassword: true,
      },
    });

    console.log('Students updated:', result.count);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
