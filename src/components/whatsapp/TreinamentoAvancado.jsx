import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, User, BrainCircuit, Loader, Sparkles, Save } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function TreinamentoAvancado() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([
        { 
            sender: 'ai', 
            text: `Olá! Sou sua assistente de treinamento. Vou te fazer algumas perguntas para entender melhor seu negócio e treinar a IA do WhatsApp.

**Vamos começar:**

1. Qual é o nome da sua empresa e o que ela faz?
2. Quais são os principais produtos ou serviços que você oferece?
3. Qual é o horário de funcionamento?
4. Quais são as formas de pagamento aceitas?
5. Há alguma política de troca/devolução?
6. Quais são as perguntas mais frequentes dos seus clientes?

Pode responder livremente. A cada informação, vou sugerir salvá-la na base de conhecimento da IA.` 
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const [lastSuggestion, setLastSuggestion] = useState(null);
    
    const { toast } = useToast();
    const messagesEndRef = useRef(null);
    const queryClient = useQueryClient();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isTyping]);

    const saveKnowledgeMutation = useMutation({
        mutationFn: (data) => base44.entities.WhatsAppKnowledge.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['whatsapp-knowledge'] });
            toast({
                title: "Conhecimento Salvo!",
                description: "A IA aprendeu algo novo sobre seu negócio.",
                variant: "success",
            });
        },
    });

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;

        const userMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput("");
        setIsTyping(true);

        try {
            const prompt = `Você é um assistente especializado em treinar IAs de atendimento ao cliente para WhatsApp.

**Contexto:** O usuário está te contando sobre o negócio dele para treinar a IA do WhatsApp.

**Mensagem do usuário:** "${currentInput}"

**Sua missão:**
1. Agradeça pela informação compartilhada.
2. Analise o que o usuário disse e identifique conhecimentos úteis que podem ser salvos na base de dados da IA.
3. Sugira de 1 a 3 pares de "Pergunta/Resposta" que devem ser adicionados à base de conhecimento, com base no que o usuário disse.
4. Para cada sugestão, formate assim:
   
   **SUGESTÃO DE CONHECIMENTO #N:**
   - **Pergunta:** [pergunta que um cliente faria]
   - **Resposta:** [resposta baseada no que o usuário informou]
   - **Categoria:** [categoria apropriada: Empresa, Produtos, Horários, Pagamentos, Políticas, etc.]

5. Faça uma nova pergunta relevante para continuar o treinamento (algo que ainda não foi mencionado).

Seja direto e focado. Use markdown para formatar.`;

            const responseText = await base44.integrations.Core.InvokeLLM({ 
                prompt,
                add_context_from_internet: false 
            });
            
            // Extrair sugestões do texto
            const suggestions = extractSuggestions(responseText);
            setLastSuggestion(suggestions);

            const aiResponse = {
                sender: 'ai',
                text: responseText,
                hasSuggestions: suggestions.length > 0
            };

            setMessages(prev => [...prev, aiResponse]);

        } catch (error) {
            console.error("Erro ao processar treinamento:", error);
            const errorResponse = {
                sender: 'ai',
                text: "Desculpe, tive um problema ao processar sua resposta. Por favor, tente novamente."
            };
            setMessages(prev => [...prev, errorResponse]);
            toast({
                title: "Erro de Processamento",
                description: "Não foi possível processar sua mensagem.",
                variant: "destructive",
            });
        } finally {
            setIsTyping(false);
        }
    };

    const extractSuggestions = (text) => {
        const suggestions = [];
        const regex = /\*\*SUGESTÃO DE CONHECIMENTO #\d+:\*\*\s*\n\s*-\s*\*\*Pergunta:\*\*\s*(.+?)\n\s*-\s*\*\*Resposta:\*\*\s*(.+?)\n\s*-\s*\*\*Categoria:\*\*\s*(.+?)(?=\n\n|\*\*SUGESTÃO|$)/gs;
        
        let match;
        while ((match = regex.exec(text)) !== null) {
            suggestions.push({
                pergunta: match[1].trim(),
                resposta: match[2].trim(),
                categoria: match[3].trim()
            });
        }
        
        return suggestions;
    };

    const handleSaveSuggestion = (suggestion) => {
        saveKnowledgeMutation.mutate({
            pergunta: suggestion.pergunta,
            resposta: suggestion.resposta,
            categoria: suggestion.categoria,
            ativo: true
        });
    };

    const handleSaveAllSuggestions = () => {
        if (!lastSuggestion || lastSuggestion.length === 0) return;
        lastSuggestion.forEach(suggestion => {
            saveKnowledgeMutation.mutate({
                pergunta: suggestion.pergunta,
                resposta: suggestion.resposta,
                categoria: suggestion.categoria,
                ativo: true
            });
        });
        setLastSuggestion([]);
    };

    return (
        <Card className="shadow-lg h-[calc(100vh-280px)] flex flex-col">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <BrainCircuit className="w-8 h-8 text-purple-600"/>
                        <div>
                            <CardTitle className="text-xl text-slate-900">Treinamento Avançado da IA</CardTitle>
                            <p className="text-sm text-slate-600 mt-1">Ensine a IA sobre seu negócio através de uma conversa</p>
                        </div>
                    </div>
                    {lastSuggestion && lastSuggestion.length > 0 && (
                        <Button 
                            onClick={handleSaveAllSuggestions}
                            disabled={saveKnowledgeMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Salvar Todas ({lastSuggestion.length})
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 p-4 bg-gradient-to-br from-purple-50 to-blue-50">
                    <div className="space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex items-start gap-2 ${msg.sender === 'ai' ? 'justify-start' : 'justify-end'}`}>
                                {msg.sender === 'ai' && (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white flex items-center justify-center flex-shrink-0 mt-1">
                                        <Sparkles size={18} />
                                    </div>
                                )}
                                <div className={`max-w-2xl p-4 rounded-lg prose prose-sm prose-slate dark:prose-invert ${msg.sender === 'ai' ? 'bg-white shadow-sm' : 'bg-purple-600 text-white'}`}>
                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                                    
                                    {/* Botões para salvar sugestões individuais */}
                                    {msg.sender === 'ai' && msg.hasSuggestions && lastSuggestion && lastSuggestion.length > 0 && (
                                        <div className="mt-4 space-y-2 not-prose">
                                            <p className="text-sm font-semibold text-slate-700">Ações Rápidas:</p>
                                            {lastSuggestion.map((suggestion, idx) => (
                                                <Button
                                                    key={idx}
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleSaveSuggestion(suggestion)}
                                                    disabled={saveKnowledgeMutation.isPending}
                                                    className="w-full justify-start text-left"
                                                >
                                                    <Save className="w-3 h-3 mr-2 flex-shrink-0" />
                                                    <span className="truncate">Salvar Sugestão #{idx + 1}</span>
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {msg.sender === 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 mt-1">
                                        <User size={18} />
                                    </div>
                                )}
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex items-start gap-2 justify-start">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white flex items-center justify-center flex-shrink-0 mt-1">
                                    <Sparkles size={18} />
                                </div>
                                <div className="max-w-lg p-4 rounded-lg bg-white shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <Loader className="w-4 h-4 animate-spin text-purple-500"/>
                                        <p className="text-sm text-slate-600">Analisando e preparando sugestões...</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>
                <div className="p-4 border-t bg-white">
                    <form onSubmit={handleSend} className="flex items-center gap-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Digite as informações sobre seu negócio..."
                            autoComplete="off"
                            disabled={isTyping}
                            className="flex-1"
                        />
                        <Button type="submit" disabled={isTyping || !input.trim()} className="bg-purple-600 hover:bg-purple-700">
                            <Send className="w-4 h-4"/>
                        </Button>
                    </form>
                    <p className="text-xs text-slate-500 mt-2 text-center">
                        💡 Dica: Seja detalhado nas respostas para um treinamento mais eficaz
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}