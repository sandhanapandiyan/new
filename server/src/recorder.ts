import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { prisma } from './db.js';
import { storageManager } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Camera {
    id: string;
    name: string;
    rtspUrl: string;
    enabled: boolean;
}

class RecordManager {
    private processes: Map<string, ChildProcess> = new Map();
    private activeRecordings: Map<string, { startTime: number }> = new Map();

    async startAll() {
        const cameras = await prisma.camera.findMany({ where: { enabled: true } });
        for (const camera of cameras) {
            this.startRecording(camera);
        }
    }

    sanitizeName(name: string): string {
        return name.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
    }

    getDetails(cameraId: string) {
        return this.activeRecordings.get(cameraId);
    }

    startRecording(camera: any) {
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
        console.log(`[DEBUG] Resolved Timezone: '${timeZone}'`);
        console.log(`Starting recording for ${camera.name} -> ${recordingDir} (Timezone: ${timeZone})`);

        // Manually create today's directory to ensure FFmpeg can write immediately
        // Create today's directory using LOCAL time, not UTC (toISOString defaults to UTC)
        // This fixes the issue where starting between 00:00 and 05:30 IST would create "yesterday's" folder
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;

        const todayDir = path.join(recordingDir, today);
        if (!fs.existsSync(todayDir)) {
            fs.mkdirSync(todayDir, { recursive: true });
        }

        const ffmpeg = spawn('ffmpeg', [
            '-rtsp_transport', 'tcp',
            '-i', `rtsp://127.0.0.1:8554/${camera.id}`,
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-ac', '2',
            '-ar', '44100',
            '-af', 'aresample=async=1', // Fix for RTSP timestamp issues
            '-f', 'segment',
            '-segment_time', '300',
            '-segment_atclocktime', '1', // Align splits to clock (00:00, 00:05...), helps with midnight rollover
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
            console.log(`[FFmpeg ${camera.name}]: ${data.toString()}`);
        });



        ffmpeg.on('close', async (code) => {
            console.log(`FFmpeg for ${camera.name} exited with code ${code}`);
            this.processes.delete(camera.id);
            this.activeRecordings.delete(camera.id);

            // Sync partial recording immediately so it's not lost
            console.log(`Attempting to save partial recording for ${camera.name}...`);
            await storageManager.syncRecordings();

            // Auto-restart
            if (camera.enabled) {
                console.log(`Restarting recording for ${camera.name} in 5s...`);
                setTimeout(() => this.startRecording(camera), 5000);
            }
        });

        this.processes.set(camera.id, ffmpeg);
        this.activeRecordings.set(camera.id, { startTime: Date.now() });
    }

    stopRecording(cameraId: string) {
        const process = this.processes.get(cameraId);
        if (process) {
            process.kill('SIGTERM');
            this.processes.delete(cameraId);
            this.activeRecordings.delete(cameraId);
        }
    }
}

export const recordManager = new RecordManager();
