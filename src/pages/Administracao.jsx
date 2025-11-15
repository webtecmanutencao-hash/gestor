
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  Users,
  DollarSign,
  Eye,
  Check,
  X,
  MessageSquare,
  Headphones,
  Settings,
  Search,
  Clock,
  Download,
  Calendar,
  Activity,
  AlertTriangle,
  Mail,
  User,
  ExternalLink,
  Bot,
  Loader,
  Save,
  Send,
  AlertCircle,
  CreditCard,
  TrendingDown,
  Trophy,
  BarChart,
  Lock,
  Unlock
} from "lucide-react";
import { format, startOfMonth, formatDistanceToNow } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AdminAssistantTab from "@/components/admin/AdminAssistantTab";
import AdminDashboardTab from "@/components/admin/AdminDashboardTab";
import InadimplentesTab from "@/components/admin/InadimplentesTab";
import BraipApiTab from "@/components/admin/BraipApiTab";
import EventosBraipTab from "@/components/admin/EventosBraipTab";
import ChatBloqueioTab from "@/components/admin/ChatBloqueioTab";
import { cn } from "@/lib/utils";

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export default function Administracao() {
  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { toast } = useToast();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("resumo");
  const [buscaEmpresa, setBuscaEmpresa] = useState("");
  const [selectedPagamento, setSelectedPagamento] = useState(null);
  const [isComprovanteOpen, setIsComprovanteOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [ticketResponse, setTicketResponse] = useState("");
  const [systemConfigs, setSystemConfigs] = useState({});
  const [valorMensalidade, setValorMensalidade] = useState('');
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [selectedUserToBlock, setSelectedUserToBlock] = useState(null);
  const [blockReason, setBlockReason] = useState('');
  const debouncedBusca = useDebounce(buscaEmpresa, 300);

  const [notifications, setNotifications] = useState([]);
  const prevNotifCount = useRef(0);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  const isAdmin = user?.role === 'admin';

  // Efeito para ler a URL e mudar a aba
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location.search]);

  // Busca de dados para notificações (APENAS PARA ADMINS)
  const { data: notificationData } = useQuery({
    queryKey: ['adminNotifications'],
    queryFn: async () => {
      const [pagamentos, tickets, chats, chatsBloqueio] = await Promise.all([
        base44.entities.Pagamento.filter({ status: 'aguardando_verificacao' }),
        base44.entities.SuporteTicket.filter({ status: 'aberto' }),
        base44.entities.ChatConversa.filter({ status: 'aberto', unread_admin: true, tipo_chat: 'suporte' }),
        base44.entities.ChatConversa.filter({ status: 'aberto', unread_admin: true, tipo_chat: 'bloqueio' }),
      ]);
      return { pagamentos, tickets, chats, chatsBloqueio };
    },
    enabled: isAdmin,
    refetchInterval: 15000,
  });

  // Queries para dados das abas
  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['allUsersAdmin', debouncedBusca],
    queryFn: async () => {
      if (debouncedBusca) {
        return await base44.entities.User.filter({ 
          full_name: { $regex: debouncedBusca, $options: 'i' }
        });
      }
      return await base44.entities.User.list('-created_date', 1000);
    },
    enabled: isAdmin,
    initialData: []
  });

  const { data: pagamentosPendentes = [], isLoading: isLoadingPagamentos } = useQuery({
    queryKey: ['pagamentosPendentesAdmin'],
    queryFn: () => base44.entities.Pagamento.filter({ status: 'aguardando_verificacao' }, '-created_date'),
    enabled: isAdmin,
    initialData: []
  });

  const { data: openTickets = [], isLoading: isLoadingTickets } = useQuery({
    queryKey: ['openTicketsAdmin'],
    queryFn: () => base44.entities.SuporteTicket.filter({ status: 'aberto' }, '-created_date'),
    enabled: isAdmin,
    initialData: []
  });

  const { data: openChats = [], isLoading: isLoadingChats } = useQuery({
    queryKey: ['openChatsAdmin'],
    queryFn: () => base44.entities.ChatConversa.filter({ status: 'aberto', tipo_chat: 'suporte' }, '-last_message_date'),
    enabled: isAdmin,
    initialData: []
  });

  const { data: initialSystemConfigs = [], isLoading: isLoadingSystemConfigs } = useQuery({
    queryKey: ['allSystemConfigs'],
    queryFn: () => base44.entities.Configuracao.list(),
    enabled: isAdmin,
    initialData: []
  });
  
  const { data: initialPublicConfigs = [] } = useQuery({
    queryKey: ['configuracoesPublicas'],
    queryFn: () => base44.entities.ConfiguracaoPublica.list(),
    enabled: isAdmin,
    initialData: []
  });

  // Query para VALOR_MENSALIDADE
  const { data: configMensalidade, isLoading: isLoadingConfigMensalidade } = useQuery({
    queryKey: ['configMensalidade'],
    queryFn: async () => {
      const configs = await base44.entities.ConfiguracaoPublica.filter({ chave: 'VALOR_MENSALIDADE' });
      if (configs[0]) {
        return configs[0];
      }
      return null;
    },
    enabled: isAdmin,
  });

  // Atualizar estado local quando a config for carregada
  useEffect(() => {
    if (configMensalidade?.valor) {
      setValorMensalidade(configMensalidade.valor);
    }
  }, [configMensalidade]);

  useEffect(() => {
    const configsMap = {};
    
    // Processa configurações privadas
    initialSystemConfigs.forEach(c => {
        configsMap[c.chave] = {
            id: c.id,
            valor: c.valor,
            descricao: c.descricao,
            isPublic: false,
        };
    });
    
    // Processa configurações públicas, excluindo VALOR_MENSALIDADE
    initialPublicConfigs.forEach(c => {
        if (c.chave === 'VALOR_MENSALIDADE') return;
        configsMap[c.chave] = {
            id: c.id,
            valor: c.valor,
            descricao: c.descricao,
            isPublic: true,
        };
    });
    
    setSystemConfigs(configsMap);
  }, [initialSystemConfigs, initialPublicConfigs]);

  // Processa os dados de notificação e dispara alertas - COM VERIFICAÇÕES DE SEGURANÇA
  useEffect(() => {
    if (isAdmin && notificationData) {
      const newNotifications = [];

      // Verificar se existe e é array antes de fazer forEach
      if (notificationData.pagamentos && Array.isArray(notificationData.pagamentos)) {
        notificationData.pagamentos.forEach(p => newNotifications.push({
          id: `pag-${p.id}`,
          type: 'pagamento',
          title: `Pagamento de ${p.empresa_nome}`,
          description: `Enviou comprovante de R$ ${p.valor.toFixed(2)}.`,
          time: formatDistanceToNow(new Date(p.updated_date), { addSuffix: true, locale: ptBR }),
          link: createPageUrl('Administracao?tab=verificacao')
        }));
      }

      if (notificationData.tickets && Array.isArray(notificationData.tickets)) {
        notificationData.tickets.forEach(t => newNotifications.push({
          id: `tic-${t.id}`,
          type: 'ticket',
          title: `Novo Ticket: ${t.assunto}`,
          description: `De: ${t.cliente_nome}`,
          time: formatDistanceToNow(new Date(t.created_date), { addSuffix: true, locale: ptBR }),
          link: createPageUrl('Administracao?tab=tickets')
        }));
      }

      if (notificationData.chats && Array.isArray(notificationData.chats)) {
        notificationData.chats.forEach(c => newNotifications.push({
          id: `chat-${c.id}`,
          type: 'chat',
          title: `Chat: ${c.usuario_nome}`,
          description: `Assunto: ${c.assunto}`,
          time: formatDistanceToNow(new Date(c.last_message_date), { addSuffix: true, locale: ptBR }),
          link: createPageUrl('Administracao?tab=chat')
        }));
      }

      if (notificationData.chatsBloqueio && Array.isArray(notificationData.chatsBloqueio)) {
        notificationData.chatsBloqueio.forEach(c => newNotifications.push({
          id: `chatbloq-${c.id}`,
          type: 'chat_bloqueio',
          title: `🔒 URGENTE: ${c.usuario_nome}`,
          description: `Cliente bloqueado precisa de ajuda`,
          time: formatDistanceToNow(new Date(c.last_message_date), { addSuffix: true, locale: ptBR }),
          link: createPageUrl('Administracao?tab=chat_bloqueio')
        }));
      }

      setNotifications(newNotifications);

      // Lógica do Alerta VISUAL
      if (newNotifications.length > prevNotifCount.current) {
        setHasNewNotifications(true); // Ativa o alerta visual
      }
      prevNotifCount.current = newNotifications.length;
    }
  }, [isAdmin, notificationData]);

  // Contadores para badges - COM VERIFICAÇÕES DE SEGURANÇA
  const pagamentosAguardandoCount = pagamentosPendentes?.length || 0;
  const openTicketsCount = openTickets?.length || 0;
  const unreadChatsCount = openChats?.filter(c => c.unread_admin)?.length || 0;
  const chatsBloqueioCount = notificationData?.chatsBloqueio?.length || 0;

  // Mutações
  const updatePagamentoMutation = useMutation({
    mutationFn: async ({ id, status, observacoes }) => {
      return await base44.entities.Pagamento.update(id, { 
        status, 
        observacoes, 
        verificado_por: user.email, 
        data_verificacao: new Date().toISOString() 
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pagamentosPendentesAdmin'] });
      queryClient.invalidateQueries({ queryKey: ['adminNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['allUsersAdmin'] });
      
      // Atualiza o status do usuário se o pagamento for aprovado
      if(data.status === 'aprovado') {
          base44.entities.User.update(data.empresa_id, { status: 'ativo' })
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ['allUsersAdmin'] });
            });
      }
      
      setIsComprovanteOpen(false);
      setSelectedPagamento(null);
      
      toast({ 
        title: `✅ Pagamento ${data.status === 'aprovado' ? 'Aprovado' : 'Recusado'}!`, 
        description: `O pagamento de ${data.empresa_nome} foi ${data.status === 'aprovado' ? 'aprovado' : 'recusado'}.`,
        variant: "success"
      });
    },
    onError: (error) => {
      toast({ 
        title: "❌ Erro ao processar pagamento", 
        description: error.message || "Ocorreu um erro ao atualizar o pagamento.",
        variant: "destructive" 
      });
    }
  });

  const resolveTicketMutation = useMutation({
    mutationFn: async ({ id, resposta }) => {
      return await base44.entities.SuporteTicket.update(id, { 
        status: 'resolvido', 
        resposta, 
        resolvido_por: user.email, 
        data_resolucao: new Date().toISOString() 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['openTicketsAdmin'] });
      queryClient.invalidateQueries({ queryKey: ['adminNotifications'] });
      setIsTicketOpen(false);
      setSelectedTicket(null);
      setTicketResponse("");
      toast({ 
        title: "✅ Ticket Resolvido!", 
        description: "O ticket foi marcado como resolvido e o cliente foi notificado.",
        variant: "success" 
      });
    },
    onError: (error) => {
      toast({ 
        title: "❌ Erro ao resolver ticket", 
        description: error.message || "Ocorreu um erro ao resolver o ticket.",
        variant: "destructive" 
      });
    }
  });

  const updateConfigMutation = useMutation({
    mutationFn: async ({ id, valor, isPublic }) => {
      const entity = isPublic ? base44.entities.ConfiguracaoPublica : base44.entities.Configuracao;
      return await entity.update(id, { valor });
    },
    onSuccess: () => {
        toast({ 
          title: "✅ Configuração Salva!", 
          description: "A configuração foi atualizada com sucesso.",
          variant: "success" 
        });
        queryClient.invalidateQueries({ queryKey: ['allSystemConfigs'] });
        queryClient.invalidateQueries({ queryKey: ['configuracoesPublicas'] });
    },
    onError: (error) => {
        toast({ 
          title: "❌ Erro ao salvar", 
          description: error.message || "Ocorreu um erro ao salvar a configuração.",
          variant: "destructive" 
        });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }) => {
      return await base44.entities.User.update(userId, data);
    },
    onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ['allUsersAdmin'] });
        toast({ 
            title: "✅ Usuário Atualizado!", 
            description: `A conta de ${data.full_name} foi atualizada com sucesso.`,
            variant: "success" 
        });
    },
    onError: (error) => {
        toast({ 
          title: "❌ Erro ao atualizar usuário", 
          description: error.message || "Ocorreu um erro ao atualizar o usuário.",
          variant: "destructive" 
        });
    }
  });

  const updateMensalidadeMutation = useMutation({
    mutationFn: async (novoValor) => {
      if (configMensalidade?.id) {
        // Atualiza existente
        return await base44.entities.ConfiguracaoPublica.update(configMensalidade.id, { valor: String(novoValor) });
      } else {
        // Cria novo
        return await base44.entities.ConfiguracaoPublica.create({
          chave: 'VALOR_MENSALIDADE',
          valor: String(novoValor),
          descricao: 'Valor mensal cobrado de cada cliente (em Reais)'
        });
      }
    },
    onSuccess: (data) => {
      // Invalida TODAS as queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['configMensalidade'] });
      queryClient.invalidateQueries({ queryKey: ['configuracoesPublicas'] });
      queryClient.invalidateQueries({ queryKey: ['allSystemConfigs'] });
      
      // Atualiza o estado local com o valor salvo
      setValorMensalidade(data.valor);
      
      toast({ 
        title: "✅ Valor da Mensalidade Atualizado!", 
        description: `Novo valor: R$ ${parseFloat(data.valor).toFixed(2)}. Todos os clientes verão o novo valor na tela de pagamento.`,
        variant: "success" 
      });
    },
    onError: (error) => {
      toast({ 
        title: "❌ Erro ao salvar", 
        description: error.message || "Ocorreu um erro ao atualizar o valor da mensalidade.",
        variant: "destructive" 
      });
    }
  });

  // Nova mutation para bloquear/desbloquear usuário
  const toggleUserBlockMutation = useMutation({
    mutationFn: async ({ userId, newStatus, reason }) => {
      return await base44.entities.User.update(userId, { 
        status: newStatus,
        ...(reason && { observacoes_bloqueio: reason })
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allUsersAdmin'] });
      
      const action = variables.newStatus === 'inativo' ? 'bloqueado' : 'desbloqueado';
      
      toast({
        title: `✅ Usuário ${action}!`,
        description: `A conta de ${data.full_name} foi ${action} com sucesso.`,
        variant: "success"
      });
      
      setIsBlockDialogOpen(false);
      setSelectedUserToBlock(null);
      setBlockReason('');
    },
    onError: (error) => {
      toast({
        title: "❌ Erro ao atualizar status",
        description: error.message || "Ocorreu um erro ao atualizar o status do usuário.",
        variant: "destructive"
      });
    }
  });

  // Handlers
  const handleUpdatePagamento = (status) => {
    if (!selectedPagamento) return;
    updatePagamentoMutation.mutate({ 
      id: selectedPagamento.id, 
      status, 
      observacoes: `Pagamento ${status} pelo administrador.` 
    });
  };
  
  const handleResolveTicket = () => {
    if (!selectedTicket || !ticketResponse.trim()) {
      toast({
        title: "⚠️ Atenção",
        description: "Por favor, escreva uma resposta antes de resolver o ticket.",
        variant: "warning"
      });
      return;
    }
    resolveTicketMutation.mutate({ id: selectedTicket.id, resposta: ticketResponse });
  };
  
  const handleConfigChange = (chave, valor) => {
    setSystemConfigs(prev => ({ 
      ...prev, 
      [chave]: { ...prev[chave], valor } 
    }));
  };

  const handleSaveConfig = (chave) => {
      const config = systemConfigs[chave];
      if (config) {
          updateConfigMutation.mutate({ 
            id: config.id, 
            valor: config.valor, 
            isPublic: config.isPublic 
          });
      }
  };

  const handleToggleDemoAccount = (targetUser) => {
    updateUserMutation.mutate({
      userId: targetUser.id,
      data: { is_demo_account: !targetUser.is_demo_account },
    });
  };

  const handleSaveMensalidade = () => {
    const valorNumerico = parseFloat(valorMensalidade);
    
    if (!valorMensalidade || isNaN(valorNumerico) || valorNumerico <= 0) {
      toast({ 
        title: "⚠️ Valor Inválido", 
        description: "O valor da mensalidade deve ser maior que zero.", 
        variant: "destructive" 
      });
      return;
    }
    
    // Salva com 2 casas decimais
    updateMensalidadeMutation.mutate(valorNumerico.toFixed(2));
  };

  const handleOpenBlockDialog = (targetUser) => {
    setSelectedUserToBlock(targetUser);
    setBlockReason('');
    setIsBlockDialogOpen(true);
  };

  const handleToggleBlock = () => {
    if (!selectedUserToBlock) return;
    
    const isBlocking = selectedUserToBlock.status !== 'inativo';
    
    if (isBlocking && !blockReason.trim()) {
      toast({
        title: "⚠️ Motivo Obrigatório",
        description: "Por favor, informe o motivo do bloqueio.",
        variant: "destructive"
      });
      return;
    }
    
    toggleUserBlockMutation.mutate({
      userId: selectedUserToBlock.id,
      newStatus: isBlocking ? 'inativo' : 'ativo',
      reason: isBlocking ? blockReason : null
    });
  };

  if (isLoadingUser) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Acesso Negado</h2>
        <p className="text-slate-600">Esta área é restrita para administradores do sistema.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white min-h-screen">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-8 p-6 bg-slate-700/50 rounded-xl shadow-lg border border-slate-600">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-cyan-400" /> 
            Administração do Sistema
          </h1>
          <p className="text-slate-400 mt-1">Painel de controle com acesso total aos recursos e dados do sistema GestãoPro.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 mb-6 h-auto p-1 bg-slate-700 rounded-lg border border-slate-600">
            {[
              { value: 'resumo', label: 'Resumo' },
              { value: 'users', label: 'Usuários' },
              { value: 'inadimplentes', label: 'Inadimplentes' },
              { value: 'mensal', label: 'Mensalidade' },
              { value: 'api_pagamentos', label: 'API Pagamentos' },
              { value: 'eventos_braip', label: 'Eventos Braip', badge: null, highlight: true },
              { value: 'verificacao', label: 'Verificação', badge: pagamentosAguardandoCount },
              { value: 'tickets', label: 'Tickets', badge: openTicketsCount },
              { value: 'chat', label: 'Chat', badge: unreadChatsCount },
              { value: 'chat_bloqueio', label: 'Chat Bloq.', badge: chatsBloqueioCount, urgent: true },
              { value: 'configs', label: 'Configs' },
              { value: 'ia_console', label: 'IA Console' }
            ].map(tab => (
              <TabsTrigger 
                key={tab.value} 
                value={tab.value} 
                className={cn(
                  "capitalize py-2 text-slate-300 data-[state=active]:bg-slate-900/80 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md relative",
                  tab.highlight && "bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold animate-pulse",
                  tab.urgent && "bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold"
                )}
              >
                {tab.label}
                {tab.badge > 0 && (
                  <span className={cn(
                    "absolute top-1 right-2 w-2.5 h-2.5 rounded-full animate-pulse",
                    tab.urgent ? "bg-yellow-400" : "bg-red-500"
                  )}></span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {/* Aba Resumo */}
          <TabsContent value="resumo">
            <AdminDashboardTab />
          </TabsContent>
          
          {/* Aba Clientes/Usuários */}
          <TabsContent value="users">
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle>Todos os Clientes ({allUsers.length})</CardTitle>
                    <CardDescription className="text-slate-400">Gerencie todos os usuários do sistema</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <Input 
                          placeholder="Buscar empresa por nome..." 
                          value={buscaEmpresa} 
                          onChange={(e) => setBuscaEmpresa(e.target.value)} 
                          className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400" 
                        />
                      </div>
                    </div>

                    {isLoadingUsers ? (
                      <div className="text-center py-8">
                        <Loader className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
                        <p className="text-slate-400 mt-2">Carregando usuários...</p>
                      </div>
                    ) : allUsers.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 mx-auto text-slate-500 mb-3" />
                        <p className="text-slate-400">
                          {buscaEmpresa ? 'Nenhum usuário encontrado com essa busca.' : 'Nenhum usuário cadastrado ainda.'}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allUsers.map(u => (
                          <Card key={u.id} className="bg-slate-700/50 border-slate-600 flex flex-col">
                              <CardHeader>
                                  <CardTitle className="flex justify-between items-start text-lg">
                                      <span className="truncate pr-2">{u.full_name || 'Nome não definido'}</span>
                                      <Badge variant={u.status === 'ativo' ? 'success' : 'destructive'}>
                                        {u.status || 'ativo'}
                                      </Badge>
                                  </CardTitle>
                                  <CardDescription className="text-slate-400 truncate">{u.email}</CardDescription>
                              </CardHeader>
                              <CardContent className="flex-grow flex flex-col justify-end">
                                  <p className="text-sm mb-2 text-slate-300">
                                    Membro desde: {format(new Date(u.created_date), 'dd/MM/yyyy')}
                                  </p>
                                  {u.is_demo_account && (
                                    <Badge variant="outline" className="mb-3 w-fit bg-amber-500/20 text-amber-400 border-amber-500">
                                      🎭 Conta Demo
                                    </Badge>
                                  )}
                                  <div className="flex flex-col gap-2">
                                      <div className="flex gap-2">
                                          <Link to={createPageUrl(`UsuarioDetalhes?id=${u.id}`)} className="flex-1">
                                              <Button variant="outline" className="w-full border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-slate-900">
                                                Ver Detalhes
                                              </Button>
                                          </Link>
                                          <Button
                                              onClick={() => handleToggleDemoAccount(u)}
                                              variant={u.is_demo_account ? "default" : "secondary"}
                                              className={cn("flex-1", u.is_demo_account && "bg-amber-500 hover:bg-amber-600 text-white")}
                                              disabled={updateUserMutation.isPending && updateUserMutation.variables?.userId === u.id}
                                          >
                                              {updateUserMutation.isPending && updateUserMutation.variables?.userId === u.id ? (
                                                <Loader className="w-4 h-4 animate-spin" />
                                              ) : (
                                                u.is_demo_account ? "Remover Demo" : "Tornar Demo"
                                              )}
                                          </Button>
                                      </div>
                                      
                                      {/* Botão Bloquear/Desbloquear */}
                                      <Button
                                        onClick={() => handleOpenBlockDialog(u)}
                                        variant={u.status === 'inativo' ? 'success' : 'destructive'}
                                        className="w-full"
                                        disabled={toggleUserBlockMutation.isPending && selectedUserToBlock?.id === u.id}
                                      >
                                        {toggleUserBlockMutation.isPending && selectedUserToBlock?.id === u.id ? (
                                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                                        ) : u.status === 'inativo' ? (
                                          <>
                                            <Unlock className="w-4 h-4 mr-2" />
                                            Desbloquear Acesso
                                          </>
                                        ) : (
                                          <>
                                            <Lock className="w-4 h-4 mr-2" />
                                            Bloquear Acesso
                                          </>
                                        )}
                                      </Button>
                                  </div>
                              </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Inadimplentes */}
          <TabsContent value="inadimplentes">
            <InadimplentesTab />
          </TabsContent>

          {/* Aba Mensalidade */}
          <TabsContent value="mensal">
            <Card className="bg-slate-800 border-slate-700 max-w-2xl mx-auto">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-emerald-400" />
                  <div>
                    <CardTitle className="text-2xl">Valor da Mensalidade</CardTitle>
                    <CardDescription className="text-slate-400">Configure o valor cobrado mensalmente de todos os clientes</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoadingConfigMensalidade ? (
                  <div className="text-center py-8">
                    <Loader className="w-8 h-8 animate-spin mx-auto text-emerald-400 mb-2" />
                    <p className="text-slate-400 mt-2">Carregando configuração...</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-slate-700/50 p-6 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between mb-4">
                        <Label htmlFor="valorMensal" className="text-xl font-semibold text-cyan-400">
                          VALOR_MENSALIDADE
                        </Label>
                        <Badge variant="outline" className="text-sm">Público</Badge>
                      </div>
                      
                      <p className="text-sm text-slate-400 mb-4">
                        Valor mensal cobrado de cada cliente (em Reais). Este valor será exibido para todos os usuários na tela de pagamento.
                      </p>

                      <div className="bg-slate-900/50 p-4 rounded-lg mb-4">
                        <p className="text-xs text-slate-500 mb-2">Valor Atual:</p>
                        <p className="text-4xl font-bold text-emerald-400">
                          R$ {valorMensalidade ? parseFloat(valorMensalidade).toFixed(2) : '0.00'}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="valorMensal" className="text-sm text-slate-300">Novo Valor (R$)</Label>
                        <div className="flex gap-3">
                          <Input
                            id="valorMensal"
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={valorMensalidade}
                            onChange={(e) => setValorMensalidade(e.target.value)}
                            placeholder="100.00"
                            className="bg-slate-700 border-slate-600 text-white text-2xl font-bold placeholder:text-slate-500"
                            disabled={updateMensalidadeMutation.isPending}
                          />
                          <Button 
                            onClick={handleSaveMensalidade} 
                            disabled={updateMensalidadeMutation.isPending || !valorMensalidade}
                            size="lg"
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            {updateMensalidadeMutation.isPending ? (
                              <Loader className="w-5 h-5 mr-2 animate-spin" />
                            ) : (
                              <Save className="w-5 h-5 mr-2" />
                            )}
                            Salvar
                          </Button>
                        </div>
                        <p className="text-xs text-slate-400">
                          Digite o novo valor e clique em Salvar para aplicar a alteração
                        </p>
                      </div>
                    </div>

                    <Alert className="bg-blue-900/20 border-blue-500/50">
                      <AlertCircle className="h-4 w-4 text-blue-400" />
                      <AlertDescription className="text-blue-200">
                        <strong>Importante:</strong> Ao alterar este valor, todos os clientes verão o novo preço imediatamente na tela de Mensalidade. O valor será aplicado para novos pagamentos a partir da próxima cobrança.
                      </AlertDescription>
                    </Alert>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nova Aba API de Pagamentos */}
          <TabsContent value="api_pagamentos">
            <BraipApiTab />
          </TabsContent>

          {/* Nova Aba Eventos Braip */}
          <TabsContent value="eventos_braip">
            <EventosBraipTab />
          </TabsContent>

          {/* Aba Verificação de Pagamentos */}
          <TabsContent value="verificacao">
             <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Eye className="w-6 h-6 text-cyan-400"/>
                  <div>
                    <CardTitle>Verificação de Pagamentos ({pagamentosAguardandoCount})</CardTitle>
                    <CardDescription>Clientes que enviaram comprovante e aguardam liberação de acesso.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingPagamentos ? (
                  <div className="text-center py-8">
                    <Loader className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
                    <p className="text-slate-400 mt-2">Carregando pagamentos...</p>
                  </div>
                ) : pagamentosAguardandoCount === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="w-12 h-12 mx-auto text-slate-500 mb-3" />
                    <p className="text-center text-slate-400">Nenhum pagamento pendente de verificação.</p>
                  </div>
                ) : (
                  pagamentosPendentes.map(p => (
                    <div key={p.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-700/50 rounded-lg border border-slate-600 gap-4">
                      <div>
                        <p className="font-bold text-lg">{p.empresa_nome}</p>
                        <p className="text-slate-400">
                          Enviado {formatDistanceToNow(new Date(p.updated_date), { addSuffix: true, locale: ptBR })}
                        </p>
                        <p className="font-semibold text-cyan-400 text-xl mt-1">
                          R$ {p.valor.toFixed(2)} 
                          <span className="text-slate-400 font-normal text-base ml-2">ref. {p.mes_referencia}</span>
                        </p>
                      </div>
                      <div className="flex gap-2 self-end sm:self-center">
                        <Button 
                          variant="outline" 
                          className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-slate-900" 
                          onClick={() => {
                            setSelectedPagamento(p); 
                            setIsComprovanteOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Comprovante
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Aba Tickets */}
          <TabsContent value="tickets">
              <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle>Tickets de Suporte Abertos ({openTicketsCount})</CardTitle>
                    <CardDescription>Solicitações de suporte que precisam de atenção</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      {isLoadingTickets ? (
                        <div className="text-center py-8">
                          <Loader className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
                          <p className="text-slate-400 mt-2">Carregando tickets...</p>
                        </div>
                      ) : openTicketsCount === 0 ? (
                        <div className="text-center py-8">
                          <Headphones className="w-12 h-12 mx-auto text-slate-500 mb-3" />
                          <p className="text-center text-slate-400">Nenhum ticket de suporte aberto.</p>
                        </div>
                      ) : (
                        openTickets.map(t => (
                          <div key={t.id} className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                              <div>
                                  <p className="font-bold text-lg">{t.assunto}</p>
                                  <p className="text-slate-400">De: {t.cliente_nome} ({t.cliente_email})</p>
                                  <p className="text-sm mt-2 italic text-slate-300">"{t.mensagem}"</p>
                                  <p className="text-xs text-slate-500 mt-1">
                                    Criado {formatDistanceToNow(new Date(t.created_date), { addSuffix: true, locale: ptBR })}
                                  </p>
                              </div>
                              <Button 
                                variant="outline" 
                                className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-slate-900" 
                                onClick={() => { 
                                  setSelectedTicket(t); 
                                  setIsTicketOpen(true); 
                                }}
                              >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver e Responder
                              </Button>
                          </div>
                        ))
                      )}
                  </CardContent>
              </Card>
          </TabsContent>

          {/* Aba Chat */}
          <TabsContent value="chat">
              <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle>Chats Ativos ({openChats.length})</CardTitle>
                    <CardDescription>Conversas em andamento com clientes</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     {isLoadingChats ? (
                       <div className="text-center py-8">
                         <Loader className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
                         <p className="text-slate-400 mt-2">Carregando chats...</p>
                       </div>
                     ) : openChats.length === 0 ? (
                       <div className="text-center py-8">
                         <MessageSquare className="w-12 h-12 mx-auto text-slate-500 mb-3" />
                         <p className="text-center text-slate-400">Nenhum chat ativo no momento.</p>
                       </div>
                     ) : (
                       openChats.map(c => (
                         <Link to={createPageUrl(`ChatAdmin?conversaId=${c.id}`)} key={c.id}>
                            <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg border border-slate-600 hover:bg-slate-700 transition-colors cursor-pointer">
                                <div>
                                    <p className="font-bold text-lg">{c.assunto}</p>
                                    <p className="text-slate-400">De: {c.usuario_nome}</p>
                                    <p className="text-sm mt-2 italic text-slate-300">
                                      Última msg: "{c.last_message_preview}"
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                      {formatDistanceToNow(new Date(c.last_message_date), { addSuffix: true, locale: ptBR })}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {c.unread_admin && (
                                    <Badge variant="destructive" className="animate-pulse">Não lido</Badge>
                                  )}
                                  <ExternalLink className="w-5 h-5 text-cyan-400" />
                                </div>
                            </div>
                        </Link>
                       ))
                     )}
                  </CardContent>
              </Card>
          </TabsContent>

          {/* Nova Aba Chat de Bloqueio */}
          <TabsContent value="chat_bloqueio">
            <ChatBloqueioTab />
          </TabsContent>

          {/* Aba Configs */}
          <TabsContent value="configs">
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle>Configurações do Sistema</CardTitle>
                    <CardDescription className="text-slate-400">
                        {isLoadingSystemConfigs ? 'Carregando configurações...' : `${Object.keys(systemConfigs).length} configuração(ões) disponível(is)`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isLoadingSystemConfigs ? (
                        <div className="text-center py-8">
                            <Loader className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
                            <p className="text-slate-400 mt-2">Carregando configurações...</p>
                        </div>
                    ) : Object.keys(systemConfigs).length > 0 ? (
                        Object.entries(systemConfigs).map(([chave, config]) => (
                            <div key={chave} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                                <div className="flex items-center gap-2 mb-2">
                                    <Label htmlFor={chave} className="text-lg font-semibold text-cyan-400">{chave}</Label>
                                    {config.isPublic && <Badge variant="outline" className="text-xs">Público</Badge>}
                                </div>
                                <p className="text-sm text-slate-400 mb-3">{config.descricao}</p>
                                <div className="flex gap-2">
                                    <Input 
                                        id={chave} 
                                        value={config.valor} 
                                        onChange={(e) => handleConfigChange(chave, e.target.value)} 
                                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                    />
                                    <Button 
                                      onClick={() => handleSaveConfig(chave)} 
                                      disabled={updateConfigMutation.isPending}
                                    >
                                        {updateConfigMutation.isPending ? (
                                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                          <Save className="w-4 h-4 mr-2"/>
                                        )}
                                        Salvar
                                    </Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8">
                            <Settings className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                            <p className="text-slate-400">Nenhuma configuração disponível.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
          </TabsContent>

          {/* Aba IA Console */}
          <TabsContent value="ia_console">
            <AdminAssistantTab />
          </TabsContent>

        </Tabs>
      </div>

      {/* Dialog para ver comprovante */}
      <Dialog open={isComprovanteOpen} onOpenChange={setIsComprovanteOpen}>
        <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Verificar Comprovante de {selectedPagamento?.empresa_nome}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Verifique a imagem e aprove ou recuse o pagamento de R$ {selectedPagamento?.valor.toFixed(2)} referente a {selectedPagamento?.mes_referencia}.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPagamento?.comprovante_url ? (
            <div className="my-4">
              <img 
                src={selectedPagamento.comprovante_url} 
                alt="Comprovante" 
                className="rounded-lg max-h-[60vh] object-contain mx-auto border-2 border-slate-600" 
              />
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-500">Nenhum comprovante enviado.</p>
            </div>
          )}
          
          <div className="flex justify-end gap-4 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsComprovanteOpen(false)}
              disabled={updatePagamentoMutation.isPending}
            >
              Fechar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleUpdatePagamento('recusado')} 
              disabled={updatePagamentoMutation.isPending}
            >
              {updatePagamentoMutation.isPending ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <X className="w-4 h-4 mr-2"/>
              )}
              Recusar
            </Button>
            <Button 
              variant="default" 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleUpdatePagamento('aprovado')} 
              disabled={updatePagamentoMutation.isPending}
            >
              {updatePagamentoMutation.isPending ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2"/>
              )}
              Aprovar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para responder ticket */}
      <Dialog open={isTicketOpen} onOpenChange={setIsTicketOpen}>
          <DialogContent className="max-w-lg bg-slate-800 border-slate-700 text-white">
              <DialogHeader>
                  <DialogTitle>Responder Ticket: {selectedTicket?.assunto}</DialogTitle>
                  <DialogDescription className="text-slate-400">De: {selectedTicket?.cliente_nome} ({selectedTicket?.cliente_email})</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                  <div className="bg-slate-700 p-3 rounded-md">
                    <strong>Mensagem do Cliente:</strong>
                    <p className="mt-2 whitespace-pre-wrap">{selectedTicket?.mensagem}</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="ticketResponse">Sua Resposta *</Label>
                    <Textarea 
                      id="ticketResponse"
                      placeholder="Escreva sua resposta aqui..." 
                      value={ticketResponse} 
                      onChange={e => setTicketResponse(e.target.value)} 
                      rows={5} 
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-2"
                    />
                  </div>
              </div>
              
              <div className="flex justify-end gap-4 mt-4">
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setIsTicketOpen(false);
                      setTicketResponse("");
                    }}
                    disabled={resolveTicketMutation.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleResolveTicket} 
                    disabled={resolveTicketMutation.isPending || !ticketResponse.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {resolveTicketMutation.isPending ? (
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2"/>
                    )}
                    Resolver e Enviar Resposta
                  </Button>
              </div>
          </DialogContent>
      </Dialog>

      {/* Novo Dialog para Bloquear/Desbloquear Usuário */}
      <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
        <DialogContent className="max-w-lg bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedUserToBlock?.status === 'inativo' ? (
                <>
                  <Unlock className="w-5 h-5 text-green-500" />
                  Desbloquear Acesso
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 text-red-500" />
                  Bloquear Acesso
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedUserToBlock?.status === 'inativo' 
                ? `Você está prestes a DESBLOQUEAR o acesso de ${selectedUserToBlock?.full_name}.`
                : `Você está prestes a BLOQUEAR o acesso de ${selectedUserToBlock?.full_name}.`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedUserToBlock?.status === 'inativo' ? (
              <Alert className="bg-green-900/20 border-green-500">
                <Unlock className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-200">
                  <strong>Desbloquear usuário:</strong> O cliente poderá acessar o sistema normalmente após o desbloqueio.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert className="bg-red-900/20 border-red-500">
                  <Lock className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-200">
                    <strong>⚠️ Atenção:</strong> Ao bloquear, o usuário verá a tela de bloqueio e não conseguirá acessar o sistema até ser desbloqueado.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="blockReason" className="text-white">
                    Motivo do Bloqueio *
                  </Label>
                  <Textarea
                    id="blockReason"
                    placeholder="Ex: Pagamento não realizado, Reembolso solicitado, Cancelamento da assinatura..."
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    rows={4}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  />
                  <p className="text-xs text-slate-400">
                    Informe o motivo para referência futura e controle interno
                  </p>
                </div>

                <div className="bg-slate-700 p-3 rounded-lg border border-slate-600">
                  <p className="text-sm font-semibold text-white mb-2">Motivos comuns de bloqueio:</p>
                  <ul className="text-xs text-slate-300 space-y-1">
                    <li>• Pagamento mensal não realizado</li>
                    <li>• Assinatura cancelada na Braip</li>
                    <li>• Pagamento reembolsado</li>
                    <li>• Solicitação do próprio cliente</li>
                    <li>• Violação dos termos de uso</li>
                  </ul>
                </div>
              </>
            )}

            <div className="bg-slate-700 p-3 rounded-lg border border-slate-600">
              <p className="text-sm text-slate-300">
                <strong>Cliente:</strong> {selectedUserToBlock?.full_name}
              </p>
              <p className="text-sm text-slate-300">
                <strong>Email:</strong> {selectedUserToBlock?.email}
              </p>
              <p className="text-sm text-slate-300">
                <strong>Status Atual:</strong>{' '}
                <Badge variant={selectedUserToBlock?.status === 'ativo' ? 'success' : 'destructive'}>
                  {selectedUserToBlock?.status || 'ativo'}
                </Badge>
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsBlockDialogOpen(false);
                setSelectedUserToBlock(null);
                setBlockReason('');
              }}
              disabled={toggleUserBlockMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleToggleBlock}
              disabled={toggleUserBlockMutation.isPending || (selectedUserToBlock?.status !== 'inativo' && !blockReason.trim())}
              variant={selectedUserToBlock?.status === 'inativo' ? 'success' : 'destructive'}
            >
              {toggleUserBlockMutation.isPending ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : selectedUserToBlock?.status === 'inativo' ? (
                <>
                  <Unlock className="w-4 h-4 mr-2" />
                  Confirmar Desbloqueio
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Confirmar Bloqueio
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
