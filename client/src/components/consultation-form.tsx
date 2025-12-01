"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useForm,
  type SubmitHandler,
  type SubmitErrorHandler,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  headerSchema,
  type HeaderFormInputs,
  type HeaderFormValues,
} from "@/helpers/validation";

import {
  getDepartments,
  getMunicipalities,
  getLocalities,
  getSectors,
  uploadImages,
  postConsultations,
  type Department,
  type Municipality,
  type Locality,
} from "@/helpers/api";

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
import {
  Loader2,
  X,
  Plus,
  ChevronsUpDown,
  Trash2,
  Check,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import LocationMap from "@/components/location-map";

type SectorDetail = { message: string; files: File[] };

type LocalityOption = {
  id: number | "otro";
  name: string;
  area: HeaderFormInputs["zone"];
  municipalityId: number;
};

export default function ConsultationForm() {
  const { toast } = useToast();

  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedZone, setSelectedZone] = useState<"" | "urbano" | "rural">("");

  const [openDepartment, setOpenDepartment] = useState(false);
  const [openMunicipality, setOpenMunicipality] = useState(false);
  const [openLocality, setOpenLocality] = useState(false);
  const [openZone, setOpenZone] = useState(false);

  const [detailsBySector, setDetailsBySector] = useState<
    Record<string, SectorDetail>
  >({});

  const [mapLat, setMapLat] = useState<string | undefined>(undefined);
  const [mapLng, setMapLng] = useState<string | undefined>(undefined);
  const [geocoding, setGeocoding] = useState(false);

  const [enableContact, setEnableContact] = useState(false);

  const form = useForm<HeaderFormInputs>({
    resolver: zodResolver(headerSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      personType: "natural",
      status: "active",
    } satisfies Partial<HeaderFormInputs>,
  });

  // 🔹 Ahora el tipo de persona viene del formulario
  const personType = form.watch("personType") ?? "natural";

  const departmentId = form.watch("departmentId");
  const municipalityId = form.watch("municipalityId");
  const localityId = form.watch("localityId");
  const customLocalityName = form.watch("customLocalityName");
  const zone = form.watch("zone");

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: getDepartments,
    staleTime: 1000 * 60 * 10,
  });

  const { data: municipalities = [], isLoading: loadingMunis } = useQuery<
    Municipality[]
  >({
    queryKey: ["municipalities", departmentId ?? null],
    enabled: !!departmentId,
    queryFn: () => getMunicipalities(departmentId!),
    staleTime: 1000 * 60 * 10,
  });

  const { data: dbLocalities = [], isLoading: loadingLocs } = useQuery<
    Locality[]
  >({
    queryKey: ["localities", municipalityId ?? null],
    enabled: !!municipalityId,
    queryFn: () => getLocalities(municipalityId!),
    staleTime: 1000 * 60 * 10,
  });

  const { data: allSectors = [] } = useQuery<any[]>({
    queryKey: ["/api/sectors"],
    queryFn: getSectors,
    staleTime: 1000 * 60 * 10,
  });

  const localityOptions: LocalityOption[] = useMemo(() => {
    if (!municipalityId || !zone) return [];
    const muniId = Number(municipalityId);

    const baseOpts: LocalityOption[] = dbLocalities
      .filter((l) => Number(l.municipalityId) === muniId && l.area === zone)
      .map((l) => ({
        id: Number(l.id),
        name: l.name,
        area: l.area as HeaderFormInputs["zone"],
        municipalityId: Number(l.municipalityId),
      }));

    return [
      ...baseOpts,
      {
        id: "otro",
        name: "Otro (escribir manualmente)",
        area: zone,
        municipalityId: muniId,
      },
    ];
  }, [municipalityId, zone, dbLocalities]);

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
        const res = await fetch(url, {
          headers: { "Accept-Language": "es" },
        });
        if (res.ok) {
          const data = (await res.json()) as Array<{
            lat: string;
            lon: string;
          }>;
          if (data?.[0]) {
            setMapLat(data[0].lat);
            setMapLng(data[0].lon);
            form.setValue("latitude", data[0].lat);
            form.setValue("longitude", data[0].lon);
          } else {
            setMapLat(undefined);
            setMapLng(undefined);
            form.setValue("latitude", undefined);
            form.setValue("longitude", undefined);
          }
        }
      } catch {
      } finally {
        setGeocoding(false);
      }
    }, 700);

    return () => clearTimeout(t);
  }, [
    localityId,
    customLocalityName,
    departmentId,
    municipalityId,
    departments,
    municipalities,
    form,
  ]);

  const mapCenterLat = useMemo(() => {
    if (mapLat) return mapLat;
    const selLoc =
      typeof localityId === "number"
        ? dbLocalities.find((l) => Number(l.id) === Number(localityId))
        : undefined;
    if (selLoc?.latitude) return selLoc.latitude;
    const selMuni = municipalities.find((m) => m.id === municipalityId);
    if (selMuni?.latitude) return selMuni.latitude;
    const selDept = departments.find((d) => d.id === departmentId);
    if (selDept?.latitude) return selDept.latitude;
    return undefined;
  }, [
    mapLat,
    localityId,
    dbLocalities,
    municipalities,
    municipalityId,
    departments,
    departmentId,
  ]);

  const mapCenterLng = useMemo(() => {
    if (mapLng) return mapLng;
    const selLoc =
      typeof localityId === "number"
        ? dbLocalities.find((l) => Number(l.id) === Number(localityId))
        : undefined;
    if (selLoc?.longitude) return selLoc.longitude;
    const selMuni = municipalities.find((m) => m.id === municipalityId);
    if (selMuni?.longitude) return selMuni.longitude;
    const selDept = departments.find((d) => d.id === departmentId);
    if (selDept?.longitude) return selDept.longitude;
    return undefined;
  }, [
    mapLng,
    localityId,
    dbLocalities,
    municipalities,
    municipalityId,
    departments,
    departmentId,
  ]);

  const createMultiMutation = useMutation({
    mutationFn: postConsultations,
    onSuccess: () => {
      toast({
        title: "¡Consulta enviada exitosamente!",
        description: "Gracias por tu participación.",
      });
      form.reset();
      setSelectedSectors([]);
      setDetailsBySector({});
      setSelectedZone("");
      setMapLat(undefined);
      setMapLng(undefined);
      setEnableContact(false);
      queryClient.invalidateQueries({ queryKey: ["/api/consultations"] });
    },
    onError: () => {
      toast({
        title: "No se pudo guardar",
        description:
          "Revise los campos marcados en rojo y vuelva a intentar. Si el sector lo requiere, adjunte la fotografía.",
        variant: "destructive",
      });
    },
  });

  const onInvalid: SubmitErrorHandler<HeaderFormInputs> = (errors) => {
    const locationFields: (keyof HeaderFormInputs)[] = [
      "departmentId",
      "municipalityId",
      "zone",
      "localityId",
      "customLocalityName",
      "latitude",
      "longitude",
    ];

    const hasLocationError = locationFields.some((f) => errors[f]);
    const hasOtherError = Object.keys(errors).some(
      (k) => !locationFields.includes(k as keyof HeaderFormInputs)
    );

    let description = "";

    if (hasLocationError && !hasOtherError) {
      description =
        "Complete los datos de ubicación (departamento, municipio, zona y localidad).";
    } else if (hasLocationError && hasOtherError) {
      description =
        "Revise los datos de ubicación y los demás campos marcados en rojo.";
    } else {
      description = "Revise los campos marcados en rojo.";
    }

    toast({
      title: "Faltan datos",
      description,
      variant: "destructive",
    });
  };

  const onSubmit: SubmitHandler<HeaderFormInputs> = async (data) => {
    if (selectedSectors.length === 0) {
      toast({
        title: "Faltan datos",
        description: "Seleccione un sector.",
        variant: "destructive",
      });
      return;
    }

    const sectorsRequiringImage = new Set<string>(["Infraestructura vial"]);

    for (const sec of selectedSectors) {
      const det = detailsBySector[sec];

      if (!det || !det.message?.trim()) {
        toast({
          title: "Faltan datos",
          description: `Complete el mensaje para el sector "${sec}".`,
          variant: "destructive",
        });
        return;
      }

      const needsImage = sectorsRequiringImage.has(sec);
      const fileCount = det.files?.length ?? 0;

      if (fileCount > 1) {
        toast({
          title: "Solo se permite una foto",
          description: `Para el sector "${sec}" solo puede adjuntar una fotografía.`,
          variant: "destructive",
        });
        return;
      }

      if (needsImage && fileCount === 0) {
        toast({
          title: "No se agregó foto",
          description: `Para el sector "${sec}" es obligatorio adjuntar una fotografía.`,
          variant: "destructive",
        });
        return;
      }
    }

    const items: Array<{ sector: string; message: string; images: string[] }> =
      [];

    for (const sec of selectedSectors) {
      const det = detailsBySector[sec];
      let imageUrls: string[] = [];

      if (det.files.length > 0) {
        try {
          imageUrls = await uploadImages(det.files);
        } catch {
          toast({
            title: "Error al subir imágenes",
            description: `No se pudo subir la foto del sector "${sec}".`,
            variant: "destructive",
          });
          return;
        }
      }

      items.push({
        sector: sec,
        message: det.message.trim(),
        images: imageUrls,
      });
    }

    const header: HeaderFormValues = headerSchema.parse({
      ...data,
      latitude: mapLat ?? data.latitude,
      longitude: mapLng ?? data.longitude,
      mobile: enableContact ? data.mobile : undefined,
      phone: enableContact ? data.phone : undefined,
    });

    createMultiMutation.mutate({ header, items } as any);
  };

  return (
    <div className="consultation-container">
      <div className="container mt-4">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-10">
            <Card className="form-section">
              <CardHeader>
                <CardTitle className="text-center">
                  <img
                    src="/assets/logo-consulta-ciudadana.png"
                    alt="Consulta Ciudadana - Secretaría de Planificación Estratégica SPE"
                    className="mx-auto"
                    style={{
                      maxWidth: "200px",
                      width: "100%",
                      height: "auto",
                    }}
                  />
                </CardTitle>
              </CardHeader>

              <CardContent>
                <form
                  onSubmit={form.handleSubmit(onSubmit, onInvalid)}
                  noValidate
                  className="space-y-6"
                >
                  {}
                  <Card className="form-section-card">
                    <CardHeader className="form-section-header">
                      <h3 className="form-section-title">1. Tipo de Persona</h3>
                      <p className="form-section-description">
                        Seleccione el tipo de persona que mejor lo describa
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="row g-3 mb-4">
                        <div className="col-md-4">
                          <div
                            className={`person-type-card ${
                              personType === "natural" ? "selected" : ""
                            }`}
                            onClick={() =>
                              form.setValue("personType", "natural", {
                                shouldValidate: true,
                              })
                            }
                            role="button"
                            tabIndex={0}
                          >
                            <div className="person-type-content">
                              <h6 className="mb-0 text-dark-emphasis">
                                Persona Natural
                              </h6>
                            </div>
                          </div>
                        </div>

                        <div className="col-md-4">
                          <div
                            className={`person-type-card ${
                              personType === "juridica" ? "selected" : ""
                            }`}
                            onClick={() =>
                              form.setValue("personType", "juridica", {
                                shouldValidate: true,
                              })
                            }
                            role="button"
                            tabIndex={0}
                          >
                            <div className="person-type-content">
                              <h6 className="mb-0 text-dark-emphasis">
                                Persona Jurídica
                              </h6>
                            </div>
                          </div>
                        </div>
                      </div>

                      {}
                      {personType === "natural" && (
                        <div className="conditional-fields mt-4">
                          <h6 className="mb-3 text-muted">
                            Información de Persona Natural
                          </h6>
                          <div className="row mb-3">
                            <div className="col-md-6">
                              <Label htmlFor="firstName">
                                Primer Nombre *
                              </Label>
                              <Input
                                id="firstName"
                                {...form.register("firstName")}
                                placeholder="Ingrese su primer nombre"
                              />
                              {form.formState.errors.firstName && (
                                <div className="text-danger small mt-1">
                                  {
                                    form.formState.errors.firstName
                                      .message as string
                                  }
                                </div>
                              )}
                            </div>
                            <div className="col-md-6">
                              <Label htmlFor="lastName">Apellido *</Label>
                              <Input
                                id="lastName"
                                {...form.register("lastName")}
                                placeholder="Ingrese su apellido"
                              />
                              {form.formState.errors.lastName && (
                                <div className="text-danger small mt-1">
                                  {
                                    form.formState.errors.lastName
                                      .message as string
                                  }
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="row mb-3">
                            <div className="col-md-6">
                              <Label htmlFor="email">
                                Correo Electrónico (opcional)
                              </Label>
                              <Input
                                id="email"
                                type="email"
                                {...form.register("email")}
                                placeholder="Digite su correo electrónico"
                              />
                              {form.formState.errors.email && (
                                <div className="text-danger small mt-1">
                                  {
                                    form.formState.errors.email
                                      .message as string
                                  }
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {}
                      {personType === "juridica" && (
                        <div className="conditional-fields mt-4">
                          <h6 className="mb-3 text-muted">
                            Información Institución u Organización
                          </h6>
                          <div className="row mb-3">
                            <div className="col-md-6">
                              <Label htmlFor="companyName">
                                Institución u Organización
                              </Label>
                              <Input
                                id="companyName"
                                {...form.register("companyName")}
                                placeholder="Nombre de la institución u organización"
                              />
                              {form.formState.errors.companyName && (
                                <div className="text-danger small mt-1">
                                  {
                                    form.formState.errors.companyName
                                      .message as string
                                  }
                                </div>
                              )}
                            </div>

                            <div className="col-md-6">
                              <Label htmlFor="legalRepresentative">
                                Persona de contacto{" "}
                              </Label>
                              <Input
                                id="legalRepresentative"
                                {...form.register("legalRepresentative")}
                                placeholder="Nombre de la persona de contacto"
                              />
                              {form.formState.errors.legalRepresentative && (
                                <div className="text-danger small mt-1">
                                  {
                                    form.formState.errors.legalRepresentative
                                      .message as string
                                  }
                                </div>
                              )}
                            </div>
                          </div>

                          {}
                          <div className="row mb-3">
                            <div className="col-md-6">
                              <Label htmlFor="email">
                                Correo Electrónico (opcional)
                              </Label>
                              <Input
                                id="email"
                                type="email"
                                {...form.register("email")}
                                placeholder="Digite su correo electrónico"
                              />
                              {form.formState.errors.email && (
                                <div className="text-danger small mt-1">
                                  {
                                    form.formState.errors.email
                                      .message as string
                                  }
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 🔹 Información de contacto opcional con checkbox */}
                      <div className="mt-4">
                        <div className="d-flex align-items-center gap-2 mb-3">
                          <input
                            id="extraContact"
                            type="checkbox"
                            className="form-check-input"
                            checked={enableContact}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setEnableContact(checked);
                              if (!checked) {
                                // limpiamos los valores cuando se oculta
                                form.setValue("mobile", "");
                                form.setValue("phone", "");
                              }
                            }}
                          />
                          <Label
                            htmlFor="extraContact"
                            className="mb-0"
                          >
                            Deseo agregar información de contacto adicional
                          </Label>
                        </div>

                        {enableContact && (
                          <>
                            <h6 className="mb-3 text-muted">
                              Información de Contacto (opcional)
                            </h6>

                            <div className="row mb-3">
                              <div className="col-md-6">
                                <Label htmlFor="mobile">Celular</Label>
                                <Input
                                  id="mobile"
                                  placeholder="Digite su número de celular"
                                  {...form.register("mobile")}
                                />
                                {form.formState.errors.mobile && (
                                  <div className="text-danger small mt-1">
                                    {
                                      form.formState.errors.mobile
                                        .message as string
                                    }
                                  </div>
                                )}
                              </div>
                              <div className="col-md-6">
                                <Label htmlFor="phone">
                                  Teléfono Fijo
                                </Label>
                                <Input
                                  id="phone"
                                  placeholder="Digite su número de teléfono"
                                  {...form.register("phone")}
                                />
                                {form.formState.errors.phone && (
                                  <div className="text-danger small mt-1">
                                    {
                                      form.formState.errors.phone
                                        .message as string
                                    }
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 2. Ubicación */}
                  <Card className="form-section-card">
                    <CardHeader className="form-section-header">
                      <h3 className="form-section-title">2. Ubicación</h3>
                      <p className="form-section-description">
                        Seleccione su ubicación geográfica para una mejor
                        atención
                      </p>
                    </CardHeader>

                    <CardContent>
                      {/* Departamento */}
                      <div className="location-step mb-3">
                        <Label className="location-label">
                          1. Departamento *
                        </Label>

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
                                ? departments.find(
                                    (d) => d.id === departmentId
                                  )?.name
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
                                <CommandEmpty>
                                  No se encontró el departamento.
                                </CommandEmpty>
                                <CommandGroup>
                                  {departments.map((dep) => (
                                    <CommandItem
                                      key={dep.id}
                                      value={dep.name}
                                      onSelect={() => {
                                        form.setValue(
                                          "departmentId",
                                          Number(dep.id),
                                          {
                                            shouldValidate: true,
                                          }
                                        );
                                        form.setValue(
                                          "municipalityId",
                                          undefined
                                        );
                                        form.setValue("zone", undefined);
                                        form.setValue(
                                          "localityId",
                                          undefined
                                        );
                                        form.setValue(
                                          "customLocalityName",
                                          undefined
                                        );
                                        setSelectedZone("");
                                        setMapLat(undefined);
                                        setMapLng(undefined);
                                        setOpenDepartment(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          departmentId === dep.id
                                            ? "opacity-100"
                                            : "opacity-0"
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
                            {
                              form.formState.errors.departmentId
                                .message as string
                            }
                          </div>
                        )}
                      </div>

                      {/* Municipio */}
                      <div className="location-step mb-3">
                        <Label className="location-label">
                          2. Municipio *
                        </Label>

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
                                ? municipalities.find(
                                    (m) => m.id === municipalityId
                                  )?.name
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
                                <CommandEmpty>
                                  No se encontró el municipio.
                                </CommandEmpty>
                                <CommandGroup>
                                  {municipalities.map((muni) => (
                                    <CommandItem
                                      key={muni.id}
                                      value={muni.name}
                                      onSelect={() => {
                                        form.setValue(
                                          "municipalityId",
                                          Number(muni.id),
                                          {
                                            shouldValidate: true,
                                          }
                                        );
                                        form.setValue("zone", undefined);
                                        form.setValue(
                                          "localityId",
                                          undefined
                                        );
                                        form.setValue(
                                          "customLocalityName",
                                          undefined
                                        );
                                        setSelectedZone("");
                                        setOpenMunicipality(false);
                                        setMapLat(undefined);
                                        setMapLng(undefined);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          municipalityId === muni.id
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
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
                            {
                              form.formState.errors.municipalityId
                                .message as string
                            }
                          </div>
                        )}
                      </div>

                      {/* Zona */}
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
                            form.setValue("zone", v, {
                              shouldValidate: true,
                            });
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
                          <SelectContent
                            className="consultation-dropdown"
                            position="popper"
                            side="bottom"
                            align="start"
                            sideOffset={4}
                            collisionPadding={16}
                          >
                            <SelectItem value="urbano">Urbano</SelectItem>
                            <SelectItem value="rural">Rural</SelectItem>
                          </SelectContent>
                        </Select>

                        {form.formState.errors.zone && (
                          <div className="text-danger small mt-1">
                            {form.formState.errors.zone.message as string}
                          </div>
                        )}
                      </div>

                      {/* Localidad */}
                      {selectedZone && (
                        <div className="location-step mb-3">
                          <Label className="location-label">
                            4. Localidad *
                          </Label>

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
                                disabled={
                                  !selectedZone ||
                                  !municipalityId ||
                                  loadingLocs
                                }
                              >
                                {localityId
                                  ? localityOptions.find(
                                      (l) => l.id === localityId
                                    )?.name ||
                                    (localityId === "otro"
                                      ? "Otro (manual)"
                                      : String(localityId))
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
                                  <CommandEmpty>
                                    No se encontró la localidad.
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {localityOptions.map((loc) => (
                                      <CommandItem
                                        key={String(loc.id)}
                                        value={loc.name}
                                        onSelect={() => {
                                          form.setValue(
                                            "localityId",
                                            loc.id as HeaderFormInputs["localityId"],
                                            {
                                              shouldValidate: true,
                                            }
                                          );
                                          if (loc.id !== "otro") {
                                            form.setValue(
                                              "customLocalityName",
                                              undefined
                                            );
                                            const sel = dbLocalities.find(
                                              (l) =>
                                                Number(l.id) ===
                                                Number(loc.id)
                                            );
                                            if (
                                              sel?.latitude &&
                                              sel?.longitude
                                            ) {
                                              setMapLat(sel.latitude);
                                              setMapLng(sel.longitude);
                                              form.setValue(
                                                "latitude",
                                                sel.latitude
                                              );
                                              form.setValue(
                                                "longitude",
                                                sel.longitude
                                              );
                                            }
                                          }
                                          setOpenLocality(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            localityId === loc.id
                                              ? "opacity-100"
                                              : "opacity-0"
                                          )}
                                        />
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
                              {
                                form.formState.errors.localityId
                                  .message as string
                              }
                            </div>
                          )}
                        </div>
                      )}

                      {/* Localidad manual */}
                      {localityId === "otro" && (
                        <div className="location-step mb-3">
                          <Label htmlFor="customLocalityName">
                            Escriba el nombre de su colonia/barrio o
                            aldea/caserío *{" "}
                            {geocoding && "(buscando ubicación...)"}
                          </Label>
                          <Input
                            id="customLocalityName"
                            placeholder="Ingrese el nombre..."
                            value={customLocalityName || ""}
                            onChange={(e) =>
                              form.setValue(
                                "customLocalityName",
                                e.target.value,
                                {
                                  shouldValidate: true,
                                }
                              )
                            }
                            className="location-select"
                          />
                          {form.formState.errors.customLocalityName && (
                            <div className="text-danger small">
                              {
                                form.formState.errors.customLocalityName
                                  .message as string
                              }
                            </div>
                          )}
                        </div>
                      )}

                      {/* Mapa */}
                      <div className="mt-4 location-map-container">
                        <LocationMap
                          latitude={mapCenterLat}
                          longitude={mapCenterLng}
                          locationName={(() => {
                            const selDept = departments.find(
                              (d) => d.id === departmentId
                            );
                            const selMuni = municipalities.find(
                              (m) => m.id === municipalityId
                            );
                            const selLoc =
                              typeof localityId === "number"
                                ? dbLocalities.find(
                                    (l) =>
                                      Number(l.id) === Number(localityId)
                                  )
                                : undefined;
                            const locName =
                              selLoc?.name ||
                              (localityId === "otro"
                                ? customLocalityName
                                : undefined);
                            if (selDept && selMuni && locName)
                              return `${locName}, ${selMuni.name}, ${selDept.name}`;
                            return undefined;
                          })()}
                          geocode={(() => {
                            const selDept = departments.find(
                              (d) => d.id === departmentId
                            );
                            const selMuni = municipalities.find(
                              (m) => m.id === municipalityId
                            );
                            if (selDept && selMuni)
                              return `${selDept.geocode}${selMuni.geocode}`;
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

                  {/* 3. Sectores */}
                  <Card className="form-section-card">
                    <CardHeader className="form-section-header">
                      <h3 className="form-section-title">
                        3. Sector de Necesidad
                      </h3>
                      <p className="form-section-description">
                        Seleccione un sector y complete mensaje + fotografía
                        (si aplica)
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="row g-2">
                        {allSectors.map((sector) => {
                          const isSelected =
                            selectedSectors.includes(sector.name);
                          return (
                            <div
                              key={sector.id}
                              className="col-md-6 col-lg-4"
                            >
                              <Button
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                                className={`w-100 text-start ${
                                  isSelected
                                    ? "bg-primary text-white"
                                    : "bg-light"
                                }`}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedSectors([]);
                                    setDetailsBySector((p) => {
                                      const c = { ...p };
                                      delete c[sector.name];
                                      return c;
                                    });
                                  } else {
                                    setSelectedSectors([sector.name]);
                                    setDetailsBySector((p) =>
                                      p[sector.name]
                                        ? p
                                        : {
                                            ...p,
                                            [sector.name]: {
                                              message: "",
                                              files: [],
                                            },
                                          }
                                    );
                                  }
                                }}
                              >
                                {isSelected ? (
                                  <Check className="w-4 h-4 me-2" />
                                ) : (
                                  <Plus className="w-4 h-4 me-2" />
                                )}
                                {sector.name}
                              </Button>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3">
                        <small className="text-muted">
                          Sector seleccionado:
                        </small>
                        <div className="mt-2">
                          {selectedSectors.map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="sector-tag me-1 mb-1"
                            >
                              {s}
                              <button
                                type="button"
                                className="btn btn-sm btn-link p-0 ms-1"
                                onClick={() => {
                                  setSelectedSectors([]);
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
                            <span className="text-muted small">
                              Ningún sector seleccionado
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Detalles por sector */}
                  {selectedSectors.map((sec) => {
                    const det =
                      detailsBySector[sec] ?? { message: "", files: [] };
                    const safeId = `file-${sec.replace(
                      /[^a-zA-Z0-9_-]/g,
                      "-"
                    )}`;

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
                              setDetailsBySector((p) => ({
                                ...p,
                                [sec]: { ...det, message: e.target.value },
                              }))
                            }
                            placeholder={`Escriba el detalle para ${sec}...`}
                          />

                          <div className="mt-3">
                            <Label>
                              Fotografía para {sec}{" "}
                              <span className="text-muted">
                                (obligatoria solo si el sector lo requiere)
                              </span>
                            </Label>

                            <input
                              id={safeId}
                              type="file"
                              accept="image/*"
                              style={{ display: "none" }}
                              onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                setDetailsBySector((p) => ({
                                  ...p,
                                  [sec]: {
                                    ...det,
                                    files: file ? [file] : [],
                                  },
                                }));
                                e.target.value = "";
                              }}
                            />

                            <Button
                              type="button"
                              variant="outline"
                              className="mt-2"
                              onClick={() =>
                                document.getElementById(safeId)?.click()
                              }
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Subir fotografía ({det.files.length}/1)
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
                                        style={{
                                          width: "100%",
                                          height: 150,
                                          objectFit: "cover",
                                        }}
                                      />
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        className="position-absolute top-0 end-0 m-1"
                                        onClick={() =>
                                          setDetailsBySector((p) => ({
                                            ...p,
                                            [sec]: {
                                              ...det,
                                              files: det.files.filter(
                                                (_, idx) => idx !== i
                                              ),
                                            },
                                          }))
                                        }
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                    <small className="text-muted d-block mt-1">
                                      {f.name}
                                    </small>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Botones */}
                  <div className="form-buttons-container d-flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="btn-reset-custom"
                      onClick={() => {
                        form.reset();
                        setSelectedSectors([]);
                        setDetailsBySector({});
                        setSelectedZone("");
                        setMapLat(undefined);
                        setMapLng(undefined);
                        setEnableContact(false);
                      }}
                    >
                      Limpiar Formulario
                    </Button>
                    <Button
                      type="submit"
                      className="btn-submit-custom"
                      disabled={createMultiMutation.isPending}
                    >
                      Enviar
                      {createMultiMutation.isPending && (
                        <Loader2 className="w-4 h-4 ms-2 animate-spin" />
                      )}
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
