import { z } from "zod";

const NAME_MIN = 2;
const NAME_MAX = 50;

const emailSchema = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
    message: "Correo inválido",
  });

const nonEmpty = (m: string) => z.string().trim().min(1, m);

const nameRegex = new RegExp(
  `^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\\s'\\-]{${NAME_MIN},${NAME_MAX}}$`
);

const nameSchema = z
  .string()
  .trim()
  .min(NAME_MIN, `Debe tener al menos ${NAME_MIN} caracteres`)
  .max(NAME_MAX, `No más de ${NAME_MAX} caracteres`)
  .regex(nameRegex, "Solo letras, espacios, apóstrofe o guiones");

const phoneStrictSchema = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^\d{8}$/.test(v), {
    message: "Debe tener exactamente 8 dígitos (solo números)",
  });

export const headerSchema = z
  .object({
    personType: z.enum(["natural", "juridica"]).default("natural"),

    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    email: emailSchema.optional(), 

    companyName: nonEmpty(
      "El nombre de la institución u organización es requerido"
    ).optional(),
    legalRepresentative: nameSchema.optional(),

    mobile: phoneStrictSchema.optional(),
    phone: phoneStrictSchema.optional(),

    departmentId: z.number().int().positive().optional(),
    municipalityId: z.number().int().positive().optional(),
    zone: z.enum(["urbano", "rural"]).optional(),
    localityId: z
      .union([z.number().int().positive(), z.literal("otro")])
      .optional(),
    customLocalityName: z
      .string()
      .trim()
      .max(80, "Máximo 80 caracteres")
      .optional(),

    latitude: z.string().trim().optional(),
    longitude: z.string().trim().optional(),

    status: z.enum(["active", "archived"]).default("active"),
  })
  .superRefine((data, ctx) => {
    if (!data.departmentId) {
      ctx.addIssue({
        code: "custom",
        path: ["departmentId"],
        message: "Seleccione un departamento",
      });
    }
    if (!data.municipalityId) {
      ctx.addIssue({
        code: "custom",
        path: ["municipalityId"],
        message: "Seleccione un municipio",
      });
    }
    if (!data.zone) {
      ctx.addIssue({
        code: "custom",
        path: ["zone"],
        message: "Seleccione la zona",
      });
      return;
    }

    const isOtro = data.localityId === "otro";

    if (data.zone === "urbano") {
      if (!isOtro && (!data.localityId || typeof data.localityId !== "number")) {
        ctx.addIssue({
          code: "custom",
          path: ["localityId"],
          message: "Seleccione su colonia/barrio",
        });
      }
    } else if (data.zone === "rural") {
      const hasLocNum =
        typeof data.localityId === "number" && data.localityId > 0;
      if (!hasLocNum && !isOtro) {
        ctx.addIssue({
          code: "custom",
          path: ["localityId"],
          message: "Seleccione su aldea/caserío",
        });
      }
    }

    if (isOtro) {
      if (!data.customLocalityName?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["customLocalityName"],
          message:
            "Escriba el nombre de la colonia/barrio o aldea/caserío",
        });
      }
      if (!data.latitude || !data.longitude) {
        ctx.addIssue({
          code: "custom",
          path: ["latitude"],
          message: "Haz click en el mapa para fijar la ubicación",
        });
      }
    }

    // ✅ Reglas por tipo de persona

    // Persona NATURAL: solo valida nombre y apellido
    if (data.personType === "natural") {
      if (!data.firstName?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["firstName"],
          message: "El primer nombre es requerido",
        });
      }
      if (!data.lastName?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["lastName"],
          message: "El apellido es requerido",
        });
      }
    }

    if (data.personType === "juridica") {
      if (!data.companyName?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["companyName"],
          message:
            "El nombre de la institución u organización es requerido",
        });
      }
      if (!data.legalRepresentative?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["legalRepresentative"],
          message: "La persona de contacto es requerida",
        });
      }
    }
  });

export type HeaderFormInputs = z.input<typeof headerSchema>;
export type HeaderFormValues = z.output<typeof headerSchema>;

