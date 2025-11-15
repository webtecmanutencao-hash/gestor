import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { FileUp, Loader, AlertCircle, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ImportarDadosDialog({ open, onOpenChange, entityName, jsonSchema, instructions, onSuccess }) {
    const [file, setFile] = useState(null);
    const [error, setError] = useState(null);
    const { toast } = useToast();

    const importMutation = useMutation({
        mutationFn: async (fileToUpload) => {
            setError(null);
            // Passo 1: Fazer upload do arquivo
            const uploadResult = await base44.integrations.Core.UploadFile({ file: fileToUpload });
            if (!uploadResult.file_url) {
                throw new Error("Falha no upload do arquivo.");
            }

            // Passo 2: Extrair dados do arquivo
            const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
                file_url: uploadResult.file_url,
                json_schema: jsonSchema,
            });

            if (extractionResult.status !== 'success' || !extractionResult.output) {
                throw new Error(extractionResult.details || `Não foi possível extrair dados do arquivo. Verifique o formato e as colunas.`);
            }
            
            const dataToImport = extractionResult.output[Object.keys(extractionResult.output)[0]];
            
            if(!Array.isArray(dataToImport) || dataToImport.length === 0){
                throw new Error("Nenhum dado válido encontrado no arquivo para importar.");
            }

            // Passo 3: Inserir dados em massa no banco de dados
            await base44.entities[entityName].bulkCreate(dataToImport);
            
            return dataToImport.length;
        },
        onSuccess: (importedCount) => {
            toast({
                title: "Importação Concluída!",
                description: `${importedCount} registros de ${entityName.toLowerCase()} foram importados com sucesso.`,
                variant: "success",
            });
            onSuccess();
            onOpenChange(false);
            setFile(null);
        },
        onError: (err) => {
            setError(err.message);
            toast({
                title: "Erro na Importação",
                description: err.message,
                variant: "destructive",
            });
        }
    });

    const handleImport = () => {
        if (file) {
            importMutation.mutate(file);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Importar {entityName}s</DialogTitle>
                    <DialogDescription>
                        Faça o upload de um arquivo CSV ou Excel para adicionar múltiplos registros de uma vez.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-slate-100 rounded-lg border">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                                Como Preparar seu Arquivo:
                            </h4>
                            
                            <div className="space-y-3">
                                <div className="p-3 bg-white rounded-md border border-slate-200">
                                    <p className="text-sm font-medium text-slate-800 mb-2 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        Formatos Aceitos:
                                    </p>
                                    <ul className="text-sm text-slate-600 list-disc list-inside ml-2 space-y-1">
                                        <li><strong>Excel</strong> (.xlsx ou .xls) - Recomendado</li>
                                        <li><strong>CSV</strong> (separado por vírgula)</li>
                                    </ul>
                                </div>

                                <div className="p-3 bg-white rounded-md border border-slate-200">
                                    <p className="text-sm font-medium text-slate-800 mb-2 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        Nomes das Colunas (copie exatamente):
                                    </p>
                                    <code className="text-xs bg-slate-800 text-green-400 p-3 rounded-md block mt-2 break-all font-mono">
                                        {instructions.csvHeaders}
                                    </code>
                                    <p className="text-xs text-slate-500 mt-2">
                                        ⚠️ <strong>Importante:</strong> Use esses nomes exatos na primeira linha da sua planilha
                                    </p>
                                </div>

                                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                                    <p className="text-sm font-medium text-green-800 mb-2 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        ✅ A ORDEM DAS COLUNAS NÃO IMPORTA!
                                    </p>
                                    <p className="text-xs text-green-700">
                                        O sistema identifica automaticamente cada coluna pelo <strong>nome</strong>, não pela posição. 
                                        Você pode organizar as colunas em qualquer ordem que preferir!
                                    </p>
                                    <div className="mt-2 p-2 bg-white rounded text-xs text-slate-600">
                                        <p className="font-semibold mb-1">Exemplos válidos:</p>
                                        <p>✓ name, email, phone, cpf_cnpj, ...</p>
                                        <p>✓ phone, name, email, cpf_cnpj, ...</p>
                                        <p>✓ cpf_cnpj, name, phone, email, ...</p>
                                        <p className="text-green-600 font-medium mt-1">Todos funcionam perfeitamente!</p>
                                    </div>
                                </div>

                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                                    <p className="text-xs text-blue-800">
                                        <strong>💡 Passo a Passo no Excel:</strong><br/>
                                        1. Abra uma nova planilha<br/>
                                        2. Na primeira linha (linha 1), cole os nomes das colunas acima<br/>
                                        3. A partir da linha 2, preencha os dados dos seus {entityName.toLowerCase()}s<br/>
                                        4. Salve e faça o upload aqui
                                    </p>
                                </div>

                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                                    <p className="text-xs text-amber-800">
                                        <strong>⚠️ Atenção:</strong> Campos obrigatórios devem ser preenchidos. 
                                        Campos opcionais podem ficar em branco. Consulte a documentação para saber quais são obrigatórios.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">
                                Selecione o arquivo:
                            </label>
                            <Input
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={(e) => setFile(e.target.files[0])}
                                disabled={importMutation.isPending}
                                className="cursor-pointer"
                            />
                            {file && (
                                <p className="text-sm text-slate-600 flex items-center gap-2 p-2 bg-green-50 rounded-md">
                                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                    Arquivo selecionado: <strong>{file.name}</strong>
                                </p>
                            )}
                        </div>

                        {error && (
                            <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-md flex items-start gap-2">
                               <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5"/>
                               <div>
                                   <p className="text-sm font-semibold mb-1">Erro na Importação:</p>
                                   <p className="text-xs">{error}</p>
                                   <p className="text-xs mt-2 text-red-700">
                                       Verifique se os nomes das colunas estão corretos e se há dados válidos no arquivo.
                                   </p>
                               </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <div className="flex justify-end gap-3 border-t pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importMutation.isPending}>
                        Cancelar
                    </Button>
                    <Button onClick={handleImport} disabled={!file || importMutation.isPending}>
                        {importMutation.isPending ? (
                            <>
                                <Loader className="w-4 h-4 mr-2 animate-spin" />
                                Processando...
                            </>
                        ) : (
                            <>
                                <FileUp className="w-4 h-4 mr-2" />
                                Importar Agora
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}