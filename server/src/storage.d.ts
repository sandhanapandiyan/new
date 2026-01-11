declare class StorageManager {
    private recordingDir;
    private thresholdPercent;
    private targetPercent;
    constructor();
    private sanitizeName;
    syncRecordings(): Promise<void>;
    checkAndCleanup(): Promise<void>;
    private getDiskUsage;
    private purgeOldestRecordings;
    startMonitoring(): void;
}
export declare const storageManager: StorageManager;
export {};
//# sourceMappingURL=storage.d.ts.map