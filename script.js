/* Firebase Configuration */
const firebaseConfig = {
  apiKey: "AIzaSyBTwQccPmB_6FhnIvx7W3sEuPZ7cGwz4rs",
  authDomain: "plays-c41fc.firebaseapp.com",
  projectId: "plays-c41fc",
  storageBucket: "plays-c41fc.firebasestorage.app",
  messagingSenderId: "143556688276",
  appId: "1:143556688276:web:110ad3996ba1b9d14ff781"
};

// Initialize Firebase
let db;
let tournamentDoc; // ⬅️ عرّفهم بره الـ try-catch

try {
  firebase.initializeApp(firebaseConfig);
  console.log('✅ Firebase initialized successfully!');
  console.log('🔥 Project ID:', firebaseConfig.projectId);
  
  db = firebase.firestore(); // ⬅️ شيل const
  console.log('✅ Firestore connected!');
  
  tournamentDoc = db.collection('tournaments').doc('main'); // ⬅️ شيل const
  console.log('📄 Document reference created: tournaments/main');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
}
/* Auth */
const AUTH = { user: 'admin', pass: '1234' };

/* State */
const state = {
  teams: [],
  groups: {},
  standings: {},
  matches: {},
  knockout: {}
};

let isLoadingFromFirebase = false;

/* Load from Firestore */
async function loadFromFirestore() {
	let db;
let tournamentDoc;
db = firebase.firestore();
tournamentDoc = db.collection('tournaments').doc('main');
  try {
    isLoadingFromFirebase = true;
    const doc = await tournamentDoc.get();
    if (doc.exists) {
      const data = doc.data();
      state.teams = data.teams || [];
      state.groups = data.groups || {};
      state.standings = data.standings || {};
      state.matches = data.matches || {};
      state.knockout = data.knockout || {};
    }
    isLoadingFromFirebase = false;
  } catch (error) {
    console.error('Error loading:', error);
    isLoadingFromFirebase = false;
  }
}

/* Save to Firestore */
async function saveToFirestore() {
  if (isLoadingFromFirebase) return;
  try {
    await tournamentDoc.set({
      teams: state.teams,
      groups: state.groups,
      standings: state.standings,
      matches: state.matches,
      knockout: state.knockout,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }); // ⬅️ الإضافة المهمة
  } catch (error) {
    console.error('Error saving:', error);
  }
}
/* Real-time updates */
tournamentDoc.onSnapshot((doc) => {
  if (!isLoadingFromFirebase && doc.exists) {
    const data = doc.data();
    state.teams = data.teams || [];
    state.groups = data.groups || {};
    state.standings = data.standings || {};
    state.matches = data.matches || {};
    state.knockout = data.knockout || {};

    if (document.getElementById('teams-list')) renderTeamsList();
    if (document.getElementById('org-groups')) renderGroupsOrg();
    if (document.getElementById('org-brackets')) renderBracketsOrg();
    if (document.getElementById('audience-groups')) renderAudience();
  }
});

function saveAll() {
  saveToFirestore();
}

/* Navigation */
function show(id) {
  document.querySelectorAll('[id^="page-"]').forEach(e => e.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function goHome() { show('page-main'); }
function enterOrganizer() { show('page-login'); }
function enterAudience() { show('page-audience'); renderAudience(); }

function doLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value.trim();
  if (u === AUTH.user && p === AUTH.pass) {
    show('page-org');
    renderOrganizer();
  } else {
    alert('بيانات الدخول خاطئة ❌');
  }
}

/* Teams */
function addTeam() {
  const v = document.getElementById('team-input').value.trim();
  if (!v) return;
  if (state.teams.includes(v)) {
    alert('الفريق موجود بالفعل ❌');
    return;
  }
  state.teams.push(v);
  document.getElementById('team-input').value = '';
  saveAll();
  renderTeamsList();
}

function renderTeamsList() {
  const wrap = document.getElementById('teams-list');
  if (!wrap) return;
  wrap.innerHTML = '';
  
  if (state.teams.length === 0) {
    wrap.innerHTML = '<div style="text-align:center;padding:20px;color:#8ab4f8;">لا توجد فرق مسجلة بعد</div>';
    return;
  }
  
  state.teams.forEach((t, i) => {
    const el = document.createElement('div');
    el.className = 'team-tag';
    el.innerHTML = `
      <span class="team-name">⚽ ${t}</span>
      <button class="ps-btn ghost" style="padding:6px 12px;font-size:12px;" onclick="removeTeam(${i})">حذف</button>
    `;
    wrap.appendChild(el);
  });
}

function removeTeam(i) {
  state.teams.splice(i, 1);
  saveAll();
  renderTeamsList();
}

/* Groups */
function runGroupsDraw() {
  const teamsPerGroup = parseInt(document.getElementById('teams-per-group').value);
  if (state.teams.length < teamsPerGroup) {
    alert(`سجل ${teamsPerGroup} فرق على الأقل ⚠️`);
    return;
  }
  
  const shuffled = [...state.teams].sort(() => Math.random() - 0.5);
  state.groups = {};
  let groupIndex = 0;
  
  for (let i = 0; i < shuffled.length; i += teamsPerGroup) {
    state.groups[groupIndex] = shuffled.slice(i, i + teamsPerGroup);
    groupIndex++;
  }
  
  createScheduleAndStandings();
  alert('تم عمل القرعة وإنشاء جدول المباريات ✅');
}

function startManualDistribution() {
  const teamsPerGroup = parseInt(document.getElementById('teams-per-group').value);
  if (state.teams.length < teamsPerGroup) {
    alert(`سجل ${teamsPerGroup} فرق على الأقل ⚠️`);
    return;
  }
  
  document.getElementById('manual-distribution').classList.remove('hidden');
  const container = document.getElementById('manual-groups-container');
  container.innerHTML = '';
  
  const numGroups = Math.ceil(state.teams.length / teamsPerGroup);
  
  for (let i = 0; i < numGroups; i++) {
    const groupDiv = document.createElement('div');
    groupDiv.style.marginBottom = '15px';
    groupDiv.style.padding = '15px';
    groupDiv.style.background = 'rgba(10, 31, 61, 0.6)';
    groupDiv.style.border = '2px solid rgba(0, 112, 204, 0.3)';
    groupDiv.style.borderRadius = '10px';
    
    let html = `<h4 style="color:#8ab4f8;margin-bottom:10px;">المجموعة ${i + 1}</h4>`;
    html += `<select id="manual-group-${i}" multiple size="${teamsPerGroup}" class="ps-select" style="height:auto;">`;
    state.teams.forEach(team => {
      html += `<option value="${team}">${team}</option>`;
    });
    html += `</select>`;
    html += `<div style="margin-top:8px;color:#8ab4f8;font-size:13px;">اضغط Ctrl (أو Cmd) لاختيار فرق متعددة</div>`;
    
    groupDiv.innerHTML = html;
    container.appendChild(groupDiv);
  }
}

function cancelManualDistribution() {
  document.getElementById('manual-distribution').classList.add('hidden');
}

function saveManualDistribution() {
  const teamsPerGroup = parseInt(document.getElementById('teams-per-group').value);
  const numGroups = Math.ceil(state.teams.length / teamsPerGroup);
  
  state.groups = {};
  const usedTeams = new Set();
  
  for (let i = 0; i < numGroups; i++) {
    const select = document.getElementById(`manual-group-${i}`);
    const selectedTeams = Array.from(select.selectedOptions).map(opt => opt.value);
    
    if (selectedTeams.length === 0) {
      alert(`المجموعة ${i + 1} فارغة! ❌`);
      return;
    }
    
    for (const team of selectedTeams) {
      if (usedTeams.has(team)) {
        alert(`الفريق "${team}" موجود في أكثر من مجموعة! ❌`);
        return;
      }
      usedTeams.add(team);
    }
    
    state.groups[i] = selectedTeams;
  }
  
  if (usedTeams.size !== state.teams.length) {
    alert('بعض الفرق لم يتم توزيعها! ⚠️');
    return;
  }
  
  createScheduleAndStandings();
  document.getElementById('manual-distribution').classList.add('hidden');
  alert('تم حفظ التوزيع اليدوي ✅');
}

function createScheduleAndStandings() {
  state.standings = {};
  Object.keys(state.groups).forEach(gi => {
    const g = state.groups[gi];
    state.standings[gi] = g.map(name => ({
      name, played: 0, win: 0, draw: 0, lose: 0,
      gf: 0, ga: 0, pts: 0, yellow: 0, red: 0
    }));
  });
  
  state.matches = {};
  Object.keys(state.groups).forEach(gi => {
    const g = state.groups[gi];
    const pairs = [];
    for (let i = 0; i < g.length; i++) {
      for (let j = i + 1; j < g.length; j++) {
        pairs.push({
          a: g[i], b: g[j],
          sA: null, sB: null,
          yA: 0, yB: 0,
          rA: 0, rB: 0,
          played: false
        });
      }
    }
    state.matches[gi] = pairs;
  });
  
  state.knockout = {};
  saveAll();
  renderGroupsOrg();
  renderAudience();
}

/* Sorting */
function sortGroup(arr) {
  return arr.slice().sort((A, B) => {
    const gdA = A.gf - A.ga, gdB = B.gf - B.ga;
    if (B.pts !== A.pts) return B.pts - A.pts;
    if (gdB !== gdA) return gdB - gdA;
    if (A.red !== B.red) return A.red - B.red;
    if (A.yellow !== B.yellow) return A.yellow - B.yellow;
    if (B.gf !== A.gf) return B.gf - A.gf;
    return A.name.localeCompare(B.name, 'ar');
  });
}

/* Rebuild standings */
function rebuildStandings() {
  state.standings = {};
  Object.keys(state.groups).forEach(gi => {
    const g = state.groups[gi];
    state.standings[gi] = g.map(name => ({
      name, played: 0, win: 0, draw: 0, lose: 0,
      gf: 0, ga: 0, pts: 0, yellow: 0, red: 0
    }));
  });
  
  Object.keys(state.matches).forEach(gi => {
    const groupMatches = state.matches[gi];
    groupMatches.forEach(m => {
      if (m.played && Number.isFinite(m.sA) && Number.isFinite(m.sB)) {
        const g = state.standings[gi];
        const A = g.find(x => x.name === m.a);
        const B = g.find(x => x.name === m.b);
        if (!A || !B) return;
        
        A.played++; B.played++;
        A.gf += m.sA; A.ga += m.sB;
        B.gf += m.sB; B.ga += m.sA;
        A.yellow += (m.yA || 0);
        B.yellow += (m.yB || 0);
        A.red += (m.rA || 0);
        B.red += (m.rB || 0);
        
        if (m.sA > m.sB) {
          A.win++; B.lose++;
          A.pts += 3;
        } else if (m.sA < m.sB) {
          B.win++; A.lose++;
          B.pts += 3;
        } else {
          A.draw++; B.draw++;
          A.pts++; B.pts++;
        }
      }
    });
  });
  saveAll();
}

/* Render Groups for Organizer */
function renderGroupsOrg() {
  const host = document.getElementById('org-groups');
  if (!host) return;
  host.innerHTML = '';
  
  const groupCount = Object.keys(state.groups).length;
  if (groupCount === 0) {
    host.innerHTML = '<div style="text-align:center;padding:30px;color:#8ab4f8;">لا توجد مجموعات بعد – قم بالقرعة</div>';
    return;
  }
  
  Object.keys(state.groups).sort((a, b) => a - b).forEach(gi => {
    const g = state.groups[gi];
    const c = document.createElement('div');
    c.className = 'ps-card';
    c.style.marginTop = '20px';
    
    const sorted = sortGroup(state.standings[gi] || []);
    let html = `<h3 style="color:#8ab4f8;margin-bottom:20px;">📊 المجموعة ${parseInt(gi) + 1}</h3>`;
    html += '<div style="overflow-x:auto;"><table class="ps-table"><thead><tr>';
    html += '<th>الفريق</th><th>لعب</th><th>فوز</th><th>تعادل</th><th>خسارة</th>';
    html += '<th>له</th><th>عليه</th><th>فرق</th><th>نقاط</th><th>إنذار</th><th>طرد</th>';
    html += '</tr></thead><tbody>';
    
    sorted.forEach(t => {
      html += `<tr>
        <td style="font-weight:700;">${t.name}</td>
        <td>${t.played}</td>
        <td>${t.win}</td>
        <td>${t.draw}</td>
        <td>${t.lose}</td>
        <td>${t.gf}</td>
        <td>${t.ga}</td>
        <td>${t.gf - t.ga}</td>
        <td><strong style="color:var(--ps-success);">${t.pts}</strong></td>
        <td>${t.yellow}</td>
        <td>${t.red}</td>
      </tr>`;
    });
    
    html += '</tbody></table></div>';
    
    html += '<div style="margin-top:20px;"><h4 style="color:#8ab4f8;margin-bottom:15px;">📅 جدول المباريات</h4>';
    const matches = state.matches[gi] || [];
    
    if (!matches.length) {
      html += '<div style="text-align:center;color:#8ab4f8;">لا توجد مباريات</div>';
    }
    
    matches.forEach((m, mi) => {
      html += `<div class="match-pair">
        <span class="match-team">${m.a}</span>
        <input type="number" class="match-score-input" id="m-${gi}-${mi}-a" placeholder="0" value="${m.sA === null ? '' : m.sA}" />
        <span class="match-vs">:</span>
        <input type="number" class="match-score-input" id="m-${gi}-${mi}-b" placeholder="0" value="${m.sB === null ? '' : m.sB}" />
        <span class="match-team">${m.b}</span>
        <input type="number" class="match-score-input" id="m-${gi}-${mi}-yA" placeholder="🟨 ${m.a}" value="${m.yA || 0}" style="width:90px;" />
        <input type="number" class="match-score-input" id="m-${gi}-${mi}-yB" placeholder="🟨 ${m.b}" value="${m.yB || 0}" style="width:90px;" />
        <input type="number" class="match-score-input" id="m-${gi}-${mi}-rA" placeholder="🟥 ${m.a}" value="${m.rA || 0}" style="width:90px;" />
        <input type="number" class="match-score-input" id="m-${gi}-${mi}-rB" placeholder="🟥 ${m.b}" value="${m.rB || 0}" style="width:90px;" />
        <button class="ps-btn primary" style="padding:8px 16px;font-size:14px;" onclick="saveMatchResult('${gi}',${mi})">${m.played ? 'تحديث' : 'حفظ'}</button>
        <button class="ps-btn ghost" style="padding:8px 16px;font-size:14px;" onclick="clearMatchResult('${gi}',${mi})">مسح</button>
      </div>`;
    });
    
    html += '</div>';
    c.innerHTML = html;
    host.appendChild(c);
  });
}

/* Save match result */
function saveMatchResult(gi, mi) {
  const m = state.matches[gi][mi];
  const sA = document.getElementById(`m-${gi}-${mi}-a`).value;
  const sB = document.getElementById(`m-${gi}-${mi}-b`).value;
  
  if (sA === '' || sB === '') {
    if (!confirm('سجل الأهداف كـ 0 إذا تريد ذلك؟')) return;
  }
  
  const a = parseInt(sA || '0', 10);
  const b = parseInt(sB || '0', 10);
  const yA = parseInt(document.getElementById(`m-${gi}-${mi}-yA`).value || '0', 10);
  const yB = parseInt(document.getElementById(`m-${gi}-${mi}-yB`).value || '0', 10);
  const rA = parseInt(document.getElementById(`m-${gi}-${mi}-rA`).value || '0', 10);
  const rB = parseInt(document.getElementById(`m-${gi}-${mi}-rB`).value || '0', 10);
  
  m.sA = a; m.sB = b;
  m.yA = yA; m.yB = yB;
  m.rA = rA; m.rB = rB;
  m.played = true;
  
  rebuildStandings();
  renderGroupsOrg();
  renderAudience();
  saveAll();
}

/* Clear match result */
function clearMatchResult(gi, mi) {
  if (!confirm('هل أنت متأكد من مسح نتيجة هذه المباراة؟')) return;
  
  const m = state.matches[gi][mi];
  m.sA = null; m.sB = null;
  m.yA = 0; m.yB = 0;
  m.rA = 0; m.rB = 0;
  m.played = false;
  
  rebuildStandings();
  renderGroupsOrg();
  renderAudience();
  saveAll();
}

/* Knockout functions */
function topTwoFromGroupIndex(gi) {
  return sortGroup(state.standings[gi] || []).slice(0, 2).map(x => x.name);
}

function createKnockoutFromGroups() {
  const groupCount = Object.keys(state.groups).length;
  if (groupCount === 0) {
    alert('لا توجد مجموعات ❌');
    return;
  }
  
  const qualified = [];
  Object.keys(state.groups).forEach(i => {
    qualified.push(...topTwoFromGroupIndex(i));
  });
  
  if (qualified.length < 2) {
    alert('المتأهلون أقل من اللازم ❌');
    return;
  }
  
  const shuffled = qualified.sort(() => Math.random() - 0.5);
  const pairs = [];
  
  for (let i = 0; i < shuffled.length; i += 2) {
    if (shuffled[i + 1]) {
      pairs.push({
        a: shuffled[i],
        b: shuffled[i + 1],
        sA: null, sB: null,
        winner: null, loser: null
      });
    }
  }
  
  state.knockout.R2 = pairs;
  saveAll();
  renderBracketsOrg();
  renderAudience();
  alert('تم إنشاء الدور الثاني من المتأهلين ✅');
}

let pendingKnockoutData = null;

function showRoundOptions(fromKey, toKey) {
  const from = state.knockout[fromKey];
  if (!from || !from.length) {
    alert('لا توجد مباريات في هذا الدور ❌');
    return;
  }
  
  const winners = from.filter(p => p.winner).map(p => p.winner);
  if (winners.length !== from.length) {
    alert('سجّل نتائج كل مباريات هذا الدور أولاً ⚠️');
    return;
  }
  
  pendingKnockoutData = { fromKey, toKey, from, winners };
  
  const choice = confirm('اختر طريقة التوزيع:\n\nموافق = توزيع أوتوماتيكي (قرعة)\nإلغاء = توزيع يدوي');
  
  if (choice) {
    advanceKnockoutAuto(fromKey, toKey);
  } else {
    startManualKnockout(fromKey, toKey);
  }
}

function advanceKnockoutAuto(fromKey, toKey) {
  if (!pendingKnockoutData) return;
  const { from, winners } = pendingKnockoutData;
  
  if (fromKey === 'R2' && toKey === 'R3' && winners.length === 5) {
    handleFiveWinnersCase(from, winners, toKey);
    pendingKnockoutData = null;
    return;
  }
  
  if (fromKey === 'R3' && toKey === 'SF' && state.knockout.directToSF) {
    handleDirectQualifierCase(winners);
    pendingKnockoutData = null;
    return;
  }
  
  const shuffled = winners.sort(() => Math.random() - 0.5);
  const next = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    if (shuffled[i + 1]) {
      next.push({
        a: shuffled[i],
        b: shuffled[i + 1],
        sA: null, sB: null,
        winner: null, loser: null
      });
    }
  }
  state.knockout[toKey] = next;
  saveAll();
  renderBracketsOrg();
  renderAudience();
  alert('تم إنشاء الدور التالي (توزيع أوتوماتيكي) ✅');
  pendingKnockoutData = null;
}

function handleFiveWinnersCase(from, winners, toKey) {
  const rankedWinners = from.map(p => ({
    team: p.winner,
    scored: p.sA > p.sB ? p.sA : p.sB,
    conceded: p.sA > p.sB ? p.sB : p.sA,
    diff: (p.sA > p.sB ? p.sA : p.sB) - (p.sA > p.sB ? p.sB : p.sA)
  })).sort((a, b) => {
    if (b.diff !== a.diff) return b.diff - a.diff;
    if (b.scored !== a.scored) return b.scored - a.scored;
    if (a.conceded !== b.conceded) return a.conceded - b.conceded;
    return 0;
  });
  
  const directQualifier = rankedWinners[0].team;
  const remainingFour = rankedWinners.slice(1).map(w => w.team);
  
  const losers = from.map(p => ({
    team: p.loser,
    scored: p.sA > p.sB ? p.sB : p.sA,
    conceded: p.sA > p.sB ? p.sA : p.sB,
    diff: (p.sA > p.sB ? p.sB : p.sA) - (p.sA > p.sB ? p.sA : p.sB)
  })).sort((a, b) => {
    if (b.scored !== a.scored) return b.scored - a.scored;
    if (a.conceded !== b.conceded) return a.conceded - b.conceded;
    return b.diff - a.diff;
  });
  
  const luckyLoser = losers[0].team;
  state.knockout.directToSF = directQualifier;
  
  const r3Teams = [...remainingFour, luckyLoser];
  const shuffled = r3Teams.sort(() => Math.random() - 0.5);
  const next = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    if (shuffled[i + 1]) {
      next.push({
        a: shuffled[i],
        b: shuffled[i + 1],
        sA: null, sB: null,
        winner: null, loser: null
      });
    }
  }
  state.knockout[toKey] = next;
  saveAll();
  renderBracketsOrg();
  renderAudience();
  alert(`✅ توزيع أوتوماتيكي:\n\n- متأهل مباشر: ${directQualifier}\n- أفضل خاسر: ${luckyLoser}\n- الدور الثالث: 6 فرق`);
}

function handleDirectQualifierCase(winners) {
  const directQualifier = state.knockout.directToSF;
  const shuffled = [...winners, directQualifier].sort(() => Math.random() - 0.5);
  
  state.knockout.SF = [
    { a: shuffled[0], b: shuffled[1], sA: null, sB: null, winner: null, loser: null },
    { a: shuffled[2], b: shuffled[3], sA: null, sB: null, winner: null, loser: null }
  ];
  
  delete state.knockout.directToSF;
  saveAll();
  renderBracketsOrg();
  renderAudience();
  alert(`✅ توزيع أوتوماتيكي:\n\n- المتأهل المباشر: ${directQualifier}\n- 3 فائزين من الدور الثالث\n= نصف نهائي (4 فرق)`);
}

function startManualKnockout(fromKey, toKey) {
  if (!pendingKnockoutData) return;
  let { from, winners } = pendingKnockoutData;
  
  let availableTeams = [...winners];
  let directQualifier = null;
  
  if (fromKey === 'R2' && toKey === 'R3' && winners.length === 5) {
    const rankedWinners = from.map(p => ({
      team: p.winner,
      scored: p.sA > p.sB ? p.sA : p.sB,
      conceded: p.sA > p.sB ? p.sB : p.sA,
      diff: (p.sA > p.sB ? p.sA : p.sB) - (p.sA > p.sB ? p.sB : p.sA)
    })).sort((a, b) => {
      if (b.diff !== a.diff) return b.diff - a.diff;
      if (b.scored !== a.scored) return b.scored - a.scored;
      if (a.conceded !== b.conceded) return a.conceded - b.conceded;
      return 0;
    });
    
    directQualifier = rankedWinners[0].team;
    const remainingFour = rankedWinners.slice(1).map(w => w.team);
    
    const losers = from.map(p => ({
      team: p.loser,
      scored: p.sA > p.sB ? p.sB : p.sA,
      conceded: p.sA > p.sB ? p.sA : p.sB,
      diff: (p.sA > p.sB ? p.sB : p.sA) - (p.sA > p.sB ? p.sA : p.sB)
    })).sort((a, b) => {
      if (b.scored !== a.scored) return b.scored - a.scored;
      if (a.conceded !== b.conceded) return a.conceded - b.conceded;
      return b.diff - a.diff;
    });
    
    const luckyLoser = losers[0].team;
    availableTeams = [...remainingFour, luckyLoser];
    state.knockout.directToSF = directQualifier;
  } else if (fromKey === 'R3' && toKey === 'SF' && state.knockout.directToSF) {
    directQualifier = state.knockout.directToSF;
    availableTeams = [...winners, directQualifier];
  }
  
  const numMatches = Math.floor(availableTeams.length / 2);
  
  document.getElementById('manual-knockout').classList.remove('hidden');
  document.getElementById('manual-knockout-title').textContent = `توزيع ${getRoundName(toKey)} يدوياً`;
  const container = document.getElementById('manual-knockout-container');
  container.innerHTML = '';
  
  if (directQualifier) {
    const info = document.createElement('div');
    info.style.padding = '15px';
    info.style.background = 'rgba(0, 209, 102, 0.2)';
    info.style.border = '2px solid var(--ps-success)';
    info.style.borderRadius = '10px';
    info.style.marginBottom = '15px';
    info.style.color = '#fff';
    info.innerHTML = `⭐ متأهل مباشر للنصف النهائي: <strong>${directQualifier}</strong>`;
    container.appendChild(info);
  }
  
  for (let i = 0; i < numMatches; i++) {
    const matchDiv = document.createElement('div');
    matchDiv.style.marginBottom = '15px';
    matchDiv.style.padding = '15px';
    matchDiv.style.background = 'rgba(10, 31, 61, 0.6)';
    matchDiv.style.border = '2px solid rgba(0, 112, 204, 0.3)';
    matchDiv.style.borderRadius = '10px';
    
    let html = `<h4 style="color:#8ab4f8;margin-bottom:10px;">مباراة ${i + 1}</h4>`;
    html += `<div style="display:flex;gap:10px;flex-wrap:wrap;">`;
    html += `<select id="manual-ko-${i}-a" class="ps-select" style="flex:1;min-width:200px;">
      <option value="">-- اختر الفريق الأول --</option>`;
    availableTeams.forEach(team => {
      html += `<option value="${team}">${team}</option>`;
    });
    html += `</select>`;
    html += `<span style="color:#8ab4f8;font-size:20px;padding:10px;">VS</span>`;
    html += `<select id="manual-ko-${i}-b" class="ps-select" style="flex:1;min-width:200px;">
      <option value="">-- اختر الفريق الثاني --</option>`;
    availableTeams.forEach(team => {
      html += `<option value="${team}">${team}</option>`;
    });
    html += `</select></div>`;
    
    matchDiv.innerHTML = html;
    container.appendChild(matchDiv);
  }
}

function saveManualKnockout() {
  if (!pendingKnockoutData) return;
  const { fromKey, toKey, winners } = pendingKnockoutData;
  
  let availableTeams = [...winners];
  if (state.knockout.directToSF && toKey === 'SF') {
    availableTeams = [...winners, state.knockout.directToSF];
  }
  
  const numMatches = Math.floor(availableTeams.length / 2);
  const usedTeams = new Set();
  const matches = [];
  
  for (let i = 0; i < numMatches; i++) {
    const teamA = document.getElementById(`manual-ko-${i}-a`).value;
    const teamB = document.getElementById(`manual-ko-${i}-b`).value;
    
    if (!teamA || !teamB) {
      alert(`مباراة ${i + 1}: يجب اختيار فريقين! ❌`);
      return;
    }
    
    if (teamA === teamB) {
      alert(`مباراة ${i + 1}: لا يمكن للفريق أن يلعب ضد نفسه! ❌`);
      return;
    }
    
    if (usedTeams.has(teamA)) {
      alert(`الفريق "${teamA}" مستخدم في أكثر من مباراة! ❌`);
      return;
    }
    
    if (usedTeams.has(teamB)) {
      alert(`الفريق "${teamB}" مستخدم في أكثر من مباراة! ❌`);
      return;
    }
    
    usedTeams.add(teamA);
    usedTeams.add(teamB);
    
    matches.push({
      a: teamA,
      b: teamB,
      sA: null,
      sB: null,
      winner: null,
      loser: null
    });
  }
  
  state.knockout[toKey] = matches;
  
  if (toKey === 'SF' && state.knockout.directToSF) {
    delete state.knockout.directToSF;
  }
  
  saveAll();
  renderBracketsOrg();
  renderAudience();
  document.getElementById('manual-knockout').classList.add('hidden');
  alert('تم حفظ التوزيع اليدوي ✅');
  pendingKnockoutData = null;
}

function cancelManualKnockout() {
  document.getElementById('manual-knockout').classList.add('hidden');
  pendingKnockoutData = null;
}

function getRoundName(key) {
  const names = {
    'R2': 'الدور الثاني',
    'R3': 'الدور الثالث',
    'SF': 'نصف النهائي',
    'FINAL': 'النهائي',
    'THIRD': 'المركز الثالث'
  };
  return names[key] || key;
}

function skipToSemiFinal() {
  const r2 = state.knockout.R2;
  if (!r2 || !r2.length) {
    alert('أنشئ الدور الثاني أولاً! ❌');
    return;
  }
  
  const winners = r2.filter(p => p.winner).map(p => p.winner);
  if (winners.length !== r2.length) {
    alert('سجّل نتائج جميع مباريات الدور الثاني أولاً! ⚠️');
    return;
  }
  
  if (winners.length !== 4) {
    alert('هذه الميزة تعمل فقط مع 4 فرق متأهلة! ⚠️');
    return;
  }
  
  const shuffled = winners.sort(() => Math.random() - 0.5);
  state.knockout.SF = [
    { a: shuffled[0], b: shuffled[1], sA: null, sB: null, winner: null, loser: null },
    { a: shuffled[2], b: shuffled[3], sA: null, sB: null, winner: null, loser: null }
  ];
  
  delete state.knockout.R3;
  saveAll();
  renderBracketsOrg();
  renderAudience();
  alert('✅ تم التخطي مباشرة لنصف النهائي!');
}

function advanceFinals() {
  const sf = state.knockout.SF;
  if (!sf || sf.length !== 2) {
    alert('يجب إنشاء نصف النهائي أولاً! ❌');
    return;
  }
  
  const winners = sf.filter(p => p.winner).map(p => p.winner);
  const losers = sf.filter(p => p.loser).map(p => p.loser);
  
  if (winners.length !== 2 || losers.length !== 2) {
    alert('سجّل نتائج مباريات نصف النهائي أولاً! ⚠️');
    return;
  }
  
  state.knockout.FINAL = [{
    a: winners[0],
    b: winners[1],
    sA: null, sB: null,
    winner: null, loser: null
  }];
  
  state.knockout.THIRD = [{
    a: losers[0],
    b: losers[1],
    sA: null, sB: null,
    winner: null, loser: null
  }];
  
  saveAll();
  renderBracketsOrg();
  renderAudience();
  alert('✅ تم إنشاء مباراة النهائي والمركز الثالث!');
}

function saveKnockoutMatch(round, matchIndex) {
  const m = state.knockout[round][matchIndex];
  const sA = parseInt(document.getElementById(`ko-${round}-${matchIndex}-a`).value || '0', 10);
  const sB = parseInt(document.getElementById(`ko-${round}-${matchIndex}-b`).value || '0', 10);
  
  m.sA = sA;
  m.sB = sB;
  
  if (sA > sB) {
    m.winner = m.a;
    m.loser = m.b;
  } else if (sB > sA) {
    m.winner = m.b;
    m.loser = m.a;
  } else {
    alert('التعادل غير مسموح في الأدوار الإقصائية! ⚠️');
    return;
  }
  
  saveAll();
  renderBracketsOrg();
  renderAudience();
  alert('✅ تم حفظ النتيجة!');
}

function clearKnockoutMatch(round, matchIndex) {
  if (!confirm('هل أنت متأكد من مسح نتيجة هذه المباراة؟')) return;
  
  const m = state.knockout[round][matchIndex];
  m.sA = null;
  m.sB = null;
  m.winner = null;
  m.loser = null;
  
  saveAll();
  renderBracketsOrg();
  renderAudience();
}

function renderBracketsOrg() {
  const host = document.getElementById('org-brackets');
  if (!host) return;
  host.innerHTML = '';
  
  if (Object.keys(state.knockout).length === 0) {
    host.innerHTML = '<div style="text-align:center;padding:30px;color:#8ab4f8;">لا توجد أدوار إقصائية بعد</div>';
    return;
  }
  
  ['R2', 'R3', 'SF', 'THIRD', 'FINAL'].forEach(roundKey => {
    if (!state.knockout[roundKey]) return;
    
    const card = document.createElement('div');
    card.className = 'ps-card';
    card.style.marginTop = '20px';
    
    let html = `<h3 style="color:#8ab4f8;margin-bottom:20px;">🏆 ${getRoundName(roundKey)}</h3>`;
    
    if (state.knockout.directToSF && roundKey === 'R3') {
      html += `<div style="padding:15px;background:rgba(0,209,102,0.2);border:2px solid var(--ps-success);border-radius:10px;margin-bottom:15px;color:#fff;">
        ⭐ متأهل مباشر للنصف النهائي: <strong>${state.knockout.directToSF}</strong>
      </div>`;
    }
    
    state.knockout[roundKey].forEach((m, mi) => {
      html += `<div class="match-pair">
        <span class="match-team">${m.a}</span>
        <input type="number" class="match-score-input" id="ko-${roundKey}-${mi}-a" placeholder="0" value="${m.sA === null ? '' : m.sA}" />
        <span class="match-vs">:</span>
        <input type="number" class="match-score-input" id="ko-${roundKey}-${mi}-b" placeholder="0" value="${m.sB === null ? '' : m.sB}" />
        <span class="match-team">${m.b}</span>`;
      
      if (m.winner) {
        html += `<span class="match-result winner">🏆 ${m.winner}</span>`;
      }
      
      html += `<button class="ps-btn primary" style="padding:8px 16px;font-size:14px;" onclick="saveKnockoutMatch('${roundKey}',${mi})">حفظ</button>
        <button class="ps-btn ghost" style="padding:8px 16px;font-size:14px;" onclick="clearKnockoutMatch('${roundKey}',${mi})">مسح</button>
      </div>`;
    });
    
    card.innerHTML = html;
    host.appendChild(card);
  });
  
  // Check for champion
  if (state.knockout.FINAL && state.knockout.FINAL[0].winner) {
    const champion = state.knockout.FINAL[0].winner;
    const runnerUp = state.knockout.FINAL[0].loser;
    const thirdPlace = state.knockout.THIRD && state.knockout.THIRD[0].winner ? state.knockout.THIRD[0].winner : null;
    
    renderPodium(host, champion, runnerUp, thirdPlace);
  }
}

function renderPodium(host, first, second, third) {
  const card = document.createElement('div');
  card.className = 'ps-card podium-card';
  
  let html = `<h2 class="podium-title">🏆 منصة التتويج 🏆</h2>
    <div class="podium-container">`;
  
  if (second) {
    html += `<div class="podium-place second">
      <div class="podium-box">
        <div class="podium-icon">🥈</div>
        <div class="podium-team">${second}</div>
        <div class="podium-label">الوصيف</div>
      </div>
    </div>`;
  }
  
  html += `<div class="podium-place first">
    <div class="podium-box">
      <div class="podium-icon">🥇</div>
      <div class="podium-team">${first}</div>
      <div class="podium-label">البطل</div>
    </div>
  </div>`;
  
  if (third) {
    html += `<div class="podium-place third">
      <div class="podium-box">
        <div class="podium-icon">🥉</div>
        <div class="podium-team">${third}</div>
        <div class="podium-label">المركز الثالث</div>
      </div>
    </div>`;
  }
  
  html += `</div>
    <div class="podium-scores">
      🎉 تهانينا للفائزين! 🎉<br>
      شكراً لجميع الفرق المشاركة في البطولة
    </div>`;
  
  card.innerHTML = html;
  host.appendChild(card);
}

function renderOrganizer() {
  renderTeamsList();
  renderGroupsOrg();
  renderBracketsOrg();
}

function renderAudience() {
  const groupsHost = document.getElementById('audience-groups');
  const bracketsHost = document.getElementById('audience-brackets');
  
  if (!groupsHost) return;
  
  groupsHost.innerHTML = '';
  
  const groupCount = Object.keys(state.groups).length;
  if (groupCount === 0) {
    groupsHost.innerHTML = '<div class="ps-card" style="text-align:center;padding:30px;color:#8ab4f8;">لم تبدأ البطولة بعد...</div>';
  } else {
    Object.keys(state.groups).sort((a, b) => a - b).forEach(gi => {
      const card = document.createElement('div');
      card.className = 'ps-card';
      card.style.marginTop = '20px';
      
      const sorted = sortGroup(state.standings[gi] || []);
      let html = `<h3 style="color:#8ab4f8;margin-bottom:20px;">📊 المجموعة ${parseInt(gi) + 1}</h3>`;
      html += '<div style="overflow-x:auto;"><table class="ps-table"><thead><tr>';
      html += '<th>الفريق</th><th>لعب</th><th>فوز</th><th>تعادل</th><th>خسارة</th>';
      html += '<th>له</th><th>عليه</th><th>فرق</th><th>نقاط</th>';
      html += '</tr></thead><tbody>';
      
      sorted.forEach(t => {
        html += `<tr>
          <td style="font-weight:700;">${t.name}</td>
          <td>${t.played}</td>
          <td>${t.win}</td>
          <td>${t.draw}</td>
          <td>${t.lose}</td>
          <td>${t.gf}</td>
          <td>${t.ga}</td>
          <td>${t.gf - t.ga}</td>
          <td><strong style="color:var(--ps-success);">${t.pts}</strong></td>
        </tr>`;
      });
      
      html += '</tbody></table></div>';
      
      const matches = state.matches[gi] || [];
      const playedMatches = matches.filter(m => m.played);
      
      if (playedMatches.length > 0) {
        html += '<details style="margin-top:20px;"><summary>النتائج</summary>';
        playedMatches.forEach(m => {
          html += `<div class="match-pair">
            <span class="match-team">${m.a}</span>
            <span class="match-result ${m.sA > m.sB ? 'winner' : 'loser'}">${m.sA}</span>
            <span class="match-vs">:</span>
            <span class="match-result ${m.sB > m.sA ? 'winner' : 'loser'}">${m.sB}</span>
            <span class="match-team">${m.b}</span>
          </div>`;
        });
        html += '</details>';
      }
      
      card.innerHTML = html;
      groupsHost.appendChild(card);
    });
  }
  
  if (!bracketsHost) return;
  bracketsHost.innerHTML = '';
  
  if (Object.keys(state.knockout).length > 0) {
    ['R2', 'R3', 'SF', 'THIRD', 'FINAL'].forEach(roundKey => {
      if (!state.knockout[roundKey]) return;
      
      const card = document.createElement('div');
      card.className = 'ps-card';
      card.style.marginTop = '20px';
      
      let html = `<h3 style="color:#8ab4f8;margin-bottom:20px;">🏆 ${getRoundName(roundKey)}</h3>`;
      
      state.knockout[roundKey].forEach(m => {
        html += `<div class="match-pair">
          <span class="match-team">${m.a}</span>`;
        
        if (m.sA !== null && m.sB !== null) {
          html += `<span class="match-result ${m.sA > m.sB ? 'winner' : 'loser'}">${m.sA}</span>
            <span class="match-vs">:</span>
            <span class="match-result ${m.sB > m.sA ? 'winner' : 'loser'}">${m.sB}</span>`;
        } else {
          html += `<span style="color:#8ab4f8;padding:0 20px;">VS</span>`;
        }
        
        html += `<span class="match-team">${m.b}</span>`;
        
        if (m.winner) {
          html += `<span class="match-result winner">🏆 ${m.winner}</span>`;
        }
        
        html += `</div>`;
      });
      
      card.innerHTML = html;
      bracketsHost.appendChild(card);
    });
    
    if (state.knockout.FINAL && state.knockout.FINAL[0].winner) {
      const champion = state.knockout.FINAL[0].winner;
      const runnerUp = state.knockout.FINAL[0].loser;
      const thirdPlace = state.knockout.THIRD && state.knockout.THIRD[0].winner ? state.knockout.THIRD[0].winner : null;
      
      renderPodium(bracketsHost, champion, runnerUp, thirdPlace);
    }
  }
}

function resetAll() {
  if (!confirm('⚠️ تحذير!\n\nهل أنت متأكد من حذف جميع البيانات؟\n(الفرق، المجموعات، النتائج، كل شيء)\n\nهذا الإجراء لا يمكن التراجع عنه!')) {
    return;
  }
  
  if (!confirm('تأكيد نهائي: هل أنت متأكد 100%؟')) {
    return;
  }
  
  state.teams = [];
  state.groups = {};
  state.standings = {};
  state.matches = {};
  state.knockout = {};
  
  saveAll();
  renderOrganizer();
  alert('✅ تم مسح جميع البيانات!');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  loadFromFirestore().then(() => {
    if (document.getElementById('teams-list')) renderTeamsList();
    if (document.getElementById('org-groups')) renderGroupsOrg();
    if (document.getElementById('org-brackets')) renderBracketsOrg();
  });
});