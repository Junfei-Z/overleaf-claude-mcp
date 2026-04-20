# 📝 Overleaf Claude MCP

> ✨ Let Claude **read, write, and push** your Overleaf LaTeX projects — all from the chat, with minimum tokens.

<p align="center">
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white" alt="Node.js"></a>
  <a href="https://modelcontextprotocol.io/"><img src="https://img.shields.io/badge/MCP-Compatible-0A84FF?logo=anthropic&logoColor=white" alt="MCP Compatible"></a>
  <a href="https://claude.ai/"><img src="https://img.shields.io/badge/Claude-Code%20%7C%20Desktop-D97706?logo=anthropic&logoColor=white" alt="Claude"></a>
  <a href="https://www.overleaf.com/"><img src="https://img.shields.io/badge/Overleaf-Git%20Bridge-47A141?logo=overleaf&logoColor=white" alt="Overleaf"></a>
  <a href="https://www.latex-project.org/"><img src="https://img.shields.io/badge/LaTeX-Project-008080?logo=latex&logoColor=white" alt="LaTeX"></a>
  <a href="https://github.com/Junfei-Z/overleaf-claude-mcp/releases"><img src="https://img.shields.io/badge/version-1.1.0-blueviolet" alt="Version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT License"></a>
  <a href="https://github.com/Junfei-Z/overleaf-claude-mcp/stargazers"><img src="https://img.shields.io/github/stars/Junfei-Z/overleaf-claude-mcp?style=social" alt="GitHub stars"></a>
</p>

An MCP (Model Context Protocol) server that connects **Claude Code / Claude Desktop** with your **Overleaf** projects — built for real LaTeX workflows where every token counts.

---

## ⚡ Why This MCP?

Large LaTeX files (a thesis `main.tex` is often **80–100 KB / ~35K tokens**) make naive MCP workflows expensive: every "rewrite this section" would normally force Claude to emit the full file again.

**v1.1.0 fixes that.** Three optimizations give you order-of-magnitude token savings on real editing sessions:

| Scenario | Naive MCP | **This MCP (v1.1.0)** | Saving |
|:---------|:---------:|:---------------------:|:------:|
| Read a 35K-token file twice | 70K tokens | **~35K + diff** | 🟢 ~50% |
| Replace a 50-word sentence | 35K tokens | **~100 tokens** (`patch_file`) | 🟢 >99% |
| Clone a repo with many figures | Minutes, hundreds of MB | **Seconds, text files only** | 🟢 Fast |
| Edit same file across a chat | Full file per turn | **Only the diff** | 🟢 Steady |

---

## 🎯 What's New in v1.1.0

### 🚀 Performance Optimizations

- 🗜️ **Sparse checkout** — Only syncs text files (`.tex`, `.bib`, `.bst`, `.cls`, `.sty`, `.bbl`, `.cfg`). Images and PDFs are skipped, so clone and pull stay fast even on figure-heavy projects.
- 🔀 **Read/write separation** — Read operations pull the latest from Overleaf; write operations skip the pull and work locally. Push always pulls first to prevent conflicts.
- 🧠 **Smart diff mode** — `read_file` returns only the changes on subsequent reads instead of the full file. Your long chat session stops paying for the same content over and over.
- ✂️ **`patch_file` tool** — Replace specific text in a file without transferring the full content. The token cost scales with the **edit size**, not the file size.

### 🆚 vs [`mjyoo2/OverleafMCP`](https://github.com/mjyoo2/OverleafMCP)

The upstream [OverleafMCP](https://github.com/mjyoo2/OverleafMCP) is **read-only**. This fork adds **full write support** and the **performance optimizations** above:

| Capability | `mjyoo2/OverleafMCP` | **This Project** |
|:-----------|:--------------------:|:----------------:|
| 📖 Read files from Overleaf | ✅ | ✅ |
| 🧩 Parse LaTeX sections | ✅ | ✅ |
| 📂 List projects and files | ✅ | ✅ |
| 📊 Project status summary | ✅ | ✅ |
| 📝 **Write / edit files** | ❌ | ✅ |
| 🚢 **Commit and push to Overleaf** | ❌ | ✅ |
| ✂️ **Patch files (token-efficient edits)** | ❌ | ✅ |
| 🗜️ **Sparse checkout (skip images/PDFs)** | ❌ | ✅ |
| 🧠 **Smart diff (return only changes)** | ❌ | ✅ |

---

## 🛠️ All Available Tools

| Tool | What it does |
|:-----|:-------------|
| 📂 `list_projects` | List all configured Overleaf projects |
| 📄 `list_files` | List text files in a project (images / PDFs skipped by design) |
| 📖 `read_file` | Read a file. Smart mode returns only the diff on subsequent reads; pass `mode="full"` for full content |
| 🧩 `get_sections` | Extract all section / subsection headings from a LaTeX file — no need to read the body |
| 🔍 `get_section_content` | Get the body of one specific section by title |
| 📝 `write_file` | Write a full file (does not auto-pull; use `read_file` first if you need the latest) |
| ✂️ `patch_file` | **⭐ v1.1.0** Replace specific text without transferring the whole file |
| 🚢 `push_changes` | Commit and push to Overleaf. Always pulls first to avoid conflicts |
| 📊 `status_summary` | Project overview including local changes (`git diff --stat`) |

---

## 📋 Prerequisites

- 🟢 **Node.js** ≥ 18
- 🔧 **Git** installed on your system
- 📘 An **Overleaf** account with Git integration enabled

---

## 🚀 Setup

### 1. Clone this repo

```bash
git clone https://github.com/Junfei-Z/overleaf-claude-mcp.git
cd overleaf-claude-mcp
npm install
```

### 2. Get your Overleaf credentials

You need two things:

#### 🆔 Project ID

Open your project in Overleaf and look at the URL:

```
https://www.overleaf.com/project/64a1b2c3d4e5f6a7b8c9d0e1
                                  ^^^^^^^^^^^^^^^^^^^^^^^^
                                     This is your Project ID
```

#### 🔑 Git Token

1. Go to [Overleaf Account Settings](https://www.overleaf.com/user/settings)
2. Scroll to the **Git Integration** section
3. Click **Create token**
4. Copy the token (it starts with `olp_...`)

> ⚠️ **Keep your Git Token private.** Never commit it to version control.

### 3. Configure your project(s)

```bash
cp projects.example.json projects.json
```

Edit `projects.json`:

```json
{
  "projects": {
    "default": {
      "name": "My Paper",
      "projectId": "64a1b2c3d4e5f6a7b8c9d0e1",
      "gitToken": "olp_xxxxxxxxxxxxxxxxxxxx"
    }
  }
}
```

You can add **multiple projects**:

```json
{
  "projects": {
    "default": {
      "name": "PhD Thesis",
      "projectId": "64a1b2c3d4e5f6a7b8c9d0e1",
      "gitToken": "olp_xxxxxxxxxxxxxxxxxxxx"
    },
    "paper2": {
      "name": "Conference Paper",
      "projectId": "75b2c3d4e5f6a7b8c9d0e1f2",
      "gitToken": "olp_yyyyyyyyyyyyyyyyyyyy"
    }
  }
}
```

### 4. Connect to Claude

#### Option A — Claude Code (CLI / IDE extension)

Create or edit `.mcp.json` in your project directory (or `~/.claude/.mcp.json` for global access):

```json
{
  "mcpServers": {
    "overleaf": {
      "command": "node",
      "args": ["/absolute/path/to/overleaf-claude-mcp/overleaf-mcp-server.js"]
    }
  }
}
```

Then **restart Claude Code**.

> 💡 Claude Code only loads `.mcp.json` from the directory where you launch it. Either `cd` into that directory first, or place it at `~/.claude/.mcp.json` for global access:
> ```bash
> cd /path/to/your/project   # where .mcp.json lives
> claude                     # start Claude Code here
> ```

#### Option B — Claude Desktop

Edit your Claude Desktop config file:

- 🍎 **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- 🪟 **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "overleaf": {
      "command": "node",
      "args": ["/absolute/path/to/overleaf-claude-mcp/overleaf-mcp-server.js"]
    }
  }
}
```

Then **restart Claude Desktop**.

---

## 💬 Usage Examples

### 📖 Reading

> "List all files in my Overleaf project"

> "Read `main.tex` from my Overleaf project"

> "Show me all the sections in my paper"

> "Get the content of the Introduction section"

### ✏️ Writing

> "Add a new paragraph to the Related Work section"

> "Fix the typo in line 42 of `main.tex`"

> "Rewrite the abstract to be more concise"

> "Push the changes to Overleaf with commit message 'Update abstract'"

### ✂️ Token-efficient editing (v1.1.0 sweet spot)

> "Patch `main.tex`: replace 'old title' with 'new title'"

`patch_file` only transfers the specific text being changed, not the entire file. For a one-paragraph edit on a 35K-token thesis, that's the difference between **~35K tokens and ~200 tokens**.

### 🔁 Typical Workflow

```
You:    "Read main.tex from my Overleaf project"
Claude: [reads via MCP — first read returns full content]

You:    "Rewrite the introduction to emphasize our main contribution"
Claude: [uses patch_file to replace just the introduction text]

You:    "Read main.tex again"
Claude: [smart mode: returns only the diff since last read]

You:    "Push to Overleaf"
Claude: [pulls latest, commits, and pushes — changes appear in Overleaf]
```

---

## 🧭 Pairing with Direct `git` (Optional, for Power Users)

For very large files or team projects, you can pair this MCP with a **direct git clone** of the same Overleaf project. Both use the same Git bridge, so they stay consistent.

**When to use each tool:**

| Task | Best Tool |
|:-----|:----------|
| Discover projects, list files, get section structure | 🧩 **MCP** (`list_projects`, `list_files`, `get_sections`) |
| Small edits (one-paragraph or less) | ✂️ **MCP** `patch_file` |
| Short new files (bib entries, short fragments) | 📝 **MCP** `write_file` |
| Large rewrites (many sections of a long `main.tex`) | 🧰 **Direct git** — `git pull` → `Edit` locally → `git commit && git push` |
| Merging edits from web collaborators | 🔄 **Either** — both workflows resolve via git |

This way MCP handles the fast-path (discover + targeted edits), and direct git handles the heavy lifting, with no duplicated state.

### 📋 Drop-in `CLAUDE.md` Template

Claude Code automatically loads `CLAUDE.md` from your project root. Paste the template below to lock in the hybrid workflow. Replace the two placeholders with your own values (**never commit the filled-in file** — add `CLAUDE.md` to `.gitignore` if your token lives inside it).

```markdown
# Overleaf Workflow: MCP + Git Hybrid

This project's Overleaf (project id `<YOUR_PROJECT_ID>`) is synced via Git Bridge.
Use **MCP** for discovery and small edits; use **local git** for large-file edits.

Local clone: `/tmp/<project-name>-git` (clone once with the URL below).

Clone URL (do not commit this file if the token is filled in):
https://git:<YOUR_GIT_TOKEN>@git.overleaf.com/<YOUR_PROJECT_ID>

## Use MCP for (lightweight, cheap)
- `list_projects`, `list_files`, `get_sections`, `status_summary`
- `read_file` on short files
- `patch_file` for one-paragraph edits
- `write_file` only when the target file is < 5 KB

## Use local git for (large files, token-efficient)
- Edits to `main.tex` or any `.tex` > 5 KB
- Workflow:
  ```
  cd /tmp/<project-name>-git && git pull --rebase
  # Edit the file locally with the Edit tool
  git add -A && git commit -m "<specific message>" && git push
  ```

## Standard per-edit flow
1. `git pull --rebase` first (to merge any web edits)
2. Locate the change with Grep / get_sections — do NOT Read the whole file
3. Edit with str_replace (patch_file for MCP, Edit for git)
4. Commit with a specific message, then push

## Don't
- ❌ Use `write_file` to rewrite `main.tex`
- ❌ Read the whole `main.tex` (> 20 KB) into context
- ❌ `git push --force` on conflict — stop and ask instead
- ❌ Reflow unrelated paragraphs for cosmetic reasons

## Token self-check
If a single operation will read or write > 10 KB, announce the range first and
wait for confirmation.
```

> 🔐 **Security reminder:** the template contains placeholders `<YOUR_PROJECT_ID>` and `<YOUR_GIT_TOKEN>`. Put your real values locally, then **do not commit `CLAUDE.md` if it contains the token**. Add `CLAUDE.md` to `.gitignore`, or keep the token only in `projects.json` and reference it from `CLAUDE.md` by name.

---

## 🔧 How Sparse Checkout Works

To minimize sync time and bandwidth, the MCP server uses **git sparse checkout** to only download text files from your Overleaf project:

- ✅ **Synced:** `.tex`, `.bib`, `.bst`, `.cls`, `.sty`, `.bbl`, `.cfg`
- ❌ **Skipped:** `.png`, `.jpg`, `.pdf`, `.eps`, and all other binaries

This means:

- 🏎️ Clone and pull are much faster, especially for projects with many figures
- 🖼️ You can still reference images in your LaTeX code (they exist on Overleaf) — they just aren't downloaded locally
- 🎨 To add or modify images, use the Overleaf web editor directly

---

## 🤝 Multi-Project Usage

When using multiple projects, specify which one:

> "Read `main.tex` from project `paper2`"

> "List files in my PhD Thesis project"

The `projectName` parameter matches the key in your `projects.json` (e.g. `"default"`, `"paper2"`).

---

## 🔐 Security

- 🚫 `projects.json` is in `.gitignore` and will **never** be committed
- 🔒 Git tokens are only used locally to talk to Overleaf's Git bridge
- 🔄 You can rotate your token anytime in [Overleaf Account Settings](https://www.overleaf.com/user/settings)

---

## ❓ Troubleshooting

| Problem | Solution |
|:--------|:---------|
| MCP server not showing up | Restart Claude Code / Claude Desktop after editing config |
| `Error loading projects.json` | Run `cp projects.example.json projects.json` and fill in your credentials |
| Git clone fails | Double-check your project ID and git token |
| Push fails | Make sure your git token has write access; check if someone else is editing the same file on Overleaf |
| File not found after sparse checkout | Only text files are synced. Images and PDFs are skipped by design |
| Token usage still feels high | Use `patch_file` instead of `write_file` for small edits; let smart-diff `read_file` handle re-reads |

---

## 🌟 Credits

- Original read-only MCP server: [`mjyoo2/OverleafMCP`](https://github.com/mjyoo2/OverleafMCP)
- Write/push functionality and performance optimizations by [Junfei-Z](https://github.com/Junfei-Z) with Claude Code

---

## 📄 License

MIT — see [LICENSE](LICENSE).
