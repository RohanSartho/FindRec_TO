# Plan Creation Stage

Based on our full exchange, produce a markdown plan document.

Before writing the plan, read:
1. `PROJECT.md` — for project context, phase history, and current state
2. `src/lib/config/version.ts` — to get the **current version number**

Requirements for the plan:

- Include clear, minimal, concise steps.
- Track the status of each step using these emojis:
  - 🟩 Done
  - 🟨 In Progress
  - 🟥 To Do
- Include dynamic tracking of overall progress percentage (at top).
- Include a **Version Impact** line classifying the bump type (see table below).
- Do NOT add extra scope or unnecessary complexity beyond explicitly clarified details.
- Steps should be modular, elegant, minimal, and integrate seamlessly within the existing codebase.

## Version Classification

Use this table to classify every plan before writing it:

| What this plan does | Bump type | Example |
|---|---|---|
| Bug fix, style tweak, typo, config change only | **patch** `v2.1 → v2.1.1` | Fix broken filter |
| 1–2 new user-facing features, new page, new filter, new API route, new activity type | **minor** `v2.1 → v2.2` | Add price display |
| Full redesign, new platform target, multi-city, mobile, new data model | **major** `v2.x → v3.0` | Multi-city support |

The plan must state the version impact at the top, e.g.:
`**Version impact:** minor bump — v2.1 → v2.2`

---

## Markdown Template

```markdown
# Feature Implementation Plan

**Overall Progress:** `0%`
**Version impact:** [patch | minor | major] — vX.Y (current) → vA.B (after)

## TLDR
Short summary of what we're building and why.

## Critical Decisions
Key architectural/implementation choices made during exploration:
- Decision 1: [choice] - [brief rationale]
- Decision 2: [choice] - [brief rationale]

## Tasks:

- [ ] 🟥 **Step 1: [Name]**
  - [ ] 🟥 Subtask 1
  - [ ] 🟥 Subtask 2

- [ ] 🟥 **Step 2: [Name]**
  - [ ] 🟥 Subtask 1
  - [ ] 🟥 Subtask 2

...

- [ ] 🟥 **Final Step: Bump version** *(skip for patch fixes)*
  - [ ] 🟥 Update `APP_VERSION` in `src/lib/config/version.ts`
  - [ ] 🟥 Add entry to `VERSION_NOTES` (one-sentence user-facing summary)
  - [ ] 🟥 Commit: `chore: bump version to vA.B`
```

---

It's still not time to build yet. Just write the clear plan document. No extra complexity or extra scope beyond what we discussed.
