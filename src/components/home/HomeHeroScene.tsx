import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Text } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { Group } from "three";

const NOTE_W = 2.2;
const NOTE_H = 1.0;
const NOTE_T = 0.04;
const NOTE_GAP = 0.005;
const MAX_VISIBLE = 40;

/** Animated counter that lerps toward `target`. */
function useLerped(target: number, speed = 6) {
  const ref = useRef(target);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-speed * dt);
    ref.current += (target - ref.current) * k;
  });
  return ref;
}

function Stack({
  remaining,
  budget,
  spent,
  simTotal,
}: {
  remaining: number;
  budget: number;
  spent: number;
  simTotal: number;
}) {
  const g = useRef<Group>(null);
  const targetNotes = Math.max(0, Math.min(MAX_VISIBLE, Math.round(remaining / 1000)));
  const lerped = useLerped(targetNotes, 7);
  const spentLerped = useLerped(Math.min(MAX_VISIBLE, Math.round((spent + simTotal) / 1000)), 6);
  const over = remaining < 0;

  // Pre-generate a stable per-note rotation jitter for the messy-stack look.
  const jitter = useMemo(
    () => Array.from({ length: MAX_VISIBLE }, () => ({
      rx: (Math.random() - 0.5) * 0.04,
      rz: (Math.random() - 0.5) * 0.05,
      ox: (Math.random() - 0.5) * 0.03,
      oz: (Math.random() - 0.5) * 0.03,
    })),
    [],
  );

  useFrame(({ clock, pointer }) => {
    if (!g.current) return;
    const t = clock.getElapsedTime();
    // Breathing + cursor parallax (tilt only the whole group).
    g.current.position.y = Math.sin(t * 1.4) * 0.04;
    g.current.rotation.y = -0.35 + pointer.x * 0.07;
    g.current.rotation.x = 0.18 + pointer.y * 0.05;
  });

  const notes: JSX.Element[] = [];
  const visible = Math.ceil(lerped.current);
  for (let i = 0; i < visible; i++) {
    const frac = Math.min(1, lerped.current - i);
    if (frac <= 0.01) continue;
    const j = jitter[i];
    const y = -0.6 + i * (NOTE_T + NOTE_GAP);
    const peeling = i === visible - 1 && frac < 1;
    notes.push(
      <mesh
        key={`l-${i}`}
        position={[j.ox, y + (peeling ? (1 - frac) * 0.6 : 0), j.oz + (peeling ? (1 - frac) * 0.4 : 0)]}
        rotation={[j.rx, peeling ? (1 - frac) * 0.4 : 0, j.rz + (peeling ? (1 - frac) * 0.3 : 0)]}
        castShadow
      >
        <boxGeometry args={[NOTE_W, NOTE_T, NOTE_H]} />
        <meshStandardMaterial
          color={over && i === visible - 1 ? "#c5503a" : i % 4 === 0 ? "#e8dfcd" : "#efe6d4"}
          roughness={0.7}
          metalness={0.02}
          transparent
          opacity={peeling ? frac : 1}
        />
      </mesh>,
    );
  }

  // Spent slab (lying to the right)
  const spentVisible = Math.ceil(spentLerped.current);
  const spentNotes: JSX.Element[] = [];
  for (let i = 0; i < spentVisible; i++) {
    const frac = Math.min(1, spentLerped.current - i);
    if (frac <= 0.01) continue;
    const y = -0.62 + i * (NOTE_T + NOTE_GAP);
    spentNotes.push(
      <mesh key={`s-${i}`} position={[2.4, y, 0.4]} rotation={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[NOTE_W * 0.85, NOTE_T, NOTE_H * 0.85]} />
        <meshStandardMaterial color="#7a8b6f" roughness={0.75} opacity={frac} transparent />
      </mesh>,
    );
  }

  const topY = -0.6 + Math.max(0, visible - 1) * (NOTE_T + NOTE_GAP) + NOTE_T / 2 + 0.001;

  return (
    <group ref={g} position={[-0.6, 0, 0]}>
      {notes}
      {spentNotes}

      {/* Top label — remaining ALL */}
      <Text
        position={[0, topY + 0.005, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.22}
        color={over ? "#c5503a" : "#171717"}
        anchorX="center"
        anchorY="middle"
        letterSpacing={-0.02}
      >
        {`${Math.max(0, Math.round(remaining)).toLocaleString()} ALL`}
      </Text>
      <Text
        position={[0, topY + 0.005, 0.3]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.07}
        color="#8a7e6a"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.3}
      >
        {over ? "OVER BUDGET" : "PERX · YOUR WALLET"}
      </Text>

      {/* Spent slab label */}
      {spentVisible > 0 && (
        <Text
          position={[2.4, -0.62 + spentVisible * (NOTE_T + NOTE_GAP) + 0.01, 0.4]}
          rotation={[-Math.PI / 2, 0, 0.25]}
          fontSize={0.13}
          color="#faf7f2"
          anchorX="center"
          anchorY="middle"
        >
          {`-${Math.round(spent + simTotal).toLocaleString()}`}
        </Text>
      )}

      {/* Tiny "+N more" if stack capped */}
      {Math.round(remaining / 1000) > MAX_VISIBLE && (
        <Text
          position={[-NOTE_W / 2 - 0.1, topY - 0.1, 0]}
          rotation={[0, Math.PI / 2, 0]}
          fontSize={0.1}
          color="#8a7e6a"
          anchorX="right"
          anchorY="middle"
        >
          {`${Math.round(remaining / 1000)} notes · 1,000 ALL`}
        </Text>
      )}

      {/* Budget tick (faint outline of original budget height) */}
      {budget > 0 && (
        <mesh
          position={[-NOTE_W / 2 - 0.18, -0.6 + Math.min(MAX_VISIBLE, Math.round(budget / 1000)) * (NOTE_T + NOTE_GAP) / 2, 0]}
        >
          <boxGeometry args={[0.01, Math.min(MAX_VISIBLE, Math.round(budget / 1000)) * (NOTE_T + NOTE_GAP), NOTE_H]} />
          <meshBasicMaterial color="#c5503a" transparent opacity={0.35} />
        </mesh>
      )}
    </group>
  );
}

export default function HomeHeroScene({
  budget = 25000,
  spent = 0,
  simTotal = 0,
}: {
  budget?: number;
  spent?: number;
  simTotal?: number;
}) {
  const remaining = budget - spent - simTotal;
  return (
    <Canvas shadows dpr={[1, 1.5]} camera={{ position: [1.8, 2.4, 4.2], fov: 38 }} gl={{ antialias: true, alpha: true }}>
      <color attach="background" args={["#f3efe7"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 3]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
      <Stack remaining={remaining} budget={budget} spent={spent} simTotal={simTotal} />
      <ContactShadows position={[0, -0.66, 0]} opacity={0.35} scale={10} blur={2.2} far={3} />
      <Environment preset="apartment" />
    </Canvas>
  );
}