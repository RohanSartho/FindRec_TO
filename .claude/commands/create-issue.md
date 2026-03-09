# Create Issue

User is mid-development and thought of a bug/feature/improvement. Capture it fast so they can keep working.

## Your Goal

Create a complete issue with:
- Clear title
- TL;DR of what this is about
- Current state vs expected outcome
- Relevant files that need touching
- Risk/notes if applicable
- Proper type/priority/effort labels
- **Version impact label** (see below)

## Version Impact Label

Every issue must include a version impact classification. Glance at `src/lib/config/version.ts` for the current version, then apply one label:

| Label | When | Bump |
|---|---|---|
| `version: patch` | Bug fix, typo, style tweak — no new features | `v2.1 → v2.1.1` |
| `version: minor` | New user-facing feature, new page, new filter, new API | `v2.1 → v2.2` |
| `version: major` | Full redesign, new platform, multi-city, mobile | `v2.x → v3.0` |

Include in the issue:
`**Version impact:** [patch | minor | major] — when resolved, bump vX.Y → vA.B`

## How to Get There

**Ask questions** to fill gaps - be concise, respect the user's time. They're mid-flow and want to capture this quickly. Usually need:
- What's the issue/feature
- Current behavior vs desired behavior
- Type (bug/feature/improvement) and priority if not obvious

Keep questions brief. One message with 2-3 targeted questions beats multiple back-and-forths.

**Search for context** only when helpful:
- Web search for best practices if it's a complex feature
- Grep codebase to find relevant files
- Note any risks or dependencies you spot

**Skip what's obvious** - If it's a straightforward bug, don't search web. If type/priority is clear from description, don't ask.

**Keep it fast** - Total exchange under 2min. Be conversational but brief. Get what you need, create ticket, done.

## Issue Template

```
**Type:** bug | feature | improvement
**Priority:** low | normal | high | critical
**Effort:** small | medium | large
**Version impact:** patch | minor | major — vX.Y → vA.B

**TL;DR**
One sentence.

**Current behaviour**
What happens now.

**Expected behaviour**
What should happen.

**Relevant files**
- path/to/file.tsx
- path/to/other.ts

**Notes / risks**
Any gotchas, dependencies, or context worth knowing.
```

## Behavior Rules

- Be conversational - ask what makes sense, not a checklist
- Default priority: normal, effort: medium (ask only if unclear)
- Max 3 files in context - most relevant only
- Bullet points over paragraphs
- Always include version impact — it takes 5 seconds and keeps versioning consistent
