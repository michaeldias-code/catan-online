# Guia de Desenvolvimento - Arquivos Modificados

Este documento lista os arquivos que foram alterados ou criados durante o desenvolvimento deste projeto Catan para facilitar a manutenção e o backup.

## 核心 Arquivo Principal
- `app/page.tsx`: Contém 100% da lógica do frontend, gerenciamento de estado do React, renderização do Canvas e lógica de regras do jogo (construções, conexões, etc).

## 🛠️ Scripts de Auxílio (Raiz do Projeto)
Estes arquivos JavaScript foram criados para analisar e validar a estrutura do tabuleiro durante o desenvolvimento:
- `analyze_connections.js`: Utilizado para validar como as arestas se conectam aos vértices.
- `analyze_vertices.js`: Script para depuração da lógica de criação e fusão de vértices.
- `debug_edges.js`: Ferramenta para verificar o mapeamento de IDs de arestas.
- `vertex_edge_mapping.js`: Referência para a relação entre os pontos e as linhas do tabuleiro.

## 📄 Documentação e Controle
- `progresso.md`: (Novo) Registro de funcionalidades concluídas e roadmap multiplayer.
- `devguide.md`: (Novo) Este guia de arquivos modificados.
- `package.json`: Configurações de dependências (Next.js, React, Lucide-React, Tailwind CSS).

## 🎨 Estilos e Configurações
- `app/globals.css`: Definições de cores e estilos base do Tailwind.
- `app/layout.tsx`: Estrutura base do Next.js (Metadata, Fonts).
- `tailwind.config.ts` / `postcss.config.mjs`: Configurações de estilização.

---
**Nota para Manutenção**: Toda a lógica de "Bolinhas Amarelas" e travas de construção reside nas funções `findClosestPosition` (que agora gerencia estritamente o que é clicável), `canPlaceRoad` e no `useEffect` de renderização dentro do `app/page.tsx`. A detecção de proximidade foi unificada para garantir que apenas elementos válidos disparem eventos de hover/clique.

