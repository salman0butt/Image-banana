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

## OpenAI setup

Create a local environment file and add an OpenAI API key:

```bash
cp .env.example .env.local
```

Set `OPENAI_API_KEY` in `.env.local`. The app uses the Responses API with
`gpt-5.6` for web search and the `gpt-image-2` image-generation tool for edits.
The Search button enables a web-search pass before the image edit.
Image generation defaults to low quality and 1024x1024 output. Input-fidelity
settings are only configurable for image models before GPT Image 2; GPT Image 2
always processes image inputs at high fidelity. Override
`OPENAI_IMAGE_QUALITY` or `OPENAI_IMAGE_SIZE` when you need a more expensive
final render.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
