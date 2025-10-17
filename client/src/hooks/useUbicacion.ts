import { useQuery } from "@tanstack/react-query";

const BASE = ""; 

export type Department = { id: number; name: string; geocode: string; latitude?: string | null; longitude?: string | null };
export type Municipality = { id: number; name: string; geocode: string; departmentId: number; latitude?: string | null; longitude?: string | null };
export type Locality = { id: number; name: string; area: "urbano" | "rural"; geocode: string; municipalityId: number; latitude?: string | null; longitude?: string | null };

export function useDepartments() {
  return useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/departments`);
      if (!res.ok) throw new Error("Error cargando departamentos");
      return res.json();
    },
  });
}

export function useMunicipalities(departmentId?: number) {
  return useQuery<Municipality[]>({
    queryKey: ["municipalities", departmentId],
    queryFn: async () => {
      if (!departmentId) return [];
      const res = await fetch(`${BASE}/api/municipalities/${departmentId}`);
      if (!res.ok) throw new Error("Error cargando municipios");
      return res.json();
    },
    enabled: !!departmentId,
  });
}

export function useLocalities(municipalityId?: number) {
  return useQuery<Locality[]>({
    queryKey: ["localities", municipalityId],
    queryFn: async () => {
      if (!municipalityId) return [];
      const res = await fetch(`${BASE}/api/localities/${municipalityId}`);
      if (!res.ok) throw new Error("Error cargando localidades");
      return res.json();
    },
    enabled: !!municipalityId,
  });
}
