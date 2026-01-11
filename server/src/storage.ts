import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';
import { prisma } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execPromise = util.promisify(exec);

class StorageManager {
    // server/src -> ../../recordings
    private recordingDir = path.resolve(__dirname, '../../recordings');
    private thresholdPercent = 80; // 80% full triggers cleanup
    private targetPercent = 70;    // Clean up until 70%

    constructor() {
        if (!fs.existsSync(this.recordingDir)) {
            fs.mkdirSync(this.recordingDir, { recursive: true });
        }
    }

    private sanitizeName(name: string): string {
        return name.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
    }

    async syncRecordings() {
        try {
            const cameras = await prisma.camera.findMany();
            for (const camera of cameras) {
                const safeName = this.sanitizeName(camera.name);
                const dirsToCheck = [
                    path.join(this.recordingDir, safeName), // New structure
                    path.join(this.recordingDir, camera.id) // Old structure
                ];

                for (const camDir of dirsToCheck) {
                    if (!fs.existsSync(camDir)) continue;

                    // Check if it's the new date-based structure (directories inside)
                    const isNewStructure = camDir.endsWith(safeName);

                    if (isNewStructure) {
                        const dateDirs = fs.readdirSync(camDir).filter(d => {
                            try { return fs.statSync(path.join(camDir, d)).isDirectory(); } catch { return false; }
                        });

                        for (const dateDir of dateDirs) {
                            const fullDateDir = path.join(camDir, dateDir);
                            const files = fs.readdirSync(fullDateDir).filter(f => f.endsWith('.mp4'));

                            for (const file of files) {
                                const filePath = path.join(fullDateDir, file);
                                const relativePath = path.join(safeName, dateDir, file);
                                const stats = fs.statSync(filePath);

                                const exists = await prisma.recording.findFirst({ where: { path: filePath } });

                                if (!exists) {
                                    const timeMatch = file.match(/^(\d{2})-(\d{2})-(\d{2})\.mp4$/); // HH-MM-SS.mp4
                                    let startTime = stats.birthtime;

                                    if (timeMatch) {
                                        // Use explicit local time constructor to match recorder's TZ usage
                                        const [year = 0, month = 0, day = 0] = dateDir.split('-').map(Number);
                                        const [hour = 0, minute = 0, second = 0] = [timeMatch[1], timeMatch[2], timeMatch[3]].map(Number);
                                        startTime = new Date(year, month - 1, day, hour, minute, second);
                                    }

                                    // Calculate actual duration from file stats for reliability
                                    const durationMs = stats.mtime.getTime() - startTime.getTime();
                                    const endTime = new Date(startTime.getTime() + Math.max(0, durationMs));

                                    await prisma.recording.create({
                                        data: {
                                            cameraId: camera.id,
                                            filename: relativePath,
                                            path: filePath,
                                            startTime: startTime,
                                            endTime: endTime,
                                            size: BigInt(stats.size),
                                            status: 'completed'
                                        }
                                    });
                                    console.log(`Synced new recording: ${relativePath}`);
                                } else {
                                    // Update existing recording if it has grown (for active recordings)
                                    // Calculate new duration
                                    const timeMatch = file.match(/^(\d{2})-(\d{2})-(\d{2})\.mp4$/);
                                    let startTime = exists.startTime; // Trust DB start time

                                    const durationMs = stats.mtime.getTime() - startTime.getTime();
                                    const newEndTime = new Date(startTime.getTime() + Math.max(0, durationMs));

                                    // If size differs significantly or duration increased, update
                                    if (stats.size > Number(exists.size) || (exists.endTime && newEndTime.getTime() > exists.endTime.getTime())) {
                                        await prisma.recording.update({
                                            where: { id: exists.id },
                                            data: {
                                                size: BigInt(stats.size),
                                                endTime: newEndTime
                                            }
                                        });
                                        // console.log(`Updated growing recording: ${relativePath}`);
                                    }
                                }
                            }
                        }
                    } else {
                        // Old structure (flat files in UUID folder)
                        const files = fs.readdirSync(camDir).filter(f => f.endsWith('.mp4'));
                        for (const file of files) {
                            const filePath = path.join(camDir, file);
                            const relativePath = path.join(camera.id, file);
                            const stats = fs.statSync(filePath);

                            const exists = await prisma.recording.findFirst({ where: { path: filePath } });

                            if (!exists) {
                                const match = file.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
                                let startTime = stats.birthtime;
                                if (match) {
                                    startTime = new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`);
                                }

                                // Calculate actual duration from file stats for reliability
                                const durationMs = stats.mtime.getTime() - startTime.getTime();
                                const endTime = new Date(startTime.getTime() + Math.max(0, durationMs));

                                await prisma.recording.create({
                                    data: {
                                        cameraId: camera.id,
                                        filename: relativePath,
                                        path: filePath,
                                        startTime: startTime,
                                        endTime: endTime,
                                        size: BigInt(stats.size),
                                        status: 'completed'
                                    }
                                });
                                console.log(`Synced old recording: ${relativePath}`);
                            } else {
                                // Update logic for old structure too if needed (less likely to be active)
                                if (stats.size > Number(exists.size)) {
                                    const durationMs = stats.mtime.getTime() - exists.startTime.getTime();
                                    const newEndTime = new Date(exists.startTime.getTime() + Math.max(0, durationMs));
                                    await prisma.recording.update({
                                        where: { id: exists.id },
                                        data: { size: BigInt(stats.size), endTime: newEndTime }
                                    });
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Recording sync failed:', error);
        }
    }

    async checkAndCleanup() {
        try {
            // Fetch dynamic settings from DB
            let settings = await prisma.setting.findUnique({ where: { id: 'system' } });
            if (!settings) {
                // Should exist via API init, but failsafe
                settings = await prisma.setting.create({ data: { id: 'system' } });
            }

            const stats = await this.getDiskUsage();
            console.log(`Disk Usage: ${stats.usedPercent}% (Threshold: ${settings.cleanThreshold}%)`);

            if (stats.usedPercent > settings.cleanThreshold) {
                console.log(`Disk usage threshold reached (${stats.usedPercent}%). Starting cleanup...`);
                await this.purgeOldestRecordings(settings.targetThreshold); // Pass target threshold dynamically
            }
        } catch (error) {
            console.error('Storage check failed:', error);
        }
    }

    private async getDiskUsage() {
        const { stdout } = await execPromise(`df -h "${this.recordingDir}" | tail -1`);
        const parts = stdout.trim().split(/\s+/);
        // [Filesystem, Size, Used, Avail, Use%, Mounted]
        const usedPercent = parseInt(parts[4]?.replace('%', '') || '0');
        return { usedPercent };
    }

    private async purgeOldestRecordings(targetPercent: number) {
        // Get all recordings from DB, ordered by time
        const recordings = await prisma.recording.findMany({
            orderBy: { startTime: 'asc' },
            take: 50
        });

        for (const rec of recordings) {
            try {
                if (fs.existsSync(rec.path)) {
                    fs.unlinkSync(rec.path);
                }
                await prisma.recording.delete({ where: { id: rec.id } });
                console.log(`Purged recording: ${rec.path}`);

                // Re-check usage every file
                const stats = await this.getDiskUsage();
                if (stats.usedPercent <= targetPercent) {
                    console.log('Cleanup target reached.');
                    break;
                }
            } catch (err) {
                console.error('Failed to purge:', err);
            }
        }
    }

    startMonitoring() {
        // Sync and check every 10 seconds
        setInterval(async () => {
            await this.syncRecordings();
            await this.checkAndCleanup();
        }, 10 * 1000);

        // Also check on startup
        this.syncRecordings();
        this.checkAndCleanup();
    }
}

export const storageManager = new StorageManager();
