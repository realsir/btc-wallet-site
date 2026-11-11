import { expectedAttempts, isValidVanityPrefix } from './btc'

export type VanityPreset = {
  id: string
  label: string
  prefix: string
}

const RAW_PRESETS: VanityPreset[] = [
  { id: 'btc', label: '1BTC…', prefix: '1BTC' },
  { id: 'sat', label: '1SAT…', prefix: '1SAT' },
  { id: 'key', label: '1KEY…', prefix: '1KEY' },
  { id: 'gen', label: '1GEN…', prefix: '1GEN' },
  { id: 'cat', label: '1CAT…', prefix: '1CAT' },
  { id: 'xxx', label: '1XXX…', prefix: '1XXX' },
  { id: 'mew', label: '1MEW…', prefix: '1MEW' },
  { id: 'nah', label: '1NAH…', prefix: '1NAH' },
  { id: 'huh', label: '1HUH…', prefix: '1HUH' },
  { id: 'hah', label: '1HAH…', prefix: '1HAH' },
  { id: 'fck', label: '1FCK…', prefix: '1FCK' },
  { id: 'wtf', label: '1WTF…', prefix: '1WTF' },
  { id: 'gay', label: '1GAY…', prefix: '1GAY' },
  { id: 'gem', label: '1GEM…', prefix: '1GEM' },
  { id: 'eth', label: '1ETH…', prefix: '1ETH' },
  { id: 'rar', label: '1RAR…', prefix: '1RAR' },
  { id: 'kal', label: '1KAL…', prefix: '1KAL' },
  { id: 'lev', label: '1LEV…', prefix: '1LEV' },
  { id: 'why', label: '1WHY…', prefix: '1WHY' },
  { id: 'wen', label: '1WEN…', prefix: '1WEN' },
]

/** Bitcoin Base58 only — prefixes with 0/O/I/l can never match a real address. */
export const PRESETS: VanityPreset[] = RAW_PRESETS.filter((p) =>
  isValidVanityPrefix(p.prefix),
)

export function formatEta(prefix: string, keysPerSec: number): string {
  const expected = expectedAttempts(prefix)
  if (keysPerSec <= 0) return 'estimating…'
  const seconds = expected / keysPerSec
  if (seconds < 2) return 'usually under a second'
  if (seconds < 60) return `~${Math.round(seconds)}s average`
  if (seconds < 3600) return `~${Math.round(seconds / 60)} min average`
  return `~${(seconds / 3600).toFixed(1)} h average`
}

export function formatCount(n: number): string {
  return n.toLocaleString('en-US')
}
