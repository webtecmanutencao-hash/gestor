
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  MessageSquare,
  QrCode,
  Bot,
  Settings,
  Zap,
  CheckCircle,
  XCircle,
  Send,
  BookOpen,
  AlertCircle,
  Smartphone,
  RefreshCw,
  PowerOff,
  Plus,
  Trash2,
  Loader,
  Clock,
  Users,
  TrendingUp,
  Save,
  BrainCircuit,
  MessageCircle,
  Phone,
  Globe,
  Shield,
  Bell
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import TreinamentoAvancado from '../components/whatsapp/TreinamentoAvancado';

const VENOM_API_URL = 'http://localhost:3333';

export default function WhatsAppIA() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [statusConexao, setStatusConexao] = useState('disconnected');
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [numeroConectado, setNumeroConectado] = useState('');
  const [isKnowledgeDialogOpen, setIsKnowledgeDialogOpen] = useState(false);
  const [knowledgeForm, setKnowledgeForm] = useState({ pergunta: '', resposta: '', categoria: '' });
  const [connectionError, setConnectionError] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: configs = [], isLoading: isLoadingConfig } = useQuery({
    queryKey: ['whatsapp-config', user?.id],
    queryFn: async () => {
      if (!user?.email) return [];
      const result = await base44.entities.WhatsAppConfig.filter({ created_by: user.email });
      return result;
    },
    enabled: !!user,
    initialData: []
  });

  const config = configs[0] || {};

  const { data: conversas = [] } = useQuery({
    queryKey: ['whatsapp-conversas'],
    queryFn: () => base44.entities.WhatsAppConversa.list('-data_ultima_mensagem'),
    initialData: [],
    refetchInterval: 10000
  });

  const { data: knowledge = [] } = useQuery({
    queryKey: ['whatsapp-knowledge'],
    queryFn: () => base44.entities.WhatsAppKnowledge.filter({ ativo: true }),
    initialData: [],
    refetchInterval: 30000
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (configData) => {
      if (config.id) {
        return await base44.entities.WhatsAppConfig.update(config.id, configData);
      } else {
        return await base44.entities.WhatsAppConfig.create(configData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] });
      toast({ 
        title: "✅ Configurações Salvas!", 
        description: "Suas configurações foram salvas com sucesso.",
        variant: "success" 
      });
    },
    onError: (error) => {
      toast({ 
        title: "❌ Erro ao Salvar", 
        description: error.message || "Não foi possível salvar as configurações.",
        variant: "destructive" 
      });
    }
  });

  const addKnowledgeMutation = useMutation({
    mutationFn: (data) => base44.entities.WhatsAppKnowledge.create({ ...data, ativo: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-knowledge'] });
      toast({ 
        title: "✅ Conhecimento Adicionado!", 
        description: "O conhecimento foi adicionado à base de dados da IA.",
        variant: "success" 
      });
      setIsKnowledgeDialogOpen(false);
      setKnowledgeForm({ pergunta: '', resposta: '', categoria: '' });
    },
    onError: (error) => {
      toast({ 
        title: "❌ Erro ao Adicionar", 
        description: error.message || "Não foi possível adicionar o conhecimento.",
        variant: "destructive" 
      });
    }
  });

  const deleteKnowledgeMutation = useMutation({
    mutationFn: (id) => base44.entities.WhatsAppKnowledge.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-knowledge'] });
      toast({ 
        title: "✅ Conhecimento Removido!", 
        description: "O conhecimento foi removido da base de dados.",
        variant: "success" 
      });
    },
    onError: (error) => {
      toast({ 
        title: "❌ Erro ao Remover", 
        description: error.message || "Não foi possível remover o conhecimento.",
        variant: "destructive" 
      });
    }
  });

  // Testar conexão com servidor Venom - MELHORADO
  const testServerConnection = async () => {
    setIsTestingConnection(true);
    setConnectionError('');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout

      const response = await fetch(`${VENOM_API_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "✅ Servidor Conectado!",
          description: `O servidor WhatsApp está rodando e acessível. Status: ${data.status}`,
          variant: "success",
        });
        setConnectionError('');
        return true;
      } else {
        throw new Error(`Servidor respondeu com status ${response.status}`);
      }
    } catch (error) {
      let errorMsg = '';
      
      if (error.name === 'AbortError') {
        errorMsg = '⏱️ Timeout: O servidor demorou muito para responder. Certifique-se de que está rodando.';
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMsg = `🔌 Servidor WhatsApp não está rodando ou não está acessível em ${VENOM_API_URL}`;
      } else {
        errorMsg = `❌ Erro: ${error.message}`;
      }

      setConnectionError(errorMsg);
      
      toast({
        title: "❌ Servidor Offline",
        description: errorMsg,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Verificar status da sessão periodicamente
  useEffect(() => {
    if (!user?.id || statusConexao === 'disconnected') return;
    
    const checkStatus = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 segundos

        const response = await fetch(`${VENOM_API_URL}/session/${user.id}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          const newStatus = data.meta?.status || 'disconnected';
          
          setStatusConexao(newStatus);
          setConnectionError('');
          
          if (data.meta?.numero) {
            setNumeroConectado(data.meta.numero);
          }
          
          // Atualizar config se mudou para conectado
          if (newStatus === 'connected' && config.status_conexao !== 'connected') {
            await saveConfigMutation.mutateAsync({ 
              status_conexao: 'connected',
              sessao_id: user.id
            });
          }
        }
      } catch (error) {
        // Silenciosamente ignora erros temporários
        if (statusConexao === 'connecting' || statusConexao === 'connected') {
          console.log('Erro temporário ao verificar status:', error.name);
        }
      }
    };

    // Verificar imediatamente
    checkStatus();

    // Verificar periodicamente
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, [user?.id, statusConexao]);

  // Polling do QR Code quando estiver conectando
  useEffect(() => {
    if (statusConexao !== 'connecting' || !user?.id) return;

    const pollQRCode = async () => {
      try {
        const response = await fetch(`${VENOM_API_URL}/qrcode/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.qr) {
            setQrCode(data.qr);
          }
        }
      } catch (error) {
        console.log('Erro ao buscar QR Code:', error.name);
      }
    };

    // Poll a cada 3 segundos
    const interval = setInterval(pollQRCode, 3000);
    pollQRCode(); // Buscar imediatamente

    return () => clearInterval(interval);
  }, [statusConexao, user?.id]);

  const handleConectar = async () => {
    if (!user?.id) {
      toast({ 
        title: "❌ Erro", 
        description: "Usuário não identificado", 
        variant: "destructive" 
      });
      return;
    }

    // Primeiro testar se o servidor está acessível
    const serverOk = await testServerConnection();
    if (!serverOk) {
      return;
    }

    setLoading(true);
    setStatusConexao('connecting');
    setQrCode('');
    setConnectionError('');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

      const response = await fetch(`${VENOM_API_URL}/start-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          empresaId: user.id,
          empresaNome: user.full_name || user.email
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'connected') {
        setStatusConexao('connected');
        if (data.meta?.numero) {
          setNumeroConectado(data.meta.numero);
        }
        await saveConfigMutation.mutateAsync({ 
          status_conexao: 'connected',
          sessao_id: user.id
        });
        toast({
          title: "✅ WhatsApp Conectado!",
          description: `Seu WhatsApp ${data.meta?.numero || ''} está pronto para uso.`,
          variant: "success",
        });
        setQrCode('');
      } else if (data.qr) {
        setQrCode(data.qr);
        setStatusConexao('connecting');
        await saveConfigMutation.mutateAsync({ 
          status_conexao: 'connecting',
          sessao_id: user.id
        });
        toast({
          title: "📱 QR Code Gerado",
          description: "Escaneie o QR Code com seu WhatsApp para conectar.",
          variant: "default",
        });
      } else if (data.status === 'connecting') {
        setStatusConexao('connecting');
        await saveConfigMutation.mutateAsync({ status_conexao: 'connecting' });
        toast({
          title: "⏳ Conectando...",
          description: "Aguardando conexão com WhatsApp.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Erro ao conectar:', error);
      
      let errorMsg = '';
      if (error.name === 'AbortError') {
        errorMsg = 'Timeout: A conexão demorou muito. O servidor pode estar sobrecarregado.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMsg = 'Não foi possível conectar ao servidor WhatsApp. Certifique-se de que está rodando.';
      } else {
        errorMsg = error.message || 'Erro desconhecido ao conectar';
      }
      
      setConnectionError(errorMsg);
      toast({
        title: "❌ Erro na Conexão",
        description: errorMsg,
        variant: "destructive",
      });
      setStatusConexao('disconnected');
      await saveConfigMutation.mutateAsync({ status_conexao: 'disconnected' });
    } finally {
      setLoading(false);
    }
  };

  const handleDesconectar = async () => {
    if (!user?.id) return;

    try {
      await fetch(`${VENOM_API_URL}/logout/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Erro ao desconectar:', error);
    }

    setStatusConexao('disconnected');
    setQrCode('');
    setNumeroConectado('');
    setConnectionError('');
    
    await saveConfigMutation.mutateAsync({ 
      status_conexao: 'disconnected',
      sessao_id: null
    });
    
    toast({ 
      title: "✅ Desconectado", 
      description: "WhatsApp desconectado com sucesso." 
    });
  };

  const handleSaveAssistantConfig = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    await saveConfigMutation.mutateAsync({
      nome_assistente: formData.get('nome_assistente') || 'Assistente',
      mensagem_boas_vindas: formData.get('mensagem_boas_vindas') || '',
      instrucoes_ia: formData.get('instrucoes_ia') || '',
      horario_atendimento_inicio: formData.get('horario_inicio') || '08:00',
      horario_atendimento_fim: formData.get('horario_fim') || '18:00',
    });
  };

  const handleSaveAutomations = async (e) => {
    e.preventDefault();
    await saveConfigMutation.mutateAsync({
      automacao_cobranca: document.getElementById('auto-cobranca')?.checked || false,
      automacao_recibos: document.getElementById('auto-recibos')?.checked || false,
    });
  };

  const handleAddKnowledge = (e) => {
    e.preventDefault();
    if (!knowledgeForm.pergunta.trim() || !knowledgeForm.resposta.trim()) {
      toast({
        title: "⚠️ Campos Obrigatórios",
        description: "Preencha a pergunta e resposta para adicionar o conhecimento.",
        variant: "destructive"
      });
      return;
    }
    addKnowledgeMutation.mutate(knowledgeForm);
  };

  const stats = {
    conversas_ativas: conversas.filter(c => !c.atendimento_humano).length,
    aguardando_humano: conversas.filter(c => c.atendimento_humano).length,
    conhecimentos: knowledge.length,
    total_conversas: conversas.length
  };

  if (isLoadingConfig) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-green-600" />
              WhatsApp IA
            </h1>
            <p className="text-slate-600 mt-1">Conecte seu WhatsApp e automatize atendimentos com Inteligência Artificial</p>
            {numeroConectado && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="success" className="text-sm">
                  <Phone className="w-3 h-3 mr-1" />
                  {numeroConectado}
                </Badge>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge 
              variant={statusConexao === 'connected' ? "success" : statusConexao === 'connecting' ? "warning" : "secondary"} 
              className="text-lg px-4 py-2"
            >
              {statusConexao === 'connected' ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" /> 
                  Conectado
                </>
              ) : statusConexao === 'connecting' ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> 
                  Conectando...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" /> 
                  Desconectado
                </>
              )}
            </Badge>
            {statusConexao !== 'connected' && (
              <Button
                onClick={testServerConnection}
                disabled={isTestingConnection}
                variant="outline"
                size="sm"
              >
                {isTestingConnection ? (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Globe className="w-4 h-4 mr-2" />
                )}
                Testar Servidor
              </Button>
            )}
          </div>
        </div>

        {/* Alerta de Erro de Conexão - MELHORADO */}
        {connectionError && (
          <Alert className="mb-6 bg-red-50 border-red-300">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-900">
              <div className="space-y-2">
                <p className="font-semibold">❌ {connectionError}</p>
                <div className="bg-white p-3 rounded border border-red-200 mt-2">
                  <p className="text-xs font-semibold mb-2">📝 Soluções:</p>
                  <ol className="list-decimal list-inside text-xs space-y-1">
                    <li>Certifique-se de que o servidor está rodando: <code className="bg-slate-100 px-1 rounded">npm start</code></li>
                    <li>Verifique se está na porta correta: <code className="bg-slate-100 px-1 rounded">http://localhost:3333</code></li>
                    <li>Veja o README_WHATSAPP.md para instruções completas</li>
                    <li>Teste manualmente: <code className="bg-slate-100 px-1 rounded">curl http://localhost:3333/health</code></li>
                  </ol>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Cards de Estatísticas */}
        {statusConexao === 'connected' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Conversas Ativas</p>
                    <p className="text-3xl font-bold text-green-600">{stats.conversas_ativas}</p>
                  </div>
                  <MessageSquare className="w-10 h-10 text-green-600 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Aguardando Humano</p>
                    <p className="text-3xl font-bold text-orange-600">{stats.aguardando_humano}</p>
                  </div>
                  <Users className="w-10 h-10 text-orange-600 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Base de Conhecimento</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.conhecimentos}</p>
                  </div>
                  <BookOpen className="w-10 h-10 text-blue-600 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Total de Conversas</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.total_conversas}</p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-purple-600 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Seção de Conexão */}
        {statusConexao === 'disconnected' && !connectionError && (
          <Card className="mb-6 shadow-lg border-2 border-green-500 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="pt-6 text-center">
              <Smartphone className="w-16 h-16 mx-auto text-green-600 mb-4" />
              <h3 className="text-xl font-bold text-green-900 mb-2">
                Conecte seu WhatsApp
              </h3>
              <p className="text-slate-700 mb-6">
                Clique no botão abaixo para gerar o QR Code e conectar seu WhatsApp Business.
              </p>
              <Button 
                onClick={handleConectar} 
                className="bg-green-600 hover:bg-green-700 text-lg px-8 py-6" 
                disabled={loading}
              >
                {loading ? (
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-5 h-5 mr-2" />
                )}
                Gerar QR Code
              </Button>
            </CardContent>
          </Card>
        )}

        {/* QR Code */}
        {statusConexao === 'connecting' && (
          <Card className="mb-6 shadow-2xl border-2 border-green-500">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="flex items-center gap-3 text-green-900">
                <QrCode className="w-6 h-6" />
                Escaneie o QR Code com seu WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col items-center">
              {qrCode ? (
                <div className="mb-6 p-6 bg-white border-4 border-green-500 rounded-2xl shadow-lg">
                  <img src={qrCode} alt="QR Code WhatsApp" className="w-80 h-80"/>
                </div>
              ) : (
                <div className="w-80 h-80 flex flex-col items-center justify-center">
                  <RefreshCw className="w-16 h-16 text-green-600 animate-spin mb-4" />
                  <p className="text-lg font-semibold text-slate-700">Gerando QR Code...</p>
                  <p className="text-sm text-slate-500 mt-2">Aguarde alguns segundos</p>
                </div>
              )}
              <Alert className="bg-blue-50 border-blue-300 mb-4 max-w-2xl">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong className="block mb-2">Como conectar:</strong>
                  1. Abra o WhatsApp no seu celular<br/>
                  2. Toque em "Configurações" → "Aparelhos conectados"<br/>
                  3. Toque em "Conectar um aparelho"<br/>
                  4. Aponte a câmera para este QR Code
                </AlertDescription>
              </Alert>
              <Button 
                onClick={handleDesconectar} 
                variant="outline"
                className="mt-4"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* Conectado */}
        {statusConexao === 'connected' && (
          <Card className="mb-6 shadow-lg bg-green-50 border-green-300">
            <CardContent className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
                <div>
                  <h3 className="text-xl font-bold text-green-900">WhatsApp Conectado!</h3>
                  <p className="text-slate-700">Seu assistente de IA está ativo e pronto para atender.</p>
                  {numeroConectado && (
                    <p className="text-sm text-green-700 font-semibold mt-1">
                      📱 Número: {numeroConectado}
                    </p>
                  )}
                </div>
              </div>
              <Button onClick={handleDesconectar} variant="destructive">
                <PowerOff className="w-4 h-4 mr-2" />
                Desconectar
              </Button>
            </CardContent>
          </Card>
        )}
      
        {/* Tabs de Configuração */}
        <Tabs defaultValue="configuracao" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 mb-6 h-auto">
            <TabsTrigger value="configuracao" className="flex items-center gap-2 py-3">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Configuração</span>
              <span className="sm:hidden">Config</span>
            </TabsTrigger>
            <TabsTrigger value="treinamento" className="flex items-center gap-2 py-3">
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">Treinar IA</span>
              <span className="sm:hidden">Treinar</span>
            </TabsTrigger>
            <TabsTrigger value="treinamento_avancado" className="flex items-center gap-2 py-3">
              <BrainCircuit className="w-4 h-4" />
              <span className="hidden sm:inline">Avançado</span>
              <span className="sm:hidden">Avanç.</span>
            </TabsTrigger>
            <TabsTrigger value="automacoes" className="flex items-center gap-2 py-3">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Automações</span>
              <span className="sm:hidden">Auto</span>
            </TabsTrigger>
            <TabsTrigger value="conversas" className="flex items-center gap-2 py-3">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Conversas</span>
              <span className="sm:hidden">Conv</span>
            </TabsTrigger>
            <TabsTrigger value="ajuda" className="flex items-center gap-2 py-3">
              <AlertCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Ajuda</span>
            </TabsTrigger>
          </TabsList>

          {/* Aba Configuração */}
          <TabsContent value="configuracao">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  Configuração do Assistente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveAssistantConfig} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="nome_assistente">Nome do Assistente *</Label>
                    <Input
                      id="nome_assistente"
                      name="nome_assistente"
                      placeholder="Ex: Maria, João, Assistente..."
                      defaultValue={config.nome_assistente || ''}
                      required
                    />
                    <p className="text-xs text-slate-500">Nome que aparecerá nas mensagens enviadas pela IA</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mensagem_boas_vindas">Mensagem de Boas-Vindas</Label>
                    <Textarea
                      id="mensagem_boas_vindas"
                      name="mensagem_boas_vindas"
                      rows={4}
                      placeholder="Olá! Sou o assistente virtual. Como posso ajudar?"
                      defaultValue={config.mensagem_boas_vindas || ''}
                    />
                    <p className="text-xs text-slate-500">Mensagem automática enviada quando alguém inicia conversa</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instrucoes_ia">Instruções de Comportamento da IA</Label>
                    <Textarea
                      id="instrucoes_ia"
                      name="instrucoes_ia"
                      rows={6}
                      placeholder="Você é um assistente prestativo e profissional. Responda sempre de forma clara e objetiva..."
                      defaultValue={config.instrucoes_ia || ''}
                    />
                    <p className="text-xs text-slate-500">Como a IA deve se comportar ao responder mensagens</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="horario_inicio">Horário de Atendimento - Início</Label>
                      <Input
                        id="horario_inicio"
                        name="horario_inicio"
                        type="time"
                        defaultValue={config.horario_atendimento_inicio || '08:00'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="horario_fim">Horário de Atendimento - Fim</Label>
                      <Input
                        id="horario_fim"
                        name="horario_fim"
                        type="time"
                        defaultValue={config.horario_atendimento_fim || '18:00'}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button type="submit" disabled={saveConfigMutation.isPending}>
                      {saveConfigMutation.isPending ? (
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Salvar Configurações
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Treinamento Simples */}
          <TabsContent value="treinamento">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-blue-600" />
                    Base de Conhecimento ({knowledge.length})
                  </CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    Ensine a IA com perguntas e respostas frequentes
                  </p>
                </div>
                <Button onClick={() => setIsKnowledgeDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </CardHeader>
              <CardContent>
                {knowledge.length > 0 ? (
                  <div className="space-y-3">
                    {knowledge.map((k) => (
                      <Card key={k.id} className="bg-slate-50 hover:bg-slate-100 transition-colors">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              {k.categoria && (
                                <Badge className="mb-2" variant="outline">{k.categoria}</Badge>
                              )}
                              <p className="font-semibold text-lg mb-2 text-slate-900">{k.pergunta}</p>
                              <p className="text-slate-600">{k.resposta}</p>
                              <p className="text-xs text-slate-400 mt-2">
                                Criado em {new Date(k.created_date).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (window.confirm('Tem certeza que deseja remover este conhecimento?')) {
                                  deleteKnowledgeMutation.mutate(k.id);
                                }
                              }}
                              disabled={deleteKnowledgeMutation.isPending}
                            >
                              {deleteKnowledgeMutation.isPending ? (
                                <Loader className="w-4 h-4 animate-spin text-red-500" />
                              ) : (
                                <Trash2 className="w-4 h-4 text-red-500" />
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-semibold mb-2">
                      Nenhum conhecimento adicionado ainda
                    </p>
                    <p className="text-slate-400 text-sm mb-4">
                      Adicione perguntas e respostas para treinar sua IA
                    </p>
                    <Button onClick={() => setIsKnowledgeDialogOpen(true)} variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Primeiro Conhecimento
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Treinamento Avançado */}
          <TabsContent value="treinamento_avancado">
            <TreinamentoAvancado />
          </TabsContent>

          {/* Aba Automações */}
          <TabsContent value="automacoes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  Automações Inteligentes
                </CardTitle>
                <p className="text-sm text-slate-600 mt-1">
                  Configure envios automáticos via WhatsApp
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveAutomations} className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex-1">
                      <Label htmlFor="auto-cobranca" className="text-base font-semibold cursor-pointer">
                        Cobrança Automática
                      </Label>
                      <p className="text-sm text-slate-600 mt-1">
                        Envia lembretes automáticos de cobranças próximas do vencimento
                      </p>
                    </div>
                    <Switch
                      id="auto-cobranca"
                      defaultChecked={config.automacao_cobranca || false}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex-1">
                      <Label htmlFor="auto-recibos" className="text-base font-semibold cursor-pointer">
                        Envio de Recibos
                      </Label>
                      <p className="text-sm text-slate-600 mt-1">
                        Envia recibo automaticamente após confirmação de pagamento
                      </p>
                    </div>
                    <Switch
                      id="auto-recibos"
                      defaultChecked={config.automacao_recibos || false}
                    />
                  </div>

                  <Alert className="bg-blue-50 border-blue-200">
                    <Bell className="h-4 w-4 text-blue-600" />
                    <AlertDescription>
                      <p className="font-semibold text-blue-900 mb-2">Como funcionam as automações:</p>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• <strong>Cobrança:</strong> Envia mensagem 3 dias antes do vencimento</li>
                        <li>• <strong>Recibos:</strong> Envia imediatamente após pagamento registrado</li>
                        <li>• Mensagens são enviadas apenas no horário de atendimento configurado</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-end gap-3">
                    <Button type="submit" disabled={saveConfigMutation.isPending}>
                      {saveConfigMutation.isPending ? (
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Salvar Automações
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Conversas */}
          <TabsContent value="conversas">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  Conversas Recentes ({conversas.length})
                </CardTitle>
                <p className="text-sm text-slate-600 mt-1">
                  Histórico de conversas do WhatsApp
                </p>
              </CardHeader>
              <CardContent>
                {conversas.length > 0 ? (
                  <div className="space-y-3">
                    {conversas.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                            {c.nome_contato ? c.nome_contato.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-slate-900 truncate">
                                {c.nome_contato || c.numero_telefone}
                              </p>
                              {c.nao_lida && (
                                <Badge variant="destructive" className="text-xs">Nova</Badge>
                              )}
                              {c.atendimento_humano && (
                                <Badge variant="warning" className="text-xs">Aguardando</Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 truncate">{c.ultima_mensagem}</p>
                            {c.data_ultima_mensagem && (
                              <p className="text-xs text-slate-400 mt-1">
                                <Clock className="w-3 h-3 inline mr-1" />
                                {new Date(c.data_ultima_mensagem).toLocaleString('pt-BR')}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Ver
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-semibold mb-2">
                      Nenhuma conversa registrada ainda
                    </p>
                    <p className="text-slate-400 text-sm">
                      As conversas do WhatsApp aparecerão aqui automaticamente
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Ajuda */}
          <TabsContent value="ajuda">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    Guia Rápido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">1️⃣ Instalação do Servidor</h4>
                    <div className="space-y-2 text-sm text-slate-700">
                      <p>Para usar o WhatsApp IA, você precisa do servidor Venom rodando:</p>
                      <div className="bg-white p-3 rounded border border-blue-200 font-mono text-xs space-y-1">
                        <p>$ npm install venom-bot</p>
                        <p>$ node server.js</p>
                      </div>
                      <p className="text-xs text-slate-600">O servidor deve estar rodando em http://localhost:3333</p>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-2">2️⃣ Conectar WhatsApp</h4>
                    <ul className="space-y-1 text-sm text-slate-700">
                      <li>• Clique em "Gerar QR Code"</li>
                      <li>• Abra WhatsApp no celular</li>
                      <li>• Vá em Configurações → Aparelhos conectados</li>
                      <li>• Escaneie o QR Code gerado</li>
                    </ul>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-purple-900 mb-2">3️⃣ Configurar Assistente</h4>
                    <ul className="space-y-1 text-sm text-slate-700">
                      <li>• Configure o nome do assistente</li>
                      <li>• Defina mensagem de boas-vindas</li>
                      <li>• Adicione instruções de comportamento</li>
                      <li>• Configure horário de atendimento</li>
                    </ul>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h4 className="font-semibold text-orange-900 mb-2">4️⃣ Treinar a IA</h4>
                    <ul className="space-y-1 text-sm text-slate-700">
                      <li>• Use "Treinar IA" para perguntas/respostas simples</li>
                      <li>• Use "Treinamento Avançado" para conversar com a IA</li>
                      <li>• A IA aprende continuamente com as conversas</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    Requisitos e Limitações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert className="bg-yellow-50 border-yellow-300">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription>
                      <div className="space-y-2 text-sm text-yellow-900">
                        <p className="font-semibold">⚠️ Requisitos Importantes:</p>
                        <ul className="space-y-1 list-disc list-inside">
                          <li>Servidor Venom deve estar rodando localmente</li>
                          <li>WhatsApp deve estar instalado em um celular</li>
                          <li>Internet estável no celular e computador</li>
                          <li>WhatsApp Business recomendado (mas funciona com normal)</li>
                        </ul>
                        <p className="font-semibold mt-3">📌 Limitações:</p>
                        <ul className="space-y-1 list-disc list-inside">
                          <li>Servidor local - não funciona em produção sem configuração</li>
                          <li>Conexão pode cair se celular perder internet</li>
                          <li>WhatsApp pode bloquear uso excessivo</li>
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Troubleshooting</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <details className="group bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <summary className="font-semibold cursor-pointer flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Erro: "Servidor WhatsApp Offline"
                    </summary>
                    <div className="mt-3 text-sm text-slate-700 space-y-2">
                      <p>Este erro significa que o servidor Venom não está rodando. Para resolver:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Certifique-se de ter instalado: <code>npm install venom-bot</code></li>
                        <li>Inicie o servidor: <code>node server.js</code></li>
                        <li>Verifique se está rodando em localhost:3333</li>
                        <li>Clique em "Testar Servidor" para verificar</li>
                      </ol>
                    </div>
                  </details>

                  <details className="group bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <summary className="font-semibold cursor-pointer flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      QR Code não aparece
                    </summary>
                    <div className="mt-3 text-sm text-slate-700 space-y-2">
                      <p>Se o QR Code não está sendo gerado:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Aguarde até 30 segundos - pode demorar na primeira vez</li>
                        <li>Verifique se o servidor está rodando corretamente</li>
                        <li>Recarregue a página e tente novamente</li>
                        <li>Verifique o console do servidor para erros</li>
                      </ol>
                    </div>
                  </details>

                  <details className="group bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <summary className="font-semibold cursor-pointer flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Conexão cai frequentemente
                    </summary>
                    <div className="mt-3 text-sm text-slate-700 space-y-2">
                      <p>Se a conexão cai com frequência:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Verifique a conexão de internet do celular</li>
                        <li>Mantenha o WhatsApp aberto no celular</li>
                        <li>Não desconecte outros aparelhos vinculados</li>
                        <li>Reinicie o servidor e reconecte</li>
                      </ol>
                    </div>
                  </details>

                  <details className="group bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <summary className="font-semibold cursor-pointer flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      IA não responde mensagens
                    </summary>
                    <div className="mt-3 text-sm text-slate-700 space-y-2">
                      <p>Se a IA não está respondendo:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Verifique se está dentro do horário de atendimento</li>
                        <li>Certifique-se de que a IA foi treinada com conhecimentos</li>
                        <li>Verifique as instruções de comportamento</li>
                        <li>Confira se há erros no console do servidor</li>
                      </ol>
                    </div>
                  </details>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog para Adicionar Conhecimento */}
      <Dialog open={isKnowledgeDialogOpen} onOpenChange={setIsKnowledgeDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Adicionar Conhecimento</DialogTitle>
            <DialogDescription>
              Adicione perguntas frequentes e respostas para treinar a IA
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddKnowledge}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="k-categoria">Categoria (opcional)</Label>
                <Input
                  id="k-categoria"
                  placeholder="Ex: Produtos, Horários, Pagamentos..."
                  value={knowledgeForm.categoria}
                  onChange={(e) => setKnowledgeForm({ ...knowledgeForm, categoria: e.target.value })}
                />
                <p className="text-xs text-slate-500">Ajuda a organizar o conhecimento</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="k-pergunta">Pergunta *</Label>
                <Input
                  id="k-pergunta"
                  placeholder="Ex: Qual o horário de funcionamento?"
                  value={knowledgeForm.pergunta}
                  onChange={(e) => setKnowledgeForm({ ...knowledgeForm, pergunta: e.target.value })}
                  required
                />
                <p className="text-xs text-slate-500">Como o cliente pode perguntar</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="k-resposta">Resposta *</Label>
                <Textarea
                  id="k-resposta"
                  rows={5}
                  placeholder="Ex: Funcionamos de segunda a sexta, das 8h às 18h."
                  value={knowledgeForm.resposta}
                  onChange={(e) => setKnowledgeForm({ ...knowledgeForm, resposta: e.target.value })}
                  required
                />
                <p className="text-xs text-slate-500">Resposta que a IA deve dar</p>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsKnowledgeDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={addKnowledgeMutation.isPending}>
                {addKnowledgeMutation.isPending ? (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
