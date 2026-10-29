import ctypes
from ctypes import wintypes
import os
import sys
import subprocess
import json
import time

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32
advapi32 = ctypes.windll.advapi32

PROCESS_QUERY_INFORMATION = 0x0400
PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
TOKEN_QUERY = 0x0008
TokenIntegrityLevel = 25

class SID_AND_ATTRIBUTES(ctypes.Structure):
    _fields_ = [
        ("Sid", ctypes.c_void_p),
        ("Attributes", wintypes.DWORD),
    ]

class TOKEN_MANDATORY_LABEL(ctypes.Structure):
    _fields_ = [
        ("Label", SID_AND_ATTRIBUTES),
    ]

advapi32.GetSidSubAuthorityCount.argtypes = [ctypes.c_void_p]
advapi32.GetSidSubAuthorityCount.restype = ctypes.POINTER(ctypes.c_ubyte)
advapi32.GetSidSubAuthority.argtypes = [ctypes.c_void_p, wintypes.DWORD]
advapi32.GetSidSubAuthority.restype = ctypes.POINTER(wintypes.DWORD)

def get_process_integrity_level(pid):
    hProcess = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
    if not hProcess:
        err = kernel32.GetLastError()
        return None, f"OpenProcess Err {err}"
    
    hToken = wintypes.HANDLE()
    if not advapi32.OpenProcessToken(hProcess, TOKEN_QUERY, ctypes.byref(hToken)):
        err = kernel32.GetLastError()
        kernel32.CloseHandle(hProcess)
        return None, f"OpenToken Err {err}"
    
    dwLength = wintypes.DWORD()
    advapi32.GetTokenInformation(hToken, TokenIntegrityLevel, None, 0, ctypes.byref(dwLength))
    
    buf = ctypes.create_string_buffer(dwLength.value)
    if not advapi32.GetTokenInformation(hToken, TokenIntegrityLevel, buf, dwLength.value, ctypes.byref(dwLength)):
        err = kernel32.GetLastError()
        kernel32.CloseHandle(hToken)
        kernel32.CloseHandle(hProcess)
        return None, f"GetTokenInfo Err {err}"
    
    tml = ctypes.cast(buf, ctypes.POINTER(TOKEN_MANDATORY_LABEL)).contents
    pSid = tml.Label.Sid
    
    count_ptr = advapi32.GetSidSubAuthorityCount(pSid)
    count = count_ptr.contents.value
    
    sub_auth_ptr = advapi32.GetSidSubAuthority(pSid, count - 1)
    il_value = sub_auth_ptr.contents.value
    
    kernel32.CloseHandle(hToken)
    kernel32.CloseHandle(hProcess)
    
    il_names = {
        0x0000: "Untrusted",
        0x1000: "Low",
        0x2000: "Medium",
        0x3000: "High",
        0x4000: "System",
    }
    return il_value, il_names.get(il_value, f"0x{il_value:04X}")

def test_uipi_interactions():
    hDefault = user32.OpenDesktopW("default", 0, False, 0x01FF)
    if hDefault:
        user32.SetThreadDesktop(hDefault)

    print(f"Current Process PID: {os.getpid()}")
    my_il_val, my_il_name = get_process_integrity_level(os.getpid())
    print(f"Current Process Integrity Level: {my_il_name} (0x{my_il_val:04X})")
    
    # Enumerate top-level windows and check their IL and AttachThreadInput
    hwnds = []
    def enum_cb(hwnd, lparam):
        if user32.IsWindowVisible(hwnd):
            pid = wintypes.DWORD()
            tid = user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            length = user32.GetWindowTextLengthW(hwnd)
            if length > 0:
                buf = ctypes.create_unicode_buffer(length + 1)
                user32.GetWindowTextW(hwnd, buf, length + 1)
                hwnds.append((hwnd, pid.value, tid, buf.value))
        return True
    
    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)
    user32.EnumWindows(WNDENUMPROC(enum_cb), 0)
    
    cur_tid = kernel32.GetCurrentThreadId()
    
    print("\n--- Window Integrity & AttachThreadInput Test ---")
    print(f"{'HWND':10} | {'PID':6} | {'TID':6} | {'Integrity':10} | {'AttachThreadInput':18} | {'Title'}")
    print("-" * 80)
    
    tested_ils = set()
    for hwnd, pid, tid, title in hwnds[:30]:
        il_val, il_str = get_process_integrity_level(pid)
        tested_ils.add(il_str)
        
        # Test AttachThreadInput
        attached = user32.AttachThreadInput(cur_tid, tid, True)
        attach_err = kernel32.GetLastError()
        if attached:
            user32.AttachThreadInput(cur_tid, tid, False) # Detach immediately
            attach_res_str = "SUCCESS"
        else:
            attach_res_str = f"FAILED (Err {attach_err})"
        
        # Test fallback activation when AttachThreadInput fails with Error 5
        if not attached and attach_err == 5:
            user32.AllowSetForegroundWindow(0xFFFFFFFF) # ASFW_ANY
            sfw_ok = user32.SetForegroundWindow(hwnd)
            sfw_err = kernel32.GetLastError()
            print(f"   -> Fallback SetForegroundWindow on High IL (0x{hwnd:08X}): {bool(sfw_ok)}, LastError: {sfw_err}")
            
            # Test synthetic SendInput to High IL window
            # Construct a dummy keypress (e.g. VK_SHIFT keydown/keyup)
            class KEYBDINPUT(ctypes.Structure):
                _fields_ = [("wVk", wintypes.WORD), ("wScan", wintypes.WORD), ("dwFlags", wintypes.DWORD), ("time", wintypes.DWORD), ("dwExtraInfo", ctypes.c_void_p)]
            class INPUT(ctypes.Structure):
                class _INPUT_UNION(ctypes.Union):
                    _fields_ = [("ki", KEYBDINPUT)]
                _anonymous_ = ("u",)
                _fields_ = [("type", wintypes.DWORD), ("u", _INPUT_UNION)]
            
            inp = INPUT()
            inp.type = 1 # INPUT_KEYBOARD
            inp.ki.wVk = 0x10 # VK_SHIFT
            inp.ki.dwFlags = 0
            
            sent = user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))
            send_err = kernel32.GetLastError()
            print(f"   -> SendInput attempted from Medium IL: sent={sent}, LastError={send_err}")
            
        print(f"0x{hwnd:08X} | {pid:6} | {tid:6} | {str(il_str):10} | {attach_res_str:18} | {title[:30]}")

if __name__ == "__main__":
    test_uipi_interactions()
