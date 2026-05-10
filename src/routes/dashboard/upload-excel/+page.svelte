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

<style>
    .upload-body { font-family: Arial, sans-serif; background-color: #182c47; color: #fff; margin: 0; padding: 20px; min-height: 100vh; }
    h2 { text-align: center; }
    .container { max-width: 600px; margin: 0 auto; }
    form { background-color: #243b5e; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.3); }
    input[type="file"] { width: 100%; padding: 10px; margin-top: 10px; background: #f0f0f0; border-radius: 5px; color: #000; box-sizing: border-box; }
    button {
        width: 100%; background-color: #4267B2; color: white; padding: 12px; border: none;
        margin-top: 10px; border-radius: 5px; cursor: pointer;
        display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    button:hover { background-color: #365899; }
    button:disabled { background-color: #8ba6d9; cursor: not-allowed; }

    .spinner {
        width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3);
        border-top: 2px solid #fff; border-radius: 50%; animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .info { background: #e7f3ff; color: #182c47; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .error-log { background: #ffeded; color: #b71c1c; padding: 15px; border-radius: 5px; margin-top: 20px; font-size: 14px; text-align: left; }
    .error-log h4 { margin-top: 0; border-bottom: 1px solid #b71c1c; padding-bottom: 5px; }
    .link { text-align: center; margin-top: 20px; }
    .link a { color: #fff; text-decoration: none; font-weight: bold; }
    .template-link { display: inline-block; margin-bottom: 15px; color: #00c3ff; text-decoration: none; font-size: 0.9rem; }
    .template-link:hover { text-decoration: underline; }

    .notif-container {
        position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
        z-index: 999; pointer-events: none; display: flex; flex-direction: column; align-items: center;
    }
    .notif {
        padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 500;
        box-shadow: 0 4px 16px rgba(0,0,0,0.15); pointer-events: auto; animation: fadeInUp 0.25s ease-out;
    }
    .notif.success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .notif.error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
</style>

<div class="upload-body">
    <div class="container">
        <h2>Upload Excel Siswa</h2>

        {#if form}
            {#if form.message}
                <div class="error-log">
                    <h4>Upload Dibatalkan:</h4>
                    <p style="white-space: pre-wrap">{form.message}</p>
                </div>
            {:else}
                <div class="info">
                    <strong>Hasil Upload:</strong><br>
                    ✅ Berhasil: {form.success} | ❌ Gagal: {form.failed}
                </div>

                {#if form.errorDetails && form.errorDetails.length > 0}
                    <div class="error-log">
                        <h4>Detail Kesalahan:</h4>
                        <ul>
                            {#each form.errorDetails as err}
                                <li>{err}</li>
                            {/each}
                        </ul>
                    </div>
                {/if}
            {/if}
        {/if}

        <form method="POST" enctype="multipart/form-data" use:enhance={handleSubmit}>
            <a href="/format_data_siswa.xls" class="template-link" download>⬇️ Download Template Excel (.xls)</a>
            <input type="file" name="file" accept=".xls, .xlsx" required>
            <button type="submit" disabled={submitting}>
                {#if submitting}
                    <span class="spinner"></span>
                    Memproses...
                {:else}
                    Proses Upload
                {/if}
            </button>
        </form>

        <div class="link">
            <p><a href="/dashboard">← Kembali ke Dashboard</a></p>
        </div>
    </div>

    <div class="notif-container">
        {#if notify}
            <div class="notif {notify.type}">{notify.message}</div>
        {/if}
    </div>
</div>
