import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TEST_USERS = [
  { id: 'temp-user-id', email: 'dev@invested.local', name: 'Dev User', portfolioId: 'temp-portfolio-id', accountNumber: 'IED-temp-user' },
  { id: 'user-a', email: 'user-a@invested.local', name: 'Test User A', portfolioId: 'portfolio-user-a', accountNumber: 'IED-user-a' },
  { id: 'user-b', email: 'user-b@invested.local', name: 'Test User B', portfolioId: 'portfolio-user-b', accountNumber: 'IED-user-b' },
]

async function main() {
  for (const u of TEST_USERS) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id,
        email: u.email,
        name: u.name,
        accountNumber: u.accountNumber
      },
    })
    await prisma.portfolio.upsert({
      where: { id: u.portfolioId },
      update: {},
      create: { id: u.portfolioId, userId: u.id, name: 'My Portfolio', cashBalance: 100000 },
    })
    console.log(`Seeded user: ${u.id} with portfolio: ${u.portfolioId}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
