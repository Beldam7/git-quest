import{r,z as Me}from"./app-BhqHCVuk.js";import{a as Pe,u as se,D as Se,V as z,c as we,k as ae,l as le,R as Ee,b as Ce,A as je,m as We,S as Re}from"./HeroModel-DObMmWek.js";function q(){return q=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var i in n)({}).hasOwnProperty.call(n,i)&&(e[i]=n[i])}return e},q.apply(null,arguments)}const F=new z,K=new z,Ae=new z,ie=new we;function Oe(e,t,n){const i=F.setFromMatrixPosition(e.matrixWorld);i.project(t);const s=n.width/2,a=n.height/2;return[i.x*s+s,-(i.y*a)+a]}function ze(e,t){const n=F.setFromMatrixPosition(e.matrixWorld),i=K.setFromMatrixPosition(t.matrixWorld),s=n.sub(i),a=t.getWorldDirection(Ae);return s.angleTo(a)>Math.PI/2}function Fe(e,t,n,i){const s=F.setFromMatrixPosition(e.matrixWorld),a=s.clone();a.project(t),ie.set(a.x,a.y),n.setFromCamera(ie,t);const v=n.intersectObjects(i,!0);if(v.length){const y=v[0].distance;return s.distanceTo(n.ray.origin)<y}return!0}function $e(e,t){if(t instanceof le)return t.zoom;if(t instanceof ae){const n=F.setFromMatrixPosition(e.matrixWorld),i=K.setFromMatrixPosition(t.matrixWorld),s=t.fov*Math.PI/180,a=n.distanceTo(i);return 1/(2*Math.tan(s/2)*a)}else return 1}function Te(e,t,n){if(t instanceof ae||t instanceof le){const i=F.setFromMatrixPosition(e.matrixWorld),s=K.setFromMatrixPosition(t.matrixWorld),a=i.distanceTo(s),v=(n[1]-n[0])/(t.far-t.near),y=n[1]-v*t.far;return Math.round(v*a+y)}}const J=e=>Math.abs(e)<1e-10?0:e;function ce(e,t,n=""){let i="matrix3d(";for(let s=0;s!==16;s++)i+=J(t[s]*e.elements[s])+(s!==15?",":")");return n+i}const He=(e=>t=>ce(t,e))([1,-1,1,1,1,-1,1,1,1,-1,1,1,1,-1,1,1]),Ve=(e=>(t,n)=>ce(t,e(n),"translate(-50%,-50%)"))(e=>[1/e,1/e,1/e,1,-1/e,-1/e,-1/e,-1,1/e,1/e,1/e,1,1,1,1,1]);function De(e){return e&&typeof e=="object"&&"current"in e}const Ze=r.forwardRef(({children:e,eps:t=.001,style:n,className:i,prepend:s,center:a,fullscreen:v,portal:y,distanceFactor:p,sprite:k=!1,transform:f=!1,occlude:l,onOcclude:$,castShadow:C,receiveShadow:T,material:L,geometry:M,zIndexRange:P=[16777271,0],calculatePosition:H=Oe,as:R="div",wrapperClass:N,pointerEvents:Q="auto",...g},U)=>{const{gl:X,camera:c,scene:Y,size:m,raycaster:ue,events:fe,viewport:me}=Pe(),[u]=r.useState(()=>document.createElement(R)),B=r.useRef(),h=r.useRef(null),ee=r.useRef(0),V=r.useRef([0,0]),A=r.useRef(null),Z=r.useRef(null),j=(y==null?void 0:y.current)||fe.connected||X.domElement.parentNode,b=r.useRef(null),D=r.useRef(!1),I=r.useMemo(()=>l&&l!=="blending"||Array.isArray(l)&&l.length&&De(l[0]),[l]);r.useLayoutEffect(()=>{const d=X.domElement;l&&l==="blending"?(d.style.zIndex=`${Math.floor(P[0]/2)}`,d.style.position="absolute",d.style.pointerEvents="none"):(d.style.zIndex=null,d.style.position=null,d.style.pointerEvents=null)},[l]),r.useLayoutEffect(()=>{if(h.current){const d=B.current=Me(u);if(Y.updateMatrixWorld(),f)u.style.cssText="position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;";else{const o=H(h.current,c,m);u.style.cssText=`position:absolute;top:0;left:0;transform:translate3d(${o[0]}px,${o[1]}px,0);transform-origin:0 0;`}return j&&(s?j.prepend(u):j.appendChild(u)),()=>{j&&j.removeChild(u),d.unmount()}}},[j,f]),r.useLayoutEffect(()=>{N&&(u.className=N)},[N]);const te=r.useMemo(()=>f?{position:"absolute",top:0,left:0,width:m.width,height:m.height,transformStyle:"preserve-3d",pointerEvents:"none"}:{position:"absolute",transform:a?"translate3d(-50%,-50%,0)":"none",...v&&{top:-m.height/2,left:-m.width/2,width:m.width,height:m.height},...n},[n,a,v,m,f]),de=r.useMemo(()=>({position:"absolute",pointerEvents:Q}),[Q]);r.useLayoutEffect(()=>{if(D.current=!1,f){var d;(d=B.current)==null||d.render(r.createElement("div",{ref:A,style:te},r.createElement("div",{ref:Z,style:de},r.createElement("div",{ref:U,className:i,style:n,children:e}))))}else{var o;(o=B.current)==null||o.render(r.createElement("div",{ref:U,style:te,className:i,children:e}))}});const W=r.useRef(!0);se(d=>{if(h.current){c.updateMatrixWorld(),h.current.updateWorldMatrix(!0,!1);const o=f?V.current:H(h.current,c,m);if(f||Math.abs(ee.current-c.zoom)>t||Math.abs(V.current[0]-o[0])>t||Math.abs(V.current[1]-o[1])>t){const S=ze(h.current,c);let x=!1;I&&(Array.isArray(l)?x=l.map(w=>w.current):l!=="blending"&&(x=[Y]));const O=W.current;if(x){const w=Fe(h.current,c,ue,x);W.current=w&&!S}else W.current=!S;O!==W.current&&($?$(!W.current):u.style.display=W.current?"block":"none");const _=Math.floor(P[0]/2),he=l?I?[P[0],_]:[_-1,0]:P;if(u.style.zIndex=`${Te(h.current,c,he)}`,f){const[w,ne]=[m.width/2,m.height/2],G=c.projectionMatrix.elements[5]*ne,{isOrthographicCamera:oe,top:ve,left:pe,bottom:ge,right:xe}=c,ye=He(c.matrixWorldInverse),be=oe?`scale(${G})translate(${J(-(xe+pe)/2)}px,${J((ve+ge)/2)}px)`:`translateZ(${G}px)`;let E=h.current.matrixWorld;k&&(E=c.matrixWorldInverse.clone().transpose().copyPosition(E).scale(h.current.scale),E.elements[3]=E.elements[7]=E.elements[11]=0,E.elements[15]=1),u.style.width=m.width+"px",u.style.height=m.height+"px",u.style.perspective=oe?"":`${G}px`,A.current&&Z.current&&(A.current.style.transform=`${be}${ye}translate(${w}px,${ne}px)`,Z.current.style.transform=Ve(E,1/((p||10)/400)))}else{const w=p===void 0?1:$e(h.current,c)*p;u.style.transform=`translate3d(${o[0]}px,${o[1]}px,0) scale(${w})`}V.current=o,ee.current=c.zoom}}if(!I&&b.current&&!D.current)if(f){if(A.current){const o=A.current.children[0];if(o!=null&&o.clientWidth&&o!=null&&o.clientHeight){const{isOrthographicCamera:S}=c;if(S||M)g.scale&&(Array.isArray(g.scale)?g.scale instanceof z?b.current.scale.copy(g.scale.clone().divideScalar(1)):b.current.scale.set(1/g.scale[0],1/g.scale[1],1/g.scale[2]):b.current.scale.setScalar(1/g.scale));else{const x=(p||10)/400,O=o.clientWidth*x,_=o.clientHeight*x;b.current.scale.set(O,_,1)}D.current=!0}}}else{const o=u.children[0];if(o!=null&&o.clientWidth&&o!=null&&o.clientHeight){const S=1/me.factor,x=o.clientWidth*S,O=o.clientHeight*S;b.current.scale.set(x,O,1),D.current=!0}b.current.lookAt(d.camera.position)}});const re=r.useMemo(()=>({vertexShader:f?void 0:`
          /*
            This shader is from the THREE's SpriteMaterial.
            We need to turn the backing plane into a Sprite
            (make it always face the camera) if "transfrom"
            is false.
          */
          #include <common>

          void main() {
            vec2 center = vec2(0., 1.);
            float rotation = 0.0;

            // This is somewhat arbitrary, but it seems to work well
            // Need to figure out how to derive this dynamically if it even matters
            float size = 0.03;

            vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
            vec2 scale;
            scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
            scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );

            bool isPerspective = isPerspectiveMatrix( projectionMatrix );
            if ( isPerspective ) scale *= - mvPosition.z;

            vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale * size;
            vec2 rotatedPosition;
            rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
            rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
            mvPosition.xy += rotatedPosition;

            gl_Position = projectionMatrix * mvPosition;
          }
      `,fragmentShader:`
        void main() {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        }
      `}),[f]);return r.createElement("group",q({},g,{ref:h}),l&&!I&&r.createElement("mesh",{castShadow:C,receiveShadow:T,ref:b},M||r.createElement("planeGeometry",null),L||r.createElement("shaderMaterial",{side:Se,vertexShader:re.vertexShader,fragmentShader:re.fragmentShader})))}),Ie=()=>parseInt(Ee.replace(/\D+/g,"")),_e=Ie();class ke extends Re{constructor(){super({uniforms:{time:{value:0},fade:{value:1}},vertexShader:`
      uniform float time;
      attribute float size;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 0.5);
        gl_PointSize = size * (30.0 / -mvPosition.z) * (3.0 + sin(time + 100.0));
        gl_Position = projectionMatrix * mvPosition;
      }`,fragmentShader:`
      uniform sampler2D pointTexture;
      uniform float fade;
      varying vec3 vColor;
      void main() {
        float opacity = 1.0;
        if (fade == 1.0) {
          float d = distance(gl_PointCoord, vec2(0.5, 0.5));
          opacity = 1.0 / (1.0 + exp(16.0 * (d - 0.25)));
        }
        gl_FragColor = vec4(vColor, opacity);

        #include <tonemapping_fragment>
	      #include <${_e>=154?"colorspace_fragment":"encodings_fragment"}>
      }`})}}const Le=e=>new z().setFromSpherical(new We(e,Math.acos(1-Math.random()*2),Math.random()*2*Math.PI)),Ge=r.forwardRef(({radius:e=100,depth:t=50,count:n=5e3,saturation:i=0,factor:s=4,fade:a=!1,speed:v=1},y)=>{const p=r.useRef(),[k,f,l]=r.useMemo(()=>{const C=[],T=[],L=Array.from({length:n},()=>(.5+.5*Math.random())*s),M=new Ce;let P=e+t;const H=t/n;for(let R=0;R<n;R++)P-=H*Math.random(),C.push(...Le(P).toArray()),M.setHSL(R/n,i,.9),T.push(M.r,M.g,M.b);return[new Float32Array(C),new Float32Array(T),new Float32Array(L)]},[n,t,s,e,i]);se(C=>p.current&&(p.current.uniforms.time.value=C.clock.elapsedTime*v));const[$]=r.useState(()=>new ke);return r.createElement("points",{ref:y},r.createElement("bufferGeometry",null,r.createElement("bufferAttribute",{attach:"attributes-position",args:[k,3]}),r.createElement("bufferAttribute",{attach:"attributes-color",args:[f,3]}),r.createElement("bufferAttribute",{attach:"attributes-size",args:[l,1]})),r.createElement("primitive",{ref:p,object:$,attach:"material",blending:je,"uniforms-fade-value":a,depthWrite:!1,transparent:!0,vertexColors:!0}))});export{Ze as H,Ge as S,q as _,_e as v};
