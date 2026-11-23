# 🍭 Sweet Worlds

Plataformas 3D multijugador online (2–4 jugadores) con temática de dulces.
**Three.js** (gráficos) · **Node.js + Express + Socket.IO** (servidor y tiempo real).

## Ejecutar en local
```bash
npm install
npm start            # http://localhost:3000
```
- Abre dos pestañas (o un PC y un móvil en la misma Wi‑Fi: `http://IP-DE-TU-PC:3000`).
- Una persona pulsa **Jugar → Crear sala**; las demás **Unirme** con el código de 4 letras (o con el enlace `?sala=ABCD`).
- El anfitrión inicia la partida. Mínimo 2 jugadores; para probar solo: `MIN_PLAYERS=1 npm start`.
- Pruebas automáticas: `npm test`.

## Controles
| PC | Móvil |
|---|---|
| WASD / flechas: mover · Espacio: saltar · arrastrar ratón (o Q/E): cámara | Joystick izquierdo: mover · botón SALTAR · arrastrar en pantalla: cámara |

## Publicar en internet
Necesitas un host que mantenga un proceso Node con **WebSockets** (Netlify/Vercel estáticos no sirven).
**Render / Railway / Fly.io** (ejemplo Render): sube el proyecto a GitHub → *New Web Service* → Build: `npm install` → Start: `npm start`.
La variable `PORT` la define el host (ya se respeta). Se sirve por HTTPS automáticamente y el cliente se conecta al mismo dominio.
Para pruebas rápidas con amigos sin desplegar: `npx cloudflared tunnel --url http://localhost:3000` (o ngrok).
Si algún día sirves el cliente desde otro dominio, define `CORS_ORIGIN=https://tu-dominio`.

## Cómo funciona el multijugador
- Salas con código de 4 letras (`server/rooms.js`). Estados: `lobby → playing → results`.
- Cada cliente simula su propio personaje con la física compartida (`shared/physics.js`) y envía su posición 20 veces/s; el servidor la retransmite en *snapshots* y los demás la interpolan.
- Los obstáculos móviles dependen solo del **tiempo de servidor** (reloj sincronizado por ping), así que todos ven lo mismo sin enviar nada.
- El servidor valida: sala/anfitrión, nombres, caramelos únicos, y que la llegada a meta ocurra cerca de la meta. **No es anti‑trampas completo** (la posición la reporta el cliente).

## Estructura y cómo ampliar
```
shared/            datos y lógica usados por servidor y cliente
  characters.js        registro de personajes
  obstacles.js         tipos de obstáculos (pose + colisión)
  physics.js           movimiento y colisiones
  worlds/index.js      registro de mundos (sin límite)
  worlds/<mundo>/      index.js del mundo + un archivo por nivel
server/            Express + Socket.IO (index.js) y lógica de salas (rooms.js)
public/            cliente: index.html, css/, js/ (main, ui, net) y js/game/ (escena 3D)
test/              pruebas de física, constructores 3D y servidor
```
- **Nuevo nivel**: copia `camino-de-caramelos.js`, cambia `platforms/hazards/candies/checkpoints/goal`, añádelo a `levels` del mundo.
- **Nuevo mundo**: carpeta nueva con `index.js` (`id`, `name`, `theme`, `levels`) y una línea en `shared/worlds/index.js`.
- **Nuevo personaje**: entrada en `shared/characters.js`; si quieres otra forma, una función nueva en `SHAPES` de `characterModels.js`.
- **Nuevo obstáculo**: entrada en `shared/obstacles.js` (`pose`, `hits`) y su vista en `HAZARD_VIEWS` de `levelBuilder.js`.
- **Nuevo estilo de plataforma**: función en `PLATFORM_STYLES` y `kind` en los datos del nivel.

## Estado actual / pendiente
Ver la lista honesta en el mensaje de entrega: aún no hay selector de nivel/mundo en el menú (el servidor ya usa el registro), ni cambio de personaje dentro de la sala, ni colisión entre jugadores, ni sonido.
