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

<style>
    .pilih-body {
        font-family: Arial, sans-serif;
        background: #f2f2f2;
        padding: 20px;
        margin: 0;
        min-height: 100vh;
    }

    .container {
        max-width: 480px;
        margin: auto;
        background: #fff;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 0 8px rgba(0,0,0,0.1);
    }

    h2 { text-align: center; color: #333; }

    label { display: block; margin-bottom: 8px; font-weight: bold; }

    select {
        width: 100%;
        padding: 10px;
        border-radius: 5px;
        border: 1px solid #ccc;
    }

    button {
        width: 100%;
        padding: 12px;
        margin-top: 20px;
        background-color: #2d4373;
        color: white;
        border: none;
        border-radius: 5px;
        font-size: 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }

    button:hover { background-color: #1d2d50; }
    button:disabled { background-color: #7f8eb0; cursor: not-allowed; }

    .spinner {
        width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3);
        border-top: 2px solid #fff; border-radius: 50%; animation: spin 0.6s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .back-link {
        display: block;
        text-align: center;
        margin-top: 20px;
        text-decoration: none;
        color: #2d4373;
        font-weight: bold;
    }

    .back-link:hover { text-decoration: underline; }

    @media (max-width: 600px) {
        .container { padding: 15px; }
    }
</style>

<div class="pilih-body">
    <div class="container">
        <h2>Cetak Kartu Pelajar</h2>

        <form onsubmit={handlePrint}>
            <label for="kelas">Pilih Kelas:</label>
            <select bind:value={selectedKelas} id="kelas" required>
                <option value="">-- Pilih Kelas --</option>
                {#each data.classes as k}
                    <option value={k.kelas}>{k.kelas}</option>
                {/each}
            </select>

            <button type="submit" disabled={submitting || !selectedKelas}>
                {#if submitting}
                    <span class="spinner"></span>
                    Menyiapkan Kartu...
                {:else}
                    Cetak Kartu
                {/if}
            </button>
        </form>

        <a href="/dashboard" class="back-link">← Kembali ke Dashboard</a>
    </div>
</div>
