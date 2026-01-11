import express from 'express';
import { prisma } from '../db.js';
import fs from 'fs';
import path from 'path';
const router = express.Router();
import { storageManager } from '../storage.js';
// Get dates with available recordings
router.post('/sync', async (req, res) => {
    try {
        await storageManager.syncRecordings();
        res.json({ message: 'Sync complete' });
    }
    catch (error) {
        res.status(500).json({ error: 'Sync failed' });
    }
});
router.get('/dates', async (req, res) => {
    try {
        // Fetch all start times - lightweight enough for moderate systems
        const recordings = await prisma.recording.findMany({
            select: { startTime: true }
        });
        const dates = new Set(recordings.map(r => r.startTime.toISOString().split('T')[0]));
        res.json(Array.from(dates));
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch recording dates' });
    }
});
// Get recordings with filters
router.get('/', async (req, res) => {
    try {
        const { cameraId, date } = req.query;
        let where = {};
        if (cameraId)
            where.cameraId = cameraId;
        if (date) {
            const start = new Date(date);
            const end = new Date(start);
            end.setDate(end.getDate() + 1);
            where.startTime = {
                gte: start,
                lt: end
            };
        }
        const recordings = await prisma.recording.findMany({
            where,
            orderBy: { startTime: 'desc' },
            include: { camera: true }
        });
        const serializedRecordings = recordings.map(r => ({
            ...r,
            size: r.size ? r.size.toString() : '0'
        }));
        res.json(serializedRecordings);
    }
    catch (error) {
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
            }
            catch (err) {
                console.error(`Failed to delete file ${rec.path}`, err);
            }
        }
        // Clean database
        await prisma.recording.deleteMany();
        // Optionally clean up empty directories (advanced, but good for "proper" working)
        // const recDir = path.resolve(__dirname, '../../../recordings');
        // if (fs.existsSync(recDir)) {
        //     fs.rmSync(recDir, { recursive: true, force: true });
        //     fs.mkdirSync(recDir);
        // }
        res.json({ message: 'All recordings purged from disk and database' });
    }
    catch (error) {
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
            }
            catch (err) {
                console.error(`Failed to delete file ${recording.path}`, err);
            }
            await prisma.recording.delete({ where: { id: req.params.id } });
            res.json({ message: 'Recording deleted from disk and database' });
        }
        else {
            res.status(404).json({ error: 'Recording not found' });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete recording' });
    }
});
// Export/Cut video
// Body: { recordingId, startTime, endTime } (Global ISO strings or timestamps)
router.post('/export', async (req, res) => {
    try {
        const { recordingId, start, end } = req.body;
        const recording = await prisma.recording.findUnique({ where: { id: recordingId } });
        if (!recording)
            return res.status(404).json({ error: 'Recording not found' });
        // Calculate relative times
        const recStart = new Date(recording.startTime).getTime();
        const reqStart = new Date(start).getTime();
        const reqEnd = new Date(end).getTime();
        // Relative start in seconds
        let startOffset = (reqStart - recStart) / 1000;
        let duration = (reqEnd - reqStart) / 1000;
        if (startOffset < 0)
            startOffset = 0;
        // Output path
        const exportDir = path.resolve(process.cwd(), '../exports');
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true });
        }
        const outputFilename = `clip_${Date.now()}.mp4`;
        const outputPath = path.join(exportDir, outputFilename);
        console.log(`Exporting clip: ${startOffset}s, duration: ${duration}s from ${recording.path}`);
        // Use ffmpeg to slice
        // -ss before -i is faster / keyframe seeking. -ss after -i is precise.
        // For NVR usually precise is better for "cutting", but copy codec requires keyframes.
        // We will try fast seek first, but might need re-encoding if keyframes don't align.
        // Let's use re-encoding for precision ensuring browser playback compatibility.
        // -c:v libx264 -preset ultrafast
        const ffmpegArgs = [
            '-ss', startOffset.toString(),
            '-i', recording.path,
            '-t', duration.toString(),
            '-c:v', 'copy', // Try copy first for speed. If weird, we switch to encode
            '-c:a', 'copy',
            '-y',
            outputPath
        ];
        const { spawn } = await import('child_process');
        const ffmpeg = spawn('ffmpeg', ffmpegArgs);
        ffmpeg.on('close', (code) => {
            if (code === 0) {
                res.download(outputPath, outputFilename, (err) => {
                    if (!err) {
                        // Optional: delete after send
                        // fs.unlinkSync(outputPath);
                    }
                });
            }
            else {
                console.error('FFmpeg export failed');
                res.status(500).json({ error: 'Export failed processing' });
            }
        });
    }
    catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Export failed' });
    }
});
export default router;
//# sourceMappingURL=recordings.js.map