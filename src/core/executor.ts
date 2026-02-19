import { spawn } from 'child_process';
import { getPlatform, getShell } from '../utils/platform.js';

export interface ExecutionResult {
    exitCode: number | null;
    stdout: string;
    stderr: string;
    success: boolean;
}

export async function executeCommand(
    command: string,
    cwd?: string,
    onOutput?: (chunk: string) => void
): Promise<ExecutionResult> {
    return new Promise((resolve) => {
        const platform = getPlatform();
        const shell = getShell();

        let shellArgs: string[];
        if (platform === 'win32') {
            shellArgs = ['/c', command];
        } else {
            shellArgs = ['-c', command];
        }

        // Use 'inherit' for stdio to support interactive commands (sudo, vim, nano, etc.)
        // This connects the subprocess directly to the TTY
        const proc = spawn(shell, shellArgs, {
            cwd: cwd || process.cwd(),
            env: { ...process.env },
            stdio: 'inherit',
        });

        // With 'inherit', we cannot capture output programmatically here
        // The user sees it directly in the terminal

        proc.on('close', (code) => {
            resolve({
                exitCode: code,
                stdout: '(Output displayed in terminal)',
                stderr: '',
                success: code === 0,
            });
        });

        proc.on('error', (err) => {
            resolve({
                exitCode: 1,
                stdout: '',
                stderr: err.message,
                success: false,
            });
        });
    });
}

export function getCommandPreview(command: string): string {
    // Truncate long commands for display
    if (command.length > 100) {
        return command.substring(0, 97) + '...';
    }
    return command;
}
