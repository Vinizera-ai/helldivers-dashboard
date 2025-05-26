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
  refreshKey = 0 // Nova prop para forçar atualizações
}) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const planetMeshesRef = useRef([]);
  const planetsGroupRef = useRef(null);
  
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRotateUI, setAutoRotateUI] = useState(false);
  const [allPlanets, setAllPlanets] = useState([]);
  const [showPlanetNames, setShowPlanetNames] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Função para buscar planetas otimizada
  const fetchAllPlanets = useCallback(async (isUpdate = false) => {
    console.log(`📡 ${isUpdate ? 'Atualizando' : 'Carregando'} planetas...`);
    
    if (!isUpdate) {
      setIsLoading(true);
    } else {
      setIsUpdating(true);
    }
    
    try {
      // 1. TESTAR BACKEND
      console.log('🔗 Testando backend...');
      await axios.get('http://localhost:5000/', { timeout: 3000 });
      console.log('✅ Backend respondendo!');
      
      // 2. BUSCAR PLANETAS
      console.log('📡 Buscando planetas...');
      const planetsResponse = await axios.get('http://localhost:5000/api/planets', { 
        timeout: 20000
      });
      
      console.log('📊 Resposta recebida:', planetsResponse.data);
      
      // 3. EXTRAIR DADOS
      let planetsData = [];
      
      if (planetsResponse.data) {
        if (planetsResponse.data.planets && Array.isArray(planetsResponse.data.planets)) {
          planetsData = planetsResponse.data.planets;
          console.log(`✅ ${planetsData.length} planetas extraídos do campo .planets`);
        } else if (Array.isArray(planetsResponse.data)) {
          planetsData = planetsResponse.data;
          console.log(`✅ ${planetsData.length} planetas (array direto)`);
        } else {
          throw new Error('Formato de resposta não reconhecido');
        }
      } else {
        throw new Error('Resposta vazia do backend');
      }
      
      // 4. VERIFICAR DADOS
      if (!planetsData || planetsData.length === 0) {
        throw new Error('Array de planetas vazio');
      }
      
      console.log(`🎉 ${planetsData.length} planetas válidos!`);
      
      // 5. USAR DADOS DE GUERRA JÁ DISPONÍVEIS
      let planetStatusData = [];
      if (warStatus && warStatus.planetStatus) {
        planetStatusData = warStatus.planetStatus;
        console.log(`📊 Usando dados de guerra: ${planetStatusData.length} planetas`);
      }
      
      // 6. PROCESSAR PLANETAS
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
      
      // 7. GARANTIR SUPER EARTH
      const superEarth = enrichedPlanets.find(p => p.name === "Super Earth");
      if (superEarth) {
        superEarth.position = { x: 0, y: 0, z: 0 };
        superEarth.faction = "Super Earth";
        superEarth.status = "safe";
        superEarth.isActive = true;
      }
      
      console.log(`🎉 SUCESSO! ${enrichedPlanets.length} planetas ${isUpdate ? 'atualizados' : 'carregados'}`);
      
      // 8. DEFINIR ESTADO
      setAllPlanets(enrichedPlanets);
      setError(null);
      
      // 9. ATUALIZAR MAPA 3D SE JÁ EXISTE
      if (isUpdate && sceneRef.current && planetMeshesRef.current.length > 0) {
        updatePlanetMeshes(enrichedPlanets);
      }
      
    } catch (err) {
      console.error('❌ ERRO:', err.message);
      
      if (!isUpdate) {
        console.log('🚨 Carregando planetas de emergência...');
        const emergencyPlanets = generateEmergencyPlanets();
        setAllPlanets(emergencyPlanets);
      }
      
      if (err.message.includes('timeout')) {
        setError('API timeout - Usando planetas de emergência');
      } else if (err.message.includes('Network Error')) {
        setError('Backend offline - Inicie: npm run dev na pasta backend');
      } else {
        setError('Erro na API - Usando planetas de emergência');
      }
    } finally {
      setIsLoading(false);
      setIsUpdating(false);
    }
  }, [campaigns, warStatus]);

  // Função para atualizar meshes dos planetas sem recriar tudo
  const updatePlanetMeshes = useCallback((updatedPlanets) => {
    if (!planetMeshesRef.current || planetMeshesRef.current.length === 0) return;
    
    console.log('🔄 Atualizando meshes dos planetas...');
    
    planetMeshesRef.current.forEach((mesh, index) => {
      const planetData = updatedPlanets[index];
      if (!planetData) return;
      
      // Atualizar dados do planeta
      mesh.userData = { planetData };
      
      // Atualizar cor baseada na facção
      const newColor = getFactionColor(planetData.faction);
      mesh.material.color.setHex(newColor);
      
      // Atualizar anel de atividade
      if (mesh.userData.activityRing) {
        mesh.userData.activityRing.material.color.setHex(newColor);
        mesh.userData.activityRing.visible = planetData.isActive;
      }
      
      // Atualizar atmosfera
      if (mesh.userData.atmosphere) {
        mesh.userData.atmosphere.material.color.setHex(newColor);
        mesh.userData.atmosphere.material.opacity = planetData.isActive ? 0.15 : 0.05;
      }
    });
    
    console.log('✅ Meshes atualizados!');
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

  // Função para gerar planetas de emergência
  const generateEmergencyPlanets = () => {
    return [
      {
        name: "Super Earth", index: 0, faction: "Super Earth", players: 50000,
        health: 1000000, maxHealth: 1000000, position: { x: 0, y: 0, z: 0 },
        biome: { name: "Homeworld", slug: "homeworld" }, sector: "Sol System",
        status: "safe", isActive: true, liberationPercentage: 100
      },
      {
        name: "Malevelon Creek", index: 1, faction: "Automatons", players: 2500,
        health: 750000, maxHealth: 1000000, position: { x: 45, y: 10, z: -30 },
        biome: { name: "Jungle", slug: "jungle" }, sector: "Severin",
        status: "critical", isActive: true, liberationPercentage: 25, defense: true
      },
      {
        name: "Estanu", index: 2, faction: "Terminids", players: 1800,
        health: 600000, maxHealth: 1000000, position: { x: -35, y: -15, z: 40 },
        biome: { name: "Ice", slug: "ice" }, sector: "Mirin",
        status: "active", isActive: true, liberationPercentage: 40
      },
      // ... mais planetas de emergência
    ];
  };

  // Effect para carregar dados iniciais
  useEffect(() => {
    fetchAllPlanets(false);
  }, []);

  // Effect para atualizações baseadas no refreshKey
  useEffect(() => {
    if (refreshKey > 0 && allPlanets.length > 0) {
      console.log(`🔄 Refresh key mudou: ${refreshKey} - Atualizando dados...`);
      fetchAllPlanets(true);
    }
  }, [refreshKey, fetchAllPlanets]);

  // Effect para responder a mudanças nas campanhas
  useEffect(() => {
    if (campaigns.length > 0 && allPlanets.length > 0) {
      console.log('📊 Campanhas mudaram - Atualizando planetas...');
      // Reprocessar planetas com novos dados de campanha
      const updatedPlanets = allPlanets.map(planet => {
        const campaignData = campaigns.find(c => 
          c.name === planet.name || c.planetIndex === planet.index
        ) || {};
        
        return {
          ...planet,
          liberationPercentage: campaignData.liberationPercentage || campaignData.percentage || planet.liberationPercentage,
          defense: campaignData.defense || campaignData.type === 'Defense' || planet.defense,
          majorOrder: campaignData.majorOrder || planet.majorOrder,
          players: campaignData.players || planet.players,
          status: calculatePlanetStatus(planet, { players: planet.players }, campaignData)
        };
      });
      
      setAllPlanets(updatedPlanets);
      updatePlanetMeshes(updatedPlanets);
    }
  }, [campaigns, allPlanets, updatePlanetMeshes]);

  const getFactionColor = (faction) => {
    switch(faction) {
      case 'Super Earth': return 0x00BFFF;
      case 'Terminids': return 0xFFA500;
      case 'Automatons': return 0xFF4444;
      default: return 0x4A90E2;
    }
  };

  const getBiomeColor = (biome) => {
    switch(biome?.slug) {
      case 'desert': return 0xDEB887;
      case 'jungle': return 0x228B22;
      case 'ice': return 0x87CEEB;
      case 'volcanic': return 0xFF4500;
      case 'moon': return 0xC0C0C0;
      case 'swamp': return 0x556B2F;
      case 'mountain': return 0x8B7355;
      case 'ocean': return 0x006994;
      case 'homeworld': return 0x00BFFF;
      default: return 0x808080;
    }
  };

  // Effect principal para inicializar e gerenciar a cena 3D
  useEffect(() => {
    if (!mountRef.current || allPlanets.length === 0) return;

    console.log('🎮 Inicializando/Atualizando Galáxia 3D...');

    try {
      // Se já existe uma cena, limpar primeiro
      if (rendererRef.current && mountRef.current.contains(rendererRef.current.domElement)) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }

      // Controles
      let mouseDown = false;
      let lastMouse = { x: 0, y: 0 };
      let theta = 0;
      let phi = Math.PI / 4;
      let distance = 150;
      let autoRotate = false;

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
      
      const updateCamera = () => {
        camera.position.x = Math.cos(phi) * Math.cos(theta) * distance;
        camera.position.y = Math.sin(phi) * distance;
        camera.position.z = Math.cos(phi) * Math.sin(theta) * distance;
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
      const textSprites = [];

      allPlanets.forEach((planet, index) => {
        const radius = planet.name === "Super Earth" ? 4 : 
                      planet.isActive ? 2 : 1.5;

        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const material = new THREE.MeshPhongMaterial({
          color: getBiomeColor(planet.biome),
          shininess: planet.biome?.slug === 'ocean' ? 100 : 30,
          transparent: true,
          opacity: 0.9
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(planet.position.x, planet.position.y, planet.position.z);
        mesh.userData = { planetData: planet };
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Atmosfera
        if (radius > 2) {
          const atmosphereGeometry = new THREE.SphereGeometry(radius * 1.2, 32, 32);
          const atmosphereMaterial = new THREE.MeshBasicMaterial({
            color: getFactionColor(planet.faction),
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
          });
          const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
          atmosphere.position.copy(mesh.position);
          planetsGroup.add(atmosphere);
          mesh.userData.atmosphere = atmosphere;
        }

        // Anel de atividade
        if (planet.isActive && planet.name !== "Super Earth") {
          const ringGeometry = new THREE.TorusGeometry(radius * 1.5, 0.2, 8, 100);
          const ringMaterial = new THREE.MeshBasicMaterial({
            color: getFactionColor(planet.faction),
            transparent: true,
            opacity: 0.6
          });
          const ring = new THREE.Mesh(ringGeometry, ringMaterial);
          ring.position.copy(mesh.position);
          ring.rotation.x = Math.PI / 2;
          planetsGroup.add(ring);
          mesh.userData.activityRing = ring;
        }

        // Linhas conectoras
        if (planet.name !== "Super Earth" && planet.isActive) {
          const points = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(planet.position.x, planet.position.y, planet.position.z)
          ];
          const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
          const lineMaterial = new THREE.LineBasicMaterial({
            color: getFactionColor(planet.faction),
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
        mouseDown = true;
        lastMouse = { x: e.clientX, y: e.clientY };
        autoRotate = false;
        setAutoRotateUI(false);
        renderer.domElement.style.cursor = 'grabbing';
      };

      const onMouseMove = (e) => {
        if (!mouseDown) return;
        const dx = e.clientX - lastMouse.x;
        const dy = e.clientY - lastMouse.y;
        theta -= dx * 0.01;
        phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi - dy * 0.01));
        lastMouse = { x: e.clientX, y: e.clientY };
      };

      const onMouseUp = () => {
        mouseDown = false;
        renderer.domElement.style.cursor = 'grab';
      };

      const onWheel = (e) => {
        e.preventDefault();
        distance = Math.max(50, Math.min(500, distance + e.deltaY * 0.2));
      };

      const onClick = (e) => {
        if (mouseDown) return;
        
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
        requestAnimationFrame(animate);

        if (autoRotate) {
          theta += 0.005;
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
      };

      animate();

      // Global functions
      window.galaxyResetCamera = () => {
        theta = 0;
        phi = Math.PI / 4;
        distance = 150;
        autoRotate = false;
        setAutoRotateUI(false);
        setSelectedPlanet(null);
      };

      window.galaxyToggleAutoRotate = () => {
        autoRotate = !autoRotate;
        setAutoRotateUI(autoRotate);
      };

      // Cleanup
      return () => {
        renderer.domElement.removeEventListener('mousedown', onMouseDown);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        renderer.domElement.removeEventListener('wheel', onWheel);
        renderer.domElement.removeEventListener('click', onClick);
        
        if (mountRef.current && renderer.domElement) {
          try {
            mountRef.current.removeChild(renderer.domElement);
          } catch (e) {
            console.log('Renderer já removido');
          }
        }
        
        renderer.dispose();
        delete window.galaxyResetCamera;
        delete window.galaxyToggleAutoRotate;
      };

    } catch (err) {
      console.error('❌ Erro ao inicializar 3D:', err);
      setError(`Erro ao carregar mapa 3D: ${err.message}`);
    }
  }, [allPlanets, showPlanetNames]);

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
            <p className="text-slate-400 text-xs">Scanning {allPlanets.length} worlds...</p>
          </div>
        </div>
      )}

      {/* Indicador de Atualização */}
      {isUpdating && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-cyan-900/90 border border-cyan-500/50 rounded-lg p-2 flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
            <span className="text-cyan-400 text-sm font-bold">Updating Galaxy Data...</span>
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
      {showControls && (
        <>
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-black/90 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-4 text-white">
              <h2 className="text-lg font-bold text-cyan-400 mb-3 flex items-center space-x-2">
                <span>Galaxy Overview</span>
                {isUpdating && <RefreshCw className="w-4 h-4 animate-spin" />}
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Super Earth ({allPlanets.filter(p => p.faction === 'Super Earth').length})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span>Terminids ({allPlanets.filter(p => p.faction === 'Terminids').length})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Automatons ({allPlanets.filter(p => p.faction === 'Automatons').length})</span>
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
                </div>
              </div>
              
              <div className="space-y-2 mt-4">
                <button onClick={resetCamera} className="flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm w-full justify-center">
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset View</span>
                </button>
                
                <button onClick={toggleAutoRotate} className={`flex items-center space-x-2 px-3 py-2 rounded text-sm w-full justify-center ${autoRotateUI ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                  <Target className="w-4 h-4" />
                  <span>{autoRotateUI ? 'Stop Rotate' : 'Auto Rotate'}</span>
                </button>

                <button onClick={togglePlanetNames} className={`flex items-center space-x-2 px-3 py-2 rounded text-sm w-full justify-center ${showPlanetNames ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  <Eye className="w-4 h-4" />
                  <span>{showPlanetNames ? 'Hide Names' : 'Show Names'}</span>
                </button>

                {/* Botão para forçar refresh */}
                <button 
                  onClick={() => fetchAllPlanets(true)} 
                  disabled={isUpdating}
                  className={`flex items-center space-x-2 px-3 py-2 rounded text-sm w-full justify-center ${
                    isUpdating ? 'bg-gray-600 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-700'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
                  <span>{isUpdating ? 'Updating...' : 'Refresh Data'}</span>
                </button>
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
                <p>💫 <strong>Stars:</strong> Background rotation</p>
                <p>🔗 <strong>Lines:</strong> Active routes</p>
                <p>💍 <strong>Rings:</strong> Active battles</p>
                <p className="text-cyan-400">🔄 <strong>Auto-refresh:</strong> 30s intervals</p>
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