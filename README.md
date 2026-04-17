# Overleaf Claude MCP

> Let Claude **read, write, and push** your Overleaf LaTeX projects — all from the chat.

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkw0IDdWMTdMMTIgMjJMMjAgMTdWN0wxMiAyWiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An MCP (Model Context Protocol) server that connects **Claude Code / Claude Desktop** with your **Overleaf** projects.

---

## What's New in v1.1.0

### Performance Optimizations

- **Sparse checkout**: Only syncs text files (`.tex`, `.bib`, `.bst`, `.cls`, `.sty`). Images and PDFs are skipped, making clone/pull much faster.
- **Read/write separation**: Read operations pull the latest from Overleaf; write operations skip the pull and work locally. Push always pulls first to prevent conflicts.
- **Smart diff mode**: `read_file` returns only changes on subsequent reads instead of the full file, saving tokens significantly.
- **`patch_file` tool**: Replace specific text in a file without transferring the full content. Much more efficient for small edits.

### What's New vs [mjyoo2/OverleafMCP](https://github.com/mjyoo2/OverleafMCP)

The original [OverleafMCP](https://github.com/mjyoo2/OverleafMCP) is **read-only**. This fork adds **full write support** and **performance optimizations**:

| Capability | mjyoo2/OverleafMCP | This Project |
|:-----------|:------------------:|:---------------:|
| Read files from Overleaf | Yes | Yes |
| Parse LaTeX sections | Yes | Yes |
| List projects and files | Yes | Yes |
| Project status summary | Yes | Yes |
| **Write / edit files** | No | **Yes** |
| **Commit and push to Overleaf** | No | **Yes** |
| **Patch files (token-efficient edits)** | No | **Yes** |
| **Sparse checkout (skip images/PDFs)** | No | **Yes** |
| **Smart diff (return only changes)** | No | **Yes** |

---

## All Available Tools

| Tool | Description |
|:-----|:------------|
| `list_projects` | List all configured Overleaf projects |
| `list_files` | List text files in a project (images/PDFs are skipped) |
| `read_file` | Read a file. Smart mode returns only the diff on subsequent reads; use `mode="full"` for complete content |
| `get_sections` | Extract all section/subsection headings from a LaTeX file |
| `get_section_content` | Get content of a specific section by title |
| `write_file` | Write/update a file (does not pull first; use `read_file` before if you need the latest version) |
| `patch_file` | Replace specific text in a file without transferring full content **(New in v1.1.0)** |
| `push_changes` | Commit and push changes back to Overleaf (pulls first to prevent conflicts) |
| `status_summary` | Project overview including local changes (git diff stat) |

---

## Prerequisites

- **Node.js** >= 18
- **Git** installed on your system
- An **Overleaf** account with Git integration enabled

---

## Setup

### Step 1: Clone this repo

```bash
git clone https://github.com/Junfei-Z/overleaf-claude-mcp.git
cd overleaf-claude-mcp
npm install
```

### Step 2: Get your Overleaf credentials

You need two things from Overleaf:

#### Project ID

1. Open your project in Overleaf
2. Look at the browser URL:
   ```
   https://www.overleaf.com/project/64a1b2c3d4e5f6a7b8c9d0e1
                                     ^^^^^^^^^^^^^^^^^^^^^^^^
                                     This is your Project ID
   ```

#### Git Token

1. Go to [Overleaf Account Settings](https://www.overleaf.com/user/settings)
2. Scroll to the **Git Integration** section
3. Click **Create token**
4. Copy the token (it starts with `olp_...`)

> **Important:** Keep your Git Token private. Never commit it to version control.

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

### Step 4: Connect to Claude

#### Option A: Claude Code (CLI / IDE extension)

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

> **Important:** Claude Code only loads `.mcp.json` from the directory where you launch it. Make sure you start Claude Code in the same directory as your `.mcp.json`:
> ```bash
> cd /path/to/your/project   # where .mcp.json lives
> claude                     # start Claude Code here
> ```
> Alternatively, place it at `~/.claude/.mcp.json` for **global access** from any directory.

#### Option B: Claude Desktop

Edit your Claude Desktop config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

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

## Usage Examples

Once connected, you can ask Claude things like:

### Reading

> "List all files in my Overleaf project"

> "Read main.tex from my Overleaf project"

> "Show me all the sections in my paper"

> "Get the content of the Introduction section"

### Writing

> "Add a new paragraph to the Related Work section"

> "Fix the typo in line 42 of main.tex"

> "Rewrite the abstract to be more concise"

> "Push the changes to Overleaf with commit message 'Updated abstract'"

### Token-efficient editing (v1.1.0)

> "Patch main.tex: replace 'old title' with 'new title'"

The `patch_file` tool only transfers the specific text being changed, not the entire file.

### Typical Workflow

```
You:    "Read main.tex from my Overleaf project"
Claude: [reads the file via MCP - first read returns full content]

You:    "Rewrite the introduction to emphasize our main contribution"
Claude: [uses patch_file to replace just the introduction text]

You:    "Read main.tex again"
Claude: [smart mode: returns only the diff, not the full file]

You:    "Push to Overleaf"
Claude: [pulls latest, commits, and pushes - changes appear in Overleaf]
```

---

## How Sparse Checkout Works

To minimize sync time and bandwidth, the MCP server uses **git sparse checkout** to only download text files from your Overleaf project:

**Synced:** `.tex`, `.bib`, `.bst`, `.cls`, `.sty`, `.bbl`, `.cfg`

**Skipped:** `.png`, `.jpg`, `.pdf`, `.eps`, and all other binary files

This means:
- Clone and pull operations are much faster, especially for projects with many figures
- You can still reference images in your LaTeX code (they exist on Overleaf), they just won't be downloaded locally
- To add or modify images, use the Overleaf web editor directly

---

## Multi-Project Usage

When using multiple projects, specify which one:

> "Read main.tex from project paper2"

> "List files in my PhD Thesis project"

The `projectName` parameter matches the key in your `projects.json` (e.g., `"default"`, `"paper2"`).

---

## Security

- `projects.json` is in `.gitignore` and will **never** be committed
- Git tokens are only used locally to communicate with Overleaf's Git bridge
- You can rotate your token anytime in [Overleaf Account Settings](https://www.overleaf.com/user/settings)

---

## Troubleshooting

| Problem | Solution |
|:--------|:---------|
| MCP server not showing up | Make sure you restarted Claude Code / Claude Desktop after editing config |
| `Error loading projects.json` | Run `cp projects.example.json projects.json` and fill in your credentials |
| Git clone fails | Double-check your project ID and git token |
| Push fails | Make sure your git token has write access; check if someone else is editing the same file on Overleaf |
| File not found after sparse checkout | Only text files are synced. Images and PDFs are skipped by design |

---

## Credits

- Original read-only MCP server: [mjyoo2/OverleafMCP](https://github.com/mjyoo2/OverleafMCP)
- Write/push functionality and performance optimizations by [Junfei-Z](https://github.com/Junfei-Z) with Claude Code

---

## License

MIT
