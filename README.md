# BTC Vanity Desk

Browser-only Bitcoin vanity address generator (early-Bitcoin / console aesthetic).

## Features

- Preset prefixes: `1BTC`, `1LOVE`, `1HODL`, `1MOON`, `1SAT`, `1COIN`
- Generation runs in a Web Worker with `crypto.getRandomValues` entropy
- Public address shown immediately; private key (compressed WIF) masked until clicked
- English UI; orange Bitcoin styling

## Security model

- No backend. Private keys are created and displayed only in your browser.
- Parallel users do not share state — each session is independent CSPRNG entropy.
- Collision chance across users is negligible (~2⁻²⁵⁶ keyspace).

## Run

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

## Notes

Longer prefixes grow exponentially harder (~58× per Base58 character after the leading `1`). Presets stay in the 3–4 character range so browser generation stays practical.
