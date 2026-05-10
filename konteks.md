# Konteks Proyek

## Cloudflare Pages - Kartu Pelajar

**URL:** https://kartupelajar-cloudflare.pages.dev

**Project Name:** kartupelajar-cloudflare
**Framework:** SvelteKit 5 + Vite 8
**Adapter:** @sveltejs/adapter-cloudflare
**Database:** Turso (libsql)

### Deploy via Wrangler CLI

```bash
# Build dulu
npm run build

# Deploy ke Cloudflare Pages
npx wrangler pages deploy .svelte-kit/cloudflare --project-name kartupelajar-cloudflare --branch main
```

### Wrangler Config (wrangler.toml)

```toml
name = "kartupelajar-cloudflare"
pages_build_output_dir = ".svelte-kit/cloudflare"
compatibility_date = "2024-04-03"
compatibility_flags = ["nodejs_compat"]
```

### Arsitektur Cetak (Client-Side PDF)

| Komponen | Lokasi | Keterangan |
|---|---|---|
| Server endpoint (JSON API) | `src/routes/dashboard/cetak/+server.ts` | Mengembalikan data siswa + base64 images |
| Client printer | `src/lib/client/printer.ts` | Generate PDF via jsPDF + bwip-js di browser |
| Halaman dashboard | `src/routes/dashboard/+page.svelte` | Tombol "Cetak Semua Kartu" |
| Cetak per kelas | `src/routes/dashboard/pilih-kelas/+page.svelte` | Filter by kelas |
| Cetak per siswa | `src/routes/dashboard/siswa/+page.svelte` | Tombol Cetak per baris |

### Penting

- **jspdf** dan **bwip-js** di-load via **dynamic import** agar tidak crash saat SSR di Cloudflare Workers
- Setiap halaman yang print menggunakan guard `browser` dari `$app/environment`
- PDF dibuat sepenuhnya di client browser, server hanya sebagai JSON API
- `nodejs_compat` flag diperlukan di wrangler.toml untuk Buffer

### Build Error History

1. **EUSAGE lock file** → package-lock.json tidak sinkron. Fix: `npm install --include=optional` + `@emnapi/core` dan `@emnapi/runtime` sebagai devDependencies
2. **Deploy command salah** → Dashboard Cloudflare Pages menggunakan `npx wrangler deploy` (Workers) bukan `npx wrangler pages deploy`. Fix: kosongkan deploy command di dashboard, pakai wrangler CLI manual

### Perbaikan Cetak PDF

- Hapus parameter format eksplisit dari `addImage()` (biarkan jspdf auto-detect dari data URL)
- Label rata kiri ke `labelX = x + 24`, titik dua di `colonX = labelX + 12`
- Tata tertib: normalisasi CRLF ke LF, `.` jadi bullet `•`
- Font size seragam (7) untuk semua label data siswa, NAMA tetap bold
