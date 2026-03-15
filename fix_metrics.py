
import re

with open("app/project/[domain]/metrics/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Replace <Card> with <Card className="bg-background shadow-sm border border-content2">
text = re.sub(r"<Card>", r"<Card className=\"bg-background shadow-sm border border-content2\">", text)

# Update CardBody styles to standard
text = re.sub(
    r"<CardBody className=\"text-center\">\s*<div\s+className=(\"[^\"]*text-3xl font-bold[^\"]*\"|`[^\`]*text-3xl font-bold[^\`]*`|{[^}]*text-3xl font-bold[^}]*})>\s*(.*?)\s*</div>\s*<div className=\"text-default-500 mt-1\">\s*(.*?)\s*</div>\s*(?:<div className=\"text-xs text-default-400 mt-0\.5\">\s*(.*?)\s*</div>\s*)?</CardBody>",
    lambda m: f"""<CardBody className=\"flex flex-col justify-center px-6 py-5 gap-2\">
            <span className=\"text-sm font-medium text-default-500 uppercase tracking-wide\">
              {m.group(3).strip()}
            </span>
            <div className=\"flex items-center justify-between\">
              <div className={m.group(1)}>{m.group(2).strip()}</div>
            </div>{f'
