import type { Handle } from '@sveltejs/kit';
import db from '$lib/server/db';
import crypto from 'crypto';

let inited = false;

async function initDb() {
    if (inited) return;
    inited = true;

    try {
        await db.executeMultiple(`
            CREATE TABLE IF NOT EXISTS pengaturan (
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
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT CHECK(role IN ('admin','siswa')) NOT NULL
            );
            CREATE TABLE IF NOT EXISTS siswa (
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
        `);

        const pengaturanCheck = await db.execute('SELECT COUNT(*) as cnt FROM pengaturan');
        if (Number(pengaturanCheck.rows[0]?.cnt) === 0) {
            await db.execute(
                `INSERT INTO pengaturan (id, nama_sekolah, alamat, kepala_sekolah, nip_kepala_sekolah, tanggal_ttd)
                VALUES (1, 'SD NEGERI BERMUTU', 'Jalan Kebagusan, RT.27 RW.05 Kelurahan Sumberberkah, Kec. Gemahripah',
                'Nir Singgih Purwantio, S.Pd.', '198705092021021004', '2025-07-14')`
            );
        }

        const userCheck = await db.execute({
            sql: 'SELECT COUNT(*) as cnt FROM users WHERE role = ?',
            args: ['admin']
        });
        if (Number(userCheck.rows[0]?.cnt) === 0) {
            const adminPass = crypto.createHash('md5').update('admin123').digest('hex');
            await db.execute({
                sql: 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                args: ['admin', adminPass, 'admin']
            });
        }

        console.log('Database: Inisialisasi selesai');
    } catch (e) {
        console.error('Database: Gagal inisialisasi:', e);
    }
}

export const handle: Handle = async ({ event, resolve }) => {
    await initDb();
    const sessionId = event.cookies.get('session');

    if (!sessionId) {
        event.locals.user = null;
    } else {
        try {
            const [id, role] = sessionId.split(':');
            const result = await db.execute({
                sql: 'SELECT id, username, role FROM users WHERE id = ? AND role = ?',
                args: [id, role]
            });
            const user = result.rows[0];
            if (user) {
                event.locals.user = {
                    id: Number(user.id),
                    username: String(user.username),
                    role: String(user.role)
                };
            } else {
                event.locals.user = null;
            }
        } catch (e) {
            console.error('Hooks Error:', e);
            event.locals.user = null;
        }
    }

    const response = await resolve(event);
    return response;
};
