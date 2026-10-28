import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { experiments } from './experiments';

/** Gravity-ambiguous observatory; the five doors occupy different architectural depths. */
export function createLab() {
  const group = new THREE.Group();
  group.position.z = -30;
  const targets: THREE.Object3D[] = [];
  const sculptures: THREE.Group[] = [];
  const focuses: THREE.Vector3[] = [];
  const shutters: THREE.Group[] = [];
  const lights: THREE.PointLight[] = [];
  const stone = new THREE.MeshStandardMaterial({
    color: '#242b34',
    metalness: 0.42,
    roughness: 0.52,
    envMapIntensity: 0.6,
  });
  const cut = new THREE.MeshStandardMaterial({ color: '#77838a', metalness: 0.8, roughness: 0.28 });
  const black = new THREE.MeshStandardMaterial({
    color: '#070b12',
    metalness: 0.4,
    roughness: 0.55,
  });
  function beam(
    parent: THREE.Object3D,
    a: THREE.Vector3,
    b: THREE.Vector3,
    width: number,
    depth: number,
    mat: THREE.Material,
  ) {
    const v = b.clone().sub(a);
    const geometry =
      width > 0.15
        ? new RoundedBoxGeometry(width, v.length(), depth, 1, Math.min(width, depth) * 0.08)
        : new THREE.BoxGeometry(width, v.length(), depth);
    const m = new THREE.Mesh(geometry, mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
    parent.add(m);
    return m;
  }
  // Incomplete, folded frames leave an unobstructed camera corridor through their voids.
  for (let i = 0; i < 3; i++) {
    const frame = new THREE.Group();
    frame.position.set(i === 1 ? 4 : -3, -1, -12 - i * 13);
    frame.rotation.z = [-0.22, 0.35, -0.12][i];
    const w = 12 + i * 2,
      h = 16 + i * 2;
    beam(frame, new THREE.Vector3(-w, -h, 0), new THREE.Vector3(-w, h, 0), 2.8, 2.5, stone);
    beam(frame, new THREE.Vector3(-w, h, 0), new THREE.Vector3(w, h, 0), 2.8, 2.5, stone);
    beam(frame, new THREE.Vector3(w, h, 0), new THREE.Vector3(w, -h, 0), 2.8, 2.5, stone);
    beam(frame, new THREE.Vector3(w, -h, 0), new THREE.Vector3(-w * 0.4, -h, 0), 2.8, 2.5, stone);
    const edgeMat = new THREE.MeshBasicMaterial({ color: i === 1 ? '#89562e' : '#3c6778' });
    beam(
      frame,
      new THREE.Vector3(-w + 1.43, -h, 1.27),
      new THREE.Vector3(-w + 1.43, h - 1.43, 1.27),
      0.025,
      0.025,
      edgeMat,
    );
    beam(
      frame,
      new THREE.Vector3(-w + 1.43, h - 1.43, 1.27),
      new THREE.Vector3(w - 1.43, h - 1.43, 1.27),
      0.025,
      0.025,
      edgeMat,
    );
    group.add(frame);
  }
  // A single receding stair ribbon instead of a ground grid or repeated display plinths.
  const stairs = new THREE.InstancedMesh(new THREE.BoxGeometry(3.2, 0.16, 0.7), stone, 44);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 44; i++) {
    const t = i / 43;
    dummy.position.set(-4 + Math.sin(t * 4.5) * 5, -5 + t * 5, -i * 1.25 + 4);
    dummy.rotation.set(0, t * 0.5, t * 0.9);
    dummy.updateMatrix();
    stairs.setMatrixAt(i, dummy.matrix);
  }
  group.add(stairs);
  const seam = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 42),
    new THREE.MeshBasicMaterial({ color: '#92b7ca', toneMapped: false }),
  );
  seam.position.set(2, 3, -64);
  group.add(seam);
  const placements = [
    [-4.8, 1, -4],
    [4.5, 4, -10],
    [-3, -3.8, -16],
    [8.6, -1.2, -6],
    [0, 3, -33],
  ];
  experiments.forEach((exp, i) => {
    const station = new THREE.Group();
    station.position.set(...(placements[i] as [number, number, number]));
    station.rotation.z = [-0.13, 0.2, -0.3, 0.08, 0][i];
    station.userData.experiment = i;
    group.add(station);
    focuses.push(station.position.clone().add(group.position));
    const w = 1.05 + i * 0.08,
      h = 1.8 + i * 0.15;
    const signal = new THREE.MeshStandardMaterial({
      color: exp.color,
      emissive: exp.color,
      emissiveIntensity: 1.4,
      metalness: 0.4,
      roughness: 0.24,
    });
    beam(station, new THREE.Vector3(-w, -h, 0), new THREE.Vector3(-w, h, 0), 0.23, 0.6, cut);
    beam(station, new THREE.Vector3(-w, h, 0), new THREE.Vector3(w, h, 0), 0.23, 0.6, stone);
    beam(station, new THREE.Vector3(w, h, 0), new THREE.Vector3(w, -h, 0), 0.23, 0.6, cut);
    beam(
      station,
      new THREE.Vector3(-w + 0.16, -h, 0.32),
      new THREE.Vector3(-w + 0.16, h, 0.32),
      0.035,
      0.025,
      signal,
    );
    const leaf = new THREE.Group();
    station.add(leaf);
    shutters.push(leaf);
    for (let j = 0; j < 2; j++) {
      const slat = new THREE.Mesh(new RoundedBoxGeometry(w * 0.8, h * 2, 0.16, 1, 0.04), black);
      slat.position.set((j === 0 ? -1 : 1) * w * 0.7, 0, -0.1);
      slat.userData.restX = slat.position.x;
      slat.rotation.y = (j === 0 ? 1 : -1) * 0.8;
      leaf.add(slat);
    }
    // Receding nested frames give each aperture an actual interior, not a flat icon.
    for (let j = 1; j <= 4; j++) {
      const f = new THREE.Group();
      f.position.z = -j * 0.55;
      f.rotation.z = (i - 2) * j * 0.035;
      station.add(f);
      const s = 1 - j * 0.1;
      beam(
        f,
        new THREE.Vector3(-w * s, -h * s, 0),
        new THREE.Vector3(-w * s, h * s, 0),
        0.07,
        0.07,
        cut,
      );
      beam(
        f,
        new THREE.Vector3(-w * s, h * s, 0),
        new THREE.Vector3(w * s, h * s, 0),
        0.07,
        0.07,
        cut,
      );
      beam(
        f,
        new THREE.Vector3(w * s, h * s, 0),
        new THREE.Vector3(w * s, -h * s, 0),
        0.07,
        0.07,
        cut,
      );
    }
    const sculpture = new THREE.Group();
    sculpture.position.z = -0.7;
    station.add(sculpture);
    sculptures.push(sculpture);
    if (i === 0) {
      for (let k = 0; k < 3; k++) {
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.11, 2.7, 0.11), signal);
        f.position.x = (k - 1) * 0.35;
        f.rotation.z = (k - 1) * 0.15;
        sculpture.add(f);
      }
    }
    if (i === 1) {
      const pts = [];
      for (let k = 0; k <= 100; k++) {
        const a = (k / 100) * Math.PI * 4;
        pts.push(
          new THREE.Vector3(
            Math.cos(a) * (0.35 + k * 0.003),
            Math.sin(a) * (0.35 + k * 0.003),
            Math.sin(a * 0.5) * 0.35,
          ),
        );
      }
      sculpture.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 100, 0.025, 5, false),
          signal,
        ),
      );
    }
    if (i === 2) {
      const shape = new THREE.Shape();
      shape.moveTo(-0.65, -1);
      shape.lineTo(0.65, -1);
      shape.lineTo(0, 1);
      shape.lineTo(-0.65, -1);
      sculpture.add(
        new THREE.LineSegments(
          new THREE.EdgesGeometry(
            new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false }),
          ),
          new THREE.LineBasicMaterial({ color: exp.color }),
        ),
      );
    }
    if (i === 3) {
      for (let k = 0; k < 5; k++) {
        const line = beam(
          sculpture,
          new THREE.Vector3((k - 2) * 0.23, -1, 0),
          new THREE.Vector3((k - 2) * 0.23, 1, 0),
          0.025,
          0.025,
          signal,
        );
        line.rotation.z = (k - 2) * 0.15;
      }
    }
    if (i === 4)
      sculpture.add(
        new THREE.Mesh(
          new THREE.PlaneGeometry(0.055, 3.4),
          new THREE.MeshBasicMaterial({ color: exp.color, toneMapped: false }),
        ),
      );
    const hit = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 2, h * 2),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hit.position.z = 0.42;
    hit.userData.experiment = i;
    station.add(hit);
    targets.push(hit);
    station.traverse((o) => {
      if (o instanceof THREE.Mesh && o !== hit) targets.push(o);
    });
    beam(
      group,
      station.position.clone().add(new THREE.Vector3(-w, 0, -0.4)),
      station.position.clone().add(new THREE.Vector3(-w - 3, 2, -8)),
      0.18,
      0.18,
      stone,
    );
    const light = new THREE.PointLight(exp.color, 18, 13, 2);
    light.position.copy(station.position).add(new THREE.Vector3(0, 0, 1.3));
    group.add(light);
    lights.push(light);
  });
  const broad = new THREE.DirectionalLight('#728da6', 1.2);
  broad.position.set(-8, 12, 8);
  group.add(broad);
  const warm = new THREE.PointLight('#bb7741', 70, 80, 2);
  warm.position.set(-10, -6, -8);
  group.add(warm);
  function update(time: number, selected: number, hover: number, reduced: boolean, dt: number) {
    shutters.forEach((leaf, i) => {
      const open = i === selected ? 1 : i === hover ? 0.25 : 0;
      leaf.children.forEach((slat) => {
        const sign = Math.sign(slat.userData.restX);
        const damping = reduced ? 1 : 1 - Math.exp(-5 * dt);
        slat.position.x = THREE.MathUtils.lerp(slat.position.x, slat.userData.restX + sign * open * .65, damping);
        slat.rotation.y = THREE.MathUtils.lerp(slat.rotation.y, -sign * (.8 + open * .65), damping);
      });
      lights[i].intensity = 18 + open * 24;
    });
    sculptures.forEach((s, i) => {
      s.rotation.z = !reduced && i === 1 ? time * 0.04 : 0;
    });
  }
  return { group, targets, sculptures, focuses, update };
}
