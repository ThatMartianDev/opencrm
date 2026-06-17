
# Emails Module

## Overview

The Emails module is responsible for:
- Syncing emails from connected providers.
- Displaying and querying emails for the UI.
- Sending emails through the active provider.
- Auto-linking emails to CRM contacts based on addresses.
- Keeping provider-specific logic modular and isolated.

## File Structure

- `/components`
    UI components for Emails pages and compose/preview experiences.

- `/providers`
    Provider abstraction and implementations.
    - `types.ts`: shared provider contracts and email data shapes.
    - `index.ts`: provider registry and resolver (`getProvider`).
    - `gmail.ts`: Gmail-specific implementation of provider methods.

- `actions.ts`
    Server actions that validate auth context and call service methods.

- `service.ts`
    Core Emails business logic:
    - token validation/refresh
    - sync and upsert to DB
    - send flow and immediate post-send sync
    - thread fetch
    - read/archive/trash operations
    - CRM linking helpers

- `EmailsPage`
    Main module entry in the app layer.

## Key Flows

### 1. Mail Sync

1. Resolve provider from connected account.
2. Fetch emails (incremental if sync cursor exists, otherwise full sync).
3. Upsert emails in the database.
4. Persist the next sync cursor.
5. Auto-link unlinked emails to contacts.

### 2. Send Email

1. Send through provider.
2. Fetch recent provider messages.
3. Match the sent provider message id.
4. Upsert sent message into the local DB.
5. Auto-link to CRM contacts when possible.

## Notes

- The service layer remains provider-agnostic by depending on provider interfaces.
- Adding a new provider only requires implementing the provider contract and registering it in the provider index.

## Future additions:
- CC, BCC handling
- Attachment handling (uploading from local device, drive or files saved in the workspace)