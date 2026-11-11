import {
  isValidVanityPrefix,
  privateKeyToAddress,
  privateKeyToWif,
  randomPrivateKey,
} from './btc'

export type WorkerInMessage =
  | { type: 'start'; prefix: string }
  | { type: 'stop' }

export type WorkerOutMessage =
  | { type: 'progress'; attempts: number; rate: number }
  | {
      type: 'found'
      address: string
      wif: string
      attempts: number
      elapsedMs: number
    }
  | { type: 'error'; message: string }
  | { type: 'stopped' }

let running = false
let runId = 0

self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data
  if (msg.type === 'stop') {
    running = false
    runId += 1
    const out: WorkerOutMessage = { type: 'stopped' }
    self.postMessage(out)
    return
  }

  if (msg.type === 'start') {
    running = false
    runId += 1
    const currentId = runId
    void startSearch(msg.prefix, currentId)
  }
}

async function startSearch(prefix: string, currentId: number): Promise<void> {
  if (!isValidVanityPrefix(prefix)) {
    const out: WorkerOutMessage = {
      type: 'error',
      message: `Invalid prefix "${prefix}". Use Base58 characters only (no 0, O, I, l).`,
    }
    self.postMessage(out)
    return
  }

  running = true
  const started = performance.now()
  let attempts = 0
  let lastReport = started
  let attemptsAtReport = 0

  // Small batches + real event-loop yield so STOP can land quickly.
  const BATCH = 32

  while (running && currentId === runId) {
    for (let i = 0; i < BATCH; i++) {
      if (!running || currentId !== runId) break
      attempts++
      const priv = randomPrivateKey()
      const address = privateKeyToAddress(priv)
      if (address.startsWith(prefix)) {
        const out: WorkerOutMessage = {
          type: 'found',
          address,
          wif: privateKeyToWif(priv),
          attempts,
          elapsedMs: performance.now() - started,
        }
        self.postMessage(out)
        running = false
        return
      }
    }

    if (!running || currentId !== runId) break

    const now = performance.now()
    if (now - lastReport >= 120) {
      const dt = (now - lastReport) / 1000
      const rate = dt > 0 ? (attempts - attemptsAtReport) / dt : 0
      const out: WorkerOutMessage = { type: 'progress', attempts, rate }
      self.postMessage(out)
      lastReport = now
      attemptsAtReport = attempts
    }

    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }
}
