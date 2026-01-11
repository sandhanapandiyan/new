import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import axios from 'axios';
import { prisma } from './db.js';
class StreamManager {
    go2rtcProcess = null;
    apiUrl = 'http://localhost:1984/api';
    async start() {
        if (this.go2rtcProcess)
            return;
        const binaryPath = path.join(process.cwd(), 'go2rtc');
        const configPath = path.join(process.cwd(), 'go2rtc.yaml');
        console.log(`Starting go2rtc from ${binaryPath}...`);
        this.go2rtcProcess = spawn(binaryPath, ['-config', configPath], {
            stdio: 'inherit'
        });
        this.go2rtcProcess.on('error', (err) => {
            console.error('Failed to start go2rtc:', err);
        });
        this.go2rtcProcess.on('close', (code) => {
            console.log(`go2rtc exited with code ${code}. Restarting in 5s...`);
            this.go2rtcProcess = null;
            setTimeout(() => this.start(), 5000);
        });
        // Wait for it to be ready
        let attempts = 0;
        while (attempts < 10) {
            try {
                await axios.get(`${this.apiUrl}/streams`);
                console.log('go2rtc is ready');
                break;
            }
            catch (e) {
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        await this.syncStreams();
    }
    async syncStreams() {
        try {
            const cameras = await prisma.camera.findMany();
            for (const camera of cameras) {
                await this.addStream(camera.id, camera.rtspUrl);
            }
        }
        catch (error) {
            console.error('Failed to sync streams with go2rtc:', error);
        }
    }
    async addStream(id, url) {
        try {
            const tcpUrl = url.includes('?') ? `${url}&transport=tcp` : `${url}#transport=tcp`;
            await axios.put(`${this.apiUrl}/streams?src=${encodeURIComponent(tcpUrl)}&name=${id}`);
            console.log(`Stream added to go2rtc: ${id} (TCP forced)`);
        }
        catch (error) {
            console.error(`Failed to add stream ${id} to go2rtc:`, error);
        }
    }
    async removeStream(id) {
        try {
            await axios.delete(`${this.apiUrl}/streams?name=${id}`);
            console.log(`Stream removed from go2rtc: ${id}`);
        }
        catch (error) {
            console.error(`Failed to remove stream ${id} from go2rtc:`, error.message);
        }
    }
    async getLiveStats() {
        try {
            const { data } = await axios.get(`${this.apiUrl}/streams`);
            return data;
        }
        catch (error) {
            console.error('Failed to get live stats from go2rtc:', error);
            return {};
        }
    }
    stop() {
        if (this.go2rtcProcess) {
            this.go2rtcProcess.kill();
            this.go2rtcProcess = null;
        }
    }
}
export const streamManager = new StreamManager();
//# sourceMappingURL=streaming.js.map