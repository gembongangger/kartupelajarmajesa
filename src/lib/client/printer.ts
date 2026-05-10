function tanggalIndonesia(tanggal: string) {
    if (!tanggal || tanggal === '0000-00-00') return '-';
    const bulan = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const d = new Date(tanggal);
    return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

async function generateBarcodeDataURL(text: string): Promise<string | null> {
    try {
        const bwipjs = await import('bwip-js');
        const canvas = document.createElement('canvas');
        bwipjs.toCanvas(canvas, {
            bcid: 'code128',
            text: text,
            scale: 3,
            height: 10,
            includetext: false,
        });
        return canvas.toDataURL('image/png');
    } catch (err) {
        console.error('Barcode generation failed:', err);
        return null;
    }
}

export async function printCards(data: { students: any[], pengaturan: any }) {
    const { jsPDF } = await import('jspdf');

    const { students, pengaturan } = data;

    if (students.length === 0) return;

    const doc = new jsPDF('p', 'mm', 'a4');

    const ttdDate = `Ditetapkan di: ${pengaturan.kota_ttd || '......'}, ${tanggalIndonesia(pengaturan.tanggal_ttd)}`;
    const tataTertib = (pengaturan.tata_tertib || `1. Kartu ini wajib dibawa setiap hari sekolah.\n2. Jika menemukan kartu ini, mohon dikembalikan ke:\n${pengaturan.nama_sekolah}\n${pengaturan.alamat}`)
        .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
        .replace(/^\. /gm, '• ').replace(/^(\d+)\. /gm, '$1. ')
        .replace(/\n{3,}/g, '\n\n').trim();
    const headMaster = pengaturan.kepala_sekolah;
    const headNip = `NIP. ${pengaturan.nip_kepala_sekolah}`;

    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        if (i > 0 && i % 4 === 0) {
            doc.addPage();
        }

        const row = i % 4;
        const x = 10;
        const y = 10 + (row * 60);

        // Front Card
        doc.rect(x, y, 86, 54);
        
        // Background Depan
        if (pengaturan.background) {
            doc.addImage(pengaturan.background, x, y, 86, 54);
        }

        // Foto Siswa
        if (student.foto) {
            doc.addImage(student.foto, x + 4, y + 12, 18, 22);
        }

        // Data Siswa
        const colonX = x + 55;
        const valueX = colonX + 2;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('NAMA', colonX - 1, y + 16, { align: 'right' });
        doc.text(':', colonX, y + 16);
        doc.text(student.nama, valueX, y + 16);

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('NISN', colonX - 1, y + 20, { align: 'right' });
        doc.text(':', colonX, y + 20);
        doc.text(student.nisn, valueX, y + 20);

        doc.text('TTL', colonX - 1, y + 24, { align: 'right' });
        doc.text(':', colonX, y + 24);
        doc.text(`${student.tempat_lahir}, ${tanggalIndonesia(student.tanggal_lahir)}`, valueX, y + 24);

        doc.text('JK', colonX - 1, y + 28, { align: 'right' });
        doc.text(':', colonX, y + 28);
        doc.text(student.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan', valueX, y + 28);

        // Barcode
        const barcodeDataURL = await generateBarcodeDataURL(student.nisn);
        if (barcodeDataURL) {
            doc.addImage(barcodeDataURL, x + 13, y + 38, 60, 8);
        }
        doc.text(student.nisn, x + 43, y + 49, { align: 'center' });

        // Back Card
        const xBack = x + 90;
        doc.rect(xBack, y, 86, 54);
        
        if (pengaturan.background_belakang) {
            doc.addImage(pengaturan.background_belakang, xBack, y, 86, 54);
        }

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('TATA TERTIB / KETERANGAN', xBack + 5, y + 8);
        doc.setFont('helvetica', 'normal');
        doc.text(tataTertib, xBack + 5, y + 12, { maxWidth: 74 });

        // TTD
        doc.text(ttdDate, xBack + 62, y + 36, { align: 'center' });
        doc.text('Kepala Sekolah,', xBack + 62, y + 40, { align: 'center' });

        if (pengaturan.tanda_tangan) {
            doc.addImage(pengaturan.tanda_tangan, xBack + 52, y + 42, 20, 8);
        }

        doc.setFont('helvetica', 'bold');
        doc.text(headMaster, xBack + 62, y + 51, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text(headNip, xBack + 62, y + 54, { align: 'center' });
    }

    doc.save('Kartu_Pelajar.pdf');
}
