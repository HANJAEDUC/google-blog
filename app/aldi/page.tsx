import fs from 'fs';
import path from 'path';
import AldiClient from './AldiClient';

// Type definition for the product
interface AldiProduct {
  brand: string | null;
  title: string | null;
  price: string | null;
  originalPrice: string | null;
  imageUrl: string | null;
  link: string | null;
}

interface AldiData {
  offerPeriod: string;
  lastUpdated: string;
  products: AldiProduct[];
}

export const revalidate = 60; // Revalidate every minute

export default async function AldiPage() {
  let data: AldiData = {
    offerPeriod: '',
    lastUpdated: new Date().toISOString(),
    products: []
  };

  try {
    const filePath = path.join(process.cwd(), 'scripts', 'aldi_offers.json');
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const parsedData = JSON.parse(fileContent);
      
      if (Array.isArray(parsedData)) {
        data.products = parsedData;
      } else {
        data = parsedData;
      }
    }
  } catch (error) {
    console.error("Error reading Aldi data:", error);
  }

  return <AldiClient initialData={data} />;
}
