/**
 * Portfolio Controller
 * 
 * TODO: Implement portfolio endpoints
 * - GET /api/portfolio/:userId - Get portfolio metrics
 * - GET /api/leaderboard - Get leaderboard rankings
 * - GET /api/leaderboard/:groupId - Get group leaderboard
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { PortfolioService } from '../services/PortfolioService'

export class PortfolioController {
  constructor(private portfolioService: PortfolioService) {}

  /**
   * Get portfolio metrics for a user
   * GET /api/portfolio/:userId
   */
  async getPortfolio(
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply
  ) {
    // TODO: Call portfolioService.calculatePortfolioValue
    // TODO: Return portfolio metrics
    reply.code(501).send({ error: 'Not implemented' })
  }

  /**
   * Get leaderboard
   * GET /api/leaderboard?groupId=optional
   */
  async getLeaderboard(
    request: FastifyRequest<{ Querystring: { groupId?: string } }>,
    reply: FastifyReply
  ) {
    // TODO: Call portfolioService.calculateLeaderboard
    // TODO: Return ranked list
    reply.code(501).send({ error: 'Not implemented' })
  }
}

