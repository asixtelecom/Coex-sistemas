const WebSocket = require('/www/wwwroot/coexsistemas.techvoz.com.br/node_modules/ws');

const apikey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const url = `wss://coexsistemas.techvoz.com.br/realtime/v1/websocket?apikey=${apikey}&vsn=1.0.0`;

console.log('Connecting to', url);

const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('Successfully connected to production WebSocket!');
  ws.close();
});

ws.on('error', (err) => {
  console.error('Production WebSocket Error:', err);
});

ws.on('close', (code, reason) => {
  console.log(`Production WebSocket closed: code=${code}, reason=${reason}`);
});
