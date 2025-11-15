import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader, RefreshCw } from 'lucide-react';

export default function ServerStatusCheck({ venomApiUrl, onStatusChange }) {
  const [serverStatus, setServerStatus] = useState('checking');
  const [checking, setChecking] = useState(false);

  const checkServer = async () => {
    setChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${venomApiUrl}/sessions`, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        setServerStatus('online');
        if (onStatusChange) onStatusChange('online');
      } else {
        setServerStatus('offline');
        if (onStatusChange) onStatusChange('offline');
      }
    } catch (error) {
      setServerStatus('offline');
      if (onStatusChange) onStatusChange('offline');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkServer();
    const interval = setInterval(checkServer, 30000);
    return () => clearInterval(interval);
  }, [venomApiUrl]);

  if (serverStatus === 'checking') {
    return (
      <Card className="border-blue-300 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Loader className="w-5 h-5 animate-spin text-blue-600" />
            <p className="text-blue-900 font-medium">Verificando conexão...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (serverStatus === 'online') {
    return (
      <Card className="border-green-300 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <p className="text-green-900 font-semibold">Sistema Pronto para Conectar</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={checkServer}
              disabled={checking}
            >
              {checking ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-300 bg-red-50">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-600" />
            <div>
              <p className="text-red-900 font-semibold">Sistema Temporariamente Indisponível</p>
              <p className="text-sm text-red-700">Entre em contato com o suporte para ativar o WhatsApp</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkServer}
            disabled={checking}
          >
            {checking ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}