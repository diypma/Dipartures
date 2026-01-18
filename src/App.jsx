import React, { useState, useEffect } from 'react';
import { useTflArrivals } from './hooks/useTflArrivals';
import { ArrivalsBoard } from './components/ArrivalsBoard';
import { ServiceStatus } from './components/ServiceStatus';
import { Settings } from './components/Settings';
import { getDirectionLabel } from './utils/lineDirections';

function App() {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('tubeSettings');
    return saved ? JSON.parse(saved) : {
      lineId: 'northern',
      stopPointId: '940GZZLUTBC',
      direction: 'outbound',
      walkingOffset: 0,
      lineName: 'Northern',
      stationName: 'Tooting Bec Underground Station'
    };
  });

  const { arrivals, loading, error } = useTflArrivals(settings.lineId, settings.stopPointId, settings.direction);

  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('tubeSettings', JSON.stringify(newSettings));
  };

  // Extract station name without "Underground Station"
  const displayStationName = settings.stationName.replace(' Underground Station', '');
  const displayDirection = getDirectionLabel(settings.lineId, settings.direction);

  return (
    <div className="app-container">
      <Settings onSettingsChange={handleSettingsChange} currentSettings={settings} />
      <h1>
        {displayStationName} <br />
        <span style={{ fontSize: '0.4em', color: '#ff6600' }}>
          {settings.lineName} Line - {displayDirection}
        </span>
      </h1>
      <ArrivalsBoard
        arrivals={arrivals}
        loading={loading}
        error={error}
        walkingOffset={settings.walkingOffset}
      />
      <ServiceStatus lineId={settings.lineId} />
    </div>
  );
}

export default App;
