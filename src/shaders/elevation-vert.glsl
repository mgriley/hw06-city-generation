#version 300 es

uniform mat4 u_ViewProj;
uniform float u_Time;
uniform bvec3 u_bin;
uniform vec3 u_fin;
uniform sampler2D u_tex;

in vec4 vs_Pos;
in vec4 vs_Nor;
in vec2 vs_UV;

out vec4 fs_Col;
out vec4 fs_Pos;
out vec3 fs_Nor;

/*
Samples the terrain at the given unit in world units.
The world plane is 10x10.
*/
vec2 sample_terrain(vec2 world_pos) {
  float terrain_scale = 10.0;
  vec2 uv = (world_pos / terrain_scale + 0.5);
  vec4 coord = texture(u_tex, uv);
  return coord.xy;
}

void main()
{
  // note that after view-proj +ve x is to the left
  vec2 terrain_sample = sample_terrain(vs_Pos.xz);
  float land_h = terrain_sample.x;
  float pop_den = terrain_sample.y;

  float max_h = 0.2;
  float amt_land = smoothstep(0.4,0.5,land_h);
  float out_h = max_h*amt_land - max_h;

  vec4 pos = vec4(vs_Pos.x, out_h, vs_Pos.z, 1.0);
  fs_Pos = pos;

  // TODO set from gradient
  //fs_Nor = normalize(vs_Nor.xyz);
  fs_Nor = vec3(0.0,1.0,0.0);

  vec3 land_color = vec3(0.17,0.52,0.21);
  vec3 water_color = vec3(0.01,0.53,0.66);
  vec3 col = mix(water_color, land_color, amt_land);

  //col = vec3(land_h);
  //col = vec3(vs_Pos.x / terrain_scale + 0.5);
  //col = vec3(sample_pos.y);

  fs_Col = vec4(col, 1.0);

  gl_Position = u_ViewProj * pos;
}
