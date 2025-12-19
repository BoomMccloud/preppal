import { redirect } from "~/i18n/navigation";
import { auth } from "~/server/auth";
import SignInForm from "./_components/SignInForm";

export default async function SignInPage() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="bg-primary flex min-h-screen items-center justify-center">
      <div className="bg-secondary/50 border-secondary-text/10 w-full max-w-md rounded-lg border p-8 backdrop-blur-sm">
        <h1 className="text-accent mb-8 text-center text-3xl font-bold">
          Sign In to PrepPal
        </h1>
        <SignInForm />
      </div>
    </div>
  );
}
