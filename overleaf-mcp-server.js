#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import { readFile, writeFile as fsWriteFile } from 'fs/promises';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const exec = promisify(execCallback);

// Load projects configuration
let projectsConfig;
try {
  const configPath = path.join(__dirname, 'projects.json');
  const configData = await readFile(configPath, 'utf-8');
  projectsConfig = JSON.parse(configData);
} catch (error) {
  console.error('Error loading projects.json:', error.message);
  console.error('Please create projects.json from projects.example.json');
  process.exit(1);
}

// Git operations helper
class OverleafGitClient {
  constructor(projectId, gitToken) {
    this.projectId = projectId;
    this.gitToken = gitToken;
    this.repoPath = path.join(os.tmpdir(), `overleaf-${projectId}`);
    this.gitUrl = `https://git.overleaf.com/${projectId}`;
    this._lastPull = 0;
    this._fileHashes = new Map(); // track file content hashes for diff detection
    // Only sync these file types (skip images, PDFs, etc.)
    this._textPatterns = ['*.tex', '*.bib', '*.bst', '*.cls', '*.sty', '*.bbl', '*.cfg'];
  }

  // Compute hash of file content for change detection
  _hashContent(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  // Configure sparse checkout to only pull text files
  async _setupSparseCheckout() {
    const patterns = this._textPatterns.join('\n');
    await exec(`cd "${this.repoPath}" && git sparse-checkout init --cone`);
    await exec(`cd "${this.repoPath}" && git sparse-checkout set --no-cone ${this._textPatterns.join(' ')}`);
  }

  // Full pull - always hits the network
  async _forcePull() {
    try {
      await exec(`test -d "${this.repoPath}/.git"`);
      const { stdout } = await exec(`cd "${this.repoPath}" && git pull`, {
        env: { ...process.env, GIT_ASKPASS: 'echo', GIT_PASSWORD: this.gitToken }
      });
      this._lastPull = Date.now();
      return stdout;
    } catch {
      // Clone with no-checkout first, then set up sparse checkout
      await exec(
        `git clone --no-checkout https://git:${this.gitToken}@git.overleaf.com/${this.projectId} "${this.repoPath}"`
      );
      await this._setupSparseCheckout();
      const { stdout } = await exec(`cd "${this.repoPath}" && git checkout`);
      this._lastPull = Date.now();
      return stdout;
    }
  }

  // Smart pull - skip if pulled recently (for write operations that don't need latest)
  async _ensureRepo() {
    try {
      await exec(`test -d "${this.repoPath}/.git"`);
    } catch {
      await this._forcePull();
    }
  }

  // Read operations: always pull to get latest from Overleaf
  async cloneOrPull() {
    await this._forcePull();
  }

  async listFiles(extension = '') {
    await this.cloneOrPull();
    // If no extension specified, list all text files that were checked out
    const extFilter = extension || '.tex';
    const { stdout } = await exec(
      `cd "${this.repoPath}" && git ls-files -- "*${extFilter}"`
    );
    return stdout
      .split('\n')
      .filter(f => f);
  }

  // List all synced text files (tex + bib + style files)
  async listAllTextFiles() {
    await this.cloneOrPull();
    const patterns = this._textPatterns.map(p => `"${p}"`).join(' ');
    const { stdout } = await exec(
      `cd "${this.repoPath}" && git ls-files -- ${this._textPatterns.join(' ')}`
    );
    return stdout
      .split('\n')
      .filter(f => f);
  }

  async readFile(filePath) {
    await this.cloneOrPull();
    const fullPath = path.join(this.repoPath, filePath);
    const content = await readFile(fullPath, 'utf-8');
    const hash = this._hashContent(content);
    const prevHash = this._fileHashes.get(filePath);
    this._fileHashes.set(filePath, hash);

    // First read or content changed: return full content
    if (!prevHash || prevHash !== hash) {
      return { content, changed: true, isFirstRead: !prevHash };
    }

    // No changes since last read
    return { content: null, changed: false, isFirstRead: false };
  }

  // Read file with diff: returns only what changed since last read
  async readFileSmart(filePath) {
    const result = await this.readFile(filePath);

    if (result.isFirstRead) {
      return `[Full content - first read]\n${result.content}`;
    }

    if (!result.changed) {
      return `[No changes since last read]`;
    }

    // Content changed - try to get a diff
    try {
      const { stdout } = await exec(
        `cd "${this.repoPath}" && git diff HEAD~1 -- "${filePath}"`,
        { maxBuffer: 1024 * 1024 }
      );
      if (stdout.trim()) {
        return `[Changed - diff follows]\n${stdout}`;
      }
    } catch {
      // diff failed, fall through to full content
    }

    return `[Changed - full content]\n${result.content}`;
  }

  // Read full content (bypass diff, for when full content is explicitly needed)
  async readFileFull(filePath) {
    await this.cloneOrPull();
    const fullPath = path.join(this.repoPath, filePath);
    const content = await readFile(fullPath, 'utf-8');
    const hash = this._hashContent(content);
    this._fileHashes.set(filePath, hash);
    return content;
  }

  async getSections(filePath) {
    const content = await this.readFileFull(filePath);
    const sections = [];
    const sectionRegex = /\\(?:section|subsection|subsubsection)\{([^}]+)\}/g;
    let match;

    while ((match = sectionRegex.exec(content)) !== null) {
      sections.push({
        title: match[1],
        type: match[0].split('{')[0].replace('\\', ''),
        index: match.index
      });
    }

    return sections;
  }

  // Write operations: no pull needed, write directly to local repo
  async writeFile(filePath, content) {
    await this._ensureRepo();
    const fullPath = path.join(this.repoPath, filePath);
    await fsWriteFile(fullPath, content, 'utf-8');
    // Update hash cache
    this._fileHashes.set(filePath, this._hashContent(content));
    return `File written: ${filePath}`;
  }

  // Patch operation: replace specific text in a file without full content transfer
  async patchFile(filePath, oldText, newText) {
    await this._ensureRepo();
    const fullPath = path.join(this.repoPath, filePath);
    const content = await readFile(fullPath, 'utf-8');

    const occurrences = content.split(oldText).length - 1;
    if (occurrences === 0) {
      throw new Error(`Text to replace not found in ${filePath}`);
    }
    if (occurrences > 1) {
      throw new Error(`Found ${occurrences} occurrences of the text in ${filePath}. Please provide a more specific match (include surrounding context).`);
    }

    const newContent = content.replace(oldText, newText);
    await fsWriteFile(fullPath, newContent, 'utf-8');
    this._fileHashes.set(filePath, this._hashContent(newContent));
    return `Patched ${filePath}: replaced 1 occurrence (${oldText.length} chars → ${newText.length} chars)`;
  }

  // Push: pull first to avoid conflicts, then commit and push
  async commitAndPush(message = 'Update from Claude Code') {
    // Always pull before push to detect conflicts
    await this._forcePull();

    // Check if there are changes to commit
    const { stdout: status } = await exec(`cd "${this.repoPath}" && git status --porcelain`);
    if (!status.trim()) {
      return 'No changes to commit.';
    }

    // Show what will be committed
    const { stdout: diffStat } = await exec(`cd "${this.repoPath}" && git diff --stat`);

    const { stdout } = await exec(
      `cd "${this.repoPath}" && git add -A && git commit -m "${message.replace(/"/g, '\\"')}" && git push https://git:${this.gitToken}@git.overleaf.com/${this.projectId}`,
    );
    return `${diffStat}\n${stdout}`;
  }

  async getSectionContent(filePath, sectionTitle) {
    const content = await this.readFileFull(filePath);
    const sections = [];
    const sectionRegex = /\\(?:section|subsection|subsubsection)\{([^}]+)\}/g;
    let match;
    while ((match = sectionRegex.exec(content)) !== null) {
      sections.push({
        title: match[1],
        type: match[0].split('{')[0].replace('\\', ''),
        index: match.index
      });
    }

    const targetSection = sections.find(s => s.title === sectionTitle);
    if (!targetSection) {
      throw new Error(`Section "${sectionTitle}" not found`);
    }

    const nextSection = sections.find(s => s.index > targetSection.index);
    const startIdx = targetSection.index;
    const endIdx = nextSection ? nextSection.index : content.length;

    return content.substring(startIdx, endIdx);
  }

  // Get diff stat for status summary
  async getDiffStat() {
    await this._ensureRepo();
    try {
      const { stdout: staged } = await exec(`cd "${this.repoPath}" && git diff --stat`);
      const { stdout: untracked } = await exec(`cd "${this.repoPath}" && git status --porcelain`);
      return { staged: staged.trim(), untracked: untracked.trim() };
    } catch {
      return { staged: '', untracked: '' };
    }
  }
}

// Create MCP server
const server = new Server(
  {
    name: 'overleaf-mcp-server',
    version: '1.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper to get project
function getProject(projectName = 'default') {
  const project = projectsConfig.projects[projectName];
  if (!project) {
    throw new Error(`Project "${projectName}" not found in configuration`);
  }
  return new OverleafGitClient(project.projectId, project.gitToken);
}

// List all tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_projects',
        description: 'List all configured Overleaf projects',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_files',
        description: 'List text files in an Overleaf project (only .tex, .bib, .bst, .cls, .sty files are synced; images and PDFs are skipped)',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: {
              type: 'string',
              description: 'Project identifier (optional, defaults to "default")',
            },
            extension: {
              type: 'string',
              description: 'File extension filter (optional, e.g., ".tex", ".bib"). Leave empty to list all text files.',
            },
          },
        },
      },
      {
        name: 'read_file',
        description: 'Read a file from an Overleaf project. Returns only the diff if the file was read before and has changes. Use mode="full" to force full content.',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Path to the file',
            },
            projectName: {
              type: 'string',
              description: 'Project identifier (optional)',
            },
            mode: {
              type: 'string',
              enum: ['smart', 'full'],
              description: 'Read mode: "smart" returns diff if previously read (default), "full" always returns complete content',
            },
          },
          required: ['filePath'],
        },
      },
      {
        name: 'get_sections',
        description: 'Get all sections from a LaTeX file',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Path to the LaTeX file',
            },
            projectName: {
              type: 'string',
              description: 'Project identifier (optional)',
            },
          },
          required: ['filePath'],
        },
      },
      {
        name: 'get_section_content',
        description: 'Get content of a specific section',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Path to the LaTeX file',
            },
            sectionTitle: {
              type: 'string',
              description: 'Title of the section',
            },
            projectName: {
              type: 'string',
              description: 'Project identifier (optional)',
            },
          },
          required: ['filePath', 'sectionTitle'],
        },
      },
      {
        name: 'write_file',
        description: 'Write content to a file in an Overleaf project (does not auto-push). Does NOT pull from Overleaf first, so use read_file before if you need the latest version.',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Path to the file',
            },
            content: {
              type: 'string',
              description: 'Complete content to write',
            },
            projectName: {
              type: 'string',
              description: 'Project identifier (optional)',
            },
          },
          required: ['filePath', 'content'],
        },
      },
      {
        name: 'patch_file',
        description: 'Replace specific text in a file without transferring the full content. Much more token-efficient than write_file for small edits. The old_text must match exactly one location in the file.',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Path to the file',
            },
            oldText: {
              type: 'string',
              description: 'Exact text to find and replace (must be unique in the file)',
            },
            newText: {
              type: 'string',
              description: 'Text to replace it with',
            },
            projectName: {
              type: 'string',
              description: 'Project identifier (optional)',
            },
          },
          required: ['filePath', 'oldText', 'newText'],
        },
      },
      {
        name: 'push_changes',
        description: 'Commit and push all changes to Overleaf. Pulls latest changes first to avoid conflicts.',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Commit message',
            },
            projectName: {
              type: 'string',
              description: 'Project identifier (optional)',
            },
          },
        },
      },
      {
        name: 'status_summary',
        description: 'Get a comprehensive project status summary including local changes (git diff stat)',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: {
              type: 'string',
              description: 'Project identifier (optional)',
            },
          },
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'list_projects': {
        const projects = Object.entries(projectsConfig.projects).map(([key, project]) => ({
          id: key,
          name: project.name,
          projectId: project.projectId,
        }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(projects, null, 2),
            },
          ],
        };
      }

      case 'list_files': {
        const client = getProject(args.projectName);
        const files = await client.listFiles(args.extension || '.tex');
        return {
          content: [
            {
              type: 'text',
              text: files.join('\n'),
            },
          ],
        };
      }

      case 'read_file': {
        const client = getProject(args.projectName);
        const mode = args.mode || 'smart';
        let text;
        if (mode === 'full') {
          text = await client.readFileFull(args.filePath);
        } else {
          text = await client.readFileSmart(args.filePath);
        }
        return {
          content: [
            {
              type: 'text',
              text,
            },
          ],
        };
      }

      case 'get_sections': {
        const client = getProject(args.projectName);
        const sections = await client.getSections(args.filePath);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(sections, null, 2),
            },
          ],
        };
      }

      case 'get_section_content': {
        const client = getProject(args.projectName);
        const content = await client.getSectionContent(args.filePath, args.sectionTitle);
        return {
          content: [
            {
              type: 'text',
              text: content,
            },
          ],
        };
      }

      case 'write_file': {
        const client = getProject(args.projectName);
        const result = await client.writeFile(args.filePath, args.content);
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      }

      case 'patch_file': {
        const client = getProject(args.projectName);
        const result = await client.patchFile(args.filePath, args.oldText, args.newText);
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      }

      case 'push_changes': {
        const client = getProject(args.projectName);
        const result = await client.commitAndPush(args.message || 'Update from Claude Code');
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      }

      case 'status_summary': {
        const client = getProject(args.projectName);
        const files = await client.listAllTextFiles();
        const mainFile = files.find(f => f.includes('main.tex')) || files[0];
        let sections = [];

        if (mainFile) {
          sections = await client.getSections(mainFile);
        }

        const diffStat = await client.getDiffStat();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                totalFiles: files.length,
                mainFile,
                totalSections: sections.length,
                files: files.slice(0, 10),
                localChanges: diffStat.staged || 'No local changes',
                untrackedFiles: diffStat.untracked || 'None',
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Overleaf MCP server v1.1.0 running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
