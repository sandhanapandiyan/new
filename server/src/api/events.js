import express from 'express';
import { prisma } from '../db.js';
const router = express.Router();
// Get all events
router.get('/', async (req, res) => {
    try {
        const events = await prisma.event.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json(events);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});
// Clear all events
router.delete('/', async (req, res) => {
    try {
        await prisma.event.deleteMany();
        res.json({ message: 'All events cleared' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to clear events' });
    }
});
// Delete a specific event by ID
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const event = await prisma.event.delete({
            where: { id: id },
        });
        res.json({ message: `Event with ID ${id} deleted`, event });
    }
    catch (error) {
        if (error.code === 'P2025') { // Prisma error code for record not found
            res.status(404).json({ error: `Event with ID ${id} not found` });
        }
        else {
            res.status(500).json({ error: `Failed to delete event with ID ${id}` });
        }
    }
});
// Create an event (internal use or webhook)
router.post('/', async (req, res) => {
    try {
        const event = await prisma.event.create({
            data: req.body
        });
        res.status(201).json(event);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create event' });
    }
});
export default router;
//# sourceMappingURL=events.js.map