/**
 * InvestEd Backend - Main Entry Point
 * 
 * TODO: Initialize Fastify server
 * - Set up CORS
 * - Register routes
 * - Set up WebSocket support for real-time market data
 * - Connect to PostgreSQL via Prisma
 * - Add error handling middleware
 * - Add request logging
 */

import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'

const fastify = Fastify({
  logger: true
})

async function build() {
  // TODO: Register CORS
  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000'
  })

  // TODO: Register WebSocket support
  await fastify.register(websocket)

  // TODO: Register routes
  // await fastify.register(portfolioRoutes)
  // await fastify.register(tradeRoutes)
  // await fastify.register(marketDataRoutes)
  // await fastify.register(leaderboardRoutes)

  return fastify
}

async function start() {
  try {
    const server = await build()
    const port = parseInt(process.env.PORT || '3001', 10)
    const host = process.env.HOST || '0.0.0.0'
    
    await server.listen({ port, host })
    console.log(`Server listening on ${host}:${port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()

