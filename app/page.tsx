"use client";
import { useState, useCallback } from "react";
import { AnalyzeResult, FileDetail, Level } from "@/lib/type";
import styles from "./page.module.css";

const MESSAGES = [
  "🔍 Fetching repo...",
  "📁 Reading file structure...",
  "🧠 Building context...",
  "⚡ Analyzing with AI...",
  "✨ Formatting results..."
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [level, setLevel] = useState<Level>("intermediate");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileDetail, setFileDetail] = useState<FileDetail | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [cached, setCached] = useState(false);

  const handleAnalyze = useCallback(async () => {
    if (!url.trim()) return;
    
    setLoading(true);
    setResult(null);
    setError("");
    setSelectedFile(null);
    setFileDetail(null);
    setCached(false);

    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % MESSAGES.length;
      setLoadingMsg(MESSAGES[i]);
    }, 1500);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, level })
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle rate limiting
        if (res.status === 429) {
          setError(`Rate limited: ${data.error}`);
        } else {
          setError(data.error || "Failed to analyze repo");
        }
        return;
      }

      setResult(data);
      setCached(data._cached || false);
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }, [url, level]);

  const handleFileClick = useCallback(
    async (path: string) => {
      if (!result) return;
      setSelectedFile(path);
      setFileDetail(null);
      setFileLoading(true);

      try {
        const res = await fetch("/api/file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner: result.owner,
            repo: result.repo,
            path,
            level
          })
        });

        if (!res.ok) {
          if (res.status === 429) {
            setFileDetail({ error: "Rate limited. Please try again soon." } as any);
          } else {
            setFileDetail({ error: "Failed to load file details" } as any);
          }
          return;
        }

        const data = await res.json();
        setFileDetail(data);
      } catch {
        setFileDetail({ error: "Network error" } as any);
      } finally {
        setFileLoading(false);
      }
    },
    [result, level]
  );

  return (
    <main className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>RepoExplainer Pro</h1>
        <p className={styles.subtitle}>AI-powered GitHub repository analysis — powered by LLaMA 3.3</p>
      </div>

      {/* Input Section */}
      <div className={styles.controls}>
        <input
          type="text"
          placeholder="https://github.com/owner/repo"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
          disabled={loading}
          className={styles.input}
        />

        {/* Level Selector */}
        <div className={styles.levels}>
          {(["beginner", "intermediate", "advanced"] as Level[]).map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              disabled={loading}
              className={`${styles.levelButton} ${level === l ? styles.active : ""}`}
            >
              {l === "beginner" ? "👶" : l === "intermediate" ? "💻" : "🧠"} {l}
            </button>
          ))}
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading || !url.trim()}
          className={`${styles.primaryButton} ${(loading || !url.trim()) ? styles.disabled : ""}`}
        >
          {loading ? loadingMsg : "Analyze Repo →"}
        </button>
      </div>

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      {/* Cache indicator */}
      {cached && <div className={styles.cached}>⚡ Cached result (loaded instantly)</div>}

      {/* Results */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Top row: Summary + Tech Stack */}
          <div className={styles.gridTwo}>
              <Card title="📋 What it does">
                <p className={styles.paragraph}>{result.summary}</p>
              </Card>
              <Card title="🔧 Tech Stack">
                <div className={styles.tags}>
                  {result.techStack.map((t) => (
                    <span key={t} className={styles.tag}>{t}</span>
                  ))}
                </div>
              </Card>
            </div>

          {/* Key Insight */}
          <div style={{
            background: "#fffbea",
            border: "1px solid #f0d060",
            borderRadius: 10,
            padding: "14px 18px"
          }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>💡 Key Insight: </span>
            <span style={{ color: "#555", fontSize: 14 }}>{result.keyInsight}</span>
          </div>

          {/* How to Run */}
          <Card title="▶ How to Run">
            <ol className={styles.list}>
              {result.howToRun.map((step, i) => (
                <li key={i} className={styles.listItem}>{step}</li>
              ))}
            </ol>
          </Card>

          {/* Files Section */}
          <div className={selectedFile ? styles.gridSplit : styles.gridFull}>
            <Card title="📁 Files & Folders">
              <div className={styles.fileList}>
                {result.fileExplanations.map((f) => (
                  <div
                    key={f.path}
                    className={`${styles.fileItem} ${selectedFile === f.path ? styles.fileItemSelected : ""}`}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <code className={styles.filePath}>{f.path}</code>
                      <span className={styles.fileExplanation}>{f.explanation}</span>
                    </div>
                    <button
                      onClick={() => handleFileClick(f.path)}
                      disabled={fileLoading}
                      className={styles.smallButton}
                    >
                      Explain →
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            {selectedFile && (
              <Card title={`🔍 ${selectedFile.split("/").pop()}`}>
                {fileLoading ? (
                  <div style={{ color: "#888", fontSize: 14, padding: "1rem 0" }}>Analyzing file...</div>
                ) : fileDetail && !(fileDetail as any).error ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <Label>Purpose</Label>
                      <p style={{ margin: "4px 0 0", fontSize: 14, color: "#333", lineHeight: 1.6 }}>
                        {(fileDetail as any).purpose}
                      </p>
                    </div>
                    <div>
                      <Label>What it does</Label>
                      <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                        {(fileDetail as any).whatItDoes?.map((b: string, i: number) => (
                          <li key={i} style={{ fontSize: 13, color: "#444", lineHeight: 1.8 }}>
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {(fileDetail as any).keyFunctions?.length > 0 && (
                      <div>
                        <Label>Key functions</Label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                          {(fileDetail as any).keyFunctions.map((fn: any) => (
                            <div key={fn.name} style={{ background: "#f5f5f5", borderRadius: 6, padding: "8px 10px" }}>
                              <code style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>
                                {fn.name}
                              </code>
                              <span style={{ fontSize: 12, color: "#666", display: "block", marginTop: 2 }}>
                                {fn.description}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{ background: "#f0fff4", border: "1px solid #a0d8b0", borderRadius: 8, padding: "10px 12px" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#2a6e40" }}>💡 Tip: </span>
                      <span style={{ fontSize: 13, color: "#2a6e40" }}>{(fileDetail as any).tip}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "#c00", fontSize: 13 }}>{(fileDetail as any)?.error || "Failed to load"}</div>
                )}
              </Card>
            )}
          </div>
        </div>
      )}

      <style>{`
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
    </main>
  );
}

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`${styles.card} ${className || ""}`}>
      <h2 className={styles.cardTitle}>{title}</h2>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className={styles.label}>{children}</span>
  );
}
