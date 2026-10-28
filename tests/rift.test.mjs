import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const buffer=fs.readFileSync(new URL('../public/models/the-core-v1.5.glb',import.meta.url));
const asset=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)));
test('V1.5 preserves 19 semantic assembly identities with finite hinge metadata',()=>{
  const parts=asset.nodes.filter(n=>n.extras?.assemblyId);
  assert.equal(parts.length,19);assert.equal(new Set(parts.map(p=>p.extras.assemblyId)).size,19);
  assert.deepEqual([...new Set(parts.map(p=>p.extras.stage))].sort(),[0,1,2,3]);
  for(const p of parts){assert.equal(p.extras.turn.length,3);assert.ok(p.extras.turn.every(Number.isFinite));assert.ok(p.extras.explode.every(Number.isFinite));}
  assert.ok(buffer.length<3000000);assert.equal(buffer.readUInt32LE(8),buffer.length);
});
const code=ts.transpileModule(fs.readFileSync(new URL('../src/scene/choreography.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {mechanismProgress}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('lock releases before armour and lens; all stages return exactly to rest',()=>{
  assert.ok(mechanismProgress(.15,0)>.9);
  assert.equal(mechanismProgress(.15,1),0);
  assert.equal(mechanismProgress(.4,3),0);
  for(let stage=0;stage<4;stage++){
    assert.equal(mechanismProgress(0,stage),0);assert.equal(mechanismProgress(1,stage),1);
    let previous=0;for(let i=0;i<=100;i++){const current=mechanismProgress(i/100,stage);assert.ok(current>=previous);previous=current;}
  }
});
