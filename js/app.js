/* Tableful prototype — vanilla JS SPA, hash router, mock data + localStorage, live data in Google Sheets. */

const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbyZ0n1MkZ7R6NmNGffAIW2xjdwTwOyZbieQigeD9Ymf7w43-xDyo8UaKlb89Poly0gn/exec';
const SHEET_API_KEY = 'tableful-9a3186ef16f963508fb23090';

let LIVE_FAMILIES = [];

function hashCode(str){ let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return h; }

async function submitToSheet(type, data){
    try{
          const res = await fetch(SHEET_API_URL, { method: 'POST', body: JSON.stringify({ apiKey: SHEET_API_KEY, type, data }) });
          return await res.json();
    }catch(e){
          console.error('Sheet submit failed', e);
          return { ok: false };
    }
}

async function fetchApprovedFamilies(){
    try{
          const res = await fetch(`${SHEET_API_URL}?type=families&apiKey=${encodeURIComponent(SHEET_API_KEY)}`);
          const json = await res.json();
          if (json.ok) return json.families.map(f => ({
                  ...f,
                  distanceKm: f.distanceKm || 5,
                  photo: GRADIENTS[Math.abs(hashCode(f.id)) % GRADIENTS.length],
                  accessibility: '', familyInfo: '',
          }));
    }catch(e){ console.error('Fetch families failed', e); }
    return [];
}

function getAllFamilies(){ return [...FAMILIES, ...LIVE_FAMILIES]; }

async function lookupProfile(role, phone){
    try{
          const roleParam = role ? `&role=${role}` : '';
          const url = `${SHEET_API_URL}?type=lookup${roleParam}&phone=${encodeURIComponent(phone)}&apiKey=${encodeURIComponent(SHEET_API_KEY)}`;
          const res = await fetch(url);
          return await res.json();
    }catch(e){ console.error('Lookup failed', e); return { ok: false, found: false }; }
}

async function fetchAdminList(adminPassword){
    try{
          const url = `${SHEET_API_URL}?type=admin_list&adminPassword=${encodeURIComponent(adminPassword)}`;
          const res = await fetch(url);
          return await res.json();
    }catch(e){ console.error('Admin list failed', e); return { ok: false, families: [] }; }
}

async function setAdminStatus(adminPassword, id, status){
    try{
          const res = await fetch(SHEET_API_URL, { method: 'POST', body: JSON.stringify({ adminPassword, type: 'admin_status', id, status }) });
          return await res.json();
    }catch(e){ console.error('Admin status update failed', e); return { ok: false }; }
}

const LS = { role: 'tableful_role', profile: 'tableful_profile', requests: 'tableful_requests', admin: 'tableful_admin_pw' };

function getRole(){ return localStorage.getItem(LS.role); }
function setRole(r){ localStorage.setItem(LS.role, r); }
function getAdminPassword(){ return localStorage.getItem(LS.admin); }
function setAdminPassword(pw){ localStorage.setItem(LS.admin, pw); }
function clearAdminPassword(){ localStorage.removeItem(LS.admin); }
function getProfile(){ try{ return JSON.parse(localStorage.getItem(LS.profile)||'null'); }catch(e){ return null; } }
function setProfile(p){ localStorage.setItem(LS.profile, JSON.stringify(p)); }
function getRequests(){ try{ return JSON.parse(localStorage.getItem(LS.requests)||'[]'); }catch(e){ return []; } }
function setRequests(r){ localStorage.setItem(LS.requests, JSON.stringify(r)); }
function addRequest(req){ const rs = getRequests(); rs.push(req); setRequests(rs); }
function updateRequest(id, patch){ const rs = getRequests().map(r => r.id === id ? Object.assign({}, r, patch) : r); setRequests(rs); }
function findRequest(id){ return getRequests().find(r => r.id === id); }
function uid(){ return Math.random().toString(36).slice(2, 10); }

function lifestyleLabel(family){ return t('lifestyle_' + family.lifestyle.toLowerCase()); }
function initials(name){ return (name || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join(''); }
function fmtDate(iso){
    if (!iso) return '';
    const locale = currentLang === 'he' ? 'he-IL' : currentLang === 'fr' ? 'fr-FR' : 'en-US';
    return new Date(iso).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
}
function todayISO(){ return new Date().toISOString().slice(0, 10); }

function matchScore(profile, family){
    let score = 0; const signals = [];
    if (profile && profile.lifestyle && profile.lifestyle.toLowerCase() === family.lifestyle.toLowerCase()){ score += 3; signals.push('style'); }
    const profLangs = (profile && profile.languages) || [];
    const common = family.languages.filter(l => profLangs.includes(l));
    if (common.length){ score += 2; signals.push('lang:' + common.join(' & ')); }
    if (family.distanceKm <= 3) score += 1;
    return { score, signals };
}
function bestSignal(profile, family){
    const { score, signals } = matchScore(profile, family);
    if (score >= 4) return t('signal_great_match');
    const langSig = signals.find(s => s.startsWith('lang:'));
    if (langSig) return t('signal_language', { langs: langSig.slice(5) });
    if (signals.includes('style')) return t('signal_style');
    return t('signal_distance', { km: family.distanceKm });
}

function seedHostDemoRequests(){
    const existing = getRequests().filter(r => r.role === 'host');
    if (existing.length) return;
    addRequest({ id: uid(), role: 'host', studentName: 'Maya Cohen', university: 'Sciences Po', languages: ['English', 'Hebrew'], guests: 1, date: (function(){ const d = nextFriday(); return d.toISOString().slice(0,10); })(), occasion: 'shabbat', message: 'Hi! I would love to join your family for Shabbat this week. Thank you for opening your home!', status: 'requested', createdAt: Date.now(), messages: [] });
    addRequest({ id: uid(), role: 'host', studentName: 'Noah Levy', university: 'Sorbonne', languages: ['French', 'English'], guests: 2, date: (function(){ const d = nextFriday(); d.setDate(d.getDate()+7); return d.toISOString().slice(0,10); })(), occasion: 'shabbat', message: 'Looking forward to a Friday night dinner — bringing a friend from my program if that works!', status: 'accepted', createdAt: Date.now() - 86400000, messages: [{ from: 'them', text: t('chat_suggestion_1') }] });
    addRequest({ id: uid(), role: 'host', studentName: 'Emma Klein', university: 'HEC Paris', languages: ['English'], guests: 1, date: '2026-08-14', occasion: 'shabbat', message: 'Thank you again for such a wonderful Shabbat dinner.', status: 'completed', createdAt: Date.now() - 30 * 86400000, messages: [] });
}
function seedStudentDemoRequests(){
    const existing = getRequests().filter(r => r.role === 'student');
    if (existing.length) return;
    const f2 = FAMILIES.find(f => f.id === 'f2'), f3 = FAMILIES.find(f => f.id === 'f3');
    addRequest({ id: uid(), role: 'student', familyId: f2.id, familyName: f2.name, guests: 1, date: (function(){ const d = nextFriday(); return d.toISOString().slice(0,10); })(), occasion: 'shabbat', message: t('default_message'), status: 'confirmed', createdAt: Date.now() - 2 * 86400000, messages: [{ from: 'them', text: t('chat_suggestion_2') }] });
    addRequest({ id: uid(), role: 'student', familyId: f3.id, familyName: f3.name, guests: 1, date: '2026-08-21', occasion: 'shabbat', message: t('default_message'), status: 'completed', createdAt: Date.now() - 25 * 86400000, messages: [] });
}

/* ---------- shared chrome ---------- */

function headerHTML(route){
    const role = getRole();
    const dashHref = role === 'host' ? '#/dashboard/host' : '#/dashboard/student';
    return `
      <header class="site-header">
          <div class="container">
                <a href="#/" class="brand"><span class="brand-mark">${t('brand')}</span><span class="brand-tag">${t('tagline')}</span></a>
                      <nav class="nav" aria-label="Main">
                              <a href="#/" class="${route === '' ? 'active' : ''}">${t('nav_home')}</a>
                                      <a href="#/calendar" class="${route === 'calendar' ? 'active' : ''}">${t('nav_calendar')}</a>
                                              ${role === 'student' ? `<a href="#/discover" class="${route === 'discover' ? 'active' : ''}">${t('nav_discover')}</a>` : ''}
                                                      ${role ? `<a href="${dashHref}" class="${route.startsWith('dashboard') ? 'active' : ''}">${t('nav_dashboard')}</a>` : ''}
                                                              ${role ? `<a href="#/onboarding">${t('nav_signout')}</a>` : `<a href="#/login" class="${route.startsWith('login') ? 'active' : ''}">${t('nav_login')}</a>`}
                                                                      ${getAdminPassword() ? `<a href="#/admin" class="${route === 'admin' ? 'active' : ''}">${t('nav_admin')}</a><a href="#/" id="admin-logout-link">${t('nav_logout_admin')}</a>` : ''}
                                                                              <div class="lang-switch" role="group" aria-label="Language">
                                                                                        ${['en', 'fr', 'he'].map(l => `<button data-lang="${l}" class="${currentLang === l ? 'active' : ''}">${t('lang_' + l)}</button>`).join('')}
                                                                                                </div>
                                                                                                      </nav>
                                                                                                          </div>
                                                                                                            </header>`;
}

function footerHTML(){
    return `<footer class="site-footer"><div class="container">
        ${t('brand')} — ${t('tagline')} &nbsp;·&nbsp; <button class="btn-ghost" style="border:none;background:none;cursor:pointer;text-decoration:underline;font-size:.82rem;color:inherit" id="reset-demo">Reset demo data</button>
          </div></footer>`;
}

function holidayBannerHTML(){
    const h = upcomingHoliday();
    const key = h ? h.key : 'shabbat';
    return `<div class="holiday-banner"><span class="emoji">🕯️</span><div><strong>${t('holiday_' + key)}</strong></div></div>`;
}

/* ---------- pages ---------- */

function pageHome(){
    return `
      <section class="hero container">
          <span class="hero-eyebrow">${t('tagline')}</span>
              <h1>${t('home_hero')}</h1>
                  <p class="lead">${t('home_sub')}</p>
                      <div class="hero-ctas">
                            <a class="btn btn-primary" href="#/onboarding?role=student">${t('cta_find_family')}</a>
                                  <a class="btn btn-secondary" href="#/onboarding?role=host">${t('cta_open_table')}</a>
                                      </div>
                                        </section>

                                          <section class="section container">
                                              <div class="section-head"><h2>${t('step1_title')}</h2></div>
                                                  <div class="steps">
                                                        <div class="step-card"><div class="step-num">1</div><h3>${t('step1_title')}</h3><p>${t('step1_body')}</p></div>
                                                              <div class="step-card"><div class="step-num">2</div><h3>${t('step2_title')}</h3><p>${t('step2_body')}</p></div>
                                                                    <div class="step-card"><div class="step-num">3</div><h3>${t('step3_title')}</h3><p>${t('step3_body')}</p></div>
                                                                        </div>
                                                                          </section>

                                                                            <section class="section container">
                                                                                <div class="community-band">
                                                                                      <h2>${t('community_headline')}</h2>
                                                                                            <p>${t('community_body')}</p>
                                                                                                  <div class="hero-ctas" style="margin-top:20px">
                                                                                                          <a class="btn btn-primary" href="#/onboarding">${t('cta_find_family')}</a>
                                                                                                                </div>
                                                                                                                    </div>
                                                                                                                      </section>`;
}

function pageOnboarding(preselect){
    return `
      <section class="section container">
          <div class="section-head"><h1>${t('onboarding_title')}</h1><p>${t('onboarding_sub')}</p></div>
              <div class="role-grid">
                    <a class="role-card" href="#/register/student" data-role="student" style="${preselect==='student' ? 'border-color:var(--terracotta)' : ''}">
                            <div class="role-emoji">🎓</div><h3>${t('onboarding_student')}</h3><p>${t('onboarding_student_sub')}</p>
                                  </a>
                                        <a class="role-card" href="#/register/host" data-role="host" style="${preselect==='host' ? 'border-color:var(--terracotta)' : ''}">
                                                <div class="role-emoji">🕯️</div><h3>${t('onboarding_host')}</h3><p>${t('onboarding_host_sub')}</p>
                                                      </a>
                                                          </div>
                                                            </section>`;
}

const LANG_OPTIONS = ['French', 'English', 'Hebrew', 'Arabic', 'Spanish', 'German'];

function photoUploadHTML(existingUrl){
    return `
      <div class="field">
          <label>${t('field_photo')}</label>
              <div class="photo-upload">
                    <div class="photo-preview" id="photo-preview" style="background:${GRADIENTS[2]}${existingUrl ? `;background-image:url(${existingUrl});background-size:cover;background-position:center` : ''}">
                            ${existingUrl ? '' : '<span aria-hidden="true">＋</span>'}
</div>
      <label class="btn btn-outline btn-sm file-btn">${t('field_upload')}<input type="file" accept="image/*" id="photo-input"></label>
          </div>
            </div>`;
}

function lifestyleChipsHTML(selected){
    return `<div class="chip-select" id="lifestyle-chips" role="radiogroup" aria-label="${t('field_lifestyle')}">
        ${['secular','traditional','religious'].map(v => `<button type="button" class="chip ${selected===v?'selected':''}" data-value="${v}" role="radio" aria-checked="${selected===v}">${t('lifestyle_' + v)}</button>`).join('')}
          </div>`;
}

function languageChipsHTML(selected){
    selected = selected || [];
    return `<div class="chip-select" id="language-chips">
        ${LANG_OPTIONS.map(l => `<button type="button" class="chip ${selected.includes(l)?'selected':''}" data-value="${l}">${l}</button>`).join('')}
          </div>`;
}

function pageRegisterStudent(){
    const p = getProfile() || {};
    return `
      <section class="section container">
          <div class="form-card">
                <h1>${t('reg_student_title')}</h1>
                      <form id="student-form">
                              ${photoUploadHTML(p.photoDataUrl)}
                                      <div class="field"><label for="fullname">${t('field_fullname')}</label><input required type="text" id="fullname" value="${p.fullname||''}"></div>
                                              <div class="row-2">
                                                        <div class="field"><label for="phone">${t('field_phone')}</label>
                                                                    <div class="verify-row"><input type="tel" id="phone" value="${p.phone||''}"><button type="button" class="btn btn-outline btn-sm" id="verify-btn">${p.verified ? '✓ ' + t('field_verified') : t('field_verify')}</button></div>
                                                                              </div>
                                                                                        <div class="field"><label for="whatsapp">${t('field_whatsapp')}</label><input type="tel" id="whatsapp" value="${p.whatsapp||''}"></div>
                                                                                                </div>
                                                                                                        <div class="field"><label>${t('field_lifestyle')}</label>${lifestyleChipsHTML(p.lifestyle)}</div>
                                                                                                                <div class="field"><label for="kosher">${t('field_kosher')}</label><input type="text" id="kosher" value="${p.kosher||''}"></div>
                                                                                                                        <div class="field"><label>${t('field_languages')}</label>${languageChipsHTML(p.languages)}</div>
                                                                                                                                <div class="row-2">
                                                                                                                                          <div class="field"><label for="city">${t('field_city')}</label><input required type="text" id="city" value="${p.city||'Paris'}"></div>
                                                                                                                                                    <div class="field"><label for="district">${t('field_district')}</label><input required type="text" id="district" value="${p.district||''}"></div>
                                                                                                                                                            </div>
                                                                                                                                                                    <div class="field"><label for="address">${t('field_address')}</label><input type="text" id="address" value="${p.address||''}"><div class="hint">${t('field_address_hint')}</div></div>
                                                                                                                                                                            <div class="row-2">
                                                                                                                                                                                      <div class="field"><label for="exstart">${t('field_exchange_start')}</label><input type="date" id="exstart" value="${p.exStart||''}"></div>
                                                                                                                                                                                                <div class="field"><label for="exend">${t('field_exchange_end')}</label><input type="date" id="exend" value="${p.exEnd||''}"></div>
                                                                                                                                                                                                        </div>
                                                                                                                                                                                                                <div class="row-2">
                                                                                                                                                                                                                          <div class="field"><label for="university">${t('field_university')}</label><input type="text" id="university" value="${p.university||''}"></div>
                                                                                                                                                                                                                                    <div class="field"><label for="homeuni">${t('field_home_university')}</label><input type="text" id="homeuni" value="${p.homeUniversity||''}"></div>
                                                                                                                                                                                                                                            </div>
                                                                                                                                                                                                                                                    <div class="field"><label for="about">${t('field_about')}</label><textarea id="about">${p.about||''}</textarea></div>
                                                                                                                                                                                                                                                            <button type="submit" class="btn btn-primary btn-block">${t('submit_continue')}</button>
                                                                                                                                                                                                                                                                  </form>
                                                                                                                                                                                                                                                                      </div>
                                                                                                                                                                                                                                                                        </section>`;
}

function pageRegisterHost(){
    const p = getProfile() || {};
    return `
      <section class="section container">
          <div class="form-card">
                <h1>${t('reg_host_title')}</h1>
                      <form id="host-form">
                              ${photoUploadHTML(p.photoDataUrl)}
                                      <div class="field"><label for="fullname">${t('field_fullname')}</label><input required type="text" id="fullname" value="${p.fullname||''}"></div>
                                              <div class="row-2">
                                                        <div class="field"><label for="phone">${t('field_phone')}</label>
                                                                    <div class="verify-row"><input type="tel" id="phone" value="${p.phone||''}"><button type="button" class="btn btn-outline btn-sm" id="verify-btn">${p.verified ? '✓ ' + t('field_verified') : t('field_verify')}</button></div>
                                                                              </div>
                                                                                        <div class="field"><label for="whatsapp">${t('field_whatsapp')}</label><input type="tel" id="whatsapp" value="${p.whatsapp||''}"></div>
                                                                                                </div>
                                                                                                        <div class="field"><label for="capacity">${t('field_capacity')}</label><input type="number" min="1" max="12" id="capacity" value="${p.capacity||2}"></div>
                                                                                                                <div class="field"><label>${t('field_lifestyle')}</label>${lifestyleChipsHTML(p.lifestyle)}</div>
                                                                                                                        <div class="field"><label for="kosher">${t('field_kosher')}</label><input type="text" id="kosher" value="${p.kosher||''}"></div>
                                                                                                                                <div class="field"><label>${t('field_languages')}</label>${languageChipsHTML(p.languages)}</div>
                                                                                                                                        <div class="row-2">
                                                                                                                                                  <div class="field"><label for="city">${t('field_city')}</label><input required type="text" id="city" value="${p.city||'Paris'}"></div>
                                                                                                                                                            <div class="field"><label for="district">${t('field_district')}</label><input required type="text" id="district" value="${p.district||''}"></div>
                                                                                                                                                                    </div>
                                                                                                                                                                            <div class="field"><label for="address">${t('field_address')}</label><input type="text" id="address" value="${p.address||''}"><div class="hint">${t('field_address_hint')}</div></div>
                                                                                                                                                                                    <div class="field"><label for="intro">${t('field_family_intro')}</label><textarea id="intro">${p.familyIntro||''}</textarea></div>
                                                                                                                                                                                            <button type="submit" class="btn btn-secondary btn-block">${t('submit_create_profile')}</button>
                                                                                                                                                                                                  </form>
                                                                                                                                                                                                      </div>
                                                                                                                                                                                                        </section>`;
}

function familyCardHTML(family, profile){
    return `
      <a class="family-card" href="#/family/${family.id}">
          <div class="family-photo" style="background:${family.photo}">
                <span class="family-signal">${bestSignal(profile, family)}</span>
                      <span class="initials">${initials(family.name)}</span>
                          </div>
                              <div class="family-body">
                                    <h3>${family.name}</h3>
                                          <div class="family-meta">${family.district} · ${t('signal_distance', { km: family.distanceKm })}</div>
                                                <div class="tag-row">
                                                        <span class="tag sage">${lifestyleLabel(family)}</span>
                                                                <span class="tag">${family.kosher}</span>
                                                                      </div>
                                                                            <div class="muted" style="margin-top:4px">${family.languages.join(', ')}</div>
                                                                                </div>
                                                                                  </a>`;
}

function pageDiscover(){
    const profile = getProfile();
    const all = getAllFamilies();
    const ranked = all.map(f => ({ f, s: matchScore(profile, f).score })).sort((a, b) => b.s - a.s);
    const recommended = ranked.slice(0, 4).map(r => r.f);
    const nearby = [...all].sort((a, b) => a.distanceKm - b.distanceKm);
    return `
      <section class="section container">
          ${holidayBannerHTML()}
              <div class="section-head" style="text-align:${I18N[currentLang].dir === 'rtl' ? 'right' : 'left'};margin:0 0 8px;max-width:none">
                    <h1>${t('discover_title')}</h1>
                        </div>
                            <div class="section-title-row"><h2>${t('discover_recommended')}</h2></div>
                                <div class="grid">${recommended.map(f => familyCardHTML(f, profile)).join('')}</div>
                                    <div class="section-title-row" style="margin-top:40px"><h2>${t('discover_nearby')}</h2></div>
                                        <div class="grid">${nearby.map(f => familyCardHTML(f, profile)).join('')}</div>
                                          </section>`;
}

function pageFamily(id){
    const family = getAllFamilies().find(f => f.id === id);
    const profile = getProfile();
    if (!family) return `<section class="section container center"><p>Family not found.</p><a class="btn btn-outline" href="#/discover">${t('discover_title')}</a></section>`;
    return `
      <section class="section container">
          <div class="profile-hero" style="background:${family.photo}"><span class="initials">${initials(family.name)}</span></div>
              <div class="profile-grid">
                    <div>
                            <h1>${family.name}</h1>
                                    <p class="muted">${family.district}, ${family.city} · ${t('signal_distance', { km: family.distanceKm })}</p>
                                            <div class="tag-row" style="margin-bottom:18px">
                                                      <span class="tag sage">${bestSignal(profile, family)}</span>
                                                                <span class="tag">${lifestyleLabel(family)}</span>
                                                                          <span class="tag">${family.kosher}</span>
                                                                                  </div>
                                                                                          <div class="info-card"><h4>${t('field_family_intro')}</h4><p>${family.intro}</p></div>
                                                                                                  <div class="info-card"><h4>${t('field_languages')}</h4><p>${family.languages.join(', ')}</p></div>
                                                                                                          <div class="info-card"><h4>${t('field_about_family')}</h4><p>${family.familyInfo}</p></div>
                                                                                                                  ${family.accessibility ? `<div class="info-card"><h4>${t('field_accessibility')}</h4><p>${family.accessibility}</p></div>` : ''}
                                                                                                                        </div>
                                                                                                                              <div class="sticky-cta">
                                                                                                                                      <div class="info-card">
                                                                                                                                                <div class="stat-list">
                                                                                                                                                            <div class="stat-row"><span>${t('label_capacity')}</span><strong>${t('family_hosts', { n: family.capacity })}</strong></div>
                                                                                                                                                                        <div class="stat-row"><span>${t('field_kosher')}</span><strong>${family.kosher}</strong></div>
                                                                                                                                                                                    <div class="stat-row"><span>${t('field_lifestyle')}</span><strong>${lifestyleLabel(family)}</strong></div>
                                                                                                                                                                                              </div>
                                                                                                                                                                                                        <a class="btn btn-primary btn-block" style="margin-top:18px" href="#/request/${family.id}">${t('family_cta')}</a>
                                                                                                                                                                                                                </div>
                                                                                                                                                                                                                      </div>
                                                                                                                                                                                                                          </div>
                                                                                                                                                                                                                            </section>`;
}

function pageRequest(id){
    const family = getAllFamilies().find(f => f.id === id);
    if (!family) return `<section class="section container center"><p>Family not found.</p></section>`;
    return `
      <section class="section container">
          <div class="form-card">
                <h1>${t('request_title', { name: family.name })}</h1>
                      <form id="request-form">
                              <div class="row-2">
                                        <div class="field"><label for="rdate">${t('field_date')}</label><input required type="date" id="rdate" min="${todayISO()}"></div>
                                                  <div class="field"><label for="rguests">${t('field_guests')}</label><input type="number" min="1" max="${family.capacity}" id="rguests" value="1"></div>
                                                          </div>
                                                                  <div class="field"><label for="occasion">${t('field_occasion')}</label>
                                                                            <select id="occasion">
                                                                                        <option value="shabbat">${t('occasion_shabbat')}</option>
                                                                                                    <option value="holiday">${t('occasion_holiday')}</option>
                                                                                                                <option value="other">${t('occasion_other')}</option>
                                                                                                                          </select>
                                                                                                                                  </div>
                                                                                                                                          <div class="field" id="holiday-field" style="display:none"><label for="holiday">${t('field_holiday')}</label><input type="text" id="holiday"></div>
                                                                                                                                                  <div class="field"><label for="message">${t('field_message')}</label><textarea id="message">${t('default_message')}</textarea></div>
                                                                                                                                                          <button type="submit" class="btn btn-primary btn-block">${t('submit_request')}</button>
                                                                                                                                                                </form>
                                                                                                                                                                    </div>
                                                                                                                                                                      </section>`;
}

function pageRequestSent(reqId){
    const req = findRequest(reqId);
    const family = req ? getAllFamilies().find(f => f.id === req.familyId) : null;
    return `
      <section class="section container">
          <div class="confirm-box">
                <div class="confirm-icon">✓</div>
                      <h1>${t('request_sent_title')}</h1>
                            <p>${t('request_sent_body', { name: family ? family.name : '' })}</p>
                                  <a class="btn btn-primary" href="#/dashboard/student">${t('back_to_dashboard')}</a>
                                      </div>
                                        </section>`;
}

function requestCardHTML(req, mode){
    // mode: 'student' | 'host'
  const isHost = mode === 'host';
    const title = isHost ? req.studentName : req.familyName;
    const avatarBg = GRADIENTS[Math.abs((title||'').length) % GRADIENTS.length];
    const sub = isHost ? (req.university || '') : '';
    let actions = '';
    if (isHost && req.status === 'requested'){
          actions = `
                <div class="request-actions">
                        <button class="btn btn-secondary btn-sm" data-action="accept" data-id="${req.id}">${t('action_accept')}</button>
                                <button class="btn btn-outline btn-sm" data-action="suggest" data-id="${req.id}">${t('action_suggest_date')}</button>
                                        <button class="btn btn-danger-ghost btn-sm" data-action="decline" data-id="${req.id}">${t('action_decline')}</button>
                                              </div>`;
    } else if (['accepted','confirmed'].includes(req.status)) {
          actions = `<div class="request-actions"><a class="btn btn-outline btn-sm" href="#/chat/${req.id}">${isHost ? t('action_message_student') : t('action_message_family')}</a></div>`;
    }
    return `
      <div class="request-card">
          <div class="request-avatar" style="background:${avatarBg}">${initials(title)}</div>
              <div class="request-body">
                    <div class="request-top">
                            <div><h3>${title}</h3><div class="muted">${sub}${sub?' · ':''}${fmtDate(req.date)} · ${req.guests} ${t('guests_unit')}</div></div>
                                    <span class="status-badge status-${req.status}">${t('status_' + req.status)}</span>
                                          </div>
                                                <p class="request-msg">${req.message}</p>
                                                      ${actions}
                                                          </div>
                                                            </div>`;
}

function emptyStateHTML(titleKey, bodyKey, extraBtns){
    return `<div class="empty-state"><div class="emoji">🍽️</div><h3>${t(titleKey)}</h3><p>${t(bodyKey)}</p>${extraBtns||''}</div>`;
}

function pageDashboardStudent(){
    const profile = getProfile();
    const requests = getRequests().filter(r => r.role === 'student');
    const myRequests = requests;
    const upcoming = requests.filter(r => ['accepted','confirmed'].includes(r.status));
    const previous = requests.filter(r => r.status === 'completed');
    const all = getAllFamilies();
    const ranked = all.map(f => ({ f, s: matchScore(profile, f).score })).sort((a, b) => b.s - a.s).slice(0,3).map(r=>r.f);
    const nearby = [...all].sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,3);
    return `
      <section class="dash-hero container">
          <h1>${t('student_dash_hero')}</h1>
            </section>
              <section class="container">
                  ${holidayBannerHTML()}

                      <div class="dash-section">
                            <div class="section-title-row"><h2>${t('discover_recommended')}</h2><a class="btn btn-ghost btn-sm" href="#/discover">${t('discover_title')} →</a></div>
                                  <div class="grid">${ranked.map(f => familyCardHTML(f, profile)).join('')}</div>
                                      </div>

                                          <div class="dash-section">
                                                <div class="section-title-row"><h2>${t('discover_nearby')}</h2></div>
                                                      <div class="grid">${nearby.map(f => familyCardHTML(f, profile)).join('')}</div>
                                                          </div>

                                                              <div class="dash-section">
                                                                    <h2>${t('section_my_requests')}</h2>
                                                                          ${myRequests.length ? myRequests.map(r => requestCardHTML(r,'student')).join('') : emptyStateHTML('empty_no_family_title','empty_no_family_body', `<a class="btn btn-primary btn-sm" href="#/discover">${t('discover_title')}</a>`)}
                                                                              </div>

                                                                                  <div class="dash-section">
                                                                                        <h2>${t('section_upcoming_meals')}</h2>
                                                                                              ${upcoming.length ? upcoming.map(r => requestCardHTML(r,'student')).join('') : `<p class="muted">—</p>`}
                                                                                                  </div>

                                                                                                      <div class="dash-section">
                                                                                                            <h2>${t('section_previous_hosts')}</h2>
                                                                                                                  ${previous.length ? previous.map(r => requestCardHTML(r,'student')).join('') : `<p class="muted">—</p>`}
                                                                                                                      </div>
                                                                                                                        </section>`;
}

function pageDashboardHost(){
    const requests = getRequests().filter(r => r.role === 'host');
    const newReqs = requests.filter(r => r.status === 'requested');
    const upcoming = requests.filter(r => ['accepted','confirmed'].includes(r.status));
    const previous = requests.filter(r => r.status === 'completed');
    return `
      <section class="dash-hero container">
          <h1>${t('host_dash_hero')}</h1>
            </section>
              <section class="container">
                  <div class="dash-section">
                        <h2>${t('section_new_requests')}</h2>
                              ${newReqs.length ? newReqs.map(r => requestCardHTML(r,'host')).join('') : emptyStateHTML('empty_no_requests_title','empty_no_requests_body')}
                                  </div>
                                      <div class="dash-section">
                                            <h2>${t('section_upcoming_guests')}</h2>
                                                  ${upcoming.length ? upcoming.map(r => requestCardHTML(r,'host')).join('') : `<p class="muted">—</p>`}
                                                      </div>
                                                          <div class="dash-section">
                                                                <h2>${t('section_previous_guests')}</h2>
                                                                      ${previous.length ? previous.map(r => requestCardHTML(r,'host')).join('') : `<p class="muted">—</p>`}
                                                                          </div>
                                                                            </section>`;
}

function pageChat(reqId){
    const req = findRequest(reqId);
    if (!req) return `<section class="section container center"><p>Not found.</p></section>`;
    const title = req.role === 'host' ? req.studentName : req.familyName;
    const msgs = req.messages || [];
    return `
      <section class="section container">
          <h1 class="center" style="margin-bottom:20px">${t('chat_title')} — ${title}</h1>
              <div class="chat-window">
                    <div class="chat-messages" id="chat-messages">
                            ${msgs.length ? msgs.map(m => `<div class="msg ${m.from === 'me' ? 'me' : 'them'}">${m.text}</div>`).join('') : `<p class="muted center">—</p>`}
                                  </div>
                                        <div class="chat-suggestions">
                                                <button data-text="${t('chat_suggestion_1')}">${t('chat_suggestion_1')}</button>
                                                        <button data-text="${t('chat_suggestion_2')}">${t('chat_suggestion_2')}</button>
                                                                <button data-text="${t('chat_suggestion_3')}">${t('chat_suggestion_3')}</button>
                                                                      </div>
                                                                            <form class="chat-input-row" id="chat-form">
                                                                                    <input type="text" id="chat-input" placeholder="${t('chat_placeholder')}" autocomplete="off">
                                                                                            <button class="btn btn-primary btn-sm" type="submit">${t('chat_send')}</button>
                                                                                                  </form>
                                                                                                      </div>
                                                                                                        </section>`;
}

function pageCalendar(){
    const today = new Date(new Date().toDateString());
    const jewish = HOLIDAYS_2026
      .map(h => ({ h, start: new Date(h.start) }))
      .filter(x => x.start >= today || new Date(x.h.end || x.h.start) >= today)
      .sort((a, b) => a.start - b.start);
    const french = FRENCH_HOLIDAYS_2026
      .map(h => ({ h, start: new Date(h.date) }))
      .filter(x => x.start >= today)
      .sort((a, b) => a.start - b.start);

  const jewishRows = jewish.map(({ h }) => `
      <div class="request-card" style="align-items:center">
            <div class="request-avatar" style="background:var(--sage-soft);font-size:1.4rem">${h.emoji}</div>
                  <div class="request-body">
                          <div class="request-top">
                                    <div><h3>${t('hol_' + h.key)}</h3><div class="muted">${fmtDate(h.start)}${h.end && h.end !== h.start ? ' – ' + fmtDate(h.end) : ''}</div></div>
                                            </div>
                                                  </div>
                                                        <a class="btn btn-outline btn-sm" href="#/discover">${t('calendar_cta')}</a>
                                                            </div>`).join('');

  const frenchRows = french.map(({ h }) => `
      <div class="request-card" style="align-items:center">
            <div class="request-avatar" style="background:var(--cream-deep);color:var(--charcoal);font-size:1.2rem">🇫🇷</div>
                  <div class="request-body">
                          <div class="request-top">
                                    <div><h3>${t('fr_' + h.key)}</h3><div class="muted">${fmtDate(h.date)}</div></div>
                                            </div>
                                                  </div>
                                                      </div>`).join('');

  return `
    <section class="section container">
        <div class="section-head"><h1>${t('calendar_title')}</h1><p>${t('calendar_sub')}</p></div>

            <div class="dash-section" style="margin-top:0">
                  <h2>${t('calendar_jewish_heading')}</h2>
                        <p class="muted" style="margin-bottom:16px">${t('calendar_disclaimer')}</p>
                              ${jewishRows || `<p class="muted">—</p>`}
                                  </div>

                                      <div class="dash-section">
                                            <h2>${t('calendar_french_heading')}</h2>
                                                  ${frenchRows || `<p class="muted">—</p>`}
                                                      </div>
                                                        </section>`;
}

function pageLogin(){
    return `
      <section class="section container">
          <div class="form-card">
                <h1>${t('login_title')}</h1>
                      <p>${t('login_sub')}</p>
                            <form id="login-form">
                                    <div class="field"><label for="login-phone">${t('field_phone_login')}</label><input required type="tel" id="login-phone"></div>
                                            <button type="submit" class="btn btn-primary btn-block">${t('submit_login')}</button>
                                                  </form>
                                                        <div id="login-error" style="display:none;margin-top:16px" class="empty-state">
                                                                <div class="emoji">🔎</div><h3>${t('login_not_found_title')}</h3><p>${t('login_not_found_body')}</p>
                                                                        <div class="hero-ctas" style="margin-top:14px">
                                                                                  <a class="btn btn-outline btn-sm" href="#/register/student">${t('login_student')}</a>
                                                                                            <a class="btn btn-outline btn-sm" href="#/register/host">${t('login_host')}</a>
                                                                                                    </div>
                                                                                                          </div>
                                                                                                                <p class="muted center" style="margin-top:20px"><a href="#/login/admin">${t('login_owner')}</a></p>
                                                                                                                    </div>
                                                                                                                      </section>`;
}

function pageLoginAdmin(){
    return `
      <section class="section container">
          <div class="form-card">
                <h1>${t('login_owner')}</h1>
                      <form id="admin-login-form">
                              <div class="field"><label for="admin-password">${t('admin_password_label')}</label><input required type="password" id="admin-password"></div>
                                      <button type="submit" class="btn btn-primary btn-block">${t('admin_login_cta')}</button>
                                            </form>
                                                  <div id="admin-login-error" style="display:none;margin-top:12px" class="muted">${t('admin_wrong_password')}</div>
                                                      </div>
                                                        </section>`;
}

let ADMIN_FAMILIES = null;

function adminFamilyRow(f){
    const avatarBg = GRADIENTS[Math.abs(hashCode(f.id || f.fullname || '')) % GRADIENTS.length];
    let actions = '';
    if (f.status === 'pending'){
          actions = `<div class="request-actions">
                <button class="btn btn-secondary btn-sm" data-admin-action="approved" data-id="${f.id}">${t('admin_approve')}</button>
                      <button class="btn btn-danger-ghost btn-sm" data-admin-action="rejected" data-id="${f.id}">${t('admin_reject')}</button>
                          </div>`;
    } else {
          actions = `<div class="request-actions"><button class="btn btn-outline btn-sm" data-admin-action="pending" data-id="${f.id}">${t('admin_reset_pending')}</button></div>`;
    }
    return `
      <div class="request-card">
          <div class="request-avatar" style="background:${avatarBg}">${initials(f.fullname)}</div>
              <div class="request-body">
                    <div class="request-top">
                            <div><h3>${f.fullname}</h3><div class="muted">${f.city || ''}${f.district ? ', ' + f.district : ''} · ${f.phone || ''}</div></div>
                                    <span class="status-badge status-${f.status === 'pending' ? 'requested' : f.status === 'approved' ? 'confirmed' : 'declined'}">${f.status}</span>
                                          </div>
                                                <p class="request-msg">${f.lifestyle || ''}${f.kosher ? ' · ' + f.kosher : ''}${f.languages ? ' · ' + f.languages : ''} — ${f.familyIntro || ''}</p>
                                                      ${actions}
                                                          </div>
                                                            </div>`;
}

function pageAdmin(){
    if (ADMIN_FAMILIES === null){
          return `<section class="section container"><div class="section-head"><h1>${t('admin_title')}</h1><p>${t('admin_sub')}</p></div><p class="muted center">…</p></section>`;
    }
    const pending = ADMIN_FAMILIES.filter(f => f.status === 'pending');
    const approved = ADMIN_FAMILIES.filter(f => f.status === 'approved');
    const rejected = ADMIN_FAMILIES.filter(f => f.status === 'rejected');
    return `
      <section class="section container">
          <div class="section-head"><h1>${t('admin_title')}</h1><p>${t('admin_sub')}</p></div>
              <div class="dash-section" style="margin-top:0">
                    <h2>${t('admin_section_pending')}</h2>
                          ${pending.length ? pending.map(adminFamilyRow).join('') : `<p class="muted">${t('admin_no_pending')}</p>`}
                              </div>
                                  <div class="dash-section">
                                        <h2>${t('admin_section_approved')}</h2>
                                              ${approved.length ? approved.map(adminFamilyRow).join('') : `<p class="muted">${t('admin_empty')}</p>`}
                                                  </div>
                                                      <div class="dash-section">
                                                            <h2>${t('admin_section_rejected')}</h2>
                                                                  ${rejected.length ? rejected.map(adminFamilyRow).join('') : `<p class="muted">${t('admin_empty')}</p>`}
                                                                      </div>
                                                                        </section>`;
}

/* ---------- router ---------- */

function parseHash(){
    const raw = location.hash.replace(/^#\/?/, '');
    const [pathPart, query] = raw.split('?');
    const parts = pathPart.split('/').filter(Boolean);
    const params = new URLSearchParams(query || '');
    return { parts, params };
}

function render(){
    const { parts, params } = parseHash();
    const route = parts.join('/');
    let html = '';

  if (parts.length === 0) html = pageHome();
    else if (parts[0] === 'onboarding') html = pageOnboarding(params.get('role'));
    else if (parts[0] === 'register' && parts[1] === 'student') html = pageRegisterStudent();
    else if (parts[0] === 'register' && parts[1] === 'host') html = pageRegisterHost();
    else if (parts[0] === 'calendar') html = pageCalendar();
    else if (parts[0] === 'login' && parts[1] === 'admin') html = pageLoginAdmin();
    else if (parts[0] === 'login') html = pageLogin();
    else if (parts[0] === 'admin'){
          if (!getAdminPassword()) { location.hash = '#/login/admin'; return render(); }
          html = pageAdmin();
    }
    else if (parts[0] === 'discover') html = pageDiscover();
    else if (parts[0] === 'family' && parts[1]) html = pageFamily(parts[1]);
    else if (parts[0] === 'request' && parts[1]) html = pageRequest(parts[1]);
    else if (parts[0] === 'request-sent' && parts[1]) html = pageRequestSent(parts[1]);
    else if (parts[0] === 'dashboard' && parts[1] === 'student') html = pageDashboardStudent();
    else if (parts[0] === 'dashboard' && parts[1] === 'host') html = pageDashboardHost();
    else if (parts[0] === 'chat' && parts[1]) html = pageChat(parts[1]);
    else html = pageHome();

  document.getElementById('app').innerHTML = `
      ${headerHTML(route)}
          <main class="main">${html}</main>
              ${footerHTML()}`;

  attachHandlers(parts);
    window.scrollTo(0, 0);
}

/* ---------- event wiring per page ---------- */

function attachHandlers(parts){
    document.documentElement.lang = currentLang;
    document.documentElement.dir = I18N[currentLang].dir;

  document.querySelectorAll('.lang-switch button').forEach(btn => {
        btn.addEventListener('click', () => { setLang(btn.dataset.lang); render(); });
  });

  const resetBtn = document.getElementById('reset-demo');
    if (resetBtn) resetBtn.addEventListener('click', () => {
          if (confirm('Clear all demo data and start over?')){
                  localStorage.removeItem(LS.role); localStorage.removeItem(LS.profile); localStorage.removeItem(LS.requests);
                  location.hash = '#/';
                  render();
          }
    });

  // chip toggles (single-select lifestyle, multi-select languages)
  const lifestyleChips = document.getElementById('lifestyle-chips');
    if (lifestyleChips) lifestyleChips.addEventListener('click', (e) => {
          const chip = e.target.closest('.chip'); if (!chip) return;
          lifestyleChips.querySelectorAll('.chip').forEach(c => { c.classList.remove('selected'); c.setAttribute('aria-checked','false'); });
          chip.classList.add('selected'); chip.setAttribute('aria-checked','true');
    });
    const langChips = document.getElementById('language-chips');
    if (langChips) langChips.addEventListener('click', (e) => {
          const chip = e.target.closest('.chip'); if (!chip) return;
          chip.classList.toggle('selected');
    });

  // photo upload preview
  const photoInput = document.getElementById('photo-input');
    if (photoInput) photoInput.addEventListener('change', () => {
          const file = photoInput.files[0]; if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
                  const preview = document.getElementById('photo-preview');
                  preview.style.backgroundImage = `url(${reader.result})`;
                  preview.style.backgroundSize = 'cover'; preview.style.backgroundPosition = 'center';
                  preview.dataset.dataUrl = reader.result; preview.innerHTML = '';
          };
          reader.readAsDataURL(file);
    });

  // OTP verify stub
  const verifyBtn = document.getElementById('verify-btn');
    if (verifyBtn) verifyBtn.addEventListener('click', () => {
          verifyBtn.textContent = '✓ ' + t('field_verified');
          verifyBtn.disabled = true;
    });

  // student registration submit
  const studentForm = document.getElementById('student-form');
    if (studentForm) studentForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const preview = document.getElementById('photo-preview');
          const profile = {
                  fullname: val('fullname'), phone: val('phone'), whatsapp: val('whatsapp'),
                  verified: verifyBtn && verifyBtn.disabled,
                  lifestyle: selectedChip('lifestyle-chips'), kosher: val('kosher'),
                  languages: selectedChips('language-chips'),
                  city: val('city'), district: val('district'), address: val('address'),
                  exStart: val('exstart'), exEnd: val('exend'),
                  university: val('university'), homeUniversity: val('homeuni'), about: val('about'),
                  photoDataUrl: preview ? preview.dataset.dataUrl : undefined,
          };
          setProfile(profile); setRole('student');
          seedStudentDemoRequests();
          submitToSheet('student', profile);
          location.hash = '#/discover'; render();
    });

  // host registration submit
  const hostForm = document.getElementById('host-form');
    if (hostForm) hostForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const submitBtn = hostForm.querySelector('button[type=submit]');
          const preview = document.getElementById('photo-preview');
          const profile = {
                  fullname: val('fullname'), phone: val('phone'), whatsapp: val('whatsapp'),
                  verified: verifyBtn && verifyBtn.disabled,
                  capacity: Number(val('capacity')) || 2,
                  lifestyle: selectedChip('lifestyle-chips'), kosher: val('kosher'),
                  languages: selectedChips('language-chips'),
                  city: val('city'), district: val('district'), address: val('address'),
                  familyIntro: val('intro'),
                  photoDataUrl: preview ? preview.dataset.dataUrl : undefined,
          };
          if (submitBtn){ submitBtn.disabled = true; submitBtn.textContent = '…'; }
          const result = await submitToSheet('host', profile);
          profile.sheetStatus = result.ok ? 'pending' : 'unsent';
          setProfile(profile); setRole('host');
          seedHostDemoRequests();
          location.hash = '#/dashboard/host'; render();
    });

  // occasion -> show holiday field
  const occasionSel = document.getElementById('occasion');
    if (occasionSel) occasionSel.addEventListener('change', () => {
          document.getElementById('holiday-field').style.display = occasionSel.value === 'holiday' ? 'block' : 'none';
    });

  // request form submit
  const requestForm = document.getElementById('request-form');
    if (requestForm) requestForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const familyId = parts[1];
          const family = getAllFamilies().find(f => f.id === familyId);
          const profile = getProfile() || {};
          const req = {
                  id: uid(), role: 'student', familyId: family.id, familyName: family.name,
                  date: val('rdate'), guests: Number(val('rguests')) || 1,
                  occasion: occasionSel.value, holiday: val('holiday'),
                  message: val('message'), status: 'requested', createdAt: Date.now(), messages: [],
                  studentName: profile.fullname || 'Student',
          };
          addRequest(req);
          location.hash = `#/request-sent/${req.id}`; render();
    });

  // host request card actions
  document.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
                const id = btn.dataset.id; const action = btn.dataset.action;
                if (action === 'accept') updateRequest(id, { status: 'accepted' });
                if (action === 'decline') updateRequest(id, { status: 'declined' });
                if (action === 'suggest') updateRequest(id, { status: 'alt_suggested' });
                render();
        });
  });

  // chat
  const chatForm = document.getElementById('chat-form');
    if (chatForm) chatForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const input = document.getElementById('chat-input');
          if (!input.value.trim()) return;
          pushChatMessage(parts[1], input.value.trim());
          input.value = '';
          render();
    });
    document.querySelectorAll('.chat-suggestions button').forEach(btn => {
          btn.addEventListener('click', () => { pushChatMessage(parts[1], btn.dataset.text); render(); });
    });

  // student / host login
  const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const phone = val('login-phone');
          const submitBtn = loginForm.querySelector('button[type=submit]');
          if (submitBtn){ submitBtn.disabled = true; submitBtn.textContent = '…'; }
          const result = await lookupProfile(null, phone);
          if (submitBtn){ submitBtn.disabled = false; submitBtn.textContent = t('submit_login'); }
          if (result.ok && result.found && result.profile){
                  const role = result.role;
                  const p = result.profile;
                  setProfile({
                            fullname: p.fullname, phone: p.phone, whatsapp: p.whatsapp, verified: !!p.verified,
                            capacity: Number(p.capacity) || undefined, lifestyle: p.lifestyle, kosher: p.kosher,
                            languages: String(p.languages || '').split(',').map(s => s.trim()).filter(Boolean),
                            city: p.city, district: p.district, address: p.address, familyIntro: p.familyIntro,
                            exStart: p.exStart, exEnd: p.exEnd, university: p.university, homeUniversity: p.homeUniversity, about: p.about,
                            sheetStatus: p.status,
                  });
                  setRole(role);
                  if (role === 'host'){ seedHostDemoRequests(); location.hash = '#/dashboard/host'; }
                  else { seedStudentDemoRequests(); location.hash = '#/discover'; }
                  render();
          } else {
                  document.getElementById('login-error').style.display = 'block';
          }
    });

  // admin login
  const adminLoginForm = document.getElementById('admin-login-form');
    if (adminLoginForm) adminLoginForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const pw = val('admin-password');
          const submitBtn = adminLoginForm.querySelector('button[type=submit]');
          if (submitBtn){ submitBtn.disabled = true; submitBtn.textContent = '…'; }
          const result = await fetchAdminList(pw);
          if (submitBtn){ submitBtn.disabled = false; submitBtn.textContent = t('admin_login_cta'); }
          if (result.ok){
                  setAdminPassword(pw);
                  ADMIN_FAMILIES = result.families;
                  location.hash = '#/admin'; render();
          } else {
                  document.getElementById('admin-login-error').style.display = 'block';
          }
    });

  // admin logout
  const adminLogoutLink = document.getElementById('admin-logout-link');
    if (adminLogoutLink) adminLogoutLink.addEventListener('click', (e) => {
          e.preventDefault();
          clearAdminPassword(); ADMIN_FAMILIES = null;
          location.hash = '#/'; render();
    });

  // admin approve / reject / reset actions
  document.querySelectorAll('[data-admin-action]').forEach(btn => {
        btn.addEventListener('click', async () => {
                const id = btn.dataset.id; const status = btn.dataset.adminAction;
                const pw = getAdminPassword();
                btn.disabled = true;
                const result = await setAdminStatus(pw, id, status);
                if (result.ok && ADMIN_FAMILIES){
                          ADMIN_FAMILIES = ADMIN_FAMILIES.map(f => f.id === id ? { ...f, status } : f);
                }
                render();
        });
  });

  // load the admin family list once when entering the admin page
  if (parts[0] === 'admin' && ADMIN_FAMILIES === null){
        const pw = getAdminPassword();
        if (pw) fetchAdminList(pw).then(result => { ADMIN_FAMILIES = result.ok ? result.families : []; render(); });
  }
}

function pushChatMessage(reqId, text){
    const req = findRequest(reqId); if (!req) return;
    const messages = req.messages || [];
    messages.push({ from: 'me', text });
    updateRequest(reqId, { messages });
}

function val(id){ const el = document.getElementById(id); return el ? el.value : ''; }
function selectedChip(containerId){ const el = document.querySelector(`#${containerId} .chip.selected`); return el ? el.dataset.value : ''; }
function selectedChips(containerId){ return Array.from(document.querySelectorAll(`#${containerId} .chip.selected`)).map(c => c.dataset.value); }

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', () => {
    document.documentElement.lang = currentLang;
    document.documentElement.dir = I18N[currentLang].dir;
    render();
    fetchApprovedFamilies().then(list => {
          LIVE_FAMILIES = list;
          const route = parseHash().parts.join('/');
          if (route === 'discover' || route.startsWith('dashboard/student')) render();
    });
});
