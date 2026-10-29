import ctypes
from ctypes import wintypes
import time
import sys

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

# Switch to default desktop
hDefault = user32.OpenDesktopW("default", 0, False, 0x01FF)
if not hDefault:
    print(f"Failed to open default desktop: {kernel32.GetLastError()}")
    sys.exit(1)
user32.SetThreadDesktop(hDefault)

print("=== DEEP EMPIRICAL ADVERSARIAL TEST: FOCUS, HOTKEYS & LATENCY ===")

# 1. Inspect Foreground Window
fg_hwnd = user32.GetForegroundWindow()
fg_pid = wintypes.DWORD()
fg_tid = user32.GetWindowThreadProcessId(fg_hwnd, ctypes.byref(fg_pid))

buf = ctypes.create_unicode_buffer(512)
user32.GetWindowTextW(fg_hwnd, buf, 512)
title = buf.value

print(f"[Foreground Target]")
print(f"  HWND: 0x{fg_hwnd:08X}")
print(f"  PID:  {fg_pid.value}")
print(f"  TID:  {fg_tid}")
print(f"  Title: '{title}'")

# Create a native Win32 hidden window on default desktop to test window activation
# Define WNDCLASS
WNDPROC = ctypes.WINFUNCTYPE(ctypes.c_long, wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM)

user32.DefWindowProcW.argtypes = [wintypes.HWND, wintypes.UINT, ctypes.c_uint64, ctypes.c_int64]
user32.DefWindowProcW.restype = ctypes.c_int64

def wnd_proc(hwnd, msg, wparam, lparam):
    if msg == 0x0312: # WM_HOTKEY
        print(f"  [Callback] WM_HOTKEY received! wparam={wparam}")
        return 0
    return user32.DefWindowProcW(hwnd, msg, wparam, lparam)

wnd_proc_cb = WNDPROC(wnd_proc)

class WNDCLASSEXW(ctypes.Structure):
    _fields_ = [
        ("cbSize", wintypes.UINT),
        ("style", wintypes.UINT),
        ("lpfnWndProc", WNDPROC),
        ("cbClsExtra", ctypes.c_int),
        ("cbWndExtra", ctypes.c_int),
        ("hInstance", wintypes.HINSTANCE),
        ("hIcon", wintypes.HICON),
        ("hCursor", wintypes.HCURSOR),
        ("hbrBackground", wintypes.HBRUSH),
        ("lpszMenuName", wintypes.LPCWSTR),
        ("lpszClassName", wintypes.LPCWSTR),
        ("hIconSm", wintypes.HICON)
    ]

wc = WNDCLASSEXW()
wc.cbSize = ctypes.sizeof(WNDCLASSEXW)
wc.style = 0
wc.lpfnWndProc = wnd_proc_cb
wc.hInstance = kernel32.GetModuleHandleW(None)
wc.lpszClassName = "RunnerTestClass"

atom = user32.RegisterClassExW(ctypes.byref(wc))
if not atom:
    print(f"RegisterClassExW failed: {kernel32.GetLastError()}")

WS_OVERLAPPEDWINDOW = 0x00CF0000
WS_EX_TOPMOST = 0x00000008
WS_EX_TOOLWINDOW = 0x00000080

test_hwnd = user32.CreateWindowExW(
    WS_EX_TOPMOST | WS_EX_TOOLWINDOW,
    "RunnerTestClass",
    "Runner Empirical Overlay",
    WS_OVERLAPPEDWINDOW,
    100, 100, 500, 300,
    None, None, wc.hInstance, None
)

print(f"[Test Window Created] HWND: 0x{test_hwnd:08X}")

# Test 1: Direct SetForegroundWindow from background (WITHOUT AttachThreadInput)
print("\n--- TEST 1: Direct SetForegroundWindow from background ---")
t0 = time.perf_counter()
res = user32.SetForegroundWindow(test_hwnd)
err = kernel32.GetLastError()
t1 = time.perf_counter()
new_fg = user32.GetForegroundWindow()
success = (new_fg == test_hwnd)
print(f"  Result: {res}, LastError: {err}, Succeeded: {success}")
print(f"  Foreground now: 0x{new_fg:08X} (Test HWND: 0x{test_hwnd:08X})")
print(f"  Latency: {(t1 - t0)*1000:.3f} ms")

# Re-ensure previous window is foreground
if fg_hwnd:
    user32.SetForegroundWindow(fg_hwnd)
    time.sleep(0.1)

# Test 2: The Report's proposed force_activate_window sequence
print("\n--- TEST 2: Report's force_activate_window (AttachThreadInput + SetForegroundWindow) ---")
cur_tid = kernel32.GetCurrentThreadId()
target_fg = user32.GetForegroundWindow()
target_tid = user32.GetWindowThreadProcessId(target_fg, None)

print(f"  Current TID: {cur_tid}, Target FG TID: {target_tid}")
t0 = time.perf_counter()
attached = False
if target_tid and target_tid != cur_tid:
    attached = bool(user32.AttachThreadInput(cur_tid, target_tid, True))
attach_err = kernel32.GetLastError()

user32.ShowWindow(test_hwnd, 5) # SW_SHOW
user32.BringWindowToTop(test_hwnd)
sfw_res = user32.SetForegroundWindow(test_hwnd)
sfw_err = kernel32.GetLastError()

if attached:
    user32.AttachThreadInput(cur_tid, target_tid, False)

user32.SetFocus(test_hwnd)
t1 = time.perf_counter()

final_fg = user32.GetForegroundWindow()
report_success = (final_fg == test_hwnd)
print(f"  AttachThreadInput: {attached}, AttachError: {attach_err}")
print(f"  SetForegroundWindow: {sfw_res}, SFW Error: {sfw_err}")
print(f"  Foreground HWND: 0x{final_fg:08X} (Test HWND: 0x{test_hwnd:08X})")
print(f"  Did force_activate_window succeed in stealing foreground? {report_success}")
print(f"  Latency: {(t1 - t0)*1000:.3f} ms")

# Test 3: LockSetForegroundWindow and AllowSetForegroundWindow
print("\n--- TEST 3: LockSetForegroundWindow / AllowSetForegroundWindow ---")
# Check if foreground lock is active
LSFW_LOCK = 1
LSFW_UNLOCK = 2
ASFW_ANY = 0xFFFFFFFF
allow_res = user32.AllowSetForegroundWindow(ASFW_ANY)
allow_err = kernel32.GetLastError()
print(f"  AllowSetForegroundWindow(ASFW_ANY): {allow_res}, LastError: {allow_err}")

# Test 4: Hotkey Registration Collision & UIPI
print("\n--- TEST 4: Hotkey Registration Collision (Alt+Space & Custom) ---")
MOD_ALT = 0x0001
MOD_CONTROL = 0x0002
MOD_SHIFT = 0x0004
MOD_NOREPEAT = 0x4000
VK_SPACE = 0x20

# Try registering Alt+Space
reg_alt_space = user32.RegisterHotKey(test_hwnd, 1, MOD_ALT | MOD_NOREPEAT, VK_SPACE)
err_alt_space = kernel32.GetLastError()
print(f"  RegisterHotKey(Alt+Space): {reg_alt_space}, LastError: {err_alt_space}")
if err_alt_space == 1409:
    print("  -> CONFIRMED: Error 1409 (ERROR_HOTKEY_ALREADY_REGISTERED). Collision detected.")

# Try alternative hotkey: Ctrl+Alt+Space
reg_ctrl_alt_space = user32.RegisterHotKey(test_hwnd, 2, MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, VK_SPACE)
err_ctrl_alt = kernel32.GetLastError()
print(f"  RegisterHotKey(Ctrl+Alt+Space): {reg_ctrl_alt_space}, LastError: {err_ctrl_alt}")

# Test 5: Latency of Window Show / Hide cycles (Warm Window Toggle)
print("\n--- TEST 5: Warm Window Show/Hide Toggle Latency Benchmark ---")
latencies_show = []
latencies_hide = []

for i in range(50):
    # Hide
    t_h0 = time.perf_counter()
    user32.ShowWindow(test_hwnd, 0) # SW_HIDE
    t_h1 = time.perf_counter()
    latencies_hide.append((t_h1 - t_h0) * 1000)
    
    # Show
    t_s0 = time.perf_counter()
    user32.ShowWindow(test_hwnd, 5) # SW_SHOW
    user32.BringWindowToTop(test_hwnd)
    user32.SetForegroundWindow(test_hwnd)
    t_s1 = time.perf_counter()
    latencies_show.append((t_s1 - t_s0) * 1000)

avg_hide = sum(latencies_hide) / len(latencies_hide)
max_hide = max(latencies_hide)
avg_show = sum(latencies_show) / len(latencies_show)
max_show = max(latencies_show)
p95_show = sorted(latencies_show)[int(len(latencies_show)*0.95)]

print(f"  ShowWindow(SW_HIDE) - Avg: {avg_hide:.3f} ms, Max: {max_hide:.3f} ms")
print(f"  ShowWindow(SW_SHOW) + SFW - Avg: {avg_show:.3f} ms, Max: {max_show:.3f} ms, P95: {p95_show:.3f} ms")

# Clean up
if reg_alt_space:
    user32.UnregisterHotKey(test_hwnd, 1)
if reg_ctrl_alt_space:
    user32.UnregisterHotKey(test_hwnd, 2)

user32.DestroyWindow(test_hwnd)
user32.UnregisterClassW("RunnerTestClass", wc.hInstance)
print("\n=== TEST COMPLETED SUCCESSFULLY ===")
