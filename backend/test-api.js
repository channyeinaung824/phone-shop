
async function testApi() {
    const baseUrl = 'http://localhost:3001';
    let token = '';

    console.log('--- Testing Auth ---');

    // 1. Login
    try {
        const loginRes = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@phoneshop.com', password: 'password123' }),
        });

        if (loginRes.ok) {
            const data = await loginRes.json();
            token = data.token;
            console.log('✅ Login successful', data.user.email);
        } else {
            console.error('❌ Login failed', await loginRes.text());
            return;
        }
    } catch (e) {
        console.error('❌ Login error', e);
        return;
    }

    // 2. Get Me
    try {
        const meRes = await fetch(`${baseUrl}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (meRes.ok) {
            console.log('✅ Get Me successful', (await meRes.json()).user.name);
        } else {
            console.error('❌ Get Me failed', await meRes.text());
        }
    } catch (e) { console.error('Error', e); }

    // 3. Get Users (Admin only)
    try {
        const usersRes = await fetch(`${baseUrl}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (usersRes.ok) {
            const users = await usersRes.json();
            console.log(`✅ Get Users successful. Found ${users.length} users.`);
        } else {
            console.error('❌ Get Users failed', await usersRes.text());
        }
    } catch (e) { console.error('Error', e); }
}

testApi();
