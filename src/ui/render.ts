import { Marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import chalk from 'chalk';

const marked = new Marked();

marked.use(
    markedTerminal({
        width: 80,
        reflowText: true,
        tab: 2,
    }) as any
);

export function renderMarkdown(text: string): string {
    try {
        const rendered = marked.parse(text) as string;
        return rendered;
    } catch {
        return text;
    }
}

export function renderInlineCode(code: string): string {
    return chalk.hex('#F1FA8C').bgHex('#282A36')(` ${code} `);
}
