import type { Session, User } from 'better-auth';

export interface AuthSession {
  session: Session;
  user: User;
}
