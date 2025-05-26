import React, { useState, useEffect } from 'react';
import { Activity, Users, Shield, Target, Globe, Zap, AlertTriangle, Award } from 'lucide-react';
import axios from 'axios';
import GalaxyMap3D from './GalaxyMap3D';

const App = () => {
  const [warStatus, setWarStatus] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [majorOrders, setMajorOrders] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  // Função para buscar dados da API
  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('🚀 Conectando ao servidor local...');
      
      // URL base do nosso backend local
      const API_BASE = 'http://localhost:5000/api';
      
      // Buscar dados das campanhas
      console.log('📡 Buscando campanhas...');
      const campaignsResponse = await axios.get(`${API_BASE}/war/campaign`);
      const campaignsData = campaignsResponse.data.campaigns || [];
      setCampaigns(campaignsData);
      console.log(`✅ ${campaignsData.length} campanhas encontradas`);

      // Buscar status da guerra
      console.log('📡 Buscando status da guerra...');
      const statusResponse = await axios.get(`${API_BASE}/war/status`);
      const statusData = statusResponse.data;
      
      setWarStatus({
        warId: statusData.warId,
        time: statusData.time,
        totalPlayers: statusData.metadata.totalPlayers,
        activePlanets: statusData.metadata.activePlanets,
        lastUpdate: new Date().toLocaleTimeString('pt-BR')
      });
      console.log(`✅ Status obtido - ${statusData.metadata.totalPlayers.toLocaleString()} Helldivers ativos`);

      // Buscar ordens principais
      console.log('📡 Buscando ordens principais...');
      const ordersResponse = await axios.get(`${API_BASE}/war/major-orders`);
      setMajorOrders(ordersResponse.data.orders || []);
      console.log(`✅ ${ordersResponse.data.orders?.length || 0} ordens principais encontradas`);

      // Buscar notícias
      console.log('📡 Buscando notícias...');
      const newsResponse = await axios.get(`${API_BASE}/war/news?limit=8`);
      setNews(newsResponse.data.news || []);
      console.log(`✅ ${newsResponse.data.news?.length || 0} notícias encontradas`);

      setError(null);
      console.log('🎉 Todos os dados carregados com sucesso!');
    } catch (err) {
      console.error('❌ Erro ao buscar dados:', err);
      
      if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        setError('Servidor backend não encontrado. Certifique-se de que o servidor está rodando em http://localhost:5000');
      } else if (err.response?.status >= 500) {
        setError(`Erro no servidor backend: ${err.response.data?.error || err.message}`);
      } else {
        setError(`Erro de conexão: ${err.message}`);
      }
      
      // NÃO usar dados de fallback - queremos apenas dados reais
      setWarStatus(null);
      setCampaigns([]);
      setMajorOrders([]);
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Atualizar dados a cada 30 segundos
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getFactionColor = (faction) => {
    switch(faction) {
      case 'Terminids': return 'from-yellow-500 to-orange-600';
      case 'Automatons': return 'from-red-500 to-red-700';
      default: return 'from-blue-500 to-blue-700';
    }
  };

  const getFactionIcon = (faction) => {
    switch(faction) {
      case 'Terminids': return '🦂';
      case 'Automatons': return '🤖';
      default: return '⚡';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-cyan-400 text-xl font-bold">Loading War Status...</p>
          <p className="text-slate-400">Connecting to Super Earth Command</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-cyan-500/30 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-cyan-500 p-2 rounded-lg">
              <Shield className="w-8 h-8 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-cyan-400">HELLDIVERS 2</h1>
              <div className="flex items-center space-x-2">
                <p className="text-slate-400">War Command Dashboard</p>
                <div className={`w-2 h-2 rounded-full ${error ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                <span className={`text-xs ${error ? 'text-yellow-400' : 'text-green-400'}`}>
                  {error ? 'Demo Mode' : 'Live Data'}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">War ID: {warStatus?.warId}</p>
            <p className="text-lg font-bold text-cyan-400">ACTIVE</p>
            {warStatus?.lastUpdate && (
              <p className="text-xs text-slate-500">Last Update: {warStatus.lastUpdate}</p>
            )}
            <button 
              onClick={fetchData}
              disabled={loading}
              className={`mt-2 px-3 py-1 rounded text-sm transition-colors ${
                loading 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-cyan-600 hover:bg-cyan-700'
              }`}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500/50 p-4 mx-6 mt-4 rounded-lg">
          <p className="text-red-400">⚠️ {error}</p>
          <div className="text-red-300 text-sm mt-2">
            <p>📋 <strong>Como resolver:</strong></p>
            <ol className="list-decimal ml-4 mt-1 space-y-1">
              <li>Abra um novo terminal na pasta <code>backend</code></li>
              <li>Execute: <code>npm install</code></li>
              <li>Execute: <code>npm run dev</code></li>
              <li>Aguarde ver "Servidor rodando na porta 5000"</li>
              <li>Clique em "Refresh" aqui</li>
            </ol>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* War Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-cyan-600 to-blue-700 p-6 rounded-xl border border-cyan-500/30">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8" />
              <div>
                <p className="text-sm opacity-80">Active Helldivers</p>
                <p className="text-2xl font-bold">{warStatus?.totalPlayers?.toLocaleString() || '0'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-6 rounded-xl border border-green-500/30">
            <div className="flex items-center space-x-3">
              <Globe className="w-8 h-8" />
              <div>
                <p className="text-sm opacity-80">Active Planets</p>
                <p className="text-2xl font-bold">{warStatus?.activePlanets || '0'}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-600 to-orange-700 p-6 rounded-xl border border-yellow-500/30">
            <div className="flex items-center space-x-3">
              <Target className="w-8 h-8" />
              <div>
                <p className="text-sm opacity-80">Major Orders</p>
                <p className="text-2xl font-bold">{majorOrders?.length || '0'}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-xl border border-purple-500/30">
            <div className="flex items-center space-x-3">
              <Zap className="w-8 h-8" />
              <div>
                <p className="text-sm opacity-80">War Time</p>
                <p className="text-2xl font-bold">{Math.floor((warStatus?.time || 0) / 3600)}h</p>
              </div>
            </div>
          </div>
        </div>

        {/* Major Orders */}
        {majorOrders && majorOrders.length > 0 && (
          <div className="bg-gradient-to-r from-red-900/50 to-orange-900/50 p-6 rounded-xl border border-red-500/30">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <h2 className="text-xl font-bold text-red-400">MAJOR ORDER ACTIVE</h2>
            </div>
            {majorOrders.map((order, index) => (
              <div key={order.id32 || index} className="space-y-3">
                <h3 className="text-lg font-bold">{order.setting?.overrideTitle || 'MAJOR ORDER'}</h3>
                <p className="text-slate-300">{order.setting?.overrideBrief || 'Briefing not available'}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Task: {order.setting?.taskDescription || 'N/A'}</span>
                  <div className="flex items-center space-x-2">
                    <Award className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-400">
                      {order.setting?.reward?.amount || 0} Medals
                    </span>
                  </div>
                </div>
                {order.progress && (
                  <div className="flex space-x-2">
                    {order.progress.map((completed, i) => (
                      <div key={i} className={`w-4 h-4 rounded ${completed ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                    ))}
                  </div>
                )}
                <p className="text-sm text-slate-400">Expires in: {Math.floor((order.expiresIn || 0) / 3600)}h {Math.floor(((order.expiresIn || 0) % 3600) / 60)}m</p>
              </div>
            ))}
          </div>
        )}

        {/* Active Campaigns */}
        <div className="space-y-6">
          {/* Mapa 3D grande - topo */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400 flex items-center space-x-2">
              <Globe className="w-6 h-6" />
              <span>Galaxy War Map</span>
              <span className="text-sm text-slate-400">• Real-time 3D view</span>
            </h2>
            
            <div className="relative bg-black/50 rounded-xl border border-cyan-500/30 h-[600px] overflow-hidden">
              <GalaxyMap3D 
                campaigns={campaigns} 
                embedded={true}
                showControls={true}
              />
            </div>
          </div>

          {/* Campanhas em grid - embaixo */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400 flex items-center space-x-2">
              <Activity className="w-6 h-6" />
              <span>Active Campaigns ({campaigns.length})</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {campaigns.map(campaign => (
                <div key={campaign.planetIndex} className={`bg-gradient-to-br ${getFactionColor(campaign.faction)}/20 p-4 rounded-xl border border-slate-600/30 hover:border-cyan-500/50 transition-all hover:scale-105`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold">{campaign.name}</h3>
                    <span className="text-xl">{getFactionIcon(campaign.faction)}</span>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Faction:</span>
                      <span className="font-semibold">{campaign.faction}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Players:</span>
                      <span className="font-semibold text-green-400">{campaign.players?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Liberation:</span>
                      <span className={`font-semibold ${campaign.liberationPercentage > 50 ? 'text-green-400' : campaign.liberationPercentage > 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {campaign.liberationPercentage?.toFixed(1) || campaign.percentage?.toFixed(1) || '0.0'}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                    <div 
                      className={`bg-gradient-to-r ${getFactionColor(campaign.faction)} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${campaign.liberationPercentage || campaign.percentage || 0}%` }}
                    ></div>
                  </div>

                  <div className="flex space-x-1">
                    {campaign.defense && (
                      <span className="px-2 py-1 bg-red-600/30 text-red-400 text-xs rounded-full border border-red-500/30">
                        DEFENSE
                      </span>
                    )}
                    {campaign.majorOrder && (
                      <span className="px-2 py-1 bg-yellow-600/30 text-yellow-400 text-xs rounded-full border border-yellow-500/30">
                        MAJOR ORDER
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* News Feed */}
        {news && news.length > 0 && (
          <div className="bg-black/30 backdrop-blur-sm p-6 rounded-xl border border-slate-600/30">
            <h2 className="text-xl font-bold text-cyan-400 mb-4">War Updates</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {news.map(item => {
                const timeAgo = Math.floor((Date.now() - item.published) / (1000 * 60 * 60));
                return (
                  <div key={item.id} className="p-3 bg-slate-800/50 rounded-lg border-l-4 border-cyan-500">
                    <p className="text-sm text-slate-300 whitespace-pre-line">{item.message}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {timeAgo > 0 ? `${timeAgo}h ago` : 'Now'} • ID: {item.published}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;  