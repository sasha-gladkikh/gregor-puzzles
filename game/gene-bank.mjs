import {node} from './clinical-ui.mjs';

let bankId=0;

// A candidate list reduces recall burden without choosing an answer for the
// player. Checking a selection uses the same recognition flow as typed entry.
export function geneBank(rounds,{onChoose=()=>{}}={}){
  const id=`gene-bank-${++bankId}`;
  const genes=[...new Set(rounds.map(round=>round.gene).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,'en',{numeric:true}));
  const events=new AbortController();
  const element=node('form',null,'gene-bank');
  const intro=node('p','Choose a candidate, then check your answer. A correct answer completes this round.','gene-bank-intro');
  intro.id=`${id}-intro`;
  const hintPanel=node('section',null,'gene-bank-hint');
  hintPanel.hidden=true;hintPanel.tabIndex=-1;
  const hintTitle=node('h3','Gene hints'),hintText=node('p');
  hintTitle.id=`${id}-hint-title`;
  hintPanel.setAttribute('aria-labelledby',hintTitle.id);
  hintText.setAttribute('role','status');
  hintText.setAttribute('aria-live','polite');
  hintText.setAttribute('aria-atomic','true');
  hintPanel.append(hintTitle,hintText);
  const choices=node('fieldset',null,'gene-bank-choices');
  choices.setAttribute('aria-describedby',intro.id);
  choices.append(node('legend',`${genes.length} possible genes`));
  const grid=node('div',null,'gene-bank-grid');
  const inputs=[];
  const status=node('p',`Select one of the ${genes.length} genes.`,'gene-bank-status');
  status.id=`${id}-status`;
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  status.setAttribute('aria-atomic','true');
  const submit=node('button','Check gene','primary gene-bank-check');
  submit.type='submit';
  submit.disabled=true;

  for(const gene of genes){
    const option=node('label',null,'gene-bank-option');
    const input=node('input');
    input.type='radio';
    input.name=id;
    input.value=gene;
    input.addEventListener('change',()=>{
      if(!input.checked)return;
      submit.disabled=false;
      status.textContent=`Selected: ${gene}`;
      status.classList.remove('is-feedback','is-correct');
      element.classList.add('has-selection');
    },{signal:events.signal});
    const name=node('span',gene,'gene-bank-symbol');
    const indicator=node('span','✓','gene-bank-indicator');
    indicator.setAttribute('aria-hidden','true');
    option.append(input,name,indicator);
    grid.append(option);
    inputs.push(input);
  }
  choices.append(grid);
  const actions=node('div',null,'gene-bank-actions');
  actions.append(status,submit);
  element.append(intro,hintPanel,choices,actions);
  element.addEventListener('submit',event=>{
    event.preventDefault();
    const selected=inputs.find(input=>input.checked);
    if(selected)onChoose(selected.value);
  },{signal:events.signal});

  return {
    element,
    focus(){(inputs.find(input=>input.checked)||inputs[0])?.focus({preventScroll:true});},
    feedback(message,{correct=false}={}){
      status.textContent=message;
      status.classList.add('is-feedback');
      status.classList.toggle('is-correct',correct);
    },
    focusHint(){
      if(hintPanel.hidden)return;
      hintPanel.focus({preventScroll:true});
      hintPanel.scrollIntoView({block:'nearest',behavior:'instant'});
    },
    hint(message){
      hintText.textContent=message||'';
      hintPanel.hidden=!message;
    },
    reset(){
      element.reset();
      submit.disabled=true;
      status.textContent=`Select one of the ${genes.length} genes.`;
      status.classList.remove('is-feedback','is-correct');
      element.classList.remove('has-selection');
      hintText.textContent='';hintPanel.hidden=true;
    },
    dispose(){events.abort();element.remove();}
  };
}
