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

/**
 * Two-level menu: a parent section holds ordered sub-categories (the `category` column on each dish).
 * A category that is not listed here falls into the first section, after the listed ones.
 */
export const sections = [
  { name: 'Cafe', tagline: 'Coffee, bakes and all-day plates', icon: '☕', categories: ['Hot coffee & chocolate', 'Cold coffee & shakes', 'All-day breakfast', 'Sandwiches & sides', 'Burgers', 'Pizza', 'Pasta', 'Bakes & desserts'] },
  { name: 'Indian kitchen', tagline: 'Regional favourites, made fresh', icon: '❋', categories: ['South Indian', 'North Indian curries', 'Biryani & rice', 'Tandoor & starters', 'Indian street food', 'Indian sweets', 'Chai & lassi'] },
] as const;
export type SectionName = (typeof sections)[number]['name'];

export const categoryIcons: Record<string, string> = {
  'Hot coffee & chocolate': '☕', 'Cold coffee & shakes': '❄', 'All-day breakfast': '◐', 'Sandwiches & sides': '◭', Burgers: '◒', Pizza: '◔', Pasta: '∿', 'Bakes & desserts': '✿',
  'South Indian': '◑', 'North Indian curries': '◉', 'Biryani & rice': '❋', 'Tandoor & starters': '♨', 'Indian street food': '✦', 'Indian sweets': '❀', 'Chai & lassi': '♨',
};

export function sectionOf(category: string): SectionName {
  return (sections.find((section) => (section.categories as readonly string[]).includes(category)) || sections[0]).name;
}

function categoryRank(name: string) {
  const index = sections.flatMap((section) => [...section.categories] as string[]).indexOf(name);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function groupByCategory(items: Dish[]) {
  const groups = new Map<string, Dish[]>();
  for (const dish of items) groups.set(dish.category, [...(groups.get(dish.category) || []), dish]);
  return [...groups.entries()].sort(([a], [b]) => categoryRank(a) - categoryRank(b) || a.localeCompare(b)).map(([name, list]) => ({ name, dishes: list }));
}

/** Parent sections, each with its non-empty sub-categories, in menu order. */
export function groupBySection(items: Dish[]) {
  return sections
    .map((section) => ({ ...section, groups: groupByCategory(items.filter((dish) => sectionOf(dish.category) === section.name)) }))
    .filter((section) => section.groups.length > 0);
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
