import { z } from "zod";

const NAME_MIN = 2;
const NAME_MAX = 50;

const onlyDigits = (s: string) => s.replace(/\D+/g, "");

const identidadRegexPretty = /^(?:\d{13}|\d{4}-\d{4}-\d{5})$/;
const rtnRegexPretty = /^(?:\d{14}|\d{4}-\d{4}-\d{6})$/; 

const emailSchema = z.string().trim().email("Correo inválido");
const nonEmpty = (m: string) => z.string().trim().min(1, m);

const nameRegex = new RegExp(`^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\\s'\\-]{${NAME_MIN},${NAME_MAX}}$`);
const nameSchema = z
  .string()
  .trim()
  .min(NAME_MIN, `Debe tener al menos ${NAME_MIN} caracteres`)
  .max(NAME_MAX, `No más de ${NAME_MAX} caracteres`)
  .regex(nameRegex, "Solo letras, espacios, apóstrofe o guiones");

const phoneStrictSchema = z
  .string()
  .trim()
  .regex(/^\d{8}$/, "Debe tener exactamente 8 dígitos (solo números)");

const identidadSchema = z
  .string()
  .trim()
  .refine((v) => !v || identidadRegexPretty.test(v), "Use 13 dígitos o el formato ####-####-#####")
  .refine((v) => {
    if (!v) return true;
    const digits = onlyDigits(v);
    return digits.length === 13;
  }, "La identidad debe tener 13 dígitos");

const rtnSchema = z
  .string()
  .trim()
  .refine((v) => !v || rtnRegexPretty.test(v), "RTN inválido (14 dígitos o ####-####-######)")
  .refine((v) => {
    if (!v) return true;
    const digits = onlyDigits(v);
    return digits.length === 14;
  }, "El RTN debe tener 14 dígitos");

export const headerSchema = z
  .object({
    personType: z.enum(["natural", "juridica", "anonimo"]).default("natural"),

    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    identity: identidadSchema.optional(),
    email: emailSchema.optional(),

    companyName: nonEmpty("El nombre de la empresa es requerido").optional(),
    rtn: rtnSchema.optional(),
    legalRepresentative: nameSchema.optional(),
    companyContact: z.string().trim().optional(), 

    mobile: phoneStrictSchema.optional(),
    phone: phoneStrictSchema.optional(),
    altEmail: emailSchema.optional(),

    departmentId: z.number().int().positive().optional(),
    municipalityId: z.number().int().positive().optional(),
    zone: z.enum(["urbano", "rural"]).optional(),
    localityId: z.union([z.number().int().positive(), z.literal("otro")]).optional(),
    customLocalityName: z.string().trim().max(80, "Máximo 80 caracteres").optional(),

    latitude: z.string().trim().optional(),
    longitude: z.string().trim().optional(),

    status: z.enum(["active", "archived"]).default("active"),
  })
  .superRefine((data, ctx) => {
    if (!data.departmentId) {
      ctx.addIssue({ code: "custom", path: ["departmentId"], message: "Seleccione un departamento" });
    }
    if (!data.municipalityId) {
      ctx.addIssue({ code: "custom", path: ["municipalityId"], message: "Seleccione un municipio" });
    }
    if (!data.zone) {
      ctx.addIssue({ code: "custom", path: ["zone"], message: "Seleccione la zona" });
      return; 
    }

    const isOtro = data.localityId === "otro";
    if (data.zone === "urbano") {
      if (!isOtro && (!data.localityId || typeof data.localityId !== "number")) {
        ctx.addIssue({ code: "custom", path: ["localityId"], message: "Seleccione su colonia/barrio" });
      }
    } else if (data.zone === "rural") {
      const hasLocNum = typeof data.localityId === "number" && data.localityId > 0;
      if (!hasLocNum && !isOtro) {
        ctx.addIssue({ code: "custom", path: ["localityId"], message: "Seleccione su aldea/caserío" });
      }
    }

    if (isOtro) {
      if (!data.customLocalityName?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["customLocalityName"],
          message: "Escriba el nombre de la colonia/barrio o aldea/caserío",
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

    if (data.personType === "natural") {
      if (!data.firstName?.trim()) {
        ctx.addIssue({ code: "custom", path: ["firstName"], message: "El primer nombre es requerido" });
      }
      if (!data.lastName?.trim()) {
        ctx.addIssue({ code: "custom", path: ["lastName"], message: "El apellido es requerido" });
      }
      if (!data.identity?.trim()) {
        ctx.addIssue({ code: "custom", path: ["identity"], message: "La identidad es requerida" });
      }
    }

    if (data.personType === "juridica") {
      if (!data.companyName?.trim()) {
        ctx.addIssue({ code: "custom", path: ["companyName"], message: "El nombre de la empresa es requerido" });
      }
      if (!data.rtn?.trim()) {
        ctx.addIssue({ code: "custom", path: ["rtn"], message: "El RTN es requerido" });
      }
      if (!data.legalRepresentative?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["legalRepresentative"],
          message: "El representante legal es requerido",
        });
      }
      if (!data.companyContact?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["companyContact"],
          message: "Ingrese correo o teléfono de contacto",
        });
      } else {
        const val = data.companyContact.trim();
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        const isPhone = /^\d{8}$/.test(val);
        if (!isEmail && !isPhone) {
          ctx.addIssue({
            code: "custom",
            path: ["companyContact"],
            message: "Ingrese un correo válido o un teléfono de 8 dígitos (solo números)",
          });
        }
      }
    }

    if (data.personType === "anonimo") {
      const hasEmail = !!data.altEmail || !!data.email;
      const hasPhone = !!data.mobile || !!data.phone;
      if (!hasEmail) {
        ctx.addIssue({ code: "custom", path: ["altEmail"], message: "Correo requerido para anónimo" });
      }
      if (!hasPhone) {
        ctx.addIssue({ code: "custom", path: ["mobile"], message: "Teléfono/celular requerido para anónimo" });
      }
      if (data.firstName?.trim() || data.lastName?.trim() || data.identity?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["personType"],
          message: "Si elige Anónimo, no ingrese nombre/apellido/identidad",
        });
      }
    }
  });

export type HeaderFormInputs = z.input<typeof headerSchema>;  
export type HeaderFormValues = z.output<typeof headerSchema>; 
