<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let submitting = $state(false);

	function handleRegister() {
		submitting = true;
		return async ({ result, update }: { result: any; update: () => void }) => {
			update();
			submitting = false;
		};
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-cf-dark via-cf-dark to-gray-900 flex items-center justify-center p-4">
	<div class="w-full max-w-md">
		<div class="bg-white rounded-2xl shadow-2xl p-8">
			<div class="text-center mb-6">
				<h1 class="text-xl font-bold text-cf-text">Daftar Akun Siswa</h1>
				<p class="text-sm text-cf-muted mt-1">Isi data diri untuk mendaftar</p>
			</div>

			{#if form?.message}
				<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-cf-danger text-center">
					{form.message}
				</div>
			{/if}

			<form method="POST" use:enhance={handleRegister} class="space-y-3">
				<div>
					<label for="nisn" class="block text-sm font-medium text-cf-text mb-1">NISN <span class="text-cf-danger">*</span></label>
					<input type="text" name="nisn" id="nisn" required placeholder="Nomor Induk Siswa Nasional"
						class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text placeholder-cf-muted focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition">
				</div>
				<div>
					<label for="nis" class="block text-sm font-medium text-cf-text mb-1">NIS</label>
					<input type="text" name="nis" id="nis" placeholder="Nomor Induk Sekolah"
						class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text placeholder-cf-muted focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition">
				</div>
				<div>
					<label for="nama" class="block text-sm font-medium text-cf-text mb-1">Nama Lengkap <span class="text-cf-danger">*</span></label>
					<input type="text" name="nama" id="nama" required placeholder="Nama lengkap"
						class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text placeholder-cf-muted focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition">
				</div>
				<div>
					<label for="kelas" class="block text-sm font-medium text-cf-text mb-1">Kelas <span class="text-cf-danger">*</span></label>
					<select name="kelas" id="kelas" required
						class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition bg-white">
						<option value="">-- Pilih Kelas --</option>
						{#each data.kelas as k}
							<option value={k.nama}>{k.nama}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="jk" class="block text-sm font-medium text-cf-text mb-1">Jenis Kelamin <span class="text-cf-danger">*</span></label>
					<select name="jk" id="jk" required
						class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition bg-white">
						<option value="">-- Pilih --</option>
						<option value="L">Laki-laki</option>
						<option value="P">Perempuan</option>
					</select>
				</div>
				<div>
					<label for="tempat" class="block text-sm font-medium text-cf-text mb-1">Tempat Lahir</label>
					<input type="text" name="tempat" id="tempat" placeholder="Tempat lahir"
						class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text placeholder-cf-muted focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition">
				</div>
				<div>
					<label for="tgl" class="block text-sm font-medium text-cf-text mb-1">Tanggal Lahir</label>
					<input type="date" name="tgl" id="tgl"
						class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition">
				</div>
				<div>
					<label for="alamat" class="block text-sm font-medium text-cf-text mb-1">Alamat</label>
					<textarea name="alamat" id="alamat" rows="2" placeholder="Alamat lengkap"
						class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text placeholder-cf-muted focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition resize-y"></textarea>
				</div>

				<div class="text-xs text-cf-muted bg-gray-50 rounded-lg p-3">
					Username dan password login menggunakan <strong>NISN</strong>.
				</div>

				<button type="submit" disabled={submitting}
					class="w-full py-2.5 bg-cf-orange hover:bg-cf-orange-hover disabled:bg-cf-orange/60 text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2 cursor-pointer"
				>
					{#if submitting}
						<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
						</svg>
						Mendaftar...
					{:else}
						Daftar
					{/if}
				</button>
			</form>

			<div class="mt-4 text-center">
				<a href="/" class="text-sm text-cf-orange hover:text-cf-orange-hover transition">
					Sudah punya akun? Login di sini
				</a>
			</div>
		</div>
	</div>
</div>
