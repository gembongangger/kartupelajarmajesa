import { md5 } from '$lib/server/crypto';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import db from '$lib/server/db';
import { fileToBlobValue, imageMimeFromFile } from '$lib/server/photo';



export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/');
	}

	const result = await db.execute(`
		SELECT
			id,
			nama_sekolah,
			alamat,
			kepala_sekolah,
			nip_kepala_sekolah,
			tanggal_ttd,
			tata_tertib,
			kota_ttd,
			logo IS NOT NULL AS has_logo,
			tanda_tangan IS NOT NULL AS has_tanda_tangan,
			background IS NOT NULL AS has_background,
			background_belakang IS NOT NULL AS has_background_belakang
		FROM pengaturan
		WHERE id = 1
	`);
	const pengaturan = result.rows[0];

	const kelasResult = await db.execute('SELECT * FROM kelas ORDER BY nama ASC');
	const kelas = kelasResult.rows;

	return { pengaturan, kelas };
};

export const actions: Actions = {
	simpan: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(401);

		const data = await request.formData();
		const nama = data.get('nama_sekolah');
		const alamat = data.get('alamat');
		const kepala = data.get('kepala_sekolah');
		const nip_kepala = data.get('nip_kepala_sekolah');
		const tanggal = data.get('tanggal_ttd');

		const password_lama = data.get('password_lama');
		const password_baru = data.get('password_baru');
		const konfirmasi_password = data.get('konfirmasi_password');

		if (password_lama || password_baru || konfirmasi_password) {
			const adminResult = await db.execute('SELECT password FROM users WHERE id = 1');
			const admin = adminResult.rows[0];
			const hashedLama = await md5(password_lama?.toString() || '');

			if (hashedLama !== admin.password) {
				return fail(400, { message: 'Password lama salah' });
			}

			if (password_baru !== konfirmasi_password) {
				return fail(400, { message: 'Konfirmasi password tidak cocok' });
			}

			const hashedBaru = await md5(password_baru?.toString() || '');
			await db.execute({
				sql: 'UPDATE users SET password = ? WHERE id = 1',
				args: [hashedBaru]
			});
		}

		const uploadFile = async (fileEntry: FormDataEntryValue | null) => {
			if (!fileEntry || typeof fileEntry === 'string' || !(fileEntry instanceof File) || fileEntry.size === 0) {
				return null;
			}

			const file = fileEntry as File;
			const bytes = new Uint8Array(await file.arrayBuffer());
			return {
				blob: fileToBlobValue(bytes),
				mime: imageMimeFromFile(file)
			};
		};

		const newLogo = await uploadFile(data.get('logo'));
		const newTtd = await uploadFile(data.get('tanda_tangan'));
		const newBg = await uploadFile(data.get('background'));
		const newBg2 = await uploadFile(data.get('background_belakang'));

		const tata_tertib = data.get('tata_tertib');
		const kota_ttd = data.get('kota_ttd');

		const args = [
			nama?.toString(),
			alamat?.toString(),
			kepala?.toString(),
			nip_kepala?.toString(),
			tanggal?.toString(),
			tata_tertib?.toString(),
			kota_ttd?.toString(),
			newLogo?.blob ?? null,
			newLogo?.mime ?? null,
			newTtd?.blob ?? null,
			newTtd?.mime ?? null,
			newBg?.blob ?? null,
			newBg?.mime ?? null,
			newBg2?.blob ?? null,
			newBg2?.mime ?? null
		];

		try {
			await db.execute({
				sql: `UPDATE pengaturan SET
					nama_sekolah = ?,
					alamat = ?,
					kepala_sekolah = ?,
					nip_kepala_sekolah = ?,
					tanggal_ttd = ?,
					tata_tertib = ?,
					kota_ttd = ?,
					logo = COALESCE(?, logo),
					logo_mime = COALESCE(?, logo_mime),
					tanda_tangan = COALESCE(?, tanda_tangan),
					tanda_tangan_mime = COALESCE(?, tanda_tangan_mime),
					background = COALESCE(?, background),
					background_mime = COALESCE(?, background_mime),
					background_belakang = COALESCE(?, background_belakang),
					background_belakang_mime = COALESCE(?, background_belakang_mime)
					WHERE id = 1`,
				args
			});
		} catch (e: any) {
			console.error('Turso error:', e);
			return fail(500, { message: 'Gagal menyimpan ke database: ' + (e?.message || 'unknown error') });
		}

		return { success: true };
	},

	simpan_kelas: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(401);

		const data = await request.formData();
		const list = data.get('kelas')?.toString() || '';
		const names = list.split('\n').map(s => s.trim()).filter(Boolean);

		try {
			await db.execute('DELETE FROM kelas');
			for (const nama of names) {
				await db.execute({
					sql: 'INSERT INTO kelas (nama) VALUES (?)',
					args: [nama]
				});
			}
			return { success: true };
		} catch (e: any) {
			return fail(500, { message: 'Gagal menyimpan kelas: ' + (e?.message || 'unknown error') });
		}
	}
};
