<script lang="ts">
	import { browser } from '$app/environment';

	let { data } = $props();

	let submitting = $state(false);
	let selectedKelas = $state('');

	async function handlePrint(e: Event) {
		e.preventDefault();
		if (!selectedKelas || !browser) return;
		submitting = true;
		try {
			const res = await fetch(`/dashboard/cetak?kelas=${encodeURIComponent(selectedKelas)}`);
			if (!res.ok) throw new Error('Failed to fetch print data');
			const data = await res.json();
			const { printCards } = await import('$lib/client/printer');
			await printCards(data);
		} catch (err) {
			alert('Gagal mengambil data cetak');
			console.error(err);
		} finally {
			submitting = false;
		}
	}
</script>

<div class="max-w-lg mx-auto">
	<a href="/dashboard" class="inline-flex items-center gap-1 text-sm text-cf-blue hover:text-cf-blue-hover mb-4">
		← Kembali ke Dashboard
	</a>

	<h1 class="text-2xl font-bold text-cf-text mb-6">Cetak Kartu Per Kelas</h1>

	<div class="bg-white rounded-xl border border-cf-border p-6">
		<form onsubmit={handlePrint}>
			<label for="kelas" class="block text-sm font-medium text-cf-text mb-1.5">Pilih Kelas:</label>
			<select
				bind:value={selectedKelas} id="kelas" required
				class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition bg-white"
			>
				<option value="">-- Pilih Kelas --</option>
				{#each data.classes as k}
					<option value={k.kelas}>{k.kelas}</option>
				{/each}
			</select>

			<button type="submit" disabled={submitting || !selectedKelas}
				class="w-full mt-5 py-2.5 bg-cf-orange hover:bg-cf-orange-hover disabled:bg-cf-orange/60 text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2 cursor-pointer"
			>
				{#if submitting}
					<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
					</svg>
					Menyiapkan Kartu...
				{:else}
					Cetak Kartu
				{/if}
			</button>
		</form>
	</div>
</div>
