---
url: https://huggingface.co/blog/transformersjs-v3
title: Transformers.js v3 — WebGPU Support, New Models & Tasks
fetched: 2026-04-08
query: transformers.js whisper browser tutorial webgpu 2026
relevance: high
notes: The canonical reference for browser Whisper. Transformers.js v3+ is the library we'll use for voice mode phase 1. As of Feb 2026 there's a v4 with further speedups (3-10x over v3).
---

# Transformers.js v3 — Key Details for Our Use

## Installation & Import

**CDN (no build step needed — good for our prototype):**
```javascript
import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0";
```

**NPM:**
```bash
npm i @huggingface/transformers
```

## Speech Recognition Pipeline

```javascript
import { pipeline } from "@huggingface/transformers";

const transcriber = await pipeline(
  "automatic-speech-recognition",
  "onnx-community/whisper-tiny.en",  // or whisper-base, whisper-small, etc
  { device: "webgpu" }
);

const url = "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav";
const output = await transcriber(url);
// → { text: ' And so my fellow Americans ask not what your country can do for you...' }
```

The transcriber accepts a URL, Blob, or Float32Array of audio samples (16kHz mono).

## Device option

- `device: "webgpu"` — GPU-accelerated. Up to 100x faster than WASM.
- Auto-fallback to WASM if WebGPU isn't available.
- WebGPU is supported in Chrome 113+, Firefox, Edge, and **Safari 26 (iOS 26)** as of late 2025.

## Quantization (dtype) options

- `"fp32"` — full precision (biggest, slowest, most accurate)
- `"fp16"` — half precision
- `"q8"` — 8-bit quantized (~halves size)
- `"q4"` — 4-bit quantized (~quarters size, some accuracy loss)
- `"q4f16"` — 4-bit weights, fp16 activations (good balance)

```javascript
const model = await pipeline(
  "automatic-speech-recognition",
  "onnx-community/whisper-base",
  { dtype: "q4f16", device: "webgpu" }
);
```

## Model size reference (Whisper, approximate)

| Model | Params | fp32 size | q4 size | Notes |
|---|---|---|---|---|
| whisper-tiny | 39M | ~150 MB | ~40 MB | Fast, lower accuracy |
| whisper-base | 74M | ~290 MB | ~75 MB | Good balance |
| whisper-small | 244M | ~970 MB | ~250 MB | Much better accuracy |
| whisper-medium | 769M | ~3 GB | ~770 MB | Too heavy for browser |

For our prototype: **whisper-base with q4 quantization** — ~75 MB download, runs on most M-series Macs at real-time or faster via WebGPU. Good enough for a couch-mode voice journal.

## Notes for our use

- First-use model download is the biggest UX friction — budget ~75 MB + patience. Cache after that.
- Transformers.js caches models in the browser's Cache API, so subsequent sessions load from disk in ~seconds.
- The `.en` variants are English-only and smaller/faster. Since the user writes in English+German, use the multilingual variants (no `.en` suffix).
