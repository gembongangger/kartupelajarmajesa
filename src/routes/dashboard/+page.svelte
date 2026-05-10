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
</script>

<style>
    .dashboard-body {
        font-family: Arial, sans-serif;
        padding: 20px;
        margin: 0;
        background-color: #f4f4f4;
        min-height: 100vh;
    }
    h2 {
        text-align: center;
        color: #003366;
    }
    ul {
        list-style-type: none;
        padding: 0;
        margin: 20px auto;
        max-width: 400px;
    }
    li {
        margin-bottom: 15px;
    }

    a, button {
        display: block;
        width: 100%;
        color: white;
        padding: 12px;
        border-radius: 8px;
        text-decoration: none;
        text-align: center;
        transition: background-color 0.2s ease;
        border: none;
        font-size: 1rem;
        cursor: pointer;
        box-sizing: border-box;
    }

    .excel { background-color: #217346; }
    .excel:hover { background-color: #1e5e3e; }

    .powerpoint { background-color: #d24726; }
    .powerpoint:hover { background-color: #a7351c; }

    .word { background-color: #2b579a; }
    .word:hover { background-color: #1e3e73; }

    .canva { background-color: #00c4cc; }
    .canva:hover { background-color: #009aa1; }

    .danger { background-color: #c62828; }
    .danger:hover { background-color: #a32020; }
    .danger:disabled { background-color: #d88282; cursor: not-allowed; }

    .default { background-color: #003366; }
    .default:hover { background-color: #001f4d; }
    .default:disabled { background-color: #668099; cursor: not-allowed; }

    button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }

    .spinner {
        width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3);
        border-top: 2px solid #fff; border-radius: 50%; animation: spin 0.6s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 480px) {
        a, button {
            font-size: 16px;
            padding: 10px;
        }
    }
    .status { text-align: center; margin-bottom: 10px; font-weight: bold; }
</style>

<div class="dashboard-body">
    <h2>Selamat datang, {data.user.username}!</h2>
    {#if form?.success}
        <p class="status" style="color: green;">{form.message}</p>
    {/if}
    {#if form?.message && !form.success}
        <p class="status" style="color: red;">{form.message}</p>
    {/if}
    <ul>
        <li><a href="/dashboard/upload-excel" class="excel">Upload Data Siswa EXCEL (xls)</a></li>
        <li><a href="/dashboard/upload-foto" class="powerpoint">Upload Foto Siswa (Pilih)</a></li>
        <li><a href="/dashboard/pengaturan" class="word">Pengaturan Profil Sekolah</a></li>
        <li><a href="/dashboard/pilih-kelas" class="canva">Cetak Kartu Per Kelas</a></li>
        <li>
            <button type="button" class="default" onclick={handlePrintAll} disabled={printingAll}>
                {#if printingAll}
                    <span class="spinner"></span>
                    Menyiapkan Kartu...
                {:else}
                    Cetak Semua Kartu
                {/if}
            </button>
        </li>
        <li><a href="/dashboard/siswa" class="default">Daftar Nama Siswa</a></li>
        <li>
            <form method="POST" action="?/reset" use:enhance={handleReset}>
                <button type="submit" class="danger" disabled={submittingReset}>
                    {#if submittingReset}
                        <span class="spinner"></span>
                        Menghapus data...
                    {:else}
                        RESET DATABASE
                    {/if}
                </button>
            </form>
        </li>
        <li>
            <form method="POST" action="/logout" use:enhance={handleLogout}>
                <button type="submit" class="default" disabled={submittingLogout}>
                    {#if submittingLogout}
                        <span class="spinner"></span>
                        Logout...
                    {:else}
                        Logout
                    {/if}
                </button>
            </form>
        </li>
    </ul>
</div>
