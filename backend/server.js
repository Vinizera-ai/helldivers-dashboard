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

// Dados demo que SEMPRE funcionam
function getReliableDemoPlanets() {
  return [
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
      name: "Klen Dahth II",
      sector: "Altus",
      biome: { name: "Desert", slug: "desert" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Super Earth"
    },
    {
      index: 2,
      name: "Pathfinder V",
      sector: "Altus", 
      biome: { name: "Jungle", slug: "jungle" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Terminids"
    },
    {
      index: 3,
      name: "Widow's Harbor",
      sector: "Altus",
      biome: { name: "Ocean", slug: "ocean" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Automatons"
    },
    {
      index: 4,
      name: "Malevelon Creek",
      sector: "Severin",
      biome: { name: "Jungle", slug: "jungle" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Automatons"
    },
    {
      index: 5,
      name: "Estanu",
      sector: "Mirin",
      biome: { name: "Ice", slug: "ice" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Terminids"
    },
    {
      index: 6,
      name: "Gaellivare",
      sector: "Mirin",
      biome: { name: "Desert", slug: "desert" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Automatons"
    },
    {
      index: 7,
      name: "Terrek",
      sector: "Mirin",
      biome: { name: "Moon", slug: "moon" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Terminids"
    },
    {
      index: 8,
      name: "New Haven",
      sector: "Hydra",
      biome: { name: "Swamp", slug: "swamp" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Super Earth"
    },
    {
      index: 9,
      name: "Fort Unity",
      sector: "Hydra",
      biome: { name: "Mountain", slug: "mountain" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Super Earth"
    },
    {
      index: 10,
      name: "Prosperity Falls",
      sector: "Draco",
      biome: { name: "Volcanic", slug: "volcanic" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Terminids"
    },
    {
      index: 11,
      name: "Democracy Valley",
      sector: "Draco",
      biome: { name: "Desert", slug: "desert" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Super Earth"
    },
    {
      index: 12,
      name: "Liberty Station",
      sector: "Ursa",
      biome: { name: "Ice", slug: "ice" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Automatons"
    },
    {
      index: 13,
      name: "Freedom Peak",
      sector: "Ursa",
      biome: { name: "Mountain", slug: "mountain" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Super Earth"
    },
    {
      index: 14,
      name: "Eagle's Nest",
      sector: "Lacaille",
      biome: { name: "Jungle", slug: "jungle" },
      maxHealth: 1000000,
      initialOwner: "Super Earth", 
      currentOwner: "Terminids"
    },
    {
      index: 15,
      name: "Valor Ridge",
      sector: "Lacaille",
      biome: { name: "Desert", slug: "desert" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Super Earth"
    },
    {
      index: 16,
      name: "Honor Falls",
      sector: "Draco",
      biome: { name: "Mountain", slug: "mountain" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Super Earth"
    },
    {
      index: 17,
      name: "Victory Point",
      sector: "Ursa",
      biome: { name: "Volcanic", slug: "volcanic" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Automatons"
    },
    {
      index: 18,
      name: "Triumph Heights",
      sector: "Lacaille",
      biome: { name: "Ice", slug: "ice" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Terminids"
    },
    {
      index: 19,
      name: "Gallant Fields",
      sector: "Hydra",
      biome: { name: "Swamp", slug: "swamp" },
      maxHealth: 1000000,
      initialOwner: "Super Earth",
      currentOwner: "Super Earth"
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

// ROTA À PROVA DE BALAS PARA PLANETAS
app.get('/api/planets', async (req, res) => {
  console.log('📡 Iniciando busca de planetas...');
  
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
    console.log('📊 Dados:', response.data ? 'existem' : 'vazios');
    
    if (response.data && typeof response.data === 'object') {
      if (Array.isArray(response.data)) {
        // Se já é array, usar direto
        planetsArray = response.data;
        console.log('✅ API retornou array direto');
      } else {
        // Converter objeto para array
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
      
    } else {
      throw new Error('API retornou formato inválido');
    }
    
  } catch (error) {
    console.log('⚠️ API externa falhou:', error.message);
    console.log('🎮 Usando dados demo confiáveis...');
    
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
  
  console.log(`✅ ${planetsArray.length} planetas prontos (fonte: ${source})`);
  
  // SEMPRE retornar resposta válida
  res.json({
    planets: planetsArray,
    metadata: {
      count: planetsArray.length,
      source: source,
      apiStatus: apiStatus,
      timestamp: new Date().toISOString(),
      success: true
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
  console.log('🚀 ================================\n');
});