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

## Your owner account (everything unlocked)

Set two environment variables and the server creates (or updates) that account on every start with every item, every opponent, level 30 and 99,999 coins. The password is never stored in the code, so it stays private even though the repo is public.

- **Render:** your service → **Environment** → add `OWNER_USERNAME` = `Jay` and `OWNER_PASSWORD` = your password → **Save**.
- **Your PC (VS Code terminal, PowerShell):** `$env:OWNER_USERNAME="Jay"; $env:OWNER_PASSWORD="your password"; npm start`

Then log in with that username and password. MMR and DUPR still start at 0 / 2.000 and are earned in ranked games.

## Project layout (for editing)

- `public/index.html`: the page layout (screens and menus) only.
- `public/css/style.css`: all the game's styles. `public/css/utilities.css` is generated; don't edit it by hand.
- `src/*.js`: the game code, split by topic (characters, AI, online, shop…). Files are joined in name order.
- `public/app.js`: **built** from `src/` by `build.js`. The server rebuilds it every time it starts, so on Render it's always current. On your PC, run `npm run build` (or just restart the server) after editing anything in `src/`.
- `public/catalog.js`: items, opponents, cups and progression rules, shared by the game and the server.

## Tournaments

Club Cup, Pro Open and World Championship: 8-team brackets (Quarterfinal → Semifinal → Final) against national AI teams. Play with your AI teammate, or create a 2v2 room online in Tournament mode and team up with a friend (you two are Team 1). Winning a cup gives tournament-only prizes: champion jerseys, the Trophy Lift dance, the Golden laurel, the Champion's Cup paddle and the World Champion crown with its aura. Pro Open unlocks at a 3.5 rating or after winning the Club Cup; World Championship at 5.0 or after winning the Pro Open.

## Tournament tickets and difficulty

Every tournament costs an entry ticket (150 to 1,200 coins; the host pays for online team tournaments) and doubles teams type a team name. Opponents get tougher each round and the Final is the hardest match: beginner cups start around 400 MMR (2.65 rating); the World Championship goes 5.65 → 6.15 → 7.15.

## Titles

Winning a tournament earns its title (e.g. **Singles Grand Slam Champion**, **World Champion**, **Street Legend Slayer**; wins again add ×2, ×3). Your newest title is worn automatically; pick another (or none) in the Locker. Titles show on your name tag, the dashboard, your profile, the leaderboard and online lobby cards, and the server only accepts titles you really won. AI opponents have their own titles too (Kuya Lando is the **Street Legend**).

## Look and feel ("Soft Court" theme)

The menus, login, account, shop and tournament screens use a neumorphism theme in `public/css/neu.css` (soft raised surfaces, pressed-in wells and buttons) with motion: screens glide in, cards pop in one after another, hovering lifts cards, buttons press in with a ripple, a slow animated glow drifts behind the menus (never during a match), and the login hero tilts toward the pointer. Devices set to "reduce motion" get a calm, still version. **Settings → Video → Menu effects** offers Auto / Full / Lite; Auto switches to Lite by itself if the menus run below 30 fps. Behind the menus the court only refreshes a few times a second, and the panels sit on their own GPU layers, so the menus stay smooth. Delete that one `<link>` in `index.html` to return to the previous style.

## Chests, pro characters and settings

- **Five chests:** Mini (200 coins), Rally (500 or a key), Golden (1,500), **Pinoy** (900) and **Pro** (2,500). Pinoy and Pro chests hold their own teammates and gear. During the spin you can **skip** with the button, a tap on the reel, Space or Enter.
- **Pro and Pinoy pro characters are original** (inspired by pro-tour play styles, not real people). They are good teammates but not unbeatable as opponents (about 4.1–4.9 rating in the **Pro Showcase** and **Pinoy Pro Invitational** cups).
- **Camera:** press **1–6** to pick a camera, **C** to cycle. Online emotes are now **Shift + 1–8**.
- **Settings** are split into **Video**, **Audio** (separate music, sound effects and announcer volume), **Controls / Hotkeys** and **Gameplay**.
- **Rating:** ranked wins now pay about twice as much (an even match is about +45), while losses cost the same as before.

## Singles Tour

Solo tournaments (8-player brackets): **Singles Open** (Beginner), **Singles Masters** (Intermediate) and **Singles Grand Slam** (Pro). Prizes: Singles Open jersey, Champion sweatbands, Singles Masters kit, Masters comet ball, Grand Slam paddle and Grand Slam headband.

## Philippine Tour and Kuya Lando

- **Barangay Cup** (Beginner), **Visayas Open** (Intermediate) and **Philippine Nationals** (Pro): teams are Philippine cities and provinces. Prizes include the Lansangan Street Court, the Barangay Cup sando, the Visayas Open jersey, Sinulog Steps and the Nationals jersey.
- **Street Challenge:** a 1v1 against **Kuya Lando** (7.8 rating) at the Lansangan Street Court. Beat him, win the Philippine Nationals, or buy him for 20,000 coins to make him your teammate.
- After each win: **Next match** goes straight to your next round; **View bracket** lets you **watch the other matches** (they really decide who advances) or skip to the result.
- New courts: **Lansangan Street Court** and **Barangay Covered Court**. Street gear in the shop: Street legend tee, Faded cargo shorts, Tsinelas, Taped-up paddle.

## Accounts

- **Change password** and **Delete my account** are on the Account page.
- Set **`CONTACT_EMAIL`** on Render (Environment) and the Privacy and Terms pages show that address.
- New players are offered a **1-minute tutorial** (also under How to play) that pays 200 coins and a chest key.

## Safety and fair play

- **Ranked results are checked** (against the AI and online). The server gives every ranked match a ticket when it starts, and only accepts a result for that ticket if the score is a real finished game (to 11, win by 2), the match took a believable time, and you haven't won more than 20 ranked matches in the last hour.
- **Quitting counts as a loss.** Leaving a ranked match early (or closing the page) counts as a loss with a small extra penalty. Leaving an online match before it ends costs 15 rating. The game asks before you quit.
- **Login protection.** 5 wrong passwords lock that account for 10 minutes; new accounts are limited per connection.
- **Recovery codes.** Every new account gets a recovery code (shown once). *Forgot password?* on the login screen uses it to set a new password. Account → *Make a new recovery code* gives older accounts one too.
- **Names and reports.** Offensive usernames are blocked (English and Filipino, including leetspeak). Players can report a profile; after 3 different players report someone, they're hidden from the leaderboard until reviewed.
- **Owner tools.** Your owner account (OWNER_USERNAME) sees reported players in the bell and can Clear reports, Ban or Unban from their profile.
- **Error reports.** If the game crashes on someone's phone or browser, the error and browser type show up in your Render logs as `[client error]`.
- **Privacy Policy and Terms** are at `/privacy.html` and `/terms.html`. Replace `YOUR-EMAIL@example.com` in both files with your contact email before launching.

## Seasons, challenges and achievements

- **Seasons** last one calendar month. When a season ends you get rewards for the highest tier you reached (up to 3,000 coins + 4 keys for World-best) and your rating soft-resets to 75%.
- **Challenges:** 3 daily and 3 weekly, like "Hit 15 dinks" or "Win 10 ranked matches". Weekly ones also give a chest key.
- **Achievements:** 21 of them, from First Win to beating The Pickle King, each with coins and some with keys.

## Replays and emotes

- **Instant replay** in slow motion after a smash or spike winner and after rallies of 10+ shots. Tap or press Space to skip; turn *Replays* off in Settings.
- **Quick emotes** online: press 1–8 or tap 😀 in the scoreboard.

## Friends and profiles

Tap a player's name (leaderboard, Top players, lobby cards, friends list) to open their profile: character, level, DUPR, MMR, record and recent matches. Signed-in players can **Add friend**, see which friends are online (green dot), and **invite** online friends to the room they are in. Invites pop up anywhere in the menus.

## Chests

Balls, courts, special hairstyles and some outfits only come from **chests** (Shop → 🎁 Chests). A spinning reel picks your prize; the odds are shown on each chest (Rally Chest 500 coins: 58% Common, 29% Rare, 10% Epic, 3% Legendary; Golden Chest 1500 coins: better odds). Duplicates turn into coins. Every level up gives a free **chest key** 🔑 (new players start with one). For accounts the server rolls the prize, so it can't be faked.

## Notifications and friend requests

The bell in the top-right of the menus shows friend requests (Accept / Decline), room invites (Join) and rewards. Adding a friend sends a request that stays *pending* until the other player accepts.

## Looks

16 hairstyles and 12 hair colors for everyone, body type (slim, regular, athletic, stocky), height (150–200 cm) and nationality with a flag, shown in the scoreboard, lobby, leaderboard and profiles. Looks don't change gameplay. Paddles include original anime-style designs (Kitsune, Oni, Neko, Mecha, Katana, Sky Dragon…).

## Coins

Ranked wins pay 90 coins (Rookie) up to 390 (The Pickle King), losses still pay something, and there is a **300-coin daily bonus** the first time you open the menu each day.

## Shop extras

- **Wristbands** in 11 colors plus Rainbow and Gold.
- **7 more paddles** with stripes, dots, waves and split designs.
- **Every outfit piece in 11 colors** (tees, polos, shorts, skirts, sneakers, caps, headbands).
- **Victory dances** (your side also dances after every point it scores; turn *Point dances* off in Settings): Fist Pump, The Dab, Robot, Tinikling Hop, Brazilian Funk, Budots and Weng Weng Shuffle. The winners dance on court after the match. Each dance has an original beat made in the game (tap a dance in the shop to hear it).
- AI opponents use Rare, Epic and Legendary balls as they get stronger.

## Courts in custom and online games

Settings → *Court in custom games* picks the court for 1v1, 2v2 and new online rooms (🎲 Random by default). In a room, the host can change it with the Court menu.

## Music

The menus have background music. Turn it on or off with *Music* in the sidebar or in Settings.

## PR Rating

The dashboard, ranking page, leaderboard, lobby cards and opponent list show a **PR Rating** (Pickle Rush Rating) on a 2.000–8.000 scale like real pickleball ratings. It is calculated from your in-game MMR and isn't an official rating: 0 MMR = 2.0 and every 667 MMR adds 1.0, up to 4000 MMR = 8.0. Tiers: Beginner 2.0–2.99, Intermediate 3.0–3.49, Advanced intermediate 3.5–3.99, Advanced 4.0–4.99, Semi-professional 5.0–5.99, Professional 6.0–6.99, World-best 7.0–8.0. The 16 AI opponents are spread across all tiers, from Rookie Rex (2.00) to The Pickle King (8.00).

## Sprint

Hold **Shift** (Player 2: right Shift, gamepad: LB) to sprint about 40% faster. It uses stamina, shown above your head; run it dry and you're tired until it refills. On touch screens, push the stick all the way to the edge. The AI sprints too when it has far to go.

## Cameras and AI

- **6 camera presets:** Classic, Action (zoomed, follows you and the ball), Low, Sky, Broadcast (TV side view) and Corner. Press **C** in a match, tap the camera button in the scoreboard, or pick one in Settings. Controls follow the camera.
- **Kitchen play:** the AI uses real pickleball strategy. The returning side moves up after the return of serve, the serving side after the third shot (often a soft drop into the kitchen), then they dink. High balls get sped up or smashed. Stronger AIs play this way more often (Rookie about a third of the time, Champion and up every rally). Your AI teammate in 2v2 does it too.

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

## Keep accounts forever (Upstash, free) — do this on Render

Render's free plan deletes the server's files whenever it sleeps (after ~15 minutes without visitors) or restarts. Without a database, every account would vanish after a few hours. Upstash Redis fixes this and is free.

1. Go to https://upstash.com and sign up (Google or GitHub login works, no credit card).
2. **Create Database → Redis**. Name it `pickle-rush`, pick the region **ap-southeast-1 (Singapore)** so it's next to your Render server, and choose the **Free** plan.
3. Open the database and find the **REST API** section. Copy **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN**.
4. On Render: open your service → **Environment** → **Add Environment Variable**. Add both, with exactly those names, and click **Save**. Render redeploys by itself.
5. Check it worked: open `https://your-site.onrender.com/api/health`. It should say `"storage":"upstash"`. The server log also says `Storage: Upstash Redis (permanent)`.

If those variables are missing on Render, the start screen shows a warning that accounts will be deleted on restart, and the server log prints a WARNING.

On your own PC you don't need Upstash: accounts are saved in `data/db.json`.

## Online multiplayer

- Works from any internet connection once the server is on Render: create a room, then share the 4-letter code or the **Copy invite link** button.
- 1v1 and 2v2 rooms. Empty slots are played by the AI.
- The host's device runs the match. The ball, players, score, serve and game state are sent to everyone about 60 times a second, and your own player moves instantly on your screen.
- **Lobby:** player cards for 1P–4P in team colors with live character previews. Guests tap **Ready up**; the host's **Start match** unlocks when everyone is ready (or use *Start anyway*). **Quick match** puts you in an open 1v1 or 2v2 game, or opens one for others to join.
- **Reconnection:** if someone's connection drops, the match pauses with "Waiting for … to reconnect" and they get 30 seconds to come back to the same slot. Reloading the page during a match also rejoins automatically. After 30 seconds the AI takes their place. If the host drops, everyone waits for the host the same way.

## Phones

- The court resizes to fit any screen, upright or sideways, and the whole court stays visible.
- Touch the left half of the screen anywhere to get the movement stick under your thumb. The big button on the right is **Hit**, and turns into **Serve** when it's your serve (tap to serve, hold for a power serve). The smaller buttons pick shots, or serves while you're serving.
- The page can't scroll or zoom during a match. On Android, matches go fullscreen (turn this off in Settings).
- Settings → Graphics: Auto lowers detail by itself on slower phones.

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
