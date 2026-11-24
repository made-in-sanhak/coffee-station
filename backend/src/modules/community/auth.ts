import type { Request } from 'express';
import { authenticatedUser } from '../../middlewares/requireAuth';
export interface Actor {
  id: string;
  nickname: string;
}
export async function actor(
  req: Request,
  required = false,
): Promise<Actor | null> {
  const u = await authenticatedUser(req, required);
  return u ? { id: String(u.id), nickname: u.nickname } : null;
}
