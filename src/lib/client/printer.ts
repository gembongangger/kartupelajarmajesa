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
            scale: 2,
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

    const paperSize = pengaturan.jenis_kertas === 'Custom'
        ? [pengaturan.lebar_kertas, pengaturan.tinggi_kertas]
        : pengaturan.jenis_kertas?.toLowerCase() || 'a4';
    const doc = new jsPDF('p', 'mm', paperSize);

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
        const x = pengaturan.margin_kiri;
        const y = pengaturan.margin_atas + (row * (pengaturan.tinggi_kartu + pengaturan.spasi_kartu));

        // Front Card
        doc.rect(x, y, pengaturan.lebar_kartu, pengaturan.tinggi_kartu);
        
        // Background Depan
        if (pengaturan.background) {
            doc.addImage(pengaturan.background, x, y, pengaturan.lebar_kartu, pengaturan.tinggi_kartu);
        }

        // Foto Siswa
        if (student.foto) {
            doc.addImage(student.foto, x + 4, y + 12, 18, 22);
        }

        // Data Siswa
        const labelX = x + 24;
        const colonX = labelX + 10;
        const valueX = colonX + 2;

        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.text('NAMA', labelX, y + 16);
        doc.text(':', colonX, y + 16);
        doc.setFont('helvetica', 'normal');
        doc.text(student.nama, valueX, y + 16);

        doc.setFont('helvetica', 'bold');
        doc.text('NISN', labelX, y + 19);
        doc.text(':', colonX, y + 19);
        doc.setFont('helvetica', 'normal');
        doc.text(student.nisn, valueX, y + 19);

        doc.setFont('helvetica', 'bold');
        doc.text('TTL', labelX, y + 22);
        doc.text(':', colonX, y + 22);
        doc.setFont('helvetica', 'normal');
        doc.text(`${student.tempat_lahir}, ${tanggalIndonesia(student.tanggal_lahir)}`, valueX, y + 22);

        doc.setFont('helvetica', 'bold');
        doc.text('JK', labelX, y + 25);
        doc.text(':', colonX, y + 25);
        doc.setFont('helvetica', 'normal');
        doc.text(student.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan', valueX, y + 25);

        // Barcode
        const barcodeDataURL = await generateBarcodeDataURL(student.nisn);
        const barcodeCenterX = x + 22;
        if (barcodeDataURL) {
            doc.roundedRect(barcodeCenterX - 16, y + 35, 32, 6, 1);
            doc.addImage(barcodeDataURL, barcodeCenterX - 15, y + 36, 30, 4);
        }
        doc.setFontSize(5);
        doc.text(student.nisn, barcodeCenterX, y + 41.5, { align: 'center' });

        // TTD
        const ttdCenterX = x + pengaturan.lebar_kartu - 20;
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        doc.text(ttdDate, ttdCenterX, y + 33, { align: 'center' });
        doc.text('Kepala Sekolah,', ttdCenterX, y + 36, { align: 'center' });
        if (pengaturan.tanda_tangan) {
            doc.addImage(pengaturan.tanda_tangan, ttdCenterX - 7, y + 37.5, 14, 5);
        }
        doc.setFont('helvetica', 'bold');
        doc.text(headMaster, ttdCenterX, y + 43.5, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text(headNip, ttdCenterX, y + 46.5, { align: 'center' });

        // Back Card
        const xBack = x + pengaturan.lebar_kartu + pengaturan.gap_depan_belakang;
        doc.rect(xBack, y, pengaturan.lebar_kartu, pengaturan.tinggi_kartu);
        
        if (pengaturan.background_belakang) {
            doc.addImage(pengaturan.background_belakang, xBack, y, pengaturan.lebar_kartu, pengaturan.tinggi_kartu);
        }

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('TATA TERTIB/KETERANGAN', xBack + 5, y + 8);
        doc.setFont('helvetica', 'normal');

        // Render Tata Tertib dengan hanging indent
        let currentY = y + 12;
        const ttLines = tataTertib.split('\n');
        const indent = 3.5; 
        const ttMaxWidth = pengaturan.lebar_kartu - 10;
        let prevLineHadPrefix = false;

        ttLines.forEach(line => {
            if (!line.trim()) {
                currentY += 1.5;
                prevLineHadPrefix = false;
                return;
            }

            const match = line.match(/^(\d+\. |• )/);
            if (match) {
                const prefix = match[0];
                const text = line.substring(prefix.length);
                doc.text(prefix, xBack + 5, currentY);

                const splitText = doc.splitTextToSize(text, ttMaxWidth - indent);
                doc.text(splitText, xBack + 5 + indent, currentY);
                currentY += (splitText.length * 3);
                prevLineHadPrefix = true;
            } else if (prevLineHadPrefix) {
                const splitText = doc.splitTextToSize(line, ttMaxWidth - indent);
                doc.text(splitText, xBack + 5 + indent, currentY);
                currentY += (splitText.length * 3);
            } else {
                const splitText = doc.splitTextToSize(line, ttMaxWidth);
                doc.text(splitText, xBack + 5, currentY);
                currentY += (splitText.length * 3);
            }
        });


    }

    doc.save('Kartu_Pelajar.pdf');
}
