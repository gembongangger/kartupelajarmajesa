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
const FACE_HEIGHT_RATIO = 0.28;
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
			const growRatio = 1 + Math.min(0.18, (PERSON_MIN_MARGIN_BOTTOM - bottomMargin) / OUTPUT_HEIGHT);
			const centerX = crop.x + crop.width / 2;
			const centerY = crop.y + crop.height / 2;
			const outputRatio = OUTPUT_WIDTH / OUTPUT_HEIGHT;

			nextCrop.height = Math.min(crop.height * growRatio, image.height);
			nextCrop.width = nextCrop.height * outputRatio;

			if (nextCrop.width > image.width) {
				nextCrop.width = image.width;
				nextCrop.height = nextCrop.width / outputRatio;
			}

			nextCrop.x = centerX - nextCrop.width / 2;
			nextCrop.y = centerY - nextCrop.height / 2;
			changed = true;
		}
	}

	if (leftMargin < PERSON_MIN_MARGIN_X || rightMargin < PERSON_MIN_MARGIN_X) {
		const growRatio = 1 + Math.min(0.18, Math.max(
			PERSON_MIN_MARGIN_X - leftMargin,
			PERSON_MIN_MARGIN_X - rightMargin,
			0
		) / OUTPUT_WIDTH);
		const centerX = crop.x + crop.width / 2;
		const centerY = crop.y + crop.height / 2;
		const outputRatio = OUTPUT_WIDTH / OUTPUT_HEIGHT;

		nextCrop.height = Math.min(crop.height * growRatio, image.height);
		nextCrop.width = nextCrop.height * outputRatio;

		if (nextCrop.width > image.width) {
			nextCrop.width = image.width;
			nextCrop.height = nextCrop.width / outputRatio;
		}

		nextCrop.x = centerX - nextCrop.width / 2;
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

	const width = confidenceMask?.width ?? categoryMask!.width;
	const height = confidenceMask?.height ?? categoryMask!.height;
	const confidence = confidenceMask?.getAsFloat32Array();
	const category = confidence ? null : categoryMask!.getAsUint8Array();
	const alphaMap = new Uint8ClampedArray(width * height);
	const maskData = new ImageData(width, height);
	const data = maskData.data;

	for (let i = 0; i < alphaMap.length; i++) {
	alphaMap[i] = confidence
		? smoothstep(0.15, 0.50, confidence[i]) * 255
		: category![i] === 1 ? 255 : 0;
	}

	const bounds = getAlphaBounds(alphaMap, width, height);

	for (let i = 0; i < data.length; i += 4) {
		const maskIndex = i / 4;
		data[i] = 255;
		data[i + 1] = 255;
		data[i + 2] = 255;
		data[i + 3] = alphaMap[maskIndex];
	}

	const maskCanvas = document.createElement('canvas');
	maskCanvas.width = width;
	maskCanvas.height = height;
	maskCanvas.getContext('2d')!.putImageData(maskData, 0, 0);
	confidenceMask?.close?.();
	categoryMask?.close?.();

	return { canvas: maskCanvas, bounds };
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

	workingImg.close();
	const foregroundCanvas = document.createElement('canvas');
	foregroundCanvas.width = OUTPUT_WIDTH;
	foregroundCanvas.height = OUTPUT_HEIGHT;
	const foregroundCtx = foregroundCanvas.getContext('2d')!;
	foregroundCtx.drawImage(cropCanvas, 0, 0);
	foregroundCtx.globalCompositeOperation = 'destination-in';
	foregroundCtx.drawImage(mask.canvas, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

	const outputCanvas = document.createElement('canvas');
	outputCanvas.width = OUTPUT_WIDTH;
	outputCanvas.height = OUTPUT_HEIGHT;
	const outputCtx = outputCanvas.getContext('2d')!;
	outputCtx.fillStyle = bgColor;
	outputCtx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
	outputCtx.drawImage(foregroundCanvas, 0, 0);

	return new Promise((resolve) => {
		outputCanvas.toBlob(
			(blob) => resolve(blob!),
			'image/jpeg',
			0.85
		);
	});
}
