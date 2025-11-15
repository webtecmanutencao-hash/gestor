// src/hooks/useVerificarLicenca.js
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

export function useVerificarLicenca() {
  const [verificando, setVerificando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const verificar = async () => {
      try {
        const email = localStorage.getItem("user_email");
        if (!email) {
          navigate("/bloqueio-licenca");
          return;
        }

        const usuarios = await base44.entities.User.filter({ email });
        const usuario = usuarios?.[0];

        if (!usuario) {
          navigate("/bloqueio-licenca");
          return;
        }

        if (usuario.status === "pendente" || usuario.status === "cancelado") {
          navigate("/bloqueio-licenca");
          return;
        }
      } catch (err) {
        console.error("Erro ao verificar licença:", err);
        navigate("/bloqueio-licenca");
      } finally {
        setVerificando(false);
      }
    };

    verificar();
  }, [navigate]);

  return verificando;
}
