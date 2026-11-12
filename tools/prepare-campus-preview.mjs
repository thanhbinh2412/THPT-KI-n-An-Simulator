import { copyFile, mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const source = new URL('../assets/school/Campus-Rebuild/v02/kien_an_campus_photo_v02.glb', import.meta.url);
const directory = new URL('../public/models/campus-v02/', import.meta.url);
await stat(source);
await mkdir(directory, { recursive: true });
await copyFile(source, new URL('kien_an_campus_photo_v02.glb', directory));
console.info(`V2 ready: ${fileURLToPath(directory)}\nOpen http://localhost:3000/game (or /campus-preview) after starting the dev server.`);
