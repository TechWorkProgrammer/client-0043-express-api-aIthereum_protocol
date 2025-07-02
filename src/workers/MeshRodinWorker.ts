import axios from "axios";
import fs from "fs";
import path from "path";
import {fal} from "@fal-ai/client";
import WebSocket from "@/config/WebSocket";
import Service from "@/service/Service";
import Variables from "@/config/Variables";
import gl from "gl";
import {URL} from "url";
import {
    WebGLRenderer,
    Scene,
    PerspectiveCamera,
    AmbientLight,
    DirectionalLight,
    SRGBColorSpace,
} from "three";
import {PNG} from "pngjs";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader.js";


const MAX_TIME = 10 * 60 * 1000;
const POLL_INTERVAL = 5000;

class MeshRodinWorker {
    private static queue: string[] = [];
    private static isProcessing = false;

    public static addToQueue(taskId: string): void {
        if (!this.queue.includes(taskId)) {
            this.queue.push(taskId);
            WebSocket.sendMessage(taskId, "queued", "Rodin task added to queue.");
        }
    }

    public static boot(): void {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const pollQueue = async () => {
            if (this.queue.length > 0) {
                const taskId = this.queue.shift();
                if (taskId) {
                    await new MeshRodinWorker(taskId).processTask();
                }
            }
            setTimeout(pollQueue, POLL_INTERVAL);
        };

        pollQueue().then();
    }

    private readonly taskId: string;

    constructor(taskId: string) {
        this.taskId = taskId;
    }

    private async generateThumbnailFromGlb(glbPath: string, outputPath: string): Promise<void> {
        const width = 512;
        const height = 512;

        const context = gl(width, height, {preserveDrawingBuffer: true});
        if (!context) throw new Error("Failed to create headless GL context.");

        const fakeCanvas = {
            width, height,
            style: {},
            addEventListener: () => {
            },
            removeEventListener: () => {
            },
            getContext: (_: string) => context,
        } as unknown as HTMLCanvasElement;

        const renderer = new WebGLRenderer({
            canvas: fakeCanvas as any,
            context: context as any,
            antialias: true,
        });
        renderer.setSize(width, height);
        renderer.outputColorSpace = SRGBColorSpace;

        const scene = new Scene();
        const camera = new PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(2, 2, 2);
        camera.lookAt(0, 0, 0);

        scene.add(new AmbientLight(0xffffff, 0.6));
        const dirLight = new DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 7.5);
        scene.add(dirLight);

        const loader = new GLTFLoader();
        const fileBuffer = fs.readFileSync(new URL(glbPath).pathname);
        const gltf = await loader.parseAsync(
            fileBuffer.buffer,
            path.dirname(glbPath) + "/"
        );
        scene.add(gltf.scene);
        renderer.render(scene, camera);

        const pixels = new Uint8Array(width * height * 4);
        context.readPixels(
            0,
            0,
            width,
            height,
            context.RGBA,
            context.UNSIGNED_BYTE,
            pixels
        );

        const flipped = new Uint8Array(pixels.length);
        for (let row = 0; row < height; row++) {
            const srcStart = row * width * 4;
            const dstStart = (height - row - 1) * width * 4;
            flipped.set(pixels.subarray(srcStart, srcStart + width * 4), dstStart);
        }

        const png = new PNG({width, height});
        png.data = Buffer.from(flipped);

        await new Promise<void>((resolve, reject) => {
            png.pack()
                .pipe(fs.createWriteStream(outputPath))
                .on("finish", resolve)
                .on("error", reject);
        });
    }

    private async processTask(): Promise<void> {
        WebSocket.sendMessage(this.taskId, "processing", "Worker started processing Rodin model.");
        const startTime = Date.now();
        const fatalErrorStartTime = {time: null as null | number};
        while (true) {
            if (Date.now() - startTime > MAX_TIME) {
                WebSocket.sendMessage(this.taskId, "timeout", "Rodin worker timeout.");
                await Service.prisma.mesh.update({where: {taskIdRefine: this.taskId}, data: {state: "failed"}});
                break;
            }

            try {
                const result = await fal.queue.result("fal-ai/hyper3d/rodin", {
                    requestId: this.taskId
                });
                WebSocket.sendMessage(this.taskId, "downloading", "Downloading Rodin model files...");

                const glbUrl = result.data.model_mesh.url;
                const glbExt = path.extname(new URL(glbUrl).pathname) || ".glb";
                const glbPath = `storage/assets/models/${this.taskId}${glbExt}`;
                const glbModelUrlPath = `${Variables.BASE_URL}/assets/models/${this.taskId}${glbExt}`;
                await this.downloadFile(glbUrl, glbPath);

                let finalImageUrl: string | null = "https://veloxiai.app/icon.png";
                const textures = result.data.textures;

                if (textures && textures.length > 0) {
                    const firstTextureUrl = (textures[0] as any).url;
                    const textureExt = path.extname(new URL(firstTextureUrl).pathname) || ".png";
                    const localImagePath = `storage/assets/images/${this.taskId}_refine${textureExt}`;
                    await this.downloadFile(firstTextureUrl, localImagePath);
                    finalImageUrl = `${Variables.BASE_URL}/assets/images/${this.taskId}_refine${textureExt}`;
                } else {
                    WebSocket.sendMessage(this.taskId, "generating_thumbnail", "No image found, generating thumbnail from model...");
                    const thumbnailLocalPath = `storage/assets/images/${this.taskId}_thumb.png`;

                    try {
                        await this.generateThumbnailFromGlb(glbModelUrlPath, thumbnailLocalPath);
                        finalImageUrl = `${Variables.BASE_URL}/assets/images/${this.taskId}_thumb.png`;
                        WebSocket.sendMessage(this.taskId, "generating_thumbnail_done", "Thumbnail generated successfully.");
                    } catch (thumbError: any) {
                        console.error(`Failed to generate thumbnail for ${this.taskId}:`, thumbError);
                        WebSocket.sendMessage(this.taskId, "generating_thumbnail_failed", "Failed to generate thumbnail.");
                        finalImageUrl = `https://veloxiai.app/icon.png`;
                    }
                }

                const updatedMesh = await Service.prisma.mesh.update({
                    where: {taskIdRefine: this.taskId},
                    data: {
                        modelGlbRefine: glbModelUrlPath,
                        refineImage: finalImageUrl,
                        state: "succeeded",
                    },
                });

                for (const texture of result.data.textures) {
                    const textureUrl = (texture as any).url;
                    const textureFileName = (texture as any).file_name;
                    const texturePath = `storage/assets/images/${this.taskId}_${textureFileName}`;

                    await this.downloadFile(textureUrl, texturePath);

                    await Service.prisma.texture.create({
                        data: {
                            meshId: updatedMesh.id,
                            type: "pbr_texture",
                            url: `${Variables.BASE_URL}/assets/images/${this.taskId}_${textureFileName}`,
                        },
                    });
                }

                WebSocket.sendMessage(this.taskId, "done", "Rodin task completed successfully.");
                break;

            } catch (error: any) {
                if (
                    error.message.includes("404") ||
                    error.message.includes("not found") ||
                    error.message.includes("Bad Request") ||
                    error.message.includes("400")
                ) {
                    WebSocket.sendMessage(this.taskId, "waiting", "Still processing Rodin model...");
                } else {
                    if (!fatalErrorStartTime.time) {
                        fatalErrorStartTime.time = Date.now();
                    } else if (Date.now() - fatalErrorStartTime.time > 60 * 1000) {
                        WebSocket.sendMessage(this.taskId, "fatal_timeout", "Rodin model failed after repeated errors.");
                        await Service.prisma.mesh.update({where: {taskIdRefine: this.taskId}, data: {state: "failed"}});
                        break;
                    }
                    WebSocket.sendMessage(this.taskId, "error", `Error processing Rodin task: ${error.message}`);
                    await Service.prisma.mesh.update({where: {taskIdRefine: this.taskId}, data: {state: "failed"}});
                    break;
                }
            }

            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
        }
    }

    private async downloadFile(url: string, outputPath: string): Promise<string> {
        if (!url) return "";

        const writer = fs.createWriteStream(outputPath);
        const response = await axios({url, method: "GET", responseType: "stream"});

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on("finish", () => resolve(outputPath.replace("storage/", "")));
            writer.on("error", reject);
        });
    }
}

export default MeshRodinWorker;