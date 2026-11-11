import './style.css'
import { PRESETS, formatCount, formatEta } from './presets'
import type { WorkerInMessage, WorkerOutMessage } from './vanityWorker'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <div class="space" aria-hidden="true">
    <div class="space-fade"></div>
    <div class="grid-ceiling"></div>
    <div class="grid-floor"></div>
    <div class="vanishing"></div>
  </div>
  <div class="scanlines" aria-hidden="true"></div>
  <main class="stage">
    <header class="brand">
      <h1 class="brand-name">BTC...adress</h1>
    </header>

    <div class="monitor" aria-label="Retro desktop monitor">
      <div class="monitor-bezel">
        <div class="monitor-inner">
          <div class="crt-glass">
            <section class="console" aria-label="Vanity generator console">
              <div class="console-body">
                <div class="row">
                  <span class="prompt" id="pattern-label">&gt; pattern</span>
                  <div class="menu" id="pattern-menu">
                    <button
                      id="pattern-trigger"
                      class="menu-trigger"
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded="false"
                      aria-labelledby="pattern-label pattern-trigger"
                    >
                      <span id="pattern-value">${PRESETS[0].label}</span>
                      <span class="menu-caret" aria-hidden="true">▼</span>
                    </button>
                    <ul
                      id="pattern-list"
                      class="menu-list"
                      role="listbox"
                      aria-labelledby="pattern-label"
                      hidden
                    >
                      ${PRESETS.map(
                        (p, i) =>
                          `<li role="option" class="menu-option${i === 0 ? ' selected' : ''}" data-prefix="${p.prefix}" data-label="${p.label}" aria-selected="${i === 0 ? 'true' : 'false'}">${p.label}</li>`,
                      ).join('')}
                    </ul>
                    <input type="hidden" id="pattern" value="${PRESETS[0].prefix}" />
                  </div>
                </div>

                <div class="row actions">
                  <button id="generate" class="btn primary" type="button">Generate</button>
                  <button id="stop" class="btn ghost" type="button" disabled>Stop</button>
                </div>

                <pre id="log" class="log" aria-live="polite">&gt; Ready. Select a pattern and press Generate.
&gt; Generation runs entirely on this device.</pre>

                <div id="result" class="result hidden">
                  <div class="field">
                    <span class="label">Address</span>
                    <button id="address" class="value copyable" type="button" title="Click to copy"></button>
                  </div>
                  <div class="field">
                    <span class="label">Private key (WIF)</span>
                    <button id="wif" class="value copyable masked" type="button" title="Click to reveal"></button>
                  </div>
                  <p class="warn">Never share your private key. Anyone with it can spend your bitcoin.</p>
                </div>
              </div>
            </section>
          </div>
          <div class="monitor-led" aria-hidden="true"></div>
        </div>
      </div>
      <div class="monitor-neck" aria-hidden="true"></div>
      <div class="monitor-base" aria-hidden="true"></div>
    </div>

    <footer class="foot">
      <button id="policy-btn" class="btn link" type="button">Security Policy</button>
      <a
        id="contact-btn"
        class="btn link"
        href="https://x.com/realsirandrew"
        target="_blank"
        rel="noopener noreferrer"
      >Contact</a>
    </footer>
  </main>

  <div id="policy-modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="policy-title">
    <div class="modal-backdrop" data-close-modal></div>
    <div class="modal-panel">
      <div class="modal-chrome">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        <span class="console-title">security-policy.txt</span>
        <button class="modal-close" type="button" data-close-modal aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        <h2 id="policy-title">Security Policy</h2>
        <p>
          This website generates random Bitcoin vanity wallets entirely in your browser.
          Private keys are created locally on your device using cryptographically secure randomness.
        </p>
        <p>
          We do not store, transmit, log, or have access to any generated private keys,
          wallet addresses, or related key material. Nothing from the generation process
          is saved on our servers.
        </p>
        <p>
          You are solely responsible for safeguarding any private key you generate and reveal.
          If your funds are lost, stolen, compromised, or inaccessible in the future for any reason —
          including phishing, malware, device theft, accidental disclosure, or third-party attacks —
          this website and its operators accept no liability.
        </p>
        <p>
          Use this tool at your own risk. Always verify you are on the correct website,
          keep your private keys offline and secret, and never share them with anyone.
        </p>
      </div>
    </div>
  </div>
`

const patternEl = document.querySelector<HTMLInputElement>('#pattern')!
const patternTrigger = document.querySelector<HTMLButtonElement>('#pattern-trigger')!
const patternValue = document.querySelector<HTMLSpanElement>('#pattern-value')!
const patternList = document.querySelector<HTMLUListElement>('#pattern-list')!
const patternMenu = document.querySelector<HTMLDivElement>('#pattern-menu')!
const generateBtn = document.querySelector<HTMLButtonElement>('#generate')!
const stopBtn = document.querySelector<HTMLButtonElement>('#stop')!
const logEl = document.querySelector<HTMLPreElement>('#log')!
const resultEl = document.querySelector<HTMLDivElement>('#result')!
const addressBtn = document.querySelector<HTMLButtonElement>('#address')!
const wifBtn = document.querySelector<HTMLButtonElement>('#wif')!

let worker: Worker | null = null
let revealed = false
let currentWif = ''
let lastRate = 0
let menuOpen = false
let menuDisabled = false

function setMenuOpen(open: boolean) {
  if (menuDisabled && open) return
  menuOpen = open
  patternTrigger.setAttribute('aria-expanded', String(open))
  patternList.hidden = !open
  patternMenu.classList.toggle('open', open)
}

function selectPrefix(prefix: string, label: string) {
  patternEl.value = prefix
  patternValue.textContent = label
  patternList.querySelectorAll<HTMLLIElement>('.menu-option').forEach((opt) => {
    const selected = opt.dataset.prefix === prefix
    opt.classList.toggle('selected', selected)
    opt.setAttribute('aria-selected', String(selected))
  })
  setMenuOpen(false)
}

patternTrigger.addEventListener('click', (event) => {
  event.stopPropagation()
  setMenuOpen(!menuOpen)
})

patternList.addEventListener('click', (event) => {
  const option = (event.target as HTMLElement).closest<HTMLLIElement>('.menu-option')
  if (!option || !option.dataset.prefix || !option.dataset.label) return
  selectPrefix(option.dataset.prefix, option.dataset.label)
})

document.addEventListener('click', (event) => {
  if (!menuOpen) return
  if (!patternMenu.contains(event.target as Node)) setMenuOpen(false)
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuOpen) setMenuOpen(false)
})

function ensureWorker(): Worker {
  if (worker) return worker
  worker = new Worker(new URL('./vanityWorker.ts', import.meta.url), {
    type: 'module',
  })
  worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
    const msg = event.data
    if (msg.type === 'progress') {
      lastRate = msg.rate
      const prefix = patternEl.value
      setLog(
        `> Searching for ${prefix}…\n> Tried ${formatCount(msg.attempts)} keys · ${formatCount(Math.round(msg.rate))} keys/s\n> ETA ${formatEta(prefix, msg.rate)}`,
      )
      return
    }
    if (msg.type === 'found') {
      setBusy(false)
      setLog(
        `> Found after ${formatCount(msg.attempts)} keys in ${(msg.elapsedMs / 1000).toFixed(2)}s\n> Address ready. Click the stars to reveal the private key.`,
      )
      showResult(msg.address, msg.wif)
      return
    }
    if (msg.type === 'error') {
      setBusy(false)
      setLog(`> ERROR: ${msg.message}`)
      return
    }
    if (msg.type === 'stopped') {
      setBusy(false)
      setLog('> Stopped.')
    }
  }
  worker.onerror = (err) => {
    setBusy(false)
    setLog(`> Worker error: ${err.message}`)
  }
  return worker
}

function setLog(text: string) {
  logEl.textContent = text
}

function setBusy(busy: boolean) {
  generateBtn.disabled = busy
  stopBtn.disabled = !busy
  menuDisabled = busy
  patternTrigger.disabled = busy
  if (busy) setMenuOpen(false)
}

function maskWif(wif: string): string {
  return '*'.repeat(Math.min(wif.length, 52))
}

function showResult(address: string, wif: string) {
  currentWif = wif
  revealed = false
  resultEl.classList.remove('hidden')
  addressBtn.textContent = address
  wifBtn.textContent = maskWif(wif)
  wifBtn.classList.add('masked')
  wifBtn.title = 'Click to reveal'
}

function post(msg: WorkerInMessage) {
  ensureWorker().postMessage(msg)
}

generateBtn.addEventListener('click', () => {
  const prefix = patternEl.value
  resultEl.classList.add('hidden')
  currentWif = ''
  revealed = false
  setBusy(true)
  const eta = formatEta(prefix, lastRate || 800)
  setLog(
    `> Booting local miner…\n> Target prefix: ${prefix}\n> Expected ~${formatCount(Math.pow(58, prefix.length - 1))} tries (${eta})`,
  )
  post({ type: 'start', prefix })
})

stopBtn.addEventListener('click', () => {
  post({ type: 'stop' })
})

addressBtn.addEventListener('click', async () => {
  const text = addressBtn.textContent ?? ''
  if (!text) return
  await copy(text)
  flash(addressBtn, 'Copied address')
})

wifBtn.addEventListener('click', async () => {
  if (!currentWif) return
  if (!revealed) {
    revealed = true
    wifBtn.textContent = currentWif
    wifBtn.classList.remove('masked')
    wifBtn.title = 'Click to copy'
    return
  }
  await copy(currentWif)
  flash(wifBtn, 'Copied private key')
})

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
}

function flash(el: HTMLElement, note: string) {
  const prev = el.dataset.note
  el.dataset.note = note
  el.classList.add('flash')
  window.setTimeout(() => {
    el.classList.remove('flash')
    if (prev) el.dataset.note = prev
    else delete el.dataset.note
  }, 900)
}

const policyModal = document.querySelector<HTMLDivElement>('#policy-modal')!
const policyBtn = document.querySelector<HTMLButtonElement>('#policy-btn')!

function openPolicy() {
  policyModal.classList.remove('hidden')
  document.body.classList.add('modal-open')
}

function closePolicy() {
  policyModal.classList.add('hidden')
  document.body.classList.remove('modal-open')
}

policyBtn.addEventListener('click', openPolicy)
policyModal.querySelectorAll('[data-close-modal]').forEach((el) => {
  el.addEventListener('click', closePolicy)
})
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !policyModal.classList.contains('hidden')) {
    closePolicy()
  }
})
