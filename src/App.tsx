import React, { useState, useEffect } from "react";
import Sidebar, { TabType } from "./components/Sidebar";
import Header from "./components/Header";
import Overview from "./pages/Overview";
import OrderPage from "./pages/Order";
import AvailabilityPage from "./pages/Availability";
import ShipmentPage from "./pages/Shipment";
import UserApprovalPage from "./pages/UserApprovalPage";
import MasterLookupPage from "./pages/MasterLookupPage";

import HseDashboardPage from "./pages/HseDashboardPage";
import TikProLiveDashboard from "./components/TikProLiveDashboard";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import ModuleSelectionPage from "./pages/ModuleSelectionPage";
import { UserAccount } from "./types";
import { getUsers, isDigitalSolutionUser, isCsUser, isAuthorizedDashboardUser } from "./lib/userStore";

const SESSION_USER_KEY = "pancaran_logged_in_user_v1";
const SESSION_TAB_KEY = "pancaran_active_tab_v1";
const SESSION_MODULE_KEY = "pancaran_selected_module_v1";

export { isDigitalSolutionUser, isCsUser, isAuthorizedDashboardUser };

export default function App() {
  // Current Logged In User Account (persisted in localStorage)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const savedUser = localStorage.getItem(SESSION_USER_KEY);
      if (savedUser) {
        return JSON.parse(savedUser);
      }
    } catch (e) {
      console.error("Failed to load saved user session:", e);
    }
    return null;
  });

  // Selected Dashboard Module ('ikpp' | 'hse' | null)
  const [selectedModule, setSelectedModule] = useState<"ikpp" | "hse" | null>(() => {
    if (typeof window === "undefined") return null;
    const savedUser = localStorage.getItem(SESSION_USER_KEY);
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (isCsUser(parsed)) return "ikpp";
      } catch {}
    }
    return (localStorage.getItem(SESSION_MODULE_KEY) as "ikpp" | "hse") || "ikpp";
  });

  // Navigation View State ('landing' | 'login' | 'module_select' | 'dashboard')
  const [view, setView] = useState<"landing" | "login" | "module_select" | "dashboard">(() => {
    if (typeof window === "undefined") return "landing";
    const savedUser = localStorage.getItem(SESSION_USER_KEY);
    if (!savedUser) return "landing";
    try {
      const parsed = JSON.parse(savedUser);
      // Only authorized users (Digital Solution & CS) can access
      if (!isAuthorizedDashboardUser(parsed)) {
        return "landing";
      }
      // CS users always go directly to Dashboard IKPP, never module_select!
      if (isCsUser(parsed)) {
        return "dashboard";
      }
    } catch {
      return "landing";
    }
    const savedMod = localStorage.getItem(SESSION_MODULE_KEY);
    return savedMod ? "dashboard" : "module_select";
  });

  const [initialPortal, setInitialPortal] = useState<"customer" | "internal" | "partner">("internal");

  // Dashboard Active Tab State
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window === "undefined") return "overview";
    const savedTab = localStorage.getItem(SESSION_TAB_KEY) as TabType;
    return savedTab || "overview";
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Filter deep-linking state from Overview cards to Order page
  const [initialOrderFilter, setInitialOrderFilter] = useState<string | undefined>(undefined);

  // Persist current active tab when inside dashboard
  useEffect(() => {
    if (view === "dashboard" && activeTab) {
      localStorage.setItem(SESSION_TAB_KEY, activeTab);
    }
  }, [activeTab, view]);

  // Enforce CS account restrictions: CS must never enter module_select or hse
  useEffect(() => {
    if (currentUser && isCsUser(currentUser)) {
      if (view === "module_select") {
        setSelectedModule("ikpp");
        localStorage.setItem(SESSION_MODULE_KEY, "ikpp");
        setView("dashboard");
      }
      if (selectedModule === "hse") {
        setSelectedModule("ikpp");
        localStorage.setItem(SESSION_MODULE_KEY, "ikpp");
      }
    }
  }, [view, currentUser, selectedModule]);

  // Sync latest user details from userStore DB on session load
  useEffect(() => {
    if (currentUser?.email) {
      const allUsers = getUsers();
      const latest = allUsers.find((u) => u.email.toLowerCase() === currentUser.email.toLowerCase());
      if (latest && latest.status === "active") {
        if (JSON.stringify(latest) !== JSON.stringify(currentUser)) {
          setCurrentUser(latest);
          localStorage.setItem(SESSION_USER_KEY, JSON.stringify(latest));
        }
      } else if (latest && latest.status !== "active") {
        handleSignOut();
      }
    }
  }, []);

  // Deep-linking navigation handler
  const handleNavigate = (tab: TabType, filterType?: string) => {
    if (tab === "order" && filterType) {
      setInitialOrderFilter(filterType);
    } else {
      setInitialOrderFilter(undefined);
    }
    setActiveTab(tab);
  };

  const handleLoginSuccess = (user: UserAccount | null) => {
    if (user) {
      setCurrentUser(user);
      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));

      if (isCsUser(user)) {
        // Akun CS: LANGSUNG MASUK DASHBOARD IKPP, TIDAK ADA TAMPILAN PILIH MENU IKPP ATAU HSE!
        setSelectedModule("ikpp");
        localStorage.setItem(SESSION_MODULE_KEY, "ikpp");
        setActiveTab("overview");
        localStorage.setItem(SESSION_TAB_KEY, "overview");
        setView("dashboard");
      } else if (isDigitalSolutionUser(user)) {
        // Digital Solution user: show dedicated choice menu (Module Selection)
        localStorage.removeItem(SESSION_MODULE_KEY);
        localStorage.setItem(SESSION_TAB_KEY, "overview");
        setSelectedModule(null);
        setView("module_select");
      } else {
        // Default to IKPP dashboard directly
        setSelectedModule("ikpp");
        localStorage.setItem(SESSION_MODULE_KEY, "ikpp");
        setActiveTab("overview");
        localStorage.setItem(SESSION_TAB_KEY, "overview");
        setView("dashboard");
      }
    } else {
      handleSignOut();
    }
  };

  const handleSelectModule = (module: "ikpp" | "hse") => {
    // If CS user, force ikpp only
    if (isCsUser(currentUser)) {
      setSelectedModule("ikpp");
      localStorage.setItem(SESSION_MODULE_KEY, "ikpp");
      setActiveTab("overview");
      localStorage.setItem(SESSION_TAB_KEY, "overview");
      setView("dashboard");
      return;
    }
    setSelectedModule(module);
    localStorage.setItem(SESSION_MODULE_KEY, module);
    if (module === "ikpp") {
      setActiveTab("overview");
      localStorage.setItem(SESSION_TAB_KEY, "overview");
    } else {
      setActiveTab("hse_dashboard");
      localStorage.setItem(SESSION_TAB_KEY, "hse_dashboard");
    }
    setView("dashboard");
  };

  const handleOpenModuleSelect = () => {
    if (!isDigitalSolutionUser(currentUser)) {
      setSelectedModule("ikpp");
      setView("dashboard");
      return;
    }
    localStorage.removeItem(SESSION_MODULE_KEY);
    setSelectedModule(null);
    setView("module_select");
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_USER_KEY);
    localStorage.removeItem(SESSION_TAB_KEY);
    localStorage.removeItem(SESSION_MODULE_KEY);
    setSelectedModule(null);
    setView("landing");
  };

  const handleOpenLogin = (portal: "customer" | "internal" | "partner" = "customer") => {
    setInitialPortal(portal);
    setView("login");
  };

  // Views handling
  if (view === "landing") {
    return <LandingPage onLogin={handleOpenLogin} />;
  }

  if (view === "login") {
    return (
      <LoginPage
        initialPortal={initialPortal}
        onBackToHome={() => setView("landing")}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  if (view === "module_select") {
    // If not Digital Solution, redirect immediately to IKPP dashboard - no module selection display!
    if (!isDigitalSolutionUser(currentUser) || isCsUser(currentUser)) {
      setSelectedModule("ikpp");
      localStorage.setItem(SESSION_MODULE_KEY, "ikpp");
      setView("dashboard");
      return null;
    }

    return (
      <ModuleSelectionPage
        currentUser={currentUser}
        onSelectModule={handleSelectModule}
        onLogout={handleSignOut}
      />
    );
  }

  // Guard for dashboard views: ensure user is logged in
  if (view === "dashboard" && !currentUser) {
    return <LandingPage onLogin={handleOpenLogin} />;
  }

  // HSE dashboard is strictly for Digital Solution, never CS
  if (selectedModule === "hse" && !isCsUser(currentUser)) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-gray-50 dark:bg-slate-950 flex flex-col p-4 md:p-6 transition-colors duration-200">
        <HseDashboardPage onBackToMenu={handleOpenModuleSelect} onLogout={handleSignOut} />
      </div>
    );
  }

  const isCS = isCsUser(currentUser);

  // Get dynamic titles and subtitles for each view, adjusted for CS role
  const headerDetails = {
    overview: {
      title: "Overview",
      subtitle: isCS 
        ? "PT Indah Kiat Pulp & Paper Tbk (IKPP) Customer Service Monitoring & Dispatch Cockpit"
        : "PT Indah Kiat Pulp & Paper Tbk (IKPP) Partner Overview Cockpit"
    },
    hse_dashboard: {
      title: "Monitoring Driver",
      subtitle: "Monitoring Kinerja, Kepatuhan & Keselamatan Driver"
    },
    logistik_pro: {
      title: "Dashboard Logistik Pro IKK",
      subtitle: "Live Firestore Realtime Sync - Summary Report, Daftar Armada & Laporan Ritase"
    },
    order: {
      title: "Order Management System",
      subtitle: isCS
        ? "Customer Service Desk: Search, filter, and track active IKPP container cargo orders"
        : "Search, filter, and track active container cargo orders"
    },
    availability: {
      title: "Resources & Fleet Availability",
      subtitle: "Track live vehicle statuses, container tier availability, and active drivers"
    },
    shipment: {
      title: "Dashboard - Shipment Tracking",
      subtitle: "Active pre-trip loading and on-trip container GPS transits"
    },
    user_approval: {
      title: "Aktivasi User Aktif & Approval Portal",
      subtitle: "Super Admin Governance - Persetujuan Registrasi & Kelola Hak Akses Login"
    },
    master_lookup: {
      title: "Master Lookup - Commercial Route Pivot",
      subtitle: "Pivot Table Analisis Commercial Route & Freight Type 2 (Sinkronisasi Antar Dashboard)"
    },

  }[activeTab];

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-gray-50/70 dark:bg-slate-950 text-gray-800 dark:text-slate-100 flex relative transition-colors duration-200">
      {/* Slide-out Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => handleNavigate(tab)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onGoToLanding={handleSignOut}
        currentUser={currentUser}
        onOpenModuleSelect={isDigitalSolutionUser(currentUser) ? handleOpenModuleSelect : undefined}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col h-screen max-h-screen overflow-hidden transition-all duration-300 w-full ${isSidebarOpen ? "md:pl-72" : "pl-0"}`}>
        {/* Shared top header - Fixed/Pinned at top */}
        <Header
          title={headerDetails.title}
          subtitle={headerDetails.subtitle}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          showBackButton={activeTab !== "logistik_pro" && activeTab !== "overview"}
          onBackClick={() => setActiveTab("overview")}
          currentUser={currentUser}
          onSwitchDashboard={isDigitalSolutionUser(currentUser) ? handleOpenModuleSelect : undefined}
        />

        {/* Page body - Header and page banner locked firmly at top, inner content scrolls smoothly */}
        <main className="p-4 md:p-6 flex-1 overflow-hidden flex flex-col max-w-none w-full mx-auto min-h-0">
          {activeTab === "logistik_pro" && (
            <TikProLiveDashboard />
          )}

          {activeTab === "overview" && (
            <Overview onNavigate={handleNavigate} currentUser={currentUser} />
          )}

          {activeTab === "hse_dashboard" && (
            <HseDashboardPage onBackToMenu={handleOpenModuleSelect} onLogout={handleSignOut} />
          )}

          {activeTab === "order" && (
            <OrderPage
              initialTypeFilter={initialOrderFilter}
              onClearInitialFilter={() => setInitialOrderFilter(undefined)}
              currentUser={currentUser}
            />
          )}

          {activeTab === "availability" && (
            <AvailabilityPage />
          )}

          {activeTab === "shipment" && (
            <ShipmentPage />
          )}

          {activeTab === "user_approval" && (
            (currentUser?.role === "Super Admin" || currentUser?.email?.toLowerCase() === "digital.solution@pancaran-logistic.id") ? (
              <UserApprovalPage />
            ) : (
              <Overview onNavigate={handleNavigate} />
            )
          )}

          {activeTab === "master_lookup" && (
            (isDigitalSolutionUser(currentUser) || isCsUser(currentUser) || !!currentUser) ? (
              <MasterLookupPage currentUser={currentUser} />
            ) : (
              <Overview onNavigate={handleNavigate} />
            )
          )}


        </main>
      </div>
    </div>
  );
}
