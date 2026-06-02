import React, { useEffect, useRef } from 'react';
import EasyMDE from 'easymde';
import 'easymde/dist/easymde.min.css';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  instanceRef?: React.MutableRefObject<EasyMDE | null>;
  minHeight?: string;
  placeholder?: string;
  className?: string;
}

export function MarkdownEditor({
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

  // Keep refs up to date to avoid stale closures in EasyMDE callback
  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  }, [onChange, value]);

  useEffect(() => {
    if (!textareaRef.current) return;

    const mde = new EasyMDE({
      element: textareaRef.current,
      initialValue: value ?? '',
      spellChecker: false, // Disabling by default for cleaner UI unless requested
      status: false,
      minHeight,
      placeholder,
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

    if (instanceRef) {
      instanceRef.current = mde;
    }

    const handleChange = () => {
      const nextValue = mde.value();
      // Only trigger onChange if the value has actually changed
      if (nextValue !== valueRef.current) {
        onChangeRef.current(nextValue);
      }
    };

    mde.codemirror.on('change', handleChange);

    return () => {
      mde.codemirror.off('change', handleChange);
      mde.toTextArea();
      localInstanceRef.current = null;
      if (instanceRef?.current === mde) {
        instanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Synchronize external value changes (e.g. from templates) into EasyMDE
  useEffect(() => {
    const mde = localInstanceRef.current;
    if (!mde) return;

    const currentValue = mde.value();
    const nextValue = value ?? '';

    if (currentValue !== nextValue) {
      // Use value() to set content, which preserves cursor position if possible or handles full replacement
      mde.value(nextValue);
    }
  }, [value]);

  return (
    <div className={`markdown-editor-wrapper ${className || ''}`}>
      <textarea ref={textareaRef} style={{ display: 'none' }} />
    </div>
  );
}
