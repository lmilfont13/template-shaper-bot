import { DocumentGenerator } from "@/components/DocumentGenerator";
import { DocumentHistory } from "@/components/DocumentHistory";
import { TemplateManager } from "@/components/TemplateManager";
import { EmployeeManager } from "@/components/EmployeeManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent shadow-[var(--shadow-elegant)]">
              <FileText className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Sistema de Documentos
              </h1>
              <p className="text-muted-foreground mt-1">
                Geração automatizada de documentos via Google Docs
              </p>
            </div>
          </div>
        </header>

        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[800px]">
            <TabsTrigger value="generate" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent">
              Gerar
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent">
              Histórico
            </TabsTrigger>
            <TabsTrigger value="employees" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent">
              Funcionários
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent">
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <DocumentGenerator />
              <div className="lg:col-span-1">
                <div className="sticky top-8">
                  <div className="p-6 rounded-xl bg-card border shadow-[var(--shadow-card)]">
                    <h3 className="font-semibold text-lg mb-3">Como funciona?</h3>
                    <ol className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
                          1
                        </span>
                        <span>Configure seus templates do Google Docs na aba "Templates"</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
                          2
                        </span>
                        <span>Preencha o nome do funcionário e selecione o tipo de documento</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
                          3
                        </span>
                        <span>O sistema irá buscar o template e gerar o PDF automaticamente</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
                          4
                        </span>
                        <span>Acesse o histórico para fazer download dos documentos gerados</span>
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <DocumentHistory />
          </TabsContent>

          <TabsContent value="employees">
            <EmployeeManager />
          </TabsContent>

          <TabsContent value="templates">
            <TemplateManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
