import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

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
    return pos ? <Marker position={pos} /> : null;
  }

  return (
    <div className="rounded-xl border p-4 space-y-2">

      <div style={{ height: 100, width: "120%" }}>
        <MapContainer
          center={{ lat: 14.0723, lng: -87.1921 }} //Tegucigalpa
          zoom={12}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='<img src=""   width="20"/> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <LocationMarker />
        </MapContainer>

      </div>

      {pos && (
        <>
          <p className="text-sm">
            Punto seleccionado: <b>{pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}</b>
          </p>
          {
            /* Inputs ocultos para enviar coordenadas al backend */
          }
          <input type="hidden" name="lat" value={pos.lat} />
          <input type="hidden" name="lng" value={pos.lng} />
        </>
      )}
    </div>
  );
}
