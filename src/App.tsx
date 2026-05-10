import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { setFirebaseErrorHandler } from "@/lib/storage";
import { toast } from "@/hooks/use-toast";
import Index from "./pages/Index.tsx";
import NewBill from "./pages/NewBill.tsx";
import BillDetail from "./pages/BillDetail.tsx";
import Tariff from "./pages/Tariff.tsx";
import Tenants from "./pages/Tenants.tsx";
import TenantHistory from "./pages/TenantHistory.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    setFirebaseErrorHandler((error) => {
      toast({
        title: "Sync failed",
        description: "Data saved locally but Firebase sync failed. Check your connection.",
        variant: "destructive",
      });
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/new" element={<NewBill />} />
            <Route path="/bill/:id" element={<BillDetail />} />
            <Route path="/bill/:id/edit" element={<NewBill />} />
            <Route path="/tenants" element={<Tenants />} />
            <Route path="/tenants/:id" element={<TenantHistory />} />
            <Route path="/tariff" element={<Tariff />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
