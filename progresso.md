# Progresso do Projeto Catan

Status atual das funcionalidades do jogo e roteiro para versão multiplayer online. O jogo encontra-se atualmente em estado **jogável**, com todas as regras básicas de construção e economia implementadas.

**Link do Jogo:** [opencatan.vercel.app](https://opencatan.vercel.app)
**Repositório:** [github.com/michaeldias-code/catan-online](https://github.com/michaeldias-code/catan-online)

## ✅ Funcionalidades Implementadas (Feito)

- [x] **Infraestrutura e Backend**:
    - [x] **Supabase Realtime**: Sincronização automática do estado do jogo entre múltiplos jogadores.
    - [x] **Gerenciamento de Salas**: Sistema de lobby com códigos de sala (ex: SALA1) para conectar jogadores.
    - [x] **Segurança e Configuração**: Proteção de credenciais via variáveis de ambiente (`.env.local`) com fallback seguro para evitar quebras de carregamento.
- [x] **Sincronização do Estado do Jogo**:
    - [x] **Persistência no Banco de Dados**: Estado do jogo salvo em tempo real no Supabase.
    - [x] **Realtime Updates**: Atualização instantânea da interface ao receber mudanças remotas.
- [x] **Tabuleiro Hexagonal**: Geração dinâmica de 19 hexágonos com recursos e números.
- [x] **Sistema de Recursos**: Definição de Madeira, Tijolo, Ovelha, Trigo e Minério com cores e ícones específicos.
- [x] **Gráfico de Conexões**: Construção automática de vértices e arestas com detecção de proximidade para fusão de pontos.
- [x] **Posicionamento de Aldeias (Settlements)**: Lógica de construção respeitando a regra de distância (mínimo 2 arestas de distância).
- [x] **Posicionamento de Estradas (Roads)**:
    - [x] Lógica de conectividade a partir de construções existentes.
    - [x] **Destaque Visual**: Bolinhas amarelas indicando onde é permitido construir.
    - [x] **Trava de Construção**: Impedimento total de cliques em locais não permitidos, garantindo que o jogador siga as regras.
    - [x] **Seleção Inteligente**: Melhoria na detecção de cliques para priorizar seleção de vilas ou construção de estradas conforme o contexto.
    - [x] **Refinamento de UX**: Implementação de prioridade de clique e restrição de interação apenas a elementos válidos.
- [x] **Upgrade para Cidades (Cities)**: Substituição de aldeias por cidades com ganho de recursos dobrado.
- [x] **Sistema de Economia e Recursos**:
    - [x] **Distribuição por Dados**: Ganho automático de recursos ao tirar o número correspondente no dado.
    - [x] **Produção Dupla**: Cidades produzem 2 recursos em vez de 1.
    - [x] **Gestão de Inventário**: Controle em tempo real das cartas de recursos de cada jogador.
    - [x] **Custos de Construção**: Validação e dedução automática de recursos ao construir (Estrada, Vila, Cidade).
- [x] **Sistema de Pontuação**:
    - [x] Contagem automática de Pontos de Vitória (1 por Vila, 2 por Cidade).
    - [x] Detecção de vencedor ao atingir 10 pontos.
- [x] **Sistema de Turnos Completo**:
    - [x] **Fase de Setup**: Ordem de posicionamento inicial (1-2-3-4-4-3-2-1) com ganho de recursos no segundo round.
    - [x] **Fase de Jogo**: Alternância de turnos, lançamento de dados e controle de ações.
- [x] **Interface de Usuário (UI) Avançada**:
    - [x] Canvas interativo com suporte a hover, clique e efeitos sonoros.
    - [x] Painel lateral moderno com inventário e status dos jogadores.
    - [x] Modal de Regras e Custos de construção.
    - [x] Modal de Vitória com anúncio do vencedor.
    - [x] **Rodapé Informativo**: Links para o deploy e repositório GitHub.
- [x] **Sons e Feedback**:
    - [x] Efeitos sonoros para construção, dados, virada de turno e vitória.
    - [x] Opção para ativar/desativar áudio.
    - [x] Sistema de pré-carregamento de áudio para evitar atrasos.
- [x] **Ferramentas de Desenvolvimento**:
    - [x] Modo Debug para visualizar IDs de vértices e arestas.
    - [x] Ajuste fino de posição dos hexágonos via interface.
    - [x] Exportação/Importação do estado do tabuleiro via JSON.
- [x] **Deploy e Disponibilidade**:
    - [x] Deploy realizado com sucesso no Vercel.

## 🚀 Requisitos para Multiplayer Online (Pendente)

### 1. Infraestrutura e Backend (Concluído ✅)
- [x] **Servidor Real-time**: Implementação via Supabase Realtime.
- [x] **Gerenciamento de Salas**: Criação e entrada em lobbies com códigos de acesso.
- [ ] **Autenticação**: Cadastro e login de jogadores para salvar progresso/estatísticas.

### 2. Sincronização do Estado do Jogo (Concluído ✅)
- [x] **Persistência**: Estado do jogo sincronizado via JSON no banco de dados.
- [ ] **Validação de Jogadas**: O servidor deve validar se uma construção é permitida antes de replicar para os outros.

### 3. Mecânicas de Jogo Avançadas
- [ ] **Sistema de Trocas**: Interface para troca de recursos entre jogadores e com o porto/banco.
- [ ] **Cartas de Desenvolvimento**: Compra e uso de cartas (Cavaleiro, Progresso, Pontos de Vitória).
- [ ] **O Ladrão (Robber)**: Mecânica de bloqueio de hexágono e roubo de cartas.
- [ ] **Bônus Especiais**: Maior Estrada e Maior Exército.

### 4. Melhorias de UX Online
- [x] **Chat**: Sistema de mensagens entre os jogadores na sala.
- [ ] **Indicador de Turno**: Notificações e timers para o jogador da vez.
- [x] **Reconexão**: Capacidade de voltar ao jogo em caso de queda de internet.

### 5. Ajustes e Finalização
- [ ] **Corrigir bug players**: Resolver problemas na atribuição e troca de IDs de jogadores.
- [ ] **Criar novos tabuleiros**: Implementar layouts alternativos de recursos e números.
- [x] **Colocar disclaimer**: Adicionar aviso legal sobre a natureza do projeto e uso de recursos.
- [ ] **Melhorar visualização de recursos**: Visão geral versus visual de recursos individuais.