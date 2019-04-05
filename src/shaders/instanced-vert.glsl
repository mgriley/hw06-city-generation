#version 300 es

uniform mat4 u_ViewProj;
uniform float u_Time;

in vec4 vs_Pos; // Non-instanced; each particle is the same quad drawn in a different place
in vec4 vs_Nor;
in vec2 vs_UV; // Non-instanced, and presently unused in main(). Feel free to use it for your meshes.

// per instance
in vec4 vs_Col;
in vec3 vs_Translate;
in vec4 vs_Rotate;
in vec3 vs_Scale;

out vec4 fs_Col;
out vec4 fs_Pos;
out vec3 fs_Nor;

mat4 rotation_matrix(vec3 axis, float angle) {
  // using Rodrigue's formula
  mat3 K = mat3(vec3(0, axis.z, -axis.y), vec3(-axis.z, 0, axis.x), vec3(axis.y, -axis.x, 0));
  mat3 res = mat3(1.0) + sin(angle)*K + (1.0 - cos(angle))*K*K;
  return mat4(res);
}

mat4 scale_matrix(vec3 scale) {
  return mat4(mat3(vec3(scale.x,0,0),vec3(0,scale.y,0),vec3(0,0,scale.z)));
}

mat4 translate_matrix(vec3 translate) {
  mat4 res = mat4(1.0);
  res[3] = vec4(translate,1.0);
  return res;
}

void main()
{
    // instance transform  
    mat4 rotate = rotation_matrix(vs_Rotate.xyz, vs_Rotate.w);
    mat4 scale = scale_matrix(vs_Scale);
    mat4 translate = translate_matrix(vs_Translate);
    mat4 instance_trans = translate * rotate * scale;
    vec4 pos = instance_trans * vec4(vs_Pos);
    // TODO - use inv transpose if nonuniform scales
    vec4 nor = instance_trans * vec4(vs_Nor);

    fs_Col = vs_Col;
    fs_Pos = pos;
    fs_Nor = normalize(nor.xyz);
    // TODO - just extract the required components, no need for viewproj
    //gl_Position = u_ViewProj * pos;
    gl_Position = pos;
}
