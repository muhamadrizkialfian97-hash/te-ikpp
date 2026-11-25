import React from "react";
import { LayoutDashboard, Shield, LogOut, ArrowRight, Sparkles } from "lucide-react";
import PANCARAN_LOGO_DATA_URL from "../assets/logo";
import { UserAccount } from "../types";

interface ModuleSelectionPageProps {
  currentUser: UserAccount | null;
  onSelectModule: (module: "ikpp" | "hse") => void;
  onLogout: () => void;
}

export default function ModuleSelectionPage({
  currentUser,
  onSelectModule,
  onLogout,
}: ModuleSelectionPageProps) {
  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Dynamic Background Glowing Accents - Bright & Soft */}
      <div className="absolute top-[-10%] left-[-10%] w-[550px] h-[550px] bg-blue-100/70 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[550px] h-[550px] bg-emerald-100/60 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <img
            src={PANCARAN_LOGO_DATA_URL}
            alt="Pancaran Logo"
            className="w-11 h-11 object-contain rounded-xl bg-white p-1.5 shadow-sm border border-slate-200"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-slate-900 font-black tracking-wider text-lg leading-tight flex items-center gap-1.5">
              PANCARAN <span className="text-sky-700 font-extrabold text-xs px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200">PORTAL</span>
            </h1>
            <p className="text-slate-500 font-medium text-xs tracking-wide">
              Integrated Logistics & Operations System
            </p>
          </div>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3">
          {currentUser && (
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-bold text-slate-800 leading-tight">
                {currentUser.fullName}
              </span>
              <span className="text-[11px] text-slate-500">
                {currentUser.department || "Pancaran Team"} • {currentUser.role}
              </span>
            </div>
          )}
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer shadow-sm"
            title="Keluar / Logout"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Selection Area: HANYA DUA PILIHAN */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-5xl mx-auto w-full">
        {/* Title & Prompt */}
        <div className="text-center mb-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Menu Pilihan Khusus</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Pilih Menu Dashboard
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-2">
            Silakan pilih dashboard yang ingin Anda akses di bawah ini.
          </p>
        </div>

        {/* The 2 Dedicated Choices */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {/* Choice 1: Dashboard IKPP */}
          <button
            onClick={() => onSelectModule("ikpp")}
            className="group relative flex flex-col text-left p-8 rounded-3xl bg-white hover:bg-blue-50/20 border-2 border-slate-200/90 hover:border-blue-500 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-blue-500/10 cursor-pointer overflow-hidden transform hover:-translate-y-1.5"
          >
            {/* Top Accent Gradient Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 to-sky-400 opacity-90 group-hover:opacity-100 transition-opacity" />

            {/* Icon Header */}
            <div className="flex items-center justify-between w-full mb-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
                <LayoutDashboard className="w-7 h-7" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 group-hover:bg-blue-100 transition-colors">
                Operasional
              </span>
            </div>

            {/* Title & Description */}
            <div className="flex-1">
              <h3 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                Dashboard IKPP
              </h3>
              <p className="text-slate-600 text-sm mt-2.5 leading-relaxed">
                Cockpit operasional terintegrasi PT Indah Kiat Pulp & Paper Tbk (IKPP). Monitoring order armada, ketersediaan unit, pengiriman, dan performa SLA.
              </p>
            </div>

            {/* Action Footer */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-blue-600 font-bold text-sm group-hover:text-blue-700 transition-colors">
              <span>Masuk ke Dashboard IKPP</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center transition-all shadow-xs">
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </button>

          {/* Choice 2: Monitoring Driver */}
          <button
            onClick={() => onSelectModule("hse")}
            className="group relative flex flex-col text-left p-8 rounded-3xl bg-white hover:bg-emerald-50/20 border-2 border-slate-200/90 hover:border-emerald-500 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-emerald-500/10 cursor-pointer overflow-hidden transform hover:-translate-y-1.5"
          >
            {/* Top Accent Gradient Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 to-teal-400 opacity-90 group-hover:opacity-100 transition-opacity" />

            {/* Icon Header */}
            <div className="flex items-center justify-between w-full mb-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm">
                <Shield className="w-7 h-7" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 group-hover:bg-emerald-100 transition-colors">
                Safety & Health
              </span>
            </div>

            {/* Title & Description */}
            <div className="flex-1">
              <h3 className="text-2xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                Monitoring Driver
              </h3>
              <p className="text-slate-600 text-sm mt-2.5 leading-relaxed">
                Sistem Monitoring Kinerja & Keselamatan Driver. Pantau kepatuhan Tenko, evaluasi performa pengemudi, mobo activity monitoring, serta keselamatan berkendara.
              </p>
            </div>

            {/* Action Footer */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-emerald-600 font-bold text-sm group-hover:text-emerald-700 transition-colors">
              <span>Masuk ke Monitoring Driver</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 group-hover:bg-emerald-600 text-emerald-600 group-hover:text-white flex items-center justify-center transition-all shadow-xs">
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </button>
        </div>
      </main>

      {/* Footer Note */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} PT Pancaran Samudera Transport Tbk. All rights reserved.
      </footer>
    </div>
  );
}
