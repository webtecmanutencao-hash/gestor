import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Lock, 
  AlertTriangle, 
  CreditCard, 
  MessageCircle, 
  Upload,
  Loader,
  Send,
  User,
  Shield,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

export default function BloqueioMensalidade() {
  const { toast } = useToast();
  const chatRef = useRef(null);
  
  const [comprovanteFile, setComprovanteFile] = useState(null);
  const [isUploadingComprovante, setIsUploadingComprovante] = useState(false);
  
  const [chatAberto, setChatAberto] = useState(false);
  const [conversaId, setConversaId] = useState(null);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [iniciando, setIniciando] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['userBloqueio'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        console.error('Erro ao buscar user:', error);
        return null;
      }
    },
  });

  const { data: mensagens = [] } = useQuery({
    queryKey: ['mensagensBloqueio', conversaId],
    queryFn: async () => {
      try {
        if (!conversaId) return [];
        const result = await base44.entities.ChatMessage.filter(
          { conversa_id: conversaId },
          'created_date'
        );
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error('Erro ao buscar mensagens:', error);
        return [];
      }
    },
    enabled: !!conversaId && chatAberto,
    refetchInterval: chatAberto ? 3000 : false,
    initialData: []
  });

  useEffect(() => {
    if (chatRef.current && mensagens && mensagens.length > 0) {
      setTimeout(() => {
        if (chatRef.current) {
          chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [mensagens]);

  const iniciarChat = async () => {
    if (!user || !user.id) {
      toast({
        title: "Erro",
        description: "Usuário não encontrado.",
        variant: "destructive"
      });
      return;
    }

    setIniciando(true);

    try {
      const conversas = await base44.entities.ChatConversa.filter({
        usuario_id: user.id,
        tipo_chat: 'bloqueio',
        status: 'aberto'
      });

      let conversa;

      if (conversas && conversas.length > 0) {
        conversa = conversas[0];
      } else {
        conversa = await base44.entities.ChatConversa.create({
          usuario_id: user.id,
          usuario_nome: user.full_name || user.email,
          assunto: '🔒 Conta Bloqueada - Urgente',
          tipo_chat: 'bloqueio',
          status: 'aberto',
          last_message_preview: 'Cliente iniciou chat',
          last_message_date: new Date().toISOString(),
          unread_admin: true,
          unread_user: false
        });

        await base44.entities.ChatMessage.create({
          conversa_id: conversa.id,
          remetente_id: user.id,
          remetente_nome: user.full_name || user.email,
          conteudo: `🔒 Olá! Minha conta foi bloqueada e preciso de ajuda urgente.\n\nNome: ${user.full_name || 'Não informado'}\nEmail: ${user.email}${user.observacoes_bloqueio ? '\nMotivo: ' + user.observacoes_bloqueio : ''}`
        });
      }

      setConversaId(conversa.id);
      setChatAberto(true);

      toast({
        title: "✅ Chat Iniciado",
        description: "Nossa equipe responderá em breve.",
      });

    } catch (error) {
      console.error('Erro ao iniciar chat:', error);
      toast({
        title: "Erro ao abrir chat",
        description: error.message || "Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIniciando(false);
    }
  };

  const enviarMensagem = async (e) => {
    if (e) e.preventDefault();
    
    if (!novaMensagem.trim() || !conversaId || !user || !user.id) {
      return;
    }

    setEnviando(true);

    try {
      await base44.entities.ChatMessage.create({
        conversa_id: conversaId,
        remetente_id: user.id,
        remetente_nome: user.full_name || user.email,
        conteudo: novaMensagem.trim()
      });

      await base44.entities.ChatConversa.update(conversaId, {
        last_message_preview: novaMensagem.substring(0, 100),
        last_message_date: new Date().toISOString(),
        unread_admin: true
      });

      setNovaMensagem('');

    } catch (error) {
      console.error('Erro ao enviar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem.",
        variant: "destructive"
      });
    } finally {
      setEnviando(false);
    }
  };

  const enviarComprovante = async (e) => {
    e.preventDefault();
    
    if (!comprovanteFile) {
      toast({
        title: "Selecione um arquivo",
        variant: "destructive"
      });
      return;
    }

    setIsUploadingComprovante(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: comprovanteFile });

      const hoje = new Date();
      const mes = String(hoje.getMonth() + 1).padStart(2, '0');
      const ano = hoje.getFullYear();

      await base44.entities.Pagamento.create({
        empresa_id: user.id,
        empresa_nome: user.full_name || user.email,
        valor: 0,
        mes_referencia: `${mes}/${ano}`,
        data_vencimento: `${ano}-${mes}-01`,
        data_pagamento: new Date().toISOString().split('T')[0],
        status: 'aguardando_verificacao',
        comprovante_url: file_url,
        forma_pagamento: 'pix'
      });

      toast({
        title: "✅ Comprovante Enviado",
        description: "Verificaremos em até 24h.",
      });

      setComprovanteFile(null);
      if (e.target) e.target.reset();

    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: "Erro ao enviar",
        description: error.message || "Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsUploadingComprovante(false);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <Loader className="w-12 h-12 animate-spin text-red-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-red-600">Erro ao carregar usuário. Faça login novamente.</p>
            <Button onClick={() => base44.auth.logout()} className="w-full mt-4">Fazer Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 relative">
      
      {/* TELA DE BLOQUEIO - SEMPRE VISÍVEL */}
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full shadow-2xl border-2 border-red-300">
          <CardContent className="pt-8 pb-8">
            
            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Lock className="w-12 h-12 text-red-600" />
              </div>
              <h1 className="text-4xl font-bold text-red-900 mb-2">Sistema Bloqueado</h1>
              <p className="text-lg text-red-700">Acesso temporariamente suspenso</p>
            </div>

            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h2 className="font-bold text-red-900 mb-2">Por que minha conta foi bloqueada?</h2>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                    <li>Pagamento da mensalidade não realizado</li>
                    <li>Assinatura cancelada ou reembolsada</li>
                    <li>Período de carência expirado</li>
                  </ul>
                  {user.observacoes_bloqueio && (
                    <div className="mt-4 p-3 bg-white rounded border border-red-300">
                      <p className="text-xs font-semibold text-red-900 mb-1">Motivo:</p>
                      <p className="text-sm text-red-800">{user.observacoes_bloqueio}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-3">
                <CreditCard className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h2 className="font-bold text-blue-900 mb-2">Como reativar?</h2>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                    <li>Envie o comprovante de pagamento abaixo</li>
                    <li>Ou inicie um chat com nosso suporte</li>
                    <li>Aguarde a verificação (até 24h)</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              
              <Card className="bg-green-50 border-2 border-green-300">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Upload className="w-5 h-5 text-green-600" />
                    <h3 className="font-bold text-green-900">Enviar Comprovante</h3>
                  </div>
                  <form onSubmit={enviarComprovante} className="space-y-4">
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setComprovanteFile(e.target.files?.[0] || null)}
                      className="bg-white"
                      disabled={isUploadingComprovante}
                    />
                    <Button
                      type="submit"
                      disabled={isUploadingComprovante || !comprovanteFile}
                      className="w-full bg-green-600 hover:bg-green-700 py-6"
                    >
                      {isUploadingComprovante ? (
                        <>
                          <Loader className="w-5 h-5 mr-3 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 mr-3" />
                          Enviar Comprovante
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Button
                onClick={iniciarChat}
                disabled={iniciando}
                className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg"
              >
                {iniciando ? (
                  <>
                    <Loader className="w-5 h-5 mr-3 animate-spin" />
                    Abrindo Chat...
                  </>
                ) : chatAberto ? (
                  <>
                    <MessageCircle className="w-5 h-5 mr-3" />
                    Reabrir Chat
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-5 h-5 mr-3" />
                    Iniciar Chat com Suporte
                  </>
                )}
              </Button>
            </div>

            <div className="mt-8 pt-6 border-t">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Logado: <strong>{user.email}</strong>
                </p>
                <Button onClick={() => base44.auth.logout()} variant="ghost" size="sm">
                  Sair
                </Button>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>

      {/* MODAL DE CHAT - APARECE POR CIMA */}
      {chatAberto && conversaId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl">
            
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-red-600 to-orange-600 flex items-center justify-between rounded-t-lg flex-shrink-0">
              <div className="flex items-center gap-3">
                <Lock className="w-6 h-6 text-white" />
                <div>
                  <h2 className="text-xl font-bold text-white">Chat de Bloqueio - Urgente</h2>
                  <p className="text-xs text-red-100">Atendimento prioritário</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setChatAberto(false)}
                className="text-white hover:bg-red-500"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Mensagens */}
            <CardContent className="flex-1 overflow-y-auto p-4 bg-slate-50">
              <div ref={chatRef} className="space-y-4">
                {!mensagens || mensagens.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Loader className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Carregando mensagens...</p>
                  </div>
                ) : (
                  mensagens.map((msg) => {
                    const isUser = msg.remetente_id === user.id;
                    return (
                      <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-2 max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-red-600' : 'bg-slate-600'}`}>
                            {isUser ? <User className="w-5 h-5 text-white" /> : <Shield className="w-5 h-5 text-white" />}
                          </div>
                          <div className={`rounded-lg p-3 ${isUser ? 'bg-red-600 text-white' : 'bg-white border border-slate-200'}`}>
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.conteudo}</p>
                            <p className={`text-xs mt-1 ${isUser ? 'text-red-100' : 'text-slate-400'}`}>
                              {new Date(msg.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>

            {/* Input */}
            <div className="border-t bg-white p-4 rounded-b-lg flex-shrink-0">
              <form onSubmit={enviarMensagem} className="flex gap-2">
                <Textarea
                  value={novaMensagem}
                  onChange={(e) => setNovaMensagem(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  rows={2}
                  className="flex-1 resize-none"
                  disabled={enviando}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      enviarMensagem(e);
                    }
                  }}
                />
                <Button 
                  type="submit" 
                  disabled={enviando || !novaMensagem.trim()} 
                  className="bg-red-600 hover:bg-red-700"
                >
                  {enviando ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </form>
              <p className="text-xs text-slate-500 mt-2 text-center">
                Enter para enviar • Shift+Enter para nova linha
              </p>
            </div>

          </Card>
        </div>
      )}

    </div>
  );
}