# Autobiographer

## Design Iteration Workflow

Always iterate on UI via the "7 variations" pattern (from a design-ideation playbook). Open rendered HTML files in the browser -- never describe layout changes in chat text.

Key rules:
- Always open the last approved "stable" version alongside new variations
- Test every variation with Playwright before showing (no broken buttons/scroll)
- Trash rejected files immediately -- they are noise
- Each variation must be structurally distinct, not a palette/font-size tweak
- Safe CSS tweaks were explicitly called "all worse" -- be brave with structural changes

The user gives 10x faster and more precise feedback looking at rendered tabs than reading paragraphs.

---

## Memory Elicitation Question Research

Current QBank questions feel "stiff and preppy" per user feedback. Research findings for better prompts:

### Core Shift

Move from journalist questions ("What/When/Who") to director's cues ("You're standing there and...").

### Five Principles

1. **Put the person in motion** -- arriving, leaving, waiting -- not static observation
2. **Use second person present tense** ("you're walking") to activate episodic memory
3. **Anchor to routine moments, not big events** -- daily rituals retrieve richer detail
4. **Add a constraint or specific other person** -- "your mother hands you something" beats "describe your mother"
5. **Involuntary memory triggers (Berntsen):** unexpected sensory details in mundane contexts -- texture of a steering wheel, sound of a screen door

### Pattern Substitutions

- Instead of "What song is stuck in your head?" -> "You're in the car. Someone else is driving. What's playing?"
- Instead of "What does your room smell like?" -> "You just walked in the front door. What hits you first?"
- Instead of "What were you afraid of?" -> "It's late and you can't sleep. What are you thinking about?"
- Instead of "Who was your best friend?" -> "Who do you call when something funny happens?"

### Research Basis

Sensory-specific and situational cues (Cued Autobiographical Memory paradigm) retrieve more emotionally vivid memories. Smell/sound cues are stronger than visual/verbal ones (Proust effect). StoryCorps/Studs Terkel method: start with concrete actions, not feelings.

Rewrite QBank entries to use situated, action-based prompts. Scene-setting before emotion. "Walk me through..." and "Tell me about a time when..." vastly outperform "How did you feel about..."
