import {mat4,vec3} from 'gl-matrix'

interface XYZ{
    x:number,
    y:number,
    z:number,
}

export const getMvpMatrix = (
    aspect:number,
    position:XYZ,
    rotation:XYZ,
    scale:XYZ,
): Float32Array =>{
    // 1. 获取模型视图的矩阵 modelView
    const modelViewMatrix = createModelViewMatrix(position,rotation,scale)
    // 2. 创建投影矩阵 projection
    const projectMatrix = createProjectionMatrix(aspect)
    // 3. 创建mvp矩阵 projection * modelView
    const mvpMatrix = mat4.create()
    mat4.multiply(mvpMatrix,projectMatrix,modelViewMatrix)

    return <Float32Array>mvpMatrix
}

export const createModelViewMatrix = (
    position:XYZ,
    rotation:XYZ,
    scale:XYZ,
): Float32Array =>{
    const modelViewMatrix = mat4.create()
    mat4.translate(
        modelViewMatrix,
        modelViewMatrix,
        vec3.fromValues(position.x,position.y,position.z)
    )
    mat4.scale(
        modelViewMatrix,
        modelViewMatrix,
        vec3.fromValues(scale.x,scale.y,scale.z)
    )
    mat4.rotateX(
         modelViewMatrix,
        modelViewMatrix,
        rotation.x
    )
    mat4.rotateY(
         modelViewMatrix,
        modelViewMatrix,
        rotation.y
    )
    mat4.rotateZ(
         modelViewMatrix,
        modelViewMatrix,
        rotation.z
    )
    return <Float32Array>modelViewMatrix
}

export const createProjectionMatrix = (
    aspect:number,
    fov=(60/180) * Math.PI,
    near=1,
    far = 100,
    {x,y,z} = {x:0,y:0,z:0}
): Float32Array =>{
    const cameraView = mat4.create()
    const eye = vec3.fromValues(x,y,z)
    const center = vec3.fromValues(0,0,0)
    const up = vec3.fromValues(0,1,0)

    mat4.translate(cameraView,cameraView,eye)
    mat4.lookAt(cameraView,eye,center,up)

    const projectMatrix = mat4.create()
    mat4.perspective(projectMatrix,fov,aspect,near,far)
    //计算投影矩阵
    mat4.multiply(projectMatrix,projectMatrix,cameraView)

    return <Float32Array>projectMatrix
}