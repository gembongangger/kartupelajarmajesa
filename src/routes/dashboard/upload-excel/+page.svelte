<script lang="ts">
	import { enhance } from '$app/forms';
	let { form } = $props();

	let submitting = $state(false);
	let notify: { type: 'success' | 'error'; message: string } | null = $state(null);

	function handleSubmit() {
		submitting = true;
		return async ({ result, update }: { result: any; update: () => void }) => {
			update();
			submitting = false;
			if (result.type === 'success' && result.data) {
				const d = result.data;
				if (d.message) {
					notify = { type: 'error', message: d.message };
				} else {
					notify = { type: 'success', message: `✅ ${d.success} berhasil, ❌ ${d.failed} gagal` };
				}
			} else if (result.type === 'failure' && result.data?.message) {
				notify = { type: 'error', message: result.data.message };
			}
			setTimeout(() => { notify = null; }, 5000);
		};
	}
</script>

<div class="max-w-xl mx-auto">
	<a href="/dashboard" class="inline-flex items-center gap-1 text-sm text-cf-blue hover:text-cf-blue-hover mb-4">
		← Kembali ke Dashboard
	</a>

	<h1 class="text-2xl font-bold text-cf-text mb-6">Upload Excel Siswa</h1>

	<div class="bg-white rounded-xl border border-cf-border p-6">
		{#if form}
			{#if form.message}
				<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-cf-danger">
					<p class="font-medium mb-1">Upload Dibatalkan:</p>
					<p style="white-space: pre-wrap">{form.message}</p>
				</div>
			{:else}
				<div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-cf-blue">
					<strong>Hasil Upload:</strong><br>
					✅ Berhasil: {form.success} | ❌ Gagal: {form.failed}
				</div>
				{#if form.errorDetails && form.errorDetails.length > 0}
					<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-cf-danger">
						<h4 class="font-medium mb-1">Detail Kesalahan:</h4>
						<ul class="list-disc pl-4 space-y-0.5">
							{#each form.errorDetails as err}
								<li>{err}</li>
							{/each}
						</ul>
					</div>
				{/if}
			{/if}
		{/if}

		<form method="POST" enctype="multipart/form-data" use:enhance={handleSubmit}>
			<a href="/format_data_siswa.xls" class="inline-flex items-center gap-1 text-sm text-cf-blue hover:text-cf-blue-hover mb-4" download>
				⬇️ Download Template Excel (.xls)
			</a>

			<div class="border-2 border-dashed border-cf-border rounded-lg p-8 text-center hover:border-cf-orange/50 transition cursor-pointer mb-4">
				<input type="file" name="file" accept=".xls, .xlsx" required class="w-full text-sm text-cf-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-cf-orange/10 file:text-cf-orange hover:file:bg-cf-orange/20">
			</div>

			<button type="submit" disabled={submitting}
				class="w-full py-2.5 bg-cf-orange hover:bg-cf-orange-hover disabled:bg-cf-orange/60 text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2 cursor-pointer"
			>
				{#if submitting}
					<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
					</svg>
					Memproses...
				{:else}
					Proses Upload
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
