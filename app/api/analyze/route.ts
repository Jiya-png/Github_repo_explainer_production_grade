import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { parseGitHubUrl, fetchReadme, fetchFileTree } from "@/lib/github";
import { buildPrompt } from "@/lib/prompt";
import { cacheGet, cacheSet, generateCacheKey } from "@/lib/cache";
import { checkIPRateLimit } from "@/lib/ratelimit";
import { queueAnalysis } from "@/lib/queue";
import { logger } from "@/lib/logger";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const CACHE_TTL = parseInt(process.env.CACHE_TTL_ANALYSIS || "86400", 10); // 24 hours default

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
  let owner = "", repo = "", level = "intermediate";

  try {
    // ─── Step 1: Rate Limiting ───────────────────────────────────────────
    const rateLimitResult = await checkIPRateLimit(clientIP);
    if (!rateLimitResult.success) {
      logger.warn("Rate limit exceeded", {
        ip: clientIP,
        remaining: rateLimitResult.remaining,
        retryAfter: rateLimitResult.retryAfter
      });
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Please retry in ${rateLimitResult.retryAfter} seconds.`,
          retryAfter: rateLimitResult.retryAfter
        },
        { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfter) } }
      );
    }

    // ─── Step 2: Parse Request ───────────────────────────────────────────
    const body = await req.json();
    let url = body.url;
    level = body.level || "intermediate";

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    const parsed = parseGitHubUrl(url);
    owner = parsed.owner;
    repo = parsed.repo;

    logger.info("Analysis request received", { owner, repo, level, ip: clientIP });

    // ─── Step 3: Check Cache ─────────────────────────────────────────────
    const cacheKey = generateCacheKey(owner, repo, level);
    const cached = await cacheGet(cacheKey);

    if (cached) {
      logger.info("Cache hit", { owner, repo, level });
      return NextResponse.json({
        ...cached,
        _cached: true,
        _cacheAge: Math.round((Date.now() - (cached as any)._timestamp) / 1000)
      });
    }

    logger.info("Cache miss, fetching from GitHub", { owner, repo });

    // ─── Step 4: Queue and Execute Analysis ──────────────────────────────
    const result = await queueAnalysis(async () => {
      return await performAnalysis(owner, repo, level);
    });

    // ─── Step 5: Cache Result ────────────────────────────────────────────
    await cacheSet(cacheKey, { ...result, _timestamp: Date.now() }, CACHE_TTL);

    const duration = Date.now() - startTime;
    logger.info("Analysis completed successfully", {
      owner,
      repo,
      level,
      duration,
      ip: clientIP
    });

    return NextResponse.json(result);

  } catch (e: any) {
    const duration = Date.now() - startTime;

    if (e.message?.includes("429") || e.status === 429) {
      logger.warn("Groq rate limit hit", {
        owner,
        repo,
        duration,
        ip: clientIP
      });
      return NextResponse.json(
        { error: "AI service temporarily overloaded. Please try again in a moment." },
        { status: 503 }
      );
    }

    logger.error("Analysis failed", e, {
      owner,
      repo,
      level,
      duration,
      ip: clientIP
    });

    return NextResponse.json(
      {
        error: e.message || "Failed to analyze repository",
        details: process.env.NODE_ENV === "development" ? e.stack : undefined
      },
      { status: 500 }
    );
  }
}

async function performAnalysis(owner: string, repo: string, level: string) {
  try {
    // Fetch from GitHub
    const [readme, fileTree] = await Promise.all([
      fetchReadme(owner, repo),
      fetchFileTree(owner, repo)
    ]);

    if (!readme && fileTree.length === 0) {
      throw new Error("Could not fetch repository data from GitHub");
    }

    // Build and send prompt
    const prompt = buildPrompt(readme, fileTree, level as any);
    logger.debug("Prompt built", { owner, repo, promptLength: prompt.length });

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 2000
    });

    const text = completion.choices[0]?.message?.content || "";

    // Parse JSON
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      owner,
      repo,
      level,
      ...parsed,
      _timestamp: Date.now()
    };

  } catch (e: any) {
    logger.error("performAnalysis error", e, { owner, repo, level });
    throw e;
  }
}