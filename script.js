(function(){
  const $=(sel,root=document)=>root.querySelector(sel);
  const $$=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const storeKey='teamSigmaPublicReleaseV6';
  const scheduleKey='teamSigmaPublicReleaseScheduleV2';
  const defaultState={
    'policy-fundraising':true,
    'policy-admissions':false,
    'policy-hr':false,
    'policy-pr':false,
    'policy-fieldtrip':false,
    'policy-health':false,
    'candidate-president':false,
    'candidate-vice-president':false,
    'candidate-secretary':false,
    'candidate-treasurer':false,
    'manifesto':false
  };
  const groups={
    policies:['policy-fundraising','policy-admissions','policy-hr','policy-pr','policy-fieldtrip','policy-health'],
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
    'candidate-president':'Board President Profile',
    'candidate-vice-president':'Board Vice President Profile',
    'candidate-secretary':'Board Secretary Profile',
    'candidate-treasurer':'Board Treasurer Profile',
    'manifesto':'Manifesto',
    'policies':'All Policies',
    'candidates':'All Candidate Profiles',
    'all':'Everything'
  };
  const aliases={
    AnonymousRelease:'UnlockAll',AnonymousClose:'LockAll',ResetSchedule:'Reset',OpenTuesday:'UnlockCandidates',OpenThursday:'UnlockPolicies'
  };
  function loadState(){try{return {...defaultState,...JSON.parse(localStorage.getItem(storeKey)||'{}')}}catch(e){return {...defaultState}}}
  function saveState(state){localStorage.setItem(storeKey,JSON.stringify(state));}
  function loadSchedules(){try{return JSON.parse(localStorage.getItem(scheduleKey)||'{}')}catch(e){return {}}}
  function saveSchedules(s){localStorage.setItem(scheduleKey,JSON.stringify(s));}
  function keysFor(item){return groups[item]||[item];}
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
    const rows=[...groups.candidates,'manifesto',...groups.policies].map(k=>{
      const state=s[k]?'Released':(sch[k]?'Scheduled':'Locked');
      const when=sch[k]?` · ${new Date(Number(sch[k])).toLocaleString()}`:'';
      return `<div><strong>${labels[k]||k}</strong><span>${state}${when}</span></div>`;
    }).join('');
    const openPolicies=groups.policies.filter(k=>s[k]).length;
    const openCandidates=groups.candidates.filter(k=>s[k]).length;
    status.innerHTML=`<h3>Page Status</h3><p>${openCandidates}/4 candidate profiles released · ${openPolicies}/6 policies released · ${s.manifesto?'Manifesto released':'Manifesto locked'}</p><div class="status-grid">${rows}</div>`;
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
    const s=loadState();
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
      UnlockPresident:['candidate-president'],LockPresident:['candidate-president'],
      UnlockVicePresident:['candidate-vice-president'],LockVicePresident:['candidate-vice-president'],
      UnlockSecretary:['candidate-secretary'],LockSecretary:['candidate-secretary'],
      UnlockTreasurer:['candidate-treasurer'],LockTreasurer:['candidate-treasurer'],
      UnlockCandidates:groups.candidates,LockCandidates:groups.candidates,
      UnlockManifesto:['manifesto'],LockManifesto:['manifesto']
    };
    if(cmd==='UnlockAll'){setKeys(groups.all,true);removeSchedulesFor(groups.all);say('All sections are released in this browser.');return;}
    if(cmd==='LockAll'){const locked={...defaultState,'policy-fundraising':true};saveState(locked);removeSchedulesFor(groups.all);applyRelease();say('Sections locked. Fundraising remains available.');return;}
    if(cmd==='UnlockPolicies'){setKeys(groups.policies,true);removeSchedulesFor(groups.policies);say('All policy pages are released in this browser.');return;}
    if(cmd==='LockPolicies'){const st=loadState();groups.policies.forEach(k=>st[k]=false);st['policy-fundraising']=true;saveState(st);removeSchedulesFor(groups.policies);applyRelease();say('Policy pages locked except Fundraising.');return;}
    if(cmd==='Reset'){localStorage.removeItem(storeKey);localStorage.removeItem(scheduleKey);applyRelease();renderSchedules();say('Browser view reset to public default.');return;}
    if(one[cmd]){const unlock=!cmd.startsWith('Lock');setKeys(one[cmd],unlock);removeSchedulesFor(one[cmd]);say(`${cmd} applied.`);return;}
    say('Command not recognised.');
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
      if(ts<=Date.now()){setKeys(keys,true);removeSchedulesFor(keys);say(`${labels[item]||item} released because the scheduled time has already passed.`);}
      else{applyRelease();say(`${labels[item]||item} scheduled for ${date} at ${time}.`);}
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
    initSecret();applyRelease();renderSchedules();setInterval(()=>{checkSchedules();applyRelease();},30000);
  });
})();
