import * as THREE from 'three';
import webGLSimplex3DNoise from './simplex3DShaderCode';

const cloudUniforms = {
	u_time: { value: 0 },
}

let lastFrame = Date.now();
const tick = () => {
	const delta = (Date.now() - lastFrame) / 1000;
	lastFrame = Date.now();
	cloudUniforms.u_time.value += delta;
	window.requestAnimationFrame(tick);
}
tick();


const foliageMat = new THREE.MeshStandardMaterial({
	flatShading: true,
	side: THREE.FrontSide,
	color: 0xD39C2E,
});
foliageMat.onBeforeCompile = function (shader) {
	shader.uniforms.u_time = cloudUniforms.u_time;
	shader.vertexShader = `
		uniform float u_time;
		${webGLSimplex3DNoise}
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

	foliageMat.userData.shader = shader;

};

// Make sure WebGLRenderer doesn't reuse a single program
foliageMat.customProgramCacheKey = function () {
	console.log(window.shaderPID);
	return parseInt(window.shaderPID++); // some random ish number
};

export default foliageMat;