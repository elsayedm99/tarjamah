// ─────────────────────────────────────────────────────────────
// Tarjama — Translation Panel (Right Panel)
// Continuous flowing Arabic translation across all pages,
// similar to Google Docs. Each page section is independently
// editable and shows its page number as a divider.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { PageData } from '../../types';

// ── Single Page Editor ──────────────────────────────────────

interface PageEditorProps {
  page: PageData;
  onUpdate: (pageNumber: number, html: string) => void;
  onManualEdit: (pageNumber: number) => void;
}

function PageEditor({ page, onUpdate, onManualEdit }: PageEditorProps) {
  const isExternalUpdate = useRef(false);
  const hasUserTyped = useRef(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: page.translatedText || '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor tiptap-document',
        dir: 'rtl',
        lang: 'ar',
        spellcheck: 'false',
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (isExternalUpdate.current) return;

      const html = ed.getHTML();
      onUpdate(page.pageNumber, html);

      if (!hasUserTyped.current) {
        hasUserTyped.current = true;
        onManualEdit(page.pageNumber);
      }
    },
  });

  // Sync external content changes (new translation arrives)
  useEffect(() => {
    if (!editor) return;
    const currentContent = editor.getHTML();
    if (currentContent === page.translatedText) return;

    // Only sync if user hasn't manually edited this page
    if (hasUserTyped.current) return;

    isExternalUpdate.current = true;
    editor.commands.setContent(page.translatedText || '', { emitUpdate: false });
    isExternalUpdate.current = false;
  }, [page.translatedText, editor]);

  const statusLabel = (() => {
    switch (page.status) {
      case 'untranslated':
        return null;
      case 'in_progress':
        return { text: 'Translating…', color: 'var(--warning)' };
      case 'translated':
        return { text: 'Translated', color: 'var(--success)' };
      case 'edited':
        return { text: 'Edited', color: 'var(--info)' };
      case 'reviewed':
        return { text: 'Reviewed', color: 'var(--success)' };
      case 'flagged':
        return { text: 'Flagged', color: 'var(--error)' };
      default:
        return null;
    }
  })();

  const isEmpty = !page.translatedText || page.translatedText === '<p></p>';

  return (
    <div
      data-page={page.pageNumber}
      style={{
        background: 'white',
        borderRadius: '2px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
        overflow: 'hidden',
        color: '#1a1a1a',
      }}
    >
      {/* Page divider — matches exported doc style */}
      <div
        style={{
          textAlign: 'center',
          padding: '16px 24px 8px',
          fontSize: '12px',
          color: '#999',
          fontWeight: 500,
          letterSpacing: '0.02em',
          borderBottom: '1px solid #eee',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <span style={{ flex: 1, height: '1px', background: '#e5e5e5' }} />
        <span style={{ fontFamily: 'var(--font-arabic)', direction: 'rtl' }}>
          صفحة {page.pageNumber}
        </span>
        <span>—</span>
        <span>Page {page.pageNumber}</span>
        {statusLabel && (
          <>
            <span>—</span>
            <span style={{ color: statusLabel.color, fontSize: '11px' }}>
              {statusLabel.text}
            </span>
          </>
        )}
        <span style={{ flex: 1, height: '1px', background: '#e5e5e5' }} />
      </div>

      {/* Editor or placeholder */}
      {page.status === 'in_progress' ? (
        <div
          style={{
            padding: '48px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            minHeight: '200px',
            color: '#999',
          }}
        >
          <div className="spinner" />
          <span style={{ fontSize: '13px' }}>Translating page {page.pageNumber}…</span>
        </div>
      ) : isEmpty && page.status === 'untranslated' ? (
        <div
          style={{
            padding: '48px 32px',
            minHeight: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#bbb',
            fontSize: '14px',
            fontFamily: 'var(--font-arabic)',
            direction: 'rtl',
          }}
        >
          الترجمة العربية ستظهر هنا…
        </div>
      ) : (
        <div style={{ minHeight: '100px' }}>
          {editor ? (
            <EditorContent editor={editor} />
          ) : (
            <div style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          )}
        </div>
      )}

      {/* Quality flags */}
      {page.qualityFlags.length > 0 && (
        <div
          style={{
            padding: 'var(--space-2) var(--space-3)',
            borderTop: '1px solid var(--border-primary)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-1)',
          }}
        >
          {page.qualityFlags.map((flag, idx) => (
            <span
              key={idx}
              className={`badge badge-${flag.severity === 'error' ? 'error' : 'warning'}`}
              title={flag.message}
            >
              {flag.type === 'abbreviation' ? '⚠ Possible abbreviation' :
               flag.type === 'sentence_mismatch' ? '⚠ Sentence count mismatch' :
               '⚠ Paragraph mismatch'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Translation Panel ──────────────────────────────────

interface TranslationEditorProps {
  pages: PageData[];
  onUpdatePage: (pageNumber: number, html: string) => void;
  onManualEdit: (pageNumber: number) => void;
}

export default function TranslationEditor({
  pages,
  onUpdatePage,
  onManualEdit,
}: TranslationEditorProps) {
  return (
    <div
      className="workspace-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Panel header */}
      <div
        style={{
          padding: 'var(--space-2) var(--space-4)',
          borderBottom: '1px solid var(--border-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          background: 'var(--bg-secondary)',
        }}
      >
        <span
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-semibold)',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Translation
        </span>
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-arabic)',
            direction: 'rtl',
          }}
        >
          العربية
        </span>
      </div>

      {/* Scrollable continuous translation */}
      <div
        id="translation-scroll-panel"
        style={{
          flex: 1,
          overflowY: 'auto',
          background: '#f0f0f0',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
            padding: 'var(--space-4)',
          }}
        >
          {pages.map((page) => (
            <PageEditor
              key={page.pageNumber}
              page={page}
              onUpdate={onUpdatePage}
              onManualEdit={onManualEdit}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
