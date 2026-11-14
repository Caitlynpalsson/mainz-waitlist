import type { Repo } from "./repo.ts";
import type { NewFarmer } from "./types.ts";

export interface SampleProduct {
  name: string;
  unit: string;
  defaultPriceCents: number;
}

export interface SampleFarm {
  farmName: string;
  contactName: string;
  phone: string;
  email: string;
  preferredContactTimes: string;
  pickupLocation: string;
  pickupAvailability: string;
  notes: string;
  products: SampleProduct[];
}

const NOTE = "sample farm for the simulator. not a real farm.";

/** Fake farms only. Keep these names in migrations/0002_seed.sql as well. */
export const SAMPLE_FARMS: SampleFarm[] = [
  {
    farmName: "Sample Orchard",
    contactName: "Sarah (sample)",
    phone: "555-010-1001",
    email: "sarah.sample@example.com",
    preferredContactTimes: "weekday mornings",
    pickupLocation: "sample dock A",
    pickupAvailability: "thu 8-11am",
    notes: NOTE,
    products: [
      { name: "strawberries", unit: "box", defaultPriceCents: 600 },
      { name: "peaches", unit: "box", defaultPriceCents: 500 },
    ],
  },
  {
    farmName: "Sample Honey Co",
    contactName: "Sam (sample)",
    phone: "555-010-1002",
    email: "sam.sample@example.com",
    preferredContactTimes: "afternoons",
    pickupLocation: "sample dock B",
    pickupAvailability: "thu 8-11am",
    notes: NOTE,
    products: [{ name: "honey", unit: "jar", defaultPriceCents: 1400 }],
  },
  {
    farmName: "Sample Greens",
    contactName: "Sky (sample)",
    phone: "555-010-1003",
    email: "sky.sample@example.com",
    preferredContactTimes: "evenings",
    pickupLocation: "sample stall 3",
    pickupAvailability: "fri 7-10am",
    notes: NOTE,
    products: [{ name: "greens", unit: "bag", defaultPriceCents: 500 }],
  },
  {
    farmName: "Sample Dairy",
    contactName: "Drew (sample)",
    phone: "555-010-1004",
    email: "drew.sample@example.com",
    preferredContactTimes: "mornings",
    pickupLocation: "sample cooler 1",
    pickupAvailability: "thu 6-9am",
    notes: NOTE,
    products: [
      { name: "milk", unit: "gallon", defaultPriceCents: 800 },
      { name: "eggs", unit: "dozen", defaultPriceCents: 700 },
    ],
  },
  {
    farmName: "Sample Grain",
    contactName: "Quinn (sample)",
    phone: "555-010-1005",
    email: "quinn.sample@example.com",
    preferredContactTimes: "midday",
    pickupLocation: "sample dock C",
    pickupAvailability: "fri 9am-12pm",
    notes: NOTE,
    products: [{ name: "flour", unit: "bag", defaultPriceCents: 900 }],
  },
];

export async function seedSamples(repo: Repo, at: string): Promise<void> {
  for (const sample of SAMPLE_FARMS) {
    const farmer = await repo.insertFarmer(sampleFarmer(sample, at), at);
    for (const product of sample.products) {
      await repo.insertProduct({ ...product, farmerId: farmer.id }, at);
    }
  }
}

function sampleFarmer(sample: SampleFarm, at: string): NewFarmer {
  return {
    farmName: sample.farmName,
    contactName: sample.contactName,
    phone: sample.phone,
    email: sample.email,
    preferredContactTimes: sample.preferredContactTimes,
    pickupLocation: sample.pickupLocation,
    pickupAvailability: sample.pickupAvailability,
    smsConsent: "granted",
    smsConsentAt: at,
    smsConsentSource: "sample seed",
    assignedStaff: "",
    automationPaused: false,
    isSample: true,
    notes: sample.notes,
  };
}
