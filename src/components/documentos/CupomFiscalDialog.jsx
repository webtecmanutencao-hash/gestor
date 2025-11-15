import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CupomFiscalDialog({ documento, tipo, empresa }) {
  const cupomRef = useRef(null);

  const handleImprimir = () => {
    const conteudo = cupomRef.current.innerHTML;
    const janela = window.open('', '', 'height=600,width=400');
    
    janela.document.write('<html><head><title>Cupom Fiscal</title>');
    janela.document.write('<style>');
    janela.document.write(`
      @media print {
        @page {
          size: 80mm auto;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          width: 80mm;
        }
      }
      body {
        font-family: 'Courier New', monospace;
        font-size: 10px;
        line-height: 1.3;
        width: 80mm;
        margin: 0 auto;
        padding: 5mm;
      }
      .center { text-align: center; }
      .bold { font-weight: bold; }
      .separator { 
        border-top: 1px dashed #000; 
        margin: 5px 0; 
      }
      .item-row {
        display: flex;
        justify-content: space-between;
        margin: 2px 0;
      }
      .total-row {
        font-weight: bold;
        font-size: 12px;
        margin-top: 5px;
        padding-top: 5px;
        border-top: 2px solid #000;
      }
      .header {
        font-size: 12px;
        font-weight: bold;
        margin-bottom: 3px;
      }
      .small {
        font-size: 9px;
      }
    `);
    janela.document.write('</style></head><body>');
    janela.document.write(conteudo);
    janela.document.write('</body></html>');
    
    janela.document.close();
    janela.focus();
    
    setTimeout(() => {
      janela.print();
      janela.close();
    }, 250);
  };

  const isNota = tipo === 'nota';
  const dataEmissao = isNota ? documento.data_emissao : documento.data_pagamento;
  const numeroDoc = isNota ? documento.numero_nota : documento.numero_recibo;
  const valorTotal = isNota ? documento.valor_total : documento.valor_pago;

  return (
    <div className="space-y-4">
      {/* Preview do Cupom */}
      <div 
        ref={cupomRef}
        className="bg-white border-2 border-dashed border-slate-300 p-4 font-mono text-xs"
        style={{ width: '302px', margin: '0 auto' }}
      >
        {/* Cabeçalho */}
        <div className="center">
          <div className="header">{empresa?.full_name || 'EMPRESA'}</div>
          {empresa?.email && <div className="small">{empresa.email}</div>}
          {empresa?.telefone && <div className="small">Tel: {empresa.telefone}</div>}
        </div>

        <div className="separator"></div>

        {/* Tipo de Documento */}
        <div className="center bold" style={{ fontSize: '11px', margin: '5px 0' }}>
          {isNota ? '=== NOTA FISCAL ===' : '=== RECIBO ==='}
        </div>

        <div className="separator"></div>

        {/* Número e Data */}
        <div className="item-row">
          <span>Numero:</span>
          <span className="bold">{numeroDoc}</span>
        </div>
        <div className="item-row">
          <span>Data:</span>
          <span>{format(new Date(dataEmissao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
        </div>

        <div className="separator"></div>

        {/* Cliente */}
        <div className="bold">CLIENTE</div>
        <div>{documento.cliente_nome}</div>
        {documento.cliente_cpf_cnpj && (
          <div className="small">CPF/CNPJ: {documento.cliente_cpf_cnpj}</div>
        )}
        {documento.cliente_endereco && (
          <div className="small">{documento.cliente_endereco}</div>
        )}

        <div className="separator"></div>

        {/* Itens (apenas para notas) */}
        {isNota && documento.itens && documento.itens.length > 0 && (
          <>
            <div className="bold">ITENS/SERVICOS</div>
            {documento.itens.map((item, index) => (
              <div key={index} style={{ marginBottom: '5px' }}>
                <div className="bold">{item.descricao || item.produto_nome}</div>
                <div className="item-row small">
                  <span>{item.quantidade} x R$ {item.valor_unitario?.toFixed(2)}</span>
                  <span>R$ {item.valor_total?.toFixed(2)}</span>
                </div>
              </div>
            ))}
            <div className="separator"></div>
          </>
        )}

        {/* Referente a (para recibos) */}
        {!isNota && documento.referente_a && (
          <>
            <div className="bold">REFERENTE A</div>
            <div className="small">{documento.referente_a}</div>
            <div className="separator"></div>
          </>
        )}

        {/* Forma de Pagamento (para recibos) */}
        {!isNota && documento.forma_pagamento && (
          <>
            <div className="item-row">
              <span>Forma Pgto:</span>
              <span>{documento.forma_pagamento}</span>
            </div>
            <div className="separator"></div>
          </>
        )}

        {/* Total */}
        <div className="item-row total-row">
          <span>TOTAL:</span>
          <span>R$ {valorTotal?.toFixed(2)}</span>
        </div>

        <div className="separator"></div>

        {/* Observações */}
        {documento.observacoes && (
          <>
            <div className="bold small">OBSERVACOES</div>
            <div className="small">{documento.observacoes}</div>
            <div className="separator"></div>
          </>
        )}

        {/* Rodapé */}
        <div className="center small" style={{ marginTop: '10px' }}>
          <div>Emitido em: {format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}</div>
          <div style={{ marginTop: '5px' }}>DOCUMENTO NAO FISCAL</div>
          <div>Via do Cliente</div>
        </div>

        <div className="separator"></div>
        <div className="center small">
          Obrigado pela preferencia!
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-3 justify-center pt-4 border-t">
        <Button
          onClick={handleImprimir}
          className="gap-2 bg-purple-600 hover:bg-purple-700"
        >
          <Printer className="w-4 h-4" />
          Imprimir em Térmica
        </Button>
      </div>

      {/* Informações */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          <strong>📌 Dica:</strong> Este cupom está formatado para impressoras térmicas de 80mm. 
          Certifique-se de que sua impressora está configurada corretamente antes de imprimir.
        </p>
      </div>
    </div>
  );
}