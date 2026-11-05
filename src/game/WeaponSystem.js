// Weapon and Equipment Definitions, Stats, and Logic

export const WEAPONS = {
  fists: {
    id: "fists",
    name: "Fists",
    category: "melee",
    icon: "👊",
    damage: 25,
    headshotMult: 1.5,
    range: 3.2,
    fireRate: 0.45,
    auto: false,
    magSize: Infinity,
    maxReserve: 0,
    reloadTime: 0,
    spread: 0,
    adsSpread: 0,
    recoil: 0,
    color: 0xd0a47e,
    desc: "Close quarters melee strikes"
  },
  m4a1: {
    id: "m4a1",
    name: "M4A1 Carbine",
    category: "ar",
    icon: "︻╦╤─",
    ammoType: "5.56mm",
    damage: 34,
    headshotMult: 2.2,
    range: 160,
    fireRate: 0.11,
    auto: true,
    magSize: 30,
    maxReserve: 180,
    reloadTime: 1.8,
    spread: 0.024,
    adsSpread: 0.005,
    recoil: 0.024,
    zoomFov: 50,
    color: 0x2d3436,
    desc: "Versatile, full-auto 5.56 assault rifle"
  },
  thompson: {
    id: "thompson",
    name: "Thompson SMG",
    category: "smg",
    icon: "︻╦═一",
    ammoType: ".45 ACP",
    damage: 23,
    headshotMult: 1.9,
    range: 80,
    fireRate: 0.08,
    auto: true,
    magSize: 40,
    maxReserve: 240,
    reloadTime: 1.5,
    spread: 0.042,
    adsSpread: 0.018,
    recoil: 0.016,
    zoomFov: 55,
    color: 0x3d352e,
    desc: "High rate of fire for close-quarters skirmishes"
  },
  shotgun: {
    id: "shotgun",
    name: "M870 Pump",
    category: "shotgun",
    icon: "︻デ═一",
    ammoType: "12 Gauge",
    damage: 18, // per pellet
    pellets: 8,
    headshotMult: 1.6,
    range: 38,
    fireRate: 0.82,
    auto: false,
    magSize: 6,
    maxReserve: 36,
    reloadTime: 2.4,
    spread: 0.088,
    adsSpread: 0.055,
    recoil: 0.065,
    zoomFov: 58,
    color: 0x48423b,
    desc: "Devastating 8-pellet buckshot spread at close range"
  },
  awm: {
    id: "awm",
    name: "AWM Sniper",
    category: "sniper",
    icon: "▄︻̷̿┻̿═━一",
    ammoType: ".300 Mag",
    damage: 125,
    headshotMult: 2.6,
    range: 320,
    fireRate: 1.35,
    auto: false,
    magSize: 5,
    maxReserve: 25,
    reloadTime: 2.8,
    spread: 0.045,
    adsSpread: 0.0006,
    recoil: 0.085,
    isSniper: true,
    zoomFov: 16, // 8x scope magnification
    color: 0x223528,
    desc: "Legendary bolt-action sniper rifle. 1-shot headshot kill"
  }
};

export const HELMETS = {
  1: { level: 1, name: "Motorcycle Helmet", reduction: 0.25, color: 0x4b5320 },
  2: { level: 2, name: "Tactical Helmet", reduction: 0.40, color: 0x2e3d30 },
  3: { level: 3, name: "Spetsnaz Lv.3 Helmet", reduction: 0.55, color: 0x1f2421 }
};

export const VESTS = {
  1: { level: 1, name: "Police Vest Lv.1", maxShield: 50, color: 0x3d4a54 },
  2: { level: 2, name: "Military Vest Lv.2", maxShield: 75, color: 0x2e382d },
  3: { level: 3, name: "Heavy Plate Carrier Lv.3", maxShield: 100, color: 0x1c1e20 }
};

export const MEDS = {
  bandage: {
    id: "bandage",
    name: "Bandage",
    healAmount: 15,
    maxCap: 75,
    useTime: 2.0,
    icon: "🩹",
    desc: "Heals 15 HP up to 75 HP"
  },
  medkit: {
    id: "medkit",
    name: "First Aid Kit",
    healAmount: 100,
    maxCap: 100,
    useTime: 4.0,
    icon: "✚",
    desc: "Fully restores HP to 100"
  },
  energyDrink: {
    id: "energyDrink",
    name: "Energy Drink",
    boostAmount: 40,
    useTime: 2.5,
    icon: "⚡",
    desc: "Boosts speed by 15% and regenerates health over time"
  }
};
