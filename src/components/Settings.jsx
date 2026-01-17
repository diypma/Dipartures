import React, { useState, useEffect } from 'react';
import { getAvailableDirections } from '../utils/lineDirections';

export function Settings({ onSettingsChange, currentSettings }) {
    const [isOpen, setIsOpen] = useState(false);
    const [lines, setLines] = useState([]);
    const [stations, setStations] = useState([]);
    const [selectedLine, setSelectedLine] = useState(currentSettings.lineId);
    const [selectedStation, setSelectedStation] = useState(currentSettings.stopPointId);
    const [selectedDirection, setSelectedDirection] = useState(currentSettings.direction);
    const [loading, setLoading] = useState(false);

    // Fetch tube lines on mount
    useEffect(() => {
        fetch('https://api.tfl.gov.uk/Line/Mode/tube')
            .then(r => r.json())
            .then(data => {
                setLines(data.map(l => ({ id: l.id, name: l.name })));
            })
            .catch(err => console.error('Failed to fetch lines:', err));
    }, []);

    // Fetch stations when line changes
    useEffect(() => {
        if (selectedLine) {
            setLoading(true);
            fetch(`https://api.tfl.gov.uk/Line/${selectedLine}/StopPoints`)
                .then(r => r.json())
                .then(data => {
                    setStations(data.map(s => ({ id: s.id, name: s.commonName })));
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Failed to fetch stations:', err);
                    setLoading(false);
                });
        }
    }, [selectedLine]);

    const handleSave = () => {
        const newSettings = {
            lineId: selectedLine,
            stopPointId: selectedStation,
            direction: selectedDirection,
            lineName: lines.find(l => l.id === selectedLine)?.name || '',
            stationName: stations.find(s => s.id === selectedStation)?.name || ''
        };
        onSettingsChange(newSettings);
        setIsOpen(false);
    };

    // Get direction options for the selected line
    const directionOptions = getAvailableDirections(selectedLine);

    return (
        <>
            <button className="settings-button" onClick={() => setIsOpen(!isOpen)}>
                ⚙️ Change Station
            </button>

            {isOpen && (
                <div className="settings-modal">
                    <div className="settings-content">
                        <h2>Settings</h2>

                        <div className="setting-group">
                            <label>Tube Line:</label>
                            <select
                                value={selectedLine}
                                onChange={(e) => setSelectedLine(e.target.value)}
                            >
                                {lines.map(line => (
                                    <option key={line.id} value={line.id}>{line.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="setting-group">
                            <label>Station:</label>
                            <select
                                value={selectedStation}
                                onChange={(e) => setSelectedStation(e.target.value)}
                                disabled={loading || !selectedLine}
                            >
                                {loading ? (
                                    <option>Loading...</option>
                                ) : (
                                    stations.map(station => (
                                        <option key={station.id} value={station.id}>
                                            {station.name}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div className="setting-group">
                            <label>Direction:</label>
                            <select
                                value={selectedDirection}
                                onChange={(e) => setSelectedDirection(e.target.value)}
                            >
                                {directionOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="settings-actions">
                            <button onClick={handleSave}>Save</button>
                            <button onClick={() => setIsOpen(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
