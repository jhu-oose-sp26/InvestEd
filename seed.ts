import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {
      id: 'temp-user-id',
      name: 'Temp User'
    },
    create: {
      id: 'temp-user-id',
      email: 'test@example.com',
      name: 'Temp User'
    }
  })

  const portfolio = await prisma.portfolio.upsert({
    where: { id: 'temp-portfolio-id' },
    update: {
      userId: user.id,
      name: 'Temp Portfolio'
    },
    create: {
      id: 'temp-portfolio-id',
      userId: user.id,
      name: 'Temp Portfolio',
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
