import{i as gt,a as O,f as H,e as q,s as V}from"../chunks/TaKWw6Tr.js";import{i as Qe}from"../chunks/j2M9h5Jk.js";import{o as Ye}from"../chunks/r3_wVOpG.js";import{b1 as vt,aC as mt,B as Ve,a7 as Le,a8 as Ke,F as Je,z as we,a as e,a3 as P,G as w,s as z,b2 as pt,H as y,I as b,C as et,aa as Te,u as W,E as K,n as bt,a9 as wt}from"../chunks/WP6s4_OC.js";import{i as Q,s as yt,a as _t}from"../chunks/DEPZNxei.js";import{f as se,h as kt}from"../chunks/B87DtkF7.js";import{s as zt}from"../chunks/CHFiJeZL.js";import{b as xt}from"../chunks/YWP4DBZ4.js";import{p as De,n as Ct,g as Lt,h as ue,l as St,o as Mt,r as ye,e as Pt,s as qe,d as _e,f as ke,k as Et,i as Wt,b as Ne,q as Ft,m as It,v as Ut,c as ze,a as Ot}from"../chunks/BrxjxZQ_.js";import{p as xe}from"../chunks/CByjIOJv.js";import"../chunks/8UtF8RsF.js";function Xe(o,d){vt(window,["resize"],()=>mt(()=>d(window[o])))}function At(o,d){let s=d;s.endsWith("/")||(s+="/");const v=o.startsWith("/")?o.substring(1):o;return new URL(v,s).toString()}function Rt(o,d){const s=new URL(o),v=new URL(d),h=s.pathname.startsWith("/")?s.pathname.substring(1):s.pathname;let A=v.pathname;return A.endsWith("/")||(A+="/"),v.pathname=A+h,v.search=s.search,v.hash=s.hash,v.toString()}function $t(o){return!o.match(/^https?:\/\//)&&!o.startsWith("data:")&&!o.startsWith("blob:")}function Ht(o){return o.startsWith("http://local-server.furcadia.com:8080/")||o.startsWith("https://terra.furcadia.com/")}function Bt(o,d,s){const v=o,h=v.XMLHttpRequest;v.FurcXMLHttpRequest=class extends h{static UNSENT=0;static OPENED=1;static HEADERS_RECEIVED=2;static LOADING=3;static DONE=4;open(C,_,...L){let f=_.toString();return $t(f)?(f=At(f,d),console.log(`[FurcXMLHttpRequest] Remapped relative URL to: ${f}`)):Ht(f)&&(f=Rt(f,s),console.log(`[FurcXMLHttpRequest] Remapped backend URL to: ${f}`)),super.open(C,f,...L)}}}class Ge{buffer="";append(d){this.buffer+=d;const s=[];let v;for(;(v=this.buffer.indexOf(`
`))!==-1;){const h=this.buffer.substring(0,v);s.push(h),this.buffer=this.buffer.substring(v+1)}return s}get isEmpty(){return this.buffer.length===0}clear(){this.buffer=""}}function Tt(o){const d=o,s=d.MessageEvent,v=d.Blob,h=d.Uint8Array,A=d.ArrayBuffer,C={encode:c=>{const t=c.length,n=new h(t);for(let g=0;g<t;g++)n[g]=c.charCodeAt(g)&255;return n}},_={decode:c=>{if(typeof c=="string")return c;let t;c instanceof h?t=c:c instanceof A||c instanceof ArrayBuffer?t=new h(c):t=new h(c.buffer,c.byteOffset,c.byteLength);let n="";const g=t.length,m=32768;for(let k=0;k<g;k+=m){const S=t.subarray(k,Math.min(k+m,g));n+=String.fromCharCode.apply(null,S)}return n}};let L=null,f;d.waitForFurc=new Promise(c=>{f=c});function M(c,t,n,g){t.endsWith(`
`)||(t+=`
`);const m=C.encode(t),k=new s("message",{data:m,origin:"wss://lightbringer.furcadia.com"});k.tag=g,k.sourceId=n,c.dispatchEvent(k)}function F(c,t,n,g){if(c.readyState===WebSocket.OPEN){t.endsWith(`
`)||(t+=`
`);const m=C.encode(t);c.sendTagged?c.sendTagged(m,n,g):c.send(m)}}const x=d.WebSocket;d.FurcWebSocket=class extends x{static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;_outgoingQueue=Promise.resolve();_incomingQueue=Promise.resolve();_incomingBuffer=new Ge;_outgoingBuffer=new Ge;constructor(t,n){if(super(t,n),t.toString().includes("furcadia")||t.toString().includes("6502")){console.log("%c😈 Game Socket Captured","color: #ff00ff;"),L=this;const g=se;g&&(g.send=(m,k,S)=>F(this,m,k,S),g.inject=(m,k,S)=>M(this,m,k,S),console.log("[Furnarchy] Connected to Game Socket")),this.addEventListener("open",()=>{f(this);const m=se;m&&m.notifyConnected()}),this.addEventListener("close",()=>{const m=se;m&&m.notifyDisconnected()})}}send(t){this.sendTagged(t,void 0,void 0)}sendTagged(t,n,g){if(L!==this){super.send(t);return}this._outgoingQueue=this._outgoingQueue.then(async()=>{let m=typeof t=="string"?t:_.decode(t);const k=this._outgoingBuffer.append(m);if(k.length===0)return;const S=[];for(let N of k){const B=se;if(B){const U=await B.processOutgoing(N,n,g);if(U==null){console.log("%c🚫 Outgoing Dropped (Furnarchy)","color: gray; font-size: 9px");continue}N=U}S.push(N)}if(S.length===0)return;const j=S.join(`
`)+`
`,Z=C.encode(j);super.send(Z)}).catch(m=>{console.error("Error in outgoing message queue:",m)})}_hookMessageEvent(t,n){const g=t.tag,m=t.sourceId;this._incomingQueue=this._incomingQueue.then(async()=>{let k=typeof t.data=="string"?t.data:_.decode(t.data);const S=this._incomingBuffer.append(k);if(S.length===0)return;const j=[];for(let U of S){const Y=se;if(Y){const ee=await Y.processIncoming(U,m,g);if(ee==null)continue;U=ee}j.push(U)}if(j.length===0)return;const Z=j.join(`
`)+`
`;let N=Z;this.binaryType==="arraybuffer"?N=C.encode(Z).buffer:this.binaryType==="blob"&&(N=new v([C.encode(Z)]));const B=new s("message",{data:N,origin:t.origin,source:t.source});n(B)}).catch(k=>{console.error("Error in incoming message queue:",k)})}set onmessage(t){L===this&&t?super.onmessage=n=>{this._hookMessageEvent(n,g=>{t.call(this,g)})}:super.onmessage=t}get onmessage(){return super.onmessage}addEventListener(t,n,g){if(t==="message"&&L===this&&typeof n=="function"){const m=k=>{this._hookMessageEvent(k,S=>{n.call(this,S)})};super.addEventListener(t,m,g);return}super.addEventListener(t,n,g)}}}async function Dt(o,d){const s=o,v=await fetch(d);if(!v.ok)throw new Error(`Failed to fetch client script: ${v.statusText}`);let h=await v.text();h=h.replaceAll("XMLHttpRequest","FurcXMLHttpRequest"),h=h.replaceAll("WebSocket","FurcWebSocket");const A=h.length;h=(()=>{let _=h.indexOf("Missing login data");if(_===-1)return h;const L=h.substring(0,_),f="__instantiate",M=`
            let ${f} = (cls, ...args) => {
                // Instantate the class.
                const r = $2(cls, ...args);
                // Wait a tick then find the instance in the result object.
                setTimeout(() => {
                    for (const key in r) {
                        if (r[key] instanceof cls) {
                            console.log('[Furc Loader] Captured game instance.');
                            window.processGameClientInstance(r[key]);
                            return;
                        }
                    }
                    console.log('[Furc Loader] Warning: Could not find game instance in instantiated object.');
                }, 0);
                return r;
            }
        `,F=h.substring(_).replace(/;\s*(\w+)\s*=\s*(\w+)\s*\(\s*(\w+)\s*,/,`;${M}; $1 = ${f}($3,`);return L+F})(),A===h.length?console.warn("[Furc Loader] Warning: Could not find game instance assignment point to hook into."):s.processGameClientInstance=_=>{console.log("[Furc Loader] Processing game client instance...");const L=Ce(_),f=(()=>{for(const[F,x]of L)if(Ze(x).search(/this(\.\w+){3}\("Reconnecting..."\)/)!==-1)return x.bind(_)})(),M=(()=>{const F=(()=>{for(const[c,t]of L)if(je(t).includes('"Señor Furreton"'))return t})();if(!F)return;const x=(()=>{for(const[c,t]of Ce(F))if(je(t).includes('"chatBuffer"'))return t})();if(x){for(const[c,t]of Ce(x))if(Ze(t).includes('"specitag"'))return t.bind(x)}})();f||M?(s.__CLIENT_HOOKS={reconnect:f,appendChat:M},console.log("[Furc Loader] Installed client hooks:",s.__CLIENT_HOOKS)):console.warn("[Furc Loader] Warning: Could not establish any client hooks.")};const C=o.document.createElement("script");C.textContent=h,C.async=!0,o.document.body.appendChild(C)}function Ce(o){const d=new Set,s=v=>{!v||typeof v!="object"||(Object.getOwnPropertyNames(v).filter(h=>h!=="constructor"&&v[h]).forEach(h=>d.add([h,v[h]])),s(Object.getPrototypeOf(v)))};return s(o),[...d].sort()}function qt(o){return o&&typeof o=="object"?Object.getPrototypeOf(o).constructor:null}function je(o,d=""){const s=qt(o);return s?s.toString():d}function Ze(o,d=""){return typeof o=="function"?o.toString():d}var Nt=gt('<svg width="16.933332mm" height="16.933336mm" viewBox="0 0 16.933332 16.933336" version="1.1" id="svg1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg"><defs id="defs1"></defs><g id="layer1" transform="translate(-78.987757,-57.85233)"><g style="overflow:hidden;fill:currentColor" id="g1" transform="matrix(0.26458333,0,0,0.26458333,-30.427081,12.964585)"><g id="g2" transform="matrix(0.07161125,0,0,0.07161125,408.88215,164.97088)"><path d="m 950.70753,449.97413 v 126.85714 c 0,4.57143 -1.52381,8.95238 -4.57143,13.14286 -3.04761,4.19047 -6.85714,6.66666 -11.42857,7.42857 l -105.71428,16 c -7.2381,20.57143 -14.66667,37.90476 -22.28572,52 13.33333,19.04762 33.71429,45.33333 61.14286,78.85714 3.80953,4.57143 5.71429,9.33333 5.71429,14.28571 0,4.95239 -1.71429,9.33334 -5.14286,13.14286 -10.28571,14.09524 -29.14286,34.66667 -56.57143,61.71429 -27.42857,27.04762 -45.33334,40.57143 -53.71429,40.57143 -4.57143,0 -9.52381,-1.71429 -14.85714,-5.14286 l -78.85714,-61.71429 c -16.76191,8.76191 -34.09524,16 -52,21.71429 -6.09524,51.80952 -11.61905,87.23809 -16.57143,106.28571 -2.66667,10.66667 -9.52381,16 -20.57143,16 H 448.42182 c -5.33333,0 -10,-1.61905 -14,-4.85714 -4,-3.23809 -6.19048,-7.33333 -6.57143,-12.28571 l -16,-105.14286 c -18.66667,-6.09524 -35.80952,-13.14286 -51.42857,-21.14286 l -80.57143,61.14286 c -3.80953,3.42857 -8.57143,5.14286 -14.28572,5.14286 -5.33333,0 -10.09524,-2.09524 -14.28571,-6.28572 -48,-43.42857 -79.42857,-75.42857 -94.28571,-96 -2.66667,-3.80952 -4,-8.19047 -4,-13.14286 0,-4.57143 1.52381,-8.95238 4.57143,-13.14285 5.71428,-8 15.42856,-20.66667 29.14285,-38 13.71429,-17.33333 24,-30.76191 30.85715,-40.28572 -10.28572,-19.04762 -18.09525,-37.90476 -23.42858,-56.57143 L 89.564678,595.11698 c -4.952381,-0.7619 -8.952381,-3.14285 -12,-7.14285 -3.047619,-4 -4.571429,-8.47619 -4.571429,-13.42857 V 447.68841 c 0,-4.57143 1.52381,-8.95238 4.571429,-13.14285 3.047619,-4.19048 6.666667,-6.66667 10.857143,-7.42858 l 106.285709,-16 c 5.33333,-17.52381 12.76191,-35.04761 22.28572,-52.57142 -15.2381,-21.71429 -35.61905,-48 -61.14286,-78.85715 -3.80953,-4.57143 -5.71429,-9.14285 -5.71429,-13.71428 0,-3.80953 1.71429,-8.19048 5.14286,-13.14286 9.90476,-13.71429 28.66666,-34.19048 56.28571,-61.42857 27.61905,-27.23809 45.61905,-40.85714 54,-40.85714 4.95239,0 9.90477,1.90476 14.85715,5.71428 l 78.85714,61.14286 c 16.76191,-8.76191 34.09524,-16 52,-21.71429 6.09524,-51.80952 11.61905,-87.23809 16.57143,-106.285708 2.66667,-10.666667 9.52381,-16 20.57143,-16 h 126.85714 c 5.33333,0 10,1.619048 14,4.857143 4,3.238095 6.19048,7.333333 6.57143,12.285714 l 16,105.142851 c 18.66667,6.09524 35.80952,13.14286 51.42857,21.14286 l 81.14286,-61.14286 c 3.42857,-3.42857 8,-5.14285 13.71428,-5.14285 4.95239,0 9.71429,1.90476 14.28572,5.71428 49.14285,45.33333 80.57142,77.71429 94.28571,97.14286 2.66667,3.04762 4,7.2381 4,12.57143 0,4.57143 -1.52381,8.95238 -4.57143,13.14285 -5.71429,8 -15.42857,20.66667 -29.14285,38 -13.71429,17.33333 -24,30.76191 -30.85715,40.28572 9.90477,19.04762 17.71429,37.71429 23.42857,56 l 104.57143,16 c 4.95238,0.76191 8.95238,3.14286 12,7.14286 3.04762,4 4.57143,8.47619 4.57143,13.42857 z" id="path1" style="fill:currentColor;stroke-width:16;stroke-dasharray:none;"></path><path style="font-weight:bold;font-size:585.303px;line-height:0;letter-spacing:182.908px;fill:white;stroke-width:3.77953;stroke-linecap:square" d="m 513.02075,729.40751 q -43.89772,0 -73.74818,-16.38848 -29.85045,-16.38849 -47.40954,-45.65363 -17.55909,-29.26515 -25.16803,-69.06576 -7.60893,-39.8006 -7.60893,-86.03953 0,-46.82424 7.60893,-86.03954 7.60894,-39.8006 25.16803,-69.06575 17.55909,-29.26515 47.40954,-45.65364 29.85046,-16.38848 73.74818,-16.38848 43.89772,0 73.16287,16.38848 29.85045,16.38849 46.82424,45.65364 16.97379,29.26515 23.99742,69.06575 7.60894,39.2153 7.60894,86.03954 0,46.23893 -7.60894,86.03953 -7.02363,39.80061 -23.99742,69.06576 -16.97379,29.26514 -46.82424,45.65363 -29.26515,16.38848 -73.16287,16.38848 z M 435.17545,511.6748 q 0,22.24152 0.58531,41.55651 1.1706,18.7297 4.09712,35.11818 l 118.8165,-205.44134 q -16.97379,-12.87667 -45.65363,-12.87667 -33.36227,0 -50.33606,18.7297 -16.38848,18.72969 -22.24151,50.92136 -5.26773,32.19166 -5.26773,71.99226 z m 77.8453,142.81393 q 33.36227,0 49.16545,-18.7297 16.38848,-19.31499 21.07091,-51.50666 5.26772,-32.77696 5.26772,-72.57757 0,-21.0709 -0.5853,-39.2153 -0.5853,-18.72969 -2.92651,-33.94757 l -117.6459,203.10013 q 16.97378,12.87667 45.65363,12.87667 z" id="text1" aria-label="0"></path></g></g></g></svg>');function Xt(o){var d=Nt();O(o,d)}var Gt=H('<div class="config-btn svelte-8mozrr" title="Configure Plugin">⚙️</div>'),jt=H('<div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">ID:</span> </div>'),Zt=H('<div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">Version:</span> </div>'),Qt=H('<div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">Author:</span> </div>'),Yt=H('<div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">Description:</span> </div>'),Vt=H('<div class="plugin-details svelte-8mozrr"><!> <!> <!> <!> <div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">URL:</span> <a target="_blank" rel="noopener noreferrer" class="url-link svelte-8mozrr"> </a></div> <div class="button-group svelte-8mozrr"><button class="action-btn reload-btn svelte-8mozrr">Reload Plugin</button> <button class="action-btn remove-btn svelte-8mozrr">Remove Plugin</button></div></div>'),Kt=H('<li><div class="plugin-header svelte-8mozrr"><div class="plugin-title-group svelte-8mozrr"><div></div> <!> <span class="plugin-name svelte-8mozrr"> </span></div></div> <!></li>'),Jt=H('<li class="empty svelte-8mozrr">No plugins installed</li>'),ei=H('<div class="modal-backdrop svelte-8mozrr"></div> <div class="modal retro-theme svelte-8mozrr"><div class="header-row svelte-8mozrr"><h2 class="svelte-8mozrr"></h2> <button class="close-btn svelte-8mozrr" aria-label="Close">✕</button></div> <div class="section-title svelte-8mozrr">Display Settings</div> <div class="display-settings svelte-8mozrr"><div class="setting-row svelte-8mozrr"><label for="zoom-control" class="svelte-8mozrr"> </label> <input id="zoom-control" type="range" min="0.5" max="3.0" step="0.1" class="svelte-8mozrr"/></div> <div class="setting-row svelte-8mozrr"><label class="checkbox-label svelte-8mozrr"><input type="checkbox" class="svelte-8mozrr"/> Fit to Window Width</label></div></div> <div class="section-title svelte-8mozrr">Plugins</div> <div class="add-plugin svelte-8mozrr"><input type="text" placeholder="https://example.com/my-plugin.js" class="svelte-8mozrr"/> <button class="svelte-8mozrr"> </button></div> <ul class="plugin-list svelte-8mozrr"><!> <!></ul> <div class="footer svelte-8mozrr"><small>Plugins have full access to your game session.</small></div></div>',1),ti=H('<div class="plugin-manager svelte-8mozrr"><button class="fab svelte-8mozrr" title="Furnarchy Menu"><!></button> <!></div>');function ii(o,d){Ve(d,!1);const s=()=>_t(De,"$pluginStore",v),[v,h]=yt(),A=P();let C=P(!1),_=P(""),L=P(null),f=P(!1),M=P({}),F=P(!1),x=xe(d,"zoomLevel",12,1.5),c=xe(d,"fitWidth",12,!1),t=xe(d,"isMobileMode",8,!1),n=se;Ye(()=>{const i=Ct();x(i.zoomLevel),c(i.fitWidth),z(F,!0),window.Furnarchy=n.getExposedAPI(),De.set(Lt()),n.plugins&&n.plugins.forEach(a=>{a.metadata.sourceUrl&&pt(M,e(M)[a.metadata.sourceUrl]=a._handlers.configure.length>0)}),n.onRegister(a=>{const l=a.metadata||a,X=l.sourceUrl||a.sourceUrl;if(X){z(M,{...e(M),[X]:a._handlers.configure.length>0});const J=s().findIndex(oe=>oe.url===X);if(J!==-1){const oe=n.loadingPluginUrl===X,$=s()[J];let T=!1;const D={...$};if(oe){const re=l.toggle?!1:$.enabled!==!1;a._setEnabled(re),l.toggle&&$.enabled!==!1&&(D.enabled=!1,T=!0)}else a.enabled!==($.enabled!==!1)&&(D.enabled=a.enabled,T=!0);if($.name!==l.name&&(D.name=l.name,T=!0),$.id!==l.id&&(D.id=l.id,T=!0),$.description!==l.description&&(D.description=l.description,T=!0),$.version!==l.version&&(D.version=l.version,T=!0),$.author!==l.author&&(D.author=l.author,T=!0),T){const re=[...s()];re[J]=D,ue(re)}}}});const u=n.version||"0.0.0";St(u).then(()=>{N()})});function g(){z(C,!e(C))}async function m(){if(e(_)&&!s().some(i=>i.url===e(_))){z(f,!0);try{const i=await Ut(e(_)),u=[...s(),{id:i.id,url:e(_),name:i.name,description:i.description,version:i.version,author:i.author,enabled:i.toggle!==void 0?!i.toggle:!0}];ue(u),B(e(_)),z(_,"")}catch(i){alert(`Failed to verify plugin: ${i.message||i}`)}finally{z(f,!1)}}}function k(i){const u=s().find(l=>l.url===i);u&&u.id&&It(u.id);const a=s().filter(l=>l.url!==i);ue(a),confirm("Plugin removed. Reload page to take effect?")&&window.location.reload()}function S(i){const u=s().map(a=>{if(a.url===i){const l=a.enabled===void 0?!1:!a.enabled;if(n&&n.plugins){const X=n.plugins.find(J=>J.metadata.sourceUrl===i);X&&X._setEnabled(l)}return{...a,enabled:l}}return a});ue(u)}function j(i){if(z(C,!1),n&&n.plugins){const u=n.plugins.find(a=>a.metadata.sourceUrl===i);u&&u._notifyConfigure()}}async function Z(i){const u=document.querySelector(`script[data-plugin-url="${i}"]`);if(u&&u.remove(),n&&n.plugins){const a=n.plugins.findIndex(l=>l.metadata.sourceUrl===i);a!==-1&&(n.plugins[a]._setEnabled(!1),n.plugins.splice(a,1))}await B(i)}async function N(){await Promise.all(s().map(i=>B(i.url))),n.start()}async function B(i){if(!document.querySelector(`script[data-plugin-url="${i}"]`))try{const u=await fetch(i);if(!u.ok)throw new Error(`HTTP ${u.status}`);const a=await u.text();n.loadingPluginUrl=i;const l=document.createElement("script");l.textContent=a,l.dataset.pluginUrl=i,document.body.appendChild(l),console.log(`[PluginManager] Loaded via fetch: ${i}`)}catch(u){return console.warn(`[PluginManager] Fetch failed for ${i}, falling back to script tag.`,u),new Promise(a=>{const l=document.createElement("script");l.src=i,l.async=!0,l.dataset.pluginUrl=i,l.onload=()=>{console.log(`[PluginManager] Loaded via tag: ${i}`),a()},l.onerror=()=>{console.error(`[PluginManager] Failed to load: ${i}`),a()},document.body.appendChild(l)})}finally{n.loadingPluginUrl=null}}Le(()=>s(),()=>{z(A,[...s()].sort((i,u)=>{const a=i.enabled!==!1,l=u.enabled!==!1;return a!==l?a?-1:1:(i.name||i.url).localeCompare(u.name||u.url)}))}),Le(()=>(e(F),we(x()),we(c())),()=>{typeof window<"u"&&e(F)&&Mt({zoomLevel:x(),fitWidth:c()})}),Ke(),Qe();var U=ti(),Y=w(U),ee=w(Y);Xt(ee),y(Y);var p=b(Y,2);{var R=i=>{var u=ei(),a=et(u),l=b(a,2),X=w(l),J=w(X);J.textContent="Furnarchy Zero 0.16.2";var oe=b(J,2);y(X);var $=b(X,4),T=w($),D=w(T),re=w(D);y(D);var he=b(D,2);ye(he),y(T);var Se=b(T,2),Me=w(Se),fe=w(Me);ye(fe),Te(),y(Me),y(Se),y($);var ge=b($,4),ae=w(ge);ye(ae);var ce=b(ae,2),tt=w(ce,!0);y(ce),y(ge);var Pe=b(ge,2),Ee=w(Pe);Pt(Ee,1,()=>e(A),Wt,(G,r)=>{var le=Kt();let We;var ve=w(le),Fe=w(ve),de=w(Fe);let Ie;var Ue=b(de,2);{var st=te=>{var ie=Gt();q("click",ie,ke(()=>j(e(r).url))),O(te,ie)};Q(Ue,te=>{e(M),e(r),W(()=>e(M)[e(r).url])&&te(st)})}var me=b(Ue,2),rt=w(me,!0);y(me),y(Fe),y(ve);var ot=b(ve,2);{var at=te=>{var ie=Vt(),Oe=w(ie);{var lt=E=>{var I=jt(),ne=b(w(I));y(I),K(()=>V(ne,` ${e(r),W(()=>e(r).id)??""}`)),O(E,I)};Q(Oe,E=>{e(r),W(()=>e(r).id)&&E(lt)})}var Ae=b(Oe,2);{var ct=E=>{var I=Zt(),ne=b(w(I));y(I),K(()=>V(ne,` ${e(r),W(()=>e(r).version)??""}`)),O(E,I)};Q(Ae,E=>{e(r),W(()=>e(r).version)&&E(ct)})}var Re=b(Ae,2);{var dt=E=>{var I=Qt(),ne=b(w(I));y(I),K(()=>V(ne,` ${e(r),W(()=>e(r).author)??""}`)),O(E,I)};Q(Re,E=>{e(r),W(()=>e(r).author)&&E(dt)})}var $e=b(Re,2);{var ut=E=>{var I=Yt(),ne=b(w(I));y(I),K(()=>V(ne,` ${e(r),W(()=>e(r).description)??""}`)),O(E,I)};Q($e,E=>{e(r),W(()=>e(r).description)&&E(ut)})}var pe=b($e,2),be=b(w(pe),2),ht=w(be,!0);y(be),y(pe);var He=b(pe,2),Be=w(He),ft=b(Be,2);y(He),y(ie),K(()=>{_e(be,"href",(e(r),W(()=>e(r).url))),V(ht,(e(r),W(()=>e(r).url)))}),q("click",Be,()=>Z(e(r).url)),q("click",ft,()=>k(e(r).url)),q("click",ie,ke(function(E){Et.call(this,d,E)})),O(te,ie)};Q(ot,te=>{e(L),e(r),W(()=>e(L)===e(r).url)&&te(at)})}y(le),K(()=>{We=qe(le,1,"plugin-item svelte-8mozrr",null,We,{expanded:e(L)===e(r).url,disabled:e(r).enabled===!1}),Ie=qe(de,1,"toggle-switch svelte-8mozrr",null,Ie,{checked:e(r).enabled!==!1}),_e(de,"title",(e(r),W(()=>e(r).enabled!==!1?"Disable Plugin":"Enable Plugin"))),_e(me,"title",(e(r),W(()=>e(r).url))),V(rt,(e(r),W(()=>e(r).name||e(r).url)))}),q("click",de,ke(()=>S(e(r).url))),q("click",le,()=>z(L,e(L)===e(r).url?null:e(r).url)),O(G,le)});var it=b(Ee,2);{var nt=G=>{var r=Jt();O(G,r)};Q(it,G=>{s(),W(()=>s().length===0)&&G(nt)})}y(Pe),Te(2),y(l),K(G=>{V(re,`Zoom: ${G??""}x`),he.disabled=c()||t(),fe.disabled=t(),ae.disabled=e(f),ce.disabled=e(f),V(tt,e(f)?"...":"Add")},[()=>(we(x()),W(()=>x().toFixed(1)))]),q("click",a,g),q("click",oe,g),Ne(he,x),Ft(fe,c),Ne(ae,()=>e(_),G=>z(_,G)),q("keydown",ae,G=>G.key==="Enter"&&!e(f)&&m()),q("click",ce,m),O(i,u)};Q(p,i=>{e(C)&&i(R)})}y(U),q("click",Y,g),O(o,U),Je(),h()}const ni=`
<!DOCTYPE html>
<html>
<head>
    <title>Furnarchy Zero Client</title>
    <link rel="stylesheet" type="text/css" href="https://play.furcadia.com/web/furcadia.css?v=a1599e9c4ed5bc2f3aa66c66e96df767" />
	<link rel="icon" id="favicon" href="/favicon.ico" />
    <style id="variableCSS"></style>
    <meta name="viewport" content="initial-scale=1.0, user-scalable=no, width=device-width" id="viewportTag" />
    <meta name="theme-color" content="#392b67" />
    <style>
        html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background-color: #000; }
        #game-wrapper { display: inline-block; position: relative; min-width: 640px; min-height: 480px; }
        /* Ensure dialog box is visible if it pops up */
        #dialogBox { z-index: 9999; }

        /* 
           FIX: Override Furcadia's absolute centering.
           The game uses 'left: calc(50% - 385px)' which causes clipping if the container 
           starts smaller than the content (e.g. 640px vs 770px).
           By forcing top/left to 0, we ensure the element is positioned at the top-left 
           of our wrapper, allowing the wrapper to expand naturally to fit it.
           
           NOTE: We only apply this in desktop mode because mobile mode (ui-compact)
           relies on 'left' positioning for tab transitions (e.g. Character Select).
        */
        body.ui-desktop .screen-login, 
        body.ui-desktop .screen-charSel, 
        .gameScene.ui-desktop, 
        #splashScreen {
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
        }
        
        /* 
           FIX: Restore height: 100% for mobile containers.
           The original CSS uses 'body.ui-compact > #furcContainer' which fails
           because we wrapped #furcContainer in #game-wrapper.
        */
        body.ui-compact #furcContainer,
        body.ui-compact #furcContainer > div {
            height: 100%;
        }
        
        /* Also ensure the container doesn't enforce a minimum size that's too large if we don't need it */
        body.ui-desktop.gamePage > #furcContainer {
            min-height: 0 !important;
            min-width: 0 !important;
        }
    </style>
</head>
<body>
    <div id="game-wrapper">
        <div id="furcContainer"></div>
    </div>
    <div id="firstLoadScene"></div>
    <div id="modalOverlay"></div>
    <div id="dialogBox">
        <div id="dialogText">Would you like to transfer this Ferian Hotdoggen to Dr. Cat?</div>
        <div id="dialogControls">
            <button id="dialogButton1">Yes</button>
            <button id="dialogButton2">No</button>
            <button id="dialogButton3">Cancel</button>
        </div>
    </div>
    <div id="pounce" style="display: none"></div>
    <script>
        const wrapper = document.getElementById('game-wrapper');
        const container = document.getElementById('furcContainer');
        let lastWidth = 0;
        let lastHeight = 0;
        let lastIsMobile = false;

        function checkSize() {
            let width = 640;
            let height = 480;
            const isMobile = document.body.classList.contains('ui-compact');

            if (isMobile) {
                wrapper.style.display = 'block';
                wrapper.style.width = '100%';
                wrapper.style.height = '100%';
                wrapper.style.minWidth = '0';
                wrapper.style.minHeight = '0';
                // In mobile mode, we want to fill the available space, so we report
                // the current window size (which will be the iframe size).
                // The parent will see 'isMobile' and force the iframe to 100% size.
                width = window.innerWidth;
                height = window.innerHeight;
            } else {
                wrapper.style.display = 'inline-block';
                wrapper.style.width = '';
                wrapper.style.height = '';
                wrapper.style.minWidth = '640px';
                wrapper.style.minHeight = '480px';
            }

            // Heuristic based on Furcadia CSS classes to ensure we catch the required size
            // even if the DOM measurements are tricky due to absolute positioning.
            if (document.body.classList.contains('ui-desktop')) {
                if (!document.body.classList.contains('gamePage')) {
                    // Login or Char Select (Standard Desktop Size)
                    width = Math.max(width, 770);
                    height = Math.max(height, 717);
                }
            }

            // Explicitly check for splash screen visibility
            const splash = document.getElementById('splashScreen');
            if (splash && splash.offsetParent !== null) {
                 width = Math.max(width, 770);
                 height = Math.max(height, 717);
            }

            // Check the game container's children for explicit sizing
            // This handles cases where the game uses absolute positioning
            if (container && container.children.length > 0 && !isMobile) {
                Array.from(container.children).forEach(child => {
                    // Check offset dimensions (includes borders/padding)
                    // and scroll dimensions (includes overflow)
                    const w = Math.max(child.offsetWidth, child.scrollWidth, child.clientWidth);
                    const h = Math.max(child.offsetHeight, child.scrollHeight, child.clientHeight);
                    
                    // If the child is significantly large, it's likely the game canvas/UI
                    if (w > 100 && h > 100) {
                        width = Math.max(width, w);
                        height = Math.max(height, h);
                    }
                });
            }

            // Also check the wrapper's scroll size as a fallback
            if (!isMobile) {
                width = Math.max(width, wrapper.scrollWidth);
                height = Math.max(height, wrapper.scrollHeight);
            }

            // Only request a resize if the content is larger than the current viewport
            // or if the viewport is significantly different from the content size.
            // We add a small buffer to prevent thrashing.
            // Also check if mobile state changed.
            const shouldResize = 
                isMobile !== lastIsMobile ||
                Math.abs(width - window.innerWidth) > 2 || 
                Math.abs(height - window.innerHeight) > 2;

            if (shouldResize) {
                // console.log('[Furnarchy Iframe] Resizing to:', width, height, isMobile);
                lastWidth = width;
                lastHeight = height;
                lastIsMobile = isMobile;
                window.parent.postMessage({ type: 'resize', width, height, isMobile }, '*');
            }
        }

        // Poll frequently to catch layout changes (e.g. screen transitions)
        setInterval(checkSize, 200);

        // Observe DOM changes in the game container
        const observer = new MutationObserver(checkSize);
        observer.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'width', 'height'] });
        // Also observe body class changes since we use them for heuristics
        const bodyObserver = new MutationObserver(checkSize);
        bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

        // Also listen for window resize events (though we trigger them)
        window.addEventListener('resize', checkSize);
    <\/script>
</body>
</html>
`;var si=H('<div class="loading svelte-hy9bcf"><p>Loading Furcadia Web Client...</p></div>'),ri=H('<div class="error svelte-hy9bcf"><p> </p> <button class="svelte-hy9bcf">Try Again</button></div>'),oi=H('<!> <!> <div class="iframe-container svelte-hy9bcf"><iframe title="Furcadia Client" class="game-iframe svelte-hy9bcf"></iframe></div> <!>',1);function yi(o,d){Ve(d,!1);const s=P(),v=ze.PUBLIC_FURCADIA_CLIENT_JS_URL,h=ze.PUBLIC_AUTH_PROXY_URL,A=ze.PUBLIC_PLAY_FURCADIA_URL;let C=P(!1),_=P(""),L=!1,f=P(),M=P(640),F=P(480),x=P(!1),c=P(1.5),t=P(!1),n=P(1024),g=P(768);Ye(()=>{const R=Ot()||h;if(console.log(`[Furnarchy] Using backend URL: ${R}`),window.addEventListener("message",m),e(f)&&e(f).contentWindow&&e(f).contentDocument){const i=e(f).contentDocument,u=e(f).contentWindow;i.open(),i.write(ni),i.close(),Bt(u,A,R),Tt(u),se.attachInputInterception(i),k(u)}return()=>{window.removeEventListener("message",m)}});function m(p){p.data&&p.data.type==="resize"&&(z(M,Math.ceil(p.data.width)),z(F,Math.ceil(p.data.height)),z(x,!!p.data.isMobile))}async function k(p){if(!L){z(C,!0),z(_,"");try{await Dt(p,v),L=!0}catch(R){console.error(R),z(_,R.message||"An unknown error occurred")}finally{z(C,!1)}}}Le(()=>(e(x),e(t),e(n),e(M),e(g),e(F),e(c)),()=>{z(s,e(x)?1:e(t)?Math.min(e(n)/e(M),e(g)/e(F)):e(c))}),Ke(),Qe();var S=oi();kt("hy9bcf",p=>{bt(()=>{wt.title="Furnarchy Zero"})});var j=et(S);ii(j,{get isMobileMode(){return e(x)},get zoomLevel(){return e(c)},set zoomLevel(p){z(c,p)},get fitWidth(){return e(t)},set fitWidth(p){z(t,p)},$$legacy:!0});var Z=b(j,2);{var N=p=>{var R=si();O(p,R)};Q(Z,p=>{e(C)&&p(N)})}var B=b(Z,2),U=w(B);xt(U,p=>z(f,p),()=>e(f)),y(B);var Y=b(B,2);{var ee=p=>{var R=ri(),i=w(R),u=w(i);y(i);var a=b(i,2);y(R),K(()=>V(u,`Error: ${e(_)??""}`)),q("click",a,()=>window.location.reload()),O(p,R)};Q(Y,p=>{e(_)&&p(ee)})}K(()=>zt(U,`width: ${e(x)?"100%":e(M)+"px"}; height: ${e(x)?"100%":e(F)+"px"}; --zoom: ${e(s)??""};`)),Xe("innerWidth",p=>z(n,p)),Xe("innerHeight",p=>z(g,p)),O(o,S),Je()}export{yi as component};
