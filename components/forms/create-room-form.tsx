"use client";

import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ApiError, createRoom } from "@/lib/client/api";
import { readRememberedName, rememberName } from "@/lib/client/remembered-name";
import { LIMITS } from "@/lib/game/constants";
import { isValidName, NAME_RULE_MESSAGE, normalizeName, sanitizeNameInput } from "@/lib/game/names";

export function CreateRoomForm({ testBiddingSeconds }: { testBiddingSeconds?: number }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [credits, setCredits] = useState<string>(String(LIMITS.creditsDefault));
  const [errors, setErrors] = useState<{ name?: string; credits?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  // Until hydrated, keep submit disabled so Enter can't trigger a plain browser GET submit.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setName((current) => current || sanitizeNameInput(readRememberedName()).value);
    setReady(true);
  }, []);

  const creditsNumber = Number(credits);
  const step = (delta: number) => {
    const base = Number.isFinite(creditsNumber) ? creditsNumber : LIMITS.creditsDefault;
    setCredits(String(Math.min(LIMITS.creditsMax, Math.max(LIMITS.creditsMin, Math.round(base) + delta))));
    setErrors((e) => ({ ...e, credits: undefined }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const displayName = normalizeName(name);
    const next: typeof errors = {};
    if (!isValidName(displayName)) next.name = displayName ? NAME_RULE_MESSAGE : "Add a nickname.";
    if (!Number.isInteger(creditsNumber) || creditsNumber < LIMITS.creditsMin || creditsNumber > LIMITS.creditsMax) {
      next.credits = `Pick a whole number from ${LIMITS.creditsMin} to ${LIMITS.creditsMax}.`;
    }
    setErrors(next);
    if (next.name || next.credits) return;

    setSubmitting(true);
    try {
      const room = await createRoom({
        displayName,
        startingCredits: creditsNumber,
        ...(testBiddingSeconds ? { biddingSeconds: testBiddingSeconds } : {}),
      });
      rememberName(displayName);
      router.push(`/room/${room.code}`);
    } catch (error) {
      setSubmitting(false);
      toast.error(error instanceof ApiError ? error.message : "Couldn't create the room. Try again.");
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col gap-12">
      <Field id="name" label="Nickname" error={errors.name}>
        <Input
          id="name"
          name="name"
          autoComplete="nickname"
          autoCapitalize="words"
          enterKeyHint="next"
          maxLength={LIMITS.nameMaxLength}
          placeholder="e.g. Sarah"
          value={name}
          onChange={(e) => {
            const { value, changed } = sanitizeNameInput(e.target.value);
            setName(value);
            setErrors((x) => ({ ...x, name: changed ? NAME_RULE_MESSAGE : undefined }));
          }}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
      </Field>

      <Field id="credits" label="Credits per player" error={errors.credits}>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="icon" className="size-14" onClick={() => step(-5)} aria-label="5 fewer credits">
            <Minus />
          </Button>
          <Input
            id="credits"
            inputMode="numeric"
            pattern="[0-9]*"
            className="tabular flex-1 text-center text-2xl font-semibold"
            value={credits}
            onChange={(e) => {
              setCredits(e.target.value.replace(/\D/g, "").slice(0, 4));
              setErrors((x) => ({ ...x, credits: undefined }));
            }}
            aria-invalid={Boolean(errors.credits)}
            aria-describedby={errors.credits ? "credits-error" : undefined}
          />
          <Button type="button" variant="outline" size="icon" className="size-14" onClick={() => step(5)} aria-label="5 more credits">
            <Plus />
          </Button>
        </div>
      </Field>

      <div className="mt-auto flex flex-col gap-3 pt-4">
        <Button type="submit" size="lg" loading={submitting} disabled={!ready}>
          Create room
        </Button>
      </div>
    </form>
  );
}
