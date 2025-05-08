import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useAuth, AuthProvider } from "./context/AuthContext";
import AuthForm from "./components/auth/AuthForm";
import Dashboard from "./pages/Dashboard";
import LostFound from "./pages/LostFound";
import ContactMentor from "./pages/ContactMentor";
import MessBalance from "./pages/MessBalance";
import AcademicFees from "./pages/AcademicFees";
import ClassroomAllotment from "./pages/ClassroomAllotment";
import DashboardLayout from "./components/layout/DashboardLayout";
import { useEffect } from "react";
import { ThemeProvider } from "next-themes";

function LogoutRoute() {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    const performLogout = async () => {
      await logout();
      setLocation('/');
    };
    
    performLogout();
  }, [logout, setLocation]);
  
  return <div className="min-h-screen flex items-center justify-center">Logging out...</div>;
}

function LoginPreview() {
  return <AuthForm />;
}

function ProtectedRoutes() {
  const { isAuthenticated, checkAuth, user } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    console.log("ProtectedRoutes: Checking authentication on mount");
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    console.log("ProtectedRoutes: Auth state changed", { 
      isAuthenticated, 
      location,
      user: user ? { id: user.id, username: user.username } : null 
    });
    
    // Redirect to login if not authenticated and trying to access protected routes
    if (!isAuthenticated && location !== "/" && location !== "/login" && !location.startsWith("/auth") && location !== "/logout") {
      console.log("ProtectedRoutes: Redirecting to home due to authentication required");
      setLocation("/");
    }
  }, [isAuthenticated, location, setLocation, user]);

  return (
    <Switch>
      <Route path="/logout" component={LogoutRoute} />
      <Route path="/login" component={LoginPreview} />
    
      <Route path="/">
        {isAuthenticated ? (
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        ) : (
          <AuthForm />
        )}
      </Route>
      
      <Route path="/dashboard">
        {isAuthenticated ? (
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        ) : (
          <AuthForm />
        )}
      </Route>

      <Route path="/lost-found">
        {isAuthenticated ? (
          <DashboardLayout>
            <LostFound />
          </DashboardLayout>
        ) : (
          <AuthForm />
        )}
      </Route>

      <Route path="/contact-mentor">
        {isAuthenticated ? (
          <DashboardLayout>
            <ContactMentor />
          </DashboardLayout>
        ) : (
          <AuthForm />
        )}
      </Route>

      <Route path="/mess-balance">
        {isAuthenticated ? (
          <DashboardLayout>
            <MessBalance />
          </DashboardLayout>
        ) : (
          <AuthForm />
        )}
      </Route>

      <Route path="/academic-fees">
        {isAuthenticated ? (
          <DashboardLayout>
            <AcademicFees />
          </DashboardLayout>
        ) : (
          <AuthForm />
        )}
      </Route>

      <Route path="/classroom-allotment">
        {isAuthenticated ? (
          <DashboardLayout>
            <ClassroomAllotment />
          </DashboardLayout>
        ) : (
          <AuthForm />
        )}
      </Route>

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <ProtectedRoutes />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
