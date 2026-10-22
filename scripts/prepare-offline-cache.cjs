// Recover readable cached npm packages into a writable project-local cache.
const fs=require('node:fs');
const cacache=require('C:/Users/Akhil/npm-global/node_modules/npm/node_modules/cacache');
const semver=require('C:/Users/Akhil/npm-global/node_modules/npm/node_modules/semver');
const tar=require('C:/Users/Akhil/npm-global/node_modules/npm/node_modules/tar');
const source='C:/Users/Akhil/AppData/Local/npm-cache/_cacache',dest='.npm-cache/_cacache';
(async()=>{const entries=await cacache.ls(source);const keys=Object.keys(entries);const seen=new Set();let missing=[];
 async function copy(key){const item=await cacache.get(source,key);await cacache.put(dest,key,item.data,{metadata:entries[key].metadata});return item.data;}
 async function visit(name,range,optional=false){if(seen.has(name+'@'+range))return;seen.add(name+'@'+range);const uri='https://registry.npmjs.org/'+name.replace('/','%2f');const key=keys.find(k=>k.toLowerCase()===('make-fetch-happen:request-cache:'+uri).toLowerCase());if(!key){if(!optional)missing.push(name);return;}try{const meta=JSON.parse(await copy(key));const version=semver.maxSatisfying(Object.keys(meta.versions),range);if(!version){if(!optional)missing.push(name+'@'+range);return;}const pkg=meta.versions[version];if(pkg.os&&!pkg.os.includes('win32')||pkg.cpu&&!pkg.cpu.includes('x64'))return;const tar=keys.find(k=>k==='make-fetch-happen:request-cache:'+pkg.dist.tarball);if(tar)await copy(tar);else if(!optional)missing.push(name+'@'+version+' tarball');for(const [n,r]of Object.entries(pkg.dependencies||{}))await visit(n,r,optional);for(const [n,r]of Object.entries(pkg.optionalDependencies||{}))await visit(n,r,true);}catch(e){if(!optional)missing.push(name+': '+e.code);}}
 const p=JSON.parse(fs.readFileSync('package.json','utf8'));for(const [n,r]of Object.entries({...p.dependencies,...p.devDependencies}))await visit(n,r);console.log(JSON.stringify({packages:seen.size,missing}));})();
