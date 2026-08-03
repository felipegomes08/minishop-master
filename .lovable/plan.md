## Contexto

O backend não oferece rate limiting nativo. Vamos construir um mecanismo próprio: uma tabela de contadores no banco + verificação nas edge functions. É eficaz contra abuso comum (scripts, spam, força bruta simples), mas não substitui um WAF: quem trocar de IP consegue contornar parcialmente. Por isso combinamos IP + identificador (e-mail ou empresa).

## Estratégia

Um único "motor" de rate limit reutilizável, em vez de lógica espalhada:

1. Tabela `rate_limit_events` (chave, identificador, ip, timestamp), sem acesso para `anon`/`authenticated` — só `service_role` (edge functions) grava e lê.
2. Função no banco `check_rate_limit(_key, _identifier, _ip, _max, _window_seconds)` que conta eventos na janela, registra a tentativa e devolve `{allowed, remaining, retry_after}`. Tudo em uma chamada, atômico.
3. Limpeza automática de registros antigos (job diário) para a tabela não crescer.

## Onde aplicar

| Endpoint | Limite | Chave |
|---|---|---|
| Login | 5 tentativas / 15 min | e-mail + IP |
| Recuperar senha (`reset-password`) | 3 / hora | e-mail + IP |
| Experimentador virtual (`virtual-try-on`) | configurável por env var, padrão 5 / dia | IP (+ empresa) |
| Chat financeiro (`financial-chat`) | 30 / hora | usuário |
| Extrair produtos da foto / despesa do recibo | 20 / hora | usuário |
| Criar checkout | 10 / hora | IP |
| Criar/editar/excluir usuário da empresa | 20 / hora | usuário |

### Login
Como o login é feito direto pelo cliente, criamos uma edge function `auth-guard` chamada **antes** do `signInWithPassword`: ela verifica o limite e, se estourado, a tela de login mostra "Muitas tentativas. Tente novamente em X minutos" sem sequer chamar a autenticação. Após um login bem-sucedido, o contador daquele e-mail é zerado. Só tentativas falhas contam de fato.

### Experimentador virtual
- Limite diário lido de `TRY_ON_DAILY_LIMIT` (variável de ambiente configurável, padrão 5).
- Ao atingir, a função devolve `429` com mensagem amigável, e o diálogo mostra "Você atingiu o limite de X experimentações hoje. Volte amanhã ou fale com a loja no WhatsApp".
- Contador visível no diálogo ("3 de 5 experimentações restantes hoje") para o usuário entender antes de gastar.
- Validações adicionais: tamanho máximo da imagem enviada (evita payloads gigantes) e verificação de que o produto pertence a uma empresa ativa.

## Detalhes técnicos

- Nova migração: tabela `rate_limit_events` com índice em (`key`, `identifier`, `created_at`), GRANTs apenas para `service_role`, RLS habilitado sem políticas públicas.
- `check_rate_limit` como função `SECURITY DEFINER` com `search_path = public`.
- Helper compartilhado `supabase/functions/_shared/rate-limit.ts` usado por todas as funções, com extração de IP via `x-forwarded-for`.
- Respostas `429` sempre com `Retry-After` e mensagem em pt-BR, mantendo os headers de CORS.
- Nova função `auth-guard` (`verify_jwt = false`) e ajuste em `src/pages/Auth.tsx` (login e recuperação de senha).
- Ajustes em `VirtualTryOnDialog.tsx` para exibir contagem restante e mensagem de bloqueio.
- Nenhuma alteração de layout ou de regras de negócio existentes.
