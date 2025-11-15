import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle, Clock, XCircle, CreditCard, Loader, Copy, DollarSign } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const mapConfigsToObject = (configs) => {
  if (!configs) return {};
  return configs.reduce((acc, config) => {
      acc[config.chave] = config.valor;
      return acc;
  }, {});
};

export default function Mensalidade() {
  const [uploading, setUploading] = useState(false);
  const [postUploadStatus, setPostUploadStatus] = useState(null);
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const queryClient = useQueryClient();

  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: pagamentos = [], isLoading: isLoadingPagamentos } = useQuery({
    queryKey: ['pagamentos', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await base44.entities.Pagamento.filter({ empresa_id: user.id }, '-created_date');
    },
    enabled: !!user?.id,
    initialData: [],
  });

  const { data: configsArray, isLoading: isLoadingConfigs } = useQuery({
    queryKey: ['configuracoesPublicas'],
    queryFn: () => base44.entities.ConfiguracaoPublica.list(),
    refetchInterval: 10000, // Atualiza a cada 10 segundos para pegar mudanças do admin
  });
  
  const configs = mapConfigsToObject(configsArray || []);

  const chavePix = configs.CHAVE_PIX || "";
  const bancoPix = configs.NOME_BANCO_PIX || "";
  const titularPix = configs.NOME_TITULAR_PIX || "";
  const valorMensalidade = parseFloat(configs.VALOR_MENSALIDADE || "100.00");

  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const ano = hoje.getFullYear();
  const mesAtualRef = `${mes}/${ano}`;
  
  const pagamentoMesAtual = !postUploadStatus && pagamentos.find(p =>
    p.mes_referencia === mesAtualRef &&
    (p.status === 'aprovado' || p.status === 'aguardando_verificacao')
  );

  const estaEmDia = !!pagamentoMesAtual || user?.status === 'ativo';

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return file_url;
    },
  });

  const criarPagamentoMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Pagamento.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagamentos'] });
      queryClient.invalidateQueries({ queryKey: ['adminNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['pagamentosPendentesAdmin'] });
      setPostUploadStatus('aguardando');
    },
  });

  const handleFileSelectAndUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setPostUploadStatus(null);

    try {
      const comprovante_url = await uploadMutation.mutateAsync(file);

      const hoje = new Date();
      const diaVencimento = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

      await criarPagamentoMutation.mutateAsync({
        empresa_id: user.id,
        empresa_nome: user.full_name || user.email,
        valor: valorMensalidade,
        mes_referencia: mesAtualRef,
        data_vencimento: diaVencimento.toISOString().split('T')[0],
        status: 'aguardando_verificacao',
        comprovante_url,
        chave_pix: chavePix,
      });

      toast({
        title: "✅ Comprovante Enviado!",
        description: "Seu pagamento está em análise e será liberado em breve.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "❌ Erro no envio",
        description: error.message,
        variant: "destructive",
      });
      setPostUploadStatus(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "✅ Copiado!",
      description: "Chave PIX copiada para a área de transferência.",
    });
  };

  if (isLoadingUser || isLoadingPagamentos || isLoadingConfigs) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-blue-600" />
            Mensalidade de Uso
          </h1>
          <p className="text-slate-600 mt-1">Gerencie o pagamento mensal do sistema GestãoPro</p>
        </div>

        {/* AVISO DE POLÍTICA DE PAGAMENTO */}
        <Card className="mb-6 border-2 border-blue-300 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-blue-900 text-lg mb-3">Política de Pagamento</h3>
                <div className="space-y-2 text-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <p><strong>Vencimento:</strong> Todo dia 1º do mês</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <p><strong>Período de Carência:</strong> Até o dia 5 de cada mês</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                    <p><strong className="text-red-600">Após dia 5: BLOQUEIO AUTOMÁTICO</strong> do sistema</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                  <p className="text-sm text-slate-600">
                    ⚠️ <strong>Importante:</strong> Pague até o dia 5 para evitar bloqueio e manter seu acesso ativo.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card com valor da mensalidade - DINÂMICO */}
        <Card className="mb-6 shadow-lg border-blue-200">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">Valor da Mensalidade</p>
                <p className="text-4xl font-bold text-blue-600">R$ {valorMensalidade.toFixed(2).replace('.', ',')}</p>
                <p className="text-slate-500 text-sm mt-1">por mês</p>
              </div>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn("mb-6", estaEmDia ? "border-green-200 bg-green-50" : postUploadStatus === 'aguardando' ? "border-yellow-200 bg-yellow-50" : "border-red-200 bg-red-50")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {estaEmDia ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="text-green-900">Situação Regular</span>
                </>
              ) : postUploadStatus === 'aguardando' ? (
                <>
                  <Clock className="w-6 h-6 text-yellow-600" />
                  <span className="text-yellow-900">Pagamento em Análise</span>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 text-red-600" />
                  <span className="text-red-900">Pagamento Pendente</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {estaEmDia ? (
              <div>
                <p className="text-slate-700 mb-2">Seu pagamento referente ao mês <strong>{mesAtualRef}</strong> está aprovado!</p>
                <Badge variant="success">Status: {pagamentoMesAtual?.status === 'aprovado' ? 'Aprovado' : 'Em Verificação'}</Badge>
              </div>
            ) : postUploadStatus === 'aguardando' ? (
              <div>
                <p className="text-slate-700 mb-2">Seu comprovante foi recebido e está sendo analisado pela nossa equipe.</p>
                <p className="text-sm text-slate-600">Assim que o pagamento for confirmado, seu acesso será liberado automaticamente.</p>
              </div>
            ) : (
              <div>
                <p className="text-slate-700 mb-2">O pagamento da mensalidade de <strong>{mesAtualRef}</strong> está pendente.</p>
                <p className="text-sm text-slate-600">Valor: <strong className="text-blue-600">R$ {valorMensalidade.toFixed(2).replace('.', ',')}</strong> por mês</p>
              </div>
            )}
          </CardContent>
        </Card>

        {!estaEmDia && postUploadStatus !== 'aguardando' && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Dados para Pagamento via PIX</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Chave PIX:</p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-3 bg-slate-100 rounded border text-slate-900">{chavePix || "Não configurada"}</code>
                    {chavePix && (
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(chavePix)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Banco:</p>
                  <p className="text-slate-900">{bancoPix || "Não informado"}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Titular:</p>
                  <p className="text-slate-900">{titularPix || "Não informado"}</p>
                </div>
                
                {/* Valor a pagar - DINÂMICO */}
                <div className="bg-slate-50 border border-slate-300 rounded-lg p-4 mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-700 font-semibold">Valor a Pagar:</p>
                    <p className="text-3xl font-bold text-slate-900">R$ {valorMensalidade.toFixed(2).replace('.', ',')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Enviar Comprovante de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-4">
                  Após realizar o pagamento via PIX de <strong className="text-blue-600">R$ {valorMensalidade.toFixed(2).replace('.', ',')}</strong>, envie o comprovante para que possamos liberar seu acesso.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelectAndUpload}
                  style={{ display: 'none' }}
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button asChild disabled={uploading} className="w-full md:w-auto" size="lg">
                    <span>
                      {uploading ? (
                        <>
                          <Loader className="w-5 h-5 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 mr-2" />
                          Selecionar e Enviar Comprovante
                        </>
                      )}
                    </span>
                  </Button>
                </label>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}