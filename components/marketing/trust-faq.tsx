import { Coins, Lock, Receipt, Server, ShieldCheck, XCircle } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MARKETING_GENERATION_MODES } from "@/lib/marketing";

type TrustFaqProps = {
  signupCredits: number;
};

const securityItems = [
  { title: "Secure sign-in", description: "Supabase SSR authentication refreshes sessions with server-managed cookies.", icon: Lock },
  { title: "Protected AI routes", description: "Application APIs require an authenticated identity instead of trusting browser state alone.", icon: Server },
  { title: "Account data boundaries", description: "Profile, wallet, and ledger access is constrained by Supabase Row Level Security policies.", icon: ShieldCheck },
  { title: "Server-controlled credits", description: "Generation charges and refunds are performed server-side through restricted credit mutations.", icon: Receipt },
  { title: "Signed image references", description: "The client receives signed, expiring image references rather than arbitrary provider file IDs.", icon: Coins },
  { title: "Request cancellation", description: "Active AI edit requests can be aborted from the editor, with failed or cancelled generation charges refunded.", icon: XCircle },
] as const;

export function SecurityAndFaq({ signupCredits }: TrustFaqProps) {
  const costs = MARKETING_GENERATION_MODES.map(
    (mode) => `${mode.label.replace("GPT Image 2 · ", "")} ${mode.creditCost} credits`,
  ).join(", ");

  const faq = [
    [
      "What is Image's Banana?",
      "Image's Banana is an AI image-editing workspace. You upload a source image, describe the change you want, and can use selection masks, references, model presets, filters, background removal, and expansion tools to refine the result.",
    ],
    [
      "How does AI image editing work?",
      "The source image is uploaded and normalized server-side. Your edit instruction, selected preset, and optional mask or reference files are then sent through protected AI endpoints. The generated result returns to the editor so you can continue iterating.",
    ],
    [
      "Do I need design experience?",
      "No. The main workflow starts with plain-language instructions. Precision selection and brush tools are available when you want tighter control over the edited area.",
    ],
    [
      "What are credits?",
      `Credits are the usage unit for AI generations. ${signupCredits > 0 ? `The current configuration provisions ${signupCredits} signup credits for a new wallet.` : "A credit wallet is created for each account."} Charges are recorded in a server-controlled ledger.`,
    ],
    [
      "How many credits does an image generation cost?",
      `The current trusted presets are: ${costs}. The editor shows the selected cost before generation, and the server resolves the same preset configuration when charging credits.`,
    ],
    [
      "Can I cancel a generation?",
      "Yes. The editor exposes a Cancel action while an edit is running. The request uses AbortController, and cancelled or failed generation charges are designed to be refunded idempotently.",
    ],
    [
      "What image formats are supported?",
      "The source uploader accepts image files and the server decodes supported images with Sharp, rotates them correctly, and normalizes them to PNG. Unsupported or corrupt files are rejected. Source uploads are limited to 50 MB; reference images or PDFs are limited to 20 MB each, with up to five references.",
    ],
    [
      "Do I need a credit card to start?",
      "No. The current registration flow does not collect payment details, and live subscription payments are not implemented yet. You can create an account and use the signup-credit flow without a checkout.",
    ],
    [
      "Can I use Image's Banana on mobile?",
      "The public homepage and authentication flows are responsive. The current editor is optimized for medium and larger screens, and some precision tool controls are intentionally hidden on smaller screens, so desktop or tablet is recommended for the full editing workflow.",
    ],
    [
      "Are my uploaded images secure?",
      "The application uses authenticated API routes, server-side validation, signed expiring image references, and protected account data. It does not claim certifications such as SOC 2 or GDPR compliance that are not documented in the project.",
    ],
  ] as const;

  return (
    <>
      <section className="border-y border-zinc-900 bg-zinc-900/20 px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-400">Security</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">Built with privacy and security in mind</h2>
            <p className="mt-4 text-base leading-7 text-zinc-400">
              The current architecture protects user identity, account data, generation pricing, and provider-facing image references without making unsupported compliance claims.
            </p>
          </div>
          <div className="mt-10 grid gap-x-8 gap-y-7 md:grid-cols-2 lg:grid-cols-3">
            {securityItems.map(({ title, description, icon: Icon }) => (
              <article key={title} className="flex gap-4">
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-yellow-400">
                  <Icon className="size-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-200">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-zinc-500">{description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-400">FAQ</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">Questions before your first edit</h2>
            <p className="mt-4 text-base leading-7 text-zinc-400">Answers are based on the product's current behavior and limits, not future marketing promises.</p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faq.map(([question, answer], index) => (
              <AccordionItem key={question} value={`faq-${index}`} className="border-zinc-800">
                <AccordionTrigger className="py-5 text-left text-base text-zinc-200 hover:text-yellow-300 hover:no-underline">
                  {question}
                </AccordionTrigger>
                <AccordionContent className="max-w-3xl pb-5 text-sm leading-7 text-zinc-500">
                  {answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </>
  );
}
