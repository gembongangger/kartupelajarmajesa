import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import db from '$lib/server/db';
import { md5 } from '$lib/server/crypto';

export const load: PageServerLoad = async ({ params, locals }) => {
    if (!locals.user || locals.user.role !== 'admin') {
        throw redirect(302, '/');
    }

    const result = await db.execute({
        sql: 'SELECT * FROM siswa WHERE nisn = ?',
        args: [params.nisn]
    });
    const student = result.rows[0];
    if (!student) throw redirect(302, '/dashboard/siswa');

    const kelasResult = await db.execute('SELECT * FROM kelas ORDER BY nama ASC');
    const kelas = kelasResult.rows;

    return { student, kelas };
};

export const actions: Actions = {
    default: async ({ request, params, locals }) => {
        if (!locals.user || locals.user.role !== 'admin') return fail(401);

        const data = await request.formData();
        const newNisn = data.get('nisn')?.toString().trim();
        const nama = data.get('nama')?.toString().trim();
        const nis = data.get('nis')?.toString().trim();
        const kelas = data.get('kelas')?.toString().trim();
        const jk = data.get('jk')?.toString().trim();
        const tempat = data.get('tempat')?.toString().trim();
        const tgl = data.get('tgl')?.toString().trim();

        if (!newNisn || !nama || !nis) {
            return fail(400, { message: 'NISN, Nama, dan NIS wajib diisi.' });
        }

        try {
            // 1. Dapatkan user_id dari siswa ini
            const studentResult = await db.execute({
                sql: 'SELECT user_id FROM siswa WHERE nisn = ?',
                args: [params.nisn]
            });
            const userId = studentResult.rows[0]?.user_id;

            // 2. Update data siswa
            await db.execute({
                sql: `UPDATE siswa SET 
                    nisn = ?,
                    nama = ?,
                    nis = ?,
                    kelas = ?,
                    jenis_kelamin = ?,
                    tempat_lahir = ?,
                    tanggal_lahir = ?
                    WHERE nisn = ?`,
                args: [newNisn, nama, nis, kelas, jk, tempat, tgl, params.nisn]
            });

            // 3. Jika NISN berubah, update juga username dan password di tabel users
            if (userId && newNisn !== params.nisn) {
                const hashedPass = await md5(newNisn);
                await db.execute({
                    sql: 'UPDATE users SET username = ?, password = ? WHERE id = ?',
                    args: [newNisn, hashedPass, userId]
                });
            }
        } catch (e: any) {
            console.error('Update Student Error:', e);
            return fail(500, { message: 'Gagal memperbarui data: ' + e.message });
        }

        throw redirect(302, '/dashboard/siswa');
    }
};
