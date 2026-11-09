"""
공통 컴포넌트를 packages/ui(@everp/ui)로 옮기고 앱의 import 를 바꾼다(모노레포 2 카드).
  python3 scripts/codemods/move-to-ui.py
1. git mv src/app/components/common/<Name>.tsx → packages/ui/src/<Name>.tsx (테스트 파일도)
2. 옮긴 파일 안의 import 를 패키지 안 상대 경로로
3. 앱 전체의 import 를 '@everp/ui' 이름 있는 import 로. default import 는 { Name } 으로
4. packages/ui/src/index.ts 를 만든다(default 와 named export 를 모두 다시 내보냄)
"""
import os, re, subprocess, pathlib

ROOT = pathlib.Path.cwd()
COMMON = ROOT / "src/app/components/common"
UI = ROOT / "packages/ui/src"
NAMES = ["Button","ConflictDialog","ErrorBoundary","ErrorMessage","Flex","IconButton","Input","Label",
         "LoadingMessage","LoadingSpinner","Modal","ModalStatusBox","PageTitle","Pagination","PopoverPortal",
         "SimplePagination","Spacing","TabButtons","Table","Dropdown","SlidingNavBar","InputList","SearchBar",
         "DropdownInputModal","DropdownInputListModal"]
UI.mkdir(parents=True, exist_ok=True)
(UI / "hooks").mkdir(exist_ok=True)

def git_mv(src, dst):
    subprocess.run(["git", "mv", str(src), str(dst)], check=True)

# 1. 옮기기
for n in NAMES:
    git_mv(COMMON / f"{n}.tsx", UI / f"{n}.tsx")
    t = COMMON / f"{n}.test.tsx"
    if t.exists(): git_mv(t, UI / f"{n}.test.tsx")
git_mv(ROOT / "src/app/hooks/useCloseOnEscape.ts", UI / "hooks/useCloseOnEscape.ts")

# 2. 옮긴 파일 안 import
for f in list(UI.glob("*.tsx")) + list(UI.glob("hooks/*.ts")):
    s = f.read_text(); o = s
    for n in NAMES:
        s = re.sub(rf"from '(@/app/components/common|\.)/{n}'", f"from './{n}'" if f.parent == UI else f"from '../{n}'", s)
    s = s.replace("from '@/app/types/CommonType'", "from './types'")
    s = s.replace("from '@/app/hooks/useCloseOnEscape'", "from './hooks/useCloseOnEscape'")
    if s != o: f.write_text(s)

# 3. 앱 import 바꾸기
IMPORT = re.compile(r"import (type )?([^;]*?) from '([^']+)';", re.S)
def target(spec, file):
    if spec.startswith("@/app/components/common/"):
        name = spec[len("@/app/components/common/"):]
    elif spec.startswith("."):
        full = pathlib.Path(os.path.normpath(file.parent / spec))
        if full.parent != COMMON and not (full.parent == ROOT / "src/app/hooks"): return None
        name = full.name
        if full.parent == ROOT / "src/app/hooks":
            return "useCloseOnEscape" if name == "useCloseOnEscape" else None
    elif spec == "@/app/hooks/useCloseOnEscape":
        return "useCloseOnEscape"
    else:
        return None
    return name if name in NAMES else None

changed = 0
for f in list((ROOT / "src").rglob("*.ts")) + list((ROOT / "src").rglob("*.tsx")):
    s = f.read_text(); o = s
    def rep(m):
        is_type, clause, spec = m.group(1), m.group(2).strip(), m.group(3)
        name = target(spec, f)
        if not name: return m.group(0)
        parts = []
        default, named = None, None
        if clause.startswith("{"):
            named = clause
        elif "," in clause:
            default, named = [c.strip() for c in clause.split(",", 1)]
        else:
            default = clause
        if default:
            parts.append(name if default == name else f"{name} as {default}")
        if named:
            parts += [p.strip() for p in named.strip("{} \n").split(",") if p.strip()]
        return f"import {is_type or ''}{{ {', '.join(parts)} }} from '@everp/ui';"
    s = IMPORT.sub(rep, s)
    if s != o:
        f.write_text(s); changed += 1
print("앱 파일 import 바꿈:", changed)

# 4. index.ts
lines = ["/**", " * @everp/ui 공개 API(모노레포 2 카드). 앱은 여기서만 가져온다.",
         " * sideEffects: false 라 쓰지 않는 컴포넌트는 번들에서 빠진다(번들 예산 검사로 확인).", " */"]
for n in NAMES:
    src = (UI / f"{n}.tsx").read_text()
    named = re.findall(r"^export (?:const|function|class) (\w+)", src, re.M)
    types = re.findall(r"^export (?:interface|type) (\w+)", src, re.M)
    if re.search(r"^export default", src, re.M):
        lines.append(f"export {{ default as {n} }} from './{n}';")
    if named: lines.append(f"export {{ {', '.join(named)} }} from './{n}';")
    if types: lines.append(f"export type {{ {', '.join(types)} }} from './{n}';")
lines.append("export { useCloseOnEscape } from './hooks/useCloseOnEscape';")
lines.append("export type { KeyValueItem } from './types';")
(UI / "index.ts").write_text("\n".join(lines) + "\n")
