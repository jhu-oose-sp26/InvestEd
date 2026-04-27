import { prisma } from '../src/lib/prisma'
import { limitOrderService } from '../src/features/trading/LimitOrderService'
import { Decimal } from '@prisma/client/runtime/library'

// Configuration
const BOT_EMAIL = 'bot@invested.com'
const BOT_USERNAME = 'AMMBot'
const BOT_NAME = 'Automated Market Maker'
const INITIAL_CASH = 10000000 // $10M

const DEFAULT_MID = 0.50
const DEFAULT_SPREAD = 0.10 // 10 cents default spread if book is empty
const MIN_SPREAD = 0.04 // Bot won't squeeze spread tighter than this
const SKEW_SENSITIVITY = 0.00005 // Each net share shifts price by $0.00005
const ORDER_SIZE = 100 // Shares to quote on each side
const MAX_PRICE = 0.95
const MIN_PRICE = 0.05

/**
 * Ensure the bot user exists and has a portfolio with sufficient cash.
 */
async function setupBotUser() {
  let bot = await prisma.user.findUnique({
    where: { email: BOT_EMAIL }
  })

  if (!bot) {
    console.log('Creating AMM bot user...')
    bot = await prisma.user.create({
      data: {
        email: BOT_EMAIL,
        username: BOT_USERNAME,
        name: BOT_NAME,
        accountNumber: `BOT-${Date.now()}`,
        portfolios: {
          create: {
            name: 'Market Maker Portfolio',
            cashBalance: INITIAL_CASH
          }
        }
      }
    })
    console.log(`Bot created with ID: ${bot.id}`)
  } else {
    // Ensure portfolio exists and has cash
    const portfolio = await prisma.portfolio.findFirst({
      where: { userId: bot.id }
    })
    if (!portfolio) {
      await prisma.portfolio.create({
        data: {
          userId: bot.id,
          name: 'Market Maker Portfolio',
          cashBalance: INITIAL_CASH
        }
      })
    } else if (Number(portfolio.cashBalance) < 10000) {
      // Top up if low
      await prisma.portfolio.update({
        where: { id: portfolio.id },
        data: { cashBalance: INITIAL_CASH }
      })
    }
  }

  return bot
}

/**
 * Format price to 2 decimal places safely (whole cents).
 */
function formatPrice(p: number): number {
  return Math.max(0.01, Math.min(0.99, Math.round(p * 100) / 100))
}

export async function runMarketMaker() {
  console.log('Starting Order Book Imbalance AMM cycle...')
  const bot = await setupBotUser()

  // Find all OPEN markets
  const openMarkets = await prisma.market.findMany({
    where: { status: 'OPEN' }
  })

  console.log(`Found ${openMarkets.length} open markets.`)

  for (const market of openMarkets) {
    try {
      console.log(`\nProcessing market: ${market.id} - ${market.title}`)
      
      // 1. Cancel existing bot orders to get clean state of user orders
      const existingOrders = await prisma.limitOrder.findMany({
        where: { userId: bot.id, marketId: market.id, status: 'OPEN' }
      })

      for (const order of existingOrders) {
        await limitOrderService.cancelOrder(order.id, bot.id)
      }

      // 2. Fetch user order book
      const userOrders = await prisma.limitOrder.findMany({
        where: { 
          marketId: market.id, 
          status: 'OPEN',
          userId: { not: bot.id }
        }
      })

      const userBids = userOrders
        .filter(o => o.side === 'YES')
        .map(o => Number(o.limitPrice))
        .sort((a, b) => b - a) // Highest bid first

      const userAsks = userOrders
        .filter(o => o.side === 'NO')
        .map(o => Number(o.limitPrice))
        .sort((a, b) => a - b) // Lowest ask first

      const highestUserBid = userBids.length > 0 ? userBids[0] : null
      const lowestUserAsk = userAsks.length > 0 ? userAsks[0] : null

      console.log(`  User Book -> Best Bid: ${highestUserBid ?? 'None'}, Best Ask: ${lowestUserAsk ?? 'None'}`)

      // 3. Determine base mid-price and spread
      let baseMid = DEFAULT_MID
      let currentSpread = DEFAULT_SPREAD

      const lastFill = await prisma.limitOrder.findFirst({
        where: { marketId: market.id, status: 'FILLED' },
        orderBy: { filledAt: 'desc' }
      })

      if (lastFill) {
        baseMid = Number(lastFill.limitPrice)
      }

      if (highestUserBid !== null && lowestUserAsk !== null) {
        // Both sides exist: tighten the user spread
        const userMid = (highestUserBid + lowestUserAsk) / 2
        baseMid = userMid
        const userSpread = lowestUserAsk - highestUserBid
        currentSpread = Math.max(MIN_SPREAD, userSpread * 0.8) // Provide 20% price improvement
      } else if (highestUserBid !== null) {
        // Only bids exist
        // If the market has moved up past our last traded price, anchor to the new bid
        if (baseMid <= highestUserBid) {
          baseMid = Math.min(MAX_PRICE, highestUserBid + (DEFAULT_SPREAD / 2))
        }
      } else if (lowestUserAsk !== null) {
        // Only asks exist
        // If the market has moved down past our last traded price, anchor to the new ask
        if (baseMid >= lowestUserAsk) {
          baseMid = Math.max(MIN_PRICE, lowestUserAsk - (DEFAULT_SPREAD / 2))
        }
      }

      // 4. Fetch bot inventory to calculate skew
      const position = await prisma.marketPosition.findUnique({
        where: { userId_marketId: { userId: bot.id, marketId: market.id } }
      })

      const yesQty = position?.yesQuantity || 0
      const noQty = position?.noQuantity || 0
      const netInventory = yesQty - noQty // Long YES if positive, Long NO if negative

      const skew = netInventory * SKEW_SENSITIVITY
      let adjustedMid = baseMid - skew

      // Constrain adjusted mid
      const minMid = MIN_PRICE + currentSpread / 2
      const maxMid = MAX_PRICE - currentSpread / 2
      if (adjustedMid < minMid) adjustedMid = minMid
      if (adjustedMid > maxMid) adjustedMid = maxMid

      const bidPrice = formatPrice(adjustedMid - (currentSpread / 2))
      const askPrice = formatPrice(adjustedMid + (currentSpread / 2))

      console.log(`  Inventory -> YES: ${yesQty}, NO: ${noQty} (Net: ${netInventory}, Skew: ${skew.toFixed(4)})`)
      console.log(`  Quoting   -> Mid: ${adjustedMid.toFixed(4)}, Bid: ${bidPrice}, Ask: ${askPrice}`)

      // 5. Place tightening orders
      // BID
      const bidResult = await limitOrderService.placeOrder({
        userId: bot.id,
        marketId: market.id,
        side: 'YES',
        orderType: 'LIMIT',
        limitPrice: bidPrice,
        quantity: ORDER_SIZE
      })

      if (!bidResult.success) console.error(`  Failed to place BID: ${bidResult.error}`)
      else console.log(`  Placed BID at ${bidPrice}`)

      // ASK
      const askResult = await limitOrderService.placeOrder({
        userId: bot.id,
        marketId: market.id,
        side: 'NO',
        orderType: 'LIMIT',
        limitPrice: askPrice,
        quantity: ORDER_SIZE
      })

      if (!askResult.success) console.error(`  Failed to place ASK: ${askResult.error}`)
      else console.log(`  Placed ASK at ${askPrice}`)

      // 6. Match orders in case our skew caused a cross with existing user orders
      const filled = await limitOrderService.matchOrders(market.id)
      if (filled > 0) {
        console.log(`  Matched ${filled} shares immediately!`)
      }

    } catch (e) {
      console.error(`Error processing market ${market.id}:`, e)
    }
  }

  console.log('AMM cycle complete.\n')
}

// If run directly
if (require.main === module) {
  const loop = process.argv.includes('--loop')

  if (loop) {
    console.log('Running in continuous mode...')
    setInterval(runMarketMaker, 10000)
    runMarketMaker()
  } else {
    runMarketMaker()
      .then(() => process.exit(0))
      .catch((e) => {
        console.error(e)
        process.exit(1)
      })
  }
}
