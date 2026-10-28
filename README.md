This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Authorization boundaries

- Owners and admins can invite admins, managers, and members. Managers can only
  invite members. Invitations and role changes cannot grant the owner role.
- File listing/search scopes accept only CRM entity IDs; workspace and folder
  constraints cannot be overridden by client-supplied query properties.
- Contact, company, and deal field updates validate editable field names and
  values at runtime, and keep writes scoped to the authenticated workspace.

## Deployment

### AI service authentication

Configure `AI_SERVICE_URL` on the Next.js server and set
`AI_SERVICE_AUTH_TOKEN` to the same random secret in both Next.js and the AI
service. Next.js sends it in a server-side Bearer authorization header and
refuses to call the service if it is missing or blank. Never expose the token
through a `NEXT_PUBLIC_` variable. The AI service refuses to start without it.
See the AI service README for generation, rotation, and network guidance.

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
