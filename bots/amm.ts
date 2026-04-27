import { prisma } from '../src/lib/prisma'
import { limitOrderService } from '../src/features/trading/LimitOrderService'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

// Configuration
const BOT_EMAIL = 'bot@invested.com'
const INITIAL_CASH = 10000000 // $10M

const DEFAULT_MID = 0.50
const DEFAULT_SPREAD = 0.10
const ORDER_SIZE = 100
const MAX_PRICE = 0.99
const MIN_PRICE = 0.01

interface Market {
  id: string
  title: string
}

interface Order {
  id: string
  side: string
  limitPrice: number | string
  status: string
  userId: string
  quantity: number
}

interface BotClient {
  setup(): Promise<void>
  getOpenMarkets(): Promise<Market[]>
  getOrderBook(marketId: string): Promise<{ bids: any[], asks: any[] }>
  getBotPosition(marketId: string): Promise<{ yesQuantity: number, noQuantity: number }>
  getBotOpenOrders(marketId: string): Promise<Order[]>
  placeOrder(marketId: string, side: 'YES' | 'NO', price: number, quantity: number): Promise<void>
  cancelOrder(orderId: string): Promise<void>
  getLastFill(marketId: string): Promise<number | null>
}

let customPrismaClient: any = null

class PrismaBotClient implements BotClient {
  private botId: string = ''
  private prismaClient: any

  constructor(databaseUrl?: string) {
    if (databaseUrl) {
      if (!customPrismaClient) {
        console.log('Bot connecting to PRODUCTION database...')
        const { PrismaClient } = require('@prisma/client')
        customPrismaClient = new PrismaClient({
          datasources: {
            db: {
              url: databaseUrl,
            },
          },
        })
      }
      this.prismaClient = customPrismaClient
    } else {
      this.prismaClient = prisma
    }
  }

  async setup() {
    let bot = await this.prismaClient.user.findUnique({ where: { email: BOT_EMAIL } })
    if (!bot) {
      bot = await this.prismaClient.user.create({
        data: {
          email: BOT_EMAIL,
          username: 'AMMBot',
          name: 'Automated Market Maker',
          accountNumber: `BOT-${Date.now()}`,
          portfolios: { create: { name: 'Market Maker Portfolio', cashBalance: INITIAL_CASH } }
        }
      })
    }
    this.botId = bot.id
  }

  async getOpenMarkets() {
    return this.prismaClient.market.findMany({ where: { status: 'OPEN' }, select: { id: true, title: true } })
  }

  async getOrderBook(marketId: string) {
    const orders = await this.prismaClient.limitOrder.findMany({
      where: { marketId, status: 'OPEN', userId: { not: this.botId } }
    })
    return {
      bids: orders.filter((o: any) => o.side === 'YES').map((o: any) => ({ limitPrice: Number(o.limitPrice) })),
      asks: orders.filter((o: any) => o.side === 'NO').map((o: any) => ({ limitPrice: Number(o.limitPrice) }))
    }
  }

  async getBotPosition(marketId: string) {
    const pos = await this.prismaClient.marketPosition.findUnique({
      where: { userId_marketId: { userId: this.botId, marketId } }
    })
    return { yesQuantity: pos?.yesQuantity || 0, noQuantity: pos?.noQuantity || 0 }
  }

  async getBotOpenOrders(marketId: string) {
    const orders = await this.prismaClient.limitOrder.findMany({
      where: { userId: this.botId, marketId, status: 'OPEN' }
    })
    return orders.map((o: any) => ({ ...o, limitPrice: Number(o.limitPrice) }))
  }

  async placeOrder(marketId: string, side: 'YES' | 'NO', price: number, quantity: number) {
    await this.prismaClient.limitOrder.create({
      data: {
        userId: this.botId,
        marketId,
        side,
        orderType: 'LIMIT',
        limitPrice: price,
        quantity,
        status: 'OPEN'
      }
    })
  }

  async cancelOrder(orderId: string) {
    await this.prismaClient.limitOrder.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' }
    })
  }

  async getLastFill(marketId: string) {
    const lastFill = await this.prismaClient.limitOrder.findFirst({
      where: { 
        marketId, 
        status: 'FILLED',
        NOT: [
          { limitPrice: 0.99 },
          { limitPrice: 0.01 }
        ]
      },
      orderBy: { filledAt: 'desc' }
    })
    return lastFill ? Number(lastFill.limitPrice) : null
  }
}

class HttpBotClient implements BotClient {
  private baseUrl: string
  private secret: string

  constructor(baseUrl: string, secret: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    this.secret = secret
  }

  private get headers() {
    return { Authorization: `Bearer ${this.secret}` }
  }

  async setup() {
    console.log(`Bot addressing production at: ${this.baseUrl}`)
  }

  async getOpenMarkets() {
    const res = await axios.get(`${this.baseUrl}/api/markets?status=OPEN`)
    return res.data.markets
  }

  async getOrderBook(marketId: string) {
    const res = await axios.get(`${this.baseUrl}/api/order-book?marketId=${marketId}`)
    // Map yesBids/noBids to bids/asks and ensure price is mapped to limitPrice for compatibility
    return {
      bids: res.data.yesBids.map((b: any) => ({ limitPrice: b.price })),
      asks: res.data.noBids.map((b: any) => ({ limitPrice: b.price }))
    }
  }

  async getBotPosition(marketId: string) {
    const res = await axios.get(`${this.baseUrl}/api/market-positions`, { headers: this.headers })
    const pos = res.data.positions.find((p: any) => p.marketId === marketId)
    return { yesQuantity: pos?.yesQuantity || 0, noQuantity: pos?.noQuantity || 0 }
  }

  async getBotOpenOrders(marketId: string) {
    const res = await axios.get(`${this.baseUrl}/api/limit-orders`, { headers: this.headers })
    return res.data.orders.filter((o: any) => o.marketId === marketId && o.status === 'OPEN')
  }

  async placeOrder(marketId: string, side: 'YES' | 'NO', price: number, quantity: number) {
    await axios.post(`${this.baseUrl}/api/limit-orders`, {
      marketId, side, orderType: 'LIMIT', limitPrice: price, quantity
    }, { headers: this.headers })
  }

  async cancelOrder(orderId: string) {
    await axios.delete(`${this.baseUrl}/api/limit-orders`, {
      data: { orderId },
      headers: this.headers
    })
  }

  async getLastFill(marketId: string) {
    const res = await axios.get(`${this.baseUrl}/api/order-book?marketId=${marketId}`)
    // If the lastPrice from the API is a sweep price, we might need a better source,
    // but for now, we'll just return it and let the bot logic handle it.
    // Ideally, the order-book API itself should be filtered, but we are adjusting the bot only.
    const price = res.data.lastPrice
    if (price === 0.99 || price === 0.01) return null
    return price || null
  }
}

function formatPrice(p: number): number {
  return Math.max(0.01, Math.min(0.99, Math.round(p * 100) / 100))
}

export async function runMarketMaker() {
  console.log('Starting AMM cycle...')

  const productionUrl = process.env.PRODUCTION_URL
  const prodDatabaseUrl = process.env.PROD_DATABASE_URL
  const useProd = process.argv.includes('--prod')
  const cronSecret = process.env.CRON_SECRET || ''

  let client: BotClient
  if (useProd && prodDatabaseUrl) {
    client = new PrismaBotClient(prodDatabaseUrl)
  } else if (productionUrl) {
    client = new HttpBotClient(productionUrl, cronSecret)
  } else {
    client = new PrismaBotClient()
  }

  await client.setup()
  const openMarkets = await client.getOpenMarkets()
  console.log(`Found ${openMarkets.length} open markets.`)

  for (const market of openMarkets) {
    try {
      console.log(`\nProcessing market: ${market.id} - ${market.title}`)

      // 1. Fetch existing bot orders
      const existingOrders = await client.getBotOpenOrders(market.id)

      // 2. Fetch order book
      const book = await client.getOrderBook(market.id)
      const userBids = book.bids.map((o: any) => Number(o.limitPrice)).sort((a: number, b: number) => b - a)
      const userAsks = book.asks.map((o: any) => Number(o.limitPrice)).sort((a: number, b: number) => a - b)

      const highestUserBid = userBids.length > 0 ? userBids[0] : null
      const lowestUserAsk = userAsks.length > 0 ? userAsks[0] : null

      // 3. Mid-price and spread
      let baseMid = DEFAULT_MID
      let currentSpread = DEFAULT_SPREAD

      const lastFillPrice = await client.getLastFill(market.id)
      if (lastFillPrice) baseMid = lastFillPrice

      // 4. Skew (Removed per request)
      const { yesQuantity, noQuantity } = await client.getBotPosition(market.id)

      let adjustedMid = baseMid

      const minMid = MIN_PRICE + currentSpread / 2
      const maxMid = MAX_PRICE - currentSpread / 2
      adjustedMid = Math.max(minMid, Math.min(maxMid, adjustedMid))

      const bidPrice = formatPrice(adjustedMid - (currentSpread / 2))
      const askPrice = formatPrice(adjustedMid + (currentSpread / 2))

      console.log(`  Inventory -> YES: ${yesQuantity}, NO: ${noQuantity} (Ignored)`)
      console.log(`  Quoting   -> Bid: ${bidPrice}, Ask: ${askPrice}`)

      // 5. Reconcile orders
      let hasMatchingBid = false
      let hasMatchingAsk = false

      for (const order of existingOrders) {
        if (order.side === 'YES' && order.limitPrice === bidPrice && order.quantity === ORDER_SIZE && !hasMatchingBid) {
          hasMatchingBid = true
        } else if (order.side === 'NO' && order.limitPrice === askPrice && order.quantity === ORDER_SIZE && !hasMatchingAsk) {
          hasMatchingAsk = true
        } else {
          await client.cancelOrder(order.id)
        }
      }

      if (!hasMatchingBid) {
        await client.placeOrder(market.id, 'YES', bidPrice, ORDER_SIZE)
        console.log(`  Placed BID at ${bidPrice}`)
      } else {
        console.log(`  Kept existing BID at ${bidPrice}`)
      }

      if (!hasMatchingAsk) {
        await client.placeOrder(market.id, 'NO', askPrice, ORDER_SIZE)
        console.log(`  Placed ASK at ${askPrice}`)
      } else {
        console.log(`  Kept existing ASK at ${askPrice}`)
      }

    } catch (e) {
      console.error(`Error processing market ${market.id}:`, e)
    }
  }
  console.log('AMM cycle complete.\n')
}

if (require.main === module) {
  const loop = process.argv.includes('--loop')
  if (loop) {
    setInterval(runMarketMaker, 10000)
    runMarketMaker()
  } else {
    runMarketMaker().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); })
  }
}
