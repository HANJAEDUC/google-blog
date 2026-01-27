'use client';

import { useEffect, useState } from 'react';

export default function InAppBrowserGuard() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const ua = navigator.userAgent.toLowerCase();
        // Detect KakaoTalk
        if (ua.includes('kakaotalk')) {
            setIsVisible(true);
        }
    }, []);

    if (!isVisible) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '0',
            left: '0',
            width: '100%',
            backgroundColor: '#323232', // Dark background
            color: '#ffffff',
            zIndex: 10000,
            padding: '16px',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            animation: 'slideUp 0.3s ease-out',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px'
        }}>
            <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
            <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '15px' }}>
                    ⚠️ 원활한 사용을 위해 Chrome/Safari로 열어주세요
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#cccccc' }}>
                    (더보기(...) 메뉴 → 다른 브라우저로 열기)
                </p>
            </div>
            <button
                onClick={() => setIsVisible(false)}
                style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    whiteSpace: 'nowrap'
                }}
            >
                닫기
            </button>
        </div>
    );
}
