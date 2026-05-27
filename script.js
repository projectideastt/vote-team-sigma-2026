
(function(){
  const $=(sel,root=document)=>root.querySelector(sel);
  const $$=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const storeKey='teamSigmaPublicReleaseV3';
  const defaultState={
    'policy-fundraising':true,
    'policy-admissions':false,
    'policy-hr':false,
    'policy-pr':false,
    'policy-fieldtrip':false,
    'policy-health':false,
    'candidates':false,
    'manifesto':false
  };
  const aliases={
    AnonymousRelease:'UnlockAll',
    AnonymousClose:'LockAll',
    ResetSchedule:'Reset',
    OpenTuesday:'UnlockCandidates',
    OpenThursday:'UnlockPolicies'
  };
  function loadState(){
    try{return {...defaultState,...JSON.parse(localStorage.getItem(storeKey)||'{}')}}catch(e){return {...defaultState}}
  }
  function saveState(state){localStorage.setItem(storeKey,JSON.stringify(state));}
  function setKeys(keys,val){const s=loadState();keys.forEach(k=>s[k]=val);saveState(s);applyRelease();}
  const policyKeys=['policy-admissions','policy-hr','policy-pr','policy-fieldtrip','policy-health'];
  const allKeys=Object.keys(defaultState);
  function applyRelease(){
    const s=loadState();
    $$('[data-release-key]').forEach(el=>{
      const keys=String(el.dataset.releaseKey||'').split(/\s+/).filter(Boolean);
      const open=keys.some(k=>!!s[k]);
      el.classList.toggle('release-open',open);
      el.classList.toggle('release-locked',!open);
      el.setAttribute('aria-disabled',open?'false':'true');
    });
    $$('[data-status-key]').forEach(el=>{
      const key=el.dataset.statusKey;
      const open=!!s[key];
      el.textContent=open?'Available':'Coming soon';
      el.classList.toggle('open',open);
    });
    const status=$('#sigma-status');
    if(status){
      const openPolicies=policyKeys.filter(k=>s[k]).length + (s['policy-fundraising']?1:0);
      status.textContent=`This browser view: ${s.candidates?'team open':'team locked'} · ${openPolicies}/6 policies open · ${s.manifesto?'manifesto open':'manifesto locked'}`;
    }
  }
  function command(raw){
    const cmd=aliases[(raw||'').trim()] || (raw||'').trim();
    const msg=$('#sigma-message');
    const say=t=>{if(msg) msg.textContent=t;};
    const s=loadState();
    const one={
      UnlockFundraising:['policy-fundraising'], LockFundraising:['policy-fundraising'],
      UnlockAdmissions:['policy-admissions'], LockAdmissions:['policy-admissions'],
      UnlockHR:['policy-hr'], LockHR:['policy-hr'],
      UnlockPR:['policy-pr'], LockPR:['policy-pr'],
      UnlockFieldTrip:['policy-fieldtrip'], LockFieldTrip:['policy-fieldtrip'],
      UnlockHealth:['policy-health'], LockHealth:['policy-health'],
      UnlockCandidates:['candidates'], LockCandidates:['candidates'],
      UnlockManifesto:['manifesto'], LockManifesto:['manifesto']
    };
    if(cmd==='UnlockAll'){setKeys(allKeys,true);say('All staged sections are open in this browser.');return;}
    if(cmd==='LockAll'){const locked={...defaultState,'policy-fundraising':true};saveState(locked);applyRelease();say('Staged sections locked. Fundraising remains available.');return;}
    if(cmd==='UnlockPolicies'){setKeys(['policy-fundraising',...policyKeys],true);say('All policy cards are open in this browser.');return;}
    if(cmd==='LockPolicies'){const st=loadState();policyKeys.forEach(k=>st[k]=false);st['policy-fundraising']=true;saveState(st);applyRelease();say('Policy cards locked except Fundraising.');return;}
    if(cmd==='Reset'){localStorage.removeItem(storeKey);applyRelease();say('Browser view reset to public default.');return;}
    if(one[cmd]){setKeys(one[cmd],!cmd.startsWith('Lock'));say(`${cmd} applied.`);return;}
    say('Command not recognised.');
  }
  function initSecret(){
    const trig=$('#sigma-trigger'), panel=$('#sigma-panel'), close=$('#sigma-close'), form=$('#sigma-form'), input=$('#sigma-code');
    let taps=0,timer=null;
    if(trig&&panel){trig.addEventListener('click',()=>{taps++;clearTimeout(timer);timer=setTimeout(()=>taps=0,1800);if(taps>=7){panel.classList.add('open');taps=0;}})}
    if(close&&panel){close.addEventListener('click',()=>panel.classList.remove('open'));}
    if(form){form.addEventListener('submit',e=>{e.preventDefault();command(input.value);input.value='';});}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const menu=$('#menu-toggle'), nav=$('#nav');
    if(menu&&nav)menu.addEventListener('click',()=>nav.classList.toggle('open'));
    initSecret();applyRelease();
  });
})();
