const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Base URL da API do Helldivers
const HELLDIVERS_API = 'https://helldiverstrainingmanual.com/api/v1';

// Log das requisições
app.use((req, res, next) => {
  console.log(`🌐 ${new Date().toLocaleTimeString()} - ${req.method} ${req.path}`);
  next();
});

// Rota de teste
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Helldivers 2 API Proxy ativo!',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// Proxy para war/status
app.get('/api/war/status', async (req, res) => {
  try {
    console.log('📡 Buscando war status...');
    const response = await axios.get(`${HELLDIVERS_API}/war/status`);
    
    // Calcular estatísticas adicionais
    const data = response.data;
    const totalPlayers = data.planetStatus.reduce((sum, planet) => sum + planet.players, 0);
    const activePlanets = data.planetStatus.filter(planet => planet.players > 0).length;
    
    // Adicionar metadados úteis
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
    res.status(500).json({ 
      error: 'Erro ao buscar dados da guerra',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Proxy para war/campaign
app.get('/api/war/campaign', async (req, res) => {
  try {
    console.log('📡 Buscando campanhas...');
    const response = await axios.get(`${HELLDIVERS_API}/war/campaign`);
    
    // Filtrar Super Earth e adicionar metadados
    const campaigns = response.data
      .filter(campaign => campaign.name !== "Super Earth")
      .map(campaign => ({
        ...campaign,
        // Calcular porcentagem de liberação correta
        liberationPercentage: campaign.maxHealth > 0 
          ? Math.max(0, ((campaign.maxHealth - campaign.health) / campaign.maxHealth) * 100)
          : 0
      }));
    
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
    res.status(500).json({ 
      error: 'Erro ao buscar campanhas',
      details: error.message,
      timestamp: new Date().toISOString()
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
    // Para major orders, retornar array vazio é normal
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
    
    const news = response.data.slice(0, limit);
    
    console.log(`✅ ${news.length} notícias encontradas`);
    res.json({
      news,
      metadata: {
        count: news.length,
        total: response.data.length,
        timestamp: new Date().toISOString(),
        source: 'helldivers-training-manual'
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar notícias:', error.message);
    res.status(500).json({ 
      error: 'Erro ao buscar notícias',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Rota para informações do planeta específico
app.get('/api/planets/:planetIndex', async (req, res) => {
  try {
    const { planetIndex } = req.params;
    console.log(`📡 Buscando info do planeta ${planetIndex}...`);
    
    const response = await axios.get(`${HELLDIVERS_API}/planets`);
    const planetInfo = response.data[planetIndex];
    
    if (!planetInfo) {
      return res.status(404).json({
        error: 'Planeta não encontrado',
        planetIndex,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ Info do planeta ${planetInfo.name} encontrada`);
    res.json({
      planet: planetInfo,
      metadata: {
        planetIndex,
        timestamp: new Date().toISOString(),
        source: 'helldivers-training-manual'
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar info do planeta:', error.message);
    res.status(500).json({ 
      error: 'Erro ao buscar informações do planeta',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error('❌ Erro interno do servidor:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
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
  console.log('🚀 ================================\n');
});