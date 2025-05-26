import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, Users, Shield, Target, Globe, Zap, AlertTriangle, Award, RefreshCw } from 'lucide-react';
import axios from 'axios';
import GalaxyMap3D from './GalaxyMap3D';

const App = () => {
  const [warStatus, setWarStatus] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [majorOrders, setMajorOrders] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  
  // Usar useRef para evitar re-criar o mapa 3D desnecessariamente
  const mapDataRef = useRef({ campaigns: [], warStatus: null });

  // URL base do nosso backend local
  const API_BASE = 'http://localhost:5000/api';

  // Função para buscar dados da API com melhor controle
  const fetchData = useCallback(async (isAutoRefresh = false) => {
    try {
      if (!isAutoRefresh) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      console.log(`🔄 ${isAutoRefresh ? 'Auto-refresh' : 'Manual refresh'} iniciado...`);
      
      // Buscar todos os dados em paralelo para maior velocidade
      const [campaignsResponse, statusResponse, ordersResponse, newsResponse] = await Promise.all([
        axios.get(`${API_BASE}/war/campaign`),
        axios.get(`${API_BASE}/war/status`),
        axios.get(`${API_BASE}/war/major-orders`),
        axios.get(`${API_BASE}/war/news?limit=8`)
      ]);

      // Processar campanhas
      const campaignsData = campaignsResponse.data.campaigns || [];
      setCampaigns(campaignsData);

      // Processar status da guerra
      const statusData = statusResponse.data;
      const newWarStatus = {
        warId: statusData.warId,
        time: statusData.time,
        totalPlayers: statusData.metadata.totalPlayers,
        activePlanets: statusData.metadata.activePlanets,
        lastUpdate: new Date().toLocaleTimeString('pt-BR'),
        planetStatus: statusData.planetStatus || [] // Incluir dados dos planetas
      };
      setWarStatus(newWarStatus);

      // Processar ordens principais
      setMajorOrders(ordersResponse.data.orders || []);

      // Processar notícias
      setNews(newsResponse.data.news || []);

      // Atualizar referência para o mapa 3D
      mapDataRef.current = {
        campaigns: campaignsData,
        warStatus: newWarStatus
      };

      setError(null);
      setLastUpdate(new Date());
      setRefreshCount(prev => prev + 1);
      
      console.log(`✅ ${isAutoRefresh ? 'Auto-refresh' : 'Refresh'} concluído!`);
      
    } catch (err) {
      console.error('❌ Erro ao buscar dados:', err);
      
      if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        setError('Servidor backend não encontrado. Certifique-se de que o servidor está rodando em http://localhost:5000');
      } else if (err.response?.status >= 500) {
        setError(`Erro no servidor backend: ${err.response.data?.error || err.message}`);
      } else {
        setError(`Erro de conexão: ${err.message}`);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [API_BASE]);

  // Refresh manual
  const handleManualRefresh = () => {
    fetchData(false);
  };

  // Configurar auto-refresh inteligente
  useEffect(() => {
    // Buscar dados iniciais
    fetchData(false);
    
    // Auto-refresh a cada 30 segundos (apenas dados, não recarrega página)
    const interval = setInterval(() => {
      fetchData(true);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchData]);

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
      {/* Header Melhorado */}
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
                <div className={`w-2 h-2 rounded-full ${error ? 'bg-yellow-500' : 'bg-green-500'} ${!error ? 'animate-pulse' : ''}`}></div>
                <span className={`text-xs ${error ? 'text-yellow-400' : 'text-green-400'}`}>
                  {error ? 'Demo Mode' : 'Live Data'}
                </span>
                {isRefreshing && (
                  <div className="flex items-center space-x-1 text-cyan-400">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span className="text-xs">Updating...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-slate-400">War ID: {warStatus?.warId}</p>
            <p className="text-lg font-bold text-cyan-400">ACTIVE</p>
            {lastUpdate && (
              <p className="text-xs text-slate-500">
                Last Update: {lastUpdate.toLocaleTimeString('pt-BR')}
              </p>
            )}
            <div className="flex space-x-2 mt-2">
              <button 
                onClick={handleManualRefresh}
                disabled={loading || isRefreshing}
                className={`px-3 py-1 rounded text-sm transition-colors flex items-center space-x-1 ${
                  loading || isRefreshing
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-cyan-600 hover:bg-cyan-700'
                }`}
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
              </button>
              <div className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-400">
                #{refreshCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Indicador de Auto-Refresh */}
      <div className="bg-green-900/30 border-b border-green-500/30 p-2">
        <div className="max-w-7xl mx-auto">
          <p className="text-green-400 text-sm text-center">
            🔄 Auto-refresh ativo: dados atualizados automaticamente a cada 30 segundos
            {lastUpdate && ` • Próxima atualização em ${30 - Math.floor((Date.now() - lastUpdate.getTime()) / 1000)}s`}
          </p>
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
        {/* War Stats com Animações */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-cyan-600 to-blue-700 p-6 rounded-xl border border-cyan-500/30 transition-all duration-300 hover:scale-105">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8" />
              <div>
                <p className="text-sm opacity-80">Active Helldivers</p>
                <p className="text-2xl font-bold">{warStatus?.totalPlayers?.toLocaleString() || '0'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-6 rounded-xl border border-green-500/30 transition-all duration-300 hover:scale-105">
            <div className="flex items-center space-x-3">
              <Globe className="w-8 h-8" />
              <div>
                <p className="text-sm opacity-80">Active Planets</p>
                <p className="text-2xl font-bold">{warStatus?.activePlanets || '0'}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-600 to-orange-700 p-6 rounded-xl border border-yellow-500/30 transition-all duration-300 hover:scale-105">
            <div className="flex items-center space-x-3">
              <Target className="w-8 h-8" />
              <div>
                <p className="text-sm opacity-80">Major Orders</p>
                <p className="text-2xl font-bold">{majorOrders?.length || '0'}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-xl border border-purple-500/30 transition-all duration-300 hover:scale-105">
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

        {/* Mapa 3D Otimizado */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400 flex items-center space-x-2">
              <Globe className="w-6 h-6" />
              <span>Galaxy War Map</span>
              <span className="text-sm text-slate-400">• Real-time 3D view</span>
              {isRefreshing && <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />}
            </h2>
            
            <div className="relative bg-black/50 rounded-xl border border-cyan-500/30 h-[600px] overflow-hidden">
              <GalaxyMap3D 
                campaigns={campaigns} 
                warStatus={warStatus}
                embedded={true}
                showControls={true}
                refreshKey={refreshCount} // Força re-render quando dados mudam
              />
            </div>
          </div>

          {/* Campanhas em grid */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400 flex items-center space-x-2">
              <Activity className="w-6 h-6" />
              <span>Active Campaigns ({campaigns.length})</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {campaigns.map(campaign => (
                <div key={campaign.planetIndex} className={`bg-gradient-to-br ${getFactionColor(campaign.faction)}/20 p-4 rounded-xl border border-slate-600/30 hover:border-cyan-500/50 transition-all hover:scale-105 duration-300`}>
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

                  {/* Progress Bar Animada */}
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                    <div 
                      className={`bg-gradient-to-r ${getFactionColor(campaign.faction)} h-2 rounded-full transition-all duration-1000`}
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
                  <div key={item.id} className="p-3 bg-slate-800/50 rounded-lg border-l-4 border-cyan-500 transition-all duration-300 hover:bg-slate-700/50">
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