export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageColor: string;
  imageEmoji: string;
  badge?: string;
}

export const products: Product[] = [
  {
    id: "p1",
    name: "Linen Throw Blanket",
    description: "Stonewashed Belgian linen, deeply soft, generous size.",
    price: 89,
    category: "Home",
    imageColor: "#d8c9a3",
    imageEmoji: "🛋️",
    badge: "New",
  },
  {
    id: "p2",
    name: "Walnut Cutting Board",
    description: "Hand-finished single-piece hardwood, oiled.",
    price: 64,
    category: "Kitchen",
    imageColor: "#7a5230",
    imageEmoji: "🪵",
  },
  {
    id: "p3",
    name: "Ceramic Pour-Over",
    description: "Slow-drip brewer in matte stoneware.",
    price: 42,
    category: "Kitchen",
    imageColor: "#f0ece2",
    imageEmoji: "☕",
  },
  {
    id: "p4",
    name: "Brass Desk Lamp",
    description: "Adjustable arm with warm dimmable LED.",
    price: 159,
    category: "Lighting",
    imageColor: "#b08f5c",
    imageEmoji: "💡",
    badge: "Bestseller",
  },
  {
    id: "p5",
    name: "Leather Notebook",
    description: "Full-grain cover, 240 dot-grid pages.",
    price: 38,
    category: "Stationery",
    imageColor: "#3a2a20",
    imageEmoji: "📓",
  },
  {
    id: "p6",
    name: "Wool Felt Slippers",
    description: "Boiled wool with leather sole.",
    price: 72,
    category: "Home",
    imageColor: "#9a8866",
    imageEmoji: "🥿",
  },
  {
    id: "p7",
    name: "Espresso Tamper",
    description: "Solid steel, 58mm, walnut handle.",
    price: 48,
    category: "Kitchen",
    imageColor: "#222222",
    imageEmoji: "⚙️",
  },
  {
    id: "p8",
    name: "Linen Apron",
    description: "Adjustable cross-back straps, deep front pocket.",
    price: 56,
    category: "Kitchen",
    imageColor: "#a8a08d",
    imageEmoji: "🧺",
  },
];
