import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';

const SolarSystem = () => {
    const mountRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        
        renderer.setSize(window.innerWidth, window.innerHeight);
        mountRef.current.appendChild(renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0xffffff, 1, 100);
        scene.add(pointLight);

        // Sun
        const sunGeometry = new THREE.SphereGeometry(2, 32, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff6600,
            emissive: 0xff6600
        });
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        scene.add(sun);

        // Planets
        const planets = [
            { name: 'Mercury', color: 0xff0000, size: 0.5, orbit: 5, speed: 0.02, route: '/mercury' },
            { name: 'Venus', color: 0xff69b4, size: 0.7, orbit: 8, speed: 0.015, route: '/venus' },
            { name: 'Earth', color: 0x0000ff, size: 0.8, orbit: 11, speed: 0.01, route: '/earth' },
            { name: 'Mars', color: 0xff4500, size: 0.6, orbit: 14, speed: 0.008, route: '/mars' },
            { name: 'Jupiter', color: 0xffd700, size: 1.2, orbit: 20, speed: 0.005, route: '/jupiter' },
            { name: 'Saturn', color: 0xdaa520, size: 1, orbit: 25, speed: 0.003, route: '/saturn' }
        ];

        const planetMeshes = [];
        planets.forEach(planet => {
            const geometry = new THREE.SphereGeometry(planet.size, 32, 32);
            const material = new THREE.MeshPhongMaterial({ color: planet.color });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.userData = planet;
            scene.add(mesh);
            planetMeshes.push(mesh);
        });

        camera.position.set(0, 20, 30);
        camera.lookAt(0, 0, 0);

        let time = 0;
        const animate = () => {
            requestAnimationFrame(animate);
            time += 0.01;

            sun.rotation.y += 0.005;

            planetMeshes.forEach(mesh => {
                const planet = mesh.userData;
                mesh.position.x = Math.cos(time * planet.speed) * planet.orbit;
                mesh.position.z = Math.sin(time * planet.speed) * planet.orbit;
                mesh.rotation.y += 0.01;
            });

            renderer.render(scene, camera);
        };

        animate();

        return () => {
            mountRef.current?.removeChild(renderer.domElement);
        };
    }, [navigate]);

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden">
            <div ref={mountRef} className="w-full h-full" />
            
            <div className="absolute top-8 left-8 text-white">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                    Phoenix of Tesla
                </h1>
                <p className="text-gray-400 mt-2">Your Personal Operating System</p>
            </div>
        </div>
    );
};

export default SolarSystem;
