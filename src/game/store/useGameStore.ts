import { create } from "zustand";
import type { CameraMode, PlayerMotionState, Vec3 } from "@/game/types";
import type { CampusGateId } from "@/game/config/campus.config";
import { campusConfig } from "@/game/config/campus.config";
import { classrooms, type ClassroomDoorId } from "@/game/classrooms/classroom.config";
import { campusDoors, campusLights } from "@/game/config/campusGameplay";
import type { WorldInteractionState } from "@/shared/multiplayer-types";

const initialClassroomDoorState = Object.fromEntries(classrooms.map((classroom) => [classroom.id, false])) as Record<ClassroomDoorId, boolean>;

type GameState = {
  cameraMode: CameraMode; paused: boolean; playerPosition: Vec3; area: string; floor: number;
  nearbyId: string | null; activeDialog: string | null; run: boolean;
  mobileMove: { forward: number; right: number }; mobileJump: boolean;
  playerMotion: PlayerMotionState; playerGrounded: boolean; physicsDebug: boolean;
  gateOpen: boolean; gateCloseRequested: boolean;
  campusGates: Record<CampusGateId, boolean>; campusGateCloseRequested: CampusGateId | null;
  classroomDoors: Record<ClassroomDoorId, boolean>; classroomDoorCloseRequested: ClassroomDoorId | null;
  benchSeatIndex: number | null;
  activeSeatId: string | null; occupiedSeats: Record<string, string>; roomLights: Record<string, boolean>;
  pendingDoorIds: string[]; interactionPending: boolean; interactionMessage: string | null;
  preferredInteractionId: string | null; interactionChoices: string[]; teleportRequest: { sequence: number; position: Vec3 } | null;
  setActiveSeat: (id: string | null) => void; applyInteractionState: (state: WorldInteractionState) => void;
  setInteractionPending: (pending: boolean) => void; setInteractionMessage: (message: string | null) => void;
  setInteractionChoices: (ids: string[]) => void; cycleInteractionChoice: () => void; teleportPlayer: (position: Vec3) => void;
  /** Current visual-only NPC location, used by the shared interaction system. */
  teacherPosition: Vec3; teacherGreetingRequestedAt: number | null;
  setCameraMode: (mode: CameraMode) => void; toggleCamera: () => void; setPaused: (paused: boolean) => void;
  setPlayerPosition: (position: Vec3) => void; setNearbyId: (id: string | null) => void;
  setDialog: (id: string | null) => void; setRun: (run: boolean) => void;
  setMobileMove: (move: { forward: number; right: number }) => void; setMobileJump: (jump: boolean) => void;
  setPlayerMotion: (motion: PlayerMotionState) => void; setPlayerGrounded: (grounded: boolean) => void; togglePhysicsDebug: () => void;
  requestGateToggle: () => void; closeGateWhenClear: () => void;
  requestCampusGateToggle: (id: CampusGateId) => void; closeCampusGateWhenClear: (id: CampusGateId) => void;
  requestClassroomDoorToggle: (id: ClassroomDoorId) => void; closeClassroomDoorWhenClear: (id: ClassroomDoorId) => void;
  setBenchSeatIndex: (seatIndex: number | null) => void;
  setTeacherPosition: (position: Vec3) => void; requestTeacherGreeting: () => void; clearTeacherGreeting: (requestedAt: number) => void;
};
export const useGameStore = create<GameState>((set) => ({
  // Start at the same side of the main gate as the actual Rapier player spawn.
  cameraMode: "third", paused: false, playerPosition: [...campusConfig.spawn], area: "School Gate", floor: 1,
  nearbyId: null, activeDialog: null, run: false,
  mobileMove: { forward: 0, right: 0 }, mobileJump: false,
  playerMotion: "idle", playerGrounded: false, physicsDebug: false,
  gateOpen: true, gateCloseRequested: false,
  campusGates: { main: true, left: false, right: false }, campusGateCloseRequested: null,
  classroomDoors: initialClassroomDoorState, classroomDoorCloseRequested: null,
  benchSeatIndex: null,
  activeSeatId: null, occupiedSeats: {}, roomLights: Object.fromEntries(campusLights.map(light => [light.id, light.defaultOn])),
  pendingDoorIds: [], interactionPending: false, interactionMessage: null, preferredInteractionId: null, interactionChoices: [], teleportRequest: null,
  setActiveSeat: (activeSeatId) => set({ activeSeatId }),
  applyInteractionState: (state) => set({
    roomLights: state.lights, occupiedSeats: state.seats, pendingDoorIds: state.pendingDoors,
    campusGates: Object.fromEntries(campusDoors.filter(door => door.gate).map(door => [door.gate!, state.doors[door.id] ?? false])) as Record<CampusGateId, boolean>,
    classroomDoors: Object.fromEntries(campusDoors.filter(door => !door.gate).map(door => [door.id, state.doors[door.id] ?? false])),
  }),
  setInteractionPending: (interactionPending) => set({ interactionPending }),
  setInteractionMessage: (interactionMessage) => set({ interactionMessage }),
  setInteractionChoices: (interactionChoices) => set(state => ({ interactionChoices, preferredInteractionId: state.preferredInteractionId && interactionChoices.includes(state.preferredInteractionId) ? state.preferredInteractionId : null })),
  cycleInteractionChoice: () => set(state => {
    if (state.interactionChoices.length < 2) return {};
    const index = state.interactionChoices.indexOf(state.nearbyId ?? "");
    return { nearbyId: state.interactionChoices[(index+1) % state.interactionChoices.length], preferredInteractionId: state.interactionChoices[(index+1) % state.interactionChoices.length] };
  }),
  teleportPlayer: (position) => set(state => ({ teleportRequest: { position, sequence: (state.teleportRequest?.sequence ?? 0)+1 } })),
  teacherPosition: [0, 0, 0], teacherGreetingRequestedAt: null,
  setCameraMode: (cameraMode) => set({ cameraMode }), toggleCamera: () => set((s) => ({ cameraMode: s.cameraMode === "third" ? "first" : "third" })),
  setPaused: (paused) => set({ paused }), setPlayerPosition: (playerPosition) => set({ playerPosition }),
  setNearbyId: (nearbyId) => set({ nearbyId }), setDialog: (activeDialog) => set({ activeDialog }), setRun: (run) => set({ run }),
  setMobileMove: (mobileMove) => set({ mobileMove }), setMobileJump: (mobileJump) => set({ mobileJump }),
  setPlayerMotion: (playerMotion) => set({ playerMotion }), setPlayerGrounded: (playerGrounded) => set({ playerGrounded }), togglePhysicsDebug: () => set((s) => ({ physicsDebug: !s.physicsDebug })),
  requestGateToggle: () => set((s) => s.gateOpen ? { gateCloseRequested: true } : { gateOpen: true, gateCloseRequested: false }),
  closeGateWhenClear: () => set({ gateOpen: false, gateCloseRequested: false }),
  requestCampusGateToggle: (id) => set((s) => s.campusGates[id] ? { campusGateCloseRequested: id } : { campusGates: { ...s.campusGates, [id]: true }, campusGateCloseRequested: null }),
  closeCampusGateWhenClear: (id) => set((s) => ({ campusGates: { ...s.campusGates, [id]: false }, campusGateCloseRequested: s.campusGateCloseRequested === id ? null : s.campusGateCloseRequested })),
  requestClassroomDoorToggle: (id) => set((s) => s.classroomDoors[id]
    ? { classroomDoorCloseRequested: id }
    : { classroomDoors: { ...s.classroomDoors, [id]: true }, classroomDoorCloseRequested: null }),
  closeClassroomDoorWhenClear: (id) => set((s) => ({
    classroomDoors: { ...s.classroomDoors, [id]: false },
    classroomDoorCloseRequested: s.classroomDoorCloseRequested === id ? null : s.classroomDoorCloseRequested,
  })),
  setBenchSeatIndex: (benchSeatIndex) => set({ benchSeatIndex }),
  setTeacherPosition: (teacherPosition) => set({ teacherPosition }),
  requestTeacherGreeting: () => set({ teacherGreetingRequestedAt: Date.now() }),
  // Do not clear a newer click when an older teacher response expires.
  clearTeacherGreeting: (requestedAt) => set((s) => s.teacherGreetingRequestedAt === requestedAt ? { teacherGreetingRequestedAt: null } : s),
}));
