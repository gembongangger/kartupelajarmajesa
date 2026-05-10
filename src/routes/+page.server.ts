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

	try {
		const result = await db.execute(`
			SELECT
				id,
				nama_sekolah,
				alamat,
				kepala_sekolah,
				nip_kepala_sekolah,
				tanggal_ttd,
				logo IS NOT NULL AS has_logo
			FROM pengaturan
			LIMIT 1
		`);
		const pengaturan = result.rows[0];
		return { pengaturan };
	} catch (e) {
		return { pengaturan: null };
	}
};

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = data.get('username')?.toString().trim() || '';
		const password = data.get('password')?.toString().trim() || '';

		if (!username || !password) {
			return fail(400, { message: 'Username dan Password wajib diisi.' });
		}

		const hashedPassword = await md5(password);

		let user;
		try {
			const result = await db.execute({
				sql: 'SELECT * FROM users WHERE username = ? AND password = ?',
				args: [username, hashedPassword]
			});
			user = result.rows[0];
		} catch (e: any) {
			console.error('Database Login Error:', e);
			return fail(500, { message: 'Kesalahan Database: ' + e.message });
		}

		if (!user) {
			return fail(400, { message: 'Login gagal! Username atau Password salah.' });
		}

		cookies.set('session', `${user.id}:${user.role}`, {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			maxAge: 60 * 60 * 24
		});

		if (user.role === 'admin') {
			throw redirect(302, '/dashboard');
		} else {
			throw redirect(302, '/siswa');
		}
	}
};
