import { browser } from '$app/environment';

type FaceBox = {
	x: number;
	y: number;
	width: number;
	height: number;
};

type CropBox = {
	x: number;
	y: number;
	width: number;
	height: number;
};

type MaskBounds = {
	left: number;
	top: number;
	right: number;
	bottom: number;
};

type ForegroundMask = {
	canvas: HTMLCanvasElement;
	bounds: MaskBounds | null;
};

const OUTPUT_WIDTH = 360;
const OUTPUT_HEIGHT = 440;
const WORKING_RESIZE_WIDTH = 900;
const FACE_HEIGHT_RATIO = 0.24;
const FACE_CENTER_Y_RATIO = 0.5;
const PERSON_MIN_MARGIN_X = 26;
const PERSON_MIN_MARGIN_TOP = 18;
const PERSON_MIN_MARGIN_BOTTOM = 46;
const MEDIAPIPE_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';
const FACE_DETECTOR_MODEL_URL =
	'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';
const SELFIE_SEGMENTER_MODEL_URL =
	'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

let faceDetectorPromise: Promise<any> | null = null;
let imageSegmenterPromise: Promise<any> | null = null;

export function supportsMediaPipe(): boolean {
	if (!browser) return false;
	try {
		const c = document.createElement('canvas');
		return !!c.getContext('2d');
	} catch { return false; }
}

export function isLoading(): boolean {
	return false;
}

async function getFaceDetector() {
	if (!faceDetectorPromise) {
		faceDetectorPromise = import('@mediapipe/tasks-vision').then(
			async ({ FaceDetector, FilesetResolver }) => {
				const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
				return FaceDetector.createFromOptions(vision, {
					baseOptions: {
						modelAssetPath: FACE_DETECTOR_MODEL_URL
					},
					runningMode: 'IMAGE',
					minDetectionConfidence: 0.45
				});
			}
		);
	}

	return faceDetectorPromise;
}

async function getImageSegmenter() {
	if (!imageSegmenterPromise) {
		imageSegmenterPromise = import('@mediapipe/tasks-vision').then(
			async ({ FilesetResolver, ImageSegmenter }) => {
				const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
				return ImageSegmenter.createFromOptions(vision, {
					baseOptions: {
						modelAssetPath: SELFIE_SEGMENTER_MODEL_URL
					},
					runningMode: 'IMAGE',
					outputConfidenceMasks: true,
					outputCategoryMask: true
				});
			}
		);
	}

	return imageSegmenterPromise;
}

async function detectFace(image: ImageBitmap): Promise<FaceBox | null> {
	try {
		const detector = await getFaceDetector();
		const result = detector.detect(image);
		const detections = result?.detections ?? [];

		if (detections.length === 0) return null;

		const best = detections
			.filter((d: any) => d.boundingBox)
			.sort((a: any, b: any) => {
				const scoreA = a.categories?.[0]?.score ?? 0;
				const scoreB = b.categories?.[0]?.score ?? 0;
				return scoreB - scoreA;
			})[0];

		if (!best?.boundingBox) return null;

		const box = best.boundingBox;
		return {
			x: box.originX,
			y: box.originY,
			width: box.width,
			height: box.height
		};
	} catch (e) {
		console.warn('Face detection failed, using center crop.', e);
		return null;
	}
}

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

function getFaceCrop(image: ImageBitmap, face: FaceBox | null): CropBox {
	const imageRatio = image.width / image.height;
	const outputRatio = OUTPUT_WIDTH / OUTPUT_HEIGHT;

	if (!face) {
		if (imageRatio > outputRatio) {
			const width = image.height * outputRatio;
			return {
				x: (image.width - width) / 2,
				y: 0,
				width,
				height: image.height
			};
		}

		const height = image.width / outputRatio;
		return {
			x: 0,
			y: (image.height - height) / 2,
			width: image.width,
			height
		};
	}

	let cropHeight = Math.min(face.height / FACE_HEIGHT_RATIO, image.height);
	let cropWidth = cropHeight * outputRatio;

	if (cropWidth > image.width) {
		cropWidth = image.width;
		cropHeight = cropWidth / outputRatio;
	}

	const faceCenterX = face.x + face.width / 2;
	const faceCenterY = face.y + face.height / 2;

	const x = faceCenterX - cropWidth / 2;
	let y = faceCenterY - cropHeight * FACE_CENTER_Y_RATIO;

	y = clamp(y, 0, Math.max(0, image.height - cropHeight));

	return {
		x,
		y,
		width: Math.min(cropWidth, image.width),
		height: Math.min(cropHeight, image.height)
	};
}

function drawCropWithPadding(
	ctx: CanvasRenderingContext2D,
	image: ImageBitmap,
	crop: CropBox
) {
	const sourceX = clamp(crop.x, 0, image.width);
	const sourceY = clamp(crop.y, 0, image.height);
	const sourceRight = clamp(crop.x + crop.width, 0, image.width);
	const sourceBottom = clamp(crop.y + crop.height, 0, image.height);
	const sourceWidth = sourceRight - sourceX;
	const sourceHeight = sourceBottom - sourceY;

	if (sourceWidth <= 0 || sourceHeight <= 0) return;

	const scaleX = OUTPUT_WIDTH / crop.width;
	const scaleY = OUTPUT_HEIGHT / crop.height;
	const destX = (sourceX - crop.x) * scaleX;
	const destY = (sourceY - crop.y) * scaleY;
	const destWidth = sourceWidth * scaleX;
	const destHeight = sourceHeight * scaleY;

	ctx.drawImage(
		image,
		sourceX,
		sourceY,
		sourceWidth,
		sourceHeight,
		destX,
		destY,
		destWidth,
		destHeight
	);
}

function drawCropToCanvas(
	ctx: CanvasRenderingContext2D,
	image: ImageBitmap,
	crop: CropBox,
	targetWidth: number,
	targetHeight: number
) {
	const sourceX = clamp(crop.x, 0, image.width);
	const sourceY = clamp(crop.y, 0, image.height);
	const sourceRight = clamp(crop.x + crop.width, 0, image.width);
	const sourceBottom = clamp(crop.y + crop.height, 0, image.height);
	const sourceWidth = sourceRight - sourceX;
	const sourceHeight = sourceBottom - sourceY;

	if (sourceWidth <= 0 || sourceHeight <= 0) return;

	const scaleX = targetWidth / crop.width;
	const scaleY = targetHeight / crop.height;
	const destX = (sourceX - crop.x) * scaleX;
	const destY = (sourceY - crop.y) * scaleY;
	const destWidth = sourceWidth * scaleX;
	const destHeight = sourceHeight * scaleY;

	ctx.drawImage(
		image,
		sourceX,
		sourceY,
		sourceWidth,
		sourceHeight,
		destX,
		destY,
		destWidth,
		destHeight
	);
}

function drawPreparedCrop(
	ctx: CanvasRenderingContext2D,
	image: ImageBitmap,
	crop: CropBox,
	bgColor: string
) {
	ctx.clearRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
	ctx.fillStyle = bgColor;
	ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
	drawCropWithPadding(ctx, image, crop);
}

function smoothstep(edge0: number, edge1: number, value: number) {
	const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
	return t * t * (3 - 2 * t);
}

function cleanEdgePixels(imageData: ImageData): void {
	const d = imageData.data;
	const w = imageData.width;
	const h = imageData.height;
	const copy = new Uint8ClampedArray(d);

	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4;
			if (d[i + 3] === 0) continue;

			let onEdge = false;
			for (let oy = -1; oy <= 1 && !onEdge; oy++) {
				for (let ox = -1; ox <= 1 && !onEdge; ox++) {
					if (ox === 0 && oy === 0) continue;
					const nx = x + ox, ny = y + oy;
					if (nx < 0 || ny < 0 || nx >= w || ny >= h) { onEdge = true; break; }
					if (copy[((ny * w + nx) * 4) + 3] === 0) onEdge = true;
				}
			}
			if (!onEdge) continue;

			const rs: number[] = [];
			const gs: number[] = [];
			const bs: number[] = [];

			for (let oy = -2; oy <= 2; oy++) {
				for (let ox = -2; ox <= 2; ox++) {
					const nx = x + ox, ny = y + oy;
					if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
					const ni = (ny * w + nx) * 4;
					if (copy[ni + 3] < 255) continue;

					let interior = true;
					for (let noy = -1; noy <= 1 && interior; noy++) {
						for (let nox = -1; nox <= 1 && interior; nox++) {
							if (nox === 0 && noy === 0) continue;
							const nnx = nx + nox, nny = ny + noy;
							if (nnx < 0 || nny < 0 || nnx >= w || nny >= h) continue;
							if (copy[((nny * w + nnx) * 4) + 3] === 0) interior = false;
						}
					}
					if (interior) {
						rs.push(copy[ni]);
						gs.push(copy[ni + 1]);
						bs.push(copy[ni + 2]);
					}
				}
			}

			if (rs.length > 0) {
				rs.sort((a, b) => a - b);
				gs.sort((a, b) => a - b);
				bs.sort((a, b) => a - b);
				const mid = Math.floor(rs.length / 2);
				d[i] = rs[mid];
				d[i + 1] = gs[mid];
				d[i + 2] = bs[mid];
			}
		}
	}
}

function erodeAlpha(alpha: Uint8ClampedArray, width: number, height: number) {
	const output = new Uint8ClampedArray(alpha.length);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = y * width + x;
			let minAlpha = alpha[index];

			for (let oy = -1; oy <= 1; oy++) {
				for (let ox = -1; ox <= 1; ox++) {
					const nx = x + ox;
					const ny = y + oy;

					if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
					minAlpha = Math.min(minAlpha, alpha[ny * width + nx]);
				}
			}

			output[index] = minAlpha;
		}
	}

	return output;
}

function dilateAlpha(alpha: Uint8ClampedArray, width: number, height: number) {
	const output = new Uint8ClampedArray(alpha.length);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = y * width + x;
			let maxAlpha = alpha[index];

			for (let oy = -1; oy <= 1; oy++) {
				for (let ox = -1; ox <= 1; ox++) {
					const nx = x + ox;
					const ny = y + oy;

					if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
					maxAlpha = Math.max(maxAlpha, alpha[ny * width + nx]);
				}
			}

			output[index] = maxAlpha;
		}
	}

	return output;
}

function closeAlpha(alpha: Uint8ClampedArray, width: number, height: number) {
	return erodeAlpha(dilateAlpha(alpha, width, height), width, height);
}

function fillAlphaHoles(alpha: Uint8ClampedArray, width: number, height: number) {
	const visited = new Uint8Array(alpha.length);
	const queue: number[] = [];
	const threshold = 128;

	for (let x = 0; x < width; x++) {
		const topIndex = x;
		const bottomIndex = (height - 1) * width + x;
		if (alpha[topIndex] < threshold) {
			visited[topIndex] = 1;
			queue.push(topIndex);
		}
		if (alpha[bottomIndex] < threshold) {
			visited[bottomIndex] = 1;
			queue.push(bottomIndex);
		}
	}

	for (let y = 0; y < height; y++) {
		const leftIndex = y * width;
		const rightIndex = y * width + (width - 1);
		if (alpha[leftIndex] < threshold) {
			visited[leftIndex] = 1;
			queue.push(leftIndex);
		}
		if (alpha[rightIndex] < threshold) {
			visited[rightIndex] = 1;
			queue.push(rightIndex);
		}
	}

	while (queue.length > 0) {
		const index = queue.shift()!;
		const x = index % width;
		const y = Math.floor(index / width);

		for (let oy = -1; oy <= 1; oy++) {
			for (let ox = -1; ox <= 1; ox++) {
				if (ox === 0 && oy === 0) continue;
				const nx = x + ox;
				const ny = y + oy;
				if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
				const nIndex = ny * width + nx;
				if (!visited[nIndex] && alpha[nIndex] < threshold) {
					visited[nIndex] = 1;
					queue.push(nIndex);
				}
			}
		}
	}

	for (let i = 0; i < alpha.length; i++) {
		if (!visited[i] && alpha[i] < threshold) {
			alpha[i] = 255;
		}
	}
}

function getAlphaBounds(alpha: Uint8ClampedArray, width: number, height: number): MaskBounds | null {
	let left = width;
	let top = height;
	let right = -1;
	let bottom = -1;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			if (alpha[y * width + x] < 18) continue;

			left = Math.min(left, x);
			top = Math.min(top, y);
			right = Math.max(right, x);
			bottom = Math.max(bottom, y);
		}
	}

	if (right < left || bottom < top) return null;
	return { left, top, right, bottom };
}

function adjustCropForPersonBounds(crop: CropBox, bounds: MaskBounds | null, image: ImageBitmap): CropBox | null {
	if (!bounds) return null;

	const leftMargin = bounds.left;
	const rightMargin = OUTPUT_WIDTH - bounds.right;
	const topMargin = bounds.top;
	const bottomMargin = OUTPUT_HEIGHT - bounds.bottom;
	const sourcePerPixelY = crop.height / OUTPUT_HEIGHT;
	let nextCrop = { ...crop };
	let changed = false;

	if (bottomMargin < PERSON_MIN_MARGIN_BOTTOM) {
		if (topMargin > PERSON_MIN_MARGIN_TOP) {
			const shiftDown = Math.min(PERSON_MIN_MARGIN_BOTTOM - bottomMargin, topMargin - PERSON_MIN_MARGIN_TOP);
			nextCrop.y += shiftDown * sourcePerPixelY;
			changed = true;
		} else {
			const shortageBottom = PERSON_MIN_MARGIN_BOTTOM - bottomMargin;
			const shortageTop = PERSON_MIN_MARGIN_TOP - topMargin;
			const growRatio = 1 + Math.min(0.35, (shortageBottom + shortageTop) / OUTPUT_HEIGHT);
			const outputRatio = OUTPUT_WIDTH / OUTPUT_HEIGHT;

			nextCrop.height = Math.min(crop.height * growRatio, image.height - crop.y);
			nextCrop.width = nextCrop.height * outputRatio;

			if (nextCrop.width > image.width) {
				nextCrop.width = image.width;
				nextCrop.height = nextCrop.width / outputRatio;
			}

			const centerX = crop.x + crop.width / 2;
			nextCrop.x = clamp(centerX - nextCrop.width / 2, 0, Math.max(0, image.width - nextCrop.width));
			nextCrop.y = crop.y;
			changed = true;
		}
	}

	if (leftMargin < PERSON_MIN_MARGIN_X || rightMargin < PERSON_MIN_MARGIN_X) {
		const shortageX = Math.max(PERSON_MIN_MARGIN_X - leftMargin, PERSON_MIN_MARGIN_X - rightMargin, 0);
		const growRatio = 1 + Math.min(0.35, shortageX / OUTPUT_WIDTH);
		const centerX = crop.x + crop.width / 2;
		const centerY = crop.y + crop.height / 2;
		const outputRatio = OUTPUT_WIDTH / OUTPUT_HEIGHT;

		nextCrop.height = Math.min(crop.height * growRatio, image.height);
		nextCrop.width = nextCrop.height * outputRatio;

		if (nextCrop.width > image.width) {
			nextCrop.width = image.width;
			nextCrop.height = nextCrop.width / outputRatio;
		}

		nextCrop.x = clamp(centerX - nextCrop.width / 2, 0, Math.max(0, image.width - nextCrop.width));
		nextCrop.y = centerY - nextCrop.height / 2;
		changed = true;
	}

	nextCrop.y = clamp(nextCrop.y, 0, Math.max(0, image.height - nextCrop.height));

	if (!changed) return null;
	return nextCrop;
}

async function createForegroundMask(image: HTMLCanvasElement): Promise<ForegroundMask> {
	const segmenter = await getImageSegmenter();
	const result = segmenter.segment(image);
	const confidenceMask = result?.confidenceMasks?.[1] ?? result?.confidenceMasks?.[0];
	const categoryMask = result?.categoryMask;

	if (!confidenceMask && !categoryMask) {
		throw new Error('Mask segmentasi orang tidak tersedia');
	}

	const sw = confidenceMask?.width ?? categoryMask!.width;
	const sh = confidenceMask?.height ?? categoryMask!.height;
	const confidence = confidenceMask?.getAsFloat32Array();
	const category = confidence ? null : categoryMask!.getAsUint8Array();
	const alphaMap = new Uint8ClampedArray(sw * sh);

	for (let i = 0; i < alphaMap.length; i++) {
		alphaMap[i] = confidence
			? smoothstep(0.15, 0.55, confidence[i]) * 255
			: category![i] === 1 ? 255 : 0;
	}

	let cleanedAlpha = closeAlpha(alphaMap, sw, sh);
	fillAlphaHoles(cleanedAlpha, sw, sh);
	cleanedAlpha = dilateAlpha(cleanedAlpha, sw, sh);

	for (let i = 0; i < cleanedAlpha.length; i++) {
		cleanedAlpha[i] = clamp(cleanedAlpha[i], 0, 255);
	}

	const srcBounds = getAlphaBounds(cleanedAlpha, sw, sh);

	const iw = image.width;
	const ih = image.height;

	const scaledCanvas = document.createElement('canvas');
	scaledCanvas.width = iw;
	scaledCanvas.height = ih;
	const scaledCtx = scaledCanvas.getContext('2d')!;
	scaledCtx.imageSmoothingEnabled = false;

	const srcCanvas = document.createElement('canvas');
	srcCanvas.width = sw;
	srcCanvas.height = sh;
	const srcCtx = srcCanvas.getContext('2d')!;
	const srcData = new ImageData(sw, sh);
	const sd = srcData.data;
	for (let i = 0; i < sd.length; i += 4) {
		const maskIndex = i / 4;
		sd[i] = 255;
		sd[i + 1] = 255;
		sd[i + 2] = 255;
		sd[i + 3] = cleanedAlpha[maskIndex];
	}
	srcCtx.putImageData(srcData, 0, 0);

	scaledCtx.filter = 'blur(1.5px)';
	scaledCtx.drawImage(srcCanvas, 0, 0, iw, ih);
	scaledCtx.filter = 'none';

	const scaledData = scaledCtx.getImageData(0, 0, iw, ih);
	const dd = scaledData.data;
	for (let i = 3; i < dd.length; i += 4) {
		dd[i] = clamp(dd[i], 0, 255);
	}
	scaledCtx.putImageData(scaledData, 0, 0);

	confidenceMask?.close?.();
	categoryMask?.close?.();

	let bounds: MaskBounds | null = null;
	if (srcBounds) {
		bounds = {
			left: Math.round(srcBounds.left * iw / sw),
			top: Math.round(srcBounds.top * ih / sh),
			right: Math.round(srcBounds.right * iw / sw),
			bottom: Math.round(srcBounds.bottom * ih / sh)
		};
	}

	return { canvas: scaledCanvas, bounds };
}

export async function replaceBackground(
	file: File,
	bgColor: string = '#FF0000'
): Promise<Blob> {
	if (!browser) throw new Error('Hanya bisa dijalankan di browser');

	const workingImg = await createImageBitmap(file, {
		resizeWidth: WORKING_RESIZE_WIDTH,
		resizeQuality: 'medium'
	});

	const face = await detectFace(workingImg);
	let crop = getFaceCrop(workingImg, face);

	const cropCanvas = document.createElement('canvas');
	cropCanvas.width = OUTPUT_WIDTH;
	cropCanvas.height = OUTPUT_HEIGHT;
	const cropCtx = cropCanvas.getContext('2d')!;
	
	cropCtx.imageSmoothingEnabled = true;
	cropCtx.imageSmoothingQuality = 'high';
	drawPreparedCrop(cropCtx, workingImg, crop, bgColor);

	let mask = await createForegroundMask(cropCanvas);

	for (let i = 0; i < 2; i++) {
		const adjustedCrop = adjustCropForPersonBounds(crop, mask.bounds, workingImg);
		if (!adjustedCrop) break;

		crop = adjustedCrop;
		drawPreparedCrop(cropCtx, workingImg, crop, bgColor);
		mask = await createForegroundMask(cropCanvas);
	}

	const HR = 2;
	const HR_W = OUTPUT_WIDTH * HR;
	const HR_H = OUTPUT_HEIGHT * HR;

	const hrCanvas = document.createElement('canvas');
	hrCanvas.width = HR_W;
	hrCanvas.height = HR_H;
	const hrCtx = hrCanvas.getContext('2d')!;
	hrCtx.fillStyle = '#000000';
	hrCtx.fillRect(0, 0, HR_W, HR_H);
	hrCtx.imageSmoothingEnabled = true;
	hrCtx.imageSmoothingQuality = 'high';
	drawCropToCanvas(hrCtx, workingImg, crop, HR_W, HR_H);

	workingImg.close();

	const hrMask = await createForegroundMask(hrCanvas);

	hrCtx.globalCompositeOperation = 'destination-in';
	hrCtx.drawImage(hrMask.canvas, 0, 0, HR_W, HR_H);

	const hrImageData = hrCtx.getImageData(0, 0, HR_W, HR_H);
	cleanEdgePixels(hrImageData);
	hrCtx.putImageData(hrImageData, 0, 0);

	const outputCanvas = document.createElement('canvas');
	outputCanvas.width = OUTPUT_WIDTH;
	outputCanvas.height = OUTPUT_HEIGHT;
	const outputCtx = outputCanvas.getContext('2d')!;
	outputCtx.imageSmoothingEnabled = true;
	outputCtx.imageSmoothingQuality = 'high';
	outputCtx.fillStyle = bgColor;
	outputCtx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
	outputCtx.drawImage(hrCanvas, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

	return new Promise((resolve) => {
		outputCanvas.toBlob(
			(blob) => resolve(blob!),
			'image/png'
		);
	});
}
