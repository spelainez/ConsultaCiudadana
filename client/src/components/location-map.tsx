"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
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

interface LocationMapProps {
  latitude?: string;
  longitude?: string;
  locationName?: string;
  geocode?: string;
}

export default function LocationMap({ 
  latitude, 
  longitude, 
  locationName, 
  geocode 
}: LocationMapProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        setPosition({ lat, lng });
      }
    } else if (geocode) {
      // Coordenadas aproximadas por departamento como fallback
      const coordinates = getApproximateCoordinates(geocode);
      if (coordinates) {
        setPosition(coordinates);
      }
    }
  }, [latitude, longitude, geocode]);

  // Función para obtener coordenadas aproximadas basadas en el geocódigo
  function getApproximateCoordinates(geocode: string): { lat: number; lng: number } | null {
    const parts = geocode.split('-');
    if (parts.length < 2) return null;
    
    const departmentCode = parts[0];
    const municipalityCode = parts[1];
    
    // Coordenadas de las capitales departamentales y municipios principales
    const coordinates: Record<string, { lat: number; lng: number }> = {
      // Atlántida
      '01': { lat: 15.7795, lng: -86.8458 }, // La Ceiba
      '01-01': { lat: 15.7795, lng: -86.8458 }, // La Ceiba
      '01-07': { lat: 15.7774, lng: -87.4579 }, // Tela
      
      // Colón  
      '02': { lat: 15.9167, lng: -85.9333 }, // Trujillo
      '02-01': { lat: 15.9167, lng: -85.9333 }, // Trujillo
      
      // Comayagua
      '03': { lat: 14.4603, lng: -87.6423 }, // Comayagua
      '03-01': { lat: 14.4603, lng: -87.6423 }, // Comayagua
      '03-18': { lat: 14.5935, lng: -87.8439 }, // Siguatepeque
      
      // Copán
      '04': { lat: 14.7679, lng: -89.1552 }, // Santa Rosa de Copán
      '04-01': { lat: 14.7679, lng: -89.1552 }, // Santa Rosa de Copán
      '04-04': { lat: 14.8394, lng: -89.1424 }, // Copán Ruinas
      
      // Cortés
      '05': { lat: 15.5024, lng: -88.0174 }, // San Pedro Sula
      '05-01': { lat: 15.5024, lng: -88.0174 }, // San Pedro Sula
      '05-02': { lat: 15.6108, lng: -87.9539 }, // Choloma
      '05-06': { lat: 15.8285, lng: -87.9442 }, // Puerto Cortés
      '05-12': { lat: 15.4308, lng: -87.9027 }, // La Lima
      
      // Choluteca
      '06': { lat: 13.3097, lng: -87.1914 }, // Choluteca
      '06-01': { lat: 13.3097, lng: -87.1914 }, // Choluteca
      
      // El Paraíso
      '07': { lat: 14.0311, lng: -86.5775 }, // Danlí
      '07-03': { lat: 14.0311, lng: -86.5775 }, // Danlí
      
      // Francisco Morazán
      '08': { lat: 14.0723, lng: -87.1921 }, // Tegucigalpa
      '08-01': { lat: 14.0723, lng: -87.1921 }, // Distrito Central (Tegucigalpa)
      
      // Gracias a Dios
      '09': { lat: 15.0097, lng: -84.9639 }, // Puerto Lempira
      
      // Intibucá
      '10': { lat: 14.3167, lng: -88.1667 }, // La Esperanza
      
      // Islas de la Bahía
      '11': { lat: 16.3097, lng: -86.5419 }, // Roatán
      '11-01': { lat: 16.3097, lng: -86.5419 }, // Roatán
      
      // La Paz
      '12': { lat: 14.3167, lng: -87.6833 }, // La Paz
      
      // Lempira
      '13': { lat: 14.5833, lng: -88.6167 }, // Gracias
      
      // Ocotepeque
      '14': { lat: 14.4333, lng: -89.1833 }, // Ocotepeque
      
      // Olancho
      '15': { lat: 14.8667, lng: -86.0833 }, // Juticalpa
      
      // Santa Bárbara
      '16': { lat: 14.9167, lng: -88.2167 }, // Santa Bárbara
      
      // Valle
      '17': { lat: 13.3667, lng: -87.6167 }, // Nacaome
      
      // Yoro
      '18': { lat: 15.1333, lng: -87.1333 }, // Yoro
      '18-04': { lat: 15.4000, lng: -87.8167 }, // El Progreso
    };
    
    // Buscar por código específico de municipio primero, luego por departamento
    const specificKey = `${departmentCode}-${municipalityCode}`;
    if (coordinates[specificKey]) {
      return coordinates[specificKey];
    }
    
    if (coordinates[departmentCode]) {
      return coordinates[departmentCode];
    }
    
    // Fallback a Tegucigalpa si no encuentra coordenadas
    return { lat: 14.0723, lng: -87.1921 };
  }

  if (!position) {
    return (
      <div className="rounded-xl border p-3 bg-gray-50">
        <h4 className="font-semibold mb-2 text-sm text-gray-600">Ubicación en el Mapa</h4>
        <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
          Complete la selección de ubicación para ver el mapa
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-3">
      <h4 className="font-semibold mb-2 text-sm">Ubicación en el Mapa</h4>
      <div style={{ height: 200, width: "100%" }}>
        <MapContainer
          center={position}
          zoom={13}
          style={{ height: "100%", width: "100%", borderRadius: "8px" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <Marker position={position} />
        </MapContainer>
      </div>
      {locationName && (
        <p className="mt-2 text-xs text-gray-600">
          📍 <strong>{locationName}</strong>
          {geocode && <span className="ml-2 text-gray-500">({geocode})</span>}
        </p>
      )}
    </div>
  );
}