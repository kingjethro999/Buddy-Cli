import { GoogleGenerativeAI, type GenerateContentResult } from '@google/generative-ai';
import { getConfig } from './config.js';
import { loadSession } from './session.js';
import { getSystemInfo, getUsername } from '../utils/platform.js';

let genAI: GoogleGenerativeAI | null = null;
let chatHistory: { role: string; parts: { text: string }[] }[] = [];

function getSystemPrompt(cwd: string, sessionContext: string): string {
    return `You are **Buddy**, a powerful, friendly, and intelligent AI assistant living inside the user's terminal. You are their trusted companion for everything — from answering questions to running system commands, managing files, writing code, taking notes, and more.

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
${sessionContext || '_No prior sessions yet — this is a fresh start!_'}

## Capabilities

### 1. Answer Questions
Answer ANY question — coding, sysadmin, general knowledge, math, science, etc. Be thorough but concise.

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

For reading files, listing directories, or searching — suggest the appropriate commands.

### 4. Code Assistance
You can write, review, debug, and explain code in any language. When writing code that should be saved to a file, use the file block syntax above.

### 5. Notes & Reminders
The user can ask you to take notes. Use natural language — the system handles storage.

## Rules
1. **Be concise** — Terminal space is precious. Use markdown formatting.
2. **Be safe** — Always warn about destructive commands (rm -rf, sudo, etc.)
3. **Be proactive** — If you see a better approach, suggest it.
4. **Remember context** — Use the session memory to provide continuity.
5. **Not limited to cwd** — You can help with anything on the system, not just the current directory.
6. **Use code blocks** — Always format commands and code in proper markdown code blocks.
`;
}

export async function initAI(): Promise<void> {
    const config = await getConfig();
    genAI = new GoogleGenerativeAI(config.apiKey);
    chatHistory = [];
}

export async function chat(
    message: string,
    cwd: string,
    onStream?: (chunk: string) => void
): Promise<string> {
    if (!genAI) await initAI();

    const config = await getConfig();
    const sessionContext = await loadSession();
    const systemPrompt = getSystemPrompt(cwd, sessionContext);

    const model = genAI!.getGenerativeModel({
        model: config.model,
        systemInstruction: systemPrompt,
    });

    // Build the conversation with history
    const chatSession = model.startChat({
        history: chatHistory.map(h => ({
            role: h.role as 'user' | 'model',
            parts: h.parts,
        })),
    });

    let fullResponse = '';

    if (onStream) {
        const result = await chatSession.sendMessageStream(message);
        for await (const chunk of result.stream) {
            const text = chunk.text();
            fullResponse += text;
            onStream(text);
        }
    } else {
        const result: GenerateContentResult = await chatSession.sendMessage(message);
        fullResponse = result.response.text();
    }

    // Update history
    chatHistory.push(
        { role: 'user', parts: [{ text: message }] },
        { role: 'model', parts: [{ text: fullResponse }] }
    );

    // Keep history manageable (last 20 exchanges)
    if (chatHistory.length > 40) {
        chatHistory = chatHistory.slice(-40);
    }

    return fullResponse;
}

export function clearChatHistory(): void {
    chatHistory = [];
}
