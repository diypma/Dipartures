import React from 'react';

export function ArrivalsBoard({ arrivals, loading, error, walkingOffset = 0 }) {
    if (loading) return <div className="loading">Checking signals...</div>;
    if (error) return <div className="error">Signal Failure: {error}</div>;

    const offsetSeconds = walkingOffset * 60;

    // Filter and adjust trains based on walking offset
    const reachableTrains = arrivals
        .filter(train => train.timeToStation >= offsetSeconds)
        .map(train => ({
            ...train,
            adjustedTime: train.timeToStation - offsetSeconds
        }));

    if (reachableTrains.length === 0) return (
        <div className="board">
            <div className="loading">No trains reachable</div>
            <div style={{ fontSize: '0.8rem', marginTop: '10px' }}>
                (Next train would have left by time you arrive)
            </div>
        </div>
    );

    const nextTrains = reachableTrains.slice(0, 5);

    return (
        <div className="board">
            {nextTrains.map((train) => {
                let destination = train.towards;
                if (!destination) {
                    destination = train.destinationName.replace(' Underground Station', '');
                }
                destination = destination.replace('via CX', 'via Charing Cross');

                return (
                    <div key={train.id} className="arrival-row">
                        <span className="destination">{destination}</span>
                        <span className="time">{formatTime(train.adjustedTime)}</span>
                    </div>
                );
            })}
        </div>
    );
}

function formatTime(seconds) {
    if (seconds < 60) return 'Due';
    const mins = Math.ceil(seconds / 60);
    return `${mins} min`;
}
