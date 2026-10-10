import { eq } from "drizzle-orm";
import { db, poolConnection } from "./index.js";
import { categories, subcategories, services } from "./schema.js";

interface SubCategoryDef {
  name: string;
  image: string;
}

interface CategoryDef {
  name: string;
  image: string;
  subcategories: SubCategoryDef[];
}

export const SEED_DATA: CategoryDef[] = [
  {
    name: "AC & Cooling Repair",
    image: "https://img.icons8.com/fluency/96/air-conditioner.png",
    subcategories: [
      { name: "AC Master Jet Cleaning", image: "https://img.icons8.com/fluency/96/cleaning-service.png" },
      { name: "AC Gas Refill & Leak Fix", image: "https://img.icons8.com/fluency/96/air-conditioner.png" },
      { name: "AC Installation & Uninstallation", image: "https://img.icons8.com/fluency/96/drill.png" },
      { name: "AC Circuit & Compressor Repair", image: "https://img.icons8.com/fluency/96/electrical.png" },
    ],
  },
  {
    name: "Plumbing Services",
    image: "https://img.icons8.com/fluency/96/plumbing.png",
    subcategories: [
      { name: "Pipe Leakage & Repair", image: "https://img.icons8.com/fluency/96/plumbing.png" },
      { name: "Tap, Mixer & Shower Fitting", image: "https://img.icons8.com/fluency/96/tap.png" },
      { name: "Water Tank Cleaning", image: "https://img.icons8.com/fluency/96/clean.png" },
      { name: "Drain & Commode Unclogging", image: "https://img.icons8.com/fluency/96/wrench.png" },
    ],
  },
  {
    name: "Electrical & Wiring",
    image: "https://img.icons8.com/fluency/96/electrical.png",
    subcategories: [
      { name: "Ceiling Fan Repair & Fitting", image: "https://img.icons8.com/fluency/96/fan.png" },
      { name: "Switchboard & Socket Repair", image: "https://img.icons8.com/fluency/96/plug.png" },
      { name: "Short Circuit & Wiring Fix", image: "https://img.icons8.com/fluency/96/electrical.png" },
      { name: "Light & Chandelier Fitting", image: "https://img.icons8.com/fluency/96/light-on.png" },
    ],
  },
  {
    name: "House Cleaning",
    image: "https://img.icons8.com/fluency/96/cleaning-service.png",
    subcategories: [
      { name: "Full Home Deep Cleaning", image: "https://img.icons8.com/fluency/96/cleaning-service.png" },
      { name: "Bathroom & Washroom Deep Clean", image: "https://img.icons8.com/fluency/96/clean.png" },
      { name: "Floor Polishing & Mop Care", image: "https://img.icons8.com/fluency/96/broom.png" },
      { name: "Post-Construction Cleaning", image: "https://img.icons8.com/fluency/96/vacuum-cleaner.png" },
    ],
  },
  {
    name: "Appliance Repair",
    image: "https://img.icons8.com/fluency/96/washing-machine.png",
    subcategories: [
      { name: "Washing Machine Repair", image: "https://img.icons8.com/fluency/96/washing-machine.png" },
      { name: "Refrigerator & Deep Fridge Fix", image: "https://img.icons8.com/fluency/96/fridge.png" },
      { name: "Microwave Oven Repair", image: "https://img.icons8.com/fluency/96/microwave.png" },
      { name: "TV & LED Screen Repair", image: "https://img.icons8.com/fluency/96/tv.png" },
      { name: "Water Heater & Geyser Repair", image: "https://img.icons8.com/fluency/96/water-heater.png" },
    ],
  },
  {
    name: "Painting & Renovation",
    image: "https://img.icons8.com/fluency/96/paint-brush.png",
    subcategories: [
      { name: "Interior Wall Painting", image: "https://img.icons8.com/fluency/96/paint-brush.png" },
      { name: "Exterior Wall Painting", image: "https://img.icons8.com/fluency/96/paint-bucket.png" },
      { name: "Damp Proofing & Putty Work", image: "https://img.icons8.com/fluency/96/brick-wall.png" },
      { name: "Wood & Furniture Varnish", image: "https://img.icons8.com/fluency/96/roller-brush.png" },
    ],
  },
  {
    name: "Carpentry & Woodwork",
    image: "https://img.icons8.com/fluency/96/saw.png",
    subcategories: [
      { name: "Furniture Assembly & Repair", image: "https://img.icons8.com/fluency/96/saw.png" },
      { name: "Door & Window Frame Fix", image: "https://img.icons8.com/fluency/96/door.png" },
      { name: "Wooden Cabinet & Drawer Maker", image: "https://img.icons8.com/fluency/96/drill.png" },
      { name: "Lock & Hinge Fitting", image: "https://img.icons8.com/fluency/96/hammer.png" },
    ],
  },
  {
    name: "Shifting & Moving",
    image: "https://img.icons8.com/fluency/96/van.png",
    subcategories: [
      { name: "House Shifting Service", image: "https://img.icons8.com/fluency/96/van.png" },
      { name: "Office Relocation Service", image: "https://img.icons8.com/fluency/96/truck.png" },
      { name: "Furniture Packing & Moving", image: "https://img.icons8.com/fluency/96/box.png" },
      { name: "Pickup & Delivery Service", image: "https://img.icons8.com/fluency/96/package.png" },
    ],
  },
  {
    name: "Pest Control",
    image: "https://img.icons8.com/fluency/96/insect.png",
    subcategories: [
      { name: "Cockroach Control Service", image: "https://img.icons8.com/fluency/96/insect.png" },
      { name: "Termite Treatment Service", image: "https://img.icons8.com/fluency/96/bug.png" },
      { name: "Bed Bug Eradication", image: "https://img.icons8.com/fluency/96/shield.png" },
      { name: "Rodent & Rat Control", image: "https://img.icons8.com/fluency/96/mouse.png" },
    ],
  },
  {
    name: "CCTV & Security Systems",
    image: "https://img.icons8.com/fluency/96/webcam.png",
    subcategories: [
      { name: "CCTV Camera Installation", image: "https://img.icons8.com/fluency/96/webcam.png" },
      { name: "CCTV DVR/NVR Troubleshooting", image: "https://img.icons8.com/fluency/96/laptop.png" },
      { name: "Smart Video Doorbell Setup", image: "https://img.icons8.com/fluency/96/speaker.png" },
      { name: "Security Alarm System Setup", image: "https://img.icons8.com/fluency/96/alarm.png" },
    ],
  },
  {
    name: "Beauty & Salon at Home",
    image: "https://img.icons8.com/fluency/96/spa.png",
    subcategories: [
      { name: "Facial & Skin Glow Treatment", image: "https://img.icons8.com/fluency/96/spa.png" },
      { name: "Hair Cut, Color & Styling", image: "https://img.icons8.com/fluency/96/hair-dryer.png" },
      { name: "Bridal & Party Makeup", image: "https://img.icons8.com/fluency/96/makeup.png" },
      { name: "Manicure & Pedicure Service", image: "https://img.icons8.com/fluency/96/nail-polish.png" },
      { name: "Relaxing Full Body Massage", image: "https://img.icons8.com/fluency/96/lotus.png" },
    ],
  },
  {
    name: "Car Care & Auto Repair",
    image: "https://img.icons8.com/fluency/96/car.png",
    subcategories: [
      { name: "Car Wash & Detailing", image: "https://img.icons8.com/fluency/96/car.png" },
      { name: "Engine & Mechanical Repair", image: "https://img.icons8.com/fluency/96/wrench.png" },
      { name: "Car AC Servicing & Gas Refill", image: "https://img.icons8.com/fluency/96/air-conditioner.png" },
      { name: "Car Battery Jumpstart & Replacement", image: "https://img.icons8.com/fluency/96/battery.png" },
    ],
  },
  {
    name: "Motorcycle & Bike Service",
    image: "https://img.icons8.com/fluency/96/motorcycle.png",
    subcategories: [
      { name: "General Bike Servicing", image: "https://img.icons8.com/fluency/96/motorcycle.png" },
      { name: "Engine Oil & Filter Change", image: "https://img.icons8.com/fluency/96/oil-industry.png" },
      { name: "Bike Foam Wash & Polish", image: "https://img.icons8.com/fluency/96/clean.png" },
      { name: "Brake & Tyre Maintenance", image: "https://img.icons8.com/fluency/96/tire.png" },
    ],
  },
  {
    name: "Computer & Laptop Repair",
    image: "https://img.icons8.com/fluency/96/laptop.png",
    subcategories: [
      { name: "Laptop Hardware & Display Fix", image: "https://img.icons8.com/fluency/96/laptop.png" },
      { name: "Desktop PC Assembly & Upgrade", image: "https://img.icons8.com/fluency/96/computer.png" },
      { name: "Windows & Software Troubleshooting", image: "https://img.icons8.com/fluency/96/windows-10.png" },
      { name: "Data Recovery & Virus Removal", image: "https://img.icons8.com/fluency/96/database.png" },
    ],
  },
  {
    name: "Smartphone & Gadget Repair",
    image: "https://img.icons8.com/fluency/96/smartphone.png",
    subcategories: [
      { name: "Mobile Screen & Touch Glass Fix", image: "https://img.icons8.com/fluency/96/smartphone.png" },
      { name: "Phone Battery Replacement", image: "https://img.icons8.com/fluency/96/battery.png" },
      { name: "Charging Port & Speaker Fix", image: "https://img.icons8.com/fluency/96/plug.png" },
      { name: "Tablet & iPad Repair", image: "https://img.icons8.com/fluency/96/ipad.png" },
    ],
  },
  {
    name: "Disinfection & Sanitization",
    image: "https://img.icons8.com/fluency/96/clean.png",
    subcategories: [
      { name: "Home Disinfection Fogging", image: "https://img.icons8.com/fluency/96/clean.png" },
      { name: "Office Sanitization Service", image: "https://img.icons8.com/fluency/96/cleaning-service.png" },
      { name: "Water Tank Sanitization", image: "https://img.icons8.com/fluency/96/tap.png" },
      { name: "Anti-Bacterial Surface Care", image: "https://img.icons8.com/fluency/96/soap.png" },
    ],
  },
  {
    name: "Sofa & Carpet Cleaning",
    image: "https://img.icons8.com/fluency/96/sofa.png",
    subcategories: [
      { name: "Fabric Sofa Shampoo Wash", image: "https://img.icons8.com/fluency/96/sofa.png" },
      { name: "Carpet & Rug Deep Cleaning", image: "https://img.icons8.com/fluency/96/vacuum-cleaner.png" },
      { name: "Mattress Steam Cleaning", image: "https://img.icons8.com/fluency/96/bed.png" },
      { name: "Dining Chair & Cushion Wash", image: "https://img.icons8.com/fluency/96/chair.png" },
    ],
  },
  {
    name: "Laundry & Dry Cleaning",
    image: "https://img.icons8.com/fluency/96/iron.png",
    subcategories: [
      { name: "Steam Ironing Service", image: "https://img.icons8.com/fluency/96/iron.png" },
      { name: "Premium Dry Cleaning", image: "https://img.icons8.com/fluency/96/clothes.png" },
      { name: "Wash & Fold Laundry", image: "https://img.icons8.com/fluency/96/washing-machine.png" },
      { name: "Curtain & Blanket Cleaning", image: "https://img.icons8.com/fluency/96/curtains.png" },
    ],
  },
  {
    name: "Water Purifier & Filter",
    image: "https://img.icons8.com/fluency/96/tap.png",
    subcategories: [
      { name: "RO Water Purifier Installation", image: "https://img.icons8.com/fluency/96/tap.png" },
      { name: "Filter Candle Replacement", image: "https://img.icons8.com/fluency/96/water.png" },
      { name: "Purifier Membrane & Motor Repair", image: "https://img.icons8.com/fluency/96/wrench.png" },
      { name: "TDS & Water Quality Check", image: "https://img.icons8.com/fluency/96/test-tube.png" },
    ],
  },
  {
    name: "Gas Stove & Geyser Repair",
    image: "https://img.icons8.com/fluency/96/water-heater.png",
    subcategories: [
      { name: "Gas Stove Cleaning & Burner Fix", image: "https://img.icons8.com/fluency/96/cooking-pot.png" },
      { name: "Gas Geyser Maintenance & Repair", image: "https://img.icons8.com/fluency/96/water-heater.png" },
      { name: "Gas Leakage Inspection", image: "https://img.icons8.com/fluency/96/gas-station.png" },
      { name: "Gas Pipe & Regulator Fitting", image: "https://img.icons8.com/fluency/96/plumbing.png" },
    ],
  },
  {
    name: "Generator & IPS Service",
    image: "https://img.icons8.com/fluency/96/battery.png",
    subcategories: [
      { name: "IPS & Inverter Repair", image: "https://img.icons8.com/fluency/96/battery.png" },
      { name: "IPS Battery Refill & Check", image: "https://img.icons8.com/fluency/96/electrical.png" },
      { name: "Diesel Generator Servicing", image: "https://img.icons8.com/fluency/96/engine.png" },
      { name: "Automatic Transfer Switch (ATS) Fix", image: "https://img.icons8.com/fluency/96/plug.png" },
    ],
  },
  {
    name: "Interior Design & Decor",
    image: "https://img.icons8.com/fluency/96/interior-design.png",
    subcategories: [
      { name: "Modular Kitchen Designing", image: "https://img.icons8.com/fluency/96/cooking-pot.png" },
      { name: "False Ceiling & Lighting Decor", image: "https://img.icons8.com/fluency/96/light-on.png" },
      { name: "Wallpaper & Wall Paneling", image: "https://img.icons8.com/fluency/96/interior-design.png" },
      { name: "Full Apartment Interior Solution", image: "https://img.icons8.com/fluency/96/home.png" },
    ],
  },
  {
    name: "Gardening & Landscaping",
    image: "https://img.icons8.com/fluency/96/potted-plant.png",
    subcategories: [
      { name: "Rooftop Garden Setup", image: "https://img.icons8.com/fluency/96/potted-plant.png" },
      { name: "Lawn Mowing & Grass Trimming", image: "https://img.icons8.com/fluency/96/lawn-mower.png" },
      { name: "Plant Pruning & Pest Spray", image: "https://img.icons8.com/fluency/96/leaf.png" },
      { name: "Indoor Plant Care & Soil Change", image: "https://img.icons8.com/fluency/96/flower.png" },
    ],
  },
  {
    name: "Roof Waterproofing & Damp",
    image: "https://img.icons8.com/fluency/96/roofing.png",
    subcategories: [
      { name: "Roof Waterproof Chemical Coating", image: "https://img.icons8.com/fluency/96/roofing.png" },
      { name: "Wall Damp Treatment & Seepage Fix", image: "https://img.icons8.com/fluency/96/brick-wall.png" },
      { name: "Bathroom Leakage Sealing", image: "https://img.icons8.com/fluency/96/plumbing.png" },
      { name: "Basement Waterproofing", image: "https://img.icons8.com/fluency/96/paint-brush.png" },
    ],
  },
  {
    name: "Welding & Metal Fabrication",
    image: "https://img.icons8.com/fluency/96/maintenance.png",
    subcategories: [
      { name: "Iron Gate & Grill Welding", image: "https://img.icons8.com/fluency/96/maintenance.png" },
      { name: "Metal Staircase & Railing Repair", image: "https://img.icons8.com/fluency/96/drill.png" },
      { name: "Window Grill Fitting", image: "https://img.icons8.com/fluency/96/window.png" },
      { name: "Steel Structure Fabrication", image: "https://img.icons8.com/fluency/96/hammer.png" },
    ],
  },
  {
    name: "Glass & Window Installation",
    image: "https://img.icons8.com/fluency/96/window.png",
    subcategories: [
      { name: "Thai Aluminum Sliding Window", image: "https://img.icons8.com/fluency/96/window.png" },
      { name: "Tempered Glass Partition", image: "https://img.icons8.com/fluency/96/door.png" },
      { name: "Mirror & Glass Shelf Fitting", image: "https://img.icons8.com/fluency/96/interior-design.png" },
      { name: "Broken Window Glass Replacement", image: "https://img.icons8.com/fluency/96/hammer.png" },
    ],
  },
  {
    name: "Lock & Key Services",
    image: "https://img.icons8.com/fluency/96/lock.png",
    subcategories: [
      { name: "Smart Digital Door Lock Setup", image: "https://img.icons8.com/fluency/96/lock.png" },
      { name: "Lock Jam & Emergency Key Unlocking", image: "https://img.icons8.com/fluency/96/key.png" },
      { name: "Master Key & Duplicate Key Making", image: "https://img.icons8.com/fluency/96/key.png" },
      { name: "Wardrobe & Drawer Lock Fitting", image: "https://img.icons8.com/fluency/96/screwdriver.png" },
    ],
  },
  {
    name: "Kitchen Deep Cleaning",
    image: "https://img.icons8.com/fluency/96/cooking-pot.png",
    subcategories: [
      { name: "Kitchen Hood & Chimney Degreasing", image: "https://img.icons8.com/fluency/96/cooking-pot.png" },
      { name: "Gas Stove & Burner Deep Wash", image: "https://img.icons8.com/fluency/96/water-heater.png" },
      { name: "Kitchen Cabinet & Tile Cleaning", image: "https://img.icons8.com/fluency/96/cleaning-service.png" },
      { name: "Kitchen Sink & Drain Deodorizing", image: "https://img.icons8.com/fluency/96/tap.png" },
    ],
  },
  {
    name: "Pet Grooming & Care",
    image: "https://img.icons8.com/fluency/96/dog.png",
    subcategories: [
      { name: "Dog Bathing & Nail Trimming", image: "https://img.icons8.com/fluency/96/dog.png" },
      { name: "Cat Fur Grooming & Haircut", image: "https://img.icons8.com/fluency/96/cat.png" },
      { name: "Pet Tick & Flea Treatment", image: "https://img.icons8.com/fluency/96/clean.png" },
      { name: "Home Pet Sitting & Feeding", image: "https://img.icons8.com/fluency/96/fish.png" },
    ],
  },
  {
    name: "Solar Panel Installation",
    image: "https://img.icons8.com/fluency/96/solar-panel.png",
    subcategories: [
      { name: "Rooftop Solar Panel Setup", image: "https://img.icons8.com/fluency/96/solar-panel.png" },
      { name: "Solar Inverter & Battery Fix", image: "https://img.icons8.com/fluency/96/battery.png" },
      { name: "Solar Panel Cleaning & Maintenance", image: "https://img.icons8.com/fluency/96/clean.png" },
      { name: "Solar Water Heater Setup", image: "https://img.icons8.com/fluency/96/water-heater.png" },
    ],
  },
];

export async function runSeed() {
  console.log("=== SEEDING 30 CATEGORIES & 122 SUBCATEGORIES ===");

  // 1. Clear old subcategories
  await db.delete(subcategories);
  console.log("[1/4] Cleared old subcategories");

  // 2. Clear old categories
  await db.delete(categories);
  console.log("[2/4] Cleared old categories");

  // 3. Insert categories and subcategories
  let totalSubcategoriesCount = 0;
  let firstCategoryAcId: number | null = null;
  let firstSubcategoryAcId: number | null = null;
  let secondCategoryPlumbingId: number | null = null;
  let secondSubcategoryPlumbingId: number | null = null;

  for (let i = 0; i < SEED_DATA.length; i++) {
    const cat = SEED_DATA[i];

    // Insert category
    const [catResult] = await db.insert(categories).values({
      name: cat.name,
      image: cat.image,
    });

    const categoryId = Number(catResult.insertId);
    console.log(`[Category ${i + 1}/30] Inserted "${cat.name}" (ID: ${categoryId}) with icon: ${cat.image}`);

    if (i === 0) firstCategoryAcId = categoryId;
    if (i === 1) secondCategoryPlumbingId = categoryId;

    // Insert subcategories
    for (let j = 0; j < cat.subcategories.length; j++) {
      const sub = cat.subcategories[j];
      const [subResult] = await db.insert(subcategories).values({
        categoryId: categoryId,
        name: sub.name,
        image: sub.image,
      });

      const subId = Number(subResult.insertId);
      totalSubcategoriesCount++;

      if (i === 0 && j === 0) firstSubcategoryAcId = subId;
      if (i === 1 && j === 0) secondSubcategoryPlumbingId = subId;
    }
  }

  console.log(`[3/4] Successfully inserted 30 categories and ${totalSubcategoriesCount} subcategories!`);

  // 4. Update / link existing services to valid new categories & subcategories
  if (firstCategoryAcId && firstSubcategoryAcId) {
    await db
      .update(services)
      .set({
        categoryId: firstCategoryAcId,
        subcategoryId: firstSubcategoryAcId,
      })
      .where(eq(services.id, 1));
    console.log(`[4/4] Updated Service 1 to Category ${firstCategoryAcId}, Subcategory ${firstSubcategoryAcId}`);
  }

  if (secondCategoryPlumbingId && secondSubcategoryPlumbingId) {
    await db
      .update(services)
      .set({
        categoryId: secondCategoryPlumbingId,
        subcategoryId: secondSubcategoryPlumbingId,
      })
      .where(eq(services.id, 2));
    console.log(`[4/4] Updated Service 2 to Category ${secondCategoryPlumbingId}, Subcategory ${secondSubcategoryPlumbingId}`);
  }

  console.log("=== SEEDING COMPLETED SUCCESSFULLY! ===");
}

if (process.argv[1]?.includes("seedCategoriesAndSubcategories.ts")) {
  runSeed()
    .then(async () => {
      await poolConnection.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("Seed error:", err);
      await poolConnection.end();
      process.exit(1);
    });
}
