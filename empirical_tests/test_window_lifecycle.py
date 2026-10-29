import ctypes
from ctypes import wintypes
import time
import statistics

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

hDefault = user32.OpenDesktopW("default", 0, False, 0x01FF)
if hDefault:
    user32.SetThreadDesktop(hDefault)

print("=== EMPIRICAL TEST: WINDOW LIFECYCLE & TOGGLE LATENCY ===")

# Register test window class
WNDPROC = ctypes.WINFUNCTYPE(ctypes.c_longlong, wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM)
user32.DefWindowProcW.argtypes = [wintypes.HWND, wintypes.UINT, ctypes.c_uint64, ctypes.c_int64]
user32.DefWindowProcW.restype = ctypes.c_int64

def wnd_proc(hwnd, msg, wparam, lparam):
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
wc.lpszClassName = "WarmPoolTestClass"

atom = user32.RegisterClassExW(ctypes.byref(wc))

# 1. Measure Cold Window Creation & Destruction vs Warm Window Show/Hide
WS_POPUP = 0x80000000
WS_EX_TOPMOST = 0x00000008
WS_EX_TOOLWINDOW = 0x00000080

print("\n--- 1. Cold Creation Benchmark (50 iterations) ---")
cold_latencies = []
for _ in range(50):
    t0 = time.perf_counter()
    hwnd = user32.CreateWindowExW(
        WS_EX_TOPMOST | WS_EX_TOOLWINDOW,
        "WarmPoolTestClass", "ColdWindow",
        WS_POPUP, 100, 100, 600, 400, None, None, wc.hInstance, None
    )
    user32.ShowWindow(hwnd, 5) # SW_SHOW
    user32.UpdateWindow(hwnd)
    user32.DestroyWindow(hwnd)
    t1 = time.perf_counter()
    cold_latencies.append((t1 - t0) * 1000.0)

print(f"  Cold Creation + Destroy (Native Win32 bare window):")
print(f"    Avg: {statistics.mean(cold_latencies):.3f} ms | P95: {statistics.quantiles(cold_latencies, n=20)[18]:.3f} ms | Max: {max(cold_latencies):.3f} ms")
print(f"  Note: In WebView2, cold instantiation additionally includes WebProcess bootstrap (500ms - 1500ms).")

# 2. Warm Hidden Window Show / Hide Benchmark (200 iterations)
print("\n--- 2. Warm Window Show/Hide Lifecycle Benchmark (200 iterations) ---")
warm_hwnd = user32.CreateWindowExW(
    WS_EX_TOPMOST | WS_EX_TOOLWINDOW,
    "WarmPoolTestClass", "WarmWindow",
    WS_POPUP, 100, 100, 600, 400, None, None, wc.hInstance, None
)

# Start hidden
user32.ShowWindow(warm_hwnd, 0) # SW_HIDE

toggle_show_latencies = []
toggle_hide_latencies = []

for _ in range(200):
    # Measure SHOW + Activate
    t0 = time.perf_counter()
    user32.ShowWindow(warm_hwnd, 5) # SW_SHOW
    user32.SetForegroundWindow(warm_hwnd)
    t1 = time.perf_counter()
    toggle_show_latencies.append((t1 - t0) * 1000.0)
    
    # Measure HIDE
    t2 = time.perf_counter()
    user32.ShowWindow(warm_hwnd, 0) # SW_HIDE
    t3 = time.perf_counter()
    toggle_hide_latencies.append((t3 - t2) * 1000.0)

print(f"  Warm Show + SetForegroundWindow Latency:")
print(f"    Avg: {statistics.mean(toggle_show_latencies):.4f} ms")
print(f"    P50: {statistics.median(toggle_show_latencies):.4f} ms")
print(f"    P95: {statistics.quantiles(toggle_show_latencies, n=20)[18]:.4f} ms")
print(f"    P99: {statistics.quantiles(toggle_show_latencies, n=100)[98]:.4f} ms")
print(f"    Max: {max(toggle_show_latencies):.4f} ms")

print(f"\n  Warm Hide Latency:")
print(f"    Avg: {statistics.mean(toggle_hide_latencies):.4f} ms")
print(f"    Max: {max(toggle_hide_latencies):.4f} ms")

# Clean up
user32.DestroyWindow(warm_hwnd)
user32.UnregisterClassW("WarmPoolTestClass", wc.hInstance)

print("\n=== LIFECYCLE BENCHMARK COMPLETE ===")
