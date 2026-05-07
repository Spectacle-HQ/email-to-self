/**
 * React wrapper for `@spectaclehq/email-to-self`.
 *
 * The component renders `null` — the widget mounts itself into a shadow DOM
 * host appended to `document.body` (or the `container` you provide). Callbacks
 * and configuration are forwarded as-is.
 *
 * @example
 * ```tsx
 * import { EmailToSelfWidget } from '@spectaclehq/email-to-self/react';
 *
 * function App() {
 *   return (
 *     <>
 *       <EmailToSelfWidget
 *         layout="drawer"
 *         trackInSpectacle
 *         onSubmit={(email) => console.log('captured', email)}
 *       />
 *       {/* ...your app... *\/}
 *     </>
 *   );
 * }
 * ```
 */

import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import type { ForwardRefRenderFunction, Ref } from 'react';

import { EmailToSelf } from '../core/EmailToSelf';
import type { EmailToSelfInstance, EmailToSelfOptions } from '../core/types';

export type { EmailToSelfInstance, EmailToSelfOptions } from '../core/types';

export type EmailToSelfWidgetProps = EmailToSelfOptions;

const Widget: ForwardRefRenderFunction<EmailToSelfInstance, EmailToSelfWidgetProps> = (
  props,
  ref: Ref<EmailToSelfInstance>,
) => {
  // Latest-props ref so callbacks always see fresh closures without re-mounting
  // the imperative widget on every render.
  const propsRef = useRef(props);
  propsRef.current = props;

  const instanceRef = useRef<EmailToSelf | null>(null);

  useEffect(() => {
    const instance = new EmailToSelf({
      ...propsRef.current,
      onSubmit: (email) => propsRef.current.onSubmit?.(email),
      onDismiss: () => propsRef.current.onDismiss?.(),
      action: propsRef.current.action
        ? (email, meta) => propsRef.current.action!(email, meta)
        : undefined,
    });
    instanceRef.current = instance;
    return () => {
      instance.destroy();
      instanceRef.current = null;
    };
    // Mount-once intentionally. To reconfigure, change `key`.
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      show: () => instanceRef.current?.show(),
      hide: () => instanceRef.current?.hide(),
      destroy: () => instanceRef.current?.destroy(),
      get state() {
        return instanceRef.current?.state ?? 'dismissed';
      },
    }),
    [],
  );

  return null;
};

export const EmailToSelfWidget = forwardRef(Widget);
EmailToSelfWidget.displayName = 'EmailToSelfWidget';
