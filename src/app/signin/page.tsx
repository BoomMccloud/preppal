import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import SignInForm from "./_components/SignInForm";

export default async function SignInPage() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary">
      <div className="max-w-md w-full bg-secondary/50 backdrop-blur-sm rounded-lg p-8 border border-secondary-text/10">
        <h1 className="text-3xl font-bold text-accent text-center mb-8">
          Sign In to PrepPal
        </h1>
        <SignInForm />
      </div>
    </div>
  );
}