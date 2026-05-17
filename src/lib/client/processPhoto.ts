import { browser } from '$app/environment';

type FaceBox = {
	x: number;
	y: number;
	width: number;
	height: number;
};

const OUTPUT_WIDTH = 360;
const OUTPUT_HEIGHT = 440;
const WORKING_RESIZE_WIDTH = 900;
const FACE_HEIGHT_RATIO = 0.28;
const FACE_CENTER_Y_RATIO = 0.5;
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

function getFaceCrop(image: ImageBitmap, face: FaceBox | null) {
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
	crop: { x: number; y: number; width: number; height: number }
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

function smoothstep(edge0: number, edge1: number, value: number) {
	const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
	return t * t * (3 - 2 * t);
}

async function createForegroundMask(image: HTMLCanvasElement) {
	const segmenter = await getImageSegmenter();
	const result = segmenter.segment(image);
	const confidenceMask = result?.confidenceMasks?.[1] ?? result?.confidenceMasks?.[0];
	const categoryMask = result?.categoryMask;

	if (!confidenceMask && !categoryMask) {
		throw new Error('Mask segmentasi orang tidak tersedia');
	}

	const width = confidenceMask?.width ?? categoryMask.width;
	const height = confidenceMask?.height ?? categoryMask.height;
	const confidence = confidenceMask?.getAsFloat32Array();
	const category = confidence ? null : categoryMask.getAsUint8Array();
	const maskData = new ImageData(width, height);
	const data = maskData.data;

	for (let i = 0; i < data.length; i += 4) {
		const maskIndex = i / 4;
		const alpha = confidence
			? smoothstep(0.28, 0.58, confidence[maskIndex]) * 255
			: category![maskIndex] === 1 ? 255 : 0;

		data[i] = 255;
		data[i + 1] = 255;
		data[i + 2] = 255;
		data[i + 3] = alpha;
	}

	const maskCanvas = document.createElement('canvas');
	maskCanvas.width = width;
	maskCanvas.height = height;
	maskCanvas.getContext('2d')!.putImageData(maskData, 0, 0);
	confidenceMask?.close?.();
	categoryMask?.close?.();

	return maskCanvas;
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
	const crop = getFaceCrop(workingImg, face);

	const cropCanvas = document.createElement('canvas');
	cropCanvas.width = OUTPUT_WIDTH;
	cropCanvas.height = OUTPUT_HEIGHT;
	const cropCtx = cropCanvas.getContext('2d')!;
	
	cropCtx.imageSmoothingEnabled = true;
	cropCtx.imageSmoothingQuality = 'high';
	cropCtx.fillStyle = bgColor;
	cropCtx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
	drawCropWithPadding(cropCtx, workingImg, crop);
	workingImg.close();

	const maskCanvas = await createForegroundMask(cropCanvas);
	const foregroundCanvas = document.createElement('canvas');
	foregroundCanvas.width = OUTPUT_WIDTH;
	foregroundCanvas.height = OUTPUT_HEIGHT;
	const foregroundCtx = foregroundCanvas.getContext('2d')!;
	foregroundCtx.drawImage(cropCanvas, 0, 0);
	foregroundCtx.globalCompositeOperation = 'destination-in';
	foregroundCtx.drawImage(maskCanvas, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

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
