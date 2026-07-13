import { useEffect, useRef } from 'react';
import type React from 'react';
import EasyMDE from 'easymde';
import 'easymde/dist/easymde.min.css';

interface MarkdownEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  instanceRef?: React.MutableRefObject<EasyMDE | null>;
  minHeight?: string;
  placeholder?: string;
  className?: string;
}

export function MarkdownEditor({
  id,
  value,
  onChange,
  instanceRef,
  minHeight = '180px',
  placeholder,
  className,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const localInstanceRef = useRef<EasyMDE | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const initialValueRef = useRef(value ?? '');
  const initialMinHeightRef = useRef(minHeight);
  const initialPlaceholderRef = useRef(placeholder);

  const isTest = process.env.NODE_ENV === 'test';

  // Keep refs up to date to avoid stale closures
  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  }, [onChange, value]);

  // Sync instanceRef into a local ref (in an effect to avoid react-hooks/refs violation)
  const instanceRefLocal = useRef(instanceRef);
  useEffect(() => {
    instanceRefLocal.current = instanceRef;
  });

  // Mount EasyMDE once. Initial prop values are captured in refs so the
  // effect doesn't need to depend on changing props. The sync effect below
  // handles external value changes without destroying the editor.
  useEffect(() => {
    if (isTest) return;
    if (localInstanceRef.current) return;
    if (!textareaRef.current) return;

    const mde = new EasyMDE({
      element: textareaRef.current,
      initialValue: initialValueRef.current,
      spellChecker: false,
      status: false,
      minHeight: initialMinHeightRef.current,
      placeholder: initialPlaceholderRef.current,
      toolbar: [
        'bold',
        'italic',
        'heading',
        '|',
        'unordered-list',
        'ordered-list',
        '|',
        'link',
        'quote',
        '|',
        'preview',
        'guide',
      ],
    });

    localInstanceRef.current = mde;

    if (instanceRefLocal.current) {
      instanceRefLocal.current.current = mde;
    }

    const handleChange = () => {
      const nextValue = mde.value();
      if (nextValue !== valueRef.current) {
        onChangeRef.current(nextValue);
      }
    };

    mde.codemirror.on('change', handleChange);

    return () => {
      mde.codemirror.off('change', handleChange);
      mde.toTextArea();
      localInstanceRef.current = null;
      if (instanceRefLocal.current?.current === mde) {
        instanceRefLocal.current.current = null;
      }
    };
  }, [isTest]);

  // Synchronize external value changes (e.g. from templates) into EasyMDE
  useEffect(() => {
    if (isTest) return;
    const mde = localInstanceRef.current;
    if (!mde) return;

    const currentValue = mde.value();
    const nextValue = value ?? '';

    if (currentValue !== nextValue) {
      const cursor = mde.codemirror.getCursor();
      mde.value(nextValue);
      mde.codemirror.setCursor({
        line: Math.min(cursor.line, mde.codemirror.lineCount() - 1),
        ch: cursor.ch,
      });
    }
  }, [value, isTest]);

  if (isTest) {
    // Test mode: render a plain textarea instead of EasyMDE. CodeMirror
    // crashes in jsdom (getBoundingClientRect not implemented).
    return (
      <div className={className}>
        <textarea
          id={id}
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm"
          // @allow-inline-style - dynamic minHeight value
          style={{ minHeight }}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <textarea id={id} ref={textareaRef} className="hidden" />
    </div>
  );
}
