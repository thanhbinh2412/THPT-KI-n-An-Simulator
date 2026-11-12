# Back to School

A browser-based 3D school exploration prototype built with Next.js, React Three Fiber and Rapier.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. Use WASD/arrows to walk, Shift to run, Space to jump, V to switch camera and E to interact. On a touch device, use the virtual pad and action buttons.

## Multiplayer

The game runs Next.js and Socket.IO in the same Node.js process and on the
same port. Open `/game`, enter a display name, then open another browser or
an incognito window and join with a second name. Players see each other move
in the shared school world; all state is held in memory and is reset on a
server restart.

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
