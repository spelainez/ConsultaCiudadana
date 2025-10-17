// client/src/api/location.ts
export type DepartmentDTO = {
  id: number;
  name: string;
  geocode: string;
  latitude: string | null;
  longitude: string | null;
};

export async function fetchDepartments(): Promise<DepartmentDTO[]> {
  const res = await fetch("/api/departments", { credentials: "include" });
  if (!res.ok) throw new Error("No se pudieron cargar los departamentos");
  return res.json();
}
