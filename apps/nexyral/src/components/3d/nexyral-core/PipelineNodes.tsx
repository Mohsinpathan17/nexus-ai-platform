import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { stages, corePalettes, nodePosition } from "./core.config";
export default function PipelineNodes({ active, light, reduced }: { active: number; light: boolean; reduced: boolean }) {
  const palette = corePalettes[light ? "light" : "dark"];
  const packet = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!packet.current || reduced) return;
    const progress = (clock.elapsedTime * 0.32) % 1;
    const position = nodePosition(active);
    packet.current.position.set(...position.map(value => value * (1 - progress)) as [number, number, number]);
  });
  return <group>
    {stages.map((stage, index) => {
      const position = nodePosition(index); const selected = active === index;
      return <group key={stage} position={position}>
        <lineSegments>
          <bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array([0, 0, 0, ...position.map(value => -value * 0.55)]), 3]} /></bufferGeometry>
          <lineBasicMaterial color={selected ? palette.accent : palette.ring} transparent opacity={selected ? 0.8 : 0.2} />
        </lineSegments>
        <mesh rotation={[0.4, 0.4, 0]}>
          <boxGeometry args={[0.16, 0.16, 0.16]} />
          <meshBasicMaterial color={selected ? palette.energy : palette.ring} />
        </mesh>
        <mesh rotation={[0.2, 0.3, 0]}>
          <torusGeometry args={[selected ? 0.23 : 0.17, 0.008, 5, 32]} />
          <meshBasicMaterial color={palette.accent} transparent opacity={selected ? 0.9 : 0.35} />
        </mesh>
      </group>;
    })}
    {!reduced && <mesh ref={packet}><sphereGeometry args={[0.045, 8, 8]} /><meshBasicMaterial color={palette.energy} /></mesh>}
  </group>;
}
