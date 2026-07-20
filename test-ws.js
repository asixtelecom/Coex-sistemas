const WebSocket = require('ws');

const apikey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const url = `wss://coexsistemas.techvoz.com.br/realtime/v1/websocket?apikey=${apikey}&vsn=1.0.0`;

console.log('Connecting to', url);

const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('Successfully connected to WebSocket!');
  ws.close();
});

ws.on('error', (err) => {
  console.error('WebSocket Error:', err);
});

ws.on('close', (code, reason) => {
  console.log(`WebSocket closed: code=${code}, reason=${reason}`);
});
