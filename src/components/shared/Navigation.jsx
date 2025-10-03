import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navigation = () => {
    const location = useLocation();

    const navItems = [
        { path: '/solar', label: 'Solar System', icon: '🌌' },
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/mercury', label: 'Vitals', icon: '❤️' },
        { path: '/venus', label: 'Fitness', icon: '💪' },
        { path: '/earth', label: 'Calendar', icon: '📅' },
        { path: '/mars', label: 'Goals', icon: '🎯' },
        { path: '/jupiter', label: 'Finance', icon: '💰' },
        { path: '/saturn', label: 'Planning', icon: '🔮' }
    ];

    return (
        <nav className="bg-gray-900 border-b border-gray-800">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    <Link to="/" className="flex items-center space-x-3">
                        <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                            Phoenix of Tesla
                        </span>
                    </Link>

                    <div className="flex space-x-4">
                        {navItems.map(item => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                    location.pathname === item.path
                                        ? 'bg-gray-800 text-white'
                                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                }`}
                            >
                                <span className="mr-1">{item.icon}</span>
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navigation;
