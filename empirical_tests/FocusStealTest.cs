using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace EmpiricalFocusTest
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

        const int SW_SHOW = 5;
        const int SW_HIDE = 0;
        const uint MOD_ALT = 0x0001;
        const uint VK_SPACE = 0x20;

        static Form testForm;
        static Process notepadProc;

        static void Main(string[] args)
        {
            Console.WriteLine("=== EMPIRICAL TEST: Win32 Focus Stealing Mechanics ===");

            notepadProc = Process.Start("notepad.exe");
            Thread.Sleep(1200);
            IntPtr notepadHwnd = notepadProc.MainWindowHandle;
            SetForegroundWindow(notepadHwnd);
            Thread.Sleep(500);

            IntPtr initialFg = GetForegroundWindow();
            Console.WriteLine(string.Format("[Setup] Notepad HWND: 0x{0:X}, Initial Foreground HWND: 0x{1:X}", notepadHwnd.ToInt64(), initialFg.ToInt64()));

            Thread formThread = new Thread(() =>
            {
                testForm = new Form();
                testForm.Text = "RunnerEmpiricalWindow";
                testForm.Width = 400;
                testForm.Height = 300;
                testForm.Show();
                Application.Run(testForm);
            });
            formThread.SetApartmentState(ApartmentState.STA);
            formThread.Start();

            Thread.Sleep(1000);
            IntPtr runnerHwnd = testForm.Handle;
            Console.WriteLine(string.Format("[Setup] Runner Form HWND: 0x{0:X}", runnerHwnd.ToInt64()));

            ShowWindow(runnerHwnd, SW_HIDE);
            SetForegroundWindow(notepadHwnd);
            Thread.Sleep(1000);

            Console.WriteLine("\n--- TEST CASE 1: Pure SetForegroundWindow (No AttachThreadInput, Background Caller) ---");
            TestCase1(runnerHwnd, notepadHwnd);

            Console.WriteLine("\n--- TEST CASE 2: Report's Proposed force_activate_window (AttachThreadInput + SetForegroundWindow) ---");
            TestCase2(runnerHwnd, notepadHwnd);

            Console.WriteLine("\n--- TEST CASE 3: Lock Bypass via Keybd Event / Alt Key Injection ---");
            TestCase3(runnerHwnd, notepadHwnd);

            Console.WriteLine("\n--- TEST CASE 4: Hotkey Registration (RegisterHotKey Alt+Space) ---");
            TestCase4(runnerHwnd, notepadHwnd);

            Console.WriteLine("\n--- TEST CASE 5: Reverse Focus Restoration (Runner -> Notepad) ---");
            TestCase5(runnerHwnd, notepadHwnd);

            try { notepadProc.Kill(); } catch { }
            try { testForm.Invoke(new Action(() => testForm.Close())); } catch { }
            Console.WriteLine("\n=== EMPIRICAL TEST COMPLETE ===");
        }

        static void TestCase1(IntPtr runnerHwnd, IntPtr notepadHwnd)
        {
            SetForegroundWindow(notepadHwnd);
            Thread.Sleep(500);

            Stopwatch sw = Stopwatch.StartNew();
            bool sfw = SetForegroundWindow(runnerHwnd);
            int err = Marshal.GetLastWin32Error();
            sw.Stop();

            IntPtr fg = GetForegroundWindow();
            bool succeeded = (fg == runnerHwnd);
            Console.WriteLine(string.Format("SetForegroundWindow returned: {0}, LastWin32Error: {1}", sfw, err));
            Console.WriteLine(string.Format("Foreground window after call: 0x{0:X} (Target: 0x{1:X})", fg.ToInt64(), runnerHwnd.ToInt64()));
            Console.WriteLine(string.Format("Actual Focus Stolen? {0}. Latency: {1:F3} ms", succeeded, sw.Elapsed.TotalMilliseconds));
        }

        static void TestCase2(IntPtr runnerHwnd, IntPtr notepadHwnd)
        {
            ShowWindow(runnerHwnd, SW_HIDE);
            SetForegroundWindow(notepadHwnd);
            Thread.Sleep(1000);

            IntPtr fgHwnd = GetForegroundWindow();
            uint fgPid;
            uint fgThreadId = GetWindowThreadProcessId(fgHwnd, out fgPid);
            uint curThreadId = GetCurrentThreadId();

            Stopwatch sw = Stopwatch.StartNew();
            bool attached = false;
            if (fgThreadId != curThreadId && fgThreadId != 0)
            {
                attached = AttachThreadInput(curThreadId, fgThreadId, true);
            }
            int attachErr = Marshal.GetLastWin32Error();

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

            Console.WriteLine(string.Format("AttachThreadInput result: {0}, LastWin32Error: {1}", attached, attachErr));
            Console.WriteLine(string.Format("ShowWindow: {0}, BringWindowToTop: {1}, SetForegroundWindow: {2}, SFW Error: {3}", showRes, topRes, sfwRes, sfwErr));
            Console.WriteLine(string.Format("Foreground after force_activate_window: 0x{0:X} (Target: 0x{1:X})", finalFg.ToInt64(), runnerHwnd.ToInt64()));
            Console.WriteLine(string.Format("Report's force_activate_window Succeeded? {0}. Latency: {1:F3} ms", succeeded, sw.Elapsed.TotalMilliseconds));
        }

        static void TestCase3(IntPtr runnerHwnd, IntPtr notepadHwnd)
        {
            ShowWindow(runnerHwnd, SW_HIDE);
            SetForegroundWindow(notepadHwnd);
            Thread.Sleep(1000);

            Stopwatch sw = Stopwatch.StartNew();
            keybd_event(0x12, 0, 0, UIntPtr.Zero); // VK_MENU down
            keybd_event(0x12, 0, 2, UIntPtr.Zero); // VK_MENU up
            
            ShowWindow(runnerHwnd, SW_SHOW);
            BringWindowToTop(runnerHwnd);
            bool sfwRes = SetForegroundWindow(runnerHwnd);
            sw.Stop();

            IntPtr finalFg = GetForegroundWindow();
            bool succeeded = (finalFg == runnerHwnd);
            Console.WriteLine(string.Format("Keybd_event + SetForegroundWindow returned: {0}", sfwRes));
            Console.WriteLine(string.Format("Foreground after ALT injection: 0x{0:X} (Target: 0x{1:X})", finalFg.ToInt64(), runnerHwnd.ToInt64()));
            Console.WriteLine(string.Format("Bypass Succeeded? {0}. Latency: {1:F3} ms", succeeded, sw.Elapsed.TotalMilliseconds));
        }

        static void TestCase4(IntPtr runnerHwnd, IntPtr notepadHwnd)
        {
            ShowWindow(runnerHwnd, SW_HIDE);
            SetForegroundWindow(notepadHwnd);
            Thread.Sleep(500);

            int hotkeyId = 9999;
            bool reg = false;
            testForm.Invoke(new Action(() =>
            {
                reg = RegisterHotKey(testForm.Handle, hotkeyId, MOD_ALT, VK_SPACE);
            }));
            int regErr = Marshal.GetLastWin32Error();
            Console.WriteLine(string.Format("RegisterHotKey(Alt+Space) returned: {0}, LastWin32Error: {1}", reg, regErr));

            if (reg)
            {
                testForm.Invoke(new Action(() =>
                {
                    UnregisterHotKey(testForm.Handle, hotkeyId);
                }));
            }
        }

        static void TestCase5(IntPtr runnerHwnd, IntPtr notepadHwnd)
        {
            ShowWindow(runnerHwnd, SW_SHOW);
            SetForegroundWindow(runnerHwnd);
            Thread.Sleep(500);

            Stopwatch sw = Stopwatch.StartNew();
            ShowWindow(runnerHwnd, SW_HIDE);
            bool sfw = SetForegroundWindow(notepadHwnd);
            sw.Stop();

            IntPtr finalFg = GetForegroundWindow();
            bool succeeded = (finalFg == notepadHwnd);
            Console.WriteLine(string.Format("Restore to Notepad returned: {0}, Succeeded? {1}, Latency: {2:F3} ms", sfw, succeeded, sw.Elapsed.TotalMilliseconds));
        }
    }
}
