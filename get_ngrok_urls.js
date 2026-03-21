
const http = require('http');

http.get('http://localhost:4040/api/tunnels', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const tunnels = JSON.parse(data).tunnels;
            tunnels.forEach(t => {
                console.log(`${t.name}: ${t.public_url}`);
            });
        } catch (e) {
            console.error('Error parsing JSON:', e);
        }
    });
}).on('error', (err) => {
    console.error('Error connecting to ngrok:', err.message);
});
