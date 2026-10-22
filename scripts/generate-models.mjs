import {mkdirSync,writeFileSync} from 'node:fs';
// Original procedural demo assets. Units are metres; dimensions are illustrative.
mkdirSync('public/models',{recursive:true});
function model(name,parts){
 const chunks=[],views=[],accessors=[],meshes=[],nodes=[],materials=[];let offset=0;
 function buffer(array,target){const b=Buffer.from(array.buffer);const aligned=Buffer.alloc(Math.ceil(b.length/4)*4);b.copy(aligned);chunks.push(aligned);views.push({buffer:0,byteOffset:offset,byteLength:b.length,target});offset+=aligned.length;return views.length-1;}
 for(const part of parts){const pos=[],norm=[],idx=[],rows=14,cols=28;const [cx,cy,cz]=part.at,[sx,sy,sz]=part.scale;
  for(let y=0;y<=rows;y++){const a=y*Math.PI/rows;for(let x=0;x<=cols;x++){const b=x*2*Math.PI/cols;const v=[Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)];pos.push(cx+v[0]*sx,cy+v[1]*sy,cz+v[2]*sz);const n=[v[0]/sx,v[1]/sy,v[2]/sz],len=Math.hypot(...n);norm.push(...n.map(t=>t/len));}}
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=y*(cols+1)+x,b=a+cols+1;idx.push(a,a+1,b,b,a+1,b+1);}
  const p=accessors.length;accessors.push({bufferView:buffer(new Float32Array(pos),34962),componentType:5126,count:pos.length/3,type:'VEC3',min:[cx-sx,cy-sy,cz-sz],max:[cx+sx,cy+sy,cz+sz]});
  const n=accessors.length;accessors.push({bufferView:buffer(new Float32Array(norm),34962),componentType:5126,count:norm.length/3,type:'VEC3'});
  const i=accessors.length;accessors.push({bufferView:buffer(new Uint16Array(idx),34963),componentType:5123,count:idx.length,type:'SCALAR'});
  const m=materials.length;materials.push({pbrMetallicRoughness:{baseColorFactor:[...part.color,1],roughnessFactor:.8,metallicFactor:0},doubleSided:true});meshes.push({primitives:[{attributes:{POSITION:p,NORMAL:n},indices:i,material:m}]});nodes.push({mesh:meshes.length-1});
 }
 const data={asset:{version:'2.0',generator:'Savour original procedural demo'},scene:0,scenes:[{nodes:nodes.map((_,i)=>i)}],nodes,meshes,materials,accessors,bufferViews:views,buffers:[{byteLength:offset}]};
 const json=Buffer.from(JSON.stringify(data)),jp=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(jp);const bin=Buffer.concat(chunks),header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+jp.length+bin.length,8);jh.writeUInt32LE(jp.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);writeFileSync(`public/models/${name}.glb`,Buffer.concat([header,jh,jp,bh,bin]));
 console.log(`${name}: ${Math.round((28+jp.length+bin.length)/1024)} KB`);
}
const part=(at,scale,color)=>({at,scale,color});
const plate=part([0,.004,0],[.105,.004,.105],[.92,.91,.84]);
const burger=[plate,part([0,.020,0],[.062,.015,.061],[.65,.32,.09]),part([0,.039,0],[.060,.009,.059],[.22,.10,.04]),part([0,.049,0],[.064,.003,.061],[.95,.61,.08]),part([0,.057,0],[.059,.005,.058],[.68,.09,.04]),part([0,.076,0],[.063,.022,.062],[.76,.42,.14])];
for(let i=0;i<9;i++){let a=i*2*Math.PI/9;burger.push(part([Math.cos(a)*.043,.054,Math.sin(a)*.043],[.025,.004,.022],[.23,.40,.08]));}
for(let i=0;i<32;i++){let a=i*2.4,r=.048*Math.sqrt((i+.5)/32);burger.push(part([Math.cos(a)*r,.076+.022*Math.sqrt(1-r*r/.063**2),Math.sin(a)*r],[.002,.001,.0008],[.96,.84,.56]));}
model('burger',burger);
const pizza=[part([0,.004,0],[.14,.004,.14],[.92,.91,.84]),part([0,.014,0],[.125,.009,.125],[.73,.43,.17]),part([0,.021,0],[.112,.004,.112],[.69,.12,.04])];
for(let i=0;i<12;i++){let a=i*2.4,r=.087*Math.sqrt((i+.5)/12);pizza.push(part([Math.cos(a)*r,.025,Math.sin(a)*r],[.022,.003,.019],[.95,.86,.64]));if(i%2===0)pizza.push(part([Math.cos(a)*r+.01,.029,Math.sin(a)*r],[.009,.002,.019],[.13,.32,.07]));}model('pizza',pizza);
const pancakes=[plate];for(let i=0;i<3;i++)pancakes.push(part([0,.014+i*.014,0],[.067,.01,.067],[.72+i*.04,.43+i*.03,.15]));pancakes.push(part([0,.052,0],[.048,.003,.047],[.37,.15,.035]));for(let i=0;i<9;i++){const a=i*2.4;pancakes.push(part([Math.cos(a)*.023,.061,Math.sin(a)*.023],[.006,.006,.006],[.08,.09,.19]));}model('pancakes',pancakes);
