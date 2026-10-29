using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace EmpiricalFocusTest2
{
    class Program
    {
        [DllImport("user32.dll", SetLastError = true)]
        static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll", SetLastError = true)]
        static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("kernel32.dll")]
        static extern uint GetCurrentThreadId();

        [DllImport("user32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, [MarshalAs(UnmanagedType.Bool)] bool fAttach);

        [DllImport("user32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        static extern bool BringWindowToTop(IntPtr hWnd);

        [DllImport("user32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll", SetLastError = true)]
        static extern IntPtr SetFocus(IntPtr hWnd);

        [DllImport("user32.dll", SetLastError = true)]
        static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

        [DllImport("user32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

        [DllImport("user32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        static extern bool UnregisterHotKey(IntPtr hWnd, int id);

        [DllImport("user32.dll")]
        static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
        delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

        const int SW_SHOW = 5;
        const int SW_HIDE = 0;
        const uint MOD_ALT = 0x0001;
        const uint VK_SPACE = 0x20;

        static Form testForm;
        static IntPtr externalTargetHwnd = IntPtr.Zero;

        static void Main(string[] args)
        {
            Console.WriteLine("=== EMPIRICAL TEST 2: Real Foreground HWND Tracking & Focus Transfer ===");

            // Create test form
            AutoResetEvent formReady = new AutoResetEvent(false);
            Thread formThread = new Thread(() =>
            {
                testForm = new Form();
                testForm.Text = "RunnerEmpiricalWindow";
                testForm.Width = 400;
                testForm.Height = 300;
                testForm.Load += (s, e) => formReady.Set();
                Application.Run(testForm);
            });
            formThread.SetApartmentState(ApartmentState.STA);
            formThread.Start();
            formReady.WaitOne();

            IntPtr runnerHwnd = IntPtr.Zero;
            testForm.Invoke(new Action(() => runnerHwnd = testForm.Handle));
            Console.WriteLine(string.Format("[Setup] Runner Form HWND: 0x{0:X}", runnerHwnd.ToInt64()));

            // Find an existing top-level window (e.g. Explorer, VS Code, or console)
            EnumWindows((hwnd, lparam) =>
            {
                StringBuilder sb = new StringBuilder(256);
                GetWindowText(hwnd, sb, 256);
                string title = sb.ToString();
                if (!string.IsNullOrEmpty(title) && (title.Contains("Visual Studio Code") || title.Contains("Command Prompt") || title.Contains("PowerShell") || title.Contains("Explorer")))
                {
                    externalTargetHwnd = hwnd;
                    Console.WriteLine(string.Format("[Setup] Found external window: '{0}', HWND: 0x{1:X}", title, hwnd.ToInt64()));
                    return false; // stop
                }
                return true;
            }, IntPtr.Zero);

            if (externalTargetHwnd == IntPtr.Zero)
            {
                externalTargetHwnd = GetForegroundWindow();
                Console.WriteLine(string.Format("[Setup] Falling back to GetForegroundWindow(): 0x{0:X}", externalTargetHwnd.ToInt64()));
            }

            // Test Hotkey registration
            Console.WriteLine("\n--- TEST: RegisterHotKey (Alt+Space) on Form Window ---");
            int hotkeyId = 8888;
            bool reg = false;
            int regErr = 0;
            testForm.Invoke(new Action(() =>
            {
                reg = RegisterHotKey(testForm.Handle, hotkeyId, MOD_ALT, VK_SPACE);
                regErr = Marshal.GetLastWin32Error();
            }));
            Console.WriteLine(string.Format("RegisterHotKey(Alt+Space) result: {0}, ErrorCode: {1}", reg, regErr));
            if (regErr == 1409)
            {
                Console.WriteLine("--> NOTE: 1409 = ERROR_HOTKEY_ALREADY_REGISTERED. Another app (PowerToys Run or Raycast or OS) owns Alt+Space!");
            }

            // Test with Alt+Shift+F12 to verify clean registration
            int altHotkeyId = 8889;
            const uint MOD_SHIFT = 0x0004;
            const uint VK_F12 = 0x7B;
            bool regAlt = false;
            testForm.Invoke(new Action(() =>
            {
                regAlt = RegisterHotKey(testForm.Handle, altHotkeyId, MOD_ALT | MOD_SHIFT, VK_F12);
            }));
            Console.WriteLine(string.Format("RegisterHotKey(Alt+Shift+F12) result: {0}", regAlt));

            // Hide Runner and switch focus to external window
            ShowWindow(runnerHwnd, SW_HIDE);
            SetForegroundWindow(externalTargetHwnd);
            Thread.Sleep(800);

            IntPtr curFg = GetForegroundWindow();
            Console.WriteLine(string.Format("\nCurrent foreground before steal test: 0x{0:X}", curFg.ToInt64()));

            // Now test force_activate_window from background thread
            Console.WriteLine("\n--- TEST: force_activate_window from background (AttachThreadInput + SetForegroundWindow) ---");
            uint fgPid;
            uint fgThreadId = GetWindowThreadProcessId(curFg, out fgPid);
            uint curThreadId = GetCurrentThreadId();

            Console.WriteLine(string.Format("Foreground HWND: 0x{0:X}, FG Thread: {1}, Cur Thread: {2}", curFg.ToInt64(), fgThreadId, curThreadId));

            Stopwatch sw = Stopwatch.StartNew();
            bool attached = false;
            int attachErr = 0;
            if (fgThreadId != curThreadId && fgThreadId != 0)
            {
                attached = AttachThreadInput(curThreadId, fgThreadId, true);
                attachErr = Marshal.GetLastWin32Error();
            }

            bool showRes = ShowWindow(runnerHwnd, SW_SHOW);
            bool topRes = BringWindowToTop(runnerHwnd);
            bool sfwRes = SetForegroundWindow(runnerHwnd);
            int sfwErr = Marshal.GetLastWin32Error();

            if (attached)
            {
                AttachThreadInput(curThreadId, fgThreadId, false);
            }
            SetFocus(runnerHwnd);
            sw.Stop();

            IntPtr finalFg = GetForegroundWindow();
            bool succeeded = (finalFg == runnerHwnd);

            Console.WriteLine(string.Format("AttachThreadInput attached: {0}, Error: {1}", attached, attachErr));
            Console.WriteLine(string.Format("ShowWindow: {0}, BringWindowToTop: {1}, SetForegroundWindow: {2}, SFW Error: {3}", showRes, topRes, sfwRes, sfwErr));
            Console.WriteLine(string.Format("Foreground HWND after attempt: 0x{0:X} (Target: 0x{1:X})", finalFg.ToInt64(), runnerHwnd.ToInt64()));
            Console.WriteLine(string.Format("Did force_activate_window steal focus? {0}. Elapsed: {1:F3} ms", succeeded, sw.Elapsed.TotalMilliseconds));

            // Now test restoring focus back to external target window
            Console.WriteLine("\n--- TEST: Restoring focus to external target window ---");
            sw.Restart();
            ShowWindow(runnerHwnd, SW_HIDE);
            bool restoreRes = SetForegroundWindow(externalTargetHwnd);
            sw.Stop();
            IntPtr restoredFg = GetForegroundWindow();
            Console.WriteLine(string.Format("SetForegroundWindow(external) returned: {0}. Target: 0x{1:X}, Final FG: 0x{2:X}. Succeeded? {3}. Latency: {4:F3} ms",
                restoreRes, externalTargetHwnd.ToInt64(), restoredFg.ToInt64(), (restoredFg == externalTargetHwnd), sw.Elapsed.TotalMilliseconds));

            // Clean up
            if (reg) testForm.Invoke(new Action(() => UnregisterHotKey(testForm.Handle, hotkeyId)));
            if (regAlt) testForm.Invoke(new Action(() => UnregisterHotKey(testForm.Handle, altHotkeyId)));
            testForm.Invoke(new Action(() => testForm.Close()));
            Console.WriteLine("\n=== EMPIRICAL TEST 2 COMPLETE ===");
        }
    }
}
