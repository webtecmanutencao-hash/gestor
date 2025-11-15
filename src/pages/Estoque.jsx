
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Edit, Loader, Download, TrendingUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ImportarDadosDialog from '../components/shared/ImportarDadosDialog';

const produtoSchema = {
    type: "object",
    properties: {
        produtos: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    nome_produto: { type: "string" },
                    sku: { type: "string" },
                    codigo_barras: { type: "string" },
                    preco_custo: { type: "number" },
                    preco_venda: { type: "number" },
                    quantidade_estoque: { type: "number" }
                },
                required: ["nome_produto", "preco_venda"]
            }
        }
    }
};

const produtoInstructions = {
    description: "Crie um arquivo CSV com os dados dos seus produtos. A primeira linha deve ser o cabeçalho. As colunas podem estar em qualquer ordem.",
    csvHeaders: "nome_produto,sku,codigo_barras,preco_custo,preco_venda,quantidade_estoque"
};

export default function Estoque() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({ 
    nome_produto: '', 
    sku: '', 
    codigo_barras: '', 
    preco_custo: '',
    preco_venda: '', 
    quantidade_estoque: '',
    estoque_minimo: '5' // Added default for estoque_minimo
  });
  const [query, setQuery] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.list('-created_date'),
    initialData: []
  });

  const createProductMutation = useMutation({
    mutationFn: (newProduct) => base44.entities.Produto.create(newProduct),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      queryClient.invalidateQueries({ queryKey: ['produtosParaVenda'] });
      toast({
        title: "Sucesso!",
        description: `Produto "${form.nome_produto}" adicionado.`,
        variant: "success",
      });
      setForm({ nome_produto: '', sku: '', codigo_barras: '', preco_custo: '', preco_venda: '', quantidade_estoque: '', estoque_minimo: '5' });
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" })
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Produto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      queryClient.invalidateQueries({ queryKey: ['produtosParaVenda'] });
    },
    onError: (error) => toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" })
  });
  
  function handleAdd(e) {
    e.preventDefault();
    if (!form.nome_produto || !form.preco_venda) {
        toast({ title: "Campos obrigatórios", description: "Nome e Preço de Venda são obrigatórios.", variant: "warning" });
        return;
    }
    
    const productData = { 
        ...form, 
        preco_custo: form.preco_custo ? Number(form.preco_custo) : null,
        preco_venda: form.preco_venda ? Number(form.preco_venda) : 0,
        quantidade_estoque: form.quantidade_estoque ? Number(form.quantidade_estoque) : 0,
        estoque_minimo: form.estoque_minimo ? Number(form.estoque_minimo) : 5, // Added
    };
    createProductMutation.mutate(productData);
  }

  function handleIncrementStock(product) {
      const currentStock = Number(product.quantidade_estoque || 0);
      updateProductMutation.mutate({ id: product.id, data: { quantidade_estoque: currentStock + 1 } });
  }

  const calcularMargem = (custo, venda) => {
    if (!custo || !venda || custo === 0) return null;
    const margem = ((venda - custo) / custo) * 100;
    const lucro = venda - custo;
    return { margem, lucro };
  };

  const results = products.filter(p => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (p.nome_produto && p.nome_produto.toLowerCase().includes(q)) ||
           (p.sku && p.sku.toLowerCase().includes(q)) ||
           (p.codigo_barras && p.codigo_barras.toString().includes(q));
  });

  const margemPreview = calcularMargem(Number(form.preco_custo), Number(form.preco_venda));

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            Estoque ({products.length})
          </h1>
          <Button onClick={() => setIsImportOpen(true)} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Importar Produtos
          </Button>
        </div>

      <Card className="mb-8">
        <CardHeader><CardTitle>Adicionar Novo Produto</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="prodNomeProduto">Nome do Produto *</Label>
                <Input 
                  id="prodNomeProduto" 
                  placeholder="Ex: Camiseta Branca" 
                  value={form.nome_produto} 
                  onChange={e => setForm({ ...form, nome_produto: e.target.value })} 
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prodSku">SKU</Label>
                <Input 
                  id="prodSku" 
                  placeholder="SKU-123" 
                  value={form.sku} 
                  onChange={e => setForm({ ...form, sku: e.target.value })} 
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prodCodigoBarras">Cód. Barras</Label>
                <Input 
                  id="prodCodigoBarras" 
                  placeholder="789..." 
                  value={form.codigo_barras} 
                  onChange={e => setForm({ ...form, codigo_barras: e.target.value })} 
                />
              </div>
            </div>

            <div className="grid md:grid-cols-5 gap-4"> {/* Changed to md:grid-cols-5 */}
              <div className="space-y-1">
                <Label htmlFor="prodPrecoCusto">Valor Pago (Custo) (R$)</Label>
                <Input 
                  id="prodPrecoCusto" 
                  type="number" 
                  step="0.01"
                  placeholder="0.00" 
                  value={form.preco_custo} 
                  onChange={e => setForm({ ...form, preco_custo: e.target.value })} 
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prodPrecoVenda">Preço de Venda (R$) *</Label>
                <Input 
                  id="prodPrecoVenda" 
                  type="number" 
                  step="0.01"
                  placeholder="0.00" 
                  value={form.preco_venda} 
                  onChange={e => setForm({ ...form, preco_venda: e.target.value })} 
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prodQtd">Quantidade em Estoque</Label>
                <Input 
                  id="prodQtd" 
                  type="number" 
                  placeholder="0" 
                  value={form.quantidade_estoque} 
                  onChange={e => setForm({ ...form, quantidade_estoque: e.target.value })} 
                />
              </div>
              <div className="space-y-1"> {/* Added new input for estoque_minimo */}
                <Label htmlFor="prodEstoqueMin">Estoque Mínimo</Label>
                <Input 
                  id="prodEstoqueMin" 
                  type="number" 
                  placeholder="5" 
                  value={form.estoque_minimo} 
                  onChange={e => setForm({ ...form, estoque_minimo: e.target.value })} 
                />
              </div>
              <div className="space-y-1">
                <Label>Margem de Lucro</Label>
                {margemPreview ? (
                  <div className="h-10 flex items-center">
                    <Badge 
                      className={
                        margemPreview.margem >= 30 ? "bg-green-100 text-green-800" :
                        margemPreview.margem >= 10 ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }
                    >
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {margemPreview.margem.toFixed(1)}% (R$ {margemPreview.lucro.toFixed(2)})
                    </Badge>
                  </div>
                ) : (
                  <p className="h-10 flex items-center text-sm text-slate-400">-</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={createProductMutation.isPending}>
                {createProductMutation.isPending ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} 
                Adicionar Produto
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
           <Input 
             placeholder="Buscar por nome, SKU ou cód. de barras..." 
             value={query} 
             onChange={e => setQuery(e.target.value)} 
             className="mt-4" 
           />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center p-4"><Loader className="w-6 h-6 animate-spin mx-auto"/></div>
          ) : (
            <ul className="space-y-3">
              {results.map(p => {
                const info = calcularMargem(p.preco_custo, p.preco_venda);
                return (
                  <li key={p.id} className="p-3 bg-slate-50 rounded-lg flex flex-col sm:flex-row justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-bold">{p.nome_produto}</p>
                      <p className="text-sm text-slate-600">
                        SKU: {p.sku || 'N/A'} | Cód. Barras: {p.codigo_barras || 'N/A'}
                      </p>
                      {p.preco_custo && (
                        <p className="text-sm text-slate-600 mt-1">
                          Custo: R$ {Number(p.preco_custo).toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 self-end sm:self-center items-end">
                      <div className="flex items-center gap-4">
                        <p className="font-semibold">Qtd: <span className="text-blue-600">{p.quantidade_estoque || 0}</span></p>
                        <p className="font-semibold">Venda: <span className="text-emerald-600">R$ {Number(p.preco_venda || 0).toFixed(2)}</span></p>
                        <Button variant="outline" size="sm" onClick={() => handleIncrementStock(p)}>+1</Button>
                      </div>
                      {info && (
                        <Badge 
                          className={
                            info.margem >= 30 ? "bg-green-100 text-green-800" :
                            info.margem >= 10 ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                          }
                        >
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Margem: {info.margem.toFixed(1)}% (Lucro: R$ {info.lucro.toFixed(2)})
                        </Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>

    <ImportarDadosDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        entityName="Produto"
        jsonSchema={produtoSchema}
        instructions={produtoInstructions}
        onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['produtos'] });
            queryClient.invalidateQueries({ queryKey: ['produtosParaVenda'] });
            toast({
                title: "Sucesso!",
                description: "Produtos importados com sucesso.",
                variant: "success",
            });
        }}
        onError={(error) => {
            toast({
                title: "Erro na importação",
                description: error.message || "Ocorreu um erro ao importar os produtos.",
                variant: "destructive",
            });
        }}
    />

  </div>
  );
}
