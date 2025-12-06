import{f as B,e as N,a as T,s as V}from"../chunks/B-NAx5GU.js";import{i as Qe}from"../chunks/C-bUfnIF.js";import{o as Ye}from"../chunks/Z_w0fGMp.js";import{aP as gt,aC as vt,B as Ve,a7 as Se,a8 as Ke,F as Je,z as we,a as e,a3 as P,G as w,s as z,aQ as mt,H as y,I as b,C as et,aa as Be,u as W,E as K,n as pt,a9 as bt}from"../chunks/ClPHtEvL.js";import{i as Q,s as wt,a as yt}from"../chunks/DP-u4MQ4.js";import{f as se,h as _t}from"../chunks/De8AKRHJ.js";import{s as kt}from"../chunks/B4-7v-s-.js";import{b as zt}from"../chunks/DoAO8fAf.js";import{M as Ct,p as De,n as xt,g as St,h as ue,l as Lt,o as Mt,r as ye,e as Pt,s as Ne,d as _e,f as ke,k as Et,i as Wt,b as qe,q as Ft,m as It,v as Ut,c as ze,a as Ot}from"../chunks/t3IulP9K.js";import{p as Ce}from"../chunks/Da7TBSQO.js";import"../chunks/8UtF8RsF.js";function Xe(a,d){gt(window,["resize"],()=>vt(()=>d(window[a])))}function At(a,d){let s=d;s.endsWith("/")||(s+="/");const v=a.startsWith("/")?a.substring(1):a;return new URL(v,s).toString()}function Rt(a,d){const s=new URL(a),v=new URL(d),h=s.pathname.startsWith("/")?s.pathname.substring(1):s.pathname;let A=v.pathname;return A.endsWith("/")||(A+="/"),v.pathname=A+h,v.search=s.search,v.hash=s.hash,v.toString()}function $t(a){return!a.match(/^https?:\/\//)&&!a.startsWith("data:")&&!a.startsWith("blob:")}function Ht(a){return a.startsWith("http://local-server.furcadia.com:8080/")||a.startsWith("https://terra.furcadia.com/")}function Tt(a,d,s){const v=a,h=v.XMLHttpRequest;v.FurcXMLHttpRequest=class extends h{static UNSENT=0;static OPENED=1;static HEADERS_RECEIVED=2;static LOADING=3;static DONE=4;open(x,_,...S){let f=_.toString();return $t(f)?(f=At(f,d),console.log(`[FurcXMLHttpRequest] Remapped relative URL to: ${f}`)):Ht(f)&&(f=Rt(f,s),console.log(`[FurcXMLHttpRequest] Remapped backend URL to: ${f}`)),super.open(x,f,...S)}}}class Ge{buffer="";append(d){this.buffer+=d;const s=[];let v;for(;(v=this.buffer.indexOf(`
`))!==-1;){const h=this.buffer.substring(0,v);s.push(h),this.buffer=this.buffer.substring(v+1)}return s}get isEmpty(){return this.buffer.length===0}clear(){this.buffer=""}}function Bt(a){const d=a,s=d.MessageEvent,v=d.Blob,h=d.Uint8Array,A=d.ArrayBuffer,x={encode:c=>{const t=c.length,n=new h(t);for(let g=0;g<t;g++)n[g]=c.charCodeAt(g)&255;return n}},_={decode:c=>{if(typeof c=="string")return c;let t;c instanceof h?t=c:c instanceof A||c instanceof ArrayBuffer?t=new h(c):t=new h(c.buffer,c.byteOffset,c.byteLength);let n="";const g=t.length,m=32768;for(let k=0;k<g;k+=m){const L=t.subarray(k,Math.min(k+m,g));n+=String.fromCharCode.apply(null,L)}return n}};let S=null,f;d.waitForFurc=new Promise(c=>{f=c});function M(c,t,n,g){t.endsWith(`
`)||(t+=`
`);const m=x.encode(t),k=new s("message",{data:m,origin:"wss://lightbringer.furcadia.com"});k.tag=g,k.sourceId=n,c.dispatchEvent(k)}function F(c,t,n,g){if(c.readyState===WebSocket.OPEN){t.endsWith(`
`)||(t+=`
`);const m=x.encode(t);c.sendTagged?c.sendTagged(m,n,g):c.send(m)}}const C=d.WebSocket;d.FurcWebSocket=class extends C{static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;_outgoingQueue=Promise.resolve();_incomingQueue=Promise.resolve();_incomingBuffer=new Ge;_outgoingBuffer=new Ge;constructor(t,n){if(super(t,n),t.toString().includes("furcadia")||t.toString().includes("6502")){console.log("%c😈 Game Socket Captured","color: #ff00ff;"),S=this;const g=se;g&&(g.send=(m,k,L)=>F(this,m,k,L),g.inject=(m,k,L)=>M(this,m,k,L),console.log("[Furnarchy] Connected to Game Socket")),this.addEventListener("open",()=>{f(this);const m=se;m&&m.notifyConnected()}),this.addEventListener("close",()=>{const m=se;m&&m.notifyDisconnected()})}}send(t){this.sendTagged(t,void 0,void 0)}sendTagged(t,n,g){if(S!==this){super.send(t);return}this._outgoingQueue=this._outgoingQueue.then(async()=>{let m=typeof t=="string"?t:_.decode(t);const k=this._outgoingBuffer.append(m);if(k.length===0)return;const L=[];for(let q of k){const D=se;if(D){const U=await D.processOutgoing(q,n,g);if(U==null){console.log("%c🚫 Outgoing Dropped (Furnarchy)","color: gray; font-size: 9px");continue}q=U}L.push(q)}if(L.length===0)return;const j=L.join(`
`)+`
`,Z=x.encode(j);super.send(Z)}).catch(m=>{console.error("Error in outgoing message queue:",m)})}_hookMessageEvent(t,n){const g=t.tag,m=t.sourceId;this._incomingQueue=this._incomingQueue.then(async()=>{let k=typeof t.data=="string"?t.data:_.decode(t.data);const L=this._incomingBuffer.append(k);if(L.length===0)return;const j=[];for(let U of L){const Y=se;if(Y){const ee=await Y.processIncoming(U,m,g);if(ee==null)continue;U=ee}j.push(U)}if(j.length===0)return;const Z=j.join(`
`)+`
`;let q=Z;this.binaryType==="arraybuffer"?q=x.encode(Z).buffer:this.binaryType==="blob"&&(q=new v([x.encode(Z)]));const D=new s("message",{data:q,origin:t.origin,source:t.source});n(D)}).catch(k=>{console.error("Error in incoming message queue:",k)})}set onmessage(t){S===this&&t?super.onmessage=n=>{this._hookMessageEvent(n,g=>{t.call(this,g)})}:super.onmessage=t}get onmessage(){return super.onmessage}addEventListener(t,n,g){if(t==="message"&&S===this&&typeof n=="function"){const m=k=>{this._hookMessageEvent(k,L=>{n.call(this,L)})};super.addEventListener(t,m,g);return}super.addEventListener(t,n,g)}}}async function Dt(a,d){const s=a,v=await fetch(d);if(!v.ok)throw new Error(`Failed to fetch client script: ${v.statusText}`);let h=await v.text();h=h.replaceAll("XMLHttpRequest","FurcXMLHttpRequest"),h=h.replaceAll("WebSocket","FurcWebSocket");const A=h.length;h=(()=>{let _=h.indexOf("Missing login data");if(_===-1)return h;const S=h.substring(0,_),f="__instantiate",M=`
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
        `,F=h.substring(_).replace(/;\s*(\w+)\s*=\s*(\w+)\s*\(\s*(\w+)\s*,/,`;${M}; $1 = ${f}($3,`);return S+F})(),A===h.length?console.warn("[Furc Loader] Warning: Could not find game instance assignment point to hook into."):s.processGameClientInstance=_=>{console.log("[Furc Loader] Processing game client instance...");const S=xe(_),f=(()=>{for(const[F,C]of S)if(Ze(C).search(/this(\.\w+){3}\("Reconnecting..."\)/)!==-1)return C.bind(_)})(),M=(()=>{const F=(()=>{for(const[c,t]of S)if(je(t).includes('"Señor Furreton"'))return t})();if(!F)return;const C=(()=>{for(const[c,t]of xe(F))if(je(t).includes('"chatBuffer"'))return t})();if(C){for(const[c,t]of xe(C))if(Ze(t).includes('"specitag"'))return t.bind(C)}})();f||M?(s.__CLIENT_HOOKS={reconnect:f,appendChat:M},console.log("[Furc Loader] Installed client hooks:",s.__CLIENT_HOOKS)):console.warn("[Furc Loader] Warning: Could not establish any client hooks.")};const x=a.document.createElement("script");x.textContent=h,x.async=!0,a.document.body.appendChild(x)}function xe(a){const d=new Set,s=v=>{!v||typeof v!="object"||(Object.getOwnPropertyNames(v).filter(h=>h!=="constructor"&&v[h]).forEach(h=>d.add([h,v[h]])),s(Object.getPrototypeOf(v)))};return s(a),[...d].sort()}function Nt(a){return a&&typeof a=="object"?Object.getPrototypeOf(a).constructor:null}function je(a,d=""){const s=Nt(a);return s?s.toString():d}function Ze(a,d=""){return typeof a=="function"?a.toString():d}var qt=B('<div class="config-btn svelte-8mozrr" title="Configure Plugin">⚙️</div>'),Xt=B('<div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">ID:</span> </div>'),Gt=B('<div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">Version:</span> </div>'),jt=B('<div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">Author:</span> </div>'),Zt=B('<div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">Description:</span> </div>'),Qt=B('<div class="plugin-details svelte-8mozrr"><!> <!> <!> <!> <div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">URL:</span> <a target="_blank" rel="noopener noreferrer" class="url-link svelte-8mozrr"> </a></div> <div class="button-group svelte-8mozrr"><button class="action-btn reload-btn svelte-8mozrr">Reload Plugin</button> <button class="action-btn remove-btn svelte-8mozrr">Remove Plugin</button></div></div>'),Yt=B('<li><div class="plugin-header svelte-8mozrr"><div class="plugin-title-group svelte-8mozrr"><div></div> <!> <span class="plugin-name svelte-8mozrr"> </span></div></div> <!></li>'),Vt=B('<li class="empty svelte-8mozrr">No plugins installed</li>'),Kt=B('<div class="modal-backdrop svelte-8mozrr"></div> <div class="modal retro-theme svelte-8mozrr"><div class="header-row svelte-8mozrr"><h2 class="svelte-8mozrr"></h2> <button class="close-btn svelte-8mozrr" aria-label="Close">✕</button></div> <div class="section-title svelte-8mozrr">Display Settings</div> <div class="display-settings svelte-8mozrr"><div class="setting-row svelte-8mozrr"><label for="zoom-control" class="svelte-8mozrr"> </label> <input id="zoom-control" type="range" min="0.5" max="3.0" step="0.1" class="svelte-8mozrr"/></div> <div class="setting-row svelte-8mozrr"><label class="checkbox-label svelte-8mozrr"><input type="checkbox" class="svelte-8mozrr"/> Fit to Window Width</label></div></div> <div class="section-title svelte-8mozrr">Plugins</div> <div class="add-plugin svelte-8mozrr"><input type="text" placeholder="https://example.com/my-plugin.js" class="svelte-8mozrr"/> <button class="svelte-8mozrr"> </button></div> <ul class="plugin-list svelte-8mozrr"><!> <!></ul> <div class="footer svelte-8mozrr"><small>Plugins have full access to your game session.</small></div></div>',1),Jt=B('<div class="plugin-manager svelte-8mozrr"><button class="fab svelte-8mozrr" title="Furnarchy Menu"><!></button> <!></div>');function ei(a,d){Ve(d,!1);const s=()=>yt(De,"$pluginStore",v),[v,h]=wt(),A=P();let x=P(!1),_=P(""),S=P(null),f=P(!1),M=P({}),F=P(!1),C=Ce(d,"zoomLevel",12,1.5),c=Ce(d,"fitWidth",12,!1),t=Ce(d,"isMobileMode",8,!1),n=se;Ye(()=>{const i=xt();C(i.zoomLevel),c(i.fitWidth),z(F,!0),window.Furnarchy=n.getExposedAPI(),De.set(St()),n.plugins&&n.plugins.forEach(l=>{l.metadata.sourceUrl&&mt(M,e(M)[l.metadata.sourceUrl]=l._handlers.configure.length>0)}),n.onRegister(l=>{const r=l.metadata||l,X=r.sourceUrl||l.sourceUrl;if(X){z(M,{...e(M),[X]:l._handlers.configure.length>0});const J=s().findIndex(re=>re.url===X);if(J!==-1){const re=n.loadingPluginUrl===X,O=s()[J];let $=!1;const H={...O};if(re){const oe=r.toggle?!1:O.enabled!==!1;l._setEnabled(oe),r.toggle&&O.enabled!==!1&&(H.enabled=!1,$=!0)}else l.enabled!==(O.enabled!==!1)&&(H.enabled=l.enabled,$=!0);if(O.name!==r.name&&(H.name=r.name,$=!0),O.id!==r.id&&(H.id=r.id,$=!0),O.description!==r.description&&(H.description=r.description,$=!0),O.version!==r.version&&(H.version=r.version,$=!0),O.author!==r.author&&(H.author=r.author,$=!0),O.toggle!==r.toggle&&(H.toggle=r.toggle,$=!0),$){const oe=[...s()];oe[J]=H,ue(oe)}}}});const u=n.version||"0.0.0";Lt(u).then(()=>{q()})});function g(){z(x,!e(x))}async function m(){if(e(_)&&!s().some(i=>i.url===e(_))){z(f,!0);try{const i=await Ut(e(_)),u=[...s(),{id:i.id,url:e(_),name:i.name,description:i.description,version:i.version,author:i.author,enabled:i.toggle!==void 0?!i.toggle:!0,toggle:i.toggle}];ue(u),D(e(_)),z(_,"")}catch(i){alert(`Failed to verify plugin: ${i.message||i}`)}finally{z(f,!1)}}}function k(i){const u=s().find(r=>r.url===i);u&&u.id&&It(u.id);const l=s().filter(r=>r.url!==i);ue(l),confirm("Plugin removed. Reload page to take effect?")&&window.location.reload()}function L(i){const u=s().map(l=>{if(l.url===i){const r=l.enabled===void 0?!1:!l.enabled;if(n&&n.plugins){const X=n.plugins.find(J=>J.metadata.sourceUrl===i);X&&X._setEnabled(r)}return{...l,enabled:r}}return l});ue(u)}function j(i){if(z(x,!1),n&&n.plugins){const u=n.plugins.find(l=>l.metadata.sourceUrl===i);u&&u._notifyConfigure()}}async function Z(i){const u=document.querySelector(`script[data-plugin-url="${i}"]`);if(u&&u.remove(),n&&n.plugins){const l=n.plugins.findIndex(r=>r.metadata.sourceUrl===i);l!==-1&&(n.plugins[l]._setEnabled(!1),n.plugins.splice(l,1))}await D(i)}async function q(){await Promise.all(s().map(i=>D(i.url))),n.start()}async function D(i){if(!document.querySelector(`script[data-plugin-url="${i}"]`))try{const u=await fetch(i);if(!u.ok)throw new Error(`HTTP ${u.status}`);const l=await u.text();n.loadingPluginUrl=i;const r=document.createElement("script");r.textContent=l,r.dataset.pluginUrl=i,document.body.appendChild(r),console.log(`[PluginManager] Loaded via fetch: ${i}`)}catch(u){return console.warn(`[PluginManager] Fetch failed for ${i}, falling back to script tag.`,u),new Promise(l=>{const r=document.createElement("script");r.src=i,r.async=!0,r.dataset.pluginUrl=i,r.onload=()=>{console.log(`[PluginManager] Loaded via tag: ${i}`),l()},r.onerror=()=>{console.error(`[PluginManager] Failed to load: ${i}`),l()},document.body.appendChild(r)})}finally{n.loadingPluginUrl=null}}Se(()=>s(),()=>{z(A,[...s()].sort((i,u)=>{const l=i.enabled!==!1,r=u.enabled!==!1;return l!==r?l?-1:1:(i.name||i.url).localeCompare(u.name||u.url)}))}),Se(()=>(e(F),we(C()),we(c())),()=>{typeof window<"u"&&e(F)&&Mt({zoomLevel:C(),fitWidth:c()})}),Ke(),Qe();var U=Jt(),Y=w(U),ee=w(Y);Ct(ee),y(Y);var p=b(Y,2);{var R=i=>{var u=Kt(),l=et(u),r=b(l,2),X=w(r),J=w(X);J.textContent="Furnarchy Zero 0.16.7";var re=b(J,2);y(X);var O=b(X,4),$=w(O),H=w($),oe=w(H);y(H);var he=b(H,2);ye(he),y($);var Le=b($,2),Me=w(Le),fe=w(Me);ye(fe),Be(),y(Me),y(Le),y(O);var ge=b(O,4),ae=w(ge);ye(ae);var ce=b(ae,2),tt=w(ce,!0);y(ce),y(ge);var Pe=b(ge,2),Ee=w(Pe);Pt(Ee,1,()=>e(A),Wt,(G,o)=>{var le=Yt();let We;var ve=w(le),Fe=w(ve),de=w(Fe);let Ie;var Ue=b(de,2);{var st=te=>{var ie=qt();N("click",ie,ke(()=>j(e(o).url))),T(te,ie)};Q(Ue,te=>{e(M),e(o),W(()=>e(M)[e(o).url])&&te(st)})}var me=b(Ue,2),ot=w(me,!0);y(me),y(Fe),y(ve);var rt=b(ve,2);{var at=te=>{var ie=Qt(),Oe=w(ie);{var lt=E=>{var I=Xt(),ne=b(w(I));y(I),K(()=>V(ne,` ${e(o),W(()=>e(o).id)??""}`)),T(E,I)};Q(Oe,E=>{e(o),W(()=>e(o).id)&&E(lt)})}var Ae=b(Oe,2);{var ct=E=>{var I=Gt(),ne=b(w(I));y(I),K(()=>V(ne,` ${e(o),W(()=>e(o).version)??""}`)),T(E,I)};Q(Ae,E=>{e(o),W(()=>e(o).version)&&E(ct)})}var Re=b(Ae,2);{var dt=E=>{var I=jt(),ne=b(w(I));y(I),K(()=>V(ne,` ${e(o),W(()=>e(o).author)??""}`)),T(E,I)};Q(Re,E=>{e(o),W(()=>e(o).author)&&E(dt)})}var $e=b(Re,2);{var ut=E=>{var I=Zt(),ne=b(w(I));y(I),K(()=>V(ne,` ${e(o),W(()=>e(o).description)??""}`)),T(E,I)};Q($e,E=>{e(o),W(()=>e(o).description)&&E(ut)})}var pe=b($e,2),be=b(w(pe),2),ht=w(be,!0);y(be),y(pe);var He=b(pe,2),Te=w(He),ft=b(Te,2);y(He),y(ie),K(()=>{_e(be,"href",(e(o),W(()=>e(o).url))),V(ht,(e(o),W(()=>e(o).url)))}),N("click",Te,()=>Z(e(o).url)),N("click",ft,()=>k(e(o).url)),N("click",ie,ke(function(E){Et.call(this,d,E)})),T(te,ie)};Q(rt,te=>{e(S),e(o),W(()=>e(S)===e(o).url)&&te(at)})}y(le),K(()=>{We=Ne(le,1,"plugin-item svelte-8mozrr",null,We,{expanded:e(S)===e(o).url,disabled:e(o).enabled===!1&&!e(o).toggle}),Ie=Ne(de,1,"toggle-switch svelte-8mozrr",null,Ie,{checked:e(o).enabled!==!1}),_e(de,"title",(e(o),W(()=>e(o).enabled!==!1?"Disable Plugin":"Enable Plugin"))),_e(me,"title",(e(o),W(()=>e(o).url))),V(ot,(e(o),W(()=>e(o).name||e(o).url)))}),N("click",de,ke(()=>L(e(o).url))),N("click",le,()=>z(S,e(S)===e(o).url?null:e(o).url)),T(G,le)});var it=b(Ee,2);{var nt=G=>{var o=Vt();T(G,o)};Q(it,G=>{s(),W(()=>s().length===0)&&G(nt)})}y(Pe),Be(2),y(r),K(G=>{V(oe,`Zoom: ${G??""}x`),he.disabled=c()||t(),fe.disabled=t(),ae.disabled=e(f),ce.disabled=e(f),V(tt,e(f)?"...":"Add")},[()=>(we(C()),W(()=>C().toFixed(1)))]),N("click",l,g),N("click",re,g),qe(he,C),Ft(fe,c),qe(ae,()=>e(_),G=>z(_,G)),N("keydown",ae,G=>G.key==="Enter"&&!e(f)&&m()),N("click",ce,m),T(i,u)};Q(p,i=>{e(x)&&i(R)})}y(U),N("click",Y,g),T(a,U),Je(),h()}const ti=`
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
`;var ii=B('<div class="loading svelte-hy9bcf"><p>Loading Furcadia Web Client...</p></div>'),ni=B('<div class="error svelte-hy9bcf"><p> </p> <button class="svelte-hy9bcf">Try Again</button></div>'),si=B('<!> <!> <div class="iframe-container svelte-hy9bcf"><iframe title="Furcadia Client" class="game-iframe svelte-hy9bcf"></iframe></div> <!>',1);function bi(a,d){Ve(d,!1);const s=P(),v=ze.PUBLIC_FURCADIA_CLIENT_JS_URL,h=ze.PUBLIC_AUTH_PROXY_URL,A=ze.PUBLIC_PLAY_FURCADIA_URL;let x=P(!1),_=P(""),S=!1,f=P(),M=P(640),F=P(480),C=P(!1),c=P(1.5),t=P(!1),n=P(1024),g=P(768);Ye(()=>{const R=Ot()||h;if(console.log(`[Furnarchy] Using backend URL: ${R}`),window.addEventListener("message",m),e(f)&&e(f).contentWindow&&e(f).contentDocument){const i=e(f).contentDocument,u=e(f).contentWindow;i.open(),i.write(ti),i.close(),Tt(u,A,R),Bt(u),se.attachInputInterception(i),k(u)}return()=>{window.removeEventListener("message",m)}});function m(p){p.data&&p.data.type==="resize"&&(z(M,Math.ceil(p.data.width)),z(F,Math.ceil(p.data.height)),z(C,!!p.data.isMobile))}async function k(p){if(!S){z(x,!0),z(_,"");try{await Dt(p,v),S=!0}catch(R){console.error(R),z(_,R.message||"An unknown error occurred")}finally{z(x,!1)}}}Se(()=>(e(C),e(t),e(n),e(M),e(g),e(F),e(c)),()=>{z(s,e(C)?1:e(t)?Math.min(e(n)/e(M),e(g)/e(F)):e(c))}),Ke(),Qe();var L=si();_t("hy9bcf",p=>{pt(()=>{bt.title="Furnarchy Zero"})});var j=et(L);ei(j,{get isMobileMode(){return e(C)},get zoomLevel(){return e(c)},set zoomLevel(p){z(c,p)},get fitWidth(){return e(t)},set fitWidth(p){z(t,p)},$$legacy:!0});var Z=b(j,2);{var q=p=>{var R=ii();T(p,R)};Q(Z,p=>{e(x)&&p(q)})}var D=b(Z,2),U=w(D);zt(U,p=>z(f,p),()=>e(f)),y(D);var Y=b(D,2);{var ee=p=>{var R=ni(),i=w(R),u=w(i);y(i);var l=b(i,2);y(R),K(()=>V(u,`Error: ${e(_)??""}`)),N("click",l,()=>window.location.reload()),T(p,R)};Q(Y,p=>{e(_)&&p(ee)})}K(()=>kt(U,`width: ${e(C)?"100%":e(M)+"px"}; height: ${e(C)?"100%":e(F)+"px"}; --zoom: ${e(s)??""};`)),Xe("innerWidth",p=>z(n,p)),Xe("innerHeight",p=>z(g,p)),T(a,L),Je()}export{bi as component};
