import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {
      id: 'dev-user-01',
      name: 'Dev User',
    },
    create: {
      id: 'dev-user-01',
      email: 'test@example.com',
      name: 'Dev User',
      accountNumber: 'IED-DEV-USER',
    },
  })

  const portfolio = await prisma.portfolio.upsert({
    where: { id: 'portfolio-dev-01' },
    update: {
      userId: user.id,
      name: 'Dev Portfolio'
    },
    create: {
      id: 'portfolio-dev-01',
      userId: user.id,
      name: 'Dev Portfolio',
      cashBalance: 100000.00
    }
  })

  console.log('Seeded:', { user, portfolio })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
