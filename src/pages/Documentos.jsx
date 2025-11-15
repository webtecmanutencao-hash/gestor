import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, XCircle, Receipt as ReceiptIcon, Banknote } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import NotasLista from "../components/documentos/NotasLista";
import RecibosLista from "../components/documentos/RecibosLista";
import BoletosLista from "../components/documentos/BoletosLista";
import CancelarDocumentoDialog from "../components/documentos/CancelarDocumentoDialog";

export default function Documentos() {
  const [showCancelarDialog, setShowCancelarDialog] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              Documentos Fiscais
            </h1>
            <p className="text-slate-600 mt-1">Gerencie notas fiscais, recibos, boletos e faturas</p>
          </div>
          <Button 
            onClick={() => setShowCancelarDialog(true)}
            variant="destructive"
            className="gap-2"
          >
            <XCircle className="w-4 h-4" />
            Cancelar Documento
          </Button>
        </div>

        <Tabs defaultValue="notas" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="notas" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notas Fiscais
            </TabsTrigger>
            <TabsTrigger value="recibos" className="flex items-center gap-2">
              <ReceiptIcon className="w-4 h-4" />
              Recibos
            </TabsTrigger>
            <TabsTrigger value="boletos" className="flex items-center gap-2">
              <Banknote className="w-4 h-4" />
              Boletos/Faturas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notas" className="space-y-6">
            <NotasLista />
          </TabsContent>

          <TabsContent value="recibos" className="space-y-6">
            <RecibosLista />
          </TabsContent>

          <TabsContent value="boletos" className="space-y-6">
            <BoletosLista />
          </TabsContent>
        </Tabs>

        <Dialog open={showCancelarDialog} onOpenChange={setShowCancelarDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cancelar Documento</DialogTitle>
            </DialogHeader>
            <CancelarDocumentoDialog onClose={() => setShowCancelarDialog(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}