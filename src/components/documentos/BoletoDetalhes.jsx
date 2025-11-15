import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function BoletoDetalhes({ boleto, empresa }) {
  const detalhesRef = useRef(null);

  const handlePrint = () => {
    const conteudo = detalhesRef.current.innerHTML;
    const janela = window.open('', '', 'width=900,height=800');
    
    janela.document.write('<html><head><title>Boleto Bancário</title>');
    janela.document.write('<style>');
    janela.document.write(`
      @media print {
        @page {
          size: A4;
          margin: 0;
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
        font-family: Arial, sans-serif;
        font-size: 9pt;
        line-height: 1.2;
        color: #000;
        margin: 0;
        padding: 0;
      }
      .boleto-container {
        width: 666px;
        margin: 0 auto;
        padding: 10px;
      }
      .recibo-sacado {
        border: 2px solid #000;
        padding: 8px;
        margin-bottom: 5px;
      }
      .linha-pontilhada {
        border-top: 1px dashed #000;
        margin: 15px 0;
        position: relative;
        height: 1px;
      }
      .linha-pontilhada::before {
        content: '✂ Corte na linha pontilhada';
        position: absolute;
        top: -8px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        padding: 0 10px;
        font-size: 8pt;
        color: #666;
      }
      .ficha-compensacao {
        border: 2px solid #000;
        padding: 0;
      }
      .banco-header {
        display: flex;
        align-items: center;
        padding: 8px;
        border-bottom: 2px solid #000;
      }
      .banco-logo {
        width: 150px;
        height: 40px;
        border-right: 2px solid #000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 18pt;
        padding-right: 10px;
        margin-right: 10px;
      }
      .banco-codigo {
        font-size: 16pt;
        font-weight: bold;
        border-right: 2px solid #000;
        padding: 0 15px;
        margin-right: 15px;
      }
      .linha-digitavel {
        font-size: 11pt;
        font-weight: bold;
        font-family: 'Courier New', monospace;
        letter-spacing: 1px;
      }
      .campo {
        border-bottom: 1px solid #000;
        border-right: 1px solid #000;
        padding: 3px 5px;
        min-height: 20px;
      }
      .campo:last-child {
        border-right: none;
      }
      .campo-label {
        font-size: 7pt;
        color: #333;
        display: block;
        margin-bottom: 2px;
      }
      .campo-valor {
        font-size: 9pt;
        font-weight: bold;
      }
      .row {
        display: flex;
        border-bottom: 1px solid #000;
      }
      .row:last-child {
        border-bottom: none;
      }
      .col-70 { width: 70%; }
      .col-30 { width: 30%; }
      .col-60 { width: 60%; }
      .col-40 { width: 40%; }
      .col-50 { width: 50%; }
      .col-100 { width: 100%; }
      .codigo-barras {
        height: 50px;
        background: repeating-linear-gradient(
          90deg,
          #000 0px,
          #000 2px,
          #fff 2px,
          #fff 3px,
          #000 3px,
          #000 4px,
          #fff 4px,
          #fff 6px,
          #000 6px,
          #000 8px,
          #fff 8px,
          #fff 9px
        );
        margin: 10px 0;
        border: 1px solid #000;
      }
      .instrucoes-box {
        border-right: 1px solid #000;
        padding: 5px;
        min-height: 80px;
        font-size: 8pt;
      }
      .valor-cobrado-box {
        padding: 5px;
        min-height: 80px;
      }
      .valor-destaque {
        font-size: 16pt;
        font-weight: bold;
        text-align: right;
        margin-top: 10px;
      }
      .sacador-avalista {
        border-top: 1px solid #000;
        padding: 5px;
        font-size: 8pt;
      }
      .titulo-recibo {
        font-size: 10pt;
        font-weight: bold;
        margin-bottom: 5px;
        text-align: center;
      }
      .info-recibo {
        display: flex;
        justify-content: space-between;
        margin: 3px 0;
        font-size: 8pt;
      }
      .autenticacao {
        text-align: right;
        font-size: 7pt;
        color: #666;
        margin-top: 5px;
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

  // Calcular dias para vencimento
  const diasParaVencimento = differenceInDays(new Date(boleto.data_vencimento), new Date());
  const isVencido = diasParaVencimento < 0;

  // Calcular valor com juros e multa se vencido
  let valorTotal = boleto.valor;
  let valorMulta = 0;
  let valorJuros = 0;
  
  if (isVencido && boleto.status !== 'pago') {
    const diasAtraso = Math.abs(diasParaVencimento);
    valorMulta = boleto.valor_multa || 0;
    valorJuros = (boleto.valor_juros_dia || 0) * diasAtraso;
    valorTotal += valorMulta + valorJuros;
  }

  // Gerar linha digitável simulada (em produção, seria gerada pelo banco)
  const linhaDigitavel = boleto.linha_digitavel || `00000.00000 00000.000000 00000.000000 0 00000000000000`;
  
  // Nosso número simulado
  const nossoNumero = boleto.nosso_numero || boleto.numero_boleto.replace(/[^0-9]/g, '').padStart(10, '0');

  return (
    <div ref={detalhesRef}>
      <div className="no-print" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '20pt', fontWeight: 'bold' }}>
          {boleto.tipo === 'boleto' ? 'Boleto Bancário' : 'Fatura de Cobrança'}
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
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

      <div className="boleto-container">
        {/* RECIBO DO SACADO */}
        <div className="recibo-sacado">
          <div className="titulo-recibo">RECIBO DO PAGADOR</div>
          
          <div className="info-recibo">
            <span><strong>Cedente:</strong> {empresa?.full_name || 'EMPRESA'}</span>
            <span><strong>Agência/Código Cedente:</strong> 0000 / 0000000</span>
          </div>
          
          <div className="info-recibo">
            <span><strong>Data do Documento:</strong> {format(new Date(boleto.data_emissao), 'dd/MM/yyyy')}</span>
            <span><strong>Nº do Documento:</strong> {boleto.numero_boleto}</span>
          </div>
          
          <div className="info-recibo">
            <span><strong>Espécie Doc:</strong> DM</span>
            <span><strong>Aceite:</strong> N</span>
            <span><strong>Data Processamento:</strong> {format(new Date(), 'dd/MM/yyyy')}</span>
          </div>
          
          <div className="info-recibo">
            <span><strong>Nosso Número:</strong> {nossoNumero}</span>
            <span><strong>Carteira:</strong> 18</span>
            <span><strong>Espécie:</strong> R$</span>
          </div>
          
          <div className="info-recibo">
            <span style={{ flex: 1 }}><strong>Pagador:</strong> {boleto.cliente_nome}</span>
            <span><strong>Vencimento:</strong> {format(new Date(boleto.data_vencimento), 'dd/MM/yyyy')}</span>
            <span><strong>Valor Documento:</strong> R$ {boleto.valor.toFixed(2)}</span>
          </div>
          
          <div style={{ borderTop: '1px solid #000', marginTop: '5px', paddingTop: '3px', fontSize: '7pt', textAlign: 'right' }}>
            Autenticação Mecânica
          </div>
        </div>

        {/* LINHA PONTILHADA */}
        <div className="linha-pontilhada"></div>

        {/* FICHA DE COMPENSAÇÃO */}
        <div className="ficha-compensacao">
          {/* CABEÇALHO COM BANCO */}
          <div className="banco-header">
            <div className="banco-logo">
              {empresa?.full_name?.substring(0, 10).toUpperCase() || 'BANCO'}
            </div>
            <div className="banco-codigo">000-0</div>
            <div className="linha-digitavel">{linhaDigitavel}</div>
          </div>

          {/* LINHA 1 */}
          <div className="row">
            <div className="campo col-70">
              <span className="campo-label">Local de Pagamento</span>
              <span className="campo-valor">Pagável em qualquer banco até o vencimento</span>
            </div>
            <div className="campo col-30">
              <span className="campo-label">Vencimento</span>
              <span className="campo-valor" style={{ fontSize: '11pt', color: isVencido ? '#d00' : '#000' }}>
                {format(new Date(boleto.data_vencimento), 'dd/MM/yyyy')}
              </span>
            </div>
          </div>

          {/* LINHA 2 */}
          <div className="row">
            <div className="campo col-70">
              <span className="campo-label">Cedente</span>
              <span className="campo-valor">{empresa?.full_name || 'EMPRESA'}</span>
            </div>
            <div className="campo col-30">
              <span className="campo-label">Agência/Código Cedente</span>
              <span className="campo-valor">0000 / 0000000</span>
            </div>
          </div>

          {/* LINHA 3 */}
          <div className="row">
            <div className="campo" style={{ width: '20%' }}>
              <span className="campo-label">Data do Documento</span>
              <span className="campo-valor">{format(new Date(boleto.data_emissao), 'dd/MM/yyyy')}</span>
            </div>
            <div className="campo" style={{ width: '25%' }}>
              <span className="campo-label">Nº do Documento</span>
              <span className="campo-valor">{boleto.numero_boleto}</span>
            </div>
            <div className="campo" style={{ width: '15%' }}>
              <span className="campo-label">Espécie Doc.</span>
              <span className="campo-valor">DM</span>
            </div>
            <div className="campo" style={{ width: '10%' }}>
              <span className="campo-label">Aceite</span>
              <span className="campo-valor">N</span>
            </div>
            <div className="campo" style={{ width: '30%' }}>
              <span className="campo-label">Data do Processamento</span>
              <span className="campo-valor">{format(new Date(), 'dd/MM/yyyy')}</span>
            </div>
          </div>

          {/* LINHA 4 */}
          <div className="row">
            <div className="campo" style={{ width: '35%' }}>
              <span className="campo-label">Uso do Banco</span>
              <span className="campo-valor"></span>
            </div>
            <div className="campo" style={{ width: '15%' }}>
              <span className="campo-label">Carteira</span>
              <span className="campo-valor">18</span>
            </div>
            <div className="campo" style={{ width: '15%' }}>
              <span className="campo-label">Espécie</span>
              <span className="campo-valor">R$</span>
            </div>
            <div className="campo" style={{ width: '35%' }}>
              <span className="campo-label">Valor do Documento</span>
              <span className="campo-valor">R$ {boleto.valor.toFixed(2)}</span>
            </div>
          </div>

          {/* INSTRUÇÕES E VALORES */}
          <div className="row" style={{ borderBottom: 'none' }}>
            {/* INSTRUÇÕES */}
            <div className="instrucoes-box col-70">
              <span className="campo-label">Instruções (Texto de responsabilidade do cedente)</span>
              <div style={{ marginTop: '5px', fontSize: '8pt' }}>
                {boleto.instrucoes ? (
                  <div style={{ whiteSpace: 'pre-wrap' }}>{boleto.instrucoes}</div>
                ) : (
                  <>
                    <div>- Não receber após o vencimento</div>
                    {boleto.valor_multa > 0 && <div>- Após vencimento: Multa de R$ {boleto.valor_multa.toFixed(2)}</div>}
                    {boleto.valor_juros_dia > 0 && <div>- Juros de mora: R$ {boleto.valor_juros_dia.toFixed(2)} por dia de atraso</div>}
                  </>
                )}
                {isVencido && boleto.status !== 'pago' && (
                  <div style={{ marginTop: '8px', padding: '5px', background: '#fee', border: '1px solid #d00', color: '#d00' }}>
                    <strong>BOLETO VENCIDO</strong><br/>
                    Multa: R$ {valorMulta.toFixed(2)}<br/>
                    Juros ({Math.abs(diasParaVencimento)} dias): R$ {valorJuros.toFixed(2)}<br/>
                    <strong>Total Atualizado: R$ {valorTotal.toFixed(2)}</strong>
                  </div>
                )}
                {boleto.status === 'pago' && (
                  <div style={{ marginTop: '8px', padding: '5px', background: '#efe', border: '1px solid #0a0', color: '#060' }}>
                    <strong>✓ PAGO EM {format(new Date(boleto.data_pagamento), 'dd/MM/yyyy')}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* VALORES À DIREITA */}
            <div className="valor-cobrado-box col-30">
              <div className="campo" style={{ border: 'none', borderBottom: '1px solid #000' }}>
                <span className="campo-label">(-) Desconto / Abatimentos</span>
                <span className="campo-valor"></span>
              </div>
              <div className="campo" style={{ border: 'none', borderBottom: '1px solid #000' }}>
                <span className="campo-label">(-) Outras Deduções</span>
                <span className="campo-valor"></span>
              </div>
              <div className="campo" style={{ border: 'none', borderBottom: '1px solid #000' }}>
                <span className="campo-label">(+) Mora / Multa</span>
                <span className="campo-valor">
                  {isVencido && boleto.status !== 'pago' ? `R$ ${(valorMulta + valorJuros).toFixed(2)}` : ''}
                </span>
              </div>
              <div className="campo" style={{ border: 'none', borderBottom: '1px solid #000' }}>
                <span className="campo-label">(+) Outros Acréscimos</span>
                <span className="campo-valor"></span>
              </div>
              <div className="campo" style={{ border: 'none', borderBottom: '2px solid #000' }}>
                <span className="campo-label">(=) Valor Cobrado</span>
                <span className="campo-valor valor-destaque" style={{ color: isVencido ? '#d00' : '#000' }}>
                  R$ {valorTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* PAGADOR */}
          <div className="row">
            <div className="campo col-100">
              <span className="campo-label">Pagador</span>
              <div className="campo-valor">
                <div><strong>{boleto.cliente_nome}</strong></div>
                {boleto.cliente_cpf_cnpj && <div>CPF/CNPJ: {boleto.cliente_cpf_cnpj}</div>}
                {boleto.cliente_endereco && <div style={{ fontSize: '8pt' }}>{boleto.cliente_endereco}</div>}
              </div>
            </div>
          </div>

          {/* SACADOR/AVALISTA */}
          <div className="sacador-avalista">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Sacador/Avalista: {empresa?.full_name || ''}</span>
              <span style={{ fontSize: '7pt' }}>Cód. Baixa: </span>
            </div>
          </div>

          {/* CÓDIGO DE BARRAS */}
          <div className="codigo-barras"></div>

          {/* AUTENTICAÇÃO */}
          <div className="autenticacao">
            Autenticação Mecânica - Ficha de Compensação
          </div>
        </div>

        {/* DESCRIÇÃO DO BOLETO */}
        {boleto.descricao && (
          <div style={{ marginTop: '10px', padding: '8px', border: '1px solid #ccc', fontSize: '8pt' }}>
            <strong>Descrição:</strong> {boleto.descricao}
          </div>
        )}

        {/* OBSERVAÇÕES */}
        {boleto.observacoes && (
          <div style={{ marginTop: '5px', padding: '8px', border: '1px solid #ccc', fontSize: '8pt' }}>
            <strong>Observações:</strong> {boleto.observacoes}
          </div>
        )}
      </div>
    </div>
  );
}