import { useState, useMemo } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteTenant, loadBills, loadTenants, saveTenant, uid } from "@/lib/storage";
import type { Tenant } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  User, 
  Phone, 
  Hash, 
  Search, 
  Users,
  ChevronRight,
  FileText,
  MessageSquare
} from "lucide-react";
import { Link } from "react-router-dom";

const Tenants = () => {
  const [tenants, setTenants] = useState<Tenant[]>(() => loadTenants());
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Tenant | null>(null);
  const [search, setSearch] = useState("");

  const refresh = () => setTenants(loadTenants());

  const openNew = () => {
    setEditing({
      id: uid(),
      name: "",
      meterId: "",
      phone: "",
      notes: "",
      createdAt: new Date().toISOString(),
    });
    setOpen(true);
  };

  const openEdit = (t: Tenant) => {
    setEditing({ ...t });
    setOpen(true);
  };

  const onSave = () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    saveTenant({
      ...editing,
      name: editing.name.trim(),
      meterId: editing.meterId?.trim() || undefined,
      phone: editing.phone?.trim() || undefined,
      notes: editing.notes?.trim() || undefined,
    });
    refresh();
    setOpen(false);
    toast({ title: "Tenant configuration saved", description: `${editing.name} has been updated.` });
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteTenant(toDelete.id);
    refresh();
    toast({ title: "Tenant removed", description: "All past bills remain intact." });
    setToDelete(null);
  };

  const bills = useMemo(() => loadBills(), []);
  const billCount = (name: string) =>
    bills.filter((b) => b.tenantName.trim().toLowerCase() === name.trim().toLowerCase()).length;

  const filteredTenants = useMemo(() => {
    const q = search.toLowerCase();
    return tenants.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.meterId?.toLowerCase().includes(q) || 
      t.phone?.includes(q)
    );
  }, [tenants, search]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      {/* Premium Header */}
      <div className="bg-gradient-hero py-12 text-primary-foreground shadow-lg">
        <div className="container max-w-4xl px-4 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/20 ring-1 ring-accent/40 backdrop-blur-md">
            <Users className="h-8 w-8 text-accent" strokeWidth={2} />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Tenant Management</h1>
          <p className="mx-auto mt-3 max-w-md text-primary-foreground/70">
            Keep track of all your sub-meters and quickly generate bills for registered tenants.
          </p>
        </div>
      </div>

      <main className="container -mt-8 max-w-3xl px-4 pb-32">
        {/* Search & Actions Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted opacity-50" />
            <Input
              placeholder="Search by name, meter ID, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 border-none bg-white pl-10 shadow-soft ring-1 ring-paper-line focus-visible:ring-accent"
            />
          </div>
          <Button onClick={openNew} className="h-12 gap-2 bg-gradient-accent px-6 text-base font-bold text-accent-foreground shadow-accent active:scale-95 transition-all">
            <Plus className="h-5 w-5" strokeWidth={3} /> Add Tenant
          </Button>
        </div>

        {filteredTenants.length === 0 ? (
          <Card className="flex flex-col items-center justify-center border-none bg-gradient-paper p-12 text-center shadow-card ring-1 ring-paper-line">
            <div className="grid h-20 w-20 place-items-center rounded-3xl bg-white shadow-soft">
              <User className="h-10 w-10 text-ink-muted/30" />
            </div>
            <h3 className="mt-6 font-display text-xl font-bold text-ink">No tenants found</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm text-ink-muted">
              {search ? `We couldn't find any results for "${search}".` : "Add your first tenant to start generating bills faster."}
            </p>
            {!search && (
              <Button onClick={openNew} variant="outline" className="mt-6 h-11 px-8">
                Add First Tenant
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredTenants.map((t) => {
              const count = billCount(t.name);
              return (
                <div
                  key={t.id}
                  className="group flex items-center gap-4 rounded-2xl border border-paper-line bg-white p-4 shadow-soft transition-all hover:scale-[1.01] hover:shadow-card hover:ring-1 hover:ring-accent/20"
                >
                  <Link
                    to={`/tenants/${t.id}`}
                    className="flex min-w-0 flex-1 items-center gap-4"
                  >
                    <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-hero text-accent shadow-soft transition-transform group-hover:scale-110">
                      <User className="h-6 w-6" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-display text-lg font-bold text-ink">{t.name}</span>
                        {count > 0 && (
                          <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                            <FileText className="h-2.5 w-2.5" /> Active
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                        {t.meterId && (
                          <span className="flex items-center gap-1.5">
                            <Hash className="h-3.5 w-3.5 opacity-50" /> {t.meterId}
                          </span>
                        )}
                        {t.phone && (
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 opacity-50" /> {t.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 opacity-50" /> {count} Bill{count === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                  </Link>
                  
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(t)}
                      className="h-10 w-10 text-ink-muted hover:bg-secondary hover:text-ink"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setToDelete(t)}
                      className="h-10 w-10 text-ink-muted hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="ml-2 text-ink-muted/20">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modern Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
              <User className="h-6 w-6 text-accent" />
            </div>
            <DialogTitle className="font-display text-2xl font-bold text-ink">
              {editing && tenants.find((t) => t.id === editing.id) ? "Edit Profile" : "Register Tenant"}
            </DialogTitle>
            <DialogDescription className="text-ink-muted">
              Registration data is encrypted and stored locally.
            </DialogDescription>
          </DialogHeader>
          
          {editing && (
            <div className="grid gap-5 py-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Full Name *</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. Rajesh Kumar"
                  className="h-12 border-paper-line bg-secondary/30 focus-visible:bg-white"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Meter ID / Flat</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted/50" />
                    <Input
                      value={editing.meterId ?? ""}
                      onChange={(e) => setEditing({ ...editing, meterId: e.target.value })}
                      placeholder="SM-01"
                      className="h-11 border-paper-line bg-secondary/30 pl-9 focus-visible:bg-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted/50" />
                    <Input
                      value={editing.phone ?? ""}
                      onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                      placeholder="91..."
                      className="h-11 border-paper-line bg-secondary/30 pl-9 font-mono-bill focus-visible:bg-white"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Internal Notes</Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-ink-muted/50" />
                  <Input
                    value={editing.notes ?? ""}
                    onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                    placeholder="Reference for late fees, move-in date, etc."
                    className="h-12 border-paper-line bg-secondary/30 pl-10 focus-visible:bg-white"
                  />
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setOpen(false)} className="h-12 text-ink-muted hover:bg-secondary">
              Dismiss
            </Button>
            <Button onClick={onSave} className="h-12 px-8 bg-gradient-hero text-primary-foreground font-bold active:scale-95 transition-all">
              Save Tenant Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl font-bold">Unregister Tenant?</AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              This will remove <strong>{toDelete?.name}</strong> from your active directory. 
              Past billing records will not be deleted, but this profile will be gone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="h-12 border-none bg-secondary/50 hover:bg-secondary">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="h-12 bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20 hover:bg-destructive/90"
            >
              Confirm Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Tenants;
