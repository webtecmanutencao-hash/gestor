import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, DollarSign, ShoppingCart, Trophy, TrendingDown, BarChart, Star, Package, Loader, Clock } from 'lucide-react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { startOfMonth } from 'date-fns';

const StatCard = ({ title, value, icon: Icon, description, color = 'text-blue-600' }) => (
  <Card className="shadow-lg hover:shadow-xl transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={`h-5 w-5 ${color}`} />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </CardContent>
  </Card>
);

export default function AdminDashboardTab() {
  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['allUsersAdmin'],
    queryFn: () => base44.entities.User.list('-created_date', 1000),
    initialData: []
  });

  const { data: allVendas = [], isLoading: isLoadingVendas } = useQuery({
    queryKey: ["allVendasAdmin"],
    queryFn: () => base44.entities.Venda.list('-created_date', 1000),
    initialData: []
  });
  
  const { data: allClientes = [], isLoading: isLoadingClientes } = useQuery({
    queryKey: ["adminDashboardClients"],
    queryFn: () => base44.entities.Cliente.list('-created_date', 1000),
    initialData: []
  });

  const { data: allProducts = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["allProductsAdmin"],
    queryFn: () => base44.entities.Produto.list('-created_date', 1000),
    initialData: []
  });

  const { data: allPayments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['allPaymentsAdmin'],
    queryFn: () => base44.entities.Pagamento.list('-created_date', 1000),
    initialData: []
  });

  const isLoading = isLoadingUsers || isLoadingVendas || isLoadingClientes || isLoadingProducts || isLoadingPayments;

  const stats = useMemo(() => {
    if (isLoading) return null;

    const totalClients = allClientes.length;
    
    const adminRevenue = allPayments
      .filter(p => p.status === 'aprovado')
      .reduce((sum, p) => sum + (p.valor || 0), 0);
    
    const clientGmv = allVendas.reduce((sum, v) => sum + (v.valor_total || 0), 0);

    const startOfCurrentMonth = startOfMonth(new Date());
    const monthlySales = allVendas.filter(sale => {
      const saleDate = new Date(sale.created_date);
      return saleDate >= startOfCurrentMonth;
    });

    const productSales = monthlySales.reduce((acc, sale) => {
      sale.itens?.forEach(item => {
        const productName = item.produto_nome;
        if (!acc[productName]) {
          acc[productName] = { name: productName, quantity: 0, totalValue: 0 };
        }
        acc[productName].quantity += item.quantidade;
        acc[productName].totalValue += item.subtotal;
      });
      return acc;
    }, {});

    const topMonthlyProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const salesByClient = allClientes.reduce((acc, client) => {
      acc[client.id] = {
        name: client.name || `Cliente ${client.id}`,
        total: 0,
        salesCount: 0
      };
      return acc;
    }, {});

    allVendas.forEach(venda => {
      const clientId = venda.cliente_id;
      if (salesByClient[clientId]) {
        salesByClient[clientId].total += venda.valor_total || 0;
        salesByClient[clientId].salesCount += 1;
      }
    });
    
    const allClientsRanked = Object.values(salesByClient).sort((a, b) => b.total - a.total);
    const clientRankingChart = allClientsRanked.slice(0, 10);
    const topPerformers = allClientsRanked.slice(0, 5);
    const bottomPerformers = allClientsRanked.slice(-5).reverse();

    const usuariosAtivos = allUsers.filter(u => u.status === 'ativo' || !u.status).length;
    const usuariosInativos = allUsers.filter(u => u.status === 'inativo').length;
    const contasDemo = allUsers.filter(u => u.is_demo_account).length;
    const pagamentosPendentes = allPayments.filter(p => p.status === 'aguardando_verificacao').length;

    return { 
      totalClients, 
      adminRevenue, 
      clientGmv, 
      clientRankingChart, 
      topPerformers, 
      bottomPerformers, 
      topMonthlyProducts,
      usuariosAtivos,
      usuariosInativos,
      contasDemo,
      pagamentosPendentes,
      totalVendas: allVendas.length,
      totalProdutos: allProducts.length
    };
  }, [allUsers, allPayments, allVendas, allClientes, allProducts, isLoading]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-slate-500">Carregando dados do dashboard...</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const userStatusData = [
    { name: 'Ativos', value: stats.usuariosAtivos, color: '#10b981' },
    { name: 'Inativos', value: stats.usuariosInativos, color: '#ef4444' },
    { name: 'Demo', value: stats.contasDemo, color: '#f59e0b' }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Faturamento (Mensalidades)"
          value={`R$ ${stats.adminRevenue.toFixed(2)}`}
          description="Total recebido de todos os clientes"
          icon={DollarSign}
          color="text-green-600"
        />
        <StatCard
          title="Clientes Cadastrados"
          value={stats.totalClients}
          description={`${stats.usuariosAtivos} ativos, ${stats.usuariosInativos} inativos`}
          icon={Users}
          color="text-blue-600"
        />
        <StatCard
          title="GMV da Plataforma"
          value={`R$ ${stats.clientGmv.toFixed(2)}`}
          description="Volume total de vendas dos clientes"
          icon={ShoppingCart}
          color="text-purple-600"
        />
        <StatCard
          title="Pendências"
          value={stats.pagamentosPendentes}
          description="Pagamentos aguardando verificação"
          icon={Clock}
          color="text-orange-600"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total de Vendas"
          value={stats.totalVendas}
          description="Vendas realizadas na plataforma"
          icon={TrendingDown}
          color="text-indigo-600"
        />
        <StatCard
          title="Produtos Cadastrados"
          value={stats.totalProdutos}
          description="Total de produtos na plataforma"
          icon={Package}
          color="text-cyan-600"
        />
        <StatCard
          title="Contas Demo"
          value={stats.contasDemo}
          description="Contas de demonstração ativas"
          icon={Star}
          color="text-amber-600"
        />
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="text-blue-500" /> 
            Status dos Usuários
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={userStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {userStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="text-blue-500" /> 
            Desempenho dos Clientes
          </CardTitle>
          <CardDescription className="text-slate-600">
            Visão geral do volume de vendas dos seus principais clientes e pontos de atenção.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-green-600">
                <Trophy /> Top 5 Clientes (Mais Vendas)
              </h3>
              <div className="space-y-3">
                {stats.topPerformers.map((client, index) => (
                  <div key={index} className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="font-bold text-lg text-green-500 w-8 text-center">{index + 1}</span>
                    <div className="flex-1 ml-2">
                      <p className="font-semibold text-slate-800">{client.name}</p>
                      <p className="text-xs text-slate-500">{client.salesCount} vendas</p>
                    </div>
                    <p className="text-md font-bold text-green-700">R$ {client.total.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-red-600">
                <TrendingDown /> Clientes com Baixo Desempenho
              </h3>
              <div className="space-y-3">
                {stats.bottomPerformers.map((client, index) => (
                  <div key={index} className="flex items-center p-3 bg-red-50 rounded-lg border border-red-200">
                    <span className="font-bold text-lg text-red-500 w-8 text-center">{stats.totalClients - index}</span>
                    <div className="flex-1 ml-2">
                      <p className="font-semibold text-slate-800">{client.name}</p>
                      <p className="text-xs text-slate-500">{client.salesCount} vendas</p>
                    </div>
                    <p className="text-md font-bold text-red-700">R$ {client.total.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <h3 className="font-semibold text-lg mb-4 text-center">Gráfico Top 10 Clientes</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsBarChart data={stats.clientRankingChart}>
              <XAxis 
                dataKey="name" 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                angle={-45} 
                textAnchor="end" 
                interval={0} 
                height={80}
              />
              <YAxis 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `R$${(value/1000).toFixed(1)}k`} 
              />
              <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="total" fill="#1d4ed8" name="Total de Vendas" radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="text-yellow-400" /> 
              Produtos Mais Vendidos na Plataforma (Mês Atual)
            </CardTitle>
            <CardDescription className="text-slate-600">
              Ranking dos produtos mais vendidos por todos os seus clientes neste mês.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {stats.topMonthlyProducts.length > 0 ? (
                <div className="space-y-3">
                    {stats.topMonthlyProducts.map((product, index) => (
                        <div key={index} className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <span className="font-bold text-lg text-blue-500 w-8 text-center">#{index + 1}</span>
                            <div className="flex-1 ml-2">
                                <p className="font-semibold text-slate-800">{product.name}</p>
                                <p className="text-xs text-slate-500">
                                    Total de <span className="font-bold">{product.quantity}</span> unidades vendidas
                                </p>
                            </div>
                            <p className="text-md font-bold text-emerald-700">R$ {product.totalValue.toFixed(2)}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">Nenhuma venda registrada na plataforma este mês.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}