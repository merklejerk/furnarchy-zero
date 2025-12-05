import{i as gt,a as O,f as $,e as q,s as V}from"../chunks/TaKWw6Tr.js";import{i as Qe}from"../chunks/j2M9h5Jk.js";import{o as Ye}from"../chunks/r3_wVOpG.js";import{b1 as vt,aC as mt,B as Ve,a7 as Le,a8 as Ke,F as Je,z as we,a as e,a3 as P,G as w,s as z,b2 as pt,H as y,I as b,C as et,aa as Te,u as W,E as K,n as bt,a9 as wt}from"../chunks/WP6s4_OC.js";import{i as Q,s as yt,a as _t}from"../chunks/DEPZNxei.js";import{f as se,h as kt}from"../chunks/yGpjg-en.js";import{s as zt}from"../chunks/DT9PpQxP.js";import{b as xt}from"../chunks/YWP4DBZ4.js";import{p as De,n as Ct,g as Lt,h as ue,l as St,o as Mt,r as ye,e as Pt,s as qe,d as _e,f as ke,k as Et,i as Wt,b as Ne,q as Ft,m as It,v as Ut,c as ze,a as Ot}from"../chunks/Bbt8EHcW.js";import{p as xe}from"../chunks/CByjIOJv.js";import"../chunks/8UtF8RsF.js";function Xe(r,l){vt(window,["resize"],()=>mt(()=>l(window[r])))}function At(r,l){let s=l;s.endsWith("/")||(s+="/");const v=r.startsWith("/")?r.substring(1):r;return new URL(v,s).toString()}function Rt(r,l){const s=new URL(r),v=new URL(l),u=s.pathname.startsWith("/")?s.pathname.substring(1):s.pathname;let H=v.pathname;return H.endsWith("/")||(H+="/"),v.pathname=H+u,v.search=s.search,v.hash=s.hash,v.toString()}function $t(r){return!r.match(/^https?:\/\//)&&!r.startsWith("data:")&&!r.startsWith("blob:")}function Ht(r){return r.startsWith("http://local-server.furcadia.com:8080/")||r.startsWith("https://terra.furcadia.com/")}function Bt(r,l,s){const v=r,u=v.XMLHttpRequest;v.FurcXMLHttpRequest=class extends u{static UNSENT=0;static OPENED=1;static HEADERS_RECEIVED=2;static LOADING=3;static DONE=4;open(C,_,...L){let h=_.toString();return $t(h)?(h=At(h,l),console.log(`[FurcXMLHttpRequest] Remapped relative URL to: ${h}`)):Ht(h)&&(h=Rt(h,s),console.log(`[FurcXMLHttpRequest] Remapped backend URL to: ${h}`)),super.open(C,h,...L)}}}class Ge{buffer="";append(l){this.buffer+=l;const s=[];let v;for(;(v=this.buffer.indexOf(`
`))!==-1;){const u=this.buffer.substring(0,v);s.push(u),this.buffer=this.buffer.substring(v+1)}return s}get isEmpty(){return this.buffer.length===0}clear(){this.buffer=""}}function Tt(r){const l=r,s=l.MessageEvent,v=l.Blob,u=l.Uint8Array,H=l.ArrayBuffer,C={encode:a=>{const t=a.length,n=new u(t);for(let g=0;g<t;g++)n[g]=a.charCodeAt(g)&255;return n}},_={decode:a=>{if(typeof a=="string")return a;let t;a instanceof u?t=a:a instanceof H||a instanceof ArrayBuffer?t=new u(a):t=new u(a.buffer,a.byteOffset,a.byteLength);let n="";const g=t.length,m=32768;for(let k=0;k<g;k+=m){const S=t.subarray(k,Math.min(k+m,g));n+=String.fromCharCode.apply(null,S)}return n}};let L=null,h;l.waitForFurc=new Promise(a=>{h=a});function M(a,t,n,g){t.endsWith(`
`)||(t+=`
`);const m=C.encode(t),k=new s("message",{data:m,origin:"wss://lightbringer.furcadia.com"});k.tag=g,k.sourceId=n,a.dispatchEvent(k)}function F(a,t,n,g){if(a.readyState===WebSocket.OPEN){t.endsWith(`
`)||(t+=`
`);const m=C.encode(t);a.sendTagged?a.sendTagged(m,n,g):a.send(m)}}const x=l.WebSocket;l.FurcWebSocket=class extends x{static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;_outgoingQueue=Promise.resolve();_incomingQueue=Promise.resolve();_incomingBuffer=new Ge;_outgoingBuffer=new Ge;constructor(t,n){if(super(t,n),t.toString().includes("furcadia")||t.toString().includes("6502")){console.log("%c😈 Game Socket Captured","color: #ff00ff;"),L=this;const g=se;g&&(g.send=(m,k,S)=>F(this,m,k,S),g.inject=(m,k,S)=>M(this,m,k,S),console.log("[Furnarchy] Connected to Game Socket")),this.addEventListener("open",()=>{h(this);const m=se;m&&m.notifyConnected()}),this.addEventListener("close",()=>{const m=se;m&&m.notifyDisconnected()})}}send(t){this.sendTagged(t,void 0,void 0)}sendTagged(t,n,g){if(L!==this){super.send(t);return}this._outgoingQueue=this._outgoingQueue.then(async()=>{let m=typeof t=="string"?t:_.decode(t);const k=this._outgoingBuffer.append(m);if(k.length===0)return;const S=[];for(let N of k){const B=se;if(B){const U=await B.processOutgoing(N,n,g);if(U==null){console.log("%c🚫 Outgoing Dropped (Furnarchy)","color: gray; font-size: 9px");continue}N=U}S.push(N)}if(S.length===0)return;const j=S.join(`
`)+`
`,Z=C.encode(j);super.send(Z)}).catch(m=>{console.error("Error in outgoing message queue:",m)})}_hookMessageEvent(t,n){const g=t.tag,m=t.sourceId;this._incomingQueue=this._incomingQueue.then(async()=>{let k=typeof t.data=="string"?t.data:_.decode(t.data);const S=this._incomingBuffer.append(k);if(S.length===0)return;const j=[];for(let U of S){const Y=se;if(Y){const ee=await Y.processIncoming(U,m,g);if(ee==null)continue;U=ee}j.push(U)}if(j.length===0)return;const Z=j.join(`
`)+`
`;let N=Z;this.binaryType==="arraybuffer"?N=C.encode(Z).buffer:this.binaryType==="blob"&&(N=new v([C.encode(Z)]));const B=new s("message",{data:N,origin:t.origin,source:t.source});n(B)}).catch(k=>{console.error("Error in incoming message queue:",k)})}set onmessage(t){L===this&&t?super.onmessage=n=>{this._hookMessageEvent(n,g=>{t.call(this,g)})}:super.onmessage=t}get onmessage(){return super.onmessage}addEventListener(t,n,g){if(t==="message"&&L===this&&typeof n=="function"){const m=k=>{this._hookMessageEvent(k,S=>{n.call(this,S)})};super.addEventListener(t,m,g);return}super.addEventListener(t,n,g)}}}async function Dt(r,l){const s=r,v=await fetch(l);if(!v.ok)throw new Error(`Failed to fetch client script: ${v.statusText}`);let u=await v.text();u=u.replaceAll("XMLHttpRequest","FurcXMLHttpRequest"),u=u.replaceAll("WebSocket","FurcWebSocket");const H=u.length;u=(()=>{let _=u.indexOf("Missing login data");if(_===-1)return u;const L=u.substring(0,_),h="__instantiate",M=`
            let ${h} = (cls, ...args) => {
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
        `,F=u.substring(_).replace(/;\s*(\w+)\s*=\s*(\w+)\s*\(\s*(\w+)\s*,/,`;${M}; $1 = ${h}($3,`);return L+F})(),H===u.length?console.warn("[Furc Loader] Warning: Could not find game instance assignment point to hook into."):s.processGameClientInstance=_=>{console.log("[Furc Loader] Processing game client instance...");const L=Ce(_),h=(()=>{for(const[F,x]of L)if(Ze(x).search(/this(\.\w+){3}\("Reconnecting..."\)/)!==-1)return x.bind(_)})(),M=(()=>{const F=(()=>{for(const[a,t]of L)if(je(t).includes('"Señor Furreton"'))return t})();if(!F)return;const x=(()=>{for(const[a,t]of Ce(F))if(je(t).includes('"chatBuffer"'))return t})();if(x){for(const[a,t]of Ce(x))if(Ze(t).includes('"specitag"'))return t.bind(x)}})();h||M?(s.__CLIENT_HOOKS={reconnect:h,appendChat:M},console.log("[Furc Loader] Installed client hooks:",s.__CLIENT_HOOKS)):console.warn("[Furc Loader] Warning: Could not establish any client hooks.")};const C=r.document.createElement("script");C.textContent=u,C.async=!0,r.document.body.appendChild(C)}function Ce(r){const l=new Set,s=v=>{!v||typeof v!="object"||(Object.getOwnPropertyNames(v).filter(u=>u!=="constructor"&&v[u]).forEach(u=>l.add([u,v[u]])),s(Object.getPrototypeOf(v)))};return s(r),[...l].sort()}function qt(r){return r&&typeof r=="object"?Object.getPrototypeOf(r).constructor:null}function je(r,l=""){const s=qt(r);return s?s.toString():l}function Ze(r,l=""){return typeof r=="function"?r.toString():l}var Nt=gt('<svg width="16.933332mm" height="16.933336mm" viewBox="0 0 16.933332 16.933336" version="1.1" id="svg1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg"><defs id="defs1"></defs><g id="layer1" transform="translate(-78.987757,-57.85233)"><g style="overflow:hidden;fill:currentColor" id="g1" transform="matrix(0.26458333,0,0,0.26458333,-30.427081,12.964585)"><g id="g2" transform="matrix(0.07161125,0,0,0.07161125,408.88215,164.97088)"><path d="m 950.70753,449.97413 v 126.85714 c 0,4.57143 -1.52381,8.95238 -4.57143,13.14286 -3.04761,4.19047 -6.85714,6.66666 -11.42857,7.42857 l -105.71428,16 c -7.2381,20.57143 -14.66667,37.90476 -22.28572,52 13.33333,19.04762 33.71429,45.33333 61.14286,78.85714 3.80953,4.57143 5.71429,9.33333 5.71429,14.28571 0,4.95239 -1.71429,9.33334 -5.14286,13.14286 -10.28571,14.09524 -29.14286,34.66667 -56.57143,61.71429 -27.42857,27.04762 -45.33334,40.57143 -53.71429,40.57143 -4.57143,0 -9.52381,-1.71429 -14.85714,-5.14286 l -78.85714,-61.71429 c -16.76191,8.76191 -34.09524,16 -52,21.71429 -6.09524,51.80952 -11.61905,87.23809 -16.57143,106.28571 -2.66667,10.66667 -9.52381,16 -20.57143,16 H 448.42182 c -5.33333,0 -10,-1.61905 -14,-4.85714 -4,-3.23809 -6.19048,-7.33333 -6.57143,-12.28571 l -16,-105.14286 c -18.66667,-6.09524 -35.80952,-13.14286 -51.42857,-21.14286 l -80.57143,61.14286 c -3.80953,3.42857 -8.57143,5.14286 -14.28572,5.14286 -5.33333,0 -10.09524,-2.09524 -14.28571,-6.28572 -48,-43.42857 -79.42857,-75.42857 -94.28571,-96 -2.66667,-3.80952 -4,-8.19047 -4,-13.14286 0,-4.57143 1.52381,-8.95238 4.57143,-13.14285 5.71428,-8 15.42856,-20.66667 29.14285,-38 13.71429,-17.33333 24,-30.76191 30.85715,-40.28572 -10.28572,-19.04762 -18.09525,-37.90476 -23.42858,-56.57143 L 89.564678,595.11698 c -4.952381,-0.7619 -8.952381,-3.14285 -12,-7.14285 -3.047619,-4 -4.571429,-8.47619 -4.571429,-13.42857 V 447.68841 c 0,-4.57143 1.52381,-8.95238 4.571429,-13.14285 3.047619,-4.19048 6.666667,-6.66667 10.857143,-7.42858 l 106.285709,-16 c 5.33333,-17.52381 12.76191,-35.04761 22.28572,-52.57142 -15.2381,-21.71429 -35.61905,-48 -61.14286,-78.85715 -3.80953,-4.57143 -5.71429,-9.14285 -5.71429,-13.71428 0,-3.80953 1.71429,-8.19048 5.14286,-13.14286 9.90476,-13.71429 28.66666,-34.19048 56.28571,-61.42857 27.61905,-27.23809 45.61905,-40.85714 54,-40.85714 4.95239,0 9.90477,1.90476 14.85715,5.71428 l 78.85714,61.14286 c 16.76191,-8.76191 34.09524,-16 52,-21.71429 6.09524,-51.80952 11.61905,-87.23809 16.57143,-106.285708 2.66667,-10.666667 9.52381,-16 20.57143,-16 h 126.85714 c 5.33333,0 10,1.619048 14,4.857143 4,3.238095 6.19048,7.333333 6.57143,12.285714 l 16,105.142851 c 18.66667,6.09524 35.80952,13.14286 51.42857,21.14286 l 81.14286,-61.14286 c 3.42857,-3.42857 8,-5.14285 13.71428,-5.14285 4.95239,0 9.71429,1.90476 14.28572,5.71428 49.14285,45.33333 80.57142,77.71429 94.28571,97.14286 2.66667,3.04762 4,7.2381 4,12.57143 0,4.57143 -1.52381,8.95238 -4.57143,13.14285 -5.71429,8 -15.42857,20.66667 -29.14285,38 -13.71429,17.33333 -24,30.76191 -30.85715,40.28572 9.90477,19.04762 17.71429,37.71429 23.42857,56 l 104.57143,16 c 4.95238,0.76191 8.95238,3.14286 12,7.14286 3.04762,4 4.57143,8.47619 4.57143,13.42857 z" id="path1" style="fill:currentColor;stroke-width:16;stroke-dasharray:none;"></path><path style="font-weight:bold;font-size:585.303px;line-height:0;letter-spacing:182.908px;fill:white;stroke-width:3.77953;stroke-linecap:square" d="m 513.02075,729.40751 q -43.89772,0 -73.74818,-16.38848 -29.85045,-16.38849 -47.40954,-45.65363 -17.55909,-29.26515 -25.16803,-69.06576 -7.60893,-39.8006 -7.60893,-86.03953 0,-46.82424 7.60893,-86.03954 7.60894,-39.8006 25.16803,-69.06575 17.55909,-29.26515 47.40954,-45.65364 29.85046,-16.38848 73.74818,-16.38848 43.89772,0 73.16287,16.38848 29.85045,16.38849 46.82424,45.65364 16.97379,29.26515 23.99742,69.06575 7.60894,39.2153 7.60894,86.03954 0,46.23893 -7.60894,86.03953 -7.02363,39.80061 -23.99742,69.06576 -16.97379,29.26514 -46.82424,45.65363 -29.26515,16.38848 -73.16287,16.38848 z M 435.17545,511.6748 q 0,22.24152 0.58531,41.55651 1.1706,18.7297 4.09712,35.11818 l 118.8165,-205.44134 q -16.97379,-12.87667 -45.65363,-12.87667 -33.36227,0 -50.33606,18.7297 -16.38848,18.72969 -22.24151,50.92136 -5.26773,32.19166 -5.26773,71.99226 z m 77.8453,142.81393 q 33.36227,0 49.16545,-18.7297 16.38848,-19.31499 21.07091,-51.50666 5.26772,-32.77696 5.26772,-72.57757 0,-21.0709 -0.5853,-39.2153 -0.5853,-18.72969 -2.92651,-33.94757 l -117.6459,203.10013 q 16.97378,12.87667 45.65363,12.87667 z" id="text1" aria-label="0"></path></g></g></g></svg>');function Xt(r){var l=Nt();O(r,l)}var Gt=$('<div class="config-btn svelte-8mozrr" title="Configure Plugin">⚙️</div>'),jt=$('<div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">ID:</span> </div>'),Zt=$('<div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">Version:</span> </div>'),Qt=$('<div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">Author:</span> </div>'),Yt=$('<div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">Description:</span> </div>'),Vt=$('<div class="plugin-details svelte-8mozrr"><!> <!> <!> <!> <div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">URL:</span> <a target="_blank" rel="noopener noreferrer" class="url-link svelte-8mozrr"> </a></div> <div class="button-group svelte-8mozrr"><button class="action-btn reload-btn svelte-8mozrr">Reload Plugin</button> <button class="action-btn remove-btn svelte-8mozrr">Remove Plugin</button></div></div>'),Kt=$('<li><div class="plugin-header svelte-8mozrr"><div class="plugin-title-group svelte-8mozrr"><div></div> <!> <span class="plugin-name svelte-8mozrr"> </span></div></div> <!></li>'),Jt=$('<li class="empty svelte-8mozrr">No plugins installed</li>'),ei=$('<div class="modal-backdrop svelte-8mozrr"></div> <div class="modal retro-theme svelte-8mozrr"><div class="header-row svelte-8mozrr"><h2 class="svelte-8mozrr"></h2> <button class="close-btn svelte-8mozrr" aria-label="Close">✕</button></div> <div class="section-title svelte-8mozrr">Display Settings</div> <div class="display-settings svelte-8mozrr"><div class="setting-row svelte-8mozrr"><label for="zoom-control" class="svelte-8mozrr"> </label> <input id="zoom-control" type="range" min="0.5" max="3.0" step="0.1" class="svelte-8mozrr"/></div> <div class="setting-row svelte-8mozrr"><label class="checkbox-label svelte-8mozrr"><input type="checkbox" class="svelte-8mozrr"/> Fit to Window Width</label></div></div> <div class="section-title svelte-8mozrr">Plugins</div> <div class="add-plugin svelte-8mozrr"><input type="text" placeholder="https://example.com/my-plugin.js" class="svelte-8mozrr"/> <button class="svelte-8mozrr"> </button></div> <ul class="plugin-list svelte-8mozrr"><!> <!></ul> <div class="footer svelte-8mozrr"><small>Plugins have full access to your game session.</small></div></div>',1),ti=$('<div class="plugin-manager svelte-8mozrr"><button class="fab svelte-8mozrr" title="Furnarchy Menu"><!></button> <!></div>');function ii(r,l){Ve(l,!1);const s=()=>_t(De,"$pluginStore",v),[v,u]=yt(),H=P();let C=P(!1),_=P(""),L=P(null),h=P(!1),M=P({}),F=P(!1),x=xe(l,"zoomLevel",12,1.5),a=xe(l,"fitWidth",12,!1),t=xe(l,"isMobileMode",8,!1),n=se;Ye(()=>{const i=Ct();x(i.zoomLevel),a(i.fitWidth),z(F,!0),window.Furnarchy=n.getExposedAPI(),De.set(Lt()),n.plugins&&n.plugins.forEach(d=>{d.metadata.sourceUrl&&pt(M,e(M)[d.metadata.sourceUrl]=d._handlers.configure.length>0)}),n.onRegister(d=>{const c=d.metadata||d,X=c.sourceUrl||d.sourceUrl;if(X){z(M,{...e(M),[X]:d._handlers.configure.length>0});const J=s().findIndex(re=>re.url===X);if(J!==-1){const re=n.loadingPluginUrl===X,R=s()[J];let T=!1;const D={...R};if(re){const oe=c.toggle?!1:R.enabled!==!1;d._setEnabled(oe),c.toggle&&R.enabled!==!1&&(D.enabled=!1,T=!0)}else d.enabled!==(R.enabled!==!1)&&(D.enabled=d.enabled,T=!0);if(R.name!==c.name&&(D.name=c.name,T=!0),R.id!==c.id&&(D.id=c.id,T=!0),R.description!==c.description&&(D.description=c.description,T=!0),R.version!==c.version&&(D.version=c.version,T=!0),R.author!==c.author&&(D.author=c.author,T=!0),T){const oe=[...s()];oe[J]=D,ue(oe)}}}});const f=n.version||"0.0.0";St(f).then(()=>{N()})});function g(){z(C,!e(C))}async function m(){if(e(_)&&!s().some(i=>i.url===e(_))){z(h,!0);try{const i=await Ut(e(_)),f=[...s(),{id:i.id,url:e(_),name:i.name,description:i.description,version:i.version,author:i.author,enabled:i.toggle!==void 0?!i.toggle:!0}];ue(f),B(e(_)),z(_,"")}catch(i){alert(`Failed to verify plugin: ${i.message||i}`)}finally{z(h,!1)}}}function k(i){const f=s().find(c=>c.url===i);f&&f.id&&It(f.id);const d=s().filter(c=>c.url!==i);ue(d),confirm("Plugin removed. Reload page to take effect?")&&window.location.reload()}function S(i){const f=s().map(d=>{if(d.url===i){const c=d.enabled===void 0?!1:!d.enabled;if(n&&n.plugins){const X=n.plugins.find(J=>J.metadata.sourceUrl===i);X&&X._setEnabled(c)}return{...d,enabled:c}}return d});ue(f)}function j(i){if(z(C,!1),n&&n.plugins){const f=n.plugins.find(d=>d.metadata.sourceUrl===i);f&&f._notifyConfigure()}}async function Z(i){const f=document.querySelector(`script[data-plugin-url="${i}"]`);if(f&&f.remove(),n&&n.plugins){const d=n.plugins.findIndex(c=>c.metadata.sourceUrl===i);d!==-1&&(n.plugins[d]._setEnabled(!1),n.plugins.splice(d,1))}await B(i)}async function N(){await Promise.all(s().map(i=>B(i.url))),n.start()}async function B(i){if(!document.querySelector(`script[data-plugin-url="${i}"]`))try{const f=await fetch(i);if(!f.ok)throw new Error(`HTTP ${f.status}`);const d=await f.text();n.loadingPluginUrl=i;const c=document.createElement("script");c.textContent=d,c.dataset.pluginUrl=i,document.body.appendChild(c),console.log(`[PluginManager] Loaded via fetch: ${i}`)}catch(f){return console.warn(`[PluginManager] Fetch failed for ${i}, falling back to script tag.`,f),new Promise(d=>{const c=document.createElement("script");c.src=i,c.async=!0,c.dataset.pluginUrl=i,c.onload=()=>{console.log(`[PluginManager] Loaded via tag: ${i}`),d()},c.onerror=()=>{console.error(`[PluginManager] Failed to load: ${i}`),d()},document.body.appendChild(c)})}finally{n.loadingPluginUrl=null}}Le(()=>s(),()=>{z(H,[...s()].sort((i,f)=>(i.name||i.url).localeCompare(f.name||f.url)))}),Le(()=>(e(F),we(x()),we(a())),()=>{typeof window<"u"&&e(F)&&Mt({zoomLevel:x(),fitWidth:a()})}),Ke(),Qe();var U=ti(),Y=w(U),ee=w(Y);Xt(ee),y(Y);var p=b(Y,2);{var A=i=>{var f=ei(),d=et(f),c=b(d,2),X=w(c),J=w(X);J.textContent="Furnarchy Zero 0.15.0";var re=b(J,2);y(X);var R=b(X,4),T=w(R),D=w(T),oe=w(D);y(D);var he=b(D,2);ye(he),y(T);var Se=b(T,2),Me=w(Se),fe=w(Me);ye(fe),Te(),y(Me),y(Se),y(R);var ge=b(R,4),ae=w(ge);ye(ae);var ce=b(ae,2),tt=w(ce,!0);y(ce),y(ge);var Pe=b(ge,2),Ee=w(Pe);Pt(Ee,1,s,Wt,(G,o)=>{var le=Kt();let We;var ve=w(le),Fe=w(ve),de=w(Fe);let Ie;var Ue=b(de,2);{var st=te=>{var ie=Gt();q("click",ie,ke(()=>j(e(o).url))),O(te,ie)};Q(Ue,te=>{e(M),e(o),W(()=>e(M)[e(o).url])&&te(st)})}var me=b(Ue,2),ot=w(me,!0);y(me),y(Fe),y(ve);var rt=b(ve,2);{var at=te=>{var ie=Vt(),Oe=w(ie);{var lt=E=>{var I=jt(),ne=b(w(I));y(I),K(()=>V(ne,` ${e(o),W(()=>e(o).id)??""}`)),O(E,I)};Q(Oe,E=>{e(o),W(()=>e(o).id)&&E(lt)})}var Ae=b(Oe,2);{var ct=E=>{var I=Zt(),ne=b(w(I));y(I),K(()=>V(ne,` ${e(o),W(()=>e(o).version)??""}`)),O(E,I)};Q(Ae,E=>{e(o),W(()=>e(o).version)&&E(ct)})}var Re=b(Ae,2);{var dt=E=>{var I=Qt(),ne=b(w(I));y(I),K(()=>V(ne,` ${e(o),W(()=>e(o).author)??""}`)),O(E,I)};Q(Re,E=>{e(o),W(()=>e(o).author)&&E(dt)})}var $e=b(Re,2);{var ut=E=>{var I=Yt(),ne=b(w(I));y(I),K(()=>V(ne,` ${e(o),W(()=>e(o).description)??""}`)),O(E,I)};Q($e,E=>{e(o),W(()=>e(o).description)&&E(ut)})}var pe=b($e,2),be=b(w(pe),2),ht=w(be,!0);y(be),y(pe);var He=b(pe,2),Be=w(He),ft=b(Be,2);y(He),y(ie),K(()=>{_e(be,"href",(e(o),W(()=>e(o).url))),V(ht,(e(o),W(()=>e(o).url)))}),q("click",Be,()=>Z(e(o).url)),q("click",ft,()=>k(e(o).url)),q("click",ie,ke(function(E){Et.call(this,l,E)})),O(te,ie)};Q(rt,te=>{e(L),e(o),W(()=>e(L)===e(o).url)&&te(at)})}y(le),K(()=>{We=qe(le,1,"plugin-item svelte-8mozrr",null,We,{expanded:e(L)===e(o).url,disabled:e(o).enabled===!1}),Ie=qe(de,1,"toggle-switch svelte-8mozrr",null,Ie,{checked:e(o).enabled!==!1}),_e(de,"title",(e(o),W(()=>e(o).enabled!==!1?"Disable Plugin":"Enable Plugin"))),_e(me,"title",(e(o),W(()=>e(o).url))),V(ot,(e(o),W(()=>e(o).name||e(o).url)))}),q("click",de,ke(()=>S(e(o).url))),q("click",le,()=>z(L,e(L)===e(o).url?null:e(o).url)),O(G,le)});var it=b(Ee,2);{var nt=G=>{var o=Jt();O(G,o)};Q(it,G=>{s(),W(()=>s().length===0)&&G(nt)})}y(Pe),Te(2),y(c),K(G=>{V(oe,`Zoom: ${G??""}x`),he.disabled=a()||t(),fe.disabled=t(),ae.disabled=e(h),ce.disabled=e(h),V(tt,e(h)?"...":"Add")},[()=>(we(x()),W(()=>x().toFixed(1)))]),q("click",d,g),q("click",re,g),Ne(he,x),Ft(fe,a),Ne(ae,()=>e(_),G=>z(_,G)),q("keydown",ae,G=>G.key==="Enter"&&!e(h)&&m()),q("click",ce,m),O(i,f)};Q(p,i=>{e(C)&&i(A)})}y(U),q("click",Y,g),O(r,U),Je(),u()}const ni=`
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
`;var si=$('<div class="loading svelte-hy9bcf"><p>Loading Furcadia Web Client...</p></div>'),oi=$('<div class="error svelte-hy9bcf"><p> </p> <button class="svelte-hy9bcf">Try Again</button></div>'),ri=$('<!> <!> <div class="iframe-container svelte-hy9bcf"><iframe title="Furcadia Client" class="game-iframe svelte-hy9bcf"></iframe></div> <!>',1);function yi(r,l){Ve(l,!1);const s=P(),v=ze.PUBLIC_FURCADIA_CLIENT_JS_URL,u=ze.PUBLIC_AUTH_PROXY_URL,H=ze.PUBLIC_PLAY_FURCADIA_URL;let C=P(!1),_=P(""),L=!1,h=P(),M=P(640),F=P(480),x=P(!1),a=P(1.5),t=P(!1),n=P(1024),g=P(768);Ye(()=>{const A=Ot()||u;if(console.log(`[Furnarchy] Using backend URL: ${A}`),window.addEventListener("message",m),e(h)&&e(h).contentWindow&&e(h).contentDocument){const i=e(h).contentDocument,f=e(h).contentWindow;i.open(),i.write(ni),i.close(),Bt(f,H,A),Tt(f),se.attachInputInterception(i),k(f)}return()=>{window.removeEventListener("message",m)}});function m(p){p.data&&p.data.type==="resize"&&(z(M,Math.ceil(p.data.width)),z(F,Math.ceil(p.data.height)),z(x,!!p.data.isMobile))}async function k(p){if(!L){z(C,!0),z(_,"");try{await Dt(p,v),L=!0}catch(A){console.error(A),z(_,A.message||"An unknown error occurred")}finally{z(C,!1)}}}Le(()=>(e(x),e(t),e(n),e(M),e(g),e(F),e(a)),()=>{z(s,e(x)?1:e(t)?Math.min(e(n)/e(M),e(g)/e(F)):e(a))}),Ke(),Qe();var S=ri();kt("hy9bcf",p=>{bt(()=>{wt.title="Furnarchy Zero"})});var j=et(S);ii(j,{get isMobileMode(){return e(x)},get zoomLevel(){return e(a)},set zoomLevel(p){z(a,p)},get fitWidth(){return e(t)},set fitWidth(p){z(t,p)},$$legacy:!0});var Z=b(j,2);{var N=p=>{var A=si();O(p,A)};Q(Z,p=>{e(C)&&p(N)})}var B=b(Z,2),U=w(B);xt(U,p=>z(h,p),()=>e(h)),y(B);var Y=b(B,2);{var ee=p=>{var A=oi(),i=w(A),f=w(i);y(i);var d=b(i,2);y(A),K(()=>V(f,`Error: ${e(_)??""}`)),q("click",d,()=>window.location.reload()),O(p,A)};Q(Y,p=>{e(_)&&p(ee)})}K(()=>zt(U,`width: ${e(x)?"100%":e(M)+"px"}; height: ${e(x)?"100%":e(F)+"px"}; --zoom: ${e(s)??""};`)),Xe("innerWidth",p=>z(n,p)),Xe("innerHeight",p=>z(g,p)),O(r,S),Je()}export{yi as component};
