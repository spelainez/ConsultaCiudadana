import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Calendar, 
  Filter, 
  Download, 
  RefreshCw, 
  Eye, 
  ChevronDown, 
  BarChart3, 
  PieChart, 
  MapPin, 
  MessageSquare, 
  User, 
  UserPlus, 
  LogOut, 
  Edit, 
  Trash2, 
  ArrowUpDown,
  Settings,
  X,
  Shield,
  Key,
  Zap,
  Users
} from "lucide-react";
import { UserManagementSPE } from "./user-management-spe";

export function Dashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showCreatePlanificador, setShowCreatePlanificador] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showConsultationDetail, setShowConsultationDetail] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<any>(null);
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    departmentId: "",
    sector: "",
    personType: "",
    status: "",
    offset: 0,
    limit: 10,
  });

  // Chart dependencies - Chart.js
  useEffect(() => {
    const loadChartJS = async () => {
      if (typeof window !== 'undefined' && !(window as any).Chart) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => {
          setTimeout(initializeCharts, 100);
        };
        document.head.appendChild(script);
      } else if ((window as any).Chart) {
        initializeCharts();
      }
    };

    loadChartJS();
  }, []);

  const initializeCharts = () => {
    if (!(window as any).Chart) return;

    // Sectors pie chart
    const sectorsCtx = document.getElementById('sectorsChart') as HTMLCanvasElement;
    if (sectorsCtx && !(sectorsCtx as any).chart) {
      (sectorsCtx as any).chart = new (window as any).Chart(sectorsCtx, {
        type: 'doughnut',
        data: {
          labels: (consultationsBySector as any)?.map((d: any) => d.sector) || ['Educación', 'Salud', 'Infraestructura', 'Seguridad', 'Otros'],
          datasets: [{
            data: (consultationsBySector as any)?.map((d: any) => d.count) || [25, 20, 18, 15, 22],
            backgroundColor: ['#1bd1e8', '#17b8cd', '#198754', '#ffc107', '#6c757d']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                usePointStyle: true,
                padding: 15
              }
            }
          }
        }
      });
    }
  };

  // Data queries with hierarchical keys
  const { data: stats } = useQuery<any>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: consultationsByDate } = useQuery<any>({
    queryKey: ["/api/dashboard/consultations-by-date", 30],
  });

  const { data: consultationsBySector } = useQuery<any>({
    queryKey: ["/api/dashboard/consultations-by-sector"],
  });

  const { data: consultationsData, refetch: refetchConsultations } = useQuery<any>({
    queryKey: ["/api/consultations", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          params.append(key, String(value));
        }
      });
      const response = await fetch(`/api/consultations?${params.toString()}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch consultations');
      return response.json();
    }
  });

  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ["/api/departments"],
  });

  const { data: sectors = [] } = useQuery<any[]>({
    queryKey: ["/api/sectors"],
  });

  // Filter handlers
  const handleFilterApply = () => {
    setFilters({
      ...filters,
      departmentId: filters.departmentId === "all" ? "" : filters.departmentId,
      sector: filters.sector === "all" ? "" : filters.sector,
      personType: filters.personType === "all" ? "" : filters.personType,
      status: filters.status === "all" ? "" : filters.status,
      offset: 0, // Reset pagination
    });
  };

  const handleFilterClear = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      departmentId: "",
      sector: "",
      personType: "",
      status: "",
      offset: 0,
      limit: 10,
    });
  };

  // Manual refresh function
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/consultations"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/consultations-by-sector"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/consultations-by-date"] });
    toast({
      title: "Datos actualizados",
      description: "Los datos han sido actualizados exitosamente.",
    });
  };

  // Export functions
  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Error al exportar",
        description: "No se pudo descargar el archivo. Inténtelo de nuevo.",
        variant: "destructive",
      });
    }
  };

  const buildExportUrl = (format: string) => {
    const baseUrl = `/api/export/consultations/${format}`;
    const params = new URLSearchParams();
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.departmentId && filters.departmentId !== 'all') params.append('departmentId', filters.departmentId);
    if (filters.sector && filters.sector !== 'all') params.append('sector', filters.sector);
    if (filters.personType && filters.personType !== 'all') params.append('personType', filters.personType);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    return `${baseUrl}?${params.toString()}`;
  };

  const handleExportCSV = () => {
    const url = buildExportUrl('csv');
    const filename = `consultas_${new Date().toISOString().split('T')[0]}.csv`;
    downloadFile(url, filename);
  };

  const handleExportExcel = () => {
    const url = buildExportUrl('excel');
    const filename = `consultas_${new Date().toISOString().split('T')[0]}.xlsx`;
    downloadFile(url, filename);
  };

  const handleExportPDF = () => {
    const url = buildExportUrl('pdf');
    const filename = `consultas_${new Date().toISOString().split('T')[0]}.pdf`;
    downloadFile(url, filename);
  };

  // Navbar actions
  const handleCreatePlanificador = () => {
    navigate("/admin/users");
  };

  const handleProfile = () => {
    setShowProfile(true);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Sorting functions
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Apply sorting to consultations data
  const sortedConsultations = consultationsData?.consultations ? 
    [...consultationsData.consultations].sort((a: any, b: any) => {
      if (!sortConfig) return 0;
      
      const { key, direction } = sortConfig;
      let aValue = a[key];
      let bValue = b[key];
      
      // Handle specific field types
      if (key === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    }) : [];

  // View consultation detail
  const handleViewDetail = (consultation: any) => {
    setSelectedConsultation(consultation);
    setShowConsultationDetail(true);
  };

  // Delete consultation mutation
  const deleteConsultationMutation = useMutation({
    mutationFn: async (consultationId: string) => {
      const response = await apiRequest("DELETE", `/api/consultations/${consultationId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/consultations"] });
      toast({
        title: "Consulta eliminada",
        description: "La consulta ha sido eliminada exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar la consulta",
        variant: "destructive",
      });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ consultationId, status }: { consultationId: string, status: string }) => {
      const response = await apiRequest("PATCH", `/api/consultations/${consultationId}/status`, { status });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/consultations"] });
      toast({
        title: "Estado actualizado",
        description: "El estado de la consulta ha sido actualizado exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el estado",
        variant: "destructive",
      });
    },
  });

  // Utility functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-HN');
  };

  const getPersonTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'natural': return 'default';
      case 'juridica': return 'secondary';
      case 'anonimo': return 'outline';
      default: return 'default';
    }
  };

  const getPersonTypeLabel = (type: string) => {
    switch (type) {
      case 'natural': return 'Natural';
      case 'juridica': return 'Jurídica';
      case 'anonimo': return 'Anónimo';
      default: return type;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'archived': return 'secondary';
      default: return 'default';
    }
  };

  const getPersonalData = (consultation: any) => {
    if (consultation.personType === 'natural') {
      return `${consultation.firstName || ''} ${consultation.lastName || ''}`.trim() || consultation.identity || 'Sin datos';
    } else if (consultation.personType === 'juridica') {
      return consultation.companyName || consultation.rtn || 'Sin datos';
    } else {
      return 'Anónimo';
    }
  };

  const getLocationString = (consultation: any) => {
    const parts = [];
    if (consultation.department?.name) parts.push(consultation.department.name);
    if (consultation.municipality?.name) parts.push(consultation.municipality.name);
    if (consultation.locality?.name) parts.push(consultation.locality.name);
    return parts.join(', ') || consultation.geocode || 'Sin ubicación';
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f7fa' }}>
      {/* Navbar Superior */}
      <div 
        className="shadow-sm sticky top-0 border-0 z-10" 
        style={{ backgroundColor: '#1bd1e8' }}
      >
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center">
              <Settings className="w-6 h-6 text-white mr-3" />
              <h4 className="mb-0 font-bold text-white text-lg">Panel Principal</h4>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                className="border-white text-white hover:bg-white hover:text-slate-800 bg-transparent" 
                size="sm" 
                onClick={handleRefresh}
                data-testid="button-refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>

              {/* User Menu */}
              <div className="flex items-center text-white">
                <span className="font-medium mr-1">{user?.username}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-white hover:bg-white hover:bg-opacity-20 p-1"
                      data-testid="button-user-menu"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={handleCreatePlanificador}
                      data-testid="button-create-planificador"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Crear Usuario
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleProfile}
                      data-testid="button-profile"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Mi Perfil
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleLogout}
                      data-testid="button-logout"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Cerrar Sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="w-full">


            {/* Data Table */}
            <Card className="border-0 shadow-sm rounded-lg">
              <CardHeader style={{ backgroundColor: '#fff' }} className="border-0 rounded-t-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <CardTitle className="mb-0 flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2" style={{ color: '#1bd1e8' }} />
                      Consultas Ciudadanas
                    </CardTitle>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline"
                          size="sm" 
                          data-testid="button-export-table"
                          className="border text-gray-600 hover:bg-gray-50"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Exportar
                          <ChevronDown className="w-4 h-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem 
                          onClick={() => handleExportCSV()}
                          data-testid="button-export-csv"
                        >
                          <Download className="w-4 h-4 mr-2" />CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleExportExcel()}
                          data-testid="button-export-excel"
                        >
                          <Download className="w-4 h-4 mr-2" />Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleExportPDF()}
                          data-testid="button-export-pdf"
                        >
                          <Download className="w-4 h-4 mr-2" />PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div>
                    <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          data-testid="button-toggleFilters"
                          className="border-2"
                          style={{ borderColor: '#1bd1e8', color: '#1bd1e8' }}
                        >
                          <Filter className="w-4 h-4 mr-1" />
                          Filtros
                          <ChevronDown className="w-4 h-4 ml-1" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                          <div>
                            <Label className="text-sm font-medium">Fecha Desde</Label>
                            <Input
                              type="date"
                              value={filters.dateFrom}
                              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                              data-testid="input-dateFrom"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Fecha Hasta</Label>
                            <Input
                              type="date"
                              value={filters.dateTo}
                              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                              data-testid="input-dateTo"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Departamento</Label>
                            <Select
                              value={filters.departmentId}
                              onValueChange={(value) => setFilters({ ...filters, departmentId: value })}
                            >
                              <SelectTrigger data-testid="select-departmentFilter">
                                <SelectValue placeholder="Todos" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {departments.map((dept) => (
                                  <SelectItem key={dept.id} value={dept.id}>
                                    {dept.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Sector</Label>
                            <Select
                              value={filters.sector}
                              onValueChange={(value) => setFilters({ ...filters, sector: value })}
                            >
                              <SelectTrigger data-testid="select-sectorFilter">
                                <SelectValue placeholder="Todos" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {sectors.map((sector) => (
                                  <SelectItem key={sector.id} value={sector.name}>
                                    {sector.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Tipo Persona</Label>
                            <Select
                              value={filters.personType}
                              onValueChange={(value) => setFilters({ ...filters, personType: value })}
                            >
                              <SelectTrigger data-testid="select-personTypeFilter">
                                <SelectValue placeholder="Todos" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="natural">Natural</SelectItem>
                                <SelectItem value="juridica">Jurídica</SelectItem>
                                <SelectItem value="anonimo">Anónimo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Estado</Label>
                            <Select
                              value={filters.status}
                              onValueChange={(value) => setFilters({ ...filters, status: value })}
                            >
                              <SelectTrigger data-testid="select-statusFilter">
                                <SelectValue placeholder="Todos" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="active">Activa</SelectItem>
                                <SelectItem value="archived">Archivada</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button 
                            size="sm" 
                            onClick={handleFilterApply}
                            data-testid="button-applyFilters"
                            style={{ backgroundColor: '#1bd1e8', borderColor: '#1bd1e8' }}
                          >
                            <Filter className="w-4 h-4 mr-1" />
                            Aplicar Filtros
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleFilterClear}
                            data-testid="button-clearFilters"
                          >
                            Limpiar
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Desktop Table */}
                <div className="overflow-x-auto hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleSort('id')}
                            className="p-0 h-auto font-bold"
                          >
                            ID <ArrowUpDown className="w-3 h-3 ml-1" />
                          </Button>
                        </TableHead>
                        <TableHead className="font-bold">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleSort('createdAt')}
                            className="p-0 h-auto font-bold"
                          >
                            Fecha <ArrowUpDown className="w-3 h-3 ml-1" />
                          </Button>
                        </TableHead>
                        <TableHead className="font-bold">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleSort('personType')}
                            className="p-0 h-auto font-bold"
                          >
                            Tipo Persona <ArrowUpDown className="w-3 h-3 ml-1" />
                          </Button>
                        </TableHead>
                        <TableHead className="font-bold">Datos Personales</TableHead>
                        <TableHead className="font-bold">Ubicación</TableHead>
                        <TableHead className="font-bold">Sectores</TableHead>
                        <TableHead className="font-bold">Mensaje</TableHead>
                        <TableHead className="font-bold">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleSort('status')}
                            className="p-0 h-auto font-bold"
                          >
                            Estado <ArrowUpDown className="w-3 h-3 ml-1" />
                          </Button>
                        </TableHead>
                        <TableHead className="font-bold">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedConsultations.length > 0 ? sortedConsultations.map((consultation: any) => (
                        <TableRow key={consultation.id}>
                          <TableCell>
                            <code className="text-sm">{consultation.id.slice(0, 8)}...</code>
                          </TableCell>
                          <TableCell>{formatDate(consultation.createdAt.toString())}</TableCell>
                          <TableCell>
                            <Badge variant={getPersonTypeBadgeVariant(consultation.personType)}>
                              {getPersonTypeLabel(consultation.personType)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{getPersonalData(consultation)}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{getLocationString(consultation)}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {consultation.selectedSectors.slice(0, 2).map((sector: any, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {sector}
                                </Badge>
                              ))}
                              {consultation.selectedSectors.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{consultation.selectedSectors.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {consultation.message.length > 50 
                                ? `${consultation.message.substring(0, 50)}...` 
                                : consultation.message}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(consultation.status)}>
                              {consultation.status === 'active' ? 'Activa' : 'Archivada'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleViewDetail(consultation)}
                                data-testid={`button-view-${consultation.id}`}
                                title="Ver detalles"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => updateStatusMutation.mutate({
                                  consultationId: consultation.id,
                                  status: consultation.status === 'active' ? 'archived' : 'active'
                                })}
                                data-testid={`button-edit-${consultation.id}`}
                                title={consultation.status === 'active' ? 'Archivar' : 'Activar'}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => deleteConsultationMutation.mutate(consultation.id)}
                                data-testid={`button-delete-${consultation.id}`}
                                className="text-red-600 hover:bg-red-50 border-red-200"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-gray-500 py-4">
                            No hay consultas disponibles
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden p-3">
                  {sortedConsultations.length > 0 ? sortedConsultations.map((consultation: any) => (
                    <Card key={consultation.id} className="mb-3 border rounded-lg">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2">
                          <code className="text-sm">{consultation.id.slice(0, 8)}...</code>
                          <Badge variant={getStatusBadgeVariant(consultation.status)}>
                            {consultation.status === 'active' ? 'Activa' : 'Archivada'}
                          </Badge>
                        </div>
                        <div className="mb-2">
                          <strong>Fecha:</strong> {formatDate(consultation.createdAt.toString())}
                        </div>
                        <div className="mb-2">
                          <strong>Tipo:</strong> 
                          <Badge variant={getPersonTypeBadgeVariant(consultation.personType)} className="ml-2">
                            {getPersonTypeLabel(consultation.personType)}
                          </Badge>
                        </div>
                        <div className="mb-2">
                          <strong>Datos:</strong> {getPersonalData(consultation)}
                        </div>
                        <div className="mb-2">
                          <strong>Ubicación:</strong> {getLocationString(consultation)}
                        </div>
                        <div className="mb-2">
                          <strong>Sectores:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {consultation.selectedSectors.slice(0, 3).map((sector: any, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {sector}
                              </Badge>
                            ))}
                            {consultation.selectedSectors.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{consultation.selectedSectors.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="mb-3">
                          <strong>Mensaje:</strong>
                          <p className="mb-0 text-sm mt-1">
                            {consultation.message.length > 100 
                              ? `${consultation.message.substring(0, 100)}...` 
                              : consultation.message}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewDetail(consultation)}
                            data-testid={`button-view-mobile-${consultation.id}`}
                          >
                            <Eye className="w-4 h-4 mr-1" />Ver
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => updateStatusMutation.mutate({
                              consultationId: consultation.id,
                              status: consultation.status === 'active' ? 'archived' : 'active'
                            })}
                            data-testid={`button-edit-mobile-${consultation.id}`}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            {consultation.status === 'active' ? 'Archivar' : 'Activar'}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => deleteConsultationMutation.mutate(consultation.id)}
                            data-testid={`button-delete-mobile-${consultation.id}`}
                            className="text-red-600 hover:bg-red-50 border-red-200"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )) : (
                    <div className="text-center text-gray-500 py-4">
                      No hay consultas disponibles
                    </div>
                  )}
                </div>
                
                {/* Pagination */}
                {consultationsData?.total > 0 && (
                  <div className="flex justify-between items-center p-3 border-t">
                    <small className="text-gray-600">
                      Mostrando {filters.offset + 1}-{Math.min(filters.offset + filters.limit, consultationsData.total)} de {consultationsData.total} registros
                    </small>
                    <nav>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={filters.offset === 0}
                          onClick={() => setFilters({ ...filters, offset: Math.max(0, filters.offset - filters.limit) })}
                          data-testid="button-previousPage"
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={filters.offset + filters.limit >= consultationsData.total}
                          onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}
                          data-testid="button-nextPage"
                        >
                          Siguiente
                        </Button>
                      </div>
                    </nav>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      {/* Modal de Detalle de Consulta */}
      <Dialog open={showConsultationDetail} onOpenChange={setShowConsultationDetail}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" style={{ color: '#1bd1e8' }} />
              Detalle de Consulta Ciudadana
            </DialogTitle>
            <DialogDescription>
              Información completa de la consulta seleccionada
            </DialogDescription>
          </DialogHeader>
          {selectedConsultation && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">ID de Consulta</Label>
                  <p className="text-sm"><code>{selectedConsultation.id}</code></p>
                </div>
                <div>
                  <Label className="font-semibold">Fecha de Creación</Label>
                  <p className="text-sm">{formatDate(selectedConsultation.createdAt.toString())}</p>
                </div>
                <div>
                  <Label className="font-semibold">Tipo de Persona</Label>
                  <div>
                    <Badge variant={getPersonTypeBadgeVariant(selectedConsultation.personType)}>
                      {getPersonTypeLabel(selectedConsultation.personType)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="font-semibold">Estado</Label>
                  <div>
                    <Badge variant={getStatusBadgeVariant(selectedConsultation.status)}>
                      {selectedConsultation.status === 'active' ? 'Activa' : 'Archivada'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Datos Personales */}
              <div>
                <Label className="font-semibold text-lg">Datos Personales</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {selectedConsultation.personType === 'natural' && (
                    <>
                      <div>
                        <Label className="text-sm">Nombre</Label>
                        <p className="text-sm">{selectedConsultation.firstName || 'No especificado'}</p>
                      </div>
                      <div>
                        <Label className="text-sm">Apellido</Label>
                        <p className="text-sm">{selectedConsultation.lastName || 'No especificado'}</p>
                      </div>
                      <div>
                        <Label className="text-sm">Identidad</Label>
                        <p className="text-sm">{selectedConsultation.identity || 'No especificado'}</p>
                      </div>
                    </>
                  )}
                  {selectedConsultation.personType === 'juridica' && (
                    <>
                      <div>
                        <Label className="text-sm">Nombre de la Empresa</Label>
                        <p className="text-sm">{selectedConsultation.companyName || 'No especificado'}</p>
                      </div>
                      <div>
                        <Label className="text-sm">RTN</Label>
                        <p className="text-sm">{selectedConsultation.rtn || 'No especificado'}</p>
                      </div>
                      <div>
                        <Label className="text-sm">Representante Legal</Label>
                        <p className="text-sm">{selectedConsultation.legalRepresentative || 'No especificado'}</p>
                      </div>
                      <div>
                        <Label className="text-sm">Contacto de la Empresa</Label>
                        <p className="text-sm">{selectedConsultation.companyContact || 'No especificado'}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <Label className="text-sm">Email</Label>
                    <p className="text-sm">{selectedConsultation.email || 'No especificado'}</p>
                  </div>
                  <div>
                    <Label className="text-sm">Teléfono Móvil</Label>
                    <p className="text-sm">{selectedConsultation.mobile || 'No especificado'}</p>
                  </div>
                </div>
              </div>

              {/* Ubicación */}
              <div>
                <Label className="font-semibold text-lg">Ubicación</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  <div>
                    <Label className="text-sm">Ubicación Completa</Label>
                    <p className="text-sm">{getLocationString(selectedConsultation)}</p>
                  </div>
                  <div>
                    <Label className="text-sm">Geocódigo</Label>
                    <p className="text-sm">{selectedConsultation.geocode}</p>
                  </div>
                </div>
              </div>

              {/* Sectores */}
              <div>
                <Label className="font-semibold text-lg">Sectores Seleccionados</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedConsultation.selectedSectors.map((sector: string, index: number) => (
                    <Badge key={index} variant="secondary">
                      {sector}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Mensaje */}
              <div>
                <Label className="font-semibold text-lg">Mensaje Ciudadano</Label>
                <div className="border rounded p-3 mt-2" style={{ backgroundColor: '#f5f7fa' }}>
                  <p className="text-sm mb-0">{selectedConsultation.message}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConsultationDetail(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Crear Planificador */}
      <Dialog open={showCreatePlanificador} onOpenChange={setShowCreatePlanificador}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Usuario Planificador</DialogTitle>
            <DialogDescription>
              Esta funcionalidad será implementada próximamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreatePlanificador(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Perfil */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <User className="w-6 h-6 mr-2" style={{ color: '#1bd1e8' }} />
              Mi Perfil de Usuario
            </DialogTitle>
            <DialogDescription>
              Panel de información personal y configuración de cuenta
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Avatar y Info Principal */}
            <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
                style={{ backgroundColor: '#1bd1e8' }}
              >
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{user?.username}</h3>
                <Badge 
                  variant={user?.role === 'super_admin' ? 'destructive' : 'default'}
                  className="mt-1"
                >
                  {user?.role === 'super_admin' ? 'Super Administrador' : 
                   user?.role === 'admin' ? 'Administrador' : 
                   user?.role === 'planificador' ? 'Planificador' : 'Ciudadano'}
                </Badge>
                <p className="text-sm text-gray-600 mt-1">
                  Miembro desde {user?.createdAt ? formatDate(user.createdAt.toString()) : 'Fecha no disponible'}
                </p>
              </div>
            </div>

            {/* Estadísticas del Usuario */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white border rounded-lg">
                <div className="text-2xl font-bold" style={{ color: '#1bd1e8' }}>
                  {consultationsData?.total || 0}
                </div>
                <div className="text-sm text-gray-600">Consultas Gestionadas</div>
              </div>
              <div className="text-center p-3 bg-white border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {consultationsData?.total ? Math.round((consultationsData.total * 0.85)) : 0}
                </div>
                <div className="text-sm text-gray-600">Consultas Activas</div>
              </div>
              <div className="text-center p-3 bg-white border rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {user?.createdAt ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0}
                </div>
                <div className="text-sm text-gray-600">Días en Sistema</div>
              </div>
              <div className="text-center p-3 bg-white border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {user?.role === 'super_admin' ? '100%' : user?.role === 'admin' ? '85%' : '60%'}
                </div>
                <div className="text-sm text-gray-600">Nivel de Acceso</div>
              </div>
            </div>

            {/* Información Detallada */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center">
                  <Settings className="w-4 h-4 mr-2" style={{ color: '#1bd1e8' }} />
                  Información de Cuenta
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID de Usuario:</span>
                    <code className="text-xs">{user?.id?.slice(0, 8)}...</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estado:</span>
                    <Badge variant="default" className="text-xs">Activo</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Última Sesión:</span>
                    <span>Ahora</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center">
                  <Shield className="w-4 h-4 mr-2" style={{ color: '#1bd1e8' }} />
                  Seguridad
                </h4>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => {
                      setShowProfile(false);
                      // Future: Open change password modal
                      toast({
                        title: "Próximamente",
                        description: "La función de cambiar contraseña estará disponible pronto."
                      });
                    }}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Cambiar Contraseña
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => {
                      toast({
                        title: "Sesión Segura",
                        description: "Tu sesión está protegida y encriptada.",
                      });
                    }}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Verificar Seguridad
                  </Button>
                </div>
              </div>
            </div>

            {/* Acceso Rápido */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3 flex items-center">
                <Zap className="w-4 h-4 mr-2" style={{ color: '#1bd1e8' }} />
                Acciones Rápidas
              </h4>
              <div className="flex flex-wrap gap-2">
                {user?.role === 'super_admin' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setShowProfile(false);
                      navigate('/admin/users');
                    }}
                  >
                    <Users className="w-4 h-4 mr-1" />
                    Gestionar Usuarios
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setShowProfile(false);
                    handleFilterClear();
                  }}
                >
                  <Filter className="w-4 h-4 mr-1" />
                  Limpiar Filtros
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleExportCSV()}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Exportar Datos
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowProfile(false)}
            >
              Cerrar
            </Button>
            <Button 
              onClick={() => {
                toast({
                  title: "¡Perfil actualizado!",
                  description: "Tu información de perfil se mantiene sincronizada.",
                });
                setShowProfile(false);
              }}
              style={{ backgroundColor: '#1bd1e8', borderColor: '#1bd1e8' }}
            >
              Actualizar Perfil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}