import { readFileSync } from "fs";
import path from "path";

type LegalHtmlPageProps = {
  fileName: string;
};

function extract(pattern: RegExp, html: string) {
  return html.match(pattern)?.[1] ?? "";
}

export function LegalHtmlPage({ fileName }: LegalHtmlPageProps) {
  const filePath = path.join(process.cwd(), "legal", fileName);
  const html = readFileSync(filePath, "utf8");
  const style = extract(/<style>([\s\S]*?)<\/style>/i, html);
  const body = extract(/<body>([\s\S]*?)<\/body>/i, html);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: style }} />
      <div dangerouslySetInnerHTML={{ __html: body }} />
    </>
  );
}
