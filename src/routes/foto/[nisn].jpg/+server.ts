import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/db';
import { getDefaultPhotoBuffer, photoValueToBuffer } from '$lib/server/photo';

export const GET: RequestHandler = async ({ params }) => {
    const result = await db.execute({
        sql: 'SELECT foto FROM siswa WHERE nisn = ?',
        args: [params.nisn]
    });

    const row = result.rows[0];

    if (!row) {
        throw error(404, 'Foto tidak ditemukan');
    }

    const buffer = photoValueToBuffer(row?.foto) || getDefaultPhotoBuffer();

    if (!buffer) {
        throw error(404, 'Foto tidak ditemukan');
    }

    return new Response(buffer, {
        headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'private, max-age=0, must-revalidate'
        }
    });
};
