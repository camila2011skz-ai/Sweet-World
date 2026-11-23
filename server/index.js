import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { RoomManager } from './rooms.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = express();
app.disable('x-powered-by');
app.get('/health', (_req, res) => res.send('ok'));
app.use('/shared', express.static(path.join(root, 'shared')));                       // datos compartidos con el cliente
app.use('/vendor/three', express.static(path.join(root, 'node_modules/three/build'))); // Three.js servido localmente
app.use(express.static(path.join(root, 'public')));

const server = http.createServer(app);
const io = new Server(server, {
  ...(process.env.CORS_ORIGIN ? { cors: { origin: process.env.CORS_ORIGIN.split(',') } } : {}),
});
const rooms = new RoomManager(io);

io.on('connection', (socket) => {
  const ack = (cb, fn) => { const r = fn(); if (typeof cb === 'function') cb(r); };
  socket.on('sync', (cb) => typeof cb === 'function' && cb(Date.now()));
  socket.on('room:create', (d, cb) => ack(cb, () => rooms.create(socket, d)));
  socket.on('room:join', (d, cb) => ack(cb, () => rooms.join(socket, d)));
  socket.on('room:start', (_d, cb) => ack(cb, () => rooms.start(socket)));
  socket.on('room:again', () => rooms.again(socket));
  socket.on('room:leave', () => rooms.leave(socket));
  socket.on('player:state', (s) => rooms.state(socket, s));
  socket.on('player:collect', (id) => rooms.collect(socket, id));
  socket.on('player:finish', (pos, cb) => ack(cb, () => rooms.finish(socket, pos)));
  socket.on('disconnect', () => rooms.leave(socket));
});

const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => console.log(`Sweet Worlds listening on http://localhost:${port}`));
