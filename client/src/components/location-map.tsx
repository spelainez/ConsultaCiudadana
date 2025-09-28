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

/* ========================
   Marcador ciudadano atractivo 🇭🇳
======================== */
const CitizenIcon = L.divIcon({
  html: `
    <div style="
      background: linear-gradient(135deg, #ea4640 0%, #ff6b66 100%);
      width: 36px; height: 36px; border-radius: 50%;
      border: 3px solid white; box-shadow: 0 4px 12px rgba(234, 70, 64, 0.4);
      display: flex; align-items: center; justify-content: center;
      position: relative;
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style="
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
      ">
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

/* ========================
   Tipos y utilidades
======================== */
type LatLngZoom = { lat: number; lng: number; zoom: number };

interface Props {
  /** Coordenadas controladas (texto o número). Si existen, se priorizan sobre geocode */
  latitude?: string | number;
  longitude?: string | number;

  /** Nombre de la ubicación (para el popup) */
  locationName?: string;

  /** Geocódigo: "DD" (depto) o "DDMM" (muni) SIN guiones */
  geocode?: string;

  /** Callback cuando el usuario hace clic en el mapa */
  onPick?: (lat: number, lng: number) => void;

  /** Prefijo para inputs ocultos del formulario (p.ej. 'consulta') */
  hiddenInputsNamePrefix?: string;

 
  height?: number;
}

/** Centros aproximados de deptos/municipios (agrega los que necesites) */
const COORDS: Record<string, { lat: number; lng: number }> = {
  // Departamentos
  "01": { lat: 15.7795, lng: -86.8458 }, // Atlántida (La Ceiba)
  "02": { lat: 15.9167, lng: -85.9333 }, // Colón (Trujillo)
  "03": { lat: 14.4603, lng: -87.6423 }, // Comayagua
  "04": { lat: 14.7679, lng: -89.1552 }, // Copán
  "05": { lat: 15.5024, lng: -88.0174 }, // Cortés (SPS)
  "06": { lat: 13.3097, lng: -87.1914 }, // Choluteca
  "07": { lat: 14.0311, lng: -86.5775 }, // El Paraíso (Danlí)
  "08": { lat: 14.0723, lng: -87.1921 }, // Fco. Morazán (Tegucigalpa)
  "09": { lat: 15.0097, lng: -84.9639 }, // Gracias a Dios
  "10": { lat: 14.3167, lng: -88.1667 }, // Intibucá (La Esperanza)
  "11": { lat: 16.3097, lng: -86.5419 }, // Islas de la Bahía (Roatán)
  "12": { lat: 14.3167, lng: -87.6833 }, // La Paz
  "13": { lat: 14.5833, lng: -88.6167 }, // Lempira (Gracias)
  "14": { lat: 14.4333, lng: -89.1833 }, // Ocotepeque
  "15": { lat: 14.8667, lng: -86.0833 }, // Olancho (Juticalpa)
  "16": { lat: 14.9167, lng: -88.2167 }, // Santa Bárbara
  "17": { lat: 13.3667, lng: -87.6167 }, // Valle (Nacaome)
  "18": { lat: 15.1333, lng: -87.1333 }, // Yoro


  "0101": { lat: 15.7795, lng: -86.8458 }, // La Ceiba
  "0107": { lat: 15.7774, lng: -87.4579 }, // Tela
  "0318": { lat: 14.5935, lng: -87.8439 }, // Siguatepeque
  "0401": { lat: 14.7679, lng: -89.1552 }, // Santa Rosa de Copán
  "0404": { lat: 14.8394, lng: -89.1424 }, // Copán Ruinas
  "0501": { lat: 15.5024, lng: -88.0174 }, // San Pedro Sula
  "0502": { lat: 15.6108, lng: -87.9539 }, // Choloma
  "0512": { lat: 15.4308, lng: -87.9027 }, // La Lima
  "0703": { lat: 14.0311, lng: -86.5775 }, // Danlí
  "0801": { lat: 14.0723, lng: -87.1921 }, // Distrito Central
  "1101": { lat: 16.3097, lng: -86.5419 }, // Roatán
  "1804": { lat: 15.4, lng: -87.8167 },     // El Progreso
};


const HN_DEFAULT: LatLngZoom = { lat: 14.5, lng: -87.0, zoom: 7 };
function Recenter({ lat, lng, zoom }: LatLngZoom) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom);
  }, [lat, lng, zoom, map]);
  return null;
}

function ClickCatcher({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}


export default function LocationMap({
  latitude,
  longitude,
  locationName,
  geocode,
  onPick,
  hiddenInputsNamePrefix = "location",
  height = 320,
}: Props) {
  
  const [pos, setPos] = useState<LatLngZoom>(HN_DEFAULT);

 
  const controlled = useMemo(() => {
    const latNum =
      typeof latitude === "string" ? parseFloat(latitude) : typeof latitude === "number" ? latitude : undefined;
    const lngNum =
      typeof longitude === "string" ? parseFloat(longitude) : typeof longitude === "number" ? longitude : undefined;
    if (typeof latNum === "number" && !isNaN(latNum) && typeof lngNum === "number" && !isNaN(lngNum)) {
      return { lat: latNum, lng: lngNum } as const;
    }
    return null;
  }, [latitude, longitude]);

  useEffect(() => {
    if (controlled) {
      setPos({ lat: controlled.lat, lng: controlled.lng, zoom: 15 });
      return;
    }

    if (geocode && (geocode.length === 2 || geocode.length === 4)) {
      const key = geocode;
      const deptKey = geocode.substring(0, 2);
      const found = COORDS[key] || COORDS[deptKey];
      if (found) {
        setPos({
          lat: found.lat,
          lng: found.lng,
          zoom: geocode.length === 4 ? 11 : 8,
        });
        return;
      }
    }

    setPos(HN_DEFAULT);
  }, [controlled, geocode]);

  // Cuando el usuario hace clic en el mapa
  const handlePick = (lat: number, lng: number) => {
    setPos({ lat, lng, zoom: 15 });
    onPick?.(lat, lng);
  };

  const showMarker = Boolean(geocode || controlled || (pos.lat !== HN_DEFAULT.lat || pos.lng !== HN_DEFAULT.lng));

  return (
    <div className="rounded-xl border p-3">
      <h4 className="font-semibold mb-2 text-sm">Ubicación en el Mapa</h4>

      <div style={{ width: "100%", height }}>
        <MapContainer
          center={[pos.lat, pos.lng]}
          zoom={pos.zoom}
          style={{ width: "100%", height: "100%", borderRadius: 8 }}
          key={`${pos.lat}-${pos.lng}-${pos.zoom}`} 
        >
          <Recenter lat={pos.lat} lng={pos.lng} zoom={pos.zoom} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <ClickCatcher onPick={handlePick} />

          {showMarker && (
            <Marker position={[pos.lat, pos.lng]} icon={CitizenIcon}>
              <Popup>
                {locationName || "Ubicación seleccionada"}
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
        📍 <b>{(locationName ?? "Coordenadas")}</b>{" "}
        <span className="text-gray-500">
          ({pos.lat.toFixed(6)}, {pos.lng.toFixed(6)})
        </span>
      </p>

      {/* Inputs ocultos para formularios HTML */}
      <input type="hidden" name={`${hiddenInputsNamePrefix}_lat`} value={pos.lat} />
      <input type="hidden" name={`${hiddenInputsNamePrefix}_lng`} value={pos.lng} />
    </div>
  );
}
