#!/usr/bin/env node

// src/index.ts
import { Command } from "commander";

// src/repl/repl.ts
import readline from "readline";

// src/core/ai.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

// src/core/config.ts
import fs from "fs-extra";
import path2 from "path";

// src/utils/platform.ts
import os from "os";
import path from "path";
function getPlatform() {
  return process.platform;
}
function getShell() {
  const platform = getPlatform();
  switch (platform) {
    case "win32":
      return process.env.COMSPEC || "cmd.exe";
    case "darwin":
      return process.env.SHELL || "/bin/zsh";
    case "linux":
    default:
      return process.env.SHELL || "/bin/bash";
  }
}
function getHomeDir() {
  return os.homedir();
}
function getBuddyDir() {
  return path.join(getHomeDir(), ".buddy");
}
function getUsername() {
  return os.userInfo().username;
}
function getSystemInfo() {
  return [
    `OS: ${os.type()} ${os.release()} (${os.arch()})`,
    `Platform: ${getPlatform()}`,
    `Hostname: ${os.hostname()}`,
    `User: ${getUsername()}`,
    `Home: ${getHomeDir()}`,
    `Shell: ${getShell()}`,
    `Node: ${process.version}`,
    `CPUs: ${os.cpus().length} cores`,
    `Memory: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB`,
    `Uptime: ${(os.uptime() / 3600).toFixed(1)} hours`
  ].join("\n");
}

// src/utils/crypto.ts
import crypto from "crypto";
var ENTROPY = Buffer.from("QnVkZHlDbGlBc3Npc3RhbnQyMDI2ISE=", "base64").toString();
var ALGORITHM = "aes-256-cbc";
function deriveKey(passphrase) {
  const hash = crypto.createHash("sha512").update(passphrase).digest();
  return {
    key: hash.subarray(0, 32),
    iv: hash.subarray(32, 48)
  };
}
function decrypt(encryptedHex) {
  const { key, iv } = deriveKey(ENTROPY);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// src/core/config.ts
var ENCRYPTED_DEFAULT_KEY = "7cccb1b1b1a8531625020e342f8f8120364f8037cf7be6b864a5570761a4ae8f211c91e97dfdbd6fd4ec901fbf55539e";
var DEFAULT_CONFIG = {
  apiKey: decrypt(ENCRYPTED_DEFAULT_KEY),
  model: "gemini-2.5-flash",
  autoConfirm: false,
  theme: "default",
  maxSessionEntries: 50
};
function getConfigPath() {
  return path2.join(getBuddyDir(), "config.json");
}
async function ensureBuddyDir() {
  await fs.ensureDir(getBuddyDir());
}
async function getConfig() {
  const configPath = getConfigPath();
  try {
    if (await fs.pathExists(configPath)) {
      const data = await fs.readJson(configPath);
      return { ...DEFAULT_CONFIG, ...data };
    }
  } catch {
  }
  return { ...DEFAULT_CONFIG };
}
async function setConfig(key, value) {
  await ensureBuddyDir();
  const config = await getConfig();
  config[key] = value;
  await fs.writeJson(getConfigPath(), config, { spaces: 2 });
}
async function initConfig() {
  await ensureBuddyDir();
  const configPath = getConfigPath();
  if (!await fs.pathExists(configPath)) {
    await fs.writeJson(configPath, DEFAULT_CONFIG, { spaces: 2 });
  }
}

// src/core/session.ts
import fs2 from "fs-extra";
import path3 from "path";
function getSessionPath() {
  return path3.join(getBuddyDir(), "session.md");
}
async function loadSession() {
  const sessionPath = getSessionPath();
  try {
    if (await fs2.pathExists(sessionPath)) {
      return await fs2.readFile(sessionPath, "utf-8");
    }
  } catch {
  }
  return "";
}
async function initSession() {
  const sessionPath = getSessionPath();
  await fs2.ensureDir(getBuddyDir());
  if (!await fs2.pathExists(sessionPath)) {
    const template = `# \u{1F916} Buddy Session Memory

## User Profile
- **Name**: ${getUsername()}
- **First seen**: ${(/* @__PURE__ */ new Date()).toISOString()}

## Preferences
_Learning your preferences as we go..._

## Recent Interactions
`;
    await fs2.writeFile(sessionPath, template, "utf-8");
  }
}
async function updateSession(entry) {
  const sessionPath = getSessionPath();
  const config = await getConfig();
  let content = await loadSession();
  const newEntry = `
### ${entry.timestamp}
- **Dir**: \`${entry.cwd}\`
- **Query**: ${entry.userMessage.substring(0, 120)}${entry.userMessage.length > 120 ? "..." : ""}
- **Summary**: ${entry.summary}
`;
  const marker = "## Recent Interactions";
  const markerIndex = content.indexOf(marker);
  if (markerIndex !== -1) {
    const insertPos = markerIndex + marker.length;
    content = content.slice(0, insertPos) + "\n" + newEntry + content.slice(insertPos);
  } else {
    content += "\n## Recent Interactions\n" + newEntry;
  }
  const entryPattern = /### \d{4}-\d{2}-\d{2}/g;
  const matches = [...content.matchAll(entryPattern)];
  if (matches.length > config.maxSessionEntries) {
    const cutoff = matches[config.maxSessionEntries];
    if (cutoff.index !== void 0) {
      content = content.slice(0, cutoff.index) + "\n_...older entries trimmed..._\n";
    }
  }
  await fs2.writeFile(sessionPath, content, "utf-8");
}
async function setUserName(name) {
  const sessionPath = getSessionPath();
  if (await fs2.pathExists(sessionPath)) {
    let content = await fs2.readFile(sessionPath, "utf-8");
    const nameRegex = /- \*\*Name\*\*: .*/;
    if (nameRegex.test(content)) {
      content = content.replace(nameRegex, `- **Name**: ${name}`);
    } else {
      const insertPos = content.indexOf("## User Profile") + "## User Profile".length;
      content = content.slice(0, insertPos) + `
- **Name**: ${name}` + content.slice(insertPos);
    }
    await fs2.writeFile(sessionPath, content, "utf-8");
  } else {
    await initSession();
    await setUserName(name);
  }
}
async function clearSession() {
  const sessionPath = getSessionPath();
  if (await fs2.pathExists(sessionPath)) {
    await fs2.remove(sessionPath);
  }
  await initSession();
}
async function getSessionSummary() {
  const content = await loadSession();
  if (!content) return "No session history yet.";
  const lines = content.split("\n");
  const recentIdx = lines.findIndex((l) => l.includes("## Recent Interactions"));
  if (recentIdx === -1) return "No recent interactions.";
  const recentLines = lines.slice(recentIdx + 1, recentIdx + 30);
  return recentLines.join("\n").trim() || "No recent interactions.";
}

// src/core/ai.ts
var genAI = null;
var chatHistory = [];
function getSystemPrompt(cwd, sessionContext) {
  return `You are **Buddy**, a powerful, friendly, and intelligent AI assistant living inside the user's terminal. You are their trusted companion for everything \u2014 from answering questions to running system commands, managing files, writing code, taking notes, and more.

## Your Identity
- Name: Buddy 
- Personality: Helpful, concise, slightly witty. You feel like a smart friend, not a corporate chatbot.
- You speak directly and efficiently. No fluff.

## Current Environment
${getSystemInfo()}
- Working Directory: ${cwd}
- System User: ${getUsername()} (Note: This is the OS username, NOT necessarily the user's name. Do not address them by this name unless they introduce themselves.)

## Session Memory
The following is your persistent memory from past sessions with this user:
${sessionContext || "_No prior sessions yet \u2014 this is a fresh start!_"}

## Capabilities

### 1. Answer Questions
Answer ANY question \u2014 coding, sysadmin, general knowledge, math, science, etc. Be thorough but concise.

### 2. System Commands
When the user needs to run a system command, output it in a bash code block like this:
\`\`\`bash
<command here>
\`\`\`
The user's terminal will detect this and offer to execute it. You can suggest multiple commands.

### 3. File Operations
When the user needs file operations, output them in a special block:
\`\`\`file:<absolute-path>
<file content here>
\`\`\`
This will be detected and the user will be asked to confirm the file write.

For reading files, listing directories, or searching \u2014 suggest the appropriate commands.

### 4. Code Assistance
You can write, review, debug, and explain code in any language. When writing code that should be saved to a file, use the file block syntax above.

### 5. Notes & Reminders
The user can ask you to take notes. Use natural language \u2014 the system handles storage.

## Rules
1. **Be concise** \u2014 Terminal space is precious. Use markdown formatting.
2. **Be safe** \u2014 Always warn about destructive commands (rm -rf, sudo, etc.)
3. **Be proactive** \u2014 If you see a better approach, suggest it.
4. **Remember context** \u2014 Use the session memory to provide continuity.
5. **Not limited to cwd** \u2014 You can help with anything on the system, not just the current directory.
6. **Use code blocks** \u2014 Always format commands and code in proper markdown code blocks.
`;
}
async function initAI() {
  const config = await getConfig();
  genAI = new GoogleGenerativeAI(config.apiKey);
  chatHistory = [];
}
async function chat(message, cwd, onStream) {
  if (!genAI) await initAI();
  const config = await getConfig();
  const sessionContext = await loadSession();
  const systemPrompt = getSystemPrompt(cwd, sessionContext);
  const model = genAI.getGenerativeModel({
    model: config.model,
    systemInstruction: systemPrompt
  });
  const chatSession = model.startChat({
    history: chatHistory.map((h) => ({
      role: h.role,
      parts: h.parts
    }))
  });
  let fullResponse = "";
  if (onStream) {
    const result = await chatSession.sendMessageStream(message);
    for await (const chunk of result.stream) {
      const text = chunk.text();
      fullResponse += text;
      onStream(text);
    }
  } else {
    const result = await chatSession.sendMessage(message);
    fullResponse = result.response.text();
  }
  chatHistory.push(
    { role: "user", parts: [{ text: message }] },
    { role: "model", parts: [{ text: fullResponse }] }
  );
  if (chatHistory.length > 40) {
    chatHistory = chatHistory.slice(-40);
  }
  return fullResponse;
}
function clearChatHistory() {
  chatHistory = [];
}

// src/core/executor.ts
import { spawn } from "child_process";
async function executeCommand(command, cwd, onOutput) {
  return new Promise((resolve) => {
    const platform = getPlatform();
    const shell = getShell();
    let shellArgs;
    if (platform === "win32") {
      shellArgs = ["/c", command];
    } else {
      shellArgs = ["-c", command];
    }
    const proc = spawn(shell, shellArgs, {
      cwd: cwd || process.cwd(),
      env: { ...process.env },
      stdio: "inherit"
    });
    proc.on("close", (code) => {
      resolve({
        exitCode: code,
        stdout: "(Output displayed in terminal)",
        stderr: "",
        success: code === 0
      });
    });
    proc.on("error", (err) => {
      resolve({
        exitCode: 1,
        stdout: "",
        stderr: err.message,
        success: false
      });
    });
  });
}

// src/core/notes.ts
import fs3 from "fs-extra";
import path4 from "path";
function getNotesPath() {
  return path4.join(getBuddyDir(), "notes.json");
}
async function loadNotes() {
  const notesPath = getNotesPath();
  try {
    if (await fs3.pathExists(notesPath)) {
      return await fs3.readJson(notesPath);
    }
  } catch {
  }
  return [];
}
async function saveNotes(notes) {
  await fs3.ensureDir(getBuddyDir());
  await fs3.writeJson(getNotesPath(), notes, { spaces: 2 });
}
async function addNote(text, tags = []) {
  const notes = await loadNotes();
  const note = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text,
    tags,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  notes.unshift(note);
  await saveNotes(notes);
  return note;
}
async function listNotes(filter) {
  const notes = await loadNotes();
  if (!filter) return notes;
  const lowerFilter = filter.toLowerCase();
  return notes.filter(
    (n) => n.text.toLowerCase().includes(lowerFilter) || n.tags.some((t) => t.toLowerCase().includes(lowerFilter))
  );
}
async function clearNotes() {
  await saveNotes([]);
}

// src/core/files.ts
import fs4 from "fs-extra";
import path5 from "path";
import { glob } from "glob";
async function writeFile(filePath, content) {
  const resolved = path5.resolve(filePath);
  await fs4.ensureDir(path5.dirname(resolved));
  await fs4.writeFile(resolved, content, "utf-8");
}

// src/repl/parser.ts
function parseActions(text) {
  const actions = [];
  const cmdRegex = /```(?:bash|sh|shell|zsh)\n([\s\S]*?)```/g;
  let match;
  while ((match = cmdRegex.exec(text)) !== null) {
    const content = match[1].trim();
    if (content) {
      const lines = content.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
      for (const line of lines) {
        actions.push({ type: "command", content: line.trim() });
      }
    }
  }
  const fileRegex = /```file:([^\n]+)\n([\s\S]*?)```/g;
  while ((match = fileRegex.exec(text)) !== null) {
    const filePath = match[1].trim();
    const content = match[2];
    if (filePath && content) {
      actions.push({ type: "file", content, filePath });
    }
  }
  return actions;
}

// src/ui/render.ts
import { Marked } from "marked";
import { markedTerminal } from "marked-terminal";
import chalk from "chalk";
var marked = new Marked();
marked.use(
  markedTerminal({
    width: 80,
    reflowText: true,
    tab: 2
  })
);
function renderMarkdown(text) {
  try {
    const rendered = marked.parse(text);
    return rendered;
  } catch {
    return text;
  }
}

// src/ui/theme.ts
import chalk2 from "chalk";
import boxen from "boxen";
import figlet from "figlet";
var colors = {
  primary: chalk2.hex("#F1FA8C"),
  // Gold/Yellow (Kilo primary)
  secondary: chalk2.hex("#BD93F9"),
  // Soft Purple
  accent: chalk2.hex("#50FA7B"),
  // Neon Green
  warning: chalk2.hex("#FFB86C"),
  // Orange
  error: chalk2.hex("#FF5555"),
  // Red
  muted: chalk2.hex("#6272A4"),
  // Muted Blue-Grey
  text: chalk2.hex("#F8F8F2"),
  // White/Off-white
  dim: chalk2.hex("#44475A"),
  // Dim Grey
  dark: chalk2.hex("#282A36")
  // Dark Background
};
function banner() {
  try {
    const art = figlet.textSync("BUDDY CLI", {
      font: "Big",
      horizontalLayout: "default",
      verticalLayout: "default",
      width: 80,
      whitespaceBreak: true
    });
    return colors.primary(art);
  } catch (e) {
    return colors.primary("BUDDY CLI");
  }
}
function promptSymbol() {
  return colors.primary("\u2502 ");
}
function aiBox(text) {
  return boxen(text, {
    title: "\u{1F916} Buddy",
    titleAlignment: "left",
    padding: { top: 0, bottom: 0, left: 1, right: 1 },
    margin: { top: 1, bottom: 1 },
    borderStyle: "round",
    borderColor: "yellow",
    // Gold
    width: 80
  });
}
function systemMessage(text) {
  return colors.muted(`  \u2139  ${text}`);
}
function successMessage(text) {
  return colors.accent(`  \u2714  ${text}`);
}
function warningMessage(text) {
  return colors.warning(`  \u26A0  ${text}`);
}
function errorMessage(text) {
  return boxen(text, {
    title: "Error",
    borderColor: "red",
    borderStyle: "round",
    padding: 1,
    margin: 1
  });
}
function divider() {
  return colors.dim("  " + "\u2500".repeat(60));
}
function commandBlock(cmd) {
  return boxen(colors.primary(cmd), {
    padding: { left: 2, right: 2, top: 0, bottom: 0 },
    margin: { left: 2, top: 0, bottom: 0 },
    borderStyle: "classic",
    borderColor: "yellow",
    title: "Suggested Command"
  });
}
function sessionInfo(cwd, sessionExists) {
  return colors.dim(`  cwd: ${cwd} ${sessionExists ? "\u2022 session active" : ""}`);
}
function helpText() {
  const content = [
    colors.secondary("Commands"),
    divider(),
    `  ${colors.primary("/name")} ${colors.muted("<name>")}  ${colors.text("Set your name")}`,
    `  ${colors.primary("/run")} ${colors.muted("<cmd>")}   ${colors.text("Run command directly")}`,
    `  ${colors.primary("/note")} ${colors.muted("<text>")} ${colors.text("Quick note")}`,
    `  ${colors.primary("/notes")}       ${colors.text("List my notes")}`,
    `  ${colors.primary("/clear")}       ${colors.text("Clear screen")}`,
    `  ${colors.primary("/exit")}        ${colors.text("Exit")}`,
    "",
    colors.muted("  tab commands  ctrl+p exit")
  ].join("\n");
  return boxen(content, {
    title: "\u{1F4D6} Help",
    padding: 1,
    borderStyle: "round",
    borderColor: "magenta"
  });
}
function noteDisplay(id, text, date) {
  return `  ${colors.muted(id)} ${colors.text(text)} ${colors.dim(date)}`;
}

// src/repl/repl.ts
import ora from "ora";
async function startRepl() {
  await initConfig();
  await initSession();
  await initAI();
  const cwd = process.cwd();
  const sessionContent = await loadSession();
  const hasSession = sessionContent.length > 100;
  console.log(banner());
  console.log();
  console.log(colors.muted("  tab agents  ctrl+p commands  ctrl+c exit"));
  console.log();
  console.log(sessionInfo(cwd, hasSession));
  console.log();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: promptSymbol(),
    terminal: true
  });
  const exit = () => {
    console.log();
    console.log(systemMessage("See you later! \u{1F44B}"));
    console.log();
    rl.close();
    process.exit(0);
  };
  rl.on("SIGINT", exit);
  rl.on("close", exit);
  rl.prompt();
  rl.on("line", async (input) => {
    const trimmed = input.trim();
    if (!trimmed) {
      rl.prompt();
      return;
    }
    try {
      if (trimmed.startsWith("/")) {
        await handleSlashCommand(trimmed, rl, cwd);
        rl.prompt();
        return;
      }
      const spinner = ora({
        text: colors.dim("Thinking..."),
        color: "yellow",
        spinner: "dots"
      }).start();
      let fullResponse = "";
      try {
        fullResponse = await chat(trimmed, cwd);
        spinner.stop();
        const rendered = renderMarkdown(fullResponse);
        console.log(aiBox(rendered));
      } catch (err) {
        spinner.stop();
        if (err.message?.includes("API key")) {
          console.log(errorMessage("Invalid API key. Run: buddy config --key <your-key>"));
        } else if (err.message?.includes("quota") || err.status === 429) {
          console.log(errorMessage("API quota exceeded. Try again later."));
        } else {
          console.log(errorMessage(`AI Error: ${err.message || "Unknown error"}`));
        }
        rl.prompt();
        return;
      }
      const actions = parseActions(fullResponse);
      if (actions.length > 0) {
        await handleActions(actions, rl, cwd);
      }
      try {
        await updateSession({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          cwd,
          userMessage: trimmed,
          summary: fullResponse.substring(0, 200)
        });
      } catch {
      }
      console.log(divider());
      console.log();
    } catch (err) {
      console.log(errorMessage(`Error: ${err.message}`));
    }
    rl.prompt();
  });
}
async function handleSlashCommand(input, rl, cwd) {
  const parts = input.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1).join(" ");
  switch (cmd) {
    case "/help":
      console.log(helpText());
      break;
    case "/run": {
      if (!args) {
        console.log(warningMessage("Usage: /run <command>"));
        break;
      }
      console.log(commandBlock(args));
      rl.pause();
      process.stdin.pause();
      const result = await executeCommand(args, cwd);
      process.stdin.resume();
      rl.resume();
      if (!result.success) {
        console.log(errorMessage(`Exit code: ${result.exitCode}`));
      } else {
        console.log(successMessage("Command completed"));
      }
      break;
    }
    case "/note": {
      if (!args) {
        console.log(warningMessage("Usage: /note <your note text>"));
        break;
      }
      const note = await addNote(args);
      console.log(successMessage(`Note saved! (${note.id})`));
      break;
    }
    case "/notes": {
      const notes = await listNotes(args || void 0);
      if (notes.length === 0) {
        console.log(systemMessage("No notes yet. Use /note <text> to add one."));
      } else {
        console.log();
        console.log(colors.secondary("  \u{1F4DD} Your Notes"));
        console.log(divider());
        for (const note of notes.slice(0, 20)) {
          const date = new Date(note.createdAt).toLocaleDateString();
          console.log(noteDisplay(note.id, note.text, date));
        }
        if (notes.length > 20) {
          console.log(colors.muted(`  ...and ${notes.length - 20} more`));
        }
        console.log();
      }
      break;
    }
    case "/name": {
      if (!args) {
        console.log(warningMessage("Usage: /name <your name>"));
        break;
      }
      await setUserName(args);
      console.log(successMessage(`Nice to meet you, ${args}! Session updated.`));
      break;
    }
    case "/session": {
      const summary = await getSessionSummary();
      console.log();
      console.log(sessionInfo("Current Session", true));
      console.log(colors.text(summary));
      console.log();
      break;
    }
    case "/clear":
      console.clear();
      console.log(banner());
      break;
    case "/reset":
      clearChatHistory();
      console.log(successMessage("Chat history cleared. Session memory is still intact."));
      break;
    case "/exit":
    case "/quit":
    case "/q":
      console.log();
      console.log(systemMessage("See you later! \u{1F44B}"));
      console.log();
      rl.close();
      process.exit(0);
    default:
      console.log(warningMessage(`Unknown command: ${cmd}. Type /help for available commands.`));
  }
}
async function handleActions(actions, rl, cwd) {
  for (const action of actions) {
    if (action.type === "command") {
      console.log();
      console.log(commandBlock(action.content));
      const confirm = await askQuestion(rl, `  ${colors.warning("Execute?")} ${colors.muted("(y/n)")} `);
      if (confirm.toLowerCase() === "y" || confirm.toLowerCase() === "yes") {
        console.log();
        rl.pause();
        process.stdin.pause();
        const result = await executeCommand(action.content, cwd);
        process.stdin.resume();
        rl.resume();
        console.log();
        if (result.success) {
          console.log(successMessage("Command executed successfully"));
        } else {
          console.log(errorMessage(`Command failed (exit code: ${result.exitCode})`));
        }
      } else {
        console.log(systemMessage("Skipped"));
      }
    } else if (action.type === "file" && action.filePath) {
      console.log();
      console.log(colors.secondary(`  \u{1F4C4} Write to: ${action.filePath}`));
      console.log(colors.muted(`  (${action.content.split("\n").length} lines)`));
      const confirm = await askQuestion(rl, `  ${colors.warning("Write file?")} ${colors.muted("(y/n)")} `);
      if (confirm.toLowerCase() === "y" || confirm.toLowerCase() === "yes") {
        try {
          await writeFile(action.filePath, action.content);
          console.log(successMessage(`File written: ${action.filePath}`));
        } catch (err) {
          console.log(errorMessage(`Failed to write: ${err.message}`));
        }
      } else {
        console.log(systemMessage("Skipped"));
      }
    }
  }
}
function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// src/index.ts
var program = new Command();
program.name("buddy").description("\u{1F916} Buddy \u2014 Your AI-powered terminal assistant").version("1.0.0");
program.command("go").description("Start an interactive AI assistant session").action(async () => {
  try {
    await startRepl();
  } catch (err) {
    console.error(errorMessage(`Failed to start: ${err.message}`));
    process.exit(1);
  }
});
program.command("note <text...>").description("Quickly save a note").option("-t, --tags <tags>", "Comma-separated tags").action(async (text, options) => {
  await initConfig();
  const noteText = text.join(" ");
  const tags = options.tags ? options.tags.split(",").map((t) => t.trim()) : [];
  const note = await addNote(noteText, tags);
  console.log(successMessage(`Note saved! (${note.id})`));
});
program.command("notes").description("List your saved notes").option("-s, --search <query>", "Search notes").option("-c, --clear", "Clear all notes").action(async (options) => {
  await initConfig();
  if (options.clear) {
    await clearNotes();
    console.log(successMessage("All notes cleared."));
    return;
  }
  const notes = await listNotes(options.search);
  if (notes.length === 0) {
    console.log(systemMessage("No notes found."));
  } else {
    console.log();
    console.log(colors.secondary("  \u{1F4DD} Your Notes"));
    console.log(divider());
    for (const note of notes) {
      const date = new Date(note.createdAt).toLocaleDateString();
      console.log(noteDisplay(note.id, note.text, date));
    }
    console.log();
  }
});
program.command("config").description("View or update configuration").option("-k, --key <apiKey>", "Set Gemini API key").option("-m, --model <model>", "Set AI model (default: gemini-2.0-flash)").option("--auto-confirm <bool>", "Auto-confirm command execution").option("--show", "Show current configuration").action(async (options) => {
  await initConfig();
  if (options.key) {
    await setConfig("apiKey", options.key);
    console.log(successMessage("API key updated."));
  }
  if (options.model) {
    await setConfig("model", options.model);
    console.log(successMessage(`Model set to: ${options.model}`));
  }
  if (options.autoConfirm !== void 0) {
    await setConfig("autoConfirm", options.autoConfirm === "true");
    console.log(successMessage(`Auto-confirm: ${options.autoConfirm}`));
  }
  if (options.show || !options.key && !options.model && options.autoConfirm === void 0) {
    const config = await getConfig();
    console.log();
    console.log(colors.secondary("  \u2699\uFE0F  Configuration"));
    console.log(divider());
    console.log(`  ${colors.text("API Key:")}     ${colors.muted(config.apiKey.substring(0, 10) + "...")}`);
    console.log(`  ${colors.text("Model:")}       ${colors.primary(config.model)}`);
    console.log(`  ${colors.text("Auto-confirm:")} ${config.autoConfirm ? colors.accent("on") : colors.warning("off")}`);
    console.log(`  ${colors.text("Theme:")}       ${colors.primary(config.theme)}`);
    console.log(`  ${colors.text("Max history:")} ${colors.primary(String(config.maxSessionEntries))}`);
    console.log();
  }
});
program.command("name <name>").description("Set your preferred name").action(async (name) => {
  await initConfig();
  await setUserName(name);
  console.log(successMessage(`Nice to meet you, ${name}! Session updated.`));
});
program.command("session").description("View or manage session memory").option("-c, --clear", "Clear session memory").action(async (options) => {
  await initConfig();
  if (options.clear) {
    await clearSession();
    console.log(successMessage("Session memory cleared."));
  } else {
    const summary = await getSessionSummary();
    console.log();
    console.log(colors.secondary("  \u{1F4BE} Session Memory"));
    console.log(divider());
    console.log(colors.text("  " + summary.replace(/\n/g, "\n  ")));
    console.log();
  }
});
program.action(async () => {
  console.log(banner());
  program.help();
});
program.parse();
