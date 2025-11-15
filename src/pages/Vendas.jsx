import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart, UserCheck, Search, Barcode, Trash2, Loader, Eye, TrendingUp, Users as UsersIcon, DollarSign, Plus, Minus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Vendas() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Estados principais
  const [clientQuery, setClientQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [cart, setCart] = useState([]);
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVenda, setSelectedVenda] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Informações da venda
  const [vendaInfo, setVendaInfo] = useState({
    vendedor: '',
    canal_venda: 'loja_fisica',
    status: 'concluida',
    observacoes: '',
    valor_desconto: 0,
    valor_frete: 0,
    forma_pagamento: 'dinheiro',
    condicao_pagamento: 'a_vista',
    numero_parcelas: 1,
    endereco_entrega: '',
    transportadora: '',
    prazo_entrega: '',
    data_entrega_prevista: ''
  });

  // Buscar usuário atual
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  // Buscar clientes para seleção
  const { data: clients = [] } = useQuery({
    queryKey: ['clientesParaVenda', clientQuery],
    queryFn: () => {
      if (!clientQuery) return base44.entities.Cliente.list(null, 20);
      return base44.entities.Cliente.filter({ name: { $regex: clientQuery, $options: 'i' } });
    }
  });

  // Buscar produtos disponíveis
  const { data: products = [] } = useQuery({
    queryKey: ['produtosParaVenda'],
    queryFn: () => base44.entities.Produto.list()
  });

  // Buscar histórico de vendas
  const { data: vendas = [], isLoading: isLoadingVendas } = useQuery({
    queryKey: ['vendas'],
    queryFn: () => base44.entities.Venda.list('-created_date', 100),
    initialData: []
  });

  // Mutation para criar venda
  const addSaleMutation = useMutation({
    mutationFn: async (newSale) => {
      // 1. Criar a venda
      const vendaCriada = await base44.entities.Venda.create(newSale);
      
      // 2. Se for parcelado, criar as parcelas
      if (newSale.condicao_pagamento === 'parcelado' && newSale.numero_parcelas > 1) {
        const dataBase = new Date();
        const parcelas = [];
        
        for (let i = 1; i <= newSale.numero_parcelas; i++) {
          const dataVencimento = addMonths(dataBase, i);
          parcelas.push({
            venda_id: vendaCriada.id,
            numero_venda: vendaCriada.numero_venda,
            cliente_id: vendaCriada.cliente_id,
            cliente_nome: vendaCriada.cliente_nome,
            numero_parcela: i,
            valor: newSale.valor_parcela,
            data_vencimento: format(dataVencimento, 'yyyy-MM-dd'),
            status: 'pendente'
          });
        }
        
        await Promise.all(parcelas.map(p => base44.entities.Parcela.create(p)));
      }
      
      return vendaCriada;
    },
    onSuccess: async (data) => {
      // 3. Atualizar estoque dos produtos
      const stockUpdatePromises = data.itens.map(async (item) => {
        const product = products.find(p => p.id === item.produto_id);
        if (product && typeof product.quantidade_estoque === 'number') {
          const novaQuantidade = product.quantidade_estoque - item.quantidade;
          await base44.entities.Produto.update(product.id, {
            quantidade_estoque: novaQuantidade
          });

          // 4. Verificar se estoque ficou baixo
          const estoqueMinimo = Number(product.estoque_minimo || 5);
          if (novaQuantidade <= estoqueMinimo && novaQuantidade > 0) {
            // Criar alerta de estoque baixo
            await base44.entities.AlertaEstoque.create({
              produto_id: product.id,
              produto_nome: product.nome_produto,
              quantidade_atual: novaQuantidade,
              estoque_minimo: estoqueMinimo,
              venda_id: data.id,
              status: 'pendente'
            });

            toast({
              title: "⚠️ Estoque Baixo!",
              description: `${product.nome_produto} precisa de reposição (${novaQuantidade} unidades)`,
              variant: "warning",
            });
          } else if (novaQuantidade <= 0) {
            // Produto esgotado
            await base44.entities.AlertaEstoque.create({
              produto_id: product.id,
              produto_nome: product.nome_produto,
              quantidade_atual: novaQuantidade,
              estoque_minimo: estoqueMinimo,
              venda_id: data.id,
              status: 'pendente'
            });

            toast({
              title: "🚨 Estoque Esgotado!",
              description: `${product.nome_produto} está sem estoque!`,
              variant: "destructive",
            });
          }
        }
        return Promise.resolve();
      });

      await Promise.all(stockUpdatePromises);

      // 5. Invalidar todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      queryClient.invalidateQueries({ queryKey: ['produtosParaVenda'] });
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      queryClient.invalidateQueries({ queryKey: ['todasAsVendas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['parcelas'] });
      queryClient.invalidateQueries({ queryKey: ['todasAsParcelasParaStats'] });
      queryClient.invalidateQueries({ queryKey: ['alertasEstoque'] });
      
      toast({
        title: "✅ Venda Registrada!",
        description: `Venda ${data.numero_venda} salva com sucesso.`,
        variant: "success"
      });

      // 6. Limpar formulário
      setCart([]);
      setSelectedClient(null);
      setClientQuery('');
      setVendaInfo({
        vendedor: '',
        canal_venda: 'loja_fisica',
        status: 'concluida',
        observacoes: '',
        valor_desconto: 0,
        valor_frete: 0,
        forma_pagamento: 'dinheiro',
        condicao_pagamento: 'a_vista',
        numero_parcelas: 1,
        endereco_entrega: '',
        transportadora: '',
        prazo_entrega: '',
        data_entrega_prevista: ''
      });
    },
    onError: (error) => {
      console.error("Erro ao registrar venda:", error);
      toast({
        title: "❌ Erro ao registrar venda",
        description: error.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  // Função para adicionar produto ao carrinho
  function addToCart(product, qty = 1) {
    if (!product) return;
    
    // Verificar se há estoque disponível
    if (product.quantidade_estoque < qty) {
      toast({
        title: "Estoque Insuficiente",
        description: `Apenas ${product.quantidade_estoque} unidades disponíveis.`,
        variant: "warning"
      });
      return;
    }
    
    setCart(prev => {
      const found = prev.find(i => i.produto_id === product.id);
      if (found) {
        const novaQtd = found.quantidade + qty;
        if (product.quantidade_estoque < novaQtd) {
          toast({
            title: "Estoque Insuficiente",
            description: `Apenas ${product.quantidade_estoque} unidades disponíveis.`,
            variant: "warning"
          });
          return prev;
        }
        return prev.map(i => i.produto_id === product.id 
          ? { ...i, quantidade: novaQtd, subtotal: i.valor_unitario * novaQtd } 
          : i
        );
      }
      
      return [...prev, {
        produto_id: product.id,
        produto_nome: product.nome_produto,
        codigo_item: product.sku || product.codigo_barras || '',
        descricao: product.descricao || '',
        ncm: product.ncm || '',
        valor_unitario: product.preco_venda || 0,
        quantidade: qty,
        subtotal: (product.preco_venda || 0) * qty
      }];
    });
  }

  // Função para atualizar quantidade no carrinho
  function updateCartQuantity(productId, newQty) {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    
    // Verificar estoque disponível
    const product = products.find(p => p.id === productId);
    if (product && product.quantidade_estoque < newQty) {
      toast({
        title: "Estoque Insuficiente",
        description: `Apenas ${product.quantidade_estoque} unidades disponíveis.`,
        variant: "warning"
      });
      return;
    }
    
    setCart(prev => prev.map(item => 
      item.produto_id === productId 
        ? { ...item, quantidade: newQty, subtotal: item.valor_unitario * newQty }
        : item
    ));
  }

  // Função para buscar por código de barras
  function handleBarcodeSearch(e) {
    e.preventDefault();
    if (!barcodeSearch.trim()) return;
    
    const p = products.find(p => 
      p.codigo_barras && p.codigo_barras.toString() === barcodeSearch.trim()
    );
    
    if (!p) {
      toast({ 
        title: "Produto não encontrado", 
        description: "Nenhum produto com este código de barras.",
        variant: "warning" 
      });
      return;
    }
    
    addToCart(p, 1);
    setBarcodeSearch('');
  }
  
  // Função para remover item do carrinho
  function removeFromCart(productId) {
    setCart(prev => prev.filter(item => item.produto_id !== productId));
  }

  // Função para finalizar venda
  function handleFinishSale() {
    // Validações
    if (!selectedClient) {
      toast({ 
        title: "Cliente não selecionado", 
        description: "Selecione um cliente para continuar.",
        variant: "warning" 
      });
      return;
    }
    
    if (cart.length === 0) {
      toast({ 
        title: "Carrinho vazio", 
        description: "Adicione produtos ao carrinho.",
        variant: "warning" 
      });
      return;
    }

    // Calcular valores
    const valor_subtotal = cart.reduce((s, it) => s + it.subtotal, 0);
    const valor_desconto_num = Number(vendaInfo.valor_desconto || 0);
    const valor_frete_num = Number(vendaInfo.valor_frete || 0);
    const valor_total = valor_subtotal - valor_desconto_num + valor_frete_num;
    const numero_parcelas_num = Number(vendaInfo.numero_parcelas || 1);
    const valor_parcela = vendaInfo.condicao_pagamento === 'parcelado' 
      ? valor_total / numero_parcelas_num 
      : valor_total;
    
    // Preparar dados da venda
    const vendaData = {
      numero_venda: `VND-${Date.now()}`,
      cliente_id: selectedClient.id, 
      cliente_nome: selectedClient.name,
      vendedor: vendaInfo.vendedor || user?.full_name || 'Sistema',
      canal_venda: vendaInfo.canal_venda,
      status: vendaInfo.status,
      observacoes: vendaInfo.observacoes || '',
      itens: cart,
      valor_subtotal,
      valor_desconto: valor_desconto_num,
      valor_frete: valor_frete_num,
      valor_total,
      forma_pagamento: vendaInfo.forma_pagamento,
      condicao_pagamento: vendaInfo.condicao_pagamento,
      numero_parcelas: numero_parcelas_num,
      valor_parcela,
      endereco_entrega: vendaInfo.endereco_entrega || selectedClient.endereco || '',
      transportadora: vendaInfo.transportadora || '',
      prazo_entrega: vendaInfo.prazo_entrega || '',
      data_entrega_prevista: vendaInfo.data_entrega_prevista || null
    };
    
    console.log("Finalizando venda:", vendaData);
    addSaleMutation.mutate(vendaData);
  }
  
  // Calcular subtotal e total do carrinho
  const cartSubtotal = useMemo(() => {
    return cart.reduce((s, it) => s + it.subtotal, 0);
  }, [cart]);
  
  const cartTotal = useMemo(() => {
    return cartSubtotal - Number(vendaInfo.valor_desconto || 0) + Number(vendaInfo.valor_frete || 0);
  }, [cartSubtotal, vendaInfo.valor_desconto, vendaInfo.valor_frete]);

  // Filtrar vendas por busca
  const filteredVendas = useMemo(() => {
    if (!searchTerm) return vendas;
    const term = searchTerm.toLowerCase();
    return vendas.filter(v => 
      (v.cliente_nome && v.cliente_nome.toLowerCase().includes(term)) ||
      (v.numero_venda && v.numero_venda.toLowerCase().includes(term)) ||
      (v.vendedor && v.vendedor.toLowerCase().includes(term))
    );
  }, [vendas, searchTerm]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    const total = vendas.reduce((sum, v) => sum + (v.valor_total || 0), 0);
    const quantidade = vendas.length;
    const ticketMedio = quantidade > 0 ? total / quantidade : 0;
    
    const clientesMap = {};
    vendas.forEach(v => {
      if (v.cliente_nome) {
        clientesMap[v.cliente_nome] = (clientesMap[v.cliente_nome] || 0) + (v.valor_total || 0);
      }
    });
    
    const melhorCliente = Object.entries(clientesMap).sort((a, b) => b[1] - a[1])[0];
    
    return {
      totalVendido: total,
      quantidadeVendas: quantidade,
      ticketMedio,
      melhorCliente: melhorCliente ? melhorCliente[0] : 'N/A'
    };
  }, [vendas]);

  // Abrir detalhes da venda
  const handleViewDetails = (venda) => {
    setSelectedVenda(venda);
    setIsDetailOpen(true);
  };

  // Labels dos enums
  const canalVendaLabels = {
    loja_fisica: 'Loja Física',
    ecommerce: 'E-commerce',
    whatsapp: 'WhatsApp',
    telefone: 'Telefone',
    outro: 'Outro'
  };

  const formaPagamentoLabels = {
    dinheiro: 'Dinheiro',
    pix: 'PIX',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito: 'Cartão de Débito',
    crediario: 'Crediário',
    outro: 'Outro'
  };

  const statusLabels = {
    em_andamento: 'Em Andamento',
    concluida: 'Concluída',
    cancelada: 'Cancelada'
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-blue-600" />
            Vendas
          </h1>
          <p className="text-slate-600 mt-1">Registre novas vendas e acompanhe o histórico completo</p>
        </div>

        <Tabs defaultValue="nova" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="nova">Nova Venda</TabsTrigger>
            <TabsTrigger value="historico">Histórico de Vendas</TabsTrigger>
          </TabsList>

          <TabsContent value="nova">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                {/* Passo 1: Cliente */}
                <Card className="shadow-lg">
                  <CardHeader><CardTitle>1. Selecione o Cliente</CardTitle></CardHeader>
                  <CardContent>
                    {selectedClient ? (
                      <div className="flex items-center justify-between p-4 bg-blue-50 text-blue-800 rounded-lg">
                        <div className="flex items-center gap-2 font-semibold">
                          <UserCheck className="w-5 h-5" />
                          <span>{selectedClient.name}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)}>
                          Trocar
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Input 
                          placeholder="Buscar cliente por nome..." 
                          value={clientQuery} 
                          onChange={e => setClientQuery(e.target.value)} 
                        />
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {clients.map(c => (
                            <Button 
                              key={c.id}
                              variant="outline" 
                              className="w-full justify-start" 
                              onClick={() => {
                                setSelectedClient(c);
                                setClientQuery('');
                              }}
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              {c.name}
                            </Button>
                          ))}
                          {clients.length === 0 && clientQuery && (
                            <p className="text-center text-sm text-slate-500 py-4">
                              Nenhum cliente encontrado.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Passo 2: Produtos */}
                <Card className="shadow-lg">
                  <CardHeader><CardTitle>2. Adicione Produtos</CardTitle></CardHeader>
                  <CardContent>
                    <form onSubmit={handleBarcodeSearch} className="flex gap-2 mb-4">
                      <Input 
                        placeholder="Escanear ou digitar código de barras..." 
                        value={barcodeSearch} 
                        onChange={e => setBarcodeSearch(e.target.value)} 
                      />
                      <Button type="submit">
                        <Barcode className="w-5 h-5"/>
                      </Button>
                    </form>
                    <p className="text-center text-sm text-slate-500 my-3">OU selecione abaixo</p>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {products.filter(p => p.quantidade_estoque > 0).map(p => (
                        <Button 
                          key={p.id}
                          variant="secondary" 
                          className="w-full justify-between" 
                          onClick={() => addToCart(p, 1)}
                        >
                          <span className="truncate">{p.nome_produto}</span> 
                          <Badge variant="outline">Qtd: {p.quantidade_estoque || 0}</Badge>
                        </Button>
                      ))}
                      {products.filter(p => p.quantidade_estoque > 0).length === 0 && (
                        <p className="text-center text-sm text-slate-500 py-4">
                          Nenhum produto com estoque disponível.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Passo 3: Informações da Venda */}
                <Card className="shadow-lg">
                  <CardHeader><CardTitle>3. Informações da Venda</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Vendedor</Label>
                        <Input 
                          value={vendaInfo.vendedor} 
                          onChange={e => setVendaInfo({...vendaInfo, vendedor: e.target.value})}
                          placeholder={user?.full_name || 'Nome do vendedor'}
                        />
                      </div>
                      <div>
                        <Label>Canal de Venda</Label>
                        <Select value={vendaInfo.canal_venda} onValueChange={v => setVendaInfo({...vendaInfo, canal_venda: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="loja_fisica">Loja Física</SelectItem>
                            <SelectItem value="ecommerce">E-commerce</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="telefone">Telefone</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Observações</Label>
                      <Textarea 
                        value={vendaInfo.observacoes}
                        onChange={e => setVendaInfo({...vendaInfo, observacoes: e.target.value})}
                        placeholder="Observações relevantes sobre a venda..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Passo 4: Pagamento */}
                <Card className="shadow-lg">
                  <CardHeader><CardTitle>4. Dados Financeiros</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Desconto (R$)</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="0"
                          value={vendaInfo.valor_desconto}
                          onChange={e => setVendaInfo({...vendaInfo, valor_desconto: e.target.value})}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>Frete (R$)</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="0"
                          value={vendaInfo.valor_frete}
                          onChange={e => setVendaInfo({...vendaInfo, valor_frete: e.target.value})}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Forma de Pagamento</Label>
                        <Select value={vendaInfo.forma_pagamento} onValueChange={v => setVendaInfo({...vendaInfo, forma_pagamento: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dinheiro">Dinheiro</SelectItem>
                            <SelectItem value="pix">PIX</SelectItem>
                            <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                            <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                            <SelectItem value="crediario">Crediário</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Condição de Pagamento</Label>
                        <Select value={vendaInfo.condicao_pagamento} onValueChange={v => setVendaInfo({...vendaInfo, condicao_pagamento: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="a_vista">À Vista</SelectItem>
                            <SelectItem value="parcelado">Parcelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {vendaInfo.condicao_pagamento === 'parcelado' && (
                      <div>
                        <Label>Número de Parcelas</Label>
                        <Input 
                          type="number"
                          min="2"
                          max="24"
                          value={vendaInfo.numero_parcelas}
                          onChange={e => setVendaInfo({...vendaInfo, numero_parcelas: e.target.value})}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Passo 5: Logística */}
                <Card className="shadow-lg">
                  <CardHeader><CardTitle>5. Dados Logísticos (Opcional)</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Endereço de Entrega</Label>
                      <Input 
                        value={vendaInfo.endereco_entrega}
                        onChange={e => setVendaInfo({...vendaInfo, endereco_entrega: e.target.value})}
                        placeholder={selectedClient?.endereco || "Deixe em branco para usar o endereço do cadastro"}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Transportadora</Label>
                        <Input 
                          value={vendaInfo.transportadora}
                          onChange={e => setVendaInfo({...vendaInfo, transportadora: e.target.value})}
                          placeholder="Nome da transportadora"
                        />
                      </div>
                      <div>
                        <Label>Prazo de Entrega</Label>
                        <Input 
                          value={vendaInfo.prazo_entrega}
                          onChange={e => setVendaInfo({...vendaInfo, prazo_entrega: e.target.value})}
                          placeholder="Ex: 5 dias úteis"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Data Prevista de Entrega</Label>
                      <Input 
                        type="date"
                        value={vendaInfo.data_entrega_prevista}
                        onChange={e => setVendaInfo({...vendaInfo, data_entrega_prevista: e.target.value})}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Carrinho (Sidebar) */}
              <div className="md:col-span-1 space-y-6">
                <Card className="sticky top-8 shadow-lg">
                  <CardHeader><CardTitle>Carrinho</CardTitle></CardHeader>
                  <CardContent>
                    {cart.length > 0 ? (
                      <>
                        <ul className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                          {cart.map((item) => (
                            <li key={item.produto_id} className="border-b pb-3">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <p className="font-semibold text-sm">{item.produto_nome}</p>
                                  <p className="text-xs text-slate-600">R$ {Number(item.valor_unitario || 0).toFixed(2)} / un</p>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6" 
                                  onClick={() => removeFromCart(item.produto_id)}
                                >
                                  <Trash2 className="w-3 h-3"/>
                                </Button>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-7 w-7"
                                    onClick={() => updateCartQuantity(item.produto_id, item.quantidade - 1)}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <span className="w-10 text-center font-semibold">{item.quantidade}</span>
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-7 w-7"
                                    onClick={() => updateCartQuantity(item.produto_id, item.quantidade + 1)}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                                <p className="font-bold text-sm">R$ {item.subtotal.toFixed(2)}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                        
                        <div className="space-y-2 border-t pt-4">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal:</span>
                            <span>R$ {cartSubtotal.toFixed(2)}</span>
                          </div>
                          {Number(vendaInfo.valor_desconto) > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                              <span>Desconto:</span>
                              <span>- R$ {Number(vendaInfo.valor_desconto).toFixed(2)}</span>
                            </div>
                          )}
                          {Number(vendaInfo.valor_frete) > 0 && (
                            <div className="flex justify-between text-sm text-orange-600">
                              <span>Frete:</span>
                              <span>+ R$ {Number(vendaInfo.valor_frete).toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-xl font-bold border-t pt-2">
                            <span>Total:</span>
                            <span>R$ {cartTotal.toFixed(2)}</span>
                          </div>
                          {vendaInfo.condicao_pagamento === 'parcelado' && Number(vendaInfo.numero_parcelas) > 1 && (
                            <p className="text-sm text-slate-600 text-center">
                              {vendaInfo.numero_parcelas}x de R$ {(cartTotal / Number(vendaInfo.numero_parcelas)).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-center text-slate-500 py-8">O carrinho está vazio.</p>
                    )}
                    <Button 
                      className="w-full mt-6" 
                      onClick={handleFinishSale} 
                      disabled={cart.length === 0 || !selectedClient || addSaleMutation.isPending}
                    >
                      {addSaleMutation.isPending ? (
                        <><Loader className="w-4 h-4 mr-2 animate-spin" />Processando...</>
                      ) : (
                        <>Finalizar Venda</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="historico">
            <div className="space-y-6">
              {/* Estatísticas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">Total Vendido</p>
                        <p className="text-2xl font-bold text-green-600">R$ {stats.totalVendido.toFixed(2)}</p>
                      </div>
                      <DollarSign className="w-10 h-10 text-green-600 opacity-20" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">Qtd. Vendas</p>
                        <p className="text-2xl font-bold text-blue-600">{stats.quantidadeVendas}</p>
                      </div>
                      <ShoppingCart className="w-10 h-10 text-blue-600 opacity-20" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">Ticket Médio</p>
                        <p className="text-2xl font-bold text-purple-600">R$ {stats.ticketMedio.toFixed(2)}</p>
                      </div>
                      <TrendingUp className="w-10 h-10 text-purple-600 opacity-20" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">Melhor Cliente</p>
                        <p className="text-lg font-bold text-orange-600 truncate">{stats.melhorCliente}</p>
                      </div>
                      <UsersIcon className="w-10 h-10 text-orange-600 opacity-20" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Lista de Vendas */}
              <Card className="shadow-lg">
                <CardHeader>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <CardTitle>Histórico Completo</CardTitle>
                    <div className="relative w-full md:w-96">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <Input
                        placeholder="Buscar por cliente, número ou vendedor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingVendas ? (
                    <div className="text-center p-8">
                      <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                    </div>
                  ) : filteredVendas.length > 0 ? (
                    <div className="space-y-3">
                      {filteredVendas.map(venda => (
                        <div key={venda.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors shadow-sm">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <p className="font-bold text-lg">{venda.cliente_nome}</p>
                              <Badge variant="outline">#{venda.numero_venda || venda.id.slice(0, 8)}</Badge>
                              {venda.status && (
                                <Badge variant={venda.status === 'concluida' ? 'success' : venda.status === 'cancelada' ? 'destructive' : 'secondary'}>
                                  {statusLabels[venda.status] || venda.status}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                              <span>{format(new Date(venda.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                              <span>•</span>
                              <span>{venda.itens?.length || 0} {venda.itens?.length === 1 ? 'item' : 'itens'}</span>
                              {venda.vendedor && (
                                <>
                                  <span>•</span>
                                  <span>Vendedor: {venda.vendedor}</span>
                                </>
                              )}
                              {venda.canal_venda && (
                                <>
                                  <span>•</span>
                                  <span>{canalVendaLabels[venda.canal_venda] || venda.canal_venda}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-3 md:mt-0">
                            <p className="text-2xl font-bold text-green-600">R$ {(venda.valor_total || 0).toFixed(2)}</p>
                            <Button variant="outline" size="sm" onClick={() => handleViewDetails(venda)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">
                        {searchTerm ? 'Nenhuma venda encontrada para a busca.' : 'Nenhuma venda registrada ainda.'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialog de Detalhes da Venda */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Venda</DialogTitle>
            </DialogHeader>
            {selectedVenda && (
              <div className="space-y-6">
                {/* Dados da Venda */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-slate-900">Dados da Venda</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-slate-600">Número do Pedido</p>
                      <p className="font-semibold">#{selectedVenda.numero_venda || selectedVenda.id.slice(0, 8)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Data e Hora</p>
                      <p className="font-semibold">{format(new Date(selectedVenda.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Cliente</p>
                      <p className="font-semibold">{selectedVenda.cliente_nome}</p>
                    </div>
                    {selectedVenda.vendedor && (
                      <div>
                        <p className="text-sm text-slate-600">Vendedor</p>
                        <p className="font-semibold">{selectedVenda.vendedor}</p>
                      </div>
                    )}
                    {selectedVenda.canal_venda && (
                      <div>
                        <p className="text-sm text-slate-600">Canal de Venda</p>
                        <p className="font-semibold">{canalVendaLabels[selectedVenda.canal_venda] || selectedVenda.canal_venda}</p>
                      </div>
                    )}
                    {selectedVenda.status && (
                      <div>
                        <p className="text-sm text-slate-600">Status</p>
                        <Badge variant={selectedVenda.status === 'concluida' ? 'success' : selectedVenda.status === 'cancelada' ? 'destructive' : 'secondary'}>
                          {statusLabels[selectedVenda.status] || selectedVenda.status}
                        </Badge>
                      </div>
                    )}
                  </div>
                  {selectedVenda.observacoes && (
                    <div className="mt-3 bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-slate-600 mb-1">Observações:</p>
                      <p className="text-sm">{selectedVenda.observacoes}</p>
                    </div>
                  )}
                </div>

                {/* Produtos */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-slate-900">Produtos/Serviços</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="text-left p-3 font-semibold">Item</th>
                          <th className="text-left p-3 font-semibold">Código</th>
                          <th className="text-center p-3 font-semibold">Qtd</th>
                          <th className="text-right p-3 font-semibold">Valor Unit.</th>
                          <th className="text-right p-3 font-semibold">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedVenda.itens?.map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-3">
                              <p className="font-medium">{item.produto_nome}</p>
                              {item.descricao && <p className="text-xs text-slate-600">{item.descricao}</p>}
                              {item.ncm && <p className="text-xs text-slate-500">NCM: {item.ncm}</p>}
                            </td>
                            <td className="p-3 text-slate-600">{item.codigo_item || '-'}</td>
                            <td className="p-3 text-center">{item.quantidade}</td>
                            <td className="p-3 text-right">R$ {(item.valor_unitario || 0).toFixed(2)}</td>
                            <td className="p-3 text-right font-semibold">R$ {(item.subtotal || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Dados Financeiros */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-slate-900">Dados Financeiros</h3>
                  <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Subtotal:</span>
                      <span className="font-semibold">R$ {(selectedVenda.valor_subtotal || selectedVenda.valor_total || 0).toFixed(2)}</span>
                    </div>
                    {selectedVenda.valor_desconto > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Desconto:</span>
                        <span className="font-semibold">- R$ {selectedVenda.valor_desconto.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedVenda.valor_frete > 0 && (
                      <div className="flex justify-between text-orange-600">
                        <span>Frete:</span>
                        <span className="font-semibold">+ R$ {selectedVenda.valor_frete.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span className="text-green-600">R$ {(selectedVenda.valor_total || 0).toFixed(2)}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                      {selectedVenda.forma_pagamento && (
                        <div>
                          <p className="text-sm text-slate-600">Forma de Pagamento</p>
                          <p className="font-semibold">{formaPagamentoLabels[selectedVenda.forma_pagamento] || selectedVenda.forma_pagamento}</p>
                        </div>
                      )}
                      {selectedVenda.condicao_pagamento && (
                        <div>
                          <p className="text-sm text-slate-600">Condição</p>
                          <p className="font-semibold">{selectedVenda.condicao_pagamento === 'a_vista' ? 'À Vista' : 'Parcelado'}</p>
                        </div>
                      )}
                      {selectedVenda.condicao_pagamento === 'parcelado' && (
                        <>
                          <div>
                            <p className="text-sm text-slate-600">Número de Parcelas</p>
                            <p className="font-semibold">{selectedVenda.numero_parcelas}x</p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600">Valor da Parcela</p>
                            <p className="font-semibold">R$ {(selectedVenda.valor_parcela || 0).toFixed(2)}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dados Logísticos */}
                {(selectedVenda.endereco_entrega || selectedVenda.transportadora || selectedVenda.prazo_entrega || selectedVenda.data_entrega_prevista) && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-slate-900">Dados Logísticos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
                      {selectedVenda.endereco_entrega && (
                        <div className="md:col-span-2">
                          <p className="text-sm text-slate-600">Endereço de Entrega</p>
                          <p className="font-semibold">{selectedVenda.endereco_entrega}</p>
                        </div>
                      )}
                      {selectedVenda.transportadora && (
                        <div>
                          <p className="text-sm text-slate-600">Transportadora</p>
                          <p className="font-semibold">{selectedVenda.transportadora}</p>
                        </div>
                      )}
                      {selectedVenda.prazo_entrega && (
                        <div>
                          <p className="text-sm text-slate-600">Prazo de Entrega</p>
                          <p className="font-semibold">{selectedVenda.prazo_entrega}</p>
                        </div>
                      )}
                      {selectedVenda.data_entrega_prevista && (
                        <div>
                          <p className="text-sm text-slate-600">Data Prevista</p>
                          <p className="font-semibold">{format(new Date(selectedVenda.data_entrega_prevista), 'dd/MM/yyyy')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}