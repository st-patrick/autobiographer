# Autobiography interviewing — research TLDR

What we found about how to do this well, and what we should change in the app.

## The 5 most useful findings

### 1. Ask for ONE specific scene, not for a "year"
The single biggest insight from McAdams' Life Story Interview and from oral
history methodology: every prompt should ask for **one specific incident with
details** (what, when, where, who, what you were thinking and feeling).
Currently our interview asks "What was 2015 like?" — which is too broad. The
better form: "Describe a single day you remember from 2015. Who was there?
What were you doing?"

### 2. Sensory triggers are the most effective memory unlockers
Reminiscence therapy (clinically tested) finds **memory triggers used in 59% of
studies** are the most effective component. Photos, music, smells, objects.
We can't show photos, but we can build "sensory walk" prompts:
> "Close your eyes. You're 12, it's 2003. You're standing in your bedroom.
> What do you smell? What do you hear? Who's nearby?"

### 3. Use the "book of chapters" framing to surface what matters
McAdams' protocol opens with: *"Think of your life as if it were a book. What
are the chapter titles? What's each one about?"* This forces self-organization
before drilling into specifics. We could add an opening "chapters" mode that
asks the user to define their own life chapters, then runs gap-filling within
each chapter.

### 4. The "reminiscence bump": ages 10–30 are most accessible
Both clinical and academic research converge: people most vividly recall
events from **ages 10–30**, peaking late teens / early twenties. For this user,
that's 2001–2021 — and indeed those are the years where the user has the
densest existing entries (when they exist) and the biggest gaps. Interview
mode should weight prompts toward this range when possible.

### 5. For ages 0–5, you have to interview a third party
There's no recovering infancy directly. The user already plans to ask their
mom about 1992 — that's the textbook approach. We could add a "third-party
mode" with a curated set of questions designed to be sent to (or asked of)
someone else: "What was [name] like at age 1? What made them laugh? What were
your routines?"

## Concrete app recommendations

| Idea | What to change | Effort |
|---|---|---|
| **Scene-specific prompts** | Add a question template: "Describe one specific day from {year}. Who, what, where, what were you thinking?" | Small — add to question pool |
| **Sensory walk mode** | New interview question type: structured 5-sense walk for a chosen year | Small — new prompt template |
| **Book-of-chapters opening** | Optional first-time prompt: "If your life were a book, what are the chapters?" Save as a special entry. | Medium — new UI |
| **McAdams 8-scene mode** | New interview mode: walk through Peak / Nadir / Turning Point / Earliest / Childhood / Adolescent / Adult / Other | Medium — new screen |
| **Third-party interview mode** | A curated question list designed to be asked of someone else; output is formatted as "told by [name]: ..." | Medium — new flow |
| **Present-tense prompt option** | "Write this as if it's happening right now" hint on the answer textarea | Trivial |
| **6-questions-per-session pacing** | If the user wants depth-mode, limit to 6 questions per sitting | Trivial |

## Specific question gold worth adding to QBank

From StoryCorps, McAdams, and the parent-questions list:
- "If you could talk to a younger version of yourself in {year}, what would you say?"
- "Is there anything from {year} you've never told anyone but want to tell now?"
- "Describe a single peak experience from {year}. The high point of that year."
- "Describe a single low point from {year}. What got you through it?"
- "What turning point happened in {year}, even if you didn't notice it then?"
- "If your life is a book, what was the chapter title for {year}?"
- "Close your eyes. You're {age}, {year}. What do you smell? Hear? Feel?"
- "Who do you call when shit hits the fan in {year}?" *(already in QBank)*

## How to do the 1992 interview (the user's actual immediate need)

Send these to your mom (or ask in person). Designed to be answered without
needing the subject (you) to remember anything:

1. What was I like at age 1? Quiet? Loud? Easy? Difficult?
2. What made me laugh? What scared me?
3. What did our days look like? Where were we living?
4. What were you most worried about that year? Most happy about?
5. Was there a moment that year that made you think "this kid is going to be okay"?
6. Did I have a favorite toy, blanket, food, person?
7. What music was playing in our house?
8. What was your relationship with my dad like that year?
9. If you could go back to 1992 and tell yourself one thing, what would it be?
10. Is there anything from that year you've never told me?

## Where to go next

- Read `SUMMARY.md` for the detailed synthesis with quotes
- Read `sources/*.md` for the raw cached pages
- See `PLAN.md` for the queries used and why
- Follow-ups for next round are listed at the bottom of `SUMMARY.md`
