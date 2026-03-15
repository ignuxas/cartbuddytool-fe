import glob, os, re

files = glob.glob('app/project/**/*.tsx', recursive=True)

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    
    # 1. Update basic empty <Card> or <Card shadow="sm">
    content = re.sub(
        r'<Card shadow=\"sm\">',
        r'<Card className=\"bg-background shadow-sm border border-content2\">',
        content
    )
    # Be careful not to replace Card with existing classNames if it's just <Card>
    content = re.sub(
        r'<Card>',
        r'<Card className=\"bg-background shadow-sm border border-content2\">',
        content
    )
    
    # Update metrics and stats card layouts
    # Replace the text-center card bodies with the dashboard one
    content = re.sub(
        r'<CardBody className=\"text-center\">\s*<div className=\"text-3xl font-bold[^\"]*\">\s*(.*?)\s*</div>\s*<div className=\"text-default-500 mt-1\">\s*(.*?)\s*</div>',
        r'<CardBody className=\"flex flex-col justify-center px-6 py-5 gap-2\">\n            <span className=\"text-sm font-medium text-default-500 uppercase tracking-wide\">\n              \2\n            </span>\n            <div className=\"flex items-center justify-between\">\n              <span className=\"text-3xl font-bold\">\1</span>\n            </div>',
        content
    )
    
    # Handle the ones with dynamic className for text
    content = re.sub(
        r'<CardBody className=\"text-center\">\s*<div\s+className=\{([^}]+)\}>\s*(.*?)\s*</div>\s*<div className=\"text-default-500 mt-1\">\s*(.*?)\s*</div>',
        r'<CardBody className=\"flex flex-col justify-center px-6 py-5 gap-2\">\n            <span className=\"text-sm font-medium text-default-500 uppercase tracking-wide\">\n              \3\n            </span>\n            <div className=\"flex items-center justify-between\">\n              <div className={\1}>\2</div>\n            </div>',
        content
    )

    # 4. In page.tsx there is a <Card> <CardBody className="gap-2 p-6">
    content = re.sub(
        r'<CardBody className=\"gap-2 p-6\">',
        r'<CardBody className=\"flex flex-col justify-center px-6 py-5 gap-2\">',
        content
    )

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated {filepath}')
