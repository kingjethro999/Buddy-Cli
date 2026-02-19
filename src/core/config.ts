import fs from 'fs-extra';
import path from 'path';
import { getBuddyDir } from '../utils/platform.js';
import { decrypt } from '../utils/crypto.js';

export interface BuddyConfig {
    apiKey: string;
    model: string;
    autoConfirm: boolean;
    theme: 'default' | 'minimal';
    maxSessionEntries: number;
}

// Encrypted API key — decrypted at runtime, never stored as plain text in source
const ENCRYPTED_DEFAULT_KEY = '7cccb1b1b1a8531625020e342f8f8120364f8037cf7be6b864a5570761a4ae8f211c91e97dfdbd6fd4ec901fbf55539e';

const DEFAULT_CONFIG: BuddyConfig = {
    apiKey: decrypt(ENCRYPTED_DEFAULT_KEY),
    model: 'gemini-2.5-flash',
    autoConfirm: false,
    theme: 'default',
    maxSessionEntries: 50,
};

function getConfigPath(): string {
    return path.join(getBuddyDir(), 'config.json');
}

export async function ensureBuddyDir(): Promise<void> {
    await fs.ensureDir(getBuddyDir());
}

export async function getConfig(): Promise<BuddyConfig> {
    const configPath = getConfigPath();
    try {
        if (await fs.pathExists(configPath)) {
            const data = await fs.readJson(configPath);
            return { ...DEFAULT_CONFIG, ...data };
        }
    } catch {
        // If config is corrupted, return defaults
    }
    return { ...DEFAULT_CONFIG };
}

export async function setConfig(key: keyof BuddyConfig, value: string | boolean | number): Promise<void> {
    await ensureBuddyDir();
    const config = await getConfig();
    (config as unknown as Record<string, unknown>)[key] = value;
    await fs.writeJson(getConfigPath(), config, { spaces: 2 });
}

export async function resetConfig(): Promise<void> {
    await ensureBuddyDir();
    await fs.writeJson(getConfigPath(), DEFAULT_CONFIG, { spaces: 2 });
}

export async function initConfig(): Promise<void> {
    await ensureBuddyDir();
    const configPath = getConfigPath();
    if (!(await fs.pathExists(configPath))) {
        await fs.writeJson(configPath, DEFAULT_CONFIG, { spaces: 2 });
    }
}
