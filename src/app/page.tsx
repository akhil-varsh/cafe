import Menu from '@/components/menu';
import { getMenu } from '@/lib/menu';
export const dynamic='force-dynamic';
export default async function Page(){const {items,live}=await getMenu();return <Menu dishes={items} live={live}/>;}
