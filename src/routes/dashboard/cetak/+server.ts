import { error, json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/db';
import { Buffer } from 'node:buffer';

export const GET: RequestHandler = async ({ url, locals }) => {
    try {
        if (!locals.user || locals.user.role !== 'admin') {
            throw redirect(302, '/');
        }

        const nisn = url.searchParams.get('nisn');
        const kelas = url.searchParams.get('kelas');

        let sql = 'SELECT * FROM siswa';
        let args: any[] = [];

        if (nisn) {
            sql += ' WHERE nisn = ?';
            args.push(nisn);
        } else if (kelas) {
            sql += ' WHERE kelas = ?';
            args.push(kelas);
        }

        const studentsResult = await db.execute({ sql, args });
        const students = studentsResult.rows.map((row: any) => ({
            ...row,
            foto: row.foto ? `data:image/jpeg;base64,${Buffer.from(row.foto).toString('base64')}` : null
        }));
        
        const settingsResult = await db.execute('SELECT * FROM pengaturan LIMIT 1');
        const pengaturanRow = settingsResult.rows[0];
        
        const pengaturan = {
            ...pengaturanRow,
            logo: pengaturanRow.logo ? `data:${pengaturanRow.logo_mime || 'image/png'};base64,${Buffer.from(pengaturanRow.logo).toString('base64')}` : null,
            tanda_tangan: pengaturanRow.tanda_tangan ? `data:${pengaturanRow.tanda_tangan_mime || 'image/png'};base64,${Buffer.from(pengaturanRow.tanda_tangan).toString('base64')}` : null,
            background: pengaturanRow.background ? `data:${pengaturanRow.background_mime || 'image/jpeg'};base64,${Buffer.from(pengaturanRow.background).toString('base64')}` : null,
            background_belakang: pengaturanRow.background_belakang ? `data:${pengaturanRow.background_belakang_mime || 'image/jpeg'};base64,${Buffer.from(pengaturanRow.background_belakang).toString('base64')}` : null
        };

        return json({
            students,
            pengaturan
        });
    } catch (e) {
        console.error('Data fetch error:', e);
        if (e instanceof Response) throw e;
        throw error(500, 'Gagal mengambil data cetak');
    }
};
