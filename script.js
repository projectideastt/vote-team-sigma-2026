(function(){
  const $=(sel,root=document)=>root.querySelector(sel);
  const $$=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const storeKey='teamSigmaPublicReleaseV6';
  const scheduleKey='teamSigmaPublicReleaseScheduleV2';
  const defaultState={
    // Public default: candidate profiles are live on the site.
    // Public release package: candidate profiles and policy pages are live by default.
    'policy-fundraising':true,
    'policy-admissions':true,
    'policy-hr':true,
    'policy-pr':true,
    'policy-fieldtrip':true,
    'policy-health':true,
    'policy-conduct':true,
    'candidate-president':true,
    'candidate-vice-president':true,
    'candidate-secretary':true,
    'candidate-treasurer':true
  };
  const groups={
    policies:['policy-fundraising','policy-admissions','policy-hr','policy-pr','policy-fieldtrip','policy-health','policy-conduct'],
    candidates:['candidate-president','candidate-vice-president','candidate-secretary','candidate-treasurer'],
    all:Object.keys(defaultState)
  };
  const labels={
    'policy-fundraising':'Fundraising & Donation Policy',
    'policy-admissions':'Admissions & Enrolment Policy',
    'policy-hr':'Human Resource Policy',
    'policy-pr':'Public Relations & Social Media Policy',
    'policy-fieldtrip':'Field Trip Policy',
    'policy-health':'Health Emergency Response Policy',
    'policy-conduct':'Student Code of Conduct & Discipline Policy',
    'candidate-president':'Board President Profile',
    'candidate-vice-president':'Board Vice President Profile',
    'candidate-secretary':'Board Secretary Profile',
    'candidate-treasurer':'Board Treasurer Profile',
    'policies':'All Policies',
    'candidates':'All Candidate Profiles',
    'all':'Everything'
  };
  const aliases={
    AnonymousRelease:'UnlockAll',AnonymousClose:'LockAll',ResetSchedule:'Reset',OpenTuesday:'UnlockCandidates',OpenThursday:'UnlockPolicies'
  };
  const scriptUrl = document.currentScript ? new URL(document.currentScript.src) : new URL('script.js', window.location.href);
  const releaseConfigUrl = new URL('release-config.json', scriptUrl).href;
  let globalConfig = {loaded:false,error:null,releases:{}};

  function loadState(){try{return {...defaultState,...JSON.parse(localStorage.getItem(storeKey)||'{}')}}catch(e){return {...defaultState}}}
  function saveState(state){localStorage.setItem(storeKey,JSON.stringify(state));}
  function loadSchedules(){try{return JSON.parse(localStorage.getItem(scheduleKey)||'{}')}catch(e){return {}}}
  function saveSchedules(s){localStorage.setItem(scheduleKey,JSON.stringify(s));}
  function keysFor(item){return groups[item]||[item];}

  async function loadGlobalConfig(){
    try{
      const res = await fetch(releaseConfigUrl,{cache:'no-store'});
      if(!res.ok) throw new Error('Release config not found');
      const data = await res.json();
      globalConfig = {
        loaded:true,
        error:null,
        timezone:data.timezone || '',
        releases:data.releases || {},
        updated:data.updated || data.generatedFor || ''
      };
    }catch(e){
      globalConfig = {...globalConfig,loaded:false,error:e.message || 'Could not load release config'};
    }
  }

  function globalReleasedState(){
    const out={};
    const now=Date.now();
    Object.entries(globalConfig.releases || {}).forEach(([item,value])=>{
      const ts = Date.parse(value);
      if(Number.isFinite(ts) && ts<=now){
        keysFor(item).forEach(k=>out[k]=true);
      }
    });
    return out;
  }

  function getEffectiveState(){
    // Global release-config.json is the public source of truth. Local controls can preview early unlocks,
    // but they cannot hide something after the global release time has passed.
    return {...loadState(),...globalReleasedState()};
  }

  function globalScheduleForKey(key){
    const releases=globalConfig.releases || {};
    if(releases[key]) return releases[key];
    for(const [group,value] of Object.entries(releases)){
      if((groups[group]||[]).includes(key)) return value;
    }
    return '';
  }
  function setKeys(keys,val){const s=loadState();keys.forEach(k=>s[k]=val);saveState(s);applyRelease();}
  function removeSchedulesFor(keys){const sch=loadSchedules();keys.forEach(k=>delete sch[k]);saveSchedules(sch);renderSchedules();}
  function checkSchedulesNoLoop(){
    const sch=loadSchedules(); const now=Date.now(); let changed=false; const st=loadState();
    Object.entries(sch).forEach(([key,ts])=>{ if(Number(ts)<=now){ st[key]=true; delete sch[key]; changed=true; }});
    if(changed){saveState(st);saveSchedules(sch);}
  }
  function checkSchedules(){
    const before=JSON.stringify(loadSchedules());
    checkSchedulesNoLoop();
    if(before!==JSON.stringify(loadSchedules())){applyRelease();renderSchedules();}
  }
  function setReleasedClasses(s){
    $$('[data-release-key]').forEach(el=>{
      const keys=String(el.dataset.releaseKey||'').split(/\s+/).filter(Boolean);
      const open=keys.some(k=>!!s[k]);
      el.classList.toggle('release-open',open);
      el.classList.toggle('release-locked',!open);
      el.setAttribute('aria-disabled',open?'false':'true');
      if(open){
        $$('.release-photo[data-src]', el).forEach(img=>{
          if(!img.getAttribute('src') || img.getAttribute('src').includes('profile-slot.svg')){
            img.setAttribute('src', img.dataset.src);
          }
        });
      }
    });
    $$('[data-status-key]').forEach(el=>{
      const key=el.dataset.statusKey;const open=!!s[key];
      el.textContent=open?'Available':'Coming soon';
      el.classList.toggle('open',open);
    });
  }
  function updateCandidateIntro(s){
    const open=groups.candidates.filter(k=>s[k]).length;
    const text = open===0
      ? 'Candidate profiles will be shared soon. Each card will reveal the candidate’s photo, message and profile link when available.'
      : open<groups.candidates.length
        ? 'Candidate profiles are being shared in stages. Select an available profile to learn more about each candidate’s message and priorities.'
        : 'Meet the Team Sigma candidates and learn more about their experience, priorities, and commitment to accountable, student-centred leadership.';
    $$('[data-candidate-intro]').forEach(el=>{el.textContent=text;});
  }
  function updateStatusPanel(s){
    const status=$('#sigma-status');
    if(!status) return;
    const sch=loadSchedules();
    const rows=[...groups.candidates,...groups.policies].map(k=>{
      const globalWhen=globalScheduleForKey(k);
      const globalTs=globalWhen ? Date.parse(globalWhen) : NaN;
      let state=s[k]?'Released':(sch[k]?'Local scheduled':(globalWhen?'Global scheduled':'Locked'));
      let when='';
      if(sch[k]) when=` · ${new Date(Number(sch[k])).toLocaleString()}`;
      else if(globalWhen && Number.isFinite(globalTs)) when=` · ${new Date(globalTs).toLocaleString()}`;
      return `<div><strong>${labels[k]||k}</strong><span>${state}${when}</span></div>`;
    }).join('');
    const openPolicies=groups.policies.filter(k=>s[k]).length;
    const openCandidates=groups.candidates.filter(k=>s[k]).length;
    const configNote = globalConfig.loaded ? 'Global release config loaded.' : 'Global release config not loaded; local preview controls only.';
    status.innerHTML=`<h3>Page Status</h3><p>${openCandidates}/4 candidate profiles released · ${openPolicies}/7 policies released<br>${configNote}</p><div class="status-grid">${rows}</div>`;
  }
  async function checkPdfFiles(s){
    const cards=$$('[data-pdf-url]');
    for(const card of cards){
      const url=card.dataset.pdfUrl;
      if(card.dataset.pdfKnown==='true'){
        card.classList.add('file-present');card.classList.remove('file-missing');
        continue;
      }
      card.classList.add('file-checking');
      try{
        const res=await fetch(url,{method:'HEAD',cache:'no-store'});
        if(res.ok){card.classList.add('file-present');card.classList.remove('file-missing');}
        else{card.classList.add('file-missing');card.classList.remove('file-present');}
      }catch(e){
        // Some local previews block HEAD; try a tiny GET before deciding the file is absent.
        try{const res=await fetch(url,{method:'GET',cache:'no-store'}); if(res.ok){card.classList.add('file-present');card.classList.remove('file-missing');} else {card.classList.add('file-missing');card.classList.remove('file-present');}}
        catch(_){card.classList.add('file-missing');card.classList.remove('file-present');}
      }finally{card.classList.remove('file-checking');}
    }
  }
  function applyRelease(){
    checkSchedulesNoLoop();
    const s=getEffectiveState();
    setReleasedClasses(s);
    updateCandidateIntro(s);
    updateStatusPanel(s);
    checkPdfFiles(s);
  }
  function say(t){const msg=$('#sigma-message'); if(msg) msg.textContent=t;}
  function command(raw){
    const cmd=aliases[(raw||'').trim()] || (raw||'').trim();
    const one={
      UnlockFundraising:['policy-fundraising'],LockFundraising:['policy-fundraising'],
      UnlockAdmissions:['policy-admissions'],LockAdmissions:['policy-admissions'],
      UnlockHR:['policy-hr'],LockHR:['policy-hr'],
      UnlockPR:['policy-pr'],LockPR:['policy-pr'],
      UnlockFieldTrip:['policy-fieldtrip'],LockFieldTrip:['policy-fieldtrip'],
      UnlockHealth:['policy-health'],LockHealth:['policy-health'],
      UnlockConduct:['policy-conduct'],LockConduct:['policy-conduct'],
      UnlockPresident:['candidate-president'],LockPresident:['candidate-president'],
      UnlockVicePresident:['candidate-vice-president'],LockVicePresident:['candidate-vice-president'],
      UnlockSecretary:['candidate-secretary'],LockSecretary:['candidate-secretary'],
      UnlockTreasurer:['candidate-treasurer'],LockTreasurer:['candidate-treasurer'],
      UnlockCandidates:groups.candidates,LockCandidates:groups.candidates
    };
    if(cmd==='UnlockAll'){setKeys(groups.all,true);removeSchedulesFor(groups.all);say('All sections are released in this browser.');return;}
    if(cmd==='LockAll'){const locked={...defaultState};groups.policies.forEach(k=>locked[k]=false);locked['policy-fundraising']=true;saveState(locked);removeSchedulesFor(groups.all);applyRelease();say('Sections locked. Fundraising remains available.');return;}
    if(cmd==='UnlockPolicies'){setKeys(groups.policies,true);removeSchedulesFor(groups.policies);say('All policy pages are released in this browser.');return;}
    if(cmd==='LockPolicies'){const st=loadState();groups.policies.forEach(k=>st[k]=false);st['policy-fundraising']=true;saveState(st);removeSchedulesFor(groups.policies);applyRelease();say('Policy pages locked except Fundraising.');return;}
    if(cmd==='Reset'){localStorage.removeItem(storeKey);localStorage.removeItem(scheduleKey);applyRelease();renderSchedules();say('Browser view reset to public default.');return;}
    if(one[cmd]){const unlock=!cmd.startsWith('Lock');setKeys(one[cmd],unlock);removeSchedulesFor(one[cmd]);say(`${cmd} applied.`);return;}
    say('Command not recognised.');
  }
  function lockKeysForFutureSchedule(keys,item){
    const st=loadState();
    keys.forEach(k=>{
      // Keep the fundraising policy public by default unless it is being scheduled directly.
      if(k==='policy-fundraising' && item!=='policy-fundraising') return;
      st[k]=false;
    });
    saveState(st);
  }
  function applyPanelAction(){
    const item=$('#rollout-item')?.value || 'all'; const action=$('#rollout-action')?.value || 'unlock'; const scheduled=$('#rollout-scheduled')?.checked;
    const date=$('#rollout-date')?.value; const time=$('#rollout-time')?.value || '00:00'; const keys=keysFor(item);
    if(action==='lock'){setKeys(keys,false);removeSchedulesFor(keys);say(`${labels[item]||item} locked in this browser.`);return;}
    if(scheduled){
      if(!date){say('Choose a date before scheduling a release.');return;}
      const ts=new Date(`${date}T${time}`).getTime();
      if(!Number.isFinite(ts)){say('The selected date/time could not be read.');return;}
      const sch=loadSchedules(); keys.forEach(k=>sch[k]=ts); saveSchedules(sch); renderSchedules();
      if(ts<=Date.now()){
        setKeys(keys,true);removeSchedulesFor(keys);say(`${labels[item]||item} released because the scheduled time has already passed.`);
      }
      else{
        // Important: scheduling a future release should stage/lock the item now, then reveal it at the scheduled time.
        lockKeysForFutureSchedule(keys,item);
        applyRelease();
        say(`${labels[item]||item} scheduled for ${date} at ${time}. It will stay hidden until that time in this browser.`);
      }
      return;
    }
    setKeys(keys,true);removeSchedulesFor(keys);say(`${labels[item]||item} unlocked immediately in this browser.`);
  }
  function renderSchedules(){
    const box=$('#schedule-list'); if(!box) return; const sch=loadSchedules(); const entries=Object.entries(sch);
    if(!entries.length){box.textContent='No scheduled browser releases set.';return;}
    box.innerHTML='<strong>Scheduled browser releases:</strong><br>'+entries.map(([k,ts])=>`${labels[k]||k}: ${new Date(Number(ts)).toLocaleString()}`).join('<br>');
  }
  function initSecret(){
    const trig=$('#sigma-trigger'), panel=$('#sigma-panel'), close=$('#sigma-close'), form=$('#sigma-form'), input=$('#sigma-code'), apply=$('#rollout-apply');
    let taps=0,timer=null;
    if(trig&&panel){trig.addEventListener('click',()=>{taps++;clearTimeout(timer);timer=setTimeout(()=>taps=0,1800);if(taps>=7){panel.classList.add('open');taps=0;renderSchedules();applyRelease();}})}
    if(close&&panel){close.addEventListener('click',()=>panel.classList.remove('open'));}
    if(form){form.addEventListener('submit',e=>{e.preventDefault();command(input.value);input.value='';});}
    if(apply){apply.addEventListener('click',applyPanelAction);}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const menu=$('#menu-toggle'), nav=$('#nav'); if(menu&&nav)menu.addEventListener('click',()=>nav.classList.toggle('open'));
    initSecret();applyRelease();renderSchedules();
    loadGlobalConfig().then(()=>{applyRelease();renderSchedules();});
    setInterval(()=>{checkSchedules();applyRelease();},30000);
    setInterval(()=>{loadGlobalConfig().then(()=>applyRelease());},120000);
  });
})();
