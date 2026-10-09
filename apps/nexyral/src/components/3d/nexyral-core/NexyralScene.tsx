import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import CoreEngine from "./CoreEngine";
import CoreLights from "./CoreLights";
import OrbitalRing from "./OrbitalRing";
import PipelineNodes from "./PipelineNodes";
import DataParticles from "./DataParticles";
export default function NexyralScene({ reduced, light, active }: { reduced: boolean; light: boolean; active: number }) {
  const group = useRef<Group>(null);
  useFrame(({ pointer, clock }, delta) => {
    if (group.current && !reduced) {
      group.current.rotation.y +=
        (pointer.x * 0.16 - group.current.rotation.y) * Math.min(delta * 3, 1);
      group.current.rotation.x +=
        (-pointer.y * 0.12 - group.current.rotation.x) * Math.min(delta * 3, 1);
      group.current.position.y = Math.sin(clock.elapsedTime * 0.5) * 0.06;
    }
  });
  return (
    <>
      <CoreLights />
      <group ref={group}>
        <CoreEngine reduced={reduced} light={light} />
        <OrbitalRing light={light} reduced={reduced} radius={1.55} rotation={[0.8, 0.2, 0.3]} />
        <OrbitalRing light={light} reduced={reduced} radius={1.9} rotation={[-0.5, 0.4, -0.35]} />
        <OrbitalRing light={light} reduced={reduced} radius={2.3} rotation={[0.4, 0.9, 0.1]} />
        <PipelineNodes active={active} light={light} reduced={reduced} />
        <DataParticles reduced={reduced} light={light} />
      </group>
    </>
  );
}
