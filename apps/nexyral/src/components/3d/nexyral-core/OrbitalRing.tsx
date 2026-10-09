import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { corePalettes } from "./core.config";
export default function OrbitalRing({ radius, rotation, light, reduced }: {
  radius: number; rotation: [number, number, number]; light: boolean; reduced: boolean;
}) {
  const ref = useRef<Group>(null);
  const palette = corePalettes[light ? "light" : "dark"];
  useFrame((_, delta) => { if (ref.current && !reduced) ref.current.rotation.z += delta * 0.055 / radius; });
  return <group rotation={rotation}><group ref={ref}>
    <mesh><torusGeometry args={[radius, 0.008, 5, 128]} /><meshBasicMaterial color={palette.ring} transparent opacity={0.65} /></mesh>
    <mesh rotation={[0, 0, radius]}><torusGeometry args={[radius, 0.014, 5, 40, Math.PI * 0.28]} /><meshBasicMaterial color={palette.accent} /></mesh>
    <mesh position={[radius, 0, 0]}><sphereGeometry args={[0.035, 8, 8]} /><meshBasicMaterial color={palette.energy} /></mesh>
  </group></group>;
}
