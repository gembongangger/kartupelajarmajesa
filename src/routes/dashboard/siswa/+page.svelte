<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	let { data } = $props();

	let search = $state(data.q || '');
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

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
</script>

<style>
	.list-body { font-family: Arial, sans-serif; padding: 20px; }
	table { border-collapse: collapse; width: 100%; margin-top: 10px; }
	th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
	th { background: #eee; }

	.search-bar {
		width: 100%; padding: 10px; font-size: 16px; border: 1px solid #ccc;
		border-radius: 6px; box-sizing: border-box; margin-bottom: 6px;
	}

	.search-info {
		margin: 4px 0; font-size: 14px; color: #666;
	}

	.button {
		display: inline-block; background: #007bff; color: #fff; padding: 5px 10px;
		text-decoration: none; border-radius: 3px; border: none; cursor: pointer; font-size: 0.9rem;
	}
	.button:hover { background: #0056b3; }
	.button-edit { background: #28a745; }
	.button-edit:hover { background: #1e7e34; }
	.button-delete { background: #dc3545; }
	.button-delete:hover { background: #b02a37; }

	.pagination {
		display: flex; align-items: center; justify-content: center; gap: 8px;
		margin-top: 16px; flex-wrap: wrap;
	}
	.pagination button {
		min-width: 36px; padding: 6px 12px; border: 1px solid #ccc; background: #fff;
		border-radius: 4px; cursor: pointer; font-size: 14px;
	}
	.pagination button:hover:not(:disabled) { background: #e9ecef; }
	.pagination button:disabled { opacity: 0.4; cursor: default; }
	.pagination button.active { background: #007bff; color: #fff; border-color: #007bff; }
	.pagination .info { font-size: 14px; color: #666; }

	.back-link { display: inline-block; margin-top: 20px; color: #007bff; text-decoration: none; }

	@media screen and (max-width: 600px) {
		table, thead, tbody, tr, th, td { display: block; }
		thead tr { position: absolute; top: -9999px; left: -9999px; }
		td { border: none; border-bottom: 1px solid #eee; padding: 6px 8px; }
		td::before { content: attr(data-label); font-weight: bold; display: inline-block; width: 100px; }
		tr { border: 1px solid #ccc; margin-bottom: 8px; border-radius: 4px; padding: 4px; }
	}
</style>

<div class="list-body">
	<h2>Daftar Siswa</h2>

	<input class="search-bar" type="text" placeholder="Cari nama, NISN, NIS, atau kelas..."
		value={search} oninput={onSearchInput}>

	<p class="search-info">
		Menampilkan {data.total} siswa
		{#if data.q}(hasil pencarian "{data.q}"){/if}
	</p>

	<table>
		<thead>
			<tr>
				<th>No</th>
				<th>NIS</th>
				<th>NISN</th>
				<th>Nama</th>
				<th>Kelas</th>
				<th>JK</th>
				<th>Tgl Lahir</th>
				<th>Aksi</th>
			</tr>
		</thead>
		<tbody>
			{#each data.students as row, i}
				<tr>
					<td data-label="No">{(data.page - 1) * data.perPage + i + 1}</td>
					<td data-label="NIS">{row.nis}</td>
					<td data-label="NISN">{row.nisn}</td>
					<td data-label="Nama">{row.nama}</td>
					<td data-label="Kelas">{row.kelas}</td>
					<td data-label="JK">{row.jenis_kelamin}</td>
					<td data-label="Tgl Lahir">{row.tanggal_lahir}</td>
					<td data-label="Aksi">
						<a class="button button-edit" href="/dashboard/siswa/edit/{row.nisn}">Edit</a>
						<a class="button" href="/dashboard/cetak?nisn={row.nisn}" target="_blank">Cetak</a>
						<form method="POST" action="?/delete" style="display:inline" use:enhance
							onsubmit={(e) => { if (!confirm('Yakin ingin menghapus siswa ini?')) e.preventDefault(); }}>
							<input type="hidden" name="nisn" value={row.nisn}>
							<button type="submit" class="button button-delete">Hapus</button>
						</form>
					</td>
				</tr>
			{/each}
			{#if data.students.length === 0}
				<tr><td colspan="8" style="text-align:center;color:#999;padding:24px;">Tidak ada siswa ditemukan</td></tr>
			{/if}
		</tbody>
	</table>

	<div class="pagination">
		<button disabled={data.page <= 1} onclick={() => goPage(data.page - 1)}>‹ Prev</button>
		{#each Array.from({ length: Math.min(data.totalPages, 9) }, (_, i) => {
			const start = Math.max(1, Math.min(data.page - 4, data.totalPages - 8));
			return start + i;
		}) as p}
			<button class:active={p === data.page} onclick={() => goPage(p)}>{p}</button>
		{/each}
		<button disabled={data.page >= data.totalPages} onclick={() => goPage(data.page + 1)}>Next ›</button>
		<span class="info">Halaman {data.page} dari {data.totalPages}</span>
	</div>

	<a href="/dashboard" class="back-link">← Kembali ke Dashboard</a>
</div>
