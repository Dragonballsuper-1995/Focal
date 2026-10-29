import ctypes
from ctypes import wintypes

user32 = ctypes.windll.user32

def list_visible_windows():
    results = []
    
    def enum_proc(hwnd, lParam):
        if user32.IsWindowVisible(hwnd):
            length = user32.GetWindowTextLengthW(hwnd)
            if length > 0:
                buf = ctypes.create_unicode_buffer(length + 1)
                user32.GetWindowTextW(hwnd, buf, length + 1)
                pid = wintypes.DWORD()
                tid = user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
                results.append((hwnd, pid.value, tid, buf.value))
        return True

    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)
    user32.EnumWindows(WNDENUMPROC(enum_proc), 0)
    return results

if __name__ == '__main__':
    windows = list_visible_windows()
    print(f"Total visible windows with title: {len(windows)}")
    for hwnd, pid, tid, title in windows[:20]:
        print(f"HWND: 0x{hwnd:08X} | PID: {pid:5d} | TID: {tid:5d} | Title: {title[:50]}")
