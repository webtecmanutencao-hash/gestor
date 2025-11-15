import Layout from "./Layout.jsx";
import Dashboard from "./Dashboard";
import Clientes from "./Clientes";
import Vendas from "./Vendas";
import Cobrancas from "./Cobrancas";
import Estoque from "./Estoque";
import Documentos from "./Documentos";
import Suporte from "./Suporte";
import WhatsAppIA from "./WhatsAppIA";
import Mensalidade from "./Mensalidade";
import Administracao from "./Administracao";
import Relatorios from "./Relatorios";
import UsuarioDetalhes from "./UsuarioDetalhes";
import ChatSuporte from "./ChatSuporte";
import ChatAdmin from "./ChatAdmin";
import ConfiguracoesEmpresa from "./ConfiguracoesEmpresa";
import Geral from "./Geral";
import BloqueioLicenca from "./BloqueioLicenca";

import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import { useVerificarLicenca } from "@/hooks/useVerificarLicenca"; // ✅ novo hook

const PAGES = {
  Dashboard,
  Clientes,
  Vendas,
  Cobrancas,
  Estoque,
  Documentos,
  Suporte,
  WhatsAppIA,
  Mensalidade,
  Administracao,
  Relatorios,
  UsuarioDetalhes,
  ChatSuporte,
  ChatAdmin,
  ConfiguracoesEmpresa,
  Geral,
  BloqueioLicenca,
};

function _getCurrentPage(url) {
  if (url.endsWith("/")) url = url.slice(0, -1);
  let urlLastPart = url.split("/").pop();
  if (urlLastPart.includes("?")) urlLastPart = urlLastPart.split("?")[0];
  const pageName = Object.keys(PAGES).find(
    (page) => page.toLowerCase() === urlLastPart.toLowerCase()
  );
  return pageName || Object.keys(PAGES)[0];
}

function PagesContent() {
  const location = useLocation();
  const currentPage = _getCurrentPage(location.pathname);
  const verificando = useVerificarLicenca(); // ✅ chama a verificação

  if (verificando) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-600">
        <p>Verificando licença...</p>
      </div>
    );
  }

  return (
    <Layout currentPageName={currentPage}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Clientes" element={<Clientes />} />
        <Route path="/Vendas" element={<Vendas />} />
        <Route path="/Cobrancas" element={<Cobrancas />} />
        <Route path="/Estoque" element={<Estoque />} />
        <Route path="/Documentos" element={<Documentos />} />
        <Route path="/Suporte" element={<Suporte />} />
        <Route path="/WhatsAppIA" element={<WhatsAppIA />} />
        <Route path="/Mensalidade" element={<Mensalidade />} />
        <Route path="/Administracao" element={<Administracao />} />
        <Route path="/Relatorios" element={<Relatorios />} />
        <Route path="/UsuarioDetalhes" element={<UsuarioDetalhes />} />
        <Route path="/ChatSuporte" element={<ChatSuporte />} />
        <Route path="/ChatAdmin" element={<ChatAdmin />} />
        <Route path="/ConfiguracoesEmpresa" element={<ConfiguracoesEmpresa />} />
        <Route path="/Geral" element={<Geral />} />
        <Route path="/bloqueio-licenca" element={<BloqueioLicenca />} />
      </Routes>
    </Layout>
  );
}

export default function Pages() {
  return (
    <Router>
      <PagesContent />
    </Router>
  );
}
