# Pickle Rush

Arcade pickleball with ranked AI (10 levels), local 1v1 and 2v2, accounts, a player leaderboard and LAN / online rooms.

```
pickle-rush/
├─ server.js            ← the server: website + database + accounts + rooms (no npm packages needed)
├─ package.json
├─ public/              ← the game itself (this folder alone can go on Netlify)
│  ├─ index.html
│  ├─ manifest.webmanifest, sw.js, icons   ← lets iPhone/Android install it like an app
└─ data/db.json         ← created automatically: accounts, MMR, match history
```

## Shots and serves

- **6 shots**, all available from level 1: Drive (normal), Slice (Q), Curve (E), Dink (R), Spike (T) and Smash, which fires on its own on high balls.
- **3 serves**, picked before serving: **Volley** (Q, let go of the ball and hit it before it lands), **Curve** (E, a volley serve with sidespin), **Drop** (R, let the ball bounce once, then hit it; slower but more accurate). On touch screens the skill buttons turn into Volley, Curve and Drop while you serve.

## Progression

- The first screen asks: **Play anonymously** (progress saved in that browser) or **Log in / Sign up** (progress saved on the server, shown on the leaderboard).
- Everyone starts at **level 1, 0 MMR and 150 coins**. The 10 AI opponents range from 0 to 1800 MMR and unlock one at a time: beat one to open the next.
- Coins and XP come from ranked games, rallies and ranked online matches. Every shot and serve is available from level 1.
- The Shop sells hats, shirts, shorts, shoes, paddles (Power / Control / Spin stats), ball effects (fire, ice, lightning, rainbow, galaxy, gold), courts and 2v2 AI teammates. Items, prices and level requirements are all in `public/catalog.js`, which both the game and the server read, so edit them in one place.

## 1. Run it in VS Code

1. Install **Node.js 18 or newer** from https://nodejs.org (the LTS button).
2. In VS Code: **File → Open Folder…** and pick the `pickle-rush` folder.
3. Open the terminal (**Terminal → New Terminal**) and run:

   ```
   npm start
   ```

   You can also press **F5** — the folder includes a launch config called “Pickle Rush server”.
4. The terminal prints something like:

   ```
   On this computer:   http://localhost:3000
   On your Wi-Fi (LAN): http://192.168.1.20:3000
   ```

5. Open `http://localhost:3000` in your browser. The bottom of the menu should say **Server connected**.

To stop the server press **Ctrl+C** in the terminal. While editing, `npm run dev` restarts the server automatically when you save `server.js`.

## 2. Play a LAN game

1. Keep the server running on one computer.
2. Every phone, iPad or PC must be on the **same Wi-Fi**. Open the **LAN address** from the terminal (the `192.168…` one) on each device.
3. Everyone signs up (optional, but only signed-in players get MMR from online matches).
4. One person taps **Play online → Create** (1v1 or 2v2). A 4-letter room code appears.
5. The others tap the room in **Open rooms**, or type the code and tap **Join**.
6. The host taps **Start match**. Empty slots are played by the AI.

If phones can’t connect:
- **Windows** shows a firewall popup the first time: allow Node.js on **Private networks**. If you missed it: Windows Security → Firewall → Allow an app → Node.js → tick Private.
- Use the `192.168…` address, not `localhost`, on other devices.
- Some public or school Wi-Fi blocks devices from talking to each other; use a home router or a phone hotspot.

How it works: the host’s device runs the match; other players send their controls and receive the game state 30 times a second. On a home network that feels instant.

## 3. iPhone / iPad tips

- Open the LAN address (or your published link) in **Safari**, tap **Share → Add to Home Screen**. It then opens full-screen like an app.
- Turn the phone sideways for a bigger court.
- Touch controls: drag the left pad to move, **hold Hit** to fill the power meter, tap **Serve** for a quick serve, and load Slice / Curve / Dink / Spike before your shot.
- Turn off silent mode if you want sound.

## 4. Publish it

### Option A — Netlify (what you have now: no accounts or rooms)
Drag the **`public` folder** onto https://app.netlify.com/drop (or replace your site’s files with it).
Everything local works: 1 Player vs AI, 1v1, 2v2, Rally, character, settings. Without a server the profile and MMR are saved in each browser, and **Play online** explains how to start the server.

> A Netlify page can’t talk to a server on your home Wi-Fi (browsers block `https` pages from connecting to `http` LAN addresses), so for LAN games always open the server’s own address.

### Option B — Put the server online (accounts, leaderboard and rooms over the internet)
Any Node.js host works. Example with **Render**:
1. Put this folder on GitHub (VS Code: Source Control → Publish to GitHub).
2. On https://render.com: **New → Web Service**, pick the repo.
3. Build command: `npm install` · Start command: `npm start`.
4. Render gives you a link like `https://pickle-rush.onrender.com` — share it. Rooms work across the internet (secure `wss://` is automatic).

Important for the database: free hosts often wipe files when they restart. To keep accounts:
- On Render, add a **Disk** (mounted at e.g. `/var/data`) and set the environment variable `DATA_DIR=/var/data`.
- Railway and Fly.io have similar “volumes”; set `DATA_DIR` to the mounted path.

### Option C — Let friends outside your Wi-Fi join your computer
Run `npm start`, then use a tunnel such as **Cloudflare Tunnel** (`cloudflared tunnel --url http://localhost:3000`) or **ngrok** (`ngrok http 3000`). Share the `https://…` link it prints.

## Fixing lag online

1. **Server location matters most.** Render's default region is Oregon (USA), which is far from the Philippines. This repo includes `render.yaml`, which puts the server in **Singapore**. On Render use **New → Blueprint**, pick your repo, and deploy. A region can't be changed on an existing service, so delete the old one afterwards.
2. The ms number at the top right during a match is your ping to the server: green under 90, yellow under 180, red above that. Under about 150 ms feels fine.
3. The player who creates the room is the host and has zero delay, so let the person with the best connection create it.
4. Wi-Fi is smoother than mobile data. Keep the game tab open and in front, since phones slow down hidden tabs.
5. To test lag on purpose, add `?lag=100` to the link (extra delay in each direction, for testing only).

## If the game lags

There are two different kinds of lag, and the **FPS** button in Settings shows which one you have.

- **Low FPS** (the corner shows under about 40 fps): your device is struggling to draw. **Settings → Graphics** has Auto, High and Low. Auto lowers the resolution and then the detail by itself when frames are missed. Choose **Low** on an old phone.
- **High ping** (the ms number in the match is red, above about 180): the connection is slow, not the device. See "Fixing lag online" above: the server must be in Singapore, and the player with the best connection should create the room.

Performance notes for developers: the stadium (sky, crowd, boards, court) is drawn once into saved images and reused every frame, the crowd animates as a wave of slices, menus render at 30 fps, and there is no blur behind the HUD or on touch devices.

## Controls (default)

| Player | Move | Hit / serve (hold) | Slice | Curve | Dink | Spike |
|---|---|---|---|---|---|---|
| Player 1 (near side) | W A S D | Space | Q | E | R | T |
| Player 2 (far side) | Arrow keys | Enter | K | L | I | O |
| Player 3 (near, 2v2) | Numpad 8 4 5 6 | Numpad 0 | Num 1 | Num 2 | Num 3 | Num . |
| Player 4 (far, 2v2) | Y G H J | B | V | N | M | U |

Esc pauses. Every key can be changed in **Settings**, which is also in the pause menu. Gamepads work too: stick to move, A hit, X slice, Y curve, B dink, RB spike, Start pause.

## Server API (for later features)

| Method | Path | What it does |
|---|---|---|
| GET | `/api/health` | Lets the game detect the server |
| POST | `/api/signup` `{username, password, look}` | Creates an account, returns a token |
| POST | `/api/login` `{username, password}` | Returns a token |
| GET | `/api/me` | Current account (send `Authorization: Bearer <token>`) |
| POST | `/api/ranked` `{ai, won, score, mode}` | Saves a ranked match vs AI; the server computes MMR |
| GET | `/api/leaderboard` | Top 100 real players by MMR |
| WS | `/ws` | Rooms: `create`, `join`, `start`, `in` (inputs), `st` (state), `result` |

Passwords are stored as salted scrypt hashes, never as plain text. The database is a single JSON file, which is fine for friends and classmates; if it grows to thousands of players, swap it for SQLite or Postgres inside `server.js`.
