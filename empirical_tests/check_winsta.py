import ctypes
from ctypes import wintypes

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

hWinSta = user32.GetProcessWindowStation()
buf = ctypes.create_unicode_buffer(256)
user32.GetUserObjectInformationW(hWinSta, 2, buf, 256, None) # UOI_NAME = 2
print(f"WindowStation: {buf.value}")

hDesk = user32.GetThreadDesktop(kernel32.GetCurrentThreadId())
buf2 = ctypes.create_unicode_buffer(256)
user32.GetUserObjectInformationW(hDesk, 2, buf2, 256, None)
print(f"ThreadDesktop: {buf2.value}")
