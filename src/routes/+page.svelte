<script lang="ts">
    import { enhance } from '$app/forms';
    let { data, form } = $props();

    let pengaturan = $derived(data.pengaturan);
    let logo_path = $derived(pengaturan?.has_logo ? '/pengaturan/gambar/logo' : null);

    let submitting = $state(false);

    function handleLogin() {
        submitting = true;
        return async ({ result, update }: { result: any; update: () => void }) => {
            update();
            submitting = false;
        };
    }
</script>

<style>
    :root {
        --primary: #003366;
        --light: #f9f9f9;
        --danger: #cc0000;
    }

    * {
        box-sizing: border-box;
    }

    .container-body {
        font-family: Arial, sans-serif;
        background-color: var(--light);
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        min-height: 100vh;
    }

    header {
        background-color: var(--primary);
        color: white;
        padding: 1.5rem;
        text-align: center;
    }

    main {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 2rem;
    }

    .login-container {
        background-color: white;
        padding: 2rem;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        width: 100%;
        max-width: 400px;
        text-align: center;
    }

    .logo {
        max-width: 100px;
        margin-bottom: 1rem;
    }

    h2 {
        margin-top: 0.5rem;
        color: var(--primary);
    }

    form {
        display: flex;
        flex-direction: column;
    }

    input[type="text"],
    input[type="password"] {
        padding: 0.75rem;
        margin-bottom: 1rem;
        border: 1px solid #ccc;
        border-radius: 6px;
        font-size: 1rem;
    }

    button {
        padding: 0.75rem;
        background-color: var(--primary);
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }

    button:hover {
        background-color: #002244;
    }

    button:disabled {
        background-color: #668099;
        cursor: not-allowed;
    }

    .spinner {
        width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3);
        border-top: 2px solid #fff; border-radius: 50%; animation: spin 0.6s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .error {
        color: var(--danger);
        text-align: center;
        margin-bottom: 1rem;
    }

    .note {
        text-align: center;
        font-size: 0.9rem;
        color: #555;
        margin-top: 1rem;
    }

    footer {
        background-color: #111;
        color: #ccc;
        text-align: center;
        padding: 1rem;
        font-size: 0.85rem;
    }

    footer a {
        color: #00c3ff;
        text-decoration: none;
    }

    footer a:hover {
        text-decoration: underline;
    }

    @media (max-width: 600px) {
        .login-container {
            padding: 1.5rem;
        }
        header {
            font-size: 1.2rem;
        }
    }
</style>

<div class="container-body">
    <header>
        <h1>Aplikasi Kartu Pelajar</h1>
    </header>

    <main>
        <div class="login-container">
            {#if logo_path}
                <img src={logo_path} alt="Logo Sekolah" class="logo">
            {/if}
            <h2>Login</h2>
            {#if form?.message}
                <p class="error">{form.message}</p>
            {/if}
            <form method="POST" action="?/login" use:enhance={handleLogin}>
                <input type="text" name="username" placeholder="Username" required>
                <input type="password" name="password" placeholder="Password" required>
                <button type="submit" disabled={submitting}>
                    {#if submitting}
                        <span class="spinner"></span>
                        Masuk...
                    {:else}
                        Login
                    {/if}
                </button>
            </form>
            <p class="note"><em>Aplikasi SvelteKit Version</em></p>
            <p class="note"><em>Siswa dapat melakukan perbaikan data dan upload foto login username: NISN, pasword: NISN</em></p>
        </div>
    </main>

    <footer>
        &copy; 2025 - Gembong <a href="https://www.youtube.com/@nirsinggih" target="_blank">gembong</a><br>
        Converted to SvelteKit.
    </footer>
</div>
