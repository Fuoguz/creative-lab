import * as THREE from 'three';
export function createEnergy() {
  const material = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, power: { value: 0 }, reveal: { value: 0 } },
    transparent: true,
    depthWrite: false,
    vertexShader: `varying vec3 vNormal;varying vec3 vPosition;void main(){vNormal=normalize(normalMatrix*normal);vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float time;uniform float power;uniform float reveal;varying vec3 vNormal;varying vec3 vPosition;
      void main(){float edge=pow(1.-abs(vNormal.z),2.);float filament=exp(-abs(vPosition.x+sin(vPosition.y*8.+time*.5)*.025)*38.);
      float interference=pow(.5+.5*sin(vPosition.y*61.-time*.9+vPosition.x*19.),18.);
      vec3 blue=vec3(.12,.55,1.);vec3 white=vec3(.74,.91,1.);
      vec3 col=mix(blue,white,filament)*(.3+edge+filament*2.2+interference*.4)*(1.+reveal*.25);
      gl_FragColor=vec4(col*power,(.23+edge*.45+filament*.5)*power);}`,
  });
  const geometry = new THREE.SphereGeometry(1, 32, 40);
  geometry.scale(0.3, 0.91, 0.22);
  return new THREE.Mesh(geometry, material);
}
