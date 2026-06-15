# Should We Move the Feedback Module to n8n?

> Written: 2026-03-20. Revisit when feedback volume reaches ~20+ issues/month.

---

## Context

The feedback widget (`FeedbackWidget.tsx`) currently submits bug reports and feature suggestions directly to Linear via GraphQL from two Next.js API routes:

- `src/app/api/feedback/route.ts` — resolves team/label UUIDs, builds markdown description, creates Linear issue
- `src/app/api/feedback/upload/route.ts` — signs S3 URL via Linear's fileUpload mutation, PUTs image to S3

The proposal: replace the Linear logic in these routes with a webhook POST to an n8n pipeline that enriches the feedback with LLM-added context (structured title, acceptance criteria, severity) before creating the Linear issue, and generates a weekly PM report.

---

## Is This Overkill Right Now?

**Yes — but it's the right direction for later.**

The codebase-reading enrichment step is what tips it into overkill. For n8n to add meaningful context per issue it needs either:

- A vector store with your codebase embedded (RAG) — non-trivial setup and ongoing cost
- A manually maintained context blob passed with each webhook — fragile

For ~5–20 feedback submissions/month the ROI isn't there yet.

---

## Pros

| Pro | Weight |
|---|---|
| Removes Linear API logic from the web app — cleaner separation of concerns | High |
| LLM enrichment makes raw bug reports genuinely actionable | High |
| Weekly PM report is useful for a solo PM/dev | Medium |
| n8n is visual — iterate the pipeline without code deploys | Medium |
| Webhook decoupling means you can swap Linear for Jira/Notion later | Low |

## Cons

| Con | Weight |
|---|---|
| Another infra piece to maintain (n8n server + uptime) | High |
| LLM "reads your codebase" at webhook time is expensive and slow | High |
| Current issue volume doesn't justify the complexity | High |
| Cold-start latency on free-tier cloud will be noticeable | Medium |
| Screenshot upload must stay in the app — Linear S3 signing requires the API key server-side | Medium |

---

## Self-Hosting n8n on Free Tier Cloud with Docker

Yes — practical options:

| Platform | Free Tier | Docker | Catch |
|---|---|---|---|
| **Fly.io** | 3 shared VMs free | Yes | Best option — stays alive, persistent volumes, Docker-native |
| **Railway** | ~$5 credit/mo | Yes | Usually covers light use; sleeps after inactivity |
| **Render** | Free web service | Yes | Sleeps after 15min — bad for n8n |
| **Oracle Cloud** | 2 ARM VMs forever free | Yes | Most reliable, never sleeps, but heavier setup |

**Fly.io is the practical pick.** n8n's Docker image runs on their smallest VM. Set `--max-old-space-size` to keep RAM in check. Note: self-hosted n8n only has basic HTTP auth — fine for personal use.

---

## Recommended Approach (Phased)

### Phase 1 — Decouple (low effort, do now if desired)
Replace the Linear GraphQL calls in `src/app/api/feedback/route.ts` with a POST to an n8n webhook URL. n8n reformats and creates the Linear issue. Same outcome, web app no longer owns Linear logic.

Screenshot upload (`/api/feedback/upload`) stays in the app — it requires Linear's signed S3 URL and can't cleanly move to n8n without exposing the Linear API key differently.

### Phase 2 — Enrich (do when volume justifies it)
Add an LLM step in n8n once you have 20+ issues and a clear pattern in what context is missing. Use a summarized context blob (current version, recent phase, relevant component) rather than full codebase RAG.

### Phase 3 — Reporting (do when Phase 2 is stable)
Add a scheduled n8n workflow (weekly) that pulls from Linear API, summarises open issues by type/severity, and delivers a PM digest.

---

## Current Feedback Data Flow (for reference)

```
FeedbackWidget (client)
  │
  ├─ if screenshot → POST FormData → /api/feedback/upload
  │     ├─ fileUpload mutation → Linear (get signed S3 URL)
  │     ├─ PUT binary → S3
  │     └─ return assetUrl
  │
  └─ POST JSON → /api/feedback
        ├─ resolveIds() → Linear (team UUID + label UUIDs, cached per cold start)
        ├─ build markdown description
        ├─ issueCreate mutation → Linear
        └─ return issueId (e.g. "ENG-42")
```

**Fields sent to Linear today:** title, description (with page URL + urgency + email + screenshot), label (Bug or Improvement), teamId.
