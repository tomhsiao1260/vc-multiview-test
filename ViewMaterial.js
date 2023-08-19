import { ShaderMaterial, Vector2 } from "three";

export class ViewMaterial extends ShaderMaterial {
  constructor(params) {
    super({
      uniforms: {
        uTexture : { value: null } 
      },

      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          // vUv = vec2(uv.x, 1.0 - uv.y);
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
      `,

      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform sampler2D uTexture;

        void main() {
          vec3 color = vec3(vUv, 1.0);

          // gl_FragColor = vec4(vUv, 1.0, 1.0);
          gl_FragColor = texture2D(uTexture, vUv);
        }
      `
    });

    this.setValues(params);
  }
}
