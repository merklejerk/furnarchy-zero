import{f as R,e as T,a as A,s as Q}from"../chunks/Cqq1a1KQ.js";import{i as je}from"../chunks/j2M9h5Jk.js";import{o as Ze}from"../chunks/r3_wVOpG.js";import{b1 as ft,aC as gt,B as Qe,a7 as Se,a8 as Ye,F as Ve,z as be,a as e,a3 as E,G as w,s as z,b2 as vt,I as p,H as y,C as Je,aa as mt,u as L,E as Y,n as pt,a9 as bt}from"../chunks/WP6s4_OC.js";import{i as Z,s as wt,a as yt}from"../chunks/DEPZNxei.js";import{f as re,h as _t}from"../chunks/AmiOGsVn.js";import{s as kt}from"../chunks/BI8tIZ8J.js";import{b as zt}from"../chunks/YWP4DBZ4.js";import{p as Be,n as xt,g as St,h as de,l as Ct,o as Mt,r as we,e as Pt,s as Te,d as ye,f as _e,k as Lt,i as Et,b as De,q as Wt,m as Ft,v as Ut,c as ke,a as It}from"../chunks/BJXM2gxy.js";import{p as ze}from"../chunks/CByjIOJv.js";import"../chunks/8UtF8RsF.js";function Ne(a,d){ft(window,["resize"],()=>gt(()=>d(window[a])))}function Ot(a,d){let s=d;s.endsWith("/")||(s+="/");const v=a.startsWith("/")?a.substring(1):a;return new URL(v,s).toString()}function At(a,d){const s=new URL(a),v=new URL(d),u=s.pathname.startsWith("/")?s.pathname.substring(1):s.pathname;let $=v.pathname;return $.endsWith("/")||($+="/"),v.pathname=$+u,v.search=s.search,v.hash=s.hash,v.toString()}function Rt(a){return!a.match(/^https?:\/\//)&&!a.startsWith("data:")&&!a.startsWith("blob:")}function $t(a){return a.startsWith("http://local-server.furcadia.com:8080/")||a.startsWith("https://terra.furcadia.com/")}function Ht(a,d,s){const v=a,u=v.XMLHttpRequest;v.FurcXMLHttpRequest=class extends u{static UNSENT=0;static OPENED=1;static HEADERS_RECEIVED=2;static LOADING=3;static DONE=4;open(S,_,...C){let h=_.toString();return Rt(h)?(h=Ot(h,d),console.log(`[FurcXMLHttpRequest] Remapped relative URL to: ${h}`)):$t(h)&&(h=At(h,s),console.log(`[FurcXMLHttpRequest] Remapped backend URL to: ${h}`)),super.open(S,h,...C)}}}class qe{buffer="";append(d){this.buffer+=d;const s=[];let v;for(;(v=this.buffer.indexOf(`
`))!==-1;){const u=this.buffer.substring(0,v);s.push(u),this.buffer=this.buffer.substring(v+1)}return s}get isEmpty(){return this.buffer.length===0}clear(){this.buffer=""}}function Bt(a){const d=a,s=d.MessageEvent,v=d.Blob,u=d.Uint8Array,$=d.ArrayBuffer,S={encode:c=>{const t=c.length,n=new u(t);for(let g=0;g<t;g++)n[g]=c.charCodeAt(g)&255;return n}},_={decode:c=>{if(typeof c=="string")return c;let t;c instanceof u?t=c:c instanceof $||c instanceof ArrayBuffer?t=new u(c):t=new u(c.buffer,c.byteOffset,c.byteLength);let n="";const g=t.length,m=32768;for(let k=0;k<g;k+=m){const M=t.subarray(k,Math.min(k+m,g));n+=String.fromCharCode.apply(null,M)}return n}};let C=null,h;d.waitForFurc=new Promise(c=>{h=c});function P(c,t,n,g){if(!t.endsWith(`
`))throw new Error("Furnarchy.inject() requires a complete command (must end with \\n)");const m=S.encode(t),k=new s("message",{data:m,origin:"wss://lightbringer.furcadia.com"});k.tag=g,k.sourceId=n,c.dispatchEvent(k)}function F(c,t,n,g){if(c.readyState===WebSocket.OPEN){if(!t.endsWith(`
`))throw new Error("Furnarchy.send() requires a complete command (must end with \\n)");const m=S.encode(t);c.sendTagged?c.sendTagged(m,n,g):c.send(m)}}const x=d.WebSocket;d.FurcWebSocket=class extends x{static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;_outgoingQueue=Promise.resolve();_incomingQueue=Promise.resolve();_incomingBuffer=new qe;_outgoingBuffer=new qe;constructor(t,n){if(super(t,n),t.toString().includes("furcadia")||t.toString().includes("6502")){console.log("%c😈 Game Socket Captured","color: #ff00ff;"),C=this;const g=re;g&&(g.send=(m,k,M)=>F(this,m,k,M),g.inject=(m,k,M)=>P(this,m,k,M),console.log("[Furnarchy] Connected to Game Socket")),this.addEventListener("open",()=>{h(this);const m=re;m&&m.notifyConnected()}),this.addEventListener("close",()=>{const m=re;m&&m.notifyDisconnected()})}}send(t){this.sendTagged(t,void 0,void 0)}sendTagged(t,n,g){if(C!==this){super.send(t);return}this._outgoingQueue=this._outgoingQueue.then(async()=>{let m=typeof t=="string"?t:_.decode(t);const k=this._outgoingBuffer.append(m);if(k.length===0)return;const M=[];for(let D of k){const H=re;if(H){const I=await H.processOutgoing(D,n,g);if(I==null){console.log("%c🚫 Outgoing Dropped (Furnarchy)","color: gray; font-size: 9px");continue}D=I}M.push(D)}if(M.length===0)return;const X=M.join(`
`)+`
`,G=S.encode(X);super.send(G)}).catch(m=>{console.error("Error in outgoing message queue:",m)})}_hookMessageEvent(t,n){const g=t.tag,m=t.sourceId;this._incomingQueue=this._incomingQueue.then(async()=>{let k=typeof t.data=="string"?t.data:_.decode(t.data);const M=this._incomingBuffer.append(k);if(M.length===0)return;const X=[];for(let I of M){const J=re;if(J){const K=await J.processIncoming(I,m,g);if(K==null)continue;I=K}X.push(I)}if(X.length===0)return;const G=X.join(`
`)+`
`;let D=G;this.binaryType==="arraybuffer"?D=S.encode(G).buffer:this.binaryType==="blob"&&(D=new v([S.encode(G)]));const H=new s("message",{data:D,origin:t.origin,source:t.source});n(H)}).catch(k=>{console.error("Error in incoming message queue:",k)})}set onmessage(t){C===this&&t?super.onmessage=n=>{this._hookMessageEvent(n,g=>{t.call(this,g)})}:super.onmessage=t}get onmessage(){return super.onmessage}addEventListener(t,n,g){if(t==="message"&&C===this&&typeof n=="function"){const m=k=>{this._hookMessageEvent(k,M=>{n.call(this,M)})};super.addEventListener(t,m,g);return}super.addEventListener(t,n,g)}}}async function Tt(a,d){const s=a,v=await fetch(d);if(!v.ok)throw new Error(`Failed to fetch client script: ${v.statusText}`);let u=await v.text();u=u.replaceAll("XMLHttpRequest","FurcXMLHttpRequest"),u=u.replaceAll("WebSocket","FurcWebSocket");const $=u.length;u=(()=>{let _=u.indexOf("Missing login data");if(_===-1)return u;const C=u.substring(0,_),h="__instantiate",P=`
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
        `,F=u.substring(_).replace(/;\s*(\w+)\s*=\s*(\w+)\s*\(\s*(\w+)\s*,/,`;${P}; $1 = ${h}($3,`);return C+F})(),$===u.length?console.warn("[Furc Loader] Warning: Could not find game instance assignment point to hook into."):s.processGameClientInstance=_=>{console.log("[Furc Loader] Processing game client instance...");const C=xe(_),h=(()=>{for(const[F,x]of C)if(Ge(x).search(/this(\.\w+){3}\("Reconnecting..."\)/)!==-1)return x.bind(_)})(),P=(()=>{const F=(()=>{for(const[c,t]of C)if(Xe(t).includes('"Señor Furreton"'))return t})();if(!F)return;const x=(()=>{for(const[c,t]of xe(F))if(Xe(t).includes('"chatBuffer"'))return t})();if(x){for(const[c,t]of xe(x))if(Ge(t).includes('"specitag"'))return t.bind(x)}})();h&&P&&(s.__CLIENT_HOOKS={reconnect:h,appendChat:P})};const S=a.document.createElement("script");S.textContent=u,S.async=!0,a.document.body.appendChild(S)}function xe(a){const d=new Set,s=v=>{!v||!(v instanceof Object)||(Object.getOwnPropertyNames(v).filter(u=>u!=="constructor"&&v[u]).forEach(u=>d.add([u,v[u]])),s(Object.getPrototypeOf(v)))};return s(a),[...d].sort()}function Dt(a){return a&&a instanceof Object?Object.getPrototypeOf(a).constructor:null}function Xe(a,d=""){const s=Dt(a);return s?s.toString():d}function Ge(a,d=""){return typeof a=="function"?a.toString():d}var Nt=R('<div class="config-btn svelte-8mozrr" title="Configure Plugin">⚙️</div>'),qt=R('<div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">ID:</span> </div>'),Xt=R('<div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">Version:</span> </div>'),Gt=R('<div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">Author:</span> </div>'),jt=R('<div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">Description:</span> </div>'),Zt=R('<div class="plugin-details svelte-8mozrr"><!> <!> <!> <!> <div class="detail-row svelte-8mozrr"><span class="label svelte-8mozrr">URL:</span> <a target="_blank" rel="noopener noreferrer" class="url-link svelte-8mozrr"> </a></div> <div class="button-group svelte-8mozrr"><button class="action-btn reload-btn svelte-8mozrr">Reload Plugin</button> <button class="action-btn remove-btn svelte-8mozrr">Remove Plugin</button></div></div>'),Qt=R('<li><div class="plugin-header svelte-8mozrr"><div class="plugin-title-group svelte-8mozrr"><div></div> <!> <span class="plugin-name svelte-8mozrr"> </span></div></div> <!></li>'),Yt=R('<li class="empty svelte-8mozrr">No plugins installed</li>'),Vt=R('<div class="modal-backdrop svelte-8mozrr"></div> <div class="modal retro-theme svelte-8mozrr"><div class="header-row svelte-8mozrr"><h2 class="svelte-8mozrr">Game Menu</h2> <button class="close-btn svelte-8mozrr" aria-label="Close">✕</button></div> <div class="section-title svelte-8mozrr">Display Settings</div> <div class="display-settings svelte-8mozrr"><div class="setting-row svelte-8mozrr"><label for="zoom-control" class="svelte-8mozrr"> </label> <input id="zoom-control" type="range" min="0.5" max="3.0" step="0.1" class="svelte-8mozrr"/></div> <div class="setting-row svelte-8mozrr"><label class="checkbox-label svelte-8mozrr"><input type="checkbox" class="svelte-8mozrr"/> Fit to Window Width</label></div></div> <div class="section-title svelte-8mozrr">Plugins</div> <div class="add-plugin svelte-8mozrr"><input type="text" placeholder="https://example.com/my-plugin.js" class="svelte-8mozrr"/> <button class="svelte-8mozrr"> </button></div> <ul class="plugin-list svelte-8mozrr"><!> <!></ul> <div class="footer svelte-8mozrr"><small>Plugins have full access to your game session.</small> <br/> <small></small></div></div>',1),Jt=R('<div class="plugin-manager svelte-8mozrr"><button class="fab svelte-8mozrr" title="Plugin Manager">⚙️</button> <!></div>');function Kt(a,d){Qe(d,!1);const s=()=>yt(Be,"$pluginStore",v),[v,u]=wt(),$=E();let S=E(!1),_=E(""),C=E(null),h=E(!1),P=E({}),F=E(!1),x=ze(d,"zoomLevel",12,1.5),c=ze(d,"fitWidth",12,!1),t=ze(d,"isMobileMode",8,!1),n=re;Ze(()=>{const i=xt();x(i.zoomLevel),c(i.fitWidth),z(F,!0),window.Furnarchy=n.getExposedAPI(),Be.set(St()),n.plugins&&n.plugins.forEach(o=>{o.metadata.sourceUrl&&vt(P,e(P)[o.metadata.sourceUrl]=o._handlers.configure.length>0)}),n.onRegister(o=>{const l=o.metadata||o,N=l.sourceUrl||o.sourceUrl;if(N){z(P,{...e(P),[N]:o._handlers.configure.length>0});const ee=s().findIndex(te=>te.url===N);if(ee!==-1){const te=n.loadingPluginUrl===N,O=s()[ee];let B=!1;const j={...O};if(te){const V=l.toggle?!1:O.enabled!==!1;o._setEnabled(V),l.toggle&&O.enabled!==!1&&(j.enabled=!1,B=!0)}else o.enabled!==(O.enabled!==!1)&&(j.enabled=o.enabled,B=!0);if(O.name!==l.name&&(j.name=l.name,B=!0),O.id!==l.id&&(j.id=l.id,B=!0),O.description!==l.description&&(j.description=l.description,B=!0),O.version!==l.version&&(j.version=l.version,B=!0),O.author!==l.author&&(j.author=l.author,B=!0),B){const V=[...s()];V[ee]=j,de(V)}}}});const f=n.version||"0.0.0";Ct(f).then(()=>{D()})});function g(){z(S,!e(S))}async function m(){if(e(_)&&!s().some(i=>i.url===e(_))){z(h,!0);try{const i=await Ut(e(_)),f=[...s(),{id:i.id,url:e(_),name:i.name,description:i.description,version:i.version,author:i.author,enabled:i.toggle!==void 0?!i.toggle:!0}];de(f),H(e(_)),z(_,"")}catch(i){alert(`Failed to verify plugin: ${i.message||i}`)}finally{z(h,!1)}}}function k(i){const f=s().find(l=>l.url===i);f&&f.id&&Ft(f.id);const o=s().filter(l=>l.url!==i);de(o),confirm("Plugin removed. Reload page to take effect?")&&window.location.reload()}function M(i){const f=s().map(o=>{if(o.url===i){const l=o.enabled===void 0?!1:!o.enabled;if(n&&n.plugins){const N=n.plugins.find(ee=>ee.metadata.sourceUrl===i);N&&N._setEnabled(l)}return{...o,enabled:l}}return o});de(f)}function X(i){if(z(S,!1),n&&n.plugins){const f=n.plugins.find(o=>o.metadata.sourceUrl===i);f&&f._notifyConfigure()}}async function G(i){const f=document.querySelector(`script[data-plugin-url="${i}"]`);if(f&&f.remove(),n&&n.plugins){const o=n.plugins.findIndex(l=>l.metadata.sourceUrl===i);o!==-1&&(n.plugins[o]._setEnabled(!1),n.plugins.splice(o,1))}await H(i)}async function D(){await Promise.all(s().map(i=>H(i.url))),n.start()}async function H(i){if(!document.querySelector(`script[data-plugin-url="${i}"]`))try{const f=await fetch(i);if(!f.ok)throw new Error(`HTTP ${f.status}`);const o=await f.text();n.loadingPluginUrl=i;const l=document.createElement("script");l.textContent=o,l.dataset.pluginUrl=i,document.body.appendChild(l),console.log(`[PluginManager] Loaded via fetch: ${i}`)}catch(f){return console.warn(`[PluginManager] Fetch failed for ${i}, falling back to script tag.`,f),new Promise(o=>{const l=document.createElement("script");l.src=i,l.async=!0,l.dataset.pluginUrl=i,l.onload=()=>{console.log(`[PluginManager] Loaded via tag: ${i}`),o()},l.onerror=()=>{console.error(`[PluginManager] Failed to load: ${i}`),o()},document.body.appendChild(l)})}finally{n.loadingPluginUrl=null}}Se(()=>s(),()=>{z($,s())}),Se(()=>(e(F),be(x()),be(c())),()=>{typeof window<"u"&&e(F)&&Mt({zoomLevel:x(),fitWidth:c()})}),Ye(),je();var I=Jt(),J=w(I),K=p(J,2);{var b=i=>{var f=Vt(),o=Je(f),l=p(o,2),N=w(l),ee=p(w(N),2);y(N);var te=p(N,4),O=w(te),B=w(O),j=w(B);y(B);var V=p(B,2);we(V),y(O);var Ce=p(O,2),Me=w(Ce),ue=w(Me);we(ue),mt(),y(Me),y(Ce),y(te);var he=p(te,4),oe=w(he);we(oe);var le=p(oe,2),Ke=w(le,!0);y(le),y(he);var fe=p(he,2),Pe=w(fe);Pt(Pe,1,s,Et,(q,r)=>{var ae=Qt();let Ee;var ge=w(ae),We=w(ge),ce=w(We);let Fe;var Ue=p(ce,2);{var nt=ie=>{var ne=Nt();T("click",ne,_e(()=>X(e(r).url))),A(ie,ne)};Z(Ue,ie=>{e(P),e(r),L(()=>e(P)[e(r).url])&&ie(nt)})}var ve=p(Ue,2),st=w(ve,!0);y(ve),y(We),y(ge);var rt=p(ge,2);{var ot=ie=>{var ne=Zt(),Ie=w(ne);{var at=W=>{var U=qt(),se=p(w(U));y(U),Y(()=>Q(se,` ${e(r),L(()=>e(r).id)??""}`)),A(W,U)};Z(Ie,W=>{e(r),L(()=>e(r).id)&&W(at)})}var Oe=p(Ie,2);{var lt=W=>{var U=Xt(),se=p(w(U));y(U),Y(()=>Q(se,` ${e(r),L(()=>e(r).version)??""}`)),A(W,U)};Z(Oe,W=>{e(r),L(()=>e(r).version)&&W(lt)})}var Ae=p(Oe,2);{var ct=W=>{var U=Gt(),se=p(w(U));y(U),Y(()=>Q(se,` ${e(r),L(()=>e(r).author)??""}`)),A(W,U)};Z(Ae,W=>{e(r),L(()=>e(r).author)&&W(ct)})}var Re=p(Ae,2);{var dt=W=>{var U=jt(),se=p(w(U));y(U),Y(()=>Q(se,` ${e(r),L(()=>e(r).description)??""}`)),A(W,U)};Z(Re,W=>{e(r),L(()=>e(r).description)&&W(dt)})}var me=p(Re,2),pe=p(w(me),2),ut=w(pe,!0);y(pe),y(me);var $e=p(me,2),He=w($e),ht=p(He,2);y($e),y(ne),Y(()=>{ye(pe,"href",(e(r),L(()=>e(r).url))),Q(ut,(e(r),L(()=>e(r).url)))}),T("click",He,()=>G(e(r).url)),T("click",ht,()=>k(e(r).url)),T("click",ne,_e(function(W){Lt.call(this,d,W)})),A(ie,ne)};Z(rt,ie=>{e(C),e(r),L(()=>e(C)===e(r).url)&&ie(ot)})}y(ae),Y(()=>{Ee=Te(ae,1,"plugin-item svelte-8mozrr",null,Ee,{expanded:e(C)===e(r).url,disabled:e(r).enabled===!1}),Fe=Te(ce,1,"toggle-switch svelte-8mozrr",null,Fe,{checked:e(r).enabled!==!1}),ye(ce,"title",(e(r),L(()=>e(r).enabled!==!1?"Disable Plugin":"Enable Plugin"))),ye(ve,"title",(e(r),L(()=>e(r).url))),Q(st,(e(r),L(()=>e(r).name||e(r).url)))}),T("click",ce,_e(()=>M(e(r).url))),T("click",ae,()=>z(C,e(C)===e(r).url?null:e(r).url)),A(q,ae)});var et=p(Pe,2);{var tt=q=>{var r=Yt();A(q,r)};Z(et,q=>{s(),L(()=>s().length===0)&&q(tt)})}y(fe);var Le=p(fe,2),it=p(w(Le),4);it.textContent=`Furnarchy Zero v${L(()=>window.Furnarchy?.version||"...")??""}`,y(Le),y(l),Y(q=>{Q(j,`Zoom: ${q??""}x`),V.disabled=c()||t(),ue.disabled=t(),oe.disabled=e(h),le.disabled=e(h),Q(Ke,e(h)?"...":"Add")},[()=>(be(x()),L(()=>x().toFixed(1)))]),T("click",o,g),T("click",ee,g),De(V,x),Wt(ue,c),De(oe,()=>e(_),q=>z(_,q)),T("keydown",oe,q=>q.key==="Enter"&&!e(h)&&m()),T("click",le,m),A(i,f)};Z(K,i=>{e(S)&&i(b)})}y(I),T("click",J,g),A(a,I),Ve(),u()}const ei=`
<!DOCTYPE html>
<html>
<head>
    <title>Furnarchy Zero Client</title>
    <link rel="stylesheet" type="text/css" href="https://play.furcadia.com/web/furcadia.css?v=a1599e9c4ed5bc2f3aa66c66e96df767" />
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
    </div>
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
`;var ti=R('<div class="loading svelte-hy9bcf"><p>Loading Furcadia Web Client...</p></div>'),ii=R('<div class="error svelte-hy9bcf"><p> </p> <button class="svelte-hy9bcf">Try Again</button></div>'),ni=R('<!> <!> <div class="iframe-container svelte-hy9bcf"><iframe title="Furcadia Client" class="game-iframe svelte-hy9bcf"></iframe></div> <!>',1);function pi(a,d){Qe(d,!1);const s=E(),v=ke.PUBLIC_FURCADIA_CLIENT_JS_URL,u=ke.PUBLIC_AUTH_PROXY_URL,$=ke.PUBLIC_PLAY_FURCADIA_URL;let S=E(!1),_=E(""),C=!1,h=E(),P=E(640),F=E(480),x=E(!1),c=E(1.5),t=E(!1),n=E(1024),g=E(768);Ze(()=>{const i=It()||u;if(console.log(`[Furnarchy] Using backend URL: ${i}`),window.addEventListener("message",m),e(h)&&e(h).contentWindow&&e(h).contentDocument){const f=e(h).contentDocument,o=e(h).contentWindow;f.open(),f.write(ei),f.close(),Ht(o,$,i),Bt(o),re.attachInputInterception(f),k(o)}return()=>{window.removeEventListener("message",m)}});function m(b){b.data&&b.data.type==="resize"&&(z(P,Math.ceil(b.data.width)),z(F,Math.ceil(b.data.height)),z(x,!!b.data.isMobile))}async function k(b){if(!C){z(S,!0),z(_,"");try{await Tt(b,v),C=!0}catch(i){console.error(i),z(_,i.message||"An unknown error occurred")}finally{z(S,!1)}}}Se(()=>(e(x),e(t),e(n),e(P),e(g),e(F),e(c)),()=>{z(s,e(x)?1:e(t)?Math.min(e(n)/e(P),e(g)/e(F)):e(c))}),Ye(),je();var M=ni();_t("hy9bcf",b=>{pt(()=>{bt.title="Furnarchy Zero"})});var X=Je(M);Kt(X,{get isMobileMode(){return e(x)},get zoomLevel(){return e(c)},set zoomLevel(b){z(c,b)},get fitWidth(){return e(t)},set fitWidth(b){z(t,b)},$$legacy:!0});var G=p(X,2);{var D=b=>{var i=ti();A(b,i)};Z(G,b=>{e(S)&&b(D)})}var H=p(G,2),I=w(H);zt(I,b=>z(h,b),()=>e(h)),y(H);var J=p(H,2);{var K=b=>{var i=ii(),f=w(i),o=w(f);y(f);var l=p(f,2);y(i),Y(()=>Q(o,`Error: ${e(_)??""}`)),T("click",l,()=>window.location.reload()),A(b,i)};Z(J,b=>{e(_)&&b(K)})}Y(()=>kt(I,`width: ${e(x)?"100%":e(P)+"px"}; height: ${e(x)?"100%":e(F)+"px"}; --zoom: ${e(s)??""};`)),Ne("innerWidth",b=>z(n,b)),Ne("innerHeight",b=>z(g,b)),A(a,M),Ve()}export{pi as component};
