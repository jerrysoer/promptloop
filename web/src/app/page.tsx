import { SetupForm } from "@/components/SetupForm";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">PromptLoop</h1>
        <p className="mt-1 text-sm text-muted">
          Autonomous prompt optimizer. Configure your run below.
        </p>
      </div>
      <SetupForm />
    </div>
  );
}
