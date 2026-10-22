import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
for(const name of readdirSync('public/models')){
 const data=readFileSync(`public/models/${name}`);
 assert.equal(data.readUInt32LE(0),0x46546c67,'GLB magic');assert.equal(data.readUInt32LE(4),2,'GLB version');assert.equal(data.readUInt32LE(8),data.length,'GLB length');
 const jsonLength=data.readUInt32LE(12),doc=JSON.parse(data.subarray(20,20+jsonLength).toString());
 assert.equal(doc.asset.version,'2.0');assert.ok(data.length<1024*1024,'Demo asset budget: 1 MB');
 const binaryStart=28+jsonLength;
 for(const mesh of doc.meshes)for(const p of mesh.primitives){const positions=doc.accessors[p.attributes.POSITION],indices=doc.accessors[p.indices],view=doc.bufferViews[indices.bufferView];assert.ok(positions.min[1]>=-0.00001,'Model rests above table plane');assert.ok(positions.max[0]-positions.min[0]<.5,'Model dimensions use metres');for(let i=0;i<indices.count;i++)assert.ok(data.readUInt16LE(binaryStart+view.byteOffset+i*2)<positions.count,'Index inside vertex buffer');}
 console.log(`${name}: structure, indices, scale and size budget passed`);
}
