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
*/
vec2 sample_terrain(vec2 world_pos) {
  // the plane is 10x10
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

  vec4 pos = vec4(vs_Pos.xyz, 1.0);
  fs_Pos = pos;

  // TODO set from gradient
  //fs_Nor = normalize(vs_Nor.xyz);
  fs_Nor = vec3(0.0,1.0,0.0);

  //vec3 col = vec3(1.0,0.0,0.0);
  vec3 col = vec3(land_h);
  //col = vec3(vs_Pos.x / terrain_scale + 0.5);
  //col = vec3(sample_pos.y);

  fs_Col = vec4(col, 1.0);

  gl_Position = u_ViewProj * pos;
}
