import { prisma } from '@/lib/prisma';
import ItemsTable from '@/components/items/item';
import Search from '@/components/search';
import Pagination from '@/components/pagination';
import styles from '@/styles/items.module.css';
import ItemsFilterBar from '@/components/dashboard/items-filter-bar';
import { CreateItem } from '@/components/button';
import type { Item } from '@/lib/definitions';

export const revalidate = 0;

type Props = { searchParams?: Promise<{ page?: string; query?: string; filter?: string }> };

export default async function Page(props: Props) {
    const searchParams = (await props.searchParams) ?? {};
    const page = Number(searchParams.page ?? '1') || 1;
    const pageSize = 10;

    const query = searchParams.query ?? '';
    const filter = searchParams.filter ?? '';

    // build query and filter where clauses separately then combine via AND
    const queryWhere: any = {};
    if (query) {
        queryWhere.OR = [
            { name: { contains: query, mode: 'insensitive' } },
            { keywords: { contains: query, mode: 'insensitive' } },
        ];
    }

    let filterWhere: any = {};
    if (filter === 'sold') {
        filterWhere.OR = [
            { transactionDate: { not: null } },
            { transaction: { isNot: null } },
        ];
    } else if (filter === 'sold-store') {
        filterWhere.soldOnDepop = false;
        filterWhere.OR = [
            { transactionDate: { not: null } },
            { transaction: { isNot: null } },
        ];
    } else if (filter === 'sold-depop') {
        filterWhere.soldOnDepop = true;
    } else if (filter === 'unsold-depop') {
        filterWhere.onDepop = true;
        filterWhere.soldOnDepop = false;
        filterWhere.transactionDate = null;
        filterWhere.transaction = { is: null };
        } else if (filter === 'unsold') {
            // Items that do not have a transactionId or associated transaction and soldOnDepop is false
            filterWhere.transactionDate = null;
            filterWhere.transaction = { is: null };
            filterWhere.soldOnDepop = false;
    }

    const where: any = {};
    const andClauses: any[] = [];
    if (Object.keys(queryWhere).length) andClauses.push(queryWhere);
    if (Object.keys(filterWhere).length) andClauses.push(filterWhere);
    if (andClauses.length) where.AND = andClauses;

    const [totalCount, items] = await Promise.all([
        prisma.item.count({ where }),
        prisma.item.findMany({
            where,
            include: { categories: true, transaction: true },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return (
        <main className={["w-full", styles.sometypeMono].join(" ")}>
            <div className="flex w-full items-center justify-between">
                <h1 className={`text-2xl`}>Items</h1>
            </div>

            <ItemsFilterBar />

            <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
                <Search placeholder="Search items..." />
                <CreateItem />
            </div>

            <section className="mt-8">
                <ItemsTable items={items as Item[]} />
            </section>

            <div className="mt-5 flex w-full justify-center">
                <Pagination totalPages={totalPages} />
            </div>
        </main>
    );
}