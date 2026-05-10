<script lang="ts">
    import { enhance } from '$app/forms';
    let { data, form } = $props();
    let pengaturan = $derived(data.pengaturan);

    let logoPreviewOverride = $state('');
    let ttdPreviewOverride = $state('');
    let bgPreviewOverride = $state('');
    let bg2PreviewOverride = $state('');

    let logoPreview = $derived(logoPreviewOverride || (pengaturan.has_logo ? '/pengaturan/gambar/logo' : ''));
    let ttdPreview = $derived(ttdPreviewOverride || (pengaturan.has_tanda_tangan ? '/pengaturan/gambar/tanda_tangan' : ''));
    let bgPreview = $derived(bgPreviewOverride || (pengaturan.has_background ? '/pengaturan/gambar/background' : ''));
    let bg2Preview = $derived(bg2PreviewOverride || (pengaturan.has_background_belakang ? '/pengaturan/gambar/background_belakang' : ''));

    let submitting = $state(false);
    let notify: { type: 'success' | 'error'; message: string } | null = $state(null);

    function handlePreview(event: Event, type: string) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                if (type === 'logo') logoPreviewOverride = result;
                if (type === 'ttd') ttdPreviewOverride = result;
                if (type === 'bg') bgPreviewOverride = result;
                if (type === 'bg2') bg2PreviewOverride = result;
            };
            reader.readAsDataURL(file);
        }
    }

    let kelasText = $state('');
    let submittingKelas = $state(false);

    $effect(() => {
        if (data.kelas) {
            kelasText = data.kelas.map((k: any) => k.nama).join('\n');
        }
    });

    function handleSubmit() {
        submitting = true;

        return async ({ result, update }: { result: any; update: () => void }) => {
            update();
            submitting = false;
            if (result.type === 'success' && result.data?.success) {
                notify = { type: 'success', message: 'Pengaturan berhasil disimpan' };
            } else if (result.type === 'failure' && result.data?.message) {
                notify = { type: 'error', message: result.data.message };
            } else {
                notify = { type: 'error', message: 'Gagal menyimpan pengaturan' };
            }

            setTimeout(() => { notify = null; }, 4000);
        };
    }

    function handleSubmitKelas() {
        submittingKelas = true;
        return async ({ result, update }: { result: any; update: () => void }) => {
            update();
            submittingKelas = false;
            if (result.type === 'success' && result.data?.success) {
                notify = { type: 'success', message: 'Kelas berhasil disimpan' };
            } else if (result.type === 'failure' && result.data?.message) {
                notify = { type: 'error', message: result.data.message };
            } else {
                notify = { type: 'error', message: 'Gagal menyimpan kelas' };
            }
            setTimeout(() => { notify = null; }, 4000);
        };
    }
</script>

<style>
    .settings-body {
        background-color: #f0f2f5;
        color: #1c1e21;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        margin: 0;
        padding: 20px;
        min-height: 100vh;
    }

    h2 { text-align: center; color: #145DA0; }

    form {
        max-width: 600px;
        margin: 20px auto;
        background-color: #ffffff;
        padding: 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }

    p { margin-bottom: 15px; }

    label { font-weight: bold; display: block; margin-bottom: 5px; }

    input[type="text"],
    input[type="date"],
    input[type="password"],
    textarea,
    input[type="file"] {
        width: 100%;
        padding: 10px;
        border: 1px solid #ccd0d5;
        border-radius: 6px;
        background-color: #fff;
        box-sizing: border-box;
    }

    img.preview {
        margin-top: 10px;
        max-width: 100%;
        height: auto;
        border: 1px solid #ccc;
        border-radius: 4px;
    }

    button {
        background-color: #145DA0;
        color: #fff;
        border: none;
        padding: 12px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
        width: 100%;
        margin-top: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }

    button:hover { background-color: #004c81; }
    button:disabled { background-color: #7fa8c9; cursor: not-allowed; }

    .spinner {
        width: 18px;
        height: 18px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top: 2px solid #fff;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .notif-container {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 999;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .notif {
        padding: 14px 28px;
        border-radius: 8px;
        font-size: 15px;
        font-weight: 500;
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        pointer-events: auto;
        animation: fadeInUp 0.25s ease-out;
    }

    .notif.success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .notif.error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }

    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .back-link {
        display: block;
        text-align: center;
        margin-top: 20px;
        color: #145DA0;
        text-decoration: none;
    }

    .back-link:hover { text-decoration: underline; }

    .error { color: #dc3545; text-align: center; margin-bottom: 1rem; }
</style>

<div class="settings-body">
    <h2>Pengaturan Sekolah</h2>

    <form method="POST" action="?/simpan" enctype="multipart/form-data" use:enhance={handleSubmit}>
        <p>
            <label for="nama_sekolah">Nama Sekolah:</label>
            <input type="text" name="nama_sekolah" id="nama_sekolah" value={pengaturan.nama_sekolah} required>
        </p>
        <p>
            <label for="alamat">Alamat:</label>
            <textarea name="alamat" id="alamat" rows="3" required>{pengaturan.alamat}</textarea>
        </p>
        <p>
            <label for="kota_ttd">Kota Tanda Tangan:</label>
            <input type="text" name="kota_ttd" id="kota_ttd" value={pengaturan.kota_ttd}>
        </p>
        <p>
            <label for="tata_tertib">Tata Tertib / Keterangan Kartu:</label>
            <textarea name="tata_tertib" id="tata_tertib" rows="4">{pengaturan.tata_tertib}</textarea>
        </p>
        <p>
            <label for="kepala_sekolah">Kepala Sekolah:</label>
            <input type="text" name="kepala_sekolah" id="kepala_sekolah" value={pengaturan.kepala_sekolah} required>
        </p>
        <p>
            <label for="nip_kepala_sekolah">NIP Kepala Sekolah:</label>
            <input type="text" name="nip_kepala_sekolah" id="nip_kepala_sekolah" value={pengaturan.nip_kepala_sekolah} required>
        </p>
        <p>
            <label for="tanggal_ttd">Tanggal TTD:</label>
            <input type="date" name="tanggal_ttd" id="tanggal_ttd" value={pengaturan.tanggal_ttd} required>
        </p>
        <p>
            <label for="logo">Logo (.png):</label>
            <input type="file" name="logo" id="logo" accept=".png" onchange={(e) => handlePreview(e, 'logo')}>
            {#if logoPreview}
                <img src={logoPreview} alt="Logo" class="preview">
            {/if}
        </p>
        <p>
            <label for="tanda_tangan">Tanda Tangan Kepala Sekolah:</label>
            <input type="file" name="tanda_tangan" id="tanda_tangan" onchange={(e) => handlePreview(e, 'ttd')}>
            {#if ttdPreview}
                <img src={ttdPreview} alt="Tanda Tangan" class="preview">
            {/if}
        </p>
        <p>
            <label for="background">Background Kartu:</label>
            <input type="file" name="background" id="background" onchange={(e) => handlePreview(e, 'bg')}>
            {#if bgPreview}
                <img src={bgPreview} alt="Background" class="preview">
            {/if}
        </p>
        <p>
            <label for="background_belakang">Background Kartu Belakang:</label>
            <input type="file" name="background_belakang" id="background_belakang" onchange={(e) => handlePreview(e, 'bg2')}>
            {#if bg2Preview}
                <img src={bg2Preview} alt="Background Belakang" class="preview">
            {/if}
        </p>

        <hr>
        <h3>Ubah Password Admin</h3>
        <p>
            <label for="password_lama">Password Lama:</label>
            <input type="password" name="password_lama" id="password_lama">
        </p>
        <p>
            <label for="password_baru">Password Baru:</label>
            <input type="password" name="password_baru" id="password_baru">
        </p>
        <p>
            <label for="konfirmasi_password">Konfirmasi Password Baru:</label>
            <input type="password" name="konfirmasi_password" id="konfirmasi_password">
        </p>

        <button type="submit" disabled={submitting}>
            {#if submitting}
                <span class="spinner"></span>
                Menyimpan...
            {:else}
                Simpan Pengaturan
            {/if}
        </button>
    </form>
    <hr style="margin-top: 30px;">
    <h3>Data Kelas</h3>
    <form method="POST" action="?/simpan_kelas" use:enhance={handleSubmitKelas}>
        <p>
            <label for="kelas">Daftar Kelas (satu baris per kelas):</label>
            <textarea name="kelas" id="kelas" rows="6" bind:value={kelasText}></textarea>
        </p>
        <button type="submit" disabled={submittingKelas}>
            {#if submittingKelas}
                <span class="spinner"></span>
                Menyimpan...
            {:else}
                Simpan Kelas
            {/if}
        </button>
    </form>
    <a href="/dashboard" class="back-link">← Kembali ke Dashboard</a>
</div>

<div class="notif-container">
    {#if notify}
        <div class="notif {notify.type}">{notify.message}</div>
    {/if}
</div>
