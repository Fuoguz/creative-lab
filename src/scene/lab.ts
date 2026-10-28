import * as THREE from 'three';
import { experiments } from './experiments';
export function createLab() {
  const group = new THREE.Group();
  group.position.z = -25;
  const targets: THREE.Object3D[] = [];
  const sculptures: THREE.Group[] = [];
  const metal = new THREE.MeshStandardMaterial({
    color: '#373d3b',
    metalness: 0.8,
    roughness: 0.32,
  });
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({
      color: '#070d0a',
      metalness: 0.12,
      roughness: 0.85,
      envMapIntensity: 0.1,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.1;
  group.add(floor);
  const grid = new THREE.GridHelper(50, 50, '#35433b', '#202924');
  grid.position.y = -2.09;
  group.add(grid);
  const ceiling = new THREE.Group();
  for (let i = 0; i < 11; i++) {
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(11, 0.016, 4, 64, Math.PI),
      new THREE.MeshBasicMaterial({ color: '#28392b' }),
    );
    arch.position.set(0, -2, -i * 3);
    ceiling.add(arch);
  }
  group.add(ceiling);
  experiments.forEach((exp, i) => {
    const station = new THREE.Group();
    station.position.set((i - 2) * 3.6, -0.1, -Math.abs(i - 2) * 0.55);
    station.userData.experiment = i;
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(1.18, 0.028, 8, 64),
      new THREE.MeshStandardMaterial({
        color: exp.color,
        emissive: exp.color,
        emissiveIntensity: 0.65,
        metalness: 0.5,
        roughness: 0.25,
      }),
    );
    station.add(rim);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.24, 1.35, 0.2, 48), metal);
    base.position.y = -1.9;
    station.add(base);
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.7, 0.012),
      new THREE.MeshBasicMaterial({ color: exp.color }),
    );
    line.position.y = -1.53;
    station.add(line);
    const sculpture = new THREE.Group();
    const sculptMat = new THREE.MeshStandardMaterial({
      color: exp.color,
      metalness: 0.85,
      roughness: 0.23,
    });
    if (i === 0) {
      for (let j = 0; j < 3; j++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.085, 8, 48), sculptMat);
        ring.rotation.set(j * 0.7, j * 0.8, 0);
        sculpture.add(ring);
      }
    } else if (i === 1)
      sculpture.add(
        new THREE.Mesh(new THREE.TorusKnotGeometry(0.45, 0.11, 96, 10, 2, 3), sculptMat),
      );
    else if (i === 2) {
      const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(0.65, 0), sculptMat);
      sculpture.add(ico);
      const cage = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.85, 1),
        new THREE.MeshBasicMaterial({
          color: exp.color,
          wireframe: true,
          transparent: true,
          opacity: 0.22,
        }),
      );
      sculpture.add(cage);
    } else if (i === 3) {
      for (let j = 0; j < 7; j++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.9, 0.09), sculptMat);
        bar.position.x = (j - 3) * 0.16;
        bar.position.y = Math.sin(j) * 0.2;
        sculpture.add(bar);
      }
    } else
      sculpture.add(
        new THREE.Mesh(
          new THREE.OctahedronGeometry(0.55),
          new THREE.MeshBasicMaterial({ color: exp.color, wireframe: true }),
        ),
      );
    station.add(sculpture);
    sculptures.push(sculpture);
    // An invisible hit volume makes every portal equally easy to select on touch.
    const hit = new THREE.Mesh(
      new THREE.CircleGeometry(1.2, 32),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hit.userData.experiment = i;
    station.add(hit);
    targets.push(hit, rim, ...sculpture.children);
    group.add(station);
    const light = new THREE.PointLight(exp.color, 10, 6, 2);
    light.position.set(station.position.x, 1, 2);
    group.add(light);
  });
  return { group, targets, sculptures };
}
