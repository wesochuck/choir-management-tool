import { useEffect, useRef } from 'react';
import EasyMDE from 'easymde';
import 'easymde/dist/easymde.min.css';
import styles from './MarkdownEditor.module.css';

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  instanceRef?: React.MutableRefObject<EasyMDE | null>;
  minHeight?: string;
  placeholder?: string;
  className?: string;
}

export function MarkdownEditor({
  value, onChange, instanceRef,
  minHeight = '180px', placeholder, className,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const easyMDERef = useRef<EasyMDE | null>(null);

  useEffect(() => {
    if (!textareaRef.current) return;

    try {
      const easyMDE = new EasyMDE({
        element: textareaRef.current,
        initialValue: value,
        minHeight,
        placeholder,
        status: false,
        spellChecker: false,
        renderingConfig: {
          singleLineBreaks: false,
          codeSyntaxHighlighting: false,
        },
      });

      easyMDE.codemirror.on('change', () => {
        onChange(easyMDE.value());
      });

      easyMDERef.current = easyMDE;
      if (instanceRef) instanceRef.current = easyMDE;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('EasyMDE initialization failed:', message);
    }

    return () => {
      if (instanceRef) instanceRef.current = null;
      if (easyMDERef.current) {
        try { easyMDERef.current.toTextArea(); } catch { /* ignore */ }
        easyMDERef.current = null;
      }
    };
  }, []);

  const classNames = [styles.wrapper];
  if (className) classNames.push(className);

  return (
    <div className={classNames.join(' ')}>
      <textarea ref={textareaRef} defaultValue={value} />
    </div>
  );
}
