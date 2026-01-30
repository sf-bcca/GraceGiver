---
name: ai-stewardship-tuner
description: Manages and refines Gemini AI prompts for GraceGiver financial narratives and stewardship insights. Use when editing AI prompts, testing narrative tone, or developing new AI features like GraceForecast.
---

# ai-stewardship-tuner

This skill ensures that GraceGiver's AI insights remain accurate, professional, and "pastoral" in tone.

## Core Workflows

### 1. Refine Prompts
When modifying `server/geminiService.js`, consult the [references/prompt_library.md](references/prompt_library.md) to maintain consistency. Ensure new prompts adhere to the [references/tone_guide.md](references/tone_guide.md).

### 2. Test Prompt Changes
Before committing changes to the AI service, run the local test script to verify the output:

```bash
# Requires GEMINI_API_KEY in environment
node conductor/ai-stewardship-tuner/scripts/test_prompts.cjs
```

### 3. Maintain the "Pastoral Voice"
Always verify that member-facing narratives are:
- Grateful and encouraging.
- No more than 2-3 sentences.
- Focused on spiritual impact rather than just financial transactions.

## Resource Navigation
- **Prompt Library**: [references/prompt_library.md](references/prompt_library.md)
- **Tone Guide**: [references/tone_guide.md](references/tone_guide.md)
- **Test Script**: `conductor/ai-stewardship-tuner/scripts/test_prompts.cjs`