async function testAuth() {
    try {
        const res = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test3@example.com',
                password: 'password123',
                firstName: 'Test',
                lastName: 'User',
                organizationName: 'Test Org'
            })
        });
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Response:', data);
    } catch (e) {
        console.error('Error:', e);
    }
}

testAuth();
