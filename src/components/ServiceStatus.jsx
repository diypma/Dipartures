import React from 'react';
import { useTflStatus } from '../hooks/useTflStatus';

export function ServiceStatus({ lineId = 'northern' }) {
    const { status, reason, loading } = useTflStatus(lineId);

    if (loading) return null;

    const isGoodService = status === 'Good Service';
    const displayText = reason || status;

    return (
        <div className="service-status">
            <div className="status-label">SERVICE:</div>
            <div className={`status-content ${!isGoodService ? 'disrupted' : ''}`}>
                {/* Use a simple marquee for long text if disrupted, otherwise static */}
                {isGoodService ? (
                    <span>{status}</span>
                ) : (
                    <marquee scrollamount="5">{displayText}</marquee>
                )}
            </div>
        </div>
    );
}
