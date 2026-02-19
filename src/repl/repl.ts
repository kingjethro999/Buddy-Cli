import readline from 'readline';
import { chat, initAI, clearChatHistory } from '../core/ai.js';
import { initSession, updateSession, getSessionSummary, loadSession, clearSession, setUserName } from '../core/session.js';
import { initConfig, getConfig } from '../core/config.js';
import { executeCommand, getCommandPreview } from '../core/executor.js';
import { addNote, listNotes, deleteNote } from '../core/notes.js';
import { writeFile as writeFileOp } from '../core/files.js';
import { parseActions, type ParsedAction } from './parser.js';
import { renderMarkdown } from '../ui/render.js';
import * as theme from '../ui/theme.js';
import ora from 'ora';

export async function startRepl(): Promise<void> {
    // Initialize all systems
    await initConfig();
    await initSession();
    await initAI();

    const cwd = process.cwd();
    const sessionContent = await loadSession();
    const hasSession = sessionContent.length > 100;

    // Show welcome banner
    console.log(theme.banner());
    console.log();
    // Hint text aligned nicely
    console.log(theme.colors.muted('  tab agents  ctrl+p commands  ctrl+c exit'));
    console.log();
    console.log(theme.sessionInfo(cwd, hasSession));
    console.log();

    // Create readline interface
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: theme.promptSymbol(),
        terminal: true,
    });

    // Graceful exit
    const exit = () => {
        console.log();
        console.log(theme.systemMessage('See you later! 👋'));
        console.log();
        rl.close();
        process.exit(0);
    };

    rl.on('SIGINT', exit);
    rl.on('close', exit);

    // Prompt user
    rl.prompt();

    rl.on('line', async (input: string) => {
        const trimmed = input.trim();

        if (!trimmed) {
            rl.prompt();
            return;
        }

        try {
            // ─── Slash Commands ───────────────────────────
            if (trimmed.startsWith('/')) {
                await handleSlashCommand(trimmed, rl, cwd);
                rl.prompt();
                return;
            }

            // ─── AI Chat ──────────────────────────────────
            // Show thinking spinner
            const spinner = ora({
                text: theme.colors.dim('Thinking...'),
                color: 'yellow',
                spinner: 'dots'
            }).start();

            let fullResponse = '';

            try {
                // We buffer the response to display it in a nice box
                // Streaming + Boxen is hard, so we prioritize the premium look of Boxen
                fullResponse = await chat(trimmed, cwd);

                spinner.stop();

                // Render the complete response with markdown
                const rendered = renderMarkdown(fullResponse);

                // Display in a box
                console.log(theme.aiBox(rendered));

            } catch (err: any) {
                spinner.stop();
                if (err.message?.includes('API key')) {
                    console.log(theme.errorMessage('Invalid API key. Run: buddy config --key <your-key>'));
                } else if (err.message?.includes('quota') || err.status === 429) {
                    console.log(theme.errorMessage('API quota exceeded. Try again later.'));
                } else {
                    console.log(theme.errorMessage(`AI Error: ${err.message || 'Unknown error'}`));
                }
                rl.prompt();
                return;
            }

            // ─── Parse & Execute Actions ──────────────────
            const actions = parseActions(fullResponse);
            if (actions.length > 0) {
                await handleActions(actions, rl, cwd);
            }

            // ─── Update Session ───────────────────────────
            try {
                await updateSession({
                    timestamp: new Date().toISOString(),
                    cwd,
                    userMessage: trimmed,
                    summary: fullResponse.substring(0, 200),
                });
            } catch {
                // Session update is non-critical
            }

            console.log(theme.divider());
            console.log();
        } catch (err: any) {
            console.log(theme.errorMessage(`Error: ${err.message}`));
        }

        rl.prompt();
    });
}

// ─── Slash Command Handler ───────────────────────────────
async function handleSlashCommand(input: string, rl: readline.Interface, cwd: string): Promise<void> {
    const parts = input.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    switch (cmd) {
        case '/help':
            console.log(theme.helpText());
            break;

        case '/run': {
            if (!args) {
                console.log(theme.warningMessage('Usage: /run <command>'));
                break;
            }
            console.log(theme.commandBlock(args));

            // Interactive execution for /run
            // Pause readline and release stdin
            rl.pause();
            process.stdin.pause();

            const result = await executeCommand(args, cwd);

            // Resume stdin and readline
            process.stdin.resume();
            rl.resume();

            if (!result.success) {
                console.log(theme.errorMessage(`Exit code: ${result.exitCode}`));
            } else {
                console.log(theme.successMessage('Command completed'));
            }
            break;
        }

        case '/note': {
            if (!args) {
                console.log(theme.warningMessage('Usage: /note <your note text>'));
                break;
            }
            const note = await addNote(args);
            console.log(theme.successMessage(`Note saved! (${note.id})`));
            break;
        }

        case '/notes': {
            const notes = await listNotes(args || undefined);
            if (notes.length === 0) {
                console.log(theme.systemMessage('No notes yet. Use /note <text> to add one.'));
            } else {
                console.log();
                console.log(theme.colors.secondary('  📝 Your Notes'));
                console.log(theme.divider());
                for (const note of notes.slice(0, 20)) {
                    const date = new Date(note.createdAt).toLocaleDateString();
                    console.log(theme.noteDisplay(note.id, note.text, date));
                }
                if (notes.length > 20) {
                    console.log(theme.colors.muted(`  ...and ${notes.length - 20} more`));
                }
                console.log();
            }
            break;
        }

        case '/name': {
            if (!args) {
                console.log(theme.warningMessage('Usage: /name <your name>'));
                break;
            }
            await setUserName(args);
            console.log(theme.successMessage(`Nice to meet you, ${args}! Session updated.`));
            break;
        }

        case '/session': {
            const summary = await getSessionSummary();
            console.log();
            console.log(theme.sessionInfo('Current Session', true));
            console.log(theme.colors.text(summary));
            console.log();
            break;
        }

        case '/clear':
            console.clear();
            console.log(theme.banner());
            break;

        case '/reset':
            clearChatHistory();
            console.log(theme.successMessage('Chat history cleared. Session memory is still intact.'));
            break;

        case '/exit':
        case '/quit':
        case '/q':
            console.log();
            console.log(theme.systemMessage('See you later! 👋'));
            console.log();
            rl.close();
            process.exit(0);

        default:
            console.log(theme.warningMessage(`Unknown command: ${cmd}. Type /help for available commands.`));
    }
}

// ─── Action Handler ──────────────────────────────────────
async function handleActions(actions: ParsedAction[], rl: readline.Interface, cwd: string): Promise<void> {
    for (const action of actions) {
        if (action.type === 'command') {
            console.log();
            console.log(theme.commandBlock(action.content));

            const confirm = await askQuestion(rl, `  ${theme.colors.warning('Execute?')} ${theme.colors.muted('(y/n)')} `);

            if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
                console.log();

                // CRITICAL: Pause readline AND release stdin to allow subprocess to inherit stdio
                // This is essential for interactive commands like sudo, vim, nano
                rl.pause();
                process.stdin.pause();

                const result = await executeCommand(action.content, cwd);

                // Resume stdin and readline
                process.stdin.resume();
                rl.resume();

                console.log();
                if (result.success) {
                    console.log(theme.successMessage('Command executed successfully'));
                } else {
                    console.log(theme.errorMessage(`Command failed (exit code: ${result.exitCode})`));
                }
            } else {
                console.log(theme.systemMessage('Skipped'));
            }
        } else if (action.type === 'file' && action.filePath) {
            console.log();
            console.log(theme.colors.secondary(`  📄 Write to: ${action.filePath}`));
            console.log(theme.colors.muted(`  (${action.content.split('\n').length} lines)`));

            const confirm = await askQuestion(rl, `  ${theme.colors.warning('Write file?')} ${theme.colors.muted('(y/n)')} `);

            if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
                try {
                    await writeFileOp(action.filePath, action.content);
                    console.log(theme.successMessage(`File written: ${action.filePath}`));
                } catch (err: any) {
                    console.log(theme.errorMessage(`Failed to write: ${err.message}`));
                }
            } else {
                console.log(theme.systemMessage('Skipped'));
            }
        }
    }
}

// ─── Utility ─────────────────────────────────────────────
function askQuestion(rl: readline.Interface, question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}
