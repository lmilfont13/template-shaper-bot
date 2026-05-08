import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import tarhgetLogo from "@/assets/tarhget-logo.png";
import { FileText, ShieldCheck, Mail, Lock, UserPlus, LogIn, Sparkles } from "lucide-react";

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
            title: "Acesso Admin Ativado!",
            description: "Bem-vindo ao painel de controle total.",
          });
        }
      } else {
        toast({
          title: "Conta Criada!",
          description: "Login pronto para uso no módulo de Geração.",
        });
      }

      setEmail("");
      setPassword("");
      setAdminCode("");
    } catch (error) {
      toast({
        title: "Erro no cadastro",
        description: "Falha de conexão. Tente novamente.",
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
        title: "Falha na Autenticação",
        description: "Credenciais incorretas ou conta inexistente.",
        variant: "destructive",
      });
    } else {
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden p-4">
      {/* Background Ornaments */}
      <div className="absolute top-0 left-0 w-full h-full auth-gradient pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600/5 blur-[100px] rounded-full" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-600/5 blur-[100px] rounded-full" />

      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-0 bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 border border-slate-100 overflow-hidden relative z-10">

        {/* Left Side: Branding/Marketing */}
        <div className="hidden lg:flex flex-col justify-between bg-indigo-600 p-12 text-white relative">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 to-indigo-500 opacity-90" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
                <img src={tarhgetLogo} alt="Logo" className="h-8 w-auto brightness-0 invert" />
              </div>
              <span className="text-2xl font-bold tracking-tight">Tarhget Docs</span>
            </div>

            <div className="space-y-6">
              <h1 className="text-4xl font-black leading-tight tracking-tight">
                Gestão Inteligente de <br />
                <span className="text-indigo-200">Documentos RH.</span>
              </h1>
              <p className="text-indigo-100 text-lg leading-relaxed max-w-md">
                Acelere seus processos de admissão e gestão com geração automatizada de documentos e controle total de histórico.
              </p>
            </div>
          </div>

          <div className="relative z-10 bg-white/5 rounded-3xl p-6 backdrop-blur-md border border-white/10">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-indigo-200" />
              </div>
              <div>
                <p className="text-sm font-bold">Tecnologia SaaS 2026</p>
                <p className="text-xs text-indigo-100 opacity-80">Segurança de ponta com integração Supabase.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="p-8 lg:p-16 flex flex-col justify-center">
          <div className="mb-10 text-center lg:text-left">
            <div className="inline-flex items-center justify-center p-3 bg-indigo-50 rounded-2xl mb-4 lg:hidden">
              <img src={tarhgetLogo} alt="Logo" className="h-10 w-auto" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Bem-vindo.</h2>
            <p className="text-slate-500 mt-2 font-medium">Acesse sua conta para gerenciar documentos.</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-8">
              <TabsTrigger value="login" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <LogIn className="h-4 w-4 mr-2" /> Login
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <UserPlus className="h-4 w-4 mr-2" /> Cadastro
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-slate-700 font-bold ml-1">Email Profissional</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    <Input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-12 h-14 bg-slate-50 border-slate-200 rounded-2xl focus-visible:ring-indigo-600 focus-visible:bg-white transition-all shadow-sm"
                      placeholder="luciano@empresa.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" transition-all className="text-slate-700 font-bold ml-1">Senha Segura</Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    <Input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-12 h-14 bg-slate-50 border-slate-200 rounded-2xl focus-visible:ring-indigo-600 focus-visible:bg-white transition-all shadow-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]"
                  disabled={loading}
                >
                  {loading ? "Processando..." : "Entrar no Sistema"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-slate-700 font-bold ml-1">Novo Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-12 h-12 bg-slate-50 border-slate-200 rounded-xl"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" length-6 className="text-slate-700 font-bold ml-1">Criar Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-12 h-12 bg-slate-50 border-slate-200 rounded-xl"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>
                <div className="space-y-1.5 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                  <Label htmlFor="admin-code" className="text-indigo-900 font-bold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" /> Código de Admin
                  </Label>
                  <Input
                    id="admin-code"
                    type="password"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    className="h-10 border-indigo-200 bg-white"
                    placeholder="Opcional"
                  />
                  <p className="text-[10px] text-indigo-600 font-medium">
                    Insira o código para habilitar abas de gestão avançada.
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all"
                  disabled={loading}
                >
                  {loading ? "Criando Conta..." : "Confirmar Cadastro"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-8 text-center text-xs text-slate-400 font-medium">
            &copy; 2026 Tarhget Solutions. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
