import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { fetchFileContent } from "@/lib/github";
import { cacheGet, cacheSet, generateFileCacheKey } from "@/lib/cache";
import { checkIPRateLimit } from "@/lib/ratelimit";
import { queueFileAnalysis } from "@/lib/queue";
import { logger } from "@/lib/logger";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const CACHE_TTL = parseInt(process.env.CACHE_TTL_FILE || "43200", 10); // 12 hours

type Level = "beginner" | "intermediate" | "advanced";

const levelInstructions = {
  beginner: "Explain as if talking to someone new to coding. Avoid jargon. Use simple analogies.",
  intermediate: "Assume basic coding knowledge. You can mention frameworks and patterns.",
  advanced: "Be technically precise. Mention design patterns, architecture decisions, trade-offs."
};

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const clientIP = getClientIP(req);
  let owner = "", repo = "", path = "";

  try {
    // Rate limit check
    const rateLimitResult = await checkIPRateLimit(clientIP);
    if (!rateLimitResult.success) {
      logger.warn("Rate limit exceeded (file explain)", { ip: clientIP });
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    const { owner: o, repo: r, path: p, level } = await req.json();
    owner = o;
    repo = r;
    path = p;

    if (!owner || !repo || !path) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    logger.info("File explain request", { owner, repo, path, level });

    // Check cache
    const cacheKey = generateFileCacheKey(owner, repo, path, level);
    const cached = await cacheGet(cacheKey);

    if (cached) {
      logger.info("File cache hit", { owner, repo, path });
      return NextResponse.json({ ...cached, _cached: true });
    }

    // Queue and execute
    const result = await queueFileAnalysis(async () => {
      return await explainFile(owner, repo, path, level);
    });

    // Cache result
    await cacheSet(cacheKey, result, CACHE_TTL);

    const duration = Date.now() - startTime;
    logger.info("File explain completed", { owner, repo, path, duration });

    return NextResponse.json(result);

  } catch (e: any) {
    const duration = Date.now() - startTime;
    logger.error("File explain failed", e, {
      owner,
      repo,
      path,
      duration,
      ip: clientIP
    });

    if (e.status === 429) {
      return NextResponse.json(
        { error: "AI service rate limited. Please try again in a moment." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to explain file" },
      { status: 500 }
    );
  }
}

async function explainFile(owner: string, repo: string, path: string, level: string) {
  const content = await fetchFileContent(owner, repo, path);

  const prompt = `
You are a senior developer explaining a single file from a GitHub repository.
Explanation style: ${levelInstructions[level as Level] || levelInstructions.intermediate}

File path: ${path}

File content:
<file>
${content.slice(0, 3000)}
</file>

Return a JSON object with EXACTLY this shape and nothing else:
{
  "purpose": "One sentence: what is this file's job in the project?",
  "whatItDoes": ["bullet 1", "bullet 2", "bullet 3"],
  "keyFunctions": [
    { "name": "functionName", "description": "what it does" }
  ],
  "dependsOn": ["list of imports or files this depends on"],
  "tip": "One insight a beginner would miss"
}

Rules:
- Only return valid JSON
- No markdown formatting
- No backticks
- No extra text before or after the JSON
`;

  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 1000
  });

  const text = completion.choices[0]?.message?.content || "";
  const cleaned = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  return parsed;
}
