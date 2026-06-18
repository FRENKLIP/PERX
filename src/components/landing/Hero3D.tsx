import { Suspense, useRef, useState, useEffect, lazy } from "react";

const Scene = lazy(() => import("./Hero3DScene"));

function HeroFallback() {
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      <defs>
        <radialGradient id="g" cx="50%" cy="40%">
          <stop offset="0%" stopColor="#0d7a5f" />
          <stop offset="100%" stopColor="#07211b" />
        </radialGradient>
      </defs>
      <rect width="400" height="400" fill="url(#g)" />
      <rect x="120" y="160" width="160" height="100" rx="14" fill="#050b0a" />
      <rect x="130" y="150" width="160" height="100" rx="14" fill="#064e3b" opacity="0.95" />
      <rect x="140" y="140" width="160" height="100" rx="14" fill="#c9a84c" opacity="0.95" />
      <circle cx="90" cy="100" r="22" fill="#c9a84c" />
      <circle cx="320" cy="120" r="18" fill="#0d7a5f" />
      <circle cx="300" cy="300" r="20" fill="#f0d78c" />
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
    <div ref={ref} className="relative w-full aspect-square rounded-[2rem] overflow-hidden bg-obsidian hairline">
      {mounted && !isMobile ? (
        <Suspense fallback={<HeroFallback />}>
          <Scene />
        </Suspense>
      ) : (
        <HeroFallback />
      )}
      <div className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-[0.06]"
           style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence baseFrequency='0.9'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")" }} />
      <div className="absolute bottom-5 left-5 text-[10px] font-bold uppercase tracking-[0.22em] text-bone-soft">
        Live · WebGL
      </div>
    </div>
  );
}