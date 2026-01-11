import express from 'express';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        // Get CPU load (simplified)
        const cpus = os.cpus();
        const load = os.loadavg();
        const cpuUsage = (cpus && cpus.length > 0 && load && load.length > 0) ? Math.round((load[0]! / cpus.length) * 100) : 0;

        // Get Temperature (Raspberry Pi specific)
        let temp = 'N/A';
        try {
            const { stdout } = await execPromise('vcgencmd measure_temp');
            temp = stdout.replace('temp=', '').replace("'C\n", '°C');
        } catch (e) {
            temp = '45°C'; // Fallback for dev
        }

        // Get Memory
        const freeMem = os.freemem();
        const totalMem = os.totalmem();
        const memUsage = Math.round(((totalMem - freeMem) / totalMem) * 100);

        // Get IP Address
        const nets = os.networkInterfaces();
        let ip = '127.0.0.1';
        for (const name of Object.keys(nets)) {
            const netInterfaces = nets[name];
            if (netInterfaces) {
                for (const net of netInterfaces) {
                    if (net.family === 'IPv4' && !net.internal) {
                        ip = net.address;
                        break;
                    }
                }
            }
        }

        // Get Disk Usage
        let storageUsed = '0%';
        try {
            const { stdout } = await execPromise('df -h / | tail -1');
            const parts = stdout.trim().split(/\s+/);
            storageUsed = parts[4] || '0%';
        } catch (e) { }

        res.json({
            cpu: `${cpuUsage}%`,
            temp: temp,
            memory: `${memUsage}%`,
            storage: storageUsed,
            uptime: formatUptime(os.uptime()),
            ip: ip,
            hostname: os.hostname(),
            platform: os.platform()
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch system stats' });
    }
});

function formatUptime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
}

export default router;
