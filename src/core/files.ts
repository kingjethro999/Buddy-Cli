import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

export interface FileInfo {
    name: string;
    path: string;
    isDirectory: boolean;
    size: number;
    modified: Date;
}

export async function listFiles(dir: string): Promise<FileInfo[]> {
    const resolvedDir = path.resolve(dir);
    const entries = await fs.readdir(resolvedDir, { withFileTypes: true });

    const files: FileInfo[] = [];
    for (const entry of entries) {
        const fullPath = path.join(resolvedDir, entry.name);
        try {
            const stat = await fs.stat(fullPath);
            files.push({
                name: entry.name,
                path: fullPath,
                isDirectory: entry.isDirectory(),
                size: stat.size,
                modified: stat.mtime,
            });
        } catch {
            // Skip files we can't stat (permission issues, etc.)
        }
    }

    return files.sort((a, b) => {
        // Directories first, then alphabetical
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
    });
}

export async function readFile(filePath: string): Promise<string> {
    const resolved = path.resolve(filePath);
    return await fs.readFile(resolved, 'utf-8');
}

export async function writeFile(filePath: string, content: string): Promise<void> {
    const resolved = path.resolve(filePath);
    await fs.ensureDir(path.dirname(resolved));
    await fs.writeFile(resolved, content, 'utf-8');
}

export async function fileExists(filePath: string): Promise<boolean> {
    return await fs.pathExists(path.resolve(filePath));
}

export async function getFileInfo(filePath: string): Promise<FileInfo> {
    const resolved = path.resolve(filePath);
    const stat = await fs.stat(resolved);
    return {
        name: path.basename(resolved),
        path: resolved,
        isDirectory: stat.isDirectory(),
        size: stat.size,
        modified: stat.mtime,
    };
}

export async function searchFiles(pattern: string, dir: string): Promise<string[]> {
    const resolvedDir = path.resolve(dir);
    return await glob(pattern, { cwd: resolvedDir, absolute: true });
}

export async function deleteFileOrDir(filePath: string): Promise<void> {
    const resolved = path.resolve(filePath);
    await fs.remove(resolved);
}

export async function copyFileOrDir(src: string, dest: string): Promise<void> {
    await fs.copy(path.resolve(src), path.resolve(dest));
}

export async function moveFileOrDir(src: string, dest: string): Promise<void> {
    await fs.move(path.resolve(src), path.resolve(dest));
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
