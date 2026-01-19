import React, { useState, useEffect } from 'react';
import { useTflArrivals } from './hooks/useTflArrivals';
import { ArrivalsBoard } from './components/ArrivalsBoard';
import { ServiceStatus } from './components/ServiceStatus';
import { Settings } from './components/Settings';
import { getDirectionLabel, getLineColor } from './utils/lineDirections';
import WalkingManIcon from './components/WalkingManIcon';

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

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsViewMode, setSettingsViewMode] = useState('all');
  const [journeyStartTime, setJourneyStartTime] = useState(null);
  const [dynamicOffset, setDynamicOffset] = useState(settings.walkingOffset);
  const [isInputtingWalk, setIsInputtingWalk] = useState(false);
  const [targetArrivalTime, setTargetArrivalTime] = useState(null);

  // Sync dynamic offset with settings when not in active journey
  useEffect(() => {
    if (!journeyStartTime) {
      setDynamicOffset(settings.walkingOffset);
    }
  }, [settings.walkingOffset, journeyStartTime]);

  const { arrivals, loading, error } = useTflArrivals(settings.lineId, settings.stopPointId, settings.direction);

  // Journey Timer Dynamic Logic
  useEffect(() => {
    let interval;
    if (journeyStartTime) {
      const updateOffset = () => {
        const now = Date.now();
        const elapsedSeconds = (now - journeyStartTime) / 1000;
        const startOffsetSeconds = (targetArrivalTime - journeyStartTime) / 1000;
        const remainingSeconds = Math.max(0, startOffsetSeconds - elapsedSeconds);
        const remainingMinutes = remainingSeconds / 60;

        setDynamicOffset(remainingMinutes);

        if (remainingMinutes <= 0) {
          setJourneyStartTime(null);
          setTargetArrivalTime(null);
          setDynamicOffset(0);
        }
      };

      updateOffset();
      interval = setInterval(updateOffset, 1000);
    }
    return () => clearInterval(interval);
  }, [journeyStartTime, targetArrivalTime]);

  const startJourney = (minutes) => {
    const mins = parseFloat(minutes);
    if (isNaN(mins) || mins <= 0) {
      setIsInputtingWalk(false);
      return;
    }
    const now = Date.now();
    setJourneyStartTime(now);
    setTargetArrivalTime(now + (mins * 60000));
    setDynamicOffset(mins);
    setIsInputtingWalk(false);
  };

  const stopJourney = () => {
    setJourneyStartTime(null);
    setTargetArrivalTime(null);
    setDynamicOffset(settings.walkingOffset);
  };

  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('tubeSettings', JSON.stringify(newSettings));
    closeSettings();
    stopJourney();
  };

  const closeSettings = () => {
    setIsSettingsOpen(false);
    setSettingsViewMode('all');
  };

  const openSettings = (mode = 'all') => {
    setSettingsViewMode(mode);
    setIsSettingsOpen(true);
  };

  const toggleDirection = (e) => {
    e.stopPropagation();
    const newDir = settings.direction === 'outbound' ? 'inbound' : 'outbound';
    const newSettings = { ...settings, direction: newDir };
    setSettings(newSettings);
    localStorage.setItem('tubeSettings', JSON.stringify(newSettings));
  };

  // Format countdown for button display (MM:SS)
  const formatCountdown = () => {
    const totalSeconds = Math.ceil(dynamicOffset * 60);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const displayStationName = settings.stationName
    .replace(/ (Underground|DLR)? Station$/i, '')
    .toUpperCase();

  const displayDirection = getDirectionLabel(settings.lineId, settings.direction).toUpperCase();
  const lineColor = getLineColor(settings.lineId);

  return (
    <div className="app-container">
      <Settings
        onSettingsChange={handleSettingsChange}
        currentSettings={settings}
        isOpenExternal={isSettingsOpen}
        onCloseExternal={closeSettings}
        viewMode={settingsViewMode}
      />

      <header className="station-header">
        <div className="app-branding">DIPARTURES</div>
        <div className="station-sign interactive" onClick={() => openSettings('station')} title="Settings">
          <h1>{displayStationName}</h1>
        </div>

        <div className="line-info">
          <span
            className="line-badge interactive"
            onClick={() => openSettings('line')}
            title="Change Line"
            style={{ backgroundColor: lineColor, color: 'white' }}
          >
            {settings.lineName} Line
          </span>
          <span className="direction-label interactive" onClick={toggleDirection} title="Toggle Direction">
            {displayDirection} ⇌
          </span>

          {/* Journey Controls */}
          <div className="journey-container">
            {journeyStartTime ? (
              <button className="journey-btn active" onClick={stopJourney} title="Stop Walk">
                <WalkingManIcon className="walk-icon" />
                <span className="countdown">{formatCountdown()}</span>
              </button>
            ) : isInputtingWalk ? (
              <div className="walk-input-wrapper">
                <WalkingManIcon className="walk-icon static" />
                <input
                  type="number"
                  autoFocus
                  className="walk-minutes-input"
                  placeholder="MINS"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') startJourney(e.target.value);
                    if (e.key === 'Escape') setIsInputtingWalk(false);
                  }}
                  onBlur={(e) => startJourney(e.target.value)}
                />
              </div>
            ) : (
              <button className="journey-btn" onClick={() => setIsInputtingWalk(true)} title="Add Walk Time">
                <WalkingManIcon className="walk-icon" />
                <span className="add-walk-label">Add Walk</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <ArrivalsBoard
        arrivals={arrivals}
        loading={loading}
        error={error}
        walkingOffset={dynamicOffset}
        targetArrivalTime={targetArrivalTime}
      />


      <ServiceStatus lineId={settings.lineId} />
    </div>
  );
}

export default App;

