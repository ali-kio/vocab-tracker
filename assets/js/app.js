const TOTAL_UNITS = 60;
const MASTERY_TARGET = 3;

const ICONS = {
  play: '<svg class="ic" viewBox="0 0 24 24"><path d="M8 5.5 18 12 8 18.5z"/></svg>',
  bolt: '<svg class="ic" viewBox="0 0 24 24"><path d="M13 3 5 14h6l-1 7 8-11h-6z"/></svg>',
  book: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 5.5c2-1 5-1 7 .5v13c-2-1.5-5-1.5-7-.5z"/><path d="M20 5.5c-2-1-5-1-7 .5v13c2-1.5 5-1.5 7-.5z"/></svg>',
  copy: '<svg class="ic" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  undo: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 9h9a5 5 0 1 1 0 10H9"/><path d="m4 9 4-4M4 9l4 4"/></svg>',
  pencil: '<svg class="ic" viewBox="0 0 24 24"><path d="m4 20 1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/></svg>',
  speaker: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
  check: '<svg class="ic" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>',
  x: '<svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  plusCircle: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/></svg>',
  refresh: '<svg class="ic" viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.5-4.5M4 13a8 8 0 0 0 14.5 4.5"/><path d="M5 3v4h4M19 21v-4h-4"/></svg>',
  moon: '<svg class="ic ic-lg" viewBox="0 0 24 24" style="fill:currentColor;stroke:none;"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/></svg>',
  sun: '<svg class="ic ic-lg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5" style="fill:currentColor;stroke:none;"/><path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>',
  swap: '<svg class="ic" viewBox="0 0 24 24"><path d="M7 7h11l-3.5-3.5M17 17H6l3.5 3.5"/></svg>',
  sparkle: '<svg class="ic" viewBox="0 0 24 24"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/></svg>'
};

let currentLang = 'ar';
let state = null;
let selectedUnit = null;
let practiceQueue = [];
let practiceIndex = 0;
let practiceScore = {correct:0, wrong:0};
let practiceSourceMode = 'all';
let exerciseType = 'flash';
let mcAnswered = false;
let studyUnit = null;
let studyIndex = 0;
let studyOnboarding = false;
let listCategory = 'known';

function unitLabel(i){ return i<=30 ? {book:1,u:i} : {book:2,u:i-30}; }
function getUnitData(i){ return i<=30 ? BOOK1[i-1] : BOOK2[i-31]; }
function escapeHtml(s){
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function wordId(unit, idx){ return `${unit}_${idx}`; }
function escapeRe(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
function shuffleArr(arr){
  for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
  return arr;
}

function defaultState(){
  return { units:{}, words:{}, notebook:{}, challenge:null, theme:null, lang:'ar' };
}

function migrateState(old){
  const s = defaultState();
  s.notebook = old.notebook || {};
  s.theme = old.theme || null;
  s.lang = old.lang || 'ar';
  for(const key in (old.units||{})){
    const rec = old.units[key];
    if(rec && (rec===true || rec.learnedDate)) s.units[key] = true;
  }
  for(const id in (old.words||{})){
    const wr = old.words[id];
    if(wr && typeof wr.wasKnown === 'boolean'){
      s.words[id] = {wasKnown: wr.wasKnown};
      if(wr.wasKnown===false) s.words[id].mastery = typeof wr.mastery==='number' ? wr.mastery : 0;
    }
  }
  return s;
}

async function loadState(){
  try{
    const raw = localStorage.getItem('vocab-progress');
    if(raw){
      const parsed = JSON.parse(raw);
      const looksLegacy = parsed.startDate || Object.values(parsed.units||{}).some(u=>u && typeof u==='object');
      if(looksLegacy) return migrateState(parsed);
      return {
        units: parsed.units || {},
        words: parsed.words || {},
        notebook: parsed.notebook || {},
        challenge: parsed.challenge || null,
        theme: parsed.theme || null,
        lang: parsed.lang || 'ar'
      };
    }
  }catch(e){}
  return defaultState();
}
function saveState(){
  try{ localStorage.setItem('vocab-progress', JSON.stringify(state)); }
  catch(e){ console.error('storage save failed', e); }
}

function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme==='dark' ? 'dark' : 'light');
  const btn = document.getElementById('themeToggle');
  if(btn) btn.innerHTML = theme==='dark' ? ICONS.sun : ICONS.moon;
}
function toggleTheme(){
  const current = document.documentElement.getAttribute('data-theme');
  const next = current==='dark' ? 'light' : 'dark';
  applyTheme(next);
  state.theme = next;
  saveState();
}
function initTheme(){
  let theme = state.theme;
  if(!theme){
    theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  applyTheme(theme);
}

/* ---------- progress helpers ---------- */
function hasAnyProgress(i){
  const unitData = getUnitData(i);
  for(let idx=0; idx<unitData.words.length; idx++){ if(state.words[wordId(i,idx)]) return true; }
  return false;
}
function decidedCount(i){
  const unitData = getUnitData(i);
  let n=0;
  for(let idx=0; idx<unitData.words.length; idx++){ if(state.words[wordId(i,idx)]) n++; }
  return n;
}
function nextUnlearnedUnit(afterIndex){
  for(let i=afterIndex+1;i<=TOTAL_UNITS;i++){ if(!state.units[i]) return i; }
  for(let i=1;i<=afterIndex;i++){ if(!state.units[i]) return i; }
  return null;
}
function findResumeUnit(){
  for(let i=1;i<=TOTAL_UNITS;i++){
    if(state.units[i]) continue;
    if(hasAnyProgress(i)) return i;
  }
  return null;
}
function unlearnUnit(i){
  showConfirm(t('common_reset_unit_confirm'), ()=>{
    delete state.units[i];
    const unitData = getUnitData(i);
    unitData.words.forEach((w, idx)=>{ delete state.words[wordId(i,idx)]; });
    saveState(); renderAll();
  });
}
function countWordStats(){
  let known=0, newer=0;
  for(const id in state.words){
    const wr = state.words[id];
    if(wr.wasKnown===true) known++;
    else if(wr.wasKnown===false) newer++;
  }
  return {known, newer};
}
function reviewCounts(){
  let newActive=0, known=0;
  for(const id in state.words){
    const wr = state.words[id];
    if(wr.wasKnown===false && (wr.mastery||0) < MASTERY_TARGET) newActive++;
    else if(wr.wasKnown===true) known++;
  }
  return {newActive, known};
}

function showConfirm(message, onConfirm){
  const overlay = document.getElementById('confirmOverlay');
  overlay.innerHTML = `
    <div class="confirm-box">
      <div class="confirm-message">${message}</div>
      <div class="confirm-actions">
        <button class="btn ghost" id="confirmCancelBtn">${t('confirm_cancel')}</button>
        <button class="btn" id="confirmOkBtn">${t('confirm_ok')}</button>
      </div>
    </div>`;
  overlay.classList.add('open');
  function cleanup(){ overlay.classList.remove('open'); overlay.innerHTML=''; }
  overlay.onclick = (e)=>{ if(e.target===overlay) cleanup(); };
  document.getElementById('confirmCancelBtn').addEventListener('click', cleanup);
  document.getElementById('confirmOkBtn').addEventListener('click', ()=>{ cleanup(); onConfirm(); });
}
function showAlert(message){
  const overlay = document.getElementById('confirmOverlay');
  overlay.innerHTML = `
    <div class="confirm-box">
      <div class="confirm-message">${message}</div>
      <div class="confirm-actions">
        <button class="btn" id="alertOkBtn">${t('confirm_ok')}</button>
      </div>
    </div>`;
  overlay.classList.add('open');
  function cleanup(){ overlay.classList.remove('open'); overlay.innerHTML=''; }
  overlay.onclick = (e)=>{ if(e.target===overlay) cleanup(); };
  document.getElementById('alertOkBtn').addEventListener('click', cleanup);
}

function speak(text){
  try{
    if(!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang='en-US'; u.rate=0.9;
    window.speechSynthesis.speak(u);
  }catch(e){}
}

function switchTab(name){
  if(name!=='practice' && mcKeyCleanup){ mcKeyCleanup(); mcKeyCleanup=null; }
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.view===name));
  window.scrollTo(0,0);
}
document.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click', ()=>switchTab(b.dataset.view)));

/* ---------- home ---------- */
function renderHome(){
  let unitsLearned=0;
  for(let i=1;i<=TOTAL_UNITS;i++) if(state.units[i]) unitsLearned++;
  const pct = Math.round((unitsLearned/TOTAL_UNITS)*100);
  document.getElementById('unitsLearnedCount').textContent = `${unitsLearned}/${TOTAL_UNITS}`;
  const stats = countWordStats();
  document.getElementById('knownWordsCount').textContent = stats.known;
  document.getElementById('newWordsCount').textContent = stats.newer;
  document.getElementById('pctText').textContent = pct+'%';
  const circ = 201;
  document.getElementById('ringFg').setAttribute('stroke-dashoffset', circ-(circ*pct/100));

  const resumeUnit = findResumeUnit();
  const nxt = resumeUnit || nextUnlearnedUnit(0);
  const card = document.getElementById('continueUnitCard');
  if(nxt){
    const lab = unitLabel(nxt);
    let note = t('home_not_started_note');
    if(resumeUnit === nxt){
      const dc = decidedCount(nxt);
      const total = getUnitData(nxt).words.length;
      note = t('home_resume_note', {n:dc+1, total});
    }
    card.innerHTML = `<div class="unit-row">
      <div>
        <div class="title"><span class="num mono">#${nxt}</span> — ${t('detail_unit_label',{book:lab.book,u:lab.u})} <span class="mono" style="color:var(--text-dim);font-size:11px">(20)</span></div>
        <div class="meta">${note}</div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn ghost" onclick="goToUnit(${nxt})">${t('home_view_btn')}</button>
        <button class="btn" onclick="startStudyMode(${nxt})">${ICONS.bolt}${resumeUnit===nxt?t('home_resume_btn'):t('home_start_btn')}</button>
      </div>
    </div>`;
  } else {
    card.innerHTML = `<div class="empty">${ICONS.sparkle}${t('home_all_done')}<br>${t('home_all_done_sub')}</div>`;
  }
}

/* ---------- challenge ---------- */
function pickChallengeWords(n){
  const pool = Object.keys(state.words);
  return shuffleArr(pool.slice()).slice(0,n);
}
function renderChallenge(){
  const el = document.getElementById('challengeCard');
  if(!el) return;
  const learnedUnitsCount = Object.keys(state.units).length;
  if(learnedUnitsCount < 2){
    el.innerHTML = `<div class="empty" style="padding:10px 0;">${t('home_challenge_locked')}</div>`;
    return;
  }
  if(!state.challenge || !state.challenge.wordIds || !state.challenge.wordIds.length){
    const wordIds = pickChallengeWords(5);
    if(!wordIds.length){
      el.innerHTML = `<div class="empty" style="padding:10px 0;">${t('home_challenge_empty')}</div>`;
      return;
    }
    state.challenge = {wordIds, text:''};
    saveState();
  }
  const ch = state.challenge;
  const chips = ch.wordIds.map(id=>{
    const parts = id.split('_'); const unit=parseInt(parts[0]), idx=parseInt(parts[1]);
    const unitData = getUnitData(unit);
    const term = unitData ? unitData.words[idx][0] : '?';
    return `<span class="challenge-word">${term}</span>`;
  }).join('');
  el.innerHTML = `
    <h3>${t('home_challenge_prompt')}</h3>
    <div class="challenge-words">${chips}</div>
    <textarea id="challengeTextarea" dir="auto" placeholder="${t('home_challenge_placeholder')}" onblur="saveChallengeText(this.value)">${escapeHtml(ch.text)}</textarea>
    <div class="challenge-actions">
      <button class="btn ghost" onclick="copyText(document.getElementById('challengeTextarea').value)">${ICONS.copy}${t('home_challenge_copy')}</button>
      <button class="btn secondary" onclick="regenerateChallenge()">${ICONS.refresh}${t('home_challenge_refresh')}</button>
    </div>
    <div class="notebook-hint">${t('home_challenge_autosave')}</div>`;
}
function saveChallengeText(value){
  if(!state.challenge) return;
  state.challenge.text = value;
  saveState();
}
function regenerateChallenge(){
  const doRegenerate = ()=>{
    state.challenge = {wordIds: pickChallengeWords(5), text:''};
    saveState();
    renderChallenge();
  };
  if(state.challenge && state.challenge.text && state.challenge.text.trim()){
    showConfirm(t('home_challenge_confirm_refresh'), doRegenerate);
  } else {
    doRegenerate();
  }
}
function goToUnit(i){ switchTab('map'); selectUnit(i); }

/* ---------- map ---------- */
function renderMap(){
  renderGrid('gridBook1', 30, 0);
  renderGrid('gridBook2', 30, 30);
  if(selectedUnit) renderDetail();
}
function renderGrid(containerId, count, offset){
  const el = document.getElementById(containerId);
  let html='';
  for(let u=1; u<=count; u++){
    const i=offset+u;
    let cls='';
    if(state.units[i]) cls='learned';
    else if(hasAnyProgress(i)) cls='partial';
    html += `<div class="cell ${cls}" onclick="selectUnit(${i})">${u}</div>`;
  }
  el.innerHTML = html;
}
function selectUnit(i){
  selectedUnit = i;
  renderDetail();
  document.getElementById('detailOverlay').classList.add('open');
}
function closeDetail(){
  document.getElementById('detailOverlay').classList.remove('open');
  selectedUnit = null;
}
function getArabic(unit, idx){
  const arr = unit<=30 ? AR1[unit-1] : AR2[unit-31];
  return arr ? arr[idx] : '';
}
function toggleAr(btnEl, revealId){
  const el = document.getElementById(revealId);
  if(!el) return;
  el.classList.toggle('show');
}
function getSyn(unit, idx){
  const arr = unit<=30 ? SYN1[unit-1] : SYN2[unit-31];
  return (arr && arr[idx]) ? arr[idx] : null;
}

/* ---------- study / onboarding ---------- */
function startStudyMode(i){
  studyUnit = i;
  const unitData = getUnitData(i);
  studyOnboarding = !state.units[i];
  document.getElementById('studyOverlay').classList.add('open');
  if(studyOnboarding){
    let startIdx = unitData.words.length;
    for(let idx=0; idx<unitData.words.length; idx++){
      if(!state.words[wordId(i,idx)]){ startIdx = idx; break; }
    }
    if(startIdx >= unitData.words.length){
      studyIndex = unitData.words.length-1;
      finishOnboarding();
      return;
    }
    studyIndex = startIdx;
  } else {
    studyIndex = 0;
  }
  renderStudyCard();
}
function closeStudy(){
  document.getElementById('studyOverlay').classList.remove('open');
  studyUnit = null;
  renderAll();
}
function scrollStudyToTop(){
  const card = document.querySelector('.study-card');
  if(card) card.scrollTop = 0;
}
function studyNav(delta){
  const unitData = getUnitData(studyUnit);
  studyIndex = Math.max(0, Math.min(unitData.words.length-1, studyIndex+delta));
  renderStudyCard();
}
function decideWord(knowsIt){
  const i = studyUnit, idx = studyIndex;
  const wId = wordId(i, idx);
  state.words[wId] = knowsIt ? {wasKnown:true} : {wasKnown:false, mastery:0};
  saveState();
  const unitData = getUnitData(i);
  let nextIdx = idx+1;
  while(nextIdx < unitData.words.length && state.words[wordId(i,nextIdx)]){ nextIdx++; }
  if(nextIdx < unitData.words.length){
    studyIndex = nextIdx;
    renderStudyCard();
  } else {
    finishOnboarding();
  }
}
function finishOnboarding(){
  const i = studyUnit;
  state.units[i] = true;
  saveState();
  const lab = unitLabel(i);
  const unitData = getUnitData(i);
  let know=0, dontknow=0;
  unitData.words.forEach((w,idx)=>{
    const wr = state.words[wordId(i,idx)];
    if(wr && wr.wasKnown===true) know++;
    else if(wr && wr.wasKnown===false) dontknow++;
  });
  const total = know + dontknow;
  const nxt = nextUnlearnedUnit(i);
  let nextBtn = '';
  if(nxt){
    const nl = unitLabel(nxt);
    nextBtn = `<button class="btn wide" style="margin-top:10px;" onclick="startStudyMode(${nxt})">${ICONS.bolt}${t('study_done_continue',{i:nxt, book:nl.book, u:nl.u})}</button>`;
  }
  document.getElementById('studyContent').innerHTML = `
    <div style="text-align:center;">
      <div style="font-size:18px; color:var(--text); font-weight:800; display:flex; align-items:center; justify-content:center; gap:6px;">${ICONS.check}${t('study_done_title',{i, book:lab.book, u:lab.u})}</div>
      <div style="color:var(--text-dim); font-size:13px; margin-top:8px; line-height:1.8;">
        ${t('study_done_knew',{know, total})}<br>
        ${t('study_done_new',{n:dontknow})}<br>
        <span style="font-size:11.5px;">${t('study_done_note')}</span>
      </div>
    </div>
    <button class="btn wide ghost" style="margin-top:14px;" onclick="closeStudy()">${t('study_done_ok')}</button>
    ${nextBtn}`;
  studyOnboarding = false;
  scrollStudyToTop();
  renderAll();
}
function renderStudyCard(){
  const i = studyUnit;
  const unitData = getUnitData(i);
  const idx = studyIndex;
  const w = unitData.words[idx];
  const wId = wordId(i, idx);
  const arText = getArabic(i, idx);
  const info = getSyn(i, idx);
  const savedSentence = state.notebook[wId] || '';

  let synHtml = `<div class="study-empty-note">${t('study_no_synonyms')}</div>`;
  let antHtml = `<div class="study-empty-note">${t('study_no_antonyms')}</div>`;
  let usageHtml = '';
  let ex2Html = '';
  if(info){
    if(info.ex2) ex2Html = `<div class="study-section"><h4>${t('study_extra_example')}</h4><div class="study-ex" dir="ltr" style="margin-bottom:0;">"${info.ex2}"</div></div>`;
    synHtml = (info.syn && info.syn.length)
      ? `<div class="study-chip-row">${info.syn.map(s=>`<span class="study-chip syn" dir="ltr">${s[0]} <span dir="rtl">(${s[1]})</span></span>`).join('')}</div>`
      : synHtml;
    antHtml = (info.ant && info.ant.length)
      ? `<div class="study-chip-row">${info.ant.map(a=>`<span class="study-chip ant" dir="ltr">${a[0]} <span dir="rtl">(${a[1]})</span></span>`).join('')}</div>`
      : antHtml;
    if(info.usage) usageHtml = `<div class="study-section"><h4>${t('study_usage_label')}</h4><div style="font-size:12.5px; line-height:1.7;" dir="ltr">${info.usage}</div></div>`;
  }

  const wordDecision = state.words[wId];
  const hasDecision = !!(wordDecision && wordDecision.wasKnown !== undefined);

  const navHtml = studyOnboarding
    ? `<div class="study-nav" style="flex-direction:column;">
        ${hasDecision ? `<div style="text-align:center; font-size:11.5px; color:var(--text-dim); margin-bottom:2px;">${t('study_your_choice')} <b style="color:${wordDecision.wasKnown?'var(--mint)':'var(--warn)'}">${wordDecision.wasKnown?t('tag_known'):t('tag_new')}</b></div>` : ''}
        <div style="display:flex; gap:8px;">
          <button class="btn secondary${hasDecision && !wordDecision.wasKnown ? ' selected':''}" style="flex:1;" onclick="decideWord(false)">${ICONS.plusCircle}${t('decide_new_btn')}</button>
          <button class="btn${hasDecision && wordDecision.wasKnown ? ' selected':''}" style="flex:1;" onclick="decideWord(true)">${ICONS.check}${t('decide_known_btn')}</button>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn ghost" style="flex:1;" ${idx===0?'disabled':''} onclick="studyNav(-1)">${ICONS.undo}${t('study_prev_word')}</button>
          ${hasDecision ? `<button class="btn ghost" style="flex:1;" onclick="studyNav(1)">${t('study_next_word')}</button>` : ''}
        </div>
      </div>`
    : `<div class="study-nav">
        <button class="btn secondary" ${idx===0?'disabled':''} onclick="studyNav(-1)">${t('study_prev_word')}</button>
        <button class="btn" ${idx===unitData.words.length-1?'disabled':''} onclick="studyNav(1)">${t('study_next_word')}</button>
      </div>`;

  const content = document.getElementById('studyContent');
  content.innerHTML = `
    <div class="study-progress">${t('study_progress',{i, idx:idx+1, total:unitData.words.length})}${studyOnboarding?t('study_first_time'):''}</div>
    <div class="study-term">${w[0]}</div>
    <div class="study-type">(${w[1]})</div>
    <div class="study-def" dir="ltr">${w[2]}</div>
    <div class="study-ex" dir="ltr">"${w[3]}"</div>
    <button class="ar-toggle" onclick="toggleAr(this,'study_ar')">${ICONS.book}${t('detail_arabic_toggle')}</button>
    <div class="ar-reveal" dir="rtl" id="study_ar">${arText}</div>
    ${usageHtml}
    ${ex2Html}
    <div class="study-section"><h4>${t('study_synonyms')}</h4>${synHtml}</div>
    <div class="study-section"><h4>${t('study_antonyms')}</h4>${antHtml}</div>
    <div class="study-section">
      <h4>${t('study_my_sentence')}</h4>
      <textarea dir="ltr" placeholder="${t('study_sentence_placeholder')}" onblur="saveNotebookEntry('${wId}', this.value)" style="width:100%; min-height:50px; background:var(--card2); border:1.5px solid var(--border); color:var(--text); border-radius:8px; padding:8px 10px; font-family:'Comfortaa',sans-serif; font-size:12.5px;">${escapeHtml(savedSentence)}</textarea>
    </div>
    <button class="btn wide ghost" style="margin-top:12px;" onclick="copyStudyCard()">${ICONS.copy}${t('study_copy_card')}</button>
    ${navHtml}`;
  scrollStudyToTop();
}
function copyText(text){
  const showToast = ()=>{
    const el = document.getElementById('copyToast');
    el.classList.add('show');
    setTimeout(()=>el.classList.remove('show'), 1500);
  };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(showToast).catch(()=>fallbackCopy(text, showToast));
  } else {
    fallbackCopy(text, showToast);
  }
}
function fallbackCopy(text, cb){
  try{
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    if(cb) cb();
  }catch(e){}
}
function copyStudyCard(){
  const i = studyUnit, idx = studyIndex;
  const unitData = getUnitData(i);
  const w = unitData.words[idx];
  const wId = wordId(i, idx);
  const info = getSyn(i, idx);
  const ar = getArabic(i, idx);
  const sentence = state.notebook[wId] || '';
  let text = `${w[0]} (${w[1]})\nEN: ${w[2]}\nEx: "${w[3]}"\nAR: ${ar}\n`;
  if(info){
    if(info.usage) text += `Usage: ${info.usage}\n`;
    if(info.ex2) text += `Ex2: "${info.ex2}"\n`;
    if(info.syn && info.syn.length) text += `Synonyms: ${info.syn.map(s=>`${s[0]} (${s[1]})`).join(' · ')}\n`;
    if(info.ant && info.ant.length) text += `Antonyms: ${info.ant.map(a=>`${a[0]} (${a[1]})`).join(' · ')}\n`;
  }
  if(sentence) text += `My sentence: ${sentence}\n`;
  copyText(text);
}
function copyAllNotebook(i){
  const unitData = getUnitData(i);
  const lines = [];
  unitData.words.forEach((w, idx)=>{
    const sentence = state.notebook[wordId(i,idx)];
    if(sentence && sentence.trim()) lines.push(`${w[0]}: ${sentence.trim()}`);
  });
  if(!lines.length){ showAlert(t('copy_all_notebook_empty')); return; }
  copyText(lines.join('\n'));
}
function toggleNotebook(nbId){
  const el = document.getElementById(nbId);
  if(!el) return;
  el.classList.toggle('show');
  if(el.classList.contains('show')){
    const ta = el.querySelector('textarea');
    if(ta) ta.focus();
  }
}
function saveNotebookEntry(wId, value){
  state.notebook[wId] = value;
  saveState();
}

/* ---------- unit detail ---------- */
function renderDetail(){
  if(!selectedUnit) return;
  const i=selectedUnit;
  const lab=unitLabel(i);
  const learned = !!state.units[i];
  const progress = hasAnyProgress(i);
  const unitData = getUnitData(i);
  const content = document.getElementById('detailContent');

  let body = `<h3 style="margin-top:6px;"><span class="mono">#${i}</span> — ${t('detail_unit_label',{book:lab.book,u:lab.u})}</h3>`;

  if(!learned && !progress){
    const preview = unitData.words.map(w=>`<span class="study-chip" dir="ltr">${w[0]} <span style="color:var(--text-dim)">(${w[1]})</span></span>`).join('');
    body += `<div class="study-chip-row" style="margin:10px 0 14px;">${preview}</div>`;
    body += `<button class="btn wide" onclick="closeDetail(); startStudyMode(${i});">${ICONS.play}${t('detail_start_btn')}</button>`;
    content.innerHTML = body;
    return;
  }

  if(!learned && progress){
    const dc = decidedCount(i);
    body += `<div class="card" style="margin-bottom:12px;">
      <div class="unit-row">
        <div class="meta">${t('detail_progress_note',{n:dc, total:unitData.words.length})}</div>
        <button class="btn" onclick="closeDetail(); startStudyMode(${i});">${ICONS.bolt}${t('detail_resume_btn',{n:dc+1})}</button>
      </div>
    </div>`;
  } else if(learned){
    body += `<div class="bulk-actions" style="margin-bottom:12px;">
      <button class="btn ghost" onclick="closeDetail(); startStudyMode(${i});">${ICONS.book}${t('detail_review_flash')}</button>
      <button class="btn ghost" onclick="scrollToStory()">${ICONS.sparkle}${t('detail_read_story')}</button>
      <button class="btn ghost" onclick="copyAllNotebook(${i})">${ICONS.copy}${t('detail_copy_sentences')}</button>
      <button class="btn secondary" onclick="unlearnUnit(${i})">${ICONS.undo}${t('detail_reset_unit')}</button>
    </div>`;
  }

  body += `<div class="wordlist">`;
  unitData.words.forEach((w, idx)=>{
    const wr = state.words[wordId(i,idx)];
    let tag = '';
    if(wr && wr.wasKnown===true) tag = `<span class="word-tag known">${t('tag_known')}</span>`;
    else if(wr && wr.wasKnown===false){
      tag = `<span class="word-tag new-word">${t('tag_new')} ${mastDots(wr.mastery||0)}</span>`;
      if(wr.downgradeReason==='missed_known_review') tag += `<div class="downgrade-note">${t('tag_downgrade_reason')}</div>`;
    }
    const revealId = `ar_${i}_${idx}`;
    const nbId = `nb_${i}_${idx}`;
    const wId = wordId(i,idx);
    const savedSentence = state.notebook[wId] || '';
    body += `<div class="word-item">
      <div class="word-head" dir="ltr">
        <span class="term">${w[0]}</span><span class="type">(${w[1]})</span>
        <button class="spk" onclick="speak('${w[0].replace(/'/g,"\\'")}')" aria-label="${t('common_speaker_aria')}">${ICONS.speaker}</button>
      </div>
      <div class="word-def" dir="ltr">${w[2]}</div>
      <div class="word-ex" dir="ltr">"${w[3]}"</div>
      <button class="ar-toggle" style="margin-top:6px;" onclick="toggleAr(this,'${revealId}')">${ICONS.book}${t('detail_arabic_toggle')}</button>
      <div class="ar-reveal" dir="rtl" id="${revealId}">${getArabic(i,idx)}</div>
      <button class="ar-toggle" onclick="toggleNotebook('${nbId}')" style="margin-top:6px;">${ICONS.pencil}${t('detail_my_sentence')}</button>
      <div class="notebook-box${savedSentence?' show':''}" id="${nbId}">
        <textarea dir="ltr" placeholder="${t('detail_sentence_placeholder',{word:w[0]})}" onblur="saveNotebookEntry('${wId}', this.value)" style="font-family:'Comfortaa',sans-serif;">${escapeHtml(savedSentence)}</textarea>
        <div class="notebook-hint">${t('detail_autosave_hint')}</div>
      </div>
      ${tag ? `<div style="margin-top:6px;">${tag}</div>` : ''}
    </div>`;
  });
  body += `</div>`;
  body += `<div class="story-box" id="storyBox" dir="ltr"><span class="story-title">${unitData.story.title}</span>${unitData.story.text}</div>`;
  content.innerHTML = body;
}
function scrollToStory(){
  const el = document.getElementById('storyBox');
  if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
}
function mastDots(m){
  let html = '<span class="mastery-dots">';
  for(let k=0;k<MASTERY_TARGET;k++) html += `<i class="${k<m?'filled':''}"></i>`;
  html += '</span>';
  return html;
}

/* ---------- practice / review ---------- */
function renderReviewCards(){
  const counts = reviewCounts();
  const newCard = document.getElementById('reviewNewCard');
  const knownCard = document.getElementById('reviewKnownCard');
  if(!newCard || !knownCard) return;
  newCard.innerHTML = `
    <div class="review-card-head"><span class="review-dot new"></span><h3>${t('practice_new_review_title')}</h3></div>
    <div class="review-count">${counts.newActive}</div>
    <div class="review-sub">${t('practice_new_review_sub')}</div>
    <button class="btn wide" ${counts.newActive===0?'disabled':''} onclick="quickReview('new')">${ICONS.bolt}${t('practice_new_review_btn')}</button>
    <div class="review-note">${t('practice_new_review_note',{n:MASTERY_TARGET})}</div>`;
  knownCard.innerHTML = `
    <div class="review-card-head"><span class="review-dot known"></span><h3>${t('practice_known_review_title')}</h3></div>
    <div class="review-count">${counts.known}</div>
    <div class="review-sub">${t('practice_known_review_sub')}</div>
    <button class="btn wide secondary" ${counts.known===0?'disabled':''} onclick="quickReview('known')">${ICONS.check}${t('practice_known_review_btn')}</button>
    <div class="review-note">${t('practice_known_review_note')}</div>`;
}

/* ---- custom picker system (replaces native <select>) ---- */
function showPicker(title, options, currentValue, onSelect){
  const overlay = document.getElementById('confirmOverlay');
  overlay.innerHTML = `
    <div class="confirm-box picker-box">
      <div class="picker-title">${title}</div>
      <div class="picker-list">
        ${options.map(o=>`<button class="picker-opt${String(o.value)===String(currentValue)?' active':''}" data-value="${o.value}">${o.label}</button>`).join('')}
      </div>
      <button class="btn ghost wide" id="pickerCancelBtn">${t('confirm_cancel')}</button>
    </div>`;
  overlay.classList.add('open');
  function cleanup(){ overlay.classList.remove('open'); overlay.innerHTML=''; }
  overlay.onclick = (e)=>{ if(e.target===overlay) cleanup(); };
  overlay.querySelectorAll('.picker-opt').forEach(btn=>{
    btn.addEventListener('click', ()=>{ const v=btn.dataset.value; cleanup(); onSelect(v); });
  });
  document.getElementById('pickerCancelBtn').addEventListener('click', cleanup);
}
function unitOptionsList(){
  const opts=[];
  for(let i=1;i<=TOTAL_UNITS;i++){
    const lab=unitLabel(i);
    opts.push({value:i, label:t('lists_unit_option',{book:lab.book,u:lab.u})});
  }
  return opts;
}

let practiceSource = 'all';
let scopeMode = 'all';
let scopeFrom = 1;
let scopeTo = TOTAL_UNITS;
let scopeRandomCount = 40;
let singleUnit = null;

function refreshPracticeSetupUI(){
  const sourceLabels = {all:t('practice_source_all'), known:t('practice_source_known'), new:t('practice_source_new'), unit:t('practice_source_unit_full')};
  document.getElementById('sourcePickerBtn').textContent = sourceLabels[practiceSource];
  const isUnit = practiceSource==='unit';
  document.getElementById('scopeBlock').style.display = isUnit ? 'none' : 'flex';
  document.getElementById('unitPickBlock').style.display = isUnit ? 'flex' : 'none';

  const scopeLabels = {all:t('scope_all'), range:t('scope_range'), random:t('scope_random')};
  document.getElementById('scopePickerBtn').textContent = scopeLabels[scopeMode];
  document.getElementById('scopeRangeRow').style.display = scopeMode==='range' ? 'flex' : 'none';
  document.getElementById('scopeRandomRow').style.display = scopeMode==='random' ? 'block' : 'none';

  const fromLab = unitLabel(scopeFrom), toLab = unitLabel(scopeTo);
  document.getElementById('fromUnitBtn').textContent = t('lists_unit_option',{book:fromLab.book,u:fromLab.u});
  document.getElementById('toUnitBtn').textContent = t('lists_unit_option',{book:toLab.book,u:toLab.u});
  document.getElementById('randomCountBtn').textContent = t('scope_random_count_value',{n:scopeRandomCount});

  if(!singleUnit) singleUnit = nextUnlearnedUnit(0) || 1;
  const suLab = unitLabel(singleUnit);
  document.getElementById('singleUnitBtn').textContent = t('lists_unit_option',{book:suLab.book,u:suLab.u});

  const isReviewSource = practiceSource==='new' || practiceSource==='known';
  const seg = document.getElementById('exerciseTypeSeg');
  if(isReviewSource){
    if(exerciseType!=='flash' && exerciseType!=='mixed') exerciseType = 'mixed';
    seg.innerHTML = `
      <button class="${exerciseType==='flash'?'active':''}" data-type="flash">${t('practice_exercise_flash')}</button>
      <button class="${exerciseType==='mixed'?'active':''}" data-type="mixed">${t('practice_exercise_mixed')}</button>`;
  } else {
    if(exerciseType==='mixed') exerciseType = 'flash';
    seg.innerHTML = `
      <button class="${exerciseType==='flash'?'active':''}" data-type="flash">${t('practice_exercise_flash')}</button>
      <button class="${exerciseType==='mc'?'active':''}" data-type="mc">${t('practice_exercise_mc')}</button>
      <button class="${exerciseType==='type'?'active':''}" data-type="type">${t('practice_exercise_type')}</button>`;
  }
  updateExerciseNote();
}
function updateExerciseNote(){
  const note = document.getElementById('exerciseNote');
  if(!note) return;
  const isReviewSource = practiceSource==='new' || practiceSource==='known';
  if(!isReviewSource){ note.style.display='none'; return; }
  note.style.display='block';
  note.textContent = exerciseType==='flash' ? t('practice_exercise_note_personal') : t('practice_exercise_note_counted');
}
function openSourcePicker(){
  showPicker(t('picker_title_source'), [
    {value:'all', label:t('practice_source_all')},
    {value:'known', label:t('practice_source_known')},
    {value:'new', label:t('practice_source_new')},
    {value:'unit', label:t('practice_source_unit_full')}
  ], practiceSource, (v)=>{ practiceSource=v; refreshPracticeSetupUI(); });
}
function openScopePicker(){
  showPicker(t('picker_title_scope'), [
    {value:'all', label:t('scope_all')},
    {value:'range', label:t('scope_range')},
    {value:'random', label:t('scope_random')}
  ], scopeMode, (v)=>{ scopeMode=v; refreshPracticeSetupUI(); });
}
function openFromUnitPicker(){
  showPicker(t('scope_from'), unitOptionsList(), scopeFrom, (v)=>{
    scopeFrom = parseInt(v);
    if(scopeFrom>scopeTo) scopeTo = scopeFrom;
    refreshPracticeSetupUI();
  });
}
function openToUnitPicker(){
  showPicker(t('scope_to'), unitOptionsList(), scopeTo, (v)=>{
    scopeTo = parseInt(v);
    if(scopeTo<scopeFrom) scopeFrom = scopeTo;
    refreshPracticeSetupUI();
  });
}
function openRandomCountPicker(){
  const counts = [10,20,30,40,50,75,100];
  showPicker(t('scope_random_count_label'), counts.map(n=>({value:n, label:t('scope_random_count_value',{n})})), scopeRandomCount, (v)=>{
    scopeRandomCount = parseInt(v); refreshPracticeSetupUI();
  });
}
function openSingleUnitPicker(){
  showPicker(t('pick_unit_label'), unitOptionsList(), singleUnit, (v)=>{
    singleUnit = parseInt(v); refreshPracticeSetupUI();
  });
}
function quickReview(source){
  practiceSource = source;
  scopeMode = 'all';
  refreshPracticeSetupUI();
  document.getElementById('practiceSetupCard').scrollIntoView({behavior:'smooth', block:'center'});
}
document.getElementById('exerciseTypeSeg').addEventListener('click', (e)=>{
  const b = e.target.closest('button');
  if(!b) return;
  document.querySelectorAll('#exerciseTypeSeg button').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  exerciseType = b.dataset.type;
  updateExerciseNote();
});
document.getElementById('startPracticeBtn').addEventListener('click', startPractice);
document.getElementById('practiceAgainBtn').addEventListener('click', ()=>{
  document.getElementById('practiceSummary').style.display='none';
  document.getElementById('practiceSession').style.display='none';
  document.getElementById('practiceSetupWrap').style.display='block';
});

function startPractice(){
  practiceSourceMode = practiceSource;
  practiceQueue = [];
  practiceScore = {correct:0, wrong:0};
  practiceIndex = 0;

  if(practiceSource==='unit'){
    const unitData = getUnitData(singleUnit);
    unitData.words.forEach((w,idx)=>{
      practiceQueue.push({word:w, unit:singleUnit, idx, wordId:wordId(singleUnit,idx)});
    });
    shuffleArr(practiceQueue);
  } else {
    for(const id in state.words){
      const wr = state.words[id];
      if(practiceSource==='known' && wr.wasKnown!==true) continue;
      if(practiceSource==='new' && (wr.wasKnown!==false || (wr.mastery||0)>=MASTERY_TARGET)) continue;
      const parts = id.split('_');
      const unit = parseInt(parts[0]), idx = parseInt(parts[1]);
      if(scopeMode==='range' && (unit<scopeFrom || unit>scopeTo)) continue;
      const unitData = getUnitData(unit);
      if(!unitData) continue;
      practiceQueue.push({word:unitData.words[idx], unit, idx, wordId:id, mastery:wr.mastery||0});
    }
    if(scopeMode==='random'){
      shuffleArr(practiceQueue);
      practiceQueue = practiceQueue.slice(0, scopeRandomCount);
    } else if(practiceSource==='new'){
      practiceQueue.sort((a,b)=>a.mastery-b.mastery);
    } else {
      shuffleArr(practiceQueue);
    }
  }

  if(!practiceQueue.length){ showAlert(t('practice_no_words_alert')); return; }

  switchTab('practice');
  document.getElementById('practiceSetupWrap').style.display='none';
  document.getElementById('practiceSession').style.display='block';
  document.getElementById('practiceSummary').style.display='none';
  renderExercise();
}
function cancelPractice(){
  if(mcKeyCleanup){ mcKeyCleanup(); mcKeyCleanup=null; }
  practiceQueue = []; practiceIndex = 0;
  document.getElementById('practiceSession').style.display='none';
  document.getElementById('practiceSetupWrap').style.display='block';
}

function answerResult(item, correct){
  if(correct) practiceScore.correct++; else practiceScore.wrong++;

  if(practiceSourceMode==='new' && exerciseType!=='flash'){
    if(!state.words[item.wordId]) state.words[item.wordId] = {wasKnown:false, mastery:0};
    const wr = state.words[item.wordId];
    wr.wasKnown = false;
    wr.mastery = correct ? Math.min(MASTERY_TARGET, (wr.mastery||0)+1) : 0;
    saveState();
  } else if(practiceSourceMode==='known' && exerciseType==='mixed'){
    const wr = state.words[item.wordId];
    if(wr){
      if(correct){
        wr.missStreak = 0;
      } else {
        wr.missStreak = (wr.missStreak||0) + 1;
        if(wr.missStreak >= 2){
          wr.wasKnown = false;
          wr.mastery = 0;
          wr.missStreak = 0;
          wr.downgradeReason = 'missed_known_review';
        }
      }
      saveState();
    }
  }

  practiceIndex++;
  setTimeout(renderExercise, 450);
}

let mcKeyCleanup = null;

function renderExercise(){
  if(mcKeyCleanup){ mcKeyCleanup(); mcKeyCleanup=null; }
  document.getElementById('flashCounter').textContent = practiceIndex<practiceQueue.length ? `${practiceIndex+1} / ${practiceQueue.length}` : '';
  if(practiceIndex >= practiceQueue.length){ finishPractice(); return; }
  const item = practiceQueue[practiceIndex];
  const area = document.getElementById('exerciseArea');
  let effectiveType = exerciseType;
  if(exerciseType==='mixed') effectiveType = Math.random()<0.5 ? 'mc' : 'type';
  if(effectiveType==='flash') renderFlashExercise(item, area);
  else if(effectiveType==='mc') renderMCExercise(item, area);
  else renderTypeExercise(item, area);
}

function renderFlashExercise(item, area){
  let flipped=false;
  const arText = getArabic(item.unit, item.idx);
  area.innerHTML = `<div class="flash" id="fcard" dir="ltr">
      <div class="term">${item.word[0]}</div>
      <div class="type">(${item.word[1]})</div>
      <div class="hint">${t('practice_flip_hint')}</div>
    </div>
    <div class="flash-actions" id="fActions" style="display:none;">
      <button class="btn secondary" id="fNo">${ICONS.x}${t('practice_need_review')}</button>
      <button class="btn" id="fYes">${ICONS.check}${t('practice_know_it')}</button>
    </div>`;
  document.getElementById('fcard').addEventListener('click', ()=>{
    if(flipped) return; flipped=true;
    document.getElementById('fcard').innerHTML = `
      <div class="term" style="font-size:20px;">${item.word[0]}</div>
      <div class="def">${item.word[2]}</div>
      <div class="ex">"${item.word[3]}"</div>
      <button class="ar-toggle" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle('show');">${ICONS.book}${t('detail_arabic_toggle')}</button>
      <div class="ar-reveal" dir="rtl">${arText}</div>`;
    document.getElementById('fActions').style.display='flex';
  });
  document.getElementById('fYes').addEventListener('click', ()=>answerResult(item, true));
  document.getElementById('fNo').addEventListener('click', ()=>answerResult(item, false));
}

function pickDistractors(correctWordText, n){
  const pool=[];
  BOOK1.forEach(u=>u.words.forEach(w=>pool.push(w[2])));
  BOOK2.forEach(u=>u.words.forEach(w=>pool.push(w[2])));
  const filtered = shuffleArr(pool.filter(d=>d!==correctWordText));
  return filtered.slice(0,n);
}
function renderMCExercise(item, area){
  const correct = item.word[2];
  const options = shuffleArr(pickDistractors(correct, 3).concat([correct]));
  area.innerHTML = `<div class="flash" dir="ltr" style="cursor:default;">
      <div class="term">${item.word[0]}</div>
      <div class="type">(${item.word[1]})</div>
    </div>
    <div class="mc-options" id="mcOpts"></div>`;
  const optsEl = document.getElementById('mcOpts');
  mcAnswered = false;
  const buttons = [];
  options.forEach((opt, idx)=>{
    const btn = document.createElement('button');
    btn.className = 'mc-opt'; btn.dir='ltr'; btn.dataset.opt = opt;
    btn.innerHTML = `<span class="mc-key">${idx+1}</span><span>${escapeHtml(opt)}</span>`;
    btn.addEventListener('click', ()=>{
      if(mcAnswered) return; mcAnswered=true;
      const isCorrect = btn.dataset.opt===correct;
      btn.classList.add(isCorrect?'correct':'wrong');
      if(!isCorrect){
        [...optsEl.children].forEach(c=>{ if(c.dataset.opt===correct) c.classList.add('correct'); });
      }
      setTimeout(()=>answerResult(item, isCorrect), 600);
    });
    optsEl.appendChild(btn);
    buttons.push(btn);
  });
  function keyHandler(e){
    const n = parseInt(e.key);
    if(n>=1 && n<=buttons.length) buttons[n-1].click();
  }
  document.addEventListener('keydown', keyHandler);
  mcKeyCleanup = ()=>document.removeEventListener('keydown', keyHandler);
}

function renderTypeExercise(item, area){
  const term = item.word[0];
  const re = new RegExp(escapeRe(term), 'gi');
  const blankedEx = item.word[3].replace(re, '_____');
  area.innerHTML = `<div class="flash" dir="ltr" style="cursor:default;">
      <div class="type">(${item.word[1]})</div>
      <div class="def">${item.word[2]}</div>
      <div class="ex">"${blankedEx}"</div>
    </div>
    <div class="type-input-row">
      <input type="text" id="typeInput" placeholder="${t('practice_type_placeholder')}" autocomplete="off" autocapitalize="off" spellcheck="false">
      <button class="btn" id="typeSubmit">${t('practice_check_btn')}</button>
    </div>
    <div class="type-feedback" id="typeFeedback"></div>`;
  const input = document.getElementById('typeInput');
  input.focus();
  let submitted=false;
  function submit(){
    if(submitted) return; submitted=true;
    const val = input.value.trim().toLowerCase();
    const isCorrect = val === term.toLowerCase();
    const fb = document.getElementById('typeFeedback');
    fb.innerHTML = isCorrect ? `${ICONS.check}${t('practice_correct')}` : `${ICONS.x}${t('practice_wrong',{word:term})}`;
    fb.className = 'type-feedback ' + (isCorrect?'ok':'bad');
    input.disabled = true;
    document.getElementById('typeSubmit').disabled = true;
    setTimeout(()=>answerResult(item, isCorrect), 900);
  }
  document.getElementById('typeSubmit').addEventListener('click', submit);
  input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') submit(); });
}

function finishPractice(){
  if(mcKeyCleanup){ mcKeyCleanup(); mcKeyCleanup=null; }
  document.getElementById('practiceSession').style.display='none';
  document.getElementById('practiceSummary').style.display='block';

  const total = practiceScore.correct + practiceScore.wrong;
  const pct = total ? Math.round((practiceScore.correct/total)*100) : 0;
  document.getElementById('summaryCard').innerHTML = `
    <div style="text-align:center;">
      <div style="font-size:28px; color:var(--text); font-weight:800; font-family:'Comfortaa',sans-serif;">${pct}%</div>
      <div style="color:var(--text-dim); font-size:13px; margin-top:4px;">${t('practice_score_summary',{c:practiceScore.correct, w:practiceScore.wrong})}</div>
    </div>`;
  renderAll();
}

/* ---------- search ---------- */
function buildSearchIndex(){
  const idx=[];
  BOOK1.forEach((u,i)=>{ u.words.forEach((w,wi)=>idx.push({word:w, unit:i+1, idx:wi})); });
  BOOK2.forEach((u,i)=>{ u.words.forEach((w,wi)=>idx.push({word:w, unit:i+31, idx:wi})); });
  return idx;
}
let SEARCH_INDEX=null;
document.getElementById('searchInput').addEventListener('input', (e)=>{
  if(!SEARCH_INDEX) SEARCH_INDEX = buildSearchIndex();
  const q = e.target.value.trim().toLowerCase();
  const results = document.getElementById('searchResults');
  if(!q){ results.innerHTML = `<div class="search-empty">${t('search_empty_hint')}</div>`; return; }
  const matches = SEARCH_INDEX.filter(x=>x.word[0].toLowerCase().includes(q)).slice(0,40);
  if(!matches.length){ results.innerHTML = `<div class="search-empty">${t('search_no_results',{q})}</div>`; return; }
  results.innerHTML = matches.map((m,mi)=>{
    const lab = unitLabel(m.unit);
    const revealId = `sr_${mi}`;
    return `<div class="search-result-card">
      <div class="word-head" dir="ltr">
        <span class="term">${m.word[0]}</span><span class="type">(${m.word[1]})</span>
        <button class="spk" onclick="speak('${m.word[0].replace(/'/g,"\\'")}')" aria-label="${t('common_speaker_aria')}">${ICONS.speaker}</button>
      </div>
      <div class="word-def" dir="ltr">${m.word[2]}</div>
      <div class="word-ex" dir="ltr">"${m.word[3]}"</div>
      <button class="ar-toggle" style="margin-top:6px;" onclick="toggleAr(this,'${revealId}')">${ICONS.book}${t('detail_arabic_toggle')}</button>
      <div class="ar-reveal" dir="rtl" id="${revealId}">${getArabic(m.unit, m.idx)}</div>
      <div style="margin-top:6px;"><button class="btn ghost" style="padding:5px 10px;font-size:11px;" onclick="goToUnit(${m.unit})">${t('common_go_to_unit',{book:lab.book,u:lab.u})}</button></div>
    </div>`;
  }).join('');
});

document.getElementById('resetBtn').addEventListener('click', ()=>{
  showConfirm(t('common_reset_confirm'), ()=>{
    const keepTheme = state.theme, keepLang = state.lang;
    state = defaultState();
    state.theme = keepTheme; state.lang = keepLang;
    saveState(); renderAll();
  });
});

/* ---------- my lists ---------- */
function populateListUnitFilter(){
  const book = document.getElementById('listBookFilter').value;
  const sel = document.getElementById('listUnitFilter');
  const prevVal = sel.value || 'all';
  let start=1, end=TOTAL_UNITS;
  if(book==='1'){ start=1; end=30; }
  else if(book==='2'){ start=31; end=60; }
  let html = `<option value="all">${t('lists_all_units')}</option>`;
  for(let i=start;i<=end;i++){
    const lab = unitLabel(i);
    html += `<option value="${i}">${book==='all' ? t('lists_unit_option',{book:lab.book,u:lab.u}) : t('lists_unit_option_short',{u:lab.u})}</option>`;
  }
  sel.innerHTML = html;
  if([...sel.options].some(o=>o.value===prevVal)) sel.value = prevVal;
}
function matchesListFilter(unit){
  const book = document.getElementById('listBookFilter').value;
  const unitVal = document.getElementById('listUnitFilter').value;
  if(unitVal !== 'all') return unit === parseInt(unitVal);
  if(book==='1') return unit<=30;
  if(book==='2') return unit>30;
  return true;
}
function collectListWords(){
  const cat = listCategory;
  const out = [];
  for(const id in state.words){
    const wr = state.words[id];
    if(wr.wasKnown === undefined || wr.wasKnown === null) continue;
    if(cat==='known' && !wr.wasKnown) continue;
    if(cat==='new' && wr.wasKnown) continue;
    const parts = id.split('_'); const unit=parseInt(parts[0]), idx=parseInt(parts[1]);
    if(!matchesListFilter(unit)) continue;
    const unitData = getUnitData(unit);
    if(!unitData) continue;
    out.push({id, word:unitData.words[idx], unit, idx, mastery:wr.mastery||0, downgradeReason:wr.downgradeReason||null});
  }
  return out;
}
function confirmMoveWord(id){
  const wr = state.words[id];
  if(!wr) return;
  const movingToKnown = wr.wasKnown===false;
  const msg = movingToKnown ? t('lists_move_confirm_to_known') : t('lists_move_confirm_to_new');
  showConfirm(msg, ()=>{
    wr.wasKnown = movingToKnown;
    wr.mastery = 0;
    wr.missStreak = 0;
    delete wr.downgradeReason;
    saveState();
    renderAll();
  });
}
function collectNotebookEntries(){
  const out=[];
  for(const wId in state.notebook){
    const text = state.notebook[wId];
    if(!text || !text.trim()) continue;
    const parts = wId.split('_'); const unit=parseInt(parts[0]), idx=parseInt(parts[1]);
    if(!matchesListFilter(unit)) continue;
    const unitData = getUnitData(unit);
    if(!unitData) continue;
    out.push({word:unitData.words[idx], unit, idx, text});
  }
  return out;
}
function renderMyLists(){
  if(!document.getElementById('listUnitFilter')) return;
  populateListUnitFilter();
  applyListFilter();
}
function applyListFilter(){
  const practiceBtn = document.getElementById('listPracticeBtn');
  if(listCategory==='notebook'){
    practiceBtn.style.display='none';
    const results = collectNotebookEntries();
    document.getElementById('listResultsHeader').textContent = t('lists_sentence_count',{n:results.length});
    const el = document.getElementById('listResults');
    if(!results.length){
      el.innerHTML = `<div class="search-empty">${t('lists_no_sentences')}</div>`;
      return;
    }
    el.innerHTML = results.map(r=>{
      const lab = unitLabel(r.unit);
      return `<div class="search-result-card notebook-entry">
        <div class="word-head" dir="ltr">
          <span class="term">${r.word[0]}</span><span class="type">(${r.word[1]})</span>
        </div>
        <div class="word-def" dir="ltr">${escapeHtml(r.text)}</div>
        <div style="margin-top:6px;"><button class="btn ghost" style="padding:5px 10px;font-size:11px;" onclick="goToUnit(${r.unit})">${t('common_go_to_unit',{book:lab.book,u:lab.u})}</button></div>
      </div>`;
    }).join('');
    return;
  }
  practiceBtn.style.display='inline-flex';
  const results = collectListWords();
  document.getElementById('listResultsHeader').textContent = t('lists_word_count',{n:results.length});
  const el = document.getElementById('listResults');
  if(!results.length){
    el.innerHTML = `<div class="search-empty">${t('lists_no_words')}</div>`;
    return;
  }
  el.innerHTML = results.map((r,ri)=>{
    const lab = unitLabel(r.unit);
    const revealId = `ml_${ri}`;
    const dots = listCategory==='new' ? mastDots(r.mastery) : '';
    return `<div class="search-result-card">
      <div class="word-head" dir="ltr">
        <span class="term">${r.word[0]}</span><span class="type">(${r.word[1]})</span>
        <button class="spk" onclick="speak('${r.word[0].replace(/'/g,"\\'")}')" aria-label="${t('common_speaker_aria')}">${ICONS.speaker}</button>
      </div>
      <div class="word-def" dir="ltr">${r.word[2]}</div>
      ${dots ? `<div style="margin-top:4px;">${dots}</div>` : ''}
      ${r.downgradeReason==='missed_known_review' ? `<div class="downgrade-note">${t('tag_downgrade_reason')}</div>` : ''}
      <button class="ar-toggle" style="margin-top:6px;" onclick="toggleAr(this,'${revealId}')">${ICONS.book}${t('detail_arabic_toggle')}</button>
      <div class="ar-reveal" dir="rtl" id="${revealId}">${getArabic(r.unit,r.idx)}</div>
      <div style="margin-top:6px; display:flex; gap:6px; flex-wrap:wrap;">
        <button class="btn ghost" style="padding:5px 10px;font-size:11px;" onclick="goToUnit(${r.unit})">${t('common_go_to_unit',{book:lab.book,u:lab.u})}</button>
        <button class="btn ghost move-btn" style="padding:5px 10px;font-size:11px;" onclick="confirmMoveWord('${r.id}')">${ICONS.swap}${t('lists_move_btn')}</button>
      </div>
    </div>`;
  }).join('');
}
function copyMyList(){
  if(listCategory==='notebook'){
    const results = collectNotebookEntries();
    if(!results.length){ showAlert(t('lists_alert_no_sentences')); return; }
    copyText(results.map(r=>`${r.word[0]}: ${r.text}`).join('\n'));
    return;
  }
  const results = collectListWords();
  if(!results.length){ showAlert(t('lists_alert_no_words')); return; }
  copyText(results.map(r=>r.word[0]).join('\n'));
}
function practiceFromList(){
  if(listCategory==='notebook') return;
  const results = collectListWords();
  if(!results.length){ showAlert(t('lists_alert_no_words')); return; }
  practiceSource = listCategory==='known' ? 'known' : 'new';
  scopeMode = 'all';
  switchTab('practice');
  refreshPracticeSetupUI();
  startPractice();
}
document.addEventListener('click', (e)=>{
  const segBtn = e.target.closest('#listCategorySeg button');
  if(segBtn){
    document.querySelectorAll('#listCategorySeg button').forEach(x=>x.classList.remove('active'));
    segBtn.classList.add('active');
    listCategory = segBtn.dataset.cat;
    applyListFilter();
  }
});
document.getElementById('listBookFilter').addEventListener('change', ()=>{ populateListUnitFilter(); applyListFilter(); });
document.getElementById('listUnitFilter').addEventListener('change', applyListFilter);

function renderSettings(){
  const input = document.getElementById('userNameInput');
  if(input && document.activeElement!==input) input.value = state.userName || '';
}
function renderAll(){ renderHome(); renderMap(); renderChallenge(); renderReviewCards(); refreshPracticeSetupUI(); renderMyLists(); renderSettings(); }

/* ---- PWA install (via Settings page) ---- */
let deferredInstallPrompt = null;
function isStandaloneApp(){
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone===true;
}
function triggerInstall(){
  if(!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.finally(()=>{ deferredInstallPrompt=null; });
}
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredInstallPrompt = e;
});
window.addEventListener('appinstalled', ()=>{
  deferredInstallPrompt = null;
});

/* ---- user name (Settings + first-run prompt) ---- */
function saveUserNameFromSettings(){
  const val = document.getElementById('userNameInput').value.trim();
  state.userName = val;
  saveState();
  showAlert(t('settings_name_saved'));
}
function promptNameIfNeeded(){
  if(state.userName) return;
  showPrompt(t('welcome_name_title'), t('welcome_name_placeholder'), (val)=>{
    state.userName = (val||'').trim();
    saveState();
  });
}
function showPrompt(title, placeholder, onSave){
  const overlay = document.getElementById('confirmOverlay');
  overlay.innerHTML = `
    <div class="confirm-box">
      <div class="confirm-message">${title}</div>
      <input type="text" id="promptInput" class="text-input" style="width:100%; margin-bottom:14px;" placeholder="${placeholder}">
      <div class="confirm-actions">
        <button class="btn ghost" id="promptSkipBtn">${t('confirm_cancel')}</button>
        <button class="btn" id="promptSaveBtn">${t('confirm_ok')}</button>
      </div>
    </div>`;
  overlay.classList.add('open');
  const input = document.getElementById('promptInput');
  input.focus();
  function cleanup(){ overlay.classList.remove('open'); overlay.innerHTML=''; }
  document.getElementById('promptSkipBtn').addEventListener('click', cleanup);
  document.getElementById('promptSaveBtn').addEventListener('click', ()=>{ const v=input.value; cleanup(); onSave(v); });
  input.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ const v=input.value; cleanup(); onSave(v); } });
}

(async function init(){
  state = await loadState();
  initTheme();
  applyLanguage(state.lang || 'ar');
  promptNameIfNeeded();
})();
