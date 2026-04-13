

# Landing Page "Lojix" — Plano de Implementação

## Resumo

Criar uma landing page completa e persuasiva em `/landing` como nova rota pública no app React existente. A página terá 12 seções conforme especificado, com tema escuro (navy profundo), acentos em roxo/azul elétrico, animações de scroll e design mobile-first.

## Arquitetura

- **Nova rota**: `/landing` (pública, sem autenticação)
- **Página principal**: `src/pages/Landing.tsx` — orquestra todas as seções
- **Componentes**: `src/components/landing/` — uma pasta dedicada com um componente por seção
- **Rota raiz**: Redirecionar `/` para `/landing` (ao invés do dashboard protegido, que passará para `/dashboard`)

## Estrutura de Componentes

```text
src/components/landing/
├── LandingHeader.tsx      (navbar fixa com logo + links âncora + CTA)
├── HeroSection.tsx        (headline, subheadline, CTA, mockup, prova social)
├── ProblemSolutionSection.tsx  (dores do lojista → solução Lojix)
├── VirtualTryOnSection.tsx     (destaque IA, badge exclusivo, fluxo ilustrado)
├── PhotoImporterSection.tsx    (importador por foto com IA)
├── AIInsightsSection.tsx       (insights automáticos)
├── FeaturesGrid.tsx            (grade de 9 cards com ícones)
├── CatalogSection.tsx          (catálogo online personalizável)
├── TestimonialsSection.tsx     (depoimentos placeholder)
├── PricingSection.tsx          (3 planos: Bronze, Prata, Ouro)
├── FAQSection.tsx              (6 perguntas em accordion)
├── FinalCTASection.tsx         (CTA emocional final)
└── LandingFooter.tsx           (rodapé com logo e links)
```

## Design e Estilo

- **Paleta**: fundo `#0a0e1a` (navy profundo), cards `#111827`, acentos em `#7c3aed` (roxo) e `#3b82f6` (azul elétrico), texto branco/cinza claro
- **Tipografia**: Inter (já carregada no projeto)
- **Animações**: scroll reveal com Intersection Observer (sem dependências externas)
- **Ícones**: Lucide React (já disponível no projeto — substitui Font Awesome)
- **Responsivo**: mobile-first com breakpoints Tailwind
- **Seções IA**: fundo gradiente diferenciado para hierarquia visual

## Alterações no Roteamento

- Adicionar rota `/landing` apontando para `Landing.tsx`
- A rota `/` continuará protegida para o Dashboard (sem alterar fluxo admin)
- Opcionalmente, redirecionar visitantes não-autenticados de `/` para `/landing`

## Seções Detalhadas

1. **Hero**: gradiente de fundo, headline bold, botão CTA grande com hover animado, badge de prova social, placeholder de mockup do sistema
2. **Problema & Solução**: grid 2 colunas — dores à esquerda (ícones vermelhos), soluções à direita (ícones verdes)
3. **Experimentador Virtual**: fundo gradiente especial, badge "Exclusivo", fluxo em 3 passos ilustrado, benefícios em cards
4. **Importador por Foto**: layout com imagem + texto, destaque do fluxo automatizado
5. **Insights IA**: cards com exemplos visuais de insights gerados
6. **Features**: grid 3x3 de cards com ícone, título e frase de benefício
7. **Catálogo Online**: mockup + benefícios para WhatsApp/Instagram
8. **Prova Social**: 3 depoimentos com avatar, nome, loja, cidade, estrelas
9. **Preços**: 3 cards, Prata destacado com badge "Mais popular", lista de features com checks
10. **FAQ**: Accordion com 6 perguntas
11. **CTA Final**: fundo gradiente, headline emocional, botão grande
12. **Rodapé**: logo, links, copyright

## Observações

- Todos os CTAs direcionarão para uma âncora de preços ou link de contato/WhatsApp (a definir)
- Mockups do sistema serão placeholders estilizados (divs com layout que simulam telas do sistema)
- Nenhuma dependência externa adicional — usa apenas o que já existe no projeto (Tailwind, Lucide, Radix)

