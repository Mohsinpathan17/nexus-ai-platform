import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Points } from "three";
import { coreConfig, corePalettes } from "./core.config";
export default function DataParticles({ reduced, light }: { reduced: boolean; light: boolean }) {
  const ref = useRef<Points>(null);
  const positions = useMemo(
    () =>
      Float32Array.from(
        Array.from({ length: coreConfig.particles }, (_, i) => {
          const angle = i * 2.399;
          const radius = 1.4 + (i % 7) / 7;
          return [
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            ((i % 9) - 4) * 0.18,
          ];
        }).flat(),
      ),
    [],
  );
  useFrame((_, delta) => {
    if (ref.current && !reduced) ref.current.rotation.z -= delta * 0.035;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={corePalettes[light ? "light" : "dark"].accent}
        size={0.025}
        transparent
        opacity={0.55}
        sizeAttenuation
      />
    </points>
  );
}
