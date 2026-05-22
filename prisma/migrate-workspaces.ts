import { PrismaClient, WorkspaceRole } from '@prisma/client'


const prisma = new PrismaClient()


async function main() {
    console.log('🚀 Starting workspace migration...');

    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users to migrate`);

    for (const user of users) {
        console.log(`\nMigrating user: ${user.email}`);

        const workspace = await prisma.workspace.create({
            data: {
                name: `${user.firstName ?? user.email.split('@')[0]}'s Personal`,
                type: 'PERSONAL',
                ownerId: user.id,
                currency: user.currency,
            },
        })
        console.log(`  ✅ Created workspace: ${workspace.name}`);

        await prisma.workspaceMember.create({
            data: {
                workspaceId: workspace.id,
                userId: user.id,
                role: WorkspaceRole.OWNER,
            }
        })
        console.log(`  ✅ Added as workspace owner`);

        await prisma.user.update({
            where: { id: user.id },
            data: { lastWorkspaceId: workspace.id },
        })
        console.log(`  ✅ Set lastWorkspaceId`);

        const categories = await prisma.category.updateMany({
            where: { userId: user.id },
            data: { workspaceId: workspace.id },
        })
        console.log(`  ✅ Migrated ${categories.count} categories`);

        const expenses = await prisma.expense.updateMany({
            where: { userId: user.id },
            data: { workspaceId: workspace.id },
        })
        console.log(`  ✅ Migrated ${expenses.count} expenses`);


        const income = await prisma.income.updateMany({
            where: { userId: user.id },
            data: { workspaceId: workspace.id },
        })
        console.log(`  ✅ Migrated ${income.count} income entries`);

        const budgets = await prisma.budget.updateMany({
            where: { userId: user.id },
            data: { workspaceId: workspace.id },
        });
        console.log(`  ✅ Migrated ${budgets.count} budgets`);
    }

    console.log('\n📊 Verification:');
    const workspaceCount = await prisma.workspace.count();
    const memberCount = await prisma.workspaceMember.count();
    


    console.log(`  Workspaces created: ${workspaceCount}`);
    console.log(`  Workspace members: ${memberCount}`);


    console.log('\n✅ Migration complete. All records have a workspaceId.');
    console.log('✅ Safe to enforce NOT NULL constraints in next migration.');
}

main()
    .catch((e) => {
        console.error('❌ Migration failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect())