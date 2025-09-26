"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix iconos Leaflet
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

type LatLng = { lat: number; lng: number };

type Props = {
  /** Valor controlado (si viene de BD/form). Si se pasa, el mapa lo usa como fuente de verdad */
  value?: LatLng | null;
  /** Valor inicial (si no hay value). Útil para precargar desde BD una sola vez */
  defaultValue?: LatLng | null;
  /** Callback cuando el usuario hace clic en el mapa */
  onChange?: (pos: LatLng) => void;
  /** Alto del mapa en px */
  height?: number;
  /** Zoom inicial cuando no hay coordenadas */
  initialZoom?: number;
  /** Zoom al seleccionar */
  pickZoom?: number;
};

function Recenter({ position, zoom }: { position: LatLng; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, zoom);
  }, [position.lat, position.lng, zoom, map]);
  return null;
}

function ClickCatcher({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function MapPicker({
  value = null,
  defaultValue = null,
  onChange,
  height = 300,
  initialZoom = 12,
  pickZoom = 15,
}: Props) {
  // Estado interno solo si el componente NO es controlado
  const [internal, setInternal] = useState<LatLng | null>(defaultValue);

  // ¿Usamos externo (value) o interno?
  const pos = useMemo<LatLng | null>(() => {
    return value ?? internal;
  }, [value, internal]);

  const center = useMemo<LatLng>(() => {
    return pos ?? { lat: 14.0723, lng: -87.1921 }; // Tegucigalpa
  }, [pos]);

  const zoomWhen = pos ? pickZoom : initialZoom;

  const handlePick = (p: LatLng) => {
    // Si es controlado, avisamos al padre
    if (onChange) onChange(p);
    // Si es no controlado, guardamos aquí
    if (value === null) setInternal(p);
  };

  return (
    <div className="rounded-xl border p-3">
      <h3 className="font-bold mb-2">Seleccione su ubicación en el mapa</h3>

      <div style={{ height, width: "100%" }}>
        <MapContainer
          center={center}
          zoom={zoomWhen}
          style={{ height: "100%", width: "100%" }}
          key={`${center.lat}-${center.lng}-${zoomWhen}`} // asegura re-render al cambiar fuente
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {pos && <Recenter position={pos} zoom={pickZoom} />}
          <ClickCatcher onPick={handlePick} />
          {pos && <Marker position={pos} />}
        </MapContainer>
      </div>

      {pos && (
        <>
          <p className="mt-2 text-sm">
            Punto seleccionado: <b>{pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}</b>
          </p>
          {/* Hidden inputs para formularios HTML clásicos */}
          <input type="hidden" name="lat" value={pos.lat} />
          <input type="hidden" name="lng" value={pos.lng} />
        </>
      )}
    </div>
  );
}
