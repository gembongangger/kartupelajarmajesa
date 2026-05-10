import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import db from '$lib/server/db';

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
        const nama = data.get('nama');
        const nis = data.get('nis');
        const kelas = data.get('kelas');
        const jk = data.get('jk');
        const tempat = data.get('tempat');
        const tgl = data.get('tgl');

        await db.execute({
            sql: `UPDATE siswa SET 
                nama = ?,
                nis = ?,
                kelas = ?,
                jenis_kelamin = ?,
                tempat_lahir = ?,
                tanggal_lahir = ?
                WHERE nisn = ?`,
            args: [
                nama?.toString(), 
                nis?.toString(), 
                kelas?.toString(), 
                jk?.toString(), 
                tempat?.toString(), 
                tgl?.toString(), 
                params.nisn
            ]
        });

        throw redirect(302, '/dashboard/siswa');
    }
};
