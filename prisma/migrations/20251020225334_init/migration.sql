-- CreateTable
CREATE TABLE `Item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `cost_basis` INTEGER NULL,
    `transaction_price` INTEGER NULL,
    `transaction_id` INTEGER NULL,
    `list_price` INTEGER NOT NULL,
    `discounted_list_price` INTEGER NULL,
    `has_printed_tag` BOOLEAN NOT NULL DEFAULT false,
    `store_credit_amount_applied` INTEGER NULL,
    `keywords` VARCHAR(191) NULL,
    `categories` VARCHAR(191) NULL,
    `measurements` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
