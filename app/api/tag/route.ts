// T1: Server-side only — ANTHROPIC_API_KEY never exposed to client
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { CONTEXTS, PROJECTS, DEFAULT_CONTEXT, DEFAULT_PROJECT } from "@/lib/enums";
import type { Context, Project } from "@/lib/enums";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

// T1: Simple per-uid rate cap — 60 requests per minute in memory
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(uid: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(uid);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(uid, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

const FALLBACK = { contexts: [DEFAULT_CONTEXT] as Context[], project: DEFAULT_PROJECT as Project, tagged: false };

export async function POST(req: NextRequest) {
  // T1: Verify Firebase ID token
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const idToken = authHeader.slice(7);

  let uid: string;
  try {
    uid = await verifyFirebaseToken(idToken);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // T1: Rate cap
  if (!checkRateLimit(uid)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // T1: Input validation
  let text: string;
  let userContexts: string[];
  let userProjects: string[];
  try {
    const body = await req.json();
    text = body?.text;
    // Use caller's dynamic enum lists if provided, else fall back to defaults
    userContexts = Array.isArray(body?.contexts) && body.contexts.length > 0
      ? body.contexts
      : [...CONTEXTS];
    userProjects = Array.isArray(body?.projects) && body.projects.length > 0
      ? body.projects
      : [...PROJECTS];
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  if (text.length > 2048) {
    return NextResponse.json({ error: "text too long (max 2048 chars)" }, { status: 400 });
  }

  // Ensure fallback values are always in the enum lists
  if (!userContexts.includes(DEFAULT_CONTEXT)) userContexts.push(DEFAULT_CONTEXT);
  if (!userProjects.includes(DEFAULT_PROJECT)) userProjects.push(DEFAULT_PROJECT);

  // T4: Force tool_choice so Claude cannot return prose
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      tool_choice: { type: "tool", name: "tag_task" },
      tools: [
        {
          name: "tag_task",
          description: "Classify a GTD task into one or more contexts and a project.",
          input_schema: {
            type: "object" as const,
            properties: {
              contexts: {
                type: "array",
                items: { type: "string", enum: userContexts },
                minItems: 1,
                description: "One or more contexts where this task can be done. Use @anywhere if it can be done in any context.",
              },
              project: {
                type: "string",
                enum: userProjects,
                description: "The project this task belongs to.",
              },
            },
            required: ["contexts", "project"],
          },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Classify this task into contexts and a project:\n\n"${text.trim()}"`,
        },
      ],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json(FALLBACK);
    }

    const input = toolUse.input as { contexts?: unknown; project?: unknown };

    // T4: Validate against user's actual enum — never trust AI output blindly
    const contexts = (Array.isArray(input.contexts) ? input.contexts : [])
      .filter((c: unknown): c is Context => userContexts.includes(c as string));
    const project = userProjects.includes(input.project as string)
      ? (input.project as Project)
      : DEFAULT_PROJECT;

    if (contexts.length === 0) {
      return NextResponse.json({ contexts: [DEFAULT_CONTEXT], project, tagged: true });
    }

    return NextResponse.json({ contexts, project, tagged: true });
  } catch {
    // T4: Any Claude error → safe fallback, tagged:false so retag can retry
    return NextResponse.json(FALLBACK);
  }
}
