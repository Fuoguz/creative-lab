import * as THREE from 'three';
/** Original deterministic machining surface; no downloaded textures. */
export function createMachiningTexture() {
  const size = 128,
    data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const noise = ((x * 73 + y * 151 + x * y * 17) % 101) / 100;
      const value = Math.round(160 + Math.sin(y * 1.4) * 16 + noise * 34);
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
    }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.needsUpdate = true;
  return texture;
}
export function createReflectionStudio() {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color('#020306');
  const panel = (
    color: string,
    intensity: number,
    position: THREE.Vector3,
    scale: THREE.Vector3,
  ) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(intensity),
        side: THREE.DoubleSide,
      }),
    );
    m.position.copy(position);
    m.scale.copy(scale);
    m.lookAt(0, 0, 0);
    studio.add(m);
  };
  panel('#c5ddff', 6, new THREE.Vector3(-4, 6, 4), new THREE.Vector3(2, 7, 1));
  panel('#ffffff', 4, new THREE.Vector3(4, 2, -3), new THREE.Vector3(0.7, 6, 1));
  panel('#e1aa67', 3, new THREE.Vector3(-4, -2, -2), new THREE.Vector3(1, 5, 1));
  return studio;
}
