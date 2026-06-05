import bcrypt from "bcrypt";

export async function hash(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verify(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}