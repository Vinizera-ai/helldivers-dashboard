const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// DEFINIR A URL CORRETA DA API
const HELLDIVERS_API = 'https://helldiverstrainingmanual.com/api/v1';

// Log das requisições
app.use((req, res, next) => {
  console.log(`🌐 ${new Date().toLocaleTimeString()} - ${req.method} ${req.path}`);
  next();
});

// Dados demo que SEMPRE funcionam com distribuição realista de facções
function getReliableDemoPlanets() {
  return [
    // Super Earth (homeworld + territórios seguros)
    {
      index: 0,
      name: "Super Earth",
      sector: "Sol",
      biome: { name: "Homeworld", slug: "homeworld" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Super Earth"
    },
    {
      index: 1,
      name: "Tien Kwan",
      sector: "Hydra",
      biome: { name: "Swamp", slug: "swamp" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Super Earth"
    },
    {
      index: 2,
      name: "Mort",
      sector: "Hydra",
      biome: { name: "Mountain", slug: "mountain" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Super Earth"
    },
    {
      index: 3,
      name: "Cyberstan",
      sector: "Draco",
      biome: { name: "Plains", slug: "plains" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Super Earth"
    },
    {
      index: 4,
      name: "New Haven",
      sector: "Hydra",
      biome: { name: "Forest", slug: "forest" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Super Earth"
    },
    
    // Territórios controlados pelos Automatons
    {
      index: 5,
      name: "Malevelon Creek",
      sector: "Severin",
      biome: { name: "Jungle", slug: "jungle" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Automatons"
    },
    {
      index: 6,
      name: "Draupnir",
      sector: "Mirin",
      biome: { name: "Desert", slug: "desert" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Automatons"
    },
    {
      index: 7,
      name: "Automaton Prime",
      sector: "Ursa",
      biome: { name: "Wasteland", slug: "wasteland" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Automatons"
    },
    {
      index: 8,
      name: "Steel Valley",
      sector: "Severin",
      biome: { name: "Canyon", slug: "canyon" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Automatons"
    },
    {
      index: 9,
      name: "Robotic Fortress",
      sector: "Ursa",
      biome: { name: "Mountain", slug: "mountain" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Automatons"
    },
    {
      index: 10,
      name: "Iron Fields",
      sector: "Mirin",
      biome: { name: "Tundra", slug: "tundra" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Automatons"
    },
    
    // Territórios controlados pelos Terminids
    {
      index: 11,
      name: "Estanu",
      sector: "Mirin",
      biome: { name: "Ice", slug: "ice" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Terminids"
    },
    {
      index: 12,
      name: "Hellmire",
      sector: "Mirin",
      biome: { name: "Volcanic", slug: "volcanic" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Terminids"
    },
    {
      index: 13,
      name: "Meridia",
      sector: "Draco",
      biome: { name: "Ocean", slug: "ocean" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Terminids"
    },
    {
      index: 14,
      name: "Terminid Prime",
      sector: "Lacaille",
      biome: { name: "Forest", slug: "forest" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Terminids"
    },
    {
      index: 15,
      name: "Toxic Marsh",
      sector: "Draco",
      biome: { name: "Toxic", slug: "toxic" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Terminids"
    },
    {
      index: 16,
      name: "Hive World",
      sector: "Lacaille",
      biome: { name: "Swamp", slug: "swamp" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Terminids"
    },
    {
      index: 17,
      name: "Bug Colony",
      sector: "Mirin",
      biome: { name: "Desert", slug: "desert" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Terminids"
    },
    
    // Territórios disputados
    {
      index: 18,
      name: "Border Station Alpha",
      sector: "Frontier",
      biome: { name: "Highland", slug: "highland" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Super Earth"
    },
    {
      index: 19,
      name: "Contested World",
      sector: "Neutral Zone",
      biome: { name: "Crystal", slug: "crystal" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Automatons"
    }
  ];
}

// Rota de teste
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Helldivers 2 API Proxy ativo!',
    status: 'online',
    api_url: HELLDIVERS_API,
    timestamp: new Date().toISOString()
  });
});

// ROTA À PROVA DE BALAS PARA PLANETAS COM FACÇÕES MELHORADAS
app.get('/api/planets', async (req, res) => {
  console.log('📡 Iniciando busca de planetas com informações de facção...');
  
  // SEMPRE garantir que temos uma resposta válida
  let planetsArray = [];
  let source = 'demo-fallback';
  let apiStatus = 'offline';
  
  try {
    console.log(`🔗 Tentando conectar à API: ${HELLDIVERS_API}/planets`);
    
    const response = await axios.get(`${HELLDIVERS_API}/planets`, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Helldivers-Dashboard/1.0',
        'Accept': 'application/json'
      }
    });
    
    console.log('✅ Resposta da API recebida!');
    console.log('📊 Status:', response.status);
    console.log('📊 Tipo de dados:', typeof response.data);
    
    if (response.data && typeof response.data === 'object') {
      if (Array.isArray(response.data)) {
        planetsArray = response.data;
        console.log('✅ API retornou array direto');
      } else {
        const keys = Object.keys(response.data);
        console.log(`📊 Convertendo objeto com ${keys.length} chaves`);
        
        planetsArray = keys.map(index => {
          const planet = response.data[index];
          return {
            ...planet,
            index: parseInt(index),
            name: planet.name || `Planet ${index}`,
            sector: planet.sector || 'Unknown Sector',
            biome: planet.biome || { name: 'Unknown', slug: 'unknown' },
            maxHealth: planet.maxHealth || 1000000,
            initialOwner: planet.initialOwner || 'Super Earth',
            currentOwner: planet.currentOwner || planet.initialOwner || 'Super Earth'
          };
        });
        
        console.log('✅ Convertido objeto para array com sucesso');
      }
      
      source = 'api-real';
      apiStatus = 'online';
      
      // Log da distribuição de facções da API real
      const apiFactionCount = {
        'Super Earth': planetsArray.filter(p => (p.currentOwner || p.initialOwner) === 'Super Earth').length,
        'Automatons': planetsArray.filter(p => (p.currentOwner || p.initialOwner) === 'Automatons').length,
        'Terminids': planetsArray.filter(p => (p.currentOwner || p.initialOwner) === 'Terminids').length
      };
      console.log('📊 Facções da API real:', apiFactionCount);
      
    } else {
      throw new Error('API retornou formato inválido');
    }
    
  } catch (error) {
    console.log('⚠️ API externa falhou:', error.message);
    console.log('🎮 Usando dados demo confiáveis com distribuição realista...');
    
    // SEMPRE usar dados demo se API falhar
    planetsArray = getReliableDemoPlanets();
    source = 'demo-reliable';
    apiStatus = 'api-failed';
  }
  
  // GARANTIR que sempre temos planetas
  if (!planetsArray || planetsArray.length === 0) {
    console.log('🚨 Array de planetas vazio! Forçando dados demo...');
    planetsArray = getReliableDemoPlanets();
    source = 'demo-forced';
    apiStatus = 'empty-forced';
  }
  
  // Log da distribuição final
  const finalFactionCount = {
    'Super Earth': planetsArray.filter(p => (p.currentOwner || p.initialOwner) === 'Super Earth').length,
    'Automatons': planetsArray.filter(p => (p.currentOwner || p.initialOwner) === 'Automatons').length,
    'Terminids': planetsArray.filter(p => (p.currentOwner || p.initialOwner) === 'Terminids').length
  };
  console.log('📊 Distribuição final de facções:', finalFactionCount);
  console.log(`✅ ${planetsArray.length} planetas prontos (fonte: ${source})`);
  
  // SEMPRE retornar resposta válida
  res.json({
    planets: planetsArray,
    metadata: {
      count: planetsArray.length,
      source: source,
      apiStatus: apiStatus,
      timestamp: new Date().toISOString(),
      success: true,
      factionDistribution: finalFactionCount
    }
  });
});

// Proxy para war/status (sem modificações)
app.get('/api/war/status', async (req, res) => {
  try {
    console.log('📡 Buscando war status...');
    const response = await axios.get(`${HELLDIVERS_API}/war/status`);
    
    const data = response.data;
    const totalPlayers = data.planetStatus?.reduce((sum, planet) => sum + (planet.players || 0), 0) || 0;
    const activePlanets = data.planetStatus?.filter(planet => (planet.players || 0) > 0).length || 0;
    
    const enrichedData = {
      ...data,
      metadata: {
        totalPlayers,
        activePlanets,
        timestamp: new Date().toISOString(),
        source: 'helldivers-training-manual'
      }
    };
    
    console.log(`✅ War status obtido - ${totalPlayers.toLocaleString()} jogadores`);
    res.json(enrichedData);
  } catch (error) {
    console.error('❌ Erro ao buscar war status:', error.message);
    res.json({
      planetStatus: [],
      metadata: {
        totalPlayers: 0,
        activePlanets: 0,
        timestamp: new Date().toISOString(),
        source: 'demo-fallback',
        error: error.message
      }
    });
  }
});

// Proxy para war/campaign
app.get('/api/war/campaign', async (req, res) => {
  try {
    console.log('📡 Buscando campanhas...');
    const response = await axios.get(`${HELLDIVERS_API}/war/campaign`);
    
    const campaigns = response.data
      ?.filter(campaign => campaign.name !== "Super Earth")
      ?.map(campaign => ({
        ...campaign,
        liberationPercentage: campaign.maxHealth > 0 
          ? Math.max(0, ((campaign.maxHealth - campaign.health) / campaign.maxHealth) * 100)
          : 0
      })) || [];
    
    console.log(`✅ ${campaigns.length} campanhas encontradas`);
    res.json({
      campaigns,
      metadata: {
        count: campaigns.length,
        timestamp: new Date().toISOString(),
        source: 'helldivers-training-manual'
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar campanhas:', error.message);
    res.json({
      campaigns: [],
      metadata: {
        count: 0,
        timestamp: new Date().toISOString(),
        source: 'demo-fallback',
        error: error.message
      }
    });
  }
});

// Proxy para major orders
app.get('/api/war/major-orders', async (req, res) => {
  try {
    console.log('📡 Buscando major orders...');
    const response = await axios.get(`${HELLDIVERS_API}/war/major-orders`);
    
    console.log(`✅ ${response.data?.length || 0} major orders encontradas`);
    res.json({
      orders: response.data || [],
      metadata: {
        count: response.data?.length || 0,
        timestamp: new Date().toISOString(),
        source: 'helldivers-training-manual'
      }
    });
  } catch (error) {
    console.error('ℹ️ Nenhuma major order ativa:', error.message);
    res.json({
      orders: [],
      metadata: {
        count: 0,
        timestamp: new Date().toISOString(),
        note: 'Nenhuma major order ativa no momento'
      }
    });
  }
});

// Proxy para news
app.get('/api/war/news', async (req, res) => {
  try {
    console.log('📡 Buscando notícias...');
    const limit = req.query.limit || 10;
    const response = await axios.get(`${HELLDIVERS_API}/war/news`);
    
    const news = response.data?.slice(0, limit) || [];
    
    console.log(`✅ ${news.length} notícias encontradas`);
    res.json({
      news,
      metadata: {
        count: news.length,
        total: response.data?.length || 0,
        timestamp: new Date().toISOString(),
        source: 'helldivers-training-manual'
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar notícias:', error.message);
    res.json({
      news: [],
      metadata: {
        count: 0,
        total: 0,
        timestamp: new Date().toISOString(),
        source: 'demo-fallback',
        error: error.message
      }
    });
  }
});

// Rota de diagnóstico SUPER detalhada
app.get('/api/debug', async (req, res) => {
  const debug = {
    timestamp: new Date().toISOString(),
    backend_status: 'online',
    helldivers_api_base: HELLDIVERS_API,
    tests: {}
  };
  
  console.log('🔍 Executando diagnóstico completo...');
  
  // Testar cada endpoint
  const endpoints = [
    '/planets',
    '/war/status',
    '/war/campaign',
    '/war/major-orders',
    '/war/news'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`🔗 Testando: ${HELLDIVERS_API}${endpoint}`);
      const response = await axios.get(`${HELLDIVERS_API}${endpoint}`, { timeout: 5000 });
      
      debug.tests[endpoint] = {
        status: 'success',
        httpStatus: response.status,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        dataSize: response.data ? (Array.isArray(response.data) ? response.data.length : Object.keys(response.data).length) : 0,
        sampleData: response.data ? (Array.isArray(response.data) ? response.data[0] : Object.keys(response.data).slice(0, 3)) : null
      };
      
      console.log(`✅ ${endpoint} funcionando`);
    } catch (error) {
      debug.tests[endpoint] = {
        status: 'error',
        error: error.message,
        code: error.code
      };
      console.log(`❌ ${endpoint} falhou: ${error.message}`);
    }
  }
  
  console.log('🔍 Diagnóstico concluído');
  res.json(debug);
});

// Nova rota para debug de facções
app.get('/api/debug/factions', async (req, res) => {
  console.log('🔍 Debug específico de facções...');
  
  const demoPlanets = getReliableDemoPlanets();
  const factionAnalysis = {
    timestamp: new Date().toISOString(),
    totalPlanets: demoPlanets.length,
    factionDistribution: {
      'Super Earth': demoPlanets.filter(p => p.currentOwner === 'Super Earth').length,
      'Automatons': demoPlanets.filter(p => p.currentOwner === 'Automatons').length,
      'Terminids': demoPlanets.filter(p => p.currentOwner === 'Terminids').length
    },
    planetDetails: demoPlanets.map(p => ({
      name: p.name,
      currentOwner: p.currentOwner,
      initialOwner: p.initialOwner,
      biome: p.biome?.slug
    }))
  };
  
  console.log('📊 Análise de facções:', factionAnalysis.factionDistribution);
  
  res.json(factionAnalysis);
});

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error('❌ Erro interno do servidor:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('\n🚀 ================================');
  console.log(`🛡️  Helldivers 2 API Proxy`);
  console.log(`🌐 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Proxy ativo para: ${HELLDIVERS_API}`);
  console.log(`🔗 Acesse: http://localhost:${PORT}`);
  console.log(`🔍 Debug: http://localhost:${PORT}/api/debug`);
  console.log(`🎯 Debug Facções: http://localhost:${PORT}/api/debug/factions`);
  console.log('🚀 ================================\n');
});