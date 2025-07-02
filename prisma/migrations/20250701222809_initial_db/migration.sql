-- CreateTable
CREATE TABLE `ApiKey` (
    `id` VARCHAR(191) NOT NULL,
    `keyHash` VARCHAR(255) NOT NULL,
    `activeTasks` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ApiKey_keyHash_key`(`keyHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(50) NOT NULL,
    `address` VARCHAR(255) NOT NULL,
    `point` INTEGER NOT NULL DEFAULT 0,
    `password` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_address_key`(`address`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` TEXT NOT NULL,
    `refreshToken` TEXT NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Session_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WalletNonce` (
    `address` VARCHAR(255) NOT NULL,
    `nonce` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`address`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TelegramUser` (
    `id` VARCHAR(191) NOT NULL,
    `telegramId` VARCHAR(50) NOT NULL,
    `username` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TelegramUser_telegramId_key`(`telegramId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Music` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(100) NOT NULL DEFAULT '',
    `tags` VARCHAR(255) NULL,
    `lyrics` TEXT NULL,
    `audioUrl` VARCHAR(255) NULL,
    `imageUrl` VARCHAR(255) NULL,
    `videoUrl` VARCHAR(255) NULL,
    `state` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `taskId` VARCHAR(100) NOT NULL,
    `totalView` INTEGER NOT NULL DEFAULT 0,
    `userId` VARCHAR(191) NULL,
    `telegramUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Music_taskId_key`(`taskId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Mesh` (
    `id` VARCHAR(191) NOT NULL,
    `prompt` TEXT NOT NULL,
    `modelType` VARCHAR(191) NOT NULL,
    `aiVersion` VARCHAR(191) NOT NULL DEFAULT 'meshy',
    `taskIdPreview` VARCHAR(100) NOT NULL,
    `taskIdRefine` VARCHAR(100) NULL,
    `totalView` INTEGER NOT NULL DEFAULT 0,
    `modelGlbPreview` VARCHAR(255) NULL,
    `modelFbxPreview` VARCHAR(255) NULL,
    `modelUsdzPreview` VARCHAR(255) NULL,
    `modelObjPreview` VARCHAR(255) NULL,
    `previewImage` VARCHAR(255) NULL,
    `videoPreview` VARCHAR(255) NULL,
    `modelGlbRefine` VARCHAR(255) NULL,
    `modelFbxRefine` VARCHAR(255) NULL,
    `modelUsdzRefine` VARCHAR(255) NULL,
    `modelObjRefine` VARCHAR(255) NULL,
    `modelMtlRefine` VARCHAR(255) NULL,
    `refineImage` VARCHAR(255) NULL,
    `videoRefine` VARCHAR(255) NULL,
    `userId` VARCHAR(191) NULL,
    `telegramUserId` VARCHAR(191) NULL,
    `state` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `apiKeyId` VARCHAR(191) NULL,

    UNIQUE INDEX `Mesh_taskIdPreview_key`(`taskIdPreview`),
    UNIQUE INDEX `Mesh_taskIdRefine_key`(`taskIdRefine`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Texture` (
    `id` VARCHAR(191) NOT NULL,
    `meshId` VARCHAR(100) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `url` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Favorite` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `meshId` VARCHAR(100) NULL,
    `musicId` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Favorite_userId_meshId_key`(`userId`, `meshId`),
    UNIQUE INDEX `Favorite_userId_musicId_key`(`userId`, `musicId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GeneratedCode` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `prompt` TEXT NOT NULL,
    `result` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Music` ADD CONSTRAINT `Music_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Music` ADD CONSTRAINT `Music_telegramUserId_fkey` FOREIGN KEY (`telegramUserId`) REFERENCES `TelegramUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mesh` ADD CONSTRAINT `Mesh_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mesh` ADD CONSTRAINT `Mesh_telegramUserId_fkey` FOREIGN KEY (`telegramUserId`) REFERENCES `TelegramUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mesh` ADD CONSTRAINT `Mesh_apiKeyId_fkey` FOREIGN KEY (`apiKeyId`) REFERENCES `ApiKey`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Texture` ADD CONSTRAINT `Texture_meshId_fkey` FOREIGN KEY (`meshId`) REFERENCES `Mesh`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Favorite` ADD CONSTRAINT `Favorite_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Favorite` ADD CONSTRAINT `Favorite_meshId_fkey` FOREIGN KEY (`meshId`) REFERENCES `Mesh`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Favorite` ADD CONSTRAINT `Favorite_musicId_fkey` FOREIGN KEY (`musicId`) REFERENCES `Music`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GeneratedCode` ADD CONSTRAINT `GeneratedCode_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
