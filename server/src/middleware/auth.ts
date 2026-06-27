import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/** Em produção, JWT_SECRET deve ser definido em server/.env. */
const JWT_SECRET = process.env.JWT_SECRET ?? 'abdoria-dev-secret-change-in-production';

export interface AuthRequest extends Request {
  userId?: string;
}

/** Gera token JWT com o ID do usuário no claim `sub`. */
export function signToken(userId: string): string {
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '7d';
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

/** Valida Bearer token e injeta `userId` na requisição. */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Autenticação necessária.' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

/** Injeta userId quando há token válido; segue sem autenticar se ausente/inválido. */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    next();
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    req.userId = payload.sub;
  } catch {
    /* convidado / token expirado — catálogo base */
  }
  next();
}

export { JWT_SECRET };
