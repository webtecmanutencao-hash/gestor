import "./App.css";
import Pages from "./src/pages/index.jsx";
import { Toaster } from "./src/components/ui/toaster";
import BloqueioBraip from "./src/pages/BloqueioBraip";
import { useEffect, useState } from "react";
import { base44 } from "./src/api/base44Client";

function App() {
  const [status, setStatus] = useState("carregando");

  useEffect(() => {
    const verificarBloqueio = async () => {
      try {
        const email = localStorage.getItem("user_email");

        if (!email) {
          setStatus("bloqueado");
          return;
        }

        // Busca o usuário pelo e-mail no banco Base44
        const usuarios = await base44.entities.User.filter({ email });
        const usuario = usuarios?.[0];

        if (!usuario) {
          setStatus("bloqueado");
          return;
        }

        // Bloqueia se estiver pendente, cancelado ou reembolsado
        if (["pendente", "cancelado", "reembolso"].includes(usuario.status)) {
          setStatus("bloqueado");
          return;
        }

        setStatus("ativo");
      } catch (err) {
        console.error("Erro ao verificar bloqueio:", err);
        setStatus("bloqueado");
      }
    };

    verificarBloqueio();
  }, []);

  if (status === "carregando") {
    return (
      <div className="h-screen flex flex-col justify-center items-center text-slate-600">
        <p>Verificando acesso...</p>
      </div>
    );
  }

  if (status === "bloqueado") {
    return <BloqueioBraip />;
  }

  return (
    <>
      <Pages />
      <Toaster />
    </>
  );
}

export default App;
