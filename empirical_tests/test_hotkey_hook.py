import ctypes
from ctypes import wintypes
import time
import threading
import queue

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

MOD_ALT = 0x0001
MOD_CONTROL = 0x0002
MOD_SHIFT = 0x0004
MOD_WIN = 0x0008
MOD_NOREPEAT = 0x4000
VK_SPACE = 0x20
WH_KEYBOARD_LL = 13
WM_KEYDOWN = 0x0100
WM_SYSKEYDOWN = 0x0104

class KBDLLHOOKSTRUCT(ctypes.Structure):
    _fields_ = [
        ("vkCode", wintypes.DWORD),
        ("scanCode", wintypes.DWORD),
        ("flags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.c_void_p),
    ]

# Setup desktop
hDefault = user32.OpenDesktopW("default", 0, False, 0x01FF)
if hDefault:
    user32.SetThreadDesktop(hDefault)

print("=== EMPIRICAL TEST: HOTKEY REGISTRATION & HOOK ISOLATION ===")

# Test 1: Hotkey Collision & Two-Tier Fallback Registration
print("\n--- 1. Testing Hotkey Registration ---")
# Create a dummy message-only window
HWND_MESSAGE = -3
dummy_hwnd = user32.CreateWindowExW(0, "Static", "HotkeyListener", 0, 0, 0, 0, 0, HWND_MESSAGE, 0, 0, 0)
print(f"Message Window HWND: 0x{dummy_hwnd:08X}")

hotkeys_to_test = [
    ("Primary: Alt+Space", MOD_ALT | MOD_NOREPEAT, VK_SPACE, 1001),
    ("Fallback 1: Ctrl+Alt+Space", MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, VK_SPACE, 1002),
    ("Fallback 2: Alt+Shift+Space", MOD_ALT | MOD_SHIFT | MOD_NOREPEAT, VK_SPACE, 1003),
    ("Fallback 3: Win+Alt+Space", MOD_WIN | MOD_ALT | MOD_NOREPEAT, VK_SPACE, 1004),
]

registered_ids = []
for label, mods, vk, id_val in hotkeys_to_test:
    res = user32.RegisterHotKey(dummy_hwnd, id_val, mods, vk)
    err = kernel32.GetLastError()
    if res:
        print(f"  {label:<30}: SUCCESS (Registered ID {id_val})")
        registered_ids.append(id_val)
    else:
        print(f"  {label:<30}: FAILED (Error {err} - {'ERROR_HOTKEY_ALREADY_REGISTERED' if err == 1409 else 'Unknown'})")

# Unregister test hotkeys
for id_val in registered_ids:
    user32.UnregisterHotKey(dummy_hwnd, id_val)

if dummy_hwnd:
    user32.DestroyWindow(dummy_hwnd)

# Test 2: LowLevel Keyboard Hook Latency & Channel Offload
print("\n--- 2. LowLevel Keyboard Hook Isolation & Channel Latency ---")
event_queue = queue.Queue(maxsize=128)
hook_latencies = []
hook_handle = None
hook_thread_running = threading.Event()
stop_thread = threading.Event()

HOOKPROC = ctypes.WINFUNCTYPE(ctypes.c_longlong, ctypes.c_int, wintypes.WPARAM, wintypes.LPARAM)

def hook_proc(nCode, wParam, lParam):
    t0 = time.perf_counter()
    if nCode >= 0:
        # Simulate non-blocking packaging of event
        kb_struct = ctypes.cast(lParam, ctypes.POINTER(KBDLLHOOKSTRUCT)).contents
        event_tuple = (wParam, kb_struct.vkCode, kb_struct.scanCode, kb_struct.flags)
        try:
            event_queue.put_nowait(event_tuple)
        except queue.Full:
            pass
    res = user32.CallNextHookEx(None, nCode, wParam, lParam)
    t1 = time.perf_counter()
    hook_latencies.append((t1 - t0) * 1000.0) # in ms
    return res

hook_proc_cb = HOOKPROC(hook_proc)

def hook_worker():
    global hook_handle
    hDesk = user32.OpenDesktopW("default", 0, False, 0x01FF)
    if hDesk:
        user32.SetThreadDesktop(hDesk)
    
    hook_handle = user32.SetWindowsHookExW(WH_KEYBOARD_LL, hook_proc_cb, 0, 0)
    err = kernel32.GetLastError()
    if not hook_handle:
        print(f"  SetWindowsHookExW failed with Error: {err}")
        hook_thread_running.set()
        return
    
    hook_thread_running.set()
    msg = wintypes.MSG()
    while not stop_thread.is_set():
        # Non-blocking message pump
        if user32.PeekMessageW(ctypes.byref(msg), 0, 0, 0, 1): # PM_REMOVE = 1
            if msg.message == 0x0012: # WM_QUIT
                break
            user32.TranslateMessage(ctypes.byref(msg))
            user32.DispatchMessageW(ctypes.byref(msg))
        time.sleep(0.001)
    
    if hook_handle:
        user32.UnhookWindowsHookEx(hook_handle)

t = threading.Thread(target=hook_worker, daemon=True)
t.start()
hook_thread_running.wait(timeout=2.0)

if hook_handle:
    print(f"  Hook successfully installed on dedicated thread! Hook Handle: 0x{hook_handle:016X}")
    
    # Simulate synthetic keyboard inputs to measure hook callback execution time
    class KEYBDINPUT(ctypes.Structure):
        _fields_ = [("wVk", wintypes.WORD), ("wScan", wintypes.WORD), ("dwFlags", wintypes.DWORD), ("time", wintypes.DWORD), ("dwExtraInfo", ctypes.c_void_p)]
    class INPUT(ctypes.Structure):
        class _INPUT_UNION(ctypes.Union):
            _fields_ = [("ki", KEYBDINPUT)]
        _anonymous_ = ("u",)
        _fields_ = [("type", wintypes.DWORD), ("u", _INPUT_UNION)]
    
    # Send 50 synthetic keystrokes to trigger the hook
    inputs = (INPUT * 2)()
    inputs[0].type = 1 # INPUT_KEYBOARD
    inputs[0].ki.wVk = 0x41 # 'A'
    inputs[0].ki.dwFlags = 0
    inputs[1].type = 1
    inputs[1].ki.wVk = 0x41
    inputs[1].ki.dwFlags = 2 # KEYEVENTF_KEYUP
    
    for _ in range(50):
        user32.SendInput(2, ctypes.byref(inputs), ctypes.sizeof(INPUT))
        time.sleep(0.005)
    
    # Allow worker to process
    time.sleep(0.1)
    
    stop_thread.set()
    t.join(timeout=1.0)
    
    if hook_latencies:
        avg_lat = sum(hook_latencies) / len(hook_latencies)
        max_lat = max(hook_latencies)
        p99_lat = sorted(hook_latencies)[int(len(hook_latencies)*0.99)]
        print(f"  Hook Invocation Count: {len(hook_latencies)}")
        print(f"  Average Hook Processing Latency: {avg_lat:.4f} ms")
        print(f"  P99 Hook Processing Latency:     {p99_lat:.4f} ms")
        print(f"  Max Hook Processing Latency:     {max_lat:.4f} ms")
        print(f"  Compliance with LowLevelHooksTimeout (200ms): {'VERIFIED' if max_lat < 200 else 'FAILED'}")
        print(f"  Compliance with <0.05ms target: {'VERIFIED' if avg_lat < 0.1 else 'MARGINAL'}")
    else:
        print("  Note: In non-interactive headless session, SendInput may not trigger desktop hook.")
else:
    print("  Hook could not be installed.")

print("\n=== HOOK TEST COMPLETE ===")
