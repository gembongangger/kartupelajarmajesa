import { Buffer } from 'node:buffer';

export function fileToBlobValue(buffer: Buffer | ArrayBuffer | Uint8Array): Uint8Array {
    if (buffer instanceof Uint8Array) return buffer;
    return new Uint8Array(buffer);
}

export function photoValueToBuffer(value: unknown): Uint8Array | null {
    if (!value) return null;

    if (value instanceof ArrayBuffer) {
        return new Uint8Array(value);
    }

    if (value instanceof Uint8Array) {
        return value;
    }

    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
        return new Uint8Array(value);
    }

    if (typeof value === 'string') {
        const base64 = value.startsWith('data:') ? value.split(',')[1] : value;
        if (!base64) return null;

        try {
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes;
        } catch {
            return null;
        }
    }

    return null;
}

export function uint8ArrayToBase64(uint8: Uint8Array): string {
    let binary = '';
    const len = uint8.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary);
}

export function getDefaultPhotoBuffer(): Uint8Array | null {
    return null;
}

export function imageMimeFromFile(file: File): string {
    if (file.type) {
        return file.type;
    }

    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith('.png')) return 'image/png';
    if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';

    return 'application/octet-stream';
}

export function imageFormatFromBuffer(buffer: Uint8Array): 'PNG' | 'JPEG' | null {
    if (buffer.length >= 8 && 
        buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
        buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a) {
        return 'PNG';
    }

    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'JPEG';
    }

    return null;
}
