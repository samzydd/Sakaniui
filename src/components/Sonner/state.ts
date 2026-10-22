/**
 * The toast store behind `toast()` and `<Toaster />`.
 *
 * `toast()` can be called from anywhere (event handlers, data hooks, plain modules), so the
 * toasts live in this module rather than in React state. A mounted `<Toaster />` subscribes and
 * renders them; toasts created before it mounts are picked up when it does.
 */
import type React from 'react';

export type ToastType = 'default' | 'success' | 'info' | 'warning' | 'error' | 'loading';
export type ToastId = string | number;

export interface ToastAction {
  /** Button text. */
  label: React.ReactNode;
  /** Called on click. The toast closes afterwards unless you call `event.preventDefault()`. */
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export interface ToastCancel {
  /** Button text. */
  label: React.ReactNode;
  /** Called on click, before the toast closes. */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export interface ToastOptions {
  /** Reuse an id to update a toast in place instead of adding a new one. */
  id?: ToastId;
  /** Secondary line under the title. */
  description?: React.ReactNode;
  /** Replaces the type icon. Pass `null` to show no icon. */
  icon?: React.ReactNode;
  /** Primary button, right-most. */
  action?: ToastAction;
  /** Secondary button, left of the action. */
  cancel?: ToastCancel;
  /** Milliseconds before the toast closes itself. Overrides the Toaster's `duration`. `Infinity` keeps it open. */
  duration?: number;
  /** Shows the round close button on this toast. Overrides the Toaster's `closeButton`. */
  closeButton?: boolean;
  /** When false the toast cannot be swiped away or closed by the user. Defaults to true. */
  dismissible?: boolean;
  /** Announces the toast assertively (interrupting the screen reader). Errors are announced this way by default. */
  important?: boolean;
  /** Tints this toast by its type. Overrides the Toaster's `richColors`. */
  richColors?: boolean;
  /** Called when the toast is closed by the user (close button, cancel, swipe) or by `toast.dismiss()`. */
  onDismiss?: (toast: ToastData) => void;
  /** Called when the toast closes itself after its duration. */
  onAutoClose?: (toast: ToastData) => void;
  /** Extra class on the toast element. */
  className?: string;
}

export interface ToastData extends ToastOptions {
  id: ToastId;
  type: ToastType;
  title: React.ReactNode;
  /** @internal set by toast.dismiss(); the Toaster plays the exit motion, then removes it */
  delete?: boolean;
  /** @internal bumped on every update so the timer restarts */
  version: number;
}

export interface ToastPromiseMessages<T> extends Omit<ToastOptions, 'id'> {
  id?: ToastId;
  /** Shown while the promise is pending. Leave it out to show nothing until it settles. */
  loading?: React.ReactNode;
  /** Shown when it resolves. A function receives the resolved value. */
  success?: React.ReactNode | ((data: T) => React.ReactNode);
  /** Shown when it rejects. A function receives the error. */
  error?: React.ReactNode | ((error: unknown) => React.ReactNode);
  /** Called after it settles either way. */
  finally?: () => void;
}

type Event = { kind: 'upsert'; toast: ToastData } | { kind: 'dismiss'; id?: ToastId };
type Listener = (event: Event) => void;

let counter = 0;
let active: ToastData[] = [];
const listeners = new Set<Listener>();

function emit(event: Event) {
  for (const l of listeners) l(event);
}

/** @internal */
export const store = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  /** Toasts that are open right now, newest first. */
  active: () => active,
  /** @internal the Toaster calls this once a toast has finished its exit motion */
  remove(id: ToastId) {
    active = active.filter((t) => t.id !== id);
  },
};

function create(type: ToastType, title: React.ReactNode, options: ToastOptions = {}): ToastId {
  const id = options.id ?? `sakani-toast-${++counter}`;
  const existing = active.find((t) => t.id === id);
  const toast: ToastData = { ...existing, ...options, id, type, title, delete: false, version: (existing?.version ?? 0) + 1 };
  active = existing ? active.map((t) => (t.id === id ? toast : t)) : [toast, ...active];
  emit({ kind: 'upsert', toast });
  return id;
}

function dismiss(id?: ToastId): ToastId | undefined {
  active = id === undefined ? [] : active.filter((t) => t.id !== id);
  emit({ kind: 'dismiss', id });
  return id;
}

function promise<T>(input: Promise<T> | (() => Promise<T>), messages: ToastPromiseMessages<T>): ToastId {
  const { loading, success, error, finally: onFinally, id: givenId, ...options } = messages;
  const id = givenId ?? `sakani-toast-${++counter}`;
  if (loading !== undefined) create('loading', loading, { ...options, id });
  const p = typeof input === 'function' ? input() : input;
  p.then(
    (data) => {
      if (success === undefined) { if (loading !== undefined) dismiss(id); return; }
      create('success', typeof success === 'function' ? (success as (d: T) => React.ReactNode)(data) : success, { ...options, id });
    },
    (err: unknown) => {
      if (error === undefined) { if (loading !== undefined) dismiss(id); return; }
      create('error', typeof error === 'function' ? (error as (e: unknown) => React.ReactNode)(err) : error, { ...options, id });
    },
  ).finally(() => onFinally?.());
  return id;
}

type ToastFn = (title: React.ReactNode, options?: ToastOptions) => ToastId;

/**
 * Shows a toast. Needs one `<Toaster />` mounted somewhere in the app.
 *
 *   toast('Event has been created', { description: 'Monday, January 3rd at 6:00pm' })
 *   toast.success('Saved')
 *   toast.error('Upload failed', { action: { label: 'Retry', onClick: retry } })
 *   toast.promise(save(), { loading: 'Saving…', success: 'Saved', error: 'Could not save' })
 *   toast.dismiss(id)
 *
 * Every call returns the toast's id; pass it back as `id` to update that toast in place.
 */
export const toast: ToastFn & {
  message: ToastFn;
  success: ToastFn;
  info: ToastFn;
  warning: ToastFn;
  error: ToastFn;
  /** Stays open (no timer) until you update it with the same `id` or dismiss it. */
  loading: ToastFn;
  promise: typeof promise;
  /** Closes one toast, or every toast when called without an id. */
  dismiss: typeof dismiss;
} = Object.assign((title: React.ReactNode, options?: ToastOptions) => create('default', title, options), {
  message: (title: React.ReactNode, options?: ToastOptions) => create('default', title, options),
  success: (title: React.ReactNode, options?: ToastOptions) => create('success', title, options),
  info: (title: React.ReactNode, options?: ToastOptions) => create('info', title, options),
  warning: (title: React.ReactNode, options?: ToastOptions) => create('warning', title, options),
  error: (title: React.ReactNode, options?: ToastOptions) => create('error', title, options),
  loading: (title: React.ReactNode, options?: ToastOptions) => create('loading', title, options),
  promise,
  dismiss,
});
