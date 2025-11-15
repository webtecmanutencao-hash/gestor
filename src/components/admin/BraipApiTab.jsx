
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Loader, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Link as LinkIcon,
  Zap,
  ExternalLink,
  Save,
  Trash2,
  Copy,
  AlertCircle,
  Clock,
  Shield,
  Key,
  Code, // Added
  Server, // Added
  Settings // Added
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BraipApiTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [apiToken, setApiToken] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [customWebhookUrl, setCustomWebhookUrl] = useState('');
  const [showToken, setShowToken] = useState(false); // Unused, but kept as per original
  const [showSecret, setShowSecret] = useState(false);
  const [showRenderGuide, setShowRenderGuide] = useState(false); // New state

  const { data: configs = [], isLoading: isLoadingConfigs } = useQuery({
    queryKey: ['braipConfig'],
    queryFn: () => base44.entities.BraipConfig.list(),
    initialData: []
  });

  const braipConfig = configs[0] || null;

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  // URL sugerida (para o deploy no Render.com)
  const suggestedWebhookUrl = `https://seu-backend.onrender.com/webhook/braip`;
  
  // Usa a URL customizada se existir, senão a salva no braipConfig, senão a sugerida
  const webhookUrl = customWebhookUrl || braipConfig?.webhook_url || suggestedWebhookUrl;

  const { data: todosPagamentosRecentes = [] } = useQuery({
    queryKey: ['todosPagamentosRecentes'],
    queryFn: async () => {
      const pagamentos = await base44.entities.Pagamento.list('-created_date', 10);
      return pagamentos;
    },
    refetchInterval: 5000,
    initialData: []
  });

  const { data: pagamentosBraip = [] } = useQuery({
    queryKey: ['pagamentosBraip'],
    queryFn: async () => {
      const pagamentos = await base44.entities.Pagamento.filter(
        { braip_transaction_id: { $exists: true, $ne: null } },
        '-created_date',
        10
      );
      return pagamentos;
    },
    refetchInterval: 5000,
    initialData: []
  });

  useEffect(() => {
    if (braipConfig) {
      setApiToken(braipConfig.api_token || '');
      setWebhookSecret(braipConfig.webhook_secret || '');
      setCustomWebhookUrl(braipConfig.webhook_url || '');
    }
  }, [braipConfig]);

  const getTokenStatus = () => {
    if (!braipConfig?.token_expires_at) return null;
    
    const expiresAt = new Date(braipConfig.token_expires_at);
    const now = new Date();
    const diffTime = expiresAt - now;
    const daysUntilExpire = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpire < 0) {
      return {
        type: 'expired',
        daysUntilExpire: Math.abs(daysUntilExpire),
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-300'
      };
    }
    
    if (daysUntilExpire <= 7) {
      return {
        type: 'expiring',
        daysUntilExpire: daysUntilExpire,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-300'
      };
    }
    
    return {
      type: 'valid',
      daysUntilExpire: daysUntilExpire,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300'
    };
  };

  const tokenStatus = getTokenStatus();

  // Nova mutation para salvar URL customizada
  const saveWebhookUrlMutation = useMutation({
    mutationFn: async (url) => {
      if (braipConfig?.id) {
        return await base44.entities.BraipConfig.update(braipConfig.id, {
          webhook_url: url
        });
      } else {
        return await base44.entities.BraipConfig.create({
          webhook_url: url
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['braipConfig'] });
      toast({
        title: "✅ URL Salva!",
        description: "URL do webhook foi salva com sucesso.",
      });
    }
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (data) => {
      if (braipConfig?.id) {
        return await base44.entities.BraipConfig.update(braipConfig.id, data);
      } else {
        return await base44.entities.BraipConfig.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['braipConfig'] });
      toast({
        title: "✅ Configurações Salvas",
        description: "Token salvo com sucesso.",
      });
    }
  });

  const saveWebhookSecretMutation = useMutation({
    mutationFn: async (secret) => {
      if (braipConfig?.id) {
        return await base44.entities.BraipConfig.update(braipConfig.id, {
          webhook_secret: secret
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['braipConfig'] });
      toast({
        title: "✅ Chave Salva",
      });
    }
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      try {
        const tokenParts = apiToken.split('.');
        if (tokenParts.length !== 3) {
          throw new Error('Token JWT inválido.');
        }

        const payload = JSON.parse(atob(tokenParts[1]));
        
        if (!payload.exp) {
          throw new Error('Token sem data de expiração.');
        }

        const expiresAt = new Date(payload.exp * 1000);
        const now = new Date();

        if (expiresAt < now) {
          throw new Error('TOKEN EXPIRADO! Gere um novo token na Braip.');
        }

        return {
          success: true,
          expiresAt: expiresAt.toISOString(),
          payload: payload
        };
      } catch (error) {
        throw error;
      }
    },
    onSuccess: async (result) => {
      await saveConfigMutation.mutateAsync({
        api_token: apiToken,
        token_expires_at: result.expiresAt,
        status_conexao: 'conectado',
        ultimo_erro: null
      });

      const daysUntilExpire = Math.floor((new Date(result.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));

      toast({
        title: "✅ Token Validado",
        description: `Válido por mais ${daysUntilExpire} dias.`,
      });
    },
    onError: (error) => {
      if (braipConfig?.id) {
        saveConfigMutation.mutate({
          status_conexao: 'erro',
          ultimo_erro: error.message
        });
      }

      toast({
        title: "❌ Erro no Token",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (braipConfig?.id) {
        return await base44.entities.BraipConfig.update(braipConfig.id, {
          api_token: null,
          token_expires_at: null,
          status_conexao: 'desconectado',
          ultimo_erro: null
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['braipConfig'] });
      setApiToken('');
      toast({
        title: "✅ Desconectado",
      });
    }
  });

  const handleSaveToken = () => {
    if (!apiToken || apiToken.length < 50) {
      toast({
        title: "⚠️ Token Inválido",
        variant: "destructive"
      });
      return;
    }

    saveConfigMutation.mutate({
      api_token: apiToken,
      status_conexao: 'desconectado'
    });
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({ title: "✅ Copiado" });
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast({ title: "✅ Código Copiado!" });
  };

  const isExpired = tokenStatus?.type === 'expired';
  const isConnected = braipConfig?.status_conexao === 'conectado';

  const checklistItems = [
    {
      id: 'token',
      label: 'Token JWT Configurado',
      status: braipConfig?.api_token ? 'done' : 'pending',
      description: 'Token de acesso à API da Braip'
    },
    {
      id: 'token_valid',
      label: 'Token Validado',
      status: isConnected ? 'done' : 'pending',
      description: 'Token verificado e ativo'
    },
    {
      id: 'webhook_url',
      label: 'URL do Webhook Configurada',
      status: webhookUrl && webhookUrl !== suggestedWebhookUrl ? 'done' : 'pending', // Check if custom URL is set, or if braipConfig.webhook_url is set
      description: 'Endpoint que receberá notificações da Braip'
    },
    {
      id: 'webhook_secret',
      label: 'Chave Única Salva',
      status: braipConfig?.webhook_secret ? 'done' : 'pending',
      description: 'Chave de segurança do webhook (CRÍTICO!)'
    },
    {
      id: 'webhook_braip',
      label: 'Webhook Funcionando',
      status: pagamentosBraip.length > 0 ? 'done' : 'pending',
      description: 'Webhook configurado na Braip e recebendo eventos'
    }
  ];

  const allDone = checklistItems.every(item => item.status === 'done');

  if (isLoadingConfigs) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  const backendCode = `// server.js - Backend Node.js + Express para Render.com
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// ========================================
// CONFIGURAÇÕES - SUBSTITUA COM SEUS DADOS
// ========================================

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '${webhookSecret || 'SUA_CHAVE_AQUI'}';

// ⚠️ IMPORTANTE: URL CORRETA da API Base44
// A URL base do seu app na Base44 (exemplo: https://app--meu-negocio.base44.app)
const BASE44_APP_URL = process.env.BASE44_APP_URL || 'https://app--meu-negocio.base44.app';

// ID do seu app (você encontra no dashboard da Base44)
const BASE44_APP_ID = process.env.BASE44_APP_ID || 'seu-app-id-aqui';

// Token de autenticação (gere no Dashboard → Settings → API)
const BASE44_API_KEY = process.env.BASE44_API_KEY || 'seu-api-key-aqui';

// ========================================
// ENDPOINT QUE RECEBE WEBHOOKS DA BRAIP
// ========================================

app.post('/webhook/braip', async (req, res) => {
  try {
    console.log('📥 Webhook recebido da Braip:', JSON.stringify(req.body));
    
    // 1. VALIDAR CHAVE ÚNICA (Segurança)
    const secret = req.headers['x-webhook-secret'] || req.body.webhook_secret;
    
    if (secret !== WEBHOOK_SECRET) {
      console.log('❌ Chave inválida. Recebido:', secret, 'Esperado:', WEBHOOK_SECRET);
      return res.status(401).json({ error: 'Unauthorized - Invalid webhook secret' });
    }
    
    console.log('✅ Chave validada com sucesso');
    
    // 2. EXTRAIR DADOS DA BRAIP
    const {
      trans_id,           // ID da transação
      trans_status,       // Status: 2=aprovado, 3=cancelado, 5=reembolsado
      trans_value,        // Valor
      client_name,        // Nome do cliente
      client_email,       // Email
      subs_key,           // Chave de assinatura (se for recorrente)
      product_name,       // Nome do produto
    } = req.body;
    
    console.log('📋 Dados extraídos:', {
      trans_id,
      trans_status,
      trans_value,
      client_name,
      client_email
    });
    
    // 3. DETERMINAR TIPO DE EVENTO E STATUS
    let eventType = 'manual';
    let status = 'pendente';
    
    if (trans_status === 2) {
      eventType = 'payment.approved';
      status = 'aprovado';
    } else if (trans_status === 3) {
      eventType = 'subscription.canceled';
      status = 'cancelado';
    } else if (trans_status === 5) {
      eventType = 'payment.refunded';
      status = 'reembolsado';
    }
    
    if (subs_key) {
      eventType = 'subscription.created';
    }
    
    console.log('🔄 Evento identificado:', eventType, 'Status:', status);
    
    // 4. CALCULAR MÊS DE REFERÊNCIA
    const hoje = new Date();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    const mesReferencia = \`\${mes}/\${ano}\`;
    const dataVencimento = \`\${ano}-\${mes}-01\`;
    
    // 5. MONTAR DADOS DO PAGAMENTO
    const pagamentoData = {
      empresa_id: client_email,
      empresa_nome: client_name,
      valor: parseFloat(trans_value),
      mes_referencia: mesReferencia,
      data_vencimento: dataVencimento,
      data_pagamento: hoje.toISOString().split('T')[0],
      status: status,
      braip_transaction_id: trans_id,
      braip_event_type: eventType,
      is_subscription: !!subs_key,
      forma_pagamento: 'braip',
      observacoes: \`Produto: \${product_name || 'N/A'}\`
    };
    
    console.log('💾 Dados do pagamento preparados:', JSON.stringify(pagamentoData));
    
    // 6. CRIAR PAGAMENTO NO BASE44
    // ⚠️ URL CORRETA: /api/apps/{app_id}/entities/{entity_name}
    const apiUrl = \`\${BASE44_APP_URL}/api/apps/\${BASE44_APP_ID}/entities/Pagamento\`;
    
    console.log('📡 Enviando para Base44:', apiUrl);
    
    const response = await axios.post(
      apiUrl,
      pagamentoData,
      {
        headers: {
          'Authorization': \`Bearer \${BASE44_API_KEY}\`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Pagamento criado com sucesso no Base44:', response.data);
    
    // 7. SE FOR CANCELAMENTO/REEMBOLSO, BLOQUEAR USUÁRIO
    if (eventType === 'subscription.canceled' || eventType === 'payment.refunded') {
      console.log('🔒 Bloqueando usuário devido a:', eventType);
      
      try {
        const userApiUrl = \`\${BASE44_APP_URL}/api/apps/\${BASE44_APP_ID}/entities/User\`;
        
        // Buscar usuário pelo email
        const userResponse = await axios.get(
          \`\${userApiUrl}?filter=\${encodeURIComponent(JSON.stringify({ email: client_email }))}\`,
          {
            headers: {
              'Authorization': \`Bearer \${BASE44_API_KEY}\`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (userResponse.data && userResponse.data.length > 0) {
          const userId = userResponse.data[0].id;
          
          // Bloquear usuário
          await axios.patch(
            \`\${userApiUrl}/\${userId}\`,
            { 
              status: 'inativo',
              observacoes_bloqueio: \`Bloqueio automático: \${eventType === 'subscription.canceled' ? 'Assinatura cancelada' : 'Pagamento reembolsado'} na Braip\`
            },
            {
              headers: {
                'Authorization': \`Bearer \${BASE44_API_KEY}\`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          console.log(\`✅ Usuário \${client_email} bloqueado com sucesso\`);
        } else {
          console.log(\`⚠️ Usuário com email \${client_email} não encontrado no Base44 para bloqueio.\`);
        }
      } catch (blockError) {
        console.error('❌ Erro ao bloquear usuário:', blockError.response ? blockError.response.data : blockError.message);
        // Não retorna erro, pois o pagamento foi criado com sucesso
      }
    }
    
    // 8. RESPONDER À BRAIP
    return res.status(200).json({ 
      success: true, 
      message: 'Webhook processado com sucesso',
      event_type: eventType,
      pagamento_id: response.data.id 
    });
    
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error.response ? error.response.data : error.message);
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.response ? error.response.data : error.message,
      stack: error.stack
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    config: {
      base44_url: BASE44_APP_URL,
      app_id: BASE44_APP_ID ? 'Configurado ✅' : 'NÃO configurado ❌',
      api_key: BASE44_API_KEY ? 'Configurado ✅' : 'NÃO configurado ❌',
      webhook_secret: WEBHOOK_SECRET ? 'Configurado ✅' : 'NÃO configurado ❌'
    }
  });
});

// Endpoint de teste (DELETE em produção)
app.get('/test', (req, res) => {
  res.json({
    message: 'Servidor funcionando!',
    endpoint_webhook: '/webhook/braip',
    health_check: '/health'
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`🚀 Servidor rodando na porta \${PORT}\`);
  console.log(\`📡 Webhook endpoint: http://localhost:\${PORT}/webhook/braip\`);
  console.log(\`🔍 Health check: http://localhost:\${PORT}/health\`);
  console.log(\`📍 Base44 URL: \${BASE44_APP_URL}\`);
  console.log(\`📱 App ID: \${BASE44_APP_ID}\`);
  console.log(\`🔐 Webhook Secret configurado: \${WEBHOOK_SECRET ? 'SIM ✅' : 'NÃO ❌'}\`);
});`;

  const packageJson = `{
  "name": "gestaopro-braip-webhook",
  "version": "1.0.0",
  "description": "Backend para receber webhooks da Braip e enviar para GestãoPro",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.0"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}`;


  return (
    <div className="space-y-6">
      
      {/* SOLUÇÃO COM RENDER.COM */}
      <Card className="border-2 border-green-500 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-6 h-6 text-green-600" />
            ✅ SOLUÇÃO PERFEITA: Deploy Backend no Render.com
          </CardTitle>
          <CardDescription>
            Crie um backend simples que recebe webhooks da Braip e envia para o GestãoPro
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-green-100 border-green-300">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <p className="font-semibold text-green-900 mb-2">🎯 Por que Render.com é perfeito:</p>
              <ul className="text-sm text-green-800 space-y-1">
                <li>✅ Deploy gratuito (plano free)</li>
                <li>✅ HTTPS automático (obrigatório para webhooks)</li>
                <li>✅ Deploy em 5 minutos</li>
                <li>✅ URL permanente (ex: seu-backend.onrender.com)</li>
                <li>✅ Reinicia automaticamente se cair</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Dialog open={showRenderGuide} onOpenChange={setShowRenderGuide}>
            <DialogTrigger asChild>
              <Button className="w-full bg-green-600 hover:bg-green-700" size="lg">
                <Code className="w-5 h-5 mr-2" />
                Ver Código Completo + Passo a Passo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Server className="w-6 h-6 text-green-600" />
                  Deploy Backend no Render.com - Guia Completo
                </DialogTitle>
                <DialogDescription>
                  Siga os passos abaixo para ter seu webhook funcionando em 10 minutos
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="step1" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="step1">1. Código</TabsTrigger>
                  <TabsTrigger value="step2">2. Deploy</TabsTrigger>
                  <TabsTrigger value="step3">3. Config</TabsTrigger>
                  <TabsTrigger value="step4">4. Testar</TabsTrigger>
                </TabsList>

                <TabsContent value="step1" className="space-y-4">
                  <Alert className="bg-blue-50 border-blue-300">
                    <Code className="h-4 w-4 text-blue-600" />
                    <AlertDescription>
                      <p className="font-semibold text-blue-900 mb-2">📝 PASSO 1: Copiar Código</p>
                      <p className="text-sm text-blue-800">
                        Copie os 2 arquivos abaixo. Você vai usá-los no Render.com.
                      </p>
                    </AlertDescription>
                  </Alert>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="font-bold">server.js</Label>
                      <Button size="sm" variant="outline" onClick={() => copyCode(backendCode)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar
                      </Button>
                    </div>
                    <Textarea
                      value={backendCode}
                      readOnly
                      rows={20}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="font-bold">package.json</Label>
                      <Button size="sm" variant="outline" onClick={() => copyCode(packageJson)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar
                      </Button>
                    </div>
                    <Textarea
                      value={packageJson}
                      readOnly
                      rows={12}
                      className="font-mono text-xs"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="step2" className="space-y-4">
                  <Alert className="bg-purple-50 border-purple-300">
                    <Server className="h-4 w-4 text-purple-600" />
                    <AlertDescription>
                      <p className="font-semibold text-purple-900 mb-2">🚀 PASSO 2: Deploy no Render.com</p>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <div className="bg-white p-4 rounded-lg border">
                      <p className="font-semibold mb-2">1. Criar conta no Render.com</p>
                      <Button
                        onClick={() => window.open('https://render.com', '_blank')}
                        variant="outline"
                        className="w-full"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ir para Render.com
                      </Button>
                      <p className="text-xs text-slate-500 mt-2">
                        • Crie conta grátis com GitHub/Google<br />
                        • Não precisa cartão de crédito
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border">
                      <p className="font-semibold mb-2">2. Criar novo Web Service</p>
                      <ol className="list-decimal list-inside text-sm space-y-1">
                        <li>No dashboard, clique em "New +" → "Web Service"</li>
                        <li>Escolha "Deploy from Git" ou "Deploy without Git"</li>
                        <li>Se escolher "without Git": cole os códigos quando pedir</li>
                      </ol>
                    </div>

                    <div className="bg-white p-4 rounded-lg border">
                      <p className="font-semibold mb-2">3. Configurar Web Service</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        <li><strong>Name:</strong> gestaopro-webhook</li>
                        <li><strong>Runtime:</strong> Node</li>
                        <li><strong>Build Command:</strong> (deixe vazio)</li>
                        <li><strong>Start Command:</strong> node server.js</li>
                        <li><strong>Plan:</strong> Free</li>
                      </ul>
                    </div>

                    <div className="bg-white p-4 rounded-lg border">
                      <p className="font-semibold mb-2">4. Adicionar Variáveis de Ambiente</p>
                      <p className="text-sm mb-2">Em "Environment Variables", adicione:</p>
                      <code className="block bg-slate-100 p-2 rounded text-xs">
                        WEBHOOK_SECRET = {webhookSecret || 'sua-chave-aqui'}<br />
                        BASE44_APP_URL = https://app--seu-app.base44.app<br />
                        BASE44_APP_ID = seu-app-id-aqui<br />
                        BASE44_API_KEY = seu-api-key-base44
                      </code>
                    </div>

                    <div className="bg-white p-4 rounded-lg border">
                      <p className="font-semibold mb-2">5. Fazer Deploy</p>
                      <p className="text-sm">
                        • Clique em "Create Web Service"<br />
                        • Aguarde 2-3 minutos para o deploy<br />
                        • ✅ URL estará disponível: <code>https://gestaopro-webhook.onrender.com</code>
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="step3" className="space-y-4">
                  <Alert className="bg-orange-50 border-orange-300">
                    <Settings className="h-4 w-4 text-orange-600" />
                    <AlertDescription>
                      <p className="font-semibold text-orange-900 mb-2">⚙️ PASSO 3: Configurar URLs</p>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <div className="bg-white p-4 rounded-lg border">
                      <p className="font-semibold mb-2">1. Copiar URL do Render</p>
                      <p className="text-sm mb-2">
                        Após deploy, copie a URL que o Render gerou. Por exemplo:
                      </p>
                      <code className="block bg-slate-100 p-2 rounded text-xs">
                        https://gestaopro-webhook.onrender.com
                      </code>
                      <p className="text-xs text-slate-500 mt-2">
                        ⚠️ Adicione <strong>/webhook/braip</strong> no final para ficar:<br />
                        <code>https://gestaopro-webhook.onrender.com/webhook/braip</code>
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border">
                      <p className="font-semibold mb-2">2. Salvar no GestãoPro (AQUI)</p>
                      <p className="text-sm mb-2">
                        Cole a URL completa no campo "URL do Backend (Render.com)" abaixo e salve.
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border">
                      <p className="font-semibold mb-2">3. Configurar na Braip</p>
                      <ol className="list-decimal list-inside text-sm space-y-1">
                        <li>Acesse Braip.com → Ferramentas → Webhooks</li>
                        <li>Crie um novo webhook ou edite um existente.</li>
                        <li>Cole a URL: <code>https://seu-backend.onrender.com/webhook/braip</code></li>
                        <li>Cole a Chave Única (a mesma que você salvou no GestãoPro e configurou no Render)</li>
                        <li>Método: POST</li>
                        <li>Eventos: Vendas (STATUS_ALTERADO) e Assinaturas (criação e cancelamento)</li>
                        <li>Salvar</li>
                      </ol>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="step4" className="space-y-4">
                  <Alert className="bg-green-50 border-green-300">
                    <Zap className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      <p className="font-semibold text-green-900 mb-2">✅ PASSO 4: Testar</p>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <div className="bg-white p-4 rounded-lg border">
                      <p className="font-semibold mb-2">1. Testar se backend está rodando</p>
                      <p className="text-sm mb-2">
                        Acesse no navegador (substitua `seu-backend` pela sua URL do Render):
                      </p>
                      <code className="block bg-slate-100 p-2 rounded text-xs">
                        https://seu-backend.onrender.com/health
                      </code>
                      <p className="text-xs text-slate-500 mt-2">
                        ✅ Deve retornar: <code>{`{"status": "ok", "timestamp": "...", "config": {...}}`}</code>
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border">
                      <p className="font-semibold mb-2">2. Fazer venda teste na Braip</p>
                      <ol className="list-decimal list-inside text-sm space-y-1">
                        <li>Crie um produto de teste (R$ 1,00)</li>
                        <li>Faça uma compra teste</li>
                        <li>Aguarde 5-10 segundos</li>
                      </ol>
                    </div>

                    <div className="bg-white p-4 rounded-lg border">
                      <p className="font-semibold mb-2">3. Verificar no GestãoPro</p>
                      <p className="text-sm">
                        Volte para a aba "Braip" e veja se apareceu o pagamento com badge "Braip ✓"
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border">
                      <p className="font-semibold mb-2">4. Ver logs no Render (se necessário)</p>
                      <p className="text-sm">
                        No Render.com → seu-web-service → Logs<br />
                        Você verá as requisições chegando em tempo real. Se houver erros, eles aparecerão aqui.
                      </p>
                    </div>
                  </div>

                  <Alert className="bg-green-100 border-green-300">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      <p className="font-semibold text-green-900">🎉 Pronto!</p>
                      <p className="text-sm text-green-800 mt-1">
                        Agora toda venda na Braip aparecerá automaticamente no GestãoPro em até 10 segundos!
                      </p>
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => window.open('https://render.com', '_blank')}
              variant="outline"
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ir para Render.com
            </Button>
            <Button
              onClick={() => window.open('https://docs.render.com', '_blank')}
              variant="outline"
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Docs Render
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CHECKLIST DE CONFIGURAÇÃO */}
      <Card className={`border-2 ${allDone ? 'border-green-500 bg-green-50' : 'border-orange-500 bg-orange-50'}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6" />
            {allDone ? '✅ Integração Completa!' : '⚠️ Configuração Incompleta'}
          </CardTitle>
          <CardDescription>
            {allDone 
              ? 'Todos os passos estão concluídos. A integração deve estar funcionando.'
              : 'Complete os passos abaixo para ativar a integração em tempo real.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {checklistItems.map((item) => (
            <div key={item.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border">
              <div className="mt-0.5">
                {item.status === 'done' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-600">{item.description}</p>
              </div>
              <Badge variant={item.status === 'done' ? 'success' : 'destructive'}>
                {item.status === 'done' ? 'OK' : 'Pendente'}
              </Badge>
            </div>
          ))}

          {!allDone && (
            <Alert className="bg-blue-50 border-blue-300 mt-4">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <p className="font-semibold text-blue-900 mb-2">📋 O que fazer agora:</p>
                <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                  {!braipConfig?.api_token && <li>Cole o Token JWT abaixo e clique em "Salvar Token"</li>}
                  {braipConfig?.api_token && !isConnected && <li>Clique em "Validar Token" para ativar a conexão</li>}
                  {!webhookUrl && <li><strong className="text-red-700">URGENTE:</strong> Siga o guia do Render.com para configurar a URL do Webhook.</li>}
                  {!braipConfig?.webhook_secret && <li><strong className="text-red-700">CRÍTICO:</strong> Configure a Chave Única.</li>}
                  {braipConfig?.webhook_secret && pagamentosBraip.length === 0 && (
                    <li>Faça uma venda teste na Braip para verificar se o webhook está funcionando.</li>
                  )}
                </ol>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {tokenStatus && (tokenStatus.type === 'expired' || tokenStatus.type === 'expiring') && (
        <Alert className={`${tokenStatus.bgColor} ${tokenStatus.borderColor} border-2`}>
          <AlertTriangle className={`h-5 w-5 ${tokenStatus.color}`} />
          <AlertDescription>
            <div className="space-y-3">
              <p className={`font-bold text-lg ${tokenStatus.color}`}>
                {tokenStatus.type === 'expired' 
                  ? `⚠️ TOKEN EXPIRADO HÁ ${tokenStatus.daysUntilExpire} DIAS` 
                  : `⏰ Token expira em ${tokenStatus.daysUntilExpire} dias`}
              </p>
              <p className="text-sm">
                {tokenStatus.type === 'expired' 
                  ? 'Sua integração NÃO está funcionando! Gere um novo token AGORA.'
                  : 'Gere um novo token em breve para evitar interrupções.'}
              </p>
              <div className="bg-white p-4 rounded-lg border">
                <p className="font-semibold mb-2">🔄 Como Renovar:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Acesse Braip.com</li>
                  <li>Vá em Configurações → Integração → Token de API</li>
                  <li>Clique em Gerar Novo Token</li>
                  <li>Cole abaixo e valide</li>
                </ol>
              </div>
              <Button
                onClick={() => window.open('https://braip.com', '_blank')}
                className={`w-full ${tokenStatus.type === 'expired' ? 'bg-red-600' : 'bg-orange-600'}`}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ir para Braip Gerar Token
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-2 border-purple-500 bg-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-purple-600" />
            🔍 Diagnóstico de Webhooks
          </CardTitle>
          <CardDescription>
            Verifique se os pagamentos da Braip estão chegando corretamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm font-semibold text-slate-700 mb-2">
                📋 Total de Pagamentos (últimos 10):
              </p>
              <p className="text-3xl font-bold text-slate-900">
                {todosPagamentosRecentes.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Todos os pagamentos no sistema
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm font-semibold text-slate-700 mb-2">
                ⚡ Pagamentos da Braip (últimos 10):
              </p>
              <p className="text-3xl font-bold text-purple-900">
                {pagamentosBraip.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Com braip_transaction_id
              </p>
            </div>
          </div>

          {todosPagamentosRecentes.length > 0 && pagamentosBraip.length === 0 && (
            <Alert className="bg-red-50 border-red-300">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <p className="font-semibold text-red-900">❌ WEBHOOK NÃO ESTÁ FUNCIONANDO!</p>
                <p className="text-sm text-red-800 mt-1">
                  Você tem {todosPagamentosRecentes.length} pagamento(s) no sistema, mas NENHUM veio da Braip via webhook.
                </p>
                <p className="text-sm text-red-800 mt-2 font-semibold">
                  Causas mais comuns:
                </p>
                <ul className="list-disc list-inside text-xs text-red-700 mt-1 space-y-1">
                  <li><strong>URL do webhook incorreta ou não funcionando</strong> (causa #1!)</li>
                  <li>Chave Única não configurada ou diferente</li>
                  <li>Eventos não marcados na Braip</li>
                  <li>Webhook desativado na Braip</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {pagamentosBraip.length > 0 && (
            <Alert className="bg-green-50 border-green-300">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <p className="font-semibold text-green-900">✅ WEBHOOKS FUNCIONANDO!</p>
                <p className="text-sm text-green-800 mt-1">
                  {pagamentosBraip.length} pagamento(s) recebido(s) da Braip com sucesso.
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm font-semibold text-slate-700 mb-3">
              📊 Últimos Pagamentos Recebidos:
            </p>
            {todosPagamentosRecentes.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Nenhum pagamento ainda</p>
            ) : (
              <div className="space-y-2">
                {todosPagamentosRecentes.slice(0, 5).map((pag) => (
                  <div key={pag.id} className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs">
                    <div>
                      <p className="font-semibold">{pag.empresa_nome}</p>
                      <p className="text-slate-500">
                        {format(new Date(pag.created_date), "dd/MM/yyyy HH:mm:ss")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">R$ {pag.valor.toFixed(2)}</p>
                      {pag.braip_transaction_id ? (
                        <Badge className="bg-purple-100 text-purple-800 text-xs">
                          Braip ✓
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Manual
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Alert className="bg-blue-50 border-blue-300">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <p className="font-semibold text-blue-900">💡 Como Interpretar:</p>
              <ul className="list-disc list-inside text-xs text-blue-800 space-y-1 mt-2">
                <li>• Se "Total" {'>'} 0 e "Braip" = 0 → Webhook NÃO funcionou</li>
                <li>• Se ambos {'>'} 0 → Webhook funcionando ✅</li>
                <li>• Badge "Braip ✓" = veio via webhook</li>
                <li>• Badge "Manual" = criado manualmente</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card className="border-2 border-blue-500">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Integração Braip</h2>
                <p className="text-slate-600">Gateway de Pagamentos</p>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              {isConnected && !isExpired ? (
                <>
                  <Badge className="bg-green-100 text-green-800 px-4 py-2">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Conectado
                  </Badge>
                  {tokenStatus && (
                    <span className="text-xs text-slate-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Expira em {tokenStatus.daysUntilExpire} dias
                    </span>
                  )}
                </>
              ) : isExpired ? (
                <Badge className="bg-red-100 text-red-800 px-4 py-2">
                  <XCircle className="w-4 h-4 mr-2" />
                  Expirado
                </Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-800 px-4 py-2">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Desconectado
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Token de Acesso</CardTitle>
          <CardDescription>Configure o token JWT de acesso à API da Braip</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiToken">Token JWT da Braip</Label>
            <Textarea
              id="apiToken"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Cole o token JWT aqui (começa com eyJ...)"
              rows={6}
              disabled={isConnected && !isExpired}
              className="font-mono text-sm"
            />
          </div>

          {(!isConnected || isExpired) && (
            <div className="flex gap-3">
              <Button 
                onClick={handleSaveToken}
                disabled={saveConfigMutation.isPending}
                className="flex-1"
              >
                {saveConfigMutation.isPending ? (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Token
              </Button>

              {braipConfig && apiToken && (
                <Button 
                  onClick={() => testConnectionMutation.mutate()}
                  disabled={testConnectionMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {testConnectionMutation.isPending ? (
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  Validar Token
                </Button>
              )}
            </div>
          )}

          {isConnected && !isExpired && (
            <Button 
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              variant="destructive"
              className="w-full"
            >
              {disconnectMutation.isPending ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Desconectar
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="border-2 border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-purple-600" />
            URL do Webhook
          </CardTitle>
          <CardDescription>
            Cole a URL do seu backend no Render.com
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          <div className="space-y-2">
            <Label htmlFor="customWebhookUrl">URL do Backend (Render.com)</Label>
            <div className="flex gap-2">
              <Input
                id="customWebhookUrl"
                value={customWebhookUrl}
                onChange={(e) => setCustomWebhookUrl(e.target.value)}
                placeholder="https://seu-backend.onrender.com/webhook/braip"
                className="font-mono text-sm"
              />
              <Button
                onClick={() => saveWebhookUrlMutation.mutate(customWebhookUrl)}
                disabled={!customWebhookUrl || saveWebhookUrlMutation.isPending}
              >
                {saveWebhookUrlMutation.isPending ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              ⚠️ Inclua <strong>/webhook/braip</strong> no final da URL
            </p>
          </div>

          <Separator />

          <div>
            <Label className="text-base font-semibold">URL a Configurar na Braip:</Label>
            <div className="flex items-center gap-2 mt-2">
              <code className="flex-1 p-3 bg-white rounded border text-sm overflow-x-auto font-mono">
                {webhookUrl || 'Configure URL acima primeiro'}
              </code>
              <Button variant="outline" size="icon" onClick={copyWebhook} disabled={!webhookUrl}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-5 h-5 text-purple-600" />
              <Label htmlFor="webhookSecret" className="text-lg font-bold">
                Chave Única do Webhook
              </Label>
              {!braipConfig?.webhook_secret && (
                <Badge variant="destructive" className="animate-pulse">
                  OBRIGATÓRIA!
                </Badge>
              )}
            </div>
            
            <Alert className="bg-red-50 border-red-300 mb-3">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <p className="font-semibold text-red-900">🔒 Esta chave deve ser IGUAL na Braip, no GestãoPro e no código do backend!</p>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Input
                id="webhookSecret"
                type={showSecret ? "text" : "password"}
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="Cole a chave única aqui (mínimo 10 caracteres)..."
                className="font-mono text-sm"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? "Ocultar" : "Mostrar"}
              </Button>
            </div>
            <Button 
              onClick={() => saveWebhookSecretMutation.mutate(webhookSecret)}
              disabled={!webhookSecret || webhookSecret.length < 10 || saveWebhookSecretMutation.isPending}
              className="w-full mt-2 bg-purple-600 hover:bg-purple-700"
            >
              {saveWebhookSecretMutation.isPending ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Chave Única
            </Button>
          </div>

          <Button
            onClick={() => window.open('https://braip.com', '_blank')}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Ir para Braip.com Configurar Webhook
          </Button>
        </CardContent>
      </Card>

      <Alert className="bg-yellow-50 border-yellow-300">
        <Clock className="h-4 w-4 text-yellow-600" />
        <AlertDescription>
          <p className="font-semibold text-yellow-900">⏰ Sobre a Expiração do Token</p>
          <p className="text-sm mt-1 text-yellow-800">
            Tokens JWT sempre têm validade por segurança (padrão da indústria). 
            Você precisará renovar periodicamente a cada 30-90 dias.
            Configure um lembrete no calendário para não esquecer!
          </p>
        </AlertDescription>
      </Alert>

    </div>
  );
}
