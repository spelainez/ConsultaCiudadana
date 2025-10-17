import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

import {
  Filter, Download, RefreshCw, Eye, ChevronDown, BarChart3, PieChart as PieIcon,
  MessageSquare, User, UserPlus, LogOut, Edit, Trash2, ArrowUpDown, Settings,
  Images as ImagesIcon, ExternalLink, ChevronLeft, ChevronRight
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart as RPieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from "recharts";

/* ======== Schemas ======== */
const consultationSchema = z.object({
  personType: z.enum(["natural", "juridica", "anonimo"]),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  identity: z.string().optional(),
  companyName: z.string().optional(),
  rtn: z.string().optional(),
  legalRepresentative: z.string().optional(),
  companyContact: z.string().optional(),
  email: z.string().email("Email inválido").or(z.literal("")).optional(),
  mobile: z.string().optional(),
  departmentId: z.string().optional(),
  municipalityId: z.string().optional(),
  localityId: z.string().optional(),
  selectedSectors: z.array(z.string()).optional(),
  message: z.string().min(1, "El mensaje es requerido"),
  status: z.enum(["active", "archived"]),
}).superRefine((data, ctx) => {
  if (data.personType === "natural") {
    if (!data.firstName && !data.lastName && !data.identity) {
      ctx.addIssue({ code: "custom", path: ["firstName"], message: "Nombre/Apellido o Identidad requerido" });
    }
  }
  if (data.personType === "juridica") {
    if (!data.companyName && !data.rtn) {
      ctx.addIssue({ code: "custom", path: ["companyName"], message: "Empresa o RTN requerido" });
    }
  }
});
type ConsultationFormData = z.infer<typeof consultationSchema>;

/* ======== Utils ======== */
function asStringId(row: any) {
  try {
    const id = row?.id ?? row?._id ?? row?.Id ?? row?.ID;
    if (id == null) return "";
    return String(id);
  } catch {
    return "";
  }
}
function asArray<T = string>(v: any): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v == null) return [];
  return [v] as T[];
}
function safeLower(v: unknown) { return typeof v === "string" ? v.toLowerCase() : v; }
const fmtDateHN = (s: string) => new Date(s).toLocaleDateString("es-HN");
const today = () => new Date().toISOString().split("T")[0];

const badgeVariantPerson = (type: string) =>
  type === "juridica" ? "secondary" : type === "anonimo" ? "outline" : "default";
const labelPerson = (type: string) =>
  type === "juridica" ? "Jurídica" : type === "anonimo" ? "Anónimo" : "Natural";
const badgeVariantStatus = (status: string) => (status === "archived" ? "secondary" : "default");

const CHART_COLORS = ["#1bd1e8", "#7dd3fc", "#34d399", "#fbbf24", "#f87171", "#a78bfa"];

/* ======== API helpers ======== */
async function getJson<T = any>(url: string, params?: Record<string, string>) {
  const qs = params && Object.keys(params).length ? `?${new URLSearchParams(params)}` : "";
  const res = await apiRequest("GET", `${url}${qs}`);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}
async function deleteConsultation(id: string) {
  const res = await apiRequest("DELETE", `/api/consultations/${id}`);
  return await res.json().catch(() => ({}));
}
async function patchStatus(id: string, status: "active" | "archived") {
  const res = await apiRequest("PATCH", `/api/consultations/${id}/status`, { status });
  return await res.json().catch(() => ({}));
}
async function putConsultation(id: string, data: ConsultationFormData) {
  const res = await apiRequest("PUT", `/api/consultations/${id}`, data);
  return await res.json().catch(() => ({}));
}

function resolveImageUrl(x: string) {
  const s = String(x || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/uploadps/") || s.startsWith("/api/")) return s;
  return `/uploadps/${s.replace(/^\/+/, "")}`;
}

function downloadUrl(url: string, filename?: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || url.split("/").pop() || "imagen";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
async function downloadAll(urls: string[]) {
  for (const u of urls) {
    await new Promise(r => setTimeout(r, 200));
    downloadUrl(resolveImageUrl(u));
  }
}

/* ========================== Componente ========================== */
export default function Dashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();

  // Dialogs/estados generales
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showConsultationDetail, setShowConsultationDetail] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<any>(null);
const [openDepartment, setOpenDepartment] = useState(false);
const [openMunicipality, setOpenMunicipality] = useState(false);
const [openLocality, setOpenLocality] = useState(false);
const [openZone, setOpenZone] = useState(false); // para <Select> de Zona

  // Galería
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  function openGallery(imgs: string[], index = 0) {
    setGalleryImages(imgs);
    setGalleryIndex(index);
    setGalleryOpen(true);
  }
  function closeGallery() { setGalleryOpen(false); }
  function prevImg() { setGalleryIndex(i => (i - 1 + galleryImages.length) % galleryImages.length); }
  function nextImg() { setGalleryIndex(i => (i + 1) % galleryImages.length); }

  // Editar / Eliminar
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingConsultation, setEditingConsultation] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Orden y filtros
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    departmentId: "",
    municipalityId: "",
    localityId: "",
    sector: "",
    personType: "",
    status: "",
    offset: 0,
    limit: 10,
  });

  const [filtersApplied, setFiltersApplied] = useState(false);
  function getCurrentFilters() {
    if (!filtersApplied) return {};
    const f = filters;
    return {
      ...(f.dateFrom ? { dateFrom: f.dateFrom } : {}),
      ...(f.dateTo ? { dateTo: f.dateTo } : {}),
      ...(f.departmentId && f.departmentId !== "all" ? { departmentId: f.departmentId } : {}),
      ...(f.municipalityId && f.municipalityId !== "all" ? { municipalityId: f.municipalityId } : {}),
      ...(f.localityId && f.localityId !== "all" ? { localityId: f.localityId } : {}),
      ...(f.sector && f.sector !== "all" ? { sector: f.sector } : {}),
      ...(f.personType && f.personType !== "all" ? { personType: f.personType } : {}),
      ...(f.status && f.status !== "all" ? { status: f.status } : {}),
    };
  }

  useEffect(() => {
    if (!filters.dateFrom && !filters.dateTo) {
      const end = new Date();
      const start = new Date(); start.setDate(end.getDate() - 29);
      const pad = (n:number)=> String(n).padStart(2,"0");
      const ymd = (d:Date)=> `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      setFilters(f => ({ ...f, dateFrom: ymd(start), dateTo: ymd(end) }));
    }
  }, []);

  /* ============================ Queries ============================ */
  const { data: stats } = useQuery<any>({
    queryKey: ["/api/dashboard/stats", filters.dateFrom, filters.dateTo],
    queryFn: () => getJson("/api/dashboard/stats"),
  });

  const { data: consultationsByDate } = useQuery<any>({
    queryKey: ["/api/dashboard/consultations-by-date", filters, filtersApplied],
    queryFn: () =>
      getJson("/api/dashboard/consultations-by-date", {
        ...(filtersApplied && filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
        ...(filtersApplied && filters.dateTo ? { dateTo: filters.dateTo } : {}),
        ...(filtersApplied && filters.departmentId && filters.departmentId !== "all" ? { departmentId: filters.departmentId } : {}),
        ...(filtersApplied && filters.sector && filters.sector !== "all" ? { sector: filters.sector } : {}),
        ...(filtersApplied && filters.personType && filters.personType !== "all" ? { personType: filters.personType } : {}),
        ...(filtersApplied && filters.status && filters.status !== "all" ? { status: filters.status } : {}),
        days: "30",
      }),
  });

  const { data: consultationsBySector } = useQuery<any>({
    queryKey: ["/api/dashboard/consultations-by-sector", filters, filtersApplied],
    queryFn: () =>
      getJson("/api/dashboard/consultations-by-sector", {
        ...(filtersApplied && filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
        ...(filtersApplied && filters.dateTo ? { dateTo: filters.dateTo } : {}),
        ...(filtersApplied && filters.departmentId && filters.departmentId !== "all" ? { departmentId: filters.departmentId } : {}),
        ...(filtersApplied && filters.sector && filters.sector !== "all" ? { sector: filters.sector } : {}),
        ...(filtersApplied && filters.personType && filters.personType !== "all" ? { personType: filters.personType } : {}),
        ...(filtersApplied && filters.status && filters.status !== "all" ? { status: filters.status } : {}),
      }),
  });

  const { data: consultationsData } = useQuery<any>({
    queryKey: ["/api/consultations", filters, filtersApplied],
    queryFn: () => {
      const params = filtersApplied
        ? Object.fromEntries(
            Object.entries(filters)
              .filter(([, v]) => v !== "" && v !== null && v !== undefined)
              .map(([k, v]) => [k, String(v)])
          )
        : {};
      return getJson("/api/consultations", params);
    },
  });

  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ["/api/departments"],
    queryFn: () => getJson("/api/departments"),
  });
  const { data: sectors = [] } = useQuery<any[]>({
    queryKey: ["/api/sectors"],
    queryFn: () => getJson("/api/sectors"),
  });

  // === Widgets extra ===
  const { data: byDept = [] } = useQuery<any[]>({
    queryKey: ["/api/dashboard/by-department", filters],
    queryFn: () =>
      getJson("/api/dashboard/by-department", {
        ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
        ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
        ...(filters.sector && filters.sector !== "all" ? { sector: filters.sector } : {}),
        ...(filters.status && filters.status !== "all" ? { status: filters.status } : {}),
      }),
  });

  const { data: bySectorAdv = [] } = useQuery<any[]>({
    queryKey: ["/api/dashboard/by-sector", filters],
    queryFn: () =>
      getJson("/api/dashboard/by-sector", {
        ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
        ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
        ...(filters.departmentId && filters.departmentId !== "all"
          ? { departmentId: filters.departmentId }
          : {}),
        ...(filters.status && filters.status !== "all" ? { status: filters.status } : {}),
      }),
  });

  const { data: byLocality = [] } = useQuery<any[]>({
    queryKey: ["/api/dashboard/by-locality", filters],
    queryFn: () =>
      getJson("/api/dashboard/by-locality", {
        ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
        ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
        ...(filters.departmentId && filters.departmentId !== "all"
          ? { departmentId: filters.departmentId }
          : {}),
        ...(filters.status && filters.status !== "all" ? { status: filters.status } : {}),
      }),
    enabled: !!(filters.departmentId && filters.departmentId !== "all"),
  });

  // --- Sectores por departamento (apilado) ---
  const { data: sectorByDept = [] } = useQuery<any[]>({
    queryKey: ["/api/dashboard/sector-by-department", filters],
    queryFn: () =>
      getJson("/api/dashboard/sector-by-department", {
        ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
        ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
        ...(filters.departmentId && filters.departmentId !== "all" ? { departmentId: filters.departmentId } : {}),
        ...(filters.municipalityId && filters.municipalityId !== "all" ? { municipalityId: filters.municipalityId } : {}),
        ...(filters.localityId && filters.localityId !== "all" ? { localityId: filters.localityId } : {}),
        ...(filters.personType && filters.personType !== "all" ? { personType: filters.personType } : {}),
        ...(filters.status && filters.status !== "all" ? { status: filters.status } : {}),
        ...(filters.sector && filters.sector !== "all" ? { sector: filters.sector } : {}),
      }),
  });

  // Agrupar: [{ department: 'Atlántida', Educacion: 5, Salud: 2, ...}, ...]
  const stackedByDept = useMemo(() => {
    const sectorsSet = new Set<string>();
    const map = new Map<string, any>();
    for (const r of sectorByDept) {
      const sec = r.sector || "Sin sector";
      sectorsSet.add(sec);
      const key = r.department || "Sin departamento";
      const row = map.get(key) || { department: key };
      row[sec] = (row[sec] || 0) + Number(r.count || 0);
      map.set(key, row);
    }
    return { data: Array.from(map.values()), sectors: Array.from(sectorsSet) };
  }, [sectorByDept]);

  /* ============================ Totales ============================ */
  const totals = useMemo(() => {
    const total = Number(stats?.total ?? consultationsData?.total ?? 0);
    const active = Number(
      consultationsData?.consultations?.filter((c: any) => c.status === "active")?.length ?? 0
    );
    const archived = Math.max(0, total - active);
    return { total, active, archived };
  }, [stats, consultationsData]);

  /* ============================ Filtros ============================ */
  const handleFilterApply = () => {
    setFilters((f) => ({
      ...f,
      departmentId: f.departmentId === "all" ? "" : f.departmentId,
      municipalityId: f.municipalityId === "all" ? "" : f.municipalityId,
      localityId: f.localityId === "all" ? "" : f.localityId,
      sector: f.sector === "all" ? "" : f.sector,
      personType: f.personType === "all" ? "" : f.personType,
      status: f.status === "all" ? "" : f.status,
      offset: 0,
    }));
    setFiltersApplied(true);
  };

  const handleFilterClear = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      departmentId: "",
      municipalityId: "",
      localityId: "",
      sector: "",
      personType: "",
      status: "",
      offset: 0,
      limit: 10,
    });
    setFiltersApplied(false);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/consultations"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/consultations-by-sector"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/consultations-by-date"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/by-department"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/by-sector"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/by-locality"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/sector-by-department"] });
    toast({ title: "Datos actualizados" });
  };

  /* ============================ Export helpers ============================ */
  function saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function toCSV(rows: Array<Record<string, any>>): string {
    if (!rows?.length) return "";
    const headers = Object.keys(rows[0]);
    const esc = (v: any) => {
      const s = v == null ? "" : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    return [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
  }

  type ExportFilters = {
    dateFrom?: string;
    dateTo?: string;
    departmentId?: number | string;
    municipalityId?: number | string;
    localityId?: number | string;
    sector?: string;
    personType?: string;
    status?: string;
  };

  function buildExportUrl(fmt: "csv" | "excel" | "pdf", filters: ExportFilters = {}) {
    const base =
      fmt === "csv"  ? "/api/export/consultations/csv"  :
      fmt === "excel"? "/api/export/consultations/excel":
                       "/api/export/consultations/pdf";

    const qs = new URLSearchParams();

    if (filters.dateFrom) qs.set("dateFrom", String(filters.dateFrom));
    if (filters.dateTo) qs.set("dateTo", String(filters.dateTo));
    if (filters.departmentId && filters.departmentId !== "all") qs.set("departmentId", String(filters.departmentId));
    if (filters.municipalityId && filters.municipalityId !== "all") qs.set("municipalityId", String(filters.municipalityId));
    if (filters.localityId && filters.localityId !== "all") qs.set("localityId", String(filters.localityId));
    if (filters.sector && filters.sector !== "all") qs.set("sector", String(filters.sector));
    if (filters.personType && filters.personType !== "all") qs.set("personType", String(filters.personType));
    if (filters.status && filters.status !== "all") qs.set("status", String(filters.status));

    const query = qs.toString();
    return query ? `${base}?${query}` : base;
  }

  const handleExportCSV = async () => {
    try {
      const res = await apiRequest("GET", buildExportUrl("csv", getCurrentFilters()));
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      await saveBlob(blob, `consultas_${today()}.csv`);
    } catch {
      const rows = (sortedConsultations || []).map((c: any) => ({
        id: asStringId(c),
        fecha: c.createdAt,
        tipoPersona: c.personType,
        datos: c.personType === "natural"
          ? (`${c.firstName || ""} ${c.lastName || ""}`.trim() || c.identity || "")
          : (c.personType === "juridica" ? (c.companyName || c.rtn || "") : "Anónimo"),
        departamento: c.department?.name || "",
        municipio: c.municipality?.name || "",
        localidad: c.locality?.name || c.customLocalityName || "",
        coordenadas: (c.latitude && c.longitude) ? `${c.latitude}, ${c.longitude}` : "",
        sectores: Array.isArray(c.selectedSectors) ? c.selectedSectors.join("; ") : "",
        mensaje: c.message,
        estado: c.status,
      }));
      await saveBlob(
        new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8" }),
        `consultas_${today()}.csv`
      );
    }
  };

  const handleExportExcel = async () => {
    try {
      const res = await apiRequest("GET", buildExportUrl("excel", getCurrentFilters()));
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      await saveBlob(blob, `consultas_${today()}.xlsx`);
    } catch {
      toast({ title: "No se pudo generar Excel. Se exporta CSV." });
      await handleExportCSV();
    }
  };

  const handleExportPDF = async () => {
    try {
      const res = await apiRequest("GET", buildExportUrl("pdf", getCurrentFilters()));
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      await saveBlob(blob, `consultas_${today()}.pdf`);
    } catch {
      toast({ title: "No se pudo generar PDF. Se exporta CSV." });
      await handleExportCSV();
    }
  };

  /* ===================== Mutations ===================== */
  const deleteConsultationMutation = useMutation({
    mutationFn: async (id: string) => deleteConsultation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/consultations"] });
      toast({ title: "Consulta eliminada" });
    },
    onError: (e:any) =>
      toast({ title: "Error", description: e?.message || "No se pudo eliminar", variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ consultationId, status }: { consultationId: string; status: "active" | "archived" }) =>
      patchStatus(consultationId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/consultations"] });
      toast({ title: "Estado actualizado" });
    },
    onError: (e:any) =>
      toast({ title: "Error", description: e?.message || "No se pudo actualizar el estado", variant: "destructive" }),
  });

  const updateConsultationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ConsultationFormData }) =>
      putConsultation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/consultations"] });
      toast({ title: "Consulta actualizada", description: "Cambios guardados." });
      setShowEditDialog(false);
      setEditingConsultation(null);
    },
    onError: (e:any) =>
      toast({ title: "Error", description: e?.message || "No se pudo actualizar", variant: "destructive" }),
  });

  /* ====================== Form editar ====================== */
  const editForm = useForm<ConsultationFormData>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      personType: "natural",
      message: "",
      status: "active",
      selectedSectors: [],
    },
  });

  /* ============================ Helpers UI ============================ */
  const getPersonalData = (c: any) => c.personType === 'natural'
    ? (`${c.firstName || ''} ${c.lastName || ''}`.trim() || c.identity || 'Sin datos')
    : c.personType === 'juridica'
      ? (c.companyName || c.rtn || 'Sin datos')
      : 'Anónimo';

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const sortedConsultations = consultationsData?.consultations
    ? [...consultationsData.consultations].sort((a: any, b: any) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        let aValue: any = a[key];
        let bValue: any = b[key];
        if (key === "createdAt") {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        } else {
          aValue = safeLower(aValue);
          bValue = safeLower(bValue);
        }
        if (aValue < bValue) return direction === "asc" ? -1 : 1;
        if (aValue > bValue) return direction === "asc" ? 1 : -1;
        return 0;
      })
    : [];

  const openEdit = (c: any) => {
    setEditingConsultation(c);
    editForm.reset({
      personType: c.personType ?? "natural",
      firstName: c.firstName ?? "",
      lastName: c.lastName ?? "",
      identity: c.identity ?? "",
      companyName: c.companyName ?? "",
      rtn: c.rtn ?? "",
      legalRepresentative: c.legalRepresentative ?? "",
      companyContact: c.companyContact ?? "",
      email: c.email ?? "",
      mobile: c.mobile ?? "",
      departmentId: c.department?.id ? String(c.department.id) : "",
      municipalityId: c.municipality?.id ? String(c.municipality.id) : "",
      localityId: c.locality?.id ? String(c.locality.id) : "",
      selectedSectors: Array.isArray(c.selectedSectors) ? c.selectedSectors : [],
      message: c.message ?? "",
      status: c.status ?? "active",
    });
    setShowEditDialog(true);
  };

  /* ============================== Render ============================== */
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f7fa' }}>
      {/* Navbar */}
      <div className="shadow-sm sticky top-0 border-0 z-10" style={{ backgroundColor: '#1bd1e8' }}>
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex justify-between items-center py-2 sm:py-3">
            <div className="flex items-center">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-white mr-2 sm:mr-3" />
              <h4 className="mb-0 font-bold text-white text-sm sm:text-lg">Panel Principal</h4>
            </div>
            <div className="flex items-center gap-1 sm:gap-3">
              <Button variant="outline" className="border-white text-white hover:bg-white hover:text-slate-800 bg-transparent" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline ml-1">Actualizar</span>
              </Button>
              <div className="flex items-center text-white">
                <span className="font-medium mr-1 text-sm sm:text-base hidden sm:inline">{user?.username}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white hover:bg-opacity-20 p-1">
                      <User className="w-4 h-4 sm:hidden" />
                      <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate("/admin/users")}>
                      <UserPlus className="w-4 h-4 mr-2" />Crear Usuario
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {/* perfil opcional */}}>
                      <User className="w-4 h-4 mr-2" />Mi Perfil
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                      <LogOut className="w-4 h-4 mr-2" />Cerrar Sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
        <div className="grid grid-cols-1 gap-2 sm:gap-4">
          {/* ===================== Tabla ===================== */}
          <div className="w-full">
            <Card className="border-0 shadow-sm rounded-lg">
              <CardHeader style={{ backgroundColor: '#fff' }} className="border-0 rounded-t-lg px-3 sm:px-6 py-3 sm:py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 sm:mb-4 gap-2 sm:gap-0">
                  <CardTitle className="mb-0 flex items-center text-lg sm:text-xl">
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" style={{ color: '#1bd1e8' }} />
                    Consultas Ciudadanas
                  </CardTitle>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="border text-gray-600 hover:bg-gray-50 flex-1 sm:flex-none">
                          <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          <span className="hidden sm:inline">Exportar</span>
                          <span className="sm:hidden">Exp.</span>
                          <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={handleExportCSV}><Download className="w-4 h-4 mr-2" />CSV</DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportExcel}><Download className="w-4 h-4 mr-2" />Excel</DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportPDF}><Download className="w-4 h-4 mr-2" /> PDF</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Filtros */}
                  <div className="w-full sm:w-auto">
                    <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm" className="border-2 w-full sm:w-auto" style={{ borderColor: '#1bd1e8', color: '#1bd1e8' }}>
                          <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          Filtros
                          <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                          <div>
                            <Label className="text-sm font-medium">Fecha Desde</Label>
                            <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Fecha Hasta</Label>
                            <Input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Departamento</Label>
                            <Select value={filters.departmentId} onValueChange={(v) => setFilters({ ...filters, departmentId: v })}>
                              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {departments.map((d: any) => (<SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Sector</Label>
                            <Select value={filters.sector} onValueChange={(v) => setFilters({ ...filters, sector: v })}>
                              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {sectors.map((s: any) => (<SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Tipo Persona</Label>
                            <Select value={filters.personType} onValueChange={(v) => setFilters({ ...filters, personType: v })}>
                              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
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
                            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="active">Activa</SelectItem>
                                <SelectItem value="archived">Archivada</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 mt-3">
                          <Button size="sm" onClick={handleFilterApply} style={{ backgroundColor: '#1bd1e8', borderColor: '#1bd1e8' }} className="w-full sm:w-auto">
                            <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />Aplicar Filtros
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleFilterClear} className="w-full sm:w-auto">Limpiar</Button>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold">
                          <Button variant="ghost" size="sm" onClick={() => handleSort("id")} className="p-0 h-auto font-bold">
                            ID <ArrowUpDown className="w-3 h-3 ml-1" />
                          </Button>
                        </TableHead>
                        <TableHead className="font-bold">
                          <Button variant="ghost" size="sm" onClick={() => handleSort("createdAt")} className="p-0 h-auto font-bold">
                            Fecha <ArrowUpDown className="w-3 h-3 ml-1" />
                          </Button>
                        </TableHead>
                        <TableHead className="font-bold">
                          <Button variant="ghost" size="sm" onClick={() => handleSort("personType")} className="p-0 h-auto font-bold">
                            Tipo Persona <ArrowUpDown className="w-3 h-3 ml-1" />
                          </Button>
                        </TableHead>

                        <TableHead className="font-bold">Datos Personales</TableHead>
                        <TableHead className="font-bold">Departamento</TableHead>
                        <TableHead className="font-bold">Municipio</TableHead>
                        <TableHead className="font-bold">Aldea/Localidad</TableHead>
                        <TableHead className="font-bold">Latitud</TableHead>
                        <TableHead className="font-bold">Longitud</TableHead>
                        <TableHead className="font-bold">Sectores</TableHead>
                        <TableHead className="font-bold">Mensaje</TableHead>
                        <TableHead className="font-bold">Imagen</TableHead>

                        <TableHead className="font-bold">
                          <Button variant="ghost" size="sm" onClick={() => handleSort("status")} className="p-0 h-auto font-bold">
                            Estado <ArrowUpDown className="w-3 h-3 ml-1" />
                          </Button>
                        </TableHead>
                        <TableHead className="font-bold">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {sortedConsultations.length > 0 ? sortedConsultations.map((c: any) => {
                        const idStr = asStringId(c);
                        const sectorsArr = asArray<string>(c.selectedSectors);
                        const imgs = asArray<string>(c.images);
                        return (
                          <TableRow key={idStr}>
                            <TableCell><code className="text-sm">{idStr}</code></TableCell>
                            <TableCell>{c.createdAt ? fmtDateHN(String(c.createdAt)) : "-"}</TableCell>
                            <TableCell><Badge variant={badgeVariantPerson(c.personType)}>{labelPerson(c.personType)}</Badge></TableCell>

                            <TableCell><span className="text-sm">{getPersonalData(c)}</span></TableCell>
                            <TableCell>{c.department?.name || "-"}</TableCell>
                            <TableCell>{c.municipality?.name || "-"}</TableCell>
                            <TableCell>{c.locality?.name || (c.customLocalityName || "-")}</TableCell>
                            <TableCell className="text-xs">{c.latitude || "-"}</TableCell>
                            <TableCell className="text-xs">{c.longitude || "-"}</TableCell>

                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {sectorsArr.slice(0, 2).map((s, i) => (
                                  <Badge key={`${idStr}-s-${i}`} variant="secondary" className="text-xs">{s}</Badge>
                                ))}
                                {sectorsArr.length > 2 && (
                                  <Badge variant="outline" className="text-xs">+{sectorsArr.length - 2}</Badge>
                                )}
                              </div>
                            </TableCell>

                            <TableCell>
                              <span className="text-sm">
                                {typeof c.message === "string" && c.message.length > 50 ? `${c.message.substring(0, 50)}...` : c.message}
                              </span>
                            </TableCell>

                            <TableCell className="w-[60px]">
                              {imgs.length ? (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  title="Ver imágenes"
                                  onClick={() => openGallery(imgs, 0)}
                                  className="h-8 w-8"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              ) : "—"}
                            </TableCell>

                            <TableCell>
                              <Badge variant={badgeVariantStatus(c.status)}>
                                {c.status === "active" ? "Activa" : "Archivada"}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="outline" size="sm" onClick={() => { setSelectedConsultation(c); setShowConsultationDetail(true); }} title="Ver detalle">
                                  <MessageSquare className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => openEdit(c)} title="Editar">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline" size="sm"
                                  onClick={() => updateStatusMutation.mutate({ consultationId: idStr, status: c.status === "active" ? "archived" : "active" })}
                                  title={c.status === "active" ? "Archivar" : "Activar"}
                                >
                                  {c.status === "active" ? "Archivar" : "Activar"}
                                </Button>
                                <Button
                                  variant="outline" size="sm"
                                  onClick={() => { setDeleteId(idStr); setShowDeleteConfirm(true); }}
                                  className="text-red-600 hover:bg-red-50 border-red-200"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      }) : (
                        <TableRow><TableCell colSpan={14} className="text-center text-gray-500 py-6">No hay consultas disponibles</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Paginación */}
                {consultationsData?.total > 0 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center p-3 border-t gap-2 sm:gap-0">
                    <small className="text-gray-600 text-xs sm:text-sm text-center sm:text-left">
                      {consultationsData.total === 0
                        ? "0"
                        : `${filters.offset + 1}-${Math.min(filters.offset + filters.limit, consultationsData.total)}`}{" "}
                      de {consultationsData.total}
                    </small>
                    <nav>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={filters.offset === 0}
                          onClick={() => setFilters({ ...filters, offset: Math.max(0, filters.offset - filters.limit) })}>
                          Anterior
                        </Button>
                        <Button variant="outline" size="sm"
                          disabled={filters.offset + filters.limit >= consultationsData.total}
                          onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}>
                          Siguiente
                        </Button>
                      </div>
                    </nav>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ===================== KPIs rápidos ===================== */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
            <Card className="border-0 shadow-sm rounded-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total de Consultas</p>
                    <p className="text-2xl font-bold">{totals.total}</p>
                  </div>
                  <BarChart3 className="w-8 h-8" style={{ color: "#1bd1e8" }} />
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm rounded-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Activas</p>
                    <p className="text-2xl font-bold">{totals.active}</p>
                  </div>
                  <PieIcon className="w-8 h-8" style={{ color: "#1bd1e8" }} />
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm rounded-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Archivadas</p>
                    <p className="text-2xl font-bold">{totals.archived}</p>
                  </div>
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                    <path d="M20 7H4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2Z" stroke="#1bd1e8" strokeWidth="2"/>
                    <path d="M4 7h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" stroke="#1bd1e8" strokeWidth="2"/>
                  </svg>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ===================== GRÁFICAS ===================== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-4">
            {/* Línea: por día */}
            <Card className="border-0 shadow-sm rounded-lg">
              <CardHeader><CardTitle className="text-sm">Consultas por día (30 días)</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={(consultationsByDate || []).map((d:any)=>({date:d.date, count:Number(d.count)}))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{fontSize:10}} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" name="Consultas" stroke="#1bd1e8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Barras: sectores */}
            <Card className="border-0 shadow-sm rounded-lg">
              <CardHeader><CardTitle className="text-sm">Consultas por sector</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(consultationsBySector || []).map((s:any)=>({sector:s.sector, count:Number(s.count)}))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="sector" tick={{fontSize:10}} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Consultas" fill="#1bd1e8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pie: estado */}
            <Card className="border-0 shadow-sm rounded-lg">
              <CardHeader><CardTitle className="text-sm">Estado de consultas</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RPieChart>
                    <Pie
                      data={[
                        { name: "Activas", value: Number(totals.active || 0) },
                        { name: "Archivadas", value: Number(totals.archived || 0) },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={80}
                      label
                    >
                      {[0,1].map((i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ===================== NUEVAS GRÁFICAS ===================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-4 mt-2">
        {/* Por departamento */}
        <Card className="border-0 shadow-sm rounded-lg">
          <CardHeader><CardTitle className="text-sm">Consultas por departamento</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDept}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Consultas" fill="#1bd1e8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Por sector */}
        <Card className="border-0 shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="text-sm">
              Consultas por sector{filters.departmentId && filters.departmentId !== "all" ? " (Depto)" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySectorAdv}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sector" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Consultas" fill="#1bd1e8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Por localidad */}
        <Card className="border-0 shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="text-sm">
              Consultas por aldea/localidad {filters.departmentId && filters.departmentId !== "all" ? "" : "(selecciona un departamento)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byLocality} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="locality" width={120} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Consultas" fill="#1bd1e8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sectores por departamento (apilado) */}
      
      </div>

      {}
      <Dialog open={showConsultationDetail} onOpenChange={setShowConsultationDetail}>
          <DialogContent className="max-w-[95vw] sm:max-w-xl bg-white shadow-2xl">

          <DialogHeader>
            <DialogTitle className="flex items-center text-sm sm:text-base">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 mr-2" style={{ color: '#1bd1e8' }} />
              Detalle de Consulta Ciudadana
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Información completa de la consulta seleccionada</DialogDescription>
          </DialogHeader>

          {selectedConsultation && (
            <div className="space-y-3 sm:space-y-4">
              {}
              {}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setShowConsultationDetail(false)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) setEditingConsultation(null);
        }}
      >
          <DialogContent className="max-w-[95vw] sm:max-w-xl bg-white shadow-2xl">

          <DialogHeader>
            <DialogTitle>Editar consulta</DialogTitle>
            <DialogDescription>Actualiza la información y guarda los cambios.</DialogDescription>
          </DialogHeader>

          {editingConsultation ? (
            <Form {...editForm}>
              <form
                onSubmit={editForm.handleSubmit((data) => {
                  const id = asStringId(editingConsultation);
                  updateConsultationMutation.mutate({ id, data });
                })}
                className="space-y-4"
              >
                {}
                <FormField
                  control={editForm.control}
                  name="personType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de persona</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="natural">Natural</SelectItem>
                            <SelectItem value="juridica">Jurídica</SelectItem>
                            <SelectItem value="anonimo">Anónimo</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {}
                {editForm.watch("personType") === "natural" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={editForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Apellido</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ) : editForm.watch("personType") === "juridica" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={editForm.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Empresa</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="rtn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>RTN</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ) : null}

                {}
                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Activa</SelectItem>
                            <SelectItem value="archived">Archivada</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {}
                <FormField
                  control={editForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensaje</FormLabel>
                      <FormControl>
                        <textarea className="w-full border rounded p-2 h-28" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditDialog(false);
                      setEditingConsultation(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Guardar cambios</Button>
                </DialogFooter>
              </form>
            </Form>
          ) : (
            <p className="text-sm text-gray-500">Cargando…</p>
          )}
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-xl bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImagesIcon className="w-5 h-5" /> Galería
            </DialogTitle>
            <DialogDescription>
              Vista previa de las imágenes. Puedes navegar y descargar.
            </DialogDescription>
          </DialogHeader>

          {galleryImages.length > 0 ? (
            <div className="w-full">
              <div className="relative w-full aspect-[16/9] bg-black/5 rounded flex items-center justify-center overflow-hidden">
                <img
                  src={resolveImageUrl(galleryImages[galleryIndex])}
                  alt={`preview-${galleryIndex}`}
                  className="max-h-[70vh] object-contain"
                  style={{ width: "100%" }}
                />
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white hover:bg-white rounded-full p-2"
                  onClick={prevImg}
                  title="Anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white hover:bg-white rounded-full p-2"
                  onClick={nextImg}
                  title="Siguiente"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadUrl(resolveImageUrl(galleryImages[galleryIndex]))}
                  >
                    <Download className="w-4 h-4 mr-2" /> Descargar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={resolveImageUrl(galleryImages[galleryIndex])} target="_blank" rel="noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" /> Abrir en pestaña
                    </a>
                  </Button>
                </div>
                <small className="text-gray-500">
                  {galleryIndex + 1} / {galleryImages.length}
                </small>
              </div>

              {}
              <div className="mt-3 grid grid-cols-5 sm:grid-cols-8 gap-2">
                {galleryImages.map((src, i) => {
                  const url = resolveImageUrl(src);
                  const active = i === galleryIndex;
                  return (
                    <button
                      key={i}
                      className={`h-16 rounded overflow-hidden border ${active ? "border-cyan-500" : "border-transparent"} hover:opacity-90`}
                      onClick={() => setGalleryIndex(i)}
                      title={`Ir a ${i+1}`}
                    >
                      <img src={url} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No hay imágenes para mostrar.</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => downloadAll(galleryImages)} disabled={!galleryImages.length}>
              <Download className="w-4 h-4 mr-2" /> Descargar todas
            </Button>
            <Button onClick={closeGallery}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar consulta</DialogTitle>
            <DialogDescription>Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <p className="text-sm">¿Seguro que quieres eliminar la consulta <code>{deleteId}</code>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setDeleteId(null); }}>
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteId) deleteConsultationMutation.mutate(deleteId);
                setShowDeleteConfirm(false);
                setDeleteId(null);
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
