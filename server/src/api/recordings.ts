import express from 'express';
import { prisma } from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

import { storageManager } from '../storage.js';

// Get dates with available recordings
router.post('/sync', async (req, res) => {
    try {
        await storageManager.syncRecordings();
        res.json({ message: 'Sync complete' });
    } catch (error) {
        res.status(500).json({ error: 'Sync failed' });
    }
});

router.get('/dates', async (req, res) => {
    try {
        // Fetch all start times - lightweight enough for moderate systems
        const recordings = await prisma.recording.findMany({
            select: { startTime: true }
        });

        // Convert UTC timestamps to LOCAL DATE strings for the frontend
        const dates = new Set(recordings.map(r => {
            const d = new Date(r.startTime);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }));
        res.json(Array.from(dates));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch recording dates' });
    }
});

// Get recordings with filters
router.get('/', async (req, res) => {
    try {
        const { cameraId, date } = req.query;

        let where: any = {};
        if (cameraId) where.cameraId = cameraId;
        if (date) {
            // Interpret the 'date' query param (YYYY-MM-DD)
            const parts = (req.query.date as string).split('-').map(Number);
            if (parts.length !== 3 || parts.some(isNaN)) {
                console.error("Invalid date format:", req.query.date);
                return res.json([]); // Return empty if date is invalid
            }
            const [y, m, d] = parts as [number, number, number];

            const start = new Date(y, m - 1, d, 0, 0, 0); // Local Midnight
            const end = new Date(y, m - 1, d + 1, 0, 0, 0); // Next day Local Midnight

            where.startTime = {
                gte: start,
                lt: end
            };
        }

        const recordings = await prisma.recording.findMany({
            where,
            orderBy: { startTime: 'desc' }, // Latest first
            include: { camera: true }
        });
        const serializedRecordings = recordings.map(r => ({
            ...r,
            size: r.size ? r.size.toString() : '0'
        }));
        res.json(serializedRecordings);
    } catch (error) {
        console.error('Error fetching recordings:', error);
        res.status(500).json({ error: 'Failed to fetch recordings' });
    }
});

// Purge all recordings
router.delete('/purge', async (req, res) => {
    try {
        // Find all recordings to get paths
        const recordings = await prisma.recording.findMany();

        // Delete physical files
        for (const rec of recordings) {
            try {
                if (fs.existsSync(rec.path)) {
                    fs.unlinkSync(rec.path);
                }
            } catch (err) {
                console.error(`Failed to delete file ${rec.path}`, err);
            }
        }

        // Clean database
        await prisma.recording.deleteMany();

        res.json({ message: 'All recordings purged from disk and database' });
    } catch (error) {
        console.error('Purge error:', error);
        res.status(500).json({ error: 'Failed to purge recordings' });
    }
});

// Delete specific recording
router.delete('/:id', async (req, res) => {
    try {
        const recording = await prisma.recording.findUnique({ where: { id: req.params.id } });

        if (recording) {
            try {
                if (fs.existsSync(recording.path)) {
                    fs.unlinkSync(recording.path);
                }
            } catch (err) {
                console.error(`Failed to delete file ${recording.path}`, err);
            }

            await prisma.recording.delete({ where: { id: req.params.id } });
            res.json({ message: 'Recording deleted from disk and database' });
        } else {
            res.status(404).json({ error: 'Recording not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete recording' });
    }
});

// Export/Cut video
// Body: { recordingId, startTime, endTime } (Global ISO strings or timestamps)
router.post('/export', async (req, res) => {
    try {
        const { recordingId, start, end, targetPath } = req.body;

        const recording = await prisma.recording.findUnique({ where: { id: recordingId } });
        if (!recording) return res.status(404).json({ error: 'Recording not found' });

        // Calculate relative times
        const recStart = new Date(recording.startTime).getTime();
        const reqStart = new Date(start).getTime();
        const reqEnd = new Date(end).getTime();

        // Relative start in seconds
        let startOffset = (reqStart - recStart) / 1000;
        let duration = (reqEnd - reqStart) / 1000;

        // Determine Output Path
        let finalOutputPath: string;
        let isInternalExport = false;

        // Use a consistent path relative to the compiled dist/api folder
        // dist/api/recordings.js -> .. (dist) -> .. (server) -> .. (root) -> exports
        const EXPORT_DIR = path.join(__dirname, '../../../exports');

        if (targetPath) {
            // User specified path (Save to Disk/USB) -> We still assume it might be a directory
            const isDir = fs.existsSync(targetPath) && fs.lstatSync(targetPath).isDirectory();
            const filename = `clip_${new Date().toISOString().replace(/[:.]/g, '-')}.mp4`;
            finalOutputPath = isDir ? path.join(targetPath, filename) : targetPath;
        } else {
            // Save to internal exports folder for later download
            isInternalExport = true;
            if (!fs.existsSync(EXPORT_DIR)) {
                fs.mkdirSync(EXPORT_DIR, { recursive: true });
            }

            // CLEANUP: Delete exported files older than 3 hours
            try {
                const files = fs.readdirSync(EXPORT_DIR);
                const now = Date.now();
                const MAX_AGE = 3 * 60 * 60 * 1000; // 3 Hours

                files.forEach(file => {
                    const filePath = path.join(EXPORT_DIR, file);
                    const stat = fs.statSync(filePath);
                    if (now - stat.mtimeMs > MAX_AGE) {
                        fs.unlinkSync(filePath);
                        console.log(`Auto-deleted old export: ${file}`);
                    }
                });
            } catch (e) {
                console.error("Cleanup error:", e);
            }

            const outputFilename = `clip_${Date.now()}.mp4`;
            finalOutputPath = path.join(EXPORT_DIR, outputFilename);
        }

        console.log(`Exporting clip to: ${finalOutputPath} (${startOffset}s, duration: ${duration}s)`);

        const ffmpegArgs = [
            '-ss', startOffset.toString(),
            '-i', recording.path,
            '-t', duration.toString(),
            '-c:v', 'copy',
            '-c:a', 'copy',
            '-y',
            finalOutputPath
        ];

        const { spawn } = await import('child_process');
        const ffmpeg = spawn('ffmpeg', ffmpegArgs);

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                // Success! Return the path so the frontend knows where it went.
                res.json({
                    success: true,
                    path: finalOutputPath,
                    filename: path.basename(finalOutputPath),
                    isInternal: isInternalExport
                });
            } else {
                console.error('FFmpeg export failed');
                res.status(500).json({ error: 'Export failed processing' });
            }
        });

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Export failed' });
    }
});

export default router;
