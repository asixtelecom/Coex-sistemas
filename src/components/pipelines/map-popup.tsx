"use client";

import { useEffect, useRef, useState } from "react";
import Draggable from "react-draggable";
import { MapPin, Loader2, X } from "lucide-react";

interface MapPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: string;
  label: string;
}

export function MapPopup({ open, onOpenChange, address, label }: MapPopupProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      import("leaflet"),
      import("leaflet/dist/leaflet.css"),
    ]).then(([L]) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      LRef.current = L;
      setReady(true);
    });
  }, []);

  useEffect(() => {
    const L = LRef.current;
    if (!open || !mapRef.current || !L) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([-23.5505, -46.6333], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapInstanceRef.current = map;

    if (address.trim()) {
      setLoading(true);
      setError("");

      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=br`,
        { headers: { "User-Agent": "CoexSistemas/1.0" } }
      )
        .then((r) => r.json())
        .then((data) => {
          if (data?.length > 0) {
            const { lat, lon, display_name } = data[0];
            map.setView([parseFloat(lat), parseFloat(lon)], 16);
            const marker = L.marker([parseFloat(lat), parseFloat(lon)]).addTo(map);
            if (address !== display_name) {
              marker.bindPopup(display_name).openPopup();
            }
            markerRef.current = marker;
          } else {
            setError("Endereço não encontrado no mapa");
          }
        })
        .catch(() => setError("Erro ao buscar endereço"))
        .finally(() => setLoading(false));
    }

    const timer = setTimeout(() => map.invalidateSize(), 250);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [open, address]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />

      <div className="fixed inset-0 pointer-events-none flex items-start justify-center pt-[6vh]">
        <Draggable handle=".map-popup-handle" bounds="parent">
          <div className="pointer-events-auto bg-white rounded-xl shadow-2xl w-[680px] max-w-[92vw] flex flex-col overflow-hidden border border-border/50">
            <div className="map-popup-handle flex items-center justify-between px-4 py-3 bg-muted/30 border-b cursor-grab active:cursor-grabbing select-none">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="size-4 shrink-0 text-muted-foreground" />
                <span className="font-medium text-sm truncate">{label}</span>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="size-7 rounded-md hover:bg-muted flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {address && (
              <div className="px-4 py-2 text-xs text-muted-foreground border-b bg-muted/10 truncate">
                {address}
              </div>
            )}

            <div className="relative">
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 rounded-b-xl">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Buscando endereço...
                  </div>
                </div>
              )}
              {!ready && (
                <div className="flex items-center justify-center h-[400px] bg-muted/20 text-sm text-muted-foreground">
                  Carregando mapa...
                </div>
              )}
              {error && (
                <div className="px-4 py-2 text-xs text-destructive bg-destructive/10 border-b flex items-center gap-2">
                  <span>{error}</span>
                </div>
              )}
              <div ref={mapRef} className="w-full h-[400px] rounded-b-xl" />
            </div>
          </div>
        </Draggable>
      </div>
    </div>
  );
}
