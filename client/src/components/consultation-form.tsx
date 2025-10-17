"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DepartmentSelect from "@/components/location/DepartmentSelect";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, Plus, ChevronsUpDown, Trash2, Check, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import LocationMap from "@/components/location-map";

import aldeasData from "@shared/aldeas-honduras.json";

type Department = {
  id: number;
  name: string;
  geocode: string;
  latitude?: string | null;
  longitude?: string | null;
};
type Municipality = {
  id: number;
  name: string;
  geocode: string;
  departmentId: number;
  latitude?: string | null;
  longitude?: string | null;
};
type Locality = {
  id: number | string;
  name: string;
  area: "urbano" | "rural";
  municipalityId: number;
  geocode?: string | null;
  latitude?: string | null;
  longitude?: string | null;
};

const headerSchema = z
  .object({
    personType: z.enum(["natural", "juridica", "anonimo"]).default("natural"),

    firstName: z.string().trim().optional(),
    lastName: z.string().trim().optional(),
    identity: z.string().trim().optional(),
    email: z.string().email().optional(),

    companyName: z.string().trim().optional(),
    rtn: z.string().trim().optional(),
    legalRepresentative: z.string().trim().optional(),
    companyContact: z.string().trim().optional(),

    mobile: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    altEmail: z.string().email().optional(),

    departmentId: z.number().int().positive().optional(),
    municipalityId: z.number().int().positive().optional(),
    zone: z.enum(["urbano", "rural"]).optional(),
    localityId: z.union([z.number().int().positive(), z.literal("otro")]).optional(),
    customLocalityName: z.string().trim().optional(),

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

    if (data.personType === "anonimo") {
      if (!data.email && !data.altEmail) {
        ctx.addIssue({ code: "custom", path: ["altEmail"], message: "Correo requerido para anónimo" });
      }
      if (!data.mobile && !data.phone) {
        ctx.addIssue({ code: "custom", path: ["mobile"], message: "Teléfono/celular requerido para anónimo" });
      }
    }
  });

type HeaderFormData = z.input<typeof headerSchema>;

type SectorDetail = { message: string; files: File[] };

export default function ConsultationForm() {
  const { toast } = useToast();

  const [personType, setPersonType] = useState<"natural" | "juridica" | "anonimo">("natural");
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedZone, setSelectedZone] = useState<"" | "urbano" | "rural">("");

  const [openDepartment, setOpenDepartment] = useState(false); 
  const [openMunicipality, setOpenMunicipality] = useState(false);
  const [openLocality, setOpenLocality] = useState(false);
  const [openZone, setOpenZone] = useState(false);

  const [detailsBySector, setDetailsBySector] = useState<Record<string, SectorDetail>>({});

  const [mapLat, setMapLat] = useState<string | undefined>(undefined);
  const [mapLng, setMapLng] = useState<string | undefined>(undefined);
  const [geocoding, setGeocoding] = useState(false);


  const form = useForm<HeaderFormData>({
    resolver: zodResolver(headerSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      personType: "natural",
      status: "active",
    },
  });

  const departmentId = form.watch("departmentId");
  const municipalityId = form.watch("municipalityId");
  const localityId = form.watch("localityId");
  const customLocalityName = form.watch("customLocalityName");
  const zone = form.watch("zone");

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: async () => {
      const r = await fetch("/api/departments", { credentials: "include" });
      if (!r.ok) throw new Error("Error cargando departamentos");
      return r.json();
    },
    staleTime: 1000 * 60 * 10,
  });

  const {
    data: municipalities = [],
    isLoading: loadingMunis,
  } = useQuery<Municipality[]>({
    queryKey: ["municipalities", departmentId ?? null],
    enabled: !!departmentId,
    queryFn: async () => {
      const r = await fetch(`/api/municipalities/${departmentId}`, { credentials: "include" });
      if (!r.ok) throw new Error("Error cargando municipios");
      return r.json();
    },
    staleTime: 1000 * 60 * 10,
  });

  const {
    data: dbLocalities = [],
    isLoading: loadingLocs,
  } = useQuery<Locality[]>({
    queryKey: ["localities", municipalityId ?? null],
    enabled: !!municipalityId,
    queryFn: async () => {
      const r = await fetch(`/api/localities/${municipalityId}`, { credentials: "include" });
      if (!r.ok) throw new Error("Error cargando localidades");
      return r.json();
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: allSectors = [] } = useQuery<any[]>({
    queryKey: ["/api/sectors"],
    queryFn: async () => {
      const r = await fetch("/api/sectors", { credentials: "include" });
      if (!r.ok) throw new Error("Error cargando sectores");
      return r.json();
    },
    staleTime: 1000 * 60 * 10,
  });

  const ruralAldeasForMunicipality = useMemo(() => {
    if (!departmentId || !municipalityId || selectedZone !== "rural") return [];
    const dept = departments.find((d) => d.id === departmentId);
    const muni = municipalities.find((m) => m.id === municipalityId);
    if (!dept || !muni) return [];

    const key = `${dept.geocode}${muni.geocode}`;
    const entry = (aldeasData as any)[key];
    if (!entry) return [];

    return (entry.aldeas as Array<{ name: string }>).map((a) => ({
      id: a.name,
      name: a.name,
      area: "rural" as const,
      municipalityId,
      latitude: null,
      longitude: null,
    })) as Locality[];
  }, [departmentId, municipalityId, selectedZone, departments, municipalities]);

  const localityOptions: Locality[] = useMemo(() => {
    if (!municipalityId || !zone) return [];
    const base =
      zone === "urbano"
        ? dbLocalities.filter((l) => l.area === "urbano" && l.municipalityId === municipalityId)
        : ruralAldeasForMunicipality;

    return [
      ...base,
      { id: "otro", name: "Otro (escribir manualmente)", area: zone, municipalityId } as any,
    ];
  }, [municipalityId, zone, dbLocalities, ruralAldeasForMunicipality]);

  useEffect(() => {
    if (localityId !== "otro") return;
    if (!customLocalityName || !departmentId || !municipalityId) return;

    const dept = departments.find((d) => d.id === departmentId);
    const muni = municipalities.find((m) => m.id === municipalityId);
    if (!dept || !muni) return;

    const q = `${customLocalityName}, ${muni.name}, ${dept.name}, Honduras`;
    setGeocoding(true);

    const t = setTimeout(async () => {
      try {
        const url =
          "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=hn&q=" +
          encodeURIComponent(q);
        const res = await fetch(url, { headers: { "Accept-Language": "es" } });
        if (res.ok) {
          const data = (await res.json()) as Array<{ lat: string; lon: string }>;
          if (data?.[0]) {
            setMapLat(data[0].lat);
            setMapLng(data[0].lon);
            form.setValue("latitude", data[0].lat);
            form.setValue("longitude", data[0].lon);
          }
        }
      } catch {
      } finally {
        setGeocoding(false);
      }
    }, 700);

    return () => clearTimeout(t);
  }, [localityId, customLocalityName, departmentId, municipalityId, departments, municipalities, form]);

  const mapCenterLat = useMemo(() => {
    if (mapLat) return mapLat;
    const selLoc =
      typeof localityId === "number" ? dbLocalities.find((l) => l.id === localityId) : undefined;
    if (selLoc?.latitude) return selLoc.latitude;
    const selMuni = municipalities.find((m) => m.id === municipalityId);
    if (selMuni?.latitude) return selMuni.latitude;
    const selDept = departments.find((d) => d.id === departmentId);
    if (selDept?.latitude) return selDept.latitude;
    return undefined;
  }, [mapLat, localityId, dbLocalities, municipalities, municipalityId, departments, departmentId]);

  const mapCenterLng = useMemo(() => {
    if (mapLng) return mapLng;
    const selLoc =
      typeof localityId === "number" ? dbLocalities.find((l) => l.id === localityId) : undefined;
    if (selLoc?.longitude) return selLoc.longitude;
    const selMuni = municipalities.find((m) => m.id === municipalityId);
    if (selMuni?.longitude) return selMuni.longitude;
    const selDept = departments.find((d) => d.id === departmentId);
    if (selDept?.longitude) return selDept.longitude;
    return undefined;
  }, [mapLng, localityId, dbLocalities, municipalities, municipalityId, departments, departmentId]);

  const createMultiMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/consultations/multi", payload);
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Error al crear consultas");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "¡Consulta enviada exitosamente!",
        description: "Gracias por tu participación.",
      });
      form.reset();
      setSelectedSectors([]);
      setDetailsBySector({});
      setPersonType("natural");
      setSelectedZone("");
      setMapLat(undefined);
      setMapLng(undefined);
      queryClient.invalidateQueries({ queryKey: ["/api/consultations"] });
    },
    onError: () => {
      toast({
        title: "Faltan datos",
        description: "Revisa la ubicación y completa mensaje + foto por cada sector.",
        variant: "destructive",
      });
    },
  });

  const onInvalid = () => {
    toast({
      title: "Faltan datos",
      description: "Revisa la ubicación y completa mensaje + foto por cada sector.",
      variant: "destructive",
    });
  };

  const onSubmit: SubmitHandler<HeaderFormData> = async (data) => {
    if (selectedSectors.length === 0) {
      toast({
        title: "Faltan datos",
        description: "Selecciona al menos un sector.",
        variant: "destructive",
      });
      return;
    }
    for (const sec of selectedSectors) {
      const det = detailsBySector[sec];
      if (!det || !det.message?.trim() || !det.files?.length) {
        toast({
          title: "Faltan datos",
          description: `Completa mensaje y al menos 1 foto para ${sec}.`,
          variant: "destructive",
        });
        return;
      }
    }

    const items: Array<{ sector: string; message: string; images: string[] }> = [];
    for (const sec of selectedSectors) {
      const det = detailsBySector[sec];
      const fd = new FormData();
      det.files.forEach((f) => fd.append("images", f));
      let imageUrls: string[] = [];
      try {
        const up = await fetch("/api/upload-images", { method: "POST", body: fd });
        if (!up.ok) throw new Error();
        const payload = await up.json();
        imageUrls = payload.imageUrls ?? [];
      } catch {
        toast({
          title: "Error al subir imágenes",
          description: `No se pudieron subir las fotos de ${sec}.`,
          variant: "destructive",
        });
        return;
      }
      items.push({ sector: sec, message: det.message.trim(), images: imageUrls });
    }

    const header = {
      ...data,
      personType,
      latitude: mapLat ?? data.latitude,
      longitude: mapLng ?? data.longitude,
    };

    createMultiMutation.mutate({ header, items });
  };

  useEffect(() => {
    form.setValue("personType", personType);
    if (personType === "anonimo") {
      form.setValue("firstName", undefined);
      form.setValue("lastName", undefined);
      form.setValue("identity", undefined);
      form.setValue("email", undefined);
      form.setValue("companyName", undefined);
      form.setValue("rtn", undefined);
      form.setValue("legalRepresentative", undefined);
      form.setValue("companyContact", undefined);
    }
  }, [personType]);

  return (
    <div className="consultation-container">
      <div className="container mt-4">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-10">
            <Card className="form-section">
              <CardHeader>
                <CardTitle className="text-center">
                  <h2 className="mb-1 creative-title">Construyamos una Honduras Próspera Juntos</h2>
                </CardTitle>
              </CardHeader>

              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} noValidate className="space-y-6">
                  {}
                  <Card className="form-section-card">
                    <CardHeader className="form-section-header">
                      <h3 className="form-section-title">1. Tipo de Persona</h3>
                      <p className="form-section-description">Seleccione el tipo de persona que mejor lo describa</p>
                    </CardHeader>
                    <CardContent>
                      <div className="row g-3 mb-4">
                        {}
                        <div className="col-md-4">
                          <div
                            className={`person-type-card ${personType === "natural" ? "selected" : ""}`}
                            onClick={() => setPersonType("natural")}
                            role="button"
                            tabIndex={0}
                          >
                            <div className="person-type-content">
                              <h6 className="mb-0 text-dark-emphasis">Persona Natural</h6>
                            </div>
                          </div>
                        </div>
                        {}
                        <div className="col-md-4">
                          <div
                            className={`person-type-card ${personType === "juridica" ? "selected" : ""}`}
                            onClick={() => setPersonType("juridica")}
                            role="button"
                            tabIndex={0}
                          >
                            <div className="person-type-content">
                              <h6 className="mb-0 text-dark-emphasis">Persona Jurídica</h6>
                            </div>
                          </div>
                        </div>
                        {}
                        <div className="col-md-4">
                          <div
                            className={`person-type-card ${personType === "anonimo" ? "selected" : ""}`}
                            onClick={() => setPersonType("anonimo")}
                            role="button"
                            tabIndex={0}
                          >
                            <div className="person-type-content">
                              <h6 className="mb-0 text-dark-emphasis">Anónimo</h6>
                            </div>
                          </div>
                        </div>
                      </div>

                      {}
                      {personType === "natural" && (
                        <div className="conditional-fields mt-4">
                          <h6 className="mb-3 text-muted">Información de Persona Natural</h6>
                          <div className="row mb-3">
                            <div className="col-md-6">
                              <Label htmlFor="firstName">Primer Nombre</Label>
                              <Input id="firstName" {...form.register("firstName")} placeholder="Ingrese su primer nombre" />
                            </div>
                            <div className="col-md-6">
                              <Label htmlFor="lastName">Apellido</Label>
                              <Input id="lastName" {...form.register("lastName")} placeholder="Ingrese su apellido" />
                            </div>
                          </div>
                          <div className="row mb-3">
                            <div className="col-md-6">
                              <Label htmlFor="identity">Número de Identidad</Label>
                              <Input id="identity" placeholder="Ingrese su número de identidad" {...form.register("identity")} />
                            </div>
                            <div className="col-md-6">
                              <Label htmlFor="email">Correo Electrónico</Label>
                              <Input id="email" type="email" {...form.register("email")} placeholder="Ingrese su correo" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Datos JURÍDICA */}
                      {personType === "juridica" && (
                        <div className="conditional-fields mt-4">
                          <h6 className="mb-3 text-muted">Información de Persona Jurídica</h6>
                          <div className="row mb-3">
                            <div className="col-md-6">
                              <Label htmlFor="companyName">Nombre de la Empresa</Label>
                              <Input id="companyName" {...form.register("companyName")} placeholder="Nombre de la empresa" />
                            </div>
                            <div className="col-md-6">
                              <Label htmlFor="rtn">RTN</Label>
                              <Input id="rtn" {...form.register("rtn")} placeholder="RTN" />
                            </div>
                          </div>
                          <div className="row mb-3">
                            <div className="col-md-6">
                              <Label htmlFor="legalRepresentative">Representante Legal</Label>
                              <Input id="legalRepresentative" {...form.register("legalRepresentative")} placeholder="Nombre del representante" />
                            </div>
                            <div className="col-md-6">
                              <Label htmlFor="companyContact">Correo/Teléfono</Label>
                              <Input id="companyContact" {...form.register("companyContact")} placeholder="Correo o teléfono" />
                            </div>
                          </div>
                        </div>
                      )}

                      {}
                      <div className="mt-4">
                        <h6 className="mb-3 text-muted">
                          Información de Contacto{" "}
                          {personType === "anonimo" ? "(requerida para anónimo)" : "(opcional)"}
                        </h6>
                        <div className="row mb-3">
                          <div className="col-md-4">
                            <Label htmlFor="mobile">Celular</Label>
                            <Input id="mobile" placeholder="Celular" {...form.register("mobile")} />
                          </div>
                          <div className="col-md-4">
                            <Label htmlFor="phone">Teléfono Fijo</Label>
                            <Input id="phone" placeholder="Teléfono fijo" {...form.register("phone")} />
                          </div>
                          <div className="col-md-4">
                            <Label htmlFor="altEmail">Correo</Label>
                            <Input id="altEmail" type="email" placeholder="Correo" {...form.register("altEmail")} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {}
                  <Card className="form-section-card">
                    <CardHeader className="form-section-header">
                      <h3 className="form-section-title">2. Ubicación</h3>
                      <p className="form-section-description">Seleccione su ubicación geográfica para una mejor atención</p>
                    </CardHeader>

                    <CardContent>
                     {}
<div className="location-step mb-3">
  <Label className="location-label">1. Departamento *</Label>

  <Popover
    open={openDepartment}
    onOpenChange={(o) => {
      setOpenDepartment(o);
      if (o) {
        setOpenMunicipality(false);
        setOpenLocality(false);
        setOpenZone(false);
      }
    }}
  >
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={openDepartment}
        className="location-select justify-between"
        disabled={departments.length === 0}
      >
        {departmentId
          ? departments.find((d) => d.id === departmentId)?.name
          : "Seleccione su departamento..."}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>

    <PopoverContent
      className="w-full p-0 consultation-dropdown z-[9999]"
      side="bottom"
      align="start"
      sideOffset={4}
      collisionPadding={16}
    >
      <Command>
        <CommandInput placeholder="Buscar departamento..." />
        <CommandList>
          <CommandEmpty>No se encontró el departamento.</CommandEmpty>
          <CommandGroup>
            {departments.map((dep) => (
              <CommandItem
                key={dep.id}
                value={dep.name}
                onSelect={() => {
                  
                  form.setValue("departmentId", Number(dep.id), { shouldValidate: true });
                  form.setValue("municipalityId", undefined);
                  form.setValue("zone", undefined as any);
                  form.setValue("localityId", undefined);
                  form.setValue("customLocalityName", undefined);
                  setSelectedZone("");
                  setMapLat(undefined);
                  setMapLng(undefined);
                  setOpenDepartment(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    departmentId === dep.id ? "opacity-100" : "opacity-0"
                  )}
                />
                {dep.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>

  {form.formState.errors.departmentId && (
    <div className="text-danger small mt-1">
      {form.formState.errors.departmentId.message as string}
    </div>
  )}
</div>
                     {}
<div className="location-step mb-3">
  <Label className="location-label">2. Municipio *</Label>

  <Popover
    open={openMunicipality}
    onOpenChange={(o) => {
      setOpenMunicipality(o);
      if (o) {
        setOpenDepartment(false);
        setOpenLocality(false);
        setOpenZone(false);
      }
    }}
  >
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={openMunicipality}
        className="location-select justify-between"
        disabled={!departmentId || loadingMunis}
      >
        {municipalityId
          ? municipalities.find((m) => m.id === municipalityId)?.name
          : !departmentId
            ? "Primero seleccione un departamento..."
            : "Seleccione su municipio..."}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>

    <PopoverContent
      className="w-full p-0 consultation-dropdown z-[9999]"
      side="bottom"
      align="start"
      sideOffset={4}
      collisionPadding={16}
    >
      <Command>
        <CommandInput placeholder="Buscar municipio..." />
        <CommandList>
          <CommandEmpty>No se encontró el municipio.</CommandEmpty>
          <CommandGroup>
            {municipalities.map((muni) => (
              <CommandItem
                key={muni.id}
                value={muni.name}
                onSelect={() => {
                  form.setValue("municipalityId", Number(muni.id), { shouldValidate: true });
                  form.setValue("zone", undefined as any);
                  form.setValue("localityId", undefined);
                  form.setValue("customLocalityName", undefined);
                  setSelectedZone("");
                  setOpenMunicipality(false);
                  setMapLat(undefined);
                  setMapLng(undefined);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", municipalityId === muni.id ? "opacity-100" : "opacity-0")} />
                {muni.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>

  {form.formState.errors.municipalityId && (
    <div className="text-danger small mt-1">
      {form.formState.errors.municipalityId.message as string}
    </div>
  )}
</div>

                      {}
                      <div className="location-step mb-3">
                        <Label className="location-label">3. Zona *</Label>

                        <Select
                          open={openZone}
                          onOpenChange={(o) => {
                            setOpenZone(o);
                            if (o) {
                              setOpenDepartment(false);
                              setOpenMunicipality(false);
                              setOpenLocality(false);
                            }
                          }}
                          onValueChange={(value) => {
                            const v = value as "urbano" | "rural";
                            setSelectedZone(v);
                            form.setValue("zone", v, { shouldValidate: true });
                            form.setValue("localityId", undefined);
                            form.setValue("customLocalityName", undefined);
                            setMapLat(undefined);
                            setMapLng(undefined);
                            setOpenZone(false); 
                          }}
                          value={selectedZone}
                          disabled={!municipalityId}
                        >
                          <SelectTrigger className="location-select">
                            <SelectValue
                              placeholder={
                                !municipalityId
                                  ? "Primero seleccione un municipio..."
                                  : "Seleccione el tipo de zona..."
                              }
                            />
                          </SelectTrigger>
                          <SelectContent className="consultation-dropdown" position="popper" side="bottom" align="start" sideOffset={4} collisionPadding={16}>
                            <SelectItem value="urbano">Urbano</SelectItem>
                            <SelectItem value="rural">Rural</SelectItem>
                          </SelectContent>
                        </Select>

                        {form.formState.errors.zone && (
                          <div className="text-danger small mt-1">{form.formState.errors.zone.message as string}</div>
                        )}
                      </div>

                  {}
{selectedZone && (
  <div className="location-step mb-3">
    <Label className="location-label">4. Localidad *</Label>

    <Popover
      open={openLocality}
      onOpenChange={(o) => {
        setOpenLocality(o);
        if (o) {
          setOpenDepartment(false);
          setOpenMunicipality(false);
          setOpenZone(false);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={openLocality}
          className="location-select justify-between"
          disabled={!selectedZone || !municipalityId || loadingLocs}
        >
          {localityId
            ? (localityOptions.find((l) => l.id === localityId)?.name) ||
              (localityId === "otro" ? "Otro (manual)" : String(localityId))
            : !selectedZone
              ? "Primero seleccione un tipo de zona..."
              : "Seleccione su localidad..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-full p-0 consultation-dropdown z-[9999]"
        side="bottom"
        align="start"
        sideOffset={4}
        collisionPadding={16}
      >
        <Command>
          <CommandInput placeholder="Buscar localidad..." />
          <CommandList>
            <CommandEmpty>No se encontró la localidad.</CommandEmpty>
            <CommandGroup>
              {localityOptions.map((loc) => (
                <CommandItem
                  key={loc.id}
                  value={loc.name}
                  onSelect={() => {
                    form.setValue("localityId", loc.id as any, { shouldValidate: true });
                    if (loc.id !== "otro") {
                      form.setValue("customLocalityName", undefined);
                      const sel = dbLocalities.find((l) => l.id === loc.id);
                      if (sel?.latitude && sel?.longitude) {
                        setMapLat(sel.latitude);
                        setMapLng(sel.longitude);
                        form.setValue("latitude", sel.latitude);
                        form.setValue("longitude", sel.longitude);
                      }
                    }
                    setOpenLocality(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", localityId === loc.id ? "opacity-100" : "opacity-0")} />
                  {loc.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>

    {form.formState.errors.localityId && (
      <div className="text-danger small mt-1">
        {form.formState.errors.localityId.message as string}
      </div>
    )}
  </div>
)}
                      

                      {}
                      {localityId === "otro" && (
                        <div className="location-step mb-3">
                          <Label htmlFor="customLocalityName">
                            Escriba el nombre de su colonia/barrio o aldea/caserío * {geocoding && "(buscando ubicación...)"}
                          </Label>
                          <Input
                            id="customLocalityName"
                            placeholder="Ingrese el nombre..."
                            value={customLocalityName || ""}
                            onChange={(e) =>
                              form.setValue("customLocalityName", e.target.value, { shouldValidate: true })
                            }
                            className="location-select"
                          />
                          {form.formState.errors.customLocalityName && (
                            <div className="text-danger small">
                              {form.formState.errors.customLocalityName.message as string}
                            </div>
                          )}
                        </div>
                      )}

                      {}
                      <div className="mt-4 location-map-container">
                        <LocationMap
                          latitude={mapCenterLat}
                          longitude={mapCenterLng}
                          locationName={(() => {
                            const selDept = departments.find((d) => d.id === departmentId);
                            const selMuni = municipalities.find((m) => m.id === municipalityId);
                            const selLoc =
                              typeof localityId === "number"
                                ? dbLocalities.find((l) => l.id === localityId)
                                : undefined;
                            const locName = selLoc?.name || (localityId === "otro" ? customLocalityName : undefined);
                            if (selDept && selMuni && locName) return `${locName}, ${selMuni.name}, ${selDept.name}`;
                            return undefined;
                          })()}
                          geocode={(() => {
                            const selDept = departments.find((d) => d.id === departmentId);
                            const selMuni = municipalities.find((m) => m.id === municipalityId);
                            if (selDept && selMuni) return `${selDept.geocode}${selMuni.geocode}`;
                            return undefined;
                          })()}
                          onPick={(lat: number | string, lng: number | string) => {
                            const latStr = String(lat);
                            const lngStr = String(lng);
                            setMapLat(latStr);
                            setMapLng(lngStr);
                            form.setValue("latitude", latStr);
                            form.setValue("longitude", lngStr);
                          }}
                        />

                        {localityId === "otro" && (!mapLat || !mapLng) && (
                          <div className="mt-2 text-warning small">
                            Haz click en el mapa para fijar las coordenadas.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {}
                  <Card className="form-section-card">
                    <CardHeader className="form-section-header">
                      <h3 className="form-section-title">3. Sectores de Interés</h3>
                      <p className="form-section-description">Seleccione los sectores y complete mensaje + fotos para cada uno</p>
                    </CardHeader>
                    <CardContent>
                      <div className="row g-2">
                        {allSectors.map((sector) => {
                          const isSelected = selectedSectors.includes(sector.name);
                          return (
                            <div key={sector.id} className="col-md-6 col-lg-4">
                              <Button
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                                className={`w-100 text-start ${isSelected ? "bg-primary text-white" : "bg-light"}`}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedSectors((p) => p.filter((s) => s !== sector.name));
                                    setDetailsBySector((p) => {
                                      const c = { ...p };
                                      delete c[sector.name];
                                      return c;
                                    });
                                  } else {
                                    setSelectedSectors((p) => [...p, sector.name]);
                                    setDetailsBySector((p) =>
                                      p[sector.name] ? p : { ...p, [sector.name]: { message: "", files: [] } }
                                    );
                                  }
                                }}
                              >
                                {isSelected ? <Check className="w-4 h-4 me-2" /> : <Plus className="w-4 h-4 me-2" />}
                                {sector.name}
                              </Button>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3">
                        <small className="text-muted">Sectores seleccionados:</small>
                        <div className="mt-2">
                          {selectedSectors.map((s) => (
                            <Badge key={s} variant="secondary" className="sector-tag me-1 mb-1">
                              {s}
                              <button
                                type="button"
                                className="btn btn-sm btn-link p-0 ms-1"
                                onClick={() => {
                                  setSelectedSectors((p) => p.filter((x) => x !== s));
                                  setDetailsBySector((p) => {
                                    const c = { ...p };
                                    delete c[s];
                                    return c;
                                  });
                                }}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                          {selectedSectors.length === 0 && (
                            <span className="text-muted small">Ningún sector seleccionado</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {}
                  {selectedSectors.map((sec) => {
                    const det = detailsBySector[sec] ?? { message: "", files: [] };
                    return (
                      <Card key={sec} className="form-section-card">
                        <CardHeader className="form-section-header">
                          <h3 className="form-section-title">{sec}</h3>
                        </CardHeader>
                        <CardContent>
                          <Label>Mensaje para {sec} *</Label>
                          <Textarea
                            value={det.message}
                            onChange={(e) =>
                              setDetailsBySector((p) => ({ ...p, [sec]: { ...det, message: e.target.value } }))
                            }
                            placeholder={`Escribe el detalle para ${sec}...`}
                          />

                          <div className="mt-3">
                            <Label>Fotografías para {sec} (mínimo 1)</Label>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              style={{ display: "none" }}
                              id={`file-${sec}`}
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                setDetailsBySector((p) => ({
                                  ...p,
                                  [sec]: { ...det, files: [...det.files, ...files].slice(0, 6) },
                                }));
                                e.currentTarget.value = "";
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="mt-2"
                              onClick={() => document.getElementById(`file-${sec}`)?.click()}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Subir fotografías ({det.files.length}/6)
                            </Button>

                            {det.files.length > 0 && (
                              <div className="row g-3 mt-2">
                                {det.files.map((f, i) => (
                                  <div key={i} className="col-md-4">
                                    <div className="position-relative">
                                      <img
                                        src={URL.createObjectURL(f)}
                                        alt={`${sec} ${i + 1}`}
                                        className="img-fluid rounded"
                                        style={{ width: "100%", height: 150, objectFit: "cover" }}
                                      />
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        className="position-absolute top-0 end-0 m-1"
                                        onClick={() =>
                                          setDetailsBySector((p) => ({
                                            ...p,
                                            [sec]: { ...det, files: det.files.filter((_, idx) => idx !== i) },
                                          }))
                                        }
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                    <small className="text-muted d-block mt-1">{f.name}</small>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {}
                  <div className="form-buttons-container d-flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="btn-reset-custom"
                      onClick={() => {
                        form.reset();
                        setSelectedSectors([]);
                        setDetailsBySector({});
                        setPersonType("natural");
                        setSelectedZone("");
                        setMapLat(undefined);
                        setMapLng(undefined);
                      }}
                    >
                      Limpiar Formulario
                    </Button>
                    <Button type="submit" className="btn-submit-custom" disabled={createMultiMutation.isPending}>
                      Enviar
                      {createMultiMutation.isPending && <Loader2 className="w-4 h-4 ms-2 animate-spin" />}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
