import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { AuthLayout } from "@/features/auth/AuthLayout";
import { useAuthStore } from "@/features/auth/auth-store";

const schema = z.object({
  fullName: z.string().min(1, "Enter your name."),
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
});

type RegisterValues = z.infer<typeof schema>;

export function RegisterPage() {
  const status = useAuthStore((state) => state.status);
  const registerAccount = useAuthStore((state) => state.register);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await registerAccount(values.fullName, values.email, values.password);
      toast.success("Account created.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to create the account.");
    }
  });

  return (
    <AuthLayout>
      <div className="card-shadow rounded-xl border border-line bg-surface p-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-ink-2">
          A crew admin can link you to a mission after registration.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
          <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message}>
            <Input
              id="fullName"
              autoComplete="name"
              placeholder="Amara Diallo"
              invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? "fullName-error" : undefined}
              {...register("fullName")}
            />
          </Field>

          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@astra.space"
              invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
          </Field>

          <Field
            label="Password"
            htmlFor="password"
            error={errors.password?.message}
            hint="At least 8 characters."
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Create a password"
              invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : "password-hint"}
              {...register("password")}
            />
          </Field>

          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-critical/20 bg-critical-soft px-3 py-2 text-xs leading-relaxed text-critical"
            >
              {formError}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <Spinner />
            ) : (
              <>
                <UserPlus size={14} aria-hidden />
                Create account
              </>
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-ink-2">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-accent hover:text-accent-strong">
            Sign in
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center text-[11px] text-muted">
        Guidance only. Not a medical diagnosis.
      </p>
    </AuthLayout>
  );
}
