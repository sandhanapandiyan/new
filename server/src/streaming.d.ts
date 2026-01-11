declare class StreamManager {
    private go2rtcProcess;
    private apiUrl;
    start(): Promise<void>;
    syncStreams(): Promise<void>;
    addStream(id: string, url: string): Promise<void>;
    removeStream(id: string): Promise<void>;
    getLiveStats(): Promise<any>;
    stop(): void;
}
export declare const streamManager: StreamManager;
export {};
//# sourceMappingURL=streaming.d.ts.map