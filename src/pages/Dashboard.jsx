import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const planets = [
        { name: 'Mercury', path: '/mercury', color: 'red', description: 'Real-time Vitals' },
        { name: 'Venus', path: '/venus', color: 'pink', description: 'Fitness & Performance' },
        { name: 'Earth', path: '/earth', color: 'blue', description: 'Calendar & Time' },
        { name: 'Mars', path: '/mars', color: 'orange', description: 'Goals & Habits' },
        { name: 'Jupiter', path: '/jupiter', color: 'yellow', description: 'Financial Tracking' },
        { name: 'Saturn', path: '/saturn', color: 'yellow', description: 'Long-term Planning' }
    ];

    return (
        <div className="min-h-screen bg-gray-900 p-8">
            <h1 className="text-4xl font-bold text-white mb-8">Phoenix Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {planets.map(planet => (
                    <Link 
                        key={planet.path}
                        to={planet.path} 
                        className="p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        <h2 className={`text-xl font-bold text-${planet.color}-500`}>
                            {planet.name}
                        </h2>
                        <p className="text-gray-400">{planet.description}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default Dashboard;
