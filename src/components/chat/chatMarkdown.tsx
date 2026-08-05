import { type ReactNode } from 'react';

/** Markdown nhẹ cho bubble chat — không thêm dependency. */
export function renderChatMarkdown(text: string): ReactNode[] {
  const lines = text.split('\n');
  const nodes: ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) nodes.push(<br key={`br-${lineIdx}`} />);

    const trimmed = line.trim();
    if (/^[-*]\s+/.test(trimmed)) {
      nodes.push(
        <span key={`li-${lineIdx}`} className="chat-md-li">
          • {renderInline(trimmed.replace(/^[-*]\s+/, ''), `li-${lineIdx}`)}
        </span>,
      );
      return;
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      const num = trimmed.match(/^(\d+)\./)?.[1] ?? '1';
      nodes.push(
        <span key={`ol-${lineIdx}`} className="chat-md-li">
          {num}. {renderInline(trimmed.replace(/^\d+\.\s+/, ''), `ol-${lineIdx}`)}
        </span>,
      );
      return;
    }

    nodes.push(...renderInline(line, `ln-${lineIdx}`));
  });

  return nodes;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|https?:\/\/[^\s<]+[^\s<.,;:!?)}\]'"])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(<span key={`${keyPrefix}-t${i++}`}>{text.slice(last, m.index)}</span>);
    }
    const token = m[0];
    if (token.startsWith('**')) {
      parts.push(
        <strong key={`${keyPrefix}-b${i++}`}>{token.slice(2, -2)}</strong>,
      );
    } else if (token.startsWith('`')) {
      parts.push(
        <code key={`${keyPrefix}-c${i++}`} className="chat-md-code">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (/^https?:\/\//.test(token)) {
      parts.push(
        <a
          key={`${keyPrefix}-a${i++}`}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          className="chat-md-link"
        >
          {token}
        </a>,
      );
    }
    last = m.index + token.length;
  }

  if (last < text.length) {
    parts.push(<span key={`${keyPrefix}-end`}>{text.slice(last)}</span>);
  }

  return parts.length ? parts : [text];
}
