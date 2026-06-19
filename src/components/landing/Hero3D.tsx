import { Suspense, useRef, useState, useEffect, lazy } from "react";

const Scene = lazy(() => import("./Hero3DScene"));

function HeroFallback() {
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      <defs>
        <radialGradient id="g" cx="50%" cy="40%">
          <stop offset="0%" stopColor="#faf7f2" />
          <stop offset="100%" stopColor="#f3efe7" />
        </radialGradient>
      </defs>
      <rect width="400" height="400" fill="url(#g)" />
      {Array.from({ length: 18 }).map((_, i) => (
        <rect key={i} x={80 + (i % 3) * 2} y={300 - i * 8} width="240" height="14" rx="3" fill={i === 17 ? "#faf7f2" : i % 4 === 0 ? "#f3efe7" : "#faf7f2"} stroke="#17171712" />
      ))}
      <rect x="92" y="156" width="40" height="10" fill="#c5503a" />
      <text x="200" y="166" textAnchor="middle" fontFamily="Sora, sans-serif" fontWeight="700" fontSize="14" fill="#171717">50 000 ALL</text>
    </svg>
  );
}

export default function Hero3D() {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setMounted(true);
    setIsMobile(window.matchMedia("(max-width: 768px)").matches);
  }, []);

  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className="relative w-full aspect-square rounded-[2rem] overflow-hidden bg-paper hairline">
      {mounted && !isMobile ? (
        <Suspense fallback={<HeroFallback />}>
          <Scene />
        </Suspense>
      ) : (
        <HeroFallback />
      )}
      <div className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-[0.06]"
           style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence baseFrequency='0.9'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")" }} />
      <div className="absolute bottom-5 left-5 text-[10px] font-bold uppercase tracking-[0.22em] text-ink-soft">
        Live · WebGL
      </div>
    </div>
  );
}