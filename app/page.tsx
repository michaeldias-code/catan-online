"use client"
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Dices, Home, Building, Info, HelpCircle, Volume2, VolumeX, LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Hexagon = {
  id: string;
  x: number;
  y: number;
  radius: number;
  resource: string;
  number: number;
};

type Vertex = {
  id: string;
  x: number;
  y: number;
  position: number;
};

type Edge = {
  id: string;
  v1: Vertex;
  v2: Vertex;
  midX: number;
  midY: number;
};

type Ownership = { player: number };

const VERTEX_MERGE_DISTANCE = 5;

const buildGraphFromHexagons = (hexagons: Hexagon[]) => {
  const vertices: Vertex[] = [];
  const edgesMap = new Map<string, Edge>();
  let nextPosition = 1;

  const getOrCreateVertex = (x: number, y: number) => {
    const existing = vertices.find(vertex =>
      Math.hypot(vertex.x - x, vertex.y - y) < VERTEX_MERGE_DISTANCE
    );
    if (existing) {
      return existing;
    }

    const vertex = {
      id: `v_${Math.round(x * 100)}_${Math.round(y * 100)}`,
      x,
      y,
      position: nextPosition++
    };
    vertices.push(vertex);
    return vertex;
  };

  hexagons.forEach(hex => {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const vx = hex.x + hex.radius * Math.cos(angle);
      const vy = hex.y + hex.radius * Math.sin(angle);

      const nextAngle = (Math.PI / 3) * ((i + 1) % 6);
      const nvx = hex.x + hex.radius * Math.cos(nextAngle);
      const nvy = hex.y + hex.radius * Math.sin(nextAngle);

      const v1 = getOrCreateVertex(vx, vy);
      const v2 = getOrCreateVertex(nvx, nvy);
      const edgeId = [v1.id, v2.id].sort().join('_');

      if (!edgesMap.has(edgeId)) {
        edgesMap.set(edgeId, {
          id: edgeId,
          v1,
          v2,
          midX: (v1.x + v2.x) / 2,
          midY: (v1.y + v2.y) / 2
        });
      }
    }
  });

  return {
    vertices,
    edges: Array.from(edgesMap.values())
  };
};

const DEFAULT_HEXAGONS: Hexagon[] = [
  { id: "hex_0", x: 456, y: 247, radius: 60, resource: "wood", number: 5 },
  { id: "hex_1", x: 545, y: 194, radius: 60, resource: "ore", number: 4 },
  { id: "hex_2", x: 723, y: 194, radius: 60, resource: "sheep", number: 5 },
  { id: "hex_3", x: 366, y: 299, radius: 60, resource: "ore", number: 10 },
  { id: "hex_4", x: 545, y: 299, radius: 60, resource: "wood", number: 12 },
  { id: "hex_5", x: 634, y: 247, radius: 60, resource: "brick", number: 4 },
  { id: "hex_6", x: 723, y: 299, radius: 60, resource: "ore", number: 10 },
  { id: "hex_7", x: 275, y: 350, radius: 60, resource: "wood", number: 3 },
  { id: "hex_8", x: 455, y: 350, radius: 60, resource: "wheat", number: 11 },
  { id: "hex_9", x: 635, y: 350, radius: 60, resource: "wheat", number: 9 },
  { id: "hex_10", x: 813, y: 350, radius: 60, resource: "brick", number: 6 },
  { id: "hex_11", x: 812, y: 247, radius: 60, resource: "brick", number: 8 },
  { id: "hex_12", x: 365, y: 401, radius: 60, resource: "sheep", number: 8 },
  { id: "hex_13", x: 545, y: 401, radius: 60, resource: "sheep", number: 6 },
  { id: "hex_14", x: 725, y: 401, radius: 60, resource: "wood", number: 3 },
  { id: "hex_15", x: 903, y: 401, radius: 60, resource: "sheep", number: 11 },
  { id: "hex_16", x: 455, y: 453, radius: 60, resource: "wheat", number: 2 },
  { id: "hex_17", x: 635, y: 453, radius: 60, resource: "desert", number: 0 },
  { id: "hex_18", x: 815, y: 453, radius: 60, resource: "wheat", number: 9 }
];

const RESOURCES: Record<string, { color: string; name: string; icon: string; textColor: string }> = {
  wood: { color: '#2D5A27', name: 'Madeira', icon: '🌲', textColor: '#FFFFFF' },
  brick: { color: '#A52A2A', name: 'Tijolo', icon: '🧱', textColor: '#FFFFFF' },
  sheep: { color: '#88B04B', name: 'Ovelha', icon: '🐑', textColor: '#000000' },
  wheat: { color: '#F2C94C', name: 'Trigo / Milho', icon: '🌾', textColor: '#000000' },
  ore: { color: '#7B8D8E', name: 'Minério', icon: '⛰️', textColor: '#FFFFFF' },
  desert: { color: '#E3C58E', name: 'Deserto', icon: '🏜️', textColor: '#000000' }
};

const PLAYERS: Record<number, { color: string; name: string }> = {
  1: { color: '#FF4444', name: 'Vermelho' },
  2: { color: '#4444FF', name: 'Azul' },
  3: { color: '#FFFFFF', name: 'Branco' },
  4: { color: '#FFA500', name: 'Laranja' }
};

const SOUNDS: Record<string, string> = {
  settlement: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  dice: 'https://assets.mixkit.co/active_storage/sfx/1017/1017-preview.mp3',
  nextTurn: 'https://assets.mixkit.co/active_storage/sfx/2567/2567-preview.mp3',
};

type SerializedGameState = Omit<GameState, 'board'> & {
  board: Omit<GameState['board'], 'settlements' | 'roads' | 'cities'> & {
    settlements: [string, Ownership][];
    roads: [string, Ownership][];
    cities: [string, Ownership][];
  }
};

const BUILDING_COSTS: Record<string, Record<string, number>> = {
  settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
  road: { wood: 1, brick: 1 },
  city: { wheat: 2, ore: 3 }
};

type GameState = {
  players: Record<number, {
    color: string;
    name: string;
    resources: Record<string, number>;
  }>;
  board: {
    hexagons: Hexagon[];
    vertices: Vertex[];
    edges: Edge[];
    settlements: Map<string, Ownership>;
    roads: Map<string, Ownership>;
    cities: Map<string, Ownership>;
  };
  currentTurn: number;
  gamePhase: 'lobby' | 'setup' | 'playing';
  dice: [number, number];
  setupTurn: number;
  setupSubPhase: 'settlement' | 'road';
  playerCount: number;
};

export default function CatanGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [roomCode, setRoomCode] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState<number | null>(null);
  const [presencePlayers, setPresencePlayers] = useState<any[]>([]);
  const [mode, setMode] = useState<'settlement' | 'road' | 'city'>('settlement');
  const [debugMode, setDebugMode] = useState(false);
  const [hoveredPosition, setHoveredPosition] = useState<{ type: string; id: string } | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showVertexNumbers, setShowVertexNumbers] = useState(true);
  const [selectedSettlement, setSelectedSettlement] = useState<string | null>(null);
  const [allowedEdges, setAllowedEdges] = useState<string[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  
  const sessionId = useMemo(() => Math.random().toString(36).substring(7), []);

  const [gameState, setGameStateInternal] = useState<GameState>(() => {
    const { vertices, edges } = buildGraphFromHexagons(DEFAULT_HEXAGONS);
    const initialResources: Record<number, Record<string, number>> = {};
    [1, 2, 3, 4].forEach(p => {
      initialResources[p] = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
    });

    return {
      players: {
        1: { ...PLAYERS[1], resources: initialResources[1] },
        2: { ...PLAYERS[2], resources: initialResources[2] },
        3: { ...PLAYERS[3], resources: initialResources[3] },
        4: { ...PLAYERS[4], resources: initialResources[4] },
      },
      board: {
        hexagons: DEFAULT_HEXAGONS,
        vertices,
        edges,
        settlements: new Map(),
        roads: new Map(),
        cities: new Map(),
      },
      currentTurn: 1,
      gamePhase: 'lobby',
      dice: [0, 0],
      setupTurn: 0,
      setupSubPhase: 'settlement',
      playerCount: 4
    };
  });

  const serializeGameState = (state: GameState): SerializedGameState => {
    return {
      ...state,
      board: {
        ...state.board,
        settlements: Array.from(state.board.settlements.entries()),
        roads: Array.from(state.board.roads.entries()),
        cities: Array.from(state.board.cities.entries()),
      }
    };
  };

  const deserializeGameState = (data: SerializedGameState): GameState | null => {
    if (!data) return null;
    
    try {
      console.log('Deserializando estado recebido:', data);
      const board = data.board || {};
      return {
        ...data,
        board: {
          hexagons: board.hexagons || DEFAULT_HEXAGONS,
          vertices: board.vertices || buildGraphFromHexagons(board.hexagons || DEFAULT_HEXAGONS).vertices,
          edges: board.edges || buildGraphFromHexagons(board.hexagons || DEFAULT_HEXAGONS).edges,
          settlements: new Map<string, Ownership>(board.settlements || []),
          roads: new Map<string, Ownership>(board.roads || []),
          cities: new Map<string, Ownership>(board.cities || []),
        }
      };
    } catch (e) {
      console.error('Erro ao deserializar estado:', e);
      return null;
    }
  };

  const updateRemoteState = useCallback(async (newState: GameState) => {
    if (!roomCode) return;
    
    const serialized = serializeGameState(newState);
    const { error } = await supabase
      .from('games')
      .upsert({ 
        room_code: roomCode, 
        state: serialized,
        updated_at: new Date().toISOString()
      }, { onConflict: 'room_code' });

    if (error) console.error('Erro ao salvar estado:', error);
  }, [roomCode]);

  const setGameState = useCallback((update: GameState | ((prev: GameState) => GameState)) => {
    setGameStateInternal(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      updateRemoteState(next);
      return next;
    });
  }, [updateRemoteState]);

  const joinRoom = useCallback(async () => {
    if (!roomCode.trim() || isLoading) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('games')
        .select('state')
        .eq('room_code', roomCode)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const deserialized = deserializeGameState(data.state as SerializedGameState);
        if (deserialized) {
          setGameStateInternal(deserialized);
        }
      } else {
        // Criar nova sala se não existir
        await updateRemoteState(gameState);
      }

      setIsJoined(true);
    } catch (err) {
      console.error('Erro ao entrar na sala:', err);
      alert('Erro ao entrar na sala. Verifique o console ou as chaves do Supabase.');
    } finally {
      setIsLoading(false);
    }
  }, [roomCode, isLoading, gameState, updateRemoteState]);

  useEffect(() => {
    if (!isJoined || !roomCode) return;

    const channel = supabase.channel(`room:${roomCode}`, {
      config: {
        presence: {
          key: roomCode,
        },
      },
    });

    channel
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `room_code=eq.${roomCode}`
      }, (payload) => {
        if (payload.new && (payload.new as any).state) {
          const deserialized = deserializeGameState((payload.new as any).state as SerializedGameState);
          if (deserialized) {
            setGameStateInternal(deserialized);
          }
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const presences = Object.values(newState).flat();
        
        // Remover duplicados por session_id (comum durante reconexões rápidas)
        const uniquePresencesMap = new Map();
        presences.forEach((p: any) => {
          if (!uniquePresencesMap.has(p.session_id) || 
              new Date(p.joined_at) > new Date(uniquePresencesMap.get(p.session_id).joined_at)) {
            uniquePresencesMap.set(p.session_id, p);
          }
        });
        const uniquePresences = Array.from(uniquePresencesMap.values());

        // Ordenar presenças por data de entrada para garantir IDs consistentes
        const sortedPresences = uniquePresences.sort((a: any, b: any) => a.joined_at.localeCompare(b.joined_at));
        setPresencePlayers(sortedPresences);
        
        const myIdx = sortedPresences.findIndex((p: any) => p.session_id === sessionId);
        if (myIdx !== -1) {
          setMyPlayerId(myIdx + 1);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            session_id: sessionId,
            joined_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isJoined, roomCode, sessionId]);

  const initialized = gameState.board.hexagons.length > 0;
  const setupOrder = useMemo(() => {
    const pCount = gameState.playerCount;
    const firstRound = Array.from({ length: pCount }, (_, i) => i + 1);
    const secondRound = [...firstRound].reverse();
    return [...firstRound, ...secondRound];
  }, [gameState.playerCount]);

  const startGame = useCallback(() => {
    if (presencePlayers.length < 2 && !debugMode) return;
    
    setGameState(prev => {
      const numPlayers = debugMode ? 4 : presencePlayers.length;
      const initialResources: Record<number, Record<string, number>> = {};
      
      const players: Record<number, any> = {};
      for (let i = 1; i <= 4; i++) {
        if (i <= numPlayers) {
          players[i] = { 
            ...PLAYERS[i], 
            resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 } 
          };
        } else {
          // Remover jogadores extras
          delete players[i];
        }
      }

      return {
        ...prev,
        players,
        playerCount: numPlayers,
        gamePhase: 'setup',
        currentTurn: 1,
        setupTurn: 0,
      };
    });
  }, [presencePlayers, setGameState, debugMode]);
  
  // Sincroniza o modo com a fase de setup
  useEffect(() => {
    if (gameState.gamePhase === 'setup') {
      setMode(gameState.setupSubPhase);
    }
  }, [gameState.gamePhase, gameState.setupSubPhase]);

  // Efeito para simular o carregamento inicial do tabuleiro após entrar na sala
  useEffect(() => {
    if (isJoined) {
      setIsInitialLoading(true);
      const timer = setTimeout(() => {
        setIsInitialLoading(false);
      }, 1500); // 1.5 segundos de delay para charme e garantir renderização
      return () => clearTimeout(timer);
    }
  }, [isJoined]);

  // Removido useEffect redundante que causava loop infinito na sincronização

  // Função para "desbloquear" o áudio no navegador após a primeira interação
  const unlockAudio = useCallback(() => {
    Object.values(audioRefs.current).forEach(audio => {
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
      }).catch(() => {});
    });
    // Remove os listeners após a primeira tentativa de desbloqueio
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
  }, []);

  useEffect(() => {
    // Pré-carregamento dos áudios para evitar atrasos e melhorar compatibilidade
    Object.entries(SOUNDS).forEach(([name, url]) => {
      try {
        const audio = new Audio();
        // Configurações para melhorar compatibilidade e evitar bloqueios de CORS
        audio.crossOrigin = 'anonymous';
        audio.src = url;
        audio.preload = 'auto';
        
        // Adiciona listeners para depurar carregamento
        audio.onerror = () => {
          console.warn(`❌ Erro ao carregar fonte de áudio: ${name} (${url}). Verifique se o link ainda é válido.`);
        };
        
        audio.load();
        audioRefs.current[name] = audio;
      } catch (e) {
        console.error(`Erro ao pré-carregar áudio ${name}:`, e);
      }
    });

    // Adiciona listeners para desbloquear áudio no primeiro clique do usuário
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, [unlockAudio]);

  const playSound = useCallback((soundName: string) => {
    if (!audioEnabled || !(soundName in SOUNDS)) return;
    
    const audio = audioRefs.current[soundName];
    if (audio) {
      // Se o áudio teve erro no carregamento inicial, tentamos recriá-lo uma vez
      if (audio.error) {
        console.warn(`🔄 Tentando recarregar áudio ${soundName} devido a erro anterior.`);
        const retryAudio = new Audio((SOUNDS as any)[soundName]);
        audioRefs.current[soundName] = retryAudio;
        retryAudio.play().catch(e => {});
        return;
      }

      audio.currentTime = 0;
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn(`⚠️ Erro ao tocar som ${soundName}:`, err.name, err.message);
          
          // Se for erro de formato/fonte, tenta um fallback criando novo objeto
          if (err.name === 'NotSupportedError' || err.name === 'NotAllowedError') {
            const fallback = new Audio((SOUNDS as any)[soundName]);
            fallback.play().catch(e => {});
          }
        });
      }
    } else {
      // Caso não tenha sido pré-carregado
      const fallback = new Audio((SOUNDS as any)[soundName]);
      fallback.play().catch(e => {});
    }
  }, [audioEnabled]);

  const playerVPs = useMemo(() => {
    const vps: Record<number, number> = {};
    for (let i = 1; i <= gameState.playerCount; i++) vps[i] = 0;
    gameState.board.settlements.forEach(own => { if (vps[own.player] !== undefined) vps[own.player] += 1; });
    gameState.board.cities.forEach(own => { if (vps[own.player] !== undefined) vps[own.player] += 2; });
    return vps;
  }, [gameState.board.settlements, gameState.board.cities, gameState.playerCount]);

  const winner = useMemo(() => {
    const winnerEntry = Object.entries(playerVPs).find(([_, vps]) => (vps as number) >= 10);
    return winnerEntry ? Number(winnerEntry[0]) : null;
  }, [playerVPs]);

  useEffect(() => {
    if (winner) {
      playSound('victory');
    }
  }, [winner, playSound]);

  const getEdgesConnectedToVertex = useCallback((vertexId: string) => {
    return gameState.board.edges.filter(edge =>
      edge?.v1?.id === vertexId || edge?.v2?.id === vertexId
    );
  }, [gameState.board.edges]);

  const getAvailableEdgesForSettlement = useCallback((vertexId: string) => {
    return getEdgesConnectedToVertex(vertexId).filter(edge => !gameState.board.roads.has(edge.id));
  }, [getEdgesConnectedToVertex, gameState.board.roads]);

  const getReachableVertices = useCallback((vertexId: string) => {
    const reachable = new Set<string>(); // All vertices reachable by roads
    const passable = new Set<string>();  // Vertices we can build FROM (not blocked)
    const stack: string[] = [vertexId];
    
    // The starting settlement is always passable
    passable.add(vertexId);
    reachable.add(vertexId);

    const visited = new Set<string>();

    while (stack.length > 0) {
      const currentVertexId = stack.pop()!;
      if (visited.has(currentVertexId)) continue;
      visited.add(currentVertexId);

      const connectedEdges = gameState.board.edges.filter(e =>
        e.v1.id === currentVertexId || e.v2.id === currentVertexId
      );

      connectedEdges.forEach(edge => {
        const roadOwner = gameState.board.roads.get(edge.id);
        if (!roadOwner || roadOwner.player !== gameState.currentTurn) return;

        const neighborId = edge.v1.id === currentVertexId ? edge.v2.id : edge.v1.id;
        
        reachable.add(neighborId);
        
        const hasOpponentBuilding = (gameState.board.settlements.has(neighborId) && gameState.board.settlements.get(neighborId)!.player !== gameState.currentTurn) ||
                                     (gameState.board.cities.has(neighborId) && gameState.board.cities.get(neighborId)!.player !== gameState.currentTurn);
        
        if (!hasOpponentBuilding) {
          passable.add(neighborId);
          if (!visited.has(neighborId)) {
            stack.push(neighborId);
          }
        }
      });
    }

    return { reachable, passable };
  }, [gameState.board.edges, gameState.board.roads, gameState.board.settlements, gameState.board.cities, gameState.currentTurn]);

  // Atualiza arestas permitidas para estradas
  useEffect(() => {
    if (mode === 'road' && selectedSettlement) {
      const { passable } = getReachableVertices(selectedSettlement);
      const valid = gameState.board.edges.filter(edge => {
        if (gameState.board.roads.has(edge.id)) return false;
        return passable.has(edge.v1.id) || passable.has(edge.v2.id);
      }).map(e => e.id);
      setAllowedEdges(valid);
    } else {
      setAllowedEdges([]);
    }
  }, [mode, selectedSettlement, gameState.board.edges, gameState.board.roads, getReachableVertices]);

useEffect(() => {
  if (!initialized) {
    if (debugMode) console.log('Drawing aborted: not initialized');
    return;
  }
  const canvas = canvasRef.current;
  if (!canvas) {
    if (debugMode) console.log('Drawing aborted: no canvas');
    return;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  console.log('Drawing board with', gameState.board.hexagons.length, 'hexagons');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Desenha hexágonos
    gameState.board.hexagons.forEach(hex => {
      const resource = RESOURCES[hex.resource];
      
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = hex.x + hex.radius * Math.cos(angle);
      const y = hex.y + hex.radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
      
      // Sombra projetada leve
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;

      ctx.fillStyle = resource.color;
    ctx.fill();
      
      // Reset shadow para não afetar o resto
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Borda do hexágono
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

      // Desenhar ícone do recurso em volta
      ctx.save();
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.6;
      
      // Desenha 3 ícones pequenos ao redor do centro
      const iconDist = hex.radius * 0.5;
      for (let i = 0; i < 3; i++) {
        const angle = (Math.PI * 2 / 3) * i - Math.PI / 6;
        const ix = hex.x + iconDist * Math.cos(angle);
        const iy = hex.y + iconDist * Math.sin(angle);
        ctx.fillText(resource.icon, ix, iy);
      }
      ctx.restore();

      // Número (Token)
      if (hex.number > 0) {
        // Círculo marfim para o número
        ctx.beginPath();
        ctx.arc(hex.x, hex.y, 18, 0, Math.PI * 2);
        ctx.fillStyle = '#FDF5E6';
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.strokeStyle = '#5D4037';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = (hex.number === 6 || hex.number === 8) ? '#D32F2F' : '#212121';
        ctx.font = 'bold 16px "Segoe UI", Arial';
        ctx.fillText(hex.number.toString(), hex.x, hex.y);

        // Pontinhos de probabilidade (Catan style)
        const dots = hex.number === 2 || hex.number === 12 ? 1 :
                    hex.number === 3 || hex.number === 11 ? 2 :
                    hex.number === 4 || hex.number === 10 ? 3 :
                    hex.number === 5 || hex.number === 9 ? 4 :
                    hex.number === 6 || hex.number === 8 ? 5 : 0;
        
        const dotSize = 2;
        const dotSpacing = 4;
        const startX = hex.x - ((dots - 1) * dotSpacing) / 2;
        
        ctx.fillStyle = (hex.number === 6 || hex.number === 8) ? '#D32F2F' : '#212121';
        for (let j = 0; j < dots; j++) {
          ctx.beginPath();
          ctx.arc(startX + j * dotSpacing, hex.y + 10, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
    }
  });

  // Debug Mode
  if (debugMode) {
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    const highlightedEdgeIds = new Set<string>();
    if (selectedSettlement) {
      getAvailableEdgesForSettlement(selectedSettlement).forEach(edge => {
        if (edge?.id) highlightedEdgeIds.add(edge.id);
      });
    } else {
      gameState.board.settlements.forEach((_, vertexId) => {
        getEdgesConnectedToVertex(vertexId).forEach(edge => {
          if (edge?.id) highlightedEdgeIds.add(edge.id);
        });
      });
    }
    const edgesToDraw = highlightedEdgeIds.size > 0
        ? gameState.board.edges.filter(edge => highlightedEdgeIds.has(edge.id))
        : gameState.board.edges;

      gameState.board.vertices.forEach(vertex => {
      ctx.fillStyle = '#00FF00';
      ctx.beginPath();
      ctx.arc(vertex.x, vertex.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`V${vertex.position}`, vertex.x, vertex.y - 8);
    });

    edgesToDraw.forEach(edge => {
      ctx.fillStyle = '#FFFF00';
      ctx.beginPath();
      ctx.arc(edge.midX, edge.midY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.font = '8px Arial';
      const shortId = edge.id.substring(edge.id.length - 10);
      ctx.fillText(shortId, edge.midX, edge.midY + 12);
    });
  }

  // Estradas já construídas
  gameState.board.roads.forEach((road, edgeId) => {
      const edge = gameState.board.edges.find(e => e.id === edgeId);
    if (edge) {
      ctx.beginPath();
      ctx.moveTo(edge.v1.x, edge.v1.y);
      ctx.lineTo(edge.v2.x, edge.v2.y);
      ctx.strokeStyle = PLAYERS[road.player].color;
      ctx.lineWidth = 6;
      ctx.stroke();
    }
  });

  // Vilas
  gameState.board.settlements.forEach((settlement, vertexId) => {
      const vertex = gameState.board.vertices.find(v => v.id === vertexId);
    if (vertex) {
      ctx.beginPath();
      ctx.arc(vertex.x, vertex.y, 12, 0, Math.PI * 2);
      ctx.fillStyle = PLAYERS[settlement.player].color;
      ctx.fill();
      ctx.strokeStyle = selectedSettlement === vertexId ? '#FFFF00' : '#000';
      ctx.lineWidth = selectedSettlement === vertexId ? 4 : 2;
      ctx.stroke();
      if (showVertexNumbers) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${vertex.position}`, vertex.x, vertex.y);
      }
    }
  });

  // Cidades
  gameState.board.cities.forEach((city, vertexId) => {
      const vertex = gameState.board.vertices.find(v => v.id === vertexId);
    if (vertex) {
      ctx.fillStyle = PLAYERS[city.player].color;
      ctx.fillRect(vertex.x - 10, vertex.y - 10, 20, 20);
      ctx.strokeStyle = selectedSettlement === vertexId ? '#FFFF00' : '#000';
      ctx.lineWidth = selectedSettlement === vertexId ? 4 : 2;
      ctx.strokeRect(vertex.x - 10, vertex.y - 10, 20, 20);
      if (showVertexNumbers) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${vertex.position}`, vertex.x, vertex.y);
      }
    }
  });

    // Bolinhas Amarelas (Arestas Permitidas)
    if (mode === 'road' && allowedEdges.length > 0) {
    ctx.globalAlpha = 0.4;
      allowedEdges.forEach(edgeId => {
        const edge = gameState.board.edges.find(e => e.id === edgeId);
        if (edge) {
      ctx.beginPath();
      ctx.arc(edge.midX, edge.midY, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFF00';
      ctx.fill();
        }
    });
    ctx.globalAlpha = 1;
  }

  // Hover
  if (hoveredPosition) {
    ctx.globalAlpha = 0.5;
    if (mode === 'road' && hoveredPosition.type === 'edge') {
        const edge = gameState.board.edges.find(e => e.id === hoveredPosition.id);
      if (edge) {
        ctx.beginPath();
        ctx.moveTo(edge.v1.x, edge.v1.y);
        ctx.lineTo(edge.v2.x, edge.v2.y);
          ctx.strokeStyle = PLAYERS[gameState.currentTurn].color;
        ctx.lineWidth = 6;
        ctx.stroke();
      }
    } else if ((mode === 'settlement' || mode === 'city') && hoveredPosition.type === 'vertex') {
        const vertex = gameState.board.vertices.find(v => v.id === hoveredPosition.id);
      if (vertex) {
        ctx.beginPath();
        ctx.arc(vertex.x, vertex.y, 12, 0, Math.PI * 2);
          ctx.fillStyle = PLAYERS[gameState.currentTurn].color;
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}, [
  gameState,
  hoveredPosition,
    gameState.currentTurn,
  mode,
  initialized,
  isInitialLoading,
  debugMode,
  showVertexNumbers,
  selectedSettlement,
  allowedEdges,
  getEdgesConnectedToVertex,
  getReachableVertices
]);
  const findClosestPosition = (mouseX: number, mouseY: number): { type: 'vertex' | 'edge'; id: string } | null => {
    if (!initialized) return null;

    if (mode === 'road') {
      let closestEdge: { type: 'edge'; id: string } | null = null;
      let minEdgeDist = Infinity;
      let closestVertex: { type: 'vertex'; id: string } | null = null;
      let minVertexDist = Infinity;

      // 1. Procurar vértices do jogador
      gameState.board.vertices.forEach(vertex => {
        if (vertex?.x === undefined) return;
        const hasOwnBuilding = (gameState.board.settlements.has(vertex.id) && gameState.board.settlements.get(vertex.id)?.player === gameState.currentTurn) ||
                               (gameState.board.cities.has(vertex.id) && gameState.board.cities.get(vertex.id)?.player === gameState.currentTurn);
        
        if (hasOwnBuilding) {
          const dist = Math.hypot(vertex.x - mouseX, vertex.y - mouseY);
          if (dist < minVertexDist && dist < 40) {
            minVertexDist = dist;
            closestVertex = { type: 'vertex', id: vertex.id };
          }
        }
      });

      // 2. Procurar arestas válidas para estrada
      gameState.board.edges.forEach(edge => {
        if (edge?.midX === undefined || !canPlaceRoad(edge.id)) return;
        
        const dist = Math.hypot(edge.midX - mouseX, edge.midY - mouseY);
        if (dist < minEdgeDist && dist < 35) {
          minEdgeDist = dist;
          closestEdge = { type: 'edge', id: edge.id };
        }
      });

      // Prioridade: se houver uma aresta válida muito perto do clique, damos preferência a ela
      if (closestEdge && (minEdgeDist < minVertexDist || !closestVertex)) {
        return closestEdge;
      }
      return closestVertex;
    } else {
      let closest: { type: 'vertex' | 'edge'; id: string } | null = null;
      let minDist = Infinity;

      gameState.board.vertices.forEach(vertex => {
        if (vertex?.x === undefined) return;
        const dist = Math.hypot(vertex.x - mouseX, vertex.y - mouseY);
        if (dist < minDist && dist < 35) {
          minDist = dist;
          closest = { type: 'vertex', id: vertex.id };
        }
      });

      return closest;
    }
  };

  const canPlaceSettlement = (vertexId: string) => {
    if (!initialized || !vertexId) return false;

    if (gameState.board.settlements.has(vertexId) || gameState.board.cities.has(vertexId)) {
      return false;
    }

    const adjacentVertices = gameState.board.edges
      .filter(e => e?.v1?.id === vertexId || e?.v2?.id === vertexId)
      .map(e => e.v1.id === vertexId ? e.v2.id : e.v1.id);

    return !adjacentVertices.some(adjId =>
      gameState.board.settlements.has(adjId) || gameState.board.cities.has(adjId)
    );
  };

  const canPlaceRoad = (edgeId: string, fromVertexId?: string) => {
    if (!initialized || !edgeId) return false;
    if (gameState.board.roads.has(edgeId)) return false;

    const edge = gameState.board.edges.find(e => e.id === edgeId);
    if (!edge) return false;

    // Se uma vila específica foi selecionada (importante para o SETUP e para a seleção manual)
    if (fromVertexId || selectedSettlement) {
      const sourceId = fromVertexId || selectedSettlement;
      if (!sourceId) return false;
      const { passable } = getReachableVertices(sourceId);
      return passable.has(edge.v1.id) || passable.has(edge.v2.id);
    }

    // Lógica padrão: conectar a qualquer construção ou estrada própria
    const isVertexConnectable = (vId: string) => {
      const hasOwnBuilding = (gameState.board.settlements.has(vId) && gameState.board.settlements.get(vId)?.player === gameState.currentTurn) ||
                             (gameState.board.cities.has(vId) && gameState.board.cities.get(vId)?.player === gameState.currentTurn);
      if (hasOwnBuilding) return true;

      const hasOpponentBuilding = (gameState.board.settlements.has(vId) && gameState.board.settlements.get(vId)?.player !== gameState.currentTurn) ||
                                  (gameState.board.cities.has(vId) && gameState.board.cities.get(vId)?.player !== gameState.currentTurn);
      if (hasOpponentBuilding) return false;

      return gameState.board.edges.some(e => 
        e.id !== edgeId && 
        (e.v1.id === vId || e.v2.id === vId) && 
        gameState.board.roads.has(e.id) && 
        gameState.board.roads.get(e.id)?.player === gameState.currentTurn
      );
    };

    return isVertexConnectable(edge.v1.id) || isVertexConnectable(edge.v2.id);
  };

const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
  if (!initialized) return;
  const canvas = canvasRef.current;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const position = findClosestPosition(x, y);
  if (!position) return;

  if (mode === 'settlement' && position.type === 'vertex') {
    if (canPlaceSettlement(position.id)) {
      setGameState(prev => {
        let newState = { ...prev };
        
        if (prev.gamePhase === 'playing') {
          const cost = BUILDING_COSTS.settlement;
          const resources = prev.players[prev.currentTurn].resources;
          const canAfford = Object.entries(cost).every(([res, count]) => (resources[res] || 0) >= count);
          
          if (!canAfford) {
            alert("Recursos insuficientes para construir uma Vila!");
            return prev;
          }

          const newPlayers = { ...prev.players };
          const p = prev.currentTurn;
          newPlayers[p] = {
            ...newPlayers[p],
            resources: Object.keys(newPlayers[p].resources).reduce((acc, res) => ({
              ...acc,
              [res]: newPlayers[p].resources[res] - (cost[res] || 0)
            }), {}) as Record<string, number>
          };
          newState.players = newPlayers;
        }

        const newSettlements = new Map(prev.board.settlements);
        newSettlements.set(position.id, { player: prev.currentTurn });
        newState.board = { ...prev.board, settlements: newSettlements };

        if (prev.gamePhase === 'setup') {
          const vertex = prev.board.vertices.find(v => v.id === position.id);
          // Se for o segundo round de setup, ganha recursos iniciais
          if (prev.setupTurn >= prev.playerCount && vertex) {
            const newPlayers = { ...newState.players };
            const p = prev.currentTurn;
            prev.board.hexagons.forEach(hex => {
              const dist = Math.hypot(hex.x - vertex.x, hex.y - vertex.y);
              if (dist < hex.radius + 15) {
                if (hex.resource !== 'desert') {
                  newPlayers[p] = {
                    ...newPlayers[p],
                    resources: {
                      ...newPlayers[p].resources,
                      [hex.resource]: (newPlayers[p].resources[hex.resource] || 0) + 1
                    }
                  };
                }
              }
            });
            newState.players = newPlayers;
          }
          newState.setupSubPhase = 'road';
          // Nota: setSelectedSettlement é um state local, não está no gameState remote. 
          // Mas como handleCanvasClick é chamado por um único jogador, o setSelectedSettlement local está ok.
          setSelectedSettlement(position.id);
        }

        return newState;
      });
      playSound('settlement');
    }
  } else if (mode === 'road') {
    if (position.type === 'vertex') {
      const hasOwnBuilding = (gameState.board.settlements.has(position.id) && gameState.board.settlements.get(position.id)?.player === gameState.currentTurn) ||
                             (gameState.board.cities.has(position.id) && gameState.board.cities.get(position.id)?.player === gameState.currentTurn);
      if (hasOwnBuilding) {
        setSelectedSettlement(position.id);
      }
    } else if (position.type === 'edge' && position.id) {
      if (canPlaceRoad(position.id, selectedSettlement || undefined)) {
        setGameState(prev => {
          let newState = { ...prev };

          if (prev.gamePhase === 'playing') {
            const cost = BUILDING_COSTS.road;
            const resources = prev.players[prev.currentTurn].resources;
            const canAfford = Object.entries(cost).every(([res, count]) => (resources[res] || 0) >= count);
            
            if (!canAfford) {
              alert("Recursos insuficientes para construir uma Estrada!");
              return prev;
            }

            const newPlayers = { ...prev.players };
            const p = prev.currentTurn;
            newPlayers[p] = {
              ...newPlayers[p],
              resources: Object.keys(newPlayers[p].resources).reduce((acc, res) => ({
                ...acc,
                [res]: newPlayers[p].resources[res] - (cost[res] || 0)
              }), {}) as Record<string, number>
            };
            newState.players = newPlayers;
          }

          const newRoads = new Map(prev.board.roads);
          newRoads.set(position.id!, { player: prev.currentTurn });
          newState.board = { ...prev.board, roads: newRoads };

          if (prev.gamePhase === 'setup') {
            if (prev.setupTurn < setupOrder.length - 1) {
              newState.setupTurn = prev.setupTurn + 1;
              newState.setupSubPhase = 'settlement';
              // Na fase de setup, o currentTurn segue a ordem setupOrder
              newState.currentTurn = setupOrder[newState.setupTurn];
            } else {
              // Fim do setup
              newState.gamePhase = 'playing';
              newState.setupSubPhase = 'settlement';
              newState.currentTurn = 1;
            }
          }
          
          return newState;
        });
        
        playSound('road');
        setSelectedSettlement(null);
      }
    }
  } else if (mode === 'city' && position.type === 'vertex') {
    if (gameState.board.settlements.has(position.id) &&
        gameState.board.settlements.get(position.id)?.player === gameState.currentTurn) {
      
      setGameState(prev => {
        const cost = BUILDING_COSTS.city;
        const resources = prev.players[prev.currentTurn].resources;
        const canAfford = Object.entries(cost).every(([res, count]) => (resources[res] || 0) >= count);
        
        if (!canAfford) {
          alert("Recursos insuficientes para construir uma Cidade!");
          return prev;
        }

        let newState = { ...prev };
        
        const newPlayers = { ...prev.players };
        const p = prev.currentTurn;
        newPlayers[p] = {
          ...newPlayers[p],
          resources: Object.keys(newPlayers[p].resources).reduce((acc, res) => ({
            ...acc,
            [res]: newPlayers[p].resources[res] - (cost[res] || 0)
          }), {}) as Record<string, number>
        };
        newState.players = newPlayers;

        const newSettlements = new Map(prev.board.settlements);
        const newCities = new Map(prev.board.cities);
        newSettlements.delete(position.id);
        newCities.set(position.id, { player: prev.currentTurn });
        newState.board = { ...prev.board, settlements: newSettlements, cities: newCities };
        
        return newState;
      });
      playSound('city');
    }
  }
};

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!initialized) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const position = findClosestPosition(x, y);
    setHoveredPosition(position);
  };

  const rollDice = () => {
    if (gameState.gamePhase === 'setup') return;
    playSound('dice');
    
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const total = d1 + d2;

    setGameState(prev => {
      let newState = { ...prev, dice: [d1, d2] as [number, number] };
      
      if (total !== 7) {
        const newPlayers = { ...prev.players };
        prev.board.hexagons.forEach(hex => {
          if (hex.number === total) {
            const adjVertices = prev.board.vertices.filter(v => 
              Math.hypot(v.x - hex.x, v.y - hex.y) < hex.radius + 15
            );
            
            adjVertices.forEach(v => {
              const settlement = prev.board.settlements.get(v.id);
              const city = prev.board.cities.get(v.id);
              
              if (settlement) {
                const p = settlement.player;
                newPlayers[p] = {
                  ...newPlayers[p],
                  resources: {
                    ...newPlayers[p].resources,
                    [hex.resource]: (newPlayers[p].resources[hex.resource] || 0) + 1
                  }
                };
              }
              if (city) {
                const p = city.player;
                newPlayers[p] = {
                  ...newPlayers[p],
                  resources: {
                    ...newPlayers[p].resources,
                    [hex.resource]: (newPlayers[p].resources[hex.resource] || 0) + 2
                  }
                };
              }
            });
          }
        });
        newState.players = newPlayers;
      }
      
      return newState;
    });

    if (total === 7) {
      alert("7! O ladrão se move (regra não implementada).");
    }
  };

  const adjustHexPosition = (hexId: string, dx: number, dy: number) => {
    setGameState((prev: GameState) => {
      const newHexagons = prev.board.hexagons.map((hex: Hexagon) => {
        if (hex.id === hexId) {
          return { ...hex, x: hex.x + dx, y: hex.y + dy };
        }
        return hex;
      });

      const { vertices, edges } = buildGraphFromHexagons(newHexagons);

      return {
        ...prev,
        board: {
          ...prev.board,
          hexagons: newHexagons,
          vertices,
          edges
        }
      };
    });
  };

  const generateJSON = () => {
    const json = JSON.stringify(gameState.board.hexagons.map(hex => ({
      id: hex.id,
      x: hex.x,
      y: hex.y,
      radius: hex.radius,
      resource: hex.resource,
      number: hex.number
    })), null, 2);
    
    navigator.clipboard.writeText(json);
    alert('JSON copiado para a área de transferência!');
  };

  const loadFromJSON = (jsonStr: string) => {
    try {
      const hexagons = JSON.parse(jsonStr) as Hexagon[];
      const { vertices, edges } = buildGraphFromHexagons(hexagons);

      setGameState(prev => ({
        ...prev,
        board: {
          ...prev.board,
          hexagons,
          vertices,
          edges
        }
      }));
      
      alert('Posições carregadas com sucesso!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      alert('Erro ao carregar JSON: ' + message);
    }
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-[#1a4a6e] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#2a2a2a] p-6 sm:p-8 rounded-3xl shadow-2xl border border-white/10 text-center">
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 tracking-tighter">CATAN</h1>
          <p className="text-gray-400 mb-6 sm:mb-8 font-medium text-sm sm:text-base">Insira o código da sala para começar</p>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="CÓDIGO DA SALA"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full bg-black/30 border-2 border-white/10 rounded-2xl px-4 py-3 sm:px-6 sm:py-4 text-white text-lg sm:text-xl font-bold focus:border-amber-500 outline-none transition-all text-center uppercase tracking-widest"
              onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
            />
            
            <button
              onClick={joinRoom}
              disabled={isLoading || !roomCode.trim()}
              className={`w-full py-3 sm:py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-lg sm:text-xl transition-all ${
                isLoading || !roomCode.trim()
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-600 text-black transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(245,158,11,0.3)]'
              }`}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-3 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={24} />
                  ENTRAR NA SALA
                </>
              )}
            </button>
          </div>
          
          <p className="mt-6 sm:mt-8 text-white/20 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
            Multiplayer Realtime • Supabase Connected
          </p>
        </div>
      </div>
    );
  }

  if (gameState.gamePhase === 'lobby') {
    return (
      <div className="min-h-screen bg-[#1a4a6e] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#2a2a2a] p-6 sm:p-8 rounded-3xl shadow-2xl border border-white/10 text-center">
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 tracking-tighter italic">CATAN</h1>
          <p className="text-gray-400 mb-6 font-medium text-sm sm:text-base">Sala: <span className="text-white font-bold tracking-widest">{roomCode}</span></p>
          
          <div className="bg-black/30 rounded-2xl p-4 mb-6 border border-white/5">
            <h2 className="text-white/40 font-bold text-[10px] uppercase tracking-[0.2em] mb-4">Aguardando Jogadores ({presencePlayers.length})</h2>
            <div className="space-y-2">
              {presencePlayers.map((p, idx) => (
                <div key={p.session_id} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 transition-all hover:bg-white/10">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-lg" style={{ backgroundColor: PLAYERS[idx + 1]?.color || '#ccc', color: (idx + 1) === 3 ? '#000' : '#fff' }}>
                    {idx + 1}
                  </div>
                  <span className="text-white font-bold text-sm">{p.session_id === sessionId ? 'Você' : `Jogador ${idx + 1}`}</span>
                  {p.session_id === sessionId && <span className="ml-auto text-[9px] bg-amber-500 text-black px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-lg">Eu</span>}
                </div>
              ))}
              
              {/* Slots vazios */}
              {Array.from({ length: Math.max(0, 4 - presencePlayers.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="flex items-center gap-3 bg-black/20 p-3 rounded-xl border border-dashed border-white/5 opacity-50">
                  <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center font-bold text-sm text-gray-600">
                    {presencePlayers.length + i + 1}
                  </div>
                  <span className="text-gray-600 font-bold text-sm italic">Vago</span>
                </div>
              ))}
            </div>

            {presencePlayers.length < 2 && !debugMode && (
              <div className="mt-6 flex flex-col items-center">
                <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-3" />
                <p className="text-amber-500/80 text-[10px] font-black uppercase tracking-widest animate-pulse">Aguardando pelo menos mais 1 jogador...</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={startGame}
              disabled={presencePlayers.length < 2 && !debugMode}
              className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-lg sm:text-xl transition-all ${
                presencePlayers.length < 2 && !debugMode
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_10px_30px_rgba(5,150,105,0.3)] border-b-4 border-emerald-800'
              }`}
            >
              INICIAR JOGO
            </button>
            
            <button
              onClick={() => setDebugMode(!debugMode)}
              className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${
                debugMode 
                ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' 
                : 'bg-white/5 text-white/20 border-white/10 hover:bg-white/10'
              }`}
            >
              Modo Debug: {debugMode ? 'ATIVADO' : 'DESATIVADO'}
            </button>
          </div>
          
          <p className="mt-8 text-white/10 text-[9px] font-bold uppercase tracking-[0.3em] leading-relaxed">
            O progresso será sincronizado<br/>para todos na sala
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#1a4a6e] flex flex-col items-center p-4 overflow-x-hidden relative">
      {/* Indicador de Realtime / Sala */}
      <div className="fixed top-4 right-4 z-[90] flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-2xl">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-white/70 text-[10px] font-black uppercase tracking-widest">Sala: {roomCode}</span>
        <div className="w-[1px] h-3 bg-white/20 mx-1" />
        <span className="text-emerald-500/80 text-[10px] font-black uppercase tracking-widest">Realtime Ativo</span>
      </div>
      {showRulesModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border-4 border-indigo-600 max-h-[90vh] flex flex-col">
            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center flex-shrink-0">
              <h2 className="text-2xl font-black tracking-tighter flex items-center gap-2">
                <Info size={28} /> REGRAS E CUSTOS
              </h2>
              <button 
                onClick={() => setShowRulesModal(false)}
                className="hover:bg-white/20 p-2 rounded-full transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto flex-1 custom-scrollbar">
              {/* Custos de Construção */}
              <div className="space-y-4">
                <h3 className="text-indigo-900 font-black text-sm sm:text-lg uppercase tracking-widest border-b-2 border-indigo-100 pb-2">
                  Custos de Construção
                </h3>
                
                <div className="grid gap-3 sm:gap-4">
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between border border-gray-100 gap-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-500 p-2 rounded-lg text-white flex-shrink-0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 12h12M12 6v12"/></svg></div>
                      <span className="font-bold text-gray-800 text-sm sm:text-base">Estrada</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <span className="bg-[#2D5A27]/10 text-[#2D5A27] px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-black border border-[#2D5A27]/20">1 🌲 Madeira</span>
                      <span className="bg-[#A52A2A]/10 text-[#A52A2A] px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-black border border-[#A52A2A]/20">1 🧱 Tijolo</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between border border-gray-100 gap-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-500 p-2 rounded-lg text-white flex-shrink-0"><Home size={18} /></div>
                      <span className="font-bold text-gray-800 text-sm sm:text-base">Vila</span>
                    </div>
                    <div className="flex gap-1 flex-wrap justify-start sm:justify-end max-w-full sm:max-w-[200px]">
                      <span className="bg-[#2D5A27]/10 text-[#2D5A27] px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black border border-[#2D5A27]/20">1 🌲 Mad.</span>
                      <span className="bg-[#A52A2A]/10 text-[#A52A2A] px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black border border-[#A52A2A]/20">1 🧱 Tij.</span>
                      <span className="bg-[#F2C94C]/10 text-[#B8860B] px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black border border-[#F2C94C]/20">1 🌾 Trigo</span>
                      <span className="bg-[#88B04B]/10 text-[#556B2F] px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black border border-[#88B04B]/20">1 🐑 Ovel.</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between border border-gray-100 gap-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-500 p-2 rounded-lg text-white flex-shrink-0"><Building size={18} /></div>
                      <span className="font-bold text-gray-800 text-sm sm:text-base">Cidade</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <span className="bg-[#F2C94C]/10 text-[#B8860B] px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-black border border-[#F2C94C]/20">2 🌾 Trigo</span>
                      <span className="bg-[#7B8D8E]/10 text-[#4A5D5E] px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-black border border-[#7B8D8E]/20">3 ⛰️ Minér.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Regras Básicas */}
              <div className="space-y-4">
                <h3 className="text-indigo-900 font-black text-sm sm:text-lg uppercase tracking-widest border-b-2 border-indigo-100 pb-2">
                  Regras Rápidas
                </h3>
                <ul className="space-y-3">
                  <li className="flex gap-3 text-xs sm:text-sm text-gray-600 font-medium">
                    <span className="text-indigo-600 font-black">1.</span>
                    Cada <span className="text-gray-900 font-bold">Vila</span> vale 1 ponto. <span className="text-gray-900 font-bold">Cidades</span> valem 2 pontos.
                  </li>
                  <li className="flex gap-3 text-xs sm:text-sm text-gray-600 font-medium">
                    <span className="text-indigo-600 font-black">2.</span>
                    Cidades produzem o <span className="text-indigo-600 font-bold">DOBRO</span> de recursos.
                  </li>
                  <li className="flex gap-3 text-xs sm:text-sm text-gray-600 font-medium">
                    <span className="text-indigo-600 font-black">3.</span>
                    Vença ao atingir <span className="text-indigo-600 font-bold">10 pontos</span>.
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="bg-gray-50 p-6 flex justify-center flex-shrink-0">
              <button 
                onClick={() => setShowRulesModal(false)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3 rounded-2xl font-black shadow-lg transition-all transform hover:scale-105"
              >
                ENTENDI!
              </button>
            </div>
          </div>
        </div>
      )}
      {winner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full border-4" style={{ borderColor: PLAYERS[winner].color }}>
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-black mb-2 tracking-tighter" style={{ color: PLAYERS[winner].color }}>
              VENCEDOR!
            </h2>
            <p className="text-gray-600 font-bold text-lg mb-6">
              {PLAYERS[winner].name} conquistou Catan!
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-xl font-bold text-white transition-all transform hover:scale-105"
              style={{ backgroundColor: PLAYERS[winner].color }}
            >
              Jogar Novamente
            </button>
          </div>
        </div>
      )}
      {showAdjustModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50">
          <div className="bg-gray-700 p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto relative">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-gray-700 py-2 z-10 border-b border-gray-600">
              <h2 className="text-2xl font-bold text-white">Ajuste de Posição</h2>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="flex gap-2 mb-6">
              <button
                onClick={generateJSON}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm transition-colors"
              >
                📋 Copiar JSON
              </button>
              <button
                onClick={() => {
                  const json = prompt('Cole o JSON aqui:');
                  if (json) loadFromJSON(json);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm transition-colors"
              >
                📥 Carregar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {gameState.board.hexagons.map((hex, idx) => (
                <div key={hex.id} className="bg-gray-800 p-4 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-white font-bold">
                      Hexágono {idx + 1} - {RESOURCES[hex.resource].name} {hex.number > 0 && `(${hex.number})`}
                    </div>
                    <div 
                      className="w-8 h-8 rounded"
                      style={{ backgroundColor: RESOURCES[hex.resource].color }}
                    />
                  </div>
                  
                  <div className="text-white text-sm mb-2">
                    Posição: X: {Math.round(hex.x)}, Y: {Math.round(hex.y)}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => adjustHexPosition(hex.id, -1, -1)}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded text-xs"
                    >
                      ↖
                    </button>
                    <button
                      onClick={() => adjustHexPosition(hex.id, 0, -1)}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded text-xs"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => adjustHexPosition(hex.id, 1, -1)}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded text-xs"
                    >
                      ↗
                    </button>
                    
                    <button
                      onClick={() => adjustHexPosition(hex.id, -1, 0)}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded text-xs"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => adjustHexPosition(hex.id, -10, -10)}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs"
                    >
                      10↖
                    </button>
                    <button
                      onClick={() => adjustHexPosition(hex.id, 1, 0)}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded text-xs"
                    >
                      →
                    </button>
                    
                    <button
                      onClick={() => adjustHexPosition(hex.id, -1, 1)}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded text-xs"
                    >
                      ↙
                    </button>
                    <button
                      onClick={() => adjustHexPosition(hex.id, 0, 1)}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded text-xs"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => adjustHexPosition(hex.id, 1, 1)}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded text-xs"
                    >
                      ↘
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/10 backdrop-blur-md p-4 sm:p-6 rounded-2xl mb-6 w-full max-w-6xl border border-white/20 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tighter italic">CATAN</h1>
          <div className="flex gap-2 sm:gap-4 items-center flex-wrap justify-center">
            <div className="bg-black/30 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-white/10">
              <span className="text-gray-300 text-[10px] sm:text-xs uppercase font-bold mr-2">Fase:</span>
              <span className="text-white text-xs sm:text-base font-bold">{gameState.gamePhase === 'setup' ? 'Configuração' : 'Em Jogo'}</span>
            </div>
            
            <div className="bg-black/30 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-white/10">
              <span className="text-gray-300 text-[10px] sm:text-xs uppercase font-bold mr-2">Turno:</span>
              <span className="font-black text-xs sm:text-base" style={{ color: PLAYERS[gameState.currentTurn].color }}>
                {PLAYERS[gameState.currentTurn].name}
              </span>
            </div>

            <div className="bg-black/30 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-white/10 flex items-center gap-2">
              <span className="text-gray-300 text-[10px] sm:text-xs uppercase font-bold">Pontos:</span>
              <div className="flex gap-1.5">
                {Array.from({ length: gameState.playerCount }, (_, i) => i + 1).map(p => (
                  <div key={p} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PLAYERS[p].color }} />
                    <span className="text-white font-black text-xs sm:text-sm">{playerVPs[p]}</span>
                  </div>
                ))}
              </div>
            </div>

            {gameState.gamePhase === 'playing' && (
              <div className="flex gap-2 mt-2 md:mt-0">
                <button
                  onClick={rollDice}
                  disabled={gameState.dice[0] > 0}
                  className={`px-4 py-2 sm:px-6 sm:py-2 rounded-full flex items-center gap-2 transition-all shadow-lg font-bold text-sm sm:text-base ${
                    gameState.dice[0] === 0 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white transform hover:scale-105' 
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Dices size={18} />
                  {gameState.dice[0] === 0 ? 'Dados' : 'Lançados'}
                </button>
                
                <button
                  onClick={() => {
                    playSound('nextTurn');
                    setGameState(prev => ({
                      ...prev,
                      dice: [0, 0],
                      currentTurn: (prev.currentTurn % prev.playerCount) + 1
                    }));
                    setSelectedSettlement(null);
                  }}
                  disabled={gameState.dice[0] === 0}
                  className={`px-4 py-2 sm:px-6 sm:py-2 rounded-full flex items-center gap-2 transition-all shadow-lg font-bold text-sm sm:text-base ${
                    gameState.dice[0] > 0 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white transform hover:scale-105' 
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Passar Turno
                </button>
              </div>
            )}

            {gameState.dice[0] > 0 && (
              <div className="bg-white text-indigo-900 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-black text-base sm:text-xl shadow-inner flex items-center gap-2 mt-2 md:mt-0">
                <span>🎲</span>
                <span>{gameState.dice[0] + gameState.dice[1]}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-center lg:items-end justify-between">
          <div className="flex gap-2 sm:gap-3 justify-center w-full lg:w-auto">
            <button
              onClick={() => gameState.gamePhase === 'playing' && setMode('settlement')}
              disabled={gameState.gamePhase === 'setup'}
              className={`flex-1 sm:flex-none px-4 py-3 sm:px-6 sm:py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-sm sm:text-base ${
                mode === 'settlement' ? 'bg-amber-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 grayscale'
              } ${gameState.gamePhase === 'setup' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}`}
            >
              <Home size={20} />
              <span className="hidden sm:inline">Vila</span>
              <span className="sm:hidden">Vila</span>
            </button>
            <button
              onClick={() => gameState.gamePhase === 'playing' && setMode('road')}
              disabled={gameState.gamePhase === 'setup'}
              className={`flex-1 sm:flex-none px-4 py-3 sm:px-6 sm:py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-sm sm:text-base ${
                mode === 'road' ? 'bg-amber-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 grayscale'
              } ${gameState.gamePhase === 'setup' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M6 12h12M12 6v12"/>
              </svg>
              <span className="hidden sm:inline">Estrada</span>
              <span className="sm:hidden">Estr.</span>
            </button>
            <button
              onClick={() => gameState.gamePhase === 'playing' && setMode('city')}
              disabled={gameState.gamePhase === 'setup'}
              className={`flex-1 sm:flex-none px-4 py-3 sm:px-6 sm:py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-sm sm:text-base ${
                mode === 'city' ? 'bg-amber-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 grayscale'
              } ${gameState.gamePhase === 'setup' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}`}
            >
              <Building size={20} />
              <span className="hidden sm:inline">Cidade</span>
              <span className="sm:hidden">Cid.</span>
            </button>
          </div>

          <div className="flex flex-col gap-2 w-full lg:w-auto">
            <div className="flex justify-between items-center px-1">
              <span className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Recursos</span>
              <span className="bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border border-amber-500/30">
                {playerVPs[gameState.currentTurn]} VP
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap justify-start lg:justify-end no-scrollbar">
              {Object.entries(gameState.players[gameState.currentTurn].resources).map(([res, count]) => (
                <div key={res} className="flex-shrink-0 bg-black/40 px-3 py-2 rounded-xl border border-white/10 flex items-center gap-2 shadow-lg hover:bg-black/60 transition-colors">
                  <div className="text-lg">{RESOURCES[res]?.icon}</div>
                  <div className="flex flex-col">
                    <span className="text-white font-black text-base leading-none">{count}</span>
                    <span className="text-white/40 text-[8px] uppercase font-bold tracking-tighter">{RESOURCES[res]?.name.substring(0, 3)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative group w-full flex justify-center">
        <div className="w-full overflow-x-auto overflow-y-hidden py-4 -mx-4 px-4 sm:mx-0 sm:px-0 custom-scrollbar flex justify-start md:justify-center">
          <div className="relative flex-shrink-0">
            <canvas
              ref={canvasRef}
              width={1000}
              height={700}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMove}
              onMouseLeave={() => setHoveredPosition(null)}
              className={`bg-[#2c7bb6] rounded-2xl cursor-pointer shadow-[0_0_50px_rgba(0,0,0,0.3)] border-4 sm:border-8 border-[#1a4a6e] transition-opacity duration-500 opacity-100 max-w-none`}
            />
            
            {isInitialLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a4a6e]/80 rounded-2xl z-20 backdrop-blur-sm">
                <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-white font-black text-lg sm:text-xl animate-pulse uppercase tracking-widest text-center px-4">Carregando Tabuleiro...</p>
                <p className="text-white/60 text-[10px] sm:text-sm mt-2 font-bold uppercase tracking-tighter">Prepare sua estratégia!</p>
              </div>
            )}

            {!isInitialLoading && gameState.gamePhase === 'setup' && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-950 px-4 py-2 sm:px-8 sm:py-3 rounded-full font-black shadow-2xl animate-bounce pointer-events-none whitespace-nowrap z-10 text-xs sm:text-base">
                {gameState.setupSubPhase === 'settlement' ? 'Escolha sua VILA inicial' : 'Agora construa a ESTRADA adjacente'}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-2 sm:gap-4 flex-wrap justify-center">
        <button
          onClick={() => {
            const next = !audioEnabled;
            setAudioEnabled(next);
            if (next) {
              playSound('nextTurn');
            }
          }}
          className={`px-4 py-2 sm:px-6 sm:py-2 rounded-full text-[10px] sm:text-sm transition-all flex items-center gap-2 border ${audioEnabled ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50'}`}
          title={audioEnabled ? 'Desativar Sons' : 'Ativar Sons'}
        >
          {audioEnabled ? <Volume2 size={14} className="sm:w-4 sm:h-4" /> : <VolumeX size={14} className="sm:w-4 sm:h-4" />}
          {audioEnabled ? 'Som Ativo' : 'Mudo'}
        </button>
        <button
          onClick={() => setShowRulesModal(true)}
          className="bg-indigo-600/80 hover:bg-indigo-600 text-white px-4 py-2 sm:px-6 sm:py-2 rounded-full text-[10px] sm:text-sm transition-all flex items-center gap-2 border border-indigo-400/30 shadow-lg"
        >
          <HelpCircle size={14} className="sm:w-4 sm:h-4" /> Regras
        </button>
        <button
          onClick={() => setShowAdjustModal(true)}
          className="bg-white/5 hover:bg-white/10 text-white/70 px-4 py-2 sm:px-6 sm:py-2 rounded-full text-[10px] sm:text-sm transition-all flex items-center gap-2 border border-white/5"
        >
          ⚙️ Ajustes
        </button>
        <button
          onClick={() => setDebugMode(!debugMode)}
          className={`px-4 py-2 sm:px-6 sm:py-2 rounded-full text-[10px] sm:text-sm transition-all flex items-center gap-2 border ${debugMode ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-white/5 text-white/70 border-white/5'}`}
        >
          🔍 Debug
        </button>
        <button
          onClick={() => setShowVertexNumbers(!showVertexNumbers)}
          className={`px-4 py-2 sm:px-6 sm:py-2 rounded-full text-[10px] sm:text-sm transition-all flex items-center gap-2 border ${showVertexNumbers ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-white/5 text-white/70 border-white/5'}`}
        >
          🔢 Números
        </button>
      </div>

      <div className="mt-4 text-white text-sm">
        <p>• Modo Vila: Clique nos vértices para construir vilas</p>
        <p>• Modo Estrada: Clique em uma vila sua, depois clique na aresta para construir estrada</p>
        <p>• Modo Cidade: Clique em uma vila sua para transformá-la em cidade</p>
        {selectedSettlement && <p className="text-yellow-400">• Vila selecionada! Clique em uma aresta conectada para construir estrada</p>}
      </div>

      {debugMode && (
        <div className="mt-4 w-full max-w-6xl bg-gray-700/80 border border-yellow-400 text-white px-4 py-3 rounded">
          <p className="text-sm font-semibold text-yellow-100">Debug - estradas conectadas por vila</p>
          {gameState.board.settlements.size === 0 ? (
            <p className="text-xs text-gray-300 mt-2">Nenhuma vila construída ainda.</p>
          ) : (
            Array.from(gameState.board.settlements.entries()).map(([vertexId, settlement]: [string, Ownership]) => {
              const vertex = gameState.board.vertices.find(v => v.id === vertexId);
              const settlementEdges = selectedSettlement === vertexId
                ? getAvailableEdgesForSettlement(vertexId)
                : getEdgesConnectedToVertex(vertexId);
              const neighborPositions = settlementEdges
                .map(edge => {
                  const otherVertex = edge?.v1?.id === vertexId ? edge.v2 : edge?.v1;
                  return otherVertex?.position;
                })
                .filter((pos: number | undefined): pos is number => pos !== undefined && pos !== null);
              const uniqueNeighbors = Array.from(new Set(neighborPositions));

              return (
                <div key={vertexId} className="mt-3">
                  <div className="text-sm font-medium">
                    Vila {vertex ? `V${vertex.position}` : vertexId} ({PLAYERS[settlement.player]?.name ?? `Jogador ${settlement.player}`})
                  </div>
                  {uniqueNeighbors.length > 0 ? (
                    <div className="text-xs text-gray-200">
                      Estradas disponíveis ({uniqueNeighbors.length}/3): {uniqueNeighbors.map(pos => `V${pos}`).join(', ')}
                    </div>
                  ) : (
                    <div className="text-xs text-yellow-300">Nenhuma estrada conectada encontrada</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
      <div className="mt-8 mb-4 text-white/40 text-xs flex flex-col items-center gap-2">
        <div className="flex gap-4">
          <a 
            href="https://opencatan.vercel.app" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-white transition-colors font-bold"
          >
            🌐 opencatan.vercel.app
          </a>
          <span>•</span>
          <a 
            href="https://github.com/michaeldias-code/catan-online" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-white transition-colors font-bold flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.041-1.412-4.041-1.412-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Contribuir no GitHub
          </a>
        </div>
        <p>© 2026 Open Catan - Desenvolvido para a comunidade</p>
      </div>
    </div>
  );
}