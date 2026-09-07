import os
import ast

def check_file(filepath):
    try:
        with open(filepath, "r") as f:
            content = f.read()
        tree = ast.parse(content)
    except Exception as e:
        print(f"Failed to parse {filepath}: {e}")
        return

    # Check 1: bare excepts or except Exception without logging
    for node in ast.walk(tree):
        if isinstance(node, ast.ExceptHandler):
            # Check if it has a logger call
            has_log = False
            for child in ast.walk(node):
                if isinstance(child, ast.Call) and isinstance(child.func, ast.Attribute):
                    if child.func.attr in ('error', 'warning', 'exception'):
                        has_log = True
            
            # Allow pass or continue
            is_pass = any(isinstance(s, (ast.Pass, ast.Continue)) for s in node.body)
            if not has_log and not is_pass:
                # Get line number
                print(f"[{filepath}:{node.lineno}] Caught exception without logging or pass.")

def main():
    backend_dir = "/home/shivaji/Desktop/TRINETRA/trinetra/backend"
    for root, _, files in os.walk(backend_dir):
        for file in files:
            if file.endswith(".py") and "venv" not in root and "migrations" not in root:
                check_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
