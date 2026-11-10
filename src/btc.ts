import { sha256 } from '@noble/hashes/sha2.js'
import { ripemd160 } from '@noble/hashes/legacy.js'
import * as secp from '@noble/secp256k1'
import bs58check from 'bs58check'

/** Bitcoin Base58 alphabet (no 0, O, I, l). */
export const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export function isValidVanityPrefix(prefix: string): boolean {
  if (!prefix.startsWith('1') || prefix.length < 2) return false
  for (const ch of prefix) {
    if (!BASE58.includes(ch)) return false
  }
  return true
}

export function privateKeyToAddress(priv: Uint8Array): string {
  const pub = secp.getPublicKey(priv, true)
  const payload = new Uint8Array(21)
  payload[0] = 0x00
  payload.set(ripemd160(sha256(pub)), 1)
  return bs58check.encode(payload)
}

/** Compressed WIF for mainnet. */
export function privateKeyToWif(priv: Uint8Array): string {
  const payload = new Uint8Array(34)
  payload[0] = 0x80
  payload.set(priv, 1)
  payload[33] = 0x01
  return bs58check.encode(payload)
}

export function randomPrivateKey(): Uint8Array {
  return secp.utils.randomSecretKey()
}

/** Rough expected attempts for a case-sensitive Base58 prefix after the leading 1. */
export function expectedAttempts(prefix: string): number {
  const chars = Math.max(0, prefix.length - 1)
  return Math.pow(58, chars)
}
