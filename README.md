# Back to School

A browser-based 3D school exploration prototype built with Next.js, React Three Fiber and Rapier.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. Use WASD/arrows to walk, Shift to run, Space to jump, V to switch camera and E to interact. On a touch device, use the virtual pad and action buttons.

## Preview the rebuilt V2 campus

From the repository root, run:

```bash
npm run campus:preview
```

Open `http://localhost:3000/campus-preview`. This copies the latest V2 GLB from
`assets/school/Campus-Rebuild/v02/` into the public model directory and starts
the development server. If the server is already running, use
`npm run campus:prepare` and refresh the preview after each new Blender export.
The first model download is about 76 MB. Drag to orbit, scroll to zoom, and
right-drag to pan; the view buttons jump to each courtyard or the stage.

Both `/game` and `/campus-preview` now display V2 with its PBR materials.
`npm run dev` and `npm run build` prepare the public model automatically.
The standalone preview has orbit controls; `/game` retains the existing
characters, NPC coordinates and routes, player spawns, multiplayer, and
V63 collision/interaction geometry. The V63 visual scene is hidden.
This is a visual replacement: V2 walls, floors and doors can differ from the
old invisible colliders and interaction locations. Gate and classroom-door
animations still affect the hidden V63 navigation scene, not V2's static mesh.
Blender's world and lights are not exported in the GLB; the browser uses its
own daylight.

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

## Campus asset

The active campus is V43: `public/assets/school/kien_an_campus_v43_classroom_interiors.glb`.
Its visible scene loads once per browser. The classroom interiors—192 desk-and-bench sets, teaching platforms, teacher furniture, fans, flags, slogans and low-cost ceiling-light meshes—are embedded in this GLB. Static collision boxes derive from structural meshes, V43's 48 platform/step boxes, and one simplified box per desk set or teacher desk. Classroom doors and school gates keep their own moving Rapier colliders.

The 24 classroom signs are part of the V43 GLB. Their IDs, floors, building assignments and sign-node names come from the V43 scene configuration: 12A on floor 1, 11B on floor 2, and 10C on floor 3. No runtime text labels or standalone desk GLBs are rendered.

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
