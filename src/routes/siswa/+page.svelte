<script lang="ts">
    import { enhance } from '$app/forms';
    import { replaceBackground, supportsMediaPipe } from '$lib/client/processPhoto';
    let { data } = $props();
    let siswa = $derived(data.siswa);

    let submitting1 = $state(false);
    let submitting2 = $state(false);
    let modelLoad = $state(false);
    let notify: { type: 'success' | 'error'; message: string } | null = $state(null);

    function handleUpdate() {
        submitting1 = true;
        return async ({ result }: { result: any }) => {
            submitting1 = false;
            if (result.type === 'success' && result.data?.success) {
                notify = { type: 'success', message: 'Data berhasil disimpan' };
            } else if (result.type === 'failure') {
                notify = { type: 'error', message: result.data?.message || 'Gagal menyimpan' };
            } else {
                notify = { type: 'error', message: 'Gagal menyimpan data' };
            }
            setTimeout(() => { notify = null; }, 4000);
        };
    }

    async function handleUpload({ formData }: { formElement: HTMLFormElement; formData: FormData }) {
        const file = formData.get('foto') as File;
        if (!file || file.size === 0) return;

        if (!supportsMediaPipe()) {
            notify = { type: 'error', message: 'Browser tidak mendukung fitur ini' };
            setTimeout(() => { notify = null; }, 4000);
            return;
        }

        submitting2 = true;
        modelLoad = true;

        try {
            const processed = await replaceBackground(file, '#FF0000');
            modelLoad = false;
            formData.set('foto', processed, file.name);
        } catch (e: any) {
            notify = { type: 'error', message: 'Gagal proses foto: ' + (e.message || '') };
            setTimeout(() => { notify = null; }, 4000);
            submitting2 = false;
            return;
        }

        return async ({ result }: { result: any }) => {
            submitting2 = false;
            if (result.type === 'success' && result.data?.success) {
                notify = { type: 'success', message: 'Foto berhasil diupload dengan background merah' };
            } else if (result.type === 'failure') {
                notify = { type: 'error', message: result.data?.message || 'Gagal upload foto' };
            } else {
                notify = { type: 'error', message: 'Gagal upload foto' };
            }
            setTimeout(() => { notify = null; }, 4000);
        };
    }
</script>

<style>
    .siswa-body {
        font-family: 'Segoe UI', sans-serif;
        background-color: #f9f9f9;
        color: #000000;
        padding: 20px;
        margin: 0;
        min-height: 100vh;
    }

    h2, h3 {
        color: #003366;
        margin-bottom: 10px;
    }

    form {
        margin-bottom: 30px;
        max-width: 500px;
    }

    label {
        display: block;
        margin-top: 15px;
        font-weight: bold;
    }

    input[type="text"],
    input[type="date"],
    select,
    input[type="file"] {
        padding: 10px;
        width: 100%;
        max-width: 100%;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-sizing: border-box;
    }

    button {
        margin-top: 20px;
        background-color: #1877f2;
        color: #fff;
        border: none;
        padding: 10px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        transition: background-color 0.3s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }

    button:hover {
        background-color: #145dbf;
    }

    button:disabled {
        background-color: #7fb3f0;
        cursor: not-allowed;
    }

    img {
        margin-top: 15px;
        border: 1px solid #ccc;
        border-radius: 5px;
        max-width: 150px;
        height: auto;
        display: block;
    }

    .logout-link {
        color: #1877f2;
        text-decoration: none;
        display: inline-block;
        margin-top: 20px;
    }

    .logout-link:hover {
        text-decoration: underline;
    }

    .spinner {
        width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3);
        border-top: 2px solid #fff; border-radius: 50%; animation: spin 0.6s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    @media screen and (max-width: 600px) {
        .siswa-body {
            padding: 15px;
        }
        button {
            width: 100%;
        }
    }

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

<div class="siswa-body">
    <h2>Profil Siswa</h2>

    <form method="POST" action="?/update" use:enhance={handleUpdate}>
        <label for="nama">Nama Lengkap</label>
        <input type="text" name="nama" id="nama" value={siswa.nama} required>

        <label for="jk">Jenis Kelamin</label>
        <select name="jk" id="jk" value={siswa.jenis_kelamin} required>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
        </select>

        <label for="tempat">Tempat Lahir</label>
        <input type="text" name="tempat" id="tempat" value={siswa.tempat_lahir}>

        <label for="tgl">Tanggal Lahir</label>
        <input type="date" name="tgl" id="tgl" value={siswa.tanggal_lahir}>

        <label for="kelas">Kelas</label>
        <select name="kelas" id="kelas" value={siswa.kelas} required>
            <option value="">-- Pilih Kelas --</option>
            {#each data.kelas as k}
                <option value={k.nama}>{k.nama}</option>
            {/each}
        </select>

        <button type="submit" disabled={submitting1}>
            {#if submitting1}
                <span class="spinner"></span>
                Menyimpan...
            {:else}
                Simpan Perubahan
            {/if}
        </button>
    </form>

    <h3>Foto Siswa</h3>
    {#if siswa.nisn}
        <img src="/foto/{siswa.nisn}.jpg?t={Date.now()}" alt="Foto Siswa">
    {/if}

    <form method="POST" action="?/upload_foto" enctype="multipart/form-data" use:enhance={handleUpload}>
        <label for="foto">Ganti Foto (JPG)</label>
        <input type="file" name="foto" id="foto" accept=".jpg" required>
        <button type="submit" disabled={submitting2}>
            {#if submitting2}
                <span class="spinner"></span>
                {modelLoad ? 'Muat model AI...' : 'Memproses foto...'}
            {:else}
                Upload Foto
            {/if}
        </button>
    </form>

    <form method="POST" action="/logout" use:enhance>
        <button type="submit" style="background-color: #c62828;">
            Logout
        </button>
    </form>
</div>

<div class="notif-container">
    {#if notify}
        <div class="notif {notify.type}">{notify.message}</div>
    {/if}
</div>
