// Script para analisar conexões entre hexágonos no Catan
// Primeiro, vou analisar o layout baseado nas posições para entender a estrutura
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

// Função para calcular distância entre dois pontos
function distance(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

// Função para encontrar hexágonos adjacentes baseado na distância
function findAdjacentHexagons(hexagons) {
  const connections = new Map();
  const radius = hexagons[0].radius;

  // Distância entre centros de hexágonos adjacentes em um grid hexagonal
  // Para hexágonos com raio r, a distância entre centros adjacentes é 2 * r * sin(60°) ≈ 1.732 * r
  const adjacentDistance = radius * Math.sqrt(3); // ≈ 103.92 pixels

  hexagons.forEach(hex => {
    connections.set(hex.id, new Set());
  });

  // Verificar cada par de hexágonos
  for (let i = 0; i < hexagons.length; i++) {
    for (let j = i + 1; j < hexagons.length; j++) {
      const hex1 = hexagons[i];
      const hex2 = hexagons[j];
      const dist = distance(hex1, hex2);

      // Se a distância estiver próxima da distância esperada para hexágonos adjacentes
      if (Math.abs(dist - adjacentDistance) < 10) { // tolerância de 10 pixels
        connections.get(hex1.id).add(hex2.id);
        connections.get(hex2.id).add(hex1.id);
      }
    }
  }

  return connections;
}

// Encontra conexões usando a nova lógica baseada em distância
const connections = findAdjacentHexagons(hexagons);

// Recursos para facilitar a leitura
const resources = {
  wood: 'Madeira',
  brick: 'Tijolo',
  sheep: 'Ovelha',
  wheat: 'Trigo',
  ore: 'Minério',
  desert: 'Deserto'
};

console.log('=== CONEXÕES ENTRE HEXÁGONOS ===\n');

hexagons.forEach(hex => {
  const connected = Array.from(connections.get(hex.id)).sort();
  const resource = resources[hex.resource];
  const number = hex.number > 0 ? `(${hex.number})` : '';

  console.log(`${hex.id}: ${resource} ${number}`);
  console.log(`  Conectado a: ${connected.join(', ')}`);

  // Mostra detalhes dos hexágonos conectados
  connected.forEach(connectedId => {
    const connectedHex = hexagons.find(h => h.id === connectedId);
    const connectedResource = resources[connectedHex.resource];
    const connectedNumber = connectedHex.number > 0 ? `(${connectedHex.number})` : '';
    console.log(`    - ${connectedId}: ${connectedResource} ${connectedNumber}`);
  });
  console.log('');
});

// Estatísticas finais
console.log('=== ESTATÍSTICAS ===');
console.log(`Total de hexágonos: ${hexagons.length}`);
console.log(`Total de conexões possíveis: ${hexagons.reduce((sum, hex) => sum + connections.get(hex.id).size, 0) / 2}`);

const isolatedHexes = hexagons.filter(hex => connections.get(hex.id).size === 0);
if (isolatedHexes.length > 0) {
  console.log('\nHexágonos isolados (sem conexões):');
  isolatedHexes.forEach(hex => {
    console.log(`  ${hex.id}: ${resources[hex.resource]} ${hex.number > 0 ? `(${hex.number})` : ''}`);
  });
}
