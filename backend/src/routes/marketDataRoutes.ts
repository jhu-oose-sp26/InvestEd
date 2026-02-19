/**
 * Market Data Routes
 * 
 * TODO: Register market data endpoints and WebSocket
 * - GET /api/market/:ticker - Get current price
 * - WebSocket /ws/market/:ticker - Subscribe to price updates
 */

import { FastifyInstance } from 'fastify'

export async function marketDataRoutes(fastify: FastifyInstance) {
  // TODO: Register REST endpoint for current price
  // fastify.get('/api/market/:ticker', async (request, reply) => {
  //   // Return current price
  // })

  // TODO: Register WebSocket endpoint for real-time updates
  // fastify.get('/ws/market/:ticker', { websocket: true }, (connection, req) => {
  //   // Subscribe to price ticks
  //   // Send updates to client
  // })
}

