import type { RequestHandler } from './$types';
import db from '$lib/server/db';
import { photoValueToBuffer } from '$lib/server/photo';

const imageColumns = {
    logo: ['logo', 'logo_mime'],
    tanda_tangan: ['tanda_tangan', 'tanda_tangan_mime'],
    background: ['background', 'background_mime'],
    background_belakang: ['background_belakang', 'background_belakang_mime']
} as const;

const NO_CACHE_HEADERS = {
    'Cache-Control': 'no-cache, no-store, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
};

export const GET: RequestHandler = async ({ params }) => {
    const columns = imageColumns[params.jenis as keyof typeof imageColumns];

    if (!columns) {
        return new Response('Gambar tidak ditemukan', { status: 404, headers: NO_CACHE_HEADERS });
    }

    const [imageColumn, mimeColumn] = columns;
    const result = await db.execute(`SELECT ${imageColumn} AS gambar, ${mimeColumn} AS mime FROM pengaturan WHERE id = 1`);
    const row = result.rows[0];
    const buffer = photoValueToBuffer(row?.gambar);

    if (!buffer) {
        return new Response('Gambar tidak ditemukan', { status: 404, headers: NO_CACHE_HEADERS });
    }

    return new Response(buffer, {
        headers: {
            'Content-Type': row?.mime?.toString() || 'application/octet-stream',
            ...NO_CACHE_HEADERS
        }
    });
};
