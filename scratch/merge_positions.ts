import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

async function main() {
  const positions = await prisma.marketPosition.findMany({
    where: {
      yesQuantity: { gt: 0 },
      noQuantity: { gt: 0 }
    }
  })

  console.log(`Found ${positions.length} positions with both YES and NO shares.`)

  for (const pos of positions) {
    const matchedPairs = Math.min(pos.yesQuantity, pos.noQuantity)
    if (matchedPairs > 0) {
      console.log(`Merging ${matchedPairs} pairs for user ${pos.userId} in market ${pos.marketId}`)
      
      await prisma.$transaction(async (tx) => {
        // Refund cash
        const portfolio = await tx.portfolio.findFirstOrThrow({ where: { userId: pos.userId } })
        await tx.portfolio.update({
          where: { id: portfolio.id },
          data: { cashBalance: { increment: new Decimal(matchedPairs) } }
        })

        // Update position
        await tx.marketPosition.update({
          where: { id: pos.id },
          data: {
            yesQuantity: { decrement: matchedPairs },
            noQuantity: { decrement: matchedPairs }
          }
        })
      })
    }
  }

  console.log('Done merging positions.')
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
