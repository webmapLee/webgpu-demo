//Initialize webgpu 创建webgpu
import vertWgsl from './shaders/cube.vertex.wgsl?raw'
import fragment from './shaders/cube.fragment.wgsl?raw'
import {hex2rgb} from '../utils/colors'
import {cubeVertex,vertexCount} from '../utils/cube'
import { getMvpMatrix } from '../utils/matrix';

interface VertexObjType {
    vertex: Float32Array;
    vertexBuffer: GPUBuffer;
}

interface ColorObjType {
     color: Float32Array; 
     colorBuffer: GPUBuffer; 
     group: GPUBindGroup;
}


class Renderer{
    canvas:HTMLCanvasElement
    format = navigator.gpu.getPreferredCanvasFormat()
    device!:GPUDevice
    context!:GPUCanvasContext
    #vertexObj!:VertexObjType
    #pipline!:GPURenderPipeline
    #colorObj!:ColorObjType
    #mvpBuffer!:GPUBuffer //mvp Model View Projection 模型视图投影
    constructor(canvas:HTMLCanvasElement){
        //解决锯齿，配置DPI
        const {devicePixelRatio} = window
        canvas.height = canvas.clientHeight * devicePixelRatio
        canvas.width = canvas.clientWidth * devicePixelRatio
        this.canvas = canvas
    }
    async initAsync(){
        await this.#initWebGPU()
        this.#pipline = await this.#createPipeline()
        this.#createMvpBuffer()
        this.#vertexObj = this.#createVertex()
        this.#colorObj = this.#createColor()

        const aspect = this.canvas.width / this.canvas.height
        const position = {x:0,y:0,z:-8}
        const rotation = {x:0,y:0,z:0}
        const scale = {x:1,y:1,z:1}
        // const mvpMatrix = getMvpMatrix(aspect,position,rotation,scale)
        // this.device.queue.writeBuffer(
        //     this.#mvpBuffer,
        //     0,
        //     mvpMatrix.buffer
        // )

        // this.#draw(this.#pipline)

        // 动画
        const animation = ()=>{
            const now = Date.now() / 1000
            rotation.x = Math.sin(now)
            rotation.y = Math.sin(now)

            const mvpMatrix = getMvpMatrix(aspect,position,rotation,scale)
            this.device.queue.writeBuffer(
                this.#mvpBuffer,
                0,
                mvpMatrix.buffer
            )
            this.#draw(this.#pipline)
            // requestAnimationFrame(animation)
            setTimeout(animation,100)
        }
        animation()
    }

    //异步的API，需要与原生进行通信 RPC通信
    async #initWebGPU(){
        if(!navigator.gpu){
            throw new Error('不支持gpu')
        }
        //request Adapter，获取真实引擎的物理设备
        const adapter = await navigator.gpu.requestAdapter({
            powerPreference:'high-performance'
        })
        console.log('物理设备',adapter)
        if(!adapter) throw new Error('没有引擎物理设备')
        //请求device 逻辑设备
        this.device = await adapter.requestDevice({
            requiredLimits:{
                //默认128kb，物理设备最大是2GB
                maxStorageBufferBindingSize:adapter.limits.maxStorageBufferBindingSize / 2
            }
        })
        console.log('逻辑设备',this.device)

        //configure context
        this.context = this.canvas.getContext('webgpu')!
        this.context.configure({
            device:this.device,
            format:this.format, //颜色的格式
            alphaMode:"opaque",
        })
    }

    #createMvpBuffer(){
        this.#mvpBuffer = this.device.createBuffer({
            size:4 * 4 * 4,
            usage:GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })
    }

    //配置渲染管线
    #createPipeline(){
        return this.device?.createRenderPipelineAsync({
            layout:'auto', //绑定
            //顶点着色器
            vertex:{
                module:this.device.createShaderModule({
                    code:vertWgsl
                }),
                entryPoint:'main',
                buffers:[
                    {
                        arrayStride:5 * 4,
                        attributes:[
                            {
                                shaderLocation:0, //@location(0)
                                offset:0,
                                format:'float32x3'
                            },{
                                shaderLocation:1, //@location(1)
                                offset: 3 * 4,
                                format: 'float32x2'
                            }
                        ]
                    }
                ]
            },
            //组合图形
            primitive:{
                topology:'triangle-list'
            },
            depthStencil:{
                depthWriteEnabled:true,
                depthCompare:'less',
                format:'depth24plus',
            },
            //片元着色器
            fragment:{
                module: this.device.createShaderModule({
                    code:fragment
                }),
                entryPoint:'main',
                targets:[{
                    format:this.format
                }],
            }
        })
    }

    #createVertex(){
        // const vertex = new Float32Array([0.0,0.5,0,-0.5,-0.5,0,0.5,-0.5,0]);
        const vertex = cubeVertex
        const vertexBuffer = this.device.createBuffer({
            size:vertex.byteLength,
            usage:GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        })
        //写入到gpu中
        this.device.queue.writeBuffer(vertexBuffer,0,vertex)
        return {
            vertex,
            vertexBuffer
        }
    }
    //uniform是只读的数据，并且有最大限制64kb,如果超了用STORAGE
    #createColor(){
        const color = new Float32Array([1,1,1,1])
        const colorBuffer = this.device.createBuffer({
            size:color.byteLength,
            usage:GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })
        this.device.queue.writeBuffer(colorBuffer,0,color)

        //下一步创建bindinggroup，全局的变量方式
        const group = this.device.createBindGroup({
            layout:this.#pipline.getBindGroupLayout(0), //pipeline中取layout
            entries:[{
                // binding:0, //@binding(0)
                // resource:{
                //     buffer:colorBuffer
                // }
                binding:0, //@binding(0)
                resource:{
                    buffer:this.#mvpBuffer,
                }
            }]
        })
        return {color,colorBuffer,group}
    }

    setColor(r:number,g:number,b:number){
        this.#colorObj.color[0] = r
        this.#colorObj.color[1] = g
        this.#colorObj.color[2] = b

        this.device.queue.writeBuffer(this.#colorObj.colorBuffer,0,this.#colorObj.color)
        this.#draw(this.#pipline)
    }

    move(value:number){
        this.#vertexObj.vertex[0] = 0 + value
        this.#vertexObj.vertex[3] = -0.5 + value
        this.#vertexObj.vertex[6] = 0.5+ value
        this.device.queue.writeBuffer(this.#vertexObj.vertexBuffer,0,this.#vertexObj.vertex)
        this.#draw(this.#pipline)
    }

    //录制绘制命令
    #draw(pipeline:GPURenderPipeline){
        //CommandEncoder
        const commandEncoder = this.device.createCommandEncoder()

        // 深度纹理
        const depthTexture = this.device.createTexture({
            size:{
                width:this.canvas.width,
                height:this.canvas.height
            },
            format:'depth24plus',
            usage:GPUTextureUsage.RENDER_ATTACHMENT
        })

        // 创建一个深度视图
        const depthView = depthTexture.createView()

        //开始绘制，也可以运行在 web worker中
        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments:[
                {
                    view:this.context.getCurrentTexture().createView(),
                    loadOp:'clear', //绘制之前做什么，clear 清除上一帧
                    storeOp:'store', //绘制之后，保留这一帧
                    clearValue:{r:0,g:0,b:0,a:1}
                }
            ],
            depthStencilAttachment:{
                view:depthView,
                depthLoadOp:'clear',
                depthStoreOp:'store',
                depthClearValue:1.0
            }
        })
        renderPass.setPipeline(pipeline)
        //0 对应的第几个插槽
        renderPass.setVertexBuffer(0,this.#vertexObj.vertexBuffer)
        renderPass.setBindGroup(0,this.#colorObj.group)
        // renderPass.setVertexBuffer(1,this.#colorObj.colorBuffer)
        renderPass.draw(vertexCount)
        renderPass.end()
        const buffer = commandEncoder.finish()
        this.device.queue.submit([buffer])
    }
}

const canvas = document.querySelector<HTMLCanvasElement>('#render-gpu')!
const renderer = new Renderer(canvas)
await renderer.initAsync()