-- CreateTable
CREATE TABLE "Camera" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "rtspUrl" TEXT NOT NULL,
    "onvifUrl" TEXT,
    "username" TEXT,
    "password" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "recordMode" TEXT NOT NULL DEFAULT 'continuous',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Recording" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cameraId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "size" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'recording',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recording_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'system',
    "storagePath" TEXT NOT NULL DEFAULT './recordings',
    "retentionGb" INTEGER NOT NULL DEFAULT 200,
    "cleanThreshold" INTEGER NOT NULL DEFAULT 80,
    "targetThreshold" INTEGER NOT NULL DEFAULT 70,
    "updatedAt" DATETIME NOT NULL
);
