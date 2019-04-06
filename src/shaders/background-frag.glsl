#version 300 es
precision highp float;

uniform bvec3 u_bin;
uniform vec3 u_fin;
uniform sampler2D u_tex;

uniform float u_Time;
uniform vec2 u_Dims;

in vec2 fs_Pos;
out vec4 out_Col;

// Procedural clouds code pasted from one of my private ShaderToy programs:
// Based on: https://www.iquilezles.org/www/articles/dynclouds/dynclouds.htm

const float pi = 3.141592;

vec2 hash2( vec2 p ) { p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))); return fract(sin(p)*18.5453); }
vec3 hash3( float n ) { return fract(sin(vec3(n,n+1.0,n+2.0))*vec3(338.5453123,278.1459123,191.1234)); }
float hash(vec2 p) {
	return fract(dot(hash2(p),vec2(1.0,0.0)));
}

vec3 hash3(vec3 p) {
	p=vec3(dot(p,vec3(127.1,311.7,732.1)),dot(p,vec3(269.5,183.3,23.1)),dot(p,vec3(893.1,21.4,781.2))); return fract(sin(p)*18.5453);	
}
float hash3to1(vec3 p) {
	return fract(dot(hash3(p),vec3(32.32,321.3,123.2)));
}

float smooth_grad_2d(vec2 pos) {
	vec2 g = floor(pos);
    vec2 f = fract(pos);
	
    vec2 b = vec2(0.0,1.0);
    vec2 points[4] = vec2[4](b.xx, b.xy, b.yx, b.yy);
    float sum = 0.0;
    for (int i = 0; i < points.length(); ++i) {
    	vec2 grad = 2.0*(hash2(g+points[i])-0.5);
        vec2 delta = f-points[i];
        float weight = 1.0-smoothstep(0.0,1.0,length(delta));
        sum += weight*dot(grad,delta);
    }
    
    return clamp(0.0,1.0,0.5+0.5*sum);
}

float gradient_noise_3d(vec3 pos) {
	vec3 g = floor(pos);
    vec3 f = fract(pos);
    vec3 i = f*f*f*f*(f*(f*6.0-15.0)+10.0);
    
    vec2 b = vec2(0.0,1.0);
    
    vec3 g000 = 2.0*(hash3(g+b.xxx) - 0.5);
    vec3 g001 = 2.0*(hash3(g+b.xxy) - 0.5);
    vec3 g010 = 2.0*(hash3(g+b.xyx) - 0.5);
    vec3 g011 = 2.0*(hash3(g+b.xyy) - 0.5);
    vec3 g100 = 2.0*(hash3(g+b.yxx) - 0.5);
    vec3 g101 = 2.0*(hash3(g+b.yxy) - 0.5);
    vec3 g110 = 2.0*(hash3(g+b.yyx) - 0.5);
    vec3 g111 = 2.0*(hash3(g+b.yyy) - 0.5);
    
    float d000 = dot(g000,f-b.xxx);
    float d001 = dot(g001,f-b.xxy);
    float d010 = dot(g010,f-b.xyx);
    float d011 = dot(g011,f-b.xyy);
    float d100 = dot(g100,f-b.yxx);
    float d101 = dot(g101,f-b.yxy);
    float d110 = dot(g110,f-b.yyx);
    float d111 = dot(g111,f-b.yyy);
    
    return 0.5+0.5*mix(
    	mix(
        	mix(d000,d100,i.x),
            mix(d010,d110, i.x),
            i.y
        ),
        mix(
        	mix(d001,d101,i.x),
            mix(d011,d111,i.x),
            i.y
        ),
        i.z
    );
}

float fbm(vec3 pos) {
    float freq = 1.0;
    float weight = 0.5;
    float val = 0.0;
    float weight_sum = 0.0;
    for (int i = 0; i < 3; ++i) {
    	val += weight * gradient_noise_3d(pos * freq);
        weight_sum += weight;
        weight *= 0.5;
        freq *= 2.0;
    }
    return val / weight_sum;
}

vec3 cast_ray(vec2 uv, vec3 eye, vec3 ref) {
    float fov_v = pi / 4.0;
	float dist = length(ref - eye);
    vec2 ndc = (uv - 0.5)*2.0;
    float v = tan(fov_v)*dist;
    float h = v * u_Dims.x / u_Dims.y;
    vec3 up = vec3(0.0,1.0,0.0);
    vec3 right = cross((ref - eye)/dist, up);
    vec3 target = ref + ndc.x*h*right + ndc.y*v*up;
    return normalize(target - eye);
}

float map(float new_min, float new_max, float cur_min, float cur_max, float val) {
	float f = (clamp(cur_min,cur_max,val)-cur_min)/(cur_max-cur_min);
    return new_min+f*(new_max-new_min);
}

vec4 gen_sky(vec2 ndc) {
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = (ndc + 1.0) * 0.5;

    vec3 ro = vec3(0.0,0.0,-10.0);
    vec3 rd = cast_ray(uv, ro, vec3(0.0));
    //vec3 col = 0.5+0.5*rd;
    
    vec3 col;
    if (uv.y > 0.0) {
        // sun (gradually greater highlights while pointing in the sun direction)
        //vec3 light1 = normalize(vec3(-1.0,1.0,1.0));
        vec3 light1 = normalize(vec3(-0.8,0.5,1.0));
        float sundot = clamp(dot(light1, rd),0.0,1.0);
        col = vec3(0.2,0.5,0.85)*1.1-rd.y*rd.y*0.5;
        col += 0.25*vec3(1.0,0.7,0.4)*pow(sundot,5.0);
        col += 0.25*vec3(1.0,0.8,0.6)*pow(sundot,64.0);
        col += 0.3*vec3(1.0,0.8,0.6)*pow(sundot,500.0);
        
        // clouds
        // intersect with a plane high above the ground
        float cloud_height = 1000.0;
        vec2 cloud_pos = ro.xz + (cloud_height-ro.y)/rd.y * rd.xz;
        vec2 pos_offset = vec2(u_Time / (60.0 * 20.0));
        float c_noise = fbm(vec3(cloud_pos/1000.0+pos_offset, u_Time/(60.0 * 6.0)));
        col = mix(col, vec3(1.0,0.95,1.0), smoothstep(0.45,1.0,c_noise));
        
        // horizon
        // very slight darkening as rd.y -> 0
        col = mix(col, 0.68*vec3(0.4,0.65,1.0), pow(1.0-max(rd.y,0.0),16.0));
    } else {
    	col = vec3(0.2);	
    }
    
    return vec4(col,1.0);
}

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

  vec3 col = vec3(0.73, 0.83, 0.86);

  /*
  if (u_bin.x) {
    col = debug_col;
  }
  */

  out_Col = vec4(col, 1.0);
  // eh, don't use, not well integrated
  //out_Col = gen_sky(fs_Pos);
}
