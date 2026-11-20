'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import {
  useForm,
  type FieldValues,
  type Resolver,
  type UseFormReturn,
} from 'react-hook-form';
import type { ZodType } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toErrorMessage } from '@/lib/api/errors';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';
  placeholder?: string;
  options?:
    | FieldOption[]
    | ((values: FieldValues) => Promise<FieldOption[]>);
  /** Re-fetch function options when this field's value changes. */
  dependsOn?: string;
  emptyOptionLabel?: string;
  help?: string;
}

interface EntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FormField[];
  schema: ZodType;
  defaultValues: FieldValues;
  submitLabel?: string;
  onSubmit: (values: FieldValues) => Promise<void>;
}

function useFieldOptions(field: FormField, values: FieldValues): FieldOption[] {
  const isAsync = typeof field.options === 'function';
  const dependency = field.dependsOn ? String(values[field.dependsOn] ?? '') : 'static';
  const [resolved, setResolved] = useState<FieldOption[]>(
    isAsync ? [] : ((field.options as FieldOption[]) ?? []),
  );

  useEffect(() => {
    if (!isAsync) {
      setResolved((field.options as FieldOption[]) ?? []);
      return;
    }
    let cancelled = false;
    (field.options as (values: FieldValues) => Promise<FieldOption[]>)(values)
      .then((list) => {
        if (!cancelled) setResolved(list);
      })
      .catch(() => {
        if (!cancelled) setResolved([]);
      });
    return () => {
      cancelled = true;
    };
    // Intentionally keyed on the dependency value, not the inline function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependency, isAsync]);

  return resolved;
}

function FieldControl({
  field,
  form,
}: {
  field: FormField;
  form: UseFormReturn<FieldValues>;
}) {
  const values = form.watch();
  const options = useFieldOptions(field, values);
  const value = values[field.name];

  if (field.type === 'checkbox') {
    return (
      <label className="flex h-8 items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 rounded border-input"
          checked={Boolean(value)}
          onChange={(event) =>
            form.setValue(field.name, event.target.checked, { shouldValidate: true })
          }
        />
        {field.label}
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <select
        value={typeof value === 'string' ? value : ''}
        onChange={(event) =>
          form.setValue(field.name, event.target.value, { shouldValidate: true })
        }
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={field.label}
      >
        <option value="">{field.emptyOptionLabel ?? 'Select…'}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'textarea') {
    return (
      <Textarea
        {...form.register(field.name)}
        placeholder={field.placeholder}
        rows={2}
      />
    );
  }

  return (
    <Input
      type={field.type}
      {...form.register(field.name)}
      placeholder={field.placeholder}
    />
  );
}

export function EntityDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  schema,
  defaultValues,
  submitLabel = 'Save',
  onSubmit,
}: EntityDialogProps) {
  const form = useForm<FieldValues>({
    resolver: zodResolver(
      schema as unknown as Parameters<typeof zodResolver>[0],
    ) as unknown as Resolver<FieldValues>,
    defaultValues,
  });
  const defaultsRef = useRef(defaultValues);
  defaultsRef.current = defaultValues;
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      form.reset(defaultsRef.current);
      setFormError(null);
    }
    // Reset only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(toErrorMessage(error, 'Could not save this record'));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => {
            const error = form.formState.errors[field.name];
            const message = typeof error?.message === 'string' ? error.message : undefined;
            return (
              <div
                key={field.name}
                className={`space-y-1.5 ${field.type === 'textarea' ? 'sm:col-span-2' : ''}`}
              >
                {field.type !== 'checkbox' ? <Label htmlFor={field.name}>{field.label}</Label> : null}
                <FieldControl field={field} form={form} />
                {field.help ? (
                  <p className="text-xs text-muted-foreground">{field.help}</p>
                ) : null}
                {message ? <p className="text-xs text-destructive">{message}</p> : null}
              </div>
            );
          })}

          {formError ? (
            <p role="alert" className="text-sm text-destructive sm:col-span-2">
              {formError}
            </p>
          ) : null}

          <DialogFooter className="sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
