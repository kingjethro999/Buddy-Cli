import os from 'os';
import path from 'path';

export type Platform = 'linux' | 'darwin' | 'win32';

export function getPlatform(): Platform {
    return process.platform as Platform;
}

export function getShell(): string {
    const platform = getPlatform();
    switch (platform) {
        case 'win32':
            return process.env.COMSPEC || 'cmd.exe';
        case 'darwin':
            return process.env.SHELL || '/bin/zsh';
        case 'linux':
        default:
            return process.env.SHELL || '/bin/bash';
    }
}

export function getHomeDir(): string {
    return os.homedir();
}

export function getBuddyDir(): string {
    return path.join(getHomeDir(), '.buddy');
}

export function getUsername(): string {
    return os.userInfo().username;
}

export function getSystemInfo(): string {
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
        `Uptime: ${(os.uptime() / 3600).toFixed(1)} hours`,
    ].join('\n');
}
