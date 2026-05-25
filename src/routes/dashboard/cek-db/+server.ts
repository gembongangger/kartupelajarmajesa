import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
    if (!locals.user || locals.user.role !== 'admin') {
        return json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    try {
        const start = Date.now();
        await db.execute('SELECT 1');
        const elapsed = Date.now() - start;
        return json({ ok: true, latency: elapsed });
    } catch (e) {
        return json({
            ok: false,
            error: e instanceof Error ? e.message : String(e)
        });
    }
};
