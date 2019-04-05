#version 300 es
precision highp float;

uniform bvec3 u_bin;
uniform vec3 u_fin;
uniform sampler2D u_tex;

uniform float u_Time;

in vec2 fs_Pos;
out vec4 out_Col;

// Note: this will seem stretched b/c the texture is square
void main() {
  vec2 uv = (fs_Pos + 1.0)*0.5;
  vec4 coord = texture(u_tex, uv);
  float land_h = coord.x;
  float pop_den = coord.y;

  vec3 land_color = vec3(0.0,0.5,0.0);
  vec3 water_color = vec3(0.0,0.0,0.5);
  vec3 high_pop_color = vec3(0.5,0.0,0.0);
  vec3 debug_col = land_h > 0.4 ? land_color : water_color;
  debug_col = mix(debug_col, high_pop_color, pop_den);
    
  debug_col = u_bin.y ? vec3(land_h) : debug_col;
  debug_col = u_bin.z ? vec3(pop_den) : debug_col;

  //debug_col = u_bin.x ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0);
  //debug_col = u_bin.x ? vec3(0.5,0.0,0.0) : coord.rgb;
  //debug_col = coord.rgb;
  debug_col = vec3(coord.x);

  vec3 col = vec3(0.01, 0.01, 0.9);

  if (u_bin.x) {
    col = debug_col;
  }

  out_Col = vec4(col, 1.0);
}
