const STEPS = [
  {
    number: 1,
    title: "Paste your prompt",
    description: "Start with any system prompt you want to improve.",
  },
  {
    number: 2,
    title: "AI mutates & scores",
    description: "The optimizer iteratively mutates your prompt and judges each variant.",
  },
  {
    number: 3,
    title: "Get optimized prompt",
    description: "See what changed, why it improved, and copy the result.",
  },
];

export function HowItWorks() {
  return (
    <section className="mb-12">
      <h2 className="font-heading text-2xl sm:text-3xl text-center mb-8">
        How it works
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {STEPS.map((step) => (
          <div key={step.number} className="text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white text-lg font-semibold">
              {step.number}
            </div>
            <h3 className="font-heading text-lg mb-1">{step.title}</h3>
            <p className="text-sm text-text-muted">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
