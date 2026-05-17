import { browser } from '$app/environment';

export function supportsMediaPipe(): boolean {
	if (!browser) return false;
	try {
		const c = document.createElement('canvas');
		return !!c.getContext('2d');
	} catch { return false; }
}

// @imgly/background-removal tidak menggunakan isLoading model manual seperti MediaPipe
// tapi kita tetap export untuk kompatibilitas UI jika diperlukan
export function isLoading(): boolean {
	return false;
}

export async function replaceBackground(
	file: File,
	bgColor: string = '#FF0000'
): Promise<Blob> {
	if (!browser) throw new Error('Hanya bisa dijalankan di browser');

	// Dynamic imports untuk menghemat bundle size
	const [smartcrop, { removeBackground }] = await Promise.all([
		import('smartcrop'),
		import('@imgly/background-removal')
	]);

	// --- OPTIMASI 1: Pre-compression (Resize Instan) ---
	const workingImg = await createImageBitmap(file, { 
		resizeWidth: 1000, 
		resizeQuality: 'medium' 
	});

	// --- STEP 1: Smart Centering ---
	const cropResult = await smartcrop.default.crop(workingImg, { 
		width: 400, 
		height: 400,
		minScale: 0.8
	});
	const crop = cropResult.topCrop;

	const outSize = 400;
	const cropCanvas = document.createElement('canvas');
	cropCanvas.width = outSize;
	cropCanvas.height = outSize;
	const cropCtx = cropCanvas.getContext('2d')!;
	
	cropCtx.imageSmoothingEnabled = true;
	cropCtx.imageSmoothingQuality = 'high';
	cropCtx.drawImage(workingImg, crop.x, crop.y, crop.width, crop.height, 0, 0, outSize, outSize);
	workingImg.close();

	// --- STEP 2: Background Removal ---
	const croppedBlob = await new Promise<Blob>((resolve) => cropCanvas.toBlob(b => resolve(b!), 'image/jpeg', 0.90));
	
	const noBgBlob = await removeBackground(croppedBlob, {
		model: 'small', // Lebih cepat untuk foto wajah
	});

	// --- STEP 3: Terapkan Background Merah ---
	const noBgImg = await createImageBitmap(noBgBlob);
	const outputCanvas = document.createElement('canvas');
	outputCanvas.width = outSize;
	outputCanvas.height = outSize;
	const outputCtx = outputCanvas.getContext('2d')!;

	// Isi warna merah
	outputCtx.fillStyle = bgColor;
	outputCtx.fillRect(0, 0, outSize, outSize);

	// Tempelkan orang (yang sudah transparan)
	outputCtx.drawImage(noBgImg, 0, 0, outSize, outSize);
	noBgImg.close();

	return new Promise((resolve) => {
		outputCanvas.toBlob(
			(blob) => resolve(blob!),
			'image/jpeg',
			0.85
		);
	});
}
