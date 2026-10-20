// Display formatting only. Stored timing and ranking precision remain unchanged.
export function recordedTime(seconds){
 if(!Number.isFinite(seconds)||seconds<0)return '—';
 const total=Math.round(seconds*1000),minutes=Math.floor(total/60000),remaining=total%60000;
 return `${minutes}:${String(Math.floor(remaining/1000)).padStart(2,'0')}.${String(remaining%1000).padStart(3,'0')}`;
}
export function runningTime(seconds){
 if(!Number.isFinite(seconds)||seconds<0)return '—';
 return `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
}
