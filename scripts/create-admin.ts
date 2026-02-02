import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 🔧 Troque aqui se quiser
  const email = 'admin@local.com';
  const password = 'Admin@123';
  const fullName = 'Administrador';
  const role = 'ADMIN'; // se o seu enum/role usar outro valor, me diga

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      fullName,
      role,
      isActive: true,
      passwordHash,
    },
    create: {
      email,
      fullName,
      role,
      isActive: true,
      passwordHash,
    },
  });

  console.log('✅ Admin criado/atualizado com sucesso:');
  console.log({ id: user.id, email: user.email, role: user.role });
  console.log('🔑 Login:');
  console.log({ email, password });
}

main()
  .catch((e) => {
    console.error('❌ Erro ao criar admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
