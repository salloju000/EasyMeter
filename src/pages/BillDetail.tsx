import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { BillView } from "@/components/BillView";
import { Button } from "@/components/ui/button";
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
import { deleteBill, findTenantByName, getBill, saveBill } from "@/lib/storage";
import type { Bill } from "@/lib/types";
import { exportNodeToPdf, shareNodeAsPdf } from "@/lib/share";
import {
  ArrowLeft,
  Download,
  Share2,
  CheckCircle2,
  RotateCcw,
  Pencil,
  Trash2,
  MessageCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/calc";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const BillDetail = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState<Bill | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const billRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    const b = getBill(id);
    if (!b) {
      toast({ title: "Bill not found", variant: "destructive" });
      navigate("/");
      return;
    }
    setBill(b);
  }, [id, navigate, user?.uid]);

  if (!bill) return null;

  const fmtMonthLabel = (m: string) => {
    const parts = m.split("-").map(Number);
    const [y, mm, dd] = parts;
    if (dd) return new Date(y, (mm || 1) - 1, dd).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    return new Date(y, (mm || 1) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  };

  const filename = `EasyMeter_${bill.tenantName.replace(/\s+/g, "_")}_${bill.billingMonth}.pdf`;
  const tenant = findTenantByName(bill.tenantName);
  const phone = tenant?.phone?.replace(/[^\d]/g, "") ?? "";

  const onDownload = async () => {
    if (!billRef.current) return;
    try {
      await exportNodeToPdf(billRef.current, filename);
      toast({ title: "PDF downloaded" });
    } catch {
      toast({ title: "Could not generate PDF", variant: "destructive" });
    }
  };

  const onShare = async () => {
    if (!billRef.current) return;
    try {
      await shareNodeAsPdf(
        billRef.current,
        filename,
        `Electricity bill for ${bill.tenantName} — ${fmtMonthLabel(bill.billingMonth)}`
      );
    } catch {
      toast({ title: "Sharing not supported", description: "PDF downloaded instead." });
    }
  };

  const onWhatsApp = () => {
    const sym = bill.tariff.currencySymbol || "₹";
    const lines = [
      `*Electricity Bill — EasyMeter*`,
      ``,
      `Hi ${bill.tenantName},`,
      `Your sub-meter bill for *${fmtMonthLabel(bill.billingMonth)}* is ready.`,
      ``,
      `• Units consumed: ${bill.calculation.unitsConsumed} kWh`,
      `• Previous: ${bill.previousReading}`,
      `• Current: ${bill.currentReading}`,
      `• Energy: ${formatMoney(bill.calculation.energyCharge, sym)}`,
      `• Fixed: ${formatMoney(bill.calculation.fixedCharge, sym)}`,
      `• Customer: ${formatMoney(bill.calculation.customerCharge, sym)}`,
      `• Duty: ${formatMoney(bill.calculation.electricityDuty, sym)}`,
    ];

    if (bill.calculation.interestOnED > 0) {
      lines.push(`• Interest on ED: ${formatMoney(bill.calculation.interestOnED, sym)}`);
    }
    if (bill.calculation.surcharge !== 0) {
      lines.push(`• Surcharges: ${formatMoney(bill.calculation.surcharge, sym)}`);
    }
    if (bill.calculation.lossGain !== 0) {
      const label = bill.calculation.lossGain > 0 ? "Loss" : "Gain";
      lines.push(`• ${label}: ${formatMoney(bill.calculation.lossGain, sym)}`);
    }
    if (bill.calculation.lateFee > 0) {
      lines.push(`• Late Fee: ${formatMoney(bill.calculation.lateFee, sym)}`);
    }

    lines.push(
      ``,
      `*Total payable: ${formatMoney(bill.calculation.total, sym)}*`,
      `• Due by: ${fmtDate(bill.dueDate)}`,
      ``,
      `Thank you!`,
    );
    const text = encodeURIComponent(lines.join("\n"));
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const togglePaid = () => {
    const next: Bill = {
      ...bill,
      paymentStatus: bill.paymentStatus === "paid" ? "unpaid" : "paid",
    };
    saveBill(next);
    setBill(next);
    toast({ title: next.paymentStatus === "paid" ? "Marked as paid" : "Marked as unpaid" });
  };

  const onDelete = () => {
    deleteBill(bill.id);
    toast({ title: "Bill deleted" });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-3xl px-4 pb-32 pt-5">
        <button
          onClick={() => navigate("/")}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink-muted/60 transition-colors hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" /> All Statements
        </button>

        <BillView ref={billRef} bill={bill} />

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button onClick={onDownload} variant="outline" className="gap-1">
            <Download className="h-4 w-4" /> PDF
          </Button>
          <Button
            onClick={onWhatsApp}
            className="gap-1 bg-success text-success-foreground hover:bg-success/90"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </Button>
          <Button
            onClick={onShare}
            className="gap-1 bg-gradient-accent text-accent-foreground shadow-accent"
          >
            <Share2 className="h-4 w-4" /> Share
          </Button>
          <Button onClick={togglePaid} variant="outline" className="gap-1">
            {bill.paymentStatus === "paid" ? (
              <>
                <RotateCcw className="h-4 w-4" /> Unpaid
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-success" /> Mark Paid
              </>
            )}
          </Button>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button asChild variant="outline" className="gap-1">
            <Link to={`/bill/${bill.id}/edit`}>
              <Pencil className="h-4 w-4" /> Edit
            </Link>
          </Button>
          <Button
            variant="outline"
            className="gap-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </main>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this bill?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the bill for <strong>{bill.tenantName}</strong> ·{" "}
              {fmtMonthLabel(bill.billingMonth)}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
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

export default BillDetail;
