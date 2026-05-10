import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
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

		const userCheck = await db.execute({
			sql: 'SELECT COUNT(*) as cnt FROM users WHERE role = ?',
			args: ['admin']
		});
		if (Number(userCheck.rows[0]?.cnt) === 0) {
			const adminPass = await md5('admin123');
			await db.execute({
				sql: 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
				args: ['admin', adminPass, 'admin']
			});
		}

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
