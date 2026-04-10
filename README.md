# 🍃 Overleaf Claude MCP

> 🤖 Let Claude **read, write, and push** your Overleaf LaTeX projects — all from the chat.

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkw0IDdWMTdMMTIgMjJMMjAgMTdWN0wxMiAyWiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An MCP (Model Context Protocol) server that connects **Claude Code / Claude Desktop** with your **Overleaf** projects.

---

## 🆚 What's New vs [mjyoo2/OverleafMCP](https://github.com/mjyoo2/OverleafMCP)

The original [OverleafMCP](https://github.com/mjyoo2/OverleafMCP) is **read-only** — you can view your files but can't change anything. This fork adds **full write support**:

| Capability | mjyoo2/OverleafMCP | ✨ This Project |
|:-----------|:------------------:|:---------------:|
| 📖 Read files from Overleaf | ✅ | ✅ |
| 📑 Parse LaTeX sections | ✅ | ✅ |
| 📋 List projects & files | ✅ | ✅ |
| 📊 Project status summary | ✅ | ✅ |
| ✏️ **Write / edit files** | ❌ | ✅ **NEW** |
| 🚀 **Commit & push to Overleaf** | ❌ | ✅ **NEW** |

> 💡 With write + push, Claude becomes a **full co-author** — it can read your paper, make edits, and push them back to Overleaf in one conversation.

---

## 🛠️ All Available Tools

| Tool | Description |
|:-----|:------------|
| 📋 `list_projects` | List all configured Overleaf projects |
| 📂 `list_files` | List files in a project (filter by extension) |
| 📖 `read_file` | Read any file from your Overleaf project |
| 📑 `get_sections` | Extract all section/subsection headings from a LaTeX file |
| 🔍 `get_section_content` | Get content of a specific section by title |
| ✏️ `write_file` | Write/update a file in the project **(NEW)** |
| 🚀 `push_changes` | Commit and push changes back to Overleaf **(NEW)** |
| 📊 `status_summary` | Get a quick overview of the project |

---

## 📋 Prerequisites

- 📦 **Node.js** >= 18
- 🔧 **Git** installed on your system
- 🍃 An **Overleaf** account with Git integration enabled

---

## 🚀 Setup

### Step 1: Clone this repo

```bash
git clone https://github.com/Junfei-Z/overleaf-claude-mcp.git
cd overleaf-claude-mcp
npm install
```

### Step 2: Get your Overleaf credentials

You need two things from Overleaf:

#### 🔑 Project ID

1. Open your project in Overleaf
2. Look at the browser URL:
   ```
   https://www.overleaf.com/project/64a1b2c3d4e5f6a7b8c9d0e1
                                     ^^^^^^^^^^^^^^^^^^^^^^^^
                                     This is your Project ID
   ```

#### 🔐 Git Token

1. Go to [Overleaf Account Settings](https://www.overleaf.com/user/settings)
2. Scroll to the **Git Integration** section
3. Click **Create token**
4. Copy the token (it starts with `olp_...`)

> ⚠️ **Important:** Keep your Git Token private. Never commit it to version control.

### Step 3: Configure your project(s)

```bash
cp projects.example.json projects.json
```

Edit `projects.json` with your credentials:

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

📚 You can add **multiple projects**:

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

### Step 4: Connect to Claude

#### 💻 Option A: Claude Code (CLI / IDE extension)

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

#### 🖥️ Option B: Claude Desktop

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

Once connected, you can ask Claude things like:

### 📖 Reading

> "List all files in my Overleaf project"

> "Read main.tex from my Overleaf project"

> "Show me all the sections in my paper"

> "Get the content of the Introduction section"

### ✏️ Writing (NEW!)

> "Add a new paragraph to the Related Work section"

> "Fix the typo in line 42 of main.tex"

> "Rewrite the abstract to be more concise"

> "Push the changes to Overleaf with commit message 'Updated abstract'"

### 🔄 Typical Workflow

```
You:    💬 "Read main.tex from my Overleaf project"
Claude: 📖 [reads the file via MCP]

You:    💬 "Rewrite the introduction to emphasize our main contribution"
Claude: ✏️ [rewrites and calls write_file]

You:    💬 "Push to Overleaf"
Claude: 🚀 [calls push_changes, changes appear in Overleaf]
```

After pushing, open Overleaf in your browser — the changes will be there! ✅

---

## 📚 Multi-Project Usage

When using multiple projects, specify which one:

> "Read main.tex from project paper2"

> "List files in my PhD Thesis project"

The `projectName` parameter matches the key in your `projects.json` (e.g., `"default"`, `"paper2"`).

---

## 🔒 Security

- 🛡️ `projects.json` is in `.gitignore` and will **never** be committed
- 🔑 Git tokens are only used locally to communicate with Overleaf's Git bridge
- 🔄 You can rotate your token anytime in [Overleaf Account Settings](https://www.overleaf.com/user/settings)

---

## ❓ Troubleshooting

| Problem | Solution |
|:--------|:---------|
| 🔌 MCP server not showing up | Make sure you restarted Claude Code / Claude Desktop after editing config |
| ⚙️ `Error loading projects.json` | Run `cp projects.example.json projects.json` and fill in your credentials |
| 🔗 Git clone fails | Double-check your project ID and git token |
| 🚫 Push fails | Make sure your git token has write access; check if someone else is editing the same file on Overleaf |

---

## 🙏 Credits

- 📦 Original read-only MCP server: [mjyoo2/OverleafMCP](https://github.com/mjyoo2/OverleafMCP)
- ✨ Write/push functionality added by [Junfei-Z](https://github.com/Junfei-Z) with Claude Code

---

## 📄 License

MIT
