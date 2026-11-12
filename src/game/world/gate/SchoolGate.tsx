"use client";
import { GateFence } from "./GateFence";
import { GatePillars } from "./GatePillars";
import { InteractiveGate } from "./InteractiveGate";

/** The GLB owns visuals; retained components contribute the existing static pillars and side-fence collision. */
export function SchoolGate() { return <group><group visible={false} position={[0,0,16]}><GatePillars /><GateFence /></group><group position={[0,0,16]}><InteractiveGate /></group></group>; }
