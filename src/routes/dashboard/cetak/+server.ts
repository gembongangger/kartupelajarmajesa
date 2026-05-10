import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/db';
import { jsPDF } from 'jspdf';
import bwipjs from 'bwip-js';
import { getDefaultPhotoBuffer, imageFormatFromBuffer, photoValueToBuffer } from '$lib/server/photo';

function tanggalIndonesia(tanggal: string) {
    if (!tanggal || tanggal === '0000-00-00') return '-';
    const bulan = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const d = new Date(tanggal);
    return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

function generateBarcode(text: string): Promise<Buffer | null> {
    return new Promise((resolve) => {
        bwipjs.toBuffer({
            bcid: 'code128',
            text: text,
            scale: 3,
            height: 10,
            includetext: false,
        }, (err: Error | null, buf: Buffer) => {
            if (err) {
                console.error('Barcode generation failed:', err);
                resolve(null);
            } else {
                resolve(buf);
            }
        });
    });
}

export const GET: RequestHandler = async ({ url, locals }) => {
    try {
        console.log('GET /dashboard/cetak START', { nisn: url.searchParams.get('nisn'), kelas: url.searchParams.get('kelas'), user: locals.user });
        
        if (!locals.user || locals.user.role !== 'admin') {
            throw redirect(302, '/');
        }

        console.log('User verified, proceeding...');
        const nisn = url.searchParams.get('nisn');
        const kelas = url.searchParams.get('kelas');

        let sql = 'SELECT * FROM siswa';
        let args: any[] = [];

        if (nisn) {
            sql += ' WHERE nisn = ?';
            args.push(nisn);
        } else if (kelas) {
            sql += ' WHERE kelas = ?';
            args.push(kelas);
        }

        console.log('Executing student query...');
        const studentsResult = await db.execute({ sql, args });
        const students = studentsResult.rows;
        console.log('Students found:', students.length);
        
        console.log('Executing settings query...');
        const settingsResult = await db.execute('SELECT * FROM pengaturan LIMIT 1');
        const pengaturan = settingsResult.rows[0];
        console.log('Settings loaded');

        if (students.length === 0) {
            throw error(404, 'No students found');
        }

        if (students.length > 40) {
            throw error(400, 'Terdapat lebih dari 40 siswa. Silakan cetak per kelas');
        }

        console.log('Creating jsPDF instance...');
        const doc = new jsPDF('p', 'mm', 'a4');
        console.log('jsPDF instance created');

        // Pre-compute static assets once
        const bgFrontBuffer = photoValueToBuffer(pengaturan.background);
        const bgFrontFormat = bgFrontBuffer ? imageFormatFromBuffer(bgFrontBuffer) : null;
        const bgFrontBase64 = bgFrontBuffer ? bgFrontBuffer.toString('base64') : null;

        const bgBackBuffer = photoValueToBuffer(pengaturan.background_belakang);
        const bgBackFormat = bgBackBuffer ? imageFormatFromBuffer(bgBackBuffer) : null;
        const bgBackBase64 = bgBackBuffer ? bgBackBuffer.toString('base64') : null;

        const ttdBuffer = photoValueToBuffer(pengaturan.tanda_tangan);
        const ttdFormat = ttdBuffer ? imageFormatFromBuffer(ttdBuffer) : null;
        const ttdBase64 = ttdBuffer ? ttdBuffer.toString('base64') : null;

        const ttdDate = `Ditetapkan di: ${(pengaturan.kota_ttd as string) || '......'}, ${tanggalIndonesia(pengaturan.tanggal_ttd as string)}`;
        const tataTertib = (pengaturan.tata_tertib as string) || `TATA TERTIB / KETERANGAN:\n1. Kartu ini wajib dibawa setiap hari sekolah.\n2. Jika menemukan kartu ini, mohon dikembalikan ke:\n${pengaturan.nama_sekolah}\n${pengaturan.alamat}`;
        const headMaster = pengaturan.kepala_sekolah as string;
        const headNip = `NIP. ${pengaturan.nip_kepala_sekolah}`;
        
        console.log('Starting student loop for', students.length, 'students');
        for (let i = 0; i < students.length; i++) {
            console.log('Processing student', i + 1, 'of', students.length);
            const student = students[i] as any;
            if (i > 0 && i % 4 === 0) {
                doc.addPage();
            }

            const row = i % 4;
            const x = 10;
            const y = 10 + (row * 60);

            // Front Card
            doc.rect(x, y, 86, 54);
            
            // Background Depan
            if (bgFrontBase64 && bgFrontFormat) {
                doc.addImage(bgFrontBase64, bgFrontFormat, x, y, 86, 54);
            }

            // Foto Siswa
            const fotoBuffer = photoValueToBuffer(student.foto) || getDefaultPhotoBuffer();
            if (fotoBuffer) {
                const fotoData = fotoBuffer.toString('base64');
                doc.addImage(fotoData, 'JPEG', x + 4, y + 12, 18, 22);
            }

            // Data Siswa
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text(`NAMA : ${student.nama}`, x + 25, y + 16);
            
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text(`NISN : ${student.nisn}`, x + 25, y + 20);
            doc.text(`TTL : ${student.tempat_lahir}, ${tanggalIndonesia(student.tanggal_lahir as string)}`, x + 25, y + 24);
            doc.text(`JK : ${student.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}`, x + 25, y + 28);

            // Barcode
            const barcodeBuffer = await generateBarcode(student.nisn as string);
            if (barcodeBuffer) {
                doc.addImage(barcodeBuffer.toString('base64'), 'PNG', x + 13, y + 38, 60, 8);
            }
            doc.text(student.nisn as string, x + 43, y + 49, { align: 'center' });

            // Back Card
            const xBack = x + 90;
            doc.rect(xBack, y, 86, 54);
            
            if (bgBackBase64 && bgBackFormat) {
                doc.addImage(bgBackBase64, bgBackFormat, xBack, y, 86, 54);
            }

            doc.setFontSize(7);
            doc.text(tataTertib, xBack + 5, y + 10, { maxWidth: 76 });

            // TTD
            doc.text(ttdDate, xBack + 62, y + 36, { align: 'center' });
            doc.text('Kepala Sekolah,', xBack + 62, y + 40, { align: 'center' });

            if (ttdBase64 && ttdFormat) {
                doc.addImage(ttdBase64, ttdFormat, xBack + 52, y + 42, 20, 8);
            }

            doc.setFont('helvetica', 'bold');
            doc.text(headMaster, xBack + 62, y + 51, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.text(headNip, xBack + 62, y + 54, { align: 'center' });
        }
        console.log('Generating PDF output...');
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
        console.log('PDF generated, size:', pdfBuffer.length);

        return new Response(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'inline; filename="Kartu_Pelajar.pdf"'
            }
        });
    } catch (e) {
        console.error('Print card error:', e);
        if (e instanceof Response) throw e;
        throw error(500, 'Gagal mencetak kartu pelajar');
    }
};
