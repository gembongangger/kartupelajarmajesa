<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let pengaturan = $derived(data.pengaturan);

	let submitting = $state(false);

	function handleLogin() {
		submitting = true;
		return async ({ result, update }: { result: any; update: () => void }) => {
			update();
			submitting = false;
		};
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-cf-dark via-cf-dark to-gray-900 flex items-center justify-center p-4">
	<div class="w-full max-w-sm">
		<div class="bg-white rounded-2xl shadow-2xl p-8">
			<div class="text-center mb-8">
				<img src="/assets/logo/logo.webp" alt="Logo Sekolah" class="w-20 h-20 mx-auto mb-4 object-contain">
				<h1 class="text-xl font-bold text-cf-text">Kartu Pelajar</h1>
				<p class="text-sm text-cf-muted mt-1">Masuk ke akun Anda</p>
			</div>

			{#if form?.message}
				<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-cf-danger text-center">
					{form.message}
				</div>
			{/if}

			<form method="POST" action="?/login" use:enhance={handleLogin} class="space-y-4">
				<div>
					<label for="username" class="block text-sm font-medium text-cf-text mb-1.5">Username</label>
					<input
						type="text" name="username" id="username" required placeholder="Masukkan username"
						class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text placeholder-cf-muted focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition"
					>
				</div>
				<div>
					<label for="password" class="block text-sm font-medium text-cf-text mb-1.5">Password</label>
					<input
						type="password" name="password" id="password" required placeholder="Masukkan password"
						class="w-full px-3 py-2.5 border border-cf-border rounded-lg text-sm text-cf-text placeholder-cf-muted focus:outline-none focus:ring-2 focus:ring-cf-orange focus:border-cf-orange transition"
					>
				</div>
				<button
					type="submit" disabled={submitting}
					class="w-full py-2.5 bg-cf-orange hover:bg-cf-orange-hover disabled:bg-cf-orange/60 text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2 cursor-pointer"
				>
					{#if submitting}
						<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
						</svg>
						Masuk...
					{:else}
						Login
					{/if}
				</button>
			</form>

			<div class="mt-6 text-center">
				<p class="text-xs text-cf-muted">Aplikasi SvelteKit Version</p>
				<p class="text-xs text-cf-muted mt-1">Siswa login: NISN / NISN</p>
			</div>
		</div>

		<div class="text-center mt-6 text-xs text-white/60">
			&copy; 2025 - Gembong
		</div>
	</div>
</div>
