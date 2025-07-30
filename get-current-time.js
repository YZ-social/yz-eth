// get-current-time.js - Simple utility to get current date and time
const now = new Date();

// Get current date and time in various formats
const isoString = now.toISOString();
const localString = now.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
});

const simpleFormat = now.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
});

console.log('=== CURRENT DATE AND TIME ===');
console.log('ISO Format:', isoString);
console.log('Eastern US (Full):', localString);
console.log('Eastern US (Simple):', simpleFormat);
console.log('================================');

// For AI_SESSION_CONTEXT.md format
console.log('\nFor AI_SESSION_CONTEXT.md:');
console.log(`**Last Updated**: ${simpleFormat}`); 