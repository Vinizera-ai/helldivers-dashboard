import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Users, Target, Shield, Zap, Eye, RotateCcw, ArrowLeft, Globe2, Activity, RefreshCw } from 'lucide-react';
import axios from 'axios';

const GalaxyMap3D = ({ 
  onBack, 
  campaigns = [], 
  warStatus = null,
  embedded = false, 
  fullscreen = false, 
  onMaximize, 
  showControls = false,
  refreshKey = 0
}) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const planetMeshesRef = useRef([]);
  const planetsGroupRef = useRef(null);
  const animationIdRef = useRef(null);
  const isInitializedRef = useRef(false);
  
  // Estados
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRotateUI, setAutoRotateUI] = useState(false);
  const [allPlanets, setAllPlanets] = useState([]);
  const [showPlanetNames, setShowPlanetNames] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [factionUpdateTrigger, setFactionUpdateTrigger] = useState(0);

  // Controles de câmera persistentes
  const cameraControlsRef = useRef({
    mouseDown: false,
    lastMouse: { x: 0, y: 0 },
    theta: 0,
    phi: Math.PI / 4,
    distance: 150,
    autoRotate: false
  });

  // Função para buscar planetas (SEM recriar a cena)
  const fetchAllPlanets = useCallback(async (isUpdate = false) => {
    console.log(`📡 ${isUpdate ? 'Atualizando' : 'Carregando'} planetas...`);
    
    if (!isUpdate) {
      setIsLoading(true);
    } else {
      setIsUpdating(true);
    }
    
    try {
      // Testar backend
      await axios.get('http://localhost:5000/', { timeout: 3000 });
      
      // Buscar planetas
      const planetsResponse = await axios.get('http://localhost:5000/api/planets', { 
        timeout: 20000
      });
      
      // Extrair dados
      let planetsData = [];
      if (planetsResponse.data?.planets && Array.isArray(planetsResponse.data.planets)) {
        planetsData = planetsResponse.data.planets;
      } else if (Array.isArray(planetsResponse.data)) {
        planetsData = planetsResponse.data;
      } else {
        throw new Error('Formato de resposta não reconhecido');
      }
      
      if (!planetsData || planetsData.length === 0) {
        throw new Error('Array de planetas vazio');
      }
      
      // Usar dados de guerra já disponíveis
      let planetStatusData = [];
      if (warStatus?.planetStatus) {
        planetStatusData = warStatus.planetStatus;
      }
      
      // Processar planetas
      const enrichedPlanets = planetsData.map((planet, arrayIndex) => {
        const planetIndex = planet.index !== undefined ? planet.index : arrayIndex;
        const warData = planetStatusData.find(p => p.index === planetIndex) || {};
        const campaignData = campaigns.find(c => 
          c.name === planet.name || c.planetIndex === planetIndex
        ) || {};
        
        // Posição na galáxia
        let position;
        if (planet.name === "Super Earth") {
          position = { x: 0, y: 0, z: 0 };
        } else {
          const angle = (planetIndex / Math.max(planetsData.length, 20)) * Math.PI * 6;
          const radius = 30 + (planetIndex % 5) * 15;
          const height = (Math.sin(planetIndex * 0.3) * 25);
          position = {
            x: Math.cos(angle) * radius,
            y: height,
            z: Math.sin(angle) * radius
          };
        }
        
        return {
          name: planet.name || `Planet ${planetIndex}`,
          index: planetIndex,
          sector: planet.sector || 'Unknown Sector',
          biome: planet.biome || { name: 'Unknown', slug: 'desert' },
          position: position,
          faction: warData.owner || planet.currentOwner || planet.initialOwner || 'Super Earth',
          players: warData.players || 0,
          health: warData.health || planet.maxHealth || 1000000,
          maxHealth: planet.maxHealth || 1000000,
          status: calculatePlanetStatus(planet, warData, campaignData),
          isActive: (warData.players || 0) > 0 || Object.keys(campaignData).length > 0,
          liberationPercentage: campaignData.liberationPercentage || campaignData.percentage || 0,
          defense: campaignData.defense || campaignData.type === 'Defense' || false,
          majorOrder: campaignData.majorOrder || false
        };
      });
      
      // Garantir Super Earth
      const superEarth = enrichedPlanets.find(p => p.name === "Super Earth");
      if (superEarth) {
        superEarth.position = { x: 0, y: 0, z: 0 };
        superEarth.faction = "Super Earth";
        superEarth.status = "safe";
        superEarth.isActive = true;
      }
      
      console.log(`🎉 SUCESSO! ${enrichedPlanets.length} planetas ${isUpdate ? 'atualizados' : 'carregados'}`);
      
      // Atualizar estado
      setAllPlanets(enrichedPlanets);
      setError(null);
      
      // Se é uma atualização e a cena já existe, atualizar apenas os meshes
      if (isUpdate && isInitializedRef.current && planetMeshesRef.current.length > 0) {
        updatePlanetMeshes(enrichedPlanets);
      }
      
    } catch (err) {
      console.error('❌ ERRO:', err.message);
      
      if (!isUpdate) {
        console.log('🚨 Carregando planetas de emergência com distribuição realista...');
        const emergencyPlanets = generateEmergencyPlanets();
        setAllPlanets(emergencyPlanets);
        
        // Forçar atualização da contagem de facções para planetas de emergência
        setTimeout(() => {
          const event = new CustomEvent('factionUpdate', { 
            detail: { 
              factionCount: {
                'Super Earth': emergencyPlanets.filter(p => p.faction === 'Super Earth').length,
                'Automatons': emergencyPlanets.filter(p => p.faction === 'Automatons').length,
                'Terminids': emergencyPlanets.filter(p => p.faction === 'Terminids').length
              }
            } 
          });
          window.dispatchEvent(event);
        }, 100);
      }
      
      if (err.message.includes('timeout')) {
        setError('API timeout');
      } else if (err.message.includes('Network Error')) {
        setError('Backend offline');
      } else {
        setError('Erro na API');
      }
    } finally {
      setIsLoading(false);
      setIsUpdating(false);
    }
  }, [campaigns, warStatus]);

  // Mapeamento de facções numéricas para nomes
  const mapFactionIdToName = (factionId) => {
    // Converter para string caso seja número
    const id = String(factionId).toLowerCase();
    
    switch(id) {
      case '1':
      case 'humans':
      case 'super earth':
      case 'super_earth':
        return 'Super Earth';
      case '2': 
      case 'bugs':
      case 'terminids':
        return 'Terminids';
      case '3':
      case 'bots':
      case 'cyborgs':
      case 'automatons':
        return 'Automatons';
      default:
        // Se já é um nome válido, retornar como está
        if (['Super Earth', 'Terminids', 'Automatons'].includes(factionId)) {
          return factionId;
        }
        // Padrão para IDs desconhecidos
        console.log(`⚠️ Facção desconhecida: ${factionId}, usando Super Earth como padrão`);
        return 'Super Earth';
    }
  };
  const updatePlanetMeshes = useCallback((updatedPlanets) => {
    if (!planetMeshesRef.current || planetMeshesRef.current.length === 0) return;
    
    console.log('🔄 Atualizando meshes dos planetas (preservando câmera e cores)...');
    console.log('📊 Dados dos planetas:', updatedPlanets.slice(0, 3).map(p => ({ 
      name: p.name, 
      faction: p.faction, 
      biome: p.biome?.slug,
      isActive: p.isActive 
    })));
    
    planetMeshesRef.current.forEach((mesh, index) => {
      const planetData = updatedPlanets[index];
      if (!planetData) return;
      
      // Atualizar dados do planeta
      mesh.userData.planetData = planetData;
      
      // MANTER a cor original do bioma (não mudar a cor do planeta)
      // A cor do planeta deve ser baseada no bioma, não na facção
      const biomeColor = getBiomeColor(planetData.biome);
      mesh.material.color.setHex(biomeColor);
      
      // Debug: Log das primeiras atualizações
      if (index < 3) {
        console.log(`🎨 Planeta ${planetData.name}: bioma=${planetData.biome?.slug}, cor=0x${biomeColor.toString(16)}, facção=${planetData.faction}`);
      }
      
      // Atualizar anel de atividade com cor da facção
      if (mesh.userData.activityRing) {
        const factionColor = getFactionColor(planetData.faction);
        mesh.userData.activityRing.material.color.setHex(factionColor);
        mesh.userData.activityRing.visible = planetData.isActive;
        
        // Atualizar opacidade baseada no status
        if (planetData.status === 'critical') {
          mesh.userData.activityRing.material.opacity = 0.9;
        } else if (planetData.status === 'active') {
          mesh.userData.activityRing.material.opacity = 0.7;
        } else {
          mesh.userData.activityRing.material.opacity = 0.5;
        }
      }
      
      // Atualizar atmosfera com cor da facção
      if (mesh.userData.atmosphere) {
        const factionColor = getFactionColor(planetData.faction);
        mesh.userData.atmosphere.material.color.setHex(factionColor);
        
        // Atualizar opacidade baseada na atividade
        if (planetData.isActive) {
          mesh.userData.atmosphere.material.opacity = 0.15;
        } else if (planetData.faction !== 'Super Earth') {
          mesh.userData.atmosphere.material.opacity = 0.08;
        } else {
          mesh.userData.atmosphere.material.opacity = 0.05;
        }
      }
      
      // Criar/atualizar indicador de status visual
      if (planetData.status === 'critical' && !mesh.userData.warningRing) {
        // Adicionar anel de aviso para planetas críticos
        const warningGeometry = new THREE.TorusGeometry(mesh.geometry.parameters.radius * 2, 0.1, 8, 100);
        const warningMaterial = new THREE.MeshBasicMaterial({
          color: 0xFF0000,
          transparent: true,
          opacity: 0.8
        });
        const warningRing = new THREE.Mesh(warningGeometry, warningMaterial);
        warningRing.position.copy(mesh.position);
        warningRing.rotation.x = Math.PI / 2;
        
        if (planetsGroupRef.current) {
          planetsGroupRef.current.add(warningRing);
          mesh.userData.warningRing = warningRing;
        }
      } else if (planetData.status !== 'critical' && mesh.userData.warningRing) {
        // Remover anel de aviso se não for mais crítico
        if (planetsGroupRef.current) {
          planetsGroupRef.current.remove(mesh.userData.warningRing);
          mesh.userData.warningRing.geometry.dispose();
          mesh.userData.warningRing.material.dispose();
          delete mesh.userData.warningRing;
        }
      }
    });
    
    console.log('✅ Meshes atualizados sem resetar câmera (cores preservadas)!');
  }, []);

  // Função para calcular status do planeta
  const calculatePlanetStatus = (planetData = {}, warData = {}, campaignData = {}) => {
    if (planetData.name === "Super Earth") return 'safe';
    if (campaignData.defense || campaignData.type === 'Defense') return 'critical';
    if (warData.players > 1000) return 'active';
    if (warData.players > 0) return 'contested';
    if (Object.keys(campaignData).length > 0) return 'contested';
    if (planetData.currentOwner === 'Terminids' || planetData.currentOwner === 'Automatons') return 'contested';
    return 'peaceful';
  };

  // Função para gerar planetas de emergência com distribuição realista
  const generateEmergencyPlanets = () => {
    console.log('🚨 Gerando planetas de emergência com distribuição realista...');
    
    const emergencyPlanets = [
      // Super Earth (sempre azul)
      {
        name: "Super Earth", index: 0, faction: "Super Earth", players: 50000,
        health: 1000000, maxHealth: 1000000, position: { x: 0, y: 0, z: 0 },
        biome: { name: "Homeworld", slug: "homeworld" }, sector: "Sol System",
        status: "safe", isActive: true, liberationPercentage: 100
      },
      
      // Planetas controlados por Super Earth
      {
        name: "Tien Kwan", index: 1, faction: "Super Earth", players: 0,
        health: 1000000, maxHealth: 1000000, position: { x: -25, y: 5, z: -45 },
        biome: { name: "Swamp", slug: "swamp" }, sector: "Hydra",
        status: "peaceful", isActive: false, liberationPercentage: 100
      },
      {
        name: "Mort", index: 2, faction: "Super Earth", players: 0,
        health: 1000000, maxHealth: 1000000, position: { x: 35, y: -10, z: 50 },
        biome: { name: "Mountain", slug: "mountain" }, sector: "Hydra",
        status: "peaceful", isActive: false, liberationPercentage: 100
      },
      {
        name: "Cyberstan", index: 3, faction: "Super Earth", players: 0,
        health: 1000000, maxHealth: 1000000, position: { x: -40, y: 15, z: 25 },
        biome: { name: "Plains", slug: "plains" }, sector: "Draco",
        status: "peaceful", isActive: false, liberationPercentage: 100
      },
      {
        name: "Crystal World", index: 4, faction: "Super Earth", players: 0,
        health: 1000000, maxHealth: 1000000, position: { x: -30, y: -35, z: -40 },
        biome: { name: "Crystal", slug: "crystal" }, sector: "Lacaille",
        status: "peaceful", isActive: false, liberationPercentage: 100
      },
      
      // Planetas controlados por Automatons
      {
        name: "Malevelon Creek", index: 5, faction: "Automatons", players: 2500,
        health: 750000, maxHealth: 1000000, position: { x: 45, y: 10, z: -30 },
        biome: { name: "Jungle", slug: "jungle" }, sector: "Severin",
        status: "critical", isActive: true, liberationPercentage: 25, defense: true
      },
      {
        name: "Draupnir", index: 6, faction: "Automatons", players: 3200,
        health: 400000, maxHealth: 1000000, position: { x: 60, y: 20, z: 15 },
        biome: { name: "Desert", slug: "desert" }, sector: "Mirin",
        status: "contested", isActive: true, liberationPercentage: 60
      },
      {
        name: "Automaton Prime", index: 7, faction: "Automatons", players: 1500,
        health: 550000, maxHealth: 1000000, position: { x: 55, y: -5, z: -15 },
        biome: { name: "Wasteland", slug: "wasteland" }, sector: "Ursa",
        status: "active", isActive: true, liberationPercentage: 45
      },
      {
        name: "Robotic Fortress", index: 8, faction: "Automatons", players: 1800,
        health: 300000, maxHealth: 1000000, position: { x: 70, y: -25, z: 35 },
        biome: { name: "Mountain", slug: "mountain" }, sector: "Ursa",
        status: "critical", isActive: true, liberationPercentage: 70, defense: true
      },
      {
        name: "Steel Valley", index: 9, faction: "Automatons", players: 900,
        health: 650000, maxHealth: 1000000, position: { x: -60, y: 30, z: -25 },
        biome: { name: "Canyon", slug: "canyon" }, sector: "Severin",
        status: "active", isActive: true, liberationPercentage: 35
      },
      
      // Planetas controlados por Terminids
      {
        name: "Estanu", index: 10, faction: "Terminids", players: 1800,
        health: 600000, maxHealth: 1000000, position: { x: -35, y: -15, z: 40 },
        biome: { name: "Ice", slug: "ice" }, sector: "Mirin",
        status: "active", isActive: true, liberationPercentage: 40
      },
      {
        name: "Hellmire", index: 11, faction: "Terminids", players: 900,
        health: 800000, maxHealth: 1000000, position: { x: -50, y: -25, z: -20 },
        biome: { name: "Volcanic", slug: "volcanic" }, sector: "Mirin",
        status: "contested", isActive: true, liberationPercentage: 20
      },
      {
        name: "Meridia", index: 12, faction: "Terminids", players: 1200,
        health: 650000, maxHealth: 1000000, position: { x: 20, y: 30, z: -35 },
        biome: { name: "Ocean", slug: "ocean" }, sector: "Draco",
        status: "active", isActive: true, liberationPercentage: 35
      },
      {
        name: "Terminid Prime", index: 13, faction: "Terminids", players: 2100,
        health: 450000, maxHealth: 1000000, position: { x: 40, y: -20, z: 30 },
        biome: { name: "Forest", slug: "forest" }, sector: "Lacaille",
        status: "critical", isActive: true, liberationPercentage: 55, defense: true
      },
      {
        name: "Toxic Marsh", index: 14, faction: "Terminids", players: 800,
        health: 700000, maxHealth: 1000000, position: { x: 25, y: 40, z: -25 },
        biome: { name: "Toxic", slug: "toxic" }, sector: "Draco",
        status: "contested", isActive: true, liberationPercentage: 30
      },
      {
        name: "Hive World", index: 15, faction: "Terminids", players: 1500,
        health: 500000, maxHealth: 1000000, position: { x: -45, y: 25, z: 50 },
        biome: { name: "Swamp", slug: "swamp" }, sector: "Lacaille",
        status: "active", isActive: true, liberationPercentage: 45
      },
      
      // Planetas neutros/disputados
      {
        name: "Border World Alpha", index: 16, faction: "Super Earth", players: 500,
        health: 900000, maxHealth: 1000000, position: { x: 15, y: -35, z: -50 },
        biome: { name: "Tundra", slug: "tundra" }, sector: "Border",
        status: "contested", isActive: true, liberationPercentage: 85
      },
      {
        name: "Frontier Station", index: 17, faction: "Super Earth", players: 300,
        health: 950000, maxHealth: 1000000, position: { x: -20, y: 45, z: 15 },
        biome: { name: "Highland", slug: "highland" }, sector: "Frontier",
        status: "active", isActive: true, liberationPercentage: 95
      }
    ];
    
    // Log da distribuição
    const factionCount = {
      'Super Earth': emergencyPlanets.filter(p => p.faction === 'Super Earth').length,
      'Automatons': emergencyPlanets.filter(p => p.faction === 'Automatons').length,
      'Terminids': emergencyPlanets.filter(p => p.faction === 'Terminids').length
    };
    
    console.log('🚨 Planetas de emergência - Distribuição:', factionCount);
    
    return emergencyPlanets;
  };

  // Effect para carregar dados iniciais APENAS UMA VEZ
  useEffect(() => {
    console.log('🎯 Carregamento inicial dos planetas...');
    
    // Listener para atualizações de facção
    const handleFactionUpdate = (event) => {
      console.log('📡 Facções atualizadas via evento:', event.detail.factionCount);
      // Forçar re-render do componente
      setFactionUpdateTrigger(prev => prev + 1);
    };
    
    window.addEventListener('factionUpdate', handleFactionUpdate);
    
    fetchAllPlanets(false);
    
    return () => {
      window.removeEventListener('factionUpdate', handleFactionUpdate);
    };
  }, []); // Dependências vazias = executa apenas uma vez

  // Effect para atualizações baseadas no refreshKey (SEM recriar cena)
  useEffect(() => {
    if (refreshKey > 0 && allPlanets.length > 0 && isInitializedRef.current) {
      console.log(`🔄 Refresh key mudou: ${refreshKey} - Atualizando dados sem resetar cena...`);
      fetchAllPlanets(true);
    }
  }, [refreshKey]); // Apenas refreshKey como dependência

  // Effect para responder a mudanças nas campanhas (SEM recriar cena)
  useEffect(() => {
    if (campaigns.length > 0 && allPlanets.length > 0 && isInitializedRef.current) {
      console.log('📊 Campanhas mudaram - Atualizando planetas e facções...');
      console.log('📊 Campanhas disponíveis:', campaigns.map(c => ({ name: c.name, faction: c.faction, players: c.players })));
      
      const updatedPlanets = allPlanets.map(planet => {
        const campaignData = campaigns.find(c => 
          c.name === planet.name || c.planetIndex === planet.index
        ) || {};
        
        // Atualizar facção se a campanha fornece informação mais recente
        let updatedFaction = planet.faction;
        if (campaignData.faction && campaignData.faction !== planet.faction) {
          const mappedOriginal = mapFactionIdToName(planet.faction);
          const mappedNew = mapFactionIdToName(campaignData.faction);
          console.log(`🔄 Atualizando facção de ${planet.name}: ${planet.faction} (${mappedOriginal}) → ${campaignData.faction} (${mappedNew})`);
          updatedFaction = campaignData.faction;
        }
        
        return {
          ...planet,
          faction: updatedFaction,
          liberationPercentage: campaignData.liberationPercentage || campaignData.percentage || planet.liberationPercentage,
          defense: campaignData.defense || campaignData.type === 'Defense' || planet.defense,
          majorOrder: campaignData.majorOrder || planet.majorOrder,
          players: campaignData.players || planet.players,
          status: calculatePlanetStatus(planet, { players: campaignData.players || planet.players }, campaignData)
        };
      });
      
      // Log das mudanças
      const oldFactionCount = {
        'Super Earth': allPlanets.filter(p => mapFactionIdToName(p.faction) === 'Super Earth').length,
        'Automatons': allPlanets.filter(p => mapFactionIdToName(p.faction) === 'Automatons').length,
        'Terminids': allPlanets.filter(p => mapFactionIdToName(p.faction) === 'Terminids').length
      };
      
      const newFactionCount = {
        'Super Earth': updatedPlanets.filter(p => mapFactionIdToName(p.faction) === 'Super Earth').length,
        'Automatons': updatedPlanets.filter(p => mapFactionIdToName(p.faction) === 'Automatons').length,
        'Terminids': updatedPlanets.filter(p => mapFactionIdToName(p.faction) === 'Terminids').length
      };
      
      console.log('📊 Facções antes (mapeadas):', oldFactionCount);
      console.log('📊 Facções depois (mapeadas):', newFactionCount);
      
      setAllPlanets(updatedPlanets);
      updatePlanetMeshes(updatedPlanets);
    }
  }, [campaigns]); // Apenas campaigns como dependência

  // Effect para INICIALIZAR a cena 3D APENAS UMA VEZ
  useEffect(() => {
    if (!mountRef.current || allPlanets.length === 0 || isInitializedRef.current) return;

    console.log('🎮 Inicializando Galáxia 3D (UMA VEZ)...');

    try {
      // Scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;
      
      // Background estrelado
      const starGeometry = new THREE.BufferGeometry();
      const starCount = 2000;
      const starPositions = new Float32Array(starCount * 3);
      
      for (let i = 0; i < starCount * 3; i++) {
        starPositions[i] = (Math.random() - 0.5) * 2000;
      }
      
      starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      const starMaterial = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 2 });
      const stars = new THREE.Points(starGeometry, starMaterial);
      scene.add(stars);

      // Camera
      const camera = new THREE.PerspectiveCamera(
        75, 
        mountRef.current.clientWidth / mountRef.current.clientHeight, 
        0.1, 
        2000
      );
      cameraRef.current = camera;
      
      const updateCamera = () => {
        const controls = cameraControlsRef.current;
        camera.position.x = Math.cos(controls.phi) * Math.cos(controls.theta) * controls.distance;
        camera.position.y = Math.sin(controls.phi) * controls.distance;
        camera.position.z = Math.cos(controls.phi) * Math.sin(controls.theta) * controls.distance;
        camera.lookAt(0, 0, 0);
      };
      updateCamera();

      // Renderer
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
      });
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      renderer.setClearColor(0x000011, 1);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;
      mountRef.current.appendChild(renderer.domElement);

      // Iluminação
      const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(50, 50, 50);
      directionalLight.castShadow = true;
      scene.add(directionalLight);

      const pointLight = new THREE.PointLight(0x00BFFF, 0.5, 200);
      pointLight.position.set(0, 0, 0);
      scene.add(pointLight);

      // Grupo para planetas
      const planetsGroup = new THREE.Group();
      planetsGroupRef.current = planetsGroup;
      scene.add(planetsGroup);

      // Criar planetas
      const planetMeshes = [];

      allPlanets.forEach((planet, index) => {
        const radius = planet.name === "Super Earth" ? 4 : 
                      planet.isActive ? 2 : 1.5;

        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        
        // Cor baseada no BIOMA (não na facção)
        const biomeColor = getBiomeColor(planet.biome);
        const material = new THREE.MeshPhongMaterial({
          color: biomeColor,
          shininess: planet.biome?.slug === 'ocean' ? 100 : 30,
          transparent: true,
          opacity: 0.9
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(planet.position.x, planet.position.y, planet.position.z);
        mesh.userData = { planetData: planet };
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Atmosfera com cor da FACÇÃO
        if (radius > 2) {
          const atmosphereGeometry = new THREE.SphereGeometry(radius * 1.2, 32, 32);
          const mappedFaction = mapFactionIdToName(planet.faction);
          const factionColor = getFactionColor(mappedFaction);
          const atmosphereMaterial = new THREE.MeshBasicMaterial({
            color: factionColor,
            transparent: true,
            opacity: planet.isActive ? 0.15 : 0.05,
            side: THREE.BackSide
          });
          const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
          atmosphere.position.copy(mesh.position);
          planetsGroup.add(atmosphere);
          mesh.userData.atmosphere = atmosphere;
          
          console.log(`🌫️ Atmosfera criada para ${planet.name}: facção ${planet.faction} → ${mappedFaction}, cor 0x${factionColor.toString(16)}`);
        }

        // Anel de atividade com cor da FACÇÃO
        if (planet.isActive && planet.name !== "Super Earth") {
          const ringGeometry = new THREE.TorusGeometry(radius * 1.5, 0.2, 8, 100);
          const mappedFaction = mapFactionIdToName(planet.faction);
          const factionColor = getFactionColor(mappedFaction);
          const ringMaterial = new THREE.MeshBasicMaterial({
            color: factionColor,
            transparent: true,
            opacity: planet.status === 'critical' ? 0.9 : 0.6
          });
          const ring = new THREE.Mesh(ringGeometry, ringMaterial);
          ring.position.copy(mesh.position);
          ring.rotation.x = Math.PI / 2;
          planetsGroup.add(ring);
          mesh.userData.activityRing = ring;
          
          console.log(`💍 Anel criado para ${planet.name}: facção ${planet.faction} → ${mappedFaction}, cor 0x${factionColor.toString(16)}`);
        }

        // Anel de aviso para planetas críticos
        if (planet.status === 'critical') {
          const warningGeometry = new THREE.TorusGeometry(radius * 2, 0.1, 8, 100);
          const warningMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF0000,
            transparent: true,
            opacity: 0.8
          });
          const warningRing = new THREE.Mesh(warningGeometry, warningMaterial);
          warningRing.position.copy(mesh.position);
          warningRing.rotation.x = Math.PI / 2;
          planetsGroup.add(warningRing);
          mesh.userData.warningRing = warningRing;
        }

        // Linhas conectoras com cor da FACÇÃO
        if (planet.name !== "Super Earth" && planet.isActive) {
          const points = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(planet.position.x, planet.position.y, planet.position.z)
          ];
          const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
          const mappedFaction = mapFactionIdToName(planet.faction);
          const factionColor = getFactionColor(mappedFaction);
          const lineMaterial = new THREE.LineBasicMaterial({
            color: factionColor,
            transparent: true,
            opacity: 0.3
          });
          const line = new THREE.Line(lineGeometry, lineMaterial);
          planetsGroup.add(line);
        }

        planetsGroup.add(mesh);
        planetMeshes.push(mesh);
      });

      planetMeshesRef.current = planetMeshes;

      // Event handlers
      const onMouseDown = (e) => {
        const controls = cameraControlsRef.current;
        controls.mouseDown = true;
        controls.lastMouse = { x: e.clientX, y: e.clientY };
        controls.autoRotate = false;
        setAutoRotateUI(false);
        renderer.domElement.style.cursor = 'grabbing';
      };

      const onMouseMove = (e) => {
        const controls = cameraControlsRef.current;
        if (!controls.mouseDown) return;
        const dx = e.clientX - controls.lastMouse.x;
        const dy = e.clientY - controls.lastMouse.y;
        controls.theta -= dx * 0.01;
        controls.phi = Math.max(0.1, Math.min(Math.PI - 0.1, controls.phi - dy * 0.01));
        controls.lastMouse = { x: e.clientX, y: e.clientY };
      };

      const onMouseUp = () => {
        const controls = cameraControlsRef.current;
        controls.mouseDown = false;
        renderer.domElement.style.cursor = 'grab';
      };

      const onWheel = (e) => {
        e.preventDefault();
        const controls = cameraControlsRef.current;
        controls.distance = Math.max(50, Math.min(500, controls.distance + e.deltaY * 0.2));
      };

      const onClick = (e) => {
        const controls = cameraControlsRef.current;
        if (controls.mouseDown) return;
        
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(planetMeshes);

        if (intersects.length > 0) {
          setSelectedPlanet(intersects[0].object.userData.planetData);
        } else {
          setSelectedPlanet(null);
        }
      };

      // Event listeners
      renderer.domElement.addEventListener('mousedown', onMouseDown);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      renderer.domElement.addEventListener('wheel', onWheel);
      renderer.domElement.addEventListener('click', onClick);
      renderer.domElement.style.cursor = 'grab';

      // Animation loop
      const animate = () => {
        const controls = cameraControlsRef.current;
        
        if (controls.autoRotate) {
          controls.theta += 0.005;
        }

        planetMeshes.forEach((mesh, index) => {
          mesh.rotation.y += 0.01 * (1 + index * 0.001);
          
          if (mesh.userData.activityRing) {
            mesh.userData.activityRing.rotation.z += 0.02;
            mesh.userData.activityRing.material.opacity = 0.4 + Math.sin(Date.now() * 0.003) * 0.2;
          }
        });

        stars.rotation.y += 0.0002;
        updateCamera();
        renderer.render(scene, camera);
        
        animationIdRef.current = requestAnimationFrame(animate);
      };

      animate();

      // Global functions
      window.galaxyResetCamera = () => {
        const controls = cameraControlsRef.current;
        controls.theta = 0;
        controls.phi = Math.PI / 4;
        controls.distance = 150;
        controls.autoRotate = false;
        setAutoRotateUI(false);
        setSelectedPlanet(null);
      };

      window.galaxyToggleAutoRotate = () => {
        const controls = cameraControlsRef.current;
        controls.autoRotate = !controls.autoRotate;
        setAutoRotateUI(controls.autoRotate);
      };

      // Marcar como inicializado
      isInitializedRef.current = true;
      setIsLoading(false);

      // Cleanup
      return () => {
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
        }
        
        renderer.domElement.removeEventListener('mousedown', onMouseDown);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        renderer.domElement.removeEventListener('wheel', onWheel);
        renderer.domElement.removeEventListener('click', onClick);
        
        if (mountRef.current && renderer.domElement && mountRef.current.contains(renderer.domElement)) {
          mountRef.current.removeChild(renderer.domElement);
        }
        
        renderer.dispose();
        delete window.galaxyResetCamera;
        delete window.galaxyToggleAutoRotate;
        
        isInitializedRef.current = false;
      };

    } catch (err) {
      console.error('❌ Erro ao inicializar 3D:', err);
      setError(`Erro ao carregar mapa 3D: ${err.message}`);
      setIsLoading(false);
    }
  }, [allPlanets.length]); // Apenas quando planetas são carregados pela primeira vez

  const getFactionColor = (faction) => {
    switch(faction) {
      case 'Super Earth': return 0x00BFFF;
      case 'Terminids': return 0xFFA500;
      case 'Automatons': return 0xFF4444;
      default: return 0x4A90E2;
    }
  };

  const getBiomeColor = (biome) => {
    const slug = biome?.slug?.toLowerCase() || 'unknown';
    
    switch(slug) {
      case 'desert': return 0xDEB887;         // Sandy brown
      case 'jungle': return 0x228B22;        // Forest green  
      case 'ice': return 0x87CEEB;           // Sky blue
      case 'volcanic': return 0xFF4500;      // Orange red
      case 'moon': return 0xC0C0C0;          // Silver
      case 'swamp': return 0x556B2F;         // Dark olive green
      case 'mountain': return 0x8B7355;      // Dark khaki
      case 'ocean': return 0x006994;         // Deep blue
      case 'homeworld': return 0x00BFFF;     // Deep sky blue (Super Earth)
      case 'forest': return 0x32CD32;        // Lime green
      case 'plains': return 0x9ACD32;        // Yellow green
      case 'tundra': return 0x4682B4;        // Steel blue
      case 'canyon': return 0xCD853F;        // Peru
      case 'mesa': return 0xA0522D;          // Sienna (estava aparecendo nos logs)
      case 'archipelago': return 0x20B2AA;   // Light sea green
      case 'highland': 
      case 'highlands': return 0x708090;     // Slate gray (estava aparecendo nos logs)
      case 'lowland': return 0x8FBC8F;       // Dark sea green
      case 'wasteland': return 0x696969;     // Dim gray
      case 'crystal': return 0xFF69B4;       // Hot pink
      case 'toxic': return 0x9AFF9A;         // Pale green
      case 'marsh': return 0x556B2F;         // Dark olive green
      case 'hills': return 0x8B7D6B;         // Dark tan
      case 'valleys': return 0x6B8E23;       // Olive drab
      case 'badlands': return 0x8B4513;      // Saddle brown
      case 'steppes': return 0xBDB76B;       // Dark khaki
      case 'savanna': return 0xF4A460;       // Sandy brown
      case 'rainforest': return 0x006400;    // Dark green
      case 'taiga': return 0x2F4F4F;         // Dark slate gray
      case 'moors': return 0x483D8B;         // Dark slate blue
      case 'fjords': return 0x4169E1;        // Royal blue
      case 'unknown': 
      default: return 0x808080;              // Gray (unknown)
    }
  };

  // Funções de controle
  const resetCamera = () => {
    if (window.galaxyResetCamera) window.galaxyResetCamera();
  };

  const toggleAutoRotate = () => {
    if (window.galaxyToggleAutoRotate) window.galaxyToggleAutoRotate();
  };

  const togglePlanetNames = () => {
    setShowPlanetNames(!showPlanetNames);
  };

  // Funções de UI
  const getStatusColor = (status) => {
    switch(status) {
      case 'safe': return 'text-blue-400';
      case 'peaceful': return 'text-green-400';
      case 'active': return 'text-yellow-400';
      case 'contested': return 'text-orange-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'safe': return <Shield className="w-4 h-4" />;
      case 'peaceful': return <Globe2 className="w-4 h-4" />;
      case 'active': return <Target className="w-4 h-4" />;
      case 'contested': return <Activity className="w-4 h-4" />;
      case 'critical': return <Zap className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  return (
    <div className={`relative ${embedded ? 'w-full h-full' : 'w-full h-screen'} bg-black overflow-hidden`}>
      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400 mx-auto mb-2"></div>
            <p className="text-cyan-400 text-sm font-bold">Loading Complete Galaxy...</p>
            <p className="text-slate-400 text-xs">Initializing 3D scene...</p>
          </div>
        </div>
      )}

      {/* Indicador de Atualização */}
      {isUpdating && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-cyan-900/90 border border-cyan-500/50 rounded-lg p-2 flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
            <span className="text-cyan-400 text-sm font-bold">Updating Data...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute top-4 right-4 z-30 bg-yellow-900/80 border border-yellow-500/50 rounded-lg p-3 max-w-sm">
          <p className="text-yellow-400 text-sm">⚠️ {error}</p>
        </div>
      )}

      {/* 3D Map */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Back Button */}
      {!embedded && onBack && (
        <button onClick={onBack} className="absolute top-4 left-4 z-20 flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white">
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      )}

      {/* Enhanced Controls */}
      {showControls && !isLoading && (
        <>
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-black/90 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-4 text-white">
              <h2 className="text-lg font-bold text-cyan-400 mb-3 flex items-center space-x-2">
                <span>Galaxy Overview</span>
                {isUpdating && <RefreshCw className="w-4 h-4 animate-spin" />}
              </h2>
              <div className="space-y-2 text-sm">
                <div className="text-cyan-400 font-semibold mb-2">Faction Control:</div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Super Earth ({allPlanets.filter(p => mapFactionIdToName(p.faction) === 'Super Earth').length})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span>Terminids ({allPlanets.filter(p => mapFactionIdToName(p.faction) === 'Terminids').length})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Automatons ({allPlanets.filter(p => mapFactionIdToName(p.faction) === 'Automatons').length})</span>
                </div>
                
                
                
                <div className="border-t border-gray-600 pt-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-3 h-3 text-green-400" />
                    <span>Active: {allPlanets.filter(p => p.isActive).length}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Globe2 className="w-3 h-3 text-blue-400" />
                    <span>Total: {allPlanets.length}</span>
                  </div>
                  {factionUpdateTrigger > 0 && (
                    <div className="text-xs text-green-400 mt-1">
                      Updates: #{factionUpdateTrigger}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-600 pt-2 mt-2">
              <div className='grid grid-cols-4 gap-4 overflow-y-auto'>
              
                <button onClick={resetCamera} className="flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm w-full justify-center">
                  <RotateCcw className="w-4 h-4" />
                  
                </button>
                
                <button onClick={toggleAutoRotate} className={`flex items-center space-x-2 px-3 py-2 rounded text-sm w-full justify-center ${autoRotateUI ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                  <Target className="w-4 h-4" />
                  
                </button>

                <button onClick={togglePlanetNames} className={`flex items-center space-x-2 px-3 py-2 rounded text-sm w-full justify-center ${showPlanetNames ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  <Eye className="w-4 h-4" />
                  
                </button>

                <button 
                  onClick={() => fetchAllPlanets(true)} 
                  disabled={isUpdating}
                  className={`flex items-center space-x-2 px-3 py-2 rounded text-sm w-full justify-center ${
                    isUpdating ? 'bg-gray-600 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-700'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
                  
                </button>
                
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 z-10">
            <div className="bg-black/90 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-4 text-white">
              <h4 className="text-sm font-bold text-cyan-400 mb-2">War Statistics</h4>
              <div className="text-sm space-y-1">
                <p>🔥 Active Fronts: <span className="text-green-400">{allPlanets.filter(p => p.isActive).length}</span></p>
                <p>👥 Total Helldivers: <span className="text-cyan-400">{allPlanets.reduce((sum, p) => sum + p.players, 0).toLocaleString()}</span></p>
                <p>🌍 Under Attack: <span className="text-red-400">{allPlanets.filter(p => p.status === 'critical').length}</span></p>
                <p>⚔️ Contested: <span className="text-yellow-400">{allPlanets.filter(p => p.status === 'contested').length}</span></p>
                <p>✅ Peaceful: <span className="text-green-400">{allPlanets.filter(p => p.status === 'peaceful').length}</span></p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 right-4 z-10">
            <div className="bg-black/90 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-4 text-white">
              <h4 className="text-sm font-bold text-cyan-400 mb-2">Navigation</h4>
              <div className="text-xs space-y-1 text-slate-400">
                <p>🖱️ <strong>Drag:</strong> Rotate galaxy</p>
                <p>🖱️ <strong>Scroll:</strong> Zoom in/out</p>
                <p>🎯 <strong>Click:</strong> Select planet</p>
                <p>🔗 <strong>Lines:</strong> Active routes</p>
                <p>💍 <strong>Rings:</strong> Active battles</p>
                <div className="border-t border-gray-600 pt-1 mt-1">
                  <p className="text-cyan-400"><strong>Color System:</strong></p>
                  <p>🌍 Planet = Biome type</p>
                  <p>💍 Rings = Faction control</p>
                  <p>🔴 Red ring = Critical status</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Enhanced Planet Info Panel */}
      {selectedPlanet && (
        <div className="absolute top-4 right-4 z-10 w-80">
          <div className="bg-black/95 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-cyan-400">{selectedPlanet.name}</h3>
              <button onClick={() => setSelectedPlanet(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Faction:</span>
                <span className="font-semibold" style={{ color: `#${getFactionColor(selectedPlanet.faction).toString(16).padStart(6, '0')}` }}>
                  {selectedPlanet.faction}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Status:</span>
                <div className={`flex items-center space-x-1 ${getStatusColor(selectedPlanet.status)}`}>
                  {getStatusIcon(selectedPlanet.status)}
                  <span className="font-semibold capitalize">{selectedPlanet.status}</span>
                </div>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Sector:</span>
                <span className="text-slate-300 text-xs">{selectedPlanet.sector}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Helldivers:</span>
                <div className="flex items-center space-x-1 text-green-400">
                  <Users className="w-3 h-3" />
                  <span className="font-semibold">{selectedPlanet.players.toLocaleString()}</span>
                </div>
              </div>

              {selectedPlanet.health && selectedPlanet.maxHealth && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Planet Health:</span>
                    <span className="text-cyan-400">{((selectedPlanet.health / selectedPlanet.maxHealth) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-red-500 to-green-500 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${(selectedPlanet.health / selectedPlanet.maxHealth) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {selectedPlanet.liberationPercentage > 0 && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Liberation:</span>
                    <span className="text-green-400">{selectedPlanet.liberationPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-cyan-500 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${selectedPlanet.liberationPercentage}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-slate-400">Biome:</span>
                <span className="text-slate-300 text-xs capitalize">{selectedPlanet.biome?.name || 'Unknown'}</span>
              </div>

              {selectedPlanet.isActive && (
                <div className="mt-3 p-2 bg-green-900/30 border border-green-500/30 rounded">
                  <p className="text-green-400 text-xs text-center">🔥 ACTIVE BATTLEFIELD</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalaxyMap3D;