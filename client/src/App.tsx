// Fixed App.tsx without double layout wrapping
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryClient, performanceUtils } from "@/lib/queryClient";
import { ErrorBoundary } from "@/components/Performance/ErrorBoundary";
import { DataPreloader } from "@/components/Performance/DataPreloader";
import { ReactNode } from "react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { authService } from "@/lib/auth";
import { useEffect, useState } from "react";
import LoginSimple from "@/pages/LoginSimple";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import BOQ from "@/pages/BOQ";
import MaterialRequests from "@/pages/MaterialRequests";
import InventoryMovement from "@/pages/InventoryMovement";
import InventoryOptimization from "@/pages/InventoryOptimization";
import Reports from "@/pages/Reports";
import Users from "@/pages/Users";
import Attendance from "@/pages/Attendance";
import PettyCash from "@/pages/PettyCash";
import Projects from "@/pages/Projects";
import Categories from "@/pages/Categories";
import Suppliers from "@/pages/Suppliers";
import Clients from "@/pages/Clients";
import SalesProducts from "@/pages/SalesProducts";
import OCRWizard from "@/pages/OCRWizard";
import PriceComparison from "@/pages/PriceComparison";
import DisplaySettings from "@/pages/DisplaySettings";
import Backups from "@/pages/Backups";
import SystemFlowchart from "@/pages/SystemFlowchart";
import WhatsAppExport from "@/pages/WhatsAppExport";
import ProductComparison from "@/pages/ProductComparison";
import PurchaseOrders from "@/pages/PurchaseOrders";
import ProjectDetail from "@/pages/ProjectDetail";
import TaskManagement from "@/pages/TaskManagement";
import BOMCalculator from "@/pages/BOMCalculator";
import BOMSettings from "@/pages/BOMSettings";
import ProductionPlanning from "@/pages/ProductionPlanning";
import WorkOrders from "@/pages/WorkOrders";
import QualityControl from "@/pages/QualityControl";
import WhatsAppConsole from "@/pages/WhatsAppConsole";
import CreateQuote from "@/pages/CreateQuote";
import EditQuote from "@/pages/EditQuote";

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('authUser');
        if (token && user) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginSimple />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login">
        {() => {
          if (authService.isAuthenticated()) {
            window.location.href = "/";
            return null;
          }
          return <LoginSimple />;
        }}
      </Route>
      
      {/* All routes without layout wrappers since components handle their own layouts */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/products">
        <ProtectedRoute>
          <Products />
        </ProtectedRoute>
      </Route>
      
      <Route path="/categories">
        <ProtectedRoute>
          <Categories />
        </ProtectedRoute>
      </Route>
      
      <Route path="/boq">
        <ProtectedRoute>
          <BOQ />
        </ProtectedRoute>
      </Route>
      
      <Route path="/requests">
        <ProtectedRoute>
          <MaterialRequests />
        </ProtectedRoute>
      </Route>
      
      <Route path="/material-requests">
        <ProtectedRoute>
          <MaterialRequests />
        </ProtectedRoute>
      </Route>
      
      <Route path="/inventory-movement">
        <ProtectedRoute>
          <InventoryMovement />
        </ProtectedRoute>
      </Route>
      
      <Route path="/inventory-optimization">
        <ProtectedRoute>
          <InventoryOptimization />
        </ProtectedRoute>
      </Route>
      
      <Route path="/reports">
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      </Route>
      
      <Route path="/users">
        <ProtectedRoute>
          <Users />
        </ProtectedRoute>
      </Route>
      
      <Route path="/attendance">
        <ProtectedRoute>
          <Attendance />
        </ProtectedRoute>
      </Route>
      
      <Route path="/petty-cash">
        <ProtectedRoute>
          <PettyCash />
        </ProtectedRoute>
      </Route>
      
      <Route path="/ocr-wizard">
        <ProtectedRoute>
          <OCRWizard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/projects">
        <ProtectedRoute>
          <Projects />
        </ProtectedRoute>
      </Route>
      
      <Route path="/projects/:projectId">
        <ProtectedRoute>
          <ProjectDetail />
        </ProtectedRoute>
      </Route>
      
      <Route path="/projects/:projectId/:tab">
        <ProtectedRoute>
          <ProjectDetail />
        </ProtectedRoute>
      </Route>
      
      <Route path="/projects/:projectId/quotes/create">
        <ProtectedRoute>
          <CreateQuote />
        </ProtectedRoute>
      </Route>
      
      <Route path="/projects/:projectId/quotes/:quoteId/edit">
        <ProtectedRoute>
          <EditQuote />
        </ProtectedRoute>
      </Route>
      
      <Route path="/suppliers">
        <ProtectedRoute>
          <Suppliers />
        </ProtectedRoute>
      </Route>
      
      <Route path="/clients">
        <ProtectedRoute>
          <Clients />
        </ProtectedRoute>
      </Route>
      
      <Route path="/sales-products">
        <ProtectedRoute>
          <SalesProducts />
        </ProtectedRoute>
      </Route>
      
      <Route path="/price-comparison">
        <ProtectedRoute>
          <PriceComparison />
        </ProtectedRoute>
      </Route>
      
      <Route path="/display-settings">
        <ProtectedRoute>
          <DisplaySettings />
        </ProtectedRoute>
      </Route>
      
      <Route path="/backups">
        <ProtectedRoute>
          <Backups />
        </ProtectedRoute>
      </Route>
      
      <Route path="/system-flowchart">
        <ProtectedRoute>
          <SystemFlowchart />
        </ProtectedRoute>
      </Route>
      
      <Route path="/whatsapp">
        <ProtectedRoute>
          <WhatsAppExport />
        </ProtectedRoute>
      </Route>
      
      <Route path="/product-comparison">
        <ProtectedRoute>
          <ProductComparison />
        </ProtectedRoute>
      </Route>
      
      <Route path="/purchase-orders">
        <ProtectedRoute>
          <PurchaseOrders />
        </ProtectedRoute>
      </Route>
      
      <Route path="/tasks">
        <ProtectedRoute>
          <TaskManagement />
        </ProtectedRoute>
      </Route>
      
      <Route path="/tasks/:taskId">
        <ProtectedRoute>
          <TaskManagement />
        </ProtectedRoute>
      </Route>
      
      <Route path="/bom-calculator">
        <ProtectedRoute>
          <BOMCalculator />
        </ProtectedRoute>
      </Route>
      
      <Route path="/bom-settings">
        <ProtectedRoute>
          <BOMSettings />
        </ProtectedRoute>
      </Route>
      
      <Route path="/production/planning">
        <ProtectedRoute>
          <ProductionPlanning />
        </ProtectedRoute>
      </Route>
      
      <Route path="/production/work-orders">
        <ProtectedRoute>
          <WorkOrders />
        </ProtectedRoute>
      </Route>
      
      <Route path="/production/quality">
        <ProtectedRoute>
          <QualityControl />
        </ProtectedRoute>
      </Route>
      
      <Route path="/whatsapp-console">
        <ProtectedRoute>
          <WhatsAppConsole />
        </ProtectedRoute>
      </Route>
      
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <DataPreloader routes={['Dashboard', 'Projects', 'ProductionPlanning']}>
          <ThemeProvider>
            <Router />
            <Toaster />
          </ThemeProvider>
        </DataPreloader>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}