import ctypes
from ctypes import wintypes

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

GENERIC_ALL = 0x10000000
DESKTOP_SWITCHDESKTOP = 0x0100
DESKTOP_READOBJECTS = 0x0001
DESKTOP_WRITEOBJECTS = 0x0002

hDefault = user32.OpenDesktopW("default", 0, False, 0x01FF)
err = kernel32.GetLastError()
print(f"OpenDesktop('default') handle: {hDefault}, LastError: {err}")

if hDefault:
    set_res = user32.SetThreadDesktop(hDefault)
    set_err = kernel32.GetLastError()
    print(f"SetThreadDesktop result: {set_res}, LastError: {set_err}")
    
    # Now try enumerating windows on default desktop
    windows = []
    def enum_proc(hwnd, lParam):
        length = user32.GetWindowTextLengthW(hwnd)
        if length > 0:
            buf = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buf, length + 1)
            windows.append((hwnd, buf.value))
        return True

    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)
    user32.EnumDesktopWindows(hDefault, WNDENUMPROC(enum_proc), 0)
    print(f"Total desktop windows on 'default': {len(windows)}")
    for hwnd, title in windows[:15]:
        print(f"  0x{hwnd:08X}: {title}")
