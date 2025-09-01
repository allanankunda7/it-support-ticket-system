import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Filter, Trash2, Edit3, CheckCircle2, CircleDot, AlertTriangle, ChevronDown, X, RefreshCw } from "lucide-react";

// --- Types ---
const PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;
const STATUSES = ["Open", "In Progress", "Waiting", "Resolved", "Closed"] as const;
const CATEGORIES = ["Hardware", "Software", "Network", "Account/Access", "Security", "Other"] as const;

type Priority = typeof PRIORITIES[number];
type Status = typeof STATUSES[number];

type Ticket = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: Status;
  requester: string;
  assignee?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};
const STORAGE_KEY = "helpdesk_tickets_v1";
const loadTickets = (): Ticket[] => {  
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Ticket[];
  } catch {
    return [];
  }
};
const saveTickets = (tickets: Ticket[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));

const priorityBadgeStyle: Record<Priority, string> = {
  Low: "bg-green-100 text-green-700",
  Medium: "bg-yellow-100 text-yellow-700",
  High: "bg-orange-100 text-orange-700",
  Critical: "bg-red-100 text-red-700",
};

const statusBadgeStyle: Record<Status, string> = {
  Open: "bg-blue-100 text-blue-700",
  "In Progress": "bg-purple-100 text-purple-700",
  Waiting: "bg-gray-100 text-gray-700",
  Resolved: "bg-emerald-100 text-emerald-700",
  Closed: "bg-slate-200 text-slate-700",
};
export default function HelpdeskApp() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("updatedAt_desc");
  const [editing, setEditing] = useState<Ticket | null>(null);

  useEffect(() => {
    setTickets(loadTickets());
  }, []);
  useEffect(() => {
    saveTickets(tickets);
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...tickets];
    if (q) {
      list = list.filter((t) =>
        [t.title, t.description, t.requester, t.assignee].filter(Boolean).some((f: any) => String(f).toLowerCase().includes(q))
      );
    }
    if (priorityFilter !== "All") list = list.filter((t) => t.priority === priorityFilter);
    if (statusFilter !== "All") list = list.filter((t) => t.status === statusFilter);
    if (categoryFilter !== "All") list = list.filter((t) => t.category === categoryFilter);

    switch (sortBy) {
      case "createdAt_asc":
        list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        break;
      case "createdAt_desc":
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case "priority_desc": {
        const order = Object.fromEntries(PRIORITIES.map((p, i) => [p, i]));
        list.sort((a, b) => order[b.priority] - order[a.priority]);
        break;
      }
      case "priority_asc": {
        const order = Object.fromEntries(PRIORITIES.map((p, i) => [p, i]));
        list.sort((a, b) => order[a.priority] - order[b.priority]);
        break;
      }
      case "updatedAt_asc":
        list.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
        break;
      case "updatedAt_desc":
      default:
        list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        break;
    }
    return list;
  }, [tickets, query, priorityFilter, statusFilter, categoryFilter, sortBy]);

  const stats = useMemo(() => {
    const total = tickets.length;
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, tickets.filter((t) => t.status === s).length]));
    const byPriority = Object.fromEntries(PRIORITIES.map((p) => [p, tickets.filter((t) => t.priority === p).length]));
    return { total, byStatus, byPriority } as any;
  }, [tickets]);

  const upsertTicket = (data: Partial<Ticket>, ticket?: Ticket) => {
    if (ticket) {
      const updated: Ticket = { ...ticket, ...data, updatedAt: new Date().toISOString() } as Ticket;
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? updated : t)));
      setEditing(null);
      return;
    }
    const now = new Date().toISOString();
    const newTicket: Ticket = {
      id: uuidv4(),
      title: data.title || "Untitled",
      description: data.description || "",
      category: (data.category as string) || "Other",
      priority: (data.priority as Priority) || "Medium",
      status: (data.status as Status) || "Open",
      requester: (data.requester as string) || "Anonymous",
      assignee: (data.assignee as string) || "",
      createdAt: now,
      updatedAt: now,
    };
    setTickets((prev) => [newTicket, ...prev]);
  };

  const removeTicket = (id: string) => setTickets((prev) => prev.filter((t) => t.id !== id));
  const quickStatus = (id: string, status: Status) => setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t)));
  
  const clearAll = () => {
    if (confirm("Clear all tickets?")) setTickets([]);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">IT Support Helpdesk</h1>
            <p className="text-slate-600">Lightweight ticketing app – local only, no server required.</p>
          </div>

          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="rounded-2xl px-4 py-2 gap-2 flex items-center"><Plus className="w-4 h-4"/> New Ticket</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Ticket</DialogTitle>
                </DialogHeader>
                <TicketForm onSubmit={(data) => upsertTicket(data)} />
              </DialogContent>
            </Dialog>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" className="rounded-2xl" onClick={clearAll}><Trash2 className="w-4 h-4"/></Button>
                </TooltipTrigger>
                <TooltipContent>Clear all tickets</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </header>

        {/* Filters */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <Input placeholder="Search tickets..." className="pl-9 rounded-2xl" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs text-slate-500">Priority</Label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="rounded-2xl"><SelectValue placeholder="All"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    {PRIORITIES.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs text-slate-500">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="rounded-2xl"><SelectValue placeholder="All"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    {STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs text-slate-500">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="rounded-2xl"><SelectValue placeholder="All"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    {CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs text-slate-500">Sort by</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updatedAt_desc">Last updated (newest)</SelectItem>
                    <SelectItem value="updatedAt_asc">Last updated (oldest)</SelectItem>
                    <SelectItem value="createdAt_desc">Created (newest)</SelectItem>
                    <SelectItem value="createdAt_asc">Created (oldest)</SelectItem>
                    <SelectItem value="priority_desc">Priority (high → low)</SelectItem>
                    <SelectItem value="priority_asc">Priority (low → high)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Kpi title="Total" value={stats.total} />
          {STATUSES.map((s) => (
            <Kpi key={s} title={s} value={(stats.byStatus?.[s] as number) || 0} />
          )).slice(0,4)}
        </div>

        {/* Table */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-4 h-4"/> Tickets
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <Table>
                <TableCaption>Local tickets are saved to your browser storage.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="min-w-[120px]">Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="min-w-[120px]">Requester</TableHead>
                    <TableHead className="min-w-[120px]">Assignee</TableHead>
                    <TableHead className="min-w-[160px]">Updated</TableHead>
                    <TableHead className="w-[160px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filtered.map((t) => (
                      <motion.tr key={t.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell>{t.category}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-2xl text-xs ${priorityBadgeStyle[t.priority]}`}>{t.priority}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-2xl text-xs ${statusBadgeStyle[t.status]}`}>{t.status}</span>
                        </TableCell>
                        <TableCell>{t.requester}</TableCell>
                        <TableCell>{t.assignee || "–"}</TableCell>
                        <TableCell title={new Date(t.updatedAt).toLocaleString()}>{new Date(t.updatedAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => setEditing(t)}>
                                    <Edit3 className="w-4 h-4"/>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <QuickStatusMenu onChange={(s) => quickStatus(t.id, s)} />

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="destructive" className="rounded-xl" onClick={() => removeTicket(t.id)}>
                                    <Trash2 className="w-4 h-4"/>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Ticket</DialogTitle>
            </DialogHeader>
            {editing && (
              <TicketForm
                initial={editing}
                onSubmit={(data) => upsertTicket(data, editing)}
                onCancel={() => setEditing(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Footer */}
        <div className="text-xs text-slate-400 text-center py-6">Local demo app • Export/Sync to a server can be added later.</div>
      </div>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: number }) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-4">
        <div className="space-y-1">
          <div className="text-sm text-slate-500">{title}</div>
          <div className="text-2xl font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickStatusMenu({ onChange }: { onChange: (s: Status) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => setOpen((v) => !v)}>
        <ChevronDown className="w-4 h-4"/>
        Status
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute z-10 mt-2 w-40 rounded-2xl border bg-white p-2 shadow-lg">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => { onChange(s); setOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50">
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TicketForm({ initial, onSubmit, onCancel }: { initial?: Partial<Ticket>; onSubmit: (data: Partial<Ticket>) => void; onCancel?: () => void }) {
  const [form, setForm] = useState<Partial<Ticket>>({
    title: initial?.title || "",
    description: initial?.description || "",
    category: initial?.category || CATEGORIES[0],
    priority: initial?.priority || "Medium",
    status: initial?.status || "Open",
    requester: initial?.requester || "",
    assignee: initial?.assignee || "",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input required value={form.title as string} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="rounded-2xl"/>
        </div>
        <div className="space-y-2">
          <Label>Requester</Label>
          <Input required value={form.requester as string} onChange={(e) => setForm((f) => ({ ...f, requester: e.target.value }))} className="rounded-2xl"/>
        </div>
        <div className="space-y-2">
          <Label>Assignee</Label>
          <Input value={form.assignee as string} onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))} className="rounded-2xl"/>
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={form.category as string} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
            <SelectTrigger className="rounded-2xl"><SelectValue/></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={form.priority as string} onValueChange={(v) => setForm((f) => ({ ...f, priority: v as Priority }))}>
            <SelectTrigger className="rounded-2xl"><SelectValue/></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status as string} onValueChange={(v) => setForm((f) => ({ ...f, status: v as Status }))}>
            <SelectTrigger className="rounded-2xl"><SelectValue/></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea rows={5} value={form.description as string} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="rounded-2xl"/>
      </div>

      <div className="flex items-center gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} className="rounded-2xl">Cancel</Button>
        )}
        <Button type="submit" className="rounded-2xl gap-2"><CheckCircle2 className="w-4 h-4"/> Save</Button>
      </div>
    </form>
  );
}
