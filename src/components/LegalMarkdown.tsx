function formatInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-koala-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function isTableRow(line: string) {
  return line.trim().startsWith("|") && line.trim().endsWith("|");
}

function isTableDivider(line: string) {
  return /^\|?[\s:-]+\|/.test(line.trim());
}

export function LegalMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (isTableRow(line)) {
      const tableLines: string[] = [];
      while (index < lines.length && isTableRow(lines[index])) {
        tableLines.push(lines[index]);
        index += 1;
      }

      const rows = tableLines
        .filter((row) => !isTableDivider(row))
        .map((row) =>
          row
            .split("|")
            .map((cell) => cell.trim())
            .filter((cell) => cell.length > 0)
        );

      if (rows.length > 0) {
        const [header, ...body] = rows;
        blocks.push(
          <div key={`table-${index}`} className="overflow-x-auto">
            <table className="w-full min-w-[280px] border-collapse text-left text-sm">
              <thead>
                <tr>
                  {header.map((cell, cellIndex) => (
                    <th
                      key={cellIndex}
                      className="border border-koala-primary/15 bg-koala-secondary/25 px-3 py-2 font-semibold"
                    >
                      {formatInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="border border-koala-primary/10 px-3 py-2 align-top"
                      >
                        {formatInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={index} className="mt-5 text-base font-display text-koala-heading">
          {formatInline(line.slice(4))}
        </h3>
      );
      index += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={index} className="mt-6 text-lg font-display text-koala-heading">
          {formatInline(line.slice(3))}
        </h2>
      );
      index += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={index} className="text-xl font-display text-koala-heading">
          {formatInline(line.slice(2))}
        </h1>
      );
      index += 1;
      continue;
    }

    if (line.trim() === "---") {
      blocks.push(<hr key={index} className="my-4 border-koala-primary/15" />);
      index += 1;
      continue;
    }

    if (line.startsWith("> ")) {
      blocks.push(
        <blockquote
          key={index}
          className="rounded-koala border border-koala-primary/15 bg-koala-secondary/15 px-4 py-3 text-sm"
        >
          {formatInline(line.slice(2))}
        </blockquote>
      );
      index += 1;
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      blocks.push(
        <p key={index} className="pl-1 text-sm leading-relaxed">
          {formatInline(line)}
        </p>
      );
      index += 1;
      continue;
    }

    if (line.startsWith("- ")) {
      blocks.push(
        <li key={index} className="ml-5 list-disc text-sm leading-relaxed">
          {formatInline(line.slice(2))}
        </li>
      );
      index += 1;
      continue;
    }

    if (!line.trim()) {
      blocks.push(<div key={index} className="h-2" />);
      index += 1;
      continue;
    }

    blocks.push(
      <p key={index} className="text-sm leading-relaxed text-koala-text">
        {formatInline(line)}
      </p>
    );
    index += 1;
  }

  return <div className="space-y-1">{blocks}</div>;
}
