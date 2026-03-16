import { SetupForm } from "@/components/SetupForm";

export default function HomePage() {
  return (
    <div>
      <div className="mb-12 text-center">
        <h1 className="font-heading text-4xl sm:text-5xl font-normal">
          PromptLoop
        </h1>
        <p className="mt-3 text-text-muted">
          Autonomous prompt optimization
        </p>
      </div>
      <SetupForm />
    </div>
  );
}
