let cachedFontB64: string | null = null;

async function getFontB64(): Promise<string> {
    if (cachedFontB64) return cachedFontB64;
    const res = await fetch('/assets/fonts/Montserrat-Arabic-Regular.ttf');
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    cachedFontB64 = btoa(bin);
    return cachedFontB64;
}

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

    const fontB64 = await getFontB64();
    doc.addFileToVFS('Montserrat-Arabic-Regular.ttf', fontB64);
    doc.addFont('Montserrat-Arabic-Regular.ttf', 'Montserrat-Arabic', 'normal');

    const ttdDate = `Ditetapkan di: ${pengaturan.kota_ttd || '......'}, ${tanggalIndonesia(pengaturan.tanggal_ttd)}`;
    const tataTertib = (pengaturan.tata_tertib ?? '')
        .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
        .replace(/^\. /gm, '• ').replace(/^(\d+)\. /gm, '$1. ')
        .replace(/\n{3,}/g, '\n\n').trim();
    const headMaster = pengaturan.kepala_sekolah;
    const headNip = `NIP. ${pengaturan.nip_kepala_sekolah}`;

    const barcodeMap = new Map<string, string | null>();
    await Promise.all(students.map(async (s) => {
        barcodeMap.set(s.nis, await generateBarcodeDataURL(s.nis));
    }));

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
            doc.saveGraphicsState();
            doc.roundedRect(x + 4, y + 18, 18, 22, 2, 2, null);
            doc.clip();
            doc.discardPath();
            doc.addImage(student.foto, x + 4, y + 18, 18, 22);
            doc.restoreGraphicsState();
        }

        // Data Siswa
        const labelX = x + 24;
        const colonX = x + 34;
        const valueX = colonX + 1.5;

        doc.setFontSize(11);
        doc.setFont('Montserrat-Arabic', 'normal');
        doc.text('KARTU TANDA PELAJAR', labelX, y + 16);

        doc.setFontSize(9);
        doc.setFont('Montserrat-Arabic', 'normal');
        doc.text(student.nama, x + pengaturan.lebar_kartu / 2, y + 20, { align: 'center' });

        doc.setFontSize(6);
        doc.setFont('Montserrat-Arabic', 'normal');
        doc.text('NISN', labelX, y + 24);
        doc.text(':', colonX, y + 24);
        doc.text(student.nisn, valueX, y + 24);

        doc.setFont('Montserrat-Arabic', 'normal');
        doc.text('JK', labelX, y + 27);
        doc.text(':', colonX, y + 27);
        doc.text(student.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan', valueX, y + 27);

        doc.setFont('Montserrat-Arabic', 'normal');
        doc.text('TTL', labelX, y + 30);
        doc.text(':', colonX, y + 30);
        doc.text(`${student.tempat_lahir}, ${tanggalIndonesia(student.tanggal_lahir)}`, valueX, y + 30);

        doc.setFont('Montserrat-Arabic', 'normal');
        doc.text('Alamat', labelX, y + 33);
        doc.text(':', colonX, y + 33);
        const alamatLines = doc.splitTextToSize(student.alamat || '-', 49);
        doc.text(alamatLines[0], valueX, y + 33);
        for (let i = 1; i < alamatLines.length; i++) {
            doc.text(alamatLines[i], labelX, y + 33 + (i * 3));
        }

        // Barcode
        const barcodeDataURL = barcodeMap.get(student.nis);
        const barcodeCenterX = x + 22;
        if (barcodeDataURL) {
            doc.addImage(barcodeDataURL, barcodeCenterX - 16, y + 42, 22, 3.5);
        }
        doc.setFontSize(7);
        doc.text(student.nis, barcodeCenterX - 4, y + 48, { align: 'center' });

        // TTD
        if (pengaturan.tampilkan_ttd_depan !== 0) {
            const ttdCenterX = x + pengaturan.lebar_kartu - 20;
            doc.setFontSize(5.5);
            doc.setFont('helvetica', 'normal');
            doc.text(ttdDate, ttdCenterX, y + 46, { align: 'center' });
            doc.text('Kepala Sekolah,', ttdCenterX, y + 49, { align: 'center' });
            if (pengaturan.tanda_tangan) {
                doc.addImage(pengaturan.tanda_tangan, ttdCenterX - 7, y + 50.5, 14, 5);
            }
            doc.setFont('helvetica', 'bold');
            doc.text(headMaster, ttdCenterX, y + 56.5, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.text(headNip, ttdCenterX, y + 59.5, { align: 'center' });
        }

        // Back Card
        const xBack = x + pengaturan.lebar_kartu + pengaturan.gap_depan_belakang;
        doc.rect(xBack, y, pengaturan.lebar_kartu, pengaturan.tinggi_kartu);
        
        if (pengaturan.background_belakang) {
            doc.addImage(pengaturan.background_belakang, xBack, y, pengaturan.lebar_kartu, pengaturan.tinggi_kartu);
        }

        if (tataTertib) {
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

    }

    doc.save('Kartu_Pelajar.pdf');
}
