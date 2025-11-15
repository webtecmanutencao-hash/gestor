
import React, { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  DollarSign,
  Package,
  FileText,
  Menu,
  LogOut,
  Headphones,
  MessageSquare,
  Shield,
  CreditCard,
  Loader,
  Settings,
  LayoutGrid
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { base44 } from "@/api/base44Client";
import BloqueioMensalidade from "@/components/BloqueioMensalidade";
import TermosDeUsoModal from "@/components/auth/TermosDeUsoModal";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import AdminCockpit from "@/components/admin/AdminCockpit";

const navigationItems = [
  { title: "Painel Principal", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
  { title: "PDV Geral", url: createPageUrl("Geral"), icon: LayoutGrid },
  { title: "Clientes", url: createPageUrl("Clientes"), icon: Users },
  { title: "Vendas", url: createPageUrl("Vendas"), icon: ShoppingCart },
  { title: "Cobranças", url: createPageUrl("Cobrancas"), icon: DollarSign },
  { title: "Estoque", url: createPageUrl("Estoque"), icon: Package },
  { title: "Documentos", url: createPageUrl("Documentos"), icon: FileText },
  { title: "Relatórios", url: createPageUrl("Relatorios"), icon: FileText },
  { title: "Administração", url: createPageUrl("Administracao"), icon: Shield, adminOnly: true },
  { title: "WhatsApp IA", url: createPageUrl("WhatsAppIA"), icon: MessageSquare },
  { title: "Configurações", url: createPageUrl("ConfiguracoesEmpresa"), icon: Settings },
  { title: "Suporte", url: createPageUrl("Suporte"), icon: Headphones },
  { title: "Mensalidade de Uso", url: createPageUrl("Mensalidade"), icon: CreditCard },
];

export default function Layout({ children, currentPageName }) {
  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const isAdmin = user?.role === 'admin';
  const [notifications, setNotifications] = useState([]);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const prevNotifCount = useRef(0);

  // NOVO: Verificar status de pagamento do mês atual
  const { data: pagamentoAtual } = useQuery({
    queryKey: ['pagamentoMesAtual', user?.id],
    queryFn: async () => {
      if (!user?.id || user?.role === 'admin') return null;
      
      const hoje = new Date();
      const mes = String(hoje.getMonth() + 1).padStart(2, '0');
      const ano = hoje.getFullYear();
      const mesRef = `${mes}/${ano}`;
      
      const pagamentos = await base44.entities.Pagamento.filter({
        empresa_id: user.id,
        mes_referencia: mesRef
      });
      
      return pagamentos[0] || null;
    },
    enabled: !!user && user?.role !== 'admin',
    refetchInterval: 60000, // Atualiza a cada minuto
  });

  // Calcular status de pagamento
  const getStatusPagamento = () => {
    if (!user || user.role === 'admin') return null;
    
    const hoje = new Date();
    const diaAtual = hoje.getDate();
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    
    // Se já pagou ou está aprovado/aguardando
    if (pagamentoAtual && (pagamentoAtual.status === 'aprovado' || pagamentoAtual.status === 'aguardando_verificacao')) {
      return null; // Não mostra alerta
    }
    
    // Últimos 5 dias do mês - se aproximando do vencimento (e ainda não pagou)
    if (diaAtual >= ultimoDiaMes - 4) {
      return {
        tipo: 'aproximando',
        mensagem: 'Pagamento vence dia 1º',
        cor: 'bg-yellow-500'
      };
    }
    
    // Entre dia 1 e 5 - período de carência (e ainda não pagou)
    if (diaAtual >= 1 && diaAtual <= 5) {
      return {
        tipo: 'carencia',
        mensagem: `Carência até dia 5 (${5 - diaAtual + 1} dias)`,
        submensagem: 'Após dia 5: bloqueio automático',
        cor: 'bg-orange-500'
      };
    }
    
    // Depois do dia 5 - atrasado (e ainda não pagou)
    if (diaAtual > 5) {
      return {
        tipo: 'atrasado',
        mensagem: 'Pagamento em atraso',
        submensagem: 'Sistema será bloqueado',
        cor: 'bg-red-500'
      };
    }
    
    return null;
  };

  const alertaPagamento = getStatusPagamento();

  // Busca de dados para notificações (APENAS PARA ADMINS)
  const { data: notificationData } = useQuery({
    queryKey: ['adminNotifications'],
    queryFn: async () => {
      const [pagamentos, tickets, chats] = await Promise.all([
        base44.entities.Pagamento.filter({ status: 'aguardando_verificacao' }),
        base44.entities.SuporteTicket.filter({ status: 'aberto' }),
        base44.entities.ChatConversa.filter({ status: 'aberto', unread_admin: true }),
      ]);
      return { pagamentos, tickets, chats };
    },
    enabled: isAdmin,
    refetchInterval: 15000, // Verifica a cada 15 segundos
  });

  // Processa os dados e dispara alertas
  useEffect(() => {
    if (isAdmin && notificationData) {
      const newNotifications = [];

      notificationData.pagamentos.forEach(p => newNotifications.push({
        id: `pag-${p.id}`,
        type: 'pagamento',
        title: `Pagamento de ${p.empresa_nome}`,
        description: `Enviou comprovante de R$ ${p.valor.toFixed(2)}.`,
        time: formatDistanceToNow(new Date(p.updated_date), { addSuffix: true, locale: ptBR }),
        link: createPageUrl('Administracao?tab=verificacao')
      }));

      notificationData.tickets.forEach(t => newNotifications.push({
        id: `tic-${t.id}`,
        type: 'ticket',
        title: `Novo Ticket: ${t.assunto}`,
        description: `De: ${t.cliente_nome}`,
        time: formatDistanceToNow(new Date(t.created_date), { addSuffix: true, locale: ptBR }),
        link: createPageUrl('Administracao?tab=tickets')
      }));

      notificationData.chats.forEach(c => newNotifications.push({
        id: `chat-${c.id}`,
        type: 'chat',
        title: `Chat: ${c.usuario_nome}`,
        description: `Assunto: ${c.assunto}`,
        time: formatDistanceToNow(new Date(c.last_message_date), { addSuffix: true, locale: ptBR }),
        link: createPageUrl('Administracao?tab=chat')
      }));

      setNotifications(newNotifications);

      // Lógica do Alerta VISUAL
      if (newNotifications.length > prevNotifCount.current) {
        setHasNewNotifications(true); // Ativa o alerta visual
      }
      prevNotifCount.current = newNotifications.length;
    }
  }, [isAdmin, notificationData]);

  if (isLoadingUser) {
     return <div className="w-screen h-screen flex items-center justify-center"><Loader className="w-12 h-12 animate-spin text-blue-600" /></div>;
  }

  // VERIFICAÇÃO DE BLOQUEIO DE MENSALIDADE
  const isBlocked = user && user.role !== 'admin' && user.status === 'inativo';
  if (isBlocked) {
    return <BloqueioMensalidade />;
  }

  // VERIFICAÇÃO DE TERMOS DE USO
  const needsToAcceptTerms = user && user.role !== 'admin' && !user.termos_aceitos;
  if(needsToAcceptTerms) {
    return <TermosDeUsoModal />;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-slate-100">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-3 px-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <span className="text-lg font-bold">GestãoPro</span>
                <p className="text-xs text-slate-500">Sistema de Gestão</p>
              </div>
            </div>
            
            {/* ALERTA DE PAGAMENTO */}
            {alertaPagamento && (
              <Link to={createPageUrl("Mensalidade")} className="mx-3 mt-3">
                <div className={cn(
                  "p-3 rounded-lg flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity",
                  alertaPagamento.cor
                )}>
                  <CreditCard className="w-4 h-4 text-white" />
                  <div className="flex-1">
                    <p className="text-white text-xs font-semibold">{alertaPagamento.mensagem}</p>
                    {alertaPagamento.submensagem && (
                      <p className="text-white text-xs opacity-90 font-bold">{alertaPagamento.submensagem}</p>
                    )}
                    <p className="text-white text-xs opacity-90 mt-1">Clique para pagar</p>
                  </div>
                </div>
              </Link>
            )}
          </SidebarHeader>
          
          <SidebarContent>
             <SidebarMenu>
               <SidebarGroup>
                 <SidebarGroupLabel>MENU PRINCIPAL</SidebarGroupLabel>
                 {navigationItems
                    .filter(item => !item.adminOnly || isAdmin)
                    .map((item, index) => {
                    const isActive = createPageUrl(currentPageName) === item.url;
                    return (
                      <SidebarMenuItem key={index} asChild>
                         <Link
                          to={item.url}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-slate-700 transition-all hover:bg-slate-200 hover:text-slate-900",
                            isActive && "bg-blue-600 text-white hover:bg-blue-600 hover:text-white"
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="truncate">{item.title}</span>
                         </Link>
                      </SidebarMenuItem>
                    );
                 })}
               </SidebarGroup>
             </SidebarMenu>
          </SidebarContent>
           <SidebarFooter>
              <div className="flex items-center gap-3 p-3 border-t">
                <div className="w-9 h-9 bg-emerald-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : '')}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-semibold truncate text-slate-800">{user?.full_name || 'Usuário'}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => base44.auth.logout()} aria-label="Sair">
                  <LogOut className="w-5 h-5 text-slate-600" />
                </Button>
              </div>
           </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="flex items-center justify-between p-4 bg-white border-b lg:justify-end">
            <SidebarTrigger className="lg:hidden">
              <Menu className="w-6 h-6" />
            </SidebarTrigger>
          </header>
          <div className="flex-1 overflow-x-hidden overflow-y-auto">
            {children}
            <Toaster />
          </div>
        </main>

        {isAdmin && <AdminCockpit 
          notifications={notifications} 
          hasNewNotifications={hasNewNotifications}
          onOpen={() => {
            setHasNewNotifications(false);
            prevNotifCount.current = notifications.length;
          }} 
        />}
      </div>
    </SidebarProvider>
  );
}
