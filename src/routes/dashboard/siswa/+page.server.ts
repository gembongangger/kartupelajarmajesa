import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import db from '$lib/server/db';

export const load: PageServerLoad = async ({ locals, url }) => {
    if (!locals.user || locals.user.role !== 'admin') {
        throw redirect(302, '/');
    }

    const q = url.searchParams.get('q') || '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const perPage = 10;
    const like = `%${q}%`;

    const searchClause = `WHERE (nama LIKE ? OR nisn LIKE ? OR nis LIKE ? OR kelas LIKE ?)`;
    const searchArgs = [like, like, like, like];

    const countResult = await db.execute({
        sql: `SELECT COUNT(*) as total FROM siswa ${q ? searchClause : ''}`,
        args: q ? searchArgs : []
    });
    const total = Number(countResult.rows[0]?.total) || 0;
    const totalPages = Math.ceil(total / perPage) || 1;
    const currentPage = Math.min(page, totalPages);
    const offset = (currentPage - 1) * perPage;

    const studentArgs = q ? [...searchArgs, perPage, offset] : [perPage, offset];
    const studentsResult = await db.execute({
        sql: `SELECT * FROM siswa ${q ? searchClause : ''} ORDER BY kelas, nama LIMIT ? OFFSET ?`,
        args: studentArgs
    });

    return {
        students: studentsResult.rows,
        total,
        page: currentPage,
        totalPages,
        q,
        perPage
    };
};

export const actions: Actions = {
    delete: async ({ request, locals }) => {
        if (!locals.user || locals.user.role !== 'admin') return fail(401);

        const data = await request.formData();
        const nisn = data.get('nisn');

        if (!nisn) return fail(400);

        await db.execute({
            sql: 'DELETE FROM siswa WHERE nisn = ?',
            args: [nisn.toString()]
        });

        return { success: true };
    }
};
