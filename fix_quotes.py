import glob, os

files = glob.glob('app/project/**/*.tsx', recursive=True)

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content.replace('className=\\"', 'className="')
    new_content = new_content.replace('\\">', '">')
    # clean up remaining \"
    new_content = new_content.replace('\\"', '"')

    # Remove extra newlines that the script incorrectly inserted if any \n were inserted as text
    new_content = new_content.replace('\\n', '\n')

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Fixed {filepath}')
