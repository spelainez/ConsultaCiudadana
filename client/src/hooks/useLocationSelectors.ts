"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

/** ==== Tipos que coinciden con tu BD ==== */
export type Department = {
  id: number;
  name: string;
  geocode: string;
  latitude?: string | null;
  longitude?: string | null;
};

export type Municipality = {
  id: number;
  name: string;
  departmentId: number;     // department_id en DB
  geocode: string;
  latitude?: string | null;
  longitude?: string | null;
};

export type Locality = {
  id: number;
  name: string;
  municipalityId: number;   // municipality_id en DB
  area: "urbano" | "rural";
  geocode: string;
  latitude?: string | null;
  longitude?: string | null;
};

export type Zone = "urbano" | "rural" | "";

/** Helper para parsear coords de texto/numero */
function n(v?: string | number | null): number | undefined {
  if (v == null) return undefined;
  const num = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(num) ? (num as number) : undefined;
}

/** ===== Hook principal ===== */
export function useLocationSelectors(params: {
  departmentId?: number | null;
  municipalityId?: number | null;
  localityId?: number | null; // <- NUEVO
  zone?: Zone;
}) {
  const { departmentId, municipalityId, localityId, zone = "" } = params;

  /** Departamentos */
  const depQ = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  /** Municipios del depto seleccionado */
  const munQ = useQuery<Municipality[]>({
    queryKey: departmentId ? [`/api/municipalities/${departmentId}`] : [],
    enabled: !!departmentId,
  });

  /** Localidades del municipio seleccionado */
  const locQ = useQuery<Locality[]>({
    queryKey: municipalityId ? [`/api/localities/${municipalityId}`] : [],
    enabled: !!municipalityId,
  });

  /** Seleccionados */
  const selectedDepartment = useMemo(
    () => depQ.data?.find((d) => d.id === departmentId) ?? undefined,
    [depQ.data, departmentId]
  );
  const selectedMunicipality = useMemo(
    () => munQ.data?.find((m) => m.id === municipalityId) ?? undefined,
    [munQ.data, municipalityId]
  );

  /** Localidades filtradas por zona */
  const localitiesByZone = useMemo(() => {
    if (!locQ.data) return [] as Locality[];
    if (zone !== "urbano" && zone !== "rural") return [];
    return locQ.data.filter((l) => l.area === zone);
  }, [locQ.data, zone]);

  /** Localidad seleccionada (si hay localityId y coincide con la zona activa) */
  const selectedLocality = useMemo(() => {
    if (!locQ.data || !localityId) return undefined;
    const l = locQ.data.find((x) => x.id === localityId);
    // si hay zona elegida, verifica que coincida
    if (l && (zone === "" || l.area === zone)) return l;
    return undefined;
  }, [locQ.data, localityId, zone]);

  /** Geocódigo combinado (DD-MM; el backend agrega la parte de localidad si aplica) */
  const geocode = useMemo(() => {
    if (!selectedDepartment || !selectedMunicipality) return undefined;
    const depCode = selectedDepartment.geocode;
    const munCode = selectedMunicipality.geocode;
    return `${depCode}-${munCode}`;
  }, [selectedDepartment, selectedMunicipality]);

  /** Coordenadas preferidas para el mapa: localidad seleccionada > municipio > depto */
  const mapCoords = useMemo(() => {
    const lat =
      n(selectedLocality?.latitude) ??
      n(selectedMunicipality?.latitude) ??
      n(selectedDepartment?.latitude);
    const lng =
      n(selectedLocality?.longitude) ??
      n(selectedMunicipality?.longitude) ??
      n(selectedDepartment?.longitude);

    return lat != null && lng != null ? { lat, lng } : undefined;
  }, [selectedLocality, selectedMunicipality, selectedDepartment]);

  const isLoading =
    depQ.isLoading ||
    (departmentId ? munQ.isLoading : false) ||
    (municipalityId ? locQ.isLoading : false);

  return {
    /** datos crudos */
    departments: depQ.data ?? [],
    municipalities: munQ.data ?? [],
    localities: locQ.data ?? [],

    /** derivados */
    localitiesByZone,
    selectedDepartment,
    selectedMunicipality,
    selectedLocality, // <- NUEVO
    geocode,
    mapCoords,

    /** estados */
    isLoading,
    error: depQ.error ?? munQ.error ?? locQ.error ?? null,
  };
}
