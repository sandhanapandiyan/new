import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { prisma } from './db.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
class RecordManager {
    processes = new Map();
    activeRecordings = new Map();
    async startAll() {
        const cameras = await prisma.camera.findMany({ where: { enabled: true } });
        for (const camera of cameras) {
            this.startRecording(camera);
        }
    }
    sanitizeName(name) {
        return name.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
    }
    getDetails(cameraId) {
        return this.activeRecordings.get(cameraId);
    }
    startRecording(camera) {
        if (this.processes.has(camera.id)) {
            console.log(`Recording already active for ${camera.name}`);
            return;
        }
        const safeName = this.sanitizeName(camera.name);
        const recordingDir = path.resolve(__dirname, '../../recordings', safeName);
        if (!fs.existsSync(recordingDir)) {
            fs.mkdirSync(recordingDir, { recursive: true });
        }
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log(`Starting recording for ${camera.name} -> ${recordingDir} (Timezone: ${timeZone})`);
        const ffmpeg = spawn('ffmpeg', [
            '-rtsp_transport', 'tcp',
            '-i', `rtsp://127.0.0.1:8554/${camera.id}`,
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-ac', '2',
            '-ar', '44100', // Ensure standard audio rate
            '-f', 'segment',
            '-segment_time', '300',
            '-segment_format', 'mp4',
            '-segment_format_options', 'movflags=frag_keyframe+empty_moov+default_base_moof',
            '-reset_timestamps', '1',
            '-strftime', '1',
            '-strftime_mkdir', '1',
            path.join(recordingDir, '%Y-%m-%d', '%H-%M-%S.mp4')
        ], {
            env: { ...process.env, TZ: timeZone }
        });
        ffmpeg.stderr.on('data', (data) => {
            // Optional logs
        });
        ffmpeg.on('close', (code) => {
            console.log(`FFmpeg for ${camera.name} exited with code ${code}`);
            this.processes.delete(camera.id);
            this.activeRecordings.delete(camera.id);
            // Auto-restart
            if (camera.enabled) {
                setTimeout(() => this.startRecording(camera), 5000);
            }
        });
        this.processes.set(camera.id, ffmpeg);
        this.activeRecordings.set(camera.id, { startTime: Date.now() });
    }
    stopRecording(cameraId) {
        const process = this.processes.get(cameraId);
        if (process) {
            process.kill('SIGTERM');
            this.processes.delete(cameraId);
            this.activeRecordings.delete(cameraId);
        }
    }
}
export const recordManager = new RecordManager();
//# sourceMappingURL=recorder.js.map