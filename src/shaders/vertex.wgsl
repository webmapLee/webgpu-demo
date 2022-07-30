/**
vertex
fn main(@builtin(vertex_index) Vertex_index:u32) -> @builtin(position) vec4 {
    var pos = ref<array<vec2<f32>,3>> = array<vec2<f32>,3>(
        vec2<f32>(0.0,0.5),
        vec2<f32>(-0.5,-0.5),
        vec2<f32>(0.5,-0.5)
    );
    return vec4<f32>(pos[Vertex_index],0.0,1.0);
}

**/

@vertex
fn main(@builtin(vertex_index) Vertex_index: u32) -> @builtin(position) vec4<f32> {
    var pos = array<vec2<f32>, 3>(
        vec2<f32>(0.0, 0.5),
        vec2<f32>(-0.5, -0.5),
        vec2<f32>(0.5, -0.5),
    );
    return vec4<f32>(pos[Vertex_index], 0.0, 1.0);
} 