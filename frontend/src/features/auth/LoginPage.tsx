import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { AuthLayout } from "@/features/auth/AuthLayout";
import { useAuthStore } from "@/features/auth/auth-store";
import { isFlightSurgeon } from "@/lib/roles";

const schema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

type LoginValues = z.infer<typeof schema>;

export function LoginPage() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const login = useAuthStore((state) => state.login);
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  if (status === "authenticated") {
    return <Navigate to={isFlightSurgeon(user) ? "/surgeon" : from} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values.email, values.password);
      toast.success("Welcome back.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to sign in.");
    }
  });

  const fillDemo = () => {
    setValue("email", "commander@astra.space", { shouldValidate: true });
    setValue("password", "astra-demo", { shouldValidate: true });
    setFormError(null);
  };

  const fillSurgeon = () => {
    setValue("email", "surgeon@astra.space", { shouldValidate: true });
    setValue("password", "astra-demo", { shouldValidate: true });
    setFormError(null);
  };

  return (
    <AuthLayout>
      <div className="card-shadow rounded-xl border border-line bg-surface p-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-ink-2">Sign in to your crew or flight surgeon account.</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
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

          <Field label="Password" htmlFor="password" error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
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
                <LogIn size={14} aria-hidden />
                Sign in
              </>
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-ink-2">
          New here?{" "}
          <Link to="/register" className="font-medium text-accent hover:text-accent-strong">
            Create an account
          </Link>
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-line bg-surface-muted/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-ink">Demo access</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              Seeded commander or the Earth-side flight surgeon.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
            <Button variant="secondary" size="sm" onClick={fillDemo}>
              Commander
            </Button>
            <Button variant="secondary" size="sm" onClick={fillSurgeon}>
              Flight surgeon
            </Button>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-[11px] text-muted">
        Guidance only. Not a medical diagnosis.
      </p>
    </AuthLayout>
  );
}
