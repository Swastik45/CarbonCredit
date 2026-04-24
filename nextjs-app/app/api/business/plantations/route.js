import { db } from '@/lib/db';

export async function GET() {
  const verifiedPlantations = await db.plantations.findByStatus('verified');
  
  // Fetch farmer info for each plantation
  const plantationsWithFarmerInfo = await Promise.all(
    verifiedPlantations.map(async (plantation) => {
      try {
        // Try to get farmer info - if farmer_username exists, use it; otherwise try to fetch user
        if (plantation.farmer_username) {
          return {
            ...plantation,
            farmer_username: plantation.farmer_username,
          };
        }
        
        // If farmer_username not in database, try to fetch from user metadata
        const farmer = await db.users.findById(plantation.farmer_id);
        return {
          ...plantation,
          farmer_username: farmer?.user_metadata?.username || 'Farmer',
        };
      } catch (err) {
        return {
          ...plantation,
          farmer_username: 'Farmer',
        };
      }
    })
  );

  return Response.json(plantationsWithFarmerInfo);
}
