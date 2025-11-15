import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function BloqueioLicenca() {
  const location = useLocation();
  const navigate = useNavigate();
  const motivo = location.state?.motivo || "Acesso bloqueado.";
  const email = localStorage.getItem("emailUsuario");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    if (motivo.toLowerCase().includes("pendente")) {
      setMensagem("Seu pagamento ainda não foi confirmado pela Braip. Assim que o pagamento for aprovado, o sistema será liberado automaticamente.");
    } else if (motivo.toLowerCase().includes("bloqueado")) {
      setMensagem("Sua licença foi bloqueada por cancelamento, reembolso ou inatividade. Entre em contato para regularizar seu acesso.");
    } else {
      setMensagem("Não foi possível validar sua licença.");
    }
  }, [motivo]);

  const handleReativar = () => {
    localStorage.removeItem("emailUsuario");
    navigate("/");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-red-50 to-red-200">
      <div className="bg-white shadow-2xl rounded-2xl p-10 text-center max-w-lg border border-red-200">
        <h1 className="text-3xl font-bold text-red-700 mb-3">🚫 Acesso Bloqueado</h1>
        <p className="text-gray-700 mb-6">{mensagem}</p>

        <div className="bg-red-100 text-red-800 p-3 rounded-md text-sm mb-6">
          <p><strong>Email da licença:</strong> {email || "não identificado"}</p>
          <p><strong>Status:</strong> {motivo}</p>
        </div>

        <a
          href="https://app.braip.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg transition"
        >
          Regularizar na Braip
        </a>

        <button
          onClick={handleReativar}
          className="mt-4 block mx-auto text-gray-600 underline hover:text-gray-900"
        >
          Revalidar licença
        </button>
      </div>

      <footer className="mt-10 text-gray-500 text-sm">
        © {new Date().getFullYear()} Gestão Pro — Licenciamento protegido via Braip
      </footer>
    </div>
  );
}
