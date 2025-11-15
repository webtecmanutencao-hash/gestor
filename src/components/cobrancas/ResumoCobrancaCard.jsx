import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, AlertCircle, Clock, CheckCircle, TrendingUp, Calendar } from "lucide-react";
import { format, startOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ResumoCobrancaCard({ parcelas }) {
  const resumo = useMemo(() => {
    if (!parcelas || parcelas.length === 0) {
      return {
        total_pendente: 0,
        total_recebido: 0,
        atrasadas: 0,
        a_vencer_30_dias: 0,
        maior_devedor: null,
      };
    }

    const hoje = startOfDay(new Date());
    const daqui30Dias = new Date(hoje);
    daqui30Dias.setDate(daqui30Dias.getDate() + 30);
    const todayString = format(hoje, 'yyyy-MM-dd');
    const date30String = format(daqui30Dias, 'yyyy-MM-dd');

    // Total pendente
    const total_pendente = parcelas
      .filter(p => p.status === 'pendente')
      .reduce((sum, p) => sum + (p.valor || 0), 0);

    // Total recebido (parcelas pagas)
    const total_recebido = parcelas
      .filter(p => p.status === 'pago')
      .reduce((sum, p) => sum + (p.valor || 0), 0);

    // Atrasadas
    const atrasadas = parcelas.filter(
      p => p.status === 'pendente' && p.data_vencimento < todayString
    ).length;

    // A vencer nos próximos 30 dias
    const a_vencer_30_dias = parcelas.filter(
      p => p.status === 'pendente' && 
           p.data_vencimento >= todayString && 
           p.data_vencimento <= date30String
    ).length;

    // Maior devedor (cliente com maior valor pendente)
    const devedoresPorCliente = {};
    parcelas
      .filter(p => p.status === 'pendente')
      .forEach(p => {
        const cliente = p.cliente_nome || 'Sem nome';
        if (!devedoresPorCliente[cliente]) {
          devedoresPorCliente[cliente] = 0;
        }
        devedoresPorCliente[cliente] += p.valor || 0;
      });

    const clientesOrdenados = Object.entries(devedoresPorCliente).sort((a, b) => b[1] - a[1]);
    const maior_devedor = clientesOrdenados.length > 0 
      ? { nome: clientesOrdenados[0][0], valor: clientesOrdenados[0][1] }
      : null;

    return {
      total_pendente,
      total_recebido,
      atrasadas,
      a_vencer_30_dias,
      maior_devedor,
    };
  }, [parcelas]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Total Pendente */}
      <Card className="border-l-4 border-l-orange-500 shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Pendente</p>
              <p className="text-3xl font-bold text-orange-600">
                R$ {resumo.total_pendente.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Recebido */}
      <Card className="border-l-4 border-l-green-500 shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Recebido</p>
              <p className="text-3xl font-bold text-green-600">
                R$ {resumo.total_recebido.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parcelas Atrasadas */}
      <Card className="border-l-4 border-l-red-500 shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Parcelas Atrasadas</p>
              <p className="text-3xl font-bold text-red-600">
                {resumo.atrasadas}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* A Vencer em 30 Dias */}
      <Card className="border-l-4 border-l-blue-500 shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Vencem em 30 Dias</p>
              <p className="text-3xl font-bold text-blue-600">
                {resumo.a_vencer_30_dias}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Maior Devedor */}
      <Card className="border-l-4 border-l-purple-500 shadow-lg hover:shadow-xl transition-shadow md:col-span-2">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-slate-600 mb-1">Maior Devedor</p>
              {resumo.maior_devedor ? (
                <>
                  <p className="text-xl font-bold text-purple-600 truncate">
                    {resumo.maior_devedor.nome}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Deve: R$ {resumo.maior_devedor.valor.toFixed(2)}
                  </p>
                </>
              ) : (
                <p className="text-lg text-slate-500">Nenhum devedor</p>
              )}
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}