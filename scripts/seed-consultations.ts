// scripts/seed-consultations.ts
import "dotenv/config";
// Soporte para alias de TS como @shared/schema (si los usas)
import "tsconfig-paths/register";

import { storage } from "../server/storage";
type Zone = "urbano" | "rural";

async function pickLocation() {
  const depts = await storage.getDepartments();
  if (!depts.length) throw new Error("No hay departamentos cargados.");

  const dept = depts[Math.floor(Math.random() * depts.length)];
  const munis = await storage.getMunicipalitiesByDepartment(dept.id);
  if (!munis.length) throw new Error(`El dpto ${dept.id} no tiene municipios.`);

  const muni = munis[Math.floor(Math.random() * munis.length)];
  const locs = await storage.getLocalitiesByMunicipality(muni.id);

  const urbano = locs.find((l) => l.area === "urbano");
  const rural  = locs.find((l) => l.area === "rural");

  return { dept, muni, urbano, rural };
}

async function run() {
  const { dept, muni, urbano, rural } = await pickLocation();

  const samples = [
    {
      personType: "natural",
      firstName: "María",
      lastName: "García",
      identity: "0801-1988-01234",
      email: "maria@example.com",
      mobile: "9999-8888",

      departmentId: dept.id,
      municipalityId: muni.id,
      zone: "urbano" as Zone,
      localityId: urbano?.id,

      message: "Falta alumbrado público en nuestra colonia.",
      selectedSectors: ["Infraestructura", "Seguridad"],
      images: [],
      status: "active" as const,
    },
    {
      personType: "juridica",
      companyName: "Servicios del Norte S.A.",
      rtn: "08019000012345",
      legalRepresentative: "Carlos López",
      companyContact: "info@servicioshn.com",
      phone: "2233-4455",

      departmentId: dept.id,
      municipalityId: muni.id,
      zone: "rural" as Zone,
      localityId: rural?.id,
      // Si no tienes localidades rurales en BD:
      // customLocalityName: "Aldea El Paraíso",

      message: "Solicitud de mejora de acceso vial a nuestra planta.",
      selectedSectors: ["Transporte", "Economía"],
      images: [],
      status: "active" as const,
    },
    {
      personType: "anonimo",

      departmentId: dept.id,
      municipalityId: muni.id,
      zone: "urbano" as Zone,
      localityId: urbano?.id,

      message: "Denuncia de aguas residuales en la calle principal.",
      selectedSectors: ["Salud", "Ambiente"],
      images: [],
      status: "active" as const,
    },
  ];

  for (const s of samples) {
    const created = await storage.createConsultation(s as any);
    console.log("Insertado:", {
      id: created.id,
      geocode: created.geocode,
      personType: created.personType,
    });
  }

  const { total } = await storage.getConsultations({ limit: 1 });
  console.log("Total de consultas en la BD:", total);
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });