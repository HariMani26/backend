/* eslint-disable no-console */

import { DistrictModel } from "@models/District.model";
import { KulamModel } from "@models/Kulam.model";
import { KulamCompatibilityModel } from "@models/KulamCompatibility.model";
import { MembershipPlanModel } from "@models/MembershipPlan.model";

export const TN_DISTRICTS: Array<{ name: string; nameTa: string }> = [
  { name: "Chennai", nameTa: "சென்னை" },
  { name: "Coimbatore", nameTa: "கோயம்புத்தூர்" },
  { name: "Madurai", nameTa: "மதுரை" },
  { name: "Tiruchirappalli", nameTa: "திருச்சிராப்பள்ளி" },
  { name: "Salem", nameTa: "சேலம்" },
  { name: "Tirunelveli", nameTa: "திருநெல்வேலி" },
  { name: "Tiruppur", nameTa: "திருப்பூர்" },
  { name: "Erode", nameTa: "ஈரோடு" },
  { name: "Vellore", nameTa: "வேலூர்" },
  { name: "Thoothukudi", nameTa: "தூத்துக்குடி" },
  { name: "Dindigul", nameTa: "திண்டுக்கல்" },
  { name: "Thanjavur", nameTa: "தஞ்சாவூர்" },
  { name: "Kanchipuram", nameTa: "காஞ்சிபுரம்" },
  { name: "Cuddalore", nameTa: "கடலூர்" },
  { name: "Tiruvannamalai", nameTa: "திருவண்ணாமலை" },
  { name: "Namakkal", nameTa: "நாமக்கல்" },
  { name: "Karur", nameTa: "கரூர்" },
  { name: "Nagapattinam", nameTa: "நாகப்பட்டினம்" },
  { name: "Viluppuram", nameTa: "விழுப்புரம்" },
  { name: "Pudukkottai", nameTa: "புதுக்கோட்டை" },
  { name: "Ramanathapuram", nameTa: "ராமநாதபுரம்" },
  { name: "Sivagangai", nameTa: "சிவகங்கை" },
  { name: "Virudhunagar", nameTa: "விருதுநகர்" },
  { name: "Theni", nameTa: "தேனி" },
  { name: "Krishnagiri", nameTa: "கிருஷ்ணகிரி" },
  { name: "Dharmapuri", nameTa: "தருமபுரி" },
  { name: "Ariyalur", nameTa: "அரியலூர்" },
  { name: "Perambalur", nameTa: "பெரம்பலூர்" },
  { name: "Nilgiris", nameTa: "நீலகிரி" },
  { name: "Kanyakumari", nameTa: "கன்னியாகுமரி" },
  { name: "Tiruvallur", nameTa: "திருவள்ளூர்" },
  { name: "Chengalpattu", nameTa: "செங்கல்பட்டு" },
  { name: "Ranipet", nameTa: "ராணிப்பேட்டை" },
  { name: "Tirupathur", nameTa: "திருப்பத்தூர்" },
  { name: "Kallakurichi", nameTa: "கள்ளக்குறிச்சி" },
  { name: "Tenkasi", nameTa: "தென்காசி" },
  { name: "Mayiladuthurai", nameTa: "மயிலாடுதுறை" },
];

// Confirmed with product owner as the canonical 12 Kulams (registration-form list).
const KULAMS: Array<{ valueEn: string; labelEn: string; labelTa: string }> = [
  { valueEn: "dheppalu", labelEn: "Dheppalu", labelTa: "தெப்பலு" },
  { valueEn: "orsulu", labelEn: "Orsulu", labelTa: "ஒர்சுலு" },
  { valueEn: "aalukuttalu", labelEn: "Aalukuttalu", labelTa: "ஆளுகுட்டலு" },
  {
    valueEn: "ponnanipullu",
    labelEn: "Ponnanipullu",
    labelTa: "பொன்னானிப்புள்ளு",
  },
  { valueEn: "mannarbullu", labelEn: "Mannarbullu", labelTa: "மண்ணார்புள்ளு" },
  { valueEn: "pattukottalu", labelEn: "Pattukottalu", labelTa: "பட்டுகோட்டலு" },
  {
    valueEn: "puruvalapullu",
    labelEn: "Puruvalapullu",
    labelTa: "புருவலபுள்ளு",
  },
  { valueEn: "manchalu", labelEn: "Manchalu", labelTa: "மஞ்சலு" },
  { valueEn: "kachaipullu", labelEn: "Kachaipullu", labelTa: "கச்சால்புள்ளு" },
  {
    valueEn: "koththiparanki",
    labelEn: "Koththiparanki",
    labelTa: "கொத்திபரங்கி",
  },
  { valueEn: "seelajanaru", labelEn: "Seelajanaru", labelTa: "சீலஜானாரு" },
  { valueEn: "ilakkimanu", labelEn: "Ilakkimanu", labelTa: "இளக்கிமானு" },
];

export function buildPlaceholderCompatibilityMatrix(): Array<{
  kulam: string;
  excellent: string[];
  good: string[];
  average: string[];
  avoid: string[];
}> {
  const values = KULAMS.map((k) => k.valueEn);
  const n = values.length;
  const at = (i: number, offset: number) => values[(i + offset) % n];

  return values.map((kulam, i) => ({
    kulam,
    excellent: [at(i, 1), at(i, 2), at(i, 3)],
    good: [at(i, 4), at(i, 5), at(i, 6)],
    average: [at(i, 7), at(i, 8)],
    // same-kulam pairing is traditionally avoided, hence self + 3 rotated others
    avoid: [kulam, at(i, 9), at(i, 10), at(i, 11)],
  }));
}

export async function seedDistricts(): Promise<void> {
  for (const district of TN_DISTRICTS) {
    await DistrictModel.updateOne(
      { name: district.name, state: "Tamil Nadu" },
      { $set: { ...district, state: "Tamil Nadu" } },
      { upsert: true },
    );
  }
  console.log(`✅ Seeded ${TN_DISTRICTS.length} districts`);
}

export async function seedKulams(): Promise<void> {
  for (const kulam of KULAMS) {
    await KulamModel.updateOne(
      { valueEn: kulam.valueEn },
      { $set: kulam },
      { upsert: true },
    );
  }
  console.log(`✅ Seeded ${KULAMS.length} kulams`);
}

export async function seedKulamCompatibility(): Promise<void> {
  const matrix = buildPlaceholderCompatibilityMatrix();
  for (const entry of matrix) {
    await KulamCompatibilityModel.updateOne(
      { kulam: entry.kulam },
      { $set: entry },
      { upsert: true },
    );
  }
  console.log(
    `⚠️  Seeded ${matrix.length} PLACEHOLDER kulam-compatibility rows — replace with real data before go-live`,
  );
}

export async function seedMembershipPlans(): Promise<void> {
  await MembershipPlanModel.updateOne(
    { name: "Standard" },
    {
      $setOnInsert: {
        name: "Standard",
        priceInr: 20,
        durationDays: 90,
        features: [
          "Full search access",
          "View permitted photos and contact details after verification",
          "Send unlimited interests",
          "WhatsApp contact when shared by the member",
        ],
        isActive: true,
      },
    },
    { upsert: true },
  );
  console.log("✅ Seeded membership plan");
}
