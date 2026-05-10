import { md5 } from '$lib/server/crypto';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import db from '$lib/server/db';
import * as XLSX from 'xlsx';



export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/');
	}
	return {};
};

function formatDate(date: Date) {
	if (isNaN(date.getTime())) return '';
	const y = date.getFullYear();
	const m = (date.getMonth() + 1).toString().padStart(2, '0');
	const d = date.getDate().toString().padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(401);

		const data = await request.formData();
		const file = data.get('file') as File;

		if (!file || file.size === 0) return fail(400, { message: 'No file uploaded' });

		try {
			const buffer = await file.arrayBuffer();
			const workbook = XLSX.read(buffer, { cellDates: true });
			const sheetName = workbook.SheetNames[0];
			const sheet = workbook.Sheets[sheetName];
			const rows = XLSX.utils.sheet_to_json(sheet, { header: 'A' }) as any[];

			const validKelasResult = await db.execute('SELECT nama FROM kelas');
			const validKelasSet = new Set(validKelasResult.rows.map((r: any) => String(r.nama)));

			const invalidKelas: string[] = [];
			for (let i = 1; i < rows.length; i++) {
				const row = rows[i];
				const nisn = row.C?.toString() || '';
				if (!nisn) continue;
				const kelas = (row.D || '').toString().trim();
				if (kelas && !validKelasSet.has(kelas)) {
					invalidKelas.push(`Baris ${i + 1}: Kelas "${kelas}" tidak terdaftar`);
				}
			}

			if (invalidKelas.length > 0) {
				return fail(400, { message: 'Upload dibatalkan. Kelas berikut tidak dikenal:\n' + invalidKelas.join('\n') });
			}

			const existingNisnResult = await db.execute("SELECT username FROM users WHERE role = 'siswa'");
			const existingNisnSet = new Set(existingNisnResult.rows.map((r: any) => String(r.username)));

			const existingNisResult = await db.execute("SELECT nis FROM siswa WHERE nis IS NOT NULL AND nis != ''");
			const existingNisSet = new Set(existingNisResult.rows.map((r: any) => String(r.nis)));

			const duplicateErrors: string[] = [];
			const seenNisn = new Set<string>();
			const seenNis = new Set<string>();

			for (let i = 1; i < rows.length; i++) {
				const row = rows[i];
				const nisn = row.C?.toString() || '';
				const nis = row.B?.toString() || '';

				if (!nisn) continue;

				if (seenNisn.has(nisn)) {
					duplicateErrors.push(`Baris ${i + 1}: NISN "${nisn}" duplikat dalam file`);
				}
				seenNisn.add(nisn);

				if (existingNisnSet.has(nisn)) {
					duplicateErrors.push(`Baris ${i + 1}: NISN "${nisn}" sudah terdaftar di database`);
				}

				if (nis) {
					if (seenNis.has(nis)) {
						duplicateErrors.push(`Baris ${i + 1}: NIS "${nis}" duplikat dalam file`);
					}
					seenNis.add(nis);

					if (existingNisSet.has(nis)) {
						duplicateErrors.push(`Baris ${i + 1}: NIS "${nis}" sudah terdaftar di database`);
					}
				}
			}

			if (duplicateErrors.length > 0) {
				return fail(400, { message: 'Upload dibatalkan. Ditemukan data duplikat:\n' + duplicateErrors.join('\n') });
			}

			let success = 0;
			let failed = 0;
			let errorDetails: string[] = [];

			for (let i = 1; i < rows.length; i++) {
				const row = rows[i];
				const nama = row.A || '';
				const nis = row.B || '';
				const nisn = row.C?.toString() || '';
				const kelas = (row.D || '').toString().trim();
				const jk = row.E || '';
				const tempat = row.F || '';
				let tgl = row.G;

				if (!nisn) {
					failed++;
					errorDetails.push(`Baris ${i + 1}: NISN kosong.`);
					continue;
				}

				if (tgl instanceof Date) {
					tgl = formatDate(tgl);
				} else if (typeof tgl === 'number') {
					const date = new Date(Math.round((tgl - 25569) * 86400 * 1000));
					tgl = formatDate(date);
				} else {
					tgl = tgl?.toString() || '';
				}

				try {
					const password = await md5(nisn);

					await db.batch([
						{
							sql: 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
							args: [nisn, password, 'siswa']
						},
						{
							sql: 'INSERT INTO siswa (nama, nis, nisn, kelas, jenis_kelamin, tempat_lahir, tanggal_lahir, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, last_insert_rowid())',
							args: [nama, nis, nisn, kelas, jk, tempat, tgl]
						}
					], 'write');

					success++;
				} catch (e: any) {
					failed++;
					errorDetails.push(`Baris ${i + 1}: ${e.message}`);
				}
			}

			return { success, failed, errorDetails };
		} catch (error: any) {
			return fail(500, { message: 'Gagal memproses file: ' + error.message });
		}
	}
};
