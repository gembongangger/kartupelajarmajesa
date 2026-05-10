import { redirect, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/db';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			throw redirect(302, '/');
		}

		const nisn = url.searchParams.get('nisn') || '4900001';

		const studentResult = await db.execute({
			sql: 'SELECT * FROM siswa WHERE nisn = ? LIMIT 1',
			args: [nisn]
		});

		const settingsResult = await db.execute('SELECT id, nama_sekolah FROM pengaturan LIMIT 1');

		return json({
			status: 'ok',
			student_exists: studentResult.rows.length > 0,
			settings_exists: settingsResult.rows.length > 0,
			message: 'Server API berfungsi. PDF dihasilkan di browser.'
		});
	} catch (e: any) {
		console.error('Test endpoint error:', e);
		return json({ status: 'error', message: e.message }, { status: 500 });
	}
};
