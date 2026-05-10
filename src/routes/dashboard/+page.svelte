<script lang="ts">
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';

	let { data, form } = $props();

	let submittingReset = $state(false);
	let submittingLogout = $state(false);
	let printingAll = $state(false);

	function handleReset() {
		if (!confirm('Yakin ingin mereset database? Semua data akan hilang!')) return;
		submittingReset = true;
		return async ({ result }: { result: any }) => {
			submittingReset = false;
		};
	}

	function handleLogout() {
		submittingLogout = true;
	}

	async function handlePrintAll() {
		if (printingAll || !browser) return;
		printingAll = true;
		try {
			const res = await fetch('/dashboard/cetak');
			if (!res.ok) throw new Error('Failed to fetch print data');
			const data = await res.json();
			const { printCards } = await import('$lib/client/printer');
			await printCards(data);
		} catch (err) {
			alert('Gagal mengambil data cetak');
			console.error(err);
		} finally {
			printingAll = false;
		}
	}

	const menuCards = [
		{ href: '/dashboard/upload-excel', label: 'Upload Data Siswa', desc: 'Import dari file Excel (.xls)', color: 'bg-emerald-600 hover:bg-emerald-700', icon: '📗' },
		{ href: '/dashboard/upload-foto', label: 'Upload Foto Siswa', desc: 'Upload & hapus background otomatis', color: 'bg-red-500 hover:bg-red-600', icon: '📸' },
		{ href: '/dashboard/pengaturan', label: 'Pengaturan Profil', desc: 'Sekolah, logo, background kartu', color: 'bg-blue-600 hover:bg-blue-700', icon: '⚙️' },
		{ href: '/dashboard/pilih-kelas', label: 'Cetak Per Kelas', desc: 'Cetak kartu berdasarkan kelas', color: 'bg-cyan-500 hover:bg-cyan-600', icon: '🖨️' },
		{ href: '/dashboard/siswa', label: 'Daftar Siswa', desc: 'Cari, edit, & cetak per siswa', color: 'bg-cf-dark hover:bg-cf-dark-hover', icon: '📋' },
	];
</script>

<div class="max-w-3xl mx-auto">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-cf-text">Dashboard</h1>
		<p class="text-cf-muted text-sm mt-1">Selamat datang, {data.user.username}! <span class="text-cf-orange font-bold text-lg">TEST TAILWIND</span></p>
	</div>

	{#if form?.success}
		<div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-cf-success">
			{form.message}
		</div>
	{/if}
	{#if form?.message && !form.success}
		<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-cf-danger">
			{form.message}
		</div>
	{/if}

	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
		{#each menuCards as card}
			<a
				href={card.href}
				class="block p-5 bg-white rounded-xl border border-cf-border hover:border-cf-orange/30 hover:shadow-md transition-all"
			>
				<div class="flex items-start gap-4">
					<div class="{card.color} w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg shrink-0">
						{card.icon}
					</div>
					<div>
						<h3 class="font-semibold text-cf-text text-sm">{card.label}</h3>
						<p class="text-xs text-cf-muted mt-0.5">{card.desc}</p>
					</div>
				</div>
			</a>
		{/each}

		<button
			type="button"
			onclick={handlePrintAll}
			disabled={printingAll}
			class="p-5 bg-white rounded-xl border border-cf-border hover:border-cf-orange/30 hover:shadow-md transition-all text-left cursor-pointer"
		>
			<div class="flex items-start gap-4">
				<div class="bg-cf-orange w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg shrink-0">
					🖨️
				</div>
				<div>
					<h3 class="font-semibold text-cf-text text-sm">
						{printingAll ? 'Menyiapkan Kartu...' : 'Cetak Semua Kartu'}
					</h3>
					<p class="text-xs text-cf-muted mt-0.5">Cetak kartu seluruh siswa</p>
				</div>
			</div>
		</button>

		<div class="p-5 bg-white rounded-xl border border-cf-border">
			<div class="flex items-start gap-4">
				<div class="bg-cf-danger w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg shrink-0">
					⚠️
				</div>
				<div class="flex-1">
					<h3 class="font-semibold text-cf-text text-sm">Reset Database</h3>
					<p class="text-xs text-cf-muted mt-0.5 mb-3">Hapus semua data siswa</p>
					<form method="POST" action="?/reset" use:enhance={handleReset}>
						<button type="submit" disabled={submittingReset}
							class="px-3 py-1.5 bg-cf-danger hover:bg-red-700 disabled:bg-cf-danger/60 text-white text-xs font-medium rounded-lg transition cursor-pointer"
						>
							{submittingReset ? 'Menghapus...' : 'RESET DATABASE'}
						</button>
					</form>
				</div>
			</div>
		</div>

		<a
			href="/logout"
			class="p-5 bg-white rounded-xl border border-cf-border hover:border-cf-orange/30 hover:shadow-md transition-all"
		>
			<div class="flex items-start gap-4">
				<div class="bg-gray-500 w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg shrink-0">
					🚪
				</div>
				<div>
					<h3 class="font-semibold text-cf-text text-sm">Logout</h3>
					<p class="text-xs text-cf-muted mt-0.5">Keluar dari aplikasi</p>
				</div>
			</div>
		</a>
	</div>
</div>
