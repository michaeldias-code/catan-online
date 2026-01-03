# Guia de Desenvolvimento - Arquivos Modificados

Este documento lista os arquivos que foram alterados ou criados durante o desenvolvimento deste projeto Catan para facilitar a manutenção e o backup.

## 核心 Arquivo Principal
- `app/page.tsx`: O coração do projeto. Contém ~1500 linhas de código abrangendo:
    - **Estado Global**: Gerenciamento complexo do estado do jogo (`GameState`).
    - **Lógica de Grafo**: `buildGraphFromHexagons` para criar a malha do tabuleiro.
    - **Regras de Negócio**: Validações de construção (`canPlaceSettlement`, `canPlaceRoad`), sistema de turnos e economia.
    - **Motor de Renderização**: Uso intensivo de HTML5 Canvas para desenhar o tabuleiro, construções e feedbacks visuais.
    - **Interatividade**: Sistema de detecção de proximidade (`findClosestPosition`) refinado para priorizar o contexto do clique (vilas vs estradas).
    - **Áudio**: Sistema de feedback sonoro com pré-carregamento e desbloqueio por interação.
- `lib/supabase.ts`: Configuração do cliente Supabase com proteção de credenciais.

## 🛠️ Scripts de Auxílio (Raiz do Projeto)
Estes arquivos JavaScript foram criados para analisar e validar a estrutura do tabuleiro durante o desenvolvimento:
- `analyze_connections.js`: Utilizado para validar como as arestas se conectam aos vértices.
- `analyze_vertices.js`: Script para depuração da lógica de criação e fusão de vértices.
- `debug_edges.js`: Ferramenta para verificar o mapeamento de IDs de arestas.
- `vertex_edge_mapping.js`: Referência para a relação entre os pontos e as linhas do tabuleiro.

## 📄 Documentação e Controle
- `progresso.md`: Registro detalhado de funcionalidades concluídas, roadmap multiplayer e links de acesso.
- `devguide.md`: Este guia técnico de arquivos.
- `package.json`: Configurações de dependências (Next.js, React, Lucide-React, Tailwind CSS).

## 🎨 Estilos e Configurações
- `app/globals.css`: Definições de cores e estilos base do Tailwind.
- `app/layout.tsx`: Estrutura base do Next.js (Metadata, Fonts).
- `tailwind.config.ts` / `postcss.config.mjs`: Configurações de estilização.

---

## 🛠️ Notas Técnicas de Manutenção

### Sistema de Construção de Estradas
A lógica foi unificada para garantir consistência total entre o que o jogador vê e o que ele pode clicar:
1.  **Renderização**: O `useEffect` de desenho usa `allowedEdges` para pintar as bolinhas amarelas.
2.  **Interação**: `findClosestPosition` agora filtra arestas no modo estrada, permitindo apenas o retorno de IDs presentes na lógica de "bolinhas amarelas".
3.  **Prioridade de Clique**: No modo estrada, o sistema prioriza o clique em arestas válidas se estiverem próximas, mas ainda permite clicar em vilas próprias para trocar a origem da construção.

### Segurança e Variáveis de Ambiente
O projeto agora utiliza variáveis de ambiente para proteger as chaves do Supabase:
- O arquivo `lib/supabase.ts` não contém mais chaves "hardcoded".
- As chaves devem ser configuradas no arquivo `.env.local` (que está no `.gitignore`).
- Variáveis necessárias: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Deploy e Links
- **Deploy**: Realizado via Vercel com CI/CD automático.
- **Domínio**: [opencatan.vercel.app](https://opencatan.vercel.app)
- **GitHub**: [github.com/michaeldias-code/catan-online](https://github.com/michaeldias-code/catan-online)
