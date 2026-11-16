import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

async function syncEnvironment() {
  const res = await fetch('/sandbox/config', {signal:AbortSignal.timeout(3000)});
  if(!res.ok) return false;
  const config = await res.json();
  const previous = sessionStorage.getItem('weverse-environment');
  const changed = previous !== config.generation;
  if(changed) { sessionStorage.removeItem('purchase-session'); sessionStorage.setItem('weverse-environment',config.generation); sessionStorage.setItem('sandbox-email',config.email); if(previous) window.location.hash='#/2a'; }
  return changed;
}
async function start() {
await syncEnvironment().catch(()=>false);
setInterval(()=>{ void syncEnvironment().then(changed=>{if(changed)window.location.reload();}).catch(()=>{}); },3000);
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

}
void start();
