import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Lock, 
  Loader, 
  MessageSquare,
  ExternalLink,
  AlertTriangle,
  User,
  Clock,
  CheckCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

export default function ChatBloqueioTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar apenas chats de bloqueio
  const { data: chatsBloqueio = [], isLoading } = useQuery({
    queryKey: ['chatsBloqueio'],
    queryFn: async () => {
      return await base44.entities.ChatConversa.filter(
        { 
          tipo_chat: 'bloqueio',
          status: 'aberto' 
        }, 
        '-last_message_date'
      );
    },
    refetchInterval: 5000,
    initialData: []
  });

  // Mutation para finalizar conversa
  const finalizarConversaMutation = useMutation({
    mutationFn: async (conversaId) => {
      return await base44.entities.ChatConversa.update(conversaId, {
        status: 'resolvido'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatsBloqueio'] });
      queryClient.invalidateQueries({ queryKey: ['adminNotifications'] });
      toast({
        title: "✅ Conversa Finalizada",
        description: "A conversa foi marcada como resolvida.",
        variant: "success"
      });
    },
    onError: (error) => {
      toast({
        title: "❌ Erro",
        description: "Não foi possível finalizar a conversa.",
        variant: "destructive"
      });
    }
  });

  const chatsNaoLidos = chatsBloqueio.filter(c => c.unread_admin).length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto text-red-600 mb-2" />
          <p className="text-slate-500">Carregando chats de bloqueio...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-red-600 rounded-xl flex items-center justify-center">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-red-900">Chats de Bloqueio - Urgente</h2>
                <p className="text-red-700">Clientes com conta bloqueada precisando de ajuda</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-center px-6 py-3 bg-white rounded-lg border-2 border-red-300">
                <p className="text-3xl font-bold text-red-600">{chatsBloqueio.length}</p>
                <p className="text-xs text-red-700 font-semibold">TOTAL</p>
              </div>
              {chatsNaoLidos > 0 && (
                <div className="text-center px-6 py-3 bg-red-600 rounded-lg animate-pulse">
                  <p className="text-3xl font-bold text-white">{chatsNaoLidos}</p>
                  <p className="text-xs text-white font-semibold">NÃO LIDOS</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert de prioridade */}
      <Card className="bg-yellow-50 border-2 border-yellow-400">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <p className="font-bold text-yellow-900 mb-2">⚡ Atendimento Prioritário</p>
              <p className="text-sm text-yellow-800">
                Estes chats são de clientes com conta bloqueada. São considerados <strong>urgentes</strong> e 
                devem ser respondidos o mais rápido possível. Resolva a situação para desbloquear o acesso do cliente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de chats de bloqueio */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-red-600" />
            <div>
              <CardTitle>Conversas de Bloqueio Ativas ({chatsBloqueio.length})</CardTitle>
              <CardDescription>Clientes bloqueados aguardando suporte urgente</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chatsBloqueio.length === 0 ? (
            <div className="text-center py-12">
              <Lock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg font-semibold mb-2">Nenhum Chat de Bloqueio Ativo</p>
              <p className="text-slate-400 text-sm">
                Quando um cliente bloqueado iniciar um chat, ele aparecerá aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {chatsBloqueio.map(chat => (
                <Card key={chat.id} className="hover:bg-red-50 transition-colors border-2 border-red-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-red-600" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-slate-900 truncate">{chat.usuario_nome}</p>
                            {chat.unread_admin && (
                              <Badge className="bg-red-600 text-white animate-pulse">
                                NOVO
                              </Badge>
                            )}
                            <Badge variant="destructive" className="bg-orange-600">
                              URGENTE
                            </Badge>
                          </div>
                          
                          <p className="text-sm font-semibold text-red-700 mb-2">
                            {chat.assunto}
                          </p>
                          
                          <p className="text-sm text-slate-600 truncate mb-2">
                            {chat.last_message_preview}
                          </p>
                          
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(chat.last_message_date), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Link to={createPageUrl(`ChatAdmin?conversaId=${chat.id}`)}>
                          <Button 
                            variant="outline" 
                            className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white w-full"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Atender
                          </Button>
                        </Link>
                        
                        <Button
                          onClick={() => finalizarConversaMutation.mutate(chat.id)}
                          disabled={finalizarConversaMutation.isPending}
                          variant="outline"
                          className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white w-full"
                        >
                          {finalizarConversaMutation.isPending ? (
                            <Loader className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          Finalizar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dicas de atendimento */}
      <Card className="bg-blue-50 border-2 border-blue-300">
        <CardHeader>
          <CardTitle className="text-blue-900">💡 Dicas para Atendimento</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <span><strong>Seja rápido:</strong> Clientes bloqueados não conseguem acessar o sistema.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span><strong>Verifique o motivo:</strong> Veja se há comprovante pendente na aba "Verificação".</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span><strong>Desbloquear:</strong> Vá em "Usuários" → "Desbloquear Acesso" após regularizar.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">4.</span>
              <span><strong>Notifique:</strong> Informe o cliente no chat quando o acesso for liberado.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">5.</span>
              <span><strong>Finalizar:</strong> Clique em "Finalizar" quando resolver a situação do cliente.</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}