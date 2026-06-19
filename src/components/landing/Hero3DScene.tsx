import { Canvas, useFrame } from "@react-three/fiber";
import { Float, ContactShadows, Environment } from "@react-three/drei";
import { useRef } from "react";
import type { Mesh, Group } from "three";

function Wallet() {
  const g = useRef<Group>(null);
  useFrame(({ clock, pointer }) => {
    if (!g.current) return;
    const t = clock.getElapsedTime();
    g.current.rotation.y = Math.sin(t * 0.4) * 0.35 + pointer.x * 0.3;
    g.current.rotation.x = -0.15 + pointer.y * 0.15;
  });
  return (
    <group ref={g}>
      {/* card stack */}
      <mesh position={[0, -0.15, -0.12]} castShadow>
        <boxGeometry args={[2.2, 1.4, 0.08]} />
        <meshStandardMaterial color="#171717" roughness={0.5} />
      </mesh>
      <mesh position={[0.08, 0, -0.04]} rotation={[0, 0, 0.04]} castShadow>
        <boxGeometry args={[2.2, 1.4, 0.08]} />
        <meshStandardMaterial color="#c5503a" roughness={0.45} />
      </mesh>
      <mesh position={[-0.06, 0.18, 0.06]} rotation={[0, 0, -0.05]} castShadow>
        <boxGeometry args={[2.2, 1.4, 0.08]} />
        <meshStandardMaterial color="#faf7f2" roughness={0.55} />
      </mesh>
    </group>
  );
}

function Pill({ position, color }: { position: [number, number, number]; color: string }) {
  const m = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!m.current) return;
    m.current.rotation.y = clock.getElapsedTime() * 0.6;
  });
  return (
    <Float speed={1.6} rotationIntensity={0.4} floatIntensity={0.8}>
      <mesh ref={m} position={position} castShadow>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
      </mesh>
    </Float>
  );
}

export default function Hero3DScene() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0.4, 4.2], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={["#f3efe7"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 3]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
      <Wallet />
      <Pill position={[-1.7, 0.9, 0.2]} color="#7a8b6f" />
      <Pill position={[1.8, 0.6, 0.1]} color="#c5503a" />
      <Pill position={[1.5, -1.1, 0.3]} color="#c5503a" />
      <ContactShadows position={[0, -1.1, 0]} opacity={0.35} scale={6} blur={2.4} far={2} />
      <Environment preset="apartment" />
    </Canvas>
  );
}