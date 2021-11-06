import './main.css';
import * as THREE from 'three';
import TwitchChat from 'twitch-chat-emotes-threejs';
import Stats from 'stats-js';

// a default array of twitch channels to join
let channels = ['moonmoon'];

// the following few lines of code will allow you to add ?channels=channel1,channel2,channel3 to the URL in order to override the default array of channels
const query_vars = {};
const query_parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
	query_vars[key] = value;
});

if (query_vars.channels) {
	channels = query_vars.channels.split(',');
}
const ChatInstance = new TwitchChat({
	materialType: THREE.MeshBasicMaterial,
	materialOptions: {
		side: THREE.DoubleSide,
		transparent: true,
	},
	channels,
	maximumEmoteLimit: 3,
})

const stats = new Stats();
stats.showPanel(1);

import { makeNoise4D } from "open-simplex-noise";
const noise = makeNoise4D(Date.now());

const emoteScale = 0.5;
const emoteSpeed = 0.6;
const emoteFriction = 0.999;
const cameraDistance = 9;
const cameraFar = cameraDistance * 4;

const noiseScaleMultiplier = 0.25;
const sampleScaleOffset = 0.005;

const emoteLifespan = 20000;
const emoteBirthspan = 5000;
const emoteDeathspan = 1000;


const EasingFunctions = {
	// no easing, no acceleration
	linear: t => t,
	// accelerating from zero velocity
	easeInQuad: t => t * t,
	// decelerating to zero velocity
	easeOutQuad: t => t * (2 - t),
	// acceleration until halfway, then deceleration
	easeInOutQuad: t => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
	// accelerating from zero velocity 
	easeInCubic: t => t * t * t,
	// decelerating to zero velocity 
	easeOutCubic: t => (--t) * t * t + 1,
	// acceleration until halfway, then deceleration 
	easeInOutCubic: t => t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
	// accelerating from zero velocity 
	easeInQuart: t => t * t * t * t,
	// decelerating to zero velocity 
	easeOutQuart: t => 1 - (--t) * t * t * t,
	// acceleration until halfway, then deceleration
	easeInOutQuart: t => t < .5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
	// accelerating from zero velocity
	easeInQuint: t => t * t * t * t * t,
	// decelerating to zero velocity
	easeOutQuint: t => 1 + (--t) * t * t * t * t,
	// acceleration until halfway, then deceleration 
	easeInOutQuint: t => t < .5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t
}

const pendingEmoteArray = [];
ChatInstance.listen((emotes) => {
	const matArray = [];
	for (let i = 0; i < emotes.length; i++) {
		matArray.push(emotes[i].material);
	}
	const output = { emotes: matArray, type: 'emote' };
	pendingEmoteArray.push(output);
});


const camera = new THREE.PerspectiveCamera(
	70,
	window.innerWidth / window.innerHeight,
	0.1,
	cameraFar
);
camera.position.x = 0;
camera.position.y = 0;
camera.position.z = cameraDistance;
camera.lookAt(0, 0, 0);

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);

scene.background = new THREE.Color(0x0F1A23);
scene.fog = new THREE.Fog(0x0F1A23, cameraDistance, cameraFar);


const skyLight = new THREE.DirectionalLight(0xffffff, 0.5);
skyLight.position.set(0, 1, 0);
scene.add(skyLight);

function resize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

function init() {
	document.body.appendChild(renderer.domElement);
}


const getSpawnPoint = () => {
	return new THREE.Vector3(
		(Math.random() * 2 - 1) * 9 + 5,
		6,
		(Math.random() * 2 - 1) * 4,
	);
}

let flip = false;
function getEmoteSpawn() {
	flip = !flip;
	const pi = (Math.random() * Math.PI * 2) + (flip ? Math.PI : 0);
	let narrow = Math.random();
	narrow *= narrow;


	const velocity = new THREE.Vector3(
		Math.sin(pi) * emoteSpeed * narrow * 0.75 - 0.25,
		-2 * emoteSpeed,
		Math.cos(pi) * emoteSpeed * narrow * 0.75 - 0.5,
	);

	const position = new THREE.Vector3(0, 0, 0);

	return {
		position,
		velocity,
	};
}



const outer_group = new THREE.Group();
outer_group.rotation.z = Math.PI / 8;
outer_group.position.y += -4.4;
outer_group.position.x += -3.85;
scene.add(outer_group);

const planeGeometry = new THREE.PlaneBufferGeometry(1, 1);

import particleImageURL from './particle.png';
const particleMaterial = new THREE.SpriteMaterial({
	map: new THREE.TextureLoader().load(particleImageURL),
	transparent: true,
	opacity: 0.1,
	blendEquation: THREE.AddEquation,
});

import treeURL from './tree.png';
const treeMaterial = new THREE.SpriteMaterial({
	map: new THREE.TextureLoader().load(treeURL),
	transparent: true,
	side: THREE.FrontSide,
});
const tree = new THREE.Sprite(treeMaterial);
tree.scale.setScalar(12.7);
tree.position.x = 5;
scene.add(tree);

const cloudUniforms = {
	u_time: { value: 0 },
}
const lowPollyFoliageMaterial = new THREE.ShaderMaterial({
	uniforms: cloudUniforms,
	vertexShader: document.getElementById('vertexShader').textContent,
	fragmentShader: document.getElementById('fragmentShader').textContent
});
const gradColors = new Uint8Array();
gradColors[0] = 0x97623B;
gradColors[1] = 0xC18737;
gradColors[2] = 0x7F4326;
import gradUrl from './grad.png';
const gradMap = new THREE.TextureLoader().load(gradUrl);
gradMap.magFilter = THREE.NearestFilter;
gradMap.minFilter = THREE.NearestFilter;
gradMap.generateMipmaps = false;

const customizedMat = new THREE.MeshToonMaterial({
	flatShading: true,
	color: 0xffffff,
	gradientMap: gradMap,
});
customizedMat.onBeforeCompile = function (shader) {

	shader.uniforms.u_time = cloudUniforms.u_time;

	shader.vertexShader = `
		uniform float u_time;

		vec3 mod289(vec3 x) {
			return x - floor(x * (1.0 / 289.0)) * 289.0;
		}
		vec4 mod289(vec4 x) {
			return x - floor(x * (1.0 / 289.0)) * 289.0;
		}
		vec4 permute(vec4 x) {
			return mod289(((x * 34.0) + 10.0) * x);
		}
		vec4 taylorInvSqrt(vec4 r) {
			return 1.79284291400159 - 0.85373472095314 * r;
		}
		float snoise(vec3 v) {
			const vec2  C = vec2(1.0 / 6.0, 1.0 / 3.0);
			const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
			
			vec3 i = floor(v + dot(v, C.yyy));
			vec3 x0 = v - i + dot(i, C.xxx);
		
			vec3 g = step(x0.yzx, x0.xyz);
			vec3 l = 1.0 - g;
			vec3 i1 = min(g.xyz, l.zxy);
			vec3 i2 = max(g.xyz, l.zxy);
		
			vec3 x1 = x0 - i1 + C.xxx;
			vec3 x2 = x0 - i2 + C.yyy; 
			vec3 x3 = x0 - D.yyy;      
		
			i = mod289(i); 
			vec4 p = permute(permute(permute( i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
		
			float n_ = 0.142857142857; 
			vec3  ns = n_ * D.wyz - D.xzx;
			vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  
			vec4 x_ = floor(j * ns.z);
			vec4 y_ = floor(j - 7.0 * x_);    
			vec4 x = x_ * ns.x + ns.yyyy;
			vec4 y = y_ * ns.x + ns.yyyy;
			vec4 h = 1.0 - abs(x) - abs(y);
			vec4 b0 = vec4(x.xy, y.xy);
			vec4 b1 = vec4(x.zw, y.zw);
		
			vec4 s0 = floor(b0) * 2.0 + 1.0;
			vec4 s1 = floor(b1) * 2.0 + 1.0;
			vec4 sh = -step(h, vec4(0.0));
			vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
			vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
			vec3 p0 = vec3(a0.xy, h.x);
			vec3 p1 = vec3(a0.zw, h.y);
			vec3 p2 = vec3(a1.xy, h.z);
			vec3 p3 = vec3(a1.zw, h.w);
		
			vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
				p0 *= norm.x;
				p1 *= norm.y;
				p2 *= norm.z;
				p3 *= norm.w;
				
			vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
			m = m * m;
			return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
		}
		${shader.vertexShader}`;
	shader.vertexShader = shader.vertexShader.replace(
		'#include <begin_vertex>',
		`
		float bnScale = 0.7;
		float baseNoise = snoise(vec3(position.x * bnScale + ${Math.random() * 100}, position.y * bnScale, position.z * bnScale));

		float noise = snoise(vec3(position.x + u_time * 0.05, position.y, position.z));
		float rootNoise = snoise(vec3(position.x, position.y, position.z)) * PI;
		vec3 angle = vec3(sin(rootNoise), cos(rootNoise), 0.0);
		vec3 transformed = position + (angle * noise * 0.1) + (baseNoise * 0.4 * vec3(sin(baseNoise * PI), cos(baseNoise * PI), cos(baseNoise * PI)));
		`,
	);

	customizedMat.userData.shader = shader;

};

// Make sure WebGLRenderer doesnt reuse a single program

customizedMat.customProgramCacheKey = function () {

	return 69; // some random ish number

};
const lowPollyFoliage = new THREE.Mesh(
	new THREE.IcosahedronBufferGeometry(1, 5),
	customizedMat
);
lowPollyFoliage.rotation.x = 0.1;
lowPollyFoliage.scale.y = 2;
lowPollyFoliage.scale.z = 4;
lowPollyFoliage.scale.x = 8;
lowPollyFoliage.position.x = 4;
lowPollyFoliage.position.y = 3.5;
scene.add(lowPollyFoliage);

/*import foliageFrontURL from './LeavesFront.png';
const foliageFrontMaterial = new THREE.SpriteMaterial({
	map: new THREE.TextureLoader().load(foliageFrontURL),
	transparent: true,
	side: THREE.FrontSide,
});
const foliageFront = new THREE.Sprite(foliageFrontMaterial);
foliageFront.scale.setScalar(14);
foliageFront.position.x = 0.5;
foliageFront.position.y = -2.8;
foliageFront.position.z = 3;
scene.add(foliageFront);


import foliageBackURL from './LeavesBack.png';
const foliageBackMaterial = new THREE.SpriteMaterial({
	map: new THREE.TextureLoader().load(foliageBackURL),
	transparent: true,
	side: THREE.FrontSide,
});
const foliageBack = new THREE.Sprite(foliageBackMaterial);
foliageBack.scale.setScalar(30);
foliageBack.position.x = 0;
foliageBack.position.y = -6.5;
foliageBack.position.z = -3;
scene.add(foliageBack);*/


import leafImageURL from './leaf1.png';
const leafMaterial = new THREE.MeshBasicMaterial({
	map: new THREE.TextureLoader().load(leafImageURL),
	transparent: true,
	side: THREE.DoubleSide,
});

function noiseHelper(vector, d, x = 0, y = 0, z = 0) {
	return noise(
		vector.x * noiseScaleMultiplier + x * sampleScaleOffset,
		(vector.y * noiseScaleMultiplier + y * sampleScaleOffset) - d / 2,
		vector.z * noiseScaleMultiplier + z * sampleScaleOffset,
		d
	)
}
function getNoiseVelocity(position, d) {
	return new THREE.Vector3(
		noiseHelper(position, d, -1, 0, 0) - noiseHelper(position, d, 1, 0, 0),
		noiseHelper(position, d, 0, -1, 0) - noiseHelper(position, d, 0, 1, 0),
		noiseHelper(position, d, 0, 0, -1) - noiseHelper(position, d, 0, 0, 1),
	);
}

function spawnLeaf() {
	pendingEmoteArray.push({ type: 'leaf' });
	setTimeout(spawnLeaf, 64 + Math.ceil(Math.random() * 128))
}
spawnLeaf();

const startFrame = Date.now();
let lastFrame = Date.now();
function draw() {
	if (query_vars.stats) stats.begin();
	requestAnimationFrame(draw);
	const delta = (Date.now() - lastFrame) / 1000;
	cloudUniforms.u_time.value += delta;

	lastFrame = Date.now();

	//inner_group.rotation.y += delta * 0.2;

	const noiseDate = (Date.now() - startFrame) / 9000;

	for (let index = pendingEmoteArray.length - 1; index >= 0; index--) {
		const emotes = pendingEmoteArray[index];

		if (!emotes.group) {
			const spawnInfo = getEmoteSpawn();
			emotes.born = lastFrame;
			emotes.group = new THREE.Group();
			emotes.velocity = spawnInfo.velocity;
			emotes.position = spawnInfo.position;
			emotes.group.position.add(getSpawnPoint());
			scene.attach(emotes.group);
		}

		const alive = Date.now() - emotes.born;

		if (alive > emoteLifespan) {
			scene.remove(emotes.group);
			pendingEmoteArray.splice(index, 1);
		} else {
			/*const n = noise(
				emotes.group.position.x * 0.5,
				emotes.group.position.y * 0.5,
				emotes.group.position.z * 0.5,
				noiseDate
			);

			emotes.velocity.x = Math.sin(Math.PI * 2 * n) ;
			emotes.velocity.y = Math.cos(-Math.PI * 2 * n) ;
			emotes.velocity.z = Math.sin(Math.PI * 2 * n) ;*/
			//emotes.velocity.normalize();
			const v = getNoiseVelocity(emotes.group.position, noiseDate);
			emotes.velocity.x += v.x;
			emotes.velocity.y += v.y - delta * 0.5;
			//emotes.velocity.z += v.z;

			emotes.group.rotation.x = v.x * Math.PI * 20;
			emotes.group.rotation.y = v.y * Math.PI * 20;
			emotes.group.rotation.z = v.z * Math.PI * 20;

			/*if (emotes.group.position.y > 5) {
				emotes.velocity.y -= (emotes.group.position.y-5)/100
			}
			if (emotes.group.position.y < -5) {
				emotes.velocity.y -= (emotes.group.position.y+5)/100
			}*/

			emotes.group.position.x += emotes.velocity.x * delta - 0.025 * delta;
			emotes.group.position.y += emotes.velocity.y * delta;
			emotes.group.position.z += emotes.velocity.z * delta;
			if (alive > emoteBirthspan && emotes.group.scale.x !== 1) {
				emotes.group.scale.setScalar(1);
			}
			if (alive > emoteLifespan - emoteDeathspan) {
				const fade = 1 - EasingFunctions.easeInCubic((alive - (emoteLifespan - emoteDeathspan)) / emoteDeathspan);
				emotes.group.scale.setScalar(fade);
			}
		}

		if (emotes.group && emotes.group.children.length === 0) {
			switch (emotes.type) {
				case 'leaf':
					const sprite = new THREE.Mesh(planeGeometry, leafMaterial);
					sprite.scale.setScalar(1)
					emotes.group.add(sprite)
					break;
				case 'emote':
					let offset = 0;
					for (let i = 0; i < emotes.emotes.length; i++) {
						const emote = emotes.emotes[i];
						if (emote && !emote.sprite) {
							//emote.sprite = new THREE.Sprite(emoteMaterials[emote.material.id]);
							emote.sprite = new THREE.Mesh(planeGeometry, emote);
							emote.sprite.scale.setScalar(emoteScale);
							emote.sprite.position.x += offset * emoteScale;
							emotes.group.add(emote.sprite);
							if (emote.name === "NaM" || emote.name === "AngelThump") {
								offset += 2;
								emote.sprite.scale.setScalar(emoteScale * 1.5);
								if (Math.random() > 0.99) {
									emote.sprite.scale.setScalar(emoteScale * 2.5);
								}
								emote.sprite.position.x += emoteScale * 0.5
							} else {
								offset += 1;
							}
						}
						if (emote && emote.sprite) {
							emote.sprite.material.needsUpdate = true;
						}
					}
			}
		}
	}

	renderer.render(scene, camera);
	if (query_vars.stats) stats.end();
};


window.addEventListener('DOMContentLoaded', () => {

	window.addEventListener('resize', resize);

	if (query_vars.stats) document.body.appendChild(stats.dom);

	init();
	draw();
})