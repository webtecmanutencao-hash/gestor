import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function NotaDetalhes({ nota }) {
  const detalhesRef = useRef(null);

  const handlePrint = () => {
    const conteudo = detalhesRef.current.innerHTML;
    const janela = window.open('', '', 'width=900,height=800');
    
    janela.document.write('<html><head><title>Nota Fiscal de Serviço</title>');
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
        padding: 16px;
        margin: 16px 0;
        background-color: white;
      }
      .card-header {
        font-size: 16pt;
        font-weight: 600;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 2px solid #e2e8f0;
      }
      .grid {
        display: grid;
        gap: 16px;
        margin: 12px 0;
      }
      .grid-cols-2 {
        grid-template-columns: 1fr 1fr;
      }
      .font-semibold {
        font-weight: 600;
      }
      .item-box {
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 12px;
        margin: 8px 0;
        background-color: #f8fafc;
        display: flex;
        justify-content: space-between;
      }
      .text-emerald-600 {
        color: #059669;
      }
      .total-section {
        margin-top: 24px;
        padding-top: 16px;
        border-top: 2px solid #cbd5e1;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .total-value {
        font-size: 28pt;
        font-weight: bold;
        color: #059669;
      }
      .badge-cancelada {
        background-color: #fee2e2;
        border: 2px solid #ef4444;
        color: #991b1b;
        padding: 8px 16px;
        border-radius: 6px;
        display: inline-block;
        font-weight: bold;
        margin-bottom: 12px;
      }
      .alert-cancelada {
        background-color: #fef2f2;
        border: 1px solid #fecaca;
        padding: 16px;
        border-radius: 8px;
        margin: 16px 0;
      }
      .footer-text {
        text-align: center;
        color: #94a3b8;
        font-size: 10pt;
        margin-top: 32px;
        padding-top: 16px;
        border-top: 1px solid #e2e8f0;
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
          <h2>Nota Fiscal de Serviço</h2>
          <p className="text-xl">#{nota.numero_nota}</p>
          <p className="text-slate-600">
            Emitida em {format(new Date(nota.data_emissao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
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

      {nota.status === 'cancelada' && (
        <div className="alert-cancelada">
          <span className="badge-cancelada">NOTA CANCELADA</span>
          {nota.motivo_cancelamento && (
            <div>
              <p style={{ fontWeight: 600, color: '#991b1b', marginTop: '8px' }}>Motivo:</p>
              <p style={{ color: '#991b1b' }}>{nota.motivo_cancelamento}</p>
            </div>
          )}
          {nota.data_cancelamento && (
            <p style={{ fontSize: '10pt', color: '#b91c1c', marginTop: '8px' }}>
              Cancelada em: {format(new Date(nota.data_cancelamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-header">Informações do Cliente</div>
        <div className="grid grid-cols-2">
          <div>
            <p className="text-slate-600" style={{ fontSize: '10pt' }}>Nome/Razão Social</p>
            <p className="font-semibold" style={{ fontSize: '14pt' }}>{nota.cliente_nome}</p>
          </div>
          {nota.cliente_cpf_cnpj && (
            <div>
              <p className="text-slate-600" style={{ fontSize: '10pt' }}>CPF/CNPJ</p>
              <p className="font-semibold">{nota.cliente_cpf_cnpj}</p>
            </div>
          )}
        </div>
        {nota.cliente_endereco && (
          <div style={{ marginTop: '12px' }}>
            <p className="text-slate-600" style={{ fontSize: '10pt' }}>Endereço</p>
            <p className="font-semibold">{nota.cliente_endereco}</p>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">Serviços Prestados</div>
        {nota.itens && nota.itens.length > 0 ? (
          nota.itens.map((item, index) => (
            <div key={index} className="item-box">
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 500, fontSize: '14pt' }}>{item.descricao || item.produto_nome}</p>
                <p className="text-slate-600" style={{ fontSize: '10pt', marginTop: '4px' }}>
                  Quantidade: {item.quantidade} × R$ {item.valor_unitario?.toFixed(2)}
                </p>
                {item.ncm && (
                  <p className="text-slate-600" style={{ fontSize: '9pt', marginTop: '4px' }}>NCM: {item.ncm}</p>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="text-slate-600" style={{ fontSize: '10pt' }}>Subtotal</p>
                <p className="text-emerald-600" style={{ fontWeight: 'bold', fontSize: '14pt' }}>
                  R$ {item.valor_total?.toFixed(2)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p style={{ textAlign: 'center', color: '#94a3b8', padding: '16px' }}>Nenhum item registrado</p>
        )}

        <div className="total-section">
          <span style={{ fontSize: '16pt', fontWeight: 600 }}>Valor Total da Nota:</span>
          <span className="total-value">R$ {nota.valor_total?.toFixed(2)}</span>
        </div>
      </div>

      {nota.observacoes && (
        <div className="card">
          <div className="card-header">Observações</div>
          <p style={{ fontSize: '11pt', whiteSpace: 'pre-wrap' }}>{nota.observacoes}</p>
        </div>
      )}

      <div className="footer-text">
        <p>Documento emitido eletronicamente via sistema GestãoPro</p>
      </div>
    </div>
  );
}