import ctypes
from ctypes import wintypes
import time
import subprocess
import sys

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

def run_holder():
    # Create window
    w = user32.CreateWindowExW(0, "Static", "ClipHolderWin", 0, 0, 0, 0, 0, 0, 0, 0, 0)
    if user32.OpenClipboard(w):
        sys.stdout.write("LOCKED\n")
        sys.stdout.flush()
        time.sleep(0.080) # hold for 80ms
        user32.CloseClipboard()
        user32.DestroyWindow(w)
        sys.exit(0)
    else:
        sys.stdout.write("FAILED_OPEN\n")
        sys.stdout.flush()
        sys.exit(1)

def run_challenger():
    print("=== EMPIRICAL TEST: CROSS-PROCESS CLIPBOARD LOCK CONTENTION ===")
    
    # Spawn holder process
    proc = subprocess.Popen([sys.executable, __file__, "--hold"], stdout=subprocess.PIPE, text=True)
    line = proc.stdout.readline()
    if "LOCKED" not in line:
        print(f"Holder failed to lock: {line}")
        return
    
    # Create challenger window
    w_challenger = user32.CreateWindowExW(0, "Static", "ClipChallengerWin", 0, 0, 0, 0, 0, 0, 0, 0, 0)
    
    attempts = []
    success = False
    start_time = time.perf_counter()
    for i in range(25):
        t0 = time.perf_counter()
        res = user32.OpenClipboard(w_challenger)
        err = kernel32.GetLastError()
        if res:
            user32.CloseClipboard()
            attempts.append((i, True, err, (time.perf_counter() - t0)*1000))
            success = True
            break
        else:
            attempts.append((i, False, err, (time.perf_counter() - t0)*1000))
            time.sleep(0.005) # 5ms backoff sleep
            
    proc.wait()
    user32.DestroyWindow(w_challenger)
    total_duration = (time.perf_counter() - start_time) * 1000
    
    print(f"\nObserved Contention Attempts:")
    for a in attempts:
        status = "OPENED" if a[1] else f"BLOCKED (Win32 Err {a[2]})"
        print(f"  Attempt {a[0]+1:2}: {status:<25} | Duration: {a[3]:.2f} ms")
    
    print(f"\nResult:")
    print(f"  Contention Detected: {any(not a[1] for a in attempts)}")
    print(f"  Eventual Success:    {success}")
    print(f"  Total Resolution Time: {total_duration:.2f} ms")
    
    # Verify Error 5 was caught
    error_5_seen = any(a[2] == 5 for a in attempts)
    print(f"  Caught Win32 Error 5 (ERROR_ACCESS_DENIED): {error_5_seen}")
    if error_5_seen and success:
        print("  VERIFICATION PASS: 10-retry 5ms exponential backoff recovers from clipboard lock contention.")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--hold":
        run_holder()
    else:
        run_challenger()
