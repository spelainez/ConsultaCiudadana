
"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix de iconos de Leaflet
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function MapPicker() {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);

  function LocationMarker() {
    useMapEvents({
      click(e) {
        setPos(e.latlng);
      },
    });
    return pos === null ? null : <Marker position={pos}></Marker>;
  }

  return (
    <div className="rounded-xl border p-3">
      <h3 className="font-bold mb-2">Seleccione su ubicación en el mapa</h3>
      <div style={{ height: 300, width: "100%" }}>
        <MapContainer
          center={{ lat: 14.0723, lng: -87.1921 }} //Tegucigalpa
          zoom={12}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <LocationMarker />
        </MapContainer>
      </div>

      {pos && (
        <p className="mt-2 text-sm">
          Punto seleccionado:{" "}
          <b>
            {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
          </b>
        </p>
      )}
    </div>
  );
}
