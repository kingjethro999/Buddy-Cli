# 🤖 Buddy CLI

> Your AI-powered terminal assistant — answer questions, run commands, manage files, take notes, and more.

## Installation

```bash
pnpm add -g buddy-cli
```

## Quick Start

```bash
buddy go
```

This opens a persistent, AI-powered session right in your terminal. Ask anything, run commands, manage files — Buddy is your all-in-one terminal companion.

## Commands

| Command | Description |
|---|---|
| `buddy go` | Start an interactive AI session |
| `buddy note <text>` | Save a quick note |
| `buddy notes` | List all saved notes |
| `buddy config` | View/update configuration |
| `buddy session` | View/manage session memory |

## In-Session Commands

Once inside `buddy go`, use these slash commands:

| Command | Description |
|---|---|
| `/help` | Show available commands |
| `/run <cmd>` | Execute a system command |
| `/note <text>` | Save a quick note |
| `/notes` | List saved notes |
| `/session` | Show session memory |
| `/clear` | Clear the terminal |
| `/reset` | Reset chat history |
| `/exit` | Exit Buddy |

Or just type anything to chat with the AI!

## Features

- 🧠 **AI-Powered** — Powered by Google Gemini for intelligent conversations
- 💾 **Session Memory** — Remembers your context across all sessions
- 🔧 **Command Execution** — Suggests and runs system commands (with confirmation)
- 📁 **File Management** — Read, write, search, and manage files anywhere
- 📝 **Notes** — Save and search notes with tags
- 🌍 **Cross-Platform** — Works on Linux, macOS, and Windows
- 🎨 **Beautiful UI** — Rich terminal styling with colors and markdown rendering

## Configuration

```bash
# Set your Gemini API key
buddy config --key YOUR_API_KEY

# Change AI model
buddy config --model gemini-2.0-flash

# View current config
buddy config --show
```

## Session Memory

Buddy remembers you across sessions via `~/.buddy/session.md`. This file stores:
- Your preferences
- Recent interaction summaries
- Task context

To clear session memory:
```bash
buddy session --clear
```

## License

MIT
