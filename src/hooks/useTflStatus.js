import { useState, useEffect } from 'react';

export function useTflStatus(lineId = 'northern') {
    const [status, setStatus] = useState(null);
    const [reason, setReason] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch(
                    `https://api.tfl.gov.uk/Line/${lineId}/Status`
                );
                if (!response.ok) {
                    throw new Error('Failed to fetch status');
                }
                const data = await response.json();

                if (data && data.length > 0) {
                    const lineStatus = data[0].lineStatuses[0];
                    setStatus(lineStatus.statusSeverityDescription);
                    setReason(lineStatus.reason || null);
                }
                setLoading(false);
            } catch (err) {
                console.error(err);
                setStatus('Unknown');
                setLoading(false);
            }
        };

        fetchStatus();
        // Refresh every 60 seconds
        const interval = setInterval(fetchStatus, 60000);
        return () => clearInterval(interval);
    }, [lineId]);

    return { status, reason, loading };
}
