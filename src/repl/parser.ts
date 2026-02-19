export interface ParsedAction {
    type: 'command' | 'file';
    content: string;
    filePath?: string;
}

/**
 * Parses AI response text for actionable blocks:
 * - ```bash ... ``` → executable commands
 * - ```file:/path/to/file ... ``` → file write operations
 */
export function parseActions(text: string): ParsedAction[] {
    const actions: ParsedAction[] = [];

    // Match ```bash or ```sh code blocks
    const cmdRegex = /```(?:bash|sh|shell|zsh)\n([\s\S]*?)```/g;
    let match;

    while ((match = cmdRegex.exec(text)) !== null) {
        const content = match[1].trim();
        if (content) {
            // Split multi-line commands into individual commands
            const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
            for (const line of lines) {
                actions.push({ type: 'command', content: line.trim() });
            }
        }
    }

    // Match ```file:/path code blocks
    const fileRegex = /```file:([^\n]+)\n([\s\S]*?)```/g;

    while ((match = fileRegex.exec(text)) !== null) {
        const filePath = match[1].trim();
        const content = match[2];
        if (filePath && content) {
            actions.push({ type: 'file', content, filePath });
        }
    }

    return actions;
}

/**
 * Check if the response contains any actionable blocks
 */
export function hasActions(text: string): boolean {
    return parseActions(text).length > 0;
}
