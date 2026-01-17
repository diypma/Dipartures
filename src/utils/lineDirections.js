// Direction mappings for each tube line
// Based on how TfL typically describes each line's directions
export const LINE_DIRECTIONS = {
    'bakerloo': {
        'outbound': 'Northbound',
        'inbound': 'Southbound'
    },
    'central': {
        'outbound': 'Eastbound',
        'inbound': 'Westbound'
    },
    'circle': {
        'outbound': 'Clockwise',
        'inbound': 'Anti-clockwise'
    },
    'district': {
        'outbound': 'Eastbound',
        'inbound': 'Westbound'
    },
    'hammersmith-city': {
        'outbound': 'Eastbound',
        'inbound': 'Westbound'
    },
    'jubilee': {
        'outbound': 'Eastbound',
        'inbound': 'Westbound'
    },
    'metropolitan': {
        'outbound': 'Northbound',
        'inbound': 'Southbound'
    },
    'northern': {
        'outbound': 'Northbound',
        'inbound': 'Southbound'
    },
    'piccadilly': {
        'outbound': 'Eastbound',
        'inbound': 'Westbound'
    },
    'victoria': {
        'outbound': 'Northbound',
        'inbound': 'Southbound'
    },
    'waterloo-city': {
        'outbound': 'Eastbound',
        'inbound': 'Westbound'
    }
};

// Get direction label for a specific line
export function getDirectionLabel(lineId, direction) {
    const lineDirections = LINE_DIRECTIONS[lineId];
    if (!lineDirections) return direction; // fallback
    return lineDirections[direction] || direction;
}

// Get available directions for a line
export function getAvailableDirections(lineId) {
    const lineDirections = LINE_DIRECTIONS[lineId];
    if (!lineDirections) {
        return [
            { value: 'outbound', label: 'Outbound' },
            { value: 'inbound', label: 'Inbound' }
        ];
    }

    return [
        { value: 'outbound', label: lineDirections.outbound },
        { value: 'inbound', label: lineDirections.inbound }
    ];
}
