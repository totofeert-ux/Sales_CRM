import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { SimpleAuth } from "@/components/SimpleAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Pipeline from "./pages/Pipeline";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import { TasksProvider } from "@/hooks/use-tasks";
import { ContactsProvider } from "@/hooks/use-contacts";
import { DealsProvider } from "@/hooks/use-deals";
import { AddDealModalProvider } from "@/hooks/use-add-deal-modal";
import CalendarPage from "./pages/Calendar";
import Templates from "./pages/Templates";
import AuthDebug from "./pages/AuthDebug";
import ClientDealsDebug from "./dev/ClientDealsDebug";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SimpleAuth />
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <TasksProvider>
          <ContactsProvider>
            <DealsProvider>
              <AddDealModalProvider>
                <SidebarProvider>
                  <div className="min-h-screen flex w-full">
                    <AppSidebar />
                    <div className="flex-1 flex flex-col">
                      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
                        <div className="container flex h-14 items-center px-4">
                          <SidebarTrigger className="mr-4" />
                          <div className="flex-1" />
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{user.email}</span>
                            <button
                              onClick={() => supabase.auth.signOut()}
                              className="text-sm text-muted-foreground hover:text-foreground"
                            >
                              Sign Out
                            </button>
                          </div>
                        </div>
                      </header>
                      <main className="flex-1 container p-6">
                        <Routes>
                          <Route path="/" element={<Navigate to="/overview" replace />} />
                          <Route path="/overview" element={<Index />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/clients" element={<Clients />} />
                          <Route path="/clients/:id" element={<ClientDetail />} />
                          <Route path="/pipeline" element={<Pipeline />} />
                          <Route path="/calendar" element={<CalendarPage />} />
                          <Route path="/templates" element={<Templates />} />
                          <Route path="/auth-debug" element={<AuthDebug />} />
                          <Route path="/dev/client-deals-debug" element={<ClientDealsDebug />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
              </AddDealModalProvider>
            </DealsProvider>
          </ContactsProvider>
        </TasksProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
