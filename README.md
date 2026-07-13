# RepoExplainer 🔍

An AI-powered web application that automatically analyzes any public GitHub repository and generates structured, adaptive explanations tailored to the user's expertise level.

> Paste a GitHub URL → Get a complete explanation in seconds.

---

## 🎯 Problem Statement

Understanding a new GitHub repository is time-consuming and frustrating:
- READMEs are often incomplete or too technical
- There's no explanation of what each file actually does
- Beginners and experts need completely different explanations — but get the same one
- Onboarding to a new codebase can take hours or even days

**RepoExplainer solves all of this automatically.**

---

## ✨ Key Features

- **🔗 One-click analysis** — Paste any public GitHub URL and get a full explanation instantly
- **🧠 Adaptive explanations** — Choose Beginner, Intermediate, or Advanced — the same repo is explained differently based on your level
- **📁 File-level explainability** — Click any file to get a deep breakdown of what it does, its key functions, and dependencies
- **📋 Structured output** — Every repo is explained in a consistent format: summary, tech stack, setup steps, and file explanations
- **⚡ Fast responses** — Powered by Groq's LLaMA 3.3 70B model for near-instant AI responses

---

## 🚀 Novelty (Research Contributions)

This project introduces four novel contributions to automated code documentation:

| Contribution | Description |
|---|---|
| **Multi-source understanding** | Combines README, file tree, and code — not just one source |
| **Adaptive explanation levels** | Same repo, three completely different explanations based on user expertise |
| **File-level explainability** | Drill into any specific file for a detailed, structured breakdown |
| **Structured AI output** | Forces consistent, scannable output instead of free-form text |

---

## 🛠️ Tech Stack

- **Framework** — [Next.js 14](https://nextjs.org/) (App Router)
- **Language** — TypeScript
- **AI Model** — LLaMA 3.3 70B via [Groq API](https://console.groq.com/)
- **Data Source** — [GitHub REST API](https://docs.github.com/en/rest)
- **Styling** — Inline CSS / React

---

## 📁 Project Structure

```
repo-explainer/
├── app/
│   ├── page.tsx                  # Main UI — input, level selector, results display
│   └── api/
│       ├── analyze/
│       │   └── route.ts          # Core API — fetches GitHub data + calls Groq AI
│       ├── file/
│       │   └── route.ts          # File explainer — explains a single file on demand
│       └── test/
│           └── route.ts          # Diagnostic endpoint for testing API connections
├── lib/
│   ├── github.ts                 # GitHub REST API functions (README, file tree, file content)
│   ├── prompt.ts                 # Prompt builder — constructs adaptive AI instructions
│   └── types.ts                  # Shared TypeScript type definitions
├── .env.local                    # Environment variables (not committed)
├── next.config.js
└── package.json
```

---

## ⚙️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A free [Groq API key](https://console.groq.com/)

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/Jiya-png/repo-explainer.git
cd repo-explainer
```

**2. Install dependencies**
```bash
npm install
```

**3. Create your environment file**

Create a file called `.env.local` in the root of the project:
```
GROQ_API_KEY=your-groq-api-key-here
```

Get your free API key at [console.groq.com](https://console.groq.com/) → API Keys → Create API Key.

**4. Start the development server**
```bash
npm run dev
```

**5. Open the app**

Go to [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 How to Use

1. Paste any public GitHub repository URL (e.g. `https://github.com/srbhr/Resume-Matcher`)
2. Select your expertise level — **Beginner**, **Intermediate**, or **Advanced**
3. Click **Analyze Repo →**
4. Wait 10–15 seconds for the AI to analyze the repo
5. Browse the structured explanation — summary, tech stack, setup steps, and file list
6. Click **Explain →** on any file for a detailed file-level breakdown

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/analyze` | POST | Analyzes a full GitHub repo |
| `/api/file` | POST | Explains a single file from a repo |
| `/api/test` | GET | Tests Groq and GitHub API connections |

### `/api/analyze` Request Body
```json
{
  "url": "https://github.com/owner/repo",
  "level": "beginner"
}
```

### `/api/analyze` Response
```json
{
  "owner": "srbhr",
  "repo": "Resume-Matcher",
  "summary": "A tool that matches resumes to job descriptions using NLP...",
  "techStack": ["Python", "FastAPI", "React", "NLP"],
  "howToRun": ["Clone the repo", "Install dependencies", "Run the server"],
  "fileExplanations": [
    { "path": "main.py", "explanation": "Entry point of the application" }
  ],
  "keyInsight": "Uses vector embeddings to compare resume and job description similarity"
}
```

---

## 🌍 Deployment

This project is ready to deploy on [Vercel](https://vercel.com/) in 2 minutes:

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com/) and import your repository
3. Add your environment variable: `GROQ_API_KEY = your-key-here`
4. Click **Deploy**

---

## 🔒 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ Yes | Your Groq API key from console.groq.com |

> ⚠️ Never commit `.env.local` to GitHub. It is already listed in `.gitignore` by default when using `create-next-app`.

---

## 🧠 How It Works (Pipeline)

```
User Input (GitHub URL + level)
        ↓
GitHub Fetcher — fetches README, file tree, file contents via GitHub REST API
        ↓
Context Builder — merges sources into a structured, level-specific prompt
        ↓
Groq AI (LLaMA 3.3 70B) — generates explanation as structured JSON
        ↓
JSON Parser — cleans and validates the AI response
        ↓
Frontend UI — displays organized, interactive results
```

---

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

Built as a conference-level research project demonstrating adaptive, multi-source AI documentation generation for improved developer onboarding.

---

## ⭐ If this project helped you, give it a star!
