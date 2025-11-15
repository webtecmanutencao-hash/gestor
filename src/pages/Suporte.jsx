import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Headphones,
  MessageSquare,
  Video,
  FileText,
  Mail,
  Phone,
  ExternalLink,
  BookOpen,
  Send,
  Loader,
  MessageCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import DocumentacaoDialog from "../components/suporte/DocumentacaoDialog";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const mapConfigsToObject = (configs) => {
  if (!configs) return {};
  return configs.reduce((acc, config) => {
    acc[config.chave] = config.valor;
    return acc;
  }, {});
};

export default function Suporte() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [showDocs, setShowDocs] = useState(false);
  const navigate = useNavigate();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  // REATIVADO: Busca pelas configurações públicas que são visíveis a todos os usuários.
  const { data: configsArray, isLoading: isLoadingConfigs } = useQuery({
    queryKey: ["configuracoesPublicas"],
    queryFn: () => base44.entities.ConfiguracaoPublica.list(),
  });
  const configs = mapConfigsToObject(configsArray || []);
  
  // Valores de contato agora são dinâmicos e públicos.
  const emailSuporte = configs.EMAIL_SUPORTE || "Carregando...";
  const telefoneSuporte = configs.TELEFONE_SUPORTE || "Carregando...";
  const whatsappSuporteRaw = configs.WHATSAPP_SUPORTE || "Carregando...";
  const whatsappSuporteNumero = (configs.WHATSAPP_SUPORTE || "").replace(/\D/g, ''); // Remove non-digits
  
  useEffect(() => {
    if (user) {
      setNome(user.full_name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const createTicketMutation = useMutation({
    mutationFn: (ticketData) => base44.entities.SuporteTicket.create(ticketData),
    onSuccess: () => {
      toast({
        title: "Ticket Enviado com Sucesso!",
        description: "Nossa equipe de suporte responderá o mais breve possível.",
        variant: "success",
      });
      setAssunto("");
      setMensagem("");
    },
    onError: (error) => {
      console.error("Error creating ticket:", error);
      toast({
        title: "Erro ao Enviar Ticket",
        description: "Houve um problema ao registrar sua solicitação. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  const handleEnviarTicket = async (e) => {
    e.preventDefault();
    createTicketMutation.mutate({
      cliente_nome: nome,
      cliente_email: email,
      assunto,
      mensagem,
    });
  };

  const whatsAppUrl = `https://wa.me/${whatsappSuporteNumero}?text=Olá, preciso de ajuda com o GestãoPro`;

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Headphones className="w-8 h-8 text-blue-600" />
            Suporte e Ajuda
          </h1>
          <p className="text-slate-600 mt-1">Estamos aqui para ajudar você</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-4">
                  <Video className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">Suporte Remoto</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Acesso remoto ao seu sistema para resolver problemas rapidamente
                </p>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700" 
                  onClick={() => window.open('https://anydesk.com/', '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Iniciar Sessão Remota
                </Button>
                <p className="text-xs text-slate-500 mt-2">
                  Instale o AnyDesk para permitir acesso remoto
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-green-500">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">Chat de Suporte</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Fale com nossa equipe em tempo real para resolver problemas
                </p>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => navigate(createPageUrl("ChatSuporte"))}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Iniciar Chat
                </Button>
                <p className="text-xs text-slate-500 mt-2">
                  Atendimento de Seg-Sex, 9h-18h
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-2 border-purple-500">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">Documentação</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Tutoriais e guias de uso do sistema
                </p>
                <Button 
                  onClick={() => setShowDocs(true)} 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Ver Documentação
                </Button>
                <p className="text-xs text-slate-500 mt-2">
                  Aprenda a usar todas as funcionalidades
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Abrir Ticket de Suporte</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEnviarTicket} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    disabled={!!user}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={!!user}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assunto">Assunto *</Label>
                  <Input
                    id="assunto"
                    value={assunto}
                    onChange={(e) => setAssunto(e.target.value)}
                    placeholder="Ex: Erro ao cadastrar cliente"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mensagem">Descrição do Problema *</Label>
                  <Textarea
                    id="mensagem"
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    rows={6}
                    placeholder="Descreva detalhadamente o problema que você está enfrentando..."
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={createTicketMutation.isPending}>
                  <Send className="w-4 h-4 mr-2" />
                  {createTicketMutation.isPending ? 'Enviando...' : 'Enviar Ticket'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Contatos Diretos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingConfigs ? (
                  <div className="flex justify-center items-center p-4">
                    <Loader className="w-6 h-6 animate-spin"/>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-slate-600">Email</p>
                        <p className="font-semibold">{emailSuporte}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Phone className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm text-slate-600">Telefone</p>
                        <p className="font-semibold">{telefoneSuporte}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm text-slate-600">WhatsApp</p>
                        <p className="font-semibold">{whatsappSuporteRaw}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900">Perguntas Frequentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <details className="group">
                  <summary className="font-semibold cursor-pointer hover:text-blue-600">
                    Como cadastrar um novo cliente?
                  </summary>
                  <p className="text-sm text-slate-600 mt-2 pl-4">
                    Acesse a aba "Clientes", clique em "Novo Cliente" e preencha o formulário com as informações necessárias.
                  </p>
                </details>

                <details className="group">
                  <summary className="font-semibold cursor-pointer hover:text-blue-600">
                    Como fazer uma venda no crediário?
                  </summary>
                  <p className="text-sm text-slate-600 mt-2 pl-4">
                    Na aba "Vendas", clique em "Registrar Nova Venda", selecione "Crediário" como forma de pagamento e defina o número de parcelas.
                  </p>
                </details>

                <details className="group">
                  <summary className="font-semibold cursor-pointer hover:text-blue-600">
                    Como enviar cobrança via WhatsApp?
                  </summary>
                  <p className="text-sm text-slate-600 mt-2 pl-4">
                    Na aba "Cobranças", clique no botão "WhatsApp" ao lado da parcela que deseja cobrar. Uma mensagem será preparada automaticamente.
                  </p>
                </details>

                <details className="group">
                  <summary className="font-semibold cursor-pointer hover:text-blue-600">
                    Como controlar o estoque?
                  </summary>
                  <p className="text-sm text-slate-600 mt-2 pl-4">
                    O estoque é atualizado automaticamente a cada venda. Você pode ver os produtos em "Estoque" e adicionar novos produtos quando necessário.
                  </p>
                </details>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <DocumentacaoDialog open={showDocs} onOpenChange={setShowDocs} />
    </div>
  );
}