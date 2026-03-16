import { LandingHero } from "@/components/LandingHero";
import { HowItWorks } from "@/components/HowItWorks";
import { SetupForm } from "@/components/SetupForm";

export default function HomePage() {
  return (
    <div>
      <LandingHero />
      <HowItWorks />
      <div className="border-b border-border my-12" />
      <div id="setup">
        <SetupForm />
      </div>
    </div>
  );
}
