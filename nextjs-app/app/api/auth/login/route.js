import { db } from '@/lib/db';

export async function POST(request) {
  const { username, password, userType } = await request.json();

  if (!username || !password) {
    return Response.json({ error: 'Username and password required' }, { status: 400 });
  }

  const user = db.users.findByUsername(username);
  if (!user || user.password !== password) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  return Response.json({
    message: 'Login successful',
    userId: user.id,
    userType: user.userType,
    username: user.username,
  });
}
