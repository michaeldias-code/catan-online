// Script para mapear conexões entre vértices e arestas no Catan
const hexagons = [
  // Row 1 (top - 3 hexagons)
  { id: "hex_0", x: 456, y: 247, radius: 60, resource: "wood", number: 5 },
  { id: "hex_1", x: 545, y: 194, radius: 60, resource: "ore", number: 4 },
  { id: "hex_2", x: 723, y: 194, radius: 60, resource: "sheep", number: 5 },

  // Row 2 (4 hexagons)
  { id: "hex_3", x: 366, y: 299, radius: 60, resource: "ore", number: 10 },
  { id: "hex_4", x: 545, y: 299, radius: 60, resource: "wood", number: 12 },
  { id: "hex_5", x: 634, y: 247, radius: 60, resource: "brick", number: 4 },
  { id: "hex_6", x: 723, y: 299, radius: 60, resource: "ore", number: 10 },

  // Row 3 (5 hexagons - center row)
  { id: "hex_7", x: 275, y: 350, radius: 60, resource: "wood", number: 3 },
  { id: "hex_8", x: 455, y: 350, radius: 60, resource: "wheat", number: 11 },
  { id: "hex_9", x: 635, y: 350, radius: 60, resource: "wheat", number: 9 },
  { id: "hex_10", x: 813, y: 350, radius: 60, resource: "brick", number: 6 },
  { id: "hex_11", x: 812, y: 247, radius: 60, resource: "brick", number: 8 },

  // Row 4 (4 hexagons)
  { id: "hex_12", x: 365, y: 401, radius: 60, resource: "sheep", number: 8 },
  { id: "hex_13", x: 545, y: 401, radius: 60, resource: "sheep", number: 6 },
  { id: "hex_14", x: 725, y: 401, radius: 60, resource: "wood", number: 3 },
  { id: "hex_15", x: 903, y: 401, radius: 60, resource: "sheep", number: 11},

  // Row 5 (bottom - 3 hexagons)
 { id: "hex_16", x: 455, y: 453, radius: 60, resource: "wheat", number: 2 },
 { id: "hex_17", x: 635, y: 453, radius: 60, resource: "desert", number: 0 },
 { id: "hex_18", x: 815, y: 453, radius: 60, resource: "wheat", number: 9 }
];

// Calcular vértices e arestas baseados nas posições dos hexágonos
const verticesMap = new Map();
const edgesMap = new Map();
let vertexIndex = 1;

hexagons.forEach(hex => {
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const vx = hex.x + hex.radius * Math.cos(angle);
    const vy = hex.y + hex.radius * Math.sin(angle);

    const vertexId = `v_${Math.round(vx)}_${Math.round(vy)}`;

    if (!verticesMap.has(vertexId)) {
      verticesMap.set(vertexId, {
        x: vx,
        y: vy,
        id: vertexId,
        position: vertexIndex++
      });
    }

    const nextI = (i + 1) % 6;
    const nextAngle = (Math.PI / 3) * nextI;
    const nvx = hex.x + hex.radius * Math.cos(nextAngle);
    const nvy = hex.y + hex.radius * Math.sin(nextAngle);

    const nextVertexId = `v_${Math.round(nvx)}_${Math.round(nvy)}`;
    const edgeId = [vertexId, nextVertexId].sort().join('_');

    if (!edgesMap.has(edgeId)) {
      const v1 = verticesMap.get(vertexId);
      const v2 = verticesMap.get(nextVertexId);
      if (v1 && v2) {
        edgesMap.set(edgeId, {
          id: edgeId,
          v1: { ...v1 },
          v2: { ...v2 },
          midX: (v1.x + v2.x) / 2,
          midY: (v1.y + v2.y) / 2
        });
      }
    }
  }
});

// Mapear conexões: posição do vértice -> array de IDs das arestas conectadas
const vertexToEdgesMap = new Map();

// Para cada vértice, encontrar todas as arestas conectadas
verticesMap.forEach(vertex => {
  const connectedEdges = [];
  edgesMap.forEach(edge => {
    if (edge.v1.id === vertex.id || edge.v2.id === vertex.id) {
      connectedEdges.push(edge.id);
    }
  });
  vertexToEdgesMap.set(vertex.position, connectedEdges);
});

console.log('=== MAPEAMENTO VÉRTICE -> ARESTAS ===');
vertexToEdgesMap.forEach((edges, position) => {
  console.log(`Posição ${position}: arestas [${edges.join(', ')}]`);
});

console.log('\n=== MAPEAMENTO ARESTAS -> POSIÇÕES ===');
edgesMap.forEach(edge => {
  const pos1 = edge.v1.position;
  const pos2 = edge.v2.position;
  console.log(`Aresta ${edge.id}: conecta posições ${pos1} e ${pos2}`);
});

// Exportar o mapeamento para uso na aplicação
console.log('\n=== CONSTANTES PARA A APLICAÇÃO ===');
console.log('const VERTEX_EDGES_MAP = {');
vertexToEdgesMap.forEach((edges, position) => {
  console.log(`  ${position}: ['${edges.join("', '")}'],`);
});
console.log('};');

console.log('\n=== CONSTANTES PARA A FUNÇÃO getPossibleRoads ===');
console.log('const POSSIBLE_ROADS_FROM_SETTLEMENT = {');
vertexToEdgesMap.forEach((edges, position) => {
  console.log(`  ${position}: ['${edges.join("', '")}'],`);
});
console.log('};');
