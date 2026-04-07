
// --- Authentication utilities ---
export function getAuthFromHeaders(headers) {
  const userId = headers.get('x-user-id');
  const userType = headers.get('x-user-type');
  return { userId: userId ? parseInt(userId) : null, userType };
}

// --- DATA PERSISTENCE (Global Singleton Fix) ---
const globalForDb = global;

const dbInstance = globalForDb.dbInstance || {
  users: [],
  plantations: [],
  purchases: [],
  nextUserId: 100, // Starting at 100 so Admin (ID: 1) is unique
  nextPlantationId: 1
};

if (process.env.NODE_ENV !== 'production') globalForDb.dbInstance = dbInstance;

export const db = {
  users: {
    // SPECIAL AUTH LOGIC
    authenticate(username, password) {
      // 1. Admin Bypass: If password is admin123, grant Admin access
      if (password === 'admin123') {
        return { 
          id: 1, 
          username: username || 'admin_root', 
          userType: 'admin', 
          email: 'admin@system.local' 
        };
      }

      // 2. Standard User Check
      const user = dbInstance.users.find(u => u.username === username);
      if (user && user.password === password) {
        return user;
      }
      return null;
    },

    create(userData) {
      const user = { id: dbInstance.nextUserId++, ...userData, createdAt: new Date() };
      dbInstance.users.push(user);
      return user;
    },

    findById(id) {
      if (id === 1) return { id: 1, username: 'admin', userType: 'admin' };
      return dbInstance.users.find(u => u.id === id);
    }
  },

  plantations: {
    create(data) {
      const plantation = { id: dbInstance.nextPlantationId++, ...data, createdAt: new Date() };
      dbInstance.plantations.push(plantation);
      return plantation;
    },
    update(id, data) {
      const plantation = dbInstance.plantations.find(p => p.id === id);
      if (plantation) Object.assign(plantation, data);
      return plantation;
    },
    all() {
      return dbInstance.plantations;
    },
    findByFarmerId(farmerId) {
      return dbInstance.plantations.filter(p => p.farmerId === farmerId);
    }
  },

  purchases: {
    create(data) {
      const purchase = { id: dbInstance.purchases.length + 1, ...data, createdAt: new Date() };
      dbInstance.purchases.push(purchase);
      return purchase;
    },
    findByBusinessId(businessId) {
      return dbInstance.purchases.filter(p => p.businessId === businessId);
    },
    all() {
      return dbInstance.purchases;
    }
  }
};