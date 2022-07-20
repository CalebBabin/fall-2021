import * as THREE from 'three';
import webGLSimplex3DNoise from './simplex3DShaderCode';

const cloudUniforms = {
	u_time: { value: 0 },
}

const woodMat = new THREE.MeshStandardMaterial({
	flatShading: true,
	side: THREE.FrontSide,
	color: 0x824700,
});
woodMat.onBeforeCompile = function (shader) {
	shader.vertexShader = `
		${webGLSimplex3DNoise}
		${shader.vertexShader}`;
	shader.vertexShader = shader.vertexShader.replace(
		'#include <begin_vertex>',
		`
		float bnScale = 0.1;
		float baseNoise = snoise(vec3(position.x * bnScale + ${Math.random() * 100}, position.y * bnScale, position.z * bnScale));

		float noise = snoise(vec3(position.x, position.y, position.z));
		float rootNoise = snoise(vec3(position.x, position.y, position.z)) * PI;
		vec3 angle = vec3(sin(rootNoise), cos(rootNoise), 0.0);
		vec3 transformed = position + (angle * noise * 0.1) + (baseNoise * 0.4 * vec3(sin(baseNoise * PI), cos(baseNoise * PI), cos(baseNoise * PI)));
		`,
	);

	woodMat.userData.shader = shader;

};

// Make sure WebGLRenderer doesn't reuse a single program
woodMat.customProgramCacheKey = function () {
	console.log(window.shaderPID);
	return parseInt(window.shaderPID++); // some random ish number
};

export default woodMat;