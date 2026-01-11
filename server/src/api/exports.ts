import express from 'express';
import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Define clean exports directory
// dist/api/exports.js -> .. (dist) -> .. (server) -> .. (root) -> exports
const EXPORT_DIR = path.join(__dirname, '../../../exports');

// Get list of exported files
router.get('/', (req, res) => {
    try {
        console.log(`[Exports API] Checking for exports in: ${EXPORT_DIR}`);

        if (!fs.existsSync(EXPORT_DIR)) {
            console.log(`[Exports API] Directory not found: ${EXPORT_DIR}`);
            return res.json([]);
        }

        const filesRaw = fs.readdirSync(EXPORT_DIR);
        console.log(`[Exports API] Found files:`, filesRaw);

        const files = filesRaw
            .filter(f => f.endsWith('.mp4'))
            .map(filename => {
                const filePath = path.join(EXPORT_DIR, filename);
                const stats = fs.statSync(filePath);
                return {
                    filename,
                    size: stats.size,
                    createdAt: stats.mtime, // Use mtime as it's more reliable across FS
                    url: `/exports/${filename}`
                };
            })
            // Sort by newest first
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        res.json(files);
    } catch (error) {
        console.error("Failed to list exports:", error);
        res.status(500).json({ error: 'Failed to list exports' });
    }
});

export default router;
