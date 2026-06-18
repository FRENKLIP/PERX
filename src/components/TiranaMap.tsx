import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Link } from "@tanstack/react-router";
import { formatAll } from "@/lib/i18n";

const categoryEmoji: Record<string, string> = {
  wellness: "🧘",
  food: "🍴",
  travel: "🏔",
  learning: "📚",
  family: "🎈",
  tech: "💡",
  lifestyle: "✨",
};

function makeIcon(cat: string) {
  return L.divIcon({
    className: "",
    html: `<div class="perx-pin">${categoryEmoji[cat] ?? "•"}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

type Pin = {
  id: string;
  title: string;
  price_all: number;
  category_slug: string;
  image_url?: string | null;
  companies?: { name?: string | null; address?: string | null; lat?: number | null; lng?: number | null } | null;
};

export function TiranaMap({ pins, onAdd }: { pins: Pin[]; onAdd: (id: string) => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div className="w-full h-full bg-obsidian rounded-2xl" />;

  const valid = pins.filter((p) => p.companies?.lat != null && p.companies?.lng != null);

  return (
    <MapContainer center={[41.3275, 19.8189]} zoom={13} scrollWheelZoom className="w-full h-full rounded-2xl">
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {valid.map((p) => (
        <Marker key={p.id} position={[p.companies!.lat!, p.companies!.lng!]} icon={makeIcon(p.category_slug)}>
          <Popup>
            <div style={{ minWidth: 220 }}>
              {p.image_url && <img src={p.image_url} alt="" style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 10, marginBottom: 8 }} />}
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.4, color: "#c5503a" }}>{p.category_slug}</div>
              <div style={{ fontFamily: "Instrument Serif, serif", fontSize: 20, lineHeight: 1.1, margin: "4px 0" }}>{p.title}</div>
              <div style={{ fontSize: 12, color: "#5a5754", marginBottom: 8 }}>{p.companies?.name} · {p.companies?.address}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>{formatAll(p.price_all)}</strong>
                <button onClick={() => onAdd(p.id)} style={{ background: "#171717", color: "#faf7f2", border: "none", padding: "6px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Add</button>
              </div>
              <Link to="/offer/$offerId" params={{ offerId: p.id }} style={{ display: "block", textAlign: "center", marginTop: 8, fontSize: 11, fontWeight: 700, color: "#c5503a", textDecoration: "none" }}>
                View details →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}