import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { corePalettes } from "./core.config";
export default function CoreEngine({ reduced, light }: { reduced: boolean; light: boolean }) {
  const ref = useRef<Group>(null);
  const palette = corePalettes[light ? "light" : "dark"];
  useFrame((_, delta) => {
    if (ref.current && !reduced) ref.current.rotation.y += delta * 0.085;
  });
  return (
    <group ref={ref} rotation={[0.22, 0.3, -0.12]}>
      {Array.from({ length: 7 }, (_, index) => (
        <group key={index} position={[0, (index - 3) * 0.19, 0]} rotation={[0, index * 0.12, 0]}>
          <mesh>
            <cylinderGeometry args={[0.72, 0.72, 0.12, 6]} />
            <meshStandardMaterial color={palette.shell} metalness={0.32} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.065, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.61, 0.012, 5, 6]} />
            <meshBasicMaterial color={palette.energy} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: 6 }, (_, index) => {
        const angle = index * Math.PI / 3;
        return <group key={index} rotation={[0, angle, 0]}>
          <mesh position={[0, 0, 0.96]} rotation={[0.12, 0, 0]}>
            <boxGeometry args={[0.28, 1.65, 0.065]} />
            <meshStandardMaterial color={palette.shell} metalness={0.42} roughness={0.26} />
          </mesh>
          <mesh position={[0, 0, 1.003]}>
            <boxGeometry args={[0.018, 1.1, 0.008]} />
            <meshBasicMaterial color={palette.accent} />
          </mesh>
        </group>;
      })}
      <mesh rotation={[0.4, 0.3, 0.2]}>
        <icosahedronGeometry args={[1.32, 0]} />
        <meshBasicMaterial color={palette.ring} wireframe transparent opacity={0.19} />
      </mesh>
    </group>
  );
}
