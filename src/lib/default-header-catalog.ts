export type DefaultHeaderType = 'global' | 'island' | 'itinerary_category' | 'business_type' | 'empty_state';

export interface DefaultHeaderImageRecord {
  id?: string;
  title: string;
  description?: string | null;
  header_type: DefaultHeaderType;
  scope_key: string;
  island?: string | null;
  category?: string | null;
  business_type?: string | null;
  desktop_image_url: string;
  mobile_image_url?: string | null;
  card_image_url?: string | null;
  app_detail_image_url?: string | null;
  alt_text: string;
  is_active: boolean;
  usage_count?: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

const tourismCdn = (path: string) => `https://tempo.cdn.tambourine.com/windsong/media/${path}`;
const npiCdn = (path: string) => `https://www.nassauparadiseisland.com/sites/default/files/${path}`;

export const DEFAULT_HEADER_IMAGE_SEEDS: DefaultHeaderImageRecord[] = [
  {
    title: 'Global Bahamas Coastline',
    description: 'General fallback for generic pages, empty itinerary pages, search pages, and new content.',
    header_type: 'global',
    scope_key: 'global',
    desktop_image_url: tourismCdn('bmot-nassau-islands-img-5f7655231dcf7.jpg'),
    alt_text: 'Bright Bahamas coastline with turquoise water and soft blue sky',
    is_active: true,
    sort_order: 1,
  },
  { title: 'Nassau Header', description: 'Cruise port, colorful downtown, beach, and city energy.', header_type: 'island', scope_key: 'nassau', island: 'Nassau', desktop_image_url: tourismCdn('bmot-nassau-islands-img-5f7655231dcf7.jpg'), alt_text: 'Nassau waterfront and tropical city coastline', is_active: true, sort_order: 10 },
  { title: 'Paradise Island Header', description: 'Luxury resort, beach, waterpark, and premium island feel.', header_type: 'island', scope_key: 'paradise-island', island: 'Paradise Island', desktop_image_url: tourismCdn('bmot-nassau-islands-img-5f7655231dcf7.jpg'), alt_text: 'Paradise Island resort coastline and turquoise water', is_active: true, sort_order: 11 },
  { title: 'Exuma Header', description: 'Sandbars, turquoise water, and boating.', header_type: 'island', scope_key: 'exuma', island: 'Exuma', desktop_image_url: tourismCdn('bmot-exumas-islands-img-5f7654f77ef66.jpg'), alt_text: 'Exuma sandbar and clear shallow blue water', is_active: true, sort_order: 12 },
  { title: 'Eleuthera Header', description: 'Pink sand, cliffs, and calm luxury.', header_type: 'island', scope_key: 'eleuthera', island: 'Eleuthera', desktop_image_url: tourismCdn('bmot-eleuthera-islands-img-5f7654ecd18bf.jpg'), alt_text: 'Eleuthera pink sand beach and clear water', is_active: true, sort_order: 13 },
  { title: 'Abaco Header', description: 'Marina, sailing, and island hopping.', header_type: 'island', scope_key: 'abaco', island: 'Abaco', desktop_image_url: tourismCdn('bmot-the-abacos-islands-img-5f765543ac3d5.jpg'), alt_text: 'Abaco marina and island-hopping coastline', is_active: true, sort_order: 14 },
  { title: 'Andros Header', description: 'Blue holes, nature, fishing, and eco-tourism.', header_type: 'island', scope_key: 'andros', island: 'Andros', desktop_image_url: tourismCdn('bmot-andros-islands-img-5f7654cd43acd.jpg'), alt_text: 'Andros blue hole and natural green coastline', is_active: true, sort_order: 15 },
  { title: 'Bimini Header', description: 'Beach club, boating, fishing, and nightlife.', header_type: 'island', scope_key: 'bimini', island: 'Bimini', desktop_image_url: tourismCdn('bimini-5ebc1e784e5d8.jpg'), alt_text: 'Bimini beach and boating water scene', is_active: true, sort_order: 16 },
  { title: 'Grand Bahama Header', description: 'Beach, shopping, diving, and eco-tourism.', header_type: 'island', scope_key: 'grand-bahama', island: 'Grand Bahama', desktop_image_url: tourismCdn('freeport-5ebc543630edb.jpg'), alt_text: 'Grand Bahama beach and tropical coastline', is_active: true, sort_order: 17 },
  { title: 'Long Island Header', description: 'Dean’s Blue Hole, cliffs, and dramatic coast.', header_type: 'island', scope_key: 'long-island', island: 'Long Island', desktop_image_url: tourismCdn('bmot-long-island-islands-img-5f765510d841f.jpg'), alt_text: 'Long Island cliffs and dramatic blue coastline', is_active: true, sort_order: 18 },
  { title: 'Cat Island Header', description: 'Quiet beach, culture, and nature.', header_type: 'island', scope_key: 'cat-island', island: 'Cat Island', desktop_image_url: tourismCdn('bmot-cat-island-islands-img-5f7654d9ad20a.jpg'), alt_text: 'Cat Island quiet tropical beach and palms', is_active: true, sort_order: 19 },
  { title: 'Cruise Day Header', description: 'Cruise ship arriving in Nassau and walkable downtown energy.', header_type: 'itinerary_category', scope_key: 'cruise-day', category: 'Cruise Day', desktop_image_url: tourismCdn('bmot-nassau-islands-img-5f7655231dcf7.jpg'), alt_text: 'Cruise day in Nassau with port and waterfront energy', is_active: true, sort_order: 30 },
  { title: 'Family Day Header', description: 'Beach, kids, safety, and relaxed family travel.', header_type: 'itinerary_category', scope_key: 'family-day', category: 'Family Day', desktop_image_url: npiCdn('images/2025-04/people-relaxing.png'), alt_text: 'Family beach day with calm water and white sand', is_active: true, sort_order: 31 },
  { title: 'Adventure Header', description: 'Jet ski, snorkeling, boat tour, and high energy.', header_type: 'itinerary_category', scope_key: 'adventure', category: 'Adventure', desktop_image_url: npiCdn('styles/portrait/public/images/2024-05/D80_6558%20%2B%206557_Hires.jpg'), alt_text: 'Adventure activity in clear turquoise Bahamas water', is_active: true, sort_order: 32 },
  { title: 'Food & Culture Header', description: 'Bahamian food, downtown culture, and Junkanoo color.', header_type: 'itinerary_category', scope_key: 'food-culture', category: 'Food & Culture', desktop_image_url: tourismCdn('goombay-summer-2023-intro-64b04840c1ccc.png'), alt_text: 'Bahamian food and colorful cultural island setting', is_active: true, sort_order: 33 },
  { title: 'Luxury Header', description: 'Resort pool, private beach, sunset, and premium travel.', header_type: 'itinerary_category', scope_key: 'luxury', category: 'Luxury', desktop_image_url: tourismCdn('bmot-nassau-islands-img-5f7655231dcf7.jpg'), alt_text: 'Luxury Bahamas resort beach and premium coastal setting', is_active: true, sort_order: 34 },
  { title: 'Budget Friendly Header', description: 'Public beach, walking tour, and local food.', header_type: 'itinerary_category', scope_key: 'budget-friendly', category: 'Budget Friendly', desktop_image_url: npiCdn('images/2025-04/people-relaxing.png'), alt_text: 'Accessible Bahamas public beach and local day out', is_active: true, sort_order: 35 },
  { title: 'Rainy Day Header', description: 'Museums, indoor experiences, shopping, and cafes.', header_type: 'itinerary_category', scope_key: 'rainy-day', category: 'Rainy Day', desktop_image_url: npiCdn('styles/portrait/public/images/2025-04/250220_NPI_AQ1_9267.jpg'), alt_text: 'Indoor Bahamas cultural experience for a rainy day', is_active: true, sort_order: 36 },
  { title: 'Nightlife Header', description: 'Beach bar, music, downtown lights, and warm evening energy.', header_type: 'itinerary_category', scope_key: 'nightlife', category: 'Nightlife', desktop_image_url: tourismCdn('cache/bahamas-goombay-summer-1-62bdd276c186d-1500x643.png'), alt_text: 'Bahamas nightlife with music and warm evening lights', is_active: true, sort_order: 37 },
  { title: 'Romantic Header', description: 'Sunset dinner, quiet beach, and couples travel.', header_type: 'itinerary_category', scope_key: 'romantic', category: 'Romantic', desktop_image_url: tourismCdn('cache/bahamas-goombay-summer-1-62bdd276c186d-1500x643.png'), alt_text: 'Romantic Bahamas sunset beach and dining setting', is_active: true, sort_order: 38 },
  { title: 'Local Gems Header', description: 'Hidden beach, local discovery, and off-path experiences.', header_type: 'itinerary_category', scope_key: 'local-gems', category: 'Local Gems', desktop_image_url: tourismCdn('bmot-eleuthera-islands-img-5f7654ecd18bf.jpg'), alt_text: 'Hidden Bahamas beach and local gem coastline', is_active: true, sort_order: 39 },
  { title: 'Restaurant Header', description: 'Bahamian food table, conch, seafood, and tropical drinks.', header_type: 'business_type', scope_key: 'restaurant', business_type: 'Restaurant', desktop_image_url: tourismCdn('goombay-summer-2023-intro-64b04840c1ccc.png'), alt_text: 'Bahamian food table with seafood and tropical drinks', is_active: true, sort_order: 50 },
  { title: 'Tour Operator Header', description: 'Boat, water, guides, and happy travelers.', header_type: 'business_type', scope_key: 'tour-operator', business_type: 'Tour Operator', desktop_image_url: tourismCdn('bmot-exumas-islands-img-5f7654f77ef66.jpg'), alt_text: 'Bahamas boat tour on clear water', is_active: true, sort_order: 51 },
  { title: 'Hotel Header', description: 'Resort exterior, pool, and beach arrival feel.', header_type: 'business_type', scope_key: 'hotel', business_type: 'Hotel', desktop_image_url: tourismCdn('bmot-nassau-islands-img-5f7655231dcf7.jpg'), alt_text: 'Bahamas hotel resort with beach and pool atmosphere', is_active: true, sort_order: 52 },
  { title: 'Beach Header', description: 'Wide beach, clear water, and soft sand.', header_type: 'business_type', scope_key: 'beach', business_type: 'Beach', desktop_image_url: npiCdn('images/2025-04/people-relaxing.png'), alt_text: 'Wide Bahamas beach with clear turquoise water', is_active: true, sort_order: 53 },
  { title: 'Shopping Header', description: 'Straw market, boutiques, souvenirs, and local vendors.', header_type: 'business_type', scope_key: 'shopping', business_type: 'Shopping', desktop_image_url: tourismCdn('goombay-summer-2023-intro-64b04840c1ccc.png'), alt_text: 'Bahamian shopping and local artisan market details', is_active: true, sort_order: 54 },
  { title: 'Transportation Header', description: 'Clean vehicle, airport pickup, and transfer service.', header_type: 'business_type', scope_key: 'transportation', business_type: 'Transportation', desktop_image_url: tourismCdn('bmot-nassau-islands-img-5f7655231dcf7.jpg'), alt_text: 'Bahamas transportation and airport transfer service', is_active: true, sort_order: 55 },
  { title: 'Business Nightlife Header', description: 'Bar, music, warm lighting, and social atmosphere.', header_type: 'business_type', scope_key: 'nightlife', business_type: 'Nightlife', desktop_image_url: tourismCdn('cache/bahamas-goombay-summer-1-62bdd276c186d-1500x643.png'), alt_text: 'Bahamian nightlife venue with music and warm lighting', is_active: true, sort_order: 56 },
  { title: 'Attractions Header', description: 'Forts, museums, landmarks, and sightseeing.', header_type: 'business_type', scope_key: 'attractions', business_type: 'Attractions', desktop_image_url: npiCdn('styles/portrait/public/images/2025-04/250220_NPI_AQ1_9267.jpg'), alt_text: 'Bahamas historic attraction and coastal sightseeing', is_active: true, sort_order: 57 },
];

export function slugifyHeaderScope(value?: string | null) {
  return (value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
