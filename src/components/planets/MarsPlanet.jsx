import React, { useState, useEffect } from 'react';

const MarsPlanet = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch mars data
        setLoading(false);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">Mars System</h1>
                <p className="text-gray-400">Managing your mars data</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-white">Status</h3>
                    <p className="text-gray-400">System operational</p>
                </div>
            </div>
        </div>
    );
};

export default MarsPlanet;
