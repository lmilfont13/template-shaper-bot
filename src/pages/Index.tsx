import { DocumentGenerator } from "@/components/DocumentGenerator";
import { DocumentHistory } from "@/components/DocumentHistory";
import { TemplateManager } from "@/components/TemplateManager";
import { EmployeeManager } from "@/components/EmployeeManager";
import { ColigadaManager } from "@/components/ColigadaManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FileText, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import tarhgetLogo from "@/assets/tarhget-logo.png";

const Index = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <header className="mb-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6 group">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <img 
                  src={tarhgetLogo} 
                  alt="Tarhget Logo" 
                  className="relative h-20 w-auto drop-shadow-2xl transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl mb-1">
                  Sistema de Documentos
                </h1>
                <p className="text-xl text-primary font-bold tracking-widest uppercase opacity-80">
                  Tarhget
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="hover:bg-destructive/10 hover:text-destructive transition-all duration-300 rounded-full px-6"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Encerrar Sessão
            </Button>
          </div>
        </header>

        <Tabs defaultValue="generate" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex justify-center md:justify-start">
            <TabsList className={`glass-card p-1 h-auto ${isAdmin ? 'grid grid-cols-2 md:grid-cols-5' : 'grid grid-cols-2'} w-full max-w-4xl`}>
              <TabsTrigger value="generate" className="rounded-lg py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:premium-shadow transition-all duration-300">
                Gerar
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-lg py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:premium-shadow transition-all duration-300">
                Histórico
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="coligadas" className="rounded-lg py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:premium-shadow transition-all duration-300">
                  Coligadas
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="employees" className="rounded-lg py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:premium-shadow transition-all duration-300">
                  Funcionários
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="templates" className="rounded-lg py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:premium-shadow transition-all duration-300">
                  Templates
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="generate" className="space-y-6">
            <DocumentGenerator />
          </TabsContent>

          <TabsContent value="history">
            <DocumentHistory />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="coligadas">
              <ColigadaManager />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="employees">
              <EmployeeManager />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="templates">
              <TemplateManager />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
