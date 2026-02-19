#!/usr/bin/env node

import { Command } from 'commander';
import { startRepl } from './repl/repl.js';
import { setConfig, getConfig, initConfig } from './core/config.js';
import { addNote, listNotes, clearNotes } from './core/notes.js';
import { clearSession, getSessionSummary, setUserName } from './core/session.js';
import * as theme from './ui/theme.js';

const program = new Command();

program
    .name('buddy')
    .description('🤖 Buddy — Your AI-powered terminal assistant')
    .version('1.0.0');

// ─── Main Command: buddy go ────────────────────────────────
program
    .command('go')
    .description('Start an interactive AI assistant session')
    .action(async () => {
        try {
            await startRepl();
        } catch (err: any) {
            console.error(theme.errorMessage(`Failed to start: ${err.message}`));
            process.exit(1);
        }
    });

// ─── Quick Note ─────────────────────────────────────────────
program
    .command('note <text...>')
    .description('Quickly save a note')
    .option('-t, --tags <tags>', 'Comma-separated tags')
    .action(async (text: string[], options: { tags?: string }) => {
        await initConfig();
        const noteText = text.join(' ');
        const tags = options.tags ? options.tags.split(',').map(t => t.trim()) : [];
        const note = await addNote(noteText, tags);
        console.log(theme.successMessage(`Note saved! (${note.id})`));
    });

// ─── List Notes ─────────────────────────────────────────────
program
    .command('notes')
    .description('List your saved notes')
    .option('-s, --search <query>', 'Search notes')
    .option('-c, --clear', 'Clear all notes')
    .action(async (options: { search?: string; clear?: boolean }) => {
        await initConfig();
        if (options.clear) {
            await clearNotes();
            console.log(theme.successMessage('All notes cleared.'));
            return;
        }
        const notes = await listNotes(options.search);
        if (notes.length === 0) {
            console.log(theme.systemMessage('No notes found.'));
        } else {
            console.log();
            console.log(theme.colors.secondary('  📝 Your Notes'));
            console.log(theme.divider());
            for (const note of notes) {
                const date = new Date(note.createdAt).toLocaleDateString();
                console.log(theme.noteDisplay(note.id, note.text, date));
            }
            console.log();
        }
    });

// ─── Config ─────────────────────────────────────────────────
program
    .command('config')
    .description('View or update configuration')
    .option('-k, --key <apiKey>', 'Set Gemini API key')
    .option('-m, --model <model>', 'Set AI model (default: gemini-2.0-flash)')
    .option('--auto-confirm <bool>', 'Auto-confirm command execution')
    .option('--show', 'Show current configuration')
    .action(async (options: { key?: string; model?: string; autoConfirm?: string; show?: boolean }) => {
        await initConfig();
        if (options.key) {
            await setConfig('apiKey', options.key);
            console.log(theme.successMessage('API key updated.'));
        }
        if (options.model) {
            await setConfig('model', options.model);
            console.log(theme.successMessage(`Model set to: ${options.model}`));
        }
        if (options.autoConfirm !== undefined) {
            await setConfig('autoConfirm', options.autoConfirm === 'true');
            console.log(theme.successMessage(`Auto-confirm: ${options.autoConfirm}`));
        }
        if (options.show || (!options.key && !options.model && options.autoConfirm === undefined)) {
            const config = await getConfig();
            console.log();
            console.log(theme.colors.secondary('  ⚙️  Configuration'));
            console.log(theme.divider());
            console.log(`  ${theme.colors.text('API Key:')}     ${theme.colors.muted(config.apiKey.substring(0, 10) + '...')}`);
            console.log(`  ${theme.colors.text('Model:')}       ${theme.colors.primary(config.model)}`);
            console.log(`  ${theme.colors.text('Auto-confirm:')} ${config.autoConfirm ? theme.colors.accent('on') : theme.colors.warning('off')}`);
            console.log(`  ${theme.colors.text('Theme:')}       ${theme.colors.primary(config.theme)}`);
            console.log(`  ${theme.colors.text('Max history:')} ${theme.colors.primary(String(config.maxSessionEntries))}`);
            console.log();
        }
    });

// ─── Name ───────────────────────────────────────────────────
program
    .command('name <name>')
    .description('Set your preferred name')
    .action(async (name: string) => {
        await initConfig();
        await setUserName(name);
        console.log(theme.successMessage(`Nice to meet you, ${name}! Session updated.`));
    });

// ─── Session ────────────────────────────────────────────────
program
    .command('session')
    .description('View or manage session memory')
    .option('-c, --clear', 'Clear session memory')
    .action(async (options: { clear?: boolean }) => {
        await initConfig();
        if (options.clear) {
            await clearSession();
            console.log(theme.successMessage('Session memory cleared.'));
        } else {
            const summary = await getSessionSummary();
            console.log();
            console.log(theme.colors.secondary('  💾 Session Memory'));
            console.log(theme.divider());
            console.log(theme.colors.text('  ' + summary.replace(/\n/g, '\n  ')));
            console.log();
        }
    });

// ─── Default (no subcommand) ────────────────────────────────
program
    .action(async () => {
        // If no subcommand provided, show help with styled banner
        console.log(theme.banner());
        program.help();
    });

program.parse();
