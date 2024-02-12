import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";

import getStarfield from "./src/getStarfield.js";
import { getFresnelMat } from "./src/getFresnelMat.js";

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 3;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

const earthGroup = new THREE.Group();
earthGroup.rotation.z = (-23.4 * Math.PI) / 180;
scene.add(earthGroup);

// Create a blinking red marker
const markerGeometry = new THREE.SphereGeometry(0.05, 32, 32); // Small sphere as a marker
const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red color
const markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);
markerMesh.position.set(0, 1.1, 0); // Position it on the surface or adjust as needed
earthGroup.add(markerMesh);

new OrbitControls(camera, renderer.domElement);
const detail = 12;
const loader = new THREE.TextureLoader();
const geometry = new THREE.IcosahedronGeometry(1, detail);
const material = new THREE.MeshPhongMaterial({
  map: loader.load("./textures/00_earthmap1k.jpg"),
  specularMap: loader.load("./textures/02_earthspec1k.jpg"),
  bumpMap: loader.load("./textures/01_earthbump1k.jpg"),
  bumpScale: 0.04,
});
const earthMesh = new THREE.Mesh(geometry, material);
earthGroup.add(earthMesh);

const lightsMat = new THREE.MeshBasicMaterial({
  map: loader.load("./textures/03_earthlights1k.jpg"),
  blending: THREE.AdditiveBlending,
});
const lightsMesh = new THREE.Mesh(geometry, lightsMat);
earthGroup.add(lightsMesh);

const cloudsMat = new THREE.MeshStandardMaterial({
  map: loader.load("./textures/04_earthcloudmap.jpg"),
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending,
  alphaMap: loader.load("./textures/05_earthcloudmaptrans.jpg"),
  // alphaTest: 0.3,
});
const cloudsMesh = new THREE.Mesh(geometry, cloudsMat);
cloudsMesh.scale.setScalar(1.003);
earthGroup.add(cloudsMesh);

const fresnelMat = getFresnelMat();
const glowMesh = new THREE.Mesh(geometry, fresnelMat);
glowMesh.scale.setScalar(1.01);
earthGroup.add(glowMesh);

const stars = getStarfield({ numStars: 2000 });
scene.add(stars);

const sunLight = new THREE.DirectionalLight(0xffffff);
sunLight.position.set(-2, 0.5, 1.5);
scene.add(sunLight);

let lastBlinkTime = 0;
const blinkInterval = 1000; // Blink every 1000 milliseconds (1 second)

// Constants for orbit
const orbitRadius = 1.0; // This should be slightly more than the radius of your Earth mesh
const orbitPeriod = 10; // Orbital period in seconds (2 hours) org: 7200 (1200 kph). 

function animate() {
  requestAnimationFrame(animate);

  // Update the blinking marker
  const currentTime = Date.now();
  if (currentTime - lastBlinkTime > blinkInterval) {
    markerMesh.visible = !markerMesh.visible; // Toggle visibility
    lastBlinkTime = currentTime;
  }

  // Update the marker position to orbit around the Earth
  const elapsedTime = (currentTime / 1000) % orbitPeriod; // Time in seconds
  const angle = (elapsedTime / orbitPeriod) * Math.PI * 2; // Full rotation in radians

  // Assuming a circular orbit in the XZ plane
  markerMesh.position.x = orbitRadius * Math.cos(angle);
  markerMesh.position.z = orbitRadius * Math.sin(angle);

  // earthMesh.rotation.y += 0.002;
  // lightsMesh.rotation.y += 0.002;
  // glowMesh.rotation.y += 0.002;
  cloudsMesh.rotation.y += 0.0023;
  stars.rotation.y -= 0.0002;
  renderer.render(scene, camera);
}

animate();

function handleWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", handleWindowResize, false);
