import axios from "axios";
import fs from "fs";
import path from "path";
import {fal} from "@fal-ai/client";
import WebSocket from "@/config/WebSocket";
import Service from "@/service/Service";
import Variables from "@/config/Variables";
import {URL} from "url";
import {spawn} from "child_process";
import {posix} from "path";

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

    private async generateThumbnailFromGlb(
        localGlbPath: string,
        localOutPath: string
    ): Promise<void> {
        const projectRoot = path.resolve(__dirname, "../../../");
        const localRoot = path.resolve(__dirname, "../../");

        const scriptPath = path.join(localRoot, "render_thumb.py");
        const absGlb = path.join(localRoot, localGlbPath);
        const absOut = path.join(localRoot, localOutPath);

        console.log("projectRoot:", projectRoot);
        console.log("localRoot  :", localRoot);
        console.log("scriptPath :", scriptPath);
        console.log("absGlb     :", absGlb);
        console.log("absOut     :", absOut);

        if (!fs.existsSync(absGlb)) {
            throw new Error(`GLB file not found at ${absGlb}`);
        }

        return new Promise((resolve, reject) => {
            const blender = spawn(
                "xvfb-run",
                [
                    "-a",
                    "-s", "-screen 0 512x512x24",
                    "blender",
                    "--background",
                    "--python", scriptPath,
                    "--",
                    absGlb,
                    absOut
                ],
                {
                    cwd: projectRoot,
                    stdio: ["ignore", "pipe", "pipe"]
                }
            );

            blender.stdout.on("data", d => console.log(d.toString()));
            blender.stderr.on("data", d => console.error(d.toString()));

            blender.on("exit", code => {
                if (code === 0 && fs.existsSync(absOut)) resolve();
                else reject(new Error(`Blender exited with code ${code}`));
            });
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
                        await this.generateThumbnailFromGlb(glbPath, thumbnailLocalPath);
                        const rel = posix.join("assets", "images", `${this.taskId}_thumb.png`);
                        finalImageUrl = new URL(rel, Variables.BASE_URL).href;
                        WebSocket.sendMessage(this.taskId, "generating_thumbnail_done", "Thumbnail generated successfully.");
                    } catch (thumbError: any) {
                        console.error(`Failed to generate thumbnail for ${this.taskId}:`, thumbError.message);
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