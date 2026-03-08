import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// #region agent log
window.addEventListener('error', (event) => {
  fetch('http://127.0.0.1:7242/ingest/34a31eca-04e2-47cb-a2ec-1ea87758ed16',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.ts:7',message:'Global error handler',data:{message:event.message,filename:event.filename,lineno:event.lineno,error:event.error?.message||String(event.error)},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
});
window.addEventListener('unhandledrejection', (event) => {
  fetch('http://127.0.0.1:7242/ingest/34a31eca-04e2-47cb-a2ec-1ea87758ed16',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.ts:10',message:'Unhandled promise rejection',data:{reason:event.reason?.message||String(event.reason)},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
});
// #endregion

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/34a31eca-04e2-47cb-a2ec-1ea87758ed16',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.ts:16',message:'Bootstrap error',data:{error:err?.message||String(err),stack:err?.stack},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.error(err);
  });
