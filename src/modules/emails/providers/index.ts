import type { IMailProvider, MailProvider } from "./types";
import { GmailProvider } from "./gmail";

const providers: Record<MailProvider, IMailProvider> = {
  google_gmail: new GmailProvider(),
};

export function getProvider(providerKey: string): IMailProvider {
  const provider = providers[providerKey as MailProvider];
  if (!provider) {
    throw new Error(`Unsupported mail provider: "${providerKey}"`);
  }
  return provider;
}

export type { MailProvider, IMailProvider, RawEmail, SendEmailInput, SyncResult } from "./types";
