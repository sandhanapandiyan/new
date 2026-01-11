import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const camera = await prisma.camera.upsert({
        where: { id: 'test-camera' },
        update: {},
        create: {
            id: 'test-camera',
            name: 'Test Imou Camera',
            rtspUrl: 'rtsp://admin:admin123@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0', // Sample URL, user will update
            enabled: true,
            status: 'online',
            recordMode: 'continuous'
        },
    });
    console.log('Seed camera added:', camera);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
