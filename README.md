# 1 VS 1 FIGHT

Real-time two-player Canvas fighting game built with Node.js, Express, and Socket.IO.

## Local setup

```bash
npm install
npm start
```

Open `http://localhost:3000` in two separate browser windows. The first connection is Player 1 and the second is Player 2. A third connection receives a room-full message.

## Controls

- `A` or `Left Arrow`: move left
- `D` or `Right Arrow`: move right
- `W` or `Up Arrow`: jump
- `Space`: punch

## Render deployment

1. Push this repository to GitHub.
2. In Render, create a new **Web Service** from the repository.
3. Use `npm install` as the Build Command.
4. Use `npm start` as the Start Command.
5. Deploy. No environment variable is required because Render supplies `PORT`.

This repository also includes `render.yaml`, so Render's **New Blueprint Instance** flow can detect the build and start settings automatically.
