import { prisma } from './src/db.js';

async function cleanup() {
    try {
        console.log('Cleaning up orphaned events...');
        // Get all valid camera IDs
        const cameras = await prisma.camera.findMany();
        const validIds = cameras.map(c => c.id);

        // Delete events where cameraId is not in validIds
        const result = await prisma.event.deleteMany({
            where: {
                cameraId: {
                    notIn: validIds
                }
            }
        });
        console.log(`Deleted ${result.count} orphaned events.`);

    } catch (error) {
        console.error('Cleanup failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanup();
