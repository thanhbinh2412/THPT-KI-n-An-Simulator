"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CharacterAnimator } from "@/game/character/CharacterAnimator";
import { applyUnlitMaterials } from "@/game/rendering/unlitMaterials";
import type { PlayerMotionState } from "@/game/types";

const TEACHER_URL = "/assets/characteristics/male_teacher_black_suit.glb";
const STUDENT_URL = "/assets/characteristics/kien_an_student_5_animations.glb";

type Route = { points: Array<[number, number, number]>; speed: number; scale: number };

// Visual-only routes in the open courtyard: these never affect player physics.
const teacherRoute: Route = {
  points: [[-16, .8, 18], [-8, .8, 11], [4, .8, 10], [15, .8, 17], [8, .8, 25], [-8, .8, 25]],
  speed: 1.35, scale: .92,
};
const studentRoutes: Route[] = [
  { points: [[-12, .72, 3], [-5, .72, 0], [2, .72, 3], [-4, .72, 7]], speed: 1.6, scale: 1 },
  { points: [[5, .72, 2], [12, .72, 6], [7, .72, 11], [1, .72, 7]], speed: 1.45, scale: .98 },
  { points: [[-18, .72, 10], [-12, .72, 15], [-18, .72, 20], [-24, .72, 15]], speed: 1.5, scale: 1.02 },
  { points: [[15, .72, 12], [21, .72, 17], [16, .72, 22], [10, .72, 17]], speed: 1.55, scale: .96 },
  { points: [[-4, .72, 15], [3, .72, 19], [-2, .72, 24], [-9, .72, 20]], speed: 1.4, scale: 1 },
  { points: [[7, .72, -3], [14, .72, 1], [10, .72, 7], [4, .72, 3]], speed: 1.65, scale: .97 },
];

// The front yard is Z=16..50; the old route band crossed V02 classrooms.
for (const route of [teacherRoute, ...studentRoutes]) {
  route.points = route.points.map(([x, , z]) => [x * .65 - 3, .02, 22 + z * .38]);
}

function WalkingModel({ url, motion, speed, velocity }: { url: string; motion: React.MutableRefObject<PlayerMotionState>; speed: React.MutableRefObject<number>; velocity: React.MutableRefObject<THREE.Vector3> }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => scene.clone(true), [scene]);
  const root = useRef<THREE.Group>(null);
  useEffect(() => applyUnlitMaterials(model), [model]);
  return <group ref={root}><primitive object={model} /><CharacterAnimator root={root} motion={motion} speed={speed} velocity={velocity} /></group>;
}

function CourtyardWalker({ route, url, delay = 0 }: { route: Route; url: string; delay?: number }) {
  const root = useRef<THREE.Group>(null);
  const pointIndex = useRef(1);
  const started = useRef(false);
  const motion = useRef<PlayerMotionState>("idle");
  const speed = useRef(0);
  const velocity = useRef(new THREE.Vector3());
  const target = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const group = root.current;
    if (!group || state.clock.elapsedTime < delay) return;
    if (!started.current) { started.current = true; motion.current = "walk"; speed.current = route.speed; }
    target.fromArray(route.points[pointIndex.current]);
    direction.subVectors(target, group.position);
    const distance = direction.length();
    if (distance < .08) { pointIndex.current = (pointIndex.current + 1) % route.points.length; return; }
    direction.multiplyScalar(1 / distance);
    group.position.addScaledVector(direction, Math.min(distance, route.speed * delta));
    velocity.current.copy(direction).multiplyScalar(route.speed);
    speed.current = route.speed;
  });

  return <group ref={root} position={route.points[0]} scale={route.scale}>
    <WalkingModel url={url} motion={motion} speed={speed} velocity={velocity} />
  </group>;
}

/** One teacher patrols and six students roam/play across the courtyard. */
export function CourtyardNpcCrowd() {
  return <>
    <CourtyardWalker route={teacherRoute} url={TEACHER_URL} />
    {studentRoutes.map((route, index) => <CourtyardWalker key={index} route={route} url={STUDENT_URL} delay={index * .45} />)}
  </>;
}

useGLTF.preload(TEACHER_URL);
useGLTF.preload(STUDENT_URL);
