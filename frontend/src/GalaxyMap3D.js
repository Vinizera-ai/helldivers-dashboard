import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Users, Target, Shield, Zap, Eye, RotateCcw, ArrowLeft } from 'lucide-react';

const GalaxyMap3D = ({ onBack, campaigns = [], embedded = false, fullscreen = false, onMaximize, showControls = false }) => {
  const mountRef = useRef(null);
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRotateUI, setAutoRotateUI] = useState(false);

  // Converter campanhas em planetas
  const [planets, setPlanets] = useState([]);

  useEffect(() => {
    console.log('📡 Processando campanhas:', campaigns.length);
    setIsLoading(true);
    
    try {
      const realPlanets = [
        {
          name: "Super Earth",
          faction: "Super Earth",
          players: 116142,
          health: 1000000,
          maxHealth: 1000000,
          position: { x: 0, y: 0, z: 0 },
          biome: "homeworld",
          status: "safe"
        }
      ];

      if (campaigns.length > 0) {
        campaigns.forEach((campaign, index) => {
          const angle = (index / campaigns.length) * Math.PI * 2;
          const radius = 30 + Math.random() * 40;
          const height = (Math.random() - 0.5) * 30;
          
          realPlanets.push({
            name: campaign.name,
            faction: campaign.faction,
            players: campaign.players || 0,
            health: campaign.health || campaign.maxHealth,
            maxHealth: campaign.maxHealth || 1000000,
            position: {
              x: Math.cos(angle) * radius,
              y: height,
              z: Math.sin(angle) * radius
            },
            biome: campaign.biome?.slug || 'desert',
            status: campaign.defense ? 'critical' : campaign.players > 1000 ? 'active' : 'contested',
            liberationPercentage: campaign.liberationPercentage || campaign.percentage || 0,
            description: campaign.biome?.description || 'Unknown terrain'
          });
        });
      } else {
        // Dados demo
        const demoPlanets = [
          { name: "Estanu", faction: "Terminids", players: 675, health: 823000, maxHealth: 1000000, position: { x: 25, y: 8, z: -15 }, biome: "icemoss", status: "active" },
          { name: "Gaellivare", faction: "Automatons", players: 2520, health: 456000, maxHealth: 1000000, position: { x: -30, y: -5, z: 20 }, biome: "jungle", status: "active" },
          { name: "Terrek", faction: "Terminids", players: 7360, health: 234000, maxHealth: 1000000, position: { x: 35, y: 12, z: 25 }, biome: "moon", status: "critical" }
        ];
        realPlanets.push(...demoPlanets);
      }
      
      console.log('✅ Planetas criados:', realPlanets.length);
      setPlanets(realPlanets);
      setError(null);
    } catch (err) {
      console.error('❌ Erro ao processar planetas:', err);
      setError('Erro ao carregar dados dos planetas');
    } finally {
      setIsLoading(false);
    }
  }, [campaigns]);

  const getFactionColor = (faction) => {
    switch(faction) {
      case 'Super Earth': return 0x00BFFF;
      case 'Terminids': return 0xFFA500;
      case 'Automatons': return 0xFF4444;
      default: return 0x888888;
    }
  };

  useEffect(() => {
    if (!mountRef.current || planets.length === 0) return;

    console.log('🎮 Iniciando renderização 3D ULTRA SIMPLES...');

    try {
      // Controles locais
      let mouseDown = false;
      let lastMouse = { x: 0, y: 0 };
      let theta = 0;
      let phi = Math.PI / 4;
      let distance = 120;
      let autoRotate = false;

      // Scene básica
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000011);

      // Camera
      const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
      
      const updateCamera = () => {
        camera.position.x = Math.cos(phi) * Math.cos(theta) * distance;
        camera.position.y = Math.sin(phi) * distance;
        camera.position.z = Math.cos(phi) * Math.sin(theta) * distance;
        camera.lookAt(0, 0, 0);
      };
      updateCamera();

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: false }); // antialias off para performance
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      mountRef.current.appendChild(renderer.domElement);

      // Luz simples
      const light = new THREE.AmbientLight(0x404040, 1);
      scene.add(light);

      // Planetas MUITO simples
      const planetMeshes = [];
      planets.forEach((planet) => {
        const radius = planet.name === "Super Earth" ? 3 : 1.5;
        const geometry = new THREE.SphereGeometry(radius, 8, 8); // MUITO simples
        const material = new THREE.MeshBasicMaterial({ color: getFactionColor(planet.faction) });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(planet.position.x, planet.position.y, planet.position.z);
        mesh.userData = { planetData: planet };
        
        // Indicador de atividade
        if (planet.players > 0 && planet.name !== "Super Earth") {
          const indicator = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0x00FFFF })
          );
          indicator.position.set(planet.position.x + radius * 2, planet.position.y, planet.position.z);
          scene.add(indicator);
        }
        
        scene.add(mesh);
        planetMeshes.push(mesh);
      });

      // Controles de mouse
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
        distance = Math.max(50, Math.min(300, distance + e.deltaY * 0.1));
      };

      const onClick = (e) => {
        if (mouseDown) return; // Não processar click durante drag
        
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(planetMeshes);

        if (intersects.length > 0) {
          setSelectedPlanet(intersects[0].object.userData.planetData);
        }
      };

      // Event listeners
      renderer.domElement.addEventListener('mousedown', onMouseDown);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      renderer.domElement.addEventListener('wheel', onWheel);
      renderer.domElement.addEventListener('click', onClick);
      renderer.domElement.style.cursor = 'grab';

      // Animation loop OTIMIZADO
      const animate = () => {
        requestAnimationFrame(animate);

        // Auto-rotate
        if (autoRotate) {
          theta += 0.005;
        }

        // Update camera
        updateCamera();

        // Minimal planet rotation
        planetMeshes.forEach(mesh => {
          mesh.rotation.y += 0.01;
        });

        renderer.render(scene, camera);
      };

      animate();

      // Funções globais para controles
      window.galaxyResetCamera = () => {
        theta = 0;
        phi = Math.PI / 4;
        distance = 120;
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
          mountRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
        
        delete window.galaxyResetCamera;
        delete window.galaxyToggleAutoRotate;
      };

    } catch (err) {
      console.error('❌ Erro ao inicializar 3D:', err);
      setError(`Erro ao carregar mapa 3D: ${err.message}`);
    }
  }, [planets]);

  const resetCamera = () => {
    if (window.galaxyResetCamera) window.galaxyResetCamera();
  };

  const toggleAutoRotate = () => {
    if (window.galaxyToggleAutoRotate) window.galaxyToggleAutoRotate();
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'safe': return 'text-blue-400';
      case 'active': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      case 'contested': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'safe': return <Shield className="w-4 h-4" />;
      case 'active': return <Target className="w-4 h-4" />;
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
            <p className="text-cyan-400 text-sm font-bold">Loading Galaxy...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black">
          <div className="text-center">
            <p className="text-red-400 text-sm">{error}</p>
            {onBack && <button onClick={onBack} className="mt-2 px-3 py-1 bg-cyan-600 rounded text-white text-xs">Back</button>}
          </div>
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

      {/* Controls */}
      {showControls && (
        <>
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-black/80 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-4 text-white">
              <h2 className="text-lg font-bold text-cyan-400 mb-2">Galaxy Status</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Super Earth ({planets.filter(p => p.faction === 'Super Earth').length})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span>Terminids ({planets.filter(p => p.faction === 'Terminids').length})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Automatons ({planets.filter(p => p.faction === 'Automatons').length})</span>
                </div>
              </div>
              
              <button onClick={resetCamera} className="mt-3 flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm w-full justify-center">
                <RotateCcw className="w-4 h-4" />
                <span>Reset Camera</span>
              </button>
              
              <button onClick={toggleAutoRotate} className={`mt-2 flex items-center space-x-2 px-3 py-2 rounded text-sm w-full justify-center ${autoRotateUI ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                <Target className="w-4 h-4" />
                <span>{autoRotateUI ? 'Stop Auto-Rotate' : 'Auto-Rotate'}</span>
              </button>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 z-10">
            <div className="bg-black/80 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-4 text-white">
              <h4 className="text-sm font-bold text-cyan-400 mb-2">War Stats</h4>
              <div className="text-sm space-y-1">
                <p>🔥 Active Fronts: <span className="text-green-400">{planets.filter(p => p.players > 0).length}</span></p>
                <p>👥 Total Helldivers: <span className="text-cyan-400">{planets.reduce((sum, p) => sum + p.players, 0).toLocaleString()}</span></p>
                <p>🌍 Contested: <span className="text-yellow-400">{planets.filter(p => p.faction !== 'Super Earth').length}</span></p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 right-4 z-10">
            <div className="bg-black/80 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-4 text-white">
              <h4 className="text-sm font-bold text-cyan-400 mb-2">Controls</h4>
              <div className="text-xs space-y-1 text-slate-400">
                <p>🖱️ <strong>Drag:</strong> Rotate view</p>
                <p>🖱️ <strong>Scroll:</strong> Zoom</p>
                <p>🎯 <strong>Click:</strong> Select planet</p>
                <p>🔄 <strong>Auto:</strong> {autoRotateUI ? 'ON' : 'OFF'}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Planet Info */}
      {selectedPlanet && (
        <div className="absolute top-4 right-4 z-10 w-80">
          <div className="bg-black/90 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-3 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-cyan-400">{selectedPlanet.name}</h3>
              <button onClick={() => setSelectedPlanet(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Faction:</span>
                <span className="font-semibold" style={{ color: `#${getFactionColor(selectedPlanet.faction).toString(16).padStart(6, '0')}` }}>
                  {selectedPlanet.faction}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Helldivers:</span>
                <div className="flex items-center space-x-1 text-green-400">
                  <Users className="w-3 h-3" />
                  <span className="font-semibold">{selectedPlanet.players.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Health:</span>
                  <span className="text-cyan-400">{((selectedPlanet.health / selectedPlanet.maxHealth) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1">
                  <div className="bg-gradient-to-r from-red-500 to-green-500 h-1 rounded-full" style={{ width: `${(selectedPlanet.health / selectedPlanet.maxHealth) * 100}%` }}></div>
                </div>
              </div>

              {selectedPlanet.liberationPercentage !== undefined && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Liberation:</span>
                    <span className="text-green-400">{selectedPlanet.liberationPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1">
                    <div className="bg-cyan-500 h-1 rounded-full" style={{ width: `${selectedPlanet.liberationPercentage}%` }}></div>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-slate-400">Biome:</span>
                <span className="text-slate-300 text-xs">{selectedPlanet.biome}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalaxyMap3D; 