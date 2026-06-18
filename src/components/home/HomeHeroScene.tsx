import { Canvas, useFrame } from "@react-three/fiber";
import { Float, ContactShadows, Environment } from "@react-three/drei";
import { useRef } from "react";
import type { Group, Mesh } from "three";

function Orbit() {
  const g = useRef<Group>(null);
  useFrame(({ clock, pointer }) => {
    if (!g.current) return;
    const t = clock.getElapsedTime();
    g.current.rotation.y = t * 0.15 + pointer.x * 0.4;
    g.current.rotation.x = -0.1 + pointer.y * 0.2;
  });
  return (
    <group ref={g}>
      {/* central torus = wallet halo */}
      <mesh castShadow>
        <torusGeometry args={[1.1, 0.18, 24, 96]} />
        <meshStandardMaterial color="#c5503a" roughness={0.4} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial color="#faf7f2" roughness={0.6} />
      </mesh>

      <Perk position={[-2, 0.9, 0.3]} color="#7a8b6f" shape="box" />
      <Perk position={[2, -0.6, 0.2]} color="#d98b5f" shape="sphere" />
      <Perk position={[1.7, 1.1, -0.4]} color="#171717" shape="cyl" />
      <Perk position={[-1.8, -1.1, 0.4]} color="#c5503a" shape="sphere" />
    </group>
  );
}

function Perk({ position, color, shape }: { position: [number, number, number]; color: string; shape: "box" | "sphere" | "cyl" }) {
  const m = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!m.current) return;
    m.current.rotation.y = clock.getElapsedTime() * 0.5;
    m.current.rotation.x = clock.getElapsedTime() * 0.3;
  });
  return (
    <Float speed={1.4} rotationIntensity={0.4} floatIntensity={0.9}>
      <mesh ref={m} position={position} castShadow>
        {shape === "box" && <boxGeometry args={[0.5, 0.5, 0.5]} />}
        {shape === "sphere" && <sphereGeometry args={[0.32, 32, 32]} />}
        {shape === "cyl" && <cylinderGeometry args={[0.28, 0.28, 0.5, 32]} />}
        <meshStandardMaterial color={color} roughness={0.45} metalness={0.15} />
      </mesh>
    </Float>
  );
}

export default function HomeHeroScene() {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0.3, 5], fov: 38 }} gl={{ antialias: true, alpha: true }}>
      <color attach="background" args={["#f3efe7"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 3]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
      <Orbit />
      <ContactShadows position={[0, -1.6, 0]} opacity={0.3} scale={8} blur={2.4} far={3} />
      <Environment preset="apartment" />
    </Canvas>
  );
}