# Voice mode research TLDR

## Stack decision

- **Whisper in browser**: `@huggingface/transformers` v3+ via CDN, model `onnx-community/whisper-base` with `dtype: "q4f16"` and `device: "webgpu"`. ~75 MB one-time download, WebGPU for speed with WASM fallback.
- **Audio pipeline**: `MediaRecorder` API → Blob → decode to 16kHz mono Float32 → transcriber. The transformers.js pipeline handles the audio decoding internally if given a Blob URL.
- **LLM (phase 3 only, opt-in)**: WebLLM + `gemma-2-2b-it-q4f16_1-MLC`, ~1.5 GB. Not needed for phase 1.
- **Phase 1 (this prototype)**: Just record → transcribe → show transcript → save. No LLM.
- **Phase 2 (next)**: Heuristic clarifier — detect unnamed people, vague dates, ask follow-ups by template.
- **Phase 3 (later)**: Swap heuristics for a local Gemma 2 2B clarifier.

## Browser support as of 2026-04

- Chrome/Firefox/Edge: WebGPU ✓ (majority)
- Safari 26+ on macOS/iOS/iPadOS: WebGPU ✓ (as of late 2025)
- Older browsers: fall back to WASM, still works, just slower
- Global coverage ~82.7%

## Minimum viable code

```javascript
import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0";

const transcriber = await pipeline(
  "automatic-speech-recognition",
  "onnx-community/whisper-base",
  { dtype: "q4f16", device: "webgpu" }
);

// After recording audio with MediaRecorder:
const audioURL = URL.createObjectURL(audioBlob);
const output = await transcriber(audioURL, { language: "english", task: "transcribe" });
console.log(output.text);
```

## Verbatim requirement

The user wants **near-verbatim transcription**, only removing fillers like "uh", "um".
Whisper does this by default (it's trained not to transcribe fillers).
For extra safety, we post-process to strip any remaining `\buh\b`, `\bum\b`, `\blike\b` (optional, only when it's clearly a filler).

## Next steps after prototype works

1. User tests with their own voice on a recent memory
2. If accuracy is good: merge into main app as an alternative to typing
3. If accuracy is poor on accents/German mixing: upgrade to `whisper-small` (250 MB) or opt in to server-side whisper.cpp

## Future ideas (captured, not built)

### Preserve the audio, not just the transcript

**Why it matters**: If you record grandma (or anyone else important) doing a voice interview,
the *voice itself* is the artifact. Decades later the words are searchable in the .txt, but
hearing her voice say them is what will actually make you cry. The transcript is the index;
the audio is the memory.

**What's cheap**: The MediaRecorder Blob is already in memory during transcription — we just
throw it away after. Saving it is basically free from a compute standpoint.

**Implementation sketch**:
- After transcription, save the Blob alongside the .txt entry
- Two storage options:
  - **Browser IndexedDB**: stored locally, accessible offline, ~tens-of-megabytes-per-session budget, survives reloads. Works with the .txt-first model.
  - **Download per session**: bundle the .webm files + .txt entry into a .zip the user downloads. Matches the "files on disk, software-independent" philosophy.
- In the .txt entry, append a reference like `[audio: voice-20260408-0123.webm]` so the link back is explicit
- On browse/viewer: an inline ▶ play button next to entries that have audio

**Size budget**:
- Opus-encoded mono 16kHz speech is ~8 KB/sec → ~500 KB per minute → ~30 MB per hour of talking
- A lifetime of voice entries easily fits in IndexedDB (usually 50 MB — 1 GB per origin)
- Downloading as zip keeps the .txt portable, audio kept alongside in a folder like `audio/` next to `autobiography.txt`

**Gotcha**: audio files are not human-readable, breaking the "grep-able plain text" model slightly.
Mitigation: the transcript is always the primary record; audio is a secondary artifact.

### Video interview (probably overkill)

Same idea as audio preservation but with MediaStream `video: true`. Adds massively to storage
(~10×), adds the awkwardness of being on camera (the user said couch mode — eyes closed).
Worth noting as possible but probably not worth building unless someone specifically wants it.

### Third-party interview mode

When the subject isn't *you* (e.g. interviewing your mom about your infancy), the interview
questions should reframe: "What was [subject] like?" instead of "What were you like?". The
transcripts get tagged `told by [name]:` in the .txt. Uses the same voice capture + clarifier
stack; just a different question template and a tag in the output.

## Pointers

- Detailed quantization and model sizes: `sources/transformers-js-v3.md`
- WebLLM + Gemma usage (phase 3): `sources/webllm-gemma.md`
- Plan: `PLAN.md`
