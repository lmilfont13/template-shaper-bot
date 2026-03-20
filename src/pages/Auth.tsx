import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import tarhgetLogo from "@/assets/tarhget-logo.png";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast({
          title: "Erro no cadastro",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Se um código admin foi fornecido, validar
      if (adminCode && adminCode.trim() !== "") {
        const { data: validationData, error: validationError } = await supabase.functions.invoke(
          'validate-admin-code',
          {
            body: {
              userId: data.user?.id,
              accessCode: adminCode,
            },
          }
        );

        if (validationError) {
          toast({
            title: "Erro ao validar código admin",
            description: "Você foi cadastrado como usuário padrão.",
            variant: "destructive",
          });
        } else if (validationData?.success) {
          toast({
            title: "Cadastro realizado com acesso admin!",
            description: "Você tem acesso completo ao sistema.",
          });
        } else {
          toast({
            title: "Código admin inválido",
            description: "Você foi cadastrado como usuário padrão.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Cadastro realizado!",
          description: "Você já pode fazer login com acesso à aba Gerar.",
        });
      }

      setEmail("");
      setPassword("");
      setAdminCode("");
    } catch (error) {
      toast({
        title: "Erro no cadastro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background p-4 sm:p-8">
      <Card className="w-full max-w-md glass-card premium-shadow border-none overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="text-center pb-8 pt-10 px-8 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary"></div>
          <div className="flex justify-center mb-8 group">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <img 
                src={tarhgetLogo} 
                alt="Tarhget Logo" 
                className="relative h-24 w-auto drop-shadow-2xl transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight text-foreground mb-2">
            Documentos <span className="text-primary italic">Tarhget</span>
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground/80 font-medium tracking-wide border-t border-primary/10 pt-4 mt-4">
            Acesso Restrito ao Sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-0">
          <Tabs defaultValue="login" className="w-full space-y-8">
            <TabsList className="grid w-full grid-cols-2 p-1 glass-card h-auto">
              <TabsTrigger value="login" className="rounded-lg py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:premium-shadow transition-all duration-300 font-bold">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:premium-shadow transition-all duration-300 font-bold">
                Novo Cadastro
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="animate-in fade-in slide-in-from-left-4 duration-500">
              <form onSubmit={handleSignIn} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="login-email" className="text-xs font-bold uppercase tracking-wider opacity-60 ml-1">Endereço de Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="ex: victor@tarhget.com"
                    className="h-12 glass-card focus:ring-primary/50 text-base"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="login-password" title="Senha de acesso" className="text-xs font-bold uppercase tracking-wider opacity-60 ml-1">Senha Corporativa</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="h-12 glass-card focus:ring-primary/50 text-base"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary to-accent hover:opacity-90 hover:scale-[1.02] transition-all duration-300 premium-shadow rounded-xl mt-4" 
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Autenticando...
                    </div>
                  ) : "Acessar Sistema"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="animate-in fade-in slide-in-from-right-4 duration-500">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-xs font-bold uppercase tracking-wider opacity-60 ml-1">Email Profissional</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="seu@tarhget.com"
                    className="h-12 glass-card focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" title="Mínimo 6 caracteres" className="text-xs font-bold uppercase tracking-wider opacity-60 ml-1">Criar Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="h-12 glass-card focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-3 p-5 rounded-2xl bg-primary/5 border border-primary/10">
                  <Label htmlFor="admin-code" className="text-xs font-bold uppercase tracking-wider text-primary">Token de Administração</Label>
                  <Input
                    id="admin-code"
                    type="password"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    placeholder="Opcional"
                    className="h-11 glass-card border-primary/20 bg-background/50"
                  />
                  <p className="text-[10px] text-muted-foreground/80 leading-relaxed italic">
                    Insira o token para privilégios de gestão (Coligadas, Funcionários e Templates).
                  </p>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary to-accent hover:opacity-90 hover:scale-[1.02] transition-all duration-300 premium-shadow rounded-xl mt-4" 
                  disabled={loading}
                >
                  {loading ? "Processando..." : "Solicitar Acesso"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
