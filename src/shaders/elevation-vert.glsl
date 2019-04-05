#version 300 es

uniform mat4 u_ViewProj;
uniform float u_Time;
uniform bvec3 u_bin;
uniform vec3 u_fin;

// TODO - probs no need to sample the texture since using its noise funcs
uniform sampler2D u_tex;

in vec4 vs_Pos;
in vec4 vs_Nor;
in vec2 vs_UV;

out vec4 fs_Col;
out vec4 fs_Pos;
out vec3 fs_Nor;

void main()
{
  // TODO - set the y component based on noise
  vec4 pos = vs_Pos;
  fs_Pos = pos;

  // TODO set from gradient
  fs_Nor = vs_Nor.xyz;

  fs_Col = vec4(0.0, 1.0, 0.0, 1.0);

  gl_Position = u_ViewProj * pos;
}
