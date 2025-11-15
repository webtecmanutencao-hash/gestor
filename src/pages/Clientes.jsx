import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Edit, Save, Loader, Download, Search, UserCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import ImportarDadosDialog from '../components/shared/ImportarDadosDialog';

const clienteSchema = {
    type: "object",
    properties: {
        clientes: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    email: { type: "string" },
                    phone: { type: "string" },
                    cpf_cnpj: { type: "string" },
                    endereco: { type: "string" },
                    limite_crediario: { type: "number" },
                    data_nascimento: { type: "string", format: "date" },
                    observacoes: { type: "string" }
                },
                required: ["name"]
            }
        }
    }
};

const clienteInstructions = {
    description: "Crie um arquivo CSV com os dados dos seus clientes. A primeira linha deve ser o cabeçalho. As colunas podem estar em qualquer ordem, desde que os nomes correspondam.",
    csvHeaders: "name,email,phone,cpf_cnpj,endereco,limite_crediario,data_nascimento,observacoes"
};

export default function Clientes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Estados do formulário
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    cpf_cnpj: '', 
    endereco: '', 
    limite_crediario: '', 
    data_nascimento: '',
    observacoes: '',
    status: 'ativo'
  });

  // Estados de controle
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Busca todos os clientes ordenados por data de criação
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('-created_date'),
    initialData: []
  });

  // Filtragem local dos clientes
  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    
    const term = searchTerm.toLowerCase();
    return clients.filter(c => 
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.cpf_cnpj && c.cpf_cnpj.toLowerCase().includes(term))
    );
  }, [clients, searchTerm]);

  // Mutation para criar cliente
  const createClientMutation = useMutation({
    mutationFn: (newClient) => base44.entities.Cliente.create(newClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['allClientes'] });
      queryClient.invalidateQueries({ queryKey: ['clientesParaVenda'] });
      toast({
        title: "Sucesso!",
        description: `Cliente "${form.name}" adicionado com sucesso.`,
        variant: "success",
      });
      // Limpar formulário
      setForm({ 
        name: '', 
        email: '', 
        phone: '', 
        cpf_cnpj: '', 
        endereco: '', 
        limite_crediario: '', 
        data_nascimento: '',
        observacoes: '',
        status: 'ativo'
      });
    },
    onError: (error) => {
      console.error("Erro ao criar cliente:", error);
      toast({ 
        title: "Erro ao adicionar cliente", 
        description: error.message || "Ocorreu um erro. Tente novamente.", 
        variant: "destructive" 
      });
    }
  });

  // Mutation para atualizar cliente
  const updateClientMutation = useMutation({
    mutationFn: (updatedClient) => base44.entities.Cliente.update(updatedClient.id, updatedClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['allClientes'] });
      queryClient.invalidateQueries({ queryKey: ['clientesParaVenda'] });
      toast({ 
        title: "Sucesso!", 
        description: "Cliente atualizado com sucesso.", 
        variant: "success" 
      });
      setIsEditModalOpen(false);
      setEditingClient(null);
    },
    onError: (error) => toast({ 
      title: "Erro", 
      description: error.message, 
      variant: "destructive" 
    })
  });

  // Handler para adicionar cliente
  function handleAdd(e) {
    e.preventDefault();
    
    // Validação do nome
    if (!form.name || form.name.trim() === '') {
      toast({
        title: "Campo obrigatório",
        description: "O nome do cliente é obrigatório.",
        variant: "destructive",
      });
      return;
    }
    
    // Preparar dados do cliente
    const clientData = { 
        name: form.name.trim(),
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
        cpf_cnpj: form.cpf_cnpj?.trim() || null,
        endereco: form.endereco?.trim() || null,
        limite_crediario: form.limite_crediario ? Number(form.limite_crediario) : null,
        data_nascimento: form.data_nascimento || null,
        observacoes: form.observacoes?.trim() || null,
        status: form.status || 'ativo'
    };
    
    console.log("Enviando cliente:", clientData);
    createClientMutation.mutate(clientData);
  }

  // Handler para abrir modal de edição
  const handleOpenEditModal = (client) => {
    const formattedClient = {
        ...client,
        limite_crediario: client.limite_crediario || '',
        data_nascimento: client.data_nascimento ? new Date(client.data_nascimento).toISOString().split('T')[0] : '',
        observacoes: client.observacoes || '',
        status: client.status || 'ativo'
    };
    setEditingClient({ ...formattedClient });
    setIsEditModalOpen(true);
  };

  // Handler para atualizar cliente
  const handleUpdateClient = (e) => {
    e.preventDefault();
    if (!editingClient || !editingClient.name || editingClient.name.trim() === '') {
        toast({ 
          title: "Erro", 
          description: "O nome do cliente não pode ficar em branco.", 
          variant: "destructive" 
        });
        return;
    }
    const clientData = { 
        ...editingClient, 
        name: editingClient.name.trim(),
        email: editingClient.email?.trim() || null,
        phone: editingClient.phone?.trim() || null,
        cpf_cnpj: editingClient.cpf_cnpj?.trim() || null,
        endereco: editingClient.endereco?.trim() || null,
        limite_crediario: editingClient.limite_crediario ? Number(editingClient.limite_crediario) : null,
        observacoes: editingClient.observacoes?.trim() || null
    };
    updateClientMutation.mutate(clientData);
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Clientes ({clients.length})
          </h1>
          <Button onClick={() => setIsImportOpen(true)} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Importar Clientes
          </Button>
        </div>

        {/* Formulário de Cadastro */}
        <Card className="mb-8 shadow-lg">
          <CardHeader><CardTitle>Adicionar Novo Cliente</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input 
                    id="name" 
                    placeholder="Nome do cliente" 
                    value={form.name} 
                    onChange={e => setForm({ ...form, name: e.target.value })} 
                    required
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="cpf_cnpj">CPF / CNPJ</Label>
                  <Input 
                    id="cpf_cnpj" 
                    placeholder="000.000.000-00 ou 00.000.000/0000-00" 
                    value={form.cpf_cnpj} 
                    onChange={e => setForm({ ...form, cpf_cnpj: e.target.value })} 
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                  <Input 
                    id="data_nascimento" 
                    type="date" 
                    value={form.data_nascimento} 
                    onChange={e => setForm({ ...form, data_nascimento: e.target.value })} 
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="email@cliente.com" 
                    value={form.email} 
                    onChange={e => setForm({ ...form, email: e.target.value })} 
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input 
                    id="phone" 
                    placeholder="(00) 00000-0000" 
                    value={form.phone} 
                    onChange={e => setForm({ ...form, phone: e.target.value })} 
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="limite_crediario">Limite de Crediário (R$)</Label>
                  <Input 
                    id="limite_crediario" 
                    type="number" 
                    step="0.01"
                    placeholder="0.00" 
                    value={form.limite_crediario} 
                    onChange={e => setForm({ ...form, limite_crediario: e.target.value })} 
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="endereco">Endereço Completo</Label>
                  <Input 
                    id="endereco" 
                    placeholder="Rua, Número, Bairro, Cidade - Estado" 
                    value={form.endereco} 
                    onChange={e => setForm({ ...form, endereco: e.target.value })} 
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="status">Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea 
                  id="observacoes" 
                  placeholder="Observações sobre o cliente..." 
                  value={form.observacoes}
                  onChange={e => setForm({ ...form, observacoes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" className="w-full md:w-auto" disabled={createClientMutation.isPending}>
                  {createClientMutation.isPending ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Adicionar Cliente
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        
        {/* Lista de Clientes */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Lista de Clientes</CardTitle>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Buscar por nome, email, telefone ou CPF/CNPJ..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center p-4">
                <Loader className="w-6 h-6 animate-spin mx-auto"/>
              </div>
            ) : filteredClients.length > 0 ? (
              <ul className="space-y-3">
                {filteredClients.map(c => (
                  <li key={c.id} className="p-4 bg-slate-50 rounded-lg flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-lg">{c.name}</p>
                        {c.status === 'inativo' && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Inativo</span>}
                      </div>
                      <div className="text-sm text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                        {c.cpf_cnpj && <span>CPF/CNPJ: {c.cpf_cnpj}</span>}
                        {c.data_nascimento && <span>Nasc.: {new Date(c.data_nascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>}
                        {c.email && <span>Email: {c.email}</span>}
                        {c.phone && <span>Tel: {c.phone}</span>}
                        {c.endereco && <span>End: {c.endereco}</span>}
                        {c.limite_crediario !== null && c.limite_crediario !== undefined && <span>Limite: R$ {Number(c.limite_crediario).toFixed(2).replace('.', ',')}</span>}
                      </div>
                      {c.observacoes && (
                        <p className="text-sm text-slate-500 mt-2 italic">Obs: {c.observacoes}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(c)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center p-8">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">
                  {searchTerm ? 'Nenhum cliente encontrado com esse critério de busca.' : 'Nenhum cliente cadastrado ainda.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Edição */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Faça as alterações nas informações do cliente aqui. Clique em salvar para aplicar.
            </DialogDescription>
          </DialogHeader>
          {editingClient && (
            <form onSubmit={handleUpdateClient} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="edit-name">Nome Completo *</Label>
                  <Input
                    id="edit-name"
                    value={editingClient.name || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-cpf_cnpj">CPF/CNPJ</Label>
                  <Input
                    id="edit-cpf_cnpj"
                    value={editingClient.cpf_cnpj || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, cpf_cnpj: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-data_nascimento">Data de Nascimento</Label>
                  <Input
                    id="edit-data_nascimento"
                    type="date"
                    value={editingClient.data_nascimento || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, data_nascimento: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingClient.email || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-phone">Telefone</Label>
                  <Input
                    id="edit-phone"
                    value={editingClient.phone || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <Label htmlFor="edit-endereco">Endereço Completo</Label>
                  <Input
                    id="edit-endereco"
                    value={editingClient.endereco || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, endereco: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-limite_crediario">Limite de Crediário (R$)</Label>
                  <Input
                    id="edit-limite_crediario"
                    type="number"
                    step="0.01"
                    value={editingClient.limite_crediario || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, limite_crediario: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select 
                    value={editingClient.status || 'ativo'} 
                    onValueChange={v => setEditingClient({ ...editingClient, status: v })}
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-1">
                  <Label htmlFor="edit-observacoes">Observações</Label>
                  <Textarea
                    id="edit-observacoes"
                    value={editingClient.observacoes || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, observacoes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateClientMutation.isPending}>
                  {updateClientMutation.isPending ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Importação */}
      <ImportarDadosDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        entityName="Cliente"
        jsonSchema={clienteSchema}
        instructions={clienteInstructions}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['clientes'] });
          queryClient.invalidateQueries({ queryKey: ['allClientes'] });
          toast({
            title: "Sucesso!",
            description: "Clientes importados com sucesso.",
            variant: "success",
          });
        }}
        onError={(error) => {
          toast({
            title: "Erro na Importação",
            description: error.message,
            variant: "destructive",
          });
        }}
      />
    </div>
  );
}