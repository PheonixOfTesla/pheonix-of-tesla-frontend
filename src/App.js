import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/shared/Navigation';
import SolarSystem from './pages/SolarSystem';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import MercuryPlanet from './components/planets/MercuryPlanet';
import VenusPlanet from './components/planets/VenusPlanet';
import EarthPlanet from './components/planets/EarthPlanet';
import MarsPlanet from './components/planets/MarsPlanet';
import JupiterPlanet from './components/planets/JupiterPlanet';
import SaturnPlanet from './components/planets/SaturnPlanet';

function App() {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <Routes>
          <Route path="/" element={<SolarSystem />} />
          <Route path="/solar" element={<SolarSystem />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/mercury" element={<MercuryPlanet />} />
          <Route path="/venus" element={<VenusPlanet />} />
          <Route path="/earth" element={<EarthPlanet />} />
          <Route path="/mars" element={<MarsPlanet />} />
          <Route path="/jupiter" element={<JupiterPlanet />} />
          <Route path="/saturn" element={<SaturnPlanet />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
