import { db } from '@/lib/db';

export async function POST(request) {
  const { username, password, email, userType } = await request.json();

  if (!username || !password) {
    return Response.json({ error: 'Username and password required' }, { status: 400 });
  }

  const existingUser = db.users.findByUsername(username);
  if (existingUser) {
    return Response.json({ error: 'Username already taken' }, { status: 400 });
  }

  if (email && db.users.findByEmail(email)) {
    return Response.json({ error: 'Email already registered' }, { status: 400 });
  }

  const user = db.users.create({
    username,
    password,
    email: email || null,
    userType: userType || 'farmer',
    totalCredits: 0,
  });

  return Response.json(
    { message: 'Registration successful', userId: user.id, userType: user.userType },
    { status: 201 }
  );
}
