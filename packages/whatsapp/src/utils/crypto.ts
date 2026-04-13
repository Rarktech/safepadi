import crypto from 'crypto';

export interface DecryptedRequest {
    data: any;
    aesKey: Buffer;
    initialVector: string;
}

/**
 * Utility to handle WhatsApp Flow Encryption/Decryption
 * Following Meta's AES-128-GCM and RSA-OAEP Standard
 */
export class FlowCrypto {
    private privateKey: string;

    constructor(privateKey: string) {
        this.privateKey = privateKey;
    }

    /**
     * Decrypts the request body from WhatsApp Flow
     */
    decryptRequest(encrypted_payload: string, initial_vector: string, encrypted_aes_key: string): DecryptedRequest {
        // 1. Decrypt the AES key using our RSA private key
        const aesKey = crypto.privateDecrypt(
            {
                key: this.privateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256',
            },
            Buffer.from(encrypted_aes_key, 'base64')
        );

        // 2. Decrypt the data using AES-128-GCM
        const decipher = crypto.createDecipheriv(
            'aes-128-gcm',
            aesKey,
            Buffer.from(initial_vector, 'base64')
        );

        const encryptedBuffer = Buffer.from(encrypted_payload, 'base64');
        
        // WhatsApp AES-GCM tags are appended to the ciphertext
        const authTag = encryptedBuffer.slice(encryptedBuffer.length - 16);
        const ciphertext = encryptedBuffer.slice(0, encryptedBuffer.length - 16);

        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(ciphertext as any, undefined, 'utf8');
        decrypted += decipher.final('utf8');

        return {
            data: JSON.parse(decrypted),
            aesKey,
            initialVector: initial_vector
        };
    }

    /**
     * Encrypts the response back to WhatsApp
     * Using flipped bits IV as per Meta documentation
     */
    encryptResponse(response: any, aesKey: Buffer, initialVector: string): string {
        const iv = Buffer.from(initialVector, 'base64');
        const flippedIv = Buffer.alloc(iv.length);
        
        // Flip bits of IV for the response
        for (let i = 0; i < iv.length; i++) {
            flippedIv[i] = ~iv[i];
        }

        const cipher = crypto.createCipheriv('aes-128-gcm', aesKey, flippedIv);
        
        let encrypted = cipher.update(JSON.stringify(response), 'utf8', 'base64');
        encrypted += cipher.final('base64');
        
        const authTag = cipher.getAuthTag().toString('base64');
        
        // Final payload is ciphertext + authTag
        return encrypted + authTag;
    }
}
