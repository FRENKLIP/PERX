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
        <meshStandardMaterial color="#050b0a" roughness={0.35} metalness={0.4} />
      </mesh>
      <mesh position={[0.08, 0, -0.04]} rotation={[0, 0, 0.04]} castShadow>
        <boxGeometry args={[2.2, 1.4, 0.08]} />
        <meshStandardMaterial color="#064e3b" roughness={0.25} metalness={0.55} />
      </mesh>
      <mesh position={[-0.06, 0.18, 0.06]} rotation={[0, 0, -0.05]} castShadow>
        <boxGeometry args={[2.2, 1.4, 0.08]} />
        <meshStandardMaterial color="#c9a84c" roughness={0.2} metalness={0.85} />
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
      <color attach="background" args={["#07211b"]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 3]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} color="#f0d78c" />
      <pointLight position={[-3, -2, 2]} intensity={0.6} color="#0d7a5f" />
      <Wallet />
      <Pill position={[-1.7, 0.9, 0.2]} color="#c9a84c" />
      <Pill position={[1.8, 0.6, 0.1]} color="#0d7a5f" />
      <Pill position={[1.5, -1.1, 0.3]} color="#f0d78c" />
      <ContactShadows position={[0, -1.1, 0]} opacity={0.35} scale={6} blur={2.4} far={2} />
      <Environment preset="night" />
    </Canvas>
  );
}