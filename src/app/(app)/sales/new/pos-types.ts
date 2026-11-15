export type PosProduct = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  categoryId: string | null;
  price: number;
  sellableKg: number;
  nearestExpiry: string | null;
  imageUrl: string | null;
};

export type CartLine = {
  key: string;
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  locationId: string;
  locationName: string;
  expiryDate: string;
  kosherBodyId: string;
  kosherBodyName: string;
  qtyKg: number;
  packages: number;
  pricePerKg: number;
  discount: number;
};

export type Option = { value: string; label: string };
