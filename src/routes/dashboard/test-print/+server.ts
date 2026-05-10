import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/db';

export const GET: RequestHandler = async ({ url, locals }) => {
    try {
        if (!locals.user || locals.user.role !== 'admin') {
            throw redirect(302, '/');
        }

        const nisn = url.searchParams.get('nisn') || '4900001';
        
        console.log('Test print START for nisn:', nisn);
        
        // Test 1: DB Query
        console.log('Test 1: Query student...');
        const studentResult = await db.execute({
            sql: 'SELECT * FROM siswa WHERE nisn = ? LIMIT 1',
            args: [nisn]
        });
        console.log('Student found:', studentResult.rows.length > 0);
        
        // Test 2: Settings
        console.log('Test 2: Query settings...');
        const settingsResult = await db.execute('SELECT id, nama_sekolah FROM pengaturan LIMIT 1');
        console.log('Settings found:', settingsResult.rows.length > 0);
        
        // Test 3: Simple PDF
        console.log('Test 3: Create jsPDF...');
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF('p', 'mm', 'a4');
        doc.text('Test PDF', 10, 10);
        console.log('jsPDF instance created');
        
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
        console.log('PDF generated, size:', pdfBuffer.length);
        
        return new Response(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'inline; filename="test.pdf"'
            }
        });
    } catch (e) {
        console.error('Test print error:', e);
        if (e instanceof Response) throw e;
        return new Response('Error: ' + e.message, { status: 500 });
    }
};
