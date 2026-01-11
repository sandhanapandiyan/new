import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { recordManager } from './recorder.js';
import { storageManager } from './storage.js';
import { streamManager } from './streaming.js';

dotenv.config();

import cameraRouter from './api/cameras.js';
import statsRouter from './api/stats.js';
import eventsRouter from './api/events.js';
import recordingsRouter from './api/recordings.js';
import settingsRouter from './api/settings.js';

import systemRouter from './api/system.js';
import exportsRouter from './api/exports.js';

import { prisma } from './db.js';
const app = express();
const port = process.env.PORT || 3001;

// Basic Middleware
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    console.log(`[DEBUG REQUEST] ${req.method} ${req.url}`);
    next();
});

// API Routes (Prioritize these!)
app.use('/api/cameras', cameraRouter);
app.use('/api/stats', statsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/recordings', recordingsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/system', systemRouter);
app.use('/api/exports', exportsRouter);

// Basic health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve recordings (Static)
app.use('/recordings', express.static(path.join(__dirname, '../../recordings')));

// Serve exports (Static)
app.use('/exports', express.static(path.join(__dirname, '../../exports')));

// Serve static frontend files (Last, before catch-all)
app.use(express.static(path.join(__dirname, '../../client/dist')));

// SPA Fallback - serve index.html for any other requests
// Express 5 requires regex for catch-all
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

// Start the server and other managers
app.listen(port, async () => {
    console.log(`NVR Backend running on port ${port}`);

    try {
        await streamManager.start();
        console.log('Streaming server active');

        // Wait for go2rtc warm up
        await new Promise(resolve => setTimeout(resolve, 2000));

        await recordManager.startAll();
        console.log('Recording manager started');

        storageManager.startMonitoring();
        console.log('Storage monitor active');

        // Mock Event Generator for "Live" feel
        setInterval(async () => {
            const cameras = await prisma.camera.findMany();
            if (cameras.length > 0) {
                const randomCam = cameras[Math.floor(Math.random() * cameras.length)];
                if (randomCam) {
                    await (prisma as any).event.create({
                        data: {
                            type: 'motion',
                            severity: 'medium',
                            message: `Motion detected on ${randomCam.name}`,
                            cameraId: randomCam.id
                        }
                    });
                    console.log(`Mock event created for ${randomCam.name}`);
                }
            }
        }, 120000); // Every 2 mins

    } catch (error) {
        console.error('Failed to start system components:', error);
    }
});

export { app, prisma };
