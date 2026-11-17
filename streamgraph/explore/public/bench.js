var Ys=Object.create;var Gr=Object.defineProperty;var Ks=Object.getOwnPropertyDescriptor;var Zs=Object.getOwnPropertyNames;var Qs=Object.getPrototypeOf,Js=Object.prototype.hasOwnProperty;var Mr=(a,n)=>()=>{try{return n||a((n={exports:{}}).exports,n),n.exports}catch(e){throw n=0,e}};var el=(a,n,e,t)=>{if(n&&typeof n=="object"||typeof n=="function")for(let r of Zs(n))!Js.call(a,r)&&r!==e&&Gr(a,r,{get:()=>n[r],enumerable:!(t=Ks(n,r))||t.enumerable});return a};var Ce=(a,n,e)=>(e=a!=null?Ys(Qs(a)):{},el(n||!a||!a.__esModule?Gr(e,"default",{value:a,enumerable:!0}):e,a));var je=Mr((kh,wa)=>{"use strict";var dt=typeof Reflect=="object"?Reflect:null,zr=dt&&typeof dt.apply=="function"?dt.apply:function(n,e,t){return Function.prototype.apply.call(n,e,t)},fn;dt&&typeof dt.ownKeys=="function"?fn=dt.ownKeys:Object.getOwnPropertySymbols?fn=function(n){return Object.getOwnPropertyNames(n).concat(Object.getOwnPropertySymbols(n))}:fn=function(n){return Object.getOwnPropertyNames(n)};function tl(a){console&&console.warn&&console.warn(a)}var Or=Number.isNaN||function(n){return n!==n};function J(){J.init.call(this)}wa.exports=J;wa.exports.once=il;J.EventEmitter=J;J.prototype._events=void 0;J.prototype._eventsCount=0;J.prototype._maxListeners=void 0;var Br=10;function gn(a){if(typeof a!="function")throw new TypeError('The "listener" argument must be of type Function. Received type '+typeof a)}Object.defineProperty(J,"defaultMaxListeners",{enumerable:!0,get:function(){return Br},set:function(a){if(typeof a!="number"||a<0||Or(a))throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received '+a+".");Br=a}});J.init=function(){(this._events===void 0||this._events===Object.getPrototypeOf(this)._events)&&(this._events=Object.create(null),this._eventsCount=0),this._maxListeners=this._maxListeners||void 0};J.prototype.setMaxListeners=function(n){if(typeof n!="number"||n<0||Or(n))throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received '+n+".");return this._maxListeners=n,this};function Wr(a){return a._maxListeners===void 0?J.defaultMaxListeners:a._maxListeners}J.prototype.getMaxListeners=function(){return Wr(this)};J.prototype.emit=function(n){for(var e=[],t=1;t<arguments.length;t++)e.push(arguments[t]);var r=n==="error",i=this._events;if(i!==void 0)r=r&&i.error===void 0;else if(!r)return!1;if(r){var o;if(e.length>0&&(o=e[0]),o instanceof Error)throw o;var s=new Error("Unhandled error."+(o?" ("+o.message+")":""));throw s.context=o,s}var l=i[n];if(l===void 0)return!1;if(typeof l=="function")zr(l,this,e);else for(var u=l.length,d=qr(l,u),t=0;t<u;++t)zr(d[t],this,e);return!0};function Ur(a,n,e,t){var r,i,o;if(gn(e),i=a._events,i===void 0?(i=a._events=Object.create(null),a._eventsCount=0):(i.newListener!==void 0&&(a.emit("newListener",n,e.listener?e.listener:e),i=a._events),o=i[n]),o===void 0)o=i[n]=e,++a._eventsCount;else if(typeof o=="function"?o=i[n]=t?[e,o]:[o,e]:t?o.unshift(e):o.push(e),r=Wr(a),r>0&&o.length>r&&!o.warned){o.warned=!0;var s=new Error("Possible EventEmitter memory leak detected. "+o.length+" "+String(n)+" listeners added. Use emitter.setMaxListeners() to increase limit");s.name="MaxListenersExceededWarning",s.emitter=a,s.type=n,s.count=o.length,tl(s)}return a}J.prototype.addListener=function(n,e){return Ur(this,n,e,!1)};J.prototype.on=J.prototype.addListener;J.prototype.prependListener=function(n,e){return Ur(this,n,e,!0)};function nl(){if(!this.fired)return this.target.removeListener(this.type,this.wrapFn),this.fired=!0,arguments.length===0?this.listener.call(this.target):this.listener.apply(this.target,arguments)}function Hr(a,n,e){var t={fired:!1,wrapFn:void 0,target:a,type:n,listener:e},r=nl.bind(t);return r.listener=e,t.wrapFn=r,r}J.prototype.once=function(n,e){return gn(e),this.on(n,Hr(this,n,e)),this};J.prototype.prependOnceListener=function(n,e){return gn(e),this.prependListener(n,Hr(this,n,e)),this};J.prototype.removeListener=function(n,e){var t,r,i,o,s;if(gn(e),r=this._events,r===void 0)return this;if(t=r[n],t===void 0)return this;if(t===e||t.listener===e)--this._eventsCount===0?this._events=Object.create(null):(delete r[n],r.removeListener&&this.emit("removeListener",n,t.listener||e));else if(typeof t!="function"){for(i=-1,o=t.length-1;o>=0;o--)if(t[o]===e||t[o].listener===e){s=t[o].listener,i=o;break}if(i<0)return this;i===0?t.shift():al(t,i),t.length===1&&(r[n]=t[0]),r.removeListener!==void 0&&this.emit("removeListener",n,s||e)}return this};J.prototype.off=J.prototype.removeListener;J.prototype.removeAllListeners=function(n){var e,t,r;if(t=this._events,t===void 0)return this;if(t.removeListener===void 0)return arguments.length===0?(this._events=Object.create(null),this._eventsCount=0):t[n]!==void 0&&(--this._eventsCount===0?this._events=Object.create(null):delete t[n]),this;if(arguments.length===0){var i=Object.keys(t),o;for(r=0;r<i.length;++r)o=i[r],o!=="removeListener"&&this.removeAllListeners(o);return this.removeAllListeners("removeListener"),this._events=Object.create(null),this._eventsCount=0,this}if(e=t[n],typeof e=="function")this.removeListener(n,e);else if(e!==void 0)for(r=e.length-1;r>=0;r--)this.removeListener(n,e[r]);return this};function $r(a,n,e){var t=a._events;if(t===void 0)return[];var r=t[n];return r===void 0?[]:typeof r=="function"?e?[r.listener||r]:[r]:e?rl(r):qr(r,r.length)}J.prototype.listeners=function(n){return $r(this,n,!0)};J.prototype.rawListeners=function(n){return $r(this,n,!1)};J.listenerCount=function(a,n){return typeof a.listenerCount=="function"?a.listenerCount(n):Vr.call(a,n)};J.prototype.listenerCount=Vr;function Vr(a){var n=this._events;if(n!==void 0){var e=n[a];if(typeof e=="function")return 1;if(e!==void 0)return e.length}return 0}J.prototype.eventNames=function(){return this._eventsCount>0?fn(this._events):[]};function qr(a,n){for(var e=new Array(n),t=0;t<n;++t)e[t]=a[t];return e}function al(a,n){for(;n+1<a.length;n++)a[n]=a[n+1];a.pop()}function rl(a){for(var n=new Array(a.length),e=0;e<n.length;++e)n[e]=a[e].listener||a[e];return n}function il(a,n){return new Promise(function(e,t){function r(o){a.removeListener(n,i),t(o)}function i(){typeof a.removeListener=="function"&&a.removeListener("error",r),e([].slice.call(arguments))}jr(a,n,i,{once:!0}),n!=="error"&&ol(a,r,{once:!0})})}function ol(a,n,e){typeof a.on=="function"&&jr(a,"error",n,e)}function jr(a,n,e,t){if(typeof a.on=="function")t.once?a.once(n,e):a.on(n,e);else if(typeof a.addEventListener=="function")a.addEventListener(n,function r(i){t.once&&a.removeEventListener(n,r),e(i)});else throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type '+typeof a)}});var Gn=Mr((qh,ki)=>{ki.exports=function(n){return n!==null&&typeof n=="object"&&typeof n.addUndirectedEdgeWithKey=="function"&&typeof n.dropNode=="function"&&typeof n.multi=="boolean"}});var Zr=Ce(je(),1);function sl(){let a=arguments[0];for(let n=1,e=arguments.length;n<e;n++)if(arguments[n])for(let t in arguments[n])a[t]=arguments[n][t];return a}var ie=sl;typeof Object.assign=="function"&&(ie=Object.assign);function me(a,n,e,t){let r=a._nodes.get(n),i=null;return r&&(t==="mixed"?i=r.out&&r.out[e]||r.undirected&&r.undirected[e]:t==="directed"?i=r.out&&r.out[e]:i=r.undirected&&r.undirected[e]),i}function se(a){return typeof a=="object"&&a!==null}function Qr(a){let n;for(n in a)return!1;return!0}function ve(a,n,e){Object.defineProperty(a,n,{enumerable:!1,configurable:!1,writable:!0,value:e})}function _e(a,n,e){let t={enumerable:!0,configurable:!0};typeof e=="function"?t.get=e:(t.value=e,t.writable=!1),Object.defineProperty(a,n,t)}function Xr(a){return!(!se(a)||a.attributes&&!Array.isArray(a.attributes))}function ll(){let a=Math.floor(Math.random()*256)&255;return()=>a++}function Le(){let a=arguments,n=null,e=-1;return{[Symbol.iterator](){return this},next(){let t=null;do{if(n===null){if(e++,e>=a.length)return{done:!0};n=a[e][Symbol.iterator]()}if(t=n.next(),t.done){n=null;continue}break}while(!0);return t}}}function ht(){return{[Symbol.iterator](){return this},next(){return{done:!0}}}}var zt=class extends Error{constructor(n){super(),this.name="GraphError",this.message=n}},W=class a extends zt{constructor(n){super(n),this.name="InvalidArgumentsGraphError",typeof Error.captureStackTrace=="function"&&Error.captureStackTrace(this,a.prototype.constructor)}},O=class a extends zt{constructor(n){super(n),this.name="NotFoundGraphError",typeof Error.captureStackTrace=="function"&&Error.captureStackTrace(this,a.prototype.constructor)}},V=class a extends zt{constructor(n){super(n),this.name="UsageGraphError",typeof Error.captureStackTrace=="function"&&Error.captureStackTrace(this,a.prototype.constructor)}};function Jr(a,n){this.key=a,this.attributes=n,this.clear()}Jr.prototype.clear=function(){this.inDegree=0,this.outDegree=0,this.undirectedDegree=0,this.undirectedLoops=0,this.directedLoops=0,this.in={},this.out={},this.undirected={}};function ei(a,n){this.key=a,this.attributes=n,this.clear()}ei.prototype.clear=function(){this.inDegree=0,this.outDegree=0,this.directedLoops=0,this.in={},this.out={}};function ti(a,n){this.key=a,this.attributes=n,this.clear()}ti.prototype.clear=function(){this.undirectedDegree=0,this.undirectedLoops=0,this.undirected={}};function ft(a,n,e,t,r){this.key=n,this.attributes=r,this.undirected=a,this.source=e,this.target=t}ft.prototype.attach=function(){let a="out",n="in";this.undirected&&(a=n="undirected");let e=this.source.key,t=this.target.key;this.source[a][t]=this,!(this.undirected&&e===t)&&(this.target[n][e]=this)};ft.prototype.attachMulti=function(){let a="out",n="in",e=this.source.key,t=this.target.key;this.undirected&&(a=n="undirected");let r=this.source[a],i=r[t];if(typeof i>"u"){r[t]=this,this.undirected&&e===t||(this.target[n][e]=this);return}i.previous=this,this.next=i,r[t]=this,this.target[n][e]=this};ft.prototype.detach=function(){let a=this.source.key,n=this.target.key,e="out",t="in";this.undirected&&(e=t="undirected"),delete this.source[e][n],delete this.target[t][a]};ft.prototype.detachMulti=function(){let a=this.source.key,n=this.target.key,e="out",t="in";this.undirected&&(e=t="undirected"),this.previous===void 0?this.next===void 0?(delete this.source[e][n],delete this.target[t][a]):(this.next.previous=void 0,this.source[e][n]=this.next,this.target[t][a]=this.next):(this.previous.next=this.next,this.next!==void 0&&(this.next.previous=this.previous))};var ni=0,ai=1,ul=2,ri=3;function Pe(a,n,e,t,r,i,o){let s,l,u,d;if(t=""+t,e===ni){if(s=a._nodes.get(t),!s)throw new O(`Graph.${n}: could not find the "${t}" node in the graph.`);u=r,d=i}else if(e===ri){if(r=""+r,l=a._edges.get(r),!l)throw new O(`Graph.${n}: could not find the "${r}" edge in the graph.`);let c=l.source.key,f=l.target.key;if(t===c)s=l.target;else if(t===f)s=l.source;else throw new O(`Graph.${n}: the "${t}" node is not attached to the "${r}" edge (${c}, ${f}).`);u=i,d=o}else{if(l=a._edges.get(t),!l)throw new O(`Graph.${n}: could not find the "${t}" edge in the graph.`);e===ai?s=l.source:s=l.target,u=r,d=i}return[s,u,d]}function dl(a,n,e){a.prototype[n]=function(t,r,i){let[o,s]=Pe(this,n,e,t,r,i);return o.attributes[s]}}function cl(a,n,e){a.prototype[n]=function(t,r){let[i]=Pe(this,n,e,t,r);return i.attributes}}function hl(a,n,e){a.prototype[n]=function(t,r,i){let[o,s]=Pe(this,n,e,t,r,i);return o.attributes.hasOwnProperty(s)}}function fl(a,n,e){a.prototype[n]=function(t,r,i,o){let[s,l,u]=Pe(this,n,e,t,r,i,o);return s.attributes[l]=u,this.emit("nodeAttributesUpdated",{key:s.key,type:"set",attributes:s.attributes,name:l}),this}}function gl(a,n,e){a.prototype[n]=function(t,r,i,o){let[s,l,u]=Pe(this,n,e,t,r,i,o);if(typeof u!="function")throw new W(`Graph.${n}: updater should be a function.`);let d=s.attributes,c=u(d[l]);return d[l]=c,this.emit("nodeAttributesUpdated",{key:s.key,type:"set",attributes:s.attributes,name:l}),this}}function pl(a,n,e){a.prototype[n]=function(t,r,i){let[o,s]=Pe(this,n,e,t,r,i);return delete o.attributes[s],this.emit("nodeAttributesUpdated",{key:o.key,type:"remove",attributes:o.attributes,name:s}),this}}function vl(a,n,e){a.prototype[n]=function(t,r,i){let[o,s]=Pe(this,n,e,t,r,i);if(!se(s))throw new W(`Graph.${n}: provided attributes are not a plain object.`);return o.attributes=s,this.emit("nodeAttributesUpdated",{key:o.key,type:"replace",attributes:o.attributes}),this}}function ml(a,n,e){a.prototype[n]=function(t,r,i){let[o,s]=Pe(this,n,e,t,r,i);if(!se(s))throw new W(`Graph.${n}: provided attributes are not a plain object.`);return ie(o.attributes,s),this.emit("nodeAttributesUpdated",{key:o.key,type:"merge",attributes:o.attributes,data:s}),this}}function bl(a,n,e){a.prototype[n]=function(t,r,i){let[o,s]=Pe(this,n,e,t,r,i);if(typeof s!="function")throw new W(`Graph.${n}: provided updater is not a function.`);return o.attributes=s(o.attributes),this.emit("nodeAttributesUpdated",{key:o.key,type:"update",attributes:o.attributes}),this}}var yl=[{name:a=>`get${a}Attribute`,attacher:dl},{name:a=>`get${a}Attributes`,attacher:cl},{name:a=>`has${a}Attribute`,attacher:hl},{name:a=>`set${a}Attribute`,attacher:fl},{name:a=>`update${a}Attribute`,attacher:gl},{name:a=>`remove${a}Attribute`,attacher:pl},{name:a=>`replace${a}Attributes`,attacher:vl},{name:a=>`merge${a}Attributes`,attacher:ml},{name:a=>`update${a}Attributes`,attacher:bl}];function xl(a){yl.forEach(function({name:n,attacher:e}){e(a,n("Node"),ni),e(a,n("Source"),ai),e(a,n("Target"),ul),e(a,n("Opposite"),ri)})}function _l(a,n,e){a.prototype[n]=function(t,r){let i;if(this.type!=="mixed"&&e!=="mixed"&&e!==this.type)throw new V(`Graph.${n}: cannot find this type of edges in your ${this.type} graph.`);if(arguments.length>2){if(this.multi)throw new V(`Graph.${n}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`);let o=""+t,s=""+r;if(r=arguments[2],i=me(this,o,s,e),!i)throw new O(`Graph.${n}: could not find an edge for the given path ("${o}" - "${s}").`)}else{if(e!=="mixed")throw new V(`Graph.${n}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`);if(t=""+t,i=this._edges.get(t),!i)throw new O(`Graph.${n}: could not find the "${t}" edge in the graph.`)}return i.attributes[r]}}function Tl(a,n,e){a.prototype[n]=function(t){let r;if(this.type!=="mixed"&&e!=="mixed"&&e!==this.type)throw new V(`Graph.${n}: cannot find this type of edges in your ${this.type} graph.`);if(arguments.length>1){if(this.multi)throw new V(`Graph.${n}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`);let i=""+t,o=""+arguments[1];if(r=me(this,i,o,e),!r)throw new O(`Graph.${n}: could not find an edge for the given path ("${i}" - "${o}").`)}else{if(e!=="mixed")throw new V(`Graph.${n}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`);if(t=""+t,r=this._edges.get(t),!r)throw new O(`Graph.${n}: could not find the "${t}" edge in the graph.`)}return r.attributes}}function Sl(a,n,e){a.prototype[n]=function(t,r){let i;if(this.type!=="mixed"&&e!=="mixed"&&e!==this.type)throw new V(`Graph.${n}: cannot find this type of edges in your ${this.type} graph.`);if(arguments.length>2){if(this.multi)throw new V(`Graph.${n}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`);let o=""+t,s=""+r;if(r=arguments[2],i=me(this,o,s,e),!i)throw new O(`Graph.${n}: could not find an edge for the given path ("${o}" - "${s}").`)}else{if(e!=="mixed")throw new V(`Graph.${n}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`);if(t=""+t,i=this._edges.get(t),!i)throw new O(`Graph.${n}: could not find the "${t}" edge in the graph.`)}return i.attributes.hasOwnProperty(r)}}function El(a,n,e){a.prototype[n]=function(t,r,i){let o;if(this.type!=="mixed"&&e!=="mixed"&&e!==this.type)throw new V(`Graph.${n}: cannot find this type of edges in your ${this.type} graph.`);if(arguments.length>3){if(this.multi)throw new V(`Graph.${n}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`);let s=""+t,l=""+r;if(r=arguments[2],i=arguments[3],o=me(this,s,l,e),!o)throw new O(`Graph.${n}: could not find an edge for the given path ("${s}" - "${l}").`)}else{if(e!=="mixed")throw new V(`Graph.${n}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`);if(t=""+t,o=this._edges.get(t),!o)throw new O(`Graph.${n}: could not find the "${t}" edge in the graph.`)}return o.attributes[r]=i,this.emit("edgeAttributesUpdated",{key:o.key,type:"set",attributes:o.attributes,name:r}),this}}function Al(a,n,e){a.prototype[n]=function(t,r,i){let o;if(this.type!=="mixed"&&e!=="mixed"&&e!==this.type)throw new V(`Graph.${n}: cannot find this type of edges in your ${this.type} graph.`);if(arguments.length>3){if(this.multi)throw new V(`Graph.${n}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`);let s=""+t,l=""+r;if(r=arguments[2],i=arguments[3],o=me(this,s,l,e),!o)throw new O(`Graph.${n}: could not find an edge for the given path ("${s}" - "${l}").`)}else{if(e!=="mixed")throw new V(`Graph.${n}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`);if(t=""+t,o=this._edges.get(t),!o)throw new O(`Graph.${n}: could not find the "${t}" edge in the graph.`)}if(typeof i!="function")throw new W(`Graph.${n}: updater should be a function.`);return o.attributes[r]=i(o.attributes[r]),this.emit("edgeAttributesUpdated",{key:o.key,type:"set",attributes:o.attributes,name:r}),this}}function Rl(a,n,e){a.prototype[n]=function(t,r){let i;if(this.type!=="mixed"&&e!=="mixed"&&e!==this.type)throw new V(`Graph.${n}: cannot find this type of edges in your ${this.type} graph.`);if(arguments.length>2){if(this.multi)throw new V(`Graph.${n}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`);let o=""+t,s=""+r;if(r=arguments[2],i=me(this,o,s,e),!i)throw new O(`Graph.${n}: could not find an edge for the given path ("${o}" - "${s}").`)}else{if(e!=="mixed")throw new V(`Graph.${n}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`);if(t=""+t,i=this._edges.get(t),!i)throw new O(`Graph.${n}: could not find the "${t}" edge in the graph.`)}return delete i.attributes[r],this.emit("edgeAttributesUpdated",{key:i.key,type:"remove",attributes:i.attributes,name:r}),this}}function wl(a,n,e){a.prototype[n]=function(t,r){let i;if(this.type!=="mixed"&&e!=="mixed"&&e!==this.type)throw new V(`Graph.${n}: cannot find this type of edges in your ${this.type} graph.`);if(arguments.length>2){if(this.multi)throw new V(`Graph.${n}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`);let o=""+t,s=""+r;if(r=arguments[2],i=me(this,o,s,e),!i)throw new O(`Graph.${n}: could not find an edge for the given path ("${o}" - "${s}").`)}else{if(e!=="mixed")throw new V(`Graph.${n}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`);if(t=""+t,i=this._edges.get(t),!i)throw new O(`Graph.${n}: could not find the "${t}" edge in the graph.`)}if(!se(r))throw new W(`Graph.${n}: provided attributes are not a plain object.`);return i.attributes=r,this.emit("edgeAttributesUpdated",{key:i.key,type:"replace",attributes:i.attributes}),this}}function Dl(a,n,e){a.prototype[n]=function(t,r){let i;if(this.type!=="mixed"&&e!=="mixed"&&e!==this.type)throw new V(`Graph.${n}: cannot find this type of edges in your ${this.type} graph.`);if(arguments.length>2){if(this.multi)throw new V(`Graph.${n}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`);let o=""+t,s=""+r;if(r=arguments[2],i=me(this,o,s,e),!i)throw new O(`Graph.${n}: could not find an edge for the given path ("${o}" - "${s}").`)}else{if(e!=="mixed")throw new V(`Graph.${n}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`);if(t=""+t,i=this._edges.get(t),!i)throw new O(`Graph.${n}: could not find the "${t}" edge in the graph.`)}if(!se(r))throw new W(`Graph.${n}: provided attributes are not a plain object.`);return ie(i.attributes,r),this.emit("edgeAttributesUpdated",{key:i.key,type:"merge",attributes:i.attributes,data:r}),this}}function Cl(a,n,e){a.prototype[n]=function(t,r){let i;if(this.type!=="mixed"&&e!=="mixed"&&e!==this.type)throw new V(`Graph.${n}: cannot find this type of edges in your ${this.type} graph.`);if(arguments.length>2){if(this.multi)throw new V(`Graph.${n}: cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about.`);let o=""+t,s=""+r;if(r=arguments[2],i=me(this,o,s,e),!i)throw new O(`Graph.${n}: could not find an edge for the given path ("${o}" - "${s}").`)}else{if(e!=="mixed")throw new V(`Graph.${n}: calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type.`);if(t=""+t,i=this._edges.get(t),!i)throw new O(`Graph.${n}: could not find the "${t}" edge in the graph.`)}if(typeof r!="function")throw new W(`Graph.${n}: provided updater is not a function.`);return i.attributes=r(i.attributes),this.emit("edgeAttributesUpdated",{key:i.key,type:"update",attributes:i.attributes}),this}}var Ll=[{name:a=>`get${a}Attribute`,attacher:_l},{name:a=>`get${a}Attributes`,attacher:Tl},{name:a=>`has${a}Attribute`,attacher:Sl},{name:a=>`set${a}Attribute`,attacher:El},{name:a=>`update${a}Attribute`,attacher:Al},{name:a=>`remove${a}Attribute`,attacher:Rl},{name:a=>`replace${a}Attributes`,attacher:wl},{name:a=>`merge${a}Attributes`,attacher:Dl},{name:a=>`update${a}Attributes`,attacher:Cl}];function Pl(a){Ll.forEach(function({name:n,attacher:e}){e(a,n("Edge"),"mixed"),e(a,n("DirectedEdge"),"directed"),e(a,n("UndirectedEdge"),"undirected")})}var kl=[{name:"edges",type:"mixed"},{name:"inEdges",type:"directed",direction:"in"},{name:"outEdges",type:"directed",direction:"out"},{name:"inboundEdges",type:"mixed",direction:"in"},{name:"outboundEdges",type:"mixed",direction:"out"},{name:"directedEdges",type:"directed"},{name:"undirectedEdges",type:"undirected"}];function Fl(a,n,e,t){let r=!1;for(let i in n){if(i===t)continue;let o=n[i];if(r=e(o.key,o.attributes,o.source.key,o.target.key,o.source.attributes,o.target.attributes,o.undirected),a&&r)return o.key}}function Il(a,n,e,t){let r,i,o,s=!1;for(let l in n)if(l!==t){r=n[l];do{if(i=r.source,o=r.target,s=e(r.key,r.attributes,i.key,o.key,i.attributes,o.attributes,r.undirected),a&&s)return r.key;r=r.next}while(r!==void 0)}}function Da(a,n){let e=Object.keys(a),t=e.length,r,i=0;return{[Symbol.iterator](){return this},next(){do if(r)r=r.next;else{if(i>=t)return{done:!0};let o=e[i++];if(o===n){r=void 0;continue}r=a[o]}while(!r);return{done:!1,value:{edge:r.key,attributes:r.attributes,source:r.source.key,target:r.target.key,sourceAttributes:r.source.attributes,targetAttributes:r.target.attributes,undirected:r.undirected}}}}}function Nl(a,n,e,t){let r=n[e];if(!r)return;let i=r.source,o=r.target;if(t(r.key,r.attributes,i.key,o.key,i.attributes,o.attributes,r.undirected)&&a)return r.key}function Gl(a,n,e,t){let r=n[e];if(!r)return;let i=!1;do{if(i=t(r.key,r.attributes,r.source.key,r.target.key,r.source.attributes,r.target.attributes,r.undirected),a&&i)return r.key;r=r.next}while(r!==void 0)}function Ca(a,n){let e=a[n];if(e.next!==void 0)return{[Symbol.iterator](){return this},next(){if(!e)return{done:!0};let r={edge:e.key,attributes:e.attributes,source:e.source.key,target:e.target.key,sourceAttributes:e.source.attributes,targetAttributes:e.target.attributes,undirected:e.undirected};return e=e.next,{done:!1,value:r}}};let t=!1;return{[Symbol.iterator](){return this},next(){return t===!0?{done:!0}:(t=!0,{done:!1,value:{edge:e.key,attributes:e.attributes,source:e.source.key,target:e.target.key,sourceAttributes:e.source.attributes,targetAttributes:e.target.attributes,undirected:e.undirected}})}}}function Ml(a,n){if(a.size===0)return[];if(n==="mixed"||n===a.type)return Array.from(a._edges.keys());let e=n==="undirected"?a.undirectedSize:a.directedSize,t=new Array(e),r=n==="undirected",i=a._edges.values(),o=0,s,l;for(;s=i.next(),s.done!==!0;)l=s.value,l.undirected===r&&(t[o++]=l.key);return t}function ii(a,n,e,t){if(n.size===0)return;let r=e!=="mixed"&&e!==n.type,i=e==="undirected",o,s,l=!1,u=n._edges.values();for(;o=u.next(),o.done!==!0;){if(s=o.value,r&&s.undirected!==i)continue;let{key:d,attributes:c,source:f,target:h}=s;if(l=t(d,c,f.key,h.key,f.attributes,h.attributes,s.undirected),a&&l)return d}}function zl(a,n){if(a.size===0)return ht();let e=n!=="mixed"&&n!==a.type,t=n==="undirected",r=a._edges.values();return{[Symbol.iterator](){return this},next(){let i,o;for(;;){if(i=r.next(),i.done)return i;if(o=i.value,!(e&&o.undirected!==t))break}return{value:{edge:o.key,attributes:o.attributes,source:o.source.key,target:o.target.key,sourceAttributes:o.source.attributes,targetAttributes:o.target.attributes,undirected:o.undirected},done:!1}}}}function La(a,n,e,t,r,i){let o=n?Il:Fl,s;if(e!=="undirected"&&(t!=="out"&&(s=o(a,r.in,i),a&&s)||t!=="in"&&(s=o(a,r.out,i,t?void 0:r.key),a&&s))||e!=="directed"&&(s=o(a,r.undirected,i),a&&s))return s}function Bl(a,n,e,t){let r=[];return La(!1,a,n,e,t,function(i){r.push(i)}),r}function Ol(a,n,e){let t=ht();return a!=="undirected"&&(n!=="out"&&typeof e.in<"u"&&(t=Le(t,Da(e.in))),n!=="in"&&typeof e.out<"u"&&(t=Le(t,Da(e.out,n?void 0:e.key)))),a!=="directed"&&typeof e.undirected<"u"&&(t=Le(t,Da(e.undirected))),t}function Pa(a,n,e,t,r,i,o){let s=e?Gl:Nl,l;if(n!=="undirected"&&(typeof r.in<"u"&&t!=="out"&&(l=s(a,r.in,i,o),a&&l)||typeof r.out<"u"&&t!=="in"&&(t||r.key!==i)&&(l=s(a,r.out,i,o),a&&l))||n!=="directed"&&typeof r.undirected<"u"&&(l=s(a,r.undirected,i,o),a&&l))return l}function Wl(a,n,e,t,r){let i=[];return Pa(!1,a,n,e,t,r,function(o){i.push(o)}),i}function Ul(a,n,e,t){let r=ht();return a!=="undirected"&&(typeof e.in<"u"&&n!=="out"&&t in e.in&&(r=Le(r,Ca(e.in,t))),typeof e.out<"u"&&n!=="in"&&t in e.out&&(n||e.key!==t)&&(r=Le(r,Ca(e.out,t)))),a!=="directed"&&typeof e.undirected<"u"&&t in e.undirected&&(r=Le(r,Ca(e.undirected,t))),r}function Hl(a,n){let{name:e,type:t,direction:r}=n;a.prototype[e]=function(i,o){if(t!=="mixed"&&this.type!=="mixed"&&t!==this.type)return[];if(!arguments.length)return Ml(this,t);if(arguments.length===1){i=""+i;let s=this._nodes.get(i);if(typeof s>"u")throw new O(`Graph.${e}: could not find the "${i}" node in the graph.`);return Bl(this.multi,t==="mixed"?this.type:t,r,s)}if(arguments.length===2){i=""+i,o=""+o;let s=this._nodes.get(i);if(!s)throw new O(`Graph.${e}:  could not find the "${i}" source node in the graph.`);if(!this._nodes.has(o))throw new O(`Graph.${e}:  could not find the "${o}" target node in the graph.`);return Wl(t,this.multi,r,s,o)}throw new W(`Graph.${e}: too many arguments (expecting 0, 1 or 2 and got ${arguments.length}).`)}}function $l(a,n){let{name:e,type:t,direction:r}=n,i="forEach"+e[0].toUpperCase()+e.slice(1,-1);a.prototype[i]=function(u,d,c){if(!(t!=="mixed"&&this.type!=="mixed"&&t!==this.type)){if(arguments.length===1)return c=u,ii(!1,this,t,c);if(arguments.length===2){u=""+u,c=d;let f=this._nodes.get(u);if(typeof f>"u")throw new O(`Graph.${i}: could not find the "${u}" node in the graph.`);return La(!1,this.multi,t==="mixed"?this.type:t,r,f,c)}if(arguments.length===3){u=""+u,d=""+d;let f=this._nodes.get(u);if(!f)throw new O(`Graph.${i}:  could not find the "${u}" source node in the graph.`);if(!this._nodes.has(d))throw new O(`Graph.${i}:  could not find the "${d}" target node in the graph.`);return Pa(!1,t,this.multi,r,f,d,c)}throw new W(`Graph.${i}: too many arguments (expecting 1, 2 or 3 and got ${arguments.length}).`)}};let o="map"+e[0].toUpperCase()+e.slice(1);a.prototype[o]=function(){let u=Array.prototype.slice.call(arguments),d=u.pop(),c;if(u.length===0){let f=0;t!=="directed"&&(f+=this.undirectedSize),t!=="undirected"&&(f+=this.directedSize),c=new Array(f);let h=0;u.push((p,b,v,g,m,y,_)=>{c[h++]=d(p,b,v,g,m,y,_)})}else c=[],u.push((f,h,p,b,v,g,m)=>{c.push(d(f,h,p,b,v,g,m))});return this[i].apply(this,u),c};let s="filter"+e[0].toUpperCase()+e.slice(1);a.prototype[s]=function(){let u=Array.prototype.slice.call(arguments),d=u.pop(),c=[];return u.push((f,h,p,b,v,g,m)=>{d(f,h,p,b,v,g,m)&&c.push(f)}),this[i].apply(this,u),c};let l="reduce"+e[0].toUpperCase()+e.slice(1);a.prototype[l]=function(){let u=Array.prototype.slice.call(arguments);if(u.length<2||u.length>4)throw new W(`Graph.${l}: invalid number of arguments (expecting 2, 3 or 4 and got ${u.length}).`);if(typeof u[u.length-1]=="function"&&typeof u[u.length-2]!="function")throw new W(`Graph.${l}: missing initial value. You must provide it because the callback takes more than one argument and we cannot infer the initial value from the first iteration, as you could with a simple array.`);let d,c;u.length===2?(d=u[0],c=u[1],u=[]):u.length===3?(d=u[1],c=u[2],u=[u[0]]):u.length===4&&(d=u[2],c=u[3],u=[u[0],u[1]]);let f=c;return u.push((h,p,b,v,g,m,y)=>{f=d(f,h,p,b,v,g,m,y)}),this[i].apply(this,u),f}}function Vl(a,n){let{name:e,type:t,direction:r}=n,i="find"+e[0].toUpperCase()+e.slice(1,-1);a.prototype[i]=function(l,u,d){if(t!=="mixed"&&this.type!=="mixed"&&t!==this.type)return!1;if(arguments.length===1)return d=l,ii(!0,this,t,d);if(arguments.length===2){l=""+l,d=u;let c=this._nodes.get(l);if(typeof c>"u")throw new O(`Graph.${i}: could not find the "${l}" node in the graph.`);return La(!0,this.multi,t==="mixed"?this.type:t,r,c,d)}if(arguments.length===3){l=""+l,u=""+u;let c=this._nodes.get(l);if(!c)throw new O(`Graph.${i}:  could not find the "${l}" source node in the graph.`);if(!this._nodes.has(u))throw new O(`Graph.${i}:  could not find the "${u}" target node in the graph.`);return Pa(!0,t,this.multi,r,c,u,d)}throw new W(`Graph.${i}: too many arguments (expecting 1, 2 or 3 and got ${arguments.length}).`)};let o="some"+e[0].toUpperCase()+e.slice(1,-1);a.prototype[o]=function(){let l=Array.prototype.slice.call(arguments),u=l.pop();return l.push((c,f,h,p,b,v,g)=>u(c,f,h,p,b,v,g)),!!this[i].apply(this,l)};let s="every"+e[0].toUpperCase()+e.slice(1,-1);a.prototype[s]=function(){let l=Array.prototype.slice.call(arguments),u=l.pop();return l.push((c,f,h,p,b,v,g)=>!u(c,f,h,p,b,v,g)),!this[i].apply(this,l)}}function ql(a,n){let{name:e,type:t,direction:r}=n,i=e.slice(0,-1)+"Entries";a.prototype[i]=function(o,s){if(t!=="mixed"&&this.type!=="mixed"&&t!==this.type)return ht();if(!arguments.length)return zl(this,t);if(arguments.length===1){o=""+o;let l=this._nodes.get(o);if(!l)throw new O(`Graph.${i}: could not find the "${o}" node in the graph.`);return Ol(t,r,l)}if(arguments.length===2){o=""+o,s=""+s;let l=this._nodes.get(o);if(!l)throw new O(`Graph.${i}:  could not find the "${o}" source node in the graph.`);if(!this._nodes.has(s))throw new O(`Graph.${i}:  could not find the "${s}" target node in the graph.`);return Ul(t,r,l,s)}throw new W(`Graph.${i}: too many arguments (expecting 0, 1 or 2 and got ${arguments.length}).`)}}function jl(a){kl.forEach(n=>{Hl(a,n),$l(a,n),Vl(a,n),ql(a,n)})}var Xl=[{name:"neighbors",type:"mixed"},{name:"inNeighbors",type:"directed",direction:"in"},{name:"outNeighbors",type:"directed",direction:"out"},{name:"inboundNeighbors",type:"mixed",direction:"in"},{name:"outboundNeighbors",type:"mixed",direction:"out"},{name:"directedNeighbors",type:"directed"},{name:"undirectedNeighbors",type:"undirected"}];function _n(){this.A=null,this.B=null}_n.prototype.wrap=function(a){this.A===null?this.A=a:this.B===null&&(this.B=a)};_n.prototype.has=function(a){return this.A!==null&&a in this.A||this.B!==null&&a in this.B};function Gt(a,n,e,t,r){for(let i in t){let o=t[i],s=o.source,l=o.target,u=s===e?l:s;if(n&&n.has(u.key))continue;let d=r(u.key,u.attributes);if(a&&d)return u.key}}function ka(a,n,e,t,r){if(n!=="mixed"){if(n==="undirected")return Gt(a,null,t,t.undirected,r);if(typeof e=="string")return Gt(a,null,t,t[e],r)}let i=new _n,o;if(n!=="undirected"){if(e!=="out"){if(o=Gt(a,null,t,t.in,r),a&&o)return o;i.wrap(t.in)}if(e!=="in"){if(o=Gt(a,i,t,t.out,r),a&&o)return o;i.wrap(t.out)}}if(n!=="directed"&&(o=Gt(a,i,t,t.undirected,r),a&&o))return o}function Yl(a,n,e){if(a!=="mixed"){if(a==="undirected")return Object.keys(e.undirected);if(typeof n=="string")return Object.keys(e[n])}let t=[];return ka(!1,a,n,e,function(r){t.push(r)}),t}function Mt(a,n,e){let t=Object.keys(e),r=t.length,i=0;return{[Symbol.iterator](){return this},next(){let o=null;do{if(i>=r)return a&&a.wrap(e),{done:!0};let s=e[t[i++]],l=s.source,u=s.target;if(o=l===n?u:l,a&&a.has(o.key)){o=null;continue}}while(o===null);return{done:!1,value:{neighbor:o.key,attributes:o.attributes}}}}}function Kl(a,n,e){if(a!=="mixed"){if(a==="undirected")return Mt(null,e,e.undirected);if(typeof n=="string")return Mt(null,e,e[n])}let t=ht(),r=new _n;return a!=="undirected"&&(n!=="out"&&(t=Le(t,Mt(r,e,e.in))),n!=="in"&&(t=Le(t,Mt(r,e,e.out)))),a!=="directed"&&(t=Le(t,Mt(r,e,e.undirected))),t}function Zl(a,n){let{name:e,type:t,direction:r}=n;a.prototype[e]=function(i){if(t!=="mixed"&&this.type!=="mixed"&&t!==this.type)return[];i=""+i;let o=this._nodes.get(i);if(typeof o>"u")throw new O(`Graph.${e}: could not find the "${i}" node in the graph.`);return Yl(t==="mixed"?this.type:t,r,o)}}function Ql(a,n){let{name:e,type:t,direction:r}=n,i="forEach"+e[0].toUpperCase()+e.slice(1,-1);a.prototype[i]=function(u,d){if(t!=="mixed"&&this.type!=="mixed"&&t!==this.type)return;u=""+u;let c=this._nodes.get(u);if(typeof c>"u")throw new O(`Graph.${i}: could not find the "${u}" node in the graph.`);ka(!1,t==="mixed"?this.type:t,r,c,d)};let o="map"+e[0].toUpperCase()+e.slice(1);a.prototype[o]=function(u,d){let c=[];return this[i](u,(f,h)=>{c.push(d(f,h))}),c};let s="filter"+e[0].toUpperCase()+e.slice(1);a.prototype[s]=function(u,d){let c=[];return this[i](u,(f,h)=>{d(f,h)&&c.push(f)}),c};let l="reduce"+e[0].toUpperCase()+e.slice(1);a.prototype[l]=function(u,d,c){if(arguments.length<3)throw new W(`Graph.${l}: missing initial value. You must provide it because the callback takes more than one argument and we cannot infer the initial value from the first iteration, as you could with a simple array.`);let f=c;return this[i](u,(h,p)=>{f=d(f,h,p)}),f}}function Jl(a,n){let{name:e,type:t,direction:r}=n,i=e[0].toUpperCase()+e.slice(1,-1),o="find"+i;a.prototype[o]=function(u,d){if(t!=="mixed"&&this.type!=="mixed"&&t!==this.type)return;u=""+u;let c=this._nodes.get(u);if(typeof c>"u")throw new O(`Graph.${o}: could not find the "${u}" node in the graph.`);return ka(!0,t==="mixed"?this.type:t,r,c,d)};let s="some"+i;a.prototype[s]=function(u,d){return!!this[o](u,d)};let l="every"+i;a.prototype[l]=function(u,d){return!this[o](u,(f,h)=>!d(f,h))}}function eu(a,n){let{name:e,type:t,direction:r}=n,i=e.slice(0,-1)+"Entries";a.prototype[i]=function(o){if(t!=="mixed"&&this.type!=="mixed"&&t!==this.type)return ht();o=""+o;let s=this._nodes.get(o);if(typeof s>"u")throw new O(`Graph.${i}: could not find the "${o}" node in the graph.`);return Kl(t==="mixed"?this.type:t,r,s)}}function tu(a){Xl.forEach(n=>{Zl(a,n),Ql(a,n),Jl(a,n),eu(a,n)})}function pn(a,n,e,t,r){let i=t._nodes.values(),o=t.type,s,l,u,d,c,f,h;for(;s=i.next(),s.done!==!0;){let p=!1;if(l=s.value,o!=="undirected"){d=l.out;for(u in d){c=d[u];do{if(f=c.target,p=!0,h=r(l.key,f.key,l.attributes,f.attributes,c.key,c.attributes,c.undirected),a&&h)return c;c=c.next}while(c)}}if(o!=="directed"){d=l.undirected;for(u in d)if(!(n&&l.key>u)){c=d[u];do{if(f=c.target,f.key!==u&&(f=c.source),p=!0,h=r(l.key,f.key,l.attributes,f.attributes,c.key,c.attributes,c.undirected),a&&h)return c;c=c.next}while(c)}}if(e&&!p&&(h=r(l.key,null,l.attributes,null,null,null,null),a&&h))return null}}function nu(a,n){let e={key:a};return Qr(n.attributes)||(e.attributes=ie({},n.attributes)),e}function au(a,n,e){let t={key:n,source:e.source.key,target:e.target.key};return Qr(e.attributes)||(t.attributes=ie({},e.attributes)),a==="mixed"&&e.undirected&&(t.undirected=!0),t}function ru(a){if(!se(a))throw new W('Graph.import: invalid serialized node. A serialized node should be a plain object with at least a "key" property.');if(!("key"in a))throw new W("Graph.import: serialized node is missing its key.");if("attributes"in a&&(!se(a.attributes)||a.attributes===null))throw new W("Graph.import: invalid attributes. Attributes should be a plain object, null or omitted.")}function iu(a){if(!se(a))throw new W('Graph.import: invalid serialized edge. A serialized edge should be a plain object with at least a "source" & "target" property.');if(!("source"in a))throw new W("Graph.import: serialized edge is missing its source.");if(!("target"in a))throw new W("Graph.import: serialized edge is missing its target.");if("attributes"in a&&(!se(a.attributes)||a.attributes===null))throw new W("Graph.import: invalid attributes. Attributes should be a plain object, null or omitted.");if("undirected"in a&&typeof a.undirected!="boolean")throw new W("Graph.import: invalid undirectedness information. Undirected should be boolean or omitted.")}var ou=ll(),su=new Set(["directed","undirected","mixed"]),Yr=new Set(["domain","_events","_eventsCount","_maxListeners"]),lu=[{name:a=>`${a}Edge`,generateKey:!0},{name:a=>`${a}DirectedEdge`,generateKey:!0,type:"directed"},{name:a=>`${a}UndirectedEdge`,generateKey:!0,type:"undirected"},{name:a=>`${a}EdgeWithKey`},{name:a=>`${a}DirectedEdgeWithKey`,type:"directed"},{name:a=>`${a}UndirectedEdgeWithKey`,type:"undirected"}],uu={allowSelfLoops:!0,multi:!1,type:"mixed"};function du(a,n,e){if(e&&!se(e))throw new W(`Graph.addNode: invalid attributes. Expecting an object but got "${e}"`);if(n=""+n,e=e||{},a._nodes.has(n))throw new V(`Graph.addNode: the "${n}" node already exist in the graph.`);let t=new a.NodeDataClass(n,e);return a._nodes.set(n,t),a.emit("nodeAdded",{key:n,attributes:e}),t}function Kr(a,n,e){let t=new a.NodeDataClass(n,e);return a._nodes.set(n,t),a.emit("nodeAdded",{key:n,attributes:e}),t}function oi(a,n,e,t,r,i,o,s){if(!t&&a.type==="undirected")throw new V(`Graph.${n}: you cannot add a directed edge to an undirected graph. Use the #.addEdge or #.addUndirectedEdge instead.`);if(t&&a.type==="directed")throw new V(`Graph.${n}: you cannot add an undirected edge to a directed graph. Use the #.addEdge or #.addDirectedEdge instead.`);if(s&&!se(s))throw new W(`Graph.${n}: invalid attributes. Expecting an object but got "${s}"`);if(i=""+i,o=""+o,s=s||{},!a.allowSelfLoops&&i===o)throw new V(`Graph.${n}: source & target are the same ("${i}"), thus creating a loop explicitly forbidden by this graph 'allowSelfLoops' option set to false.`);let l=a._nodes.get(i),u=a._nodes.get(o);if(!l)throw new O(`Graph.${n}: source node "${i}" not found.`);if(!u)throw new O(`Graph.${n}: target node "${o}" not found.`);let d={key:null,undirected:t,source:i,target:o,attributes:s};if(e)r=a._edgeKeyGenerator();else if(r=""+r,a._edges.has(r))throw new V(`Graph.${n}: the "${r}" edge already exists in the graph.`);if(!a.multi&&(t?typeof l.undirected[o]<"u":typeof l.out[o]<"u"))throw new V(`Graph.${n}: an edge linking "${i}" to "${o}" already exists. If you really want to add multiple edges linking those nodes, you should create a multi graph by using the 'multi' option.`);let c=new ft(t,r,l,u,s);a._edges.set(r,c);let f=i===o;return t?(l.undirectedDegree++,u.undirectedDegree++,f&&(l.undirectedLoops++,a._undirectedSelfLoopCount++)):(l.outDegree++,u.inDegree++,f&&(l.directedLoops++,a._directedSelfLoopCount++)),a.multi?c.attachMulti():c.attach(),t?a._undirectedSize++:a._directedSize++,d.key=r,a.emit("edgeAdded",d),r}function cu(a,n,e,t,r,i,o,s,l){if(!t&&a.type==="undirected")throw new V(`Graph.${n}: you cannot merge/update a directed edge to an undirected graph. Use the #.mergeEdge/#.updateEdge or #.addUndirectedEdge instead.`);if(t&&a.type==="directed")throw new V(`Graph.${n}: you cannot merge/update an undirected edge to a directed graph. Use the #.mergeEdge/#.updateEdge or #.addDirectedEdge instead.`);if(s){if(l){if(typeof s!="function")throw new W(`Graph.${n}: invalid updater function. Expecting a function but got "${s}"`)}else if(!se(s))throw new W(`Graph.${n}: invalid attributes. Expecting an object but got "${s}"`)}i=""+i,o=""+o;let u;if(l&&(u=s,s=void 0),!a.allowSelfLoops&&i===o)throw new V(`Graph.${n}: source & target are the same ("${i}"), thus creating a loop explicitly forbidden by this graph 'allowSelfLoops' option set to false.`);let d=a._nodes.get(i),c=a._nodes.get(o),f,h;if(!e&&(f=a._edges.get(r),f)){if((f.source.key!==i||f.target.key!==o)&&(!t||f.source.key!==o||f.target.key!==i))throw new V(`Graph.${n}: inconsistency detected when attempting to merge the "${r}" edge with "${i}" source & "${o}" target vs. ("${f.source.key}", "${f.target.key}").`);h=f}if(!h&&!a.multi&&d&&(h=t?d.undirected[o]:d.out[o]),h){let m=[h.key,!1,!1,!1];if(l?!u:!s)return m;if(l){let y=h.attributes;h.attributes=u(y),a.emit("edgeAttributesUpdated",{type:"replace",key:h.key,attributes:h.attributes})}else ie(h.attributes,s),a.emit("edgeAttributesUpdated",{type:"merge",key:h.key,attributes:h.attributes,data:s});return m}s=s||{},l&&u&&(s=u(s));let p={key:null,undirected:t,source:i,target:o,attributes:s};if(e)r=a._edgeKeyGenerator();else if(r=""+r,a._edges.has(r))throw new V(`Graph.${n}: the "${r}" edge already exists in the graph.`);let b=!1,v=!1;d||(d=Kr(a,i,{}),b=!0,i===o&&(c=d,v=!0)),c||(c=Kr(a,o,{}),v=!0),f=new ft(t,r,d,c,s),a._edges.set(r,f);let g=i===o;return t?(d.undirectedDegree++,c.undirectedDegree++,g&&(d.undirectedLoops++,a._undirectedSelfLoopCount++)):(d.outDegree++,c.inDegree++,g&&(d.directedLoops++,a._directedSelfLoopCount++)),a.multi?f.attachMulti():f.attach(),t?a._undirectedSize++:a._directedSize++,p.key=r,a.emit("edgeAdded",p),[r,!0,b,v]}function ct(a,n){a._edges.delete(n.key);let{source:e,target:t,attributes:r}=n,i=n.undirected,o=e===t;i?(e.undirectedDegree--,t.undirectedDegree--,o&&(e.undirectedLoops--,a._undirectedSelfLoopCount--)):(e.outDegree--,t.inDegree--,o&&(e.directedLoops--,a._directedSelfLoopCount--)),a.multi?n.detachMulti():n.detach(),i?a._undirectedSize--:a._directedSize--,a.emit("edgeDropped",{key:n.key,attributes:r,source:e.key,target:t.key,undirected:i})}var ee=class a extends Zr.EventEmitter{constructor(n){if(super(),n=ie({},uu,n),typeof n.multi!="boolean")throw new W(`Graph.constructor: invalid 'multi' option. Expecting a boolean but got "${n.multi}".`);if(!su.has(n.type))throw new W(`Graph.constructor: invalid 'type' option. Should be one of "mixed", "directed" or "undirected" but got "${n.type}".`);if(typeof n.allowSelfLoops!="boolean")throw new W(`Graph.constructor: invalid 'allowSelfLoops' option. Expecting a boolean but got "${n.allowSelfLoops}".`);let e=n.type==="mixed"?Jr:n.type==="directed"?ei:ti;ve(this,"NodeDataClass",e);let t="geid_"+ou()+"_",r=0,i=()=>{let o;do o=t+r++;while(this._edges.has(o));return o};ve(this,"_attributes",{}),ve(this,"_nodes",new Map),ve(this,"_edges",new Map),ve(this,"_directedSize",0),ve(this,"_undirectedSize",0),ve(this,"_directedSelfLoopCount",0),ve(this,"_undirectedSelfLoopCount",0),ve(this,"_edgeKeyGenerator",i),ve(this,"_options",n),Yr.forEach(o=>ve(this,o,this[o])),_e(this,"order",()=>this._nodes.size),_e(this,"size",()=>this._edges.size),_e(this,"directedSize",()=>this._directedSize),_e(this,"undirectedSize",()=>this._undirectedSize),_e(this,"selfLoopCount",()=>this._directedSelfLoopCount+this._undirectedSelfLoopCount),_e(this,"directedSelfLoopCount",()=>this._directedSelfLoopCount),_e(this,"undirectedSelfLoopCount",()=>this._undirectedSelfLoopCount),_e(this,"multi",this._options.multi),_e(this,"type",this._options.type),_e(this,"allowSelfLoops",this._options.allowSelfLoops),_e(this,"implementation",()=>"graphology")}_resetInstanceCounters(){this._directedSize=0,this._undirectedSize=0,this._directedSelfLoopCount=0,this._undirectedSelfLoopCount=0}hasNode(n){return this._nodes.has(""+n)}hasDirectedEdge(n,e){if(this.type==="undirected")return!1;if(arguments.length===1){let t=""+n,r=this._edges.get(t);return!!r&&!r.undirected}else if(arguments.length===2){n=""+n,e=""+e;let t=this._nodes.get(n);return t?t.out.hasOwnProperty(e):!1}throw new W(`Graph.hasDirectedEdge: invalid arity (${arguments.length}, instead of 1 or 2). You can either ask for an edge id or for the existence of an edge between a source & a target.`)}hasUndirectedEdge(n,e){if(this.type==="directed")return!1;if(arguments.length===1){let t=""+n,r=this._edges.get(t);return!!r&&r.undirected}else if(arguments.length===2){n=""+n,e=""+e;let t=this._nodes.get(n);return t?t.undirected.hasOwnProperty(e):!1}throw new W(`Graph.hasDirectedEdge: invalid arity (${arguments.length}, instead of 1 or 2). You can either ask for an edge id or for the existence of an edge between a source & a target.`)}hasEdge(n,e){if(arguments.length===1){let t=""+n;return this._edges.has(t)}else if(arguments.length===2){n=""+n,e=""+e;let t=this._nodes.get(n);return t?typeof t.out<"u"&&t.out.hasOwnProperty(e)||typeof t.undirected<"u"&&t.undirected.hasOwnProperty(e):!1}throw new W(`Graph.hasEdge: invalid arity (${arguments.length}, instead of 1 or 2). You can either ask for an edge id or for the existence of an edge between a source & a target.`)}directedEdge(n,e){if(this.type==="undirected")return;if(n=""+n,e=""+e,this.multi)throw new V("Graph.directedEdge: this method is irrelevant with multigraphs since there might be multiple edges between source & target. See #.directedEdges instead.");let t=this._nodes.get(n);if(!t)throw new O(`Graph.directedEdge: could not find the "${n}" source node in the graph.`);if(!this._nodes.has(e))throw new O(`Graph.directedEdge: could not find the "${e}" target node in the graph.`);let r=t.out&&t.out[e]||void 0;if(r)return r.key}undirectedEdge(n,e){if(this.type==="directed")return;if(n=""+n,e=""+e,this.multi)throw new V("Graph.undirectedEdge: this method is irrelevant with multigraphs since there might be multiple edges between source & target. See #.undirectedEdges instead.");let t=this._nodes.get(n);if(!t)throw new O(`Graph.undirectedEdge: could not find the "${n}" source node in the graph.`);if(!this._nodes.has(e))throw new O(`Graph.undirectedEdge: could not find the "${e}" target node in the graph.`);let r=t.undirected&&t.undirected[e]||void 0;if(r)return r.key}edge(n,e){if(this.multi)throw new V("Graph.edge: this method is irrelevant with multigraphs since there might be multiple edges between source & target. See #.edges instead.");n=""+n,e=""+e;let t=this._nodes.get(n);if(!t)throw new O(`Graph.edge: could not find the "${n}" source node in the graph.`);if(!this._nodes.has(e))throw new O(`Graph.edge: could not find the "${e}" target node in the graph.`);let r=t.out&&t.out[e]||t.undirected&&t.undirected[e]||void 0;if(r)return r.key}areDirectedNeighbors(n,e){n=""+n,e=""+e;let t=this._nodes.get(n);if(!t)throw new O(`Graph.areDirectedNeighbors: could not find the "${n}" node in the graph.`);return this.type==="undirected"?!1:e in t.in||e in t.out}areOutNeighbors(n,e){n=""+n,e=""+e;let t=this._nodes.get(n);if(!t)throw new O(`Graph.areOutNeighbors: could not find the "${n}" node in the graph.`);return this.type==="undirected"?!1:e in t.out}areInNeighbors(n,e){n=""+n,e=""+e;let t=this._nodes.get(n);if(!t)throw new O(`Graph.areInNeighbors: could not find the "${n}" node in the graph.`);return this.type==="undirected"?!1:e in t.in}areUndirectedNeighbors(n,e){n=""+n,e=""+e;let t=this._nodes.get(n);if(!t)throw new O(`Graph.areUndirectedNeighbors: could not find the "${n}" node in the graph.`);return this.type==="directed"?!1:e in t.undirected}areNeighbors(n,e){n=""+n,e=""+e;let t=this._nodes.get(n);if(!t)throw new O(`Graph.areNeighbors: could not find the "${n}" node in the graph.`);return this.type!=="undirected"&&(e in t.in||e in t.out)||this.type!=="directed"&&e in t.undirected}areInboundNeighbors(n,e){n=""+n,e=""+e;let t=this._nodes.get(n);if(!t)throw new O(`Graph.areInboundNeighbors: could not find the "${n}" node in the graph.`);return this.type!=="undirected"&&e in t.in||this.type!=="directed"&&e in t.undirected}areOutboundNeighbors(n,e){n=""+n,e=""+e;let t=this._nodes.get(n);if(!t)throw new O(`Graph.areOutboundNeighbors: could not find the "${n}" node in the graph.`);return this.type!=="undirected"&&e in t.out||this.type!=="directed"&&e in t.undirected}inDegree(n){n=""+n;let e=this._nodes.get(n);if(!e)throw new O(`Graph.inDegree: could not find the "${n}" node in the graph.`);return this.type==="undirected"?0:e.inDegree}outDegree(n){n=""+n;let e=this._nodes.get(n);if(!e)throw new O(`Graph.outDegree: could not find the "${n}" node in the graph.`);return this.type==="undirected"?0:e.outDegree}directedDegree(n){n=""+n;let e=this._nodes.get(n);if(!e)throw new O(`Graph.directedDegree: could not find the "${n}" node in the graph.`);return this.type==="undirected"?0:e.inDegree+e.outDegree}undirectedDegree(n){n=""+n;let e=this._nodes.get(n);if(!e)throw new O(`Graph.undirectedDegree: could not find the "${n}" node in the graph.`);return this.type==="directed"?0:e.undirectedDegree}inboundDegree(n){n=""+n;let e=this._nodes.get(n);if(!e)throw new O(`Graph.inboundDegree: could not find the "${n}" node in the graph.`);let t=0;return this.type!=="directed"&&(t+=e.undirectedDegree),this.type!=="undirected"&&(t+=e.inDegree),t}outboundDegree(n){n=""+n;let e=this._nodes.get(n);if(!e)throw new O(`Graph.outboundDegree: could not find the "${n}" node in the graph.`);let t=0;return this.type!=="directed"&&(t+=e.undirectedDegree),this.type!=="undirected"&&(t+=e.outDegree),t}degree(n){n=""+n;let e=this._nodes.get(n);if(!e)throw new O(`Graph.degree: could not find the "${n}" node in the graph.`);let t=0;return this.type!=="directed"&&(t+=e.undirectedDegree),this.type!=="undirected"&&(t+=e.inDegree+e.outDegree),t}inDegreeWithoutSelfLoops(n){n=""+n;let e=this._nodes.get(n);if(!e)throw new O(`Graph.inDegreeWithoutSelfLoops: could not find the "${n}" node in the graph.`);return this.type==="undirected"?0:e.inDegree-e.directedLoops}outDegreeWithoutSelfLoops(n){n=""+n;let e=this._nodes.get(n);if(!e)throw new O(`Graph.outDegreeWithoutSelfLoops: could not find the "${n}" node in the graph.`);return this.type==="undirected"?0:e.outDegree-e.directedLoops}directedDegreeWithoutSelfLoops(n){n=""+n;let e=this._nodes.get(n);if(!e)throw new O(`Graph.directedDegreeWithoutSelfLoops: could not find the "${n}" node in the graph.`);return this.type==="undirected"?0:e.inDegree+e.outDegree-e.directedLoops*2}undirectedDegreeWithoutSelfLoops(n){n=""+n;let e=this._nodes.get(n);if(!e)throw new O(`Graph.undirectedDegreeWithoutSelfLoops: could not find the "${n}" node in the graph.`);return this.type==="directed"?0:e.undirectedDegree-e.undirectedLoops*2}inboundDegreeWithoutSelfLoops(n){n=""+n;let e=this._nodes.get(n);if(!e)throw new O(`Graph.inboundDegreeWithoutSelfLoops: could not find the "${n}" node in the graph.`);let t=0,r=0;return this.type!=="directed"&&(t+=e.undirectedDegree,r+=e.undirectedLoops*2),this.type!=="undirected"&&(t+=e.inDegree,r+=e.directedLoops),t-r}outboundDegreeWithoutSelfLoops(n){n=""+n;let e=this._nodes.get(n);if(!e)throw new O(`Graph.outboundDegreeWithoutSelfLoops: could not find the "${n}" node in the graph.`);let t=0,r=0;return this.type!=="directed"&&(t+=e.undirectedDegree,r+=e.undirectedLoops*2),this.type!=="undirected"&&(t+=e.outDegree,r+=e.directedLoops),t-r}degreeWithoutSelfLoops(n){n=""+n;let e=this._nodes.get(n);if(!e)throw new O(`Graph.degreeWithoutSelfLoops: could not find the "${n}" node in the graph.`);let t=0,r=0;return this.type!=="directed"&&(t+=e.undirectedDegree,r+=e.undirectedLoops*2),this.type!=="undirected"&&(t+=e.inDegree+e.outDegree,r+=e.directedLoops*2),t-r}source(n){n=""+n;let e=this._edges.get(n);if(!e)throw new O(`Graph.source: could not find the "${n}" edge in the graph.`);return e.source.key}target(n){n=""+n;let e=this._edges.get(n);if(!e)throw new O(`Graph.target: could not find the "${n}" edge in the graph.`);return e.target.key}extremities(n){n=""+n;let e=this._edges.get(n);if(!e)throw new O(`Graph.extremities: could not find the "${n}" edge in the graph.`);return[e.source.key,e.target.key]}opposite(n,e){n=""+n,e=""+e;let t=this._edges.get(e);if(!t)throw new O(`Graph.opposite: could not find the "${e}" edge in the graph.`);let r=t.source.key,i=t.target.key;if(n===r)return i;if(n===i)return r;throw new O(`Graph.opposite: the "${n}" node is not attached to the "${e}" edge (${r}, ${i}).`)}hasExtremity(n,e){n=""+n,e=""+e;let t=this._edges.get(n);if(!t)throw new O(`Graph.hasExtremity: could not find the "${n}" edge in the graph.`);return t.source.key===e||t.target.key===e}isUndirected(n){n=""+n;let e=this._edges.get(n);if(!e)throw new O(`Graph.isUndirected: could not find the "${n}" edge in the graph.`);return e.undirected}isDirected(n){n=""+n;let e=this._edges.get(n);if(!e)throw new O(`Graph.isDirected: could not find the "${n}" edge in the graph.`);return!e.undirected}isSelfLoop(n){n=""+n;let e=this._edges.get(n);if(!e)throw new O(`Graph.isSelfLoop: could not find the "${n}" edge in the graph.`);return e.source===e.target}addNode(n,e){return du(this,n,e).key}mergeNode(n,e){if(e&&!se(e))throw new W(`Graph.mergeNode: invalid attributes. Expecting an object but got "${e}"`);n=""+n,e=e||{};let t=this._nodes.get(n);return t?(e&&(ie(t.attributes,e),this.emit("nodeAttributesUpdated",{type:"merge",key:n,attributes:t.attributes,data:e})),[n,!1]):(t=new this.NodeDataClass(n,e),this._nodes.set(n,t),this.emit("nodeAdded",{key:n,attributes:e}),[n,!0])}updateNode(n,e){if(e&&typeof e!="function")throw new W(`Graph.updateNode: invalid updater function. Expecting a function but got "${e}"`);n=""+n;let t=this._nodes.get(n);if(t){if(e){let i=t.attributes;t.attributes=e(i),this.emit("nodeAttributesUpdated",{type:"replace",key:n,attributes:t.attributes})}return[n,!1]}let r=e?e({}):{};return t=new this.NodeDataClass(n,r),this._nodes.set(n,t),this.emit("nodeAdded",{key:n,attributes:r}),[n,!0]}dropNode(n){n=""+n;let e=this._nodes.get(n);if(!e)throw new O(`Graph.dropNode: could not find the "${n}" node in the graph.`);let t;if(this.type!=="undirected"){for(let r in e.out){t=e.out[r];do ct(this,t),t=t.next;while(t)}for(let r in e.in){t=e.in[r];do ct(this,t),t=t.next;while(t)}}if(this.type!=="directed")for(let r in e.undirected){t=e.undirected[r];do ct(this,t),t=t.next;while(t)}this._nodes.delete(n),this.emit("nodeDropped",{key:n,attributes:e.attributes})}dropEdge(n){let e;if(arguments.length>1){let t=""+arguments[0],r=""+arguments[1];if(e=me(this,t,r,this.type),!e)throw new O(`Graph.dropEdge: could not find the "${t}" -> "${r}" edge in the graph.`)}else if(n=""+n,e=this._edges.get(n),!e)throw new O(`Graph.dropEdge: could not find the "${n}" edge in the graph.`);return ct(this,e),this}dropDirectedEdge(n,e){if(arguments.length<2)throw new V("Graph.dropDirectedEdge: it does not make sense to try and drop a directed edge by key. What if the edge with this key is undirected? Use #.dropEdge for this purpose instead.");if(this.multi)throw new V("Graph.dropDirectedEdge: cannot use a {source,target} combo when dropping an edge in a MultiGraph since we cannot infer the one you want to delete as there could be multiple ones.");n=""+n,e=""+e;let t=me(this,n,e,"directed");if(!t)throw new O(`Graph.dropDirectedEdge: could not find a "${n}" -> "${e}" edge in the graph.`);return ct(this,t),this}dropUndirectedEdge(n,e){if(arguments.length<2)throw new V("Graph.dropUndirectedEdge: it does not make sense to drop a directed edge by key. What if the edge with this key is undirected? Use #.dropEdge for this purpose instead.");if(this.multi)throw new V("Graph.dropUndirectedEdge: cannot use a {source,target} combo when dropping an edge in a MultiGraph since we cannot infer the one you want to delete as there could be multiple ones.");let t=me(this,n,e,"undirected");if(!t)throw new O(`Graph.dropUndirectedEdge: could not find a "${n}" -> "${e}" edge in the graph.`);return ct(this,t),this}clear(){this._edges.clear(),this._nodes.clear(),this._resetInstanceCounters(),this.emit("cleared")}clearEdges(){let n=this._nodes.values(),e;for(;e=n.next(),e.done!==!0;)e.value.clear();this._edges.clear(),this._resetInstanceCounters(),this.emit("edgesCleared")}getAttribute(n){return this._attributes[n]}getAttributes(){return this._attributes}hasAttribute(n){return this._attributes.hasOwnProperty(n)}setAttribute(n,e){return this._attributes[n]=e,this.emit("attributesUpdated",{type:"set",attributes:this._attributes,name:n}),this}updateAttribute(n,e){if(typeof e!="function")throw new W("Graph.updateAttribute: updater should be a function.");let t=this._attributes[n];return this._attributes[n]=e(t),this.emit("attributesUpdated",{type:"set",attributes:this._attributes,name:n}),this}removeAttribute(n){return delete this._attributes[n],this.emit("attributesUpdated",{type:"remove",attributes:this._attributes,name:n}),this}replaceAttributes(n){if(!se(n))throw new W("Graph.replaceAttributes: provided attributes are not a plain object.");return this._attributes=n,this.emit("attributesUpdated",{type:"replace",attributes:this._attributes}),this}mergeAttributes(n){if(!se(n))throw new W("Graph.mergeAttributes: provided attributes are not a plain object.");return ie(this._attributes,n),this.emit("attributesUpdated",{type:"merge",attributes:this._attributes,data:n}),this}updateAttributes(n){if(typeof n!="function")throw new W("Graph.updateAttributes: provided updater is not a function.");return this._attributes=n(this._attributes),this.emit("attributesUpdated",{type:"update",attributes:this._attributes}),this}updateEachNodeAttributes(n,e){if(typeof n!="function")throw new W("Graph.updateEachNodeAttributes: expecting an updater function.");if(e&&!Xr(e))throw new W("Graph.updateEachNodeAttributes: invalid hints. Expecting an object having the following shape: {attributes?: [string]}");let t=this._nodes.values(),r,i;for(;r=t.next(),r.done!==!0;)i=r.value,i.attributes=n(i.key,i.attributes);this.emit("eachNodeAttributesUpdated",{hints:e||null})}updateEachEdgeAttributes(n,e){if(typeof n!="function")throw new W("Graph.updateEachEdgeAttributes: expecting an updater function.");if(e&&!Xr(e))throw new W("Graph.updateEachEdgeAttributes: invalid hints. Expecting an object having the following shape: {attributes?: [string]}");let t=this._edges.values(),r,i,o,s;for(;r=t.next(),r.done!==!0;)i=r.value,o=i.source,s=i.target,i.attributes=n(i.key,i.attributes,o.key,s.key,o.attributes,s.attributes,i.undirected);this.emit("eachEdgeAttributesUpdated",{hints:e||null})}forEachAdjacencyEntry(n){if(typeof n!="function")throw new W("Graph.forEachAdjacencyEntry: expecting a callback.");pn(!1,!1,!1,this,n)}forEachAdjacencyEntryWithOrphans(n){if(typeof n!="function")throw new W("Graph.forEachAdjacencyEntryWithOrphans: expecting a callback.");pn(!1,!1,!0,this,n)}forEachAssymetricAdjacencyEntry(n){if(typeof n!="function")throw new W("Graph.forEachAssymetricAdjacencyEntry: expecting a callback.");pn(!1,!0,!1,this,n)}forEachAssymetricAdjacencyEntryWithOrphans(n){if(typeof n!="function")throw new W("Graph.forEachAssymetricAdjacencyEntryWithOrphans: expecting a callback.");pn(!1,!0,!0,this,n)}nodes(){return Array.from(this._nodes.keys())}forEachNode(n){if(typeof n!="function")throw new W("Graph.forEachNode: expecting a callback.");let e=this._nodes.values(),t,r;for(;t=e.next(),t.done!==!0;)r=t.value,n(r.key,r.attributes)}findNode(n){if(typeof n!="function")throw new W("Graph.findNode: expecting a callback.");let e=this._nodes.values(),t,r;for(;t=e.next(),t.done!==!0;)if(r=t.value,n(r.key,r.attributes))return r.key}mapNodes(n){if(typeof n!="function")throw new W("Graph.mapNode: expecting a callback.");let e=this._nodes.values(),t,r,i=new Array(this.order),o=0;for(;t=e.next(),t.done!==!0;)r=t.value,i[o++]=n(r.key,r.attributes);return i}someNode(n){if(typeof n!="function")throw new W("Graph.someNode: expecting a callback.");let e=this._nodes.values(),t,r;for(;t=e.next(),t.done!==!0;)if(r=t.value,n(r.key,r.attributes))return!0;return!1}everyNode(n){if(typeof n!="function")throw new W("Graph.everyNode: expecting a callback.");let e=this._nodes.values(),t,r;for(;t=e.next(),t.done!==!0;)if(r=t.value,!n(r.key,r.attributes))return!1;return!0}filterNodes(n){if(typeof n!="function")throw new W("Graph.filterNodes: expecting a callback.");let e=this._nodes.values(),t,r,i=[];for(;t=e.next(),t.done!==!0;)r=t.value,n(r.key,r.attributes)&&i.push(r.key);return i}reduceNodes(n,e){if(typeof n!="function")throw new W("Graph.reduceNodes: expecting a callback.");if(arguments.length<2)throw new W("Graph.reduceNodes: missing initial value. You must provide it because the callback takes more than one argument and we cannot infer the initial value from the first iteration, as you could with a simple array.");let t=e,r=this._nodes.values(),i,o;for(;i=r.next(),i.done!==!0;)o=i.value,t=n(t,o.key,o.attributes);return t}nodeEntries(){let n=this._nodes.values();return{[Symbol.iterator](){return this},next(){let e=n.next();if(e.done)return e;let t=e.value;return{value:{node:t.key,attributes:t.attributes},done:!1}}}}export(){let n=new Array(this._nodes.size),e=0;this._nodes.forEach((r,i)=>{n[e++]=nu(i,r)});let t=new Array(this._edges.size);return e=0,this._edges.forEach((r,i)=>{t[e++]=au(this.type,i,r)}),{options:{type:this.type,multi:this.multi,allowSelfLoops:this.allowSelfLoops},attributes:this.getAttributes(),nodes:n,edges:t}}import(n,e=!1){if(n instanceof a)return n.forEachNode((l,u)=>{e?this.mergeNode(l,u):this.addNode(l,u)}),n.forEachEdge((l,u,d,c,f,h,p)=>{e?p?this.mergeUndirectedEdgeWithKey(l,d,c,u):this.mergeDirectedEdgeWithKey(l,d,c,u):p?this.addUndirectedEdgeWithKey(l,d,c,u):this.addDirectedEdgeWithKey(l,d,c,u)}),this;if(!se(n))throw new W("Graph.import: invalid argument. Expecting a serialized graph or, alternatively, a Graph instance.");if(n.attributes){if(!se(n.attributes))throw new W("Graph.import: invalid attributes. Expecting a plain object.");e?this.mergeAttributes(n.attributes):this.replaceAttributes(n.attributes)}let t,r,i,o,s;if(n.nodes){if(i=n.nodes,!Array.isArray(i))throw new W("Graph.import: invalid nodes. Expecting an array.");for(t=0,r=i.length;t<r;t++){o=i[t],ru(o);let{key:l,attributes:u}=o;e?this.mergeNode(l,u):this.addNode(l,u)}}if(n.edges){let l=!1;if(this.type==="undirected"&&(l=!0),i=n.edges,!Array.isArray(i))throw new W("Graph.import: invalid edges. Expecting an array.");for(t=0,r=i.length;t<r;t++){s=i[t],iu(s);let{source:u,target:d,attributes:c,undirected:f=l}=s,h;"key"in s?(h=e?f?this.mergeUndirectedEdgeWithKey:this.mergeDirectedEdgeWithKey:f?this.addUndirectedEdgeWithKey:this.addDirectedEdgeWithKey,h.call(this,s.key,u,d,c)):(h=e?f?this.mergeUndirectedEdge:this.mergeDirectedEdge:f?this.addUndirectedEdge:this.addDirectedEdge,h.call(this,u,d,c))}}return this}nullCopy(n){let e=new a(ie({},this._options,n));return e.replaceAttributes(ie({},this.getAttributes())),e}emptyCopy(n){let e=this.nullCopy(n);return this._nodes.forEach((t,r)=>{let i=ie({},t.attributes);t=new e.NodeDataClass(r,i),e._nodes.set(r,t)}),e}copy(n){if(n=n||{},typeof n.type=="string"&&n.type!==this.type&&n.type!=="mixed")throw new V(`Graph.copy: cannot create an incompatible copy from "${this.type}" type to "${n.type}" because this would mean losing information about the current graph.`);if(typeof n.multi=="boolean"&&n.multi!==this.multi&&n.multi!==!0)throw new V("Graph.copy: cannot create an incompatible copy by downgrading a multi graph to a simple one because this would mean losing information about the current graph.");if(typeof n.allowSelfLoops=="boolean"&&n.allowSelfLoops!==this.allowSelfLoops&&n.allowSelfLoops!==!0)throw new V("Graph.copy: cannot create an incompatible copy from a graph allowing self loops to one that does not because this would mean losing information about the current graph.");let e=this.emptyCopy(n),t=this._edges.values(),r,i;for(;r=t.next(),r.done!==!0;)i=r.value,oi(e,"copy",!1,i.undirected,i.key,i.source.key,i.target.key,ie({},i.attributes));return e}toJSON(){return this.export()}toString(){return"[object Graph]"}inspect(){let n={};this._nodes.forEach((i,o)=>{n[o]=i.attributes});let e={},t={};this._edges.forEach((i,o)=>{let s=i.undirected?"--":"->",l="",u=i.source.key,d=i.target.key,c;i.undirected&&u>d&&(c=u,u=d,d=c);let f=`(${u})${s}(${d})`;o.startsWith("geid_")?this.multi&&(typeof t[f]>"u"?t[f]=0:t[f]++,l+=`${t[f]}. `):l+=`[${o}]: `,l+=f,e[l]=i.attributes});let r={};for(let i in this)this.hasOwnProperty(i)&&!Yr.has(i)&&typeof this[i]!="function"&&typeof i!="symbol"&&(r[i]=this[i]);return r.attributes=this._attributes,r.nodes=n,r.edges=e,ve(r,"constructor",this.constructor),r}};typeof Symbol<"u"&&(ee.prototype[Symbol.for("nodejs.util.inspect.custom")]=ee.prototype.inspect);lu.forEach(a=>{["add","merge","update"].forEach(n=>{let e=a.name(n),t=n==="add"?oi:cu;a.generateKey?ee.prototype[e]=function(r,i,o){return t(this,e,!0,(a.type||this.type)==="undirected",null,r,i,o,n==="update")}:ee.prototype[e]=function(r,i,o,s){return t(this,e,!1,(a.type||this.type)==="undirected",r,i,o,s,n==="update")}})});xl(ee);Pl(ee);jl(ee);tu(ee);var vn=class extends ee{constructor(n){let e=ie({type:"directed"},n);if("multi"in e&&e.multi!==!1)throw new W("DirectedGraph.from: inconsistent indication that the graph should be multi in given options!");if(e.type!=="directed")throw new W('DirectedGraph.from: inconsistent "'+e.type+'" type in given options!');super(e)}},mn=class extends ee{constructor(n){let e=ie({type:"undirected"},n);if("multi"in e&&e.multi!==!1)throw new W("UndirectedGraph.from: inconsistent indication that the graph should be multi in given options!");if(e.type!=="undirected")throw new W('UndirectedGraph.from: inconsistent "'+e.type+'" type in given options!');super(e)}},bn=class extends ee{constructor(n){let e=ie({multi:!0},n);if("multi"in e&&e.multi!==!0)throw new W("MultiGraph.from: inconsistent indication that the graph should be simple in given options!");super(e)}},yn=class extends ee{constructor(n){let e=ie({type:"directed",multi:!0},n);if("multi"in e&&e.multi!==!0)throw new W("MultiDirectedGraph.from: inconsistent indication that the graph should be simple in given options!");if(e.type!=="directed")throw new W('MultiDirectedGraph.from: inconsistent "'+e.type+'" type in given options!');super(e)}},xn=class extends ee{constructor(n){let e=ie({type:"undirected",multi:!0},n);if("multi"in e&&e.multi!==!0)throw new W("MultiUndirectedGraph.from: inconsistent indication that the graph should be simple in given options!");if(e.type!=="undirected")throw new W('MultiUndirectedGraph.from: inconsistent "'+e.type+'" type in given options!');super(e)}};function gt(a){a.from=function(n,e){let t=ie({},n.options,e),r=new a(t);return r.import(n),r}}gt(ee);gt(vn);gt(mn);gt(bn);gt(yn);gt(xn);ee.Graph=ee;ee.DirectedGraph=vn;ee.UndirectedGraph=mn;ee.MultiGraph=bn;ee.MultiDirectedGraph=yn;ee.MultiUndirectedGraph=xn;ee.InvalidArgumentsGraphError=W;ee.NotFoundGraphError=O;ee.UsageGraphError=V;function Sn(a,n){(n==null||n>a.length)&&(n=a.length);for(var e=0,t=Array(n);e<n;e++)t[e]=a[e];return t}function En(a,n){if(a){if(typeof a=="string")return Sn(a,n);var e={}.toString.call(a).slice(8,-1);return e==="Object"&&a.constructor&&(e=a.constructor.name),e==="Map"||e==="Set"?Array.from(a):e==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(e)?Sn(a,n):void 0}}function hu(a){if(Array.isArray(a))return a}function fu(a,n){var e=a==null?null:typeof Symbol<"u"&&a[Symbol.iterator]||a["@@iterator"];if(e!=null){var t,r,i,o,s=[],l=!0,u=!1;try{if(i=(e=e.call(a)).next,n===0){if(Object(e)!==e)return;l=!1}else for(;!(l=(t=i.call(e)).done)&&(s.push(t.value),s.length!==n);l=!0);}catch(d){u=!0,r=d}finally{try{if(!l&&e.return!=null&&(o=e.return(),Object(o)!==o))return}finally{if(u)throw r}}return s}}function gu(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function Q(a,n){return hu(a)||fu(a,n)||En(a,n)||gu()}function z(a,n){var e=typeof Symbol<"u"&&a[Symbol.iterator]||a["@@iterator"];if(!e){if(Array.isArray(a)||(e=En(a))||n&&a&&typeof a.length=="number"){e&&(a=e);var t=0,r=function(){};return{s:r,n:function(){return t>=a.length?{done:!0}:{done:!1,value:a[t++]}},e:function(l){throw l},f:r}}throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}var i,o=!0,s=!1;return{s:function(){e=e.call(a)},n:function(){var l=e.next();return o=l.done,l},e:function(l){s=!0,i=l},f:function(){try{o||e.return==null||e.return()}finally{if(s)throw i}}}}function ce(){return Float32Array.of(1,0,0,0,1,0,0,0,1)}function Ot(a,n,e){return a[0]=n,a[4]=typeof e=="number"?e:n,a}function Fa(a,n){var e=Math.sin(n),t=Math.cos(n);return a[0]=t,a[1]=e,a[3]=-e,a[4]=t,a}function Ia(a,n,e){return a[6]=n,a[7]=e,a}function ke(a,n){var e=a[0],t=a[1],r=a[2],i=a[3],o=a[4],s=a[5],l=a[6],u=a[7],d=a[8],c=n[0],f=n[1],h=n[2],p=n[3],b=n[4],v=n[5],g=n[6],m=n[7],y=n[8];return a[0]=c*e+f*i+h*l,a[1]=c*t+f*o+h*u,a[2]=c*r+f*s+h*d,a[3]=p*e+b*i+v*l,a[4]=p*t+b*o+v*u,a[5]=p*r+b*s+v*d,a[6]=g*e+m*i+y*l,a[7]=g*t+m*o+y*u,a[8]=g*r+m*s+y*d,a}function An(a,n){var e=Math.cos(n),t=Math.sin(n);return{x:e*a.x+t*a.y,y:-t*a.x+e*a.y}}function Xe(a,n){var e=arguments.length>2&&arguments[2]!==void 0?arguments[2]:1,t=a[0],r=a[1],i=a[3],o=a[4],s=a[6],l=a[7],u=n.x,d=n.y;return{x:u*t+d*i+s*e,y:u*r+d*o+l*e}}function si(a,n){var e=a.height/a.width,t=n.height/n.width;return e<1&&t>1||e>1&&t<1?1:Math.min(Math.max(t,1/t),Math.max(1/e,e))}function Fe(a,n,e,t,r){var i=a.angle,o=a.ratio,s=a.x,l=a.y,u=n.width,d=n.height,c=ce(),f=Math.min(u,d)-2*t,h=si(n,e);return r?(ke(c,Ia(ce(),s,l)),ke(c,Ot(ce(),o)),ke(c,Fa(ce(),i)),ke(c,Ot(ce(),u/f/2/h,d/f/2/h))):(ke(c,Ot(ce(),2*(f/u)*h,2*(f/d)*h)),ke(c,Fa(ce(),-i)),ke(c,Ot(ce(),1/o)),ke(c,Ia(ce(),-s,-l))),c}function Na(a,n,e){var t=Xe(a,{x:Math.cos(n.angle),y:Math.sin(n.angle)},0),r=t.x,i=t.y;return 1/Math.sqrt(Math.pow(r,2)+Math.pow(i,2))/e.width}function Rn(a,n,e,t,r){var i=Math.floor(n/r*t),o=Math.floor(a.drawingBufferHeight/r-e/r*t);return[i,o]}var pt={black:"#000000",silver:"#C0C0C0",gray:"#808080",grey:"#808080",white:"#FFFFFF",maroon:"#800000",red:"#FF0000",purple:"#800080",fuchsia:"#FF00FF",green:"#008000",lime:"#00FF00",olive:"#808000",yellow:"#FFFF00",navy:"#000080",blue:"#0000FF",teal:"#008080",aqua:"#00FFFF",darkblue:"#00008B",mediumblue:"#0000CD",darkgreen:"#006400",darkcyan:"#008B8B",deepskyblue:"#00BFFF",darkturquoise:"#00CED1",mediumspringgreen:"#00FA9A",springgreen:"#00FF7F",cyan:"#00FFFF",midnightblue:"#191970",dodgerblue:"#1E90FF",lightseagreen:"#20B2AA",forestgreen:"#228B22",seagreen:"#2E8B57",darkslategray:"#2F4F4F",darkslategrey:"#2F4F4F",limegreen:"#32CD32",mediumseagreen:"#3CB371",turquoise:"#40E0D0",royalblue:"#4169E1",steelblue:"#4682B4",darkslateblue:"#483D8B",mediumturquoise:"#48D1CC",indigo:"#4B0082",darkolivegreen:"#556B2F",cadetblue:"#5F9EA0",cornflowerblue:"#6495ED",rebeccapurple:"#663399",mediumaquamarine:"#66CDAA",dimgray:"#696969",dimgrey:"#696969",slateblue:"#6A5ACD",olivedrab:"#6B8E23",slategray:"#708090",slategrey:"#708090",lightslategray:"#778899",lightslategrey:"#778899",mediumslateblue:"#7B68EE",lawngreen:"#7CFC00",chartreuse:"#7FFF00",aquamarine:"#7FFFD4",skyblue:"#87CEEB",lightskyblue:"#87CEFA",blueviolet:"#8A2BE2",darkred:"#8B0000",darkmagenta:"#8B008B",saddlebrown:"#8B4513",darkseagreen:"#8FBC8F",lightgreen:"#90EE90",mediumpurple:"#9370DB",darkviolet:"#9400D3",palegreen:"#98FB98",darkorchid:"#9932CC",yellowgreen:"#9ACD32",sienna:"#A0522D",brown:"#A52A2A",darkgray:"#A9A9A9",darkgrey:"#A9A9A9",lightblue:"#ADD8E6",greenyellow:"#ADFF2F",paleturquoise:"#AFEEEE",lightsteelblue:"#B0C4DE",powderblue:"#B0E0E6",firebrick:"#B22222",darkgoldenrod:"#B8860B",mediumorchid:"#BA55D3",rosybrown:"#BC8F8F",darkkhaki:"#BDB76B",mediumvioletred:"#C71585",indianred:"#CD5C5C",peru:"#CD853F",chocolate:"#D2691E",tan:"#D2B48C",lightgray:"#D3D3D3",lightgrey:"#D3D3D3",thistle:"#D8BFD8",orchid:"#DA70D6",goldenrod:"#DAA520",palevioletred:"#DB7093",crimson:"#DC143C",gainsboro:"#DCDCDC",plum:"#DDA0DD",burlywood:"#DEB887",lightcyan:"#E0FFFF",lavender:"#E6E6FA",darksalmon:"#E9967A",violet:"#EE82EE",palegoldenrod:"#EEE8AA",lightcoral:"#F08080",khaki:"#F0E68C",aliceblue:"#F0F8FF",honeydew:"#F0FFF0",azure:"#F0FFFF",sandybrown:"#F4A460",wheat:"#F5DEB3",beige:"#F5F5DC",whitesmoke:"#F5F5F5",mintcream:"#F5FFFA",ghostwhite:"#F8F8FF",salmon:"#FA8072",antiquewhite:"#FAEBD7",linen:"#FAF0E6",lightgoldenrodyellow:"#FAFAD2",oldlace:"#FDF5E6",magenta:"#FF00FF",deeppink:"#FF1493",orangered:"#FF4500",tomato:"#FF6347",hotpink:"#FF69B4",coral:"#FF7F50",darkorange:"#FF8C00",lightsalmon:"#FFA07A",orange:"#FFA500",lightpink:"#FFB6C1",pink:"#FFC0CB",gold:"#FFD700",peachpuff:"#FFDAB9",navajowhite:"#FFDEAD",moccasin:"#FFE4B5",bisque:"#FFE4C4",mistyrose:"#FFE4E1",blanchedalmond:"#FFEBCD",papayawhip:"#FFEFD5",lavenderblush:"#FFF0F5",seashell:"#FFF5EE",cornsilk:"#FFF8DC",lemonchiffon:"#FFFACD",floralwhite:"#FFFAF0",snow:"#FFFAFA",lightyellow:"#FFFFE0",ivory:"#FFFFF0"},li=new Int8Array(4),Tn=new Int32Array(li.buffer,0,1),ui=new Float32Array(li.buffer,0,1),pu=/^\s*rgba?\s*\(/,vu=/^\s*rgba?\s*\(\s*([0-9]*)\s*,\s*([0-9]*)\s*,\s*([0-9]*)(?:\s*,\s*(.*)?)?\)\s*$/;function Wt(a){var n=0,e=0,t=0,r=1,i=a.toLowerCase();if(i==="transparent")return{r:0,g:0,b:0,a:0};if(i in pt)return Wt(pt[i]);if(a[0]==="#")a.length===4?(n=parseInt(a.charAt(1)+a.charAt(1),16),e=parseInt(a.charAt(2)+a.charAt(2),16),t=parseInt(a.charAt(3)+a.charAt(3),16)):(n=parseInt(a.charAt(1)+a.charAt(2),16),e=parseInt(a.charAt(3)+a.charAt(4),16),t=parseInt(a.charAt(5)+a.charAt(6),16)),a.length===9&&(r=parseInt(a.charAt(7)+a.charAt(8),16)/255);else if(pu.test(a)){var o=a.match(vu);o&&(n=+o[1],e=+o[2],t=+o[3],o[4]&&(r=+o[4]))}return{r:n,g:e,b:t,a:r}}function Ut(a){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:!1,e=Wt(a),t=e.r,r=e.g,i=e.b,o=e.a;return n?[t/255*o,r/255*o,i/255*o,o]:[t/255,r/255,i/255,o]}var vt={};for(Bt in pt)vt[Bt]=he(pt[Bt]),vt[pt[Bt]]=vt[Bt];var Bt;function di(a,n,e,t,r){return Tn[0]=t<<24|e<<16|n<<8|a,r&&(Tn[0]=Tn[0]&4278190079),ui[0]}function he(a){if(a=a.toLowerCase(),typeof vt[a]<"u")return vt[a];var n=Wt(a),e=n.r,t=n.g,r=n.b,i=n.a;i=i*255|0;var o=di(e,t,r,i,!0);return vt[a]=o,o}function Ie(a,n){ui[0]=he(a);var e=Tn[0];n&&(e=e|16777216);var t=e&255,r=e>>8&255,i=e>>16&255,o=e>>24&255;return[t,r,i,o]}function Ye(a){var n=a>>>8&255,e=a>>>16&255,t=a>>>24&255,r=a&255;return(r<<24|t<<16|e<<8|n)>>>0}function wn(a,n,e,t){return(e<<24|n<<16|a<<8|t)>>>0}function Ga(a,n,e,t,r,i){var o=Rn(a,e,t,r,i),s=Q(o,2),l=s[0],u=s[1],d=new Uint8Array(4);a.bindFramebuffer(a.FRAMEBUFFER,n),a.readPixels(l,u,1,1,a.RGBA,a.UNSIGNED_BYTE,d);var c=Q(d,4),f=c[0],h=c[1],p=c[2],b=c[3];return[f,h,p,b]}function Ma(a){var n=Wt(a),e=n.r,t=n.g,r=n.b,i=n.a,o=(e/255).toFixed(6),s=(t/255).toFixed(6),l=(r/255).toFixed(6),u=i.toFixed(6);return"vec4(".concat(o,", ").concat(s,", ").concat(l,", ").concat(u,")")}function mu(a,n){if(typeof a!="object"||!a)return a;var e;if(typeof Symbol<"u"&&(e=a[Symbol.toPrimitive])!==void 0){var t=e.call(a,n||"default");if(typeof t!="object")return t;throw new TypeError("@@toPrimitive must return a primitive value.")}return(n==="string"?String:Number)(a)}function fi(a){var n=mu(a,"string");return typeof n=="symbol"?n:n+""}function S(a,n,e){return(n=fi(n))in a?Object.defineProperty(a,n,{value:e,enumerable:!0,configurable:!0,writable:!0}):a[n]=e,a}function ci(a,n){var e=Object.keys(a);if(Object.getOwnPropertySymbols){var t=Object.getOwnPropertySymbols(a);n&&(t=t.filter(function(r){return Object.getOwnPropertyDescriptor(a,r).enumerable})),e.push.apply(e,t)}return e}function B(a){for(var n=1;n<arguments.length;n++){var e=arguments[n]!=null?arguments[n]:{};n%2?ci(Object(e),!0).forEach(function(t){S(a,t,e[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(a,Object.getOwnPropertyDescriptors(e)):ci(Object(e)).forEach(function(t){Object.defineProperty(a,t,Object.getOwnPropertyDescriptor(e,t))})}return a}function K(a,n){if(!(a instanceof n))throw new TypeError("Cannot call a class as a function")}function hi(a,n){for(var e=0;e<n.length;e++){var t=n[e];t.enumerable=t.enumerable||!1,t.configurable=!0,"value"in t&&(t.writable=!0),Object.defineProperty(a,fi(t.key),t)}}function Z(a,n,e){return n&&hi(a.prototype,n),e&&hi(a,e),Object.defineProperty(a,"prototype",{writable:!1}),a}function Ke(a){return Ke=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(n){return n.__proto__||Object.getPrototypeOf(n)},Ke(a)}function gi(){try{var a=!Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],function(){}))}catch{}return(gi=function(){return!!a})()}function bu(a){if(a===void 0)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return a}function yu(a,n){if(n&&(typeof n=="object"||typeof n=="function"))return n;if(n!==void 0)throw new TypeError("Derived constructors may only return object or undefined");return bu(a)}function ne(a,n,e){return n=Ke(n),yu(a,gi()?Reflect.construct(n,e||[],Ke(a).constructor):n.apply(a,e))}function za(a,n){return za=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(e,t){return e.__proto__=t,e},za(a,n)}function ae(a,n){if(typeof n!="function"&&n!==null)throw new TypeError("Super expression must either be null or a function");a.prototype=Object.create(n&&n.prototype,{constructor:{value:a,writable:!0,configurable:!0}}),Object.defineProperty(a,"prototype",{writable:!1}),n&&za(a,n)}function xu(a){if(Array.isArray(a))return Sn(a)}function _u(a){if(typeof Symbol<"u"&&a[Symbol.iterator]!=null||a["@@iterator"]!=null)return Array.from(a)}function Tu(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function $(a){return xu(a)||_u(a)||En(a)||Tu()}function Y(a){"@babel/helpers - typeof";return Y=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(n){return typeof n}:function(n){return n&&typeof Symbol=="function"&&n.constructor===Symbol&&n!==Symbol.prototype?"symbol":typeof n},Y(a)}function Te(a){return Y(a)==="object"&&a!==null&&"attribute"in a}function mt(){var a=`
float sdf_circle(vec2 uv, float size) {
  return length(uv) - size;
}
`;return{name:"circle",glsl:a,uniforms:[]}}function Ba(a){var n,e=WebGL2RenderingContext,t=e.UNSIGNED_BYTE,r=(n=a?.color)!==null&&n!==void 0?n:{attribute:"color"};if(!Te(r)){var i=r,o=`
vec4 layer_fill() {
  return `.concat(Ma(i),`;
}
`);return{name:"fill",uniforms:[],attributes:[],glsl:o}}var s=r.attribute,l=`
vec4 layer_fill(vec4 v_fillColor) {
  return v_fillColor;
}
`;return{name:"fill",uniforms:[],attributes:[{name:"fillColor",size:4,type:t,normalized:!0,source:s}],glsl:l}}function Ht(a,n){if(typeof a=="string"){var e=Ut(a).map(function(u){return u.toFixed(6)}),t=Q(e,4),r=t[0],i=t[1],o=t[2],s=t[3];return{glsl:"vec4(".concat(r,", ").concat(i,", ").concat(o,", ").concat(s,")"),attributes:[],needsNodeColors:!1}}if("node"in a&&a.node)return{glsl:a.node==="source"?"v_sourceColor":"v_targetColor",attributes:[],needsNodeColors:!0};var l=a;return{glsl:"v_".concat(n),attributes:[{name:"a_".concat(n),size:4,type:WebGL2RenderingContext.UNSIGNED_BYTE,normalized:!0,source:l.attribute,defaultValue:l.default}],needsNodeColors:!1}}function ze(a){var n=a?.color;if(n===void 0){var e=`
// Plain solid color layer
vec4 layer_plain(EdgeContext ctx) {
  return v_color;
}
`;return{name:"plain",glsl:e,uniforms:[],attributes:[]}}var t=Ht(n,"plainColor"),r=`
// Plain solid color layer
vec4 layer_plain(EdgeContext ctx) {
  return `.concat(t.glsl,`;
}
`);return{name:"plain",glsl:r,uniforms:[],attributes:t.attributes,needsNodeColors:t.needsNodeColors}}function $t(){var a=`
// Position at parameter t \u2208 [0, 1]
vec2 path_straight_position(float t, vec2 source, vec2 target) {
  return mix(source, target, t);
}

// Total length of the path (analytical - more efficient than sampling)
float path_straight_length(vec2 source, vec2 target) {
  return length(target - source);
}
`;return{name:"straight",segments:1,minBodyLengthRatio:0,linearParameterization:!0,glsl:a,uniforms:[],attributes:[]}}function Vt(a){var n=a??{},e=n.segments,t=e===void 0?32:e,r=`
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
`;return{name:"loop",segments:t,glsl:r,needsNodeSize:!0,uniforms:[],attributes:[{name:"loopRadius",size:1,type:WebGL2RenderingContext.FLOAT},{name:"loopAngle",size:1,type:WebGL2RenderingContext.FLOAT},{name:"loopSpread",size:1,type:WebGL2RenderingContext.FLOAT},{name:"loopFixedOrientation",size:1,type:WebGL2RenderingContext.FLOAT}],variables:{loopRadius:{type:"number",default:4},loopAngle:{type:"number",default:Math.PI/4},loopSpread:{type:"number",default:80*Math.PI/180},loopFixedOrientation:{type:"number",default:0}},spread:{variable:"loopRadius",compute:function(o){return o+4}}}}var xi=Ce(je());function pi(a){return Y(a)==="object"&&"glsl"in a&&!("attributes"in a)}function vi(a){return Y(a)==="object"&&"glsl"in a&&!("attributes"in a)}var qt={shapes:[mt()],variables:{},layers:[Ba()],label:{},backdrop:{},labelAttachments:{}},bt={paths:[$t(),Vt()],extremities:[],variables:{},layers:[ze()],defaultHead:"none",defaultTail:"none",label:{}},Dn=["nodes","topNodes"],Cn=["edges","topEdges"],Ln=[].concat(Cn,Dn),mi={nodes:qt,edges:bt,depthLayers:$(Ln)};var Su=function(n){return n},Eu=function(n){return n*n},Au=function(n){return n*(2-n)},Ru=function(n){return(n*=2)<1?.5*n*n:-.5*(--n*(n-2)-1)},wu=function(n){return n*n*n},Du=function(n){return--n*n*n+1},Cu=function(n){return(n*=2)<1?.5*n*n*n:.5*((n-=2)*n*n+2)},Lu=function(n){return n===0?0:Math.pow(2,10*(n-1))},Pu=function(n){return n===1?1:1-Math.pow(2,-10*n)},ku=function(n){return n===0?0:n===1?1:n<.5?Math.pow(2,10*(2*n-1))/2:(2-Math.pow(2,-10*(2*n-1)))/2},Oa={linear:Su,quadraticIn:Eu,quadraticOut:Au,quadraticInOut:Ru,cubicIn:wu,cubicOut:Du,cubicInOut:Cu,exponentialIn:Lu,exponentialOut:Pu,exponentialInOut:ku};function Pn(a){return a?typeof a=="function"?a:Oa[a]:Oa.linear}function Ua(a){return Y(a)==="object"&&a!==null&&"attribute"in a}function _i(a){return typeof a=="function"}function Ti(a){return Y(a)==="object"&&a!==null&&"when"in a&&typeof a.when=="function"&&"then"in a}function Si(a){return Y(a)==="object"&&a!==null&&"whenState"in a&&"then"in a}function Ei(a){return Y(a)==="object"&&a!==null&&"whenData"in a&&"then"in a}var Fu={isHovered:!1,isLabelHovered:!1,isHidden:!1,isHighlighted:!1,isDragged:!1},Iu={isHovered:!1,isLabelHovered:!1,isHidden:!1,isHighlighted:!1,parallelIndex:0,parallelCount:1},Nu={isIdle:!0,isPanning:!1,isZooming:!1,isDragging:!1,hasHovered:!1,hasHighlighted:!1};function Ai(a){return B(B({},Fu),a)}function Ri(a){return B(B({},Iu),a)}function Ha(a){return B(B({},Nu),a)}var Gu={x:{attribute:"x"},y:{attribute:"y"},size:{whenState:"isHovered",then:{attribute:"size",defaultValue:12},else:{attribute:"size",defaultValue:10}},color:{attribute:"color",defaultValue:"#666"},label:{attribute:"label"},visibility:{whenState:"isHidden",then:"hidden",else:"visible"},labelVisibility:{whenState:"isHovered",then:"visible",else:"auto"},backdropVisibility:{whenState:"isHovered",then:"visible",else:"hidden"},backdropColor:"#ffffff",backdropShadowColor:"rgba(0, 0, 0, 0.5)",backdropShadowBlur:12,backdropPadding:6},Mu={size:{attribute:"size",defaultValue:1},color:{attribute:"color",defaultValue:"#ccc"},label:{attribute:"label"},visibility:{whenState:"isHidden",then:"hidden",else:"visible"}};var Fn={nodes:B(B({},Gu),{},{depth:{whenState:"isHovered",then:"topNodes",else:"nodes"}}),edges:B(B({},Mu),{},{depth:{whenState:["isHighlighted","isHovered"],then:"topEdges",else:"edges"}})};function zu(a){return"min"in a||"max"in a||"minValue"in a||"maxValue"in a||"easing"in a}function Bu(a){return"dict"in a}function In(a,n){return typeof a=="string"?n[a]===!0:Array.isArray(a)?a.every(function(e){return n[e]===!0}):Y(a)==="object"&&a!==null?Object.entries(a).every(function(e){var t=Q(e,2),r=t[0],i=t[1];return n[r]===i}):!1}function Ou(a,n){var e=n[a.attribute];return e===void 0?a.defaultValue:e}function Wu(a,n,e){var t,r,i,o,s=n[a.attribute];if(s===void 0)return a.defaultValue;var l=Number(s);if(isNaN(l))return a.defaultValue;if(a.min===void 0&&a.max===void 0)return l;var u=(t=a.minValue)!==null&&t!==void 0?t:l,d=(r=a.maxValue)!==null&&r!==void 0?r:l;if(d===u){var c;return(c=a.min)!==null&&c!==void 0?c:l}var f=(l-u)/(d-u);f=Math.max(0,Math.min(1,f));var h=Pn(a.easing);f=h(f);var p=(i=a.min)!==null&&i!==void 0?i:0,b=(o=a.max)!==null&&o!==void 0?o:1;return p+f*(b-p)}function Uu(a,n){var e=n[a.attribute];if(e===void 0)return a.defaultValue;var t=String(e);return t in a.dict?a.dict[t]:a.defaultValue}function Hu(a,n,e){return Bu(a)?Uu(a,n):zu(a)?Wu(a,n):Ou(a,n)}function wi(a,n){return typeof a=="string"?!!n[a]:Array.isArray(a)?a.every(function(e){return!!n[e]}):Y(a)==="object"&&a!==null?Object.entries(a).every(function(e){var t=Q(e,2),r=t[0],i=t[1];return n[r]===i}):!1}function kn(a,n,e,t,r,i){if(a==null)return i;if(Y(a)!=="object"&&typeof a!="function")return a;if(Ti(a)){var o=a.when(n,e,t,r)?a.then:a.else;return o===void 0?i:kn(o,n,e,t,r,i)}if(Si(a)){var s=In(a.whenState,e)?a.then:a.else;return s===void 0?i:kn(s,n,e,t,r,i)}if(Ei(a)){var l=wi(a.whenData,n)?a.then:a.else;return l===void 0?i:kn(l,n,e,t,r,i)}if(_i(a)){var u=a(n,e,t,r);return u??i}if(Ua(a)){var d=Hu(a,n);return d??i}return a}function Se(a){if(a==null)return"static";if(Ti(a))return"graph-state";if(Si(a)){var n=Se(a.then),e=a.else!==void 0?Se(a.else):"static";return be("item-state",be(n,e))}if(Ei(a)){var t=Se(a.then),r=a.else!==void 0?Se(a.else):"static";return be(t,r)}return _i(a)?"graph-state":(Ua(a),"static")}function be(a,n){return a==="graph-state"||n==="graph-state"?"graph-state":a==="item-state"||n==="item-state"?"item-state":"static"}function $a(a){if(!a)return{dependency:"static",xAttribute:null,yAttribute:null};var n=Array.isArray(a)?a:[a],e="static",t=null,r=null,i=z(n),o;try{for(i.s();!(o=i.n()).done;){var s=o.value;if("matchData"in s&&"cases"in s)for(var l=s.cases,u=0,d=Object.values(l);u<d.length;u++)for(var c=d[u],f=0,h=Object.values(c);f<h.length;f++){var p=h[f];e=be(e,Se(p))}else if("matchState"in s&&"cases"in s){e=be(e,"item-state");for(var b=s.cases,v=0,g=Object.values(b);v<g.length;v++)for(var m=g[v],y=0,_=Object.values(m);y<_.length;y++){var x=_[y];e=be(e,Se(x))}}else if("when"in s&&"then"in s)e="graph-state";else if("whenState"in s){e=be(e,"item-state");var T=s.then;if(T&&Y(T)==="object")for(var E=0,A=Object.values(T);E<A.length;E++){var C=A[E];e=be(e,Se(C))}var w=s.else;if(w&&Y(w)==="object")for(var k=0,R=Object.values(w);k<R.length;k++){var P=R[k];e=be(e,Se(P))}}else if("whenData"in s){var D=s.then;if(D&&Y(D)==="object")for(var I=0,G=Object.values(D);I<G.length;I++){var N=G[I];e=be(e,Se(N))}var F=s.else;if(F&&Y(F)==="object")for(var L=0,M=Object.values(F);L<M.length;L++){var H=M[L];e=be(e,Se(H))}}else for(var U=0,X=Object.entries(s);U<X.length;U++){var q=Q(X[U],2),j=q[0],xe=q[1];if(!qa.has(j)&&(e=be(e,Se(xe)),(j==="x"||j==="y")&&Ua(xe))){var de=xe.attribute;j==="x"&&!t&&(t=de),j==="y"&&!r&&(r=de)}}}}catch(De){i.e(De)}finally{i.f()}return{dependency:e,xAttribute:t,yAttribute:r}}var Ne={size:10,color:"#666",opacity:1,shape:"circle",rotationAlignment:"viewport",labelRotationAlignment:"viewport",visibility:"visible",depth:"nodes",zIndex:0,label:"",labelColor:"#000",labelSize:12,labelFont:"sans-serif",labelVisibility:"auto",labelPosition:"right",labelAngle:0,labelDepth:"nodes",backdropVisibility:"hidden",backdropColor:"transparent",backdropShadowColor:"transparent",backdropShadowBlur:0,backdropPadding:0,backdropBorderColor:"transparent",backdropBorderWidth:0,backdropCornerRadius:0,backdropLabelPadding:-1,backdropArea:"both",labelAttachment:null,labelAttachmentPlacement:"below"},Va={size:1,color:"#ccc",opacity:1,path:"straight",selfLoopPath:"loop",parallelSpread:.25,tail:"none",head:"none",visibility:"visible",depth:"edges",zIndex:0,label:"",labelColor:"#666",labelVisibility:"auto",labelDepth:"edges"},qa=new Set(["when","whenState","whenData","then","else"]),bi=Object.keys(Ne),$u=Object.values(Ne),yi=Object.keys(Va),Vu=Object.values(Va);function yt(a,n,e,t,r,i,o){for(var s in n){var l;if(!qa.has(s)){var u=(l=a[s])!==null&&l!==void 0?l:o[s];a[s]=kn(n[s],e,t,r,i,u)}}"depth"in n&&!("labelDepth"in n)&&(a.labelDepth=a.depth)}function Di(a,n,e,t,r,i,o){var s=z(n),l;try{for(s.s();!(l=s.n()).done;){var u=l.value;if("matchData"in u&&"cases"in u){var d,c=String((d=e[u.matchData])!==null&&d!==void 0?d:""),f=u.cases;c in f&&yt(a,f[c],e,t,r,i,o)}else if("matchState"in u&&"cases"in u){var h,p=String((h=t[u.matchState])!==null&&h!==void 0?h:""),b=u.cases;p in b&&yt(a,b[p],e,t,r,i,o)}else if("when"in u&&"then"in u){var v=u.when;if(!v(e,t,r,i))continue;yt(a,u.then,e,t,r,i,o)}else if("whenState"in u&&"then"in u){if(!In(u.whenState,t))continue;yt(a,u.then,e,t,r,i,o)}else if("whenData"in u&&"then"in u){if(!wi(u.whenData,e))continue;yt(a,u.then,e,t,r,i,o)}else yt(a,u,e,t,r,i,o)}}catch(g){s.e(g)}finally{s.f()}}function ja(a,n,e,t,r,i){for(var o=i||{},s=o,l=0,u=bi.length;l<u;l++)s[bi[l]]=$u[l];if(s.x=void 0,s.y=void 0,s.labelBackgroundColor=void 0,s.labelBackgroundPadding=void 0,s.labelCursor=void 0,!a){var d,c,f,h,p;return s.x=(d=n.x)!==null&&d!==void 0?d:0,s.y=(c=n.y)!==null&&c!==void 0?c:0,o.size=(f=n.size)!==null&&f!==void 0?f:10,o.color=(h=n.color)!==null&&h!==void 0?h:"#666",o.label=(p=n.label)!==null&&p!==void 0?p:"",o}var b=Array.isArray(a)?a:[a];return Di(s,b,n,e,t,r,Ne),o}function Xa(a,n,e,t,r,i){for(var o=i||{},s=o,l=0,u=yi.length;l<u;l++)s[yi[l]]=Vu[l];if(!a){var d,c,f;return o.size=(d=n.size)!==null&&d!==void 0?d:1,o.color=(c=n.color)!==null&&c!==void 0?c:"#ccc",o.label=(f=n.label)!==null&&f!==void 0?f:"",o}var h=Array.isArray(a)?a:[a];return Di(s,h,n,e,t,r,Va),typeof s.labelPosition=="number"&&(s.labelPosition=void 0),o}function qu(a,n,e){var t,r;if(a==null)return e;if(typeof a=="function")return(t=a(n))!==null&&t!==void 0?t:e;if(Y(a)==="object"&&"when"in a){var i,o=a,s=o.when(n),l=s?o.then:o.else;return l===void 0?e:typeof l=="function"?(i=l(n))!==null&&i!==void 0?i:e:l??e}if(Y(a)==="object"&&"whenState"in a){var u,d=a,c=In(d.whenState,n),f=c?d.then:d.else;return f===void 0?e:typeof f=="function"?(u=f(n))!==null&&u!==void 0?u:e:f??e}return(r=a)!==null&&r!==void 0?r:e}function Ya(a,n){var e={};if(!a)return e;var t=Array.isArray(a)?a:[a],r=z(t),i;try{for(r.s();!(i=r.n()).done;){var o=i.value;if("when"in o&&"then"in o){var s=o.when(n),l=s?o.then:o.else;l&&Y(l)==="object"&&Wa(e,l,n)}else if("whenState"in o&&"then"in o){var u=In(o.whenState,n),d=u?o.then:o.else;d&&Y(d)==="object"&&Wa(e,d,n)}else Wa(e,o,n)}}catch(c){r.e(c)}finally{r.f()}return e}function Wa(a,n,e){for(var t=0,r=Object.entries(n);t<r.length;t++){var i=Q(r[t],2),o=i[0],s=i[1];qa.has(o)||(a[o]=qu(s,e))}}var Nn=(function(a){function n(){var e;return K(this,n),e=ne(this,n),e.rawEmitter=e,e}return ae(n,a),Z(n)})(xi.EventEmitter);var Ci=mi;function Ka(a,n){var e=n.size;if(e!==0){var t=a.length;a.length+=e;var r=0;n.forEach(function(i){a[t+r]=i,r++})}}function Li(a){a=a||{};for(var n=0,e=arguments.length<=1?0:arguments.length-1;n<e;n++){var t=n+1<1||arguments.length<=n+1?void 0:arguments[n+1];t&&Object.assign(a,t)}return a}function xt(a,n){for(var e in n)if(Object.prototype.hasOwnProperty.call(n,e)&&n[e]!==a[e])return!0;return!1}function Pi(a,n){var e=a,t=n;for(var r in e)if(Object.prototype.hasOwnProperty.call(e,r)&&e[r]!==t[r])return!1;for(var i in t)if(Object.prototype.hasOwnProperty.call(t,i)&&t[i]!==e[i])return!1;return!0}function Ze(a,n,e){e?a.add(n):a.delete(n)}var Fi=Ce(Gn());var Ii={easing:"quadraticInOut",duration:150};function Be(a){return a.labelVisibility==="visible"&&a.visibility!=="hidden"}function Za(a){return a.backdropVisibility==="visible"&&a.visibility!=="hidden"}function Mn(a){return[a.rotationAlignment==="graph"?1:0,a.labelRotationAlignment==="graph"?1:0]}function Qa(a,n,e){var t=a[n];if(t)for(var r=0;r<t.length;r++){var i=t[r];if(!(e<i.offset||e>=i.offset+i.count)){if(i.count===1)t.splice(r,1);else if(e===i.offset)i.offset++,i.count--;else if(e===i.offset+i.count-1)i.count--;else{var o=e+1,s=i.offset+i.count-o;i.count=e-i.offset,t.splice(r+1,0,{offset:o,count:s})}return}}}function Ja(a,n,e){if(!a[n]){a[n]=[{offset:e,count:1}];return}for(var t=a[n],r=t.length,i=0;i<t.length;i++)if(e<t[i].offset){r=i;break}var o=r>0?t[r-1]:null,s=r<t.length?t[r]:null,l=o&&o.offset+o.count===e,u=s&&e+1===s.offset;l&&u?(o.count+=1+s.count,t.splice(r,1)):l?o.count++:u?(s.offset--,s.count++):t.splice(r,0,{offset:e,count:1})}function Ni(a){if(!(0,Fi.default)(a))throw new Error("Sigma: invalid graph instance.")}function zn(a){var n=Q(a.x,2),e=n[0],t=n[1],r=Q(a.y,2),i=r[0],o=r[1],s=Math.max(t-e,o-i),l=(t+e)/2,u=(o+i)/2;(s===0||Math.abs(s)===1/0||isNaN(s))&&(s=1),isNaN(l)&&(l=0),isNaN(u)&&(u=0);var d=function(f){return{x:.5+(f.x-l)/s,y:.5+(f.y-u)/s}};return d.applyTo=function(c){c.x=.5+(c.x-l)/s,c.y=.5+(c.y-u)/s},d.inverse=function(c){return{x:l+s*(c.x-.5),y:u+s*(c.y-.5)}},d.ratio=s,d}var Bn={hideEdgesOnMove:!1,hideLabelsOnMove:!1,renderLabels:!0,renderEdgeLabels:!1,edgeLabelAnchors:"nodeLabels",enableEdgeEvents:!1,nodeLabelEvents:!1,edgeLabelEvents:!1,pickingDownSizingRatio:2,nodePickingPadding:0,edgePickingPadding:4,labelPickingPadding:10,stagePadding:30,minEdgeThickness:1.7,antiAliasingFeather:1,antialiasEdges:!0,antialiasNodes:!0,dragTimeout:100,draggedEventsTolerance:3,inertiaDuration:200,inertiaRatio:3,zoomDuration:250,zoomingRatio:1.7,doubleClickTimeout:300,doubleClickZoomingRatio:2.2,doubleClickZoomingDuration:200,tapMoveTolerance:10,zoomToSizeRatioFunction:Math.sqrt,itemSizesReference:"positions",autoRescale:!0,autoRescaleContent:"positions",enableNodeDrag:!1,getDraggedNodes:function(n){return[n]},dragPositionToAttributes:null,labelDensity:1,labelGridCellSize:100,labelRenderedSizeThreshold:6,labelPixelSnapping:!0,minCameraRatio:null,maxCameraRatio:null,enableCameraZooming:!0,enableCameraPanning:!0,enableCameraRotation:!0,enableCameraMouseRotation:!0,cameraPanBoundaries:null,gestureTarget:"graph",sharedGestureWheelMessage:"Use Ctrl + scroll to zoom the graph",sharedGestureAppleWheelMessage:"Use \u2318 + scroll to zoom the graph",sharedGestureTouchMessage:"Use two fingers to move the graph",allowInvalidContainer:!1,DEBUG_displayPickingLayer:!1,DEBUG_logShaders:!1,DEBUG_logRenderStats:!1,DEBUG_gpuTimerQueries:!1};function On(a){if(typeof a.labelDensity!="number"||a.labelDensity<0)throw new Error("Settings: invalid `labelDensity`. Expecting a positive number.");var n=a.minCameraRatio,e=a.maxCameraRatio;if(typeof n=="number"&&typeof e=="number"&&e<n)throw new Error("Settings: invalid camera ratio boundaries. Expecting `maxCameraRatio` to be greater than `minCameraRatio`.")}function Gi(a){return Li({},Bn,a)}var ju=new Set(["italic","oblique"]),Xu=new Set(["bold","bolder","lighter"]);function Wn(a){for(var n="normal",e="normal",t=a.trim(),r=t.split(/\s+/),i=0,o=0;o<r.length;o++){var s=r[o].toLowerCase();if(ju.has(s))e=s,i=o+1;else if(Xu.has(s)||/^\d{3}$/.test(s))n=s,i=o+1;else if(s==="normal")i=o+1;else break}var l=r.slice(i).join(" ");return{family:l||t,weight:n,style:e}}function _t(a,n,e){var t=document.createElement(a);if(n)for(var r in n)t.style[r]=n[r];if(e)for(var i in e)t.setAttribute(i,e[i]);return t}function jt(){return typeof window.devicePixelRatio<"u"?window.devicePixelRatio:1}var Hi=Ce(je());function Yu(a){var n=a.type===WebGL2RenderingContext.FLOAT&&!a.normalized,e=a.type===WebGL2RenderingContext.UNSIGNED_BYTE&&a.size===4&&a.normalized;if(!n&&!e)throw new Error('Attribute "'.concat(a.name,'" is invalid: only non-normalized FLOAT and normalized UNSIGNED_BYTE with size 4 are supported.'));return a.normalized?1:a.size}function jn(a){var n=0;return a.forEach(function(e){return n+=Yu(e)}),n}function $i(a,n,e){var t=a==="VERTEX"?n.VERTEX_SHADER:n.FRAGMENT_SHADER,r=n.createShader(t);if(r===null)throw new Error("loadShader: error while creating the shader");n.shaderSource(r,e),n.compileShader(r);var i=n.getShaderParameter(r,n.COMPILE_STATUS);if(!i){var o=n.getShaderInfoLog(r);throw n.deleteShader(r),new Error(`loadShader: error while compiling the shader:
`.concat(o,`
`).concat(e))}return r}function Yn(a,n){return $i("VERTEX",a,n)}function Kn(a,n){return $i("FRAGMENT",a,n)}function Zn(a,n){var e=a.createProgram();if(e===null)throw new Error("loadProgram: error while creating the program.");var t,r;for(t=0,r=n.length;t<r;t++)a.attachShader(e,n[t]);a.linkProgram(e);var i=a.getProgramParameter(e,a.LINK_STATUS);if(!i){var o=a.getProgramInfoLog(e);throw a.deleteProgram(e),new Error("loadProgram: error while linking the program: ".concat(o))}return e}function er(a){var n=a.gl,e=a.buffer,t=a.program,r=a.vertexShader,i=a.fragmentShader;n.deleteShader(r),n.deleteShader(i),n.deleteProgram(t),n.deleteBuffer(e)}function te(a){return a%1===0?a.toFixed(1):a.toString()}var Xn=new Map,Vi=new Map,Ku=0;function rr(a,n){var e,t=(e=a.variables)===null||e===void 0||(e=e[n.source||n.name.replace(/^a_/,"")])===null||e===void 0?void 0:e.default,r=typeof t=="number"?t:typeof n.defaultValue=="number"?n.defaultValue:0;return te(r)}function Qt(a,n,e){var t,r=arguments.length>3&&arguments[3]!==void 0?arguments[3]:function(o){return"v_".concat(o.name.replace(/^a_/,""))},i=[n,e].concat($(a.uniforms.filter(function(o){return o.type==="float"}).map(function(o){var s;return te((s=o.value)!==null&&s!==void 0?s:0)})),$(((t=a.attributes)!==null&&t!==void 0?t:[]).map(r)));return"sdf_".concat(a.name,"(").concat(i.join(", "),")")}function Zu(a){var n,e=a.name,t=a.uniforms.filter(function(o){return o.type==="float"&&o.value!==void 0&&o.value!==0}).map(function(o){return"".concat(o.name.replace("u_",""),"=").concat(o.value)}).sort(),r=((n=a.attributes)!==null&&n!==void 0?n:[]).map(function(o){var s;return"".concat(o.name,"@").concat((s=o.source)!==null&&s!==void 0?s:"","=").concat(rr(a,o))}),i=[].concat($(t),$(r));return i.length>0&&(e+="#"+i.join("#")),e}function qi(a){var n=Zu(a);if(!Xn.has(n)){var e={},t=z(a.uniforms),r;try{for(t.s();!(r=t.n()).done;){var i=r.value;i.type==="float"&&i.value!==void 0&&(e[i.name]=i.value)}}catch(o){t.e(o)}finally{t.f()}Xn.set(n,{shape:a,uniformValues:e,slug:n}),Vi.set(n,Ku++)}return n}function St(a){var n;return(n=Vi.get(a))!==null&&n!==void 0?n:-1}function ji(a){var n=[],e=new Set,t=new Set,r=/mat2 rotate2D\(float angle\)\s*\{[^}]+\}/,i=z(a),o;try{for(i.s();!(o=i.n()).done;){var s=o.value;if(!t.has(s.name)){t.add(s.name);var l=s.glsl;r.test(l)&&(e.has("rotate2D")?l=l.replace(r,""):e.add("rotate2D")),n.push(l)}}}catch(u){i.e(u)}finally{i.f()}return n.join(`
`)}function Xi(){return ji(Array.from(Xn.values()).map(function(a){return a.shape}))}function Yi(a){var n=Array.from(Xn.entries());if(n.length===0)return`
float querySDF(int shapeId, vec2 uv, float size) {
  return length(uv) - size;
}
`;var e=n.map(function(t,r){var i=Q(t,2),o=i[0],s=i[1].shape,l=Qt(s,"uv","size",function(u){var d=u.name.replace(/^a_/,"");return a!=null&&a.has(d)?"g_".concat(d):rr(s,u)});return"    case ".concat(r,": return ").concat(l,"; // ").concat(o)}).join(`
`);return`
float querySDF(int shapeId, vec2 uv, float size) {
  switch (shapeId) {
`.concat(e,`
    default: return length(uv) - size;
  }
}
`)}function Qn(a){return ji(a)}function Et(a){return $(new Map(a.flatMap(function(n){return n.uniforms}).map(function(n){return[n.name,n]})).values())}function Ki(a,n){if(a.length===0)return`
void queryNodeSDF(int shapeId, vec2 uv, float size) {
  context.sdf = length(uv) - size;
  context.inradiusFactor = 1.0;
}
`;var e=function(c){return Qt(c,"uv","size")},t=function(c){var f,h;return(f=c.inradiusFactorGLSL)!==null&&f!==void 0?f:te((h=c.inradiusFactor)!==null&&h!==void 0?h:1)};if(a.length===1){var r=a[0];return`
void queryNodeSDF(int shapeId, vec2 uv, float size) {
  context.sdf = `.concat(e(r),`;
  context.inradiusFactor = `).concat(t(r),`;
}
`)}var i=a.map(function(d,c){return"    case ".concat(c,": // ").concat(d.name,`
      context.sdf = `).concat(e(d),`;
      context.inradiusFactor = `).concat(t(d),`;
      break;`)}).join(`
`),o=a[0],s="",l="shapeId";if(n&&n.length>1){var u=n.map(function(d,c){return"    case ".concat(d,": return ").concat(c,"; // ").concat(a[c].name)}).join(`
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
      context.sdf = `).concat(e(o),`;
      context.inradiusFactor = `).concat(t(o),`;
  }
}
`)}var Je={right:0,left:1,above:2,below:3,over:4},et=5,Jn=3,ir=`
float matrixScaleX = length(vec2(u_matrix[0][0], u_matrix[1][0]));
float nodeRadiusGraphSpace = nodeSize * u_correctionRatio / u_sizeRatio * 2.0;
float nodeRadiusNDC = nodeRadiusGraphSpace * matrixScaleX;
float nodeRadiusPixels = nodeRadiusNDC * u_resolution.x / 2.0;
`,At=`
mat2 rotate2D(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}
`,or=`
vec2 getLabelDirection(float positionMode) {
  if (positionMode < 0.5) return vec2(1.0, 0.0);   // Right
  if (positionMode < 1.5) return vec2(-1.0, 0.0);  // Left
  if (positionMode < 2.5) return vec2(0.0, -1.0);  // Above
  if (positionMode < 3.5) return vec2(0.0, 1.0);   // Below
  return vec2(0.0);                                 // Over (centered)
}
`,Zi=`
float sdfBox(vec2 p, vec2 halfSize) {
  vec2 d = abs(p) - halfSize;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
`,Qi=`
float sdfRotatedBox(vec2 p, vec2 halfSize, float angle) {
  float c = cos(-angle);
  float s = sin(-angle);
  vec2 rotatedP = mat2(c, -s, s, c) * p;
  return sdfBox(rotatedP, halfSize);
}
`,Ji=`
float sdfRoundedBox(vec2 p, vec2 halfSize, float radius) {
  vec2 d = abs(p) - halfSize + radius;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - radius;
}
`,eo=`
float sdfRoundedRotatedBox(vec2 p, vec2 halfSize, float angle, float radius) {
  float c = cos(-angle);
  float s = sin(-angle);
  vec2 rotatedP = mat2(c, -s, s, c) * p;
  return sdfRoundedBox(rotatedP, halfSize, radius);
}
`,sr=`
vec2 labelBoxCenter(float positionMode, float labelStart, vec2 halfSize, float textHalfY) {
  if (positionMode < 0.5) return vec2(labelStart + halfSize.x, 0.0);    // right
  if (positionMode < 1.5) return vec2(-(labelStart + halfSize.x), 0.0); // left
  if (positionMode < 2.5) return vec2(0.0, -(labelStart + textHalfY));  // above
  if (positionMode < 3.5) return vec2(0.0, labelStart + textHalfY);     // below
  return vec2(0.0);                                                     // over
}
`,ea=2,Ae=`
vec4 readNodeData(sampler2D nodeDataTexture, int nodeDataTextureWidth, int nodeIndex) {
  int t = nodeIndex * `.concat(ea,`;
  ivec2 coord = ivec2(t % nodeDataTextureWidth, t / nodeDataTextureWidth);
  return texelFetch(nodeDataTexture, coord, 0);
}
`),Ue=`
vec4 readNodeFlags(sampler2D nodeDataTexture, int nodeDataTextureWidth, int nodeIndex) {
  int t = nodeIndex * `.concat(ea,` + 1;
  ivec2 coord = ivec2(t % nodeDataTextureWidth, t / nodeDataTextureWidth);
  return texelFetch(nodeDataTexture, coord, 0);
}
`),to=`
vec4 readNodeColor(sampler2D nodeDataTexture, int nodeDataTextureWidth, int nodeIndex) {
  int t = nodeIndex * `.concat(ea,` + 1;
  ivec2 coord = ivec2(t % nodeDataTextureWidth, t / nodeDataTextureWidth);
  vec4 texel = texelFetch(nodeDataTexture, coord, 0);
  float r = floor(texel.b / 65536.0);
  float g = floor(mod(texel.b, 65536.0) / 256.0);
  float b = mod(texel.b, 256.0);
  return vec4(r / 255.0, g / 255.0, b / 255.0, texel.a);
}
`),tt=`
vec4 readFrameTexel(sampler2D frameTexture, int frameTextureWidth, int index) {
  ivec2 coord = ivec2(index % frameTextureWidth, index / frameTextureWidth);
  return texelFetch(frameTexture, coord, 0);
}
`;function no(a,n){var e=function(o){return Qt(o,"uv","size")};if(a.length===1)return{code:Mi(e(a[0])),multiShape:!1};var t=a.map(function(i,o){return"    case ".concat(n?n[o]:o,": return ").concat(e(i),";")}).join(`
`),r=`
float queryShapeSDF(int shapeId, vec2 uv, float size) {
  switch (shapeId) {
`.concat(t,`
    default: return `).concat(e(a[0]),`;
  }
}
int g_shapeId;
`).concat(Mi("queryShapeSDF(g_shapeId, uv, size)"),`
`);return{code:r,multiShape:!0}}function Mi(a){return`
float findEdgeDistance(vec2 direction, float size) {
  float lo = 0.0, hi = 2.0;
  for (int i = 0; i < 8; i++) {
    float mid = (lo + hi) * 0.5;
    vec2 uv = direction * mid;
    if (`.concat(a,` < 0.0) lo = mid; else hi = mid;
  }
  return (lo + hi) * 0.5;
}
`)}function Qu(a,n){for(;!{}.hasOwnProperty.call(a,n)&&(a=Ke(a))!==null;);return a}function tr(){return tr=typeof Reflect<"u"&&Reflect.get?Reflect.get.bind():function(a,n,e){var t=Qu(a,n);if(t){var r=Object.getOwnPropertyDescriptor(t,n);return r.get?r.get.call(arguments.length<3?a:e):r.value}},tr.apply(null,arguments)}function oe(a,n,e,t){var r=tr(Ke(1&t?a.prototype:a),n,e);return 2&t&&typeof r=="function"?function(i){return r.apply(e,i)}:r}var Ju=1024,ed=1.5,ao=-1,Jt=(function(){function a(n,e){var t=arguments.length>2&&arguments[2]!==void 0?arguments[2]:Ju;K(this,a),S(this,"texture",null),S(this,"dirty",!1),S(this,"dirtyRangeStart",1/0),S(this,"dirtyRangeEnd",-1),S(this,"indexMap",new Map),S(this,"freeIndices",[]),S(this,"nextIndex",0),this.gl=n,this.maxTextureSize=n.getParameter(n.MAX_TEXTURE_SIZE),this.TEXELS_PER_ITEM=e,this.capacity=this.roundUpToPowerOfTwo(t);var r=this.computeTextureDimensions(this.capacity);this.textureWidth=r.width,this.textureHeight=r.height,this.data=new Float32Array(this.textureWidth*this.textureHeight*4),this.createTexture()}return Z(a,[{key:"computeTextureDimensions",value:function(e){var t=e*this.TEXELS_PER_ITEM,r=Math.min(t,this.maxTextureSize),i=Math.ceil(t/r);return{width:r,height:i}}},{key:"roundUpToPowerOfTwo",value:function(e){return Math.pow(2,Math.ceil(Math.log2(Math.max(1,e))))}},{key:"createTexture",value:function(){var e=this.gl;this.texture=e.createTexture(),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this.texture),e.texImage2D(e.TEXTURE_2D,0,e.RGBA32F,this.textureWidth,this.textureHeight,0,e.RGBA,e.FLOAT,this.data),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindTexture(e.TEXTURE_2D,null)}},{key:"resize",value:function(e){if(!(e<=this.capacity)){var t=this.roundUpToPowerOfTwo(Math.ceil(e*ed)),r=this.gl,i=this.computeTextureDimensions(t),o=new Float32Array(i.width*i.height*4);o.set(this.data),this.texture&&r.deleteTexture(this.texture),this.data=o,this.capacity=t,this.textureWidth=i.width,this.textureHeight=i.height,this.createTexture(),this.dirty=!0,this.dirtyRangeStart=0,this.dirtyRangeEnd=this.nextIndex}}},{key:"allocate",value:function(e){var t=this.indexMap.get(e);if(t!==void 0)return t;var r;return this.freeIndices.length>0?r=this.freeIndices.pop():(r=this.nextIndex++,r>=this.capacity&&this.resize(r+1)),this.indexMap.set(e,r),r}},{key:"free",value:function(e){var t=this.indexMap.get(e);if(t!==void 0){this.indexMap.delete(e),this.freeIndices.push(t);for(var r=t*this.TEXELS_PER_ITEM*4,i=0;i<this.TEXELS_PER_ITEM*4;i++)this.data[r+i]=0;this.markDirty(t)}}},{key:"getIndex",value:function(e){var t;return(t=this.indexMap.get(e))!==null&&t!==void 0?t:-1}},{key:"has",value:function(e){return this.indexMap.has(e)}},{key:"markDirty",value:function(e){this.dirty=!0,this.dirtyRangeStart=Math.min(this.dirtyRangeStart,e),this.dirtyRangeEnd=Math.max(this.dirtyRangeEnd,e+1)}},{key:"upload",value:function(){if(!(!this.dirty||!this.texture)){var e=this.gl,t=this.textureWidth;e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this.texture);var r=this.dirtyRangeStart*this.TEXELS_PER_ITEM,i=Math.min(this.dirtyRangeEnd*this.TEXELS_PER_ITEM,this.capacity*this.TEXELS_PER_ITEM);if(r<i)for(var o=Math.floor(r/t),s=Math.floor((i-1)/t),l=o;l<=s;l++){var u=l*t,d=Math.min(u+t,this.capacity*this.TEXELS_PER_ITEM),c=Math.max(r,u),f=Math.min(i,d);if(c<f){var h=c-u,p=f-c,b=this.data.subarray(c*4,f*4);e.texSubImage2D(e.TEXTURE_2D,0,h,l,p,1,e.RGBA,e.FLOAT,b)}}e.bindTexture(e.TEXTURE_2D,null),this.dirty=!1,this.dirtyRangeStart=1/0,this.dirtyRangeEnd=-1}}},{key:"bind",value:function(e){var t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture)}},{key:"getTexture",value:function(){return this.texture}},{key:"getCapacity",value:function(){return this.capacity}},{key:"getTextureWidth",value:function(){return this.textureWidth}},{key:"getTextureHeight",value:function(){return this.textureHeight}},{key:"getTexelsPerItem",value:function(){return this.TEXELS_PER_ITEM}},{key:"getCount",value:function(){return this.indexMap.size}},{key:"getHighWaterMark",value:function(){return this.nextIndex}},{key:"isDirty",value:function(){return this.dirty}},{key:"clear",value:function(){this.indexMap.clear(),this.freeIndices=[],this.nextIndex=0,this.data.fill(0),this.dirty=!0,this.dirtyRangeStart=0,this.dirtyRangeEnd=this.capacity}},{key:"restore",value:function(){this.createTexture(),this.dirty=!1,this.dirtyRangeStart=1/0,this.dirtyRangeEnd=-1}},{key:"kill",value:function(){this.texture&&(this.gl.deleteTexture(this.texture),this.texture=null),this.indexMap.clear(),this.freeIndices=[]}}])})();function ye(a){var n={},e={},t=0,r=z(a),i;try{for(r.s();!(i=r.n()).done;){var o=i.value,s=z(o.attributes),l;try{for(s.s();!(l=s.n()).done;){var u=l.value,d=u.name.replace(/^a_/,"");d in n||(n[d]=t,e[d]=u,t+=u.size)}}catch(c){s.e(c)}finally{s.f()}}}catch(c){r.e(c)}finally{r.f()}return{floatsPerItem:t,texelsPerItem:Math.max(1,Math.ceil(t/4)),offsets:n,specs:e}}var ta=(function(a){function n(e,t,r){var i;return K(this,n),i=ne(this,n,[e,t.texelsPerItem,r]),i.floatsPerItem=t.floatsPerItem,i}return ae(n,a),Z(n,[{key:"updateAllAttributes",value:function(t,r){var i=this.indexMap.get(t);i===void 0&&(i=this.allocate(t));for(var o=i*this.TEXELS_PER_ITEM*4,s=Math.min(r.length,this.floatsPerItem),l=0;l<s;l++)this.data[o+l]=r[l];this.markDirty(i)}},{key:"updateAllAttributesAtRow",value:function(t,r){t>=this.capacity&&this.resize(t+1);for(var i=t*this.TEXELS_PER_ITEM*4,o=Math.min(r.length,this.floatsPerItem),s=0;s<o;s++)this.data[i+s]=r[s];this.markDirty(t)}}])})(Jt);function na(a,n,e){for(var t=[],r=new Set,i=0;i<a.length;i++){var o=a[i],s=z(o.attributes),l;try{for(s.s();!(l=s.n()).done;){var u=l.value,d=u.name.replace(/^a_/,"");if(!r.has(d)){r.add(d);var c=n.offsets[d];if(c!==void 0){var f=e?.get(i);t.push({sourceKey:u.source||d,packedOffset:c,size:u.size,isColor:u.size===4&&!!u.normalized,defaultNum:typeof u.defaultValue=="number"?u.defaultValue:u.defaultValue===!0?1:0,defaultColor:typeof u.defaultValue=="string"?u.defaultValue:"",sourceIndex:i,hasLifecycleHook:!!(f!=null&&f.getAttributeData)})}}}}catch(h){s.e(h)}finally{s.f()}}return t}function aa(a,n,e,t,r,i){e.fill(0);for(var o=0,s=a.length;o<s;o++){var l=a[o],u=l.packedOffset,d=void 0;if(l.hasLifecycleHook){var c=r.get(l.sourceIndex-i);d=c.getAttributeData(n,l.sourceKey),d===null&&(d=n[l.sourceKey])}else d=n[l.sourceKey];if(l.isColor){var f=typeof d=="string"?d:l.defaultColor||t,h=Ie(f),p=Q(h,4),b=p[0],v=p[1],g=p[2],m=p[3];e[u]=b/255,e[u+1]=v/255,e[u+2]=g/255,e[u+3]=m/255}else if(l.size===1)e[u]=typeof d=="number"?d:typeof d=="boolean"?d?1:0:l.defaultNum;else{var y=Array.isArray(d)?d:null;if(y)for(var _=0;_<l.size;_++){var x;e[u+_]=(x=y[_])!==null&&x!==void 0?x:0}}}}var Un=["r","g","b","a"];function Tt(a,n){var e=a.offsets,t=a.specs,r=a.texelsPerItem,i=a.floatsPerItem,o=Object.keys(e);if(o.length===0||i===0)return{fetchCode:"",varyingAssignments:""};var s=n.varPrefix,l=n.baseTexelExpr,u=n.textureWidthUniform,d=n.textureSamplerUniform,c=n.outputPrefix,f=c===void 0?"v_":c,h=[];h.push("  int ".concat(s,"BaseTexel = ").concat(l,";")),h.push("");for(var p=0;p<r;p++)h.push("  ivec2 ".concat(s,"Coord").concat(p," = ivec2((").concat(s,"BaseTexel + ").concat(p,") % ").concat(u,", (").concat(s,"BaseTexel + ").concat(p,") / ").concat(u,");")),h.push("  vec4 ".concat(s,"Texel").concat(p," = texelFetch(").concat(d,", ").concat(s,"Coord").concat(p,", 0);"));h.push("");for(var b=[],v=function(){var _=m[g],x=t[_],T=e[_],E=Math.floor(T/4),A=T%4,C="".concat(s,"Texel").concat(E),w="".concat(s,"Texel").concat(E+1),k="".concat(s,"Fetched_").concat(_);if(x.size===1)h.push("  float ".concat(k," = ").concat(C,".").concat(Un[A],";"));else if(x.size===4&&A===0)h.push("  vec4 ".concat(k," = ").concat(C,";"));else{var R=A+x.size;if(R<=4){var P="vec".concat(x.size),D=Un.slice(A,R).join("");h.push("  ".concat(P," ").concat(k," = ").concat(C,".").concat(D,";"))}else{var I=x.size===4?"vec4":"vec".concat(x.size),G=Un.slice(A).map(function(L){return"".concat(C,".").concat(L)}),N=Un.slice(0,R-4).map(function(L){return"".concat(w,".").concat(L)}),F=[].concat($(G),$(N)).join(", ");h.push("  ".concat(I," ").concat(k," = ").concat(I,"(").concat(F,");"))}}b.push("  ".concat(f).concat(_," = ").concat(k,";"))},g=0,m=o;g<m.length;g++)v();return{fetchCode:h.join(`
`),varyingAssignments:b.join(`
`)}}function lr(a,n,e){if(!(!n||e.type==="sampler2D"))switch(e.type){case"float":a.uniform1f(n,e.value);break;case"int":case"bool":a.uniform1i(n,e.value);break;case"vec2":a.uniform2fv(n,e.value);break;case"vec3":a.uniform3fv(n,e.value);break;case"vec4":a.uniform4fv(n,e.value);break;case"mat3":a.uniformMatrix3fv(n,!1,e.value);break;case"mat4":a.uniformMatrix4fv(n,!1,e.value);break}}var td=S(S(S(S(S(S(S(S({},WebGL2RenderingContext.BOOL,1),WebGL2RenderingContext.BYTE,1),WebGL2RenderingContext.UNSIGNED_BYTE,1),WebGL2RenderingContext.SHORT,2),WebGL2RenderingContext.UNSIGNED_SHORT,2),WebGL2RenderingContext.INT,4),WebGL2RenderingContext.UNSIGNED_INT,4),WebGL2RenderingContext.FLOAT,4);function Hn(a){var n=a.match(/^(#version[^\n]*\n)/);return n?n[1]+`#define PICKING_MODE
`+a.slice(n[1].length):`#define PICKING_MODE
`+a}var He=(function(){function a(n,e,t){K(this,a),S(this,"floats",new Float32Array),S(this,"ints",new Uint32Array),S(this,"constantArray",new Float32Array),S(this,"capacity",0),S(this,"verticesCount",0),S(this,"bufferGeneration",0),S(this,"uploadedGeneration",new Map),S(this,"constantBufferGeneration",0),S(this,"uploadedConstantGeneration",new Map),S(this,"renderOffset",0),S(this,"renderCount",-1),S(this,"debugStats",{drawCalls:0,verticesDrawn:0,bufferUploadBytes:0}),S(this,"shadersLogged",!1),S(this,"pickProgram",null);var r=this.getDefinition();if(this.VERTICES=r.VERTICES,this.VERTEX_SHADER_SOURCE=r.VERTEX_SHADER_SOURCE,this.FRAGMENT_SHADER_SOURCE=r.FRAGMENT_SHADER_SOURCE,this.UNIFORMS=r.UNIFORMS,this.ATTRIBUTES=r.ATTRIBUTES,this.METHOD=r.METHOD,this.CONSTANT_ATTRIBUTES="CONSTANT_ATTRIBUTES"in r?r.CONSTANT_ATTRIBUTES:[],this.CONSTANT_DATA="CONSTANT_DATA"in r?r.CONSTANT_DATA:[],this.isInstanced="CONSTANT_ATTRIBUTES"in r,this.ATTRIBUTES_ITEMS_COUNT=jn(this.ATTRIBUTES),this.STRIDE=this.VERTICES*this.ATTRIBUTES_ITEMS_COUNT,this.renderer=t,this.normalProgram=this.getProgramInfo("normal",n,r.VERTEX_SHADER_SOURCE,r.FRAGMENT_SHADER_SOURCE,null),this.pickProgram=this.getProgramInfo("pick",n,Hn(r.VERTEX_SHADER_SOURCE),Hn(r.FRAGMENT_SHADER_SOURCE),null),this.isInstanced){var i=jn(this.CONSTANT_ATTRIBUTES);if(this.CONSTANT_DATA.length!==this.VERTICES)throw new Error("Program: error while getting constant data (expected ".concat(this.VERTICES," items, received ").concat(this.CONSTANT_DATA.length," instead)"));this.constantArray=new Float32Array(this.CONSTANT_DATA.length*i);for(var o=0;o<this.CONSTANT_DATA.length;o++){var s=this.CONSTANT_DATA[o];if(s.length!==i)throw new Error("Program: error while getting constant data (one vector has ".concat(s.length," items instead of ").concat(i,")"));for(var l=0;l<s.length;l++)this.constantArray[o*i+l]=s[l]}this.STRIDE=this.ATTRIBUTES_ITEMS_COUNT}}return Z(a,[{key:"kill",value:function(){er(this.normalProgram),this.pickProgram&&er(this.pickProgram)}},{key:"resetDebugStats",value:function(){this.debugStats.drawCalls=0,this.debugStats.verticesDrawn=0,this.debugStats.bufferUploadBytes=0}},{key:"getProgramInfo",value:function(e,t,r,i,o){var s=t.createBuffer();if(s===null)throw new Error("Program: error while creating the WebGL buffer.");var l=Yn(t,r),u=Kn(t,i),d=Zn(t,[l,u]),c={};this.UNIFORMS.forEach(function(p){var b=t.getUniformLocation(d,p);b&&(c[p]=b)});var f={};this.ATTRIBUTES.forEach(function(p){f[p.name]=t.getAttribLocation(d,p.name)});var h;if(this.isInstanced&&(this.CONSTANT_ATTRIBUTES.forEach(function(p){f[p.name]=t.getAttribLocation(d,p.name)}),h=t.createBuffer(),h===null))throw new Error("Program: error while creating the WebGL constant buffer.");return{name:e,program:d,gl:t,frameBuffer:o,buffer:s,constantBuffer:h||{},uniformLocations:c,attributeLocations:f,isPicking:e==="pick",vertexShader:l,fragmentShader:u}}},{key:"bindProgram",value:function(e){var t=this,r=0,i=e.gl,o=e.buffer;if(this.isInstanced){if(i.bindBuffer(i.ARRAY_BUFFER,e.constantBuffer),r=0,this.CONSTANT_ATTRIBUTES.forEach(function(d){return r+=t.bindAttribute(d,e,r,!1)}),this.uploadedConstantGeneration.get(e.constantBuffer)!==this.constantBufferGeneration){var l;i.bufferData(i.ARRAY_BUFFER,this.constantArray,i.STATIC_DRAW),this.uploadedConstantGeneration.set(e.constantBuffer,this.constantBufferGeneration),(l=this.renderer)!==null&&l!==void 0&&l.getSetting("DEBUG_logRenderStats")&&(this.debugStats.bufferUploadBytes+=this.constantArray.byteLength)}if(i.bindBuffer(i.ARRAY_BUFFER,e.buffer),r=this.renderOffset*this.ATTRIBUTES_ITEMS_COUNT*Float32Array.BYTES_PER_ELEMENT,this.ATTRIBUTES.forEach(function(d){return r+=t.bindAttribute(d,e,r,!0)}),this.uploadedGeneration.get(o)!==this.bufferGeneration){var u;i.bufferData(i.ARRAY_BUFFER,this.floats,i.DYNAMIC_DRAW),this.uploadedGeneration.set(o,this.bufferGeneration),(u=this.renderer)!==null&&u!==void 0&&u.getSetting("DEBUG_logRenderStats")&&(this.debugStats.bufferUploadBytes+=this.floats.byteLength)}}else if(i.bindBuffer(i.ARRAY_BUFFER,o),r=0,this.ATTRIBUTES.forEach(function(d){return r+=t.bindAttribute(d,e,r)}),this.uploadedGeneration.get(o)!==this.bufferGeneration){var s;i.bufferData(i.ARRAY_BUFFER,this.floats,i.DYNAMIC_DRAW),this.uploadedGeneration.set(o,this.bufferGeneration),(s=this.renderer)!==null&&s!==void 0&&s.getSetting("DEBUG_logRenderStats")&&(this.debugStats.bufferUploadBytes+=this.floats.byteLength)}i.bindBuffer(i.ARRAY_BUFFER,null)}},{key:"unbindProgram",value:function(e){var t=this;this.isInstanced?(this.CONSTANT_ATTRIBUTES.forEach(function(r){return t.unbindAttribute(r,e,!1)}),this.ATTRIBUTES.forEach(function(r){return t.unbindAttribute(r,e,!0)})):this.ATTRIBUTES.forEach(function(r){return t.unbindAttribute(r,e)})}},{key:"bindAttribute",value:function(e,t,r,i){var o=td[e.type];if(typeof o!="number")throw new Error('Program.bind: yet unsupported attribute type "'.concat(e.type,'"'));var s=t.attributeLocations[e.name],l=t.gl;if(s!==-1){l.enableVertexAttribArray(s);var u=this.isInstanced?(i?this.ATTRIBUTES_ITEMS_COUNT:jn(this.CONSTANT_ATTRIBUTES))*Float32Array.BYTES_PER_ELEMENT:this.ATTRIBUTES_ITEMS_COUNT*Float32Array.BYTES_PER_ELEMENT;l.vertexAttribPointer(s,e.size,e.type,e.normalized||!1,u,r),this.isInstanced&&i&&l.vertexAttribDivisor(s,1)}return e.size*o}},{key:"unbindAttribute",value:function(e,t,r){var i=t.attributeLocations[e.name],o=t.gl;i!==-1&&(o.disableVertexAttribArray(i),this.isInstanced&&r&&o.vertexAttribDivisor(i,0))}},{key:"reallocate",value:function(e){e!==this.capacity&&(this.capacity=e,this.verticesCount=this.VERTICES*e,this.floats=new Float32Array(this.isInstanced?this.capacity*this.ATTRIBUTES_ITEMS_COUNT:this.verticesCount*this.ATTRIBUTES_ITEMS_COUNT),this.ints=new Uint32Array(this.floats.buffer),this.invalidateBuffers())}},{key:"invalidateBuffers",value:function(){this.bufferGeneration++,this.constantBufferGeneration++}},{key:"hasNothingToRender",value:function(){return this.verticesCount===0}},{key:"setTypedUniform",value:function(e,t){var r;lr(t.gl,(r=t.uniformLocations[e.name])!==null&&r!==void 0?r:null,e)}},{key:"renderProgram",value:function(e,t){var r=t.gl,i=t.program,o=t.isPicking;o?r.disable(r.BLEND):r.enable(r.BLEND),r.useProgram(i),this.setUniforms(e,t),this.drawWebGL(this.METHOD,t)}},{key:"render",value:function(e,t,r){var i;if(!this.shadersLogged&&(i=this.renderer)!==null&&i!==void 0&&i.getSetting("DEBUG_logShaders")&&(this.shadersLogged=!0,console.log("[sigma] DEBUG_logShaders: ".concat(this.constructor.name),{normal:{vertexShaderSource:this.VERTEX_SHADER_SOURCE,fragmentShaderSource:this.FRAGMENT_SHADER_SOURCE},pick:{vertexShaderSource:Hn(this.VERTEX_SHADER_SOURCE),fragmentShaderSource:Hn(this.FRAGMENT_SHADER_SOURCE)}})),!this.hasNothingToRender()){this.renderOffset=t??0,this.renderCount=r??-1;var o=this.normalProgram.gl;if(o.bindFramebuffer(o.FRAMEBUFFER,null),o.viewport(0,0,e.width*e.pixelRatio,e.height*e.pixelRatio),this.bindProgram(this.normalProgram),this.renderProgram(e,this.normalProgram),this.unbindProgram(this.normalProgram),this.pickProgram&&e.pickingFrameBuffer){var s=Math.ceil(e.width*e.pixelRatio/e.downSizingRatio),l=Math.ceil(e.height*e.pixelRatio/e.downSizingRatio);o.bindFramebuffer(o.FRAMEBUFFER,e.pickingFrameBuffer),o.viewport(0,0,s,l),this.bindProgram(this.pickProgram),this.renderProgram(e,this.pickProgram),this.unbindProgram(this.pickProgram),o.bindFramebuffer(o.FRAMEBUFFER,null),o.viewport(0,0,e.width*e.pixelRatio,e.height*e.pixelRatio)}}}},{key:"drawWebGL",value:function(e,t){var r,i=t.gl,o=this.renderCount>=0?this.renderCount:this.capacity;(r=this.renderer)!==null&&r!==void 0&&r.getSetting("DEBUG_logRenderStats")&&(this.debugStats.drawCalls++,this.debugStats.verticesDrawn+=o*this.VERTICES),this.isInstanced?i.drawArraysInstanced(e,0,this.VERTICES,o):i.drawArrays(e,this.renderOffset*this.VERTICES,o*this.VERTICES)}}])})(),$e=2,en=7,ro={below:0,above:1,left:2,right:3};function nd(){var a=`#version 300 es
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

`.concat(Ae,`
`).concat(Ue,`
`).concat(tt,`
`).concat(sr,`
`).concat(At,`

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
  float gap = `).concat($e.toFixed(1),` * zoomScale * u_pixelRatio;
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
`);return a}var ad=`#version 300 es
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
`;function rd(a,n,e,t){var r,i,o=t.label,s=o===void 0?{}:o,l=(r=s.margin)!==null&&r!==void 0?r:et,u=(i=s.zoomToLabelSizeRatioFunction)!==null&&i!==void 0?i:function(){return 1},d=nd(),c=ad,f=(function(h){function p(){var b;K(this,p);for(var v=arguments.length,g=new Array(v),m=0;m<v;m++)g[m]=arguments[m];return b=ne(this,p,[].concat(g)),S(b,"totalCount",0),S(b,"bufferCapacity",0),b}return ae(p,h),Z(p,[{key:"getDefinition",value:function(){var v=WebGL2RenderingContext,g=v.FLOAT,m=v.TRIANGLE_STRIP;return{VERTICES:4,VERTEX_SHADER_SOURCE:d,FRAGMENT_SHADER_SOURCE:c,METHOD:m,UNIFORMS:["u_matrix","u_resolution","u_labelPixelSnapping","u_sizeRatio","u_correctionRatio","u_cameraAngle","u_pixelRatio","u_labelMargin","u_zoomLabelSizeRatio","u_nodeDataTexture","u_nodeDataTextureWidth","u_nodeFrameTexture","u_nodeFrameTextureWidth","u_atlasTexture"],ATTRIBUTES:[{name:"a_nodeIndex",size:1,type:g},{name:"a_atlasRect",size:4,type:g},{name:"a_attachmentSize",size:2,type:g},{name:"a_positionMode",size:1,type:g},{name:"a_attachmentPlacement",size:1,type:g},{name:"a_labelWidth",size:1,type:g},{name:"a_labelHeight",size:1,type:g},{name:"a_textHeight",size:1,type:g},{name:"a_labelAngle",size:1,type:g}],CONSTANT_ATTRIBUTES:[{name:"a_quadCorner",size:2,type:g}],CONSTANT_DATA:[[-1,-1],[1,-1],[-1,1],[1,1]]}}},{key:"processAttachment",value:function(v,g){var m=this.floats,y=v*this.STRIDE;m[y++]=g.nodeIndex,m[y++]=g.atlasX,m[y++]=g.atlasY,m[y++]=g.atlasW,m[y++]=g.atlasH,m[y++]=g.attachWidth,m[y++]=g.attachHeight,m[y++]=g.positionMode,m[y++]=g.attachmentPlacement,m[y++]=g.labelWidth,m[y++]=g.labelHeight,m[y++]=g.textHeight,m[y++]=g.labelAngle}},{key:"setUniforms",value:function(v,g){var m=g.gl,y=g.uniformLocations;m.uniformMatrix3fv(y.u_matrix,!1,v.matrix),m.uniform2f(y.u_resolution,v.width*v.pixelRatio,v.height*v.pixelRatio),m.uniform1f(y.u_labelPixelSnapping,v.labelPixelSnapping),m.uniform1f(y.u_sizeRatio,v.sizeRatio),m.uniform1f(y.u_correctionRatio,v.correctionRatio),m.uniform1f(y.u_cameraAngle,v.cameraAngle),m.uniform1f(y.u_pixelRatio,v.pixelRatio),m.uniform1f(y.u_labelMargin,p.labelMargin),m.uniform1f(y.u_zoomLabelSizeRatio,1/u(v.zoomRatio)),m.uniform1i(y.u_nodeDataTexture,v.nodeDataTextureUnit),m.uniform1i(y.u_nodeDataTextureWidth,v.nodeDataTextureWidth),m.uniform1i(y.u_nodeFrameTexture,v.nodeFrameTextureUnit),m.uniform1i(y.u_nodeFrameTextureWidth,v.nodeFrameTextureWidth),m.uniform1i(y.u_atlasTexture,en)}},{key:"reallocateAttachments",value:function(v){this.totalCount=v,v>this.bufferCapacity&&(this.bufferCapacity=Math.max(v,Math.ceil(this.bufferCapacity*1.5)||10),oe(p,"reallocate",this,3)([this.bufferCapacity]))}},{key:"hasNothingToRender",value:function(){return this.totalCount===0}},{key:"drawWebGL",value:function(v,g){var m=g.gl;this.totalCount!==0&&m.drawArraysInstanced(v,0,this.VERTICES,this.totalCount)}}])})(He);return S(f,"labelMargin",l),new f(a,n,e)}var Oe=5;function ra(a,n){return[].concat($(n),$(a.map(function(e){var t;return{attributes:(t=e.attributes)!==null&&t!==void 0?t:[]}})))}function Rt(a,n){var e=ye(ra(a,n)),t=new Set(a.flatMap(function(u){var d;return(d=u.attributes)!==null&&d!==void 0?d:[]}).map(function(u){return u.name.replace(/^a_/,"")})),r={},i={},o=z(t),s;try{for(o.s();!(s=o.n()).done;){var l=s.value;r[l]=e.offsets[l],i[l]=e.specs[l]}}catch(u){o.e(u)}finally{o.f()}return B(B({},e),{},{offsets:r,specs:i})}function io(a,n){var e=new Set(["u_matrix","u_sizeRatio","u_correctionRatio","u_cameraAngle","u_pickingPadding","u_nodeDataTexture","u_layerAttributeTexture"]),t=new Set,r=a.flatMap(function(h){return h.uniforms}).filter(function(h){return e.has(h.name)||t.has(h.name)?!1:(t.add(h.name),!0)}).map(function(h){return"uniform ".concat(h.type," ").concat(h.name,";")}).join(`
`),i=n.flatMap(function(h){return h.uniforms}).filter(function(h){return e.has(h.name)||t.has(h.name)?!1:(t.add(h.name),!0)}).map(function(h){return"uniform ".concat(h.type," ").concat(h.name,";")}).join(`
`),o=ra(a,n),s=new Set,l=o.flatMap(function(h){return h.attributes}).filter(function(h){var p=h.name.replace(/^a_/,"");return s.has(p)?!1:(s.add(p),!0)}).map(function(h){var p=h.name.replace(/^a_/,""),b=h.size===1?"float":"vec".concat(h.size);return"out ".concat(b," v_").concat(p,";")}).join(`
`),u=Tt(ye(o),{varPrefix:"layer",baseTexelExpr:"nodeIdx * u_layerAttributeTexelsPerNode",textureWidthUniform:"u_layerAttributeTextureWidth",textureSamplerUniform:"u_layerAttributeTexture"}),d=u.fetchCode,c=u.varyingAssignments,f=`#version 300 es

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

`.concat(r,`
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
`).concat(Ae,`
`).concat(Ue,`

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
`);return f}function oo(a,n,e){var t=arguments.length>3&&arguments[3]!==void 0?arguments[3]:!0,r=n.map(function(p,b){var v="layer_".concat(p.name),g=[].concat($(p.attributes.map(function(m){return"v_".concat(m.name.replace(/^a_/,""))})),$(p.uniforms.map(function(m){return m.name}))).join(", ");return"  // Layer ".concat(b+1,": ").concat(p.name,`
  color = blendOver(color, `).concat(v,"(").concat(g,"));")}).join(`

`),i=new Set(["u_correctionRatio"]),o=new Set,s=a.flatMap(function(p){return p.uniforms}).filter(function(p){return i.has(p.name)||o.has(p.name)?!1:(o.add(p.name),!0)}).map(function(p){return"uniform ".concat(p.type," ").concat(p.name,";")}).join(`
`),l=n.flatMap(function(p){return p.uniforms}).filter(function(p){return i.has(p.name)||o.has(p.name)?!1:(o.add(p.name),!0)}).map(function(p){return"uniform ".concat(p.type," ").concat(p.name,";")}).join(`
`),u=new Set,d=ra(a,n).flatMap(function(p){return p.attributes}).filter(function(p){var b=p.name.replace(/^a_/,"");return u.has(b)?!1:(u.add(b),!0)}).map(function(p){var b=p.name.replace(/^a_/,""),v=p.size===1?"float":"vec".concat(p.size);return"in ".concat(v," v_").concat(b,";")}).join(`
`),c=Qn(a),f=Ki(a,e),h=`#version 300 es
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
`).concat(f,`

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

`).concat(r,`

  #ifdef PICKING_MODE
    // Picking pass: output node ID for pixels within the picking area.
    if (context.sdf > u_pickingPadding * v_pixelToUV) discard;
    fragColor = v_id;
  #else
`).concat(t?`    // Visual pass: apply antialiasing at shape boundary, node opacity once
    // smoothstep provides smooth transition from opaque to transparent
    float alpha = smoothstep(context.aaWidth, -context.aaWidth, context.sdf) * v_opacity;`:`    // Visual pass: hard-edged (no anti-aliasing gradient) shape boundary, node opacity applied once
    float alpha = (context.sdf < 0.0 ? 1.0 : 0.0) * v_opacity;`,`
    // Mix with transparent to fade both color AND alpha together (avoids bright halo)
    fragColor = mix(vec4(0.0), color, alpha);
  #endif
}
`);return h}function so(a,n){var e=new Set;return e.add("u_matrix"),e.add("u_sizeRatio"),e.add("u_correctionRatio"),e.add("u_cameraAngle"),e.add("u_pickingPadding"),e.add("u_nodeDataTexture"),e.add("u_nodeDataTextureWidth"),e.add("u_layerAttributeTexture"),e.add("u_layerAttributeTextureWidth"),e.add("u_layerAttributeTexelsPerNode"),a.forEach(function(t){t.uniforms.forEach(function(r){return e.add(r.name)})}),n.forEach(function(t){t.uniforms.forEach(function(r){return e.add(r.name)})}),Array.from(e)}function lo(a){var n=WebGL2RenderingContext,e=n.UNSIGNED_BYTE,t=n.FLOAT;return[{name:"a_nodeIndex",size:1,type:t},{name:"a_id",size:4,type:e,normalized:!0},{name:"a_opacity",size:1,type:t}]}function nr(a){var n=a.shapes,e=a.layers,t=a.shapeGlobalIds,r=a.antialias,i=r===void 0?!0:r;return{vertexShader:io(n,e),fragmentShader:oo(n,e,t,i),uniforms:so(n,e),attributes:lo()}}function uo(a,n,e){var t=Rt(a,n),r=t.specs;return Object.keys(r).map(function(i){return"flat ".concat(e," ").concat(r[i].size===1?"float":"vec".concat(r[i].size)," v_").concat(i,";")}).join(`
`)}function co(a){var n,e,t=a.shapes,r=a.layers,i=a.shapeGlobalIds,o=Tt(Rt(t,r),{varPrefix:"nodeAttr",baseTexelExpr:"nodeIdx * u_layerAttributeTexelsPerNode",textureWidthUniform:"u_layerAttributeTextureWidth",textureSamplerUniform:"u_layerAttributeTexture"}),s=t.length===1?"float inradiusFactor = ".concat(te((n=t[0].inradiusFactor)!==null&&n!==void 0?n:1),";"):"float inradiusFactor = ".concat(te((e=t[0].inradiusFactor)!==null&&e!==void 0?e:1),`;
  switch (int(shapeId)) {
`).concat(t.map(function(u,d){var c,f=i?i[d]:d;return"    case ".concat(f,": inradiusFactor = ").concat(te((c=u.inradiusFactor)!==null&&c!==void 0?c:1),"; break;")}).join(`
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
`.concat(uo(t,r,"out"),`

`).concat(Ae,`
`).concat(Ue,`
`).concat(tt,`

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

  `).concat(ir,`
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
`);return l}function ho(a){var n=a.shapes,e=a.layers,t=a.shapeGlobalIds,r=Qn(n),i=Et(n).map(function(f){return"uniform ".concat(f.type," ").concat(f.name,";")}).join(`
`),o=function(h){return Qt(h,"nodeUV","1.0")},s;if(n.length===1)s="float nodeSdfNormalized = ".concat(o(n[0]),";");else{var l=n.map(function(f,h){var p=t?t[h]:h;return"    case ".concat(p,": nodeSdfNormalized = ").concat(o(f),"; break;")}).join(`
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
`.concat(uo(n,e,"in"),`

uniform float u_cameraAngle;
`).concat(i,`

layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 fragPicking;

`).concat(r,`
`).concat(Zi,`
`).concat(Qi,`
`).concat(Ji,`
`).concat(eo,`

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
`);return c}function fo(a){var n=["u_matrix","u_sizeRatio","u_correctionRatio","u_cameraAngle","u_resolution","u_pixelRatio","u_labelMargin","u_zoomLabelSizeRatio","u_labelPixelSnapping","u_nodeDataTexture","u_nodeDataTextureWidth","u_nodeFrameTexture","u_nodeFrameTextureWidth","u_layerAttributeTexture","u_layerAttributeTextureWidth","u_layerAttributeTexelsPerNode"],e=z(Et(a)),t;try{for(e.s();!(t=e.n()).done;){var r=t.value;n.includes(r.name)||n.push(r.name)}}catch(i){e.e(i)}finally{e.f()}return n}function go(a){return{vertexShader:co(a),fragmentShader:ho(a),uniforms:fo(a.shapes)}}function po(a,n,e,t){var r,i,o=t.label,s=o===void 0?{}:o,l=t.shapes,u=t.layers,d=t.getAttributeTexture,c=t.shapeGlobalIds;if(l.length===0)throw new Error("createBackdropProgram: at least one shape must be provided in 'shapes'");var f=(r=s.margin)!==null&&r!==void 0?r:5,h=(i=s.zoomToLabelSizeRatioFunction)!==null&&i!==void 0?i:function(){return 1},p={shapes:l,layers:u,shapeGlobalIds:c},b=go(p),v=(function(g){function m(){var y;K(this,m);for(var _=arguments.length,x=new Array(_),T=0;T<_;T++)x[T]=arguments[T];return y=ne(this,m,[].concat(x)),S(y,"totalBackdropCount",0),S(y,"bufferCapacity",0),y}return ae(m,g),Z(m,[{key:"getDefinition",value:function(){var _=WebGL2RenderingContext,x=_.FLOAT,T=_.TRIANGLE_STRIP;return{VERTICES:4,VERTEX_SHADER_SOURCE:b.vertexShader,FRAGMENT_SHADER_SOURCE:b.fragmentShader,METHOD:T,UNIFORMS:b.uniforms,ATTRIBUTES:[{name:"a_nodeIndex",size:1,type:x},{name:"a_labelWidth",size:1,type:x},{name:"a_labelHeight",size:1,type:x},{name:"a_textHeight",size:1,type:x},{name:"a_positionMode",size:1,type:x},{name:"a_labelAngle",size:1,type:x},{name:"a_backdropColor",size:4,type:x},{name:"a_backdropShadowColor",size:4,type:x},{name:"a_backdropShadowBlur",size:1,type:x},{name:"a_backdropPadding",size:1,type:x},{name:"a_backdropBorderColor",size:4,type:x},{name:"a_backdropExtra",size:4,type:x},{name:"a_labelBoxOffset",size:2,type:x}],CONSTANT_ATTRIBUTES:[{name:"a_quadCorner",size:2,type:x}],CONSTANT_DATA:[[-1,-1],[1,-1],[-1,1],[1,1]]}}},{key:"processBackdrop",value:function(_,x){var T=this.floats,E=this.STRIDE,A=_*E;T[A++]=x.nodeIndex,T[A++]=x.labelWidth,T[A++]=x.labelHeight,T[A++]=x.textHeight,T[A++]=Je[x.position],T[A++]=x.labelAngle,T[A++]=x.backdropColor[0],T[A++]=x.backdropColor[1],T[A++]=x.backdropColor[2],T[A++]=x.backdropColor[3],T[A++]=x.backdropShadowColor[0],T[A++]=x.backdropShadowColor[1],T[A++]=x.backdropShadowColor[2],T[A++]=x.backdropShadowColor[3],T[A++]=x.backdropShadowBlur,T[A++]=x.backdropPadding,T[A++]=x.backdropBorderColor[0],T[A++]=x.backdropBorderColor[1],T[A++]=x.backdropBorderColor[2],T[A++]=x.backdropBorderColor[3],T[A++]=x.backdropBorderWidth,T[A++]=x.backdropCornerRadius,T[A++]=x.backdropLabelPadding,T[A++]=x.backdropArea,T[A++]=x.labelBoxOffset[0],T[A++]=x.labelBoxOffset[1]}},{key:"setUniforms",value:function(_,x){var T=x.gl,E=x.uniformLocations;T.uniformMatrix3fv(E.u_matrix,!1,_.matrix),T.uniform1f(E.u_sizeRatio,_.sizeRatio),T.uniform1f(E.u_correctionRatio,_.correctionRatio),T.uniform1f(E.u_cameraAngle,_.cameraAngle),T.uniform2f(E.u_resolution,_.width*_.pixelRatio,_.height*_.pixelRatio),T.uniform1f(E.u_pixelRatio,_.pixelRatio),T.uniform1f(E.u_labelMargin,m.labelMargin),T.uniform1f(E.u_zoomLabelSizeRatio,1/h(_.zoomRatio)),T.uniform1f(E.u_labelPixelSnapping,_.labelPixelSnapping),T.uniform1i(E.u_nodeDataTexture,_.nodeDataTextureUnit),T.uniform1i(E.u_nodeDataTextureWidth,_.nodeDataTextureWidth),T.uniform1i(E.u_nodeFrameTexture,_.nodeFrameTextureUnit),T.uniform1i(E.u_nodeFrameTextureWidth,_.nodeFrameTextureWidth);var A=d();E.u_layerAttributeTexture&&A&&(A.bind(Oe),T.uniform1i(E.u_layerAttributeTexture,Oe),T.uniform1i(E.u_layerAttributeTextureWidth,A.getTextureWidth()),T.uniform1i(E.u_layerAttributeTexelsPerNode,A.getTexelsPerItem()));var C=z(Et(l)),w;try{for(C.s();!(w=C.n()).done;){var k=w.value;this.setTypedUniform(k,x)}}catch(R){C.e(R)}finally{C.f()}}},{key:"hasNothingToRender",value:function(){return this.totalBackdropCount===0}},{key:"drawWebGL",value:function(_,x){var T=x.gl;this.totalBackdropCount!==0&&(this.isInstanced?T.drawArraysInstanced(_,0,this.VERTICES,this.totalBackdropCount):T.drawArrays(_,0,this.totalBackdropCount*this.VERTICES))}},{key:"reallocate",value:function(_){this.totalBackdropCount=_,_>this.bufferCapacity&&(this.bufferCapacity=Math.max(_,Math.ceil(this.bufferCapacity*1.5)||10),oe(m,"reallocate",this,3)([this.bufferCapacity]))}}])})(He);return S(v,"labelMargin",f),new v(a,n,e)}var ur=(function(a){function n(){var e;K(this,n);for(var t=arguments.length,r=new Array(t),i=0;i<t;i++)r[i]=arguments[i];return e=ne(this,n,[].concat(r)),S(e,"totalCharacterCount",0),S(e,"bufferCapacity",0),e}return ae(n,a),Z(n,[{key:"processLabel",value:function(t,r,i){if(i.hidden||!i.text)return 0;for(var o=i.text,s=o.length,l=0;l<s;l++){var u=o[l];this.processCharacter(r+l,i,u,l)}return s}},{key:"hasNothingToRender",value:function(){return this.totalCharacterCount===0}},{key:"drawWebGL",value:function(t,r){var i=r.gl;this.totalCharacterCount!==0&&(this.isInstanced?i.drawArraysInstanced(t,0,this.VERTICES,this.totalCharacterCount):i.drawArrays(t,0,this.totalCharacterCount*this.VERTICES))}},{key:"reallocate",value:function(t){this.totalCharacterCount=t,t>this.bufferCapacity&&(this.bufferCapacity=Math.max(t,Math.ceil(this.bufferCapacity*1.5)||1e3),oe(n,"reallocate",this,3)([this.bufferCapacity]))}}])})(He);function id(){var a=`#version 300 es

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

`.concat(Ae,`
`).concat(Ue,`
`).concat(tt,`
`).concat(sr,`

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

  `).concat(ir,`

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
`);return a}var od=`#version 300 es
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
`;function sd(a,n,e,t){var r,i,o=t.label,s=o===void 0?{}:o,l=(r=s.margin)!==null&&r!==void 0?r:et,u=(i=s.zoomToLabelSizeRatioFunction)!==null&&i!==void 0?i:function(){return 1},d=id(),c=(function(f){function h(){var p;K(this,h);for(var b=arguments.length,v=new Array(b),g=0;g<b;g++)v[g]=arguments[g];return p=ne(this,h,[].concat(v)),S(p,"totalCount",0),S(p,"bufferCapacity",0),p}return ae(h,f),Z(h,[{key:"getDefinition",value:function(){var b=WebGL2RenderingContext,v=b.FLOAT,g=b.UNSIGNED_BYTE,m=b.TRIANGLE_STRIP;return{VERTICES:4,VERTEX_SHADER_SOURCE:d,FRAGMENT_SHADER_SOURCE:od,METHOD:m,UNIFORMS:["u_matrix","u_sizeRatio","u_correctionRatio","u_cameraAngle","u_resolution","u_pixelRatio","u_labelMargin","u_zoomLabelSizeRatio","u_labelPixelSnapping","u_pickingPadding","u_nodeDataTexture","u_nodeDataTextureWidth","u_nodeFrameTexture","u_nodeFrameTextureWidth"],ATTRIBUTES:[{name:"a_nodeIndex",size:1,type:v},{name:"a_id",size:4,type:g,normalized:!0},{name:"a_color",size:4,type:g,normalized:!0},{name:"a_labelWidth",size:1,type:v},{name:"a_labelHeight",size:1,type:v},{name:"a_textHeight",size:1,type:v},{name:"a_positionMode",size:1,type:v},{name:"a_labelAngle",size:1,type:v},{name:"a_padding",size:1,type:v}],CONSTANT_ATTRIBUTES:[{name:"a_quadCorner",size:2,type:v}],CONSTANT_DATA:[[-1,-1],[1,-1],[-1,1],[1,1]]}}},{key:"processLabelBackground",value:function(b,v){var g=this.floats,m=this.ints,y=b*this.STRIDE;g[y++]=v.nodeIndex,m[y++]=v.id,g[y++]=v.color,g[y++]=v.labelWidth,g[y++]=v.labelHeight,g[y++]=v.textHeight,g[y++]=v.positionMode,g[y++]=v.labelAngle,g[y++]=v.padding}},{key:"setUniforms",value:function(b,v){var g=v.gl,m=v.uniformLocations;g.uniformMatrix3fv(m.u_matrix,!1,b.matrix),g.uniform1f(m.u_sizeRatio,b.sizeRatio),g.uniform1f(m.u_correctionRatio,b.correctionRatio),g.uniform1f(m.u_cameraAngle,b.cameraAngle),g.uniform2f(m.u_resolution,b.width*b.pixelRatio,b.height*b.pixelRatio),g.uniform1f(m.u_pixelRatio,b.pixelRatio),g.uniform1f(m.u_labelMargin,h.labelMargin),g.uniform1f(m.u_zoomLabelSizeRatio,1/u(b.zoomRatio)),g.uniform1f(m.u_labelPixelSnapping,b.labelPixelSnapping),g.uniform1f(m.u_pickingPadding,b.labelPickingPadding),g.uniform1i(m.u_nodeDataTexture,b.nodeDataTextureUnit),g.uniform1i(m.u_nodeDataTextureWidth,b.nodeDataTextureWidth),g.uniform1i(m.u_nodeFrameTexture,b.nodeFrameTextureUnit),g.uniform1i(m.u_nodeFrameTextureWidth,b.nodeFrameTextureWidth)}},{key:"hasNothingToRender",value:function(){return this.totalCount===0}},{key:"drawWebGL",value:function(b,v){var g=v.gl;this.totalCount!==0&&g.drawArraysInstanced(g.TRIANGLE_STRIP,0,this.VERTICES,this.totalCount)}},{key:"reallocate",value:function(b){this.totalCount=b,b>this.bufferCapacity&&(this.bufferCapacity=Math.max(b,Math.ceil(this.bufferCapacity*1.5)||10),oe(h,"reallocate",this,3)([this.bufferCapacity]))}}])})(He);return S(c,"labelMargin",l),new c(a,n,e)}var Ee={fontSize:64,buffer:8,radius:24,cutoff:.25,maxTextureSize:2048,debounceTimeout:100},Xt=2,Kt=1e20;function ld(a,n,e,t,r){var i=a+r*4,o=document.createElement("canvas");o.width=i,o.height=i;var s=o.getContext("2d",{willReadFrequently:!0});return s.font="".concat(t," ").concat(e," ").concat(a,"px ").concat(n),s.textBaseline="alphabetic",s.textAlign="left",s.fillStyle="black",{ctx:s,canvasSize:i,gridOuter:new Float64Array(i*i),gridInner:new Float64Array(i*i),f:new Float64Array(i),z:new Float64Array(i+1),v:new Uint16Array(i)}}function ud(a,n,e,t,r){var i=a.ctx,o=a.canvasSize,s=i.measureText(n),l=s.width,u=s.actualBoundingBoxAscent,d=s.actualBoundingBoxDescent,c=s.actualBoundingBoxLeft,f=s.actualBoundingBoxRight,h=Math.ceil(u),p=Math.ceil(c),b=Math.max(0,Math.min(o-e,Math.ceil(c)+Math.ceil(f))),v=Math.min(o-e,h+Math.ceil(d)),g=b+2*e,m=v+2*e,y=Math.max(g*m,0),_=new Uint8ClampedArray(y),x={data:_,width:g,height:m,glyphWidth:b,glyphHeight:v,glyphTop:h,glyphLeft:p,glyphAdvance:l};if(b===0||v===0)return x;var T=a.gridInner,E=a.gridOuter;i.clearRect(e,e,b,v),i.fillText(n,e+p,e+h);var A=i.getImageData(e,e,b,v);E.fill(Kt,0,y),T.fill(0,0,y);for(var C=0;C<v;C++)for(var w=0;w<b;w++){var k=A.data[4*(C*b+w)+3]/255;if(k!==0){var R=(C+e)*g+w+e;if(k===1)E[R]=0,T[R]=Kt;else{var P=.5-k;E[R]=P>0?P*P:0,T[R]=P<0?P*P:0}}}zi(E,0,0,g,m,g,a.f,a.v,a.z),zi(T,e,e,b,v,g,a.f,a.v,a.z);for(var D=0;D<y;D++){var I=Math.sqrt(E[D])-Math.sqrt(T[D]);_[D]=Math.round(255-255*(I/t+r))}return x}function zi(a,n,e,t,r,i,o,s,l){for(var u=n;u<n+t;u++)Bi(a,e*i+u,i,r,o,s,l);for(var d=e;d<e+r;d++)Bi(a,d*i+n,1,t,o,s,l)}function Bi(a,n,e,t,r,i,o){i[0]=0,o[0]=-Kt,o[1]=Kt,r[0]=a[n];for(var s=1,l=0,u=0;s<t;s++){r[s]=a[n+s*e];var d=s*s;do{var c=i[l];u=(r[s]-r[c]+d-c*c)/(s-c)/2}while(u<=o[l]&&--l>-1);l++,i[l]=s,o[l]=u,o[l+1]=Kt}for(var f=0,h=0;f<t;f++){for(;o[h+1]<f;)h++;var p=i[h],b=f-p;a[n+f*e]=r[p]+b*b}}var Qe=(function(a){function n(){var e,t=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};return K(this,n),e=ne(this,n),S(e,"fonts",new Map),S(e,"textures",[]),S(e,"cursor",{x:0,y:0,rowHeight:0,atlasIndex:0}),S(e,"pendingGlyphs",[]),S(e,"debounceTimer",null),e.options=B(B({},Ee),t),e.canvas=document.createElement("canvas"),e.canvas.width=e.options.maxTextureSize,e.canvas.height=e.options.maxTextureSize,e.ctx=e.canvas.getContext("2d",{willReadFrequently:!0}),e.measureCanvas=document.createElement("canvas"),e.measureCtx=e.measureCanvas.getContext("2d"),e.textures.push(e.ctx.getImageData(0,0,1,1)),e}return ae(n,a),Z(n,[{key:"getFontKey",value:function(t){return"".concat(t.family,"-").concat(t.weight,"-").concat(t.style)}},{key:"registerFont",value:function(t){var r=this.getFontKey(t);if(this.fonts.has(r))return r;var i=ld(this.options.fontSize,t.family,t.weight,t.style,this.options.buffer);return this.fonts.set(r,{descriptor:t,generator:i,glyphs:new Map}),r}},{key:"ensureGlyphs",value:function(t,r){var i=this.fonts.get(r);if(!i)throw new Error('Font "'.concat(r,'" is not registered. Call registerFont() first.'));var o=!1,s=z(t),l;try{for(s.s();!(l=s.n()).done;){var u=l.value,d=u.codePointAt(0);d!==void 0&&(i.glyphs.has(d)||(this.pendingGlyphs.push({fontKey:r,charCode:d}),o=!0))}}catch(c){s.e(c)}finally{s.f()}o&&this.scheduleTextureGeneration()}},{key:"measureText",value:function(t,r){var i=this.fonts.get(r);if(!i)throw new Error('Font "'.concat(r,'" is not registered.'));var o=i.descriptor,s=o.family,l=o.weight,u=o.style;return this.measureCtx.font="".concat(u," ").concat(l," ").concat(this.options.fontSize,"px ").concat(s),this.measureCtx.measureText(t).width}},{key:"getGlyph",value:function(t,r){var i=this.fonts.get(r);if(i)return i.glyphs.get(t)}},{key:"getTextures",value:function(){return this.textures}},{key:"getFontCount",value:function(){return this.fonts.size}},{key:"getGlyphCount",value:function(){var t=0,r=z(this.fonts.values()),i;try{for(r.s();!(i=r.n()).done;){var o=i.value;t+=o.glyphs.size}}catch(s){r.e(s)}finally{r.f()}return t}},{key:"hasPendingGlyphs",value:function(){return this.pendingGlyphs.length>0}},{key:"flush",value:function(){this.debounceTimer&&(clearTimeout(this.debounceTimer),this.debounceTimer=null),this.generateTextures()}},{key:"destroy",value:function(){this.debounceTimer&&clearTimeout(this.debounceTimer),this.fonts.clear(),this.textures=[],this.pendingGlyphs=[],this.removeAllListeners()}},{key:"scheduleTextureGeneration",value:function(){var t=this;this.debounceTimer===null&&(this.options.debounceTimeout===null?this.generateTextures():this.debounceTimer=setTimeout(function(){t.debounceTimer=null,t.generateTextures()},this.options.debounceTimeout))}},{key:"generateTextures",value:function(){if(this.pendingGlyphs.length!==0){var t=this.options,r=t.maxTextureSize,i=t.buffer,o=t.radius,s=t.cutoff,l=z(this.pendingGlyphs),u;try{for(l.s();!(u=l.n()).done;){var d=u.value,c=d.fontKey,f=d.charCode,h=this.fonts.get(c);if(!(!h||h.glyphs.has(f))){var p=String.fromCodePoint(f),b=ud(h.generator,p,i,o,s),v=b.width,g=b.height;this.cursor.x+v+Xt>r&&(this.cursor.x=0,this.cursor.y+=this.cursor.rowHeight+Xt,this.cursor.rowHeight=0),this.cursor.y+g+Xt>r&&(this.finalizeCurrentTexture(),this.cursor={x:0,y:0,rowHeight:0,atlasIndex:this.cursor.atlasIndex+1},this.ctx.clearRect(0,0,r,r));for(var m=b.data,y=new Uint8ClampedArray(v*g*4),_=0;_<m.length;_++){var x=_*4;y[x]=255,y[x+1]=255,y[x+2]=255,y[x+3]=m[_]}var T=new ImageData(y,v,g);this.ctx.putImageData(T,this.cursor.x,this.cursor.y);var E={charCode:f,width:b.glyphWidth,height:b.glyphHeight,bearingX:-b.glyphLeft-i,bearingY:b.glyphTop+i,advance:b.glyphAdvance,atlasX:this.cursor.x,atlasY:this.cursor.y,atlasWidth:v,atlasHeight:g,atlasIndex:this.cursor.atlasIndex};h.glyphs.set(f,E),this.cursor.x+=v+Xt,this.cursor.rowHeight=Math.max(this.cursor.rowHeight,g)}}}catch(A){l.e(A)}finally{l.f()}this.finalizeCurrentTexture(),this.pendingGlyphs=[],this.emit(n.ATLAS_UPDATED_EVENT,{textures:this.textures,glyphCount:this.getGlyphCount()})}}},{key:"finalizeCurrentTexture",value:function(){var t=this.options.maxTextureSize,r=this.cursor.y>0||this.cursor.rowHeight>0,i=Math.min(t,Math.max(this.cursor.x,r?t:1)),o=Math.min(t,this.cursor.y+this.cursor.rowHeight+Xt),s=this.ctx.getImageData(0,0,i,o);this.cursor.atlasIndex>=this.textures.length?this.textures.push(s):this.textures[this.cursor.atlasIndex]=s}}])})(Hi.EventEmitter);S(Qe,"ATLAS_UPDATED_EVENT","atlasUpdated");var dd=Ee.fontSize;function vo(){var a=`  // -------------------------------------------------------------------------
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
const float ATLAS_FONT_SIZE = `.concat(te(dd),`;

// ============================================================================
// Helper Functions
// ============================================================================

`).concat(Ae,`
`).concat(Ue,`
`).concat(tt,`
`).concat(or,`

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

`).concat(a,`

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
`);return n}function mo(){var a=`#version 300 es
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
`;return a}function bo(){return["u_matrix","u_sizeRatio","u_correctionRatio","u_cameraAngle","u_resolution","u_atlasSize","u_atlas","u_gamma","u_sdfBuffer","u_pixelRatio","u_nodeDataTexture","u_nodeDataTextureWidth","u_nodeFrameTexture","u_nodeFrameTextureWidth","u_zoomLabelSizeRatio","u_labelPixelSnapping"]}function yo(){return{vertexShader:vo(),fragmentShader:mo(),uniforms:bo()}}function xo(a,n,e,t){var r,i,o=t.label,s=o===void 0?{}:o,l=(r=s.margin)!==null&&r!==void 0?r:et,u=(i=s.zoomToLabelSizeRatioFunction)!==null&&i!==void 0?i:function(){return 1},d=yo(),c=(function(f){function h(p,b,v){var g,m,y,_;if(K(this,h),_=ne(this,h,[p,b,v]),S(_,"atlasTexture",null),S(_,"atlasNeedsUpdate",!1),S(_,"labelGlyphCache",new Map),_.atlasFontSize=Ee.fontSize*jt(),_.atlasManager=new Qe({fontSize:_.atlasFontSize}),_.gamma=.025,_.sdfBuffer=Ee.cutoff,_.atlasTexture=p.createTexture(),!_.atlasTexture)throw new Error("NodeLabelProgram: failed to create atlas texture");p.bindTexture(p.TEXTURE_2D,_.atlasTexture),p.texParameteri(p.TEXTURE_2D,p.TEXTURE_WRAP_S,p.CLAMP_TO_EDGE),p.texParameteri(p.TEXTURE_2D,p.TEXTURE_WRAP_T,p.CLAMP_TO_EDGE),p.texParameteri(p.TEXTURE_2D,p.TEXTURE_MIN_FILTER,p.LINEAR),p.texParameteri(p.TEXTURE_2D,p.TEXTURE_MAG_FILTER,p.LINEAR),p.bindTexture(p.TEXTURE_2D,null),_.atlasManager.on(Qe.ATLAS_UPDATED_EVENT,function(){_.atlasNeedsUpdate=!0});var x={family:((g=s.font)===null||g===void 0?void 0:g.family)||"sans-serif",weight:((m=s.font)===null||m===void 0?void 0:m.weight)||"normal",style:((y=s.font)===null||y===void 0?void 0:y.style)||"normal"};return _.defaultFontKey=_.atlasManager.registerFont(x),_}return ae(h,f),Z(h,[{key:"getDefinition",value:function(){var b=WebGL2RenderingContext,v=b.FLOAT,g=b.UNSIGNED_BYTE,m=b.TRIANGLE_STRIP;return{VERTICES:4,VERTEX_SHADER_SOURCE:d.vertexShader,FRAGMENT_SHADER_SOURCE:d.fragmentShader,METHOD:m,UNIFORMS:d.uniforms,ATTRIBUTES:[{name:"a_nodeIndex",size:1,type:v},{name:"a_charOffset",size:2,type:v},{name:"a_charSize",size:2,type:v},{name:"a_texCoords",size:4,type:v},{name:"a_color",size:4,type:g,normalized:!0},{name:"a_margin",size:1,type:v},{name:"a_positionMode",size:1,type:v},{name:"a_labelWidth",size:1,type:v},{name:"a_labelHeight",size:1,type:v},{name:"a_verticalCenter",size:1,type:v},{name:"a_textHeight",size:1,type:v},{name:"a_labelAngle",size:1,type:v}],CONSTANT_ATTRIBUTES:[{name:"a_quadCorner",size:2,type:v}],CONSTANT_DATA:[[-1,-1],[1,-1],[-1,1],[1,1]]}}},{key:"prepareLabelGlyphs",value:function(b,v){if(v.hidden||!v.text){this.labelGlyphCache.delete(b);return}var g=v.text,m=v.fontKey||this.defaultFontKey;this.atlasManager.ensureGlyphs(g,m);var y=[],_=[],x=0,T=0,E=0,A=z(g),C;try{for(A.s();!(C=A.n()).done;){var w=C.value,k=w.codePointAt(0);if(k===void 0){y.push(void 0),_.push(x);continue}var R=this.atlasManager.getGlyph(k,m);y.push(R),_.push(x),R&&(x+=R.advance,T=Math.max(T,R.bearingY),E=Math.max(E,R.atlasHeight-R.bearingY))}}catch(P){A.e(P)}finally{A.f()}this.labelGlyphCache.set(b,{glyphs:y,xOffsets:_,totalWidth:x,totalHeight:T+E,verticalCenterOffset:(T-E)/2})}},{key:"processCharacter",value:function(b,v,g,m){var y=this.floats,_=this.STRIDE,x=b*_,T=this.labelGlyphCache.get(v.parentKey);if(!T||!T.glyphs[m]){for(var E=0;E<_;E++)y[x+E]=0;return}var A=T.glyphs[m],C=T.xOffsets[m],w=v.size/this.atlasFontSize,k=he(v.color),R=x;y[R++]=v.nodeIndex,y[R++]=(C+A.bearingX)*w,y[R++]=-A.bearingY*w,y[R++]=A.atlasWidth*w,y[R++]=A.atlasHeight*w,y[R++]=A.atlasX,y[R++]=A.atlasY,y[R++]=A.atlasWidth,y[R++]=A.atlasHeight,y[R++]=k,y[R++]=v.margin,y[R++]=Je[v.position],y[R++]=T.totalWidth*w,y[R++]=v.size,y[R++]=T.verticalCenterOffset*w,y[R++]=T.totalHeight*w,y[R++]=v.labelAngle}},{key:"processLabel",value:function(b,v,g){return this.prepareLabelGlyphs(b,g),oe(h,"processLabel",this,3)([b,v,g])}},{key:"updateAtlasTexture",value:function(){if(this.atlasNeedsUpdate){var b=this.normalProgram.gl,v=this.atlasManager.getTextures();if(v.length!==0){var g=v[0];b.bindTexture(b.TEXTURE_2D,this.atlasTexture),b.texImage2D(b.TEXTURE_2D,0,b.RGBA,g.width,g.height,0,b.RGBA,b.UNSIGNED_BYTE,g.data),b.bindTexture(b.TEXTURE_2D,null),this.atlasNeedsUpdate=!1}}}},{key:"setUniforms",value:function(b,v){var g=v.gl,m=v.uniformLocations;g.uniformMatrix3fv(m.u_matrix,!1,b.matrix),g.uniform1f(m.u_sizeRatio,b.sizeRatio),g.uniform1f(m.u_correctionRatio,b.correctionRatio),g.uniform1f(m.u_cameraAngle,b.cameraAngle),g.uniform2f(m.u_resolution,b.width*b.pixelRatio,b.height*b.pixelRatio);var y=this.atlasManager.getTextures();y.length>0?g.uniform2f(m.u_atlasSize,y[0].width,y[0].height):g.uniform2f(m.u_atlasSize,1,1),g.activeTexture(g.TEXTURE0),g.bindTexture(g.TEXTURE_2D,this.atlasTexture),g.uniform1i(m.u_atlas,0),m.u_nodeDataTexture!==void 0&&g.uniform1i(m.u_nodeDataTexture,b.nodeDataTextureUnit),m.u_nodeDataTextureWidth!==void 0&&g.uniform1i(m.u_nodeDataTextureWidth,b.nodeDataTextureWidth),g.uniform1i(m.u_nodeFrameTexture,b.nodeFrameTextureUnit),g.uniform1i(m.u_nodeFrameTextureWidth,b.nodeFrameTextureWidth),g.uniform1f(m.u_gamma,this.gamma),g.uniform1f(m.u_sdfBuffer,this.sdfBuffer),g.uniform1f(m.u_pixelRatio,b.pixelRatio),g.uniform1f(m.u_zoomLabelSizeRatio,1/h.zoomToLabelSizeRatioFunction(b.zoomRatio)),g.uniform1f(m.u_labelPixelSnapping,b.labelPixelSnapping)}},{key:"renderProgram",value:function(b,v){this.updateAtlasTexture(),this.atlasManager.hasPendingGlyphs()&&(this.atlasManager.flush(),this.updateAtlasTexture()),oe(h,"renderProgram",this,3)([b,v])}},{key:"registerFont",value:function(b){var v=arguments.length>1&&arguments[1]!==void 0?arguments[1]:"normal",g=arguments.length>2&&arguments[2]!==void 0?arguments[2]:"normal";return this.atlasManager.registerFont({family:b,weight:v,style:g})}},{key:"getAtlasManager",value:function(){return this.atlasManager}},{key:"measureLabel",value:function(b,v,g){var m=g||this.defaultFontKey;this.atlasManager.ensureGlyphs(b,m),this.atlasManager.hasPendingGlyphs()&&this.atlasManager.flush();var y=0,_=0,x=0,T=z(b),E;try{for(T.s();!(E=T.n()).done;){var A=E.value,C=A.codePointAt(0);if(C!==void 0){var w=this.atlasManager.getGlyph(C,m);w&&(y+=w.advance,_=Math.max(_,w.bearingY),x=Math.max(x,w.atlasHeight-w.bearingY))}}}catch(R){T.e(R)}finally{T.f()}var k=v/this.atlasFontSize;return{width:y*k,height:v,textHeight:(_+x)*k}}},{key:"ensureGlyphsReady",value:function(b,v){var g=v||this.defaultFontKey,m=z(b),y;try{for(m.s();!(y=m.n()).done;){var _=y.value;this.atlasManager.ensureGlyphs(_,g)}}catch(x){m.e(x)}finally{m.f()}this.atlasManager.flush()}},{key:"kill",value:function(){var b=this.normalProgram.gl;this.atlasTexture&&(b.deleteTexture(this.atlasTexture),this.atlasTexture=null),this.atlasManager.destroy(),this.labelGlyphCache.clear(),oe(h,"kill",this,3)([])}}])})(ur);return S(c,"labelMargin",l),S(c,"zoomToLabelSizeRatioFunction",u),new c(a,n,e)}var cd=`#version 300 es
precision highp float;

in float v_edgeDist;

// R32F target: only the .r channel is stored.
out vec4 fragColor;

void main() {
  fragColor = vec4(v_edgeDist, 0.0, 0.0, 0.0);
}
`;function hd(a,n,e){var t=Qn(a),r=Et(a).map(function(p){return"uniform ".concat(p.type," ").concat(p.name,";")}).join(`
`),i=no(a,e),o=i.code,s=i.multiShape,l=Rt(a,n),u=Object.keys(l.specs).map(function(p){return"float v_".concat(p,";")}).join(`
`),d=Tt(l,{varPrefix:"nodeAttr",baseTexelExpr:"nodeIdx * u_layerAttributeTexelsPerNode",textureWidthUniform:"u_layerAttributeTextureWidth",textureSamplerUniform:"u_layerAttributeTexture"}),c=d.fetchCode,f=d.varyingAssignments,h=`#version 300 es
precision highp float;

uniform float u_cameraAngle;
uniform sampler2D u_nodeDataTexture;
uniform int u_nodeDataTextureWidth;
uniform float u_frameTextureWidth;
uniform float u_frameTextureHeight;
uniform sampler2D u_layerAttributeTexture;
uniform int u_layerAttributeTextureWidth;
uniform int u_layerAttributeTexelsPerNode;
`.concat(r,`

in float a_nodeIndex;     // node-data texture index (also the target frame texel)
in float a_positionMode;  // 0=right 1=left 2=above 3=below 4=over
in float a_labelAngle;    // intrinsic label angle (radians)

out float v_edgeDist;

// Shape attributes (plain globals: this pass is vertex-only)
`).concat(u,`

`).concat(Ae,`
`).concat(Ue,`
`).concat(t,`
`).concat(o,`
`).concat(or,`

void main() {
  int nodeIdx = int(a_nodeIndex);
`).concat(c,`
`).concat(f,`
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
`);return h}var dr=(function(){function a(n,e){K(this,a),S(this,"uniformLocations",{});var t=e.shapes,r=e.layers,i=e.shapeGlobalIds;if(t.length===0)throw new Error("NodeLabelFramePass: at least one shape must be provided");this.gl=n,this.shapeUniforms=Et(t),this.hasAttributeData=Object.keys(Rt(t,r).offsets).length>0,this.vertexShader=Yn(n,hd(t,r,i)),this.fragmentShader=Kn(n,cd),this.program=Zn(n,[this.vertexShader,this.fragmentShader]);var o=["u_cameraAngle","u_nodeDataTexture","u_nodeDataTextureWidth","u_frameTextureWidth","u_frameTextureHeight","u_layerAttributeTexture","u_layerAttributeTextureWidth","u_layerAttributeTexelsPerNode"].concat($(this.shapeUniforms.map(function(g){return g.name}))),s=z(o),l;try{for(s.s();!(l=s.n()).done;){var u=l.value;this.uniformLocations[u]=n.getUniformLocation(this.program,u)}}catch(g){s.e(g)}finally{s.f()}var d=a.FLOATS_PER_POINT*4;this.vao=n.createVertexArray(),this.buffer=n.createBuffer(),n.bindVertexArray(this.vao),n.bindBuffer(n.ARRAY_BUFFER,this.buffer);var c=z([["a_nodeIndex",0],["a_positionMode",4],["a_labelAngle",8]]),f;try{for(c.s();!(f=c.n()).done;){var h=Q(f.value,2),p=h[0],b=h[1],v=n.getAttribLocation(this.program,p);v>=0&&(n.enableVertexAttribArray(v),n.vertexAttribPointer(v,1,n.FLOAT,!1,d,b))}}catch(g){c.e(g)}finally{c.f()}n.bindVertexArray(null)}return Z(a,[{key:"run",value:function(e,t,r,i,o){if(t!==0){var s=this.gl;s.useProgram(this.program),s.bindVertexArray(this.vao),s.bindBuffer(s.ARRAY_BUFFER,this.buffer),s.bufferData(s.ARRAY_BUFFER,e.subarray(0,t*a.FLOATS_PER_POINT),s.DYNAMIC_DRAW);var l=this.uniformLocations;s.uniform1f(l.u_cameraAngle,i.cameraAngle),s.uniform1i(l.u_nodeDataTexture,i.nodeDataTextureUnit),s.uniform1i(l.u_nodeDataTextureWidth,i.nodeDataTextureWidth),s.uniform1f(l.u_frameTextureWidth,r.getTextureWidth()),s.uniform1f(l.u_frameTextureHeight,r.getTextureHeight()),this.hasAttributeData&&o&&(o.bind(Oe),l.u_layerAttributeTexture&&s.uniform1i(l.u_layerAttributeTexture,Oe),l.u_layerAttributeTextureWidth&&s.uniform1i(l.u_layerAttributeTextureWidth,o.getTextureWidth()),l.u_layerAttributeTexelsPerNode&&s.uniform1i(l.u_layerAttributeTexelsPerNode,o.getTexelsPerItem()));var u=z(this.shapeUniforms),d;try{for(u.s();!(d=u.n()).done;){var c=d.value;lr(s,this.uniformLocations[c.name],c)}}catch(f){u.e(f)}finally{u.f()}r.bindAsRenderTarget(),s.disable(s.BLEND),s.disable(s.DEPTH_TEST),s.drawArrays(s.POINTS,0,t),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindVertexArray(null)}}},{key:"kill",value:function(){var e=this.gl;e.deleteProgram(this.program),e.deleteShader(this.vertexShader),e.deleteShader(this.fragmentShader),e.deleteBuffer(this.buffer),e.deleteVertexArray(this.vao)}}])})();S(dr,"FLOATS_PER_POINT",3);function cr(a,n,e,t,r){var i,o=t.label,s=o===void 0?{}:o,l=t.shapes;if(l.length===0)throw new Error("createNodeProgram: at least one shape must be provided in 'shapes'");var u={},d=[],c;l.forEach(function(E,A){var C=qi(E);A===0&&(c=C),u[E.name]=A,d[A]=St(C)});var f=$(t.layers),h=nr({shapes:l,layers:f,shapeGlobalIds:l.length>1?d:void 0,antialias:r}),p=xo(a,null,e,{label:s}),b=po(a,null,e,{shapes:l,layers:f,getAttributeTexture:function(){return T.getAttributeTexture()},label:s,shapeGlobalIds:l.length>1?d:void 0}),v=sd(a,n,e,{label:s}),g=t.labelAttachments&&Object.keys(t.labelAttachments).length>0?rd(a,null,e,{label:s}):null,m=new dr(a,{shapes:l,layers:f,shapeGlobalIds:l.length>1?d:void 0}),y=ra(l,f),_=ye(y),x=(i=(function(E){function A(C,w,k){var R;K(this,A),R=ne(this,A,[C,w,k]),S(R,"layerLifecycles",new Map),S(R,"layersNeedingRegeneration",new Set),S(R,"attrDescriptors",[]),R._pickingBuffer=w;var P=x.layerTextures.get(C);P||(P=new ta(C,_),x.layerTextures.set(C,P)),R.layerAttributeTexture=P;var D=x.textureRefCounts.get(C)||0;x.textureRefCounts.set(C,D+1),R.packedAttributeData=new Float32Array(_.floatsPerItem),f.forEach(function(G,N){if(G.lifecycle){var F={gl:C,renderer:{refresh:function(){return k.refresh()}},getUniformLocation:function(H){return C.getUniformLocation(R.normalProgram.program,H)},requestShaderRegeneration:function(){R.layersNeedingRegeneration.add(N)},requestRefresh:function(){k.refresh()}},L=G.lifecycle(F);R.layerLifecycles.set(N,L)}}),R.layerLifecycles.forEach(function(G){var N;(N=G.init)===null||N===void 0||N.call(G)});var I=new Map;return R.layerLifecycles.forEach(function(G,N){G.getAttributeData&&I.set(N,G)}),R.attrDescriptors=na(y,_,I),R}return ae(A,E),Z(A,[{key:"getDefinition",value:function(){var w=WebGL2RenderingContext,k=w.FLOAT,R=w.TRIANGLE_STRIP;return{VERTICES:4,VERTEX_SHADER_SOURCE:h.vertexShader,FRAGMENT_SHADER_SOURCE:h.fragmentShader,METHOD:R,UNIFORMS:h.uniforms,ATTRIBUTES:h.attributes,CONSTANT_ATTRIBUTES:[{name:"a_quadCorner",size:2,type:k}],CONSTANT_DATA:[[-1,-1],[1,-1],[-1,1],[1,1]]}}},{key:"maybeRegenerateShaders",value:function(){var w=this;if(this.layersNeedingRegeneration.size!==0){f=f.map(function(N,F){if(w.layersNeedingRegeneration.has(F)){var L=w.layerLifecycles.get(F);if(L!=null&&L.regenerate){var M=L.regenerate();return B(B({},M),{},{lifecycle:N.lifecycle})}}return N}),this.layersNeedingRegeneration.clear(),h=nr({shapes:l,layers:f,shapeGlobalIds:l.length>1?d:void 0,antialias:this.renderer.getSetting("antialiasNodes")});var k=this.normalProgram.gl,R=this.normalProgram,P=R.program,D=R.buffer,I=R.vertexShader,G=R.fragmentShader;k.deleteProgram(P),k.deleteBuffer(D),k.deleteShader(I),k.deleteShader(G),this.normalProgram=this.getProgramInfo("normal",k,h.vertexShader,h.fragmentShader,this._pickingBuffer)}}},{key:"getAttributeTexture",value:function(){return this.layerAttributeTexture}},{key:"uploadLayerTexture",value:function(){this.layerAttributeTexture.upload()}},{key:"process",value:function(w,k,R,P){var D=k*this.STRIDE;if(R.visibility==="hidden"){for(var I=D+this.STRIDE;D<I;D++)this.floats[D]=0;this.floats[k*this.STRIDE]=ao;return}this.processVisibleItem(Ye(w),D,R,P)}},{key:"processVisibleItem",value:function(w,k,R,P){var D,I=this.floats,G=this.ints;if(I[k++]=P,G[k++]=w,I[k++]=(D=R.opacity)!==null&&D!==void 0?D:1,_.floatsPerItem!==0){var N=this.packedAttributeData;aa(this.attrDescriptors,R,N,R.color,this.layerLifecycles,0),this.layerAttributeTexture.updateAllAttributesAtRow(P,N)}}},{key:"setUniforms",value:function(w,k){var R=this,P=k.gl,D=k.uniformLocations;D.u_matrix&&P.uniformMatrix3fv(D.u_matrix,!1,w.matrix),D.u_sizeRatio&&P.uniform1f(D.u_sizeRatio,w.sizeRatio),D.u_correctionRatio&&P.uniform1f(D.u_correctionRatio,w.correctionRatio),D.u_pickingPadding&&P.uniform1f(D.u_pickingPadding,w.nodePickingPadding),D.u_cameraAngle&&P.uniform1f(D.u_cameraAngle,w.cameraAngle),D.u_nodeDataTexture&&P.uniform1i(D.u_nodeDataTexture,w.nodeDataTextureUnit),D.u_nodeDataTextureWidth&&P.uniform1i(D.u_nodeDataTextureWidth,w.nodeDataTextureWidth),D.u_layerAttributeTexture&&(this.layerAttributeTexture.bind(Oe),P.uniform1i(D.u_layerAttributeTexture,Oe)),D.u_layerAttributeTextureWidth&&P.uniform1i(D.u_layerAttributeTextureWidth,this.layerAttributeTexture.getTextureWidth()),D.u_layerAttributeTexelsPerNode&&P.uniform1i(D.u_layerAttributeTexelsPerNode,this.layerAttributeTexture.getTexelsPerItem()),l.forEach(function(I){I.uniforms.forEach(function(G){R.setTypedUniform(G,k)})}),f.forEach(function(I){I.uniforms.forEach(function(G){R.setTypedUniform(G,k)})})}},{key:"render",value:function(w,k,R){this.maybeRegenerateShaders(),oe(A,"render",this,3)([w,k,R])}},{key:"renderProgram",value:function(w,k){var R=k.gl,P=k.program;R.useProgram(P),k===this.normalProgram&&this.layerLifecycles.forEach(function(D){var I;(I=D.beforeRender)===null||I===void 0||I.call(D)}),oe(A,"renderProgram",this,3)([w,k])}},{key:"kill",value:function(){this.layerLifecycles.forEach(function(R){var P;(P=R.kill)===null||P===void 0||P.call(R)}),this.layerLifecycles.clear();var w=this.normalProgram.gl,k=(x.textureRefCounts.get(w)||1)-1;k<=0?(this.layerAttributeTexture.kill(),x.layerTextures.delete(w),x.textureRefCounts.delete(w)):x.textureRefCounts.set(w,k),oe(A,"kill",this,3)([])}}])})(He),S(i,"layerTextures",new WeakMap),S(i,"textureRefCounts",new WeakMap),i),T=new x(a,null,e);return{nodeProgram:T,labelProgram:p,backdropProgram:b,labelBackgroundProgram:v,attachmentProgram:g,framePass:m,shapeSlug:c,shapeNameToIndex:l.length>1?u:void 0,shapeGlobalIds:l.length>1?d:void 0}}var We=6;function tn(a){var n=a.offsets,e=a.specs,t=a.floatsPerItem,r=Object.keys(n);if(r.length===0||t===0)return{uniformDeclarations:"",uniformNames:[],vertexVaryingDeclarations:"",fragmentVaryingDeclarations:"",fetchCode:"",varyingAssignments:""};var i=`
uniform sampler2D u_edgeAttributeTexture;
uniform int u_edgeAttributeTextureWidth;
uniform int u_edgeAttributeTexelsPerEdge;`,o=["u_edgeAttributeTexture","u_edgeAttributeTextureWidth","u_edgeAttributeTexelsPerEdge"],s=r.map(function(h){var p=e[h].size===1?"float":"vec".concat(e[h].size);return"".concat(p," v_").concat(h,";")}),l=s.map(function(h){return"out ".concat(h)}).join(`
`),u=s.map(function(h){return"in ".concat(h)}).join(`
`),d=Tt(a,{varPrefix:"attr",baseTexelExpr:"edgeIdx * u_edgeAttributeTexelsPerEdge",textureWidthUniform:"u_edgeAttributeTextureWidth",textureSamplerUniform:"u_edgeAttributeTexture"}),c=d.fetchCode,f=d.varyingAssignments;return{uniformDeclarations:i,uniformNames:o,vertexVaryingDeclarations:l,fragmentVaryingDeclarations:u,fetchCode:c,varyingAssignments:f}}function fd(a){return`
float findSourceClampT_`.concat(a,`(vec2 source, float sourceSize, int sourceShapeId, float sourceRotateAlign, vec2 target, float margin) {
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
    vec2 pos = path_`).concat(a,`_position(mid, source, target);
    vec2 localPos = rot * ((pos - source) / nodeExtent);
    float sdf = querySDF(sourceShapeId, localPos, effectiveSize);
    if (sdf < 0.0) lo = mid;
    else hi = mid;
  }

  float pathLen = path_`).concat(a,`_length(source, target);
  float marginT = (margin * u_correctionRatio / u_sizeRatio) / pathLen;
  return (lo + hi) * 0.5 + marginT;
}
`)}function gd(a){return`
float findTargetClampT_`.concat(a,`(vec2 source, vec2 target, float targetSize, int targetShapeId, float targetRotateAlign, float margin) {
  float lo = 0.5, hi = 1.0;
  float nodeExtent = targetSize * u_correctionRatio / u_sizeRatio * 2.0;
  float effectiveSize = 1.0 - u_correctionRatio / nodeExtent;

  // See findSourceClampT_ for the rotation rationale.
  float ca = u_cameraAngle * (1.0 - targetRotateAlign);
  float rc = cos(ca), rs = sin(ca);
  mat2 rot = mat2(rc, -rs, rs, rc);

  for (int i = 0; i < 12; i++) {
    float mid = (lo + hi) * 0.5;
    vec2 pos = path_`).concat(a,`_position(mid, source, target);
    vec2 localPos = rot * ((pos - target) / nodeExtent);
    float sdf = querySDF(targetShapeId, localPos, effectiveSize);
    if (sdf < 0.0) hi = mid;
    else lo = mid;
  }

  float pathLen = path_`).concat(a,`_length(source, target);
  float marginT = (margin * u_correctionRatio / u_sizeRatio) / pathLen;
  return (lo + hi) * 0.5 - marginT;
}
`)}function _o(a){return`
// Auto-generated numerical tangent (from position via finite differences)
vec2 path_`.concat(a,`_tangent(float t, vec2 source, vec2 target) {
  float epsilon = 0.001;
  float t1 = max(0.0, t - epsilon);
  float t2 = min(1.0, t + epsilon);
  vec2 p1 = path_`).concat(a,`_position(t1, source, target);
  vec2 p2 = path_`).concat(a,`_position(t2, source, target);
  return normalize(p2 - p1);
}

// Auto-generated normal (perpendicular to tangent)
vec2 path_`).concat(a,`_normal(float t, vec2 source, vec2 target) {
  vec2 tangent = path_`).concat(a,`_tangent(t, source, target);
  return vec2(-tangent.y, tangent.x);
}
`)}function pd(a){return`
// Auto-generated path length (samples position 16 times)
float path_`.concat(a,`_length(vec2 source, vec2 target) {
  float len = 0.0;
  vec2 prev = path_`).concat(a,`_position(0.0, source, target);
  for (int i = 1; i <= 16; i++) {
    float t = float(i) / 16.0;
    vec2 curr = path_`).concat(a,`_position(t, source, target);
    len += length(curr - prev);
    prev = curr;
  }
  return len;
}
`)}function vd(a){return`
// Auto-generated closest_t (coarse sample + ternary search)
float path_`.concat(a,`_closest_t(vec2 p, vec2 source, vec2 target) {
  // Coarse search: find best among 10 samples
  float bestT = 0.0;
  float bestDist = 1e10;
  for (int i = 0; i <= 10; i++) {
    float t = float(i) / 10.0;
    vec2 pos = path_`).concat(a,`_position(t, source, target);
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
    float d1 = length(p - path_`).concat(a,`_position(mid1, source, target));
    float d2 = length(p - path_`).concat(a,`_position(mid2, source, target));
    if (d1 < d2) {
      hi = mid2;
    } else {
      lo = mid1;
    }
  }
  return (lo + hi) * 0.5;
}
`)}function md(a){return`
// Auto-generated signed distance (via closest_t + normal)
float path_`.concat(a,`_distance(vec2 p, vec2 source, vec2 target) {
  float closestT = path_`).concat(a,`_closest_t(p, source, target);
  vec2 closest = path_`).concat(a,`_position(closestT, source, target);
  vec2 diff = p - closest;
  float dist = length(diff);
  if (dist < 0.0001) return 0.0;

  // Get normal at closest point
  vec2 normal = path_`).concat(a,`_normal(closestT, source, target);
  return dist * sign(dot(diff, normal));
}
`)}function bd(a){return`
// Auto-generated t_at_distance (binary search)
float path_`.concat(a,`_t_at_distance(float targetDist, vec2 source, vec2 target) {
  if (targetDist <= 0.0) return 0.0;

  float totalLen = path_`).concat(a,`_length(source, target);
  if (targetDist >= totalLen) return 1.0;

  // Binary search for t
  float lo = 0.0, hi = 1.0;
  for (int i = 0; i < 12; i++) {
    float mid = (lo + hi) * 0.5;

    // Compute arc length from 0 to mid
    float arcLen = 0.0;
    vec2 prev = path_`).concat(a,`_position(0.0, source, target);
    for (int j = 1; j <= 8; j++) {
      float t = mid * float(j) / 8.0;
      vec2 curr = path_`).concat(a,`_position(t, source, target);
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
`)}function $n(a,n){var e=new RegExp("\\b(float|vec[234]|void|int|bool)\\s+".concat(n,"\\s*\\("));return e.test(a)}function To(a,n){var e=[];return $n(n,"path_".concat(a,"_length"))||e.push(pd(a)),$n(n,"path_".concat(a,"_closest_t"))||e.push(vd(a)),$n(n,"path_".concat(a,"_distance"))||e.push(md(a)),$n(n,"path_".concat(a,"_t_at_distance"))||e.push(bd(a)),e.length>0?`
// ============================================================================
// Auto-generated fallback functions (path only provided position)
// ============================================================================
`.concat(e.join(`
`)):""}function So(a){var n,e,t,r=a.paths,i=a.layers,o=(n=a.extremities)!==null&&n!==void 0?n:[];if(r.length===0)throw new Error("At least one path is required in 'paths'");if(i.length===0)throw new Error("At least one layer is required in 'layers'");var s=(e=a.defaultHead)!==null&&e!==void 0?e:"none",l=(t=a.defaultTail)!==null&&t!==void 0?t:"none";return{paths:r,extremities:o,layers:i,path:r[0],layer:i[0],defaultHead:s,defaultTail:l}}var Eo=WebGL2RenderingContext,Zt=Eo.FLOAT,Oi=Eo.UNSIGNED_BYTE;function yd(a,n,e){var t=new Set(["u_matrix","u_sizeRatio","u_correctionRatio","u_zoomRatio","u_pixelRatio","u_cameraAngle","u_minEdgeThickness","u_pickingPadding","u_nodeDataTexture","u_nodeDataTextureWidth","u_edgeDataTexture","u_edgeDataTextureWidth","u_edgeFrameTexture","u_edgeFrameTextureWidth","u_edgeAttributeTexture","u_edgeAttributeTextureWidth","u_edgeAttributeTexelsPerEdge"]),r=new Set(t);return a.forEach(function(i){return i.uniforms.forEach(function(o){return r.add(o.name)})}),n.forEach(function(i){return i.uniforms.forEach(function(o){return r.add(o.name)})}),e.forEach(function(i){return i.uniforms.forEach(function(o){return r.add(o.name)})}),Array.from(r)}function hr(a){var n=new Set,e=[],t=z(a),r;try{for(t.s();!(r=t.n()).done;){var i=r.value;n.has(i.name)||(n.add(i.name),e.push("// Path: ".concat(i.name)),e.push(i.glsl),e.push(_o(i.name)),e.push(To(i.name,i.glsl)))}}catch(o){t.e(o)}finally{t.f()}return e.join(`

`)}function xd(a){var n=[],e=z(a),t;try{for(e.s();!(t=e.n()).done;){var r=t.value;n.push("// Extremity: ".concat(r.name)),n.push(r.glsl)}}catch(i){e.e(i)}finally{e.f()}return n.join(`

`)}var _d=[{queryName:"queryPathPosition",pathFunc:"position",returnType:"vec2",params:"float t, vec2 source, vec2 target",args:"t, source, target"},{queryName:"queryPathTangent",pathFunc:"tangent",returnType:"vec2",params:"float t, vec2 source, vec2 target",args:"t, source, target"},{queryName:"queryPathNormal",pathFunc:"normal",returnType:"vec2",params:"float t, vec2 source, vec2 target",args:"t, source, target"},{queryName:"queryPathLength",pathFunc:"length",returnType:"float",params:"vec2 source, vec2 target",args:"source, target"},{queryName:"queryPathClosestT",pathFunc:"closest_t",returnType:"float",params:"vec2 p, vec2 source, vec2 target",args:"p, source, target"}];function Td(a,n){var e=n.queryName,t=n.pathFunc,r=n.returnType,i=n.params,o=n.args;if(a.length===1)return"".concat(r," ").concat(e,"(int pathId, ").concat(i,`) {
  return path_`).concat(a[0].name,"_").concat(t,"(").concat(o,`);
}`);var s=a.map(function(l,u){return"    case ".concat(u,": return path_").concat(l.name,"_").concat(t,"(").concat(o,");")}).join(`
`);return"".concat(r," ").concat(e,"(int pathId, ").concat(i,`) {
  switch (pathId) {
`).concat(s,`
    default: return path_`).concat(a[0].name,"_").concat(t,"(").concat(o,`);
  }
}`)}function fr(a){return _d.map(function(n){return Td(a,n)}).join(`

`)}function Sd(a){if(a.length===1)return`float queryExtremitySDF(int extremityId, vec2 uv, float lengthRatio, float widthRatio) {
  return extremity_`.concat(a[0].name,`(uv, lengthRatio, widthRatio);
}`);var n=a.map(function(e,t){return"    case ".concat(t,": return extremity_").concat(e.name,"(uv, lengthRatio, widthRatio);")}).join(`
`);return`float queryExtremitySDF(int extremityId, vec2 uv, float lengthRatio, float widthRatio) {
  switch (extremityId) {
`.concat(n,`
    default: return extremity_`).concat(a[0].name,`(uv, lengthRatio, widthRatio);
  }
}`)}function Ed(a){var n=[],e=z(a),t;try{for(e.s();!(t=e.n()).done;){var r=t.value;n.push(fd(r.name)),n.push(gd(r.name))}}catch(s){e.e(s)}finally{e.f()}if(a.length===1)n.push(`
float queryFindSourceClampT(int pathId, vec2 source, float sourceSize, int sourceShapeId, float sourceRotateAlign, vec2 target, float margin) {
  return findSourceClampT_`.concat(a[0].name,`(source, sourceSize, sourceShapeId, sourceRotateAlign, target, margin);
}

float queryFindTargetClampT(int pathId, vec2 source, vec2 target, float targetSize, int targetShapeId, float targetRotateAlign, float margin) {
  return findTargetClampT_`).concat(a[0].name,`(source, target, targetSize, targetShapeId, targetRotateAlign, margin);
}`));else{var i=a.map(function(s,l){return"    case ".concat(l,": return findSourceClampT_").concat(s.name,"(source, sourceSize, sourceShapeId, sourceRotateAlign, target, margin);")}).join(`
`),o=a.map(function(s,l){return"    case ".concat(l,": return findTargetClampT_").concat(s.name,"(source, target, targetSize, targetShapeId, targetRotateAlign, margin);")}).join(`
`);n.push(`
float queryFindSourceClampT(int pathId, vec2 source, float sourceSize, int sourceShapeId, float sourceRotateAlign, vec2 target, float margin) {
  switch (pathId) {
`.concat(i,`
    default: return findSourceClampT_`).concat(a[0].name,`(source, sourceSize, sourceShapeId, sourceRotateAlign, target, margin);
  }
}

float queryFindTargetClampT(int pathId, vec2 source, vec2 target, float targetSize, int targetShapeId, float targetRotateAlign, float margin) {
  switch (pathId) {
`).concat(o,`
    default: return findTargetClampT_`).concat(a[0].name,`(source, target, targetSize, targetShapeId, targetRotateAlign, margin);
  }
}`))}return n.join(`

`)}function Ad(a,n,e,t,r){var i=ye([].concat($(a),$(e))),o=tn(i),s=Rt(t,r),l=Object.keys(s.offsets),u=function(E){var A=s.specs[E].size;return A===1?"float":"vec".concat(A)},d=l.map(function(T){return"".concat(u(T)," v_source_").concat(T,`;
`).concat(u(T)," v_target_").concat(T,";")}).join(`
`),c=Tt(s,{varPrefix:"srcNodeAttr",baseTexelExpr:"srcIdx * u_layerAttributeTexelsPerNode",textureWidthUniform:"u_layerAttributeTextureWidth",textureSamplerUniform:"u_layerAttributeTexture",outputPrefix:"v_source_"}),f=Tt(s,{varPrefix:"tgtNodeAttr",baseTexelExpr:"tgtIdx * u_layerAttributeTexelsPerNode",textureWidthUniform:"u_layerAttributeTextureWidth",textureSamplerUniform:"u_layerAttributeTexture",outputPrefix:"v_target_"}),h=l.map(function(T){return"".concat(u(T)," g_").concat(T,";")}).join(`
`),p=l.map(function(T){return"  g_".concat(T," = v_source_").concat(T,";")}).join(`
`),b=l.map(function(T){return"  g_".concat(T," = v_target_").concat(T,";")}).join(`
`),v=new Set,g=[],m=function(E){v.has(E.name)||(v.add(E.name),g.push("uniform ".concat(E.type," ").concat(E.name,";")))};a.forEach(function(T){return T.uniforms.forEach(m)}),n.forEach(function(T){return T.uniforms.forEach(m)});var y=n.map(function(T){return te(T.widthFactor)}).join(", "),_=Math.max.apply(Math,$(a.map(function(T){return T.minBodyLengthRatio||0}))),x=`#version 300 es

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
`).concat(g.join(`
`),`

// Path attribute varyings \u2014 assigned so path functions can read them as globals
`).concat(o.vertexVaryingDeclarations,`

// Node size varyings \u2014 read by path functions like loop
out float v_sourceNodeSize;
out float v_targetNodeSize;

// Node shape attributes per endpoint, and the ones querySDF reads
`).concat(d,`
`).concat(h,`

// Scattered output written to the edge-frame texel: [tStart, tEnd, straightenFactor, pathLength]
out vec4 v_clamp;

// Extremity width factor array (needed for extremityScale computation)
const float EXTREMITY_WIDTH_FACTORS[`).concat(n.length,"] = float[](").concat(y,`);

// Node-data fetch helpers (geometry texel + rotation-flags texel)
`).concat(Ae,`
`).concat(Ue,`

// Shape SDFs for node boundary clamping
`).concat(Xi(),`
`).concat(Yi(new Set(l)),`

// Path functions
`).concat(hr(a),`
`).concat(fr(a),`
`).concat(Ed(a),`

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
`).concat(f.fetchCode,`
`).concat(f.varyingAssignments,`

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
  float minBodyLengthRatio = `).concat(te(_),`;

  // Thickness in WebGL units (needed to compute clamping margin and extremity lengths)
  float pixelsThickness = max(a_thickness, u_minEdgeThickness * u_sizeRatio);
  float webGLThickness = pixelsThickness * u_correctionRatio / u_sizeRatio;

  // SDF clamping: find where the edge body meets the node boundaries. Always
  // searched (ungated) so labels get a true boundary clamp; the body re-applies
  // its extremity gating in-shader.
`).concat(p,`
  float tStart = queryFindSourceClampT(pathId, a_source, a_sourceSize, int(a_sourceShapeId), a_sourceRotateAlign, a_target, 0.0);
`).concat(b,`
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
`).concat(b,`
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
`);return x}var Vn=0,Wi=1,qn=2;function Rd(a,n,e){var t=[];e&&(t.push([Vn,0,-1],[Vn,0,1]),t.push([Vn,1,-1],[Vn,1,1]));for(var r=0;r<=a;r++){var i=r/a;t.push([Wi,i,-1],[Wi,i,1])}return n&&(t.push([qn,0,-1],[qn,0,1]),t.push([qn,1,-1],[qn,1,1])),{data:t,attributes:[{name:"a_zone",size:1,type:Zt},{name:"a_zoneT",size:1,type:Zt},{name:"a_side",size:1,type:Zt}],verticesPerEdge:t.length}}function wd(a,n,e,t){var r=ye([].concat($(a),$(e))),i=tn(r),o=new Set(["u_matrix","u_sizeRatio","u_correctionRatio","u_zoomRatio","u_pixelRatio","u_cameraAngle","u_minEdgeThickness","u_pickingPadding","u_nodeDataTexture"]),s=new Set,l=[],u=function(g){!o.has(g.name)&&!s.has(g.name)&&(s.add(g.name),l.push("uniform ".concat(g.type," ").concat(g.name,";")))};a.forEach(function(v){return v.uniforms.forEach(u)}),n.forEach(function(v){return v.uniforms.forEach(u)}),e.forEach(function(v){return v.uniforms.forEach(u)});var d=t.map(function(v){var g=v.size===1?"float":"vec".concat(v.size);return"in ".concat(g," ").concat(v.name,";")}).join(`
`),c=n.map(function(v){return te(v.widthFactor)}).join(", "),f=Math.max.apply(Math,$(a.map(function(v){return v.minBodyLengthRatio||0}))),h=e.some(function(v){return v.needsNodeColors}),p=a.some(function(v){return v.needsNodeSize}),b=`#version 300 es

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
`).concat(h?`
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
`).concat(hr(a),`

// Path selector functions
`).concat(fr(a),`

// Node-data fetch helper (geometry texel of the two-texel node stride)
`).concat(Ae,`
`).concat(h?to:"",`
// Per-edge clamp from the frame-pass (tStart, tEnd, straightenFactor, pathLength)
`).concat(tt,`

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
`).concat(h?`
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
  float minBodyLengthRatio = `).concat(te(f),`;

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
`);return b}function Dd(a,n,e,t){var r=ye([].concat($(a),$(e))),i=tn(r),o=new Set(["u_matrix","u_sizeRatio","u_correctionRatio","u_zoomRatio","u_pixelRatio","u_cameraAngle","u_minEdgeThickness","u_pickingPadding"]),s=new Set,l=[],u=function(m){!o.has(m.name)&&!s.has(m.name)&&(s.add(m.name),l.push("uniform ".concat(m.type," ").concat(m.name,";")))};a.forEach(function(g){return g.uniforms.forEach(u)}),n.forEach(function(g){return g.uniforms.forEach(u)}),e.forEach(function(g){return g.uniforms.forEach(u)});var d=n.map(function(g){var m;return te((m=g.baseRatio)!==null&&m!==void 0?m:.5)}).join(", "),c=function(m){var y,_;return n.length>1?"EXTREMITY_BASE_RATIOS[".concat(m,"]"):te((y=(_=n[0])===null||_===void 0?void 0:_.baseRatio)!==null&&y!==void 0?y:.5)},f=n.some(function(g){return Te(g.length)?!0:g.length>0}),h=e.some(function(g){return g.needsNodeColors}),p=a.some(function(g){return g.needsNodeSize}),b=e.map(function(g,m){return"  // Layer ".concat(m+1,": ").concat(g.name,`
  color = blendOver(color, layer_`).concat(g.name,"(context));")}).join(`

`),v=`#version 300 es
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
`).concat(h?`
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
`).concat(hr(a),`

// Path selector functions
`).concat(fr(a),`

// All extremity functions
`).concat(xd(n),`

// Extremity SDF selector (shared pool for head/tail)
`).concat(Sd(n),`

// Layer functions
`).concat(e.map(function(g){return g.glsl}).join(`

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
`).concat(a.every(function(g){return g.linearParameterization})?`  // All paths have linear parameterization: t maps directly to arc distance
  context.distanceFromSource = pathTNorm * visibleLength;
  context.distanceToTarget = (1.0 - pathTNorm) * visibleLength;`:a.every(function(g){return!g.linearParameterization})?`  // No paths have linear parameterization: use numerical integration
  context.distanceFromSource = computeArcLengthMulti(v_pathId, v_tStart, pathT, v_source, v_target, 16);
  context.distanceToTarget = computeArcLengthMulti(v_pathId, pathT, v_tEnd, v_source, v_target, 16);`:`  // Mixed parameterization: use analytical for linear paths, numerical for others
  if (`.concat(a.filter(function(g){return g.linearParameterization}).map(function(g){return"v_pathId == ".concat(a.indexOf(g))}).join(" || "),`) {
    context.distanceFromSource = pathTNorm * visibleLength;
    context.distanceToTarget = (1.0 - pathTNorm) * visibleLength;
  } else {
    context.distanceFromSource = computeArcLengthMulti(v_pathId, v_tStart, pathT, v_source, v_target, 16);
    context.distanceToTarget = computeArcLengthMulti(v_pathId, pathT, v_tEnd, v_source, v_target, 16);
  }`),`

  // Compute SDF based on zone using extremity selector (shared pool)
  float bodySDF = distFromCenter - halfThickness;
  float finalSDF;

`).concat(f?`  // Base ratios, from baseRatioLookup
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
`).concat(t?`    // Visual pass: anti-aliased edge with layers, edge opacity applied once
    float alpha = smoothstep(aaWidthWebGL, -aaWidthWebGL, finalSDF) * v_opacity;`:`    // Visual pass: hard-edged (no anti-aliasing gradient) edge with layers, edge opacity applied once
    float alpha = (finalSDF < 0.0 ? 1.0 : 0.0) * v_opacity;`,`
    if (alpha < 0.01) discard;

    // Apply layers sequentially with "over" compositing
    vec4 color = vec4(0.0);

`).concat(b,`

    // Mix with transparent to fade both color AND alpha (pre-multiplied alpha for correct blending)
    fragColor = mix(vec4(0.0), color, alpha);
  #endif
}
`);return v}function Cd(a,n,e){var t=Te(n.length)?!0:n.length>0,r=Te(e.length)?!0:e.length>0;if(a.generateConstantData){var i=a.generateConstantData();return{data:i.data,attributes:i.attributes,verticesPerEdge:i.verticesPerEdge}}return Rd(a.segments,t,r)}function ar(a){var n,e=So(a),t=e.paths,r=e.extremities,i=e.layers,o=(n=a.antialias)!==null&&n!==void 0?n:!0,s=new Map,l=new Map,u=new Map,d=z(t),c;try{for(d.s();!(c=d.n()).done;){var f=c.value,h=z(r),p;try{for(h.s();!(p=h.n()).done;){var b=p.value,v=z(r),g;try{for(v.s();!(g=v.n()).done;){var m=g.value,y="".concat(f.name,":").concat(b.name,":").concat(m.name),_=Cd(f,b,m);s.set(y,_.verticesPerEdge),l.set(y,_.data);var x=z(_.attributes),T;try{for(x.s();!(T=x.n()).done;){var E=T.value;u.has(E.name)||u.set(E.name,E)}}catch(q){x.e(q)}finally{x.f()}}}catch(q){v.e(q)}finally{v.f()}}}catch(q){h.e(q)}finally{h.f()}}}catch(q){d.e(q)}finally{d.f()}var A=Array.from(u.values()),C={};A.forEach(function(q,j){C[q.name]=j});var w=0,k="",R=z(s),P;try{for(R.s();!(P=R.n()).done;){var D=Q(P.value,2),I=D[0],G=D[1];G>w&&(w=G,k=I)}}catch(q){R.e(q)}finally{R.f()}var N=l.get(k)||[],F=k.split(":"),L=Q(F,1),M=L[0],H=t.find(function(q){return q.name===M}),U=[];H!=null&&H.generateConstantData?U=H.generateConstantData().attributes:U=[{name:"a_zone"},{name:"a_zoneT"},{name:"a_side"}];var X=N.map(function(q){var j=new Array(A.length).fill(0);return U.forEach(function(xe,de){var De=C[xe.name];De!==void 0&&de<q.length&&(j[De]=q[de])}),j});return{vertexShader:wd(t,r,i,A),fragmentShader:Dd(t,r,i,o),uniforms:yd(t,r,i),attributes:Ld(),verticesPerEdge:w,constantData:X,constantAttributes:A,vertexCountsPerCombination:s,constantDataPerCombination:l}}function Ld(a,n,e){return[{name:"a_edgeIndex",size:1,type:Zt},{name:"a_color",size:4,type:Oi,normalized:!0},{name:"a_id",size:4,type:Oi,normalized:!0},{name:"a_opacity",size:1,type:Zt}]}var Pd=`#version 300 es
precision highp float;

in vec4 v_clamp;

// RGBA32F target: stores (tStart, tEnd, straightenFactor, pathLength).
out vec4 fragColor;

void main() {
  fragColor = v_clamp;
}
`,Ao=(function(){function a(n,e){K(this,a),S(this,"uniformLocations",{});var t=e.paths,r=e.extremities,i=e.layers,o=e.nodeShapes,s=e.nodeLayers;this.gl=n,this.hasAttributeData=ye([].concat($(t),$(i))).floatsPerItem>0,this.hasNodeAttributeData=Object.keys(Rt(o,s).offsets).length>0,this.vertexShader=Yn(n,Ad(t,r,i,o,s)),this.fragmentShader=Kn(n,Pd),this.program=Zn(n,[this.vertexShader,this.fragmentShader]);var l=new Set;this.customUniforms=[];for(var u=0,d=[].concat($(t),$(r));u<d.length;u++){var c=d[u],f=z(c.uniforms),h;try{for(f.s();!(h=f.n()).done;){var p=h.value;l.has(p.name)||(l.add(p.name),this.customUniforms.push(p))}}catch(y){f.e(y)}finally{f.f()}}var b=["u_sizeRatio","u_correctionRatio","u_cameraAngle","u_minEdgeThickness","u_nodeDataTexture","u_nodeDataTextureWidth","u_edgeDataTexture","u_edgeDataTextureWidth","u_edgeAttributeTexture","u_edgeAttributeTextureWidth","u_edgeAttributeTexelsPerEdge","u_layerAttributeTexture","u_layerAttributeTextureWidth","u_layerAttributeTexelsPerNode","u_frameTextureWidth","u_frameTextureHeight"].concat($(this.customUniforms.map(function(y){return y.name}))),v=z(b),g;try{for(v.s();!(g=v.n()).done;){var m=g.value;this.uniformLocations[m]=n.getUniformLocation(this.program,m)}}catch(y){v.e(y)}finally{v.f()}this.vao=n.createVertexArray()}return Z(a,[{key:"run",value:function(e,t,r,i,o){if(r!==0){var s=this.gl,l=this.uniformLocations;s.useProgram(this.program),s.bindVertexArray(this.vao),l.u_sizeRatio&&s.uniform1f(l.u_sizeRatio,e.sizeRatio),l.u_correctionRatio&&s.uniform1f(l.u_correctionRatio,e.correctionRatio),l.u_cameraAngle&&s.uniform1f(l.u_cameraAngle,e.cameraAngle),l.u_minEdgeThickness&&s.uniform1f(l.u_minEdgeThickness,e.minEdgeThickness),l.u_nodeDataTexture&&s.uniform1i(l.u_nodeDataTexture,e.nodeDataTextureUnit),l.u_nodeDataTextureWidth&&s.uniform1i(l.u_nodeDataTextureWidth,e.nodeDataTextureWidth),l.u_edgeDataTexture&&s.uniform1i(l.u_edgeDataTexture,e.edgeDataTextureUnit),l.u_edgeDataTextureWidth&&s.uniform1i(l.u_edgeDataTextureWidth,e.edgeDataTextureWidth),l.u_frameTextureWidth&&s.uniform1f(l.u_frameTextureWidth,t.getTextureWidth()),l.u_frameTextureHeight&&s.uniform1f(l.u_frameTextureHeight,t.getTextureHeight()),this.hasAttributeData&&i&&(i.bind(We),l.u_edgeAttributeTexture&&s.uniform1i(l.u_edgeAttributeTexture,We),l.u_edgeAttributeTextureWidth&&s.uniform1i(l.u_edgeAttributeTextureWidth,i.getTextureWidth()),l.u_edgeAttributeTexelsPerEdge&&s.uniform1i(l.u_edgeAttributeTexelsPerEdge,i.getTexelsPerItem())),this.hasNodeAttributeData&&o&&(o.bind(Oe),l.u_layerAttributeTexture&&s.uniform1i(l.u_layerAttributeTexture,Oe),l.u_layerAttributeTextureWidth&&s.uniform1i(l.u_layerAttributeTextureWidth,o.getTextureWidth()),l.u_layerAttributeTexelsPerNode&&s.uniform1i(l.u_layerAttributeTexelsPerNode,o.getTexelsPerItem()));var u=z(this.customUniforms),d;try{for(u.s();!(d=u.n()).done;){var c=d.value;lr(s,this.uniformLocations[c.name],c)}}catch(f){u.e(f)}finally{u.f()}t.bindAsRenderTarget(),s.disable(s.BLEND),s.disable(s.DEPTH_TEST),s.drawArrays(s.POINTS,0,r),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindVertexArray(null)}}},{key:"kill",value:function(){var e=this.gl;e.deleteProgram(this.program),e.deleteShader(this.vertexShader),e.deleteShader(this.fragmentShader),e.deleteVertexArray(this.vao)}}])})();function Yt(a,n,e,t,r,i){if(a.length===1)return"".concat(t," ").concat(n,"(int pathId, ").concat(r,`) {
  return path_`).concat(a[0].name,"_").concat(e,"(").concat(i,`);
}`);var o=a.map(function(s,l){return"    case ".concat(l,": return path_").concat(s.name,"_").concat(e,"(").concat(i,");")}).join(`
`);return"".concat(t," ").concat(n,"(int pathId, ").concat(r,`) {
  switch (pathId) {
`).concat(o,`
    default: return path_`).concat(a[0].name,"_").concat(e,"(").concat(i,`);
  }
}`)}var kd=`
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
`;function Fd(a,n){var e=te(a),t=te(n);return`
float computeEdgeLabelAlpha(float bodyLength, float textWidthWebGL) {
  float ratio = textWidthWebGL > 0.0001 ? min(bodyLength / textWidthWebGL, 1.0) : 1.0;
  if (ratio < `.concat(e,`) return 0.0;
  if (ratio < `).concat(t,") return (ratio - ").concat(e,") / (").concat(t," - ").concat(e,`);
  return 1.0;
}
`)}var Id=`
float computeEdgeLabelScreenDir(int pathId, float t, vec2 source, vec2 target, mat3 matrix) {
  vec2 tangent = queryPathTangent(pathId, t, source, target);
  return (matrix * vec3(tangent, 0.0)).x < 0.0 ? -1.0 : 1.0;
}
`,Nd=`
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
`;function Ro(a){var n=a.paths,e=a.minVisibilityThreshold,t=a.fullVisibilityThreshold,r=n.some(function(s){return s.hasSharpCorners}),i=n.map(function(s){return"// --- Path: ".concat(s.name,` ---
`).concat(s.glsl,`

// Tangent/normal functions: analytical if provided, otherwise numerical
`).concat(s.analyticalTangentGlsl||_o(s.name),`

// Auto-generated fallbacks for any missing path functions
`).concat(To(s.name,s.glsl),`

// Corner skip helpers (for paths with sharp corners like step/taxi)
`).concat(s.cornerSkipGlsl||"",`
`)}).join(`
`),o=r?`// Corner function selectors (only some paths have sharp corners)
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

`.concat(Ae,`
`).concat(tt,`

// ============================================================================
// Path Functions (one block per path)
// ============================================================================

`).concat(i,`

// ============================================================================
// Path Query Selectors (dispatch by pathId)
// ============================================================================

`).concat(Yt(n,"queryPathPosition","position","vec2","float t, vec2 source, vec2 target","t, source, target"),`

`).concat(Yt(n,"queryPathTangent","tangent","vec2","float t, vec2 source, vec2 target","t, source, target"),`

`).concat(Yt(n,"queryPathNormal","normal","vec2","float t, vec2 source, vec2 target","t, source, target"),`

`).concat(Yt(n,"queryPathLength","length","float","vec2 source, vec2 target","source, target"),`

`).concat(Yt(n,"queryPathTAtDistance","t_at_distance","float","float dist, vec2 source, vec2 target","dist, source, target"),`

`).concat(o,`

// ============================================================================
// Shared helpers (body bounds, alpha ramp, screen direction, perpendicular offset)
// ============================================================================

`).concat(kd,`
`).concat(Fd(e,t),`
`).concat(Id,`
`).concat(Nd,`
`)}var Gd=Ee.fontSize,Md=new Map,wo=24,Ui=(wo+1)*2;function zd(a){var n=a.paths,e=a.fontSizeMode,t=a.headLengthRatio,r=a.tailLengthRatio,i=a.minVisibilityThreshold,o=a.fullVisibilityThreshold,s=a.keepUpright,l=e==="scaled",u=ze(),d=ye([].concat($(n),[u])),c=tn(d),f=`#version 300 es

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

const float ATLAS_FONT_SIZE = `).concat(te(Gd),`;
const float HEAD_RATIO = `).concat(te(t),`;
const float TAIL_RATIO = `).concat(te(r),`;
const int RIBBON_SEGMENTS = `).concat(wo,`;

// Path attribute varyings (declared as plain locals since this shader has no FS inputs for them)
`).concat(c.vertexVaryingDeclarations.replace(/out /g,""),`

// Node size variables used by some path functions (self-loops, etc.)
float v_sourceNodeSize;
float v_targetNodeSize;

// Shared preamble: shape SDFs, path functions + selectors, clamp, helpers.
`).concat(Ro({paths:n,minVisibilityThreshold:i,fullVisibilityThreshold:o}),`

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
`);return f}var Bd=`#version 300 es
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
`;function Do(a,n,e,t){var r=t.shaderConfig,i=r.paths,o=r.fontSizeMode;if(i.length===0)throw new Error("createEdgeLabelBackgroundProgram: shaderConfig must declare at least one path");var s=ze(),l=ye([].concat($(i),[s])),u=na([].concat($(i),[s]),l),d=zd(r),c=(function(f){function h(p,b,v){var g;return K(this,h),g=ne(this,h,[p,b,v]),S(g,"totalCount",0),S(g,"bufferCapacity",0),S(g,"edgeAttributeTexture",null),g.edgeAttributeTexture=new ta(p,l),g.packedAttributeData=new Float32Array(l.floatsPerItem),g}return ae(h,f),Z(h,[{key:"getDefinition",value:function(){for(var b=WebGL2RenderingContext,v=b.FLOAT,g=b.UNSIGNED_BYTE,m=b.TRIANGLE_STRIP,y=[],_=0;_<Ui;_++)y.push([_]);var x=["u_matrix","u_sizeRatio","u_correctionRatio","u_pixelRatio","u_cameraAngle","u_resolution","u_nodeDataTexture","u_nodeDataTextureWidth","u_edgeDataTexture","u_edgeDataTextureWidth","u_edgeFrameTexture","u_edgeFrameTextureWidth"];return o==="scaled"&&x.push("u_zoomSizeRatio"),l.floatsPerItem>0&&x.push("u_edgeAttributeTexture","u_edgeAttributeTextureWidth","u_edgeAttributeTexelsPerEdge"),{VERTICES:Ui,VERTEX_SHADER_SOURCE:d,FRAGMENT_SHADER_SOURCE:Bd,METHOD:m,UNIFORMS:x,ATTRIBUTES:[{name:"a_edgeIndex",size:1,type:v},{name:"a_edgeAttrIndex",size:1,type:v},{name:"a_baseFontSize",size:1,type:v},{name:"a_totalTextWidth",size:1,type:v},{name:"a_positionMode",size:1,type:v},{name:"a_margin",size:1,type:v},{name:"a_padding",size:1,type:v},{name:"a_color",size:4,type:g,normalized:!0},{name:"a_id",size:4,type:g,normalized:!0}],CONSTANT_ATTRIBUTES:[{name:"a_vertexIndex",size:1,type:v}],CONSTANT_DATA:y}}},{key:"processEdgeLabelBackground",value:function(b,v,g){var m=0;if(this.edgeAttributeTexture&&l.floatsPerItem>0){m=this.edgeAttributeTexture.allocate(v);var y=this.packedAttributeData;aa(u,g.edgeAttributes,y,"",Md,0),this.edgeAttributeTexture.updateAllAttributes(v,y)}var _=this.floats,x=this.ints,T=b*this.STRIDE;_[T++]=g.edgeIndex,_[T++]=m,_[T++]=g.baseFontSize,_[T++]=g.totalTextWidth,_[T++]=g.positionMode,_[T++]=g.margin,_[T++]=g.padding,_[T++]=g.color,x[T++]=g.id}},{key:"setUniforms",value:function(b,v){var g=v.gl,m=v.uniformLocations;if(g.uniformMatrix3fv(m.u_matrix,!1,b.matrix),g.uniform1f(m.u_sizeRatio,b.sizeRatio),g.uniform1f(m.u_correctionRatio,b.correctionRatio),g.uniform1f(m.u_pixelRatio,b.pixelRatio),g.uniform1f(m.u_cameraAngle,b.cameraAngle),g.uniform2f(m.u_resolution,b.width,b.height),m.u_nodeDataTexture!==void 0&&g.uniform1i(m.u_nodeDataTexture,b.nodeDataTextureUnit),m.u_nodeDataTextureWidth!==void 0&&g.uniform1i(m.u_nodeDataTextureWidth,b.nodeDataTextureWidth),m.u_edgeDataTexture!==void 0&&g.uniform1i(m.u_edgeDataTexture,b.edgeDataTextureUnit),m.u_edgeDataTextureWidth!==void 0&&g.uniform1i(m.u_edgeDataTextureWidth,b.edgeDataTextureWidth),m.u_edgeFrameTexture!==void 0&&g.uniform1i(m.u_edgeFrameTexture,b.edgeFrameTextureUnit),m.u_edgeFrameTextureWidth!==void 0&&g.uniform1i(m.u_edgeFrameTextureWidth,b.edgeFrameTextureWidth),o==="scaled"&&m.u_zoomSizeRatio!==void 0){var y=this.renderer.getSetting("zoomToSizeRatioFunction");g.uniform1f(m.u_zoomSizeRatio,1/y(b.zoomRatio))}this.edgeAttributeTexture&&l.floatsPerItem>0&&m.u_edgeAttributeTexture!==void 0&&(this.edgeAttributeTexture.bind(We),g.uniform1i(m.u_edgeAttributeTexture,We),g.uniform1i(m.u_edgeAttributeTextureWidth,this.edgeAttributeTexture.getTextureWidth()),g.uniform1i(m.u_edgeAttributeTexelsPerEdge,this.edgeAttributeTexture.getTexelsPerItem()))}},{key:"renderProgram",value:function(b,v){this.edgeAttributeTexture&&l.floatsPerItem>0&&this.edgeAttributeTexture.upload(),oe(h,"renderProgram",this,3)([b,v])}},{key:"kill",value:function(){this.edgeAttributeTexture&&(this.edgeAttributeTexture.kill(),this.edgeAttributeTexture=null),oe(h,"kill",this,3)([])}},{key:"drawWebGL",value:function(b,v){var g=v.gl;this.totalCount!==0&&g.drawArraysInstanced(g.TRIANGLE_STRIP,0,this.VERTICES,this.totalCount)}},{key:"reallocate",value:function(b){this.totalCount=b,b>this.bufferCapacity&&(this.bufferCapacity=Math.max(b,Math.ceil(this.bufferCapacity*1.5)||10),oe(h,"reallocate",this,3)([this.bufferCapacity]))}}])})(He);return new c(a,n,e)}function Co(a){var n,e,t,r,i,o;return{paths:a.paths,headLengthRatio:(n=a.headLengthRatio)!==null&&n!==void 0?n:0,tailLengthRatio:(e=a.tailLengthRatio)!==null&&e!==void 0?e:0,fontSizeMode:(t=a.fontSizeMode)!==null&&t!==void 0?t:"fixed",minVisibilityThreshold:(r=a.minVisibilityThreshold)!==null&&r!==void 0?r:.7,fullVisibilityThreshold:(i=a.fullVisibilityThreshold)!==null&&i!==void 0?i:.8,keepUpright:(o=a.keepUpright)!==null&&o!==void 0?o:!0}}var Od=Ee.fontSize,Wd=17/64;function Ud(a){var n=a.paths,e=a.hasBorder,t=e===void 0?!1:e,r=a.fontSizeMode,i=r===void 0?"fixed":r,o=a.minVisibilityThreshold,s=o===void 0?.5:o,l=a.fullVisibilityThreshold,u=l===void 0?.6:l,d=a.keepUpright,c=d===void 0?!0:d,f=i==="scaled",h=n.some(function(m){return m.hasSharpCorners}),p=ze(),b=ye([].concat($(n),[p])),v=tn(b),g=`#version 300 es

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
`.concat(t?"in vec4 a_borderColor;      // Border color (RGBA, normalized)":"",`

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
`).concat(f?"uniform float u_zoomSizeRatio;  // Zoom-based size ratio from zoomToSizeRatioFunction":"",`

// Edge path attribute texture uniforms (for curvature and other path attributes)
`).concat(v.uniformDeclarations,`

// ============================================================================
// Varyings
// ============================================================================

out vec2 v_texCoord;
out vec4 v_color;
`).concat(t?"out vec4 v_borderColor;":"",`
out float v_edgeFade;  // 0 = fully visible, 1 = fully faded (outside body)
out float v_alphaModifier;  // 0-1 based on label visibility ratio
out float v_fontScale;  // Ratio of rendered font size to atlas font size
`).concat(t?"out float v_positionMode;  // Position mode for conditional border (0=over needs border)":"",`

// ============================================================================
// Constants
// ============================================================================

const float bias = 255.0 / 254.0;
const float FADE_WIDTH_PIXELS = 15.0;  // Width of fade gradient in pixels
const float ATLAS_FONT_SIZE = `).concat(te(Od),`;  // Base font size used in SDF atlas
const float VERTICAL_CENTER_RATIO = `).concat(te(Wd),`;  // Baseline to visual center ratio

// ============================================================================
// Path Attribute Variables (set in main, used by path functions)
// ============================================================================
// Path attributes are fetched from the edge attribute texture and stored in
// variables with v_ prefix (e.g., v_curvature) for path functions to access.
`).concat(v.vertexVaryingDeclarations.replace(/out /g,""),`

// Node size variables (set in main, used by some path functions like loops).
// These mirror the v_sourceNodeSize / v_targetNodeSize varyings in generator.ts,
// but are plain floats here since the label shader is vertex-only.
float v_sourceNodeSize;
float v_targetNodeSize;

// Shared preamble: shape SDFs, path functions + selectors, clamp, helpers.
`).concat(Ro({paths:n,minVisibilityThreshold:s,fullVisibilityThreshold:u}),`

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
`).concat(v.fetchCode,`
`).concat(v.varyingAssignments,`
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
  `).concat(f?`// Scaled mode: font scales with zoom
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
  `).concat(f?`// Scaled mode: margin and text height scale with zoom (same factor as font)
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

    `).concat(h?`// -----------------------------------------------------------------------
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
    `.concat(f?"float skipDistGraph = STEP_INNER_CORNER_SKIP_FACTOR * baseFontSize * u_zoomSizeRatio * u_correctionRatio / u_sizeRatio;":"float skipDistGraph = STEP_INNER_CORNER_SKIP_FACTOR * baseFontSize * pixelToGraph;",`

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

      `).concat(h?`// Track which concave corners we've crossed to add skip distance
      bool crossedCorner1 = false;
      bool crossedCorner2 = false;
      float effectiveTargetDist = targetOffsetDist;`:"",`

      const int STEPS = 32;
      for (int i = 1; i <= STEPS; i++) {
        // Step along centerline t, from center toward target
        float stepT = centerT + searchDir * float(i) * abs(tSearchEnd - centerT) / float(STEPS);

        `).concat(h?`// Check for concave corner crossings and add skip distance
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

        `).concat(h?`if (accumDist + segDist >= effectiveTargetDist) {
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
  `).concat(f?"vec2 quadPosWebGL = quadPos * u_correctionRatio / u_sizeRatio; // Scaled mode":"vec2 quadPosWebGL = quadPos * pixelToGraph; // Fixed mode: use pixelToGraph for zoom-independent size",`

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
`).concat(t?`  v_borderColor = a_borderColor;
  v_borderColor.a *= bias;
  v_positionMode = positionMode;`:"",`
  v_alphaModifier = alphaModifier;

  // -------------------------------------------------------------------------
  // Step 13: Compute edge fade for soft truncation
  // -------------------------------------------------------------------------
  // Convert fade width from pixels to WebGL units
  `).concat(f?"float fadeWidthWebGL = FADE_WIDTH_PIXELS * u_correctionRatio / u_sizeRatio;":"float fadeWidthWebGL = FADE_WIDTH_PIXELS * pixelToGraph;",`

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
`);return g}function Hd(){var a=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{},n=a.hasBorder,e=n===void 0?!1:n,t=`#version 300 es
precision highp float;

in vec2 v_texCoord;
in vec4 v_color;
`.concat(e?"in vec4 v_borderColor;":"",`
in float v_edgeFade;  // 0 = fully visible, 1 = fully faded
in float v_alphaModifier;  // 0-1 based on label visibility ratio
in float v_fontScale;  // Ratio of rendered font size to atlas font size
`).concat(e?"in float v_positionMode;  // Position mode (0=over, 1=above, 2=below, 3=auto)":"",`

uniform sampler2D u_atlas;
uniform float u_gamma;
uniform float u_sdfBuffer;
uniform float u_pixelRatio;
`).concat(e?"uniform float u_borderWidth;  // Border width in SDF units (normalized)":"",`

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

`).concat(e?`  // Fill alpha: fully opaque inside the glyph
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
`);return t}function $d(a){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:!1,e=arguments.length>2&&arguments[2]!==void 0?arguments[2]:"fixed",t=["u_matrix","u_sizeRatio","u_correctionRatio","u_pixelRatio","u_cameraAngle","u_sdfBufferPixels","u_resolution","u_atlasSize","u_atlas","u_gamma","u_sdfBuffer","u_nodeDataTexture","u_nodeDataTextureWidth","u_edgeDataTexture","u_edgeDataTextureWidth","u_edgeFrameTexture","u_edgeFrameTextureWidth","u_edgeAttributeTexture","u_edgeAttributeTextureWidth","u_edgeAttributeTexelsPerEdge"];e==="scaled"&&t.push("u_zoomSizeRatio"),n&&t.push("u_borderWidth");var r=z(a),i;try{for(r.s();!(i=r.n()).done;){var o=i.value,s=z(o.uniforms),l;try{for(s.s();!(l=s.n()).done;){var u=l.value;t.includes(u.name)||t.push(u.name)}}catch(d){s.e(d)}finally{s.f()}}}catch(d){r.e(d)}finally{r.f()}return t}function Lo(a){var n=a.hasBorder,e=n===void 0?!1:n,t=a.fontSizeMode,r=t===void 0?"fixed":t;return{vertexShader:Ud(a),fragmentShader:Hd({hasBorder:e}),uniforms:$d(a.paths,e,r)}}var Vd=new Map;function qd(a){switch(a){case"over":return 0;case"above":return 1;case"below":return 2;case"auto":return 3;default:return 0}}function Po(a,n,e,t){var r=t.color,i=t.margin,o=t.textBorder,s=Co(t),l=s.paths,u=s.fontSizeMode,d=s.minVisibilityThreshold,c=s.fullVisibilityThreshold,f=s.keepUpright,h=!!o,p=Lo({paths:l,hasBorder:h,fontSizeMode:u,minVisibilityThreshold:d,fullVisibilityThreshold:c,keepUpright:f}),b=(function(v){function g(m,y,_){var x;K(this,g),x=ne(this,g,[m,y,_]),S(x,"atlasTexture",null),S(x,"atlasNeedsUpdate",!1),S(x,"refreshTimeout",null),S(x,"labelGlyphCache",new Map),S(x,"edgeAttributeTexture",null);var T=ze();if(x.attributeLayout=ye([].concat($(l),[T])),x.attrDescriptors=na([].concat($(l),[T]),x.attributeLayout),x.edgeAttributeTexture=new ta(m,x.attributeLayout),x.packedAttributeData=new Float32Array(x.attributeLayout.floatsPerItem),x.atlasManager=new Qe,x.gamma=.025,x.sdfBuffer=Ee.cutoff,x.atlasTexture=m.createTexture(),!x.atlasTexture)throw new Error("EdgeLabelProgram: failed to create atlas texture");m.bindTexture(m.TEXTURE_2D,x.atlasTexture),m.texParameteri(m.TEXTURE_2D,m.TEXTURE_WRAP_S,m.CLAMP_TO_EDGE),m.texParameteri(m.TEXTURE_2D,m.TEXTURE_WRAP_T,m.CLAMP_TO_EDGE),m.texParameteri(m.TEXTURE_2D,m.TEXTURE_MIN_FILTER,m.LINEAR),m.texParameteri(m.TEXTURE_2D,m.TEXTURE_MAG_FILTER,m.LINEAR),m.bindTexture(m.TEXTURE_2D,null),x.atlasManager.on(Qe.ATLAS_UPDATED_EVENT,function(){x.atlasNeedsUpdate=!0,x.refreshTimeout!==null&&clearTimeout(x.refreshTimeout),x.refreshTimeout=setTimeout(function(){x.refreshTimeout=null,x.renderer.refresh()},0)});var E={family:"sans-serif",weight:"normal",style:"normal"};return x.defaultFontKey=x.atlasManager.registerFont(E),x}return ae(g,v),Z(g,[{key:"getDefinition",value:function(){var y=WebGL2RenderingContext,_=y.FLOAT,x=y.UNSIGNED_BYTE,T=y.TRIANGLE_STRIP,E=new Set,A=[],C=z(l),w;try{for(C.s();!(w=C.n()).done;){var k=w.value,R=z(k.attributes),P;try{for(R.s();!(P=R.n()).done;){var D=P.value,I=D.name.startsWith("a_")?D.name:"a_".concat(D.name);E.has(I)||(E.add(I),A.push({name:I,size:D.size,type:D.type}))}}catch(G){R.e(G)}finally{R.f()}}}catch(G){C.e(G)}finally{C.f()}return{VERTICES:4,VERTEX_SHADER_SOURCE:p.vertexShader,FRAGMENT_SHADER_SOURCE:p.fragmentShader,METHOD:T,UNIFORMS:p.uniforms,ATTRIBUTES:[{name:"a_edgeIndex",size:1,type:_},{name:"a_edgeAttrIndex",size:1,type:_},{name:"a_baseFontSize",size:1,type:_},{name:"a_charMetrics",size:4,type:_},{name:"a_charDims",size:4,type:_},{name:"a_texCoords",size:4,type:_},{name:"a_labelParams",size:2,type:_},{name:"a_color",size:4,type:x,normalized:!0}].concat($(h?[{name:"a_borderColor",size:4,type:x,normalized:!0}]:[]),$(A.filter(function(G){return!["a_curvature","curvature"].includes(G.name)}))),CONSTANT_ATTRIBUTES:[{name:"a_quadCorner",size:2,type:_}],CONSTANT_DATA:[[0,0],[1,0],[0,1],[1,1]]}}},{key:"prepareLabelGlyphs",value:function(y,_){if(_.hidden||!_.text){this.labelGlyphCache.delete(y);return}var x=_.text,T=_.fontKey||this.defaultFontKey;this.atlasManager.ensureGlyphs(x,T);var E=[],A=[],C=0,w=z(x),k;try{for(w.s();!(k=w.n()).done;){var R=k.value,P=R.codePointAt(0);if(P===void 0){E.push(void 0),A.push(C);continue}var D=this.atlasManager.getGlyph(P,T);E.push(D),A.push(C),D&&(C+=D.advance)}}catch(I){w.e(I)}finally{w.f()}this.labelGlyphCache.set(y,{glyphs:E,xOffsets:A,totalWidth:C})}},{key:"processCharacter",value:function(y,_,x,T){var E,A,C,w=this.floats,k=this.STRIDE,R=y*k,P=this.labelGlyphCache.get(_.parentKey);if(!P||!P.glyphs[T]){for(var D=0;D<k;D++)w[R+D]=0;return}var I=P.glyphs[T],G=P.xOffsets[T],N=g.labelColor,F=N&&Y(N)==="object"&&"color"in N&&N.color?N.color:_.color,L=he(F),M=R;w[M++]=_.edgeIndex,w[M++]=(E=(A=this.edgeAttributeTexture)===null||A===void 0?void 0:A.getIndex(_.parentKey))!==null&&E!==void 0?E:0,w[M++]=_.size,w[M++]=G,w[M++]=I.advance,w[M++]=P.totalWidth,w[M++]=qd(_.position),w[M++]=I.atlasWidth,w[M++]=I.atlasHeight,w[M++]=I.bearingX,w[M++]=-I.bearingY,w[M++]=I.atlasX,w[M++]=I.atlasY,w[M++]=I.atlasWidth,w[M++]=I.atlasHeight;var H=(C=g.labelMargin)!==null&&C!==void 0?C:_.margin;if(w[M++]=H,w[M++]=0,w[M++]=L,h&&o){var U;typeof o.color=="string"?U=o.color:U=o.color.color||"#ffffff",w[M++]=he(U)}var X=new Set,q=z(l),j;try{for(q.s();!(j=q.n()).done;){var xe=j.value,de=z(xe.attributes),De;try{for(de.s();!(De=de.n()).done;){var ut=De.value,Ft=ut.name.startsWith("a_")?ut.name.slice(2):ut.name;if(Ft!=="curvature"&&!X.has(Ft)){X.add(Ft);for(var It=0;It<ut.size;It++)w[M++]=0}}}catch(Nt){de.e(Nt)}finally{de.f()}}}catch(Nt){q.e(Nt)}finally{q.f()}}},{key:"processEdgeLabel",value:function(y,_,x){if(this.prepareLabelGlyphs(y,x),this.edgeAttributeTexture&&!x.hidden&&x.text){this.edgeAttributeTexture.allocate(y);var T=this.packedAttributeData;aa(this.attrDescriptors,x.edgeAttributes,T,"",Vd,0),this.edgeAttributeTexture.updateAllAttributes(y,T)}return oe(g,"processLabel",this,3)([y,_,x])}},{key:"updateAtlasTexture",value:function(){if(this.atlasNeedsUpdate){var y=this.normalProgram.gl,_=this.atlasManager.getTextures();if(_.length!==0){var x=_[0];y.bindTexture(y.TEXTURE_2D,this.atlasTexture),y.texImage2D(y.TEXTURE_2D,0,y.RGBA,x.width,x.height,0,y.RGBA,y.UNSIGNED_BYTE,x.data),y.bindTexture(y.TEXTURE_2D,null),this.atlasNeedsUpdate=!1}}}},{key:"setUniforms",value:function(y,_){var x=_.gl,T=_.uniformLocations,E=this.atlasManager.getTextures(),A=E.length>0?[E[0].width,E[0].height]:[1,1];if(x.uniformMatrix3fv(T.u_matrix,!1,y.matrix),x.uniform1f(T.u_sizeRatio,y.sizeRatio),x.uniform1f(T.u_correctionRatio,y.correctionRatio),x.uniform1f(T.u_pixelRatio,y.pixelRatio),x.uniform1f(T.u_cameraAngle,y.cameraAngle),x.uniform1f(T.u_sdfBufferPixels,Ee.buffer),x.uniform2f(T.u_resolution,y.width,y.height),x.uniform2f(T.u_atlasSize,A[0],A[1]),x.uniform1f(T.u_gamma,this.gamma),x.uniform1f(T.u_sdfBuffer,this.sdfBuffer),x.activeTexture(x.TEXTURE0),x.bindTexture(x.TEXTURE_2D,this.atlasTexture),x.uniform1i(T.u_atlas,0),T.u_nodeDataTexture!==void 0&&x.uniform1i(T.u_nodeDataTexture,y.nodeDataTextureUnit),T.u_nodeDataTextureWidth!==void 0&&x.uniform1i(T.u_nodeDataTextureWidth,y.nodeDataTextureWidth),T.u_edgeDataTexture!==void 0&&x.uniform1i(T.u_edgeDataTexture,y.edgeDataTextureUnit),T.u_edgeDataTextureWidth!==void 0&&x.uniform1i(T.u_edgeDataTextureWidth,y.edgeDataTextureWidth),T.u_edgeFrameTexture!==void 0&&x.uniform1i(T.u_edgeFrameTexture,y.edgeFrameTextureUnit),T.u_edgeFrameTextureWidth!==void 0&&x.uniform1i(T.u_edgeFrameTextureWidth,y.edgeFrameTextureWidth),h&&o&&T.u_borderWidth!==void 0){var C=o.width/Ee.buffer*this.sdfBuffer;x.uniform1f(T.u_borderWidth,C)}if(this.edgeAttributeTexture&&T.u_edgeAttributeTexture!==void 0&&(this.edgeAttributeTexture.bind(We),x.uniform1i(T.u_edgeAttributeTexture,We),x.uniform1i(T.u_edgeAttributeTextureWidth,this.edgeAttributeTexture.getTextureWidth()),x.uniform1i(T.u_edgeAttributeTexelsPerEdge,this.edgeAttributeTexture.getTexelsPerItem())),u==="scaled"&&T.u_zoomSizeRatio!==void 0){var w=this.renderer.getSetting("zoomToSizeRatioFunction"),k=1/w(y.zoomRatio);x.uniform1f(T.u_zoomSizeRatio,k)}}},{key:"renderProgram",value:function(y,_){this.updateAtlasTexture(),this.atlasManager.hasPendingGlyphs()&&(this.atlasManager.flush(),this.updateAtlasTexture()),this.edgeAttributeTexture&&this.edgeAttributeTexture.upload(),oe(g,"renderProgram",this,3)([y,_])}},{key:"registerFont",value:function(y){var _=arguments.length>1&&arguments[1]!==void 0?arguments[1]:"normal",x=arguments.length>2&&arguments[2]!==void 0?arguments[2]:"normal";return this.atlasManager.registerFont({family:y,weight:_,style:x})}},{key:"getAtlasManager",value:function(){return this.atlasManager}},{key:"ensureGlyphsReady",value:function(y,_){var x=_||this.defaultFontKey,T=z(y),E;try{for(T.s();!(E=T.n()).done;){var A=E.value;this.atlasManager.ensureGlyphs(A,x)}}catch(C){T.e(C)}finally{T.f()}this.atlasManager.flush()}},{key:"measureLabelAtlasWidth",value:function(y,_){var x=_||this.defaultFontKey;this.atlasManager.ensureGlyphs(y,x),this.atlasManager.hasPendingGlyphs()&&this.atlasManager.flush();var T=0,E=z(y),A;try{for(E.s();!(A=E.n()).done;){var C=A.value,w=C.codePointAt(0);if(w!==void 0){var k=this.atlasManager.getGlyph(w,x);k&&(T+=k.advance)}}}catch(R){E.e(R)}finally{E.f()}return T}},{key:"measureLabel",value:function(y,_,x){var T=this.measureLabelAtlasWidth(y,x),E=_/Ee.fontSize;return{width:T*E,height:_,textHeight:_}}},{key:"kill",value:function(){var y=this.normalProgram.gl;this.refreshTimeout!==null&&(clearTimeout(this.refreshTimeout),this.refreshTimeout=null),this.atlasTexture&&(y.deleteTexture(this.atlasTexture),this.atlasTexture=null),this.edgeAttributeTexture&&(this.edgeAttributeTexture.kill(),this.edgeAttributeTexture=null),this.atlasManager.destroy(),this.labelGlyphCache.clear(),oe(g,"kill",this,3)([])}}])})(ur);return S(b,"labelColor",r),S(b,"labelMargin",i),new b(a,n,e)}function jd(){var a=`
// No extremity - always returns positive (outside)
float extremity_none(vec2 uv, float lengthRatio, float widthRatio) {
  return 1.0;
}
`;return{name:"none",glsl:a,length:0,widthFactor:1,margin:0,uniforms:[],attributes:[]}}function gr(a,n,e,t,r,i,o){var s,l,u=So(t),d=u.paths,c=u.layers,f=u.defaultHead,h=u.defaultTail,p=[jd()].concat($(u.extremities)),b={},v={};d.forEach(function(R,P){return b[R.name]=P}),p.forEach(function(R,P){return v[R.name]=P});var g=(s=v[f])!==null&&s!==void 0?s:0,m=(l=v[h])!==null&&l!==void 0?l:0,y=null,_=ye([].concat($(d),$(c))),x=(function(R){function P(D,I,G){var N;K(this,P),y||(y=ar({paths:d,extremities:p,layers:c,antialias:r})),N=ne(this,P,[D,I,G]),S(N,"layerLifecycles",new Map),S(N,"needsShaderRegeneration",!1),S(N,"edgeAttributeTexture",null),S(N,"layout",_),S(N,"attrDescriptors",[]),S(N,"lifecycleIndexOffset",d.length),N._pickingBuffer=I,N.edgeAttributeTexture=new ta(D,N.layout),N.packedAttributeData=new Float32Array(N.layout.floatsPerItem),c.forEach(function(L,M){if(L.lifecycle){var H={gl:D,renderer:{refresh:function(){return G.refresh()}},getUniformLocation:function(X){return D.getUniformLocation(N.normalProgram.program,X)},requestShaderRegeneration:function(){N.needsShaderRegeneration=!0},requestRefresh:function(){G.refresh()}};N.layerLifecycles.set(M,L.lifecycle(H))}}),N.layerLifecycles.forEach(function(L){var M;return(M=L.init)===null||M===void 0?void 0:M.call(L)});var F=new Map;return N.layerLifecycles.forEach(function(L,M){L.getAttributeData&&F.set(d.length+M,L)}),N.attrDescriptors=na([].concat($(d),$(c)),N.layout,F),N}return ae(P,R),Z(P,[{key:"getAttributeTexture",value:function(){return this.edgeAttributeTexture}},{key:"resolveEdgeIds",value:function(I,G,N){var F=I,L=0,M=g,H=m,U=G?F.selfLoopPath:N&&F.parallelPath?F.parallelPath:F.path;U&&b[U]!==void 0&&(L=b[U]),F.head&&F.head!=="none"&&v[F.head]!==void 0&&(M=v[F.head]),F.tail&&F.tail!=="none"&&v[F.tail]!==void 0&&(H=v[F.tail]);var X=p[M],q=p[H];return{pathId:L,headId:M,tailId:H,headLengthRatio:Te(X.length)?0:X.length,tailLengthRatio:Te(q.length)?0:q.length}}},{key:"getDefinition",value:function(){var I=WebGL2RenderingContext,G=I.TRIANGLE_STRIP,N=G,F=y;return{VERTICES:F.verticesPerEdge,VERTEX_SHADER_SOURCE:F.vertexShader,FRAGMENT_SHADER_SOURCE:F.fragmentShader,METHOD:N,UNIFORMS:F.uniforms,ATTRIBUTES:F.attributes,CONSTANT_ATTRIBUTES:F.constantAttributes,CONSTANT_DATA:F.constantData}}},{key:"maybeRegenerateShaders",value:function(){var I=this;if(this.needsShaderRegeneration){this.needsShaderRegeneration=!1;var G=c.map(function(X,q){var j=I.layerLifecycles.get(q);return j!=null&&j.regenerate?j.regenerate():X});y=ar({paths:d,extremities:p,layers:G,antialias:this.renderer.getSetting("antialiasEdges")});var N=this.normalProgram.gl,F=this.normalProgram,L=F.program,M=F.buffer,H=F.vertexShader,U=F.fragmentShader;N.deleteProgram(L),N.deleteBuffer(M),N.deleteShader(H),N.deleteShader(U),this.normalProgram=this.getProgramInfo("normal",N,y.vertexShader,y.fragmentShader,this._pickingBuffer)}}},{key:"process",value:function(I,G,N,F,L,M){var H=G*this.STRIDE;if(L.visibility==="hidden"||N.visibility==="hidden"||F.visibility==="hidden"){for(var U=H+this.STRIDE;H<U;H++)this.floats[H]=0;this.floats[G*this.STRIDE]=ao;return}this.processVisibleItem(Ye(I),H,N,F,L,M)}},{key:"processVisibleItem",value:function(I,G,N,F,L,M){var H,U=this.floats,X=this.ints;U[G++]=M,U[G++]=he(L.color),X[G++]=I,U[G++]=(H=L.opacity)!==null&&H!==void 0?H:1;var q=this.packedAttributeData;aa(this.attrDescriptors,L,q,L.color,this.layerLifecycles,this.lifecycleIndexOffset),this.edgeAttributeTexture.updateAllAttributesAtRow(M,q)}},{key:"setUniforms",value:function(I,G){var N=this,F=G.gl,L=G.uniformLocations;L.u_matrix&&F.uniformMatrix3fv(L.u_matrix,!1,I.matrix),L.u_sizeRatio&&F.uniform1f(L.u_sizeRatio,I.sizeRatio),L.u_correctionRatio&&F.uniform1f(L.u_correctionRatio,I.correctionRatio),L.u_zoomRatio&&F.uniform1f(L.u_zoomRatio,I.zoomRatio),L.u_pixelRatio&&F.uniform1f(L.u_pixelRatio,I.pixelRatio),L.u_cameraAngle&&F.uniform1f(L.u_cameraAngle,I.cameraAngle),L.u_feather&&F.uniform1f(L.u_feather,I.antiAliasingFeather),L.u_minEdgeThickness&&F.uniform1f(L.u_minEdgeThickness,I.minEdgeThickness),L.u_pickingPadding&&F.uniform1f(L.u_pickingPadding,I.edgePickingPadding),L.u_nodeDataTexture&&F.uniform1i(L.u_nodeDataTexture,I.nodeDataTextureUnit),L.u_nodeDataTextureWidth&&F.uniform1i(L.u_nodeDataTextureWidth,I.nodeDataTextureWidth),L.u_edgeDataTexture&&F.uniform1i(L.u_edgeDataTexture,I.edgeDataTextureUnit),L.u_edgeDataTextureWidth&&F.uniform1i(L.u_edgeDataTextureWidth,I.edgeDataTextureWidth),L.u_edgeFrameTexture&&F.uniform1i(L.u_edgeFrameTexture,I.edgeFrameTextureUnit),L.u_edgeFrameTextureWidth&&F.uniform1i(L.u_edgeFrameTextureWidth,I.edgeFrameTextureWidth),this.edgeAttributeTexture&&this.layout.floatsPerItem>0&&(this.edgeAttributeTexture.bind(We),L.u_edgeAttributeTexture&&F.uniform1i(L.u_edgeAttributeTexture,We),L.u_edgeAttributeTextureWidth&&F.uniform1i(L.u_edgeAttributeTextureWidth,this.edgeAttributeTexture.getTextureWidth()),L.u_edgeAttributeTexelsPerEdge&&F.uniform1i(L.u_edgeAttributeTexelsPerEdge,this.edgeAttributeTexture.getTexelsPerItem()));var M=new Set;d.forEach(function(H){H.uniforms.forEach(function(U){M.has(U.name)||(M.add(U.name),N.setTypedUniform(U,G))})}),p.forEach(function(H){H.uniforms.forEach(function(U){M.has(U.name)||(M.add(U.name),N.setTypedUniform(U,G))})}),c.forEach(function(H){H.uniforms.forEach(function(U){M.has(U.name)||(M.add(U.name),N.setTypedUniform(U,G))})})}},{key:"render",value:function(I,G,N){this.maybeRegenerateShaders(),oe(P,"render",this,3)([I,G,N])}},{key:"renderProgram",value:function(I,G){this.layerLifecycles.forEach(function(N){var F;return(F=N.beforeRender)===null||F===void 0?void 0:F.call(N)}),oe(P,"renderProgram",this,3)([I,G])}},{key:"uploadAttributeTexture",value:function(){this.edgeAttributeTexture&&this.layout.floatsPerItem>0&&this.edgeAttributeTexture.upload()}},{key:"kill",value:function(){this.layerLifecycles.forEach(function(I){var G;return(G=I.kill)===null||G===void 0?void 0:G.call(I)}),this.edgeAttributeTexture&&(this.edgeAttributeTexture.kill(),this.edgeAttributeTexture=null),oe(P,"kill",this,3)([])}}])})(He),T=p[g],E=p[m],A=B({paths:d,headLengthRatio:Te(T.length)?0:T.length,tailLengthRatio:Te(E.length)?0:E.length},t.label),C=Co(A),w=function(){return{labelProgram:Po(a,null,e,A),labelBackgroundProgram:Do(a,n,e,{shaderConfig:C})}},k=new Ao(a,{paths:d,extremities:p,layers:c,nodeShapes:i,nodeLayers:o});return{edgeProgram:new x(a,null,e),createLabelPrograms:w,framePass:k}}function Xd(a){return Y(a)==="object"&&"uniforms"in a&&Array.isArray(a.uniforms)}function Yd(a){return Y(a)==="object"&&"uniforms"in a&&"attributes"in a&&"glsl"in a}function Kd(a){return Y(a)==="object"&&"uniforms"in a&&"attributes"in a&&"segments"in a}function Zd(a){return Y(a)==="object"&&"uniforms"in a&&"attributes"in a&&"length"in a}function Qd(a){return Y(a)==="object"&&"uniforms"in a&&"attributes"in a&&"glsl"in a}function Jd(a){return Y(a)==="object"&&"glsl"in a&&"name"in a&&!("uniforms"in a)}function ec(a){return Y(a)==="object"&&"glsl"in a&&"name"in a&&!("uniforms"in a)}function tc(a){return Y(a)==="object"&&"glsl"in a&&"name"in a&&!("uniforms"in a)}function nc(a){if(Xd(a))return a;if(Jd(a))return{name:a.name,glsl:a.glsl,inradiusFactor:a.inradiusFactor,uniforms:[]};throw new Error("Invalid node shape specification: ".concat(JSON.stringify(a)))}function ac(a){if(Yd(a))return a;if(pi(a))return{name:a.name,glsl:a.glsl,uniforms:[],attributes:[]};throw new Error("Invalid node layer specification: ".concat(JSON.stringify(a)))}function rc(a){if(Kd(a))return a;if(ec(a))return{name:a.name,glsl:a.glsl,segments:a.segments,uniforms:[],attributes:[]};throw new Error("Invalid edge path specification: ".concat(JSON.stringify(a)))}function ic(a){if(Qd(a))return a;if(vi(a))return{name:a.name,glsl:a.glsl,uniforms:[],attributes:[]};throw new Error("Invalid edge layer specification: ".concat(JSON.stringify(a)))}function oc(a){if(Zd(a))return a;if(tc(a))return{name:a.name,glsl:a.glsl,length:a.length,widthFactor:a.widthFactor,margin:0,uniforms:[],attributes:[]};throw new Error("Invalid edge extremity specification: ".concat(JSON.stringify(a)))}function ko(a){var n,e,t=(n=a?.shapes)!==null&&n!==void 0?n:qt.shapes,r=(e=a?.layers)!==null&&e!==void 0?e:qt.layers,i=t.map(nc),o=r.map(ac);if(i.length===0)throw new Error("At least one node shape must be specified.");if(o.length===0)throw new Error("At least one node layer must be specified.");return{shapes:i,layers:o}}function sc(a){var n,e,t,r=(n=a?.paths)!==null&&n!==void 0?n:bt.paths,i=(e=a?.extremities)!==null&&e!==void 0?e:bt.extremities,o=(t=a?.layers)!==null&&t!==void 0?t:bt.layers,s=r.map(rc),l=i.map(oc).filter(function(d){return d!==null}),u=o.map(ic);if(s.length===0)throw new Error("At least one edge path must be specified.");if(u.length===0)throw new Error("At least one edge layer must be specified.");return{paths:s,extremities:l,layers:u}}function Fo(a,n){var e={},t=z(a),r;try{for(t.s();!(r=t.n()).done;){var i=r.value;i.variables&&Object.assign(e,i.variables)}}catch(o){t.e(o)}finally{t.f()}return Object.assign(e,n||{}),e}function Io(a,n,e,t,r){var i=ko(t),o=i.shapes,s=i.layers,l=Fo(o,t?.variables),u=cr(a,n,e,{shapes:o,layers:s,label:t?.label,backdrop:t?.backdrop,labelAttachments:t?.labelAttachments},r);return B(B({},u),{},{variables:l})}function No(a,n,e,t,r,i){var o=sc(t),s=o.paths,l=o.extremities,u=o.layers,d=ko(i),c=d.shapes,f=d.layers,h=Fo(s,t?.variables),p=gr(a,n,e,{paths:s,extremities:l,layers:u,defaultHead:t?.defaultHead,defaultTail:t?.defaultTail,label:t?.label},r,c,f);return B(B({},p),{},{variables:h,paths:s})}var lc=2;function Go(a,n,e){var t=arguments.length>3&&arguments[3]!==void 0?arguments[3]:lc,r=n.canvas,i=r.width,o=r.height,s=e.x,l=e.y,u=e.rowHeight,d=e.maxRowWidth,c={},f=[],h=z(a),p;try{for(h.s();!(p=h.n()).done;){var b=p.value,v=b.width+t,g=b.height+t;if(v>i||g>o||s+v>i&&l+u+g>o){f.push(b);continue}s+v>i&&(d=Math.max(d,s),s=0,l+=u,u=g),b.draw(n,s,l),c[b.key]={x:s,y:l,width:b.width,height:b.height},s+=v,u=Math.max(u,g)}}catch(m){h.e(m)}finally{h.f()}return d=Math.max(d,s),{atlas:c,cursor:{x:s,y:l,rowHeight:u,maxRowWidth:d},remaining:f}}function fe(a,n,e,t){var r=Object.defineProperty;try{r({},"",{})}catch{r=0}fe=function(i,o,s,l){function u(d,c){fe(i,d,function(f){return this._invoke(d,c,f)})}o?r?r(i,o,{value:s,enumerable:!l,configurable:!l,writable:!l}):i[o]=s:(u("next",0),u("throw",1),u("return",2))},fe(a,n,e,t)}function ge(){var a,n,e=typeof Symbol=="function"?Symbol:{},t=e.iterator||"@@iterator",r=e.toStringTag||"@@toStringTag";function i(h,p,b,v){var g=p&&p.prototype instanceof s?p:s,m=Object.create(g.prototype);return fe(m,"_invoke",(function(y,_,x){var T,E,A,C=0,w=x||[],k=!1,R={p:0,n:0,v:a,a:P,f:P.bind(a,4),d:function(D,I){return T=D,E=0,A=a,R.n=I,o}};function P(D,I){for(E=D,A=I,n=0;!k&&C&&!G&&n<w.length;n++){var G,N=w[n],F=R.p,L=N[2];D>3?(G=L===I)&&(A=N[(E=N[4])?5:(E=3,3)],N[4]=N[5]=a):N[0]<=F&&((G=D<2&&F<N[1])?(E=0,R.v=I,R.n=N[1]):F<L&&(G=D<3||N[0]>I||I>L)&&(N[4]=D,N[5]=I,R.n=L,E=0))}if(G||D>1)return o;throw k=!0,I}return function(D,I,G){if(C>1)throw TypeError("Generator is already running");for(k&&I===1&&P(I,G),E=I,A=G;(n=E<2?a:A)||!k;){T||(E?E<3?(E>1&&(R.n=-1),P(E,A)):R.n=A:R.v=A);try{if(C=2,T){if(E||(D="next"),n=T[D]){if(!(n=n.call(T,A)))throw TypeError("iterator result is not an object");if(!n.done)return n;A=n.value,E<2&&(E=0)}else E===1&&(n=T.return)&&n.call(T),E<2&&(A=TypeError("The iterator does not provide a '"+D+"' method"),E=1);T=a}else if((n=(k=R.n<0)?A:y.call(_,R))!==o)break}catch(N){T=a,E=1,A=N}finally{C=1}}return{value:n,done:k}}})(h,b,v),!0),m}var o={};function s(){}function l(){}function u(){}n=Object.getPrototypeOf;var d=[][t]?n(n([][t]())):(fe(n={},t,function(){return this}),n),c=u.prototype=s.prototype=Object.create(d);function f(h){return Object.setPrototypeOf?Object.setPrototypeOf(h,u):(h.__proto__=u,fe(h,r,"GeneratorFunction")),h.prototype=Object.create(c),h}return l.prototype=u,fe(c,"constructor",u),fe(u,"constructor",l),l.displayName="GeneratorFunction",fe(u,r,"GeneratorFunction"),fe(c),fe(c,r,"Generator"),fe(c,t,function(){return this}),fe(c,"toString",function(){return"[object Generator]"}),(ge=function(){return{w:i,m:f}})()}function Mo(a,n,e,t,r,i,o){try{var s=a[i](o),l=s.value}catch(u){return void e(u)}s.done?n(l):Promise.resolve(l).then(t,r)}function Dt(a){return function(){var n=this,e=arguments;return new Promise(function(t,r){var i=a.apply(n,e);function o(l){Mo(i,t,r,o,s,"next",l)}function s(l){Mo(i,t,r,o,s,"throw",l)}o(void 0)})}}var ia=new Map,zo=!1;function uc(a){return new Promise(function(n,e){var t=new FileReader;t.onload=function(){return n(t.result)},t.onerror=e,t.readAsDataURL(a)})}function dc(a){if(!ia.has(a)){var n=fetch(a).then(function(e){return e.blob()}).then(uc).catch(function(){return ia.delete(a),null});ia.set(a,n)}return ia.get(a)}function cc(a){return pr.apply(this,arguments)}function pr(){return pr=Dt(ge().m(function a(n){var e,t,r;return ge().w(function(i){for(;;)switch(i.n){case 0:return e=document.createElement("div"),e.innerHTML=n,t=Array.from(e.querySelectorAll("img[src]")),r=t.filter(function(o){return!o.getAttribute("src").startsWith("data:")}),i.n=1,Promise.all(r.map((function(){var o=Dt(ge().m(function s(l){var u;return ge().w(function(d){for(;;)switch(d.n){case 0:return d.n=1,dc(l.getAttribute("src"));case 1:u=d.v,u&&l.setAttribute("src",u);case 2:return d.a(2)}},s)}));return function(s){return o.apply(this,arguments)}})()));case 1:return i.a(2,e.innerHTML)}},a)})),pr.apply(this,arguments)}function Bo(a){return vr.apply(this,arguments)}function vr(){return vr=Dt(ge().m(function a(n){var e,t,r,i,o,s,l,u,d,c,f,h,p,b=arguments;return ge().w(function(v){for(;;)switch(v.n){case 0:if(e=b.length>1&&b[1]!==void 0?b[1]:1,t=n instanceof SVGElement?new XMLSerializer().serializeToString(n):n,r=new DOMParser,i=r.parseFromString(t,"image/svg+xml"),o=i.querySelector("svg"),o){v.n=1;break}return v.a(2,null);case 1:if(s=parseFloat(o.getAttribute("width")||""),l=parseFloat(o.getAttribute("height")||""),(!(s>0)||!(l>0))&&(u=o.getAttribute("viewBox"),u&&(d=u.trim().split(/[\s,]+/),s=parseFloat(d[2]),l=parseFloat(d[3]))),!(!(s>0)||!(l>0))){v.n=2;break}return console.warn("Sigma: SVG label attachment has no parseable dimensions \u2014 skipped."),v.a(2,null);case 2:return c=Math.ceil(s*e),f=Math.ceil(l*e),h=new Blob([t],{type:"image/svg+xml"}),p=URL.createObjectURL(h),v.a(2,new Promise(function(g){var m=new Image;m.onload=function(){var y=document.createElement("canvas");y.width=c,y.height=f,y.getContext("2d").drawImage(m,0,0,c,f),URL.revokeObjectURL(p);try{y.getContext("2d").getImageData(0,0,1,1)}catch(_){if(_ instanceof DOMException&&_.name==="SecurityError"){zo||(zo=!0,console.warn('Sigma: A label attachment was skipped because the rendered canvas is tainted. SVG with <foreignObject> (used by the "html" attachment type) is blocked in Chromium and Safari. Use type: "canvas" with Canvas 2D rendering instead.')),g(null);return}throw _}g(y)},m.onerror=function(){URL.revokeObjectURL(p),g(null)},m.src=p}))}},a)})),vr.apply(this,arguments)}function hc(a,n){var e=document.createElement("div");e.style.cssText="position:fixed;left:-99999px;top:0;visibility:hidden;width:max-content;height:max-content",e.innerHTML=(n?"<style>".concat(n,"</style>"):"")+a,document.body.appendChild(e);var t=e.getBoundingClientRect(),r=t.width,i=t.height;return document.body.removeChild(e),{width:Math.ceil(r),height:Math.ceil(i)}}function fc(a,n,e,t){return mr.apply(this,arguments)}function mr(){return mr=Dt(ge().m(function a(n,e,t,r){var i,o,s,l,u,d,c,f,h=arguments;return ge().w(function(p){for(;;)switch(p.n){case 0:return i=h.length>4&&h[4]!==void 0?h[4]:1,o=n instanceof HTMLElement?n.outerHTML:n,p.n=1,cc(o);case 1:return s=p.v,(t==null||r==null)&&(l=hc(s,e),t=t??l.width,r=r??l.height),u=Math.ceil(t*i),d=Math.ceil(r*i),c=e?"<style>".concat(e,"</style>"):"",f='<svg xmlns="http://www.w3.org/2000/svg" '+'width="'.concat(u,'" height="').concat(d,'" viewBox="0 0 ').concat(t," ").concat(r,'">')+'<foreignObject width="'.concat(t,'" height="').concat(r,'">')+'<body xmlns="http://www.w3.org/1999/xhtml" style="margin:0;padding:0">'.concat(c).concat(s,"</body>")+"</foreignObject></svg>",p.a(2,Bo(f,1))}},a)})),mr.apply(this,arguments)}function gc(a){return br.apply(this,arguments)}function br(){return br=Dt(ge().m(function a(n){var e,t=arguments,r;return ge().w(function(i){for(;;)switch(i.n){case 0:e=t.length>1&&t[1]!==void 0?t[1]:1,r=n.type,i.n=r==="canvas"?1:r==="svg"?2:r==="html"?3:4;break;case 1:return i.a(2,n.canvas);case 2:return i.a(2,Bo(n.svg,e));case 3:return i.a(2,fc(n.html,n.css,n.width,n.height,e));case 4:return i.a(2)}},a)})),br.apply(this,arguments)}var wt=2048,Oo=(function(){function a(n,e,t){K(this,a),S(this,"cache",new Map),S(this,"pending",new Set),S(this,"atlas",{}),S(this,"glTexture",null),S(this,"dirty",!0),this.gl=n,this.renderers=e,this.scheduleRender=t,this.packCanvas=document.createElement("canvas"),this.packCanvas.width=wt,this.packCanvas.height=wt,this.packCtx=this.packCanvas.getContext("2d")}return Z(a,[{key:"renderAttachment",value:function(e,t,r){var i=this,o="".concat(e,":").concat(t);if(!(this.cache.has(o)||this.pending.has(o))){var s=this.renderers[t];if(s){var l=s(r);if(l){this.pending.add(o);var u=r.pixelRatio;Promise.resolve(l).then((function(){var d=Dt(ge().m(function c(f){var h;return ge().w(function(p){for(;;)switch(p.n){case 0:if(i.pending.has(o)){p.n=1;break}return p.a(2);case 1:if(i.pending.delete(o),f){p.n=2;break}return p.a(2);case 2:return p.n=3,gc(f,u);case 3:if(h=p.v,!(!h||h.width===0||h.height===0)){p.n=4;break}return p.a(2);case 4:i.cache.set(o,{image:h,width:h.width,height:h.height}),i.dirty=!0,i.scheduleRender();case 5:return p.a(2)}},c)}));return function(c){return d.apply(this,arguments)}})())}}}}},{key:"regenerateAtlas",value:function(){if(this.dirty){this.dirty=!1;var e=[];if(this.cache.forEach(function(u,d){e.push({key:d,width:u.width,height:u.height,draw:function(f,h,p){f.drawImage(u.image,h,p)}})}),e.length===0){this.atlas={},this.deleteGLTexture();return}var t={x:0,y:0,rowHeight:0,maxRowWidth:0};this.packCtx.clearRect(0,0,wt,wt);var r=Go(e,this.packCtx,t),i=r.atlas,o=r.remaining;this.atlas=i,o.length>0&&console.warn("Sigma: ".concat(o.length," label attachment(s) could not fit in the ").concat(wt,"x").concat(wt," atlas and will not be rendered.")),this.deleteGLTexture();var s=this.gl,l=s.createTexture();s.activeTexture(s.TEXTURE0+en),s.bindTexture(s.TEXTURE_2D,l),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!0),s.texImage2D(s.TEXTURE_2D,0,s.RGBA,s.RGBA,s.UNSIGNED_BYTE,this.packCanvas),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MAG_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.CLAMP_TO_EDGE),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.CLAMP_TO_EDGE),this.glTexture=l}}},{key:"bindTexture",value:function(e){if(this.glTexture){var t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.glTexture)}}},{key:"getEntry",value:function(e,t){var r="".concat(e,":").concat(t);return this.atlas[r]||null}},{key:"invalidateNode",value:function(e){var t="".concat(e,":"),r=z(this.cache.keys()),i;try{for(r.s();!(i=r.n()).done;){var o=i.value;o.startsWith(t)&&(this.cache.delete(o),this.dirty=!0)}}catch(d){r.e(d)}finally{r.f()}var s=z(this.pending),l;try{for(s.s();!(l=s.n()).done;){var u=l.value;u.startsWith(t)&&this.pending.delete(u)}}catch(d){s.e(d)}finally{s.f()}}},{key:"restore",value:function(){this.glTexture=null,this.dirty=!0}},{key:"clear",value:function(){this.cache.clear(),this.pending.clear(),this.atlas={},this.dirty=!0,this.deleteGLTexture()}},{key:"kill",value:function(){this.clear(),this.packCanvas=null,this.packCtx=null,this.gl=null}},{key:"deleteGLTexture",value:function(){this.glTexture&&(this.gl.deleteTexture(this.glTexture),this.glTexture=null)}}])})(),yr=(function(){function a(n){K(this,a),S(this,"buckets",new Map),S(this,"keyDepth",new Map);var e=z(n),t;try{for(e.s();!(t=e.n()).done;){var r=t.value;this.buckets.set(r,new Set)}}catch(i){e.e(i)}finally{e.f()}}return Z(a,[{key:"has",value:function(e){return this.keyDepth.has(e)}},{key:"getBucket",value:function(e){return this.buckets.get(e)}},{key:"set",value:function(e,t){var r,i=this.keyDepth.get(e);if(i!==t){var o=this.buckets.get(t);if(!o)throw new Error('Sigma: "'.concat(t,'" is not a declared depth layer'));i!==void 0&&((r=this.buckets.get(i))===null||r===void 0||r.delete(e)),o.add(e),this.keyDepth.set(e,t)}}},{key:"remove",value:function(e){var t=this.keyDepth.get(e);t!==void 0&&(this.buckets.get(t).delete(e),this.keyDepth.delete(e))}},{key:"clearAll",value:function(){var e=z(this.buckets.values()),t;try{for(e.s();!(t=e.n()).done;){var r=t.value;r.clear()}}catch(i){e.e(i)}finally{e.f()}this.keyDepth.clear()}},{key:"getSorted",value:function(e,t){var r=this.buckets.get(e);return!r||r.size===0?[]:$(r).sort(function(i,o){return t(i)-t(o)})}}])})(),Wo=(function(a){function n(e,t){return K(this,n),ne(this,n,[e,2,t])}return ae(n,a),Z(n,[{key:"updateNode",value:function(t,r,i,o,s,l,u,d){var c=this.indexMap.get(t);if(c===void 0)throw new Error('Node "'.concat(t,'" not allocated in NodeDataTexture'));var f=Ie(d),h=Q(f,4),p=h[0],b=h[1],v=h[2],g=h[3],m=c*2*4;this.data[m]=r,this.data[m+1]=i,this.data[m+2]=o,this.data[m+3]=s,this.data[m+4]=l,this.data[m+5]=u,this.data[m+6]=p*65536+b*256+v,this.data[m+7]=g/255,this.markDirty(c)}}])})(Jt),pc=1024,vc=1.5,xr=(function(){function a(n,e){var t;if(K(this,a),S(this,"texture",null),S(this,"framebuffer",null),!n.getExtension("EXT_color_buffer_float"))throw new Error("sigma: EXT_color_buffer_float is required for label/edge placement but is unavailable in this WebGL2 context.");this.gl=n,this.maxTextureSize=n.getParameter(n.MAX_TEXTURE_SIZE),this.channels=e.channels,this.capacity=this.roundUpToPowerOfTwo((t=e.initialCapacity)!==null&&t!==void 0?t:pc);var r=this.computeDimensions(this.capacity);this.textureWidth=r.width,this.textureHeight=r.height,this.create()}return Z(a,[{key:"roundUpToPowerOfTwo",value:function(e){return Math.pow(2,Math.ceil(Math.log2(Math.max(1,e))))}},{key:"computeDimensions",value:function(e){var t=Math.min(e,this.maxTextureSize),r=Math.ceil(e/t);return{width:t,height:r}}},{key:"create",value:function(){var e=this.gl,t=this.channels===1?e.R32F:e.RGBA32F,r=this.channels===1?e.RED:e.RGBA;if(this.texture=e.createTexture(),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this.texture),e.texImage2D(e.TEXTURE_2D,0,t,this.textureWidth,this.textureHeight,0,r,e.FLOAT,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),this.framebuffer=e.createFramebuffer(),e.bindFramebuffer(e.FRAMEBUFFER,this.framebuffer),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,this.texture,0),e.checkFramebufferStatus(e.FRAMEBUFFER)!==e.FRAMEBUFFER_COMPLETE)throw new Error("sigma: float framebuffer for frame-pass placement is incomplete.");e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null)}},{key:"ensureCapacity",value:function(e){if(!(e<=this.capacity)){var t=this.gl;this.capacity=this.roundUpToPowerOfTwo(Math.ceil(e*vc));var r=this.computeDimensions(this.capacity);this.textureWidth=r.width,this.textureHeight=r.height,this.texture&&t.deleteTexture(this.texture),this.framebuffer&&t.deleteFramebuffer(this.framebuffer),this.create()}}},{key:"bindAsRenderTarget",value:function(){var e=this.gl;e.bindFramebuffer(e.FRAMEBUFFER,this.framebuffer),e.viewport(0,0,this.textureWidth,this.textureHeight)}},{key:"bind",value:function(e){var t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture)}},{key:"getTexture",value:function(){return this.texture}},{key:"getTextureWidth",value:function(){return this.textureWidth}},{key:"getTextureHeight",value:function(){return this.textureHeight}},{key:"restore",value:function(){this.gl.getExtension("EXT_color_buffer_float"),this.create()}},{key:"kill",value:function(){var e=this.gl;this.texture&&(e.deleteTexture(this.texture),this.texture=null),this.framebuffer&&(e.deleteFramebuffer(this.framebuffer),this.framebuffer=null)}}])})(),Uo=(function(a){function n(e,t){return K(this,n),ne(this,n,[e,2,t])}return ae(n,a),Z(n,[{key:"updateEdge",value:function(t,r,i,o,s,l){var u=arguments.length>6&&arguments[6]!==void 0?arguments[6]:0,d=arguments.length>7&&arguments[7]!==void 0?arguments[7]:0,c=arguments.length>8&&arguments[8]!==void 0?arguments[8]:0,f=this.indexMap.get(t);if(f===void 0)throw new Error('Edge "'.concat(t,'" not allocated in EdgeDataTexture'));var h=f*this.TEXELS_PER_ITEM*4;this.data[h+0]=r,this.data[h+1]=i,this.data[h+2]=o,this.data[h+3]=0,this.data[h+4]=s,this.data[h+5]=l,this.data[h+6]=u,this.data[h+7]=(d&15)<<4|c&15,this.markDirty(f)}}])})(Jt);var wf=Ce(je()),Df=Ce(Gn());function mc(a,n){if(a==null)return{};var e={};for(var t in a)if({}.hasOwnProperty.call(a,t)){if(n.indexOf(t)!==-1)continue;e[t]=a[t]}return e}function Ho(a,n){if(a==null)return{};var e,t,r=mc(a,n);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(a);for(t=0;t<i.length;t++)e=i[t],n.indexOf(e)===-1&&{}.propertyIsEnumerable.call(a,e)&&(r[e]=a[e])}return r}var bc=["factor"],yc=["factor"],$o=1.5,_r={x:.5,y:.5,angle:0,ratio:1},Vo=(function(a){function n(){var e;K(this,n);for(var t=arguments.length,r=new Array(t),i=0;i<t;i++)r[i]=arguments[i];return e=ne(this,n,[].concat(r)),S(e,"minRatio",null),S(e,"maxRatio",null),S(e,"enabled",!0),S(e,"enabledZooming",!0),S(e,"enabledPanning",!0),S(e,"enabledRotation",!0),S(e,"constrainState",null),S(e,"state",B({},_r)),S(e,"previousState",B({},_r)),S(e,"nextFrame",null),S(e,"currentAnimationFrom",null),S(e,"currentAnimationTo",null),S(e,"animationCallback",null),e}return ae(n,a),Z(n,[{key:"x",get:function(){return this.state.x}},{key:"y",get:function(){return this.state.y}},{key:"angle",get:function(){return this.state.angle}},{key:"ratio",get:function(){return this.state.ratio}},{key:"getState",value:function(){return B({},this.state)}},{key:"getPreviousState",value:function(){return B({},this.previousState)}},{key:"getBoundedRatio",value:function(t){var r=t;return typeof this.minRatio=="number"&&(r=Math.max(r,this.minRatio)),typeof this.maxRatio=="number"&&(r=Math.min(r,this.maxRatio)),r}},{key:"validateState",value:function(t){var r=this.getState();return this.enabledPanning&&typeof t.x=="number"&&(r.x=t.x),this.enabledPanning&&typeof t.y=="number"&&(r.y=t.y),this.enabledZooming&&typeof t.ratio=="number"&&(r.ratio=this.getBoundedRatio(t.ratio)),this.enabledRotation&&typeof t.angle=="number"&&(r.angle=t.angle),this.constrainState?this.constrainState(r):r}},{key:"isAnimating",value:function(){return this.nextFrame!==null}},{key:"setState",value:function(t){if(!this.enabled)return this;var r=this.validateState(t);return Pi(this.state,r)?this:(this.previousState=this.state,this.state=r,this.emit("updated",this.getState()),this)}},{key:"updateState",value:function(t){return this.setState(t(this.getState())),this}},{key:"animate",value:function(t,r){var i=this;return this.enabled?new Promise(function(o){return i.runAnimation(t,B(B({},Ii),r),o)}):Promise.resolve()}},{key:"cancelAnimation",value:function(){return this.nextFrame!==null&&(cancelAnimationFrame(this.nextFrame),this.nextFrame=null),this.resolveAnimation(),this.emitAnimationEnd(!1),this}},{key:"zoomIn",value:function(){var t=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{},r=t.factor,i=r===void 0?$o:r,o=Ho(t,bc);return this.animate({ratio:this.ratio/i},o)}},{key:"zoomOut",value:function(){var t=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{},r=t.factor,i=r===void 0?$o:r,o=Ho(t,yc);return this.animate({ratio:this.ratio*i},o)}},{key:"reset",value:function(t){return this.animate(_r,t)}},{key:"runAnimation",value:function(t,r,i){var o=this,s=Pn(r.easing),l=Date.now(),u=this.getState(),d=this.validateState(t),c=function(){if(!o.enabled){o.cancelAnimation();return}var h=r.duration>0?(Date.now()-l)/r.duration:1;if(h>=1){o.nextFrame=null,o.setState(d),o.resolveAnimation(),o.emitAnimationEnd(!0);return}var p=s(h);o.setState({x:u.x+(d.x-u.x)*p,y:u.y+(d.y-u.y)*p,angle:u.angle+(d.angle-u.angle)*p,ratio:u.ratio+(d.ratio-u.ratio)*p}),o.nextFrame=requestAnimationFrame(c)};this.cancelAnimation(),this.currentAnimationFrom=u,this.currentAnimationTo=d,this.animationCallback=i,this.emit("animationStart",{from:u,to:d}),c()}},{key:"resolveAnimation",value:function(){var t=this.animationCallback;this.animationCallback=null,t&&t()}},{key:"emitAnimationEnd",value:function(t){var r=this.currentAnimationFrom,i=this.currentAnimationTo;!r||!i||(this.currentAnimationFrom=null,this.currentAnimationTo=null,this.emit("animationEnd",{from:r,to:i,completed:t}))}}],[{key:"from",value:function(t){var r=new n;return r.setState(t)}}])})(Nn);function pe(a,n){var e=n.getBoundingClientRect();return{x:a.clientX-e.left,y:a.clientY-e.top}}function Re(a,n){var e=B(B({},pe(a,n)),{},{sigmaDefaultPrevented:!1,preventSigmaDefault:function(){e.sigmaDefaultPrevented=!0},original:a});return e}function nt(a){var n="x"in a?a:B(B({},a.touches[0]||a.previousTouches[0]),{},{original:a.original,sigmaDefaultPrevented:a.sigmaDefaultPrevented,preventSigmaDefault:function(){a.sigmaDefaultPrevented=!0,n.sigmaDefaultPrevented=!0}});return n}function xc(a,n){var e=Re(a,n);return e.delta=ss(a),e}var _c=2;function la(a){for(var n=[],e=0,t=Math.min(a.length,_c);e<t;e++)n.push(a[e]);return n}function nn(a,n,e){var t={touches:la(a.touches).map(function(r){return pe(r,e)}),previousTouches:n.map(function(r){return pe(r,e)}),sigmaDefaultPrevented:!1,preventSigmaDefault:function(){t.sigmaDefaultPrevented=!0},original:a};return t}function ss(a){if(typeof a.deltaY<"u")return a.deltaY*-3/360;if(typeof a.detail<"u")return a.detail/-9;throw new Error("Captor: could not extract delta from event.")}var ls=(function(a){function n(e,t){var r;return K(this,n),r=ne(this,n),r.container=e,r.renderer=t,r}return ae(n,a),Z(n)})(Nn),Tc=["doubleClickTimeout","doubleClickZoomingDuration","doubleClickZoomingRatio","dragTimeout","draggedEventsTolerance","enableCameraMouseRotation","gestureTarget","inertiaDuration","inertiaRatio","zoomDuration","zoomingRatio"],Sc=Tc.reduce(function(a,n){return B(B({},a),{},S({},n,Bn[n]))},{});function an(a){return a instanceof PointerEvent&&a.pointerType==="touch"}var Ec=(function(a){function n(e,t){var r;return K(this,n),r=ne(this,n,[e,t]),S(r,"enabled",!0),S(r,"draggedEvents",0),S(r,"downStartTime",null),S(r,"lastMouseX",null),S(r,"lastMouseY",null),S(r,"isMouseDown",!1),S(r,"isMoving",!1),S(r,"isPanningStage",!1),S(r,"movingTimeout",null),S(r,"startCameraState",null),S(r,"clicks",0),S(r,"doubleClickTimeout",null),S(r,"isRightMouseDown",!1),S(r,"startRotationAngle",null),S(r,"startCameraAngle",null),S(r,"currentWheelDirection",0),S(r,"lastWheelAnimationId",0),S(r,"settings",Sc),r.handleRightClick=r.handleRightClick.bind(r),r.handleDown=r.handleDown.bind(r),r.handleUp=r.handleUp.bind(r),r.handleMove=r.handleMove.bind(r),r.handleWheel=r.handleWheel.bind(r),r.handleLeave=r.handleLeave.bind(r),r.handleEnter=r.handleEnter.bind(r),e.addEventListener("contextmenu",r.handleRightClick,{capture:!1}),e.addEventListener("pointerdown",r.handleDown,{capture:!1}),e.addEventListener("wheel",r.handleWheel,{capture:!1,passive:!1}),e.addEventListener("pointerleave",r.handleLeave,{capture:!1}),e.addEventListener("pointerenter",r.handleEnter,{capture:!1}),document.addEventListener("pointermove",r.handleMove,{capture:!1}),document.addEventListener("pointerup",r.handleUp,{capture:!1}),r}return ae(n,a),Z(n,[{key:"kill",value:function(){var t=this.container;t.removeEventListener("contextmenu",this.handleRightClick),t.removeEventListener("pointerdown",this.handleDown),t.removeEventListener("wheel",this.handleWheel),t.removeEventListener("pointerleave",this.handleLeave),t.removeEventListener("pointerenter",this.handleEnter),document.removeEventListener("pointermove",this.handleMove),document.removeEventListener("pointerup",this.handleUp)}},{key:"handleClick",value:function(t){var r=this;if(this.enabled){if(this.clicks++,this.clicks===2)return this.clicks=0,typeof this.doubleClickTimeout=="number"&&(clearTimeout(this.doubleClickTimeout),this.doubleClickTimeout=null),this.handleDoubleClick(t);setTimeout(function(){r.clicks=0,r.doubleClickTimeout=null},this.settings.doubleClickTimeout),this.draggedEvents<this.settings.draggedEventsTolerance&&this.emit("click",Re(t,this.container))}}},{key:"handleRightClick",value:function(t){this.enabled&&(this.settings.enableCameraMouseRotation&&t.preventDefault(),this.emit("rightClick",Re(t,this.container)))}},{key:"handleDoubleClick",value:function(t){if(this.enabled){t.preventDefault(),t.stopPropagation();var r=Re(t,this.container);if(this.emit("doubleClick",r),!r.sigmaDefaultPrevented){var i=this.renderer.getCamera(),o=i.getBoundedRatio(i.getState().ratio/this.settings.doubleClickZoomingRatio);i.animate(this.renderer.getViewportZoomedState(pe(t,this.container),o),{easing:"quadraticInOut",duration:this.settings.doubleClickZoomingDuration})}}}},{key:"handleDown",value:function(t){if(!(!this.enabled||an(t))){if(t.button===0){this.startCameraState=this.renderer.getCamera().getState();var r=pe(t,this.container),i=r.x,o=r.y;this.lastMouseX=i,this.lastMouseY=o,this.draggedEvents=0,this.downStartTime=Date.now(),this.isMouseDown=!0}if(t.button===2&&this.settings.enableCameraMouseRotation){var s=pe(t,this.container),l=s.x,u=s.y,d=this.container.offsetWidth/2,c=this.container.offsetHeight/2;this.startRotationAngle=Math.atan2(u-c,l-d),this.startCameraAngle=this.renderer.getCamera().getState().angle,this.isRightMouseDown=!0}this.emit("mousedown",Re(t,this.container))}}},{key:"handleUp",value:function(t){var r=this;if(!(!this.enabled||an(t)||!this.isMouseDown&&!this.isRightMouseDown)){if(this.isRightMouseDown){this.isRightMouseDown=!1,this.startRotationAngle=null,this.startCameraAngle=null,this.emit("mouseup",Re(t,this.container));return}var i=this.renderer.getCamera();this.isMouseDown=!1,this.isPanningStage&&(this.isPanningStage=!1,this.renderer._setPanning(!1)),typeof this.movingTimeout=="number"&&(clearTimeout(this.movingTimeout),this.movingTimeout=null);var o=pe(t,this.container),s=o.x,l=o.y,u=i.getState(),d=i.getPreviousState();this.isMoving?i.animate({x:u.x+this.settings.inertiaRatio*(u.x-d.x),y:u.y+this.settings.inertiaRatio*(u.y-d.y)},{duration:this.settings.inertiaDuration,easing:"quadraticOut"}):(this.lastMouseX!==s||this.lastMouseY!==l)&&i.setState({x:u.x,y:u.y}),this.isMoving=!1,setTimeout(function(){var c=r.draggedEvents>0;r.draggedEvents=0;var f=r.renderer.getSetting("hideEdgesOnMove")||r.renderer.getSetting("hideLabelsOnMove");c&&f&&r.renderer.refresh()},0),this.emit("mouseup",Re(t,this.container)),(t.target===this.container||t.composedPath()[0]===this.container)&&this.handleClick(t)}}},{key:"handleMove",value:function(t){var r=this;if(!(!this.enabled||an(t))){var i=Re(t,this.container);if(this.emit("mousemovebody",i),(t.target===this.container||t.composedPath()[0]===this.container)&&this.emit("mousemove",i),this.isMouseDown&&this.draggedEvents++,!i.sigmaDefaultPrevented){if(this.isMouseDown){this.isMoving=!0,typeof this.movingTimeout=="number"&&clearTimeout(this.movingTimeout),this.movingTimeout=window.setTimeout(function(){r.movingTimeout=null,r.isMoving=!1},this.settings.dragTimeout);var o=this.renderer.getCamera(),s=pe(t,this.container),l=s.x,u=s.y,d=this.renderer.viewportToFramedGraph({x:this.lastMouseX,y:this.lastMouseY}),c=this.renderer.viewportToFramedGraph({x:l,y:u}),f=d.x-c.x,h=d.y-c.y,p=o.getState(),b=p.x+f,v=p.y+h;this.isPanningStage||(this.isPanningStage=!0,this.renderer._setPanning(!0)),o.setState({x:b,y:v}),this.lastMouseX=l,this.lastMouseY=u,t.preventDefault(),t.stopPropagation()}if(this.isRightMouseDown){var g=pe(t,this.container),m=g.x,y=g.y,_=this.container.offsetWidth/2,x=this.container.offsetHeight/2,T=Math.atan2(y-x,m-_),E=T-this.startRotationAngle,A=this.renderer.getCamera();A.setState({angle:this.startCameraAngle+E}),t.preventDefault(),t.stopPropagation()}}}}},{key:"handleLeave",value:function(t){an(t)||this.emit("mouseleave",Re(t,this.container))}},{key:"handleEnter",value:function(t){an(t)||this.emit("mouseenter",Re(t,this.container))}},{key:"handleWheel",value:function(t){var r=this,i=this.renderer.getCamera();if(!(!this.enabled||!i.enabledZooming)){var o=xc(t,this.container);if(this.emit("wheel",o),!o.sigmaDefaultPrevented){var s=this.settings.gestureTarget;if(s!=="page"){if(s==="shared"&&!t.ctrlKey&&!t.metaKey){this.renderer._showGestureHint("wheel");return}var l=ss(t);if(l){t.preventDefault(),t.stopPropagation();var u=i.getState().ratio,d=l>0?1/this.settings.zoomingRatio:this.settings.zoomingRatio,c=i.getBoundedRatio(u*d),f=l>0?1:-1,h=Date.now();if(u!==c&&!(this.currentWheelDirection===f&&this.lastWheelTriggerTime&&h-this.lastWheelTriggerTime<this.settings.zoomDuration/5)){var p=++this.lastWheelAnimationId;i.animate(this.renderer.getViewportZoomedState(pe(t,this.container),c),{easing:"quadraticOut",duration:this.settings.zoomDuration}).then(function(){r.lastWheelAnimationId===p&&(r.currentWheelDirection=0)}),this.currentWheelDirection=f,this.lastWheelTriggerTime=h}}}}}}},{key:"setSettings",value:function(t){this.settings=t}}])})(ls),Ac=["dragTimeout","gestureTarget","inertiaDuration","inertiaRatio","doubleClickTimeout","doubleClickZoomingRatio","doubleClickZoomingDuration","tapMoveTolerance"],Rc=Ac.reduce(function(a,n){return B(B({},a),{},S({},n,Bn[n]))},{}),wc=(function(a){function n(e,t){var r;return K(this,n),r=ne(this,n,[e,t]),S(r,"enabled",!0),S(r,"isMoving",!1),S(r,"hasMoved",!1),S(r,"isPanningStage",!1),S(r,"isZoomingStage",!1),S(r,"touchMode",0),S(r,"startTouchesPositions",[]),S(r,"lastTouches",[]),S(r,"lastTap",null),S(r,"settings",Rc),r.handleStart=r.handleStart.bind(r),r.handleLeave=r.handleLeave.bind(r),r.handleMove=r.handleMove.bind(r),e.addEventListener("touchstart",r.handleStart,{capture:!1}),e.addEventListener("touchcancel",r.handleLeave,{capture:!1}),document.addEventListener("touchend",r.handleLeave,{capture:!1,passive:!1}),document.addEventListener("touchmove",r.handleMove,{capture:!1,passive:!1}),r}return ae(n,a),Z(n,[{key:"kill",value:function(){var t=this.container;t.removeEventListener("touchstart",this.handleStart),t.removeEventListener("touchcancel",this.handleLeave),document.removeEventListener("touchend",this.handleLeave),document.removeEventListener("touchmove",this.handleMove)}},{key:"getDimensions",value:function(){return{width:this.container.offsetWidth,height:this.container.offsetHeight}}},{key:"doesCapture",value:function(t){var r=this.settings.gestureTarget;return r==="graph"?!0:r==="page"?!1:t>=2}},{key:"syncStageFlags",value:function(){var t=this.touchMode===1&&this.hasMoved,r=this.touchMode===2;t!==this.isPanningStage&&(this.isPanningStage=t,this.renderer._setPanning(t)),r!==this.isZoomingStage&&(this.isZoomingStage=r,this.renderer._setZooming(r))}},{key:"handleStart",value:function(t){var r=this;if(this.enabled){var i=la(t.touches);if(this.touchMode=i.length,this.startCameraState=this.renderer.getCamera().getState(),this.startTouchesPositions=i.map(function(h){return pe(h,r.container)}),this.touchMode===2){var o=Q(this.startTouchesPositions,2),s=o[0],l=s.x,u=s.y,d=o[1],c=d.x,f=d.y;this.startTouchesAngle=Math.atan2(f-u,c-l),this.startTouchesDistance=Math.sqrt(Math.pow(c-l,2)+Math.pow(f-u,2))}this.syncStageFlags(),this.emit("touchdown",nn(t,this.lastTouches,this.container)),this.lastTouches=i,this.lastTouchesPositions=this.startTouchesPositions,t.cancelable&&(this.doesCapture(t.touches.length)||this.renderer._hasNodeDrag())&&t.preventDefault()}}},{key:"handleLeave",value:function(t){if(!(!this.enabled||!this.startTouchesPositions.length)){switch(t.cancelable&&this.doesCapture(this.touchMode)&&t.preventDefault(),this.movingTimeout&&(this.isMoving=!1,clearTimeout(this.movingTimeout)),this.touchMode){case 2:if(t.touches.length===1){this.handleStart(t);break}case 1:if(this.isMoving){var r=this.renderer.getCamera(),i=r.getState(),o=r.getPreviousState();r.animate({x:i.x+this.settings.inertiaRatio*(i.x-o.x),y:i.y+this.settings.inertiaRatio*(i.y-o.y)},{duration:this.settings.inertiaDuration,easing:"quadraticOut"})}this.hasMoved=!1,this.isMoving=!1,this.touchMode=0;break}if(this.syncStageFlags(),this.emit("touchup",nn(t,this.lastTouches,this.container)),!t.touches.length){var s=pe(this.lastTouches[0],this.container),l=this.startTouchesPositions[0],u=Math.pow(s.x-l.x,2)+Math.pow(s.y-l.y,2);if(!t.touches.length&&u<Math.pow(this.settings.tapMoveTolerance,2))if(this.lastTap&&Date.now()-this.lastTap.time<this.settings.doubleClickTimeout){var d=nn(t,this.lastTouches,this.container);if(this.emit("doubletap",d),this.lastTap=null,!d.sigmaDefaultPrevented&&this.settings.gestureTarget!=="page"){var c=this.renderer.getCamera(),f=c.getBoundedRatio(c.getState().ratio/this.settings.doubleClickZoomingRatio);c.animate(this.renderer.getViewportZoomedState(s,f),{easing:"quadraticInOut",duration:this.settings.doubleClickZoomingDuration})}}else{var h=nn(t,this.lastTouches,this.container);this.emit("tap",h),this.lastTap={time:Date.now(),position:h.touches[0]||h.previousTouches[0]}}}this.lastTouches=la(t.touches),this.startTouchesPositions=[]}}},{key:"handleMove",value:function(t){var r=this;if(!(!this.enabled||!this.startTouchesPositions.length)){var i=this.doesCapture(t.touches.length);i&&t.preventDefault();var o=la(t.touches),s=o.map(function(U){return pe(U,r.container)}),l=this.lastTouches;this.lastTouches=o,this.lastTouchesPositions=s;var u=nn(t,l,this.container);if(this.emit("touchmove",u),!u.sigmaDefaultPrevented&&(this.hasMoved||(this.hasMoved=s.some(function(U,X){var q=r.startTouchesPositions[X];return q&&(U.x!==q.x||U.y!==q.y)})),!!this.hasMoved)){if(!i){this.settings.gestureTarget==="shared"&&this.renderer._showGestureHint("touch");return}this.isMoving=!0,this.syncStageFlags(),this.movingTimeout&&clearTimeout(this.movingTimeout),this.movingTimeout=window.setTimeout(function(){r.isMoving=!1},this.settings.dragTimeout);var d=this.renderer.getCamera(),c=this.startCameraState,f=this.renderer.getSetting("stagePadding");switch(this.touchMode){case 1:{var h=this.renderer.viewportToFramedGraph((this.startTouchesPositions||[])[0]),p=h.x,b=h.y,v=this.renderer.viewportToFramedGraph(s[0]),g=v.x,m=v.y;d.setState({x:c.x+p-g,y:c.y+b-m});break}case 2:{var y={x:.5,y:.5,angle:0,ratio:1},_=s[0],x=_.x,T=_.y,E=s[1],A=E.x,C=E.y,w=Math.atan2(C-T,A-x)-this.startTouchesAngle,k=Math.hypot(C-T,A-x)/this.startTouchesDistance,R=d.getBoundedRatio(c.ratio/k);y.ratio=R,y.angle=c.angle+w;var P=this.getDimensions(),D=this.renderer.viewportToFramedGraph((this.startTouchesPositions||[])[0],{cameraState:c}),I=Math.min(P.width,P.height)-2*f,G=I/P.width,N=I/P.height,F=R/I,L=x-I/2/G,M=T-I/2/N,H=An({x:L,y:M},y.angle);L=H.x,M=H.y,y.x=D.x-L*F,y.y=D.y+M*F,d.setState(y);break}}}}}},{key:"setSettings",value:function(t){this.settings=t}}])})(ls),Dc=(function(){function a(n,e,t,r){K(this,a),S(this,"pendingNode",null),S(this,"session",null),this.graph=n,this.viewportToGraph=e,this.setNodesState=t,this.emit=r}return Z(a,[{key:"start",value:function(e,t,r,i,o){var s=r(e),l=!1;if(this.emit("nodeDragStart",{node:e,allDraggedNodes:s,event:t,preventSigmaDefault:function(){l=!0}}),l)return!1;var u=new Map,d=z(s),c;try{for(d.s();!(c=d.n()).done;){var f=c.value;u.set(f,{x:this.graph.getNodeAttribute(f,i),y:this.graph.getNodeAttribute(f,o)})}}catch(h){d.e(h)}finally{d.f()}return this.session={node:e,allNodes:s,startPosition:this.viewportToGraph(t),startNodePositions:u,xAttr:i,yAttr:o},this.setNodesState(s,{isDragged:!0}),!0}},{key:"applyMove",value:function(e,t){var r=this.session,i=r.allNodes,o=r.startNodePositions,s=r.startPosition,l=r.xAttr,u=r.yAttr,d=this.viewportToGraph(e),c={x:d.x-s.x,y:d.y-s.y},f=z(i),h;try{for(f.s();!(h=f.n()).done;){var p=h.value,b=o.get(p);if(!(!b||!this.graph.hasNode(p))){var v={x:b.x+c.x,y:b.y+c.y};t?this.graph.mergeNodeAttributes(p,t(v,p)):(this.graph.setNodeAttribute(p,l,v.x),this.graph.setNodeAttribute(p,u,v.y))}}}catch(g){f.e(g)}finally{f.f()}}},{key:"end",value:function(){if(this.pendingNode=null,!this.session)return null;var e=this.session,t=e.node,r=e.allNodes;return this.setNodesState(r,{isDragged:!1}),this.session=null,{node:t,allNodes:r}}},{key:"removeNode",value:function(e){e===this.pendingNode&&(this.pendingNode=null),this.session&&(this.session.node===e?(this.setNodesState(this.session.allNodes,{isDragged:!1}),this.session=null):this.session.allNodes.includes(e)&&(this.session.allNodes=this.session.allNodes.filter(function(t){return t!==e}),this.session.startNodePositions.delete(e)))}},{key:"clear",value:function(){this.pendingNode=null,this.session=null}}])})();function qo(a,n){return a<n?"".concat(a,"\0").concat(n):"".concat(n,"\0").concat(a)}var Cc=(function(){function a(n,e){K(this,a),S(this,"groups",new Map),S(this,"edgeToGroupKey",new Map),this.graph=n,this.onGroupChanged=e}return Z(a,[{key:"getGroupKey",value:function(e){return qo(this.graph.source(e),this.graph.target(e))}},{key:"sortGroup",value:function(e,t){var r=this,i=t.split("\0")[0];e.sort(function(o,s){var l=r.graph.source(o)===i||!r.graph.isDirected(o)?0:1,u=r.graph.source(s)===i||!r.graph.isDirected(s)?0:1;return l-u})}},{key:"register",value:function(e){var t=this.getGroupKey(e),r=this.groups.get(t);r||(r=[],this.groups.set(t,r)),r.includes(e)||r.push(e),this.edgeToGroupKey.set(e,t),r.length>1&&this.sortGroup(r,t),this.onGroupChanged(r,r.length)}},{key:"unregister",value:function(e){var t=this.edgeToGroupKey.get(e);if(t){this.edgeToGroupKey.delete(e);var r=this.groups.get(t);if(r){var i=r.indexOf(e);i!==-1&&r.splice(i,1),r.length===0?this.groups.delete(t):this.onGroupChanged(r,r.length)}}}},{key:"getGroup",value:function(e){var t,r=this.edgeToGroupKey.get(e);return r?(t=this.groups.get(r))!==null&&t!==void 0?t:[]:[]}},{key:"getSiblings",value:function(e){return this.getGroup(e).filter(function(t){return t!==e})}},{key:"rebuild",value:function(){var e=this;this.groups.clear(),this.edgeToGroupKey.clear(),this.graph.forEachEdge(function(l,u,d,c){var f=qo(d,c),h=e.groups.get(f);h||(h=[],e.groups.set(f,h)),h.push(l),e.edgeToGroupKey.set(l,f)});var t=z(this.groups),r;try{for(t.s();!(r=t.n()).done;){var i=Q(r.value,2),o=i[0],s=i[1];s.length>1&&this.sortGroup(s,o),this.onGroupChanged(s,s.length)}}catch(l){t.e(l)}finally{t.f()}}},{key:"clear",value:function(){this.groups.clear(),this.edgeToGroupKey.clear()}}])})();function jo(a,n){var e;if(a===!1||a==="extend"||a==="separate")return a;var t=a[n];return t!==void 0?t:(e=a.default)!==null&&e!==void 0?e:!1}function Xo(a){return a===!1?!1:a==="extend"||a==="separate"?!0:Object.values(a).some(function(n){return n==="extend"||n==="separate"})}function Yo(a){return a==="separate"?!0:a===!1||a==="extend"?!1:a.default==="separate"?!0:Object.values(a).includes("separate")}var ue={node:{parent:null,eventSuffix:"Node",payloadKey:"node",isEnabled:function(){return!0},writesPickingThisFrame:function(){return!0},setHover:function(n,e,t){return n.setNodeState(e,{isHovered:t})},getCursor:function(n,e){var t;return(t=n.nodeDataCache[e])===null||t===void 0?void 0:t.cursor},isHitValid:function(n,e){var t;return((t=n.nodeDataCache[e])===null||t===void 0?void 0:t.visibility)!=="hidden"}},edge:{parent:null,eventSuffix:"Edge",payloadKey:"edge",isEnabled:function(n){return!!n.settings.enableEdgeEvents},writesPickingThisFrame:function(n){return!!n.settings.enableEdgeEvents},setHover:function(n,e,t){return n.setEdgeState(e,{isHovered:t})},getCursor:function(n,e){var t;return(t=n.edgeDataCache[e])===null||t===void 0?void 0:t.cursor}},nodeLabel:{parent:"node",eventSuffix:"NodeLabel",payloadKey:"node",isEnabled:function(n){return Yo(n.settings.nodeLabelEvents)},writesPickingThisFrame:function(n){return Xo(n.settings.nodeLabelEvents)},setHover:function(n,e,t){return n.setNodeState(e,{isLabelHovered:t})},getCursor:function(n,e){var t;return(t=n.nodeDataCache[e])===null||t===void 0?void 0:t.labelCursor},resolveForVerb:function(n,e,t){var r=jo(t.settings.nodeLabelEvents,e);return r===!1?null:r==="extend"?{kind:"node",key:n.key}:n}},edgeLabel:{parent:"edge",eventSuffix:"EdgeLabel",payloadKey:"edge",isEnabled:function(n){return Yo(n.settings.edgeLabelEvents)},writesPickingThisFrame:function(n){return Xo(n.settings.edgeLabelEvents)},setHover:function(n,e,t){return n.setEdgeState(e,{isLabelHovered:t})},getCursor:function(n,e){var t;return(t=n.edgeDataCache[e])===null||t===void 0?void 0:t.labelCursor},resolveForVerb:function(n,e,t){var r=jo(t.settings.edgeLabelEvents,e);return r===!1?null:r==="extend"?{kind:"edge",key:n.key}:n}}},it=["node","edge","nodeLabel","edgeLabel"];function Lc(){return{lookup:[null],idsByKind:{node:new Map,edge:new Map,nodeLabel:new Map,edgeLabel:new Map},nextId:1}}function rt(a,n,e){var t;return(t=a.idsByKind[n].get(e))!==null&&t!==void 0?t:0}function oa(a,n){var e=z(it),t;try{for(e.s();!(t=e.n()).done;){var r=t.value;if(r===n||ue[r].parent===n){var i=z(a.idsByKind[r].values()),o;try{for(i.s();!(o=i.n()).done;){var s=o.value;a.lookup[s]=null}}catch(f){i.e(f)}finally{i.f()}a.idsByKind[r]=new Map}}}catch(f){e.e(f)}finally{e.f()}var l=1,u=z(it),d;try{for(u.s();!(d=u.n()).done;){var c=d.value;if(c===n)break;l+=a.idsByKind[c].size}}catch(f){u.e(f)}finally{u.f()}a.nextId=l}function Ko(a,n,e){var t=a.nextId++;return a.idsByKind[n].set(e,t),a.lookup[t]={kind:n,key:e},t}function Zo(a,n,e){for(var t=0,r=ua(n);t<r.length;t++){var i=r[t],o=a.idsByKind[i].get(e);o!==void 0&&(a.lookup[o]=null,a.idsByKind[i].delete(e))}}function Pc(a,n){var e=z(it),t;try{for(e.s();!(t=e.n()).done;){var r=t.value;if(ue[r].parent!==null){var i=z(a.idsByKind[r].values()),o;try{for(i.s();!(o=i.n()).done;){var s=o.value;a.lookup[s]=null}}catch(x){i.e(x)}finally{i.f()}a.idsByKind[r]=new Map}}}catch(x){e.e(x)}finally{e.f()}a.nextId=1;var l=z(it),u;try{for(l.s();!(u=l.n()).done;){var d=u.value;if(ue[d].parent===null){var c=z(a.idsByKind[d].values()),f;try{for(c.s();!(f=c.n()).done;){var h=f.value;h>=a.nextId&&(a.nextId=h+1)}}catch(x){c.e(x)}finally{c.f()}}}}catch(x){l.e(x)}finally{l.f()}var p=z(it),b;try{for(p.s();!(b=p.n()).done;){var v=b.value,g=ue[v];if(!(g.parent===null||!g.isEnabled(n))){var m=z(a.idsByKind[g.parent].keys()),y;try{for(m.s();!(y=m.n()).done;){var _=y.value;a.idsByKind[v].set(_,a.nextId),a.lookup[a.nextId]={kind:v,key:_},a.nextId++}}catch(x){m.e(x)}finally{m.f()}}}}catch(x){p.e(x)}finally{p.f()}}function kc(a,n){var e=z(it),t;try{for(e.s();!(t=e.n()).done;){var r=t.value,i=a[r],o=n[r];if(i!==o){if(i.size!==o.size)return!1;var s=z(i),l;try{for(s.s();!(l=s.n()).done;){var u=Q(l.value,2),d=u[0],c=u[1];if(o.get(d)!==c)return!1}}catch(f){s.e(f)}finally{s.f()}}}}catch(f){e.e(f)}finally{e.f()}return!0}function Qo(a,n,e){ue[n.kind].setHover(a,n.key,e)}function Fc(a,n){return ue[n.kind].getCursor(a,n.key)}function rn(a,n){return"".concat(n).concat(ue[a].eventSuffix)}function on(a,n){return B(B({},n),{},S({},ue[a.kind].payloadKey,a.key))}function Ic(a,n,e){var t=ue[n.kind].resolveForVerb;return t?t(n,e,a):n}function Nc(a,n){var e=ue[n.kind].isHitValid;return e?e(a,n.key):!0}function ua(a){return it.filter(function(n){return n===a||ue[n].parent===a})}function us(a,n,e){return n&&(n=Ic(a,n,e)),n&&!Nc(a,n)&&(n=null),n}function Tr(a,n,e){var t=e==="wheel"?a.stateManager.hovered:a.getHitAtPosition(n);return us(a,t,e)}function Gc(a,n){return!a||!n?a===n:a.kind===n.kind&&a.key===n.key}function ds(a,n,e){var t={event:e,preventSigmaDefault:function(){return e.preventSigmaDefault()}},r=a.dragManager.session,i=r?{kind:"node",key:r.node}:us(a,n,"enter"),o=a.stateManager,s=o.hovered;Gc(s,i)||(s&&(Qo(a,s,!1),a.emit(rn(s.kind,"leave"),on(s,t))),o.setHovered(i),i&&(Qo(a,i,!0),a.emit(rn(i.kind,"enter"),on(i,t))),a.updateContainerCursor())}function Mc(a,n,e,t){t.handleResize=function(){return a.scheduleRefresh()},window.addEventListener("resize",t.handleResize),t.handleMove=function(i){a.hoverResolver.pointerMoved(nt(i))},t.handleMoveBody=function(i){var o=nt(i),s=a.dragManager;if(s.pendingNode&&!s.session){var l=a.nodeStyleAnalysis,u=l.xAttribute,d=l.yAttribute,c=a.settings;s.start(s.pendingNode,o,c.getDraggedNodes,u||"x",d||"y"),s.pendingNode=null}s.session&&(s.applyMove(o,a.settings.dragPositionToAttributes),a.emit("nodeDrag",{node:s.session.node,allDraggedNodes:s.session.allNodes,event:o}),o.preventSigmaDefault()),a.emit("moveBody",{event:o,preventSigmaDefault:function(){return o.preventSigmaDefault()}})},t.handleLeave=function(i){var o=nt(i),s={event:o,preventSigmaDefault:function(){return o.preventSigmaDefault()}};a.hoverResolver.pointerLeft(),ds(a,null,o),a.emit("leaveStage",s)},t.handleEnter=function(i){var o=nt(i);a.emit("enterStage",{event:o,preventSigmaDefault:function(){return o.preventSigmaDefault()}})};var r=function(o){return function(s){var l=nt(s),u={event:l,preventSigmaDefault:function(){return l.preventSigmaDefault()}},d=Tr(a,l,o);if(d){a.emit(rn(d.kind,o),on(d,u));return}a.emit("".concat(o,"Stage"),u)}};t.handleClick=r("click"),t.handleRightClick=r("rightClick"),t.handleDoubleClick=r("doubleClick"),t.handleWheel=r("wheel"),t.handleDown=function(i){var o=nt(i),s={event:o,preventSigmaDefault:function(){return o.preventSigmaDefault()}},l=Tr(a,o,"down");if(l){l.kind==="node"&&a.settings.enableNodeDrag&&(a.dragManager.pendingNode=l.key),a.emit(rn(l.kind,"down"),on(l,s));return}a.emit("downStage",s)},t.handleUp=function(i){var o=nt(i),s={event:o,preventSigmaDefault:function(){return o.preventSigmaDefault()}},l=a.dragManager.end();l&&a.emit("nodeDragEnd",B({node:l.node,allDraggedNodes:l.allNodes},s));var u=Tr(a,o,"up");if(u){a.emit(rn(u.kind,"up"),on(u,s));return}a.emit("upStage",s)},n.on("mousemove",t.handleMove),n.on("mousemovebody",t.handleMoveBody),n.on("click",t.handleClick),n.on("rightClick",t.handleRightClick),n.on("doubleClick",t.handleDoubleClick),n.on("wheel",t.handleWheel),n.on("mousedown",t.handleDown),n.on("mouseup",t.handleUp),n.on("mouseleave",t.handleLeave),n.on("mouseenter",t.handleEnter),e.on("touchdown",t.handleDown),e.on("touchdown",t.handleMove),e.on("touchup",t.handleUp),e.on("touchmove",t.handleMove),e.on("tap",t.handleClick),e.on("doubletap",t.handleDoubleClick),e.on("touchmove",t.handleMoveBody)}function zc(a,n){var e=a.graph,t=new Set(["x","y","zIndex","type"]);n.eachNodeAttributesUpdatedGraphUpdate=function(r){var i,o=(i=r.hints)===null||i===void 0?void 0:i.attributes,s=!o||o.some(function(l){return t.has(l)});a.refresh({partialGraph:{nodes:e.nodes()},skipIndexation:!s,schedule:!0})},n.eachEdgeAttributesUpdatedGraphUpdate=function(r){var i,o=(i=r.hints)===null||i===void 0?void 0:i.attributes,s=o&&["zIndex","type"].some(function(l){return o?.includes(l)});a.refresh({partialGraph:{edges:e.edges()},skipIndexation:!s,schedule:!0})},n.addNodeGraphUpdate=function(r){a.refresh({partialGraph:{nodes:[r.key]},skipIndexation:!1,schedule:!0})},n.updateNodeGraphUpdate=function(r){a.refresh({partialGraph:{nodes:[r.key]},skipIndexation:!1,schedule:!0})},n.dropNodeGraphUpdate=function(r){a.removeNode(r.key),a.scheduleProcess()},n.addEdgeGraphUpdate=function(r){var i=r.key;a.markNodesDirty([r.source,r.target]),a.edgeGroups.register(i);var o=a.edgeGroups.getSiblings(i);a.refresh({partialGraph:{edges:[i].concat($(o))},schedule:!0})},n.updateEdgeGraphUpdate=function(r){a.refresh({partialGraph:{edges:[r.key]},skipIndexation:!1,schedule:!0})},n.dropEdgeGraphUpdate=function(r){var i=r.key;a.markNodesDirty([r.source,r.target]);var o=a.edgeGroups.getSiblings(i);a.edgeGroups.unregister(i),a.removeEdge(i);var s=z(o),l;try{for(s.s();!(l=s.n()).done;){var u=l.value;a.addEdge(u)}}catch(d){s.e(d)}finally{s.f()}a.scheduleProcess()},n.clearEdgesGraphUpdate=function(){a.clearEdgeState(),a.clearEdgeIndices(),a.refresh({schedule:!0})},n.clearGraphUpdate=function(){a.clearEdgeState(),a.clearNodeState(),a.clearEdgeIndices(),a.clearNodeIndices(),a.refresh({schedule:!0})},e.on("nodeAdded",n.addNodeGraphUpdate),e.on("nodeDropped",n.dropNodeGraphUpdate),e.on("nodeAttributesUpdated",n.updateNodeGraphUpdate),e.on("eachNodeAttributesUpdated",n.eachNodeAttributesUpdatedGraphUpdate),e.on("edgeAdded",n.addEdgeGraphUpdate),e.on("edgeDropped",n.dropEdgeGraphUpdate),e.on("edgeAttributesUpdated",n.updateEdgeGraphUpdate),e.on("eachEdgeAttributesUpdated",n.eachEdgeAttributesUpdatedGraphUpdate),e.on("edgesCleared",n.clearEdgesGraphUpdate),e.on("cleared",n.clearGraphUpdate)}function Bc(a,n){a.removeListener("nodeAdded",n.addNodeGraphUpdate),a.removeListener("nodeDropped",n.dropNodeGraphUpdate),a.removeListener("nodeAttributesUpdated",n.updateNodeGraphUpdate),a.removeListener("eachNodeAttributesUpdated",n.eachNodeAttributesUpdatedGraphUpdate),a.removeListener("edgeAdded",n.addEdgeGraphUpdate),a.removeListener("edgeDropped",n.dropEdgeGraphUpdate),a.removeListener("edgeAttributesUpdated",n.updateEdgeGraphUpdate),a.removeListener("eachEdgeAttributesUpdated",n.eachEdgeAttributesUpdatedGraphUpdate),a.removeListener("edgesCleared",n.clearEdgesGraphUpdate),a.removeListener("cleared",n.clearGraphUpdate)}var Oc={x:.5,y:.5,angle:0,ratio:1},Wc=8,Uc=.001;function Hc(a){var n=a.coords,e=a.nodeData,t=a.dimensions,r=a.stagePadding,i=a.zoomToSizeRatioFunction,o=a.itemSizesReference,s=a.fitLabels,l=a.nodeLabelBox,u=Object.keys(n);if(!u.length)return a.extent;for(var d=i(1)||1,c=o==="positions",f=t.width,h=t.height,p=a.extent,b=0;b<Wc;b++){for(var v=zn(p),g={width:p.x[1]-p.x[0]||1,height:p.y[1]-p.y[0]||1},m=Fe(Oc,t,g,r),y=Jo(m,v({x:0,y:0}),f,h),_=Jo(m,v({x:1,y:0}),f,h),x=Math.hypot(_.x-y.x,_.y-y.y)||1,T=1/0,E=-1/0,A=1/0,C=-1/0,w=0,k=u.length;w<k;w++){var R=u[w],P=e[R],D=P.size/d*(c?x:1),I=-D,G=D,N=-D,F=D;if(s){var L=l(P,D);L&&(L.minX<I&&(I=L.minX),L.maxX>G&&(G=L.maxX),L.minY<N&&(N=L.minY),L.maxY>F&&(F=L.maxY))}var M=n[R],H=M.x,U=M.y;T=Math.min(T,H+I/x),E=Math.max(E,H+G/x),A=Math.min(A,U-F/x),C=Math.max(C,U-N/x)}var X={x:[T,E],y:[A,C]},q=Math.max(X.x[1]-X.x[0],X.y[1]-X.y[0])||1,j=Math.max(Math.abs(X.x[0]-p.x[0]),Math.abs(X.x[1]-p.x[1]),Math.abs(X.y[0]-p.y[0]),Math.abs(X.y[1]-p.y[1]));if(p=X,j/q<Uc)break}return p}function Jo(a,n,e,t){var r=Xe(a,n);return{x:(1+r.x)*e/2,y:(1-r.y)*t/2}}var $c=typeof navigator<"u"&&/Mac|iP(hone|ad|od)/.test(navigator.platform),Vc=1500,qc=`.sigma-gesture-hint {
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
}`;function es(a){var n,e,t=_t("style");t.textContent=a,document.head.appendChild(t);var r=((n=(e=t.sheet)===null||e===void 0?void 0:e.cssRules.length)!==null&&n!==void 0?n:0)>0;return t.remove(),r}var at=null;function jc(){return at===null&&(at=qc,es("@scope {}")&&(at=`@scope {
`.concat(at,`
}`)),es("@layer sigma-gesture-hint {}")&&(at=`@layer sigma-gesture-hint {
`.concat(at,`
}`))),at}var Xc=(function(){function a(n){K(this,a),S(this,"hideTimeout",null),this.styleElement=_t("style"),this.styleElement.textContent=jc(),n.appendChild(this.styleElement),this.element=_t("div",{opacity:"0"},{class:"sigma-gesture-hint"}),n.appendChild(this.element)}return Z(a,[{key:"show",value:function(e,t){var r=this,i=e==="touch"?t.sharedGestureTouchMessage:$c?t.sharedGestureAppleWheelMessage:t.sharedGestureWheelMessage;i&&(this.element.textContent=i,this.element.style.opacity="1",typeof this.hideTimeout=="number"&&clearTimeout(this.hideTimeout),this.hideTimeout=window.setTimeout(function(){r.hideTimeout=null,r.element.style.opacity="0"},Vc))}},{key:"kill",value:function(){typeof this.hideTimeout=="number"&&clearTimeout(this.hideTimeout),this.styleElement.remove(),this.element.remove()}}])})(),Yc=(function(){function a(n){K(this,a),S(this,"readBuffer",null),S(this,"fence",null),S(this,"result",new Uint8Array(4)),S(this,"generation",0),S(this,"readGeneration",0),S(this,"lastEvent",null),S(this,"active",!1),S(this,"dirty",!1),S(this,"rafId",null),S(this,"killed",!1),this.options=n}return Z(a,[{key:"pointerMoved",value:function(e){this.lastEvent=e,this.active=!0,!this.options.isRenderPending()&&this.request()}},{key:"pointerLeft",value:function(){this.active=!1,this.dirty=!1}},{key:"frameRendered",value:function(){this.request()}},{key:"invalidate",value:function(){this.generation++}},{key:"request",value:function(){if(!(this.killed||!this.active||!this.lastEvent)){if(this.fence){this.dirty=!0;return}this.startRead()}}},{key:"startRead",value:function(){var e=this.options,t=e.gl,r=e.getFrameBuffer,i=e.getPixelRatio,o=e.getDownSizingRatio;this.readGeneration=this.generation;var s=this.lastEvent,l=Rn(t,s.x,s.y,i(),o()),u=Q(l,2),d=u[0],c=u[1];this.readBuffer||(this.readBuffer=t.createBuffer()),t.bindFramebuffer(t.FRAMEBUFFER,r()),t.bindBuffer(t.PIXEL_PACK_BUFFER,this.readBuffer),t.bufferData(t.PIXEL_PACK_BUFFER,4,t.STREAM_READ),t.readPixels(d,c,1,1,t.RGBA,t.UNSIGNED_BYTE,0),t.bindBuffer(t.PIXEL_PACK_BUFFER,null),t.bindFramebuffer(t.FRAMEBUFFER,null),this.fence=t.fenceSync(t.SYNC_GPU_COMMANDS_COMPLETE,0),t.flush(),this.schedulePoll(s)}},{key:"schedulePoll",value:function(e){var t=this;this.rafId=requestAnimationFrame(function(){t.rafId=null,t.poll(e)})}},{key:"poll",value:function(e){var t=this.options,r=t.gl,i=t.onIndex;if(!(this.killed||!this.fence)){var o=r.clientWaitSync(this.fence,0,0);if(o===r.TIMEOUT_EXPIRED){this.schedulePoll(e);return}if(r.deleteSync(this.fence),this.fence=null,o!==r.WAIT_FAILED&&this.readGeneration===this.generation){r.bindBuffer(r.PIXEL_PACK_BUFFER,this.readBuffer),r.getBufferSubData(r.PIXEL_PACK_BUFFER,0,this.result),r.bindBuffer(r.PIXEL_PACK_BUFFER,null);var s=Q(this.result,4),l=s[0],u=s[1],d=s[2],c=s[3];this.active&&i(wn(l,u,d,c),e)}this.dirty&&(this.dirty=!1,this.active&&this.lastEvent&&!this.options.isRenderPending()&&this.startRead())}}},{key:"reset",value:function(){this.rafId!==null&&cancelAnimationFrame(this.rafId),this.rafId=null,this.fence=null,this.readBuffer=null,this.dirty=!1}},{key:"kill",value:function(){this.killed=!0,this.rafId!==null&&cancelAnimationFrame(this.rafId),this.rafId=null;var e=this.options.gl;this.fence&&e.deleteSync(this.fence),this.fence=null,this.readBuffer&&e.deleteBuffer(this.readBuffer),this.readBuffer=null}}])})(),ts=(function(){function a(n,e){K(this,a),this.key=n,this.size=e}return Z(a,null,[{key:"compare",value:function(e,t){return e.size>t.size?-1:e.size<t.size||e.key>t.key?1:-1}}])})(),sa=(function(){function a(){K(this,a),S(this,"width",0),S(this,"height",0),S(this,"cellSize",0),S(this,"columns",0),S(this,"rows",0),S(this,"cells",{})}return Z(a,[{key:"resizeAndClear",value:function(e,t){this.width=e.width,this.height=e.height,this.cellSize=t,this.columns=Math.ceil(e.width/t),this.rows=Math.ceil(e.height/t),this.cells={}}},{key:"getIndex",value:function(e){var t=Math.floor(e.x/this.cellSize),r=Math.floor(e.y/this.cellSize);return r*this.columns+t}},{key:"add",value:function(e,t,r){var i=new ts(e,t),o=this.getIndex(r),s=this.cells[o];s||(s=[],this.cells[o]=s),s.push(i)}},{key:"organize",value:function(){for(var e in this.cells){var t=this.cells[e];t.sort(ts.compare)}}},{key:"getLabelsToDisplay",value:function(e,t,r){var i=this.cellSize*this.cellSize,o=i/e/e,s=o*t/i,l=Math.ceil(s),u=[];if(r)for(var d=Math.max(0,Math.floor(r.x1/this.cellSize)),c=Math.min(this.columns-1,Math.floor(r.x2/this.cellSize)),f=Math.max(0,Math.floor(r.y1/this.cellSize)),h=Math.min(this.rows-1,Math.floor(r.y2/this.cellSize)),p=f;p<=h;p++)for(var b=d;b<=c;b++){var v=p*this.columns+b,g=this.cells[v];if(g)for(var m=0;m<Math.min(l,g.length);m++)u.push(g[m].key)}else for(var y in this.cells)for(var _=this.cells[y],x=0;x<Math.min(l,_.length);x++)u.push(_[x].key);return u}}])})();function Kc(a){var n=a.graph,e=a.hoveredNode,t=a.highlightedNodes,r=a.displayedNodeLabels,i=new Set,o=new Set(t);e&&o.add(e);var s=z(o),l;try{for(s.s();!(l=s.n()).done;){var u=l.value;n.hasNode(u)&&n.forEachEdge(u,function(h){i.add(h)})}}catch(h){s.e(h)}finally{s.f()}var d=z(r),c;try{var f=function(){var p=c.value;if(o.has(p))return 1;n.forEachEdge(p,function(b,v,g,m){var y=g===p?m:g;r.has(y)&&i.add(b)})};for(d.s();!(c=d.n()).done;)f()}catch(h){d.e(h)}finally{d.f()}return Array.from(i)}var Ct=150,Lt=50,Zc={both:0,node:1,label:2},Qc={over:0,above:1,below:2,auto:3},ns=12,Jc=3,eh=(function(){function a(n){K(this,a),S(this,"labelGrid",new sa),S(this,"edgeAnchorGrid",new sa),S(this,"displayedNodeLabels",new Set),S(this,"displayedEdgeLabels",new Set),S(this,"edgeLabelCandidates",[]),S(this,"renderedNodeLabels",new Set),S(this,"labelSizeCache",new Map),S(this,"framePassPoints",new Float32Array(0)),S(this,"labelsDirty",!0),this.internals=n}return Z(a,[{key:"resetFrame",value:function(){this.displayedNodeLabels=new Set,this.renderedNodeLabels=new Set,this.labelSizeCache.clear()}},{key:"clearEdgeLabels",value:function(){this.displayedEdgeLabels=new Set}},{key:"resetLabelGrid",value:function(){this.labelGrid=new sa,this.edgeAnchorGrid=new sa}},{key:"processWebGLLabels",value:function(e){for(var t,r=this.internals,i=r.labelProgram,o=r.primitives,s=r.nodeDataCache,l=(o==null||(t=o.nodes)===null||t===void 0||(t=t.label)===null||t===void 0||(t=t.font)===null||t===void 0?void 0:t.family)||"sans-serif",u=new Map,d=0,c=e.length;d<c;d++){var f=e[d],h=s[f];if(!(h.visibility==="hidden"||!h.label)){var p=h.labelFont||l,b=u.get(p);b?b.push(h.label):u.set(p,[h.label])}}var v=z(u),g;try{for(v.s();!(g=v.n()).done;){var m=Q(g.value,2),y=m[0],_=m[1],x=Wn(y),T=x.family,E=x.weight,A=x.style,C=i.registerFont(T,E,A);i.ensureGlyphsReady(_,C)}}catch(w){v.e(w)}finally{v.f()}}},{key:"measureNodeLabel",value:function(e){var t,r;if(!e.label)return{width:0,height:0,textHeight:0};var i=this.internals,o=i.labelProgram,s=i.primitives,l=(t=e.labelSize)!==null&&t!==void 0?t:14,u=e.labelFont||(s==null||(r=s.nodes)===null||r===void 0||(r=r.label)===null||r===void 0||(r=r.font)===null||r===void 0?void 0:r.family)||"sans-serif",d="".concat(e.label,"|").concat(l,"|").concat(u);if(this.labelSizeCache.has(d))return this.labelSizeCache.get(d);var c=Wn(u),f=c.family,h=c.weight,p=c.style,b=o.registerFont(f,h,p),v=o.measureLabel(e.label,l,b);return this.labelSizeCache.set(d,v),v}},{key:"nodeLabelBox",value:function(e,t){var r,i,o,s,l;if(e.visibility==="hidden"||e.labelVisibility==="hidden")return null;var u=this.measureNodeLabel(e),d=u.width,c=u.height,f=u.textHeight;if(!d)return null;var h=(r=(i=this.internals.primitives)===null||i===void 0||(i=i.nodes)===null||i===void 0||(i=i.label)===null||i===void 0?void 0:i.margin)!==null&&r!==void 0?r:et,p=t+h,b=e.labelBackgroundColor?(o=e.labelBackgroundPadding)!==null&&o!==void 0?o:Jn:0,v=d/2,g=c/2,m=v+b,y=g+b,_=f/2,x=0,T=0;switch((s=e.labelPosition)!==null&&s!==void 0?s:"right"){case"left":x=-(p+v);break;case"above":T=-(p+_);break;case"below":T=p+_;break;case"over":break;default:x=p+v}var E=(l=e.labelAngle)!==null&&l!==void 0?l:0,A=An({x,y:T},E),C=A.x,w=A.y,k=Math.abs(Math.cos(E)),R=Math.abs(Math.sin(E)),P=k*m+R*y,D=R*m+k*y;return{minX:C-P,maxX:C+P,minY:w-D,maxY:w+D}}},{key:"computeDisplayedNodeLabels",value:function(){var e=this.internals.getCameraState(),t=this.internals.getDimensions(),r=t.width,i=t.height,o=this.internals.viewportToFramedGraph({x:-Ct,y:-Lt}),s=this.internals.viewportToFramedGraph({x:r+Ct,y:-Lt}),l=this.internals.viewportToFramedGraph({x:-Ct,y:i+Lt}),u=this.internals.viewportToFramedGraph({x:r+Ct,y:i+Lt}),d=Math.min(o.x,s.x,l.x,u.x),c=Math.max(o.x,s.x,l.x,u.x),f=Math.min(o.y,s.y,l.y,u.y),h=Math.max(o.y,s.y,l.y,u.y),p=Fe({x:.5,y:.5,ratio:1,angle:0},{width:r,height:i},this.internals.getGraphDimensions(),this.internals.getStagePadding()),b=function(L){var M=Xe(p,L);return{x:(1+M.x)*r/2,y:(1-M.y)*i/2}},v=b({x:d,y:f}),g=b({x:c,y:f}),m=b({x:d,y:h}),y=b({x:c,y:h}),_={x1:Math.min(v.x,g.x,m.x,y.x),y1:Math.min(v.y,g.y,m.y,y.y),x2:Math.max(v.x,g.x,m.x,y.x),y2:Math.max(v.y,g.y,m.y,y.y)},x=this.internals,T=x.settings,E=x.nodeDataCache,A=x.nodesWithForcedLabels,C=this.labelGrid.getLabelsToDisplay(e.ratio,T.labelDensity,_);Ka(C,A);for(var w=0,k=C.length;w<k;w++){var R=C[w],P=E[R];if(!this.displayedNodeLabels.has(R)&&!(P.visibility==="hidden"||P.labelVisibility==="hidden")&&P.label&&!(P.x<d||P.x>c||P.y<f||P.y>h)){var D=this.internals.framedGraphToViewport(P),I=D.x,G=D.y,N=this.internals.scaleSize(P.size);!Be(P)&&N<T.labelRenderedSizeThreshold||I<-Ct-N||I>r+Ct+N||G<-Lt-N||G>i+Lt+N||this.displayedNodeLabels.add(R)}}}},{key:"buildFramePassPoints",value:function(){var e=this.internals,t=e.nodeDataCache,r=e.nodeDataTexture;if(!r)return{data:this.framePassPoints,count:0};var i=this.displayedNodeLabels.size*3;this.framePassPoints.length<i&&(this.framePassPoints=new Float32Array(i));var o=this.framePassPoints,s=0,l=z(this.displayedNodeLabels),u;try{for(l.s();!(u=l.n()).done;){var d,c,f=u.value,h=t[f];if(h){var p=r.getIndex(f);p<0||(o[s*3]=p,o[s*3+1]=(d=Je[h.labelPosition||Ne.labelPosition])!==null&&d!==void 0?d:0,o[s*3+2]=(c=h.labelAngle)!==null&&c!==void 0?c:0,s++)}}}catch(b){l.e(b)}finally{l.f()}return{data:o,count:s}}},{key:"renderWebGLLabels",value:function(e,t){var r=this.internals,i=r.nodeDataCache,o=r.labelProgram,s=r.primitives,l=r.nodeDataTexture,u=[],d=z(this.displayedNodeLabels),c;try{for(d.s();!(c=d.n()).done;){var f=c.value;if(!this.renderedNodeLabels.has(f)){var h=i[f];t&&h.labelDepth!==t||(this.renderedNodeLabels.add(f),u.push(f))}}}catch(de){d.e(de)}finally{d.f()}if(u.length!==0){if(this.labelsDirty){for(var p,b,v,g=0,m=0,y=u.length;m<y;m++){var _=i[u[m]];g+=_.label.length}o.reallocate(g);for(var x=14,T=(p=s==null||(b=s.nodes)===null||b===void 0||(b=b.label)===null||b===void 0?void 0:b.margin)!==null&&p!==void 0?p:et,E=Ne.labelPosition,A=(s==null||(v=s.nodes)===null||v===void 0||(v=v.label)===null||v===void 0||(v=v.font)===null||v===void 0?void 0:v.family)||"sans-serif",C=new Map,w=0,k=0,R=u.length;k<R;k++){var P,D,I,G,N=u[k],F=i[N],L=F.labelFont||A,M=C.get(L);if(M===void 0){var H=Wn(L),U=H.family,X=H.weight,q=H.style;M=o.registerFont(U,X,q),C.set(L,M)}var j={text:F.label,x:F.x,y:F.y,size:(P=F.labelSize)!==null&&P!==void 0?P:x,color:F.labelColor,nodeSize:F.size,margin:T,position:(D=F.labelPosition)!==null&&D!==void 0?D:E,hidden:!1,forceLabel:Be(F),type:"default",zIndex:(I=F.zIndex)!==null&&I!==void 0?I:0,parentType:"node",parentKey:N,fontKey:M,labelAngle:(G=F.labelAngle)!==null&&G!==void 0?G:0,nodeIndex:l.getIndex(N)},xe=o.processLabel(N,w,j);w+=xe}o.invalidateBuffers()}o.render(e)}}},{key:"renderBackdrops",value:function(e,t){var r=this.internals,i=r.backdropProgram,o=r.nodeDataCache,s=r.nodesWithBackdrop,l=r.attachmentManager,u=r.pixelRatio,d=r.nodeDataTexture,c=[],f=z(s),h;try{for(f.s();!(h=f.n()).done;){var p,b=h.value,v=o[b];if(!(!v||v.visibility==="hidden")&&!(t&&v.depth!==t)){var g=(p=d?.getIndex(b))!==null&&p!==void 0?p:-1;g<0||c.push({key:b,nodeIndex:g})}}}catch(qe){f.e(qe)}finally{f.f()}if(c.length!==0){i.reallocate(c.length);for(var m=0;m<c.length;m++){var y,_,x,T,E,A,C,w,k=c[m],R=k.key,P=k.nodeIndex,D=o[R],I=this.displayedNodeLabels.has(R),G=I?this.measureNodeLabel(D):{width:0,height:0,textHeight:0},N=G.textHeight,F=G.width,L=G.height,M=0,H=0;if(I&&D.labelAttachment&&l){var U=l.getEntry(R,D.labelAttachment);if(U){var X=D.labelAttachmentPlacement||"below";if(X==="below"||X==="above"){var q=U.height/u;L+=q+$e,F=Math.max(F,U.width/u),H=X==="below"?(q+$e)/2:-(q+$e)/2}else{var j=U.width/u;F+=j+$e,L=Math.max(L,U.height/u),M=X==="right"?(j+$e)/2:-(j+$e)/2}}}var xe=D.backdropColor?Ie(D.backdropColor):[255,255,255,255],de=D.backdropShadowColor?Ie(D.backdropShadowColor):[0,0,0,128],De=xe.map(function(qe){return qe/255}),ut=de.map(function(qe){return qe/255}),Ft=(y=D.backdropShadowBlur)!==null&&y!==void 0?y:12,It=(_=D.backdropPadding)!==null&&_!==void 0?_:6,Nt=D.backdropBorderColor?Ie(D.backdropBorderColor):[0,0,0,0],Hs=Nt.map(function(qe){return qe/255}),$s=(x=D.backdropBorderWidth)!==null&&x!==void 0?x:0,Vs=(T=D.backdropCornerRadius)!==null&&T!==void 0?T:0,Nr=(E=D.backdropLabelPadding)!==null&&E!==void 0?E:-1,qs=Nr<0?It:Nr,js=(A=Zc[(C=D.backdropArea)!==null&&C!==void 0?C:"both"])!==null&&A!==void 0?A:0,Xs={key:R,nodeIndex:P,label:D.label,labelWidth:F,labelHeight:L,textHeight:N,type:"default",position:D.labelPosition||Ne.labelPosition,labelAngle:(w=D.labelAngle)!==null&&w!==void 0?w:0,backdropColor:De,backdropShadowColor:ut,backdropShadowBlur:Ft,backdropPadding:It,backdropBorderColor:Hs,backdropBorderWidth:$s,backdropCornerRadius:Vs,backdropLabelPadding:qs,backdropArea:js,labelBoxOffset:[M,H]};i.processBackdrop(m,Xs)}i.invalidateBuffers(),i.render(e)}}},{key:"renderLabelBackgrounds",value:function(e,t){var r=this.internals,i=r.labelBackgroundProgram,o=r.nodeDataCache,s=r.nodeDataTexture,l=ue.nodeLabel.writesPickingThisFrame(this.internals),u=[],d=z(this.displayedNodeLabels),c;try{for(d.s();!(c=d.n()).done;){var f=c.value,h=o[f];!h||h.visibility==="hidden"||t&&h.labelDepth!==t||!l&&!h.labelBackgroundColor||u.push(f)}}catch(P){d.e(P)}finally{d.f()}if(u.length!==0){i.reallocate(u.length);for(var p=0;p<u.length;p++){var b,v,g,m,y=u[p],_=o[y],x=(b=s?.getIndex(y))!==null&&b!==void 0?b:-1;if(!(x<0)){var T=this.measureNodeLabel(_),E=T.width,A=T.height,C=T.textHeight,w=rt(this.internals.pickingState,"nodeLabel",y)||rt(this.internals.pickingState,"node",y),k=_.labelBackgroundColor?he(_.labelBackgroundColor):he("transparent"),R={nodeIndex:x,id:Ye(w),color:k,labelWidth:E,labelHeight:A,textHeight:C,positionMode:(v=Je[_.labelPosition||Ne.labelPosition])!==null&&v!==void 0?v:0,labelAngle:(g=_.labelAngle)!==null&&g!==void 0?g:0,padding:(m=_.labelBackgroundPadding)!==null&&m!==void 0?m:Jn};i.processLabelBackground(p,R)}}i.invalidateBuffers(),i.render(e)}}},{key:"cacheAttachments",value:function(e){var t=this.internals,r=t.attachmentManager,i=t.pixelRatio,o=t.nodeDataCache,s=t.nodesWithBackdrop,l=t.graph;if(r){var u=z(s),d;try{for(u.s();!(d=u.n()).done;){var c=d.value;if(this.displayedNodeLabels.has(c)){var f=o[c];if(!(!f||f.visibility==="hidden")&&!(e&&f.depth!==e)&&f.labelAttachment){var h=l.getNodeAttributes(c),p=this.measureNodeLabel(f),b=p.width,v=p.height,g={node:c,attributes:h,pixelRatio:i,labelWidth:b,labelHeight:v};r.renderAttachment(c,f.labelAttachment,g)}}}}catch(m){u.e(m)}finally{u.f()}r.regenerateAtlas()}}},{key:"renderAttachments",value:function(e,t){var r=this.internals,i=r.attachmentManager,o=r.attachmentProgram,s=r.nodeDataCache,l=r.nodesWithBackdrop,u=r.pixelRatio,d=r.nodeDataTexture;if(!(!i||!o)){var c=0;o.reallocateAttachments(l.size);var f=z(l),h;try{for(f.s();!(h=f.n()).done;){var p,b,v,g,m=h.value;if(this.displayedNodeLabels.has(m)){var y=s[m];if(!(!y||y.visibility==="hidden")&&!(t&&y.labelDepth!==t)&&y.labelAttachment){var _=i.getEntry(m,y.labelAttachment);if(_){var x=(p=d?.getIndex(m))!==null&&p!==void 0?p:-1;if(!(x<0)){var T=this.measureNodeLabel(y),E=T.width,A=T.height,C=T.textHeight,w=(b=ro[y.labelAttachmentPlacement||"below"])!==null&&b!==void 0?b:0;o.processAttachment(c,{nodeIndex:x,atlasX:_.x,atlasY:_.y,atlasW:_.width,atlasH:_.height,attachWidth:_.width/u,attachHeight:_.height/u,positionMode:(v=Je[y.labelPosition||Ne.labelPosition])!==null&&v!==void 0?v:0,attachmentPlacement:w,labelWidth:E,labelHeight:A,textHeight:C,labelAngle:(g=y.labelAngle)!==null&&g!==void 0?g:0}),c++}}}}}}catch(k){f.e(k)}finally{f.f()}c!==0&&(o.reallocateAttachments(c),i.bindTexture(en),o.invalidateBuffers(),o.render(e))}}},{key:"computeDisplayedEdgeLabels",value:function(){var e=this.internals,t=e.graph,r=e.stateManager,i=e.settings,o=e.edgesWithForcedLabels,s=r.getHighlightedNodes(),l=i.edgeLabelAnchors==="allNodes"?new Set(this.edgeAnchorGrid.getLabelsToDisplay(this.internals.getCameraState().ratio,i.labelDensity)):this.displayedNodeLabels,u=r.hovered,d=Kc({graph:t,hoveredNode:u?.kind==="node"?u.key:null,displayedNodeLabels:l,highlightedNodes:s});Ka(d,o),this.edgeLabelCandidates=d,this.displayedEdgeLabels=new Set}},{key:"filterEdgeLabelsForDepth",value:function(e){for(var t=this.internals,r=t.graph,i=t.nodeDataCache,o=t.edgeDataCache,s=[],l=new Set,u=0,d=this.edgeLabelCandidates.length;u<d;u++){var c=this.edgeLabelCandidates[u];if(!l.has(c)){l.add(c);var f=r.extremities(c),h=i[f[0]],p=i[f[1]],b=o[c];!b||!h||!p||b.visibility==="hidden"||b.labelVisibility==="hidden"||h.visibility==="hidden"||p.visibility==="hidden"||e&&b.labelDepth!==e||b.label&&s.push(c)}}return s}},{key:"renderEdgeLabels",value:function(e,t){var r=this.internals,i=r.graph,o=r.nodeDataCache,s=r.edgeDataCache,l=r.primitives,u=r.edgeLabelProgram,d=r.nodeDataTexture,c=r.edgeDataTexture;if(u){var f=this.filterEdgeLabelsForDepth(t),h=z(f),p;try{for(h.s();!(p=h.n()).done;){var b=p.value;this.displayedEdgeLabels.add(b)}}catch(j){h.e(j)}finally{h.f()}if(f.length!==0){if(this.labelsDirty){var v,g,m=0,y=z(f),_;try{for(y.s();!(_=y.n()).done;){var x=_.value;m+=s[x].label.length}}catch(j){y.e(j)}finally{y.f()}u.reallocate(m);var T=(v=l==null||(g=l.edges)===null||g===void 0||(g=g.label)===null||g===void 0?void 0:g.margin)!==null&&v!==void 0?v:5,E="over",A=0,C=z(f),w;try{for(C.s();!(w=C.n()).done;){var k,R,P=w.value,D=i.extremities(P),I=D[0],G=D[1],N=o[I],F=o[G],L=s[P],M=d.getIndex(I),H=d.getIndex(G),U=c.getIndex(P),X={text:L.label,x:(N.x+F.x)/2,y:(N.y+F.y)/2,size:ns,color:L.labelColor,nodeSize:0,nodeIndex:-1,margin:T,position:(k=L.labelPosition)!==null&&k!==void 0?k:E,hidden:!1,forceLabel:Be(L),type:"default",zIndex:(R=L.zIndex)!==null&&R!==void 0?R:0,parentType:"edge",parentKey:P,fontKey:"",labelAngle:0,sourceX:N.x,sourceY:N.y,targetX:F.x,targetY:F.y,sourceSize:N.size,targetSize:F.size,sourceShape:N.shape||"circle",targetShape:F.shape||"circle",edgeSize:L.size,offset:0,edgeAttributes:L,sourceNodeIndex:M,targetNodeIndex:H,edgeIndex:U},q=u.processEdgeLabel(P,A,X);A+=q}}catch(j){C.e(j)}finally{C.f()}u.invalidateBuffers()}u.render(e)}}}},{key:"renderEdgeLabelBackgrounds",value:function(e,t){var r,i,o=this.internals,s=o.edgeLabelBackgroundProgram,l=o.edgeLabelProgram,u=o.edgeDataCache,d=o.primitives,c=o.edgeDataTexture;if(!(!c||!l||!s)){var f=ue.edgeLabel.writesPickingThisFrame(this.internals),h=(r=d==null||(i=d.edges)===null||i===void 0||(i=i.label)===null||i===void 0?void 0:i.margin)!==null&&r!==void 0?r:5,p="over",b=this.filterEdgeLabelsForDepth(t),v=[],g=z(b),m;try{for(g.s();!(m=g.n()).done;){var y=m.value;!f&&!u[y].labelBackgroundColor||v.push(y)}}catch(N){g.e(N)}finally{g.f()}if(v.length!==0){s.reallocate(v.length);for(var _=0;_<v.length;_++){var x,T,E,A=v[_],C=u[A],w=C.label,k=l.measureLabelAtlasWidth(w),R=(x=C.labelPosition)!==null&&x!==void 0?x:p,P=typeof R=="string"&&(T=Qc[R])!==null&&T!==void 0?T:0,D=rt(this.internals.pickingState,"edgeLabel",A)||rt(this.internals.pickingState,"edge",A),I=C.labelBackgroundColor?he(C.labelBackgroundColor):he("transparent"),G={edgeIndex:c.getIndex(A),baseFontSize:ns,totalTextWidth:k,positionMode:P,margin:h,padding:(E=C.labelBackgroundPadding)!==null&&E!==void 0?E:Jc,color:I,id:Ye(D),edgeAttributes:C};s.processEdgeLabelBackground(_,A,G)}s.invalidateBuffers(),s.render(e)}}}}])})(),th=(function(){function a(n,e,t,r){K(this,a),S(this,"nodeStates",new Map),S(this,"edgeStates",new Map),S(this,"hovered",null),S(this,"dirtyNodes",new Set),S(this,"dirtyEdges",new Set),S(this,"graphStateChanged",!1),S(this,"graphStateFlagsDirty",!1),this.scheduleRefresh=n,this.customNodeStateDefaults=e,this.customEdgeStateDefaults=t,this.customGraphStateDefaults=r,this.graphState=Ha(r)}return Z(a,[{key:"getNodeState",value:function(e){e=""+e;var t=this.nodeStates.get(e);return t||(t=Ai(this.customNodeStateDefaults),this.nodeStates.set(e,t)),t}},{key:"getEdgeState",value:function(e){e=""+e;var t=this.edgeStates.get(e);return t||(t=Ri(this.customEdgeStateDefaults),this.edgeStates.set(e,t)),t}},{key:"getGraphState",value:function(){return this.flushGraphStateFlags(),this.graphState}},{key:"getHighlightedNodes",value:function(){var e=new Set,t=z(this.nodeStates),r;try{for(t.s();!(r=t.n()).done;){var i=Q(r.value,2),o=i[0],s=i[1];s.isHighlighted&&e.add(o)}}catch(l){t.e(l)}finally{t.f()}return e}},{key:"setNodeState",value:function(e,t){e=""+e;var r=this.getNodeState(e);if(xt(r,t)){var i=B(B({},r),t);this.nodeStates.set(e,i),this.dirtyNodes.add(e),this.updateHoveredNodeTracking(e,r,i),this.graphStateFlagsDirty=!0,this.scheduleRefresh()}}},{key:"setEdgeState",value:function(e,t){e=""+e;var r=this.getEdgeState(e);if(xt(r,t)){var i=B(B({},r),t);this.edgeStates.set(e,i),this.dirtyEdges.add(e),this.updateHoveredEdgeTracking(e,r,i),this.graphStateFlagsDirty=!0,this.scheduleRefresh()}}},{key:"setGraphState",value:function(e){if(xt(this.graphState,e)){var t=B(B({},this.graphState),e);t.isIdle=!t.isPanning&&!t.isZooming&&!t.isDragging,this.graphState=t,this.graphStateChanged=!0,this.scheduleRefresh()}}},{key:"setNodesState",value:function(e,t){var r=!1,i=z(e),o;try{for(i.s();!(o=i.n()).done;){var s=o.value;s=""+s;var l=this.getNodeState(s);if(xt(l,t)){var u=B(B({},l),t);this.nodeStates.set(s,u),this.dirtyNodes.add(s),this.updateHoveredNodeTracking(s,l,u),r=!0}}}catch(d){i.e(d)}finally{i.f()}r&&(this.graphStateFlagsDirty=!0,this.scheduleRefresh())}},{key:"setEdgesState",value:function(e,t){var r=!1,i=z(e),o;try{for(i.s();!(o=i.n()).done;){var s=o.value;s=""+s;var l=this.getEdgeState(s);if(xt(l,t)){var u=B(B({},l),t);this.edgeStates.set(s,u),this.dirtyEdges.add(s),this.updateHoveredEdgeTracking(s,l,u),r=!0}}}catch(d){i.e(d)}finally{i.f()}r&&(this.graphStateFlagsDirty=!0,this.scheduleRefresh())}},{key:"markNodesDirty",value:function(e){var t=z(e),r;try{for(t.s();!(r=t.n()).done;){var i=r.value;this.dirtyNodes.add(i)}}catch(o){t.e(o)}finally{t.f()}this.scheduleRefresh()}},{key:"removeNode",value:function(e){this.nodeStates.delete(e),this.dirtyNodes.delete(e),this.clearHoveredFor("node",e),this.graphStateFlagsDirty=!0,this.scheduleRefresh()}},{key:"removeEdge",value:function(e){this.edgeStates.delete(e),this.dirtyEdges.delete(e),this.clearHoveredFor("edge",e),this.graphStateFlagsDirty=!0,this.scheduleRefresh()}},{key:"pruneNodes",value:function(e){var t=z(this.nodeStates.keys()),r;try{for(t.s();!(r=t.n()).done;){var i=r.value;e(i)||this.removeNode(i)}}catch(o){t.e(o)}finally{t.f()}}},{key:"pruneEdges",value:function(e){var t=z(this.edgeStates.keys()),r;try{for(t.s();!(r=t.n()).done;){var i=r.value;e(i)||this.removeEdge(i)}}catch(o){t.e(o)}finally{t.f()}}},{key:"clearNodes",value:function(){this.nodeStates.clear(),this.dirtyNodes.clear(),this.clearHoveredForKinds(ua("node")),this.graphStateFlagsDirty=!0,this.scheduleRefresh()}},{key:"clearEdges",value:function(){this.edgeStates.clear(),this.dirtyEdges.clear(),this.clearHoveredForKinds(ua("edge")),this.graphStateFlagsDirty=!0,this.scheduleRefresh()}},{key:"resetGraphState",value:function(){this.graphState=Ha(this.customGraphStateDefaults),this.graphStateChanged=!1,this.graphStateFlagsDirty=!1}},{key:"clearDirtyTracking",value:function(){this.dirtyNodes.clear(),this.dirtyEdges.clear(),this.graphStateChanged=!1}},{key:"setHovered",value:function(e){this.hovered=e}},{key:"clearHoveredFor",value:function(e,t){this.hovered&&this.hovered.key===t&&ua(e).includes(this.hovered.kind)&&(this.hovered=null)}},{key:"clearHoveredForKinds",value:function(e){this.hovered&&e.includes(this.hovered.kind)&&(this.hovered=null)}},{key:"updateGraphStateFromNodes",value:function(){var e,t=!1,r=!1,i=!1,o=z(this.nodeStates),s;try{for(o.s();!(s=o.n()).done;){var l=Q(s.value,2),u=l[1];if(u.isHovered&&(t=!0),u.isHighlighted&&(r=!0),u.isDragged&&(i=!0),t&&r&&i)break}}catch(c){o.e(c)}finally{o.f()}!t&&((e=this.hovered)===null||e===void 0?void 0:e.kind)==="edge"&&(t=!0);var d=!this.graphState.isPanning&&!this.graphState.isZooming&&!i;(this.graphState.hasHovered!==t||this.graphState.hasHighlighted!==r||this.graphState.isDragging!==i||this.graphState.isIdle!==d)&&(this.graphStateChanged=!0),this.graphState=B(B({},this.graphState),{},{hasHovered:t,hasHighlighted:r,isDragging:i,isIdle:d})}},{key:"updateGraphStateFromEdges",value:function(){var e,t=((e=this.hovered)===null||e===void 0?void 0:e.kind)==="node";if(!t){var r=z(this.edgeStates),i;try{for(r.s();!(i=r.n()).done;){var o=Q(i.value,2),s=o[1];if(s.isHovered){t=!0;break}}}catch(l){r.e(l)}finally{r.f()}}this.graphState.hasHovered!==t&&(this.graphStateChanged=!0),this.graphState=B(B({},this.graphState),{},{hasHovered:t})}},{key:"flushGraphStateFlags",value:function(){this.graphStateFlagsDirty&&(this.updateGraphStateFromNodes(),this.updateGraphStateFromEdges(),this.graphStateFlagsDirty=!1)}},{key:"updateHoveredNodeTracking",value:function(e,t,r){var i;if(t.isHovered!==r.isHovered)if(r.isHovered){var o;if(((o=this.hovered)===null||o===void 0?void 0:o.kind)==="node"&&this.hovered.key!==e){var s=this.hovered.key,l=this.getNodeState(s);this.nodeStates.set(s,B(B({},l),{},{isHovered:!1})),this.dirtyNodes.add(s)}this.hovered={kind:"node",key:e}}else((i=this.hovered)===null||i===void 0?void 0:i.kind)==="node"&&this.hovered.key===e&&(this.hovered=null)}},{key:"updateHoveredEdgeTracking",value:function(e,t,r){var i;if(t.isHovered!==r.isHovered)if(r.isHovered){var o;if(((o=this.hovered)===null||o===void 0?void 0:o.kind)==="edge"&&this.hovered.key!==e){var s=this.hovered.key,l=this.getEdgeState(s);this.edgeStates.set(s,B(B({},l),{},{isHovered:!1})),this.dirtyEdges.add(s)}this.hovered={kind:"edge",key:e}}else((i=this.hovered)===null||i===void 0?void 0:i.kind)==="edge"&&this.hovered.key===e&&(this.hovered=null)}}])})(),as=1,rs=2,is=3,os=4,nh=(function(a){function n(e,t){var r,i,o,s,l,u=arguments.length>2&&arguments[2]!==void 0?arguments[2]:{};K(this,n),l=ne(this,n),S(l,"nodeReducer",null),S(l,"edgeReducer",null),S(l,"stageCanvas",null),S(l,"mouseLayer",null),S(l,"gestureHint",null),S(l,"extraElements",{}),S(l,"webGLContext",null),S(l,"pickingFrameBuffer",null),S(l,"pickingTexture",null),S(l,"pickingDepthBuffer",null),S(l,"activeListeners",{}),S(l,"nodeVariableEntries",[]),S(l,"edgeVariableEntries",[]),S(l,"edgePathsByName",new Map),S(l,"nodeProgramIndex",{}),S(l,"edgeProgramIndex",{}),S(l,"edgeTextureIndexCache",{}),S(l,"nodeGraphCoords",{}),S(l,"nodeExtent",{x:[0,1],y:[0,1]}),S(l,"matrix",ce()),S(l,"invMatrix",ce()),S(l,"correctionRatio",1),S(l,"frameId",0),S(l,"customBBox",null),S(l,"gpuTimerExt",void 0),S(l,"activeGpuTimerQuery",null),S(l,"pendingGpuTimerQueries",[]),S(l,"normalizationFunction",zn({x:[0,1],y:[0,1]})),S(l,"graphToViewportRatio",1),S(l,"pickingState",Lc()),S(l,"prevNodeVisibilities",{}),S(l,"width",0),S(l,"height",0),S(l,"autoRescaleFrozen",!1),S(l,"stylesDeclaration",null),S(l,"resolvedStageStyle",{}),S(l,"renderFrame",null),S(l,"contextLost",!1),S(l,"pendingProcess","full"),S(l,"needToRefreshState",!1),S(l,"checkEdgesEventsFrame",null),S(l,"edgeStyleAnalysis",{dependency:"static",xAttribute:null,yAttribute:null}),S(l,"depthLayers",$(Ln)),S(l,"customLayerPrograms",new Map),S(l,"nodeShapeSlug",null),S(l,"sdfAtlas",null),S(l,"depthRanges",{nodes:{},edges:{}}),S(l,"nodeBaseDepth",{}),S(l,"edgeBaseDepth",{});var d=u.primitives,c=u.styles,f=u.settings,h=f===void 0?{}:f,p=u.nodeReducer,b=u.edgeReducer,v=u.customNodeState,g=u.customEdgeState,m=u.customGraphState;l.stateManager=new th(function(){return l.scheduleStateRefresh()},v,g,m);var y=d??Ci;l.stylesDeclaration=c?{nodes:(r=c.nodes)!==null&&r!==void 0?r:Fn.nodes,edges:(i=c.edges)!==null&&i!==void 0?i:Fn.edges,stage:c.stage}:Fn,l.nodeReducer=p??null,l.edgeReducer=b??null;var _=$a(l.stylesDeclaration.nodes);l.nodeReducer&&(_.dependency="graph-state"),l.edgeStyleAnalysis=$a(l.stylesDeclaration.edges),l.edgeReducer&&(l.edgeStyleAnalysis.dependency="graph-state"),l.stylesDeclaration.stage&&(l.resolvedStageStyle=Ya(l.stylesDeclaration.stage,l.stateManager.graphState));var x=Gi(h);if(On(x),x.enableNodeDrag){var T=_.xAttribute,E=_.yAttribute;if((!T||!E)&&!x.dragPositionToAttributes)throw new Error('Sigma: `enableNodeDrag` is true but position attribute names could not be inferred from styles. Either use attribute bindings for x/y in your node styles (e.g. `x: { attribute: "x" }`), or provide a `dragPositionToAttributes` setting.')}if(Ni(e),!(t instanceof HTMLElement))throw new Error("Sigma: container should be an html element.");l.container=t,l.edgeGroups=new Cc(e,function(F,L){for(var M=0;M<F.length;M++){var H=l.stateManager.getEdgeState(F[M]);H.parallelIndex=M,H.parallelCount=L}});var A=new Dc(e,l.viewportToGraph.bind(l),l.setNodesState.bind(l),function(F,L){return l.emit(F,L)});if(l.depthLayers=(o=y.depthLayers)!==null&&o!==void 0?o:$(Ln),!(c!=null&&c.nodes)&&!Dn.every(function(F){return l.depthLayers.includes(F)}))throw new Error("Sigma: depthLayers must include ".concat(Dn.join(", ")," for the built-in node styles."));if(!(c!=null&&c.edges)&&!Cn.every(function(F){return l.depthLayers.includes(F)}))throw new Error("Sigma: depthLayers must include ".concat(Cn.join(", ")," for the built-in edge styles."));l.itemBuckets={nodes:new yr(l.depthLayers),edges:new yr(l.depthLayers)},l.initWebGLContext(),l.mouseLayer=_t("div",{position:"absolute",touchAction:"none",userSelect:"none"},{class:"sigma-mouse"}),l.container.appendChild(l.mouseLayer),l.resolvedStageStyle.background&&(l.container.style.backgroundColor=l.resolvedStageStyle.background),l.resolvedStageStyle.cursor&&(l.container.style.cursor=l.resolvedStageStyle.cursor);var C=new Wo(l.webGLContext),w=new xr(l.webGLContext,{channels:1}),k=new Uo(l.webGLContext),R=new xr(l.webGLContext,{channels:4}),P=l.webGLContext,D=new Yc({gl:P,getFrameBuffer:function(){return l.pickingFrameBuffer},getPixelRatio:function(){return l.internals.pixelRatio},getDownSizingRatio:function(){return l.internals.settings.pickingDownSizingRatio},isRenderPending:function(){return l.renderFrame!==null},onIndex:function(L,M){var H;return ds(l.internals,(H=l.pickingState.lookup[L])!==null&&H!==void 0?H:null,M)}}),I=l.initPrograms(y,x),G=y==null||(s=y.nodes)===null||s===void 0?void 0:s.labelAttachments,N=null;return G&&Object.keys(G).length>0&&(N=new Oo(P,G,function(){return l.scheduleRender()})),l.internals=B(B({nodeDataCache:{},edgeDataCache:{},nodesWithForcedLabels:new Set,nodesWithBackdrop:new Set,edgesWithForcedLabels:new Set,settings:x,primitives:y,pixelRatio:jt(),graph:e,stateManager:l.stateManager,dragManager:A,hoverResolver:D,nodeStyleAnalysis:_,pickingState:l.pickingState},I),{},{attachmentManager:N,nodeDataTexture:C,nodeFrameTexture:w,edgeDataTexture:k,edgeFrameTexture:R,getDimensions:function(){return l.getDimensions()},getGraphDimensions:function(){return l.getGraphDimensions()},getStagePadding:function(){return l.getStagePadding()},getCameraState:function(){return l.camera.getState()},getHitAtPosition:function(L){return l.getHitAtPosition(L)},setNodeState:function(L,M){return l.setNodeState(L,M)},setEdgeState:function(L,M){return l.setEdgeState(L,M)},updateContainerCursor:function(){return l.updateContainerCursor()},scheduleRefresh:function(){return l.scheduleRefresh()},viewportToFramedGraph:function(L){return l.viewportToFramedGraph(L)},viewportToGraph:function(L){return l.viewportToGraph(L)},framedGraphToViewport:function(L){return l.framedGraphToViewport(L)},scaleSize:function(L){return l.scaleSize(L)},emit:function(L,M){return l.emit(L,M)}}),l.labelRenderer=new eh(l.internals),l.resize(),l.initializeWebGLLabels(),l.camera=new Vo,l.bindCameraHandlers(),l.mouseCaptor=new Ec(l.mouseLayer,l),l.mouseCaptor.setSettings(l.internals.settings),l.touchCaptor=new wc(l.mouseLayer,l),l.touchCaptor.setSettings(l.internals.settings),l.bindEventHandlers(),l.bindGraphHandlers(),l.handleSettingsUpdate(),l.refresh(),l}return ae(n,a),Z(n,[{key:"initializeWebGLLabels",value:function(){this.sdfAtlas=new Qe,this.sdfAtlas.registerFont({family:"sans-serif",weight:"normal",style:"normal"})}},{key:"resetWebGLTexture",value:function(){var t=this.webGLContext;if(!this.pickingFrameBuffer)return this;var r=Math.ceil(this.width*this.internals.pixelRatio/this.internals.settings.pickingDownSizingRatio),i=Math.ceil(this.height*this.internals.pixelRatio/this.internals.settings.pickingDownSizingRatio);t.bindFramebuffer(t.FRAMEBUFFER,this.pickingFrameBuffer),this.pickingTexture&&t.deleteTexture(this.pickingTexture);var o=t.createTexture();o&&(t.bindTexture(t.TEXTURE_2D,o),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,r,i,0,t.RGBA,t.UNSIGNED_BYTE,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,o,0),this.pickingTexture=o),this.pickingDepthBuffer&&t.deleteRenderbuffer(this.pickingDepthBuffer);var s=t.createRenderbuffer();return s&&(t.bindRenderbuffer(t.RENDERBUFFER,s),t.renderbufferStorage(t.RENDERBUFFER,t.DEPTH_COMPONENT16,r,i),t.framebufferRenderbuffer(t.FRAMEBUFFER,t.DEPTH_ATTACHMENT,t.RENDERBUFFER,s),this.pickingDepthBuffer=s),t.bindFramebuffer(t.FRAMEBUFFER,null),this}},{key:"bindCameraHandlers",value:function(){var t=this;return this.activeListeners.camera=function(){t.refreshMatrices(),t.labelRenderer.labelsDirty=!0,t.scheduleRender()},this.activeListeners.cameraAnimationStart=function(r){var i=r.from,o=r.to;i.ratio!==o.ratio&&t.stateManager.setGraphState({isZooming:!0})},this.activeListeners.cameraAnimationEnd=function(){t.stateManager.setGraphState({isZooming:!1})},this.camera.on("updated",this.activeListeners.camera),this.camera.on("animationStart",this.activeListeners.cameraAnimationStart),this.camera.on("animationEnd",this.activeListeners.cameraAnimationEnd),this}},{key:"unbindCameraHandlers",value:function(){return this.camera.removeListener("updated",this.activeListeners.camera),this.camera.removeListener("animationStart",this.activeListeners.cameraAnimationStart),this.camera.removeListener("animationEnd",this.activeListeners.cameraAnimationEnd),this}},{key:"getHitAtPosition",value:function(t){var r;if(this.contextLost)return null;var i=this.webGLContext;i.bindFramebuffer(i.FRAMEBUFFER,this.pickingFrameBuffer);var o=Ga(i,this.pickingFrameBuffer,t.x,t.y,this.internals.pixelRatio,this.internals.settings.pickingDownSizingRatio),s=wn.apply(void 0,$(o));return(r=this.pickingState.lookup[s])!==null&&r!==void 0?r:null}},{key:"bindEventHandlers",value:function(){return Mc(this.internals,this.mouseCaptor,this.touchCaptor,this.activeListeners),this}},{key:"bindGraphHandlers",value:function(){var t=this;return zc({graph:this.internals.graph,edgeGroups:this.edgeGroups,updateNode:this.updateNode.bind(this),removeNode:this.removeNode.bind(this),addEdge:this.addEdge.bind(this),updateEdge:this.updateEdge.bind(this),removeEdge:this.removeEdge.bind(this),clearEdgeState:this.clearEdgeState.bind(this),clearNodeState:this.clearNodeState.bind(this),clearEdgeIndices:this.clearEdgeIndices.bind(this),clearNodeIndices:this.clearNodeIndices.bind(this),refresh:this.refresh.bind(this),scheduleProcess:function(){t.pendingProcess="full",t.scheduleRender()},markNodesDirty:function(i){t.internals.nodeStyleAnalysis.dependency==="graph-state"&&t.stateManager.markNodesDirty(i)}},this.activeListeners),this}},{key:"unbindGraphHandlers",value:function(){Bc(this.internals.graph,this.activeListeners)}},{key:"getNodeShapeId",value:function(t){return this.internals.nodeShapeMap&&this.internals.nodeGlobalShapeIds&&t.shape&&t.shape in this.internals.nodeShapeMap?this.internals.nodeGlobalShapeIds[this.internals.nodeShapeMap[t.shape]]:St(t.shape||"circle")}},{key:"processNodes",value:function(){var t=this,r=this.internals.graph,i=this.internals.settings,o=this.getDimensions(),s=i.autoRescale,l=i.autoRescaleContent,u=this.nodeExtent;if(s===!1){var d=o.width,c=o.height;u={x:[-d/2,d/2],y:[-c/2,c/2]}}else(s!=="once"||!this.autoRescaleFrozen)&&(u=this.computeNodeExtent(),l!=="positions"&&!this.customBBox&&(u=Hc({extent:u,coords:this.nodeGraphCoords,nodeData:this.internals.nodeDataCache,dimensions:o,stagePadding:this.getStagePadding(),zoomToSizeRatioFunction:i.zoomToSizeRatioFunction,itemSizesReference:i.itemSizesReference,fitLabels:l==="labels",nodeLabelBox:function(H,U){return t.labelRenderer.nodeLabelBox(H,U)}})),s==="once"&&(this.autoRescaleFrozen=!0));this.nodeExtent=u,this.normalizationFunction=zn(this.customBBox||this.nodeExtent);var f=new Vo,h=Fe(f.getState(),o,this.getGraphDimensions(),this.getStagePadding());this.labelRenderer.labelGrid.resizeAndClear(o,i.labelGridCellSize),this.labelRenderer.edgeAnchorGrid.resizeAndClear(o,i.labelGridCellSize);var p=i.renderEdgeLabels&&i.edgeLabelAnchors==="allNodes",b=!1;oa(this.pickingState,"node");for(var v=r.nodes(),g=0,m=v.length;g<m;g++){var y=v[g],_=this.internals.nodeDataCache[y],x=this.nodeGraphCoords[y];_.x=x.x,_.y=x.y,this.normalizationFunction.applyTo(_),_.visibility!==this.prevNodeVisibilities[y]&&(b=!0),typeof _.label=="string"&&_.visibility!=="hidden"&&_.labelVisibility!=="hidden"&&this.labelRenderer.labelGrid.add(y,_.size,this.framedGraphToViewport(_,{matrix:h})),p&&_.visibility!=="hidden"&&this.labelRenderer.edgeAnchorGrid.add(y,_.size,this.framedGraphToViewport(_,{matrix:h}))}this.labelRenderer.labelGrid.organize(),this.labelRenderer.edgeAnchorGrid.organize(),this.nodeProgram.reallocate(v.length);var T=0;this.depthRanges.nodes={},this.nodeBaseDepth={};var E=this.internals.nodeDataCache,A=z(this.depthLayers),C;try{for(A.s();!(C=A.n()).done;){var w=C.value,k=this.itemBuckets.nodes.getSorted(w,function(M){return E[M].zIndex});if(k.length!==0){this.depthRanges.nodes[w]=[{offset:T,count:k.length}];var R=z(k),P;try{for(R.s();!(P=R.n()).done;){var D=P.value;this.nodeBaseDepth[D]=w,Ko(this.pickingState,"node",D),this.addNodeToProgram(D,T++)}}catch(M){R.e(M)}finally{R.f()}}}}catch(M){A.e(M)}finally{A.f()}this.nodeProgram.invalidateBuffers();for(var I=0,G=v.length;I<G;I++)this.prevNodeVisibilities[v[I]]=this.internals.nodeDataCache[v[I]].visibility;this.labelRenderer.processWebGLLabels(v);var N=z(this.customLayerPrograms.values()),F;try{for(N.s();!(F=N.n()).done;){var L=F.value.program;L.cacheData&&L.cacheData()}}catch(M){N.e(M)}finally{N.f()}return b}},{key:"processEdges",value:function(){var t=this.internals.graph,r=t.edges();this.edgeProgram.reallocate(r.length);var i=0;oa(this.pickingState,"edge"),this.depthRanges.edges={},this.edgeBaseDepth={};var o=this.internals.edgeDataCache,s=z(this.depthLayers),l;try{for(s.s();!(l=s.n()).done;){var u=l.value,d=this.itemBuckets.edges.getSorted(u,function(p){return o[p].zIndex});if(d.length!==0){this.depthRanges.edges[u]=[{offset:i,count:d.length}];var c=z(d),f;try{for(c.s();!(f=c.n()).done;){var h=f.value;this.edgeBaseDepth[h]=u,Ko(this.pickingState,"edge",h),this.addEdgeToProgram(h,i++)}}catch(p){c.e(p)}finally{c.f()}}}}catch(p){s.e(p)}finally{s.f()}this.edgeProgram.invalidateBuffers()}},{key:"updateNodeDepthRanges",value:function(t,r,i){var o=this.nodeProgramIndex[t];o!==void 0&&(Qa(this.depthRanges.nodes,r,o),Ja(this.depthRanges.nodes,i,o))}},{key:"updateEdgeDepthRanges",value:function(t,r,i){var o=this.edgeProgramIndex[t];o!==void 0&&(Qa(this.depthRanges.edges,r,o),Ja(this.depthRanges.edges,i,o))}},{key:"handleSettingsUpdate",value:function(){var t=this,r=this.internals.settings;return this.camera.minRatio=r.minCameraRatio,this.camera.maxRatio=r.maxCameraRatio,this.camera.enabledZooming=r.enableCameraZooming,this.camera.enabledPanning=r.enableCameraPanning,this.camera.enabledRotation=r.enableCameraRotation,r.cameraPanBoundaries?this.camera.constrainState=function(i){return t.cleanCameraState(i,r.cameraPanBoundaries&&Y(r.cameraPanBoundaries)==="object"?r.cameraPanBoundaries:{})}:this.camera.constrainState=null,this.camera.setState(this.camera.getState()),this.mouseLayer.style.touchAction=r.gestureTarget==="graph"?"none":r.gestureTarget==="shared"?"pan-x pan-y":"auto",r.gestureTarget!=="shared"&&this.gestureHint&&(this.gestureHint.kill(),this.gestureHint=null),this.mouseCaptor.setSettings(this.internals.settings),this.touchCaptor.setSettings(this.internals.settings),this}},{key:"cleanCameraState",value:function(t){var r=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},i=r.tolerance,o=i===void 0?0:i,s=r.boundaries,l=B({},t),u=s||this.nodeExtent,d=Q(u.x,2),c=d[0],f=d[1],h=Q(u.y,2),p=h[0],b=h[1],v=[this.graphToViewport({x:c,y:p},{cameraState:t}),this.graphToViewport({x:f,y:p},{cameraState:t}),this.graphToViewport({x:c,y:b},{cameraState:t}),this.graphToViewport({x:f,y:b},{cameraState:t})],g=1/0,m=-1/0,y=1/0,_=-1/0;v.forEach(function(D){var I=D.x,G=D.y;g=Math.min(g,I),m=Math.max(m,I),y=Math.min(y,G),_=Math.max(_,G)});var x=m-g,T=_-y,E=this.getDimensions(),A=E.width,C=E.height,w=0,k=0;if(x>=A?m<A-o?w=m-(A-o):g>o&&(w=g-o):m>A+o?w=m-(A+o):g<-o&&(w=g+o),T>=C?_<C-o?k=_-(C-o):y>o&&(k=y-o):_>C+o?k=_-(C+o):y<-o&&(k=y+o),w||k){var R=this.viewportToFramedGraph({x:0,y:0},{cameraState:t}),P=this.viewportToFramedGraph({x:w,y:k},{cameraState:t});w=P.x-R.x,k=P.y-R.y,l.x+=w,l.y+=k}return l}},{key:"refreshMatrices",value:function(){var t=this.camera.getState(),r=this.getDimensions(),i=this.getGraphDimensions(),o=this.getStagePadding();this.matrix=Fe(t,r,i,o),this.invMatrix=Fe(t,r,i,o,!0),this.correctionRatio=Na(this.matrix,t,r),this.graphToViewportRatio=this.getGraphToViewportRatio()}},{key:"processData",value:function(){var t;this.emit("beforeProcess"),(t=this.internals.attachmentManager)===null||t===void 0||t.clear();var r=B({},this.pickingState.idsByKind),i=this.processNodes();(this.pendingProcess==="full"||i)&&this.processEdges(),Pc(this.pickingState,this.internals),kc(r,this.pickingState.idsByKind)||this.internals.hoverResolver.invalidate(),this.pendingProcess="none",this.emit("afterProcess")}},{key:"render",value:function(){var t=this;if(this.contextLost)return this;this.emit("beforeRender");var r=function(){return t.internals.hoverResolver.frameRendered(),t.emit("afterRender"),t};if(this.renderFrame&&(cancelAnimationFrame(this.renderFrame),this.renderFrame=null),this.resize(),(this.pendingProcess!=="none"||this.needToRefreshState)&&(this.labelRenderer.labelsDirty=!0),this.pendingProcess!=="none"&&this.processData(),this.needToRefreshState&&this.refreshState(),this.needToRefreshState=!1,this.stateManager.clearDirtyTracking(),this.pendingProcess!=="none"&&this.processData(),this.clear(),this.resetWebGLTexture(),!this.internals.graph.order)return r();var i=this.mouseCaptor,o=this.camera.isAnimating()||i.isMoving||i.draggedEvents||i.currentWheelDirection;if(this.refreshMatrices(),this.frameId++,this.internals.settings.renderEdgeLabels&&!this.internals.edgeLabelProgram){var s=this.createEdgeLabelPrograms(),l=s.labelProgram,u=s.labelBackgroundProgram;this.internals.edgeLabelProgram=l,this.internals.edgeLabelBackgroundProgram=u}var d=this.internals.settings.DEBUG_logRenderStats?this.getDebugPrograms():null;d&&d.forEach(function(j){return j.resetDebugStats()}),this.internals.settings.DEBUG_gpuTimerQueries&&this.beginGpuTimerQuery(),this.internals.nodeFrameTexture.ensureCapacity(this.internals.nodeDataTexture.getCapacity()),this.internals.edgeFrameTexture.ensureCapacity(this.internals.edgeDataTexture.getCapacity());var c=this.getRenderParams(),f=ue.edge.writesPickingThisFrame(this.internals)?c:B(B({},c),{},{pickingFrameBuffer:null});this.labelRenderer.resetFrame();var h=this.webGLContext,p=Math.ceil(this.width*this.internals.pixelRatio/this.internals.settings.pickingDownSizingRatio),b=Math.ceil(this.height*this.internals.pixelRatio/this.internals.settings.pickingDownSizingRatio);if(h.bindFramebuffer(h.FRAMEBUFFER,this.pickingFrameBuffer),h.viewport(0,0,p,b),h.clear(h.COLOR_BUFFER_BIT|h.DEPTH_BUFFER_BIT),h.bindFramebuffer(h.FRAMEBUFFER,null),h.viewport(0,0,this.width*this.internals.pixelRatio,this.height*this.internals.pixelRatio),h.clear(h.COLOR_BUFFER_BIT|h.DEPTH_BUFFER_BIT),this.internals.nodeDataTexture.upload(),this.internals.edgeDataTexture.upload(),this.nodeProgram.uploadLayerTexture(),this.edgeProgram.uploadAttributeTexture(),this.emit("afterTexturesUpload"),this.internals.nodeDataTexture.bind(is),this.internals.edgeDataTexture.bind(os),this.edgeFramePass.run(c,this.internals.edgeFrameTexture,this.internals.edgeDataTexture.getHighWaterMark(),this.edgeProgram.getAttributeTexture(),this.nodeProgram.getAttributeTexture()),this.internals.edgeFrameTexture.bind(as),this.internals.settings.renderLabels){this.labelRenderer.computeDisplayedNodeLabels();var v=this.labelRenderer.buildFramePassPoints(),g=v.data,m=v.count;this.nodeFramePass.run(g,m,this.internals.nodeFrameTexture,c,this.nodeProgram.getAttributeTexture()),this.internals.nodeFrameTexture.bind(rs)}this.internals.settings.renderEdgeLabels&&this.labelRenderer.computeDisplayedEdgeLabels();var y=z(this.customLayerPrograms.values()),_;try{for(y.s();!(_=y.n()).done;){var x=_.value.program;x.preRender&&x.preRender(c)}}catch(j){y.e(j)}finally{y.f()}h.bindFramebuffer(h.FRAMEBUFFER,null),h.viewport(0,0,this.width*this.internals.pixelRatio,this.height*this.internals.pixelRatio),h.blendFunc(h.ONE,h.ONE_MINUS_SRC_ALPHA);var T=!this.internals.settings.hideLabelsOnMove||!o,E=z(this.depthLayers),A;try{for(E.s();!(A=E.n()).done;){var C=A.value,w=z(this.customLayerPrograms.values()),k;try{for(w.s();!(k=w.n()).done;){var R=k.value;R.depth===C&&R.program.render(c)}}catch(j){w.e(j)}finally{w.f()}var P=this.depthRanges.edges[C];if(P&&(!this.internals.settings.hideEdgesOnMove||!o)){var D=z(P),I;try{for(D.s();!(I=D.n()).done;){var G=I.value,N=G.offset,F=G.count;F>0&&this.edgeProgram.render(f,N,F)}}catch(j){D.e(j)}finally{D.f()}}this.internals.settings.renderEdgeLabels&&T&&(this.labelRenderer.renderEdgeLabelBackgrounds(ue.edgeLabel.writesPickingThisFrame(this.internals)?c:B(B({},c),{},{pickingFrameBuffer:null}),C),this.labelRenderer.renderEdgeLabels(c,C)),this.labelRenderer.cacheAttachments(C),this.labelRenderer.renderBackdrops(B(B({},c),{},{pickingFrameBuffer:null}),C);var L=this.depthRanges.nodes[C];if(L){var M=z(L),H;try{for(M.s();!(H=M.n()).done;){var U=H.value,X=U.offset,q=U.count;q>0&&this.nodeProgram.render(c,X,q)}}catch(j){M.e(j)}finally{M.f()}}T&&(this.labelRenderer.renderAttachments(B(B({},c),{},{pickingFrameBuffer:null}),C),this.labelRenderer.renderLabelBackgrounds(ue.nodeLabel.writesPickingThisFrame(this.internals)?c:B(B({},c),{},{pickingFrameBuffer:null}),C),this.internals.settings.renderLabels&&this.labelRenderer.renderWebGLLabels(c,C))}}catch(j){E.e(j)}finally{E.f()}return this.labelRenderer.labelsDirty=!1,this.internals.settings.DEBUG_displayPickingLayer&&(h.bindFramebuffer(h.READ_FRAMEBUFFER,this.pickingFrameBuffer),h.bindFramebuffer(h.DRAW_FRAMEBUFFER,null),h.blitFramebuffer(0,0,p,b,0,0,this.width*this.internals.pixelRatio,this.height*this.internals.pixelRatio,h.COLOR_BUFFER_BIT,h.NEAREST)),this.internals.settings.DEBUG_gpuTimerQueries&&this.endGpuTimerQuery(),this.pollGpuTimerQueries(),d&&this.logRenderStats(d),r()}},{key:"getDebugPrograms",value:function(){return[this.nodeProgram,this.edgeProgram,this.internals.labelProgram,this.internals.edgeLabelProgram,this.internals.edgeLabelBackgroundProgram,this.internals.backdropProgram,this.internals.labelBackgroundProgram,this.internals.attachmentProgram].filter(function(t){return t!==null})}},{key:"logRenderStats",value:function(t){var r={},i=z(t),o;try{for(i.s();!(o=i.n()).done;){var s=o.value;r[s.constructor.name]=B({},s.debugStats)}}catch(l){i.e(l)}finally{i.f()}console.log("[sigma] DEBUG_logRenderStats: frame #".concat(this.frameId)),console.table(r)}},{key:"getGpuTimerExtension",value:function(){return this.gpuTimerExt===void 0&&(this.gpuTimerExt=this.webGLContext.getExtension("EXT_disjoint_timer_query_webgl2"),this.gpuTimerExt||console.warn("Sigma: DEBUG_gpuTimerQueries is enabled, but this browser/driver doesn't support EXT_disjoint_timer_query_webgl2.")),this.gpuTimerExt}},{key:"beginGpuTimerQuery",value:function(){var t=this.getGpuTimerExtension();if(t){var r=this.webGLContext,i=r.createQuery();i&&(r.beginQuery(t.TIME_ELAPSED_EXT,i),this.activeGpuTimerQuery=i)}}},{key:"endGpuTimerQuery",value:function(){!this.gpuTimerExt||!this.activeGpuTimerQuery||(this.webGLContext.endQuery(this.gpuTimerExt.TIME_ELAPSED_EXT),this.pendingGpuTimerQueries.push({query:this.activeGpuTimerQuery,frameId:this.frameId}),this.activeGpuTimerQuery=null)}},{key:"pollGpuTimerQueries",value:function(){if(this.pendingGpuTimerQueries.length!==0){var t=this.webGLContext,r=this.gpuTimerExt;if(!r){this.pendingGpuTimerQueries.forEach(function(c){var f=c.query;return t.deleteQuery(f)}),this.pendingGpuTimerQueries=[];return}var i=t.getParameter(r.GPU_DISJOINT_EXT),o=[],s=z(this.pendingGpuTimerQueries),l;try{for(s.s();!(l=s.n()).done;){var u=l.value;if(!t.getQueryParameter(u.query,t.QUERY_RESULT_AVAILABLE)){o.push(u);continue}if(!i){var d=t.getQueryParameter(u.query,t.QUERY_RESULT);console.log("[sigma] DEBUG_gpuTimerQueries: frame #".concat(u.frameId," GPU time = ").concat((d/1e6).toFixed(2),"ms"))}t.deleteQuery(u.query)}}catch(c){s.e(c)}finally{s.f()}this.pendingGpuTimerQueries=o}}},{key:"postEvaluateNode",value:function(t,r,i){var o=t;o.x===void 0&&(o.x=r.x),o.y===void 0&&(o.y=r.y),t.highlighted=i.isHighlighted;for(var s=0,l=this.nodeVariableEntries.length;s<l;s++){var u,d,c=Q(this.nodeVariableEntries[s],2),f=c[0],h=c[1];o[f]=(u=(d=o[f])!==null&&d!==void 0?d:r[f])!==null&&u!==void 0?u:h.default}}},{key:"addNode",value:function(t){var r=this.internals.graph.getNodeAttributes(t),i=this.stateManager.getNodeState(t),o=this.internals.nodeDataCache[t]||{};if(ja(this.stylesDeclaration.nodes,r,i,this.stateManager.graphState,this.internals.graph,o),this.postEvaluateNode(o,r,i),this.nodeReducer){var s=this.nodeReducer(t,o,r,i,this.stateManager.graphState,this.internals.graph);o=B(B({},o),s)}if(typeof o.x!="number"||typeof o.y!="number")throw new Error('Sigma: could not find a valid position (x, y) for node "'.concat(t,'". ')+"Provide coordinates via node attributes, styles, or a nodeReducer.");this.internals.nodeShapeMap?(!o.shape||!(o.shape in this.internals.nodeShapeMap))&&(o.shape=Object.keys(this.internals.nodeShapeMap)[0]):this.nodeShapeSlug&&(o.shape=this.nodeShapeSlug),this.internals.nodeDataCache[t]=o,this.nodeGraphCoords[t]={x:o.x,y:o.y},Ze(this.internals.nodesWithForcedLabels,t,Be(o)),Ze(this.internals.nodesWithBackdrop,t,Za(o)),this.itemBuckets.nodes.set(t,o.depth)}},{key:"updateNode",value:function(t){this.addNode(t);var r=this.internals.nodeDataCache[t];this.normalizationFunction.applyTo(r)}},{key:"removeNode",value:function(t){Zo(this.pickingState,"node",t),this.itemBuckets.nodes.remove(t),delete this.internals.nodeDataCache[t],delete this.nodeGraphCoords[t],delete this.nodeProgramIndex[t],this.internals.nodeDataTexture.free(t),this.internals.dragManager.removeNode(t),this.stateManager.removeNode(t),this.internals.nodesWithForcedLabels.delete(t),this.internals.nodesWithBackdrop.delete(t)}},{key:"postEvaluateEdge",value:function(t,r){for(var i=t,o=0,s=this.edgeVariableEntries.length;o<s;o++){var l,u,d=Q(this.edgeVariableEntries[o],2),c=d[0],f=d[1];i[c]=(l=(u=i[c])!==null&&u!==void 0?u:r[c])!==null&&l!==void 0?l:f.default}}},{key:"applyEdgeSpread",value:function(t,r,i){var o;if(!(i.parallelCount<=1)){var s=this.internals.graph.source(t),l=this.internals.graph.target(t),u=s===l,d=u?r.selfLoopPath||r.path:r.parallelPath||r.path,c=d?this.edgePathsByName.get(d):void 0;if(c!=null&&c.spread){var f=(o=r.parallelSpread)!==null&&o!==void 0?o:.25,h=c.spread.compute(i.parallelIndex,i.parallelCount,f);!u&&this.internals.graph.isDirected(t)&&s>l&&(h=-h),r[c.spread.variable]=h}}}},{key:"addEdge",value:function(t){var r=this.internals.graph.getEdgeAttributes(t),i=this.stateManager.getEdgeState(t),o={};if(Xa(this.stylesDeclaration.edges,r,i,this.stateManager.graphState,this.internals.graph,o),this.postEvaluateEdge(o,r),this.edgeReducer){var s=this.edgeReducer(t,o,r,i,this.stateManager.graphState,this.internals.graph);o=B(B({},o),s)}this.applyEdgeSpread(t,o,i),this.internals.edgeDataCache[t]=o,Ze(this.internals.edgesWithForcedLabels,t,Be(o)),this.itemBuckets.edges.set(t,o.depth)}},{key:"updateEdge",value:function(t){this.addEdge(t)}},{key:"removeEdge",value:function(t){this.itemBuckets.edges.remove(t),delete this.internals.edgeDataCache[t],delete this.edgeProgramIndex[t],delete this.edgeTextureIndexCache[t],this.internals.edgeDataTexture.free(t),Zo(this.pickingState,"edge",t),this.stateManager.removeEdge(t),this.internals.edgesWithForcedLabels.delete(t)}},{key:"clearNodeIndices",value:function(){var t;this.labelRenderer.resetLabelGrid(),this.autoRescaleFrozen||(this.nodeExtent={x:[0,1],y:[0,1]}),this.internals.nodeDataCache={},this.nodeGraphCoords={},this.nodeProgramIndex={},(t=this.internals.nodeDataTexture)===null||t===void 0||t.clear(),this.internals.nodesWithForcedLabels.clear(),this.internals.nodesWithBackdrop.clear(),this.prevNodeVisibilities={},this.itemBuckets.nodes.clearAll(),this.depthRanges.nodes={},this.nodeBaseDepth={}}},{key:"clearEdgeIndices",value:function(){var t;this.internals.edgeDataCache={},this.edgeProgramIndex={},this.edgeTextureIndexCache={},(t=this.internals.edgeDataTexture)===null||t===void 0||t.clear(),this.internals.edgesWithForcedLabels.clear(),this.itemBuckets.edges.clearAll(),this.depthRanges.edges={},this.edgeBaseDepth={},this.edgeGroups.clear()}},{key:"clearIndices",value:function(){this.clearEdgeIndices(),this.clearNodeIndices()}},{key:"clearNodeState",value:function(){this.labelRenderer.resetFrame(),this.internals.nodesWithBackdrop.clear(),this.internals.dragManager.clear(),this.autoRescaleFrozen=!1,this.stateManager.clearNodes(),oa(this.pickingState,"node")}},{key:"clearEdgeState",value:function(){this.labelRenderer.clearEdgeLabels(),this.stateManager.clearEdges(),oa(this.pickingState,"edge")}},{key:"clearState",value:function(){this.clearEdgeState(),this.clearNodeState(),this.stateManager.resetGraphState()}},{key:"addNodeToProgram",value:function(t,r){var i,o=this.internals.nodeDataCache[t];this.internals.nodeDataTexture.allocate(t),(i=this.internals.nodeDataTexture).updateNode.apply(i,[t,o.x,o.y,o.size,this.getNodeShapeId(o)].concat($(Mn(o)),[o.color]));var s=this.internals.nodeDataTexture.getIndex(t);this.nodeProgram.process(rt(this.pickingState,"node",t),r,o,s),this.nodeProgramIndex[t]=r}},{key:"addEdgeToProgram",value:function(t,r){var i,o,s=this.internals.edgeDataCache[t],l=this.internals.graph.source(t),u=this.internals.graph.target(t),d=this.internals.edgeDataTexture.allocate(t);this.edgeTextureIndexCache[t]=d;var c=l===u,f=!c&&((i=(o=this.stateManager.getEdgeState(t))===null||o===void 0?void 0:o.parallelCount)!==null&&i!==void 0?i:1)>1,h=this.edgeProgram.resolveEdgeIds(s,c,f),p=h.pathId,b=h.headId,v=h.tailId,g=h.headLengthRatio,m=h.tailLengthRatio;this.internals.edgeDataTexture.updateEdge(t,this.internals.nodeDataTexture.getIndex(l),this.internals.nodeDataTexture.getIndex(u),s.size,g,m,p,b,v),this.edgeProgram.process(rt(this.pickingState,"edge",t),r,this.internals.nodeDataCache[l],this.internals.nodeDataCache[u],s,d),this.edgeProgramIndex[t]=r}},{key:"getRenderParams",value:function(){return{frameId:this.frameId,matrix:this.matrix,invMatrix:this.invMatrix,width:this.width,height:this.height,pixelRatio:this.internals.pixelRatio,zoomRatio:this.camera.ratio,cameraAngle:this.camera.angle,sizeRatio:1/this.scaleSize(),correctionRatio:this.correctionRatio,downSizingRatio:this.internals.settings.pickingDownSizingRatio,minEdgeThickness:this.internals.settings.minEdgeThickness,antiAliasingFeather:this.internals.settings.antiAliasingFeather,nodePickingPadding:this.internals.settings.nodePickingPadding,edgePickingPadding:this.internals.settings.edgePickingPadding,labelPickingPadding:this.internals.settings.labelPickingPadding,nodeDataTextureUnit:is,nodeDataTextureWidth:this.internals.nodeDataTexture.getTextureWidth(),nodeFrameTextureUnit:rs,nodeFrameTextureWidth:this.internals.nodeFrameTexture.getTextureWidth(),edgeDataTextureUnit:os,edgeDataTextureWidth:this.internals.edgeDataTexture.getTextureWidth(),edgeFrameTextureUnit:as,edgeFrameTextureWidth:this.internals.edgeFrameTexture.getTextureWidth(),pickingFrameBuffer:this.pickingFrameBuffer,labelPixelSnapping:this.internals.settings.labelPixelSnapping?1:0}}},{key:"getStagePadding",value:function(){var t=this.internals.settings,r=t.stagePadding,i=t.autoRescale;return i&&r||0}},{key:"getLayerElement",value:function(t){if(t==="mouse")return this.mouseLayer;var r=this.extraElements[t];if(!r)throw new Error('Sigma: layer "'.concat(t,'" does not exist'));return r}},{key:"initWebGLContext",value:function(){var t=this,r=this.createWebGLContext("stage");this.stageCanvas=this.extraElements.stage,this.webGLContext=r,this.stageCanvas.addEventListener("webglcontextlost",function(i){t.webGLContext&&(i.preventDefault(),t.contextLost=!0,t.renderFrame&&(cancelAnimationFrame(t.renderFrame),t.renderFrame=null),t.gpuTimerExt=void 0,t.activeGpuTimerQuery=null,t.pendingGpuTimerQueries=[],t.emit("webglContextLost"))}),this.stageCanvas.addEventListener("webglcontextrestored",function(){requestAnimationFrame(function(){t.webGLContext&&!t.webGLContext.isContextLost()&&t.restoreWebGLContext()})}),this.initPickingFramebuffer()}},{key:"initPickingFramebuffer",value:function(){var t=this.webGLContext,r=t.createFramebuffer();if(!r)throw new Error("Sigma: cannot create picking frame buffer");t.bindFramebuffer(t.FRAMEBUFFER,r);var i=t.createTexture();if(!i)throw new Error("Sigma: cannot create picking texture");t.bindTexture(t.TEXTURE_2D,i),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,1,1,0,t.RGBA,t.UNSIGNED_BYTE,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,i,0);var o=t.createRenderbuffer();if(!o)throw new Error("Sigma: cannot create picking depth buffer");if(t.bindRenderbuffer(t.RENDERBUFFER,o),t.renderbufferStorage(t.RENDERBUFFER,t.DEPTH_COMPONENT16,1,1),t.framebufferRenderbuffer(t.FRAMEBUFFER,t.DEPTH_ATTACHMENT,t.RENDERBUFFER,o),t.checkFramebufferStatus(t.FRAMEBUFFER)!==t.FRAMEBUFFER_COMPLETE)throw new Error("Sigma: picking framebuffer is not complete");t.bindFramebuffer(t.FRAMEBUFFER,null),this.pickingFrameBuffer=r,this.pickingTexture=i,this.pickingDepthBuffer=o}},{key:"initPrograms",value:function(t,r){var i=this,o=this.webGLContext,s=Io(o,this.pickingFrameBuffer,i,t?.nodes,r.antialiasNodes),l=s.nodeProgram,u=s.labelProgram,d=s.backdropProgram,c=s.labelBackgroundProgram,f=s.attachmentProgram,h=s.framePass,p=s.shapeSlug,b=s.shapeNameToIndex,v=s.shapeGlobalIds,g=s.variables;this.nodeProgram=l,this.nodeFramePass=h,this.nodeVariableEntries=Object.entries(g),p&&(this.nodeShapeSlug=p);var m=No(o,this.pickingFrameBuffer,i,t?.edges,r.antialiasEdges,t?.nodes),y=m.edgeProgram,_=m.createLabelPrograms,x=m.framePass,T=m.variables,E=m.paths;return this.createEdgeLabelPrograms=_,this.edgeProgram=y,this.edgeFramePass=x,this.edgeVariableEntries=Object.entries(T),this.edgePathsByName=new Map(E.map(function(A){return[A.name,A]})),{labelProgram:u,edgeLabelProgram:null,edgeLabelBackgroundProgram:null,backdropProgram:d,labelBackgroundProgram:c,attachmentProgram:f,nodeShapeMap:b??null,nodeGlobalShapeIds:v??null}}},{key:"restoreWebGLContext",value:function(){var t,r,i,o,s,l=this.internals;this.initPickingFramebuffer(),(t=l.nodeDataTexture)===null||t===void 0||t.restore(),(r=l.nodeFrameTexture)===null||r===void 0||r.restore(),(i=l.edgeDataTexture)===null||i===void 0||i.restore(),(o=l.edgeFrameTexture)===null||o===void 0||o.restore(),(s=l.attachmentManager)===null||s===void 0||s.restore(),l.hoverResolver.reset(),Object.assign(l,this.initPrograms(l.primitives,l.settings));var u=z(this.customLayerPrograms.values()),d;try{for(u.s();!(d=u.n()).done;){var c=d.value;c.program.kill(),c.program=c.factory(this.webGLContext)}}catch(f){u.e(f)}finally{u.f()}this.contextLost=!1,this.emit("webglContextRestored"),this.refresh()}},{key:"createLayer",value:function(t,r){var i=arguments.length>2&&arguments[2]!==void 0?arguments[2]:{};if(this.extraElements[t])throw new Error('Sigma: a layer named "'.concat(t,'" already exists'));var o=_t(r,{position:"absolute"},{class:"sigma-".concat(t)});return i.style&&Object.assign(o.style,i.style),this.extraElements[t]=o,"beforeLayer"in i&&i.beforeLayer?this.getLayerElement(i.beforeLayer).before(o):"afterLayer"in i&&i.afterLayer?this.getLayerElement(i.afterLayer).after(o):this.container.appendChild(o),o}},{key:"createCanvas",value:function(t){var r=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{};return this.createLayer(t,"canvas",r)}},{key:"createWebGLContext",value:function(t){var r=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},i=this.createCanvas(t,r);r.hidden&&i.remove();var o=i.getContext("webgl2",B({preserveDrawingBuffer:!1,antialias:!1,depth:!0},r));if(!o)throw new Error("Sigma: WebGL 2 is not supported by your browser. Please use a modern browser (Chrome 56+, Firefox 51+, Safari 15+, Edge 79+).");return o.blendFunc(o.ONE,o.ONE_MINUS_SRC_ALPHA),o}},{key:"killLayer",value:function(t){if(t==="stage"||t==="mouse")throw new Error('Sigma: cannot kill built-in layer "'.concat(t,'"'));var r=this.extraElements[t];if(!r)throw new Error("Sigma: cannot kill layer ".concat(t,", which does not exist"));return r.remove(),delete this.extraElements[t],this}},{key:"getWebGLContext",value:function(){if(!this.webGLContext)throw new Error("Sigma: WebGL context is not available");return this.webGLContext}},{key:"getNodeDataTexture",value:function(){if(!this.internals.nodeDataTexture)throw new Error("Sigma: node data texture is not available");return this.internals.nodeDataTexture}},{key:"getNormalizationFunction",value:function(){return this.normalizationFunction}},{key:"addCustomLayerProgram",value:function(t,r,i){var o;if(!this.depthLayers.includes(r))throw new Error('Sigma: cannot add custom layer program at depth "'.concat(r,'", ')+"it must be declared in primitives.depthLayers. Current layers: ".concat(this.depthLayers.join(", ")));(o=this.customLayerPrograms.get(t))===null||o===void 0||o.program.kill();var s=i(this.webGLContext);return this.customLayerPrograms.set(t,{depth:r,factory:i,program:s}),s.cacheData&&s.cacheData(),this.scheduleRender(),this}},{key:"removeCustomLayerProgram",value:function(t){var r=this.customLayerPrograms.get(t);return r&&(r.program.kill(),this.customLayerPrograms.delete(t),this.scheduleRender()),this}},{key:"getCamera",value:function(){return this.camera}},{key:"setCamera",value:function(t){return this.camera.cancelAnimation(),this.unbindCameraHandlers(),this.camera=t,this.bindCameraHandlers(),this.scheduleRender(),this}},{key:"getContainer",value:function(){return this.container}},{key:"getGraph",value:function(){return this.internals.graph}},{key:"setGraph",value:function(t){return t===this.internals.graph?this:(this.stateManager.pruneNodes(function(r){return t.hasNode(r)}),this.stateManager.pruneEdges(function(r){return t.hasEdge(r)}),this.unbindGraphHandlers(),this.checkEdgesEventsFrame!==null&&(cancelAnimationFrame(this.checkEdgesEventsFrame),this.checkEdgesEventsFrame=null),this.internals.graph=t,this.autoRescaleFrozen=!1,this.bindGraphHandlers(),this.refresh(),this)}},{key:"getMouseCaptor",value:function(){return this.mouseCaptor}},{key:"getTouchCaptor",value:function(){return this.touchCaptor}},{key:"getDimensions",value:function(){return{width:this.width,height:this.height}}},{key:"getGraphDimensions",value:function(){var t=this.customBBox||this.nodeExtent;return{width:t.x[1]-t.x[0]||1,height:t.y[1]-t.y[0]||1}}},{key:"getNodeDisplayData",value:function(t){var r=this.internals.nodeDataCache[t];return r?Object.assign({},r):void 0}},{key:"getEdgeDisplayData",value:function(t){var r=this.internals.edgeDataCache[t];return r?Object.assign({},r):void 0}},{key:"getNodeState",value:function(t){return this.stateManager.getNodeState(t)}},{key:"getEdgeState",value:function(t){return this.stateManager.getEdgeState(t)}},{key:"getGraphState",value:function(){return this.stateManager.getGraphState()}},{key:"setNodeState",value:function(t,r){return this.stateManager.setNodeState(t,r),this}},{key:"setEdgeState",value:function(t,r){return this.stateManager.setEdgeState(t,r),this}},{key:"setGraphState",value:function(t){return this.stateManager.setGraphState(t),this}},{key:"_setPanning",value:function(t){this.stateManager.setGraphState({isPanning:t})}},{key:"_setZooming",value:function(t){this.stateManager.setGraphState({isZooming:t})}},{key:"_hasNodeDrag",value:function(){var t=this.internals.dragManager;return!!(t.pendingNode||t.session)}},{key:"_showGestureHint",value:function(t){var r=this.internals.settings;r.gestureTarget==="shared"&&(this.gestureHint=this.gestureHint||new Xc(this.container),this.gestureHint.show(t,r))}},{key:"setNodesState",value:function(t,r){return this.stateManager.setNodesState(t,r),this}},{key:"setEdgesState",value:function(t,r){return this.stateManager.setEdgesState(t,r),this}},{key:"updateContainerCursor",value:function(){var t=this.stateManager.hovered,r=this.resolvedStageStyle.cursor||"";this.container.style.cursor=t&&Fc(this.internals,t)||r}},{key:"refreshStageStyle",value:function(){this.resolvedStageStyle=Ya(this.stylesDeclaration.stage,this.stateManager.graphState),this.resolvedStageStyle.background!==void 0&&(this.container.style.backgroundColor=this.resolvedStageStyle.background),this.updateContainerCursor()}},{key:"getNodeDisplayedLabels",value:function(){return new Set(this.labelRenderer.displayedNodeLabels)}},{key:"getEdgeDisplayedLabels",value:function(){return new Set(this.labelRenderer.displayedEdgeLabels)}},{key:"getSettings",value:function(){return B({},this.internals.settings)}},{key:"getSetting",value:function(t){return this.internals.settings[t]}},{key:"getStyles",value:function(){return B({},this.stylesDeclaration)}},{key:"getPrimitives",value:function(){return B({},this.internals.primitives)}},{key:"setSetting",value:function(t,r){return this.internals.settings[t]=r,On(this.internals.settings),this.handleSettingsUpdate(),this.scheduleRefresh(),this}},{key:"updateSetting",value:function(t,r){return this.setSetting(t,r(this.internals.settings[t])),this}},{key:"setSettings",value:function(t){return this.internals.settings=B(B({},this.internals.settings),t),On(this.internals.settings),this.handleSettingsUpdate(),this.scheduleRefresh(),this}},{key:"resize",value:function(t){var r=this.width,i=this.height;if(this.width=this.container.offsetWidth,this.height=this.container.offsetHeight,this.internals.pixelRatio=jt(),this.width===0)if(this.internals.settings.allowInvalidContainer)this.width=1;else throw new Error("Sigma: Container has no width. You can set the allowInvalidContainer setting to true to stop seeing this error.");if(this.height===0)if(this.internals.settings.allowInvalidContainer)this.height=1;else throw new Error("Sigma: Container has no height. You can set the allowInvalidContainer setting to true to stop seeing this error.");if(!t&&r===this.width&&i===this.height)return this;this.labelRenderer.labelsDirty=!0;for(var o=0,s=[this.mouseLayer].concat($(Object.values(this.extraElements)));o<s.length;o++){var l=s[o];l.style.width=this.width+"px",l.style.height=this.height+"px"}return this.webGLContext&&(this.stageCanvas.setAttribute("width",this.width*this.internals.pixelRatio+"px"),this.stageCanvas.setAttribute("height",this.height*this.internals.pixelRatio+"px"),this.webGLContext.viewport(0,0,this.width*this.internals.pixelRatio,this.height*this.internals.pixelRatio)),this.emit("resize"),this}},{key:"clear",value:function(){return this.emit("beforeClear"),this.webGLContext.bindFramebuffer(WebGLRenderingContext.FRAMEBUFFER,null),this.webGLContext.clear(WebGLRenderingContext.COLOR_BUFFER_BIT),this.emit("afterClear"),this}},{key:"scheduleStateRefresh",value:function(){this.needToRefreshState=!0,this.scheduleRender()}},{key:"refreshState",value:function(){var t=this,r;this.stateManager.flushGraphStateFlags();var i=this.stateManager.graphStateChanged&&this.internals.nodeStyleAnalysis.dependency==="graph-state",o=this.stateManager.graphStateChanged&&this.edgeStyleAnalysis.dependency==="graph-state",s=!1;if(i)this.internals.graph.forEachNode(function(p){t.refreshNodeState(p)&&(s=!0)});else if(this.internals.nodeStyleAnalysis.dependency!=="static"){var l=z(this.stateManager.dirtyNodes),u;try{for(l.s();!(u=l.n()).done;){var d=u.value;this.refreshNodeState(d)&&(s=!0)}}catch(p){l.e(p)}finally{l.f()}}if(o)this.internals.graph.forEachEdge(function(p){t.refreshEdgeState(p)&&(s=!0)});else if(this.edgeStyleAnalysis.dependency!=="static"){var c=z(this.stateManager.dirtyEdges),f;try{for(c.s();!(f=c.n()).done;){var h=f.value;this.refreshEdgeState(h)&&(s=!0)}}catch(p){c.e(p)}finally{c.f()}}this.stateManager.graphStateChanged&&(r=this.stylesDeclaration)!==null&&r!==void 0&&r.stage&&this.refreshStageStyle(),this.stateManager.clearDirtyTracking(),s&&(this.pendingProcess="full")}},{key:"refreshNodeState",value:function(t){var r=this.internals.nodeDataCache[t];if(!r||this.nodeReducer){var i,o,s,l,u=(i=this.internals.nodeDataCache[t])===null||i===void 0?void 0:i.depth,d=(o=this.internals.nodeDataCache[t])===null||o===void 0?void 0:o.zIndex,c=(s=this.internals.nodeDataCache[t])===null||s===void 0?void 0:s.labelAttachment;this.updateNode(t);var f=this.internals.nodeDataCache[t];this.internals.attachmentManager&&f.labelAttachment!==c&&this.internals.attachmentManager.invalidateNode(t);var h;this.internals.nodeShapeMap&&this.internals.nodeGlobalShapeIds&&f.shape&&f.shape in this.internals.nodeShapeMap?h=this.internals.nodeGlobalShapeIds[this.internals.nodeShapeMap[f.shape]]:h=St(f.shape||"circle"),(l=this.internals.nodeDataTexture).updateNode.apply(l,[t,f.x,f.y,f.size,h].concat($(Mn(f)),[f.color])),u&&f.depth!==u&&this.updateNodeDepthRanges(t,u,f.depth);var p=this.nodeProgramIndex[t];return p!==void 0&&(this.addNodeToProgram(t,p),this.nodeProgram.invalidateBuffers()),d!==void 0&&f.zIndex!==d}var b=this.internals.graph.getNodeAttributes(t),v=this.stateManager.getNodeState(t),g=r.size,m=r.shape,y=r.depth,_=r.zIndex,x=r.labelAttachment,T=r.rotationAlignment,E=r.labelRotationAlignment,A=r.color;ja(this.stylesDeclaration.nodes,b,v,this.stateManager.graphState,this.internals.graph,r),this.postEvaluateNode(r,b,v);var C=this.nodeGraphCoords[t],w=r.x!==C.x||r.y!==C.y;if(w&&(C.x=r.x,C.y=r.y),this.normalizationFunction.applyTo(r),this.internals.nodeShapeMap?(!r.shape||!(r.shape in this.internals.nodeShapeMap))&&(r.shape=Object.keys(this.internals.nodeShapeMap)[0]):this.nodeShapeSlug&&(r.shape=this.nodeShapeSlug),this.internals.attachmentManager&&r.labelAttachment!==x&&this.internals.attachmentManager.invalidateNode(t),Ze(this.internals.nodesWithForcedLabels,t,Be(r)),Ze(this.internals.nodesWithBackdrop,t,Za(r)),w||r.size!==g||r.shape!==m||r.rotationAlignment!==T||r.labelRotationAlignment!==E||r.color!==A){var k,R;this.internals.nodeShapeMap&&this.internals.nodeGlobalShapeIds&&r.shape&&r.shape in this.internals.nodeShapeMap?R=this.internals.nodeGlobalShapeIds[this.internals.nodeShapeMap[r.shape]]:R=St(r.shape||"circle"),(k=this.internals.nodeDataTexture).updateNode.apply(k,[t,r.x,r.y,r.size,R].concat($(Mn(r)),[r.color]))}this.itemBuckets.nodes.set(t,r.depth),r.depth!==y&&this.updateNodeDepthRanges(t,y,r.depth);var P=this.nodeProgramIndex[t];return P!==void 0&&(this.addNodeToProgram(t,P),this.nodeProgram.invalidateBuffers()),r.zIndex!==_}},{key:"refreshEdgeState",value:function(t){var r=this.internals.edgeDataCache[t];if(!r||this.edgeReducer){var i=r?.depth,o=r?.zIndex;this.updateEdge(t);var s=this.internals.edgeDataCache[t];i&&s.depth!==i&&this.updateEdgeDepthRanges(t,i,s.depth);var l=this.edgeProgramIndex[t];return l!==void 0&&(this.addEdgeToProgram(t,l),this.edgeProgram.invalidateBuffers()),o!==void 0&&s.zIndex!==o}var u=this.internals.graph.getEdgeAttributes(t),d=this.stateManager.getEdgeState(t),c=r.depth,f=r.zIndex,h=r.size,p=r.path,b=r.selfLoopPath,v=r.parallelPath,g=r.head,m=r.tail;Xa(this.stylesDeclaration.edges,u,d,this.stateManager.graphState,this.internals.graph,r),this.postEvaluateEdge(r,u),this.applyEdgeSpread(t,r,d),Ze(this.internals.edgesWithForcedLabels,t,Be(r)),this.itemBuckets.edges.set(t,r.depth),r.depth!==c&&this.updateEdgeDepthRanges(t,c,r.depth);var y=this.edgeProgramIndex[t];if(y!==void 0){var _=r.size!==h||r.path!==p||r.selfLoopPath!==b||r.parallelPath!==v||r.head!==g||r.tail!==m;if(_)this.addEdgeToProgram(t,y),this.edgeProgram.invalidateBuffers();else{var x=this.internals.graph.source(t),T=this.internals.graph.target(t),E=this.internals.nodeDataCache[x],A=this.internals.nodeDataCache[T],C=this.edgeTextureIndexCache[t];this.edgeProgram.process(rt(this.pickingState,"edge",t),y,E,A,r,C),this.edgeProgram.invalidateBuffers()}}return r.zIndex!==f}},{key:"refresh",value:function(t){var r=this,i=t?.skipIndexation!==void 0?t?.skipIndexation:!1,o=t?.schedule!==void 0?t.schedule:!1,s=!t||!t.partialGraph;if(s)this.clearEdgeIndices(),this.clearNodeIndices(),this.internals.graph.forEachNode(function(E){return r.addNode(E)}),this.edgeGroups.rebuild(),this.internals.graph.forEachEdge(function(E){return r.addEdge(E)}),this.pendingProcess="full";else{for(var l,u,d=((l=t.partialGraph)===null||l===void 0?void 0:l.nodes)||[],c=0,f=d?.length||0;c<f;c++){var h,p,b=""+d[c],v=(h=this.internals.nodeDataCache[b])===null||h===void 0?void 0:h.labelAttachment;if(this.updateNode(b),this.internals.attachmentManager&&((p=this.internals.nodeDataCache[b])!==null&&p!==void 0&&p.labelAttachment||v)&&this.internals.attachmentManager.invalidateNode(b),i){var g=this.nodeProgramIndex[b];if(g===void 0)throw new Error('Sigma: node "'.concat(b,`" can't be repaint`));this.addNodeToProgram(b,g)}}i&&d.length>0&&(this.nodeProgram.invalidateBuffers(),this.labelRenderer.labelsDirty=!0);for(var m=(t==null||(u=t.partialGraph)===null||u===void 0?void 0:u.edges)||[],y=0,_=m.length;y<_;y++){var x=""+m[y];if(this.updateEdge(x),i){var T=this.edgeProgramIndex[x];if(T===void 0)throw new Error('Sigma: edge "'.concat(x,`" can't be repaint`));this.addEdgeToProgram(x,T)}}i&&m.length>0&&(this.edgeProgram.invalidateBuffers(),this.labelRenderer.labelsDirty=!0),!i&&this.pendingProcess!=="full"&&(this.pendingProcess=m.length>0?"full":"nodes")}return o?this.scheduleRender():this.render(),this}},{key:"scheduleRender",value:function(){var t=this;return this.renderFrame||(this.renderFrame=requestAnimationFrame(function(){t.render()})),this}},{key:"scheduleRefresh",value:function(t){return this.refresh(B(B({},t),{},{schedule:!0}))}},{key:"getViewportZoomedState",value:function(t,r){var i=this.camera.getState(),o=i.ratio,s=i.angle,l=i.x,u=i.y,d=this.internals.settings,c=d.minCameraRatio,f=d.maxCameraRatio;typeof f=="number"&&(r=Math.min(r,f)),typeof c=="number"&&(r=Math.max(r,c));var h=r/o,p={x:this.width/2,y:this.height/2},b=this.viewportToFramedGraph(t),v=this.viewportToFramedGraph(p);return{angle:s,x:(b.x-v.x)*(1-h)+l,y:(b.y-v.y)*(1-h)+u,ratio:r}}},{key:"viewRectangle",value:function(){var t=this.viewportToFramedGraph({x:0,y:0}),r=this.viewportToFramedGraph({x:this.width,y:0}),i=this.viewportToFramedGraph({x:0,y:this.height});return{x1:t.x,y1:t.y,x2:r.x,y2:r.y,height:r.y-i.y}}},{key:"framedGraphToViewport",value:function(t){var r=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},i=!!r.cameraState||!!r.viewportDimensions||!!r.graphDimensions||!!r.padding,o=r.matrix||(i?Fe(r.cameraState||this.camera.getState(),r.viewportDimensions||this.getDimensions(),r.graphDimensions||this.getGraphDimensions(),r.padding||this.getStagePadding()):this.matrix),s=Xe(o,t);return{x:(1+s.x)*this.width/2,y:(1-s.y)*this.height/2}}},{key:"viewportToFramedGraph",value:function(t){var r=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},i=!!r.cameraState||!!r.viewportDimensions||!!r.graphDimensions||!!r.padding,o=r.matrix||(i?Fe(r.cameraState||this.camera.getState(),r.viewportDimensions||this.getDimensions(),r.graphDimensions||this.getGraphDimensions(),r.padding||this.getStagePadding(),!0):this.invMatrix),s=Xe(o,{x:t.x/this.width*2-1,y:1-t.y/this.height*2});return isNaN(s.x)&&(s.x=0),isNaN(s.y)&&(s.y=0),s}},{key:"viewportToGraph",value:function(t){var r=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{};return this.normalizationFunction.inverse(this.viewportToFramedGraph(t,r))}},{key:"graphToViewport",value:function(t){var r=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{};return this.framedGraphToViewport(this.normalizationFunction(t),r)}},{key:"graphToFramedGraph",value:function(t){return this.normalizationFunction(t)}},{key:"framedGraphToGraph",value:function(t){return this.normalizationFunction.inverse(t)}},{key:"getGraphToViewportRatio",value:function(){var t={x:0,y:0},r={x:1,y:1},i=Math.sqrt(Math.pow(t.x-r.x,2)+Math.pow(t.y-r.y,2)),o=this.graphToViewport(t),s=this.graphToViewport(r),l=Math.sqrt(Math.pow(o.x-s.x,2)+Math.pow(o.y-s.y,2));return l/i}},{key:"computeNodeExtent",value:function(){var t=this.nodeGraphCoords,r=Object.keys(t);if(!r.length)return{x:[0,1],y:[0,1]};for(var i=1/0,o=-1/0,s=1/0,l=-1/0,u=0,d=r.length;u<d;u++){var c=t[r[u]],f=c.x,h=c.y;f<i&&(i=f),f>o&&(o=f),h<s&&(s=h),h>l&&(l=h)}return{x:[i,o],y:[s,l]}}},{key:"getBBox",value:function(){return this.nodeExtent}},{key:"getCustomBBox",value:function(){return this.customBBox}},{key:"setCustomBBox",value:function(t){return this.customBBox=t,this.scheduleRender(),this}},{key:"kill",value:function(){var t,r,i,o,s;this.emit("kill"),this.removeAllListeners(),this.camera.cancelAnimation(),this.unbindCameraHandlers(),window.removeEventListener("resize",this.activeListeners.handleResize),this.mouseCaptor.kill(),this.touchCaptor.kill(),this.internals.hoverResolver.kill(),this.unbindGraphHandlers(),this.clearIndices(),this.clearState(),this.internals.nodeDataCache={},this.internals.edgeDataCache={},this.renderFrame&&(cancelAnimationFrame(this.renderFrame),this.renderFrame=null);for(var l=this.container;l.firstChild;)l.removeChild(l.firstChild);this.nodeProgram.kill(),this.nodeFramePass.kill(),this.edgeProgram.kill(),this.edgeFramePass.kill(),this.internals.labelProgram.kill(),(t=this.internals.edgeLabelProgram)===null||t===void 0||t.kill(),(r=this.internals.edgeLabelBackgroundProgram)===null||r===void 0||r.kill(),this.internals.backdropProgram.kill(),this.internals.labelBackgroundProgram.kill(),(i=this.internals.attachmentProgram)===null||i===void 0||i.kill(),(o=this.internals.attachmentManager)===null||o===void 0||o.kill(),this.internals.attachmentProgram=null,this.internals.attachmentManager=null;var u=z(this.customLayerPrograms.values()),d;try{for(u.s();!(d=u.n()).done;){var c=d.value.program;c.kill()}}catch(p){u.e(p)}finally{u.f()}if(this.customLayerPrograms.clear(),this.sdfAtlas&&(this.sdfAtlas=null),this.internals.nodeDataTexture&&(this.internals.nodeDataTexture.kill(),this.internals.nodeDataTexture=null),this.internals.nodeFrameTexture&&(this.internals.nodeFrameTexture.kill(),this.internals.nodeFrameTexture=null),this.internals.edgeDataTexture&&(this.internals.edgeDataTexture.kill(),this.internals.edgeDataTexture=null),this.internals.edgeFrameTexture&&(this.internals.edgeFrameTexture.kill(),this.internals.edgeFrameTexture=null),this.webGLContext){var f;(f=this.webGLContext.getExtension("WEBGL_lose_context"))===null||f===void 0||f.loseContext(),this.webGLContext=null}(s=this.gestureHint)===null||s===void 0||s.kill(),this.gestureHint=null,this.mouseLayer.remove();for(var h in this.extraElements)this.extraElements[h].remove();this.extraElements={}}},{key:"scaleSize",value:function(){var t=arguments.length>0&&arguments[0]!==void 0?arguments[0]:1,r=arguments.length>1&&arguments[1]!==void 0?arguments[1]:this.camera.ratio;return t/this.internals.settings.zoomToSizeRatioFunction(r)*(this.getSetting("itemSizesReference")==="positions"?r*this.graphToViewportRatio:1)}},{key:"getStageCanvas",value:function(){return this.stageCanvas}},{key:"getMouseLayer",value:function(){return this.mouseLayer}}])})(Nn),cs=nh;var zf=Ce(je());function hs(a,n){return typeof a=="number"?a:(Y(a)==="object"&&a!==null&&"attribute"in a,n)}function ps(a){var n=a??{},e=n.cornerRadius,t=n.rotation,r=hs(e,0),i=hs(t,0),o=`
`.concat(At,`
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
`);return{name:"square",glsl:o,uniforms:[{name:"u_cornerRadius",type:"float",value:r},{name:"u_rotation",type:"float",value:i}],inradiusFactor:Math.SQRT1_2}}function fs(a,n){return typeof a=="number"?a:(Y(a)==="object"&&a!==null&&"attribute"in a,n)}function vs(a){var n=a??{},e=n.cornerRadius,t=n.rotation,r=fs(e,0),i=fs(t,0),o=`
`.concat(At,`
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
`);return{name:"triangle",glsl:o,uniforms:[{name:"u_cornerRadius",type:"float",value:r},{name:"u_rotation",type:"float",value:i}],inradiusFactor:.5}}function gs(a,n){return typeof a=="number"?a:(Y(a)==="object"&&a!==null&&"attribute"in a,n)}function ms(a){var n=a??{},e=n.cornerRadius,t=n.rotation,r=gs(e,0),i=gs(t,0),o=`
`.concat(At,`
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
`);return{name:"diamond",glsl:o,uniforms:[{name:"u_cornerRadius",type:"float",value:r},{name:"u_rotation",type:"float",value:i}],inradiusFactor:Math.SQRT1_2}}var ah="pixels",rh="butt";function ih(a){return a===void 0||a===!1?{tail:!1,head:!1}:a===!0?{tail:!0,head:!0}:a==="head"?{tail:!1,head:!0}:{tail:!0,head:!1}}function oh(a){var n,e;return a===void 0?{tail:0,head:0}:typeof a=="number"?{tail:a,head:a}:{tail:(n=a.tail)!==null&&n!==void 0?n:0,head:(e=a.head)!==null&&e!==void 0?e:0}}function bs(a){var n,e,t,r,i,o,s,l=a??{},u=(n=l.dashColor)!==null&&n!==void 0?n:{attribute:"color"},d=(e=l.gapColor)!==null&&e!==void 0?e:0,c={dashSize:(t=l.dashSize)!==null&&t!==void 0?t:{value:10,mode:"pixels"},gapSize:(r=l.gapSize)!==null&&r!==void 0?r:{value:10,mode:"pixels"},dashOffset:(i=l.dashOffset)!==null&&i!==void 0?i:{value:0,mode:"pixels"}},f=(o=l.align)!==null&&o!==void 0?o:.5,h=(s=l.cap)!==null&&s!==void 0?s:rh,p=ih(l.solidExtremities),b=oh(l.solidMargin),v=Ht(u,"dashColor"),g=[c.dashSize,c.gapSize,c.dashOffset].map(function(R){var P;return((P=R.mode)!==null&&P!==void 0?P:ah)==="relative"?1:0}),m=[{name:"u_sizeMode",type:"vec3",value:g},{name:"u_align",type:"float",value:f},{name:"u_solidExtremities",type:"vec2",value:[p.tail?1:0,p.head?1:0]},{name:"u_solidMargin",type:"vec2",value:[b.tail,b.head]}],y=$(v.attributes),_=v.needsNodeColors,x;if(typeof d=="number")x="vec4(dashColor.rgb, dashColor.a * ".concat(te(d),")");else{var T=Ht(d,"gapColor");x=T.glsl,y.push.apply(y,$(T.attributes)),_=_||T.needsNodeColors}var E=!("value"in c.dashSize),A=!("value"in c.gapSize),C=!("value"in c.dashOffset);["dashSize","gapSize","dashOffset"].forEach(function(R){if("value"in c[R])m.push({name:"u_".concat(R),type:"float",value:c[R].value});else{var P;y.push({name:"a_".concat(R),size:1,type:WebGL2RenderingContext.FLOAT,source:c[R].attribute}),m.push({name:"u_".concat(R),type:"float",value:(P=c[R].default)!==null&&P!==void 0?P:0})}});var w=function(P,D){return D?"(v_".concat(P," > 0.0 ? v_").concat(P," : u_").concat(P,")"):"u_".concat(P)},k=`
// Dashed pattern layer with antialiased boundaries
// Uniforms:
//   u_dashSize: size of each dash (or default when using attribute)
//   u_gapSize: size of gaps between dashes (or default when using attribute)
//   u_dashOffset: offset to shift the pattern (or default when using attribute)
//   u_sizeMode: vec3 indicating if values are thickness-relative (x=dash, y=gap, z=offset)
//   u_align: pattern alignment (0=start, 0.5=center, 1=end)
//   u_solidExtremities: vec2(tail, head) - 1.0 means solid, 0.0 means dashed
//   u_solidMargin: vec2(tail, head) - extra solid margin in pixels
`.concat(E?"// Varying: v_dashSize for per-edge dash size":"",`
`).concat(A?"// Varying: v_gapSize for per-edge gap size":"",`
`).concat(C?"// Varying: v_dashOffset for per-edge dash offset":"",`

vec4 layer_dashed(EdgeContext ctx) {
  // Dash color (straight alpha, matching v_color and blendOver)
  vec4 dashColor = `).concat(v.glsl,`;

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
  float dashSizeValue = `).concat(w("dashSize",E),`;
  float gapSizeValue = `).concat(w("gapSize",A),`;
  float dashOffsetValue = `).concat(w("dashOffset",C),`;

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
`).concat(h==="round"?`  // Capsule SDF: round caps carved inside the dash length, so a dash never
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
  vec4 gapColor = `).concat(x,`;

  // Blend between gap and dash colors
  return mix(gapColor, dashColor, dashAlpha);
}
`);return{name:"dashed",glsl:k,uniforms:m,attributes:y,needsNodeColors:_}}function ys(a){var n=a??{},e=n.segments,t=e===void 0?16:e,r=`
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
`;return{name:"curved",segments:t,glsl:r,uniforms:[],attributes:[{name:"curvature",size:1,type:WebGL2RenderingContext.FLOAT}],variables:{curvature:{type:"number",default:0}},spread:{variable:"curvature",compute:function(o,s,l){return(o-(s-1)/2)*l}}}}function xs(a){var n=a??{},e=n.lengthRatio,t=e===void 0?5:e,r=n.widthRatio,i=r===void 0?4:r,o=n.margin,s=o===void 0?0:o,l=`
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
`;return{name:"arrow",glsl:l,length:t,widthFactor:i,margin:s,uniforms:[],attributes:[]}}var Uf=Ce(Gn());var Vf=Ce(je());function _s(a,n){return{type:"number",default:a,variable:n?.variable}}function Ts(a,n){return{type:"color",default:a,variable:n?.variable}}function Ss(a,n){return{type:"boolean",default:a,variable:n?.variable}}function Es(a,n){return{type:{enum:a},default:n,variable:!1}}function As(a,n){return{type:"array",items:a,minItems:n?.minItems}}function Sr(a,n){(n==null||n>a.length)&&(n=a.length);for(var e=0,t=Array(n);e<n;e++)t[e]=a[e];return t}function sh(a){if(Array.isArray(a))return Sr(a)}function lh(a){if(typeof Symbol<"u"&&a[Symbol.iterator]!=null||a["@@iterator"]!=null)return Array.from(a)}function uh(a,n){if(a){if(typeof a=="string")return Sr(a,n);var e={}.toString.call(a).slice(8,-1);return e==="Object"&&a.constructor&&(e=a.constructor.name),e==="Map"||e==="Set"?Array.from(a):e==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(e)?Sr(a,n):void 0}}function dh(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function Pt(a){return sh(a)||lh(a)||uh(a)||dh()}function ca(a){"@babel/helpers - typeof";return ca=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(n){return typeof n}:function(n){return n&&typeof Symbol=="function"&&n.constructor===Symbol&&n!==Symbol.prototype?"symbol":typeof n},ca(a)}function Er(a){return ca(a)==="object"&&a!==null&&"attribute"in a}function Rs(a){return typeof a=="string"}function da(a){return ca(a)==="object"&&a!==null&&"attribute"in a}function ch(a){var n=a.filter(function(v){return v.fill}).length,e=te(n||1),t=a.flatMap(function(v,g){if(v.fill)return[];var m=v.size,y=v.mode,_=y==="pixels",x;return da(m)?x="v_borderSize_".concat(g+1):x=te(typeof m=="number"?m:0),_?["  float borderSize_".concat(g+1," = ").concat(x," * context.pixelToUV;")]:["  float borderSize_".concat(g+1," = context.shapeHalfSize * ").concat(x,";")]}).join(`
`),r=a.flatMap(function(v,g){return v.fill?[]:["borderSize_".concat(g+1)]}).join(" + "),i=r||"0.0",o=a.flatMap(function(v,g){return v.fill?["  float borderSize_".concat(g+1," = fillBorderSize;")]:[]}).join(`
`),s=a.map(function(v,g){return"  float boundary_".concat(g+1," = boundary_").concat(g," - borderSize_").concat(g+1,";")}).join(`
`),l=a.map(function(v,g){var m=v.color;return Er(m)?"  vec4 borderColor_".concat(g+1," = v_borderColor_").concat(g+1,";"):"  vec4 borderColor_".concat(g+1," = u_borderColor_").concat(g+1,";")}).join(`
`),u=a.map(function(v,g){return"  borderColor_".concat(g+1,`.a *= bias;
  if (borderSize_`).concat(g+1," <= 2.0 * context.aaWidth) { borderColor_").concat(g+1," = ").concat(g===0?"borderColor_1":"borderColor_".concat(g),"; }")}).join(`
`),d=a.map(function(v,g){return g===0?`if (context.sdf > boundary_1) {
    color = borderColor_1;
  } else `:"if (context.sdf > boundary_".concat(g,` - 2.0 * context.aaWidth) {
    color = mix(borderColor_`).concat(g+1,", borderColor_").concat(g,", (context.sdf - boundary_").concat(g,` + 2.0 * context.aaWidth) / (2.0 * context.aaWidth));
  } else if (context.sdf > boundary_`).concat(g+1,`) {
    color = borderColor_`).concat(g+1,`;
  } else `)}).join(""),c=[].concat(Pt(a.flatMap(function(v,g){var m=v.color;return Er(m)?["vec4 v_borderColor_".concat(g+1)]:[]})),Pt(a.flatMap(function(v,g){var m=v.size;return da(m)?["float v_borderSize_".concat(g+1)]:[]}))),f=a.flatMap(function(v,g){var m=v.color;return Rs(m)?["vec4 u_borderColor_".concat(g+1)]:[]}),h=[].concat(Pt(c),Pt(f)).join(", "),p=da(a[0].size),b=`
vec4 layer_border(`.concat(h,`) {
  const float bias = 255.0 / 254.0;

  // Calculate border sizes (using context.shapeSize and context.pixelSize)
`).concat(t,`
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
  float fillBorderSize = (shapeDepth - (`).concat(i,")) / ").concat(e,`;
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
  `).concat(d,"{ color = borderColor_").concat(a.length,`; }

  return color;
}
`);return b}function ws(a){var n,e=(n=a?.borders)!==null&&n!==void 0?n:[];if(e.length===0)return{name:"border",uniforms:[],attributes:[],glsl:"vec4 layer_border() { return vec4(0.0); }"};var t=WebGL2RenderingContext,r=t.UNSIGNED_BYTE,i=t.FLOAT,o=e.flatMap(function(l,u){var d=l.color;return Rs(d)?[{name:"u_borderColor_".concat(u+1),type:"vec4",value:Ut(d)}]:[]}),s=[].concat(Pt(e.flatMap(function(l,u){var d=l.color;return Er(d)?[{name:"borderColor_".concat(u+1),size:4,type:r,normalized:!0,source:d.attribute,defaultValue:d.default}]:[]})),Pt(e.flatMap(function(l,u){var d=l.size;return da(d)?[{name:"borderSize_".concat(u+1),size:1,type:i,source:d.attribute,defaultValue:d.default}]:[]})));return{name:"border",uniforms:o,attributes:s,glsl:ch(e)}}var Kf={borders:As({size:_s(.1,{variable:!0}),color:Ts("#000000",{variable:!0}),mode:Es(["relative","pixels"],"relative"),fill:Ss(!1)})};var hh=`
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
}`,Ds={},ot=null,Rr=new Set,we=class extends Error{constructor(n,e){super(n),this.kind=e}};async function fa(a=null){return ot||(ot=(async()=>{if(!navigator.gpu)throw new we("navigator.gpu is missing","unsupported");if(a||=await navigator.gpu.requestAdapter({powerPreference:"high-performance"}),!a)throw new we("no WebGPU adapter","unsupported");let n=a.limits,e=1<<30,t=await a.requestDevice({requiredLimits:{maxStorageBufferBindingSize:Math.min(n.maxStorageBufferBindingSize,e),maxBufferSize:Math.min(n.maxBufferSize,e)}});Ds.adapter=a,Ds.gpu=navigator.gpu,t.__adapter=a;let r=a.info||{};return t.__info={vendor:r.vendor||"",architecture:r.architecture||"",description:r.description||"",device:r.device||"",isFallbackAdapter:!!(a.isFallbackAdapter??r.isFallbackAdapter)},t.lost.then(i=>{ot=null;for(let o of[...Rr])o(i)}),t.addEventListener?.("uncapturederror",i=>console.warn("WebGPU error:",i.error?.message)),t})(),ot.catch(()=>{ot=null}),ot)}var Cs=a=>(Rr.add(a),()=>Rr.delete(a)),Ar={pos:8,nstyle:16,order:4,edges:16},Ls=2,ha=class{constructor(n,e,{readback:t=!1}={}){if(this.device=n,this.canvas=e,this.readback=t,t)this.ctx2d=e.getContext("2d"),this.format="rgba8unorm";else{if(this.ctx=e.getContext("webgpu"),!this.ctx)throw new we('canvas.getContext("webgpu") returned null',"context");this.format=navigator.gpu.getPreferredCanvasFormat(),this.ctx.configure({device:n,format:this.format,alphaMode:"premultiplied"})}let r=n.createShaderModule({code:hh});this.module=r;let i={color:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha",operation:"add"}};this.layout=n.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},...[1,2,3,4].map(l=>({binding:l,visibility:GPUShaderStage.VERTEX,buffer:{type:"read-only-storage"}}))]});let o=n.createPipelineLayout({bindGroupLayouts:[this.layout]}),s=(l,u)=>n.createRenderPipeline({layout:o,vertex:{module:r,entryPoint:l},fragment:{module:r,entryPoint:u,targets:[{format:this.format,blend:i}]},primitive:{topology:"triangle-list"}});this.nodePipe=s("vsNode","fsNode"),this.edgePipe=s("vsEdge","fsEdge"),this.uniform=n.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.bufs={},this.caps={},this.counts={nodes:0,order:0,edges:0};for(let l of Object.keys(Ar))this.ensure(l,1024);this.bytes=0}ensure(n,e){let t=Math.max(4,e);if(this.caps[n]>=t)return;let r=this.caps[n]||1024;for(;r<t;)r*=2;let i=r*Ar[n],o=this.device.limits.maxStorageBufferBindingSize;if(i>o)throw new we(`${n} buffer needs ${(i/1048576).toFixed(0)} MB, over the device limit of ${(o/1048576).toFixed(0)} MB`,"out-of-memory");this.device.pushErrorScope("out-of-memory");let s=this.device.createBuffer({size:i,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});this.oomCheck=this.device.popErrorScope().then(l=>{l&&(this.oom=l.message||"out of memory",this.onError?.(new we(`GPU out of memory allocating ${n} (${(i/1048576).toFixed(0)} MB)`,"out-of-memory")))}),this.bufs[n]?.destroy(),this.bufs[n]=s,this.caps[n]=r,this.bindGroup=null}write(n,e,t){this.ensure(n,t),t&&this.device.queue.writeBuffer(this.bufs[n],0,e.buffer,e.byteOffset,t*Ar[n])}setNodes(n,e,t){this.write("pos",n,t),this.write("nstyle",e,t),this.counts.nodes=t}setPositions(n,e){this.write("pos",n,e)}setOrder(n,e){this.write("order",n,e),this.counts.order=e}setEdges(n,e){this.write("edges",n,e),this.counts.edges=e}resize(n,e){(this.canvas.width!==n||this.canvas.height!==e)&&(this.canvas.width=Math.max(1,n),this.canvas.height=Math.max(1,e))}render(n,e){let t=this.device;this.inFlight=(this.inFlight||0)+1;let r=()=>{this.inFlight--,this.onIdle?.()};t.queue.writeBuffer(this.uniform,0,n.buffer,n.byteOffset,64),this.bindGroup||=t.createBindGroup({layout:this.layout,entries:[{binding:0,resource:{buffer:this.uniform}},...["pos","nstyle","order","edges"].map((l,u)=>({binding:u+1,resource:{buffer:this.bufs[l]}}))]});let i=t.createCommandEncoder(),o=this.readback?this.readbackTarget():this.ctx.getCurrentTexture(),s=i.beginRenderPass({colorAttachments:[{view:o.createView(),clearValue:{r:e[0]*e[3],g:e[1]*e[3],b:e[2]*e[3],a:e[3]},loadOp:"clear",storeOp:"store"}]});if(s.setBindGroup(0,this.bindGroup),this.counts.edges&&(s.setPipeline(this.edgePipe),s.draw(6,this.counts.edges)),this.counts.order&&(s.setPipeline(this.nodePipe),s.draw(6,this.counts.order)),s.end(),this.readback&&!this.rb.busy){let{w:l,h:u,stride:d}=this.rb;i.copyTextureToBuffer({texture:o},{buffer:this.rb.buf,bytesPerRow:d},[l,u]),t.queue.submit([i.finish()]),this.rb.busy=this.rb.buf.mapAsync(GPUMapMode.READ).then(()=>{let c=new Uint8Array(this.rb.buf.getMappedRange()),f=new ImageData(l,u);for(let h=0;h<u;h++)f.data.set(c.subarray(h*d,h*d+l*4),h*l*4);this.rb.buf.unmap(),this.ctx2d.putImageData(f,0,0)}).catch(()=>{}).finally(()=>{this.rb.busy=null}),this.lastDone=this.rb.busy.then(()=>performance.now()),this.lastDone.then(r,r);return}t.queue.submit([i.finish()]),this.lastDone=t.queue.onSubmittedWorkDone().then(()=>performance.now()),this.lastDone.then(r,r)}readbackTarget(){let n=this.canvas.width,e=this.canvas.height;if(!this.rb||this.rb.w!==n||this.rb.h!==e){if(this.rb?.busy)return this.rb.tex;this.rb?.tex.destroy(),this.rb?.buf.destroy();let t=Math.ceil(n*4/256)*256;this.rb={w:n,h:e,stride:t,busy:null,tex:this.device.createTexture({size:[n,e],format:this.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC}),buf:this.device.createBuffer({size:t*e,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ})}}return this.rb.tex}async done(){await this.device.queue.onSubmittedWorkDone(),this.rb?.busy&&await this.rb.busy}destroy(){for(let n of Object.values(this.bufs))n.destroy();if(this.uniform.destroy(),this.rb){this.rb.tex.destroy();try{this.rb.buf.destroy()}catch{}}try{this.ctx?.unconfigure()}catch{}this.bufs={}}};function fh(a,n,e,t){let r=n/a,i=t/e;return r<1&&i>1||r>1&&i<1?1:Math.min(Math.max(i,1/i),Math.max(1/r,r))}function wr(a){let[n,e]=a.x,[t,r]=a.y,i=Math.max(e-n,r-t),o=(e+n)/2||0,s=(r+t)/2||0;return(!(i>0)||!Number.isFinite(i))&&(i=1),{dX:o,dY:s,ratio:i,graphW:e-n||1,graphH:r-t||1}}function Ps(a,n,e,t,r=30){let i=Math.min(n,e)-2*r,o=fh(n,e,t.graphW,t.graphH),s=i*o/(a.ratio||1),l=-(a.angle||0);return{w:n,h:e,k:s,c:Math.cos(l),s:Math.sin(l),cx:a.x,cy:a.y,ratio:a.ratio||1,norm:t}}function pa(a,n,e){let t=n-a.cx,r=e-a.cy,i=a.c*t-a.s*r,o=a.s*t+a.c*r;return{x:a.w/2+a.k*i,y:a.h/2-a.k*o}}function st(a,n,e){let t=(n-a.w/2)/a.k,r=(a.h/2-e)/a.k;return{x:a.cx+a.c*t+a.s*r,y:a.cy-a.s*t+a.c*r}}var kt=(a,n,e)=>({x:.5+(n-a.dX)/a.ratio,y:.5+(e-a.dY)/a.ratio}),va=(a,n,e)=>({x:a.dX+a.ratio*(n-.5),y:a.dY+a.ratio*(e-.5)}),sn=a=>1/Math.sqrt(a||1),gh=a=>a<.5?4*a*a*a:1-Math.pow(-2*a+2,3)/2,ga=class{constructor(){this.x=.5,this.y=.5,this.ratio=1,this.angle=0,this.minRatio=null,this.maxRatio=null,this._l=new Map,this._anim=null,this.enabled=!0}on(n,e){return this._l.has(n)||this._l.set(n,new Set),this._l.get(n).add(e),this}off(n,e){return this._l.get(n)?.delete(e),this}removeListener(n,e){return this.off(n,e)}emit(n,e){for(let t of[...this._l.get(n)||[]])t(e)}getState(){return{x:this.x,y:this.y,ratio:this.ratio,angle:this.angle}}getBoundedRatio(n){return typeof this.minRatio=="number"&&(n=Math.max(n,this.minRatio)),typeof this.maxRatio=="number"&&(n=Math.min(n,this.maxRatio)),n}setState(n={}){if(!this.enabled)return this;let e=this.getState();return Number.isFinite(n.x)&&(this.x=n.x),Number.isFinite(n.y)&&(this.y=n.y),Number.isFinite(n.ratio)&&n.ratio>0&&(this.ratio=this.getBoundedRatio(n.ratio)),Number.isFinite(n.angle)&&(this.angle=n.angle),(e.x!==this.x||e.y!==this.y||e.ratio!==this.ratio||e.angle!==this.angle)&&this.emit("updated",this.getState()),this}updateState(n){return this.setState(n(this.getState()))}isAnimating(){return!!this._anim}animate(n,e={},t){let r=typeof e=="object"&&e?e.duration??150:150;if(this._anim){cancelAnimationFrame(this._anim.raf);let l=this._anim.resolve;this._anim=null,l()}if(!r||typeof requestAnimationFrame!="function")return this.setState(n),t?.(),Promise.resolve();let i=this.getState(),o={...i,...n},s=performance.now();return new Promise(l=>{let u=()=>{let d=Math.min(1,(performance.now()-s)/r),c=gh(d);this.setState({x:i.x+(o.x-i.x)*c,y:i.y+(o.y-i.y)*c,ratio:i.ratio*Math.pow(o.ratio/i.ratio,c),angle:i.angle+(o.angle-i.angle)*c}),d<1?this._anim.raf=requestAnimationFrame(u):(this._anim=null,t?.(),l())};this._anim={raf:requestAnimationFrame(u),resolve:l}})}reset(n){return this.animate({x:.5,y:.5,ratio:1,angle:0},n)}animatedZoom(n={}){let e=typeof n=="number"?n:n.factor||1.5;return this.animate({ratio:this.getBoundedRatio(this.ratio/e)},{duration:n.duration??250})}animatedUnzoom(n={}){let e=typeof n=="number"?n:n.factor||1.5;return this.animate({ratio:this.getBoundedRatio(this.ratio*e)},{duration:n.duration??250})}animatedReset(n){return this.reset(n)}};var ma=new Map,ba=null,ya=(a,n,e,t)=>(a&255|(n&255)<<8|(e&255)<<16|(Math.round(t*255)&255)<<24)>>>0;function ln(a){if(a==null||a==="")return 0;let n=ma.get(a);return n!==void 0||(n=ks(String(a).trim()),ma.size>5e3&&ma.clear(),ma.set(a,n)),n}function ks(a){if(a[0]==="#"){let e=a.slice(1);if(e.length===3||e.length===4){let t=[...e].map(r=>parseInt(r+r,16));return ya(t[0],t[1],t[2],e.length===4?t[3]/255:1)}if(e.length===6||e.length===8)return ya(parseInt(e.slice(0,2),16),parseInt(e.slice(2,4),16),parseInt(e.slice(4,6),16),e.length===8?parseInt(e.slice(6,8),16)/255:1)}let n=a.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i);if(n){let e=n[4]==null?1:n[4].endsWith("%")?parseFloat(n[4])/100:parseFloat(n[4]);return ya(+n[1],+n[2],+n[3],Math.max(0,Math.min(1,e)))}if(a==="transparent")return 0;if(typeof document<"u"){ba||=document.createElement("canvas").getContext("2d"),ba.fillStyle="#000",ba.fillStyle=a;let e=ba.fillStyle;if(e!==a)return ks(e)}return ya(102,102,102,1)}var Fs=a=>[a&255,a>>>8&255,a>>>16&255,(a>>>24&255)/255],Dr=(a,n)=>n>=1||n==null?a:(a&16777215|(Math.round((a>>>24&255)*Math.max(0,n))&255)<<24)>>>0;var xa=class{build(n,e,t,r=t.length){let i=1/0,o=-1/0,s=1/0,l=-1/0;for(let y=0;y<r;y++){let _=t[y],x=n[_],T=e[_];x<i&&(i=x),x>o&&(o=x),T<s&&(s=T),T>l&&(l=T)}if(!r||!Number.isFinite(i))return this.count=0,this;let u=Math.max(o-i,1e-9),d=Math.max(l-s,1e-9),c=Math.max(1,Math.min(1<<22,Math.ceil(r/2))),f=Math.max(Math.sqrt(u*d/c),Math.max(u,d)/4096,1e-9),h=Math.max(1,Math.ceil(u/f)+1),p=Math.max(1,Math.ceil(d/f)+1),b=new Uint32Array(h*p+1),v=new Uint32Array(r);for(let y=0;y<r;y++){let _=t[y],x=Math.min(p-1,Math.floor((e[_]-s)/f))*h+Math.min(h-1,Math.floor((n[_]-i)/f));v[y]=x,b[x+1]++}for(let y=0;y<h*p;y++)b[y+1]+=b[y];let g=b.slice(0,h*p),m=new Uint32Array(r);for(let y=0;y<r;y++)m[g[v[y]]++]=t[y];return Object.assign(this,{x0:i,y0:s,cs:f,nx:h,ny:p,start:b,items:m,count:r,xs:n,ys:e}),this}query(n,e,t,r){if(!this.count)return;let{x0:i,y0:o,cs:s,nx:l,ny:u,start:d,items:c}=this,f=Math.max(0,Math.floor((n-t-i)/s)),h=Math.min(l-1,Math.floor((n+t-i)/s)),p=Math.max(0,Math.floor((e-t-o)/s)),b=Math.min(u-1,Math.floor((e+t-o)/s));if(!(h<f||b<p))for(let v=p;v<=b;v++)for(let g=f;g<=h;g++){let m=v*l+g;for(let y=d[m];y<d[m+1];y++)r(c[y])}}};var vh={circle:0,square:1,diamond:2,triangle:3},Ve=Object.freeze({isHidden:!1,isHighlighted:!1,isSelected:!1,isHovered:!1,isPath:!1,isDragged:!1}),mh={readback:!1,enableNodeDrag:!0,enableEdgeEvents:!0,labelDensity:.7,labelRenderedSizeThreshold:6,labelGridCellSize:110,labelBudget:80,labelFont:"system-ui, sans-serif",stagePadding:30,zoomingRatio:1.7,doubleClickZoomingRatio:2.2,dragTolerance:3,minEdgePx:.6},bh=new Set(["x","y","placed"]),_a=class{static async prepare(n){return fa(n)}constructor(n,e,{device:t,styles:r={},settings:i={},onFail:o=null}={}){if(!t)throw new we("WebGPURenderer needs a device (await WebGPURenderer.prepare() first)","device");this.kind="webgpu",this.graph=n,this.container=e,this.styles=r,this.onFail=o,this.settings={...mh,...i},this.camera=new ga,this.listeners=new Map,this.nodeStates=new Map,this.edgeStates=new Map,this.customBBox=null,this.killed=!1,this.frameId=0,this.dirty={structure:!0,style:!0,pos:!0,labels:!0,pick:!0},this.stats={renders:0,cpuMs:[],last:0,uploads:0,uploadMs:0,lastUploadMs:0};let s=l=>{let u=document.createElement("canvas");return u.className=l,Object.assign(u.style,{position:"absolute",inset:"0",width:"100%",height:"100%",display:"block"}),e.appendChild(u),u};this.canvas=s("sigma-webgpu gpu-canvas"),this.labelCanvas=s("sigma-mouse gpu-labels"),this.labelCanvas.style.touchAction="none",this.core=new ha(t,this.canvas,{readback:!!this.settings.readback}),this.core.onError=l=>this.fail(l),this.core.onIdle=()=>{this.pendingRender&&!this.killed&&(this.pendingRender=!1,this.scheduleRender())},this.unlost=Cs(l=>this.fail(new we(`WebGPU device lost${l?.reason?` (${l.reason})`:""}: ${l?.message||""}`,"device-lost"))),this.info=t.__info||{},this.grid=new xa,this.u=new Float32Array(16),this.bindGraph(),this.bindPointer(),this.camera.on("updated",()=>{this.dirty.labels=!0,this.scheduleRender()}),this.resize(),this.process(),this.renderNow()}on(n,e){return this.listeners.has(n)||this.listeners.set(n,new Set),this.listeners.get(n).add(e),this}once(n,e){let t=r=>{this.off(n,t),e(r)};return this.on(n,t)}off(n,e){return this.listeners.get(n)?.delete(e),this}removeListener(n,e){return this.off(n,e)}removeAllListeners(n){return n?this.listeners.delete(n):this.listeners.clear(),this}emit(n,e){for(let t of[...this.listeners.get(n)||[]])try{t(e)}catch(r){console.error(r)}}fail(n){this.killed||this.failed||(this.failed=n,this.emit("fail",n),this.onFail?.(n))}bindGraph(){let n=this.graph,e=this.dirty,t=()=>this.scheduleRender(),r=()=>{e.structure=!0,t()},i=l=>{let u=this.idx?.get(l.key);if(u!==void 0&&l.type==="merge"&&l.data&&Object.keys(l.data).every(d=>bh.has(d))){let d=l.attributes;this.pos[2*u]=d.x,this.pos[2*u+1]=d.y,e.pos=!0,e.pick=!0,e.labels=!0}else{if(u!==void 0&&l.attributes){let d=l.attributes;this.pos[2*u]=Number.isFinite(d.x)?d.x:0,this.pos[2*u+1]=Number.isFinite(d.y)?d.y:0}e.style=!0,e.pos=!0}t()},o=()=>{e.style=!0,t()},s=()=>{e.style=!0,e.pos=!0,e.readPos=!0,t()};this.graphHandlers={nodeAdded:r,nodeDropped:r,edgeAdded:r,edgeDropped:r,cleared:r,edgesCleared:r,nodeAttributesUpdated:i,edgeAttributesUpdated:o,eachNodeAttributesUpdated:s,eachEdgeAttributesUpdated:o};for(let[l,u]of Object.entries(this.graphHandlers))n.on(l,u)}rebuildIndex(){let n=this.graph,e=n.order;this.nodeIds=new Array(e),this.idx=new Map;let t=0;n.forEachNode(s=>{this.nodeIds[t]=s,this.idx.set(s,t),t++});let r=Math.max(16,e);(!this.pos||this.pos.length<2*r)&&(this.pos=new Float32Array(2*r),this.nstyle=new Uint32Array(4*r),this.order=new Uint32Array(r),this.radius=new Float32Array(r),this.hidden=new Uint8Array(r),this.top=new Uint8Array(r));for(let s=0;s<e;s++){let l=n.getNodeAttributes(this.nodeIds[s]);this.pos[2*s]=Number.isFinite(l.x)?l.x:0,this.pos[2*s+1]=Number.isFinite(l.y)?l.y:0}let i=Math.max(16,n.size);(!this.edgeBuf||this.edgeBuf.length<4*i)&&(this.edgeBuf=new Uint32Array(4*i),this.edgeF=new Float32Array(this.edgeBuf.buffer),this.edgeIdsDrawn=new Array(i));let o=[];for(let s=0;s<e;s++)o.push(s);if(e>4e3){let s=new Float64Array(e);for(let l=0;l<e;l++)s[l]=n.degree(this.nodeIds[l]);o.sort((l,u)=>s[u]-s[l]),o.length=4e3}else o.sort((s,l)=>n.degree(this.nodeIds[l])-n.degree(this.nodeIds[s]));this.labelOrder=o;for(let s of this.nodeStates.keys())n.hasNode(s)||this.nodeStates.delete(s);for(let s of this.edgeStates.keys())n.hasEdge(s)||this.edgeStates.delete(s)}getNodeState(n){return this.nodeStates.get(n)||Ve}getEdgeState(n){return this.edgeStates.get(n)||Ve}setNodeState(n,e){let t=this.nodeStates.get(n);return this.nodeStates.set(n,t?Object.assign(t,e):{...Ve,...e}),this.dirty.style=!0,this.scheduleRender(),this}setNodesState(n,e){for(let t of n){let r=this.nodeStates.get(t);r?Object.assign(r,e):this.nodeStates.set(t,{...Ve,...e})}return this.dirty.style=!0,this.scheduleRender(),this}setEdgeState(n,e){return this.setEdgesState([n],e)}setEdgesState(n,e){for(let t of n){let r=this.edgeStates.get(t);r?Object.assign(r,e):this.edgeStates.set(t,{...Ve,...e})}return this.dirty.style=!0,this.scheduleRender(),this}getNodesState(){return this.nodeStates}getGraph(){return this.graph}getContainer(){return this.container}getCamera(){return this.camera}getSetting(n){return this.settings[n]}setSetting(n,e){return this.settings[n]=e,this.dirty.labels=!0,this.scheduleRender(),this}updateSetting(n,e){return this.setSetting(n,e(this.settings[n]))}getSettings(){return{...this.settings}}setCustomBBox(n){return this.customBBox=n?{x:[...n.x],y:[...n.y]}:null,this.dirty.pos=!0,this.scheduleRender(),this}getCustomBBox(){return this.customBBox}getBBox(){return this.extent}getDimensions(){return{width:this.width,height:this.height}}getStagePadding(){return this.settings.stagePadding}process(){let n=this.dirty;if(n.structure&&(this.rebuildIndex(),n.structure=!1,n.style=!0,n.pos=!0,n.upload=!0,n.readPos=!1),n.readPos){let e=this.graph;for(let t=0;t<this.nodeIds.length;t++){let r=e.getNodeAttributes(this.nodeIds[t]);this.pos[2*t]=Number.isFinite(r.x)?r.x:0,this.pos[2*t+1]=Number.isFinite(r.y)?r.y:0}n.readPos=!1,n.pos=!0,n.pick=!0}return n.pos&&this.computeExtent(),n.style&&this.rebuildStyle(),this}computeExtent(){let n=this.nodeIds.length,e=this.pos,t=1/0,r=-1/0,i=1/0,o=-1/0;if(this.customBBox)[t,r]=this.customBBox.x,[i,o]=this.customBBox.y;else for(let s=0;s<n;s++){let l=e[2*s],u=e[2*s+1];l<t&&(t=l),l>r&&(r=l),u<i&&(i=u),u>o&&(o=u)}Number.isFinite(t)||(t=0,r=1,i=0,o=1),this.extent={x:[t,r],y:[i,o]},this.norm=wr(this.extent)}rebuildStyle(){let n=this.graph,e=this.styles,t=this.nodeIds.length,r=!1;for(let g of this.nodeStates.values())if(g.isHighlighted){r=!0;break}let i=this.graphState={hasHighlighted:r,hasHovered:!!this.hoveredNode},o=this.nstyle,s=this.radius,l=this.hidden,u=this.top,d=0,c=[];for(let g=0;g<t;g++){let m=this.nodeIds[g],y=n.getNodeAttributes(m),_=this.nodeStates.get(m)||Ve;if(_.isHidden||y.hidden){l[g]=1,u[g]=0;continue}l[g]=0;let x=e.nodeSize?e.nodeSize(y,_,i):y.size||10,T=e.nodeOpacity?e.nodeOpacity(y):y.opacity??1,E=Dr(ln(e.nodeColor?e.nodeColor(y,_,i):y.color||"#666"),T),A=Dr(ln(e.nodeBorder?e.nodeBorder(y,_,i):y.borderColor||y.color||"#666"),T),C=vh[e.nodeShape?e.nodeShape(y):y.shape]??0;s[g]=x,o[4*g]=xh(x),o[4*g+1]=E,o[4*g+2]=A,o[4*g+3]=C;let w=_.isHovered||_.isSelected||_.isHighlighted;u[g]=w?1:0,w?c.push(g):this.order[d++]=g}for(let g of c)this.order[d++]=g;this.orderCount=d;let f=this.edgeBuf,h=this.edgeF,p=this.edgeIdsDrawn,b=0,v=[];n.forEachEdge((g,m,y,_)=>{let x=this.edgeStates.get(g)||Ve;if(x.isHidden||m.hidden)return;let T=this.idx.get(y),E=this.idx.get(_);if(!(T===void 0||E===void 0||l[T]||l[E])){if(x.isHighlighted||x.isPath){v.push([g,m,x,T,E]);return}this.writeEdge(f,h,p,b++,g,m,x,T,E,i)}});for(let[g,m,y,_,x]of v)this.writeEdge(f,h,p,b++,g,m,y,_,x,i);this.edgeCount=b,this.dirty.style=!1,this.dirty.upload=!0,this.dirty.labels=!0,this.dirty.pick=!0}writeEdge(n,e,t,r,i,o,s,l,u,d){let c=this.styles,f=c.edgeSize?c.edgeSize(o,s,d):o.size||1,h=c.edgeDashed?c.edgeDashed(o,s):!!o.dashed;n[4*r]=l,n[4*r+1]=u,n[4*r+2]=ln(c.edgeColor?c.edgeColor(o,s,d):o.color||"#ccc"),e[4*r+3]=h?-Math.max(f,.001):Math.max(f,.001),t[r]=i}scheduleRender(){return this.killed||this.raf?this:(this.raf=requestAnimationFrame(()=>{this.raf=null,this.renderNow()}),this)}scheduleRefresh(){return this.dirty.style=!0,this.scheduleRender()}refresh(){return this.killed?this:(this.dirty.style=!0,this.dirty.readPos=!0,this.renderNow(),this)}render(){return this.renderNow()}transform(n=this.camera.getState()){return Ps(n,this.width||1,this.height||1,this.norm||wr({x:[0,1],y:[0,1]}),this.settings.stagePadding)}renderNow(){if(this.killed||this.failed)return this;this.raf&&(cancelAnimationFrame(this.raf),this.raf=null);let n=performance.now();this.emit("beforeRender");try{if(this.process(),this.core.inFlight>=Ls)return this.pendingRender=!0,this.stats.skipped=(this.stats.skipped||0)+1,this;let r=this.dirty;if(r.upload){let u=performance.now();this.core.setNodes(this.pos,this.nstyle,this.nodeIds.length),this.core.setOrder(this.order,this.orderCount),this.core.setEdges(this.edgeBuf,this.edgeCount),r.upload=!1,r.pos=!1,this.stats.uploads++,this.stats.lastUploadMs=performance.now()-u,this.stats.uploadMs+=this.stats.lastUploadMs}else r.pos&&(this.core.setPositions(this.pos,this.nodeIds.length),r.pos=!1);let i=this.transform(),o=this.u,s=this.camera;o[0]=this.width,o[1]=this.height,o[2]=s.x,o[3]=s.y,o[4]=i.c,o[5]=i.s,o[6]=i.k,o[7]=sn(s.ratio),o[8]=this.norm.dX,o[9]=this.norm.dY,o[10]=1/this.norm.ratio,o[11]=2,o[12]=7,o[13]=5,o[14]=this.settings.minEdgePx,o[15]=0;let l=Fs(ln(this.styles.background?this.styles.background():"#ffffff"));this.core.render(o,[l[0]/255,l[1]/255,l[2]/255,l[3]]),r.labels&&(this.drawLabels(i),r.labels=!1)}catch(r){return this.fail(r),this}this.frameId++;let e=performance.now()-n,t=this.stats;return t.renders++,t.cpuMs.push(e),t.cpuMs.length>120&&t.cpuMs.shift(),t.last=e,this.emit("afterRender"),this}resize(){let n=this.container.getBoundingClientRect(),e=window.devicePixelRatio||1,t=Math.max(1,Math.round(n.width||this.container.clientWidth||1)),r=Math.max(1,Math.round(n.height||this.container.clientHeight||1));return t===this.width&&r===this.height&&e===this.dpr?this:(this.width=t,this.height=r,this.dpr=e,this.core.resize(Math.round(t*e),Math.round(r*e)),this.labelCanvas.width=Math.round(t*e),this.labelCanvas.height=Math.round(r*e),this.dirty.labels=!0,this.scheduleRender(),this)}drawLabels(n){let e=this.graph,t=this.styles,r=this.labelCanvas,i=r.getContext("2d"),o=this.dpr||1;if(i.setTransform(1,0,0,1,0,0),i.clearRect(0,0,r.width,r.height),i.setTransform(o,0,0,o,0,0),!this.nodeIds?.length)return;let s=this.graphState||{hasHighlighted:!1},l=sn(this.camera.ratio),u=this.width,d=this.height,c=t.labelSize?t.labelSize():14,f=`${c}px ${this.settings.labelFont}`;i.font=f,i.textBaseline="middle";let h=this.settings.labelGridCellSize,p=new Set,b=new Set,v=_=>{let x=kt(this.norm,this.pos[2*_],this.pos[2*_+1]);return pa(n,x.x,x.y)},g=(_,x)=>{let T=this.nodeIds[_];if(b.has(T)||this.hidden[_])return!1;let E=e.getNodeAttributes(T),A=this.nodeStates.get(T)||Ve,C=t.labelVisibility?t.labelVisibility(E,A,s):"auto";if(C==="hidden")return!1;let w=t.label?t.label(E):E.label;if(!w)return!1;let k=v(_),R=this.radius[_]*l;if(k.x<-200||k.y<-50||k.x>u+50||k.y>d+50)return!1;if(!x&&C!=="visible"){if(R<this.settings.labelRenderedSizeThreshold)return!1;let I=`${Math.floor(k.x/h)}:${Math.floor(k.y/(h/3))}`;if(p.has(I))return!1;p.add(I)}let P=k.x+R+3,D=k.y;if(A.isHovered){let I=i.measureText(w).width;i.fillStyle=t.backdrop?t.backdrop():"rgba(255,255,255,0.9)",i.beginPath(),i.roundRect?.(P-4,D-c/2-4,I+8,c+8,5),i.fill()}return i.fillStyle=t.labelColor?t.labelColor(E,A,s):"#000",i.fillText(w,P,D),b.add(T),!0};this.hoveredNode!=null&&this.idx.has(this.hoveredNode)&&g(this.idx.get(this.hoveredNode),!0);let m=0;for(let[_,x]of this.nodeStates){if(m>=300)break;(x.isSelected||x.isHighlighted)&&this.idx.has(_)&&g(this.idx.get(_),!0)&&m++}let y=Math.round(this.settings.labelBudget*(this.settings.labelDensity??.7)/.7);for(let _ of this.labelOrder){if(y<=0)break;g(_,!1)&&y--}}graphToFramedGraph(n){return kt(this.norm,n.x,n.y)}framedGraphToGraph(n){return va(this.norm,n.x,n.y)}framedGraphToViewport(n,e={}){return pa(this.transform(e.cameraState||this.camera.getState()),n.x,n.y)}viewportToFramedGraph(n,e={}){return st(this.transform(e.cameraState||this.camera.getState()),n.x,n.y)}graphToViewport(n,e={}){let t=kt(this.norm,n.x,n.y);return this.framedGraphToViewport(t,e)}viewportToGraph(n,e={}){let t=this.viewportToFramedGraph(n,e);return va(this.norm,t.x,t.y)}getGraphToViewportRatio(){return this.transform().k/this.norm.ratio}getNodeDisplayData(n){let e=this.idx?.get(n);if(e===void 0)return;let t=kt(this.norm,this.pos[2*e],this.pos[2*e+1]);return{x:t.x,y:t.y,size:this.radius[e],color:this.styles.nodeColor?this.styles.nodeColor(this.graph.getNodeAttributes(n),this.getNodeState(n),this.graphState||{}):this.graph.getNodeAttribute(n,"color"),hidden:!!this.hidden[e],label:this.graph.getNodeAttribute(n,"label")}}ensurePick(){if(!this.dirty.pick)return;let n=this.nodeIds.length,e=new Float32Array(n),t=new Float32Array(n);for(let r=0;r<n;r++)e[r]=this.pos[2*r],t[r]=this.pos[2*r+1];this.maxRadius=0;for(let r=0;r<this.orderCount;r++){let i=this.radius[this.order[r]];i>this.maxRadius&&(this.maxRadius=i)}this.grid.build(e,t,this.order,this.orderCount),this.dirty.pick=!1}getNodeAtPosition(n){if(!this.nodeIds?.length)return null;this.process(),this.ensurePick();let e=this.transform(),t=st(e,n.x,n.y),r=va(this.norm,t.x,t.y),i=e.k/this.norm.ratio,o=sn(this.camera.ratio),s=(this.maxRadius*o+2)/i,l=null,u=1/0;return this.grid.query(r.x,r.y,s,d=>{let c=(this.pos[2*d]-r.x)*i,f=(this.pos[2*d+1]-r.y)*i,h=Math.hypot(c,f),p=this.radius[d]*o+1;if(h>p)return;let b=h-(this.top[d]?1e6:0)-d*1e-9;b<u&&(u=b,l=d)}),l==null?null:this.nodeIds[l]}getEdgeAtPosition(n){if(!this.edgeCount||this.edgeCount>3e5)return null;let e=this.transform(),t=sn(this.camera.ratio),r=null,i=1/0,o=s=>{let l=kt(this.norm,this.pos[2*s],this.pos[2*s+1]);return pa(e,l.x,l.y)};for(let s=0;s<this.edgeCount;s++){let l=o(this.edgeBuf[4*s]),u=o(this.edgeBuf[4*s+1]),d=u.x-l.x,c=u.y-l.y,f=d*d+c*c,h=f?((n.x-l.x)*d+(n.y-l.y)*c)/f:0;h=Math.max(0,Math.min(1,h));let p=Math.hypot(n.x-l.x-h*d,n.y-l.y-h*c),b=Math.max(3,Math.abs(this.edgeF[4*s+3])*t/2+2);p<=b&&p<i&&(i=p,r=this.edgeIdsDrawn[s])}return r}bindPointer(){let n=this.labelCanvas,e=this.settings,t=d=>{let c=n.getBoundingClientRect();return{x:d.clientX-c.left,y:d.clientY-c.top}},r=(d,c)=>{let f={x:c.x,y:c.y,original:d,sigmaDefaultPrevented:!1,preventSigmaDefault(){f.sigmaDefaultPrevented=!0}};return f},i=null,o=null,s=null,l=d=>{if(d!==this.hoveredNode){if(this.hoveredNode!=null){let c=this.hoveredNode;this.hoveredNode=null,this.graph.hasNode(c)&&this.setNodeState(c,{isHovered:!1}),this.emit("leaveNode",{node:c})}d!=null&&(this.hoveredNode=d,this.setNodeState(d,{isHovered:!0}),this.emit("enterNode",{node:d})),n.style.cursor=d!=null?"pointer":i?.panning?"grabbing":""}},u={pointerdown:d=>{if(d.button!==0)return;let c=t(d),f=this.getNodeAtPosition(c);i={p:c,start:c,node:f,cam:this.camera.getState(),moved:!1,panning:!f,dragging:!1,id:d.pointerId},n.setPointerCapture?.(d.pointerId),this.emit(f?"downNode":"downStage",{node:f,event:r(d,c)})},pointermove:d=>{let c=t(d);if(i){let f=Math.hypot(c.x-i.start.x,c.y-i.start.y);if(!i.moved&&f<e.dragTolerance)return;if(i.moved=!0,i.node&&e.enableNodeDrag){i.dragging||(i.dragging=!0,this.setNodeState(i.node,{isDragged:!0}),this.emit("nodeDragStart",{node:i.node,event:r(d,c)}));let h=this.viewportToGraph(c);this.graph.mergeNodeAttributes(i.node,{x:h.x,y:h.y}),this.emit("nodeDrag",{node:i.node,event:r(d,c)})}else if(i.panning||!e.enableNodeDrag){let h=this.transform(i.cam),p=st(h,i.start.x,i.start.y),b=st(h,c.x,c.y);this.camera.setState({x:i.cam.x-(b.x-p.x),y:i.cam.y-(b.y-p.y)}),n.style.cursor="grabbing"}return}s=c,!o&&(o=requestAnimationFrame(()=>{o=null,!i&&s&&!this.killed&&l(this.getNodeAtPosition(s))}))},pointerup:d=>{if(!i)return;let c=i;i=null;let f=t(d);if(n.releasePointerCapture?.(c.id),n.style.cursor=this.hoveredNode!=null?"pointer":"",c.dragging){this.setNodeState(c.node,{isDragged:!1}),this.emit("nodeDragEnd",{node:c.node,allDraggedNodes:[c.node],event:r(d,f)});return}c.moved||(c.node?this.emit("clickNode",{node:c.node,event:r(d,f)}):this.emit("clickStage",{event:r(d,f)}))},pointerleave:()=>{i||l(null),this.emit("leaveStage",{})},dblclick:d=>{let c=t(d),f=this.getNodeAtPosition(c),h=r(d,c);this.emit(f?"doubleClickNode":"doubleClickStage",{node:f,event:h}),h.sigmaDefaultPrevented||this.zoomAround(c,e.doubleClickZoomingRatio,250)},contextmenu:d=>{d.preventDefault();let c=t(d),f=this.getNodeAtPosition(c),h=r(d,c);if(f)return this.emit("rightClickNode",{node:f,event:h});let p=this.settings.enableEdgeEvents!==!1?this.getEdgeAtPosition(c):null;if(p)return this.emit("rightClickEdge",{edge:p,event:h});this.emit("rightClickStage",{event:h})},wheel:d=>{d.preventDefault();let c=t(d),f=Math.pow(e.zoomingRatio,Math.max(-1,Math.min(1,-d.deltaY/(d.deltaMode===1?3:100))));this.zoomAround(c,f,0),this.emit("wheelStage",{event:r(d,c)})}};this.domHandlers=u;for(let[d,c]of Object.entries(u))n.addEventListener(d,c,d==="wheel"?{passive:!1}:void 0)}zoomAround(n,e,t=0){let r=this.camera,i=r.getState(),o=r.getBoundedRatio(i.ratio/e),s=st(this.transform(i),n.x,n.y),l={...i,ratio:o},u=st(this.transform(l),n.x,n.y),d={x:i.x+(s.x-u.x),y:i.y+(s.y-u.y),ratio:o};return t?r.animate(d,{duration:t}):r.setState(d)}kill(){if(!this.killed){this.killed=!0,this.raf&&cancelAnimationFrame(this.raf);for(let[n,e]of Object.entries(this.graphHandlers||{}))this.graph.removeListener(n,e);for(let[n,e]of Object.entries(this.domHandlers||{}))this.labelCanvas.removeEventListener(n,e);this.unlost?.(),this.core.destroy(),this.canvas.remove(),this.labelCanvas.remove(),this.emit("kill"),this.listeners.clear()}}perf(){let n=[...this.stats.cpuMs].sort((e,t)=>e-t);return{renders:this.stats.renders,cpuMedianMs:n.length?n[Math.floor(n.length/2)]:0,lastUploadMs:this.stats.lastUploadMs,nodes:this.orderCount||0,edges:this.edgeCount||0,adapter:this.info}}},Is=new Float32Array(1),yh=new Uint32Array(Is.buffer);function xh(a){return Is[0]=a,yh[0]}async function Cr(a=globalThis.navigator,{timeoutMs:n=4e3}={}){let e=a?.gpu;if(!e||typeof e.requestAdapter!="function")return{hasApi:!1,adapter:null,error:null};try{return{hasApi:!0,adapter:await Promise.race([e.requestAdapter({powerPreference:"high-performance"}),new Promise((r,i)=>setTimeout(()=>i(new Error("timed out")),n))])||null,error:null}}catch(t){return{hasApi:!0,adapter:null,error:String(t?.message||t)}}}var Ta="streamgraph.webgpu-bench/1",Pr=[1e4,5e4,1e5,25e4,5e5,1e6],un=["webgl","webgpu"],dn=2,cn=10,Ns=["ok","slow","error","skipped"];function Gs(a,n){let e=a.filter(Number.isFinite).sort((o,s)=>o-s);if(!e.length)return null;let t=(e.length-1)*n,r=Math.floor(t),i=Math.ceil(t);return e[r]+(e[i]-e[r])*(t-r)}function Ge(a){let n=a.filter(Number.isFinite);if(!n.length)return{median:null,p95:null,mean:null,min:null,max:null};let e=t=>t==null?null:Math.round(t*100)/100;return{median:e(Gs(n,.5)),p95:e(Gs(n,.95)),mean:e(n.reduce((t,r)=>t+r,0)/n.length),min:e(Math.min(...n)),max:e(Math.max(...n))}}var kr=a=>a>0?Math.round(1e3/a*10)/10:null;function Ms({error:a=null,oom:n=!1,deviceLost:e=!1,frameMs:t=null}={},r=cn){if(a||n||e)return"error";let i=kr(t?.median);return i==null?"error":i<r?"slow":"ok"}var Fr=a=>a==="error"||a==="slow";function Sa(a){let n={};for(let e of a){let t=n[e.renderer]||={maxOkNodes:0,firstFailure:null};e.status==="ok"?t.maxOkNodes=Math.max(t.maxOkNodes,e.nodes):(e.status==="slow"||e.status==="error")&&!t.firstFailure&&(t.firstFailure={nodes:e.nodes,status:e.status,reason:e.error||(e.oom?"out of memory":e.deviceLost?"device lost":`${e.fps} fps`)})}return n}var lt=a=>typeof a=="number"&&Number.isFinite(a),Lr=a=>a===null||lt(a);function zs(a){let n=[];if(!a||typeof a!="object"||Array.isArray(a))return["result must be an object"];a.schema!==Ta&&n.push(`schema must be "${Ta}"`),(typeof a.createdAt!="string"||Number.isNaN(Date.parse(a.createdAt)))&&n.push("createdAt must be an ISO date string"),typeof a.userAgent!="string"&&n.push("userAgent must be a string");let e=a.environment;!e||typeof e!="object"?n.push("environment must be an object"):((!e.webgpu||typeof e.webgpu.available!="boolean")&&n.push("environment.webgpu.available must be a boolean"),(!e.viewport||!lt(e.viewport.width)||!lt(e.viewport.height))&&n.push("environment.viewport needs numeric width/height"));let t=a.settings;if((!t||!Array.isArray(t.sizes)||!t.sizes.every(r=>Number.isInteger(r)&&r>0))&&n.push("settings.sizes must be positive integers"),t&&!lt(t.durationMs)&&n.push("settings.durationMs must be a number"),t&&!lt(t.minFps)&&n.push("settings.minFps must be a number"),Array.isArray(a.runs)?a.runs.forEach((r,i)=>{let o=`runs[${i}]`;if(!r||typeof r!="object"){n.push(`${o} must be an object`);return}!un.includes(r.renderer)&&r.renderer!=="webgpu-raw"&&n.push(`${o}.renderer must be one of ${un.join(", ")}`),(!Number.isInteger(r.nodes)||r.nodes<=0)&&n.push(`${o}.nodes must be a positive integer`),(!Number.isInteger(r.edges)||r.edges<0)&&n.push(`${o}.edges must be a non-negative integer`),Ns.includes(r.status)||n.push(`${o}.status must be one of ${Ns.join(", ")}`),typeof r.oom!="boolean"&&n.push(`${o}.oom must be a boolean`),typeof r.deviceLost=="boolean"||typeof r.deviceLost=="string"||n.push(`${o}.deviceLost must be a boolean or the loss reason`),r.error===null||typeof r.error=="string"||n.push(`${o}.error must be null or a string`),r.status!=="skipped"&&(Lr(r.initMs)||n.push(`${o}.initMs must be a number or null`),(!r.frameMs||!Lr(r.frameMs.median)||!Lr(r.frameMs.p95))&&n.push(`${o}.frameMs needs median and p95`),r.status==="ok"&&(!lt(r.frameMs?.median)||!lt(r.frameMs?.p95))&&n.push(`${o}: an ok run needs numeric frame times`),r.status==="ok"&&!(r.fps>=(t?.minFps??cn))&&n.push(`${o}: status ok but fps below minFps`))}):n.push("runs must be an array"),Array.isArray(a.runs)&&t?.sizes){let r={};for(let i of a.runs)r[i.renderer]&&i.status!=="skipped"&&n.push(`${i.renderer} continued to ${i.nodes} nodes after it fell below ${t.minFps} fps or errored`),Fr(i.status)&&(r[i.renderer]=!0)}return n}var re=a=>document.querySelector(a),Me=new URLSearchParams(location.search),_h=a=>new Promise(n=>setTimeout(n,a)),Ir=()=>new Promise(a=>requestAnimationFrame(a)),Ea=["#4e79a7","#f28e2b","#e15759","#76b7b2","#59a14f","#edc948","#b07aa1","#ff9da7","#9c755f","#bab0ac"],Bs=["circle","circle","circle","square","diamond","triangle"],hn={background:"#ffffff",text:"#1f2937",muted:"#9ca3af",dim:"#e5e7eb",select:"#ff3ea5",hover:"#2563eb",panel:"#ffffff"};function Th(a){let n=a>>>0;return()=>{n|=0,n=n+1831565813|0;let e=Math.imul(n^n>>>15,1|n);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function Sh(a,n=7){let e=Th(n),t=new ee({type:"directed",multi:!0,allowSelfLoops:!1}),r=200,i=Math.max(1,Math.ceil(a/r)),o=Math.PI*(3-Math.sqrt(5)),s=()=>Math.sqrt(-2*Math.log(e()+1e-12))*Math.cos(2*Math.PI*e());for(let u=0;u<a;u++){let d=Math.floor(u/r),c=Math.sqrt(d+.5)*60,f=d*o;t.addNode(u,{x:Math.cos(f)*c+s()*12,y:Math.sin(f)*c+s()*12,size:3+(u%7===0?4:e()*2),color:Ea[d%Ea.length],borderColor:Ea[d%Ea.length],shape:Bs[u%Bs.length],label:`n${u}`,labelShow:"auto",opacity:1})}let l=Math.round(a*dn);for(let u=0;u<l;u++){let d=Math.floor(e()*a),c=Math.floor(d/r),f=e()<.85?Math.min(a-1,c*r+Math.floor(e()*r)):Math.floor(e()*a);f===d&&(f=(d+1)%a),t.addEdge(d,f,{size:1,color:"#c3cad5",dashed:u%23===0})}return t}var Eh={nodeSize:(a,n)=>(a.size||4)*(n.isHovered?1.35:1),nodeColor:a=>a.color,nodeBorder:a=>a.borderColor||a.color,nodeShape:a=>a.shape,nodeOpacity:a=>a.opacity??1,label:a=>a.label,labelSize:()=>14,labelColor:()=>hn.text,labelVisibility:()=>"auto",edgeSize:a=>a.size||1,edgeColor:a=>a.color,edgeDashed:a=>!!a.dashed,background:()=>hn.background,backdrop:()=>hn.panel};function Ah(a,n){return new cs(a,n,{primitives:{nodes:{shapes:[mt(),ps({cornerRadius:.15}),ms(),vs()],layers:[ws({borders:[{size:2,color:{attribute:"borderColor",default:"#000"},mode:"pixels"},{size:0,color:{attribute:"color"},fill:!0}]})]},edges:{paths:[$t(),Vt(),ys()],extremities:[xs()],layers:[bs({dashSize:{value:7,mode:"pixels"},gapSize:{value:5,mode:"pixels"},gapColor:{attribute:"gapColor"}})]}},styles:{nodes:{x:{attribute:"x"},y:{attribute:"y"},shape:{attribute:"shape",defaultValue:"circle"},size:(e,t)=>(e.size||4)*(t.isHovered?1.35:1),color:{attribute:"color"},borderColor:{attribute:"borderColor"},label:{attribute:"label"},labelSize:()=>14,labelColor:()=>hn.text,opacity:{attribute:"opacity",defaultValue:1}},edges:{size:{attribute:"size"},color:{attribute:"color"},gapColor:e=>e.dashed?"rgba(0,0,0,0)":e.color,parallelPath:"curved"},stage:{background:()=>hn.background}},settings:{enableNodeDrag:!1,enableEdgeEvents:!1,hideEdgesOnMove:!1,labelRenderedSizeThreshold:6,labelDensity:.7,zoomToSizeRatioFunction:e=>Math.sqrt(e),itemSizesReference:"screen",autoRescale:!0}})}var Rh=a=>/out of memory|allocation failed|Invalid array length|Array buffer allocation|RangeError/i.test(String(a?.message||a))||a?.kind==="out-of-memory";async function wh(a,n,{durationMs:e,minFps:t,stage:r}){let i={renderer:a,nodes:n,edges:0,status:"error",genMs:null,initMs:null,uploadMs:null,frames:0,frameMs:Ge([]),fps:null,cpuMs:Ge([]),oom:!1,deviceLost:!1,error:null},o=null,s=null,l=null,u=null,d=document.createElement("div");d.className="bench-stage-inner",r.replaceChildren(d);try{let c=performance.now();o=Sh(n),i.edges=o.size,i.genMs=Math.round(performance.now()-c),await Ir();let f=performance.now();if(a==="webgl"){s=Ah(o,d);for(let m of d.querySelectorAll("canvas"))m.addEventListener("webglcontextlost",()=>{u="webglcontextlost"});s.refresh()}else{let m=await fa();s=new _a(o,d,{device:m,styles:Eh,onFail:y=>{l=y},settings:{enableNodeDrag:!1,readback:Me.get("gpuReadback")==="1"}}),s.refresh(),await s.core.done(),await s.core.oomCheck,i.uploadMs=Math.round(s.stats.uploadMs*10)/10}if(await Ir(),await Ir(),i.initMs=Math.round(performance.now()-f),l)throw l;let h=s.getCamera(),p=[],b=[],v=[],g=a!=="webgl";if(await new Promise(m=>{let y=null,_=performance.now(),x=T=>{!g&&y!=null&&p.push(T-y),y=T;let E=(performance.now()-_)/e;if(E>=1||l||u)return m();if(!g||s.core.inFlight<2){h.setState({x:.5+.22*Math.sin(2*Math.PI*E),y:.5+.22*Math.cos(2*Math.PI*E),ratio:.3+.7*(.5+.5*Math.cos(4*Math.PI*E)),angle:0});let A=performance.now();s.render(),b.push(performance.now()-A),g&&s.core.lastDone&&s.core.lastDone.then(C=>v.push(C))}requestAnimationFrame(x)};requestAnimationFrame(x)}),g){await s.core.done(),await s.core.oomCheck,v.sort((m,y)=>m-y);for(let m=1;m<v.length;m++)p.push(Math.max(v[m]-v[m-1],1e3/240))}if(i.frames=p.length,i.frameMs=Ge(p),i.cpuMs=Ge(b),i.fps=kr(i.frameMs.median),l)throw l;u&&(i.deviceLost=u,i.error="WebGL context lost")}catch(c){i.error=String(c?.message||c).slice(0,500),Rh(c)&&(i.oom=!0),c?.kind==="device-lost"&&(i.deviceLost=i.error)}finally{try{s?.kill()}catch{}o?.clear(),o=null,d.remove()}return i.status=Ms(i,t),i}async function Dh(){let a=await Cr(),n=a.adapter,e=n?.info||{},t=null;try{let r=document.createElement("canvas").getContext("webgl2")||document.createElement("canvas").getContext("webgl"),i=r?.getExtension("WEBGL_debug_renderer_info");t=r?{renderer:i?r.getParameter(i.UNMASKED_RENDERER_WEBGL):r.getParameter(r.RENDERER),vendor:i?r.getParameter(i.UNMASKED_VENDOR_WEBGL):r.getParameter(r.VENDOR),version:r.getParameter(r.VERSION)}:null}catch{}return{webgpu:{available:!!n,hasApi:a.hasApi,error:a.error,adapter:n?{vendor:e.vendor||"",architecture:e.architecture||"",description:e.description||"",device:e.device||"",isFallbackAdapter:!!(n.isFallbackAdapter??e.isFallbackAdapter),maxStorageBufferBindingSize:n.limits.maxStorageBufferBindingSize,maxBufferSize:n.limits.maxBufferSize}:null},webgl:t,devicePixelRatio:window.devicePixelRatio||1,viewport:{width:re("#stage").clientWidth,height:re("#stage").clientHeight},hardwareConcurrency:navigator.hardwareConcurrency||null,deviceMemoryGB:navigator.deviceMemory||null}}var Ra="webgpu-bench-progress";function Os(a,n){try{localStorage.setItem(Ra,JSON.stringify({...a,...n?{incomplete:n}:{}}))}catch{}}var le=window.__bench={done:!1,running:!1,result:null,posted:null,error:null};function Aa(a){let n=a.runs.map(t=>`<tr class="st-${t.status}"><td>${t.renderer}</td><td class="num">${t.nodes.toLocaleString()}</td><td class="num">${t.edges.toLocaleString()}</td><td>${t.status}</td><td class="num">${t.genMs??""}</td><td class="num">${t.initMs??""}</td><td class="num">${t.uploadMs??""}</td><td class="num">${t.frameMs?.median??""}</td><td class="num">${t.frameMs?.p95??""}</td><td class="num">${t.fps??""}</td><td class="num">${t.cpuMs?.median??""}</td><td>${t.oom?"yes":""}</td><td>${t.deviceLost?"yes":""}</td><td class="err">${t.error?String(t.error).replace(/</g,"&lt;"):""}</td></tr>`).join("");re("#results tbody").innerHTML=n;let e=a.summary||Sa(a.runs);re("#summary").textContent=Object.entries(e).map(([t,r])=>`${t}: interactive (\u2265 ${a.settings.minFps} fps) up to ${r.maxOkNodes.toLocaleString()} nodes${r.firstFailure?`; stopped at ${r.firstFailure.nodes.toLocaleString()} (${r.firstFailure.status}: ${r.firstFailure.reason})`:""}`).join("   \xB7   ")}async function Ws(){if(!le.running){le.running=!0,le.done=!1,le.error=null,re("#run").disabled=!0;try{let a=[...document.querySelectorAll("[name=size]:checked")].map(l=>Number(l.value)).sort((l,u)=>l-u),n=[...document.querySelectorAll("[name=renderer]:checked")].map(l=>l.value),e=Math.max(1e3,Number(re("#duration").value)||5e3),t=Number(re("#minfps").value)||cn,r=await Dh(),i={schema:Ta,createdAt:new Date().toISOString(),userAgent:navigator.userAgent,url:location.href,environment:r,settings:{sizes:a,renderers:n,edgeFactor:dn,durationMs:e,minFps:t,seed:7,gpuReadback:Me.get("gpuReadback")==="1",frameTime:"WebGL: interval between animation frames, a render each frame (vsync-capped; 16.7 ms = 60 fps). WebGPU: interval between GPU frame completions with at most 2 frames in flight, a new camera position each frame (completions of frames in the same vsync are floored at 4.2 ms)",cpuTime:"time inside render() per frame (CPU side; GPU work is asynchronous)"},runs:[],summary:null};le.result=i;let o={};for(let l of a)for(let u of n){if(o[u]||u==="webgpu"&&!r.webgpu.available){i.runs.push({renderer:u,nodes:l,edges:Math.round(l*dn),status:"skipped",genMs:null,initMs:null,uploadMs:null,frames:0,frameMs:Ge([]),fps:null,cpuMs:Ge([]),oom:!1,deviceLost:!1,error:o[u]?`not run: stopped after ${o[u]}`:`WebGPU not available${r.webgpu.error?": "+r.webgpu.error:""}`}),Aa(i);continue}re("#status").textContent=`Running ${u} at ${l.toLocaleString()} nodes\u2026`,Os(i,{running:{renderer:u,nodes:l}});let d=await wh(u,l,{durationMs:e,minFps:t,stage:re("#stage")});i.runs.push(d),Aa(i),Os(i,null),Fr(d.status)&&(o[u]=`${l.toLocaleString()} nodes (${d.status})`),await _h(400)}localStorage.removeItem(Ra),i.summary=Sa(i.runs),Aa(i);let s=zs(i);re("#status").textContent=s.length?`Done, but the result failed validation: ${s.join("; ")}`:`Done: ${i.runs.length} runs.`,Me.get("post")==="1"&&await Us()}catch(a){le.error=String(a?.message||a),re("#status").textContent="Benchmark failed: "+le.error}finally{le.running=!1,le.done=!0,re("#run").disabled=!1,document.body.dataset.done="1"}}}function Ch(){if(!le.result)return;let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(le.result,null,2)],{type:"application/json"})),a.download=`webgpu-bench-${le.result.createdAt.replace(/[:.]/g,"-")}.json`,a.click()}async function Us(){if(!le.result)return null;try{let a=await fetch("/api/explore/bench/webgpu",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(le.result)}),n=await a.json();if(!a.ok)throw new Error(n.error+(n.problems?": "+n.problems.join("; "):""));return le.posted=n.file,re("#post-status").textContent=`Saved on the server as ${n.file}`,n}catch(a){return re("#post-status").textContent="Could not save on the server: "+a.message,le.posted=null,null}}function Lh(){let a=(Me.get("sizes")||Pr.join(",")).split(",").map(Number).filter(t=>t>0),n=new Set((Me.get("renderers")||un.join(",")).split(","));re("#sizes").innerHTML=[...new Set([...Pr,...a])].sort((t,r)=>t-r).map(t=>`<label><input type="checkbox" name="size" value="${t}" ${a.includes(t)?"checked":""}> ${t>=1e6?t/1e6+"M":t/1e3+"k"}</label>`).join(""),re("#renderers").innerHTML=un.map(t=>`<label><input type="checkbox" name="renderer" value="${t}" ${n.has(t)?"checked":""}> ${t==="webgpu"?"WebGPU":"WebGL (sigma)"}</label>`).join(""),re("#duration").value=Me.get("duration")||5e3,re("#minfps").value=Me.get("minfps")||cn,re("#run").onclick=Ws,re("#download").onclick=Ch,re("#post").onclick=Us,Cr().then(t=>{re("#env").textContent=t.adapter?`WebGPU adapter: ${[t.adapter.info?.vendor,t.adapter.info?.architecture,t.adapter.info?.description].filter(Boolean).join(" \xB7 ")||"yes"}${t.adapter.isFallbackAdapter||t.adapter.info?.isFallbackAdapter?" (software fallback)":""}`:`No WebGPU adapter${t.error?": "+t.error:t.hasApi?"":" (navigator.gpu missing)"} \u2014 only WebGL will run.`});let e=(()=>{try{return JSON.parse(localStorage.getItem(Ra)||"null")}catch{return null}})();if(e?.incomplete?.running&&Me.get("auto")!=="1"){let t=e.incomplete.running;e.runs.push({renderer:t.renderer,nodes:t.nodes,edges:Math.round(t.nodes*dn),status:"error",genMs:null,initMs:null,uploadMs:null,frames:0,frameMs:Ge([]),fps:null,cpuMs:Ge([]),oom:!0,deviceLost:!1,error:"the browser tab crashed or was closed during this run (likely out of memory)"}),e.summary=Sa(e.runs),delete e.incomplete,le.result=e,Aa(e),re("#status").textContent=`The previous run stopped at ${t.renderer} ${t.nodes.toLocaleString()} nodes (tab crashed?). Its results are below: Download JSON or Send to server, or Run again.`,localStorage.removeItem(Ra)}document.body.dataset.ready="1",Me.get("auto")==="1"&&Ws()}Lh();export{Sh as makeGraph};
/*! For license information please see bench.js.LEGAL.txt */
//# sourceMappingURL=bench.js.map
