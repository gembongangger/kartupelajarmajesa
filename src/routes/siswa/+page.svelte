<script lang="ts">
	import { enhance } from '$app/forms';
	import { replaceBackground, supportsMediaPipe } from '$lib/client/processPhoto';

	let { data } = $props();
	let siswa = $derived(data.siswa);

	let submitting1 = $state(false);
	let submitting2 = $state(false);
	let modelLoad = $state(false);
	let notify: { type: 'success' | 'error'; message: string } | null = $state(null);

	function handleUpdate() {
		submitting1 = true;
		return async ({ result }: { result: any }) => {
			submitting1 = false;
			if (result.type === 'success' && result.data?.success) {
				notify = { type: 'success', message: 'Data berhasil disimpan' };
			} else if (result.type === 'failure') {
				notify = { type: 'error', message: result.data?.message || 'Gagal menyimpan' };
			} else {
				notify = { type: 'error', message: 'Gagal menyimpan data' };
			}
			setTimeout(() => { notify = null; }, 4000);
		};
	}

	async function handleUpload({ formData }: { formElement: HTMLFormElement; formData: FormData }) {
		const file = formData.get('foto') as File;
		if (!file || file.size === 0) return;

		if (!supportsMediaPipe()) {
			notify = { type: 'error', message: 'Browser tidak mendukung fitur ini' };
			setTimeout(() => { notify = null; }, 4000);
			return;
		}

		submitting2 = true;
		modelLoad = true;

		try {
			const processed = await replaceBackground(file, '#FF0000');
			modelLoad = false;
			formData.set('foto', processed, file.name);
		} catch (e: any) {
			notify = { type: 'error', message: 'Gagal proses foto: ' + (e.message || '') };
			setTimeout(() => { notify = null; }, 4000);
			submitting2 = false;
			return;
		}

		return async ({ result }: { result: any }) => {
			submitting2 = false;
			if (result.type === 'success' && result.data?.success) {
				notify = { type: 'success', message: 'Foto berhasil diupload dengan background merah' };
			} else if (result.type === 'failure') {
				notify = { type: 'error', message: result.data?.message || 'Gagal upload foto' };
			} else {
				notify = { type: 'error', message: 'Gagal upload foto' };
			}
			setTimeout(() => { notify = null; }, 4000);
		};
	}
</script>

<div class="min-h-screen bg-cf-gray font-['Inter',sans-serif] p-4 md:p-6 lg:p-8">
	<div class="max-w-lg mx-auto">
		<div class="bg-white rounded-xl border border-cf-border p-6 mb-6">
			<h1 class="text-2xl font-bold text-cf-text mb-1">Profil Siswa</h1>
			<p class="text-sm text-cf-muted mb-6">NISN: {siswa.nisn} | NIS: {siswa.nis}</p>

			<form method="POST" action="?/update" use:enhance={handleUpdate} class="space-y-4">
				<div>
					<label for="nama" class="block text-sm font-medium text-cf-text mb-1">Nama Lengkap</label>
					<input type="text" name="nama" id="nama" value={siswa.nama} required
						class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition">
				</div>
				<div>
					<label for="jk" class="block text-sm font-medium text-cf-text mb-1">Jenis Kelamin</label>
					<select name="jk" id="jk" value={siswa.jenis_kelamin} required
						class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition bg-white">
						<option value="L">Laki-laki</option>
						<option value="P">Perempuan</option>
					</select>
				</div>
				<div>
					<label for="tempat" class="block text-sm font-medium text-cf-text mb-1">Tempat Lahir</label>
					<input type="text" name="tempat" id="tempat" value={siswa.tempat_lahir}
						class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition">
				</div>
				<div>
					<label for="tgl" class="block text-sm font-medium text-cf-text mb-1">Tanggal Lahir</label>
					<input type="date" name="tgl" id="tgl" value={siswa.tanggal_lahir}
						class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition">
				</div>
				<div>
					<label for="kelas" class="block text-sm font-medium text-cf-text mb-1">Kelas</label>
					<select name="kelas" id="kelas" value={siswa.kelas} required
						class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition bg-white">
						<option value="">-- Pilih Kelas --</option>
						{#each data.kelas as k}
							<option value={k.nama}>{k.nama}</option>
						{/each}
					</select>
				</div>
				<button type="submit" disabled={submitting1}
					class="w-full py-2.5 bg-cf-orange hover:bg-cf-orange-hover disabled:bg-cf-orange/60 text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2 cursor-pointer"
				>
					{#if submitting1}
						<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
						</svg>
						Menyimpan...
					{:else}
						Simpan Perubahan
					{/if}
				</button>
			</form>
		</div>

		<div class="bg-white rounded-xl border border-cf-border p-6 mb-6">
			<h2 class="text-lg font-semibold text-cf-text mb-4">Foto Siswa</h2>
			{#if siswa.nisn}
				<div class="mb-4">
					<img src="/foto/{siswa.nisn}.jpg?t={Date.now()}" alt="Foto Siswa"
						class="w-36 h-36 object-cover rounded-lg border border-cf-border">
				</div>
			{/if}
			<form method="POST" action="?/upload_foto" enctype="multipart/form-data" use:enhance={handleUpload}>
				<div class="mb-4">
					<input type="file" name="foto" id="foto" accept=".jpg" required
						class="w-full text-sm text-cf-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-cf-orange/10 file:text-cf-orange hover:file:bg-cf-orange/20">
				</div>
				<button type="submit" disabled={submitting2}
					class="w-full py-2.5 bg-cf-orange hover:bg-cf-orange-hover disabled:bg-cf-orange/60 text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2 cursor-pointer"
				>
					{#if submitting2}
						<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
						</svg>
						{modelLoad ? 'Muat model AI...' : 'Memproses foto...'}
					{:else}
						Upload Foto
					{/if}
				</button>
			</form>
		</div>

		<form method="POST" action="/logout">
			<button type="submit"
				class="w-full py-2.5 bg-cf-danger hover:bg-red-700 text-white font-semibold rounded-lg text-sm transition cursor-pointer"
			>
				Logout
			</button>
		</form>
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
