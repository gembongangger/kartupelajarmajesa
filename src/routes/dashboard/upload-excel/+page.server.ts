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

function parseTgl(value: unknown): string {
	if (value instanceof Date && !isNaN(value.getTime())) return formatDate(value);
	if (typeof value === 'number') {
		return formatDate(new Date(Math.round((value - 25569) * 86400 * 1000)));
	}
	if (typeof value === 'string') {
		const s = value.trim();
		if (!s) return '';
		let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
		if (m) return formatDate(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
		m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
		if (m) {
			let day = Number(m[1]);
			let month = Number(m[2]);
			let year = Number(m[3]);
			if (year < 100) year += 2000;
			if (day > 12) { const t = day; day = month; month = t; }
			return formatDate(new Date(year, month - 1, day));
		}
		const d = new Date(s);
		if (!isNaN(d.getTime())) return formatDate(d);
		return s;
	}
	return '';
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
			const rows = XLSX.utils.sheet_to_json(sheet, { header: 'A', raw: false }) as any[];

			const validKelasResult = await db.execute('SELECT nama FROM kelas');
			const validKelasSet = new Set(validKelasResult.rows.map((r: any) => String(r.nama)));

			const invalidKelas: string[] = [];
			for (let i = 1; i < rows.length; i++) {
				const row = rows[i];
				const nisn = String(row.C ?? '').trim();
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
				const nisn = String(row.C ?? '').trim();
				const nis = String(row.B ?? '').trim();

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
				const nis = String(row.B ?? '').trim();
				const nisn = String(row.C ?? '').trim();
				const kelas = (row.D || '').toString().trim();
				const jk = row.E || '';
				const tempat = row.F || '';
				const alamat = row.H || '';
				const tgl = parseTgl(row.G);

				if (!nisn) {
					failed++;
					errorDetails.push(`Baris ${i + 1}: NISN kosong.`);
					continue;
				}

				try {
					const password = await md5(nisn);

					await db.batch([
						{
							sql: 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
							args: [nisn, password, 'siswa']
						},
						{
							sql: 'INSERT INTO siswa (nama, nis, nisn, kelas, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, last_insert_rowid())',
							args: [nama, nis, nisn, kelas, jk, tempat, tgl, alamat]
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
