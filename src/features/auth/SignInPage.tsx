import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Tabs } from '@/components/ui/Tabs';
import { errorMessage } from '@/lib/api-client';
import { config } from '@/lib/config';
import { applyServerErrors, LIMITS } from '@/lib/forms';
import { authSchema, type AuthValues } from './auth.schema';
import { useAuth } from './AuthProvider';
import { DemoAccountPicker } from './DemoAccountPicker';

type Mode = AuthValues['mode'];

/** Split screen from the prototype: animated black brand panel + sign-in / request-access form. */
export function SignInPage() {
  const { signIn, register } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const {
    register: field,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AuthValues>({
    resolver: zodResolver(authSchema),
    defaultValues: { mode: 'in', fullName: '', email: '', password: '' },
    mode: 'onTouched',
  });
  const mode = watch('mode');

  const submit = handleSubmit(async (v) => {
    setMessage(null);
    try {
      if (v.mode === 'in') await signIn(v.email, v.password);
      else await register(v.fullName, v.email, v.password);
    } catch (err) {
      applyServerErrors(err, setError, ['fullName', 'email', 'password']);
      setMessage(errorMessage(err));
    }
  });

  const switchMode = (m: Mode) => {
    setValue('mode', m);
    setMessage(null);
    clearErrors();
  };

  return (
    <div className="grid min-h-screen animate-fade-in bg-white lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
      <section className="flex flex-col justify-between gap-10 overflow-hidden bg-ink px-6 py-10 sm:px-12 lg:min-h-screen lg:py-14">
        <div className="flex animate-soft-in items-center gap-3.5">
          <img src="/brand-mark.png" alt="Project Accountants" className="block h-auto w-11" />
          <div>
            <div className="text-[15px] font-semibold tracking-[1.3px] text-white">PROJECT ACCOUNTANTS</div>
            <div className="text-[11px] tracking-[1.3px] text-white/50">EMPOWERING BUSINESSES WORLDWIDE</div>
          </div>
        </div>
        <div>
          <div className="mb-[22px] animate-soft-in text-[13px] font-medium tracking-[1.3px] text-white/35 [animation-delay:.3s]">LEARNING PLATFORM</div>
          <div className="-mb-2.5 overflow-hidden pb-2.5">
            <div className="animate-reveal text-[clamp(38px,4vw,54px)] font-semibold leading-[1.12] tracking-[-1.4px] text-white [animation-delay:.45s]">Learning</div>
          </div>
          <div className="-mb-3 overflow-hidden pb-3">
            <div className="animate-reveal text-[clamp(38px,4vw,54px)] font-semibold leading-[1.12] tracking-[-1.4px] text-white [animation-delay:.6s]">on Record</div>
          </div>
          <div className="my-[26px] h-0.5 w-[100px] origin-left animate-rule bg-white [animation-delay:1.05s]" />
          <p className="max-w-[360px] animate-soft-in text-[16px] leading-7 text-white/70 [animation-delay:1.25s]">All your learning and CPD in one place</p>
        </div>
        <div className="hidden animate-soft-in [animation-delay:1.55s] lg:block">
          <div className="h-0.5 overflow-hidden bg-white/15">
            <div className="h-full w-full origin-left animate-rule bg-pa-blue [animation-delay:1.6s] [animation-duration:1.8s]" />
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10 sm:p-12">
        <div className="w-full max-w-[420px] animate-fade-up [animation-delay:.12s]">
          <h1 className="text-[32px] font-semibold tracking-[-0.6px] text-ink">{mode === 'in' ? 'Sign in' : 'Request access'}</h1>
          <p className="mt-2 text-[14px] leading-6 text-[rgba(38,39,25,.6)]">
            {mode === 'in'
              ? 'Use your Project Accountants work email and password.'
              : 'New accounts start as Team Member. The Learning Team sets your role and designation.'}
          </p>

          {config.demoMode ? (
            <div className="mt-7">
              <DemoAccountPicker />
            </div>
          ) : (
            <>
          {config.microsoftSso ? (
            <>
              <button
                type="button"
                disabled
                className="mt-7 flex w-full cursor-not-allowed items-center gap-3.5 bg-ink px-[18px] py-[15px] text-left text-white opacity-60"
              >
                <span className="grid shrink-0 grid-cols-[9px_9px] grid-rows-[9px_9px] gap-0.5">
                  <span className="bg-[#f25022]" />
                  <span className="bg-[#7fba00]" />
                  <span className="bg-[#00a4ef]" />
                  <span className="bg-[#ffb900]" />
                </span>
                <span>
                  <span className="block text-[13px] font-semibold tracking-[.8px]">SIGN IN WITH MICROSOFT</span>
                  <span className="mt-0.5 block text-[11px] text-white/55">Coming soon</span>
                </span>
              </button>
              <div className="my-6 flex items-center gap-3.5">
                <div className="h-px flex-1 bg-black/12" />
                <div className="text-[10px] tracking-[1.4px] text-subtle">OR</div>
                <div className="h-px flex-1 bg-black/12" />
              </div>
            </>
          ) : (
            <div className="mt-7" />
          )}

          <Tabs
            className="mb-[22px]"
            value={mode}
            onChange={switchMode}
            tabs={[
              { id: 'in', label: 'Sign in' },
              { id: 'up', label: 'Request access' },
            ]}
          />

          <form onSubmit={(e) => void submit(e)} noValidate className="space-y-4">
            {mode === 'up' ? (
              <TextField label="Full name" placeholder="Ibraaheem Moolla" autoComplete="name" error={errors.fullName?.message} {...field('fullName')} />
            ) : null}
            <TextField
              label="Work email"
              type="email"
              placeholder="you@projectaccountants.co.uk"
              autoComplete="email"
              error={errors.email?.message}
              {...field('email')}
            />
            <TextField
              label="Password"
              type="password"
              placeholder="••••••••••"
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              error={errors.password?.message}
              hint={mode === 'up' ? `At least ${LIMITS.passwordMin} characters` : undefined}
              {...field('password')}
            />
            {message ? (
              <div role="alert" className="bg-panel px-3.5 py-[11px] text-[13px] leading-5 text-pa-red">
                {message}
              </div>
            ) : null}
            <Button type="submit" variant="dark" block loading={isSubmitting} className="!py-3.5 !text-[12px] !tracking-[1.4px]">
              {mode === 'in' ? 'Sign in' : 'Request access'}
            </Button>
          </form>

            </>
          )}

          <p className="mt-[22px] text-[12px] leading-5 text-faint">
            Access, roles and designations are managed by the Learning Team. Microsoft single sign-on will be enabled for @projectaccountants.co.uk accounts.
          </p>
        </div>
      </section>
    </div>
  );
}
