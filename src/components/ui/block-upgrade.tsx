
import { Users } from "lucide-react";
import { Button } from "./button";

const BlockUpgrade = () => (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="rounded-3xl border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold mb-2">Recurso exclusivo dos planos Prata e Ouro</h1>
          <p className="text-sm text-muted-foreground mb-6">
            O painel de clientes está disponível apenas para lojas com plano Prata ou Ouro.
            Faça upgrade para começar a gerenciar sua base de clientes.
          </p>
          <Button
            onClick={() => window.open(`https://wa.me/${import.meta.env.VITE_SUPPORT_NUMBER}?text=${encodeURIComponent('Olá! Quero fazer upgrade para acessar o painel de clientes.')}`, '_blank')}
          >
            <Users className="w-4 h-4 mr-2" /> Falar com o suporte
          </Button>
        </div>
      </div>
);

BlockUpgrade.displayName = "BlockUpgrade";

export { BlockUpgrade };

