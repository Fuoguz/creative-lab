import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const file = fs.readFileSync(new URL('../public/models/the-core.glb', import.meta.url));
const asset = JSON.parse(file.subarray(20, 20 + file.readUInt32LE(12)));
test('Blender asset is valid GLB v2 within transfer budget', () => {
  assert.equal(file.toString('ascii', 0, 4), 'glTF');
  assert.equal(file.readUInt32LE(4), 2);
  assert.equal(file.readUInt32LE(8), file.length);
  assert.ok(file.length < 3_000_000);
});
test('all 19 assemblies have finite disassembly vectors and separate meshes', () => {
  const parts = asset.nodes.filter((n) => n.extras?.explode);
  assert.equal(parts.length, 19);
  for (const p of parts) {
    assert.equal(p.extras.explode.length, 3);
    assert.ok(p.extras.explode.every(Number.isFinite));
    assert.ok(p.children.length > 0);
  }
  assert.equal(parts.filter((p) => p.name.startsWith('Shell_')).length, 8);
  assert.equal(parts.filter((p) => p.name.startsWith('Coil_')).length, 8);
  for (const n of ['Rotor_Front', 'Stator_Rear', 'Induction_Ring'])
    assert.ok(parts.some((p) => p.name === n));
});
test('export contains only the intended scene and embedded buffers', () => {
  assert.equal(asset.scenes.length, 1);
  assert.equal(asset.scenes[0].nodes.length, 19);
  assert.ok(!asset.nodes.some((n) => n.name === 'Cube'));
  assert.ok(asset.buffers.every((b) => !b.uri));
  assert.ok(!asset.images?.some((i) => i.uri));
});
