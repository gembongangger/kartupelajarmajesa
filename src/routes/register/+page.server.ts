import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import db from '$lib/server/db';
import { md5 } from '$lib/server/crypto';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		if (locals.user.role === 'admin') {
			throw redirect(302, '/dashboard');
		} else {
			throw redirect(302, '/siswa');
		}
	}

	const kelasResult = await db.execute('SELECT * FROM kelas ORDER BY nama ASC');
	const kelas = kelasResult.rows;

	return { kelas };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const nisn = data.get('nisn')?.toString().trim() || '';
		const nama = data.get('nama')?.toString().trim() || '';
		const nis = data.get('nis')?.toString().trim() || '';
		const kelas = data.get('kelas')?.toString().trim() || '';
		const jk = data.get('jk')?.toString().trim() || '';
		const tempat = data.get('tempat')?.toString().trim() || '';
		const tgl = data.get('tgl')?.toString().trim() || '';
		const alamat = data.get('alamat')?.toString().trim() || '';

		if (!nisn || !nama || !kelas || !jk) {
			return fail(400, { message: 'NISN, Nama, Kelas, dan Jenis Kelamin wajib diisi.' });
		}

		try {
			const existing = await db.execute({
				sql: 'SELECT id FROM users WHERE username = ?',
				args: [nisn]
			});
			if (existing.rows[0]) {
				return fail(400, { message: 'NISN sudah terdaftar.' });
			}

			const password = await md5(nisn);

			await db.batch([
				{
					sql: 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
					args: [nisn, password, 'siswa']
				},
				{
					sql: 'INSERT INTO siswa (nama, nis, nisn, kelas, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, last_insert_rowid())',
					args: [nama, nis || '', nisn, kelas, jk, tempat, tgl, alamat]
				}
			], 'write');
		} catch (e: any) {
			if (e.message?.includes('UNIQUE constraint')) {
				return fail(400, { message: 'NISN atau NIS sudah terdaftar.' });
			}
			console.error('Register Error:', e);
			return fail(500, { message: 'Gagal mendaftarkan akun: ' + (e?.message || 'unknown') });
		}

		throw redirect(302, '/?registered=1');
	}
};
