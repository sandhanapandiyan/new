import express from 'express';
import { prisma } from '../db.js';
const router = express.Router();
// Get settings
router.get('/', async (req, res) => {
    try {
        let settings = await prisma.setting.findUnique({
            where: { id: 'system' }
        });
        // Create default if not exists
        if (!settings) {
            settings = await prisma.setting.create({
                data: { id: 'system' }
            });
        }
        res.json(settings);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});
// Update settings
router.post('/', async (req, res) => {
    try {
        const settings = await prisma.setting.upsert({
            where: { id: 'system' },
            update: req.body,
            create: { id: 'system', ...req.body }
        });
        res.json(settings);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});
export default router;
//# sourceMappingURL=settings.js.map