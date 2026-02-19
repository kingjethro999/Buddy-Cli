import crypto from 'crypto';

// Internal entropy key — not a secret, just prevents casual reading
const ENTROPY = Buffer.from('QnVkZHlDbGlBc3Npc3RhbnQyMDI2ISE=', 'base64').toString(); // "BuddyCliAssistant2026!!"
const ALGORITHM = 'aes-256-cbc';

function deriveKey(passphrase: string): { key: Buffer; iv: Buffer } {
    const hash = crypto.createHash('sha512').update(passphrase).digest();
    return {
        key: hash.subarray(0, 32),
        iv: hash.subarray(32, 48),
    };
}

export function encrypt(text: string): string {
    const { key, iv } = deriveKey(ENTROPY);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

export function decrypt(encryptedHex: string): string {
    const { key, iv } = deriveKey(ENTROPY);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
