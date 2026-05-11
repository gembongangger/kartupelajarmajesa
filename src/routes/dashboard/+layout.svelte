<script lang="ts">
	import { page } from '$app/stores';
	import { GraduationCap, LayoutDashboard, FileSpreadsheet, Camera, Settings, Printer, Users, LogOut } from 'lucide-svelte';

	let { children } = $props();

	let sidebarOpen = $state(false);

	const nav = [
		{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/dashboard/upload-excel', label: 'Upload Excel', icon: FileSpreadsheet },
		{ href: '/dashboard/upload-foto', label: 'Upload Foto', icon: Camera },
		{ href: '/dashboard/pengaturan', label: 'Pengaturan', icon: Settings },
		{ href: '/dashboard/pilih-kelas', label: 'Cetak Per Kelas', icon: Printer },
		{ href: '/dashboard/siswa', label: 'Daftar Siswa', icon: Users },
	];

	let activePath = $derived($page.url.pathname);
</script>

<div class="flex min-h-screen bg-cf-gray font-['Inter',sans-serif]">
	<!-- Mobile overlay -->
	{#if sidebarOpen}
		<div
			class="fixed inset-0 z-40 bg-black/50 lg:hidden"
			onclick={() => sidebarOpen = false}
			onkeydown={(e) => e.key === 'Escape' && (sidebarOpen = false)}
			role="button"
			tabindex="0"
			aria-label="Close sidebar"
		></div>
	{/if}

	<!-- Sidebar -->
	<aside
		class="fixed inset-y-0 left-0 z-50 w-64 bg-cf-sidebar-bg border-r border-cf-border transform transition duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto flex flex-col {sidebarOpen ? 'translate-x-0' : '-translate-x-full'}"
	>
		<div class="flex items-center gap-3 px-5 h-16 border-b border-cf-border shrink-0">
			<GraduationCap class="text-cf-orange shrink-0" size={26} />
			<span class="font-semibold text-cf-text text-lg">Kartu Pelajar</span>
		</div>

		<nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1">
			{#each nav as item}
				<a
					href={item.href}
					class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-cf-sidebar-hover hover:text-cf-text transition-colors {activePath === item.href ? 'bg-cf-sidebar-active/10 text-cf-orange' : 'text-cf-sidebar-text'}"
				>
					<item.icon class="shrink-0" size={20} />
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="px-3 pb-4 shrink-0 border-t border-cf-border pt-4">
			<a
				href="/logout"
				class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-cf-sidebar-text hover:bg-cf-sidebar-hover hover:text-cf-text transition-colors"
			>
				<LogOut class="shrink-0" size={20} />
				Logout
			</a>
		</div>
	</aside>

	<!-- Main content -->
	<div class="flex-1 flex flex-col min-w-0">
		<!-- Top bar (mobile) -->
		<header class="lg:hidden bg-white border-b border-cf-border px-4 h-14 flex items-center gap-3 shrink-0">
			<button
				onclick={() => sidebarOpen = true}
				class="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-cf-text"
				aria-label="Open sidebar"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			</button>
			<span class="font-semibold text-cf-text">Kartu Pelajar</span>
		</header>

		<main class="flex-1 p-4 md:p-6 lg:p-8">
			{@render children()}
		</main>
	</div>
</div>
