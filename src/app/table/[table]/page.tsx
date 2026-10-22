import { redirect } from 'next/navigation';

export default async function TableRoute({ params }: { params: Promise<{ table: string }> }) {
  const { table } = await params;
  redirect(`/?table=${encodeURIComponent(table.slice(0, 24))}`);
}
