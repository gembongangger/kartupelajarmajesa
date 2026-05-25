import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';
import { building, dev } from '$app/environment';

if (!building && !env.TURSO_CONNECTION_URL) {
    throw new Error('TURSO_CONNECTION_URL tidak ditemukan di .env');
}

const client = dev
    ? createClient({
        url: 'file:local.db',
        syncUrl: env.TURSO_CONNECTION_URL,
        authToken: env.TURSO_AUTH_TOKEN,
    })
    : createClient({
        url: env.TURSO_CONNECTION_URL || 'file:local.db',
        authToken: env.TURSO_AUTH_TOKEN,
    });

if (!building) {
    console.log('Database:', dev ? 'Embedded replica (local.db)' : 'Turso remote');
}

export default client;
