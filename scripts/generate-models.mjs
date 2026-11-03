import {mkdirSync,writeFileSync} from 'node:fs';
// Original procedural demo assets. Units are metres; dimensions are illustrative, not verified servings.
// Run: node scripts/generate-models.mjs            (all models)
//      node scripts/generate-models.mjs dosa idli  (only models whose name contains a filter)
mkdirSync('public/models',{recursive:true});
const TAU=Math.PI*2;

/* ---------- primitive geometry (unit-ish, local space) ---------- */
// Each primitive returns {pos:number[], idx:number[]}; normals are computed after transforming.
function sphere(rows=12,cols=20){const pos=[],idx=[];
 for(let y=0;y<=rows;y++){const a=y*Math.PI/rows;for(let x=0;x<=cols;x++){const b=x*TAU/cols;pos.push(Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b));}}
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=y*(cols+1)+x,b=a+cols+1;idx.push(a,a+1,b,b,a+1,b+1);}return {pos,idx};}
// Revolve a [radius,height] profile around Y. Profiles run from bottom-centre outwards, so faces point out.
function lathe(profile,segs=32){const pos=[],idx=[],n=profile.length;
 for(let i=0;i<n;i++)for(let s=0;s<=segs;s++){const b=s*TAU/segs,[r,y]=profile[i];pos.push(r*Math.cos(b),y,r*Math.sin(b));}
 for(let i=0;i<n-1;i++)for(let s=0;s<segs;s++){const a=i*(segs+1)+s,b=a+segs+1;idx.push(a,b,a+1,a+1,b,b+1);}return {pos,idx};}
// Closed cylinder of radius 1 from y=0..1 with crisp caps (duplicated rim rings).
const cylinder=(segs=28,bevel=.12)=>lathe([[0,0],[1-bevel,0],[1,bevel],[1,1-bevel],[1-bevel,1],[0,1]],segs);
const cone=(segs=28)=>lathe([[0,0],[1,0],[1,.02],[0,1]],segs);
function torus(R=1,r=.35,segs=28,sides=12){const pos=[],idx=[];
 for(let i=0;i<=segs;i++){const u=i*TAU/segs;for(let j=0;j<=sides;j++){const v=j*TAU/sides;pos.push((R+r*Math.cos(v))*Math.cos(u),r*Math.sin(v),(R+r*Math.cos(v))*Math.sin(u));}}
 for(let i=0;i<segs;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;idx.push(a,a+1,b,b,a+1,b+1);}return {pos,idx};}
// Tube swept along a polyline path; radius may be a number or a function of t∈[0,1]. Ends are capped.
function tube(path,radius,sides=12){const pos=[],idx=[],n=path.length,rad=typeof radius==='function'?radius:()=>radius;
 const sub=(a,b)=>a.map((v,i)=>v-b[i]),norm=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 for(let i=0;i<n;i++){const t=norm(sub(path[Math.min(i+1,n-1)],path[Math.max(i-1,0)]));let up=Math.abs(t[1])>.9?[1,0,0]:[0,1,0];const side=norm(cross(t,up)),nrm=cross(side,t),r=rad(i/(n-1));
  for(let j=0;j<=sides;j++){const v=j*TAU/sides,c=Math.cos(v)*r,s=Math.sin(v)*r;pos.push(path[i][0]+side[0]*c+nrm[0]*s,path[i][1]+side[1]*c+nrm[1]*s,path[i][2]+side[2]*c+nrm[2]*s);}}
 for(let i=0;i<n-1;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;idx.push(a,b,a+1,a+1,b,b+1);}
 for(const end of [0,n-1]){const c=pos.length/3;pos.push(...path[end]);for(let j=0;j<sides;j++){const a=end*(sides+1)+j;end?idx.push(c,a,a+1):idx.push(c,a+1,a);}}
 return {pos,idx};}
function box(){const pos=[],idx=[],f=[[[1,0,0],[0,1,0],[0,0,1]],[[-1,0,0],[0,1,0],[0,0,-1]],[[0,1,0],[0,0,1],[1,0,0]],[[0,-1,0],[0,0,-1],[1,0,0]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[-1,0,0],[0,1,0]]];
 for(const [n,u,v] of f){const b=pos.length/3;for(const [a,c] of [[-1,-1],[1,-1],[1,1],[-1,1]])pos.push(...[0,1,2].map(k=>(n[k]+u[k]*a+v[k]*c)*.5));idx.push(b,b+2,b+1,b,b+3,b+2);}return {pos,idx};}

/* ---------- scene parts ---------- */
const geoCache=new Map();const cached=(key,make)=>{if(!geoCache.has(key))geoCache.set(key,make());return geoCache.get(key);};
const P=(geo,at,scale,color,opts={})=>({geo,at,scale:Array.isArray(scale)?scale:[scale,scale,scale],color,...opts});
const ball=(at,scale,color,o={})=>P(cached('s'+(o.res||12),()=>sphere(o.res||12,(o.res||12)*1.7|0)),at,scale,color,o);
const cyl=(at,scale,color,o={})=>P(cached('c'+(o.bevel??.12),()=>cylinder(28,o.bevel??.12)),at,scale,color,o);
const cube=(at,scale,color,o={})=>P(cached('b',box),at,scale,color,o);
const ring=(at,R,r,color,o={})=>P(torus(R,r,o.segs||28,o.sides||10),at,1,color,o);
const pipe=(path,r,color,o={})=>P(tube(path,r,o.sides||10),[0,0,0],1,color,o);
const shape=(geo,at,scale,color,o={})=>P(geo,at,scale,color,o);

// Reusable serveware and colour palette.
const C={plate:[.93,.92,.87],steel:[.72,.74,.76],clay:[.62,.32,.18],copper:[.72,.38,.2],bun:[.76,.42,.14],bunLight:[.86,.58,.26],golden:[.83,.55,.18],crisp:[.7,.4,.1],green:[.23,.45,.12],mint:[.42,.62,.24],red:[.68,.1,.05],onion:[.72,.45,.6],white:[.95,.94,.88],cream:[.96,.9,.74],paneer:[.97,.94,.84],tomato:[.82,.18,.08],yellow:[.93,.72,.16],chutneyGreen:[.38,.55,.18],tamarind:[.35,.15,.06],pistachio:[.55,.68,.3],saffron:[.95,.5,.08]};
const plate=(r=.13,color=C.plate,y=0)=>shape(cached('plate',()=>lathe([[0,0],[.72,0],[.76,.02],[1,.1],[.97,.13],[.72,.05],[0,.05]],40)),[0,y,0],[r,r,r],color,{rough:.35});
const thali=(r=.15)=>shape(cached('thali',()=>lathe([[0,0],[.9,0],[1,.06],[.98,.1],[.9,.035],[0,.035]],44)),[0,0,0],[r,r*.9,r],C.steel,{rough:.3,metal:.85});
// Small bowl (katori) with an optional filling surface.
function bowl(at,r,h,color,fill,{fillLevel=.75,rough=.35,metal=0}={}){const g=cached('bowl',()=>lathe([[0,0],[.62,0],[.66,.04],[1,1],[.93,1],[.58,.1],[0,.1]],36));
 const parts=[shape(g,at,[r,h,r],color,{rough,metal})];
 if(fill){const fr=r*(.6+.33*fillLevel);parts.push(shape(cached('disc',()=>lathe([[0,0],[1,0]],36)),[at[0],at[1]+h*fillLevel,at[2]],[fr,1,fr],fill,{rough:.5}));
  parts.push(ball([at[0],at[1]+h*fillLevel,at[2]],[fr*.98,h*.08,fr*.98],fill,{rough:.5}));}
 return parts;}
const leaf=(at,s,color=C.green,rot=[0,0,0])=>ball(at,[s,s*.18,s*.5],color,{rot,res:6});
let seed=7;const rnd=()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
const scatter=(n,radius,fn)=>{const out=[];for(let i=0;i<n;i++){const a=i*2.39996,r=radius*Math.sqrt((i+.5)/n);out.push(...[].concat(fn(Math.cos(a)*r,Math.sin(a)*r,i)));}return out;};

/* ---------- GLB writer: merges parts per material into one primitive each ---------- */
function rotate([x,y,z],[rx=0,ry=0,rz=0]){let c=Math.cos(rx),s=Math.sin(rx);[y,z]=[y*c-z*s,y*s+z*c];c=Math.cos(ry);s=Math.sin(ry);[x,z]=[x*c+z*s,-x*s+z*c];c=Math.cos(rz);s=Math.sin(rz);[x,y]=[x*c-y*s,x*s+y*c];return [x,y,z];}
function model(name,parts){
 parts=parts.flat(Infinity);
 const groups=new Map();
 for(const part of parts){const key=JSON.stringify([part.color,part.rough??.8,part.metal??0,part.alpha??1]);if(!groups.has(key))groups.set(key,{part,pos:[],idx:[]});const g=groups.get(key),base=g.pos.length/3,{pos,idx}=part.geo;
  for(let i=0;i<pos.length;i+=3){const v=rotate([pos[i]*part.scale[0],pos[i+1]*part.scale[1],pos[i+2]*part.scale[2]],part.rot||[]);g.pos.push(v[0]+part.at[0],v[1]+part.at[1],v[2]+part.at[2]);}
  for(const i of idx)g.idx.push(i+base);}
 const chunks=[],views=[],accessors=[],materials=[],primitives=[];let offset=0;
 function buffer(array,target){const b=Buffer.from(array.buffer);const aligned=Buffer.alloc(Math.ceil(b.length/4)*4);b.copy(aligned);chunks.push(aligned);views.push({buffer:0,byteOffset:offset,byteLength:b.length,target});offset+=aligned.length;return views.length-1;}
 for(const {part,pos,idx} of groups.values()){
  // Smooth vertex normals from area-weighted face normals (handles non-uniform scale and rotation).
  const norm=new Float32Array(pos.length);
  for(let t=0;t<idx.length;t+=3){const [a,b,c]=[idx[t]*3,idx[t+1]*3,idx[t+2]*3];const e1=[pos[b]-pos[a],pos[b+1]-pos[a+1],pos[b+2]-pos[a+2]],e2=[pos[c]-pos[a],pos[c+1]-pos[a+1],pos[c+2]-pos[a+2]];const n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]];for(const v of [a,b,c])for(let k=0;k<3;k++)norm[v+k]+=n[k];}
  for(let i=0;i<norm.length;i+=3){const l=Math.hypot(norm[i],norm[i+1],norm[i+2])||1;norm[i]/=l;norm[i+1]/=l;norm[i+2]/=l;if(l===1&&!norm[i]&&!norm[i+1]&&!norm[i+2])norm[i+1]=1;}
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<pos.length;i++){min[i%3]=Math.min(min[i%3],pos[i]);max[i%3]=Math.max(max[i%3],pos[i]);}
  const big=pos.length/3>65535;
  const p=accessors.length;accessors.push({bufferView:buffer(new Float32Array(pos),34962),componentType:5126,count:pos.length/3,type:'VEC3',min,max});
  const n=accessors.length;accessors.push({bufferView:buffer(norm,34962),componentType:5126,count:norm.length/3,type:'VEC3'});
  const i=accessors.length;accessors.push({bufferView:buffer(big?new Uint32Array(idx):new Uint16Array(idx),34963),componentType:big?5125:5123,count:idx.length,type:'SCALAR'});
  const material={pbrMetallicRoughness:{baseColorFactor:[...part.color,part.alpha??1],roughnessFactor:part.rough??.8,metallicFactor:part.metal??0},doubleSided:true};if((part.alpha??1)<1)material.alphaMode='BLEND';
  materials.push(material);primitives.push({attributes:{POSITION:p,NORMAL:n},indices:i,material:materials.length-1});
 }
 const data={asset:{version:'2.0',generator:'Savour original procedural demo'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0,name}],meshes:[{name,primitives}],materials,accessors,bufferViews:views,buffers:[{byteLength:offset}]};
 const json=Buffer.from(JSON.stringify(data)),jp=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(jp);const bin=Buffer.concat(chunks),header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+jp.length+bin.length,8);jh.writeUInt32LE(jp.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);writeFileSync(`public/models/${name}.glb`,Buffer.concat([header,jh,jp,bh,bin]));
 console.log(`${name}: ${Math.round((28+jp.length+bin.length)/1024)} KB, ${materials.length} materials`);
}

/* ---------- dishes ---------- */
const scenes={};
const flatPlate=ball([0,.004,0],[.105,.004,.105],[.92,.91,.84]);

// Burgers: bun, patty, cheese, tomato, lettuce, sesame seeds.
function burger({patty=[.22,.10,.04],patties=1,cheese=[.95,.61,.08],bun=C.bun,crumb=false,seeds=true,onion=false}={}){
 const s=[flatPlate,ball([0,.020,0],[.062,.015,.061],bun)];let y=.039;
 for(let i=0;i<patties;i++){s.push(ball([0,y,0],[.060,crumb?.013:.009,.059],patty));y+=crumb?.014:.010;if(cheese)s.push(ball([0,y,0],[.064,.003,.061],cheese)),y+=.004;}
 s.push(ball([0,y+.004,0],[.059,.005,.058],[.68,.09,.04]));
 for(let i=0;i<9;i++){const a=i*TAU/9;s.push(ball([Math.cos(a)*.043,y+.001,Math.sin(a)*.043],[.025,.004,.022],[.23,.40,.08]));}
 if(onion)for(let i=0;i<4;i++)s.push(ring([Math.cos(i*1.6)*.02,y+.009,Math.sin(i*1.6)*.02],.016,.002,C.onion,{sides:6}));
 const top=y+.023;s.push(ball([0,top,0],[.063,.022,.062],bun));
 if(seeds)for(let i=0;i<32;i++){const a=i*2.4,r=.048*Math.sqrt((i+.5)/32);s.push(ball([Math.cos(a)*r,top+.022*Math.sqrt(1-r*r/.063**2),Math.sin(a)*r],[.002,.001,.0008],[.96,.84,.56],{res:4}));}
 return s;}
scenes.burger=()=>burger();
scenes['aloo-tikki-burger']=()=>burger({patty:[.78,.52,.17],crumb:true,cheese:null,bun:C.bunLight,onion:true});
scenes['double-smash-burger']=()=>burger({patties:2,onion:true});

// Pizzas
function pizza(toppings){const s=[ball([0,.004,0],[.14,.004,.14],[.92,.91,.84]),ball([0,.014,0],[.125,.009,.125],[.73,.43,.17]),ball([0,.021,0],[.112,.004,.112],[.69,.12,.04])];s.push(toppings());return s;}
scenes.pizza=()=>pizza(()=>{const t=[];for(let i=0;i<12;i++){let a=i*2.4,r=.087*Math.sqrt((i+.5)/12);t.push(ball([Math.cos(a)*r,.025,Math.sin(a)*r],[.022,.003,.019],[.95,.86,.64]));if(i%2===0)t.push(ball([Math.cos(a)*r+.01,.029,Math.sin(a)*r],[.009,.002,.019],[.13,.32,.07]));}return t;});
scenes['tandoori-paneer-pizza']=()=>pizza(()=>[ball([0,.024,0],[.108,.003,.108],[.96,.86,.62]),
 ...scatter(16,.09,(x,z,i)=>cube([x,.029,z],[.014,.01,.014],[.86,.5,.2],{rot:[0,i,0]})),
 ...scatter(10,.085,(x,z,i)=>ring([x+.012,.027,z-.01],.008,.0016,C.onion,{sides:5,segs:14})),
 ...scatter(8,.08,(x,z,i)=>cube([x-.01,.028,z+.012],[.012,.003,.006],C.green,{rot:[0,i*1.3,0]})),
 ...scatter(14,.09,(x,z,i)=>leaf([x*.9+.005,.031,z*.9],.004,[.2,.5,.14],[0,i,0]))]);
scenes['chicken-pepperoni-pizza']=()=>pizza(()=>[ball([0,.024,0],[.108,.003,.108],[.96,.86,.62]),
 ...scatter(18,.095,(x,z)=>cyl([x,.026,z],[.014,.003,.014],[.66,.12,.08],{bevel:.4})),
 ...scatter(10,.09,(x,z,i)=>leaf([x+.006,.03,z-.006],.003,[.3,.45,.18],[0,i,0]))]);

// Pancakes (original asset design, unchanged).
scenes.pancakes=()=>{const s=[flatPlate];for(let i=0;i<3;i++)s.push(ball([0,.014+i*.014,0],[.067,.01,.067],[.72+i*.04,.43+i*.03,.15]));s.push(ball([0,.052,0],[.048,.003,.047],[.37,.15,.035]));for(let i=0;i<9;i++){const a=i*2.4;s.push(ball([Math.cos(a)*.023,.061,Math.sin(a)*.023],[.006,.006,.006],[.08,.09,.19]));}return s;};

// ---- South Indian
scenes['masala-dosa']=()=>{const roll=[];for(let i=0;i<=24;i++){const x=-.17+i*.34/24;roll.push([x,.026,0]);}
 return [shape(cached('oval',()=>lathe([[0,0],[.85,0],[1,.08],[.97,.11],[.82,.04],[0,.04]],44)),[0,0,0],[.21,.1,.15],C.plate,{rough:.35}),
  P(tube(roll,t=>.024*(1-.25*Math.abs(t-.5)*2)+.002,18),[0,.0,.02],[1,.75,1],[.82,.53,.2]),
  ball([.165,.026,.02],[.012,.016,.016],C.yellow),ball([-.165,.026,.02],[.012,.016,.016],C.yellow),
  ...bowl([-.07,.004,-.075],.035,.03,C.steel,[.72,.33,.08],{metal:.85,rough:.3}),
  ...bowl([.03,.004,-.08],.03,.026,C.steel,C.white,{metal:.85,rough:.3}),
  ...bowl([.115,.004,-.072],.026,.024,C.steel,[.62,.18,.06],{metal:.85,rough:.3}),
  ...scatter(5,.022,(x,z)=>ball([-.07+x,.03,-.075+z],.005,[.4,.55,.15],{res:5}))];};
scenes['idli-sambar']=()=>[thali(.15),
 ...[[-.06,.035],[.0,.06],[.06,.03]].map(([x,z])=>ball([x,.019,z],[.036,.016,.036],[.96,.95,.9],{rough:.95})),
 ...bowl([-.055,.004,-.06],.042,.036,C.steel,[.75,.36,.1],{metal:.85,rough:.3}),
 ...scatter(6,.025,(x,z,i)=>ball([-.055+x,.032,-.06+z],[.006,.004,.006],i%2?C.tomato:[.5,.62,.2],{res:5})),
 ...bowl([.05,.004,-.065],.034,.03,C.steel,C.white,{metal:.85,rough:.3}),
 leaf([.05,.028,-.065],.008),leaf([.058,.028,-.06],.007,C.green,[0,1,0])];
scenes['medu-vada']=()=>[thali(.14),
 ...[[-.05,.03],[.035,.045],[.0,-.025]].map(([x,z],i)=>ring([x,.02,z],.026,.014,[.72,.42,.1],{rot:[.06*i,i,0],sides:14})),
 ...bowl([.07,.004,-.06],.033,.03,C.steel,C.white,{metal:.85,rough:.3}),
 ...bowl([-.075,.004,-.06],.035,.032,C.steel,[.75,.36,.1],{metal:.85,rough:.3})];
scenes['mini-uttapam']=()=>[plate(.14),
 ...[[-.045,-.045],[.045,-.045],[-.045,.045],[.045,.045]].flatMap(([x,z],k)=>[cyl([x,.007,z],[.038,.012,.038],[.86,.66,.36],{bevel:.35}),
  ...scatter(9,.028,(dx,dz,i)=>cube([x+dx,.02,z+dz],[.006,.003,.005],[C.onion,C.tomato,C.green][(i+k)%3],{rot:[0,i,0]}))])];

// ---- Curries (bowl + gravy + pieces)
function curry({gravy,pieces=[],swirl=C.cream,garnish=C.green,vessel=C.copper,metal=.75}){
 const s=[plate(.12,C.plate),...bowl([0,.006,0],.085,.065,vessel,gravy,{fillLevel:.7,metal,rough:.3})];
 for(const p of pieces)s.push(p);
 if(swirl)s.push(P(tube(Array.from({length:40},(_,i)=>{const a=i*.32,r=.008+i*.0011;return [Math.cos(a)*r,.054,Math.sin(a)*r];}),.0022,6),[0,0,0],1,swirl,{rough:.4}));
 if(garnish)s.push(...scatter(7,.05,(x,z,i)=>leaf([x,.056,z],.006,garnish,[0,i,0])));
 return s;}
scenes['butter-chicken']=()=>curry({gravy:[.85,.38,.1],pieces:scatter(7,.055,(x,z,i)=>ball([x,.05,z],[.018,.01,.014],[.72,.27,.08],{rot:[0,i,0],res:8}))});
scenes['shahi-paneer']=()=>curry({gravy:[.93,.62,.3],pieces:scatter(7,.055,(x,z,i)=>cube([x,.051,z],[.019,.014,.019],C.paneer,{rot:[0,i*.7,0]})),garnish:[.6,.42,.2]});
scenes['dal-makhani']=()=>curry({gravy:[.36,.15,.06],pieces:[cube([.02,.054,-.01],[.016,.01,.016],[.98,.86,.4],{rot:[0,.5,0]})]});
scenes['palak-paneer']=()=>curry({gravy:[.25,.42,.1],pieces:scatter(7,.055,(x,z,i)=>cube([x,.051,z],[.018,.014,.018],C.paneer,{rot:[0,i*.7,0]})),garnish:null});
scenes['rogan-josh']=()=>curry({gravy:[.55,.08,.04],pieces:scatter(6,.05,(x,z,i)=>ball([x,.05,z],[.02,.012,.017],[.35,.1,.05],{rot:[0,i,0],res:8})),swirl:null});

// ---- Biryani handi with raita
scenes['chicken-biryani']=()=>{const handi=shape(cached('handi',()=>lathe([[0,0],[.7,0],[.95,.25],[1,.55],[.86,.86],[.82,1],[.88,1.04],[.84,1.06],[.76,.95],[0,.95]],36)),[0,.0,0],[.085,.07,.085],C.copper,{metal:.8,rough:.3});
 const rice=[],grain=cached('s5',()=>sphere(4,7));
 for(let i=0;i<260;i++){const a=rnd()*TAU,r=.068*Math.sqrt(rnd()),h=.067+.022*(1-(r/.07)**2);rice.push(P(grain,[Math.cos(a)*r,h,Math.sin(a)*r],[.0055,.0013,.0013],rnd()<.22?C.saffron:[.98,.96,.88],{rot:[0,rnd()*TAU,rnd()*.6]}));}
 return [plate(.15),handi,ball([0,.064,0],[.07,.026,.07],[.97,.93,.8]),...rice,
  ...[[.02,.01],[-.025,-.015]].map(([x,z],i)=>ball([x,.09,z],[.022,.014,.018],[.6,.26,.07],{rot:[0,i,0]})),
  ...scatter(14,.055,(x,z,i)=>ball([x,.093,z],[.006,.0015,.003],[.42,.2,.06],{rot:[0,i,0],res:5})),
  ...scatter(5,.04,(x,z,i)=>leaf([x+.01,.095,z],.007,C.mint,[0,i,0])),
  ...bowl([.105,.004,-.075],.03,.026,C.steel,[.95,.95,.9],{metal:.85,rough:.3})];};

// ---- Tandoor & starters
function drumstick(at,rot,color){const g=cached('drum',()=>lathe([[0,0],[.3,.02],[.75,.12],[1,.35],[.85,.62],[.45,.86],[.22,1],[0,1.0]],20));
 return [shape(g,at,[.028,.1,.028],color,{rot}),shape(g,at,[.009,.125,.009],[.94,.9,.8],{rot})];}
scenes['tandoori-chicken']=()=>[plate(.14),...drumstick([-.02,.03,.03],[0,0,1.45],[.75,.2,.06]),...drumstick([.03,.028,-.03],[0,2.6,1.5],[.72,.18,.06]),
 ball([.0,.03,-.005],[.045,.022,.035],[.7,.17,.05],{rot:[0,.6,0]}),
 ...[0,1,2].map(i=>ring([.075-i*.01,.008+i*.002,.06-i*.015],.018-i*.003,.003,[.88,.78,.85],{sides:6})),
 ball([-.08,.012,-.05],[.022,.011,.014],C.yellow,{rot:[0,.8,0],rough:.4}),...scatter(6,.035,(x,z,i)=>leaf([-.06+x,.01,.07+z],.008,C.green,[0,i,0]))];
scenes['paneer-tikka']=()=>{const s=[plate(.14)];
 for(const [z,ry] of [[-.03,0],[.035,.12]]){s.push(pipe([[-.13,.026,z],[.13,.026,z+.02]],.0018,[.6,.6,.62],{metal:.9,rough:.3}));
  for(let i=0;i<7;i++){const x=-.09+i*.03,zz=z+.01+(x+.13)/.26*.02-.01,c=i%2===0?[.88,.5,.18]:[C.green,C.onion,[.85,.2,.1]][(i>>1)%3];s.push(cube([x,.026,zz],i%2===0?[.026,.024,.026]:[.02,.022,.022],c,{rot:[.2*i,ry+i*.15,0]}));}}
 s.push(...bowl([.08,.004,-.08],.03,.026,C.steel,C.chutneyGreen,{metal:.85,rough:.3}),...[0,1].map(i=>ring([-.08+i*.015,.008,.08],.016,.003,[.88,.78,.85],{sides:6})));return s;};
scenes['chicken-65']=()=>[plate(.14),...Array.from({length:16},(_,i)=>{const a=rnd()*TAU,r=.075*Math.sqrt(rnd());return ball([Math.cos(a)*r,.02+rnd()*.012,Math.sin(a)*r],[.017,.012,.012],[[.62,.14,.05],[.7,.16,.05],[.56,.12,.04]][i%3],{rot:[rnd(),rnd()*TAU,rnd()],res:7,rough:.6});}),
 ...scatter(10,.07,(x,z,i)=>leaf([x,.04,z],.008,[.1,.32,.08],[0,i,.3])),...[0,1].map(i=>ring([.08,.008+i*.002,.07-i*.012],.018,.003,[.88,.78,.85],{sides:6})),ball([-.09,.012,.06],[.022,.011,.014],C.yellow,{rough:.4})];
scenes['butter-naan']=()=>[plate(.15),ball([0,.012,0],[.12,.008,.075],[.9,.72,.45],{rot:[0,.3,0],rough:.6}),
 ...Array.from({length:24},()=>{const a=rnd()*TAU,r=Math.sqrt(rnd());return ball([Math.cos(a)*r*.1,.018,Math.sin(a)*r*.06],[.008,.002,.006],[.45,.25,.08],{rot:[0,a+.3,0],res:5});}),
 ball([.0,.02,0],[.06,.0015,.035],[.98,.8,.3],{alpha:.55,rough:.2}),...scatter(18,.07,(x,z)=>ball([x,.021,z*.6],.0015,[.1,.1,.1],{res:4}))];

// ---- Street food
const samosaGeo=()=>cached('samosa',()=>lathe([[0,0],[1,0],[.95,.08],[.08,1],[0,1]],3));
scenes.samosa=()=>[plate(.14),shape(samosaGeo(),[-.035,.006,.0],[.05,.07,.05],[.82,.55,.2],{rot:[0,.3,0],rough:.85}),shape(samosaGeo(),[.045,.006,.02],[.048,.066,.048],[.8,.52,.18],{rot:[0,1.4,0],rough:.85}),
 ...bowl([-.06,.004,-.08],.026,.024,C.steel,C.chutneyGreen,{metal:.85,rough:.3}),...bowl([.02,.004,-.09],.026,.024,C.steel,C.tamarind,{metal:.85,rough:.3}),
 ...scatter(5,.03,(x,z,i)=>ring([.08+x,.006,-.06+z],.008,.0025,[.88,.78,.85],{sides:6}))];
scenes['pani-puri']=()=>[thali(.15),...Array.from({length:6},(_,i)=>{const a=i*TAU/6;return [ball([Math.cos(a)*.085,.024,Math.sin(a)*.085],[.022,.019,.022],[.86,.62,.28],{rough:.7}),ball([Math.cos(a)*.085,.04,Math.sin(a)*.085],[.008,.002,.008],[.5,.33,.12])];}),
 shape(cached('glass',()=>lathe([[0,0],[.8,0],[1,1],[.95,1],[.75,.04],[0,.04]],32)),[0,.004,0],[.034,.07,.034],[.85,.92,.88],{alpha:.35,rough:.05}),
 cyl([0,.006,0],[.03,.05,.03],[.35,.58,.16],{alpha:.85,rough:.2,bevel:.02}),...scatter(4,.015,(x,z)=>leaf([x,.057,z],.005,C.mint))];
scenes['pav-bhaji']=()=>[thali(.16),ball([-.035,.03,0],[.08,.026,.07],[.75,.28,.08],{rough:.6}),cube([-.03,.054,-.005],[.02,.012,.02],[.98,.86,.4],{rot:[0,.4,0]}),
 ...scatter(14,.05,(x,z,i)=>cube([-.035+x,.055,z],[.004,.002,.004],i%3?C.onion:C.white,{rot:[0,i,0]})),...scatter(8,.05,(x,z,i)=>leaf([-.035+x,.056,z],.004,C.green,[0,i,0])),
 ...[[.085,-.03],[.085,.03]].flatMap(([x,z])=>[ball([x,.022,z],[.034,.02,.03],[.84,.52,.2],{rough:.6}),ball([x,.03,z],[.03,.012,.026],[.62,.3,.08],{rough:.5})]),
 ball([-.09,.012,.08],[.022,.011,.014],C.yellow,{rough:.4})];
scenes['vada-pav']=()=>[plate(.12),ball([0,.018,0],[.052,.015,.05],C.bunLight),ball([0,.032,0],[.045,.004,.043],[.7,.15,.06]),ball([0,.045,0],[.042,.022,.042],[.85,.62,.15],{rough:.9}),
 ball([0,.074,0],[.054,.022,.052],[.8,.48,.16]),ball([.0,.063,0],[.05,.004,.048],C.chutneyGreen),
 P(tube(Array.from({length:12},(_,i)=>[.06+i*.004,.008,-.04+i*.006+Math.sin(i*.4)*.004]),t=>.004*(1-t*.6)+.001,8),[0,0,0],1,[.25,.48,.1],{rough:.4}),
 P(tube(Array.from({length:12},(_,i)=>[-.08+i*.004,.008,.05-i*.003]),t=>.004*(1-t*.6)+.001,8),[0,0,0],1,[.25,.48,.1],{rough:.4})];
scenes['chole-bhature']=()=>[thali(.17),...[[-.06,.04,.3],[.02,.075,1.1]].map(([x,z,r])=>ball([x,.03,z],[.07,.028,.06],[.9,.7,.4],{rot:[0,r,0],rough:.6})),
 ...bowl([.07,.004,-.05],.05,.042,C.steel,[.45,.2,.07],{metal:.85,rough:.3}),...scatter(18,.035,(x,z)=>ball([.07+x,.038,-.05+z],.006,[.62,.42,.2],{res:6})),
 ...[0,1,2].map(i=>ring([-.07+i*.012,.008,-.08],.014,.003,[.82,.45,.62],{sides:6}))];
scenes['aloo-tikki-chaat']=()=>[plate(.14),...[[-.035,0],[.04,.01]].flatMap(([x,z])=>[cyl([x,.008,z],[.038,.016,.038],[.78,.5,.15],{bevel:.4}),ball([x,.025,z],[.036,.009,.036],C.white,{rough:.5})]),
 P(tube(Array.from({length:30},(_,i)=>[-.07+i*.005,.035,Math.sin(i*.6)*.025]),.0022,6),[0,0,0],1,C.tamarind,{rough:.3}),
 P(tube(Array.from({length:26},(_,i)=>[-.06+i*.005,.036,.012+Math.cos(i*.7)*.02]),.002,6),[0,0,0],1,C.chutneyGreen,{rough:.3}),
 ...Array.from({length:40},()=>{const a=rnd()*TAU,r=.06*Math.sqrt(rnd());return cube([Math.cos(a)*r,.037,Math.sin(a)*r],[.008,.0015,.0015],[.92,.68,.18],{rot:[0,rnd()*TAU,0]});}),
 ...scatter(10,.05,(x,z)=>ball([x,.038,z],.0035,[.75,.05,.12],{res:5,rough:.2}))];

// ---- Sweets
scenes['gulab-jamun']=()=>[plate(.11),...bowl([0,.006,0],.07,.045,[.95,.94,.9],[.62,.32,.08],{fillLevel:.6,rough:.25}),
 ...[[-.02,-.015],[.022,-.012],[0,.024]].map(([x,z])=>ball([x,.04,z],.019,[.3,.1,.03],{rough:.25,res:14})),...scatter(6,.03,(x,z,i)=>cube([x,.06,z],[.006,.0015,.002],C.pistachio,{rot:[0,i,0]}))];
scenes.jalebi=()=>{const s=[plate(.13)];for(const [cx,cz,k] of [[-.04,-.02,0],[.035,-.03,1],[0,.04,2],[.05,.04,3]]){const path=[];for(let i=0;i<=70;i++){const t=i/70,a=t*TAU*2.6+k,r=.006+t*.026;path.push([cx+Math.cos(a)*r,.012+k*.002+Math.sin(t*20)*.0015,cz+Math.sin(a)*r]);}s.push(P(tube(path,.0042,8),[0,0,0],1,[.95,.52,.06],{rough:.25}));}return s;};
scenes.rasmalai=()=>[plate(.11),...bowl([0,.006,0],.072,.04,[.95,.94,.9],[.97,.88,.62],{fillLevel:.65,rough:.25}),
 ...[[-.02,0],[.025,.01]].map(([x,z])=>ball([x,.035,z],[.024,.009,.024],[.98,.95,.85],{rough:.6})),
 ...scatter(10,.04,(x,z,i)=>cube([x,.045,z],[.006,.0015,.002],C.pistachio,{rot:[0,i,0]})),...scatter(8,.04,(x,z,i)=>cube([x+.004,.045,z],[.008,.0006,.0006],[.85,.2,.05],{rot:[0,i*2,0]}))];
scenes['matka-kulfi']=()=>[plate(.09),shape(cached('matka',()=>lathe([[0,0],[.7,0],[.95,.3],[1,.6],[.85,.92],[.9,1],[.8,1.02],[.74,.92],[0,.92]],30)),[0,.006,0],[.05,.065,.05],C.clay,{rough:.95}),
 ball([0,.066,0],[.039,.008,.039],[.96,.9,.72],{rough:.7}),...scatter(12,.03,(x,z,i)=>cube([x,.074,z],[.006,.0015,.002],i%3?C.pistachio:[.85,.7,.5],{rot:[0,i,0]}))];

// ---- Drinks
scenes['masala-chai']=()=>[ball([0,.003,0],[.06,.003,.06],[.55,.3,.18]),shape(cached('kulhad',()=>lathe([[0,0],[.68,0],[.72,.03],[1,1],[.94,1],[.68,.08],[0,.08]],32)),[0,.006,0],[.037,.07,.037],C.clay,{rough:.95}),
 cyl([0,.006,0],[.033,.06,.033],[.72,.48,.28],{bevel:.02,rough:.4}),ball([0,.066,0],[.033,.002,.033],[.8,.6,.4],{rough:.5}),
 cyl([.07,.003,.02],[.024,.006,.024],[.86,.66,.36],{bevel:.4}),cyl([.06,.009,-.03],[.024,.006,.024],[.86,.66,.36],{bevel:.4,rot:[.15,0,0]})];
function drink({liquid,top,glassH=.13}){const g=cached('tall',()=>lathe([[0,0],[.85,0],[1,1],[.95,1],[.8,.05],[0,.05]],32));
 return [ball([0,.003,0],[.055,.003,.055],[.86,.82,.74]),shape(g,[0,.006,0],[.04,glassH,.04],[.9,.94,.95],{alpha:.3,rough:.05}),
  shape(cached('liquid',()=>lathe([[0,0],[.82,0],[1,1],[0,1]],32)),[0,.012,0],[.035,glassH*.78,.035],liquid,{rough:.4}),...top(.012+glassH*.78)];}
scenes['masala-lassi']=()=>drink({liquid:[.96,.95,.9],top:y=>[ball([0,y,0],[.036,.012,.036],[.99,.98,.94],{rough:.9}),...scatter(14,.026,(x,z)=>ball([x,y+.009,z],.0018,[.55,.35,.18],{res:4})),leaf([.01,y+.012,0],.012,C.mint),leaf([-.004,y+.013,.006],.01,C.mint,[0,1.4,0])]});
scenes['iced-latte']=()=>{const s=drink({liquid:[.8,.66,.48],top:y=>[ball([0,y,0],[.036,.004,.036],[.42,.24,.12])]});
 for(let i=0;i<5;i++)s.push(cube([Math.cos(i*1.3)*.015,.04+i*.02,Math.sin(i*1.3)*.015],.018,[.92,.96,.98],{alpha:.45,rough:.05,rot:[i,i*.7,0]}));
 s.push(pipe([[.012,.03,0],[.02,.17,.005]],.003,[.2,.45,.35],{rough:.4}));return s;};

// ---- Bowls & plates
scenes['pesto-pasta']=()=>{const s=[plate(.13),...bowl([0,.006,0],.09,.05,[.95,.94,.9],null)];
 for(let i=0;i<70;i++){const a=rnd()*TAU,r=.06*Math.sqrt(rnd()),y=.03+.02*(1-r/.06)+rnd()*.008,d=rnd()*TAU;s.push(P(cached('penne',()=>tube([[-.5,0,0],[.5,0,0]],.18,8)),[Math.cos(a)*r,y,Math.sin(a)*r],[.026,.026,.026],[.68,.75,.32],{rot:[rnd(),d,rnd()*.5],rough:.6}));}
 s.push(...scatter(25,.05,(x,z)=>cube([x,.058,z],[.004,.002,.003],[.98,.95,.82])),leaf([.01,.062,.005],.016,[.2,.45,.12]),leaf([0,.063,-.004],.013,[.24,.5,.15],[0,1.2,0]));return s;};
scenes['avocado-toast']=()=>{const s=[plate(.14)];for(const [x,r] of [[-.045,.2],[.05,-.15]]){s.push(cube([x,.016,0],[.075,.022,.1],[.78,.55,.28],{rot:[0,r,0],rough:.9}),ball([x,.028,0],[.032,.008,.044],[.55,.68,.25],{rot:[0,r,0],rough:.7}));
 s.push(...Array.from({length:12},()=>ball([x+(rnd()-.5)*.05,.034,(rnd()-.5)*.07],.0018,[.75,.12,.05],{res:4})));}
 s.push(ball([.0,.012,.085],[.02,.01,.012],C.yellow,{rough:.4}));return s;};

/* ---------- build ---------- */
const filters=process.argv.slice(2);
for(const [name,build] of Object.entries(scenes))if(!filters.length||filters.some(f=>name.includes(f)))model(name,build());
