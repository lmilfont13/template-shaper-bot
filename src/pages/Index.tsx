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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-4">
              <img 
                src={tarhgetLogo} 
                alt="Tarhget Logo" 
                className="h-16 w-auto"
              />
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Sistema de Documentos Tarhget
                </h1>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </header>

        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5 lg:w-[1000px]' : 'grid-cols-2 lg:w-[400px]'}`}>
            <TabsTrigger value="generate" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent">
              Gerar
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent">
              Histórico
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="coligadas" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent">
                Coligadas
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="employees" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent">
                Funcionários
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="templates" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent">
                Templates
              </TabsTrigger>
            )}
          </TabsList>

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
