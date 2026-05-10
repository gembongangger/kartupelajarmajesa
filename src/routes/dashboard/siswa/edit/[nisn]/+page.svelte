<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	let student = $derived(data.student);

	let submitting = $state(false);

	function handleSubmit() {
		submitting = true;
		return async ({ result }: { result: any }) => {
			submitting = false;
		};
	}
</script>

<div class="max-w-lg mx-auto">
	<a href="/dashboard/siswa" class="inline-flex items-center gap-1 text-sm text-cf-blue hover:text-cf-blue-hover mb-4">
		← Kembali ke Daftar Siswa
	</a>

	<h1 class="text-2xl font-bold text-cf-text mb-6">Edit Data Siswa</h1>

	<div class="bg-white rounded-xl border border-cf-border p-6">
		<form method="POST" use:enhance={handleSubmit} class="space-y-4">
			<div>
				<label for="nama" class="block text-sm font-medium text-cf-text mb-1">Nama Lengkap</label>
				<input type="text" name="nama" id="nama" value={student.nama} required
					class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition">
			</div>
			<div>
				<label for="nis" class="block text-sm font-medium text-cf-text mb-1">NIS</label>
				<input type="text" name="nis" id="nis" value={student.nis} required
					class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition">
			</div>
			<div>
				<label for="kelas" class="block text-sm font-medium text-cf-text mb-1">Kelas</label>
				<select name="kelas" id="kelas" value={student.kelas} required
					class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition bg-white">
					<option value="">-- Pilih Kelas --</option>
					{#each data.kelas as k}
						<option value={k.nama}>{k.nama}</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="jk" class="block text-sm font-medium text-cf-text mb-1">Jenis Kelamin</label>
				<select name="jk" id="jk" value={student.jenis_kelamin} required
					class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition bg-white">
					<option value="L">Laki-laki</option>
					<option value="P">Perempuan</option>
				</select>
			</div>
			<div>
				<label for="tempat" class="block text-sm font-medium text-cf-text mb-1">Tempat Lahir</label>
				<input type="text" name="tempat" id="tempat" value={student.tempat_lahir}
					class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition">
			</div>
			<div>
				<label for="tgl" class="block text-sm font-medium text-cf-text mb-1">Tanggal Lahir</label>
				<input type="date" name="tgl" id="tgl" value={student.tanggal_lahir}
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
					Simpan Perubahan
				{/if}
			</button>
		</form>
	</div>
</div>
