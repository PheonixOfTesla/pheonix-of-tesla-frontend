import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Login = () => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isLogin) {
                await api.login({ 
                    email: formData.email, 
                    password: formData.password 
                });
            } else {
                await api.register(formData);
            }
            navigate('/dashboard');
        } catch (error) {
            console.error('Auth error:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="bg-gray-800 p-8 rounded-lg w-96">
                <h2 className="text-2xl font-bold text-white mb-6">
                    {isLogin ? 'Login' : 'Register'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="email"
                        placeholder="Email"
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required
                    />
                    
                    {!isLogin && (
                        <input
                            type="text"
                            placeholder="Username"
                            className="w-full px-4 py-2 bg-gray-700 text-white rounded"
                            value={formData.username}
                            onChange={(e) => setFormData({...formData, username: e.target.value})}
                            required
                        />
                    )}
                    
                    <input
                        type="password"
                        placeholder="Password"
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        required
                    />
                    
                    <button
                        type="submit"
                        className="w-full py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded font-bold"
                    >
                        {isLogin ? 'Login' : 'Register'}
                    </button>
                </form>
                
                <p className="text-gray-400 text-center mt-4">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-orange-500 hover:underline"
                    >
                        {isLogin ? 'Register' : 'Login'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Login;
