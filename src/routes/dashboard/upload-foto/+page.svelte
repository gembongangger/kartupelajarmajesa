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

<div class="max-w-xl mx-auto">
	<a href="/dashboard" class="inline-flex items-center gap-1 text-sm text-cf-blue hover:text-cf-blue-hover mb-4">
		← Kembali ke Dashboard
	</a>

	<h1 class="text-2xl font-bold text-cf-text mb-1">Upload Foto Siswa</h1>
	<p class="text-sm text-cf-muted mb-6">Nama file = <code class="bg-gray-100 px-1 rounded">NISN.jpg</code> (contoh: <code class="bg-gray-100 px-1 rounded">3219876540.jpg</code>). Background otomatis diganti merah.</p>

	<div class="bg-white rounded-xl border border-cf-border p-6">
		<form method="POST" enctype="multipart/form-data" use:enhance={handleSubmit}>
			<div class="border-2 border-dashed border-cf-border rounded-lg p-8 text-center hover:border-cf-orange/50 transition cursor-pointer mb-4">
				<input type="file" name="fotos" accept=".jpg" multiple required
					onchange={(e) => files = (e.target as HTMLInputElement).files}
					class="w-full text-sm text-cf-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-cf-orange/10 file:text-cf-orange hover:file:bg-cf-orange/20">
			</div>

			<button type="submit" disabled={processing}
				class="w-full py-2.5 bg-cf-orange hover:bg-cf-orange-hover disabled:bg-cf-orange/60 text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2 cursor-pointer"
			>
				{#if processing}
					<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
					</svg>
					Memproses {progress.current}/{progress.total}...
				{:else}
					Upload & Proses
				{/if}
			</button>
		</form>

		{#if processing}
			<div class="mt-4">
				<div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
					<div class="h-full bg-cf-orange rounded-full transition-all duration-300" style="width: {progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%"></div>
				</div>
				<p class="text-xs text-cf-muted text-center mt-2">
					Memproses foto {progress.current}/{progress.total} (Smart Crop & BG)
				</p>
			</div>
		{/if}

		{#if errorMsg}
			<p class="mt-4 text-sm text-cf-danger">{errorMsg}</p>
		{/if}
	</div>
</div>

{#if notify}
	<div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
		<div class="px-5 py-3 rounded-lg text-sm font-medium shadow-lg animate-[fadeInUp_0.25s_ease-out] {notify.type === 'success' ? 'bg-green-50 text-cf-success border border-green-200' : 'bg-red-50 text-cf-danger border border-red-200'}">
			{notify.message}
		</div>
	</div>
{/if}

<style>
	@keyframes fadeInUp {
		from { opacity: 0; transform: translateY(12px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>
