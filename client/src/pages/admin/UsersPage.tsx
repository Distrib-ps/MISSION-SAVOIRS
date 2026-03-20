import { useState, useEffect, useCallback, useRef } from "react";
import type { ChangeEvent, FormEvent, DragEvent } from "react";
import * as XLSX from "xlsx";
import AdminLayout from "../../components/admin/AdminLayout";
import type { User, Level, Role, ImportResult, ImportedUser } from "../../types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LEVELS: Level[] = ["CP", "CE1", "CE2", "CM1", "CM2"];
const API = "/api/admin/users";

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  };
}

function authHeadersRaw(): Record<string, string> {
  return {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

/* ------------------------------------------------------------------ */
/*  Helper: generate username preview                                  */
/* ------------------------------------------------------------------ */

function generateUsernamePreview(firstName: string, lastName: string): string {
  if (!firstName || !lastName) return "";
  const clean = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z]/g, "");
  const first = clean(firstName).toLowerCase();
  const last = clean(lastName).charAt(0).toLowerCase();
  return `${first}${last}`;
}

/* ------------------------------------------------------------------ */
/*  Level & Role badge components                                      */
/* ------------------------------------------------------------------ */

function LevelBadge({ level }: { level: Level | null | undefined }) {
  if (!level) return <span className="text-ms-gray text-sm">-</span>;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-ms-blue-light text-ms-dark">
      {level}
    </span>
  );
}

function RoleBadge({ role }: { role: Role }) {
  if (role === "ADMIN") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-ms-lavender-light text-ms-dark">
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-ms-green-light text-ms-dark">
      Eleve
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper: download credentials as Excel                              */
/* ------------------------------------------------------------------ */

function downloadCredentials(users: ImportedUser[]) {
  const wsData = [
    ["PRENOM", "NOM", "NIVEAU", "IDENTIFIANT", "MOT DE PASSE"],
    ...users.map((u) => [u.prenom, u.nom, u.niveau, u.identifiant, u.motDePasse]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto column widths
  ws["!cols"] = [{ wch: 15 }, { wch: 15 }, { wch: 8 }, { wch: 20 }, { wch: 15 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Identifiants");
  XLSX.writeFile(wb, `identifiants_eleves_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* ------------------------------------------------------------------ */
/*  Helper: generate random 5-char password                            */
/* ------------------------------------------------------------------ */

function generateRandomPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Sort helpers                                                       */
/* ------------------------------------------------------------------ */

type SortKey = "username" | "firstName" | "lastName" | "level" | "role";
type SortDir = "asc" | "desc";

const LEVEL_ORDER: Record<string, number> = { CP: 0, CE1: 1, CE2: 2, CM1: 3, CM2: 4 };

function sortUsers(list: User[], key: SortKey, dir: SortDir): User[] {
  return [...list].sort((a, b) => {
    let cmp = 0;
    if (key === "level") {
      cmp = (LEVEL_ORDER[a.level ?? ""] ?? 99) - (LEVEL_ORDER[b.level ?? ""] ?? 99);
    } else {
      const va = (a[key] ?? "").toLowerCase();
      const vb = (b[key] ?? "").toLowerCase();
      cmp = va < vb ? -1 : va > vb ? 1 : 0;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

/* ------------------------------------------------------------------ */
/*  Main page component                                                */
/* ------------------------------------------------------------------ */

export default function UsersPage() {
  /* ---------- state ---------- */
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("ALL");
  const [filterRole, setFilterRole] = useState<string>("ALL");

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("firstName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Selection
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkLevel, setBulkLevel] = useState<Level>("CP");

  // Modals
  const [showCreateEdit, setShowCreateEdit] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<User | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Form state
  const [formFirst, setFormFirst] = useState("");
  const [formLast, setFormLast] = useState("");
  const [formLevel, setFormLevel] = useState<Level>("CP");
  const [formPassword, setFormPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formRole, setFormRole] = useState<Role>("STUDENT");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{ prenom: string; nom: string; niveau: string; valid: boolean }[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  /* ---------- fetch users ---------- */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API, { headers: authHeaders() });
      if (!res.ok) throw new Error("Erreur lors du chargement des utilisateurs");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : data.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /* ---------- filtered + sorted users ---------- */
  const filtered = sortUsers(
    users.filter((u) => {
      if (filterLevel !== "ALL" && u.level !== filterLevel) return false;
      if (filterRole === "STUDENT" && u.role !== "STUDENT") return false;
      if (filterRole === "ADMIN" && u.role !== "ADMIN") return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${u.username} ${u.firstName} ${u.lastName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    }),
    sortKey,
    sortDir
  );

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  /* ---------- selection helpers ---------- */
  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((u) => u.id)));
    }
  }

  /* ---------- CRUD ---------- */

  function openCreate() {
    setEditingUser(null);
    setFormFirst("");
    setFormLast("");
    setFormLevel("CP");
    setFormPassword(generateRandomPassword());
    setShowPassword(true);
    setFormRole("STUDENT");
    setFormError("");
    setShowCreateEdit(true);
  }

  function openEdit(u: User) {
    setEditingUser(u);
    setFormFirst(u.firstName);
    setFormLast(u.lastName);
    setFormLevel(u.level ?? "CP");
    setFormPassword("");
    setShowPassword(false);
    setFormRole(u.role);
    setFormError("");
    setShowCreateEdit(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");

    try {
      if (editingUser) {
        // Update
        const body: Record<string, string> = {
          firstName: formFirst,
          lastName: formLast,
          level: formLevel,
        };
        if (formPassword) body.password = formPassword;

        const res = await fetch(`${API}/${editingUser.id}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          throw new Error(d?.error || "Erreur lors de la modification");
        }
      } else {
        // Create
        if (!formPassword) {
          setFormError("Le mot de passe est requis");
          setFormLoading(false);
          return;
        }
        const res = await fetch(API, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            firstName: formFirst,
            lastName: formLast,
            level: formLevel,
            password: formPassword,
            role: formRole,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          throw new Error(d?.error || "Erreur lors de la creation");
        }
      }
      setShowCreateEdit(false);
      await fetchUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(u: User) {
    try {
      const res = await fetch(`${API}/${u.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      setShowDeleteConfirm(null);
      await fetchUsers();
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(u.id);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setShowDeleteConfirm(null);
    }
  }

  async function handleBulkDelete() {
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch(`${API}/${id}`, {
            method: "DELETE",
            headers: authHeaders(),
          })
        )
      );
      setSelected(new Set());
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression groupee");
    }
  }

  async function handleBulkLevel() {
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch(`${API}/${id}`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify({ level: bulkLevel }),
          })
        )
      );
      setSelected(new Set());
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la modification groupee");
    }
  }

  /* ---------- Import ---------- */

  function openImport() {
    setImportFile(null);
    setImportPreview([]);
    setImportResult(null);
    setImportError("");
    setShowImport(true);
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

  function parseFile(file: File) {
    setImportFile(file);
    setImportError("");
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!sheet) { setImportError("Le fichier ne contient aucune feuille"); return; }

        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        if (rows.length === 0) { setImportError("Le fichier est vide"); return; }

        const validLevels = ["CP", "CE1", "CE2", "CM1", "CM2"];
        const parsed = rows.map((row) => {
          const keys = Object.keys(row);
          const prenomKey = keys.find((k) => ["prenom", "prénom"].includes(k.toLowerCase().trim()));
          const nomKey = keys.find((k) => k.toLowerCase().trim() === "nom");
          const niveauKey = keys.find((k) => k.toLowerCase().trim() === "niveau");

          const prenom = prenomKey ? String(row[prenomKey]).trim() : "";
          const nom = nomKey ? String(row[nomKey]).trim() : "";
          const niveau = niveauKey ? String(row[niveauKey]).trim().toUpperCase() : "";
          const valid = !!prenom && !!nom && validLevels.includes(niveau);

          return { prenom, nom, niveau, valid };
        });

        setImportPreview(parsed);
      } catch {
        setImportError("Impossible de lire le fichier");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file) parseFile(file);
  }

  async function handleImport() {
    if (!importFile) return;
    setImportLoading(true);
    setImportError("");
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const res = await fetch(`${API}/import`, {
        method: "POST",
        headers: authHeadersRaw(),
        body: formData,
      });

      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || "Erreur lors de l'import");
      }

      const result: ImportResult = await res.json();
      setImportResult(result);
      await fetchUsers();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setImportLoading(false);
    }
  }

  /* ---------- Render ---------- */

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-ms-dark">
              Gestion des utilisateurs
            </h1>
            <p className="text-ms-gray text-sm mt-1">
              {users.length} utilisateur{users.length !== 1 ? "s" : ""} au total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openImport}
              className="px-4 py-2.5 text-sm font-semibold bg-white border border-ms-light-gray text-ms-dark hover:bg-ms-cream rounded-xl transition"
            >
              Importer (Excel)
            </button>
            <button
              onClick={openCreate}
              className="px-4 py-2.5 text-sm font-semibold bg-ms-lavender text-white hover:opacity-90 rounded-xl transition shadow-sm"
            >
              + Ajouter un utilisateur
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-ms-light-gray/50 p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Rechercher par nom ou identifiant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 text-sm border border-ms-light-gray rounded-xl bg-ms-cream/50 text-ms-dark placeholder:text-ms-gray/60 focus:outline-none focus:ring-2 focus:ring-ms-lavender/40"
          />
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-4 py-2.5 text-sm border border-ms-light-gray rounded-xl bg-white text-ms-dark focus:outline-none focus:ring-2 focus:ring-ms-lavender/40"
          >
            <option value="ALL">Tous les niveaux</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2.5 text-sm border border-ms-light-gray rounded-xl bg-white text-ms-dark focus:outline-none focus:ring-2 focus:ring-ms-lavender/40"
          >
            <option value="ALL">Tous les roles</option>
            <option value="STUDENT">Eleves</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-ms-pink-light border border-ms-pink text-ms-dark rounded-2xl p-4 mb-6 text-sm font-medium">
            {error}
            <button
              onClick={() => setError("")}
              className="ml-3 underline text-ms-gray hover:text-ms-dark"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-ms-light-gray/50 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-ms-lavender border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-ms-gray">
              <p className="text-lg font-semibold mb-1">Aucun utilisateur trouve</p>
              <p className="text-sm">Modifiez vos filtres ou ajoutez un nouvel utilisateur.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ms-light-gray">
                    <th className="pl-4 pr-2 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selected.size === filtered.length && filtered.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded accent-ms-lavender"
                      />
                    </th>
                    {([
                      ["username", "Identifiant"],
                      ["firstName", "Prénom"],
                      ["lastName", "Nom"],
                      ["level", "Niveau"],
                      ["role", "Rôle"],
                    ] as [SortKey, string][]).map(([key, label]) => (
                      <th
                        key={key}
                        onClick={() => handleSort(key)}
                        className="px-3 py-3 text-left font-bold text-ms-gray uppercase text-xs tracking-wider cursor-pointer select-none hover:text-ms-lavender transition-colors"
                      >
                        <span className="inline-flex items-center gap-1">
                          {label}
                          {sortKey === key ? (
                            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="currentColor">
                              {sortDir === "asc" ? (
                                <path d="M7 3L12 9H2L7 3Z" />
                              ) : (
                                <path d="M7 11L2 5H12L7 11Z" />
                              )}
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5 opacity-30" viewBox="0 0 14 14" fill="currentColor">
                              <path d="M7 3L10 6.5H4L7 3ZM7 11L4 7.5H10L7 11Z" />
                            </svg>
                          )}
                        </span>
                      </th>
                    ))}
                    <th className="px-3 py-3 text-right font-bold text-ms-gray uppercase text-xs tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, idx) => (
                    <tr
                      key={u.id}
                      className={`border-b border-ms-light-gray/50 hover:bg-ms-lavender-light/30 transition-colors ${
                        idx % 2 === 0 ? "bg-white" : "bg-ms-cream/40"
                      }`}
                    >
                      <td className="pl-4 pr-2 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(u.id)}
                          onChange={() => toggleSelect(u.id)}
                          className="w-4 h-4 rounded accent-ms-lavender"
                        />
                      </td>
                      <td className="px-3 py-3 font-mono text-ms-dark font-medium">
                        {u.username}
                      </td>
                      <td className="px-3 py-3 text-ms-dark">{u.firstName}</td>
                      <td className="px-3 py-3 text-ms-dark">{u.lastName}</td>
                      <td className="px-3 py-3">
                        <LevelBadge level={u.level} />
                      </td>
                      <td className="px-3 py-3">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            className="p-2 text-ms-gray hover:text-ms-lavender hover:bg-ms-lavender-light rounded-xl transition"
                            title="Modifier"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(u)}
                            className="p-2 text-ms-gray hover:text-ms-pink hover:bg-ms-pink-light rounded-xl transition"
                            title="Supprimer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Multi-select floating bar */}
        {selected.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ms-dark text-white rounded-2xl shadow-lg px-6 py-3 flex items-center gap-4 z-40">
            <span className="text-sm font-semibold whitespace-nowrap">
              {selected.size} selectionne{selected.size > 1 ? "s" : ""}
            </span>
            <div className="h-5 w-px bg-white/20" />
            <select
              value={bulkLevel}
              onChange={(e) => setBulkLevel(e.target.value as Level)}
              className="px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none"
            >
              {LEVELS.map((l) => (
                <option key={l} value={l} className="text-ms-dark">
                  {l}
                </option>
              ))}
            </select>
            <button
              onClick={handleBulkLevel}
              className="px-4 py-1.5 text-sm font-semibold bg-ms-lavender rounded-xl hover:opacity-90 transition"
            >
              Appliquer
            </button>
            <div className="h-5 w-px bg-white/20" />
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="px-4 py-1.5 text-sm font-semibold bg-ms-pink text-ms-dark rounded-xl hover:opacity-90 transition"
            >
              Supprimer la sélection
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="p-1 hover:bg-white/10 rounded-lg transition"
              title="Deselectionner"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* ---- Create / Edit Modal ---- */}
      {showCreateEdit && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreateEdit(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-extrabold text-ms-dark mb-5">
              {editingUser ? "Modifier l'utilisateur" : "Ajouter un utilisateur"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ms-dark mb-1">
                  Prenom
                </label>
                <input
                  type="text"
                  required
                  value={formFirst}
                  onChange={(e) => setFormFirst(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-ms-light-gray rounded-xl bg-ms-cream/50 text-ms-dark focus:outline-none focus:ring-2 focus:ring-ms-lavender/40"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ms-dark mb-1">
                  Nom
                </label>
                <input
                  type="text"
                  required
                  value={formLast}
                  onChange={(e) => setFormLast(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-ms-light-gray rounded-xl bg-ms-cream/50 text-ms-dark focus:outline-none focus:ring-2 focus:ring-ms-lavender/40"
                />
              </div>

              {/* Username preview */}
              {(formFirst || formLast) && (
                <div className="bg-ms-lavender-light/50 rounded-xl px-4 py-2.5 text-sm">
                  <span className="text-ms-gray">Identifiant : </span>
                  <span className="font-mono font-bold text-ms-dark">
                    {generateUsernamePreview(formFirst, formLast)}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-ms-dark mb-1">
                  Niveau
                </label>
                <select
                  value={formLevel}
                  onChange={(e) => setFormLevel(e.target.value as Level)}
                  className="w-full px-4 py-2.5 text-sm border border-ms-light-gray rounded-xl bg-white text-ms-dark focus:outline-none focus:ring-2 focus:ring-ms-lavender/40"
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ms-dark mb-1">
                  Mot de passe
                  {editingUser && (
                    <span className="font-normal text-ms-gray ml-1">
                      (laisser vide pour conserver l'actuel)
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? "text" : "password"}
                      maxLength={5}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder={editingUser ? "Nouveau mot de passe" : ""}
                      required={!editingUser}
                      className="w-full px-4 py-2.5 pr-10 text-sm border border-ms-light-gray rounded-xl bg-ms-cream/50 text-ms-dark focus:outline-none focus:ring-2 focus:ring-ms-lavender/40 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ms-gray hover:text-ms-lavender transition"
                      title={showPassword ? "Masquer" : "Afficher"}
                    >
                      {showPassword ? (
                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setFormPassword(generateRandomPassword()); setShowPassword(true); }}
                    className="px-3 py-2.5 text-xs font-semibold bg-ms-cream border border-ms-light-gray text-ms-gray hover:text-ms-lavender hover:border-ms-lavender rounded-xl transition whitespace-nowrap"
                    title="Générer un nouveau mot de passe"
                  >
                    Générer
                  </button>
                </div>
                <p className="text-xs text-ms-gray mt-1">5 caractères max</p>
              </div>

              {/* Role selector - only on create */}
              {!editingUser && (
                <div>
                  <label className="block text-sm font-semibold text-ms-dark mb-1">
                    Role
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as Role)}
                    className="w-full px-4 py-2.5 text-sm border border-ms-light-gray rounded-xl bg-white text-ms-dark focus:outline-none focus:ring-2 focus:ring-ms-lavender/40"
                  >
                    <option value="STUDENT">Eleve</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              )}

              {formError && (
                <div className="bg-ms-pink-light text-ms-dark text-sm rounded-xl px-4 py-2.5 font-medium">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateEdit(false)}
                  className="px-5 py-2.5 text-sm font-semibold bg-white border border-ms-light-gray text-ms-dark hover:bg-ms-cream rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2.5 text-sm font-semibold bg-ms-lavender text-white hover:opacity-90 rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {formLoading
                    ? "Enregistrement..."
                    : editingUser
                    ? "Enregistrer"
                    : "Creer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Import Modal ---- */}
      {showImport && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowImport(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-extrabold text-ms-dark mb-2">
              Importer des utilisateurs
            </h2>

            {!importFile && !importResult && (
              <>
                <p className="text-sm text-ms-gray mb-5">
                  Format attendu du fichier (colonnes) :
                </p>
                <div className="bg-ms-cream rounded-xl p-3 mb-5 overflow-x-auto">
                  <table className="text-xs font-mono">
                    <thead>
                      <tr className="text-ms-gray">
                        <th className="px-3 py-1 text-left">PRENOM</th>
                        <th className="px-3 py-1 text-left">NOM</th>
                        <th className="px-3 py-1 text-left">NIVEAU</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-ms-dark">
                        <td className="px-3 py-1">Lina</td>
                        <td className="px-3 py-1">Dupont</td>
                        <td className="px-3 py-1">CE1</td>
                      </tr>
                      <tr className="text-ms-dark">
                        <td className="px-3 py-1">Adam</td>
                        <td className="px-3 py-1">Martin</td>
                        <td className="px-3 py-1">CM2</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Drag & drop zone */}
            {!importResult && (
              <div
                onDragOver={(e: DragEvent<HTMLDivElement>) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
                  dragOver
                    ? "border-ms-lavender bg-ms-lavender-light/40"
                    : importFile
                    ? "border-ms-green bg-ms-green-light/30"
                    : "border-ms-light-gray hover:border-ms-lavender hover:bg-ms-cream/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {importFile ? (
                  <div>
                    <p className="text-sm font-semibold text-ms-dark">
                      {importFile.name}
                    </p>
                    <p className="text-xs text-ms-gray mt-1">
                      Cliquez pour changer de fichier
                    </p>
                  </div>
                ) : (
                  <div>
                    <svg className="w-10 h-10 text-ms-gray/40 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-ms-gray">
                      Glissez un fichier ici ou cliquez pour parcourir
                    </p>
                    <p className="text-xs text-ms-gray/60 mt-1">
                      .xlsx ou .csv
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Preview table */}
            {importPreview.length > 0 && !importResult && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-ms-dark">
                    Aperçu ({importPreview.length} ligne{importPreview.length > 1 ? "s" : ""})
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 text-ms-green font-semibold">
                      <span className="w-2 h-2 rounded-full bg-ms-green" />
                      {importPreview.filter((r) => r.valid).length} valide{importPreview.filter((r) => r.valid).length > 1 ? "s" : ""}
                    </span>
                    {importPreview.some((r) => !r.valid) && (
                      <span className="inline-flex items-center gap-1 text-ms-pink font-semibold">
                        <span className="w-2 h-2 rounded-full bg-ms-pink" />
                        {importPreview.filter((r) => !r.valid).length} erreur{importPreview.filter((r) => !r.valid).length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-ms-cream/50 rounded-xl border border-ms-light-gray/50 overflow-hidden max-h-52 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-ms-light-gray bg-white sticky top-0">
                        <th className="px-3 py-2 text-left font-bold text-ms-gray">#</th>
                        <th className="px-3 py-2 text-left font-bold text-ms-gray">Prénom</th>
                        <th className="px-3 py-2 text-left font-bold text-ms-gray">Nom</th>
                        <th className="px-3 py-2 text-left font-bold text-ms-gray">Niveau</th>
                        <th className="px-3 py-2 text-left font-bold text-ms-gray">Identifiant</th>
                        <th className="px-3 py-2 text-center font-bold text-ms-gray">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((row, i) => (
                        <tr
                          key={i}
                          className={`border-b border-ms-light-gray/30 ${
                            row.valid ? "" : "bg-ms-pink-light/30"
                          }`}
                        >
                          <td className="px-3 py-1.5 text-ms-gray">{i + 1}</td>
                          <td className="px-3 py-1.5 text-ms-dark font-medium">
                            {row.prenom || <span className="text-ms-pink italic">manquant</span>}
                          </td>
                          <td className="px-3 py-1.5 text-ms-dark font-medium">
                            {row.nom || <span className="text-ms-pink italic">manquant</span>}
                          </td>
                          <td className="px-3 py-1.5">
                            {LEVELS.includes(row.niveau as Level) ? (
                              <span className="inline-block px-2 py-0.5 rounded-full bg-ms-blue-light text-ms-dark font-bold">
                                {row.niveau}
                              </span>
                            ) : (
                              <span className="text-ms-pink italic">
                                {row.niveau || "manquant"}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 font-mono text-ms-gray">
                            {row.prenom && row.nom
                              ? generateUsernamePreview(row.prenom, row.nom)
                              : "-"}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            {row.valid ? (
                              <span className="inline-block w-5 h-5 rounded-full bg-ms-green-light text-ms-green leading-5 text-center font-bold">✓</span>
                            ) : (
                              <span className="inline-block w-5 h-5 rounded-full bg-ms-pink-light text-ms-pink leading-5 text-center font-bold">✗</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {importError && (
              <div className="mt-4 bg-ms-pink-light text-ms-dark text-sm rounded-xl px-4 py-2.5 font-medium">
                {importError}
              </div>
            )}

            {importResult && (
              <div className="mt-4 space-y-3">
                <div className="bg-ms-green-light text-ms-dark text-sm rounded-xl px-4 py-3">
                  <p className="font-semibold">
                    {importResult.created} utilisateur{importResult.created !== 1 ? "s" : ""} créé{importResult.created !== 1 ? "s" : ""}
                  </p>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 text-xs text-ms-gray">
                      <p className="font-semibold text-ms-dark mb-1">
                        Erreurs ({importResult.errors.length}) :
                      </p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {importResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Credentials recap table */}
                {importResult.createdUsers.length > 0 && (
                  <>
                    <div className="bg-ms-cream/50 rounded-xl border border-ms-light-gray/50 overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-ms-light-gray bg-white sticky top-0">
                            <th className="px-3 py-2 text-left font-bold text-ms-gray">Prénom</th>
                            <th className="px-3 py-2 text-left font-bold text-ms-gray">Nom</th>
                            <th className="px-3 py-2 text-left font-bold text-ms-gray">Identifiant</th>
                            <th className="px-3 py-2 text-left font-bold text-ms-gray">Mot de passe</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importResult.createdUsers.map((u, i) => (
                            <tr key={i} className="border-b border-ms-light-gray/30">
                              <td className="px-3 py-1.5 text-ms-dark">{u.prenom}</td>
                              <td className="px-3 py-1.5 text-ms-dark">{u.nom}</td>
                              <td className="px-3 py-1.5 font-mono font-medium text-ms-dark">{u.identifiant}</td>
                              <td className="px-3 py-1.5 font-mono font-medium text-ms-lavender">{u.motDePasse}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <button
                      onClick={() => downloadCredentials(importResult.createdUsers)}
                      className="w-full py-3 text-sm font-semibold bg-ms-lavender text-white hover:opacity-90 rounded-xl transition shadow-sm flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Télécharger la liste des identifiants (.xlsx)
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={() => setShowImport(false)}
                className="px-5 py-2.5 text-sm font-semibold bg-white border border-ms-light-gray text-ms-dark hover:bg-ms-cream rounded-xl transition"
              >
                Fermer
              </button>
              {!importResult && (
                <button
                  onClick={handleImport}
                  disabled={!importFile || importLoading || importPreview.filter((r) => r.valid).length === 0}
                  className="px-5 py-2.5 text-sm font-semibold bg-ms-lavender text-white hover:opacity-90 rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {importLoading
                    ? "Import en cours..."
                    : `Importer ${importPreview.filter((r) => r.valid).length} élève${importPreview.filter((r) => r.valid).length > 1 ? "s" : ""}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- Delete Confirmation Modal ---- */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 bg-ms-pink-light rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-ms-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-extrabold text-ms-dark mb-2">
              Supprimer cet utilisateur ?
            </h3>
            <p className="text-sm text-ms-gray mb-6">
              Etes-vous sur de vouloir supprimer{" "}
              <span className="font-bold text-ms-dark">
                {showDeleteConfirm.firstName} {showDeleteConfirm.lastName}
              </span>{" "}
              ? Cette action est irreversible.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-5 py-2.5 text-sm font-semibold bg-white border border-ms-light-gray text-ms-dark hover:bg-ms-cream rounded-xl transition"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-5 py-2.5 text-sm font-semibold bg-ms-pink text-ms-dark hover:opacity-90 rounded-xl transition"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Bulk Delete Confirmation Modal ---- */}
      {showBulkDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowBulkDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 bg-ms-pink-light rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-ms-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-extrabold text-ms-dark mb-2">
              Supprimer {selected.size} utilisateur{selected.size > 1 ? "s" : ""} ?
            </h3>
            <p className="text-sm text-ms-gray mb-6">
              Cette action est irréversible. Tous les utilisateurs sélectionnés seront supprimés.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-5 py-2.5 text-sm font-semibold bg-white border border-ms-light-gray text-ms-dark hover:bg-ms-cream rounded-xl transition"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowBulkDeleteConfirm(false);
                  handleBulkDelete();
                }}
                className="px-5 py-2.5 text-sm font-semibold bg-ms-pink text-ms-dark hover:opacity-90 rounded-xl transition"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
