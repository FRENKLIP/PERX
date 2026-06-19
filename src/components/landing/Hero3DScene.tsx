import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Text } from "@react-three/drei";
import { useRef } from "react";
import type { Group } from "three";

/**
 * Cash-stack hero: a stylized stack of PERX banknotes representing the
 * average monthly tax-free budget per employee. The whole stack breathes
 * and gently parallaxes with the cursor — ambient only.
 */
function CashStack() {
  const g = useRef<Group>(null);
  useFrame(({ clock, pointer }) => {
    if (!g.current) return;
    const t = clock.getElapsedTime();
    g.current.position.y = Math.sin(t * 0.9) * 0.04 - 0.2;
    g.current.rotation.y = -0.35 + pointer.x * 0.18 + Math.sin(t * 0.3) * 0.05;
    g.current.rotation.x = -0.32 + pointer.y * 0.08;
  });

  const NOTE_W = 2.6;
  const NOTE_H = 1.2;
  const NOTE_D = 0.025;
  const count = 22;

  return (
    <group ref={g} position={[0, -0.2, 0]}>
      {Array.from({ length: count }).map((_, i) => {
        const y = i * (NOTE_D + 0.004);
        const jitterX = ((i * 37) % 13 - 6) * 0.004;
        const jitterZ = ((i * 53) % 11 - 5) * 0.004;
        const rotZ = (((i * 19) % 7) - 3) * 0.0035;
        const isTop = i === count - 1;
        return (
          <mesh
            key={i}
            position={[jitterX, y, jitterZ]}
            rotation={[0, 0, rotZ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[NOTE_W, NOTE_D, NOTE_H]} />
            <meshStandardMaterial
              color={isTop ? "#faf7f2" : i % 6 === 0 ? "#f3efe7" : "#faf7f2"}
              roughness={0.85}
            />
          </mesh>
        );
      })}

      {/* red band wrap on the top note — the PERX accent */}
      <mesh position={[-NOTE_W / 2 + 0.32, count * (NOTE_D + 0.004) + 0.013, 0]}>
        <boxGeometry args={[0.28, 0.005, NOTE_H + 0.02]} />
        <meshStandardMaterial color="#c5503a" roughness={0.55} />
      </mesh>

      {/* denomination on top note */}
      <Text
        position={[0.55, count * (NOTE_D + 0.004) + 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.22}
        color="#171717"
        anchorX="center"
        anchorY="middle"
      >
        50 000 ALL
      </Text>
      <Text
        position={[0.55, count * (NOTE_D + 0.004) + 0.02, 0.36]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.075}
        color="#5a5754"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.18}
      >
        PERX · TAX-FREE WELLNESS
      </Text>
    </group>
  );
}

export default function Hero3DScene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.6, 3.6], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={["#f3efe7"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 2]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
      <CashStack />
      <ContactShadows position={[0, -0.4, 0]} opacity={0.32} scale={6} blur={2.6} far={2} />
      <Environment preset="apartment" />
    </Canvas>
  );
}