@group(0) @binding(0) var<uniform> mvpMatrix:mat4x4<f32>;

//mvp的矩阵乘以立方体的位置
//注意左乘右乘的问题

struct VertexOutput{
    @builtin(position) Position:vec4<f32>,
    @location(0) fragUV:vec2<f32>,
    @location(1) fragPosition:vec4<f32>
}

@vertex
fn main(
    @location(0) position:vec4<f32>,
    @location(1) uv:vec2<f32>
 ) -> VertexOutput{
    var output:VertexOutput;
    output.Position = mvpMatrix * position;
    output.fragUV = uv;

    // 不知道这个是怎么计算的？ 这个是片元着色器的值
    output.fragPosition = 0.5 * (position + vec4<f32>(1.0,1.0,1.0,1.0));
    return output;
}