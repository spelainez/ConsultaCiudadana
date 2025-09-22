"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Icono personalizado con bandera de Honduras
const HondurasIcon = L.divIcon({
  html: `
    <div style="
      background: linear-gradient(to bottom, #0066CC 0%, #0066CC 33%, #FFFFFF 33%, #FFFFFF 66%, #0066CC 66%, #0066CC 100%);
      width: 30px;
      height: 20px;
      border: 2px solid #333;
      border-radius: 3px;
      position: relative;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #0066CC;
        font-size: 8px;
        font-weight: bold;
        text-shadow: 0 0 2px white;
      ">★</div>
    </div>
    <div style="
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 8px solid #333;
      position: absolute;
      left: 10px;
      top: 20px;
    "></div>
  `,
  className: 'custom-div-icon',
  iconSize: [30, 28],
  iconAnchor: [15, 28],
  popupAnchor: [0, -28],
});

L.Marker.prototype.options.icon = HondurasIcon;

// Component to handle dynamic recentering
interface RecenterMapProps {
  lat: number;
  lng: number;
  zoom: number;
}

function RecenterMap({ lat, lng, zoom }: RecenterMapProps) {
  const map = useMap();
  
  useEffect(() => {
    map.setView([lat, lng], zoom);
  }, [lat, lng, zoom, map]);
  
  return null;
}

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
  // Coordenadas centrales de Honduras como vista inicial
  const [position, setPosition] = useState<{ lat: number; lng: number; zoom: number }>({ 
    lat: 14.5, lng: -87.0, zoom: 7 // Vista general de Honduras
  });

  useEffect(() => {
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        setPosition({ lat, lng, zoom: 14 }); // Zoom específico para localidad
      }
    } else if (geocode) {
      // Coordenadas aproximadas por departamento como fallback
      const coordinates = getApproximateCoordinates(geocode);
      if (coordinates) {
        setPosition(coordinates);
      }
    } else {
      // Reset a vista general de Honduras cuando no hay selecciones
      setPosition({ lat: 14.5, lng: -87.0, zoom: 7 });
    }
  }, [latitude, longitude, geocode]);

  // Función para obtener coordenadas aproximadas basadas en el geocódigo
  function getApproximateCoordinates(geocode: string): { lat: number; lng: number; zoom: number } | null {
    if (!geocode) return null;
    
    // Nuevo formato sin guiones: departamento (2 dígitos) + municipio (2 dígitos) = 4 dígitos
    const departmentCode = geocode.substring(0, 2);
    const municipalityCode = geocode.length >= 4 ? geocode.substring(2, 4) : null;
    
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
    
    if (municipalityCode) {
      // Buscar por código específico de municipio primero
      const specificKey = `${departmentCode}-${municipalityCode}`;
      if (coordinates[specificKey]) {
        return { ...coordinates[specificKey], zoom: 11 }; // Zoom municipio
      }
      
      // Si no hay coordenadas específicas del municipio, usar departamento con zoom de municipio
      if (coordinates[departmentCode]) {
        return { ...coordinates[departmentCode], zoom: 11 }; // Zoom municipio (usando coordenadas de departamento)
      }
    } else if (geocode.length >= 2) {
      // Solo departamento seleccionado
      if (coordinates[departmentCode]) {
        return { ...coordinates[departmentCode], zoom: 8 }; // Zoom departamento
      }
    }
    
    // Fallback a vista general de Honduras si no encuentra coordenadas
    return { lat: 14.5, lng: -87.0, zoom: 7 };
  }

  // El mapa siempre se muestra, sin condición

  return (
    <div className="rounded-xl border p-3" data-testid="location-map-container">
      <h4 className="font-semibold mb-2 text-sm">Ubicación en el Mapa</h4>
      <div className="location-map-wrapper" style={{ width: "100%", height: "320px" }}>
        <MapContainer
          center={[position.lat, position.lng]}
          zoom={position.zoom}
          style={{ height: "100%", width: "100%", borderRadius: "8px" }}
          key={`${position.lat}-${position.lng}-${position.zoom}`} // Force remount on position change
          data-testid="leaflet-map"
        >
          <RecenterMap lat={position.lat} lng={position.lng} zoom={position.zoom} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {/* Solo mostrar marcador cuando hay una selección real */}
          {(geocode || (latitude && longitude)) && (
            <Marker position={[position.lat, position.lng]}>
              <Popup>
                {locationName || 'Ubicación seleccionada'}
                {geocode && <><br /><small>Geocódigo: {geocode}</small></>}
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
      {locationName && (
        <p className="mt-2 text-xs text-gray-600" data-testid="text-location-name">
          📍 <strong>{locationName}</strong>
          {geocode && <span className="ml-2 text-gray-500" data-testid="text-map-geocode">({geocode})</span>}
        </p>
      )}
    </div>
  );
}