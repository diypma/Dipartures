import { useState, useEffect } from 'react';
import { LINE_DIRECTIONS } from '../utils/lineDirections';

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
                    const lineMap = LINE_DIRECTIONS[lineId] || {};
                    const targetLabel = (lineMap[direction] || '').toLowerCase();

                    liveData = data
                        .filter(train => {
                            // 0. Filter out trains that are terminating AT this station
                            // (Prevents "Shadow Arrivals" at terminus stations like Brixton)
                            if (train.naptanId === train.destinationNaptanId) return false;

                            const d = direction.toLowerCase();
                            const platform = (train.platformName || '').toLowerCase();
                            const trainDir = (train.direction || '').toLowerCase();

                            // 1. Match on internal direction
                            if (trainDir === d) return true;

                            // 2. Match on mapping label (e.g. "Northbound")
                            if (targetLabel && platform.includes(targetLabel)) return true;

                            // 3. Broad compass/label fallbacks
                            if (d === 'outbound') {
                                return platform.includes('northbound') || platform.includes('eastbound') || platform.includes('clockwise');
                            } else {
                                return platform.includes('southbound') || platform.includes('westbound') || platform.includes('anti-clockwise');
                            }
                        })
                        .sort((a, b) => a.timeToStation - b.timeToStation);
                }

                // 2. Fetch Timetable if needed
                let scheduledData = [];
                try {
                    const tflDir = direction.toLowerCase() === 'inbound' ? 'inbound' : 'outbound';
                    const timetableResponse = await fetch(
                        `https://api.tfl.gov.uk/Line/${lineId}/Timetable/${stopPointId}?direction=${tflDir}`
                    );

                    if (timetableResponse.ok) {
                        const tData = await timetableResponse.json();

                        // Select correct schedule(s)
                        // IMPORTANT: Tube services use "service days" where trains after midnight
                        // are part of the previous day's service (e.g., 24:30 = 00:30 next day).
                        // So in early morning hours, we need YESTERDAY's late-night trains (24:XX, 25:XX)
                        const now = new Date();
                        const dayOfWeek = now.getDay();

                        const getScheduleName = (day) => {
                            if (day === 0) return 'Sunday';
                            else if (day === 5) return 'Friday';
                            else if (day === 6) return 'Saturday';
                            else return 'Monday - Thursday';
                        };

                        // Get today's schedule name
                        const todaySchedule = getScheduleName(dayOfWeek);

                        // Get yesterday's schedule name (for late-night trains)
                        const yesterday = (dayOfWeek - 1 + 7) % 7;
                        const yesterdaySchedule = getScheduleName(yesterday);

                        const allCandidates = [];
                        (tData.timetable?.routes || []).forEach(route => {
                            // Find both today's and yesterday's schedules
                            const todaySched = route.schedules?.find(s =>
                                s.name.toLowerCase().includes(todaySchedule.toLowerCase())
                            );
                            const yesterdaySched = route.schedules?.find(s =>
                                s.name.toLowerCase().includes(yesterdaySchedule.toLowerCase())
                            );

                            // Process both schedules
                            const schedules = [yesterdaySched, todaySched].filter(Boolean);

                            schedules.forEach(foundSched => {
                                if (foundSched) {
                                    (foundSched.knownJourneys || []).forEach(j => {
                                        const interval = route.stationIntervals?.find(si => si.id === String(j.intervalId));
                                        const lastStopId = interval?.intervals?.[interval.intervals.length - 1]?.stopId;
                                        const stopInfo = tData.stations?.find(s => s.stationId === lastStopId || s.id === lastStopId);

                                        const h = parseInt(j.hour, 10);
                                        const m = parseInt(j.minute, 10);
                                        const timeInMins = h * 60 + m;

                                        // Audit Fix: Use London time relative to now for correct timezone handling
                                        const now = new Date();

                                        // Use Intl.DateTimeFormat for reliable timezone conversion
                                        const formatter = new Intl.DateTimeFormat('en-GB', {
                                            timeZone: 'Europe/London',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: false
                                        });

                                        const parts = formatter.formatToParts(now);
                                        const nowH = parseInt(parts.find(p => p.type === 'hour').value, 10);
                                        const nowM = parseInt(parts.find(p => p.type === 'minute').value, 10);
                                        const nowInMins = nowH * 60 + nowM;

                                        // Audit Fix: Robust Midnight Wrap
                                        // Normalize difference to +/- 12 hours (720 mins)
                                        let diff = timeInMins - nowInMins;
                                        if (diff < -720) diff += 1440;
                                        else if (diff > 720) diff -= 1440;

                                        // Fallback for known terminus IDs if TFL API omits them
                                        const KNOWN_TERMINI = {
                                            '940GZZLUWWL': 'Walthamstow Central',
                                            '940GZZLUBXN': 'Brixton',
                                            '940GZZLUEGW': 'Edgware',
                                            '940GZZLUHBT': 'High Barnet',
                                            '940GZZLUMDN': 'Morden',
                                            '940GZZLUSTM': 'Stanmore',
                                            '940GZZLUSTD': 'Stratford',
                                            '940GZZLUEPG': 'Epping',
                                            '940GZZLUWRP': 'West Ruislip',
                                            '940GZZLUUPM': 'Upminster',
                                            '940GZZLUEBY': 'Ealing Broadway',
                                            '940GZZLURMD': 'Richmond',
                                            '940GZZLUWIM': 'Wimbledon',
                                            '940GZZLUHAW': 'Harrow & Wealdstone',
                                            '940GZZLUEAC': 'Elephant & Castle',
                                            '940GZZLUKNR': 'Kennington',
                                            '940GZZLUBAT': 'Battersea Power Station',
                                            '940GZZLUCX': 'Charing Cross'
                                        };

                                        let destName = 'Terminus';
                                        if (stopInfo) {
                                            destName = stopInfo.name.replace(/ (Underground|DLR)? Station$/i, '');
                                        } else if (KNOWN_TERMINI[lastStopId]) {
                                            destName = KNOWN_TERMINI[lastStopId];
                                        }

                                        allCandidates.push({
                                            id: `sched-${h}-${m}-${Math.random().toString(36).substr(2, 5)}`,
                                            destinationName: destName,
                                            timeToStation: diff * 60,
                                            isScheduled: true,
                                            scheduledTime: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
                                        });
                                    });
                                }
                            });
                        });

                        scheduledData = allCandidates
                            .filter(t => t.timeToStation >= 0)
                            .sort((a, b) => a.timeToStation - b.timeToStation);
                    }
                } catch (e) {
                    console.warn('Timetable fetch failed', e);
                }

                // 3. Merge
                // Determine the "live window" - we don't want scheduled trains to appear 
                // earlier than data we are already receiving live.
                const lastLiveTime = liveData.length > 0
                    ? liveData[liveData.length - 1].timeToStation
                    : 0;

                // Add a 3-minute gap (180s) to ensure we aren't showing the same train 
                // as both live and scheduled.
                const filteredScheduled = scheduledData.filter(s => s.timeToStation > (lastLiveTime + 180));

                // Final pool - live trains always come first.
                // We show up to 10 trains total.
                const combined = [...liveData, ...filteredScheduled].slice(0, 10);

                setArrivals(combined);
                setLoading(false);
            } catch (err) {
                console.error(err);
                if (err.message.includes('Load failed') || err.message.includes('Failed to fetch')) {
                    setError('Lost Signal (Checking Connection)');
                } else {
                    setError(err.message);
                }
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [lineId, stopPointId, direction]);

    return { arrivals, loading, error };
}
