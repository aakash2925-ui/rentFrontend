import LoginForm from "@/components/forms/LoginForm";

export default function LoginPage() {
  return (
    <main className="relative overflow-hidden px-4 py-12 sm:py-16">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_15%,rgba(168,85,247,0.22),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(217,70,239,0.16),transparent_26%),linear-gradient(135deg,rgba(250,245,255,0.96),rgba(255,255,255,0.92))] dark:bg-[radial-gradient(circle_at_20%_15%,rgba(168,85,247,0.22),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(217,70,239,0.18),transparent_26%),linear-gradient(135deg,#10071d,#1a0b30)]" />
      <LoginForm />
    </main>
  );
}
