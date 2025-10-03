// src/pages/SolarSystem.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';

// Shader for advanced atmospheric scattering
const atmosphereVertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const atmosphereFragmentShader = `
    uniform vec3 color;
    uniform float opacity;
    uniform float time;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
        float intensity = pow(0.8 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        float pulse = sin(time * 2.0) * 0.05 + 0.95;
        gl_FragColor = vec4(color, intensity * opacity * pulse);
    }
`;

// Aurora shader
const auroraVertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;
    
    void main() {
        vUv = uv;
        vPosition = position;
        vec3 pos = position;
        pos.y += sin(position.x * 0.1 + time) * 0.5;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

const auroraFragmentShader = `
    uniform float time;
    uniform vec3 color1;
    uniform vec3 color2;
    varying vec2 vUv;
    
    void main() {
        float wave = sin(vUv.x * 10.0 + time * 2.0) * 0.5 + 0.5;
        vec3 color = mix(color1, color2, wave);
        float alpha = (1.0 - vUv.y) * 0.6 * wave;
        gl_FragColor = vec4(color, alpha);
    }
`;

const SolarSystem = () => {
    const mountRef = useRef(null);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [selectedPlanet, setSelectedPlanet] = useState(null);
    const [quality, setQuality] = useState('ultra');
    
    // Refs for Three.js objects
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const planetsRef = useRef([]);
    const asteroidsRef = useRef([]);
    const cometRef = useRef(null);
    const mouseRef = useRef({ x: 0, y: 0 });
    const timeRef = useRef(0);
    const animationIdRef = useRef(null);
    const lensFlareRef = useRef(null);

    // Realistic planet data
    const planetData = [
        {
            name: 'Mercury',
            radius: 2.4,
            distance: 40,
            speed: 4.15,
            rotation: 0.003,
            tilt: 0.01,
            color: 0x8C8680,
            emissive: 0x000000,
            metalness: 0.9,
            roughness: 0.8,
            route: '/mercury',
            description: 'Real-time health vitals',
            texture: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/mercury.jpg',
            hasAurora: false
        },
        {
            name: 'Venus',
            radius: 6.0,
            distance: 60,
            speed: 1.62,
            rotation: -0.001,
            tilt: 177.4,
            color: 0xFFC649,
            emissive: 0x332211,
            metalness: 0.3,
            roughness: 0.7,
            route: '/venus',
            description: 'Fitness tracking',
            texture: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/venus_atmosphere.jpg',
            atmosphereColor: 0xFFD4A3,
            atmosphereOpacity: 0.8,
            hasAurora: false
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
            description: 'Time management',
            texture: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
            specularMap: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg',
            normalMap: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg',
            atmosphereColor: 0x4499FF,
            atmosphereOpacity: 0.3,
            clouds: true,
            hasAurora: true,
            cityLights: true
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
            description: 'Goals & habits',
            texture: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/mars_1k_color.jpg',
            atmosphereColor: 0xFF8866,
            atmosphereOpacity: 0.1,
            hasAurora: false,
            hasDustStorms: true
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
            description: 'Financial system',
            texture: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/jupiter.jpg',
            atmosphereColor: 0xFFDDCC,
            atmosphereOpacity: 0.2,
            hasAurora: true,
            hasStorms: true,
            moons: [
                { name: 'Io', radius: 1.8, distance: 45, speed: 5 },
                { name: 'Europa', radius: 1.5, distance: 50, speed: 3 },
                { name: 'Ganymede', radius: 2.6, distance: 58, speed: 2 },
                { name: 'Callisto', radius: 2.4, distance: 65, speed: 1.5 }
            ]
        },
        {
            name: 'Saturn',
            radius: 29,
            distance: 300,
            speed: 0.034,
            rotation: 0.009,
            tilt: 26.7,
            color: 0xFAD5A5,
            emissive: 0x111100,
            metalness: 0.1,
            roughness: 0.7,
            route: '/saturn',
            description: 'Long-term planning',
            texture: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/saturn.jpg',
            atmosphereColor: 0xFFEEDD,
            atmosphereOpacity: 0.15,
            hasAurora: true,
            rings: {
                innerRadius: 35,
                outerRadius: 80,
                texture: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/saturn_ring_alpha.png'
            }
        }
    ];

    // Create ultra-realistic starfield with nebula
    const createStarfield = useCallback((scene) => {
        // Multi-layer starfield
        const starLayers = [
            { count: 15000, size: 0.3, distance: 1000, twinkle: true },
            { count: 8000, size: 0.6, distance: 2000, twinkle: false },
            { count: 4000, size: 1.0, distance: 3000, twinkle: true },
            { count: 1000, size: 2.0, distance: 4000, twinkle: false },
            { count: 200, size: 3.0, distance: 5000, twinkle: true } // Bright stars
        ];

        starLayers.forEach((layer, layerIndex) => {
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const colors = [];
            const sizes = [];

            for (let i = 0; i < layer.count; i++) {
                const theta = 2 * Math.PI * Math.random();
                const phi = Math.acos(2 * Math.random() - 1);
                const r = layer.distance * (0.8 + 0.4 * Math.random());

                positions.push(
                    r * Math.sin(phi) * Math.cos(theta),
                    r * Math.sin(phi) * Math.sin(theta),
                    r * Math.cos(phi)
                );

                // Realistic star colors based on temperature
                const starType = Math.random();
                if (starType < 0.05) {
                    colors.push(0.7, 0.7, 1.0); // Blue supergiants
                } else if (starType < 0.15) {
                    colors.push(0.9, 0.9, 1.0); // Blue-white
                } else if (starType < 0.35) {
                    colors.push(1.0, 1.0, 0.95); // White
                } else if (starType < 0.65) {
                    colors.push(1.0, 1.0, 0.8); // Yellow-white
                } else if (starType < 0.85) {
                    colors.push(1.0, 0.9, 0.7); // Yellow
                } else if (starType < 0.95) {
                    colors.push(1.0, 0.8, 0.6); // Orange
                } else {
                    colors.push(1.0, 0.6, 0.6); // Red giants
                }

                sizes.push(layer.size * (0.5 + Math.random()));
            }

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

            const material = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    twinkle: { value: layer.twinkle ? 1.0 : 0.0 }
                },
                vertexShader: `
                    attribute float size;
                    varying vec3 vColor;
                    varying float vSize;
                    uniform float time;
                    
                    void main() {
                        vColor = color;
                        vSize = size;
                        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                        gl_PointSize = size * (300.0 / -mvPosition.z);
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `,
                fragmentShader: `
                    varying vec3 vColor;
                    varying float vSize;
                    uniform float time;
                    uniform float twinkle;
                    
                    void main() {
                        vec2 center = gl_PointCoord - vec2(0.5);
                        float dist = length(center);
                        if (dist > 0.5) discard;
                        
                        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                        float twinkleFactor = 1.0;
                        if (twinkle > 0.5) {
                            twinkleFactor = 0.7 + 0.3 * sin(time * 3.0 + vSize * 100.0);
                        }
                        
                        gl_FragColor = vec4(vColor, alpha * twinkleFactor);
                    }
                `,
                transparent: true,
                vertexColors: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            const stars = new THREE.Points(geometry, material);
            stars.name = `starLayer${layerIndex}`;
            scene.add(stars);
        });

        // Add nebula clouds
        const nebulaGeometry = new THREE.SphereGeometry(8000, 32, 32);
        const nebulaMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color1: { value: new THREE.Color(0x0033AA) },
                color2: { value: new THREE.Color(0xAA0066) },
                color3: { value: new THREE.Color(0x006644) }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                void main() {
                    vUv = uv;
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 color1;
                uniform vec3 color2;
                uniform vec3 color3;
                varying vec2 vUv;
                varying vec3 vPosition;
                
                float noise(vec3 p) {
                    return sin(p.x * 0.01) * sin(p.y * 0.01) * sin(p.z * 0.01);
                }
                
                void main() {
                    float n = noise(vPosition + time * 10.0);
                    vec3 color = mix(color1, color2, n);
                    color = mix(color, color3, sin(n * 3.14159));
                    float alpha = 0.02 * (1.0 + n);
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            side: THREE.BackSide,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
        nebula.name = 'nebula';
        scene.add(nebula);
    }, []);

    // Create ultra-realistic sun with corona and solar flares
    const createSun = useCallback((scene) => {
        const sunGroup = new THREE.Group();
        sunGroup.name = 'sun';

        // Core sun sphere with texture
        const sunGeometry = new THREE.SphereGeometry(20, 128, 128);
        const sunMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                turbulence: { value: 0.5 }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                uniform float time;
                
                void main() {
                    vUv = uv;
                    vNormal = normal;
                    vec3 pos = position;
                    pos += normal * sin(position.x * 0.1 + time) * 0.1;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float turbulence;
                varying vec2 vUv;
                varying vec3 vNormal;
                
                vec3 getSunColor(vec2 uv) {
                    float t = time * 0.1;
                    float r = 1.0;
                    float g = 0.7 + 0.1 * sin(uv.x * 10.0 + t);
                    float b = 0.1 + 0.05 * sin(uv.y * 10.0 - t);
                    return vec3(r, g, b);
                }
                
                void main() {
                    vec3 color = getSunColor(vUv);
                    float intensity = 1.0 + 0.2 * sin(time * 2.0 + vUv.x * 20.0);
                    gl_FragColor = vec4(color * intensity, 1.0);
                }
            `
        });
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        sunGroup.add(sun);

        // Multiple corona layers for depth
        const coronaLayers = [
            { size: 25, opacity: 0.4, speed: 1.0 },
            { size: 30, opacity: 0.3, speed: -0.8 },
            { size: 40, opacity: 0.2, speed: 1.2 },
            { size: 55, opacity: 0.1, speed: -0.6 }
        ];

        coronaLayers.forEach((layer, index) => {
            const coronaGeometry = new THREE.SphereGeometry(layer.size, 64, 64);
            const coronaMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    opacity: { value: layer.opacity },
                    speed: { value: layer.speed }
                },
                vertexShader: `
                    varying vec3 vNormal;
                    varying vec3 vPosition;
                    uniform float time;
                    uniform float speed;
                    
                    void main() {
                        vNormal = normalize(normalMatrix * normal);
                        vPosition = position;
                        vec3 pos = position;
                        pos += normal * sin(time * speed + position.x * 0.1) * 2.0;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float time;
                    uniform float opacity;
                    uniform float speed;
                    varying vec3 vNormal;
                    varying vec3 vPosition;
                    
                    void main() {
                        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
                        vec3 color = vec3(1.0, 0.7, 0.3);
                        float flicker = 0.8 + 0.2 * sin(time * speed * 3.0 + vPosition.x);
                        gl_FragColor = vec4(color, intensity * opacity * flicker);
                    }
                `,
                side: THREE.BackSide,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
            corona.name = `corona${index}`;
            sunGroup.add(corona);
        });

        // Solar flares (particle system)
        const flareCount = 100;
        const flareGeometry = new THREE.BufferGeometry();
        const flarePositions = new Float32Array(flareCount * 3);
        const flareVelocities = new Float32Array(flareCount * 3);
        
        for (let i = 0; i < flareCount * 3; i += 3) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const r = 20;
            flarePositions[i] = r * Math.sin(phi) * Math.cos(theta);
            flarePositions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
            flarePositions[i + 2] = r * Math.cos(phi);
            
            flareVelocities[i] = (Math.random() - 0.5) * 0.5;
            flareVelocities[i + 1] = Math.random() * 1.0;
            flareVelocities[i + 2] = (Math.random() - 0.5) * 0.5;
        }
        
        flareGeometry.setAttribute('position', new THREE.BufferAttribute(flarePositions, 3));
        flareGeometry.setAttribute('velocity', new THREE.BufferAttribute(flareVelocities, 3));
        
        const flareMaterial = new THREE.PointsMaterial({
            color: 0xFFAA00,
            size: 2,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        const flares = new THREE.Points(flareGeometry, flareMaterial);
        flares.name = 'solarFlares';
        sunGroup.add(flares);

        // Main sun light
        const sunLight = new THREE.PointLight(0xFFFFEE, 3, 1500);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 4096;
        sunLight.shadow.mapSize.height = 4096;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 1000;
        sunGroup.add(sunLight);

        // Lens flare effect
        const lensFlareGeometry = new THREE.PlaneGeometry(200, 200);
        const lensFlareMaterial = new THREE.ShaderMaterial({
            uniforms: {
                intensity: { value: 0.5 },
                color: { value: new THREE.Color(0xFFFFAA) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float intensity;
                uniform vec3 color;
                varying vec2 vUv;
                
                void main() {
                    vec2 center = vUv - vec2(0.5);
                    float dist = length(center);
                    float alpha = max(0.0, 1.0 - dist * 2.0);
                    alpha = pow(alpha, 3.0) * intensity;
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const lensFlare = new THREE.Mesh(lensFlareGeometry, lensFlareMaterial);
        lensFlare.name = 'lensFlare';
        lensFlareRef.current = lensFlare;
        scene.add(lensFlare);

        scene.add(sunGroup);
        return sunGroup;
    }, []);

    // Create asteroid belt
    const createAsteroidBelt = useCallback((scene) => {
        const asteroidCount = 2000;
        const asteroids = [];
        
        for (let i = 0; i < asteroidCount; i++) {
            const size = Math.random() * 0.5 + 0.1;
            const geometry = new THREE.DodecahedronGeometry(size, 0);
            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0.5 + Math.random() * 0.5, 0.4 + Math.random() * 0.3, 0.3),
                metalness: 0.6,
                roughness: 0.8
            });
            
            const asteroid = new THREE.Mesh(geometry, material);
            
            // Position in belt between Mars and Jupiter
            const distance = 150 + Math.random() * 30;
            const angle = Math.random() * Math.PI * 2;
            const yOffset = (Math.random() - 0.5) * 10;
            
            asteroid.position.x = Math.cos(angle) * distance;
            asteroid.position.y = yOffset;
            asteroid.position.z = Math.sin(angle) * distance;
            
            asteroid.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            
            asteroid.userData = {
                angle: angle,
                distance: distance,
                speed: 0.001 + Math.random() * 0.002,
                rotationSpeed: {
                    x: (Math.random() - 0.5) * 0.01,
                    y: (Math.random() - 0.5) * 0.01,
                    z: (Math.random() - 0.5) * 0.01
                },
                yOffset: yOffset
            };
            
            asteroids.push(asteroid);
            scene.add(asteroid);
        }
        
        asteroidsRef.current = asteroids;
    }, []);

    // Create comet with tail
    const createComet = useCallback((scene) => {
        const cometGroup = new THREE.Group();
        
        // Comet head
        const headGeometry = new THREE.SphereGeometry(1, 32, 32);
        const headMaterial = new THREE.MeshBasicMaterial({
            color: 0xCCDDFF,
            emissive: 0xCCDDFF,
            emissiveIntensity: 0.5
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        cometGroup.add(head);
        
        // Comet tail (particles)
        const tailCount = 1000;
        const tailGeometry = new THREE.BufferGeometry();
        const tailPositions = new Float32Array(tailCount * 3);
        const tailColors = new Float32Array(tailCount * 3);
        const tailSizes = new Float32Array(tailCount);
        
        for (let i = 0; i < tailCount; i++) {
            const distance = i / tailCount * 50;
            tailPositions[i * 3] = -distance;
            tailPositions[i * 3 + 1] = (Math.random() - 0.5) * distance * 0.1;
            tailPositions[i * 3 + 2] = (Math.random() - 0.5) * distance * 0.1;
            
            const color = new THREE.Color(0xCCDDFF);
            color.multiplyScalar(1 - i / tailCount);
            tailColors[i * 3] = color.r;
            tailColors[i * 3 + 1] = color.g;
            tailColors[i * 3 + 2] = color.b;
            
            tailSizes[i] = (1 - i / tailCount) * 2;
        }
        
        tailGeometry.setAttribute('position', new THREE.BufferAttribute(tailPositions, 3));
        tailGeometry.setAttribute('color', new THREE.BufferAttribute(tailColors, 3));
        tailGeometry.setAttribute('size', new THREE.BufferAttribute(tailSizes, 1));
        
        const tailMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                attribute float size;
                varying vec3 vColor;
                uniform float time;
                
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    float wiggle = sin(time * 10.0 + position.x * 0.1) * 0.5;
                    mvPosition.y += wiggle;
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float dist = length(center);
                    if (dist > 0.5) discard;
                    
                    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                    gl_FragColor = vec4(vColor, alpha * 0.6);
                }
            `,
            transparent: true,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const tail = new THREE.Points(tailGeometry, tailMaterial);
        cometGroup.add(tail);
        
        cometGroup.userData = {
            angle: 0,
            distance: 400,
            speed: 0.002,
            eccentricity: 0.8
        };
        
        cometRef.current = cometGroup;
        scene.add(cometGroup);
    }, []);

    // Create planets with all advanced features
    const createPlanets = useCallback((scene) => {
        const textureLoader = new THREE.TextureLoader();
        const planets = [];

        planetData.forEach((data) => {
            const planetGroup = new THREE.Group();
            planetGroup.name = data.name;

            // Load textures
            const textures = {};
            if (data.texture) {
                textures.map = textureLoader.load(data.texture);
            }
            if (data.normalMap) {
                textures.normalMap = textureLoader.load(data.normalMap);
                textures.normalScale = new THREE.Vector2(2, 2);
            }
            if (data.specularMap) {
                textures.specularMap = textureLoader.load(data.specularMap);
            }

            // Planet sphere
            const geometry = new THREE.SphereGeometry(data.radius, 128, 64);
            const material = new THREE.MeshStandardMaterial({
                ...textures,
                color: data.color,
                metalness: data.metalness,
                roughness: data.roughness,
                emissive: data.emissive,
                emissiveIntensity: 0.05
            });
            const planet = new THREE.Mesh(geometry, material);
            planet.castShadow = true;
            planet.receiveShadow = true;
            planet.rotation.z = (data.tilt * Math.PI) / 180;
            planetGroup.add(planet);

            // Advanced atmosphere with scattering
            if (data.atmosphereColor) {
                const atmosphereGeometry = new THREE.SphereGeometry(data.radius * 1.15, 64, 64);
                const atmosphereMaterial = new THREE.ShaderMaterial({
                    uniforms: {
                        time: { value: 0 },
                        color: { value: new THREE.Color(data.atmosphereColor) },
                        opacity: { value: data.atmosphereOpacity }
                    },
                    vertexShader: atmosphereVertexShader,
                    fragmentShader: atmosphereFragmentShader,
                    side: THREE.BackSide,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });
                const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
                planetGroup.add(atmosphere);
            }

            // Add aurora effects for Earth, Jupiter, Saturn
            if (data.hasAurora) {
                const auroraGeometry = new THREE.CylinderGeometry(
                    data.radius * 0.8,
                    data.radius * 1.1,
                    data.radius * 0.4,
                    32, 1, true
                );
                const auroraMaterial = new THREE.ShaderMaterial({
                    uniforms: {
                        time: { value: 0 },
                        color1: { value: new THREE.Color(0x00FF00) },
                        color2: { value: new THREE.Color(0x0000FF) }
                    },
                    vertexShader: auroraVertexShader,
                    fragmentShader: auroraFragmentShader,
                    side: THREE.DoubleSide,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });
                const auroraNorth = new THREE.Mesh(auroraGeometry, auroraMaterial);
                auroraNorth.position.y = data.radius * 0.8;
                auroraNorth.rotation.z = (data.tilt * Math.PI) / 180;
                planetGroup.add(auroraNorth);
                
                const auroraSouth = auroraNorth.clone();
                auroraSouth.position.y = -data.radius * 0.8;
                auroraSouth.rotation.x = Math.PI;
                planetGroup.add(auroraSouth);
            }

            // Add clouds for Earth
            if (data.clouds) {
                const cloudGeometry = new THREE.SphereGeometry(data.radius * 1.02, 64, 64);
                const cloudTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png');
                const cloudMaterial = new THREE.MeshPhongMaterial({
                    map: cloudTexture,
                    transparent: true,
                    opacity: 0.4,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });
                const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
                planetGroup.add(clouds);
                planetGroup.clouds = clouds;
            }

            // City lights for Earth (night side)
            if (data.cityLights) {
                const lightsGeometry = new THREE.SphereGeometry(data.radius * 1.01, 64, 64);
                const lightsMaterial = new THREE.ShaderMaterial({
                    uniforms: {
                        sunDirection: { value: new THREE.Vector3(1, 0, 0) }
                    },
                    vertexShader: `
                        varying vec3 vNormal;
                        varying vec3 vPosition;
                        void main() {
                            vNormal = normalize(normalMatrix * normal);
                            vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
                    fragmentShader: `
                        uniform vec3 sunDirection;
                        varying vec3 vNormal;
                        varying vec3 vPosition;
                        
                        void main() {
                            float darkness = -dot(vNormal, normalize(sunDirection));
                            darkness = smoothstep(-0.2, 0.2, darkness);
                            vec3 lightColor = vec3(1.0, 0.9, 0.7);
                            gl_FragColor = vec4(lightColor, darkness * 0.5);
                        }
                    `,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });
                const cityLights = new THREE.Mesh(lightsGeometry, lightsMaterial);
                planetGroup.add(cityLights);
                planetGroup.cityLights = cityLights;
            }

            // Saturn's rings with ice particles
            if (data.rings) {
                const ringGeometry = new THREE.RingGeometry(
                    data.rings.innerRadius,
                    data.rings.outerRadius,
                    256, 64
                );
                
                const ringTexture = textureLoader.load(data.rings.texture);
                const ringMaterial = new THREE.MeshStandardMaterial({
                    map: ringTexture,
                    color: 0xFFFFFF,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.8,
                    metalness: 0.1,
                    roughness: 0.9
                });
                const rings = new THREE.Mesh(ringGeometry, ringMaterial);
                rings.rotation.x = Math.PI / 2;
                rings.castShadow = true;
                rings.receiveShadow = true;
                planetGroup.add(rings);
                
                // Ring particles
                const particleCount = 5000;
                const particleGeometry = new THREE.BufferGeometry();
                const particlePositions = new Float32Array(particleCount * 3);
                
                for (let i = 0; i < particleCount; i++) {
                    const radius = data.rings.innerRadius + Math.random() * (data.rings.outerRadius - data.rings.innerRadius);
                    const angle = Math.random() * Math.PI * 2;
                    particlePositions[i * 3] = Math.cos(angle) * radius;
                    particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 2;
                    particlePositions[i * 3 + 2] = Math.sin(angle) * radius;
                }
                
                particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
                const particleMaterial = new THREE.PointsMaterial({
                    color: 0xFFFFFF,
                    size: 0.1,
                    transparent: true,
                    opacity: 0.6,
                    blending: THREE.AdditiveBlending
                });
                const ringParticles = new THREE.Points(particleGeometry, particleMaterial);
                planetGroup.add(ringParticles);
            }

            // Jupiter's moons
            if (data.moons) {
                planetGroup.moons = [];
                data.moons.forEach((moonData) => {
                    const moonGroup = new THREE.Group();
                    const moonGeometry = new THREE.SphereGeometry(moonData.radius, 32, 32);
                    const moonMaterial = new THREE.MeshStandardMaterial({
                        color: new THREE.Color(0.7, 0.7, 0.7),
                        metalness: 0.3,
                        roughness: 0.8,
                        emissive: 0x111111,
                        emissiveIntensity: 0.02
                    });
                    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
                    moon.castShadow = true;
                    moon.receiveShadow = true;
                    moonGroup.add(moon);
                    moonGroup.userData = moonData;
                    planetGroup.moons.push(moonGroup);
                    scene.add(moonGroup);
                });
            }

            // Jupiter's Great Red Spot
            if (data.hasStorms) {
                const stormGeometry = new THREE.SphereGeometry(data.radius * 1.001, 64, 64);
                const stormMaterial = new THREE.ShaderMaterial({
                    uniforms: {
                        time: { value: 0 }
                    },
                    vertexShader: `
                        varying vec2 vUv;
                        void main() {
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
                    fragmentShader: `
                        uniform float time;
                        varying vec2 vUv;
                        
                        void main() {
                            vec2 center = vec2(0.4, 0.5);
                            float dist = distance(vUv, center);
                            if (dist > 0.1 || dist < 0.02) discard;
                            
                            float swirl = sin(dist * 50.0 - time * 2.0) * 0.5 + 0.5;
                            vec3 color = mix(vec3(0.8, 0.3, 0.2), vec3(0.6, 0.2, 0.1), swirl);
                            gl_FragColor = vec4(color, 1.0);
                        }
                    `,
                    side: THREE.FrontSide,
                    transparent: false
                });
                const storm = new THREE.Mesh(stormGeometry, stormMaterial);
                planetGroup.add(storm);
            }

            // Store planet data
            planetGroup.userData = data;
            planets.push(planetGroup);
            scene.add(planetGroup);

            // Orbital path
            const orbitCurve = new THREE.EllipseCurve(
                0, 0,
                data.distance, data.distance,
                0, 2 * Math.PI,
                false,
                0
            );
            const orbitPoints = orbitCurve.getPoints(512);
            const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
            const orbitMaterial = new THREE.LineBasicMaterial({
                color: data.color,
                transparent: true,
                opacity: 0.1,
                blending: THREE.AdditiveBlending
            });
            const orbit = new THREE.Line(orbitGeometry, orbitMaterial);
            orbit.rotation.x = Math.PI / 2;
            scene.add(orbit);
        });

        return planets;
    }, [planetData]);

    // Animation loop
    const animate = useCallback(() => {
        if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

        animationIdRef.current = requestAnimationFrame(animate);
        timeRef.current += 0.001;

        // Update all shader uniforms
        sceneRef.current.traverse((child) => {
            if (child.material && child.material.uniforms && child.material.uniforms.time) {
                child.material.uniforms.time.value = timeRef.current * 5;
            }
        });

        // Animate sun
        const sun = sceneRef.current.getObjectByName('sun');
        if (sun) {
            sun.rotation.y += 0.001;
            
            // Animate solar flares
            const flares = sun.getObjectByName('solarFlares');
            if (flares) {
                const positions = flares.geometry.attributes.position;
                const velocities = flares.geometry.attributes.velocity;
                
                for (let i = 0; i < positions.count; i++) {
                    positions.setY(i, positions.getY(i) + velocities.getY(i));
                    
                    if (positions.getY(i) > 50) {
                        const theta = Math.random() * Math.PI * 2;
                        const phi = Math.random() * Math.PI;
                        const r = 20;
                        positions.setXYZ(
                            i,
                            r * Math.sin(phi) * Math.cos(theta),
                            r * Math.sin(phi) * Math.sin(theta),
                            r * Math.cos(phi)
                        );
                    }
                }
                positions.needsUpdate = true;
            }
        }

        // Update lens flare position
        if (lensFlareRef.current && cameraRef.current) {
            const sunPosition = new THREE.Vector3(0, 0, 0);
            const screenPosition = sunPosition.clone();
            screenPosition.project(cameraRef.current);
            
            lensFlareRef.current.position.x = screenPosition.x * 100;
            lensFlareRef.current.position.y = screenPosition.y * 100;
            lensFlareRef.current.position.z = 50;
            lensFlareRef.current.lookAt(cameraRef.current.position);
        }

        // Animate planets
        planetsRef.current.forEach((planetGroup) => {
            const data = planetGroup.userData;
            const angle = timeRef.current * data.speed;

            // Orbital motion
            planetGroup.position.x = Math.cos(angle) * data.distance;
            planetGroup.position.z = Math.sin(angle) * data.distance;
            planetGroup.position.y = Math.sin(angle * 2) * 2; // Slight vertical oscillation

            // Planet rotation
            planetGroup.rotation.y += data.rotation;

            // Rotate clouds
            if (planetGroup.clouds) {
                planetGroup.clouds.rotation.y += data.rotation * 1.5;
            }

            // Update city lights direction
            if (planetGroup.cityLights) {
                const sunDirection = new THREE.Vector3(0, 0, 0).sub(planetGroup.position).normalize();
                planetGroup.cityLights.material.uniforms.sunDirection.value = sunDirection;
            }

            // Animate moons
            if (planetGroup.moons) {
                planetGroup.moons.forEach((moonGroup, moonIndex) => {
                    const moonData = moonGroup.userData;
                    const moonAngle = timeRef.current * moonData.speed;
                    moonGroup.position.x = planetGroup.position.x + Math.cos(moonAngle) * moonData.distance;
                    moonGroup.position.z = planetGroup.position.z + Math.sin(moonAngle) * moonData.distance;
                    moonGroup.position.y = planetGroup.position.y;
                    moonGroup.rotation.y += 0.01;
                });
            }
        });

        // Animate asteroids
        asteroidsRef.current.forEach((asteroid) => {
            const data = asteroid.userData;
            data.angle += data.speed;
            asteroid.position.x = Math.cos(data.angle) * data.distance;
            asteroid.position.z = Math.sin(data.angle) * data.distance;
            asteroid.rotation.x += data.rotationSpeed.x;
            asteroid.rotation.y += data.rotationSpeed.y;
            asteroid.rotation.z += data.rotationSpeed.z;
        });

        // Animate comet
        if (cometRef.current) {
            const comet = cometRef.current;
            const data = comet.userData;
            data.angle += data.speed;
            
            // Elliptical orbit
            const a = data.distance;
            const b = data.distance * (1 - data.eccentricity);
            comet.position.x = Math.cos(data.angle) * a;
            comet.position.z = Math.sin(data.angle) * b;
            comet.position.y = Math.sin(data.angle * 0.5) * 20;
            
            // Point tail away from sun
            const sunDirection = new THREE.Vector3(0, 0, 0).sub(comet.position);
            comet.lookAt(sunDirection);
        }

        // Camera controls with smooth movement
        const targetX = mouseRef.current.x * 100;
        const targetY = mouseRef.current.y * 100 + 100;
        cameraRef.current.position.x += (targetX - cameraRef.current.position.x) * 0.02;
        cameraRef.current.position.y += (targetY - cameraRef.current.position.y) * 0.02;
        
        // Gentle camera rotation
        cameraRef.current.position.z = 300 + Math.sin(timeRef.current * 0.5) * 50;
        cameraRef.current.lookAt(0, 0, 0);

        // Render
        rendererRef.current.render(sceneRef.current, cameraRef.current);
    }, []);

    // Initialize scene
    useEffect(() => {
        if (!mountRef.current) return;

        setLoading(true);
        setLoadingProgress(0);

        // Scene setup
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000011, 0.0002);
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(
            50,
            window.innerWidth / window.innerHeight,
            0.1,
            20000
        );
        camera.position.set(0, 100, 300);
        cameraRef.current = camera;

        // Renderer with maximum quality
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
            precision: 'highp',
            alpha: false,
            premultipliedAlpha: false,
            stencil: false,
            depth: true,
            logarithmicDepthBuffer: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.6;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.physicallyCorrectLights = true;
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Build scene
        setLoadingProgress(10);
        createStarfield(scene);
        
        setLoadingProgress(25);
        createSun(scene);
        
        setLoadingProgress(40);
        const planets = createPlanets(scene);
        planetsRef.current = planets;
        
        setLoadingProgress(60);
        createAsteroidBelt(scene);
        
        setLoadingProgress(80);
        createComet(scene);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x0a0a2a, 0.2);
        scene.add(ambientLight);

        // Rim lights for dramatic effect
        const rimLight1 = new THREE.DirectionalLight(0x4444FF, 0.2);
        rimLight1.position.set(500, 200, -500);
        scene.add(rimLight1);

        const rimLight2 = new THREE.DirectionalLight(0xFF4444, 0.2);
        rimLight2.position.set(-500, 200, 500);
        scene.add(rimLight2);

        setLoadingProgress(100);
        setTimeout(() => setLoading(false), 1000);

        animate();

        // Event handlers
        const handleMouseMove = (event) => {
            mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
        };

        const handleClick = (event) => {
            const mouse = new THREE.Vector2();
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);

            const planetMeshes = planetsRef.current.map(p => p.children[0]);
            const intersects = raycaster.intersectObjects(planetMeshes);

            if (intersects.length > 0) {
                const clickedPlanet = intersects[0].object.parent.userData;
                setSelectedPlanet(clickedPlanet);
                navigate(clickedPlanet.route);
            }
        };

        const handleWheel = (event) => {
            const zoomSpeed = 5;
            camera.position.z += event.deltaY * 0.1 * zoomSpeed;
            camera.position.z = Math.max(100, Math.min(800, camera.position.z));
        };

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('click', handleClick);
        window.addEventListener('wheel', handleWheel);
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('click', handleClick);
            window.removeEventListener('wheel', handleWheel);
            window.removeEventListener('resize', handleResize);
            
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }
            if (mountRef.current && renderer.domElement) {
                mountRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, [navigate, animate, createStarfield, createSun, createPlanets, createAsteroidBelt, createComet]);

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden">
            <div ref={mountRef} className="w-full h-full" />

            {/* Loading Screen */}
            {loading && (
                <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50">
                    <div className="relative">
                        <div className="text-8xl animate-pulse">🔥</div>
                        <div className="absolute inset-0 blur-xl opacity-50">
                            <div className="text-8xl animate-pulse text-orange-500">🔥</div>
                        </div>
                    </div>
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-500 via-yellow-500 to-red-500 bg-clip-text text-transparent mb-4 mt-8">
                        Phoenix of Tesla
                    </h1>
                    <div className="w-96 h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-orange-500 via-yellow-500 to-red-500 transition-all duration-500 rounded-full"
                            style={{ width: `${loadingProgress}%` }}
                        />
                    </div>
                    <p className="text-gray-400 mt-4 text-lg">Initializing Ultra-Realistic Solar System...</p>
                    <p className="text-gray-600 mt-2 text-sm">Loading {loadingProgress}%</p>
                </div>
            )}

            {/* UI Overlay */}
            {!loading && (
                <>
                    {/* Header */}
                    <div className="absolute top-8 left-8 z-40">
                        <h1 className="text-6xl font-black bg-gradient-to-r from-orange-500 via-yellow-500 to-red-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,100,0,0.5)]">
                            Phoenix of Tesla
                        </h1>
                        <p className="text-gray-300 mt-2 text-xl font-light">Your Personal Operating System</p>
                        <div className="flex gap-4 mt-4">
                            <div className="text-gray-500 text-sm">
                                <span className="text-white">🖱️ Move:</span> Look around
                            </div>
                            <div className="text-gray-500 text-sm">
                                <span className="text-white">📍 Click:</span> Select planet
                            </div>
                            <div className="text-gray-500 text-sm">
                                <span className="text-white">🔍 Scroll:</span> Zoom
                            </div>
                        </div>
                    </div>

                    {/* Planet Navigation */}
                    <div className="absolute bottom-8 left-8 z-40">
                        <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-gray-800/50 max-w-md">
                            <h3 className="text-2xl font-bold text-white mb-4">System Navigation</h3>
                            <div className="space-y-2">
                                {planetData.map((planet) => (
                                    <button
                                        key={planet.name}
                                        onClick={() => navigate(planet.route)}
                                        className="w-full text-left px-4 py-3 rounded-lg hover:bg-white/5 transition-all duration-300 flex items-center justify-between group border border-transparent hover:border-gray-700"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="w-3 h-3 rounded-full shadow-lg"
                                                style={{ 
                                                    backgroundColor: `#${planet.color.toString(16).padStart(6, '0')}`,
                                                    boxShadow: `0 0 10px #${planet.color.toString(16).padStart(6, '0')}`
                                                }}
                                            />
                                            <div>
                                                <span className="text-white font-semibold">{planet.name}</span>
                                                <span className="text-gray-400 text-sm ml-2">{planet.description}</span>
                                            </div>
                                        </div>
                                        <span className="text-gray-600 group-hover:text-orange-500 transition-colors transform group-hover:translate-x-1">→</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* System Stats */}
                    <div className="absolute bottom-8 right-8 z-40">
                        <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-gray-800/50">
                            <h4 className="text-lg font-semibold text-white mb-3">System Status</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Asteroids:</span>
                                    <span className="text-orange-500 font-mono">2,000</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Active Comet:</span>
                                    <span className="text-blue-400 font-mono">Halley-X7</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Solar Activity:</span>
                                    <span className="text-yellow-500 font-mono">HIGH</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Quality:</span>
                                    <span className="text-green-500 font-mono">ULTRA</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SolarSystem;