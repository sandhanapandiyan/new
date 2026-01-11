import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const recordings = await prisma.recording.findMany({
        orderBy: { startTime: 'desc' },
        take: 10
    });

    console.log('Recent Recordings (Newest First):');
    for (let i = 0; i < recordings.length; i++) {
        const curr = recordings[i];
        const next = recordings[i + 1]; // older

        console.log(`File: ${curr.filename}`);
        console.log(`  Range: ${curr.startTime.toISOString()} - ${curr.endTime.toISOString()}`);
        console.log(`  Duration: ${(curr.endTime.getTime() - curr.startTime.getTime()) / 1000}s`);

        if (next) {
            const gap = curr.startTime.getTime() - next.endTime.getTime();
            console.log(`  Gap from previous: ${gap / 1000}s`);
        }
        console.log('---');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
