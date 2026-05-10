<script lang="ts">
    import { enhance } from '$app/forms';
    let { data } = $props();
    let student = $derived(data.student);

    let submitting = $state(false);

    function handleSubmit() {
        submitting = true;
        return async ({ result }: { result: any }) => {
            submitting = false;
        };
    }
</script>

<style>
    .edit-body { font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: auto; }
    label { display: block; margin-top: 15px; font-weight: bold; }
    input, select { width: 100%; padding: 10px; margin-top: 5px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
    button {
        margin-top: 20px; background-color: #28a745; color: #fff; border: none; padding: 10px 16px;
        border-radius: 4px; cursor: pointer; width: 100%; font-weight: bold;
        display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    button:hover { background-color: #218838; }
    button:disabled { background-color: #94d3a2; cursor: not-allowed; }

    .spinner {
        width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3);
        border-top: 2px solid #fff; border-radius: 50%; animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .back-link { display: block; text-align: center; margin-top: 20px; color: #007bff; text-decoration: none; }
</style>

<div class="edit-body">
    <h2>Edit Data Siswa</h2>
    <form method="POST" use:enhance={handleSubmit}>
        <label for="nama">Nama Lengkap</label>
        <input type="text" name="nama" id="nama" value={student.nama} required>

        <label for="nis">NIS</label>
        <input type="text" name="nis" id="nis" value={student.nis} required>

        <label for="kelas">Kelas</label>
        <select name="kelas" id="kelas" value={student.kelas} required>
            <option value="">-- Pilih Kelas --</option>
            {#each data.kelas as k}
                <option value={k.nama}>{k.nama}</option>
            {/each}
        </select>

        <label for="jk">Jenis Kelamin</label>
        <select name="jk" id="jk" value={student.jenis_kelamin} required>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
        </select>

        <label for="tempat">Tempat Lahir</label>
        <input type="text" name="tempat" id="tempat" value={student.tempat_lahir}>

        <label for="tgl">Tanggal Lahir</label>
        <input type="date" name="tgl" id="tgl" value={student.tanggal_lahir}>

        <button type="submit" disabled={submitting}>
            {#if submitting}
                <span class="spinner"></span>
                Menyimpan...
            {:else}
                Simpan Perubahan
            {/if}
        </button>
    </form>
    <a href="/dashboard/siswa" class="back-link">← Kembali ke Daftar Siswa</a>
</div>
