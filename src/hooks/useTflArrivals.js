import { useState, useEffect } from 'react';

export function useTflArrivals(lineId = 'northern', stopPointId = '940GZZLUTBC', direction = 'outbound') {
    const [arrivals, setArrivals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchArrivals = async () => {
            try {
                const response = await fetch(
                    `https://api.tfl.gov.uk/Line/${lineId}/Arrivals/${stopPointId}`
                );
                if (!response.ok) {
                    throw new Error('Failed to fetch arrivals');
                }
                const data = await response.json();

                // Filter based on selected direction
                const filtered = data
                    .filter(train => {
                        // Check if train matches the selected direction
                        const matchesDirection = train.direction === direction ||
                            (direction === 'outbound' && train.platformName.includes('Northbound')) ||
                            (direction === 'inbound' && train.platformName.includes('Southbound'));

                        return matchesDirection;
                    })
                    .sort((a, b) => a.timeToStation - b.timeToStation);

                setArrivals(filtered);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setError(err.message);
                setLoading(false);
            }
        };

        fetchArrivals();
        // Refresh every 15 seconds
        const interval = setInterval(fetchArrivals, 15000);
        return () => clearInterval(interval);
    }, [lineId, stopPointId, direction]);

    return { arrivals, loading, error };
}
