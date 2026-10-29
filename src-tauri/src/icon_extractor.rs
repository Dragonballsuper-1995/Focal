use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use base64::prelude::*;
use windows_sys::Win32::Graphics::Gdi::{
    CreateCompatibleDC, CreateDIBSection, DeleteDC, DeleteObject, GetDC, GetDIBits, ReleaseDC, SelectObject,
    BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
};
use windows_sys::Win32::UI::Shell::{
    SHCreateItemFromParsingName, SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON, SHGFI_SMALLICON,
};
use windows_sys::Win32::UI::WindowsAndMessaging::{
    DestroyIcon, DrawIconEx, DI_NORMAL,
};

/// Computes CRC32 checksum for standard PNG chunks
fn crc32(data: &[u8]) -> u32 {
    let mut crc = 0xffff_ffffu32;
    for &byte in data {
        crc ^= u32::from(byte);
        for _ in 0..8 {
            if crc & 1 != 0 {
                crc = (crc >> 1) ^ 0xedb8_8320;
            } else {
                crc >>= 1;
            }
        }
    }
    !crc
}

fn make_png_chunk(chunk_type: &[u8; 4], data: &[u8]) -> Vec<u8> {
    let mut chunk = Vec::with_capacity(data.len() + 12);
    chunk.extend_from_slice(&(data.len() as u32).to_be_bytes());
    let crc_start = chunk.len();
    chunk.extend_from_slice(chunk_type);
    chunk.extend_from_slice(data);
    let crc = crc32(&chunk[crc_start..]);
    chunk.extend_from_slice(&crc.to_be_bytes());
    chunk
}

/// Encodes raw RGBA pixels into standard PNG bytes
pub fn encode_rgba_to_png(rgba: &[u8], width: u32, height: u32) -> Vec<u8> {
    let mut raw_scanlines = Vec::with_capacity((width * height * 4 + height) as usize);
    let stride = (width * 4) as usize;
    for y in 0..height as usize {
        raw_scanlines.push(0); // Filter type 0 (None)
        let row_start = y * stride;
        raw_scanlines.extend_from_slice(&rgba[row_start..row_start + stride]);
    }

    let compressed_idat = miniz_oxide::deflate::compress_to_vec_zlib(&raw_scanlines, 6);

    let mut ihdr_data = Vec::with_capacity(13);
    ihdr_data.extend_from_slice(&width.to_be_bytes());
    ihdr_data.extend_from_slice(&height.to_be_bytes());
    ihdr_data.push(8); // Bit depth
    ihdr_data.push(6); // Color type: RGBA
    ihdr_data.push(0); // Compression method: Deflate
    ihdr_data.push(0); // Filter method
    ihdr_data.push(0); // Interlace method: None

    let mut png = Vec::new();
    png.extend_from_slice(b"\x89PNG\r\n\x1a\n");
    png.extend_from_slice(&make_png_chunk(b"IHDR", &ihdr_data));
    png.extend_from_slice(&make_png_chunk(b"IDAT", &compressed_idat));
    png.extend_from_slice(&make_png_chunk(b"IEND", b""));
    png
}

#[repr(C)]
struct ShellSize {
    cx: i32,
    cy: i32,
}

#[allow(non_snake_case)]
#[repr(C)]
struct IShellItemImageFactoryVtbl {
    pub QueryInterface: unsafe extern "system" fn(
        *mut std::ffi::c_void,
        *const windows_sys::core::GUID,
        *mut *mut std::ffi::c_void,
    ) -> windows_sys::core::HRESULT,
    pub AddRef: unsafe extern "system" fn(*mut std::ffi::c_void) -> u32,
    pub Release: unsafe extern "system" fn(*mut std::ffi::c_void) -> u32,
    pub GetImage: unsafe extern "system" fn(
        *mut std::ffi::c_void,
        ShellSize,
        u32,
        *mut windows_sys::Win32::Graphics::Gdi::HBITMAP,
    ) -> windows_sys::core::HRESULT,
}

#[allow(non_snake_case)]
#[repr(C)]
struct IShellItemImageFactory {
    pub lpVtbl: *const IShellItemImageFactoryVtbl,
}

const IID_ISHELL_ITEM_IMAGE_FACTORY: windows_sys::core::GUID = windows_sys::core::GUID {
    data1: 0xbcc18b79,
    data2: 0xba16,
    data3: 0x442f,
    data4: [0x80, 0xc4, 0x8a, 0x59, 0xc3, 0x0c, 0x46, 0x3b],
};

/// Extracts the native icon for a shell parsing item (e.g. `shell:AppsFolder\<AUMID>`)
pub fn extract_shell_item_icon(parsing_path: &str) -> Option<String> {
    let wide_path: Vec<u16> = OsStr::new(parsing_path)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    unsafe {
        let mut factory_ptr: *mut std::ffi::c_void = std::ptr::null_mut();
        let hr = SHCreateItemFromParsingName(
            wide_path.as_ptr(),
            std::ptr::null_mut(),
            &IID_ISHELL_ITEM_IMAGE_FACTORY,
            &mut factory_ptr,
        );

        if hr != 0 || factory_ptr.is_null() {
            return None;
        }

        let factory = factory_ptr as *mut IShellItemImageFactory;
        let vtbl = (*factory).lpVtbl;
        let mut h_bitmap: windows_sys::Win32::Graphics::Gdi::HBITMAP = std::ptr::null_mut();
        let size = ShellSize { cx: 48, cy: 48 };

        let hr_img = ((*vtbl).GetImage)(factory_ptr, size, 0, &mut h_bitmap);
        ((*vtbl).Release)(factory_ptr);

        if hr_img != 0 || h_bitmap.is_null() {
            return None;
        }

        let hdc_mem = CreateCompatibleDC(std::ptr::null_mut());
        if hdc_mem.is_null() {
            DeleteObject(h_bitmap);
            return None;
        }

        let width = 48i32;
        let height = 48i32;
        let mut bmi: BITMAPINFO = std::mem::zeroed();
        bmi.bmiHeader.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
        bmi.bmiHeader.biWidth = width;
        bmi.bmiHeader.biHeight = -height;
        bmi.bmiHeader.biPlanes = 1;
        bmi.bmiHeader.biBitCount = 32;
        bmi.bmiHeader.biCompression = BI_RGB;

        let pixel_count = (width * height) as usize;
        let mut raw_pixels = vec![0u8; pixel_count * 4];

        let lines = GetDIBits(
            hdc_mem,
            h_bitmap,
            0,
            height as u32,
            raw_pixels.as_mut_ptr() as *mut std::ffi::c_void,
            &mut bmi,
            DIB_RGB_COLORS,
        );

        DeleteDC(hdc_mem);
        DeleteObject(h_bitmap);

        if lines == 0 {
            return None;
        }

        // Convert BGRA to RGBA
        let mut rgba = Vec::with_capacity(pixel_count * 4);
        for chunk in raw_pixels.chunks_exact(4) {
            rgba.push(chunk[2]); // R
            rgba.push(chunk[1]); // G
            rgba.push(chunk[0]); // B
            rgba.push(chunk[3]); // A
        }

        let png_bytes = encode_rgba_to_png(&rgba, width as u32, height as u32);
        let b64 = BASE64_STANDARD.encode(&png_bytes);
        Some(format!("data:image/png;base64,{}", b64))
    }
}

/// Extracts the native Windows application / shortcut icon and returns a data URI (`data:image/png;base64,...`)
pub fn extract_icon_as_data_uri(file_path: &str) -> Option<String> {
    if file_path.starts_with(r"shell:AppsFolder\") {
        return extract_shell_item_icon(file_path);
    }

    let wide_path: Vec<u16> = OsStr::new(file_path).encode_wide().chain(std::iter::once(0)).collect();

    unsafe {
        let mut sfi: SHFILEINFOW = std::mem::zeroed();
        let res = SHGetFileInfoW(
            wide_path.as_ptr(),
            0,
            &mut sfi,
            std::mem::size_of::<SHFILEINFOW>() as u32,
            SHGFI_ICON | SHGFI_LARGEICON,
        );

        let h_icon = if res != 0 && sfi.hIcon != std::ptr::null_mut() {
            sfi.hIcon
        } else {
            // Fallback to small icon if large icon fails
            let mut sfi_small: SHFILEINFOW = std::mem::zeroed();
            let res_small = SHGetFileInfoW(
                wide_path.as_ptr(),
                0,
                &mut sfi_small,
                std::mem::size_of::<SHFILEINFOW>() as u32,
                SHGFI_ICON | SHGFI_SMALLICON,
            );
            if res_small != 0 && sfi_small.hIcon != std::ptr::null_mut() {
                sfi_small.hIcon
            } else {
                return None;
            }
        };

        let width = 32i32;
        let height = 32i32;

        let hdc_screen = GetDC(std::ptr::null_mut());
        if hdc_screen.is_null() {
            DestroyIcon(h_icon);
            return None;
        }

        let hdc_mem = CreateCompatibleDC(hdc_screen);
        if hdc_mem.is_null() {
            ReleaseDC(std::ptr::null_mut(), hdc_screen);
            DestroyIcon(h_icon);
            return None;
        }

        let mut bmi: BITMAPINFO = std::mem::zeroed();
        bmi.bmiHeader.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
        bmi.bmiHeader.biWidth = width;
        bmi.bmiHeader.biHeight = -height; // Top-down
        bmi.bmiHeader.biPlanes = 1;
        bmi.bmiHeader.biBitCount = 32;
        bmi.bmiHeader.biCompression = BI_RGB;

        let mut bits_ptr: *mut std::ffi::c_void = std::ptr::null_mut();
        let h_bitmap = CreateDIBSection(
            hdc_mem,
            &bmi,
            DIB_RGB_COLORS,
            &mut bits_ptr,
            std::ptr::null_mut(),
            0,
        );

        if h_bitmap.is_null() || bits_ptr.is_null() {
            DeleteDC(hdc_mem);
            ReleaseDC(std::ptr::null_mut(), hdc_screen);
            DestroyIcon(h_icon);
            return None;
        }

        let old_bitmap = SelectObject(hdc_mem, h_bitmap);
        DrawIconEx(hdc_mem, 0, 0, h_icon, width, height, 0, std::ptr::null_mut(), DI_NORMAL);

        let pixel_count = (width * height) as usize;
        let bgra_slice = std::slice::from_raw_parts(bits_ptr as *const u8, pixel_count * 4);

        let mut rgba = vec![0u8; pixel_count * 4];
        let mut has_alpha = false;

        for i in 0..pixel_count {
            let b = bgra_slice[i * 4];
            let g = bgra_slice[i * 4 + 1];
            let r = bgra_slice[i * 4 + 2];
            let a = bgra_slice[i * 4 + 3];

            if a > 0 {
                has_alpha = true;
            }

            rgba[i * 4] = r;
            rgba[i * 4 + 1] = g;
            rgba[i * 4 + 2] = b;
            rgba[i * 4 + 3] = a;
        }

        // If legacy icon format without alpha channel, set alpha = 255 for non-black pixels
        if !has_alpha {
            for i in 0..pixel_count {
                if rgba[i * 4] != 0 || rgba[i * 4 + 1] != 0 || rgba[i * 4 + 2] != 0 {
                    rgba[i * 4 + 3] = 255;
                }
            }
        }

        // Clean up GDI objects
        SelectObject(hdc_mem, old_bitmap);
        DeleteObject(h_bitmap);
        DeleteDC(hdc_mem);
        ReleaseDC(std::ptr::null_mut(), hdc_screen);
        DestroyIcon(h_icon);

        let png_bytes = encode_rgba_to_png(&rgba, width as u32, height as u32);
        let base64_str = BASE64_STANDARD.encode(&png_bytes);
        Some(format!("data:image/png;base64,{}", base64_str))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode_rgba_to_png_valid_magic() {
        let rgba = vec![255u8; 16 * 16 * 4];
        let png = encode_rgba_to_png(&rgba, 16, 16);
        assert!(png.starts_with(b"\x89PNG\r\n\x1a\n"));
        assert!(png.ends_with(b"IEND\xaeB`\x82"));
    }

    #[test]
    fn test_extract_icon_cmd_exe() {
        let cmd_path = r"C:\Windows\System32\cmd.exe";
        if std::path::Path::new(cmd_path).exists() {
            let icon = extract_icon_as_data_uri(cmd_path);
            assert!(icon.is_some());
            assert!(icon.unwrap().starts_with("data:image/png;base64,"));
        }
    }
}
