#version 300 es
precision highp float;

uniform bvec3 u_bin;
uniform vec3 u_fin;
uniform sampler2D u_tex;

uniform vec3 u_Eye, u_Ref, u_Up;
uniform vec2 u_Dimensions;
uniform float u_Time;

in vec2 fs_Pos;
out vec4 out_Col;

void main() {
  vec2 uv = (fs_Pos + 1.0)*0.5;
  vec4 coord = texture(u_tex, uv);
  float land_h = coord.x;
  float pop_den = coord.y;

  vec3 land_color = vec3(0.0,0.5,0.0);
  vec3 water_color = vec3(0.0,0.0,0.5);
  vec3 high_pop_color = vec3(0.5,0.0,0.0);
  vec3 col = land_h > 0.4 ? land_color : water_color;
  col = mix(col, high_pop_color, pop_den);
    
  col = u_bin.y ? vec3(land_h) : col;
  col = u_bin.z ? vec3(pop_den) : col;

  //col = u_bin.x ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0);
  //col = u_bin.x ? vec3(0.5,0.0,0.0) : coord.rgb;

  out_Col = vec4(col, 1.0);
}
