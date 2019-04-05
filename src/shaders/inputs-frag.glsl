#version 300 es
precision highp float;

uniform bvec3 u_bin;
uniform vec3 u_fin;

uniform float u_Time;

in vec2 fs_Pos;
out vec4 out_Col;

vec2 hash2( vec2 p ) { p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))); return fract(sin(p)*18.5453); }

vec2 random2( vec2 p , vec2 seed) {
  return fract(sin(vec2(dot(p + seed, vec2(311.7, 127.1)), dot(p + seed, vec2(269.5, 183.3)))) * 85734.3545);
}

float surflet_noise(vec2 p, vec2 seed) {
  // use the surface-lets technique
  // scale is the length of a cell in the perlin grid
  float scale = 10.0;
  vec2 base = floor(p / scale);
  vec2 corners[4] = vec2[4](
    base,
    base + vec2(1.0, 0.0),
    base + vec2(0.0, 1.0),
    base + vec2(1.0, 1.0)
  );
  float sum = 0.0;
  for (int i = 0; i < 4; ++i) {
    vec2 corner = scale * corners[i];
    vec2 corner_dir = 2.0 * random2(corner, seed) - vec2(1.0);
    vec2 delta = p - corner;
    // this is the height if we were only on a slope of
    // magnitude length(corner_dir) in the direction of corner_dir
    float sloped_height = dot(delta, corner_dir);
    float weight = 1.0 - smoothstep(0.0, scale, length(delta));
    sum += 0.25 * weight * sloped_height;
  }
  return (sum + 1.0) / 2.0;
}

vec2 sample_map(vec2 pos) {
  float height = surflet_noise(30.0*pos, vec2(10.0, 21.0));
  float pop_density = surflet_noise(30.0*pos, vec2(75.0, 89.0));
  return vec2(height, pop_density);
}

void main() {
  vec2 params = sample_map(fs_Pos);
  float height = params.x;
  float pop_density = params.y;
  
  vec3 col = vec3(height, pop_density, 0.0);
  //col = vec3(0.0,0.2,0.0);
  //col = vec3(0.5*(fs_Pos.xy + 1.0), 0.0);

  out_Col = vec4(col, 1.0);
}
