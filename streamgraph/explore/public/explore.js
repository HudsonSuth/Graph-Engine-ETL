var tg=Object.create;var Ji=Object.defineProperty;var ng=Object.getOwnPropertyDescriptor;var rg=Object.getOwnPropertyNames;var ag=Object.getPrototypeOf,ig=Object.prototype.hasOwnProperty;var Ie=(e,n)=>()=>{try{return n||e((n={exports:{}}).exports,n),n.exports}catch(t){throw n=0,t}},og=(e,n)=>{for(var t in n)Ji(e,t,{get:n[t],enumerable:!0})},sg=(e,n,t,r)=>{if(n&&typeof n=="object"||typeof n=="function")for(let a of rg(n))!ig.call(e,a)&&a!==t&&Ji(e,a,{get:()=>n[a],enumerable:!(r=ng(n,a))||r.enumerable});return e};var We=(e,n,t)=>(t=e!=null?tg(ag(e)):{},sg(n||!e||!e.__esModule?Ji(t,"default",{value:e,enumerable:!0}):t,e));var Gt=Ie((qx,eo)=>{"use strict";var An=typeof Reflect=="object"?Reflect:null,yl=An&&typeof An.apply=="function"?An.apply:function(n,t,r){return Function.prototype.apply.call(n,t,r)},sa;An&&typeof An.ownKeys=="function"?sa=An.ownKeys:Object.getOwnPropertySymbols?sa=function(n){return Object.getOwnPropertyNames(n).concat(Object.getOwnPropertySymbols(n))}:sa=function(n){return Object.getOwnPropertyNames(n)};function lg(e){console&&console.warn&&console.warn(e)}var xl=Number.isNaN||function(n){return n!==n};function fe(){fe.init.call(this)}eo.exports=fe;eo.exports.once=hg;fe.EventEmitter=fe;fe.prototype._events=void 0;fe.prototype._eventsCount=0;fe.prototype._maxListeners=void 0;var bl=10;function la(e){if(typeof e!="function")throw new TypeError('The "listener" argument must be of type Function. Received type '+typeof e)}Object.defineProperty(fe,"defaultMaxListeners",{enumerable:!0,get:function(){return bl},set:function(e){if(typeof e!="number"||e<0||xl(e))throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received '+e+".");bl=e}});fe.init=function(){(this._events===void 0||this._events===Object.getPrototypeOf(this)._events)&&(this._events=Object.create(null),this._eventsCount=0),this._maxListeners=this._maxListeners||void 0};fe.prototype.setMaxListeners=function(n){if(typeof n!="number"||n<0||xl(n))throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received '+n+".");return this._maxListeners=n,this};function Sl(e){return e._maxListeners===void 0?fe.defaultMaxListeners:e._maxListeners}fe.prototype.getMaxListeners=function(){return Sl(this)};fe.prototype.emit=function(n){for(var t=[],r=1;r<arguments.length;r++)t.push(arguments[r]);var a=n==="error",i=this._events;if(i!==void 0)a=a&&i.error===void 0;else if(!a)return!1;if(a){var o;if(t.length>0&&(o=t[0]),o instanceof Error)throw o;var s=new Error("Unhandled error."+(o?" ("+o.message+")":""));throw s.context=o,s}var l=i[n];if(l===void 0)return!1;if(typeof l=="function")yl(l,this,t);else for(var u=l.length,d=Al(l,u),r=0;r<u;++r)yl(d[r],this,t);return!0};function _l(e,n,t,r){var a,i,o;if(la(t),i=e._events,i===void 0?(i=e._events=Object.create(null),e._eventsCount=0):(i.newListener!==void 0&&(e.emit("newListener",n,t.listener?t.listener:t),i=e._events),o=i[n]),o===void 0)o=i[n]=t,++e._eventsCount;else if(typeof o=="function"?o=i[n]=r?[t,o]:[o,t]:r?o.unshift(t):o.push(t),a=Sl(e),a>0&&o.length>a&&!o.warned){o.warned=!0;var s=new Error("Possible EventEmitter memory leak detected. "+o.length+" "+String(n)+" listeners added. Use emitter.setMaxListeners() to increase limit");s.name="MaxListenersExceededWarning",s.emitter=e,s.type=n,s.count=o.length,lg(s)}return e}fe.prototype.addListener=function(n,t){return _l(this,n,t,!1)};fe.prototype.on=fe.prototype.addListener;fe.prototype.prependListener=function(n,t){return _l(this,n,t,!0)};function ug(){if(!this.fired)return this.target.removeListener(this.type,this.wrapFn),this.fired=!0,arguments.length===0?this.listener.call(this.target):this.listener.apply(this.target,arguments)}function Tl(e,n,t){var r={fired:!1,wrapFn:void 0,target:e,type:n,listener:t},a=ug.bind(r);return a.listener=t,r.wrapFn=a,a}fe.prototype.once=function(n,t){return la(t),this.on(n,Tl(this,n,t)),this};fe.prototype.prependOnceListener=function(n,t){return la(t),this.prependListener(n,Tl(this,n,t)),this};fe.prototype.removeListener=function(n,t){var r,a,i,o,s;if(la(t),a=this._events,a===void 0)return this;if(r=a[n],r===void 0)return this;if(r===t||r.listener===t)--this._eventsCount===0?this._events=Object.create(null):(delete a[n],a.removeListener&&this.emit("removeListener",n,r.listener||t));else if(typeof r!="function"){for(i=-1,o=r.length-1;o>=0;o--)if(r[o]===t||r[o].listener===t){s=r[o].listener,i=o;break}if(i<0)return this;i===0?r.shift():dg(r,i),r.length===1&&(a[n]=r[0]),a.removeListener!==void 0&&this.emit("removeListener",n,s||t)}return this};fe.prototype.off=fe.prototype.removeListener;fe.prototype.removeAllListeners=function(n){var t,r,a;if(r=this._events,r===void 0)return this;if(r.removeListener===void 0)return arguments.length===0?(this._events=Object.create(null),this._eventsCount=0):r[n]!==void 0&&(--this._eventsCount===0?this._events=Object.create(null):delete r[n]),this;if(arguments.length===0){var i=Object.keys(r),o;for(a=0;a<i.length;++a)o=i[a],o!=="removeListener"&&this.removeAllListeners(o);return this.removeAllListeners("removeListener"),this._events=Object.create(null),this._eventsCount=0,this}if(t=r[n],typeof t=="function")this.removeListener(n,t);else if(t!==void 0)for(a=t.length-1;a>=0;a--)this.removeListener(n,t[a]);return this};function El(e,n,t){var r=e._events;if(r===void 0)return[];var a=r[n];return a===void 0?[]:typeof a=="function"?t?[a.listener||a]:[a]:t?cg(a):Al(a,a.length)}fe.prototype.listeners=function(n){return El(this,n,!0)};fe.prototype.rawListeners=function(n){return El(this,n,!1)};fe.listenerCount=function(e,n){return typeof e.listenerCount=="function"?e.listenerCount(n):wl.call(e,n)};fe.prototype.listenerCount=wl;function wl(e){var n=this._events;if(n!==void 0){var t=n[e];if(typeof t=="function")return 1;if(t!==void 0)return t.length}return 0}fe.prototype.eventNames=function(){return this._eventsCount>0?sa(this._events):[]};function Al(e,n){for(var t=new Array(n),r=0;r<n;++r)t[r]=e[r];return t}function dg(e,n){for(;n+1<e.length;n++)e[n]=e[n+1];e.pop()}function cg(e){for(var n=new Array(e.length),t=0;t<n.length;++t)n[t]=e[t].listener||e[t];return n}function hg(e,n){return new Promise(function(t,r){function a(o){e.removeListener(n,i),r(o)}function i(){typeof e.removeListener=="function"&&e.removeListener("error",a),t([].slice.call(arguments))}Rl(e,n,i,{once:!0}),n!=="error"&&fg(e,a,{once:!0})})}function fg(e,n,t){typeof e.on=="function"&&Rl(e,"error",n,t)}function Rl(e,n,t,r){if(typeof e.on=="function")r.once?e.once(n,t):e.on(n,t);else if(typeof e.addEventListener=="function")e.addEventListener(n,function a(i){r.once&&e.removeEventListener(n,a),t(i)});else throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type '+typeof e)}});var on=Ie((o0,hu)=>{hu.exports=function(n){return n!==null&&typeof n=="object"&&typeof n.addUndirectedEdgeWithKey=="function"&&typeof n.dropNode=="function"&&typeof n.multi=="boolean"}});var ds=Ie(pi=>{function ib(e){return typeof e!="number"||isNaN(e)?1:e}function ob(e,n){var t={},r=function(o){return typeof o>"u"?n:o};typeof n=="function"&&(r=n);var a=function(o){return r(o[e])},i=function(){return r(void 0)};return typeof e=="string"?(t.fromAttributes=a,t.fromGraph=function(o,s){return a(o.getNodeAttributes(s))},t.fromEntry=function(o,s){return a(s)}):typeof e=="function"?(t.fromAttributes=function(){throw new Error("graphology-utils/getters/createNodeValueGetter: irrelevant usage.")},t.fromGraph=function(o,s){return r(e(s,o.getNodeAttributes(s)))},t.fromEntry=function(o,s){return r(e(o,s))}):(t.fromAttributes=i,t.fromGraph=i,t.fromEntry=i),t}function Lc(e,n){var t={},r=function(o){return typeof o>"u"?n:o};typeof n=="function"&&(r=n);var a=function(o){return r(o[e])},i=function(){return r(void 0)};return typeof e=="string"?(t.fromAttributes=a,t.fromGraph=function(o,s){return a(o.getEdgeAttributes(s))},t.fromEntry=function(o,s){return a(s)},t.fromPartialEntry=t.fromEntry,t.fromMinimalEntry=t.fromEntry):typeof e=="function"?(t.fromAttributes=function(){throw new Error("graphology-utils/getters/createEdgeValueGetter: irrelevant usage.")},t.fromGraph=function(o,s){var l=o.extremities(s);return r(e(s,o.getEdgeAttributes(s),l[0],l[1],o.getNodeAttributes(l[0]),o.getNodeAttributes(l[1]),o.isUndirected(s)))},t.fromEntry=function(o,s,l,u,d,c,h){return r(e(o,s,l,u,d,c,h))},t.fromPartialEntry=function(o,s,l,u){return r(e(o,s,l,u))},t.fromMinimalEntry=function(o,s){return r(e(o,s))}):(t.fromAttributes=i,t.fromGraph=i,t.fromEntry=i,t.fromMinimalEntry=i),t}pi.createNodeValueGetter=ob;pi.createEdgeValueGetter=Lc;pi.createEdgeWeightGetter=function(e){return Lc(e,ib)}});var Nc=Ie((TS,Mc)=>{var Re=0,xe=1,le=2,ue=3,Pt=4,It=5,ce=6,Pc=7,mi=8,Ic=9,sb=0,lb=1,ub=2,Le=0,nt=1,Ge=2,mn=3,Vt=4,Se=5,Be=6,mt=7,vt=8,Fc=3,ht=10,db=3,Ne=9,cs=10;Mc.exports=function(n,t,r){var a,i,o,s,l,u,d,c,h,g,p=t.length,m=r.length,b=n.adjustSizes,v=n.barnesHutTheta*n.barnesHutTheta,x,y,_,S,T,A,w,E=[];for(o=0;o<p;o+=ht)t[o+Pt]=t[o+le],t[o+It]=t[o+ue],t[o+le]=0,t[o+ue]=0;if(n.outboundAttractionDistribution){for(x=0,o=0;o<p;o+=ht)x+=t[o+ce];x/=p/ht}if(n.barnesHutOptimize){var R=1/0,L=-1/0,k=1/0,P=-1/0,D,I,G;for(o=0;o<p;o+=ht)R=Math.min(R,t[o+Re]),L=Math.max(L,t[o+Re]),k=Math.min(k,t[o+xe]),P=Math.max(P,t[o+xe]);var z=L-R,F=P-k;for(z>F?(k-=(z-F)/2,P=k+z):(R-=(F-z)/2,L=R+F),E[0+Le]=-1,E[0+nt]=(R+L)/2,E[0+Ge]=(k+P)/2,E[0+mn]=Math.max(L-R,P-k),E[0+Vt]=-1,E[0+Se]=-1,E[0+Be]=0,E[0+mt]=0,E[0+vt]=0,a=1,o=0;o<p;o+=ht)for(i=0,G=Fc;;)if(E[i+Se]>=0){t[o+Re]<E[i+nt]?t[o+xe]<E[i+Ge]?D=E[i+Se]:D=E[i+Se]+Ne:t[o+xe]<E[i+Ge]?D=E[i+Se]+Ne*2:D=E[i+Se]+Ne*3,E[i+mt]=(E[i+mt]*E[i+Be]+t[o+Re]*t[o+ce])/(E[i+Be]+t[o+ce]),E[i+vt]=(E[i+vt]*E[i+Be]+t[o+xe]*t[o+ce])/(E[i+Be]+t[o+ce]),E[i+Be]+=t[o+ce],i=D;continue}else if(E[i+Le]<0){E[i+Le]=o;break}else{if(E[i+Se]=a*Ne,c=E[i+mn]/2,h=E[i+Se],E[h+Le]=-1,E[h+nt]=E[i+nt]-c,E[h+Ge]=E[i+Ge]-c,E[h+mn]=c,E[h+Vt]=h+Ne,E[h+Se]=-1,E[h+Be]=0,E[h+mt]=0,E[h+vt]=0,h+=Ne,E[h+Le]=-1,E[h+nt]=E[i+nt]-c,E[h+Ge]=E[i+Ge]+c,E[h+mn]=c,E[h+Vt]=h+Ne,E[h+Se]=-1,E[h+Be]=0,E[h+mt]=0,E[h+vt]=0,h+=Ne,E[h+Le]=-1,E[h+nt]=E[i+nt]+c,E[h+Ge]=E[i+Ge]-c,E[h+mn]=c,E[h+Vt]=h+Ne,E[h+Se]=-1,E[h+Be]=0,E[h+mt]=0,E[h+vt]=0,h+=Ne,E[h+Le]=-1,E[h+nt]=E[i+nt]+c,E[h+Ge]=E[i+Ge]+c,E[h+mn]=c,E[h+Vt]=E[i+Vt],E[h+Se]=-1,E[h+Be]=0,E[h+mt]=0,E[h+vt]=0,a+=4,t[E[i+Le]+Re]<E[i+nt]?t[E[i+Le]+xe]<E[i+Ge]?D=E[i+Se]:D=E[i+Se]+Ne:t[E[i+Le]+xe]<E[i+Ge]?D=E[i+Se]+Ne*2:D=E[i+Se]+Ne*3,E[i+Be]=t[E[i+Le]+ce],E[i+mt]=t[E[i+Le]+Re],E[i+vt]=t[E[i+Le]+xe],E[D+Le]=E[i+Le],E[i+Le]=-1,t[o+Re]<E[i+nt]?t[o+xe]<E[i+Ge]?I=E[i+Se]:I=E[i+Se]+Ne:t[o+xe]<E[i+Ge]?I=E[i+Se]+Ne*2:I=E[i+Se]+Ne*3,D===I)if(G--){i=D;continue}else{G=Fc;break}E[I+Le]=o;break}}if(n.barnesHutOptimize)for(y=n.scalingRatio,o=0;o<p;o+=ht)for(i=0;;)if(E[i+Se]>=0)if(A=Math.pow(t[o+Re]-E[i+mt],2)+Math.pow(t[o+xe]-E[i+vt],2),g=E[i+mn],4*g*g/A<v){if(_=t[o+Re]-E[i+mt],S=t[o+xe]-E[i+vt],b===!0?A>0?(w=y*t[o+ce]*E[i+Be]/A,t[o+le]+=_*w,t[o+ue]+=S*w):A<0&&(w=-y*t[o+ce]*E[i+Be]/Math.sqrt(A),t[o+le]+=_*w,t[o+ue]+=S*w):A>0&&(w=y*t[o+ce]*E[i+Be]/A,t[o+le]+=_*w,t[o+ue]+=S*w),i=E[i+Vt],i<0)break;continue}else{i=E[i+Se];continue}else{if(u=E[i+Le],u>=0&&u!==o&&(_=t[o+Re]-t[u+Re],S=t[o+xe]-t[u+xe],A=_*_+S*S,b===!0?A>0?(w=y*t[o+ce]*t[u+ce]/A,t[o+le]+=_*w,t[o+ue]+=S*w):A<0&&(w=-y*t[o+ce]*t[u+ce]/Math.sqrt(A),t[o+le]+=_*w,t[o+ue]+=S*w):A>0&&(w=y*t[o+ce]*t[u+ce]/A,t[o+le]+=_*w,t[o+ue]+=S*w)),i=E[i+Vt],i<0)break;continue}else for(y=n.scalingRatio,s=0;s<p;s+=ht)for(l=0;l<s;l+=ht)_=t[s+Re]-t[l+Re],S=t[s+xe]-t[l+xe],b===!0?(A=Math.sqrt(_*_+S*S)-t[s+mi]-t[l+mi],A>0?(w=y*t[s+ce]*t[l+ce]/A/A,t[s+le]+=_*w,t[s+ue]+=S*w,t[l+le]-=_*w,t[l+ue]-=S*w):A<0&&(w=100*y*t[s+ce]*t[l+ce],t[s+le]+=_*w,t[s+ue]+=S*w,t[l+le]-=_*w,t[l+ue]-=S*w)):(A=Math.sqrt(_*_+S*S),A>0&&(w=y*t[s+ce]*t[l+ce]/A/A,t[s+le]+=_*w,t[s+ue]+=S*w,t[l+le]-=_*w,t[l+ue]-=S*w));for(h=n.gravity/n.scalingRatio,y=n.scalingRatio,o=0;o<p;o+=ht)w=0,_=t[o+Re],S=t[o+xe],A=Math.sqrt(Math.pow(_,2)+Math.pow(S,2)),n.strongGravityMode?A>0&&(w=y*t[o+ce]*h):A>0&&(w=y*t[o+ce]*h/A),t[o+le]-=_*w,t[o+ue]-=S*w;for(y=1*(n.outboundAttractionDistribution?x:1),d=0;d<m;d+=db)s=r[d+sb],l=r[d+lb],c=r[d+ub],T=Math.pow(c,n.edgeWeightInfluence),_=t[s+Re]-t[l+Re],S=t[s+xe]-t[l+xe],b===!0?(A=Math.sqrt(_*_+S*S)-t[s+mi]-t[l+mi],n.linLogMode?n.outboundAttractionDistribution?A>0&&(w=-y*T*Math.log(1+A)/A/t[s+ce]):A>0&&(w=-y*T*Math.log(1+A)/A):n.outboundAttractionDistribution?A>0&&(w=-y*T/t[s+ce]):A>0&&(w=-y*T)):(A=Math.sqrt(Math.pow(_,2)+Math.pow(S,2)),n.linLogMode?n.outboundAttractionDistribution?A>0&&(w=-y*T*Math.log(1+A)/A/t[s+ce]):A>0&&(w=-y*T*Math.log(1+A)/A):n.outboundAttractionDistribution?(A=1,w=-y*T/t[s+ce]):(A=1,w=-y*T)),A>0&&(t[s+le]+=_*w,t[s+ue]+=S*w,t[l+le]-=_*w,t[l+ue]-=S*w);var M,W,X,q,te,Q;if(b===!0)for(o=0;o<p;o+=ht)t[o+Ic]!==1&&(M=Math.sqrt(Math.pow(t[o+le],2)+Math.pow(t[o+ue],2)),M>cs&&(t[o+le]=t[o+le]*cs/M,t[o+ue]=t[o+ue]*cs/M),W=t[o+ce]*Math.sqrt((t[o+Pt]-t[o+le])*(t[o+Pt]-t[o+le])+(t[o+It]-t[o+ue])*(t[o+It]-t[o+ue])),X=Math.sqrt((t[o+Pt]+t[o+le])*(t[o+Pt]+t[o+le])+(t[o+It]+t[o+ue])*(t[o+It]+t[o+ue]))/2,q=.1*Math.log(1+X)/(1+Math.sqrt(W)),te=t[o+Re]+t[o+le]*(q/n.slowDown),t[o+Re]=te,Q=t[o+xe]+t[o+ue]*(q/n.slowDown),t[o+xe]=Q);else for(o=0;o<p;o+=ht)t[o+Ic]!==1&&(W=t[o+ce]*Math.sqrt((t[o+Pt]-t[o+le])*(t[o+Pt]-t[o+le])+(t[o+It]-t[o+ue])*(t[o+It]-t[o+ue])),X=Math.sqrt((t[o+Pt]+t[o+le])*(t[o+Pt]+t[o+le])+(t[o+It]+t[o+ue])*(t[o+It]+t[o+ue]))/2,q=t[o+Pc]*Math.log(1+X)/(1+Math.sqrt(W)),t[o+Pc]=Math.min(1,Math.sqrt(q*(Math.pow(t[o+le],2)+Math.pow(t[o+ue],2))/(1+Math.sqrt(W)))),te=t[o+Re]+t[o+le]*(q/n.slowDown),t[o+Re]=te,Q=t[o+xe]+t[o+ue]*(q/n.slowDown),t[o+xe]=Q);return{}}});var Gc=Ie(Xt=>{var Or=10,zc=3;Xt.assign=function(e){e=e||{};var n=Array.prototype.slice.call(arguments).slice(1),t,r,a;for(t=0,a=n.length;t<a;t++)if(n[t])for(r in n[t])e[r]=n[t][r];return e};Xt.validateSettings=function(e){return"linLogMode"in e&&typeof e.linLogMode!="boolean"?{message:"the `linLogMode` setting should be a boolean."}:"outboundAttractionDistribution"in e&&typeof e.outboundAttractionDistribution!="boolean"?{message:"the `outboundAttractionDistribution` setting should be a boolean."}:"adjustSizes"in e&&typeof e.adjustSizes!="boolean"?{message:"the `adjustSizes` setting should be a boolean."}:"edgeWeightInfluence"in e&&typeof e.edgeWeightInfluence!="number"?{message:"the `edgeWeightInfluence` setting should be a number."}:"scalingRatio"in e&&!(typeof e.scalingRatio=="number"&&e.scalingRatio>=0)?{message:"the `scalingRatio` setting should be a number >= 0."}:"strongGravityMode"in e&&typeof e.strongGravityMode!="boolean"?{message:"the `strongGravityMode` setting should be a boolean."}:"gravity"in e&&!(typeof e.gravity=="number"&&e.gravity>=0)?{message:"the `gravity` setting should be a number >= 0."}:"slowDown"in e&&!(typeof e.slowDown=="number"||e.slowDown>=0)?{message:"the `slowDown` setting should be a number >= 0."}:"barnesHutOptimize"in e&&typeof e.barnesHutOptimize!="boolean"?{message:"the `barnesHutOptimize` setting should be a boolean."}:"barnesHutTheta"in e&&!(typeof e.barnesHutTheta=="number"&&e.barnesHutTheta>=0)?{message:"the `barnesHutTheta` setting should be a number >= 0."}:null};Xt.graphToByteArrays=function(e,n){var t=e.order,r=e.size,a={},i,o=new Float32Array(t*Or),s=new Float32Array(r*zc);return i=0,e.forEachNode(function(l,u){a[l]=i,o[i]=u.x,o[i+1]=u.y,o[i+2]=0,o[i+3]=0,o[i+4]=0,o[i+5]=0,o[i+6]=1,o[i+7]=1,o[i+8]=u.size||1,o[i+9]=u.fixed?1:0,i+=Or}),i=0,e.forEachEdge(function(l,u,d,c,h,g,p){var m=a[d],b=a[c],v=n(l,u,d,c,h,g,p);o[m+6]+=v,o[b+6]+=v,s[i]=m,s[i+1]=b,s[i+2]=v,i+=zc}),{nodes:o,edges:s}};Xt.assignLayoutChanges=function(e,n,t){var r=0;e.updateEachNodeAttributes(function(a,i){return i.x=n[r],i.y=n[r+1],r+=Or,t?t(a,i):i})};Xt.readGraphPositions=function(e,n){var t=0;e.forEachNode(function(r,a){n[t]=a.x,n[t+1]=a.y,t+=Or})};Xt.collectLayoutChanges=function(e,n,t){for(var r=e.nodes(),a={},i=0,o=0,s=n.length;i<s;i+=Or){if(t){var l=Object.assign({},e.getNodeAttributes(r[o]));l.x=n[i],l.y=n[i+1],l=t(r[o],l),a[r[o]]={x:l.x,y:l.y}}else a[r[o]]={x:n[i],y:n[i+1]};o++}return a};Xt.createWorker=function(n){var t=window.URL||window.webkitURL,r=n.toString(),a=t.createObjectURL(new Blob(["("+r+").call(this);"],{type:"text/javascript"})),i=new Worker(a);return t.revokeObjectURL(a),i}});var Bc=Ie((wS,Oc)=>{Oc.exports={linLogMode:!1,outboundAttractionDistribution:!1,adjustSizes:!1,edgeWeightInfluence:1,scalingRatio:1,strongGravityMode:!1,gravity:1,slowDown:1,barnesHutOptimize:!1,barnesHutTheta:.5}});var fs=Ie((AS,Uc)=>{var cb=on(),hb=ds().createEdgeWeightGetter,fb=Nc(),Br=Gc(),gb=Bc();function Wc(e,n,t){if(!cb(n))throw new Error("graphology-layout-forceatlas2: the given graph is not a valid graphology instance.");typeof t=="number"&&(t={iterations:t});var r=t.iterations;if(typeof r!="number")throw new Error("graphology-layout-forceatlas2: invalid number of iterations.");if(r<=0)throw new Error("graphology-layout-forceatlas2: you should provide a positive number of iterations.");var a=hb("getEdgeWeight"in t?t.getEdgeWeight:"weight").fromEntry,i=typeof t.outputReducer=="function"?t.outputReducer:null,o=Br.assign({},gb,t.settings),s=Br.validateSettings(o);if(s)throw new Error("graphology-layout-forceatlas2: "+s.message);var l=Br.graphToByteArrays(n,a),u;for(u=0;u<r;u++)fb(o,l.nodes,l.edges);if(e){Br.assignLayoutChanges(n,l.nodes,i);return}return Br.collectLayoutChanges(n,l.nodes)}function pb(e){var n=typeof e=="number"?e:e.order;return{barnesHutOptimize:n>2e3,strongGravityMode:!0,gravity:.05,scalingRatio:10,slowDown:1+Math.log(n)}}var hs=Wc.bind(null,!1);hs.assign=Wc.bind(null,!0);hs.inferSettings=pb;Uc.exports=hs});var gs=Ie((RS,Hc)=>{function mb(e){return!e||typeof e!="object"||typeof e=="function"||Array.isArray(e)||e instanceof Set||e instanceof Map||e instanceof RegExp||e instanceof Date}function $c(e,n){e=e||{};var t={};for(var r in n){var a=e[r],i=n[r];if(!mb(i)){t[r]=$c(a,i);continue}a===void 0?t[r]=i:t[r]=a}return t}Hc.exports=$c});var qc=Ie((DS,jc)=>{var vb=on();jc.exports=function(n){if(!vb(n))throw new Error("graphology-utils/infer-type: expecting a valid graphology instance.");var t=n.type;return t!=="mixed"?t:n.directedSize===0&&n.undirectedSize===0||n.directedSize>0&&n.undirectedSize>0?"mixed":n.directedSize>0?"directed":"undirected"}});var ps=Ie((kS,Vc)=>{function yt(e){if(typeof e!="function")throw new Error("obliterator/iterator: expecting a function!");this.next=e}typeof Symbol<"u"&&(yt.prototype[Symbol.iterator]=function(){return this});yt.of=function(){var e=arguments,n=e.length,t=0;return new yt(function(){return t>=n?{done:!0}:{done:!1,value:e[t++]}})};yt.empty=function(){var e=new yt(function(){return{done:!0}});return e};yt.fromSequence=function(e){var n=0,t=e.length;return new yt(function(){return n>=t?{done:!0}:{done:!1,value:e[n++]}})};yt.is=function(e){return e instanceof yt?!0:typeof e=="object"&&e!==null&&typeof e.next=="function"};Vc.exports=yt});var vi=Ie(bt=>{var yb=Math.pow(2,8)-1,bb=Math.pow(2,16)-1,xb=Math.pow(2,32)-1,Sb=Math.pow(2,7)-1,_b=Math.pow(2,15)-1,Tb=Math.pow(2,31)-1;bt.getPointerArray=function(e){var n=e-1;if(n<=yb)return Uint8Array;if(n<=bb)return Uint16Array;if(n<=xb)return Uint32Array;throw new Error("mnemonist: Pointer Array of size > 4294967295 is not supported.")};bt.getSignedPointerArray=function(e){var n=e-1;return n<=Sb?Int8Array:n<=_b?Int16Array:n<=Tb?Int32Array:Float64Array};bt.getNumberType=function(e){return e===(e|0)?Math.sign(e)===-1?e<=127&&e>=-128?Int8Array:e<=32767&&e>=-32768?Int16Array:Int32Array:e<=255?Uint8Array:e<=65535?Uint16Array:Uint32Array:Float64Array};var Eb={Uint8Array:1,Int8Array:2,Uint16Array:3,Int16Array:4,Uint32Array:5,Int32Array:6,Float32Array:7,Float64Array:8};bt.getMinimalRepresentation=function(e,n){var t=null,r=0,a,i,o,s,l;for(s=0,l=e.length;s<l;s++)o=n?n(e[s]):e[s],i=bt.getNumberType(o),a=Eb[i.name],a>r&&(r=a,t=i);return t};bt.isTypedArray=function(e){return typeof ArrayBuffer<"u"&&ArrayBuffer.isView(e)};bt.concat=function(){var e=0,n,t,r;for(n=0,r=arguments.length;n<r;n++)e+=arguments[n].length;var a=new arguments[0].constructor(e);for(n=0,t=0;n<r;n++)a.set(arguments[n],t),t+=arguments[n].length;return a};bt.indices=function(e){for(var n=bt.getPointerArray(e),t=new n(e),r=0;r<e;r++)t[r]=r;return t}});var Yc=Ie((LS,Xc)=>{var ms=ps(),wb=vi().getPointerArray;function ze(e,n){arguments.length<2&&(n=e,e=Array);var t=wb(n);this.size=0,this.length=n,this.dense=new t(n),this.sparse=new t(n),this.vals=new e(n)}ze.prototype.clear=function(){this.size=0};ze.prototype.has=function(e){var n=this.sparse[e];return n<this.size&&this.dense[n]===e};ze.prototype.get=function(e){var n=this.sparse[e];if(n<this.size&&this.dense[n]===e)return this.vals[n]};ze.prototype.set=function(e,n){var t=this.sparse[e];return t<this.size&&this.dense[t]===e?(this.vals[t]=n,this):(this.dense[this.size]=e,this.sparse[e]=this.size,this.vals[this.size]=n,this.size++,this)};ze.prototype.delete=function(e){var n=this.sparse[e];return n>=this.size||this.dense[n]!==e?!1:(n=this.dense[this.size-1],this.dense[this.sparse[e]]=n,this.sparse[n]=this.sparse[e],this.size--,!0)};ze.prototype.forEach=function(e,n){n=arguments.length>1?n:this;for(var t=0;t<this.size;t++)e.call(n,this.vals[t],this.dense[t])};ze.prototype.keys=function(){var e=this.size,n=this.dense,t=0;return new ms(function(){if(t<e){var r=n[t];return t++,{value:r}}return{done:!0}})};ze.prototype.values=function(){var e=this.size,n=this.vals,t=0;return new ms(function(){if(t<e){var r=n[t];return t++,{value:r}}return{done:!0}})};ze.prototype.entries=function(){var e=this.size,n=this.dense,t=this.vals,r=0;return new ms(function(){if(r<e){var a=[n[r],t[r]];return r++,{value:a}}return{done:!0}})};typeof Symbol<"u"&&(ze.prototype[Symbol.iterator]=ze.prototype.entries);ze.prototype.inspect=function(){for(var e=new Map,n=0;n<this.size;n++)e.set(this.dense[n],this.vals[n]);return Object.defineProperty(e,"constructor",{value:ze,enumerable:!1}),e.length=this.length,this.vals.constructor!==Array&&(e.type=this.vals.constructor.name),e};typeof Symbol<"u"&&(ze.prototype[Symbol.for("nodejs.util.inspect.custom")]=ze.prototype.inspect);Xc.exports=ze});var Zc=Ie((PS,Kc)=>{var Ab=ps(),Rb=vi().getPointerArray;function Xe(e){var n=Rb(e);this.start=0,this.size=0,this.capacity=e,this.dense=new n(e),this.sparse=new n(e)}Xe.prototype.clear=function(){this.start=0,this.size=0};Xe.prototype.has=function(e){if(this.size===0)return!1;var n=this.sparse[e],t=n<this.capacity&&n>=this.start&&n<this.start+this.size||n<(this.start+this.size)%this.capacity;return t&&this.dense[n]===e};Xe.prototype.enqueue=function(e){var n=this.sparse[e];if(this.size!==0){var t=n<this.capacity&&n>=this.start&&n<this.start+this.size||n<(this.start+this.size)%this.capacity;if(t&&this.dense[n]===e)return this}return n=(this.start+this.size)%this.capacity,this.dense[n]=e,this.sparse[e]=n,this.size++,this};Xe.prototype.dequeue=function(){if(this.size!==0){var e=this.start;this.size--,this.start++,this.start===this.capacity&&(this.start=0);var n=this.dense[e];return this.sparse[n]=this.capacity,n}};Xe.prototype.forEach=function(e,n){n=arguments.length>1?n:this;for(var t=this.capacity,r=this.size,a=this.start,i=0;i<r;)e.call(n,this.dense[a],i,this),a++,i++,a===t&&(a=0)};Xe.prototype.values=function(){var e=this.dense,n=this.capacity,t=this.size,r=this.start,a=0;return new Ab(function(){if(a>=t)return{done:!0};var i=e[r];return r++,a++,r===n&&(r=0),{value:i,done:!1}})};typeof Symbol<"u"&&(Xe.prototype[Symbol.iterator]=Xe.prototype.values);Xe.prototype.inspect=function(){var e=[];return this.forEach(function(n){e.push(n)}),Object.defineProperty(e,"constructor",{value:Xe,enumerable:!1}),e.capacity=this.capacity,e};typeof Symbol<"u"&&(Xe.prototype[Symbol.for("nodejs.util.inspect.custom")]=Xe.prototype.inspect);Kc.exports=Xe});var th=Ie((IS,eh)=>{function Qc(e){return function(n){return typeof n!="number"&&(n=n.length),Math.floor(e()*n)}}var Jc=Qc(Math.random);Jc.createRandomIndex=Qc;eh.exports=Jc});var oh=Ie(vs=>{var Yt=vi(),nh=gs(),rh=ds().createEdgeWeightGetter,ah=Symbol.for("nodejs.util.inspect.custom"),ih={getEdgeWeight:"weight",keepDendrogram:!1,resolution:1};function _e(e,n){n=nh(n,ih);var t=n.resolution,r=rh(n.getEdgeWeight).fromEntry,a=(e.size-e.selfLoopCount)*2,i=Yt.getPointerArray(a),o=Yt.getPointerArray(e.order+1),s=n.getEdgeWeight?Float64Array:Yt.getPointerArray(e.size*2);this.C=e.order,this.M=0,this.E=a,this.U=0,this.resolution=t,this.level=0,this.graph=e,this.nodes=new Array(e.order),this.keepDendrogram=n.keepDendrogram,this.neighborhood=new o(a),this.weights=new s(a),this.loops=new s(e.order),this.starts=new i(e.order+1),this.belongings=new o(e.order),this.dendrogram=[],this.mapping=null,this.counts=new o(e.order),this.unused=new o(e.order),this.totalWeights=new s(e.order);var l={},u,d=0,c=0,h=this;e.forEachNode(function(g){h.nodes[d]=g,l[g]=d,c+=e.undirectedDegreeWithoutSelfLoops(g),h.starts[d]=c,h.belongings[d]=d,h.counts[d]=1,d++}),e.forEachEdge(function(g,p,m,b,v,x,y){if(u=r(g,p,m,b,v,x,y),m=l[m],b=l[b],h.M+=u,m===b)h.totalWeights[m]+=u*2,h.loops[m]=u*2;else{h.totalWeights[m]+=u,h.totalWeights[b]+=u;var _=--h.starts[m],S=--h.starts[b];h.neighborhood[_]=b,h.neighborhood[S]=m,h.weights[_]=u,h.weights[S]=u}}),this.starts[d]=this.E,this.keepDendrogram?this.dendrogram.push(this.belongings.slice()):this.mapping=this.belongings.slice()}_e.prototype.isolate=function(e,n){var t=this.belongings[e];if(this.counts[t]===1)return t;var r=this.unused[--this.U],a=this.loops[e];return this.totalWeights[t]-=n+a,this.totalWeights[r]+=n+a,this.belongings[e]=r,this.counts[t]--,this.counts[r]++,r};_e.prototype.move=function(e,n,t){var r=this.belongings[e],a=this.loops[e];this.totalWeights[r]-=n+a,this.totalWeights[t]+=n+a,this.belongings[e]=t;var i=this.counts[r]--===1;this.counts[t]++,i&&(this.unused[this.U++]=r)};_e.prototype.computeNodeDegree=function(e){var n,t,r,a=0;for(n=this.starts[e],t=this.starts[e+1];n<t;n++)r=this.weights[n],a+=r;return a};_e.prototype.expensiveIsolate=function(e){var n=this.computeNodeDegree(e);return this.isolate(e,n)};_e.prototype.expensiveMove=function(e,n){var t=this.computeNodeDegree(e);this.move(e,t,n)};_e.prototype.zoomOut=function(){var e=new Array(this.C-this.U),n={},t=this.nodes.length,r=0,a=0,i,o,s,l,u,d,c,h,g;for(i=0,s=this.C;i<s;i++)d=this.belongings[i],d in n||(n[d]=r,e[r]={adj:{},totalWeights:this.totalWeights[d],internalWeights:0},r++),this.belongings[i]=n[d];var p,m;if(this.keepDendrogram){for(p=this.dendrogram[this.level],m=new(Yt.getPointerArray(r))(t),i=0;i<t;i++)m[i]=this.belongings[p[i]];this.dendrogram.push(m)}else for(i=0;i<t;i++)this.mapping[i]=this.belongings[this.mapping[i]];for(i=0,s=this.C;i<s;i++)for(d=this.belongings[i],h=e[d],g=h.adj,h.internalWeights+=this.loops[i],o=this.starts[i],l=this.starts[i+1];o<l;o++){if(u=this.neighborhood[o],c=this.belongings[u],d===c){h.internalWeights+=this.weights[o];continue}c in g||(g[c]=0),g[c]+=this.weights[o]}for(this.C=r,u=0,d=0;d<r;d++){h=e[d],g=h.adj,d=+d,this.totalWeights[d]=h.totalWeights,this.loops[d]=h.internalWeights,this.counts[d]=1,this.starts[d]=u,this.belongings[d]=d;for(c in g)this.neighborhood[u]=+c,this.weights[u]=g[c],a++,u++}return this.starts[r]=a,this.E=a,this.U=0,this.level++,n};_e.prototype.modularity=function(){var e,n,t,r,a,i=0,o=this.M*2,s=new Float64Array(this.C);for(t=0;t<this.C;t++)for(e=this.belongings[t],s[e]+=this.loops[t],r=this.starts[t],a=this.starts[t+1];r<a;r++)n=this.belongings[this.neighborhood[r]],e===n&&(s[e]+=this.weights[r]);for(t=0;t<this.C;t++)i+=s[t]/o-Math.pow(this.totalWeights[t]/o,2)*this.resolution;return i};_e.prototype.delta=function(e,n,t,r){var a=this.M,i=this.totalWeights[r];return n+=this.loops[e],t/a-i*n*this.resolution/(2*a*a)};_e.prototype.deltaWithOwnCommunity=function(e,n,t,r){var a=this.M,i=this.totalWeights[r];return n+=this.loops[e],t/a-(i-n)*n*this.resolution/(2*a*a)};_e.prototype.fastDelta=function(e,n,t,r){var a=this.M,i=this.totalWeights[r];return n+=this.loops[e],t-n*i*this.resolution/(2*a)};_e.prototype.fastDeltaWithOwnCommunity=function(e,n,t,r){var a=this.M,i=this.totalWeights[r];return n+=this.loops[e],t-n*(i-n)*this.resolution/(2*a)};_e.prototype.bounds=function(e){return[this.starts[e],this.starts[e+1]]};_e.prototype.project=function(){var e=this,n={};return e.nodes.slice(0,this.C).forEach(function(t,r){n[t]=Array.from(e.neighborhood.slice(e.starts[r],e.starts[r+1])).map(function(a){return e.nodes[a]})}),n};_e.prototype.collect=function(e){arguments.length<1&&(e=this.level);var n={},t=this.keepDendrogram?this.dendrogram[e]:this.mapping,r,a;for(r=0,a=t.length;r<a;r++)n[this.nodes[r]]=t[r];return n};_e.prototype.assign=function(e,n){arguments.length<2&&(n=this.level);var t=this.keepDendrogram?this.dendrogram[n]:this.mapping,r,a;for(r=0,a=t.length;r<a;r++)this.graph.setNodeAttribute(this.nodes[r],e,t[r])};_e.prototype[ah]=function(){var e={};Object.defineProperty(e,"constructor",{value:_e,enumerable:!1}),e.C=this.C,e.M=this.M,e.E=this.E,e.U=this.U,e.resolution=this.resolution,e.level=this.level,e.nodes=this.nodes,e.starts=this.starts.slice(0,e.C+1);var n=["neighborhood","weights"],t=["counts","loops","belongings","totalWeights"],r=this;return n.forEach(function(a){e[a]=r[a].slice(0,e.E)}),t.forEach(function(a){e[a]=r[a].slice(0,e.C)}),e.unused=this.unused.slice(0,this.U),this.keepDendrogram?e.dendrogram=this.dendrogram:e.mapping=this.mapping,e};function De(e,n){n=nh(n,ih);var t=n.resolution,r=rh(n.getEdgeWeight).fromEntry,a=(e.size-e.selfLoopCount)*2,i=Yt.getPointerArray(a),o=Yt.getPointerArray(e.order+1),s=n.getEdgeWeight?Float64Array:Yt.getPointerArray(e.size*2);this.C=e.order,this.M=0,this.E=a,this.U=0,this.resolution=t,this.level=0,this.graph=e,this.nodes=new Array(e.order),this.keepDendrogram=n.keepDendrogram,this.neighborhood=new o(a),this.weights=new s(a),this.loops=new s(e.order),this.starts=new i(e.order+1),this.offsets=new i(e.order),this.belongings=new o(e.order),this.dendrogram=[],this.counts=new o(e.order),this.unused=new o(e.order),this.totalInWeights=new s(e.order),this.totalOutWeights=new s(e.order);var l={},u,d=0,c=0,h=this;e.forEachNode(function(g){h.nodes[d]=g,l[g]=d,c+=e.outDegreeWithoutSelfLoops(g),h.starts[d]=c,c+=e.inDegreeWithoutSelfLoops(g),h.offsets[d]=c,h.belongings[d]=d,h.counts[d]=1,d++}),e.forEachEdge(function(g,p,m,b,v,x,y){if(u=r(g,p,m,b,v,x,y),m=l[m],b=l[b],h.M+=u,m===b)h.loops[m]+=u,h.totalInWeights[m]+=u,h.totalOutWeights[m]+=u;else{h.totalOutWeights[m]+=u,h.totalInWeights[b]+=u;var _=--h.starts[m],S=--h.offsets[b];h.neighborhood[_]=b,h.neighborhood[S]=m,h.weights[_]=u,h.weights[S]=u}}),this.starts[d]=this.E,this.keepDendrogram?this.dendrogram.push(this.belongings.slice()):this.mapping=this.belongings.slice()}De.prototype.bounds=_e.prototype.bounds;De.prototype.inBounds=function(e){return[this.offsets[e],this.starts[e+1]]};De.prototype.outBounds=function(e){return[this.starts[e],this.offsets[e]]};De.prototype.project=_e.prototype.project;De.prototype.projectIn=function(){var e=this,n={};return e.nodes.slice(0,this.C).forEach(function(t,r){n[t]=Array.from(e.neighborhood.slice(e.offsets[r],e.starts[r+1])).map(function(a){return e.nodes[a]})}),n};De.prototype.projectOut=function(){var e=this,n={};return e.nodes.slice(0,this.C).forEach(function(t,r){n[t]=Array.from(e.neighborhood.slice(e.starts[r],e.offsets[r])).map(function(a){return e.nodes[a]})}),n};De.prototype.isolate=function(e,n,t){var r=this.belongings[e];if(this.counts[r]===1)return r;var a=this.unused[--this.U],i=this.loops[e];return this.totalInWeights[r]-=n+i,this.totalInWeights[a]+=n+i,this.totalOutWeights[r]-=t+i,this.totalOutWeights[a]+=t+i,this.belongings[e]=a,this.counts[r]--,this.counts[a]++,a};De.prototype.move=function(e,n,t,r){var a=this.belongings[e],i=this.loops[e];this.totalInWeights[a]-=n+i,this.totalInWeights[r]+=n+i,this.totalOutWeights[a]-=t+i,this.totalOutWeights[r]+=t+i,this.belongings[e]=r;var o=this.counts[a]--===1;this.counts[r]++,o&&(this.unused[this.U++]=a)};De.prototype.computeNodeInDegree=function(e){var n,t,r,a=0;for(n=this.offsets[e],t=this.starts[e+1];n<t;n++)r=this.weights[n],a+=r;return a};De.prototype.computeNodeOutDegree=function(e){var n,t,r,a=0;for(n=this.starts[e],t=this.offsets[e];n<t;n++)r=this.weights[n],a+=r;return a};De.prototype.expensiveMove=function(e,n){var t=this.computeNodeInDegree(e),r=this.computeNodeOutDegree(e);this.move(e,t,r,n)};De.prototype.zoomOut=function(){var e=new Array(this.C-this.U),n={},t=this.nodes.length,r=0,a=0,i,o,s,l,u,d,c,h,g,p,m,b,v;for(i=0,s=this.C;i<s;i++)d=this.belongings[i],d in n||(n[d]=r,e[r]={inAdj:{},outAdj:{},totalInWeights:this.totalInWeights[d],totalOutWeights:this.totalOutWeights[d],internalWeights:0},r++),this.belongings[i]=n[d];var x,y;if(this.keepDendrogram){for(x=this.dendrogram[this.level],y=new(Yt.getPointerArray(r))(t),i=0;i<t;i++)y[i]=this.belongings[x[i]];this.dendrogram.push(y)}else for(i=0;i<t;i++)this.mapping[i]=this.belongings[this.mapping[i]];for(i=0,s=this.C;i<s;i++)for(d=this.belongings[i],g=this.offsets[i],h=e[d],b=h.inAdj,v=h.outAdj,h.internalWeights+=this.loops[i],o=this.starts[i],l=this.starts[i+1];o<l;o++){if(u=this.neighborhood[o],c=this.belongings[u],p=o<g,m=p?v:b,d===c){p&&(h.internalWeights+=this.weights[o]);continue}c in m||(m[c]=0),m[c]+=this.weights[o]}for(this.C=r,u=0,d=0;d<r;d++){h=e[d],b=h.inAdj,v=h.outAdj,d=+d,this.totalInWeights[d]=h.totalInWeights,this.totalOutWeights[d]=h.totalOutWeights,this.loops[d]=h.internalWeights,this.counts[d]=1,this.starts[d]=u,this.belongings[d]=d;for(c in v)this.neighborhood[u]=+c,this.weights[u]=v[c],a++,u++;this.offsets[d]=u;for(c in b)this.neighborhood[u]=+c,this.weights[u]=b[c],a++,u++}return this.starts[r]=a,this.E=a,this.U=0,this.level++,n};De.prototype.modularity=function(){var e,n,t,r,a,i=0,o=this.M,s=new Float64Array(this.C);for(t=0;t<this.C;t++)for(e=this.belongings[t],s[e]+=this.loops[t],r=this.starts[t],a=this.offsets[t];r<a;r++)n=this.belongings[this.neighborhood[r]],e===n&&(s[e]+=this.weights[r]);for(t=0;t<this.C;t++)i+=s[t]/o-this.totalInWeights[t]*this.totalOutWeights[t]/Math.pow(o,2)*this.resolution;return i};De.prototype.delta=function(e,n,t,r,a){var i=this.M,o=this.totalInWeights[a],s=this.totalOutWeights[a],l=this.loops[e];return n+=l,t+=l,r/i-(t*o+n*s)*this.resolution/(i*i)};De.prototype.deltaWithOwnCommunity=function(e,n,t,r,a){var i=this.M,o=this.totalInWeights[a],s=this.totalOutWeights[a],l=this.loops[e];return n+=l,t+=l,r/i-(t*(o-n)+n*(s-t))*this.resolution/(i*i)};De.prototype.collect=_e.prototype.collect;De.prototype.assign=_e.prototype.assign;De.prototype[ah]=function(){var e={};Object.defineProperty(e,"constructor",{value:De,enumerable:!1}),e.C=this.C,e.M=this.M,e.E=this.E,e.U=this.U,e.resolution=this.resolution,e.level=this.level,e.nodes=this.nodes,e.starts=this.starts.slice(0,e.C+1);var n=["neighborhood","weights"],t=["counts","offsets","loops","belongings","totalInWeights","totalOutWeights"],r=this;return n.forEach(function(a){e[a]=r[a].slice(0,e.E)}),t.forEach(function(a){e[a]=r[a].slice(0,e.C)}),e.unused=this.unused.slice(0,this.U),this.keepDendrogram?e.dendrogram=this.dendrogram:e.mapping=this.mapping,e};vs.UndirectedLouvainIndex=_e;vs.DirectedLouvainIndex=De});var fh=Ie((MS,hh)=>{var Db=gs(),kb=on(),Cb=qc(),sh=Yc(),lh=Zc(),uh=th().createRandomIndex,dh=oh(),Lb=dh.UndirectedLouvainIndex,Pb=dh.DirectedLouvainIndex,ch={nodeCommunityAttribute:"community",getEdgeWeight:"weight",fastLocalMoves:!0,randomWalk:!0,resolution:1,rng:Math.random};function yi(e,n,t){var r=e.get(n);typeof r>"u"&&(r=0),r+=t,e.set(n,r)}var Ib=1e-10;function bi(e,n,t,r,a){return Math.abs(r-a)<Ib?e===n?!1:t>e:r>a}function Fb(e,n,t){var r=new Lb(n,{getEdgeWeight:t.getEdgeWeight,keepDendrogram:e,resolution:t.resolution}),a=uh(t.rng),i=!0,o=!0,s,l,u=new sh(Float64Array,r.C),d,c,h,g,p,m,b,v,x,y,_,S,T,A,w,E,R=0,L=0,k=[],P,D;for(t.fastLocalMoves&&(d=new lh(r.C));i;){if(y=r.C,i=!1,o=!0,t.fastLocalMoves){for(D=0,m=t.randomWalk?a(y):0,b=0;b<y;b++,m++)v=m%y,d.enqueue(v);for(;d.size!==0;){for(v=d.dequeue(),L++,_=0,u.clear(),s=r.belongings[v],c=r.starts[v],h=r.starts[v+1];c<h;c++)x=r.neighborhood[c],g=r.weights[c],l=r.belongings[x],_+=g,yi(u,l,g);for(A=r.fastDeltaWithOwnCommunity(v,_,u.get(s)||0,s),T=s,p=0;p<u.size;p++)l=u.dense[p],l!==s&&(S=u.vals[p],R++,E=r.fastDelta(v,_,S,l),w=bi(T,s,l,E,A),w&&(A=E,T=l));if(A<0){if(T=r.isolate(v,_),T===s)continue}else{if(T===s)continue;r.move(v,_,T)}for(i=!0,D++,c=r.starts[v],h=r.starts[v+1];c<h;c++)x=r.neighborhood[c],l=r.belongings[x],l!==T&&d.enqueue(x)}k.push(D)}else for(P=[],k.push(P);o;){for(o=!1,D=0,m=t.randomWalk?a(y):0,b=0;b<y;b++,m++){for(v=m%y,L++,_=0,u.clear(),s=r.belongings[v],c=r.starts[v],h=r.starts[v+1];c<h;c++)x=r.neighborhood[c],g=r.weights[c],l=r.belongings[x],_+=g,yi(u,l,g);for(A=r.fastDeltaWithOwnCommunity(v,_,u.get(s)||0,s),T=s,p=0;p<u.size;p++)l=u.dense[p],l!==s&&(S=u.vals[p],R++,E=r.fastDelta(v,_,S,l),w=bi(T,s,l,E,A),w&&(A=E,T=l));if(A<0){if(T=r.isolate(v,_),T===s)continue}else{if(T===s)continue;r.move(v,_,T)}o=!0,D++}P.push(D),i=o||i}i&&r.zoomOut()}var I={index:r,deltaComputations:R,nodesVisited:L,moves:k};return I}function Mb(e,n,t){var r=new Pb(n,{getEdgeWeight:t.getEdgeWeight,keepDendrogram:e,resolution:t.resolution}),a=uh(t.rng),i=!0,o=!0,s,l,u=new sh(Float64Array,r.C),d,c,h,g,p,m,b,v,x,y,_,S,T,A,w,E,R,L,k,P=0,D=0,I=[],G,z;for(t.fastLocalMoves&&(d=new lh(r.C));i;){if(S=r.C,i=!1,o=!0,t.fastLocalMoves){for(z=0,v=t.randomWalk?a(S):0,x=0;x<S;x++,v++)y=v%S,d.enqueue(y);for(;d.size!==0;){for(y=d.dequeue(),D++,T=0,A=0,u.clear(),s=r.belongings[y],c=r.starts[y],h=r.starts[y+1],g=r.offsets[y];c<h;c++)p=c<g,_=r.neighborhood[c],m=r.weights[c],l=r.belongings[_],p?A+=m:T+=m,yi(u,l,m);for(R=r.deltaWithOwnCommunity(y,T,A,u.get(s)||0,s),E=s,b=0;b<u.size;b++)l=u.dense[b],l!==s&&(w=u.vals[b],P++,k=r.delta(y,T,A,w,l),L=bi(E,s,l,k,R),L&&(R=k,E=l));if(R<0){if(E=r.isolate(y,T,A),E===s)continue}else{if(E===s)continue;r.move(y,T,A,E)}for(i=!0,z++,c=r.starts[y],h=r.starts[y+1];c<h;c++)_=r.neighborhood[c],l=r.belongings[_],l!==E&&d.enqueue(_)}I.push(z)}else for(G=[],I.push(G);o;){for(o=!1,z=0,v=t.randomWalk?a(S):0,x=0;x<S;x++,v++){for(y=v%S,D++,T=0,A=0,u.clear(),s=r.belongings[y],c=r.starts[y],h=r.starts[y+1],g=r.offsets[y];c<h;c++)p=c<g,_=r.neighborhood[c],m=r.weights[c],l=r.belongings[_],p?A+=m:T+=m,yi(u,l,m);for(R=r.deltaWithOwnCommunity(y,T,A,u.get(s)||0,s),E=s,b=0;b<u.size;b++)l=u.dense[b],l!==s&&(w=u.vals[b],P++,k=r.delta(y,T,A,w,l),L=bi(E,s,l,k,R),L&&(R=k,E=l));if(R<0){if(E=r.isolate(y,T,A),E===s)continue}else{if(E===s)continue;r.move(y,T,A,E)}o=!0,z++}G.push(z),i=o||i}i&&r.zoomOut()}var F={index:r,deltaComputations:P,nodesVisited:D,moves:I};return F}function ys(e,n,t,r){if(!kb(t))throw new Error("graphology-communities-louvain: the given graph is not a valid graphology instance.");var a=Cb(t);if(a==="mixed")throw new Error("graphology-communities-louvain: cannot run the algorithm on a true mixed graph.");r=Db(r,ch);var i=0;if(t.size===0){if(e){t.forEachNode(function(c){t.setNodeAttribute(c,r.nodeCommunityAttribute,i++)});return}var o={};return t.forEachNode(function(c){o[c]=i++}),n?{communities:o,count:t.order,deltaComputations:0,dendrogram:null,level:0,modularity:NaN,moves:null,nodesVisited:0,resolution:r.resolution}:o}var s=a==="undirected"?Fb:Mb,l=s(n,t,r),u=l.index;if(!n){if(e){u.assign(r.nodeCommunityAttribute);return}return u.collect()}var d={count:u.C,deltaComputations:l.deltaComputations,dendrogram:u.dendrogram,level:u.level,modularity:u.modularity(),moves:l.moves,nodesVisited:l.nodesVisited,resolution:r.resolution};return e?(u.assign(r.nodeCommunityAttribute),d):(d.communities=u.collect(),d)}var xi=ys.bind(null,!1,!1);xi.assign=ys.bind(null,!0,!1);xi.detailed=ys.bind(null,!1,!0);xi.defaults=ch;hh.exports=xi});var Ll=We(Gt(),1);function gg(){let e=arguments[0];for(let n=1,t=arguments.length;n<t;n++)if(arguments[n])for(let r in arguments[n])e[r]=arguments[n][r];return e}var ke=gg;typeof Object.assign=="function"&&(ke=Object.assign);function Je(e,n,t,r){let a=e._nodes.get(n),i=null;return a&&(r==="mixed"?i=a.out&&a.out[t]||a.undirected&&a.undirected[t]:r==="directed"?i=a.out&&a.out[t]:i=a.undirected&&a.undirected[t]),i}function Pe(e){return typeof e=="object"&&e!==null}function Pl(e){let n;for(n in e)return!1;return!0}function Qe(e,n,t){Object.defineProperty(e,n,{enumerable:!1,configurable:!1,writable:!0,value:t})}function st(e,n,t){let r={enumerable:!0,configurable:!0};typeof t=="function"?r.get=t:(r.value=t,r.writable=!1),Object.defineProperty(e,n,r)}function Dl(e){return!(!Pe(e)||e.attributes&&!Array.isArray(e.attributes))}function pg(){let e=Math.floor(Math.random()*256)&255;return()=>e++}function wt(){let e=arguments,n=null,t=-1;return{[Symbol.iterator](){return this},next(){let r=null;do{if(n===null){if(t++,t>=e.length)return{done:!0};n=e[t][Symbol.iterator]()}if(r=n.next(),r.done){n=null;continue}break}while(!0);return r}}}function Dn(){return{[Symbol.iterator](){return this},next(){return{done:!0}}}}var hr=class extends Error{constructor(n){super(),this.name="GraphError",this.message=n}},V=class e extends hr{constructor(n){super(n),this.name="InvalidArgumentsGraphError",typeof Error.captureStackTrace=="function"&&Error.captureStackTrace(this,e.prototype.constructor)}},j=class e extends hr{constructor(n){super(n),this.name="NotFoundGraphError",typeof Error.captureStackTrace=="function"&&Error.captureStackTrace(this,e.prototype.constructor)}},J=class e extends hr{constructor(n){super(n),this.name="UsageGraphError",typeof Error.captureStackTrace=="function"&&Error.captureStackTrace(this,e.prototype.constructor)}};function Il(e,n){this.key=e,this.attributes=n,this.clear()}Il.prototype.clear=function(){this.inDegree=0,this.outDegree=0,this.undirectedDegree=0,this.undirectedLoops=0,this.directedLoops=0,this.in={},this.out={},this.undirected={}};function Fl(e,n){this.key=e,this.attributes=n,this.clear()}Fl.prototype.clear=function(){this.inDegree=0,this.outDegree=0,this.directedLoops=0,this.in={},this.out={}};function Ml(e,n){this.key=e,this.attributes=n,this.clear()}Ml.prototype.clear=function(){this.undirectedDegree=0,this.undirectedLoops=0,this.undirected={}};function kn(e,n,t,r,a){this.key=n,this.attributes=a,this.undirected=e,this.source=t,this.target=r}kn.prototype.attach=function(){let e="out",n="in";this.undirected&&(e=n="undirected");let t=this.source.key,r=this.target.key;this.source[e][r]=this,!(this.undirected&&t===r)&&(this.target[n][t]=this)};kn.prototype.attachMulti=function(){let e="out",n="in",t=this.source.key,r=this.target.key;this.undirected&&(e=n="undirected");let a=this.source[e],i=a[r];if(typeof i>"u"){a[r]=this,this.undirected&&t===r||(this.target[n][t]=this);return}i.previous=this,this.next=i,a[r]=this,this.target[n][t]=this};kn.prototype.detach=function(){let e=this.source.key,n=this.target.key,t="out",r="in";this.undirected&&(t=r="undirected"),delete this.source[t][n],delete this.target[r][e]};kn.prototype.detachMulti=function(){let e=this.source.key,n=this.target.key,t="out",r="in";this.undirected&&(t=r="undirected"),this.previous===void 0?this.next===void 0?(delete this.source[t][n],delete this.target[r][e]):(this.next.previous=void 0,this.source[t][n]=this.next,this.target[r][e]=this.next):(this.previous.next=this.next,this.next!==void 0&&(this.next.previous=this.previous))};var Nl=0,zl=1,mg=2,Gl=3;function At(e,n,t,r,a,i,o){let s,l,u,d;if(r=""+r,t===Nl){if(s=e._nodes.get(r),!s)throw new j(`Graph.${n}: could not find the "${r}" node in the graph.`);u=a,d=i}else if(t===Gl){if(a=""+a,l=e._edges.get(a),!l)throw new j(`Graph.${n}: could not find the "${a}" edge in the graph.`);let c=l.source.key,h=l.target.key;if(r===c)s=l.target;else if(r===h)s=l.source;else throw new j(`Graph.${n}: the "${r}" node is not attached to the "${a}" edge (${c}, ${h}).`);u=i,d=o}else{if(l=e._edges.get(r),!l)throw new j(`Graph.${n}: could not find the "${r}" edge in the graph.`);t===zl?s=l.source:s=l.target,u=a,d=i}return[s,u,d]}function vg(e,n,t){e.prototype[n]=function(r,a,i){let[o,s]=At(this,n,t,r,a,i);return o.attributes[s]}}function yg(e,n,t){e.prototype[n]=function(r,a){let[i]=At(this,n,t,r,a);return i.attributes}}function bg(e,n,t){e.prototype[n]=function(r,a,i){let[o,s]=At(this,n,t,r,a,i);return o.attributes.hasOwnProperty(s)}}function xg(e,n,t){e.prototype[n]=function(r,a,i,o){let[s,l,u]=At(this,n,t,r,a,i,o);return s.attributes[l]=u,this.emit("nodeAttributesUpdated",{key:s.key,type:"set",attributes:s.attributes,name:l}),this}}function Sg(e,n,t){e.prototype[n]=function(r,a,i,o){let[s,l,u]=At(this,n,t,r,a,i,o);if(typeof u!="function")throw new V(`Graph.${n}: updater should be a function.`);let d=s.attributes,c=u(d[l]);return d[l]=c,this.emit("nodeAttributesUpdated",{key:s.key,type:"set",attributes:s.attributes,name:l}),this}}function _g(e,n,t){e.prototype[n]=function(r,a,i){let[o,s]=At(this,n,t,r,a,i);return delete o.attributes[s],this.emit("nodeAttributesUpdated",{key:o.key,type:"remove",attributes:o.attributes,name:s}),this}}function Tg(e,n,t){e.prototype[n]=function(r,a,i){let[o,s]=At(this,n,t,r,a,i);if(!Pe(s))throw new V(`Graph.${n}: provided attributes are not a plain object.`);return o.attributes=s,this.emit("nodeAttributesUpdated",{key:o.key,type:"replace",attributes:o.attributes}),this}}function Eg(e,n,t){e.prototype[n]=function(r,a,i){let[o,s]=At(this,n,t,r,a,i);if(!Pe(s))throw new V(`Graph.${n}: provided attributes are not a plain object.`);return ke(o.attributes,s),this.emit("nodeAttributesUpdated",{key:o.key,type:"merge",attributes:o.attributes,data:s}),this}}function wg(e,n,t){e.prototype[n]=function(r,a,i){let[o,s]=At(this,n,t,r,a,i);if(typeof s!="function")throw new V(`Graph.${n}: provided updater is not a function.`);return o.attributes=s(o.attributes),this.emit("nodeAttributesUpdated",{key:o.key,type:"update",attributes:o.attributes}),this}}var Ag=[{name:e=>`get${e}Attribute`,attacher:vg},{name:e=>`get${e}Attributes`,attacher:yg},{name:e=>`has${e}Attribute`,attacher:bg},{name:e=>`set${e}Attribute`,attacher:xg},{name:e=>`update${e}Attribute`,attacher:Sg},{name:e=>`remove${e}Attribute`,attacher:_g},{name:e=>`replace${e}Attributes`,attacher:Tg},{name:e=>`merge${e}Attributes`,attacher:Eg},{name:e=>`update${e}Attributes`,attacher:wg}];function Rg(e){Ag.forEach(function({name:n,attacher:t}){t(e,n("Node"),Nl),t(e,n("Source"),zl),t(e,n("Target"),mg),t(e,n("Opposite"),Gl)})}function Dg(e,n,t){e.prototype[n]=function(r,a){let i;if(this.type!=="mixed"&&t!=="mixed"&&t!==this.type)throw new J(`Graph.${n}: cannot find this type of edges in your ${this.type} graph.`);if(arguments.length>2){if(this.multi)throw new J(`Graph.${n}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`);let o=""+r,s=""+a;if(a=arguments[2],i=Je(this,o,s,t),!i)throw new j(`Graph.${n}: could not find an edge for the given path ("${o}" - "${s}").`)}else{if(t!=="mixed")throw new J(`Graph.${n}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`);if(r=""+r,i=this._edges.get(r),!i)throw new j(`Graph.${n}: could not find the "${r}" edge in the graph.`)}return i.attributes[a]}}function kg(e,n,t){e.prototype[n]=function(r){let a;if(this.type!=="mixed"&&t!=="mixed"&&t!==this.type)throw new J(`Graph.${n}: cannot find this type of edges in your ${this.type} graph.`);if(arguments.length>1){if(this.multi)throw new J(`Graph.${n}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`);let i=""+r,o=""+arguments[1];if(a=Je(this,i,o,t),!a)throw new j(`Graph.${n}: could not find an edge for the given path ("${i}" - "${o}").`)}else{if(t!=="mixed")throw new J(`Graph.${n}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`);if(r=""+r,a=this._edges.get(r),!a)throw new j(`Graph.${n}: could not find the "${r}" edge in the graph.`)}return a.attributes}}function Cg(e,n,t){e.prototype[n]=function(r,a){let i;if(this.type!=="mixed"&&t!=="mixed"&&t!==this.type)throw new J(`Graph.${n}: cannot find this type of edges in your ${this.type} graph.`);if(arguments.length>2){if(this.multi)throw new J(`Graph.${n}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`);let o=""+r,s=""+a;if(a=arguments[2],i=Je(this,o,s,t),!i)throw new j(`Graph.${n}: could not find an edge for the given path ("${o}" - "${s}").`)}else{if(t!=="mixed")throw new J(`Graph.${n}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`);if(r=""+r,i=this._edges.get(r),!i)throw new j(`Graph.${n}: could not find the "${r}" edge in the graph.`)}return i.attributes.hasOwnProperty(a)}}function Lg(e,n,t){e.prototype[n]=function(r,a,i){let o;if(this.type!=="mixed"&&t!=="mixed"&&t!==this.type)throw new J(`Graph.${n}: cannot find this type of edges in your ${this.type} graph.`);if(arguments.length>3){if(this.multi)throw new J(`Graph.${n}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`);let s=""+r,l=""+a;if(a=arguments[2],i=arguments[3],o=Je(this,s,l,t),!o)throw new j(`Graph.${n}: could not find an edge for the given path ("${s}" - "${l}").`)}else{if(t!=="mixed")throw new J(`Graph.${n}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`);if(r=""+r,o=this._edges.get(r),!o)throw new j(`Graph.${n}: could not find the "${r}" edge in the graph.`)}return o.attributes[a]=i,this.emit("edgeAttributesUpdated",{key:o.key,type:"set",attributes:o.attributes,name:a}),this}}function Pg(e,n,t){e.prototype[n]=function(r,a,i){let o;if(this.type!=="mixed"&&t!=="mixed"&&t!==this.type)throw new J(`Graph.${n}: cannot find this type of edges in your ${this.type} graph.`);if(arguments.length>3){if(this.multi)throw new J(`Graph.${n}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`);let s=""+r,l=""+a;if(a=arguments[2],i=arguments[3],o=Je(this,s,l,t),!o)throw new j(`Graph.${n}: could not find an edge for the given path ("${s}" - "${l}").`)}else{if(t!=="mixed")throw new J(`Graph.${n}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`);if(r=""+r,o=this._edges.get(r),!o)throw new j(`Graph.${n}: could not find the "${r}" edge in the graph.`)}if(typeof i!="function")throw new V(`Graph.${n}: updater should be a function.`);return o.attributes[a]=i(o.attributes[a]),this.emit("edgeAttributesUpdated",{key:o.key,type:"set",attributes:o.attributes,name:a}),this}}function Ig(e,n,t){e.prototype[n]=function(r,a){let i;if(this.type!=="mixed"&&t!=="mixed"&&t!==this.type)throw new J(`Graph.${n}: cannot find this type of edges in your ${this.type} graph.`);if(arguments.length>2){if(this.multi)throw new J(`Graph.${n}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`);let o=""+r,s=""+a;if(a=arguments[2],i=Je(this,o,s,t),!i)throw new j(`Graph.${n}: could not find an edge for the given path ("${o}" - "${s}").`)}else{if(t!=="mixed")throw new J(`Graph.${n}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`);if(r=""+r,i=this._edges.get(r),!i)throw new j(`Graph.${n}: could not find the "${r}" edge in the graph.`)}return delete i.attributes[a],this.emit("edgeAttributesUpdated",{key:i.key,type:"remove",attributes:i.attributes,name:a}),this}}function Fg(e,n,t){e.prototype[n]=function(r,a){let i;if(this.type!=="mixed"&&t!=="mixed"&&t!==this.type)throw new J(`Graph.${n}: cannot find this type of edges in your ${this.type} graph.`);if(arguments.length>2){if(this.multi)throw new J(`Graph.${n}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`);let o=""+r,s=""+a;if(a=arguments[2],i=Je(this,o,s,t),!i)throw new j(`Graph.${n}: could not find an edge for the given path ("${o}" - "${s}").`)}else{if(t!=="mixed")throw new J(`Graph.${n}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`);if(r=""+r,i=this._edges.get(r),!i)throw new j(`Graph.${n}: could not find the "${r}" edge in the graph.`)}if(!Pe(a))throw new V(`Graph.${n}: provided attributes are not a plain object.`);return i.attributes=a,this.emit("edgeAttributesUpdated",{key:i.key,type:"replace",attributes:i.attributes}),this}}function Mg(e,n,t){e.prototype[n]=function(r,a){let i;if(this.type!=="mixed"&&t!=="mixed"&&t!==this.type)throw new J(`Graph.${n}: cannot find this type of edges in your ${this.type} graph.`);if(arguments.length>2){if(this.multi)throw new J(`Graph.${n}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`);let o=""+r,s=""+a;if(a=arguments[2],i=Je(this,o,s,t),!i)throw new j(`Graph.${n}: could not find an edge for the given path ("${o}" - "${s}").`)}else{if(t!=="mixed")throw new J(`Graph.${n}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`);if(r=""+r,i=this._edges.get(r),!i)throw new j(`Graph.${n}: could not find the "${r}" edge in the graph.`)}if(!Pe(a))throw new V(`Graph.${n}: provided attributes are not a plain object.`);return ke(i.attributes,a),this.emit("edgeAttributesUpdated",{key:i.key,type:"merge",attributes:i.attributes,data:a}),this}}function Ng(e,n,t){e.prototype[n]=function(r,a){let i;if(this.type!=="mixed"&&t!=="mixed"&&t!==this.type)throw new J(`Graph.${n}: cannot find this type of edges in your ${this.type} graph.`);if(arguments.length>2){if(this.multi)throw new J(`Graph.${n}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`);let o=""+r,s=""+a;if(a=arguments[2],i=Je(this,o,s,t),!i)throw new j(`Graph.${n}: could not find an edge for the given path ("${o}" - "${s}").`)}else{if(t!=="mixed")throw new J(`Graph.${n}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`);if(r=""+r,i=this._edges.get(r),!i)throw new j(`Graph.${n}: could not find the "${r}" edge in the graph.`)}if(typeof a!="function")throw new V(`Graph.${n}: provided updater is not a function.`);return i.attributes=a(i.attributes),this.emit("edgeAttributesUpdated",{key:i.key,type:"update",attributes:i.attributes}),this}}var zg=[{name:e=>`get${e}Attribute`,attacher:Dg},{name:e=>`get${e}Attributes`,attacher:kg},{name:e=>`has${e}Attribute`,attacher:Cg},{name:e=>`set${e}Attribute`,attacher:Lg},{name:e=>`update${e}Attribute`,attacher:Pg},{name:e=>`remove${e}Attribute`,attacher:Ig},{name:e=>`replace${e}Attributes`,attacher:Fg},{name:e=>`merge${e}Attributes`,attacher:Mg},{name:e=>`update${e}Attributes`,attacher:Ng}];function Gg(e){zg.forEach(function({name:n,attacher:t}){t(e,n("Edge"),"mixed"),t(e,n("DirectedEdge"),"directed"),t(e,n("UndirectedEdge"),"undirected")})}var Og=[{name:"edges",type:"mixed"},{name:"inEdges",type:"directed",direction:"in"},{name:"outEdges",type:"directed",direction:"out"},{name:"inboundEdges",type:"mixed",direction:"in"},{name:"outboundEdges",type:"mixed",direction:"out"},{name:"directedEdges",type:"directed"},{name:"undirectedEdges",type:"undirected"}];function Bg(e,n,t,r){let a=!1;for(let i in n){if(i===r)continue;let o=n[i];if(a=t(o.key,o.attributes,o.source.key,o.target.key,o.source.attributes,o.target.attributes,o.undirected),e&&a)return o.key}}function Wg(e,n,t,r){let a,i,o,s=!1;for(let l in n)if(l!==r){a=n[l];do{if(i=a.source,o=a.target,s=t(a.key,a.attributes,i.key,o.key,i.attributes,o.attributes,a.undirected),e&&s)return a.key;a=a.next}while(a!==void 0)}}function to(e,n){let t=Object.keys(e),r=t.length,a,i=0;return{[Symbol.iterator](){return this},next(){do if(a)a=a.next;else{if(i>=r)return{done:!0};let o=t[i++];if(o===n){a=void 0;continue}a=e[o]}while(!a);return{done:!1,value:{edge:a.key,attributes:a.attributes,source:a.source.key,target:a.target.key,sourceAttributes:a.source.attributes,targetAttributes:a.target.attributes,undirected:a.undirected}}}}}function Ug(e,n,t,r){let a=n[t];if(!a)return;let i=a.source,o=a.target;if(r(a.key,a.attributes,i.key,o.key,i.attributes,o.attributes,a.undirected)&&e)return a.key}function $g(e,n,t,r){let a=n[t];if(!a)return;let i=!1;do{if(i=r(a.key,a.attributes,a.source.key,a.target.key,a.source.attributes,a.target.attributes,a.undirected),e&&i)return a.key;a=a.next}while(a!==void 0)}function no(e,n){let t=e[n];if(t.next!==void 0)return{[Symbol.iterator](){return this},next(){if(!t)return{done:!0};let a={edge:t.key,attributes:t.attributes,source:t.source.key,target:t.target.key,sourceAttributes:t.source.attributes,targetAttributes:t.target.attributes,undirected:t.undirected};return t=t.next,{done:!1,value:a}}};let r=!1;return{[Symbol.iterator](){return this},next(){return r===!0?{done:!0}:(r=!0,{done:!1,value:{edge:t.key,attributes:t.attributes,source:t.source.key,target:t.target.key,sourceAttributes:t.source.attributes,targetAttributes:t.target.attributes,undirected:t.undirected}})}}}function Hg(e,n){if(e.size===0)return[];if(n==="mixed"||n===e.type)return Array.from(e._edges.keys());let t=n==="undirected"?e.undirectedSize:e.directedSize,r=new Array(t),a=n==="undirected",i=e._edges.values(),o=0,s,l;for(;s=i.next(),s.done!==!0;)l=s.value,l.undirected===a&&(r[o++]=l.key);return r}function Ol(e,n,t,r){if(n.size===0)return;let a=t!=="mixed"&&t!==n.type,i=t==="undirected",o,s,l=!1,u=n._edges.values();for(;o=u.next(),o.done!==!0;){if(s=o.value,a&&s.undirected!==i)continue;let{key:d,attributes:c,source:h,target:g}=s;if(l=r(d,c,h.key,g.key,h.attributes,g.attributes,s.undirected),e&&l)return d}}function jg(e,n){if(e.size===0)return Dn();let t=n!=="mixed"&&n!==e.type,r=n==="undirected",a=e._edges.values();return{[Symbol.iterator](){return this},next(){let i,o;for(;;){if(i=a.next(),i.done)return i;if(o=i.value,!(t&&o.undirected!==r))break}return{value:{edge:o.key,attributes:o.attributes,source:o.source.key,target:o.target.key,sourceAttributes:o.source.attributes,targetAttributes:o.target.attributes,undirected:o.undirected},done:!1}}}}function ro(e,n,t,r,a,i){let o=n?Wg:Bg,s;if(t!=="undirected"&&(r!=="out"&&(s=o(e,a.in,i),e&&s)||r!=="in"&&(s=o(e,a.out,i,r?void 0:a.key),e&&s))||t!=="directed"&&(s=o(e,a.undirected,i),e&&s))return s}function qg(e,n,t,r){let a=[];return ro(!1,e,n,t,r,function(i){a.push(i)}),a}function Vg(e,n,t){let r=Dn();return e!=="undirected"&&(n!=="out"&&typeof t.in<"u"&&(r=wt(r,to(t.in))),n!=="in"&&typeof t.out<"u"&&(r=wt(r,to(t.out,n?void 0:t.key)))),e!=="directed"&&typeof t.undirected<"u"&&(r=wt(r,to(t.undirected))),r}function ao(e,n,t,r,a,i,o){let s=t?$g:Ug,l;if(n!=="undirected"&&(typeof a.in<"u"&&r!=="out"&&(l=s(e,a.in,i,o),e&&l)||typeof a.out<"u"&&r!=="in"&&(r||a.key!==i)&&(l=s(e,a.out,i,o),e&&l))||n!=="directed"&&typeof a.undirected<"u"&&(l=s(e,a.undirected,i,o),e&&l))return l}function Xg(e,n,t,r,a){let i=[];return ao(!1,e,n,t,r,a,function(o){i.push(o)}),i}function Yg(e,n,t,r){let a=Dn();return e!=="undirected"&&(typeof t.in<"u"&&n!=="out"&&r in t.in&&(a=wt(a,no(t.in,r))),typeof t.out<"u"&&n!=="in"&&r in t.out&&(n||t.key!==r)&&(a=wt(a,no(t.out,r)))),e!=="directed"&&typeof t.undirected<"u"&&r in t.undirected&&(a=wt(a,no(t.undirected,r))),a}function Kg(e,n){let{name:t,type:r,direction:a}=n;e.prototype[t]=function(i,o){if(r!=="mixed"&&this.type!=="mixed"&&r!==this.type)return[];if(!arguments.length)return Hg(this,r);if(arguments.length===1){i=""+i;let s=this._nodes.get(i);if(typeof s>"u")throw new j(`Graph.${t}: could not find the "${i}" node in the graph.`);return qg(this.multi,r==="mixed"?this.type:r,a,s)}if(arguments.length===2){i=""+i,o=""+o;let s=this._nodes.get(i);if(!s)throw new j(`Graph.${t}:  could not find the "${i}" source node in the graph.`);if(!this._nodes.has(o))throw new j(`Graph.${t}:  could not find the "${o}" target node in the graph.`);return Xg(r,this.multi,a,s,o)}throw new V(`Graph.${t}: too many arguments (expecting 0, 1 or 2 and got ${arguments.length}).`)}}function Zg(e,n){let{name:t,type:r,direction:a}=n,i="forEach"+t[0].toUpperCase()+t.slice(1,-1);e.prototype[i]=function(u,d,c){if(!(r!=="mixed"&&this.type!=="mixed"&&r!==this.type)){if(arguments.length===1)return c=u,Ol(!1,this,r,c);if(arguments.length===2){u=""+u,c=d;let h=this._nodes.get(u);if(typeof h>"u")throw new j(`Graph.${i}: could not find the "${u}" node in the graph.`);return ro(!1,this.multi,r==="mixed"?this.type:r,a,h,c)}if(arguments.length===3){u=""+u,d=""+d;let h=this._nodes.get(u);if(!h)throw new j(`Graph.${i}:  could not find the "${u}" source node in the graph.`);if(!this._nodes.has(d))throw new j(`Graph.${i}:  could not find the "${d}" target node in the graph.`);return ao(!1,r,this.multi,a,h,d,c)}throw new V(`Graph.${i}: too many arguments (expecting 1, 2 or 3 and got ${arguments.length}).`)}};let o="map"+t[0].toUpperCase()+t.slice(1);e.prototype[o]=function(){let u=Array.prototype.slice.call(arguments),d=u.pop(),c;if(u.length===0){let h=0;r!=="directed"&&(h+=this.undirectedSize),r!=="undirected"&&(h+=this.directedSize),c=new Array(h);let g=0;u.push((p,m,b,v,x,y,_)=>{c[g++]=d(p,m,b,v,x,y,_)})}else c=[],u.push((h,g,p,m,b,v,x)=>{c.push(d(h,g,p,m,b,v,x))});return this[i].apply(this,u),c};let s="filter"+t[0].toUpperCase()+t.slice(1);e.prototype[s]=function(){let u=Array.prototype.slice.call(arguments),d=u.pop(),c=[];return u.push((h,g,p,m,b,v,x)=>{d(h,g,p,m,b,v,x)&&c.push(h)}),this[i].apply(this,u),c};let l="reduce"+t[0].toUpperCase()+t.slice(1);e.prototype[l]=function(){let u=Array.prototype.slice.call(arguments);if(u.length<2||u.length>4)throw new V(`Graph.${l}: invalid number of arguments (expecting 2, 3 or 4 and got ${u.length}).`);if(typeof u[u.length-1]=="function"&&typeof u[u.length-2]!="function")throw new V(`Graph.${l}: missing initial value. You must provide it because the callback takes more than one argument and we cannot infer the initial value from the first iteration, as you could with a simple array.`);let d,c;u.length===2?(d=u[0],c=u[1],u=[]):u.length===3?(d=u[1],c=u[2],u=[u[0]]):u.length===4&&(d=u[2],c=u[3],u=[u[0],u[1]]);let h=c;return u.push((g,p,m,b,v,x,y)=>{h=d(h,g,p,m,b,v,x,y)}),this[i].apply(this,u),h}}function Qg(e,n){let{name:t,type:r,direction:a}=n,i="find"+t[0].toUpperCase()+t.slice(1,-1);e.prototype[i]=function(l,u,d){if(r!=="mixed"&&this.type!=="mixed"&&r!==this.type)return!1;if(arguments.length===1)return d=l,Ol(!0,this,r,d);if(arguments.length===2){l=""+l,d=u;let c=this._nodes.get(l);if(typeof c>"u")throw new j(`Graph.${i}: could not find the "${l}" node in the graph.`);return ro(!0,this.multi,r==="mixed"?this.type:r,a,c,d)}if(arguments.length===3){l=""+l,u=""+u;let c=this._nodes.get(l);if(!c)throw new j(`Graph.${i}:  could not find the "${l}" source node in the graph.`);if(!this._nodes.has(u))throw new j(`Graph.${i}:  could not find the "${u}" target node in the graph.`);return ao(!0,r,this.multi,a,c,u,d)}throw new V(`Graph.${i}: too many arguments (expecting 1, 2 or 3 and got ${arguments.length}).`)};let o="some"+t[0].toUpperCase()+t.slice(1,-1);e.prototype[o]=function(){let l=Array.prototype.slice.call(arguments),u=l.pop();return l.push((c,h,g,p,m,b,v)=>u(c,h,g,p,m,b,v)),!!this[i].apply(this,l)};let s="every"+t[0].toUpperCase()+t.slice(1,-1);e.prototype[s]=function(){let l=Array.prototype.slice.call(arguments),u=l.pop();return l.push((c,h,g,p,m,b,v)=>!u(c,h,g,p,m,b,v)),!this[i].apply(this,l)}}function Jg(e,n){let{name:t,type:r,direction:a}=n,i=t.slice(0,-1)+"Entries";e.prototype[i]=function(o,s){if(r!=="mixed"&&this.type!=="mixed"&&r!==this.type)return Dn();if(!arguments.length)return jg(this,r);if(arguments.length===1){o=""+o;let l=this._nodes.get(o);if(!l)throw new j(`Graph.${i}: could not find the "${o}" node in the graph.`);return Vg(r,a,l)}if(arguments.length===2){o=""+o,s=""+s;let l=this._nodes.get(o);if(!l)throw new j(`Graph.${i}:  could not find the "${o}" source node in the graph.`);if(!this._nodes.has(s))throw new j(`Graph.${i}:  could not find the "${s}" target node in the graph.`);return Yg(r,a,l,s)}throw new V(`Graph.${i}: too many arguments (expecting 0, 1 or 2 and got ${arguments.length}).`)}}function ep(e){Og.forEach(n=>{Kg(e,n),Zg(e,n),Qg(e,n),Jg(e,n)})}var tp=[{name:"neighbors",type:"mixed"},{name:"inNeighbors",type:"directed",direction:"in"},{name:"outNeighbors",type:"directed",direction:"out"},{name:"inboundNeighbors",type:"mixed",direction:"in"},{name:"outboundNeighbors",type:"mixed",direction:"out"},{name:"directedNeighbors",type:"directed"},{name:"undirectedNeighbors",type:"undirected"}];function pa(){this.A=null,this.B=null}pa.prototype.wrap=function(e){this.A===null?this.A=e:this.B===null&&(this.B=e)};pa.prototype.has=function(e){return this.A!==null&&e in this.A||this.B!==null&&e in this.B};function dr(e,n,t,r,a){for(let i in r){let o=r[i],s=o.source,l=o.target,u=s===t?l:s;if(n&&n.has(u.key))continue;let d=a(u.key,u.attributes);if(e&&d)return u.key}}function io(e,n,t,r,a){if(n!=="mixed"){if(n==="undirected")return dr(e,null,r,r.undirected,a);if(typeof t=="string")return dr(e,null,r,r[t],a)}let i=new pa,o;if(n!=="undirected"){if(t!=="out"){if(o=dr(e,null,r,r.in,a),e&&o)return o;i.wrap(r.in)}if(t!=="in"){if(o=dr(e,i,r,r.out,a),e&&o)return o;i.wrap(r.out)}}if(n!=="directed"&&(o=dr(e,i,r,r.undirected,a),e&&o))return o}function np(e,n,t){if(e!=="mixed"){if(e==="undirected")return Object.keys(t.undirected);if(typeof n=="string")return Object.keys(t[n])}let r=[];return io(!1,e,n,t,function(a){r.push(a)}),r}function cr(e,n,t){let r=Object.keys(t),a=r.length,i=0;return{[Symbol.iterator](){return this},next(){let o=null;do{if(i>=a)return e&&e.wrap(t),{done:!0};let s=t[r[i++]],l=s.source,u=s.target;if(o=l===n?u:l,e&&e.has(o.key)){o=null;continue}}while(o===null);return{done:!1,value:{neighbor:o.key,attributes:o.attributes}}}}}function rp(e,n,t){if(e!=="mixed"){if(e==="undirected")return cr(null,t,t.undirected);if(typeof n=="string")return cr(null,t,t[n])}let r=Dn(),a=new pa;return e!=="undirected"&&(n!=="out"&&(r=wt(r,cr(a,t,t.in))),n!=="in"&&(r=wt(r,cr(a,t,t.out)))),e!=="directed"&&(r=wt(r,cr(a,t,t.undirected))),r}function ap(e,n){let{name:t,type:r,direction:a}=n;e.prototype[t]=function(i){if(r!=="mixed"&&this.type!=="mixed"&&r!==this.type)return[];i=""+i;let o=this._nodes.get(i);if(typeof o>"u")throw new j(`Graph.${t}: could not find the "${i}" node in the graph.`);return np(r==="mixed"?this.type:r,a,o)}}function ip(e,n){let{name:t,type:r,direction:a}=n,i="forEach"+t[0].toUpperCase()+t.slice(1,-1);e.prototype[i]=function(u,d){if(r!=="mixed"&&this.type!=="mixed"&&r!==this.type)return;u=""+u;let c=this._nodes.get(u);if(typeof c>"u")throw new j(`Graph.${i}: could not find the "${u}" node in the graph.`);io(!1,r==="mixed"?this.type:r,a,c,d)};let o="map"+t[0].toUpperCase()+t.slice(1);e.prototype[o]=function(u,d){let c=[];return this[i](u,(h,g)=>{c.push(d(h,g))}),c};let s="filter"+t[0].toUpperCase()+t.slice(1);e.prototype[s]=function(u,d){let c=[];return this[i](u,(h,g)=>{d(h,g)&&c.push(h)}),c};let l="reduce"+t[0].toUpperCase()+t.slice(1);e.prototype[l]=function(u,d,c){if(arguments.length<3)throw new V(`Graph.${l}: missing initial value. You must provide it because the callback takes more than one argument and we cannot infer the initial value from the first iteration, as you could with a simple array.`);let h=c;return this[i](u,(g,p)=>{h=d(h,g,p)}),h}}function op(e,n){let{name:t,type:r,direction:a}=n,i=t[0].toUpperCase()+t.slice(1,-1),o="find"+i;e.prototype[o]=function(u,d){if(r!=="mixed"&&this.type!=="mixed"&&r!==this.type)return;u=""+u;let c=this._nodes.get(u);if(typeof c>"u")throw new j(`Graph.${o}: could not find the "${u}" node in the graph.`);return io(!0,r==="mixed"?this.type:r,a,c,d)};let s="some"+i;e.prototype[s]=function(u,d){return!!this[o](u,d)};let l="every"+i;e.prototype[l]=function(u,d){return!this[o](u,(h,g)=>!d(h,g))}}function sp(e,n){let{name:t,type:r,direction:a}=n,i=t.slice(0,-1)+"Entries";e.prototype[i]=function(o){if(r!=="mixed"&&this.type!=="mixed"&&r!==this.type)return Dn();o=""+o;let s=this._nodes.get(o);if(typeof s>"u")throw new j(`Graph.${i}: could not find the "${o}" node in the graph.`);return rp(r==="mixed"?this.type:r,a,s)}}function lp(e){tp.forEach(n=>{ap(e,n),ip(e,n),op(e,n),sp(e,n)})}function ua(e,n,t,r,a){let i=r._nodes.values(),o=r.type,s,l,u,d,c,h,g;for(;s=i.next(),s.done!==!0;){let p=!1;if(l=s.value,o!=="undirected"){d=l.out;for(u in d){c=d[u];do{if(h=c.target,p=!0,g=a(l.key,h.key,l.attributes,h.attributes,c.key,c.attributes,c.undirected),e&&g)return c;c=c.next}while(c)}}if(o!=="directed"){d=l.undirected;for(u in d)if(!(n&&l.key>u)){c=d[u];do{if(h=c.target,h.key!==u&&(h=c.source),p=!0,g=a(l.key,h.key,l.attributes,h.attributes,c.key,c.attributes,c.undirected),e&&g)return c;c=c.next}while(c)}}if(t&&!p&&(g=a(l.key,null,l.attributes,null,null,null,null),e&&g))return null}}function up(e,n){let t={key:e};return Pl(n.attributes)||(t.attributes=ke({},n.attributes)),t}function dp(e,n,t){let r={key:n,source:t.source.key,target:t.target.key};return Pl(t.attributes)||(r.attributes=ke({},t.attributes)),e==="mixed"&&t.undirected&&(r.undirected=!0),r}function cp(e){if(!Pe(e))throw new V('Graph.import: invalid serialized node. A serialized node should be a plain object with at least a "key" property.');if(!("key"in e))throw new V("Graph.import: serialized node is missing its key.");if("attributes"in e&&(!Pe(e.attributes)||e.attributes===null))throw new V("Graph.import: invalid attributes. Attributes should be a plain object, null or omitted.")}function hp(e){if(!Pe(e))throw new V('Graph.import: invalid serialized edge. A serialized edge should be a plain object with at least a "source" & "target" property.');if(!("source"in e))throw new V("Graph.import: serialized edge is missing its source.");if(!("target"in e))throw new V("Graph.import: serialized edge is missing its target.");if("attributes"in e&&(!Pe(e.attributes)||e.attributes===null))throw new V("Graph.import: invalid attributes. Attributes should be a plain object, null or omitted.");if("undirected"in e&&typeof e.undirected!="boolean")throw new V("Graph.import: invalid undirectedness information. Undirected should be boolean or omitted.")}var fp=pg(),gp=new Set(["directed","undirected","mixed"]),kl=new Set(["domain","_events","_eventsCount","_maxListeners"]),pp=[{name:e=>`${e}Edge`,generateKey:!0},{name:e=>`${e}DirectedEdge`,generateKey:!0,type:"directed"},{name:e=>`${e}UndirectedEdge`,generateKey:!0,type:"undirected"},{name:e=>`${e}EdgeWithKey`},{name:e=>`${e}DirectedEdgeWithKey`,type:"directed"},{name:e=>`${e}UndirectedEdgeWithKey`,type:"undirected"}],mp={allowSelfLoops:!0,multi:!1,type:"mixed"};function vp(e,n,t){if(t&&!Pe(t))throw new V(`Graph.addNode: invalid attributes. Expecting an object but got "${t}"`);if(n=""+n,t=t||{},e._nodes.has(n))throw new J(`Graph.addNode: the "${n}" node already exist in the graph.`);let r=new e.NodeDataClass(n,t);return e._nodes.set(n,r),e.emit("nodeAdded",{key:n,attributes:t}),r}function Cl(e,n,t){let r=new e.NodeDataClass(n,t);return e._nodes.set(n,r),e.emit("nodeAdded",{key:n,attributes:t}),r}function Bl(e,n,t,r,a,i,o,s){if(!r&&e.type==="undirected")throw new J(`Graph.${n}: you cannot add a directed edge to an undirected graph. Use the #.addEdge or #.addUndirectedEdge instead.`);if(r&&e.type==="directed")throw new J(`Graph.${n}: you cannot add an undirected edge to a directed graph. Use the #.addEdge or #.addDirectedEdge instead.`);if(s&&!Pe(s))throw new V(`Graph.${n}: invalid attributes. Expecting an object but got "${s}"`);if(i=""+i,o=""+o,s=s||{},!e.allowSelfLoops&&i===o)throw new J(`Graph.${n}: source & target are the same ("${i}"), thus creating a loop explicitly forbidden by this graph 'allowSelfLoops' option set to false.`);let l=e._nodes.get(i),u=e._nodes.get(o);if(!l)throw new j(`Graph.${n}: source node "${i}" not found.`);if(!u)throw new j(`Graph.${n}: target node "${o}" not found.`);let d={key:null,undirected:r,source:i,target:o,attributes:s};if(t)a=e._edgeKeyGenerator();else if(a=""+a,e._edges.has(a))throw new J(`Graph.${n}: the "${a}" edge already exists in the graph.`);if(!e.multi&&(r?typeof l.undirected[o]<"u":typeof l.out[o]<"u"))throw new J(`Graph.${n}: an edge linking "${i}" to "${o}" already exists. If you really want to add multiple edges linking those nodes, you should create a multi graph by using the 'multi' option.`);let c=new kn(r,a,l,u,s);e._edges.set(a,c);let h=i===o;return r?(l.undirectedDegree++,u.undirectedDegree++,h&&(l.undirectedLoops++,e._undirectedSelfLoopCount++)):(l.outDegree++,u.inDegree++,h&&(l.directedLoops++,e._directedSelfLoopCount++)),e.multi?c.attachMulti():c.attach(),r?e._undirectedSize++:e._directedSize++,d.key=a,e.emit("edgeAdded",d),a}function yp(e,n,t,r,a,i,o,s,l){if(!r&&e.type==="undirected")throw new J(`Graph.${n}: you cannot merge/update a directed edge to an undirected graph. Use the #.mergeEdge/#.updateEdge or #.addUndirectedEdge instead.`);if(r&&e.type==="directed")throw new J(`Graph.${n}: you cannot merge/update an undirected edge to a directed graph. Use the #.mergeEdge/#.updateEdge or #.addDirectedEdge instead.`);if(s){if(l){if(typeof s!="function")throw new V(`Graph.${n}: invalid updater function. Expecting a function but got "${s}"`)}else if(!Pe(s))throw new V(`Graph.${n}: invalid attributes. Expecting an object but got "${s}"`)}i=""+i,o=""+o;let u;if(l&&(u=s,s=void 0),!e.allowSelfLoops&&i===o)throw new J(`Graph.${n}: source & target are the same ("${i}"), thus creating a loop explicitly forbidden by this graph 'allowSelfLoops' option set to false.`);let d=e._nodes.get(i),c=e._nodes.get(o),h,g;if(!t&&(h=e._edges.get(a),h)){if((h.source.key!==i||h.target.key!==o)&&(!r||h.source.key!==o||h.target.key!==i))throw new J(`Graph.${n}: inconsistency detected when attempting to merge the "${a}" edge with "${i}" source & "${o}" target vs. ("${h.source.key}", "${h.target.key}").`);g=h}if(!g&&!e.multi&&d&&(g=r?d.undirected[o]:d.out[o]),g){let x=[g.key,!1,!1,!1];if(l?!u:!s)return x;if(l){let y=g.attributes;g.attributes=u(y),e.emit("edgeAttributesUpdated",{type:"replace",key:g.key,attributes:g.attributes})}else ke(g.attributes,s),e.emit("edgeAttributesUpdated",{type:"merge",key:g.key,attributes:g.attributes,data:s});return x}s=s||{},l&&u&&(s=u(s));let p={key:null,undirected:r,source:i,target:o,attributes:s};if(t)a=e._edgeKeyGenerator();else if(a=""+a,e._edges.has(a))throw new J(`Graph.${n}: the "${a}" edge already exists in the graph.`);let m=!1,b=!1;d||(d=Cl(e,i,{}),m=!0,i===o&&(c=d,b=!0)),c||(c=Cl(e,o,{}),b=!0),h=new kn(r,a,d,c,s),e._edges.set(a,h);let v=i===o;return r?(d.undirectedDegree++,c.undirectedDegree++,v&&(d.undirectedLoops++,e._undirectedSelfLoopCount++)):(d.outDegree++,c.inDegree++,v&&(d.directedLoops++,e._directedSelfLoopCount++)),e.multi?h.attachMulti():h.attach(),r?e._undirectedSize++:e._directedSize++,p.key=a,e.emit("edgeAdded",p),[a,!0,m,b]}function Rn(e,n){e._edges.delete(n.key);let{source:t,target:r,attributes:a}=n,i=n.undirected,o=t===r;i?(t.undirectedDegree--,r.undirectedDegree--,o&&(t.undirectedLoops--,e._undirectedSelfLoopCount--)):(t.outDegree--,r.inDegree--,o&&(t.directedLoops--,e._directedSelfLoopCount--)),e.multi?n.detachMulti():n.detach(),i?e._undirectedSize--:e._directedSize--,e.emit("edgeDropped",{key:n.key,attributes:a,source:t.key,target:r.key,undirected:i})}var de=class e extends Ll.EventEmitter{constructor(n){if(super(),n=ke({},mp,n),typeof n.multi!="boolean")throw new V(`Graph.constructor: invalid 'multi' option. Expecting a boolean but got "${n.multi}".`);if(!gp.has(n.type))throw new V(`Graph.constructor: invalid 'type' option. Should be one of "mixed", "directed" or "undirected" but got "${n.type}".`);if(typeof n.allowSelfLoops!="boolean")throw new V(`Graph.constructor: invalid 'allowSelfLoops' option. Expecting a boolean but got "${n.allowSelfLoops}".`);let t=n.type==="mixed"?Il:n.type==="directed"?Fl:Ml;Qe(this,"NodeDataClass",t);let r="geid_"+fp()+"_",a=0,i=()=>{let o;do o=r+a++;while(this._edges.has(o));return o};Qe(this,"_attributes",{}),Qe(this,"_nodes",new Map),Qe(this,"_edges",new Map),Qe(this,"_directedSize",0),Qe(this,"_undirectedSize",0),Qe(this,"_directedSelfLoopCount",0),Qe(this,"_undirectedSelfLoopCount",0),Qe(this,"_edgeKeyGenerator",i),Qe(this,"_options",n),kl.forEach(o=>Qe(this,o,this[o])),st(this,"order",()=>this._nodes.size),st(this,"size",()=>this._edges.size),st(this,"directedSize",()=>this._directedSize),st(this,"undirectedSize",()=>this._undirectedSize),st(this,"selfLoopCount",()=>this._directedSelfLoopCount+this._undirectedSelfLoopCount),st(this,"directedSelfLoopCount",()=>this._directedSelfLoopCount),st(this,"undirectedSelfLoopCount",()=>this._undirectedSelfLoopCount),st(this,"multi",this._options.multi),st(this,"type",this._options.type),st(this,"allowSelfLoops",this._options.allowSelfLoops),st(this,"implementation",()=>"graphology")}_resetInstanceCounters(){this._directedSize=0,this._undirectedSize=0,this._directedSelfLoopCount=0,this._undirectedSelfLoopCount=0}hasNode(n){return this._nodes.has(""+n)}hasDirectedEdge(n,t){if(this.type==="undirected")return!1;if(arguments.length===1){let r=""+n,a=this._edges.get(r);return!!a&&!a.undirected}else if(arguments.length===2){n=""+n,t=""+t;let r=this._nodes.get(n);return r?r.out.hasOwnProperty(t):!1}throw new V(`Graph.hasDirectedEdge: invalid arity (${arguments.length}, instead of 1 or 2). You can either ask for an edge id or for the existence of an edge between a source & a target.`)}hasUndirectedEdge(n,t){if(this.type==="directed")return!1;if(arguments.length===1){let r=""+n,a=this._edges.get(r);return!!a&&a.undirected}else if(arguments.length===2){n=""+n,t=""+t;let r=this._nodes.get(n);return r?r.undirected.hasOwnProperty(t):!1}throw new V(`Graph.hasDirectedEdge: invalid arity (${arguments.length}, instead of 1 or 2). You can either ask for an edge id or for the existence of an edge between a source & a target.`)}hasEdge(n,t){if(arguments.length===1){let r=""+n;return this._edges.has(r)}else if(arguments.length===2){n=""+n,t=""+t;let r=this._nodes.get(n);return r?typeof r.out<"u"&&r.out.hasOwnProperty(t)||typeof r.undirected<"u"&&r.undirected.hasOwnProperty(t):!1}throw new V(`Graph.hasEdge: invalid arity (${arguments.length}, instead of 1 or 2). You can either ask for an edge id or for the existence of an edge between a source & a target.`)}directedEdge(n,t){if(this.type==="undirected")return;if(n=""+n,t=""+t,this.multi)throw new J("Graph.directedEdge: this method is irrelevant with multigraphs since there might be multiple edges between source & target. See #.directedEdges instead.");let r=this._nodes.get(n);if(!r)throw new j(`Graph.directedEdge: could not find the "${n}" source node in the graph.`);if(!this._nodes.has(t))throw new j(`Graph.directedEdge: could not find the "${t}" target node in the graph.`);let a=r.out&&r.out[t]||void 0;if(a)return a.key}undirectedEdge(n,t){if(this.type==="directed")return;if(n=""+n,t=""+t,this.multi)throw new J("Graph.undirectedEdge: this method is irrelevant with multigraphs since there might be multiple edges between source & target. See #.undirectedEdges instead.");let r=this._nodes.get(n);if(!r)throw new j(`Graph.undirectedEdge: could not find the "${n}" source node in the graph.`);if(!this._nodes.has(t))throw new j(`Graph.undirectedEdge: could not find the "${t}" target node in the graph.`);let a=r.undirected&&r.undirected[t]||void 0;if(a)return a.key}edge(n,t){if(this.multi)throw new J("Graph.edge: this method is irrelevant with multigraphs since there might be multiple edges between source & target. See #.edges instead.");n=""+n,t=""+t;let r=this._nodes.get(n);if(!r)throw new j(`Graph.edge: could not find the "${n}" source node in the graph.`);if(!this._nodes.has(t))throw new j(`Graph.edge: could not find the "${t}" target node in the graph.`);let a=r.out&&r.out[t]||r.undirected&&r.undirected[t]||void 0;if(a)return a.key}areDirectedNeighbors(n,t){n=""+n,t=""+t;let r=this._nodes.get(n);if(!r)throw new j(`Graph.areDirectedNeighbors: could not find the "${n}" node in the graph.`);return this.type==="undirected"?!1:t in r.in||t in r.out}areOutNeighbors(n,t){n=""+n,t=""+t;let r=this._nodes.get(n);if(!r)throw new j(`Graph.areOutNeighbors: could not find the "${n}" node in the graph.`);return this.type==="undirected"?!1:t in r.out}areInNeighbors(n,t){n=""+n,t=""+t;let r=this._nodes.get(n);if(!r)throw new j(`Graph.areInNeighbors: could not find the "${n}" node in the graph.`);return this.type==="undirected"?!1:t in r.in}areUndirectedNeighbors(n,t){n=""+n,t=""+t;let r=this._nodes.get(n);if(!r)throw new j(`Graph.areUndirectedNeighbors: could not find the "${n}" node in the graph.`);return this.type==="directed"?!1:t in r.undirected}areNeighbors(n,t){n=""+n,t=""+t;let r=this._nodes.get(n);if(!r)throw new j(`Graph.areNeighbors: could not find the "${n}" node in the graph.`);return this.type!=="undirected"&&(t in r.in||t in r.out)||this.type!=="directed"&&t in r.undirected}areInboundNeighbors(n,t){n=""+n,t=""+t;let r=this._nodes.get(n);if(!r)throw new j(`Graph.areInboundNeighbors: could not find the "${n}" node in the graph.`);return this.type!=="undirected"&&t in r.in||this.type!=="directed"&&t in r.undirected}areOutboundNeighbors(n,t){n=""+n,t=""+t;let r=this._nodes.get(n);if(!r)throw new j(`Graph.areOutboundNeighbors: could not find the "${n}" node in the graph.`);return this.type!=="undirected"&&t in r.out||this.type!=="directed"&&t in r.undirected}inDegree(n){n=""+n;let t=this._nodes.get(n);if(!t)throw new j(`Graph.inDegree: could not find the "${n}" node in the graph.`);return this.type==="undirected"?0:t.inDegree}outDegree(n){n=""+n;let t=this._nodes.get(n);if(!t)throw new j(`Graph.outDegree: could not find the "${n}" node in the graph.`);return this.type==="undirected"?0:t.outDegree}directedDegree(n){n=""+n;let t=this._nodes.get(n);if(!t)throw new j(`Graph.directedDegree: could not find the "${n}" node in the graph.`);return this.type==="undirected"?0:t.inDegree+t.outDegree}undirectedDegree(n){n=""+n;let t=this._nodes.get(n);if(!t)throw new j(`Graph.undirectedDegree: could not find the "${n}" node in the graph.`);return this.type==="directed"?0:t.undirectedDegree}inboundDegree(n){n=""+n;let t=this._nodes.get(n);if(!t)throw new j(`Graph.inboundDegree: could not find the "${n}" node in the graph.`);let r=0;return this.type!=="directed"&&(r+=t.undirectedDegree),this.type!=="undirected"&&(r+=t.inDegree),r}outboundDegree(n){n=""+n;let t=this._nodes.get(n);if(!t)throw new j(`Graph.outboundDegree: could not find the "${n}" node in the graph.`);let r=0;return this.type!=="directed"&&(r+=t.undirectedDegree),this.type!=="undirected"&&(r+=t.outDegree),r}degree(n){n=""+n;let t=this._nodes.get(n);if(!t)throw new j(`Graph.degree: could not find the "${n}" node in the graph.`);let r=0;return this.type!=="directed"&&(r+=t.undirectedDegree),this.type!=="undirected"&&(r+=t.inDegree+t.outDegree),r}inDegreeWithoutSelfLoops(n){n=""+n;let t=this._nodes.get(n);if(!t)throw new j(`Graph.inDegreeWithoutSelfLoops: could not find the "${n}" node in the graph.`);return this.type==="undirected"?0:t.inDegree-t.directedLoops}outDegreeWithoutSelfLoops(n){n=""+n;let t=this._nodes.get(n);if(!t)throw new j(`Graph.outDegreeWithoutSelfLoops: could not find the "${n}" node in the graph.`);return this.type==="undirected"?0:t.outDegree-t.directedLoops}directedDegreeWithoutSelfLoops(n){n=""+n;let t=this._nodes.get(n);if(!t)throw new j(`Graph.directedDegreeWithoutSelfLoops: could not find the "${n}" node in the graph.`);return this.type==="undirected"?0:t.inDegree+t.outDegree-t.directedLoops*2}undirectedDegreeWithoutSelfLoops(n){n=""+n;let t=this._nodes.get(n);if(!t)throw new j(`Graph.undirectedDegreeWithoutSelfLoops: could not find the "${n}" node in the graph.`);return this.type==="directed"?0:t.undirectedDegree-t.undirectedLoops*2}inboundDegreeWithoutSelfLoops(n){n=""+n;let t=this._nodes.get(n);if(!t)throw new j(`Graph.inboundDegreeWithoutSelfLoops: could not find the "${n}" node in the graph.`);let r=0,a=0;return this.type!=="directed"&&(r+=t.undirectedDegree,a+=t.undirectedLoops*2),this.type!=="undirected"&&(r+=t.inDegree,a+=t.directedLoops),r-a}outboundDegreeWithoutSelfLoops(n){n=""+n;let t=this._nodes.get(n);if(!t)throw new j(`Graph.outboundDegreeWithoutSelfLoops: could not find the "${n}" node in the graph.`);let r=0,a=0;return this.type!=="directed"&&(r+=t.undirectedDegree,a+=t.undirectedLoops*2),this.type!=="undirected"&&(r+=t.outDegree,a+=t.directedLoops),r-a}degreeWithoutSelfLoops(n){n=""+n;let t=this._nodes.get(n);if(!t)throw new j(`Graph.degreeWithoutSelfLoops: could not find the "${n}" node in the graph.`);let r=0,a=0;return this.type!=="directed"&&(r+=t.undirectedDegree,a+=t.undirectedLoops*2),this.type!=="undirected"&&(r+=t.inDegree+t.outDegree,a+=t.directedLoops*2),r-a}source(n){n=""+n;let t=this._edges.get(n);if(!t)throw new j(`Graph.source: could not find the "${n}" edge in the graph.`);return t.source.key}target(n){n=""+n;let t=this._edges.get(n);if(!t)throw new j(`Graph.target: could not find the "${n}" edge in the graph.`);return t.target.key}extremities(n){n=""+n;let t=this._edges.get(n);if(!t)throw new j(`Graph.extremities: could not find the "${n}" edge in the graph.`);return[t.source.key,t.target.key]}opposite(n,t){n=""+n,t=""+t;let r=this._edges.get(t);if(!r)throw new j(`Graph.opposite: could not find the "${t}" edge in the graph.`);let a=r.source.key,i=r.target.key;if(n===a)return i;if(n===i)return a;throw new j(`Graph.opposite: the "${n}" node is not attached to the "${t}" edge (${a}, ${i}).`)}hasExtremity(n,t){n=""+n,t=""+t;let r=this._edges.get(n);if(!r)throw new j(`Graph.hasExtremity: could not find the "${n}" edge in the graph.`);return r.source.key===t||r.target.key===t}isUndirected(n){n=""+n;let t=this._edges.get(n);if(!t)throw new j(`Graph.isUndirected: could not find the "${n}" edge in the graph.`);return t.undirected}isDirected(n){n=""+n;let t=this._edges.get(n);if(!t)throw new j(`Graph.isDirected: could not find the "${n}" edge in the graph.`);return!t.undirected}isSelfLoop(n){n=""+n;let t=this._edges.get(n);if(!t)throw new j(`Graph.isSelfLoop: could not find the "${n}" edge in the graph.`);return t.source===t.target}addNode(n,t){return vp(this,n,t).key}mergeNode(n,t){if(t&&!Pe(t))throw new V(`Graph.mergeNode: invalid attributes. Expecting an object but got "${t}"`);n=""+n,t=t||{};let r=this._nodes.get(n);return r?(t&&(ke(r.attributes,t),this.emit("nodeAttributesUpdated",{type:"merge",key:n,attributes:r.attributes,data:t})),[n,!1]):(r=new this.NodeDataClass(n,t),this._nodes.set(n,r),this.emit("nodeAdded",{key:n,attributes:t}),[n,!0])}updateNode(n,t){if(t&&typeof t!="function")throw new V(`Graph.updateNode: invalid updater function. Expecting a function but got "${t}"`);n=""+n;let r=this._nodes.get(n);if(r){if(t){let i=r.attributes;r.attributes=t(i),this.emit("nodeAttributesUpdated",{type:"replace",key:n,attributes:r.attributes})}return[n,!1]}let a=t?t({}):{};return r=new this.NodeDataClass(n,a),this._nodes.set(n,r),this.emit("nodeAdded",{key:n,attributes:a}),[n,!0]}dropNode(n){n=""+n;let t=this._nodes.get(n);if(!t)throw new j(`Graph.dropNode: could not find the "${n}" node in the graph.`);let r;if(this.type!=="undirected"){for(let a in t.out){r=t.out[a];do Rn(this,r),r=r.next;while(r)}for(let a in t.in){r=t.in[a];do Rn(this,r),r=r.next;while(r)}}if(this.type!=="directed")for(let a in t.undirected){r=t.undirected[a];do Rn(this,r),r=r.next;while(r)}this._nodes.delete(n),this.emit("nodeDropped",{key:n,attributes:t.attributes})}dropEdge(n){let t;if(arguments.length>1){let r=""+arguments[0],a=""+arguments[1];if(t=Je(this,r,a,this.type),!t)throw new j(`Graph.dropEdge: could not find the "${r}" -> "${a}" edge in the graph.`)}else if(n=""+n,t=this._edges.get(n),!t)throw new j(`Graph.dropEdge: could not find the "${n}" edge in the graph.`);return Rn(this,t),this}dropDirectedEdge(n,t){if(arguments.length<2)throw new J("Graph.dropDirectedEdge: it does not make sense to try and drop a directed edge by key. What if the edge with this key is undirected? Use #.dropEdge for this purpose instead.");if(this.multi)throw new J("Graph.dropDirectedEdge: cannot use a {source,target} combo when dropping an edge in a MultiGraph since we cannot infer the one you want to delete as there could be multiple ones.");n=""+n,t=""+t;let r=Je(this,n,t,"directed");if(!r)throw new j(`Graph.dropDirectedEdge: could not find a "${n}" -> "${t}" edge in the graph.`);return Rn(this,r),this}dropUndirectedEdge(n,t){if(arguments.length<2)throw new J("Graph.dropUndirectedEdge: it does not make sense to drop a directed edge by key. What if the edge with this key is undirected? Use #.dropEdge for this purpose instead.");if(this.multi)throw new J("Graph.dropUndirectedEdge: cannot use a {source,target} combo when dropping an edge in a MultiGraph since we cannot infer the one you want to delete as there could be multiple ones.");let r=Je(this,n,t,"undirected");if(!r)throw new j(`Graph.dropUndirectedEdge: could not find a "${n}" -> "${t}" edge in the graph.`);return Rn(this,r),this}clear(){this._edges.clear(),this._nodes.clear(),this._resetInstanceCounters(),this.emit("cleared")}clearEdges(){let n=this._nodes.values(),t;for(;t=n.next(),t.done!==!0;)t.value.clear();this._edges.clear(),this._resetInstanceCounters(),this.emit("edgesCleared")}getAttribute(n){return this._attributes[n]}getAttributes(){return this._attributes}hasAttribute(n){return this._attributes.hasOwnProperty(n)}setAttribute(n,t){return this._attributes[n]=t,this.emit("attributesUpdated",{type:"set",attributes:this._attributes,name:n}),this}updateAttribute(n,t){if(typeof t!="function")throw new V("Graph.updateAttribute: updater should be a function.");let r=this._attributes[n];return this._attributes[n]=t(r),this.emit("attributesUpdated",{type:"set",attributes:this._attributes,name:n}),this}removeAttribute(n){return delete this._attributes[n],this.emit("attributesUpdated",{type:"remove",attributes:this._attributes,name:n}),this}replaceAttributes(n){if(!Pe(n))throw new V("Graph.replaceAttributes: provided attributes are not a plain object.");return this._attributes=n,this.emit("attributesUpdated",{type:"replace",attributes:this._attributes}),this}mergeAttributes(n){if(!Pe(n))throw new V("Graph.mergeAttributes: provided attributes are not a plain object.");return ke(this._attributes,n),this.emit("attributesUpdated",{type:"merge",attributes:this._attributes,data:n}),this}updateAttributes(n){if(typeof n!="function")throw new V("Graph.updateAttributes: provided updater is not a function.");return this._attributes=n(this._attributes),this.emit("attributesUpdated",{type:"update",attributes:this._attributes}),this}updateEachNodeAttributes(n,t){if(typeof n!="function")throw new V("Graph.updateEachNodeAttributes: expecting an updater function.");if(t&&!Dl(t))throw new V("Graph.updateEachNodeAttributes: invalid hints. Expecting an object having the following shape: {attributes?: [string]}");let r=this._nodes.values(),a,i;for(;a=r.next(),a.done!==!0;)i=a.value,i.attributes=n(i.key,i.attributes);this.emit("eachNodeAttributesUpdated",{hints:t||null})}updateEachEdgeAttributes(n,t){if(typeof n!="function")throw new V("Graph.updateEachEdgeAttributes: expecting an updater function.");if(t&&!Dl(t))throw new V("Graph.updateEachEdgeAttributes: invalid hints. Expecting an object having the following shape: {attributes?: [string]}");let r=this._edges.values(),a,i,o,s;for(;a=r.next(),a.done!==!0;)i=a.value,o=i.source,s=i.target,i.attributes=n(i.key,i.attributes,o.key,s.key,o.attributes,s.attributes,i.undirected);this.emit("eachEdgeAttributesUpdated",{hints:t||null})}forEachAdjacencyEntry(n){if(typeof n!="function")throw new V("Graph.forEachAdjacencyEntry: expecting a callback.");ua(!1,!1,!1,this,n)}forEachAdjacencyEntryWithOrphans(n){if(typeof n!="function")throw new V("Graph.forEachAdjacencyEntryWithOrphans: expecting a callback.");ua(!1,!1,!0,this,n)}forEachAssymetricAdjacencyEntry(n){if(typeof n!="function")throw new V("Graph.forEachAssymetricAdjacencyEntry: expecting a callback.");ua(!1,!0,!1,this,n)}forEachAssymetricAdjacencyEntryWithOrphans(n){if(typeof n!="function")throw new V("Graph.forEachAssymetricAdjacencyEntryWithOrphans: expecting a callback.");ua(!1,!0,!0,this,n)}nodes(){return Array.from(this._nodes.keys())}forEachNode(n){if(typeof n!="function")throw new V("Graph.forEachNode: expecting a callback.");let t=this._nodes.values(),r,a;for(;r=t.next(),r.done!==!0;)a=r.value,n(a.key,a.attributes)}findNode(n){if(typeof n!="function")throw new V("Graph.findNode: expecting a callback.");let t=this._nodes.values(),r,a;for(;r=t.next(),r.done!==!0;)if(a=r.value,n(a.key,a.attributes))return a.key}mapNodes(n){if(typeof n!="function")throw new V("Graph.mapNode: expecting a callback.");let t=this._nodes.values(),r,a,i=new Array(this.order),o=0;for(;r=t.next(),r.done!==!0;)a=r.value,i[o++]=n(a.key,a.attributes);return i}someNode(n){if(typeof n!="function")throw new V("Graph.someNode: expecting a callback.");let t=this._nodes.values(),r,a;for(;r=t.next(),r.done!==!0;)if(a=r.value,n(a.key,a.attributes))return!0;return!1}everyNode(n){if(typeof n!="function")throw new V("Graph.everyNode: expecting a callback.");let t=this._nodes.values(),r,a;for(;r=t.next(),r.done!==!0;)if(a=r.value,!n(a.key,a.attributes))return!1;return!0}filterNodes(n){if(typeof n!="function")throw new V("Graph.filterNodes: expecting a callback.");let t=this._nodes.values(),r,a,i=[];for(;r=t.next(),r.done!==!0;)a=r.value,n(a.key,a.attributes)&&i.push(a.key);return i}reduceNodes(n,t){if(typeof n!="function")throw new V("Graph.reduceNodes: expecting a callback.");if(arguments.length<2)throw new V("Graph.reduceNodes: missing initial value. You must provide it because the callback takes more than one argument and we cannot infer the initial value from the first iteration, as you could with a simple array.");let r=t,a=this._nodes.values(),i,o;for(;i=a.next(),i.done!==!0;)o=i.value,r=n(r,o.key,o.attributes);return r}nodeEntries(){let n=this._nodes.values();return{[Symbol.iterator](){return this},next(){let t=n.next();if(t.done)return t;let r=t.value;return{value:{node:r.key,attributes:r.attributes},done:!1}}}}export(){let n=new Array(this._nodes.size),t=0;this._nodes.forEach((a,i)=>{n[t++]=up(i,a)});let r=new Array(this._edges.size);return t=0,this._edges.forEach((a,i)=>{r[t++]=dp(this.type,i,a)}),{options:{type:this.type,multi:this.multi,allowSelfLoops:this.allowSelfLoops},attributes:this.getAttributes(),nodes:n,edges:r}}import(n,t=!1){if(n instanceof e)return n.forEachNode((l,u)=>{t?this.mergeNode(l,u):this.addNode(l,u)}),n.forEachEdge((l,u,d,c,h,g,p)=>{t?p?this.mergeUndirectedEdgeWithKey(l,d,c,u):this.mergeDirectedEdgeWithKey(l,d,c,u):p?this.addUndirectedEdgeWithKey(l,d,c,u):this.addDirectedEdgeWithKey(l,d,c,u)}),this;if(!Pe(n))throw new V("Graph.import: invalid argument. Expecting a serialized graph or, alternatively, a Graph instance.");if(n.attributes){if(!Pe(n.attributes))throw new V("Graph.import: invalid attributes. Expecting a plain object.");t?this.mergeAttributes(n.attributes):this.replaceAttributes(n.attributes)}let r,a,i,o,s;if(n.nodes){if(i=n.nodes,!Array.isArray(i))throw new V("Graph.import: invalid nodes. Expecting an array.");for(r=0,a=i.length;r<a;r++){o=i[r],cp(o);let{key:l,attributes:u}=o;t?this.mergeNode(l,u):this.addNode(l,u)}}if(n.edges){let l=!1;if(this.type==="undirected"&&(l=!0),i=n.edges,!Array.isArray(i))throw new V("Graph.import: invalid edges. Expecting an array.");for(r=0,a=i.length;r<a;r++){s=i[r],hp(s);let{source:u,target:d,attributes:c,undirected:h=l}=s,g;"key"in s?(g=t?h?this.mergeUndirectedEdgeWithKey:this.mergeDirectedEdgeWithKey:h?this.addUndirectedEdgeWithKey:this.addDirectedEdgeWithKey,g.call(this,s.key,u,d,c)):(g=t?h?this.mergeUndirectedEdge:this.mergeDirectedEdge:h?this.addUndirectedEdge:this.addDirectedEdge,g.call(this,u,d,c))}}return this}nullCopy(n){let t=new e(ke({},this._options,n));return t.replaceAttributes(ke({},this.getAttributes())),t}emptyCopy(n){let t=this.nullCopy(n);return this._nodes.forEach((r,a)=>{let i=ke({},r.attributes);r=new t.NodeDataClass(a,i),t._nodes.set(a,r)}),t}copy(n){if(n=n||{},typeof n.type=="string"&&n.type!==this.type&&n.type!=="mixed")throw new J(`Graph.copy: cannot create an incompatible copy from "${this.type}" type to "${n.type}" because this would mean losing information about the current graph.`);if(typeof n.multi=="boolean"&&n.multi!==this.multi&&n.multi!==!0)throw new J("Graph.copy: cannot create an incompatible copy by downgrading a multi graph to a simple one because this would mean losing information about the current graph.");if(typeof n.allowSelfLoops=="boolean"&&n.allowSelfLoops!==this.allowSelfLoops&&n.allowSelfLoops!==!0)throw new J("Graph.copy: cannot create an incompatible copy from a graph allowing self loops to one that does not because this would mean losing information about the current graph.");let t=this.emptyCopy(n),r=this._edges.values(),a,i;for(;a=r.next(),a.done!==!0;)i=a.value,Bl(t,"copy",!1,i.undirected,i.key,i.source.key,i.target.key,ke({},i.attributes));return t}toJSON(){return this.export()}toString(){return"[object Graph]"}inspect(){let n={};this._nodes.forEach((i,o)=>{n[o]=i.attributes});let t={},r={};this._edges.forEach((i,o)=>{let s=i.undirected?"--":"->",l="",u=i.source.key,d=i.target.key,c;i.undirected&&u>d&&(c=u,u=d,d=c);let h=`(${u})${s}(${d})`;o.startsWith("geid_")?this.multi&&(typeof r[h]>"u"?r[h]=0:r[h]++,l+=`${r[h]}. `):l+=`[${o}]: `,l+=h,t[l]=i.attributes});let a={};for(let i in this)this.hasOwnProperty(i)&&!kl.has(i)&&typeof this[i]!="function"&&typeof i!="symbol"&&(a[i]=this[i]);return a.attributes=this._attributes,a.nodes=n,a.edges=t,Qe(a,"constructor",this.constructor),a}};typeof Symbol<"u"&&(de.prototype[Symbol.for("nodejs.util.inspect.custom")]=de.prototype.inspect);pp.forEach(e=>{["add","merge","update"].forEach(n=>{let t=e.name(n),r=n==="add"?Bl:yp;e.generateKey?de.prototype[t]=function(a,i,o){return r(this,t,!0,(e.type||this.type)==="undirected",null,a,i,o,n==="update")}:de.prototype[t]=function(a,i,o,s){return r(this,t,!1,(e.type||this.type)==="undirected",a,i,o,s,n==="update")}})});Rg(de);Gg(de);ep(de);lp(de);var da=class extends de{constructor(n){let t=ke({type:"directed"},n);if("multi"in t&&t.multi!==!1)throw new V("DirectedGraph.from: inconsistent indication that the graph should be multi in given options!");if(t.type!=="directed")throw new V('DirectedGraph.from: inconsistent "'+t.type+'" type in given options!');super(t)}},ca=class extends de{constructor(n){let t=ke({type:"undirected"},n);if("multi"in t&&t.multi!==!1)throw new V("UndirectedGraph.from: inconsistent indication that the graph should be multi in given options!");if(t.type!=="undirected")throw new V('UndirectedGraph.from: inconsistent "'+t.type+'" type in given options!');super(t)}},ha=class extends de{constructor(n){let t=ke({multi:!0},n);if("multi"in t&&t.multi!==!0)throw new V("MultiGraph.from: inconsistent indication that the graph should be simple in given options!");super(t)}},fa=class extends de{constructor(n){let t=ke({type:"directed",multi:!0},n);if("multi"in t&&t.multi!==!0)throw new V("MultiDirectedGraph.from: inconsistent indication that the graph should be simple in given options!");if(t.type!=="directed")throw new V('MultiDirectedGraph.from: inconsistent "'+t.type+'" type in given options!');super(t)}},ga=class extends de{constructor(n){let t=ke({type:"undirected",multi:!0},n);if("multi"in t&&t.multi!==!0)throw new V("MultiUndirectedGraph.from: inconsistent indication that the graph should be simple in given options!");if(t.type!=="undirected")throw new V('MultiUndirectedGraph.from: inconsistent "'+t.type+'" type in given options!');super(t)}};function Cn(e){e.from=function(n,t){let r=ke({},n.options,t),a=new e(r);return a.import(n),a}}Cn(de);Cn(da);Cn(ca);Cn(ha);Cn(fa);Cn(ga);de.Graph=de;de.DirectedGraph=da;de.UndirectedGraph=ca;de.MultiGraph=ha;de.MultiDirectedGraph=fa;de.MultiUndirectedGraph=ga;de.InvalidArgumentsGraphError=V;de.NotFoundGraphError=j;de.UsageGraphError=J;function va(e,n){(n==null||n>e.length)&&(n=e.length);for(var t=0,r=Array(n);t<n;t++)r[t]=e[t];return r}function ya(e,n){if(e){if(typeof e=="string")return va(e,n);var t={}.toString.call(e).slice(8,-1);return t==="Object"&&e.constructor&&(t=e.constructor.name),t==="Map"||t==="Set"?Array.from(e):t==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t)?va(e,n):void 0}}function bp(e){if(Array.isArray(e))return e}function xp(e,n){var t=e==null?null:typeof Symbol<"u"&&e[Symbol.iterator]||e["@@iterator"];if(t!=null){var r,a,i,o,s=[],l=!0,u=!1;try{if(i=(t=t.call(e)).next,n===0){if(Object(t)!==t)return;l=!1}else for(;!(l=(r=i.call(t)).done)&&(s.push(r.value),s.length!==n);l=!0);}catch(d){u=!0,a=d}finally{try{if(!l&&t.return!=null&&(o=t.return(),Object(o)!==o))return}finally{if(u)throw a}}return s}}function Sp(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function se(e,n){return bp(e)||xp(e,n)||ya(e,n)||Sp()}function U(e,n){var t=typeof Symbol<"u"&&e[Symbol.iterator]||e["@@iterator"];if(!t){if(Array.isArray(e)||(t=ya(e))||n&&e&&typeof e.length=="number"){t&&(e=t);var r=0,a=function(){};return{s:a,n:function(){return r>=e.length?{done:!0}:{done:!1,value:e[r++]}},e:function(l){throw l},f:a}}throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}var i,o=!0,s=!1;return{s:function(){t=t.call(e)},n:function(){var l=t.next();return o=l.done,l},e:function(l){s=!0,i=l},f:function(){try{o||t.return==null||t.return()}finally{if(s)throw i}}}}function Ue(){return Float32Array.of(1,0,0,0,1,0,0,0,1)}function gr(e,n,t){return e[0]=n,e[4]=typeof t=="number"?t:n,e}function oo(e,n){var t=Math.sin(n),r=Math.cos(n);return e[0]=r,e[1]=t,e[3]=-t,e[4]=r,e}function so(e,n,t){return e[6]=n,e[7]=t,e}function Rt(e,n){var t=e[0],r=e[1],a=e[2],i=e[3],o=e[4],s=e[5],l=e[6],u=e[7],d=e[8],c=n[0],h=n[1],g=n[2],p=n[3],m=n[4],b=n[5],v=n[6],x=n[7],y=n[8];return e[0]=c*t+h*i+g*l,e[1]=c*r+h*o+g*u,e[2]=c*a+h*s+g*d,e[3]=p*t+m*i+b*l,e[4]=p*r+m*o+b*u,e[5]=p*a+m*s+b*d,e[6]=v*t+x*i+y*l,e[7]=v*r+x*o+y*u,e[8]=v*a+x*s+y*d,e}function ba(e,n){var t=Math.cos(n),r=Math.sin(n);return{x:t*e.x+r*e.y,y:-r*e.x+t*e.y}}function tn(e,n){var t=arguments.length>2&&arguments[2]!==void 0?arguments[2]:1,r=e[0],a=e[1],i=e[3],o=e[4],s=e[6],l=e[7],u=n.x,d=n.y;return{x:u*r+d*i+s*t,y:u*a+d*o+l*t}}function Wl(e,n){var t=e.height/e.width,r=n.height/n.width;return t<1&&r>1||t>1&&r<1?1:Math.min(Math.max(r,1/r),Math.max(1/t,t))}function Dt(e,n,t,r,a){var i=e.angle,o=e.ratio,s=e.x,l=e.y,u=n.width,d=n.height,c=Ue(),h=Math.min(u,d)-2*r,g=Wl(n,t);return a?(Rt(c,so(Ue(),s,l)),Rt(c,gr(Ue(),o)),Rt(c,oo(Ue(),i)),Rt(c,gr(Ue(),u/h/2/g,d/h/2/g))):(Rt(c,gr(Ue(),2*(h/u)*g,2*(h/d)*g)),Rt(c,oo(Ue(),-i)),Rt(c,gr(Ue(),1/o)),Rt(c,so(Ue(),-s,-l))),c}function lo(e,n,t){var r=tn(e,{x:Math.cos(n.angle),y:Math.sin(n.angle)},0),a=r.x,i=r.y;return 1/Math.sqrt(Math.pow(a,2)+Math.pow(i,2))/t.width}function xa(e,n,t,r,a){var i=Math.floor(n/a*r),o=Math.floor(e.drawingBufferHeight/a-t/a*r);return[i,o]}var Ln={black:"#000000",silver:"#C0C0C0",gray:"#808080",grey:"#808080",white:"#FFFFFF",maroon:"#800000",red:"#FF0000",purple:"#800080",fuchsia:"#FF00FF",green:"#008000",lime:"#00FF00",olive:"#808000",yellow:"#FFFF00",navy:"#000080",blue:"#0000FF",teal:"#008080",aqua:"#00FFFF",darkblue:"#00008B",mediumblue:"#0000CD",darkgreen:"#006400",darkcyan:"#008B8B",deepskyblue:"#00BFFF",darkturquoise:"#00CED1",mediumspringgreen:"#00FA9A",springgreen:"#00FF7F",cyan:"#00FFFF",midnightblue:"#191970",dodgerblue:"#1E90FF",lightseagreen:"#20B2AA",forestgreen:"#228B22",seagreen:"#2E8B57",darkslategray:"#2F4F4F",darkslategrey:"#2F4F4F",limegreen:"#32CD32",mediumseagreen:"#3CB371",turquoise:"#40E0D0",royalblue:"#4169E1",steelblue:"#4682B4",darkslateblue:"#483D8B",mediumturquoise:"#48D1CC",indigo:"#4B0082",darkolivegreen:"#556B2F",cadetblue:"#5F9EA0",cornflowerblue:"#6495ED",rebeccapurple:"#663399",mediumaquamarine:"#66CDAA",dimgray:"#696969",dimgrey:"#696969",slateblue:"#6A5ACD",olivedrab:"#6B8E23",slategray:"#708090",slategrey:"#708090",lightslategray:"#778899",lightslategrey:"#778899",mediumslateblue:"#7B68EE",lawngreen:"#7CFC00",chartreuse:"#7FFF00",aquamarine:"#7FFFD4",skyblue:"#87CEEB",lightskyblue:"#87CEFA",blueviolet:"#8A2BE2",darkred:"#8B0000",darkmagenta:"#8B008B",saddlebrown:"#8B4513",darkseagreen:"#8FBC8F",lightgreen:"#90EE90",mediumpurple:"#9370DB",darkviolet:"#9400D3",palegreen:"#98FB98",darkorchid:"#9932CC",yellowgreen:"#9ACD32",sienna:"#A0522D",brown:"#A52A2A",darkgray:"#A9A9A9",darkgrey:"#A9A9A9",lightblue:"#ADD8E6",greenyellow:"#ADFF2F",paleturquoise:"#AFEEEE",lightsteelblue:"#B0C4DE",powderblue:"#B0E0E6",firebrick:"#B22222",darkgoldenrod:"#B8860B",mediumorchid:"#BA55D3",rosybrown:"#BC8F8F",darkkhaki:"#BDB76B",mediumvioletred:"#C71585",indianred:"#CD5C5C",peru:"#CD853F",chocolate:"#D2691E",tan:"#D2B48C",lightgray:"#D3D3D3",lightgrey:"#D3D3D3",thistle:"#D8BFD8",orchid:"#DA70D6",goldenrod:"#DAA520",palevioletred:"#DB7093",crimson:"#DC143C",gainsboro:"#DCDCDC",plum:"#DDA0DD",burlywood:"#DEB887",lightcyan:"#E0FFFF",lavender:"#E6E6FA",darksalmon:"#E9967A",violet:"#EE82EE",palegoldenrod:"#EEE8AA",lightcoral:"#F08080",khaki:"#F0E68C",aliceblue:"#F0F8FF",honeydew:"#F0FFF0",azure:"#F0FFFF",sandybrown:"#F4A460",wheat:"#F5DEB3",beige:"#F5F5DC",whitesmoke:"#F5F5F5",mintcream:"#F5FFFA",ghostwhite:"#F8F8FF",salmon:"#FA8072",antiquewhite:"#FAEBD7",linen:"#FAF0E6",lightgoldenrodyellow:"#FAFAD2",oldlace:"#FDF5E6",magenta:"#FF00FF",deeppink:"#FF1493",orangered:"#FF4500",tomato:"#FF6347",hotpink:"#FF69B4",coral:"#FF7F50",darkorange:"#FF8C00",lightsalmon:"#FFA07A",orange:"#FFA500",lightpink:"#FFB6C1",pink:"#FFC0CB",gold:"#FFD700",peachpuff:"#FFDAB9",navajowhite:"#FFDEAD",moccasin:"#FFE4B5",bisque:"#FFE4C4",mistyrose:"#FFE4E1",blanchedalmond:"#FFEBCD",papayawhip:"#FFEFD5",lavenderblush:"#FFF0F5",seashell:"#FFF5EE",cornsilk:"#FFF8DC",lemonchiffon:"#FFFACD",floralwhite:"#FFFAF0",snow:"#FFFAFA",lightyellow:"#FFFFE0",ivory:"#FFFFF0"},Ul=new Int8Array(4),ma=new Int32Array(Ul.buffer,0,1),$l=new Float32Array(Ul.buffer,0,1),_p=/^\s*rgba?\s*\(/,Tp=/^\s*rgba?\s*\(\s*([0-9]*)\s*,\s*([0-9]*)\s*,\s*([0-9]*)(?:\s*,\s*(.*)?)?\)\s*$/;function pr(e){var n=0,t=0,r=0,a=1,i=e.toLowerCase();if(i==="transparent")return{r:0,g:0,b:0,a:0};if(i in Ln)return pr(Ln[i]);if(e[0]==="#")e.length===4?(n=parseInt(e.charAt(1)+e.charAt(1),16),t=parseInt(e.charAt(2)+e.charAt(2),16),r=parseInt(e.charAt(3)+e.charAt(3),16)):(n=parseInt(e.charAt(1)+e.charAt(2),16),t=parseInt(e.charAt(3)+e.charAt(4),16),r=parseInt(e.charAt(5)+e.charAt(6),16)),e.length===9&&(a=parseInt(e.charAt(7)+e.charAt(8),16)/255);else if(_p.test(e)){var o=e.match(Tp);o&&(n=+o[1],t=+o[2],r=+o[3],o[4]&&(a=+o[4]))}return{r:n,g:t,b:r,a}}function mr(e){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:!1,t=pr(e),r=t.r,a=t.g,i=t.b,o=t.a;return n?[r/255*o,a/255*o,i/255*o,o]:[r/255,a/255,i/255,o]}var Pn={};for(fr in Ln)Pn[fr]=$e(Ln[fr]),Pn[Ln[fr]]=Pn[fr];var fr;function Hl(e,n,t,r,a){return ma[0]=r<<24|t<<16|n<<8|e,a&&(ma[0]=ma[0]&4278190079),$l[0]}function $e(e){if(e=e.toLowerCase(),typeof Pn[e]<"u")return Pn[e];var n=pr(e),t=n.r,r=n.g,a=n.b,i=n.a;i=i*255|0;var o=Hl(t,r,a,i,!0);return Pn[e]=o,o}function kt(e,n){$l[0]=$e(e);var t=ma[0];n&&(t=t|16777216);var r=t&255,a=t>>8&255,i=t>>16&255,o=t>>24&255;return[r,a,i,o]}function nn(e){var n=e>>>8&255,t=e>>>16&255,r=e>>>24&255,a=e&255;return(a<<24|r<<16|t<<8|n)>>>0}function Sa(e,n,t,r){return(t<<24|n<<16|e<<8|r)>>>0}function uo(e,n,t,r,a,i){var o=xa(e,t,r,a,i),s=se(o,2),l=s[0],u=s[1],d=new Uint8Array(4);e.bindFramebuffer(e.FRAMEBUFFER,n),e.readPixels(l,u,1,1,e.RGBA,e.UNSIGNED_BYTE,d);var c=se(d,4),h=c[0],g=c[1],p=c[2],m=c[3];return[h,g,p,m]}function co(e){var n=pr(e),t=n.r,r=n.g,a=n.b,i=n.a,o=(t/255).toFixed(6),s=(r/255).toFixed(6),l=(a/255).toFixed(6),u=i.toFixed(6);return"vec4(".concat(o,", ").concat(s,", ").concat(l,", ").concat(u,")")}function Ep(e,n){if(typeof e!="object"||!e)return e;var t;if(typeof Symbol<"u"&&(t=e[Symbol.toPrimitive])!==void 0){var r=t.call(e,n||"default");if(typeof r!="object")return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return(n==="string"?String:Number)(e)}function Vl(e){var n=Ep(e,"string");return typeof n=="symbol"?n:n+""}function C(e,n,t){return(n=Vl(n))in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function jl(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter(function(a){return Object.getOwnPropertyDescriptor(e,a).enumerable})),t.push.apply(t,r)}return t}function H(e){for(var n=1;n<arguments.length;n++){var t=arguments[n]!=null?arguments[n]:{};n%2?jl(Object(t),!0).forEach(function(r){C(e,r,t[r])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):jl(Object(t)).forEach(function(r){Object.defineProperty(e,r,Object.getOwnPropertyDescriptor(t,r))})}return e}function ae(e,n){if(!(e instanceof n))throw new TypeError("Cannot call a class as a function")}function ql(e,n){for(var t=0;t<n.length;t++){var r=n[t];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,Vl(r.key),r)}}function ie(e,n,t){return n&&ql(e.prototype,n),t&&ql(e,t),Object.defineProperty(e,"prototype",{writable:!1}),e}function rn(e){return rn=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(n){return n.__proto__||Object.getPrototypeOf(n)},rn(e)}function Xl(){try{var e=!Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],function(){}))}catch{}return(Xl=function(){return!!e})()}function wp(e){if(e===void 0)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}function Ap(e,n){if(n&&(typeof n=="object"||typeof n=="function"))return n;if(n!==void 0)throw new TypeError("Derived constructors may only return object or undefined");return wp(e)}function ye(e,n,t){return n=rn(n),Ap(e,Xl()?Reflect.construct(n,t||[],rn(e).constructor):n.apply(e,t))}function ho(e,n){return ho=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(t,r){return t.__proto__=r,t},ho(e,n)}function be(e,n){if(typeof n!="function"&&n!==null)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(n&&n.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),Object.defineProperty(e,"prototype",{writable:!1}),n&&ho(e,n)}function Rp(e){if(Array.isArray(e))return va(e)}function Dp(e){if(typeof Symbol<"u"&&e[Symbol.iterator]!=null||e["@@iterator"]!=null)return Array.from(e)}function kp(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function Z(e){return Rp(e)||Dp(e)||ya(e)||kp()}function re(e){"@babel/helpers - typeof";return re=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(n){return typeof n}:function(n){return n&&typeof Symbol=="function"&&n.constructor===Symbol&&n!==Symbol.prototype?"symbol":typeof n},re(e)}function lt(e){return re(e)==="object"&&e!==null&&"attribute"in e}function Ot(){var e=`
float sdf_circle(vec2 uv, float size) {
  return length(uv) - size;
}
`;return{name:"circle",glsl:e,uniforms:[]}}function vr(e){var n,t=WebGL2RenderingContext,r=t.UNSIGNED_BYTE,a=(n=e?.color)!==null&&n!==void 0?n:{attribute:"color"};if(!lt(a)){var i=a,o=`
vec4 layer_fill() {
  return `.concat(co(i),`;
}
`);return{name:"fill",uniforms:[],attributes:[],glsl:o}}var s=a.attribute,l=`
vec4 layer_fill(vec4 v_fillColor) {
  return v_fillColor;
}
`;return{name:"fill",uniforms:[],attributes:[{name:"fillColor",size:4,type:r,normalized:!0,source:s}],glsl:l}}function yr(e,n){if(typeof e=="string"){var t=mr(e).map(function(u){return u.toFixed(6)}),r=se(t,4),a=r[0],i=r[1],o=r[2],s=r[3];return{glsl:"vec4(".concat(a,", ").concat(i,", ").concat(o,", ").concat(s,")"),attributes:[],needsNodeColors:!1}}if("node"in e&&e.node)return{glsl:e.node==="source"?"v_sourceColor":"v_targetColor",attributes:[],needsNodeColors:!0};var l=e;return{glsl:"v_".concat(n),attributes:[{name:"a_".concat(n),size:4,type:WebGL2RenderingContext.UNSIGNED_BYTE,normalized:!0,source:l.attribute,defaultValue:l.default}],needsNodeColors:!1}}function Bt(e){var n=e?.color;if(n===void 0){var t=`
// Plain solid color layer
vec4 layer_plain(EdgeContext ctx) {
  return v_color;
}
`;return{name:"plain",glsl:t,uniforms:[],attributes:[]}}var r=yr(n,"plainColor"),a=`
// Plain solid color layer
vec4 layer_plain(EdgeContext ctx) {
  return `.concat(r.glsl,`;
}
`);return{name:"plain",glsl:a,uniforms:[],attributes:r.attributes,needsNodeColors:r.needsNodeColors}}function br(){var e=`
// Position at parameter t \u2208 [0, 1]
vec2 path_straight_position(float t, vec2 source, vec2 target) {
  return mix(source, target, t);
}

// Total length of the path (analytical - more efficient than sampling)
float path_straight_length(vec2 source, vec2 target) {
  return length(target - source);
}
`;return{name:"straight",segments:1,minBodyLengthRatio:0,linearParameterization:!0,glsl:e,uniforms:[],attributes:[]}}function xr(e){var n=e??{},t=n.segments,r=t===void 0?32:t,a=`
const float LOOP_PI = 3.141592653589793;

float loopWorldRadius() {
  float nodeWorldRadius = v_sourceNodeSize * u_correctionRatio / u_sizeRatio;
  return max(v_loopRadius * nodeWorldRadius, 0.001);
}

// Cubic B\xE9zier with P0 = P3 = source.
// Control points extend outward orthogonal to the node surface at exit/entry angles.
vec2 path_loop_position(float t, vec2 source, vec2 target) {
  float R = loopWorldRadius();
  float angle = v_loopAngle + (v_loopFixedOrientation > 0.5 ? u_cameraAngle : 0.0);
  float halfSpread = v_loopSpread * 0.5;

  float exitAngle = angle - halfSpread;
  float entryAngle = angle + halfSpread;

  // Control point distance: at t=0.5 the B\xE9zier reaches 0.75 * cpDist * cos(halfSpread)
  // from source. Solve for cpDist so the loop tip reaches exactly R.
  float cpDist = R / (0.75 * cos(halfSpread));

  vec2 cp1 = source + cpDist * vec2(cos(exitAngle), sin(exitAngle));
  vec2 cp2 = source + cpDist * vec2(cos(entryAngle), sin(entryAngle));

  float u = 1.0 - t;
  vec2 d1 = cp1 - source;
  vec2 d2 = cp2 - source;
  return source + 3.0 * t * u * (u * d1 + t * d2);
}

// Approximate arc length via chord sampling
float path_loop_length(vec2 source, vec2 target) {
  float len = 0.0;
  vec2 prev = path_loop_position(0.0, source, target);
  const int STEPS = 16;
  for (int i = 1; i <= STEPS; i++) {
    float t = float(i) / float(STEPS);
    vec2 cur = path_loop_position(t, source, target);
    len += length(cur - prev);
    prev = cur;
  }
  return len;
}
`;return{name:"loop",segments:r,glsl:a,needsNodeSize:!0,uniforms:[],attributes:[{name:"loopRadius",size:1,type:WebGL2RenderingContext.FLOAT},{name:"loopAngle",size:1,type:WebGL2RenderingContext.FLOAT},{name:"loopSpread",size:1,type:WebGL2RenderingContext.FLOAT},{name:"loopFixedOrientation",size:1,type:WebGL2RenderingContext.FLOAT}],variables:{loopRadius:{type:"number",default:4},loopAngle:{type:"number",default:Math.PI/4},loopSpread:{type:"number",default:80*Math.PI/180},loopFixedOrientation:{type:"number",default:0}},spread:{variable:"loopRadius",compute:function(o){return o+4}}}}var eu=We(Gt());function Yl(e){return re(e)==="object"&&"glsl"in e&&!("attributes"in e)}function Kl(e){return re(e)==="object"&&"glsl"in e&&!("attributes"in e)}var Sr={shapes:[Ot()],variables:{},layers:[vr()],label:{},backdrop:{},labelAttachments:{}},In={paths:[br(),xr()],extremities:[],variables:{},layers:[Bt()],defaultHead:"none",defaultTail:"none",label:{}},_a=["nodes","topNodes"],Ta=["edges","topEdges"],Ea=[].concat(Ta,_a),Zl={nodes:Sr,edges:In,depthLayers:Z(Ea)};var Cp=function(n){return n},Lp=function(n){return n*n},Pp=function(n){return n*(2-n)},Ip=function(n){return(n*=2)<1?.5*n*n:-.5*(--n*(n-2)-1)},Fp=function(n){return n*n*n},Mp=function(n){return--n*n*n+1},Np=function(n){return(n*=2)<1?.5*n*n*n:.5*((n-=2)*n*n+2)},zp=function(n){return n===0?0:Math.pow(2,10*(n-1))},Gp=function(n){return n===1?1:1-Math.pow(2,-10*n)},Op=function(n){return n===0?0:n===1?1:n<.5?Math.pow(2,10*(2*n-1))/2:(2-Math.pow(2,-10*(2*n-1)))/2},fo={linear:Cp,quadraticIn:Lp,quadraticOut:Pp,quadraticInOut:Ip,cubicIn:Fp,cubicOut:Mp,cubicInOut:Np,exponentialIn:zp,exponentialOut:Gp,exponentialInOut:Op};function wa(e){return e?typeof e=="function"?e:fo[e]:fo.linear}function po(e){return re(e)==="object"&&e!==null&&"attribute"in e}function tu(e){return typeof e=="function"}function nu(e){return re(e)==="object"&&e!==null&&"when"in e&&typeof e.when=="function"&&"then"in e}function ru(e){return re(e)==="object"&&e!==null&&"whenState"in e&&"then"in e}function au(e){return re(e)==="object"&&e!==null&&"whenData"in e&&"then"in e}var Bp={isHovered:!1,isLabelHovered:!1,isHidden:!1,isHighlighted:!1,isDragged:!1},Wp={isHovered:!1,isLabelHovered:!1,isHidden:!1,isHighlighted:!1,parallelIndex:0,parallelCount:1},Up={isIdle:!0,isPanning:!1,isZooming:!1,isDragging:!1,hasHovered:!1,hasHighlighted:!1};function iu(e){return H(H({},Bp),e)}function ou(e){return H(H({},Wp),e)}function mo(e){return H(H({},Up),e)}var $p={x:{attribute:"x"},y:{attribute:"y"},size:{whenState:"isHovered",then:{attribute:"size",defaultValue:12},else:{attribute:"size",defaultValue:10}},color:{attribute:"color",defaultValue:"#666"},label:{attribute:"label"},visibility:{whenState:"isHidden",then:"hidden",else:"visible"},labelVisibility:{whenState:"isHovered",then:"visible",else:"auto"},backdropVisibility:{whenState:"isHovered",then:"visible",else:"hidden"},backdropColor:"#ffffff",backdropShadowColor:"rgba(0, 0, 0, 0.5)",backdropShadowBlur:12,backdropPadding:6},Hp={size:{attribute:"size",defaultValue:1},color:{attribute:"color",defaultValue:"#ccc"},label:{attribute:"label"},visibility:{whenState:"isHidden",then:"hidden",else:"visible"}};var Ra={nodes:H(H({},$p),{},{depth:{whenState:"isHovered",then:"topNodes",else:"nodes"}}),edges:H(H({},Hp),{},{depth:{whenState:["isHighlighted","isHovered"],then:"topEdges",else:"edges"}})};function jp(e){return"min"in e||"max"in e||"minValue"in e||"maxValue"in e||"easing"in e}function qp(e){return"dict"in e}function Da(e,n){return typeof e=="string"?n[e]===!0:Array.isArray(e)?e.every(function(t){return n[t]===!0}):re(e)==="object"&&e!==null?Object.entries(e).every(function(t){var r=se(t,2),a=r[0],i=r[1];return n[a]===i}):!1}function Vp(e,n){var t=n[e.attribute];return t===void 0?e.defaultValue:t}function Xp(e,n,t){var r,a,i,o,s=n[e.attribute];if(s===void 0)return e.defaultValue;var l=Number(s);if(isNaN(l))return e.defaultValue;if(e.min===void 0&&e.max===void 0)return l;var u=(r=e.minValue)!==null&&r!==void 0?r:l,d=(a=e.maxValue)!==null&&a!==void 0?a:l;if(d===u){var c;return(c=e.min)!==null&&c!==void 0?c:l}var h=(l-u)/(d-u);h=Math.max(0,Math.min(1,h));var g=wa(e.easing);h=g(h);var p=(i=e.min)!==null&&i!==void 0?i:0,m=(o=e.max)!==null&&o!==void 0?o:1;return p+h*(m-p)}function Yp(e,n){var t=n[e.attribute];if(t===void 0)return e.defaultValue;var r=String(t);return r in e.dict?e.dict[r]:e.defaultValue}function Kp(e,n,t){return qp(e)?Yp(e,n):jp(e)?Xp(e,n):Vp(e,n)}function su(e,n){return typeof e=="string"?!!n[e]:Array.isArray(e)?e.every(function(t){return!!n[t]}):re(e)==="object"&&e!==null?Object.entries(e).every(function(t){var r=se(t,2),a=r[0],i=r[1];return n[a]===i}):!1}function Aa(e,n,t,r,a,i){if(e==null)return i;if(re(e)!=="object"&&typeof e!="function")return e;if(nu(e)){var o=e.when(n,t,r,a)?e.then:e.else;return o===void 0?i:Aa(o,n,t,r,a,i)}if(ru(e)){var s=Da(e.whenState,t)?e.then:e.else;return s===void 0?i:Aa(s,n,t,r,a,i)}if(au(e)){var l=su(e.whenData,n)?e.then:e.else;return l===void 0?i:Aa(l,n,t,r,a,i)}if(tu(e)){var u=e(n,t,r,a);return u??i}if(po(e)){var d=Kp(e,n);return d??i}return e}function ut(e){if(e==null)return"static";if(nu(e))return"graph-state";if(ru(e)){var n=ut(e.then),t=e.else!==void 0?ut(e.else):"static";return et("item-state",et(n,t))}if(au(e)){var r=ut(e.then),a=e.else!==void 0?ut(e.else):"static";return et(r,a)}return tu(e)?"graph-state":(po(e),"static")}function et(e,n){return e==="graph-state"||n==="graph-state"?"graph-state":e==="item-state"||n==="item-state"?"item-state":"static"}function vo(e){if(!e)return{dependency:"static",xAttribute:null,yAttribute:null};var n=Array.isArray(e)?e:[e],t="static",r=null,a=null,i=U(n),o;try{for(i.s();!(o=i.n()).done;){var s=o.value;if("matchData"in s&&"cases"in s)for(var l=s.cases,u=0,d=Object.values(l);u<d.length;u++)for(var c=d[u],h=0,g=Object.values(c);h<g.length;h++){var p=g[h];t=et(t,ut(p))}else if("matchState"in s&&"cases"in s){t=et(t,"item-state");for(var m=s.cases,b=0,v=Object.values(m);b<v.length;b++)for(var x=v[b],y=0,_=Object.values(x);y<_.length;y++){var S=_[y];t=et(t,ut(S))}}else if("when"in s&&"then"in s)t="graph-state";else if("whenState"in s){t=et(t,"item-state");var T=s.then;if(T&&re(T)==="object")for(var A=0,w=Object.values(T);A<w.length;A++){var E=w[A];t=et(t,ut(E))}var R=s.else;if(R&&re(R)==="object")for(var L=0,k=Object.values(R);L<k.length;L++){var P=k[L];t=et(t,ut(P))}}else if("whenData"in s){var D=s.then;if(D&&re(D)==="object")for(var I=0,G=Object.values(D);I<G.length;I++){var z=G[I];t=et(t,ut(z))}var F=s.else;if(F&&re(F)==="object")for(var M=0,W=Object.values(F);M<W.length;M++){var X=W[M];t=et(t,ut(X))}}else for(var q=0,te=Object.entries(s);q<te.length;q++){var Q=se(te[q],2),ee=Q[0],ot=Q[1];if(!bo.has(ee)&&(t=et(t,ut(ot)),(ee==="x"||ee==="y")&&po(ot))){var Oe=ot.attribute;ee==="x"&&!r&&(r=Oe),ee==="y"&&!a&&(a=Oe)}}}}catch(Et){i.e(Et)}finally{i.f()}return{dependency:t,xAttribute:r,yAttribute:a}}var Ct={size:10,color:"#666",opacity:1,shape:"circle",rotationAlignment:"viewport",labelRotationAlignment:"viewport",visibility:"visible",depth:"nodes",zIndex:0,label:"",labelColor:"#000",labelSize:12,labelFont:"sans-serif",labelVisibility:"auto",labelPosition:"right",labelAngle:0,labelDepth:"nodes",backdropVisibility:"hidden",backdropColor:"transparent",backdropShadowColor:"transparent",backdropShadowBlur:0,backdropPadding:0,backdropBorderColor:"transparent",backdropBorderWidth:0,backdropCornerRadius:0,backdropLabelPadding:-1,backdropArea:"both",labelAttachment:null,labelAttachmentPlacement:"below"},yo={size:1,color:"#ccc",opacity:1,path:"straight",selfLoopPath:"loop",parallelSpread:.25,tail:"none",head:"none",visibility:"visible",depth:"edges",zIndex:0,label:"",labelColor:"#666",labelVisibility:"auto",labelDepth:"edges"},bo=new Set(["when","whenState","whenData","then","else"]),Ql=Object.keys(Ct),Zp=Object.values(Ct),Jl=Object.keys(yo),Qp=Object.values(yo);function Fn(e,n,t,r,a,i,o){for(var s in n){var l;if(!bo.has(s)){var u=(l=e[s])!==null&&l!==void 0?l:o[s];e[s]=Aa(n[s],t,r,a,i,u)}}"depth"in n&&!("labelDepth"in n)&&(e.labelDepth=e.depth)}function lu(e,n,t,r,a,i,o){var s=U(n),l;try{for(s.s();!(l=s.n()).done;){var u=l.value;if("matchData"in u&&"cases"in u){var d,c=String((d=t[u.matchData])!==null&&d!==void 0?d:""),h=u.cases;c in h&&Fn(e,h[c],t,r,a,i,o)}else if("matchState"in u&&"cases"in u){var g,p=String((g=r[u.matchState])!==null&&g!==void 0?g:""),m=u.cases;p in m&&Fn(e,m[p],t,r,a,i,o)}else if("when"in u&&"then"in u){var b=u.when;if(!b(t,r,a,i))continue;Fn(e,u.then,t,r,a,i,o)}else if("whenState"in u&&"then"in u){if(!Da(u.whenState,r))continue;Fn(e,u.then,t,r,a,i,o)}else if("whenData"in u&&"then"in u){if(!su(u.whenData,t))continue;Fn(e,u.then,t,r,a,i,o)}else Fn(e,u,t,r,a,i,o)}}catch(v){s.e(v)}finally{s.f()}}function xo(e,n,t,r,a,i){for(var o=i||{},s=o,l=0,u=Ql.length;l<u;l++)s[Ql[l]]=Zp[l];if(s.x=void 0,s.y=void 0,s.labelBackgroundColor=void 0,s.labelBackgroundPadding=void 0,s.labelCursor=void 0,!e){var d,c,h,g,p;return s.x=(d=n.x)!==null&&d!==void 0?d:0,s.y=(c=n.y)!==null&&c!==void 0?c:0,o.size=(h=n.size)!==null&&h!==void 0?h:10,o.color=(g=n.color)!==null&&g!==void 0?g:"#666",o.label=(p=n.label)!==null&&p!==void 0?p:"",o}var m=Array.isArray(e)?e:[e];return lu(s,m,n,t,r,a,Ct),o}function So(e,n,t,r,a,i){for(var o=i||{},s=o,l=0,u=Jl.length;l<u;l++)s[Jl[l]]=Qp[l];if(!e){var d,c,h;return o.size=(d=n.size)!==null&&d!==void 0?d:1,o.color=(c=n.color)!==null&&c!==void 0?c:"#ccc",o.label=(h=n.label)!==null&&h!==void 0?h:"",o}var g=Array.isArray(e)?e:[e];return lu(s,g,n,t,r,a,yo),typeof s.labelPosition=="number"&&(s.labelPosition=void 0),o}function Jp(e,n,t){var r,a;if(e==null)return t;if(typeof e=="function")return(r=e(n))!==null&&r!==void 0?r:t;if(re(e)==="object"&&"when"in e){var i,o=e,s=o.when(n),l=s?o.then:o.else;return l===void 0?t:typeof l=="function"?(i=l(n))!==null&&i!==void 0?i:t:l??t}if(re(e)==="object"&&"whenState"in e){var u,d=e,c=Da(d.whenState,n),h=c?d.then:d.else;return h===void 0?t:typeof h=="function"?(u=h(n))!==null&&u!==void 0?u:t:h??t}return(a=e)!==null&&a!==void 0?a:t}function _o(e,n){var t={};if(!e)return t;var r=Array.isArray(e)?e:[e],a=U(r),i;try{for(a.s();!(i=a.n()).done;){var o=i.value;if("when"in o&&"then"in o){var s=o.when(n),l=s?o.then:o.else;l&&re(l)==="object"&&go(t,l,n)}else if("whenState"in o&&"then"in o){var u=Da(o.whenState,n),d=u?o.then:o.else;d&&re(d)==="object"&&go(t,d,n)}else go(t,o,n)}}catch(c){a.e(c)}finally{a.f()}return t}function go(e,n,t){for(var r=0,a=Object.entries(n);r<a.length;r++){var i=se(a[r],2),o=i[0],s=i[1];bo.has(o)||(e[o]=Jp(s,t))}}var ka=(function(e){function n(){var t;return ae(this,n),t=ye(this,n),t.rawEmitter=t,t}return be(n,e),ie(n)})(eu.EventEmitter);var uu=Zl;function To(e,n){var t=n.size;if(t!==0){var r=e.length;e.length+=t;var a=0;n.forEach(function(i){e[r+a]=i,a++})}}function du(e){e=e||{};for(var n=0,t=arguments.length<=1?0:arguments.length-1;n<t;n++){var r=n+1<1||arguments.length<=n+1?void 0:arguments[n+1];r&&Object.assign(e,r)}return e}function Mn(e,n){for(var t in n)if(Object.prototype.hasOwnProperty.call(n,t)&&n[t]!==e[t])return!0;return!1}function cu(e,n){var t=e,r=n;for(var a in t)if(Object.prototype.hasOwnProperty.call(t,a)&&t[a]!==r[a])return!1;for(var i in r)if(Object.prototype.hasOwnProperty.call(r,i)&&r[i]!==t[i])return!1;return!0}function an(e,n,t){t?e.add(n):e.delete(n)}var fu=We(on());var gu={easing:"quadraticInOut",duration:150};function Wt(e){return e.labelVisibility==="visible"&&e.visibility!=="hidden"}function Eo(e){return e.backdropVisibility==="visible"&&e.visibility!=="hidden"}function Ca(e){return[e.rotationAlignment==="graph"?1:0,e.labelRotationAlignment==="graph"?1:0]}function wo(e,n,t){var r=e[n];if(r)for(var a=0;a<r.length;a++){var i=r[a];if(!(t<i.offset||t>=i.offset+i.count)){if(i.count===1)r.splice(a,1);else if(t===i.offset)i.offset++,i.count--;else if(t===i.offset+i.count-1)i.count--;else{var o=t+1,s=i.offset+i.count-o;i.count=t-i.offset,r.splice(a+1,0,{offset:o,count:s})}return}}}function Ao(e,n,t){if(!e[n]){e[n]=[{offset:t,count:1}];return}for(var r=e[n],a=r.length,i=0;i<r.length;i++)if(t<r[i].offset){a=i;break}var o=a>0?r[a-1]:null,s=a<r.length?r[a]:null,l=o&&o.offset+o.count===t,u=s&&t+1===s.offset;l&&u?(o.count+=1+s.count,r.splice(a,1)):l?o.count++:u?(s.offset--,s.count++):r.splice(a,0,{offset:t,count:1})}function pu(e){if(!(0,fu.default)(e))throw new Error("Sigma: invalid graph instance.")}function La(e){var n=se(e.x,2),t=n[0],r=n[1],a=se(e.y,2),i=a[0],o=a[1],s=Math.max(r-t,o-i),l=(r+t)/2,u=(o+i)/2;(s===0||Math.abs(s)===1/0||isNaN(s))&&(s=1),isNaN(l)&&(l=0),isNaN(u)&&(u=0);var d=function(h){return{x:.5+(h.x-l)/s,y:.5+(h.y-u)/s}};return d.applyTo=function(c){c.x=.5+(c.x-l)/s,c.y=.5+(c.y-u)/s},d.inverse=function(c){return{x:l+s*(c.x-.5),y:u+s*(c.y-.5)}},d.ratio=s,d}var Pa={hideEdgesOnMove:!1,hideLabelsOnMove:!1,renderLabels:!0,renderEdgeLabels:!1,edgeLabelAnchors:"nodeLabels",enableEdgeEvents:!1,nodeLabelEvents:!1,edgeLabelEvents:!1,pickingDownSizingRatio:2,nodePickingPadding:0,edgePickingPadding:4,labelPickingPadding:10,stagePadding:30,minEdgeThickness:1.7,antiAliasingFeather:1,antialiasEdges:!0,antialiasNodes:!0,dragTimeout:100,draggedEventsTolerance:3,inertiaDuration:200,inertiaRatio:3,zoomDuration:250,zoomingRatio:1.7,doubleClickTimeout:300,doubleClickZoomingRatio:2.2,doubleClickZoomingDuration:200,tapMoveTolerance:10,zoomToSizeRatioFunction:Math.sqrt,itemSizesReference:"positions",autoRescale:!0,autoRescaleContent:"positions",enableNodeDrag:!1,getDraggedNodes:function(n){return[n]},dragPositionToAttributes:null,labelDensity:1,labelGridCellSize:100,labelRenderedSizeThreshold:6,labelPixelSnapping:!0,minCameraRatio:null,maxCameraRatio:null,enableCameraZooming:!0,enableCameraPanning:!0,enableCameraRotation:!0,enableCameraMouseRotation:!0,cameraPanBoundaries:null,gestureTarget:"graph",sharedGestureWheelMessage:"Use Ctrl + scroll to zoom the graph",sharedGestureAppleWheelMessage:"Use \u2318 + scroll to zoom the graph",sharedGestureTouchMessage:"Use two fingers to move the graph",allowInvalidContainer:!1,DEBUG_displayPickingLayer:!1,DEBUG_logShaders:!1,DEBUG_logRenderStats:!1,DEBUG_gpuTimerQueries:!1};function Ia(e){if(typeof e.labelDensity!="number"||e.labelDensity<0)throw new Error("Settings: invalid `labelDensity`. Expecting a positive number.");var n=e.minCameraRatio,t=e.maxCameraRatio;if(typeof n=="number"&&typeof t=="number"&&t<n)throw new Error("Settings: invalid camera ratio boundaries. Expecting `maxCameraRatio` to be greater than `minCameraRatio`.")}function mu(e){return du({},Pa,e)}var em=new Set(["italic","oblique"]),tm=new Set(["bold","bolder","lighter"]);function Fa(e){for(var n="normal",t="normal",r=e.trim(),a=r.split(/\s+/),i=0,o=0;o<a.length;o++){var s=a[o].toLowerCase();if(em.has(s))t=s,i=o+1;else if(tm.has(s)||/^\d{3}$/.test(s))n=s,i=o+1;else if(s==="normal")i=o+1;else break}var l=a.slice(i).join(" ");return{family:l||r,weight:n,style:t}}function Nn(e,n,t){var r=document.createElement(e);if(n)for(var a in n)r.style[a]=n[a];if(t)for(var i in t)r.setAttribute(i,t[i]);return r}function _r(){return typeof window.devicePixelRatio<"u"?window.devicePixelRatio:1}var Tu=We(Gt());function nm(e){var n=e.type===WebGL2RenderingContext.FLOAT&&!e.normalized,t=e.type===WebGL2RenderingContext.UNSIGNED_BYTE&&e.size===4&&e.normalized;if(!n&&!t)throw new Error('Attribute "'.concat(e.name,'" is invalid: only non-normalized FLOAT and normalized UNSIGNED_BYTE with size 4 are supported.'));return e.normalized?1:e.size}function Ba(e){var n=0;return e.forEach(function(t){return n+=nm(t)}),n}function Eu(e,n,t){var r=e==="VERTEX"?n.VERTEX_SHADER:n.FRAGMENT_SHADER,a=n.createShader(r);if(a===null)throw new Error("loadShader: error while creating the shader");n.shaderSource(a,t),n.compileShader(a);var i=n.getShaderParameter(a,n.COMPILE_STATUS);if(!i){var o=n.getShaderInfoLog(a);throw n.deleteShader(a),new Error(`loadShader: error while compiling the shader:
`.concat(o,`
`).concat(t))}return a}function Ua(e,n){return Eu("VERTEX",e,n)}function $a(e,n){return Eu("FRAGMENT",e,n)}function Ha(e,n){var t=e.createProgram();if(t===null)throw new Error("loadProgram: error while creating the program.");var r,a;for(r=0,a=n.length;r<a;r++)e.attachShader(t,n[r]);e.linkProgram(t);var i=e.getProgramParameter(t,e.LINK_STATUS);if(!i){var o=e.getProgramInfoLog(t);throw e.deleteProgram(t),new Error("loadProgram: error while linking the program: ".concat(o))}return t}function Ro(e){var n=e.gl,t=e.buffer,r=e.program,a=e.vertexShader,i=e.fragmentShader;n.deleteShader(a),n.deleteShader(i),n.deleteProgram(r),n.deleteBuffer(t)}function ge(e){return e%1===0?e.toFixed(1):e.toString()}var Wa=new Map,wu=new Map,rm=0;function Lo(e,n){var t,r=(t=e.variables)===null||t===void 0||(t=t[n.source||n.name.replace(/^a_/,"")])===null||t===void 0?void 0:t.default,a=typeof r=="number"?r:typeof n.defaultValue=="number"?n.defaultValue:0;return ge(a)}function Rr(e,n,t){var r,a=arguments.length>3&&arguments[3]!==void 0?arguments[3]:function(o){return"v_".concat(o.name.replace(/^a_/,""))},i=[n,t].concat(Z(e.uniforms.filter(function(o){return o.type==="float"}).map(function(o){var s;return ge((s=o.value)!==null&&s!==void 0?s:0)})),Z(((r=e.attributes)!==null&&r!==void 0?r:[]).map(a)));return"sdf_".concat(e.name,"(").concat(i.join(", "),")")}function am(e){var n,t=e.name,r=e.uniforms.filter(function(o){return o.type==="float"&&o.value!==void 0&&o.value!==0}).map(function(o){return"".concat(o.name.replace("u_",""),"=").concat(o.value)}).sort(),a=((n=e.attributes)!==null&&n!==void 0?n:[]).map(function(o){var s;return"".concat(o.name,"@").concat((s=o.source)!==null&&s!==void 0?s:"","=").concat(Lo(e,o))}),i=[].concat(Z(r),Z(a));return i.length>0&&(t+="#"+i.join("#")),t}function Au(e){var n=am(e);if(!Wa.has(n)){var t={},r=U(e.uniforms),a;try{for(r.s();!(a=r.n()).done;){var i=a.value;i.type==="float"&&i.value!==void 0&&(t[i.name]=i.value)}}catch(o){r.e(o)}finally{r.f()}Wa.set(n,{shape:e,uniformValues:t,slug:n}),wu.set(n,rm++)}return n}function Gn(e){var n;return(n=wu.get(e))!==null&&n!==void 0?n:-1}function Ru(e){var n=[],t=new Set,r=new Set,a=/mat2 rotate2D\(float angle\)\s*\{[^}]+\}/,i=U(e),o;try{for(i.s();!(o=i.n()).done;){var s=o.value;if(!r.has(s.name)){r.add(s.name);var l=s.glsl;a.test(l)&&(t.has("rotate2D")?l=l.replace(a,""):t.add("rotate2D")),n.push(l)}}}catch(u){i.e(u)}finally{i.f()}return n.join(`
`)}function Du(){return Ru(Array.from(Wa.values()).map(function(e){return e.shape}))}function ku(e){var n=Array.from(Wa.entries());if(n.length===0)return`
float querySDF(int shapeId, vec2 uv, float size) {
  return length(uv) - size;
}
`;var t=n.map(function(r,a){var i=se(r,2),o=i[0],s=i[1].shape,l=Rr(s,"uv","size",function(u){var d=u.name.replace(/^a_/,"");return e!=null&&e.has(d)?"g_".concat(d):Lo(s,u)});return"    case ".concat(a,": return ").concat(l,"; // ").concat(o)}).join(`
`);return`
float querySDF(int shapeId, vec2 uv, float size) {
  switch (shapeId) {
`.concat(t,`
    default: return length(uv) - size;
  }
}
`)}function ja(e){return Ru(e)}function On(e){return Z(new Map(e.flatMap(function(n){return n.uniforms}).map(function(n){return[n.name,n]})).values())}function Cu(e,n){if(e.length===0)return`
void queryNodeSDF(int shapeId, vec2 uv, float size) {
  context.sdf = length(uv) - size;
  context.inradiusFactor = 1.0;
}
`;var t=function(c){return Rr(c,"uv","size")},r=function(c){var h,g;return(h=c.inradiusFactorGLSL)!==null&&h!==void 0?h:ge((g=c.inradiusFactor)!==null&&g!==void 0?g:1)};if(e.length===1){var a=e[0];return`
void queryNodeSDF(int shapeId, vec2 uv, float size) {
  context.sdf = `.concat(t(a),`;
  context.inradiusFactor = `).concat(r(a),`;
}
`)}var i=e.map(function(d,c){return"    case ".concat(c,": // ").concat(d.name,`
      context.sdf = `).concat(t(d),`;
      context.inradiusFactor = `).concat(r(d),`;
      break;`)}).join(`
`),o=e[0],s="",l="shapeId";if(n&&n.length>1){var u=n.map(function(d,c){return"    case ".concat(d,": return ").concat(c,"; // ").concat(e[c].name)}).join(`
`);s=`
int globalToLocalShapeId(int globalId) {
  switch (globalId) {
`.concat(u,`
    default: return 0;
  }
}
`),l="globalToLocalShapeId(shapeId)"}return"".concat(s,`
void queryNodeSDF(int shapeId, vec2 uv, float size) {
  switch (`).concat(l,`) {
`).concat(i,`
    default:
      context.sdf = `).concat(t(o),`;
      context.inradiusFactor = `).concat(r(o),`;
  }
}
`)}var ln={right:0,left:1,above:2,below:3,over:4},un=5,qa=3,Po=`
float matrixScaleX = length(vec2(u_matrix[0][0], u_matrix[1][0]));
float nodeRadiusGraphSpace = nodeSize * u_correctionRatio / u_sizeRatio * 2.0;
float nodeRadiusNDC = nodeRadiusGraphSpace * matrixScaleX;
float nodeRadiusPixels = nodeRadiusNDC * u_resolution.x / 2.0;
`,Bn=`
mat2 rotate2D(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}
`,Io=`
vec2 getLabelDirection(float positionMode) {
  if (positionMode < 0.5) return vec2(1.0, 0.0);   // Right
  if (positionMode < 1.5) return vec2(-1.0, 0.0);  // Left
  if (positionMode < 2.5) return vec2(0.0, -1.0);  // Above
  if (positionMode < 3.5) return vec2(0.0, 1.0);   // Below
  return vec2(0.0);                                 // Over (centered)
}
`,Lu=`
float sdfBox(vec2 p, vec2 halfSize) {
  vec2 d = abs(p) - halfSize;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
`,Pu=`
float sdfRotatedBox(vec2 p, vec2 halfSize, float angle) {
  float c = cos(-angle);
  float s = sin(-angle);
  vec2 rotatedP = mat2(c, -s, s, c) * p;
  return sdfBox(rotatedP, halfSize);
}
`,Iu=`
float sdfRoundedBox(vec2 p, vec2 halfSize, float radius) {
  vec2 d = abs(p) - halfSize + radius;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - radius;
}
`,Fu=`
float sdfRoundedRotatedBox(vec2 p, vec2 halfSize, float angle, float radius) {
  float c = cos(-angle);
  float s = sin(-angle);
  vec2 rotatedP = mat2(c, -s, s, c) * p;
  return sdfRoundedBox(rotatedP, halfSize, radius);
}
`,Fo=`
vec2 labelBoxCenter(float positionMode, float labelStart, vec2 halfSize, float textHalfY) {
  if (positionMode < 0.5) return vec2(labelStart + halfSize.x, 0.0);    // right
  if (positionMode < 1.5) return vec2(-(labelStart + halfSize.x), 0.0); // left
  if (positionMode < 2.5) return vec2(0.0, -(labelStart + textHalfY));  // above
  if (positionMode < 3.5) return vec2(0.0, labelStart + textHalfY);     // below
  return vec2(0.0);                                                     // over
}
`,Va=2,gt=`
vec4 readNodeData(sampler2D nodeDataTexture, int nodeDataTextureWidth, int nodeIndex) {
  int t = nodeIndex * `.concat(Va,`;
  ivec2 coord = ivec2(t % nodeDataTextureWidth, t / nodeDataTextureWidth);
  return texelFetch(nodeDataTexture, coord, 0);
}
`),Ht=`
vec4 readNodeFlags(sampler2D nodeDataTexture, int nodeDataTextureWidth, int nodeIndex) {
  int t = nodeIndex * `.concat(Va,` + 1;
  ivec2 coord = ivec2(t % nodeDataTextureWidth, t / nodeDataTextureWidth);
  return texelFetch(nodeDataTexture, coord, 0);
}
`),Mu=`
vec4 readNodeColor(sampler2D nodeDataTexture, int nodeDataTextureWidth, int nodeIndex) {
  int t = nodeIndex * `.concat(Va,` + 1;
  ivec2 coord = ivec2(t % nodeDataTextureWidth, t / nodeDataTextureWidth);
  vec4 texel = texelFetch(nodeDataTexture, coord, 0);
  float r = floor(texel.b / 65536.0);
  float g = floor(mod(texel.b, 65536.0) / 256.0);
  float b = mod(texel.b, 256.0);
  return vec4(r / 255.0, g / 255.0, b / 255.0, texel.a);
}
`),dn=`
vec4 readFrameTexel(sampler2D frameTexture, int frameTextureWidth, int index) {
  ivec2 coord = ivec2(index % frameTextureWidth, index / frameTextureWidth);
  return texelFetch(frameTexture, coord, 0);
}
`;function Nu(e,n){var t=function(o){return Rr(o,"uv","size")};if(e.length===1)return{code:vu(t(e[0])),multiShape:!1};var r=e.map(function(i,o){return"    case ".concat(n?n[o]:o,": return ").concat(t(i),";")}).join(`
`),a=`
float queryShapeSDF(int shapeId, vec2 uv, float size) {
  switch (shapeId) {
`.concat(r,`
    default: return `).concat(t(e[0]),`;
  }
}
int g_shapeId;
`).concat(vu("queryShapeSDF(g_shapeId, uv, size)"),`
`);return{code:a,multiShape:!0}}function vu(e){return`
float findEdgeDistance(vec2 direction, float size) {
  float lo = 0.0, hi = 2.0;
  for (int i = 0; i < 8; i++) {
    float mid = (lo + hi) * 0.5;
    vec2 uv = direction * mid;
    if (`.concat(e,` < 0.0) lo = mid; else hi = mid;
  }
  return (lo + hi) * 0.5;
}
`)}function im(e,n){for(;!{}.hasOwnProperty.call(e,n)&&(e=rn(e))!==null;);return e}function Do(){return Do=typeof Reflect<"u"&&Reflect.get?Reflect.get.bind():function(e,n,t){var r=im(e,n);if(r){var a=Object.getOwnPropertyDescriptor(r,n);return a.get?a.get.call(arguments.length<3?e:t):a.value}},Do.apply(null,arguments)}function Ce(e,n,t,r){var a=Do(rn(1&r?e.prototype:e),n,t);return 2&r&&typeof a=="function"?function(i){return a.apply(t,i)}:a}var om=1024,sm=1.5,zu=-1,Dr=(function(){function e(n,t){var r=arguments.length>2&&arguments[2]!==void 0?arguments[2]:om;ae(this,e),C(this,"texture",null),C(this,"dirty",!1),C(this,"dirtyRangeStart",1/0),C(this,"dirtyRangeEnd",-1),C(this,"indexMap",new Map),C(this,"freeIndices",[]),C(this,"nextIndex",0),this.gl=n,this.maxTextureSize=n.getParameter(n.MAX_TEXTURE_SIZE),this.TEXELS_PER_ITEM=t,this.capacity=this.roundUpToPowerOfTwo(r);var a=this.computeTextureDimensions(this.capacity);this.textureWidth=a.width,this.textureHeight=a.height,this.data=new Float32Array(this.textureWidth*this.textureHeight*4),this.createTexture()}return ie(e,[{key:"computeTextureDimensions",value:function(t){var r=t*this.TEXELS_PER_ITEM,a=Math.min(r,this.maxTextureSize),i=Math.ceil(r/a);return{width:a,height:i}}},{key:"roundUpToPowerOfTwo",value:function(t){return Math.pow(2,Math.ceil(Math.log2(Math.max(1,t))))}},{key:"createTexture",value:function(){var t=this.gl;this.texture=t.createTexture(),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,this.texture),t.texImage2D(t.TEXTURE_2D,0,t.RGBA32F,this.textureWidth,this.textureHeight,0,t.RGBA,t.FLOAT,this.data),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.bindTexture(t.TEXTURE_2D,null)}},{key:"resize",value:function(t){if(!(t<=this.capacity)){var r=this.roundUpToPowerOfTwo(Math.ceil(t*sm)),a=this.gl,i=this.computeTextureDimensions(r),o=new Float32Array(i.width*i.height*4);o.set(this.data),this.texture&&a.deleteTexture(this.texture),this.data=o,this.capacity=r,this.textureWidth=i.width,this.textureHeight=i.height,this.createTexture(),this.dirty=!0,this.dirtyRangeStart=0,this.dirtyRangeEnd=this.nextIndex}}},{key:"allocate",value:function(t){var r=this.indexMap.get(t);if(r!==void 0)return r;var a;return this.freeIndices.length>0?a=this.freeIndices.pop():(a=this.nextIndex++,a>=this.capacity&&this.resize(a+1)),this.indexMap.set(t,a),a}},{key:"free",value:function(t){var r=this.indexMap.get(t);if(r!==void 0){this.indexMap.delete(t),this.freeIndices.push(r);for(var a=r*this.TEXELS_PER_ITEM*4,i=0;i<this.TEXELS_PER_ITEM*4;i++)this.data[a+i]=0;this.markDirty(r)}}},{key:"getIndex",value:function(t){var r;return(r=this.indexMap.get(t))!==null&&r!==void 0?r:-1}},{key:"has",value:function(t){return this.indexMap.has(t)}},{key:"markDirty",value:function(t){this.dirty=!0,this.dirtyRangeStart=Math.min(this.dirtyRangeStart,t),this.dirtyRangeEnd=Math.max(this.dirtyRangeEnd,t+1)}},{key:"upload",value:function(){if(!(!this.dirty||!this.texture)){var t=this.gl,r=this.textureWidth;t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,this.texture);var a=this.dirtyRangeStart*this.TEXELS_PER_ITEM,i=Math.min(this.dirtyRangeEnd*this.TEXELS_PER_ITEM,this.capacity*this.TEXELS_PER_ITEM);if(a<i)for(var o=Math.floor(a/r),s=Math.floor((i-1)/r),l=o;l<=s;l++){var u=l*r,d=Math.min(u+r,this.capacity*this.TEXELS_PER_ITEM),c=Math.max(a,u),h=Math.min(i,d);if(c<h){var g=c-u,p=h-c,m=this.data.subarray(c*4,h*4);t.texSubImage2D(t.TEXTURE_2D,0,g,l,p,1,t.RGBA,t.FLOAT,m)}}t.bindTexture(t.TEXTURE_2D,null),this.dirty=!1,this.dirtyRangeStart=1/0,this.dirtyRangeEnd=-1}}},{key:"bind",value:function(t){var r=this.gl;r.activeTexture(r.TEXTURE0+t),r.bindTexture(r.TEXTURE_2D,this.texture)}},{key:"getTexture",value:function(){return this.texture}},{key:"getCapacity",value:function(){return this.capacity}},{key:"getTextureWidth",value:function(){return this.textureWidth}},{key:"getTextureHeight",value:function(){return this.textureHeight}},{key:"getTexelsPerItem",value:function(){return this.TEXELS_PER_ITEM}},{key:"getCount",value:function(){return this.indexMap.size}},{key:"getHighWaterMark",value:function(){return this.nextIndex}},{key:"isDirty",value:function(){return this.dirty}},{key:"clear",value:function(){this.indexMap.clear(),this.freeIndices=[],this.nextIndex=0,this.data.fill(0),this.dirty=!0,this.dirtyRangeStart=0,this.dirtyRangeEnd=this.capacity}},{key:"restore",value:function(){this.createTexture(),this.dirty=!1,this.dirtyRangeStart=1/0,this.dirtyRangeEnd=-1}},{key:"kill",value:function(){this.texture&&(this.gl.deleteTexture(this.texture),this.texture=null),this.indexMap.clear(),this.freeIndices=[]}}])})();function tt(e){var n={},t={},r=0,a=U(e),i;try{for(a.s();!(i=a.n()).done;){var o=i.value,s=U(o.attributes),l;try{for(s.s();!(l=s.n()).done;){var u=l.value,d=u.name.replace(/^a_/,"");d in n||(n[d]=r,t[d]=u,r+=u.size)}}catch(c){s.e(c)}finally{s.f()}}}catch(c){a.e(c)}finally{a.f()}return{floatsPerItem:r,texelsPerItem:Math.max(1,Math.ceil(r/4)),offsets:n,specs:t}}var Xa=(function(e){function n(t,r,a){var i;return ae(this,n),i=ye(this,n,[t,r.texelsPerItem,a]),i.floatsPerItem=r.floatsPerItem,i}return be(n,e),ie(n,[{key:"updateAllAttributes",value:function(r,a){var i=this.indexMap.get(r);i===void 0&&(i=this.allocate(r));for(var o=i*this.TEXELS_PER_ITEM*4,s=Math.min(a.length,this.floatsPerItem),l=0;l<s;l++)this.data[o+l]=a[l];this.markDirty(i)}},{key:"updateAllAttributesAtRow",value:function(r,a){r>=this.capacity&&this.resize(r+1);for(var i=r*this.TEXELS_PER_ITEM*4,o=Math.min(a.length,this.floatsPerItem),s=0;s<o;s++)this.data[i+s]=a[s];this.markDirty(r)}}])})(Dr);function Ya(e,n,t){for(var r=[],a=new Set,i=0;i<e.length;i++){var o=e[i],s=U(o.attributes),l;try{for(s.s();!(l=s.n()).done;){var u=l.value,d=u.name.replace(/^a_/,"");if(!a.has(d)){a.add(d);var c=n.offsets[d];if(c!==void 0){var h=t?.get(i);r.push({sourceKey:u.source||d,packedOffset:c,size:u.size,isColor:u.size===4&&!!u.normalized,defaultNum:typeof u.defaultValue=="number"?u.defaultValue:u.defaultValue===!0?1:0,defaultColor:typeof u.defaultValue=="string"?u.defaultValue:"",sourceIndex:i,hasLifecycleHook:!!(h!=null&&h.getAttributeData)})}}}}catch(g){s.e(g)}finally{s.f()}}return r}function Ka(e,n,t,r,a,i){t.fill(0);for(var o=0,s=e.length;o<s;o++){var l=e[o],u=l.packedOffset,d=void 0;if(l.hasLifecycleHook){var c=a.get(l.sourceIndex-i);d=c.getAttributeData(n,l.sourceKey),d===null&&(d=n[l.sourceKey])}else d=n[l.sourceKey];if(l.isColor){var h=typeof d=="string"?d:l.defaultColor||r,g=kt(h),p=se(g,4),m=p[0],b=p[1],v=p[2],x=p[3];t[u]=m/255,t[u+1]=b/255,t[u+2]=v/255,t[u+3]=x/255}else if(l.size===1)t[u]=typeof d=="number"?d:typeof d=="boolean"?d?1:0:l.defaultNum;else{var y=Array.isArray(d)?d:null;if(y)for(var _=0;_<l.size;_++){var S;t[u+_]=(S=y[_])!==null&&S!==void 0?S:0}}}}var Ma=["r","g","b","a"];function zn(e,n){var t=e.offsets,r=e.specs,a=e.texelsPerItem,i=e.floatsPerItem,o=Object.keys(t);if(o.length===0||i===0)return{fetchCode:"",varyingAssignments:""};var s=n.varPrefix,l=n.baseTexelExpr,u=n.textureWidthUniform,d=n.textureSamplerUniform,c=n.outputPrefix,h=c===void 0?"v_":c,g=[];g.push("  int ".concat(s,"BaseTexel = ").concat(l,";")),g.push("");for(var p=0;p<a;p++)g.push("  ivec2 ".concat(s,"Coord").concat(p," = ivec2((").concat(s,"BaseTexel + ").concat(p,") % ").concat(u,", (").concat(s,"BaseTexel + ").concat(p,") / ").concat(u,");")),g.push("  vec4 ".concat(s,"Texel").concat(p," = texelFetch(").concat(d,", ").concat(s,"Coord").concat(p,", 0);"));g.push("");for(var m=[],b=function(){var _=x[v],S=r[_],T=t[_],A=Math.floor(T/4),w=T%4,E="".concat(s,"Texel").concat(A),R="".concat(s,"Texel").concat(A+1),L="".concat(s,"Fetched_").concat(_);if(S.size===1)g.push("  float ".concat(L," = ").concat(E,".").concat(Ma[w],";"));else if(S.size===4&&w===0)g.push("  vec4 ".concat(L," = ").concat(E,";"));else{var k=w+S.size;if(k<=4){var P="vec".concat(S.size),D=Ma.slice(w,k).join("");g.push("  ".concat(P," ").concat(L," = ").concat(E,".").concat(D,";"))}else{var I=S.size===4?"vec4":"vec".concat(S.size),G=Ma.slice(w).map(function(M){return"".concat(E,".").concat(M)}),z=Ma.slice(0,k-4).map(function(M){return"".concat(R,".").concat(M)}),F=[].concat(Z(G),Z(z)).join(", ");g.push("  ".concat(I," ").concat(L," = ").concat(I,"(").concat(F,");"))}}m.push("  ".concat(h).concat(_," = ").concat(L,";"))},v=0,x=o;v<x.length;v++)b();return{fetchCode:g.join(`
`),varyingAssignments:m.join(`
`)}}function Mo(e,n,t){if(!(!n||t.type==="sampler2D"))switch(t.type){case"float":e.uniform1f(n,t.value);break;case"int":case"bool":e.uniform1i(n,t.value);break;case"vec2":e.uniform2fv(n,t.value);break;case"vec3":e.uniform3fv(n,t.value);break;case"vec4":e.uniform4fv(n,t.value);break;case"mat3":e.uniformMatrix3fv(n,!1,t.value);break;case"mat4":e.uniformMatrix4fv(n,!1,t.value);break}}var lm=C(C(C(C(C(C(C(C({},WebGL2RenderingContext.BOOL,1),WebGL2RenderingContext.BYTE,1),WebGL2RenderingContext.UNSIGNED_BYTE,1),WebGL2RenderingContext.SHORT,2),WebGL2RenderingContext.UNSIGNED_SHORT,2),WebGL2RenderingContext.INT,4),WebGL2RenderingContext.UNSIGNED_INT,4),WebGL2RenderingContext.FLOAT,4);function Na(e){var n=e.match(/^(#version[^\n]*\n)/);return n?n[1]+`#define PICKING_MODE
`+e.slice(n[1].length):`#define PICKING_MODE
`+e}var jt=(function(){function e(n,t,r){ae(this,e),C(this,"floats",new Float32Array),C(this,"ints",new Uint32Array),C(this,"constantArray",new Float32Array),C(this,"capacity",0),C(this,"verticesCount",0),C(this,"bufferGeneration",0),C(this,"uploadedGeneration",new Map),C(this,"constantBufferGeneration",0),C(this,"uploadedConstantGeneration",new Map),C(this,"renderOffset",0),C(this,"renderCount",-1),C(this,"debugStats",{drawCalls:0,verticesDrawn:0,bufferUploadBytes:0}),C(this,"shadersLogged",!1),C(this,"pickProgram",null);var a=this.getDefinition();if(this.VERTICES=a.VERTICES,this.VERTEX_SHADER_SOURCE=a.VERTEX_SHADER_SOURCE,this.FRAGMENT_SHADER_SOURCE=a.FRAGMENT_SHADER_SOURCE,this.UNIFORMS=a.UNIFORMS,this.ATTRIBUTES=a.ATTRIBUTES,this.METHOD=a.METHOD,this.CONSTANT_ATTRIBUTES="CONSTANT_ATTRIBUTES"in a?a.CONSTANT_ATTRIBUTES:[],this.CONSTANT_DATA="CONSTANT_DATA"in a?a.CONSTANT_DATA:[],this.isInstanced="CONSTANT_ATTRIBUTES"in a,this.ATTRIBUTES_ITEMS_COUNT=Ba(this.ATTRIBUTES),this.STRIDE=this.VERTICES*this.ATTRIBUTES_ITEMS_COUNT,this.renderer=r,this.normalProgram=this.getProgramInfo("normal",n,a.VERTEX_SHADER_SOURCE,a.FRAGMENT_SHADER_SOURCE,null),this.pickProgram=this.getProgramInfo("pick",n,Na(a.VERTEX_SHADER_SOURCE),Na(a.FRAGMENT_SHADER_SOURCE),null),this.isInstanced){var i=Ba(this.CONSTANT_ATTRIBUTES);if(this.CONSTANT_DATA.length!==this.VERTICES)throw new Error("Program: error while getting constant data (expected ".concat(this.VERTICES," items, received ").concat(this.CONSTANT_DATA.length," instead)"));this.constantArray=new Float32Array(this.CONSTANT_DATA.length*i);for(var o=0;o<this.CONSTANT_DATA.length;o++){var s=this.CONSTANT_DATA[o];if(s.length!==i)throw new Error("Program: error while getting constant data (one vector has ".concat(s.length," items instead of ").concat(i,")"));for(var l=0;l<s.length;l++)this.constantArray[o*i+l]=s[l]}this.STRIDE=this.ATTRIBUTES_ITEMS_COUNT}}return ie(e,[{key:"kill",value:function(){Ro(this.normalProgram),this.pickProgram&&Ro(this.pickProgram)}},{key:"resetDebugStats",value:function(){this.debugStats.drawCalls=0,this.debugStats.verticesDrawn=0,this.debugStats.bufferUploadBytes=0}},{key:"getProgramInfo",value:function(t,r,a,i,o){var s=r.createBuffer();if(s===null)throw new Error("Program: error while creating the WebGL buffer.");var l=Ua(r,a),u=$a(r,i),d=Ha(r,[l,u]),c={};this.UNIFORMS.forEach(function(p){var m=r.getUniformLocation(d,p);m&&(c[p]=m)});var h={};this.ATTRIBUTES.forEach(function(p){h[p.name]=r.getAttribLocation(d,p.name)});var g;if(this.isInstanced&&(this.CONSTANT_ATTRIBUTES.forEach(function(p){h[p.name]=r.getAttribLocation(d,p.name)}),g=r.createBuffer(),g===null))throw new Error("Program: error while creating the WebGL constant buffer.");return{name:t,program:d,gl:r,frameBuffer:o,buffer:s,constantBuffer:g||{},uniformLocations:c,attributeLocations:h,isPicking:t==="pick",vertexShader:l,fragmentShader:u}}},{key:"bindProgram",value:function(t){var r=this,a=0,i=t.gl,o=t.buffer;if(this.isInstanced){if(i.bindBuffer(i.ARRAY_BUFFER,t.constantBuffer),a=0,this.CONSTANT_ATTRIBUTES.forEach(function(d){return a+=r.bindAttribute(d,t,a,!1)}),this.uploadedConstantGeneration.get(t.constantBuffer)!==this.constantBufferGeneration){var l;i.bufferData(i.ARRAY_BUFFER,this.constantArray,i.STATIC_DRAW),this.uploadedConstantGeneration.set(t.constantBuffer,this.constantBufferGeneration),(l=this.renderer)!==null&&l!==void 0&&l.getSetting("DEBUG_logRenderStats")&&(this.debugStats.bufferUploadBytes+=this.constantArray.byteLength)}if(i.bindBuffer(i.ARRAY_BUFFER,t.buffer),a=this.renderOffset*this.ATTRIBUTES_ITEMS_COUNT*Float32Array.BYTES_PER_ELEMENT,this.ATTRIBUTES.forEach(function(d){return a+=r.bindAttribute(d,t,a,!0)}),this.uploadedGeneration.get(o)!==this.bufferGeneration){var u;i.bufferData(i.ARRAY_BUFFER,this.floats,i.DYNAMIC_DRAW),this.uploadedGeneration.set(o,this.bufferGeneration),(u=this.renderer)!==null&&u!==void 0&&u.getSetting("DEBUG_logRenderStats")&&(this.debugStats.bufferUploadBytes+=this.floats.byteLength)}}else if(i.bindBuffer(i.ARRAY_BUFFER,o),a=0,this.ATTRIBUTES.forEach(function(d){return a+=r.bindAttribute(d,t,a)}),this.uploadedGeneration.get(o)!==this.bufferGeneration){var s;i.bufferData(i.ARRAY_BUFFER,this.floats,i.DYNAMIC_DRAW),this.uploadedGeneration.set(o,this.bufferGeneration),(s=this.renderer)!==null&&s!==void 0&&s.getSetting("DEBUG_logRenderStats")&&(this.debugStats.bufferUploadBytes+=this.floats.byteLength)}i.bindBuffer(i.ARRAY_BUFFER,null)}},{key:"unbindProgram",value:function(t){var r=this;this.isInstanced?(this.CONSTANT_ATTRIBUTES.forEach(function(a){return r.unbindAttribute(a,t,!1)}),this.ATTRIBUTES.forEach(function(a){return r.unbindAttribute(a,t,!0)})):this.ATTRIBUTES.forEach(function(a){return r.unbindAttribute(a,t)})}},{key:"bindAttribute",value:function(t,r,a,i){var o=lm[t.type];if(typeof o!="number")throw new Error('Program.bind: yet unsupported attribute type "'.concat(t.type,'"'));var s=r.attributeLocations[t.name],l=r.gl;if(s!==-1){l.enableVertexAttribArray(s);var u=this.isInstanced?(i?this.ATTRIBUTES_ITEMS_COUNT:Ba(this.CONSTANT_ATTRIBUTES))*Float32Array.BYTES_PER_ELEMENT:this.ATTRIBUTES_ITEMS_COUNT*Float32Array.BYTES_PER_ELEMENT;l.vertexAttribPointer(s,t.size,t.type,t.normalized||!1,u,a),this.isInstanced&&i&&l.vertexAttribDivisor(s,1)}return t.size*o}},{key:"unbindAttribute",value:function(t,r,a){var i=r.attributeLocations[t.name],o=r.gl;i!==-1&&(o.disableVertexAttribArray(i),this.isInstanced&&a&&o.vertexAttribDivisor(i,0))}},{key:"reallocate",value:function(t){t!==this.capacity&&(this.capacity=t,this.verticesCount=this.VERTICES*t,this.floats=new Float32Array(this.isInstanced?this.capacity*this.ATTRIBUTES_ITEMS_COUNT:this.verticesCount*this.ATTRIBUTES_ITEMS_COUNT),this.ints=new Uint32Array(this.floats.buffer),this.invalidateBuffers())}},{key:"invalidateBuffers",value:function(){this.bufferGeneration++,this.constantBufferGeneration++}},{key:"hasNothingToRender",value:function(){return this.verticesCount===0}},{key:"setTypedUniform",value:function(t,r){var a;Mo(r.gl,(a=r.uniformLocations[t.name])!==null&&a!==void 0?a:null,t)}},{key:"renderProgram",value:function(t,r){var a=r.gl,i=r.program,o=r.isPicking;o?a.disable(a.BLEND):a.enable(a.BLEND),a.useProgram(i),this.setUniforms(t,r),this.drawWebGL(this.METHOD,r)}},{key:"render",value:function(t,r,a){var i;if(!this.shadersLogged&&(i=this.renderer)!==null&&i!==void 0&&i.getSetting("DEBUG_logShaders")&&(this.shadersLogged=!0,console.log("[sigma] DEBUG_logShaders: ".concat(this.constructor.name),{normal:{vertexShaderSource:this.VERTEX_SHADER_SOURCE,fragmentShaderSource:this.FRAGMENT_SHADER_SOURCE},pick:{vertexShaderSource:Na(this.VERTEX_SHADER_SOURCE),fragmentShaderSource:Na(this.FRAGMENT_SHADER_SOURCE)}})),!this.hasNothingToRender()){this.renderOffset=r??0,this.renderCount=a??-1;var o=this.normalProgram.gl;if(o.bindFramebuffer(o.FRAMEBUFFER,null),o.viewport(0,0,t.width*t.pixelRatio,t.height*t.pixelRatio),this.bindProgram(this.normalProgram),this.renderProgram(t,this.normalProgram),this.unbindProgram(this.normalProgram),this.pickProgram&&t.pickingFrameBuffer){var s=Math.ceil(t.width*t.pixelRatio/t.downSizingRatio),l=Math.ceil(t.height*t.pixelRatio/t.downSizingRatio);o.bindFramebuffer(o.FRAMEBUFFER,t.pickingFrameBuffer),o.viewport(0,0,s,l),this.bindProgram(this.pickProgram),this.renderProgram(t,this.pickProgram),this.unbindProgram(this.pickProgram),o.bindFramebuffer(o.FRAMEBUFFER,null),o.viewport(0,0,t.width*t.pixelRatio,t.height*t.pixelRatio)}}}},{key:"drawWebGL",value:function(t,r){var a,i=r.gl,o=this.renderCount>=0?this.renderCount:this.capacity;(a=this.renderer)!==null&&a!==void 0&&a.getSetting("DEBUG_logRenderStats")&&(this.debugStats.drawCalls++,this.debugStats.verticesDrawn+=o*this.VERTICES),this.isInstanced?i.drawArraysInstanced(t,0,this.VERTICES,o):i.drawArrays(t,this.renderOffset*this.VERTICES,o*this.VERTICES)}}])})(),qt=2,kr=7,Gu={below:0,above:1,left:2,right:3};function um(){var e=`#version 300 es
precision highp float;

uniform mat3 u_matrix;
uniform vec2 u_resolution;
uniform float u_labelPixelSnapping;
uniform float u_sizeRatio;
uniform float u_correctionRatio;
uniform float u_cameraAngle;
uniform float u_pixelRatio;
uniform float u_labelMargin;
uniform float u_zoomLabelSizeRatio;

uniform sampler2D u_nodeDataTexture;
uniform int u_nodeDataTextureWidth;
uniform sampler2D u_nodeFrameTexture;
uniform int u_nodeFrameTextureWidth;

// Atlas size is fixed at 2048\xD72048 \u2014 matches AttachmentManager.ATLAS_SIZE.
uniform sampler2D u_atlasTexture;
const vec2 u_atlasSize = vec2(2048.0);

// Per-instance
in float a_nodeIndex;           // node-data texture index
in vec4 a_atlasRect;            // x, y, width, height in atlas pixels
in vec2 a_attachmentSize;       // attachment dimensions (CSS px)
in float a_positionMode;        // label position: 0=right 1=left 2=above 3=below 4=over
in float a_attachmentPlacement; // 0=below 1=above 2=left 3=right (relative to label)
in float a_labelWidth;          // label width (CSS px)
in float a_labelHeight;         // label height: font line box (CSS px)
in float a_textHeight;          // actual glyph height (CSS px)
in float a_labelAngle;          // label rotation angle (radians)

// Per-vertex (constant)
in vec2 a_quadCorner;           // [-1,-1], [1,-1], [-1,1], [1,1]

out vec2 v_texCoord;

`.concat(gt,`
`).concat(Ht,`
`).concat(dn,`
`).concat(Fo,`
`).concat(Bn,`

void main() {
  int nodeIdx = int(a_nodeIndex);

  // Node data: (x, y, size, shapeId).
  vec4 nodeData = readNodeData(u_nodeDataTexture, u_nodeDataTextureWidth, nodeIdx);
  vec2 nodePos = nodeData.xy;
  float nodeSize = nodeData.z;

  // Normalized edge distance from the shared frame texture (the frame-pass ran
  // the SDF search once; we just read the result).
  float edgeDist = readFrameTexel(u_nodeFrameTexture, u_nodeFrameTextureWidth, nodeIdx).r;

  // Per-node label rotation alignment: 0 = viewport, 1 = label turns with camera.
  float labelRotation = readNodeFlags(u_nodeDataTexture, u_nodeDataTextureWidth, nodeIdx).g;

  vec3 nodeClip = u_matrix * vec3(nodePos, 1.0);

  // Node radius in physical pixels (matches label/background).
  float matrixScaleX = length(vec2(u_matrix[0][0], u_matrix[1][0]));
  float nodeRadiusGraphSpace = nodeSize * u_correctionRatio / u_sizeRatio * 2.0;
  float nodeRadiusPixels = nodeRadiusGraphSpace * matrixScaleX * u_resolution.x / 2.0;

  // CSS-px inputs -> physical px, scaled by the zoom-dependent label ratio, so
  // the attachment stays glued to the label box exactly as the label scales.
  float zoomScale = u_zoomLabelSizeRatio;
  vec2 labelHalf = vec2(a_labelWidth, a_labelHeight) * 0.5 * zoomScale * u_pixelRatio;
  vec2 attachHalf = a_attachmentSize * 0.5 * zoomScale * u_pixelRatio;
  float gap = `).concat(qt.toFixed(1),` * zoomScale * u_pixelRatio;
  float labelMargin = u_labelMargin * zoomScale * u_pixelRatio;

  // Graph-aligned labels add the camera angle so the attachment orbits with the box.
  mat2 labelRotMat = rotate2D(a_labelAngle - labelRotation * u_cameraAngle);

  // Label box center relative to the node center (pre-rotation). The shape-aware
  // edge distance comes from the frame texture, so placement matches the label.
  vec2 boxCenter = vec2(0.0);
  if (a_positionMode < 4.0) {
    float labelStart = nodeRadiusPixels * edgeDist + labelMargin;
    float textHalf = a_textHeight * 0.5 * zoomScale * u_pixelRatio;
    boxCenter = labelBoxCenter(a_positionMode, labelStart, labelHalf, textHalf);
  }

  // Horizontal anchor of below/above attachments tracks the label position, so
  // the attachment hangs from the label edge nearest the node (or is centered
  // when the label itself is node-centered): right->left, left->right, else center.
  float anchorX = 0.0;
  if (a_positionMode < 0.5) anchorX = -labelHalf.x + attachHalf.x;       // right label
  else if (a_positionMode < 1.5) anchorX = labelHalf.x - attachHalf.x;   // left label

  // Attachment center relative to the box (pre-rotation, Y-down). This offset
  // depends only on the box, the gap and the attachment size \u2014 never the shape.
  vec2 attachCenter;
  if (a_attachmentPlacement < 0.5) {
    // below
    attachCenter = boxCenter + vec2(anchorX, labelHalf.y + gap + attachHalf.y);
  } else if (a_attachmentPlacement < 1.5) {
    // above
    attachCenter = boxCenter + vec2(anchorX, -(labelHalf.y + gap + attachHalf.y));
  } else if (a_attachmentPlacement < 2.5) {
    // left, top-aligned
    attachCenter = boxCenter + vec2(-(labelHalf.x + gap + attachHalf.x), -labelHalf.y + attachHalf.y);
  } else {
    // right, top-aligned
    attachCenter = boxCenter + vec2(labelHalf.x + gap + attachHalf.x, -labelHalf.y + attachHalf.y);
  }

  // Rotate the whole assembly by the label angle, around the node center.
  vec2 rotatedCenter = labelRotMat * attachCenter;
  vec2 cornerOffset = labelRotMat * (a_quadCorner * attachHalf);

  // Node center in screen px (Y-down).
  vec2 nodeScreen = vec2(
    (nodeClip.x + 1.0) * u_resolution.x,
    (1.0 - nodeClip.y) * u_resolution.y
  ) * 0.5;

  // Snap node center to the pixel grid so label/backdrop/attachment move as one.
  vec2 snapDelta = (round(nodeScreen) - nodeScreen) * u_labelPixelSnapping;

  // Snap the quad's top-left to integer pixels so atlas texels map 1:1.
  vec2 centerScreen = nodeScreen + rotatedCenter + snapDelta;
  vec2 topLeft = centerScreen - attachHalf;
  topLeft = mix(topLeft, round(topLeft), u_labelPixelSnapping);
  centerScreen = topLeft + attachHalf;

  vec2 vertexScreen = centerScreen + cornerOffset;
  gl_Position = vec4(
    vertexScreen.x * 2.0 / u_resolution.x - 1.0,
    1.0 - vertexScreen.y * 2.0 / u_resolution.y,
    0.0, 1.0
  );

  vec2 texOrigin = a_atlasRect.xy / u_atlasSize;
  vec2 texSize = a_atlasRect.zw / u_atlasSize;
  vec2 uv = (a_quadCorner + 1.0) / 2.0;
  v_texCoord = texOrigin + uv * texSize;
}
`);return e}var dm=`#version 300 es
precision highp float;

uniform sampler2D u_atlasTexture;

in vec2 v_texCoord;

layout(location = 0) out vec4 fragColor;
#ifdef PICKING_MODE
layout(location = 1) out vec4 pickColor;
#endif

void main() {
  // Canvas textures are premultiplied; output directly for (ONE, 1-SRC_ALPHA) blending
  vec4 color = texture(u_atlasTexture, v_texCoord);
  if (color.a < 0.01) discard;
  fragColor = color;
#ifdef PICKING_MODE
  pickColor = vec4(0.0); // Attachments are not pickable
#endif
}
`;function cm(e,n,t,r){var a,i,o=r.label,s=o===void 0?{}:o,l=(a=s.margin)!==null&&a!==void 0?a:un,u=(i=s.zoomToLabelSizeRatioFunction)!==null&&i!==void 0?i:function(){return 1},d=um(),c=dm,h=(function(g){function p(){var m;ae(this,p);for(var b=arguments.length,v=new Array(b),x=0;x<b;x++)v[x]=arguments[x];return m=ye(this,p,[].concat(v)),C(m,"totalCount",0),C(m,"bufferCapacity",0),m}return be(p,g),ie(p,[{key:"getDefinition",value:function(){var b=WebGL2RenderingContext,v=b.FLOAT,x=b.TRIANGLE_STRIP;return{VERTICES:4,VERTEX_SHADER_SOURCE:d,FRAGMENT_SHADER_SOURCE:c,METHOD:x,UNIFORMS:["u_matrix","u_resolution","u_labelPixelSnapping","u_sizeRatio","u_correctionRatio","u_cameraAngle","u_pixelRatio","u_labelMargin","u_zoomLabelSizeRatio","u_nodeDataTexture","u_nodeDataTextureWidth","u_nodeFrameTexture","u_nodeFrameTextureWidth","u_atlasTexture"],ATTRIBUTES:[{name:"a_nodeIndex",size:1,type:v},{name:"a_atlasRect",size:4,type:v},{name:"a_attachmentSize",size:2,type:v},{name:"a_positionMode",size:1,type:v},{name:"a_attachmentPlacement",size:1,type:v},{name:"a_labelWidth",size:1,type:v},{name:"a_labelHeight",size:1,type:v},{name:"a_textHeight",size:1,type:v},{name:"a_labelAngle",size:1,type:v}],CONSTANT_ATTRIBUTES:[{name:"a_quadCorner",size:2,type:v}],CONSTANT_DATA:[[-1,-1],[1,-1],[-1,1],[1,1]]}}},{key:"processAttachment",value:function(b,v){var x=this.floats,y=b*this.STRIDE;x[y++]=v.nodeIndex,x[y++]=v.atlasX,x[y++]=v.atlasY,x[y++]=v.atlasW,x[y++]=v.atlasH,x[y++]=v.attachWidth,x[y++]=v.attachHeight,x[y++]=v.positionMode,x[y++]=v.attachmentPlacement,x[y++]=v.labelWidth,x[y++]=v.labelHeight,x[y++]=v.textHeight,x[y++]=v.labelAngle}},{key:"setUniforms",value:function(b,v){var x=v.gl,y=v.uniformLocations;x.uniformMatrix3fv(y.u_matrix,!1,b.matrix),x.uniform2f(y.u_resolution,b.width*b.pixelRatio,b.height*b.pixelRatio),x.uniform1f(y.u_labelPixelSnapping,b.labelPixelSnapping),x.uniform1f(y.u_sizeRatio,b.sizeRatio),x.uniform1f(y.u_correctionRatio,b.correctionRatio),x.uniform1f(y.u_cameraAngle,b.cameraAngle),x.uniform1f(y.u_pixelRatio,b.pixelRatio),x.uniform1f(y.u_labelMargin,p.labelMargin),x.uniform1f(y.u_zoomLabelSizeRatio,1/u(b.zoomRatio)),x.uniform1i(y.u_nodeDataTexture,b.nodeDataTextureUnit),x.uniform1i(y.u_nodeDataTextureWidth,b.nodeDataTextureWidth),x.uniform1i(y.u_nodeFrameTexture,b.nodeFrameTextureUnit),x.uniform1i(y.u_nodeFrameTextureWidth,b.nodeFrameTextureWidth),x.uniform1i(y.u_atlasTexture,kr)}},{key:"reallocateAttachments",value:function(b){this.totalCount=b,b>this.bufferCapacity&&(this.bufferCapacity=Math.max(b,Math.ceil(this.bufferCapacity*1.5)||10),Ce(p,"reallocate",this,3)([this.bufferCapacity]))}},{key:"hasNothingToRender",value:function(){return this.totalCount===0}},{key:"drawWebGL",value:function(b,v){var x=v.gl;this.totalCount!==0&&x.drawArraysInstanced(b,0,this.VERTICES,this.totalCount)}}])})(jt);return C(h,"labelMargin",l),new h(e,n,t)}var Ut=5;function Za(e,n){return[].concat(Z(n),Z(e.map(function(t){var r;return{attributes:(r=t.attributes)!==null&&r!==void 0?r:[]}})))}function Wn(e,n){var t=tt(Za(e,n)),r=new Set(e.flatMap(function(u){var d;return(d=u.attributes)!==null&&d!==void 0?d:[]}).map(function(u){return u.name.replace(/^a_/,"")})),a={},i={},o=U(r),s;try{for(o.s();!(s=o.n()).done;){var l=s.value;a[l]=t.offsets[l],i[l]=t.specs[l]}}catch(u){o.e(u)}finally{o.f()}return H(H({},t),{},{offsets:a,specs:i})}function Ou(e,n){var t=new Set(["u_matrix","u_sizeRatio","u_correctionRatio","u_cameraAngle","u_pickingPadding","u_nodeDataTexture","u_layerAttributeTexture"]),r=new Set,a=e.flatMap(function(g){return g.uniforms}).filter(function(g){return t.has(g.name)||r.has(g.name)?!1:(r.add(g.name),!0)}).map(function(g){return"uniform ".concat(g.type," ").concat(g.name,";")}).join(`
`),i=n.flatMap(function(g){return g.uniforms}).filter(function(g){return t.has(g.name)||r.has(g.name)?!1:(r.add(g.name),!0)}).map(function(g){return"uniform ".concat(g.type," ").concat(g.name,";")}).join(`
`),o=Za(e,n),s=new Set,l=o.flatMap(function(g){return g.attributes}).filter(function(g){var p=g.name.replace(/^a_/,"");return s.has(p)?!1:(s.add(p),!0)}).map(function(g){var p=g.name.replace(/^a_/,""),m=g.size===1?"float":"vec".concat(g.size);return"out ".concat(m," v_").concat(p,";")}).join(`
`),u=zn(tt(o),{varPrefix:"layer",baseTexelExpr:"nodeIdx * u_layerAttributeTexelsPerNode",textureWidthUniform:"u_layerAttributeTextureWidth",textureSamplerUniform:"u_layerAttributeTexture"}),d=u.fetchCode,c=u.varyingAssignments,h=`#version 300 es

// Standard node attributes (per instance) - minimal buffer usage
in float a_nodeIndex;  // Index into node data texture AND layer attribute texture
in vec4 a_id;          // Node ID for picking
in float a_opacity;    // Node opacity, applied once to the final fragment

// Constant attributes (per vertex, same for all instances)
in vec2 a_quadCorner;  // (-1,-1), (1,-1), (1,1), (-1,1) for quad corners

// Standard uniforms
uniform mat3 u_matrix;
uniform float u_sizeRatio;
uniform float u_correctionRatio;
uniform float u_cameraAngle;
#ifdef PICKING_MODE
uniform float u_pickingPadding;
#endif
uniform sampler2D u_nodeDataTexture;
uniform int u_nodeDataTextureWidth;

// Layer attribute texture uniforms
uniform sampler2D u_layerAttributeTexture;
uniform int u_layerAttributeTextureWidth;
uniform int u_layerAttributeTexelsPerNode;

`.concat(a,`
`).concat(i,`

// Standard varyings
out vec2 v_uv;                    // Normalized coordinates [-1, 1]
out vec4 v_id;
out float v_opacity;
out float v_antialiasingWidth;    // Width for antialiasing in UV space
out float v_pixelSize;            // Node size in pixels (for pixel-mode borders)
out float v_pixelToUV;            // Conversion factor: multiply by this to convert screen pixels to UV units
out float v_shapeId;              // Shape ID for multi-shape programs

// Layer varyings
`).concat(l,`

// Node-data fetch helpers (geometry texel + rotation-flags texel)
`).concat(gt,`
`).concat(Ht,`

void main() {
  // Fetch node geometry: vec4(x, y, size, shapeId).
  int nodeIdx = int(a_nodeIndex);

  // Hidden nodes are flagged with a negative row by NodeProgram.process(). Push
  // the whole quad outside the clip volume: every vertex lands at the same
  // out-of-range position, so the primitive is fully clipped and rasterizes
  // nothing \u2014 neither to the frame buffer nor to the picking buffer.
  if (nodeIdx < 0) {
    gl_Position = vec4(2.0, 0.0, 0.0, 1.0);
    v_id = vec4(0.0);
    return;
  }

  vec4 nodeData = readNodeData(u_nodeDataTexture, u_nodeDataTextureWidth, nodeIdx);
  vec2 a_position = nodeData.xy;
  float a_size = nodeData.z;
  v_shapeId = nodeData.w;  // Pass shape ID to fragment shader

  // Per-node rotation alignment: 0 = viewport (screen-upright), 1 = graph.
  float nodeRotation = readNodeFlags(u_nodeDataTexture, u_nodeDataTextureWidth, nodeIdx).r;

`).concat(d,`

  // Calculate the actual size in pixels
  float size = a_size * u_correctionRatio / u_sizeRatio * 2.0;

  // In PICKING_MODE, inflate the quad by nodePickingPadding pixels on each side
  #ifdef PICKING_MODE
    float paddedSize = size + u_pickingPadding * u_correctionRatio;
    vec2 offset = a_quadCorner * paddedSize;
  #else
    vec2 offset = a_quadCorner * size;
  #endif
  // Counter-rotate the quad offset so viewport-aligned nodes stay upright as the
  // camera turns. Graph-aligned nodes (nodeRotation=1) skip it and turn with the
  // camera. The angle scales by (1 - nodeRotation) so both fall out of one path.
  {
    float ca = u_cameraAngle * (1.0 - nodeRotation);
    float c = cos(ca);
    float s = sin(ca);
    offset = mat2(c, s, -s, c) * offset;
  }
  vec2 position = a_position + offset;

  gl_Position = vec4(
    (u_matrix * vec3(position, 1)).xy,
    0,
    1
  );

  // In PICKING_MODE, UV is scaled beyond [-1, 1] to match the inflated quad
  #ifdef PICKING_MODE
    v_uv = a_quadCorner * (paddedSize / size);
  #else
    v_uv = a_quadCorner;
  #endif

  // Pass ID to fragment shader
  v_id = a_id;
  v_opacity = a_opacity;

  // Pass pixel size for layers that need pixel-mode calculations
  // Multiply by 2 because 'size' is half-width (offset from center), not full diameter
  v_pixelSize = size * 2.0;

  // Conversion factor from screen pixels to UV units
  // Same derivation as v_antialiasingWidth which represents ~1 pixel in UV space
  // P pixels in UV space = P * u_correctionRatio / size
  v_pixelToUV = u_correctionRatio / size;

  // We use an antialiasing width of 1px (so v_pixelToUV)
  v_antialiasingWidth = v_pixelToUV;

  // Pass layer attributes to fragment shader (fetched from texture)
`).concat(c,`
}
`);return h}function Bu(e,n,t){var r=arguments.length>3&&arguments[3]!==void 0?arguments[3]:!0,a=n.map(function(p,m){var b="layer_".concat(p.name),v=[].concat(Z(p.attributes.map(function(x){return"v_".concat(x.name.replace(/^a_/,""))})),Z(p.uniforms.map(function(x){return x.name}))).join(", ");return"  // Layer ".concat(m+1,": ").concat(p.name,`
  color = blendOver(color, `).concat(b,"(").concat(v,"));")}).join(`

`),i=new Set(["u_correctionRatio"]),o=new Set,s=e.flatMap(function(p){return p.uniforms}).filter(function(p){return i.has(p.name)||o.has(p.name)?!1:(o.add(p.name),!0)}).map(function(p){return"uniform ".concat(p.type," ").concat(p.name,";")}).join(`
`),l=n.flatMap(function(p){return p.uniforms}).filter(function(p){return i.has(p.name)||o.has(p.name)?!1:(o.add(p.name),!0)}).map(function(p){return"uniform ".concat(p.type," ").concat(p.name,";")}).join(`
`),u=new Set,d=Za(e,n).flatMap(function(p){return p.attributes}).filter(function(p){var m=p.name.replace(/^a_/,"");return u.has(m)?!1:(u.add(m),!0)}).map(function(p){var m=p.name.replace(/^a_/,""),b=p.size===1?"float":"vec".concat(p.size);return"in ".concat(b," v_").concat(m,";")}).join(`
`),c=ja(e),h=Cu(e,t),g=`#version 300 es
precision highp float;

// Standard varyings
in vec2 v_uv;
in vec4 v_id;
in float v_opacity;
in float v_antialiasingWidth;
in float v_pixelSize;
in float v_pixelToUV;
in float v_shapeId;  // Shape ID for multi-shape programs

// Standard uniforms (needed for some layer calculations like pixel-mode borders)
uniform float u_correctionRatio;
#ifdef PICKING_MODE
uniform float u_pickingPadding;
#endif

// Shape uniforms
`.concat(s,`

// Layer uniforms
`).concat(l,`

// Layer varyings
`).concat(d,`

// Fragment output (single target - picking handled via separate pass)
out vec4 fragColor;

// LayerContext struct - provides rendering context to all layers
struct LayerContext {
  float sdf;             // Signed distance from shape boundary (negative inside)
  vec2 uv;               // UV coordinates [-1, 1], center at (0,0)
  float shapeSize;       // Effective shape size (~diameter) in UV space (1.0 - aaWidth)
  float shapeHalfSize;   // Effective shape half size (~radius) in UV space
  float pixelSize;       // Node full size (~diameter) in screen pixels
  float aaWidth;         // Anti-aliasing width for smooth transitions
  float correctionRatio; // Scaling factor for consistent rendering across zoom levels
  float pixelToUV;       // Conversion factor: multiply screen pixels by this to get UV units
  float inradiusFactor;  // Ratio of inradius to circumradius (shape depth factor)
};

LayerContext context;  // Global instance, populated before layer calls

// Alpha "over" compositing for layer blending
vec4 blendOver(vec4 bg, vec4 fg) {
  float a = fg.a;
  return vec4(mix(bg.rgb, fg.rgb, a), bg.a + a * (1.0 - bg.a));
}

// SDF shape functions
`).concat(c,`

// Shape selector function (sets context.sdf and context.inradiusFactor)
`).concat(h,`

// Layer functions
`).concat(n.map(function(p){return p.glsl}).join(`

`),`

void main() {
  // 1. Setup LayerContext (available to all layer functions)
  context.shapeSize = 1.0 - v_antialiasingWidth;
  context.shapeHalfSize = context.shapeSize * 0.5;
  context.pixelSize = v_pixelSize;
  context.uv = v_uv;
  context.aaWidth = v_antialiasingWidth;
  context.correctionRatio = u_correctionRatio;
  context.pixelToUV = v_pixelToUV;

  // Query shape SDF based on shapeId (sets context.sdf and context.inradiusFactor)
  queryNodeSDF(int(v_shapeId), v_uv, context.shapeSize);

  // 2. Early discard for pixels fully outside the shape (with AA margin)
  // In PICKING_MODE, allow extra fragments up to the picking padding distance
  #ifdef PICKING_MODE
    if (context.sdf > u_pickingPadding * v_pixelToUV + context.aaWidth) discard;
  #else
    if (context.sdf > context.aaWidth) discard;
  #endif

  // 3. Apply layers sequentially with "over" compositing
  vec4 color = vec4(0.0);

`).concat(a,`

  #ifdef PICKING_MODE
    // Picking pass: output node ID for pixels within the picking area.
    if (context.sdf > u_pickingPadding * v_pixelToUV) discard;
    fragColor = v_id;
  #else
`).concat(r?`    // Visual pass: apply antialiasing at shape boundary, node opacity once
    // smoothstep provides smooth transition from opaque to transparent
    float alpha = smoothstep(context.aaWidth, -context.aaWidth, context.sdf) * v_opacity;`:`    // Visual pass: hard-edged (no anti-aliasing gradient) shape boundary, node opacity applied once
    float alpha = (context.sdf < 0.0 ? 1.0 : 0.0) * v_opacity;`,`
    // Mix with transparent to fade both color AND alpha together (avoids bright halo)
    fragColor = mix(vec4(0.0), color, alpha);
  #endif
}
`);return g}function Wu(e,n){var t=new Set;return t.add("u_matrix"),t.add("u_sizeRatio"),t.add("u_correctionRatio"),t.add("u_cameraAngle"),t.add("u_pickingPadding"),t.add("u_nodeDataTexture"),t.add("u_nodeDataTextureWidth"),t.add("u_layerAttributeTexture"),t.add("u_layerAttributeTextureWidth"),t.add("u_layerAttributeTexelsPerNode"),e.forEach(function(r){r.uniforms.forEach(function(a){return t.add(a.name)})}),n.forEach(function(r){r.uniforms.forEach(function(a){return t.add(a.name)})}),Array.from(t)}function Uu(e){var n=WebGL2RenderingContext,t=n.UNSIGNED_BYTE,r=n.FLOAT;return[{name:"a_nodeIndex",size:1,type:r},{name:"a_id",size:4,type:t,normalized:!0},{name:"a_opacity",size:1,type:r}]}function ko(e){var n=e.shapes,t=e.layers,r=e.shapeGlobalIds,a=e.antialias,i=a===void 0?!0:a;return{vertexShader:Ou(n,t),fragmentShader:Bu(n,t,r,i),uniforms:Wu(n,t),attributes:Uu()}}function $u(e,n,t){var r=Wn(e,n),a=r.specs;return Object.keys(a).map(function(i){return"flat ".concat(t," ").concat(a[i].size===1?"float":"vec".concat(a[i].size)," v_").concat(i,";")}).join(`
`)}function Hu(e){var n,t,r=e.shapes,a=e.layers,i=e.shapeGlobalIds,o=zn(Wn(r,a),{varPrefix:"nodeAttr",baseTexelExpr:"nodeIdx * u_layerAttributeTexelsPerNode",textureWidthUniform:"u_layerAttributeTextureWidth",textureSamplerUniform:"u_layerAttributeTexture"}),s=r.length===1?"float inradiusFactor = ".concat(ge((n=r[0].inradiusFactor)!==null&&n!==void 0?n:1),";"):"float inradiusFactor = ".concat(ge((t=r[0].inradiusFactor)!==null&&t!==void 0?t:1),`;
  switch (int(shapeId)) {
`).concat(r.map(function(u,d){var c,h=i?i[d]:d;return"    case ".concat(h,": inradiusFactor = ").concat(ge((c=u.inradiusFactor)!==null&&c!==void 0?c:1),"; break;")}).join(`
`),`
    default: break;
  }`),l=`#version 300 es

in float a_nodeIndex;
in float a_labelWidth;
in float a_labelHeight;
in float a_textHeight;
in float a_positionMode;
in float a_labelAngle;
in vec4 a_backdropColor;
in vec4 a_backdropShadowColor;
in float a_backdropShadowBlur;
in float a_backdropPadding;
in vec4 a_backdropBorderColor;
in vec4 a_backdropExtra; // [borderWidth, cornerRadius, labelPadding, area]
in vec2 a_labelBoxOffset;
in vec2 a_quadCorner;

uniform mat3 u_matrix;
uniform float u_sizeRatio;
uniform float u_correctionRatio;
uniform float u_cameraAngle;
uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_labelMargin;
uniform float u_zoomLabelSizeRatio;
uniform float u_labelPixelSnapping;
uniform sampler2D u_nodeDataTexture;
uniform int u_nodeDataTextureWidth;
uniform sampler2D u_nodeFrameTexture;
uniform int u_nodeFrameTextureWidth;
uniform sampler2D u_layerAttributeTexture;
uniform int u_layerAttributeTextureWidth;
uniform int u_layerAttributeTexelsPerNode;

out vec2 v_uv;
out vec2 v_nodeCenter;
out float v_nodeRadius;
out vec2 v_labelCenter;
out vec2 v_labelHalfSize;
out float v_aaWidth;
out float v_shapeId;
out float v_nodeRotation;
out float v_labelAngle;
out vec4 v_backdropColor;
out vec4 v_backdropShadowColor;
out float v_backdropShadowBlur;
out float v_backdropPadding;
out vec4 v_backdropBorderColor;
out float v_backdropBorderWidth;
out float v_backdropCornerRadius;
out float v_backdropArea;
`.concat($u(r,a,"out"),`

`).concat(gt,`
`).concat(Ht,`
`).concat(dn,`

void main() {
  int nodeIdx = int(a_nodeIndex);
`).concat(o.fetchCode,`
`).concat(o.varyingAssignments,`

  // Node data: (x, y, size, shapeId). shapeId (global) is forwarded to the
  // fragment shader, which keeps the shape SDF for the outline.
  vec4 nodeData = readNodeData(u_nodeDataTexture, u_nodeDataTextureWidth, nodeIdx);
  vec2 nodePosition = nodeData.xy;
  float nodeSize = nodeData.z;
  float shapeId = nodeData.w;

  // Per-node rotation alignment (0 = viewport, 1 = graph). nodeRotation drives
  // the fragment's shape outline; labelRotation turns the label box with camera.
  vec4 nodeFlags = readNodeFlags(u_nodeDataTexture, u_nodeDataTextureWidth, nodeIdx);
  float nodeRotation = nodeFlags.r;
  float labelRotation = nodeFlags.g;
  v_nodeRotation = nodeRotation;

  `).concat(Po,`
  // CSS pixel attributes are multiplied by u_pixelRatio to match nodeRadiusPixels,
  // which is already in physical pixels (nodeRadiusNDC * u_resolution.x / 2.0).
  float padding = a_backdropPadding * u_pixelRatio;
  float shadowBlur = a_backdropShadowBlur * u_pixelRatio;
  // Unpack a_backdropExtra: [borderWidth, cornerRadius, labelPadding, area]
  float borderWidth = a_backdropExtra.x * u_pixelRatio;
  float cornerRadius = a_backdropExtra.y * u_pixelRatio;
  float labelPad = a_backdropExtra.z * u_pixelRatio;
  float backdropArea = a_backdropExtra.w;
  // Use 2x shadowBlur so the Gaussian fully decays before the quad edge
  float totalExpansion = shadowBlur * 2.0 + borderWidth;
  float enlargedRadius = nodeRadiusPixels + padding;

  // Circumscribed radius for the quad bounds. Non-circular shapes reach past
  // their inradius out to their circumradius (= enlargedRadius / inradiusFactor),
  // in any direction once rotated. The axis-aligned quad must contain that, or
  // the fill/shadow gets clipped (square corners, triangle tip, etc.).
  `).concat(s,`
  float boundRadius = enlargedRadius / inradiusFactor;

  // Apply zoom-dependent label size scaling
  float zoomScale = u_zoomLabelSizeRatio;
  float labelW = a_labelWidth * zoomScale * u_pixelRatio;
  float labelH = a_labelHeight * zoomScale * u_pixelRatio;
  float labelMargin = u_labelMargin * zoomScale * u_pixelRatio;

  // Only apply labelPad when a label is actually present
  float effectiveLabelPad = labelW > 0.0 ? labelPad : 0.0;
  vec2 labelHalfSize = vec2(labelW * 0.5 + effectiveLabelPad, labelH * 0.5 + effectiveLabelPad);
  vec2 labelOffset = vec2(0.0);

  // Effective label angle: intrinsic angle plus the camera angle when the label
  // is graph-aligned, so the box orbits the node in lockstep with the frame-pass.
  float labelAngle = a_labelAngle - labelRotation * u_cameraAngle;
  float la_c = cos(labelAngle);
  float la_s = sin(labelAngle);
  mat2 labelRotMat = mat2(la_c, -la_s, la_s, la_c);

  vec3 nodeClip = u_matrix * vec3(nodePosition, 1.0);
  vec2 snapDelta = vec2(0.0);

  if (labelW > 0.0) {
    // labelW > 0.0 means this node's label is displayed, so the frame-pass wrote
    // its edge distance this frame.
    float edgeDistPixels = nodeRadiusPixels * readFrameTexel(u_nodeFrameTexture, u_nodeFrameTextureWidth, nodeIdx).r;
    // labelMargin matches the label shader's margin (gap from node edge to text)
    float labelStart = edgeDistPixels + labelMargin;
    // Above/below center on the actual glyph height, not the font line box, so
    // the box stays aligned with the rendered text (matches labelBoxCenter()).
    float textHalf = a_textHeight * zoomScale * u_pixelRatio * 0.5;

    // Snap node center to pixel grid so label/backdrop/attachment move as a unit
    vec2 nodeScreen = vec2(
      (nodeClip.x + 1.0) * u_resolution.x,
      (1.0 - nodeClip.y) * u_resolution.y
    ) * 0.5;
    snapDelta = (round(nodeScreen) - nodeScreen) * u_labelPixelSnapping;

    if (a_positionMode < 0.5) {
      // Right: box spans from node center to text end + padding
      float boxRightEdge = labelStart + labelW + labelPad;
      labelOffset = vec2(boxRightEdge * 0.5, 0.0);
      labelHalfSize.x = boxRightEdge * 0.5;
    } else if (a_positionMode < 1.5) {
      // Left: mirror of right
      float boxLeftEdge = labelStart + labelW + labelPad;
      labelOffset = vec2(-boxLeftEdge * 0.5, 0.0);
      labelHalfSize.x = boxLeftEdge * 0.5;
    } else if (a_positionMode < 2.5) {
      // Above: text bottom at labelStart, centered horizontally
      labelOffset = vec2(0.0, -(labelStart + textHalf));
    } else if (a_positionMode < 3.5) {
      // Below: text top at labelStart, centered horizontally
      labelOffset = vec2(0.0, labelStart + textHalf);
    }
    // over (>=4): labelOffset stays (0,0) \u2014 text centered on the node.

    // The attachment-cover shift is in label space (like the attachment itself),
    // so rotate it together with the position offset \u2014 otherwise the box drifts
    // off the attachment as the label angle grows.
    labelOffset = labelRotMat * (labelOffset + a_labelBoxOffset * zoomScale * u_pixelRatio);
  }

  // For node-only mode, zero out label dimensions
  if (backdropArea > 0.5 && backdropArea < 1.5) {
    labelHalfSize = vec2(0.0);
    labelOffset = vec2(0.0);
  }

  vec2 minBound, maxBound;

  bool hasLabelBounds = labelW > 0.0 && (backdropArea > 1.5 || backdropArea < 0.5);

  if (hasLabelBounds) {
    // Union with label bounds (area=both) or label-only bounds (area=label)
    vec2 labelMin, labelMax;

    if (a_labelAngle != 0.0) {
      vec2 corner1 = labelOffset + labelRotMat * vec2(-labelHalfSize.x, -labelHalfSize.y);
      vec2 corner2 = labelOffset + labelRotMat * vec2(labelHalfSize.x, -labelHalfSize.y);
      vec2 corner3 = labelOffset + labelRotMat * vec2(labelHalfSize.x, labelHalfSize.y);
      vec2 corner4 = labelOffset + labelRotMat * vec2(-labelHalfSize.x, labelHalfSize.y);
      labelMin = min(min(corner1, corner2), min(corner3, corner4));
      labelMax = max(max(corner1, corner2), max(corner3, corner4));
    } else {
      labelMin = labelOffset - labelHalfSize;
      labelMax = labelOffset + labelHalfSize;
    }

    if (backdropArea > 1.5) {
      // Label-only: bounds from label rect only
      minBound = labelMin - totalExpansion;
      maxBound = labelMax + totalExpansion;
    } else {
      // Both: union of node + label
      minBound = min(-vec2(boundRadius), labelMin) - totalExpansion;
      maxBound = max(vec2(boundRadius), labelMax) + totalExpansion;
    }
  } else {
    // Node-only or no visible label
    float totalRadius = boundRadius + totalExpansion;
    minBound = -vec2(totalRadius);
    maxBound = vec2(totalRadius);
  }

  vec2 quadSize = maxBound - minBound;
  vec2 quadCenter = (minBound + maxBound) * 0.5;

  vec2 localPos = quadCenter + a_quadCorner * quadSize * 0.5 + snapDelta;
  vec2 ndcOffset = localPos * 2.0 / u_resolution;
  ndcOffset.y = -ndcOffset.y;

  gl_Position = vec4(nodeClip.xy + ndcOffset, 0.0, 1.0);

  v_uv = localPos;
  v_nodeCenter = vec2(0.0);
  v_nodeRadius = nodeRadiusPixels;
  v_labelCenter = labelOffset;
  v_labelHalfSize = labelHalfSize;
  v_aaWidth = 1.0;
  v_shapeId = shapeId;
  v_labelAngle = labelAngle;
  v_backdropColor = a_backdropColor;
  v_backdropShadowColor = a_backdropShadowColor;
  v_backdropShadowBlur = a_backdropShadowBlur;
  v_backdropPadding = a_backdropPadding;
  v_backdropBorderColor = a_backdropBorderColor;
  v_backdropBorderWidth = borderWidth;
  v_backdropCornerRadius = cornerRadius;
  v_backdropArea = backdropArea;
}
`);return l}function ju(e){var n=e.shapes,t=e.layers,r=e.shapeGlobalIds,a=ja(n),i=On(n).map(function(h){return"uniform ".concat(h.type," ").concat(h.name,";")}).join(`
`),o=function(g){return Rr(g,"nodeUV","1.0")},s;if(n.length===1)s="float nodeSdfNormalized = ".concat(o(n[0]),";");else{var l=n.map(function(h,g){var p=r?r[g]:g;return"    case ".concat(p,": nodeSdfNormalized = ").concat(o(h),"; break;")}).join(`
`),u=o(n[0]);s=`float nodeSdfNormalized;
  int shapeId = int(v_shapeId);
  switch (shapeId) {
`.concat(l,`
    default: nodeSdfNormalized = `).concat(u,`;
  }`)}var d=`float effectiveRadius = max(enlargedRadius - cornerRadius, 0.01);
  float ca = u_cameraAngle * v_nodeRotation;
  float ca_c = cos(ca);
  float ca_s = sin(ca);
  vec2 rotatedScreenUV = mat2(ca_c, -ca_s, ca_s, ca_c) * screenUV;
  vec2 nodeUV = vec2(rotatedScreenUV.x, -rotatedScreenUV.y) / effectiveRadius;`,c=`#version 300 es
precision highp float;

in vec2 v_uv;
in vec2 v_nodeCenter;
in float v_nodeRadius;
in vec2 v_labelCenter;
in vec2 v_labelHalfSize;
in float v_aaWidth;
in float v_shapeId;
in float v_nodeRotation;
in float v_labelAngle;
in vec4 v_backdropColor;
in vec4 v_backdropShadowColor;
in float v_backdropShadowBlur;
in float v_backdropPadding;
in vec4 v_backdropBorderColor;
in float v_backdropBorderWidth;
in float v_backdropCornerRadius;
in float v_backdropArea;
`.concat($u(n,t,"in"),`

uniform float u_cameraAngle;
`).concat(i,`

layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 fragPicking;

`).concat(a,`
`).concat(Lu,`
`).concat(Pu,`
`).concat(Iu,`
`).concat(Fu,`

void main() {
  vec4 backdropColor = v_backdropColor;
  vec4 shadowColor = v_backdropShadowColor;
  float shadowBlur = v_backdropShadowBlur;
  float padding = v_backdropPadding;
  vec4 borderColor = v_backdropBorderColor;
  float borderWidth = v_backdropBorderWidth;
  float cornerRadius = v_backdropCornerRadius;

  float enlargedRadius = v_nodeRadius + padding;
  vec2 screenUV = v_uv - v_nodeCenter;
  `).concat(d,`

  // Query the correct shape SDF based on shapeId
  `).concat(s,`
  float nodeSdfPixels = nodeSdfNormalized * effectiveRadius - cornerRadius;

  // Label SDF with optional corner radius and rotation
  float labelSdfPixels;
  if (v_labelHalfSize.x > 0.0) {
    vec2 labelP = v_uv - v_labelCenter;
    labelSdfPixels = sdfRoundedRotatedBox(labelP, v_labelHalfSize, v_labelAngle, cornerRadius);
  } else {
    labelSdfPixels = 10000.0;
  }

  // Select area: 0=both, 1=node, 2=label
  float combinedSdf;
  if (v_backdropArea > 1.5) {
    combinedSdf = labelSdfPixels;
  } else if (v_backdropArea > 0.5) {
    combinedSdf = nodeSdfPixels;
  } else {
    combinedSdf = min(nodeSdfPixels, labelSdfPixels);
  }

  // Fill + border composite
  float outerEdge = smoothstep(v_aaWidth, -v_aaWidth, combinedSdf);
  vec4 background;
  if (borderWidth > 0.5) {
    float innerEdge = smoothstep(v_aaWidth, -v_aaWidth, combinedSdf + borderWidth);
    float fillAlpha = innerEdge * backdropColor.a;
    vec4 fill = vec4(backdropColor.rgb * fillAlpha, fillAlpha);
    float borderAlpha = (outerEdge - innerEdge) * borderColor.a;
    vec4 border = vec4(borderColor.rgb * borderAlpha, borderAlpha);
    background = fill + border * (1.0 - fill.a);
  } else {
    float fillAlpha = outerEdge * backdropColor.a;
    background = vec4(backdropColor.rgb * fillAlpha, fillAlpha);
  }

  // Gaussian-like shadow falloff (mimics canvas shadowBlur)
  vec4 shadow = vec4(0.0);
  float sigma = shadowBlur / 2.5;
  if (sigma > 0.001) {
    float shadowDist = max(0.0, combinedSdf);
    float shadowAlpha = exp(-(shadowDist * shadowDist) / (2.0 * sigma * sigma)) * shadowColor.a;
    shadow = vec4(shadowColor.rgb * shadowAlpha, shadowAlpha);
  }

  fragColor = background + shadow * (1.0 - background.a);
  fragPicking = vec4(0.0);
}
`);return c}function qu(e){var n=["u_matrix","u_sizeRatio","u_correctionRatio","u_cameraAngle","u_resolution","u_pixelRatio","u_labelMargin","u_zoomLabelSizeRatio","u_labelPixelSnapping","u_nodeDataTexture","u_nodeDataTextureWidth","u_nodeFrameTexture","u_nodeFrameTextureWidth","u_layerAttributeTexture","u_layerAttributeTextureWidth","u_layerAttributeTexelsPerNode"],t=U(On(e)),r;try{for(t.s();!(r=t.n()).done;){var a=r.value;n.includes(a.name)||n.push(a.name)}}catch(i){t.e(i)}finally{t.f()}return n}function Vu(e){return{vertexShader:Hu(e),fragmentShader:ju(e),uniforms:qu(e.shapes)}}function Xu(e,n,t,r){var a,i,o=r.label,s=o===void 0?{}:o,l=r.shapes,u=r.layers,d=r.getAttributeTexture,c=r.shapeGlobalIds;if(l.length===0)throw new Error("createBackdropProgram: at least one shape must be provided in 'shapes'");var h=(a=s.margin)!==null&&a!==void 0?a:5,g=(i=s.zoomToLabelSizeRatioFunction)!==null&&i!==void 0?i:function(){return 1},p={shapes:l,layers:u,shapeGlobalIds:c},m=Vu(p),b=(function(v){function x(){var y;ae(this,x);for(var _=arguments.length,S=new Array(_),T=0;T<_;T++)S[T]=arguments[T];return y=ye(this,x,[].concat(S)),C(y,"totalBackdropCount",0),C(y,"bufferCapacity",0),y}return be(x,v),ie(x,[{key:"getDefinition",value:function(){var _=WebGL2RenderingContext,S=_.FLOAT,T=_.TRIANGLE_STRIP;return{VERTICES:4,VERTEX_SHADER_SOURCE:m.vertexShader,FRAGMENT_SHADER_SOURCE:m.fragmentShader,METHOD:T,UNIFORMS:m.uniforms,ATTRIBUTES:[{name:"a_nodeIndex",size:1,type:S},{name:"a_labelWidth",size:1,type:S},{name:"a_labelHeight",size:1,type:S},{name:"a_textHeight",size:1,type:S},{name:"a_positionMode",size:1,type:S},{name:"a_labelAngle",size:1,type:S},{name:"a_backdropColor",size:4,type:S},{name:"a_backdropShadowColor",size:4,type:S},{name:"a_backdropShadowBlur",size:1,type:S},{name:"a_backdropPadding",size:1,type:S},{name:"a_backdropBorderColor",size:4,type:S},{name:"a_backdropExtra",size:4,type:S},{name:"a_labelBoxOffset",size:2,type:S}],CONSTANT_ATTRIBUTES:[{name:"a_quadCorner",size:2,type:S}],CONSTANT_DATA:[[-1,-1],[1,-1],[-1,1],[1,1]]}}},{key:"processBackdrop",value:function(_,S){var T=this.floats,A=this.STRIDE,w=_*A;T[w++]=S.nodeIndex,T[w++]=S.labelWidth,T[w++]=S.labelHeight,T[w++]=S.textHeight,T[w++]=ln[S.position],T[w++]=S.labelAngle,T[w++]=S.backdropColor[0],T[w++]=S.backdropColor[1],T[w++]=S.backdropColor[2],T[w++]=S.backdropColor[3],T[w++]=S.backdropShadowColor[0],T[w++]=S.backdropShadowColor[1],T[w++]=S.backdropShadowColor[2],T[w++]=S.backdropShadowColor[3],T[w++]=S.backdropShadowBlur,T[w++]=S.backdropPadding,T[w++]=S.backdropBorderColor[0],T[w++]=S.backdropBorderColor[1],T[w++]=S.backdropBorderColor[2],T[w++]=S.backdropBorderColor[3],T[w++]=S.backdropBorderWidth,T[w++]=S.backdropCornerRadius,T[w++]=S.backdropLabelPadding,T[w++]=S.backdropArea,T[w++]=S.labelBoxOffset[0],T[w++]=S.labelBoxOffset[1]}},{key:"setUniforms",value:function(_,S){var T=S.gl,A=S.uniformLocations;T.uniformMatrix3fv(A.u_matrix,!1,_.matrix),T.uniform1f(A.u_sizeRatio,_.sizeRatio),T.uniform1f(A.u_correctionRatio,_.correctionRatio),T.uniform1f(A.u_cameraAngle,_.cameraAngle),T.uniform2f(A.u_resolution,_.width*_.pixelRatio,_.height*_.pixelRatio),T.uniform1f(A.u_pixelRatio,_.pixelRatio),T.uniform1f(A.u_labelMargin,x.labelMargin),T.uniform1f(A.u_zoomLabelSizeRatio,1/g(_.zoomRatio)),T.uniform1f(A.u_labelPixelSnapping,_.labelPixelSnapping),T.uniform1i(A.u_nodeDataTexture,_.nodeDataTextureUnit),T.uniform1i(A.u_nodeDataTextureWidth,_.nodeDataTextureWidth),T.uniform1i(A.u_nodeFrameTexture,_.nodeFrameTextureUnit),T.uniform1i(A.u_nodeFrameTextureWidth,_.nodeFrameTextureWidth);var w=d();A.u_layerAttributeTexture&&w&&(w.bind(Ut),T.uniform1i(A.u_layerAttributeTexture,Ut),T.uniform1i(A.u_layerAttributeTextureWidth,w.getTextureWidth()),T.uniform1i(A.u_layerAttributeTexelsPerNode,w.getTexelsPerItem()));var E=U(On(l)),R;try{for(E.s();!(R=E.n()).done;){var L=R.value;this.setTypedUniform(L,S)}}catch(k){E.e(k)}finally{E.f()}}},{key:"hasNothingToRender",value:function(){return this.totalBackdropCount===0}},{key:"drawWebGL",value:function(_,S){var T=S.gl;this.totalBackdropCount!==0&&(this.isInstanced?T.drawArraysInstanced(_,0,this.VERTICES,this.totalBackdropCount):T.drawArrays(_,0,this.totalBackdropCount*this.VERTICES))}},{key:"reallocate",value:function(_){this.totalBackdropCount=_,_>this.bufferCapacity&&(this.bufferCapacity=Math.max(_,Math.ceil(this.bufferCapacity*1.5)||10),Ce(x,"reallocate",this,3)([this.bufferCapacity]))}}])})(jt);return C(b,"labelMargin",h),new b(e,n,t)}var No=(function(e){function n(){var t;ae(this,n);for(var r=arguments.length,a=new Array(r),i=0;i<r;i++)a[i]=arguments[i];return t=ye(this,n,[].concat(a)),C(t,"totalCharacterCount",0),C(t,"bufferCapacity",0),t}return be(n,e),ie(n,[{key:"processLabel",value:function(r,a,i){if(i.hidden||!i.text)return 0;for(var o=i.text,s=o.length,l=0;l<s;l++){var u=o[l];this.processCharacter(a+l,i,u,l)}return s}},{key:"hasNothingToRender",value:function(){return this.totalCharacterCount===0}},{key:"drawWebGL",value:function(r,a){var i=a.gl;this.totalCharacterCount!==0&&(this.isInstanced?i.drawArraysInstanced(r,0,this.VERTICES,this.totalCharacterCount):i.drawArrays(r,0,this.totalCharacterCount*this.VERTICES))}},{key:"reallocate",value:function(r){this.totalCharacterCount=r,r>this.bufferCapacity&&(this.bufferCapacity=Math.max(r,Math.ceil(this.bufferCapacity*1.5)||1e3),Ce(n,"reallocate",this,3)([this.bufferCapacity]))}}])})(jt);function hm(){var e=`#version 300 es

in float a_nodeIndex;
in vec4 a_id;
in vec4 a_color;
in float a_labelWidth;
in float a_labelHeight;
in float a_textHeight;
in float a_positionMode;
in float a_labelAngle;
in float a_padding;
in vec2 a_quadCorner;

uniform mat3 u_matrix;
uniform float u_sizeRatio;
uniform float u_correctionRatio;
uniform float u_cameraAngle;
uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_labelMargin;
uniform float u_zoomLabelSizeRatio;
uniform float u_labelPixelSnapping;
uniform float u_pickingPadding;
uniform sampler2D u_nodeDataTexture;
uniform int u_nodeDataTextureWidth;
uniform sampler2D u_nodeFrameTexture;
uniform int u_nodeFrameTextureWidth;

out vec4 v_id;
out vec4 v_color;

`.concat(gt,`
`).concat(Ht,`
`).concat(dn,`
`).concat(Fo,`

void main() {
  int nodeIdx = int(a_nodeIndex);

  // Node data: (x, y, size, shapeId).
  vec4 nodeData = readNodeData(u_nodeDataTexture, u_nodeDataTextureWidth, nodeIdx);
  vec2 nodePosition = nodeData.xy;
  float nodeSize = nodeData.z;

  // Shape-aware edge distance, read once from the shared frame texture.
  float edgeDist = readFrameTexel(u_nodeFrameTexture, u_nodeFrameTextureWidth, nodeIdx).r;

  // Per-node label rotation alignment: 0 = viewport, 1 = label turns with camera.
  float labelRotation = readNodeFlags(u_nodeDataTexture, u_nodeDataTextureWidth, nodeIdx).g;

  `).concat(Po,`

  float zoomScale = u_zoomLabelSizeRatio;
  float labelW = a_labelWidth * zoomScale * u_pixelRatio;
  float labelH = a_labelHeight * zoomScale * u_pixelRatio;
  float labelMargin = u_labelMargin * zoomScale * u_pixelRatio;
#ifdef PICKING_MODE
  float padding = u_pickingPadding * u_pixelRatio;
#else
  float padding = a_padding * u_pixelRatio;
#endif

  if (labelW <= 0.0) {
    gl_Position = vec4(2.0, 0.0, 0.0, 1.0);
    v_id = vec4(0.0);
    v_color = vec4(0.0);
    return;
  }

  vec2 labelHalfSize = vec2(labelW * 0.5 + padding, labelH * 0.5 + padding);
  vec2 labelOffset = vec2(0.0);

  // Graph-aligned labels add the camera angle so the rect orbits with the text.
  float labelAngle = a_labelAngle - labelRotation * u_cameraAngle;
  float la_c = cos(labelAngle);
  float la_s = sin(labelAngle);
  mat2 labelRotMat = mat2(la_c, -la_s, la_s, la_c);

  vec3 nodeClip = u_matrix * vec3(nodePosition, 1.0);
  vec2 nodeScreen = vec2(
    (nodeClip.x + 1.0) * u_resolution.x,
    (1.0 - nodeClip.y) * u_resolution.y
  ) * 0.5;
  vec2 snapDelta = (round(nodeScreen) - nodeScreen) * u_labelPixelSnapping;

  if (a_positionMode < 4.0) {
    float labelStart = nodeRadiusPixels * edgeDist + labelMargin;
    float textHalf = a_textHeight * zoomScale * u_pixelRatio * 0.5;
    // Box center uses the text half-size; the padding expands the quad below.
    labelOffset = labelRotMat * labelBoxCenter(a_positionMode, labelStart, vec2(labelW * 0.5, labelH * 0.5), textHalf);
  }

  // Rotate the rect with the label so it stays aligned with the (rotated) text.
  vec2 localPos = labelOffset + labelRotMat * (a_quadCorner * labelHalfSize);
  vec2 ndcOffset = (localPos + snapDelta) * 2.0 / u_resolution;
  ndcOffset.y = -ndcOffset.y;

  gl_Position = vec4(nodeClip.xy + ndcOffset, 0.0, 1.0);
  v_id = a_id;
  v_color = a_color;
}
`);return e}var fm=`#version 300 es
precision highp float;

in vec4 v_id;
in vec4 v_color;

out vec4 fragColor;

void main() {
  #ifdef PICKING_MODE
    fragColor = v_id;
  #else
    if (v_color.a <= 0.0) discard;
    // v_color is non-premultiplied RGBA (0-1); convert to premultiplied for blending
    fragColor = vec4(v_color.rgb * v_color.a, v_color.a);
  #endif
}
`;function gm(e,n,t,r){var a,i,o=r.label,s=o===void 0?{}:o,l=(a=s.margin)!==null&&a!==void 0?a:un,u=(i=s.zoomToLabelSizeRatioFunction)!==null&&i!==void 0?i:function(){return 1},d=hm(),c=(function(h){function g(){var p;ae(this,g);for(var m=arguments.length,b=new Array(m),v=0;v<m;v++)b[v]=arguments[v];return p=ye(this,g,[].concat(b)),C(p,"totalCount",0),C(p,"bufferCapacity",0),p}return be(g,h),ie(g,[{key:"getDefinition",value:function(){var m=WebGL2RenderingContext,b=m.FLOAT,v=m.UNSIGNED_BYTE,x=m.TRIANGLE_STRIP;return{VERTICES:4,VERTEX_SHADER_SOURCE:d,FRAGMENT_SHADER_SOURCE:fm,METHOD:x,UNIFORMS:["u_matrix","u_sizeRatio","u_correctionRatio","u_cameraAngle","u_resolution","u_pixelRatio","u_labelMargin","u_zoomLabelSizeRatio","u_labelPixelSnapping","u_pickingPadding","u_nodeDataTexture","u_nodeDataTextureWidth","u_nodeFrameTexture","u_nodeFrameTextureWidth"],ATTRIBUTES:[{name:"a_nodeIndex",size:1,type:b},{name:"a_id",size:4,type:v,normalized:!0},{name:"a_color",size:4,type:v,normalized:!0},{name:"a_labelWidth",size:1,type:b},{name:"a_labelHeight",size:1,type:b},{name:"a_textHeight",size:1,type:b},{name:"a_positionMode",size:1,type:b},{name:"a_labelAngle",size:1,type:b},{name:"a_padding",size:1,type:b}],CONSTANT_ATTRIBUTES:[{name:"a_quadCorner",size:2,type:b}],CONSTANT_DATA:[[-1,-1],[1,-1],[-1,1],[1,1]]}}},{key:"processLabelBackground",value:function(m,b){var v=this.floats,x=this.ints,y=m*this.STRIDE;v[y++]=b.nodeIndex,x[y++]=b.id,v[y++]=b.color,v[y++]=b.labelWidth,v[y++]=b.labelHeight,v[y++]=b.textHeight,v[y++]=b.positionMode,v[y++]=b.labelAngle,v[y++]=b.padding}},{key:"setUniforms",value:function(m,b){var v=b.gl,x=b.uniformLocations;v.uniformMatrix3fv(x.u_matrix,!1,m.matrix),v.uniform1f(x.u_sizeRatio,m.sizeRatio),v.uniform1f(x.u_correctionRatio,m.correctionRatio),v.uniform1f(x.u_cameraAngle,m.cameraAngle),v.uniform2f(x.u_resolution,m.width*m.pixelRatio,m.height*m.pixelRatio),v.uniform1f(x.u_pixelRatio,m.pixelRatio),v.uniform1f(x.u_labelMargin,g.labelMargin),v.uniform1f(x.u_zoomLabelSizeRatio,1/u(m.zoomRatio)),v.uniform1f(x.u_labelPixelSnapping,m.labelPixelSnapping),v.uniform1f(x.u_pickingPadding,m.labelPickingPadding),v.uniform1i(x.u_nodeDataTexture,m.nodeDataTextureUnit),v.uniform1i(x.u_nodeDataTextureWidth,m.nodeDataTextureWidth),v.uniform1i(x.u_nodeFrameTexture,m.nodeFrameTextureUnit),v.uniform1i(x.u_nodeFrameTextureWidth,m.nodeFrameTextureWidth)}},{key:"hasNothingToRender",value:function(){return this.totalCount===0}},{key:"drawWebGL",value:function(m,b){var v=b.gl;this.totalCount!==0&&v.drawArraysInstanced(v.TRIANGLE_STRIP,0,this.VERTICES,this.totalCount)}},{key:"reallocate",value:function(m){this.totalCount=m,m>this.bufferCapacity&&(this.bufferCapacity=Math.max(m,Math.ceil(this.bufferCapacity*1.5)||10),Ce(g,"reallocate",this,3)([this.bufferCapacity]))}}])})(jt);return C(c,"labelMargin",l),new c(e,n,t)}var ft={fontSize:64,buffer:8,radius:24,cutoff:.25,maxTextureSize:2048,debounceTimeout:100},Tr=2,wr=1e20;function pm(e,n,t,r,a){var i=e+a*4,o=document.createElement("canvas");o.width=i,o.height=i;var s=o.getContext("2d",{willReadFrequently:!0});return s.font="".concat(r," ").concat(t," ").concat(e,"px ").concat(n),s.textBaseline="alphabetic",s.textAlign="left",s.fillStyle="black",{ctx:s,canvasSize:i,gridOuter:new Float64Array(i*i),gridInner:new Float64Array(i*i),f:new Float64Array(i),z:new Float64Array(i+1),v:new Uint16Array(i)}}function mm(e,n,t,r,a){var i=e.ctx,o=e.canvasSize,s=i.measureText(n),l=s.width,u=s.actualBoundingBoxAscent,d=s.actualBoundingBoxDescent,c=s.actualBoundingBoxLeft,h=s.actualBoundingBoxRight,g=Math.ceil(u),p=Math.ceil(c),m=Math.max(0,Math.min(o-t,Math.ceil(c)+Math.ceil(h))),b=Math.min(o-t,g+Math.ceil(d)),v=m+2*t,x=b+2*t,y=Math.max(v*x,0),_=new Uint8ClampedArray(y),S={data:_,width:v,height:x,glyphWidth:m,glyphHeight:b,glyphTop:g,glyphLeft:p,glyphAdvance:l};if(m===0||b===0)return S;var T=e.gridInner,A=e.gridOuter;i.clearRect(t,t,m,b),i.fillText(n,t+p,t+g);var w=i.getImageData(t,t,m,b);A.fill(wr,0,y),T.fill(0,0,y);for(var E=0;E<b;E++)for(var R=0;R<m;R++){var L=w.data[4*(E*m+R)+3]/255;if(L!==0){var k=(E+t)*v+R+t;if(L===1)A[k]=0,T[k]=wr;else{var P=.5-L;A[k]=P>0?P*P:0,T[k]=P<0?P*P:0}}}yu(A,0,0,v,x,v,e.f,e.v,e.z),yu(T,t,t,m,b,v,e.f,e.v,e.z);for(var D=0;D<y;D++){var I=Math.sqrt(A[D])-Math.sqrt(T[D]);_[D]=Math.round(255-255*(I/r+a))}return S}function yu(e,n,t,r,a,i,o,s,l){for(var u=n;u<n+r;u++)bu(e,t*i+u,i,a,o,s,l);for(var d=t;d<t+a;d++)bu(e,d*i+n,1,r,o,s,l)}function bu(e,n,t,r,a,i,o){i[0]=0,o[0]=-wr,o[1]=wr,a[0]=e[n];for(var s=1,l=0,u=0;s<r;s++){a[s]=e[n+s*t];var d=s*s;do{var c=i[l];u=(a[s]-a[c]+d-c*c)/(s-c)/2}while(u<=o[l]&&--l>-1);l++,i[l]=s,o[l]=u,o[l+1]=wr}for(var h=0,g=0;h<r;h++){for(;o[g+1]<h;)g++;var p=i[g],m=h-p;e[n+h*t]=a[p]+m*m}}var sn=(function(e){function n(){var t,r=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};return ae(this,n),t=ye(this,n),C(t,"fonts",new Map),C(t,"textures",[]),C(t,"cursor",{x:0,y:0,rowHeight:0,atlasIndex:0}),C(t,"pendingGlyphs",[]),C(t,"debounceTimer",null),t.options=H(H({},ft),r),t.canvas=document.createElement("canvas"),t.canvas.width=t.options.maxTextureSize,t.canvas.height=t.options.maxTextureSize,t.ctx=t.canvas.getContext("2d",{willReadFrequently:!0}),t.measureCanvas=document.createElement("canvas"),t.measureCtx=t.measureCanvas.getContext("2d"),t.textures.push(t.ctx.getImageData(0,0,1,1)),t}return be(n,e),ie(n,[{key:"getFontKey",value:function(r){return"".concat(r.family,"-").concat(r.weight,"-").concat(r.style)}},{key:"registerFont",value:function(r){var a=this.getFontKey(r);if(this.fonts.has(a))return a;var i=pm(this.options.fontSize,r.family,r.weight,r.style,this.options.buffer);return this.fonts.set(a,{descriptor:r,generator:i,glyphs:new Map}),a}},{key:"ensureGlyphs",value:function(r,a){var i=this.fonts.get(a);if(!i)throw new Error('Font "'.concat(a,'" is not registered. Call registerFont() first.'));var o=!1,s=U(r),l;try{for(s.s();!(l=s.n()).done;){var u=l.value,d=u.codePointAt(0);d!==void 0&&(i.glyphs.has(d)||(this.pendingGlyphs.push({fontKey:a,charCode:d}),o=!0))}}catch(c){s.e(c)}finally{s.f()}o&&this.scheduleTextureGeneration()}},{key:"measureText",value:function(r,a){var i=this.fonts.get(a);if(!i)throw new Error('Font "'.concat(a,'" is not registered.'));var o=i.descriptor,s=o.family,l=o.weight,u=o.style;return this.measureCtx.font="".concat(u," ").concat(l," ").concat(this.options.fontSize,"px ").concat(s),this.measureCtx.measureText(r).width}},{key:"getGlyph",value:function(r,a){var i=this.fonts.get(a);if(i)return i.glyphs.get(r)}},{key:"getTextures",value:function(){return this.textures}},{key:"getFontCount",value:function(){return this.fonts.size}},{key:"getGlyphCount",value:function(){var r=0,a=U(this.fonts.values()),i;try{for(a.s();!(i=a.n()).done;){var o=i.value;r+=o.glyphs.size}}catch(s){a.e(s)}finally{a.f()}return r}},{key:"hasPendingGlyphs",value:function(){return this.pendingGlyphs.length>0}},{key:"flush",value:function(){this.debounceTimer&&(clearTimeout(this.debounceTimer),this.debounceTimer=null),this.generateTextures()}},{key:"destroy",value:function(){this.debounceTimer&&clearTimeout(this.debounceTimer),this.fonts.clear(),this.textures=[],this.pendingGlyphs=[],this.removeAllListeners()}},{key:"scheduleTextureGeneration",value:function(){var r=this;this.debounceTimer===null&&(this.options.debounceTimeout===null?this.generateTextures():this.debounceTimer=setTimeout(function(){r.debounceTimer=null,r.generateTextures()},this.options.debounceTimeout))}},{key:"generateTextures",value:function(){if(this.pendingGlyphs.length!==0){var r=this.options,a=r.maxTextureSize,i=r.buffer,o=r.radius,s=r.cutoff,l=U(this.pendingGlyphs),u;try{for(l.s();!(u=l.n()).done;){var d=u.value,c=d.fontKey,h=d.charCode,g=this.fonts.get(c);if(!(!g||g.glyphs.has(h))){var p=String.fromCodePoint(h),m=mm(g.generator,p,i,o,s),b=m.width,v=m.height;this.cursor.x+b+Tr>a&&(this.cursor.x=0,this.cursor.y+=this.cursor.rowHeight+Tr,this.cursor.rowHeight=0),this.cursor.y+v+Tr>a&&(this.finalizeCurrentTexture(),this.cursor={x:0,y:0,rowHeight:0,atlasIndex:this.cursor.atlasIndex+1},this.ctx.clearRect(0,0,a,a));for(var x=m.data,y=new Uint8ClampedArray(b*v*4),_=0;_<x.length;_++){var S=_*4;y[S]=255,y[S+1]=255,y[S+2]=255,y[S+3]=x[_]}var T=new ImageData(y,b,v);this.ctx.putImageData(T,this.cursor.x,this.cursor.y);var A={charCode:h,width:m.glyphWidth,height:m.glyphHeight,bearingX:-m.glyphLeft-i,bearingY:m.glyphTop+i,advance:m.glyphAdvance,atlasX:this.cursor.x,atlasY:this.cursor.y,atlasWidth:b,atlasHeight:v,atlasIndex:this.cursor.atlasIndex};g.glyphs.set(h,A),this.cursor.x+=b+Tr,this.cursor.rowHeight=Math.max(this.cursor.rowHeight,v)}}}catch(w){l.e(w)}finally{l.f()}this.finalizeCurrentTexture(),this.pendingGlyphs=[],this.emit(n.ATLAS_UPDATED_EVENT,{textures:this.textures,glyphCount:this.getGlyphCount()})}}},{key:"finalizeCurrentTexture",value:function(){var r=this.options.maxTextureSize,a=this.cursor.y>0||this.cursor.rowHeight>0,i=Math.min(r,Math.max(this.cursor.x,a?r:1)),o=Math.min(r,this.cursor.y+this.cursor.rowHeight+Tr),s=this.ctx.getImageData(0,0,i,o);this.cursor.atlasIndex>=this.textures.length?this.textures.push(s):this.textures[this.cursor.atlasIndex]=s}}])})(Tu.EventEmitter);C(sn,"ATLAS_UPDATED_EVENT","atlasUpdated");var vm=ft.fontSize;function Yu(){var e=`  // -------------------------------------------------------------------------
  // Step 3: Calculate position offset from the shared edge distance
  // -------------------------------------------------------------------------
  vec2 positionOffset = vec2(0.0);

  if (a_positionMode < 4.0) {
    vec2 screenDir = getLabelDirection(a_positionMode);
    float boundaryDistPixels = nodeRadiusPixels * edgeDist;
    positionOffset = screenDir * (boundaryDistPixels + margin);
  }`,n=`#version 300 es

// ============================================================================
// Attributes
// ============================================================================

// Per-character (instanced)
in float a_nodeIndex;        // Index into node data texture
in vec2 a_charOffset;        // Character offset from label origin (pixels)
in vec2 a_charSize;          // Character dimensions (pixels)
in vec4 a_texCoords;         // Atlas coords: (x, y, width, height) in pixels
in vec4 a_color;             // Text color (RGBA)
in float a_margin;           // Gap between node edge and label (pixels)
in float a_positionMode;     // Position: 0=right, 1=left, 2=above, 3=below, 4=over
in float a_labelWidth;       // Total label width (pixels)
in float a_labelHeight;      // Label height (pixels)
in float a_verticalCenter;   // Vertical center offset from baseline (pixels)
in float a_textHeight;       // Actual text height: maxAscent + maxDescent (pixels)
in float a_labelAngle;       // Label rotation angle (radians)

// Per-vertex (constant quad corners)
in vec2 a_quadCorner;        // Quad corner: [-1,-1], [1,-1], [-1,1], [1,1]

// ============================================================================
// Uniforms
// ============================================================================

uniform mat3 u_matrix;
uniform float u_sizeRatio;
uniform float u_correctionRatio;
uniform float u_cameraAngle;
uniform vec2 u_resolution;
uniform vec2 u_atlasSize;
uniform sampler2D u_nodeDataTexture;
uniform int u_nodeDataTextureWidth;
uniform sampler2D u_nodeFrameTexture;
uniform int u_nodeFrameTextureWidth;
uniform float u_zoomLabelSizeRatio;
uniform float u_labelPixelSnapping;
uniform float u_pixelRatio;

// ============================================================================
// Varyings
// ============================================================================

out vec2 v_texCoord;
out vec4 v_color;
out float v_fontScale;

// ============================================================================
// Constants
// ============================================================================

const float bias = 255.0 / 254.0;
const float ATLAS_FONT_SIZE = `.concat(ge(vm),`;

// ============================================================================
// Helper Functions
// ============================================================================

`).concat(gt,`
`).concat(Ht,`
`).concat(dn,`
`).concat(Io,`

// ============================================================================
// Main
// ============================================================================

void main() {
  // -------------------------------------------------------------------------
  // Step 0: Fetch node data + shared edge distance from textures
  // -------------------------------------------------------------------------
  // Node-data texture format: vec4(x, y, size, shapeId)
  // 2D texture layout: texCoord = (index % width, index / width)
  int nodeIdx = int(a_nodeIndex);
  vec4 nodeData = readNodeData(u_nodeDataTexture, u_nodeDataTextureWidth, nodeIdx);
  vec2 a_anchorPosition = nodeData.xy;
  float a_nodeSize = nodeData.z;

  // Normalized edge distance from the shared frame texture (the frame-pass ran
  // the SDF search once; the label just reads the result).
  float edgeDist = readFrameTexel(u_nodeFrameTexture, u_nodeFrameTextureWidth, nodeIdx).r;

  // Per-node label rotation alignment: 0 = viewport, 1 = label turns with camera.
  float labelRotation = readNodeFlags(u_nodeDataTexture, u_nodeDataTextureWidth, nodeIdx).g;

  // Apply zoom-dependent label size scaling
  // Positional values are in CSS pixels; multiply by u_pixelRatio to convert to
  // physical pixels, which is what the NDC conversion (/ u_resolution) expects.
  float zoomScale = u_zoomLabelSizeRatio;
  float margin = a_margin * zoomScale * u_pixelRatio;
  vec2 charOffset = a_charOffset * zoomScale * u_pixelRatio;
  vec2 charSize = a_charSize * zoomScale * u_pixelRatio;
  float labelWidth = a_labelWidth * zoomScale * u_pixelRatio;
  float labelHeight = a_labelHeight * zoomScale;

  // Font scale: ratio of CSS label size to the base atlas font size.
  // Divided by u_pixelRatio because the atlas is generated at ATLAS_FONT_SIZE * pixelRatio,
  // which cancels out the u_pixelRatio in the fragment shader's gamma formula and keeps
  // the anti-aliasing band width consistent across pixel densities.
  v_fontScale = a_labelHeight * zoomScale / (ATLAS_FONT_SIZE * u_pixelRatio);

  // -------------------------------------------------------------------------
  // Step 1: Transform node position to clip space
  // -------------------------------------------------------------------------
  vec3 anchorClip = u_matrix * vec3(a_anchorPosition, 1.0);

  // -------------------------------------------------------------------------
  // Step 2: Convert node size to screen pixels
  // -------------------------------------------------------------------------
  float matrixScaleX = length(vec2(u_matrix[0][0], u_matrix[1][0]));
  float nodeRadiusGraphSpace = a_nodeSize * u_correctionRatio / u_sizeRatio * 2.0;
  float nodeRadiusNDC = nodeRadiusGraphSpace * matrixScaleX;
  float nodeRadiusPixels = nodeRadiusNDC * u_resolution.x / 2.0;

`).concat(e,`

  // -------------------------------------------------------------------------
  // Step 4: Calculate final vertex position
  // -------------------------------------------------------------------------
  vec2 cornerOffset = (a_quadCorner + 1.0) * 0.5;
  vec2 charPixelPos = positionOffset + charOffset + cornerOffset * charSize;

  // Apply text alignment based on position mode
  float verticalCenter = a_verticalCenter * zoomScale * u_pixelRatio;
  float textHeight = a_textHeight * zoomScale * u_pixelRatio;
  float baselineToDescent = textHeight / 2.0 - verticalCenter;
  float baselineToAscent = textHeight / 2.0 + verticalCenter;

  if (a_positionMode < 0.5) {
    // Right: vertically center
    charPixelPos.y += verticalCenter;
  } else if (a_positionMode < 1.5) {
    // Left: right-align and vertically center
    charPixelPos.x -= labelWidth;
    charPixelPos.y += verticalCenter;
  } else if (a_positionMode < 2.5) {
    // Above: center horizontally, bottom of text at anchor
    charPixelPos.x -= labelWidth * 0.5;
    charPixelPos.y -= baselineToDescent;
  } else if (a_positionMode < 3.5) {
    // Below: center horizontally, top of text at anchor
    charPixelPos.x -= labelWidth * 0.5;
    charPixelPos.y += baselineToAscent;
  } else {
    // Over: center both
    charPixelPos.x -= labelWidth * 0.5;
    charPixelPos.y += verticalCenter;
  }

  // Apply label angle rotation. Graph-aligned labels add the camera angle so the
  // whole label orbits the node in lockstep with the frame-pass edge distance.
  float labelAngle = a_labelAngle - labelRotation * u_cameraAngle;
  float la_c = cos(labelAngle);
  float la_s = sin(labelAngle);
  mat2 labelRotMat = mat2(la_c, -la_s, la_s, la_c);
  charPixelPos = labelRotMat * charPixelPos;

  // Snap node center to pixel grid so label/backdrop/attachment move as a unit
  vec2 nodeScreen = vec2(
    (anchorClip.x + 1.0) * u_resolution.x,
    (1.0 - anchorClip.y) * u_resolution.y
  ) * 0.5;
  charPixelPos += (round(nodeScreen) - nodeScreen) * u_labelPixelSnapping;

  // Convert to NDC (flip Y: screen Y-down -> clip Y-up)
  vec2 ndcOffset = vec2(charPixelPos.x, -charPixelPos.y) * 2.0 / u_resolution;
  gl_Position = vec4(anchorClip.xy + ndcOffset, 0.0, 1.0);

  // -------------------------------------------------------------------------
  // Step 5: Texture coordinates
  // -------------------------------------------------------------------------
  v_texCoord = (a_texCoords.xy + cornerOffset * a_texCoords.zw) / u_atlasSize;

  // -------------------------------------------------------------------------
  // Step 6: Pass color
  // -------------------------------------------------------------------------
  v_color = a_color;
  v_color.a *= bias;
}
`);return n}function Ku(){var e=`#version 300 es
precision highp float;

in vec2 v_texCoord;
in vec4 v_color;
in float v_fontScale;

uniform sampler2D u_atlas;
uniform float u_gamma;
uniform float u_sdfBuffer;
uniform float u_pixelRatio;

// Fragment output (single target - picking handled via separate pass)
out vec4 fragColor;

void main() {
  #ifdef PICKING_MODE
    // Labels are not pickable - discard all fragments in picking mode
    fragColor = vec4(0.0);
    discard;
  #else
    // Sample SDF value from atlas (high = inside glyph, low = outside)
    float sdfValue = texture(u_atlas, v_texCoord).a;

    // Edge threshold: 1.0 - cutoff = 0.75 for default cutoff=0.25
    // This is where the glyph edge is located in the SDF
    float edgeThreshold = 1.0 - u_sdfBuffer;

    // Gamma controls the anti-aliasing band width.
    // Scale inversely with font scale so small labels get a wider AA band
    // (smoother) and large labels get a tighter band (sharper).
    float gamma = u_gamma / (u_pixelRatio * v_fontScale);

    // Pure gamma-based anti-aliasing using smoothstep
    // The AA band extends from (threshold - gamma) to (threshold + gamma)
    float alpha = smoothstep(edgeThreshold - gamma, edgeThreshold + gamma, sdfValue);

    // Premultiplied alpha output for correct blending
    float finalAlpha = v_color.a * alpha;
    fragColor = vec4(v_color.rgb * finalAlpha, finalAlpha);
  #endif
}
`;return e}function Zu(){return["u_matrix","u_sizeRatio","u_correctionRatio","u_cameraAngle","u_resolution","u_atlasSize","u_atlas","u_gamma","u_sdfBuffer","u_pixelRatio","u_nodeDataTexture","u_nodeDataTextureWidth","u_nodeFrameTexture","u_nodeFrameTextureWidth","u_zoomLabelSizeRatio","u_labelPixelSnapping"]}function Qu(){return{vertexShader:Yu(),fragmentShader:Ku(),uniforms:Zu()}}function Ju(e,n,t,r){var a,i,o=r.label,s=o===void 0?{}:o,l=(a=s.margin)!==null&&a!==void 0?a:un,u=(i=s.zoomToLabelSizeRatioFunction)!==null&&i!==void 0?i:function(){return 1},d=Qu(),c=(function(h){function g(p,m,b){var v,x,y,_;if(ae(this,g),_=ye(this,g,[p,m,b]),C(_,"atlasTexture",null),C(_,"atlasNeedsUpdate",!1),C(_,"labelGlyphCache",new Map),_.atlasFontSize=ft.fontSize*_r(),_.atlasManager=new sn({fontSize:_.atlasFontSize}),_.gamma=.025,_.sdfBuffer=ft.cutoff,_.atlasTexture=p.createTexture(),!_.atlasTexture)throw new Error("NodeLabelProgram: failed to create atlas texture");p.bindTexture(p.TEXTURE_2D,_.atlasTexture),p.texParameteri(p.TEXTURE_2D,p.TEXTURE_WRAP_S,p.CLAMP_TO_EDGE),p.texParameteri(p.TEXTURE_2D,p.TEXTURE_WRAP_T,p.CLAMP_TO_EDGE),p.texParameteri(p.TEXTURE_2D,p.TEXTURE_MIN_FILTER,p.LINEAR),p.texParameteri(p.TEXTURE_2D,p.TEXTURE_MAG_FILTER,p.LINEAR),p.bindTexture(p.TEXTURE_2D,null),_.atlasManager.on(sn.ATLAS_UPDATED_EVENT,function(){_.atlasNeedsUpdate=!0});var S={family:((v=s.font)===null||v===void 0?void 0:v.family)||"sans-serif",weight:((x=s.font)===null||x===void 0?void 0:x.weight)||"normal",style:((y=s.font)===null||y===void 0?void 0:y.style)||"normal"};return _.defaultFontKey=_.atlasManager.registerFont(S),_}return be(g,h),ie(g,[{key:"getDefinition",value:function(){var m=WebGL2RenderingContext,b=m.FLOAT,v=m.UNSIGNED_BYTE,x=m.TRIANGLE_STRIP;return{VERTICES:4,VERTEX_SHADER_SOURCE:d.vertexShader,FRAGMENT_SHADER_SOURCE:d.fragmentShader,METHOD:x,UNIFORMS:d.uniforms,ATTRIBUTES:[{name:"a_nodeIndex",size:1,type:b},{name:"a_charOffset",size:2,type:b},{name:"a_charSize",size:2,type:b},{name:"a_texCoords",size:4,type:b},{name:"a_color",size:4,type:v,normalized:!0},{name:"a_margin",size:1,type:b},{name:"a_positionMode",size:1,type:b},{name:"a_labelWidth",size:1,type:b},{name:"a_labelHeight",size:1,type:b},{name:"a_verticalCenter",size:1,type:b},{name:"a_textHeight",size:1,type:b},{name:"a_labelAngle",size:1,type:b}],CONSTANT_ATTRIBUTES:[{name:"a_quadCorner",size:2,type:b}],CONSTANT_DATA:[[-1,-1],[1,-1],[-1,1],[1,1]]}}},{key:"prepareLabelGlyphs",value:function(m,b){if(b.hidden||!b.text){this.labelGlyphCache.delete(m);return}var v=b.text,x=b.fontKey||this.defaultFontKey;this.atlasManager.ensureGlyphs(v,x);var y=[],_=[],S=0,T=0,A=0,w=U(v),E;try{for(w.s();!(E=w.n()).done;){var R=E.value,L=R.codePointAt(0);if(L===void 0){y.push(void 0),_.push(S);continue}var k=this.atlasManager.getGlyph(L,x);y.push(k),_.push(S),k&&(S+=k.advance,T=Math.max(T,k.bearingY),A=Math.max(A,k.atlasHeight-k.bearingY))}}catch(P){w.e(P)}finally{w.f()}this.labelGlyphCache.set(m,{glyphs:y,xOffsets:_,totalWidth:S,totalHeight:T+A,verticalCenterOffset:(T-A)/2})}},{key:"processCharacter",value:function(m,b,v,x){var y=this.floats,_=this.STRIDE,S=m*_,T=this.labelGlyphCache.get(b.parentKey);if(!T||!T.glyphs[x]){for(var A=0;A<_;A++)y[S+A]=0;return}var w=T.glyphs[x],E=T.xOffsets[x],R=b.size/this.atlasFontSize,L=$e(b.color),k=S;y[k++]=b.nodeIndex,y[k++]=(E+w.bearingX)*R,y[k++]=-w.bearingY*R,y[k++]=w.atlasWidth*R,y[k++]=w.atlasHeight*R,y[k++]=w.atlasX,y[k++]=w.atlasY,y[k++]=w.atlasWidth,y[k++]=w.atlasHeight,y[k++]=L,y[k++]=b.margin,y[k++]=ln[b.position],y[k++]=T.totalWidth*R,y[k++]=b.size,y[k++]=T.verticalCenterOffset*R,y[k++]=T.totalHeight*R,y[k++]=b.labelAngle}},{key:"processLabel",value:function(m,b,v){return this.prepareLabelGlyphs(m,v),Ce(g,"processLabel",this,3)([m,b,v])}},{key:"updateAtlasTexture",value:function(){if(this.atlasNeedsUpdate){var m=this.normalProgram.gl,b=this.atlasManager.getTextures();if(b.length!==0){var v=b[0];m.bindTexture(m.TEXTURE_2D,this.atlasTexture),m.texImage2D(m.TEXTURE_2D,0,m.RGBA,v.width,v.height,0,m.RGBA,m.UNSIGNED_BYTE,v.data),m.bindTexture(m.TEXTURE_2D,null),this.atlasNeedsUpdate=!1}}}},{key:"setUniforms",value:function(m,b){var v=b.gl,x=b.uniformLocations;v.uniformMatrix3fv(x.u_matrix,!1,m.matrix),v.uniform1f(x.u_sizeRatio,m.sizeRatio),v.uniform1f(x.u_correctionRatio,m.correctionRatio),v.uniform1f(x.u_cameraAngle,m.cameraAngle),v.uniform2f(x.u_resolution,m.width*m.pixelRatio,m.height*m.pixelRatio);var y=this.atlasManager.getTextures();y.length>0?v.uniform2f(x.u_atlasSize,y[0].width,y[0].height):v.uniform2f(x.u_atlasSize,1,1),v.activeTexture(v.TEXTURE0),v.bindTexture(v.TEXTURE_2D,this.atlasTexture),v.uniform1i(x.u_atlas,0),x.u_nodeDataTexture!==void 0&&v.uniform1i(x.u_nodeDataTexture,m.nodeDataTextureUnit),x.u_nodeDataTextureWidth!==void 0&&v.uniform1i(x.u_nodeDataTextureWidth,m.nodeDataTextureWidth),v.uniform1i(x.u_nodeFrameTexture,m.nodeFrameTextureUnit),v.uniform1i(x.u_nodeFrameTextureWidth,m.nodeFrameTextureWidth),v.uniform1f(x.u_gamma,this.gamma),v.uniform1f(x.u_sdfBuffer,this.sdfBuffer),v.uniform1f(x.u_pixelRatio,m.pixelRatio),v.uniform1f(x.u_zoomLabelSizeRatio,1/g.zoomToLabelSizeRatioFunction(m.zoomRatio)),v.uniform1f(x.u_labelPixelSnapping,m.labelPixelSnapping)}},{key:"renderProgram",value:function(m,b){this.updateAtlasTexture(),this.atlasManager.hasPendingGlyphs()&&(this.atlasManager.flush(),this.updateAtlasTexture()),Ce(g,"renderProgram",this,3)([m,b])}},{key:"registerFont",value:function(m){var b=arguments.length>1&&arguments[1]!==void 0?arguments[1]:"normal",v=arguments.length>2&&arguments[2]!==void 0?arguments[2]:"normal";return this.atlasManager.registerFont({family:m,weight:b,style:v})}},{key:"getAtlasManager",value:function(){return this.atlasManager}},{key:"measureLabel",value:function(m,b,v){var x=v||this.defaultFontKey;this.atlasManager.ensureGlyphs(m,x),this.atlasManager.hasPendingGlyphs()&&this.atlasManager.flush();var y=0,_=0,S=0,T=U(m),A;try{for(T.s();!(A=T.n()).done;){var w=A.value,E=w.codePointAt(0);if(E!==void 0){var R=this.atlasManager.getGlyph(E,x);R&&(y+=R.advance,_=Math.max(_,R.bearingY),S=Math.max(S,R.atlasHeight-R.bearingY))}}}catch(k){T.e(k)}finally{T.f()}var L=b/this.atlasFontSize;return{width:y*L,height:b,textHeight:(_+S)*L}}},{key:"ensureGlyphsReady",value:function(m,b){var v=b||this.defaultFontKey,x=U(m),y;try{for(x.s();!(y=x.n()).done;){var _=y.value;this.atlasManager.ensureGlyphs(_,v)}}catch(S){x.e(S)}finally{x.f()}this.atlasManager.flush()}},{key:"kill",value:function(){var m=this.normalProgram.gl;this.atlasTexture&&(m.deleteTexture(this.atlasTexture),this.atlasTexture=null),this.atlasManager.destroy(),this.labelGlyphCache.clear(),Ce(g,"kill",this,3)([])}}])})(No);return C(c,"labelMargin",l),C(c,"zoomToLabelSizeRatioFunction",u),new c(e,n,t)}var ym=`#version 300 es
precision highp float;

in float v_edgeDist;

// R32F target: only the .r channel is stored.
out vec4 fragColor;

void main() {
  fragColor = vec4(v_edgeDist, 0.0, 0.0, 0.0);
}
`;function bm(e,n,t){var r=ja(e),a=On(e).map(function(p){return"uniform ".concat(p.type," ").concat(p.name,";")}).join(`
`),i=Nu(e,t),o=i.code,s=i.multiShape,l=Wn(e,n),u=Object.keys(l.specs).map(function(p){return"float v_".concat(p,";")}).join(`
`),d=zn(l,{varPrefix:"nodeAttr",baseTexelExpr:"nodeIdx * u_layerAttributeTexelsPerNode",textureWidthUniform:"u_layerAttributeTextureWidth",textureSamplerUniform:"u_layerAttributeTexture"}),c=d.fetchCode,h=d.varyingAssignments,g=`#version 300 es
precision highp float;

uniform float u_cameraAngle;
uniform sampler2D u_nodeDataTexture;
uniform int u_nodeDataTextureWidth;
uniform float u_frameTextureWidth;
uniform float u_frameTextureHeight;
uniform sampler2D u_layerAttributeTexture;
uniform int u_layerAttributeTextureWidth;
uniform int u_layerAttributeTexelsPerNode;
`.concat(a,`

in float a_nodeIndex;     // node-data texture index (also the target frame texel)
in float a_positionMode;  // 0=right 1=left 2=above 3=below 4=over
in float a_labelAngle;    // intrinsic label angle (radians)

out float v_edgeDist;

// Shape attributes (plain globals: this pass is vertex-only)
`).concat(u,`

`).concat(gt,`
`).concat(Ht,`
`).concat(r,`
`).concat(o,`
`).concat(Io,`

void main() {
  int nodeIdx = int(a_nodeIndex);
`).concat(c,`
`).concat(h,`
  `).concat(s?`// Multi-shape: the shape id lives in the node-data texture's .w channel:
  g_shapeId = int(readNodeData(u_nodeDataTexture, u_nodeDataTextureWidth, nodeIdx).w);`:"// Single-shape mode, shape id not needed",`

  // Per-node rotation alignment (0 = viewport, 1 = graph).
  vec4 nodeFlags = readNodeFlags(u_nodeDataTexture, u_nodeDataTextureWidth, nodeIdx);
  float nodeRotation = nodeFlags.r;
  float labelRotation = nodeFlags.g;

  // Effective angle: intrinsic (style-given) plus the camera angle when the label
  // is graph-aligned. The companions place the box at this same angle.
  float effectiveAngle = a_labelAngle - labelRotation * u_cameraAngle;

  // The "over" mode (4) sits on the node center, so it has no edge distance.
  float edgeDist = 0.0;
  if (a_positionMode < 4.0) {
    vec2 screenDir = getLabelDirection(a_positionMode);
    // Rotate by the effective label angle. Inlined rather than via rotate2D()
    // because the shape SDFs (getShapeGLSLForShapes) already define that helper
    // for multi-shape programs, and redefining it would be a GLSL error.
    float ea_c = cos(effectiveAngle);
    float ea_s = sin(effectiveAngle);
    vec2 rotatedScreenDir = mat2(ea_c, -ea_s, ea_s, ea_c) * screenDir;
    // Screen (Y-down) -> SDF (Y-up).
    vec2 sdfDir = vec2(rotatedScreenDir.x, -rotatedScreenDir.y);
    // Counter-rotate into the shape's local frame for graph-aligned nodes, so the
    // boundary is queried against the shape's actual on-screen orientation.
    float nodeCa = -u_cameraAngle * nodeRotation;
    float nc = cos(nodeCa), ns = sin(nodeCa);
    sdfDir = mat2(nc, -ns, ns, nc) * sdfDir;
    edgeDist = findEdgeDistance(sdfDir, 1.0);
  }
  v_edgeDist = edgeDist;

  // Scatter to this node's texel center in the frame texture.
  float x = mod(a_nodeIndex, u_frameTextureWidth);
  float y = floor(a_nodeIndex / u_frameTextureWidth);
  vec2 ndc = (vec2(x, y) + 0.5) / vec2(u_frameTextureWidth, u_frameTextureHeight) * 2.0 - 1.0;
  gl_Position = vec4(ndc, 0.0, 1.0);
  gl_PointSize = 1.0;
}
`);return g}var zo=(function(){function e(n,t){ae(this,e),C(this,"uniformLocations",{});var r=t.shapes,a=t.layers,i=t.shapeGlobalIds;if(r.length===0)throw new Error("NodeLabelFramePass: at least one shape must be provided");this.gl=n,this.shapeUniforms=On(r),this.hasAttributeData=Object.keys(Wn(r,a).offsets).length>0,this.vertexShader=Ua(n,bm(r,a,i)),this.fragmentShader=$a(n,ym),this.program=Ha(n,[this.vertexShader,this.fragmentShader]);var o=["u_cameraAngle","u_nodeDataTexture","u_nodeDataTextureWidth","u_frameTextureWidth","u_frameTextureHeight","u_layerAttributeTexture","u_layerAttributeTextureWidth","u_layerAttributeTexelsPerNode"].concat(Z(this.shapeUniforms.map(function(v){return v.name}))),s=U(o),l;try{for(s.s();!(l=s.n()).done;){var u=l.value;this.uniformLocations[u]=n.getUniformLocation(this.program,u)}}catch(v){s.e(v)}finally{s.f()}var d=e.FLOATS_PER_POINT*4;this.vao=n.createVertexArray(),this.buffer=n.createBuffer(),n.bindVertexArray(this.vao),n.bindBuffer(n.ARRAY_BUFFER,this.buffer);var c=U([["a_nodeIndex",0],["a_positionMode",4],["a_labelAngle",8]]),h;try{for(c.s();!(h=c.n()).done;){var g=se(h.value,2),p=g[0],m=g[1],b=n.getAttribLocation(this.program,p);b>=0&&(n.enableVertexAttribArray(b),n.vertexAttribPointer(b,1,n.FLOAT,!1,d,m))}}catch(v){c.e(v)}finally{c.f()}n.bindVertexArray(null)}return ie(e,[{key:"run",value:function(t,r,a,i,o){if(r!==0){var s=this.gl;s.useProgram(this.program),s.bindVertexArray(this.vao),s.bindBuffer(s.ARRAY_BUFFER,this.buffer),s.bufferData(s.ARRAY_BUFFER,t.subarray(0,r*e.FLOATS_PER_POINT),s.DYNAMIC_DRAW);var l=this.uniformLocations;s.uniform1f(l.u_cameraAngle,i.cameraAngle),s.uniform1i(l.u_nodeDataTexture,i.nodeDataTextureUnit),s.uniform1i(l.u_nodeDataTextureWidth,i.nodeDataTextureWidth),s.uniform1f(l.u_frameTextureWidth,a.getTextureWidth()),s.uniform1f(l.u_frameTextureHeight,a.getTextureHeight()),this.hasAttributeData&&o&&(o.bind(Ut),l.u_layerAttributeTexture&&s.uniform1i(l.u_layerAttributeTexture,Ut),l.u_layerAttributeTextureWidth&&s.uniform1i(l.u_layerAttributeTextureWidth,o.getTextureWidth()),l.u_layerAttributeTexelsPerNode&&s.uniform1i(l.u_layerAttributeTexelsPerNode,o.getTexelsPerItem()));var u=U(this.shapeUniforms),d;try{for(u.s();!(d=u.n()).done;){var c=d.value;Mo(s,this.uniformLocations[c.name],c)}}catch(h){u.e(h)}finally{u.f()}a.bindAsRenderTarget(),s.disable(s.BLEND),s.disable(s.DEPTH_TEST),s.drawArrays(s.POINTS,0,r),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindVertexArray(null)}}},{key:"kill",value:function(){var t=this.gl;t.deleteProgram(this.program),t.deleteShader(this.vertexShader),t.deleteShader(this.fragmentShader),t.deleteBuffer(this.buffer),t.deleteVertexArray(this.vao)}}])})();C(zo,"FLOATS_PER_POINT",3);function Go(e,n,t,r,a){var i,o=r.label,s=o===void 0?{}:o,l=r.shapes;if(l.length===0)throw new Error("createNodeProgram: at least one shape must be provided in 'shapes'");var u={},d=[],c;l.forEach(function(A,w){var E=Au(A);w===0&&(c=E),u[A.name]=w,d[w]=Gn(E)});var h=Z(r.layers),g=ko({shapes:l,layers:h,shapeGlobalIds:l.length>1?d:void 0,antialias:a}),p=Ju(e,null,t,{label:s}),m=Xu(e,null,t,{shapes:l,layers:h,getAttributeTexture:function(){return T.getAttributeTexture()},label:s,shapeGlobalIds:l.length>1?d:void 0}),b=gm(e,n,t,{label:s}),v=r.labelAttachments&&Object.keys(r.labelAttachments).length>0?cm(e,null,t,{label:s}):null,x=new zo(e,{shapes:l,layers:h,shapeGlobalIds:l.length>1?d:void 0}),y=Za(l,h),_=tt(y),S=(i=(function(A){function w(E,R,L){var k;ae(this,w),k=ye(this,w,[E,R,L]),C(k,"layerLifecycles",new Map),C(k,"layersNeedingRegeneration",new Set),C(k,"attrDescriptors",[]),k._pickingBuffer=R;var P=S.layerTextures.get(E);P||(P=new Xa(E,_),S.layerTextures.set(E,P)),k.layerAttributeTexture=P;var D=S.textureRefCounts.get(E)||0;S.textureRefCounts.set(E,D+1),k.packedAttributeData=new Float32Array(_.floatsPerItem),h.forEach(function(G,z){if(G.lifecycle){var F={gl:E,renderer:{refresh:function(){return L.refresh()}},getUniformLocation:function(X){return E.getUniformLocation(k.normalProgram.program,X)},requestShaderRegeneration:function(){k.layersNeedingRegeneration.add(z)},requestRefresh:function(){L.refresh()}},M=G.lifecycle(F);k.layerLifecycles.set(z,M)}}),k.layerLifecycles.forEach(function(G){var z;(z=G.init)===null||z===void 0||z.call(G)});var I=new Map;return k.layerLifecycles.forEach(function(G,z){G.getAttributeData&&I.set(z,G)}),k.attrDescriptors=Ya(y,_,I),k}return be(w,A),ie(w,[{key:"getDefinition",value:function(){var R=WebGL2RenderingContext,L=R.FLOAT,k=R.TRIANGLE_STRIP;return{VERTICES:4,VERTEX_SHADER_SOURCE:g.vertexShader,FRAGMENT_SHADER_SOURCE:g.fragmentShader,METHOD:k,UNIFORMS:g.uniforms,ATTRIBUTES:g.attributes,CONSTANT_ATTRIBUTES:[{name:"a_quadCorner",size:2,type:L}],CONSTANT_DATA:[[-1,-1],[1,-1],[-1,1],[1,1]]}}},{key:"maybeRegenerateShaders",value:function(){var R=this;if(this.layersNeedingRegeneration.size!==0){h=h.map(function(z,F){if(R.layersNeedingRegeneration.has(F)){var M=R.layerLifecycles.get(F);if(M!=null&&M.regenerate){var W=M.regenerate();return H(H({},W),{},{lifecycle:z.lifecycle})}}return z}),this.layersNeedingRegeneration.clear(),g=ko({shapes:l,layers:h,shapeGlobalIds:l.length>1?d:void 0,antialias:this.renderer.getSetting("antialiasNodes")});var L=this.normalProgram.gl,k=this.normalProgram,P=k.program,D=k.buffer,I=k.vertexShader,G=k.fragmentShader;L.deleteProgram(P),L.deleteBuffer(D),L.deleteShader(I),L.deleteShader(G),this.normalProgram=this.getProgramInfo("normal",L,g.vertexShader,g.fragmentShader,this._pickingBuffer)}}},{key:"getAttributeTexture",value:function(){return this.layerAttributeTexture}},{key:"uploadLayerTexture",value:function(){this.layerAttributeTexture.upload()}},{key:"process",value:function(R,L,k,P){var D=L*this.STRIDE;if(k.visibility==="hidden"){for(var I=D+this.STRIDE;D<I;D++)this.floats[D]=0;this.floats[L*this.STRIDE]=zu;return}this.processVisibleItem(nn(R),D,k,P)}},{key:"processVisibleItem",value:function(R,L,k,P){var D,I=this.floats,G=this.ints;if(I[L++]=P,G[L++]=R,I[L++]=(D=k.opacity)!==null&&D!==void 0?D:1,_.floatsPerItem!==0){var z=this.packedAttributeData;Ka(this.attrDescriptors,k,z,k.color,this.layerLifecycles,0),this.layerAttributeTexture.updateAllAttributesAtRow(P,z)}}},{key:"setUniforms",value:function(R,L){var k=this,P=L.gl,D=L.uniformLocations;D.u_matrix&&P.uniformMatrix3fv(D.u_matrix,!1,R.matrix),D.u_sizeRatio&&P.uniform1f(D.u_sizeRatio,R.sizeRatio),D.u_correctionRatio&&P.uniform1f(D.u_correctionRatio,R.correctionRatio),D.u_pickingPadding&&P.uniform1f(D.u_pickingPadding,R.nodePickingPadding),D.u_cameraAngle&&P.uniform1f(D.u_cameraAngle,R.cameraAngle),D.u_nodeDataTexture&&P.uniform1i(D.u_nodeDataTexture,R.nodeDataTextureUnit),D.u_nodeDataTextureWidth&&P.uniform1i(D.u_nodeDataTextureWidth,R.nodeDataTextureWidth),D.u_layerAttributeTexture&&(this.layerAttributeTexture.bind(Ut),P.uniform1i(D.u_layerAttributeTexture,Ut)),D.u_layerAttributeTextureWidth&&P.uniform1i(D.u_layerAttributeTextureWidth,this.layerAttributeTexture.getTextureWidth()),D.u_layerAttributeTexelsPerNode&&P.uniform1i(D.u_layerAttributeTexelsPerNode,this.layerAttributeTexture.getTexelsPerItem()),l.forEach(function(I){I.uniforms.forEach(function(G){k.setTypedUniform(G,L)})}),h.forEach(function(I){I.uniforms.forEach(function(G){k.setTypedUniform(G,L)})})}},{key:"render",value:function(R,L,k){this.maybeRegenerateShaders(),Ce(w,"render",this,3)([R,L,k])}},{key:"renderProgram",value:function(R,L){var k=L.gl,P=L.program;k.useProgram(P),L===this.normalProgram&&this.layerLifecycles.forEach(function(D){var I;(I=D.beforeRender)===null||I===void 0||I.call(D)}),Ce(w,"renderProgram",this,3)([R,L])}},{key:"kill",value:function(){this.layerLifecycles.forEach(function(k){var P;(P=k.kill)===null||P===void 0||P.call(k)}),this.layerLifecycles.clear();var R=this.normalProgram.gl,L=(S.textureRefCounts.get(R)||1)-1;L<=0?(this.layerAttributeTexture.kill(),S.layerTextures.delete(R),S.textureRefCounts.delete(R)):S.textureRefCounts.set(R,L),Ce(w,"kill",this,3)([])}}])})(jt),C(i,"layerTextures",new WeakMap),C(i,"textureRefCounts",new WeakMap),i),T=new S(e,null,t);return{nodeProgram:T,labelProgram:p,backdropProgram:m,labelBackgroundProgram:b,attachmentProgram:v,framePass:x,shapeSlug:c,shapeNameToIndex:l.length>1?u:void 0,shapeGlobalIds:l.length>1?d:void 0}}var $t=6;function Cr(e){var n=e.offsets,t=e.specs,r=e.floatsPerItem,a=Object.keys(n);if(a.length===0||r===0)return{uniformDeclarations:"",uniformNames:[],vertexVaryingDeclarations:"",fragmentVaryingDeclarations:"",fetchCode:"",varyingAssignments:""};var i=`
uniform sampler2D u_edgeAttributeTexture;
uniform int u_edgeAttributeTextureWidth;
uniform int u_edgeAttributeTexelsPerEdge;`,o=["u_edgeAttributeTexture","u_edgeAttributeTextureWidth","u_edgeAttributeTexelsPerEdge"],s=a.map(function(g){var p=t[g].size===1?"float":"vec".concat(t[g].size);return"".concat(p," v_").concat(g,";")}),l=s.map(function(g){return"out ".concat(g)}).join(`
`),u=s.map(function(g){return"in ".concat(g)}).join(`
`),d=zn(e,{varPrefix:"attr",baseTexelExpr:"edgeIdx * u_edgeAttributeTexelsPerEdge",textureWidthUniform:"u_edgeAttributeTextureWidth",textureSamplerUniform:"u_edgeAttributeTexture"}),c=d.fetchCode,h=d.varyingAssignments;return{uniformDeclarations:i,uniformNames:o,vertexVaryingDeclarations:l,fragmentVaryingDeclarations:u,fetchCode:c,varyingAssignments:h}}function xm(e){return`
float findSourceClampT_`.concat(e,`(vec2 source, float sourceSize, int sourceShapeId, float sourceRotateAlign, vec2 target, float margin) {
  float lo = 0.0, hi = 0.5;
  float nodeExtent = sourceSize * u_correctionRatio / u_sizeRatio * 2.0;
  float effectiveSize = 1.0 - u_correctionRatio / nodeExtent;

  // Counter-rotate the query point so viewport-aligned nodes (rotateAlign=0) are
  // clamped against their on-screen orientation; graph-aligned nodes skip it.
  float ca = u_cameraAngle * (1.0 - sourceRotateAlign);
  float rc = cos(ca), rs = sin(ca);
  mat2 rot = mat2(rc, -rs, rs, rc);

  for (int i = 0; i < 12; i++) {
    float mid = (lo + hi) * 0.5;
    vec2 pos = path_`).concat(e,`_position(mid, source, target);
    vec2 localPos = rot * ((pos - source) / nodeExtent);
    float sdf = querySDF(sourceShapeId, localPos, effectiveSize);
    if (sdf < 0.0) lo = mid;
    else hi = mid;
  }

  float pathLen = path_`).concat(e,`_length(source, target);
  float marginT = (margin * u_correctionRatio / u_sizeRatio) / pathLen;
  return (lo + hi) * 0.5 + marginT;
}
`)}function Sm(e){return`
float findTargetClampT_`.concat(e,`(vec2 source, vec2 target, float targetSize, int targetShapeId, float targetRotateAlign, float margin) {
  float lo = 0.5, hi = 1.0;
  float nodeExtent = targetSize * u_correctionRatio / u_sizeRatio * 2.0;
  float effectiveSize = 1.0 - u_correctionRatio / nodeExtent;

  // See findSourceClampT_ for the rotation rationale.
  float ca = u_cameraAngle * (1.0 - targetRotateAlign);
  float rc = cos(ca), rs = sin(ca);
  mat2 rot = mat2(rc, -rs, rs, rc);

  for (int i = 0; i < 12; i++) {
    float mid = (lo + hi) * 0.5;
    vec2 pos = path_`).concat(e,`_position(mid, source, target);
    vec2 localPos = rot * ((pos - target) / nodeExtent);
    float sdf = querySDF(targetShapeId, localPos, effectiveSize);
    if (sdf < 0.0) hi = mid;
    else lo = mid;
  }

  float pathLen = path_`).concat(e,`_length(source, target);
  float marginT = (margin * u_correctionRatio / u_sizeRatio) / pathLen;
  return (lo + hi) * 0.5 - marginT;
}
`)}function ed(e){return`
// Auto-generated numerical tangent (from position via finite differences)
vec2 path_`.concat(e,`_tangent(float t, vec2 source, vec2 target) {
  float epsilon = 0.001;
  float t1 = max(0.0, t - epsilon);
  float t2 = min(1.0, t + epsilon);
  vec2 p1 = path_`).concat(e,`_position(t1, source, target);
  vec2 p2 = path_`).concat(e,`_position(t2, source, target);
  return normalize(p2 - p1);
}

// Auto-generated normal (perpendicular to tangent)
vec2 path_`).concat(e,`_normal(float t, vec2 source, vec2 target) {
  vec2 tangent = path_`).concat(e,`_tangent(t, source, target);
  return vec2(-tangent.y, tangent.x);
}
`)}function _m(e){return`
// Auto-generated path length (samples position 16 times)
float path_`.concat(e,`_length(vec2 source, vec2 target) {
  float len = 0.0;
  vec2 prev = path_`).concat(e,`_position(0.0, source, target);
  for (int i = 1; i <= 16; i++) {
    float t = float(i) / 16.0;
    vec2 curr = path_`).concat(e,`_position(t, source, target);
    len += length(curr - prev);
    prev = curr;
  }
  return len;
}
`)}function Tm(e){return`
// Auto-generated closest_t (coarse sample + ternary search)
float path_`.concat(e,`_closest_t(vec2 p, vec2 source, vec2 target) {
  // Coarse search: find best among 10 samples
  float bestT = 0.0;
  float bestDist = 1e10;
  for (int i = 0; i <= 10; i++) {
    float t = float(i) / 10.0;
    vec2 pos = path_`).concat(e,`_position(t, source, target);
    float d = length(p - pos);
    if (d < bestDist) {
      bestDist = d;
      bestT = t;
    }
  }

  // Refine with ternary search
  float lo = max(0.0, bestT - 0.1);
  float hi = min(1.0, bestT + 0.1);
  for (int i = 0; i < 10; i++) {
    float mid1 = lo + (hi - lo) / 3.0;
    float mid2 = hi - (hi - lo) / 3.0;
    float d1 = length(p - path_`).concat(e,`_position(mid1, source, target));
    float d2 = length(p - path_`).concat(e,`_position(mid2, source, target));
    if (d1 < d2) {
      hi = mid2;
    } else {
      lo = mid1;
    }
  }
  return (lo + hi) * 0.5;
}
`)}function Em(e){return`
// Auto-generated signed distance (via closest_t + normal)
float path_`.concat(e,`_distance(vec2 p, vec2 source, vec2 target) {
  float closestT = path_`).concat(e,`_closest_t(p, source, target);
  vec2 closest = path_`).concat(e,`_position(closestT, source, target);
  vec2 diff = p - closest;
  float dist = length(diff);
  if (dist < 0.0001) return 0.0;

  // Get normal at closest point
  vec2 normal = path_`).concat(e,`_normal(closestT, source, target);
  return dist * sign(dot(diff, normal));
}
`)}function wm(e){return`
// Auto-generated t_at_distance (binary search)
float path_`.concat(e,`_t_at_distance(float targetDist, vec2 source, vec2 target) {
  if (targetDist <= 0.0) return 0.0;

  float totalLen = path_`).concat(e,`_length(source, target);
  if (targetDist >= totalLen) return 1.0;

  // Binary search for t
  float lo = 0.0, hi = 1.0;
  for (int i = 0; i < 12; i++) {
    float mid = (lo + hi) * 0.5;

    // Compute arc length from 0 to mid
    float arcLen = 0.0;
    vec2 prev = path_`).concat(e,`_position(0.0, source, target);
    for (int j = 1; j <= 8; j++) {
      float t = mid * float(j) / 8.0;
      vec2 curr = path_`).concat(e,`_position(t, source, target);
      arcLen += length(curr - prev);
      prev = curr;
    }

    if (arcLen < targetDist) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) * 0.5;
}
`)}function za(e,n){var t=new RegExp("\\b(float|vec[234]|void|int|bool)\\s+".concat(n,"\\s*\\("));return t.test(e)}function td(e,n){var t=[];return za(n,"path_".concat(e,"_length"))||t.push(_m(e)),za(n,"path_".concat(e,"_closest_t"))||t.push(Tm(e)),za(n,"path_".concat(e,"_distance"))||t.push(Em(e)),za(n,"path_".concat(e,"_t_at_distance"))||t.push(wm(e)),t.length>0?`
// ============================================================================
// Auto-generated fallback functions (path only provided position)
// ============================================================================
`.concat(t.join(`
`)):""}function nd(e){var n,t,r,a=e.paths,i=e.layers,o=(n=e.extremities)!==null&&n!==void 0?n:[];if(a.length===0)throw new Error("At least one path is required in 'paths'");if(i.length===0)throw new Error("At least one layer is required in 'layers'");var s=(t=e.defaultHead)!==null&&t!==void 0?t:"none",l=(r=e.defaultTail)!==null&&r!==void 0?r:"none";return{paths:a,extremities:o,layers:i,path:a[0],layer:i[0],defaultHead:s,defaultTail:l}}var rd=WebGL2RenderingContext,Ar=rd.FLOAT,xu=rd.UNSIGNED_BYTE;function Am(e,n,t){var r=new Set(["u_matrix","u_sizeRatio","u_correctionRatio","u_zoomRatio","u_pixelRatio","u_cameraAngle","u_minEdgeThickness","u_pickingPadding","u_nodeDataTexture","u_nodeDataTextureWidth","u_edgeDataTexture","u_edgeDataTextureWidth","u_edgeFrameTexture","u_edgeFrameTextureWidth","u_edgeAttributeTexture","u_edgeAttributeTextureWidth","u_edgeAttributeTexelsPerEdge"]),a=new Set(r);return e.forEach(function(i){return i.uniforms.forEach(function(o){return a.add(o.name)})}),n.forEach(function(i){return i.uniforms.forEach(function(o){return a.add(o.name)})}),t.forEach(function(i){return i.uniforms.forEach(function(o){return a.add(o.name)})}),Array.from(a)}function Oo(e){var n=new Set,t=[],r=U(e),a;try{for(r.s();!(a=r.n()).done;){var i=a.value;n.has(i.name)||(n.add(i.name),t.push("// Path: ".concat(i.name)),t.push(i.glsl),t.push(ed(i.name)),t.push(td(i.name,i.glsl)))}}catch(o){r.e(o)}finally{r.f()}return t.join(`

`)}function Rm(e){var n=[],t=U(e),r;try{for(t.s();!(r=t.n()).done;){var a=r.value;n.push("// Extremity: ".concat(a.name)),n.push(a.glsl)}}catch(i){t.e(i)}finally{t.f()}return n.join(`

`)}var Dm=[{queryName:"queryPathPosition",pathFunc:"position",returnType:"vec2",params:"float t, vec2 source, vec2 target",args:"t, source, target"},{queryName:"queryPathTangent",pathFunc:"tangent",returnType:"vec2",params:"float t, vec2 source, vec2 target",args:"t, source, target"},{queryName:"queryPathNormal",pathFunc:"normal",returnType:"vec2",params:"float t, vec2 source, vec2 target",args:"t, source, target"},{queryName:"queryPathLength",pathFunc:"length",returnType:"float",params:"vec2 source, vec2 target",args:"source, target"},{queryName:"queryPathClosestT",pathFunc:"closest_t",returnType:"float",params:"vec2 p, vec2 source, vec2 target",args:"p, source, target"}];function km(e,n){var t=n.queryName,r=n.pathFunc,a=n.returnType,i=n.params,o=n.args;if(e.length===1)return"".concat(a," ").concat(t,"(int pathId, ").concat(i,`) {
  return path_`).concat(e[0].name,"_").concat(r,"(").concat(o,`);
}`);var s=e.map(function(l,u){return"    case ".concat(u,": return path_").concat(l.name,"_").concat(r,"(").concat(o,");")}).join(`
`);return"".concat(a," ").concat(t,"(int pathId, ").concat(i,`) {
  switch (pathId) {
`).concat(s,`
    default: return path_`).concat(e[0].name,"_").concat(r,"(").concat(o,`);
  }
}`)}function Bo(e){return Dm.map(function(n){return km(e,n)}).join(`

`)}function Cm(e){if(e.length===1)return`float queryExtremitySDF(int extremityId, vec2 uv, float lengthRatio, float widthRatio) {
  return extremity_`.concat(e[0].name,`(uv, lengthRatio, widthRatio);
}`);var n=e.map(function(t,r){return"    case ".concat(r,": return extremity_").concat(t.name,"(uv, lengthRatio, widthRatio);")}).join(`
`);return`float queryExtremitySDF(int extremityId, vec2 uv, float lengthRatio, float widthRatio) {
  switch (extremityId) {
`.concat(n,`
    default: return extremity_`).concat(e[0].name,`(uv, lengthRatio, widthRatio);
  }
}`)}function Lm(e){var n=[],t=U(e),r;try{for(t.s();!(r=t.n()).done;){var a=r.value;n.push(xm(a.name)),n.push(Sm(a.name))}}catch(s){t.e(s)}finally{t.f()}if(e.length===1)n.push(`
float queryFindSourceClampT(int pathId, vec2 source, float sourceSize, int sourceShapeId, float sourceRotateAlign, vec2 target, float margin) {
  return findSourceClampT_`.concat(e[0].name,`(source, sourceSize, sourceShapeId, sourceRotateAlign, target, margin);
}

float queryFindTargetClampT(int pathId, vec2 source, vec2 target, float targetSize, int targetShapeId, float targetRotateAlign, float margin) {
  return findTargetClampT_`).concat(e[0].name,`(source, target, targetSize, targetShapeId, targetRotateAlign, margin);
}`));else{var i=e.map(function(s,l){return"    case ".concat(l,": return findSourceClampT_").concat(s.name,"(source, sourceSize, sourceShapeId, sourceRotateAlign, target, margin);")}).join(`
`),o=e.map(function(s,l){return"    case ".concat(l,": return findTargetClampT_").concat(s.name,"(source, target, targetSize, targetShapeId, targetRotateAlign, margin);")}).join(`
`);n.push(`
float queryFindSourceClampT(int pathId, vec2 source, float sourceSize, int sourceShapeId, float sourceRotateAlign, vec2 target, float margin) {
  switch (pathId) {
`.concat(i,`
    default: return findSourceClampT_`).concat(e[0].name,`(source, sourceSize, sourceShapeId, sourceRotateAlign, target, margin);
  }
}

float queryFindTargetClampT(int pathId, vec2 source, vec2 target, float targetSize, int targetShapeId, float targetRotateAlign, float margin) {
  switch (pathId) {
`).concat(o,`
    default: return findTargetClampT_`).concat(e[0].name,`(source, target, targetSize, targetShapeId, targetRotateAlign, margin);
  }
}`))}return n.join(`

`)}function Pm(e,n,t,r,a){var i=tt([].concat(Z(e),Z(t))),o=Cr(i),s=Wn(r,a),l=Object.keys(s.offsets),u=function(A){var w=s.specs[A].size;return w===1?"float":"vec".concat(w)},d=l.map(function(T){return"".concat(u(T)," v_source_").concat(T,`;
`).concat(u(T)," v_target_").concat(T,";")}).join(`
`),c=zn(s,{varPrefix:"srcNodeAttr",baseTexelExpr:"srcIdx * u_layerAttributeTexelsPerNode",textureWidthUniform:"u_layerAttributeTextureWidth",textureSamplerUniform:"u_layerAttributeTexture",outputPrefix:"v_source_"}),h=zn(s,{varPrefix:"tgtNodeAttr",baseTexelExpr:"tgtIdx * u_layerAttributeTexelsPerNode",textureWidthUniform:"u_layerAttributeTextureWidth",textureSamplerUniform:"u_layerAttributeTexture",outputPrefix:"v_target_"}),g=l.map(function(T){return"".concat(u(T)," g_").concat(T,";")}).join(`
`),p=l.map(function(T){return"  g_".concat(T," = v_source_").concat(T,";")}).join(`
`),m=l.map(function(T){return"  g_".concat(T," = v_target_").concat(T,";")}).join(`
`),b=new Set,v=[],x=function(A){b.has(A.name)||(b.add(A.name),v.push("uniform ".concat(A.type," ").concat(A.name,";")))};e.forEach(function(T){return T.uniforms.forEach(x)}),n.forEach(function(T){return T.uniforms.forEach(x)});var y=n.map(function(T){return ge(T.widthFactor)}).join(", "),_=Math.max.apply(Math,Z(e.map(function(T){return T.minBodyLengthRatio||0}))),S=`#version 300 es

// Node and edge data textures
uniform sampler2D u_nodeDataTexture;
uniform int u_nodeDataTextureWidth;
uniform sampler2D u_edgeDataTexture;
uniform int u_edgeDataTextureWidth;

// Edge attribute texture (for path-specific attributes like curvature)
`.concat(o.uniformDeclarations,`

// Node attribute texture (for node shape attributes)
uniform sampler2D u_layerAttributeTexture;
uniform int u_layerAttributeTextureWidth;
uniform int u_layerAttributeTexelsPerNode;

// Render params needed for clamping
uniform float u_sizeRatio;
uniform float u_correctionRatio;
uniform float u_cameraAngle;
uniform float u_minEdgeThickness;

// Edge-frame texture dimensions, for scattering each point to its texel
uniform float u_frameTextureWidth;
uniform float u_frameTextureHeight;

// Custom path/extremity uniforms
`).concat(v.join(`
`),`

// Path attribute varyings \u2014 assigned so path functions can read them as globals
`).concat(o.vertexVaryingDeclarations,`

// Node size varyings \u2014 read by path functions like loop
out float v_sourceNodeSize;
out float v_targetNodeSize;

// Node shape attributes per endpoint, and the ones querySDF reads
`).concat(d,`
`).concat(g,`

// Scattered output written to the edge-frame texel: [tStart, tEnd, straightenFactor, pathLength]
out vec4 v_clamp;

// Extremity width factor array (needed for extremityScale computation)
const float EXTREMITY_WIDTH_FACTORS[`).concat(n.length,"] = float[](").concat(y,`);

// Node-data fetch helpers (geometry texel + rotation-flags texel)
`).concat(gt,`
`).concat(Ht,`

// Shape SDFs for node boundary clamping
`).concat(Du(),`
`).concat(ku(new Set(l)),`

// Path functions
`).concat(Oo(e),`
`).concat(Bo(e),`
`).concat(Lm(e),`

void main() {
  // One point per edge-data row; the row index is the edge-frame texel target.
  int edgeIdx = gl_VertexID;
  int texel0Idx = edgeIdx * 2;
  int texel1Idx = edgeIdx * 2 + 1;
  ivec2 edgeTexCoord0 = ivec2(texel0Idx % u_edgeDataTextureWidth, texel0Idx / u_edgeDataTextureWidth);
  ivec2 edgeTexCoord1 = ivec2(texel1Idx % u_edgeDataTextureWidth, texel1Idx / u_edgeDataTextureWidth);
  vec4 edgeData0 = texelFetch(u_edgeDataTexture, edgeTexCoord0, 0);
  vec4 edgeData1 = texelFetch(u_edgeDataTexture, edgeTexCoord1, 0);

  int srcIdx = int(edgeData0.x);
  int tgtIdx = int(edgeData0.y);
  float a_thickness = edgeData0.z;
  float a_headLengthRatio = edgeData1.x;
  float a_tailLengthRatio = edgeData1.y;
  int pathId = int(edgeData1.z);
  int extremityPacked = int(edgeData1.w);
  int headId = extremityPacked >> 4;
  int tailId = extremityPacked & 15;

  // Fetch path/layer attributes and assign to path-function globals
`).concat(o.fetchCode,`
`).concat(o.varyingAssignments,`

  // Fetch node shape attributes for both endpoints
`).concat(c.fetchCode,`
`).concat(c.varyingAssignments,`
`).concat(h.fetchCode,`
`).concat(h.varyingAssignments,`

  // Fetch node geometry (texel 0) and rotation flags (texel 1).
  vec4 srcNodeData = readNodeData(u_nodeDataTexture, u_nodeDataTextureWidth, srcIdx);
  vec4 tgtNodeData = readNodeData(u_nodeDataTexture, u_nodeDataTextureWidth, tgtIdx);

  vec2 a_source = srcNodeData.xy;
  vec2 a_target = tgtNodeData.xy;
  float a_sourceSize = srcNodeData.z;
  float a_targetSize = tgtNodeData.z;
  float a_sourceShapeId = srcNodeData.w;
  float a_targetShapeId = tgtNodeData.w;
  // Per-node rotation alignment (0 = viewport, 1 = graph), for boundary clamping.
  float a_sourceRotateAlign = readNodeFlags(u_nodeDataTexture, u_nodeDataTextureWidth, srcIdx).r;
  float a_targetRotateAlign = readNodeFlags(u_nodeDataTexture, u_nodeDataTextureWidth, tgtIdx).r;

  v_sourceNodeSize = a_sourceSize;
  v_targetNodeSize = a_targetSize;

  float headLengthRatio = a_headLengthRatio;
  float tailLengthRatio = a_tailLengthRatio;
  float headWidthFactor = EXTREMITY_WIDTH_FACTORS[headId];
  float tailWidthFactor = EXTREMITY_WIDTH_FACTORS[tailId];
  float minBodyLengthRatio = `).concat(ge(_),`;

  // Thickness in WebGL units (needed to compute clamping margin and extremity lengths)
  float pixelsThickness = max(a_thickness, u_minEdgeThickness * u_sizeRatio);
  float webGLThickness = pixelsThickness * u_correctionRatio / u_sizeRatio;

  // SDF clamping: find where the edge body meets the node boundaries. Always
  // searched (ungated) so labels get a true boundary clamp; the body re-applies
  // its extremity gating in-shader.
`).concat(p,`
  float tStart = queryFindSourceClampT(pathId, a_source, a_sourceSize, int(a_sourceShapeId), a_sourceRotateAlign, a_target, 0.0);
`).concat(m,`
  float tEnd = queryFindTargetClampT(pathId, a_source, a_target, a_targetSize, int(a_targetShapeId), a_targetRotateAlign, 0.0);

  // straightenFactor (frame .z) is consumed only by the body, which runs to the
  // node center when an extremity is absent. Derive the straightening math from
  // these gated clamps \u2014 not the ungated boundary ones above \u2014 so it matches the
  // geometry it drives. The ungated tStart/tEnd remain what labels read.
  float bodyTStart = tailLengthRatio > 0.0 ? tStart : 0.0;
  float bodyTEnd = headLengthRatio > 0.0 ? tEnd : 1.0;

  // Path length and zone boundaries (needed for straightening check)
  float pathLength = queryPathLength(pathId, a_source, a_target);
  float visibleLength = pathLength * (bodyTEnd - bodyTStart);

  float headLength = headLengthRatio * webGLThickness;
  float tailLength = tailLengthRatio * webGLThickness;
  float minBodyLength = minBodyLengthRatio * webGLThickness;

  float totalNeededLength = headLength + tailLength + minBodyLength;
  float extremityScale = 1.0;
  if (totalNeededLength > visibleLength && totalNeededLength > 0.0001) {
    extremityScale = visibleLength / totalNeededLength;
    headLength *= extremityScale;
    tailLength *= extremityScale;
  }

  float headLengthT = pathLength > 0.0001 ? headLength / pathLength : 0.0;
  float tailLengthT = pathLength > 0.0001 ? tailLength / pathLength : 0.0;

  float tTailEnd = bodyTStart + tailLengthT;
  float tHeadStart = bodyTEnd - headLengthT;
  if (tTailEnd > tHeadStart) {
    float mid = (bodyTStart + bodyTEnd) * 0.5;
    tTailEnd = mid;
    tHeadStart = mid;
  }

  // Straighten factor: blend toward straight line when path twists in extremity zones
  float straightenFactor = 0.0;
  {
    float maxDeviation = 0.0;
    if (tailLengthT > 0.0001) {
      vec2 tailTang = queryPathTangent(pathId, tTailEnd, a_source, a_target);
      vec2 tailChord = queryPathPosition(pathId, bodyTStart, a_source, a_target)
                     - queryPathPosition(pathId, tTailEnd, a_source, a_target);
      float tailChordLen = length(tailChord);
      if (tailChordLen > 0.0001) {
        maxDeviation = max(maxDeviation, 1.0 - dot(-tailTang, tailChord / tailChordLen));
      }
    }
    if (headLengthT > 0.0001) {
      vec2 headTang = queryPathTangent(pathId, tHeadStart, a_source, a_target);
      vec2 headChord = queryPathPosition(pathId, bodyTEnd, a_source, a_target)
                     - queryPathPosition(pathId, tHeadStart, a_source, a_target);
      float headChordLen = length(headChord);
      if (headChordLen > 0.0001) {
        maxDeviation = max(maxDeviation, 1.0 - dot(headTang, headChord / headChordLen));
      }
    }
    straightenFactor = smoothstep(0.035, 0.5, maxDeviation);
  }

  // When straightening, blend the ungated tStart/tEnd (the label-facing clamps)
  // toward straight-line clamp positions.
  if (straightenFactor > 0.001) {
    if (tailLengthRatio > 0.0) {
`).concat(p,`
      float srcExtent = a_sourceSize * u_correctionRatio / u_sizeRatio * 2.0;
      float srcEffective = 1.0 - u_correctionRatio / srcExtent;
      float srcCa = u_cameraAngle * (1.0 - a_sourceRotateAlign);
      mat2 srcRot = mat2(cos(srcCa), -sin(srcCa), sin(srcCa), cos(srcCa));
      float lo = 0.0, hi = 0.5;
      for (int i = 0; i < 12; i++) {
        float mid = (lo + hi) * 0.5;
        vec2 pos = mix(a_source, a_target, mid);
        vec2 localPos = srcRot * ((pos - a_source) / srcExtent);
        float sdf = querySDF(int(a_sourceShapeId), localPos, srcEffective);
        if (sdf < 0.0) lo = mid; else hi = mid;
      }
      tStart = mix(tStart, (lo + hi) * 0.5, straightenFactor);
    }
    if (headLengthRatio > 0.0) {
`).concat(m,`
      float tgtExtent = a_targetSize * u_correctionRatio / u_sizeRatio * 2.0;
      float tgtEffective = 1.0 - u_correctionRatio / tgtExtent;
      float tgtCa = u_cameraAngle * (1.0 - a_targetRotateAlign);
      mat2 tgtRot = mat2(cos(tgtCa), -sin(tgtCa), sin(tgtCa), cos(tgtCa));
      float lo = 0.5, hi = 1.0;
      for (int i = 0; i < 12; i++) {
        float mid = (lo + hi) * 0.5;
        vec2 pos = mix(a_source, a_target, mid);
        vec2 localPos = tgtRot * ((pos - a_target) / tgtExtent);
        float sdf = querySDF(int(a_targetShapeId), localPos, tgtEffective);
        if (sdf < 0.0) hi = mid; else lo = mid;
      }
      tEnd = mix(tEnd, (lo + hi) * 0.5, straightenFactor);
    }
  }

  v_clamp = vec4(tStart, tEnd, straightenFactor, pathLength);

  // Scatter this point to its edge's texel center in the frame texture.
  float x = mod(float(edgeIdx), u_frameTextureWidth);
  float y = floor(float(edgeIdx) / u_frameTextureWidth);
  vec2 ndc = (vec2(x, y) + 0.5) / vec2(u_frameTextureWidth, u_frameTextureHeight) * 2.0 - 1.0;
  gl_Position = vec4(ndc, 0.0, 1.0);
  gl_PointSize = 1.0;
}
`);return S}var Ga=0,Su=1,Oa=2;function Im(e,n,t){var r=[];t&&(r.push([Ga,0,-1],[Ga,0,1]),r.push([Ga,1,-1],[Ga,1,1]));for(var a=0;a<=e;a++){var i=a/e;r.push([Su,i,-1],[Su,i,1])}return n&&(r.push([Oa,0,-1],[Oa,0,1]),r.push([Oa,1,-1],[Oa,1,1])),{data:r,attributes:[{name:"a_zone",size:1,type:Ar},{name:"a_zoneT",size:1,type:Ar},{name:"a_side",size:1,type:Ar}],verticesPerEdge:r.length}}function Fm(e,n,t,r){var a=tt([].concat(Z(e),Z(t))),i=Cr(a),o=new Set(["u_matrix","u_sizeRatio","u_correctionRatio","u_zoomRatio","u_pixelRatio","u_cameraAngle","u_minEdgeThickness","u_pickingPadding","u_nodeDataTexture"]),s=new Set,l=[],u=function(v){!o.has(v.name)&&!s.has(v.name)&&(s.add(v.name),l.push("uniform ".concat(v.type," ").concat(v.name,";")))};e.forEach(function(b){return b.uniforms.forEach(u)}),n.forEach(function(b){return b.uniforms.forEach(u)}),t.forEach(function(b){return b.uniforms.forEach(u)});var d=r.map(function(b){var v=b.size===1?"float":"vec".concat(b.size);return"in ".concat(v," ").concat(b.name,";")}).join(`
`),c=n.map(function(b){return ge(b.widthFactor)}).join(", "),h=Math.max.apply(Math,Z(e.map(function(b){return b.minBodyLengthRatio||0}))),g=t.some(function(b){return b.needsNodeColors}),p=e.some(function(b){return b.needsNodeSize}),m=`#version 300 es

// Constant attributes (per vertex)
`.concat(d,`

// Per-edge attributes
// Edge data (source/target indices, thickness, extremity ratios, path/extremity IDs)
// is fetched from edge data texture via edge index
in float a_edgeIndex;   // Index into edge data texture
in vec4 a_color;        // Edge color
in vec4 a_id;           // Edge ID for picking
in float a_opacity;     // Edge opacity

// Standard uniforms
uniform mat3 u_matrix;
uniform float u_sizeRatio;
uniform float u_correctionRatio;
uniform float u_zoomRatio;
uniform float u_pixelRatio;
uniform float u_cameraAngle;
uniform float u_minEdgeThickness;
#ifdef PICKING_MODE
uniform float u_pickingPadding;
#endif
uniform sampler2D u_nodeDataTexture;
uniform int u_nodeDataTextureWidth;
uniform sampler2D u_edgeDataTexture;
uniform int u_edgeDataTextureWidth;
uniform sampler2D u_edgeFrameTexture;
uniform int u_edgeFrameTextureWidth;

// Edge path attribute texture uniforms
`).concat(i.uniformDeclarations,`

// Custom uniforms
`).concat(l.join(`
`),`

// Standard varyings
out vec4 v_color;
out float v_opacity;
out vec4 v_id;
out float v_thickness;       // Edge body thickness (in consistent units)
out float v_t;
out float v_tStart;
out float v_tEnd;
out float v_side;
out float v_antialiasingWidth;  // Anti-aliasing width (normalized: u_correctionRatio / thickness)
out vec2 v_source;
out vec2 v_target;
out float v_edgeLength;
`).concat(p?`
out float v_sourceNodeSize;  // Source node size (mirrored in labels/generator.ts as plain float)
out float v_targetNodeSize;  // Target node size (mirrored in labels/generator.ts as plain float)`:"",`
`).concat(g?`
out vec4 v_sourceColor;
out vec4 v_targetColor;`:"",`
// Zone varyings
out float v_zone;            // 0=tail, 1=body, 2=head
out float v_zoneT;           // Position within zone [0,1]
out float v_headLengthRatio; // Head length as ratio of thickness
out float v_tailLengthRatio; // Tail length as ratio of thickness
out float v_headWidthRatio;  // Head width factor
out float v_tailWidthRatio;  // Tail width factor

// Multi-path/extremity varyings
flat out int v_pathId;
flat out int v_headId;
flat out int v_tailId;

// Path/layer attribute varyings (fetched from edge attribute texture)
`).concat(i.vertexVaryingDeclarations,`

const float bias = 255.0 / 254.0;

// Width factor array for extremities (shared pool for head/tail)
const float EXTREMITY_WIDTH_FACTORS[`).concat(n.length,"] = float[](").concat(c,`);

// All path functions
`).concat(Oo(e),`

// Path selector functions
`).concat(Bo(e),`

// Node-data fetch helper (geometry texel of the two-texel node stride)
`).concat(gt,`
`).concat(g?Mu:"",`
// Per-edge clamp from the frame-pass (tStart, tEnd, straightenFactor, pathLength)
`).concat(dn,`

void main() {
  // Fetch edge data from edge texture (2 texels per edge)
  // Texel 0: sourceNodeIndex, targetNodeIndex, thickness, reserved
  // Texel 1: headLengthRatio, tailLengthRatio, pathId, (headId << 4) | tailId
  int edgeIdx = int(a_edgeIndex);

  // Hidden edges are flagged with a negative row by EdgeProgram.process(). Push
  // the whole primitive outside the clip volume: every vertex lands at the same
  // out-of-range position, so it is fully clipped and rasterizes nothing \u2014
  // neither to the frame buffer nor to the picking buffer.
  if (edgeIdx < 0) {
    gl_Position = vec4(2.0, 0.0, 0.0, 1.0);
    v_color = vec4(0.0);
    v_id = vec4(0.0);
    return;
  }

  int texel0Idx = edgeIdx * 2;
  int texel1Idx = edgeIdx * 2 + 1;
  ivec2 edgeTexCoord0 = ivec2(texel0Idx % u_edgeDataTextureWidth, texel0Idx / u_edgeDataTextureWidth);
  ivec2 edgeTexCoord1 = ivec2(texel1Idx % u_edgeDataTextureWidth, texel1Idx / u_edgeDataTextureWidth);
  vec4 edgeData0 = texelFetch(u_edgeDataTexture, edgeTexCoord0, 0);
  vec4 edgeData1 = texelFetch(u_edgeDataTexture, edgeTexCoord1, 0);

  // Unpack edge data
  int srcIdx = int(edgeData0.x);
  int tgtIdx = int(edgeData0.y);
  float a_thickness = edgeData0.z;
  // edgeData0.w is now reserved (curvature moved to path attribute texture)
  float a_headLengthRatio = edgeData1.x;
  float a_tailLengthRatio = edgeData1.y;
  int pathId = int(edgeData1.z);
  int extremityPacked = int(edgeData1.w);
  int headId = extremityPacked >> 4;
  int tailId = extremityPacked & 15;

  // Fetch path/layer attributes from edge attribute texture
`).concat(i.fetchCode,`

  // Assign path/layer attribute varyings
`).concat(i.varyingAssignments,`

  // Fetch source and target node geometry (texel 0 of the two-texel node stride)
  vec4 srcNodeData = readNodeData(u_nodeDataTexture, u_nodeDataTextureWidth, srcIdx);
  vec4 tgtNodeData = readNodeData(u_nodeDataTexture, u_nodeDataTextureWidth, tgtIdx);

  vec2 a_source = srcNodeData.xy;
  vec2 a_target = tgtNodeData.xy;
`).concat(p?`
  // Assign node size varyings early (path functions like loops need them during clamping)
  v_sourceNodeSize = srcNodeData.z;
  v_targetNodeSize = tgtNodeData.z;`:"",`
`).concat(g?`
  v_sourceColor = readNodeColor(u_nodeDataTexture, u_nodeDataTextureWidth, srcIdx);
  v_targetColor = readNodeColor(u_nodeDataTexture, u_nodeDataTextureWidth, tgtIdx);`:"",`

  // Convert thickness to WebGL units
  float minThickness = u_minEdgeThickness;
  float pixelsThickness = max(a_thickness, minThickness * u_sizeRatio);
  float webGLThickness = pixelsThickness * u_correctionRatio / u_sizeRatio;

  // Extremity parameters from ID lookups (shared pool)
  float headLengthRatio = a_headLengthRatio;
  float tailLengthRatio = a_tailLengthRatio;
  float headWidthFactor = EXTREMITY_WIDTH_FACTORS[headId];
  float tailWidthFactor = EXTREMITY_WIDTH_FACTORS[tailId];
  float minBodyLengthRatio = `).concat(ge(h),`;

  // Per-edge values from the frame-pass texture (read by edge index).
  // tStart/tEnd are the ungated boundary clamps: re-apply the body's extremity
  // gating here (no extremity \u2192 body runs to the node center, 0/1).
  vec4 frameClamp = readFrameTexel(u_edgeFrameTexture, u_edgeFrameTextureWidth, edgeIdx);
  float tStart           = a_tailLengthRatio > 0.0 ? frameClamp.x : 0.0;
  float tEnd             = a_headLengthRatio > 0.0 ? frameClamp.y : 1.0;
  float straightenFactor = frameClamp.z;
  float pathLength       = frameClamp.w;

  // Anti-aliasing width (~1 pixel, normalized by thickness)
  float antialiasingWidth = u_correctionRatio / webGLThickness;

  float visibleLength = pathLength * (tEnd - tStart);

  // Compute extremity lengths in world units
  float headLength = headLengthRatio * webGLThickness;
  float tailLength = tailLengthRatio * webGLThickness;
  float minBodyLength = minBodyLengthRatio * webGLThickness;

  // Handle short edges: scale down extremities if needed
  float totalNeededLength = headLength + tailLength + minBodyLength;
  float extremityScale = 1.0;
  if (totalNeededLength > visibleLength && totalNeededLength > 0.0001) {
    extremityScale = visibleLength / totalNeededLength;
    headLength *= extremityScale;
    tailLength *= extremityScale;
  }

  // Convert lengths to t-values
  float headLengthT = pathLength > 0.0001 ? headLength / pathLength : 0.0;
  float tailLengthT = pathLength > 0.0001 ? tailLength / pathLength : 0.0;

  // Zone boundaries in t-space
  float tTailEnd = tStart + tailLengthT;
  float tHeadStart = tEnd - headLengthT;

  // Ensure body has non-negative length
  if (tTailEnd > tHeadStart) {
    float mid = (tStart + tEnd) * 0.5;
    tTailEnd = mid;
    tHeadStart = mid;
  }

  // Convert to webGL units for geometry expansion
  float aaWidthWebGL = antialiasingWidth * webGLThickness;

  // Extra geometry width for picking padding (0 in visual mode)
  #ifdef PICKING_MODE
    float pickingPaddingWebGL = u_pickingPadding * u_correctionRatio;
  #else
    float pickingPaddingWebGL = 0.0;
  #endif

  // Straight-line direction and normal (for blending when straightenFactor > 0)
  vec2 straightDir = length(a_target - a_source) > 0.0001
    ? normalize(a_target - a_source) : vec2(1.0, 0.0);
  vec2 straightNormal = vec2(-straightDir.y, straightDir.x);

  // Zone-based vertex processing using path selectors
  vec2 position;
  vec2 normal;
  float t;
  float zone = a_zone;
  float zoneT = a_zoneT;
  float side = a_side;

  // Scaled extremity width factors (geometry must be at least as wide as body)
  float scaledTailWidth = max(tailWidthFactor * extremityScale, 1.0);
  float scaledHeadWidth = max(headWidthFactor * extremityScale, 1.0);

  if (zone < 0.5) {
    // TAIL ZONE: rectangular quad with scaled width
    vec2 tang = queryPathTangent(pathId, tTailEnd, a_source, a_target);
    normal = vec2(-tang.y, tang.x);
    vec2 centerPos = mix(queryPathPosition(pathId, tStart, a_source, a_target),
                         queryPathPosition(pathId, tTailEnd, a_source, a_target), zoneT);
    float halfWidth = webGLThickness * scaledTailWidth * 0.5 + aaWidthWebGL + pickingPaddingWebGL;
    position = centerPos + normal * side * halfWidth;
    t = mix(tStart, tTailEnd, zoneT);

  } else if (zone < 1.5) {
    // BODY ZONE: follows path curvature with width = 1.0
    t = mix(tTailEnd, tHeadStart, zoneT);
    normal = queryPathNormal(pathId, t, a_source, a_target);
    float halfWidth = webGLThickness * 0.5 + aaWidthWebGL + pickingPaddingWebGL;
    position = queryPathPosition(pathId, t, a_source, a_target) + normal * side * halfWidth;

  } else {
    // HEAD ZONE: rectangular quad with scaled width
    vec2 tang = queryPathTangent(pathId, tHeadStart, a_source, a_target);
    normal = vec2(-tang.y, tang.x);
    vec2 centerPos = mix(queryPathPosition(pathId, tHeadStart, a_source, a_target),
                         queryPathPosition(pathId, tEnd, a_source, a_target), zoneT);
    float halfWidth = webGLThickness * scaledHeadWidth * 0.5 + aaWidthWebGL + pickingPaddingWebGL;
    position = centerPos + normal * side * halfWidth;
    t = mix(tHeadStart, tEnd, zoneT);
  }

  // Blend toward straight line based on path twist in extremity zones
  if (straightenFactor > 0.001) {
    float zoneWidth = zone < 0.5 ? webGLThickness * scaledTailWidth * 0.5 + aaWidthWebGL + pickingPaddingWebGL :
                      zone < 1.5 ? webGLThickness * 0.5 + aaWidthWebGL + pickingPaddingWebGL :
                      webGLThickness * scaledHeadWidth * 0.5 + aaWidthWebGL + pickingPaddingWebGL;
    vec2 straightPos = mix(a_source, a_target, t) + straightNormal * side * zoneWidth;
    position = mix(position, straightPos, straightenFactor);
  }

  gl_Position = vec4((u_matrix * vec3(position, 1.0)).xy, 0.0, 1.0);

  // Pass varyings to fragment shader
  v_color = a_color;
  v_color.a *= bias;
  v_opacity = a_opacity;
  v_id = a_id;
  v_thickness = webGLThickness;
  v_t = t;
  v_tStart = tStart;
  v_tEnd = tEnd;
  v_side = side;
  v_antialiasingWidth = antialiasingWidth;
  v_source = a_source;
  v_target = a_target;
  v_edgeLength = pathLength;

  // Zone varyings
  v_zone = zone;
  v_zoneT = zoneT;
  v_headLengthRatio = headLengthRatio * extremityScale;
  v_tailLengthRatio = tailLengthRatio * extremityScale;
  // Scale extremity width proportionally with length when crushed
  v_headWidthRatio = headWidthFactor * extremityScale;
  v_tailWidthRatio = tailWidthFactor * extremityScale;

  // Multi-path varyings
  v_pathId = pathId;
  v_headId = headId;
  v_tailId = tailId;
}
`);return m}function Mm(e,n,t,r){var a=tt([].concat(Z(e),Z(t))),i=Cr(a),o=new Set(["u_matrix","u_sizeRatio","u_correctionRatio","u_zoomRatio","u_pixelRatio","u_cameraAngle","u_minEdgeThickness","u_pickingPadding"]),s=new Set,l=[],u=function(x){!o.has(x.name)&&!s.has(x.name)&&(s.add(x.name),l.push("uniform ".concat(x.type," ").concat(x.name,";")))};e.forEach(function(v){return v.uniforms.forEach(u)}),n.forEach(function(v){return v.uniforms.forEach(u)}),t.forEach(function(v){return v.uniforms.forEach(u)});var d=n.map(function(v){var x;return ge((x=v.baseRatio)!==null&&x!==void 0?x:.5)}).join(", "),c=function(x){var y,_;return n.length>1?"EXTREMITY_BASE_RATIOS[".concat(x,"]"):ge((y=(_=n[0])===null||_===void 0?void 0:_.baseRatio)!==null&&y!==void 0?y:.5)},h=n.some(function(v){return lt(v.length)?!0:v.length>0}),g=t.some(function(v){return v.needsNodeColors}),p=e.some(function(v){return v.needsNodeSize}),m=t.map(function(v,x){return"  // Layer ".concat(x+1,": ").concat(v.name,`
  color = blendOver(color, layer_`).concat(v.name,"(context));")}).join(`

`),b=`#version 300 es
precision highp float;

// Standard varyings
in vec4 v_color;
in float v_opacity;
in vec4 v_id;
in float v_thickness;       // Edge body thickness
in float v_t;
in float v_tStart;
in float v_tEnd;
in float v_side;
in float v_antialiasingWidth;  // Anti-aliasing width (normalized: u_correctionRatio / thickness)
in vec2 v_source;
in vec2 v_target;
in float v_edgeLength;
`.concat(p?`
in float v_sourceNodeSize;   // Source node size (mirrored in labels/generator.ts as plain float)
in float v_targetNodeSize;   // Target node size (mirrored in labels/generator.ts as plain float)`:"",`
`).concat(g?`
in vec4 v_sourceColor;
in vec4 v_targetColor;`:"",`
// Zone varyings
in float v_zone;            // 0=tail, 1=body, 2=head
in float v_zoneT;           // Position within zone [0,1]
in float v_headLengthRatio; // Head length as ratio of thickness (scaled for short edges)
in float v_tailLengthRatio; // Tail length as ratio of thickness (scaled for short edges)
in float v_headWidthRatio;  // Head width factor
in float v_tailWidthRatio;  // Tail width factor

// Multi-path/extremity varyings
flat in int v_pathId;
flat in int v_headId;
flat in int v_tailId;

// Path/layer attribute varyings (from vertex shader texture fetch)
`).concat(i.fragmentVaryingDeclarations,`

// Standard uniforms (needed by some path types)
uniform float u_sizeRatio;
uniform float u_correctionRatio;
uniform float u_cameraAngle;
#ifdef PICKING_MODE
uniform float u_pickingPadding;
#endif

// Custom uniforms
`).concat(l.join(`
`),`

// Fragment output (single target - picking handled via separate pass)
out vec4 fragColor;

`).concat(n.length>1?`// Base ratio array for extremities (shared pool for head/tail)
const float EXTREMITY_BASE_RATIOS[`.concat(n.length,"] = float[](").concat(d,");"):"",`

// EdgeContext struct
struct EdgeContext {
  float t;                   // Position along path [0, 1]
  float sdf;                 // Signed distance from centerline
  vec2 position;             // World position
  vec2 tangent;              // Path tangent
  vec2 normal;               // Path normal
  float thickness;           // Edge thickness
  float aaWidth;             // Anti-aliasing width
  float edgeLength;          // Total path length
  float tStart;              // Clamped start t
  float tEnd;                // Clamped end t
  float distanceFromSource;  // Arc distance from source
  float distanceToTarget;    // Arc distance to target
};

EdgeContext context;

// Alpha "over" compositing for layer blending
vec4 blendOver(vec4 bg, vec4 fg) {
  float a = fg.a;
  return vec4(mix(bg.rgb, fg.rgb, a), bg.a + a * (1.0 - bg.a));
}

// All path functions
`).concat(Oo(e),`

// Path selector functions
`).concat(Bo(e),`

// All extremity functions
`).concat(Rm(n),`

// Extremity SDF selector (shared pool for head/tail)
`).concat(Cm(n),`

// Layer functions
`).concat(t.map(function(v){return v.glsl}).join(`

`),`

// Helper: Compute arc length using path selector
float computeArcLengthMulti(int pathId, float t0, float t1, vec2 source, vec2 target, int samples) {
  float arcLen = 0.0;
  vec2 prev = queryPathPosition(pathId, t0, source, target);
  for (int i = 1; i <= samples; i++) {
    float t = t0 + (t1 - t0) * float(i) / float(samples);
    vec2 curr = queryPathPosition(pathId, t, source, target);
    arcLen += length(curr - prev);
    prev = curr;
  }
  return arcLen;
}

void main() {
  // Compute normalized t within visible edge (0 = start, 1 = end)
  float tNorm = (v_t - v_tStart) / max(v_tEnd - v_tStart, 0.0001);

  // Edge body half-thickness
  float halfThickness = v_thickness * 0.5;

  // Convert normalized AA width to webGL units (~1 pixel)
  float aaWidthWebGL = v_antialiasingWidth * v_thickness;

  // Distance from centerline based on v_side interpolation
  float zoneWidthFactor = v_zone < 0.5 ? v_tailWidthRatio :
                          v_zone < 1.5 ? 1.0 :
                          v_headWidthRatio;
  // In PICKING_MODE, inflate halfGeometryWidth to match the inflated vertex geometry
  #ifdef PICKING_MODE
    float halfGeometryWidth = halfThickness * zoneWidthFactor + aaWidthWebGL + u_pickingPadding * aaWidthWebGL;
  #else
    float halfGeometryWidth = halfThickness * zoneWidthFactor + aaWidthWebGL;
  #endif
  float distFromCenter = abs(v_side) * halfGeometryWidth;

  // Populate EdgeContext (for layer functions)
  context.t = tNorm;
  context.sdf = distFromCenter - halfThickness;
  context.position = queryPathPosition(v_pathId, v_t, v_source, v_target);
  context.tangent = queryPathTangent(v_pathId, v_t, v_source, v_target);
  context.normal = vec2(-context.tangent.y, context.tangent.x);
  context.thickness = v_thickness;
  context.aaWidth = aaWidthWebGL;
  context.edgeLength = v_edgeLength;
  context.tStart = v_tStart;
  context.tEnd = v_tEnd;

  // Compute arc distances
  float visibleLength = v_edgeLength * (v_tEnd - v_tStart);
  float pathT = v_t;
  float pathTNorm = tNorm;
`).concat(e.every(function(v){return v.linearParameterization})?`  // All paths have linear parameterization: t maps directly to arc distance
  context.distanceFromSource = pathTNorm * visibleLength;
  context.distanceToTarget = (1.0 - pathTNorm) * visibleLength;`:e.every(function(v){return!v.linearParameterization})?`  // No paths have linear parameterization: use numerical integration
  context.distanceFromSource = computeArcLengthMulti(v_pathId, v_tStart, pathT, v_source, v_target, 16);
  context.distanceToTarget = computeArcLengthMulti(v_pathId, pathT, v_tEnd, v_source, v_target, 16);`:`  // Mixed parameterization: use analytical for linear paths, numerical for others
  if (`.concat(e.filter(function(v){return v.linearParameterization}).map(function(v){return"v_pathId == ".concat(e.indexOf(v))}).join(" || "),`) {
    context.distanceFromSource = pathTNorm * visibleLength;
    context.distanceToTarget = (1.0 - pathTNorm) * visibleLength;
  } else {
    context.distanceFromSource = computeArcLengthMulti(v_pathId, v_tStart, pathT, v_source, v_target, 16);
    context.distanceToTarget = computeArcLengthMulti(v_pathId, pathT, v_tEnd, v_source, v_target, 16);
  }`),`

  // Compute SDF based on zone using extremity selector (shared pool)
  float bodySDF = distFromCenter - halfThickness;
  float finalSDF;

`).concat(h?`  // Base ratios, from baseRatioLookup
  float headBaseRatio = `.concat(c("v_headId"),`;
  float tailBaseRatio = `).concat(c("v_tailId"),`;

  if (v_zone < 0.5) {
    // TAIL ZONE: v_zoneT goes 0 (tip) to 1 (base)
    vec2 uv = vec2((1.0 - v_zoneT) * v_tailLengthRatio, v_side * v_tailWidthRatio * 0.5);
    float tailSDF = queryExtremitySDF(v_tailId, uv, v_tailLengthRatio, v_tailWidthRatio) * v_thickness;

    // Apply union only near base (v_zoneT > 1 - baseRatio)
    if (v_zoneT > 1.0 - tailBaseRatio) {
      finalSDF = min(tailSDF, bodySDF);
    } else {
      finalSDF = tailSDF;
    }
  } else if (v_zone < 1.5) {
    // BODY ZONE: distance from centerline
    finalSDF = bodySDF;
  } else {
    // HEAD ZONE: v_zoneT goes 0 (base) to 1 (tip)
    vec2 uv = vec2(v_zoneT * v_headLengthRatio, v_side * v_headWidthRatio * 0.5);
    float headSDF = queryExtremitySDF(v_headId, uv, v_headLengthRatio, v_headWidthRatio) * v_thickness;

    // Apply union only near base (v_zoneT < baseRatio)
    if (v_zoneT < headBaseRatio) {
      finalSDF = min(headSDF, bodySDF);
    } else {
      finalSDF = headSDF;
    }
  }`):`  // No extremity draws tail/head geometry, so every vertex is body zone.
  finalSDF = bodySDF;`,`

  #ifdef PICKING_MODE
    // Picking pass: output edge ID for pixels within the picking area
    if (finalSDF > u_pickingPadding * aaWidthWebGL) discard;
    fragColor = v_id;
  #else
`).concat(r?`    // Visual pass: anti-aliased edge with layers, edge opacity applied once
    float alpha = smoothstep(aaWidthWebGL, -aaWidthWebGL, finalSDF) * v_opacity;`:`    // Visual pass: hard-edged (no anti-aliasing gradient) edge with layers, edge opacity applied once
    float alpha = (finalSDF < 0.0 ? 1.0 : 0.0) * v_opacity;`,`
    if (alpha < 0.01) discard;

    // Apply layers sequentially with "over" compositing
    vec4 color = vec4(0.0);

`).concat(m,`

    // Mix with transparent to fade both color AND alpha (pre-multiplied alpha for correct blending)
    fragColor = mix(vec4(0.0), color, alpha);
  #endif
}
`);return b}function Nm(e,n,t){var r=lt(n.length)?!0:n.length>0,a=lt(t.length)?!0:t.length>0;if(e.generateConstantData){var i=e.generateConstantData();return{data:i.data,attributes:i.attributes,verticesPerEdge:i.verticesPerEdge}}return Im(e.segments,r,a)}function Co(e){var n,t=nd(e),r=t.paths,a=t.extremities,i=t.layers,o=(n=e.antialias)!==null&&n!==void 0?n:!0,s=new Map,l=new Map,u=new Map,d=U(r),c;try{for(d.s();!(c=d.n()).done;){var h=c.value,g=U(a),p;try{for(g.s();!(p=g.n()).done;){var m=p.value,b=U(a),v;try{for(b.s();!(v=b.n()).done;){var x=v.value,y="".concat(h.name,":").concat(m.name,":").concat(x.name),_=Nm(h,m,x);s.set(y,_.verticesPerEdge),l.set(y,_.data);var S=U(_.attributes),T;try{for(S.s();!(T=S.n()).done;){var A=T.value;u.has(A.name)||u.set(A.name,A)}}catch(Q){S.e(Q)}finally{S.f()}}}catch(Q){b.e(Q)}finally{b.f()}}}catch(Q){g.e(Q)}finally{g.f()}}}catch(Q){d.e(Q)}finally{d.f()}var w=Array.from(u.values()),E={};w.forEach(function(Q,ee){E[Q.name]=ee});var R=0,L="",k=U(s),P;try{for(k.s();!(P=k.n()).done;){var D=se(P.value,2),I=D[0],G=D[1];G>R&&(R=G,L=I)}}catch(Q){k.e(Q)}finally{k.f()}var z=l.get(L)||[],F=L.split(":"),M=se(F,1),W=M[0],X=r.find(function(Q){return Q.name===W}),q=[];X!=null&&X.generateConstantData?q=X.generateConstantData().attributes:q=[{name:"a_zone"},{name:"a_zoneT"},{name:"a_side"}];var te=z.map(function(Q){var ee=new Array(w.length).fill(0);return q.forEach(function(ot,Oe){var Et=E[ot.name];Et!==void 0&&Oe<Q.length&&(ee[Et]=Q[Oe])}),ee});return{vertexShader:Fm(r,a,i,w),fragmentShader:Mm(r,a,i,o),uniforms:Am(r,a,i),attributes:zm(),verticesPerEdge:R,constantData:te,constantAttributes:w,vertexCountsPerCombination:s,constantDataPerCombination:l}}function zm(e,n,t){return[{name:"a_edgeIndex",size:1,type:Ar},{name:"a_color",size:4,type:xu,normalized:!0},{name:"a_id",size:4,type:xu,normalized:!0},{name:"a_opacity",size:1,type:Ar}]}var Gm=`#version 300 es
precision highp float;

in vec4 v_clamp;

// RGBA32F target: stores (tStart, tEnd, straightenFactor, pathLength).
out vec4 fragColor;

void main() {
  fragColor = v_clamp;
}
`,ad=(function(){function e(n,t){ae(this,e),C(this,"uniformLocations",{});var r=t.paths,a=t.extremities,i=t.layers,o=t.nodeShapes,s=t.nodeLayers;this.gl=n,this.hasAttributeData=tt([].concat(Z(r),Z(i))).floatsPerItem>0,this.hasNodeAttributeData=Object.keys(Wn(o,s).offsets).length>0,this.vertexShader=Ua(n,Pm(r,a,i,o,s)),this.fragmentShader=$a(n,Gm),this.program=Ha(n,[this.vertexShader,this.fragmentShader]);var l=new Set;this.customUniforms=[];for(var u=0,d=[].concat(Z(r),Z(a));u<d.length;u++){var c=d[u],h=U(c.uniforms),g;try{for(h.s();!(g=h.n()).done;){var p=g.value;l.has(p.name)||(l.add(p.name),this.customUniforms.push(p))}}catch(y){h.e(y)}finally{h.f()}}var m=["u_sizeRatio","u_correctionRatio","u_cameraAngle","u_minEdgeThickness","u_nodeDataTexture","u_nodeDataTextureWidth","u_edgeDataTexture","u_edgeDataTextureWidth","u_edgeAttributeTexture","u_edgeAttributeTextureWidth","u_edgeAttributeTexelsPerEdge","u_layerAttributeTexture","u_layerAttributeTextureWidth","u_layerAttributeTexelsPerNode","u_frameTextureWidth","u_frameTextureHeight"].concat(Z(this.customUniforms.map(function(y){return y.name}))),b=U(m),v;try{for(b.s();!(v=b.n()).done;){var x=v.value;this.uniformLocations[x]=n.getUniformLocation(this.program,x)}}catch(y){b.e(y)}finally{b.f()}this.vao=n.createVertexArray()}return ie(e,[{key:"run",value:function(t,r,a,i,o){if(a!==0){var s=this.gl,l=this.uniformLocations;s.useProgram(this.program),s.bindVertexArray(this.vao),l.u_sizeRatio&&s.uniform1f(l.u_sizeRatio,t.sizeRatio),l.u_correctionRatio&&s.uniform1f(l.u_correctionRatio,t.correctionRatio),l.u_cameraAngle&&s.uniform1f(l.u_cameraAngle,t.cameraAngle),l.u_minEdgeThickness&&s.uniform1f(l.u_minEdgeThickness,t.minEdgeThickness),l.u_nodeDataTexture&&s.uniform1i(l.u_nodeDataTexture,t.nodeDataTextureUnit),l.u_nodeDataTextureWidth&&s.uniform1i(l.u_nodeDataTextureWidth,t.nodeDataTextureWidth),l.u_edgeDataTexture&&s.uniform1i(l.u_edgeDataTexture,t.edgeDataTextureUnit),l.u_edgeDataTextureWidth&&s.uniform1i(l.u_edgeDataTextureWidth,t.edgeDataTextureWidth),l.u_frameTextureWidth&&s.uniform1f(l.u_frameTextureWidth,r.getTextureWidth()),l.u_frameTextureHeight&&s.uniform1f(l.u_frameTextureHeight,r.getTextureHeight()),this.hasAttributeData&&i&&(i.bind($t),l.u_edgeAttributeTexture&&s.uniform1i(l.u_edgeAttributeTexture,$t),l.u_edgeAttributeTextureWidth&&s.uniform1i(l.u_edgeAttributeTextureWidth,i.getTextureWidth()),l.u_edgeAttributeTexelsPerEdge&&s.uniform1i(l.u_edgeAttributeTexelsPerEdge,i.getTexelsPerItem())),this.hasNodeAttributeData&&o&&(o.bind(Ut),l.u_layerAttributeTexture&&s.uniform1i(l.u_layerAttributeTexture,Ut),l.u_layerAttributeTextureWidth&&s.uniform1i(l.u_layerAttributeTextureWidth,o.getTextureWidth()),l.u_layerAttributeTexelsPerNode&&s.uniform1i(l.u_layerAttributeTexelsPerNode,o.getTexelsPerItem()));var u=U(this.customUniforms),d;try{for(u.s();!(d=u.n()).done;){var c=d.value;Mo(s,this.uniformLocations[c.name],c)}}catch(h){u.e(h)}finally{u.f()}r.bindAsRenderTarget(),s.disable(s.BLEND),s.disable(s.DEPTH_TEST),s.drawArrays(s.POINTS,0,a),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindVertexArray(null)}}},{key:"kill",value:function(){var t=this.gl;t.deleteProgram(this.program),t.deleteShader(this.vertexShader),t.deleteShader(this.fragmentShader),t.deleteVertexArray(this.vao)}}])})();function Er(e,n,t,r,a,i){if(e.length===1)return"".concat(r," ").concat(n,"(int pathId, ").concat(a,`) {
  return path_`).concat(e[0].name,"_").concat(t,"(").concat(i,`);
}`);var o=e.map(function(s,l){return"    case ".concat(l,": return path_").concat(s.name,"_").concat(t,"(").concat(i,");")}).join(`
`);return"".concat(r," ").concat(n,"(int pathId, ").concat(a,`) {
  switch (pathId) {
`).concat(o,`
    default: return path_`).concat(e[0].name,"_").concat(t,"(").concat(i,`);
  }
}`)}var Om=`
vec3 computeEdgeLabelBodyBounds(
  float tStart, float tEnd, float pathLength,
  float webGLThickness, float headLengthRatio, float tailLengthRatio
) {
  float visibleLength = pathLength * (tEnd - tStart);

  float headLength = headLengthRatio * webGLThickness;
  float tailLength = tailLengthRatio * webGLThickness;
  float totalNeededLength = headLength + tailLength;
  if (totalNeededLength > visibleLength && totalNeededLength > 0.0001) {
    float extremityScale = visibleLength / totalNeededLength;
    headLength *= extremityScale;
    tailLength *= extremityScale;
  }

  float bodyStartDist = tStart * pathLength + tailLength;
  float bodyEndDist = tEnd * pathLength - headLength;
  return vec3(bodyStartDist, bodyEndDist, max(bodyEndDist - bodyStartDist, 0.0));
}
`;function Bm(e,n){var t=ge(e),r=ge(n);return`
float computeEdgeLabelAlpha(float bodyLength, float textWidthWebGL) {
  float ratio = textWidthWebGL > 0.0001 ? min(bodyLength / textWidthWebGL, 1.0) : 1.0;
  if (ratio < `.concat(t,`) return 0.0;
  if (ratio < `).concat(r,") return (ratio - ").concat(t,") / (").concat(r," - ").concat(t,`);
  return 1.0;
}
`)}var Wm=`
float computeEdgeLabelScreenDir(int pathId, float t, vec2 source, vec2 target, mat3 matrix) {
  vec2 tangent = queryPathTangent(pathId, t, source, target);
  return (matrix * vec3(tangent, 0.0)).x < 0.0 ? -1.0 : 1.0;
}
`,Um=`
float computeEdgeLabelPerpOffset(
  float positionMode,
  float halfThickness, float marginWebGL, float halfTextHeight,
  float readingSign, float screenDir
) {
  float magnitude = halfThickness + marginWebGL + halfTextHeight;
  if (positionMode == 1.0) return magnitude * readingSign;
  if (positionMode == 2.0) return -magnitude * readingSign;
  if (positionMode == 3.0) return magnitude * screenDir;
  return 0.0;
}
`;function id(e){var n=e.paths,t=e.minVisibilityThreshold,r=e.fullVisibilityThreshold,a=n.some(function(s){return s.hasSharpCorners}),i=n.map(function(s){return"// --- Path: ".concat(s.name,` ---
`).concat(s.glsl,`

// Tangent/normal functions: analytical if provided, otherwise numerical
`).concat(s.analyticalTangentGlsl||ed(s.name),`

// Auto-generated fallbacks for any missing path functions
`).concat(td(s.name,s.glsl),`

// Corner skip helpers (for paths with sharp corners like step/taxi)
`).concat(s.cornerSkipGlsl||"",`
`)}).join(`
`),o=a?`// Corner function selectors (only some paths have sharp corners)
vec2 queryGetCornerTs(int pathId, vec2 source, vec2 target) {
  switch (pathId) {
`.concat(n.map(function(s,l){return s.hasSharpCorners?"    case ".concat(l,": return path_").concat(s.name,"_getCornerTs(source, target);"):"    case ".concat(l,": return vec2(-1.0, -1.0); // No corners for ").concat(s.name)}).join(`
`),`
    default: return vec2(-1.0, -1.0);
  }
}

vec2 queryGetCornerConcavity(int pathId, vec2 source, vec2 target, float perpOffset) {
  switch (pathId) {
`).concat(n.map(function(s,l){return s.hasSharpCorners?"    case ".concat(l,": return path_").concat(s.name,"_getCornerConcavity(source, target, perpOffset);"):"    case ".concat(l,": return vec2(0.0, 0.0); // No corners for ").concat(s.name)}).join(`
`),`
    default: return vec2(0.0, 0.0);
  }
}`):"";return`
// ============================================================================
// Node data fetch (geometry texel) and per-edge clamp fetch (edge-frame texture)
// ============================================================================

`.concat(gt,`
`).concat(dn,`

// ============================================================================
// Path Functions (one block per path)
// ============================================================================

`).concat(i,`

// ============================================================================
// Path Query Selectors (dispatch by pathId)
// ============================================================================

`).concat(Er(n,"queryPathPosition","position","vec2","float t, vec2 source, vec2 target","t, source, target"),`

`).concat(Er(n,"queryPathTangent","tangent","vec2","float t, vec2 source, vec2 target","t, source, target"),`

`).concat(Er(n,"queryPathNormal","normal","vec2","float t, vec2 source, vec2 target","t, source, target"),`

`).concat(Er(n,"queryPathLength","length","float","vec2 source, vec2 target","source, target"),`

`).concat(Er(n,"queryPathTAtDistance","t_at_distance","float","float dist, vec2 source, vec2 target","dist, source, target"),`

`).concat(o,`

// ============================================================================
// Shared helpers (body bounds, alpha ramp, screen direction, perpendicular offset)
// ============================================================================

`).concat(Om,`
`).concat(Bm(t,r),`
`).concat(Wm,`
`).concat(Um,`
`)}var $m=ft.fontSize,Hm=new Map,od=24,_u=(od+1)*2;function jm(e){var n=e.paths,t=e.fontSizeMode,r=e.headLengthRatio,a=e.tailLengthRatio,i=e.minVisibilityThreshold,o=e.fullVisibilityThreshold,s=e.keepUpright,l=t==="scaled",u=Bt(),d=tt([].concat(Z(n),[u])),c=Cr(d),h=`#version 300 es

// Per-instance attributes
in float a_edgeIndex;
in float a_edgeAttrIndex;
in float a_baseFontSize;
in float a_totalTextWidth;
in float a_positionMode;
in float a_margin;
in float a_padding;
in vec4 a_color;
in vec4 a_id;

// Per-vertex (constant) attribute: strip vertex index
in float a_vertexIndex;

uniform mat3 u_matrix;
uniform float u_sizeRatio;
uniform float u_correctionRatio;
uniform float u_pixelRatio;
uniform float u_cameraAngle;
uniform vec2 u_resolution;
uniform sampler2D u_nodeDataTexture;
uniform int u_nodeDataTextureWidth;
uniform sampler2D u_edgeDataTexture;
uniform int u_edgeDataTextureWidth;
uniform sampler2D u_edgeFrameTexture; // Per-edge clamp (tStart, tEnd, straightenFactor, pathLength)
uniform int u_edgeFrameTextureWidth;
`.concat(l?"uniform float u_zoomSizeRatio;":"",`

`).concat(c.uniformDeclarations,`

out vec4 v_color;
out vec4 v_id;
out float v_alphaModifier;

const float ATLAS_FONT_SIZE = `).concat(ge($m),`;
const float HEAD_RATIO = `).concat(ge(r),`;
const float TAIL_RATIO = `).concat(ge(a),`;
const int RIBBON_SEGMENTS = `).concat(od,`;

// Path attribute varyings (declared as plain locals since this shader has no FS inputs for them)
`).concat(c.vertexVaryingDeclarations.replace(/out /g,""),`

// Node size variables used by some path functions (self-loops, etc.)
float v_sourceNodeSize;
float v_targetNodeSize;

// Shared preamble: shape SDFs, path functions + selectors, clamp, helpers.
`).concat(id({paths:n,minVisibilityThreshold:i,fullVisibilityThreshold:o}),`

void main() {
  int vIdx = int(a_vertexIndex);
  int pairIdx = vIdx / 2;
  int side = vIdx - pairIdx * 2; // 0 = left/bottom, 1 = right/top

  // --- Fetch edge data (2 texels per edge) ---
  int edgeIdx = int(a_edgeIndex);
  int texel0Idx = edgeIdx * 2;
  int texel1Idx = edgeIdx * 2 + 1;
  ivec2 e0 = ivec2(texel0Idx % u_edgeDataTextureWidth, texel0Idx / u_edgeDataTextureWidth);
  ivec2 e1 = ivec2(texel1Idx % u_edgeDataTextureWidth, texel1Idx / u_edgeDataTextureWidth);
  vec4 edgeData0 = texelFetch(u_edgeDataTexture, e0, 0);
  vec4 edgeData1 = texelFetch(u_edgeDataTexture, e1, 0);

  int srcIdx = int(edgeData0.x);
  int tgtIdx = int(edgeData0.y);
  float thickness = edgeData0.z;
  int pathId = int(edgeData1.z);

  // --- Fetch path attributes (curvature, etc.) ---
  {
    int edgeIdx = int(a_edgeAttrIndex);
`).concat(c.fetchCode,`
`).concat(c.varyingAssignments,`
  }

  // --- Fetch node data: geometry (texel 0) + rotation flags (texel 1) ---
  vec4 srcN = readNodeData(u_nodeDataTexture, u_nodeDataTextureWidth, srcIdx);
  vec4 tgtN = readNodeData(u_nodeDataTexture, u_nodeDataTextureWidth, tgtIdx);

  vec2 source = srcN.xy;
  vec2 target = tgtN.xy;
  float sourceSize = srcN.z;
  float targetSize = tgtN.z;
  v_sourceNodeSize = sourceSize;
  v_targetNodeSize = targetSize;

  // --- Pixel-to-graph conversion (fixed font mode) ---
  float matrixScaleX = length(vec2(u_matrix[0][0], u_matrix[1][0]));
  float pixelToGraph = 2.0 / (matrixScaleX * u_resolution.x);

  float webGLThickness = thickness * u_correctionRatio / u_sizeRatio;

  // --- Body bounds (shared with edge label shader) ---
  vec4 edgeClamp = readFrameTexel(u_edgeFrameTexture, u_edgeFrameTextureWidth, edgeIdx);
  vec3 bodyBounds = computeEdgeLabelBodyBounds(
    edgeClamp.x, edgeClamp.y, edgeClamp.w,
    webGLThickness, HEAD_RATIO, TAIL_RATIO
  );
  float bodyStartDist = bodyBounds.x;
  float bodyEndDist = bodyBounds.y;
  float bodyLength = bodyBounds.z;

  // --- Text dimensions ---
  float baseFontSize = a_baseFontSize;
  `).concat(l?`float fontScale = baseFontSize / ATLAS_FONT_SIZE * u_zoomSizeRatio;
  float textWidthWebGL = a_totalTextWidth * fontScale * u_correctionRatio / u_sizeRatio;
  float halfTextHeight = baseFontSize * 0.35 * u_zoomSizeRatio * u_correctionRatio / u_sizeRatio;
  float marginWebGL = a_margin * u_zoomSizeRatio * u_correctionRatio / u_sizeRatio;`:`float fontScale = baseFontSize / ATLAS_FONT_SIZE;
  float textWidthWebGL = a_totalTextWidth * fontScale * pixelToGraph;
  float halfTextHeight = baseFontSize * 0.35 * pixelToGraph;
  float marginWebGL = a_margin * pixelToGraph;`,`
  float paddingWebGL = a_padding * pixelToGraph;

  // --- Alpha modifier (shared with edge label shader) ---
  float alphaModifier = computeEdgeLabelAlpha(bodyLength, textWidthWebGL);
  if (alphaModifier <= 0.0 || textWidthWebGL <= 0.0) {
    gl_Position = vec4(2.0, 0.0, 0.0, 1.0);
    v_color = vec4(0.0);
    v_id = vec4(0.0);
    v_alphaModifier = 0.0;
    return;
  }

  // --- Perpendicular offset (shared with edge label shader) ---
  float bodyCenterDist = (bodyStartDist + bodyEndDist) * 0.5;
  float centerT = queryPathTAtDistance(pathId, bodyCenterDist, source, target);
  float screenDir = computeEdgeLabelScreenDir(pathId, centerT, source, target, u_matrix);
  float readingSign = `).concat(s?"screenDir":"1.0",`;
  float halfThickness = webGLThickness * 0.5;
  float perpOffset = computeEdgeLabelPerpOffset(
    a_positionMode, halfThickness, marginWebGL, halfTextHeight, readingSign, screenDir
  );

  // --- Ribbon span (clipped to body) ---
  float halfTextWebGL = textWidthWebGL * 0.5;
  float labelStartDist = max(bodyCenterDist - halfTextWebGL, bodyStartDist);
  float labelEndDist = min(bodyCenterDist + halfTextWebGL, bodyEndDist);

  // Sample centerline at this pair, then apply perpendicular offset.
  // The ribbon follows the centerline path (simple & robust); for curved edges
  // this closely matches the offset path the characters sit on.
  float u = float(pairIdx) / float(RIBBON_SEGMENTS);
  float arcDist = mix(labelStartDist, labelEndDist, u);
  float t = queryPathTAtDistance(pathId, arcDist, source, target);
  vec2 pos = queryPathPosition(pathId, t, source, target);
  vec2 tan = queryPathTangent(pathId, t, source, target);
  vec2 perp = vec2(-tan.y, tan.x);

  vec2 centerPos = pos + perp * perpOffset;

  float halfRibbon = halfTextHeight + paddingWebGL;
  float sideSign = side == 0 ? -1.0 : 1.0;
  vec2 ribbonPos = centerPos + perp * (sideSign * halfRibbon);

  vec3 clipPos = u_matrix * vec3(ribbonPos, 1.0);
  gl_Position = vec4(clipPos.xy, 0.0, 1.0);

  v_color = a_color;
  v_id = a_id;
  v_alphaModifier = alphaModifier;
}
`);return h}var qm=`#version 300 es
precision highp float;

in vec4 v_color;
in vec4 v_id;
in float v_alphaModifier;

out vec4 fragColor;

void main() {
#ifdef PICKING_MODE
  if (v_alphaModifier <= 0.0) discard;
  fragColor = v_id;
#else
  float alpha = v_color.a * v_alphaModifier;
  if (alpha <= 0.0) discard;
  fragColor = vec4(v_color.rgb * alpha, alpha);
#endif
}
`;function sd(e,n,t,r){var a=r.shaderConfig,i=a.paths,o=a.fontSizeMode;if(i.length===0)throw new Error("createEdgeLabelBackgroundProgram: shaderConfig must declare at least one path");var s=Bt(),l=tt([].concat(Z(i),[s])),u=Ya([].concat(Z(i),[s]),l),d=jm(a),c=(function(h){function g(p,m,b){var v;return ae(this,g),v=ye(this,g,[p,m,b]),C(v,"totalCount",0),C(v,"bufferCapacity",0),C(v,"edgeAttributeTexture",null),v.edgeAttributeTexture=new Xa(p,l),v.packedAttributeData=new Float32Array(l.floatsPerItem),v}return be(g,h),ie(g,[{key:"getDefinition",value:function(){for(var m=WebGL2RenderingContext,b=m.FLOAT,v=m.UNSIGNED_BYTE,x=m.TRIANGLE_STRIP,y=[],_=0;_<_u;_++)y.push([_]);var S=["u_matrix","u_sizeRatio","u_correctionRatio","u_pixelRatio","u_cameraAngle","u_resolution","u_nodeDataTexture","u_nodeDataTextureWidth","u_edgeDataTexture","u_edgeDataTextureWidth","u_edgeFrameTexture","u_edgeFrameTextureWidth"];return o==="scaled"&&S.push("u_zoomSizeRatio"),l.floatsPerItem>0&&S.push("u_edgeAttributeTexture","u_edgeAttributeTextureWidth","u_edgeAttributeTexelsPerEdge"),{VERTICES:_u,VERTEX_SHADER_SOURCE:d,FRAGMENT_SHADER_SOURCE:qm,METHOD:x,UNIFORMS:S,ATTRIBUTES:[{name:"a_edgeIndex",size:1,type:b},{name:"a_edgeAttrIndex",size:1,type:b},{name:"a_baseFontSize",size:1,type:b},{name:"a_totalTextWidth",size:1,type:b},{name:"a_positionMode",size:1,type:b},{name:"a_margin",size:1,type:b},{name:"a_padding",size:1,type:b},{name:"a_color",size:4,type:v,normalized:!0},{name:"a_id",size:4,type:v,normalized:!0}],CONSTANT_ATTRIBUTES:[{name:"a_vertexIndex",size:1,type:b}],CONSTANT_DATA:y}}},{key:"processEdgeLabelBackground",value:function(m,b,v){var x=0;if(this.edgeAttributeTexture&&l.floatsPerItem>0){x=this.edgeAttributeTexture.allocate(b);var y=this.packedAttributeData;Ka(u,v.edgeAttributes,y,"",Hm,0),this.edgeAttributeTexture.updateAllAttributes(b,y)}var _=this.floats,S=this.ints,T=m*this.STRIDE;_[T++]=v.edgeIndex,_[T++]=x,_[T++]=v.baseFontSize,_[T++]=v.totalTextWidth,_[T++]=v.positionMode,_[T++]=v.margin,_[T++]=v.padding,_[T++]=v.color,S[T++]=v.id}},{key:"setUniforms",value:function(m,b){var v=b.gl,x=b.uniformLocations;if(v.uniformMatrix3fv(x.u_matrix,!1,m.matrix),v.uniform1f(x.u_sizeRatio,m.sizeRatio),v.uniform1f(x.u_correctionRatio,m.correctionRatio),v.uniform1f(x.u_pixelRatio,m.pixelRatio),v.uniform1f(x.u_cameraAngle,m.cameraAngle),v.uniform2f(x.u_resolution,m.width,m.height),x.u_nodeDataTexture!==void 0&&v.uniform1i(x.u_nodeDataTexture,m.nodeDataTextureUnit),x.u_nodeDataTextureWidth!==void 0&&v.uniform1i(x.u_nodeDataTextureWidth,m.nodeDataTextureWidth),x.u_edgeDataTexture!==void 0&&v.uniform1i(x.u_edgeDataTexture,m.edgeDataTextureUnit),x.u_edgeDataTextureWidth!==void 0&&v.uniform1i(x.u_edgeDataTextureWidth,m.edgeDataTextureWidth),x.u_edgeFrameTexture!==void 0&&v.uniform1i(x.u_edgeFrameTexture,m.edgeFrameTextureUnit),x.u_edgeFrameTextureWidth!==void 0&&v.uniform1i(x.u_edgeFrameTextureWidth,m.edgeFrameTextureWidth),o==="scaled"&&x.u_zoomSizeRatio!==void 0){var y=this.renderer.getSetting("zoomToSizeRatioFunction");v.uniform1f(x.u_zoomSizeRatio,1/y(m.zoomRatio))}this.edgeAttributeTexture&&l.floatsPerItem>0&&x.u_edgeAttributeTexture!==void 0&&(this.edgeAttributeTexture.bind($t),v.uniform1i(x.u_edgeAttributeTexture,$t),v.uniform1i(x.u_edgeAttributeTextureWidth,this.edgeAttributeTexture.getTextureWidth()),v.uniform1i(x.u_edgeAttributeTexelsPerEdge,this.edgeAttributeTexture.getTexelsPerItem()))}},{key:"renderProgram",value:function(m,b){this.edgeAttributeTexture&&l.floatsPerItem>0&&this.edgeAttributeTexture.upload(),Ce(g,"renderProgram",this,3)([m,b])}},{key:"kill",value:function(){this.edgeAttributeTexture&&(this.edgeAttributeTexture.kill(),this.edgeAttributeTexture=null),Ce(g,"kill",this,3)([])}},{key:"drawWebGL",value:function(m,b){var v=b.gl;this.totalCount!==0&&v.drawArraysInstanced(v.TRIANGLE_STRIP,0,this.VERTICES,this.totalCount)}},{key:"reallocate",value:function(m){this.totalCount=m,m>this.bufferCapacity&&(this.bufferCapacity=Math.max(m,Math.ceil(this.bufferCapacity*1.5)||10),Ce(g,"reallocate",this,3)([this.bufferCapacity]))}}])})(jt);return new c(e,n,t)}function ld(e){var n,t,r,a,i,o;return{paths:e.paths,headLengthRatio:(n=e.headLengthRatio)!==null&&n!==void 0?n:0,tailLengthRatio:(t=e.tailLengthRatio)!==null&&t!==void 0?t:0,fontSizeMode:(r=e.fontSizeMode)!==null&&r!==void 0?r:"fixed",minVisibilityThreshold:(a=e.minVisibilityThreshold)!==null&&a!==void 0?a:.7,fullVisibilityThreshold:(i=e.fullVisibilityThreshold)!==null&&i!==void 0?i:.8,keepUpright:(o=e.keepUpright)!==null&&o!==void 0?o:!0}}var Vm=ft.fontSize,Xm=17/64;function Ym(e){var n=e.paths,t=e.hasBorder,r=t===void 0?!1:t,a=e.fontSizeMode,i=a===void 0?"fixed":a,o=e.minVisibilityThreshold,s=o===void 0?.5:o,l=e.fullVisibilityThreshold,u=l===void 0?.6:l,d=e.keepUpright,c=d===void 0?!0:d,h=i==="scaled",g=n.some(function(x){return x.hasSharpCorners}),p=Bt(),m=tt([].concat(Z(n),[p])),b=Cr(m),v=`#version 300 es

// ============================================================================
// Attributes - Per Character (Instanced)
// ============================================================================

// Edge geometry: indices for texture lookup
// Edge data (source/target node indices, thickness, head/tail ratios) is fetched from edge data texture
// Edge path attributes (curvature, etc.) are fetched from edge attribute texture
in float a_edgeIndex;       // Index into edge data texture
in float a_edgeAttrIndex;   // Index into edge attribute texture (for curvature, etc.)
in float a_baseFontSize;    // Base font size in pixels (per-label)

// Character metrics (in glyph units = atlas font size pixels)
in vec4 a_charMetrics;      // (charTextOffset, charAdvance, totalTextWidth, positionMode)
in vec4 a_charDims;         // (charSize.x, charSize.y, charOffset.x, charOffset.y)

// Atlas texture coordinates
in vec4 a_texCoords;        // (x, y, width, height) in atlas pixels

// Label parameters
in vec2 a_labelParams;      // (margin, unused)

// Appearance
in vec4 a_color;            // Character color (RGBA, normalized)
`.concat(r?"in vec4 a_borderColor;      // Border color (RGBA, normalized)":"",`

// ============================================================================
// Attributes - Per Vertex (Constant)
// ============================================================================

in vec2 a_quadCorner;       // Quad corner: (0,0), (1,0), (0,1), (1,1)

// ============================================================================
// Uniforms
// ============================================================================

uniform mat3 u_matrix;
uniform float u_sizeRatio;
uniform float u_correctionRatio;
uniform float u_pixelRatio;
uniform float u_cameraAngle;    // Required by node shape SDFs
// u_sdfBufferPixels kept for ABI compatibility but unused in shader
uniform float u_sdfBufferPixels;
uniform vec2 u_resolution;
uniform vec2 u_atlasSize;
uniform sampler2D u_nodeDataTexture; // Shared texture with node position/size/shape data
uniform int u_nodeDataTextureWidth;  // Width of 2D node data texture for coordinate calculation
uniform sampler2D u_edgeDataTexture; // Shared texture with edge data
uniform int u_edgeDataTextureWidth;  // Width of 2D edge data texture for coordinate calculation
uniform sampler2D u_edgeFrameTexture; // Per-edge clamp (tStart, tEnd, straightenFactor, pathLength)
uniform int u_edgeFrameTextureWidth;
`).concat(h?"uniform float u_zoomSizeRatio;  // Zoom-based size ratio from zoomToSizeRatioFunction":"",`

// Edge path attribute texture uniforms (for curvature and other path attributes)
`).concat(b.uniformDeclarations,`

// ============================================================================
// Varyings
// ============================================================================

out vec2 v_texCoord;
out vec4 v_color;
`).concat(r?"out vec4 v_borderColor;":"",`
out float v_edgeFade;  // 0 = fully visible, 1 = fully faded (outside body)
out float v_alphaModifier;  // 0-1 based on label visibility ratio
out float v_fontScale;  // Ratio of rendered font size to atlas font size
`).concat(r?"out float v_positionMode;  // Position mode for conditional border (0=over needs border)":"",`

// ============================================================================
// Constants
// ============================================================================

const float bias = 255.0 / 254.0;
const float FADE_WIDTH_PIXELS = 15.0;  // Width of fade gradient in pixels
const float ATLAS_FONT_SIZE = `).concat(ge(Vm),`;  // Base font size used in SDF atlas
const float VERTICAL_CENTER_RATIO = `).concat(ge(Xm),`;  // Baseline to visual center ratio

// ============================================================================
// Path Attribute Variables (set in main, used by path functions)
// ============================================================================
// Path attributes are fetched from the edge attribute texture and stored in
// variables with v_ prefix (e.g., v_curvature) for path functions to access.
`).concat(b.vertexVaryingDeclarations.replace(/out /g,""),`

// Node size variables (set in main, used by some path functions like loops).
// These mirror the v_sourceNodeSize / v_targetNodeSize varyings in generator.ts,
// but are plain floats here since the label shader is vertex-only.
float v_sourceNodeSize;
float v_targetNodeSize;

// Shared preamble: shape SDFs, path functions + selectors, clamp, helpers.
`).concat(id({paths:n,minVisibilityThreshold:s,fullVisibilityThreshold:u}),`

// ============================================================================
// Main
// ============================================================================

void main() {
  // -------------------------------------------------------------------------
  // Fetch edge data from edge texture (2 texels per edge)
  // -------------------------------------------------------------------------
  // Texel 0: sourceNodeIndex, targetNodeIndex, thickness, reserved
  // Texel 1: headLengthRatio, tailLengthRatio, pathId, extremityIds
  int edgeIdx = int(a_edgeIndex);
  int texel0Idx = edgeIdx * 2;
  int texel1Idx = edgeIdx * 2 + 1;
  ivec2 edgeTexCoord0 = ivec2(texel0Idx % u_edgeDataTextureWidth, texel0Idx / u_edgeDataTextureWidth);
  ivec2 edgeTexCoord1 = ivec2(texel1Idx % u_edgeDataTextureWidth, texel1Idx / u_edgeDataTextureWidth);
  vec4 edgeData0 = texelFetch(u_edgeDataTexture, edgeTexCoord0, 0);
  vec4 edgeData1 = texelFetch(u_edgeDataTexture, edgeTexCoord1, 0);

  // Unpack edge data
  int srcIdx = int(edgeData0.x);
  int tgtIdx = int(edgeData0.y);
  float thickness = edgeData0.z;
  // edgeData0.w is reserved
  float headLengthRatio = edgeData1.x;
  float tailLengthRatio = edgeData1.y;
  int pathId = int(edgeData1.z);  // Path type for multi-path support
  float baseFontSize = a_baseFontSize;

  // -------------------------------------------------------------------------
  // Fetch path attributes from edge attribute texture
  // -------------------------------------------------------------------------
  // Note: The fetch code uses 'edgeIdx' variable, so we set it to the attribute texture index
  {
    int edgeIdx = int(a_edgeAttrIndex);  // Use attribute texture index for path attributes
`).concat(b.fetchCode,`
`).concat(b.varyingAssignments,`
  }

  // -------------------------------------------------------------------------
  // Fetch node data from node texture (geometry texel + rotation-flags texel)
  // -------------------------------------------------------------------------
  vec4 srcNodeData = readNodeData(u_nodeDataTexture, u_nodeDataTextureWidth, srcIdx);
  vec4 tgtNodeData = readNodeData(u_nodeDataTexture, u_nodeDataTextureWidth, tgtIdx);

  vec2 source = srcNodeData.xy;
  vec2 target = tgtNodeData.xy;
  float sourceSize = srcNodeData.z;
  float targetSize = tgtNodeData.z;
  v_sourceNodeSize = sourceSize;
  v_targetNodeSize = targetSize;
  float charTextOffset = a_charMetrics.x;
  float charAdvance = a_charMetrics.y;
  float totalTextWidth = a_charMetrics.z;
  float positionMode = a_charMetrics.w;
  vec2 charSize = a_charDims.xy;
  vec2 charOffset = a_charDims.zw;
  float margin = a_labelParams.x;

  // -------------------------------------------------------------------------
  // Compute pixel-to-graph conversion (for fixed font size mode)
  // -------------------------------------------------------------------------
  // This converts screen pixels to graph units such that N pixels on screen
  // becomes N pixels regardless of zoom level.
  // matrixScaleX is how much the matrix scales graph units to clip space
  float matrixScaleX = length(vec2(u_matrix[0][0], u_matrix[1][0]));
  float pixelToGraph = 2.0 / (matrixScaleX * u_resolution.x);

  // -------------------------------------------------------------------------
  // Step 1: Convert thickness to WebGL units
  // -------------------------------------------------------------------------
  float webGLThickness = thickness * u_correctionRatio / u_sizeRatio;

  // -------------------------------------------------------------------------
  // Step 2: Compute body bounds (truncated at node boundaries + extremities)
  // -------------------------------------------------------------------------
  vec4 edgeClamp = readFrameTexel(u_edgeFrameTexture, u_edgeFrameTextureWidth, edgeIdx);
  vec3 bodyBounds = computeEdgeLabelBodyBounds(
    edgeClamp.x, edgeClamp.y, edgeClamp.w,
    webGLThickness, headLengthRatio, tailLengthRatio
  );
  float bodyStartDist = bodyBounds.x;
  float bodyEndDist = bodyBounds.y;
  float bodyLength = bodyBounds.z;

  // -------------------------------------------------------------------------
  // Step 3: Compute font scale and text dimensions
  // -------------------------------------------------------------------------
  // Font size modes:
  // - "fixed": Constant pixel size regardless of zoom, using pixelToGraph conversion
  // - "scaled": Scales with zoom using zoomToSizeRatioFunction
  `).concat(h?`// Scaled mode: font scales with zoom
  float fontScale = baseFontSize / ATLAS_FONT_SIZE * u_zoomSizeRatio;
  // Convert glyph-unit metrics to WebGL units (scales with zoom)
  float textWidthWebGL = totalTextWidth * fontScale * u_correctionRatio / u_sizeRatio;
  float charOffsetWebGL = charTextOffset * fontScale * u_correctionRatio / u_sizeRatio;
  float charAdvanceWebGL = charAdvance * fontScale * u_correctionRatio / u_sizeRatio;`:`// Fixed mode: font stays constant in screen pixels
  float fontScale = baseFontSize / ATLAS_FONT_SIZE;
  // Convert glyph-unit metrics to graph units using pixelToGraph (zoom-independent)
  float textWidthWebGL = totalTextWidth * fontScale * pixelToGraph;
  float charOffsetWebGL = charTextOffset * fontScale * pixelToGraph;
  float charAdvanceWebGL = charAdvance * fontScale * pixelToGraph;`,`

  // Font scale varying for fragment shader gamma scaling.
  // Ratio of rendered font size to atlas font size \u2014 used to tighten the
  // anti-aliasing band for large labels so they stay sharp.
  v_fontScale = fontScale;

  // -------------------------------------------------------------------------
  // Step 4: Alpha modifier from how much of the label fits in the body
  // -------------------------------------------------------------------------
  float alphaModifier = computeEdgeLabelAlpha(bodyLength, textWidthWebGL);

  // -------------------------------------------------------------------------
  // Step 5: Compute character center offset (truncation check moved to after curvature adjustment)
  // -------------------------------------------------------------------------
  // Body center in arc distance
  float bodyCenterDist = (bodyStartDist + bodyEndDist) * 0.5;

  float centerT = queryPathTAtDistance(pathId, bodyCenterDist, source, target);
  float screenDir = computeEdgeLabelScreenDir(pathId, centerT, source, target, u_matrix);

  // Reversed labels lay their characters out from target to source
  float readingSign = `).concat(c?"screenDir":"1.0",`;

  // Character center position relative to label center (on centerline, before curvature adjustment)
  float charCenterOffset = readingSign * (charOffsetWebGL + charAdvanceWebGL * 0.5 - textWidthWebGL * 0.5);

  // -------------------------------------------------------------------------
  // Step 6: Compute perpendicular offset based on position mode
  // -------------------------------------------------------------------------
  // Position modes: 0=over, 1=above, 2=below, 3=auto
  // Needed early for curvature-adaptive character spacing in Step 7
  float halfThickness = webGLThickness * 0.5;
  `).concat(h?`// Scaled mode: margin and text height scale with zoom (same factor as font)
  float marginWebGL = margin * u_zoomSizeRatio * u_correctionRatio / u_sizeRatio;
  float halfTextHeight = baseFontSize * 0.35 * u_zoomSizeRatio * u_correctionRatio / u_sizeRatio;`:`// Fixed mode: margin and text height stay constant in screen pixels
  float marginWebGL = margin * pixelToGraph;
  float halfTextHeight = baseFontSize * 0.35 * pixelToGraph;`,`
  float perpOffset = computeEdgeLabelPerpOffset(
    positionMode, halfThickness, marginWebGL, halfTextHeight, readingSign, screenDir
  );

  // -------------------------------------------------------------------------
  // Step 7: Position character on path using offset path traversal
  // -------------------------------------------------------------------------
  // For "over" mode (perpOffset = 0), use simple centerline placement
  // For above/below modes, walk along the offset path to find correct position
  float charT;

  if (perpOffset == 0.0) {
    // Simple case: place on centerline
    float charArcDist = bodyCenterDist + charCenterOffset;
    charT = queryPathTAtDistance(pathId, charArcDist, source, target);
  } else {
    // Offset path traversal: walk along the offset curve to find character position
    // This ensures even character spacing regardless of curvature

    `).concat(g?`// -----------------------------------------------------------------------
    // Corner skip setup for step/taxi edges with above/below labels
    // -----------------------------------------------------------------------
    // At concave corners (inner side of the bend), characters would bunch up
    // because the offset path has near-zero arc length. We detect corner
    // crossings during the offset path traversal and add skip distance.

    // Get corner t values and concavity
    vec2 cornerTs = queryGetCornerTs(pathId, source, target);
    vec2 concavity = queryGetCornerConcavity(pathId, source, target, perpOffset);

    // Skip distance in graph units, proportional to on-screen font size
    // For fixed mode: use pixelToGraph so gap stays constant regardless of zoom
    // For scaled mode: use the same conversion as text width
    `.concat(h?"float skipDistGraph = STEP_INNER_CORNER_SKIP_FACTOR * baseFontSize * u_zoomSizeRatio * u_correctionRatio / u_sizeRatio;":"float skipDistGraph = STEP_INNER_CORNER_SKIP_FACTOR * baseFontSize * pixelToGraph;",`

    // Corner t values for detecting crossings during traversal
    float corner1T = cornerTs.x;
    float corner2T = cornerTs.y;
    bool corner1IsConcave = concavity.x > 0.5;
    bool corner2IsConcave = concavity.y > 0.5;`):"",`

    // Target distance along offset path from center
    float targetOffsetDist = abs(charCenterOffset);

    // Handle center character (charCenterOffset \u2248 0) - no search needed
    if (targetOffsetDist < 0.0001) {
      charT = centerT;
    } else {
      vec2 centerPos = queryPathPosition(pathId, centerT, source, target);
      vec2 centerNormal = queryPathNormal(pathId, centerT, source, target);
      vec2 offsetCenter = centerPos + centerNormal * perpOffset;

      float searchDir = charCenterOffset > 0.0 ? 1.0 : -1.0;

      // Search bounds (t values for body start and end)
      float tBodyStart = queryPathTAtDistance(pathId, bodyStartDist, source, target);
      float tBodyEnd = queryPathTAtDistance(pathId, bodyEndDist, source, target);

      // Walk along offset path to find character position
      float accumDist = 0.0;
      vec2 prevOffsetPos = offsetCenter;
      float prevT = centerT;
      float foundT = centerT;

      // Search range depends on direction
      float tSearchEnd = searchDir > 0.0 ? tBodyEnd : tBodyStart;

      `).concat(g?`// Track which concave corners we've crossed to add skip distance
      bool crossedCorner1 = false;
      bool crossedCorner2 = false;
      float effectiveTargetDist = targetOffsetDist;`:"",`

      const int STEPS = 32;
      for (int i = 1; i <= STEPS; i++) {
        // Step along centerline t, from center toward target
        float stepT = centerT + searchDir * float(i) * abs(tSearchEnd - centerT) / float(STEPS);

        `).concat(g?`// Check for concave corner crossings and add skip distance
        // Corner 1 crossing check
        if (corner1IsConcave && !crossedCorner1) {
          bool crossingCorner1 = (searchDir > 0.0)
            ? (prevT < corner1T && stepT >= corner1T)
            : (prevT > corner1T && stepT <= corner1T);
          if (crossingCorner1) {
            crossedCorner1 = true;
            effectiveTargetDist += skipDistGraph;
          }
        }

        // Corner 2 crossing check
        if (corner2IsConcave && !crossedCorner2) {
          bool crossingCorner2 = (searchDir > 0.0)
            ? (prevT < corner2T && stepT >= corner2T)
            : (prevT > corner2T && stepT <= corner2T);
          if (crossingCorner2) {
            crossedCorner2 = true;
            effectiveTargetDist += skipDistGraph;
          }
        }`:"",`

        // Compute offset position at this t
        vec2 stepPos = queryPathPosition(pathId, stepT, source, target);
        vec2 stepNormal = queryPathNormal(pathId, stepT, source, target);
        vec2 offsetPos = stepPos + stepNormal * perpOffset;

        // Distance along offset path
        float segDist = length(offsetPos - prevOffsetPos);

        `).concat(g?`if (accumDist + segDist >= effectiveTargetDist) {
          // Interpolate within segment to find exact t
          float remaining = effectiveTargetDist - accumDist;
          float segT = remaining / max(segDist, 0.0001);
          foundT = mix(prevT, stepT, segT);
          break;
        }`:`if (accumDist + segDist >= targetOffsetDist) {
          // Interpolate within segment to find exact t
          float remaining = targetOffsetDist - accumDist;
          float segT = remaining / max(segDist, 0.0001);
          foundT = mix(prevT, stepT, segT);
          break;
        }`,`

        accumDist += segDist;
        prevOffsetPos = offsetPos;
        prevT = stepT;
        // Update foundT to last valid position in case loop exhausts without finding target
        foundT = stepT;
      }

      charT = foundT;
    }
  }

  // Get position and tangent at final character position
  vec2 pathPos = queryPathPosition(pathId, charT, source, target);
  vec2 tangent = queryPathTangent(pathId, charT, source, target);

  // Compute perpendicular direction (90 degrees from tangent)
  vec2 perpDir = vec2(-tangent.y, tangent.x);

  // Apply perpendicular offset to path position
  vec2 offsetPathPos = pathPos + perpDir * perpOffset;

  // -------------------------------------------------------------------------
  // Step 8: Build character quad
  // -------------------------------------------------------------------------
  // Character size in screen pixels
  vec2 charSizePixels = charSize * fontScale;

  // Character offset from origin to the atlas region's top-left corner.
  // bearingX/bearingY already include the SDF buffer.
  vec2 charOffsetPixels = charOffset * fontScale;

  // The character's local X offset from pathPos (which is at character center)
  float charLocalX = -charAdvance * 0.5 * fontScale;

  // Build quad position:
  // - Start at character origin (charLocalX on X axis, 0 on Y axis = baseline)
  // - Add bearing offset to get to atlas region corner
  // - Add quad corner * size to get vertex position
  vec2 quadPos;
  quadPos.x = charLocalX + charOffsetPixels.x + a_quadCorner.x * charSizePixels.x;
  // charOffset.y = -bearingY (negated), so -charOffsetPixels.y = bearingY * fontScale
  // (distance from baseline to atlas region top, positive = upward)
  // Quad corner (0,0) = bottom-left, (1,1) = top-right
  quadPos.y = -charOffsetPixels.y - charSizePixels.y * (1.0 - a_quadCorner.y);

  // Center vertically on the path by offsetting by half the visual text height
  // VERTICAL_CENTER_RATIO is the distance from baseline to visual center as a ratio of atlas font size
  float verticalCenterOffset = VERTICAL_CENTER_RATIO * ATLAS_FONT_SIZE * fontScale;
  quadPos.y -= verticalCenterOffset;

  // -------------------------------------------------------------------------
  // Step 9: Rotate quad to align with tangent
  // -------------------------------------------------------------------------
  // Rotation matrix from the reading direction
  // readingDir = (cos(angle), sin(angle)), so we can build rotation directly
  vec2 readingDir = tangent * readingSign;
  mat2 rotation = mat2(readingDir.x, readingDir.y, -readingDir.y, readingDir.x);

  // Convert pixel offset to WebGL units for rotation
  `).concat(h?"vec2 quadPosWebGL = quadPos * u_correctionRatio / u_sizeRatio; // Scaled mode":"vec2 quadPosWebGL = quadPos * pixelToGraph; // Fixed mode: use pixelToGraph for zoom-independent size",`

  // Rotate around character center on path
  vec2 rotatedOffset = rotation * quadPosWebGL;

  // Final position in graph space (using offset path position for above/below modes)
  vec2 worldPos = offsetPathPos + rotatedOffset;

  // -------------------------------------------------------------------------
  // Step 10: Transform to clip space
  // -------------------------------------------------------------------------
  vec3 clipPos = u_matrix * vec3(worldPos, 1.0);
  gl_Position = vec4(clipPos.xy, 0.0, 1.0);

  // -------------------------------------------------------------------------
  // Step 11: Texture coordinates
  // -------------------------------------------------------------------------
  // Flip Y for texture coordinates (texture Y goes down, quad Y goes up)
  vec2 texCorner = vec2(a_quadCorner.x, 1.0 - a_quadCorner.y);
  v_texCoord = (a_texCoords.xy + texCorner * a_texCoords.zw) / u_atlasSize;

  // -------------------------------------------------------------------------
  // Step 12: Pass color, border color, and alpha modifier
  // -------------------------------------------------------------------------
  v_color = a_color;
  v_color.a *= bias;
`).concat(r?`  v_borderColor = a_borderColor;
  v_borderColor.a *= bias;
  v_positionMode = positionMode;`:"",`
  v_alphaModifier = alphaModifier;

  // -------------------------------------------------------------------------
  // Step 13: Compute edge fade for soft truncation
  // -------------------------------------------------------------------------
  // Convert fade width from pixels to WebGL units
  `).concat(h?"float fadeWidthWebGL = FADE_WIDTH_PIXELS * u_correctionRatio / u_sizeRatio;":"float fadeWidthWebGL = FADE_WIDTH_PIXELS * pixelToGraph;",`

  // Compute the arc position of THIS VERTEX (not just character center)
  // The quad extends from charCenter - advance/2 to charCenter + advance/2
  // a_quadCorner.x is 0 for left edge, 1 for right edge
  float vertexLocalOffset = readingSign * (a_quadCorner.x - 0.5) * charAdvanceWebGL;
  float vertexArcOffset = charCenterOffset + vertexLocalOffset;

  // Compute distance from body edges (positive = inside body, negative = outside)
  float halfBody = bodyLength * 0.5;
  float distFromStart = vertexArcOffset + halfBody;  // Distance from body start edge
  float distFromEnd = halfBody - vertexArcOffset;    // Distance from body end edge
  float distFromEdge = min(distFromStart, distFromEnd);

  // Compute fade: 0 = fully visible (deep inside body), 1 = fully faded (at body edge)
  // Fade goes from 0 (at 2*fadeWidth inside) to 1 (at body edge)
  // This ensures text is fully transparent before reaching extremities
  v_edgeFade = 1.0 - smoothstep(0.0, fadeWidthWebGL * 2.0, distFromEdge);
}
`);return v}function Km(){var e=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{},n=e.hasBorder,t=n===void 0?!1:n,r=`#version 300 es
precision highp float;

in vec2 v_texCoord;
in vec4 v_color;
`.concat(t?"in vec4 v_borderColor;":"",`
in float v_edgeFade;  // 0 = fully visible, 1 = fully faded
in float v_alphaModifier;  // 0-1 based on label visibility ratio
in float v_fontScale;  // Ratio of rendered font size to atlas font size
`).concat(t?"in float v_positionMode;  // Position mode (0=over, 1=above, 2=below, 3=auto)":"",`

uniform sampler2D u_atlas;
uniform float u_gamma;
uniform float u_sdfBuffer;
uniform float u_pixelRatio;
`).concat(t?"uniform float u_borderWidth;  // Border width in SDF units (normalized)":"",`

// Fragment output (single target - picking handled via separate pass)
out vec4 fragColor;

void main() {
  #ifdef PICKING_MODE
    // Edge labels are not pickable - discard all fragments in picking mode
    fragColor = vec4(0.0);
    discard;
  #else
  // SDF stores normalized distance: 0.5 = on edge, >0.5 = inside glyph
  float sdfValue = texture(u_atlas, v_texCoord).a;

  // Edge threshold accounting for SDF buffer padding
  float edge = 1.0 - u_sdfBuffer;

  // Scale gamma inversely with font scale so small labels get a wider AA band
  // (smoother) and large labels get a tighter band (sharper).
  float aaWidth = u_gamma / (u_pixelRatio * v_fontScale);

  // Apply edge fade for soft truncation at body boundaries
  // Also apply visibility-based alpha modifier for short edge labels
  float edgeAlpha = (1.0 - v_edgeFade) * v_alphaModifier;

`).concat(t?`  // Fill alpha: fully opaque inside the glyph
  float fillAlpha = smoothstep(edge - aaWidth, edge + aaWidth, sdfValue);

  // Only apply border for "over" position mode (v_positionMode == 0.0)
  // Labels positioned above/below/auto don't overlap the edge line and don't need borders
  if (v_positionMode < 0.5) {
    // Border rendering: compute alpha for both fill and border regions
    // Border extends from (edge - borderWidth) to edge
    float borderEdge = edge - u_borderWidth;

    // Border alpha: opaque in the border region (between borderEdge and edge)
    float borderAlpha = smoothstep(borderEdge - aaWidth, borderEdge + aaWidth, sdfValue);

    // Composite: fill on top of border
    // Border is visible where borderAlpha > 0 but fillAlpha < 1
    vec3 borderColorPremult = v_borderColor.rgb * v_borderColor.a * borderAlpha * edgeAlpha;
    vec3 fillColorPremult = v_color.rgb * v_color.a * fillAlpha * edgeAlpha;

    // Blend fill over border (fill replaces border where fill is opaque)
    float finalBorderAlpha = borderAlpha * (1.0 - fillAlpha);
    vec3 finalColor = fillColorPremult + v_borderColor.rgb * v_borderColor.a * finalBorderAlpha * edgeAlpha;
    float finalAlpha = (v_color.a * fillAlpha + v_borderColor.a * finalBorderAlpha) * edgeAlpha;

    fragColor = vec4(finalColor, finalAlpha);
  } else {
    // No border for above/below/auto positions - simple text rendering
    float finalAlpha = v_color.a * fillAlpha * edgeAlpha;
    fragColor = vec4(v_color.rgb * finalAlpha, finalAlpha);
  }`:`  // Smooth transition from transparent to opaque at glyph edge
  float alpha = smoothstep(edge - aaWidth, edge + aaWidth, sdfValue);

  // Premultiplied alpha output
  float finalAlpha = v_color.a * alpha * edgeAlpha;
  fragColor = vec4(v_color.rgb * finalAlpha, finalAlpha);`,`
  #endif
}
`);return r}function Zm(e){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:!1,t=arguments.length>2&&arguments[2]!==void 0?arguments[2]:"fixed",r=["u_matrix","u_sizeRatio","u_correctionRatio","u_pixelRatio","u_cameraAngle","u_sdfBufferPixels","u_resolution","u_atlasSize","u_atlas","u_gamma","u_sdfBuffer","u_nodeDataTexture","u_nodeDataTextureWidth","u_edgeDataTexture","u_edgeDataTextureWidth","u_edgeFrameTexture","u_edgeFrameTextureWidth","u_edgeAttributeTexture","u_edgeAttributeTextureWidth","u_edgeAttributeTexelsPerEdge"];t==="scaled"&&r.push("u_zoomSizeRatio"),n&&r.push("u_borderWidth");var a=U(e),i;try{for(a.s();!(i=a.n()).done;){var o=i.value,s=U(o.uniforms),l;try{for(s.s();!(l=s.n()).done;){var u=l.value;r.includes(u.name)||r.push(u.name)}}catch(d){s.e(d)}finally{s.f()}}}catch(d){a.e(d)}finally{a.f()}return r}function ud(e){var n=e.hasBorder,t=n===void 0?!1:n,r=e.fontSizeMode,a=r===void 0?"fixed":r;return{vertexShader:Ym(e),fragmentShader:Km({hasBorder:t}),uniforms:Zm(e.paths,t,a)}}var Qm=new Map;function Jm(e){switch(e){case"over":return 0;case"above":return 1;case"below":return 2;case"auto":return 3;default:return 0}}function dd(e,n,t,r){var a=r.color,i=r.margin,o=r.textBorder,s=ld(r),l=s.paths,u=s.fontSizeMode,d=s.minVisibilityThreshold,c=s.fullVisibilityThreshold,h=s.keepUpright,g=!!o,p=ud({paths:l,hasBorder:g,fontSizeMode:u,minVisibilityThreshold:d,fullVisibilityThreshold:c,keepUpright:h}),m=(function(b){function v(x,y,_){var S;ae(this,v),S=ye(this,v,[x,y,_]),C(S,"atlasTexture",null),C(S,"atlasNeedsUpdate",!1),C(S,"refreshTimeout",null),C(S,"labelGlyphCache",new Map),C(S,"edgeAttributeTexture",null);var T=Bt();if(S.attributeLayout=tt([].concat(Z(l),[T])),S.attrDescriptors=Ya([].concat(Z(l),[T]),S.attributeLayout),S.edgeAttributeTexture=new Xa(x,S.attributeLayout),S.packedAttributeData=new Float32Array(S.attributeLayout.floatsPerItem),S.atlasManager=new sn,S.gamma=.025,S.sdfBuffer=ft.cutoff,S.atlasTexture=x.createTexture(),!S.atlasTexture)throw new Error("EdgeLabelProgram: failed to create atlas texture");x.bindTexture(x.TEXTURE_2D,S.atlasTexture),x.texParameteri(x.TEXTURE_2D,x.TEXTURE_WRAP_S,x.CLAMP_TO_EDGE),x.texParameteri(x.TEXTURE_2D,x.TEXTURE_WRAP_T,x.CLAMP_TO_EDGE),x.texParameteri(x.TEXTURE_2D,x.TEXTURE_MIN_FILTER,x.LINEAR),x.texParameteri(x.TEXTURE_2D,x.TEXTURE_MAG_FILTER,x.LINEAR),x.bindTexture(x.TEXTURE_2D,null),S.atlasManager.on(sn.ATLAS_UPDATED_EVENT,function(){S.atlasNeedsUpdate=!0,S.refreshTimeout!==null&&clearTimeout(S.refreshTimeout),S.refreshTimeout=setTimeout(function(){S.refreshTimeout=null,S.renderer.refresh()},0)});var A={family:"sans-serif",weight:"normal",style:"normal"};return S.defaultFontKey=S.atlasManager.registerFont(A),S}return be(v,b),ie(v,[{key:"getDefinition",value:function(){var y=WebGL2RenderingContext,_=y.FLOAT,S=y.UNSIGNED_BYTE,T=y.TRIANGLE_STRIP,A=new Set,w=[],E=U(l),R;try{for(E.s();!(R=E.n()).done;){var L=R.value,k=U(L.attributes),P;try{for(k.s();!(P=k.n()).done;){var D=P.value,I=D.name.startsWith("a_")?D.name:"a_".concat(D.name);A.has(I)||(A.add(I),w.push({name:I,size:D.size,type:D.type}))}}catch(G){k.e(G)}finally{k.f()}}}catch(G){E.e(G)}finally{E.f()}return{VERTICES:4,VERTEX_SHADER_SOURCE:p.vertexShader,FRAGMENT_SHADER_SOURCE:p.fragmentShader,METHOD:T,UNIFORMS:p.uniforms,ATTRIBUTES:[{name:"a_edgeIndex",size:1,type:_},{name:"a_edgeAttrIndex",size:1,type:_},{name:"a_baseFontSize",size:1,type:_},{name:"a_charMetrics",size:4,type:_},{name:"a_charDims",size:4,type:_},{name:"a_texCoords",size:4,type:_},{name:"a_labelParams",size:2,type:_},{name:"a_color",size:4,type:S,normalized:!0}].concat(Z(g?[{name:"a_borderColor",size:4,type:S,normalized:!0}]:[]),Z(w.filter(function(G){return!["a_curvature","curvature"].includes(G.name)}))),CONSTANT_ATTRIBUTES:[{name:"a_quadCorner",size:2,type:_}],CONSTANT_DATA:[[0,0],[1,0],[0,1],[1,1]]}}},{key:"prepareLabelGlyphs",value:function(y,_){if(_.hidden||!_.text){this.labelGlyphCache.delete(y);return}var S=_.text,T=_.fontKey||this.defaultFontKey;this.atlasManager.ensureGlyphs(S,T);var A=[],w=[],E=0,R=U(S),L;try{for(R.s();!(L=R.n()).done;){var k=L.value,P=k.codePointAt(0);if(P===void 0){A.push(void 0),w.push(E);continue}var D=this.atlasManager.getGlyph(P,T);A.push(D),w.push(E),D&&(E+=D.advance)}}catch(I){R.e(I)}finally{R.f()}this.labelGlyphCache.set(y,{glyphs:A,xOffsets:w,totalWidth:E})}},{key:"processCharacter",value:function(y,_,S,T){var A,w,E,R=this.floats,L=this.STRIDE,k=y*L,P=this.labelGlyphCache.get(_.parentKey);if(!P||!P.glyphs[T]){for(var D=0;D<L;D++)R[k+D]=0;return}var I=P.glyphs[T],G=P.xOffsets[T],z=v.labelColor,F=z&&re(z)==="object"&&"color"in z&&z.color?z.color:_.color,M=$e(F),W=k;R[W++]=_.edgeIndex,R[W++]=(A=(w=this.edgeAttributeTexture)===null||w===void 0?void 0:w.getIndex(_.parentKey))!==null&&A!==void 0?A:0,R[W++]=_.size,R[W++]=G,R[W++]=I.advance,R[W++]=P.totalWidth,R[W++]=Jm(_.position),R[W++]=I.atlasWidth,R[W++]=I.atlasHeight,R[W++]=I.bearingX,R[W++]=-I.bearingY,R[W++]=I.atlasX,R[W++]=I.atlasY,R[W++]=I.atlasWidth,R[W++]=I.atlasHeight;var X=(E=v.labelMargin)!==null&&E!==void 0?E:_.margin;if(R[W++]=X,R[W++]=0,R[W++]=M,g&&o){var q;typeof o.color=="string"?q=o.color:q=o.color.color||"#ffffff",R[W++]=$e(q)}var te=new Set,Q=U(l),ee;try{for(Q.s();!(ee=Q.n()).done;){var ot=ee.value,Oe=U(ot.attributes),Et;try{for(Oe.s();!(Et=Oe.n()).done;){var wn=Et.value,sr=wn.name.startsWith("a_")?wn.name.slice(2):wn.name;if(sr!=="curvature"&&!te.has(sr)){te.add(sr);for(var lr=0;lr<wn.size;lr++)R[W++]=0}}}catch(ur){Oe.e(ur)}finally{Oe.f()}}}catch(ur){Q.e(ur)}finally{Q.f()}}},{key:"processEdgeLabel",value:function(y,_,S){if(this.prepareLabelGlyphs(y,S),this.edgeAttributeTexture&&!S.hidden&&S.text){this.edgeAttributeTexture.allocate(y);var T=this.packedAttributeData;Ka(this.attrDescriptors,S.edgeAttributes,T,"",Qm,0),this.edgeAttributeTexture.updateAllAttributes(y,T)}return Ce(v,"processLabel",this,3)([y,_,S])}},{key:"updateAtlasTexture",value:function(){if(this.atlasNeedsUpdate){var y=this.normalProgram.gl,_=this.atlasManager.getTextures();if(_.length!==0){var S=_[0];y.bindTexture(y.TEXTURE_2D,this.atlasTexture),y.texImage2D(y.TEXTURE_2D,0,y.RGBA,S.width,S.height,0,y.RGBA,y.UNSIGNED_BYTE,S.data),y.bindTexture(y.TEXTURE_2D,null),this.atlasNeedsUpdate=!1}}}},{key:"setUniforms",value:function(y,_){var S=_.gl,T=_.uniformLocations,A=this.atlasManager.getTextures(),w=A.length>0?[A[0].width,A[0].height]:[1,1];if(S.uniformMatrix3fv(T.u_matrix,!1,y.matrix),S.uniform1f(T.u_sizeRatio,y.sizeRatio),S.uniform1f(T.u_correctionRatio,y.correctionRatio),S.uniform1f(T.u_pixelRatio,y.pixelRatio),S.uniform1f(T.u_cameraAngle,y.cameraAngle),S.uniform1f(T.u_sdfBufferPixels,ft.buffer),S.uniform2f(T.u_resolution,y.width,y.height),S.uniform2f(T.u_atlasSize,w[0],w[1]),S.uniform1f(T.u_gamma,this.gamma),S.uniform1f(T.u_sdfBuffer,this.sdfBuffer),S.activeTexture(S.TEXTURE0),S.bindTexture(S.TEXTURE_2D,this.atlasTexture),S.uniform1i(T.u_atlas,0),T.u_nodeDataTexture!==void 0&&S.uniform1i(T.u_nodeDataTexture,y.nodeDataTextureUnit),T.u_nodeDataTextureWidth!==void 0&&S.uniform1i(T.u_nodeDataTextureWidth,y.nodeDataTextureWidth),T.u_edgeDataTexture!==void 0&&S.uniform1i(T.u_edgeDataTexture,y.edgeDataTextureUnit),T.u_edgeDataTextureWidth!==void 0&&S.uniform1i(T.u_edgeDataTextureWidth,y.edgeDataTextureWidth),T.u_edgeFrameTexture!==void 0&&S.uniform1i(T.u_edgeFrameTexture,y.edgeFrameTextureUnit),T.u_edgeFrameTextureWidth!==void 0&&S.uniform1i(T.u_edgeFrameTextureWidth,y.edgeFrameTextureWidth),g&&o&&T.u_borderWidth!==void 0){var E=o.width/ft.buffer*this.sdfBuffer;S.uniform1f(T.u_borderWidth,E)}if(this.edgeAttributeTexture&&T.u_edgeAttributeTexture!==void 0&&(this.edgeAttributeTexture.bind($t),S.uniform1i(T.u_edgeAttributeTexture,$t),S.uniform1i(T.u_edgeAttributeTextureWidth,this.edgeAttributeTexture.getTextureWidth()),S.uniform1i(T.u_edgeAttributeTexelsPerEdge,this.edgeAttributeTexture.getTexelsPerItem())),u==="scaled"&&T.u_zoomSizeRatio!==void 0){var R=this.renderer.getSetting("zoomToSizeRatioFunction"),L=1/R(y.zoomRatio);S.uniform1f(T.u_zoomSizeRatio,L)}}},{key:"renderProgram",value:function(y,_){this.updateAtlasTexture(),this.atlasManager.hasPendingGlyphs()&&(this.atlasManager.flush(),this.updateAtlasTexture()),this.edgeAttributeTexture&&this.edgeAttributeTexture.upload(),Ce(v,"renderProgram",this,3)([y,_])}},{key:"registerFont",value:function(y){var _=arguments.length>1&&arguments[1]!==void 0?arguments[1]:"normal",S=arguments.length>2&&arguments[2]!==void 0?arguments[2]:"normal";return this.atlasManager.registerFont({family:y,weight:_,style:S})}},{key:"getAtlasManager",value:function(){return this.atlasManager}},{key:"ensureGlyphsReady",value:function(y,_){var S=_||this.defaultFontKey,T=U(y),A;try{for(T.s();!(A=T.n()).done;){var w=A.value;this.atlasManager.ensureGlyphs(w,S)}}catch(E){T.e(E)}finally{T.f()}this.atlasManager.flush()}},{key:"measureLabelAtlasWidth",value:function(y,_){var S=_||this.defaultFontKey;this.atlasManager.ensureGlyphs(y,S),this.atlasManager.hasPendingGlyphs()&&this.atlasManager.flush();var T=0,A=U(y),w;try{for(A.s();!(w=A.n()).done;){var E=w.value,R=E.codePointAt(0);if(R!==void 0){var L=this.atlasManager.getGlyph(R,S);L&&(T+=L.advance)}}}catch(k){A.e(k)}finally{A.f()}return T}},{key:"measureLabel",value:function(y,_,S){var T=this.measureLabelAtlasWidth(y,S),A=_/ft.fontSize;return{width:T*A,height:_,textHeight:_}}},{key:"kill",value:function(){var y=this.normalProgram.gl;this.refreshTimeout!==null&&(clearTimeout(this.refreshTimeout),this.refreshTimeout=null),this.atlasTexture&&(y.deleteTexture(this.atlasTexture),this.atlasTexture=null),this.edgeAttributeTexture&&(this.edgeAttributeTexture.kill(),this.edgeAttributeTexture=null),this.atlasManager.destroy(),this.labelGlyphCache.clear(),Ce(v,"kill",this,3)([])}}])})(No);return C(m,"labelColor",a),C(m,"labelMargin",i),new m(e,n,t)}function ev(){var e=`
// No extremity - always returns positive (outside)
float extremity_none(vec2 uv, float lengthRatio, float widthRatio) {
  return 1.0;
}
`;return{name:"none",glsl:e,length:0,widthFactor:1,margin:0,uniforms:[],attributes:[]}}function Wo(e,n,t,r,a,i,o){var s,l,u=nd(r),d=u.paths,c=u.layers,h=u.defaultHead,g=u.defaultTail,p=[ev()].concat(Z(u.extremities)),m={},b={};d.forEach(function(k,P){return m[k.name]=P}),p.forEach(function(k,P){return b[k.name]=P});var v=(s=b[h])!==null&&s!==void 0?s:0,x=(l=b[g])!==null&&l!==void 0?l:0,y=null,_=tt([].concat(Z(d),Z(c))),S=(function(k){function P(D,I,G){var z;ae(this,P),y||(y=Co({paths:d,extremities:p,layers:c,antialias:a})),z=ye(this,P,[D,I,G]),C(z,"layerLifecycles",new Map),C(z,"needsShaderRegeneration",!1),C(z,"edgeAttributeTexture",null),C(z,"layout",_),C(z,"attrDescriptors",[]),C(z,"lifecycleIndexOffset",d.length),z._pickingBuffer=I,z.edgeAttributeTexture=new Xa(D,z.layout),z.packedAttributeData=new Float32Array(z.layout.floatsPerItem),c.forEach(function(M,W){if(M.lifecycle){var X={gl:D,renderer:{refresh:function(){return G.refresh()}},getUniformLocation:function(te){return D.getUniformLocation(z.normalProgram.program,te)},requestShaderRegeneration:function(){z.needsShaderRegeneration=!0},requestRefresh:function(){G.refresh()}};z.layerLifecycles.set(W,M.lifecycle(X))}}),z.layerLifecycles.forEach(function(M){var W;return(W=M.init)===null||W===void 0?void 0:W.call(M)});var F=new Map;return z.layerLifecycles.forEach(function(M,W){M.getAttributeData&&F.set(d.length+W,M)}),z.attrDescriptors=Ya([].concat(Z(d),Z(c)),z.layout,F),z}return be(P,k),ie(P,[{key:"getAttributeTexture",value:function(){return this.edgeAttributeTexture}},{key:"resolveEdgeIds",value:function(I,G,z){var F=I,M=0,W=v,X=x,q=G?F.selfLoopPath:z&&F.parallelPath?F.parallelPath:F.path;q&&m[q]!==void 0&&(M=m[q]),F.head&&F.head!=="none"&&b[F.head]!==void 0&&(W=b[F.head]),F.tail&&F.tail!=="none"&&b[F.tail]!==void 0&&(X=b[F.tail]);var te=p[W],Q=p[X];return{pathId:M,headId:W,tailId:X,headLengthRatio:lt(te.length)?0:te.length,tailLengthRatio:lt(Q.length)?0:Q.length}}},{key:"getDefinition",value:function(){var I=WebGL2RenderingContext,G=I.TRIANGLE_STRIP,z=G,F=y;return{VERTICES:F.verticesPerEdge,VERTEX_SHADER_SOURCE:F.vertexShader,FRAGMENT_SHADER_SOURCE:F.fragmentShader,METHOD:z,UNIFORMS:F.uniforms,ATTRIBUTES:F.attributes,CONSTANT_ATTRIBUTES:F.constantAttributes,CONSTANT_DATA:F.constantData}}},{key:"maybeRegenerateShaders",value:function(){var I=this;if(this.needsShaderRegeneration){this.needsShaderRegeneration=!1;var G=c.map(function(te,Q){var ee=I.layerLifecycles.get(Q);return ee!=null&&ee.regenerate?ee.regenerate():te});y=Co({paths:d,extremities:p,layers:G,antialias:this.renderer.getSetting("antialiasEdges")});var z=this.normalProgram.gl,F=this.normalProgram,M=F.program,W=F.buffer,X=F.vertexShader,q=F.fragmentShader;z.deleteProgram(M),z.deleteBuffer(W),z.deleteShader(X),z.deleteShader(q),this.normalProgram=this.getProgramInfo("normal",z,y.vertexShader,y.fragmentShader,this._pickingBuffer)}}},{key:"process",value:function(I,G,z,F,M,W){var X=G*this.STRIDE;if(M.visibility==="hidden"||z.visibility==="hidden"||F.visibility==="hidden"){for(var q=X+this.STRIDE;X<q;X++)this.floats[X]=0;this.floats[G*this.STRIDE]=zu;return}this.processVisibleItem(nn(I),X,z,F,M,W)}},{key:"processVisibleItem",value:function(I,G,z,F,M,W){var X,q=this.floats,te=this.ints;q[G++]=W,q[G++]=$e(M.color),te[G++]=I,q[G++]=(X=M.opacity)!==null&&X!==void 0?X:1;var Q=this.packedAttributeData;Ka(this.attrDescriptors,M,Q,M.color,this.layerLifecycles,this.lifecycleIndexOffset),this.edgeAttributeTexture.updateAllAttributesAtRow(W,Q)}},{key:"setUniforms",value:function(I,G){var z=this,F=G.gl,M=G.uniformLocations;M.u_matrix&&F.uniformMatrix3fv(M.u_matrix,!1,I.matrix),M.u_sizeRatio&&F.uniform1f(M.u_sizeRatio,I.sizeRatio),M.u_correctionRatio&&F.uniform1f(M.u_correctionRatio,I.correctionRatio),M.u_zoomRatio&&F.uniform1f(M.u_zoomRatio,I.zoomRatio),M.u_pixelRatio&&F.uniform1f(M.u_pixelRatio,I.pixelRatio),M.u_cameraAngle&&F.uniform1f(M.u_cameraAngle,I.cameraAngle),M.u_feather&&F.uniform1f(M.u_feather,I.antiAliasingFeather),M.u_minEdgeThickness&&F.uniform1f(M.u_minEdgeThickness,I.minEdgeThickness),M.u_pickingPadding&&F.uniform1f(M.u_pickingPadding,I.edgePickingPadding),M.u_nodeDataTexture&&F.uniform1i(M.u_nodeDataTexture,I.nodeDataTextureUnit),M.u_nodeDataTextureWidth&&F.uniform1i(M.u_nodeDataTextureWidth,I.nodeDataTextureWidth),M.u_edgeDataTexture&&F.uniform1i(M.u_edgeDataTexture,I.edgeDataTextureUnit),M.u_edgeDataTextureWidth&&F.uniform1i(M.u_edgeDataTextureWidth,I.edgeDataTextureWidth),M.u_edgeFrameTexture&&F.uniform1i(M.u_edgeFrameTexture,I.edgeFrameTextureUnit),M.u_edgeFrameTextureWidth&&F.uniform1i(M.u_edgeFrameTextureWidth,I.edgeFrameTextureWidth),this.edgeAttributeTexture&&this.layout.floatsPerItem>0&&(this.edgeAttributeTexture.bind($t),M.u_edgeAttributeTexture&&F.uniform1i(M.u_edgeAttributeTexture,$t),M.u_edgeAttributeTextureWidth&&F.uniform1i(M.u_edgeAttributeTextureWidth,this.edgeAttributeTexture.getTextureWidth()),M.u_edgeAttributeTexelsPerEdge&&F.uniform1i(M.u_edgeAttributeTexelsPerEdge,this.edgeAttributeTexture.getTexelsPerItem()));var W=new Set;d.forEach(function(X){X.uniforms.forEach(function(q){W.has(q.name)||(W.add(q.name),z.setTypedUniform(q,G))})}),p.forEach(function(X){X.uniforms.forEach(function(q){W.has(q.name)||(W.add(q.name),z.setTypedUniform(q,G))})}),c.forEach(function(X){X.uniforms.forEach(function(q){W.has(q.name)||(W.add(q.name),z.setTypedUniform(q,G))})})}},{key:"render",value:function(I,G,z){this.maybeRegenerateShaders(),Ce(P,"render",this,3)([I,G,z])}},{key:"renderProgram",value:function(I,G){this.layerLifecycles.forEach(function(z){var F;return(F=z.beforeRender)===null||F===void 0?void 0:F.call(z)}),Ce(P,"renderProgram",this,3)([I,G])}},{key:"uploadAttributeTexture",value:function(){this.edgeAttributeTexture&&this.layout.floatsPerItem>0&&this.edgeAttributeTexture.upload()}},{key:"kill",value:function(){this.layerLifecycles.forEach(function(I){var G;return(G=I.kill)===null||G===void 0?void 0:G.call(I)}),this.edgeAttributeTexture&&(this.edgeAttributeTexture.kill(),this.edgeAttributeTexture=null),Ce(P,"kill",this,3)([])}}])})(jt),T=p[v],A=p[x],w=H({paths:d,headLengthRatio:lt(T.length)?0:T.length,tailLengthRatio:lt(A.length)?0:A.length},r.label),E=ld(w),R=function(){return{labelProgram:dd(e,null,t,w),labelBackgroundProgram:sd(e,n,t,{shaderConfig:E})}},L=new ad(e,{paths:d,extremities:p,layers:c,nodeShapes:i,nodeLayers:o});return{edgeProgram:new S(e,null,t),createLabelPrograms:R,framePass:L}}function tv(e){return re(e)==="object"&&"uniforms"in e&&Array.isArray(e.uniforms)}function nv(e){return re(e)==="object"&&"uniforms"in e&&"attributes"in e&&"glsl"in e}function rv(e){return re(e)==="object"&&"uniforms"in e&&"attributes"in e&&"segments"in e}function av(e){return re(e)==="object"&&"uniforms"in e&&"attributes"in e&&"length"in e}function iv(e){return re(e)==="object"&&"uniforms"in e&&"attributes"in e&&"glsl"in e}function ov(e){return re(e)==="object"&&"glsl"in e&&"name"in e&&!("uniforms"in e)}function sv(e){return re(e)==="object"&&"glsl"in e&&"name"in e&&!("uniforms"in e)}function lv(e){return re(e)==="object"&&"glsl"in e&&"name"in e&&!("uniforms"in e)}function uv(e){if(tv(e))return e;if(ov(e))return{name:e.name,glsl:e.glsl,inradiusFactor:e.inradiusFactor,uniforms:[]};throw new Error("Invalid node shape specification: ".concat(JSON.stringify(e)))}function dv(e){if(nv(e))return e;if(Yl(e))return{name:e.name,glsl:e.glsl,uniforms:[],attributes:[]};throw new Error("Invalid node layer specification: ".concat(JSON.stringify(e)))}function cv(e){if(rv(e))return e;if(sv(e))return{name:e.name,glsl:e.glsl,segments:e.segments,uniforms:[],attributes:[]};throw new Error("Invalid edge path specification: ".concat(JSON.stringify(e)))}function hv(e){if(iv(e))return e;if(Kl(e))return{name:e.name,glsl:e.glsl,uniforms:[],attributes:[]};throw new Error("Invalid edge layer specification: ".concat(JSON.stringify(e)))}function fv(e){if(av(e))return e;if(lv(e))return{name:e.name,glsl:e.glsl,length:e.length,widthFactor:e.widthFactor,margin:0,uniforms:[],attributes:[]};throw new Error("Invalid edge extremity specification: ".concat(JSON.stringify(e)))}function cd(e){var n,t,r=(n=e?.shapes)!==null&&n!==void 0?n:Sr.shapes,a=(t=e?.layers)!==null&&t!==void 0?t:Sr.layers,i=r.map(uv),o=a.map(dv);if(i.length===0)throw new Error("At least one node shape must be specified.");if(o.length===0)throw new Error("At least one node layer must be specified.");return{shapes:i,layers:o}}function gv(e){var n,t,r,a=(n=e?.paths)!==null&&n!==void 0?n:In.paths,i=(t=e?.extremities)!==null&&t!==void 0?t:In.extremities,o=(r=e?.layers)!==null&&r!==void 0?r:In.layers,s=a.map(cv),l=i.map(fv).filter(function(d){return d!==null}),u=o.map(hv);if(s.length===0)throw new Error("At least one edge path must be specified.");if(u.length===0)throw new Error("At least one edge layer must be specified.");return{paths:s,extremities:l,layers:u}}function hd(e,n){var t={},r=U(e),a;try{for(r.s();!(a=r.n()).done;){var i=a.value;i.variables&&Object.assign(t,i.variables)}}catch(o){r.e(o)}finally{r.f()}return Object.assign(t,n||{}),t}function fd(e,n,t,r,a){var i=cd(r),o=i.shapes,s=i.layers,l=hd(o,r?.variables),u=Go(e,n,t,{shapes:o,layers:s,label:r?.label,backdrop:r?.backdrop,labelAttachments:r?.labelAttachments},a);return H(H({},u),{},{variables:l})}function gd(e,n,t,r,a,i){var o=gv(r),s=o.paths,l=o.extremities,u=o.layers,d=cd(i),c=d.shapes,h=d.layers,g=hd(s,r?.variables),p=Wo(e,n,t,{paths:s,extremities:l,layers:u,defaultHead:r?.defaultHead,defaultTail:r?.defaultTail,label:r?.label},a,c,h);return H(H({},p),{},{variables:g,paths:s})}var pv=2;function pd(e,n,t){var r=arguments.length>3&&arguments[3]!==void 0?arguments[3]:pv,a=n.canvas,i=a.width,o=a.height,s=t.x,l=t.y,u=t.rowHeight,d=t.maxRowWidth,c={},h=[],g=U(e),p;try{for(g.s();!(p=g.n()).done;){var m=p.value,b=m.width+r,v=m.height+r;if(b>i||v>o||s+b>i&&l+u+v>o){h.push(m);continue}s+b>i&&(d=Math.max(d,s),s=0,l+=u,u=v),m.draw(n,s,l),c[m.key]={x:s,y:l,width:m.width,height:m.height},s+=b,u=Math.max(u,v)}}catch(x){g.e(x)}finally{g.f()}return d=Math.max(d,s),{atlas:c,cursor:{x:s,y:l,rowHeight:u,maxRowWidth:d},remaining:h}}function He(e,n,t,r){var a=Object.defineProperty;try{a({},"",{})}catch{a=0}He=function(i,o,s,l){function u(d,c){He(i,d,function(h){return this._invoke(d,c,h)})}o?a?a(i,o,{value:s,enumerable:!l,configurable:!l,writable:!l}):i[o]=s:(u("next",0),u("throw",1),u("return",2))},He(e,n,t,r)}function je(){var e,n,t=typeof Symbol=="function"?Symbol:{},r=t.iterator||"@@iterator",a=t.toStringTag||"@@toStringTag";function i(g,p,m,b){var v=p&&p.prototype instanceof s?p:s,x=Object.create(v.prototype);return He(x,"_invoke",(function(y,_,S){var T,A,w,E=0,R=S||[],L=!1,k={p:0,n:0,v:e,a:P,f:P.bind(e,4),d:function(D,I){return T=D,A=0,w=e,k.n=I,o}};function P(D,I){for(A=D,w=I,n=0;!L&&E&&!G&&n<R.length;n++){var G,z=R[n],F=k.p,M=z[2];D>3?(G=M===I)&&(w=z[(A=z[4])?5:(A=3,3)],z[4]=z[5]=e):z[0]<=F&&((G=D<2&&F<z[1])?(A=0,k.v=I,k.n=z[1]):F<M&&(G=D<3||z[0]>I||I>M)&&(z[4]=D,z[5]=I,k.n=M,A=0))}if(G||D>1)return o;throw L=!0,I}return function(D,I,G){if(E>1)throw TypeError("Generator is already running");for(L&&I===1&&P(I,G),A=I,w=G;(n=A<2?e:w)||!L;){T||(A?A<3?(A>1&&(k.n=-1),P(A,w)):k.n=w:k.v=w);try{if(E=2,T){if(A||(D="next"),n=T[D]){if(!(n=n.call(T,w)))throw TypeError("iterator result is not an object");if(!n.done)return n;w=n.value,A<2&&(A=0)}else A===1&&(n=T.return)&&n.call(T),A<2&&(w=TypeError("The iterator does not provide a '"+D+"' method"),A=1);T=e}else if((n=(L=k.n<0)?w:y.call(_,k))!==o)break}catch(z){T=e,A=1,w=z}finally{E=1}}return{value:n,done:L}}})(g,m,b),!0),x}var o={};function s(){}function l(){}function u(){}n=Object.getPrototypeOf;var d=[][r]?n(n([][r]())):(He(n={},r,function(){return this}),n),c=u.prototype=s.prototype=Object.create(d);function h(g){return Object.setPrototypeOf?Object.setPrototypeOf(g,u):(g.__proto__=u,He(g,a,"GeneratorFunction")),g.prototype=Object.create(c),g}return l.prototype=u,He(c,"constructor",u),He(u,"constructor",l),l.displayName="GeneratorFunction",He(u,a,"GeneratorFunction"),He(c),He(c,a,"Generator"),He(c,r,function(){return this}),He(c,"toString",function(){return"[object Generator]"}),(je=function(){return{w:i,m:h}})()}function md(e,n,t,r,a,i,o){try{var s=e[i](o),l=s.value}catch(u){return void t(u)}s.done?n(l):Promise.resolve(l).then(r,a)}function $n(e){return function(){var n=this,t=arguments;return new Promise(function(r,a){var i=e.apply(n,t);function o(l){md(i,r,a,o,s,"next",l)}function s(l){md(i,r,a,o,s,"throw",l)}o(void 0)})}}var Qa=new Map,vd=!1;function mv(e){return new Promise(function(n,t){var r=new FileReader;r.onload=function(){return n(r.result)},r.onerror=t,r.readAsDataURL(e)})}function vv(e){if(!Qa.has(e)){var n=fetch(e).then(function(t){return t.blob()}).then(mv).catch(function(){return Qa.delete(e),null});Qa.set(e,n)}return Qa.get(e)}function yv(e){return Uo.apply(this,arguments)}function Uo(){return Uo=$n(je().m(function e(n){var t,r,a;return je().w(function(i){for(;;)switch(i.n){case 0:return t=document.createElement("div"),t.innerHTML=n,r=Array.from(t.querySelectorAll("img[src]")),a=r.filter(function(o){return!o.getAttribute("src").startsWith("data:")}),i.n=1,Promise.all(a.map((function(){var o=$n(je().m(function s(l){var u;return je().w(function(d){for(;;)switch(d.n){case 0:return d.n=1,vv(l.getAttribute("src"));case 1:u=d.v,u&&l.setAttribute("src",u);case 2:return d.a(2)}},s)}));return function(s){return o.apply(this,arguments)}})()));case 1:return i.a(2,t.innerHTML)}},e)})),Uo.apply(this,arguments)}function yd(e){return $o.apply(this,arguments)}function $o(){return $o=$n(je().m(function e(n){var t,r,a,i,o,s,l,u,d,c,h,g,p,m=arguments;return je().w(function(b){for(;;)switch(b.n){case 0:if(t=m.length>1&&m[1]!==void 0?m[1]:1,r=n instanceof SVGElement?new XMLSerializer().serializeToString(n):n,a=new DOMParser,i=a.parseFromString(r,"image/svg+xml"),o=i.querySelector("svg"),o){b.n=1;break}return b.a(2,null);case 1:if(s=parseFloat(o.getAttribute("width")||""),l=parseFloat(o.getAttribute("height")||""),(!(s>0)||!(l>0))&&(u=o.getAttribute("viewBox"),u&&(d=u.trim().split(/[\s,]+/),s=parseFloat(d[2]),l=parseFloat(d[3]))),!(!(s>0)||!(l>0))){b.n=2;break}return console.warn("Sigma: SVG label attachment has no parseable dimensions \u2014 skipped."),b.a(2,null);case 2:return c=Math.ceil(s*t),h=Math.ceil(l*t),g=new Blob([r],{type:"image/svg+xml"}),p=URL.createObjectURL(g),b.a(2,new Promise(function(v){var x=new Image;x.onload=function(){var y=document.createElement("canvas");y.width=c,y.height=h,y.getContext("2d").drawImage(x,0,0,c,h),URL.revokeObjectURL(p);try{y.getContext("2d").getImageData(0,0,1,1)}catch(_){if(_ instanceof DOMException&&_.name==="SecurityError"){vd||(vd=!0,console.warn('Sigma: A label attachment was skipped because the rendered canvas is tainted. SVG with <foreignObject> (used by the "html" attachment type) is blocked in Chromium and Safari. Use type: "canvas" with Canvas 2D rendering instead.')),v(null);return}throw _}v(y)},x.onerror=function(){URL.revokeObjectURL(p),v(null)},x.src=p}))}},e)})),$o.apply(this,arguments)}function bv(e,n){var t=document.createElement("div");t.style.cssText="position:fixed;left:-99999px;top:0;visibility:hidden;width:max-content;height:max-content",t.innerHTML=(n?"<style>".concat(n,"</style>"):"")+e,document.body.appendChild(t);var r=t.getBoundingClientRect(),a=r.width,i=r.height;return document.body.removeChild(t),{width:Math.ceil(a),height:Math.ceil(i)}}function xv(e,n,t,r){return Ho.apply(this,arguments)}function Ho(){return Ho=$n(je().m(function e(n,t,r,a){var i,o,s,l,u,d,c,h,g=arguments;return je().w(function(p){for(;;)switch(p.n){case 0:return i=g.length>4&&g[4]!==void 0?g[4]:1,o=n instanceof HTMLElement?n.outerHTML:n,p.n=1,yv(o);case 1:return s=p.v,(r==null||a==null)&&(l=bv(s,t),r=r??l.width,a=a??l.height),u=Math.ceil(r*i),d=Math.ceil(a*i),c=t?"<style>".concat(t,"</style>"):"",h='<svg xmlns="http://www.w3.org/2000/svg" '+'width="'.concat(u,'" height="').concat(d,'" viewBox="0 0 ').concat(r," ").concat(a,'">')+'<foreignObject width="'.concat(r,'" height="').concat(a,'">')+'<body xmlns="http://www.w3.org/1999/xhtml" style="margin:0;padding:0">'.concat(c).concat(s,"</body>")+"</foreignObject></svg>",p.a(2,yd(h,1))}},e)})),Ho.apply(this,arguments)}function Sv(e){return jo.apply(this,arguments)}function jo(){return jo=$n(je().m(function e(n){var t,r=arguments,a;return je().w(function(i){for(;;)switch(i.n){case 0:t=r.length>1&&r[1]!==void 0?r[1]:1,a=n.type,i.n=a==="canvas"?1:a==="svg"?2:a==="html"?3:4;break;case 1:return i.a(2,n.canvas);case 2:return i.a(2,yd(n.svg,t));case 3:return i.a(2,xv(n.html,n.css,n.width,n.height,t));case 4:return i.a(2)}},e)})),jo.apply(this,arguments)}var Un=2048,bd=(function(){function e(n,t,r){ae(this,e),C(this,"cache",new Map),C(this,"pending",new Set),C(this,"atlas",{}),C(this,"glTexture",null),C(this,"dirty",!0),this.gl=n,this.renderers=t,this.scheduleRender=r,this.packCanvas=document.createElement("canvas"),this.packCanvas.width=Un,this.packCanvas.height=Un,this.packCtx=this.packCanvas.getContext("2d")}return ie(e,[{key:"renderAttachment",value:function(t,r,a){var i=this,o="".concat(t,":").concat(r);if(!(this.cache.has(o)||this.pending.has(o))){var s=this.renderers[r];if(s){var l=s(a);if(l){this.pending.add(o);var u=a.pixelRatio;Promise.resolve(l).then((function(){var d=$n(je().m(function c(h){var g;return je().w(function(p){for(;;)switch(p.n){case 0:if(i.pending.has(o)){p.n=1;break}return p.a(2);case 1:if(i.pending.delete(o),h){p.n=2;break}return p.a(2);case 2:return p.n=3,Sv(h,u);case 3:if(g=p.v,!(!g||g.width===0||g.height===0)){p.n=4;break}return p.a(2);case 4:i.cache.set(o,{image:g,width:g.width,height:g.height}),i.dirty=!0,i.scheduleRender();case 5:return p.a(2)}},c)}));return function(c){return d.apply(this,arguments)}})())}}}}},{key:"regenerateAtlas",value:function(){if(this.dirty){this.dirty=!1;var t=[];if(this.cache.forEach(function(u,d){t.push({key:d,width:u.width,height:u.height,draw:function(h,g,p){h.drawImage(u.image,g,p)}})}),t.length===0){this.atlas={},this.deleteGLTexture();return}var r={x:0,y:0,rowHeight:0,maxRowWidth:0};this.packCtx.clearRect(0,0,Un,Un);var a=pd(t,this.packCtx,r),i=a.atlas,o=a.remaining;this.atlas=i,o.length>0&&console.warn("Sigma: ".concat(o.length," label attachment(s) could not fit in the ").concat(Un,"x").concat(Un," atlas and will not be rendered.")),this.deleteGLTexture();var s=this.gl,l=s.createTexture();s.activeTexture(s.TEXTURE0+kr),s.bindTexture(s.TEXTURE_2D,l),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!0),s.texImage2D(s.TEXTURE_2D,0,s.RGBA,s.RGBA,s.UNSIGNED_BYTE,this.packCanvas),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MAG_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.CLAMP_TO_EDGE),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.CLAMP_TO_EDGE),this.glTexture=l}}},{key:"bindTexture",value:function(t){if(this.glTexture){var r=this.gl;r.activeTexture(r.TEXTURE0+t),r.bindTexture(r.TEXTURE_2D,this.glTexture)}}},{key:"getEntry",value:function(t,r){var a="".concat(t,":").concat(r);return this.atlas[a]||null}},{key:"invalidateNode",value:function(t){var r="".concat(t,":"),a=U(this.cache.keys()),i;try{for(a.s();!(i=a.n()).done;){var o=i.value;o.startsWith(r)&&(this.cache.delete(o),this.dirty=!0)}}catch(d){a.e(d)}finally{a.f()}var s=U(this.pending),l;try{for(s.s();!(l=s.n()).done;){var u=l.value;u.startsWith(r)&&this.pending.delete(u)}}catch(d){s.e(d)}finally{s.f()}}},{key:"restore",value:function(){this.glTexture=null,this.dirty=!0}},{key:"clear",value:function(){this.cache.clear(),this.pending.clear(),this.atlas={},this.dirty=!0,this.deleteGLTexture()}},{key:"kill",value:function(){this.clear(),this.packCanvas=null,this.packCtx=null,this.gl=null}},{key:"deleteGLTexture",value:function(){this.glTexture&&(this.gl.deleteTexture(this.glTexture),this.glTexture=null)}}])})(),qo=(function(){function e(n){ae(this,e),C(this,"buckets",new Map),C(this,"keyDepth",new Map);var t=U(n),r;try{for(t.s();!(r=t.n()).done;){var a=r.value;this.buckets.set(a,new Set)}}catch(i){t.e(i)}finally{t.f()}}return ie(e,[{key:"has",value:function(t){return this.keyDepth.has(t)}},{key:"getBucket",value:function(t){return this.buckets.get(t)}},{key:"set",value:function(t,r){var a,i=this.keyDepth.get(t);if(i!==r){var o=this.buckets.get(r);if(!o)throw new Error('Sigma: "'.concat(r,'" is not a declared depth layer'));i!==void 0&&((a=this.buckets.get(i))===null||a===void 0||a.delete(t)),o.add(t),this.keyDepth.set(t,r)}}},{key:"remove",value:function(t){var r=this.keyDepth.get(t);r!==void 0&&(this.buckets.get(r).delete(t),this.keyDepth.delete(t))}},{key:"clearAll",value:function(){var t=U(this.buckets.values()),r;try{for(t.s();!(r=t.n()).done;){var a=r.value;a.clear()}}catch(i){t.e(i)}finally{t.f()}this.keyDepth.clear()}},{key:"getSorted",value:function(t,r){var a=this.buckets.get(t);return!a||a.size===0?[]:Z(a).sort(function(i,o){return r(i)-r(o)})}}])})(),xd=(function(e){function n(t,r){return ae(this,n),ye(this,n,[t,2,r])}return be(n,e),ie(n,[{key:"updateNode",value:function(r,a,i,o,s,l,u,d){var c=this.indexMap.get(r);if(c===void 0)throw new Error('Node "'.concat(r,'" not allocated in NodeDataTexture'));var h=kt(d),g=se(h,4),p=g[0],m=g[1],b=g[2],v=g[3],x=c*2*4;this.data[x]=a,this.data[x+1]=i,this.data[x+2]=o,this.data[x+3]=s,this.data[x+4]=l,this.data[x+5]=u,this.data[x+6]=p*65536+m*256+b,this.data[x+7]=v/255,this.markDirty(c)}}])})(Dr),_v=1024,Tv=1.5,Vo=(function(){function e(n,t){var r;if(ae(this,e),C(this,"texture",null),C(this,"framebuffer",null),!n.getExtension("EXT_color_buffer_float"))throw new Error("sigma: EXT_color_buffer_float is required for label/edge placement but is unavailable in this WebGL2 context.");this.gl=n,this.maxTextureSize=n.getParameter(n.MAX_TEXTURE_SIZE),this.channels=t.channels,this.capacity=this.roundUpToPowerOfTwo((r=t.initialCapacity)!==null&&r!==void 0?r:_v);var a=this.computeDimensions(this.capacity);this.textureWidth=a.width,this.textureHeight=a.height,this.create()}return ie(e,[{key:"roundUpToPowerOfTwo",value:function(t){return Math.pow(2,Math.ceil(Math.log2(Math.max(1,t))))}},{key:"computeDimensions",value:function(t){var r=Math.min(t,this.maxTextureSize),a=Math.ceil(t/r);return{width:r,height:a}}},{key:"create",value:function(){var t=this.gl,r=this.channels===1?t.R32F:t.RGBA32F,a=this.channels===1?t.RED:t.RGBA;if(this.texture=t.createTexture(),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,this.texture),t.texImage2D(t.TEXTURE_2D,0,r,this.textureWidth,this.textureHeight,0,a,t.FLOAT,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),this.framebuffer=t.createFramebuffer(),t.bindFramebuffer(t.FRAMEBUFFER,this.framebuffer),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,this.texture,0),t.checkFramebufferStatus(t.FRAMEBUFFER)!==t.FRAMEBUFFER_COMPLETE)throw new Error("sigma: float framebuffer for frame-pass placement is incomplete.");t.bindFramebuffer(t.FRAMEBUFFER,null),t.bindTexture(t.TEXTURE_2D,null)}},{key:"ensureCapacity",value:function(t){if(!(t<=this.capacity)){var r=this.gl;this.capacity=this.roundUpToPowerOfTwo(Math.ceil(t*Tv));var a=this.computeDimensions(this.capacity);this.textureWidth=a.width,this.textureHeight=a.height,this.texture&&r.deleteTexture(this.texture),this.framebuffer&&r.deleteFramebuffer(this.framebuffer),this.create()}}},{key:"bindAsRenderTarget",value:function(){var t=this.gl;t.bindFramebuffer(t.FRAMEBUFFER,this.framebuffer),t.viewport(0,0,this.textureWidth,this.textureHeight)}},{key:"bind",value:function(t){var r=this.gl;r.activeTexture(r.TEXTURE0+t),r.bindTexture(r.TEXTURE_2D,this.texture)}},{key:"getTexture",value:function(){return this.texture}},{key:"getTextureWidth",value:function(){return this.textureWidth}},{key:"getTextureHeight",value:function(){return this.textureHeight}},{key:"restore",value:function(){this.gl.getExtension("EXT_color_buffer_float"),this.create()}},{key:"kill",value:function(){var t=this.gl;this.texture&&(t.deleteTexture(this.texture),this.texture=null),this.framebuffer&&(t.deleteFramebuffer(this.framebuffer),this.framebuffer=null)}}])})(),Sd=(function(e){function n(t,r){return ae(this,n),ye(this,n,[t,2,r])}return be(n,e),ie(n,[{key:"updateEdge",value:function(r,a,i,o,s,l){var u=arguments.length>6&&arguments[6]!==void 0?arguments[6]:0,d=arguments.length>7&&arguments[7]!==void 0?arguments[7]:0,c=arguments.length>8&&arguments[8]!==void 0?arguments[8]:0,h=this.indexMap.get(r);if(h===void 0)throw new Error('Edge "'.concat(r,'" not allocated in EdgeDataTexture'));var g=h*this.TEXELS_PER_ITEM*4;this.data[g+0]=a,this.data[g+1]=i,this.data[g+2]=o,this.data[g+3]=0,this.data[g+4]=s,this.data[g+5]=l,this.data[g+6]=u,this.data[g+7]=(d&15)<<4|c&15,this.markDirty(h)}}])})(Dr);var B0=We(Gt()),W0=We(on());function Ev(e,n){if(e==null)return{};var t={};for(var r in e)if({}.hasOwnProperty.call(e,r)){if(n.indexOf(r)!==-1)continue;t[r]=e[r]}return t}function _d(e,n){if(e==null)return{};var t,r,a=Ev(e,n);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)t=i[r],n.indexOf(t)===-1&&{}.propertyIsEnumerable.call(e,t)&&(a[t]=e[t])}return a}var wv=["factor"],Av=["factor"],Td=1.5,Xo={x:.5,y:.5,angle:0,ratio:1},Ed=(function(e){function n(){var t;ae(this,n);for(var r=arguments.length,a=new Array(r),i=0;i<r;i++)a[i]=arguments[i];return t=ye(this,n,[].concat(a)),C(t,"minRatio",null),C(t,"maxRatio",null),C(t,"enabled",!0),C(t,"enabledZooming",!0),C(t,"enabledPanning",!0),C(t,"enabledRotation",!0),C(t,"constrainState",null),C(t,"state",H({},Xo)),C(t,"previousState",H({},Xo)),C(t,"nextFrame",null),C(t,"currentAnimationFrom",null),C(t,"currentAnimationTo",null),C(t,"animationCallback",null),t}return be(n,e),ie(n,[{key:"x",get:function(){return this.state.x}},{key:"y",get:function(){return this.state.y}},{key:"angle",get:function(){return this.state.angle}},{key:"ratio",get:function(){return this.state.ratio}},{key:"getState",value:function(){return H({},this.state)}},{key:"getPreviousState",value:function(){return H({},this.previousState)}},{key:"getBoundedRatio",value:function(r){var a=r;return typeof this.minRatio=="number"&&(a=Math.max(a,this.minRatio)),typeof this.maxRatio=="number"&&(a=Math.min(a,this.maxRatio)),a}},{key:"validateState",value:function(r){var a=this.getState();return this.enabledPanning&&typeof r.x=="number"&&(a.x=r.x),this.enabledPanning&&typeof r.y=="number"&&(a.y=r.y),this.enabledZooming&&typeof r.ratio=="number"&&(a.ratio=this.getBoundedRatio(r.ratio)),this.enabledRotation&&typeof r.angle=="number"&&(a.angle=r.angle),this.constrainState?this.constrainState(a):a}},{key:"isAnimating",value:function(){return this.nextFrame!==null}},{key:"setState",value:function(r){if(!this.enabled)return this;var a=this.validateState(r);return cu(this.state,a)?this:(this.previousState=this.state,this.state=a,this.emit("updated",this.getState()),this)}},{key:"updateState",value:function(r){return this.setState(r(this.getState())),this}},{key:"animate",value:function(r,a){var i=this;return this.enabled?new Promise(function(o){return i.runAnimation(r,H(H({},gu),a),o)}):Promise.resolve()}},{key:"cancelAnimation",value:function(){return this.nextFrame!==null&&(cancelAnimationFrame(this.nextFrame),this.nextFrame=null),this.resolveAnimation(),this.emitAnimationEnd(!1),this}},{key:"zoomIn",value:function(){var r=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{},a=r.factor,i=a===void 0?Td:a,o=_d(r,wv);return this.animate({ratio:this.ratio/i},o)}},{key:"zoomOut",value:function(){var r=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{},a=r.factor,i=a===void 0?Td:a,o=_d(r,Av);return this.animate({ratio:this.ratio*i},o)}},{key:"reset",value:function(r){return this.animate(Xo,r)}},{key:"runAnimation",value:function(r,a,i){var o=this,s=wa(a.easing),l=Date.now(),u=this.getState(),d=this.validateState(r),c=function(){if(!o.enabled){o.cancelAnimation();return}var g=a.duration>0?(Date.now()-l)/a.duration:1;if(g>=1){o.nextFrame=null,o.setState(d),o.resolveAnimation(),o.emitAnimationEnd(!0);return}var p=s(g);o.setState({x:u.x+(d.x-u.x)*p,y:u.y+(d.y-u.y)*p,angle:u.angle+(d.angle-u.angle)*p,ratio:u.ratio+(d.ratio-u.ratio)*p}),o.nextFrame=requestAnimationFrame(c)};this.cancelAnimation(),this.currentAnimationFrom=u,this.currentAnimationTo=d,this.animationCallback=i,this.emit("animationStart",{from:u,to:d}),c()}},{key:"resolveAnimation",value:function(){var r=this.animationCallback;this.animationCallback=null,r&&r()}},{key:"emitAnimationEnd",value:function(r){var a=this.currentAnimationFrom,i=this.currentAnimationTo;!a||!i||(this.currentAnimationFrom=null,this.currentAnimationTo=null,this.emit("animationEnd",{from:a,to:i,completed:r}))}}],[{key:"from",value:function(r){var a=new n;return a.setState(r)}}])})(ka);function qe(e,n){var t=n.getBoundingClientRect();return{x:e.clientX-t.left,y:e.clientY-t.top}}function pt(e,n){var t=H(H({},qe(e,n)),{},{sigmaDefaultPrevented:!1,preventSigmaDefault:function(){t.sigmaDefaultPrevented=!0},original:e});return t}function cn(e){var n="x"in e?e:H(H({},e.touches[0]||e.previousTouches[0]),{},{original:e.original,sigmaDefaultPrevented:e.sigmaDefaultPrevented,preventSigmaDefault:function(){e.sigmaDefaultPrevented=!0,n.sigmaDefaultPrevented=!0}});return n}function Rv(e,n){var t=pt(e,n);return t.delta=Bd(e),t}var Dv=2;function ti(e){for(var n=[],t=0,r=Math.min(e.length,Dv);t<r;t++)n.push(e[t]);return n}function Lr(e,n,t){var r={touches:ti(e.touches).map(function(a){return qe(a,t)}),previousTouches:n.map(function(a){return qe(a,t)}),sigmaDefaultPrevented:!1,preventSigmaDefault:function(){r.sigmaDefaultPrevented=!0},original:e};return r}function Bd(e){if(typeof e.deltaY<"u")return e.deltaY*-3/360;if(typeof e.detail<"u")return e.detail/-9;throw new Error("Captor: could not extract delta from event.")}var Wd=(function(e){function n(t,r){var a;return ae(this,n),a=ye(this,n),a.container=t,a.renderer=r,a}return be(n,e),ie(n)})(ka),kv=["doubleClickTimeout","doubleClickZoomingDuration","doubleClickZoomingRatio","dragTimeout","draggedEventsTolerance","enableCameraMouseRotation","gestureTarget","inertiaDuration","inertiaRatio","zoomDuration","zoomingRatio"],Cv=kv.reduce(function(e,n){return H(H({},e),{},C({},n,Pa[n]))},{});function Pr(e){return e instanceof PointerEvent&&e.pointerType==="touch"}var Lv=(function(e){function n(t,r){var a;return ae(this,n),a=ye(this,n,[t,r]),C(a,"enabled",!0),C(a,"draggedEvents",0),C(a,"downStartTime",null),C(a,"lastMouseX",null),C(a,"lastMouseY",null),C(a,"isMouseDown",!1),C(a,"isMoving",!1),C(a,"isPanningStage",!1),C(a,"movingTimeout",null),C(a,"startCameraState",null),C(a,"clicks",0),C(a,"doubleClickTimeout",null),C(a,"isRightMouseDown",!1),C(a,"startRotationAngle",null),C(a,"startCameraAngle",null),C(a,"currentWheelDirection",0),C(a,"lastWheelAnimationId",0),C(a,"settings",Cv),a.handleRightClick=a.handleRightClick.bind(a),a.handleDown=a.handleDown.bind(a),a.handleUp=a.handleUp.bind(a),a.handleMove=a.handleMove.bind(a),a.handleWheel=a.handleWheel.bind(a),a.handleLeave=a.handleLeave.bind(a),a.handleEnter=a.handleEnter.bind(a),t.addEventListener("contextmenu",a.handleRightClick,{capture:!1}),t.addEventListener("pointerdown",a.handleDown,{capture:!1}),t.addEventListener("wheel",a.handleWheel,{capture:!1,passive:!1}),t.addEventListener("pointerleave",a.handleLeave,{capture:!1}),t.addEventListener("pointerenter",a.handleEnter,{capture:!1}),document.addEventListener("pointermove",a.handleMove,{capture:!1}),document.addEventListener("pointerup",a.handleUp,{capture:!1}),a}return be(n,e),ie(n,[{key:"kill",value:function(){var r=this.container;r.removeEventListener("contextmenu",this.handleRightClick),r.removeEventListener("pointerdown",this.handleDown),r.removeEventListener("wheel",this.handleWheel),r.removeEventListener("pointerleave",this.handleLeave),r.removeEventListener("pointerenter",this.handleEnter),document.removeEventListener("pointermove",this.handleMove),document.removeEventListener("pointerup",this.handleUp)}},{key:"handleClick",value:function(r){var a=this;if(this.enabled){if(this.clicks++,this.clicks===2)return this.clicks=0,typeof this.doubleClickTimeout=="number"&&(clearTimeout(this.doubleClickTimeout),this.doubleClickTimeout=null),this.handleDoubleClick(r);setTimeout(function(){a.clicks=0,a.doubleClickTimeout=null},this.settings.doubleClickTimeout),this.draggedEvents<this.settings.draggedEventsTolerance&&this.emit("click",pt(r,this.container))}}},{key:"handleRightClick",value:function(r){this.enabled&&(this.settings.enableCameraMouseRotation&&r.preventDefault(),this.emit("rightClick",pt(r,this.container)))}},{key:"handleDoubleClick",value:function(r){if(this.enabled){r.preventDefault(),r.stopPropagation();var a=pt(r,this.container);if(this.emit("doubleClick",a),!a.sigmaDefaultPrevented){var i=this.renderer.getCamera(),o=i.getBoundedRatio(i.getState().ratio/this.settings.doubleClickZoomingRatio);i.animate(this.renderer.getViewportZoomedState(qe(r,this.container),o),{easing:"quadraticInOut",duration:this.settings.doubleClickZoomingDuration})}}}},{key:"handleDown",value:function(r){if(!(!this.enabled||Pr(r))){if(r.button===0){this.startCameraState=this.renderer.getCamera().getState();var a=qe(r,this.container),i=a.x,o=a.y;this.lastMouseX=i,this.lastMouseY=o,this.draggedEvents=0,this.downStartTime=Date.now(),this.isMouseDown=!0}if(r.button===2&&this.settings.enableCameraMouseRotation){var s=qe(r,this.container),l=s.x,u=s.y,d=this.container.offsetWidth/2,c=this.container.offsetHeight/2;this.startRotationAngle=Math.atan2(u-c,l-d),this.startCameraAngle=this.renderer.getCamera().getState().angle,this.isRightMouseDown=!0}this.emit("mousedown",pt(r,this.container))}}},{key:"handleUp",value:function(r){var a=this;if(!(!this.enabled||Pr(r)||!this.isMouseDown&&!this.isRightMouseDown)){if(this.isRightMouseDown){this.isRightMouseDown=!1,this.startRotationAngle=null,this.startCameraAngle=null,this.emit("mouseup",pt(r,this.container));return}var i=this.renderer.getCamera();this.isMouseDown=!1,this.isPanningStage&&(this.isPanningStage=!1,this.renderer._setPanning(!1)),typeof this.movingTimeout=="number"&&(clearTimeout(this.movingTimeout),this.movingTimeout=null);var o=qe(r,this.container),s=o.x,l=o.y,u=i.getState(),d=i.getPreviousState();this.isMoving?i.animate({x:u.x+this.settings.inertiaRatio*(u.x-d.x),y:u.y+this.settings.inertiaRatio*(u.y-d.y)},{duration:this.settings.inertiaDuration,easing:"quadraticOut"}):(this.lastMouseX!==s||this.lastMouseY!==l)&&i.setState({x:u.x,y:u.y}),this.isMoving=!1,setTimeout(function(){var c=a.draggedEvents>0;a.draggedEvents=0;var h=a.renderer.getSetting("hideEdgesOnMove")||a.renderer.getSetting("hideLabelsOnMove");c&&h&&a.renderer.refresh()},0),this.emit("mouseup",pt(r,this.container)),(r.target===this.container||r.composedPath()[0]===this.container)&&this.handleClick(r)}}},{key:"handleMove",value:function(r){var a=this;if(!(!this.enabled||Pr(r))){var i=pt(r,this.container);if(this.emit("mousemovebody",i),(r.target===this.container||r.composedPath()[0]===this.container)&&this.emit("mousemove",i),this.isMouseDown&&this.draggedEvents++,!i.sigmaDefaultPrevented){if(this.isMouseDown){this.isMoving=!0,typeof this.movingTimeout=="number"&&clearTimeout(this.movingTimeout),this.movingTimeout=window.setTimeout(function(){a.movingTimeout=null,a.isMoving=!1},this.settings.dragTimeout);var o=this.renderer.getCamera(),s=qe(r,this.container),l=s.x,u=s.y,d=this.renderer.viewportToFramedGraph({x:this.lastMouseX,y:this.lastMouseY}),c=this.renderer.viewportToFramedGraph({x:l,y:u}),h=d.x-c.x,g=d.y-c.y,p=o.getState(),m=p.x+h,b=p.y+g;this.isPanningStage||(this.isPanningStage=!0,this.renderer._setPanning(!0)),o.setState({x:m,y:b}),this.lastMouseX=l,this.lastMouseY=u,r.preventDefault(),r.stopPropagation()}if(this.isRightMouseDown){var v=qe(r,this.container),x=v.x,y=v.y,_=this.container.offsetWidth/2,S=this.container.offsetHeight/2,T=Math.atan2(y-S,x-_),A=T-this.startRotationAngle,w=this.renderer.getCamera();w.setState({angle:this.startCameraAngle+A}),r.preventDefault(),r.stopPropagation()}}}}},{key:"handleLeave",value:function(r){Pr(r)||this.emit("mouseleave",pt(r,this.container))}},{key:"handleEnter",value:function(r){Pr(r)||this.emit("mouseenter",pt(r,this.container))}},{key:"handleWheel",value:function(r){var a=this,i=this.renderer.getCamera();if(!(!this.enabled||!i.enabledZooming)){var o=Rv(r,this.container);if(this.emit("wheel",o),!o.sigmaDefaultPrevented){var s=this.settings.gestureTarget;if(s!=="page"){if(s==="shared"&&!r.ctrlKey&&!r.metaKey){this.renderer._showGestureHint("wheel");return}var l=Bd(r);if(l){r.preventDefault(),r.stopPropagation();var u=i.getState().ratio,d=l>0?1/this.settings.zoomingRatio:this.settings.zoomingRatio,c=i.getBoundedRatio(u*d),h=l>0?1:-1,g=Date.now();if(u!==c&&!(this.currentWheelDirection===h&&this.lastWheelTriggerTime&&g-this.lastWheelTriggerTime<this.settings.zoomDuration/5)){var p=++this.lastWheelAnimationId;i.animate(this.renderer.getViewportZoomedState(qe(r,this.container),c),{easing:"quadraticOut",duration:this.settings.zoomDuration}).then(function(){a.lastWheelAnimationId===p&&(a.currentWheelDirection=0)}),this.currentWheelDirection=h,this.lastWheelTriggerTime=g}}}}}}},{key:"setSettings",value:function(r){this.settings=r}}])})(Wd),Pv=["dragTimeout","gestureTarget","inertiaDuration","inertiaRatio","doubleClickTimeout","doubleClickZoomingRatio","doubleClickZoomingDuration","tapMoveTolerance"],Iv=Pv.reduce(function(e,n){return H(H({},e),{},C({},n,Pa[n]))},{}),Fv=(function(e){function n(t,r){var a;return ae(this,n),a=ye(this,n,[t,r]),C(a,"enabled",!0),C(a,"isMoving",!1),C(a,"hasMoved",!1),C(a,"isPanningStage",!1),C(a,"isZoomingStage",!1),C(a,"touchMode",0),C(a,"startTouchesPositions",[]),C(a,"lastTouches",[]),C(a,"lastTap",null),C(a,"settings",Iv),a.handleStart=a.handleStart.bind(a),a.handleLeave=a.handleLeave.bind(a),a.handleMove=a.handleMove.bind(a),t.addEventListener("touchstart",a.handleStart,{capture:!1}),t.addEventListener("touchcancel",a.handleLeave,{capture:!1}),document.addEventListener("touchend",a.handleLeave,{capture:!1,passive:!1}),document.addEventListener("touchmove",a.handleMove,{capture:!1,passive:!1}),a}return be(n,e),ie(n,[{key:"kill",value:function(){var r=this.container;r.removeEventListener("touchstart",this.handleStart),r.removeEventListener("touchcancel",this.handleLeave),document.removeEventListener("touchend",this.handleLeave),document.removeEventListener("touchmove",this.handleMove)}},{key:"getDimensions",value:function(){return{width:this.container.offsetWidth,height:this.container.offsetHeight}}},{key:"doesCapture",value:function(r){var a=this.settings.gestureTarget;return a==="graph"?!0:a==="page"?!1:r>=2}},{key:"syncStageFlags",value:function(){var r=this.touchMode===1&&this.hasMoved,a=this.touchMode===2;r!==this.isPanningStage&&(this.isPanningStage=r,this.renderer._setPanning(r)),a!==this.isZoomingStage&&(this.isZoomingStage=a,this.renderer._setZooming(a))}},{key:"handleStart",value:function(r){var a=this;if(this.enabled){var i=ti(r.touches);if(this.touchMode=i.length,this.startCameraState=this.renderer.getCamera().getState(),this.startTouchesPositions=i.map(function(g){return qe(g,a.container)}),this.touchMode===2){var o=se(this.startTouchesPositions,2),s=o[0],l=s.x,u=s.y,d=o[1],c=d.x,h=d.y;this.startTouchesAngle=Math.atan2(h-u,c-l),this.startTouchesDistance=Math.sqrt(Math.pow(c-l,2)+Math.pow(h-u,2))}this.syncStageFlags(),this.emit("touchdown",Lr(r,this.lastTouches,this.container)),this.lastTouches=i,this.lastTouchesPositions=this.startTouchesPositions,r.cancelable&&(this.doesCapture(r.touches.length)||this.renderer._hasNodeDrag())&&r.preventDefault()}}},{key:"handleLeave",value:function(r){if(!(!this.enabled||!this.startTouchesPositions.length)){switch(r.cancelable&&this.doesCapture(this.touchMode)&&r.preventDefault(),this.movingTimeout&&(this.isMoving=!1,clearTimeout(this.movingTimeout)),this.touchMode){case 2:if(r.touches.length===1){this.handleStart(r);break}case 1:if(this.isMoving){var a=this.renderer.getCamera(),i=a.getState(),o=a.getPreviousState();a.animate({x:i.x+this.settings.inertiaRatio*(i.x-o.x),y:i.y+this.settings.inertiaRatio*(i.y-o.y)},{duration:this.settings.inertiaDuration,easing:"quadraticOut"})}this.hasMoved=!1,this.isMoving=!1,this.touchMode=0;break}if(this.syncStageFlags(),this.emit("touchup",Lr(r,this.lastTouches,this.container)),!r.touches.length){var s=qe(this.lastTouches[0],this.container),l=this.startTouchesPositions[0],u=Math.pow(s.x-l.x,2)+Math.pow(s.y-l.y,2);if(!r.touches.length&&u<Math.pow(this.settings.tapMoveTolerance,2))if(this.lastTap&&Date.now()-this.lastTap.time<this.settings.doubleClickTimeout){var d=Lr(r,this.lastTouches,this.container);if(this.emit("doubletap",d),this.lastTap=null,!d.sigmaDefaultPrevented&&this.settings.gestureTarget!=="page"){var c=this.renderer.getCamera(),h=c.getBoundedRatio(c.getState().ratio/this.settings.doubleClickZoomingRatio);c.animate(this.renderer.getViewportZoomedState(s,h),{easing:"quadraticInOut",duration:this.settings.doubleClickZoomingDuration})}}else{var g=Lr(r,this.lastTouches,this.container);this.emit("tap",g),this.lastTap={time:Date.now(),position:g.touches[0]||g.previousTouches[0]}}}this.lastTouches=ti(r.touches),this.startTouchesPositions=[]}}},{key:"handleMove",value:function(r){var a=this;if(!(!this.enabled||!this.startTouchesPositions.length)){var i=this.doesCapture(r.touches.length);i&&r.preventDefault();var o=ti(r.touches),s=o.map(function(q){return qe(q,a.container)}),l=this.lastTouches;this.lastTouches=o,this.lastTouchesPositions=s;var u=Lr(r,l,this.container);if(this.emit("touchmove",u),!u.sigmaDefaultPrevented&&(this.hasMoved||(this.hasMoved=s.some(function(q,te){var Q=a.startTouchesPositions[te];return Q&&(q.x!==Q.x||q.y!==Q.y)})),!!this.hasMoved)){if(!i){this.settings.gestureTarget==="shared"&&this.renderer._showGestureHint("touch");return}this.isMoving=!0,this.syncStageFlags(),this.movingTimeout&&clearTimeout(this.movingTimeout),this.movingTimeout=window.setTimeout(function(){a.isMoving=!1},this.settings.dragTimeout);var d=this.renderer.getCamera(),c=this.startCameraState,h=this.renderer.getSetting("stagePadding");switch(this.touchMode){case 1:{var g=this.renderer.viewportToFramedGraph((this.startTouchesPositions||[])[0]),p=g.x,m=g.y,b=this.renderer.viewportToFramedGraph(s[0]),v=b.x,x=b.y;d.setState({x:c.x+p-v,y:c.y+m-x});break}case 2:{var y={x:.5,y:.5,angle:0,ratio:1},_=s[0],S=_.x,T=_.y,A=s[1],w=A.x,E=A.y,R=Math.atan2(E-T,w-S)-this.startTouchesAngle,L=Math.hypot(E-T,w-S)/this.startTouchesDistance,k=d.getBoundedRatio(c.ratio/L);y.ratio=k,y.angle=c.angle+R;var P=this.getDimensions(),D=this.renderer.viewportToFramedGraph((this.startTouchesPositions||[])[0],{cameraState:c}),I=Math.min(P.width,P.height)-2*h,G=I/P.width,z=I/P.height,F=k/I,M=S-I/2/G,W=T-I/2/z,X=ba({x:M,y:W},y.angle);M=X.x,W=X.y,y.x=D.x-M*F,y.y=D.y+W*F,d.setState(y);break}}}}}},{key:"setSettings",value:function(r){this.settings=r}}])})(Wd),Mv=(function(){function e(n,t,r,a){ae(this,e),C(this,"pendingNode",null),C(this,"session",null),this.graph=n,this.viewportToGraph=t,this.setNodesState=r,this.emit=a}return ie(e,[{key:"start",value:function(t,r,a,i,o){var s=a(t),l=!1;if(this.emit("nodeDragStart",{node:t,allDraggedNodes:s,event:r,preventSigmaDefault:function(){l=!0}}),l)return!1;var u=new Map,d=U(s),c;try{for(d.s();!(c=d.n()).done;){var h=c.value;u.set(h,{x:this.graph.getNodeAttribute(h,i),y:this.graph.getNodeAttribute(h,o)})}}catch(g){d.e(g)}finally{d.f()}return this.session={node:t,allNodes:s,startPosition:this.viewportToGraph(r),startNodePositions:u,xAttr:i,yAttr:o},this.setNodesState(s,{isDragged:!0}),!0}},{key:"applyMove",value:function(t,r){var a=this.session,i=a.allNodes,o=a.startNodePositions,s=a.startPosition,l=a.xAttr,u=a.yAttr,d=this.viewportToGraph(t),c={x:d.x-s.x,y:d.y-s.y},h=U(i),g;try{for(h.s();!(g=h.n()).done;){var p=g.value,m=o.get(p);if(!(!m||!this.graph.hasNode(p))){var b={x:m.x+c.x,y:m.y+c.y};r?this.graph.mergeNodeAttributes(p,r(b,p)):(this.graph.setNodeAttribute(p,l,b.x),this.graph.setNodeAttribute(p,u,b.y))}}}catch(v){h.e(v)}finally{h.f()}}},{key:"end",value:function(){if(this.pendingNode=null,!this.session)return null;var t=this.session,r=t.node,a=t.allNodes;return this.setNodesState(a,{isDragged:!1}),this.session=null,{node:r,allNodes:a}}},{key:"removeNode",value:function(t){t===this.pendingNode&&(this.pendingNode=null),this.session&&(this.session.node===t?(this.setNodesState(this.session.allNodes,{isDragged:!1}),this.session=null):this.session.allNodes.includes(t)&&(this.session.allNodes=this.session.allNodes.filter(function(r){return r!==t}),this.session.startNodePositions.delete(t)))}},{key:"clear",value:function(){this.pendingNode=null,this.session=null}}])})();function wd(e,n){return e<n?"".concat(e,"\0").concat(n):"".concat(n,"\0").concat(e)}var Nv=(function(){function e(n,t){ae(this,e),C(this,"groups",new Map),C(this,"edgeToGroupKey",new Map),this.graph=n,this.onGroupChanged=t}return ie(e,[{key:"getGroupKey",value:function(t){return wd(this.graph.source(t),this.graph.target(t))}},{key:"sortGroup",value:function(t,r){var a=this,i=r.split("\0")[0];t.sort(function(o,s){var l=a.graph.source(o)===i||!a.graph.isDirected(o)?0:1,u=a.graph.source(s)===i||!a.graph.isDirected(s)?0:1;return l-u})}},{key:"register",value:function(t){var r=this.getGroupKey(t),a=this.groups.get(r);a||(a=[],this.groups.set(r,a)),a.includes(t)||a.push(t),this.edgeToGroupKey.set(t,r),a.length>1&&this.sortGroup(a,r),this.onGroupChanged(a,a.length)}},{key:"unregister",value:function(t){var r=this.edgeToGroupKey.get(t);if(r){this.edgeToGroupKey.delete(t);var a=this.groups.get(r);if(a){var i=a.indexOf(t);i!==-1&&a.splice(i,1),a.length===0?this.groups.delete(r):this.onGroupChanged(a,a.length)}}}},{key:"getGroup",value:function(t){var r,a=this.edgeToGroupKey.get(t);return a?(r=this.groups.get(a))!==null&&r!==void 0?r:[]:[]}},{key:"getSiblings",value:function(t){return this.getGroup(t).filter(function(r){return r!==t})}},{key:"rebuild",value:function(){var t=this;this.groups.clear(),this.edgeToGroupKey.clear(),this.graph.forEachEdge(function(l,u,d,c){var h=wd(d,c),g=t.groups.get(h);g||(g=[],t.groups.set(h,g)),g.push(l),t.edgeToGroupKey.set(l,h)});var r=U(this.groups),a;try{for(r.s();!(a=r.n()).done;){var i=se(a.value,2),o=i[0],s=i[1];s.length>1&&this.sortGroup(s,o),this.onGroupChanged(s,s.length)}}catch(l){r.e(l)}finally{r.f()}}},{key:"clear",value:function(){this.groups.clear(),this.edgeToGroupKey.clear()}}])})();function Ad(e,n){var t;if(e===!1||e==="extend"||e==="separate")return e;var r=e[n];return r!==void 0?r:(t=e.default)!==null&&t!==void 0?t:!1}function Rd(e){return e===!1?!1:e==="extend"||e==="separate"?!0:Object.values(e).some(function(n){return n==="extend"||n==="separate"})}function Dd(e){return e==="separate"?!0:e===!1||e==="extend"?!1:e.default==="separate"?!0:Object.values(e).includes("separate")}var Fe={node:{parent:null,eventSuffix:"Node",payloadKey:"node",isEnabled:function(){return!0},writesPickingThisFrame:function(){return!0},setHover:function(n,t,r){return n.setNodeState(t,{isHovered:r})},getCursor:function(n,t){var r;return(r=n.nodeDataCache[t])===null||r===void 0?void 0:r.cursor},isHitValid:function(n,t){var r;return((r=n.nodeDataCache[t])===null||r===void 0?void 0:r.visibility)!=="hidden"}},edge:{parent:null,eventSuffix:"Edge",payloadKey:"edge",isEnabled:function(n){return!!n.settings.enableEdgeEvents},writesPickingThisFrame:function(n){return!!n.settings.enableEdgeEvents},setHover:function(n,t,r){return n.setEdgeState(t,{isHovered:r})},getCursor:function(n,t){var r;return(r=n.edgeDataCache[t])===null||r===void 0?void 0:r.cursor}},nodeLabel:{parent:"node",eventSuffix:"NodeLabel",payloadKey:"node",isEnabled:function(n){return Dd(n.settings.nodeLabelEvents)},writesPickingThisFrame:function(n){return Rd(n.settings.nodeLabelEvents)},setHover:function(n,t,r){return n.setNodeState(t,{isLabelHovered:r})},getCursor:function(n,t){var r;return(r=n.nodeDataCache[t])===null||r===void 0?void 0:r.labelCursor},resolveForVerb:function(n,t,r){var a=Ad(r.settings.nodeLabelEvents,t);return a===!1?null:a==="extend"?{kind:"node",key:n.key}:n}},edgeLabel:{parent:"edge",eventSuffix:"EdgeLabel",payloadKey:"edge",isEnabled:function(n){return Dd(n.settings.edgeLabelEvents)},writesPickingThisFrame:function(n){return Rd(n.settings.edgeLabelEvents)},setHover:function(n,t,r){return n.setEdgeState(t,{isLabelHovered:r})},getCursor:function(n,t){var r;return(r=n.edgeDataCache[t])===null||r===void 0?void 0:r.labelCursor},resolveForVerb:function(n,t,r){var a=Ad(r.settings.edgeLabelEvents,t);return a===!1?null:a==="extend"?{kind:"edge",key:n.key}:n}}},gn=["node","edge","nodeLabel","edgeLabel"];function zv(){return{lookup:[null],idsByKind:{node:new Map,edge:new Map,nodeLabel:new Map,edgeLabel:new Map},nextId:1}}function fn(e,n,t){var r;return(r=e.idsByKind[n].get(t))!==null&&r!==void 0?r:0}function Ja(e,n){var t=U(gn),r;try{for(t.s();!(r=t.n()).done;){var a=r.value;if(a===n||Fe[a].parent===n){var i=U(e.idsByKind[a].values()),o;try{for(i.s();!(o=i.n()).done;){var s=o.value;e.lookup[s]=null}}catch(h){i.e(h)}finally{i.f()}e.idsByKind[a]=new Map}}}catch(h){t.e(h)}finally{t.f()}var l=1,u=U(gn),d;try{for(u.s();!(d=u.n()).done;){var c=d.value;if(c===n)break;l+=e.idsByKind[c].size}}catch(h){u.e(h)}finally{u.f()}e.nextId=l}function kd(e,n,t){var r=e.nextId++;return e.idsByKind[n].set(t,r),e.lookup[r]={kind:n,key:t},r}function Cd(e,n,t){for(var r=0,a=ni(n);r<a.length;r++){var i=a[r],o=e.idsByKind[i].get(t);o!==void 0&&(e.lookup[o]=null,e.idsByKind[i].delete(t))}}function Gv(e,n){var t=U(gn),r;try{for(t.s();!(r=t.n()).done;){var a=r.value;if(Fe[a].parent!==null){var i=U(e.idsByKind[a].values()),o;try{for(i.s();!(o=i.n()).done;){var s=o.value;e.lookup[s]=null}}catch(S){i.e(S)}finally{i.f()}e.idsByKind[a]=new Map}}}catch(S){t.e(S)}finally{t.f()}e.nextId=1;var l=U(gn),u;try{for(l.s();!(u=l.n()).done;){var d=u.value;if(Fe[d].parent===null){var c=U(e.idsByKind[d].values()),h;try{for(c.s();!(h=c.n()).done;){var g=h.value;g>=e.nextId&&(e.nextId=g+1)}}catch(S){c.e(S)}finally{c.f()}}}}catch(S){l.e(S)}finally{l.f()}var p=U(gn),m;try{for(p.s();!(m=p.n()).done;){var b=m.value,v=Fe[b];if(!(v.parent===null||!v.isEnabled(n))){var x=U(e.idsByKind[v.parent].keys()),y;try{for(x.s();!(y=x.n()).done;){var _=y.value;e.idsByKind[b].set(_,e.nextId),e.lookup[e.nextId]={kind:b,key:_},e.nextId++}}catch(S){x.e(S)}finally{x.f()}}}}catch(S){p.e(S)}finally{p.f()}}function Ov(e,n){var t=U(gn),r;try{for(t.s();!(r=t.n()).done;){var a=r.value,i=e[a],o=n[a];if(i!==o){if(i.size!==o.size)return!1;var s=U(i),l;try{for(s.s();!(l=s.n()).done;){var u=se(l.value,2),d=u[0],c=u[1];if(o.get(d)!==c)return!1}}catch(h){s.e(h)}finally{s.f()}}}}catch(h){t.e(h)}finally{t.f()}return!0}function Ld(e,n,t){Fe[n.kind].setHover(e,n.key,t)}function Bv(e,n){return Fe[n.kind].getCursor(e,n.key)}function Ir(e,n){return"".concat(n).concat(Fe[e].eventSuffix)}function Fr(e,n){return H(H({},n),{},C({},Fe[e.kind].payloadKey,e.key))}function Wv(e,n,t){var r=Fe[n.kind].resolveForVerb;return r?r(n,t,e):n}function Uv(e,n){var t=Fe[n.kind].isHitValid;return t?t(e,n.key):!0}function ni(e){return gn.filter(function(n){return n===e||Fe[n].parent===e})}function Ud(e,n,t){return n&&(n=Wv(e,n,t)),n&&!Uv(e,n)&&(n=null),n}function Yo(e,n,t){var r=t==="wheel"?e.stateManager.hovered:e.getHitAtPosition(n);return Ud(e,r,t)}function $v(e,n){return!e||!n?e===n:e.kind===n.kind&&e.key===n.key}function $d(e,n,t){var r={event:t,preventSigmaDefault:function(){return t.preventSigmaDefault()}},a=e.dragManager.session,i=a?{kind:"node",key:a.node}:Ud(e,n,"enter"),o=e.stateManager,s=o.hovered;$v(s,i)||(s&&(Ld(e,s,!1),e.emit(Ir(s.kind,"leave"),Fr(s,r))),o.setHovered(i),i&&(Ld(e,i,!0),e.emit(Ir(i.kind,"enter"),Fr(i,r))),e.updateContainerCursor())}function Hv(e,n,t,r){r.handleResize=function(){return e.scheduleRefresh()},window.addEventListener("resize",r.handleResize),r.handleMove=function(i){e.hoverResolver.pointerMoved(cn(i))},r.handleMoveBody=function(i){var o=cn(i),s=e.dragManager;if(s.pendingNode&&!s.session){var l=e.nodeStyleAnalysis,u=l.xAttribute,d=l.yAttribute,c=e.settings;s.start(s.pendingNode,o,c.getDraggedNodes,u||"x",d||"y"),s.pendingNode=null}s.session&&(s.applyMove(o,e.settings.dragPositionToAttributes),e.emit("nodeDrag",{node:s.session.node,allDraggedNodes:s.session.allNodes,event:o}),o.preventSigmaDefault()),e.emit("moveBody",{event:o,preventSigmaDefault:function(){return o.preventSigmaDefault()}})},r.handleLeave=function(i){var o=cn(i),s={event:o,preventSigmaDefault:function(){return o.preventSigmaDefault()}};e.hoverResolver.pointerLeft(),$d(e,null,o),e.emit("leaveStage",s)},r.handleEnter=function(i){var o=cn(i);e.emit("enterStage",{event:o,preventSigmaDefault:function(){return o.preventSigmaDefault()}})};var a=function(o){return function(s){var l=cn(s),u={event:l,preventSigmaDefault:function(){return l.preventSigmaDefault()}},d=Yo(e,l,o);if(d){e.emit(Ir(d.kind,o),Fr(d,u));return}e.emit("".concat(o,"Stage"),u)}};r.handleClick=a("click"),r.handleRightClick=a("rightClick"),r.handleDoubleClick=a("doubleClick"),r.handleWheel=a("wheel"),r.handleDown=function(i){var o=cn(i),s={event:o,preventSigmaDefault:function(){return o.preventSigmaDefault()}},l=Yo(e,o,"down");if(l){l.kind==="node"&&e.settings.enableNodeDrag&&(e.dragManager.pendingNode=l.key),e.emit(Ir(l.kind,"down"),Fr(l,s));return}e.emit("downStage",s)},r.handleUp=function(i){var o=cn(i),s={event:o,preventSigmaDefault:function(){return o.preventSigmaDefault()}},l=e.dragManager.end();l&&e.emit("nodeDragEnd",H({node:l.node,allDraggedNodes:l.allNodes},s));var u=Yo(e,o,"up");if(u){e.emit(Ir(u.kind,"up"),Fr(u,s));return}e.emit("upStage",s)},n.on("mousemove",r.handleMove),n.on("mousemovebody",r.handleMoveBody),n.on("click",r.handleClick),n.on("rightClick",r.handleRightClick),n.on("doubleClick",r.handleDoubleClick),n.on("wheel",r.handleWheel),n.on("mousedown",r.handleDown),n.on("mouseup",r.handleUp),n.on("mouseleave",r.handleLeave),n.on("mouseenter",r.handleEnter),t.on("touchdown",r.handleDown),t.on("touchdown",r.handleMove),t.on("touchup",r.handleUp),t.on("touchmove",r.handleMove),t.on("tap",r.handleClick),t.on("doubletap",r.handleDoubleClick),t.on("touchmove",r.handleMoveBody)}function jv(e,n){var t=e.graph,r=new Set(["x","y","zIndex","type"]);n.eachNodeAttributesUpdatedGraphUpdate=function(a){var i,o=(i=a.hints)===null||i===void 0?void 0:i.attributes,s=!o||o.some(function(l){return r.has(l)});e.refresh({partialGraph:{nodes:t.nodes()},skipIndexation:!s,schedule:!0})},n.eachEdgeAttributesUpdatedGraphUpdate=function(a){var i,o=(i=a.hints)===null||i===void 0?void 0:i.attributes,s=o&&["zIndex","type"].some(function(l){return o?.includes(l)});e.refresh({partialGraph:{edges:t.edges()},skipIndexation:!s,schedule:!0})},n.addNodeGraphUpdate=function(a){e.refresh({partialGraph:{nodes:[a.key]},skipIndexation:!1,schedule:!0})},n.updateNodeGraphUpdate=function(a){e.refresh({partialGraph:{nodes:[a.key]},skipIndexation:!1,schedule:!0})},n.dropNodeGraphUpdate=function(a){e.removeNode(a.key),e.scheduleProcess()},n.addEdgeGraphUpdate=function(a){var i=a.key;e.markNodesDirty([a.source,a.target]),e.edgeGroups.register(i);var o=e.edgeGroups.getSiblings(i);e.refresh({partialGraph:{edges:[i].concat(Z(o))},schedule:!0})},n.updateEdgeGraphUpdate=function(a){e.refresh({partialGraph:{edges:[a.key]},skipIndexation:!1,schedule:!0})},n.dropEdgeGraphUpdate=function(a){var i=a.key;e.markNodesDirty([a.source,a.target]);var o=e.edgeGroups.getSiblings(i);e.edgeGroups.unregister(i),e.removeEdge(i);var s=U(o),l;try{for(s.s();!(l=s.n()).done;){var u=l.value;e.addEdge(u)}}catch(d){s.e(d)}finally{s.f()}e.scheduleProcess()},n.clearEdgesGraphUpdate=function(){e.clearEdgeState(),e.clearEdgeIndices(),e.refresh({schedule:!0})},n.clearGraphUpdate=function(){e.clearEdgeState(),e.clearNodeState(),e.clearEdgeIndices(),e.clearNodeIndices(),e.refresh({schedule:!0})},t.on("nodeAdded",n.addNodeGraphUpdate),t.on("nodeDropped",n.dropNodeGraphUpdate),t.on("nodeAttributesUpdated",n.updateNodeGraphUpdate),t.on("eachNodeAttributesUpdated",n.eachNodeAttributesUpdatedGraphUpdate),t.on("edgeAdded",n.addEdgeGraphUpdate),t.on("edgeDropped",n.dropEdgeGraphUpdate),t.on("edgeAttributesUpdated",n.updateEdgeGraphUpdate),t.on("eachEdgeAttributesUpdated",n.eachEdgeAttributesUpdatedGraphUpdate),t.on("edgesCleared",n.clearEdgesGraphUpdate),t.on("cleared",n.clearGraphUpdate)}function qv(e,n){e.removeListener("nodeAdded",n.addNodeGraphUpdate),e.removeListener("nodeDropped",n.dropNodeGraphUpdate),e.removeListener("nodeAttributesUpdated",n.updateNodeGraphUpdate),e.removeListener("eachNodeAttributesUpdated",n.eachNodeAttributesUpdatedGraphUpdate),e.removeListener("edgeAdded",n.addEdgeGraphUpdate),e.removeListener("edgeDropped",n.dropEdgeGraphUpdate),e.removeListener("edgeAttributesUpdated",n.updateEdgeGraphUpdate),e.removeListener("eachEdgeAttributesUpdated",n.eachEdgeAttributesUpdatedGraphUpdate),e.removeListener("edgesCleared",n.clearEdgesGraphUpdate),e.removeListener("cleared",n.clearGraphUpdate)}var Vv={x:.5,y:.5,angle:0,ratio:1},Xv=8,Yv=.001;function Kv(e){var n=e.coords,t=e.nodeData,r=e.dimensions,a=e.stagePadding,i=e.zoomToSizeRatioFunction,o=e.itemSizesReference,s=e.fitLabels,l=e.nodeLabelBox,u=Object.keys(n);if(!u.length)return e.extent;for(var d=i(1)||1,c=o==="positions",h=r.width,g=r.height,p=e.extent,m=0;m<Xv;m++){for(var b=La(p),v={width:p.x[1]-p.x[0]||1,height:p.y[1]-p.y[0]||1},x=Dt(Vv,r,v,a),y=Pd(x,b({x:0,y:0}),h,g),_=Pd(x,b({x:1,y:0}),h,g),S=Math.hypot(_.x-y.x,_.y-y.y)||1,T=1/0,A=-1/0,w=1/0,E=-1/0,R=0,L=u.length;R<L;R++){var k=u[R],P=t[k],D=P.size/d*(c?S:1),I=-D,G=D,z=-D,F=D;if(s){var M=l(P,D);M&&(M.minX<I&&(I=M.minX),M.maxX>G&&(G=M.maxX),M.minY<z&&(z=M.minY),M.maxY>F&&(F=M.maxY))}var W=n[k],X=W.x,q=W.y;T=Math.min(T,X+I/S),A=Math.max(A,X+G/S),w=Math.min(w,q-F/S),E=Math.max(E,q-z/S)}var te={x:[T,A],y:[w,E]},Q=Math.max(te.x[1]-te.x[0],te.y[1]-te.y[0])||1,ee=Math.max(Math.abs(te.x[0]-p.x[0]),Math.abs(te.x[1]-p.x[1]),Math.abs(te.y[0]-p.y[0]),Math.abs(te.y[1]-p.y[1]));if(p=te,ee/Q<Yv)break}return p}function Pd(e,n,t,r){var a=tn(e,n);return{x:(1+a.x)*t/2,y:(1-a.y)*r/2}}var Zv=typeof navigator<"u"&&/Mac|iP(hone|ad|od)/.test(navigator.platform),Qv=1500,Jv=`.sigma-gesture-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1em;
  background: #00000066;
  color: #ffffff;
  font-size: 1em;
  pointer-events: none;
  transition: opacity 0.1s;
}`;function Id(e){var n,t,r=Nn("style");r.textContent=e,document.head.appendChild(r);var a=((n=(t=r.sheet)===null||t===void 0?void 0:t.cssRules.length)!==null&&n!==void 0?n:0)>0;return r.remove(),a}var hn=null;function ey(){return hn===null&&(hn=Jv,Id("@scope {}")&&(hn=`@scope {
`.concat(hn,`
}`)),Id("@layer sigma-gesture-hint {}")&&(hn=`@layer sigma-gesture-hint {
`.concat(hn,`
}`))),hn}var ty=(function(){function e(n){ae(this,e),C(this,"hideTimeout",null),this.styleElement=Nn("style"),this.styleElement.textContent=ey(),n.appendChild(this.styleElement),this.element=Nn("div",{opacity:"0"},{class:"sigma-gesture-hint"}),n.appendChild(this.element)}return ie(e,[{key:"show",value:function(t,r){var a=this,i=t==="touch"?r.sharedGestureTouchMessage:Zv?r.sharedGestureAppleWheelMessage:r.sharedGestureWheelMessage;i&&(this.element.textContent=i,this.element.style.opacity="1",typeof this.hideTimeout=="number"&&clearTimeout(this.hideTimeout),this.hideTimeout=window.setTimeout(function(){a.hideTimeout=null,a.element.style.opacity="0"},Qv))}},{key:"kill",value:function(){typeof this.hideTimeout=="number"&&clearTimeout(this.hideTimeout),this.styleElement.remove(),this.element.remove()}}])})(),ny=(function(){function e(n){ae(this,e),C(this,"readBuffer",null),C(this,"fence",null),C(this,"result",new Uint8Array(4)),C(this,"generation",0),C(this,"readGeneration",0),C(this,"lastEvent",null),C(this,"active",!1),C(this,"dirty",!1),C(this,"rafId",null),C(this,"killed",!1),this.options=n}return ie(e,[{key:"pointerMoved",value:function(t){this.lastEvent=t,this.active=!0,!this.options.isRenderPending()&&this.request()}},{key:"pointerLeft",value:function(){this.active=!1,this.dirty=!1}},{key:"frameRendered",value:function(){this.request()}},{key:"invalidate",value:function(){this.generation++}},{key:"request",value:function(){if(!(this.killed||!this.active||!this.lastEvent)){if(this.fence){this.dirty=!0;return}this.startRead()}}},{key:"startRead",value:function(){var t=this.options,r=t.gl,a=t.getFrameBuffer,i=t.getPixelRatio,o=t.getDownSizingRatio;this.readGeneration=this.generation;var s=this.lastEvent,l=xa(r,s.x,s.y,i(),o()),u=se(l,2),d=u[0],c=u[1];this.readBuffer||(this.readBuffer=r.createBuffer()),r.bindFramebuffer(r.FRAMEBUFFER,a()),r.bindBuffer(r.PIXEL_PACK_BUFFER,this.readBuffer),r.bufferData(r.PIXEL_PACK_BUFFER,4,r.STREAM_READ),r.readPixels(d,c,1,1,r.RGBA,r.UNSIGNED_BYTE,0),r.bindBuffer(r.PIXEL_PACK_BUFFER,null),r.bindFramebuffer(r.FRAMEBUFFER,null),this.fence=r.fenceSync(r.SYNC_GPU_COMMANDS_COMPLETE,0),r.flush(),this.schedulePoll(s)}},{key:"schedulePoll",value:function(t){var r=this;this.rafId=requestAnimationFrame(function(){r.rafId=null,r.poll(t)})}},{key:"poll",value:function(t){var r=this.options,a=r.gl,i=r.onIndex;if(!(this.killed||!this.fence)){var o=a.clientWaitSync(this.fence,0,0);if(o===a.TIMEOUT_EXPIRED){this.schedulePoll(t);return}if(a.deleteSync(this.fence),this.fence=null,o!==a.WAIT_FAILED&&this.readGeneration===this.generation){a.bindBuffer(a.PIXEL_PACK_BUFFER,this.readBuffer),a.getBufferSubData(a.PIXEL_PACK_BUFFER,0,this.result),a.bindBuffer(a.PIXEL_PACK_BUFFER,null);var s=se(this.result,4),l=s[0],u=s[1],d=s[2],c=s[3];this.active&&i(Sa(l,u,d,c),t)}this.dirty&&(this.dirty=!1,this.active&&this.lastEvent&&!this.options.isRenderPending()&&this.startRead())}}},{key:"reset",value:function(){this.rafId!==null&&cancelAnimationFrame(this.rafId),this.rafId=null,this.fence=null,this.readBuffer=null,this.dirty=!1}},{key:"kill",value:function(){this.killed=!0,this.rafId!==null&&cancelAnimationFrame(this.rafId),this.rafId=null;var t=this.options.gl;this.fence&&t.deleteSync(this.fence),this.fence=null,this.readBuffer&&t.deleteBuffer(this.readBuffer),this.readBuffer=null}}])})(),Fd=(function(){function e(n,t){ae(this,e),this.key=n,this.size=t}return ie(e,null,[{key:"compare",value:function(t,r){return t.size>r.size?-1:t.size<r.size||t.key>r.key?1:-1}}])})(),ei=(function(){function e(){ae(this,e),C(this,"width",0),C(this,"height",0),C(this,"cellSize",0),C(this,"columns",0),C(this,"rows",0),C(this,"cells",{})}return ie(e,[{key:"resizeAndClear",value:function(t,r){this.width=t.width,this.height=t.height,this.cellSize=r,this.columns=Math.ceil(t.width/r),this.rows=Math.ceil(t.height/r),this.cells={}}},{key:"getIndex",value:function(t){var r=Math.floor(t.x/this.cellSize),a=Math.floor(t.y/this.cellSize);return a*this.columns+r}},{key:"add",value:function(t,r,a){var i=new Fd(t,r),o=this.getIndex(a),s=this.cells[o];s||(s=[],this.cells[o]=s),s.push(i)}},{key:"organize",value:function(){for(var t in this.cells){var r=this.cells[t];r.sort(Fd.compare)}}},{key:"getLabelsToDisplay",value:function(t,r,a){var i=this.cellSize*this.cellSize,o=i/t/t,s=o*r/i,l=Math.ceil(s),u=[];if(a)for(var d=Math.max(0,Math.floor(a.x1/this.cellSize)),c=Math.min(this.columns-1,Math.floor(a.x2/this.cellSize)),h=Math.max(0,Math.floor(a.y1/this.cellSize)),g=Math.min(this.rows-1,Math.floor(a.y2/this.cellSize)),p=h;p<=g;p++)for(var m=d;m<=c;m++){var b=p*this.columns+m,v=this.cells[b];if(v)for(var x=0;x<Math.min(l,v.length);x++)u.push(v[x].key)}else for(var y in this.cells)for(var _=this.cells[y],S=0;S<Math.min(l,_.length);S++)u.push(_[S].key);return u}}])})();function ry(e){var n=e.graph,t=e.hoveredNode,r=e.highlightedNodes,a=e.displayedNodeLabels,i=new Set,o=new Set(r);t&&o.add(t);var s=U(o),l;try{for(s.s();!(l=s.n()).done;){var u=l.value;n.hasNode(u)&&n.forEachEdge(u,function(g){i.add(g)})}}catch(g){s.e(g)}finally{s.f()}var d=U(a),c;try{var h=function(){var p=c.value;if(o.has(p))return 1;n.forEachEdge(p,function(m,b,v,x){var y=v===p?x:v;a.has(y)&&i.add(m)})};for(d.s();!(c=d.n()).done;)h()}catch(g){d.e(g)}finally{d.f()}return Array.from(i)}var Hn=150,jn=50,ay={both:0,node:1,label:2},iy={over:0,above:1,below:2,auto:3},Md=12,oy=3,sy=(function(){function e(n){ae(this,e),C(this,"labelGrid",new ei),C(this,"edgeAnchorGrid",new ei),C(this,"displayedNodeLabels",new Set),C(this,"displayedEdgeLabels",new Set),C(this,"edgeLabelCandidates",[]),C(this,"renderedNodeLabels",new Set),C(this,"labelSizeCache",new Map),C(this,"framePassPoints",new Float32Array(0)),C(this,"labelsDirty",!0),this.internals=n}return ie(e,[{key:"resetFrame",value:function(){this.displayedNodeLabels=new Set,this.renderedNodeLabels=new Set,this.labelSizeCache.clear()}},{key:"clearEdgeLabels",value:function(){this.displayedEdgeLabels=new Set}},{key:"resetLabelGrid",value:function(){this.labelGrid=new ei,this.edgeAnchorGrid=new ei}},{key:"processWebGLLabels",value:function(t){for(var r,a=this.internals,i=a.labelProgram,o=a.primitives,s=a.nodeDataCache,l=(o==null||(r=o.nodes)===null||r===void 0||(r=r.label)===null||r===void 0||(r=r.font)===null||r===void 0?void 0:r.family)||"sans-serif",u=new Map,d=0,c=t.length;d<c;d++){var h=t[d],g=s[h];if(!(g.visibility==="hidden"||!g.label)){var p=g.labelFont||l,m=u.get(p);m?m.push(g.label):u.set(p,[g.label])}}var b=U(u),v;try{for(b.s();!(v=b.n()).done;){var x=se(v.value,2),y=x[0],_=x[1],S=Fa(y),T=S.family,A=S.weight,w=S.style,E=i.registerFont(T,A,w);i.ensureGlyphsReady(_,E)}}catch(R){b.e(R)}finally{b.f()}}},{key:"measureNodeLabel",value:function(t){var r,a;if(!t.label)return{width:0,height:0,textHeight:0};var i=this.internals,o=i.labelProgram,s=i.primitives,l=(r=t.labelSize)!==null&&r!==void 0?r:14,u=t.labelFont||(s==null||(a=s.nodes)===null||a===void 0||(a=a.label)===null||a===void 0||(a=a.font)===null||a===void 0?void 0:a.family)||"sans-serif",d="".concat(t.label,"|").concat(l,"|").concat(u);if(this.labelSizeCache.has(d))return this.labelSizeCache.get(d);var c=Fa(u),h=c.family,g=c.weight,p=c.style,m=o.registerFont(h,g,p),b=o.measureLabel(t.label,l,m);return this.labelSizeCache.set(d,b),b}},{key:"nodeLabelBox",value:function(t,r){var a,i,o,s,l;if(t.visibility==="hidden"||t.labelVisibility==="hidden")return null;var u=this.measureNodeLabel(t),d=u.width,c=u.height,h=u.textHeight;if(!d)return null;var g=(a=(i=this.internals.primitives)===null||i===void 0||(i=i.nodes)===null||i===void 0||(i=i.label)===null||i===void 0?void 0:i.margin)!==null&&a!==void 0?a:un,p=r+g,m=t.labelBackgroundColor?(o=t.labelBackgroundPadding)!==null&&o!==void 0?o:qa:0,b=d/2,v=c/2,x=b+m,y=v+m,_=h/2,S=0,T=0;switch((s=t.labelPosition)!==null&&s!==void 0?s:"right"){case"left":S=-(p+b);break;case"above":T=-(p+_);break;case"below":T=p+_;break;case"over":break;default:S=p+b}var A=(l=t.labelAngle)!==null&&l!==void 0?l:0,w=ba({x:S,y:T},A),E=w.x,R=w.y,L=Math.abs(Math.cos(A)),k=Math.abs(Math.sin(A)),P=L*x+k*y,D=k*x+L*y;return{minX:E-P,maxX:E+P,minY:R-D,maxY:R+D}}},{key:"computeDisplayedNodeLabels",value:function(){var t=this.internals.getCameraState(),r=this.internals.getDimensions(),a=r.width,i=r.height,o=this.internals.viewportToFramedGraph({x:-Hn,y:-jn}),s=this.internals.viewportToFramedGraph({x:a+Hn,y:-jn}),l=this.internals.viewportToFramedGraph({x:-Hn,y:i+jn}),u=this.internals.viewportToFramedGraph({x:a+Hn,y:i+jn}),d=Math.min(o.x,s.x,l.x,u.x),c=Math.max(o.x,s.x,l.x,u.x),h=Math.min(o.y,s.y,l.y,u.y),g=Math.max(o.y,s.y,l.y,u.y),p=Dt({x:.5,y:.5,ratio:1,angle:0},{width:a,height:i},this.internals.getGraphDimensions(),this.internals.getStagePadding()),m=function(M){var W=tn(p,M);return{x:(1+W.x)*a/2,y:(1-W.y)*i/2}},b=m({x:d,y:h}),v=m({x:c,y:h}),x=m({x:d,y:g}),y=m({x:c,y:g}),_={x1:Math.min(b.x,v.x,x.x,y.x),y1:Math.min(b.y,v.y,x.y,y.y),x2:Math.max(b.x,v.x,x.x,y.x),y2:Math.max(b.y,v.y,x.y,y.y)},S=this.internals,T=S.settings,A=S.nodeDataCache,w=S.nodesWithForcedLabels,E=this.labelGrid.getLabelsToDisplay(t.ratio,T.labelDensity,_);To(E,w);for(var R=0,L=E.length;R<L;R++){var k=E[R],P=A[k];if(!this.displayedNodeLabels.has(k)&&!(P.visibility==="hidden"||P.labelVisibility==="hidden")&&P.label&&!(P.x<d||P.x>c||P.y<h||P.y>g)){var D=this.internals.framedGraphToViewport(P),I=D.x,G=D.y,z=this.internals.scaleSize(P.size);!Wt(P)&&z<T.labelRenderedSizeThreshold||I<-Hn-z||I>a+Hn+z||G<-jn-z||G>i+jn+z||this.displayedNodeLabels.add(k)}}}},{key:"buildFramePassPoints",value:function(){var t=this.internals,r=t.nodeDataCache,a=t.nodeDataTexture;if(!a)return{data:this.framePassPoints,count:0};var i=this.displayedNodeLabels.size*3;this.framePassPoints.length<i&&(this.framePassPoints=new Float32Array(i));var o=this.framePassPoints,s=0,l=U(this.displayedNodeLabels),u;try{for(l.s();!(u=l.n()).done;){var d,c,h=u.value,g=r[h];if(g){var p=a.getIndex(h);p<0||(o[s*3]=p,o[s*3+1]=(d=ln[g.labelPosition||Ct.labelPosition])!==null&&d!==void 0?d:0,o[s*3+2]=(c=g.labelAngle)!==null&&c!==void 0?c:0,s++)}}}catch(m){l.e(m)}finally{l.f()}return{data:o,count:s}}},{key:"renderWebGLLabels",value:function(t,r){var a=this.internals,i=a.nodeDataCache,o=a.labelProgram,s=a.primitives,l=a.nodeDataTexture,u=[],d=U(this.displayedNodeLabels),c;try{for(d.s();!(c=d.n()).done;){var h=c.value;if(!this.renderedNodeLabels.has(h)){var g=i[h];r&&g.labelDepth!==r||(this.renderedNodeLabels.add(h),u.push(h))}}}catch(Oe){d.e(Oe)}finally{d.f()}if(u.length!==0){if(this.labelsDirty){for(var p,m,b,v=0,x=0,y=u.length;x<y;x++){var _=i[u[x]];v+=_.label.length}o.reallocate(v);for(var S=14,T=(p=s==null||(m=s.nodes)===null||m===void 0||(m=m.label)===null||m===void 0?void 0:m.margin)!==null&&p!==void 0?p:un,A=Ct.labelPosition,w=(s==null||(b=s.nodes)===null||b===void 0||(b=b.label)===null||b===void 0||(b=b.font)===null||b===void 0?void 0:b.family)||"sans-serif",E=new Map,R=0,L=0,k=u.length;L<k;L++){var P,D,I,G,z=u[L],F=i[z],M=F.labelFont||w,W=E.get(M);if(W===void 0){var X=Fa(M),q=X.family,te=X.weight,Q=X.style;W=o.registerFont(q,te,Q),E.set(M,W)}var ee={text:F.label,x:F.x,y:F.y,size:(P=F.labelSize)!==null&&P!==void 0?P:S,color:F.labelColor,nodeSize:F.size,margin:T,position:(D=F.labelPosition)!==null&&D!==void 0?D:A,hidden:!1,forceLabel:Wt(F),type:"default",zIndex:(I=F.zIndex)!==null&&I!==void 0?I:0,parentType:"node",parentKey:z,fontKey:W,labelAngle:(G=F.labelAngle)!==null&&G!==void 0?G:0,nodeIndex:l.getIndex(z)},ot=o.processLabel(z,R,ee);R+=ot}o.invalidateBuffers()}o.render(t)}}},{key:"renderBackdrops",value:function(t,r){var a=this.internals,i=a.backdropProgram,o=a.nodeDataCache,s=a.nodesWithBackdrop,l=a.attachmentManager,u=a.pixelRatio,d=a.nodeDataTexture,c=[],h=U(s),g;try{for(h.s();!(g=h.n()).done;){var p,m=g.value,b=o[m];if(!(!b||b.visibility==="hidden")&&!(r&&b.depth!==r)){var v=(p=d?.getIndex(m))!==null&&p!==void 0?p:-1;v<0||c.push({key:m,nodeIndex:v})}}}catch(en){h.e(en)}finally{h.f()}if(c.length!==0){i.reallocate(c.length);for(var x=0;x<c.length;x++){var y,_,S,T,A,w,E,R,L=c[x],k=L.key,P=L.nodeIndex,D=o[k],I=this.displayedNodeLabels.has(k),G=I?this.measureNodeLabel(D):{width:0,height:0,textHeight:0},z=G.textHeight,F=G.width,M=G.height,W=0,X=0;if(I&&D.labelAttachment&&l){var q=l.getEntry(k,D.labelAttachment);if(q){var te=D.labelAttachmentPlacement||"below";if(te==="below"||te==="above"){var Q=q.height/u;M+=Q+qt,F=Math.max(F,q.width/u),X=te==="below"?(Q+qt)/2:-(Q+qt)/2}else{var ee=q.width/u;F+=ee+qt,M=Math.max(M,q.height/u),W=te==="right"?(ee+qt)/2:-(ee+qt)/2}}}var ot=D.backdropColor?kt(D.backdropColor):[255,255,255,255],Oe=D.backdropShadowColor?kt(D.backdropShadowColor):[0,0,0,128],Et=ot.map(function(en){return en/255}),wn=Oe.map(function(en){return en/255}),sr=(y=D.backdropShadowBlur)!==null&&y!==void 0?y:12,lr=(_=D.backdropPadding)!==null&&_!==void 0?_:6,ur=D.backdropBorderColor?kt(D.backdropBorderColor):[0,0,0,0],Yf=ur.map(function(en){return en/255}),Kf=(S=D.backdropBorderWidth)!==null&&S!==void 0?S:0,Zf=(T=D.backdropCornerRadius)!==null&&T!==void 0?T:0,vl=(A=D.backdropLabelPadding)!==null&&A!==void 0?A:-1,Qf=vl<0?lr:vl,Jf=(w=ay[(E=D.backdropArea)!==null&&E!==void 0?E:"both"])!==null&&w!==void 0?w:0,eg={key:k,nodeIndex:P,label:D.label,labelWidth:F,labelHeight:M,textHeight:z,type:"default",position:D.labelPosition||Ct.labelPosition,labelAngle:(R=D.labelAngle)!==null&&R!==void 0?R:0,backdropColor:Et,backdropShadowColor:wn,backdropShadowBlur:sr,backdropPadding:lr,backdropBorderColor:Yf,backdropBorderWidth:Kf,backdropCornerRadius:Zf,backdropLabelPadding:Qf,backdropArea:Jf,labelBoxOffset:[W,X]};i.processBackdrop(x,eg)}i.invalidateBuffers(),i.render(t)}}},{key:"renderLabelBackgrounds",value:function(t,r){var a=this.internals,i=a.labelBackgroundProgram,o=a.nodeDataCache,s=a.nodeDataTexture,l=Fe.nodeLabel.writesPickingThisFrame(this.internals),u=[],d=U(this.displayedNodeLabels),c;try{for(d.s();!(c=d.n()).done;){var h=c.value,g=o[h];!g||g.visibility==="hidden"||r&&g.labelDepth!==r||!l&&!g.labelBackgroundColor||u.push(h)}}catch(P){d.e(P)}finally{d.f()}if(u.length!==0){i.reallocate(u.length);for(var p=0;p<u.length;p++){var m,b,v,x,y=u[p],_=o[y],S=(m=s?.getIndex(y))!==null&&m!==void 0?m:-1;if(!(S<0)){var T=this.measureNodeLabel(_),A=T.width,w=T.height,E=T.textHeight,R=fn(this.internals.pickingState,"nodeLabel",y)||fn(this.internals.pickingState,"node",y),L=_.labelBackgroundColor?$e(_.labelBackgroundColor):$e("transparent"),k={nodeIndex:S,id:nn(R),color:L,labelWidth:A,labelHeight:w,textHeight:E,positionMode:(b=ln[_.labelPosition||Ct.labelPosition])!==null&&b!==void 0?b:0,labelAngle:(v=_.labelAngle)!==null&&v!==void 0?v:0,padding:(x=_.labelBackgroundPadding)!==null&&x!==void 0?x:qa};i.processLabelBackground(p,k)}}i.invalidateBuffers(),i.render(t)}}},{key:"cacheAttachments",value:function(t){var r=this.internals,a=r.attachmentManager,i=r.pixelRatio,o=r.nodeDataCache,s=r.nodesWithBackdrop,l=r.graph;if(a){var u=U(s),d;try{for(u.s();!(d=u.n()).done;){var c=d.value;if(this.displayedNodeLabels.has(c)){var h=o[c];if(!(!h||h.visibility==="hidden")&&!(t&&h.depth!==t)&&h.labelAttachment){var g=l.getNodeAttributes(c),p=this.measureNodeLabel(h),m=p.width,b=p.height,v={node:c,attributes:g,pixelRatio:i,labelWidth:m,labelHeight:b};a.renderAttachment(c,h.labelAttachment,v)}}}}catch(x){u.e(x)}finally{u.f()}a.regenerateAtlas()}}},{key:"renderAttachments",value:function(t,r){var a=this.internals,i=a.attachmentManager,o=a.attachmentProgram,s=a.nodeDataCache,l=a.nodesWithBackdrop,u=a.pixelRatio,d=a.nodeDataTexture;if(!(!i||!o)){var c=0;o.reallocateAttachments(l.size);var h=U(l),g;try{for(h.s();!(g=h.n()).done;){var p,m,b,v,x=g.value;if(this.displayedNodeLabels.has(x)){var y=s[x];if(!(!y||y.visibility==="hidden")&&!(r&&y.labelDepth!==r)&&y.labelAttachment){var _=i.getEntry(x,y.labelAttachment);if(_){var S=(p=d?.getIndex(x))!==null&&p!==void 0?p:-1;if(!(S<0)){var T=this.measureNodeLabel(y),A=T.width,w=T.height,E=T.textHeight,R=(m=Gu[y.labelAttachmentPlacement||"below"])!==null&&m!==void 0?m:0;o.processAttachment(c,{nodeIndex:S,atlasX:_.x,atlasY:_.y,atlasW:_.width,atlasH:_.height,attachWidth:_.width/u,attachHeight:_.height/u,positionMode:(b=ln[y.labelPosition||Ct.labelPosition])!==null&&b!==void 0?b:0,attachmentPlacement:R,labelWidth:A,labelHeight:w,textHeight:E,labelAngle:(v=y.labelAngle)!==null&&v!==void 0?v:0}),c++}}}}}}catch(L){h.e(L)}finally{h.f()}c!==0&&(o.reallocateAttachments(c),i.bindTexture(kr),o.invalidateBuffers(),o.render(t))}}},{key:"computeDisplayedEdgeLabels",value:function(){var t=this.internals,r=t.graph,a=t.stateManager,i=t.settings,o=t.edgesWithForcedLabels,s=a.getHighlightedNodes(),l=i.edgeLabelAnchors==="allNodes"?new Set(this.edgeAnchorGrid.getLabelsToDisplay(this.internals.getCameraState().ratio,i.labelDensity)):this.displayedNodeLabels,u=a.hovered,d=ry({graph:r,hoveredNode:u?.kind==="node"?u.key:null,displayedNodeLabels:l,highlightedNodes:s});To(d,o),this.edgeLabelCandidates=d,this.displayedEdgeLabels=new Set}},{key:"filterEdgeLabelsForDepth",value:function(t){for(var r=this.internals,a=r.graph,i=r.nodeDataCache,o=r.edgeDataCache,s=[],l=new Set,u=0,d=this.edgeLabelCandidates.length;u<d;u++){var c=this.edgeLabelCandidates[u];if(!l.has(c)){l.add(c);var h=a.extremities(c),g=i[h[0]],p=i[h[1]],m=o[c];!m||!g||!p||m.visibility==="hidden"||m.labelVisibility==="hidden"||g.visibility==="hidden"||p.visibility==="hidden"||t&&m.labelDepth!==t||m.label&&s.push(c)}}return s}},{key:"renderEdgeLabels",value:function(t,r){var a=this.internals,i=a.graph,o=a.nodeDataCache,s=a.edgeDataCache,l=a.primitives,u=a.edgeLabelProgram,d=a.nodeDataTexture,c=a.edgeDataTexture;if(u){var h=this.filterEdgeLabelsForDepth(r),g=U(h),p;try{for(g.s();!(p=g.n()).done;){var m=p.value;this.displayedEdgeLabels.add(m)}}catch(ee){g.e(ee)}finally{g.f()}if(h.length!==0){if(this.labelsDirty){var b,v,x=0,y=U(h),_;try{for(y.s();!(_=y.n()).done;){var S=_.value;x+=s[S].label.length}}catch(ee){y.e(ee)}finally{y.f()}u.reallocate(x);var T=(b=l==null||(v=l.edges)===null||v===void 0||(v=v.label)===null||v===void 0?void 0:v.margin)!==null&&b!==void 0?b:5,A="over",w=0,E=U(h),R;try{for(E.s();!(R=E.n()).done;){var L,k,P=R.value,D=i.extremities(P),I=D[0],G=D[1],z=o[I],F=o[G],M=s[P],W=d.getIndex(I),X=d.getIndex(G),q=c.getIndex(P),te={text:M.label,x:(z.x+F.x)/2,y:(z.y+F.y)/2,size:Md,color:M.labelColor,nodeSize:0,nodeIndex:-1,margin:T,position:(L=M.labelPosition)!==null&&L!==void 0?L:A,hidden:!1,forceLabel:Wt(M),type:"default",zIndex:(k=M.zIndex)!==null&&k!==void 0?k:0,parentType:"edge",parentKey:P,fontKey:"",labelAngle:0,sourceX:z.x,sourceY:z.y,targetX:F.x,targetY:F.y,sourceSize:z.size,targetSize:F.size,sourceShape:z.shape||"circle",targetShape:F.shape||"circle",edgeSize:M.size,offset:0,edgeAttributes:M,sourceNodeIndex:W,targetNodeIndex:X,edgeIndex:q},Q=u.processEdgeLabel(P,w,te);w+=Q}}catch(ee){E.e(ee)}finally{E.f()}u.invalidateBuffers()}u.render(t)}}}},{key:"renderEdgeLabelBackgrounds",value:function(t,r){var a,i,o=this.internals,s=o.edgeLabelBackgroundProgram,l=o.edgeLabelProgram,u=o.edgeDataCache,d=o.primitives,c=o.edgeDataTexture;if(!(!c||!l||!s)){var h=Fe.edgeLabel.writesPickingThisFrame(this.internals),g=(a=d==null||(i=d.edges)===null||i===void 0||(i=i.label)===null||i===void 0?void 0:i.margin)!==null&&a!==void 0?a:5,p="over",m=this.filterEdgeLabelsForDepth(r),b=[],v=U(m),x;try{for(v.s();!(x=v.n()).done;){var y=x.value;!h&&!u[y].labelBackgroundColor||b.push(y)}}catch(z){v.e(z)}finally{v.f()}if(b.length!==0){s.reallocate(b.length);for(var _=0;_<b.length;_++){var S,T,A,w=b[_],E=u[w],R=E.label,L=l.measureLabelAtlasWidth(R),k=(S=E.labelPosition)!==null&&S!==void 0?S:p,P=typeof k=="string"&&(T=iy[k])!==null&&T!==void 0?T:0,D=fn(this.internals.pickingState,"edgeLabel",w)||fn(this.internals.pickingState,"edge",w),I=E.labelBackgroundColor?$e(E.labelBackgroundColor):$e("transparent"),G={edgeIndex:c.getIndex(w),baseFontSize:Md,totalTextWidth:L,positionMode:P,margin:g,padding:(A=E.labelBackgroundPadding)!==null&&A!==void 0?A:oy,color:I,id:nn(D),edgeAttributes:E};s.processEdgeLabelBackground(_,w,G)}s.invalidateBuffers(),s.render(t)}}}}])})(),ly=(function(){function e(n,t,r,a){ae(this,e),C(this,"nodeStates",new Map),C(this,"edgeStates",new Map),C(this,"hovered",null),C(this,"dirtyNodes",new Set),C(this,"dirtyEdges",new Set),C(this,"graphStateChanged",!1),C(this,"graphStateFlagsDirty",!1),this.scheduleRefresh=n,this.customNodeStateDefaults=t,this.customEdgeStateDefaults=r,this.customGraphStateDefaults=a,this.graphState=mo(a)}return ie(e,[{key:"getNodeState",value:function(t){t=""+t;var r=this.nodeStates.get(t);return r||(r=iu(this.customNodeStateDefaults),this.nodeStates.set(t,r)),r}},{key:"getEdgeState",value:function(t){t=""+t;var r=this.edgeStates.get(t);return r||(r=ou(this.customEdgeStateDefaults),this.edgeStates.set(t,r)),r}},{key:"getGraphState",value:function(){return this.flushGraphStateFlags(),this.graphState}},{key:"getHighlightedNodes",value:function(){var t=new Set,r=U(this.nodeStates),a;try{for(r.s();!(a=r.n()).done;){var i=se(a.value,2),o=i[0],s=i[1];s.isHighlighted&&t.add(o)}}catch(l){r.e(l)}finally{r.f()}return t}},{key:"setNodeState",value:function(t,r){t=""+t;var a=this.getNodeState(t);if(Mn(a,r)){var i=H(H({},a),r);this.nodeStates.set(t,i),this.dirtyNodes.add(t),this.updateHoveredNodeTracking(t,a,i),this.graphStateFlagsDirty=!0,this.scheduleRefresh()}}},{key:"setEdgeState",value:function(t,r){t=""+t;var a=this.getEdgeState(t);if(Mn(a,r)){var i=H(H({},a),r);this.edgeStates.set(t,i),this.dirtyEdges.add(t),this.updateHoveredEdgeTracking(t,a,i),this.graphStateFlagsDirty=!0,this.scheduleRefresh()}}},{key:"setGraphState",value:function(t){if(Mn(this.graphState,t)){var r=H(H({},this.graphState),t);r.isIdle=!r.isPanning&&!r.isZooming&&!r.isDragging,this.graphState=r,this.graphStateChanged=!0,this.scheduleRefresh()}}},{key:"setNodesState",value:function(t,r){var a=!1,i=U(t),o;try{for(i.s();!(o=i.n()).done;){var s=o.value;s=""+s;var l=this.getNodeState(s);if(Mn(l,r)){var u=H(H({},l),r);this.nodeStates.set(s,u),this.dirtyNodes.add(s),this.updateHoveredNodeTracking(s,l,u),a=!0}}}catch(d){i.e(d)}finally{i.f()}a&&(this.graphStateFlagsDirty=!0,this.scheduleRefresh())}},{key:"setEdgesState",value:function(t,r){var a=!1,i=U(t),o;try{for(i.s();!(o=i.n()).done;){var s=o.value;s=""+s;var l=this.getEdgeState(s);if(Mn(l,r)){var u=H(H({},l),r);this.edgeStates.set(s,u),this.dirtyEdges.add(s),this.updateHoveredEdgeTracking(s,l,u),a=!0}}}catch(d){i.e(d)}finally{i.f()}a&&(this.graphStateFlagsDirty=!0,this.scheduleRefresh())}},{key:"markNodesDirty",value:function(t){var r=U(t),a;try{for(r.s();!(a=r.n()).done;){var i=a.value;this.dirtyNodes.add(i)}}catch(o){r.e(o)}finally{r.f()}this.scheduleRefresh()}},{key:"removeNode",value:function(t){this.nodeStates.delete(t),this.dirtyNodes.delete(t),this.clearHoveredFor("node",t),this.graphStateFlagsDirty=!0,this.scheduleRefresh()}},{key:"removeEdge",value:function(t){this.edgeStates.delete(t),this.dirtyEdges.delete(t),this.clearHoveredFor("edge",t),this.graphStateFlagsDirty=!0,this.scheduleRefresh()}},{key:"pruneNodes",value:function(t){var r=U(this.nodeStates.keys()),a;try{for(r.s();!(a=r.n()).done;){var i=a.value;t(i)||this.removeNode(i)}}catch(o){r.e(o)}finally{r.f()}}},{key:"pruneEdges",value:function(t){var r=U(this.edgeStates.keys()),a;try{for(r.s();!(a=r.n()).done;){var i=a.value;t(i)||this.removeEdge(i)}}catch(o){r.e(o)}finally{r.f()}}},{key:"clearNodes",value:function(){this.nodeStates.clear(),this.dirtyNodes.clear(),this.clearHoveredForKinds(ni("node")),this.graphStateFlagsDirty=!0,this.scheduleRefresh()}},{key:"clearEdges",value:function(){this.edgeStates.clear(),this.dirtyEdges.clear(),this.clearHoveredForKinds(ni("edge")),this.graphStateFlagsDirty=!0,this.scheduleRefresh()}},{key:"resetGraphState",value:function(){this.graphState=mo(this.customGraphStateDefaults),this.graphStateChanged=!1,this.graphStateFlagsDirty=!1}},{key:"clearDirtyTracking",value:function(){this.dirtyNodes.clear(),this.dirtyEdges.clear(),this.graphStateChanged=!1}},{key:"setHovered",value:function(t){this.hovered=t}},{key:"clearHoveredFor",value:function(t,r){this.hovered&&this.hovered.key===r&&ni(t).includes(this.hovered.kind)&&(this.hovered=null)}},{key:"clearHoveredForKinds",value:function(t){this.hovered&&t.includes(this.hovered.kind)&&(this.hovered=null)}},{key:"updateGraphStateFromNodes",value:function(){var t,r=!1,a=!1,i=!1,o=U(this.nodeStates),s;try{for(o.s();!(s=o.n()).done;){var l=se(s.value,2),u=l[1];if(u.isHovered&&(r=!0),u.isHighlighted&&(a=!0),u.isDragged&&(i=!0),r&&a&&i)break}}catch(c){o.e(c)}finally{o.f()}!r&&((t=this.hovered)===null||t===void 0?void 0:t.kind)==="edge"&&(r=!0);var d=!this.graphState.isPanning&&!this.graphState.isZooming&&!i;(this.graphState.hasHovered!==r||this.graphState.hasHighlighted!==a||this.graphState.isDragging!==i||this.graphState.isIdle!==d)&&(this.graphStateChanged=!0),this.graphState=H(H({},this.graphState),{},{hasHovered:r,hasHighlighted:a,isDragging:i,isIdle:d})}},{key:"updateGraphStateFromEdges",value:function(){var t,r=((t=this.hovered)===null||t===void 0?void 0:t.kind)==="node";if(!r){var a=U(this.edgeStates),i;try{for(a.s();!(i=a.n()).done;){var o=se(i.value,2),s=o[1];if(s.isHovered){r=!0;break}}}catch(l){a.e(l)}finally{a.f()}}this.graphState.hasHovered!==r&&(this.graphStateChanged=!0),this.graphState=H(H({},this.graphState),{},{hasHovered:r})}},{key:"flushGraphStateFlags",value:function(){this.graphStateFlagsDirty&&(this.updateGraphStateFromNodes(),this.updateGraphStateFromEdges(),this.graphStateFlagsDirty=!1)}},{key:"updateHoveredNodeTracking",value:function(t,r,a){var i;if(r.isHovered!==a.isHovered)if(a.isHovered){var o;if(((o=this.hovered)===null||o===void 0?void 0:o.kind)==="node"&&this.hovered.key!==t){var s=this.hovered.key,l=this.getNodeState(s);this.nodeStates.set(s,H(H({},l),{},{isHovered:!1})),this.dirtyNodes.add(s)}this.hovered={kind:"node",key:t}}else((i=this.hovered)===null||i===void 0?void 0:i.kind)==="node"&&this.hovered.key===t&&(this.hovered=null)}},{key:"updateHoveredEdgeTracking",value:function(t,r,a){var i;if(r.isHovered!==a.isHovered)if(a.isHovered){var o;if(((o=this.hovered)===null||o===void 0?void 0:o.kind)==="edge"&&this.hovered.key!==t){var s=this.hovered.key,l=this.getEdgeState(s);this.edgeStates.set(s,H(H({},l),{},{isHovered:!1})),this.dirtyEdges.add(s)}this.hovered={kind:"edge",key:t}}else((i=this.hovered)===null||i===void 0?void 0:i.kind)==="edge"&&this.hovered.key===t&&(this.hovered=null)}}])})(),Nd=1,zd=2,Gd=3,Od=4,uy=(function(e){function n(t,r){var a,i,o,s,l,u=arguments.length>2&&arguments[2]!==void 0?arguments[2]:{};ae(this,n),l=ye(this,n),C(l,"nodeReducer",null),C(l,"edgeReducer",null),C(l,"stageCanvas",null),C(l,"mouseLayer",null),C(l,"gestureHint",null),C(l,"extraElements",{}),C(l,"webGLContext",null),C(l,"pickingFrameBuffer",null),C(l,"pickingTexture",null),C(l,"pickingDepthBuffer",null),C(l,"activeListeners",{}),C(l,"nodeVariableEntries",[]),C(l,"edgeVariableEntries",[]),C(l,"edgePathsByName",new Map),C(l,"nodeProgramIndex",{}),C(l,"edgeProgramIndex",{}),C(l,"edgeTextureIndexCache",{}),C(l,"nodeGraphCoords",{}),C(l,"nodeExtent",{x:[0,1],y:[0,1]}),C(l,"matrix",Ue()),C(l,"invMatrix",Ue()),C(l,"correctionRatio",1),C(l,"frameId",0),C(l,"customBBox",null),C(l,"gpuTimerExt",void 0),C(l,"activeGpuTimerQuery",null),C(l,"pendingGpuTimerQueries",[]),C(l,"normalizationFunction",La({x:[0,1],y:[0,1]})),C(l,"graphToViewportRatio",1),C(l,"pickingState",zv()),C(l,"prevNodeVisibilities",{}),C(l,"width",0),C(l,"height",0),C(l,"autoRescaleFrozen",!1),C(l,"stylesDeclaration",null),C(l,"resolvedStageStyle",{}),C(l,"renderFrame",null),C(l,"contextLost",!1),C(l,"pendingProcess","full"),C(l,"needToRefreshState",!1),C(l,"checkEdgesEventsFrame",null),C(l,"edgeStyleAnalysis",{dependency:"static",xAttribute:null,yAttribute:null}),C(l,"depthLayers",Z(Ea)),C(l,"customLayerPrograms",new Map),C(l,"nodeShapeSlug",null),C(l,"sdfAtlas",null),C(l,"depthRanges",{nodes:{},edges:{}}),C(l,"nodeBaseDepth",{}),C(l,"edgeBaseDepth",{});var d=u.primitives,c=u.styles,h=u.settings,g=h===void 0?{}:h,p=u.nodeReducer,m=u.edgeReducer,b=u.customNodeState,v=u.customEdgeState,x=u.customGraphState;l.stateManager=new ly(function(){return l.scheduleStateRefresh()},b,v,x);var y=d??uu;l.stylesDeclaration=c?{nodes:(a=c.nodes)!==null&&a!==void 0?a:Ra.nodes,edges:(i=c.edges)!==null&&i!==void 0?i:Ra.edges,stage:c.stage}:Ra,l.nodeReducer=p??null,l.edgeReducer=m??null;var _=vo(l.stylesDeclaration.nodes);l.nodeReducer&&(_.dependency="graph-state"),l.edgeStyleAnalysis=vo(l.stylesDeclaration.edges),l.edgeReducer&&(l.edgeStyleAnalysis.dependency="graph-state"),l.stylesDeclaration.stage&&(l.resolvedStageStyle=_o(l.stylesDeclaration.stage,l.stateManager.graphState));var S=mu(g);if(Ia(S),S.enableNodeDrag){var T=_.xAttribute,A=_.yAttribute;if((!T||!A)&&!S.dragPositionToAttributes)throw new Error('Sigma: `enableNodeDrag` is true but position attribute names could not be inferred from styles. Either use attribute bindings for x/y in your node styles (e.g. `x: { attribute: "x" }`), or provide a `dragPositionToAttributes` setting.')}if(pu(t),!(r instanceof HTMLElement))throw new Error("Sigma: container should be an html element.");l.container=r,l.edgeGroups=new Nv(t,function(F,M){for(var W=0;W<F.length;W++){var X=l.stateManager.getEdgeState(F[W]);X.parallelIndex=W,X.parallelCount=M}});var w=new Mv(t,l.viewportToGraph.bind(l),l.setNodesState.bind(l),function(F,M){return l.emit(F,M)});if(l.depthLayers=(o=y.depthLayers)!==null&&o!==void 0?o:Z(Ea),!(c!=null&&c.nodes)&&!_a.every(function(F){return l.depthLayers.includes(F)}))throw new Error("Sigma: depthLayers must include ".concat(_a.join(", ")," for the built-in node styles."));if(!(c!=null&&c.edges)&&!Ta.every(function(F){return l.depthLayers.includes(F)}))throw new Error("Sigma: depthLayers must include ".concat(Ta.join(", ")," for the built-in edge styles."));l.itemBuckets={nodes:new qo(l.depthLayers),edges:new qo(l.depthLayers)},l.initWebGLContext(),l.mouseLayer=Nn("div",{position:"absolute",touchAction:"none",userSelect:"none"},{class:"sigma-mouse"}),l.container.appendChild(l.mouseLayer),l.resolvedStageStyle.background&&(l.container.style.backgroundColor=l.resolvedStageStyle.background),l.resolvedStageStyle.cursor&&(l.container.style.cursor=l.resolvedStageStyle.cursor);var E=new xd(l.webGLContext),R=new Vo(l.webGLContext,{channels:1}),L=new Sd(l.webGLContext),k=new Vo(l.webGLContext,{channels:4}),P=l.webGLContext,D=new ny({gl:P,getFrameBuffer:function(){return l.pickingFrameBuffer},getPixelRatio:function(){return l.internals.pixelRatio},getDownSizingRatio:function(){return l.internals.settings.pickingDownSizingRatio},isRenderPending:function(){return l.renderFrame!==null},onIndex:function(M,W){var X;return $d(l.internals,(X=l.pickingState.lookup[M])!==null&&X!==void 0?X:null,W)}}),I=l.initPrograms(y,S),G=y==null||(s=y.nodes)===null||s===void 0?void 0:s.labelAttachments,z=null;return G&&Object.keys(G).length>0&&(z=new bd(P,G,function(){return l.scheduleRender()})),l.internals=H(H({nodeDataCache:{},edgeDataCache:{},nodesWithForcedLabels:new Set,nodesWithBackdrop:new Set,edgesWithForcedLabels:new Set,settings:S,primitives:y,pixelRatio:_r(),graph:t,stateManager:l.stateManager,dragManager:w,hoverResolver:D,nodeStyleAnalysis:_,pickingState:l.pickingState},I),{},{attachmentManager:z,nodeDataTexture:E,nodeFrameTexture:R,edgeDataTexture:L,edgeFrameTexture:k,getDimensions:function(){return l.getDimensions()},getGraphDimensions:function(){return l.getGraphDimensions()},getStagePadding:function(){return l.getStagePadding()},getCameraState:function(){return l.camera.getState()},getHitAtPosition:function(M){return l.getHitAtPosition(M)},setNodeState:function(M,W){return l.setNodeState(M,W)},setEdgeState:function(M,W){return l.setEdgeState(M,W)},updateContainerCursor:function(){return l.updateContainerCursor()},scheduleRefresh:function(){return l.scheduleRefresh()},viewportToFramedGraph:function(M){return l.viewportToFramedGraph(M)},viewportToGraph:function(M){return l.viewportToGraph(M)},framedGraphToViewport:function(M){return l.framedGraphToViewport(M)},scaleSize:function(M){return l.scaleSize(M)},emit:function(M,W){return l.emit(M,W)}}),l.labelRenderer=new sy(l.internals),l.resize(),l.initializeWebGLLabels(),l.camera=new Ed,l.bindCameraHandlers(),l.mouseCaptor=new Lv(l.mouseLayer,l),l.mouseCaptor.setSettings(l.internals.settings),l.touchCaptor=new Fv(l.mouseLayer,l),l.touchCaptor.setSettings(l.internals.settings),l.bindEventHandlers(),l.bindGraphHandlers(),l.handleSettingsUpdate(),l.refresh(),l}return be(n,e),ie(n,[{key:"initializeWebGLLabels",value:function(){this.sdfAtlas=new sn,this.sdfAtlas.registerFont({family:"sans-serif",weight:"normal",style:"normal"})}},{key:"resetWebGLTexture",value:function(){var r=this.webGLContext;if(!this.pickingFrameBuffer)return this;var a=Math.ceil(this.width*this.internals.pixelRatio/this.internals.settings.pickingDownSizingRatio),i=Math.ceil(this.height*this.internals.pixelRatio/this.internals.settings.pickingDownSizingRatio);r.bindFramebuffer(r.FRAMEBUFFER,this.pickingFrameBuffer),this.pickingTexture&&r.deleteTexture(this.pickingTexture);var o=r.createTexture();o&&(r.bindTexture(r.TEXTURE_2D,o),r.texImage2D(r.TEXTURE_2D,0,r.RGBA,a,i,0,r.RGBA,r.UNSIGNED_BYTE,null),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MIN_FILTER,r.NEAREST),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MAG_FILTER,r.NEAREST),r.framebufferTexture2D(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,o,0),this.pickingTexture=o),this.pickingDepthBuffer&&r.deleteRenderbuffer(this.pickingDepthBuffer);var s=r.createRenderbuffer();return s&&(r.bindRenderbuffer(r.RENDERBUFFER,s),r.renderbufferStorage(r.RENDERBUFFER,r.DEPTH_COMPONENT16,a,i),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.DEPTH_ATTACHMENT,r.RENDERBUFFER,s),this.pickingDepthBuffer=s),r.bindFramebuffer(r.FRAMEBUFFER,null),this}},{key:"bindCameraHandlers",value:function(){var r=this;return this.activeListeners.camera=function(){r.refreshMatrices(),r.labelRenderer.labelsDirty=!0,r.scheduleRender()},this.activeListeners.cameraAnimationStart=function(a){var i=a.from,o=a.to;i.ratio!==o.ratio&&r.stateManager.setGraphState({isZooming:!0})},this.activeListeners.cameraAnimationEnd=function(){r.stateManager.setGraphState({isZooming:!1})},this.camera.on("updated",this.activeListeners.camera),this.camera.on("animationStart",this.activeListeners.cameraAnimationStart),this.camera.on("animationEnd",this.activeListeners.cameraAnimationEnd),this}},{key:"unbindCameraHandlers",value:function(){return this.camera.removeListener("updated",this.activeListeners.camera),this.camera.removeListener("animationStart",this.activeListeners.cameraAnimationStart),this.camera.removeListener("animationEnd",this.activeListeners.cameraAnimationEnd),this}},{key:"getHitAtPosition",value:function(r){var a;if(this.contextLost)return null;var i=this.webGLContext;i.bindFramebuffer(i.FRAMEBUFFER,this.pickingFrameBuffer);var o=uo(i,this.pickingFrameBuffer,r.x,r.y,this.internals.pixelRatio,this.internals.settings.pickingDownSizingRatio),s=Sa.apply(void 0,Z(o));return(a=this.pickingState.lookup[s])!==null&&a!==void 0?a:null}},{key:"bindEventHandlers",value:function(){return Hv(this.internals,this.mouseCaptor,this.touchCaptor,this.activeListeners),this}},{key:"bindGraphHandlers",value:function(){var r=this;return jv({graph:this.internals.graph,edgeGroups:this.edgeGroups,updateNode:this.updateNode.bind(this),removeNode:this.removeNode.bind(this),addEdge:this.addEdge.bind(this),updateEdge:this.updateEdge.bind(this),removeEdge:this.removeEdge.bind(this),clearEdgeState:this.clearEdgeState.bind(this),clearNodeState:this.clearNodeState.bind(this),clearEdgeIndices:this.clearEdgeIndices.bind(this),clearNodeIndices:this.clearNodeIndices.bind(this),refresh:this.refresh.bind(this),scheduleProcess:function(){r.pendingProcess="full",r.scheduleRender()},markNodesDirty:function(i){r.internals.nodeStyleAnalysis.dependency==="graph-state"&&r.stateManager.markNodesDirty(i)}},this.activeListeners),this}},{key:"unbindGraphHandlers",value:function(){qv(this.internals.graph,this.activeListeners)}},{key:"getNodeShapeId",value:function(r){return this.internals.nodeShapeMap&&this.internals.nodeGlobalShapeIds&&r.shape&&r.shape in this.internals.nodeShapeMap?this.internals.nodeGlobalShapeIds[this.internals.nodeShapeMap[r.shape]]:Gn(r.shape||"circle")}},{key:"processNodes",value:function(){var r=this,a=this.internals.graph,i=this.internals.settings,o=this.getDimensions(),s=i.autoRescale,l=i.autoRescaleContent,u=this.nodeExtent;if(s===!1){var d=o.width,c=o.height;u={x:[-d/2,d/2],y:[-c/2,c/2]}}else(s!=="once"||!this.autoRescaleFrozen)&&(u=this.computeNodeExtent(),l!=="positions"&&!this.customBBox&&(u=Kv({extent:u,coords:this.nodeGraphCoords,nodeData:this.internals.nodeDataCache,dimensions:o,stagePadding:this.getStagePadding(),zoomToSizeRatioFunction:i.zoomToSizeRatioFunction,itemSizesReference:i.itemSizesReference,fitLabels:l==="labels",nodeLabelBox:function(X,q){return r.labelRenderer.nodeLabelBox(X,q)}})),s==="once"&&(this.autoRescaleFrozen=!0));this.nodeExtent=u,this.normalizationFunction=La(this.customBBox||this.nodeExtent);var h=new Ed,g=Dt(h.getState(),o,this.getGraphDimensions(),this.getStagePadding());this.labelRenderer.labelGrid.resizeAndClear(o,i.labelGridCellSize),this.labelRenderer.edgeAnchorGrid.resizeAndClear(o,i.labelGridCellSize);var p=i.renderEdgeLabels&&i.edgeLabelAnchors==="allNodes",m=!1;Ja(this.pickingState,"node");for(var b=a.nodes(),v=0,x=b.length;v<x;v++){var y=b[v],_=this.internals.nodeDataCache[y],S=this.nodeGraphCoords[y];_.x=S.x,_.y=S.y,this.normalizationFunction.applyTo(_),_.visibility!==this.prevNodeVisibilities[y]&&(m=!0),typeof _.label=="string"&&_.visibility!=="hidden"&&_.labelVisibility!=="hidden"&&this.labelRenderer.labelGrid.add(y,_.size,this.framedGraphToViewport(_,{matrix:g})),p&&_.visibility!=="hidden"&&this.labelRenderer.edgeAnchorGrid.add(y,_.size,this.framedGraphToViewport(_,{matrix:g}))}this.labelRenderer.labelGrid.organize(),this.labelRenderer.edgeAnchorGrid.organize(),this.nodeProgram.reallocate(b.length);var T=0;this.depthRanges.nodes={},this.nodeBaseDepth={};var A=this.internals.nodeDataCache,w=U(this.depthLayers),E;try{for(w.s();!(E=w.n()).done;){var R=E.value,L=this.itemBuckets.nodes.getSorted(R,function(W){return A[W].zIndex});if(L.length!==0){this.depthRanges.nodes[R]=[{offset:T,count:L.length}];var k=U(L),P;try{for(k.s();!(P=k.n()).done;){var D=P.value;this.nodeBaseDepth[D]=R,kd(this.pickingState,"node",D),this.addNodeToProgram(D,T++)}}catch(W){k.e(W)}finally{k.f()}}}}catch(W){w.e(W)}finally{w.f()}this.nodeProgram.invalidateBuffers();for(var I=0,G=b.length;I<G;I++)this.prevNodeVisibilities[b[I]]=this.internals.nodeDataCache[b[I]].visibility;this.labelRenderer.processWebGLLabels(b);var z=U(this.customLayerPrograms.values()),F;try{for(z.s();!(F=z.n()).done;){var M=F.value.program;M.cacheData&&M.cacheData()}}catch(W){z.e(W)}finally{z.f()}return m}},{key:"processEdges",value:function(){var r=this.internals.graph,a=r.edges();this.edgeProgram.reallocate(a.length);var i=0;Ja(this.pickingState,"edge"),this.depthRanges.edges={},this.edgeBaseDepth={};var o=this.internals.edgeDataCache,s=U(this.depthLayers),l;try{for(s.s();!(l=s.n()).done;){var u=l.value,d=this.itemBuckets.edges.getSorted(u,function(p){return o[p].zIndex});if(d.length!==0){this.depthRanges.edges[u]=[{offset:i,count:d.length}];var c=U(d),h;try{for(c.s();!(h=c.n()).done;){var g=h.value;this.edgeBaseDepth[g]=u,kd(this.pickingState,"edge",g),this.addEdgeToProgram(g,i++)}}catch(p){c.e(p)}finally{c.f()}}}}catch(p){s.e(p)}finally{s.f()}this.edgeProgram.invalidateBuffers()}},{key:"updateNodeDepthRanges",value:function(r,a,i){var o=this.nodeProgramIndex[r];o!==void 0&&(wo(this.depthRanges.nodes,a,o),Ao(this.depthRanges.nodes,i,o))}},{key:"updateEdgeDepthRanges",value:function(r,a,i){var o=this.edgeProgramIndex[r];o!==void 0&&(wo(this.depthRanges.edges,a,o),Ao(this.depthRanges.edges,i,o))}},{key:"handleSettingsUpdate",value:function(){var r=this,a=this.internals.settings;return this.camera.minRatio=a.minCameraRatio,this.camera.maxRatio=a.maxCameraRatio,this.camera.enabledZooming=a.enableCameraZooming,this.camera.enabledPanning=a.enableCameraPanning,this.camera.enabledRotation=a.enableCameraRotation,a.cameraPanBoundaries?this.camera.constrainState=function(i){return r.cleanCameraState(i,a.cameraPanBoundaries&&re(a.cameraPanBoundaries)==="object"?a.cameraPanBoundaries:{})}:this.camera.constrainState=null,this.camera.setState(this.camera.getState()),this.mouseLayer.style.touchAction=a.gestureTarget==="graph"?"none":a.gestureTarget==="shared"?"pan-x pan-y":"auto",a.gestureTarget!=="shared"&&this.gestureHint&&(this.gestureHint.kill(),this.gestureHint=null),this.mouseCaptor.setSettings(this.internals.settings),this.touchCaptor.setSettings(this.internals.settings),this}},{key:"cleanCameraState",value:function(r){var a=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},i=a.tolerance,o=i===void 0?0:i,s=a.boundaries,l=H({},r),u=s||this.nodeExtent,d=se(u.x,2),c=d[0],h=d[1],g=se(u.y,2),p=g[0],m=g[1],b=[this.graphToViewport({x:c,y:p},{cameraState:r}),this.graphToViewport({x:h,y:p},{cameraState:r}),this.graphToViewport({x:c,y:m},{cameraState:r}),this.graphToViewport({x:h,y:m},{cameraState:r})],v=1/0,x=-1/0,y=1/0,_=-1/0;b.forEach(function(D){var I=D.x,G=D.y;v=Math.min(v,I),x=Math.max(x,I),y=Math.min(y,G),_=Math.max(_,G)});var S=x-v,T=_-y,A=this.getDimensions(),w=A.width,E=A.height,R=0,L=0;if(S>=w?x<w-o?R=x-(w-o):v>o&&(R=v-o):x>w+o?R=x-(w+o):v<-o&&(R=v+o),T>=E?_<E-o?L=_-(E-o):y>o&&(L=y-o):_>E+o?L=_-(E+o):y<-o&&(L=y+o),R||L){var k=this.viewportToFramedGraph({x:0,y:0},{cameraState:r}),P=this.viewportToFramedGraph({x:R,y:L},{cameraState:r});R=P.x-k.x,L=P.y-k.y,l.x+=R,l.y+=L}return l}},{key:"refreshMatrices",value:function(){var r=this.camera.getState(),a=this.getDimensions(),i=this.getGraphDimensions(),o=this.getStagePadding();this.matrix=Dt(r,a,i,o),this.invMatrix=Dt(r,a,i,o,!0),this.correctionRatio=lo(this.matrix,r,a),this.graphToViewportRatio=this.getGraphToViewportRatio()}},{key:"processData",value:function(){var r;this.emit("beforeProcess"),(r=this.internals.attachmentManager)===null||r===void 0||r.clear();var a=H({},this.pickingState.idsByKind),i=this.processNodes();(this.pendingProcess==="full"||i)&&this.processEdges(),Gv(this.pickingState,this.internals),Ov(a,this.pickingState.idsByKind)||this.internals.hoverResolver.invalidate(),this.pendingProcess="none",this.emit("afterProcess")}},{key:"render",value:function(){var r=this;if(this.contextLost)return this;this.emit("beforeRender");var a=function(){return r.internals.hoverResolver.frameRendered(),r.emit("afterRender"),r};if(this.renderFrame&&(cancelAnimationFrame(this.renderFrame),this.renderFrame=null),this.resize(),(this.pendingProcess!=="none"||this.needToRefreshState)&&(this.labelRenderer.labelsDirty=!0),this.pendingProcess!=="none"&&this.processData(),this.needToRefreshState&&this.refreshState(),this.needToRefreshState=!1,this.stateManager.clearDirtyTracking(),this.pendingProcess!=="none"&&this.processData(),this.clear(),this.resetWebGLTexture(),!this.internals.graph.order)return a();var i=this.mouseCaptor,o=this.camera.isAnimating()||i.isMoving||i.draggedEvents||i.currentWheelDirection;if(this.refreshMatrices(),this.frameId++,this.internals.settings.renderEdgeLabels&&!this.internals.edgeLabelProgram){var s=this.createEdgeLabelPrograms(),l=s.labelProgram,u=s.labelBackgroundProgram;this.internals.edgeLabelProgram=l,this.internals.edgeLabelBackgroundProgram=u}var d=this.internals.settings.DEBUG_logRenderStats?this.getDebugPrograms():null;d&&d.forEach(function(ee){return ee.resetDebugStats()}),this.internals.settings.DEBUG_gpuTimerQueries&&this.beginGpuTimerQuery(),this.internals.nodeFrameTexture.ensureCapacity(this.internals.nodeDataTexture.getCapacity()),this.internals.edgeFrameTexture.ensureCapacity(this.internals.edgeDataTexture.getCapacity());var c=this.getRenderParams(),h=Fe.edge.writesPickingThisFrame(this.internals)?c:H(H({},c),{},{pickingFrameBuffer:null});this.labelRenderer.resetFrame();var g=this.webGLContext,p=Math.ceil(this.width*this.internals.pixelRatio/this.internals.settings.pickingDownSizingRatio),m=Math.ceil(this.height*this.internals.pixelRatio/this.internals.settings.pickingDownSizingRatio);if(g.bindFramebuffer(g.FRAMEBUFFER,this.pickingFrameBuffer),g.viewport(0,0,p,m),g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT),g.bindFramebuffer(g.FRAMEBUFFER,null),g.viewport(0,0,this.width*this.internals.pixelRatio,this.height*this.internals.pixelRatio),g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT),this.internals.nodeDataTexture.upload(),this.internals.edgeDataTexture.upload(),this.nodeProgram.uploadLayerTexture(),this.edgeProgram.uploadAttributeTexture(),this.emit("afterTexturesUpload"),this.internals.nodeDataTexture.bind(Gd),this.internals.edgeDataTexture.bind(Od),this.edgeFramePass.run(c,this.internals.edgeFrameTexture,this.internals.edgeDataTexture.getHighWaterMark(),this.edgeProgram.getAttributeTexture(),this.nodeProgram.getAttributeTexture()),this.internals.edgeFrameTexture.bind(Nd),this.internals.settings.renderLabels){this.labelRenderer.computeDisplayedNodeLabels();var b=this.labelRenderer.buildFramePassPoints(),v=b.data,x=b.count;this.nodeFramePass.run(v,x,this.internals.nodeFrameTexture,c,this.nodeProgram.getAttributeTexture()),this.internals.nodeFrameTexture.bind(zd)}this.internals.settings.renderEdgeLabels&&this.labelRenderer.computeDisplayedEdgeLabels();var y=U(this.customLayerPrograms.values()),_;try{for(y.s();!(_=y.n()).done;){var S=_.value.program;S.preRender&&S.preRender(c)}}catch(ee){y.e(ee)}finally{y.f()}g.bindFramebuffer(g.FRAMEBUFFER,null),g.viewport(0,0,this.width*this.internals.pixelRatio,this.height*this.internals.pixelRatio),g.blendFunc(g.ONE,g.ONE_MINUS_SRC_ALPHA);var T=!this.internals.settings.hideLabelsOnMove||!o,A=U(this.depthLayers),w;try{for(A.s();!(w=A.n()).done;){var E=w.value,R=U(this.customLayerPrograms.values()),L;try{for(R.s();!(L=R.n()).done;){var k=L.value;k.depth===E&&k.program.render(c)}}catch(ee){R.e(ee)}finally{R.f()}var P=this.depthRanges.edges[E];if(P&&(!this.internals.settings.hideEdgesOnMove||!o)){var D=U(P),I;try{for(D.s();!(I=D.n()).done;){var G=I.value,z=G.offset,F=G.count;F>0&&this.edgeProgram.render(h,z,F)}}catch(ee){D.e(ee)}finally{D.f()}}this.internals.settings.renderEdgeLabels&&T&&(this.labelRenderer.renderEdgeLabelBackgrounds(Fe.edgeLabel.writesPickingThisFrame(this.internals)?c:H(H({},c),{},{pickingFrameBuffer:null}),E),this.labelRenderer.renderEdgeLabels(c,E)),this.labelRenderer.cacheAttachments(E),this.labelRenderer.renderBackdrops(H(H({},c),{},{pickingFrameBuffer:null}),E);var M=this.depthRanges.nodes[E];if(M){var W=U(M),X;try{for(W.s();!(X=W.n()).done;){var q=X.value,te=q.offset,Q=q.count;Q>0&&this.nodeProgram.render(c,te,Q)}}catch(ee){W.e(ee)}finally{W.f()}}T&&(this.labelRenderer.renderAttachments(H(H({},c),{},{pickingFrameBuffer:null}),E),this.labelRenderer.renderLabelBackgrounds(Fe.nodeLabel.writesPickingThisFrame(this.internals)?c:H(H({},c),{},{pickingFrameBuffer:null}),E),this.internals.settings.renderLabels&&this.labelRenderer.renderWebGLLabels(c,E))}}catch(ee){A.e(ee)}finally{A.f()}return this.labelRenderer.labelsDirty=!1,this.internals.settings.DEBUG_displayPickingLayer&&(g.bindFramebuffer(g.READ_FRAMEBUFFER,this.pickingFrameBuffer),g.bindFramebuffer(g.DRAW_FRAMEBUFFER,null),g.blitFramebuffer(0,0,p,m,0,0,this.width*this.internals.pixelRatio,this.height*this.internals.pixelRatio,g.COLOR_BUFFER_BIT,g.NEAREST)),this.internals.settings.DEBUG_gpuTimerQueries&&this.endGpuTimerQuery(),this.pollGpuTimerQueries(),d&&this.logRenderStats(d),a()}},{key:"getDebugPrograms",value:function(){return[this.nodeProgram,this.edgeProgram,this.internals.labelProgram,this.internals.edgeLabelProgram,this.internals.edgeLabelBackgroundProgram,this.internals.backdropProgram,this.internals.labelBackgroundProgram,this.internals.attachmentProgram].filter(function(r){return r!==null})}},{key:"logRenderStats",value:function(r){var a={},i=U(r),o;try{for(i.s();!(o=i.n()).done;){var s=o.value;a[s.constructor.name]=H({},s.debugStats)}}catch(l){i.e(l)}finally{i.f()}console.log("[sigma] DEBUG_logRenderStats: frame #".concat(this.frameId)),console.table(a)}},{key:"getGpuTimerExtension",value:function(){return this.gpuTimerExt===void 0&&(this.gpuTimerExt=this.webGLContext.getExtension("EXT_disjoint_timer_query_webgl2"),this.gpuTimerExt||console.warn("Sigma: DEBUG_gpuTimerQueries is enabled, but this browser/driver doesn't support EXT_disjoint_timer_query_webgl2.")),this.gpuTimerExt}},{key:"beginGpuTimerQuery",value:function(){var r=this.getGpuTimerExtension();if(r){var a=this.webGLContext,i=a.createQuery();i&&(a.beginQuery(r.TIME_ELAPSED_EXT,i),this.activeGpuTimerQuery=i)}}},{key:"endGpuTimerQuery",value:function(){!this.gpuTimerExt||!this.activeGpuTimerQuery||(this.webGLContext.endQuery(this.gpuTimerExt.TIME_ELAPSED_EXT),this.pendingGpuTimerQueries.push({query:this.activeGpuTimerQuery,frameId:this.frameId}),this.activeGpuTimerQuery=null)}},{key:"pollGpuTimerQueries",value:function(){if(this.pendingGpuTimerQueries.length!==0){var r=this.webGLContext,a=this.gpuTimerExt;if(!a){this.pendingGpuTimerQueries.forEach(function(c){var h=c.query;return r.deleteQuery(h)}),this.pendingGpuTimerQueries=[];return}var i=r.getParameter(a.GPU_DISJOINT_EXT),o=[],s=U(this.pendingGpuTimerQueries),l;try{for(s.s();!(l=s.n()).done;){var u=l.value;if(!r.getQueryParameter(u.query,r.QUERY_RESULT_AVAILABLE)){o.push(u);continue}if(!i){var d=r.getQueryParameter(u.query,r.QUERY_RESULT);console.log("[sigma] DEBUG_gpuTimerQueries: frame #".concat(u.frameId," GPU time = ").concat((d/1e6).toFixed(2),"ms"))}r.deleteQuery(u.query)}}catch(c){s.e(c)}finally{s.f()}this.pendingGpuTimerQueries=o}}},{key:"postEvaluateNode",value:function(r,a,i){var o=r;o.x===void 0&&(o.x=a.x),o.y===void 0&&(o.y=a.y),r.highlighted=i.isHighlighted;for(var s=0,l=this.nodeVariableEntries.length;s<l;s++){var u,d,c=se(this.nodeVariableEntries[s],2),h=c[0],g=c[1];o[h]=(u=(d=o[h])!==null&&d!==void 0?d:a[h])!==null&&u!==void 0?u:g.default}}},{key:"addNode",value:function(r){var a=this.internals.graph.getNodeAttributes(r),i=this.stateManager.getNodeState(r),o=this.internals.nodeDataCache[r]||{};if(xo(this.stylesDeclaration.nodes,a,i,this.stateManager.graphState,this.internals.graph,o),this.postEvaluateNode(o,a,i),this.nodeReducer){var s=this.nodeReducer(r,o,a,i,this.stateManager.graphState,this.internals.graph);o=H(H({},o),s)}if(typeof o.x!="number"||typeof o.y!="number")throw new Error('Sigma: could not find a valid position (x, y) for node "'.concat(r,'". ')+"Provide coordinates via node attributes, styles, or a nodeReducer.");this.internals.nodeShapeMap?(!o.shape||!(o.shape in this.internals.nodeShapeMap))&&(o.shape=Object.keys(this.internals.nodeShapeMap)[0]):this.nodeShapeSlug&&(o.shape=this.nodeShapeSlug),this.internals.nodeDataCache[r]=o,this.nodeGraphCoords[r]={x:o.x,y:o.y},an(this.internals.nodesWithForcedLabels,r,Wt(o)),an(this.internals.nodesWithBackdrop,r,Eo(o)),this.itemBuckets.nodes.set(r,o.depth)}},{key:"updateNode",value:function(r){this.addNode(r);var a=this.internals.nodeDataCache[r];this.normalizationFunction.applyTo(a)}},{key:"removeNode",value:function(r){Cd(this.pickingState,"node",r),this.itemBuckets.nodes.remove(r),delete this.internals.nodeDataCache[r],delete this.nodeGraphCoords[r],delete this.nodeProgramIndex[r],this.internals.nodeDataTexture.free(r),this.internals.dragManager.removeNode(r),this.stateManager.removeNode(r),this.internals.nodesWithForcedLabels.delete(r),this.internals.nodesWithBackdrop.delete(r)}},{key:"postEvaluateEdge",value:function(r,a){for(var i=r,o=0,s=this.edgeVariableEntries.length;o<s;o++){var l,u,d=se(this.edgeVariableEntries[o],2),c=d[0],h=d[1];i[c]=(l=(u=i[c])!==null&&u!==void 0?u:a[c])!==null&&l!==void 0?l:h.default}}},{key:"applyEdgeSpread",value:function(r,a,i){var o;if(!(i.parallelCount<=1)){var s=this.internals.graph.source(r),l=this.internals.graph.target(r),u=s===l,d=u?a.selfLoopPath||a.path:a.parallelPath||a.path,c=d?this.edgePathsByName.get(d):void 0;if(c!=null&&c.spread){var h=(o=a.parallelSpread)!==null&&o!==void 0?o:.25,g=c.spread.compute(i.parallelIndex,i.parallelCount,h);!u&&this.internals.graph.isDirected(r)&&s>l&&(g=-g),a[c.spread.variable]=g}}}},{key:"addEdge",value:function(r){var a=this.internals.graph.getEdgeAttributes(r),i=this.stateManager.getEdgeState(r),o={};if(So(this.stylesDeclaration.edges,a,i,this.stateManager.graphState,this.internals.graph,o),this.postEvaluateEdge(o,a),this.edgeReducer){var s=this.edgeReducer(r,o,a,i,this.stateManager.graphState,this.internals.graph);o=H(H({},o),s)}this.applyEdgeSpread(r,o,i),this.internals.edgeDataCache[r]=o,an(this.internals.edgesWithForcedLabels,r,Wt(o)),this.itemBuckets.edges.set(r,o.depth)}},{key:"updateEdge",value:function(r){this.addEdge(r)}},{key:"removeEdge",value:function(r){this.itemBuckets.edges.remove(r),delete this.internals.edgeDataCache[r],delete this.edgeProgramIndex[r],delete this.edgeTextureIndexCache[r],this.internals.edgeDataTexture.free(r),Cd(this.pickingState,"edge",r),this.stateManager.removeEdge(r),this.internals.edgesWithForcedLabels.delete(r)}},{key:"clearNodeIndices",value:function(){var r;this.labelRenderer.resetLabelGrid(),this.autoRescaleFrozen||(this.nodeExtent={x:[0,1],y:[0,1]}),this.internals.nodeDataCache={},this.nodeGraphCoords={},this.nodeProgramIndex={},(r=this.internals.nodeDataTexture)===null||r===void 0||r.clear(),this.internals.nodesWithForcedLabels.clear(),this.internals.nodesWithBackdrop.clear(),this.prevNodeVisibilities={},this.itemBuckets.nodes.clearAll(),this.depthRanges.nodes={},this.nodeBaseDepth={}}},{key:"clearEdgeIndices",value:function(){var r;this.internals.edgeDataCache={},this.edgeProgramIndex={},this.edgeTextureIndexCache={},(r=this.internals.edgeDataTexture)===null||r===void 0||r.clear(),this.internals.edgesWithForcedLabels.clear(),this.itemBuckets.edges.clearAll(),this.depthRanges.edges={},this.edgeBaseDepth={},this.edgeGroups.clear()}},{key:"clearIndices",value:function(){this.clearEdgeIndices(),this.clearNodeIndices()}},{key:"clearNodeState",value:function(){this.labelRenderer.resetFrame(),this.internals.nodesWithBackdrop.clear(),this.internals.dragManager.clear(),this.autoRescaleFrozen=!1,this.stateManager.clearNodes(),Ja(this.pickingState,"node")}},{key:"clearEdgeState",value:function(){this.labelRenderer.clearEdgeLabels(),this.stateManager.clearEdges(),Ja(this.pickingState,"edge")}},{key:"clearState",value:function(){this.clearEdgeState(),this.clearNodeState(),this.stateManager.resetGraphState()}},{key:"addNodeToProgram",value:function(r,a){var i,o=this.internals.nodeDataCache[r];this.internals.nodeDataTexture.allocate(r),(i=this.internals.nodeDataTexture).updateNode.apply(i,[r,o.x,o.y,o.size,this.getNodeShapeId(o)].concat(Z(Ca(o)),[o.color]));var s=this.internals.nodeDataTexture.getIndex(r);this.nodeProgram.process(fn(this.pickingState,"node",r),a,o,s),this.nodeProgramIndex[r]=a}},{key:"addEdgeToProgram",value:function(r,a){var i,o,s=this.internals.edgeDataCache[r],l=this.internals.graph.source(r),u=this.internals.graph.target(r),d=this.internals.edgeDataTexture.allocate(r);this.edgeTextureIndexCache[r]=d;var c=l===u,h=!c&&((i=(o=this.stateManager.getEdgeState(r))===null||o===void 0?void 0:o.parallelCount)!==null&&i!==void 0?i:1)>1,g=this.edgeProgram.resolveEdgeIds(s,c,h),p=g.pathId,m=g.headId,b=g.tailId,v=g.headLengthRatio,x=g.tailLengthRatio;this.internals.edgeDataTexture.updateEdge(r,this.internals.nodeDataTexture.getIndex(l),this.internals.nodeDataTexture.getIndex(u),s.size,v,x,p,m,b),this.edgeProgram.process(fn(this.pickingState,"edge",r),a,this.internals.nodeDataCache[l],this.internals.nodeDataCache[u],s,d),this.edgeProgramIndex[r]=a}},{key:"getRenderParams",value:function(){return{frameId:this.frameId,matrix:this.matrix,invMatrix:this.invMatrix,width:this.width,height:this.height,pixelRatio:this.internals.pixelRatio,zoomRatio:this.camera.ratio,cameraAngle:this.camera.angle,sizeRatio:1/this.scaleSize(),correctionRatio:this.correctionRatio,downSizingRatio:this.internals.settings.pickingDownSizingRatio,minEdgeThickness:this.internals.settings.minEdgeThickness,antiAliasingFeather:this.internals.settings.antiAliasingFeather,nodePickingPadding:this.internals.settings.nodePickingPadding,edgePickingPadding:this.internals.settings.edgePickingPadding,labelPickingPadding:this.internals.settings.labelPickingPadding,nodeDataTextureUnit:Gd,nodeDataTextureWidth:this.internals.nodeDataTexture.getTextureWidth(),nodeFrameTextureUnit:zd,nodeFrameTextureWidth:this.internals.nodeFrameTexture.getTextureWidth(),edgeDataTextureUnit:Od,edgeDataTextureWidth:this.internals.edgeDataTexture.getTextureWidth(),edgeFrameTextureUnit:Nd,edgeFrameTextureWidth:this.internals.edgeFrameTexture.getTextureWidth(),pickingFrameBuffer:this.pickingFrameBuffer,labelPixelSnapping:this.internals.settings.labelPixelSnapping?1:0}}},{key:"getStagePadding",value:function(){var r=this.internals.settings,a=r.stagePadding,i=r.autoRescale;return i&&a||0}},{key:"getLayerElement",value:function(r){if(r==="mouse")return this.mouseLayer;var a=this.extraElements[r];if(!a)throw new Error('Sigma: layer "'.concat(r,'" does not exist'));return a}},{key:"initWebGLContext",value:function(){var r=this,a=this.createWebGLContext("stage");this.stageCanvas=this.extraElements.stage,this.webGLContext=a,this.stageCanvas.addEventListener("webglcontextlost",function(i){r.webGLContext&&(i.preventDefault(),r.contextLost=!0,r.renderFrame&&(cancelAnimationFrame(r.renderFrame),r.renderFrame=null),r.gpuTimerExt=void 0,r.activeGpuTimerQuery=null,r.pendingGpuTimerQueries=[],r.emit("webglContextLost"))}),this.stageCanvas.addEventListener("webglcontextrestored",function(){requestAnimationFrame(function(){r.webGLContext&&!r.webGLContext.isContextLost()&&r.restoreWebGLContext()})}),this.initPickingFramebuffer()}},{key:"initPickingFramebuffer",value:function(){var r=this.webGLContext,a=r.createFramebuffer();if(!a)throw new Error("Sigma: cannot create picking frame buffer");r.bindFramebuffer(r.FRAMEBUFFER,a);var i=r.createTexture();if(!i)throw new Error("Sigma: cannot create picking texture");r.bindTexture(r.TEXTURE_2D,i),r.texImage2D(r.TEXTURE_2D,0,r.RGBA,1,1,0,r.RGBA,r.UNSIGNED_BYTE,null),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MIN_FILTER,r.NEAREST),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MAG_FILTER,r.NEAREST),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_S,r.CLAMP_TO_EDGE),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_T,r.CLAMP_TO_EDGE),r.framebufferTexture2D(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,i,0);var o=r.createRenderbuffer();if(!o)throw new Error("Sigma: cannot create picking depth buffer");if(r.bindRenderbuffer(r.RENDERBUFFER,o),r.renderbufferStorage(r.RENDERBUFFER,r.DEPTH_COMPONENT16,1,1),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.DEPTH_ATTACHMENT,r.RENDERBUFFER,o),r.checkFramebufferStatus(r.FRAMEBUFFER)!==r.FRAMEBUFFER_COMPLETE)throw new Error("Sigma: picking framebuffer is not complete");r.bindFramebuffer(r.FRAMEBUFFER,null),this.pickingFrameBuffer=a,this.pickingTexture=i,this.pickingDepthBuffer=o}},{key:"initPrograms",value:function(r,a){var i=this,o=this.webGLContext,s=fd(o,this.pickingFrameBuffer,i,r?.nodes,a.antialiasNodes),l=s.nodeProgram,u=s.labelProgram,d=s.backdropProgram,c=s.labelBackgroundProgram,h=s.attachmentProgram,g=s.framePass,p=s.shapeSlug,m=s.shapeNameToIndex,b=s.shapeGlobalIds,v=s.variables;this.nodeProgram=l,this.nodeFramePass=g,this.nodeVariableEntries=Object.entries(v),p&&(this.nodeShapeSlug=p);var x=gd(o,this.pickingFrameBuffer,i,r?.edges,a.antialiasEdges,r?.nodes),y=x.edgeProgram,_=x.createLabelPrograms,S=x.framePass,T=x.variables,A=x.paths;return this.createEdgeLabelPrograms=_,this.edgeProgram=y,this.edgeFramePass=S,this.edgeVariableEntries=Object.entries(T),this.edgePathsByName=new Map(A.map(function(w){return[w.name,w]})),{labelProgram:u,edgeLabelProgram:null,edgeLabelBackgroundProgram:null,backdropProgram:d,labelBackgroundProgram:c,attachmentProgram:h,nodeShapeMap:m??null,nodeGlobalShapeIds:b??null}}},{key:"restoreWebGLContext",value:function(){var r,a,i,o,s,l=this.internals;this.initPickingFramebuffer(),(r=l.nodeDataTexture)===null||r===void 0||r.restore(),(a=l.nodeFrameTexture)===null||a===void 0||a.restore(),(i=l.edgeDataTexture)===null||i===void 0||i.restore(),(o=l.edgeFrameTexture)===null||o===void 0||o.restore(),(s=l.attachmentManager)===null||s===void 0||s.restore(),l.hoverResolver.reset(),Object.assign(l,this.initPrograms(l.primitives,l.settings));var u=U(this.customLayerPrograms.values()),d;try{for(u.s();!(d=u.n()).done;){var c=d.value;c.program.kill(),c.program=c.factory(this.webGLContext)}}catch(h){u.e(h)}finally{u.f()}this.contextLost=!1,this.emit("webglContextRestored"),this.refresh()}},{key:"createLayer",value:function(r,a){var i=arguments.length>2&&arguments[2]!==void 0?arguments[2]:{};if(this.extraElements[r])throw new Error('Sigma: a layer named "'.concat(r,'" already exists'));var o=Nn(a,{position:"absolute"},{class:"sigma-".concat(r)});return i.style&&Object.assign(o.style,i.style),this.extraElements[r]=o,"beforeLayer"in i&&i.beforeLayer?this.getLayerElement(i.beforeLayer).before(o):"afterLayer"in i&&i.afterLayer?this.getLayerElement(i.afterLayer).after(o):this.container.appendChild(o),o}},{key:"createCanvas",value:function(r){var a=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{};return this.createLayer(r,"canvas",a)}},{key:"createWebGLContext",value:function(r){var a=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},i=this.createCanvas(r,a);a.hidden&&i.remove();var o=i.getContext("webgl2",H({preserveDrawingBuffer:!1,antialias:!1,depth:!0},a));if(!o)throw new Error("Sigma: WebGL 2 is not supported by your browser. Please use a modern browser (Chrome 56+, Firefox 51+, Safari 15+, Edge 79+).");return o.blendFunc(o.ONE,o.ONE_MINUS_SRC_ALPHA),o}},{key:"killLayer",value:function(r){if(r==="stage"||r==="mouse")throw new Error('Sigma: cannot kill built-in layer "'.concat(r,'"'));var a=this.extraElements[r];if(!a)throw new Error("Sigma: cannot kill layer ".concat(r,", which does not exist"));return a.remove(),delete this.extraElements[r],this}},{key:"getWebGLContext",value:function(){if(!this.webGLContext)throw new Error("Sigma: WebGL context is not available");return this.webGLContext}},{key:"getNodeDataTexture",value:function(){if(!this.internals.nodeDataTexture)throw new Error("Sigma: node data texture is not available");return this.internals.nodeDataTexture}},{key:"getNormalizationFunction",value:function(){return this.normalizationFunction}},{key:"addCustomLayerProgram",value:function(r,a,i){var o;if(!this.depthLayers.includes(a))throw new Error('Sigma: cannot add custom layer program at depth "'.concat(a,'", ')+"it must be declared in primitives.depthLayers. Current layers: ".concat(this.depthLayers.join(", ")));(o=this.customLayerPrograms.get(r))===null||o===void 0||o.program.kill();var s=i(this.webGLContext);return this.customLayerPrograms.set(r,{depth:a,factory:i,program:s}),s.cacheData&&s.cacheData(),this.scheduleRender(),this}},{key:"removeCustomLayerProgram",value:function(r){var a=this.customLayerPrograms.get(r);return a&&(a.program.kill(),this.customLayerPrograms.delete(r),this.scheduleRender()),this}},{key:"getCamera",value:function(){return this.camera}},{key:"setCamera",value:function(r){return this.camera.cancelAnimation(),this.unbindCameraHandlers(),this.camera=r,this.bindCameraHandlers(),this.scheduleRender(),this}},{key:"getContainer",value:function(){return this.container}},{key:"getGraph",value:function(){return this.internals.graph}},{key:"setGraph",value:function(r){return r===this.internals.graph?this:(this.stateManager.pruneNodes(function(a){return r.hasNode(a)}),this.stateManager.pruneEdges(function(a){return r.hasEdge(a)}),this.unbindGraphHandlers(),this.checkEdgesEventsFrame!==null&&(cancelAnimationFrame(this.checkEdgesEventsFrame),this.checkEdgesEventsFrame=null),this.internals.graph=r,this.autoRescaleFrozen=!1,this.bindGraphHandlers(),this.refresh(),this)}},{key:"getMouseCaptor",value:function(){return this.mouseCaptor}},{key:"getTouchCaptor",value:function(){return this.touchCaptor}},{key:"getDimensions",value:function(){return{width:this.width,height:this.height}}},{key:"getGraphDimensions",value:function(){var r=this.customBBox||this.nodeExtent;return{width:r.x[1]-r.x[0]||1,height:r.y[1]-r.y[0]||1}}},{key:"getNodeDisplayData",value:function(r){var a=this.internals.nodeDataCache[r];return a?Object.assign({},a):void 0}},{key:"getEdgeDisplayData",value:function(r){var a=this.internals.edgeDataCache[r];return a?Object.assign({},a):void 0}},{key:"getNodeState",value:function(r){return this.stateManager.getNodeState(r)}},{key:"getEdgeState",value:function(r){return this.stateManager.getEdgeState(r)}},{key:"getGraphState",value:function(){return this.stateManager.getGraphState()}},{key:"setNodeState",value:function(r,a){return this.stateManager.setNodeState(r,a),this}},{key:"setEdgeState",value:function(r,a){return this.stateManager.setEdgeState(r,a),this}},{key:"setGraphState",value:function(r){return this.stateManager.setGraphState(r),this}},{key:"_setPanning",value:function(r){this.stateManager.setGraphState({isPanning:r})}},{key:"_setZooming",value:function(r){this.stateManager.setGraphState({isZooming:r})}},{key:"_hasNodeDrag",value:function(){var r=this.internals.dragManager;return!!(r.pendingNode||r.session)}},{key:"_showGestureHint",value:function(r){var a=this.internals.settings;a.gestureTarget==="shared"&&(this.gestureHint=this.gestureHint||new ty(this.container),this.gestureHint.show(r,a))}},{key:"setNodesState",value:function(r,a){return this.stateManager.setNodesState(r,a),this}},{key:"setEdgesState",value:function(r,a){return this.stateManager.setEdgesState(r,a),this}},{key:"updateContainerCursor",value:function(){var r=this.stateManager.hovered,a=this.resolvedStageStyle.cursor||"";this.container.style.cursor=r&&Bv(this.internals,r)||a}},{key:"refreshStageStyle",value:function(){this.resolvedStageStyle=_o(this.stylesDeclaration.stage,this.stateManager.graphState),this.resolvedStageStyle.background!==void 0&&(this.container.style.backgroundColor=this.resolvedStageStyle.background),this.updateContainerCursor()}},{key:"getNodeDisplayedLabels",value:function(){return new Set(this.labelRenderer.displayedNodeLabels)}},{key:"getEdgeDisplayedLabels",value:function(){return new Set(this.labelRenderer.displayedEdgeLabels)}},{key:"getSettings",value:function(){return H({},this.internals.settings)}},{key:"getSetting",value:function(r){return this.internals.settings[r]}},{key:"getStyles",value:function(){return H({},this.stylesDeclaration)}},{key:"getPrimitives",value:function(){return H({},this.internals.primitives)}},{key:"setSetting",value:function(r,a){return this.internals.settings[r]=a,Ia(this.internals.settings),this.handleSettingsUpdate(),this.scheduleRefresh(),this}},{key:"updateSetting",value:function(r,a){return this.setSetting(r,a(this.internals.settings[r])),this}},{key:"setSettings",value:function(r){return this.internals.settings=H(H({},this.internals.settings),r),Ia(this.internals.settings),this.handleSettingsUpdate(),this.scheduleRefresh(),this}},{key:"resize",value:function(r){var a=this.width,i=this.height;if(this.width=this.container.offsetWidth,this.height=this.container.offsetHeight,this.internals.pixelRatio=_r(),this.width===0)if(this.internals.settings.allowInvalidContainer)this.width=1;else throw new Error("Sigma: Container has no width. You can set the allowInvalidContainer setting to true to stop seeing this error.");if(this.height===0)if(this.internals.settings.allowInvalidContainer)this.height=1;else throw new Error("Sigma: Container has no height. You can set the allowInvalidContainer setting to true to stop seeing this error.");if(!r&&a===this.width&&i===this.height)return this;this.labelRenderer.labelsDirty=!0;for(var o=0,s=[this.mouseLayer].concat(Z(Object.values(this.extraElements)));o<s.length;o++){var l=s[o];l.style.width=this.width+"px",l.style.height=this.height+"px"}return this.webGLContext&&(this.stageCanvas.setAttribute("width",this.width*this.internals.pixelRatio+"px"),this.stageCanvas.setAttribute("height",this.height*this.internals.pixelRatio+"px"),this.webGLContext.viewport(0,0,this.width*this.internals.pixelRatio,this.height*this.internals.pixelRatio)),this.emit("resize"),this}},{key:"clear",value:function(){return this.emit("beforeClear"),this.webGLContext.bindFramebuffer(WebGLRenderingContext.FRAMEBUFFER,null),this.webGLContext.clear(WebGLRenderingContext.COLOR_BUFFER_BIT),this.emit("afterClear"),this}},{key:"scheduleStateRefresh",value:function(){this.needToRefreshState=!0,this.scheduleRender()}},{key:"refreshState",value:function(){var r=this,a;this.stateManager.flushGraphStateFlags();var i=this.stateManager.graphStateChanged&&this.internals.nodeStyleAnalysis.dependency==="graph-state",o=this.stateManager.graphStateChanged&&this.edgeStyleAnalysis.dependency==="graph-state",s=!1;if(i)this.internals.graph.forEachNode(function(p){r.refreshNodeState(p)&&(s=!0)});else if(this.internals.nodeStyleAnalysis.dependency!=="static"){var l=U(this.stateManager.dirtyNodes),u;try{for(l.s();!(u=l.n()).done;){var d=u.value;this.refreshNodeState(d)&&(s=!0)}}catch(p){l.e(p)}finally{l.f()}}if(o)this.internals.graph.forEachEdge(function(p){r.refreshEdgeState(p)&&(s=!0)});else if(this.edgeStyleAnalysis.dependency!=="static"){var c=U(this.stateManager.dirtyEdges),h;try{for(c.s();!(h=c.n()).done;){var g=h.value;this.refreshEdgeState(g)&&(s=!0)}}catch(p){c.e(p)}finally{c.f()}}this.stateManager.graphStateChanged&&(a=this.stylesDeclaration)!==null&&a!==void 0&&a.stage&&this.refreshStageStyle(),this.stateManager.clearDirtyTracking(),s&&(this.pendingProcess="full")}},{key:"refreshNodeState",value:function(r){var a=this.internals.nodeDataCache[r];if(!a||this.nodeReducer){var i,o,s,l,u=(i=this.internals.nodeDataCache[r])===null||i===void 0?void 0:i.depth,d=(o=this.internals.nodeDataCache[r])===null||o===void 0?void 0:o.zIndex,c=(s=this.internals.nodeDataCache[r])===null||s===void 0?void 0:s.labelAttachment;this.updateNode(r);var h=this.internals.nodeDataCache[r];this.internals.attachmentManager&&h.labelAttachment!==c&&this.internals.attachmentManager.invalidateNode(r);var g;this.internals.nodeShapeMap&&this.internals.nodeGlobalShapeIds&&h.shape&&h.shape in this.internals.nodeShapeMap?g=this.internals.nodeGlobalShapeIds[this.internals.nodeShapeMap[h.shape]]:g=Gn(h.shape||"circle"),(l=this.internals.nodeDataTexture).updateNode.apply(l,[r,h.x,h.y,h.size,g].concat(Z(Ca(h)),[h.color])),u&&h.depth!==u&&this.updateNodeDepthRanges(r,u,h.depth);var p=this.nodeProgramIndex[r];return p!==void 0&&(this.addNodeToProgram(r,p),this.nodeProgram.invalidateBuffers()),d!==void 0&&h.zIndex!==d}var m=this.internals.graph.getNodeAttributes(r),b=this.stateManager.getNodeState(r),v=a.size,x=a.shape,y=a.depth,_=a.zIndex,S=a.labelAttachment,T=a.rotationAlignment,A=a.labelRotationAlignment,w=a.color;xo(this.stylesDeclaration.nodes,m,b,this.stateManager.graphState,this.internals.graph,a),this.postEvaluateNode(a,m,b);var E=this.nodeGraphCoords[r],R=a.x!==E.x||a.y!==E.y;if(R&&(E.x=a.x,E.y=a.y),this.normalizationFunction.applyTo(a),this.internals.nodeShapeMap?(!a.shape||!(a.shape in this.internals.nodeShapeMap))&&(a.shape=Object.keys(this.internals.nodeShapeMap)[0]):this.nodeShapeSlug&&(a.shape=this.nodeShapeSlug),this.internals.attachmentManager&&a.labelAttachment!==S&&this.internals.attachmentManager.invalidateNode(r),an(this.internals.nodesWithForcedLabels,r,Wt(a)),an(this.internals.nodesWithBackdrop,r,Eo(a)),R||a.size!==v||a.shape!==x||a.rotationAlignment!==T||a.labelRotationAlignment!==A||a.color!==w){var L,k;this.internals.nodeShapeMap&&this.internals.nodeGlobalShapeIds&&a.shape&&a.shape in this.internals.nodeShapeMap?k=this.internals.nodeGlobalShapeIds[this.internals.nodeShapeMap[a.shape]]:k=Gn(a.shape||"circle"),(L=this.internals.nodeDataTexture).updateNode.apply(L,[r,a.x,a.y,a.size,k].concat(Z(Ca(a)),[a.color]))}this.itemBuckets.nodes.set(r,a.depth),a.depth!==y&&this.updateNodeDepthRanges(r,y,a.depth);var P=this.nodeProgramIndex[r];return P!==void 0&&(this.addNodeToProgram(r,P),this.nodeProgram.invalidateBuffers()),a.zIndex!==_}},{key:"refreshEdgeState",value:function(r){var a=this.internals.edgeDataCache[r];if(!a||this.edgeReducer){var i=a?.depth,o=a?.zIndex;this.updateEdge(r);var s=this.internals.edgeDataCache[r];i&&s.depth!==i&&this.updateEdgeDepthRanges(r,i,s.depth);var l=this.edgeProgramIndex[r];return l!==void 0&&(this.addEdgeToProgram(r,l),this.edgeProgram.invalidateBuffers()),o!==void 0&&s.zIndex!==o}var u=this.internals.graph.getEdgeAttributes(r),d=this.stateManager.getEdgeState(r),c=a.depth,h=a.zIndex,g=a.size,p=a.path,m=a.selfLoopPath,b=a.parallelPath,v=a.head,x=a.tail;So(this.stylesDeclaration.edges,u,d,this.stateManager.graphState,this.internals.graph,a),this.postEvaluateEdge(a,u),this.applyEdgeSpread(r,a,d),an(this.internals.edgesWithForcedLabels,r,Wt(a)),this.itemBuckets.edges.set(r,a.depth),a.depth!==c&&this.updateEdgeDepthRanges(r,c,a.depth);var y=this.edgeProgramIndex[r];if(y!==void 0){var _=a.size!==g||a.path!==p||a.selfLoopPath!==m||a.parallelPath!==b||a.head!==v||a.tail!==x;if(_)this.addEdgeToProgram(r,y),this.edgeProgram.invalidateBuffers();else{var S=this.internals.graph.source(r),T=this.internals.graph.target(r),A=this.internals.nodeDataCache[S],w=this.internals.nodeDataCache[T],E=this.edgeTextureIndexCache[r];this.edgeProgram.process(fn(this.pickingState,"edge",r),y,A,w,a,E),this.edgeProgram.invalidateBuffers()}}return a.zIndex!==h}},{key:"refresh",value:function(r){var a=this,i=r?.skipIndexation!==void 0?r?.skipIndexation:!1,o=r?.schedule!==void 0?r.schedule:!1,s=!r||!r.partialGraph;if(s)this.clearEdgeIndices(),this.clearNodeIndices(),this.internals.graph.forEachNode(function(A){return a.addNode(A)}),this.edgeGroups.rebuild(),this.internals.graph.forEachEdge(function(A){return a.addEdge(A)}),this.pendingProcess="full";else{for(var l,u,d=((l=r.partialGraph)===null||l===void 0?void 0:l.nodes)||[],c=0,h=d?.length||0;c<h;c++){var g,p,m=""+d[c],b=(g=this.internals.nodeDataCache[m])===null||g===void 0?void 0:g.labelAttachment;if(this.updateNode(m),this.internals.attachmentManager&&((p=this.internals.nodeDataCache[m])!==null&&p!==void 0&&p.labelAttachment||b)&&this.internals.attachmentManager.invalidateNode(m),i){var v=this.nodeProgramIndex[m];if(v===void 0)throw new Error('Sigma: node "'.concat(m,`" can't be repaint`));this.addNodeToProgram(m,v)}}i&&d.length>0&&(this.nodeProgram.invalidateBuffers(),this.labelRenderer.labelsDirty=!0);for(var x=(r==null||(u=r.partialGraph)===null||u===void 0?void 0:u.edges)||[],y=0,_=x.length;y<_;y++){var S=""+x[y];if(this.updateEdge(S),i){var T=this.edgeProgramIndex[S];if(T===void 0)throw new Error('Sigma: edge "'.concat(S,`" can't be repaint`));this.addEdgeToProgram(S,T)}}i&&x.length>0&&(this.edgeProgram.invalidateBuffers(),this.labelRenderer.labelsDirty=!0),!i&&this.pendingProcess!=="full"&&(this.pendingProcess=x.length>0?"full":"nodes")}return o?this.scheduleRender():this.render(),this}},{key:"scheduleRender",value:function(){var r=this;return this.renderFrame||(this.renderFrame=requestAnimationFrame(function(){r.render()})),this}},{key:"scheduleRefresh",value:function(r){return this.refresh(H(H({},r),{},{schedule:!0}))}},{key:"getViewportZoomedState",value:function(r,a){var i=this.camera.getState(),o=i.ratio,s=i.angle,l=i.x,u=i.y,d=this.internals.settings,c=d.minCameraRatio,h=d.maxCameraRatio;typeof h=="number"&&(a=Math.min(a,h)),typeof c=="number"&&(a=Math.max(a,c));var g=a/o,p={x:this.width/2,y:this.height/2},m=this.viewportToFramedGraph(r),b=this.viewportToFramedGraph(p);return{angle:s,x:(m.x-b.x)*(1-g)+l,y:(m.y-b.y)*(1-g)+u,ratio:a}}},{key:"viewRectangle",value:function(){var r=this.viewportToFramedGraph({x:0,y:0}),a=this.viewportToFramedGraph({x:this.width,y:0}),i=this.viewportToFramedGraph({x:0,y:this.height});return{x1:r.x,y1:r.y,x2:a.x,y2:a.y,height:a.y-i.y}}},{key:"framedGraphToViewport",value:function(r){var a=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},i=!!a.cameraState||!!a.viewportDimensions||!!a.graphDimensions||!!a.padding,o=a.matrix||(i?Dt(a.cameraState||this.camera.getState(),a.viewportDimensions||this.getDimensions(),a.graphDimensions||this.getGraphDimensions(),a.padding||this.getStagePadding()):this.matrix),s=tn(o,r);return{x:(1+s.x)*this.width/2,y:(1-s.y)*this.height/2}}},{key:"viewportToFramedGraph",value:function(r){var a=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},i=!!a.cameraState||!!a.viewportDimensions||!!a.graphDimensions||!!a.padding,o=a.matrix||(i?Dt(a.cameraState||this.camera.getState(),a.viewportDimensions||this.getDimensions(),a.graphDimensions||this.getGraphDimensions(),a.padding||this.getStagePadding(),!0):this.invMatrix),s=tn(o,{x:r.x/this.width*2-1,y:1-r.y/this.height*2});return isNaN(s.x)&&(s.x=0),isNaN(s.y)&&(s.y=0),s}},{key:"viewportToGraph",value:function(r){var a=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{};return this.normalizationFunction.inverse(this.viewportToFramedGraph(r,a))}},{key:"graphToViewport",value:function(r){var a=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{};return this.framedGraphToViewport(this.normalizationFunction(r),a)}},{key:"graphToFramedGraph",value:function(r){return this.normalizationFunction(r)}},{key:"framedGraphToGraph",value:function(r){return this.normalizationFunction.inverse(r)}},{key:"getGraphToViewportRatio",value:function(){var r={x:0,y:0},a={x:1,y:1},i=Math.sqrt(Math.pow(r.x-a.x,2)+Math.pow(r.y-a.y,2)),o=this.graphToViewport(r),s=this.graphToViewport(a),l=Math.sqrt(Math.pow(o.x-s.x,2)+Math.pow(o.y-s.y,2));return l/i}},{key:"computeNodeExtent",value:function(){var r=this.nodeGraphCoords,a=Object.keys(r);if(!a.length)return{x:[0,1],y:[0,1]};for(var i=1/0,o=-1/0,s=1/0,l=-1/0,u=0,d=a.length;u<d;u++){var c=r[a[u]],h=c.x,g=c.y;h<i&&(i=h),h>o&&(o=h),g<s&&(s=g),g>l&&(l=g)}return{x:[i,o],y:[s,l]}}},{key:"getBBox",value:function(){return this.nodeExtent}},{key:"getCustomBBox",value:function(){return this.customBBox}},{key:"setCustomBBox",value:function(r){return this.customBBox=r,this.scheduleRender(),this}},{key:"kill",value:function(){var r,a,i,o,s;this.emit("kill"),this.removeAllListeners(),this.camera.cancelAnimation(),this.unbindCameraHandlers(),window.removeEventListener("resize",this.activeListeners.handleResize),this.mouseCaptor.kill(),this.touchCaptor.kill(),this.internals.hoverResolver.kill(),this.unbindGraphHandlers(),this.clearIndices(),this.clearState(),this.internals.nodeDataCache={},this.internals.edgeDataCache={},this.renderFrame&&(cancelAnimationFrame(this.renderFrame),this.renderFrame=null);for(var l=this.container;l.firstChild;)l.removeChild(l.firstChild);this.nodeProgram.kill(),this.nodeFramePass.kill(),this.edgeProgram.kill(),this.edgeFramePass.kill(),this.internals.labelProgram.kill(),(r=this.internals.edgeLabelProgram)===null||r===void 0||r.kill(),(a=this.internals.edgeLabelBackgroundProgram)===null||a===void 0||a.kill(),this.internals.backdropProgram.kill(),this.internals.labelBackgroundProgram.kill(),(i=this.internals.attachmentProgram)===null||i===void 0||i.kill(),(o=this.internals.attachmentManager)===null||o===void 0||o.kill(),this.internals.attachmentProgram=null,this.internals.attachmentManager=null;var u=U(this.customLayerPrograms.values()),d;try{for(u.s();!(d=u.n()).done;){var c=d.value.program;c.kill()}}catch(p){u.e(p)}finally{u.f()}if(this.customLayerPrograms.clear(),this.sdfAtlas&&(this.sdfAtlas=null),this.internals.nodeDataTexture&&(this.internals.nodeDataTexture.kill(),this.internals.nodeDataTexture=null),this.internals.nodeFrameTexture&&(this.internals.nodeFrameTexture.kill(),this.internals.nodeFrameTexture=null),this.internals.edgeDataTexture&&(this.internals.edgeDataTexture.kill(),this.internals.edgeDataTexture=null),this.internals.edgeFrameTexture&&(this.internals.edgeFrameTexture.kill(),this.internals.edgeFrameTexture=null),this.webGLContext){var h;(h=this.webGLContext.getExtension("WEBGL_lose_context"))===null||h===void 0||h.loseContext(),this.webGLContext=null}(s=this.gestureHint)===null||s===void 0||s.kill(),this.gestureHint=null,this.mouseLayer.remove();for(var g in this.extraElements)this.extraElements[g].remove();this.extraElements={}}},{key:"scaleSize",value:function(){var r=arguments.length>0&&arguments[0]!==void 0?arguments[0]:1,a=arguments.length>1&&arguments[1]!==void 0?arguments[1]:this.camera.ratio;return r/this.internals.settings.zoomToSizeRatioFunction(a)*(this.getSetting("itemSizesReference")==="positions"?a*this.graphToViewportRatio:1)}},{key:"getStageCanvas",value:function(){return this.stageCanvas}},{key:"getMouseLayer",value:function(){return this.mouseLayer}}])})(ka),Hd=uy;var Z0=We(Gt());function jd(e,n){return typeof e=="number"?e:(re(e)==="object"&&e!==null&&"attribute"in e,n)}function Xd(e){var n=e??{},t=n.cornerRadius,r=n.rotation,a=jd(t,0),i=jd(r,0),o=`
`.concat(Bn,`
float sdf_square(vec2 uv, float size, float cornerRadius, float rotation) {
  // Apply rotation if needed
  vec2 p = uv;
  if (rotation != 0.0) {
    p = rotate2D(rotation) * p;
  }

  // Distance to box with given corner radius
  // Based on Inigo Quilez's box SDF: https://iquilezles.org/articles/distfunctions2d/
  vec2 d = abs(p) - vec2(size - cornerRadius);
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - cornerRadius;
}
`);return{name:"square",glsl:o,uniforms:[{name:"u_cornerRadius",type:"float",value:a},{name:"u_rotation",type:"float",value:i}],inradiusFactor:Math.SQRT1_2}}function qd(e,n){return typeof e=="number"?e:(re(e)==="object"&&e!==null&&"attribute"in e,n)}function Yd(e){var n=e??{},t=n.cornerRadius,r=n.rotation,a=qd(t,0),i=qd(r,0),o=`
`.concat(Bn,`
float sdf_triangle(vec2 uv, float size, float cornerRadius, float rotation) {
  // Apply rotation if needed
  vec2 p = uv;
  if (rotation != 0.0) {
    p = rotate2D(rotation) * p;
  }

  // Equilateral triangle SDF
  // Based on Inigo Quilez's triangle SDF: https://iquilezles.org/articles/distfunctions2d/
  //
  // The IQ formula uses parameter 'r' where the triangle has width = 2r.
  // For circumradius R (distance from centroid to vertex):
  //   R = r * 2 / sqrt(3), so r = R * sqrt(3) / 2
  const float k = sqrt(3.0);
  float r = size * k / 2.0;

  p.x = abs(p.x) - r;
  p.y = p.y + r / k;
  if (p.x + k * p.y > 0.0) {
    p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  }
  p.x -= clamp(p.x, -2.0 * r, 0.0);
  float dist = -length(p) * sign(p.y);

  // Apply corner radius if specified
  if (cornerRadius > 0.0) {
    dist = dist + cornerRadius;
  }

  return dist;
}
`);return{name:"triangle",glsl:o,uniforms:[{name:"u_cornerRadius",type:"float",value:a},{name:"u_rotation",type:"float",value:i}],inradiusFactor:.5}}function Vd(e,n){return typeof e=="number"?e:(re(e)==="object"&&e!==null&&"attribute"in e,n)}function Kd(e){var n=e??{},t=n.cornerRadius,r=n.rotation,a=Vd(t,0),i=Vd(r,0),o=`
`.concat(Bn,`
float sdf_diamond(vec2 uv, float size, float cornerRadius, float rotation) {
  // Apply rotation if needed
  vec2 p = uv;
  if (rotation != 0.0) {
    p = rotate2D(rotation) * p;
  }

  // Diamond SDF - using rhombus formula from Inigo Quilez
  // https://iquilezles.org/articles/distfunctions2d/
  // For a diamond (square rotated 45\xB0), b = (size, size)
  vec2 b = vec2(size, -size);
  p = abs(p);
  float h = clamp((dot(b, p) + b.y * b.y) / dot(b, b), 0.0, 1.0);
  p -= b * vec2(h, h - 1.0);
  float d = length(p) * sign(p.x);

  // Apply corner radius if specified
  if (cornerRadius > 0.0) {
    d = d + cornerRadius;
  }

  return d;
}
`);return{name:"diamond",glsl:o,uniforms:[{name:"u_cornerRadius",type:"float",value:a},{name:"u_rotation",type:"float",value:i}],inradiusFactor:Math.SQRT1_2}}var dy="pixels",cy="butt";function hy(e){return e===void 0||e===!1?{tail:!1,head:!1}:e===!0?{tail:!0,head:!0}:e==="head"?{tail:!1,head:!0}:{tail:!0,head:!1}}function fy(e){var n,t;return e===void 0?{tail:0,head:0}:typeof e=="number"?{tail:e,head:e}:{tail:(n=e.tail)!==null&&n!==void 0?n:0,head:(t=e.head)!==null&&t!==void 0?t:0}}function Zd(e){var n,t,r,a,i,o,s,l=e??{},u=(n=l.dashColor)!==null&&n!==void 0?n:{attribute:"color"},d=(t=l.gapColor)!==null&&t!==void 0?t:0,c={dashSize:(r=l.dashSize)!==null&&r!==void 0?r:{value:10,mode:"pixels"},gapSize:(a=l.gapSize)!==null&&a!==void 0?a:{value:10,mode:"pixels"},dashOffset:(i=l.dashOffset)!==null&&i!==void 0?i:{value:0,mode:"pixels"}},h=(o=l.align)!==null&&o!==void 0?o:.5,g=(s=l.cap)!==null&&s!==void 0?s:cy,p=hy(l.solidExtremities),m=fy(l.solidMargin),b=yr(u,"dashColor"),v=[c.dashSize,c.gapSize,c.dashOffset].map(function(k){var P;return((P=k.mode)!==null&&P!==void 0?P:dy)==="relative"?1:0}),x=[{name:"u_sizeMode",type:"vec3",value:v},{name:"u_align",type:"float",value:h},{name:"u_solidExtremities",type:"vec2",value:[p.tail?1:0,p.head?1:0]},{name:"u_solidMargin",type:"vec2",value:[m.tail,m.head]}],y=Z(b.attributes),_=b.needsNodeColors,S;if(typeof d=="number")S="vec4(dashColor.rgb, dashColor.a * ".concat(ge(d),")");else{var T=yr(d,"gapColor");S=T.glsl,y.push.apply(y,Z(T.attributes)),_=_||T.needsNodeColors}var A=!("value"in c.dashSize),w=!("value"in c.gapSize),E=!("value"in c.dashOffset);["dashSize","gapSize","dashOffset"].forEach(function(k){if("value"in c[k])x.push({name:"u_".concat(k),type:"float",value:c[k].value});else{var P;y.push({name:"a_".concat(k),size:1,type:WebGL2RenderingContext.FLOAT,source:c[k].attribute}),x.push({name:"u_".concat(k),type:"float",value:(P=c[k].default)!==null&&P!==void 0?P:0})}});var R=function(P,D){return D?"(v_".concat(P," > 0.0 ? v_").concat(P," : u_").concat(P,")"):"u_".concat(P)},L=`
// Dashed pattern layer with antialiased boundaries
// Uniforms:
//   u_dashSize: size of each dash (or default when using attribute)
//   u_gapSize: size of gaps between dashes (or default when using attribute)
//   u_dashOffset: offset to shift the pattern (or default when using attribute)
//   u_sizeMode: vec3 indicating if values are thickness-relative (x=dash, y=gap, z=offset)
//   u_align: pattern alignment (0=start, 0.5=center, 1=end)
//   u_solidExtremities: vec2(tail, head) - 1.0 means solid, 0.0 means dashed
//   u_solidMargin: vec2(tail, head) - extra solid margin in pixels
`.concat(A?"// Varying: v_dashSize for per-edge dash size":"",`
`).concat(w?"// Varying: v_gapSize for per-edge gap size":"",`
`).concat(E?"// Varying: v_dashOffset for per-edge dash offset":"",`

vec4 layer_dashed(EdgeContext ctx) {
  // Dash color (straight alpha, matching v_color and blendOver)
  vec4 dashColor = `).concat(b.glsl,`;

  // Check for solid zones first (extremities and margins)
  // v_zone: 0=tail extremity, 1=body, 2=head extremity
  // v_tailLengthRatio and v_headLengthRatio give extremity lengths as ratio of thickness

  // Tail solid zone check
  if (u_solidExtremities.x > 0.5 && v_zone < 0.5) {
    // In tail extremity zone and solidExtremities.tail is enabled
    return dashColor;
  }
  // Head solid zone check
  if (u_solidExtremities.y > 0.5 && v_zone > 1.5) {
    // In head extremity zone and solidExtremities.head is enabled
    return dashColor;
  }

  // Compute extremity lengths in world units for margin calculation
  float tailExtremityLength = v_tailLengthRatio * ctx.thickness;
  float headExtremityLength = v_headLengthRatio * ctx.thickness;

  // Convert pixel margins to world units (same formula as thickness conversion)
  float tailMarginWorld = u_solidMargin.x * u_correctionRatio / u_sizeRatio;
  float headMarginWorld = u_solidMargin.y * u_correctionRatio / u_sizeRatio;

  // Tail margin check (margin starts after extremity zone)
  float tailSolidZone = (u_solidExtremities.x > 0.5 ? tailExtremityLength : 0.0) + tailMarginWorld;
  if (ctx.distanceFromSource < tailSolidZone) {
    return dashColor;
  }

  // Head margin check (margin starts before extremity zone)
  float headSolidZone = (u_solidExtremities.y > 0.5 ? headExtremityLength : 0.0) + headMarginWorld;
  if (ctx.distanceToTarget < headSolidZone) {
    return dashColor;
  }

  // Get dash size values (from attribute if available, otherwise uniform)
  float dashSizeValue = `).concat(R("dashSize",A),`;
  float gapSizeValue = `).concat(R("gapSize",w),`;
  float dashOffsetValue = `).concat(R("dashOffset",E),`;

  // Compute actual sizes (either in pixels converted to world units, or relative to thickness)
  float pixelToWorld = u_correctionRatio / u_sizeRatio;
  float dashSize = dashSizeValue * (u_sizeMode.x > 0.5 ? ctx.thickness : pixelToWorld);
  float gapSize = gapSizeValue * (u_sizeMode.y > 0.5 ? ctx.thickness : pixelToWorld);
  float dashOffset = dashOffsetValue * (u_sizeMode.z > 0.5 ? ctx.thickness : pixelToWorld);

  // Early return when no visible dash pattern:
  // - dashSize \u2248 0: no dashes to show, return transparent (let plain layer show through)
  // - gapSize \u2248 0: all dash/no gap, effectively solid, return transparent (let plain layer handle it)
  // Threshold scales with pixelToWorld so it stays ~0.1px regardless of zoom
  float dashThreshold = 0.1 * pixelToWorld;
  if (dashSize < dashThreshold || gapSize < dashThreshold) {
    return vec4(0.0);
  }

  // Pattern length is dash + gap
  float patternLength = dashSize + gapSize;

  // Adjust distances for solid zones (pattern starts after solid zones)
  float adjustedDistFromSource = ctx.distanceFromSource - tailSolidZone;
  float adjustedDistToTarget = ctx.distanceToTarget - headSolidZone;

  // Compute alignment anchor point
  // - align: 0 \u2192 anchor at start, pattern begins with a dash
  // - align: 1 \u2192 anchor at end, pattern ends with a dash
  // - align: 0.5 \u2192 anchor at center, pattern is symmetric
  float dashedLength = adjustedDistFromSource + adjustedDistToTarget;
  float anchorDist = u_align * dashedLength;

  // Position within the repeating pattern
  // By subtracting anchorDist, we ensure the anchor point maps to position 0 in the pattern
  // This avoids the unstable mod(dashedLength, patternLength) operation
  float posInPattern = mod(adjustedDistFromSource - anchorDist + dashOffset, patternLength);

  // Signed longitudinal distance to the nearest dash center, wrapping across
  // pattern repetitions so both dash edges antialias correctly
  float longFromCenter =
    mod(posInPattern - dashSize * 0.5 + patternLength * 0.5, patternLength) - patternLength * 0.5;

  // Compute signed distance field for the dash
  // Positive inside dash, negative inside gap
`).concat(g==="round"?`  // Capsule SDF: round caps carved inside the dash length, so a dash never
  // exceeds dashSize. Dashes shorter than the thickness degenerate to circles
  // (dots) of diameter dashSize.
  // ctx.sdf is 0 at the stroke boundary, so shift it back to centerline distance
  float transverse = ctx.sdf + ctx.thickness * 0.5;
  float capRadius = min(ctx.thickness, dashSize) * 0.5;
  float halfLength = dashSize * 0.5 - capRadius;
  vec2 q = vec2(max(abs(longFromCenter) - halfLength, 0.0), transverse);
  float sdf = capRadius - length(q);`:"  float sdf = dashSize * 0.5 - abs(longFromCenter);",`

  // Apply antialiasing using smoothstep
  // aaWidth is in world units, same as our distance
  float dashAlpha = smoothstep(-ctx.aaWidth, ctx.aaWidth, sdf);

  // Gap color (straight alpha, like the dash color)
  vec4 gapColor = `).concat(S,`;

  // Blend between gap and dash colors
  return mix(gapColor, dashColor, dashAlpha);
}
`);return{name:"dashed",glsl:L,uniforms:x,attributes:y,needsNodeColors:_}}function Qd(e){var n=e??{},t=n.segments,r=t===void 0?16:t,a=`
// Compute control point from curvature
// Control point is placed perpendicular to the midpoint of source-target line
vec2 computeControlPoint(vec2 source, vec2 target, float curvature) {
  vec2 midpoint = 0.5 * (source + target);
  vec2 delta = target - source;
  // Perpendicular direction (rotated 90 degrees)
  vec2 perp = vec2(-delta.y, delta.x);
  float len = length(perp);
  if (len < 0.0001) return midpoint;
  perp = perp / len;
  // Offset by curvature * edge length
  return midpoint + perp * curvature * len;
}

// Position at parameter t \u2208 [0, 1]
vec2 path_curved_position(float t, vec2 source, vec2 target) {
  float curvature = v_curvature;
  vec2 control = computeControlPoint(source, target, curvature);
  float u = 1.0 - t;
  return u * u * source + 2.0 * u * t * control + t * t * target;
}

// Derivative of quadratic Bezier (for efficient arc length computation)
vec2 path_curved_derivative(float t, vec2 source, vec2 target) {
  float curvature = v_curvature;
  vec2 control = computeControlPoint(source, target, curvature);
  // B'(t) = 2(1-t)(P1-P0) + 2t(P2-P1)
  return 2.0 * (1.0 - t) * (control - source) + 2.0 * t * (target - control);
}

// Approximate arc length using 5-point Gauss-Legendre quadrature
float path_curved_length(vec2 source, vec2 target) {
  // Gauss-Legendre 5-point weights and abscissae
  const float x1 = 0.9061798459, x2 = 0.5384693101;
  const float w1 = 0.2369268850, w2 = 0.4786286705, w3 = 0.5688888889;

  // Transform from [-1,1] to [0,1]: t = 0.5 * (x + 1)
  float t1a = 0.5 * (-x1 + 1.0), t1b = 0.5 * (x1 + 1.0);
  float t2a = 0.5 * (-x2 + 1.0), t2b = 0.5 * (x2 + 1.0);

  // Evaluate derivative magnitudes at sample points
  float d1a = length(path_curved_derivative(t1a, source, target));
  float d1b = length(path_curved_derivative(t1b, source, target));
  float d2a = length(path_curved_derivative(t2a, source, target));
  float d2b = length(path_curved_derivative(t2b, source, target));
  float d3 = length(path_curved_derivative(0.5, source, target));

  // Sum weighted samples (factor of 0.5 for interval transformation)
  return 0.5 * (w1 * (d1a + d1b) + w2 * (d2a + d2b) + w3 * d3);
}
`;return{name:"curved",segments:r,glsl:a,uniforms:[],attributes:[{name:"curvature",size:1,type:WebGL2RenderingContext.FLOAT}],variables:{curvature:{type:"number",default:0}},spread:{variable:"curvature",compute:function(o,s,l){return(o-(s-1)/2)*l}}}}function Jd(e){var n=e??{},t=n.lengthRatio,r=t===void 0?5:t,a=n.widthRatio,i=a===void 0?4:a,o=n.margin,s=o===void 0?0:o,l=`
// Arrow SDF: triangle with base at x=0, tip at x=lengthRatio
// uv.x: 0 (base) to lengthRatio (tip), uv.y: [-halfW, +halfW]
// Returns signed distance (negative inside, positive outside)
float extremity_arrow(vec2 uv, float lengthRatio, float widthRatio) {
  float x = uv.x;
  float y = abs(uv.y);
  float halfW = widthRatio * 0.5;

  // Past the tip: euclidean distance to tip point
  if (x > lengthRatio) {
    return length(vec2(x - lengthRatio, y));
  }

  // Back edge: signed distance to x=0 line
  float backDist = -x;

  // Side edge: signed distance to sloped triangle edge
  float clampedX = max(0.0, x);
  float maxY = halfW * (1.0 - clampedX / lengthRatio);
  float sideDist = y - maxY;

  // Convex shape SDF = max of half-plane distances
  return max(backDist, sideDist);
}
`;return{name:"arrow",glsl:l,length:r,widthFactor:i,margin:s,uniforms:[],attributes:[]}}var tS=We(on());var aS=We(Gt());function ri(e,n){return{type:"number",default:e,variable:n?.variable}}function ec(e,n){return{type:"color",default:e,variable:n?.variable}}function ai(e,n){return{type:"string",default:e,variable:n?.variable}}function tc(e,n){return{type:"boolean",default:e,variable:n?.variable}}function ii(e,n){return{type:{enum:e},default:n,variable:!1}}function nc(e,n){return{type:"array",items:e,minItems:n?.minItems}}function Ko(e,n){(n==null||n>e.length)&&(n=e.length);for(var t=0,r=Array(n);t<n;t++)r[t]=e[t];return r}function gy(e){if(Array.isArray(e))return Ko(e)}function py(e){if(typeof Symbol<"u"&&e[Symbol.iterator]!=null||e["@@iterator"]!=null)return Array.from(e)}function my(e,n){if(e){if(typeof e=="string")return Ko(e,n);var t={}.toString.call(e).slice(8,-1);return t==="Object"&&e.constructor&&(t=e.constructor.name),t==="Map"||t==="Set"?Array.from(e):t==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t)?Ko(e,n):void 0}}function vy(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function qn(e){return gy(e)||py(e)||my(e)||vy()}function si(e){"@babel/helpers - typeof";return si=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(n){return typeof n}:function(n){return n&&typeof Symbol=="function"&&n.constructor===Symbol&&n!==Symbol.prototype?"symbol":typeof n},si(e)}function Zo(e){return si(e)==="object"&&e!==null&&"attribute"in e}function rc(e){return typeof e=="string"}function oi(e){return si(e)==="object"&&e!==null&&"attribute"in e}function yy(e){var n=e.filter(function(b){return b.fill}).length,t=ge(n||1),r=e.flatMap(function(b,v){if(b.fill)return[];var x=b.size,y=b.mode,_=y==="pixels",S;return oi(x)?S="v_borderSize_".concat(v+1):S=ge(typeof x=="number"?x:0),_?["  float borderSize_".concat(v+1," = ").concat(S," * context.pixelToUV;")]:["  float borderSize_".concat(v+1," = context.shapeHalfSize * ").concat(S,";")]}).join(`
`),a=e.flatMap(function(b,v){return b.fill?[]:["borderSize_".concat(v+1)]}).join(" + "),i=a||"0.0",o=e.flatMap(function(b,v){return b.fill?["  float borderSize_".concat(v+1," = fillBorderSize;")]:[]}).join(`
`),s=e.map(function(b,v){return"  float boundary_".concat(v+1," = boundary_").concat(v," - borderSize_").concat(v+1,";")}).join(`
`),l=e.map(function(b,v){var x=b.color;return Zo(x)?"  vec4 borderColor_".concat(v+1," = v_borderColor_").concat(v+1,";"):"  vec4 borderColor_".concat(v+1," = u_borderColor_").concat(v+1,";")}).join(`
`),u=e.map(function(b,v){return"  borderColor_".concat(v+1,`.a *= bias;
  if (borderSize_`).concat(v+1," <= 2.0 * context.aaWidth) { borderColor_").concat(v+1," = ").concat(v===0?"borderColor_1":"borderColor_".concat(v),"; }")}).join(`
`),d=e.map(function(b,v){return v===0?`if (context.sdf > boundary_1) {
    color = borderColor_1;
  } else `:"if (context.sdf > boundary_".concat(v,` - 2.0 * context.aaWidth) {
    color = mix(borderColor_`).concat(v+1,", borderColor_").concat(v,", (context.sdf - boundary_").concat(v,` + 2.0 * context.aaWidth) / (2.0 * context.aaWidth));
  } else if (context.sdf > boundary_`).concat(v+1,`) {
    color = borderColor_`).concat(v+1,`;
  } else `)}).join(""),c=[].concat(qn(e.flatMap(function(b,v){var x=b.color;return Zo(x)?["vec4 v_borderColor_".concat(v+1)]:[]})),qn(e.flatMap(function(b,v){var x=b.size;return oi(x)?["float v_borderSize_".concat(v+1)]:[]}))),h=e.flatMap(function(b,v){var x=b.color;return rc(x)?["vec4 u_borderColor_".concat(v+1)]:[]}),g=[].concat(qn(c),qn(h)).join(", "),p=oi(e[0].size),m=`
vec4 layer_border(`.concat(g,`) {
  const float bias = 255.0 / 254.0;

  // Calculate border sizes (using context.shapeSize and context.pixelSize)
`).concat(r,`
`).concat(p?`
  // Early return if first border size is effectively zero (layer disabled)
  if (borderSize_1 <= context.aaWidth) {
    return vec4(0.0);
  }
`:"",`
  // Calculate fill border size (distribute remaining space)
  // Use inradiusFactor to get actual shape depth from the bounding size
  // For circle/square (inradiusFactor=1.0), this equals shapeSize
  // For triangle (inradiusFactor=0.5), this is half of shapeSize
  float shapeDepth = context.shapeSize * context.inradiusFactor;
  float fillBorderSize = (shapeDepth - (`).concat(i,")) / ").concat(t,`;
`).concat(o,`

  // Calculate cumulative boundaries (from outside to inside in SDF space)
  float boundary_0 = 0.0;  // Shape edge at context.sdf=0
`).concat(s,`

  // Set up colors
`).concat(l,`
`).concat(u,`

  // Select color based on SDF position with antialiasing
  // Note: outer edge AA (context.sdf > 0 transition) is handled by the composed generator's smoothstep
  vec4 color = vec4(0.0);
  `).concat(d,"{ color = borderColor_").concat(e.length,`; }

  return color;
}
`);return m}function ac(e){var n,t=(n=e?.borders)!==null&&n!==void 0?n:[];if(t.length===0)return{name:"border",uniforms:[],attributes:[],glsl:"vec4 layer_border() { return vec4(0.0); }"};var r=WebGL2RenderingContext,a=r.UNSIGNED_BYTE,i=r.FLOAT,o=t.flatMap(function(l,u){var d=l.color;return rc(d)?[{name:"u_borderColor_".concat(u+1),type:"vec4",value:mr(d)}]:[]}),s=[].concat(qn(t.flatMap(function(l,u){var d=l.color;return Zo(d)?[{name:"borderColor_".concat(u+1),size:4,type:a,normalized:!0,source:d.attribute,defaultValue:d.default}]:[]})),qn(t.flatMap(function(l,u){var d=l.size;return oi(d)?[{name:"borderSize_".concat(u+1),size:1,type:i,source:d.attribute,defaultValue:d.default}]:[]})));return{name:"border",uniforms:o,attributes:s,glsl:yy(t)}}var uS={borders:nc({size:ri(.1,{variable:!0}),color:ec("#000000",{variable:!0}),mode:ii(["relative","pixels"],"relative"),fill:tc(!1)})};var uc=We(Gt());function by(e,n){if(e==null)return{};var t={};for(var r in e)if({}.hasOwnProperty.call(e,r)){if(n.indexOf(r)!==-1)continue;t[r]=e[r]}return t}function xy(e,n){if(e==null)return{};var t,r,a=by(e,n);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)t=i[r],n.indexOf(t)===-1&&{}.propertyIsEnumerable.call(e,t)&&(a[t]=e[t])}return a}function Sy(e,n){if(typeof e!="object"||!e)return e;var t;if(typeof Symbol<"u"&&(t=e[Symbol.toPrimitive])!==void 0){var r=t.call(e,n||"default");if(typeof r!="object")return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return(n==="string"?String:Number)(e)}function dc(e){var n=Sy(e,"string");return typeof n=="symbol"?n:n+""}function Lt(e,n,t){return(n=dc(n))in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function ic(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter(function(a){return Object.getOwnPropertyDescriptor(e,a).enumerable})),t.push.apply(t,r)}return t}function Me(e){for(var n=1;n<arguments.length;n++){var t=arguments[n]!=null?arguments[n]:{};n%2?ic(Object(t),!0).forEach(function(r){Lt(e,r,t[r])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):ic(Object(t)).forEach(function(r){Object.defineProperty(e,r,Object.getOwnPropertyDescriptor(t,r))})}return e}function Qo(e,n){(n==null||n>e.length)&&(n=e.length);for(var t=0,r=Array(n);t<n;t++)r[t]=e[t];return r}function _y(e){if(Array.isArray(e))return Qo(e)}function Ty(e){if(typeof Symbol<"u"&&e[Symbol.iterator]!=null||e["@@iterator"]!=null)return Array.from(e)}function Ey(e,n){if(e){if(typeof e=="string")return Qo(e,n);var t={}.toString.call(e).slice(8,-1);return t==="Object"&&e.constructor&&(t=e.constructor.name),t==="Map"||t==="Set"?Array.from(e):t==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t)?Qo(e,n):void 0}}function wy(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function rs(e){return _y(e)||Ty(e)||Ey(e)||wy()}function Ve(e,n,t,r){var a=Object.defineProperty;try{a({},"",{})}catch{a=0}Ve=function(i,o,s,l){function u(d,c){Ve(i,d,function(h){return this._invoke(d,c,h)})}o?a?a(i,o,{value:s,enumerable:!l,configurable:!l,writable:!l}):i[o]=s:(u("next",0),u("throw",1),u("return",2))},Ve(e,n,t,r)}function pn(){var e,n,t=typeof Symbol=="function"?Symbol:{},r=t.iterator||"@@iterator",a=t.toStringTag||"@@toStringTag";function i(g,p,m,b){var v=p&&p.prototype instanceof s?p:s,x=Object.create(v.prototype);return Ve(x,"_invoke",(function(y,_,S){var T,A,w,E=0,R=S||[],L=!1,k={p:0,n:0,v:e,a:P,f:P.bind(e,4),d:function(D,I){return T=D,A=0,w=e,k.n=I,o}};function P(D,I){for(A=D,w=I,n=0;!L&&E&&!G&&n<R.length;n++){var G,z=R[n],F=k.p,M=z[2];D>3?(G=M===I)&&(w=z[(A=z[4])?5:(A=3,3)],z[4]=z[5]=e):z[0]<=F&&((G=D<2&&F<z[1])?(A=0,k.v=I,k.n=z[1]):F<M&&(G=D<3||z[0]>I||I>M)&&(z[4]=D,z[5]=I,k.n=M,A=0))}if(G||D>1)return o;throw L=!0,I}return function(D,I,G){if(E>1)throw TypeError("Generator is already running");for(L&&I===1&&P(I,G),A=I,w=G;(n=A<2?e:w)||!L;){T||(A?A<3?(A>1&&(k.n=-1),P(A,w)):k.n=w:k.v=w);try{if(E=2,T){if(A||(D="next"),n=T[D]){if(!(n=n.call(T,w)))throw TypeError("iterator result is not an object");if(!n.done)return n;w=n.value,A<2&&(A=0)}else A===1&&(n=T.return)&&n.call(T),A<2&&(w=TypeError("The iterator does not provide a '"+D+"' method"),A=1);T=e}else if((n=(L=k.n<0)?w:y.call(_,k))!==o)break}catch(z){T=e,A=1,w=z}finally{E=1}}return{value:n,done:L}}})(g,m,b),!0),x}var o={};function s(){}function l(){}function u(){}n=Object.getPrototypeOf;var d=[][r]?n(n([][r]())):(Ve(n={},r,function(){return this}),n),c=u.prototype=s.prototype=Object.create(d);function h(g){return Object.setPrototypeOf?Object.setPrototypeOf(g,u):(g.__proto__=u,Ve(g,a,"GeneratorFunction")),g.prototype=Object.create(c),g}return l.prototype=u,Ve(c,"constructor",u),Ve(u,"constructor",l),l.displayName="GeneratorFunction",Ve(u,a,"GeneratorFunction"),Ve(c),Ve(c,a,"Generator"),Ve(c,r,function(){return this}),Ve(c,"toString",function(){return"[object Generator]"}),(pn=function(){return{w:i,m:h}})()}function ui(e){return ui=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(n){return n.__proto__||Object.getPrototypeOf(n)},ui(e)}function cc(){try{var e=!Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],function(){}))}catch{}return(cc=function(){return!!e})()}function Ay(e){if(e===void 0)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}function Ry(e,n){if(n&&(typeof n=="object"||typeof n=="function"))return n;if(n!==void 0)throw new TypeError("Derived constructors may only return object or undefined");return Ay(e)}function Dy(e,n,t){return n=ui(n),Ry(e,cc()?Reflect.construct(n,t||[],ui(e).constructor):n.apply(e,t))}function Jo(e,n){return Jo=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(t,r){return t.__proto__=r,t},Jo(e,n)}function ky(e,n){if(typeof n!="function"&&n!==null)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(n&&n.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),Object.defineProperty(e,"prototype",{writable:!1}),n&&Jo(e,n)}function hc(e,n){if(!(e instanceof n))throw new TypeError("Cannot call a class as a function")}function oc(e,n){for(var t=0;t<n.length;t++){var r=n[t];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,dc(r.key),r)}}function fc(e,n,t){return n&&oc(e.prototype,n),t&&oc(e,t),Object.defineProperty(e,"prototype",{writable:!1}),e}function sc(e,n,t,r,a,i,o){try{var s=e[i](o),l=s.value}catch(u){return void t(u)}s.done?n(l):Promise.resolve(l).then(r,a)}function as(e){return function(){var n=this,t=arguments;return new Promise(function(r,a){var i=e.apply(n,t);function o(l){sc(i,r,a,o,s,"next",l)}function s(l){sc(i,r,a,o,s,"throw",l)}o(void 0)})}}var is={size:{mode:"max",value:512},objectFit:"cover",correctCentering:!1,maxTextureSize:4096,debounceTimeout:500,crossOrigin:"anonymous"},Cy=1;function es(e){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},t=n.crossOrigin;return new Promise(function(r,a){var i=new Image;i.addEventListener("load",function(){r(i)},{once:!0}),i.addEventListener("error",function(o){a(o.error)},{once:!0}),t&&i.setAttribute("crossOrigin",t),i.src=e})}function Ly(e){return ts.apply(this,arguments)}function ts(){return ts=as(pn().m(function e(n){var t,r,a,i,o,s,l,u,d,c,h,g,p,m=arguments;return pn().w(function(b){for(;;)switch(b.n){case 0:if(t=m.length>1&&m[1]!==void 0?m[1]:{},r=t.size,a=t.crossOrigin,a!=="use-credentials"){b.n=2;break}return b.n=1,fetch(n,{credentials:"include"});case 1:i=b.v,b.n=4;break;case 2:return b.n=3,fetch(n);case 3:i=b.v;case 4:return b.n=5,i.text();case 5:if(o=b.v,s=new DOMParser().parseFromString(o,"image/svg+xml"),l=s.documentElement,u=l.getAttribute("width"),d=l.getAttribute("height"),!(!u||!d)){b.n=6;break}throw new Error("loadSVGImage: cannot use `size` if target SVG has no definite dimensions.");case 6:return typeof r=="number"&&(l.setAttribute("width",""+r),l.setAttribute("height",""+r)),c=new XMLSerializer().serializeToString(s),h=new Blob([c],{type:"image/svg+xml"}),g=URL.createObjectURL(h),p=es(g),p.finally(function(){return URL.revokeObjectURL(g)}),b.a(2,p)}},e)})),ts.apply(this,arguments)}function Py(e){return ns.apply(this,arguments)}function ns(){return ns=as(pn().m(function e(n){var t,r,a,i,o,s,l=arguments;return pn().w(function(u){for(;;)switch(u.p=u.n){case 0:if(r=l.length>1&&l[1]!==void 0?l[1]:{},a=r.size,i=r.crossOrigin,o=((t=n.split(/[#?]/)[0].split(".").pop())===null||t===void 0?void 0:t.trim().toLowerCase())==="svg",!(o&&a)){u.n=6;break}return u.p=1,u.n=2,Ly(n,{size:a,crossOrigin:i});case 2:s=u.v,u.n=5;break;case 3:return u.p=3,u.v,u.n=4,es(n,{crossOrigin:i});case 4:s=u.v;case 5:u.n=8;break;case 6:return u.n=7,es(n,{crossOrigin:i});case 7:s=u.v;case 8:return u.a(2,s)}},e,null,[[1,3]])})),ns.apply(this,arguments)}function Iy(e,n,t){var r=t.objectFit,a=t.size,i=t.correctCentering,o=r==="contain"?Math.max(e.width,e.height):Math.min(e.width,e.height),s=a.mode==="auto"?o:a.mode==="force"?a.value:Math.min(a.value,o),l=(e.width-o)/2,u=(e.height-o)/2;if(i){var d=n.getCorrectionOffset(e,o);l=d.x,u=d.y}return{sourceX:l,sourceY:u,sourceSize:o,destinationSize:s}}function Fy(e,n,t){for(var r=n.canvas,a=r.width,i=r.height,o=[],s=t.x,l=t.y,u=t.rowHeight,d=t.maxRowWidth,c={},h=0,g=e.length;h<g;h++){var p=e[h],m=p.key,b=p.image,v=p.sourceSize,x=p.sourceX,y=p.sourceY,_=p.destinationSize,S=_+Cy;l+S>i||s+S>a&&l+S+u>i||(s+S>a&&(d=Math.max(d,s),s=0,l+=u,u=S),o.push({key:m,image:b,sourceX:x,sourceY:y,sourceSize:v,destinationX:s,destinationY:l,destinationSize:_}),c[m]={x:s,y:l,size:_},s+=S,u=Math.max(u,S))}d=Math.max(d,s);for(var T=d,A=l+u,w=0,E=o.length;w<E;w++){var R=o[w],L=R.image,k=R.sourceSize,P=R.sourceX,D=R.sourceY,I=R.destinationSize,G=R.destinationX,z=R.destinationY,F=I/k,M=Math.max(P,0),W=Math.max(D,0),X=Math.min(P+k,L.width)-M,q=Math.min(D+k,L.height)-W;n.drawImage(L,M,W,X,q,G+(M-P)*F,z+(W-D)*F,X*F,q*F)}return{atlas:c,texture:n.getImageData(0,0,T,A),cursor:{x:s,y:l,rowHeight:u,maxRowWidth:d}}}function My(e,n,t){var r=e.atlas,a=e.textures,i=e.cursor,o={atlas:Me({},r),textures:rs(a.slice(0,-1)),cursor:Me({},i)},s=[];for(var l in n){var u,d=n[l];if(d.status==="ready"){var c=(u=r[l])===null||u===void 0?void 0:u.textureIndex;typeof c!="number"&&s.push(Me({key:l},d))}}for(var h=function(){var p=Fy(s,t,o.cursor),m=p.atlas,b=p.texture,v=p.cursor;o.cursor=v;var x=[];s.forEach(function(y){m[y.key]?o.atlas[y.key]=Me(Me({},m[y.key]),{},{textureIndex:o.textures.length}):x.push(y)}),o.textures.push(b),s=x,s.length&&(o.cursor={x:0,y:0,rowHeight:0,maxRowWidth:0},t.clearRect(0,0,t.canvas.width,t.canvas.height))};s.length;)h();return o}var Ny=(function(){function e(){hc(this,e),this.canvas=document.createElement("canvas"),this.context=this.canvas.getContext("2d",{willReadFrequently:!0})}return fc(e,[{key:"getCorrectionOffset",value:function(t,r){this.canvas.width=r,this.canvas.height=r,this.context.clearRect(0,0,r,r),this.context.drawImage(t,0,0,r,r);for(var a=this.context.getImageData(0,0,r,r).data,i=new Uint8ClampedArray(a.length/4),o=0;o<a.length;o++)i[o]=a[o*4+3];for(var s=0,l=0,u=0,d=0;d<r;d++)for(var c=0;c<r;c++){var h=i[d*r+c];u+=h,s+=h*c,l+=h*d}var g=s/u,p=l/u;return{x:g-r/2,y:p-r/2}}}])})(),li=(function(e){function n(){var t,r=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};return hc(this,n),t=Dy(this,n),Lt(t,"canvas",document.createElement("canvas")),Lt(t,"ctx",t.canvas.getContext("2d",{willReadFrequently:!0})),Lt(t,"corrector",new Ny),Lt(t,"imageStates",{}),Lt(t,"textures",[t.ctx.getImageData(0,0,1,1)]),Lt(t,"lastTextureCursor",{x:0,y:0,rowHeight:0,maxRowWidth:0}),Lt(t,"atlas",{}),t.options=Me(Me({},is),r),t.canvas.width=t.options.maxTextureSize,t.canvas.height=t.options.maxTextureSize,t}return ky(n,e),fc(n,[{key:"scheduleGenerateTexture",value:function(){var r=this;typeof this.frameId!="number"&&(typeof this.options.debounceTimeout=="number"?this.frameId=window.setTimeout(function(){r.generateTextures(),r.frameId=void 0},this.options.debounceTimeout):this.generateTextures())}},{key:"generateTextures",value:function(){var r=My({atlas:this.atlas,textures:this.textures,cursor:this.lastTextureCursor},this.imageStates,this.ctx),a=r.atlas,i=r.textures,o=r.cursor;this.atlas=a,this.textures=i,this.lastTextureCursor=o,this.emit(n.NEW_TEXTURE_EVENT,{atlas:a,textures:i})}},{key:"registerImage",value:(function(){var t=as(pn().m(function a(i){var o,s;return pn().w(function(l){for(;;)switch(l.p=l.n){case 0:if(!this.imageStates[i]){l.n=1;break}return l.a(2);case 1:return this.imageStates[i]={status:"loading"},l.p=2,o=this.options.size,l.n=3,Py(i,{size:o.mode==="force"?o.value:void 0,crossOrigin:this.options.crossOrigin||void 0});case 3:s=l.v,this.imageStates[i]=Me({status:"ready",image:s},Iy(s,this.corrector,this.options)),this.scheduleGenerateTexture(),l.n=5;break;case 4:l.p=4,l.v,this.imageStates[i]={status:"error"};case 5:return l.a(2)}},a,this,[[2,4]])}));function r(a){return t.apply(this,arguments)}return r})()},{key:"clampMaxTextureSize",value:function(r){r>=this.options.maxTextureSize||(this.options.maxTextureSize=r,this.canvas.width=r,this.canvas.height=r,this.atlas={},this.textures=[this.ctx.getImageData(0,0,1,1)],this.lastTextureCursor={x:0,y:0,rowHeight:0,maxRowWidth:0},Object.values(this.imageStates).some(function(a){return a.status==="ready"})&&this.scheduleGenerateTexture())}},{key:"getAtlas",value:function(){return this.atlas}},{key:"getTextures",value:function(){return this.textures}}])})(uc.EventEmitter);Lt(li,"NEW_TEXTURE_EVENT","newTexture");var fS={name:ai("image"),drawingMode:ii(["image","color"],"image"),padding:ri(0),colorAttribute:ai("color"),imageAttribute:ai("image")},zy={name:"image",drawingMode:"image",padding:0,colorAttribute:"color",imageAttribute:"image"},gS=Me(Me({},is),{},{drawingMode:"image",shapeFactory:Ot,backgroundLayerFactory:vr,padding:0,colorAttribute:"color",imageAttribute:"image"}),Gy=["textureManager","textureManagerOptions"];function Oy(e){var n=6,t=6;if(e==="image")return n;for(var r=0,a=0;a<e.length;a++)r=(r<<5)-r+e.charCodeAt(a);var i=1+Math.abs(r)%3;return n+i*t}function By(e,n){var t=e.name,r=e.drawingMode,a=e.padding,i=ge(1+2*a),o=Math.max(1,n),s="u_atlas_".concat(t),l="layer_".concat(t),u="v_texture_".concat(t),d="v_textureIndex_".concat(t),c="v_color_".concat(t),h=rs(new Array(o)).map(function(b,v){return"if (index == ".concat(v,") texel = texture(").concat(s,"[").concat(v,"], (").concat(u,".xy + coordinateInTexture * ").concat(u,".zw), -1.0);")}).join(`
    else `),g=`else {
      texel = texture(`.concat(s,"[0], (").concat(u,".xy + coordinateInTexture * ").concat(u,`.zw), -1.0);
      noTextureFound = true;
    }`),p=r==="color"?"vec4 ".concat(u,", float ").concat(d,", vec4 ").concat(c):"vec4 ".concat(u,", float ").concat(d),m=`
// Texture atlas uniform - declared here because generator doesn't support sampler2D arrays
uniform sampler2D `.concat(s,"[").concat(o,`];

vec4 `).concat(l,"(").concat(p,`) {
  const float bias = 255.0 / 254.0;
  const float paddingRatio = `).concat(i,`;

  vec4 color = vec4(0.0);

  // Calculate coordinate within the texture
  // The UV is in [-1, 1] range, convert to [0, 1] for texture sampling
  // Note: Camera rotation is handled at the program level (vertex shader)
  vec2 coordinateInTexture = context.uv * vec2(paddingRatio, -paddingRatio) * 0.5 + vec2(0.5, 0.5);
  int index = int(`).concat(d,` + 0.5); // +0.5 to avoid rounding errors

  bool noTextureFound = false;
  vec4 texel = vec4(0.0);

  // No image to display - return transparent
  if (`).concat(u,`.w <= 0.0) {
    // Return transparent when no image
  }
  // Image loaded into the texture
  else {
    `).concat(h,`
    `).concat(g,`

    if (!noTextureFound) {
      `).concat(r==="color"?`// Colorize all visible image pixels with the specified color attribute
      color = mix(vec4(0.0), `.concat(c,", texel.a);"):`// Image mode: render image pixels as-is
      color = texel;`,`

      // Erase pixels "in the padding"
      // context.uv is in [-1, 1], so we check against 1.0 / paddingRatio
      float maxUV = 1.0 / paddingRatio;
      if (abs(context.uv.x) > maxUV || abs(context.uv.y) > maxUV) {
        color = vec4(0.0);
      }
    }
  }

  color.a *= bias;
  return color;
}
`);return m}function lc(e,n){var t=e.name,r=e.drawingMode,a=e.colorAttribute,i=WebGL2RenderingContext,o=i.FLOAT,s=i.UNSIGNED_BYTE,l=Math.max(1,n),u=[],d=[{name:"texture_".concat(t),size:4,type:o,source:"__texture__"},{name:"textureIndex_".concat(t),size:1,type:o,source:"__textureIndex__"}];return r==="color"&&d.push({name:"color_".concat(t),size:4,type:s,normalized:!0,source:a}),{name:t,uniforms:u,attributes:d,glsl:By(e,l)}}function gc(e){var n=Me(Me({},zy),e||{}),t=n.textureManager,r=n.textureManagerOptions,a=xy(n,Gy),i=a,o=1,s=lc(i,o),l=t??new li(Me(Me({},is),r));return Me(Me({},s),{},{lifecycle:function(d){var c=d.gl,h=d.requestShaderRegeneration,g=d.requestRefresh,p=[],m=[],b={},v=Oy(i.name),x=function(){for(;p.length<m.length;){var S=c.createTexture();S&&p.push(S)}for(var T=0;T<m.length;T++)c.activeTexture(c.TEXTURE0+v+T),c.bindTexture(c.TEXTURE_2D,p[T]),c.texImage2D(c.TEXTURE_2D,0,c.RGBA,c.RGBA,c.UNSIGNED_BYTE,m[T]),c.generateMipmap(c.TEXTURE_2D)},y=function(S){var T=S.atlas,A=S.textures,w=A.length!==m.length;b=T,m=A,w&&(o=A.length||1,h()),x(),g()};return{init:function(){l.on(li.NEW_TEXTURE_EVENT,y),l.clampMaxTextureSize(c.getParameter(c.MAX_TEXTURE_SIZE)),b=l.getAtlas(),m=l.getTextures(),x()},beforeRender:function(){for(var S=0;S<m.length;S++)c.activeTexture(c.TEXTURE0+v+S),c.bindTexture(c.TEXTURE_2D,p[S]);var T=d.getUniformLocation("u_atlas_".concat(i.name));T&&c.uniform1iv(T,rs(new Array(m.length||1)).map(function(A,w){return v+w}))},regenerate:function(){return lc(i,o)},getAttributeData:function(S,T){var A=S[i.imageAttribute];if(T==="__texture__"){var w=A?b[A]:void 0;if(w&&typeof w.textureIndex=="number"){var E=m[w.textureIndex],R=E.width,L=E.height;return[w.x/R,w.y/L,w.size/R,w.size/L]}return[0,0,0,0]}if(T==="__textureIndex__"){var k;typeof A=="string"&&!b[A]&&l.registerImage(A);var P=A?b[A]:void 0;return(k=P?.textureIndex)!==null&&k!==void 0?k:0}return null},kill:function(){l.off(li.NEW_TEXTURE_EVENT,y);for(var S=0,T=p;S<T.length;S++){var A=T[S];c.deleteTexture(A)}p=[]}}}})}var Wy=["circle","square","diamond","quatrefoil","hexagon","octagon","triangle","rectangle","shield"],vc=["ne","nw","se","sw"],pc=["alert","count","lock","text","icon"],Uy={lucide:{license:"ISC",name:"Lucide",url:"https://lucide.dev",attribution:null},"majesticons:line":{license:"MIT",name:"Majesticons (line)",url:"https://github.com/halfmage/majesticons",attribution:null},"majesticons:solid":{license:"MIT",name:"Majesticons (solid)",url:"https://github.com/halfmage/majesticons",attribution:null}},$y={ok:"#2E9E6B",warning:"#D9A21B",critical:"#D9483B",unknown:"#7A8599",planned:"#5B7BD5"},Hy=/^[a-z0-9][a-z0-9-]{0,80}$/,yc=/^[a-z0-9][a-z0-9_-]{0,40}$/,Ae=e=>e&&typeof e=="object"&&!Array.isArray(e);function di(e,n){return Hy.test(n||"")?e==="lucide"?`/explore/icons/lucide/${n}.svg`:e==="majesticons:line"?`/explore/icons/majesticons-line/${n}.svg`:e==="majesticons:solid"?`/explore/icons/majesticons-solid/${n}.svg`:e?.startsWith("custom:")&&yc.test(e.slice(7))?`/explore/icons/custom/${e.slice(7)}/${n}.svg`:null:null}function ci(e,n){if(typeof e!="string"||!e)return null;let t=e.lastIndexOf("/");return t>0?{set:e.slice(0,t),name:e.slice(t+1)}:{set:n,name:e}}function bc(e,n,t){if(!Ae(e)||e.enabled===!1)return null;let r={...Uy};for(let[u,d]of Object.entries(Ae(e.iconSets)?e.iconSets:{})){if(!yc.test(u)){n.push(`symbols.iconSets: bad set name ${u}`);continue}if(!Ae(d)||typeof d.license!="string"||!d.license.trim()){n.push(`symbols.iconSets.${u}: a "license" field is required for custom icons (set ignored)`);continue}r[`custom:${u}`]={license:d.license.trim(),name:d.name||u,url:d.source||null,attribution:d.attribution||null,custom:!0}}let a=typeof e.iconSet=="string"?e.iconSet:"lucide";r[a]||n.push(`symbols.iconSet ${a} is not a known or licensed set; using lucide`);let i=Ae(e.status)?e.status:{},o={...$y};for(let[u,d]of Object.entries(Ae(i.colors)?i.colors:{})){let c=t(d);c?o[u]=c:n.push(`symbols.status.colors.${u}: invalid colour`)}let s=Ae(e.fields)?e.fields:{},l=(u,d)=>u===!1?null:Ae(u)?{property:typeof u.property=="string"?u.property:d.property,maxRatio:Number.isFinite(u.maxRatio)?u.maxRatio:d.maxRatio,format:typeof u.format=="string"?u.format:d.format}:d;return{sets:r,defaultSet:r[a]?a:"lucide",statusColors:o,statusProperty:typeof i.property=="string"?i.property:null,size:Math.max(32,Math.min(256,Number(e.size)||96)),glyphColor:t(e.glyphColor)||null,fields:{uid:l(s.uid,{property:"id",maxRatio:.3,format:"{}"}),quantity:Ae(s.quantity)?l(s.quantity,{property:null,maxRatio:.15,format:"{}"}):null},milsymbol:Ae(e.milsymbol)?{property:e.milsymbol.property||"sidc",size:Number(e.milsymbol.size)||40}:null,legend:Ae(e.legend)?e.legend:{}}}function xc(e,n,t){switch(e){case"frame":if(Wy.includes(n)||Ae(n)&&typeof n.path=="string"&&n.path.length<4e3)return n;t(`unknown frame ${JSON.stringify(n)}`);return;case"frameDash":if(["solid","dashed"].includes(n))return n;t("frameDash must be solid or dashed");return;case"status":if(typeof n=="string"||Ae(n)&&typeof n.property=="string")return n;t("status must be a key or {property}");return;case"glyph":if(n===null||typeof n=="string"||Ae(n)&&typeof n.property=="string")return n;t("glyph must be an icon name, null or {property, map}");return;case"sidc":if(typeof n=="string"||Ae(n)&&typeof n.property=="string")return n;t("sidc must be a code or {property}");return;case"corners":{if(!Ae(n)){t("corners must be an object");return}let r={};for(let[a,i]of Object.entries(n)){if(!vc.includes(a)){t(`unknown corner ${a}`);continue}if(i===null){r[a]=null;continue}if(!Ae(i)||!pc.includes(i.kind)){t(`corner ${a}: kind must be one of ${pc.join(", ")}`);continue}r[a]=i}return r}}return n}var dt=(e,n)=>n==="id"?e.id:e.properties?.[n],mc=(e,n)=>(e||"{}").replace("{}",typeof n=="number"?Number.isInteger(n)?String(n):n.toFixed(1):String(n));function Mr(e,n,t,r){let a=typeof n.status=="string"?n.status:Ae(n.status)?dt(e,n.status.property):t.statusProperty?dt(e,t.statusProperty):null,i=a!=null&&t.statusColors[a]||r,o=n.glyph;if(Ae(o)){let h=dt(e,o.property);o=Ae(o.map)?o.map[String(h)]??o.default??null:h??null}let s=ci(o??n.icon??null,t.defaultSet),l=s&&t.sets[s.set]&&di(s.set,s.name)?`${s.set}/${s.name}`:null,u=[];for(let h of vc){let g=n.corners?.[h];if(!g)continue;let p=null;if(g.kind==="count"){let b=Number(g.property?dt(e,g.property):g.value);if(!Number.isFinite(b))continue;p=b>99?"99+":String(Math.round(b))}if(g.kind==="text"){let b=g.property?dt(e,g.property):g.text;if(b==null||b==="")continue;p=String(b).slice(0,4)}if(g.when&&!(dt(e,g.when.property)===g.when.value||String(dt(e,g.when.property))===String(g.when.value)))continue;let m=g.kind==="icon"?ci(g.icon,t.defaultSet):null;u.push({corner:h,kind:g.kind,text:p,color:g.color||(g.kind==="alert"?"#E5484D":g.kind==="lock"?"#3B4252":"#1F2937"),icon:m&&t.sets[m.set]&&di(m.set,m.name)?`${m.set}/${m.name}`:null})}let d=n.sidc;Ae(d)?d=dt(e,d.property):d==null&&t.milsymbol&&(d=dt(e,t.milsymbol.property));let c=d&&/^[A-Za-z0-9*\-]{10,30}$/.test(String(d))?{kind:"milsymbol",sidc:String(d)}:{kind:"composed",frame:n.frame||"circle",fill:i,dash:n.frameDash==="dashed",glyph:l,glyphColor:t.glyphColor,corners:u};return{...c,key:Sc(c)}}function Sc(e){return e.kind==="milsymbol"?`ms|${e.sidc}`:["c",typeof e.frame=="string"?e.frame:`p:${jy(e.frame.path)}`,e.fill,e.dash?1:0,e.glyph||"-",e.glyphColor||"",...e.corners.map(n=>`${n.corner}:${n.kind}:${n.text??""}:${n.color}:${n.icon||""}`)].join("|")}function jy(e){let n=2166136261;for(let t=0;t<e.length;t++)n^=e.charCodeAt(t),n=Math.imul(n,16777619);return(n>>>0).toString(36)}function _c(e,n){if(!e)return 0;let t=0;return e.fields.uid&&n<=e.fields.uid.maxRatio&&(t=1),e.fields.quantity?.property&&n<=e.fields.quantity.maxRatio&&(t=2),t}function Tc(e,n,t,r){if(!t||r===0)return n;let a=[n],i=t.fields.uid;if(i&&r>=1){let s=dt(e,i.property);s!=null&&s!==""&&String(s)!==n&&a.push(`[${mc(i.format,s)}]`)}let o=t.fields.quantity;if(o?.property&&r>=2){let s=dt(e,o.property);s!=null&&s!==""&&a.push(mc(o.format,s))}return a.join("  ")}function Ec(e,n,t,r){let a=Mr(e,n,t,r);if(a.kind!=="composed")return a;let i={...a,fill:r,dash:!1};return{...i,key:Sc({...i,corners:[]})}}var wc=e=>{let n=/^#?([0-9a-f]{6})/i.exec(e||"");if(!n)return .5;let t=parseInt(n[1],16),r=[t>>16,t>>8&255,t&255].map(a=>(a/=255,a<=.03928?a/12.92:((a+.055)/1.055)**2.4));return .2126*r[0]+.7152*r[1]+.0722*r[2]},os=new Map;function Ac(e,n,t){let r=`${e}|${n}`;if(os.has(r))return os.get(r);let a=ci(e,t),i=a&&di(a.set,a.name),o=i?fetch(i).then(s=>s.ok?s.text():null).then(s=>s?(s=s.replace(/<!--[\s\S]*?-->/g,"").replace(/currentColor/g,n).replace(/\swidth="[^"]*"/,' width="96"').replace(/\sheight="[^"]*"/,' height="96"'),/\swidth=/.test(s.slice(0,s.indexOf(">")))||(s=s.replace("<svg",'<svg width="96" height="96"')),new Promise(l=>{let u=new Image;u.onload=()=>l(u),u.onerror=()=>l(null),u.src=URL.createObjectURL(new Blob([s],{type:"image/svg+xml"}))})):null).catch(()=>null):Promise.resolve(null);return os.set(r,o),o}function hi(e,n,t=-Math.PI/2){let r=new Path2D;for(let a=0;a<e;a++){let i=t+a*2*Math.PI/e;a?r.lineTo(n*Math.cos(i),n*Math.sin(i)):r.moveTo(n*Math.cos(i),n*Math.sin(i))}return r.closePath(),r}function qy(e,n){if(typeof e=="object"&&e?.path){let r=new Path2D;return r.addPath(new Path2D(e.path),new DOMMatrix().translate(-n,-n).scale(2*n/100)),r}let t=new Path2D;switch(e){case"square":{let r=n*.86;return t.rect(-r,-r,2*r,2*r),t}case"rectangle":return t.rect(-n,-n*.66,2*n,n*1.32),t;case"diamond":return hi(4,n*1.12);case"hexagon":return hi(6,n,0);case"octagon":return hi(8,n,Math.PI/8);case"triangle":return hi(3,n*1.15);case"shield":return t.moveTo(-n*.85,-n*.85),t.lineTo(n*.85,-n*.85),t.lineTo(n*.85,n*.1),t.quadraticCurveTo(n*.8,n*.75,0,n),t.quadraticCurveTo(-n*.8,n*.75,-n*.85,n*.1),t.closePath(),t;case"quatrefoil":{let r=n*.48,a=n*.55,i=Math.SQRT1_2,o=r*i+Math.sqrt(a*a-r*r*.5);for(let s=0;s<4;s++){let l=-Math.PI/2+s*Math.PI/2,u=r*Math.cos(l),d=r*Math.sin(l),c=x=>[o*Math.cos(x),o*Math.sin(x)],[h,g]=c(l-Math.PI/4),[p,m]=c(l+Math.PI/4),b=Math.atan2(g-d,h-u),v=Math.atan2(m-d,p-u);s===0&&t.moveTo(h,g),t.arc(u,d,a,b,v<b?v+2*Math.PI:v,!1)}return t.closePath(),t}default:return t.arc(0,0,n,0,2*Math.PI),t}}var Vy={ne:[1,-1],nw:[-1,-1],se:[1,1],sw:[-1,1]},fi=class{constructor({size:n=96,defaultSet:t="lucide",onReady:r=()=>{}}={}){this.size=n,this.defaultSet=t,this.onReady=r,this.cache=new Map,this.composed=0,this.ms=null}configure({size:n,defaultSet:t}){n&&n!==this.size&&(this.size=n,this.cache.clear()),t&&(this.defaultSet=t)}get(n){let t=this.cache.get(n.key);if(t)return t.ready?t:null;let r={ready:!1};return this.cache.set(n.key,r),this.compose(n).then(a=>{Object.assign(r,a,{ready:!0}),this.composed++,this.onReady(n.key)}).catch(a=>{console.warn("symbol",n.key,a)}),null}async compose(n){let t=this.size,r=document.createElement("canvas");r.width=r.height=t;let a=r.getContext("2d");n.kind==="milsymbol"?await this.drawMil(a,n.sidc,t):await this.drawComposed(a,n,t);let i=document.createElement("canvas");i.width=i.height=t;let o=i.getContext("2d");o.globalAlpha=.22,o.drawImage(r,0,0);let s=l=>new Promise(u=>l.toBlob(d=>u(URL.createObjectURL(d)),"image/png"));return{image:await s(r),imageDim:await s(i),dataUrl:r.toDataURL("image/png")}}async drawComposed(n,t,r){let a=r*.34,i=Math.max(2,r*.045);n.save(),n.translate(r/2,r/2);let o=qy(t.frame,a);if(n.globalAlpha=t.dash?.7:1,n.fillStyle=t.fill,n.fill(o),n.globalAlpha=1,n.lineWidth=i,n.strokeStyle=t.dash?"#FFFFFF":wc(t.fill)>.45?"#111827":"#F4F6FA",n.lineJoin="round",t.dash&&n.setLineDash([r*.075,r*.05]),n.stroke(o),n.setLineDash([]),t.glyph){let s=t.glyphColor||(wc(t.fill)>.45?"#111827":"#FFFFFF"),l=await Ac(t.glyph,s,this.defaultSet);if(l){let u=a*1.05;n.drawImage(l,-u/2,-u/2,u,u)}}n.restore();for(let s of t.corners||[])await this.drawBadge(n,s,r)}async drawBadge(n,t,r){let[a,i]=Vy[t.corner],o=r*.15,s=r/2+a*r*.34,l=r/2+i*r*.34;n.beginPath(),n.arc(s,l,o,0,2*Math.PI),n.fillStyle=t.color,n.fill(),n.lineWidth=Math.max(1.5,r*.025),n.strokeStyle="#FFFFFF",n.stroke();let u=t.kind==="alert"?"!":t.text;u&&(n.fillStyle="#FFFFFF",n.font=`700 ${Math.round(o*(u.length>2?.9:1.25))}px system-ui, sans-serif`,n.textAlign="center",n.textBaseline="middle",n.fillText(u,s,l+o*.06));let d=t.kind==="lock"?"lucide/lock":t.kind==="icon"?t.icon:null;if(d){let c=await Ac(d,"#FFFFFF",this.defaultSet);if(c){let h=o*1.25;n.drawImage(c,s-h/2,l-h/2,h,h)}}}async drawMil(n,t,r){if(!this.ms){let l="/explore/milsymbol.js";this.ms=import(l).then(u=>u.default||u.ms||u)}let a=await this.ms,o=new a.Symbol(t,{size:Math.round(r*.42)}).asCanvas(),s=Math.min(r*.92/o.width,r*.92/o.height);n.drawImage(o,(r-o.width*s)/2,(r-o.height*s)/2,o.width*s,o.height*s)}};var Xy=globalThis.process?.env?.SYMBOLS_IMPL==="wrong"?Ec:Mr,ss=1,Rc=["circle","square","diamond","triangle","hexagon"],Yy=new Set(["circle","square","diamond","triangle"]),Dc=new Set(["color","size","shape","icon","label","labelVisible","labelMaxLength","fontSize","borderColor","borderWidth","badges","opacity","frame","frameDash","status","glyph","corners","sidc"]),kc=new Set(["color","width","dash","arrow","curvature","opacity","label"]),Ky=new Set(["frame","frameDash","status","glyph","corners","sidc"]),Zy=new Set(["eq","neq","in",">=","<=",">","<","contains","exists"]),Qy={dark:["#5B9BFF","#FF8A5B","#4FD1A1","#F5C451","#C792EA","#FF6B9A","#56C7E8","#A3D977","#E8A87C","#9AA5FF","#F78FB3","#7FDBCA"],light:["#1F5FD1","#C2410C","#0F8F6A","#A16207","#7E3BB8","#BE185D","#0E7490","#4D7C0F","#9A4F1A","#4338CA","#A3255C","#0F766E"]},Jy={dark:{background:"#0F1420",panel:"#161D2C",text:"#E6EBF5",muted:"#8A95AB",link:"#46516A",dim:"#2A3142",select:"#FFFFFF",hover:"#FFD166",labelBg:"rgba(15,20,32,0.75)"},light:{background:"#F7F8FB",panel:"#FFFFFF",text:"#111827",muted:"#5B6475",link:"#B8C0CF",dim:"#E3E7EE",select:"#111827",hover:"#D97706",labelBg:"rgba(255,255,255,0.8)"}},Nr={version:1,theme:"dark",nodeDefaults:{shape:"circle",size:6,color:null,borderColor:null,borderWidth:0,label:{show:"auto",maxLength:28,fontSize:12},opacity:1},linkDefaults:{width:1,color:null,style:"solid",arrow:"to",opacity:.8},rules:[],legend:{show:!0,title:"Types"},highlight:{dimOthers:!0,dimStrength:.85},lod:{labelZoomThreshold:6,hideEdgesOnMoveAbove:5e3,autoClusterAbove:15e3}},eb=/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i,tb=/^(rgb|rgba|hsl|hsla)\(\s*[\d.%\s,/-]+\)$/i,nb=e=>typeof e=="string"&&(eb.test(e)||tb.test(e)),zr=(e,n)=>typeof e=="number"&&Number.isFinite(e)?e:n;function rb(e,n){let t=2166136261;for(let r=0;r<e.length;r++)t^=e.charCodeAt(r),t=Math.imul(t,16777619);return(t>>>0)%n}function Cc(e,{theme:n}={}){let t=[],r=e;if(typeof r=="string")try{r=JSON.parse(r)}catch(x){t.push(`style config is not valid JSON: ${x.message}`),r={}}(!r||typeof r!="object"||Array.isArray(r))&&(t.push("style config must be an object"),r={}),r.version!==ss&&t.push(`style config version ${r.version} is not ${ss}; reading it as v${ss}`);let a=n||(r.theme==="light"||r.theme==="dark"?r.theme:(r.theme!=null&&t.push(`unknown theme ${r.theme}`),"dark")),i=Jy[a],o=Qy[a],s={...Nr.nodeDefaults,...ct(r.nodeDefaults)?r.nodeDefaults:{}},l={...Nr.linkDefaults,...ct(r.linkDefaults)?r.linkDefaults:{}};s.label={...Nr.nodeDefaults.label,...ct(s.label)?s.label:{}};let u=Gr(r.background,a,t,"background")||i.background;Rc.includes(s.shape)||(t.push(`unknown default shape ${s.shape}`),s.shape="circle");let d=new Map(Object.entries(ct(r.typeOrder)?r.typeOrder:{})),c=x=>(d.has(x)||d.set(x,d.size<o.length?d.size:rb(x,o.length)),o[d.get(x)%o.length]),h=[];for(let[x,y]of(Array.isArray(r.rules)?r.rules:[]).entries()){if(!ct(y)||!ct(y.apply)){t.push(`rule ${y?.id??x}: needs when/apply`);continue}let _=ls(y.when??{},t,y.id??x);if(!_)continue;let S=y.when?.kind||(y.when?.fromType||y.when?.toType?"link":null),T=S==="link"?kc:S==="node"?Dc:new Set([...Dc,...kc]),A={};for(let[w,E]of Object.entries(y.apply)){if(!T.has(w)){t.push(`rule ${y.id??x}: unknown channel ${w}`);continue}if(w==="color"||w==="borderColor"){let R=Gr(E,a,t,`rule ${y.id??x} ${w}`);R&&(A[w]=R);continue}if(w==="shape"&&!Rc.includes(E)){t.push(`rule ${y.id??x}: unknown shape ${E}`);continue}if((w==="size"||w==="width")&&ct(E)){let R=ab(E,t,y.id??x);R&&(A[w]=R);continue}if((w==="size"||w==="width"||w==="opacity"||w==="borderWidth")&&typeof E!="number"){t.push(`rule ${y.id??x}: ${w} must be a number or scale`);continue}if(w==="dash"&&!["solid","dashed","dotted"].includes(E)){t.push(`rule ${y.id??x}: unknown dash ${E}`);continue}if(Ky.has(w)){let R=xc(w,E,L=>t.push(`rule ${y.id??x}: ${L}`));R!==void 0&&(A[w]=R);continue}A[w]=E}h.push({id:y.id??`rule-${x}`,kind:S,when:_,apply:A,raw:y})}let g=(x,y)=>{for(let _ of h)if(!(_.kind&&_.kind!==x.kind)&&_.when(x)){for(let[S,T]of Object.entries(_.apply))y[S]=typeof T=="function"?T(x,y[S]):S==="corners"?{...y.corners||{},...T}:T;y._rules.push(_.id)}return y},p=bc(r.symbols,t,x=>Gr(x,a,null));function m(x){let y={color:Gr(s.color,a,null)||c(x.type),size:zr(s.size,6),shape:s.shape,opacity:zr(s.opacity,1),borderColor:s.borderColor,borderWidth:zr(s.borderWidth,0),labelVisible:s.label.show,labelMaxLength:s.label.maxLength,fontSize:s.label.fontSize,_rules:[]};return g(x,y),y.renderShape=Yy.has(y.shape)?y.shape:"circle",x.properties?.stub===!0&&(y.opacity=Math.min(y.opacity,.5)),p&&(y.symbol=Xy(x,y,p,y.color)),y}function b(x){let y={color:Gr(l.color,a,null)||i.link,width:zr(l.width,1),dash:l.style||"solid",arrow:l.arrow??"to",opacity:zr(l.opacity,.8),_rules:[]};return g(x,y)}function v(x){return[...x.entries()].filter(([,y])=>y>0).sort((y,_)=>_[1]-y[1]||y[0].localeCompare(_[0])).map(([y,_])=>{let S=m({kind:"node",type:y,properties:{}});return{type:y,count:_,color:S.color,shape:S.shape,...S.symbol?{symbol:S.symbol}:{}}})}return{config:r,theme:a,symbols:p,colors:{...i,background:u},nodeStyle:m,linkStyle:b,legend:v,warnings:t,typeColor:c,settings:{...Nr.lod,...ct(r.lod)?r.lod:{},highlight:{...Nr.highlight,...ct(r.highlight)?r.highlight:{}}}}}var ct=e=>e&&typeof e=="object"&&!Array.isArray(e);function Gr(e,n,t,r){return e==null?null:(ct(e)&&(e=e[n]??e.dark??e.light),nb(e)?e:(t?.push(`${r}: invalid color ${JSON.stringify(e)}`),null))}function ab(e,n,t){let{property:r,scale:a="linear",domain:i=[0,100],range:o=[4,20]}=e;if(typeof r!="string"||!Array.isArray(i)||!Array.isArray(o)||i.length!==2||o.length!==2||!["linear","log"].includes(a))return n.push(`rule ${t}: invalid scale`),null;let[s,l]=i.map(Number),[u,d]=o.map(Number),c=a==="log"?p=>Math.log10(Math.max(p,1e-9)):p=>p,h=c(s),g=c(l);return(p,m)=>{let b=Number(p.properties?.[r]);if(!Number.isFinite(b)||a==="log"&&b<=0)return m;let v=g===h?0:Math.max(0,Math.min(1,(c(b)-h)/(g-h)));return u+v*(d-u)}}function ls(e,n,t){if(!ct(e))return n.push(`rule ${t}: when must be an object`),null;let r=[];for(let[a,i]of Object.entries(e))switch(a){case"kind":r.push(o=>o.kind===i);break;case"type":r.push(Array.isArray(i)?o=>i.includes(o.type):o=>o.type===i);break;case"sourceId":r.push(o=>(o.sources||[]).some(s=>Array.isArray(i)?i.includes(s.sourceId):s.sourceId===i));break;case"and":case"or":{if(!Array.isArray(i))return n.push(`rule ${t}: ${a} needs a list`),null;let o=i.map(s=>ls(s,n,t));if(o.some(s=>!s))return null;r.push(a==="and"?s=>o.every(l=>l(s)):s=>o.some(l=>l(s)));break}case"not":{let o=ls(i,n,t);if(!o)return null;r.push(s=>!o(s));break}case"property":{let o=e.op??"exists";if(!Zy.has(o))return n.push(`rule ${t}: unknown operator ${o} (rule ignored)`),null;let s=e.value;r.push(l=>{let u=l.properties?.[i];switch(o){case"eq":return u===s||u!=null&&s!=null&&String(u)===String(s);case"neq":return!(u===s||u!=null&&s!=null&&String(u)===String(s));case"in":return Array.isArray(s)&&s.some(d=>String(d)===String(u));case">=":return u!=null&&Number(u)>=Number(s);case"<=":return u!=null&&Number(u)<=Number(s);case">":return u!=null&&Number(u)>Number(s);case"<":return u!=null&&Number(u)<Number(s);case"contains":return typeof u=="string"&&u.toLowerCase().includes(String(s).toLowerCase());case"exists":return u!=null&&u!==""}});break}case"op":case"value":break;default:return n.push(`rule ${t}: unknown condition ${a} (rule ignored)`),null}return a=>r.every(i=>i(a))}var gi=class{constructor(n,{onNodeAdded:t=()=>{},onNodeRemoved:r=()=>{},onItemChanged:a=()=>{}}={}){this.graph=n,this.items=new Map,this.pendingLinks=new Map,this.deltaSeq=0,this.hooks={onNodeAdded:t,onNodeRemoved:r,onItemChanged:a},this.metrics={fullRebuilds:0,incrementalApplies:0,lastApplyMs:0,applied:0,gaps:0}}loadSnapshot(n,t=new Map){this.graph.clear(),this.items.clear(),this.pendingLinks.clear(),this.metrics.fullRebuilds++;for(let r of n.items)r.kind==="node"&&this.#t(r,t.get(r.id));for(let r of n.items)r.kind==="link"&&this.#e(r);this.deltaSeq=n.deltaCursor||0}applyDelta(n){if(n.deltaSeq<=this.deltaSeq)return{ok:!0,duplicate:!0};if(n.deltaSeq!==this.deltaSeq+1)return this.metrics.gaps++,{resync:!0};let t=globalThis.performance?.now?.()??Date.now();for(let r of n.upserts||[])r.kind==="node"&&this.#t(r);for(let r of n.upserts||[])r.kind==="link"&&this.#e(r);for(let r of n.removes||[])this.#n(r);return this.deltaSeq=n.deltaSeq,this.metrics.incrementalApplies++,this.metrics.applied+=(n.upserts?.length||0)+(n.removes?.length||0),this.metrics.lastApplyMs=(globalThis.performance?.now?.()??Date.now())-t,{ok:!0}}addItems(n){for(let t of n)t.kind==="node"&&this.#t(t);for(let t of n)t.kind==="link"&&this.#e(t)}#t(n,t){let r=this.graph,a=r.hasNode(n.id);if(this.items.set(n.id,n),a)r.mergeNodeAttributes(n.id,{item:n,type:n.type}),this.hooks.onItemChanged(n,!1);else{let i=t||(typeof n.x=="number"&&typeof n.y=="number"?{x:n.x,y:n.y}:null);r.addNode(n.id,{item:n,type:n.type,x:i?.x??NaN,y:i?.y??NaN,placed:!!i}),this.hooks.onNodeAdded(n);let o=this.pendingLinks.get(n.id);if(o){this.pendingLinks.delete(n.id);for(let s of o){let l=this.items.get(s);l&&this.#e(l)}}}}#e(n){let t=this.graph;if(this.items.set(n.id,n),t.hasEdge(n.id)){let[r,a]=t.extremities(n.id);if(r===n.fromId&&a===n.toId){t.mergeEdgeAttributes(n.id,{item:n,type:n.type}),this.hooks.onItemChanged(n,!1);return}t.dropEdge(n.id)}if(t.hasNode(n.fromId)&&t.hasNode(n.toId))t.addDirectedEdgeWithKey(n.id,n.fromId,n.toId,{item:n,type:n.type}),this.hooks.onItemChanged(n,!0);else for(let r of[n.fromId,n.toId])t.hasNode(r)||(this.pendingLinks.has(r)||this.pendingLinks.set(r,new Set),this.pendingLinks.get(r).add(n.id))}#n(n){let t=this.graph,r=this.items.get(n);if(this.items.delete(n),t.hasNode(n)){for(let a of t.edges(n)){let i=this.items.get(a);if(t.dropEdge(a),i){let o=i.fromId===n?i.toId:i.fromId;for(let s of[n,o])this.pendingLinks.has(s)||this.pendingLinks.set(s,new Set);this.pendingLinks.get(n).add(a)}}t.dropNode(n),this.hooks.onNodeRemoved(n)}else t.hasEdge(n)&&t.dropEdge(n);if(r?.kind==="link")for(let a of[r.fromId,r.toId])this.pendingLinks.get(a)?.delete(n)}};function us(e,n){let t=new Set([n]),r=new Set;return e.hasNode(n)?(e.forEachEdge(n,(a,i,o,s)=>{r.add(a),t.add(o===n?s:o)}),{nodes:t,links:r}):{nodes:t,links:r}}var Nb=We(fs(),1),zb=We(fh(),1),gh=["force","hierarchy","radial","circular","grid","structural","timeline","geo","community"],bs={kind:"force",spacing:5,animate:!0,durationMs:400,incremental:!0,roots:null,levelProperty:null,orientation:"down",orderBy:"type",pack:"circle",iterations:null,seed:1234,timeProperty:null,groupBy:null,wrong:!1},zS=typeof process<"u"&&process.env?.SCALE_IMPL==="wrong";function Wr(e,n=["name","title","label"]){if(e.label)return e.label;for(let t of n){let r=e.properties?.[t];if(r!=null&&r!=="")return String(r)}return e.id}var Vn=e=>typeof e=="number"?e:typeof e=="string"&&e.trim()!==""?Number(e):NaN,xs=e=>Number.isFinite(e)&&e>=-90&&e<=90,Ss=e=>Number.isFinite(e)&&e>=-180&&e<=180,Gb=["lat","latitude","y_lat"],Ob=["lon","lng","long","longitude","x_lon"];function ph(e){if(!e||typeof e!="object")return null;let n=1/0,t=1/0,r=-1/0,a=-1/0,i=o=>{if(Array.isArray(o)){if(typeof o[0]=="number"){let s=Vn(o[0]),l=Vn(o[1]);Ss(s)&&xs(l)&&(n=Math.min(n,s),r=Math.max(r,s),t=Math.min(t,l),a=Math.max(a,l));return}o.forEach(i)}};if(e.type==="GeometryCollection")for(let o of e.geometries||[]){let s=ph(o);s&&(n=Math.min(n,s[0]),t=Math.min(t,s[1]),r=Math.max(r,s[2]),a=Math.max(a,s[3]))}else i(e.coordinates);return n===1/0?null:[n,t,r,a]}function Si(e){let n=e?.properties||{},t=NaN,r=NaN;for(let o of Gb)if(n[o]!=null){t=Vn(n[o]);break}for(let o of Ob)if(n[o]!=null){r=Vn(n[o]);break}if(xs(t)&&Ss(r))return{lat:t,lon:r};let a=n.geometry??e?.geometry;if(typeof a=="string")try{a=JSON.parse(a)}catch{a=null}if(a&&a.type==="Point"&&Array.isArray(a.coordinates)){let o=Vn(a.coordinates[0]),s=Vn(a.coordinates[1]);return xs(s)&&Ss(o)?{lat:s,lon:o}:null}let i=ph(a);return i?{lat:(i[1]+i[3])/2,lon:(i[0]+i[2])/2,geometry:a}:null}var Ai={};og(Ai,{CATEGORICAL:()=>Xn,SHORTCUTS:()=>_h,applySelection:()=>Yn,bulk:()=>Te,clearEncodings:()=>ks,closeMenu:()=>Ei,collapseBy:()=>Ti,detailsExtra:()=>Is,edgeMenu:()=>Ms,encodeEdge:()=>Ls,encodeNode:()=>Cs,expandStream:()=>Ye,findPaths:()=>yn,installCoreLoop:()=>As,isolatePaths:()=>$r,mapTo:()=>Ds,nodeMenu:()=>Fs,nodesInPolygon:()=>Rh,onVisibilityChanged:()=>Ps,pointInPolygon:()=>Ah,rampColor:()=>ws,renderEncLegend:()=>Hr,runAlgo:()=>xt,scopePayload:()=>Ts,setTool:()=>Zt,showPath:()=>Rs,stageMenu:()=>Ns,updateBulkbar:()=>Kn,updateScopeBadge:()=>Ur});var O=null,K=e=>document.querySelector(e),pe=e=>String(e).replace(/[&<>"']/g,n=>`&#${n.charCodeAt(0)};`),Kt=e=>typeof e!="number"?String(e):Math.abs(e)>=1e3||Number.isInteger(e)?e.toLocaleString():Math.abs(e)>=.01?e.toFixed(3):e.toExponential(2),Xn=["#4e79a7","#f28e2b","#e15759","#76b7b2","#59a14f","#edc948","#b07aa1","#ff9da7","#9c755f","#bab0ac","#86bcb6","#d37295"],xh="#7d8590",Sh="#4a505c",_i=[[68,1,84],[59,82,139],[33,145,140],[94,201,98],[253,231,37]];function ws(e){e=Math.max(0,Math.min(1,Number.isFinite(e)?e:0));let n=e*(_i.length-1),t=Math.min(_i.length-2,Math.floor(n)),r=n-t,a=_i[t].map((i,o)=>Math.round(i+(_i[t+1][o]-i)*r));return`rgb(${a[0]},${a[1]},${a[2]})`}var _h=[["E","Expand selection by one hop (streamed)"],["Shift+E","Expand selection by two hops"],["C","Collapse selection"],["H / Delete","Hide selection"],["Shift+H","Show everything hidden"],["I","Isolate selection (set as filter)"],["X","Clear isolate / path filter"],["P","Pin or unpin selection"],["N","Add neighbours to the selection"],["F","Fit camera to selection (or everything)"],["L","Lasso select (drag; Shift adds, Alt removes)"],["B","Box select (drag; Shift adds, Alt removes)"],["G","Find paths between the two selected nodes"],["A","Run the chosen algorithm"],["Ctrl+A","Select all visible"],["Ctrl+Z","Undo"],["/","Search"],["Esc","Close menu / tool, then clear selection"],["Right-click","Context menu on a node, link or the canvas"],["?","Show this list"]],vn=()=>window.__explore?.scale;function As(e){O=e;let{S:n}=O;n.core={config:e.config||null,scope:"full",hops:1,last:null,streaming:0,tool:null,paths:null,isolate:null,isolateLinks:null,auto:!0,sig:{},timer:null,menu:null,runs:0,pending:0},n.manualHidden=n.manualHidden||new Set,n.enc={size:null,color:null,edge:null},jb(),qb(),$b(),Hb()}var Th=[],_s=!1;function mh(){_s=!1;let e=Th.splice(0);e.length&&O.addItems(e)}async function Ye(e,{hops:n=1,linkTypes:t=null,direction:r="both",maxNodes:a=Number(K("#expand-limit")?.value)||500,chunkSize:i=200,slowMs:o=0,quiet:s=!1}={}){let{S:l,graph:u}=O;if(!e.length)return null;for(let m of e)for(let b of[...l.collapsed.keys()])(b===m||b.startsWith(m+"|")&&(!t||t.some(v=>b===`${m}|${v}`)))&&l.collapsed.delete(b);if(O.applyVisibility(),n>=2&&!s&&vn()&&!await vn().confirmCost({op:"neighborhood",seeds:e,hops:n,maxNodes:a},`Expanding ${e.length===1?e[0]:e.length+" nodes"} by ${n} hops`))return null;let d=null;vn()&&O.api("/api/explore/cost",{op:"neighborhood",seeds:e,hops:n,maxNodes:a}).then(m=>{d=m.estNodes}).catch(()=>{});let c=()=>vn()?.progress("expand",d?Math.min(.99,p.nodes/Math.max(1,d)):null,`Loading neighbourhood: ${p.nodes.toLocaleString()}${d?" of ~"+d.toLocaleString():""} nodes`),h=performance.now(),g=u.order<=5e3?u.nodes():e.filter(m=>u.hasNode(m));l.core.streaming++,document.body.dataset.streaming="1";let p={seeds:e.length,hops:n,chunks:0,nodes:0,links:0,firstChunkMs:null,ms:0,truncated:!1,newNodes:0};try{let m=await fetch(`/api/explore/session/${l.sessionId}/neighborhood`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({seeds:e,hops:n,linkTypes:t,direction:r,maxNodes:a,chunkSize:i,exclude:g,slowMs:o})});if(!m.ok)throw new Error((await m.json().catch(()=>({}))).error||m.statusText);let b=new TextDecoder,v="",x=u.order;for await(let y of m.body){v+=b.decode(y,{stream:!0});let _;for(;(_=v.indexOf(`
`))>=0;){let S=v.slice(0,_);if(v=v.slice(_+1),!S.trim())continue;let T=JSON.parse(S);if(T.type==="chunk")p.chunks++,p.nodes+=T.nodes.length,p.links+=T.links.length,c(),p.firstChunkMs==null&&(p.firstChunkMs=performance.now()-h),Th.push(...T.nodes,...T.links),_s||(_s=!0,requestAnimationFrame(mh)),vh(p);else if(T.type==="end")p.truncated=T.stats.truncated,p.server=T.stats;else if(T.type==="error")throw new Error(T.error)}}return mh(),p.ms=performance.now()-h,p.newNodes=u.order-x,l.core.last=p,vh(p),s||O.toast(`Expanded ${e.length===1?e[0]:e.length+" nodes"} by ${n} hop${n>1?"s":""}${t?` over ${t.join(", ")}`:""}: ${p.newNodes} new nodes in ${p.chunks} chunks${p.truncated?` (capped at ${a}; raise "Expand limit")`:""}`),p}catch(m){return O.toast("Expand failed: "+m.message),null}finally{--l.core.streaming===0&&delete document.body.dataset.streaming,Ur(),vn()?.progress("expand",!1)}}function vh(e){O.setStatus("expand",`${e.nodes} nodes / ${e.links} links, ${e.chunks} chunks${e.firstChunkMs!=null?`, first ${Math.round(e.firstChunkMs)} ms`:""}${e.ms?`, ${Math.round(e.ms)} ms`:""}${e.truncated?" (cap)":""}`)}function Ur(){let{S:e,graph:n}=O,t=K("#scope-badge");if(!t)return;let r=e.core.config?.counts?.nodes;t.hidden=e.core.scope!=="focus",t.textContent=e.core.scope==="focus"?`focus: ${n.order.toLocaleString()} of ${r!=null?r.toLocaleString():"?"} nodes loaded`:""}function Ti(e,n=null){let{S:t,graph:r}=O,a=O.renderer();t.undo.push({kind:"collapse",collapsed:new Map([...t.collapsed].map(([i,o])=>[i,new Set(o)]))});for(let i of e){if(!r.hasNode(i))continue;let o=new Set;r.forEachEdge(i,(s,l,u,d)=>{if(n&&l.item.type!==n)return;let c=u===i?d:u;c!==i&&!t.pinned.has(c)&&!t.selected.has(c)&&!e.includes(c)&&!a.getNodeState(c).isHidden&&o.add(c)});for(let s=!0;s;){s=!1;for(let l of[...o]){let u=!1;r.forEachEdge(l,(d,c,h,g)=>{if(u)return;let p=h===l?g:h;if(p===i){n&&c.item.type!==n&&(u=!0);return}p===l||o.has(p)||a.getNodeState(p).isHidden||(u=!0)}),u&&(o.delete(l),s=!0)}}t.collapsed.set(n?`${i}|${n}`:i,o)}O.applyVisibility()}async function yn(e,n,{maxHops:t=Number(K("#paths-hops")?.value)||4,mode:r=K("#paths-mode")?.value||"all",directed:a=!!K("#path-directed")?.checked,maxPaths:i=50}={}){let{S:o}=O;if(!e||!n){let l=[...o.selected];if(l.length!==2)return O.toast("Select exactly two nodes (shift-click or lasso) to find paths"),null;[e,n]=l}let s=await O.api(`/api/explore/session/${o.sessionId}/paths`,{fromId:e,toId:n,maxHops:t,mode:r,directed:a,maxPaths:i});return o.core.paths=s.found?{...s,from:e,to:n,idx:-1}:null,s.found?(O.addItems(s.items),Rs(-1),O.toast(`${s.paths.length} path${s.paths.length>1?"s":""} (shortest ${s.shortest.hops} hop${s.shortest.hops>1?"s":""})${s.truncated?`, capped at ${i}`:""}`),K("#paths-isolate")?.checked&&$r(!0),s):(o.pathIds=null,Eh(),O.applyHighlight(),O.toast(s.message||"No path"),s)}function Rs(e){let{S:n}=O,t=n.core.paths;if(!t)return;t.idx=e;let r=e<0?t.paths:[t.paths[e]],a=[...new Set(r.flatMap(o=>o.nodeIds))],i=[...new Set(r.flatMap(o=>o.linkIds))];n.pathIds={nodeIds:a,linkIds:i},n.selected.clear(),n.core.isolate&&$r(!0),O.applyHighlight(),Eh()}function $r(e){let{S:n}=O,t=n.core.paths;if(e&&t){let r=t.idx<0?t.paths:[t.paths[t.idx]];n.core.isolate=new Set(r.flatMap(a=>a.nodeIds)),n.core.isolateLinks=new Set(r.flatMap(a=>a.linkIds))}else n.core.isolate=null,n.core.isolateLinks=null;K("#paths-isolate")&&(K("#paths-isolate").checked=!!n.core.isolate),O.applyVisibility()}function Eh(){let e=K("#paths-list");if(!e)return;let n=O.S.core.paths;if(!n){e.innerHTML="";return}let t=r=>pe(O.graph.hasNode(r)?O.label(r):r);e.innerHTML=`<div class="path-item ${n.idx<0?"on":""}" data-i="-1">All ${n.paths.length} path${n.paths.length>1?"s":""}${n.truncated?" (capped)":""}</div>`+n.paths.slice(0,50).map((r,a)=>`<div class="path-item ${n.idx===a?"on":""}" data-i="${a}"><b>${r.hops}</b> ${r.nodeIds.map(t).join(" \u2192 ")}</div>`).join("")}var Bb={pagerank:[["alpha",.85],["directed",!0]],betweenness:[["samples",256],["exactMax",2e3]],louvain:[["resolution",1],["seed",1]],leiden:[["resolution",1],["seed",1]],shortest_path:[["source",""],["target",""]],jaccard:[["node",""],["k",20]]};function yh(){let e=K("#algo").value,n=Bb[e]||[];if(K("#algo-params").innerHTML=n.map(([t,r])=>typeof r=="boolean"?`<label class="small"><input type="checkbox" data-p="${t}" ${r?"checked":""}> ${t}</label>`:`<label class="small">${t} <input data-p="${t}" value="${pe(r)}" size="8"></label>`).join(""),["shortest_path","jaccard"].includes(e)){let t=[...O.S.selected],r=K('#algo-params [data-p="source"], #algo-params [data-p="node"]');r&&t[0]&&(r.value=t[0]);let a=K('#algo-params [data-p="target"]');a&&t[1]&&(a.value=t[1])}}function Wb(){let e={};for(let n of document.querySelectorAll("#algo-params [data-p]")){let t=n.dataset.p;n.type==="checkbox"?e[t]=n.checked:n.value!==""&&(e[t]=/^-?\d+(\.\d+)?$/.test(n.value)?Number(n.value):n.value)}return e}function Ts(e){let{S:n,graph:t}=O,r=O.renderer();return e==="filter"?{kind:"filter",hiddenTypes:[...n.hiddenTypes],hiddenLinkTypes:[...n.hiddenEdgeTypes],where:n.where}:e==="visible"?{kind:"ids",ids:t.filterNodes(a=>!r.getNodeState(a).isHidden),hiddenLinkTypes:[...n.hiddenEdgeTypes]}:e==="selection"?{kind:"ids",ids:[...n.selected],hiddenLinkTypes:[...n.hiddenEdgeTypes]}:{kind:"all"}}async function xt(e=K("#algo").value,{params:n=Wb(),scopeKind:t=K("#algo-scope").value,channels:r=null,ask:a=!1}={}){let{S:i}=O;if(a&&vn()&&!await vn().confirmCost({op:"algo",algo:e,params:n,scope:Ts(t)},e))return null;i.core.pending++,document.body.dataset.algoBusy="1";try{let o=Ts(t),s=performance.now(),l=await O.api("/api/explore/algo/run",{algo:e,params:n,scope:o});l.clientMs=performance.now()-s,l.scopeKind=t,l.request={algo:e,params:n,scopeKind:t},i.core.result=l,i.core.runs++,Ub(l);for(let u of r||[])Ds(u,l);return l}catch(o){return O.toast(`${e} failed: ${o.message}`),null}finally{--i.core.pending===0&&delete document.body.dataset.algoBusy}}function Ub(e){let n=K("#algo-result");if(!n)return;let t=`<p class="small"><b>${pe(e.algo)}</b> on ${e.scope.nodes.toLocaleString()} nodes / ${e.scope.links.toLocaleString()} links (${pe(e.scopeKind)}) \xB7 ${Math.round(e.stats.ms)} ms server${e.approximate?` \xB7 sampled ${e.samples}`:""}${e.cached?" \xB7 cached":""}</p>`,r=e.modularity!=null?`<p class="small">${e.count} communities \xB7 modularity ${e.modularity.toFixed(4)}</p>`:e.count!=null?`<p class="small">${e.count} components, largest ${e.sizes?.[0]}</p>`:e.path?`<p class="small">distance ${e.distance} via ${e.path.length} nodes</p>`:"",a=(e.top||[]).slice(0,8).map(i=>`<div class="top-item" data-id="${pe(i.id)}"><span>${pe(O.graph.hasNode(i.id)?O.label(i.id):i.id)}</span><span class="muted">${Kt(i.value)}</span></div>`).join("");n.innerHTML=t+r+a}function Ds(e,n=O.S.core.result){let{S:t}=O;if(!n)return O.toast("Run an algorithm first");if(n.level==="link"&&e!=="edge")return O.toast("This result is per link: map it to edge width");let r=new Map(Object.entries(n.values)),a=1/0,i=-1/0;for(let s of r.values())s<a&&(a=s),s>i&&(i=s);let o={algo:n.algo,runId:n.runId,kind:n.kind,level:n.level,values:r,min:a,max:i,request:n.request,count:n.count};if(n.kind==="categorical"){let s=new Map;for(let l of r.values())s.set(l,(s.get(l)||0)+1);o.sizes=s,o.maxSize=Math.max(1,...s.values())}t.enc[e]=o,t.core.sig[e]=wh(n.request.scopeKind),e==="edge"?O.graph.forEachEdge(O.restyleEdge):O.graph.forEachNode(O.restyleNode),O.renderer()?.refresh(),Hr(),document.body.dataset.enc=Object.entries(t.enc).filter(([,s])=>s).map(([s,l])=>`${s}:${l.algo}`).join(",")}function ks(){let{S:e}=O;e.enc={size:null,color:null,edge:null},O.restyleAll(),Hr(),delete document.body.dataset.enc}var Es=(e,n)=>e.max>e.min?(n-e.min)/(e.max-e.min):.5;function Cs(e){let{S:n,graph:t}=O;if(!n.enc||!n.enc.size&&!n.enc.color)return;let r=t.getNodeAttributes(e),a={};if(n.enc.size){let i=n.enc.size,o=i.values.get(e);a.size=o==null?3:i.kind==="categorical"?4+14*Math.sqrt((i.sizes.get(o)||1)/i.maxSize):4+16*Math.sqrt(Es(i,o)),a.encSize=o??null}if(n.enc.color){let i=n.enc.color,o=i.values.get(e),s=o==null?Sh:i.kind==="categorical"?o<Xn.length?Xn[o]:xh:ws(Es(i,o));a.color=s,a.encColor=s,r.symbol,a.borderColor=s}t.mergeNodeAttributes(e,a)}function Ls(e){let{S:n,graph:t}=O,r=n.enc?.edge;if(!r)return;let a;if(r.level==="link")a=r.values.get(e);else{let[i,o]=t.extremities(e),s=r.values.get(i),l=r.values.get(o);a=s==null||l==null?null:(s+l)/2}t.mergeEdgeAttributes(e,{size:a==null?.4:.6+6*(r.kind==="categorical"?1:Es(r,a)),encWeight:a??null})}function Hr(){let{S:e}=O,n=K("#enc-legend");if(!n)return;let t=[];if(e.enc.color){let r=e.enc.color;if(r.kind==="categorical"){let a=[...r.sizes].sort((s,l)=>s[0]-l[0]),i=a.slice(0,Xn.length),o=a.slice(Xn.length).reduce((s,l)=>s+l[1],0);t.push(`<div class="enc-h">Colour = ${pe(r.algo)} (${a.length} groups)</div>`+i.map(([s,l])=>`<div class="enc-row" data-cat="${s}"><span class="sw" style="background:${Xn[s]}"></span>#${s}<span class="muted">${l.toLocaleString()}</span></div>`).join("")+(o?`<div class="enc-row"><span class="sw" style="background:${xh}"></span>other<span class="muted">${o.toLocaleString()}</span></div>`:""))}else t.push(`<div class="enc-h">Colour = ${pe(r.algo)}</div><div class="ramp" style="background:linear-gradient(90deg,${[0,.25,.5,.75,1].map(ws).join(",")})"></div><div class="enc-row small"><span>${Kt(r.min)}</span><span>${Kt(r.max)}</span></div>`);t.push(`<div class="enc-row small"><span class="sw" style="background:${Sh}"></span>not in scope</div>`)}if(e.enc.size){let r=e.enc.size;t.push(`<div class="enc-h">Size = ${pe(r.algo)}</div><div class="enc-row small"><span>\u25CF ${Kt(r.kind==="categorical"?1:r.min)}</span><span style="font-size:18px">\u25CF</span><span>${Kt(r.kind==="categorical"?r.maxSize:r.max)}${r.kind==="categorical"?" members":""}</span></div>`)}if(e.enc.edge){let r=e.enc.edge;t.push(`<div class="enc-h">Edge width = ${pe(r.algo)}${r.level==="node"?" (mean of ends)":""}</div><div class="enc-row small"><span>${Kt(r.min)}</span><span>${Kt(r.max)}</span></div>`)}n.innerHTML=t.join(""),n.hidden=!t.length}function wh(e){let{S:n,graph:t}=O;if(e==="filter")return JSON.stringify([[...n.hiddenTypes].sort(),[...n.hiddenEdgeTypes].sort(),n.where]);if(e==="visible"){let r=O.renderer(),a=0,i=0;return t.forEachNode(o=>{if(!r.getNodeState(o).isHidden){i++;for(let s=0;s<o.length;s++)a=a*31+o.charCodeAt(s)|0}}),`${i}:${a}:${[...n.hiddenEdgeTypes].sort()}`}return"static"}function Ps(){let{S:e}=O;if(!e.core?.auto||!e.enc)return;let n=Object.entries(e.enc).filter(([t,r])=>r&&["filter","visible"].includes(r.request.scopeKind)&&wh(r.request.scopeKind)!==e.core.sig[t]);n.length&&(clearTimeout(e.core.timer),e.core.timer=setTimeout(async()=>{let t=new Map;for(let[r,a]of n){let i=JSON.stringify(a.request);t.has(i)||t.set(i,{req:a.request,chs:[]}),t.get(i).chs.push(r)}for(let{req:r,chs:a}of t.values())await xt(r.algo,{params:r.params,scopeKind:r.scopeKind,channels:a});O.toast("Re-ran analysis for the new filter")},250))}function Is(e){let{S:n}=O,t=[];for(let[r,a]of Object.entries(n.enc||{}))if(a&&a.level==="node"){let i=a.values.get(e);t.push(`<tr><th>${pe(a.algo)} (${r})</th><td>${i==null?'<span class="muted">not in scope</span>':Kt(i)}</td></tr>`)}return t.length?`<table class="enc-values">${t.join("")}</table>`:""}function Ah(e,n,t){if(O?.S.core.config?.uiWrong){let a=t.map(i=>i[0]);return e>=Math.min(...a)&&e<=Math.max(...a)}let r=!1;for(let a=0,i=t.length-1;a<t.length;i=a++){let[o,s]=t[a],[l,u]=t[i];s>n!=u>n&&e<(l-o)*(n-s)/(u-s)+o&&(r=!r)}return r}function Rh(e){let{graph:n}=O,t=O.renderer(),r=[];return n.forEachNode(a=>{if(t.getNodeState(a).isHidden)return;let i=t.getNodeDisplayData(a);if(!i)return;let o=t.framedGraphToViewport({x:i.x,y:i.y});Ah(o.x,o.y,e)&&r.push(a)}),r}function Yn(e,n="replace"){let{S:t}=O;n==="replace"?t.selected=new Set(e):n==="add"?e.forEach(r=>t.selected.add(r)):e.forEach(r=>t.selected.delete(r)),t.pathIds=null,O.applyHighlight(),Kn()}function Zt(e){let{S:n}=O;n.core.tool=n.core.tool===e?null:e;let t=K("#lasso-layer");t.hidden=!n.core.tool,document.body.dataset.tool=n.core.tool||"";for(let r of document.querySelectorAll("[data-tool]"))r.classList.toggle("on",r.dataset.tool===n.core.tool);if(n.core.tool){let r=K("#canvas").getBoundingClientRect();t.width=r.width,t.height=r.height}}function $b(){let e=K("#lasso-layer"),n=e.getContext("2d"),t=null,r="replace";e.addEventListener("pointerdown",a=>{a.preventDefault(),e.setPointerCapture(a.pointerId);let i=e.getBoundingClientRect();t=[[a.clientX-i.left,a.clientY-i.top]],r=a.altKey?"remove":a.shiftKey?"add":"replace"}),e.addEventListener("pointermove",a=>{if(!t)return;let i=e.getBoundingClientRect(),o=[a.clientX-i.left,a.clientY-i.top];O.S.core.tool==="box"?t=[t[0],o]:t.push(o),n.clearRect(0,0,e.width,e.height),n.strokeStyle=O.S.style.colors.select||"#4c9aff",n.fillStyle="rgba(76,154,255,0.12)",n.lineWidth=1.5,n.setLineDash([5,4]),n.beginPath(),(O.S.core.tool==="box"?bh(t[0],t[1]):t).forEach(([l,u],d)=>d?n.lineTo(l,u):n.moveTo(l,u)),n.closePath(),n.fill(),n.stroke()}),e.addEventListener("pointerup",()=>{if(!t)return;let a=O.S.core.tool==="box"?bh(t[0],t.at(-1)):t;if(t=null,n.clearRect(0,0,e.width,e.height),a.length>=3){let i=Rh(a);Yn(i,r),O.toast(`${r==="remove"?"Removed":"Selected"} ${i.length} node${i.length===1?"":"s"}`)}Zt(null)})}var bh=(e,n)=>[[e[0],e[1]],[n[0],e[1]],[n[0],n[1]],[e[0],n[1]]],Te={hide(e=[...O.S.selected]){let{S:n}=O;e.length&&(n.undo.push({kind:"hidden",hidden:new Set(n.manualHidden)}),e.forEach(t=>n.manualHidden.add(t)),n.selected.clear(),O.applyVisibility(),O.applyHighlight(),Kn(),O.toast(`Hid ${e.length} (Shift+H shows them again)`))},unhideAll(){let{S:e}=O,n=e.manualHidden.size;e.manualHidden.clear(),O.applyVisibility(),O.toast(`Showing ${n} hidden node${n===1?"":"s"} again`)},pin(e=[...O.S.selected],n=null){let{S:t}=O,r=n??!e.every(a=>t.pinned.has(a));e.forEach(a=>O.pin(a,r)),O.toast(`${r?"Pinned":"Unpinned"} ${e.length}`)},isolate(e=[...O.S.selected]){let{S:n}=O;e.length&&(n.undo.push({kind:"neighborhood",neighborhood:n.neighborhood}),n.neighborhood={ids:e,depth:0},O.applyVisibility(),O.toast(`Filter: only the ${e.length} selected node${e.length===1?"":"s"} (X clears)`))},clearFilter(){let{S:e}=O;e.neighborhood=null,$r(!1),O.applyVisibility()},selectNeighbors(){let{S:e,graph:n}=O,t=O.renderer(),r=new Set;for(let a of e.selected)n.hasNode(a)&&n.forEachNeighbor(a,i=>{t.getNodeState(i).isHidden||r.add(i)});Yn([...r],"add")},async analyze(e=[...O.S.selected]){if(e.length)return K("#algo-scope").value="selection",xt(K("#algo").value,{scopeKind:"selection",channels:[K("#algo").selectedOptions[0]?.dataset.kind==="categorical"?"color":"size"]})},async saveAsView(e=null,n=[...O.S.selected]){if(!n.length||(e=e||prompt("Name for a view of the selection",`Selection of ${n.length}`),!e))return null;let t=O.captureState();t.selection=n,t.filters={...t.filters,neighborhood:{ids:n,depth:0}},t.camera=null,t.fit="selection";let r=await O.api("/api/explore/views",{name:e,description:`Saved from a selection of ${n.length} nodes`,state:t});return await O.refreshViews?.(),O.toast(`Saved view "${r.view.name}"`),r.view},async query(e=[...O.S.selected]){if(!e.length)return;let n=Number(K("#q-hops").value)||1,t=K("#q-dir").value,r=[...K("#q-types").selectedOptions].map(a=>a.value);return Ye(e,{hops:n,direction:t,linkTypes:r.length?r:null})}};function Kn(){let{S:e}=O,n=K("#bulkbar");if(!n)return;let t=[...e.selected].filter(o=>O.graph.hasNode(o)).length;n.hidden=t===0,K("#bulk-count").textContent=`${t} selected`,K("#bulk-paths").hidden=t!==2;let r=new Set;O.graph.forEachEdge((o,s)=>r.add(s.item.type));let a=[...K("#q-types").selectedOptions].map(o=>o.value),i=[...r].sort().join("");K("#q-types").dataset.types!==i&&(K("#q-types").dataset.types=i,K("#q-types").innerHTML=[...r].sort().map(o=>`<option ${a.includes(o)?"selected":""}>${pe(o)}</option>`).join(""))}function Hb(){document.addEventListener("pointerdown",e=>{O.S.core.menu&&!e.target.closest("#ctx-menu")&&Ei()},!0),K("#canvas").addEventListener("contextmenu",e=>e.preventDefault()),K("#ctx-menu").addEventListener("click",e=>{let n=e.target.closest("[data-act]");if(!n||n.classList.contains("dis"))return;let t=O.S.core.menu?.acts[n.dataset.act];Ei(),t?.()})}function Ei(){let e=K("#ctx-menu");e.hidden=!0,O.S.core.menu=null}function wi(e,n,t,r){let a=K("#ctx-menu"),i={},o=0,s=r.map(c=>{if(c==="-")return"<hr>";if(c.head)return`<div class="mh">${pe(c.head)}</div>`;let h=`a${o++}`;return i[h]=c.run,`<div class="mi ${c.disabled?"dis":""}" data-act="${h}" data-key="${pe(c.key||"")}">${pe(c.label)}${c.hint?`<span class="muted">${pe(c.hint)}</span>`:""}</div>`}).join("");a.innerHTML=`<div class="mt">${pe(t)}</div>${s}`,a.hidden=!1;let l=K("main").getBoundingClientRect(),u=a.offsetWidth,d=a.offsetHeight;return a.style.left=`${Math.min(e,l.width-u-4)}px`,a.style.top=`${Math.min(n,l.height-d-4)}px`,O.S.core.menu={acts:i,items:r},a}async function Fs(e,n,t){let{S:r}=O;r.selected.has(e)||(r.selected=new Set([e]),r.pathIds=null,O.applyHighlight(),Kn());let a=[...r.selected],i=a.length>1,o=[{label:i?`Expand ${a.length} selected`:"Expand neighbours",key:"expand",hint:"E",run:()=>Ye(a,{hops:1})},{label:"Expand 2 hops",key:"expand2",hint:"\u21E7E",run:()=>Ye(a,{hops:2})},{head:"Expand by relationship"},{label:"loading\u2026",key:"loading",disabled:!0},{label:"Collapse neighbours",key:"collapse",hint:"C",run:()=>Ti(a)},"-",{label:"Select neighbours",key:"neighbours",hint:"N",run:()=>Te.selectNeighbors()},{label:r.pinned.has(e)?"Unpin":"Pin",key:"pin",hint:"P",run:()=>Te.pin(a)},{label:"Hide",key:"hide",hint:"H",run:()=>Te.hide(a)},{label:"Isolate (set as filter)",key:"isolate",hint:"I",run:()=>Te.isolate(a)},...a.length===2?[{label:"Find paths between",key:"paths",hint:"G",run:()=>yn(a[0],a[1])}]:[],"-",{label:"Hop distance from here",key:"distance",run:()=>xt("shortest_path",{params:{source:e},scopeKind:K("#algo-scope").value==="selection"?"all":K("#algo-scope").value,channels:["color"]})},{label:"Similar nodes (Jaccard)",key:"similar",run:async()=>{let l=await xt("jaccard",{params:{node:e,k:20},scopeKind:"all",channels:["color"]});if(l){let u=Object.keys(l.values);await Ye([e,...u].slice(0,21),{hops:0,quiet:!0}),Yn(u,"replace")}}},{label:"Save selection as view\u2026",key:"saveview",run:()=>Te.saveAsView()}],s=wi(n,t,i?`${a.length} nodes`:O.label(e),o);try{let l=await O.api(`/api/explore/session/${r.sessionId}/summary?id=${encodeURIComponent(e)}`);if(r.core.menu?.items!==o)return;let u=o.findIndex(c=>c.key==="loading"),d=l.linkTypes.flatMap(c=>[{label:`Expand ${c.type}`,key:`expand:${c.type}`,hint:`${c.total}${c.out&&c.in?` (${c.out}\u2192 ${c.in}\u2190)`:c.out?"\u2192":"\u2190"}`,run:()=>Ye(a,{hops:1,linkTypes:[c.type]})},{label:`Collapse ${c.type}`,key:`collapse:${c.type}`,run:()=>Ti(a,c.type)}]);o.splice(u,1,...d.length?d:[{label:"no links",key:"none",disabled:!0}]),wi(parseFloat(s.style.left),parseFloat(s.style.top),i?`${a.length} nodes`:O.label(e),o)}catch{}}function Ms(e,n,t){let{graph:r,S:a}=O,i=r.getEdgeAttributes(e),[o,s]=r.extremities(e);wi(n,t,`${i.item.type} link`,[{label:"Select both ends",key:"ends",run:()=>Yn([o,s],"replace")},{label:"Isolate both ends",key:"isolate",run:()=>Te.isolate([o,s])},{label:`Hide all ${i.item.type} links`,key:"hidetype",run:()=>{a.hiddenEdgeTypes.add(i.item.type),O.applyVisibility()}},{label:`Expand ends over ${i.item.type}`,key:"expandtype",run:()=>Ye([o,s],{hops:1,linkTypes:[i.item.type]})},{label:"Show properties",key:"props",run:()=>{K("#details").innerHTML=`<h3>${pe(i.item.type)}</h3><p class="muted">${pe(e)}<br>${pe(o)} \u2192 ${pe(s)}</p><table>${Object.entries(i.item.properties||{}).map(([l,u])=>`<tr><th>${pe(l)}</th><td>${pe(typeof u=="object"?JSON.stringify(u):u)}</td></tr>`).join("")}</table>`}}])}function Ns(e,n){let{S:t}=O;wi(e,n,"Canvas",[{label:"Fit everything",key:"fit",hint:"F",run:()=>O.fitCamera(O.graph.filterNodes(r=>!O.renderer().getNodeState(r).isHidden))},{label:"Select all visible",key:"selectall",hint:"Ctrl+A",run:()=>O.selectAllVisible()},{label:"Lasso select",key:"lasso",hint:"L",run:()=>Zt("lasso")},{label:"Box select",key:"box",hint:"B",run:()=>Zt("box")},"-",{label:`Show hidden (${t.manualHidden.size})`,key:"unhide",disabled:!t.manualHidden.size,run:()=>Te.unhideAll()},{label:"Clear isolate / path filter",key:"clearfilter",disabled:!t.neighborhood&&!t.core.isolate,run:()=>Te.clearFilter()},{label:"Clear analysis colours / sizes",key:"clearenc",disabled:!t.enc.size&&!t.enc.color&&!t.enc.edge,run:()=>ks()},{label:"Relayout",key:"relayout",run:()=>O.runLayout({full:!0})},{label:"Keyboard shortcuts",key:"help",hint:"?",run:()=>K("#help-dialog").showModal()}])}function jb(){let e=O.S.core.config?.algorithms;K("#algo").innerHTML=Object.entries(e||{}).map(([t,r])=>`<option value="${t}" data-kind="${r.kind}" data-level="${r.level}">${pe(r.title.split(" (")[0])}</option>`).join("")||K("#algo").innerHTML,K("#algo").onchange=yh,yh(),K("#algo-run").onclick=()=>xt(void 0,{ask:!0});for(let t of["size","color","edge"])K(`#algo-map-${t}`).onclick=async()=>{(!O.S.core.result||O.S.core.result.algo!==K("#algo").value||O.S.core.result.scopeKind!==K("#algo-scope").value)&&await xt(),Ds(t)};K("#algo-clear").onclick=ks,K("#algo-auto").onchange=t=>{O.S.core.auto=t.target.checked},K("#algo-result").onclick=t=>{let r=t.target.closest("[data-id]");r&&O.graph.hasNode(r.dataset.id)&&(O.select(r.dataset.id),O.focusNode(r.dataset.id))},K("#enc-legend").onclick=t=>{let r=t.target.closest("[data-cat]");if(!r||!O.S.enc.color)return;let a=Number(r.dataset.cat);Yn([...O.S.enc.color.values].filter(([i,o])=>o===a&&O.graph.hasNode(i)).map(([i])=>i),t.shiftKey?"add":"replace")},K("#paths-find").onclick=()=>yn(),K("#paths-isolate").onchange=t=>$r(t.target.checked),K("#paths-list").onclick=t=>{let r=t.target.closest("[data-i]");r&&Rs(Number(r.dataset.i))};for(let t of document.querySelectorAll("[data-tool]"))t.onclick=()=>Zt(t.dataset.tool);let n={"bulk-expand":()=>Ye([...O.S.selected],{hops:1}),"bulk-expand2":()=>Ye([...O.S.selected],{hops:2}),"bulk-hide":()=>Te.hide(),"bulk-pin":()=>Te.pin(),"bulk-isolate":()=>Te.isolate(),"bulk-paths":()=>yn(),"bulk-analyze":()=>Te.analyze(),"bulk-view":()=>Te.saveAsView(),"bulk-query":()=>Te.query(),"bulk-clear":()=>O.clearSelection(),"bulk-neighbours":()=>Te.selectNeighbors()};for(let[t,r]of Object.entries(n))K("#"+t).onclick=r;K("#help-list").innerHTML=_h.map(([t,r])=>`<tr><th><kbd>${pe(t)}</kbd></th><td>${pe(r)}</td></tr>`).join("")}function qb(){document.addEventListener("keydown",e=>{let{S:n}=O;if(n.presenting||e.target.matches("input, textarea, select")||e.ctrlKey||e.metaKey)return;let t=[...n.selected].filter(i=>O.graph.hasNode(i)),r=e.key,a=!0;r==="Escape"?n.core.menu?(Ei(),e.stopImmediatePropagation()):n.core.tool?(Zt(null),e.stopImmediatePropagation()):a=!1:r==="e"||r==="E"?t.length&&Ye(t,{hops:e.shiftKey?2:1}):r==="c"?t.length&&Ti(t):r==="h"||r==="Delete"||r==="Backspace"?Te.hide(t):r==="H"?Te.unhideAll():r==="i"?Te.isolate(t):r==="x"?Te.clearFilter():r==="p"?t.length&&Te.pin(t):r==="n"?Te.selectNeighbors():r==="f"?O.fitCamera(t.length?t:O.graph.filterNodes(i=>!O.renderer().getNodeState(i).isHidden)):r==="l"?Zt("lasso"):r==="b"?Zt("box"):r==="g"?yn():r==="a"?xt(void 0,{ask:!0}):r==="?"?K("#help-dialog").open?K("#help-dialog").close():K("#help-dialog").showModal():a=!1,a&&e.preventDefault()},!0)}var Vb=We(fs(),1);var HS=typeof process<"u"&&process.env?.SCALE_IMPL==="wrong";function Dh(e){let n=[...e].sort((i,o)=>i[0]-o[0]||i[1]-o[1]);if(n.length<3)return n;let t=(i,o,s)=>(o[0]-i[0])*(s[1]-i[1])-(o[1]-i[1])*(s[0]-i[0]),r=[];for(let i of n){for(;r.length>=2&&t(r[r.length-2],r[r.length-1],i)<=0;)r.pop();r.push(i)}let a=[];for(let i=n.length-1;i>=0;i--){let o=n[i];for(;a.length>=2&&t(a[a.length-2],a[a.length-1],o)<=0;)a.pop();a.push(o)}return a.pop(),r.pop(),r.concat(a)}var qS=typeof process<"u"&&process.env?.SCALE_IMPL==="wrong",kh={degree:600,pagerank:115,louvain:650,leiden:260,components:4100,betweenness:34,shortest_path:1500,jaccard:215,neighborhood:2500,overview:4e3,layout_force:25,layout_simple:400,bundle:22},Xb=e=>e<300?"low":e<2e3?"medium":"high";function Ch(e,n,t){let r=n<500?400:n<3e3?200:n<2e4?120:60,a=e==="force"||e==="community"||e==="structural",i=a?r*(n*Math.log2(n+2)+t):n*Math.log2(n+2)+t,o=i*(a?kh.layout_force*20*(e==="community"?.4:1):kh.layout_simple)/1e6;return{kind:e,nodes:n,links:t,ops:Math.round(i),estMs:o,level:Xb(o)}}var Y=null,he=e=>document.querySelector(e),jr=e=>String(e).replace(/[&<>"']/g,n=>`&#${n.charCodeAt(0)};`),Ri=["#4f8cff","#f5a524","#30a46c","#e5484d","#8e4ec6","#12a594","#d6409f","#ffb224","#0091ff","#e54d2e","#46a758","#ab4aba"],Ee=e=>Number(e).toLocaleString();function Fh(e){Y=e;let{S:n}=Y,t=new URLSearchParams(location.search),r=Y.config||{};n.scale={mode:t.get("clusters")||localStorage.getItem("explore.clusters")||"auto",by:t.get("clusterBy")||localStorage.getItem("explore.clusterBy")||"louvain",zoomT:Number(t.get("clusterZoom")||.6),autoAbove:Number(t.get("clusterAbove")||1500),maxClusters:300,ov:null,membership:new Map,members:new Map,expanded:new Set,collapsed:new Set,hidden:new Set,zoomedOut:!0,active:!1,geom:new Map,geomDirty:!0,drawn:[],metaOn:!0,bundle:{on:t.get("bundle")==="1",paths:null,stats:null,runId:0,running:!1,dirty:!0,eligible:[],key:""},totals:null,uiWrong:!!r.scaleUiWrong,progress:new Map,skipConfirm:!1,loading:!1,version:0};let a=he("main"),i=document.createElement("canvas");i.id="scale-layer",a.insertBefore(i,he("#lasso-layer")),n.scale.canvas=i;let o=document.createElement("div");o.id="load-progress",o.hidden=!0,o.innerHTML='<div class="bar"><i></i></div><span></span>',a.appendChild(o);let s=document.createElement("div");return s.id="scale-tip",s.hidden=!0,a.appendChild(s),Yb(),Nh(),new ResizeObserver(()=>Ft()).observe(a),Di}var Di={refresh:rt,loadOverview:Vr,toggleCluster:Oh,setMode:Mh,setBundle:Li,bundleNow:Bs,progress:at,confirmCost:tx,onVisibilityChanged:Ws,onLayoutDone:Pi,onStageClick:Gs,nodeHiddenByCluster:Zb,geometry:()=>Y.S.scale.geom,markDirty:ki,updateBadge:Zn,draw:Ft,rendererChanged:()=>Nh()};function Yb(){let{S:e}=Y,n=he("#cl-mode"),t=he("#cl-by"),r=he("#cl-zoom"),a=he("#cl-meta"),i=he("#bundle-on");n&&(n.value=e.scale.mode,n.onchange=s=>Mh(s.target.value)),t&&([...t.options].some(s=>s.value===e.scale.by)||t.add(new Option(e.scale.by,e.scale.by)),t.value=e.scale.by,t.onchange=s=>{e.scale.by=s.target.value,localStorage.setItem("explore.clusterBy",e.scale.by),e.scale.expanded.clear(),e.scale.collapsed.clear(),Vr()}),r&&(r.value=e.scale.zoomT,r.oninput=s=>{e.scale.zoomT=Number(s.target.value),zh(!0)}),a&&(a.checked=e.scale.metaOn,a.onchange=s=>{e.scale.metaOn=s.target.checked,Ft()}),i&&(i.checked=e.scale.bundle.on,i.onchange=s=>Li(s.target.checked)),he("#cl-expand-all")&&(he("#cl-expand-all").onclick=()=>{for(let s of e.scale.ov?.clusters||[])e.scale.expanded.add(s.id),e.scale.collapsed.delete(s.id);rt()}),he("#cl-collapse-all")&&(he("#cl-collapse-all").onclick=()=>{e.scale.expanded.clear();for(let s of e.scale.ov?.clusters||[])e.scale.collapsed.add(s.id);rt()});let o=()=>{clearTimeout(e.scale.costT),e.scale.costT=setTimeout(Lh,150)};for(let s of["#algo","#algo-scope"])he(s)?.addEventListener("change",o);setTimeout(Lh,300)}async function Lh(){let e=he("#algo-cost");if(!(!e||!Y.S.core))try{let n=he("#algo").value,t=Y.core.scopePayload(he("#algo-scope").value),r=await Y.api("/api/explore/cost",{op:"algo",algo:n,scope:t});e.textContent=`\u2248 ${r.estMs<1e3?Math.max(1,Math.round(r.estMs))+" ms":(r.estMs/1e3).toFixed(1)+" s"} on ${Ee(r.nodes)} nodes / ${Ee(r.links)} links${r.approximate?" (sampled)":""}`,e.dataset.level=r.level,e.dataset.estMs=String(r.estMs)}catch{e.textContent=""}}function Mh(e){let{S:n}=Y;n.scale.mode=e,localStorage.setItem("explore.clusters",e),he("#cl-mode")&&(he("#cl-mode").value=e),e!=="off"&&!n.scale.ov?Vr():rt()}async function Vr(){let{S:e}=Y;if(e.scale.mode==="off")return rt();let n=e.scale.by==="encoding"?e.enc?.color?.kind==="categorical"?"run:"+e.enc.color.runId:"louvain":e.scale.by;e.scale.loading=!0,at("overview",null,"Building cluster overview\u2026"),document.body.dataset.overview="loading";try{let t=performance.now(),r=await Y.api("/api/explore/clusters",{by:n,seed:e.layout.seed??1,maxClusters:e.scale.maxClusters,membership:!0});r.clientMs=performance.now()-t,r.reqBy=n,e.scale.ov=r,e.scale.membership=new Map(Object.entries(r.membership||{})),e.scale.members=new Map;for(let[a,i]of e.scale.membership)e.scale.members.has(i)||e.scale.members.set(i,[]),e.scale.members.get(i).push(a);e.scale.cIndex=new Map(r.clusters.map((a,i)=>[a.id,i])),e.scale.cById=new Map(r.clusters.map(a=>[a.id,a])),e.scale.version++,e.scale.geomDirty=!0,Y.setStatus("overview",`${r.totals.clusters} clusters (${r.by}) of ${Ee(r.totals.nodes)} nodes in ${Math.round(r.timings.totalMs)} ms${r.cached?" (cached)":""}`),document.body.dataset.overview=String(r.totals.clusters)}catch(t){Y.toast("Cluster overview failed: "+t.message),document.body.dataset.overview="error"}finally{e.scale.loading=!1,at("overview",!1)}rt()}var Kb=()=>{let{S:e}=Y;return!e.scale.ov||e.scale.mode==="off"?!1:e.scale.mode==="on"?!0:e.map?.mode&&e.map.mode!=="graph"?!1:e.core?.scope==="focus"||Y.graph.order>e.scale.autoAbove},bn=e=>(Y.S.scale.members.get(e)||[]).filter(n=>Y.graph.hasNode(n));function qr(e){let n=Y.S.scale;return n.active?n.collapsed.has(e)?!0:n.zoomedOut&&!n.expanded.has(e)?!(n.mode==="auto"&&Y.S.core?.scope==="focus"&&bn(e).length):!1:!1}function Zb(e){return Y.S.scale?.hidden.has(e)||!1}function rt(){let{S:e}=Y;e.scale.active=Kb(),document.body.dataset.clusters=e.scale.active?e.scale.zoomedOut?"overview":"detail":"off";let n=new Set;if(e.scale.active){for(let r of e.scale.ov.clusters)if(qr(r.id))for(let a of bn(r.id))n.add(a)}let t=n.size!==e.scale.hidden.size||[...n].some(r=>!e.scale.hidden.has(r));e.scale.hidden=n,Qb()&&Y.renderer()?.refresh(),t?Y.applyVisibility():(Zn(),Ft()),e.scale.bundle.dirty=!0,Os()}function Qb(){let{S:e}=Y,n=Y.renderer();if(!n)return!1;if(!(e.scale.active&&e.core?.scope==="focus"))return e.scale.bbox?(n.setCustomBBox(null),e.scale.bbox=null,!0):!1;let t=1/0,r=-1/0,a=1/0,i=-1/0;for(let s of e.scale.ov.clusters)t=Math.min(t,s.x-s.r),r=Math.max(r,s.x+s.r),a=Math.min(a,s.y-s.r),i=Math.max(i,s.y+s.r);Y.graph.forEachNode((s,l)=>{Number.isFinite(l.x)&&(t=Math.min(t,l.x),r=Math.max(r,l.x),a=Math.min(a,l.y),i=Math.max(i,l.y))});let o=[t,r,a,i].map(s=>Math.round(s)).join(",");return e.scale.bbox===o?!1:(e.scale.bbox=o,n.setCustomBBox({x:[t,r],y:[a,i]}),!0)}function ki(){let e=Y.S.scale;e&&(e.geomDirty=!0,e.bundle.dirty=!0)}function Ci(){let{S:e,graph:n}=Y;if(!e.scale.geomDirty)return e.scale.geom;e.scale.geomDirty=!1;let t=new Map;for(let r of e.scale.ov?.clusters||[]){let a=bn(r.id);if(!a.length){t.set(r.id,{x:r.x,y:r.y,r:r.r,hull:null,loaded:0});continue}let i=0,o=0,s=0,l=[],u=Math.max(1,Math.floor(a.length/4e3));for(let g=0;g<a.length;g+=1){let p=n.getNodeAttributes(a[g]);Number.isFinite(p.x)&&(i+=p.x,o+=p.y,s++,g%u===0&&l.push([p.x,p.y]))}if(!s){t.set(r.id,{x:r.x,y:r.y,r:r.r,hull:null,loaded:0});continue}let d=i/s,c=o/s,h=0;for(let[g,p]of l)h+=(g-d)**2+(p-c)**2;t.set(r.id,{x:d,y:c,r:Math.max(Math.sqrt(h/l.length)*1.2,1e-9),hull:l.length>=3?Dh(l):l,loaded:a.length})}return e.scale.geom=t,t}var Ph=null;function Nh(){let e=Y.renderer();if(!e||e===Ph)return;Ph=e,e.on("afterRender",Ft),e.getCamera().on("updated",()=>zh());let n=he("#canvas");n.addEventListener("mousemove",t=>{let r=Y.S.scale;if(!r?.active){he("#scale-tip").hidden=!0;return}let a=n.getBoundingClientRect(),i=Gh(t.clientX-a.left,t.clientY-a.top),o=he("#scale-tip");if(!i){o.hidden=!0,n.style.cursor="";return}let s=r.cById.get(i.id);n.style.cursor="pointer",o.hidden=!1,o.style.left=`${t.clientX-a.left+14}px`,o.style.top=`${t.clientY-a.top+10}px`;let l=Object.entries(s.types).sort((u,d)=>d[1]-u[1]).slice(0,3).map(([u,d])=>`${jr(u)} ${Ee(d)}`).join(" \xB7 ");o.innerHTML=`<b>${jr(s.label)}</b><br>${Ee(s.count)} nodes \xB7 ${l}<br>${s.top.map(u=>jr(u.label)).join(", ")}<br><span class="muted">${i.kind==="bubble"?"click to expand":"click to collapse"}</span>`}),n.addEventListener("mouseleave",()=>{he("#scale-tip").hidden=!0})}function zh(e=!1){let{S:n}=Y;if(!n.scale)return;let t=Y.renderer().getCamera().ratio,r=t>n.scale.zoomT;(r!==n.scale.zoomedOut||e)&&(n.scale.zoomedOut=r,n.scale.ov&&rt())}function Gs(e){let{S:n}=Y;if(!n.scale?.active)return!1;let t=Gh(e.x,e.y);return t?(Oh(t.id),!0):!1}function Gh(e,n){let t=Y.S.scale.drawn;for(let r=t.length-1;r>=0;r--){let a=t[r];if(a.kind==="bubble"&&Math.hypot(e-a.x,n-a.y)<=a.r+3)return a}for(let r=t.length-1;r>=0;r--){let a=t[r];if(a.kind==="hull"&&a.label&&e>=a.label[0]&&e<=a.label[2]&&n>=a.label[1]&&n<=a.label[3])return a}return null}async function Oh(e){let{S:n,graph:t}=Y;if(qr(e)){if(n.scale.uiWrong)return rt();let r=n.scale.cById.get(e),a=Ci().get(e);n.scale.expanded.add(e),n.scale.collapsed.delete(e),(!bn(e).length||n.core?.scope==="focus"&&bn(e).length<Math.min(r.count,2e3))&&await Jb(r);let i=bn(e),o=new Map;for(let s of i){let l=t.getNodeAttributes(s);Number.isFinite(l.x)&&(o.set(s,{x:l.x,y:l.y}),t.mergeNodeAttributes(s,{x:a.x,y:a.y}))}rt(),Y.animateTo(o,450),ki(),document.body.dataset.lastToggle=`expand:${e}`}else n.scale.collapsed.add(e),n.scale.expanded.delete(e),rt(),document.body.dataset.lastToggle=`collapse:${e}`}async function Jb(e){let{S:n,graph:t}=Y;at("members",null,`Loading ${e.label}\u2026`);try{let r=await Y.api("/api/explore/clusters/members",{by:n.scale.ov.reqBy,seed:n.layout.seed??1,maxClusters:n.scale.maxClusters,cluster:e.id,max:2e3}),a=t.order<=5e3?t.nodes():[],i=await Y.api(`/api/explore/session/${n.sessionId}/neighborhood?stream=0`,{seeds:[...r.ids,...a],exclude:a,hops:0,maxNodes:2e4});for(let u of r.ids)n.scale.membership.set(u,e.id);n.scale.members.set(e.id,[...new Set([...n.scale.members.get(e.id)||[],...r.ids])]),Y.addItems([...i.nodes,...i.links]);let o=Ci().get(e.id)||e,s=r.ids.length,l=Math.PI*(3-Math.sqrt(5));r.ids.forEach((u,d)=>{if(!t.hasNode(u))return;let c=e.r*.92*Math.sqrt((d+.5)/s);t.mergeNodeAttributes(u,{x:e.x+c*Math.cos(d*l),y:e.y+c*Math.sin(d*l),placed:!0}),n.newNodes.delete(u)}),ki(),Y.toast(`${e.label}: loaded ${Ee(r.ids.length)} of ${Ee(r.count)} members${r.truncated?" (highest degree first)":""}`)}catch(r){Y.toast("Loading cluster failed: "+r.message)}finally{at("members",!1)}}function Ft(){let{S:e}=Y,n=e.scale?.canvas,t=Y.renderer();if(!n||!t)return;let r=he("main"),a=window.devicePixelRatio||1,i=r.clientWidth,o=r.clientHeight;(n.width!==Math.round(i*a)||n.height!==Math.round(o*a))&&(n.width=Math.round(i*a),n.height=Math.round(o*a),n.style.width=i+"px",n.style.height=o+"px");let s=n.getContext("2d");s.setTransform(1,0,0,1,0,0),s.clearRect(0,0,n.width,n.height),e.scale.drawn=[];let l=e.scale.bundle.on&&e.scale.bundle.paths,u=e.scale.active;if(!l&&!u)return;let d={cameraState:t.getCamera().getState()},c=t.graphToViewport({x:0,y:0},d),h=t.graphToViewport({x:1,y:0},d),g=t.graphToViewport({x:0,y:1},d),p=[h.x-c.x,h.y-c.y,g.x-c.x,g.y-c.y,c.x,c.y],m=Math.hypot(p[0],p[1])||1,b=(E,R)=>[p[0]*E+p[2]*R+p[4],p[1]*E+p[3]*R+p[5]],v=e.style?.colors||{};if(l&&ex(s,p,a,m,v),!u)return;let x=Ci(),y=e.scale.ov,_=e.selected;if(e.scale.metaOn&&e.scale.zoomedOut&&!(l&&e.scale.bundle.meta)){s.setTransform(a,0,0,a,0,0),s.strokeStyle=v.muted||"#8b93a7",s.globalAlpha=.45,s.lineCap="round";let E=0;for(let R of y.metaEdges){if(E++>4e3)break;let L=x.get(R.source),k=x.get(R.target);if(!L||!k||!(qr(R.source)||qr(R.target)))continue;let[P,D]=b(L.x,L.y),[I,G]=b(k.x,k.y);s.lineWidth=Math.min(14,.8+1.6*Math.log2(1+R.count)),s.beginPath(),s.moveTo(P,D),s.lineTo(I,G),s.stroke()}s.globalAlpha=1}s.setTransform(a,0,0,a,0,0);let S=[],T=Math.max(1,...y.clusters.map(E=>E.count)),A=Math.max(.7,Math.min(2.2,Math.sqrt(1/t.getCamera().ratio)));y.clusters.forEach((E,R)=>{let L=x.get(E.id);if(!L)return;let k=Ri[R%Ri.length];if(qr(E.id)){let[P,D]=b(L.x,L.y),I=L.loaded?(7+35*Math.sqrt(E.count/T))*A:Math.max(4,L.r*m);if(P<-I||D<-I||P>n.width/a+I||D>n.height/a+I)return;let G=_.size&&bn(E.id).some(z=>_.has(z));s.beginPath(),s.arc(P,D,I,0,Math.PI*2),s.fillStyle=k,s.globalAlpha=.55,s.fill(),s.globalAlpha=1,s.lineWidth=G?4:1.5,s.strokeStyle=G?v.select||"#ffd400":k,s.stroke(),e.scale.drawn.push({id:E.id,kind:"bubble",x:P,y:D,r:I}),S.push({x:P,y:D,rad:I,count:E.count,label:E.label,i:R,kind:"bubble"})}else if(L.hull&&L.hull.length>=3){s.beginPath(),L.hull.forEach(([I,G],z)=>{let[F,M]=b(I,G);z?s.lineTo(F,M):s.moveTo(F,M)}),s.closePath(),s.fillStyle=k,s.globalAlpha=.07,s.fill(),s.globalAlpha=.7,s.setLineDash([5,4]),s.lineWidth=1.2,s.strokeStyle=k,s.stroke(),s.setLineDash([]),s.globalAlpha=1;let P=1/0,D=0;for(let[I,G]of L.hull){let[z,F]=b(I,G);F<P&&(P=F,D=z)}S.push({x:D,y:P-8,rad:0,count:E.count,label:E.label,i:R,kind:"hull",id:E.id})}}),s.textAlign="center",s.textBaseline="middle";let w=[];S.sort((E,R)=>R.count-E.count);for(let E of S){let R=Ee(E.count),L=E.label.length>28?E.label.slice(0,27)+"\u2026":E.label;if(E.kind==="bubble"){if(s.font=`bold ${Math.max(10,Math.min(18,8+E.rad/5))}px system-ui, sans-serif`,s.fillStyle="#fff",s.fillText(R,E.x,E.y),E.rad<16)continue;s.font="12px system-ui, sans-serif";let k=s.measureText(L).width,P=[E.x-k/2-3,E.y+E.rad+3,E.x+k/2+3,E.y+E.rad+19];if(w.some(D=>!(P[2]<D[0]||P[0]>D[2]||P[3]<D[1]||P[1]>D[3])))continue;w.push(P),s.fillStyle=v.text||"#e6e8ee",s.fillText(L,E.x,E.y+E.rad+11)}else{s.font="12px system-ui, sans-serif";let k=`${L} (${R})`,P=s.measureText(k).width,D=[E.x-P/2-4,E.y-9,E.x+P/2+4,E.y+9];if(w.some(I=>!(D[2]<I[0]||D[0]>I[2]||D[3]<I[1]||D[1]>I[3])))continue;w.push(D),s.fillStyle=v.panel||"#1b1f2a",s.globalAlpha=.85,s.fillRect(D[0],D[1],D[2]-D[0],D[3]-D[1]),s.globalAlpha=1,s.fillStyle=Ri[E.i%Ri.length],s.fillText(k,E.x,E.y),e.scale.drawn.push({id:E.id,kind:"hull",label:D})}}}function ex(e,n,t,r,a){let i=Y.S.scale.bundle;i.path&&(e.setTransform(n[0]*t,n[1]*t,n[2]*t,n[3]*t,n[4]*t,n[5]*t),e.lineWidth=(i.meta?1.6:1)/r,e.strokeStyle=a.muted||"#8b93a7",e.globalAlpha=i.meta?.55:.28,e.stroke(i.path),i.hlPath&&(e.globalAlpha=.95,e.strokeStyle=a.hover||"#ffd400",e.lineWidth=2/r,e.stroke(i.hlPath)),e.globalAlpha=1,e.setTransform(t,0,0,t,0,0))}var zs=null,Ih=null;function Li(e){let{S:n}=Y;if(n.scale.bundle.on=!!e,he("#bundle-on")&&(he("#bundle-on").checked=!!e),document.body.dataset.bundle=e?"pending":"off",!e){n.scale.bundle.paths=null,n.scale.bundle.path=null,Y.applyVisibility(),Ft();return}n.scale.bundle.dirty=!0,Bs()}function Os(){let e=Y.S.scale?.bundle;!e?.on||!e.dirty||(clearTimeout(Ih),Ih=setTimeout(Bs,350))}function Bs(){let{S:e,graph:n}=Y,t=e.scale.bundle;if(!t.on)return;let r=Y.renderer();t.dirty=!1;let a=[],i=!1;if(e.scale.active&&e.scale.zoomedOut){i=!0;let c=Ci();for(let h of e.scale.ov.metaEdges){let g=c.get(h.source),p=c.get(h.target);if(g&&p&&a.push({id:h.id,x1:g.x,y1:g.y,x2:p.x,y2:p.y,w:h.count}),a.length>=3e3)break}}else for(let c of t.eligible){if(!n.hasEdge(c))continue;let[h,g]=n.extremities(c);if(h===g)continue;let p=n.getNodeAttributes(h),m=n.getNodeAttributes(g);r.getNodeState(h).isHidden||r.getNodeState(g).isHidden||a.push({id:c,x1:p.x,y1:p.y,x2:m.x,y2:m.y})}let o=5e3,s=a.length,l=a.slice(0,o);zs||=new Worker("/explore/bundle.worker.js",{type:"module"});let u=++t.runId;t.running=!0,t.meta=i,at("bundle",0,`Bundling ${Ee(l.length)} ${i?"cluster links":"links"}\u2026`);let d=performance.now();zs.onmessage=({data:c})=>{if(c.runId!==t.runId)return;if(c.type==="progress")return at("bundle",c.progress,`Bundling ${Ee(l.length)} ${i?"cluster links":"links"}\u2026`);if(t.running=!1,at("bundle",!1),c.type==="error"){Y.toast("Bundling failed: "+c.message);return}let h=new Map;for(let g=0;g<c.ids.length;g++)h.set(c.ids[g],c.points.subarray(c.offsets[g],c.offsets[g+1]));t.paths=h,t.stats={...c.stats,total:s,clientMs:performance.now()-d,meta:i},Bh(a.slice(o)),Y.setStatus("bundle",`${Ee(c.stats.edges)} ${i?"cluster links":"links"} bundled in ${Math.round(c.stats.ms)} ms${s>o?` (${Ee(s-o)} drawn straight)`:""}`),document.body.dataset.bundle=String(c.stats.edges),i?Ft():Y.applyVisibility()},zs.postMessage({type:"run",runId:u,edges:l,options:{wrong:e.scale.uiWrong}})}function Bh(e=[]){let n=Y.S.scale.bundle,t=new Path2D,r=new Path2D,a=Y.S.hlSets?.edges,i=!1;for(let[o,s]of n.paths){let l=a?.has(o)?(i=!0,r):t;l.moveTo(s[0],s[1]);for(let u=2;u<s.length;u+=2)l.lineTo(s[u],s[u+1])}for(let o of e)t.moveTo(o.x1,o.y1),t.lineTo(o.x2,o.y2);n.path=t,n.hlPath=i?r:null}function Ws(e){let{S:n}=Y;if(!n.scale)return!1;let t=n.scale.bundle;if(t.on){let r=e.length+":"+(e[0]||"")+":"+(e[e.length-1]||"");r!==t.key&&(t.key=r,t.dirty=!0),t.eligible=e,Os(),t.paths&&!t.meta&&Bh()}return Zn(),Ft(),t.on&&!!t.paths&&!t.meta}function Pi(){ki(),Os(),Ft()}async function Zn(){let{S:e,graph:n}=Y,t=he("#perf-badge");if(!t||!Y.renderer())return;!e.scale.totals&&!e.scale.totalsLoading&&(e.scale.totalsLoading=!0,Y.api("/api/explore/cost",{op:"overview"}).then(l=>{e.scale.totals={nodes:l.nodes,links:l.links},Zn()}).catch(()=>{}).finally(()=>{e.scale.totalsLoading=!1}));let r=e.scale.totals,a=n.order,i=n.size,o=r?.nodes?Math.min(100,100*a/r.nodes):100,s=e.scale.visCount??a;t.innerHTML=`<span class="pb-bar"><i style="width:${o.toFixed(1)}%"></i></span>nodes <b>${Ee(a)}</b> / ${r?Ee(r.nodes):"?"} loaded (${o<10?o.toFixed(1):Math.round(o)}%) \xB7 links <b>${Ee(i)}</b> / ${r?Ee(r.links):"?"}${e.scale.active?` \xB7 overview ${Ee(e.scale.ov.totals.clusters)} clusters`:""} \xB7 drawn ${Ee(s)}`,Object.assign(t.dataset,{loadedNodes:a,loadedLinks:i,totalNodes:r?.nodes??"",totalLinks:r?.links??""})}function at(e,n,t){let{S:r}=Y,a=he("#load-progress");if(!r.scale||!a)return;n===!1?r.scale.progress.delete(e):r.scale.progress.set(e,{frac:n,label:t??r.scale.progress.get(e)?.label??e,at:performance.now()});let i=[...r.scale.progress.values()].sort((o,s)=>s.at-o.at)[0];a.hidden=!i,document.body.dataset.loading=i?[...r.scale.progress.keys()].join(","):"",i&&(a.classList.toggle("indet",i.frac==null),a.querySelector("i").style.width=i.frac==null?"30%":`${Math.round(Math.max(.02,Math.min(1,i.frac))*100)}%`,a.querySelector("span").textContent=i.label+(i.frac!=null?` ${Math.round(i.frac*100)}%`:""))}async function tx(e,n){let{S:t}=Y,r;try{r=await Y.api("/api/explore/cost",e)}catch{return!0}if(t.scale.lastCost=r,document.body.dataset.lastCost=`${r.op}:${r.level}`,!(r.level==="high"||r.op==="neighborhood"&&r.estNodes>5e3)||t.scale.skipConfirm)return!0;let i=he("#cost-dialog");if(!i)return!0;let o=r.estMs<1e3?`${Math.round(r.estMs)} ms`:`${(r.estMs/1e3).toFixed(1)} s`;return he("#cost-text").innerHTML=r.op==="neighborhood"?`${jr(n)} would load about <b>${Ee(r.estNodes)}</b> nodes and <b>${Ee(r.estLinks)}</b> links${r.truncated?" (capped)":""}.`:`${jr(n)} on <b>${Ee(r.nodes)}</b> nodes / <b>${Ee(r.links)}</b> links takes about <b>${o}</b>${r.approximate?" (sampled)":""}.`,he("#cost-basis").textContent=r.basis?`Estimate from ${r.basis}.`:"",i.showModal(),document.body.dataset.costDialog="open",new Promise(s=>i.addEventListener("close",()=>{delete document.body.dataset.costDialog,s(i.returnValue==="run")},{once:!0}))}function Wh(e,n,t){return Ch(e,n,t)}function Uh(e,n){if(!e||!e.property||e.type&&e.type!==n.type)return!0;let t=n.properties?.[e.property],r=e.value;switch(e.op||"eq"){case"eq":return String(t)===String(r);case"neq":return String(t)!==String(r);case"gt":return t!=null&&Number(t)>Number(r);case"gte":return t!=null&&Number(t)>=Number(r);case"lt":return t!=null&&Number(t)<Number(r);case"lte":return t!=null&&Number(t)<=Number(r);case"contains":return typeof t=="string"&&t.toLowerCase().includes(String(r).toLowerCase());case"exists":return t!=null&&t!=="";case"in":return Array.isArray(r)&&r.map(String).includes(String(t))}return!0}var rx=`
struct U { a: vec4f, b: vec4f, c: vec4f, d: vec4f };
// a = (viewport w, h, camera x, camera y)   b = (cos, sin, px per framed unit, size factor)
// c = (norm dX, norm dY, 1 / norm ratio, ring px)   d = (dash px, gap px, min edge px, 0)
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read> pos: array<vec2f>;
@group(0) @binding(2) var<storage, read> nstyle: array<vec4u>;
@group(0) @binding(3) var<storage, read> order: array<u32>;
@group(0) @binding(4) var<storage, read> edges: array<vec4u>;

fn toPx(p: vec2f) -> vec2f {
  let f = vec2f(0.5, 0.5) + (p - u.c.xy) * u.c.z;
  let d = f - u.a.zw;
  let r = vec2f(u.b.x * d.x - u.b.y * d.y, u.b.y * d.x + u.b.x * d.y) * u.b.z;
  return vec2f(u.a.x * 0.5 + r.x, u.a.y * 0.5 - r.y);
}
fn toClip(px: vec2f) -> vec4f { return vec4f(px.x / u.a.x * 2.0 - 1.0, 1.0 - px.y / u.a.y * 2.0, 0.0, 1.0); }
fn rgba(c: u32) -> vec4f { return vec4f(f32(c & 255u), f32((c >> 8u) & 255u), f32((c >> 16u) & 255u), f32((c >> 24u) & 255u)) / 255.0; }
// quad corner for vertex 0..5 (two triangles), computed rather than indexed from a const array
fn quad(vi: u32) -> vec2f { return vec2f(select(-1.0, 1.0, vi == 1u || vi == 2u || vi == 4u), select(-1.0, 1.0, vi == 2u || vi == 4u || vi == 5u)); }

struct NOut { @builtin(position) pos: vec4f, @location(0) local: vec2f, @location(1) @interpolate(flat) r: f32,
  @location(2) @interpolate(flat) fill: vec4f, @location(3) @interpolate(flat) ring: vec4f, @location(4) @interpolate(flat) shape: u32 };
@vertex fn vsNode(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> NOut {
  let n = order[ii];
  let st = nstyle[n];
  let r = max(bitcast<f32>(st.x) * u.b.w, 1.0);
  let corner = quad(vi);
  let ext = r + 1.5;
  let px = toPx(pos[n]) + corner * ext;
  var o: NOut;
  o.pos = toClip(px); o.local = corner * ext; o.r = r; o.fill = rgba(st.y); o.ring = rgba(st.z); o.shape = st.w & 3u;
  return o;
}
fn sdShape(p: vec2f, r: f32, shape: u32) -> f32 {
  if (shape == 1u) { // rounded square (sigma sdfSquare cornerRadius 0.15)
    let h = r * 0.86; let cr = 0.15 * h; let q = abs(p) - vec2f(h - cr);
    return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - cr;
  }
  if (shape == 2u) { return (abs(p.x) + abs(p.y) - r) * 0.70710678; } // diamond
  if (shape == 3u) { // equilateral triangle pointing up on screen (local y is down), circumradius r
    let k = 1.7320508; let h = r * 0.8660254;
    var q = vec2f(abs(p.x) - h, -p.y + h / k);
    if (q.x + k * q.y > 0.0) { q = vec2f(q.x - k * q.y, -k * q.x - q.y) / 2.0; }
    q.x = q.x - clamp(q.x, -2.0 * h, 0.0);
    return -length(q) * sign(q.y);
  }
  return length(p) - r; // circle
}
@fragment fn fsNode(i: NOut) -> @location(0) vec4f {
  let d = sdShape(i.local, i.r, i.shape);
  let a = clamp(0.5 - d, 0.0, 1.0);
  if (a <= 0.0) { discard; }
  let ringW = min(u.c.w, i.r * 0.5);
  let t = clamp(d + ringW + 0.5, 0.0, 1.0); // 0 inside the fill, 1 on the ring
  let col = mix(i.fill, i.ring, t);
  return vec4f(col.rgb * col.a * a, col.a * a); // premultiplied
}

struct EOut { @builtin(position) pos: vec4f, @location(0) across: f32, @location(1) along: f32,
  @location(2) @interpolate(flat) hw: f32, @location(3) @interpolate(flat) color: vec4f, @location(4) @interpolate(flat) dashed: u32 };
@vertex fn vsEdge(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> EOut {
  let e = edges[ii];
  let a = toPx(pos[e.x]); let b = toPx(pos[e.y]);
  let wRaw = bitcast<f32>(e.w);
  let w = max(abs(wRaw) * u.b.w, u.d.z);
  var dir = b - a; let len = length(dir);
  if (len > 1e-4) { dir = dir / len; } else { dir = vec2f(1.0, 0.0); }
  let nrm = vec2f(-dir.y, dir.x);
  let corner = quad(vi);
  let hw = w * 0.5 + 1.0;
  let t = corner.x * 0.5 + 0.5;
  let px = a + dir * (len * t) + nrm * (corner.y * hw);
  var o: EOut;
  o.pos = toClip(px); o.across = corner.y * hw; o.along = len * t; o.hw = w * 0.5; o.color = rgba(e.z);
  o.dashed = select(0u, 1u, wRaw < 0.0);
  return o;
}
@fragment fn fsEdge(i: EOut) -> @location(0) vec4f {
  // sub-pixel lines fade instead of aliasing
  var a = clamp(i.hw + 0.5 - abs(i.across), 0.0, 1.0) * min(1.0, i.hw * 2.0 + 0.25);
  if (i.dashed == 1u) { let period = u.d.x + u.d.y; if (i.along - floor(i.along / period) * period > u.d.x) { discard; } }
  if (a <= 0.0) { discard; }
  return vec4f(i.color.rgb * i.color.a * a, i.color.a * a);
}`,$h={},xn=null,$s=new Set,St=class extends Error{constructor(n,t){super(n),this.kind=t}};async function Hh(e=null){return xn||(xn=(async()=>{if(!navigator.gpu)throw new St("navigator.gpu is missing","unsupported");if(e||=await navigator.gpu.requestAdapter({powerPreference:"high-performance"}),!e)throw new St("no WebGPU adapter","unsupported");let n=e.limits,t=1<<30,r=await e.requestDevice({requiredLimits:{maxStorageBufferBindingSize:Math.min(n.maxStorageBufferBindingSize,t),maxBufferSize:Math.min(n.maxBufferSize,t)}});$h.adapter=e,$h.gpu=navigator.gpu,r.__adapter=e;let a=e.info||{};return r.__info={vendor:a.vendor||"",architecture:a.architecture||"",description:a.description||"",device:a.device||"",isFallbackAdapter:!!(e.isFallbackAdapter??a.isFallbackAdapter)},r.lost.then(i=>{xn=null;for(let o of[...$s])o(i)}),r.addEventListener?.("uncapturederror",i=>console.warn("WebGPU error:",i.error?.message)),r})(),xn.catch(()=>{xn=null}),xn)}var jh=e=>($s.add(e),()=>$s.delete(e)),Us={pos:8,nstyle:16,order:4,edges:16},qh=2,Ii=class{constructor(n,t,{readback:r=!1}={}){if(this.device=n,this.canvas=t,this.readback=r,r)this.ctx2d=t.getContext("2d"),this.format="rgba8unorm";else{if(this.ctx=t.getContext("webgpu"),!this.ctx)throw new St('canvas.getContext("webgpu") returned null',"context");this.format=navigator.gpu.getPreferredCanvasFormat(),this.ctx.configure({device:n,format:this.format,alphaMode:"premultiplied"})}let a=n.createShaderModule({code:rx});this.module=a;let i={color:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"}};this.layout=n.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},...[1,2,3,4].map(l=>({binding:l,visibility:GPUShaderStage.VERTEX,buffer:{type:"read-only-storage"}}))]});let o=n.createPipelineLayout({bindGroupLayouts:[this.layout]}),s=(l,u)=>n.createRenderPipeline({layout:o,vertex:{module:a,entryPoint:l},fragment:{module:a,entryPoint:u,targets:[{format:this.format,blend:i}]},primitive:{topology:"triangle-list"}});this.nodePipe=s("vsNode","fsNode"),this.edgePipe=s("vsEdge","fsEdge"),this.uniform=n.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.bufs={},this.caps={},this.counts={nodes:0,order:0,edges:0};for(let l of Object.keys(Us))this.ensure(l,1024);this.bytes=0}ensure(n,t){let r=Math.max(4,t);if(this.caps[n]>=r)return;let a=this.caps[n]||1024;for(;a<r;)a*=2;let i=a*Us[n],o=this.device.limits.maxStorageBufferBindingSize;if(i>o)throw new St(`${n} buffer needs ${(i/1048576).toFixed(0)} MB, over the device limit of ${(o/1048576).toFixed(0)} MB`,"out-of-memory");this.device.pushErrorScope("out-of-memory");let s=this.device.createBuffer({size:i,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});this.oomCheck=this.device.popErrorScope().then(l=>{l&&(this.oom=l.message||"out of memory",this.onError?.(new St(`GPU out of memory allocating ${n} (${(i/1048576).toFixed(0)} MB)`,"out-of-memory")))}),this.bufs[n]?.destroy(),this.bufs[n]=s,this.caps[n]=a,this.bindGroup=null}write(n,t,r){this.ensure(n,r),r&&this.device.queue.writeBuffer(this.bufs[n],0,t.buffer,t.byteOffset,r*Us[n])}setNodes(n,t,r){this.write("pos",n,r),this.write("nstyle",t,r),this.counts.nodes=r}setPositions(n,t){this.write("pos",n,t)}setOrder(n,t){this.write("order",n,t),this.counts.order=t}setEdges(n,t){this.write("edges",n,t),this.counts.edges=t}resize(n,t){(this.canvas.width!==n||this.canvas.height!==t)&&(this.canvas.width=Math.max(1,n),this.canvas.height=Math.max(1,t))}render(n,t){let r=this.device;this.inFlight=(this.inFlight||0)+1;let a=()=>{this.inFlight--,this.onIdle?.()};r.queue.writeBuffer(this.uniform,0,n.buffer,n.byteOffset,64),this.bindGroup||=r.createBindGroup({layout:this.layout,entries:[{binding:0,resource:{buffer:this.uniform}},...["pos","nstyle","order","edges"].map((l,u)=>({binding:u+1,resource:{buffer:this.bufs[l]}}))]});let i=r.createCommandEncoder(),o=this.readback?this.readbackTarget():this.ctx.getCurrentTexture(),s=i.beginRenderPass({colorAttachments:[{view:o.createView(),clearValue:{r:t[0]*t[3],g:t[1]*t[3],b:t[2]*t[3],a:t[3]},loadOp:"clear",storeOp:"store"}]});if(s.setBindGroup(0,this.bindGroup),this.counts.edges&&(s.setPipeline(this.edgePipe),s.draw(6,this.counts.edges)),this.counts.order&&(s.setPipeline(this.nodePipe),s.draw(6,this.counts.order)),s.end(),this.readback&&!this.rb.busy){let{w:l,h:u,stride:d}=this.rb;i.copyTextureToBuffer({texture:o},{buffer:this.rb.buf,bytesPerRow:d},[l,u]),r.queue.submit([i.finish()]),this.rb.busy=this.rb.buf.mapAsync(GPUMapMode.READ).then(()=>{let c=new Uint8Array(this.rb.buf.getMappedRange()),h=new ImageData(l,u);for(let g=0;g<u;g++)h.data.set(c.subarray(g*d,g*d+l*4),g*l*4);this.rb.buf.unmap(),this.ctx2d.putImageData(h,0,0)}).catch(()=>{}).finally(()=>{this.rb.busy=null}),this.lastDone=this.rb.busy.then(()=>performance.now()),this.lastDone.then(a,a);return}r.queue.submit([i.finish()]),this.lastDone=r.queue.onSubmittedWorkDone().then(()=>performance.now()),this.lastDone.then(a,a)}readbackTarget(){let n=this.canvas.width,t=this.canvas.height;if(!this.rb||this.rb.w!==n||this.rb.h!==t){if(this.rb?.busy)return this.rb.tex;this.rb?.tex.destroy(),this.rb?.buf.destroy();let r=Math.ceil(n*4/256)*256;this.rb={w:n,h:t,stride:r,busy:null,tex:this.device.createTexture({size:[n,t],format:this.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC}),buf:this.device.createBuffer({size:r*t,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ})}}return this.rb.tex}async done(){await this.device.queue.onSubmittedWorkDone(),this.rb?.busy&&await this.rb.busy}destroy(){for(let n of Object.values(this.bufs))n.destroy();if(this.uniform.destroy(),this.rb){this.rb.tex.destroy();try{this.rb.buf.destroy()}catch{}}try{this.ctx?.unconfigure()}catch{}this.bufs={}}};function ax(e,n,t,r){let a=n/e,i=r/t;return a<1&&i>1||a>1&&i<1?1:Math.min(Math.max(i,1/i),Math.max(1/a,a))}function Hs(e){let[n,t]=e.x,[r,a]=e.y,i=Math.max(t-n,a-r),o=(t+n)/2||0,s=(a+r)/2||0;return(!(i>0)||!Number.isFinite(i))&&(i=1),{dX:o,dY:s,ratio:i,graphW:t-n||1,graphH:a-r||1}}function Vh(e,n,t,r,a=30){let i=Math.min(n,t)-2*a,o=ax(n,t,r.graphW,r.graphH),s=i*o/(e.ratio||1),l=-(e.angle||0);return{w:n,h:t,k:s,c:Math.cos(l),s:Math.sin(l),cx:e.x,cy:e.y,ratio:e.ratio||1,norm:r}}function Mi(e,n,t){let r=n-e.cx,a=t-e.cy,i=e.c*r-e.s*a,o=e.s*r+e.c*a;return{x:e.w/2+e.k*i,y:e.h/2-e.k*o}}function Sn(e,n,t){let r=(n-e.w/2)/e.k,a=(e.h/2-t)/e.k;return{x:e.cx+e.c*r+e.s*a,y:e.cy-e.s*r+e.c*a}}var Qn=(e,n,t)=>({x:.5+(n-e.dX)/e.ratio,y:.5+(t-e.dY)/e.ratio}),Ni=(e,n,t)=>({x:e.dX+e.ratio*(n-.5),y:e.dY+e.ratio*(t-.5)}),Xr=e=>1/Math.sqrt(e||1),ix=e=>e<.5?4*e*e*e:1-Math.pow(-2*e+2,3)/2,Fi=class{constructor(){this.x=.5,this.y=.5,this.ratio=1,this.angle=0,this.minRatio=null,this.maxRatio=null,this._l=new Map,this._anim=null,this.enabled=!0}on(n,t){return this._l.has(n)||this._l.set(n,new Set),this._l.get(n).add(t),this}off(n,t){return this._l.get(n)?.delete(t),this}removeListener(n,t){return this.off(n,t)}emit(n,t){for(let r of[...this._l.get(n)||[]])r(t)}getState(){return{x:this.x,y:this.y,ratio:this.ratio,angle:this.angle}}getBoundedRatio(n){return typeof this.minRatio=="number"&&(n=Math.max(n,this.minRatio)),typeof this.maxRatio=="number"&&(n=Math.min(n,this.maxRatio)),n}setState(n={}){if(!this.enabled)return this;let t=this.getState();return Number.isFinite(n.x)&&(this.x=n.x),Number.isFinite(n.y)&&(this.y=n.y),Number.isFinite(n.ratio)&&n.ratio>0&&(this.ratio=this.getBoundedRatio(n.ratio)),Number.isFinite(n.angle)&&(this.angle=n.angle),(t.x!==this.x||t.y!==this.y||t.ratio!==this.ratio||t.angle!==this.angle)&&this.emit("updated",this.getState()),this}updateState(n){return this.setState(n(this.getState()))}isAnimating(){return!!this._anim}animate(n,t={},r){let a=typeof t=="object"&&t?t.duration??150:150;if(this._anim){cancelAnimationFrame(this._anim.raf);let l=this._anim.resolve;this._anim=null,l()}if(!a||typeof requestAnimationFrame!="function")return this.setState(n),r?.(),Promise.resolve();let i=this.getState(),o={...i,...n},s=performance.now();return new Promise(l=>{let u=()=>{let d=Math.min(1,(performance.now()-s)/a),c=ix(d);this.setState({x:i.x+(o.x-i.x)*c,y:i.y+(o.y-i.y)*c,ratio:i.ratio*Math.pow(o.ratio/i.ratio,c),angle:i.angle+(o.angle-i.angle)*c}),d<1?this._anim.raf=requestAnimationFrame(u):(this._anim=null,r?.(),l())};this._anim={raf:requestAnimationFrame(u),resolve:l}})}reset(n){return this.animate({x:.5,y:.5,ratio:1,angle:0},n)}animatedZoom(n={}){let t=typeof n=="number"?n:n.factor||1.5;return this.animate({ratio:this.getBoundedRatio(this.ratio/t)},{duration:n.duration??250})}animatedUnzoom(n={}){let t=typeof n=="number"?n:n.factor||1.5;return this.animate({ratio:this.getBoundedRatio(this.ratio*t)},{duration:n.duration??250})}animatedReset(n){return this.reset(n)}};var zi=new Map,Gi=null,Oi=(e,n,t,r)=>(e&255|(n&255)<<8|(t&255)<<16|(Math.round(r*255)&255)<<24)>>>0;function Yr(e){if(e==null||e==="")return 0;let n=zi.get(e);return n!==void 0||(n=Xh(String(e).trim()),zi.size>5e3&&zi.clear(),zi.set(e,n)),n}function Xh(e){if(e[0]==="#"){let t=e.slice(1);if(t.length===3||t.length===4){let r=[...t].map(a=>parseInt(a+a,16));return Oi(r[0],r[1],r[2],t.length===4?r[3]/255:1)}if(t.length===6||t.length===8)return Oi(parseInt(t.slice(0,2),16),parseInt(t.slice(2,4),16),parseInt(t.slice(4,6),16),t.length===8?parseInt(t.slice(6,8),16)/255:1)}let n=e.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i);if(n){let t=n[4]==null?1:n[4].endsWith("%")?parseFloat(n[4])/100:parseFloat(n[4]);return Oi(+n[1],+n[2],+n[3],Math.max(0,Math.min(1,t)))}if(e==="transparent")return 0;if(typeof document<"u"){Gi||=document.createElement("canvas").getContext("2d"),Gi.fillStyle="#000",Gi.fillStyle=e;let t=Gi.fillStyle;if(t!==e)return Xh(t)}return Oi(102,102,102,1)}var Yh=e=>[e&255,e>>>8&255,e>>>16&255,(e>>>24&255)/255],js=(e,n)=>n>=1||n==null?e:(e&16777215|(Math.round((e>>>24&255)*Math.max(0,n))&255)<<24)>>>0;var Bi=class{build(n,t,r,a=r.length){let i=1/0,o=-1/0,s=1/0,l=-1/0;for(let y=0;y<a;y++){let _=r[y],S=n[_],T=t[_];S<i&&(i=S),S>o&&(o=S),T<s&&(s=T),T>l&&(l=T)}if(!a||!Number.isFinite(i))return this.count=0,this;let u=Math.max(o-i,1e-9),d=Math.max(l-s,1e-9),c=Math.max(1,Math.min(1<<22,Math.ceil(a/2))),h=Math.max(Math.sqrt(u*d/c),Math.max(u,d)/4096,1e-9),g=Math.max(1,Math.ceil(u/h)+1),p=Math.max(1,Math.ceil(d/h)+1),m=new Uint32Array(g*p+1),b=new Uint32Array(a);for(let y=0;y<a;y++){let _=r[y],S=Math.min(p-1,Math.floor((t[_]-s)/h))*g+Math.min(g-1,Math.floor((n[_]-i)/h));b[y]=S,m[S+1]++}for(let y=0;y<g*p;y++)m[y+1]+=m[y];let v=m.slice(0,g*p),x=new Uint32Array(a);for(let y=0;y<a;y++)x[v[b[y]]++]=r[y];return Object.assign(this,{x0:i,y0:s,cs:h,nx:g,ny:p,start:m,items:x,count:a,xs:n,ys:t}),this}query(n,t,r,a){if(!this.count)return;let{x0:i,y0:o,cs:s,nx:l,ny:u,start:d,items:c}=this,h=Math.max(0,Math.floor((n-r-i)/s)),g=Math.min(l-1,Math.floor((n+r-i)/s)),p=Math.max(0,Math.floor((t-r-o)/s)),m=Math.min(u-1,Math.floor((t+r-o)/s));if(!(g<h||m<p))for(let b=p;b<=m;b++)for(let v=h;v<=g;v++){let x=b*l+v;for(let y=d[x];y<d[x+1];y++)a(c[y])}}};var sx={circle:0,square:1,diamond:2,triangle:3},Qt=Object.freeze({isHidden:!1,isHighlighted:!1,isSelected:!1,isHovered:!1,isPath:!1,isDragged:!1}),lx={readback:!1,enableNodeDrag:!0,enableEdgeEvents:!0,labelDensity:.7,labelRenderedSizeThreshold:6,labelGridCellSize:110,labelBudget:80,labelFont:"system-ui, sans-serif",stagePadding:30,zoomingRatio:1.7,doubleClickZoomingRatio:2.2,dragTolerance:3,minEdgePx:.6},ux=new Set(["x","y","placed"]),Kr=class{static async prepare(n){return Hh(n)}constructor(n,t,{device:r,styles:a={},settings:i={},onFail:o=null}={}){if(!r)throw new St("WebGPURenderer needs a device (await WebGPURenderer.prepare() first)","device");this.kind="webgpu",this.graph=n,this.container=t,this.styles=a,this.onFail=o,this.settings={...lx,...i},this.camera=new Fi,this.listeners=new Map,this.nodeStates=new Map,this.edgeStates=new Map,this.customBBox=null,this.killed=!1,this.frameId=0,this.dirty={structure:!0,style:!0,pos:!0,labels:!0,pick:!0},this.stats={renders:0,cpuMs:[],last:0,uploads:0,uploadMs:0,lastUploadMs:0};let s=l=>{let u=document.createElement("canvas");return u.className=l,Object.assign(u.style,{position:"absolute",inset:"0",width:"100%",height:"100%",display:"block"}),t.appendChild(u),u};this.canvas=s("sigma-webgpu gpu-canvas"),this.labelCanvas=s("sigma-mouse gpu-labels"),this.labelCanvas.style.touchAction="none",this.core=new Ii(r,this.canvas,{readback:!!this.settings.readback}),this.core.onError=l=>this.fail(l),this.core.onIdle=()=>{this.pendingRender&&!this.killed&&(this.pendingRender=!1,this.scheduleRender())},this.unlost=jh(l=>this.fail(new St(`WebGPU device lost${l?.reason?` (${l.reason})`:""}: ${l?.message||""}`,"device-lost"))),this.info=r.__info||{},this.grid=new Bi,this.u=new Float32Array(16),this.bindGraph(),this.bindPointer(),this.camera.on("updated",()=>{this.dirty.labels=!0,this.scheduleRender()}),this.resize(),this.process(),this.renderNow()}on(n,t){return this.listeners.has(n)||this.listeners.set(n,new Set),this.listeners.get(n).add(t),this}once(n,t){let r=a=>{this.off(n,r),t(a)};return this.on(n,r)}off(n,t){return this.listeners.get(n)?.delete(t),this}removeListener(n,t){return this.off(n,t)}removeAllListeners(n){return n?this.listeners.delete(n):this.listeners.clear(),this}emit(n,t){for(let r of[...this.listeners.get(n)||[]])try{r(t)}catch(a){console.error(a)}}fail(n){this.killed||this.failed||(this.failed=n,this.emit("fail",n),this.onFail?.(n))}bindGraph(){let n=this.graph,t=this.dirty,r=()=>this.scheduleRender(),a=()=>{t.structure=!0,r()},i=l=>{let u=this.idx?.get(l.key);if(u!==void 0&&l.type==="merge"&&l.data&&Object.keys(l.data).every(d=>ux.has(d))){let d=l.attributes;this.pos[2*u]=d.x,this.pos[2*u+1]=d.y,t.pos=!0,t.pick=!0,t.labels=!0}else{if(u!==void 0&&l.attributes){let d=l.attributes;this.pos[2*u]=Number.isFinite(d.x)?d.x:0,this.pos[2*u+1]=Number.isFinite(d.y)?d.y:0}t.style=!0,t.pos=!0}r()},o=()=>{t.style=!0,r()},s=()=>{t.style=!0,t.pos=!0,t.readPos=!0,r()};this.graphHandlers={nodeAdded:a,nodeDropped:a,edgeAdded:a,edgeDropped:a,cleared:a,edgesCleared:a,nodeAttributesUpdated:i,edgeAttributesUpdated:o,eachNodeAttributesUpdated:s,eachEdgeAttributesUpdated:o};for(let[l,u]of Object.entries(this.graphHandlers))n.on(l,u)}rebuildIndex(){let n=this.graph,t=n.order;this.nodeIds=new Array(t),this.idx=new Map;let r=0;n.forEachNode(s=>{this.nodeIds[r]=s,this.idx.set(s,r),r++});let a=Math.max(16,t);(!this.pos||this.pos.length<2*a)&&(this.pos=new Float32Array(2*a),this.nstyle=new Uint32Array(4*a),this.order=new Uint32Array(a),this.radius=new Float32Array(a),this.hidden=new Uint8Array(a),this.top=new Uint8Array(a));for(let s=0;s<t;s++){let l=n.getNodeAttributes(this.nodeIds[s]);this.pos[2*s]=Number.isFinite(l.x)?l.x:0,this.pos[2*s+1]=Number.isFinite(l.y)?l.y:0}let i=Math.max(16,n.size);(!this.edgeBuf||this.edgeBuf.length<4*i)&&(this.edgeBuf=new Uint32Array(4*i),this.edgeF=new Float32Array(this.edgeBuf.buffer),this.edgeIdsDrawn=new Array(i));let o=[];for(let s=0;s<t;s++)o.push(s);if(t>4e3){let s=new Float64Array(t);for(let l=0;l<t;l++)s[l]=n.degree(this.nodeIds[l]);o.sort((l,u)=>s[u]-s[l]),o.length=4e3}else o.sort((s,l)=>n.degree(this.nodeIds[l])-n.degree(this.nodeIds[s]));this.labelOrder=o;for(let s of this.nodeStates.keys())n.hasNode(s)||this.nodeStates.delete(s);for(let s of this.edgeStates.keys())n.hasEdge(s)||this.edgeStates.delete(s)}getNodeState(n){return this.nodeStates.get(n)||Qt}getEdgeState(n){return this.edgeStates.get(n)||Qt}setNodeState(n,t){let r=this.nodeStates.get(n);return this.nodeStates.set(n,r?Object.assign(r,t):{...Qt,...t}),this.dirty.style=!0,this.scheduleRender(),this}setNodesState(n,t){for(let r of n){let a=this.nodeStates.get(r);a?Object.assign(a,t):this.nodeStates.set(r,{...Qt,...t})}return this.dirty.style=!0,this.scheduleRender(),this}setEdgeState(n,t){return this.setEdgesState([n],t)}setEdgesState(n,t){for(let r of n){let a=this.edgeStates.get(r);a?Object.assign(a,t):this.edgeStates.set(r,{...Qt,...t})}return this.dirty.style=!0,this.scheduleRender(),this}getNodesState(){return this.nodeStates}getGraph(){return this.graph}getContainer(){return this.container}getCamera(){return this.camera}getSetting(n){return this.settings[n]}setSetting(n,t){return this.settings[n]=t,this.dirty.labels=!0,this.scheduleRender(),this}updateSetting(n,t){return this.setSetting(n,t(this.settings[n]))}getSettings(){return{...this.settings}}setCustomBBox(n){return this.customBBox=n?{x:[...n.x],y:[...n.y]}:null,this.dirty.pos=!0,this.scheduleRender(),this}getCustomBBox(){return this.customBBox}getBBox(){return this.extent}getDimensions(){return{width:this.width,height:this.height}}getStagePadding(){return this.settings.stagePadding}process(){let n=this.dirty;if(n.structure&&(this.rebuildIndex(),n.structure=!1,n.style=!0,n.pos=!0,n.upload=!0,n.readPos=!1),n.readPos){let t=this.graph;for(let r=0;r<this.nodeIds.length;r++){let a=t.getNodeAttributes(this.nodeIds[r]);this.pos[2*r]=Number.isFinite(a.x)?a.x:0,this.pos[2*r+1]=Number.isFinite(a.y)?a.y:0}n.readPos=!1,n.pos=!0,n.pick=!0}return n.pos&&this.computeExtent(),n.style&&this.rebuildStyle(),this}computeExtent(){let n=this.nodeIds.length,t=this.pos,r=1/0,a=-1/0,i=1/0,o=-1/0;if(this.customBBox)[r,a]=this.customBBox.x,[i,o]=this.customBBox.y;else for(let s=0;s<n;s++){let l=t[2*s],u=t[2*s+1];l<r&&(r=l),l>a&&(a=l),u<i&&(i=u),u>o&&(o=u)}Number.isFinite(r)||(r=0,a=1,i=0,o=1),this.extent={x:[r,a],y:[i,o]},this.norm=Hs(this.extent)}rebuildStyle(){let n=this.graph,t=this.styles,r=this.nodeIds.length,a=!1;for(let v of this.nodeStates.values())if(v.isHighlighted){a=!0;break}let i=this.graphState={hasHighlighted:a,hasHovered:!!this.hoveredNode},o=this.nstyle,s=this.radius,l=this.hidden,u=this.top,d=0,c=[];for(let v=0;v<r;v++){let x=this.nodeIds[v],y=n.getNodeAttributes(x),_=this.nodeStates.get(x)||Qt;if(_.isHidden||y.hidden){l[v]=1,u[v]=0;continue}l[v]=0;let S=t.nodeSize?t.nodeSize(y,_,i):y.size||10,T=t.nodeOpacity?t.nodeOpacity(y):y.opacity??1,A=js(Yr(t.nodeColor?t.nodeColor(y,_,i):y.color||"#666"),T),w=js(Yr(t.nodeBorder?t.nodeBorder(y,_,i):y.borderColor||y.color||"#666"),T),E=sx[t.nodeShape?t.nodeShape(y):y.shape]??0;s[v]=S,o[4*v]=cx(S),o[4*v+1]=A,o[4*v+2]=w,o[4*v+3]=E;let R=_.isHovered||_.isSelected||_.isHighlighted;u[v]=R?1:0,R?c.push(v):this.order[d++]=v}for(let v of c)this.order[d++]=v;this.orderCount=d;let h=this.edgeBuf,g=this.edgeF,p=this.edgeIdsDrawn,m=0,b=[];n.forEachEdge((v,x,y,_)=>{let S=this.edgeStates.get(v)||Qt;if(S.isHidden||x.hidden)return;let T=this.idx.get(y),A=this.idx.get(_);if(!(T===void 0||A===void 0||l[T]||l[A])){if(S.isHighlighted||S.isPath){b.push([v,x,S,T,A]);return}this.writeEdge(h,g,p,m++,v,x,S,T,A,i)}});for(let[v,x,y,_,S]of b)this.writeEdge(h,g,p,m++,v,x,y,_,S,i);this.edgeCount=m,this.dirty.style=!1,this.dirty.upload=!0,this.dirty.labels=!0,this.dirty.pick=!0}writeEdge(n,t,r,a,i,o,s,l,u,d){let c=this.styles,h=c.edgeSize?c.edgeSize(o,s,d):o.size||1,g=c.edgeDashed?c.edgeDashed(o,s):!!o.dashed;n[4*a]=l,n[4*a+1]=u,n[4*a+2]=Yr(c.edgeColor?c.edgeColor(o,s,d):o.color||"#ccc"),t[4*a+3]=g?-Math.max(h,.001):Math.max(h,.001),r[a]=i}scheduleRender(){return this.killed||this.raf?this:(this.raf=requestAnimationFrame(()=>{this.raf=null,this.renderNow()}),this)}scheduleRefresh(){return this.dirty.style=!0,this.scheduleRender()}refresh(){return this.killed?this:(this.dirty.style=!0,this.dirty.readPos=!0,this.renderNow(),this)}render(){return this.renderNow()}transform(n=this.camera.getState()){return Vh(n,this.width||1,this.height||1,this.norm||Hs({x:[0,1],y:[0,1]}),this.settings.stagePadding)}renderNow(){if(this.killed||this.failed)return this;this.raf&&(cancelAnimationFrame(this.raf),this.raf=null);let n=performance.now();this.emit("beforeRender");try{if(this.process(),this.core.inFlight>=qh)return this.pendingRender=!0,this.stats.skipped=(this.stats.skipped||0)+1,this;let a=this.dirty;if(a.upload){let u=performance.now();this.core.setNodes(this.pos,this.nstyle,this.nodeIds.length),this.core.setOrder(this.order,this.orderCount),this.core.setEdges(this.edgeBuf,this.edgeCount),a.upload=!1,a.pos=!1,this.stats.uploads++,this.stats.lastUploadMs=performance.now()-u,this.stats.uploadMs+=this.stats.lastUploadMs}else a.pos&&(this.core.setPositions(this.pos,this.nodeIds.length),a.pos=!1);let i=this.transform(),o=this.u,s=this.camera;o[0]=this.width,o[1]=this.height,o[2]=s.x,o[3]=s.y,o[4]=i.c,o[5]=i.s,o[6]=i.k,o[7]=Xr(s.ratio),o[8]=this.norm.dX,o[9]=this.norm.dY,o[10]=1/this.norm.ratio,o[11]=2,o[12]=7,o[13]=5,o[14]=this.settings.minEdgePx,o[15]=0;let l=Yh(Yr(this.styles.background?this.styles.background():"#ffffff"));this.core.render(o,[l[0]/255,l[1]/255,l[2]/255,l[3]]),a.labels&&(this.drawLabels(i),a.labels=!1)}catch(a){return this.fail(a),this}this.frameId++;let t=performance.now()-n,r=this.stats;return r.renders++,r.cpuMs.push(t),r.cpuMs.length>120&&r.cpuMs.shift(),r.last=t,this.emit("afterRender"),this}resize(){let n=this.container.getBoundingClientRect(),t=window.devicePixelRatio||1,r=Math.max(1,Math.round(n.width||this.container.clientWidth||1)),a=Math.max(1,Math.round(n.height||this.container.clientHeight||1));return r===this.width&&a===this.height&&t===this.dpr?this:(this.width=r,this.height=a,this.dpr=t,this.core.resize(Math.round(r*t),Math.round(a*t)),this.labelCanvas.width=Math.round(r*t),this.labelCanvas.height=Math.round(a*t),this.dirty.labels=!0,this.scheduleRender(),this)}drawLabels(n){let t=this.graph,r=this.styles,a=this.labelCanvas,i=a.getContext("2d"),o=this.dpr||1;if(i.setTransform(1,0,0,1,0,0),i.clearRect(0,0,a.width,a.height),i.setTransform(o,0,0,o,0,0),!this.nodeIds?.length)return;let s=this.graphState||{hasHighlighted:!1},l=Xr(this.camera.ratio),u=this.width,d=this.height,c=r.labelSize?r.labelSize():14,h=`${c}px ${this.settings.labelFont}`;i.font=h,i.textBaseline="middle";let g=this.settings.labelGridCellSize,p=new Set,m=new Set,b=_=>{let S=Qn(this.norm,this.pos[2*_],this.pos[2*_+1]);return Mi(n,S.x,S.y)},v=(_,S)=>{let T=this.nodeIds[_];if(m.has(T)||this.hidden[_])return!1;let A=t.getNodeAttributes(T),w=this.nodeStates.get(T)||Qt,E=r.labelVisibility?r.labelVisibility(A,w,s):"auto";if(E==="hidden")return!1;let R=r.label?r.label(A):A.label;if(!R)return!1;let L=b(_),k=this.radius[_]*l;if(L.x<-200||L.y<-50||L.x>u+50||L.y>d+50)return!1;if(!S&&E!=="visible"){if(k<this.settings.labelRenderedSizeThreshold)return!1;let I=`${Math.floor(L.x/g)}:${Math.floor(L.y/(g/3))}`;if(p.has(I))return!1;p.add(I)}let P=L.x+k+3,D=L.y;if(w.isHovered){let I=i.measureText(R).width;i.fillStyle=r.backdrop?r.backdrop():"rgba(255,255,255,0.9)",i.beginPath(),i.roundRect?.(P-4,D-c/2-4,I+8,c+8,5),i.fill()}return i.fillStyle=r.labelColor?r.labelColor(A,w,s):"#000",i.fillText(R,P,D),m.add(T),!0};this.hoveredNode!=null&&this.idx.has(this.hoveredNode)&&v(this.idx.get(this.hoveredNode),!0);let x=0;for(let[_,S]of this.nodeStates){if(x>=300)break;(S.isSelected||S.isHighlighted)&&this.idx.has(_)&&v(this.idx.get(_),!0)&&x++}let y=Math.round(this.settings.labelBudget*(this.settings.labelDensity??.7)/.7);for(let _ of this.labelOrder){if(y<=0)break;v(_,!1)&&y--}}graphToFramedGraph(n){return Qn(this.norm,n.x,n.y)}framedGraphToGraph(n){return Ni(this.norm,n.x,n.y)}framedGraphToViewport(n,t={}){return Mi(this.transform(t.cameraState||this.camera.getState()),n.x,n.y)}viewportToFramedGraph(n,t={}){return Sn(this.transform(t.cameraState||this.camera.getState()),n.x,n.y)}graphToViewport(n,t={}){let r=Qn(this.norm,n.x,n.y);return this.framedGraphToViewport(r,t)}viewportToGraph(n,t={}){let r=this.viewportToFramedGraph(n,t);return Ni(this.norm,r.x,r.y)}getGraphToViewportRatio(){return this.transform().k/this.norm.ratio}getNodeDisplayData(n){let t=this.idx?.get(n);if(t===void 0)return;let r=Qn(this.norm,this.pos[2*t],this.pos[2*t+1]);return{x:r.x,y:r.y,size:this.radius[t],color:this.styles.nodeColor?this.styles.nodeColor(this.graph.getNodeAttributes(n),this.getNodeState(n),this.graphState||{}):this.graph.getNodeAttribute(n,"color"),hidden:!!this.hidden[t],label:this.graph.getNodeAttribute(n,"label")}}ensurePick(){if(!this.dirty.pick)return;let n=this.nodeIds.length,t=new Float32Array(n),r=new Float32Array(n);for(let a=0;a<n;a++)t[a]=this.pos[2*a],r[a]=this.pos[2*a+1];this.maxRadius=0;for(let a=0;a<this.orderCount;a++){let i=this.radius[this.order[a]];i>this.maxRadius&&(this.maxRadius=i)}this.grid.build(t,r,this.order,this.orderCount),this.dirty.pick=!1}getNodeAtPosition(n){if(!this.nodeIds?.length)return null;this.process(),this.ensurePick();let t=this.transform(),r=Sn(t,n.x,n.y),a=Ni(this.norm,r.x,r.y),i=t.k/this.norm.ratio,o=Xr(this.camera.ratio),s=(this.maxRadius*o+2)/i,l=null,u=1/0;return this.grid.query(a.x,a.y,s,d=>{let c=(this.pos[2*d]-a.x)*i,h=(this.pos[2*d+1]-a.y)*i,g=Math.hypot(c,h),p=this.radius[d]*o+1;if(g>p)return;let m=g-(this.top[d]?1e6:0)-d*1e-9;m<u&&(u=m,l=d)}),l==null?null:this.nodeIds[l]}getEdgeAtPosition(n){if(!this.edgeCount||this.edgeCount>3e5)return null;let t=this.transform(),r=Xr(this.camera.ratio),a=null,i=1/0,o=s=>{let l=Qn(this.norm,this.pos[2*s],this.pos[2*s+1]);return Mi(t,l.x,l.y)};for(let s=0;s<this.edgeCount;s++){let l=o(this.edgeBuf[4*s]),u=o(this.edgeBuf[4*s+1]),d=u.x-l.x,c=u.y-l.y,h=d*d+c*c,g=h?((n.x-l.x)*d+(n.y-l.y)*c)/h:0;g=Math.max(0,Math.min(1,g));let p=Math.hypot(n.x-l.x-g*d,n.y-l.y-g*c),m=Math.max(3,Math.abs(this.edgeF[4*s+3])*r/2+2);p<=m&&p<i&&(i=p,a=this.edgeIdsDrawn[s])}return a}bindPointer(){let n=this.labelCanvas,t=this.settings,r=d=>{let c=n.getBoundingClientRect();return{x:d.clientX-c.left,y:d.clientY-c.top}},a=(d,c)=>{let h={x:c.x,y:c.y,original:d,sigmaDefaultPrevented:!1,preventSigmaDefault(){h.sigmaDefaultPrevented=!0}};return h},i=null,o=null,s=null,l=d=>{if(d!==this.hoveredNode){if(this.hoveredNode!=null){let c=this.hoveredNode;this.hoveredNode=null,this.graph.hasNode(c)&&this.setNodeState(c,{isHovered:!1}),this.emit("leaveNode",{node:c})}d!=null&&(this.hoveredNode=d,this.setNodeState(d,{isHovered:!0}),this.emit("enterNode",{node:d})),n.style.cursor=d!=null?"pointer":i?.panning?"grabbing":""}},u={pointerdown:d=>{if(d.button!==0)return;let c=r(d),h=this.getNodeAtPosition(c);i={p:c,start:c,node:h,cam:this.camera.getState(),moved:!1,panning:!h,dragging:!1,id:d.pointerId},n.setPointerCapture?.(d.pointerId),this.emit(h?"downNode":"downStage",{node:h,event:a(d,c)})},pointermove:d=>{let c=r(d);if(i){let h=Math.hypot(c.x-i.start.x,c.y-i.start.y);if(!i.moved&&h<t.dragTolerance)return;if(i.moved=!0,i.node&&t.enableNodeDrag){i.dragging||(i.dragging=!0,this.setNodeState(i.node,{isDragged:!0}),this.emit("nodeDragStart",{node:i.node,event:a(d,c)}));let g=this.viewportToGraph(c);this.graph.mergeNodeAttributes(i.node,{x:g.x,y:g.y}),this.emit("nodeDrag",{node:i.node,event:a(d,c)})}else if(i.panning||!t.enableNodeDrag){let g=this.transform(i.cam),p=Sn(g,i.start.x,i.start.y),m=Sn(g,c.x,c.y);this.camera.setState({x:i.cam.x-(m.x-p.x),y:i.cam.y-(m.y-p.y)}),n.style.cursor="grabbing"}return}s=c,!o&&(o=requestAnimationFrame(()=>{o=null,!i&&s&&!this.killed&&l(this.getNodeAtPosition(s))}))},pointerup:d=>{if(!i)return;let c=i;i=null;let h=r(d);if(n.releasePointerCapture?.(c.id),n.style.cursor=this.hoveredNode!=null?"pointer":"",c.dragging){this.setNodeState(c.node,{isDragged:!1}),this.emit("nodeDragEnd",{node:c.node,allDraggedNodes:[c.node],event:a(d,h)});return}c.moved||(c.node?this.emit("clickNode",{node:c.node,event:a(d,h)}):this.emit("clickStage",{event:a(d,h)}))},pointerleave:()=>{i||l(null),this.emit("leaveStage",{})},dblclick:d=>{let c=r(d),h=this.getNodeAtPosition(c),g=a(d,c);this.emit(h?"doubleClickNode":"doubleClickStage",{node:h,event:g}),g.sigmaDefaultPrevented||this.zoomAround(c,t.doubleClickZoomingRatio,250)},contextmenu:d=>{d.preventDefault();let c=r(d),h=this.getNodeAtPosition(c),g=a(d,c);if(h)return this.emit("rightClickNode",{node:h,event:g});let p=this.settings.enableEdgeEvents!==!1?this.getEdgeAtPosition(c):null;if(p)return this.emit("rightClickEdge",{edge:p,event:g});this.emit("rightClickStage",{event:g})},wheel:d=>{d.preventDefault();let c=r(d),h=Math.pow(t.zoomingRatio,Math.max(-1,Math.min(1,-d.deltaY/(d.deltaMode===1?3:100))));this.zoomAround(c,h,0),this.emit("wheelStage",{event:a(d,c)})}};this.domHandlers=u;for(let[d,c]of Object.entries(u))n.addEventListener(d,c,d==="wheel"?{passive:!1}:void 0)}zoomAround(n,t,r=0){let a=this.camera,i=a.getState(),o=a.getBoundedRatio(i.ratio/t),s=Sn(this.transform(i),n.x,n.y),l={...i,ratio:o},u=Sn(this.transform(l),n.x,n.y),d={x:i.x+(s.x-u.x),y:i.y+(s.y-u.y),ratio:o};return r?a.animate(d,{duration:r}):a.setState(d)}kill(){if(!this.killed){this.killed=!0,this.raf&&cancelAnimationFrame(this.raf);for(let[n,t]of Object.entries(this.graphHandlers||{}))this.graph.removeListener(n,t);for(let[n,t]of Object.entries(this.domHandlers||{}))this.labelCanvas.removeEventListener(n,t);this.unlost?.(),this.core.destroy(),this.canvas.remove(),this.labelCanvas.remove(),this.emit("kill"),this.listeners.clear()}}perf(){let n=[...this.stats.cpuMs].sort((t,r)=>t-r);return{renders:this.stats.renders,cpuMedianMs:n.length?n[Math.floor(n.length/2)]:0,lastUploadMs:this.stats.lastUploadMs,nodes:this.orderCount||0,edges:this.edgeCount||0,adapter:this.info}}},Kh=new Float32Array(1),dx=new Uint32Array(Kh.buffer);function cx(e){return Kh[0]=e,dx[0]}var Qh=["auto","webgpu","webgl"],Jh="explore.renderer",ef={webgpu:"WebGPU",webgl:"WebGL"};function Jn(e){let n=String(e??"").trim().toLowerCase();return Qh.includes(n)?n:"auto"}function Zh({pref:e="auto",hasApi:n=!1,adapter:t=null,error:r=null}={}){if(e=Jn(e),e==="webgl")return{renderer:"webgl",pref:e,fallback:!1,note:null};if(!!n&&!!t)return{renderer:"webgpu",pref:e,fallback:!1,note:null};let i=n?r?`WebGPU adapter request failed: ${r}`:"no WebGPU adapter is available":"this browser has no WebGPU (navigator.gpu is missing)";return{renderer:"webgl",pref:e,fallback:e==="webgpu",note:e==="webgpu"?`WebGPU unavailable (${i}); using WebGL.`:null}}async function hx(e=globalThis.navigator,{timeoutMs:n=4e3}={}){let t=e?.gpu;if(!t||typeof t.requestAdapter!="function")return{hasApi:!1,adapter:null,error:null};try{return{hasApi:!0,adapter:await Promise.race([t.requestAdapter({powerPreference:"high-performance"}),new Promise((a,i)=>setTimeout(()=>i(new Error("timed out")),n))])||null,error:null}}catch(r){return{hasApi:!0,adapter:null,error:String(r?.message||r)}}}async function tf(e,n=globalThis.navigator,t){if(e=Jn(e),e==="webgl")return{...Zh({pref:e}),adapter:null};let r=await hx(n,t);return{...Zh({pref:e,...r}),adapter:r.adapter}}function Wi(e,n){return{renderer:"webgl",pref:Jn(e),fallback:!0,note:`WebGPU failed to start (${String(n?.message||n||"unknown error")}); using WebGL.`}}function nf(e=globalThis.localStorage,n=null){if(n!=null&&Qh.includes(String(n).toLowerCase()))return Jn(n);try{return Jn(e?.getItem(Jh))}catch{return"auto"}}function rf(e,n=globalThis.localStorage){let t=Jn(e);try{n?.setItem(Jh,t)}catch{}return t}var _t=e=>String(e??"").replace(/[&<>"']/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[n]),fx=e=>_t(e).replace(/&lt;mark&gt;/g,"<mark>").replace(/&lt;\/mark&gt;/g,"</mark>"),gx=e=>{if(!e)return"never";let n=Math.round((Date.now()-e)/1e3);return n<60?`${n}s ago`:n<3600?`${Math.round(n/60)} min ago`:new Date(e).toLocaleString()},af={healthy:"Index healthy",stale:"Index catching up",offline:"Search index offline",none:"Built-in search (no index set up)"};function of({api:e,focus:n,mapView:t,types:r=()=>[]}){let a=document.querySelector("header");if(!a||document.getElementById("ix"))return;let i=document.createElement("div");i.id="ix",i.className="ix",i.innerHTML=`<button id="ix-open" class="ix-open" title="Search the index: typo-tolerant, grouped by type (Ctrl+K)" aria-expanded="false" aria-controls="ix-panel">\u{1F50E}<span id="ix-dot" class="ix-dot none"></span></button>
    <div id="ix-panel" class="ix-pop ix-panel" hidden><div class="ix-row"><input id="ix-q" type="search" placeholder="Search index (typos ok)\u2026" aria-label="Search the index" autocomplete="off"><button id="ix-filters-btn" title="Filter by type, time and map view" aria-expanded="false">Filters</button></div>
    <div id="ix-filters" class="ix-filters" hidden><label>Type <select id="ix-type"><option value="">all types</option></select></label>
      <label>From <input id="ix-from" type="datetime-local"></label><label>To <input id="ix-to" type="datetime-local"></label>
      <label><input id="ix-near" type="checkbox"> Near map view (only things inside the map)</label></div><div id="ix-status" class="muted small"></div>
    <div id="ix-results" class="ix-results" hidden role="listbox" aria-label="Search results"></div></div>`;let o=document.getElementById("search-info");o?o.after(i):a.appendChild(i);let s=m=>i.querySelector(m),l=null,u=null,d=0;async function c(){try{let m=await e("/api/explore/search/status");s("#ix-dot").className=`ix-dot ${m.index}`,s("#ix-dot").title=af[m.index]||m.index,s("#ix-status").innerHTML=`<b>${_t(af[m.index]||m.index)}</b>${m.configured?` \xB7 ${(m.docs??0).toLocaleString()} docs \xB7 last sync ${gx(m.lastSync)}${m.waiting?` \xB7 ${m.waiting} waiting`:""}`:" \xB7 add an OpenSearch output under Send data out"}`}catch{s("#ix-dot").className="ix-dot offline"}}function h(){let m=s("#ix-type"),b=m.value,v=r();m.innerHTML='<option value="">all types</option>'+v.map(x=>`<option ${x===b?"selected":""}>${_t(x)}</option>`).join("")}async function g(){let m=s("#ix-q").value.trim(),b={q:m,size:30};if(s("#ix-type").value&&(b.types=[s("#ix-type").value]),s("#ix-from").value||s("#ix-to").value){let _=S=>S?new Date(S).toISOString():null;b.time={from:_(s("#ix-from").value),to:_(s("#ix-to").value)}}let v=t?.();if(s("#ix-near").checked&&v?.map){let _=v.map.getBounds();b.geo={bbox:[_.getWest(),_.getSouth(),_.getEast(),_.getNorth()]}}if(!m&&!b.geo&&!b.time){s("#ix-results").hidden=!0;return}let x=++d,y;try{y=await e("/api/explore/search",b)}catch(_){s("#ix-results").innerHTML=`<div class="ix-msg err">${_t(_.message)}</div>`,s("#ix-results").hidden=!1;return}if(x===d){l=y,s("#ix-dot").className=`ix-dot ${y.index}`,s("#ix-results").innerHTML=(y.offline||y.index==="offline"?'<div class="ix-msg warn" id="ix-offline">\u26A0 Search index offline: showing the built-in search (still filtered by your access rules).</div>':"")+(y.groups.length?y.groups.map(_=>`<div class="ix-group"><div class="ix-gh">${_t(_.type)} <span class="muted">${_.count}</span></div>${_.results.map(S=>`<button class="ix-hit" role="option" data-id="${_t(S.exploreId)}" title="Show in the graph${S.geo?" and on the map":""}"><b>${_t(S.name)}</b>${S.geo?' <span class="ix-pin" title="Has a location">\u{1F4CD}</span>':""}${S.time?` <span class="muted small">${_t(S.time.slice(0,16).replace("T"," "))}</span>`:""}
          ${(S.highlights||[]).slice(0,2).map(T=>`<div class="ix-frag"><span class="muted">${_t(T.field)}:</span> ${fx(T.fragments[0])}</div>`).join("")}</button>`).join("")}</div>`).join(""):`<div class="ix-msg">No matches${y.note?` \xB7 ${_t(y.note)}`:""}.</div>`)+`<div class="ix-foot muted small">${y.total} result${y.total===1?"":"s"}${y.indexed>y.total?` (about ${y.indexed.toLocaleString()} matches in the index; narrow the search to see others)`:""} \xB7 ${y.engine==="opensearch"?"OpenSearch":"built-in search"} \xB7 ${y.ms} ms</div>`,s("#ix-results").hidden=!1;for(let _ of s("#ix-results").querySelectorAll(".ix-hit"))_.onclick=()=>{let S=l.results.find(T=>T.exploreId===_.dataset.id);p(!1),n(_.dataset.id,S)}}}s("#ix-q").addEventListener("input",()=>{clearTimeout(u),u=setTimeout(g,250)}),s("#ix-q").addEventListener("keydown",m=>{m.key==="Enter"&&(m.preventDefault(),m.stopPropagation(),clearTimeout(u),g()),m.key==="Escape"&&p(!1)}),s("#ix-q").addEventListener("focus",()=>{l&&s("#ix-q").value&&(s("#ix-results").hidden=!1)});let p=(m=s("#ix-panel").hidden)=>{s("#ix-panel").hidden=!m,s("#ix-open").setAttribute("aria-expanded",String(m)),m&&(c(),s("#ix-q").focus())};s("#ix-open").onclick=()=>p(),document.addEventListener("keydown",m=>{(m.ctrlKey||m.metaKey)&&m.key.toLowerCase()==="k"&&(m.preventDefault(),p(!0))}),s("#ix-filters-btn").onclick=()=>{let m=s("#ix-filters");m.hidden=!m.hidden,s("#ix-filters-btn").setAttribute("aria-expanded",String(!m.hidden)),m.hidden||h()};for(let m of["#ix-type","#ix-from","#ix-to","#ix-near"])s(m).addEventListener("change",g);return document.addEventListener("click",m=>{i.contains(m.target)||p(!1)}),window.addEventListener("message",m=>{m.origin===location.origin&&m.data?.type==="sg-focus"&&m.data.id&&n(m.data.id,m.data)}),window.__explore&&(window.__explore.indexSearch={open:p,run:g}),c(),setInterval(c,15e3),{run:g,status:c,open:p}}var N=e=>document.querySelector(e),ve=async(e,n)=>{let t=await fetch(e,n===void 0?{}:{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(n)});if(!t.ok)throw new Error((await t.json().catch(()=>({}))).error||t.statusText);return t.json()},me=new URLSearchParams(location.search),f={sizeScale:1,theme:localStorage.getItem("explore.theme")||me.get("theme")||"dark",styleConfig:null,style:null,layout:{...bs,...JSON.parse(localStorage.getItem("explore.layout")||"{}")},pinned:new Set,selected:new Set,hovered:null,hiddenTypes:new Set,collapsed:new Map,timeCut:null,live:!0,sessionId:null,queue:[],newNodes:new Set,pathIds:null,metrics:{fps:0,frameMs:[],deltaApplyMs:[],lastLayoutMs:0,layoutRuns:0,worker:!0,degraded:!1},undo:[],lag:{},pm:{enabled:!1,size:!0,alerts:!0,metrics:{},alertIds:new Set,polls:0},hiddenEdgeTypes:new Set,where:[],neighborhood:null,hideIsolated:!1,nbSet:null,styleUrl:null,currentView:null,presenting:!1,present:null,map:{mode:["map","split"].includes(me.get("mode"))?me.get("mode"):"graph",view:null,loading:null,config:null,grid:{kind:"none",resolution:3},heat:!1,links:!0,points:!0,cluster:me.get("mapcluster")==="1",dirty:!0,hlDirty:!0,geo:new Map,heatData:null,timer:null},er:{enabled:!1,view:me.get("er")||"all",possible:!0,recEntity:new Map,proj:new Set,dirty:!0,token:0}},B=new de({type:"directed",multi:!0,allowSelfLoops:!0}),ir=new gi(B,{onNodeAdded:e=>{f.newNodes.add(e.id)},onItemChanged:e=>{f.dirtyStyle.add(e.id)}});f.dirtyStyle=new Set;async function yf(){let e=me.get("style"),n=e?null:localStorage.getItem("explore.style");f.styleConfig=n?JSON.parse(n):await ve(e||"/explore/style-config.v1.json"),f.styleUrl=n?null:e||"/explore/style-config.v1.json",_n(f.styleConfig,!1)}function _n(e,n=!0){f.style=Cc(e,{theme:f.theme}),f.style.symbols&&oa.configure({size:f.style.symbols.size,defaultSet:f.style.symbols.defaultSet}),$&&!!f.style.symbols!==bf&&($.kill(),$=null,Xi(),f.fieldLevel=0,we(),it()),f.styleConfig=e,n&&(localStorage.setItem("explore.style",JSON.stringify(e)),f.styleUrl=null),N("#style-warnings").textContent=f.style.warnings.length?f.style.warnings.join(`
`):"",N("#style-version").textContent=`style v${e?.version??"?"}`,document.documentElement.dataset.theme=f.theme;let t=f.style.colors;for(let[r,a]of Object.entries(t))document.documentElement.style.setProperty(`--${r}`,a);ia()}var px=(e,n)=>e.length>n?e.slice(0,n-1)+"\u2026":e;function Ze(e){if(!B.hasNode(e))return;let n=B.getNodeAttribute(e,"item"),t=f.style.nodeStyle(n),r=f.pinned.has(e),a=f.pm.enabled?f.pm.metrics[e]:null,i=a?.alert&&f.pm.alerts,o=a&&f.pm.size?t.size*Math.min(3,1+.35*Math.log2(1+a.degree)):t.size,s=[...t.badges||[],...i?["\u26A0"]:[]];n.type==="Entity"&&!t.symbol&&n.properties?.recordCount>1&&s.push(`\xD7${n.properties.recordCount}`);let l=t.symbol?oa.get(t.symbol):null,u=px(Wr(n),t.labelMaxLength||28);B.mergeNodeAttributes(e,{size:l?o*1.45:o,color:t.color,shape:l?"square":t.renderShape,image:l?l.image:null,imageDim:l?l.imageDim:null,symbol:!!l,symKey:t.symbol&&!l?t.symbol.key:null,symId:t.symbol?t.symbol.key:null,label:(f.style.symbols?Tc(n,u,f.style.symbols,f.fieldLevel||0):u)+(s.length?" "+s.join(""):""),borderColor:r?f.style.colors.hover:i?a.alert.severity==="high"?"#e5484d":"#f5a524":t.borderWidth>0&&t.borderColor?t.borderColor:t.color,opacity:t.opacity,labelShow:t.labelVisible,streamDegree:a?a.degree:null,streamAlert:i?a.alert.alertId:null}),f.enc&&(f.enc.size||f.enc.color)&&Cs(e)}function aa(e){if(!B.hasEdge(e))return;let n=B.getEdgeAttribute(e,"item"),t=f.style.linkStyle(n);B.mergeEdgeAttributes(e,{size:t.width,color:t.color,head:t.arrow==="to"||t.arrow==="both"?"arrow":"none",tail:t.arrow==="both"?"arrow":"none",dashed:t.dash==="dashed"||t.dash==="dotted",label:n.label||n.type}),f.enc?.edge&&Ls(e)}function ia(){f.style&&(B.forEachNode(Ze),B.forEachEdge(aa),$?.refresh(),Yi(),f.map.dirty=!0)}var $=null,bf=!1,sf="rgba(0,0,0,0)",qs=null,Vs=new Set,oa=new fi({onReady:e=>{Vs.add(e),!qs&&(qs=requestAnimationFrame(()=>{qs=null;let n=new Set(Vs);Vs.clear(),B.forEachNode((t,r)=>{r.symKey&&n.has(r.symKey)&&Ze(t)}),$?.refresh(),Yi(),f.presenting&&fl(),f.map.dirty=!0,f.map.view?.refreshSymbols()}))}}),xf=e=>Math.max(.35,Math.min(1,Math.sqrt(1500/Math.max(1,e))));f.rnd={pref:"auto",active:"webgl",note:null,device:null,adapter:null,drawMs:[],t0:0};var Mt=()=>f.style.colors,lf=(e,n)=>n.hasHighlighted&&!e.isHighlighted&&f.style.settings.highlight.dimOthers,mx={nodeSize:(e,n)=>(e.size||6)*f.sizeScale*(n.isHovered?1.35:n.isSelected?1.2:1),nodeColor:(e,n,t)=>lf(n,t)?Mt().dim:e.color,nodeBorder:(e,n,t)=>n.isSelected?Mt().select:lf(n,t)?Mt().dim:e.borderColor||e.color,nodeShape:e=>e.shape||"circle",nodeOpacity:e=>e.opacity??1,label:e=>e.label,labelSize:()=>f.presenting?20:14,labelColor:(e,n,t)=>t.hasHighlighted&&!n.isHighlighted?Mt().muted:Mt().text,labelVisibility:(e,n,t)=>n.isHovered||n.isSelected||t.hasHighlighted&&n.isHighlighted?"visible":e.labelShow==="never"?"hidden":e.labelShow==="always"?"visible":"auto",edgeSize:(e,n)=>(e.size||1)*(n.isHighlighted||n.isPath?2:1),edgeColor:(e,n,t)=>n.isPath?Mt().hover:t.hasHighlighted&&!n.isHighlighted?Mt().dim:e.color,edgeDashed:(e,n)=>!!e.dashed&&!n.isPath,background:()=>Mt().background,backdrop:()=>Mt().panel};async function Sf(e=f.rnd.pref){f.rnd.pref=e;let n=await tf(e);if(f.rnd.note=n.note,f.rnd.active=n.renderer,n.renderer==="webgpu")try{f.rnd.device=await Kr.prepare(n.adapter)}catch(t){let r=Wi(e,t);f.rnd.active=r.renderer,f.rnd.note=r.note,f.rnd.device=null}return f.rnd.active}function vx(e){if(f.rnd.active!=="webgpu")return;let n=Wi(f.rnd.pref,e);f.rnd.note=n.note,f.rnd.device=null,console.warn(n.note),setTimeout(()=>_f("webgl"),0)}function _f(e){let n=$?.getCamera().getState();$&&($.kill(),$=null),f.rnd.active=e,Xi(),we(),it(),n&&$.getCamera().setState(n),$.refresh(),il(!0)}async function Tf(e){e=rf(e);let n=await Sf(e);return _f(n),f.rnd}function il(e=!1){let n=N("#renderer-status");if(!n)return;let t=f.metrics.fps,r=f.metrics.frameMs.slice(-30),a=r.length?r.reduce((u,d)=>u+d,0)/r.length:0,i=f.rnd.drawMs.slice(-30),o=i.length?i.reduce((u,d)=>u+d,0)/i.length:0,s=f.rnd.note?" (fallback)":"";n.textContent=`${ef[f.rnd.active]}${s} \xB7 ${t} fps \xB7 ${a.toFixed(1)} ms`,n.title=`Frame time ${a.toFixed(1)} ms (between animation frames), draw ${o.toFixed(2)} ms (CPU time inside the renderer)
`+(f.rnd.note?f.rnd.note+`
`:"")+(f.rnd.active==="webgpu"&&$?.info?`Adapter: ${[$.info.vendor,$.info.architecture,$.info.description].filter(Boolean).join(" \xB7 ")||"unknown"}${$.info.isFallbackAdapter?" (software fallback)":""}`:"sigma.js on WebGL"),n.classList.toggle("warn",!!f.rnd.note),document.body.dataset.renderer=f.rnd.active;let l=N("#renderer-kind");l&&l.value!==f.rnd.pref&&(l.value=f.rnd.pref),e&&f.rnd.note&&oe(f.rnd.note)}function yx(){let e=N("#renderer-kind");e&&(e.value=f.rnd.pref,e.onchange=()=>Tf(e.value).catch(n=>oe("Renderer: "+n.message)))}function Xi(){let e=bf=!!f.style?.symbols;if(f.rnd.active==="webgpu"&&f.rnd.device)try{$=new Kr(B,N("#canvas"),{device:f.rnd.device,styles:mx,onFail:vx,settings:{readback:me.get("gpuReadback")==="1",enableNodeDrag:!0,labelRenderedSizeThreshold:6,labelDensity:f.presenting?.35:.7,enableEdgeEvents:B.size<=3e5}})}catch(n){let t=Wi(f.rnd.pref,n);f.rnd.active="webgl",f.rnd.note=t.note,f.rnd.device=null,$=null,console.warn(t.note)}else f.rnd.active==="webgpu"&&(f.rnd.active="webgl");$||bx(e),$.on("beforeRender",()=>{f.rnd.t0=performance.now()}),$.on("afterRender",()=>{f.rnd.drawMs.push(performance.now()-f.rnd.t0),f.rnd.drawMs.length>120&&f.rnd.drawMs.shift()}),xx()}function bx(e){let n=()=>f.style.colors,t=(r,a,i)=>a.isPath?n().hover:i.hasHighlighted&&!a.isHighlighted?n().dim:r.color;$=new Hd(B,N("#canvas"),{primitives:{nodes:{shapes:[Ot(),Xd({cornerRadius:.15}),Kd(),Yd()],layers:[ac({borders:[{size:2,color:{attribute:"borderColor",default:"#000"},mode:"pixels"},{size:0,color:{attribute:"color"},fill:!0}]}),...e?[gc({drawingMode:"image",imageAttribute:"image",padding:0,textureManagerOptions:{size:{mode:"force",value:f.style.symbols.size},objectFit:"contain"}})]:[]]},edges:{paths:[br(),xr(),Qd()],extremities:[Jd()],layers:[Zd({dashSize:{value:7,mode:"pixels"},gapSize:{value:5,mode:"pixels"},gapColor:{attribute:"gapColor"}})]}},customNodeState:{isSelected:!1,isPath:!1},customEdgeState:{isPath:!1},styles:{nodes:{x:{attribute:"x"},y:{attribute:"y"},shape:{attribute:"shape",defaultValue:"circle"},size:(r,a)=>(r.size||6)*f.sizeScale*(a.isHovered?1.35:a.isSelected?1.2:1),color:(r,a,i)=>r.symbol?sf:i.hasHighlighted&&!a.isHighlighted&&f.style.settings.highlight.dimOthers?n().dim:r.color,borderColor:(r,a,i)=>a.isSelected?n().select:r.symbol?sf:i.hasHighlighted&&!a.isHighlighted&&f.style.settings.highlight.dimOthers?n().dim:r.borderColor||r.color,...e?{image:(r,a,i)=>r.symbol?i.hasHighlighted&&!a.isHighlighted&&f.style.settings.highlight.dimOthers?r.imageDim:r.image:null}:{},label:{attribute:"label"},labelSize:()=>f.presenting?20:14,labelColor:(r,a,i)=>i.hasHighlighted&&!a.isHighlighted?n().muted:n().text,labelVisibility:(r,a,i)=>a.isHidden?"hidden":a.isHovered||a.isSelected||i.hasHighlighted&&a.isHighlighted?"visible":r.labelShow==="never"?"hidden":r.labelShow==="always"?"visible":"auto",visibility:{whenState:"isHidden",then:"hidden",else:"visible"},depth:(r,a)=>a.isHovered||a.isSelected||a.isHighlighted?"topNodes":"nodes",backdropVisibility:(r,a)=>a.isHovered?"visible":"hidden",backdropColor:()=>n().panel,backdropShadowColor:()=>n().hover,backdropShadowBlur:14,backdropPadding:5,opacity:{attribute:"opacity",defaultValue:1}},edges:{size:(r,a)=>(r.size||1)*(a.isHighlighted||a.isPath?2:1),color:t,gapColor:(r,a,i)=>r.dashed&&!a.isPath?"rgba(0,0,0,0)":t(r,a,i),head:{attribute:"head",defaultValue:"none"},tail:{attribute:"tail",defaultValue:"none"},parallelPath:"curved",visibility:{whenState:"isHidden",then:"hidden",else:"visible"},depth:(r,a)=>a.isHighlighted||a.isPath?"topEdges":"edges"},stage:{background:()=>n().background}},settings:{enableNodeDrag:!0,enableEdgeEvents:B.size<=5e4,hideEdgesOnMove:!1,labelRenderedSizeThreshold:6,labelDensity:.7,zoomToSizeRatioFunction:r=>Math.sqrt(r),itemSizesReference:"screen",autoRescale:!0}}),e&&$.getCamera().on("updated",r=>{let a=_c(f.style.symbols,r.ratio);a!==(f.fieldLevel||0)&&(f.fieldLevel=a,B.forEachNode(Ze))});{let r=null;$.getCamera().on("updated",()=>{B.size<=5e3||B.size>5e4||($.getSetting("enableEdgeEvents")&&$.setSetting("enableEdgeEvents",!1),clearTimeout(r),r=setTimeout(()=>$.setSetting("enableEdgeEvents",!0),250))})}}function xx(){$.on("enterNode",({node:n})=>{f.hovered=n}),$.on("leaveNode",()=>{f.hovered=null}),$.on("clickNode",({node:n,event:t})=>Tn(n,t?.original?.shiftKey||t?.original?.metaKey||t?.original?.ctrlKey)),$.on("doubleClickNode",({node:n,event:t})=>{t?.preventSigmaDefault?.(),Hi([n])}),$.on("clickStage",({event:n})=>{f.scale&&Gs(n)||nr()});let e=n=>{n?.original?.preventDefault?.(),n?.preventSigmaDefault?.();let t=N("main").getBoundingClientRect();return[n.original.clientX-t.left,n.original.clientY-t.top]};$.on("rightClickNode",({node:n,event:t})=>{let[r,a]=e(t);Fs(n,r,a)}),$.on("rightClickEdge",({edge:n,event:t})=>{let[r,a]=e(t);Ms(n,r,a)}),$.on("rightClickStage",({event:n})=>{let[t,r]=e(n);Ns(t,r)}),$.on("nodeDragStart",({node:n})=>{Ax(n)}),$.on("nodeDragEnd",({allDraggedNodes:n})=>{if(N("#pin-on-drag").checked)for(let t of n)Jr(t,!0);f.scale&&Pi()}),f.scale&&Di.rendererChanged()}function it(){$.setNodesState(B.nodes(),{isHighlighted:!1,isSelected:!1,isPath:!1}),$.setEdgesState(B.edges(),{isHighlighted:!1,isPath:!1});let e=new Set,n=new Set;if(f.pathIds){for(let r of f.pathIds.nodeIds)B.hasNode(r)&&e.add(r);for(let r of f.pathIds.linkIds)B.hasEdge(r)&&(n.add(r),$.setEdgeState(r,{isPath:!0}))}for(let r of f.selected){if(!B.hasNode(r))continue;let a=us(B,r);a.nodes.forEach(i=>e.add(i)),a.links.forEach(i=>n.add(i))}e.size&&$.setNodesState([...e],{isHighlighted:!0}),n.size&&$.setEdgesState([...n],{isHighlighted:!0});let t=[...f.selected].filter(r=>B.hasNode(r));t.length&&$.setNodesState(t,{isSelected:!0}),f.hlSets={nodes:e,edges:n},f.map.hlDirty=!0,Cx(),f.core&&Kn()}function Tn(e,n=!1){n||f.selected.clear(),f.selected.has(e)&&n?f.selected.delete(e):f.selected.add(e),f.pathIds=null,it()}function nr(){f.selected.clear(),f.pathIds=null,it()}function Ef(){if(B.order>2e4)return oe("Select all is capped at 20,000 visible nodes");f.selected=new Set(B.filterNodes(e=>!$.getNodeState(e).isHidden)),it()}function ol(e){let n=Date.parse(e.eventTime||e.updatedAt);return Number.isNaN(n)?null:n}function Sx(e){let n=B.getNodeAttribute(e,"item");if(f.scale?.hidden.has(e)||f.hiddenTypes.has(n.type)||f.manualHidden?.has(e)||f.core?.isolate&&!f.core.isolate.has(e))return!0;if(f.er.view!=="all"){let t=n.type==="Entity"&&String(e).startsWith("er:");if(f.er.view==="records"?t:!t&&f.er.recEntity.has(e))return!0}if(f.where.length&&!f.where.every(t=>_x(t,n))||f.nbSet&&!f.nbSet.has(e))return!0;for(let t of f.collapsed.values())if(t.has(e))return!0;if(f.timeCut!=null){let t=ol(n);if(t!=null&&t>f.timeCut)return!0}return!1}var _x=Uh;function Tx(){let e=f.neighborhood;if(!e){f.nbSet=null;return}let n=new Set(e.ids.filter(r=>B.hasNode(r))),t=[...n];for(let r=0;r<(e.depth??1);r++){let a=[];for(let i of t)B.forEachEdge(i,(o,s,l,u)=>{let d=s.item.type;if(f.hiddenEdgeTypes.has(d)||e.linkTypes&&!e.linkTypes.includes(d))return;let c=l===i?u:l;n.has(c)||(n.add(c),a.push(c))});t=a}f.nbSet=n}function we(){Tx();let e=[],n=[];B.forEachNode(a=>(Sx(a)?e:n).push(a)),e.length&&$.setNodesState(e,{isHidden:!0}),n.length&&$.setNodesState(n,{isHidden:!1});let t=[],r=[];if(B.forEachEdge((a,i,o,s)=>{let l=i.item;(f.timeCut!=null&&(ol(l)??0)>f.timeCut||$.getNodeState(o).isHidden||$.getNodeState(s).isHidden||f.hiddenEdgeTypes?.has(l.type)||f.core?.isolateLinks&&!f.core.isolateLinks.has(a)||!f.er.possible&&l.type==="POSSIBLY_SAME"?t:r).push(a)}),t.length&&$.setEdgesState(t,{isHidden:!0}),r.length&&$.setEdgesState(r,{isHidden:!1}),f.hideIsolated){let a=new Map;for(let o of r){let[s,l]=B.extremities(o);a.set(s,1),a.set(l,1)}let i=B.filterNodes(o=>!$.getNodeState(o).isHidden&&!a.has(o)&&!f.selected.has(o));i.length&&$.setNodesState(i,{isHidden:!0})}for(let a of f.selected)$.getNodeState(a)?.isHidden&&!f.scale?.hidden.has(a)&&f.selected.delete(a);f.scale&&(f.scale.visCount=n.length-(f.hideIsolated,0),Ws(r)&&$.setEdgesState(r,{isHidden:!0})),Yi(),ul(),f.map.dirty=!0,f.core&&(Ps(),Ur())}function sl(e){f.undo.push({kind:"filter",hiddenTypes:new Set(f.hiddenTypes)}),f.hiddenTypes.has(e)?f.hiddenTypes.delete(e):f.hiddenTypes.add(e),we()}var Xs=null;function Yi(){Xs||(Xs=requestAnimationFrame(()=>{Xs=null;let e=new Map,n=new Set;B.forEachNode((r,a)=>{n.add(a.type),(!$?.getNodeState(r).isHidden||f.hiddenTypes.has(a.type))&&e.set(a.type,(e.get(a.type)||0)+($?.getNodeState(r).isHidden?0:1))});for(let r of f.hiddenTypes)n.has(r)&&e.set(r,e.get(r)||0);let t=f.style.legend(new Map([...e].map(([r,a])=>[r,f.hiddenTypes.has(r)?1:a])));N("#legend-title").textContent=f.styleConfig?.legend?.title||"Types",N("#legend").innerHTML=t.map(r=>`<label class="legend-item ${f.hiddenTypes.has(r.type)?"off":""}" data-type="${ne(r.type)}"><input type="checkbox" ${f.hiddenTypes.has(r.type)?"":"checked"}>${r.symbol&&f.symbols.img(r.symbol)?`<img class="lg-sym" src="${f.symbols.img(r.symbol)}" alt="">`:`<span class="glyph ${r.shape}" style="--c:${r.color}"></span>`}<span class="lt">${ne(r.type)}</span><span class="lc">${f.hiddenTypes.has(r.type)?"hidden":e.get(r.type)}</span></label>`).join("")}))}var ne=e=>String(e).replace(/[&<>"']/g,n=>`&#${n.charCodeAt(0)};`),wf=new Worker("/explore/layout.worker.js",{type:"module"}),Js=0,er=null,Ex=0,Af=[];wf.onmessage=({data:e})=>{if(e.type==="error")return oe("Layout error: "+e.message);if(e.runId!==Js||!er)return;if(!e.done&&er.length>3e3){let t=performance.now();if(t-(f.lastStreamApply||0)<750)return;f.lastStreamApply=t}let n=new Map;er.forEach((t,r)=>{let a=e.positions[2*r],i=e.positions[2*r+1];Number.isFinite(a)&&Number.isFinite(i)&&B.hasNode(t)&&!f.pinned.has(t)&&n.set(t,{x:a,y:i})}),Df(n,e.done?f.layout.durationMs:Math.min(f.layout.durationMs,180)),rr("layout",e.done?`${f.layout.kind} ${Math.round(e.ms)} ms${e.watchdog?" (watchdog stop)":""}`:`${f.layout.kind} ${Math.round(e.progress*100)}%`),f.scale&&(at("layout",e.done?!1:e.progress,`Layout (${f.layout.kind})`),e.done&&(f.scale.lastLayout={kind:f.layout.kind,ms:e.ms,nodes:er.length},setTimeout(()=>Pi(),(f.layout.animate?f.layout.durationMs:0)+30))),e.done&&(f.metrics.lastLayoutMs=e.ms,f.metrics.layoutRuns++,er=null,Af.splice(0).forEach(r=>r()))};function Ke({full:e=!1}={}){let n=B.filterNodes(c=>!$.getNodeState(c).isHidden);if(!n.length)return;let t=new Set(n),r=!e&&f.layout.incremental,a=r?"force":f.layout.kind,i=f.layout.levelProperty||f.layout.orderBy&&!["type","insertion"].includes(f.layout.orderBy)||a==="community"&&f.layout.groupBy&&f.layout.groupBy!=="louvain"&&f.layout.groupBy!=="encoding",o=a==="community"&&(f.layout.groupBy==="encoding"||!f.layout.groupBy)&&f.enc?.color?.kind==="categorical"?f.enc.color.values:null,s=n.map(c=>{let h=B.getNodeAttributes(c),g=h.item,p={id:c,type:h.type,...i?{properties:g.properties}:{}};if(a==="timeline"){let m=f.layout.timeProperty?g.properties?.[f.layout.timeProperty]:g.eventTime??g.properties?.date??g.properties?.time??g.updatedAt,b=typeof m=="number"?m<1e11?m*1e3:m:Date.parse(m);Number.isFinite(b)&&(p.time=b)}else if(a==="geo"){let m=Si(g);m&&(p.geo={lat:m.lat,lon:m.lon})}else if(o){let m=o.get(c);m!=null&&(p.group=m)}return p});if(!r&&n.length>5e3){let c=Wh(a,n.length,0);rr("layout",`${a} on ${n.length.toLocaleString()} nodes, est. ${c.estMs<1e3?Math.round(c.estMs)+" ms":(c.estMs/1e3).toFixed(1)+" s"}`)}let l=[];B.forEachEdge((c,h,g,p)=>{t.has(g)&&t.has(p)&&l.push([g,p])});let u={};for(let c of n){let h=B.getNodeAttributes(c);Number.isFinite(h.x)&&h.placed!==!1&&(u[c]=[h.x,h.y])}let d=r?"force":f.layout.kind;er=n,Js++,Ex=performance.now(),wf.postMessage({type:"run",runId:Js,nodes:s,links:l,options:{...f.layout,kind:d,incremental:r,groupBy:f.layout.groupBy==="encoding"?o?null:"louvain":f.layout.groupBy||(o?null:"louvain"),wrong:!!f.core?.config?.scaleUiWrong},prev:r||f.pinned.size?u:Object.fromEntries([...f.pinned].filter(c=>u[c]).map(c=>[c,u[c]])),pinned:[...f.pinned],newIds:[...f.newNodes]}),f.newNodes.clear()}var Ys=null;function Rf(){Ys||(Ys=setTimeout(()=>{Ys=null,Ke({full:!1})},120))}var Tt=null;function Df(e,n){if(!f.layout.animate||f.metrics.degraded||n<=0){for(let[r,a]of e)B.hasNode(r)&&B.mergeNodeAttributes(r,{x:a.x,y:a.y,placed:!0});return}let t=new Map;for(let r of e.keys()){let a=B.getNodeAttributes(r);t.set(r,{x:Number.isFinite(a.x)?a.x:e.get(r).x,y:Number.isFinite(a.y)?a.y:e.get(r).y})}Tt={from:t,target:e,t0:performance.now(),d:n}}function wx(e){if(!Tt)return;let n=Math.min(1,(e-Tt.t0)/Tt.d),t=n<.5?4*n*n*n:1-Math.pow(-2*n+2,3)/2;for(let[r,a]of Tt.target){if(!B.hasNode(r)||f.pinned.has(r))continue;let i=Tt.from.get(r);B.mergeNodeAttributes(r,{x:i.x+(a.x-i.x)*t,y:i.y+(a.y-i.y)*t,placed:!0})}n>=1&&(Tt=null),f.scale?.active&&(f.scale.geomDirty=!0)}function Ax(e){Tt&&Tt.target.delete(e)}function kf(e){let n=[],t=[];B.forEachNode((g,p)=>{Number.isFinite(p.x)&&p.placed!==!1&&(n.push(p.x),t.push(p.y))});let r=n.length;n.sort((g,p)=>g-p),t.sort((g,p)=>g-p);let a=(g,p)=>g[Math.min(g.length-1,Math.floor(p*g.length))],i=a(n,.02),o=a(n,.98),s=a(t,.02),l=a(t,.98),u=r?(i+o)/2:0,d=r?(s+l)/2:0,c=r?Math.hypot(o-i,l-s)/2:50,h=r?Math.max(1,c/Math.sqrt(r+1)):10;for(let g of e){if(!B.hasNode(g))continue;let p=0,m=0,b=0;B.forEachNeighbor(g,(x,y)=>{Number.isFinite(y.x)&&y.placed!==!1&&(p+=y.x,m+=y.y,b++)});let v=Math.random()*Math.PI*2;b?B.mergeNodeAttributes(g,{x:p/b+Math.cos(v)*h,y:m/b+Math.sin(v)*h,placed:!0}):B.mergeNodeAttributes(g,{x:u+Math.cos(v)*(c+h*3),y:d+Math.sin(v)*(c+h*3),placed:!0})}}function Jr(e,n){n?f.pinned.add(e):f.pinned.delete(e),Ze(e),localStorage.setItem("explore.pins",JSON.stringify(Object.fromEntries([...f.pinned].filter(t=>B.hasNode(t)).map(t=>[t,[B.getNodeAttribute(t,"x"),B.getNodeAttribute(t,"y")]]))))}var Zr=null;async function Rx({focus:e=f.core?.scope==="focus"}={}){f.scale&&at("snapshot",null,e?"Opening focus session\u2026":"Loading graph snapshot\u2026");let n=performance.now(),{sessionId:t,snapshot:r}=await ve("/api/explore/session",e?{follow:!1,grow:!0}:{follow:!0}).finally(()=>f.scale&&at("snapshot",!1));f.metrics.fetchMs=performance.now()-n,f.sessionId=t,Cf(r),Zr?.close(),Zr=new EventSource(`/api/explore/session/${t}/events`),Zr.addEventListener("delta",a=>f.queue.push(JSON.parse(a.data))),Zr.onopen=()=>rr("live","live"),Zr.onerror=()=>rr("live","reconnecting\u2026")}function Cf(e){let n=JSON.parse(localStorage.getItem("explore.pins")||"{}"),t=new Map(Object.entries(n).map(([s,l])=>[s,{x:l[0],y:l[1]}])),r=e.items.length>2e3&&$,a=f.metrics.phases={t0:performance.now()};r&&($.kill(),$=null),ir.loadSnapshot(e,t),a.store=performance.now()-a.t0,f.sizeScale=xf(B.order),r&&Xi(),a.renderer=performance.now()-a.t0;for(let s of Object.keys(n))B.hasNode(s)&&f.pinned.add(s);let i=B.filterNodes((s,l)=>!l.placed);f.newNodes=new Set(i);let o=Math.ceil(Math.sqrt(i.length||1));i.forEach((s,l)=>B.mergeNodeAttributes(s,{x:l%o*10,y:Math.floor(l/o)*10,placed:!1})),f.dirtyStyle.clear(),ia(),a.style=performance.now()-a.t0,we(),a.visibility=performance.now()-a.t0,Ke({full:!0}),a.layoutPosted=performance.now()-a.t0,Ff()}async function Dx(){let e=await ve(`/api/explore/session/${f.sessionId}/resync`,{});Cf(e),oe("Resynced after a delta gap")}function kx(){if(!f.queue.length)return;let e=f.queue.splice(0),n=performance.now();for(let a of e){if(ir.applyDelta(a).resync){f.queue.length=0,Dx();return}f.lag=a.lag||f.lag}let t=[...f.newNodes].filter(a=>B.hasNode(a)&&!B.getNodeAttribute(a,"placed"));kf(t);for(let a of f.dirtyStyle)B.hasNode(a)?Ze(a):B.hasEdge(a)&&aa(a);for(let a of t)Ze(a);f.dirtyStyle.clear(),f.er.enabled&&Bx(e),t.length?(we(),Rf()):ul(),f.selected.size&&it();let r=performance.now()-n;f.metrics.deltaApplyMs.push(r),f.metrics.deltaApplyMs.length>200&&f.metrics.deltaApplyMs.shift(),Ff()}function ll(e){let n=e.trim().toLowerCase();if(!n)return[];let t=B.filterNodes((r,a)=>!$.getNodeState(r).isHidden&&[r,Wr(a.item),...Object.values(a.item.properties).filter(i=>typeof i!="object").map(String)].some(i=>i.toLowerCase().includes(n)));return f.selected=new Set(t),f.pathIds=null,it(),t.length&&ea(t[0]),N("#search-info").textContent=t.length?`${t.length} in view`:'no match in view \u2014 try "graph"',t}function ea(e){let n=$.getNodeDisplayData(e);n&&$.getCamera().animate({x:n.x,y:n.y,ratio:Math.min($.getCamera().ratio,.35)},{duration:500})}async function el(e){let n=await ve(`/api/explore/session/${f.sessionId}/search`,{text:e,limit:200});En(n.items),N("#search-info").textContent=`${n.items.length} from graph${n.truncated?" (more\u2026)":""}`,setTimeout(()=>ll(e),50)}function En(e){ir.addItems(e);let n=[...f.newNodes].filter(t=>B.hasNode(t)&&!B.getNodeAttribute(t,"placed"));kf(n),n.forEach(Ze),B.forEachEdge((t,r)=>{r.size==null&&aa(t)}),we(),n.length&&Rf()}var Qr=null;async function Hi(e,n=0){if(!n)return Ye(e,{hops:1});for(let t of e)f.collapsed.has(t)&&f.collapsed.delete(t);we();try{let t=await ve(`/api/explore/session/${f.sessionId}/expand`,{ids:e,limit:Number(N("#expand-limit").value)||50,cursor:n});En(t.items),Qr=t.truncated?{ids:e,cursor:t.nextCursor}:null,N("#more").hidden=!Qr,oe(`Expanded: ${t.items.filter(r=>r.kind==="node").length-e.length} neighbours${t.truncated?" (more available)":""}${t.warnings?.length?" \u2014 "+t.warnings.map(r=>r.message).join("; "):""}`)}catch(t){oe("Expand failed: "+t.message)}}function Lf(e){f.undo.push({kind:"collapse",collapsed:new Map([...f.collapsed].map(([n,t])=>[n,new Set(t)]))});for(let n of e){let t=new Set;B.forEachNeighbor(n,r=>{if(f.pinned.has(r)||f.selected.has(r)||e.includes(r))return;let a=!0;B.forEachNeighbor(r,i=>{i!==n&&!$.getNodeState(i).isHidden&&!t.has(i)&&(a=!1)}),a&&t.add(r)}),f.collapsed.set(n,t)}we()}async function Pf(){if(f.core)return yn();let e=[...f.selected];if(e.length!==2)return oe("Select exactly two nodes (shift-click) for a path");let n=await ve(`/api/explore/session/${f.sessionId}/path`,{fromId:e[0],toId:e[1],directed:N("#path-directed").checked});if(!n.found){f.pathIds=null,oe(n.message||"No path");return}En(n.items),f.pathIds={nodeIds:n.nodeIds,linkIds:n.linkIds},f.selected.clear(),it(),oe(`Path: ${n.linkIds.length} hops${n.incomplete?" (in-memory graph only; may be incomplete)":""}`)}var $i=null,If=null;function Ff(){let e=1/0,n=-1/0;for(let t of ir.items.values()){let r=ol(t);r!=null&&(r<e&&(e=r),r>n&&(n=r))}e!==1/0&&($i=e,If=n,f.live&&(N("#time").value=1e3,N("#time-label").textContent="live",f.timeCut!=null&&(f.timeCut=null,we())))}function tl(){let e=Number(N("#time").value);f.live=e>=1e3,N("#live").checked=f.live,f.timeCut=f.live||$i==null?null:$i+(If-$i)*(e/1e3),N("#time-label").textContent=f.timeCut==null?"live":new Date(f.timeCut).toLocaleTimeString(),we()}function Cx(){queueMicrotask(Vf);let e=[...f.selected][0];if(!e||!B.hasNode(e)){N("#details").innerHTML='<p class="muted">Click a node to see its properties. Double-click to expand. Shift-click to multi-select.</p>';return}let n=B.getNodeAttribute(e,"item");N("#details").innerHTML=`<h3>${ne(Wr(n))}</h3><p class="muted">${ne(n.type)} \xB7 v${n.version}${f.pinned.has(e)?" \xB7 pinned":""}</p>
    <table>${Object.entries(n.properties).map(([t,r])=>`<tr><th>${ne(t)}</th><td>${ne(typeof r=="object"?JSON.stringify(r):r)}</td></tr>`).join("")}</table>
    <p class="muted small">id ${ne(e)}<br>sources: ${n.sources.map(t=>ne(t.sourceId)).join(", ")}<br>degree ${B.degree(e)}</p>${f.core?Is(e):""}`}var uf={};function rr(e,n){uf[e]=n,N("#status").textContent=Object.entries(uf).map(([t,r])=>`${t}: ${r}`).join("  \xB7  ")}function ul(){let e=B.filterNodes(t=>!$.getNodeState(t).isHidden).length;N("#counts").textContent=`${e.toLocaleString()} / ${B.order.toLocaleString()} nodes \xB7 ${B.size.toLocaleString()} links`;let n=e>(f.style?.settings.autoClusterAbove||15e3);N("#banner").hidden=!n,n&&(N("#banner").textContent=`${e.toLocaleString()} visible nodes is over the ${f.style.settings.autoClusterAbove.toLocaleString()} budget: zoom out for the cluster overview (Scale \u2192 Clusters) or filter types in the legend to stay interactive.`)}var df;function oe(e){let n=N("#toast");n.textContent=e,n.hidden=!1,clearTimeout(df),df=setTimeout(()=>n.hidden=!0,3500)}var cf=performance.now(),Ks=0,Zs=0,hf=performance.now(),ff=0;function Mf(e){let n=e-cf;if(cf=e,f.metrics.frameMs.push(n),f.metrics.frameMs.length>600&&f.metrics.frameMs.shift(),n>200?(f.metrics.degraded=!0,ff=e+2e3):e>ff&&(f.metrics.degraded=!1),Ks+=n,Zs++,e-hf>500){f.metrics.fps=Math.round(1e3/(Ks/Zs)),Ks=0,Zs=0,hf=e;let t=Object.entries(f.lag).map(([r,a])=>`${r} ${a.status}${a.lagMs>1500?` ${Math.round(a.lagMs/1e3)}s`:""}`).join(", ");il(),N("#perf").textContent=`${f.metrics.fps} fps${f.metrics.degraded?" (degraded)":""} \xB7 delta ${(f.metrics.deltaApplyMs.at(-1)??0).toFixed(1)} ms${t?" \xB7 "+t:""}`}kx(),wx(e),f.map.view&&f.map.mode!=="graph"&&(f.map.dirty?or():f.map.hlDirty&&Xf()),requestAnimationFrame(Mf)}function Nf(e){f.map.view&&(f.map.view.colors=qi[e]||qi.dark,f.map.view.basemap==="offline"?f.map.view.setBasemap("offline").then(()=>{f.map.dirty=!0,zt=0}):f.map.view.recomputeGrid()),f.theme=e,localStorage.setItem("explore.theme",e),_n(f.styleConfig,!1),N("#theme").textContent=e==="dark"?"\u2600 Light":"\u263E Dark"}function Lx(){N("#layout-kind").innerHTML=gh.map(e=>`<option ${e===f.layout.kind?"selected":""}>${e}</option>`).join(""),N("#layout-kind").onchange=e=>{f.undo.push({kind:"layout",layout:{...f.layout}}),f.layout.kind=e.target.value,Nt(),Ke({full:!0})},N("#relayout").onclick=()=>Ke({full:!0});for(let e of["incremental","animate"])N("#"+e).checked=!!f.layout[e],N("#"+e).onchange=n=>{f.layout[e]=n.target.checked,Nt()};N("#layout-seed").value=f.layout.seed??1234,N("#layout-seed").onchange=e=>{f.layout.seed=Number(e.target.value)||1,Nt(),Ke({full:!0})},N("#layout-time").value=f.layout.timeProperty||"",N("#layout-time").onchange=e=>{f.layout.timeProperty=e.target.value.trim()||null,Nt(),f.layout.kind==="timeline"&&Ke({full:!0})},N("#layout-group").value=f.layout.groupBy||"",N("#layout-group").onchange=e=>{f.layout.groupBy=e.target.value.trim()||null,Nt(),f.layout.kind==="community"&&Ke({full:!0})},N("#spacing").value=f.layout.spacing,N("#spacing").oninput=e=>{f.layout.spacing=Number(e.target.value),Nt()},N("#orientation").value=f.layout.orientation,N("#orientation").onchange=e=>{f.layout.orientation=e.target.value,Nt(),f.layout.kind==="hierarchy"&&Ke({full:!0})},N("#roots-from-selection").onclick=()=>{f.layout.roots=[...f.selected],Nt(),oe(`Roots: ${f.layout.roots.length?f.layout.roots.join(", "):"auto"}`),["hierarchy","radial"].includes(f.layout.kind)&&Ke({full:!0})},N("#theme").onclick=()=>Nf(f.theme==="dark"?"light":"dark"),N("#search").onkeydown=e=>{e.key==="Enter"&&(e.shiftKey?el:ll)(e.target.value),e.key==="Escape"&&(e.target.value="",nr())},N("#search-graph").onclick=()=>el(N("#search").value),N("#pin").onclick=()=>{for(let e of f.selected)Jr(e,!0);oe(`Pinned ${f.selected.size}`)},N("#unpin").onclick=()=>{for(let e of f.selected)Jr(e,!1)},N("#expand").onclick=()=>f.selected.size&&Hi([...f.selected]),N("#more").onclick=()=>Qr&&Hi(Qr.ids,Qr.cursor),N("#collapse").onclick=()=>f.selected.size&&Lf([...f.selected]),N("#path").onclick=Pf,N("#undo").onclick=gf,N("#legend").onclick=e=>{let n=e.target.closest(".legend-item");n&&(e.preventDefault(),sl(n.dataset.type))},N("#time").oninput=tl,N("#live").onchange=e=>{f.live=e.target.checked,f.live&&(N("#time").value=1e3,tl())},N("#style-edit").onclick=()=>{N("#style-dialog").showModal(),N("#style-json").value=JSON.stringify(f.styleConfig,null,2)},N("#style-apply").onclick=e=>{e.preventDefault();let n;try{n=JSON.parse(N("#style-json").value)}catch(t){N("#style-warnings").textContent="Not valid JSON: "+t.message;return}_n(n)},N("#style-reset").onclick=async e=>{e.preventDefault(),localStorage.removeItem("explore.style"),await yf(),N("#style-json").value=JSON.stringify(f.styleConfig,null,2)},N("#style-download").onclick=e=>{e.preventDefault();let n=document.createElement("a");n.href=URL.createObjectURL(new Blob([JSON.stringify(f.styleConfig,null,2)],{type:"application/json"})),n.download=`style-config.v${f.styleConfig.version}.json`,n.click()},document.addEventListener("keydown",e=>{e.target.matches("input, textarea")||(e.key==="Escape"&&nr(),(e.ctrlKey||e.metaKey)&&e.key==="a"&&(e.preventDefault(),Ef()),(e.ctrlKey||e.metaKey)&&e.key==="z"&&(e.preventDefault(),gf()),e.key==="/"&&(e.preventDefault(),N("#search").focus()))})}function Nt(){localStorage.setItem("explore.layout",JSON.stringify(f.layout))}function gf(){let e=f.undo.pop();if(!e)return oe("Nothing to undo");e.kind==="layout"&&(f.layout=e.layout,N("#layout-kind").value=f.layout.kind,Nt(),Ke({full:!0})),e.kind==="filter"&&(f.hiddenTypes=e.hiddenTypes,we()),e.kind==="collapse"&&(f.collapsed=e.collapsed,we()),e.kind==="hidden"&&(f.manualHidden=e.hidden,we()),e.kind==="neighborhood"&&(f.neighborhood=e.neighborhood,we())}function Ki({positions:e=!1}={}){let n=$.getCamera().getState(),t={version:1,layout:{...f.layout},positions:e?Object.fromEntries(B.filterNodes((r,a)=>Number.isFinite(a.x)).map(r=>[r,[+B.getNodeAttribute(r,"x").toFixed(3),+B.getNodeAttribute(r,"y").toFixed(3)]])):null,filters:{hiddenTypes:[...f.hiddenTypes],hiddenLinkTypes:[...f.hiddenEdgeTypes],where:f.where,neighborhood:f.neighborhood,hideIsolated:f.hideIsolated,hiddenIds:[...f.manualHidden||[]]},analysis:f.enc?Object.fromEntries(Object.entries(f.enc).filter(([,r])=>r).map(([r,a])=>[r,{algo:a.request.algo,params:a.request.params,scope:a.request.scopeKind}])):null,style:f.styleUrl?{url:f.styleUrl}:{inline:f.styleConfig},theme:f.theme,camera:{x:n.x,y:n.y,ratio:n.ratio,angle:n.angle||0},selection:[...f.selected],pinned:[...f.pinned],time:{live:f.live,cut:f.live?null:Number(N("#time").value)},processor:{size:f.pm.size,alerts:f.pm.alerts},map:{mode:f.map.mode,camera:f.map.view?f.map.view.getCamera():f.map.camera||null,grid:{...f.map.grid},heat:f.map.heat,links:f.map.links,points:f.map.points,cluster:!!f.map.cluster,basemap:f.map.view?N("#map-basemap").value:f.map.basemap||null}};return f.currentView?.state?.presenter&&(t.presenter=f.currentView.state.presenter),t}function Px(e=15e3){return new Promise(n=>{let t=setTimeout(n,e);Af.push(()=>{clearTimeout(t),n()})})}var zf=e=>new Promise(n=>setTimeout(n,e));function dl(e,n=!0){$.refresh();let t=e.map(l=>$.getNodeDisplayData(l)).filter(l=>l&&Number.isFinite(l.x));if(!t.length)return n?$.getCamera().reset({duration:400}):$.getCamera().setState({x:.5,y:.5,ratio:1,angle:0});let r=1/0,a=-1/0,i=1/0,o=-1/0;for(let l of t)r=Math.min(r,l.x),a=Math.max(a,l.x),i=Math.min(i,l.y),o=Math.max(o,l.y);let s={x:(r+a)/2,y:(i+o)/2,ratio:Math.max(.08,Math.min(1.2,Math.max(a-r,o-i)*1.25)),angle:0};return n?$.getCamera().animate(s,{duration:450}):$.getCamera().setState(s)}async function Gf(e,{animate:n=!0}={}){e=e||{};let t=e.theme&&e.theme!==f.theme;if(t&&(f.theme=e.theme,N("#theme").textContent=f.theme==="dark"?"\u2600 Light":"\u263E Dark"),e.style?.url){let i=await ve(e.style.url);_n(i,!1),f.styleUrl=e.style.url}else e.style?.inline?(_n(e.style.inline,!1),f.styleUrl=null):t&&_n(f.styleConfig,!1);let r=e.filters||{};f.hiddenTypes=new Set(r.hiddenTypes||[]),f.hiddenEdgeTypes=new Set(r.hiddenLinkTypes||[]),f.where=r.where||[],f.neighborhood=r.neighborhood||null,f.hideIsolated=!!r.hideIsolated,f.collapsed.clear(),f.pathIds=null,f.manualHidden&&(f.manualHidden=new Set(r.hiddenIds||[])),f.core&&(f.core.isolate=null,f.core.isolateLinks=null),e.processor&&(f.pm.size=e.processor.size!==!1,f.pm.alerts=e.processor.alerts!==!1,N("#pm-size").checked=f.pm.size,N("#pm-alerts").checked=f.pm.alerts,f.pm.enabled&&B.forEachNode(Ze));for(let i of[...f.pinned])B.hasNode(i)&&(f.pinned.delete(i),Ze(i));for(let i of e.pinned||[])B.hasNode(i)&&(f.pinned.add(i),Ze(i));e.time&&(N("#time").value=e.time.live!==!1||e.time.cut==null?1e3:Math.min(999,e.time.cut),tl()),e.layout&&(f.layout={...bs,...e.layout},Fx()),f.selected=new Set((e.selection||[]).filter(i=>B.hasNode(i))),we(),it(),await Ux(e.map,{animate:n});let a=e.positions&&Object.keys(e.positions).length?e.positions:null;if(a){for(let[i,o]of Object.entries(a))B.hasNode(i)&&B.mergeNodeAttributes(i,{x:o[0],y:o[1],placed:!0});Tt=null}else{let i=Px();Ke({full:!0}),await i,f.layout.animate&&await zf((f.layout.durationMs||400)+60)}$.refresh(),e.camera?n?await $.getCamera().animate(e.camera,{duration:450}):$.getCamera().setState(e.camera):await dl(e.fit==="selection"&&f.selected.size?[...f.selected]:B.filterNodes(i=>!$.getNodeState(i).isHidden),n),ia(),Yi(),ul(),f.core&&await Ix(e.analysis)}async function Ix(e){let n=f.enc.size||f.enc.color||f.enc.edge;f.enc={size:null,color:null,edge:null};let t=new Map;for(let[r,a]of Object.entries(e||{})){if(!a?.algo)continue;let i=JSON.stringify([a.algo,a.params||{},a.scope||"all"]);t.has(i)||t.set(i,{x:a,chs:[]}),t.get(i).chs.push(r)}for(let{x:r,chs:a}of t.values())await xt(r.algo,{params:r.params||{},scopeKind:r.scope||"all",channels:a});n&&!t.size&&(ia(),Hr())}function Fx(){N("#layout-kind").value=f.layout.kind,N("#spacing").value=f.layout.spacing,N("#orientation").value=f.layout.orientation,N("#incremental").checked=!!f.layout.incremental,N("#animate").checked=!!f.layout.animate,N("#layout-seed").value=f.layout.seed??1234,N("#layout-time").value=f.layout.timeProperty||"",N("#layout-group").value=f.layout.groupBy||""}var ta={list:[],presentations:[]};async function Jt(){let e=await ve("/api/explore/views");ta.list=e.views,ta.presentations=e.presentations;let n=N("#view-list"),t=f.currentView?.id;return n.innerHTML=e.views.map(r=>`<option value="${ne(r.id)}" ${r.id===t?"selected":""} title="${ne(r.description||"")}">${ne(r.name)}</option>`).join(""),N("#views-empty").hidden=e.views.length>0,e}async function na(e,{animate:n=!0,updateUrl:t=!0}={}){let r=await ve(`/api/explore/views/${encodeURIComponent(e)}`);if(await Gf(r.state,{animate:n}),f.currentView=r,t&&!f.presenting){let a=new URL(location.href);a.searchParams.set("view",r.id),history.replaceState(null,"",a)}return N("#view-list").value=r.id,N("#view-current").textContent=r.name,document.body.dataset.view=r.id,r}async function Of(e,{description:n="",positions:t=N("#view-positions").checked,id:r}={}){let a=await ve("/api/explore/views",{id:r,name:e,description:n,state:Ki({positions:t})});return f.currentView=a.view,await Jt(),N("#view-current").textContent=a.view.name,oe(`Saved view "${a.view.name}"`),a.view}async function Bf(e=f.currentView?.id){if(!e)return oe("Load or save a view first");let n=await cl("PUT",`/api/explore/views/${encodeURIComponent(e)}`,{state:Ki({positions:N("#view-positions").checked})});return f.currentView=n.view,oe(`Updated "${n.view.name}"`),n.view}async function Wf(e,n){let t=await cl("PUT",`/api/explore/views/${encodeURIComponent(e)}`,{name:n});return await Jt(),f.currentView?.id===e&&(f.currentView=t.view,N("#view-current").textContent=n),t.view}async function Uf(e){await cl("DELETE",`/api/explore/views/${encodeURIComponent(e)}`),f.currentView?.id===e&&(f.currentView=null,N("#view-current").textContent=""),await Jt()}var $f=e=>`${location.origin}/explore?view=${encodeURIComponent(e)}`;async function cl(e,n,t){let r=await fetch(n,{method:e,headers:{"content-type":"application/json"},body:t===void 0?void 0:JSON.stringify(t)}),a=await r.json().catch(()=>({}));if(!r.ok)throw new Error(a.error||r.statusText);return a}function Mx(){let e=()=>N("#view-list").value||null;N("#view-list").ondblclick=()=>e()&&na(e()).catch(n=>oe(n.message)),N("#view-load").onclick=()=>e()?na(e()).catch(n=>oe(n.message)):oe("Pick a view"),N("#view-save").onclick=async()=>{let n=prompt("Name for this view",f.currentView?`${f.currentView.name} (copy)`:"");n&&await Of(n).catch(t=>oe(t.message))},N("#view-update").onclick=()=>Bf().catch(n=>oe(n.message)),N("#view-rename").onclick=async()=>{let n=e();if(!n)return;let t=prompt("New name",ta.list.find(r=>r.id===n)?.name||"");t&&await Wf(n,t).catch(r=>oe(r.message))},N("#view-delete").onclick=async()=>{let n=e();n&&confirm(`Delete view "${ta.list.find(t=>t.id===n)?.name}"?`)&&await Uf(n).catch(t=>oe(t.message))},N("#view-link").onclick=async()=>{let n=e()||f.currentView?.id;if(!n)return oe("Pick a view");let t=$f(n);try{await navigator.clipboard.writeText(t),oe("Link copied: "+t)}catch{prompt("Link to this view",t)}},N("#view-export").onclick=async()=>{let n=await ve("/api/explore/views-export"),t=document.createElement("a");t.href=URL.createObjectURL(new Blob([JSON.stringify(n,null,2)],{type:"application/json"})),t.download="explore-views.json",t.click()},N("#view-import").onclick=()=>N("#view-import-file").click(),N("#view-import-file").onchange=async n=>{let t=n.target.files[0];if(t){try{let r=await ve("/api/explore/views-import",{bundle:JSON.parse(await t.text()),mode:"merge"});await Jt(),oe(`Imported ${r.added.length} new, ${r.updated.length} updated`)}catch(r){oe("Import failed: "+r.message)}n.target.value=""}},N("#present").onclick=()=>f.presenting?nl():hl(),document.addEventListener("keydown",n=>{if(!f.presenting||n.target.matches("input, textarea, select"))return;let t=n.key,r=!0;t==="ArrowRight"||t==="PageDown"||t===" "?rl(1):t==="ArrowLeft"||t==="PageUp"?rl(-1):t==="Home"?ra(0):t==="End"?ra((f.present?.viewIds.length||1)-1):t==="Escape"?nl():r=!1,r&&(n.preventDefault(),n.stopImmediatePropagation())},!0)}async function hl(e=me.get("deck")){let n=await Jt(),t=e&&n.presentations.find(a=>a.id===e)||n.presentations[0]||{id:"all",name:"All views",viewIds:n.views.map(a=>a.id)};f.presenting=!0,document.body.classList.add("presenting"),N("#present").textContent="Exit presenter",f.present={deck:t,viewIds:t.viewIds,i:-1},$.setSetting?.("labelDensity",.35),$.resize?.(),$.refresh();let r=f.currentView?t.viewIds.indexOf(f.currentView.id):-1;t.viewIds.length?await ra(r>=0?r:0):fl(),document.body.dataset.presenting="1"}function nl(){if(f.presenting=!1,document.body.classList.remove("presenting"),delete document.body.dataset.presenting,N("#present").textContent="Present",f.present=null,$.setSetting?.("labelDensity",.7),$.resize?.(),$.refresh(),f.currentView){let e=new URL(location.href);e.searchParams.delete("present"),e.searchParams.set("view",f.currentView.id),history.replaceState(null,"",e)}}var pf=Promise.resolve();function rl(e){if(!f.present)return;let n=f.present.viewIds.length;return ra(Math.max(0,Math.min(n-1,f.present.i+e)))}function ra(e){return pf=pf.then(async()=>{!f.present||e===f.present.i||!f.present.viewIds[e]||(f.present.i=e,await na(f.present.viewIds[e],{updateUrl:!1}).catch(n=>oe(n.message)),fl(),document.body.dataset.slide=String(e))})}function fl(){let e=f.currentView,n=e?.state?.presenter||{};N("#present-title").textContent=n.title||e?.name||f.styleConfig?.legend?.title||"Explore",N("#present-caption").textContent=n.caption||e?.description||"",N("#present-count").textContent=f.present?`${f.present.i+1} / ${f.present.viewIds.length}  \xB7  \u2190 \u2192 to step \xB7 Esc to exit`:"",N("#present-legend").innerHTML=Nx()}function Nx(){let e=new Map;B.forEachNode((u,d)=>{$.getNodeState(u).isHidden||e.set(d.type,(e.get(d.type)||0)+1)});let n=f.style.legend(e),t=f.symbols?.legend?.(e)||null,r=(t?.types||n).map(u=>`<div class="pl-item">${u.img?`<img class="pl-sym" src="${u.img}" alt="">`:`<span class="glyph ${u.shape}" style="--c:${u.color}"></span>`}<span>${ne(u.type)}</span><span class="pl-c">${e.get(u.type)??""}</span></div>`).join(""),a=new Map;B.forEachEdge((u,d)=>{$.getEdgeState(u).isHidden||a.set(d.item.type,(a.get(d.item.type)||0)+1)});let o=zx().filter(u=>a.has(u.type)).map(u=>`<div class="pl-item"><span class="pl-line${u.dash?" dashed":""}" style="--c:${u.color}"></span><span>${ne(u.label)}</span><span class="pl-c">${a.get(u.type).toLocaleString()}</span></div>`).join(""),s=(t?.modifiers||[]).map(u=>`<div class="pl-item"><img class="pl-sym" src="${u.img}" alt=""><span>${ne(u.label)}</span></div>`).join(""),l=f.symbols?.credits?.()||"";return`${r?`<h3>${ne(f.styleConfig?.legend?.title||"Types")}</h3>${r}`:""}${o?`<h3>${ne(f.styleConfig?.legend?.linksTitle||"Links")}</h3>${o}`:""}${s?`<h3>Modifiers</h3>${s}`:""}${l?`<p class="pl-credit">${ne(l)}</p>`:""}`}function zx(){let e=f.styleConfig||{},n=e.legend?.linkLabels||{};if(Array.isArray(e.legend?.links))return e.legend.links.map(a=>({type:a.type,label:a.label||a.type,color:f.style.linkStyle({kind:"link",type:a.type,properties:{}}).color,dash:!1}));let t=[],r=new Set;for(let a of e.rules||[]){let i=a.when?.type;if(a.when?.kind!=="link"||typeof i!="string"||r.has(i)||!a.apply?.color)continue;r.add(i);let o=f.style.linkStyle({kind:"link",type:i,properties:{}});t.push({type:i,label:n[i]||i,color:o.color,dash:o.dash!=="solid"})}return t}f.symbols={img:e=>oa.get(e)?.dataUrl||null,legend(e){let n=f.style.symbols;if(!n)return null;let t=f.style.legend(e).map(a=>({...a,img:a.symbol?f.symbols.img(a.symbol):null})),r=(f.styleConfig.symbols?.legend?.modifiers||[]).map(a=>({label:a.label,img:f.symbols.img(Mr({id:"",properties:{}},a.apply||{},n,a.fill||"#7A8599"))})).filter(a=>a.label);return{types:t,modifiers:r}},credits(){let e=f.style.symbols;if(!e)return"";let n=new Set([e.defaultSet]);for(let t of f.styleConfig.rules||[]){let r=t.apply?.glyph;typeof r=="string"&&r.includes("/")&&n.add(r.slice(0,r.lastIndexOf("/")))}return"Icons: "+[...n].filter(t=>e.sets[t]).map(t=>`${e.sets[t].name} (${e.sets[t].license})${e.sets[t].attribution?" \u2014 "+e.sets[t].attribution:""}`).join(", ")}};async function Gx(){Mx(),await Jt().catch(n=>console.warn("views",n));let e=me.get("view");e&&await na(e,{animate:!1}).catch(n=>oe(`View "${e}": ${n.message}`)),me.get("present")==="1"&&await hl()}window.__explore={graph:B,store:ir,S:f,get renderer(){return $},core:Ai,applyVisibility:we,applyHighlight:it,searchView:ll,searchGraph:el,expand:Hi,collapse:Lf,toggleType:sl,setTheme:Nf,runLayout:Ke,applyStyleConfig:_n,select:Tn,clearSelection:nr,addItems:En,toast:oe,neighborhood:us,findPath:Pf,pin:Jr,switchRenderer:Tf,get rendererInfo(){return{pref:f.rnd.pref,active:f.rnd.active,note:f.rnd.note,adapter:$?.info||null}},captureState:Ki,applyViewState:Gf,loadView:na,saveView:Of,updateView:Bf,renameView:Wf,deleteView:Uf,refreshViews:Jt,enterPresenter:hl,exitPresenter:nl,stepSlide:rl,goSlide:ra,viewUrl:$f,views:ta,fitCamera:dl,get atlas(){return oa}};async function mf(){try{let e=[];B.forEachNode(i=>{e.length<2e4&&e.push(i)});let n=await ve("/api/explore/processor/metrics",{ids:e}),t=f.pm.metrics;f.pm.metrics=n.metrics,f.pm.polls++;let r=new Set([...Object.keys(t),...Object.keys(n.metrics)].filter(i=>JSON.stringify(t[i])!==JSON.stringify(n.metrics[i])));r.forEach(Ze),r.size&&$?.refresh();let a=n.stats?.job||{};N("#pm-status").textContent=`Flink ${a.flinkVersion||""} \xB7 ${a.status||"?"} \xB7 ${a.delivery||""} \xB7 ${Object.keys(n.metrics).length} nodes \xB7 ${n.alerts.length} alerts`}catch(e){N("#pm-status").textContent="processor: "+e.message}}async function Ox(){if((await ve("/api/explore/processor").catch(()=>({enabled:!1}))).enabled){f.pm.enabled=!0,N("#stream-metrics").hidden=!1;for(let n of["size","alerts"])N("#pm-"+n).onchange=t=>{f.pm[n]=t.target.checked,B.forEachNode(Ze),$?.refresh()};await mf(),setInterval(mf,Number(me.get("pmEvery"))||2e3)}}window.__explore.pm=f.pm;var Hf=new Set(["RESOLVES_TO","POSSIBLY_SAME"]);function gl(){let e=new Map;B.forEachEdge((n,t,r,a)=>{t.item?.type==="RESOLVES_TO"&&e.set(r,a)}),f.er.recEntity=e,f.er.dirty=!1}function jf(){for(let n of f.er.proj)B.hasEdge(n)&&B.dropEdge(n);if(f.er.proj.clear(),f.er.view!=="entities")return;let e=new Map;B.forEachEdge((n,t,r,a)=>{let i=t.item;if(!i||Hf.has(i.type)||t.projected)return;let o=f.er.recEntity.get(r)||(B.getNodeAttribute(r,"item")?.type==="Entity"?r:null),s=f.er.recEntity.get(a)||(B.getNodeAttribute(a,"item")?.type==="Entity"?a:null);if(!o||!s||o===s||o===r&&s===a)return;let l=`proj:${i.type}:${o}>${s}`,u=e.get(l);u?u.n++:e.set(l,{ea:o,eb:s,type:i.type,n:1})});for(let[n,t]of e){if(!B.hasNode(t.ea)||!B.hasNode(t.eb))continue;let r={id:n,kind:"link",type:t.type,fromId:t.ea,toId:t.eb,label:t.n>1?`${t.type} \xD7${t.n}`:t.type,properties:{projected:!0,records:t.n},sources:[],version:1};B.addEdgeWithKey(n,t.ea,t.eb,{item:r,projected:!0}),f.er.proj.add(n),aa(n)}}function ji(e){f.er.view=e,f.er.dirty&&gl(),jf(),we(),$?.refresh();let n=new URL(location.href);e==="all"?n.searchParams.delete("er"):n.searchParams.set("er",e),history.replaceState(null,"",n);for(let t of document.querySelectorAll("#er-view button"))t.classList.toggle("active",t.dataset.v===e);qf()}var Qs=null;function Bx(e){e.some(n=>n.upserts?.some(t=>Hf.has(t.type)||t.type==="Entity")||n.removes?.length)&&(f.er.dirty=!0,!Qs&&(Qs=setTimeout(()=>{Qs=null,gl(),f.er.view==="entities"&&jf(),f.er.view!=="all"&&we(),qf()},300)))}function qf(){let e=0,n=0,t=0;B.forEachNode((r,a)=>{a.item?.type==="Entity"&&(e++,a.item.properties?.recordCount>1&&n++)}),B.forEachEdge((r,a)=>{a.item?.type==="POSSIBLY_SAME"&&t++}),N("#er-status").textContent=`${f.er.recEntity.size} records \u2192 ${e} entities (${n} with 2+ records) \xB7 ${t} possible matches${f.er.engine?" \xB7 "+f.er.engine:""}`}var Ui=e=>e==null?"\u2013":`${(e*100).toFixed(e>=.9995?0:1)}%`;function vf(e,{values:n=!0}={}){if(!e?.length)return'<p class="muted small">No comparable features.</p>';let t=Math.max(1,...e.map(r=>Math.abs(r.weight)));return`<table class="er-why">${e.map(r=>`<tr title="${ne(r.level||"")}"><th>${ne(r.property)}</th><td class="er-bar"><span class="${r.weight>=0?"pos":"neg"}" style="width:${Math.round(Math.abs(r.weight)/t*100)}%"></span></td><td class="num">${r.weight>=0?"+":""}${Number(r.weight).toFixed(1)}</td></tr>
    ${n&&(r.a!=null||r.b!=null)?`<tr class="er-vals"><td></td><td colspan="2">${ne(r.a??"\u2205")} <span class="muted">vs</span> ${ne(r.b??"\u2205")}<br><span class="muted">${ne(r.level||"")}</span></td></tr>`:""}`).join("")}</table>`}async function Vf(){if(!f.er.enabled)return;let e=++f.er.token,n=[...f.selected].filter(a=>B.hasNode(a)),t=document.createElement("div");t.id="er-panel",t.className="er-panel";let r=a=>{e===f.er.token&&(document.querySelector("#er-panel")?.remove(),t.innerHTML=a,N("#details").append(t))};try{if(n.length===2){let u=await ve(`/api/explore/er/why?a=${encodeURIComponent(n[0])}&b=${encodeURIComponent(n[1])}`);return r(`<h3>Why: ${ne(u.decision)}</h3><p class="small">score <b>${Ui(u.score)}</b> \xB7 match \u2265 ${u.threshold} \xB7 possible \u2265 ${u.maybeThreshold}<br>${ne(u.matchKey||"")} \xB7 ${u.sameEntity?"same entity"+(u.viaChain?" (through other records)":""):"different entities"} \xB7 ${ne(u.engine||"")}</p>
        ${vf(u.features)}<p class="muted small">Weights are log2 Bayes factors: prior ${Number(u.prior||0).toFixed(1)} + \u03A3 weights = ${Number(u.matchWeight).toFixed(1)}.</p>`)}if(n.length!==1)return;let a=B.getNodeAttribute(n[0],"item");if(a.type!=="Entity"&&!f.er.recEntity.has(n[0]))return;let i=await ve(`/api/explore/er/entity?id=${encodeURIComponent(n[0])}`),o=i.records.map(u=>`<tr class="er-rec" data-id="${ne(u.id)}"><td>${ne(u.dataSource)}</td><td>${ne(u.recordId)}</td><td>${ne(u.label)}</td><td class="num">${u.matchedWith?Ui(u.score):"\u2013"}</td><td class="small">${ne(u.matchKey||"")}</td></tr>`).join(""),s=i.possible.map(u=>`<li><a href="#" data-goto="${ne(u.entityId)}">${ne(u.label||u.entityId)}</a> ${Ui(u.score)} <span class="muted small">${ne(u.matchKey||"")}</span></li>`).join(""),l="";if(a.type!=="Entity"){let u=await ve(`/api/explore/er/why?a=${encodeURIComponent(n[0])}`).catch(()=>null);u&&u.features&&(l=`<h4>Why this record is in the entity</h4><p class="small">matched with ${ne(u.b||"\u2013")} at <b>${Ui(u.score)}</b> ${ne(u.matchKey||"")}</p>${vf(u.features)}`)}r(`<h3>Resolved entity</h3><p class="small"><a href="#" data-goto="${ne(i.entity.id)}">${ne(i.entity.label)}</a> \xB7 ${ne(i.entity.entityType)} \xB7 <b>${i.entity.recordCount}</b> record${i.entity.recordCount===1?"":"s"} from ${i.entity.dataSources.map(ne).join(", ")}</p>
      ${l}<h4>Records</h4><table class="er-recs"><tr><th>source</th><th>record</th><th>name</th><th>score</th><th>key</th></tr>${o}</table>
      ${s?`<h4>Possible matches</h4><ul class="er-ps">${s}</ul>`:""}
      ${i.history?.length?`<h4>History</h4><ul class="small">${i.history.map(u=>`<li>${ne(u.at.slice(11,19))} ${ne(u.kind)}${u.absorbed?" \u2190 "+u.absorbed.length:""}${u.splitOff?" \u2192 "+u.splitOff.length+" split off":""}</li>`).join("")}</ul>`:""}
      <p class="muted small">Shift-click two records, then see why they match.</p>`);for(let u of t.querySelectorAll("[data-goto]"))u.onclick=d=>{d.preventDefault();let c=u.dataset.goto;B.hasNode(c)&&(Tn(c),ea(c))};for(let u of t.querySelectorAll(".er-rec"))u.onclick=()=>{let d=u.dataset.id;B.hasNode(d)&&(f.er.view==="entities"&&ji("all"),Tn(d),ea(d))}}catch(a){r(`<p class="muted small">entity resolution: ${ne(a.message)}</p>`)}}async function Wx(){let e=await ve("/api/explore/er/stats").catch(()=>null);if(e?.enabled){f.er.enabled=!0,f.er.engine=e.engine,N("#er-section").hidden=!1;for(let n of document.querySelectorAll("#er-view button"))n.onclick=()=>ji(n.dataset.v);N("#er-possible").onchange=n=>{f.er.possible=n.target.checked,we(),$?.refresh()},gl(),ji(f.er.view)}}window.__explore.setErView=ji;window.__explore.erDetails=Vf;var qi={dark:{ocean:"#0f1722",land:"#1f2a37",border:"#3a4a5e",grid0:"#3b82f6",grid1:"#22d3ee",grid2:"#fde047",heat0:"#7c2d12",heat1:"#f97316",heat2:"#fef08a",gridLine:"rgba(255,255,255,0.35)",select:"#ff3ea5"},light:{ocean:"#dbe7f3",land:"#f6f4ef",border:"#a9b4c2",grid0:"#93c5fd",grid1:"#2563eb",grid2:"#1e1b4b",heat0:"#fed7aa",heat1:"#f97316",heat2:"#7f1d1d",gridLine:"rgba(0,0,0,0.35)",select:"#d6007a"}};function Zi(e,n){let t=f.map.geo.get(e);if(t&&t.v===n.version&&t.it===n)return t.g;let r=Si(n);return f.map.geo.set(e,{v:n.version,it:n,g:r}),r}function Qi(){let e=[];return B.forEachNode((n,t)=>{if($.getNodeState(n).isHidden)return;let r=Zi(n,t.item);r&&e.push({id:n,lat:r.lat,lon:r.lon})}),e}var zt=0;function or(){let e=performance.now();if(e-zt<200)return;zt=e,f.map.dirty=!1;let n=[],t=new Map,r=Math.max(.45,xf(B.order));B.forEachNode((i,o)=>{if($.getNodeState(i).isHidden)return;let s=Zi(i,o.item);s&&(t.set(i,s),n.push({id:i,lat:s.lat,lon:s.lon,color:o.color,border:o.borderColor,size:Math.max(2.5,Math.min(16,(o.size||6)*.75*r)),sym:o.symbol?o.symId:null,label:o.label||i}))});let a=[];f.map.links&&B.forEachEdge((i,o,s,l)=>{if(a.length>=3e4||$.getEdgeState(i).isHidden)return;let u=t.get(s),d=t.get(l);u&&d&&s!==l&&a.push({id:i,a:u,b:d,color:o.color,width:Math.max(.6,Math.min(4,o.size||1)),dashed:!!o.dashed})}),f.map.view.showLinks=f.map.links,f.map.view.setData(n,a),Xf(),pl()}function Xf(){if(f.map.hlDirty=!1,!f.map.view)return;let e=f.hlSets||{nodes:new Set,edges:new Set};f.map.view.setHighlight({selected:new Set(f.selected),nodes:e.nodes,links:e.edges,any:e.nodes.size>0||f.selected.size>0});let n=[...f.selected].join(`
`);if(n!==f.map.lastSel&&(f.map.lastSel=n,f.selected.size===1&&performance.now()>(f.map.noRevealUntil||0))){let t=[...f.selected][0],r=B.hasNode(t)&&Zi(t,B.getNodeAttribute(t,"item")),a=f.map.view.map;r&&a&&!a.getBounds().contains([r.lon,r.lat])&&a.easeTo({center:[r.lon,r.lat],duration:600})}}function pl(){let e=f.map.view?.stats();e&&(N("#map-status").textContent=`${e.points.toLocaleString()} on map \xB7 ${e.links.toLocaleString()} links${e.grid.kind!=="none"?` \xB7 ${e.cells.toLocaleString()} ${e.grid.kind.toUpperCase()} cells`:""} \xB7 basemap ${e.basemap}${e.fellBack?" (online style unreachable)":""}`)}async function ml(){return f.map.view?f.map.view:f.map.loading||=(async()=>{f.map.config||=await ve("/api/explore/geo/config");let e="/explore/map.js",{createMap:n}=await import(e),t=await n({container:N("#map"),config:f.map.config,basemap:me.get("basemap")||f.map.basemap||f.map.config.basemap,colors:qi[f.theme]||qi.dark,symbolUrl:r=>{let a=oa.cache.get(r);return a?.ready?a.dataUrl:null},onSelect:(r,a)=>r?Tn(r,a):nr(),onCellSelect:(r,a,i)=>{a||f.selected.clear();for(let o of r)B.hasNode(o)&&f.selected.add(o);f.pathIds=null,it(),N("#map-cell").textContent=`${i.kind.toUpperCase()} ${i.cell}: ${i.count} node${i.count===1?"":"s"} selected`}});return t.onMove=()=>{document.body.dataset.mapMoved=String(Date.now())},t.uiWrong=!!f.core?.config?.scaleUiWrong,t.setClustering(f.map.cluster),f.map.view=t,t.setPoints(f.map.points),f.map.basemap=t.basemap,N("#map-basemap").value=me.get("basemap")||f.map.config.basemap,t.setGrid(f.map.grid),f.map.dirty=!0,zt=0,or(),f.map.camera?t.setCamera(f.map.camera):t.fitTo(Qi()),document.body.dataset.mapReady="1",t})().catch(e=>{throw f.map.loading=null,oe("Map failed to load: "+e.message),e})}async function Ux(e,{animate:n=!1}={}){e=e||{mode:"graph"},f.map.noRevealUntil=performance.now()+2e3,f.map.links=e.links!==!1,N("#map-links").checked=f.map.links,f.map.points=e.points!==!1,N("#map-points").checked=f.map.points,f.map.view?.setPoints(f.map.points),f.map.heat=!!e.heat,N("#map-heat").checked=f.map.heat,f.map.cluster=!!e.cluster,N("#map-cluster").checked=f.map.cluster,f.map.view?.setClustering(f.map.cluster),f.map.camera=e.camera||null,e.grid&&tr(e.grid.kind||"none",e.grid.resolution),e.mode&&e.mode!=="graph"?(await ar(e.mode),e.basemap&&e.basemap!==N("#map-basemap").value&&(N("#map-basemap").value=e.basemap,await f.map.view.setBasemap(e.basemap),f.map.basemap=e.basemap),zt=0,or(),e.camera?f.map.view.setCamera(e.camera,n):f.map.view.fitTo(Qi(),n),n&&await zf(500),f.map.heat&&await Vi()):await ar("graph")}async function ar(e,{fit:n=!1}={}){["graph","map","split"].includes(e)||(e="graph"),f.map.mode=e,document.body.dataset.mode=e,f.scale&&rt();for(let t of document.querySelectorAll("#view-mode button"))t.classList.toggle("on",t.dataset.m===e);if(N("#map").hidden=e==="graph",N("#map-section").hidden=e==="graph",$?.resize?.(),$?.refresh(),e!=="graph"){let t=await ml();t.resize(),f.map.dirty=!0,zt=0,or(),n&&t.fitTo(Qi())}}function tr(e,n){f.map.grid={kind:e,resolution:n??f.map.grid.resolution};let t={h3:[0,10],mgrs:[0,4]}[e];t&&(f.map.grid.resolution=Math.max(t[0],Math.min(t[1],f.map.grid.resolution)),N("#map-res").min=t[0],N("#map-res").max=t[1]),N("#map-grid").value=e,N("#map-res").value=f.map.grid.resolution,N("#map-res").disabled=e==="none",N("#map-res-label").textContent=e==="h3"?`res ${f.map.grid.resolution}`:e==="mgrs"?["100 km","10 km","1 km","100 m","10 m"][f.map.grid.resolution]:"",N("#map-cell").textContent="",f.map.view?.setGrid(f.map.grid),f.map.heat&&Vi(),pl()}async function Vi(){if(!f.map.heat||!f.map.view||f.map.grid.kind!=="h3"){f.map.view?.setHeat(null,!1);return}try{let n=(await ve(`/api/explore/geo/grid?kind=h3&res=${f.map.config.streamGeoResolution??f.map.grid.resolution}&stream=1&limit=1`)).stream||{};if(!n.available){N("#map-heat-status").textContent=n.reason||"no stream heat",f.map.view.setHeat(null,!1);return}f.map.heatData=n,f.map.view.setHeat({kind:"h3",resolution:n.resolution,counts:n.counts},!0),N("#map-heat-status").textContent=`Flink: ${Object.keys(n.counts).length} cells \xB7 ${n.events} events in the last ${n.windows} \xD7 ${Math.round(n.windowMs/1e3)} s windows (res ${n.resolution})`}catch(e){N("#map-heat-status").textContent="heat: "+e.message}}function $x(){for(let e of document.querySelectorAll("#view-mode button"))e.onclick=()=>ar(e.dataset.m,{fit:!f.map.view}).catch(()=>{});N("#map-grid").onchange=e=>tr(e.target.value,e.target.value==="h3"?3:e.target.value==="mgrs"?0:void 0),N("#map-res").oninput=e=>tr(f.map.grid.kind,Number(e.target.value)),N("#map-points").onchange=e=>{f.map.points=e.target.checked,f.map.view?.setPoints(f.map.points)},N("#map-cluster").checked=!!f.map.cluster,N("#map-cluster").onchange=e=>{f.map.cluster=e.target.checked,f.map.view?.setClustering(f.map.cluster)},N("#map-links").onchange=e=>{f.map.links=e.target.checked,f.map.dirty=!0,zt=0},N("#map-fit").onclick=()=>f.map.view?.fitTo(f.selected.size?[...f.selected].map(e=>B.hasNode(e)&&Zi(e,B.getNodeAttribute(e,"item"))).filter(Boolean):Qi(),!0),N("#map-basemap").onchange=async e=>{await ml(),await f.map.view.setBasemap(e.target.value),f.map.basemap=e.target.value,f.map.dirty=!0,zt=0,or(),pl()},N("#map-heat").onchange=e=>{f.map.heat=e.target.checked,f.map.heat&&f.map.grid.kind!=="h3"&&tr("h3",f.map.config?.streamGeoResolution??4),Vi()},setInterval(()=>{f.map.heat&&Vi()},Number(me.get("heatEvery"))||2e3)}async function Hx(){$x(),f.map.config=await ve("/api/explore/geo/config").catch(()=>null),f.map.config?.streamGeo&&(N("#map-heat-row").hidden=!1);let e=me.get("grid");e&&["h3","mgrs","none"].includes(e)?f.map.grid={kind:e,resolution:Number(me.get("res")??(e==="mgrs"?0:3))}:f.map.config?.defaultGrid&&f.map.mode!=="graph"&&(f.map.grid={...f.map.config.defaultGrid}),tr(f.map.grid.kind,f.map.grid.resolution),f.map.mode!=="graph"?await ar(f.map.mode,{fit:!0}):document.body.dataset.mode="graph"}async function al(e,n={}){if(!B.hasNode(e))try{let r=await ve(`/api/explore/session/${f.sessionId}/search`,{text:n.name||e.replace(/^sg:node:[^:]+:/,""),limit:200});En(r.items)}catch{}if(!B.hasNode(e))return oe("That result is not in this graph view (it may be hidden by a filter)."),!1;f.hiddenTypes.has(B.getNodeAttribute(e,"item")?.type)&&sl(B.getNodeAttribute(e,"item").type),Tn(e),ea(e),N("#search-info").textContent=`focused: ${n.name||e}`,document.body.dataset.focused=e;let t=n.geo||Si(B.getNodeAttribute(e,"item"));if(t&&Number.isFinite(t.lat)&&Number.isFinite(t.lon))try{f.map.mode==="graph"&&await ar("split",{fit:!1}),f.map.view?.map?.easeTo({center:[t.lon,t.lat],zoom:Math.max(f.map.view.map.getZoom(),11),duration:500}),document.body.dataset.focusedGeo=`${t.lat},${t.lon}`}catch(r){console.warn("map focus",r)}return!0}window.__explore.focusFromIndex=al;window.__explore.setMapMode=ar;window.__explore.setGrid=tr;window.__explore.ensureMap=ml;window.__explore.mapSync=()=>{zt=0,or()};Object.defineProperty(window.__explore,"mapView",{get:()=>f.map.view});(async function(){await yf(),N("#theme").textContent=f.theme==="dark"?"\u2600 Light":"\u263E Dark",await Sf(nf(localStorage,me.get("renderer"))),Xi(),Lx(),yx(),il(!0),of({api:ve,mapView:()=>f.map.view,types:()=>[...new Set(B.mapNodes((r,a)=>a.item?.type).filter(Boolean))].sort(),focus:al});let n=await ve("/api/explore/core/config").catch(()=>null);{let r=document.getElementById("dataset-credit"),a=n?.datasetCredit;r&&a&&(r.textContent=a,r.hidden=!1,r.title=a)}As({config:n,S:f,graph:B,store:ir,api:ve,toast:oe,setStatus:rr,addItems:En,applyVisibility:we,applyHighlight:it,restyleNode:Ze,restyleEdge:aa,restyleAll:ia,select:Tn,clearSelection:nr,selectAllVisible:Ef,pin:Jr,fitCamera:dl,focusNode:ea,runLayout:Ke,captureState:Ki,refreshViews:()=>Jt(),renderer:()=>$,label:r=>Wr(B.getNodeAttribute(r,"item"))}),Fh({config:n,S:f,graph:B,api:ve,toast:oe,setStatus:rr,applyVisibility:we,addItems:En,animateTo:Df,renderer:()=>$,core:Ai}),window.__explore.scale=Di;let t=me.get("scope")||n?.scope||"auto";if(f.core.scope=t==="focus"||t==="auto"&&n&&n.counts.nodes>n.fullSnapshotMax?"focus":"full",document.body.dataset.scope=f.core.scope,await Rx(),f.core.scope==="focus"){let r=me.get("seeds")?.split(",").filter(Boolean)||[];r.length?await Ye(r,{hops:Number(me.get("hops")||1),maxNodes:Number(me.get("max")||N("#expand-limit").value||500),quiet:!0}):oe(`Large graph (${n?.counts.nodes.toLocaleString()} nodes): focus mode loads only what you search for (Shift+Enter) or expand.`),Ur()}(f.scale.mode==="on"||f.scale.mode==="auto"&&(f.core.scope==="focus"||B.order>f.scale.autoAbove))&&await Vr(),Zn(),f.scale.bundle.on&&Li(!0),Ox().catch(r=>console.warn("processor overlay",r)),await Wx().catch(r=>console.warn("entity resolution",r)),requestAnimationFrame(Mf),requestAnimationFrame(()=>requestAnimationFrame(()=>{f.metrics.firstFrameAt=performance.now()})),f.metrics.readyAt=performance.now(),document.body.dataset.ready="1",await Hx().catch(r=>console.warn("map",r)),document.body.dataset.mapInit="1",await Gx(),document.body.dataset.viewsReady="1";{let r=me.get("focus");r&&al(r,{name:me.get("focusName")||"",geo:me.get("flat")?{lat:Number(me.get("flat")),lon:Number(me.get("flon"))}:null})}document.body.dataset.indexSearch="1"})().catch(e=>{console.error(e),oe("Failed to start: "+e.message)});
/*! For license information please see explore.js.LEGAL.txt */
//# sourceMappingURL=explore.js.map
