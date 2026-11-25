// Spending categories and their persisted ids (design: Screens, Spending tab).
// The ids must not change once plans are saved.

export interface CategoryGroup {
  id: string;
  name: string;
  categories: { id: string; name: string }[];
}

export const CATEGORY_GROUPS: readonly CategoryGroup[] = [
  {
    id: 'home',
    name: 'Home and utilities',
    categories: [
      { id: 'mortgage_rent', name: 'Mortgage and rent' },
      { id: 'property_tax', name: 'Property tax' },
      { id: 'hydro', name: 'Hydro' },
      { id: 'gas_fuel', name: 'Gas and fuel' },
      { id: 'internet', name: 'Internet' },
      { id: 'mobile_phone', name: 'Mobile phone' },
    ],
  },
  {
    id: 'getting_around',
    name: 'Getting around',
    categories: [
      { id: 'auto_payment', name: 'Auto payment' },
      { id: 'auto_gas', name: 'Auto gas' },
      { id: 'public_transit', name: 'Public transportation' },
    ],
  },
  {
    id: 'insurance',
    name: 'Insurance and banking',
    categories: [
      { id: 'home_auto_insurance', name: 'Home and auto insurance' },
      { id: 'life_insurance', name: 'Life insurance' },
      { id: 'disability_insurance', name: 'Disability insurance' },
      { id: 'bank_fees', name: 'Bank fees' },
    ],
  },
  {
    id: 'food',
    name: 'Food and drink',
    categories: [
      { id: 'groceries', name: 'Groceries' },
      { id: 'restaurants', name: 'Restaurants' },
      { id: 'fast_food', name: 'Fast food' },
      { id: 'alcohol_bars', name: 'Alcohol and bars' },
    ],
  },
  {
    id: 'travel',
    name: 'Travel',
    categories: [
      { id: 'travel_transport', name: 'Transportation' },
      { id: 'travel_accommodation', name: 'Accommodations' },
      { id: 'travel_food_drink', name: 'Food and drink' },
      { id: 'travel_activities', name: 'Activities' },
      { id: 'travel_insurance', name: 'Travel insurance' },
      { id: 'travel_gear', name: 'Gear' },
      { id: 'travel_shopping', name: 'Shopping' },
    ],
  },
  {
    id: 'everyday',
    name: 'Everyday and other',
    categories: [
      { id: 'shopping', name: 'Shopping' },
      { id: 'pharmacy', name: 'Pharmacy' },
      { id: 'gifts_donations', name: 'Gifts and donations' },
      { id: 'cash', name: 'Cash' },
      { id: 'other', name: 'Other' },
    ],
  },
];

export const CATEGORY_IDS: readonly string[] = CATEGORY_GROUPS.flatMap((g) =>
  g.categories.map((c) => c.id),
);

export function categoryName(id: string): string {
  for (const g of CATEGORY_GROUPS) {
    const c = g.categories.find((x) => x.id === id);
    if (c) return g.id === 'travel' ? `Travel: ${c.name}` : c.name;
  }
  return id;
}
