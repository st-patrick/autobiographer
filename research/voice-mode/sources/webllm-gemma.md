---
url: https://github.com/mlc-ai/web-llm
title: WebLLM — In-browser LLM Inference Engine (Gemma support)
fetched: 2026-04-08
query: WebLLM Gemma browser MLC-LLM supported models
relevance: medium
notes: For phase 3 (LLM clarifier). Not needed for phase 1 prototype.
---

# WebLLM for Phase 3

## CDN import
```javascript
import * as webllm from "https://esm.run/@mlc-ai/web-llm";
```

## Initialization with Gemma

```javascript
import { CreateMLCEngine } from "@mlc-ai/web-llm";

const engine = await CreateMLCEngine(
  "gemma-2-2b-it-q4f16_1-MLC",
  { initProgressCallback: p => console.log(p) }
);
```

Model list is in `webllm.prebuiltAppConfig.model_list`. Gemma 2 2B variants are included.

## OpenAI-compatible chat API

```javascript
const reply = await engine.chat.completions.create({
  messages: [
    { role: "system", content: "You are a capture assistant. Ask at most 2 clarifying questions about ambiguous dates, unnamed people, or missing sensory details. Do not be therapeutic." },
    { role: "user", content: transcript }
  ],
  temperature: 0.3
});
console.log(reply.choices[0].message.content);
```

## Size reference

Gemma 2 2B quantized: **~1.5 GB** download. Runs at 40–180 tok/s on modern hardware.
Only fetch on opt-in (phase 3+).
