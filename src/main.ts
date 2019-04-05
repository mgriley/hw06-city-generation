import {vec2, vec3} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import ScreenQuad from './geometry/ScreenQuad';
import Plane from './geometry/Plane';
import {OpenGLRenderer, RENDER_TEX_LEN} from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import {TERRAIN_SCALE, generate_scene} from './turtle';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  bool_a: false,
  bool_b: false,
  bool_c: false,
  float_a: 0.0,
  float_b: 0.0,
  float_c: 0.0
};

let screenQuad: ScreenQuad;
let planeDrawable: Plane;
let scene_drawables;
let time: number = 0.0;

function regenerate_city(gl: WebGL2RenderingContext, canvas, renderer: OpenGLRenderer, inputs_shader: ShaderProgram) {
  screenQuad = new ScreenQuad();
  screenQuad.create();
  planeDrawable = new Plane(vec3.fromValues(0,0,0), vec2.fromValues(TERRAIN_SCALE,TERRAIN_SCALE), 20);
  planeDrawable.create();

  // generate the input image (height and population)
  inputs_shader.setControls(controls);
  renderer.renderInputMaps(inputs_shader, screenQuad);

  let map_data = new Float32Array(4 * RENDER_TEX_LEN * RENDER_TEX_LEN);
  gl.readPixels(0, 0, RENDER_TEX_LEN, RENDER_TEX_LEN, gl.RGBA, gl.FLOAT, map_data);
  console.log(map_data);

  // returns [land_height, pop_den]
  function map_sampler(x, y) {
    // assume x and y are in [0,1]
    let abs_x = Math.floor((RENDER_TEX_LEN - 1) * x);
    let abs_y = Math.floor((RENDER_TEX_LEN - 1) * y);
    let pt_index = 4 * (abs_y * RENDER_TEX_LEN + abs_x);
    let land_h = map_data[pt_index];
    let pop_den = map_data[pt_index + 1];
    return [land_h, pop_den];
  }

  // TODO - for debug
  console.log('(-1,-1): ', map_sampler(-1, -1));
  console.log('(-1, 1): ', map_sampler(-1, 1));
  console.log('(1, 1): ', map_sampler(1, 1));
  
  scene_drawables = generate_scene(map_sampler);
}

function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  const gui = new DAT.GUI();
  gui.add(controls, 'bool_a');
  gui.add(controls, 'bool_b');
  gui.add(controls, 'bool_c');
  gui.add(controls, 'float_a', 0, 1);
  gui.add(controls, 'float_b', 0, 1);
  gui.add(controls, 'float_c', 0, 1);

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // this is required to render to floating point format textures
  var ext = gl.getExtension('EXT_color_buffer_float');
  if (!ext) {
    alert('EXT_color_buffer_float not supported');
  }

  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  const camera = new Camera(vec3.fromValues(10, 10, -10), vec3.fromValues(0, 0, 0));
  //camera.controls.eye = [10, 10, -10];

  const renderer = new OpenGLRenderer(canvas, window.innerWidth, window.innerHeight);
  gl.enable(gl.DEPTH_TEST);

  const inputMapShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/inputs-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/inputs-frag.glsl')),
  ]);

  const backgroundShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/background-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/background-frag.glsl')),
  ]);

  const elevationShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/elevation-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/elevation-frag.glsl')),
  ]);

  const instancedShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/instanced-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/instanced-frag.glsl')),
  ]);

  regenerate_city(gl, canvas, renderer, inputMapShader);

  // This function will be called every frame
  function tick() {
    camera.update();
    stats.begin();

    //console.log('camera eye: ', camera.controls.eye);
    //console.log('camera center: ', camera.controls.center);

    renderer.renderScene(
      time, controls,
      camera,
      inputMapShader,
      backgroundShader,
      elevationShader,
      instancedShader,
      screenQuad,
      planeDrawable,
      scene_drawables
    );

    time++;
    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}

main();
