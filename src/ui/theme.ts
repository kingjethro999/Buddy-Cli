import chalk from 'chalk';
import boxen from 'boxen';
import figlet from 'figlet';

// ─── Color Palette (Kilo Style) ────────────────────────────
export const colors = {
    primary: chalk.hex('#F1FA8C'),      // Gold/Yellow (Kilo primary)
    secondary: chalk.hex('#BD93F9'),    // Soft Purple
    accent: chalk.hex('#50FA7B'),       // Neon Green
    warning: chalk.hex('#FFB86C'),      // Orange
    error: chalk.hex('#FF5555'),        // Red
    muted: chalk.hex('#6272A4'),        // Muted Blue-Grey
    text: chalk.hex('#F8F8F2'),         // White/Off-white
    dim: chalk.hex('#44475A'),          // Dim Grey
    dark: chalk.hex('#282A36'),         // Dark Background
};

// ─── Banner ─────────────────────────────────────────────────
export function banner(): string {
    // Use figlet for a professional block font
    // 'Big' works well for the Kilo aesthetic
    try {
        const art = figlet.textSync('BUDDY CLI', {
            font: 'Big',
            horizontalLayout: 'default',
            verticalLayout: 'default',
            width: 80,
            whitespaceBreak: true
        });
        return colors.primary(art);
    } catch (e) {
        // Fallback if font missing
        return colors.primary('BUDDY CLI');
    }
}

// ─── Prompt ─────────────────────────────────────────────────
export function promptSymbol(): string {
    // Mimic Kilo's minimal prompt: cursor or simple bar
    return colors.primary('│ ');
}

// ─── Message Formatting ────────────────────────────────────
export function aiBox(text: string): string {
    // Use a minimal box or just clean text
    return boxen(text, {
        title: '🤖 Buddy',
        titleAlignment: 'left',
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        margin: { top: 1, bottom: 1 },
        borderStyle: 'round',
        borderColor: 'yellow', // Gold
        width: 80,
    });
}

export function aiLabel(): string {
    return colors.primary('🤖 Buddy');
}

export function userLabel(): string {
    return colors.secondary('👤 You');
}

export function systemMessage(text: string): string {
    return colors.muted(`  ℹ  ${text}`);
}

export function successMessage(text: string): string {
    return colors.accent(`  ✔  ${text}`);
}

export function warningMessage(text: string): string {
    return colors.warning(`  ⚠  ${text}`);
}

export function errorMessage(text: string): string {
    return boxen(text, {
        title: 'Error',
        borderColor: 'red',
        borderStyle: 'round',
        padding: 1,
        margin: 1,
    });
}

export function divider(): string {
    return colors.dim('  ' + '─'.repeat(60));
}

export function commandBlock(cmd: string): string {
    return boxen(colors.primary(cmd), {
        padding: { left: 2, right: 2, top: 0, bottom: 0 },
        margin: { left: 2, top: 0, bottom: 0 },
        borderStyle: 'classic',
        borderColor: 'yellow',
        title: 'Suggested Command',
    });
}

export function sessionInfo(cwd: string, sessionExists: boolean): string {
    // Minimal session info
    return colors.dim(`  cwd: ${cwd} ${sessionExists ? '• session active' : ''}`);
}

export function helpText(): string {
    const content = [
        colors.secondary('Commands'),
        divider(),
        `  ${colors.primary('/name')} ${colors.muted('<name>')}  ${colors.text('Set your name')}`,
        `  ${colors.primary('/run')} ${colors.muted('<cmd>')}   ${colors.text('Run command directly')}`,
        `  ${colors.primary('/note')} ${colors.muted('<text>')} ${colors.text('Quick note')}`,
        `  ${colors.primary('/notes')}       ${colors.text('List my notes')}`,
        `  ${colors.primary('/clear')}       ${colors.text('Clear screen')}`,
        `  ${colors.primary('/exit')}        ${colors.text('Exit')}`,
        '',
        colors.muted('  tab commands  ctrl+p exit'),
    ].join('\n');

    return boxen(content, {
        title: '📖 Help',
        padding: 1,
        borderStyle: 'round',
        borderColor: 'magenta',
    });
}

export function noteDisplay(id: string, text: string, date: string): string {
    return `  ${colors.muted(id)} ${colors.text(text)} ${colors.dim(date)}`;
}
