import ctypes
from ctypes import wintypes
import time

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

hDefault = user32.OpenDesktopW("default", 0, False, 0x01FF)
user32.SetThreadDesktop(hDefault)

high_hwnd = 0x00030450
high_pid = wintypes.DWORD()
high_tid = user32.GetWindowThreadProcessId(high_hwnd, ctypes.byref(high_pid))
my_tid = kernel32.GetCurrentThreadId()

print(f"Testing interaction with High IL window 0x{high_hwnd:08X} (PID: {high_pid.value}, TID: {high_tid}) from Medium IL (TID: {my_tid})")

# 1. AttachThreadInput across IL
res = user32.AttachThreadInput(my_tid, high_tid, True)
err = kernel32.GetLastError()
print(f"AttachThreadInput to High IL TID {high_tid}: Result={res}, LastError={err}")
if res:
    user32.AttachThreadInput(my_tid, high_tid, False)

# 2. SendMessage WM_NULL (0x0000)
res_msg = user32.SendMessageW(high_hwnd, 0, 0, 0)
err_msg = kernel32.GetLastError()
print(f"SendMessage(WM_NULL) to High IL HWND: Result={res_msg}, LastError={err_msg}")

# 3. PostMessage WM_NULL
res_post = user32.PostMessageW(high_hwnd, 0, 0, 0)
err_post = kernel32.GetLastError()
print(f"PostMessage(WM_NULL) to High IL HWND: Result={res_post}, LastError={err_post}")
