import assert from 'node:assert/strict';

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const STUDENT_USERNAME = process.env.STUDENT_USERNAME || '';
const STUDENT_PASSWORD = process.env.STUDENT_PASSWORD || STUDENT_USERNAME;
const TEST_NISN = process.env.TEST_NISN || STUDENT_USERNAME || '4900001';

const results = [];

function formData(values) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
        params.set(key, value);
    }
    return params;
}

function appendCookie(cookieJar, response) {
    const setCookie = response.headers.get('set-cookie');
    if (!setCookie) return cookieJar;

    const cookie = setCookie.split(';')[0];
    if (!cookie) return cookieJar;

    const [name] = cookie.split('=');
    const existing = cookieJar
        .split(';')
        .map((item) => item.trim())
        .filter((item) => item && !item.startsWith(`${name}=`));

    return [...existing, cookie].join('; ');
}

async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.cookie) headers.set('cookie', options.cookie);

    return fetch(`${BASE_URL}${path}`, {
        redirect: 'manual',
        ...options,
        headers
    });
}

async function test(name, fn) {
    try {
        await fn();
        results.push({ name, ok: true });
        console.log(`PASS ${name}`);
    } catch (error) {
        results.push({ name, ok: false, error });
        console.error(`FAIL ${name}`);
        console.error(error);
    }
}

async function login(username, password) {
    let cookie = '';
    const response = await request('/?/login', {
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded'
        },
        body: formData({ username, password })
    });

    cookie = appendCookie(cookie, response);
    const action = await response.json().catch(() => null);
    return { response, cookie, action };
}

await test('GET / returns login page for guest', async () => {
    const response = await request('/');
    assert.equal(response.status, 200);

    const html = await response.text();
    assert.match(html, /Login/i);
});

await test('GET /dashboard redirects guest to login', async () => {
    const response = await request('/dashboard');
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/');
});

let adminCookie = '';

await test('POST /?/login authenticates admin', async () => {
    const { response, cookie, action } = await login(ADMIN_USERNAME, ADMIN_PASSWORD);
    assert.equal(response.status, 200);
    assert.deepEqual(action, {
        type: 'redirect',
        status: 302,
        location: '/dashboard'
    });
    assert.match(cookie, /session=/);

    adminCookie = cookie;
});

await test('GET /dashboard allows authenticated admin', async () => {
    const response = await request('/dashboard', { cookie: adminCookie });
    assert.equal(response.status, 200);

    const html = await response.text();
    assert.match(html, /Dashboard/i);
});

await test('GET /dashboard/pengaturan allows authenticated admin', async () => {
    const response = await request('/dashboard/pengaturan', { cookie: adminCookie });
    assert.equal(response.status, 200);

    const html = await response.text();
    assert.match(html, /Pengaturan Sekolah/i);
});

await test('GET /pengaturan/gambar/logo returns image from SQLite', async () => {
    const response = await request('/pengaturan/gambar/logo');
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /^image\//);

    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.ok(bytes.length > 0);
});

await test('GET /pengaturan/gambar/background returns image from SQLite', async () => {
    const response = await request('/pengaturan/gambar/background');
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /^image\//);

    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.ok(bytes.length > 0);
});

await test('GET /foto/:nisn.jpg returns student/default image for existing student', async () => {
    const response = await request(`/foto/${encodeURIComponent(TEST_NISN)}.jpg`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /^image\/jpeg/);

    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.ok(bytes.length > 0);
});

await test('GET /dashboard/cetak requires admin session and returns PDF', async () => {
    const response = await request(`/dashboard/cetak?nisn=${encodeURIComponent(TEST_NISN)}`, {
        cookie: adminCookie
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /^application\/pdf/);

    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.ok(bytes.length > 0);
    assert.equal(String.fromCharCode(...bytes.slice(0, 4)), '%PDF');
});

if (STUDENT_USERNAME) {
    let studentCookie = '';

    await test('POST /?/login authenticates student', async () => {
        const { response, cookie, action } = await login(STUDENT_USERNAME, STUDENT_PASSWORD);
        assert.equal(response.status, 200);
        assert.deepEqual(action, {
            type: 'redirect',
            status: 302,
            location: '/siswa'
        });
        assert.match(cookie, /session=/);

        studentCookie = cookie;
    });

    await test('GET /siswa allows authenticated student', async () => {
        const response = await request('/siswa', { cookie: studentCookie });
        assert.equal(response.status, 200);

        const html = await response.text();
        assert.match(html, /Profil Siswa/i);
    });
} else {
    console.log('SKIP student login tests. Set STUDENT_USERNAME and STUDENT_PASSWORD to enable them.');
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} tests passed`);

if (failed.length > 0) {
    process.exitCode = 1;
}
