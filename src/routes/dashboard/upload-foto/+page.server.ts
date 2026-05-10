import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import db from '$lib/server/db';
import { fileToBlobValue } from '$lib/server/photo';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user || locals.user.role !== 'admin') {
        throw redirect(302, '/');
    }
    return {};
};

export const actions: Actions = {
    default: async ({ request, locals }) => {
        if (!locals.user || locals.user.role !== 'admin') return fail(401);

        const data = await request.formData();
        const files = data.getAll('fotos') as File[];

        let berhasil = 0;
        let gagal = 0;

        for (const file of files) {
            if (file.size === 0) continue;

            const name = file.name;
            // Validate filename NISN.jpg
            if (/^\d{5,}\.jpg$/.test(name)) {
                try {
                    const nisn = name.replace(/\.jpg$/i, '');
                    const buffer = Buffer.from(await file.arrayBuffer());
                    const result = await db.execute({
                        sql: 'UPDATE siswa SET foto = ? WHERE nisn = ?',
                        args: [fileToBlobValue(buffer), nisn]
                    });

                    if (result.rowsAffected > 0) {
                        berhasil++;
                    } else {
                        gagal++;
                    }
                } catch (e) {
                    gagal++;
                }
            } else {
                gagal++;
            }
        }

        return { berhasil, gagal };
    }
};
