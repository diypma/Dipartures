import React, { useState, useEffect } from 'react';
import { getAvailableDirections } from '../utils/lineDirections';

export function Settings({ onSettingsChange, currentSettings }) {
    const [isOpen, setIsOpen] = useState(false);
    const [lines, setLines] = useState([]);
    const [stations, setStations] = useState([]);
    const [selectedLine, setSelectedLine] = useState(currentSettings.lineId);
    const [selectedStation, setSelectedStation] = useState(currentSettings.stopPointId);
    const [selectedDirection, setSelectedDirection] = useState(currentSettings.direction);
    const [selectedOffset, setSelectedOffset] = useState(currentSettings.walkingOffset || 0);
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
            fetch(`https://api.tfl.gov.uk/Line/${selectedLine}/Route/Sequence/outbound`)
                .then(r => r.json())
                .then(data => {
                    // Extract stations from stopPointSequences to get them in order
                    const sequences = data.stopPointSequences || [];
                    const orderedStations = [];
                    const seenIds = new Set();

                    sequences.forEach(seq => {
                        seq.stopPoint.forEach(stop => {
                            if (!seenIds.has(stop.id)) {
                                seenIds.add(stop.id);
                                orderedStations.push({ id: stop.id, name: stop.name });
                            }
                        });
                    });

                    if (orderedStations.length > 0) {
                        setStations(orderedStations.reverse());
                        setLoading(false);
                    } else {
                        // If no sequence found, fall back to simple alphabetical list
                        // This handles cases where 'outbound' might be invalid for a line
                        throw new Error('No sequence data found');
                    }
                })
                .catch(err => {
                    console.warn('Failed to fetch sequence, falling back to simple list:', err);
                    // Fallback fetch
                    fetch(`https://api.tfl.gov.uk/Line/${selectedLine}/StopPoints`)
                        .then(r => r.json())
                        .then(data => {
                            setStations(data.map(s => ({ id: s.id, name: s.commonName })).sort((a, b) => a.name.localeCompare(b.name)));
                            setLoading(false);
                        })
                        .catch(e => {
                            console.error('Critical failure fetching stations:', e);
                            setLoading(false);
                            setStations([]);
                        });
                });
        }
    }, [selectedLine]);

    const handleSave = () => {
        const newSettings = {
            lineId: selectedLine,
            stopPointId: selectedStation,
            direction: selectedDirection,
            walkingOffset: parseInt(selectedOffset, 10) || 0,
            lineName: lines.find(l => l.id === selectedLine)?.name || '',
            stationName: stations.find(s => s.id === selectedStation)?.name || ''
        };
        onSettingsChange(newSettings);
        setIsOpen(false);
    };

    const handleReset = () => {
        setSelectedLine('northern');
        setSelectedStation('940GZZLUTBC');
        setSelectedDirection('outbound');
        setSelectedOffset(0);
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

                        <div className="setting-group">
                            <label>Walking Offset (mins):</label>
                            <input
                                type="number"
                                min="0"
                                max="60"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={selectedOffset}
                                onChange={(e) => setSelectedOffset(e.target.value)}
                                onFocus={(e) => {
                                    if (selectedOffset === 0 || selectedOffset === '0') {
                                        setSelectedOffset('');
                                    }
                                }}
                                onBlur={() => {
                                    if (selectedOffset === '') {
                                        setSelectedOffset(0);
                                    }
                                }}
                            />
                        </div>

                        <div className="settings-actions">
                            <button className="save-btn" onClick={handleSave}>Save</button>
                            <button className="reset-btn" onClick={handleReset}>Reset Defaults</button>
                            <button className="cancel-btn" onClick={() => setIsOpen(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
