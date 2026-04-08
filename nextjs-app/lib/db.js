
import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing Supabase environment variables. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
  );
}

const supabaseServer = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listAllAuthUsers() {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabaseServer.auth.admin.listUsers({ page, perPage: 100 });
    if (error) {
      throw new Error(error.message);
    }
    if (!data?.users?.length) break;

    users.push(...data.users);
    if (!data?.meta?.next_page) break;
    page += 1;
  }

  return users;
}

export const db = {
  users: {
    async findByUsername(username) {
      const allUsers = await listAllAuthUsers();
      return allUsers.find(
        (user) => user.user_metadata?.username?.toLowerCase() === username?.toLowerCase()
      );
    },

    async findByEmail(email) {
      const { data, error } = await supabaseServer.auth.admin.getUserByEmail(email);
      if (error) {
        if (error.message.includes('No user found')) return null;
        throw error;
      }
      return data.user;
    },

    async create(userData) {
      const { data, error } = await supabaseServer.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: {
          username: userData.username,
          userType: userData.userType || 'farmer',
        },
      });

      if (error) {
        throw error;
      }

      return data.user;
    },

    async findById(id) {
      const { data, error } = await supabaseServer.auth.admin.getUserById(id);
      if (error) {
        if (error.message.includes('No user found')) return null;
        throw error;
      }
      return data.user;
    },
  },

  plantations: {
    async create(data) {
      const { data: plantation, error } = await supabaseServer
        .from('plantations')
        .insert([{ ...data }])
        .select()
        .single();

      if (error) throw error;
      return plantation;
    },

    async update(id, data) {
      const { data: plantation, error } = await supabaseServer
        .from('plantations')
        .update({ ...data })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return plantation;
    },

    async all() {
      const { data, error } = await supabaseServer.from('plantations').select('*');
      if (error) throw error;
      return data;
    },

    async findByFarmerId(farmerId) {
      const { data, error } = await supabaseServer
        .from('plantations')
        .select('*')
        .eq('farmer_id', farmerId);
      if (error) throw error;
      return data;
    },

    async findByStatus(status) {
      const { data, error } = await supabaseServer
        .from('plantations')
        .select('*')
        .eq('status', status);
      if (error) throw error;
      return data;
    },

    async findById(id) {
      const { data, error } = await supabaseServer
        .from('plantations')
        .select('*')
        .eq('id', id)
        .single();
      if (error) return null;
      return data;
    },
  },

  purchases: {
    async create(data) {
      const { data: purchase, error } = await supabaseServer
        .from('purchases')
        .insert([{ ...data }])
        .select()
        .single();

      if (error) throw error;
      return purchase;
    },

    async findByBusinessId(businessId) {
      const { data, error } = await supabaseServer
        .from('purchases')
        .select('*')
        .eq('business_id', businessId);
      if (error) throw error;
      return data;
    },

    async all() {
      const { data, error } = await supabaseServer.from('purchases').select('*');
      if (error) throw error;
      return data;
    },
  },
};