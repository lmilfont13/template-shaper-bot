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
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="mb-6 md:mb-8">
          <div className="flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 group">
              <img 
                src={tarhgetLogo} 
                alt="Tarhget Logo" 
                className="h-10 md:h-12 w-auto"
              />
              <div className="text-left hidden sm:block">
                <h1 className="text-xl md:text-3xl font-bold tracking-tight text-foreground">
                  Gerador de Docs
                </h1>
                <p className="text-[10px] text-primary font-bold uppercase tracking-widest opacity-80">
                  Tarhget
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="hover:bg-destructive/10 hover:text-destructive transition-all duration-300 rounded-full px-3 md:px-6 h-10 md:h-11"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Encerrar Sessão</span>
            </Button>
          </div>
        </header>

        <Tabs defaultValue="generate" className="space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-center md:justify-start -mx-4 px-4 overflow-x-auto pb-2 no-scrollbar">
            <TabsList className={`glass-card p-0.5 h-auto flex flex-row ${isAdmin ? 'min-w-[600px] md:min-w-0 md:grid md:grid-cols-5' : 'grid grid-cols-2'} w-full`}>
              <TabsTrigger value="generate" className="flex-1 rounded-lg py-2.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                Gerar
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 rounded-lg py-2.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                Histórico
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="coligadas" className="flex-1 rounded-lg py-2.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                  Coligadas
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="employees" className="flex-1 rounded-lg py-2.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                  Funcionários
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="templates" className="flex-1 rounded-lg py-2.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
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
