import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Printer, Download, Loader, TrendingUp, DollarSign, Package, Users, FileBarChart } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Relatorios() {
  const [tipoRelatorio, setTipoRelatorio] = useState("vendas");
  const [periodoPreset, setPeriodoPreset] = useState("mes_atual");
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Buscar todos os dados necessários
  const { data: vendas = [], isLoading: isLoadingVendas } = useQuery({
    queryKey: ['todasAsVendas'],
    queryFn: () => base44.entities.Venda.list('-created_date', 1000),
    initialData: []
  });

  const { data: clientes = [], isLoading: isLoadingClientes } = useQuery({
    queryKey: ['todosClientes'],
    queryFn: () => base44.entities.Cliente.list('-created_date', 1000),
    initialData: []
  });

  const { data: produtos = [], isLoading: isLoadingProdutos } = useQuery({
    queryKey: ['todosProdutos'],
    queryFn: () => base44.entities.Produto.list('-created_date', 1000),
    initialData: []
  });

  const { data: parcelas = [], isLoading: isLoadingParcelas } = useQuery({
    queryKey: ['todasParcelas'],
    queryFn: () => base44.entities.Parcela.list('-created_date', 1000),
    initialData: []
  });

  const { data: notas = [], isLoading: isLoadingNotas } = useQuery({
    queryKey: ['todasNotas'],
    queryFn: () => base44.entities.NotaServico.list('-created_date', 1000),
    initialData: []
  });

  const { data: recibos = [], isLoading: isLoadingRecibos } = useQuery({
    queryKey: ['todosRecibos'],
    queryFn: () => base44.entities.Recibo.list('-created_date', 1000),
    initialData: []
  });

  const isLoading = isLoadingVendas || isLoadingClientes || isLoadingProdutos || isLoadingParcelas || isLoadingNotas || isLoadingRecibos;

  // Atualizar datas quando mudar o preset
  const handlePeriodoChange = (preset) => {
    setPeriodoPreset(preset);
    const hoje = new Date();
    
    switch(preset) {
      case 'hoje':
        setDataInicio(format(hoje, 'yyyy-MM-dd'));
        setDataFim(format(hoje, 'yyyy-MM-dd'));
        break;
      case 'mes_atual':
        setDataInicio(format(startOfMonth(hoje), 'yyyy-MM-dd'));
        setDataFim(format(endOfMonth(hoje), 'yyyy-MM-dd'));
        break;
      case 'mes_passado':
        const mesPassado = subMonths(hoje, 1);
        setDataInicio(format(startOfMonth(mesPassado), 'yyyy-MM-dd'));
        setDataFim(format(endOfMonth(mesPassado), 'yyyy-MM-dd'));
        break;
      case 'ano_atual':
        setDataInicio(format(startOfYear(hoje), 'yyyy-MM-dd'));
        setDataFim(format(endOfYear(hoje), 'yyyy-MM-dd'));
        break;
      case 'personalizado':
        // Mantém as datas atuais
        break;
    }
  };

  // Filtrar dados pelo período
  const dadosFiltrados = useMemo(() => {
    const inicio = parseISO(dataInicio);
    const fim = parseISO(dataFim);
    fim.setHours(23, 59, 59, 999); // Incluir todo o último dia

    return {
      vendas: vendas.filter(v => {
        const data = parseISO(v.created_date);
        return isWithinInterval(data, { start: inicio, end: fim });
      }),
      parcelas: parcelas.filter(p => {
        const data = parseISO(p.created_date);
        return isWithinInterval(data, { start: inicio, end: fim });
      }),
      notas: notas.filter(n => {
        const data = parseISO(n.data_emissao);
        return isWithinInterval(data, { start: inicio, end: fim });
      }),
      recibos: recibos.filter(r => {
        const data = parseISO(r.data_pagamento);
        return isWithinInterval(data, { start: inicio, end: fim });
      }),
    };
  }, [vendas, parcelas, notas, recibos, dataInicio, dataFim]);

  // Gerar dados do relatório baseado no tipo selecionado
  const dadosRelatorio = useMemo(() => {
    switch(tipoRelatorio) {
      case 'vendas':
        return gerarRelatorioVendas(dadosFiltrados.vendas);
      case 'clientes':
        return gerarRelatorioClientes(clientes);
      case 'produtos':
        return gerarRelatorioProdutos(dadosFiltrados.vendas, produtos);
      case 'financeiro':
        return gerarRelatorioFinanceiro(dadosFiltrados.vendas, dadosFiltrados.parcelas);
      case 'documentos':
        return gerarRelatorioDocumentos(dadosFiltrados.notas, dadosFiltrados.recibos);
      default:
        return null;
    }
  }, [tipoRelatorio, dadosFiltrados, clientes, produtos]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #relatorio-imprimir, #relatorio-imprimir * {
            visibility: visible;
          }
          #relatorio-imprimir {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 15mm;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        <div className="mb-8 no-print">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Relatórios Gerenciais
          </h1>
          <p className="text-slate-600 mt-1">Analise o desempenho do seu negócio com relatórios detalhados</p>
        </div>

        {/* FILTROS */}
        <Card className="mb-6 shadow-lg no-print">
          <CardHeader>
            <CardTitle>Configurar Relatório</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Relatório</Label>
                <Select value={tipoRelatorio} onValueChange={setTipoRelatorio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendas">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Relatório de Vendas
                      </div>
                    </SelectItem>
                    <SelectItem value="clientes">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Relatório de Clientes
                      </div>
                    </SelectItem>
                    <SelectItem value="produtos">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Relatório de Produtos
                      </div>
                    </SelectItem>
                    <SelectItem value="financeiro">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Relatório Financeiro
                      </div>
                    </SelectItem>
                    <SelectItem value="documentos">
                      <div className="flex items-center gap-2">
                        <FileBarChart className="w-4 h-4" />
                        Relatório de Documentos Fiscais
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Período</Label>
                <Select value={periodoPreset} onValueChange={handlePeriodoChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hoje">Hoje</SelectItem>
                    <SelectItem value="mes_atual">Mês Atual</SelectItem>
                    <SelectItem value="mes_passado">Mês Passado</SelectItem>
                    <SelectItem value="ano_atual">Ano Atual</SelectItem>
                    <SelectItem value="personalizado">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {periodoPreset === 'personalizado' && (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Data Início</Label>
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    max={dataFim}
                  />
                </div>
                <div>
                  <Label>Data Fim</Label>
                  <Input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    min={dataInicio}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handlePrint} variant="outline" className="gap-2">
                <Printer className="w-4 h-4" />
                Imprimir
              </Button>
              <Button onClick={handlePrint} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Salvar PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* CONTEÚDO DO RELATÓRIO */}
        <div id="relatorio-imprimir">
          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                <p className="text-slate-500">Carregando dados...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Cabeçalho do Relatório (para impressão) */}
              <div className="mb-6 print-only" style={{ display: 'none' }}>
                <h1 className="text-2xl font-bold text-center mb-2">
                  {getTituloRelatorio(tipoRelatorio)}
                </h1>
                <p className="text-center text-slate-600">
                  Período: {format(parseISO(dataInicio), 'dd/MM/yyyy')} até {format(parseISO(dataFim), 'dd/MM/yyyy')}
                </p>
                <p className="text-center text-slate-500 text-sm">
                  Gerado em: {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
                </p>
              </div>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>{getTituloRelatorio(tipoRelatorio)}</CardTitle>
                  <p className="text-sm text-slate-600">
                    Período: {format(parseISO(dataInicio), 'dd/MM/yyyy')} até {format(parseISO(dataFim), 'dd/MM/yyyy')}
                  </p>
                </CardHeader>
                <CardContent>
                  {renderRelatorio(tipoRelatorio, dadosRelatorio, dataInicio, dataFim)}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Funções auxiliares
function getTituloRelatorio(tipo) {
  const titulos = {
    vendas: 'Relatório de Vendas',
    clientes: 'Relatório de Clientes',
    produtos: 'Relatório de Produtos',
    financeiro: 'Relatório Financeiro',
    documentos: 'Relatório de Documentos Fiscais'
  };
  return titulos[tipo] || 'Relatório';
}

function gerarRelatorioVendas(vendas) {
  const totalVendas = vendas.reduce((sum, v) => sum + (v.valor_total || 0), 0);
  const totalItens = vendas.reduce((sum, v) => sum + (v.itens?.length || 0), 0);
  const ticketMedio = vendas.length > 0 ? totalVendas / vendas.length : 0;

  // Vendas por forma de pagamento
  const porFormaPagamento = vendas.reduce((acc, v) => {
    const forma = v.forma_pagamento || 'Não informado';
    acc[forma] = (acc[forma] || 0) + (v.valor_total || 0);
    return acc;
  }, {});

  // Vendas por canal
  const porCanal = vendas.reduce((acc, v) => {
    const canal = v.canal_venda || 'Não informado';
    acc[canal] = (acc[canal] || 0) + 1;
    return acc;
  }, {});

  return {
    vendas,
    totalVendas,
    totalItens,
    ticketMedio,
    porFormaPagamento,
    porCanal,
    quantidade: vendas.length
  };
}

function gerarRelatorioClientes(clientes) {
  const ativos = clientes.filter(c => c.status === 'ativo' || !c.status);
  const inativos = clientes.filter(c => c.status === 'inativo');
  
  return {
    clientes,
    total: clientes.length,
    ativos: ativos.length,
    inativos: inativos.length,
    listaAtivos: ativos,
    listaInativos: inativos
  };
}

function gerarRelatorioProdutos(vendas, produtos) {
  // Produtos mais vendidos
  const vendasPorProduto = {};
  vendas.forEach(venda => {
    venda.itens?.forEach(item => {
      if (!vendasPorProduto[item.produto_id]) {
        vendasPorProduto[item.produto_id] = {
          id: item.produto_id,
          nome: item.produto_nome,
          quantidade: 0,
          receita: 0
        };
      }
      vendasPorProduto[item.produto_id].quantidade += item.quantidade;
      vendasPorProduto[item.produto_id].receita += item.subtotal;
    });
  });

  const produtosMaisVendidos = Object.values(vendasPorProduto)
    .sort((a, b) => b.quantidade - a.quantidade);

  const produtosComEstoque = produtos.map(p => ({
    ...p,
    vendido: vendasPorProduto[p.id]?.quantidade || 0
  }));

  return {
    produtos: produtosComEstoque,
    maisVendidos: produtosMaisVendidos,
    totalProdutos: produtos.length,
    totalEstoque: produtos.reduce((sum, p) => sum + (p.quantidade_estoque || 0), 0)
  };
}

function gerarRelatorioFinanceiro(vendas, parcelas) {
  const receitaVendas = vendas.reduce((sum, v) => sum + (v.valor_total || 0), 0);
  
  const parcelasPagas = parcelas.filter(p => p.status === 'pago');
  const parcelasPendentes = parcelas.filter(p => p.status === 'pendente');
  
  const receitaParcelas = parcelasPagas.reduce((sum, p) => sum + (p.valor || 0), 0);
  const contasReceber = parcelasPendentes.reduce((sum, p) => sum + (p.valor || 0), 0);

  return {
    receitaVendas,
    receitaParcelas,
    receitaTotal: receitaVendas,
    contasReceber,
    parcelasPagas: parcelasPagas.length,
    parcelasPendentes: parcelasPendentes.length,
    listaParcelasPagas: parcelasPagas,
    listaParcelasPendentes: parcelasPendentes
  };
}

function gerarRelatorioDocumentos(notas, recibos) {
  const notasAtivas = notas.filter(n => n.status === 'ativa');
  const notasCanceladas = notas.filter(n => n.status === 'cancelada');
  
  const recibosAtivos = recibos.filter(r => r.status === 'ativo');
  const recibosCancelados = recibos.filter(r => r.status === 'cancelado');

  const valorNotas = notasAtivas.reduce((sum, n) => sum + (n.valor_total || 0), 0);
  const valorRecibos = recibosAtivos.reduce((sum, r) => sum + (r.valor_pago || 0), 0);

  return {
    notas: notasAtivas,
    notasCanceladas,
    recibos: recibosAtivos,
    recibosCancelados,
    totalNotas: notas.length,
    totalRecibos: recibos.length,
    valorNotas,
    valorRecibos,
    valorTotal: valorNotas + valorRecibos
  };
}

function renderRelatorio(tipo, dados, dataInicio, dataFim) {
  if (!dados) return <p className="text-center text-slate-500">Selecione um tipo de relatório</p>;

  switch(tipo) {
    case 'vendas':
      return <RelatorioVendas dados={dados} />;
    case 'clientes':
      return <RelatorioClientes dados={dados} />;
    case 'produtos':
      return <RelatorioProdutos dados={dados} />;
    case 'financeiro':
      return <RelatorioFinanceiro dados={dados} />;
    case 'documentos':
      return <RelatorioDocumentos dados={dados} />;
    default:
      return null;
  }
}

// Componentes de Relatório
function RelatorioVendas({ dados }) {
  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Total de Vendas</p>
            <p className="text-2xl font-bold text-slate-900">{dados.quantidade}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Receita Total</p>
            <p className="text-2xl font-bold text-green-600">R$ {dados.totalVendas.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Ticket Médio</p>
            <p className="text-2xl font-bold text-blue-600">R$ {dados.ticketMedio.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Itens Vendidos</p>
            <p className="text-2xl font-bold text-orange-600">{dados.totalItens}</p>
          </CardContent>
        </Card>
      </div>

      {/* Por Forma de Pagamento */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Vendas por Forma de Pagamento</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left p-3">Forma de Pagamento</th>
                <th className="text-right p-3">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(dados.porFormaPagamento).map(([forma, valor]) => (
                <tr key={forma} className="border-t">
                  <td className="p-3">{forma}</td>
                  <td className="text-right p-3 font-semibold">R$ {valor.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lista de Vendas */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Detalhamento de Vendas</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left p-3">Data</th>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Nº Venda</th>
                <th className="text-right p-3">Valor</th>
              </tr>
            </thead>
            <tbody>
              {dados.vendas.map(venda => (
                <tr key={venda.id} className="border-t">
                  <td className="p-3">{format(new Date(venda.created_date), 'dd/MM/yyyy')}</td>
                  <td className="p-3">{venda.cliente_nome}</td>
                  <td className="p-3">{venda.numero_venda}</td>
                  <td className="text-right p-3 font-semibold">R$ {venda.valor_total?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold">
              <tr>
                <td colSpan="3" className="p-3 text-right">TOTAL:</td>
                <td className="text-right p-3">R$ {dados.totalVendas.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function RelatorioClientes({ dados }) {
  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Total de Clientes</p>
            <p className="text-2xl font-bold text-slate-900">{dados.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Clientes Ativos</p>
            <p className="text-2xl font-bold text-green-600">{dados.ativos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Clientes Inativos</p>
            <p className="text-2xl font-bold text-red-600">{dados.inativos}</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Clientes Ativos */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Clientes Ativos ({dados.ativos})</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left p-3">Nome</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Telefone</th>
                <th className="text-left p-3">CPF/CNPJ</th>
              </tr>
            </thead>
            <tbody>
              {dados.listaAtivos.map(cliente => (
                <tr key={cliente.id} className="border-t">
                  <td className="p-3">{cliente.name}</td>
                  <td className="p-3">{cliente.email || '-'}</td>
                  <td className="p-3">{cliente.phone || '-'}</td>
                  <td className="p-3">{cliente.cpf_cnpj || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RelatorioProdutos({ dados }) {
  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Total de Produtos</p>
            <p className="text-2xl font-bold text-slate-900">{dados.totalProdutos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Total em Estoque</p>
            <p className="text-2xl font-bold text-blue-600">{dados.totalEstoque}</p>
          </CardContent>
        </Card>
      </div>

      {/* Produtos Mais Vendidos */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Top 10 Produtos Mais Vendidos</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left p-3">Produto</th>
                <th className="text-right p-3">Quantidade Vendida</th>
                <th className="text-right p-3">Receita</th>
              </tr>
            </thead>
            <tbody>
              {dados.maisVendidos.slice(0, 10).map(produto => (
                <tr key={produto.id} className="border-t">
                  <td className="p-3">{produto.nome}</td>
                  <td className="text-right p-3 font-semibold">{produto.quantidade}</td>
                  <td className="text-right p-3 font-semibold">R$ {produto.receita.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Estoque Atual */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Estoque Atual</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left p-3">Produto</th>
                <th className="text-right p-3">Qtd. em Estoque</th>
                <th className="text-right p-3">Vendido no Período</th>
                <th className="text-right p-3">Preço Venda</th>
              </tr>
            </thead>
            <tbody>
              {dados.produtos.map(produto => (
                <tr key={produto.id} className="border-t">
                  <td className="p-3">{produto.nome_produto}</td>
                  <td className="text-right p-3">{produto.quantidade_estoque || 0}</td>
                  <td className="text-right p-3">{produto.vendido}</td>
                  <td className="text-right p-3">R$ {produto.preco_venda?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RelatorioFinanceiro({ dados }) {
  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Receita Total</p>
            <p className="text-2xl font-bold text-green-600">R$ {dados.receitaTotal.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Contas a Receber</p>
            <p className="text-2xl font-bold text-orange-600">R$ {dados.contasReceber.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Recebido (Parcelas)</p>
            <p className="text-2xl font-bold text-blue-600">R$ {dados.receitaParcelas.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Parcelas Pagas */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Parcelas Pagas ({dados.parcelasPagas})</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Venda</th>
                <th className="text-left p-3">Parcela</th>
                <th className="text-left p-3">Data Pgto</th>
                <th className="text-right p-3">Valor</th>
              </tr>
            </thead>
            <tbody>
              {dados.listaParcelasPagas.map(parcela => (
                <tr key={parcela.id} className="border-t">
                  <td className="p-3">{parcela.cliente_nome}</td>
                  <td className="p-3">{parcela.numero_venda}</td>
                  <td className="p-3">{parcela.numero_parcela}</td>
                  <td className="p-3">{parcela.data_pagamento ? format(new Date(parcela.data_pagamento), 'dd/MM/yyyy') : '-'}</td>
                  <td className="text-right p-3 font-semibold text-green-600">R$ {parcela.valor?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold">
              <tr>
                <td colSpan="4" className="p-3 text-right">TOTAL RECEBIDO:</td>
                <td className="text-right p-3 text-green-600">R$ {dados.receitaParcelas.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Parcelas Pendentes */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Parcelas Pendentes ({dados.parcelasPendentes})</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Venda</th>
                <th className="text-left p-3">Parcela</th>
                <th className="text-left p-3">Vencimento</th>
                <th className="text-right p-3">Valor</th>
              </tr>
            </thead>
            <tbody>
              {dados.listaParcelasPendentes.map(parcela => (
                <tr key={parcela.id} className="border-t">
                  <td className="p-3">{parcela.cliente_nome}</td>
                  <td className="p-3">{parcela.numero_venda}</td>
                  <td className="p-3">{parcela.numero_parcela}</td>
                  <td className="p-3">{format(new Date(parcela.data_vencimento), 'dd/MM/yyyy')}</td>
                  <td className="text-right p-3 font-semibold text-orange-600">R$ {parcela.valor?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold">
              <tr>
                <td colSpan="4" className="p-3 text-right">TOTAL A RECEBER:</td>
                <td className="text-right p-3 text-orange-600">R$ {dados.contasReceber.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function RelatorioDocumentos({ dados }) {
  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Total em Notas Fiscais</p>
            <p className="text-2xl font-bold text-blue-600">R$ {dados.valorNotas.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1">{dados.notas.length} notas ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Total em Recibos</p>
            <p className="text-2xl font-bold text-green-600">R$ {dados.valorRecibos.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1">{dados.recibos.length} recibos ativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Notas Fiscais */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Notas Fiscais Emitidas ({dados.notas.length})</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left p-3">Nº Nota</th>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Data Emissão</th>
                <th className="text-right p-3">Valor</th>
              </tr>
            </thead>
            <tbody>
              {dados.notas.map(nota => (
                <tr key={nota.id} className="border-t">
                  <td className="p-3">{nota.numero_nota}</td>
                  <td className="p-3">{nota.cliente_nome}</td>
                  <td className="p-3">{format(new Date(nota.data_emissao), 'dd/MM/yyyy')}</td>
                  <td className="text-right p-3 font-semibold">R$ {nota.valor_total?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold">
              <tr>
                <td colSpan="3" className="p-3 text-right">TOTAL:</td>
                <td className="text-right p-3">R$ {dados.valorNotas.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Recibos */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Recibos Emitidos ({dados.recibos.length})</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left p-3">Nº Recibo</th>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Data Pagamento</th>
                <th className="text-right p-3">Valor</th>
              </tr>
            </thead>
            <tbody>
              {dados.recibos.map(recibo => (
                <tr key={recibo.id} className="border-t">
                  <td className="p-3">{recibo.numero_recibo}</td>
                  <td className="p-3">{recibo.cliente_nome}</td>
                  <td className="p-3">{format(new Date(recibo.data_pagamento), 'dd/MM/yyyy')}</td>
                  <td className="text-right p-3 font-semibold">R$ {recibo.valor_pago?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold">
              <tr>
                <td colSpan="3" className="p-3 text-right">TOTAL:</td>
                <td className="text-right p-3">R$ {dados.valorRecibos.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}