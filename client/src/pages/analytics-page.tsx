"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ByDate = { date: string; count: number };
type BySector = { sector: string; count: number };
type Department = { id: number; name: string };

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [byDate, setByDate] = useState<ByDate[]>([]);
  const [bySector, setBySector] = useState<BySector[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    departmentId: "", 
  });

  const lineRef = useRef<HTMLCanvasElement | null>(null);
  const doughnutRef = useRef<HTMLCanvasElement | null>(null);

  const buildExportUrl = (format: "csv" | "excel") => {
    const url = new URL(`/api/export/consultations/${format}`, window.location.origin);
    if (filters.dateFrom) url.searchParams.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) url.searchParams.set("dateTo", filters.dateTo);
    if (filters.departmentId) url.searchParams.set("departmentId", filters.departmentId);
    return url.toString();
  };



useEffect(() => {
  const w = window as any;
  if (w.Chart) {
    drawCharts();
    return;
  }

  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/chart.js";
  s.async = true;
  s.onload = () => {
    console.log(" Chart.js cargado");
    drawCharts();
  };
  s.onerror = () => console.error(" Error cargando Chart.js");
  document.head.appendChild(s);
}, [byDate, bySector]);






  // trae departamentos (para filtro)
  useEffect(() => {
    fetch("/api/departments", { credentials: "include" })
      .then((r) => r.json())
      .then(setDepartments)
      .catch(() => setDepartments([]));
  }, []);
  useEffect(() => {
    const run = async () => {
      setLoading(true);

  
      let dateData: ByDate[] = [];
      if (!filters.dateFrom && !filters.dateTo && !filters.departmentId) {
        const r = await fetch("/api/dashboard/consultations-by-date?days=30", { credentials: "include" });
        dateData = await r.json();
      } else {
        const params = new URLSearchParams();
        if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
        if (filters.dateTo) params.set("dateTo", filters.dateTo);
        if (filters.departmentId) params.set("departmentId", filters.departmentId);
        params.set("limit", "10000");

        const r = await fetch(`/api/consultations?${params.toString()}`, { credentials: "include" });
        const { consultations } = await r.json();
        const map: Record<string, number> = {};
        for (const c of consultations) {
          const d = new Date(c.createdAt).toISOString().slice(0, 10);
          map[d] = (map[d] || 0) + 1;
        }
        dateData = Object.entries(map)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date));
      }

      const r2 = await fetch("/api/dashboard/consultations-by-sector", { credentials: "include" });
      const sectorData: BySector[] = await r2.json();

      setByDate(dateData);
      setBySector(sectorData);
      setLoading(false);
      drawCharts(dateData, sectorData);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const lineLabels = useMemo(() => byDate.map((d) => d.date), [byDate]);
  const lineValues = useMemo(() => byDate.map((d) => d.count), [byDate]);

  const doughnutLabels = useMemo(() => bySector.map((s) => s.sector), [bySector]);
  const doughnutValues = useMemo(() => bySector.map((s) => s.count), [bySector]);

  function drawCharts(dateData?: ByDate[], sectorData?: BySector[]) {
    const w = window as any;
    if (!w.Chart) return;

    (lineRef.current as any)?._chart?.destroy?.();
    (doughnutRef.current as any)?._chart?.destroy?.();

    if (lineRef.current) {
      const ctx = lineRef.current.getContext("2d")!;
      const chart = new w.Chart(ctx, {
        type: "line",
        data: {
          labels: (dateData ?? byDate).map((d) => d.date),
          datasets: [
            {
              label: "Consultas por día",
              data: (dateData ?? byDate).map((d) => d.count),
              borderWidth: 2,
              fill: false,
              tension: 0.25,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: true, position: "bottom" } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        },
      });
      (lineRef.current as any)._chart = chart;
    }

 if (doughnutRef.current) {
      const ctx = doughnutRef.current.getContext("2d")!;
      const chart = new w.Chart(ctx, {
        type: "doughnut",
        data: {
          labels: (sectorData ?? bySector).map((s) => s.sector),
          datasets: [
            {
              label: "Consultas por sector",
              data: (sectorData ?? bySector).map((s) => s.count),
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom" } },
        },
      });
      (doughnutRef.current as any)._chart = chart;
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Análisis de Consultas</h1>

      {/* Filtros */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 mb-4">
        <div>
          <label className="text-sm font-medium">Desde</label>
          <input
            type="date"
            className="block w-full border rounded px-2 py-1"
            value={filters.dateFrom}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Hasta</label>
          <input
            type="date"
            className="block w-full border rounded px-2 py-1"
            value={filters.dateTo}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Departamento</label>
          <select
            className="block w-full border rounded px-2 py-1"
            value={filters.departmentId}
            onChange={(e) => setFilters((f) => ({ ...f, departmentId: e.target.value }))}
          >
            <option value="">Todos</option>
            {departments.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Botones export */}
      <div className="flex gap-2 mb-6">
        <a
          className="px-3 py-2 border rounded hover:bg-gray-50"
          href={buildExportUrl("csv")}
          download
        >
          Descargar CSV
        </a>
        <a
          className="px-3 py-2 border rounded hover:bg-gray-50"
          href={buildExportUrl("excel")}
          download
        >
          Descargar Excel
        </a>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <div className="border rounded p-3 h-80">
          <h3 className="font-semibold mb-2">Consultas por día</h3>
          <canvas ref={lineRef} />
          {!loading && lineLabels.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">Sin datos para este rango.</p>
          )}
        </div>

        <div className="border rounded p-3 h-80">
          <h3 className="font-semibold mb-2">Consultas por sector</h3>
          <canvas ref={doughnutRef} />
          {!loading && doughnutLabels.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">Sin datos disponibles.</p>
          )}
        </div>
      </div>
    </div>
  );
}