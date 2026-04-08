import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Derives a 256-bit key from a passphrase using PBKDF2.
 * Uses the JWT_SECRET as the passphrase by default, or a dedicated ENCRYPTION_KEY env var.
 */
function getEncryptionKey() {
    const passphrase = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!passphrase) {
        throw new Error('No encryption key configured. Set ENCRYPTION_KEY or JWT_SECRET environment variable.');
    }
    return passphrase;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Output format: base64(salt + iv + tag + ciphertext)
 * 
 * @param {string} plaintext - The text to encrypt
 * @returns {string} Encrypted string (base64-encoded)
 */
export function encrypt(plaintext) {
    if (!plaintext) return plaintext;

    const passphrase = getEncryptionKey();
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const tag = cipher.getAuthTag();

    // Combine: salt(32) + iv(16) + tag(16) + ciphertext
    const combined = Buffer.concat([salt, iv, tag, encrypted]);
    return combined.toString('base64');
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 * 
 * @param {string} encryptedText - Base64-encoded encrypted string
 * @returns {string} Decrypted plaintext
 */
export function decrypt(encryptedText) {
    if (!encryptedText) return encryptedText;

    try {
        const passphrase = getEncryptionKey();
        const combined = Buffer.from(encryptedText, 'base64');

        // Extract components
        const salt = combined.subarray(0, SALT_LENGTH);
        const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
        const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
        const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

        const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(ciphertext);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString('utf8');
    } catch (error) {
        // If decryption fails, the value might be stored as plaintext (pre-migration)
        // Return as-is so existing passwords still work
        console.warn('⚠️ Could not decrypt value — treating as plaintext (pre-encryption data)');
        return encryptedText;
    }
}

/**
 * Check if a string looks like it was encrypted by our encrypt() function.
 * Encrypted values are base64 and have a minimum length (salt+iv+tag = 64 bytes = ~88 base64 chars).
 * 
 * @param {string} value - The string to check
 * @returns {boolean} True if it appears encrypted
 */
export function isEncrypted(value) {
    if (!value || value.length < 88) return false;
    try {
        const buf = Buffer.from(value, 'base64');
        // Minimum size: salt(32) + iv(16) + tag(16) + at least 1 byte ciphertext = 65
        return buf.length >= 65 && value === buf.toString('base64');
    } catch {
        return false;
    }
}
