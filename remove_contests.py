import os

files_to_modify = [
    'problems.html',
    'stats.html',
    'discuss.html',
    'bookmarks.html',
    'settings.html'
]

block_to_remove = """        <a href="contests.html" class="sidebar-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
          <span>Contests</span>
        </a>"""

for file_name in files_to_modify:
    path = os.path.join(r'd:\coding-signin', file_name)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = content.replace(block_to_remove, '')
        
        # In case line endings are different
        block_crlf = block_to_remove.replace('\n', '\r\n')
        new_content = new_content.replace(block_crlf, '')
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file_name}")
