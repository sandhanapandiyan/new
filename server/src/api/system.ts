import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';

const router = express.Router();

// Get available drives/mounts using lsblk for better accuracy
router.get('/drives', async (req, res) => {
    try {
        exec('lsblk -J -o NAME,MOUNTPOINT,RM,TYPE,SIZE,MODEL', (err, stdout, stderr) => {
            if (err) {
                console.error("lsblk error:", stderr);
                return res.json([]);
            }

            try {
                const data = JSON.parse(stdout);
                const drives: string[] = [];

                const performScan = (device: any) => {
                    // Check if it's a mount point
                    if (device.mountpoint) {
                        // Filter out system mounts
                        if (device.mountpoint === '/' ||
                            device.mountpoint === '/boot' ||
                            device.mountpoint === '/boot/firmware' ||
                            device.mountpoint.startsWith('/snap') ||
                            device.mountpoint.startsWith('/run')) {
                            // skip system
                        } else {
                            // If it's in /media or /mnt OR it is Removable (rm=true)
                            if (device.mountpoint.startsWith('/media') ||
                                device.mountpoint.startsWith('/mnt') ||
                                device.rm === true || device.rm === "1") {
                                drives.push(device.mountpoint);
                            }
                        }
                    }

                    // Recursively check children (partitions)
                    if (device.children) {
                        device.children.forEach((child: any) => performScan(child));
                    }
                };

                if (data.blockdevices) {
                    data.blockdevices.forEach((dev: any) => performScan(dev));
                }

                // Dedup
                const uniqueDrives = Array.from(new Set(drives));
                res.json(uniqueDrives);

            } catch (parseError) {
                console.error("Failed to parse lsblk output", parseError);
                res.json([]);
            }
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to list drives' });
    }
});

export default router;
