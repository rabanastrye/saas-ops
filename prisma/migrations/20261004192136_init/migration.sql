-- CreateTable
CREATE TABLE "SaaSProject" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaaSProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "up" BOOLEAN NOT NULL,
    "httpStatus" INTEGER,
    "latencyMs" INTEGER NOT NULL,
    "error" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricsSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthSnapshot_projectId_checkedAt_idx" ON "HealthSnapshot"("projectId", "checkedAt");

-- CreateIndex
CREATE INDEX "MetricsSnapshot_projectId_name_recordedAt_idx" ON "MetricsSnapshot"("projectId", "name", "recordedAt");

-- CreateIndex
CREATE INDEX "Incident_projectId_kind_resolvedAt_idx" ON "Incident"("projectId", "kind", "resolvedAt");

-- CreateIndex
CREATE INDEX "Incident_openedAt_idx" ON "Incident"("openedAt");

-- AddForeignKey
ALTER TABLE "HealthSnapshot" ADD CONSTRAINT "HealthSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SaaSProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricsSnapshot" ADD CONSTRAINT "MetricsSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SaaSProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SaaSProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
