import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  DollarSign,
  Loader,
  Zap,
  TrendingUp,
  UserPlus,
  UserX,
  RotateCcw,
  AlertTriangle,
  ExternalLink,
  Copy,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Radio
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const eventConfig = {
  'payment.approved': {
    label: 'Pagamento Aprovado',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    badgeColor: 'bg-green-100 text-green-800'
  },
  'subscription.created': {
    label: 'Nova Assinatura',
    icon: UserPlus,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badgeColor: 'bg-blue-100 text-blue-800'
  },
  'subscription.canceled': {
    label: 'Assinatura Cancelada',
    icon: UserX,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    badgeColor: 'bg-orange-100 text-orange-800'
  },
  'payment.refunded': {
    label: 'Pagamento Reembolsado',
    icon: RotateCcw,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    badgeColor: 'bg-red-100 text-red-800'
  },
  'manual': {
    label: 'Manual',
    icon: DollarSign,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    badgeColor: 'bg-gray-100 text-gray-800'
  }
};

export default function EventosBraipTab() {
  const { toast } = useToast();
  const [showDocs, setShowDocs] = useState(false);

  // Buscar configuração da Braip
  const { data: configs = [] } = useQuery({
    queryKey: ['braipConfig'],
    queryFn: () => base44.entities.BraipConfig.list(),
    initialData: []
  });

  const braipConfig = configs[0] || null;
  const isConnected = braipConfig?.status_conexao === 'conectado';
  const webhookUrl = braipConfig?.webhook_url;
  const webhookSecret = braipConfig?.webhook_secret;

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const generatedWebhookUrl = user?.id ? `https://webhook.base44.com/braip/${user.id}` : '';

  // Query com atualização automática a cada 5 segundos - TEMPO REAL
  const { data: eventosBraip = [], isLoading, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['eventosBraip'],
    queryFn: async () => {
      const pagamentos = await base44.entities.Pagamento.filter(
        { braip_transaction_id: { $exists: true, $ne: null } },
        '-created_date',
        100
      );
      return pagamentos;
    },
    refetchInterval: 5000, // ⚡ ATUALIZA A CADA 5 SEGUNDOS - TEMPO REAL
    initialData: []
  });

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl || generatedWebhookUrl);
    toast({
      title: "✅ URL Copiada!",
      description: "URL do webhook copiada para a área de transferência.",
    });
  };

  const copySecret = () => {
    navigator.clipboard.writeText(webhookSecret || '');
    toast({
      title: "✅ Chave Copiada!",
      description: "Chave única copiada para a área de transferência.",
    });
  };

  // Estatísticas dos eventos
  const stats = useMemo(() => {
    const totais = {
      'payment.approved': 0,
      'subscription.created': 0,
      'subscription.canceled': 0,
      'payment.refunded': 0
    };

    let valorTotal = 0;

    eventosBraip.forEach(evento => {
      const tipo = evento.braip_event_type || 'manual';
      if (totais.hasOwnProperty(tipo)) {
        totais[tipo]++;
      }
      
      if (tipo === 'payment.approved' || tipo === 'subscription.created') {
        valorTotal += evento.valor || 0;
      }
      if (tipo === 'payment.refunded') {
        valorTotal -= evento.valor || 0;
      }
    });

    return { totais, valorTotal };
  }, [eventosBraip]);

  // Último evento recebido
  const ultimoEvento = eventosBraip.length > 0 ? eventosBraip[0] : null;
  const tempoUltimoEvento = ultimoEvento ? formatDistanceToNow(new Date(ultimoEvento.created_date), { addSuffix: true, locale: ptBR }) : null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-slate-500">Carregando eventos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com atualização em tempo real */}
      <Card className="border-2 border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Eventos em Tempo Real</h3>
                <p className="text-sm text-slate-600 flex items-center gap-2">
                  <Radio className="w-3 h-3 text-green-500 animate-pulse" />
                  Atualização automática a cada 5 segundos
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold">AO VIVO</span>
              </div>
              {tempoUltimoEvento && (
                <p className="text-xs text-slate-500">
                  Último evento: {tempoUltimoEvento}
                </p>
              )}
              <Button
                onClick={() => refetch()}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar Agora
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status da Conexão com Braip */}
      <Card className={cn(
        "border-2",
        isConnected ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"
      )}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <>
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <h3 className="font-bold text-green-900 text-lg">✅ Conectado com Braip</h3>
                  <p className="text-sm text-green-700">
                    Webhook ativo. Eventos serão recebidos automaticamente quando houver vendas/assinaturas na Braip.
                  </p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="w-8 h-8 text-red-600" />
                <div>
                  <h3 className="font-bold text-red-900 text-lg">❌ Não Conectado</h3>
                  <p className="text-sm text-red-700">
                    Webhook não configurado. Configure o token na aba "API Pagamentos" e siga as instruções abaixo.
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alerta de configuração do Webhook */}
      {eventosBraip.length === 0 && (
        <Alert className="bg-blue-50 border-blue-300">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            <div className="space-y-3">
              <p className="font-semibold text-blue-900 text-lg">🔗 Configure o Webhook da Braip</p>
              <p className="text-sm text-blue-800">
                Para que as vendas apareçam aqui automaticamente em tempo real, você precisa configurar o webhook na Braip.
              </p>
              
              <div className="bg-white p-4 rounded-lg border border-blue-200 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-1">1️⃣ URL do Webhook (copie isto):</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-slate-100 rounded text-xs font-mono text-slate-900 overflow-x-auto">
                      {webhookUrl || generatedWebhookUrl}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyWebhook}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {webhookSecret && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">2️⃣ Chave Única (copie isto também):</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-slate-100 rounded text-xs font-mono text-slate-900 overflow-x-auto">
                        {webhookSecret}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copySecret}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Collapsible open={showDocs} onOpenChange={setShowDocs}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <BookOpen className="w-4 h-4 mr-2" />
                    {showDocs ? 'Ocultar' : 'Ver'} Passo a Passo Completo
                    {showDocs ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="bg-white p-4 rounded-lg border border-blue-200 space-y-4">
                    <div>
                      <p className="font-semibold text-blue-900 mb-2">📝 Passos Detalhados na Braip:</p>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
                        <li>Acesse <strong>Braip.com</strong> e faça login</li>
                        <li>No menu lateral, vá em <strong>Ferramentas → Integrações → Webhooks</strong></li>
                        <li>Clique no botão <strong>"+ Adicionar Webhook"</strong></li>
                        <li>
                          <strong>URL de Notificação:</strong> Cole a URL copiada acima
                          <code className="block mt-1 p-2 bg-slate-100 rounded text-xs">
                            {webhookUrl || generatedWebhookUrl}
                          </code>
                        </li>
                        <li>
                          <strong>Chave de Autenticação:</strong> Cole a chave única copiada acima
                          {webhookSecret && (
                            <code className="block mt-1 p-2 bg-slate-100 rounded text-xs">
                              {webhookSecret}
                            </code>
                          )}
                        </li>
                        <li>
                          <strong>Método:</strong> Selecione <Badge>POST</Badge>
                        </li>
                        <li>
                          <strong>Eventos:</strong> Marque os seguintes eventos:
                          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                            <li>✅ <strong>Vendas</strong> (STATUS_ALTERADO)</li>
                            <li>✅ <strong>Assinatura</strong> (criação e cancelamento)</li>
                          </ul>
                        </li>
                        <li>Clique em <strong>"Salvar"</strong></li>
                      </ol>
                    </div>

                    <Alert className="bg-green-50 border-green-300">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription>
                        <p className="font-semibold text-green-900">Status Code da Braip → Eventos GestãoPro:</p>
                        <ul className="text-xs text-green-800 space-y-1 mt-2">
                          <li>• <strong>trans_status_code = 2</strong> (Pagamento Aprovado) → ✅ payment.approved</li>
                          <li>• <strong>trans_status_code = 3</strong> (Cancelada) → 🔶 subscription.canceled</li>
                          <li>• <strong>trans_status_code = 5</strong> (Devolvida) → 🔴 payment.refunded</li>
                          <li>• <strong>subs_key presente</strong> → Identifica assinatura recorrente</li>
                        </ul>
                      </AlertDescription>
                    </Alert>

                    <Alert className="bg-red-50 border-red-300">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription>
                        <p className="font-semibold text-red-900">🔒 Bloqueio Automático de Segurança:</p>
                        <p className="text-xs text-red-800 mt-1">
                          Quando o webhook notificar <strong>status_code 3 ou 5</strong> (cancelamento/reembolso), 
                          o GestãoPro irá <strong>bloquear automaticamente</strong> o acesso do cliente.
                        </p>
                      </AlertDescription>
                    </Alert>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex items-start gap-2 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold">⚡ Teste o Webhook:</p>
                  <p>Após configurar, faça uma venda de teste na Braip (pode ser R$ 1,00). O evento aparecerá aqui em até 5 segundos!</p>
                </div>
              </div>

              <Button
                onClick={() => window.open('https://braip.com', '_blank')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ir para Braip.com Configurar Webhook
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta se não conectado */}
      {!isConnected && eventosBraip.length > 0 && (
        <Alert className="bg-orange-50 border-orange-300">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold text-orange-900">⚠️ Conexão Inativa</p>
              <p className="text-sm text-orange-800">
                Você tem eventos anteriores, mas o token não está validado. 
                Valide o token na aba "API Pagamentos" para receber novos eventos.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Pagamentos</p>
                <p className="text-3xl font-bold text-green-900">{stats.totais['payment.approved']}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Assinaturas</p>
                <p className="text-3xl font-bold text-blue-900">{stats.totais['subscription.created']}</p>
              </div>
              <UserPlus className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium">Cancelamentos</p>
                <p className="text-3xl font-bold text-orange-900">{stats.totais['subscription.canceled']}</p>
              </div>
              <UserX className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-medium">Reembolsos</p>
                <p className="text-3xl font-bold text-red-900">{stats.totais['payment.refunded']}</p>
              </div>
              <RotateCcw className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Valor Total</p>
                <p className="text-2xl font-bold text-purple-900">R$ {stats.valorTotal.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de eventos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            Histórico de Eventos ({eventosBraip.length})
          </CardTitle>
          <CardDescription>
            Eventos sincronizados automaticamente via webhook da Braip em tempo real (atualiza a cada 5 segundos).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eventosBraip.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg font-semibold mb-2">Aguardando Eventos da Braip</p>
              <p className="text-slate-400 text-sm mb-4">
                Configure o webhook acima para que as vendas apareçam aqui automaticamente.<br />
                Quando houver pagamentos ou assinaturas na Braip, eles aparecerão em até 5 segundos!
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                {eventosBraip.map((evento) => {
                  const eventType = evento.braip_event_type || 'manual';
                  const config = eventConfig[eventType] || eventConfig.manual;
                  const Icon = config.icon;

                  return (
                    <div
                      key={evento.id}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all hover:shadow-md",
                        config.bgColor,
                        config.borderColor
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0", config.bgColor)}>
                          <Icon className={cn("w-6 h-6", config.color)} />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={config.badgeColor}>
                              {config.label}
                            </Badge>
                            {evento.is_subscription && (
                              <Badge variant="outline" className="text-xs">
                                Recorrente
                              </Badge>
                            )}
                            <span className="text-xs text-slate-500">
                              {formatDistanceToNow(new Date(evento.created_date), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </span>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-900">
                              {evento.empresa_nome}
                            </p>
                            
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                <strong className={cn(
                                  "text-lg",
                                  eventType === 'payment.refunded' ? 'text-red-600' : 'text-green-600'
                                )}>
                                  {eventType === 'payment.refunded' ? '- ' : ''}
                                  R$ {evento.valor.toFixed(2)}
                                </strong>
                              </span>
                              
                              {evento.mes_referencia && (
                                <span>Ref: {evento.mes_referencia}</span>
                              )}
                              
                              {evento.forma_pagamento && (
                                <Badge variant="outline" className="text-xs">
                                  {evento.forma_pagamento}
                                </Badge>
                              )}
                            </div>
                            
                            {evento.observacoes && (
                              <p className="text-xs text-slate-500 mt-2 italic">
                                {evento.observacoes}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                              <span>ID: {evento.braip_transaction_id}</span>
                              <span>•</span>
                              <span>{format(new Date(evento.created_date), "dd/MM/yyyy 'às' HH:mm:ss")}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Informações sobre Tempo Real */}
      <Alert className="bg-blue-50 border-blue-300">
        <Radio className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          <p className="font-semibold text-blue-900">📡 Sistema de Tempo Real Ativo</p>
          <ul className="text-sm text-blue-800 space-y-1 mt-2">
            <li>• <strong>Webhook:</strong> Braip envia notificação instantânea quando há venda/assinatura</li>
            <li>• <strong>Polling:</strong> Esta tela verifica novos eventos a cada 5 segundos automaticamente</li>
            <li>• <strong>Latência:</strong> Eventos aparecem em até 5-10 segundos após a venda na Braip</li>
            <li>• <strong>Não precisa recarregar:</strong> A lista atualiza sozinha em segundo plano</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}