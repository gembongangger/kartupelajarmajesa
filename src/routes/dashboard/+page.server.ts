import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import db from '$lib/server/db';

async function md5(data: string): Promise<string> {
	const hash = await crypto.subtle.digest('MD5', new TextEncoder().encode(data));
	return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user || locals.user.role !== 'admin') {
        throw redirect(302, '/');
    }

    return {
        user: locals.user
    };
};

export const actions: Actions = {
    reset: async ({ locals }) => {
        if (!locals.user || locals.user.role !== 'admin') return fail(401);

        try {
            await db.executeMultiple(`
                DROP TABLE IF EXISTS siswa;
                DROP TABLE IF EXISTS users;
                DROP TABLE IF EXISTS pengaturan;

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
                    background_belakang_mime TEXT
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
                CREATE TABLE IF NOT EXISTS kelas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nama TEXT UNIQUE NOT NULL
                );

                INSERT INTO pengaturan (id, nama_sekolah, alamat, kepala_sekolah, nip_kepala_sekolah, tanggal_ttd)
                VALUES (1, 'SD NEGERI BERMUTU', 'Jalan Kebagusan, RT.27 RW.05 Kelurahan Sumberberkah, Kec. Gemahripah', 'Nir Singgih Purwantio, S.Pd.', '198705092021021004', '2025-07-14');
            `);

			const adminPass = await md5('admin123');
			await db.execute({
                sql: 'INSERT INTO users (id, username, password, role) VALUES (1, ?, ?, ?)',
                args: ['admin', adminPass, 'admin']
            });

            return { success: true, message: 'Database berhasil di-reset. Password admin adalah admin123. Aset (logo/background) harus diunggah ulang secara manual.' };
        } catch (e: any) {
            return fail(500, { message: 'Reset failed: ' + e.message });
        }
    }
};
