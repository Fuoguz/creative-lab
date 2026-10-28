import * as THREE from 'three';
export function createEnergy() {
  const material = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, power: { value: 0 } },
    transparent: true,
    depthWrite: false,
    vertexShader: `varying vec3 vNormal; varying vec3 vPosition;
      void main(){vNormal=normalize(normalMatrix*normal);vPosition=position;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float time; uniform float power; varying vec3 vNormal; varying vec3 vPosition;
      void main(){float rim=pow(1.-abs(vNormal.z),2.4); float wave=sin(vPosition.y*32.+time*1.2+sin(vPosition.x*16.))*0.5+0.5;
      float bands=pow(wave,12.); vec3 color=mix(vec3(.08,.13,.09),vec3(.72,1.,.34),rim+bands*.65);
      gl_FragColor=vec4(color*power*(.7+rim*1.5),(.15+rim*.6+bands*.2)*power);}`,
  });
  return new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 5), material);
}
