'use strict';
const STORAGE_KEY_MATCHES = 'ub_matches';
const STORAGE_KEY_BETS = 'ub_bets';
const STORAGE_KEY_USER = 'ub_current_user';
const STORAGE_KEY_COINS = 'ub_coins';
const STORAGE_KEY_ADS = 'ub_ads';

let coins = 10;
let adsWatched = 0;
let currentUser = loadCurrentUserFromStorage() || 'Player';
let currentMatchId = null;
let matches = [
    { id: 'm-1', home: 'Fine arts', away: 'ESM', odds: [1.8, 3.2, 2.5], date: 'June 1', time: '2:00 PM', datetime: '2026-06-01T14:00' },
    { id: 'm-2', home: 'QTS', away: 'EVM', odds: [2.1, 2.9, 1.9], date: 'June 2', time: '4:30 PM', datetime: '2026-06-02T16:30' },
    { id: 'm-3', home: 'SVG', away: 'ARCHI', odds: [1.9, 3.0, 2.2], date: 'June 3', time: '1:45 PM', datetime: '2026-06-03T13:45' },
    { id: 'm-4', home: 'URP', away: 'IDD', odds: [2.4, 2.7, 1.7], date: 'June 4', time: '6:00 PM', datetime: '2026-06-04T18:00' }
];
let betHistory = [];

const BLOCKED_SCHEDULED_TEAMS = new Set([
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'History',
    'Law',
    'Computer Sci',
    'Engineering'
]);

function isBlockedMatch(match) {
    return BLOCKED_SCHEDULED_TEAMS.has(match.home) || BLOCKED_SCHEDULED_TEAMS.has(match.away);
}

function loadMatchesFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_MATCHES);
        if (!raw) return matches;
        const stored = JSON.parse(raw);
        if (Array.isArray(stored) && stored.length) {
            return stored.map(match => ({
                ...match,
                id: match.id || createMatchId()
            }));
        }
    } catch (err) {
        console.warn('Could not load stored matches:', err);
    }
    return matches;
}

function saveMatchesToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY_MATCHES, JSON.stringify(matches));
    } catch (err) {
        console.warn('Could not save matches:', err);
    }
}

function loadBetHistoryFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_BETS);
        if (!raw) return [];
        const stored = JSON.parse(raw);
        if (Array.isArray(stored)) {
            return stored;
        }
    } catch (err) {
        console.warn('Could not load stored bets:', err);
    }
    return [];
}

function saveBetHistoryToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY_BETS, JSON.stringify(betHistory));
    } catch (err) {
        console.warn('Could not save bet history:', err);
    }
}

function loadWalletFromStorage() {
    try {
        const storedCoins = parseInt(localStorage.getItem(STORAGE_KEY_COINS), 10);
        if (!Number.isNaN(storedCoins)) coins = storedCoins;
        const storedAds = parseInt(localStorage.getItem(STORAGE_KEY_ADS), 10);
        if (!Number.isNaN(storedAds)) adsWatched = storedAds;
    } catch (err) {
        console.warn('Could not load wallet state:', err);
    }
}

function saveWalletToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY_COINS, coins);
        localStorage.setItem(STORAGE_KEY_ADS, adsWatched);
    } catch (err) {
        console.warn('Could not save wallet state:', err);
    }
}

function loadCurrentUserFromStorage() {
    try {
        const value = localStorage.getItem(STORAGE_KEY_USER);
        return value ? value : null;
    } catch (err) {
        console.warn('Could not load current user:', err);
    }
    return null;
}

function saveCurrentUserToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY_USER, currentUser);
    } catch (err) {
        console.warn('Could not save current user:', err);
    }
}

function settleSelectedMatch() {
    const matchId = document.getElementById('settle-match-select')?.value;
    const resultCode = document.getElementById('settle-result-select')?.value;
    if (!matchId) {
        return alert('Choose a match to settle.');
    }
    if (!resultCode) {
        return alert('Choose a result outcome.');
    }
    settleMatchResult(matchId, resultCode);
}

function settleMatchResult(matchId, resultCode) {
    const match = matches.find(m => m.id === matchId);
    if (!match) {
        return alert('Match not found.');
    }
    if (match.status === 'Finished') {
        return alert('This match is already finished.');
    }
    match.status = 'Finished';
    match.result = resultCode;
    saveMatchesToStorage();

    let won = 0;
    let lost = 0;
    betHistory = betHistory.map(bet => {
        if (bet.matchId !== matchId || bet.status !== 'Placed') return bet;
        const isWin = evaluateBetOutcome(bet.market, resultCode);
        if (isWin) {
            won += 1;
            coins += Math.round(bet.stake * bet.odds);
            return { ...bet, status: 'Won', result: resultCode, settledAt: new Date().toISOString() };
        }
        lost += 1;
        return { ...bet, status: 'Lost', result: resultCode, settledAt: new Date().toISOString() };
    });

    saveBetHistoryToStorage();
    saveWalletToStorage();
    renderMatches();
    renderBetHistory();
    renderSettleMatchOptions();
    updateUI();
    alert(`Match settled: ${won} won, ${lost} lost.`);
}

function evaluateBetOutcome(market, resultCode) {
    if (market === '1') return resultCode === '1';
    if (market === 'X') return resultCode === 'X';
    if (market === '2') return resultCode === '2';
    if (market === 'DC1X') return resultCode === '1' || resultCode === 'X';
    if (market === 'DCX2') return resultCode === 'X' || resultCode === '2';
    return false;
}

function renderSettleMatchOptions() {
    const select = document.getElementById('settle-match-select');
    if (!select) return;
    const available = matches.filter(m => m.status !== 'Finished');
    select.innerHTML = `
        <option value="">Choose match</option>
        ${available.map(m => `<option value="${m.id}">${m.home} vs ${m.away} — ${m.date || 'TBD'}</option>`).join('')}
    `;
}

function renderUserInfo() {
    const userLabel = document.getElementById('player-name');
    if (userLabel) {
        userLabel.innerText = currentUser || 'Player';
    }
}

function handleScriptError(error) {
    console.error('Application error:', error);
    alert('An unexpected error occurred. Please refresh the page.');
}

window.addEventListener('error', event => {
    handleScriptError(event.error || event.message || 'Unknown error');
});

window.addEventListener('unhandledrejection', event => {
    handleScriptError(event.reason || event.message || 'Unhandled promise rejection');
});

function getBaseMatchMarkets(match) {
    return [
        { id: '1', name: 'Home Win', description: `${match.home} to win`, odds: match.odds[0] },
        { id: 'X', name: 'Draw', description: 'Match ends level', odds: match.odds[1] },
        { id: '2', name: 'Away Win', description: `${match.away} to win`, odds: match.odds[2] },
        { id: 'O2.5', name: 'Over 2.5 Goals', description: 'Three or more goals', odds: Math.max(1.8, parseFloat(((match.odds[0] + match.odds[2]) / 2).toFixed(2))) },
        { id: 'U2.5', name: 'Under 2.5 Goals', description: 'Two or fewer goals', odds: Math.max(1.6, parseFloat((Math.min(match.odds[0], match.odds[2]) / 1.4).toFixed(2))) },
        { id: 'BTTS', name: 'Both Teams To Score', description: 'Both sides score', odds: 1.85 },
        { id: 'DC1X', name: 'Double Chance 1X', description: 'Home win or draw', odds: 1.35 },
        { id: 'DCX2', name: 'Double Chance X2', description: 'Away win or draw', odds: 1.32 },
        { id: 'CS1', name: `${match.home} Clean Sheet`, description: `${match.home} keeps a clean sheet`, odds: 2.65 },
        { id: 'CS2', name: `${match.away} Clean Sheet`, description: `${match.away} keeps a clean sheet`, odds: 2.8 }
    ];
}

matches = loadMatchesFromStorage().filter(match => !isBlockedMatch(match));
betHistory = loadBetHistoryFromStorage();
loadWalletFromStorage();
saveMatchesToStorage();
updateUI();

let selectedMarket = null;
let selectedMarketName = null;
let selectedOdds = null;
const STORAGE_KEY_PLAYER_RATINGS = 'ub_player_ratings';
const ratingCategories = ['pace', 'shooting', 'passing', 'dribbling', 'defense', 'physical'];

const teamRosters = {
    'Fine arts': [
        { name: 'Adebayo', position: 'LW' },
        { name: 'Kazeem', position: 'CM' },
        { name: 'Bolanle', position: 'ST' }
    ],
    'ESM': [
        { name: 'Chidera', position: 'RW' },
        { name: 'Samuel', position: 'CM' },
        { name: 'Yusuf', position: 'LB' }
    ],
    'QTS': [
        { name: 'Efe', position: 'LM' },
        { name: 'Tosin', position: 'CM' },
        { name: 'Precious', position: 'ST' }
    ],
    'EVM': [
        { name: 'Lekan', position: 'CF' },
        { name: 'Miriam', position: 'AM' },
        { name: 'Sade', position: 'CDM' }
    ],
    'SVG': [
        { name: 'Adeyemi', position: 'LB' },
        { name: 'Fawaz', position: 'Midfielder', goals: 1 },
        { name: 'Caleb', position: 'CB' },
        { name: 'Fola', position: 'LWF', goals: 1 },
        { name: 'Joker', position: 'CF', goals: 2 },
        { name: 'Alfa', position: 'AMF' },
        { name: 'Jamal', position: 'RWF', goals: 8, assists: 3 },
        { name: 'Abati', position: 'CB' },
        { name: 'Olaitan', position: 'RB' },
        { name: 'Uzo', position: 'GK' },
        { name: 'Guilit', position: 'DMF' },
        { name: 'Saliba', position: 'CB' },
        { name: 'Scott', position: 'AMF' },
        { name: 'Drake', position: 'CF', goals: 2 },
        { name: 'Opeyemi', position: 'RB' },
        { name: 'Marvelous', position: 'RWF' },
        { name: 'Umukoro', position: 'CF' },
        { name: 'Palmer', position: 'AMF' }
    ],
    'ARCHI': [
        { name: 'AY(HOC)', position: 'CF' },
        { name: 'Bolu', position: 'CB' }
    ],
    'URP': [
        { name: 'Habib', position: 'LM' },
        { name: 'Kemi', position: 'CM' },
        { name: 'Maryam', position: 'RW' }
    ],        
    'IDD': [
        { name: 'Grace', position: 'GK' },
        { name: 'Kingsley', position: 'CB' },
        { name: 'Tega', position: 'AMF' }
    ]
};

let playerRatings = loadPlayerRatingsFromStorage();


if (!playerRatings['Jamal']) {
    playerRatings['Jamal'] = {
        pace: 80,
        shooting: 75,
        passing: 78,
        dribbling: 100,
        defense: 60,
        physical: 75
    };
    savePlayerRatingsToStorage();
    savePlayerRatingsToStorage();
}


playerRatings['Caleb'] = Object.assign({}, playerRatings['Caleb'] || {}, {
    pace: 65,
    dribbling: 60,
    shooting: 80,
    passing: 70,
    defense: 100,
    physical: 90
});
savePlayerRatingsToStorage();

playerRatings['Fola'] = Object.assign({}, playerRatings['Fola'] || {}, {
    pace: 78,
    dribbling: 78,
    shooting: 76,
    passing: 75,
    defense: 70,
    physical: 75
});
savePlayerRatingsToStorage();

playerRatings['Joker'] = Object.assign({}, playerRatings['Joker'] || {}, {
    pace: 89,
    dribbling: 85,
    shooting: 78,
    passing: 70,
    defense: 60,
    physical: 80
});

playerRatings['Alfa'] = Object.assign({}, playerRatings['Alfa'] || {}, {
    pace: 77,
    dribbling: 76,
    shooting: 75,
    passing: 80,
    defense: 85,
    physical: 79
});

playerRatings['Abati'] = Object.assign({}, playerRatings['Abati'] || {}, {
    pace: 70,
    dribbling: 75,
    shooting: 75,
    passing: 75,
    defense: 80,
    physical: 78
});

playerRatings['Olaitan'] = Object.assign({}, playerRatings['Olaitan'] || {}, {
    pace: 78,
    dribbling: 75,
    shooting: 78,
    passing: 75,
    defense: 79,
    physical: 80
});

playerRatings['Guilit'] = Object.assign({}, playerRatings['Guilit'] || {}, {
    pace: 80,
    dribbling: 79,
    shooting: 80,
    passing: 85,
    defense: 85,
    physical: 79
});

playerRatings['Saliba'] = Object.assign({}, playerRatings['Saliba'] || {}, {
    pace: 77,
    dribbling: 77,
    shooting: 79,
    passing: 77,
    defense: 89,
    physical: 90
});

playerRatings['Scott'] = Object.assign({}, playerRatings['Scott'] || {}, {
    pace: 60,
    dribbling: 50,
    shooting: 50,
    passing: 45,
    defense: 65,
    physical: 50
});

playerRatings['Drake'] = Object.assign({}, playerRatings['Drake'] || {}, {
    pace: 70,
    dribbling: 78,
    shooting: 79,
    passing: 78,
    defense: 70,
    physical: 80
});

playerRatings['Opeyemi'] = Object.assign({}, playerRatings['Opeyemi'] || {}, {
    pace: 77,
    dribbling: 76,
    shooting: 75,
    passing: 80,
    defense: 85,
    physical: 80
});

playerRatings['Marvelous'] = Object.assign({}, playerRatings['Marvelous'] || {}, {
    pace: 85,
    dribbling: 75,
    shooting: 60,
    passing: 70,
    defense: 60,
    physical: 70
});

playerRatings['Opeyemi'] = Object.assign({}, playerRatings['Opeyemi'] || {}, {
    pace: 77,
    dribbling: 76,
    shooting: 75,
    passing: 80,
    defense: 85,
    physical: 80
});

playerRatings['Opeyemi'] = Object.assign({}, playerRatings['Opeyemi'] || {}, {
    pace: 77,
    dribbling: 76,
    shooting: 75,
    passing: 80,
    defense: 85,
    physical: 80
});

playerRatings['Opeyemi'] = Object.assign({}, playerRatings['Opeyemi'] || {}, {
    pace: 77,
    dribbling: 76,
    shooting: 75,
    passing: 80,
    defense: 85,
    physical: 80
});

playerRatings['Palmer'] = Object.assign({}, playerRatings['Palmer'] || {}, {
    pace: 80,
    dribbling: 95,
    shooting: 78,
    passing: 85,
    defense: 70,
    physical: 76
});

playerRatings['Umukoro'] = Object.assign({}, playerRatings['Umukoro'] || {}, {
    pace: 80,
    dribbling: 75,
    shooting: 90,
    passing: 79,
    defense: 80,
    physical: 85
});

playerRatings['AY(HOC)'] = Object.assign({}, playerRatings['AY(HOC)'] || {}, {
    pace: 95,
    dribbling: 100,
    shooting: 98,
    passing: 90,
    defense: 70,
    physical: 89
});

playerRatings['Bolu'] = Object.assign({}, playerRatings['Bolu'] || {}, {
    pace: 70,
    dribbling: 75,
    shooting: 97,
    passing: 80,
    defense: 89,
    physical: 89
});

playerRatings['Uzo'] = {
    'GK Diving': 75,
    'GK Handling': 78,
    'GK Kicking': 77,
    'GK Reflexes': 76,
    'GK Speed': 77,
    'GK Positioning': 78
};

savePlayerRatingsToStorage();

try {
    if (typeof renderMatches === 'function') {
        renderMatches();
    }
    if (currentMatchId && typeof renderMatchPage === 'function') {
        renderMatchPage();
    }
} catch (err) {

}


if (!playerRatings['Adeyemi']) {
    playerRatings['Adeyemi'] = {
        pace: 75,
        dribbling: 78,
        shooting: 70,
        passing: 75,
        defense: 100,
        physical: 85
    };
    savePlayerRatingsToStorage();
}


if (!playerRatings['Fawaz']) {
    playerRatings['Fawaz'] = {
pace: 70,
        dribbling: 78,
        shooting: 80,
        passing: 75,
        defense: 70,
        physical: 70
    };
    savePlayerRatingsToStorage();
}

function loadPlayerRatingsFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PLAYER_RATINGS);
        if (!raw) return {};
        return JSON.parse(raw);
    } catch (err) {
        console.warn('Could not load player ratings:', err);
    }
    return {};
}

function savePlayerRatingsToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY_PLAYER_RATINGS, JSON.stringify(playerRatings));
    } catch (err) {
        console.warn('Could not save player ratings:', err);
    }
}

function getPlayerOverallRating(name) {
    const ratings = playerRatings[name];
    if (!ratings) return null;
    const values = Object.values(ratings).map(v => Number(v)).filter(v => Number.isFinite(v) && v > 0);
    if (!values.length) return null;
    const total = values.reduce((sum, value) => sum + value, 0);
    const average = total / values.length;
    return Math.round(average);
}

function getPlayerRatingKeys(playerName) {
    const ratings = playerRatings[playerName] || {};
    const keys = Object.keys(ratings).filter(key => Number.isFinite(Number(ratings[key])) && ratings[key] !== '');
    return keys.length ? keys : ratingCategories;
}

function formatRatingLabel(category) {
    if (category.includes('GK ')) return category;
    return category.charAt(0).toUpperCase() + category.slice(1);
}

function getTeamPlayers(teamName) {
    return teamRosters[teamName] || [];
}

function getPlayerByName(name) {
    for (const [team, roster] of Object.entries(teamRosters)) {
        const player = roster.find(p => p.name === name);
        if (player) {
            return { ...player, team };
        }
    }
    return { name, team: 'Unknown', position: 'Unknown', goals: 0, assists: 0 };
}

function getPlayerDisplayName(player) {
    const overall = getPlayerOverallRating(player.name);
    return overall ? `${player.name} (${overall.toFixed(1)})` : player.name;
}

function buildPlayerMarkets(home, away) {
    const homePlayers = getTeamPlayers(home);
    const awayPlayers = getTeamPlayers(away);
    const homeMarkets = homePlayers.map((player, index) => ({
        id: `PTS_HOME_${index + 1}`,
        name: `Player to Score – ${player.name}`,
        description: `${player.name} to score anytime for ${home}`,
        odds: 2.1 + index * 0.05,
        team: home
    }));
    const awayMarkets = awayPlayers.map((player, index) => ({
        id: `PTS_AWAY_${index + 1}`,
        name: `Player to Score – ${player.name}`,
        description: `${player.name} to score anytime for ${away}`,
        odds: 2.15 + index * 0.05,
        team: away
    }));
    const sharedMarkets = [{
        id: 'FGS',
        name: 'First Goal Scorer',
        description: 'Pick who scores first',
        odds: 4.5,
        team: 'Shared'
    }];

    return {
        homePlayers,
        awayPlayers,
        homeMarkets,
        awayMarkets,
        sharedMarkets
    };
}

function renderMarketCard(m) {
    const isActive = selectedMarket === m.id ? 'active-market' : '';
    return `
        <button type="button" onclick="selectMatchMarket('${m.id}', ${m.odds}, '${m.name.replace(/'/g, "\\'")}')" class="market-card ${isActive} text-left p-4 rounded-3xl border border-slate-700 hover:border-sky-500 transition">
            <div class="flex items-center justify-between mb-3">
                <div>
                    <p class="font-semibold">${m.name}</p>
                    <p class="text-slate-400 text-sm">${m.description}</p>
                </div>
                <span class="text-sky-400 font-bold">${m.odds}</span>
            </div>
            <p class="text-slate-500 text-xs">Tap to select this market</p>
        </button>
    `;
}

function openMatchPage(matchId) {
    currentMatchId = matchId;
    selectedMarket = null;
    selectedOdds = null;
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('match-page').classList.remove('hidden');
    document.getElementById('place-bet-btn').disabled = true;
    document.getElementById('match-stake-input').value = '1';
    renderMatchPage();
}

function closeMatchPage() {
    document.getElementById('match-page').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    currentMatchId = null;
    selectedMarket = null;
    selectedOdds = null;
}

function renderMatchPage() {
    const match = matches.find(m => m.id === currentMatchId);
    if (!match) return;
    document.getElementById('match-page-title').innerText = `${match.home} vs ${match.away}`;
    const formattedDate = match.date || 'TBD';
    const formattedTime = match.time || 'TBD';
    const playerMarkets = buildPlayerMarkets(match.home, match.away);
    const finished = match.status === 'Finished';
    const statusLabel = finished ? `Final Result: ${match.result || 'Finished'}` : (match.status || 'Scheduled');
    const badgeClass = finished ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-900 text-slate-300';
    const markets = [
        { id: '1', name: 'Home Win', description: `${match.home} to win`, odds: match.odds[0] },
        { id: 'X', name: 'Draw', description: 'Match ends level', odds: match.odds[1] },
        { id: '2', name: 'Away Win', description: `${match.away} to win`, odds: match.odds[2] },
        { id: 'O2.5', name: 'Over 2.5 Goals', description: 'Three or more goals', odds: Math.max(1.8, parseFloat(((match.odds[0] + match.odds[2]) / 2).toFixed(2))) },
        { id: 'U2.5', name: 'Under 2.5 Goals', description: 'Two or fewer goals', odds: Math.max(1.6, parseFloat((Math.min(match.odds[0], match.odds[2]) / 1.4).toFixed(2))) },
        { id: 'BTTS', name: 'Both Teams To Score', description: 'Both sides score', odds: 1.85 },
        { id: 'DC1X', name: 'Double Chance 1X', description: 'Home win or draw', odds: 1.35 },
        { id: 'DCX2', name: 'Double Chance X2', description: 'Away win or draw', odds: 1.32 },
        { id: 'CS1', name: `${match.home} Clean Sheet`, description: `${match.home} keeps a clean sheet`, odds: 2.65 },
        { id: 'CS2', name: `${match.away} Clean Sheet`, description: `${match.away} keeps a clean sheet`, odds: 2.8 }
    ];

    const details = `
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <p class="text-slate-400 text-sm">${formattedDate} · ${formattedTime}</p>
                <h3 class="text-2xl font-bold mt-2">${match.home} vs ${match.away}</h3>
                <span class="inline-flex items-center mt-2 rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}">${statusLabel}</span>
            </div>
            <div class="rounded-3xl bg-slate-900 px-4 py-3 border border-slate-700 text-sm">
                <p class="font-semibold">1X2 odds</p>
                <div class="grid grid-cols-3 gap-2 mt-3 text-center text-slate-200">
                    <div class="rounded-2xl bg-slate-950 px-3 py-2">${match.odds[0]}</div>
                    <div class="rounded-2xl bg-slate-950 px-3 py-2">${match.odds[1]}</div>
                    <div class="rounded-2xl bg-slate-950 px-3 py-2">${match.odds[2]}</div>
                </div>
            </div>
        </div>
        <p class="text-slate-400 text-sm mt-4">Select a market below and set your stake to preview returns.</p>
    `;

    const rosterHtml = `
        <div class="grid gap-4 lg:grid-cols-2 mt-6 mb-6">
            <div class="glass p-4 rounded-3xl border border-slate-700">
                <h4 class="font-semibold text-white mb-3">${match.home} players</h4>
                <ul class="space-y-2 text-slate-300">
                    ${playerMarkets.homePlayers.map(player => `
                        <li class="flex items-center justify-between gap-3 rounded-2xl bg-slate-950/70 p-3">
                            <button type="button" onclick="openPlayerPage('${player.name.replace(/'/g, "\\'")}')" class="player-link text-left">
                                <span class="flex items-center gap-2"><span class="player-dot"></span>${getPlayerDisplayName(player)}</span>
                                <span class="text-slate-500 text-xs">${player.position}</span>
                            </button>
                        </li>
                    `).join('')}
                </ul>
            </div>
            <div class="glass p-4 rounded-3xl border border-slate-700">
                <h4 class="font-semibold text-white mb-3">${match.away} players</h4>
                <ul class="space-y-2 text-slate-300">
                    ${playerMarkets.awayPlayers.map(player => `
                        <li class="flex items-center justify-between gap-3 rounded-2xl bg-slate-950/70 p-3">
                            <button type="button" onclick="openPlayerPage('${player.name.replace(/'/g, "\\'")}')" class="player-link text-left">
                                <span class="flex items-center gap-2"><span class="player-dot"></span>${getPlayerDisplayName(player)}</span>
                                <span class="text-slate-500 text-xs">${player.position}</span>
                            </button>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;

    document.getElementById('match-details').innerHTML = details + rosterHtml;
    const placeBetBtn = document.getElementById('place-bet-btn');
    if (placeBetBtn) {
        placeBetBtn.disabled = finished || !selectedMarket;
        placeBetBtn.textContent = finished ? 'Match finished' : 'Place bet';
    }
    document.getElementById('market-list').innerHTML = [
        { title: 'Main markets', items: markets },
        { title: `${match.home} player bets`, items: playerMarkets.homeMarkets },
        { title: `${match.away} player bets`, items: playerMarkets.awayMarkets },
        { title: 'Special market', items: playerMarkets.sharedMarkets }
    ].map(section => `
        <div class="market-section">
            <div class="mb-3 flex items-center justify-between gap-3">
                <h4 class="font-semibold text-white">${section.title}</h4>
                <span class="text-slate-500 text-xs">${section.items.length} options</span>
            </div>
            <div class="grid gap-4">${section.items.map(renderMarketCard).join('')}</div>
        </div>
    `).join('');
    updateBetSlip();
}

function renderPlayerPage(playerName) {
    const player = getPlayerByName(playerName);
    const ratings = playerRatings[playerName] || {};
    const overall = getPlayerOverallRating(playerName);
    const goalText = player.goals ? `${player.goals} goals` : 'Goals not available';
    const assistText = player.assists ? `${player.assists} assists` : 'Assists not available';
    document.getElementById('player-page-title').innerText = `${player.name}${overall ? ` (${overall.toFixed(1)})` : ''}`;
    document.getElementById('player-page-subtitle').innerText = `${player.team || 'SVG'} • ${player.position}`;
    document.getElementById('player-page-stats').innerHTML = `
        <p class="text-slate-400 text-sm mb-2">${goalText}</p>
        <p class="text-slate-400 text-sm mb-2">${assistText}</p>
        <p class="text-slate-400 text-sm">Detailed rating page for ${player.name}.</p>
    `;
    document.getElementById('player-overall-rating').innerHTML = `
        <div class="text-slate-400 text-sm">Overall rating</div>
        <div class="text-4xl font-bold text-white mt-2">${overall ? overall.toFixed(1) : '--'}</div>
    `;
    const ratingKeys = getPlayerRatingKeys(playerName);
    document.getElementById('player-rating-form').innerHTML = ratingKeys.map(category => `
        <label class="block text-slate-300 text-sm mb-2">
            <span class="text-slate-400 uppercase tracking-widest text-[10px]">${formatRatingLabel(category)}</span>
            <input type="number" min="1" max="100" name="${category}" value="${ratings[category] || ''}" placeholder="1-100" readonly disabled
                class="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-sky-500 outline-none" />
        </label>
    `).join('');
    document.getElementById('player-rating-save-button').dataset.playerName = playerName;
    // Hide and disable the save button to prevent UI edits; ratings are managed externally
    const saveBtn = document.getElementById('player-rating-save-button');
    if (saveBtn) {
        saveBtn.style.display = 'none';
        saveBtn.disabled = true;
    }
}

function openPlayerPage(playerName) {
    currentMatchId = currentMatchId || null;
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('match-page').classList.add('hidden');
    document.getElementById('player-page').classList.remove('hidden');
    renderPlayerPage(playerName);
}

function closePlayerPage() {
    document.getElementById('player-page').classList.add('hidden');
    if (currentMatchId) {
        document.getElementById('match-page').classList.remove('hidden');
    } else {
        document.getElementById('dashboard').classList.remove('hidden');
    }
}

function savePlayerRating() {
    // Ratings are managed by the application owner. Prevent UI edits.
    alert('Player ratings are managed by admins; they cannot be edited through this UI. Provide ratings here and I will apply them.');
    return;
}

function selectMatchMarket(marketId, odds, marketName) {
    const match = matches.find(m => m.id === currentMatchId);
    if (match?.status === 'Finished') {
        return alert('This match is finished. You cannot place new bets on it.');
    }
    selectedMarket = marketId;
    selectedMarketName = marketName || marketId;
    selectedOdds = odds;
    document.getElementById('place-bet-btn').disabled = false;
    renderMatchPage();
}

function updateBetSlip() {
    const slip = document.getElementById('bet-slip');
    const stakeValue = parseInt(document.getElementById('match-stake-input').value, 10);
    const stake = Number.isNaN(stakeValue) || stakeValue < 1 ? 1 : stakeValue;
    const marketName = selectedMarketName || selectedMarket || 'Pick a market';
    const potential = selectedOdds ? (stake * selectedOdds).toFixed(2) : '0.00';
    const balanceAfter = Math.max(0, coins - stake);
    slip.innerHTML = `
        <div class="space-y-2">
            <p class="text-slate-400 text-sm">Selected market</p>
            <p class="font-semibold text-white">${marketName}</p>
        </div>
        <div class="space-y-2">
            <p class="text-slate-400 text-sm">Stake</p>
            <p class="font-semibold text-white">${stake} coins</p>
        </div>
        <div class="space-y-2">
            <p class="text-slate-400 text-sm">Potential return</p>
            <p class="font-semibold text-sky-400">${potential} coins</p>
        </div>
        <div class="space-y-2">
            <p class="text-slate-400 text-sm">Wallet after stake</p>
            <p class="font-semibold text-white">${balanceAfter} coins</p>
        </div>
    `;
}

function submitMatchBet() {
    const match = matches.find(m => m.id === currentMatchId);
    if (match?.status === 'Finished') {
        return alert('Match is finished. You cannot place a new bet.');
    }
    if (!currentMatchId || !selectedMarket || !selectedOdds) {
        return alert('Select a market and set a stake before placing your bet.');
    }
    const stakeValue = parseInt(document.getElementById('match-stake-input').value, 10);
    if (Number.isNaN(stakeValue) || stakeValue < 1) {
        return alert('Enter a valid stake amount.');
    }
    placeBet(currentMatchId, selectedMarket, stakeValue, selectedMarketName);
}

function handleLogin(e) {
    e.preventDefault();
    try {
        const user = document.getElementById('username').value;
        currentUser = user || 'Player';
        saveCurrentUserToStorage();
        renderUserInfo();
        
        // Check for admin account
        if (user.toLowerCase() === 'admin') {
            document.getElementById('admin-panel').classList.remove('hidden');
        }
        
            // Daily login bonus only for first time users
        const hasWallet = localStorage.getItem(STORAGE_KEY_COINS) !== null;
        if (!hasWallet) {
            coins += 5;
        }
        updateUI();
        saveWalletToStorage();
        
        document.getElementById('login-page').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        renderMatches();
        renderBetHistory();
        renderRankings();
        renderSettleMatchOptions();
    } catch (err) {
        handleScriptError(err);
    }
}

function updateUI() {
    const coinEl = document.getElementById('coin-balance');
    if (coinEl) coinEl.innerText = coins;
    renderUserInfo();
    const btn = document.getElementById('ad-btn');
    if (!btn) return;
    if (adsWatched >= 5) {
        btn.disabled = true;
        btn.innerText = 'Limit Reached';
        btn.classList.add('opacity-50');
    } else {
        btn.disabled = false;
        btn.classList.remove('opacity-50');
        const remaining = Math.max(0, 5 - adsWatched);
        btn.innerText = `Watch Ad (+2 Coins) · ${remaining} left`;
    }
}

function watchAd() {
    const btn = document.getElementById('ad-btn');
    if (!btn) return alert('Ad button not available.');
    if (adsWatched >= 5) return alert('Ad limit reached for today.');

    let seconds = 3;
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.classList.add('opacity-50');
    btn.innerText = `Watching... ${seconds}s`;

    const interval = setInterval(() => {
        seconds -= 1;
        if (seconds > 0) {
            btn.innerText = `Watching... ${seconds}s`;
            return;
        }
        clearInterval(interval);
        // Reward user
        coins += 2;
        adsWatched += 1;
        saveWalletToStorage();
        updateUI();
        alert('Nice! 2 coins added to your wallet.');
    }, 1000);
}


function createMatchId() {
    return `m-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function addMatch() {
    const homeKey = document.getElementById('new-match-left').value;
    const awayKey = document.getElementById('new-match-right').value;
    const dateValue = document.getElementById('new-match-date').value;
    const timeValue = document.getElementById('new-match-time').value;
    const oddsStr = document.getElementById('new-odds').value;
    if(!homeKey || !awayKey || !oddsStr || !dateValue || !timeValue) {
        return alert('Please select both teams, enter odds, and set date/time.');
    }
    if (homeKey === awayKey) {
        return alert('Choose two different teams.');
    }
    const oddsArray = oddsStr.split('|').map(n => parseFloat(n.trim()));
    if (oddsArray.length !== 3 || oddsArray.some(isNaN)) {
        return alert('Odds must be three numbers separated by |');
    }
    const teamNames = {
        fine_arts: 'Fine arts',
        esm: 'ESM',
        qts: 'QTS',
        evm: 'EVM',
        svg: 'SVG',
        archi: 'ARCHI',
        urp: 'URP',
        idd: 'IDD'
    };
    const formattedDate = new Date(`${dateValue}T${timeValue}`);
    const dateLabel = formattedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeLabel = formattedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    matches.push({
        id: createMatchId(),
        home: teamNames[homeKey],
        away: teamNames[awayKey],
        odds: oddsArray,
        status: 'Scheduled',
        date: dateLabel,
        time: timeLabel,
        datetime: `${dateValue}T${timeValue}`
    });
    saveMatchesToStorage();
    renderMatches();
    renderSettleMatchOptions();
    document.getElementById('new-odds').value = '';
    document.getElementById('new-match-date').value = '';
    document.getElementById('new-match-time').value = '';
}

function placeBet(matchId, market, stakeAmount, marketLabel) {
    const match = matches.find(m => m.id === matchId);
    if (!match) {
        return alert('Match not found.');
    }
    const marketNames = {
        '1': 'Home Win',
        'X': 'Draw',
        '2': 'Away Win',
        'O2.5': 'Over 2.5 Goals',
        'U2.5': 'Under 2.5 Goals',
        'BTTS': 'Both Teams To Score',
        'DC1X': 'Double Chance 1X',
        'DCX2': 'Double Chance X2',
        'CS1': `${match.home} Clean Sheet`,
        'CS2': `${match.away} Clean Sheet`,
        'FGS': 'First Goal Scorer'
    };
    const marketName = marketLabel || marketNames[market] || market;
    let stake = stakeAmount;
    if (typeof stake === 'undefined') {
        const stakeInput = prompt(`Enter coins to stake on ${marketName} for ${match.home} vs ${match.away}:`, '1');
        if (stakeInput === null) return;
        stake = parseInt(stakeInput.trim(), 10);
    }
    if (Number.isNaN(stake) || stake < 1) {
        return alert('Enter a valid coin amount.');
    }
    if (stake > coins) {
        return alert('Not enough coins in your wallet.');
    }
    const oddsValue = market === '1'
        ? match.odds[0]
        : market === 'X'
            ? match.odds[1]
            : market === '2'
                ? match.odds[2]
                : market === 'O2.5'
                    ? parseFloat(Math.max(1.8, ((match.odds[0] + match.odds[2]) / 2).toFixed(2)))
                    : market === 'U2.5'
                        ? parseFloat(Math.max(1.6, (Math.min(match.odds[0], match.odds[2]) / 1.4).toFixed(2)))
                        : market === 'BTTS'
                            ? 1.85
                            : market === 'DC1X'
                                ? 1.35
                                : market === 'DCX2'
                                    ? 1.32
                                    : market === 'CS1'
                                        ? 2.65
                                        : market === 'CS2'
                                            ? 2.8
                                            : market === 'FGS'
                                                ? 4.5
                                                : selectedOdds || 1.85;
    const bet = {
        id: `b-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        matchId: match.id,
        home: match.home,
        away: match.away,
        user: currentUser,
        market,
        marketName,
        stake,
        odds: oddsValue,
        points: Math.round(stake * oddsValue),
        date: match.date || 'TBD',
        time: match.time || 'TBD',
        placedAt: new Date().toISOString(),
        status: 'Placed'
    };
    coins -= stake;
    betHistory.unshift(bet);
    saveBetHistoryToStorage();
    saveWalletToStorage();
    updateUI();
    renderBetHistory();
    renderRankings();
    closeMatchPage();
    alert(`Bet placed: ${stake} coins on ${marketName} (${oddsValue}).`);
}

function getUserPoints(username) {
    return betHistory.reduce((sum, bet) => {
        return sum + ((bet.user === username ? bet.points : 0) || 0);
    }, 0);
}

function calculateLeaderboardEntries() {
    const samplePlayers = [
        { name: 'Campus King', points: 520 },
        { name: 'MVP Star', points: 470 },
        { name: 'Stadium Ace', points: 430 },
        { name: 'BetMaster', points: 390 },
        { name: 'Finalist', points: 360 }
    ];
    const youEntry = { name: currentUser || 'You', points: getUserPoints(currentUser) };
    const allEntries = samplePlayers.filter(player => player.name !== youEntry.name).concat(youEntry);
    allEntries.sort((a, b) => b.points - a.points);
    return {
        top5: allEntries.slice(0, 5),
        allEntries,
        yourRank: allEntries.findIndex(entry => entry.name === youEntry.name) + 1,
        totalParticipants: allEntries.length
    };
}

function renderRankings() {
    const leaderboardList = document.getElementById('leaderboard-list');
    const currentRankEl = document.getElementById('current-rank');
    const participantCountEl = document.getElementById('participant-count');
    if (!leaderboardList || !currentRankEl || !participantCountEl) return;

    const { top5, yourRank, totalParticipants } = calculateLeaderboardEntries();
    currentRankEl.innerText = yourRank > 0 ? `#${yourRank}` : '#--';
    participantCountEl.innerText = totalParticipants;

    leaderboardList.innerHTML = top5.map((entry, index) => `
        <div class="glass p-4 rounded-3xl border border-slate-700 flex items-center justify-between">
            <div>
                <p class="text-sm text-slate-400">${index + 1}. ${entry.name === currentUser ? 'You' : entry.name}</p>
                <p class="text-xs text-slate-500">${entry.points} points</p>
            </div>
            <span class="font-bold ${entry.name === currentUser ? 'text-sky-400' : 'text-white'}">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}</span>
        </div>
    `).join('');
    renderFullRankings();
}

function renderFullRankings() {
    const panel = document.getElementById('full-ranking-panel');
    const fullList = document.getElementById('full-leaderboard-list');
    if (!panel || !fullList) return;

    const { allEntries } = calculateLeaderboardEntries();
    fullList.innerHTML = allEntries.map((entry, index) => `
        <div class="glass p-4 rounded-3xl border border-slate-700 flex items-center justify-between">
            <div>
                <p class="text-sm text-slate-400">${index + 1}. ${entry.name === currentUser ? 'You' : entry.name}</p>
                <p class="text-xs text-slate-500">${entry.points} points</p>
            </div>
            <span class="font-bold ${entry.name === currentUser ? 'text-sky-400' : 'text-white'}">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}</span>
        </div>
    `).join('');
}

function toggleFullRankings() {
    const panel = document.getElementById('full-ranking-panel');
    if (!panel) return;
    panel.classList.toggle('hidden');
}

function logout() {
    location.reload();
}

// --- Team logos handling ---
function getTeamKeyFromName(name) {
    if (!name) return null;
    const n = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const map = {
        'finearts':'fine_arts',
        'esm':'esm',
        'qts':'qts',
        'evm':'evm',
        'svg':'svg',
        'archi':'archi',
        'urp':'urp',
        'idd':'idd'
    };
    return map[n] || null;
}

const LOGO_FILE_MAP = {
    fine_arts: 'fineart.webp',
    esm: 'ESM.webp',
    qts: 'QTS.webp',
    evm: 'EVM.jpg',
    svg: 'SVG.jpg',
    archi: 'ARCHI.webp',
    urp: 'URP.jpg',
    idd: 'IDD.webp'
};

function getLogoSrcPaths(name) {
    const key = getTeamKeyFromName(name);
    if (!key) return [];

    const mapped = LOGO_FILE_MAP[key];
    if (!mapped) return [];

    const dirs = ['assets/logos', 'asset/logo', 'assets/logo', 'asset/logos'];
    return dirs.map(dir => `${dir}/${mapped}`);
}

function getMatchDateTime(match) {
    if (match.datetime) {
        const parsed = new Date(match.datetime);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }
    const parsed = new Date(`${match.date || ''} ${match.time || ''}`);
    return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function renderBetHistory() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    if (!betHistory.length) {
        historyList.innerHTML = '<p class="text-slate-400">No active bets yet. Place a bet to start building your history.</p>';
        return;
    }
    historyList.innerHTML = betHistory.map(bet => {
        const placed = new Date(bet.placedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        return `
            <div class="bg-slate-900 p-4 rounded-2xl border border-slate-700">
                <div class="flex justify-between items-start gap-3 mb-2">
                    <div>
                        <p class="font-semibold">${bet.home} vs ${bet.away}</p>
                        <p class="text-xs text-slate-500">${bet.date} · ${bet.time}</p>
                    </div>
                    <span class="text-xs uppercase tracking-widest text-sky-400">${bet.market}</span>
                </div>
                <div class="grid grid-cols-2 gap-3 text-sm text-slate-300">
                    <div>Stake: <span class="text-white">${bet.stake}</span></div>
                    <div>Odds: <span class="text-sky-400">${bet.odds}</span></div>
                    <div>Status: <span class="text-white">${bet.status}</span></div>
                    <div>Placed: <span class="text-slate-400">${placed}</span></div>
                </div>
            </div>
        `;
    }).join('');
}

// Enhance renderMatches to include logos
function renderMatches() {
    const container = document.getElementById('match-container');
    container.innerHTML = matches.slice().sort((a, b) => getMatchDateTime(a) - getMatchDateTime(b)).map((m) => {
        const left = m.home || (m.teams ? m.teams.split(/\s+vs\s+/i)[0].trim() : '');
        const right = m.away || (m.teams ? m.teams.split(/\s+vs\s+/i)[1].trim() : '');
        const leftPaths = getLogoSrcPaths(left);
        const rightPaths = getLogoSrcPaths(right);
        const leftLogo = leftPaths[0] || null;
        const leftFallback = leftPaths[1] || null;
        const rightLogo = rightPaths[0] || null;
        const rightFallback = rightPaths[1] || null;
        return `
        <div onclick="openMatchPage('${m.id}')" class="glass p-6 rounded-2xl hover:border-sky-500/50 transition cursor-pointer border border-slate-800">
            <div class="flex items-center justify-between mb-3 text-slate-400 text-sm">
                <span>${m.date || 'TBD'}</span>
                <span>${m.time || 'TBD'}</span>
            </div>
            <div class="mb-3">
                <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${m.status === 'Finished' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-900 text-slate-300'}">
                    ${m.status === 'Finished' ? `Final: ${m.result || 'Ended'}` : m.status || 'Scheduled'}
                </span>
            </div>
            <p class="text-xs text-sky-400 font-bold mb-2 uppercase tracking-widest">Deans Cup</p>
            <div class="grid gap-3 mb-4">
                <div class="flex items-center gap-3">
                    ${ leftLogo ? `<img src="${leftLogo}" ${leftFallback ? `onerror="this.onerror=null;this.src='${leftFallback}'"` : ''} alt="${left} logo" class="w-10 h-10 rounded-full object-cover">` : '' }
                    <span class="text-lg font-bold">${left}</span>
                </div>
                ${ right ? `<div class="flex items-center gap-3">
                    ${ rightLogo ? `<img src="${rightLogo}" ${rightFallback ? `onerror="this.onerror=null;this.src='${rightFallback}'"` : ''} alt="${right} logo" class="w-10 h-10 rounded-full object-cover">` : '' }
                    <span class="text-lg font-bold">${right}</span>
                </div>` : '' }
            </div>
            <div class="grid gap-2 sm:grid-cols-3">
                <button type="button" onclick="openMatchPage('${m.id}')" class="bg-slate-900 py-2 rounded-lg text-sm border border-slate-700 hover:border-sky-500">View markets</button>
                <button type="button" onclick="openMatchPage('${m.id}')" class="bg-slate-900 py-2 rounded-lg text-sm border border-slate-700 hover:border-sky-500">More bets</button>
                <button type="button" onclick="openMatchPage('${m.id}')" class="bg-slate-900 py-2 rounded-lg text-sm border border-slate-700 hover:border-sky-500">Open match</button>
            </div>
        </div>
    `}).join('');
}
function watchAdReward() {
  // 1. Retrieve current coins (default to 0 if not set)
  let currentCoins = parseInt(localStorage.getItem('userCoins')) || 0;
  
  // 2. Add 10 coins
  currentCoins += 10;
  
  // 3. Save new total back to localStorage
  localStorage.setItem('userCoins', currentCoins);
  
  // 4. Update the coin display element on your page
  const coinDisplay = document.getElementById('coin-balance');
  if (coinDisplay) {
    coinDisplay.textContent = currentCoins;
  }
  
  // 5. Alert or notify the user
  alert('You earned +10 Coins for watching an ad!');
                                                }
        
