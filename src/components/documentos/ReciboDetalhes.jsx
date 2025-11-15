import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ReciboDetalhes({ recibo }) {
  const detalhesRef = useRef(null);

  const handlePrint = () => {
    const conteudo = detalhesRef.current.innerHTML;
    const janela = window.open('', '', 'width=900,height=800');
    
    janela.document.write('<html><head><title>Recibo de Pagamento</title>');
    janela.document.write('<style>');
    janela.document.write(`
      @media print {
        @page {
          size: A4;
          margin: 15mm;
        }
        body {
          margin: 0;
          padding: 0;
        }
        .no-print {
          display: none !important;
        }
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 12pt;
        line-height: 1.5;
        color: #1e293b;
        padding: 20px;
      }
      h2 {
        font-size: 24pt;
        font-weight: bold;
        margin-bottom: 0.5em;
        color: #0f172a;
      }
      .text-xl {
        font-size: 18pt;
        font-weight: 600;
        color: #2563eb;
        margin: 0.5em 0;
      }
      .text-slate-600 {
        color: #475569;
      }
      .card {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 20px;
        margin: 16px 0;
        background-color: white;
      }
      .card-emerald {
        border: 2px solid #10b981;
        background: linear-gradient(to right, #ecfdf5, #d1fae5);
      }
      .card-header {
        font-size: 16pt;
        font-weight: 600;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 2px solid #10b981;
      }
      .valor-destaque {
        text-align: center;
        padding: 32px;
        background-color: #ecfdf5;
        border: 1px solid #a7f3d0;
        border-radius: 8px;
        margin: 20px 0;
      }
      .valor-destaque-label {
        color: #475569;
        font-size: 11pt;
        margin-bottom: 8px;
      }
      .valor-destaque-value {
        font-size: 40pt;
        font-weight: bold;
        color: #059669;
      }
      .grid {
        display: grid;
        gap: 16px;
        margin: 16px 0;
      }
      .grid-cols-2 {
        grid-template-columns: 1fr 1fr;
      }
      .info-box {
        padding: 16px;
        background-color: #f8fafc;
        border-radius: 6px;
      }
      .info-label {
        font-size: 10pt;
        color: #475569;
        margin-bottom: 4px;
      }
      .info-value {
        font-weight: 600;
        font-size: 14pt;
      }
      .section-divider {
        padding-top: 16px;
        margin-top: 16px;
        border-top: 1px solid #e2e8f0;
      }
      .signature-section {
        text-align: center;
        padding-top: 24px;
        margin-top: 32px;
        border-top: 1px solid #cbd5e1;
      }
      .signature-line {
        margin: 32px auto 0;
        padding-top: 32px;
        border-top: 1px solid #cbd5e1;
        width: 250px;
      }
      .footer-text {
        text-align: center;
        color: #94a3b8;
        font-size: 10pt;
        margin-top: 32px;
        padding-top: 16px;
        border-top: 1px solid #e2e8f0;
      }
      .badge-cancelado {
        background-color: #fee2e2;
        border: 2px solid #ef4444;
        color: #991b1b;
        padding: 8px 16px;
        border-radius: 6px;
        display: inline-block;
        font-weight: bold;
        margin-bottom: 12px;
      }
      .alert-cancelado {
        background-color: #fef2f2;
        border: 1px solid #fecaca;
        padding: 16px;
        border-radius: 8px;
        margin: 16px 0;
      }
    `);
    janela.document.write('</style></head><body>');
    janela.document.write(conteudo);
    janela.document.write('</body></html>');
    
    janela.document.close();
    janela.focus();
    
    setTimeout(() => {
      janela.print();
    }, 500);
  };

  return (
    <div ref={detalhesRef}>
      <div className="flex justify-between items-start" style={{ marginBottom: '24px' }}>
        <div>
          <h2>Recibo de Pagamento</h2>
          <p className="text-xl">#{recibo.numero_recibo}</p>
          <p className="text-slate-600">
            Emitido em {format(new Date(recibo.data_pagamento), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: '8px' }}>
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Imprimir
          </Button>
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Download className="w-4 h-4" />
            Salvar PDF
          </Button>
        </div>
      </div>

      {recibo.status === 'cancelado' && (
        <div className="alert-cancelado">
          <span className="badge-cancelado">RECIBO CANCELADO</span>
          {recibo.motivo_cancelamento && (
            <div>
              <p style={{ fontWeight: 600, color: '#991b1b', marginTop: '8px' }}>Motivo:</p>
              <p style={{ color: '#991b1b' }}>{recibo.motivo_cancelamento}</p>
            </div>
          )}
          {recibo.data_cancelamento && (
            <p style={{ fontSize: '10pt', color: '#b91c1c', marginTop: '8px' }}>
              Cancelado em: {format(new Date(recibo.data_cancelamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
        </div>
      )}

      <div className="card card-emerald">
        <div className="card-header">Comprovante de Pagamento</div>
        
        <div className="valor-destaque">
          <p className="valor-destaque-label">Valor Recebido</p>
          <p className="valor-destaque-value">R$ {recibo.valor_pago?.toFixed(2)}</p>
        </div>

        <div className="grid grid-cols-2">
          <div className="info-box">
            <p className="info-label">Recebido de</p>
            <p className="info-value">{recibo.cliente_nome}</p>
          </div>
          
          {recibo.cliente_cpf_cnpj && (
            <div className="info-box">
              <p className="info-label">CPF/CNPJ</p>
              <p className="info-value">{recibo.cliente_cpf_cnpj}</p>
            </div>
          )}
          
          <div className="info-box">
            <p className="info-label">Data do Pagamento</p>
            <p className="info-value">
              {format(new Date(recibo.data_pagamento), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          
          {recibo.forma_pagamento && (
            <div className="info-box">
              <p className="info-label">Forma de Pagamento</p>
              <p className="info-value">{recibo.forma_pagamento}</p>
            </div>
          )}
        </div>

        {recibo.referente_a && (
          <div className="section-divider">
            <p className="text-slate-600" style={{ fontSize: '11pt', marginBottom: '8px' }}>Referente a</p>
            <p style={{ fontWeight: 500 }}>{recibo.referente_a}</p>
          </div>
        )}

        {recibo.observacoes && (
          <div className="section-divider">
            <p className="text-slate-600" style={{ fontSize: '11pt', marginBottom: '8px' }}>Observações</p>
            <p style={{ fontSize: '11pt', whiteSpace: 'pre-wrap' }}>{recibo.observacoes}</p>
          </div>
        )}
      </div>

      <div className="signature-section">
        <p className="text-slate-600" style={{ fontStyle: 'italic' }}>
          Este documento comprova o recebimento do valor acima especificado.
        </p>
        <div className="signature-line">
          <p className="text-slate-600" style={{ fontSize: '10pt' }}>Assinatura do Emissor</p>
        </div>
      </div>

      <div className="footer-text">
        <p>Documento emitido eletronicamente via sistema GestãoPro</p>
      </div>
    </div>
  );
}