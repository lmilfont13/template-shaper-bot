import { useState, useEffect } from "react";
import { DocumentGenerator } from "@/components/DocumentGenerator";
import { DocumentHistory } from "@/components/DocumentHistory";
import { TemplateManager } from "@/components/TemplateManager";
import { EmployeeManager } from "@/components/EmployeeManager";
import { ColigadaManager } from "@/components/ColigadaManager";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  LogOut,
  History,
  Users,
  LayoutTemplate as Template,
  Building2,
  PlusCircle,
  LayoutDashboard,
  Menu,
  X
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import tarhgetLogo from "@/assets/tarhget-logo.png";
import { cn } from "@/lib/utils";

const Index = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("generate");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center animate-in fade-in duration-500">
          <div className="relative h-20 w-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
            <FileText className="absolute inset-0 m-auto h-8 w-8 text-indigo-600" />
          </div>
          <p className="text-slate-500 font-medium tracking-tight">Iniciando Sistema...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const navItems = [
    { id: "generate", label: "Gerar Documento", icon: PlusCircle, adminOnly: false },
    { id: "history", label: "Histórico de Envios", icon: History, adminOnly: false },
    { id: "coligadas", label: "Empresas Coligadas", icon: Building2, adminOnly: true },
    { id: "employees", label: "Gestão de Funcionários", icon: Users, adminOnly: true },
    { id: "templates", label: "Modelos de Documento", icon: Template, adminOnly: true },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Overlay (Mobile) */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden absolute top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-slate-200"
        >
          <Menu className="h-6 w-6 text-slate-600" />
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 shadow-sm flex flex-col",
          !isSidebarOpen && "-translate-x-full"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-md">
              <img src={tarhgetLogo} alt="Logo" className="h-6 w-auto brightness-0 invert" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">Tarhget Docs</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto mt-4">
          <div className="px-3 mb-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Principal</p>
          </div>
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-semibold shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-600 rounded-r-full" />
                )}
                <Icon className={cn("h-5 w-5", isActive ? "text-indigo-600" : "group-hover:text-slate-700")} />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100">
          <div className="flex items-center gap-3 p-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-white shadow-sm">
              <span className="text-indigo-700 font-bold text-sm">{user.email?.substring(0, 2).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{user.email}</p>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">{isAdmin ? 'Administrador' : 'Gestor'}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair do Sistema
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative">
        {/* Header (Top Bar) */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-slate-800">
              {navItems.find(i => i.id === activeTab)?.label}
            </h2>
            <div className="h-4 w-px bg-slate-200 mx-2" />
            <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
              <LayoutDashboard className="h-3 w-3" />
              Dashboard / {navItems.find(i => i.id === activeTab)?.label}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600/10 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider border border-indigo-100">
              Versão 1.2 SaaS
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-10 custom-scrollbar relative">
          <div className="max-w-6xl mx-auto animate-in slide-in-from-bottom-4 duration-700">
            {activeTab === "generate" && <DocumentGenerator />}
            {activeTab === "history" && <DocumentHistory />}
            {activeTab === "coligadas" && isAdmin && <ColigadaManager />}
            {activeTab === "employees" && isAdmin && <EmployeeManager />}
            {activeTab === "templates" && isAdmin && <TemplateManager />}
          </div>
        </div>

        {/* Decorative corner bg */}
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none -mr-32 -mb-32" />
      </main>
    </div>
  );
};

export default Index;
