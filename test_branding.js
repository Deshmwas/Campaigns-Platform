async function testBranding() {
    try {
        const res = await fetch('http://localhost:5000/api/organization/branding');
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Response:', data);
    } catch (e) {
        console.error('Error:', e);
    }
}

testBranding();
