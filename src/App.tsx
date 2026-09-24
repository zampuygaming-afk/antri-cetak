import React, { useState, useEffect, useMemo, useRef } from "react";

type JobStatus = "antri" | "cetak" | "siap" | "selesai" | "gagal";
type FailureType = "lembar" | "meter";
type PriorityType = "reguler" | "member" | "express";
type FailureRecord = {
  at: string;
  machine: string;
  failKind: string;
  type: FailureType;
  qtyLembar?: number;
  qtyP?: number;
  qtyL?: number;
  qtyTotalM?: number;
  reason: string;
  by: string;
};
type Job = {
  id: string;
  customer: string;
  material: string;
  size: string;
  qtyLabel: string;
  lengthM: number;
  route: string[];
  routeIndex: number;
  status: JobStatus;
  createdAt: string;
  startedAt?: string;
  startedBy?: string;
  createdBy?: string;
  assignedOperator?: string;
  assignedBy?: string;
  assignedAt?: string;
  deliveredAt?: string;
  deliveredBy?: string;
  note?: string;
  failures?: FailureRecord[];
  deliveryNotes?: string;
  failureSummary?: string;
  priority?: PriorityType;
  finishingNote?: string;
  // supabase extra
  finishingType?: string;
  plannedRoute?: string[];
  routeDecisions?: any;
};
type AppUser = {
  id: string;
  pin: string;
  label: string;
  role: "OWNER" | "CS" | "OPERATOR" | "CS_OPERATOR";
  desc: string;
  initials: string;
};
const USERS: AppUser[] = [
  { id: "indra", pin: "!Indra$Salma11", label: "Indra", role: "OWNER", desc: "All Access", initials: "IN" },
  { id: "uzi", pin: "uzi123", label: "Uzi", role: "CS", desc: "CS/Admin only", initials: "UZ" },
  { id: "rizka", pin: "rizka123", label: "Rizka", role: "CS", desc: "CS/Admin only", initials: "RZ" },
  { id: "susan", pin: "susan123", label: "Susan", role: "CS", desc: "CS/Admin only", initials: "SU" },
  { id: "riki", pin: "riki123", label: "Riki", role: "OPERATOR", desc: "Operator only", initials: "RK" },
  { id: "adi", pin: "adi123", label: "Adi", role: "OPERATOR", desc: "Operator only", initials: "AD" },
  { id: "tira", pin: "tira123", label: "Tira", role: "CS_OPERATOR", desc: "CS + Operator", initials: "TR" },
];
const COLUMNS = [
  { id: "GZ", label: "GZ C3200", sub: "PRINT", dot: "bg-lime-400" },
  { id: "CANON", label: "CANON", sub: "PRINT", dot: "bg-lime-400" },
  { id: "CUT-H", label: "CUT-H", sub: "CUTTING", dot: "bg-zinc-500" },
  { id: "CUT-G", label: "CUT-G", sub: "CUTTING", dot: "bg-zinc-500" },
  { id: "SEAM", label: "SEAM", sub: "FINISHING", dot: "bg-zinc-500" },
  { id: "LAM", label: "LAM", sub: "FINISHING", dot: "bg-zinc-500" },
  { id: "QC", label: "QC / SIAP", sub: "READY", dot: "bg-emerald-400" },
  { id: "SELESAI", label: "SELESAI", sub: "RIWAYAT HARI INI", dot: "bg-zinc-600" },
];
const LS_JOBS = "antri-jobs-v36";
const LS_USER = "antri-current-user-v36";
const LS_SUPA_URL = "SUPABASE_URL";
const LS_SUPA_KEY = "SUPABASE_ANON_KEY";
const ASSIGNABLE_IDS = ["riki", "adi", "tira", "indra"] as const;
const INDRA_ONLY_ID = "indra";
const ADD_ORDER_ALLOWED = ["indra", "uzi", "rizka", "susan", "tira"] as const;
// V3.9.5 FINAL ROLES - constants
const CS_ONLY_IDS = ["uzi", "rizka", "susan"] as const;
const START_PRINT_IDS = ["indra", "riki", "adi", "tira"] as const;
const SERAHKAN_ALLOWED_IDS = ["indra", "uzi", "rizka", "susan", "tira"] as const;
// helpers pure (outside component) for spec compliance
function isOwnerId(id: string) { return id === "indra"; }
function canAddOrderId(id: string) { return (ADD_ORDER_ALLOWED as readonly string[]).includes(id); }
function canAssignId(id: string) { return isOwnerId(id); }
function canStartPrintId(id: string) { return (START_PRINT_IDS as readonly string[]).includes(id); }
function canSerahkanId(id: string) { return (SERAHKAN_ALLOWED_IDS as readonly string[]).includes(id); }
function canNextId(userId: string, job: Job) {
  if (!canStartPrintId(userId)) return false;
  if (job.assignedOperator && job.assignedOperator !== userId && !isOwnerId(userId)) return false;
  return true;
}
function canFailId(userId: string, job: Job) { return canNextId(userId, job); }

const GZ_MATERIALS = [
  { id: "F280", label: "Flexi 280", short: "F280" },
  { id: "F340", label: "Flexi 340", short: "F340" },
  { id: "F440", label: "Flexi 440", short: "F440" },
  { id: "F500", label: "Flexi 500", short: "F500" },
  { id: "RITRAMA 105", label: "Ritrama 105", short: "RITRAMA 105" },
  { id: "RITRAMA 127", label: "Ritrama 127", short: "RITRAMA 127" },
  { id: "RITRAMA 152", label: "Ritrama 152", short: "RITRAMA 152" },
  { id: "BLUISH 105", label: "Bluish 105", short: "BLUISH 105" },
  { id: "ONEWAY", label: "Oneway", short: "ONEWAY" },
  { id: "ALBATROS", label: "Albatros", short: "ALBATROS" },
  { id: "DURATRANS", label: "Duratrans", short: "DURATRANS" },
  { id: "BACKLIT", label: "Backlit", short: "BACKLIT" },
];
const CANON_MATERIALS = [
  { id: "AP120", label: "Art Paper 120", short: "AP120" },
  { id: "AP150", label: "Art Paper 150", short: "AP150" },
  { id: "AP210", label: "Art Paper 210", short: "AP210" },
  { id: "AP260", label: "Art Paper 260", short: "AP260" },
  { id: "AP300", label: "Art Paper 300", short: "AP300" },
  { id: "AP310", label: "Art Paper 310", short: "AP310" },
  { id: "VINYL STANDAR", label: "Vinyl Standar", short: "VS" },
  { id: "VINYL QUANTAC", label: "Vinyl Quantac", short: "VQ" },
  { id: "TRANSPARAN", label: "Transparan", short: "TRANSPARAN" },
];
const ALL_MATERIAL_OPTIONS = [
  { id: "F280", label: "F280 Flexi 280", group: "GZ" },
  { id: "F340", label: "F340 Flexi 340", group: "GZ" },
  { id: "F440", label: "F440 Flexi 440", group: "GZ" },
  { id: "F500", label: "F500 Flexi 500", group: "GZ" },
  { id: "RITRAMA", label: "RITRAMA Sticker Ritrama", group: "GZ" },
  { id: "BLUISH", label: "BLUISH Sticker Bluish", group: "GZ" },
  { id: "ONEWAY", label: "ONEWAY Sticker Oneway", group: "GZ" },
  { id: "ALBATROS", label: "ALBATROS Albatros", group: "GZ" },
  { id: "DURATRANS", label: "DURATRANS Duratrans", group: "GZ" },
  { id: "BACKLIT", label: "BACKLIT", group: "GZ" },
  { id: "AP260", label: "AP260 Art Paper 260", group: "CANON" },
  { id: "IVORY", label: "IVORY", group: "CANON" },
  { id: "VINYL", label: "VINYL Sticker Vinyl", group: "CANON" },
  { id: "TRANSPARAN", label: "TRANSPARAN", group: "CANON" },
  { id: "FLEX CHINA", label: "FLEX CHINA", group: "GZ" },
];

type FinishingOpt = { label: string; route: string[]; note: string };
const FLEXI_OPTS: FinishingOpt[] = [
  { label: "Seaming+Mata Itik", route: ["GZ", "SEAM", "QC"], note: "Seaming + mata itik" },
  { label: "Lebih Bahan", route: ["GZ", "QC"], note: "cuma cetak dikasih lebih bahan aja ga diapa2in" },
  { label: "Selongsong", route: ["GZ", "SEAM", "QC"], note: "lem manual" },
  { label: "Potong Pas", route: ["GZ", "QC"], note: "" },
];
const STICKER_OPTS: FinishingOpt[] = [
  { label: "Potong Pas", route: ["GZ", "QC"], note: "" },
  { label: "Cetak+Cut Kiss/Die", route: ["GZ", "CUT-G", "QC"], note: "" },
  { label: "Cetak+Lam", route: ["GZ", "LAM", "QC"], note: "" },
  { label: "Cetak+Lam+Cut", route: ["GZ", "LAM", "CUT-G", "QC"], note: "" },
];
const CANON_OPTS: FinishingOpt[] = [
  { label: "Cetak saja", route: ["CANON", "QC"], note: "" },
  { label: "Cetak+Cut", route: ["CANON", "CUT-G", "QC"], note: "" },
  { label: "Cetak+Lam", route: ["CANON", "LAM", "QC"], note: "" },
  { label: "Cetak+Lam+Cut", route: ["CANON", "LAM", "CUT-G", "QC"], note: "" },
];

function seedJobs(): Job[] {
  const now = new Date();
  const iso = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
  return [
    { id: "260923-020", customer: "Warung Sate Ibu", material: "F280", size: "3x1", qtyLabel: "3x1m - 2pcs", lengthM: 6, route: ["GZ", "SEAM", "QC"], routeIndex: 0, status: "antri", createdAt: iso(2), note: "List merah, tanpa laminasi", createdBy: "Rizka", priority: "member" },
    { id: "260923-019", customer: "Laundry Express", material: "RITRAMA", size: "2x3", qtyLabel: "2x0.8m - 5pcs", lengthM: 8, route: ["GZ", "CUT-G", "QC"], routeIndex: 0, status: "antri", createdAt: iso(2.5), note: "Glossy laminasi", createdBy: "Uzi", priority: "express" },
    { id: "260923-018", customer: "Toko Baju Anak Ceria", material: "FLEX CHINA", size: "2x1", qtyLabel: "2x1m - 1pcs", lengthM: 2, route: ["GZ", "QC"], routeIndex: 0, status: "antri", createdAt: iso(3), createdBy: "Susan", priority: "reguler" },
    { id: "260923-017", customer: "Kedai Kopi Senja", material: "VINYL", size: "1x1", qtyLabel: "1x0.6m - 10pcs", lengthM: 6, route: ["CANON", "CUT-G", "QC"], routeIndex: 0, status: "cetak", createdAt: iso(1), startedAt: iso(0.5), startedBy: "Riki", assignedOperator: "riki", createdBy: "Rizka", assignedBy: "Rizka", assignedAt: iso(1.2), priority: "reguler" },
    { id: "260923-016", customer: "Klinik Gigi Sehat", material: "BACKLIT", size: "4x2", qtyLabel: "4x2m - 1pcs", lengthM: 8, route: ["GZ", "LAM", "QC"], routeIndex: 1, status: "antri", createdAt: iso(4), createdBy: "Indra", note: "Tunggu laminasi doff", priority: "member" },
    { id: "260923-015", customer: "Bengkel Motor Jaya", material: "F280", size: "5x2", qtyLabel: "5x2m - 1pcs", lengthM: 10, route: ["GZ", "QC"], routeIndex: 0, status: "gagal", createdAt: iso(5), startedAt: iso(4.5), startedBy: "Adi", createdBy: "Uzi", priority: "reguler", failures: [{ at: iso(4.6), machine: "GZ", failKind: "CETAK", type: "meter", qtyP: 5, qtyL: 2, qtyTotalM: 1.2, reason: "Head mampet garis putih", by: "Adi" }] },
    { id: "260923-014", customer: "Cafe Rasa Nusantara", material: "FLEX CHINA", size: "3x2", qtyLabel: "3x2m - 2pcs", lengthM: 12, route: ["GZ", "SEAM", "QC"], routeIndex: 3, status: "siap", createdAt: iso(6), startedAt: iso(3), startedBy: "Riki", createdBy: "Susan", priority: "reguler" },
    { id: "260923-013", customer: "Percetakan Berkah", material: "ONEWAY", size: "2x1.5", qtyLabel: "2x1m - 3pcs", lengthM: 6, route: ["GZ", "QC"], routeIndex: 0, status: "antri", createdAt: iso(1.2), createdBy: "Uzi", priority: "express" },
    { id: "260923-012", customer: "Warteg Bahari", material: "ALBATROS", size: "3x2", qtyLabel: "3x2m - 1pcs", lengthM: 6, route: ["GZ", "SEAM", "QC"], routeIndex: 1, status: "cetak", createdAt: iso(2.8), startedAt: iso(0.8), startedBy: "Adi", assignedOperator: "adi", createdBy: "Rizka", assignedBy: "Rizka", assignedAt: iso(2.9), priority: "member" },
    { id: "260923-011", customer: "Distro Urban Style", material: "F280", size: "6x3", qtyLabel: "6x3m - 1pcs", lengthM: 18, route: ["GZ", "QC"], routeIndex: 0, status: "antri", createdAt: iso(0.3), createdBy: "Susan", priority: "reguler" },
    { id: "260923-010", customer: "Rental PS Cakrawala", material: "RITRAMA", size: "0.5x2", qtyLabel: "0.5x0.4m - 20pcs", lengthM: 4, route: ["GZ", "LAM", "CUT-G", "QC"], routeIndex: 3, status: "siap", createdAt: iso(7), startedAt: iso(5), startedBy: "Tira", createdBy: "Tira", priority: "member" },
    { id: "260923-009", customer: "PT Maju Bersama", material: "F440", size: "4x6", qtyLabel: "4x6m - 1pcs", lengthM: 24, route: ["GZ", "SEAM", "QC"], routeIndex: 3, status: "selesai", createdAt: iso(8), startedAt: iso(6), startedBy: "Indra", deliveredAt: iso(1), deliveredBy: "Indra", createdBy: "Indra", priority: "reguler" },
    { id: "260923-008", customer: "Toko Jaya Baru", material: "F340", size: "2x1", qtyLabel: "2x1m - 3pcs", lengthM: 6, route: ["GZ", "QC"], routeIndex: 0, status: "antri", createdAt: iso(1.8), createdBy: "Rizka", priority: "reguler" },
    { id: "260923-007", customer: "Sablon Kaos Keren", material: "F440", size: "3x2", qtyLabel: "3x2m - 1pcs", lengthM: 6, route: ["GZ", "QC"], routeIndex: 0, status: "antri", createdAt: iso(2.2), createdBy: "Uzi", priority: "member" },
    { id: "260923-006", customer: "Konveksi Maju", material: "AP260", size: "A3", qtyLabel: "A3 - 50 lbr", lengthM: 25, route: ["CANON", "QC"], routeIndex: 0, status: "antri", createdAt: iso(0.8), createdBy: "Susan", priority: "express" },
  ];
}
function formatTime(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
function formatDateTime(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function isMeterMaterial(material: string) {
  const m = material.toUpperCase();
  return m.includes("F280") || m.includes("F340") || m.includes("F440") || m.includes("F500") || m.includes("FLEX") || m.includes("BACKLIT") || m.includes("ALBATROS") || m.includes("ONE WAY") || m.includes("ONEWAY") || m.includes("KOREA") || m.includes("CHINA") || m.includes("440") || m.includes("340") || m.includes("RITRAMA") || m.includes("BLUISH") || m.includes("DURA");
}
function machineToFailKind(machine: string) {
  if (machine === "GZ" || machine === "CANON") return "CETAK";
  if (machine === "LAM") return "LAMINASI";
  if (machine === "CUT-H" || machine === "CUT-G") return "CUTTING";
  if (machine === "SEAM") return "SEAM";
  return machine;
}
function materialMatches(jobMaterial: string, chipId: string): boolean {
  const jm = jobMaterial.toUpperCase();
  const chip = chipId.toUpperCase();
  if (chip === "F280") return jm.includes("F280") || (jm.includes("FLEX") && jm.includes("280"));
  if (chip === "F340") return jm.includes("F340") || (jm.includes("FLEX") && jm.includes("340"));
  if (chip === "F440") return jm.includes("F440") || jm.includes("440") || jm.includes("KOREA");
  if (chip === "F500") return jm.includes("F500") || jm.includes("500");
  if (chip === "ONEWAY" || chip === "ONE WAY") return jm.includes("ONEWAY") || jm.includes("ONE WAY") || jm.includes("ONE");
  if (chip === "BACKLIT") return jm.includes("BACKLIT") || jm.includes("BACKLITE");
  return jm.includes(chip);
}
function classifyMaterial(mat: string): "FLEXI" | "STICKER" | "CANON" {
  const m = mat.toUpperCase();
  if (m.includes("AP260") || m.includes("IVORY") || m.includes("VINYL") || m.includes("TRANSPARAN") || m.includes("STIKER VINYL") || m.includes("CANON")) {
    if (m.includes("RITRAMA") || m.includes("BLUISH") || m.includes("ONEWAY") || m.includes("ONE WAY")) {
      return "STICKER";
    }
    if (m.includes("AP260") || m.includes("IVORY") || m.includes("TRANSPARAN")) return "CANON";
    if (m === "VINYL" || m.includes("STIKER VINYL")) return "CANON";
    return "CANON";
  }
  if (m.includes("RITRAMA") || m.includes("BLUISH") || m.includes("ONEWAY") || m.includes("ONE WAY")) return "STICKER";
  return "FLEXI";
}
function getFinishingOptions(material: string): FinishingOpt[] {
  const cls = classifyMaterial(material);
  if (cls === "CANON") return CANON_OPTS;
  if (cls === "STICKER") return STICKER_OPTS;
  return FLEXI_OPTS;
}
function generateJobId(existing: Job[]): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  const prefix = `${dd}${mm}${yy}`;
  const samePrefix = existing.filter((j) => j.id.startsWith(prefix));
  let maxNum = 0;
  samePrefix.forEach((j) => {
    const parts = j.id.split("-");
    if (parts.length === 2) {
      const n = parseInt(parts[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  });
  if (maxNum === 0) {
    const allNums = existing.map((j) => {
      const p = j.id.split("-")[1];
      return parseInt(p || "0", 10);
    });
    maxNum = Math.max(0, ...allNums);
  }
  const next = maxNum + 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}
function priorityWeight(p?: PriorityType): number {
  if (p === "express") return 0;
  if (p === "member") return 1;
  return 2;
}
function maskUrl(url: string): string {
  if (!url) return "-";
  try {
    const u = new URL(url);
    const host = u.hostname;
    if (host.length <= 12) return host;
    return host.slice(0, 6) + "***" + host.slice(-6);
  } catch {
    if (url.length <= 16) return url;
    return url.slice(0, 8) + "***" + url.slice(-8);
  }
}
// --- V3.9.6 URL NORMALIZER FIX: user pasted /rest/v1/ must become base only ---
function normalizeSupabaseUrl(raw: string): { normalized: string; hadSuffix: boolean; hint?: string } {
  if (!raw) return { normalized: "", hadSuffix: false };
  const noSpace = raw.replace(/\s+/g, "").trim();
  const hadSuffix = /\/rest(\/v1)?|\/auth\/v1|\/storage\/v1|\/realtime\/v1/i.test(noSpace);
  let cleaned = noSpace.replace(/\/+$/g, "");
  // extract base https://xxx.supabase.co even if suffix present
  const match = cleaned.match(/^(https?:\/\/[a-z0-9-]+\.supabase\.co)/i);
  if (match) {
    let base = match[1];
    try {
      const u = new URL(base);
      base = `${u.protocol}//${u.hostname}`;
    } catch {}
    base = base.replace(/\/+$/g, "");
    return { normalized: base, hadSuffix, hint: hadSuffix ? `URL jangan pakai /rest/v1/ - cukup ${base}` : undefined };
  }
  // fallback strip known suffixes
  let fallback = cleaned;
  fallback = fallback.replace(/\/rest\/v1\/?$/i, "").replace(/\/rest\/?$/i, "").replace(/\/auth\/v1\/?$/i, "").replace(/\/storage\/v1\/?$/i, "").replace(/\/realtime\/v1\/?$/i, "");
  fallback = fallback.replace(/\/+$/g, "");
  try {
    const u = new URL(fallback);
    if (u.hostname.endsWith(".supabase.co")) {
      const base = `${u.protocol}//${u.hostname}`;
      return { normalized: base, hadSuffix, hint: hadSuffix ? `URL jangan pakai /rest/v1/ - cukup ${base}` : undefined };
    }
  } catch {}
  return { normalized: fallback, hadSuffix, hint: hadSuffix ? `URL jangan pakai /rest/v1/ - cukup https://<project>.supabase.co` : undefined };
}
function normalizeSupabaseKey(raw: string): string {
  if (!raw) return "";
  // JWT should have no whitespace - trim and remove all whitespace/newlines
  return raw.trim().replace(/\s+/g, "");
}
function parseSupaError(e: any): { msg: string; isRLS: boolean; isTableMissing: boolean; code?: string } {
  const raw = e?.message || e?.error_description || e?.hint || JSON.stringify(e);
  const code = e?.code || e?.error_code || "";
  const lower = (raw + " " + code).toLowerCase();
  const isRLS = code === "42501" || lower.includes("row-level security") || lower.includes("rls") || lower.includes("policy") || lower.includes("permission denied") || lower.includes("not allowed");
  const isTableMissing = code === "42P01" || lower.includes("does not exist") || (lower.includes("relation") && lower.includes("jobs")) || lower.includes("could not find table");
  return { msg: raw, isRLS, isTableMissing, code };
}
// Supabase mappers
function fromDbRow(r: any): Job {
  return {
    id: r.id,
    customer: r.customer,
    material: r.material,
    size: r.size,
    qtyLabel: r.qty_label ?? r.qtyLabel ?? "",
    lengthM: r.length_m ?? r.lengthM ?? 0,
    route: Array.isArray(r.route) ? r.route : (r.route ? JSON.parse(r.route) : ["GZ","QC"]),
    routeIndex: r.route_index ?? r.routeIndex ?? 0,
    status: r.status,
    createdAt: r.created_at ?? r.createdAt ?? new Date().toISOString(),
    createdBy: r.created_by ?? r.createdBy,
    assignedOperator: r.assigned_operator ?? r.assignedOperator,
    assignedBy: r.assigned_by ?? r.assignedBy,
    assignedAt: r.assigned_at ?? r.assignedAt,
    startedAt: r.started_at ?? r.startedAt,
    startedBy: r.started_by ?? r.startedBy,
    deliveredAt: r.delivered_at ?? r.deliveredAt,
    deliveredBy: r.delivered_by ?? r.deliveredBy,
    note: r.note,
    failures: r.failures,
    deliveryNotes: r.delivery_notes ?? r.deliveryNotes,
    failureSummary: r.failure_summary ?? r.failureSummary,
    priority: (r.priority as PriorityType) ?? "reguler",
    finishingNote: r.finishing_note ?? r.finishingNote,
    finishingType: r.finishing_type ?? r.finishingType,
    plannedRoute: r.planned_route ?? r.plannedRoute,
    routeDecisions: r.route_decisions ?? r.routeDecisions,
  };
}
function toDbRow(job: Job): any {
  return {
    id: job.id,
    customer: job.customer,
    material: job.material,
    size: job.size,
    qty_label: job.qtyLabel,
    length_m: job.lengthM,
    route: job.route,
    route_index: job.routeIndex,
    status: job.status,
    created_at: job.createdAt,
    created_by: job.createdBy,
    assigned_operator: job.assignedOperator,
    assigned_by: job.assignedBy,
    assigned_at: job.assignedAt,
    started_at: job.startedAt,
    started_by: job.startedBy,
    delivered_at: job.deliveredAt,
    delivered_by: job.deliveredBy,
    note: job.note,
    failures: job.failures,
    delivery_notes: job.deliveryNotes,
    failure_summary: job.failureSummary,
    priority: job.priority || "reguler",
    finishing_note: job.finishingNote,
    finishing_type: job.finishingType,
    planned_route: job.plannedRoute,
    route_decisions: job.routeDecisions,
  };
}
function patchToDb(patch: Partial<Job>): any {
  const db: any = {};
  if (patch.customer !== undefined) db.customer = patch.customer;
  if (patch.material !== undefined) db.material = patch.material;
  if (patch.size !== undefined) db.size = patch.size;
  if (patch.qtyLabel !== undefined) db.qty_label = patch.qtyLabel;
  if (patch.lengthM !== undefined) db.length_m = patch.lengthM;
  if (patch.route !== undefined) db.route = patch.route;
  if (patch.routeIndex !== undefined) db.route_index = patch.routeIndex;
  if (patch.status !== undefined) db.status = patch.status;
  if (patch.createdAt !== undefined) db.created_at = patch.createdAt;
  if (patch.createdBy !== undefined) db.created_by = patch.createdBy;
  if (patch.assignedOperator !== undefined) db.assigned_operator = patch.assignedOperator;
  if (patch.assignedBy !== undefined) db.assigned_by = patch.assignedBy;
  if (patch.assignedAt !== undefined) db.assigned_at = patch.assignedAt;
  if (patch.startedAt !== undefined) db.started_at = patch.startedAt;
  if (patch.startedBy !== undefined) db.started_by = patch.startedBy;
  if (patch.deliveredAt !== undefined) db.delivered_at = patch.deliveredAt;
  if (patch.deliveredBy !== undefined) db.delivered_by = patch.deliveredBy;
  if (patch.note !== undefined) db.note = patch.note;
  if (patch.failures !== undefined) db.failures = patch.failures;
  if (patch.deliveryNotes !== undefined) db.delivery_notes = patch.deliveryNotes;
  if (patch.failureSummary !== undefined) db.failure_summary = patch.failureSummary;
  if (patch.priority !== undefined) db.priority = patch.priority;
  if (patch.finishingNote !== undefined) db.finishing_note = patch.finishingNote;
  if (patch.finishingType !== undefined) db.finishing_type = patch.finishingType;
  if (patch.plannedRoute !== undefined) db.planned_route = patch.plannedRoute;
  if ((patch as any).routeDecisions !== undefined) db.route_decisions = (patch as any).routeDecisions;
  return db;
}

export default function App() {
  const [jobs, setJobs] = useState<Job[]>(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem(LS_JOBS);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch {}
    return seedJobs();
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    try {
      if (typeof window !== "undefined") {
        return window.localStorage.getItem(LS_USER);
      }
    } catch {}
    return null;
  });
  const [selectedLoginId, setSelectedLoginId] = useState<string>("");
  const [pinInput, setPinInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const [gagalModal, setGagalModal] = useState<null | { jobId: string; machine: string; failKind: string; defaultType: FailureType }>(null);
  const [gagalForm, setGagalForm] = useState<{ type: FailureType; lembar: string; p: string; l: string; reason: string }>({ type: "meter", lembar: "", p: "", l: "", reason: "" });
  const [serahkanModal, setSerahkanModal] = useState<null | { jobId: string }>(null);
  const [serahkanNote, setSerahkanNote] = useState("");
  const [detailJobId, setDetailJobId] = useState<string | null>(null);
  const [orderModal, setOrderModal] = useState(false);
  const [orderForm, setOrderForm] = useState<{
    customer: string;
    material: string;
    type: "meter" | "lembar";
    p: string;
    l: string;
    qty: string;
    sizeLabel: string;
    note: string;
    priority: PriorityType;
    finishing: string;
  }>({ customer: "", material: "F280", type: "meter", p: "", l: "", qty: "", sizeLabel: "A3", note: "", priority: "reguler", finishing: "" });
  const [gzFilter, setGzFilter] = useState<string | null>(null);
  const [canonFilter, setCanonFilter] = useState<string | null>(null);
  const [startFinishingModal, setStartFinishingModal] = useState<null | { jobId: string; customer: string; material: string }>(null);
  const [selectedFinishing, setSelectedFinishing] = useState<FinishingOpt | null>(null);
  // supabase states
  const [supabaseLib, setSupabaseLib] = useState<any>(null);
  const [supabaseClient, setSupabaseClient] = useState<any>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<"disconnected" | "connected" | "error" | "loading">("disconnected");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supaUrlInput, setSupaUrlInput] = useState("");
  const [supaKeyInput, setSupaKeyInput] = useState("");
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [supabaseErrorDetail, setSupabaseErrorDetail] = useState<string | null>(null);
  const [supabaseErrorMeta, setSupabaseErrorMeta] = useState<{ isRLS: boolean; isTableMissing: boolean; code?: string } | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string; time: string } | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const channelRef = useRef<any>(null);

  const currentUser = useMemo(() => USERS.find((u) => u.id === currentUserId) || null, [currentUserId]);
  useEffect(() => {
    if (currentUserId) {
      try { window.localStorage.setItem(LS_USER, currentUserId); } catch {}
    }
  }, [currentUserId]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  // --- SUPABASE FIX V3.9.6: CDN jsdelivr, URL normalizer /rest/v1 fix ---
  useEffect(() => {
    let cancelled = false;
    const loadIfNeeded = async () => {
      if (supabaseLib) return;
      const hasConfig = (() => {
        try {
          const rawU = window.localStorage.getItem(LS_SUPA_URL) || (import.meta as any)?.env?.VITE_SUPABASE_URL || supaUrlInput || "";
          const rawK = window.localStorage.getItem(LS_SUPA_KEY) || (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY || supaKeyInput || "";
          const u = normalizeSupabaseUrl(rawU).normalized;
          const k = normalizeSupabaseKey(rawK);
          return !!(u && k);
        } catch { return false; }
      })();
      if (!hasConfig) {
        setSupabaseStatus("disconnected");
        return;
      }
      try {
        console.log("[Supabase V3.9.6] Loading client via local package...");
        // FIX: use local npm package, not CDN (CDN often blocked in ID)
        const mod = await import("@supabase/supabase-js");
        if (!cancelled) {
          console.log("[Supabase V3.9.6] Lib loaded:", !!mod.createClient);
          setSupabaseLib(mod);
        }
      } catch (e: any) {
        console.error("[Supabase V3.9.6] Failed to load lib:", e);
        if (!cancelled) {
          setSupabaseStatus("error");
          const parsed = parseSupaError(e);
          setSupabaseErrorDetail(`Gagal load supabase-js lib: ${parsed.msg}`);
          setSupabaseErrorMeta(parsed);
        }
      }
    };
    loadIfNeeded();
    return () => { cancelled = true; };
  }, [settingsOpen, supaUrlInput, supaKeyInput, supabaseLib]);

  useEffect(() => {
    try {
      const rawUrl = (window.localStorage.getItem(LS_SUPA_URL) || (import.meta as any)?.env?.VITE_SUPABASE_URL || "");
      const rawKey = (window.localStorage.getItem(LS_SUPA_KEY) || (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY || "");
      const url = normalizeSupabaseUrl(rawUrl).normalized;
      const key = normalizeSupabaseKey(rawKey);
      setSupaUrlInput(url);
      setSupaKeyInput(key);
      if (url) console.log("[Supabase V3.9.6] URL configured:", maskUrl(url));
      else console.log("[Supabase V3.9.6] No URL configured - LocalStorage mode");
    } catch {}
  }, []);

  useEffect(() => {
    if (!supabaseLib) return;
    let url = "";
    let key = "";
    try {
      const rawUrl = (window.localStorage.getItem(LS_SUPA_URL) || (import.meta as any)?.env?.VITE_SUPABASE_URL || "");
      const rawKey = (window.localStorage.getItem(LS_SUPA_KEY) || (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY || "");
      url = normalizeSupabaseUrl(rawUrl).normalized;
      key = normalizeSupabaseKey(rawKey);
    } catch {}
    if (!url || !key) {
      console.log("[Supabase V3.9.6] Disconnected - no config");
      setSupabaseStatus("disconnected");
      setSupabaseClient(null);
      setSupabaseErrorDetail(null);
      setSupabaseErrorMeta(null);
      return;
    }
    try {
      console.log("[Supabase V3.9.6] Creating client - URL:", maskUrl(url), "Key len:", key.length);
      const client = supabaseLib.createClient(url, key);
      setSupabaseClient(client);
      setSupabaseStatus("loading");
      setSupabaseErrorDetail(null);
      setSupabaseErrorMeta(null);
    } catch (e: any) {
      console.error("[Supabase V3.9.6] createClient error", e);
      setSupabaseStatus("error");
      const parsed = parseSupaError(e);
      setSupabaseErrorDetail(`createClient error: ${parsed.msg}`);
      setSupabaseErrorMeta(parsed);
    }
  }, [supabaseLib, settingsOpen]);

  useEffect(() => {
    if (!supabaseClient) return;
    let mounted = true;
    (async () => {
      setIsLoadingJobs(true);
      try {
        console.log("[Supabase V3.9.6] Testing fetch jobs...");
        const { data, error } = await supabaseClient.from("jobs").select("*").order("created_at", { ascending: true });
        console.log("[Supabase V3.9.6] fetch result:", { dataCount: data?.length, error });
        if (error) throw error;
        if (mounted && data) {
          const mapped = (data as any[]).map(fromDbRow);
          if (mapped.length > 0) setJobs(mapped);
          setSupabaseStatus("connected");
          setSupabaseErrorDetail(null);
          setSupabaseErrorMeta(null);
          setTestResult({ ok: true, msg: `Connected - ${mapped.length} jobs loaded`, time: new Date().toISOString() });
        } else if (mounted) {
          setSupabaseStatus("connected");
          setTestResult({ ok: true, msg: `Connected - empty table (0 rows)`, time: new Date().toISOString() });
        }
      } catch (e: any) {
        console.error("[Supabase V3.9.6] fetch error", e);
        if (mounted) {
          setSupabaseStatus("error");
          const parsed = parseSupaError(e);
          setSupabaseErrorDetail(parsed.msg);
          setSupabaseErrorMeta(parsed);
          setTestResult({ ok: false, msg: `ERROR [${parsed.code || "no-code"}]: ${parsed.msg}`, time: new Date().toISOString() });
        }
      } finally {
        if (mounted) setIsLoadingJobs(false);
      }
    })();
    try {
      if (channelRef.current) {
        try { supabaseClient.removeChannel(channelRef.current); } catch {}
      }
      const ch = supabaseClient.channel("jobs-changes").on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, (payload: any) => {
        if (payload.eventType === "INSERT" && payload.new) {
          const j = fromDbRow(payload.new);
          setJobs((prev) => {
            if (prev.find((x) => x.id === j.id)) return prev;
            return [...prev, j];
          });
        } else if (payload.eventType === "UPDATE" && payload.new) {
          const j = fromDbRow(payload.new);
          setJobs((prev) => prev.map((x) => (x.id === j.id ? j : x)));
        } else if (payload.eventType === "DELETE" && payload.old) {
          const id = payload.old.id;
          setJobs((prev) => prev.filter((x) => x.id !== id));
        }
      }).subscribe((status: any, err: any) => {
        console.log("[Supabase V3.9.6] realtime status:", status, err);
      });
      channelRef.current = ch;
    } catch (e) {
      console.warn("Realtime subscribe failed", e);
    }
    return () => {
      mounted = false;
      if (channelRef.current) {
        try { supabaseClient.removeChannel(channelRef.current); } catch {}
        channelRef.current = null;
      }
    };
  }, [supabaseClient]);

  useEffect(() => {
    if (supabaseStatus === "connected" || supabaseStatus === "loading") return;
    try { window.localStorage.setItem(LS_JOBS, JSON.stringify(jobs)); } catch {}
  }, [jobs, supabaseStatus]);

  const stats = useMemo(() => {
    const antri = jobs.filter((j) => j.status === "antri").length;
    const cetak = jobs.filter((j) => j.status === "cetak").length;
    const siap = jobs.filter((j) => j.status === "siap").length;
    const selesai = jobs.filter((j) => j.status === "selesai").length;
    const totalM = jobs.reduce((a, b) => a + b.lengthM, 0);
    const selesaiM = jobs.filter((j) => j.status === "selesai").reduce((a, b) => a + b.lengthM, 0);
    const eff = totalM ? Math.round((selesaiM / totalM) * 100) : 0;
    return { antri, cetak, siap, selesai, totalM, eff };
  }, [jobs]);

  const operatorLoads = useMemo(() => {
    return (ASSIGNABLE_IDS as readonly string[]).map((opId) => {
      const user = USERS.find((u) => u.id === opId);
      const activeJobs = jobs.filter((j) => j.assignedOperator === opId && j.status !== "selesai");
      return {
        id: opId,
        label: user?.label || opId,
        initials: user?.initials || opId.slice(0, 2).toUpperCase(),
        total: activeJobs.length,
        meters: activeJobs.reduce((a, b) => a + b.lengthM, 0),
      };
    });
  }, [jobs]);

  const configExists = useMemo(() => {
    try {
      const rawU = window.localStorage.getItem(LS_SUPA_URL) || "";
      const rawK = window.localStorage.getItem(LS_SUPA_KEY) || "";
      const u = normalizeSupabaseUrl(rawU).normalized;
      const k = normalizeSupabaseKey(rawK);
      return !!(u && k);
    } catch { return false; }
  }, [supabaseStatus, settingsOpen, supaUrlInput, supaKeyInput]);

  const isSupabaseConnected = supabaseStatus === "connected" && !!supabaseClient;
  const isSupabaseError = supabaseStatus === "error" && configExists;

  const supaUrlNormalizedPreview = useMemo(() => {
    if (!supaUrlInput) return { normalized: "", hadSuffix: false as boolean, hint: undefined as string | undefined };
    return normalizeSupabaseUrl(supaUrlInput);
  }, [supaUrlInput]);
  const supaUrlHasRestHint = supaUrlNormalizedPreview.hadSuffix;

  const handleTestConnection = async () => {
    // V3.9.6: normalize inputs before test, and give friendly hint if user pasted /rest/v1/
    const urlCheckRaw = supaUrlInput || (typeof window !== "undefined" ? window.localStorage.getItem(LS_SUPA_URL) || "" : "");
    const normCheck = normalizeSupabaseUrl(urlCheckRaw);
    if (normCheck.hadSuffix) {
      setSupabaseErrorDetail(normCheck.hint || "URL jangan pakai /rest/v1/ - cukup https://xxx.supabase.co");
      setTestResult({ ok: false, msg: normCheck.hint || "URL jangan pakai /rest/v1/ - cukup https://xxx.supabase.co", time: new Date().toISOString() });
      // still proceed with normalized URL if client exists, but warn
    }
    if (!supabaseClient) {
      // try to auto-fix client if we have normalized url+key but client not yet created
      const rawKey = supaKeyInput || (typeof window !== "undefined" ? window.localStorage.getItem(LS_SUPA_KEY) || "" : "");
      const normalizedUrl = normCheck.normalized;
      const normalizedKey = normalizeSupabaseKey(rawKey);
      if (normalizedUrl && normalizedKey && supabaseLib) {
        try {
          const client = supabaseLib.createClient(normalizedUrl, normalizedKey);
          setSupabaseClient(client);
          setSupabaseStatus("loading");
          setTestResult({ ok: false, msg: `Auto-fix URL → ${normalizedUrl} - retrying connection...`, time: new Date().toISOString() });
          setToast(`🔧 URL auto-fix ke ${maskUrl(normalizedUrl)} - coba TEST lagi`);
          return;
        } catch {}
      }
      const hintExtra = normCheck.hadSuffix ? ` • ${normCheck.hint}` : "";
      const msg = `No client - configure URL & Key dulu${hintExtra}`;
      setTestResult({ ok: false, msg: msg, time: new Date().toISOString() });
      setSupabaseErrorDetail(msg + (normCheck.hadSuffix ? "" : " - jika URL ada /rest/v1/ hapus, cukup https://xxx.supabase.co"));
      return;
    }
    setTestLoading(true);
    setTestResult(null);
    try {
      console.log("[Supabase V3.9.6] Test connection - URL:", maskUrl(supaUrlInput || (window.localStorage.getItem(LS_SUPA_URL) || "")));
      const { data, error } = await supabaseClient.from("jobs").select("id").limit(1);
      console.log("[Supabase V3.9.6] Test result:", { data, error });
      if (error) throw error;
      const okMsg = `OK - Table jobs exists, ${data?.length ?? 0} row sample, RLS OK`;
      setTestResult({ ok: true, msg: okMsg, time: new Date().toISOString() });
      setSupabaseStatus("connected");
      setSupabaseErrorDetail(null);
      setSupabaseErrorMeta(null);
      setToast("✅ Supabase Test OK - " + okMsg);
    } catch (e: any) {
      console.error("[Supabase V3.9.6] Test failed", e);
      const parsed = parseSupaError(e);
      setSupabaseErrorDetail(parsed.msg);
      setSupabaseErrorMeta(parsed);
      setSupabaseStatus("error");
      setTestResult({ ok: false, msg: `ERROR [${parsed.code || "?"}]: ${parsed.msg}`, time: new Date().toISOString() });
      setToast("❌ Test Failed: " + parsed.msg.slice(0, 80));
    } finally {
      setTestLoading(false);
    }
  };

  const dbUpdate = async (id: string, patch: Partial<Job>) => {
    if (!isSupabaseConnected) return;
    try {
      const dbPatch = patchToDb(patch);
      const { error } = await supabaseClient.from("jobs").update(dbPatch).eq("id", id);
      if (error) {
        console.warn("dbUpdate error", error);
        const parsed = parseSupaError(error);
        setSupabaseErrorDetail(parsed.msg);
        setSupabaseErrorMeta(parsed);
        if (parsed.isRLS || parsed.isTableMissing) setSupabaseStatus("error");
      }
    } catch (e: any) {
      const parsed = parseSupaError(e);
      setSupabaseErrorDetail(parsed.msg);
      setSupabaseErrorMeta(parsed);
    }
  };
  const dbInsert = async (job: Job) => {
    if (!isSupabaseConnected) return;
    try {
      const row = toDbRow(job);
      const { error } = await supabaseClient.from("jobs").insert([row]);
      if (error) {
        console.warn("dbInsert error", error);
        const parsed = parseSupaError(error);
        setSupabaseErrorDetail(parsed.msg);
        setSupabaseErrorMeta(parsed);
        if (parsed.isRLS || parsed.isTableMissing) setSupabaseStatus("error");
      }
    } catch (e: any) {
      const parsed = parseSupaError(e);
      setSupabaseErrorDetail(parsed.msg);
      setSupabaseErrorMeta(parsed);
    }
  };
  const dbDelete = async (id: string) => {
    if (!isSupabaseConnected) return;
    try {
      const { error } = await supabaseClient.from("jobs").delete().eq("id", id);
      if (error) {
        const parsed = parseSupaError(error);
        setSupabaseErrorDetail(parsed.msg);
        setSupabaseErrorMeta(parsed);
      }
    } catch (e: any) {
      const parsed = parseSupaError(e);
      setSupabaseErrorDetail(parsed.msg);
    }
  };

  const handleLogin = () => {
    const user = USERS.find((u) => u.id === selectedLoginId);
    if (!user) return;
    const input = pinInput.trim();
    if (input.length === 0) {
      setLoginError("Password wajib diisi");
      return;
    }
    if (input === user.pin) {
      setCurrentUserId(user.id);
      setLoginError("");
      setPinInput("");
      setToast(`Halo ${user.label} • V3.9.6 URL FIX FINAL ROLES`);
    } else {
      setLoginError(`Password salah untuk ${user.label}`);
    }
  };
  const handleLogout = () => {
    setCurrentUserId(null);
    try { window.localStorage.removeItem(LS_USER); } catch {}
    setPinInput("");
    setSelectedLoginId("");
  };

  const assignableOperators = useMemo(() => USERS.filter((u) => (ASSIGNABLE_IDS as readonly string[]).includes(u.id)), []);
  const canAssign = useMemo(() => currentUser ? canAssignId(currentUser.id) : false, [currentUser]);
  const isOwner = useMemo(() => currentUser ? isOwnerId(currentUser.id) : false, [currentUser]);
  const canAddOrder = useMemo(() => currentUser ? canAddOrderId(currentUser.id) : false, [currentUser]);
  // V3.9.5 FINAL ROLE HELPERS per user
  const canStartPrint = useMemo(() => currentUser ? canStartPrintId(currentUser.id) : false, [currentUser]);
  const canSerahkan = useMemo(() => currentUser ? canSerahkanId(currentUser.id) : false, [currentUser]);
  const isCSOnly = useMemo(() => currentUser ? (CS_ONLY_IDS as readonly string[]).includes(currentUser.id) : false, [currentUser]);

  const handleAssign = async (jobId: string, operatorId: string) => {
    if (!currentUser || currentUser.id !== INDRA_ONLY_ID) {
      setToast("⛔ Hanya Indra yang bisa assign");
      return;
    }
    if (!operatorId) {
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, assignedOperator: undefined, assignedBy: undefined, assignedAt: undefined } : j)));
      await dbUpdate(jobId, { assignedOperator: undefined, assignedBy: undefined, assignedAt: undefined } as any);
      setToast(`⚪ Assign dihapus untuk #${jobId}`);
      return;
    }
    const opUser = USERS.find((u) => u.id === operatorId);
    if (!opUser) return;
    const nowIso = new Date().toISOString();
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, assignedOperator: opUser.id, assignedBy: "Indra", assignedAt: nowIso } : j)));
    await dbUpdate(jobId, { assignedOperator: opUser.id, assignedBy: "Indra", assignedAt: nowIso } as any);
    setToast(`👷 #${jobId} di-assign ke ${opUser.label}`);
  };

  const handleMulaiClick = async (job: Job) => {
    if (!currentUser) return;
    // FINAL ROLES V3.9.5 - CS cannot start print
    if (!canStartPrintId(currentUser.id)) {
      setToast(`🔒 Hanya Operator & Indra yang bisa MULAI CETAK • ${currentUser.label} tidak punya akses`);
      return;
    }
    if (job.assignedOperator && job.assignedOperator !== currentUser.id && currentUser.id !== INDRA_ONLY_ID) {
      setToast(`🔒 Assigned ke ${USERS.find(u=>u.id===job.assignedOperator)?.label} - hanya ${USERS.find(u=>u.id===job.assignedOperator)?.label} & Indra bisa proses`);
      return;
    }
    // V3.9.17 FIX BUG FINISHING LOOP: Jika sudah di tengah route (routeIndex >0) atau sudah punya finishingType, jangan buka modal finishing lagi!
    // Ini yang bikin di video loop SEAM -> modal -> GZ -> SEAM lagi
    if (job.routeIndex > 0 || job.finishingType) {
      const nowIso = new Date().toISOString();
      const isUnassigned = !job.assignedOperator;
      setJobs((prev) => prev.map((j) => j.id !== job.id ? j : {
        ...j,
        status: "cetak" as JobStatus,
        startedAt: nowIso,
        startedBy: currentUser.label,
        assignedOperator: j.assignedOperator || currentUser.id,
        assignedBy: j.assignedBy || (isUnassigned ? currentUser.label : j.assignedBy),
        assignedAt: j.assignedAt || (isUnassigned ? nowIso : j.assignedAt),
      }));
      const dbPatch: any = {
        status: "cetak" as JobStatus,
        routeIndex: job.routeIndex,
        startedAt: nowIso,
        startedBy: currentUser.label,
        assignedOperator: job.assignedOperator || currentUser.id,
        assignedBy: job.assignedBy || (isUnassigned ? currentUser.label : job.assignedBy),
        assignedAt: job.assignedAt || (isUnassigned ? nowIso : job.assignedAt),
      };
      await dbUpdate(job.id, dbPatch);
      setToast(`▶ #${job.id} MULAI ${job.route[job.routeIndex]} • ${job.finishingType || ''}`);
      return;
    }
    // Baru pertama kali (routeIndex 0, belum ada finishing) -> buka modal finishing at start
    setStartFinishingModal({ jobId: job.id, customer: job.customer, material: job.material });
    const opts = getFinishingOptions(job.material);
    const currentRouteStr = job.route.join(",");
    const match = opts.find(o => o.route.join(",") === currentRouteStr) || opts[0];
    setSelectedFinishing(match);
  };

  const confirmStartCetak = async () => {
    if (!startFinishingModal || !selectedFinishing || !currentUser) return;
    if (!canStartPrintId(currentUser.id)) {
      setToast(`⛔ ${currentUser.label} tidak boleh MULAI CETAK`);
      return;
    }
    const jobId = startFinishingModal.jobId;
    const nowIso = new Date().toISOString();
    const patch: Partial<Job> = {
      route: selectedFinishing.route,
      routeIndex: 0,
      status: "cetak" as JobStatus,
      startedAt: nowIso,
      startedBy: currentUser.label,
      assignedOperator: undefined, // will be set below if needed
      finishingNote: selectedFinishing.label + (selectedFinishing.note ? ` • ${selectedFinishing.note}` : ""),
      finishingType: selectedFinishing.label,
      plannedRoute: selectedFinishing.route,
    } as any;
    setJobs((prev) => prev.map((j) => {
      if (j.id !== jobId) return j;
      const isUnassigned = !j.assignedOperator;
      return {
        ...j,
        route: selectedFinishing!.route,
        routeIndex: 0,
        status: "cetak" as JobStatus,
        startedAt: nowIso,
        startedBy: currentUser.label,
        assignedOperator: j.assignedOperator || currentUser.id,
        assignedBy: j.assignedBy || (isUnassigned ? currentUser.label : j.assignedBy),
        assignedAt: j.assignedAt || (isUnassigned ? nowIso : j.assignedAt),
        finishingNote: selectedFinishing!.label + (selectedFinishing!.note ? ` • ${selectedFinishing!.note}` : ""),
        finishingType: selectedFinishing!.label,
        plannedRoute: selectedFinishing!.route,
      };
    }));
    // db update
    const existing = jobs.find(j=>j.id===jobId);
    const isUnassigned = !existing?.assignedOperator;
    const dbPatch: Partial<Job> = {
      route: selectedFinishing.route,
      routeIndex: 0,
      status: "cetak" as JobStatus,
      startedAt: nowIso,
      startedBy: currentUser.label,
      finishingNote: selectedFinishing.label + (selectedFinishing.note ? ` • ${selectedFinishing.note}` : ""),
      finishingType: selectedFinishing.label,
      plannedRoute: selectedFinishing.route,
      assignedOperator: existing?.assignedOperator || currentUser.id,
      assignedBy: existing?.assignedBy || (isUnassigned ? currentUser.label : existing?.assignedBy),
      assignedAt: existing?.assignedAt || (isUnassigned ? nowIso : existing?.assignedAt),
    } as any;
    await dbUpdate(jobId, dbPatch);
    setToast(`▶ #${jobId} MULAI ${selectedFinishing.route.join(" → ")} • ${selectedFinishing.label}`);
    setStartFinishingModal(null);
    setSelectedFinishing(null);
  };

  const handleNext = async (id: string) => {
    if (!currentUser) return;
    const job = jobs.find(j => j.id === id);
    if (!job) return;
    if (!canStartPrintId(currentUser.id)) {
      setToast(`🔒 Hanya Operator & Indra bisa NEXT • ${currentUser.label} CS hanya SERAHKAN`);
      return;
    }
    if (!canNextId(currentUser.id, job)) {
      setToast(`🔒 Locked ke ${USERS.find(u=>u.id===job.assignedOperator)?.label || job.assignedOperator}`);
      return;
    }
    const nextIndex = job.routeIndex + 1;
    const nextMachine = job.route[nextIndex];
    if (!nextMachine || nextMachine === "QC") {
      setJobs((prev) => prev.map((j) => j.id === id ? { ...j, status: "siap" as JobStatus, routeIndex: job.route.length } : j));
      await dbUpdate(id, { status: "siap" as JobStatus, routeIndex: job.route.length } as any);
      setToast(`✅ #${id} → QC SIAP`);
    } else {
      setJobs((prev) => prev.map((j) => j.id === id ? { ...j, routeIndex: nextIndex, status: "antri" as JobStatus } : j));
      await dbUpdate(id, { routeIndex: nextIndex, status: "antri" as JobStatus } as any);
      setToast(`➡️ #${id} → ${nextMachine}`);
    }
  };

  const openGagalPopup = (job: Job) => {
    if (!currentUser) return;
    if (!canStartPrintId(currentUser.id)) {
      setToast(`🔒 Hanya Operator & Indra bisa GAGAL • ${currentUser.label} tidak punya akses`);
      return;
    }
    if (!canFailId(currentUser.id, job)) {
      setToast(`🔒 Locked ke ${USERS.find(u=>u.id===job.assignedOperator)?.label}`);
      return;
    }
    const machine = job.route[job.routeIndex] || job.route[job.route.length - 1] || "GZ";
    const failKind = machineToFailKind(machine);
    const defType: FailureType = isMeterMaterial(job.material) || machine === "GZ" ? "meter" : (machine === "CANON" && !isMeterMaterial(job.material) ? "lembar" : (["CUT-H", "CUT-G", "LAM", "SEAM"].includes(machine) ? (isMeterMaterial(job.material) ? "meter" : "lembar") : "meter"));
    setGagalModal({ jobId: job.id, machine, failKind, defaultType: defType });
    setGagalForm({ type: defType, lembar: "", p: "", l: "", reason: "" });
  };
  const submitGagal = async () => {
    if (!gagalModal || !currentUser) return;
    const job = jobs.find((j) => j.id === gagalModal.jobId);
    if (!job) return;
    if (!gagalForm.reason.trim()) {
      setToast("⚠️ Alasan gagal wajib diisi");
      return;
    }
    if (gagalForm.type === "lembar") {
      const qty = parseInt(gagalForm.lembar);
      if (!qty || qty <= 0) { setToast("⚠️ Isi jumlah lembar gagal"); return; }
    } else {
      const p = parseFloat(gagalForm.p);
      const l = parseFloat(gagalForm.l);
      if (!p || p <= 0 || !l || l <= 0) { setToast("⚠️ Isi P x L meter gagal"); return; }
    }
    const newFail: FailureRecord = {
      at: new Date().toISOString(),
      machine: gagalModal.machine,
      failKind: gagalModal.failKind,
      type: gagalForm.type,
      qtyLembar: gagalForm.type === "lembar" ? parseInt(gagalForm.lembar) : undefined,
      qtyP: gagalForm.type === "meter" ? parseFloat(gagalForm.p) : undefined,
      qtyL: gagalForm.type === "meter" ? parseFloat(gagalForm.l) : undefined,
      qtyTotalM: gagalForm.type === "meter" ? parseFloat(gagalForm.p) * parseFloat(gagalForm.l) : undefined,
      reason: gagalForm.reason.trim(),
      by: currentUser.label,
    };
    setJobs((prev) => prev.map((j) => j.id === gagalModal.jobId ? { ...j, status: "gagal" as JobStatus, failures: [...(j.failures || []), newFail] } : j));
    await dbUpdate(gagalModal.jobId, { status: "gagal" as JobStatus, failures: [...(job.failures || []), newFail] } as any);
    setToast(`❌ Gagal: ${gagalModal.machine} - ${gagalForm.type === "lembar" ? gagalForm.lembar + " lembar" : gagalForm.p + "x" + gagalForm.l + "m"} - ${gagalForm.reason}`);
    setGagalModal(null);
  };
  const handleRetry = async (id: string) => {
    if (!currentUser) return;
    const job = jobs.find(j=>j.id===id);
    if (!job) return;
    // V3.9.5: retry = same as start print permission
    if (!canStartPrintId(currentUser.id)) {
      setToast(`🔒 Hanya Operator & Indra bisa COBA LAGI`);
      return;
    }
    if (!canNextId(currentUser.id, job)) {
      setToast(`🔒 Locked ke ${USERS.find(u=>u.id===job.assignedOperator)?.label}`);
      return;
    }
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: "antri" as JobStatus } : j)));
    await dbUpdate(id, { status: "antri" as JobStatus } as any);
  };
  const handleSerahkanAttempt = (id: string) => {
    const job = jobs.find((j) => j.id === id);
    if (!job) return;
    if (!currentUser) return;
    if (!canSerahkanId(currentUser.id)) {
      setToast(`🔒 Hanya Indra, CS (Uzi/Rizka/Susan) & Tira bisa SERAHKAN • ${currentUser.label} Operator tidak bisa serahkan`);
      return;
    }
    if (job.failures && job.failures.length > 0) {
      setSerahkanModal({ jobId: id });
      const totalLembar = job.failures.filter(f => f.type === "lembar").reduce((a, b) => a + (b.qtyLembar || 0), 0);
      const totalMeter = job.failures.filter(f => f.type === "meter").reduce((a, b) => a + (b.qtyTotalM || 0), 0);
      setSerahkanNote(job.deliveryNotes || `Total gagal: ${totalLembar ? totalLembar + " lembar" : ""} ${totalMeter ? totalMeter.toFixed(2) + " m²" : ""}`.trim() || "");
    } else {
      doSerahkan(id, "");
    }
  };
  const doSerahkan = async (id: string, note: string) => {
    if (!currentUser) return;
    if (!canSerahkanId(currentUser.id)) {
      setToast(`⛔ ${currentUser.label} tidak boleh SERAHKAN`);
      return;
    }
    const job = jobs.find((j) => j.id === id);
    const totalLembar = job?.failures?.filter(f => f.type === "lembar").reduce((a, b) => a + (b.qtyLembar || 0), 0) || 0;
    const totalMeter = job?.failures?.filter(f => f.type === "meter").reduce((a, b) => a + (b.qtyTotalM || 0), 0) || 0;
    const summary = job?.failures && job.failures.length > 0 ? `Gagal: ${totalLembar ? totalLembar + " lbr" : ""} ${totalMeter ? totalMeter.toFixed(2) + " m² (" + job.failures.filter(f=>f.type==="meter").map(f=>f.qtyP+"x"+f.qtyL).join(", ") + ")" : ""}`.trim() : undefined;
    const nowIso = new Date().toISOString();
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, status: "selesai" as JobStatus, deliveredAt: new Date().toISOString(), deliveredBy: currentUser.label, deliveryNotes: note || j.deliveryNotes, failureSummary: summary || j.failureSummary } : j));
    await dbUpdate(id, { status: "selesai" as JobStatus, deliveredAt: nowIso, deliveredBy: currentUser.label, deliveryNotes: note || job?.deliveryNotes, failureSummary: summary || job?.failureSummary } as any);
    setToast(`✅ #${id} diserahkan → SELESAI ${summary ? "dengan catatan gagal" : ""}`);
    setSerahkanModal(null);
    setSerahkanNote("");
  };
  const handleClearSelesai = async (id: string) => { 
    setJobs((prev) => prev.filter((j) => j.id !== id));
    await dbDelete(id);
  };
  const handleClearAllSelesai = async () => {
    if (!confirm("Hapus semua riwayat SELESAI hari ini?")) return;
    const ids = jobs.filter(j=>j.status==="selesai").map(j=>j.id);
    setJobs((prev) => prev.filter((j) => j.status !== "selesai"));
    if (isSupabaseConnected) {
      for (const id of ids) await dbDelete(id);
    }
  };

  const getJobsForColumn = (colId: string) => {
    if (colId === "QC") return jobs.filter((j) => j.status === "siap");
    if (colId === "SELESAI") return jobs.filter((j) => j.status === "selesai");
    return jobs.filter((j) => (j.status === "antri" || j.status === "cetak" || j.status === "gagal") && j.route[j.routeIndex] === colId);
  };

  const handleCreateOrder = async () => {
    if (!currentUser) return;
    if (!orderForm.customer.trim()) {
      setToast("⚠️ Nama customer wajib diisi");
      return;
    }
    if (!orderForm.material) {
      setToast("⚠️ Bahan wajib dipilih");
      return;
    }
    let lengthM = 0;
    let qtyLabel = "";
    let size = "";
    if (orderForm.type === "meter") {
      const p = parseFloat(orderForm.p) || 0;
      const l = parseFloat(orderForm.l) || 0;
      const qty = parseInt(orderForm.qty) || 1;
      if (p <= 0 || l <= 0) {
        setToast("⚠️ Isi P dan L meter");
        return;
      }
      lengthM = p * l * qty;
      qtyLabel = `${p}x${l}m - ${qty}pcs`;
      size = `${p}x${l}`;
    } else {
      const qty = parseInt(orderForm.qty) || 0;
      if (qty <= 0) {
        setToast("⚠️ Isi qty lembar");
        return;
      }
      lengthM = qty * 0.5;
      qtyLabel = `${orderForm.sizeLabel || "A3"} - ${qty} lbr`;
      size = orderForm.sizeLabel || "A3";
    }
    const matOpt = ALL_MATERIAL_OPTIONS.find((m) => m.id === orderForm.material);
    const machine = matOpt?.group === "CANON" ? "CANON" : "GZ";
    const newId = generateJobId(jobs);
    const finishingOpts = getFinishingOptions(orderForm.material);
    const selectedFin = finishingOpts.find(o => o.label === orderForm.finishing) || finishingOpts[0] || { label: "Potong Pas", route: machine === "CANON" ? ["CANON","QC"] : ["GZ","QC"], note: "" };
    const finalRoute = selectedFin.route;
    const newJob: Job = {
      id: newId,
      customer: orderForm.customer.trim(),
      material: orderForm.material,
      size,
      qtyLabel,
      lengthM,
      route: finalRoute,
      routeIndex: 0,
      status: "antri",
      createdAt: new Date().toISOString(),
      createdBy: currentUser.label,
      note: orderForm.note.trim() || undefined,
      priority: orderForm.priority,
      finishingType: selectedFin.label,
      finishingNote: selectedFin.label + (selectedFin.note ? ` • ${selectedFin.note}` : ""),
      plannedRoute: finalRoute,
    };
    setJobs((prev) => [newJob, ...prev]);
    await dbInsert(newJob);
    setToast(`✅ Order baru #${newId} ${newJob.customer} → ${machine} [${orderForm.priority.toUpperCase()}]`);
    setOrderModal(false);
    setOrderForm({ customer: "", material: "F280", type: "meter", p: "", l: "", qty: "", sizeLabel: "A3", note: "", priority: "reguler", finishing: "" });
  };

  const saveSupabaseSettings = () => {
    // V3.9.6 URL FIX: normalize URL - remove /rest/v1/, trailing slash, spaces
    const urlInfo = normalizeSupabaseUrl(supaUrlInput);
    const normalizedUrl = urlInfo.normalized;
    const normalizedKey = normalizeSupabaseKey(supaKeyInput);
    if (!normalizedUrl || !normalizedKey) {
      setToast("⚠️ URL & Anon Key wajib diisi");
      return;
    }
    if (urlInfo.hadSuffix) {
      setToast(`🔧 ${urlInfo.hint} - auto-fix applied`);
    }
    try {
      window.localStorage.setItem(LS_SUPA_URL, normalizedUrl);
      window.localStorage.setItem(LS_SUPA_KEY, normalizedKey);
      // update inputs to normalized values immediately
      setSupaUrlInput(normalizedUrl);
      setSupaKeyInput(normalizedKey);
      setToast(`✅ Supabase saved → ${maskUrl(normalizedUrl)} - connecting...`);
      setSettingsOpen(false);
      // re-init will happen via useEffect dependency on settingsOpen
      // force reload client by triggering effect
      setSupabaseClient(null);
      setSupabaseStatus("loading");
      // small delay then re-read
      setTimeout(() => {
        if (supabaseLib) {
          try {
            const client = supabaseLib.createClient(normalizedUrl, normalizedKey);
            setSupabaseClient(client);
          } catch {}
        }
      }, 200);
    } catch {}
  };
  const clearSupabaseSettings = () => {
    try {
      window.localStorage.removeItem(LS_SUPA_URL);
      window.localStorage.removeItem(LS_SUPA_KEY);
    } catch {}
    setSupaUrlInput("");
    setSupaKeyInput("");
    setSupabaseClient(null);
    setSupabaseStatus("disconnected");
    setSettingsOpen(false);
    setToast("⚪ Supabase disconnected - LocalStorage mode");
  };

  const renderJobCard = (job: Job) => {
    const currentStepLabel = job.route[job.routeIndex] ?? "SELESAI";
    const isQCRoute = job.route.includes("QC");
    const totalSteps = job.route.filter(r=>r!=="QC").length || 1;
    const progress = job.status === "siap" || job.status === "selesai" ? 100 : Math.round(((job.routeIndex + (job.status === "cetak" ? 0.5 : 0)) / Math.max(1, totalSteps)) * 100);
    const isAntri = job.status === "antri";
    const isCetak = job.status === "cetak";
    const isGagal = job.status === "gagal";
    const isSiap = job.status === "siap";
    const isDone = job.status === "selesai";
    const assignedOpUser = USERS.find((u) => u.id === job.assignedOperator) || null;
    const csLabel = job.createdBy || job.startedBy || "-";
    const operatorDisplay = assignedOpUser ? assignedOpUser.label : null;
    const showAssignUI = isAntri && canAssign && currentUser?.id === "indra";
    const failCount = job.failures?.length || 0;
    const isLocked = !!(job.assignedOperator && currentUser && job.assignedOperator !== currentUser.id && currentUser.id !== INDRA_ONLY_ID);
    const lockedToName = USERS.find(u=>u.id===job.assignedOperator)?.label || job.assignedOperator;
    // V3.9.5 FINAL ROLES UI flags
    const userCanStart = currentUser ? canStartPrintId(currentUser.id) : false;
    const userCanNext = currentUser ? canNextId(currentUser.id, job) : false;
    const userCanFail = currentUser ? canFailId(currentUser.id, job) : false;
    const userCanSerahkan = currentUser ? canSerahkanId(currentUser.id) : false;
    const userIsCSOnly = currentUser ? (CS_ONLY_IDS as readonly string[]).includes(currentUser.id) : false;

    const priority = job.priority || "reguler";
    const priorityBadge = priority === "express" ? <div className="mono text-[9px] px-2 py-1 rounded-full bg-red-500 text-white font-bold animate-pulse">⚡ EXPRESS</div> : priority === "member" ? <div className="mono text-[9px] px-2 py-1 rounded-full bg-blue-500 text-white font-bold">MEMBER</div> : <div className="mono text-[9px] px-2 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">REGULER</div>;

    return (
      <div key={job.id} className={`group relative rounded-[16px] border bg-zinc-900 border-zinc-800 p-3.5 flex flex-col gap-3 ${isDone ? "opacity-[0.85]" : ""} ${isCetak ? "ring-1 ring-lime-400/20 border-lime-400/20" : ""} ${isSiap ? "ring-1 ring-emerald-400/20 border-emerald-400/20" : ""} ${isGagal ? "ring-1 ring-red-500/20 border-red-500/20" : ""} ${priority==="express" && isAntri ? "ring-1 ring-red-500/30" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="mono text-[10px] font-bold tracking-[0.08em] px-2 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">#{job.id}</div>
              {priorityBadge}
              {isAntri && <div className="mono text-[9px] px-2 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">ANTRI</div>}
              {isCetak && <div className="mono text-[9px] px-2 py-1 rounded-full bg-lime-400 text-black font-black">CETAK</div>}
              {isGagal && <div className="mono text-[9px] px-2 py-1 rounded-full bg-red-500 text-white font-bold">GAGAL • {failCount}</div>}
              {isSiap && <div className="mono text-[9px] px-2 py-1 rounded-full bg-emerald-400 text-black font-bold">SIAP</div>}
              {isDone && <div className="mono text-[9px] px-2 py-1 rounded-full bg-zinc-700 text-zinc-300">SELESAI</div>}
              {failCount > 0 && !isGagal && <div className="mono text-[8px] px-1.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/20 text-amber-300">⚠ {failCount}</div>}
            </div>
            <div className="mt-2.5 font-bold text-[14px] leading-[1.15] tracking-[-0.01em] line-clamp-2">{job.customer}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <div className="mono text-[10px] px-2 py-1 rounded-full bg-[#0a0a0b] border border-zinc-800 text-zinc-400">{job.material}</div>
              <div className="mono text-[10px] px-2 py-1 rounded-full bg-[#0a0a0b] border border-zinc-800 text-zinc-400">{job.size}</div>
              <div className="mono text-[10px] text-zinc-500">{job.qtyLabel}</div>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="mono text-[11px] font-bold text-zinc-200">{job.lengthM}m</div>
            <div className="mono text-[9px] text-zinc-500 mt-1">{formatTime(job.createdAt)}</div>
            {failCount > 0 && <button onClick={() => setDetailJobId(job.id)} className="mt-1 mono text-[8px] px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/20 text-amber-300 hover:bg-amber-400/25">DETAIL GAGAL</button>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {job.route.filter(r=>r!=="QC").map((r, idx) => {
            const realIdx = job.route.indexOf(r);
            const isPast = realIdx < job.routeIndex;
            const isCurr = realIdx === job.routeIndex && job.status !== "siap" && job.status !== "selesai";
            return (
              <div key={r + idx} className="flex items-center gap-1">
                <div className={`mono text-[9px] px-2 py-1 rounded-full border font-bold tracking-wide ${isPast ? "bg-zinc-800 border-zinc-700 text-zinc-500 line-through" : isCurr ? "bg-lime-400 text-black border-lime-400" : "bg-[#0a0a0b] border-zinc-800 text-zinc-500"}`}>{r}</div>
                {idx < job.route.filter(x=>x!=="QC").length - 1 && <div className="text-[10px] text-zinc-700">›</div>}
              </div>
            );
          })}
          {(isSiap || isDone || isQCRoute) && <div className="mono text-[9px] px-2 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-300">→ QC</div>}
        </div>
        {job.finishingNote && (
          <div className="mono text-[10px] bg-[#0a0a0b] border border-zinc-800 rounded-[10px] px-2.5 py-2 text-zinc-400">
            <span className="text-zinc-500">Finishing:</span> <span className="text-zinc-200 font-bold">{job.finishingNote}</span>
          </div>
        )}
        {isLocked && (
          <div className="mono text-[10px] bg-red-950/30 border border-red-900/40 rounded-[12px] px-3 py-2 text-red-300 font-bold">
            🔒 Assigned ke {lockedToName} - hanya {lockedToName} & Indra bisa proses
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 mono text-[10px] bg-[#0a0a0b] border border-zinc-800 rounded-[12px] px-2.5 py-2">
            <span className="text-zinc-500">👤 CS:</span><span className="text-zinc-200 font-bold">{csLabel}</span><span className="text-zinc-700">•</span><span className="text-zinc-500">⚙️ Op:</span>
            {operatorDisplay ? <span className="text-lime-300 font-bold flex items-center gap-1.5">{operatorDisplay}{job.assignedBy && <span className="text-[9px] text-zinc-500 font-normal">by {job.assignedBy}</span>}</span> : <span className="text-zinc-500">- Belum assign</span>}
          </div>
          {isAntri && assignedOpUser && !isLocked && <div className="mono text-[10px] text-zinc-400 px-1">Operator: <span className="text-zinc-200 font-bold">{assignedOpUser.label}</span> {job.assignedBy ? <span className="text-zinc-500">(oleh {job.assignedBy})</span> : null}</div>}
          {isAntri && !assignedOpUser && !isLocked && (
            <div className="mono text-[10px] text-zinc-500 px-1">
              {userIsCSOnly ? "Menunggu Indra assign → Operator mulai cetak" : (currentUser?.id !== "indra" ? "Belum di-assign • tunggu Indra assign / MULAI auto-assign ke kamu" : "Belum di-assign • assign dulu")}
            </div>
          )}
        </div>
        {failCount > 0 && (
          <div className="bg-amber-950/20 border border-amber-900/30 rounded-[12px] p-2.5">
            <div className="mono text-[9px] font-bold tracking-[0.1em] text-amber-300">HISTORY GAGAL • {failCount}</div>
            <div className="mt-1.5 space-y-1">
              {job.failures!.slice(-2).map((f, i) => (
                <div key={i} className="mono text-[10px] text-amber-200/80 leading-[1.3]">• {f.machine} {f.failKind}: {f.type === "lembar" ? `${f.qtyLembar} lbr` : `${f.qtyP}x${f.qtyL}m (${f.qtyTotalM?.toFixed(2)}m²)`} - {f.reason}</div>
              ))}
              {failCount > 2 && <div className="mono text-[9px] text-amber-300/60">+{failCount - 2} lagi • klik DETAIL GAGAL</div>}
            </div>
          </div>
        )}
        {job.failureSummary && isDone && <div className="mono text-[10px] bg-amber-950/20 border border-amber-900/20 rounded-[12px] px-3 py-2 text-amber-200">⚠️ {job.failureSummary}</div>}
        {job.deliveryNotes && isDone && <div className="text-[11px] bg-[#0a0a0b] border border-zinc-800 rounded-[12px] px-3 py-2 text-zinc-300">📦 {job.deliveryNotes}</div>}
        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${isGagal ? "bg-red-500" : isSiap ? "bg-emerald-400" : isDone ? "bg-zinc-600" : "bg-lime-400"}`} style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <div className="mono text-[10px] text-zinc-500">
            {isAntri && <>Menunggu • {currentStepLabel}</>}
            {isCetak && <>Dicetak oleh <span className="text-zinc-300 font-bold">{operatorDisplay || job.startedBy || "-"}</span> • {formatTime(job.startedAt)}</>}
            {isGagal && <span className="text-red-300">Gagal cetak • {job.failures?.[job.failures.length - 1]?.reason || "perlu cek"}</span>}
            {isSiap && <>Siap diserahkan • {job.startedBy ? `dari ${job.startedBy}` : ""}</>}
            {isDone && <>Diserahkan {formatDateTime(job.deliveredAt)} oleh <span className="text-zinc-200">{job.deliveredBy}</span></>}
          </div>
          {!isDone && <div className="mono text-[10px] text-zinc-600">{progress}%</div>}
        </div>
        {job.note && !isDone && <div className="text-[11px] text-zinc-400 bg-[#0a0a0b] border border-zinc-800 rounded-[12px] px-3 py-2 leading-[1.35]">📝 {job.note}</div>}
        <div className="pt-1 flex flex-col gap-2">
          {showAssignUI && (
            <div className="flex items-center gap-2 bg-[#0a0a0b] border border-lime-400/20 rounded-[14px] px-2.5 py-2">
              <div className="mono text-[9px] font-black tracking-[0.1em] text-lime-300 whitespace-nowrap">INDRA ASSIGN →</div>
              <select value={job.assignedOperator || ""} onChange={(e) => handleAssign(job.id, e.target.value)} className="flex-1 bg-zinc-900 border border-zinc-800 rounded-[10px] px-2.5 py-2 text-[11px] text-zinc-200 outline-none focus:border-lime-400/40 cursor-pointer" style={{ minHeight: "36px" }}>
                <option value="">- Pilih Operator -</option>
                {assignableOperators.map((op) => (
                  <option key={op.id} value={op.id}>{op.label} • {op.role}</option>
                ))}
              </select>
            </div>
          )}
          {isAntri && !showAssignUI && !isLocked && (
            <div className={`mono text-[9px] border rounded-[12px] px-3 py-2 text-center ${assignedOpUser ? "bg-[#0a0a0b] border-zinc-800 text-zinc-400" : "bg-[#0a0a0b] border-zinc-800 text-zinc-500"}`}>
              {assignedOpUser ? <>Operator: <span className="font-bold text-zinc-300">{assignedOpUser.label}</span> • di-assign oleh Indra • tunggu mulai</> : <>{userIsCSOnly ? "Menunggu Indra assign → Operator mulai cetak" : (currentUser?.id === "indra" ? "Indra belum assign" : "Belum di-assign • tunggu Indra assign / MULAI auto-assign ke kamu")}</>}
            </div>
          )}
          {/* V3.9.5 FINAL ROLES - ANTRI */}
          {isAntri && isLocked && <button disabled className="w-full bg-zinc-800 border border-zinc-700 text-zinc-500 font-bold text-[11px] py-3 rounded-[14px] cursor-not-allowed" style={{ minHeight: "44px" }}>🔒 LOCKED • {lockedToName}</button>}
          {isAntri && !isLocked && userCanStart && <button onClick={() => handleMulaiClick(job)} className="w-full bg-zinc-100 hover:bg-white text-black font-black tracking-[0.02em] text-[12px] py-3 rounded-[14px] active:scale-[0.98] transition-transform" style={{ minHeight: "44px", touchAction: "manipulation", cursor: "pointer" }}>▶ MULAI CETAK</button>}
          {isAntri && !isLocked && !userCanStart && <button disabled title="Hanya Operator & Indra yang bisa MULAI CETAK" className="w-full bg-zinc-800 border border-zinc-700 text-zinc-500 font-bold text-[11px] py-3 rounded-[14px] cursor-not-allowed opacity-60" style={{ minHeight: "44px" }}>🔒 Hanya Operator & Indra</button>}
          {/* CETAK */}
          {isCetak && isLocked && <button disabled className="w-full bg-zinc-800 border border-zinc-700 text-zinc-500 font-bold text-[11px] py-3 rounded-[14px]">🔒 LOCKED • {lockedToName}</button>}
          {isCetak && !isLocked && userCanNext && (
            <div className="grid grid-cols-[1fr_88px] gap-2">
              <button onClick={() => handleNext(job.id)} className="bg-lime-400 hover:bg-lime-300 text-black font-black text-[12px] py-3 rounded-[14px] active:scale-[0.98] transition-transform" style={{ minHeight: "44px", touchAction: "manipulation", cursor: "pointer" }}>SELESAI NEXT →</button>
              <button onClick={() => openGagalPopup(job)} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 font-bold text-[11px] py-3 rounded-[14px] active:scale-[0.98] transition-transform" style={{ minHeight: "44px", touchAction: "manipulation" }}>GAGAL</button>
            </div>
          )}
          {isCetak && !isLocked && !userCanNext && <button disabled className="w-full bg-zinc-800 border border-zinc-700 text-zinc-500 font-bold text-[11px] py-3 rounded-[14px] opacity-60">🔒 Hanya Operator & Indra</button>}
          {/* GAGAL */}
          {isGagal && isLocked && <button disabled className="w-full bg-zinc-800 border border-zinc-700 text-zinc-500 font-bold text-[11px] py-3 rounded-[14px]">🔒 LOCKED • {lockedToName}</button>}
          {isGagal && !isLocked && userCanNext && <button onClick={() => handleRetry(job.id)} className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-bold text-[12px] py-3 rounded-[14px] active:scale-[0.98]" style={{ minHeight: "44px", touchAction: "manipulation" }}>↻ COBA LAGI → ANTRI</button>}
          {isGagal && !isLocked && !userCanNext && <button disabled className="w-full bg-zinc-800 border border-zinc-700 text-zinc-500 font-bold text-[11px] py-3 rounded-[14px] opacity-60">🔒 Hanya Operator & Indra</button>}
          {/* SIAP / QC */}
          {isSiap && userCanSerahkan && <button onClick={() => handleSerahkanAttempt(job.id)} className="w-full bg-lime-400 hover:bg-lime-300 text-black font-black tracking-[0.02em] text-[13px] py-3 rounded-[14px] shadow-[0_8px_24px_rgba(163,230,53,0.25)] active:scale-95 transition-all select-none" style={{ pointerEvents: "auto", touchAction: "manipulation", minHeight: "48px", cursor: "pointer", WebkitTapHighlightColor: "transparent", zIndex: 10, position: "relative" }}>📦 SERAHKAN CUSTOMER</button>}
          {isSiap && !userCanSerahkan && <button disabled className="w-full bg-zinc-800 border border-zinc-700 text-zinc-500 font-bold text-[11px] py-3 rounded-[14px] opacity-60" style={{ minHeight: "48px" }}>🔒 Hanya CS & Indra & Tira • Operator tidak bisa serahkan</button>}
          {isDone && (
            <div className="flex gap-2">
              <div className="flex-1 mono text-[10px] bg-[#0a0a0b] border border-zinc-800 rounded-[12px] px-3 py-2 text-zinc-400">✅ {formatDateTime(job.deliveredAt)} • {job.deliveredBy}</div>
              <button onClick={() => handleClearSelesai(job.id)} className={`mono text-[10px] border px-3 py-2 rounded-[12px] ${isOwner ? "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-400" : "bg-zinc-900 border-zinc-800 text-zinc-600 opacity-50"}`} disabled={!isOwner}>HAPUS</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!currentUser) {
    const selectedUser = USERS.find((u) => u.id === selectedLoginId);
    return (
      <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 flex flex-col antialiased selection:bg-lime-400 selection:text-black">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;700;800&family=Geist+Mono:wght@400;600&display=swap');
          *{font-family:'Geist',system-ui,sans-serif}
          .mono{font-family:'Geist Mono',monospace}
          ::-webkit-scrollbar{height:8px;width:8px}
          ::-webkit-scrollbar-thumb{background:#27272a;border-radius:999px}
          ::-webkit-scrollbar-track{background:#0a0a0b}
          /* V3.9.17 BOARD SCROLLBAR VISIBLE */
          .custom-board-scroll{
            scrollbar-width:auto;
            scrollbar-color:#a3e635 #18181b;
            scrollbar-gutter:stable;
          }
          .custom-board-scroll::-webkit-scrollbar{
            height:14px !important;
            width:14px !important;
            display:block !important;
          }
          .custom-board-scroll::-webkit-scrollbar-thumb{
            background:#a3e635 !important;
            border-radius:999px;
            border:2px solid #18181b;
            min-width:60px;
          }
          .custom-board-scroll::-webkit-scrollbar-thumb:hover{
            background:#bef264 !important;
          }
          .custom-board-scroll::-webkit-scrollbar-track{
            background:#18181b !important;
            border-radius:999px;
            border:1px solid #27272a;
          }
          .custom-col-scroll{
            scrollbar-width:thin;
            scrollbar-color:#27272a transparent;
          }
          .custom-col-scroll::-webkit-scrollbar{
            width:8px;
            height:8px;
            display:block !important;
          }
          .custom-col-scroll::-webkit-scrollbar-thumb{
            background:#27272a;
            border-radius:999px;
            border:1px solid #0a0a0b;
          }
        `}</style>
        <div className="flex-1 flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-[1080px]">
            <div className="mb-6 flex items-center gap-3">
              <div className="h-10 w-10 rounded-[12px] bg-lime-400 flex items-center justify-center text-black font-black text-[16px]">A</div>
              <div>
                <div className="font-black tracking-[-0.02em] text-[18px] leading-none">ANTRI CETAK V3.9.6 - URL FIX V36 EXACT</div>
                <div className="mono text-[10px] tracking-[0.14em] text-zinc-500 mt-1">V36 ORIGINAL • MINIMAL CARDS • FINISHING AT START • FINAL ROLES • SUPABASE jsDelivr • URL NORMALIZER</div>
              </div>
            </div>
            <div className="grid md:grid-cols-[0.9fr_1.1fr] gap-4 items-start">
              <div className="bg-zinc-900 border border-zinc-800 rounded-[24px] p-5 md:p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-bold text-[13px] tracking-[0.08em]">PILIH USER</h2>
                  <div className="mono text-[9px] text-zinc-500">7 users • minimal V36</div>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {USERS.map((u) => {
                    const active = selectedLoginId === u.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => { setSelectedLoginId(u.id); setLoginError(""); }}
                        className={`group flex items-center gap-4 rounded-[16px] border px-4 py-3 text-left transition-all h-[72px] ${active ? "bg-lime-400/10 border-lime-400/50 ring-1 ring-lime-400/20" : "bg-[#0a0a0b] border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80"}`}
                      >
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center font-black text-[14px] shrink-0 transition-colors ${active ? "bg-lime-400 text-black" : "bg-zinc-800 text-zinc-200 group-hover:bg-zinc-700"}`}>{u.initials}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[14px] leading-none tracking-[-0.01em] text-zinc-100">{u.label}</div>
                        </div>
                        {active && <div className="h-2 w-2 rounded-full bg-lime-400 animate-pulse shrink-0 mr-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-[24px] p-5 md:p-6 flex flex-col gap-5">
                <div>
                  <div className="mono text-[11px] font-bold tracking-[0.16em] text-zinc-300">LOGIN</div>
                  <div className="mt-2 font-bold text-[15px] leading-tight">Masuk sebagai <span className="text-lime-400">{selectedUser?.label || "— pilih user"}</span></div>
                  <div className="mt-2 mono text-[11px] text-zinc-500 leading-[1.4]">Password alfanumerik, max 20 char. Contoh: indra123</div>
                </div>
                <div>
                  <div className="mono text-[10px] tracking-[0.12em] text-zinc-500 mb-2">PASSWORD</div>
                  <input value={pinInput} onChange={(e) => { const v = e.target.value.slice(0, 20); setPinInput(v); setLoginError(""); }} onKeyDown={(e) => e.key === "Enter" && handleLogin()} placeholder="Password (contoh: indra123)" type="password" className="w-full bg-[#0a0a0b] border border-zinc-800 rounded-[14px] px-4 py-3.5 text-[14px] outline-none focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/20 placeholder:text-zinc-600" autoFocus />
                  {loginError && <div className="mt-3 text-[12px] bg-red-950/40 border border-red-900/50 text-red-300 rounded-[12px] px-3 py-2">{loginError}</div>}
                  <button onClick={handleLogin} className="mt-4 w-full bg-lime-400 text-black font-black tracking-wide text-[13px] py-3.5 rounded-[14px] active:scale-[0.98] transition-transform min-h-[48px]">MASUK → BOARD</button>
                </div>
                <div className="bg-[#0a0a0b] border border-zinc-800 rounded-[16px] p-4">
                  <div className="mono text-[10px] font-bold tracking-[0.14em] text-lime-400">ROLE ACCESS V3.9.6 FINAL - URL FIX</div>
                  <div className="mt-3 space-y-2.5 mono text-[11px] leading-[1.5] text-zinc-400">
                    <div><span className="font-bold text-zinc-200">OWNER Indra</span> - All Access • +BARU, ASSIGN (only), MULAI CETAK, NEXT, GAGAL, SERAHKAN</div>
                    <div><span className="font-bold text-zinc-200">CS Uzi,Rizka,Susan</span> - ONLY +BARU & SERAHKAN ke customer • CANNOT ASSIGN, CANNOT MULAI, CANNOT NEXT, CANNOT GAGAL</div>
                    <div><span className="font-bold text-zinc-200">OPERATOR Riki,Adi</span> - ONLY MULAI CETAK di tiap bagian, NEXT, GAGAL • CANNOT +BARU, CANNOT ASSIGN, CANNOT SERAHKAN</div>
                    <div><span className="font-bold text-zinc-200">CS+OP Tira</span> - +BARU, MULAI CETAK, SERAHKAN • CANNOT ASSIGN</div>
                  </div>
                  <div className="mt-4 mono text-[9px] text-zinc-500 border-t border-zinc-800 pt-3 leading-[1.4]">
                    🔒 V3.9.6 URL FIX: https://xxx.supabase.co/rest/v1/ → auto jadi https://xxx.supabase.co • Final Roles: CS tidak bisa MULAI, Operator tidak bisa SERAHKAN, hanya IN bisa ASSIGN
                  </div>
                </div>
                <div className="bg-[#0a0a0b] border border-zinc-800 rounded-[16px] p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${supabaseStatus==="connected" ? "bg-emerald-400 animate-pulse" : supabaseStatus==="loading" ? "bg-amber-400 animate-pulse" : "bg-red-500"}`} />
                    <div className="mono text-[10px] text-zinc-400">{supabaseStatus==="connected" ? "Supabase Connected" : supabaseStatus==="loading" ? "Connecting Supabase..." : supabaseStatus==="error" ? "Supabase Error - LocalStorage fallback" : "LocalStorage - set Supabase URL"}</div>
                  </div>
                  <button onClick={()=>setSettingsOpen(true)} className="mono text-[10px] bg-zinc-800 border border-zinc-700 px-2.5 py-1 rounded-full text-zinc-300 hover:bg-zinc-700">⚙️ SETTINGS</button>
                </div>
                <div className="mono text-[10px] text-zinc-600 text-center leading-[1.4]">
                  V3.9.6 URL FIX V36 EXACT • INDRA ALL ACCESS • CS +BARU & SERAHKAN ONLY • OPERATOR MULAI ONLY • TIRA +BARU+MULAI+SERAHKAN • FIX URL /rest/v1/
                </div>
              </div>
            </div>
          </div>
        </div>
        {settingsOpen && (
          <div className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-3">
            <div className="w-full max-w-[480px] bg-zinc-900 border border-zinc-800 rounded-[24px] p-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="font-black text-[14px]">⚙️ Supabase Settings • V3.9.6 URL FIX</div>
                <button onClick={()=>setSettingsOpen(false)} className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">✕</button>
              </div>
              <div className="mono text-[10px] text-zinc-500 mt-2 leading-[1.4]">V3.9.6 URL FIX: Paste https://xxx.supabase.co/rest/v1/ otomatis jadi https://xxx.supabase.co. Jangan pakai /rest/v1/. CDN jsDelivr. Table <span className="text-zinc-300 font-bold">jobs</span>. {supabaseErrorDetail ? `Error: ${supabaseErrorDetail.slice(0,120)}` : ""}</div>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mono text-[10px] tracking-[0.12em] text-zinc-500">SUPABASE URL</label>
                  <input value={supaUrlInput} onChange={(e)=>setSupaUrlInput(e.target.value)} placeholder="https://xxxx.supabase.co" className="mt-2 w-full bg-[#0a0a0b] border border-zinc-800 rounded-[14px] px-4 py-3 text-[13px] outline-none focus:border-lime-400/50 placeholder:text-zinc-600" />
                  {supaUrlInput && (
                    <div className="mt-2 mono text-[10px] space-y-1">
                      <div className="flex items-center gap-2 bg-[#0a0a0b] border border-zinc-800 rounded-[10px] px-3 py-2">
                        <span className="text-zinc-500">Normalized:</span>
                        <span className="text-lime-300 font-bold break-all">{supaUrlNormalizedPreview.normalized || "-"}</span>
                      </div>
                      {supaUrlHasRestHint && (
                        <div className="bg-amber-950/30 border border-amber-900/30 rounded-[10px] px-3 py-2 text-amber-300 font-bold">
                          ⚠️ {supaUrlNormalizedPreview.hint} - auto-fix saat SAVE
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="mono text-[10px] tracking-[0.12em] text-zinc-500">SUPABASE ANON KEY</label>
                  <textarea value={supaKeyInput} onChange={(e)=>setSupaKeyInput(e.target.value)} placeholder="eyJ..." rows={3} className="mt-2 w-full bg-[#0a0a0b] border border-zinc-800 rounded-[14px] px-4 py-3 text-[12px] outline-none focus:border-lime-400/50 placeholder:text-zinc-600 resize-none" />
                  {supaKeyInput && supaKeyInput !== normalizeSupabaseKey(supaKeyInput) && (
                    <div className="mt-2 mono text-[10px] bg-amber-950/20 border border-amber-900/20 rounded-[10px] px-3 py-2 text-amber-300">Key ada spasi/newline - akan di-trim otomatis</div>
                  )}
                </div>
                {testResult && (
                  <div className={`mono text-[10px] rounded-[12px] px-3 py-2 border ${testResult.ok ? "bg-emerald-950/30 border-emerald-900/30 text-emerald-300" : "bg-red-950/30 border-red-900/30 text-red-300"}`}>{testResult.ok ? "✅" : "❌"} {testResult.msg} • {formatTime(testResult.time)}</div>
                )}
                {supabaseErrorDetail && (
                  <div className="mono text-[9px] bg-red-950/20 border border-red-900/20 rounded-[12px] px-3 py-2 text-red-300">Error: {supabaseErrorDetail.slice(0,200)} {supabaseErrorMeta?.isRLS ? "→ Disable RLS or allow all policy" : ""} {supabaseErrorMeta?.isTableMissing ? "→ Create table jobs first" : ""}</div>
                )}
                <div className="grid grid-cols-[1.2fr_0.8fr] gap-2">
                  <button onClick={handleTestConnection} disabled={testLoading} className="mono text-[11px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-300 py-3 rounded-[14px] disabled:opacity-50">{testLoading ? "TESTING..." : "🔍 TEST CONNECTION"}</button>
                  <div className="mono text-[9px] text-zinc-500 flex items-center">Status: {supabaseStatus}</div>
                </div>
                <div className="grid grid-cols-[1fr_1fr] gap-2 pt-2">
                  <button onClick={clearSupabaseSettings} className="mono text-[11px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-400 py-3 rounded-[14px]">DISCONNECT</button>
                  <button onClick={saveSupabaseSettings} className="mono text-[11px] font-black bg-lime-400 text-black py-3 rounded-[14px]">SAVE & CONNECT</button>
                </div>
                <div className="mono text-[9px] text-zinc-600 bg-[#0a0a0b] border border-zinc-800 rounded-[12px] px-3 py-2">Contoh benar: https://tcojxpfyftbjnmvyqubl.supabase.co • Salah: https://tcojxpfyftbjnmvyqubl.supabase.co/rest/v1/ • Fix V3.9.6 auto-hapus /rest/v1/, /rest, /auth/v1, trailing slash</div>
              </div>
            </div>
          </div>
        )}
        {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 text-zinc-100 px-4 py-2.5 rounded-full text-[12px] shadow-2xl z-50 mono">{toast}</div>}
      </div>
    );
  }

  const detailJob = detailJobId ? jobs.find((j) => j.id === detailJobId) : null;
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 antialiased selection:bg-lime-400 selection:text-black" style={{ paddingTop: "var(--safe-area-inset-top,0px)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;700;800&family=Geist+Mono:wght@400;600&display=swap');
        *{font-family:'Geist',system-ui,sans-serif}
        .mono{font-family:'Geist Mono',monospace}
        ::-webkit-scrollbar{height:6px;width:6px}
        ::-webkit-scrollbar-thumb{background:#27272a;border-radius:999px}
        ::-webkit-scrollbar-track{background:#0a0a0b}
        .chip-scroll::-webkit-scrollbar{display:none}
        .chip-scroll{ -ms-overflow-style:none; scrollbar-width:none; }
      `}</style>
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-[#0a0a0b]/90 border-b border-zinc-900">
        <div className="max-w-[1920px] mx-auto px-3 md:px-5 h-[64px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-[12px] bg-lime-400 text-black font-black flex items-center justify-center">A</div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-black tracking-[-0.03em] text-[14px] md:text-[15px] leading-none whitespace-nowrap">ANTRI CETAK V3.9.17 SUPABASE-READY V36 EXACT</div>
                <div className="hidden md:inline-flex mono text-[9px] px-2 py-0.5 rounded-full bg-lime-400/15 text-lime-300 border border-lime-400/20">V36 ORIGINAL • MINIMAL • FINISHING AT START</div>
              </div>
              <div className="mono hidden md:block text-[10px] text-zinc-500 mt-1 tracking-[0.12em]">GZ C3200 • CANON • CUT-H • CUT-G • SEAM • LAM • QC • SELESAI</div>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-full px-2 py-1">
              <div className="mono text-[10px] px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300">ANTRI {stats.antri}</div>
              <div className="mono text-[10px] px-2.5 py-1 rounded-full bg-lime-400 text-black font-bold">CETAK {stats.cetak}</div>
              <div className="mono text-[10px] px-2.5 py-1 rounded-full bg-emerald-400 text-black font-bold">SIAP {stats.siap}</div>
              <div className="mono text-[10px] px-2.5 py-1 rounded-full bg-zinc-700 text-zinc-200">SELESAI {stats.selesai}</div>
            </div>
            <div className="mono text-[10px] bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1.5 text-zinc-400 flex items-center gap-2">
              <div className={`h-1.5 w-1.5 rounded-full ${isSupabaseConnected ? "bg-emerald-400" : "bg-red-500"}`} />
              <span>TOTAL {stats.totalM}m • EFF {stats.eff}%</span>
              {isLoadingJobs && <span className="text-[9px] text-zinc-500">• loading...</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canAddOrder && (
              <button onClick={() => setOrderModal(true)} className="h-9 px-4 bg-lime-400 hover:bg-lime-300 text-black font-black text-[12px] rounded-full tracking-wide active:scale-95 transition-transform flex items-center gap-1.5" style={{ minHeight: "36px", touchAction: "manipulation" }}>
                <span className="text-[16px] leading-none">+</span> BARU
              </button>
            )}
            <button onClick={()=>setSettingsOpen(true)} className="h-9 w-9 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200" style={{minHeight:"36px"}} title="Supabase Settings">⚙️</button>
            <div className="hidden sm:flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full pl-2 pr-2 py-1">
              <div className={`h-7 w-7 rounded-full font-black text-[11px] flex items-center justify-center ${currentUser.id === "indra" ? "bg-lime-400 text-black ring-2 ring-lime-400/30" : "bg-zinc-700 text-zinc-200"}`}>{currentUser.initials}</div>
              <div className="pr-1">
                <div className="text-[11px] font-bold leading-none flex items-center gap-1">{currentUser.label}{currentUser.id === "indra" && <span className="mono text-[8px] px-1 py-0 rounded bg-lime-400 text-black font-black">OWNER</span>}</div>
                <div className="mono text-[9px] text-zinc-500 leading-none mt-1">V3.9.17 • {currentUser.id === "indra" ? "ASSIGN" : currentUser.role}</div>
              </div>
            </div>
            <button onClick={handleLogout} className="mono text-[10px] bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-3 py-2 rounded-full text-zinc-400 min-h-[36px]">KELUAR</button>
          </div>
        </div>
        <div className="lg:hidden px-3 pb-3 flex gap-2 overflow-x-auto items-center">
          <div className="mono text-[10px] px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 whitespace-nowrap">ANTRI {stats.antri}</div>
          <div className="mono text-[10px] px-2.5 py-1 rounded-full bg-lime-400 text-black font-bold whitespace-nowrap">CETAK {stats.cetak}</div>
          <div className="mono text-[10px] px-2.5 py-1 rounded-full bg-emerald-400 text-black font-bold whitespace-nowrap">SIAP {stats.siap}</div>
          <div className="mono text-[10px] px-2.5 py-1 rounded-full bg-zinc-700 text-zinc-200 whitespace-nowrap">SELESAI {stats.selesai}</div>
          {canAddOrder && (
            <button onClick={() => setOrderModal(true)} className="ml-auto mono text-[10px] px-3 py-1.5 rounded-full bg-lime-400 text-black font-black whitespace-nowrap h-7">+ BARU</button>
          )}
        </div>
        {currentUser.id === "indra" && (
          <div className="px-3 md:px-5 pb-3">
            <div className="bg-zinc-900/80 border border-lime-400/20 rounded-[16px] px-3 py-2.5 flex flex-wrap items-center gap-2">
              <div className="mono text-[10px] font-black tracking-[0.12em] text-lime-300 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-lime-400 animate-pulse" />OPERATOR LOAD</div>
              <div className="h-4 w-px bg-zinc-800 hidden sm:block" />
              <div className="flex flex-wrap gap-1.5">
                {operatorLoads.map((op) => (
                  <div key={op.id} className={`mono text-[10px] px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${op.total===0 ? "bg-zinc-800 border-zinc-700 text-zinc-500" : "bg-zinc-800 border-zinc-700 text-zinc-300"}`}>
                    <span className={`h-5 w-5 rounded-full flex items-center justify-center font-black text-[9px] ${op.total===0 ? "bg-zinc-700 text-zinc-400" : "bg-lime-400 text-black"}`}>{op.initials}</span>
                    <span className="font-bold">{op.label}</span>
                    <span className="opacity-60">:</span>
                    <span className="font-bold">{op.total} jobs</span>
                    <span className="hidden md:inline text-[9px] opacity-60">({op.meters}m)</span>
                  </div>
                ))}
              </div>
              <div className="ml-auto hidden lg:flex items-center gap-2 mono text-[9px] text-zinc-500"><span>🔒 Hanya Indra bisa assign • V3.9.17 finishing di AWAL • {isSupabaseConnected ? "Supabase Connected" : "LocalStorage"}</span></div>
            </div>
          </div>
        )}
      </header>
      <main className="max-w-[1920px] mx-auto p-3 md:p-4">
        <div className="flex gap-3 overflow-x-auto overflow-y-hidden pb-6 snap-x snap-mandatory custom-board-scroll">
          {COLUMNS.map((col) => {
            const baseJobsRaw = getJobsForColumn(col.id);
            const isQC = col.id === "QC";
            const isSelesai = col.id === "SELESAI";
            const isGZ = col.id === "GZ";
            const isCANON = col.id === "CANON";
            const isAntriCol = isGZ || isCANON;

            let gzCounts: Record<string, number> = {};
            let canonCounts: Record<string, number> = {};
            let filteredJobs = baseJobsRaw;
            if (isGZ) {
              gzCounts = { ALL: baseJobsRaw.length };
              GZ_MATERIALS.forEach((m) => {
                gzCounts[m.id] = baseJobsRaw.filter((j) => materialMatches(j.material, m.id)).length;
              });
              if (gzFilter) {
                filteredJobs = baseJobsRaw.filter((j) => materialMatches(j.material, gzFilter));
              }
            }
            if (isCANON) {
              canonCounts = { ALL: baseJobsRaw.length };
              CANON_MATERIALS.forEach((m) => {
                canonCounts[m.id] = baseJobsRaw.filter((j) => materialMatches(j.material, m.id)).length;
              });
              if (canonFilter) {
                filteredJobs = baseJobsRaw.filter((j) => materialMatches(j.material, canonFilter));
              }
            }

            if (isAntriCol) {
              filteredJobs = [...filteredJobs].sort((a, b) => {
                const wa = priorityWeight(a.priority);
                const wb = priorityWeight(b.priority);
                if (wa !== wb) return wa - wb;
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              });
            } else {
              filteredJobs = [...filteredJobs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            }

            return (
              <div key={col.id} className={`snap-start shrink-0 w-[304px] md:w-[320px] rounded-[24px] border bg-zinc-900/60 backdrop-blur flex flex-col ${isQC ? "border-emerald-900/30" : isSelesai ? "border-zinc-800" : "border-zinc-800"}`}>
                <div className="p-4 pb-3 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-2 w-2 rounded-full ${col.dot} ${col.id === "GZ" || col.id === "CANON" ? "animate-pulse" : ""}`} />
                      <div>
                        <div className="font-black text-[13px] tracking-[-0.01em] leading-none">{col.label}</div>
                        <div className="mono text-[10px] text-zinc-500 tracking-[0.12em] mt-1">{col.sub} • {baseJobsRaw.length}</div>
                      </div>
                    </div>
                    {isSelesai && baseJobsRaw.length > 0 && isOwner && (
                      <button onClick={handleClearAllSelesai} className="mono text-[9px] bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-2.5 py-1 rounded-full text-zinc-400 min-h-[28px]">BERSIHKAN</button>
                    )}
                  </div>
                                    {isGZ && (
                    <div className="flex items-center gap-2 pb-1">
                      <select value={gzFilter || "ALL"} onChange={(e) => setGzFilter(e.target.value === "ALL" ? null : e.target.value)} className="w-full bg-[#0a0a0b] border border-zinc-800 rounded-[12px] px-3 py-2.5 text-[11px] font-bold outline-none focus:border-lime-400/50 text-zinc-200">
                        <option value="ALL">ALL ({gzCounts.ALL || 0}) - Semua Bahan</option>
                        {GZ_MATERIALS.map((m) => {
                          const cnt = gzCounts[m.id] || 0;
                          return <option key={m.id} value={m.id}>{m.short} ({cnt}){cnt>0 ? ` • ${cnt} antri` : ""}</option>;
                        })}
                      </select>
                      {gzFilter && <button onClick={() => setGzFilter(null)} className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 text-[10px]">✕</button>}
                    </div>
                  )}
                                    {isCANON && (
                    <div className="flex items-center gap-2 pb-1">
                      <select value={canonFilter || "ALL"} onChange={(e) => setCanonFilter(e.target.value === "ALL" ? null : e.target.value)} className="w-full bg-[#0a0a0b] border border-zinc-800 rounded-[12px] px-3 py-2.5 text-[11px] font-bold outline-none focus:border-lime-400/50 text-zinc-200">
                        <option value="ALL">ALL ({canonCounts.ALL || 0}) - Semua Bahan</option>
                        {CANON_MATERIALS.map((m) => {
                          const cnt = canonCounts[m.id] || 0;
                          return <option key={m.id} value={m.id}>{m.short} ({cnt})</option>;
                        })}
                      </select>
                      {canonFilter && <button onClick={() => setCanonFilter(null)} className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 text-[10px]">✕</button>}
                    </div>
                  )}
                </div>
                <div className="px-2.5 pb-2.5 flex-1 flex flex-col gap-2.5 min-h-[520px] max-h-[calc(100vh-220px)] overflow-y-auto overflow-x-hidden custom-col-scroll pr-1">
                  {filteredJobs.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center rounded-[16px] border border-dashed border-zinc-800 bg-[#0a0a0b]/50 p-6 text-center">
                      <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center mono text-[12px] text-zinc-500">∅</div>
                      <div className="mono text-[10px] text-zinc-500 mt-3 tracking-wide">TIDAK ADA ANTRIAN</div>
                      <div className="text-[11px] text-zinc-600 mt-1">{isGZ || isCANON ? "Filter bahan di atas atau tunggu order baru" : "Job akan muncul otomatis sesuai route"}</div>
                    </div>
                  )}
                  {filteredJobs.map((job) => renderJobCard(job))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex flex-col gap-2">
          <div className="mono text-[10px] text-zinc-600 flex flex-wrap gap-3">
            <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${isSupabaseConnected ? "bg-emerald-400" : "bg-red-500"}`} />{isSupabaseConnected ? "Supabase Connected" : "LocalStorage - set Supabase URL"}</span>
            <span>✔ V3.9.17 SUPABASE-READY V36 EXACT • GZ [ALL|F280|F340|F440|F500|RITRAMA|BLUISH|ONEWAY|ALBATROS|DURATRANS|BACKLIT] • CANON [ALL|AP260|IVORY|VINYL|TRANSPARAN]</span>
            <span>• FINISHING AT START: Pilih finishing saat MULAI CETAK • PRIORITY: EXPRESS/MEMBER/REGULER sort ANTRI • ASSIGN LOCK: hanya assigned & Indra bisa proses</span>
          </div>
          <div className="mono text-[9px] text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-[12px] px-3 py-2">
            Supabase SQL untuk setup: <span className="text-zinc-300">create table jobs (id text primary key, customer text, material text, size text, qty_label text, length_m float8, route text[], route_index int4, status text, created_at timestamptz, created_by text, assigned_operator text, assigned_by text, assigned_at timestamptz, started_at timestamptz, started_by text, delivered_at timestamptz, delivered_by text, note text, failures jsonb, delivery_notes text, failure_summary text, priority text, finishing_note text, finishing_type text, planned_route text[], route_decisions jsonb); alter table jobs enable row level security; create policy "allow all" on jobs for all using (true) with check (true);</span> + enable Realtime for jobs.
          </div>
        </div>
      </main>

      {startFinishingModal && (() => {
        const opts = getFinishingOptions(startFinishingModal.material);
        const cls = classifyMaterial(startFinishingModal.material);
        return (
          <div className="fixed inset-0 z-[85] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-3">
            <div className="w-full max-w-[520px] bg-zinc-900 border border-zinc-800 rounded-[24px] p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="font-black text-[15px]">Tentukan Finishing Awal</div>
                <button onClick={() => { setStartFinishingModal(null); setSelectedFinishing(null); }} className="h-9 w-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 min-h-[36px]">✕</button>
              </div>
              <div className="mono text-[11px] text-zinc-400 mt-2 bg-[#0a0a0b] border border-zinc-800 rounded-[12px] px-3 py-2">
                Job <span className="font-bold text-zinc-200">#{startFinishingModal.jobId}</span> • {startFinishingModal.customer} • {startFinishingModal.material} • <span className="text-lime-300 font-bold">{cls}</span>
                <br />
                <span className="text-[10px] text-zinc-500">V3.9.17: Finishing ditentukan di AWAL saat MULAI CETAK, bukan di akhir. Pilih route finishing sekarang. Supabase: finishing_type + planned_route.</span>
              </div>
              <div className="mt-4">
                <div className="mono text-[10px] tracking-[0.12em] text-zinc-500">PILIH FINISHING ({cls})</div>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  {opts.map((opt, idx) => {
                    const isActive = selectedFinishing?.label === opt.label && selectedFinishing?.route.join(",") === opt.route.join(",");
                    return (
                      <button key={idx} onClick={() => setSelectedFinishing(opt)} className={`flex items-center gap-3 rounded-[16px] border px-4 py-3 text-left transition-colors min-h-[56px] ${isActive ? "bg-lime-400/10 border-lime-400/40 ring-1 ring-lime-400/20" : "bg-[#0a0a0b] border-zinc-800 hover:border-zinc-700"}`} style={{ touchAction: "manipulation" }}>
                        <div className={`h-10 w-10 rounded-[12px] flex items-center justify-center font-black text-[11px] shrink-0 ${isActive ? "bg-lime-400 text-black" : "bg-zinc-800 text-zinc-300"}`}>{opt.route.filter(r=>r!=="QC")[0]?.[0] || "F"}</div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold text-[13px] ${isActive ? "text-lime-200" : "text-zinc-100"}`}>{opt.label}</div>
                          <div className="mono text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1 flex-wrap">
                            <span>{opt.route.join(" → ")}</span>
                            {opt.note && <span className="text-zinc-600">• {opt.note}</span>}
                          </div>
                        </div>
                        <div className={`mono text-[9px] px-2 py-1 rounded-full border font-bold whitespace-nowrap ${isActive ? "bg-lime-400 text-black border-lime-400" : "bg-zinc-900 border-zinc-800 text-zinc-500"}`}>{opt.route.join("→")}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-[1fr_1.3fr] gap-3">
                <button onClick={() => { setStartFinishingModal(null); setSelectedFinishing(null); }} className="mono text-[12px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-300 py-3 rounded-[14px] min-h-[48px]">BATAL</button>
                <button onClick={confirmStartCetak} disabled={!selectedFinishing} className={`mono text-[12px] font-black py-3 rounded-[14px] min-h-[48px] ${selectedFinishing ? "bg-lime-400 hover:bg-lime-300 text-black" : "bg-zinc-800 text-zinc-600 border border-zinc-700 cursor-not-allowed"}`}>MULAI CETAK → {selectedFinishing?.route[0] || "GZ"}</button>
              </div>
              <div className="mt-3 mono text-[9px] text-zinc-600 bg-[#0a0a0b] border border-zinc-800 rounded-[12px] px-3 py-2">
                Flexi: Seaming+Mata Itik [GZ,SEAM,QC], Lebih Bahan [GZ,QC] "cuma cetak dikasih lebih bahan aja ga diapa2in", Selongsong [GZ,SEAM,QC] "lem manual", Potong Pas [GZ,QC] • Sticker: Potong Pas [GZ,QC], Cetak+Cut Kiss/Die [GZ,CUT-G,QC], Cetak+Lam [GZ,LAM,QC], Cetak+Lam+Cut [GZ,LAM,CUT-G,QC] • Canon: Cetak saja [CANON,QC], Cetak+Cut [CANON,CUT-G,QC], Cetak+Lam [CANON,LAM,QC], Cetak+Lam+Cut [CANON,LAM,CUT-G,QC]
              </div>
            </div>
          </div>
        );
      })()}

      {orderModal && (
        <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-3">
          <div className="w-full max-w-[560px] bg-zinc-900 border border-zinc-800 rounded-[24px] p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="font-black text-[16px]">+ Tambah Order Baru</div>
              <button onClick={() => setOrderModal(false)} className="h-9 w-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 min-h-[36px]">✕</button>
            </div>
            <div className="mono text-[10px] text-zinc-500 mt-1">V3.9.17 SUPABASE-READY • ID auto {new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "2-digit" })}-XXX • Finishing dipilih saat MULAI • Prioritas mempengaruhi urutan • {isSupabaseConnected ? "Supabase insert" : "LocalStorage fallback"}</div>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mono text-[10px] tracking-[0.12em] text-zinc-500">NAMA CUSTOMER *</label>
                <input value={orderForm.customer} onChange={(e) => setOrderForm((f) => ({ ...f, customer: e.target.value }))} placeholder="Contoh: Warung Sate Ibu" className="mt-2 w-full bg-[#0a0a0b] border border-zinc-800 rounded-[14px] px-4 py-3 text-[14px] outline-none focus:border-lime-400/50 placeholder:text-zinc-600" />
              </div>
              <div className="grid grid-cols-[1fr_140px] gap-3">
                <div>
                  <label className="mono text-[10px] tracking-[0.12em] text-zinc-500">BAHAN *</label>
                  <select value={orderForm.material} onChange={(e) => setOrderForm((f) => ({ ...f, material: e.target.value }))} className="mt-2 w-full bg-[#0a0a0b] border border-zinc-800 rounded-[14px] px-4 py-3 text-[13px] outline-none focus:border-lime-400/50 text-zinc-200">
                    <optgroup label="GZ C3200 - Flexi & Outdoor">
                      {GZ_MATERIALS.map((m) => (
                        <option key={m.id} value={m.id}>{m.label} ({m.id})</option>
                      ))}
                      <option value="FLEX CHINA">FLEX CHINA</option>
                    </optgroup>
                    <optgroup label="CANON - Indoor & Paper">
                      {CANON_MATERIALS.map((m) => (
                        <option key={m.id} value={m.id}>{m.label} ({m.id})</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="mono text-[10px] tracking-[0.12em] text-zinc-500">PRIORITAS *</label>
                  <select value={orderForm.priority} onChange={(e) => setOrderForm((f) => ({ ...f, priority: e.target.value as PriorityType }))} className="mt-2 w-full bg-[#0a0a0b] border border-zinc-800 rounded-[14px] px-3 py-3 text-[12px] outline-none focus:border-lime-400/50 text-zinc-200 font-bold">
                    <option value="reguler">REGULER</option>
                    <option value="member">MEMBER</option>
                    <option value="express">EXPRESS</option>
                  </select>
                  <div className="mt-1 mono text-[9px] text-zinc-600">EXPRESS top • MEMBER mid • REGULER bottom</div>
                </div>
              </div>
              <div>
                <label className="mono text-[10px] tracking-[0.12em] text-zinc-500">TIPE UKURAN</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button onClick={() => setOrderForm((f) => ({ ...f, type: "meter" }))} className={`mono text-[11px] font-bold py-2.5 rounded-[12px] border min-h-[40px] ${orderForm.type === "meter" ? "bg-lime-400 text-black border-lime-400" : "bg-zinc-800 border-zinc-700 text-zinc-400"}`}>📏 P x L METER</button>
                  <button onClick={() => setOrderForm((f) => ({ ...f, type: "lembar" }))} className={`mono text-[11px] font-bold py-2.5 rounded-[12px] border min-h-[40px] ${orderForm.type === "lembar" ? "bg-lime-400 text-black border-lime-400" : "bg-zinc-800 border-zinc-700 text-zinc-400"}`}>📄 LEMBAR</button>
                </div>
              </div>
              {orderForm.type === "meter" ? (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mono text-[10px] tracking-[0.12em] text-zinc-500">P (M)</label>
                    <input value={orderForm.p} onChange={(e) => setOrderForm((f) => ({ ...f, p: e.target.value.replace(/[^0-9.]/g, "") }))} placeholder="3" inputMode="decimal" className="mt-2 w-full bg-[#0a0a0b] border border-zinc-800 rounded-[14px] px-4 py-3 text-[14px] outline-none focus:border-lime-400/50 placeholder:text-zinc-600" />
                  </div>
                  <div>
                    <label className="mono text-[10px] tracking-[0.12em] text-zinc-500">L (M)</label>
                    <input value={orderForm.l} onChange={(e) => setOrderForm((f) => ({ ...f, l: e.target.value.replace(/[^0-9.]/g, "") }))} placeholder="1" inputMode="decimal" className="mt-2 w-full bg-[#0a0a0b] border border-zinc-800 rounded-[14px] px-4 py-3 text-[14px] outline-none focus:border-lime-400/50 placeholder:text-zinc-600" />
                  </div>
                  <div>
                    <label className="mono text-[10px] tracking-[0.12em] text-zinc-500">QTY PCS</label>
                    <input value={orderForm.qty} onChange={(e) => setOrderForm((f) => ({ ...f, qty: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="2" inputMode="numeric" className="mt-2 w-full bg-[#0a0a0b] border border-zinc-800 rounded-[14px] px-4 py-3 text-[14px] outline-none focus:border-lime-400/50 placeholder:text-zinc-600" />
                  </div>
                  <div className="col-span-3 mono text-[10px] text-zinc-500 bg-[#0a0a0b] border border-zinc-800 rounded-[10px] px-3 py-2">
                    Preview: {orderForm.p || "P"} x {orderForm.l || "L"}m - {orderForm.qty || "1"}pcs = {orderForm.p && orderForm.l && orderForm.qty ? (parseFloat(orderForm.p) * parseFloat(orderForm.l) * parseInt(orderForm.qty)).toFixed(1) + "m" : "-"} • Prioritas: {orderForm.priority.toUpperCase()}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mono text-[10px] tracking-[0.12em] text-zinc-500">UKURAN KERTAS</label>
                    <select value={orderForm.sizeLabel} onChange={(e) => setOrderForm((f) => ({ ...f, sizeLabel: e.target.value }))} className="mt-2 w-full bg-[#0a0a0b] border border-zinc-800 rounded-[14px] px-3 py-3 text-[13px] text-zinc-200 outline-none focus:border-lime-400/50">
                      <option value="A3">A3</option>
                      <option value="A3+">A3+</option>
                      <option value="A2">A2</option>
                      <option value="A1">A1</option>
                      <option value="1x1">1x1m</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="mono text-[10px] tracking-[0.12em] text-zinc-500">QTY LEMBAR</label>
                    <input value={orderForm.qty} onChange={(e) => setOrderForm((f) => ({ ...f, qty: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="50" inputMode="numeric" className="mt-2 w-full bg-[#0a0a0b] border border-zinc-800 rounded-[14px] px-4 py-3 text-[14px] outline-none focus:border-lime-400/50 placeholder:text-zinc-600" />
                  </div>
                </div>
              )}
              <div>
                <label className="mono text-[10px] tracking-[0.12em] text-zinc-500">FINISHING *</label>
                <div className="mt-2 grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-1">
                  {getFinishingOptions(orderForm.material).map((opt) => {
                    const isActive = (orderForm.finishing || getFinishingOptions(orderForm.material)[0]?.label) === opt.label;
                    return (
                      <button key={opt.label} type="button" onClick={() => setOrderForm((f) => ({ ...f, finishing: opt.label }))} className={`flex items-center gap-2 rounded-[12px] border px-3 py-2.5 text-left transition-colors min-h-[48px] ${isActive ? "bg-lime-400/15 border-lime-400/50 ring-1 ring-lime-400/20" : "bg-[#0a0a0b] border-zinc-800 hover:border-zinc-700"}`}>
                        <div className={`h-7 w-7 rounded-[8px] flex items-center justify-center font-black text-[9px] shrink-0 ${isActive ? "bg-lime-400 text-black" : "bg-zinc-800 text-zinc-400"}`}>{opt.route.filter(r=>r!=="QC")[0]?.[0] || "F"}</div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold text-[12px] ${isActive ? "text-lime-200" : "text-zinc-200"}`}>{opt.label}</div>
                          <div className="mono text-[9px] text-zinc-500">{opt.route.join(" → ")}{opt.note ? ` • ${opt.note}` : ""}</div>
                        </div>
                        {isActive && <div className="h-5 w-5 rounded-full bg-lime-400 flex items-center justify-center text-black text-[10px]">✓</div>}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-1 mono text-[9px] text-zinc-600">Pilih finishing langsung saat order, jadi operator tinggal MULAI tanpa pilih lagi. Route: {(() => { const o = getFinishingOptions(orderForm.material).find(x=>x.label===(orderForm.finishing||getFinishingOptions(orderForm.material)[0]?.label)) || getFinishingOptions(orderForm.material)[0]; return o ? o.route.join(" → ") : "-"; })()}</div>
              </div>
              <div>
                <label className="mono text-[10px] tracking-[0.12em] text-zinc-500">CATATAN</label>
                <textarea value={orderForm.note} onChange={(e) => setOrderForm((f) => ({ ...f, note: e.target.value }))} placeholder="List merah, tanpa laminasi, dll" rows={2} className="mt-2 w-full bg-[#0a0a0b] border border-zinc-800 rounded-[14px] px-4 py-3 text-[13px] outline-none focus:border-lime-400/50 placeholder:text-zinc-600 resize-none" />
              </div>
              <div className="grid grid-cols-[1fr_1.2fr] gap-3 pt-2">
                <button onClick={() => setOrderModal(false)} className="mono text-[12px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-300 py-3 rounded-[14px] min-h-[48px]">BATAL</button>
                <button onClick={handleCreateOrder} className="mono text-[12px] font-black bg-lime-400 hover:bg-lime-300 text-black py-3 rounded-[14px] min-h-[48px]">SIMPAN ORDER → ANTRI</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {gagalModal && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-3">
          <div className="w-full max-w-[480px] bg-zinc-900 border border-zinc-800 rounded-[24px] p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="font-black text-[15px]">❌ Catat Gagal Cetak</div>
              <button onClick={() => setGagalModal(null)} className="h-9 w-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 min-h-[36px]">✕</button>
            </div>
            <div className="mt-2 mono text-[11px] text-zinc-500">Mesin: {gagalModal.machine} • Jenis: {gagalModal.failKind} • Job #{gagalModal.jobId}</div>
            <div className="mt-4">
              <div className="mono text-[10px] tracking-[0.12em] text-zinc-500">TIPE GAGAL</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={() => setGagalForm((f) => ({ ...f, type: "lembar" }))} className={`mono text-[12px] font-bold py-3 rounded-[14px] border min-h-[48px] ${gagalForm.type === "lembar" ? "bg-lime-400 text-black border-lime-400" : "bg-zinc-800 border-zinc-700 text-zinc-400"}`}>📄 LEMBAR</button>
                <button onClick={() => setGagalForm((f) => ({ ...f, type: "meter" }))} className={`mono text-[12px] font-bold py-3 rounded-[14px] border min-h-[48px] ${gagalForm.type === "meter" ? "bg-lime-400 text-black border-lime-400" : "bg-zinc-800 border-zinc-700 text-zinc-400"}`}>📏 P x L METER</button>
              </div>
            </div>
            {gagalForm.type === "lembar" ? (
              <div className="mt-4">
                <label className="mono text-[10px] tracking-[0.12em] text-zinc-500">JUMLAH LEMBAR GAGAL (CANON, CUT-H/G untuk ritrama)</label>
                <input value={gagalForm.lembar} onChange={(e) => setGagalForm((f) => ({ ...f, lembar: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="Contoh: 3" inputMode="numeric" className="mt-2 w-full bg-[#0a0a0b] border border-zinc-800 rounded-[14px] px-4 py-3 text-[14px] outline-none focus:border-lime-400/50 placeholder:text-zinc-600" />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="mono text-[10px] tracking-[0.12em] text-zinc-500">P (PANJANG) METER</label>
                  <input value={gagalForm.p} onChange={(e) => setGagalForm((f) => ({ ...f, p: e.target.value.replace(/[^0-9.]/g, "") }))} placeholder="Contoh: 5" inputMode="decimal" className="mt-2 w-full bg-[#0a0a0b] border border-zinc-800 rounded-[14px] px-4 py-3 text-[14px] outline-none focus:border-lime-400/50 placeholder:text-zinc-600" />
                </div>
                <div>
                  <label className="mono text-[10px] tracking-[0.12em] text-zinc-500">L (LEBAR) METER</label>
                  <input value={gagalForm.l} onChange={(e) => setGagalForm((f) => ({ ...f, l: e.target.value.replace(/[^0-9.]/g, "") }))} placeholder="Contoh: 0.8" inputMode="decimal" className="mt-2 w-full bg-[#0a0a0b] border border-zinc-800 rounded-[14px] px-4 py-3 text-[14px] outline-none focus:border-lime-400/50 placeholder:text-zinc-600" />
                </div>
                <div className="col-span-2 mono text-[10px] text-zinc-500 bg-[#0a0a0b] border border-zinc-800 rounded-[10px] px-3 py-2">Total: {gagalForm.p && gagalForm.l ? `${(parseFloat(gagalForm.p) * parseFloat(gagalForm.l || "0")).toFixed(2)} m² (${gagalForm.p}x${gagalForm.l})` : "-"} • Flexi/F280 hitung meteran</div>
              </div>
            )}
            <div className="mt-4">
              <label className="mono text-[10px] tracking-[0.12em] text-zinc-500">ALASAN GAGAL • WAJIB</label>
              <textarea value={gagalForm.reason} onChange={(e) => setGagalForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Contoh: Head mampet, warna belang, laminasi bubble, cutting miring" rows={3} className="mt-2 w-full bg-[#0a0a0b] border border-zinc-800 rounded-[14px] px-4 py-3 text-[13px] outline-none focus:border-lime-400/50 placeholder:text-zinc-600 resize-none" />
            </div>
            <div className="mt-5 grid grid-cols-[1fr_1.2fr] gap-3">
              <button onClick={() => setGagalModal(null)} className="mono text-[12px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-300 py-3 rounded-[14px] min-h-[48px]">BATAL</button>
              <button onClick={submitGagal} className="mono text-[12px] font-black bg-red-500 hover:bg-red-400 text-white py-3 rounded-[14px] min-h-[48px]">SIMPAN GAGAL → ANTRI</button>
            </div>
          </div>
        </div>
      )}
      {serahkanModal && (() => {
        const job = jobs.find((j) => j.id === serahkanModal.jobId);
        if (!job) return null;
        const totalLembar = job.failures?.filter(f => f.type === "lembar").reduce((a, b) => a + (b.qtyLembar || 0), 0) || 0;
        const totalMeter = job.failures?.filter(f => f.type === "meter").reduce((a, b) => a + (b.qtyTotalM || 0), 0) || 0;
        return (
          <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-3">
            <div className="w-full max-w-[520px] bg-zinc-900 border border-amber-900/30 rounded-[24px] p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
              <div className="font-black text-[16px]">⚠️ Ada kegagalan - Konfirmasi serahkan?</div>
              <div className="mono text-[11px] text-zinc-500 mt-1">Job #{job.id} • {job.customer} • {job.material}</div>
              <div className="mt-4 bg-amber-950/20 border border-amber-900/30 rounded-[16px] p-3">
                <div className="mono text-[10px] font-bold tracking-[0.12em] text-amber-300">DAFTAR GAGAL ({job.failures?.length})</div>
                <div className="mt-2 space-y-2 max-h-[160px] overflow-y-auto">
                  {job.failures?.map((f,i)=>(
                    <div key={i} className="mono text-[11px] bg-zinc-900 border border-zinc-800 rounded-[10px] px-3 py-2 text-zinc-300 leading-[1.35]">
                      <span className="font-bold text-amber-200">{f.machine} - {f.failKind}</span>: {f.type==="lembar" ? `${f.qtyLembar} lembar` : `${f.qtyP}x${f.qtyL}m = ${f.qtyTotalM?.toFixed(2)}m²`} • {f.reason} <span className="text-zinc-500">by {f.by} • {formatTime(f.at)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 mono text-[11px]">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-[10px] px-3 py-2"><div className="text-zinc-500 text-[9px]">TOTAL KERTAS</div><div className="font-bold text-zinc-200">{totalLembar} lembar</div></div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-[10px] px-3 py-2"><div className="text-zinc-500 text-[9px]">TOTAL FLEXI</div><div className="font-bold text-zinc-200">{totalMeter.toFixed(2)} m²</div></div>
                </div>
              </div>
              <div className="mt-4">
                <label className="mono text-[10px] tracking-[0.12em] text-zinc-500">CATATAN UNTUK HISTORY • WAJIB JIKA ADA GAGAL</label>
                <textarea value={serahkanNote} onChange={(e)=>setSerahkanNote(e.target.value)} placeholder="Contoh: Sudah konfirmasi customer, 2 lembar gagal diganti, total tagih 6m - 0.5m gagal = 5.5m. Customer setuju." rows={3} className="mt-2 w-full bg-[#0a0a0b] border border-zinc-800 rounded-[14px] px-4 py-3 text-[13px] outline-none focus:border-lime-400/50 placeholder:text-zinc-600 resize-none" />
              </div>
              <div className="mt-5 grid grid-cols-[1fr_1.2fr] gap-3">
                <button onClick={()=>{ setSerahkanModal(null); setSerahkanNote(""); }} className="mono text-[12px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-300 py-3 rounded-[14px] min-h-[48px]">BATAL</button>
                <button onClick={()=>doSerahkan(job.id, serahkanNote)} className="mono text-[12px] font-black bg-emerald-400 hover:bg-emerald-300 text-black py-3 rounded-[14px] min-h-[48px]">SERAHKAN DENGAN CATATAN GAGAL</button>
              </div>
            </div>
          </div>
        );
      })()}
      {detailJob && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-3">
          <div className="w-full max-w-[520px] bg-zinc-900 border border-zinc-800 rounded-[24px] p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="font-black text-[15px]">📋 Detail Job #{detailJob.id}</div>
              <button onClick={()=>setDetailJobId(null)} className="h-9 w-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 min-h-[36px]">✕</button>
            </div>
            <div className="mt-3 mono text-[11px] text-zinc-400">{detailJob.customer} • {detailJob.material} • {detailJob.qtyLabel} • {detailJob.lengthM}m • {detailJob.priority?.toUpperCase() || "REGULER"}</div>
            <div className="mt-1 mono text-[10px] text-zinc-500">Route: {detailJob.route.join(" → ")} • Status: {detailJob.status} • CS: {detailJob.createdBy} • Op: {detailJob.assignedOperator || detailJob.startedBy || "-"}</div>
            {detailJob.finishingNote && <div className="mt-3 mono text-[11px] bg-[#0a0a0b] border border-zinc-800 rounded-[12px] px-3 py-2 text-zinc-300">Finishing: {detailJob.finishingNote}</div>}
            <div className="mt-4">
              <div className="mono text-[10px] font-bold tracking-[0.12em] text-zinc-500">HISTORY GAGAL • {detailJob.failures?.length || 0}</div>
              {(!detailJob.failures || detailJob.failures.length===0) ? <div className="mt-2 mono text-[11px] text-zinc-600 bg-[#0a0a0b] border border-zinc-800 rounded-[12px] px-3 py-3">Tidak ada catatan gagal</div> : (
                <div className="mt-2 space-y-2">
                  {detailJob.failures.map((f,i)=>(
                    <div key={i} className="bg-[#0a0a0b] border border-zinc-800 rounded-[14px] p-3">
                      <div className="flex items-center justify-between mono text-[10px]"><span className="font-bold text-zinc-200">{f.machine} • {f.failKind} • {f.type==="lembar" ? `${f.qtyLembar} lembar` : `${f.qtyP}x${f.qtyL}m = ${f.qtyTotalM?.toFixed(2)}m²`}</span><span className="text-zinc-500">{formatDateTime(f.at)}</span></div>
                      <div className="mt-2 text-[12px] text-zinc-300">Alasan: {f.reason}</div>
                      <div className="mt-1 mono text-[10px] text-zinc-500">Oleh: {f.by}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {(detailJob.failureSummary || detailJob.deliveryNotes || detailJob.note) && (
              <div className="mt-4 space-y-2">
                {detailJob.failureSummary && <div className="mono text-[11px] bg-amber-950/20 border border-amber-900/20 rounded-[12px] px-3 py-2 text-amber-200">⚠️ {detailJob.failureSummary}</div>}
                {detailJob.deliveryNotes && <div className="text-[11px] bg-[#0a0a0b] border border-zinc-800 rounded-[12px] px-3 py-2 text-zinc-300">📦 {detailJob.deliveryNotes}</div>}
                {detailJob.note && <div className="text-[11px] bg-[#0a0a0b] border border-zinc-800 rounded-[12px] px-3 py-2 text-zinc-400">📝 {detailJob.note}</div>}
              </div>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={()=>setDetailJobId(null)} className="mono text-[12px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-300 py-3 rounded-[14px] min-h-[48px]">TUTUP</button>
              {detailJob.status==="siap" && <button onClick={()=>{ setDetailJobId(null); handleSerahkanAttempt(detailJob.id); }} className="mono text-[12px] font-black bg-lime-400 text-black py-3 rounded-[14px] min-h-[48px]">SERAHKAN →</button>}
              {detailJob.status==="selesai" && <button onClick={()=>{ handleClearSelesai(detailJob.id); setDetailJobId(null); }} disabled={!isOwner} className={`mono text-[12px] font-bold py-3 rounded-[14px] border min-h-[48px] ${isOwner ? "bg-zinc-800 border-zinc-700 text-zinc-300" : "bg-zinc-900 border-zinc-800 text-zinc-600 opacity-50"}`}>HAPUS RIWAYAT</button>}
            </div>
          </div>
        </div>
      )}
      {settingsOpen && (
        <div className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-3">
          <div className="w-full max-w-[480px] bg-zinc-900 border border-zinc-800 rounded-[24px] p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="font-black text-[14px]">⚙️ Supabase Settings • V3.9.17</div>
              <button onClick={()=>setSettingsOpen(false)} className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">✕</button>
            </div>
            <div className="mono text-[10px] text-zinc-500 mt-2 leading-[1.5]">Simpan URL & Anon Key ke localStorage. Koneksi otomatis, realtime jobs-changes. Fallback LocalStorage jika belum set. Table: <span className="text-zinc-300">jobs</span><br/>SQL ada di footer board. Status: <span className={isSupabaseConnected ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{supabaseStatus.toUpperCase()} • {isSupabaseConnected ? "Supabase Connected" : "LocalStorage - set Supabase URL"}</span></div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mono text-[10px] tracking-[0.12em] text-zinc-500">SUPABASE URL</label>
                <input value={supaUrlInput} onChange={(e)=>setSupaUrlInput(e.target.value)} placeholder="https://xxxx.supabase.co" className="mt-2 w-full bg-[#0a0a0b] border border-zinc-800 rounded-[14px] px-4 py-3 text-[13px] outline-none focus:border-lime-400/50 placeholder:text-zinc-600" />
              </div>
              <div>
                <label className="mono text-[10px] tracking-[0.12em] text-zinc-500">SUPABASE ANON KEY</label>
                <textarea value={supaKeyInput} onChange={(e)=>setSupaKeyInput(e.target.value)} placeholder="eyJ..." rows={3} className="mt-2 w-full bg-[#0a0a0b] border border-zinc-800 rounded-[14px] px-4 py-3 text-[12px] outline-none focus:border-lime-400/50 placeholder:text-zinc-600 resize-none" />
              </div>
              <div className="grid grid-cols-[1fr_1fr] gap-2 pt-2">
                <button onClick={clearSupabaseSettings} className="mono text-[11px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-400 py-3 rounded-[14px] min-h-[48px]">DISCONNECT</button>
                <button onClick={saveSupabaseSettings} className="mono text-[11px] font-black bg-lime-400 text-black py-3 rounded-[14px] min-h-[48px]">SAVE & CONNECT</button>
              </div>
              <div className="mono text-[9px] text-zinc-600 bg-[#0a0a0b] border border-zinc-800 rounded-[12px] px-3 py-2">ENV alternative: set VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY via import.meta.env. CDN: https://esm.sh/@supabase/supabase-js@2 • Channel: jobs-changes • events INSERT/UPDATE/DELETE</div>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] max-w-[92vw] bg-zinc-900 border border-zinc-800 text-zinc-100 px-4 py-3 rounded-[16px] text-[12px] shadow-2xl mono flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-lime-400 animate-pulse" />
          <span className="leading-[1.3]">{toast}</span>
        </div>
      )}
    </div>
  );
}
