import { browser } from '$app/environment';

let segmenter: any = null;
let loadPromise: Promise<void> | null = null;
let _isLoading = false;

export function supportsMediaPipe(): boolean {
	if (!browser) return false;
	try {
		const c = document.createElement('canvas');
		return !!c.getContext('2d');
	} catch { return false; }
}

export function isLoading(): boolean {
	return _isLoading;
}

async function getSegmenter(): Promise<any> {
	if (segmenter) return segmenter;
	if (loadPromise) return loadPromise;

	_isLoading = true;
	loadPromise = (async () => {
		try {
			await import('@mediapipe/selfie_segmentation');
			const SelfieSegmentation = (window as any).SelfieSegmentation;
			if (!SelfieSegmentation) throw new Error('Library gagal dimuat');

			segmenter = new SelfieSegmentation({
				locateFile: (file: string) =>
					`https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
			});

			segmenter.setOptions({ modelSelection: 1 });
			await segmenter.initialize();
		} finally {
			_isLoading = false;
		}
	})();

	await loadPromise;
	return segmenter;
}

function getMask(seg: any, canvas: HTMLCanvasElement): Promise<ImageBitmap> {
	return new Promise((resolve) => {
		seg.onResults((results: any) => {
			resolve(results.segmentationMask as ImageBitmap);
		});
		seg.send({ image: canvas });
	});
}

export async function replaceBackground(
	file: File,
	bgColor: string = '#FF0000'
): Promise<Blob> {
	if (!browser) throw new Error('Cannot process on server');

	const seg = await getSegmenter();

	const img = await createImageBitmap(file);

	const cropSize = Math.min(img.width, img.height);
	const sx = Math.floor((img.width - cropSize) / 2);
	const sy = Math.floor((img.height - cropSize) / 2);
	const outSize = 400;

	const inputCanvas = document.createElement('canvas');
	inputCanvas.width = outSize;
	inputCanvas.height = outSize;
	const inputCtx = inputCanvas.getContext('2d')!;
	inputCtx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, outSize, outSize);
	img.close();

	const mask = await getMask(seg, inputCanvas);

	const tR = parseInt(bgColor.slice(1, 3), 16);
	const tG = parseInt(bgColor.slice(3, 5), 16);
	const tB = parseInt(bgColor.slice(5, 7), 16);

	const maskCanvas = document.createElement('canvas');
	maskCanvas.width = outSize;
	maskCanvas.height = outSize;
	const maskCtx = maskCanvas.getContext('2d')!;
	maskCtx.drawImage(mask, 0, 0, outSize, outSize);

	const personCanvas = document.createElement('canvas');
	personCanvas.width = outSize;
	personCanvas.height = outSize;
	const personCtx = personCanvas.getContext('2d')!;
	personCtx.drawImage(inputCanvas, 0, 0);
	personCtx.globalCompositeOperation = 'destination-in';
	personCtx.imageSmoothingEnabled = true;
	personCtx.drawImage(maskCanvas, 0, 0);

	if ('close' in mask) (mask as any).close();

	const outputCanvas = document.createElement('canvas');
	outputCanvas.width = outSize;
	outputCanvas.height = outSize;
	const outputCtx = outputCanvas.getContext('2d')!;
	outputCtx.fillStyle = bgColor;
	outputCtx.fillRect(0, 0, outSize, outSize);
	outputCtx.drawImage(personCanvas, 0, 0);

	return new Promise((resolve) => {
		outputCanvas.toBlob(
			(blob) => resolve(blob!),
			'image/jpeg',
			0.85
		);
	});
}
