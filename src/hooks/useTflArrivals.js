import { useState, useEffect } from 'react';

const STATION_ID = '940GZZLUTBC'; // Tooting Bec
const LINE_ID = 'northern';

export function useTflArrivals() {
    const [arrivals, setArrivals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchArrivals = async () => {
            try {
                const response = await fetch(
                    `https://api.tfl.gov.uk/Line/${LINE_ID}/Arrivals/${STATION_ID}`
                );
                if (!response.ok) {
                    throw new Error('Failed to fetch arrivals');
                }
                const data = await response.json();

                // Filter for Northbound trains (checking platformName)
                // IMPORTANT: The API sometimes marks Southbound Morden trains as 'inbound' too.
                // We must rely on 'Northbound' in platform name and explicitly exclude Morden.
                const northbound = data
                    .filter(train => {
                        const isNorthbound = train.platformName.includes('Northbound');
                        const isNotMorden = train.destinationName !== 'Morden Underground Station';
                        return isNorthbound && isNotMorden;
                    })
                    .sort((a, b) => a.timeToStation - b.timeToStation);

                setArrivals(northbound);
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
    }, []);

    return { arrivals, loading, error };
}
