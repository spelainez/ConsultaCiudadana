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
   Icono tipo bandera 🇭🇳
======================== */
const HondurasIcon = L.divIcon({
  html: `
    <div style="
      background: linear-gradient(to bottom,#0066CC 0%,#0066CC 33%,#FFFFFF 33%,#FFFFFF 66%,#0066CC 66%,#0066CC 100%);
      width: 30px;height: 20px;border: 2px solid #333;border-radius: 3px;
      position: relative;box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">
      <div style="
        position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        color:#0066CC;font-size:8px;font-weight:bold;text-shadow:0 0 2px white;
      ">★</div>
    </div>
    <div style="
      width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;
      border-top:8px solid #333;position:absolute;left:10px;top:20px;
    "></div>
  `,
  className: "custom-div-icon",
  iconSize: [30, 28],
  iconAnchor: [15, 28],
  popupAnchor: [0, -28],
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
            <Marker position={[pos.lat, pos.lng]} icon={HondurasIcon}>
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
        📍 <b>{(locationName ?? "Coordenadas")}</b>{" "}
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
