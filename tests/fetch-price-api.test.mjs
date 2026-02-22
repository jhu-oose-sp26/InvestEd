import test from 'node:test'
import assert from 'node:assert/strict'
import { before, after } from 'node:test'
import { spawn } from 'node:child_process'

const baseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001'
let serverProcess = null

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function serverReachable() {
  try {
    const response = await fetch(`${baseUrl}/`)
    return response.status > 0
  } catch {
    return false
  }
}

async function waitForServer(timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await serverReachable()) return
    await sleep(500)
  }
  throw new Error(`Server did not become ready at ${baseUrl} within ${timeoutMs}ms`)
}

before(async () => {
  if (await serverReachable()) return

  serverProcess = spawn(
    'npm',
    ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', '3001'],
    { stdio: 'ignore' }
  )

  await waitForServer()
})

after(async () => {
  if (!serverProcess) return
  serverProcess.kill('SIGINT')
})

test('GET /api/quote returns latest AAPL quote with close price > 200', async () => {
  const response = await fetch(`${baseUrl}/api/quote?symbol=AAPL`)

  assert.equal(response.status, 200, `Expected 200, got ${response.status}`)

  const body = await response.json()
  assert.equal(body.symbol, 'AAPL')
  assert.equal(typeof body.price, 'number')
  assert.ok(body.price > 200, `Expected AAPL close price > 200, got ${body.price}`)
  assert.equal(typeof body.timestamp, 'number')
  assert.ok(body.timestamp > 0)
})
