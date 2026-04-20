import { useState } from "react";
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
  DialogTrigger,
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
import { Plus, Pencil, Trash2, User, Phone, Hash } from "lucide-react";
import { Link } from "react-router-dom";

const Tenants = () => {
  const [tenants, setTenants] = useState<Tenant[]>(() => loadTenants());
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Tenant | null>(null);

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
    toast({ title: "Tenant saved" });
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteTenant(toDelete.id);
    refresh();
    toast({ title: "Tenant deleted" });
    setToDelete(null);
  };

  const billCount = (name: string) =>
    loadBills().filter((b) => b.tenantName.trim().toLowerCase() === name.trim().toLowerCase())
      .length;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-2xl px-4 pb-24 pt-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Tenants</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Save tenants to quickly fill new bills with a tap.
            </p>
          </div>
          <Button onClick={openNew} className="gap-1 bg-gradient-accent text-accent-foreground shadow-accent">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>

        {tenants.length === 0 ? (
          <Card className="mt-6 border-dashed bg-paper p-10 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary text-ink-muted">
              <User className="h-6 w-6" />
            </div>
            <p className="mt-3 font-medium text-ink">No tenants yet</p>
            <p className="mt-1 text-sm text-ink-muted">
              Tenants are also auto-saved when you generate a bill.
            </p>
            <Button asChild className="mt-4" variant="outline">
              <Link to="/new">Create a bill</Link>
            </Button>
          </Card>
        ) : (
          <ul className="mt-5 grid gap-2">
            {tenants.map((t) => {
              const count = billCount(t.name);
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-soft"
                >
                  <Link
                    to={`/tenants/${t.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-hero text-accent">
                      <User className="h-5 w-5" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-ink">{t.name}</div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-ink-muted">
                        {t.meterId && (
                          <span className="inline-flex items-center gap-1">
                            <Hash className="h-3 w-3" /> {t.meterId}
                          </span>
                        )}
                        {t.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {t.phone}
                          </span>
                        )}
                        <span>{count} bill{count === 1 ? "" : "s"}</span>
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => openEdit(t)}
                    className="rounded-md p-2 text-ink-muted hover:bg-secondary hover:text-ink"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setToDelete(t)}
                    className="rounded-md p-2 text-ink-muted hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {/* Edit / new dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <span hidden />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing && tenants.find((t) => t.id === editing.id) ? "Edit Tenant" : "New Tenant"}</DialogTitle>
            <DialogDescription>Stored locally on this device.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div>
                <Label className="text-xs text-ink-muted">Name *</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. Ravi Kumar"
                />
              </div>
              <div>
                <Label className="text-xs text-ink-muted">Meter ID</Label>
                <Input
                  value={editing.meterId ?? ""}
                  onChange={(e) => setEditing({ ...editing, meterId: e.target.value })}
                  placeholder="e.g. SM-2231"
                />
              </div>
              <div>
                <Label className="text-xs text-ink-muted">Phone (for WhatsApp)</Label>
                <Input
                  value={editing.phone ?? ""}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  placeholder="e.g. 919876543210"
                  className="font-mono-bill"
                />
              </div>
              <div>
                <Label className="text-xs text-ink-muted">Notes</Label>
                <Input
                  value={editing.notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes <strong>{toDelete?.name}</strong> from saved tenants. Their existing bills are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Tenants;
