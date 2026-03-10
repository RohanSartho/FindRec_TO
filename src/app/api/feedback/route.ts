import { NextRequest, NextResponse } from "next/server";

const LINEAR_API = "https://api.linear.app/graphql";

/**
 * Resolve team UUID + label UUIDs from the key/name env vars.
 * Cached at module level — runs once per cold start, not per request.
 */
let teamId: string | null = null;
let bugLabelId: string | null = null;
let featureLabelId: string | null = null;

async function resolveIds() {
  if (teamId) return;

  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.LINEAR_API_KEY!,
    },
    body: JSON.stringify({
      query: `{
        teams(filter: { key: { eq: "${process.env.LINEAR_TEAM_ID}" } }) {
          nodes {
            id
            labels { nodes { id name } }
          }
        }
      }`,
    }),
  });

  const json = await res.json();
  const team = json.data?.teams?.nodes?.[0];
  if (!team) throw new Error(`Linear team not found: ${process.env.LINEAR_TEAM_ID}`);

  teamId = team.id;
  for (const label of team.labels.nodes as { id: string; name: string }[]) {
    if (label.name === process.env.LINEAR_BUG_LABEL_ID) bugLabelId = label.id;
    if (label.name === process.env.LINEAR_FEATURE_LABEL_ID) featureLabelId = label.id;
  }
}

/**
 * POST /api/feedback
 * Body: { type, title, description, urgency?, email?, pageUrl, screenshotUrl? }
 * Creates a Linear issue with the correct label (Bug or Improvement).
 */
export async function POST(request: NextRequest) {
  try {
    const { type, title, description, urgency, email, pageUrl, screenshotUrl } =
      await request.json();

    if (!title || !description || !type) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    await resolveIds();

    // Build markdown description
    const lines: string[] = [
      description,
      "",
      "---",
      `**Page:** ${pageUrl}`,
    ];
    if (type === "bug" && urgency) lines.push(`**Urgency:** ${urgency}`);
    if (email) lines.push(`**Reporter:** ${email}`);
    if (screenshotUrl) lines.push("", `![Screenshot](${screenshotUrl})`);

    const labelId = type === "bug" ? bugLabelId : featureLabelId;

    const res = await fetch(LINEAR_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env.LINEAR_API_KEY!,
      },
      body: JSON.stringify({
        query: `
          mutation IssueCreate($input: IssueCreateInput!) {
            issueCreate(input: $input) {
              success
              issue { id identifier }
            }
          }
        `,
        variables: {
          input: {
            teamId,
            title,
            description: lines.join("\n"),
            ...(labelId ? { labelIds: [labelId] } : {}),
          },
        },
      }),
    });

    const json = await res.json();
    const issue = json.data?.issueCreate?.issue;
    return NextResponse.json({ ok: true, issueId: issue?.identifier });
  } catch (err) {
    console.error("[feedback]", err);
    return NextResponse.json({ ok: false, error: "Failed to create issue" }, { status: 500 });
  }
}
