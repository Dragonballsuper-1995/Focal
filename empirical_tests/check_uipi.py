import ctypes
from ctypes import wintypes
import sys

advapi32 = ctypes.windll.advapi32
kernel32 = ctypes.windll.kernel32
user32 = ctypes.windll.user32

advapi32.GetSidSubAuthorityCount.argtypes = [ctypes.c_void_p]
advapi32.GetSidSubAuthorityCount.restype = ctypes.c_void_p
advapi32.GetSidSubAuthority.argtypes = [ctypes.c_void_p, wintypes.DWORD]
advapi32.GetSidSubAuthority.restype = ctypes.c_void_p
kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
kernel32.OpenProcess.restype = wintypes.HANDLE


TOKEN_QUERY = 0x0008
TokenIntegrityLevel = 25

class SID_AND_ATTRIBUTES(ctypes.Structure):
    _fields_ = [
        ("Sid", ctypes.c_void_p),
        ("Attributes", wintypes.DWORD)
    ]

class TOKEN_MANDATORY_LABEL(ctypes.Structure):
    _fields_ = [
        ("Label", SID_AND_ATTRIBUTES)
    ]

def get_process_integrity_level(pid):
    hProc = kernel32.OpenProcess(0x1000, False, pid) # PROCESS_QUERY_LIMITED_INFORMATION
    if not hProc:
        return "AccessDenied"
    try:
        hToken = wintypes.HANDLE()
        if not advapi32.OpenProcessToken(hProc, TOKEN_QUERY, ctypes.byref(hToken)):
            return "NoToken"
        try:
            dwLen = wintypes.DWORD()
            advapi32.GetTokenInformation(hToken, TokenIntegrityLevel, None, 0, ctypes.byref(dwLen))
            buf = (ctypes.c_byte * dwLen.value)()
            if not advapi32.GetTokenInformation(hToken, TokenIntegrityLevel, buf, dwLen, ctypes.byref(dwLen)):
                return "FailedInfo"
            tml = TOKEN_MANDATORY_LABEL.from_buffer(buf)
            subauth_count_ptr = advapi32.GetSidSubAuthorityCount(tml.Label.Sid)
            if not subauth_count_ptr:
                return "NoSubAuth"
            count = ctypes.cast(subauth_count_ptr, ctypes.POINTER(ctypes.c_ubyte)).contents.value
            subauth_ptr = advapi32.GetSidSubAuthority(tml.Label.Sid, count - 1)
            rid = ctypes.cast(subauth_ptr, ctypes.POINTER(wintypes.DWORD)).contents.value
            if rid < 0x2000:
                return "Low"
            elif rid < 0x3000:
                return "Medium"
            elif rid < 0x4000:
                return "High"
            elif rid >= 0x4000:
                return "System"
            return f"0x{rid:X}"
        finally:
            kernel32.CloseHandle(hToken)
    finally:
        kernel32.CloseHandle(hProc)

my_pid = kernel32.GetCurrentProcessId()
print(f"Current Process PID: {my_pid}, Integrity Level: {get_process_integrity_level(my_pid)}")

# Check visible top-level windows and their integrity levels
hDefault = user32.OpenDesktopW("default", 0, False, 0x01FF)
user32.SetThreadDesktop(hDefault)

windows = []
def enum_proc(hwnd, lParam):
    if user32.IsWindowVisible(hwnd):
        length = user32.GetWindowTextLengthW(hwnd)
        if length > 0:
            buf = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buf, length + 1)
            pid = wintypes.DWORD()
            tid = user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            il = get_process_integrity_level(pid.value)
            windows.append((hwnd, pid.value, tid, il, buf.value))
    return True

WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)
user32.EnumDesktopWindows(hDefault, WNDENUMPROC(enum_proc), 0)

print(f"\n--- VISIBLE WINDOWS AND INTEGRITY LEVELS (Count: {len(windows)}) ---")
for hwnd, pid, tid, il, title in windows:
    if il in ("High", "System", "AccessDenied") or "Task" in title or "Raycast" in title:
        print(f"HWND: 0x{hwnd:08X} | PID: {pid:5d} | TID: {tid:5d} | IL: {il:12s} | Title: {title[:50]}")
