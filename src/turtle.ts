import {vec2, vec3,vec4} from 'gl-matrix';
import {setGL} from './globals';
import {Blob, generate_mesh} from './geometry/Blob';

function v2(x, y) {
  return vec2.fromValues(x, y);
}

function v2e() {
  return v2(0,0);
}

function v2c(other) {
  return vec2.copy(v2e(), other);
}

function v3(x, y, z) {
  return vec3.fromValues(x, y, z);
}

function v3e() {
  return v3(0,0,0);
}

function v4(x, y, z, w) {
  return vec4.fromValues(x, y, z, w);
}

function gen_rect(x, y): any {
  let pos = v3(x, y, 0);
  let nor = v3(0,1,0);
  return [pos, nor];
}

function create_turtle() {
  return {
    position: vec3.fromValues(0,0,0),
    // xyz is axis, z is angle
    // TODO - perhaps use quat
    rotation: vec4.fromValues(1,0,0,0),
    scale: vec3.fromValues(1,1,1),
    color: vec3.fromValues(1,0,0)
  };
}

function copy_turtle(turtle) {
  let t_copy = create_turtle();
  vec3.copy(t_copy.position, turtle.position);
  vec4.copy(t_copy.rotation, turtle.rotation);
  vec3.copy(t_copy.scale, turtle.scale);
  vec3.copy(t_copy.color, turtle.color);
  return t_copy;
}

function create_rule(funcs, probs) {
  return {
    funcs: funcs,
    probs: probs
  };
}

function det_rule(func) {
  return create_rule([func], [1]);
}

function select_func(rule) {
  let rand_num = Math.random();
  let prob_sum = 0;
  for (let i = 0; i < rule.funcs.length; ++i) {
    prob_sum += rule.probs[i];
    if (rand_num < prob_sum) {
      return rule.funcs[i];
    }
  }
}

function setup_instances(drawable, instance_data) {
  let pos_list = instance_data.positions.map(p => [p[0],p[1],p[2]]).flat();
  let rotation_list = instance_data.rotations.map(v => [v[0],v[1],v[2],v[3]]).flat();
  let scale_list = instance_data.scales.map(v => [v[0],v[1],v[2]]).flat();
  let color_list = instance_data.colors.map(v => [v[0],v[1],v[2], 1.0]).flat();

  let positions = new Float32Array(pos_list);
  let rotations = new Float32Array(rotation_list);
  let scales = new Float32Array(scale_list);
  let colors = new Float32Array(color_list);

  drawable.setInstanceVBOs(positions, rotations, scales, colors);
  drawable.setNumInstances(instance_data.positions.length);
}

function add_instance(instance_data, pos, rot, scale, col) {
  instance_data.positions.push(pos);
  instance_data.rotations.push(rot);
  instance_data.scales.push(scale);
  instance_data.colors.push(col);
}

function draw_instance(instance_data, turtle) {
  let pos = vec3.clone(turtle.position);
  let rot = vec4.clone(turtle.rotation);
  let scale = vec3.clone(turtle.scale);
  let color = vec3.clone(turtle.color);
  add_instance(instance_data, pos, rot, scale, color);
}


function run_system(map_sampler) {

  let highways = [];
  let streets = [];

  let seed_road = [v2(0,0), v2(0.2,0.2)];
  let queue = [seed_road];
  let num_iterations = 100;
  for (let i = 0; i < num_iterations && queue.length > 0; ++i) {
    // TODO - will be slow if large queue
    let road = queue.shift();
    let start_pos = road[0];
    let end_pos = road[1];
    let delta = vec2.subtract(v2e(), end_pos, start_pos);
    let len = vec2.distance(end_pos, start_pos);

    highways.push(road);
    
    // try new roads:
    // TODO - sampling is misaligned with the texture
    /*
    let cur_sample = map_sampler(end_pos[0], end_pos[1]);
    let cur_land_h = cur_sample[0];
    let cur_pop_den = cur_sample[1];
     */

    let num_attempts = 3 * Math.random() + 1;
    for (let j = 0; j < num_attempts; ++j) {
      
      // the higher the population, the more ragged the highways
      let angle_offset = /*cur_pop_den * */0.4 * Math.PI * 2.0 * (Math.random() - 0.5); 
      let current_angle = Math.atan2(delta[0], delta[1]);
      let new_angle = current_angle + angle_offset;
      let new_len = 0.3 * Math.random();
      let next_pos = vec2.add(v2e(), end_pos,
        vec2.scale(v2e(),
          v2(Math.cos(new_angle), Math.sin(new_angle)), new_len));
      
      /*
      let next_sample = map_sampler(next_pos[0], next_pos[1]);
      let next_land_h = next_sample[0];
      if (next_land_h < 0.4) {
        // in the water, skip
        continue;
      }
       */

      let new_road = [v2c(end_pos), next_pos];
      queue.push(new_road);
    }
    /*
    let old_offset = vec2.subtract(v2e(), end_pos, start_pos);
    let new_road = [vec2.copy(v2e(), end_pos), vec2.add(v2e(), end_pos, old_offset)];
    queue.push(new_road);
     */
  }

  let roads = {
    positions: [],
    rotations: [],
    scales: [],
    colors: []
  };
  // for debug
  /*
  let seed_start = seed_road[0];
  let seed_end = seed_road[1];
  roads.positions.push([seed_start[0], seed_start[1], 0]);
  roads.rotations.push([1,0,0,0]);
  roads.scales.push([0.1,0.1,0.1]);
  roads.colors.push([1.0,0.0,0.0]);
  roads.positions.push([seed_end[0], seed_end[1], 0]);
  roads.rotations.push([1,0,0,0]);
  roads.scales.push([0.1,0.1,0.1]);
  roads.colors.push([1.0,0.0,0.0]);
   */

  for (let i = 0; i < highways.length; ++i) {
    let highway = highways[i];
    let start_pos = highway[0];
    let end_pos = highway[1];
    let delta = vec2.subtract(v2e(), end_pos, start_pos);
    let len = vec2.distance(end_pos, start_pos);
    let angle = Math.atan2(delta[0], delta[1]);

    roads.positions.push([start_pos[0], start_pos[1], 0]);
    roads.rotations.push([0,0,1,angle]);
    roads.scales.push([len,0.005,0.005]);
    roads.colors.push([0,0,0]);
  }
  // TODO - streets, too

  let road_res = generate_mesh(2, 2, gen_rect);
  let road_drawable = new Blob(road_res[0], road_res[1], road_res[2]);
  road_drawable.create();
  setup_instances(road_drawable, roads);

  let drawables = [road_drawable];

  return drawables;
}

// returns a list of drawables to render with the instanced shader
export function generate_scene(map_sampler) {
  let drawables = [];

  let gen_drawables = run_system(map_sampler);

  drawables.push(...gen_drawables);

  return drawables;
}

// TODO - remove
/*
function gen_sphere(x, y): any  {
  let v_angle = y * Math.PI;    
  let h_angle = x * 2.0 * Math.PI;
  let pos = v3(
    Math.sin(v_angle) * Math.cos(h_angle),
    Math.sin(v_angle) * Math.sin(h_angle),
    Math.cos(v_angle));
  let nor = vec3.clone(pos);
  return [pos, nor];
}

function gen_torus(nx, ny): any {
  let theta = nx * 2 * Math.PI;
  let phi = ny * 2 * Math.PI;
  let ring_pos = v3(Math.cos(theta), 0, Math.sin(theta));
  let inner_r = 0.2;
  let pos = vec3.add(v3e(),
    vec3.scale(v3e(), vec3.negate(v3e(), ring_pos), inner_r*Math.cos(phi)),
    vec3.scale(v3e(), v3(0,1,0), inner_r*Math.sin(phi)));
  vec3.add(pos, pos, ring_pos);
  let nor = vec3.subtract(v3e(), pos, ring_pos);
  return [pos, nor];
}

function gen_ground(x, y): any {
  let pos = v3(
    (x - 0.5) * 20.0,
    0,
    (y - 0.5) * 20.0
  );
  let nor = v3(0,1,0);
  return [pos, nor];
}

function create_ground() {
  let res = generate_mesh(2, 2, gen_ground);
  let seg = new Blob(res[0],res[1],res[2]);
  seg.create();

  let offsets = new Float32Array([
    0,0,0,
  ]);
  let rotations = new Float32Array([
    1,0,0,0,
  ]);
  let scales = new Float32Array([
    1,1,1,
  ]);
  let colors = new Float32Array([
    0.5,0.1,0,1,
  ]);
  seg.setInstanceVBOs(offsets, rotations, scales, colors);
  seg.setNumInstances(1);
  return seg;
}
*/


