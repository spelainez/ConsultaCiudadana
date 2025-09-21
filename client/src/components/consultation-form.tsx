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
import { Loader2, X, Plus, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const consultationFormSchema = insertConsultationSchema;

type ConsultationFormData = z.infer<typeof consultationFormSchema>;

export function ConsultationForm() {
  const { toast } = useToast();
  const [personType, setPersonType] = useState<string>("natural");
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [sectorSearch, setSectorSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string>("");
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
    queryKey: ["/api/localities", form.watch("municipalityId"), selectedZone],
    enabled: !!form.watch("municipalityId") && !!selectedZone,
  });

  const { data: sectors = [] } = useQuery<any[]>({
    queryKey: ["/api/sectors"],
  });

  const { data: sectorSuggestions = [] } = useQuery<any[]>({
    queryKey: [`/api/sectors/search?q=${sectorSearch}`],
    enabled: sectorSearch.length > 2,
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

  const onSubmit = (data: ConsultationFormData) => {
    createConsultationMutation.mutate({
      ...data,
      selectedSectors,
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
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-10">
          <Card className="form-section">
            <CardHeader>
              <CardTitle className="text-center">
                <h2 className="mb-1">Construyamos una Honduras Próspera Juntos</h2>
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Person Type Selection - Card Style */}
                <div className="mb-4">
                  <Label className="form-label fw-bold mb-3">Tipo de Persona</Label>
                  <div className="row g-3">
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
                </div>

                {/* Conditional Fields for Natural Person */}
                {personType === "natural" && (
                  <div className="conditional-fields">
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <Label htmlFor="firstName">Primer Nombre *</Label>
                        <Input
                          id="firstName"
                          {...form.register("firstName")}
                          data-testid="input-firstName"
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
                          placeholder="0801-1990-12345"
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
                        />
                        {form.formState.errors.email && (
                          <div className="text-danger small">{form.formState.errors.email.message}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Conditional Fields for Juridica Person */}
                {personType === "juridica" && (
                  <div className="conditional-fields">
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <Label htmlFor="companyName">Nombre de la Empresa *</Label>
                        <Input
                          id="companyName"
                          {...form.register("companyName")}
                          data-testid="input-companyName"
                        />
                        {form.formState.errors.companyName && (
                          <div className="text-danger small">{form.formState.errors.companyName.message}</div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <Label htmlFor="rtn">RTN *</Label>
                        <Input
                          id="rtn"
                          placeholder="08019901234567"
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
                  <div>
                    <h5 className="mb-3">
                      <i className="bi bi-telephone me-2"></i>Información de Contacto (Opcional)
                    </h5>
                    <div className="row mb-3">
                      <div className="col-md-4">
                        <Label htmlFor="mobile">Celular</Label>
                        <Input
                          id="mobile"
                          placeholder="+504 9999-9999"
                          {...form.register("mobile")}
                          data-testid="input-mobile"
                        />
                      </div>
                      <div className="col-md-4">
                        <Label htmlFor="phone">Teléfono Fijo</Label>
                        <Input
                          id="phone"
                          placeholder="+504 2222-2222"
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
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Modern Location Selection */}
                <div className="modern-location-selector mb-4">
                  <h5 className="mb-4 text-center">
                    <span className="location-icon">📍</span> Ubicación
                  </h5>
                  
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
                            : "🌎 Seleccione su departamento..."}
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
                  {form.watch("departmentId") && (
                    <div className="location-step mb-3 animate-fade-in">
                      <Label htmlFor="municipality" className="location-label">2. Municipio *</Label>
                      <Popover open={openMunicipality} onOpenChange={setOpenMunicipality}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openMunicipality}
                            className="location-select justify-between"
                            data-testid="select-municipality"
                          >
                            {form.watch("municipalityId")
                              ? municipalities.find((muni) => muni.id === form.watch("municipalityId"))?.name
                              : "🏘️ Seleccione su municipio..."}
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
                  )}

                  {/* Zone Selection */}
                  {form.watch("municipalityId") && (
                    <div className="location-step mb-3 animate-fade-in">
                      <Label className="location-label">3. Zona *</Label>
                      <div className="zone-selection">
                        <div className="row g-2">
                          <div className="col-6">
                            <div 
                              className={`zone-card ${selectedZone === "urbano" ? "selected" : ""}`}
                              onClick={() => {
                                setSelectedZone("urbano");
                                form.setValue("localityId", "");
                              }}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setSelectedZone("urbano");
                                  form.setValue("localityId", "");
                                }
                              }}
                              data-testid="zone-urbano"
                            >
                              <div className="zone-content">
                                <span className="zone-emoji">🏙️</span>
                                <span className="zone-text">Urbano</span>
                                <small className="zone-subtitle">Colonias y Barrios</small>
                              </div>
                            </div>
                          </div>
                          <div className="col-6">
                            <div 
                              className={`zone-card ${selectedZone === "rural" ? "selected" : ""}`}
                              onClick={() => {
                                setSelectedZone("rural");
                                form.setValue("localityId", "");
                              }}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setSelectedZone("rural");
                                  form.setValue("localityId", "");
                                }
                              }}
                              data-testid="zone-rural"
                            >
                              <div className="zone-content">
                                <span className="zone-emoji">🌾</span>
                                <span className="zone-text">Rural</span>
                                <small className="zone-subtitle">Aldeas y Caseríos</small>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Locality Selection */}
                  {selectedZone && (
                    <div className="location-step mb-3 animate-fade-in">
                      <Label className="location-label">
                        4. {selectedZone === "urbano" ? "Colonia o Barrio" : "Aldea o Caserío"} *
                      </Label>
                      <Select
                        onValueChange={(value) => form.setValue("localityId", value)}
                        key={selectedZone} // Force re-render when zone changes
                      >
                        <SelectTrigger className="location-select" data-testid="select-locality">
                          <SelectValue placeholder={
                            selectedZone === "urbano" 
                              ? "🏘️ Seleccione su colonia o barrio..." 
                              : "🌾 Seleccione su aldea o caserío..."
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {localities
                            .filter(locality => locality.area === selectedZone)
                            .map((locality) => (
                              <SelectItem key={locality.id} value={locality.id}>
                                {locality.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.localityId && (
                        <div className="text-danger small mt-1">{form.formState.errors.localityId.message}</div>
                      )}
                    </div>
                  )}

                  {/* Geocode Display */}
                  {form.watch("localityId") && (
                    <div className="geocode-display animate-fade-in">
                      <div className="geocode-container">
                        <Label className="geocode-label">Geocódigo Generado</Label>
                        <div className="geocode-value" data-testid="text-geocode">
                          {(() => {
                            const selectedDept = departments.find(d => d.id === form.watch("departmentId"));
                            const selectedMuni = municipalities.find(m => m.id === form.watch("municipalityId"));
                            const selectedLocality = localities.find(l => l.id === form.watch("localityId"));
                            
                            if (selectedDept && selectedMuni && selectedLocality) {
                              return `${selectedDept.geocode}-${selectedMuni.geocode}-${selectedLocality.geocode}`;
                            }
                            return "Generando...";
                          })()}
                        </div>
                        <small className="geocode-subtitle">
                          Este código identifica únicamente su ubicación
                        </small>
                      </div>
                    </div>
                  )}
                </div>

                {/* Intelligent Sector Search */}
                <div className="mb-4">
                  <h5 className="mb-3">
                    <i className="bi bi-tags-fill me-2"></i>Sectores de Interés
                  </h5>
                  <div className="position-relative">
                    <Input
                      value={sectorSearch}
                      onChange={(e) => {
                        setSectorSearch(e.target.value);
                        setShowSuggestions(e.target.value.length > 2);
                      }}
                      placeholder="Escriba para buscar sectores (ej: educación, salud, infraestructura...)"
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
                </div>

                {/* Message Field */}
                <div className="mb-4">
                  <Label htmlFor="message" className="fw-bold">
                    <i className="bi bi-chat-text me-2"></i>Su Consulta Popular *
                  </Label>
                  <Textarea
                    id="message"
                    rows={5}
                    placeholder="Describa su consulta, sugerencia o preocupación sobre los sectores seleccionados..."
                    {...form.register("message")}
                    data-testid="textarea-message"
                  />
                  <div className="form-text">
                    <i className="bi bi-info-circle me-1"></i>
                    Sea específico y constructivo en su mensaje.
                  </div>
                  {form.formState.errors.message && (
                    <div className="text-danger small">{form.formState.errors.message.message}</div>
                  )}
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
                    }}
                    data-testid="button-reset"
                  >
                    <i className="bi bi-arrow-clockwise me-2"></i>Limpiar Formulario
                  </Button>
                  <Button
                    type="submit"
                    className="btn-submit-custom"
                    disabled={createConsultationMutation.isPending || selectedSectors.length === 0}
                    data-testid="button-submit"
                  >
                    <i className="bi bi-send me-2"></i>Enviar Consulta
                    {createConsultationMutation.isPending && (
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
  );
}
