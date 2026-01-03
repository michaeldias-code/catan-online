// Script para debug das arestas e conexões
const hexagons = [
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
  { id: "hex_15", x: 903, y: 401, radius: 60, resource: "sheep", number: 11},
  { id: "hex_16", x: 455, y: 453, radius: 60, resource: "wheat", number: 2 },
  { id: "hex_17", x: 635, y: 453, radius: 60, resource: "desert", number: 0 },
  { id: "hex_18", x: 815, y: 453, radius: 60, resource: "wheat", number: 9 }
];

// Calcular vértices
const verticesMap = new Map();
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
  }
});

// Calcular arestas
const edgesMap = new Map();

hexagons.forEach(hex => {
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const vx = hex.x + hex.radius * Math.cos(angle);
    const vy = hex.y + hex.radius * Math.sin(angle);

    const nextI = (i + 1) % 6;
    const nextAngle = (Math.PI / 3) * nextI;
    const nvx = hex.x + hex.radius * Math.cos(nextAngle);
    const nvy = hex.y + hex.radius * Math.sin(nextAngle);

    const vertexId = `v_${Math.round(vx)}_${Math.round(vy)}`;
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

// Mostrar todas as arestas
console.log('=== TODAS AS ARESTAS ===');
edgesMap.forEach(edge => {
  console.log(`Aresta ${edge.id}: conecta posição ${edge.v1.position} ↔ posição ${edge.v2.position}`);
});

console.log('\n=== CONEXÕES DA POSIÇÃO 6 ===');
edgesMap.forEach(edge => {
  if (edge.v1.position === 6 || edge.v2.position === 6) {
    const otherPos = edge.v1.position === 6 ? edge.v2.position : edge.v1.position;
    console.log(`Posição 6 está conectada à posição ${otherPos} via aresta ${edge.id}`);
  }
});

console.log('\n=== VERIFICAÇÃO DIRETA ===');
console.log('Procurando arestas que conectam:');
console.log('- Posição 6 e 5');
console.log('- Posição 6 e 9');
console.log('- Posição 6 e 11');

edgesMap.forEach(edge => {
  const pos1 = edge.v1.position;
  const pos2 = edge.v2.position;

  if ((pos1 === 6 && pos2 === 5) || (pos1 === 5 && pos2 === 6)) {
    console.log('✅ ENCONTRADO: aresta conectando 6 ↔ 5');
  }
  if ((pos1 === 6 && pos2 === 9) || (pos1 === 9 && pos2 === 6)) {
    console.log('✅ ENCONTRADO: aresta conectando 6 ↔ 9');
  }
  if ((pos1 === 6 && pos2 === 11) || (pos1 === 11 && pos2 === 6)) {
    console.log('✅ ENCONTRADO: aresta conectando 6 ↔ 11');
  }
});
