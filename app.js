// ==========================================================================
// TEBAK SKOR V2 - LOGIKA MULTI-PAGE TERINTEGRASI
// ==========================================================================

// 1. SUPABASE CONFIGURATION
const SUPABASE_URL = "https://xujkqkoorqlwsgsthkak.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1amtxa29vcnFsd3Nnc3Roa2FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMjIxMTksImV4cCI6MjA5OTU5ODExOX0.H15huMTua2oPNAtMd1aqyFzfCjukTlgnIJGLXRIidDE";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// STATE VARIABLES
let deviceId = "";
let pageId = ""; // 'page-participant', 'page-scoreboard', 'page-admin'
let activeMatches = [];
let selectedMatchId = null;
let currentMatchData = null;
let predictionsList = [];
let adminPin = "";
let outcomeChartInstance = null;
let autoSyncTimer = null;
let countdownTimer = null;

// INIT APPLICATION FOR SPECIFIC PAGE
document.addEventListener("DOMContentLoaded", () => {
    initDeviceId();
    pageId = document.body.id;
    
    // Load config sessions if admin
    if (pageId === 'page-admin') {
        loadSavedAdminSession();
    }

    // Initial fetch matches, then initialize page modules
    fetchMatches().then(() => {
        initPageModule();
    });

    // Auto-refresh loop (every 5 seconds)
    setInterval(() => {
        refreshActivePageData();
    }, 5000);
});

// ==========================================================================
// INITIALIZATION & ROUTING BY BODY ID
// ==========================================================================
function initDeviceId() {
    deviceId = localStorage.getItem("tebak_skor_v2_device_id");
    if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
        localStorage.setItem("tebak_skor_v2_device_id", deviceId);
    }
}

function initPageModule() {
    if (pageId === 'page-participant') {
        syncDropdown('match-select-participant');
        onMatchChangedParticipant();
    } else if (pageId === 'page-scoreboard') {
        syncDropdown('match-select-public');
        onMatchChangedPublic();
    } else if (pageId === 'page-admin') {
        checkAdminAccess();
    }
}

function syncDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    dropdown.innerHTML = "";
    if (activeMatches.length === 0) {
        dropdown.innerHTML = `<option value="">Tidak ada pertandingan tersedia</option>`;
        return;
    }

    activeMatches.forEach(match => {
        const dateStr = new Date(match.kickoff_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const option = document.createElement("option");
        option.value = match.id;
        option.textContent = `${match.team_a_name} vs ${match.team_b_name} (${match.status} - ${dateStr})`;
        if (match.id === selectedMatchId) {
            option.selected = true;
        }
        dropdown.appendChild(option);
    });

    if (!selectedMatchId && activeMatches.length > 0) {
        selectedMatchId = activeMatches[0].id;
        dropdown.value = selectedMatchId;
    }
}

// ==========================================================================
// DATABASE FETCHERS
// ==========================================================================
async function fetchMatches() {
    try {
        const { data, error } = await supabaseClient
            .from("tebak_skor_v2_matches")
            .select("*")
            .order("kickoff_time", { ascending: true });
            
        if (error) throw error;
        
        activeMatches = data || [];
        if (activeMatches.length > 0 && !selectedMatchId) {
            selectedMatchId = activeMatches[0].id;
        }
    } catch (err) {
        console.error("Gagal mengambil data pertandingan:", err.message);
    }
}

async function fetchMatchPredictions(matchId) {
    if (!matchId) return [];
    try {
        const { data, error } = await supabaseClient
            .from("tebak_skor_v2_predictions")
            .select("*")
            .eq("match_id", matchId)
            .order("created_at", { ascending: true });
            
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error("Gagal mengambil data tebakan:", err.message);
        return [];
    }
}

async function refreshActivePageData() {
    await fetchMatches();
    if (!selectedMatchId && activeMatches.length > 0) {
        selectedMatchId = activeMatches[0].id;
    }
    
    if (selectedMatchId) {
        currentMatchData = activeMatches.find(m => m.id == selectedMatchId);
        predictionsList = await fetchMatchPredictions(selectedMatchId);
        
        if (pageId === 'page-participant') {
            renderParticipantView();
        } else if (pageId === 'page-scoreboard') {
            renderPublicView();
        } else if (pageId === 'page-admin' && adminPin) {
            renderAdminDashboard();
        }
    }
}

// ==========================================================================
// PAGE 1: PARTICIPANT LOGIC (index.html)
// ==========================================================================
async function onMatchChangedParticipant() {
    const dropdown = document.getElementById("match-select-participant");
    if (dropdown && dropdown.value) {
        selectedMatchId = parseInt(dropdown.value);
    }
    await refreshActivePageData();
}

function renderParticipantView() {
    if (!currentMatchData) return;

    // 1. Render Team Names & API Logos
    document.getElementById("p-home-name").textContent = currentMatchData.team_a_name;
    document.getElementById("p-away-name").textContent = currentMatchData.team_b_name;
    
    document.getElementById("guess-label-home").textContent = currentMatchData.team_a_name;
    document.getElementById("guess-label-away").textContent = currentMatchData.team_b_name;

    // Render image logos from API directly
    document.getElementById("p-home-logo").src = currentMatchData.team_a_logo || "https://placehold.co/100x100?text=Home";
    document.getElementById("p-away-logo").src = currentMatchData.team_b_logo || "https://placehold.co/100x100?text=Away";

    // 2. Match Status Badges
    const status = currentMatchData.status;
    const statusBadge = document.getElementById("p-match-status-badge");
    const statusText = document.getElementById("p-match-status");
    
    statusText.textContent = status;
    statusBadge.className = `live-status-pill ${status}`;

    const scoreLiveEl = document.getElementById("p-match-score-live");
    const elapsedEl = document.getElementById("p-match-elapsed");
    const vsEl = document.getElementById("p-match-vs");
    const countdownEl = document.getElementById("p-kickoff-countdown");

    if (status === 'LIVE' || status === 'FINISHED') {
        scoreLiveEl.style.display = "block";
        scoreLiveEl.textContent = `${currentMatchData.score_a} - ${currentMatchData.score_b}`;
        vsEl.style.display = "none";
        countdownEl.style.display = "none";
        
        if (status === 'LIVE') {
            elapsedEl.style.display = "block";
            elapsedEl.textContent = `${currentMatchData.elapsed_time}'`;
        } else {
            elapsedEl.style.display = "none";
        }
        
        if (countdownTimer) clearInterval(countdownTimer);
    } else {
        // PENDING status
        scoreLiveEl.style.display = "none";
        elapsedEl.style.display = "none";
        vsEl.style.display = "block";
        countdownEl.style.display = "block";
        
        startKickoffCountdown(currentMatchData.kickoff_time, "p-kickoff-countdown");
    }

    // 3. Render submission/result state cards
    const formCard = document.getElementById("container-prediction-form");
    const successCard = document.getElementById("container-prediction-success");
    const lockedCard = document.getElementById("container-match-locked");

    const isKickoffPassed = new Date() >= new Date(currentMatchData.kickoff_time);
    const isLocked = status !== 'PENDING' || isKickoffPassed;

    const votedData = getVotedPrediction(selectedMatchId);

    if (votedData) {
        formCard.style.display = "none";
        lockedCard.style.display = "none";
        successCard.style.display = "block";
        
        document.getElementById("receipt-name").textContent = votedData.participant_name;
        document.getElementById("receipt-match").textContent = `${currentMatchData.team_a_name} vs ${currentMatchData.team_b_name}`;
        document.getElementById("receipt-score").textContent = `${votedData.guess_a} : ${votedData.guess_b}`;
        document.getElementById("receipt-time").textContent = new Date(votedData.created_at).toLocaleString('id-ID');
        document.getElementById("receipt-id").textContent = votedData.id;
    } else if (isLocked) {
        formCard.style.display = "none";
        successCard.style.display = "none";
        lockedCard.style.display = "block";
    } else {
        lockedCard.style.display = "none";
        successCard.style.display = "none";
        formCard.style.display = "block";
    }
}

function adjustScore(inputId, delta) {
    const input = document.getElementById(inputId);
    if (!input) return;
    let val = parseInt(input.value) || 0;
    val += delta;
    if (val < 0) val = 0;
    if (val > 99) val = 99;
    input.value = val;
}

function startKickoffCountdown(kickoffTime, elementId) {
    if (countdownTimer) clearInterval(countdownTimer);
    
    const targetDate = new Date(kickoffTime).getTime();
    
    function updateTimer() {
        const now = new Date().getTime();
        const distance = targetDate - now;
        const el = document.getElementById(elementId);
        
        if (!el) return;

        if (distance < 0) {
            el.textContent = "PERTANDINGAN DIMULAI";
            clearInterval(countdownTimer);
            refreshActivePageData();
            return;
        }

        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        const pad = (n) => n.toString().padStart(2, '0');
        el.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    
    updateTimer();
    countdownTimer = setInterval(updateTimer, 1000);
}

// Submit Prediction
async function submitPrediction(e) {
    e.preventDefault();
    if (!currentMatchData || !selectedMatchId) return;

    const nickname = document.getElementById("input-nickname").value.trim();
    const guessA = parseInt(document.getElementById("input-guess-home").value);
    const guessB = parseInt(document.getElementById("input-guess-away").value);

    if (!nickname) {
        alert("Nama tidak boleh kosong!");
        return;
    }

    if (currentMatchData.status !== 'PENDING' || new Date() >= new Date(currentMatchData.kickoff_time)) {
        alert("Pendaftaran tebakan sudah ditutup untuk pertandingan ini!");
        return;
    }

    const btn = document.getElementById("btn-submit-prediction");
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Mengirim...`;

    try {
        const { data, error } = await supabaseClient
            .from("tebak_skor_v2_predictions")
            .insert([{
                match_id: selectedMatchId,
                participant_name: nickname,
                guess_a: guessA,
                guess_b: guessB,
                device_id: deviceId
            }])
            .select();

        if (error) {
            if (error.code === '23505') {
                throw new Error("Nama panggilan ini sudah digunakan. Harap gunakan nama lain!");
            }
            throw error;
        }

        if (data && data.length > 0) {
            saveVotedPrediction(selectedMatchId, data[0]);
            alert("Tebakan Anda berhasil dikirim!");
            refreshActivePageData();
        }
    } catch (err) {
        alert("Gagal mengirim tebakan: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Kirim Prediksi Skor`;
    }
}

function saveVotedPrediction(matchId, predictionData) {
    const key = `tebak_skor_v2_voted_${matchId}`;
    localStorage.setItem(key, JSON.stringify(predictionData));
}

function getVotedPrediction(matchId) {
    const key = `tebak_skor_v2_voted_${matchId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

function sharePrediction() {
    const votedData = getVotedPrediction(selectedMatchId);
    if (!votedData || !currentMatchData) return;

    const text = `Saya sudah menebak skor pertandingan ${currentMatchData.team_a_name} vs ${currentMatchData.team_b_name} di Event Nobar! ⚽🏆\nTebakan Saya: ${votedData.guess_a} - ${votedData.guess_b}\nIkutan tebak skor sekarang!`;
    
    navigator.clipboard.writeText(text).then(() => {
        alert("Salinan resi berhasil disalin ke clipboard! Siap dibagikan.");
    }).catch(err => {
        console.error("Gagal menyalin resi:", err);
    });
}

// ==========================================================================
// PAGE 2: PUBLIC SCREEN LOGIC (scoreboard.html)
// ==========================================================================
async function onMatchChangedPublic() {
    const dropdown = document.getElementById("match-select-public");
    if (dropdown && dropdown.value) {
        selectedMatchId = parseInt(dropdown.value);
    }
    await refreshActivePageData();
}

function renderPublicView() {
    if (!currentMatchData) return;

    // 1. Render Jumbotron
    document.getElementById("screen-home-name").textContent = currentMatchData.team_a_name.toUpperCase();
    document.getElementById("screen-away-name").textContent = currentMatchData.team_b_name.toUpperCase();
    
    document.getElementById("screen-score-home").textContent = currentMatchData.score_a;
    document.getElementById("screen-score-away").textContent = currentMatchData.score_b;

    // Render image logos from API directly
    document.getElementById("screen-home-logo").src = currentMatchData.team_a_logo || "https://placehold.co/100x100?text=Home";
    document.getElementById("screen-away-logo").src = currentMatchData.team_b_logo || "https://placehold.co/100x100?text=Away";

    const status = currentMatchData.status;
    document.getElementById("screen-match-status").textContent = status;
    document.getElementById("screen-status-badge").className = `jumbo-status-badge ${status}`;

    const countdownContainer = document.getElementById("screen-countdown-container");
    const timeContainer = document.getElementById("screen-time-container");

    if (status === 'LIVE' || status === 'FINISHED') {
        countdownContainer.style.display = "none";
        timeContainer.style.display = "block";
        document.getElementById("screen-elapsed-time").textContent = `${currentMatchData.elapsed_time}'`;
    } else {
        timeContainer.style.display = "none";
        countdownContainer.style.display = "block";
        startKickoffCountdown(currentMatchData.kickoff_time, "screen-kickoff-countdown");
    }

    // 2. Process Leaderboard sorting
    // Pure 2-factor calculation:
    // Factor 1: Closest goal difference error (Manhattan distance) -> Ascending
    // Factor 2: Submission timestamp (created_at) -> Ascending (tie-breaker)
    const scoreA = currentMatchData.score_a;
    const scoreB = currentMatchData.score_b;

    const scoredPredictions = predictionsList.map(pred => {
        const error = Math.abs(pred.guess_a - scoreA) + Math.abs(pred.guess_b - scoreB);
        
        let matchType = ""; // "exact", "outcome", or ""
        if (error === 0) {
            matchType = "exact";
        } else {
            const actualOutcome = Math.sign(scoreA - scoreB);
            const guessOutcome = Math.sign(pred.guess_a - pred.guess_b);
            if (actualOutcome === guessOutcome) {
                matchType = "outcome";
            }
        }

        return { ...pred, error, matchType };
    });

    // Sort predictions: lower error first, if equal error, older timestamp first
    scoredPredictions.sort((a, b) => {
        if (a.error !== b.error) {
            return a.error - b.error;
        }
        return new Date(a.created_at) - new Date(b.created_at);
    });

    // 3. Render Leaderboard Table
    document.getElementById("screen-total-predictions").textContent = `${scoredPredictions.length} Tebakan`;
    
    const listBody = document.getElementById("leaderboard-list");
    listBody.innerHTML = "";

    if (scoredPredictions.length === 0) {
        listBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Belum ada data tebakan.</td></tr>`;
    } else {
        scoredPredictions.forEach((pred, index) => {
            const rank = index + 1;
            let rankClass = "rank-other";
            let trophy = "";
            if (rank === 1) { rankClass = "rank-1"; trophy = `<i class="fa-solid fa-crown text-gold"></i> `; }
            else if (rank === 2) { rankClass = "rank-2"; }
            else if (rank === 3) { rankClass = "rank-3"; }

            let highlightClass = "";
            if (status !== 'PENDING') {
                if (pred.matchType === 'exact') highlightClass = "match-exact";
                else if (pred.matchType === 'outcome') highlightClass = "match-outcome";
            }

            const tr = document.createElement("tr");
            if (highlightClass) tr.className = highlightClass;

            const timeStr = new Date(pred.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            tr.innerHTML = `
                <td><span class="rank-badge ${rankClass}">${rank}</span></td>
                <td>
                    <div class="participant-name-cell">
                        ${trophy}
                        <span>${escapeHtml(pred.participant_name)}</span>
                    </div>
                </td>
                <td><span class="guess-score-badge">${pred.guess_a} - ${pred.guess_b}</span></td>
                <td>
                    <span class="distance-val ${pred.error === 0 ? 'exact' : (pred.matchType === 'outcome' ? 'close' : '')}">
                        ${status === 'PENDING' ? '-' : (pred.error === 0 ? 'Tepat' : `+${pred.error}`)}
                    </span>
                </td>
                <td class="text-muted text-xs">${timeStr}</td>
            `;
            listBody.appendChild(tr);
        });
    }

    // 4. Render Analytics and Statistics Charts
    renderCharts(scoredPredictions);

    // 5. Update Activity Feed Ticker
    renderActivityTicker(predictionsList);
}

function renderCharts(scoredPreds) {
    let homeWins = 0;
    let draws = 0;
    let awayWins = 0;
    const total = scoredPreds.length;

    scoredPreds.forEach(p => {
        if (p.guess_a > p.guess_b) homeWins++;
        else if (p.guess_a < p.guess_b) awayWins++;
        else draws++;
    });

    const homePct = total > 0 ? Math.round((homeWins / total) * 100) : 0;
    const drawPct = total > 0 ? Math.round((draws / total) * 100) : 0;
    const awayPct = total > 0 ? Math.round((awayWins / total) * 100) : 0;

    document.getElementById("stat-home-pct").textContent = `${homePct}%`;
    document.getElementById("stat-draw-pct").textContent = `${drawPct}%`;
    document.getElementById("stat-away-pct").textContent = `${awayPct}%`;

    const ctx = document.getElementById("outcome-chart");
    if (!ctx) return;

    if (outcomeChartInstance) {
        outcomeChartInstance.data.datasets[0].data = [homeWins, draws, awayWins];
        outcomeChartInstance.update();
    } else {
        outcomeChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [`${currentMatchData.team_a_name}`, 'Seri (Draw)', `${currentMatchData.team_b_name}`],
                datasets: [{
                    data: [homeWins, draws, awayWins],
                    backgroundColor: ['#10b981', '#27272a', '#f59e0b'],
                    borderColor: '#18181b',
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#a1a1aa',
                            font: { family: 'Outfit', size: 11 }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }
}

let tickerIndex = 0;
function renderActivityTicker(preds) {
    const track = document.getElementById("ticker-track");
    if (!track) return;

    if (preds.length === 0) {
        track.innerHTML = `<div class="ticker-item">Menunggu tebakan masuk...</div>`;
        return;
    }

    const sortedRecent = [...preds].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const recent = sortedRecent[tickerIndex % sortedRecent.length];
    tickerIndex++;

    const elapsedText = getRelativeTime(recent.created_at);
    track.innerHTML = `
        <div class="ticker-item">
            <strong>${escapeHtml(recent.participant_name)}</strong> menebak 
            <span class="text-neon-gold bold">${recent.guess_a} - ${recent.guess_b}</span> 
            <span class="text-muted text-xs">(${elapsedText})</span>
        </div>
    `;
}

// ==========================================================================
// PAGE 3: ADMIN LOGIC (admin.html)
// ==========================================================================
function loadSavedAdminSession() {
    const savedPin = sessionStorage.getItem("tebak_skor_v2_admin_pin");
    const savedApiKey = localStorage.getItem("tebak_skor_v2_api_key");
    
    if (savedPin) {
        adminPin = savedPin;
    }
    if (savedApiKey) {
        document.getElementById("input-api-key").value = savedApiKey;
    }
}

function checkAdminAccess() {
    const loginCard = document.getElementById("admin-login-card");
    const dashboard = document.getElementById("admin-dashboard");

    if (adminPin === "1234") {
        loginCard.style.display = "none";
        dashboard.style.display = "block";
        syncDropdown('match-select-admin');
        onMatchChangedAdmin();
    } else {
        loginCard.style.display = "block";
        dashboard.style.display = "none";
    }
}

function loginAdmin(e) {
    e.preventDefault();
    const pin = document.getElementById("input-admin-pin").value;
    const errorMsg = document.getElementById("admin-login-error");

    if (pin === "1234") {
        adminPin = pin;
        sessionStorage.setItem("tebak_skor_v2_admin_pin", pin);
        errorMsg.style.display = "none";
        checkAdminAccess();
    } else {
        errorMsg.style.display = "block";
        document.getElementById("input-admin-pin").value = "";
    }
}

function logoutAdmin() {
    adminPin = "";
    sessionStorage.removeItem("tebak_skor_v2_admin_pin");
    if (autoSyncTimer) clearInterval(autoSyncTimer);
    checkAdminAccess();
}

async function onMatchChangedAdmin() {
    const dropdown = document.getElementById("match-select-admin");
    if (dropdown && dropdown.value) {
        selectedMatchId = parseInt(dropdown.value);
    }
    await refreshActivePageData();
}

function renderAdminDashboard() {
    const emptyPanel = document.getElementById("admin-match-manager-empty");
    const controlPanel = document.getElementById("admin-match-manager-panel");

    if (!currentMatchData) {
        emptyPanel.style.display = "block";
        controlPanel.style.display = "none";
        return;
    }

    emptyPanel.style.display = "none";
    controlPanel.style.display = "block";

    // Populate Modifiers Info
    document.getElementById("adm-team-a-name").textContent = currentMatchData.team_a_name;
    document.getElementById("adm-team-b-name").textContent = currentMatchData.team_b_name;
    
    // Render team logo images from API directly
    document.getElementById("adm-team-a-logo").src = currentMatchData.team_a_logo || "https://placehold.co/100x100?text=Home";
    document.getElementById("adm-team-b-logo").src = currentMatchData.team_b_logo || "https://placehold.co/100x100?text=Away";

    document.getElementById("adm-score-a").value = currentMatchData.score_a;
    document.getElementById("adm-score-b").value = currentMatchData.score_b;
    document.getElementById("adm-match-elapsed").value = currentMatchData.elapsed_time;
    document.getElementById("adm-match-status").value = currentMatchData.status;

    // API Sync display configuration
    const apiSyncContainer = document.getElementById("adm-api-sync-container");
    if (currentMatchData.api_fixture_id) {
        apiSyncContainer.style.display = "block";
        document.getElementById("adm-fixture-id-val").textContent = currentMatchData.api_fixture_id;
    } else {
        apiSyncContainer.style.display = "none";
        if (autoSyncTimer) {
            clearInterval(autoSyncTimer);
            document.getElementById("check-auto-sync").checked = false;
        }
    }

    // Render moderations
    renderAdminPredictions();
}

function adjustAdminScore(inputId, delta) {
    const input = document.getElementById(inputId);
    if (!input) return;
    let val = parseInt(input.value) || 0;
    val += delta;
    if (val < 0) val = 0;
    input.value = val;
}

// CREATE MATCH (via secure RPC)
async function createMatch(e) {
    e.preventDefault();
    if (!adminPin) return;

    const teamA = document.getElementById("input-match-teama").value.trim();
    const logoA = document.getElementById("input-match-logoa").value.trim();
    const teamB = document.getElementById("input-match-teamb").value.trim();
    const logoB = document.getElementById("input-match-logob").value.trim();
    const kickoff = document.getElementById("input-match-kickoff").value;
    const apiIdInput = document.getElementById("input-match-api-id").value;
    const apiId = apiIdInput ? parseInt(apiIdInput) : null;

    if (!teamA || !teamB || !kickoff) {
        alert("Lengkapi semua field wajib!");
        return;
    }

    try {
        const isoKickoff = new Date(kickoff).toISOString();
        
        const { data, error } = await supabaseClient.rpc("admin_create_match", {
            team_a: teamA,
            team_b: teamB,
            logo_a: logoA,
            logo_b: logoB,
            kickoff: isoKickoff,
            api_id: apiId,
            admin_pin: adminPin
        });

        if (error) throw error;

        alert("Pertandingan baru berhasil ditambahkan!");
        document.getElementById("form-create-match").reset();
        
        await fetchMatches();
        if (data) selectedMatchId = parseInt(data);
        syncDropdown('match-select-admin');
        onMatchChangedAdmin();
    } catch (err) {
        alert("Gagal menambahkan pertandingan: " + err.message);
    }
}

// UPDATE MATCH MANUAL
async function updateMatchManual() {
    if (!adminPin || !selectedMatchId) return;

    const scoreA = parseInt(document.getElementById("adm-score-a").value);
    const scoreB = parseInt(document.getElementById("adm-score-b").value);
    const status = document.getElementById("adm-match-status").value;
    const elapsed = parseInt(document.getElementById("adm-match-elapsed").value) || 0;

    try {
        const { error } = await supabaseClient.rpc("admin_update_match", {
            match_id: selectedMatchId,
            val_score_a: scoreA,
            val_score_b: scoreB,
            val_status: status,
            val_elapsed: elapsed,
            admin_pin: adminPin
        });

        if (error) throw error;
        alert("Skor & Status pertandingan berhasil diperbarui!");
        await refreshActivePageData();
    } catch (err) {
        alert("Gagal memperbarui pertandingan: " + err.message);
    }
}

// DELETE MATCH
async function deleteActiveMatch() {
    if (!adminPin || !selectedMatchId) return;
    if (!confirm("Hapus pertandingan beserta seluruh tebakan di dalamnya?")) return;

    try {
        const { error } = await supabaseClient.rpc("admin_delete_match", {
            match_id: selectedMatchId,
            admin_pin: adminPin
        });

        if (error) throw error;
        alert("Pertandingan berhasil dihapus!");
        selectedMatchId = null;
        await fetchMatches();
        syncDropdown('match-select-admin');
        onMatchChangedAdmin();
    } catch (err) {
        alert("Gagal menghapus pertandingan: " + err.message);
    }
}

// MODERATION TABLE LIST
function renderAdminPredictions() {
    const container = document.getElementById("adm-predictions-list");
    document.getElementById("adm-predictions-count").textContent = `${predictionsList.length} Tebakan`;
    
    container.innerHTML = "";
    if (predictionsList.length === 0) {
        container.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Belum ada tebakan.</td></tr>`;
        return;
    }

    predictionsList.forEach(pred => {
        const tr = document.createElement("tr");
        const timeStr = new Date(pred.created_at).toLocaleString('id-ID');
        
        tr.innerHTML = `
            <td><strong>${escapeHtml(pred.participant_name)}</strong></td>
            <td><span class="guess-score-badge">${pred.guess_a} - ${pred.guess_b}</span></td>
            <td class="text-muted text-xs">${pred.device_id.substring(0, 12)}...</td>
            <td class="text-muted text-xs">${timeStr}</td>
            <td>
                <button class="btn-danger btn-sm" onclick="deletePrediction(${pred.id})">
                    <i class="fa-solid fa-trash-can"></i> Hapus
                </button>
            </td>
        `;
        container.appendChild(tr);
    });
}

// DELETE PREDICTION (MODERATION)
async function deletePrediction(predId) {
    if (!adminPin) return;
    if (!confirm("Hapus tebakan peserta ini?")) return;

    try {
        const { error } = await supabaseClient.rpc("admin_delete_prediction", {
            prediction_id: predId,
            admin_pin: adminPin
        });

        if (error) throw error;
        alert("Tebakan berhasil dihapus!");
        await refreshActivePageData();
    } catch (err) {
        alert("Gagal menghapus tebakan: " + err.message);
    }
}

// API CONFIGS
function saveApiKey() {
    const key = document.getElementById("input-api-key").value.trim();
    if (key.length !== 32) {
        alert("Harap masukkan API Key 32 karakter!");
        return;
    }
    localStorage.setItem("tebak_skor_v2_api_key", key);
    alert("API Key berhasil disimpan!");
}

async function testApiKey() {
    const key = document.getElementById("input-api-key").value.trim();
    const statusMsg = document.getElementById("api-status-msg");
    
    if (!key) {
        alert("Masukkan API Key!");
        return;
    }

    statusMsg.className = "margin-top-sm bold text-sm text-center text-muted";
    statusMsg.textContent = "Menguji koneksi...";

    try {
        const res = await fetch("https://v3.football.api-sports.io/status", {
            method: "GET",
            headers: {
                "x-apisports-key": key
            }
        });
        
        const data = await res.json();
        
        if (data.errors && Object.keys(data.errors).length > 0) {
            throw new Error(JSON.stringify(data.errors));
        }

        if (data.response && data.response.requests) {
            const limit = data.response.requests.limit_day;
            const current = data.response.requests.current;
            statusMsg.className = "margin-top-sm bold text-sm text-center text-success";
            statusMsg.textContent = `Sukses! Limit hari ini: ${current}/${limit}`;
        } else {
            throw new Error("Respon tidak valid.");
        }
    } catch (err) {
        statusMsg.className = "margin-top-sm bold text-sm text-center text-danger";
        statusMsg.textContent = "Koneksi Gagal: " + err.message;
    }
}

// SYNC SCORE SCRIPT
async function syncScoreFromApiNow() {
    if (!currentMatchData || !currentMatchData.api_fixture_id) return;
    
    const key = localStorage.getItem("tebak_skor_v2_api_key") || document.getElementById("input-api-key").value.trim();
    if (!key) {
        alert("API Key tidak ditemukan di dashboard admin!");
        return;
    }

    const btn = document.getElementById("btn-sync-now");
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sinkronisasi...`;

    try {
        const fixtureId = currentMatchData.api_fixture_id;
        const res = await fetch(`https://v3.football.api-sports.io/fixtures?id=${fixtureId}`, {
            method: "GET",
            headers: {
                "x-apisports-key": key
            }
        });

        const data = await res.json();
        
        if (data.errors && Object.keys(data.errors).length > 0) {
            throw new Error(JSON.stringify(data.errors));
        }

        if (!data.response || data.response.length === 0) {
            throw new Error("Tidak ada fixture ditemukan.");
        }

        const matchInfo = data.response[0];
        const goalsHome = matchInfo.goals.home;
        const goalsAway = matchInfo.goals.away;
        const apiStatus = matchInfo.fixture.status.short;
        const elapsed = matchInfo.fixture.status.elapsed || 0;

        let mappedStatus = "PENDING";
        const liveStatuses = ["1H", "HT", "2H", "ET", "BT", "P", "INT"];
        const finishedStatuses = ["FT", "AET", "PEN"];

        if (liveStatuses.includes(apiStatus)) {
            mappedStatus = "LIVE";
        } else if (finishedStatuses.includes(apiStatus)) {
            mappedStatus = "FINISHED";
        }

        const scoreA = goalsHome !== null ? goalsHome : 0;
        const scoreB = goalsAway !== null ? goalsAway : 0;

        const { error } = await supabaseClient.rpc("admin_update_match", {
            match_id: selectedMatchId,
            val_score_a: scoreA,
            val_score_b: scoreB,
            val_status: mappedStatus,
            val_elapsed: elapsed,
            admin_pin: adminPin
        });

        if (error) throw error;

        document.getElementById("last-sync-time").textContent = `Terakhir sinkron: ${new Date().toLocaleTimeString('id-ID')}`;
        await refreshActivePageData();
    } catch (err) {
        alert("Gagal sinkronisasi API: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-down"></i> Tarik Skor Aktual Sekarang`;
    }
}

function toggleAutoSync(checkbox) {
    if (autoSyncTimer) clearInterval(autoSyncTimer);

    if (checkbox.checked) {
        syncScoreFromApiNow();
        autoSyncTimer = setInterval(() => {
            if (currentMatchData && (currentMatchData.status === 'LIVE' || currentMatchData.status === 'PENDING')) {
                syncScoreFromApiNow();
            }
        }, 60000);
        alert("Auto-Sync Aktif! Sinkronisasi otomatis setiap 60 detik.");
    } else {
        alert("Auto-Sync Dinonaktifkan.");
    }
}

// ==========================================================================
// GENERAL HELPERS
// ==========================================================================
function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getRelativeTime(timestamp) {
    const elapsed = Date.now() - new Date(timestamp).getTime();
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (seconds < 60) return "baru saja";
    if (minutes < 60) return `${minutes} menit lalu`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    
    return new Date(timestamp).toLocaleDateString('id-ID');
}
