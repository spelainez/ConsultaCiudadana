import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { insertConsultationSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, Plus, Check, ChevronsUpDown, Upload, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import LocationMap from "@/components/location-map";

const consultationFormSchema = insertConsultationSchema;

type ConsultationFormData = z.infer<typeof consultationFormSchema>;

export function ConsultationForm() {
  const { toast } = useToast();
  const [personType, setPersonType] = useState<string>("natural");
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [sectorSearch, setSectorSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [localitySearchOpen, setLocalitySearchOpen] = useState(false);
  const [localitySearchValue, setLocalitySearchValue] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [openDepartment, setOpenDepartment] = useState(false);
  const [openMunicipality, setOpenMunicipality] = useState(false);

  const form = useForm<ConsultationFormData>({
    resolver: zodResolver(consultationFormSchema),
    defaultValues: {
      personType: "natural",
      selectedSectors: [],
      status: "active",
    },
  });

  // Data queries
  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ["/api/departments"],
  });

  const { data: municipalities = [] } = useQuery<any[]>({
    queryKey: ["/api/municipalities", form.watch("departmentId")],
    enabled: !!form.watch("departmentId"),
  });

  const { data: localities = [] } = useQuery<any[]>({
    queryKey: ["/api/localities", form.watch("municipalityId")],
    enabled: !!form.watch("municipalityId"),
  });

  const { data: sectors = [] } = useQuery<any[]>({
    queryKey: ["/api/sectors"],
  });

  const { data: sectorSuggestions = [] } = useQuery<any[]>({
    queryKey: [`/api/sectors/search?q=${sectorSearch}`],
    enabled: sectorSearch.length > 0,
  });

  // Mutation
  const createConsultationMutation = useMutation({
    mutationFn: async (data: ConsultationFormData) => {
      const res = await apiRequest("POST", "/api/consultations", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "¡Consulta enviada exitosamente!",
        description: "Tu consulta ha sido registrada. Gracias por tu participación.",
      });
      form.reset();
      setSelectedSectors([]);
      setPersonType("natural");
      setSelectedImages([]);
      queryClient.invalidateQueries({ queryKey: ["/api/consultations"] });
    },
    onError: (error) => {
      toast({
        title: "Error al enviar consulta",
        description: "Hubo un problema al enviar tu consulta. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: ConsultationFormData) => {
    let imageUrls: string[] = [];
    
    // Upload images first if any are selected
    if (selectedImages.length > 0) {
      const formData = new FormData();
      selectedImages.forEach((file) => {
        formData.append('images', file);
      });
      
      try {
        const uploadRes = await fetch('/api/upload-images', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadRes.ok) {
          throw new Error('Error al subir imágenes');
        }
        
        const uploadData = await uploadRes.json();
        imageUrls = uploadData.imageUrls;
      } catch (error) {
        toast({
          title: "Error al subir imágenes",
          description: "No se pudieron subir las imágenes. Envía la consulta sin ellas o inténtalo de nuevo.",
          variant: "destructive",
        });
        return; // Stop form submission on image upload error
      }
    }
    
    // Submit consultation with image URLs
    createConsultationMutation.mutate({
      ...data,
      selectedSectors,
      images: imageUrls,
    });
  };

  const handleSectorAdd = (sectorName: string) => {
    if (!selectedSectors.includes(sectorName)) {
      setSelectedSectors([...selectedSectors, sectorName]);
    }
    setSectorSearch("");
    setShowSuggestions(false);
  };

  const handleSectorRemove = (sectorName: string) => {
    setSelectedSectors(selectedSectors.filter(s => s !== sectorName));
  };

  // Reset form when person type changes
  useEffect(() => {
    form.setValue("personType", personType);
    // Clear person-specific fields when changing type
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
  }, [personType, form]);

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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* SECCIÓN 1: TIPO DE PERSONA */}
                <Card className="form-section-card">
                  <CardHeader className="form-section-header">
                    <h3 className="form-section-title">1. Tipo de Persona</h3>
                    <p className="form-section-description">Seleccione el tipo de persona que mejor lo describa</p>
                  </CardHeader>
                  <CardContent>
                    <div className="row g-3 mb-4">
                    {/* Persona Natural */}
                    <div className="col-md-4">
                      <div 
                        className={`person-type-card ${personType === "natural" ? "selected" : ""}`}
                        onClick={() => setPersonType("natural")}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setPersonType("natural");
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        data-testid="card-natural"
                        aria-label="Seleccionar Persona Natural"
                      >
                        <div className="person-type-content">
                          <h6 className="mb-0 text-dark-emphasis">Persona Natural</h6>
                        </div>
                      </div>
                    </div>
                    
                    {/* Persona Jurídica */}
                    <div className="col-md-4">
                      <div 
                        className={`person-type-card ${personType === "juridica" ? "selected" : ""}`}
                        onClick={() => setPersonType("juridica")}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setPersonType("juridica");
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        data-testid="card-juridica"
                        aria-label="Seleccionar Persona Jurídica"
                      >
                        <div className="person-type-content">
                          <h6 className="mb-0 text-dark-emphasis">Persona Jurídica</h6>
                        </div>
                      </div>
                    </div>
                    
                    {/* Anónimo */}
                    <div className="col-md-4">
                      <div 
                        className={`person-type-card ${personType === "anonimo" ? "selected" : ""}`}
                        onClick={() => setPersonType("anonimo")}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setPersonType("anonimo");
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        data-testid="card-anonimo"
                        aria-label="Seleccionar Anónimo"
                      >
                        <div className="person-type-content">
                          <h6 className="mb-0 text-dark-emphasis">Anónimo</h6>
                        </div>
                      </div>
                    </div>
                    </div>

                    {/* Información Personal - Persona Natural */}
                    {personType === "natural" && (
                      <div className="conditional-fields mt-4">
                        <h6 className="mb-3 text-muted">Información de Persona Natural</h6>
                        <div className="row mb-3">
                          <div className="col-md-6">
                            <Label htmlFor="firstName">Primer Nombre *</Label>
                            <Input
                              id="firstName"
                              {...form.register("firstName")}
                              data-testid="input-firstName"
                              placeholder="Ingrese su primer nombre"
                            />
                            {form.formState.errors.firstName && (
                              <div className="text-danger small">{form.formState.errors.firstName.message}</div>
                            )}
                          </div>
                          <div className="col-md-6">
                            <Label htmlFor="lastName">Apellido *</Label>
                            <Input
                              id="lastName"
                              {...form.register("lastName")}
                              data-testid="input-lastName"
                              placeholder="Ingrese su apellido"
                            />
                            {form.formState.errors.lastName && (
                              <div className="text-danger small">{form.formState.errors.lastName.message}</div>
                            )}
                          </div>
                        </div>
                        <div className="row mb-3">
                          <div className="col-md-6">
                            <Label htmlFor="identity">Número de Identidad *</Label>
                            <Input
                              id="identity"
                              placeholder="Ingrese su número de identidad"
                              {...form.register("identity")}
                              data-testid="input-identity"
                            />
                            {form.formState.errors.identity && (
                              <div className="text-danger small">{form.formState.errors.identity.message}</div>
                            )}
                          </div>
                          <div className="col-md-6">
                            <Label htmlFor="email">Correo Electrónico *</Label>
                            <Input
                              id="email"
                              type="email"
                              {...form.register("email")}
                              data-testid="input-email"
                              placeholder="Ingrese su correo electrónico"
                            />
                            {form.formState.errors.email && (
                              <div className="text-danger small">{form.formState.errors.email.message}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                {/* Información Personal - Persona Jurídica */}
                {personType === "juridica" && (
                  <div className="conditional-fields mt-4">
                    <h6 className="mb-3 text-muted">Información de Persona Jurídica</h6>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <Label htmlFor="companyName">Nombre de la Empresa *</Label>
                        <Input
                          id="companyName"
                          {...form.register("companyName")}
                          data-testid="input-companyName"
                          placeholder="Ingrese el nombre de su empresa"
                        />
                        {form.formState.errors.companyName && (
                          <div className="text-danger small">{form.formState.errors.companyName.message}</div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <Label htmlFor="rtn">RTN *</Label>
                        <Input
                          id="rtn"
                          placeholder="Ingrese su RTN"
                          {...form.register("rtn")}
                          data-testid="input-rtn"
                        />
                        {form.formState.errors.rtn && (
                          <div className="text-danger small">{form.formState.errors.rtn.message}</div>
                        )}
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <Label htmlFor="legalRepresentative">Representante Legal *</Label>
                        <Input
                          id="legalRepresentative"
                          {...form.register("legalRepresentative")}
                          data-testid="input-legalRepresentative"
                          placeholder="Ingrese el nombre del representante legal"
                        />
                        {form.formState.errors.legalRepresentative && (
                          <div className="text-danger small">{form.formState.errors.legalRepresentative.message}</div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <Label htmlFor="companyContact">Correo/Teléfono *</Label>
                        <Input
                          id="companyContact"
                          {...form.register("companyContact")}
                          data-testid="input-companyContact"
                          placeholder="Ingrese correo o teléfono de contacto"
                        />
                        {form.formState.errors.companyContact && (
                          <div className="text-danger small">{form.formState.errors.companyContact.message}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Optional Contact Information */}
                {personType !== "anonimo" && (
                  <div className="mt-4">
                    <h6 className="mb-3 text-muted">Información de Contacto (Opcional)</h6>
                    <div className="row mb-3">
                      <div className="col-md-4">
                        <Label htmlFor="mobile">Celular</Label>
                        <Input
                          id="mobile"
                          placeholder="Ingrese su número de celular"
                          {...form.register("mobile")}
                          data-testid="input-mobile"
                        />
                      </div>
                      <div className="col-md-4">
                        <Label htmlFor="phone">Teléfono Fijo</Label>
                        <Input
                          id="phone"
                          placeholder="Ingrese su teléfono fijo"
                          {...form.register("phone")}
                          data-testid="input-phone"
                        />
                      </div>
                      <div className="col-md-4">
                        <Label htmlFor="altEmail">Correo Alternativo</Label>
                        <Input
                          id="altEmail"
                          type="email"
                          {...form.register("altEmail")}
                          data-testid="input-altEmail"
                          placeholder="Ingrese su correo alternativo"
                        />
                      </div>
                    </div>
                  </div>
                )}
                  </CardContent>
                </Card>

                {/* SECCIÓN 2: UBICACIÓN */}
                <Card className="form-section-card">
                  <CardHeader className="form-section-header">
                    <h3 className="form-section-title">2. Ubicación</h3>
                    <p className="form-section-description">Seleccione su ubicación geográfica para una mejor atención</p>
                  </CardHeader>
                  <CardContent>
                  
                  {/* Department */}
                  <div className="location-step mb-3">
                    <Label htmlFor="department" className="location-label">1. Departamento *</Label>
                    <Popover open={openDepartment} onOpenChange={setOpenDepartment}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openDepartment}
                          className="location-select justify-between"
                          data-testid="select-department"
                        >
                          {form.watch("departmentId")
                            ? departments.find((dept) => dept.id === form.watch("departmentId"))?.name
                            : "Seleccione su departamento..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Buscar departamento..." />
                          <CommandEmpty>No se encontró el departamento.</CommandEmpty>
                          <CommandGroup>
                            {departments.map((dept) => (
                              <CommandItem
                                key={dept.id}
                                value={dept.name}
                                onSelect={() => {
                                  form.setValue("departmentId", dept.id);
                                  form.setValue("municipalityId", "");
                                  form.setValue("localityId", "");
                                  setSelectedZone("");
                                  setOpenDepartment(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    form.watch("departmentId") === dept.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {dept.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {form.formState.errors.departmentId && (
                      <div className="text-danger small mt-1">{form.formState.errors.departmentId.message}</div>
                    )}
                  </div>

                  {/* Municipality */}
                  <div className="location-step mb-3">
                    <Label htmlFor="municipality" className="location-label">2. Municipio *</Label>
                    <Popover open={openMunicipality} onOpenChange={setOpenMunicipality}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openMunicipality}
                          className="location-select justify-between"
                          data-testid="select-municipality"
                          disabled={!form.watch("departmentId")}
                        >
                          {form.watch("municipalityId")
                            ? municipalities.find((muni) => muni.id === form.watch("municipalityId"))?.name
                            : !form.watch("departmentId") 
                              ? "Primero seleccione un departamento..."
                              : "Seleccione su municipio..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Buscar municipio..." />
                          <CommandEmpty>No se encontró el municipio.</CommandEmpty>
                          <CommandGroup>
                            {municipalities.map((muni) => (
                              <CommandItem
                                key={muni.id}
                                value={muni.name}
                                onSelect={() => {
                                  form.setValue("municipalityId", muni.id);
                                  form.setValue("localityId", "");
                                  setSelectedZone("");
                                  setOpenMunicipality(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    form.watch("municipalityId") === muni.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {muni.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {form.formState.errors.municipalityId && (
                      <div className="text-danger small mt-1">{form.formState.errors.municipalityId.message}</div>
                    )}
                  </div>

                  {/* Zone Selection */}
                  <div className="location-step mb-3">
                    <Label className="location-label">3. Zona *</Label>
                    <Select
                      onValueChange={(value) => {
                        setSelectedZone(value);
                        form.setValue("localityId", "");
                      }}
                      value={selectedZone}
                      disabled={!form.watch("municipalityId")}
                    >
                      <SelectTrigger className="location-select" data-testid="select-zone">
                        <SelectValue placeholder={
                          !form.watch("municipalityId") 
                            ? "Primero seleccione un municipio..."
                            : "Seleccione el tipo de zona..."
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urbano">Urbano</SelectItem>
                        <SelectItem value="rural">Rural</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Locality Selection with Search */}
                  <div className="location-step mb-3">
                    <Label className="location-label">
                      4. {selectedZone === "urbano" ? "Colonia o Barrio" : selectedZone === "rural" ? "Aldea o Caserío" : "Localidad"} *
                    </Label>
                    <Popover open={localitySearchOpen} onOpenChange={setLocalitySearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={localitySearchOpen}
                          className="w-full justify-between location-select"
                          data-testid="select-locality"
                          disabled={!selectedZone}
                        >
                          {form.watch("localityId")
                            ? localities.find((locality) => locality.id === form.watch("localityId"))?.name
                            : !selectedZone 
                              ? "Primero seleccione un tipo de zona..."
                              : selectedZone === "urbano" 
                                ? "Busque su colonia o barrio..." 
                                : "Busque su aldea o caserío..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder={
                              selectedZone === "urbano" 
                                ? "Buscar colonia o barrio..." 
                                : "Buscar aldea o caserío..."
                            }
                            value={localitySearchValue}
                            onValueChange={setLocalitySearchValue}
                          />
                          <CommandList>
                            <CommandEmpty>No se encontraron localidades.</CommandEmpty>
                            <CommandGroup>
                              {selectedZone && localities
                                .filter(locality => locality.municipalityId === form.watch("municipalityId"))
                                .filter(locality => locality.area === selectedZone)
                                .filter(locality => 
                                  locality.name.toLowerCase().includes(localitySearchValue.toLowerCase())
                                )
                                .map((locality) => (
                                  <CommandItem
                                    key={locality.id}
                                    value={locality.name}
                                    onSelect={() => {
                                      form.setValue("localityId", locality.id);
                                      setLocalitySearchOpen(false);
                                      setLocalitySearchValue("");
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        locality.id === form.watch("localityId") ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                    {locality.name}
                                  </CommandItem>
                                ))
                              }
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {form.formState.errors.localityId && (
                      <div className="text-danger small mt-1">{form.formState.errors.localityId.message}</div>
                    )}
                  </div>

                  {/* Geocode Display */}
                  <div className="geocode-display">
                    <div className="geocode-container">
                      <Label className="geocode-label">Geocódigo</Label>
                      <div className={`geocode-value ${!(form.watch("departmentId") && form.watch("municipalityId")) ? 'opacity-50' : ''}`} data-testid="text-geocode">
                        {(() => {
                          const selectedDept = departments.find(d => d.id === form.watch("departmentId"));
                          const selectedMuni = municipalities.find(m => m.id === form.watch("municipalityId"));
                          
                          if (selectedDept && selectedMuni) {
                            return `${selectedDept.geocode}${selectedMuni.geocode}`;
                          }
                          return "Se generará automáticamente cuando complete la ubicación";
                        })()}
                      </div>
                      <small className="geocode-subtitle">
                        Este código identifica únicamente su ubicación
                      </small>
                    </div>
                  </div>

                  {/* Location Map */}
                  <div className="mt-4 location-map-container">
                    <LocationMap
                      latitude={(() => {
                        const selectedLocality = localities.find(l => l.id === form.watch("localityId"));
                        return selectedLocality?.latitude;
                      })()}
                      longitude={(() => {
                        const selectedLocality = localities.find(l => l.id === form.watch("localityId"));
                        return selectedLocality?.longitude;
                      })()}
                      locationName={(() => {
                        const selectedDept = departments.find(d => d.id === form.watch("departmentId"));
                        const selectedMuni = municipalities.find(m => m.id === form.watch("municipalityId"));
                        const selectedLocality = localities.find(l => l.id === form.watch("localityId"));
                        
                        if (selectedDept && selectedMuni && selectedLocality) {
                          return `${selectedLocality.name}, ${selectedMuni.name}, ${selectedDept.name}`;
                        }
                        return undefined;
                      })()}
                      geocode={(() => {
                        const selectedDept = departments.find(d => d.id === form.watch("departmentId"));
                        const selectedMuni = municipalities.find(m => m.id === form.watch("municipalityId"));
                        
                        if (selectedDept && selectedMuni) {
                          return `${selectedDept.geocode}${selectedMuni.geocode}`;
                        }
                        return undefined;
                      })()}
                    />
                  </div>
                  </CardContent>
                </Card>

                {/* SECCIÓN 3: SECTORES DE INTERÉS */}
                <Card className="form-section-card">
                  <CardHeader className="form-section-header">
                    <h3 className="form-section-title">3. Sectores de Interés</h3>
                    <p className="form-section-description">Seleccione los sectores sobre los que desea consultar</p>
                  </CardHeader>
                  <CardContent>
                  <div className="position-relative">
                    <Input
                      value={sectorSearch}
                      onChange={(e) => {
                        setSectorSearch(e.target.value);
                        setShowSuggestions(e.target.value.length > 0);
                      }}
                      placeholder="Ingrese el sector que busca"
                      data-testid="input-sectorSearch"
                    />
                    {showSuggestions && sectorSuggestions.length > 0 && (
                      <div className="dropdown-menu show w-100 mt-1" style={{ position: "absolute", zIndex: 1000 }}>
                        {sectorSuggestions
                          .filter(sector => !selectedSectors.includes(sector.name))
                          .map((sector) => (
                            <button
                              key={sector.id}
                              type="button"
                              className="dropdown-item"
                              onClick={() => handleSectorAdd(sector.name)}
                              data-testid={`button-addSector-${sector.name}`}
                            >
                              <Plus className="w-4 h-4 me-2" />
                              {sector.name}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Selected Sectors */}
                  <div className="mt-3">
                    <small className="text-muted">Sectores seleccionados:</small>
                    <div className="mt-2">
                      {selectedSectors.map((sector) => (
                        <Badge
                          key={sector}
                          variant="secondary"
                          className="sector-tag me-1 mb-1"
                          data-testid={`badge-sector-${sector}`}
                        >
                          {sector}
                          <button
                            type="button"
                            className="btn btn-sm btn-link p-0 ms-1"
                            onClick={() => handleSectorRemove(sector)}
                            data-testid={`button-removeSector-${sector}`}
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

                {/* SECCIÓN 4: CONSULTA POPULAR */}
                <Card className="form-section-card">
                  <CardHeader className="form-section-header">
                    <h3 className="form-section-title">Comparte tu idea</h3>
                    <p className="form-section-description">Queremos escuchar tu voz para mejorar Honduras</p>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <Label htmlFor="message">
                        Mensaje *
                      </Label>
                  <Textarea
                    id="message"
                    rows={5}
                    placeholder="Ejemplo: En mi barrio necesitamos mejor alumbrado público."
                    {...form.register("message")}
                    data-testid="textarea-message"
                  />
                  <div className="form-text">
                    Sea específico y constructivo en su mensaje.
                  </div>
                  {form.formState.errors.message && (
                    <div className="text-danger small">{form.formState.errors.message.message}</div>
                  )}
                </div>

                {/* Photo Upload Section */}
                <div className="mb-4">
                  <Label className="mb-3 d-block">
                    Fotografías (Opcional)
                  </Label>
                  <div className="photo-upload-section">
                    {selectedImages.length < 3 && (
                      <div className="photo-upload-button mb-3">
                        <input
                          type="file"
                          id="photo-input"
                          accept="image/*"
                          multiple
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            const remainingSlots = 3 - selectedImages.length;
                            const filesToAdd = files.slice(0, remainingSlots);
                            setSelectedImages(prev => [...prev, ...filesToAdd]);
                            e.target.value = ''; // Reset input
                          }}
                          data-testid="input-photos"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-100 d-flex align-items-center justify-content-center gap-2 py-3"
                          onClick={() => document.getElementById('photo-input')?.click()}
                          data-testid="button-uploadPhotos"
                        >
                          <Upload className="w-5 h-5" />
                          Subir fotografías ({selectedImages.length}/3)
                        </Button>
                        <div className="form-text mt-1">
                          Máximo 3 fotografías. Todos los formatos de imagen son permitidos.
                        </div>
                      </div>
                    )}
                    
                    {/* Preview Selected Images */}
                    {selectedImages.length > 0 && (
                      <div className="selected-photos-grid row g-3">
                        {selectedImages.map((file, index) => (
                          <div key={index} className="col-md-4">
                            <div className="photo-preview-card position-relative">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Fotografía ${index + 1}`}
                                className="img-fluid rounded"
                                style={{ width: '100%', height: '150px', objectFit: 'cover' }}
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="position-absolute top-0 end-0 m-1"
                                onClick={() => {
                                  setSelectedImages(prev => prev.filter((_, i) => i !== index));
                                }}
                                data-testid={`button-removePhoto-${index}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                              <div className="photo-info mt-1">
                                <small className="text-muted">
                                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                </small>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="form-buttons-container">
                  <Button
                    type="button"
                    variant="outline"
                    className="btn-reset-custom"
                    onClick={() => {
                      form.reset();
                      setSelectedSectors([]);
                      setPersonType("natural");
                      setSelectedZone("");
                      setSelectedImages([]);
                    }}
                    data-testid="button-reset"
                  >
                    Limpiar Formulario
                  </Button>
                  <Button
                    type="submit"
                    className="btn-submit-custom"
                    disabled={createConsultationMutation.isPending || selectedSectors.length === 0}
                    data-testid="button-submit"
                  >
                    Enviar
                    {createConsultationMutation.isPending && (
                      <Loader2 className="w-4 h-4 ms-2 animate-spin" />
                    )}
                  </Button>
                </div>
                  </CardContent>
                </Card>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </div>
  );
}
