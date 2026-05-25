# Research Play

A reusable playbook for doing thorough web research with **local caching**, so subsequent runs and humans can re-use the work without re-fetching.

> **Where this lives**: this file should ideally also be copied to `~/.claude/playbooks/research-play.md` so it's available globally across all projects. It's tracked here in this project too as a working copy that can be refined.

## When to use

- Open-ended research questions ("what are best practices for X")
- Multi-source synthesis (need to triangulate from several places)
- Anything where future you, a future agent, or the user might want to revisit the sources
- Anything where the answer might evolve and you want a baseline to compare against

## When NOT to use

- Simple factual lookups (just answer)
- Single-page docs where the URL itself is the source of truth (just link it)
- Code questions that are better answered by reading actual code

## The play

### 1. Plan the queries before searching

Don't fire off random searches. First write down:
- The **core question** in one sentence
- 3–7 **specific search queries** that triangulate it from different angles
  - Different vocabulary (academic vs practitioner vs popular)
  - Different perspectives (proponent vs critic)
  - Different formats (article vs list vs paper vs forum)
- The **kind of source** you want for each (peer-reviewed? blog post? official docs? subreddit thread?)

Write these into `research/<topic>/PLAN.md` before searching.

### 2. Search and capture

For each query:
- Run `WebSearch` with the query
- Pick the 1–3 most promising results
- For each, run `WebFetch` and save the **raw extracted content** to a cache file
- One source = one file = `research/<topic>/sources/<slug>.md`

**Source file format** (YAML frontmatter + body):

```markdown
---
url: https://example.com/article
title: Article title
fetched: 2026-04-07
query: "exact query that surfaced this"
relevance: high | medium | low
---

[Cleaned content body — what WebFetch returned]
```

**Caching rule**: before fetching a URL, check if a source file with that URL already exists. If yes, skip the fetch and read the local file instead. This is what makes the play composable across runs.

### 3. Synthesize

After capturing sources, read through them and write `research/<topic>/SUMMARY.md`:

- **Key findings** — what is the consensus / common ground
- **Disagreements** — where do sources diverge
- **Direct quotes** — short, attributed, with source link
- **Open questions** — what's still unclear after this round of research
- **Follow-up queries** — what to search next time if this needs another round

The synthesis should cite source files (not just URLs), so a reader can drill into the cached content.

### 4. Surface a TLDR for consumers

Write `research/<topic>/README.md` as a 1-page TLDR aimed at the *consumer* (the user, the next agent, the implementation work):

- The 3–5 most important takeaways
- Any concrete actions or recommendations
- A pointer to SUMMARY.md for depth

This is what gets read first and most often.

## Folder structure

```
research/
  <topic-slug>/
    PLAN.md           ← queries planned upfront
    README.md         ← TLDR for consumers (read this first)
    SUMMARY.md        ← detailed synthesis with quotes + source links
    sources/
      <slug>.md       ← cached page (one per source)
      ...
```

## Why caching matters

- **Avoids re-fetching** the same content (slow, wasteful, occasionally rate-limited)
- **Survives sessions** — sources persist on disk; the next agent or human can pick up where this left off
- **Auditable** — the user can inspect the actual sources, not just the synthesis
- **Refinable** — if the synthesis turns out wrong, you can re-read sources without re-fetching
- **Composable** — multiple research topics can cite each other's sources

## Refinement

This playbook is a **living document**. After each research task:
- Note what worked well, what didn't (in `playbooks/research-play.notes.md` if you want)
- Update this play to reflect new lessons
- Don't be precious about it — refine freely

## Known limitations of the tools

- **WebFetch returns binary for PDFs** — they come back as encoded streams that
  the post-processing model can't read. If a search result is a PDF, look for
  an HTML mirror instead, or try a different source. The PDF *is* saved to a
  local cache path but you can't easily read it from there.
- **Some sites block WebFetch with 403** — typically Cloudflare-protected.
  StoryCorps did this. Workaround: use an alternative source (search-result
  summaries are often enough for popular content) and document the limitation
  in the source file's `notes:` field.
- **WebFetch summarizes long pages** — for very long pages you may not get the
  whole content. If completeness matters, narrow the prompt to a specific
  section.

## Anti-patterns to avoid

- **Don't** start writing the synthesis before all sources are captured. You'll bias toward whatever you read first.
- **Don't** trust a single source for a contested question. Always triangulate.
- **Don't** delete cache files because "the synthesis already extracted what's needed". Keep them.
- **Don't** put findings in the same file as the cached sources. Synthesis ≠ raw input.
- **Don't** skip the PLAN step. "Just searching around" produces shallow output.
