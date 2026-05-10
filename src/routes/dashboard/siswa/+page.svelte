<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	let { data } = $props();

	let search = $state(data.q || '');
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	let printingNisn = $state<string | null>(null);

	function onSearchInput(e: Event) {
		const val = (e.target as HTMLInputElement).value;
		search = val;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			const params = new URLSearchParams();
			if (val) params.set('q', val);
			params.set('page', '1');
			goto(`?${params}`, { replaceState: true, keepFocus: true });
		}, 400);
	}

	function goPage(p: number) {
		if (p < 1 || p > data.totalPages) return;
		const params = new URLSearchParams();
		if (data.q) params.set('q', data.q);
		params.set('page', String(p));
		goto(`?${params}`, { replaceState: true, keepFocus: true });
	}

	async function handlePrint(nisn: string) {
		if (printingNisn || !browser) return;
		printingNisn = nisn;
		try {
			const res = await fetch(`/dashboard/cetak?nisn=${encodeURIComponent(nisn)}`);
			if (!res.ok) throw new Error('Failed to fetch print data');
			const data = await res.json();
			const { printCards } = await import('$lib/client/printer');
			await printCards(data);
		} catch (err) {
			alert('Gagal mengambil data cetak');
			console.error(err);
		} finally {
			printingNisn = null;
		}
	}
</script>

<div class="max-w-5xl mx-auto">
	<a href="/dashboard" class="inline-flex items-center gap-1 text-sm text-cf-blue hover:text-cf-blue-hover mb-4">
		← Kembali ke Dashboard
	</a>

	<h1 class="text-2xl font-bold text-cf-text mb-4">Daftar Siswa</h1>

	<div class="bg-white rounded-xl border border-cf-border overflow-hidden">
		<div class="p-4 border-b border-cf-border">
			<input
				type="text" placeholder="Cari nama, NISN, NIS, atau kelas..."
				value={search} oninput={onSearchInput}
				class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition"
			>
			<p class="text-xs text-cf-muted mt-1.5">
				Menampilkan {data.total} siswa
				{#if data.q}(hasil pencarian "{data.q}"){/if}
			</p>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="bg-gray-50 text-cf-muted text-xs uppercase tracking-wider">
						<th class="text-left px-4 py-3 font-medium">No</th>
						<th class="text-left px-4 py-3 font-medium">NIS</th>
						<th class="text-left px-4 py-3 font-medium">NISN</th>
						<th class="text-left px-4 py-3 font-medium">Nama</th>
						<th class="text-left px-4 py-3 font-medium">Kelas</th>
						<th class="text-left px-4 py-3 font-medium">JK</th>
						<th class="text-left px-4 py-3 font-medium">Tgl Lahir</th>
						<th class="text-left px-4 py-3 font-medium">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-cf-border">
					{#each data.students as row, i}
						<tr class="hover:bg-gray-50/50 transition">
							<td class="px-4 py-3 text-cf-muted">{(data.page - 1) * data.perPage + i + 1}</td>
							<td class="px-4 py-3 text-cf-text">{row.nis}</td>
							<td class="px-4 py-3 text-cf-text font-mono text-xs">{row.nisn}</td>
							<td class="px-4 py-3 text-cf-text font-medium">{row.nama}</td>
							<td class="px-4 py-3 text-cf-text">{row.kelas}</td>
							<td class="px-4 py-3 text-cf-muted">{row.jenis_kelamin}</td>
							<td class="px-4 py-3 text-cf-muted">{row.tanggal_lahir}</td>
							<td class="px-4 py-3">
								<div class="flex items-center gap-1.5">
									<a href="/dashboard/siswa/edit/{row.nisn}"
										class="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-medium transition">Edit</a>
									<button onclick={() => handlePrint(row.nisn)} disabled={printingNisn === row.nisn}
										class="px-2.5 py-1 bg-cf-orange/10 text-cf-orange hover:bg-cf-orange/20 rounded text-xs font-medium transition cursor-pointer disabled:opacity-50">
										{printingNisn === row.nisn ? '...' : 'Cetak'}
									</button>
									<form method="POST" action="?/delete" style="display:inline"
										onsubmit={(e) => { if (!confirm('Yakin ingin menghapus siswa ini?')) e.preventDefault(); }}>
										<input type="hidden" name="nisn" value={row.nisn}>
										<button type="submit"
											class="px-2.5 py-1 bg-red-50 text-cf-danger hover:bg-red-100 rounded text-xs font-medium transition cursor-pointer">Hapus</button>
									</form>
								</div>
							</td>
						</tr>
					{/each}
					{#if data.students.length === 0}
						<tr>
							<td colspan="8" class="text-center text-cf-muted py-12">Tidak ada siswa ditemukan</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>

		{#if data.totalPages > 1}
			<div class="flex items-center justify-center gap-1.5 p-4 border-t border-cf-border">
				<button disabled={data.page <= 1} onclick={() => goPage(data.page - 1)}
					class="px-3 py-1.5 text-sm border border-cf-border rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-default transition cursor-pointer">
					‹ Prev
				</button>
				{#each Array.from({ length: Math.min(data.totalPages, 9) }, (_, i) => {
					const start = Math.max(1, Math.min(data.page - 4, data.totalPages - 8));
					return start + i;
				}) as p}
					<button onclick={() => goPage(p)}
						class="px-3 py-1.5 text-sm border border-cf-border rounded-lg hover:bg-gray-50 transition cursor-pointer {p === data.page ? 'bg-cf-orange text-white border-cf-orange hover:bg-cf-orange-hover' : ''}">
						{p}
					</button>
				{/each}
				<button disabled={data.page >= data.totalPages} onclick={() => goPage(data.page + 1)}
					class="px-3 py-1.5 text-sm border border-cf-border rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-default transition cursor-pointer">
					Next ›
				</button>
				<span class="text-xs text-cf-muted ml-2">Halaman {data.page} dari {data.totalPages}</span>
			</div>
		{/if}
	</div>
</div>
