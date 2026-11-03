import menuData from '@/data/dishes.json';

/** Estimated per-serving values: kcal, grams, and milligrams for sodium. */
export type Nutrition = { calories: number; protein: number; carbs: number; fat: number; fibre: number; sugar: number; sodium: number };
export type Dish = {
  id: string; name: string; category: string; description: string; price: number; image: string; vegetarian: boolean;
  ingredients: string[]; allergens: string[]; portion: string; preparation: string; model: string | null; tag: string;
  /** Shown in the "Try something new" rail. */
  is_new: boolean;
  /** Shown in the "Today's special" rail. */
  todays_special: boolean;
  nutrition: Nutrition | null;
};

export const dishes: Dish[] = menuData as Dish[];

/** Display order for menu groups. Categories not listed here are appended alphabetically. */
export const categoryOrder = ['South Indian', 'North Indian curries', 'Biryani & rice', 'Tandoor & starters', 'Indian street food', 'Burgers', 'Pizza', 'Bowls & plates', 'Indian sweets', 'Sweet treats', 'Coffee & drinks'];
export const categoryIcons: Record<string, string> = {
  'South Indian': '◐', 'North Indian curries': '◉', 'Biryani & rice': '❋', 'Tandoor & starters': '♨', 'Indian street food': '✦',
  Burgers: '◒', Pizza: '◔', 'Bowls & plates': '◡', 'Indian sweets': '❀', 'Sweet treats': '✿', 'Coffee & drinks': '☕',
};

export function groupByCategory(items: Dish[]) {
  const groups = new Map<string, Dish[]>();
  for (const dish of items) groups.set(dish.category, [...(groups.get(dish.category) || []), dish]);
  const rank = (name: string) => { const index = categoryOrder.indexOf(name); return index === -1 ? categoryOrder.length : index; };
  return [...groups.entries()].sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b)).map(([name, list]) => ({ name, dishes: list }));
}

/** Accepts either a full image URL (e.g. Wikimedia Commons) or an Unsplash photo id. */
export const photo = (dish: Dish | undefined, width = 800) => {
  const image = dish?.image || 'photo-1568901346375-23c9450c58cd';
  return /^https?:\/\//.test(image) ? image : `https://images.unsplash.com/${image}?auto=format&fit=crop&w=${width}&q=85`;
};
export const photoCredit = (dish: Dish) => /wikimedia\.org/.test(dish.image) ? 'Photo: Wikimedia Commons contributors (CC BY-SA)' : 'Illustrative photo: Unsplash';

/** Fills fields that an older database row may not have yet (before the highlights/nutrition migration). */
function normalise(row: Partial<Dish> & { id: string }): Dish {
  const local = dishes.find((dish) => dish.id === row.id);
  return {
    ...(local || {} as Dish),
    ...row,
    is_new: row.is_new ?? local?.is_new ?? false,
    todays_special: row.todays_special ?? local?.todays_special ?? false,
    nutrition: row.nutrition ?? local?.nutrition ?? null,
    ingredients: row.ingredients ?? local?.ingredients ?? [],
    allergens: row.allergens ?? local?.allergens ?? [],
  } as Dish;
}

export async function getMenu(): Promise<{items: Dish[]; live: boolean}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { items: dishes, live: false };
  try {
    const res = await fetch(`${url}/rest/v1/dishes?select=*&cafe_slug=eq.savour&published=eq.true&order=sort_order`, { headers: { apikey: key }, cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error('Menu unavailable');
    const rows: (Partial<Dish> & { id: string })[] = await res.json();
    return { items: rows.map(normalise), live: true };
  } catch {
    return { items: dishes, live: false };
  }
}
