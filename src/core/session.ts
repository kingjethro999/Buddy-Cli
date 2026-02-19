import fs from 'fs-extra';
import path from 'path';
import { getBuddyDir, getUsername } from '../utils/platform.js';
import { getConfig } from './config.js';

function getSessionPath(): string {
    return path.join(getBuddyDir(), 'session.md');
}

interface SessionEntry {
    timestamp: string;
    cwd: string;
    userMessage: string;
    summary: string;
}

export async function loadSession(): Promise<string> {
    const sessionPath = getSessionPath();
    try {
        if (await fs.pathExists(sessionPath)) {
            return await fs.readFile(sessionPath, 'utf-8');
        }
    } catch {
        // Session file doesn't exist or is corrupted
    }
    return '';
}

export async function initSession(): Promise<void> {
    const sessionPath = getSessionPath();
    await fs.ensureDir(getBuddyDir());

    if (!(await fs.pathExists(sessionPath))) {
        const template = `# 🤖 Buddy Session Memory

## User Profile
- **Name**: ${getUsername()}
- **First seen**: ${new Date().toISOString()}

## Preferences
_Learning your preferences as we go..._

## Recent Interactions
`;
        await fs.writeFile(sessionPath, template, 'utf-8');
    }
}

export async function updateSession(entry: SessionEntry): Promise<void> {
    const sessionPath = getSessionPath();
    const config = await getConfig();

    let content = await loadSession();

    // Build new entry
    const newEntry = `
### ${entry.timestamp}
- **Dir**: \`${entry.cwd}\`
- **Query**: ${entry.userMessage.substring(0, 120)}${entry.userMessage.length > 120 ? '...' : ''}
- **Summary**: ${entry.summary}
`;

    // Append to Recent Interactions section
    const marker = '## Recent Interactions';
    const markerIndex = content.indexOf(marker);

    if (markerIndex !== -1) {
        const insertPos = markerIndex + marker.length;
        content = content.slice(0, insertPos) + '\n' + newEntry + content.slice(insertPos);
    } else {
        content += '\n## Recent Interactions\n' + newEntry;
    }

    // Trim old entries if too many
    const entryPattern = /### \d{4}-\d{2}-\d{2}/g;
    const matches = [...content.matchAll(entryPattern)];
    if (matches.length > config.maxSessionEntries) {
        const cutoff = matches[config.maxSessionEntries];
        if (cutoff.index !== undefined) {
            content = content.slice(0, cutoff.index) + '\n_...older entries trimmed..._\n';
        }
    }

    await fs.writeFile(sessionPath, content, 'utf-8');
}

export async function setUserName(name: string): Promise<void> {
    const sessionPath = getSessionPath();
    if (await fs.pathExists(sessionPath)) {
        let content = await fs.readFile(sessionPath, 'utf-8');
        // Replace existing name line or add it if missing
        const nameRegex = /- \*\*Name\*\*: .*/;
        if (nameRegex.test(content)) {
            content = content.replace(nameRegex, `- **Name**: ${name}`);
        } else {
            const insertPos = content.indexOf('## User Profile') + '## User Profile'.length;
            content = content.slice(0, insertPos) + `\n- **Name**: ${name}` + content.slice(insertPos);
        }
        await fs.writeFile(sessionPath, content, 'utf-8');
    } else {
        await initSession();
        await setUserName(name);
    }
}

export async function clearSession(): Promise<void> {
    const sessionPath = getSessionPath();
    if (await fs.pathExists(sessionPath)) {
        await fs.remove(sessionPath);
    }
    await initSession();
}

export async function getSessionSummary(): Promise<string> {
    const content = await loadSession();
    if (!content) return 'No session history yet.';

    const lines = content.split('\n');
    const recentIdx = lines.findIndex(l => l.includes('## Recent Interactions'));
    if (recentIdx === -1) return 'No recent interactions.';

    const recentLines = lines.slice(recentIdx + 1, recentIdx + 30);
    return recentLines.join('\n').trim() || 'No recent interactions.';
}
