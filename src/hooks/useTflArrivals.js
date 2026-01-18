import { useState, useEffect } from 'react';

export function useTflArrivals(lineId = 'northern', stopPointId = '940GZZLUTBC', direction = 'outbound') {
    const [arrivals, setArrivals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Live Arrivals
                const liveResponse = await fetch(
                    `https://api.tfl.gov.uk/Line/${lineId}/Arrivals/${stopPointId}`
                );

                let liveData = [];
                if (liveResponse.ok) {
                    const data = await liveResponse.json();
                    liveData = data
                        .filter(train => {
                            const d = direction.toLowerCase();
                            // Robust direction matching
                            return train.direction === direction ||
                                (d === 'outbound' && train.platformName?.includes('Northbound')) ||
                                (d === 'inbound' && train.platformName?.includes('Southbound')) ||
                                (d === 'outbound' && train.platformName?.includes('Eastbound')) ||
                                (d === 'inbound' && train.platformName?.includes('Westbound'));
                        })
                        .sort((a, b) => a.timeToStation - b.timeToStation);
                }

                // 2. Fetch Timetable if needed (if fewer than 3 live trains)
                let scheduledData = [];
                if (liveData.length < 3) {
                    try {
                        const timetableResponse = await fetch(
                            `https://api.tfl.gov.uk/Line/${lineId}/Timetable/${stopPointId}`
                        );
                        if (timetableResponse.ok) {
                            const tData = await timetableResponse.json();
                            // Find correct schedule (this is tricky, simplified assumption: first valid schedule)
                            // We need to match direction/route. 
                            // For MVP: Flatten all schedules and find next available times
                            const schedules = tData.timetable?.routes?.[0]?.schedules?.[0]?.knownJourneys || [];

                            const now = new Date();
                            const currentHour = now.getHours();
                            const currentMinute = now.getMinutes();
                            const currentTimeInMins = currentHour * 60 + currentMinute;

                            scheduledData = schedules
                                .map(j => {
                                    const [h, m] = j.hour.split(':').map(Number);
                                    const timeInMins = h * 60 + m;
                                    const diff = timeInMins - currentTimeInMins;
                                    return {
                                        id: `sched-${h}-${m}`,
                                        destinationName: tData.stops?.[tData.stops.length - 1]?.name || 'Scheduled', // Approximate
                                        timeToStation: diff * 60, // seconds
                                        isScheduled: true,
                                        scheduledTime: `${j.hour}:${j.minute}`
                                    };
                                })
                                .filter(t => t.timeToStation > 300) // Only show scheduled if > 5 mins away (avoid overlap with live)
                                .sort((a, b) => a.timeToStation - b.timeToStation)
                                .slice(0, 3); // Take next 3
                        }
                    } catch (e) {
                        console.warn('Timetable fetch failed', e);
                    }
                }

                // 3. Merge
                // If live data exists, use it. Append scheduled if shortage.
                const combined = [...liveData, ...scheduledData].slice(0, 5);

                setArrivals(combined);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setError(err.message);
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 30000); // Poll slower (30s) to be nice to API
        return () => clearInterval(interval);
    }, [lineId, stopPointId, direction]);

    return { arrivals, loading, error };
}
