import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "~/server/auth";
import SignInForm from "./_components/SignInForm";

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await auth();
  const t = await getTranslations("auth");
  const { locale } = await params;

  if (session) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="bg-primary flex min-h-screen items-center justify-center">
      <div className="bg-secondary/50 border-secondary-text/10 w-full max-w-md rounded-lg border p-8 backdrop-blur-sm">
        <h1 className="text-accent mb-8 text-center text-3xl font-bold">
          {t("signInTitle")}
        </h1>
        <SignInForm />
      </div>
    </div>
  );
}
