<script lang="ts">
	import { enhance } from '$app/forms';
	import { replaceBackground, supportsMediaPipe, isLoading } from '$lib/client/processPhoto';
	let { form } = $props();

	let files: FileList | null = null;
	let processing = $state(false);
	let modelLoad = $state(false);
	let progress = $state({ current: 0, total: 0 });
	let errorMsg = $state('');
	let notify: { type: 'success' | 'error'; message: string } | null = $state(null);

	async function handleSubmit() {
		if (!files || files.length === 0) return;

		if (!supportsMediaPipe()) {
			errorMsg = 'Browser tidak mendukung fitur ini. Gunakan Chrome/Edge terbaru.';
			return;
		}

		processing = true;
		modelLoad = true;
		errorMsg = '';
		notify = null;
		progress = { current: 0, total: files.length };

		const formData = new FormData();

		try {
			for (let i = 0; i < files.length; i++) {
				progress = { current: i + 1, total: files.length };

				const file = files[i];
				if (file.size === 0) continue;

				const name = file.name;
				if (!/^\d{5,}\.jpg$/i.test(name)) {
					continue;
				}

				try {
					const processedBlob = await replaceBackground(file, '#FF0000');
					const processedFile = new File([processedBlob], name, { type: 'image/jpeg' });
					formData.append('fotos', processedFile);
				} catch (e) {
					formData.append('fotos', file);
				}
			}
			} catch (e: any) {
				errorMsg = 'Gagal memproses foto: ' + (e.message || 'unknown error');
				processing = false;
				modelLoad = false;
				return;
			}

			return async ({ result }: { result: any }) => {
				processing = false;
				modelLoad = false;
				progress = { current: 0, total: 0 };
			if (result.type === 'success' && result.data) {
				const d = result.data;
				notify = { type: 'success', message: `✅ Berhasil: ${d.berhasil}, ❌ Gagal: ${d.gagal}` };
			} else if (result.type === 'failure') {
				notify = { type: 'error', message: result.data?.message || 'Gagal upload' };
			}
			setTimeout(() => { notify = null; }, 5000);
		};
	}
</script>

<style>
	.upload-foto-body { font-family: 'Segoe UI', sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
	h2 { text-align: center; color: #145DA0; }
	input[type="file"] { margin-bottom: 10px; }
	button {
		background-color: #145DA0; color: #fff; border: none; padding: 12px 20px;
		border-radius: 6px; cursor: pointer; font-size: 16px; width: 100%;
		display: flex; align-items: center; justify-content: center; gap: 8px;
	}
	button:hover { background-color: #004c81; }
	button:disabled { background-color: #7fa8c9; cursor: not-allowed; }
	.back-link { display: block; margin-top: 20px; text-align: center; color: #145DA0; text-decoration: none; }
	.back-link:hover { text-decoration: underline; }
	.spinner {
		width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3);
		border-top: 2px solid #fff; border-radius: 50%; animation: spin 0.6s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
	.progress-bar {
		width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; margin: 12px 0; overflow: hidden;
	}
	.progress-fill {
		height: 100%; background: #145DA0; border-radius: 4px; transition: width 0.3s ease;
	}
	.error { color: #dc3545; text-align: center; margin: 12px 0; }
	.notif-container {
		position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
		z-index: 999; pointer-events: none; display: flex; flex-direction: column; align-items: center;
	}
	.notif {
		padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 500;
		box-shadow: 0 4px 16px rgba(0,0,0,0.15); pointer-events: auto; animation: fadeInUp 0.25s ease-out;
	}
	.notif.success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
	.notif.error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
	@keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
</style>

<div class="upload-foto-body">
	<h2>Upload Foto Siswa Massal</h2>
	<p><strong>Catatan:</strong> Nama file = <code>NISN.jpg</code> (contoh: <code>3219876540.jpg</code>). Background otomatis diganti merah.</p>

	<form method="POST" enctype="multipart/form-data" use:enhance={handleSubmit}>
		<input type="file" name="fotos" accept=".jpg" multiple required
			onchange={(e) => files = (e.target as HTMLInputElement).files}><br>
		<button type="submit" disabled={processing}>
			{#if processing}
				<span class="spinner"></span>
				Memproses {progress.current}/{progress.total}...
			{:else}
				Upload & Proses
			{/if}
		</button>
	</form>

	{#if processing}
		<div class="progress-bar">
			<div class="progress-fill" style="width: {progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%"></div>
		</div>
		<p style="text-align:center;color:#666;">
			{#if modelLoad && progress.current === 1}
				⏳ Mendownload model AI (40MB, hanya sekali)...
			{:else}
				✂️ Memproses foto {progress.current}/{progress.total}
			{/if}
		</p>
	{/if}

	{#if errorMsg}
		<p class="error">{errorMsg}</p>
	{/if}

	<a href="/dashboard" class="back-link">← Kembali ke Dashboard</a>
</div>

<div class="notif-container">
	{#if notify}
		<div class="notif {notify.type}">{notify.message}</div>
	{/if}
</div>
