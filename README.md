# Back to School

A browser-based 3D school exploration prototype built with Next.js, React Three Fiber and Rapier.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. Use WASD/arrows to walk, Shift to run, Space to jump, V to switch camera and E to interact. On a touch device, use the virtual pad and action buttons.

## V02 campus and gameplay

Both the visible campus and navigation now come from
`assets/school/Campus-Rebuild/v02/kien_an_campus_photo_v02.blend`.
Open `http://localhost:3000/game` after `npm run dev`. The startup/build script
copies the visual GLB, collision GLB and gameplay manifest into
`public/models/campus-v02/`. URLs include the exported revision to refresh the
browser cache after an export.

To rebuild after editing Blender, run from the repository root:

```bash
blender -b assets/school/Campus-Rebuild/v02/kien_an_campus_photo_v02.blend --python tools/campus/export_v02_gameplay.py
npm run campus:validate
npm run campus:prepare
```

The exporter does not save or alter the editable Blender file. It backs up the
previous exports under `v02/backups/`, batches repeated classroom geometry,
and exports 53 rooms, 59 unique door/gate interactions, and independent static
navigation with 16 stair ramps. The collision GLB contains simplified structural
surfaces and furniture footprints; openings and stair voids remain open.
Doors have separate measured hinges and moving cuboid colliders. A pending
close waits until the local player clears the swing area.

E, the HUD action and mobile USE share the same interaction handler. G also
sits/stands at the interactive stone bench. Only reachable nearby targets on
the same floor receive an E/G marker; physics rays prevent interaction through
walls. Repeated key events, chat typing and paused gameplay do not trigger actions.
The courtyard, stage, badminton court, rear yard and 12A1 photograph have
separate memory interactions. The player spawn and NPC routes use V02 positions.

Blender's world and lights are not exported; the browser supplies daylight.
Gate/door state remains local to each browser, matching the existing gameplay
state model. Multiplayer shares player movement and bench seat occupancy.

## Multiplayer

The game runs Next.js and Socket.IO in the same Node.js process and on the
same port. Open `/game`, enter a display name, then open another browser or
an incognito window and join with a second name. Players see each other move
in the shared school world; all state is held in memory and is reset on a
server restart.

### Text chat

Joined players can use the **Chat chung** panel in the lower-left corner.
Messages are sent on the existing Socket.IO connection, are retained only in a
100-message in-memory buffer, and appear briefly above the sender's character.
Press `Y` to focus chat, Enter to send, Shift+Enter for a new line, and Escape
to leave the input.

For development, run `pnpm dev`. To let phones or other computers on the same
network join, find this computer's LAN IP (for example `ipconfig` on Windows)
and open `http://LAN_IP:3000/game`; permit the port through Windows Firewall if
prompted. The default bind address is `0.0.0.0`.

For production:

```bash
pnpm build
pnpm start
```

The optional multiplayer settings are documented in `.env.example`. Keep one
application replica because active players are stored in the process memory.

### Proximity voice chat

Voice is off by default. A player must press **Bật** in the Voice panel before
the browser is asked for microphone permission. Hold `T` to talk; the first
press requests microphone permission and later holds transmit audio.
Audio is WebRTC peer-to-peer; Socket.IO carries only signaling and voice state.

For development a public STUN fallback is used. Production voice requires HTTPS
and normally a TURN service. Set `NEXT_PUBLIC_VOICE_ICE_SERVERS_JSON` to a JSON
array of ICE server entries. Never put long-lived TURN credentials in this
public variable; use short-lived credentials or an authenticated configuration
endpoint when deploying a TURN relay.

## Docker deployment

Build locally with `docker build -t kien-an-school-simulator .`, then run with
`docker run --rm -p 3000:3000 --env-file .env kien-an-school-simulator`.
The GitHub Actions workflow publishes to GHCR and optionally deploys over SSH;
see [DEPLOYMENT.md](DEPLOYMENT.md) for the required server setup and secrets.
When proxying with Nginx, forward WebSocket upgrade headers for `/socket.io/`
to the same Node.js port as normal HTTP requests.

## Architecture

- `src/game/world`: procedural visual geometry and independent static physics colliders.
- `src/game/player`: physics-backed capsule controller and input abstraction.
- `src/game/camera`: first/third-person controller.
- `src/game/config/school.config.ts`: data-driven map asset and interaction definitions.
- `src/components/game-ui`: HUD and touch controls.

World coordinates are measured in metres; Y is up and terrain is at Y=0. Visual meshes must never be the only definition of gameplay geometry.

## Campus assets

The active visual is `public/models/campus-v02/kien_an_campus_photo_v02.glb`.
Navigation loads separately from `kien_an_campus_photo_v02_collision.glb`.
`gameplay.json` records source hash, export revision, room IDs, door hinges,
interaction positions and spawn. Structural collisions come from the exported
navigation asset, not from legacy V58/V78 manifests or whole-building bounds.
The .blend retains editable classroom collection instances; the GLB reuses
per-preset meshes and keeps door leaves separate for runtime animation.

`npm run campus:validate` uses Rapier to check ground support, all 59 door/gate
openings with closed/open doors, and a player capsule ascending every ramp.
It writes `gameplay_validation.json` beside the exports. In development, the
HUD **Colliders** button or `/game?debugPhysics=true` displays actual Rapier shapes.

## Replacing a placeholder with GLB

In `school.config.ts`, change an asset from `source: "procedural"` to `source: "gltf"`, set `modelUrl` to a file under `public/models`, and retain/update its independent collider definition. Use simple `box` or `compound` colliders where possible; reserve `trimesh` for static, carefully tested geometry. Imported models share the same metre/Y-up coordinate convention.

## Manual checks

- Enter Building A and walk between classrooms.
- Traverse its stairs from ground to the upper floors and back down.
- Toggle TPS/FPS with V and inspect collision close to walls.
- Trigger the school sign, courtyard tree and blackboard interactions.
- Verify touch movement/buttons on a mobile viewport.

## Physics and staircase notes

The original prototype used a dynamic rigid body against individually colliding, vertical stair steps. A capsule cannot reliably climb these ledges, and the old collision callback was not a trustworthy grounded test. The player now uses Rapier's kinematic character controller with autostep, slope limits, snap-to-ground, collision-corrected gravity and a grounded result from Rapier itself.

Stairs render as individual wooden steps, but navigation uses an independent continuous ramp collider plus overlapping flat landing colliders. This keeps visible architecture replaceable and prevents gaps at transitions. During development, use the **Colliders** HUD button to display the navigation ramps.

The procedural student is a joint hierarchy driven by actual controller motion states. It can later be swapped for a rigged GLB through a visual adapter without changing collision or movement.
