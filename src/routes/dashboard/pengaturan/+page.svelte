<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let pengaturan = $derived(data.pengaturan);

	let logoPreviewOverride = $state('');
	let ttdPreviewOverride = $state('');
	let bgPreviewOverride = $state('');
	let bg2PreviewOverride = $state('');

	let logoPreview = $derived(logoPreviewOverride || (pengaturan.has_logo ? '/pengaturan/gambar/logo' : ''));
	let ttdPreview = $derived(ttdPreviewOverride || (pengaturan.has_tanda_tangan ? '/pengaturan/gambar/tanda_tangan' : ''));
	let bgPreview = $derived(bgPreviewOverride || (pengaturan.has_background ? '/pengaturan/gambar/background' : ''));
	let bg2Preview = $derived(bg2PreviewOverride || (pengaturan.has_background_belakang ? '/pengaturan/gambar/background_belakang' : ''));

	let submitting = $state(false);
	let notify: { type: 'success' | 'error'; message: string } | null = $state(null);

	function handlePreview(event: Event, type: string) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				const result = e.target?.result as string;
				if (type === 'logo') logoPreviewOverride = result;
				if (type === 'ttd') ttdPreviewOverride = result;
				if (type === 'bg') bgPreviewOverride = result;
				if (type === 'bg2') bg2PreviewOverride = result;
			};
			reader.readAsDataURL(file);
		}
	}

	let kelasText = $state('');
	let submittingKelas = $state(false);

	$effect(() => {
		if (data.kelas) {
			kelasText = data.kelas.map((k: any) => k.nama).join('\n');
		}
	});

	function handleSubmit() {
		submitting = true;
		return async ({ result, update }: { result: any; update: () => void }) => {
			update();
			submitting = false;
			if (result.type === 'success' && result.data?.success) {
				notify = { type: 'success', message: 'Pengaturan berhasil disimpan' };
			} else if (result.type === 'failure' && result.data?.message) {
				notify = { type: 'error', message: result.data.message };
			} else {
				notify = { type: 'error', message: 'Gagal menyimpan pengaturan' };
			}
			setTimeout(() => { notify = null; }, 4000);
		};
	}

	function handleSubmitKelas() {
		submittingKelas = true;
		return async ({ result, update }: { result: any; update: () => void }) => {
			update();
			submittingKelas = false;
			if (result.type === 'success' && result.data?.success) {
				notify = { type: 'success', message: 'Kelas berhasil disimpan' };
			} else if (result.type === 'failure' && result.data?.message) {
				notify = { type: 'error', message: result.data.message };
			} else {
				notify = { type: 'error', message: 'Gagal menyimpan kelas' };
			}
			setTimeout(() => { notify = null; }, 4000);
		};
	}
</script>

<div class="max-w-xl mx-auto">
	<a href="/dashboard" class="inline-flex items-center gap-1 text-sm text-cf-blue hover:text-cf-blue-hover mb-4">
		← Kembali ke Dashboard
	</a>

	<h1 class="text-2xl font-bold text-cf-text mb-6">Pengaturan Sekolah</h1>

	<div class="bg-white rounded-xl border border-cf-border p-6 mb-6">
		<h2 class="text-lg font-semibold text-cf-text mb-4">Profil Sekolah</h2>
		<form method="POST" action="?/simpan" enctype="multipart/form-data" use:enhance={handleSubmit} class="space-y-4">
			<div>
				<label for="nama_sekolah" class="block text-sm font-medium text-cf-text mb-1">Nama Sekolah:</label>
				<input type="text" name="nama_sekolah" id="nama_sekolah" value={pengaturan.nama_sekolah} required
					class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition">
			</div>
			<div>
				<label for="alamat" class="block text-sm font-medium text-cf-text mb-1">Alamat:</label>
				<textarea name="alamat" id="alamat" rows="3" required
					class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition resize-y">{pengaturan.alamat}</textarea>
			</div>
			<div>
				<label for="kota_ttd" class="block text-sm font-medium text-cf-text mb-1">Kota Tanda Tangan:</label>
				<input type="text" name="kota_ttd" id="kota_ttd" value={pengaturan.kota_ttd}
					class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition">
			</div>
			<div>
				<label for="tata_tertib" class="block text-sm font-medium text-cf-text mb-1">Tata Tertib / Keterangan Kartu:</label>
				<textarea name="tata_tertib" id="tata_tertib" rows="4"
					class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition resize-y">{pengaturan.tata_tertib}</textarea>
			</div>
			<div>
				<label for="kepala_sekolah" class="block text-sm font-medium text-cf-text mb-1">Kepala Sekolah:</label>
				<input type="text" name="kepala_sekolah" id="kepala_sekolah" value={pengaturan.kepala_sekolah} required
					class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition">
			</div>
			<div>
				<label for="nip_kepala_sekolah" class="block text-sm font-medium text-cf-text mb-1">NIP Kepala Sekolah:</label>
				<input type="text" name="nip_kepala_sekolah" id="nip_kepala_sekolah" value={pengaturan.nip_kepala_sekolah} required
					class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition">
			</div>
			<div>
				<label for="tanggal_ttd" class="block text-sm font-medium text-cf-text mb-1">Tanggal TTD:</label>
				<input type="date" name="tanggal_ttd" id="tanggal_ttd" value={pengaturan.tanggal_ttd} required
					class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition">
			</div>
			<div>
				<label for="logo" class="block text-sm font-medium text-cf-text mb-1">Logo (.png):</label>
				<input type="file" name="logo" id="logo" accept=".png" onchange={(e) => handlePreview(e, 'logo')}
					class="w-full text-sm text-cf-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-cf-orange/10 file:text-cf-orange hover:file:bg-cf-orange/20">
				{#if logoPreview}
					<img src={logoPreview} alt="Logo" class="mt-2 max-w-[200px] h-auto border border-cf-border rounded-lg">
				{/if}
			</div>
			<div>
				<label for="tanda_tangan" class="block text-sm font-medium text-cf-text mb-1">Tanda Tangan Kepala Sekolah:</label>
				<input type="file" name="tanda_tangan" id="tanda_tangan" onchange={(e) => handlePreview(e, 'ttd')}
					class="w-full text-sm text-cf-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-cf-orange/10 file:text-cf-orange hover:file:bg-cf-orange/20">
				{#if ttdPreview}
					<img src={ttdPreview} alt="Tanda Tangan" class="mt-2 max-w-[200px] h-auto border border-cf-border rounded-lg">
				{/if}
			</div>
			<div>
				<label for="background" class="block text-sm font-medium text-cf-text mb-1">Background Kartu:</label>
				<input type="file" name="background" id="background" onchange={(e) => handlePreview(e, 'bg')}
					class="w-full text-sm text-cf-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-cf-orange/10 file:text-cf-orange hover:file:bg-cf-orange/20">
				{#if bgPreview}
					<img src={bgPreview} alt="Background" class="mt-2 max-w-[200px] h-auto border border-cf-border rounded-lg">
				{/if}
			</div>
			<div>
				<label for="background_belakang" class="block text-sm font-medium text-cf-text mb-1">Background Kartu Belakang:</label>
				<input type="file" name="background_belakang" id="background_belakang" onchange={(e) => handlePreview(e, 'bg2')}
					class="w-full text-sm text-cf-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-cf-orange/10 file:text-cf-orange hover:file:bg-cf-orange/20">
				{#if bg2Preview}
					<img src={bg2Preview} alt="Background Belakang" class="mt-2 max-w-[200px] h-auto border border-cf-border rounded-lg">
				{/if}
			</div>

			<hr class="border-cf-border my-6">

			<h3 class="font-semibold text-cf-text">Ubah Password Admin</h3>
			<div>
				<label for="password_lama" class="block text-sm font-medium text-cf-text mb-1">Password Lama:</label>
				<input type="password" name="password_lama" id="password_lama"
					class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition">
			</div>
			<div>
				<label for="password_baru" class="block text-sm font-medium text-cf-text mb-1">Password Baru:</label>
				<input type="password" name="password_baru" id="password_baru"
					class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition">
			</div>
			<div>
				<label for="konfirmasi_password" class="block text-sm font-medium text-cf-text mb-1">Konfirmasi Password Baru:</label>
				<input type="password" name="konfirmasi_password" id="konfirmasi_password"
					class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition">
			</div>

			<button type="submit" disabled={submitting}
				class="w-full py-2.5 bg-cf-orange hover:bg-cf-orange-hover disabled:bg-cf-orange/60 text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2 cursor-pointer"
			>
				{#if submitting}
					<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
					</svg>
					Menyimpan...
				{:else}
					Simpan Pengaturan
				{/if}
			</button>
		</form>
	</div>

	<div class="bg-white rounded-xl border border-cf-border p-6">
		<h2 class="text-lg font-semibold text-cf-text mb-4">Data Kelas</h2>
		<form method="POST" action="?/simpan_kelas" use:enhance={handleSubmitKelas}>
			<div>
				<label for="kelas" class="block text-sm font-medium text-cf-text mb-1">Daftar Kelas (satu baris per kelas):</label>
				<textarea name="kelas" id="kelas" rows="6" bind:value={kelasText}
					class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition resize-y"></textarea>
			</div>
			<button type="submit" disabled={submittingKelas}
				class="w-full mt-4 py-2.5 bg-cf-orange hover:bg-cf-orange-hover disabled:bg-cf-orange/60 text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2 cursor-pointer"
			>
				{#if submittingKelas}
					<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
					</svg>
					Menyimpan...
				{:else}
					Simpan Kelas
				{/if}
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
