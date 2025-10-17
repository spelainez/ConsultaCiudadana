"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

type LatLngZoom = { lat: number; lng: number; zoom: number };

interface Props {
  /** Coordenadas que VIENEN DE LA DB (string o number). */
  latitude?: string | number | null;
  longitude?: string | number | null;

  /** Texto opcional para el popup (por ejemplo: “Col. X, Mpio Y, Depto Z”). */
  locationName?: string;

  /** Geocódigo opcional (solo lo muestra en el popup si lo pasas). */
  geocode?: string | null;

  /** Callback cuando el usuario hace clic en el mapa. */
  onPick?: (lat: number, lng: number) => void;

  /** Prefijo para inputs ocultos del formulario. */
  hiddenInputsNamePrefix?: string;

  /** Alto del mapa en px. */
  height?: number;

  /** Desactiva la selección por clic. */
  disablePick?: boolean;

  /** Zoom a usar cuando hay coordenadas válidas. */
  focusZoom?: number;
}

/* Marcador bonito */
const CitizenIcon = L.divIcon({
  html: `
    <div style="
      background: linear-gradient(135deg, #ea4640 0%, #ff6b66 100%);
      width: 36px; height: 36px; border-radius: 50%;
      border: 3px solid white; box-shadow: 0 4px 12px rgba(234, 70, 64, 0.4);
      display: flex; align-items: center; justify-content: center;
      position: relative;
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
    </div>
    <div style="
      width: 0; height: 0; 
      border-left: 6px solid transparent; border-right: 6px solid transparent;
      border-top: 10px solid #ea4640;
      position: absolute; left: 12px; top: 32px;
      filter: drop-shadow(0 2px 3px rgba(234, 70, 64, 0.3));
    "></div>
  `,
  className: "citizen-marker-icon",
  iconSize: [36, 42],
  iconAnchor: [18, 42],
  popupAnchor: [0, -42],
});

const HN_DEFAULT: LatLngZoom = { lat: 14.5, lng: -87.0, zoom: 7 };

function Recenter({ lat, lng, zoom }: LatLngZoom) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom, { animate: true });
  }, [lat, lng, zoom, map]);
  return null;
}

function ClickCatcher({
  onPick,
  disabled,
}: {
  onPick: (lat: number, lng: number) => void;
  disabled?: boolean;
}) {
  useMapEvents({
    click(e) {
      if (!disabled) onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * Este mapa NO usa catálogos ni coordenadas “en duro”.
 * Se centra con las coordenadas que reciba desde el padre (DB) y
 * solo cae al centro de Honduras si no hay coordenadas válidas.
 */
export default function LocationMap({
  latitude,
  longitude,
  locationName,
  geocode,
  onPick,
  hiddenInputsNamePrefix = "location",
  height = 320,
  disablePick = false,
  focusZoom = 12,
}: Props) {
  // Normaliza props a números (o undefined)
  const controlled = useMemo(() => {
    const latNum =
      typeof latitude === "string" ? parseFloat(latitude) : typeof latitude === "number" ? latitude : undefined;
    const lngNum =
      typeof longitude === "string" ? parseFloat(longitude) : typeof longitude === "number" ? longitude : undefined;

    if (typeof latNum === "number" && Number.isFinite(latNum) &&
        typeof lngNum === "number" && Number.isFinite(lngNum)) {
      return { lat: latNum, lng: lngNum } as const;
    }
    return undefined;
  }, [latitude, longitude]);

  const [pos, setPos] = useState<LatLngZoom>(HN_DEFAULT);

  // Reaccionar a cambios de coordenadas provenientes del padre (DB)
  useEffect(() => {
    if (controlled) {
      setPos((p) => ({ ...p, lat: controlled.lat, lng: controlled.lng, zoom: focusZoom }));
    } else {
      setPos(HN_DEFAULT);
    }
  }, [controlled, focusZoom]);

  const handlePick = (lat: number, lng: number) => {
    setPos({ lat, lng, zoom: focusZoom });
    onPick?.(lat, lng);
  };

  // Mostrar marcador si tenemos coordenadas válidas o si el usuario ya hizo click
  const showMarker =
    !!controlled || pos.lat !== HN_DEFAULT.lat || pos.lng !== HN_DEFAULT.lng;

  return (
    <div className="rounded-xl border p-3">
      <h4 className="font-semibold mb-2 text-sm">Ubicación en el Mapa</h4>

      <div style={{ width: "100%", height }}>
        <MapContainer
          center={[pos.lat, pos.lng]}
          zoom={pos.zoom}
          style={{ width: "100%", height: "100%", borderRadius: 8 }}
        >
          <Recenter lat={pos.lat} lng={pos.lng} zoom={pos.zoom} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          




          <ClickCatcher onPick={handlePick} disabled={disablePick} />

          {showMarker && (
            <Marker position={[pos.lat, pos.lng]} icon={CitizenIcon}>
              <Popup>
                {locationName || "Ubicación seleccionada"}
                {geocode && (
                  <>
                    <br />
                    <small>Geocódigo: {geocode}</small>
                  </>
                )}
                <br />
                <small>
                  {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
                </small>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <p className="mt-2 text-xs text-gray-600">
        📍 <b>{locationName ?? "Coordenadas"}</b>{" "}
        <span className="text-gray-500">
          ({pos.lat.toFixed(6)}, {pos.lng.toFixed(6)})
        </span>
        {geocode && <span className="ml-2 text-gray-500">• Geocódigo: {geocode}</span>}
      </p>

      {/* Inputs ocultos para formularios HTML */}
      <input type="hidden" name={`${hiddenInputsNamePrefix}_lat`} value={pos.lat} />
      <input type="hidden" name={`${hiddenInputsNamePrefix}_lng`} value={pos.lng} />
    </div>
  );
}
