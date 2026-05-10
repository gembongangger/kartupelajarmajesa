import { createHash } from 'node:crypto';

/**
 * Menghasilkan hash MD5 dari string.
 * Menggunakan node:crypto agar kompatibel dengan Node.js (saat dev) 
 * dan Cloudflare Workers (dengan nodejs_compat).
 */
export async function md5(data: string): Promise<string> {
	return createHash('md5').update(data).digest('hex');
}
