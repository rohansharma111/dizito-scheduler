export default function HowItWorksPage() {
  const steps = [
    "Connect accounts",
    "Create content",
    "Choose platforms",
    "Schedule posts",
    "Automatic publishing",
  ];

  return (
    <main className="max-w-5xl mx-auto py-20 px-6">
      <h1 className="text-5xl font-bold text-center mb-16">How Dizito Works</h1>

      <div className="space-y-10">
        {steps.map((step, index) => (
          <div key={step} className="bg-white border rounded-xl p-8">
            <div className="text-blue-600 font-bold">Step {index + 1}</div>

            <div className="text-2xl mt-2">{step}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
