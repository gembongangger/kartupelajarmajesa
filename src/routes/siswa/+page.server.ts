import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import db from '$lib/server/db';
import { md5 } from '$lib/server/crypto';
import { fileToBlobValue } from '$lib/server/photo';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'siswa') {
		throw redirect(302, '/');
	}

	const result = await db.execute({
		sql: 'SELECT * FROM siswa WHERE user_id = ?',
		args: [locals.user.id]
	});
	const siswa = result.rows[0];

	if (!siswa) {
		throw redirect(302, '/');
	}

	const kelasResult = await db.execute('SELECT * FROM kelas ORDER BY nama ASC');
	const kelas = kelasResult.rows;

	return { siswa, kelas };
};

export const actions: Actions = {
	update: async ({ request, locals }) => {
		if (!locals.user) return fail(401);

		const data = await request.formData();
		const nisn = data.get('nisn')?.toString().trim() || '';
		const nis = data.get('nis')?.toString().trim() || '';
		const nama = data.get('nama')?.toString() || '';
		const jk = data.get('jk')?.toString() || '';
		const tempat = data.get('tempat')?.toString() || '';
		const tgl = data.get('tgl')?.toString() || '';
		const kelas = data.get('kelas')?.toString() || '';
		const alamat = data.get('alamat')?.toString() || '';

		if (!nisn) {
			return fail(400, { message: 'NISN wajib diisi.' });
		}

		try {
			const current = await db.execute({
				sql: 'SELECT nisn FROM siswa WHERE user_id = ?',
				args: [locals.user.id]
			});
			const oldNisn = current.rows[0]?.nisn;

			await db.execute({
				sql: `UPDATE siswa SET 
					nisn = ?,
					nis = ?,
					nama = ?,
					jenis_kelamin = ?,
					tempat_lahir = ?,
					tanggal_lahir = ?,
					kelas = ?,
					alamat = ?
					WHERE user_id = ?`,
				args: [nisn, nis || '', nama, jk, tempat, tgl, kelas, alamat, locals.user.id]
			});

			if (oldNisn && oldNisn !== nisn) {
				const newPass = await md5(nisn);
				await db.execute({
					sql: 'UPDATE users SET username = ?, password = ? WHERE id = ?',
					args: [nisn, newPass, locals.user.id]
				});
			}
		} catch (e: any) {
			if (e.message?.includes('UNIQUE constraint')) {
				return fail(400, { message: 'NISN atau NIS sudah digunakan siswa lain.' });
			}
			console.error('Update siswa error:', e);
			return fail(500, { message: 'Gagal menyimpan data.' });
		}

		return { success: true };
	},
	upload_foto: async ({ request, locals }) => {
		if (!locals.user) return fail(401);

		const data = await request.formData();
		const file = data.get('foto') as File;

		if (!file || file.size === 0) {
			return fail(400, { message: 'File tidak ditemukan' });
		}

		const result = await db.execute({
			sql: 'SELECT nisn FROM siswa WHERE user_id = ?',
			args: [locals.user.id]
		});
		const siswa = result.rows[0];

		if (!siswa) return fail(404, { message: 'Data siswa tidak ditemukan' });

		const bytes = new Uint8Array(await file.arrayBuffer());
		await db.execute({
			sql: 'UPDATE siswa SET foto = ? WHERE nisn = ?',
			args: [fileToBlobValue(bytes), siswa.nisn]
		});

		return { success: true };
	}
};
