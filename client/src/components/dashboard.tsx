import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Calendar, Filter, Download, RefreshCw, Eye, ChevronDown, BarChart3, PieChart, Users, MapPin, MessageSquare } from "lucide-react";

export function Dashboard() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    departmentId: "",
    sector: "",
    offset: 0,
    limit: 10,
  });

  // Chart dependencies - Chart.js
  useEffect(() => {
    const loadChartJS = async () => {
      if (typeof window !== 'undefined' && !window.Chart) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => {
          setTimeout(initializeCharts, 100);
        };
        document.head.appendChild(script);
      } else if (window.Chart) {
        initializeCharts();
      }
    };

    loadChartJS();
  }, []);

  const initializeCharts = () => {
    if (!window.Chart) return;

    // Consultations over time chart
    const consultationsCtx = document.getElementById('consultationsChart') as HTMLCanvasElement;
    if (consultationsCtx && !(consultationsCtx as any).chart) {
      (consultationsCtx as any).chart = new window.Chart(consultationsCtx, {
        type: 'line',
        data: {
          labels: ['Oct 1', 'Oct 8', 'Oct 15', 'Oct 22', 'Oct 29', 'Nov 5', 'Nov 12', 'Nov 19', 'Nov 24'],
          datasets: [{
            label: 'Consultas',
            data: (consultationsByDate as any)?.map((d: any) => d.count) || [45, 52, 48, 61, 55, 67, 73, 81, 89],
            borderColor: '#1bd1e8',
            backgroundColor: 'rgba(27, 209, 232, 0.1)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }

    // Sectors pie chart
    const sectorsCtx = document.getElementById('sectorsChart') as HTMLCanvasElement;
    if (sectorsCtx && !(sectorsCtx as any).chart) {
      (sectorsCtx as any).chart = new window.Chart(sectorsCtx, {
        type: 'doughnut',
        data: {
          labels: (consultationsBySector as any)?.map((d: any) => d.sector) || ['Educación', 'Salud', 'Infraestructura', 'Seguridad', 'Otros'],
          datasets: [{
            data: (consultationsBySector as any)?.map((d: any) => d.count) || [25, 20, 18, 15, 22],
            backgroundColor: ['#1bd1e8', '#0f7a8c', '#198754', '#ffc107', '#6c757d']
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

  // Data queries
  const { data: stats } = useQuery<any>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: consultationsByDate } = useQuery<any>({
    queryKey: ["/api/dashboard/consultations-by-date", 30],
  });

  const { data: consultationsBySector } = useQuery<any>({
    queryKey: ["/api/dashboard/consultations-by-sector"],
  });

  const { data: consultationsData } = useQuery<any>({
    queryKey: ["/api/consultations", filters],
  });

  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ["/api/departments"],
  });

  const { data: sectors = [] } = useQuery<any[]>({
    queryKey: ["/api/sectors"],
  });

  const handleFilterApply = () => {
    // Trigger query refetch with new filters
    setFilters({ ...filters });
  };

  const handleFilterClear = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      departmentId: "",
      sector: "",
      offset: 0,
      limit: 10,
    });
  };

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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'archived': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        {/* Sidebar */}
        <div className="col-md-2">
          <div className="sidebar bg-muted p-3 rounded">
            <h6 className="text-muted text-uppercase mb-3">Administración</h6>
            <nav className="nav flex-column">
              <a className="nav-link active" href="#" data-testid="nav-overview">
                <BarChart3 className="w-4 h-4 me-2" />Resumen
              </a>
              <a className="nav-link" href="#" data-testid="nav-consultations">
                <MessageSquare className="w-4 h-4 me-2" />Consultas
              </a>
              <a className="nav-link" href="#" data-testid="nav-reports">
                <Download className="w-4 h-4 me-2" />Reportes
              </a>
              <a className="nav-link" href="#" data-testid="nav-users">
                <Users className="w-4 h-4 me-2" />Usuarios
              </a>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="col-md-10">
          {/* Dashboard Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3>Dashboard Administrativo</h3>
              <p className="text-muted mb-0">
                Última actualización: {new Date().toLocaleString('es-HN')}
              </p>
            </div>
            <div>
              <Button variant="outline" className="me-2" data-testid="button-refresh">
                <RefreshCw className="w-4 h-4 me-2" />Actualizar
              </Button>
              <Button data-testid="button-export">
                <Download className="w-4 h-4 me-2" />Exportar
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="row mb-4">
            <div className="col-md-3">
              <Card className="dashboard-card border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <MessageSquare className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <div className="fs-4 fw-bold" data-testid="stat-totalConsultations">
                        {stats?.total || 0}
                      </div>
                      <div className="text-muted">Total Consultas</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="col-md-3">
              <Card className="dashboard-card border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <Calendar className="h-8 w-8 text-success" />
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <div className="fs-4 fw-bold" data-testid="stat-thisWeek">
                        {stats?.thisWeek || 0}
                      </div>
                      <div className="text-muted">Esta Semana</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="col-md-3">
              <Card className="dashboard-card border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <MapPin className="h-8 w-8 text-warning" />
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <div className="fs-4 fw-bold" data-testid="stat-departments">
                        {stats?.departments || 0}
                      </div>
                      <div className="text-muted">Departamentos</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="col-md-3">
              <Card className="dashboard-card border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <PieChart className="h-8 w-8 text-info" />
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <div className="fs-4 fw-bold" data-testid="stat-activeSectors">
                        {stats?.activeSectors || 0}
                      </div>
                      <div className="text-muted">Sectores Activos</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Charts Row */}
          <div className="row mb-4">
            <div className="col-md-8">
              <Card className="border-0 shadow-sm">
                <CardHeader className="bg-white">
                  <CardTitle className="mb-0">
                    <BarChart3 className="w-5 h-5 me-2" />
                    Evolución de Consultas por Fecha
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="chart-container" style={{ position: 'relative', height: '300px' }}>
                    <canvas id="consultationsChart"></canvas>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="col-md-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="bg-white">
                  <CardTitle className="mb-0">
                    <PieChart className="w-5 h-5 me-2" />
                    Consultas por Sector
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="chart-container" style={{ position: 'relative', height: '300px' }}>
                    <canvas id="sectorsChart"></canvas>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Data Table */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="bg-white">
              <div className="row align-items-center">
                <div className="col">
                  <CardTitle className="mb-0">
                    <MessageSquare className="w-5 h-5 me-2" />
                    Consultas Recientes
                  </CardTitle>
                </div>
                <div className="col-auto">
                  <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-toggleFilters">
                        <Filter className="w-4 h-4 me-1" />
                        Filtros
                        <ChevronDown className="w-4 h-4 ms-1" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      <div className="row g-3">
                        <div className="col-md-3">
                          <Label className="form-label small">Fecha Desde</Label>
                          <Input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                            data-testid="input-dateFrom"
                          />
                        </div>
                        <div className="col-md-3">
                          <Label className="form-label small">Fecha Hasta</Label>
                          <Input
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                            data-testid="input-dateTo"
                          />
                        </div>
                        <div className="col-md-3">
                          <Label className="form-label small">Departamento</Label>
                          <Select
                            value={filters.departmentId}
                            onValueChange={(value) => setFilters({ ...filters, departmentId: value })}
                          >
                            <SelectTrigger data-testid="select-departmentFilter">
                              <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Todos</SelectItem>
                              {departments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                  {dept.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-md-3">
                          <Label className="form-label small">Sector</Label>
                          <Select
                            value={filters.sector}
                            onValueChange={(value) => setFilters({ ...filters, sector: value })}
                          >
                            <SelectTrigger data-testid="select-sectorFilter">
                              <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Todos</SelectItem>
                              {sectors.map((sector) => (
                                <SelectItem key={sector.id} value={sector.name}>
                                  {sector.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="row mt-2">
                        <div className="col">
                          <Button 
                            size="sm" 
                            onClick={handleFilterApply}
                            data-testid="button-applyFilters"
                          >
                            <Filter className="w-4 h-4 me-1" />
                            Aplicar Filtros
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="ms-2"
                            onClick={handleFilterClear}
                            data-testid="button-clearFilters"
                          >
                            Limpiar
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="table-responsive">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo Persona</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Sectores</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consultationsData?.consultations?.map((consultation: any) => (
                      <TableRow key={consultation.id}>
                        <TableCell>
                          <code className="small">{consultation.id.slice(0, 8)}...</code>
                        </TableCell>
                        <TableCell>{formatDate(consultation.createdAt.toString())}</TableCell>
                        <TableCell>
                          <Badge variant={getPersonTypeBadgeVariant(consultation.personType)}>
                            {consultation.personType === 'natural' ? 'Natural' : 
                             consultation.personType === 'juridica' ? 'Jurídica' : 'Anónimo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="small">{consultation.geocode}</span>
                        </TableCell>
                        <TableCell>
                          <div className="d-flex flex-wrap gap-1">
                            {consultation.selectedSectors.slice(0, 2).map((sector: any) => (
                              <Badge key={sector} variant="secondary" className="small">
                                {sector}
                              </Badge>
                            ))}
                            {consultation.selectedSectors.length > 2 && (
                              <Badge variant="outline" className="small">
                                +{consultation.selectedSectors.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(consultation.status)}>
                            {consultation.status === 'active' ? 'Activa' : 'Archivada'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" data-testid={`button-view-${consultation.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="ms-1" data-testid={`button-export-${consultation.id}`}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted">
                          No hay consultas disponibles
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {consultationsData?.total > 0 && (
                <div className="d-flex justify-content-between align-items-center p-3 border-top">
                  <small className="text-muted">
                    Mostrando {filters.offset + 1}-{Math.min(filters.offset + filters.limit, consultationsData.total)} de {consultationsData.total} registros
                  </small>
                  <nav>
                    <div className="d-flex gap-2">
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
  );
}

// Global Chart.js type declaration
declare global {
  interface Window {
    Chart: any;
  }
}
