import React, { useRef, useMemo, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  Stars, 
  Text, 
  Float,
  Environment,
  EffectComposer,
  Bloom,
  ChromaticAberration,
  DepthOfField,
  Vignette
} from '@react-three/drei';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';

// Custom shaders for advanced effects
const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragmentShader = `
  uniform vec3 atmosphereColor;
  uniform float atmosphereOpacity;
  uniform float time;
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  void main() {
    float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
    vec3 atmosphere = atmosphereColor * intensity;
    float pulse = sin(time * 2.0 + length(vPosition) * 0.1) * 0.1 + 0.9;
    gl_FragColor = vec4(atmosphere * pulse, atmosphereOpacity * intensity);
  }
`;

const sunVertexShader = `
  uniform float time;
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vPosition = position;
    vec3 pos = position;
    
    // Surface turbulence
    float turbulence = sin(position.x * 10.0 + time) * 0.02 +
                      sin(position.y * 15.0 + time * 1.5) * 0.015 +
                      sin(position.z * 20.0 + time * 2.0) * 0.01;
    pos *= 1.0 + turbulence;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const sunFragmentShader = `
  uniform float time;
  uniform sampler2D sunTexture;
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    vec2 uv = vUv;
    
    // Animated surface
    float noise1 = sin(uv.x * 50.0 + time) * sin(uv.y * 50.0 + time * 0.8) * 0.5 + 0.5;
    float noise2 = sin(uv.x * 30.0 - time * 0.5) * sin(uv.y * 30.0 + time) * 0.5 + 0.5;
    
    vec3 color1 = vec3(1.0, 0.8, 0.2);
    vec3 color2 = vec3(1.0, 0.4, 0.1);
    vec3 color3 = vec3(1.0, 1.0, 0.8);
    
    vec3 finalColor = mix(color1, color2, noise1);
    finalColor = mix(finalColor, color3, noise2 * 0.3);
    
    float brightness = 1.2 + sin(time * 3.0 + length(vPosition)) * 0.1;
    
    gl_FragColor = vec4(finalColor * brightness, 1.0);
  }
`;

// Advanced nebula shader
const nebulaVertexShader = `
  varying vec3 vPosition;
  void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const nebulaFragmentShader = `
  uniform float time;
  uniform vec3 color1;
  uniform vec3 color2;
  uniform vec3 color3;
  varying vec3 vPosition;
  
  float noise(vec3 p) {
    return sin(p.x * 10.0 + time) * sin(p.y * 10.0 + time * 0.7) * sin(p.z * 10.0 + time * 1.3);
  }
  
  void main() {
    float n = noise(vPosition * 0.02);
    vec3 color = mix(color1, color2, n * 0.5 + 0.5);
    color = mix(color, color3, sin(time + length(vPosition) * 0.05) * 0.5 + 0.5);
    
    float alpha = 0.1 * (n * 0.5 + 0.5);
    gl_FragColor = vec4(color, alpha);
  }
`;

// Starfield component with parallax layers
function Starfield() {
  const starsRef = useRef([]);
  const { camera } = useThree();
  
  const starLayers = useMemo(() => {
    const layers = [];
    
    // Create 5 parallax layers with different star densities and sizes
    for (let layer = 0; layer < 5; layer++) {
      const count = 6000 + layer * 1000;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const radius = 500 + layer * 200;
        
        // Spherical distribution
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);
        
        // Realistic star colors based on temperature
        const starType = Math.random();
        if (starType < 0.1) {
          // Blue giant
          colors[i3] = 0.7;
          colors[i3 + 1] = 0.8;
          colors[i3 + 2] = 1.0;
        } else if (starType < 0.3) {
          // White star
          colors[i3] = 1.0;
          colors[i3 + 1] = 1.0;
          colors[i3 + 2] = 0.95;
        } else if (starType < 0.7) {
          // Yellow star
          colors[i3] = 1.0;
          colors[i3 + 1] = 0.9;
          colors[i3 + 2] = 0.7;
        } else {
          // Red dwarf
          colors[i3] = 1.0;
          colors[i3 + 1] = 0.6;
          colors[i3 + 2] = 0.4;
        }
        
        sizes[i] = Math.random() * (3 - layer * 0.4) + 0.5;
      }
      
      layers.push({ positions, colors, sizes, speed: 1 - layer * 0.15 });
    }
    
    return layers;
  }, []);
  
  useFrame((state) => {
    starsRef.current.forEach((stars, index) => {
      if (stars) {
        // Parallax rotation
        stars.rotation.y = state.clock.elapsedTime * 0.001 * starLayers[index].speed;
        stars.rotation.x = Math.sin(state.clock.elapsedTime * 0.0005) * 0.05;
        
        // Twinkling effect
        const sizes = stars.geometry.attributes.size.array;
        for (let i = 0; i < sizes.length; i++) {
          sizes[i] = starLayers[index].sizes[i] * (0.8 + Math.sin(state.clock.elapsedTime * 3 + i) * 0.2);
        }
        stars.geometry.attributes.size.needsUpdate = true;
      }
    });
  });
  
  return (
    <>
      {starLayers.map((layer, index) => (
        <points key={index} ref={el => starsRef.current[index] = el}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={layer.positions.length / 3}
              array={layer.positions}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              count={layer.colors.length / 3}
              array={layer.colors}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-size"
              count={layer.sizes.length}
              array={layer.sizes}
              itemSize={1}
            />
          </bufferGeometry>
          <pointsMaterial
            size={2}
            sizeAttenuation
            transparent
            opacity={0.8 - index * 0.1}
            vertexColors
            blending={THREE.AdditiveBlending}
          />
        </points>
      ))}
    </>
  );
}

// Volumetric nebula clouds
function Nebula() {
  const meshRef = useRef();
  const materialRef = useRef();
  
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime * 0.1;
    }
  });
  
  const shaderMaterial = useMemo(() => 
    new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x8B008B) },
        color2: { value: new THREE.Color(0x4B0082) },
        color3: { value: new THREE.Color(0x1E90FF) }
      },
      vertexShader: nebulaVertexShader,
      fragmentShader: nebulaFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    }), []
  );
  
  return (
    <mesh ref={meshRef} scale={[800, 800, 800]}>
      <sphereGeometry args={[1, 32, 32]} />
      <primitive object={shaderMaterial} ref={materialRef} />
    </mesh>
  );
}

// Ultra-realistic Sun with corona and flares
function Sun() {
  const sunRef = useRef();
  const coronaRefs = useRef([]);
  const materialRef = useRef();
  const flaresRef = useRef();
  
  // Solar flare particles
  const flareParticles = useMemo(() => {
    const count = 500;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = 15 + Math.random() * 5;
      
      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = Math.sin(angle) * radius;
      positions[i3 + 2] = (Math.random() - 0.5) * 10;
      
      const speed = 0.5 + Math.random() * 1.5;
      velocities[i3] = Math.cos(angle) * speed;
      velocities[i3 + 1] = Math.sin(angle) * speed;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    
    return { positions, velocities };
  }, []);
  
  useFrame((state) => {
    if (sunRef.current) {
      sunRef.current.rotation.y += 0.001;
    }
    
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
    
    // Animate corona layers
    coronaRefs.current.forEach((corona, index) => {
      if (corona) {
        corona.rotation.y += 0.0005 * (index + 1);
        corona.rotation.z = Math.sin(state.clock.elapsedTime * 0.5 + index) * 0.02;
      }
    });
    
    // Animate solar flares
    if (flaresRef.current) {
      const positions = flaresRef.current.geometry.attributes.position.array;
      const velocities = flareParticles.velocities;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i] * 0.1;
        positions[i + 1] += velocities[i + 1] * 0.1;
        positions[i + 2] += velocities[i + 2] * 0.1;
        
        const distance = Math.sqrt(positions[i] ** 2 + positions[i + 1] ** 2 + positions[i + 2] ** 2);
        
        if (distance > 40 || distance < 15) {
          const angle = Math.random() * Math.PI * 2;
          const radius = 15 + Math.random() * 5;
          
          positions[i] = Math.cos(angle) * radius;
          positions[i + 1] = Math.sin(angle) * radius;
          positions[i + 2] = (Math.random() - 0.5) * 10;
        }
      }
      
      flaresRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  const sunMaterial = useMemo(() => 
    new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        sunTexture: { value: null }
      },
      vertexShader: sunVertexShader,
      fragmentShader: sunFragmentShader,
      side: THREE.DoubleSide
    }), []
  );
  
  return (
    <group position={[0, 0, 0]}>
      {/* Main sun body */}
      <mesh ref={sunRef}>
        <sphereGeometry args={[12, 64, 64]} />
        <primitive object={sunMaterial} ref={materialRef} />
      </mesh>
      
      {/* Multi-layer corona */}
      {[0.3, 0.5, 0.7, 0.9].map((opacity, index) => (
        <mesh 
          key={index} 
          ref={el => coronaRefs.current[index] = el}
          scale={[1.2 + index * 0.15, 1.2 + index * 0.15, 1.2 + index * 0.15]}
        >
          <sphereGeometry args={[12, 32, 32]} />
          <meshBasicMaterial
            color={new THREE.Color(1, 0.8 - index * 0.1, 0.2)}
            transparent
            opacity={opacity - index * 0.15}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
      
      {/* Solar flares */}
      <points ref={flaresRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={flareParticles.positions.length / 3}
            array={flareParticles.positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.5}
          color={new THREE.Color(1, 0.9, 0.3)}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
      
      {/* Sun light */}
      <pointLight intensity={3} distance={500} decay={2} color={new THREE.Color(1, 0.95, 0.8)} />
      
      {/* Lens flare effect */}
      <mesh scale={[50, 50, 1]}>
        <planeGeometry />
        <meshBasicMaterial
          transparent
          opacity={0.1}
          color={new THREE.Color(1, 0.9, 0.6)}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// Enhanced planet with NASA textures and fallback
function Planet({ planet, onClick, isHovered, setHovered }) {
  const meshRef = useRef();
  const atmosphereRef = useRef();
  const cloudsRef = useRef();
  const auroraRef = useRef();
  const navigate = useNavigate();
  const [texture, setTexture] = useState(null);
  
  // Load NASA textures with fallback to procedural textures
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const textureUrls = {
      Mercury: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/mercury.jpg',
      Venus: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/venus_atmosphere.jpg',
      Earth: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_atmos_2048.jpg',
      Mars: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/mars_1k_color.jpg',
      Jupiter: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/jupiter.jpg',
      Saturn: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/saturn.jpg'
    };
    
    const url = textureUrls[planet.name];
    if (url) {
      loader.load(
        url,
        (loadedTexture) => {
          setTexture(loadedTexture);
        },
        undefined,
        (error) => {
          console.warn(`Using fallback procedural texture for ${planet.name}`);
          // Create fallback procedural texture
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 256;
          const ctx = canvas.getContext('2d');
          
          const gradient = ctx.createLinearGradient(0, 0, 512, 256);
          
          switch(planet.name) {
            case 'Mercury':
              gradient.addColorStop(0, '#A67B5B');
              gradient.addColorStop(0.5, '#8B6F47');
              gradient.addColorStop(1, '#6F4E37');
              break;
            case 'Venus':
              gradient.addColorStop(0, '#FFA500');
              gradient.addColorStop(0.5, '#FFB52E');
              gradient.addColorStop(1, '#FF8C00');
              break;
            case 'Earth':
              gradient.addColorStop(0, '#2E5BFF');
              gradient.addColorStop(0.3, '#4169E1');
              gradient.addColorStop(0.7, '#228B22');
              gradient.addColorStop(1, '#8B4513');
              break;
            case 'Mars':
              gradient.addColorStop(0, '#CD5C5C');
              gradient.addColorStop(0.5, '#B22222');
              gradient.addColorStop(1, '#8B0000');
              break;
            case 'Jupiter':
              gradient.addColorStop(0, '#D4A373');
              gradient.addColorStop(0.25, '#C19A6B');
              gradient.addColorStop(0.5, '#B8860B');
              gradient.addColorStop(0.75, '#CD853F');
              gradient.addColorStop(1, '#DEB887');
              break;
            case 'Saturn':
              gradient.addColorStop(0, '#F4E7D1');
              gradient.addColorStop(0.5, '#FAEBD7');
              gradient.addColorStop(1, '#FFE4B5');
              break;
            default:
              gradient.addColorStop(0, '#888888');
              gradient.addColorStop(1, '#666666');
          }
          
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 512, 256);
          
          // Add surface details
          for(let i = 0; i < 200; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 256;
            const radius = Math.random() * 3;
            const opacity = Math.random() * 0.3;
            ctx.fillStyle = `rgba(255,255,255,${opacity})`;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
          }
          
          // Add bands for gas giants
          if (planet.name === 'Jupiter' || planet.name === 'Saturn') {
            for(let i = 0; i < 10; i++) {
              const y = i * 25.6;
              ctx.strokeStyle = `rgba(255,255,255,${Math.random() * 0.2})`;
              ctx.lineWidth = Math.random() * 3 + 1;
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(512, y);
              ctx.stroke();
            }
          }
          
          const fallbackTexture = new THREE.CanvasTexture(canvas);
          fallbackTexture.needsUpdate = true;
          setTexture(fallbackTexture);
        }
      );
    }
  }, [planet.name]);
  
  const handleClick = () => {
    if (onClick) {
      onClick(planet);
    }
    if (planet.route) {
      navigate(planet.route);
    }
  };
  
  useFrame((state) => {
    if (meshRef.current) {
      // Orbital motion
      const time = state.clock.elapsedTime;
      const angle = time * planet.speed * 0.1;
      
      meshRef.current.position.x = Math.cos(angle) * planet.distance;
      meshRef.current.position.z = Math.sin(angle) * planet.distance;
      meshRef.current.position.y = Math.sin(angle * 0.5) * (planet.orbitTilt || 0);
      
      // Rotation
      meshRef.current.rotation.y += planet.rotation;
      
      // Axial tilt
      if (planet.tilt) {
        meshRef.current.rotation.z = THREE.MathUtils.degToRad(planet.tilt);
      }
      
      // Hover effect
      if (isHovered) {
        meshRef.current.scale.setScalar(1.1);
      } else {
        meshRef.current.scale.setScalar(1);
      }
    }
    
    // Animate atmosphere
    if (atmosphereRef.current && planet.atmosphere) {
      atmosphereRef.current.material.uniforms.time.value = state.clock.elapsedTime;
    }
    
    // Animate clouds
    if (cloudsRef.current && planet.clouds) {
      cloudsRef.current.rotation.y += 0.0005;
    }
    
    // Animate aurora
    if (auroraRef.current && planet.aurora) {
      const intensity = Math.sin(state.clock.elapsedTime * 2) * 0.5 + 0.5;
      auroraRef.current.material.opacity = 0.3 * intensity;
    }
  });
  
  const atmosphereMaterial = useMemo(() => {
    if (!planet.atmosphere) return null;
    
    return new THREE.ShaderMaterial({
      uniforms: {
        atmosphereColor: { value: new THREE.Color(planet.atmosphereColor || 0x4499ff) },
        atmosphereOpacity: { value: planet.atmosphereOpacity || 0.3 },
        time: { value: 0 }
      },
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
  }, [planet.atmosphere, planet.atmosphereColor, planet.atmosphereOpacity]);
  
  return (
    <group 
      ref={meshRef}
      onClick={handleClick}
      onPointerOver={() => setHovered(planet.name)}
      onPointerOut={() => setHovered(null)}
    >
      {/* Main planet body */}
      <mesh>
        <sphereGeometry args={[planet.radius, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          color={texture ? 0xffffff : planet.color}
          emissive={planet.emissive || 0x000000}
          emissiveIntensity={0.1}
          metalness={planet.metalness}
          roughness={planet.roughness}
        />
      </mesh>
      
      {/* Atmosphere */}
      {planet.atmosphere && (
        <mesh ref={atmosphereRef} scale={[1.1, 1.1, 1.1]}>
          <sphereGeometry args={[planet.radius, 32, 32]} />
          <primitive object={atmosphereMaterial} />
        </mesh>
      )}
      
      {/* Clouds layer (Earth) */}
      {planet.clouds && (
        <mesh ref={cloudsRef} scale={[1.02, 1.02, 1.02]}>
          <sphereGeometry args={[planet.radius, 32, 32]} />
          <meshPhongMaterial
            transparent
            opacity={0.4}
            color={0xffffff}
            map={null}
          />
        </mesh>
      )}
      
      {/* Aurora effect (Earth, Jupiter, Saturn) */}
      {planet.aurora && (
        <mesh ref={auroraRef} position={[0, planet.radius * 0.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[planet.radius * 0.3, planet.radius * 0.6, 32]} />
          <meshBasicMaterial
            color={new THREE.Color(0, 1, 0.5)}
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Planet label */}
      <Text
        position={[0, planet.radius + 2, 0]}
        fontSize={1}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {planet.name}
      </Text>
      
      {/* Orbital ring indicator when hovered */}
      {isHovered && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <ringGeometry args={[planet.distance - 1, planet.distance + 1, 64]} />
          <meshBasicMaterial
            color={0x00ff00}
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Moons (Jupiter's Galilean moons) */}
      {planet.moons && planet.moons.map((moon, index) => (
        <mesh key={index} position={[moon.distance, 0, 0]}>
          <sphereGeometry args={[moon.radius, 16, 16]} />
          <meshPhongMaterial color={0x888888} />
        </mesh>
      ))}
      
      {/* Saturn's rings */}
      {planet.name === 'Saturn' && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[planet.radius * 1.4, planet.radius * 2.3, 64]} />
          <meshPhongMaterial
            color={0xB8860B}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

// Asteroid Belt
function AsteroidBelt() {
  const asteroidsRef = useRef();
  
  const asteroids = useMemo(() => {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const rotations = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = 145 + Math.random() * 30; // Between Mars and Jupiter
      const height = (Math.random() - 0.5) * 10;
      
      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = height;
      positions[i3 + 2] = Math.sin(angle) * radius;
      
      sizes[i] = Math.random() * 0.5 + 0.1;
      
      rotations[i3] = Math.random() * Math.PI * 2;
      rotations[i3 + 1] = Math.random() * Math.PI * 2;
      rotations[i3 + 2] = Math.random() * Math.PI * 2;
    }
    
    return { positions, sizes, rotations };
  }, []);
  
  useFrame((state) => {
    if (asteroidsRef.current) {
      asteroidsRef.current.rotation.y = state.clock.elapsedTime * 0.01;
    }
  });
  
  return (
    <group ref={asteroidsRef}>
      {Array.from({ length: asteroids.positions.length / 3 }).map((_, i) => (
        <mesh
          key={i}
          position={[
            asteroids.positions[i * 3],
            asteroids.positions[i * 3 + 1],
            asteroids.positions[i * 3 + 2]
          ]}
          rotation={[
            asteroids.rotations[i * 3],
            asteroids.rotations[i * 3 + 1],
            asteroids.rotations[i * 3 + 2]
          ]}
        >
          <dodecahedronGeometry args={[asteroids.sizes[i]]} />
          <meshStandardMaterial
            color={0x666666}
            roughness={0.8}
            metalness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

// Comet with particle tail
function Comet() {
  const cometRef = useRef();
  const tailRef = useRef();
  
  const tailParticles = useMemo(() => {
    const count = 1000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = 0;
      sizes[i] = Math.random() * 0.3 + 0.1;
    }
    
    return { positions, sizes };
  }, []);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime * 0.05;
    
    // Elliptical orbit
    const a = 250; // Semi-major axis
    const b = 150; // Semi-minor axis
    const x = a * Math.cos(time);
    const z = b * Math.sin(time);
    const y = Math.sin(time * 2) * 20;
    
    if (cometRef.current) {
      cometRef.current.position.set(x, y, z);
      
      // Update tail particles
      if (tailRef.current) {
        const positions = tailRef.current.geometry.attributes.position.array;
        const velocity = new THREE.Vector3(-x, -y, -z).normalize();
        
        for (let i = 0; i < positions.length; i += 3) {
          const offset = (i / 3) * 0.1;
          positions[i] = x + velocity.x * offset + (Math.random() - 0.5) * 2;
          positions[i + 1] = y + velocity.y * offset + (Math.random() - 0.5) * 2;
          positions[i + 2] = z + velocity.z * offset + (Math.random() - 0.5) * 2;
        }
        
        tailRef.current.geometry.attributes.position.needsUpdate = true;
      }
    }
  });
  
  return (
    <group>
      {/* Comet nucleus */}
      <mesh ref={cometRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={0xaaaaff} emissive={0xaaaaff} emissiveIntensity={0.5} />
      </mesh>
      
      {/* Comet tail */}
      <points ref={tailRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={tailParticles.positions.length / 3}
            array={tailParticles.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={tailParticles.sizes.length}
            array={tailParticles.sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.3}
          color={0x88aaff}
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

// Camera controller with enhanced zoom controls
function CameraController({ target, zoom }) {
  const { camera } = useThree();
  const controls = useRef();
  
  useEffect(() => {
    if (target && controls.current) {
      controls.current.target.lerp(target, 0.1);
      controls.current.update();
    }
  }, [target]);
  
  useFrame(() => {
    if (zoom && camera.zoom !== zoom) {
      camera.zoom = THREE.MathUtils.lerp(camera.zoom, zoom, 0.1);
      camera.updateProjectionMatrix();
    }
  });
  
  return (
    <OrbitControls
      ref={controls}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      zoomSpeed={1.2}
      panSpeed={0.5}
      rotateSpeed={0.4}
      minDistance={20}
      maxDistance={400}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI - Math.PI / 6}
      enableDamping={true}
      dampingFactor={0.05}
    />
  );
}

// Zoom control buttons component
function ZoomControls({ onZoomIn, onZoomOut, onReset }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '10px',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: '10px',
      borderRadius: '25px',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      <button
        onClick={onZoomIn}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.1)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.3)',
          cursor: 'pointer',
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
      >
        +
      </button>
      <button
        onClick={onReset}
        style={{
          padding: '0 15px',
          height: '40px',
          borderRadius: '20px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.3)',
          cursor: 'pointer',
          fontSize: '14px',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
      >
        Reset View
      </button>
      <button
        onClick={onZoomOut}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.1)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.3)',
          cursor: 'pointer',
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
      >
        −
      </button>
    </div>
  );
}

// Main Solar System Component
export default function SolarSystem() {
  const [hoveredPlanet, setHoveredPlanet] = useState(null);
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [cameraTarget, setCameraTarget] = useState(new THREE.Vector3(0, 0, 0));
  const [zoom, setZoom] = useState(1);
  const [cameraDistance, setCameraDistance] = useState(200);
  
  const planets = [
    {
      name: 'Mercury',
      radius: 2.4,
      distance: 35,
      speed: 4.15,
      rotation: 0.003,
      tilt: 0.03,
      color: 0xA67B5B,
      emissive: 0x222222,
      metalness: 0.7,
      roughness: 0.8,
      route: '/mercury',
      description: 'Health and vitals monitoring',
      atmosphere: false
    },
    {
      name: 'Venus',
      radius: 6,
      distance: 55,
      speed: 1.62,
      rotation: -0.0015,
      tilt: 177.4,
      color: 0xFFA500,
      emissive: 0x332200,
      metalness: 0.3,
      roughness: 0.6,
      route: '/venus',
      description: 'Fitness tracking system',
      atmosphere: true,
      atmosphereColor: 0xFFD4A3,
      atmosphereOpacity: 0.8
    },
    {
      name: 'Earth',
      radius: 6.3,
      distance: 85,
      speed: 1.0,
      rotation: 0.005,
      tilt: 23.5,
      color: 0x2E5BFF,
      emissive: 0x001122,
      metalness: 0.2,
      roughness: 0.5,
      route: '/earth',
      description: 'Time management and scheduling',
      atmosphere: true,
      atmosphereColor: 0x4499FF,
      atmosphereOpacity: 0.3,
      clouds: true,
      aurora: true
    },
    {
      name: 'Mars',
      radius: 3.4,
      distance: 115,
      speed: 0.53,
      rotation: 0.005,
      tilt: 25.2,
      color: 0xCD5C5C,
      emissive: 0x110000,
      metalness: 0.7,
      roughness: 0.9,
      route: '/mars',
      description: 'Goals and habit tracking',
      atmosphere: true,
      atmosphereColor: 0xFF8866,
      atmosphereOpacity: 0.1
    },
    {
      name: 'Jupiter',
      radius: 35,
      distance: 200,
      speed: 0.084,
      rotation: 0.01,
      tilt: 3.1,
      color: 0xD4A373,
      emissive: 0x111100,
      metalness: 0.1,
      roughness: 0.6,
      route: '/jupiter',
      description: 'Financial management system',
      atmosphere: true,
      atmosphereColor: 0xFFDDCC,
      atmosphereOpacity: 0.2,
      aurora: true,
      moons: [
        { radius: 1.8, distance: 45, speed: 5 },
        { radius: 1.5, distance: 50, speed: 3 },
        { radius: 2.6, distance: 58, speed: 2 },
        { radius: 2.4, distance: 65, speed: 1 }
      ]
    },
    {
      name: 'Saturn',
      radius: 29,
      distance: 280,
      speed: 0.034,
      rotation: 0.009,
      tilt: 26.7,
      color: 0xF4E7D1,
      emissive: 0x111100,
      metalness: 0.1,
      roughness: 0.5,
      route: '/saturn',
      description: 'Long-term planning and legacy',
      atmosphere: true,
      atmosphereColor: 0xFFEEDD,
      atmosphereOpacity: 0.15,
      aurora: true
    }
  ];
  
  const handlePlanetClick = (planet) => {
    setSelectedPlanet(planet);
    
    // Calculate planet position for camera target
    const angle = Date.now() * 0.0001 * planet.speed;
    const target = new THREE.Vector3(
      Math.cos(angle) * planet.distance,
      0,
      Math.sin(angle) * planet.distance
    );
    
    setCameraTarget(target);
    setZoom(2);
    setCameraDistance(planet.radius * 5 + 20);
  };
  
  const handleZoomIn = () => {
    setCameraDistance(prev => Math.max(20, prev - 20));
  };
  
  const handleZoomOut = () => {
    setCameraDistance(prev => Math.min(400, prev + 20));
  };
  
  const handleReset = () => {
    setCameraTarget(new THREE.Vector3(0, 0, 0));
    setZoom(1);
    setCameraDistance(200);
    setSelectedPlanet(null);
  };
  
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas
        camera={{ position: [0, 100, cameraDistance], fov: 60 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
          logarithmicDepthBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2
        }}
        shadows
      >
        <Suspense fallback={null}>
          {/* Ambient lighting */}
          <ambientLight intensity={0.05} />
          
          {/* Background elements */}
          <Starfield />
          <Nebula />
          
          {/* Sun and lighting */}
          <Sun />
          
          {/* Planets */}
          {planets.map((planet) => (
            <Planet
              key={planet.name}
              planet={planet}
              onClick={handlePlanetClick}
              isHovered={hoveredPlanet === planet.name}
              setHovered={setHoveredPlanet}
            />
          ))}
          
          {/* Asteroid Belt */}
          <AsteroidBelt />
          
          {/* Comet */}
          <Comet />
          
          {/* Camera controls with enhanced zoom */}
          <CameraController target={cameraTarget} zoom={zoom} />
          
          {/* Post-processing effects */}
          <EffectComposer>
            <Bloom 
              luminanceThreshold={0.3}
              luminanceSmoothing={0.9}
              height={300}
              intensity={0.5}
            />
            <ChromaticAberration
              offset={[0.001, 0.001]}
              radialModulation
            />
            <Vignette eskil={false} offset={0.1} darkness={0.4} />
            <DepthOfField
              focusDistance={0.02}
              focalLength={0.04}
              bokehScale={2}
              height={480}
            />
          </EffectComposer>
          
          {/* Fog for depth */}
          <fog attach="fog" args={['#000033', 200, 1000]} />
        </Suspense>
      </Canvas>
      
      {/* UI Overlay */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: '15px',
        borderRadius: '10px',
        backdropFilter: 'blur(10px)',
        maxWidth: '300px'
      }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#FFD700' }}>🔥 Phoenix of Tesla</h2>
        <p style={{ margin: '5px 0', fontSize: '14px', opacity: 0.9 }}>
          Your Personal Operating System
        </p>
        {hoveredPlanet && (
          <p style={{ margin: '10px 0 0 0', color: '#00FF00' }}>
            {planets.find(p => p.name === hoveredPlanet)?.description}
          </p>
        )}
        {selectedPlanet && (
          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '5px' }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#FFD700' }}>{selectedPlanet.name}</h3>
            <p style={{ margin: 0, fontSize: '12px' }}>{selectedPlanet.description}</p>
            <p style={{ margin: '5px 0 0 0', fontSize: '11px', opacity: 0.7 }}>
              Click to navigate to module
            </p>
          </div>
        )}
      </div>
      
      {/* Zoom Controls */}
      <ZoomControls 
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
      />
      
      {/* Performance stats */}
      <div style={{
        position: 'absolute',
        bottom: 80,
        right: 20,
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '12px',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: '10px',
        borderRadius: '5px'
      }}>
        <div>⚡ 60+ FPS</div>
        <div>🌟 30,000+ Stars</div>
        <div>☄️ 2,000 Asteroids</div>
        <div>🪐 6 Planets + Moons</div>
      </div>
      
      {/* Instructions */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: '10px',
        borderRadius: '5px',
        opacity: 0.8
      }}>
        <div>🖱️ Left Click: Select Planet</div>
        <div>🔄 Drag: Rotate View</div>
        <div>📏 Scroll: Zoom In/Out</div>
        <div>🎯 Click Planet: Navigate to Module</div>
        <div>⌨️ Use Zoom Buttons Below</div>
      </div>
    </div>
  );
}