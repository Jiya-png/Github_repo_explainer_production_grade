import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function GET() {
  const results: any = {};

  // Test 1: Groq API
  try {
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: "Say hello in one word." }],
      max_tokens: 10
    });
    results.groq = { success: true, response: completion.choices[0]?.message?.content };
  } catch (e: any) {
    results.groq = { success: false, status: e?.status, message: e?.message };
  }

  // Test 2: Fetch repo info
  try {
    const res = await fetch("https://api.github.com/repos/srbhr/Resume-Matcher", {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "repo-explainer-app"
      }
    });
    const data = await res.json();
    results.repoInfo = {
      success: res.ok,
      status: res.status,
      defaultBranch: data.default_branch,
      name: data.name,
      message: data.message // shows error message if failed
    };
  } catch (e: any) {
    results.repoInfo = { success: false, message: e?.message };
  }

  // Test 3: Fetch README
  try {
    const res = await fetch("https://api.github.com/repos/srbhr/Resume-Matcher/readme", {
      headers: {
        Accept: "application/vnd.github.raw",
        "User-Agent": "repo-explainer-app"
      }
    });
    results.readme = {
      success: res.ok,
      status: res.status,
      length: res.ok ? (await res.text()).length : 0
    };
  } catch (e: any) {
    results.readme = { success: false, message: e?.message };
  }

  // Test 4: Fetch file tree
  try {
    const res = await fetch("https://api.github.com/repos/srbhr/Resume-Matcher/git/trees/main?recursive=1", {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "repo-explainer-app"
      }
    });
    const data = await res.json();
    results.fileTree = {
      success: res.ok,
      status: res.status,
      fileCount: data.tree?.length,
      truncated: data.truncated,
      message: data.message
    };
  } catch (e: any) {
    results.fileTree = { success: false, message: e?.message };
  }

  return NextResponse.json(results);
}