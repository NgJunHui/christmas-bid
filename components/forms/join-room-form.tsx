"use client";

import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ApiError, getSession, joinRoom } from "@/lib/client/api";
import { readRememberedName, rememberName } from "@/lib/client/remembered-name";
import { LIMITS } from "@/lib/game/constants";
import { isValidName, NAME_RULE_MESSAGE, normalizeName, sanitizeNameInput } from "@/lib/game/names";

type Step = "code" | "name";

const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const },
};

/**
 * Kahoot-style join: one field per screen. Game PIN first, then a nickname.
 * Invite links (`/join?code=1234`) skip straight to the nickname.
 */
export function JoinRoomForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialCode = (params.get("code") ?? "").replace(/\D/g, "").slice(0, 4);
  const [step, setStep] = useState<Step>(initialCode.length === 4 ? "name" : "code");
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<{ code?: string; name?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  // Until hydrated, keep submit disabled so Enter can't trigger a plain browser GET submit.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setName((current) => current || sanitizeNameInput(readRememberedName()).value);
    setReady(true);
  }, []);

  useEffect(() => {
    (step === "code" ? codeRef : nameRef).current?.focus();
  }, [step]);

  // Already have a seat in this room (e.g. opened an invite link twice)? Go straight back in.
  useEffect(() => {
    if (initialCode.length !== 4) return;
    let cancelled = false;
    getSession(initialCode)
      .then((session) => {
        if (session && !cancelled) router.replace(`/room/${initialCode}`);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [initialCode, router]);

  const submitCode = (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{4}$/.test(code)) return setErrors({ code: "Game PINs are 4 digits." });
    setErrors({});
    setStep("name");
  };

  const submitName = async (event: FormEvent) => {
    event.preventDefault();
    const displayName = normalizeName(name);
    if (!isValidName(displayName)) return setErrors({ name: displayName ? NAME_RULE_MESSAGE : "Add a nickname." });
    setErrors({});
    setSubmitting(true);
    try {
      const result = await joinRoom(code, displayName);
      rememberName(displayName);
      if (result.rejoined) toast.success("Welcome back! Your seat was saved.");
      router.push(`/room/${code}`);
    } catch (error) {
      setSubmitting(false);
      if (!(error instanceof ApiError)) return toast.error("Couldn't join. Try again.");
      if (error.code === "NAME_TAKEN" || error.code === "INVALID_INPUT") setErrors({ name: error.message });
      else if (error.code === "NOT_FOUND") {
        setErrors({ code: "No game with that PIN. Double-check the digits?" });
        setStep("code");
      } else toast.error(error.message);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <AnimatePresence mode="wait" initial={false}>
        {step === "code" ? (
          <motion.form key="code" {...slide} onSubmit={submitCode} noValidate className="flex flex-1 flex-col gap-6">
            <Field id="code" label="Game PIN" error={errors.code}>
              <Input
                ref={codeRef}
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{4}"
                maxLength={4}
                placeholder="0000"
                enterKeyHint="next"
                className="tabular h-20 text-center text-[2.75rem] font-semibold tracking-[0.35em] indent-[0.35em] placeholder:text-surface-3"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 4));
                  setErrors({});
                }}
                aria-invalid={Boolean(errors.code)}
                aria-describedby={errors.code ? "code-error" : undefined}
              />
            </Field>
            <div className="mt-auto pt-4">
              <Button type="submit" size="lg" className="w-full" disabled={!ready || code.length !== 4}>
                Enter <ArrowRight />
              </Button>
            </div>
          </motion.form>
        ) : (
          <motion.form key="name" {...slide} onSubmit={submitName} noValidate className="flex flex-1 flex-col gap-6">
            <p className="flex items-center justify-center gap-2 text-sm text-fg-muted">
              Game PIN <span className="tabular font-bold tracking-[0.14em] text-gold">{code}</span>
              <button
                type="button"
                onClick={() => setStep("code")}
                className="rounded-full px-2 py-0.5 font-medium text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg-faint"
              >
                Change
              </button>
            </p>
            <Field id="name" label="Nickname" error={errors.name}>
              <Input
                ref={nameRef}
                id="name"
                name="name"
                autoComplete="nickname"
                autoCapitalize="words"
                enterKeyHint="go"
                maxLength={LIMITS.nameMaxLength}
                placeholder="e.g. Jamie"
                value={name}
                onChange={(e) => {
                  const { value, changed } = sanitizeNameInput(e.target.value);
                  setName(value);
                  setErrors(changed ? { name: NAME_RULE_MESSAGE } : {});
                }}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
            </Field>
            <div className="mt-auto pt-4">
              <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={!ready}>
                Join game
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
