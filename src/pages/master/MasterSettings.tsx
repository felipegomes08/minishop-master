import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Database, Shield, Globe } from 'lucide-react';

export default function MasterSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Configurações globais da plataforma
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Banco de Dados
            </CardTitle>
            <CardDescription>
              Informações do banco de dados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Provedor</span>
              <Badge>Supabase</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Status</span>
              <span className="flex items-center gap-2 text-sm text-green-600">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Conectado
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Região</span>
              <span className="text-sm text-muted-foreground">South America</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Segurança
            </CardTitle>
            <CardDescription>
              Configurações de segurança
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">RLS (Row Level Security)</span>
              <Badge variant="default">Ativado</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Multi-Tenant</span>
              <Badge variant="default">Ativado</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Autenticação</span>
              <Badge variant="default">Email/Senha</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Plataforma
            </CardTitle>
            <CardDescription>
              Informações da plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Versão</span>
              <span className="text-sm text-muted-foreground">1.0.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Ambiente</span>
              <Badge variant="secondary">Produção</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Framework</span>
              <span className="text-sm text-muted-foreground">React + Vite</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Funcionalidades
            </CardTitle>
            <CardDescription>
              Módulos disponíveis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Catálogo Público</span>
              <Badge variant="default">Ativo</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Admin Empresas</span>
              <Badge variant="default">Ativo</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Vendas</span>
              <Badge variant="default">Ativo</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Cupons</span>
              <Badge variant="default">Ativo</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
