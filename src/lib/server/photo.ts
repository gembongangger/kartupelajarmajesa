import fs from 'fs';
import path from 'path';

export function fileToBlobValue(buffer: Buffer): Uint8Array {
    return new Uint8Array(buffer);
}

export function photoValueToBuffer(value: unknown): Buffer | null {
    if (!value) return null;

    if (Buffer.isBuffer(value)) {
        return value;
    }

    if (value instanceof Uint8Array) {
        return Buffer.from(value);
    }

    if (value instanceof ArrayBuffer) {
        return Buffer.from(value);
    }

    if (typeof value === 'string') {
        const base64 = value.startsWith('data:') ? value.split(',')[1] : value;
        if (!base64) return null;

        try {
            return Buffer.from(base64, 'base64');
        } catch {
            return null;
        }
    }

    return null;
}

export function getDefaultPhotoBuffer(): Buffer | null {
    const defaultPath = path.join('static', 'foto', 'default.jpg');

    if (!fs.existsSync(defaultPath)) {
        return null;
    }

    return fs.readFileSync(defaultPath);
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

export function imageFormatFromBuffer(buffer: Buffer): 'PNG' | 'JPEG' | null {
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
        return 'PNG';
    }

    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'JPEG';
    }

    return null;
}
