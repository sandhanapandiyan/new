declare class RecordManager {
    private processes;
    private activeRecordings;
    startAll(): Promise<void>;
    sanitizeName(name: string): string;
    getDetails(cameraId: string): {
        startTime: number;
    } | undefined;
    startRecording(camera: any): void;
    stopRecording(cameraId: string): void;
}
export declare const recordManager: RecordManager;
export {};
//# sourceMappingURL=recorder.d.ts.map