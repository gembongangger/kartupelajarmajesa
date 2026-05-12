import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import db from '$lib/server/db';
import { md5 } from '$lib/server/crypto';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/');
	}

	try {
		const result = await db.execute(`
			SELECT
				(SELECT COUNT(*) FROM siswa) as total_siswa,
				(SELECT COUNT(*) FROM kelas) as total_kelas,
				(SELECT COUNT(*) FROM users WHERE role = 'admin') as total_admin
		`);
		const stats = result.rows[0];

		const pengaturanResult = await db.execute(`
			SELECT 
				nama_sekolah,
				kepala_sekolah,
				logo IS NOT NULL AS has_logo,
				tanda_tangan IS NOT NULL AS has_ttd,
				background IS NOT NULL AS has_bg,
				background_belakang IS NOT NULL AS has_bg2
			FROM pengaturan 
			LIMIT 1
		`);
		const pengaturan = pengaturanResult.rows[0];

		return {
			stats,
			pengaturan
		};
	} catch (e) {
		console.error('Dashboard Load Error:', e);
		return {
			stats: null,
			pengaturan: null
		};
	}
};

export const actions: Actions = {
	reset: async ({ locals }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(401);

		try {
			await db.executeMultiple(`
				DROP TABLE IF EXISTS siswa;
				DROP TABLE IF EXISTS users;
				DROP TABLE IF EXISTS pengaturan;
				DROP TABLE IF EXISTS kelas;

				CREATE TABLE pengaturan (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					nama_sekolah TEXT,
					alamat TEXT,
					kepala_sekolah TEXT,
					nip_kepala_sekolah TEXT,
					tanggal_ttd TEXT,
					tata_tertib TEXT,
					kota_ttd TEXT,
					logo BLOB,
					logo_mime TEXT,
					tanda_tangan BLOB,
					tanda_tangan_mime TEXT,
					background BLOB,
					background_mime TEXT,
					background_belakang BLOB,
					background_belakang_mime TEXT,
					jenis_kertas TEXT DEFAULT 'A4',
					lebar_kertas INTEGER DEFAULT 210,
					tinggi_kertas INTEGER DEFAULT 297,
					lebar_kartu INTEGER DEFAULT 86,
					tinggi_kartu INTEGER DEFAULT 56,
					margin_kiri INTEGER DEFAULT 10,
					margin_atas INTEGER DEFAULT 10,
					spasi_kartu INTEGER DEFAULT 4,
					gap_depan_belakang INTEGER DEFAULT 4
				);
				CREATE TABLE users (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					username TEXT UNIQUE NOT NULL,
					password TEXT NOT NULL,
					role TEXT CHECK(role IN ('admin','siswa')) NOT NULL
				);
				CREATE TABLE siswa (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					nama TEXT NOT NULL,
					nis TEXT UNIQUE NOT NULL,
					nisn TEXT UNIQUE NOT NULL,
					kelas TEXT,
					jenis_kelamin TEXT CHECK(jenis_kelamin IN ('L','P')) NOT NULL,
					tempat_lahir TEXT,
					tanggal_lahir TEXT,
					foto BLOB,
					user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE
				);
				CREATE TABLE kelas (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					nama TEXT UNIQUE NOT NULL
				);

				INSERT INTO pengaturan (id, nama_sekolah, alamat, kepala_sekolah, nip_kepala_sekolah, tanggal_ttd,
					jenis_kertas, lebar_kertas, tinggi_kertas, lebar_kartu, tinggi_kartu, margin_kiri, margin_atas, spasi_kartu, gap_depan_belakang)
				VALUES (1, 'SD NEGERI BERMUTU', 'Jalan Kebagusan, RT.27 RW.05 Kelurahan Sumberberkah, Kec. Gemahripah', 'Nir Singgih Purwantio, S.Pd.', '198705092021021004', '2025-07-14',
					'A4', 210, 297, 86, 56, 10, 10, 4, 4);
			`);

			const adminPass = await md5('admin123');
			await db.execute({
				sql: 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
				args: ['admin', adminPass, 'admin']
			});

			return { success: true, message: 'Database berhasil di-reset. Password admin adalah admin123.' };
		} catch (e: any) {
			return fail(500, { message: 'Reset failed: ' + e.message });
		}
	}
};
