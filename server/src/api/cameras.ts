import express from 'express';
import { prisma } from '../db.js';
import { recordManager } from '../recorder.js';

import { streamManager } from '../streaming.js';

const router = express.Router();

// Get all cameras
router.get('/', async (req, res) => {
    try {
        const cameras = await prisma.camera.findMany();
        const liveData = await streamManager.getLiveStats();

        const camerasWithStats = await Promise.all(cameras.map(async (camera) => {
            const stats = liveData[camera.id] || {};
            const producer = stats.producers?.[0] || {};
            const receiver = producer.receivers?.[0] || {};

            // Get last motion event
            const lastEvent = await (prisma as any).event.findFirst({
                where: {
                    cameraId: camera.id,
                    type: 'motion'
                },
                orderBy: { createdAt: 'desc' }
            });

            const recDetails = recordManager.getDetails(camera.id);

            return {
                ...camera,
                liveStats: {
                    bitrate: producer.bytes_recv ? (producer.bytes_recv / 1024 / 1024).toFixed(2) : '0.00',
                    codec: receiver.codec?.codec_name || 'H.264',
                    profile: receiver.codec?.profile || 'High',
                    lastMotion: lastEvent?.createdAt || null,
                    active: stats.consumers?.length > 0 || (stats.producers?.length > 0), // Consider active if producer exists too
                    recording: recDetails ? {
                        active: true,
                        startTime: recDetails.startTime
                    } : { active: false, startTime: null }
                }
            };
        }));

        res.json(camerasWithStats);
    } catch (error) {
        console.error('Camera fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch cameras' });
    }
});

// Add a new camera
router.post('/', async (req, res) => {
    try {
        const camera = await prisma.camera.create({
            data: req.body
        });

        // Sync with recorder and streamer
        await streamManager.addStream(camera.id, camera.rtspUrl);
        // Give go2rtc a moment to register
        await new Promise(resolve => setTimeout(resolve, 500));
        await recordManager.startRecording(camera);

        res.status(201).json(camera);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create camera' });
    }
});

// Delete a camera
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await recordManager.stopRecording(id);
        await streamManager.removeStream(id);

        // Clean up related data first
        await prisma.recording.deleteMany({ where: { cameraId: id } });
        await (prisma as any).event.deleteMany({ where: { cameraId: id } });

        await prisma.camera.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete camera' });
    }
});

export default router;
