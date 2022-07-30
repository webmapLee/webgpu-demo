//Initialize webgpu 创建webgpu
import vertWgsl from './shaders/vertex.wgsl?raw'
import fragment from './shaders/fragment.wgsl?raw'

class Renderer{
    canvas:HTMLCanvasElement
    format = navigator.gpu.getPreferredCanvasFormat()
    device!:GPUDevice
    context!:GPUCanvasContext
    constructor(canvas:HTMLCanvasElement){
        //解决锯齿，配置DPI
        const {devicePixelRatio} = window
        canvas.height = canvas.clientHeight * devicePixelRatio
        canvas.width = canvas.clientWidth * devicePixelRatio
        this.canvas = canvas
    }
    async initAsync(){
        await this.#initWebGPU()
        const pipline = await this.#createPipeline()
        this.#draw(pipline)
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
            format:this.format,
            alphaMode:"opaque",
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
                entryPoint:'main'
            },
            //组合图形
            primitive:{
                topology:'triangle-list'
            },
            //片元着色器
            fragment:{
                module: this.device.createShaderModule({
                    code:fragment
                }),
                entryPoint:'main',
                targets:[{
                    format:this.format
                }]
            }
        })
    }

    //录制绘制命令
    #draw(pipeline:GPURenderPipeline){
        //CommandEncoder
        const commandEncoder = this.device.createCommandEncoder()

        //开始绘制，也可以运行在 web worker中
        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments:[
                {
                    view:this.context.getCurrentTexture().createView(),
                    loadOp:'clear', //绘制之前做什么，clear 清除上一帧
                    storeOp:'store', //绘制之后，保留这一帧
                    clearValue:{r:0,g:0,b:0,a:1}
                }
            ]
        })
        renderPass.setPipeline(pipeline)
        renderPass.draw(3)
        renderPass.end()
        const buffer = commandEncoder.finish()
        this.device.queue.submit([buffer])
    }
}

const canvas = document.querySelector<HTMLCanvasElement>('#render-gpu')!
const renderer = new Renderer(canvas)
await renderer.initAsync()