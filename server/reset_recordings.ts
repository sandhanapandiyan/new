import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const RECORDINGS_DIR = path.join(process.cwd(), 'recordings');

async function main() {
    console.log('🗑️  Clearing recording database entries...');
    const { count } = await prisma.recording.deleteMany({});
    console.log(`✅ Deleted ${count} recording entries from DB.`);

    console.log('🗑️  Cleaning up physical files...');
    if (fs.existsSync(RECORDINGS_DIR)) {
        // Remove all contents but keep the root recordings dir
        fs.rmSync(RECORDINGS_DIR, { recursive: true, force: true });
        fs.mkdirSync(RECORDINGS_DIR);
        console.log('✅ Recordings directory wiped and recreated.');
    } else {
        fs.mkdirSync(RECORDINGS_DIR);
        console.log('✅ Recordings directory created.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
