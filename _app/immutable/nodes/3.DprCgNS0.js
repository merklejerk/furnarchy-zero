import{f as B,e as D,b as T,s as Q}from"../chunks/B3FnF0oJ.js";import{i as Ye}from"../chunks/DumpmRuy.js";import{o as Ve}from"../chunks/iqYowYmk.js";import{b3 as vt,aV as mt,aq as pt,af as Ke,as as Le,at as Je,ah as et,ad as be,i as e,R as E,ai as w,m as L,b4 as bt,aj as y,ak as b,ag as tt,av as De,u as U,t as Y,y as wt,au as yt}from"../chunks/B34q5ZhI.js";import{i as Z,s as _t,a as kt}from"../chunks/B-8yQNBF.js";import{h as zt}from"../chunks/wBzAbtsP.js";import{s as St}from"../chunks/DPoAyR-t.js";import{b as Lt}from"../chunks/CsEh3Pnl.js";import{p as xe,M as xt,f as Ct,g as Pt,s as de,d as Mt,h as Et,c as Wt,m as Ut,v as Ft,e as we,a as It}from"../chunks/C08b4S7V.js";import{f as ie}from"../chunks/6MNpENtN.js";import{e as Ot,i as At}from"../chunks/T5S5BKvr.js";import{r as ye,s as Ne,a as _e,c as ke,b as qe,d as Rt}from"../chunks/B8CywloG.js";import{p as ze}from"../chunks/C-xiGS0O.js";import"../chunks/8UtF8RsF.js";function Xe(i,s){vt(window,["resize"],()=>mt(()=>s(window[i])))}function $t(i,s){let n=s;n.endsWith("/")||(n+="/");const c=i.startsWith("/")?i.substring(1):i;return new URL(c,n).toString()}function Ht(i,s){const n=new URL(i),c=new URL(s),r=n.pathname.startsWith("/")?n.pathname.substring(1):n.pathname;let z=c.pathname;return z.endsWith("/")||(z+="/"),c.pathname=z+r,c.search=n.search,c.hash=n.hash,c.toString()}function Tt(i){return!i.match(/^https?:\/\//)&&!i.startsWith("data:")&&!i.startsWith("blob:")}function Bt(i){return i.startsWith("http://local-server.furcadia.com:8080/")||i.startsWith("https://terra.furcadia.com/")}function Dt(i,s,n){const c=i,r=c.XMLHttpRequest;c.FurcXMLHttpRequest=class extends r{static UNSENT=0;static OPENED=1;static HEADERS_RECEIVED=2;static LOADING=3;static DONE=4;open(S,_,...P){let u=_.toString();return Tt(u)?(u=$t(u,s),console.log(`[FurcXMLHttpRequest] Remapped relative URL to: ${u}`)):Bt(u)&&(u=Ht(u,n),console.log(`[FurcXMLHttpRequest] Remapped backend URL to: ${u}`)),super.open(S,u,...P)}}}class Ge{buffer="";append(s){this.buffer+=s;const n=[];let c;for(;(c=this.buffer.indexOf(`
`))!==-1;){const r=this.buffer.substring(0,c);n.push(r),this.buffer=this.buffer.substring(c+1)}return n}get isEmpty(){return this.buffer.length===0}clear(){this.buffer=""}}function Nt(i){const s=i,n=s.MessageEvent,c=s.Blob,r=s.Uint8Array,z=s.ArrayBuffer,S={encode:d=>{const t=d.length,l=new r(t);for(let g=0;g<t;g++)l[g]=d.charCodeAt(g)&255;return l}},_={decode:d=>{if(typeof d=="string")return d;let t;d instanceof r?t=d:d instanceof z||d instanceof ArrayBuffer?t=new r(d):t=new r(d.buffer,d.byteOffset,d.byteLength);let l="";const g=t.length,v=32768;for(let C=0;C<g;C+=v){const k=t.subarray(C,Math.min(C+v,g));l+=String.fromCharCode.apply(null,k)}return l}};let P=null,u;s.waitForFurc=new Promise(d=>{u=d});function M(d,t,l,g,v){t.endsWith(`
`)||(t+=`
`);const C=S.encode(t),k=new n("message",{data:C,origin:"wss://lightbringer.furcadia.com"});k.tag=g,k.sourceId=l,k.bypassPlugins=v,d.dispatchEvent(k)}function F(d,t,l,g){if(d.readyState===WebSocket.OPEN){t.endsWith(`
`)||(t+=`
`);const v=S.encode(t);d.sendTagged?d.sendTagged(v,l,g):d.send(v)}}const x=s.WebSocket;s.FurcWebSocket=class extends x{static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;_outgoingQueue=Promise.resolve();_incomingQueue=Promise.resolve();_incomingBuffer=new Ge;_outgoingBuffer=new Ge;constructor(t,l){if(super(t,l),t.toString().includes("furcadia")||t.toString().includes("6502")){console.log("%c😈 Game Socket Captured","color: #ff00ff;"),P=this;const g=ie;g&&(g.send=(v,C,k)=>F(this,v,C,k),g.inject=(v,C,k,N)=>M(this,v,C,k,N),console.log("[Furnarchy] Connected to Game Socket")),this.addEventListener("open",()=>{u(this);const v=ie;v&&v.notifyConnected()}),this.addEventListener("close",()=>{const v=ie;v&&v.notifyDisconnected()})}}send(t){this.sendTagged(t,void 0,void 0)}sendTagged(t,l,g){if(P!==this){super.send(t);return}this._outgoingQueue=this._outgoingQueue.then(async()=>{let v=typeof t=="string"?t:_.decode(t);const C=this._outgoingBuffer.append(v);if(C.length===0)return;const k=[];for(let q of C){const O=ie;if(O){const R=await O.processOutgoing(q,l,g);if(R==null){console.log("%c🚫 Outgoing Dropped (Furnarchy)","color: gray; font-size: 9px");continue}q=R}k.push(q)}if(k.length===0)return;const N=k.join(`
`)+`
`,j=S.encode(N);super.send(j)}).catch(v=>{console.error("Error in outgoing message queue:",v)})}_hookMessageEvent(t,l){const g=t.tag,v=t.sourceId,C=t.bypassPlugins;this._incomingQueue=this._incomingQueue.then(async()=>{let k=typeof t.data=="string"?t.data:_.decode(t.data);const N=this._incomingBuffer.append(k);if(N.length===0)return;const j=[];for(let K of N){const ne=ie;if(ne&&!C){const f=await ne.processIncoming(K,v,g);if(f==null)continue;K=f}j.push(K)}if(j.length===0)return;const q=j.join(`
`)+`
`;let O=q;this.binaryType==="arraybuffer"?O=S.encode(q).buffer:this.binaryType==="blob"&&(O=new c([S.encode(q)]));const R=new n("message",{data:O,origin:t.origin,source:t.source});l(R)}).catch(k=>{console.error("Error in incoming message queue:",k)})}set onmessage(t){P===this&&t?super.onmessage=l=>{this._hookMessageEvent(l,g=>{t.call(this,g)})}:super.onmessage=t}get onmessage(){return super.onmessage}addEventListener(t,l,g){if(t==="message"&&P===this&&typeof l=="function"){const v=C=>{this._hookMessageEvent(C,k=>{l.call(this,k)})};super.addEventListener(t,v,g);return}super.addEventListener(t,l,g)}}}async function qt(i,s){const n=i,c=await fetch(s);if(!c.ok)throw new Error(`Failed to fetch client script: ${c.statusText}`);let r=await c.text();r=r.replaceAll("XMLHttpRequest","FurcXMLHttpRequest"),r=r.replaceAll("WebSocket","FurcWebSocket");const z=r.length;r=(()=>{let _=r.indexOf("Missing login data");if(_===-1)return r;const P=r.substring(0,_),u="__instantiate",M=`
            let ${u} = (cls, ...args) => {
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
        `,F=r.substring(_).replace(/;\s*(\w+)\s*=\s*(\w+)\s*\(\s*(\w+)\s*,/,`;${M}; $1 = ${u}($3,`);return P+F})(),z===r.length?console.warn("[Furc Loader] Warning: Could not find game instance assignment point to hook into."):n.processGameClientInstance=_=>{console.log("[Furc Loader] Processing game client instance...");const P=Se(_),u=(()=>{for(const[F,x]of P)if(Ze(x).search(/this(\.\w+){3}\("Reconnecting..."\)/)!==-1)return x.bind(_)})(),M=(()=>{const F=(()=>{for(const[d,t]of P)if(je(t).includes('"Señor Furreton"'))return t})();if(!F)return;const x=(()=>{for(const[d,t]of Se(F))if(je(t).includes('"chatBuffer"'))return t})();if(x){for(const[d,t]of Se(x))if(Ze(t).includes('"specitag"'))return t.bind(x)}})();u||M?(n.__CLIENT_HOOKS={reconnect:u,appendChat:M},console.log("[Furc Loader] Installed client hooks:",n.__CLIENT_HOOKS)):console.warn("[Furc Loader] Warning: Could not establish any client hooks.")};const S=i.document.createElement("script");S.textContent=r,S.async=!0,i.document.body.appendChild(S)}function Se(i){const s=new Set,n=c=>{!c||typeof c!="object"||(Object.getOwnPropertyNames(c).filter(r=>r!=="constructor"&&c[r]).forEach(r=>s.add([r,c[r]])),n(Object.getPrototypeOf(c)))};return n(i),[...s].sort()}function Xt(i){return i&&typeof i=="object"?Object.getPrototypeOf(i).constructor:null}function je(i,s=""){const n=Xt(i);return n?n.toString():s}function Ze(i,s=""){return typeof i=="function"?i.toString():s}function Qe(i,s){if(!s)return i;const n=i.includes("?")?"&":"?";return`${i}${n}_=${Date.now()}`}async function Ce(i,s,n=!1){if(!document.querySelector(`script[data-plugin-url="${s}"]`))try{const c=Qe(s,n),r=await fetch(c);if(!r.ok)throw new Error(`HTTP ${r.status}`);const z=await r.text();i.loadingPluginUrl=s;const S=document.createElement("script");S.textContent=z,S.dataset.pluginUrl=s,document.body.appendChild(S),console.log(`[plugin-loader] Loaded via fetch: ${s}`)}catch(c){return console.warn(`[plugin-loader] Fetch failed for ${s}, falling back to script tag.`,c),new Promise(r=>{const z=document.createElement("script");z.src=Qe(s,n),z.async=!0,z.dataset.pluginUrl=s,z.onload=()=>{console.log(`[plugin-loader] Loaded via tag: ${s}`),r()},z.onerror=()=>{console.error(`[plugin-loader] Failed to load: ${s}`),r()},document.body.appendChild(z)})}finally{i.loadingPluginUrl=null}}async function Gt(i,s){let n=null;if(i&&i.plugins){const r=i.plugins.find(z=>z.metadata.sourceUrl===s);r&&(n=r.metadata.id)}n&&i.unloadPlugin(n);const c=document.querySelector(`script[data-plugin-url="${s}"]`);c&&c.remove(),await Ce(i,s,!0)}async function jt(i){const s=pt(xe);await Promise.all(s.map(n=>Ce(i,n.url))),i.start()}var Zt=B('<div class="config-btn svelte-8mozrr" title="Configure Plugin">⚙️</div>'),Qt=B('<div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">ID:</span> </div>'),Yt=B('<div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">Version:</span> </div>'),Vt=B('<div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">Author:</span> </div>'),Kt=B('<div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">Description:</span> </div>'),Jt=B('<div class="plugin-details svelte-8mozrr"><!> <!> <!> <!> <div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">URL:</span> <a target="_blank" rel="noopener noreferrer" class="url-link svelte-8mozrr"> </a></div> <div class="button-group svelte-8mozrr"><button class="action-btn reload-btn svelte-8mozrr">Reload Plugin</button> <button class="action-btn remove-btn svelte-8mozrr">Remove Plugin</button></div></div>'),ei=B('<li><div class="plugin-header svelte-8mozrr"><div class="plugin-title-group svelte-8mozrr"><div></div> <!> <span class="plugin-name svelte-8mozrr"> </span></div></div> <!></li>'),ti=B('<li class="empty svelte-8mozrr">No plugins installed</li>'),ii=B('<div class="modal-backdrop svelte-8mozrr"></div> <div class="modal retro-theme svelte-8mozrr"><div class="header-row svelte-8mozrr"><h2 class="svelte-8mozrr"></h2> <button class="close-btn svelte-8mozrr" aria-label="Close">✕</button></div> <div class="section-title svelte-8mozrr">Display Settings</div> <div class="display-settings svelte-8mozrr"><div class="setting-row svelte-8mozrr"><label for="zoom-control" class="svelte-8mozrr"> </label> <input id="zoom-control" type="range" min="0.5" max="3.0" step="0.1" class="svelte-8mozrr"/></div> <div class="setting-row svelte-8mozrr"><label class="checkbox-label svelte-8mozrr"><input type="checkbox" class="svelte-8mozrr"/> Fit to Window Width</label></div></div> <div class="section-title svelte-8mozrr">Plugins</div> <div class="add-plugin svelte-8mozrr"><input type="text" placeholder="https://example.com/my-plugin.js" class="svelte-8mozrr"/> <button class="svelte-8mozrr"> </button></div> <ul class="plugin-list svelte-8mozrr"><!> <!></ul> <div class="footer svelte-8mozrr"><small>Plugins have full access to your game session.</small></div></div>',1),ni=B('<div class="plugin-manager svelte-8mozrr"><button class="fab svelte-8mozrr" title="Furnarchy Menu"><!></button> <!></div>');function si(i,s){Ke(s,!1);const n=()=>kt(xe,"$pluginStore",c),[c,r]=_t(),z=E();let S=E(!1),_=E(""),P=E(null),u=E(!1),M=E({}),F=E(!1),x=ze(s,"zoomLevel",12,1.5),d=ze(s,"fitWidth",12,!1),t=ze(s,"isMobileMode",8,!1),l=ie;Ve(()=>{const o=Ct();x(o.zoomLevel),d(o.fitWidth),L(F,!0),window.Furnarchy=l.getExposedAPI(),xe.set(Pt()),l.plugins&&l.plugins.forEach(h=>{h.metadata.sourceUrl&&bt(M,e(M)[h.metadata.sourceUrl]=h._handlers.configure.length>0)}),l.onRegister(h=>{const m=h.metadata||h,X=m.sourceUrl||h.sourceUrl;if(X){L(M,{...e(M),[X]:h._handlers.configure.length>0});const V=n().findIndex(oe=>oe.url===X);if(V!==-1){const oe=l.loadingPluginUrl===X,A=n()[V];let $=!1;const H={...A};if(oe){const se=m.toggle?!1:A.enabled!==!1;h._setEnabled(se),m.toggle&&A.enabled!==!1&&(H.enabled=!1,$=!0)}else h.enabled!==(A.enabled!==!1)&&(H.enabled=h.enabled,$=!0);if(A.name!==m.name&&(H.name=m.name,$=!0),A.id!==m.id&&(H.id=m.id,$=!0),A.description!==m.description&&(H.description=m.description,$=!0),A.version!==m.version&&(H.version=m.version,$=!0),A.author!==m.author&&(H.author=m.author,$=!0),A.toggle!==m.toggle&&(H.toggle=m.toggle,$=!0),$){const se=[...n()];se[V]=H,de(se)}}}});const p=l.version||"0.0.0";Mt(p).then(()=>{q()})});function g(){L(S,!e(S))}async function v(){if(e(_)&&!n().some(o=>o.url===e(_))){L(u,!0);try{const o=await Ft(e(_)),p=[...n(),{id:o.id,url:e(_),name:o.name,description:o.description,version:o.version,author:o.author,enabled:o.toggle!==void 0?!o.toggle:!0,toggle:o.toggle}];de(p),Ce(l,e(_)),L(_,"")}catch(o){alert(`Failed to verify plugin: ${o.message||o}`)}finally{L(u,!1)}}}function C(o){const p=n().find(m=>m.url===o);p&&p.id&&Ut(p.id);const h=n().filter(m=>m.url!==o);de(h),confirm("Plugin removed. Reload page to take effect?")&&window.location.reload()}function k(o){const p=n().map(h=>{if(h.url===o){const m=h.enabled===void 0?!1:!h.enabled;if(l&&l.plugins){const X=l.plugins.find(V=>V.metadata.sourceUrl===o);X&&X._setEnabled(m)}return{...h,enabled:m}}return h});de(p)}function N(o){if(L(S,!1),l&&l.plugins){const p=l.plugins.find(h=>h.metadata.sourceUrl===o);p&&p._notifyConfigure()}}async function j(o){await Gt(l,o)}async function q(){await jt(l)}Le(()=>n(),()=>{L(z,[...n()].sort((o,p)=>{const h=o.enabled!==!1,m=p.enabled!==!1;return h!==m?h?-1:1:(o.name||o.url).localeCompare(p.name||p.url)}))}),Le(()=>(e(F),be(x()),be(d())),()=>{typeof window<"u"&&e(F)&&Et({zoomLevel:x(),fitWidth:d()})}),Je(),Ye();var O=ni(),R=w(O),K=w(R);xt(K),y(R);var ne=b(R,2);{var f=o=>{var p=ii(),h=tt(p),m=b(h,2),X=w(m),V=w(X);V.textContent="Furnarchy Zero 0.20.0";var oe=b(V,2);y(X);var A=b(X,4),$=w(A),H=w($),se=w(H);y(H);var ue=b(H,2);ye(ue),y($);var Pe=b($,2),Me=w(Pe),fe=w(Me);ye(fe),De(),y(Me),y(Pe),y(A);var he=b(A,4),re=w(he);ye(re);var le=b(re,2),it=w(le,!0);y(le),y(he);var Ee=b(he,2),We=w(Ee);Ot(We,1,()=>e(z),At,(G,a)=>{var ae=ei();let Ue;var ge=w(ae),Fe=w(ge),ce=w(Fe);let Ie;var Oe=b(ce,2);{var ot=J=>{var ee=Zt();D("click",ee,ke(()=>N(e(a).url))),T(J,ee)};Z(Oe,J=>{e(M),e(a),U(()=>e(M)[e(a).url])&&J(ot)})}var ve=b(Oe,2),rt=w(ve,!0);y(ve),y(Fe),y(ge);var at=b(ge,2);{var lt=J=>{var ee=Jt(),Ae=w(ee);{var ct=W=>{var I=Qt(),te=b(w(I));y(I),Y(()=>Q(te,` ${e(a),U(()=>e(a).id)??""}`)),T(W,I)};Z(Ae,W=>{e(a),U(()=>e(a).id)&&W(ct)})}var Re=b(Ae,2);{var dt=W=>{var I=Yt(),te=b(w(I));y(I),Y(()=>Q(te,` ${e(a),U(()=>e(a).version)??""}`)),T(W,I)};Z(Re,W=>{e(a),U(()=>e(a).version)&&W(dt)})}var $e=b(Re,2);{var ut=W=>{var I=Vt(),te=b(w(I));y(I),Y(()=>Q(te,` ${e(a),U(()=>e(a).author)??""}`)),T(W,I)};Z($e,W=>{e(a),U(()=>e(a).author)&&W(ut)})}var He=b($e,2);{var ft=W=>{var I=Kt(),te=b(w(I));y(I),Y(()=>Q(te,` ${e(a),U(()=>e(a).description)??""}`)),T(W,I)};Z(He,W=>{e(a),U(()=>e(a).description)&&W(ft)})}var me=b(He,2),pe=b(w(me),2),ht=w(pe,!0);y(pe),y(me);var Te=b(me,2),Be=w(Te),gt=b(Be,2);y(Te),y(ee),Y(()=>{_e(pe,"href",(e(a),U(()=>e(a).url))),Q(ht,(e(a),U(()=>e(a).url)))}),D("click",Be,()=>j(e(a).url)),D("click",gt,()=>C(e(a).url)),D("click",ee,ke(function(W){Wt.call(this,s,W)})),T(J,ee)};Z(at,J=>{e(P),e(a),U(()=>e(P)===e(a).url)&&J(lt)})}y(ae),Y(()=>{Ue=Ne(ae,1,"plugin-item svelte-8mozrr",null,Ue,{expanded:e(P)===e(a).url,disabled:e(a).enabled===!1&&!e(a).toggle}),Ie=Ne(ce,1,"toggle-switch svelte-8mozrr",null,Ie,{checked:e(a).enabled!==!1}),_e(ce,"title",(e(a),U(()=>e(a).enabled!==!1?"Disable Plugin":"Enable Plugin"))),_e(ve,"title",(e(a),U(()=>e(a).url))),Q(rt,(e(a),U(()=>e(a).name||e(a).url)))}),D("click",ce,ke(()=>k(e(a).url))),D("click",ae,()=>L(P,e(P)===e(a).url?null:e(a).url)),T(G,ae)});var nt=b(We,2);{var st=G=>{var a=ti();T(G,a)};Z(nt,G=>{n(),U(()=>n().length===0)&&G(st)})}y(Ee),De(2),y(m),Y(G=>{Q(se,`Zoom: ${G??""}x`),ue.disabled=d()||t(),fe.disabled=t(),re.disabled=e(u),le.disabled=e(u),Q(it,e(u)?"...":"Add")},[()=>(be(x()),U(()=>x().toFixed(1)))]),D("click",h,g),D("click",oe,g),qe(ue,x),Rt(fe,d),qe(re,()=>e(_),G=>L(_,G)),D("keydown",re,G=>G.key==="Enter"&&!e(u)&&v()),D("click",le,v),T(o,p)};Z(ne,o=>{e(S)&&o(f)})}y(O),D("click",R,g),T(i,O),et(),r()}const oi=`
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
`;var ri=B('<div class="loading svelte-hy9bcf"><p>Loading Furcadia Web Client...</p></div>'),ai=B('<div class="error svelte-hy9bcf"><p> </p> <button class="svelte-hy9bcf">Try Again</button></div>'),li=B('<!> <!> <div class="iframe-container svelte-hy9bcf"><iframe title="Furcadia Client" class="game-iframe svelte-hy9bcf"></iframe></div> <!>',1);function Li(i,s){Ke(s,!1);const n=E(),c=we.PUBLIC_FURCADIA_CLIENT_JS_URL,r=we.PUBLIC_AUTH_PROXY_URL,z=we.PUBLIC_PLAY_FURCADIA_URL;let S=E(!1),_=E(""),P=!1,u=E(),M=E(640),F=E(480),x=E(!1),d=E(1.5),t=E(!1),l=E(1024),g=E(768);Ve(()=>{const o=It()||r;if(console.log(`[Furnarchy] Using backend URL: ${o}`),window.addEventListener("message",v),e(u)&&e(u).contentWindow&&e(u).contentDocument){const p=e(u).contentDocument,h=e(u).contentWindow;p.open(),p.write(oi),p.close(),Dt(h,z,o),Nt(h),ie.attachInputInterception(p),C(h)}return()=>{window.removeEventListener("message",v)}});function v(f){f.data&&f.data.type==="resize"&&(L(M,Math.ceil(f.data.width)),L(F,Math.ceil(f.data.height)),L(x,!!f.data.isMobile))}async function C(f){if(!P){L(S,!0),L(_,"");try{await qt(f,c),P=!0}catch(o){console.error(o),L(_,o.message||"An unknown error occurred")}finally{L(S,!1)}}}Le(()=>(e(x),e(t),e(l),e(M),e(g),e(F),e(d)),()=>{L(n,e(x)?1:e(t)?Math.min(e(l)/e(M),e(g)/e(F)):e(d))}),Je(),Ye();var k=li();zt("hy9bcf",f=>{wt(()=>{yt.title="Furnarchy Zero"})});var N=tt(k);si(N,{get isMobileMode(){return e(x)},get zoomLevel(){return e(d)},set zoomLevel(f){L(d,f)},get fitWidth(){return e(t)},set fitWidth(f){L(t,f)},$$legacy:!0});var j=b(N,2);{var q=f=>{var o=ri();T(f,o)};Z(j,f=>{e(S)&&f(q)})}var O=b(j,2),R=w(O);Lt(R,f=>L(u,f),()=>e(u)),y(O);var K=b(O,2);{var ne=f=>{var o=ai(),p=w(o),h=w(p);y(p);var m=b(p,2);y(o),Y(()=>Q(h,`Error: ${e(_)??""}`)),D("click",m,()=>window.location.reload()),T(f,o)};Z(K,f=>{e(_)&&f(ne)})}Y(()=>St(R,`width: ${e(x)?"100%":e(M)+"px"}; height: ${e(x)?"100%":e(F)+"px"}; --zoom: ${e(n)??""};`)),Xe("innerWidth",f=>L(l,f)),Xe("innerHeight",f=>L(g,f)),T(i,k),et()}export{Li as component};
