import {mat4, vec4, mat3} from 'gl-matrix';
import Drawable from './Drawable';
import Camera from '../../Camera';
import {gl} from '../../globals';
import ShaderProgram from './ShaderProgram';

export let RENDER_TEX_LEN = 1024;

// In this file, `gl` is accessible because it is imported above
export class OpenGLRenderer {
  fbo: WebGLFramebuffer;
  render_texture: WebGLTexture;

  constructor(public canvas: HTMLCanvasElement, w: number, h: number) {
    // setup buffers for two-stage rendering
    
    // NB: the storage is set in setSize
    this.render_texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.render_texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, RENDER_TEX_LEN, RENDER_TEX_LEN, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // NB: the storage is set in setSize
    // NB: the depth buffer isn't actually necessary in this case
    /*
    this.depth_buffer = gl.createRenderbuffer()
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depth_buffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
     */

    this.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    //gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depth_buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.render_texture, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
      console.error('framebuffer is  not complete')
    }
  }

  setSize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  renderInputMaps(prog: ShaderProgram, square: Drawable) {
    // render to texture
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, RENDER_TEX_LEN, RENDER_TEX_LEN);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    prog.draw(square)
  }

  renderScene(
    time: number,
    controls: any,
    camera: Camera,
    inputs_prog: ShaderProgram,
    background_prog: ShaderProgram,
    elevation_prog: ShaderProgram,
    instanced_prog: ShaderProgram,
    screen_quad: Drawable,
    plane_drawable: Drawable,
    instanced_drawables: Array<Drawable>
  ) {
    let model = mat4.create();
    let viewProj = mat4.create();
    let color = vec4.fromValues(1, 0, 0, 1);

    mat4.identity(model);
    mat4.multiply(viewProj, camera.projectionMatrix, camera.viewMatrix);
    
    // set common shader inputs
    let all_shaders = [inputs_prog, background_prog, elevation_prog,
      instanced_prog]
    for (let i = 0; i < all_shaders.length; ++i) {
      let shader = all_shaders[i];
      shader.setTime(time);
      shader.setControls(controls);
      shader.setModelMatrix(model);
      shader.setViewProjMatrix(viewProj);
      // Note: texture unit 0 is active by default
      shader.setTextureUnit(0);
    }

    // this generates the data that will immediately be read by the
    // terrain shader. Note that it must be called here (rather than
    // once before all rendering) b/c webgl will clear the FBO automatically
    this.renderInputMaps(inputs_prog, screen_quad);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, this.render_texture);

    background_prog.draw(screen_quad);

    elevation_prog.draw(plane_drawable);

    instanced_drawables = controls.bool_a ? [] : instanced_drawables;
    for (let drawable of instanced_drawables) {
      instanced_prog.draw(drawable);
    }
  }
};

