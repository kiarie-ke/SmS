import { LoginForm } from '@/components/auth/login-form';

export function LoginScreen() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">School System</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to manage your school
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
