export type VehicleCategory = "suv" | "truck" | "sedan" | "hybrid" | "luxury";

export interface Vehicle {
  id: string;
  name: string;
  category: VehicleCategory;
  price: number;
  mpg: string;
  highlights: string[];
  safety: string[];
}

export const VEHICLES: Vehicle[] = [
  {
    id: "vm-suv-apex",
    name: "ApexTrail X7 SUV",
    category: "suv",
    price: 42990,
    mpg: "28 city / 33 hwy",
    highlights: ["3-row seating", "Panoramic roof", "Tow package"],
    safety: ["IIHS Top Safety Pick+", "Adaptive cruise", "Blind spot assist"],
  },
  {
    id: "vm-hybrid-volt",
    name: "VoltLine Hybrid",
    category: "hybrid",
    price: 36990,
    mpg: "52 combined (est.)",
    highlights: ["Plug-in capable", "EV mode", "Heat pump HVAC"],
    safety: ["Forward collision warning", "Lane keep assist"],
  },
  {
    id: "vm-lux-night",
    name: "Nightline Prestige",
    category: "luxury",
    price: 58990,
    mpg: "24 city / 30 hwy",
    highlights: ["Premium leather", "Massage seats", "Air suspension"],
    safety: ["360 camera", "Night vision assist"],
  },
  {
    id: "vm-truck-ridge",
    name: "RidgeRunner Crew Cab",
    category: "truck",
    price: 47990,
    mpg: "19 city / 24 hwy",
    highlights: ["4x4", "Bedliner", "Trailer brake controller"],
    safety: ["Trailer sway control", "Rear cross traffic alert"],
  },
  {
    id: "vm-sedan-aria",
    name: "Aria Sport Sedan",
    category: "sedan",
    price: 32990,
    mpg: "31 city / 40 hwy",
    highlights: ["Sport tuned suspension", "Wireless CarPlay"],
    safety: ["Automatic emergency braking", "Driver attention monitor"],
  },
  {
    id: "vm-suv-family",
    name: "FamilyHaul 8",
    category: "suv",
    price: 39990,
    mpg: "22 city / 29 hwy",
    highlights: ["8-passenger", "Sliding 2nd row", "Built-in vac"],
    safety: ["Rear occupant alert", "Rear seatbelt reminder"],
  },
];

export function getVehicle(id: string): Vehicle | undefined {
  return VEHICLES.find((v) => v.id === id);
}
