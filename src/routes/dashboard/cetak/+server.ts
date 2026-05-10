import { error, json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/db';
import { uint8ArrayToBase64 } from '$lib/server/photo';

function blobToDataURL(value: unknown, mime: string): string | null {
	if (!value) return null;
	if (value instanceof Uint8Array) {
		return `data:${mime};base64,${uint8ArrayToBase64(value)}`;
	}
	if (value instanceof ArrayBuffer) {
		return `data:${mime};base64,${uint8ArrayToBase64(new Uint8Array(value))}`;
	}
	return null;
}

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
			foto: blobToDataURL(row.foto, 'image/jpeg')
		}));

		const settingsResult = await db.execute('SELECT * FROM pengaturan LIMIT 1');
		const pengaturanRow = settingsResult.rows[0];

		const pengaturan = {
			...pengaturanRow,
			logo: blobToDataURL(pengaturanRow.logo, pengaturanRow.logo_mime || 'image/png'),
			tanda_tangan: blobToDataURL(pengaturanRow.tanda_tangan, pengaturanRow.tanda_tangan_mime || 'image/png'),
			background: blobToDataURL(pengaturanRow.background, pengaturanRow.background_mime || 'image/jpeg'),
			background_belakang: blobToDataURL(pengaturanRow.background_belakang, pengaturanRow.background_belakang_mime || 'image/jpeg')
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
