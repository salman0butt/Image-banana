import Image from "next/image";
import {
  Brush,
  Coins,
  History,
  ImageIcon,
  Maximize,
  MessageSquare,
  Paperclip,
  Sparkles,
  Square,
  XCircle,
} from "lucide-react";

const benefits = [
  "Prompt-based AI editing",
  "Precision masks",
  "Reference files",
  "Cancellable generations",
  "Server-trusted model presets",
  "Credit-based usage",
] as const;

const features = [
  {
    title: "Describe the edit",
    description: "Write the change in plain language, then keep refining the generated result from the same workspace.",
    icon: MessageSquare,
  },
  {
    title: "Edit only what matters",
    description: "Use rectangle selection, brush, and eraser controls to build a mask for targeted image changes.",
    icon: Brush,
  },
  {
    title: "Bring visual context",
    description: "Attach up to five supported image or PDF references to guide an edit with additional context.",
    icon: Paperclip,
  },
  {
    title: "Choose the generation mode",
    description: "Pick from server-controlled Fast, Balanced, and Quality presets with the credit cost shown before you generate.",
    icon: Sparkles,
  },
  {
    title: "Stay in control",
    description: "Cancel an active AI generation instead of waiting for a request you no longer need.",
    icon: XCircle,
  },
  {
    title: "Move through your session",
    description: "Undo, redo, and browse a bounded in-memory edit history while you work on the current image.",
    icon: History,
  },
] as const;

const tools = [
  { title: "AI Edit", description: "Natural-language image changes.", icon: Sparkles },
  { title: "Selection & Brush", description: "Target a specific region with masks.", icon: Square },
  { title: "Background Removal", description: "Ask AI to isolate the main subject.", icon: ImageIcon },
  { title: "AI Filters", description: "Built-in Toonify, Ghibli, Cyberpunk, and Oil Painting prompts.", icon: Brush },
  { title: "Canvas Expansion", description: "Extend compositions into supported aspect ratios.", icon: Maximize },
  { title: "Reference Files", description: "Add images or PDFs for extra context.", icon: Paperclip },
  { title: "Model Presets", description: "Choose Fast, Balanced, or Quality modes.", icon: Coins },
  { title: "Cloud History", description: "Persistent generation jobs and assets are planned, not live yet.", icon: History, comingSoon: true },
] as const;

const steps = [
  { number: "01", title: "Upload", description: "Choose the image you want to transform. It is previewed immediately while the source uploads." },
  { number: "02", title: "Describe", description: "Tell Image's Banana what should change. Add a mask or reference files when the edit needs more direction." },
  { number: "03", title: "Create", description: "Choose a generation preset, see its credit cost, generate, and continue refining the result." },
] as const;

const useCases = [
  ["Content creators", "Turn a source image into new visual directions without rebuilding the composition from scratch."],
  ["E-commerce", "Explore product-background and presentation changes for creative iteration."],
  ["Designers", "Test concepts, styles, crops, and expansions quickly before committing to a direction."],
  ["Marketing teams", "Create visual variants for campaign exploration with natural-language instructions."],
  ["Social content", "Adapt images to different visual styles and supported aspect ratios from one editor."],
  ["Everyday creators", "Make targeted edits without learning a complex desktop image-editing workflow first."],
] as const;

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-400">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-zinc-400">{description}</p>
    </div>
  );
}

export function BenefitsStrip() {
  return (
    <section aria-label="Product benefits" className="border-b border-zinc-900 bg-zinc-950">
      <div className="mx-auto grid max-w-7xl gap-px border-x border-zinc-900 bg-zinc-900 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {benefits.map((benefit) => (
          <div key={benefit} className="flex min-h-16 items-center gap-2 bg-zinc-950 px-4 py-3 text-sm text-zinc-400">
            <span className="size-1.5 shrink-0 rounded-full bg-yellow-400" aria-hidden="true" />
            {benefit}
          </div>
        ))}
      </div>
    </section>
  );
}

export function FeaturesAndTools() {
  return (
    <>
      <section id="features" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Features"
            title="Everything you need to transform an image"
            description="The homepage reflects the editor that exists today: targeted masks, reference files, model presets, cancellation, credits, and session history are already part of the product."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ title, description, icon: Icon }) => (
              <article key={title} className="border-t border-zinc-800 bg-zinc-900/20 p-5 sm:p-6">
                <div className="flex size-10 items-center justify-center rounded-lg border border-yellow-400/20 bg-yellow-400/5 text-yellow-300">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-900/20 px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Workspace"
            title="One workspace. Multiple AI tools."
            description="Use focused editing controls without leaving the image canvas. Planned capabilities are labeled instead of being presented as available."
          />
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tools.map(({ title, description, icon: Icon, ...tool }) => (
              <article key={title} className="min-h-44 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                <div className="flex items-start justify-between gap-3">
                  <Icon className="size-5 text-yellow-400" aria-hidden="true" />
                  {"comingSoon" in tool && tool.comingSoon ? (
                    <span className="rounded-full border border-zinc-700 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">Coming Soon</span>
                  ) : null}
                </div>
                <h3 className="mt-7 font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function TransformationShowcase() {
  const previews = [
    { src: "/filters/cyberpunk.png", label: "Cyberpunk" },
    { src: "/filters/ghibli.png", label: "Ghibli Studio" },
    { src: "/filters/oilpainting.png", label: "Oil Painting" },
  ] as const;

  return (
    <section className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Transformation"
          title="See how a source can move in a new direction"
          description="These are product assets used by the editor's built-in style presets. They illustrate creative directions rather than promising an identical result for every source image."
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-[1.05fr_1.95fr]">
          <figure className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
            <div className="relative aspect-[4/3]">
              <Image src="/image.jpg" alt="Example source image" fill sizes="(max-width: 1024px) 100vw, 35vw" className="object-cover" />
            </div>
            <figcaption className="border-t border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-300">Before · Example source</figcaption>
          </figure>
          <div className="grid gap-4 sm:grid-cols-3">
            {previews.map((preview) => (
              <figure key={preview.label} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
                <div className="relative aspect-[4/3] sm:aspect-[3/4] lg:aspect-[4/5]">
                  <Image src={preview.src} alt={`${preview.label} built-in style preview`} fill sizes="(max-width: 640px) 100vw, 22vw" className="object-cover" />
                </div>
                <figcaption className="border-t border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-300">After direction · {preview.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 border-y border-zinc-900 bg-zinc-900/20 px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="How it works"
          title="Upload. Describe. Create."
          description="The core flow stays simple even when you need precise masks, references, or a higher-quality generation preset."
        />
        <ol className="mt-12 grid gap-8 lg:grid-cols-3">
          {steps.map((step) => (
            <li key={step.number} className="relative border-l border-zinc-800 pl-5">
              <span className="font-mono text-sm text-yellow-400">{step.number}</span>
              <h3 className="mt-4 text-xl font-semibold text-zinc-100">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function UseCases() {
  return (
    <section className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Use cases"
          title="Built for modern creative workflows"
          description="Image's Banana is useful anywhere the job starts with an existing image and a clear idea for what should change."
        />
        <div className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
          {useCases.map(([title, description]) => (
            <article key={title}>
              <h3 className="font-semibold text-zinc-200">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
