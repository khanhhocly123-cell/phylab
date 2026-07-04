'use client';

import { useEffect } from 'react';

export default function DevToolsGuard() {
  useEffect(() => {
    // Chỉ kích hoạt bảo vệ khi KHÔNG ở chế độ dev (môi trường production)
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    const showWarning = (e: Event) => {
      e.preventDefault();
      
      // Kiểm tra xem đã có thông báo nào hiển thị chưa để tránh spam liên tục
      if (document.getElementById('devtools-warning-toast')) {
        return;
      }

      const toast = document.createElement('div');
      toast.id = 'devtools-warning-toast';
      toast.innerText = 'Chức năng nhà phát triển bị vô hiệu hóa trong phòng Lab.';
      toast.style.position = 'fixed';
      toast.style.top = '20px';
      toast.style.left = '50%';
      toast.style.transform = 'translateX(-50%)';
      toast.style.background = '#2C1B10'; // Tông nâu tối sang trọng nhất quán với thương hiệu
      toast.style.color = '#FFFBF7';
      toast.style.padding = '10px 20px';
      toast.style.borderRadius = '12px';
      toast.style.fontSize = '12.5px';
      toast.style.fontWeight = '700';
      toast.style.boxShadow = '0 8px 24px rgba(50,30,18,0.18)';
      toast.style.zIndex = '100000';
      toast.style.fontFamily = 'var(--font-nunito), sans-serif';
      toast.style.border = '1px solid #D5C2AD';
      toast.style.transition = 'opacity 0.3s ease';

      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 300);
      }, 2200);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Chặn F12
      if (e.key === 'F12') {
        showWarning(e);
        return;
      }

      // 2. Chặn Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
        showWarning(e);
        return;
      }

      // 3. Chặn Ctrl+U (Xem nguồn trang)
      if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
        showWarning(e);
        return;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      showWarning(e);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return null;
}
