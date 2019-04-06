import {vec3, vec4} from 'gl-matrix';
import {Drawable, set_instance_data} from '../rendering/gl/Drawable';
import {gl} from '../globals';

function generate_mesh(samples_x, samples_y, attr_func): any {
  let indices = []
  let positions = []
  let normals = []

  function idx(x, y) {
    return (x % samples_x) + samples_x * (y % samples_y);  
  }

  for (let y = 0; y < samples_y; ++y) {
    for (let x = 0; x < samples_x; ++x) {
      let [pos, normal] = attr_func(x / (samples_x - 1), y / (samples_y - 1));  
      positions.push(pos);
      normals.push(normal);

      // indices for a completed patch
      if (x > 0 && y > 0) {
        let patch_a = idx(x - 1, y - 1);
        let patch_b = idx(x, y - 1);
        let patch_c = idx(x - 1, y);
        let patch_d = idx(x, y);
        indices.push(patch_a, patch_b, patch_d, patch_d, patch_c, patch_a);
      }
    }
  }
  return [indices, positions, normals]
}

class Blob extends Drawable {
  gen_indices: any;
  gen_positions: any;
  gen_normals: any;

  indices: Uint32Array;
  positions: Float32Array;
  normals: Float32Array;

  // instanced
  colors: Float32Array;
  offsets: Float32Array;
  rotations: Float32Array;
  scales: Float32Array;

  // the generated indices, positions, and normals of a call to generated_mesh
  constructor(gen_indices, gen_positions, gen_normals) {
    super(); // Call the constructor of the super class. This is required.
    this.gen_indices = gen_indices;
    this.gen_positions = gen_positions;
    this.gen_normals = gen_normals;
  }

  create() {

    let [indices, positions, normals] = [this.gen_indices, this.gen_positions, this.gen_normals];
    positions = positions.map(p => [p[0], p[1], p[2], 1.0]);
    normals = normals.map(function(n) {
      let v = vec3.fromValues(n[0],n[1],n[2]);
      vec3.normalize(v, v);
      return [v[0], v[1], v[2], 0.0];
    });

    this.indices = new Uint32Array(indices);
    this.positions = new Float32Array(positions.flat());
    this.normals = new Float32Array(normals.flat());

    this.generateIdx();
    this.generatePos();
    this.generateNor();
    this.generateCol();
    this.generateTranslate();
    this.generateRotate();
    this.generateScale();

    this.count = this.indices.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
    gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNor);
    gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);

    console.log(`Created blob`);
  }

  setInstanceVBOs(offsets: Float32Array, rotations: Float32Array,
    scales: Float32Array, colors: Float32Array) {
    set_instance_data(this, offsets, rotations, scales, colors);
  }
};

export {Blob, generate_mesh};
