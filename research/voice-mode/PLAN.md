# Research plan: browser-based voice capture + LLM clarifier

## Core question
What's the best stack for a browser-only voice journaling prototype that:
1. Records audio from the mic
2. Transcribes locally (no cloud) with Whisper-quality accuracy
3. Runs a small LLM locally (also no cloud) for heuristic clarification
4. Works on "most modern devices" (Mac/Windows laptops from last ~3 years, iPhone 15+)
5. Degrades gracefully to typing when offline/unsupported

## Why this matters
The user wants to lie on a couch and talk about memories instead of typing.
Privacy matters (memories are sensitive); offline matters (their .txt model).
Start with something that runs on their existing hardware (M-series Mac)
and only escalate to heavier models if quality is insufficient.

The user specifically asked me to research Gemma as an LLM option.

## Search queries

1. `transformers.js whisper browser example 2026` — current state of Whisper-in-browser via HuggingFace's transformers.js
2. `whisper.cpp wasm vs transformers.js browser` — comparison of Whisper browser implementations
3. `WebLLM Gemma browser 2026` — running Gemma in the browser via MLC-LLM / WebLLM
4. `Gemma 2 browser inference size` — Gemma model sizes and browser viability
5. `MediaRecorder Whisper audio chunk transcription` — audio pipeline pattern
6. `WebGPU browser compatibility Safari Chrome 2026` — which devices support WebGPU
7. `voice journaling app verbatim transcription` — prior art on voice journaling

## What I'm looking for

- **Whisper implementation** — library name, model sizes, download sizes, realistic latency on M-series Mac
- **LLM implementation** — library name, model options (especially Gemma), download sizes, quality for "clarification questions" task
- **Audio pipeline** — pattern for recording + chunking + sending to Whisper
- **Browser support matrix** — which features require WebGPU, which work on iOS Safari
- **Known gotchas** — e.g., silence detection, microphone permissions, chunk boundaries
