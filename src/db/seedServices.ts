import { eq } from "drizzle-orm";
import { db, poolConnection } from "./index.js";
import { categories, subcategories, services } from "./schema.js";

const RAJSHAHI_LOCATIONS = [
  { address: "Sagarpara to Resompotti, Beldarpara, Boalia, Rajshahi", lat: 24.3673, lng: 88.6070 },
  { address: "Sagarpara Bottola, Boalia, Rajshahi", lat: 24.3680, lng: 88.6060 },
  { address: "Plot 15, Alupatti Mor, Padma Riverside Road, Rajshahi", lat: 24.3653, lng: 88.6045 },
  { address: "Ranibazar Fire Service Mor, Boalia, Rajshahi", lat: 24.3670, lng: 88.6020 },
  { address: "Moni Chattar, Malopara, Boalia, Rajshahi", lat: 24.3640, lng: 88.6030 },
  { address: "Holding 42, Zero Point, Shaheb Bazar, Boalia, Rajshahi", lat: 24.3636, lng: 88.6241 },
  { address: "Shop 24, New Market Commercial Complex, Rajshahi", lat: 24.3700, lng: 88.6020 },
  { address: "Bornali Mor, Greater Road, Boalia, Rajshahi", lat: 24.3730, lng: 88.5950 },
  { address: "Station Road, Shiroil Bus Terminal Area, Rajshahi", lat: 24.3750, lng: 88.6040 },
  { address: "House 28, Road 4, Sector 1, Upashahar, Rajshahi", lat: 24.3820, lng: 88.6000 },
  { address: "Bhadra Railway Overpass Mor, Chandrima, Rajshahi", lat: 24.3740, lng: 88.6200 },
  { address: "Block C, Padma Residential Area, Rajshahi", lat: 24.3680, lng: 88.6250 },
  { address: "Holding 112, Talaimari Mor, Motihar, Rajshahi", lat: 24.3630, lng: 88.6290 },
  { address: "Kazla University Road, Motihar, Rajshahi", lat: 24.3660, lng: 88.6320 },
  { address: "Shop 8, Laxmipur Medical Mor, Rajshahi", lat: 24.3725, lng: 88.5833 },
  { address: "Near RU Main Gate, Binodpur Bazar, Motihar, Rajshahi", lat: 24.3686, lng: 88.6378 },
  { address: "Terokhadia Stadium Gate, Chandrima, Rajshahi", lat: 24.3850, lng: 88.5900 },
  { address: "Sopura BSCIC Industrial Zone, Shah Makhdum, Rajshahi", lat: 24.3900, lng: 88.6100 },
  { address: "Shalbagan Bus Stand Mor, Shah Makhdum, Rajshahi", lat: 24.3930, lng: 88.6050 },
  { address: "Court Station Market, Kashiadanga, Rajshahi", lat: 24.3650, lng: 88.5600 },
  { address: "Naodapara Bypass Mor, Shah Makhdum, Rajshahi", lat: 24.4100, lng: 88.6200 },
];

const BUSINESS_PREFIXES = [
  "Rajshahi Fix & Care",
  "Padma Delta Technical",
  "Barendra Home Solutions",
  "Shaheb Bazar Rapid",
  "Silk City Master",
  "Varendra Expert Care",
  "Laxmipur Quick Pro",
  "North Bengal Service Hub",
  "Motihar Tech Solutions",
  "Green City Maintenance",
  "Padma View Technical",
  "Barendra Prime Care",
];

const PHONE_NUMBERS = [
  "01712-458921",
  "01723-984120",
  "01734-512890",
  "01745-671234",
  "01756-892341",
  "01767-123987",
  "01778-456123",
  "01789-234567",
  "01790-678123",
  "01819-234876",
  "01823-765432",
  "01834-890123",
  "01845-678901",
  "01856-123456",
  "01867-890234",
  "01878-345678",
  "01912-789012",
  "01923-456789",
  "01934-890567",
  "01945-234567",
];

const SERVICE_NAME_VARIANTS = [
  (subName: string) => `Master Pro ${subName}`,
  (subName: string) => `Emergency 24/7 ${subName}`,
  (subName: string) => `Standard Residential ${subName}`,
  (subName: string) => `Commercial & Corporate ${subName}`,
  (subName: string) => `Express Same-Day ${subName}`,
];

export async function seedServices() {
  console.log("=== SEEDING RAJSHAHI SERVICES FOR ALL CATEGORIES & SUBCATEGORIES ===");

  // 1. Fetch all categories and subcategories
  const allCats = await db.select().from(categories);
  const allSubs = await db.select().from(subcategories);

  console.log(`Found ${allCats.length} categories and ${allSubs.length} subcategories.`);

  if (allSubs.length === 0) {
    console.error("No subcategories found! Please run seedCategoriesAndSubcategories first.");
    return;
  }

  // 2. Clear old services
  await db.delete(services);
  console.log("Cleared old services table.");

  // Ensure utf8mb4 collation for Bengali Unicode text
  try {
    await poolConnection.query("ALTER TABLE services CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  } catch (e) {
    console.warn("Collation alter warning:", e);
  }

  // 3. Prepare services to insert (5 per subcategory)
  const catMap = new Map(allCats.map((c) => [c.id, c]));
  const servicesToInsert: any[] = [];
  let counter = 0;

  for (const sub of allSubs) {
    const parentCat = catMap.get(sub.categoryId);
    const catName = parentCat ? parentCat.name : "General";
    const catImage = parentCat ? parentCat.image : sub.image;

    for (let i = 0; i < 5; i++) {
      const nameGenerator = SERVICE_NAME_VARIANTS[i % SERVICE_NAME_VARIANTS.length];
      const serviceName = nameGenerator(sub.name);

      const addressIndex = (counter + i) % RAJSHAHI_LOCATIONS.length;
      const loc = RAJSHAHI_LOCATIONS[addressIndex];
      const address = loc.address;
      const areaName = address.split(",")[1]?.trim() || "Rajshahi";

      const bizIndex = (counter * 3 + i) % BUSINESS_PREFIXES.length;
      const businessName = `${BUSINESS_PREFIXES[bizIndex]} (${sub.name.split(" ")[0]})`;

      const phoneIndex = (counter * 7 + i) % PHONE_NUMBERS.length;
      const rawPhone = PHONE_NUMBERS[phoneIndex];
      const cleanPhoneDigits = rawPhone.replace(/\D/g, "");
      const whatsapp = `880${cleanPhoneDigits.substring(1)}`;

      // Images: JSON array of transparent PNGs
      const serviceImages = JSON.stringify([sub.image, catImage].filter(Boolean));

      servicesToInsert.push({
        name: serviceName,
        businessName,
        logo: sub.image, // Transparent PNG icon
        address,
        latitude: loc.lat,
        longitude: loc.lng,
        phone: rawPhone,
        whatsapp,
        images: serviceImages,
        categoryId: sub.categoryId,
        subcategoryId: sub.id,
        description: `Professional ${sub.name} service available in ${areaName} and all across Rajshahi city. Verified and certified technicians with modern tools, genuine parts, and 7 days free service warranty.`,
        status: "active" as const,
        userId: 1,
      });

      counter++;
    }
  }

  console.log(`Prepared ${servicesToInsert.length} services across ${allSubs.length} subcategories.`);

  // 4. Batch insert in chunks of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < servicesToInsert.length; i += BATCH_SIZE) {
    const batch = servicesToInsert.slice(i, i + BATCH_SIZE);
    await db.insert(services).values(batch);
    console.log(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1} / ${Math.ceil(servicesToInsert.length / BATCH_SIZE)} (${batch.length} items)`);
  }

  console.log(`=== SUCCESSFULLY SEEDED ${servicesToInsert.length} SERVICES IN RAJSHAHI! ===`);
}

if (process.argv[1]?.includes("seedServices")) {
  seedServices()
    .then(async () => {
      await poolConnection.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("Error seeding services:", err);
      await poolConnection.end();
      process.exit(1);
    });
}
