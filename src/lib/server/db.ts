import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';

if (!env.TURSO_CONNECTION_URL) {
    throw new Error('TURSO_CONNECTION_URL tidak ditemukan di .env');
}

const client = createClient({
    url: env.TURSO_CONNECTION_URL,
    authToken: env.TURSO_AUTH_TOKEN
});

console.log('Database: Turso terhubung ke', env.TURSO_CONNECTION_URL.replace(/\/\/.*@/, '//***@'));

export default client;
