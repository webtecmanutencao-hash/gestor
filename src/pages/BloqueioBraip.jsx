import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader, Lock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function BloqueioBraip() {
  const [status, setStatus] = useState("carregando");
  const [mensagem, setMensagem] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const verificarPermissao = async () => {
      try {
        const email = localStorage.getItem("user_email");
        if (!email) {
          setStatus("bloqueado");
          setMensagem("Nenhum usuário logado. Faça login novamente.");
          return;
        }

        // Chamada ao backend hospedado
        const resposta = await fetch("https://gateway-braip.onrender.com/clientes");
        const clientes = await resposta.json();

        const usuario = clientes.find((c) => c.email === email);

        if (!usuario) {
          setStatus("bloqueado");
          setMensagem("Usuário não encontrado em nossa base.");
          return;
        }

        if (
          usuario.status === "pendente" ||
          usuario.status === "bloqueado" ||
          usuario.status === "cancelado"
        ) {
          setStatus("bloqueado");
          setMensagem("Seu acesso foi suspenso por falta de pagamento na Braip.");
          return;
        }

        setStatus("ativo");
      } catch (error) {
        console.error("Erro ao verificar status:", error);
        setStatus("bloqueado");
        setMensagem("Erro ao verificar status. Tente novamente mais tarde.");
      }
    };

    verificarPermissao();
  }, []);

  if (status === "carregando") {
    return (
      <div className="h-screen flex flex-col justify-center items-center text-slate-600">
        <Loader className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p>Verificando acesso...</p>
      </div>
    );
  }

  if (status === "bloqueado") {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-slate-100 to-red-50">
        <Card className="max-w-md shadow-xl border border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-red-600">
              <Lock className="w-6 h-6" />
              Acesso Bloqueado
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <p className="text-slate-700 font-medium">{mensagem}</p>
            <Button onClick={() => navigate("/login")} className="w-full">
              Fazer Login Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
