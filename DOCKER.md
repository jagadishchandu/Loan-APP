# Running LendSplit Locally with Docker

This guide shows how to run the full stack (MongoDB + FastAPI + Expo) on your own machine using Docker.

## Prerequisites
- Docker Desktop 4.x+ (or Docker Engine on Linux) with Docker Compose v2
- ~3 GB free disk space for images
- For testing on a real phone: install Expo Go from the App Store / Play Store

## 1. Clone & enter the repo
```bash
git clone <your-repo-url> lendsplit
cd lendsplit
```

## 2. Configure environment files
Two `.env.docker` files are already included:
- `backend/.env.docker` — Mongo URL + JWT secret
- `frontend/.env.docker` — Expo public backend URL

**Important:** if you want to test the app on a real phone via Expo Go, replace `localhost` in `frontend/.env.docker` with your computer's LAN IP (e.g. `http://192.168.1.5:8001`).
- macOS: `ipconfig getifaddr en0`
- Linux: `hostname -I | awk '{print $1}'`
- Windows: `ipconfig` → find "IPv4 Address"

For **production**, regenerate `JWT_SECRET`:
```bash
openssl rand -hex 32
```
…and paste it into `backend/.env.docker`.

## 3. Start everything
```bash
docker compose up --build
```

First build takes 3–5 minutes (downloads Python, Node, MongoDB images + dependencies).

You'll see logs from all three containers. Wait for these signals:
- `mongodb` → `Waiting for connections on port 27017`
- `backend`  → `Application startup complete`
- `frontend` → `Waiting on http://localhost:3000`

## 4. Access the app
- **Web preview**: open http://localhost:3000 in your browser
- **Backend API**: http://localhost:8001/api/
- **Mobile (Expo Go)**:
  1. Make sure your phone is on the **same Wi-Fi** as your computer
  2. Open Expo Go → Scan the QR code that appears in the `frontend` container logs
  3. (Optional) If QR scanning doesn't work, type the `exp://` URL manually

## 5. Demo credentials
A demo account is auto-seeded on first signup. You can either sign up fresh or use:
- Email: `demo@lendsplit.app`
- Password: `demo1234`

(If the demo account doesn't exist yet, just hit **Sign up** from the login screen — it takes 5 seconds.)

## 6. Useful commands
```bash
# Stop everything
docker compose down

# Stop + wipe MongoDB data (fresh start)
docker compose down -v

# View logs for one service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongodb

# Rebuild after code changes (frontend hot-reloads automatically;
# backend reloads via uvicorn --reload when running locally,
# but in Docker you may need to restart it)
docker compose restart backend

# Open a shell inside a container
docker compose exec backend bash
docker compose exec frontend sh

# Run backend tests
docker compose exec backend pytest tests/ -v
```

## 7. Project structure
```
.
├── docker-compose.yml          ← orchestrates 3 services
├── Dockerfile.backend          ← FastAPI image
├── Dockerfile.frontend         ← Expo dev server image
├── backend/
│   ├── .env.docker             ← backend env (Mongo URL, JWT secret)
│   ├── server.py
│   └── requirements.txt
├── frontend/
│   ├── .env.docker             ← Expo public env (backend URL)
│   ├── app/                    ← all screens (file-based routing)
│   ├── lib/                    ← api client, auth context, etc.
│   └── package.json
└── tests/                      ← backend pytest suite
```

## 8. Troubleshooting

### "Cannot connect to backend" on phone
- Phone & computer must be on the **same Wi-Fi**.
- `EXPO_PUBLIC_BACKEND_URL` in `frontend/.env.docker` must use your **LAN IP**, not `localhost`.
- Some routers block device-to-device traffic ("AP isolation") — try a different network.

### Port already in use
Stop whatever's using ports 3000 / 8001 / 27017, or change the host port in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"   # use host port 3001 instead
```

### Slow first install
The frontend image builds `node_modules` (≈ 1 GB). After the first build it's cached.

### Reset everything
```bash
docker compose down -v
docker system prune -af --volumes
docker compose up --build
```

---

## What's mocked
- **Payments** (`/api/subscription/subscribe`) — accepts `phonepe | google_play | paypal` but no real money flows. Replace with your merchant SDK for production.
- **Push notifications** — use Expo Push API; works on real devices, not on web/simulator.
