import {vec2, vec3,vec4} from 'gl-matrix';
import {setGL} from './globals';
import {Blob, generate_mesh} from './geometry/Blob';

// this many units is equal to 1 unit in the inputs map space
// (where the height and population density are generated)
export let TERRAIN_SCALE = 10.0;

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

// returns vec2 intersect if valid intersection, null ow
// https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection
function intersect_road(line_a, line_b) {
  let x1 = line_a[0][0];
  let y1 = line_a[0][1];
  let x2 = line_a[1][0];
  let y2 = line_a[1][1];
  let x3 = line_b[0][0];
  let y3 = line_b[0][1];
  let x4 = line_b[1][0];
  let y4 = line_b[1][1];
  let t_a = ((x1-x3)*(y3-y4)-(y1-y3)*(x3-x4)) / ((x1-x2)*(y3-y4)-(y1-y2)*(x3-x4));
  let t_b = -((x1-x2)*(y1-y3)-(y1-y2)*(x1-x3)) / ((x1-x2)*(y3-y4)-(y1-y2)*(x3-x4));
  let ep = 0.0001;
  if (ep <= t_a && t_a <= 1.0 - ep && ep <= t_b && t_b <= 1.0 - ep) {
    let delta = vec2.subtract(v2e(), line_a[1], line_a[0]);
    return vec2.add(v2e(), line_a[0], vec2.scale(v2e(), delta, t_a));
  } else {
    return null;
  }
}

// world_pos is a vec2
// returns [land_h, pop_den]
function sample_at_world_pos(map_sampler, world_pos) {
  let sample_pos = vec2.scale(v2e(), world_pos, 1.0 / TERRAIN_SCALE);
  return map_sampler(sample_pos);
}

// the rect spans [0,-0.5] to [1,0.5] in the xz plane. y is just above 0.
// scale in x to set the length, then rotate and translate
function gen_road_sample(x, y): any {
  let y_pos = -0.5 + y * (0.5 - (-0.5));
  let pos = v3(x, 0.01, y_pos);
  let nor = v3(0,1,0);
  return [pos, nor];
}

function run_system(map_sampler) {

  let highways = [];

  let seed_road = [v2(0,0), v2(1.0,0.0)];
  let queue = [seed_road];
  let num_iterations = 100;
  for (let i = 0; i < num_iterations && queue.length > 0; ++i) {
    // TODO - will be slow if large queue
    let road = queue.shift();
    let start_pos = road[0];
    let end_pos = road[1];
    let delta = vec2.subtract(v2e(), end_pos, start_pos);
    let len = vec2.distance(end_pos, start_pos);

    // evaluate the prospective road:

    // attempt to join to an existing road
    let did_intersect = false;
    let closest_inter_dist = Number.MAX_VALUE;
    let closest_inter_pt = null;
    for (let j = 0; j < highways.length; ++j) {
      let other_road = highways[j];
      let inter_pt = intersect_road(road, other_road);
      if (inter_pt === null) {
        continue;
      }
      did_intersect = true;
      let inter_dist = vec2.distance(start_pos, inter_pt);
      if (inter_dist < closest_inter_dist) {
        closest_inter_dist = inter_dist;
        closest_inter_pt = inter_pt;
      }
    }

    if (did_intersect) {
      // join the new road to the existing one
      highways.push([start_pos, closest_inter_pt]);
      continue;
    }

    // TODO
    /*
    let next_sample = sample_at_world_pos(map_sampler, next_pos);
    let next_land_h = next_sample[0];
    if (next_land_h < 0.4) {
      // in the water, skip
      continue;
    }
    */

    highways.push(road);
    
    // try new roads:
    let cur_sample = sample_at_world_pos(map_sampler, end_pos);
    let cur_land_h = cur_sample[0];
    let cur_pop_den = cur_sample[1];

    // TODO the higher the pop, the more branches
    let min_num_branches = 1;
    let max_num_branches = 3;
    //let num_branches = min_num_branches + Math.random() * (max_num_branches - min_num_branches);
    let num_branches = 3;
    // make the branches emanate from the center at roughly equal angle spacing
    let angle_spacing = 2.0 * Math.PI / (1.0 + num_branches);
    let current_angle = Math.atan2(delta[1], delta[0]);
    let start_angle = (Math.PI + current_angle) + angle_spacing;
    for (let j = 0; j < num_branches; ++j) {
      //let angle_offset = (0.5 * Math.PI) * (2.0 * (Math.random() - 0.5)); 
      let angle_offset = 0.0;
      let new_angle = start_angle + j*angle_spacing + angle_offset;
      let min_len = 0.3;
      let max_len = 1.0;
      let new_len = min_len + Math.random() * (max_len - min_len);
      let next_pos = vec2.add(v2e(), end_pos,
        vec2.scale(v2e(),
          v2(Math.cos(new_angle), Math.sin(new_angle)), new_len));
      let new_road = [v2c(end_pos), next_pos];
      queue.push(new_road);
    }
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
    let angle = Math.atan2(delta[1], delta[0]);

    roads.positions.push([start_pos[0], 0.0, start_pos[1]]);
    // due to the use of XZ, must rotate CCW about -y (equiv. CW about y)
    roads.rotations.push([0,-1,0,angle]);
    let road_width = 0.02;
    roads.scales.push([len,1.0,road_width]);
    let road_grey = 0.2;
    roads.colors.push([road_grey,road_grey,road_grey]);
  }

  let road_res = generate_mesh(2, 2, gen_road_sample);
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


